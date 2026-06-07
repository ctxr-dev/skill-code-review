"""Tests for the programmatic runner: adaptive thread pool + fault tolerance
(rate-limit back-off, context-overflow sub-shard, permanent-failure coverage),
driving the real FSM with fake LLM dispatch hooks."""
from __future__ import annotations

from typing import Any

from ctxr_skill_code_review.runner import (
    ContextOverflowError,
    RateLimitError,
    RunnerStats,
    _AdaptiveLimiter,
    _dispatch_units,
    run_review,
)


def test_adaptive_limiter_aimd() -> None:
    lim = _AdaptiveLimiter(8, 1)
    lim.penalize()
    assert lim._limit == 4  # multiplicative decrease
    lim.penalize()
    assert lim._limit == 2
    lim.reward()
    assert lim._limit == 3  # additive increase
    for _ in range(100):
        lim.reward()
    assert lim._limit == 8  # capped at max
    for _ in range(100):
        lim.penalize()
    assert lim._limit == 1  # floored at min


def test_dispatch_units_fault_tolerance() -> None:
    """Every unit gets a result; rate-limit retries, overflow splits, permanent
    failure yields a failed (not lost) unit."""
    calls: dict[str, int] = {}

    def dispatch(unit: dict[str, Any], shared: dict[str, Any]) -> dict[str, Any]:
        leaf = unit["leaf_id"]
        calls[leaf] = calls.get(leaf, 0) + 1
        if leaf == "ratelimit-once" and calls[leaf] == 1:
            raise RateLimitError
        if leaf == "overflow" and len(unit.get("files", [])) > 1:
            raise ContextOverflowError  # only the multi-file unit overflows
        if leaf == "always-fails":
            raise RuntimeError("boom")
        return {"id": leaf, "status": "completed",
                "findings": [{"severity": "minor", "file": unit["files"][0], "title": leaf}]}

    units = [
        {"leaf_id": "ok", "sub_index": 1, "total_subs": 1, "files": ["a.py"]},
        {"leaf_id": "ratelimit-once", "sub_index": 1, "total_subs": 1, "files": ["b.py"]},
        {"leaf_id": "overflow", "sub_index": 1, "total_subs": 1, "files": ["c.py", "d.py"]},
        {"leaf_id": "always-fails", "sub_index": 1, "total_subs": 1, "files": ["e.py"]},
    ]
    stats = RunnerStats()
    res = _dispatch_units(units, {}, dispatch, max_workers=4, min_workers=1,
                          max_retries=2, base_backoff=0.0, sleep=lambda _s: None, stats=stats)
    assert len(res) == 4  # 100% coverage — every unit has a result
    assert res[("ok", 1)]["status"] == "completed"
    assert res[("ratelimit-once", 1)]["status"] == "completed"  # retried after back-off
    assert res[("overflow", 1)]["status"] == "completed"
    assert len(res[("overflow", 1)]["findings"]) == 2  # split into 2 single-file sub-units, merged
    assert res[("always-fails", 1)]["status"] == "failed"  # not lost
    assert stats.rate_limit_events >= 1
    assert stats.overflow_splits >= 1
    assert stats.failed >= 1


def _worker(state_id: str, inputs: dict[str, Any]) -> dict[str, Any]:
    if state_id == "scan_project":
        return {"project_profile": {"languages": ["python"], "frameworks": [], "monorepo": False},
                "changed_paths": ["x.py", "y.py"], "diff_stats": {"lines_changed": 120, "files_changed": 2}}
    if state_id == "tree_descend":
        return {"stage_a_candidates": [
            {"id": "lang-python", "path": "lang-python.md", "activation_match": ["file_globs"]},
            {"id": "sec-csrf", "path": "sec-csrf.md", "activation_match": ["file_globs"]},
        ], "descent_path": ["root"]}
    if state_id == "llm_trim":
        return {"picked_leaves": [
            {"id": "lang-python", "path": "lang-python.md", "justification": "py", "dimensions": ["correctness"]},
            {"id": "sec-csrf", "path": "sec-csrf.md", "justification": "sec", "dimensions": ["security"]},
        ], "rejected_leaves": [], "coverage_rescues": []}
    if state_id == "tool_discovery":
        return {"tool_results": []}
    if state_id == "rank_findings":
        f = inputs.get("findings", [])
        for x in f:
            x["defect_confidence"] = 0.9
            x["primary"] = True
        return {"findings": f, "severity_counts": {"critical": 0, "important": len(f), "minor": 0}}
    raise KeyError(state_id)


def test_run_review_drives_fsm_to_terminal(tmp_path: Any) -> None:
    def spec(unit: dict[str, Any], shared: dict[str, Any]) -> dict[str, Any]:
        return {"id": unit["leaf_id"], "status": "completed",
                "findings": [{"severity": "important", "file": (unit.get("files") or ["x.py"])[0],
                              "line": 1, "title": f"bug in {unit['leaf_id']}", "confidence": 0.9}]}

    res = run_review({"project_root": str(tmp_path), "base": "B", "head": "H"},
                     dispatch_worker=_worker, dispatch_specialist=spec,
                     max_workers=4, base_backoff=0.0, sleep=lambda _s: None)
    assert not res.faulted, res.fault
    assert res.verdict in ("GO", "CONDITIONAL", "NO-GO")
    assert res.run_dir_path
    assert res.stats.dispatched >= 2  # both picked leaves dispatched (100% coverage)
