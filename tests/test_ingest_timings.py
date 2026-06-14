"""Unit tests for ``scripts/ingest_timings.py`` on a synthetic timings.json.

The harness scripts are not an importable package, so we add ``scripts/`` to
``sys.path`` (the same trick the scripts use on each other) and ``benchmarks/``
(where the tracker module lives). ``paths.TMP`` (where the synthetic run tree
lives) and the tracker DB are redirected to a pytest ``tmp_path`` so the test
never touches the real ``tmp/`` data or the tracked ``benchmarks/`` DB.
"""

from __future__ import annotations

import importlib
import json
import sqlite3
from collections.abc import Iterator
from pathlib import Path
from types import ModuleType

import pytest

# scripts/ + benchmarks/ are on sys.path via conftest (the single owner of that
# setup); no per-module sys.path.insert here.


@pytest.fixture
def harness(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> Iterator[tuple[ModuleType, ModuleType, ModuleType]]:
    """Import ``paths`` + ``experiments`` + ``ingest_timings`` with TMP and the
    tracker DB redirected to an isolated tree. Returns the three modules.

    On teardown ``ingest_timings`` is re-reloaded AFTER monkeypatch has reverted
    paths/experiments, so the module's rebound module-level references no longer
    point at this test's (now-deleted) tmp_path and do not leak into later tests.
    """
    paths = importlib.import_module("paths")
    monkeypatch.setattr(paths, "TMP", tmp_path / "tmp")
    experiments = importlib.import_module("experiments")
    monkeypatch.setattr(experiments, "DB_PATH", tmp_path / "benchmarks" / "experiments.db")
    ingest = importlib.import_module("ingest_timings")
    importlib.reload(ingest)  # rebind module-level paths/experiments after monkeypatch
    try:
        yield paths, experiments, ingest
    finally:
        monkeypatch.undo()
        importlib.reload(ingest)  # rebind against the restored (unpatched) paths


def _write_timings(paths_mod: ModuleType, run_id: str, pr_id: str, doc: dict) -> Path:
    """Write a synthetic timings.json under the sharded run layout, inside the
    product's .skill-code-review shard tree (so rglob finds it)."""
    pr_dir = paths_mod.run_dir(run_id, pr_id)
    tj = pr_dir / ".skill-code-review" / "2026" / "06" / "09" / "ab" / "cdef0" / "timings.json"
    tj.parent.mkdir(parents=True, exist_ok=True)
    tj.write_text(json.dumps(doc))
    return tj


def _sample_doc() -> dict:
    return {
        "run_id": "20260609-000000-abcdef0",
        "fsm_run_id": "x",
        "whole_review_ms": 508,
        "stage_timings": [
            {"scope": "worker", "name": "scan_project", "iteration_n": None, "wall_ms": 10},
            {"scope": "advance", "name": "scan_project", "iteration_n": None, "wall_ms": 5},
            {"scope": "inline", "name": "risk_tier_triage", "iteration_n": None, "wall_ms": 2},
        ],
        "specialists": [
            {"leaf_id": "lang-python", "wall_ms": 42, "tokens_in": 4, "tokens_out": 50,
             "cost_usd": 0.21, "est_cost": 0.0017, "tier": "strong"},
            {"leaf_id": "sec-csrf", "wall_ms": 88, "tokens_in": 6, "tokens_out": 80,
             "cost_usd": 0.07, "est_cost": 0.0009, "tier": "strong"},
        ],
        "cost": {
            "total_in_tokens": 10, "total_out_tokens": 130,
            "total_cost_usd": 0.28, "total_est_cost": 0.0026,
        },
    }


def test_measured_rows_cover_process_state_and_agent(
    harness: tuple[ModuleType, ModuleType, ModuleType],
) -> None:
    """One timings.json yields a process row, aggregated fsm_state rows, and one
    agent row per specialist; tokens stay null on the CLI path."""
    _paths, _experiments, ingest = harness
    rows = ingest._measured_rows("iter1", "demo-1", _sample_doc())
    by_scope: dict[str, list[dict]] = {}
    for r in rows:
        by_scope.setdefault(r["scope"], []).append(r)

    assert len(by_scope["process"]) == 1
    assert by_scope["process"][0]["name"] == "whole_review"
    assert by_scope["process"][0]["wall_ms"] == 508
    # The process row carries the per-review PROXY cost (run-level total_est_cost).
    assert by_scope["process"][0]["cost"] == 0.0026

    # scan_project appears in two stage rows (worker + advance) -> one aggregated
    # fsm_state row with summed wall_ms and n_calls == 2.
    states = {r["name"]: r for r in by_scope["fsm_state"]}
    assert states["scan_project"]["wall_ms"] == 15
    assert states["scan_project"]["n_calls"] == 2
    assert states["risk_tier_triage"]["wall_ms"] == 2

    agents = {r["name"]: r for r in by_scope["agent"]}
    assert set(agents) == {"lang-python", "sec-csrf"}
    assert agents["sec-csrf"]["wall_ms"] == 88
    # Per-specialist tokens + per-call est_cost flow through to the agent rows.
    assert agents["lang-python"]["tokens_in"] == 4
    assert agents["lang-python"]["cost"] == 0.0017
    assert agents["sec-csrf"]["cost"] == 0.0009

    # every measured row carries the right provenance.
    assert all(r["status"] == "measured" and r["source"] == "runner" for r in rows)


def test_collect_walks_run_tree_and_dry_run_writes_nothing(
    harness: tuple[ModuleType, ModuleType, ModuleType],
) -> None:
    """collect() walks tmp/runs/<run-id>/<ab>/<pr>/ and reads each timings.json;
    it is read-only (never creates the DB)."""
    paths_mod, experiments, ingest = harness
    _write_timings(paths_mod, "iter1", "demo-1", _sample_doc())
    rows, skipped = ingest.collect(["iter1"], include_self_reported=False)
    # 1 process + 2 fsm_state + 2 agent.
    assert len(rows) == 5
    assert skipped == 0
    assert not experiments.DB_PATH.exists()  # dry-run / collect never creates the DB


def test_apply_writes_rows_into_timings_table(
    harness: tuple[ModuleType, ModuleType, ModuleType],
) -> None:
    """write_rows persists the rows into the tracker timings table via the shared
    connect()/init_db()."""
    paths_mod, experiments, ingest = harness
    _write_timings(paths_mod, "iter1", "demo-1", _sample_doc())
    rows, _skipped = ingest.collect(["iter1"], include_self_reported=False)
    n = ingest.write_rows(rows)
    assert n == 5
    assert experiments.DB_PATH.exists()

    conn = sqlite3.connect(experiments.DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        got = conn.execute(
            "SELECT scope, name, wall_ms, cost, n_calls, status, source FROM timings "
            "ORDER BY scope, name"
        ).fetchall()
    finally:
        conn.close()
    rows_by_key = {(r["scope"], r["name"]): r for r in got}
    assert rows_by_key[("process", "whole_review")]["wall_ms"] == 508
    # The cost column exists (guarded ALTER ran in init_db) and carries the proxy.
    assert rows_by_key[("process", "whole_review")]["cost"] == 0.0026
    assert rows_by_key[("agent", "lang-python")]["cost"] == 0.0017
    assert rows_by_key[("fsm_state", "scan_project")]["n_calls"] == 2
    assert rows_by_key[("agent", "sec-csrf")]["wall_ms"] == 88
    assert all(r["status"] == "measured" and r["source"] == "runner" for r in got)


def test_per_review_cost_means_across_priced_prs(
    harness: tuple[ModuleType, ModuleType, ModuleType],
) -> None:
    """per_review_cost averages each PR's run-level total_est_cost (the cost_mean
    to hand to `experiments.py record --cost`)."""
    paths_mod, _experiments, ingest = harness
    d1, d2 = _sample_doc(), _sample_doc()
    d2["cost"]["total_est_cost"] = 0.0074  # second PR pricier
    _write_timings(paths_mod, "iter1", "demo-1", d1)
    _write_timings(paths_mod, "iter1", "demo-2", d2)
    mean, n, skipped = ingest.per_review_cost(["iter1"])
    assert n == 2 and skipped == 0
    assert mean is not None
    assert abs(mean - (0.0026 + 0.0074) / 2) < 1e-9


def test_per_review_cost_none_when_no_cost_block(
    harness: tuple[ModuleType, ModuleType, ModuleType],
) -> None:
    """A timings.json with no cost block (a pre-capture run) yields None, never a
    fabricated 0 that would falsely pass GATE-5."""
    paths_mod, _experiments, ingest = harness
    doc = _sample_doc()
    del doc["cost"]
    _write_timings(paths_mod, "iter1", "demo-1", doc)
    mean, n, skipped = ingest.per_review_cost(["iter1"])
    assert mean is None and n == 0 and skipped == 0


def test_per_review_cost_skips_non_positive_cost(
    harness: tuple[ModuleType, ModuleType, ModuleType],
) -> None:
    """A 0 (or negative) total_est_cost is missing/invalid telemetry, not a priced
    review: per_review_cost must skip it so cost_mean_proxy never reads 0.0 instead
    of None and fail-closed for GATE-5 holds. A run that dispatched specialists
    always costs > 0, so a 0 here means an empty/malformed cost block."""
    paths_mod, _experiments, ingest = harness
    good, zero = _sample_doc(), _sample_doc()
    zero["cost"]["total_est_cost"] = 0.0  # malformed/empty cost block
    _write_timings(paths_mod, "iter1", "demo-1", good)
    _write_timings(paths_mod, "iter1", "demo-2", zero)
    mean, n, skipped = ingest.per_review_cost(["iter1"])
    assert n == 1 and skipped == 0  # zero is not "priced", and not "corrupt" either
    assert mean == 0.0026  # only the genuinely-priced PR contributes

    # And when EVERY PR has a non-positive cost, cost_mean is None (fully fail-closed),
    # never a fabricated 0 that would pass GATE-5 trivially.
    only_zero = _sample_doc()
    only_zero["cost"]["total_est_cost"] = 0.0
    _write_timings(paths_mod, "iter2", "demo-1", only_zero)
    mean2, n2, skipped2 = ingest.per_review_cost(["iter2"])
    assert mean2 is None and n2 == 0 and skipped2 == 0


def test_per_review_cost_counts_corrupt_files(
    harness: tuple[ModuleType, ModuleType, ModuleType],
) -> None:
    """An unreadable timings.json is counted in skipped, not silently dropped, so a
    partial read does not masquerade as a complete cost_mean."""
    paths_mod, _experiments, ingest = harness
    _write_timings(paths_mod, "iter1", "demo-1", _sample_doc())  # good
    tj = _write_timings(paths_mod, "iter1", "demo-2", _sample_doc())
    tj.write_text("{ not json")  # corrupt the second PR
    mean, n, skipped = ingest.per_review_cost(["iter1"])
    assert n == 1 and skipped == 1
    assert mean == 0.0026  # only the readable PR contributes


def test_self_reported_only_under_flag(
    harness: tuple[ModuleType, ModuleType, ModuleType],
) -> None:
    """A self-reported runtime_ms is ingested only with --include-self-reported,
    flagged status='self_reported' so it can never poison the measured ranking."""
    _paths, _experiments, ingest = harness
    doc = _sample_doc()
    doc["specialists"][0]["runtime_ms"] = 999999  # hallucinated self report
    off = ingest._measured_rows("iter1", "demo-1", doc)
    assert all(r["status"] == "measured" for r in off)
    on = ingest._self_reported_rows("iter1", "demo-1", doc)
    assert len(on) == 1
    assert on[0]["status"] == "self_reported"
    assert on[0]["source"] == "specialist_json"
    assert on[0]["wall_ms"] == 999999


def test_missing_run_yields_no_rows(
    harness: tuple[ModuleType, ModuleType, ModuleType],
) -> None:
    _paths, _experiments, ingest = harness
    assert ingest.collect(["nonexistent"], include_self_reported=False) == ([], 0)
