"""Tests for the programmatic runner: adaptive thread pool + fault tolerance
(rate-limit back-off, context-overflow sub-shard, permanent-failure coverage),
driving the real FSM with fake LLM dispatch hooks."""
from __future__ import annotations

from typing import Any

import pytest

from code_review.runner import (
    ContextOverflowError,
    RateLimitError,
    RunnerStats,
    _accumulate_cost,
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


def test_dispatched_count_is_exact_under_high_concurrency() -> None:
    """The worker-thread counters (dispatched / failed) are incremented under the
    stats lock, so they stay EXACT under heavy concurrency: a plain += could lose an
    increment to a read-modify-write race and report fewer dispatches than results.
    Every unit succeeds, so dispatched must equal the unit count with no loss."""
    def dispatch(unit: dict[str, Any], shared: dict[str, Any]) -> dict[str, Any]:
        return {"id": unit["leaf_id"], "status": "completed", "findings": [],
                "tokens_in": 1, "tokens_out": 1, "est_cost": 0.001}

    n = 300
    units = [{"leaf_id": f"leaf-{i}", "sub_index": 1, "files": [f"f{i}.py"]} for i in range(n)]
    stats = RunnerStats()
    res = _dispatch_units(units, {}, dispatch, max_workers=16, min_workers=1,
                          max_retries=1, base_backoff=0.0, sleep=lambda _s: None, stats=stats)
    assert len(res) == n
    assert stats.dispatched == n  # no lost increment under the race
    assert stats.failed == 0
    # The locked cost rollup is consistent with the (now also locked) dispatched count.
    assert stats.total_in_tokens == n
    assert stats.total_est_cost == pytest.approx(0.001 * n)


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


def test_runner_stats_carries_stage_timings_defaults() -> None:
    """RunnerStats carries the forward timing fields with safe defaults (an empty
    list, not a shared mutable default)."""
    a, b = RunnerStats(), RunnerStats()
    assert a.total_wall_ms == 0
    assert a.stage_timings == []
    a.stage_timings.append({"scope": "inline", "name": "x", "iteration_n": None, "wall_ms": 1})
    assert b.stage_timings == []  # field(default_factory=list): not shared across instances


def test_runner_stats_cost_defaults_zero() -> None:
    s = RunnerStats()
    assert s.total_in_tokens == 0 and s.total_out_tokens == 0
    assert s.total_cost_usd == 0.0 and s.total_est_cost == 0.0


def test_accumulate_cost_sums_stamped_fields() -> None:
    """_accumulate_cost folds a dispatch output's cost stamp into the run totals;
    a stamp-less output (degraded worker / test spec) contributes 0."""
    s = RunnerStats()
    _accumulate_cost(s, {"tokens_in": 4, "tokens_out": 50, "cost_usd": 0.21, "est_cost": 0.0017})
    _accumulate_cost(s, {"tokens_in": 6, "tokens_out": 10, "cost_usd": 0.07, "est_cost": 0.0009})
    _accumulate_cost(s, {"findings": []})  # no stamp -> contributes 0
    assert s.total_in_tokens == 10 and s.total_out_tokens == 60
    # Tolerance, not exact equality: 0.21 + 0.07 is not an exact binary float.
    assert s.total_cost_usd == pytest.approx(0.28)
    assert s.total_est_cost == pytest.approx(0.0026)


def test_dispatch_units_accumulates_specialist_cost() -> None:
    """The specialist success path folds each unit's stamp into RunnerStats so the
    run-level cost roll-up covers every dispatched specialist."""
    def dispatch(unit: dict[str, Any], shared: dict[str, Any]) -> dict[str, Any]:
        return {"id": unit["leaf_id"], "status": "completed", "findings": [],
                "tokens_in": 3, "tokens_out": 20, "cost_usd": 0.05, "est_cost": 0.001}

    units = [
        {"leaf_id": "a", "sub_index": 1, "files": ["a.py"]},
        {"leaf_id": "b", "sub_index": 1, "files": ["b.py"]},
    ]
    stats = RunnerStats()
    _dispatch_units(units, {}, dispatch, max_workers=2, min_workers=1,
                    max_retries=1, base_backoff=0.0, sleep=lambda _s: None, stats=stats)
    assert stats.total_in_tokens == 6 and stats.total_out_tokens == 40
    assert abs(stats.total_cost_usd - 0.10) < 1e-9
    assert abs(stats.total_est_cost - 0.002) < 1e-9


def test_overflow_split_carries_summed_cost_stamp_onto_merged_result() -> None:
    """The context-overflow split path returns a merged result that ALSO carries the
    summed per-call cost stamp from its sub-dispatches, so _per_specialist_timings
    records a real est_cost for that leaf instead of null, consistent with the
    run-level total_est_cost the sub-calls already folded in via _accumulate_cost."""
    def dispatch(unit: dict[str, Any], shared: dict[str, Any]) -> dict[str, Any]:
        # The multi-file unit overflows; each single-file sub-unit succeeds with a stamp.
        if unit["leaf_id"] == "big" and len(unit.get("files", [])) > 1:
            raise ContextOverflowError
        return {"id": unit["leaf_id"], "status": "completed", "findings": [],
                "wall_ms": 5, "tokens_in": 2, "tokens_out": 11,
                "cost_usd": 0.03, "est_cost": 0.0007, "tier": "strong"}

    units = [{"leaf_id": "big", "sub_index": 1, "files": ["a.py", "b.py"]}]
    stats = RunnerStats()
    res = _dispatch_units(units, {}, dispatch, max_workers=2, min_workers=1,
                          max_retries=1, base_backoff=0.0, sleep=lambda _s: None, stats=stats)
    merged = res[("big", 1)]
    assert merged["status"] == "completed"
    # 2 single-file sub-units, each stamped: the merged row sums them.
    assert merged["tokens_in"] == 4 and merged["tokens_out"] == 22
    assert abs(merged["est_cost"] - 0.0014) < 1e-12
    assert abs(merged["cost_usd"] - 0.06) < 1e-12
    assert merged["wall_ms"] == 10
    assert merged["tier"] == "strong"
    # The run-level rollup matches what the sub-calls accumulated (no double count,
    # no loss): the per-specialist row is now consistent with the run total.
    assert abs(stats.total_est_cost - 0.0014) < 1e-12


def test_run_review_measures_stage_timings_and_writes_timings_json(tmp_path: Any) -> None:
    """run_review measures per-state wall time LIVE and persists a timings.json
    artifact next to manifest.json carrying whole_review_ms + stage_timings +
    per-specialist measured wall_ms."""
    import json
    from pathlib import Path

    def spec(unit: dict[str, Any], shared: dict[str, Any]) -> dict[str, Any]:
        return {"id": unit["leaf_id"], "status": "completed", "wall_ms": 7,
                "findings": [{"severity": "important", "file": (unit.get("files") or ["x.py"])[0],
                              "line": 1, "title": f"bug {unit['leaf_id']}", "confidence": 0.9}]}

    storage = str(tmp_path / ".skill-code-review")
    res = run_review({"project_root": str(tmp_path), "base": "B", "head": "H",
                      "storage_root": storage},
                     dispatch_worker=_worker, dispatch_specialist=spec,
                     max_workers=4, base_backoff=0.0, sleep=lambda _s: None)
    assert not res.faulted, res.fault
    # total_wall_ms is finalised (the finally always runs) and stage rows captured.
    assert res.stats.total_wall_ms >= 0
    assert len(res.stats.stage_timings) > 0
    # Assert the shape contract over EVERY row (not a single index[0], which is
    # order-coupled under max_workers > 1).
    for row in res.stats.stage_timings:
        assert set(row) == {"scope", "name", "iteration_n", "wall_ms"}
        assert row["scope"] in {"inline", "loop", "worker", "advance"}

    # The persisted timings.json sits next to manifest.json. write_run_directory
    # runs once per review, so at least one is written; pick deterministically by
    # path (newest mtime) rather than assuming a single sequential file.
    tj_files = sorted(Path(storage).rglob("timings.json"), key=lambda p: (p.stat().st_mtime, str(p)))
    assert len(tj_files) >= 1
    doc = json.loads(tj_files[-1].read_text())
    assert isinstance(doc["whole_review_ms"], int)
    assert len(doc["stage_timings"]) > 0
    leaves = {s["leaf_id"]: s for s in doc["specialists"]}
    assert leaves  # at least one specialist row
    # per-specialist measured wall_ms is carried; this spec bypasses dispatch.py so
    # it carries no cost stamp -> tokens/cost stay None (the no-stamp path).
    # Select the leaf by a deterministic key (sorted leaf_id), not iteration order.
    any_leaf = leaves[sorted(leaves)[0]]
    assert "wall_ms" in any_leaf
    assert any_leaf["tokens_in"] is None and any_leaf["tokens_out"] is None
    # The run-level cost block is always present (zeros when no call stamped cost).
    assert set(doc["cost"]) == {"total_in_tokens", "total_out_tokens",
                                "total_cost_usd", "total_est_cost"}


def test_run_review_rolls_up_cost_from_stamped_specialists(tmp_path: Any) -> None:
    """When specialists carry a cost stamp (as dispatch.py produces), run_review
    sums them into RunnerStats and the persisted timings.json cost block + the
    per-specialist est_cost. Proxy roll-up, never billed spend."""
    import json
    from pathlib import Path

    def spec(unit: dict[str, Any], shared: dict[str, Any]) -> dict[str, Any]:
        return {"id": unit["leaf_id"], "status": "completed", "wall_ms": 3,
                "tokens_in": 5, "tokens_out": 30, "cost_usd": 0.02, "est_cost": 0.001,
                "tier": "cheap",
                "findings": [{"severity": "minor", "file": (unit.get("files") or ["x.py"])[0],
                              "line": 1, "title": f"f {unit['leaf_id']}", "confidence": 0.5}]}

    storage = str(tmp_path / ".skill-code-review")
    res = run_review({"project_root": str(tmp_path), "base": "B", "head": "H",
                      "storage_root": storage},
                     dispatch_worker=_worker, dispatch_specialist=spec,
                     max_workers=4, base_backoff=0.0, sleep=lambda _s: None)
    assert not res.faulted, res.fault
    n = res.stats.dispatched
    assert n >= 2
    assert res.stats.total_in_tokens == 5 * n
    assert res.stats.total_out_tokens == 30 * n
    assert abs(res.stats.total_cost_usd - 0.02 * n) < 1e-9
    assert abs(res.stats.total_est_cost - 0.001 * n) < 1e-9

    tj_files = sorted(Path(storage).rglob("timings.json"), key=lambda p: (p.stat().st_mtime, str(p)))
    doc = json.loads(tj_files[-1].read_text())
    assert doc["cost"]["total_in_tokens"] == 5 * n
    assert abs(doc["cost"]["total_est_cost"] - 0.001 * n) < 1e-9
    any_leaf = {s["leaf_id"]: s for s in doc["specialists"]}[sorted(
        {s["leaf_id"] for s in doc["specialists"]})[0]]
    assert any_leaf["est_cost"] == 0.001 and any_leaf["tier"] == "cheap"
