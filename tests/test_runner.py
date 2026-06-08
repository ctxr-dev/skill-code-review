"""Tests for the programmatic runner: adaptive thread pool + fault tolerance
(rate-limit back-off, context-overflow sub-shard, permanent-failure coverage),
driving the real FSM with fake LLM dispatch hooks."""
from __future__ import annotations

from typing import Any

from code_review.runner import (
    ContextOverflowError,
    RateLimitError,
    RunnerStats,
    _AdaptiveLimiter,
    _call_worker_resilient,
    _coverage_floor,
    _dispatch_units,
    run_review,
)


def test_worker_resilient_retries_then_succeeds() -> None:
    """A transient rate-limit / timeout on a worker state is retried, not fatal."""
    calls = {"n": 0}

    def flaky(state_id, inputs):  # type: ignore[no-untyped-def]
        calls["n"] += 1
        if calls["n"] == 1:
            raise RateLimitError("claude timeout")
        return {"ok": True}

    stats = RunnerStats()
    out = _call_worker_resilient(flaky, "tree_descend", {}, max_retries=2,
                                 base_backoff=0.0, sleep=lambda _s: None, stats=stats)
    assert out == {"ok": True}
    assert calls["n"] == 2
    assert stats.rate_limit_events == 1


def test_worker_resilient_reraises_after_exhaustion() -> None:
    """After retries are exhausted it re-raises so run_review can fault gracefully
    (the process must not crash mid-batch)."""
    def always(state_id, inputs):  # type: ignore[no-untyped-def]
        raise RateLimitError("persistent overload")

    stats = RunnerStats()
    import pytest
    with pytest.raises(RateLimitError):
        _call_worker_resilient(always, "scan_project", {}, max_retries=2,
                               base_backoff=0.0, sleep=lambda _s: None, stats=stats)
    assert stats.rate_limit_events == 3  # initial + 2 retries


def test_coverage_floor_selects_when_trim_empty() -> None:
    """A flaky llm_trim returning no picked leaves must NOT zero the review:
    the floor selects deterministically from activated_leaves, biased to
    correctness/security + project languages."""
    activated = [
        {"id": "antipattern-copy-paste", "path": "a.md", "activation_match": ["file_globs"],
         "dimensions": ["readability"]},
        {"id": "sec-csrf", "path": "s.md", "activation_match": ["file_globs", "keyword_matches"],
         "dimensions": ["security"]},
        {"id": "lang-python", "path": "p.md", "activation_match": ["file_globs"],
         "dimensions": ["correctness"]},
    ]
    env = {"activated_leaves": activated, "cap": 2,
           "project_profile": {"languages": ["python"]}}
    stats = RunnerStats()
    out = _coverage_floor("llm_trim", {}, {"picked_leaves": [], "rejected_leaves": []}, env, stats)
    picked_ids = [p["id"] for p in out["picked_leaves"]]
    assert len(picked_ids) == 2  # capped
    assert "sec-csrf" in picked_ids and "lang-python" in picked_ids  # security/correctness win
    assert "antipattern-copy-paste" not in picked_ids
    assert all(set(p) >= {"id", "path", "justification", "dimensions"} for p in out["picked_leaves"])
    assert stats.coverage_floor_used == 1


def test_coverage_floor_noop_on_happy_path() -> None:
    """Floor never touches a healthy trim result, nor non-trim states."""
    stats = RunnerStats()
    good = {"picked_leaves": [{"id": "x", "path": "x.md", "justification": "j", "dimensions": []}]}
    assert _coverage_floor("llm_trim", {}, good, {"activated_leaves": [{"id": "y"}]}, stats) is good
    other = {"stage_a_candidates": []}
    assert _coverage_floor("tree_descend", {}, other, {"activated_leaves": [{"id": "y"}]}, stats) is other
    assert stats.coverage_floor_used == 0


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


def test_pool_bounded_concurrency_and_total_coverage_under_chaos() -> None:
    """Stress: many units with random rate-limits/overflows/transient/permanent
    failures. Assert (a) live concurrency NEVER exceeds max_workers, (b) every
    unit gets a result (100% coverage), (c) no deadlock (it completes)."""
    import threading
    import time as _t

    live = {"n": 0, "max": 0}
    lock = threading.Lock()

    def dispatch(unit: dict[str, Any], shared: dict[str, Any]) -> dict[str, Any]:
        with lock:
            live["n"] += 1
            live["max"] = max(live["max"], live["n"])
        try:
            _t.sleep(0.002)
            leaf = unit["leaf_id"]
            n = int(leaf.split("-")[1])
            if n % 7 == 0 and unit.get("_a", 0) == 0:
                unit["_a"] = 1
                raise RateLimitError  # transient: succeeds on retry
            if n % 11 == 0 and len(unit.get("files", [])) > 1:
                raise ContextOverflowError
            if n % 13 == 0:
                raise RuntimeError("permanent")
            return {"id": leaf, "status": "completed",
                    "findings": [{"severity": "minor", "file": unit["files"][0], "title": leaf}]}
        finally:
            with lock:
                live["n"] -= 1

    units = [{"leaf_id": f"leaf-{i}", "sub_index": 1, "total_subs": 1,
              "files": [f"f{i}a.py", f"f{i}b.py"]} for i in range(120)]
    stats = RunnerStats()
    mw = 6
    res = _dispatch_units(units, {}, dispatch, max_workers=mw, min_workers=1,
                          max_retries=3, base_backoff=0.0, sleep=lambda _s: None, stats=stats)
    assert len(res) == 120  # 100% coverage
    assert all((f"leaf-{i}", 1) in res for i in range(120))
    assert live["max"] <= mw, f"concurrency {live['max']} exceeded cap {mw}"
    # permanent-failure units (n % 13 == 0, excluding overflow-handled) are failed, not lost
    assert res[("leaf-13", 1)]["status"] == "failed"


def test_overflow_recursion_no_deadlock_at_min_concurrency() -> None:
    """Overflow recursion releases its permit before recursing — must not deadlock
    even with max_workers=1."""
    def dispatch(unit: dict[str, Any], shared: dict[str, Any]) -> dict[str, Any]:
        if len(unit.get("files", [])) > 1:
            raise ContextOverflowError
        return {"id": unit["leaf_id"], "status": "completed",
                "findings": [{"severity": "minor", "file": unit["files"][0], "title": "x"}]}

    units = [{"leaf_id": "big", "sub_index": 1, "total_subs": 1,
              "files": [f"f{i}.py" for i in range(8)]}]
    stats = RunnerStats()
    res = _dispatch_units(units, {}, dispatch, max_workers=1, min_workers=1,
                          max_retries=1, base_backoff=0.0, sleep=lambda _s: None, stats=stats)
    assert res[("big", 1)]["status"] == "completed"
    assert len(res[("big", 1)]["findings"]) == 8  # all 8 files reviewed via recursive split


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


def test_tool_discovery_failure_degrades_not_faults(tmp_path: Any) -> None:
    """A persistent outage of the best-effort tool_discovery worker degrades to
    empty tool_results and the review still reaches terminal — it does NOT fault
    the whole PR (the sentry iter1 failure mode)."""
    def worker(state_id: str, inputs: dict[str, Any]) -> dict[str, Any]:
        if state_id == "tool_discovery":
            raise RateLimitError("claude timeout")  # persistent
        return _worker(state_id, inputs)

    def spec(unit: dict[str, Any], shared: dict[str, Any]) -> dict[str, Any]:
        return {"id": unit["leaf_id"], "status": "completed",
                "findings": [{"severity": "important", "file": (unit.get("files") or ["x.py"])[0],
                              "line": 1, "title": f"bug {unit['leaf_id']}", "confidence": 0.9}]}

    res = run_review({"project_root": str(tmp_path), "base": "B", "head": "H"},
                     dispatch_worker=worker, dispatch_specialist=spec,
                     max_workers=4, max_retries=1, base_backoff=0.0, sleep=lambda _s: None)
    assert not res.faulted, res.fault  # degraded, not faulted
    assert res.stats.degraded_workers >= 1
    assert res.verdict in ("GO", "CONDITIONAL", "NO-GO")


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
