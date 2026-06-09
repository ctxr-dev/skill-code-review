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
import sys
from pathlib import Path
from types import ModuleType

import pytest

SCRIPTS = Path(__file__).resolve().parent.parent / "scripts"
BENCH = Path(__file__).resolve().parent.parent / "benchmarks"
for _p in (SCRIPTS, BENCH):
    if str(_p) not in sys.path:
        sys.path.insert(0, str(_p))


@pytest.fixture
def harness(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> tuple[ModuleType, ModuleType, ModuleType]:
    """Import ``paths`` + ``experiments`` + ``ingest_timings`` with TMP and the
    tracker DB redirected to an isolated tree. Returns the three modules."""
    paths = importlib.import_module("paths")
    monkeypatch.setattr(paths, "TMP", tmp_path / "tmp")
    experiments = importlib.import_module("experiments")
    monkeypatch.setattr(experiments, "DB_PATH", tmp_path / "benchmarks" / "experiments.db")
    ingest = importlib.import_module("ingest_timings")
    importlib.reload(ingest)  # rebind module-level paths/experiments after monkeypatch
    return paths, experiments, ingest


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
            {"leaf_id": "lang-python", "wall_ms": 42, "tokens_in": None, "tokens_out": None},
            {"leaf_id": "sec-csrf", "wall_ms": 88, "tokens_in": None, "tokens_out": None},
        ],
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

    # scan_project appears in two stage rows (worker + advance) -> one aggregated
    # fsm_state row with summed wall_ms and n_calls == 2.
    states = {r["name"]: r for r in by_scope["fsm_state"]}
    assert states["scan_project"]["wall_ms"] == 15
    assert states["scan_project"]["n_calls"] == 2
    assert states["risk_tier_triage"]["wall_ms"] == 2

    agents = {r["name"]: r for r in by_scope["agent"]}
    assert set(agents) == {"lang-python", "sec-csrf"}
    assert agents["sec-csrf"]["wall_ms"] == 88
    assert agents["lang-python"]["tokens_in"] is None

    # every measured row carries the right provenance.
    assert all(r["status"] == "measured" and r["source"] == "runner" for r in rows)


def test_collect_walks_run_tree_and_dry_run_writes_nothing(
    harness: tuple[ModuleType, ModuleType, ModuleType],
) -> None:
    """collect() walks tmp/runs/<run-id>/<ab>/<pr>/ and reads each timings.json;
    it is read-only (never creates the DB)."""
    paths_mod, experiments, ingest = harness
    _write_timings(paths_mod, "iter1", "demo-1", _sample_doc())
    rows = ingest.collect(["iter1"], include_self_reported=False)
    # 1 process + 2 fsm_state + 2 agent.
    assert len(rows) == 5
    assert not experiments.DB_PATH.exists()  # dry-run / collect never creates the DB


def test_apply_writes_rows_into_timings_table(
    harness: tuple[ModuleType, ModuleType, ModuleType],
) -> None:
    """write_rows persists the rows into the tracker timings table via the shared
    connect()/init_db()."""
    paths_mod, experiments, ingest = harness
    _write_timings(paths_mod, "iter1", "demo-1", _sample_doc())
    rows = ingest.collect(["iter1"], include_self_reported=False)
    n = ingest.write_rows(rows)
    assert n == 5
    assert experiments.DB_PATH.exists()

    conn = sqlite3.connect(experiments.DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        got = conn.execute(
            "SELECT scope, name, wall_ms, n_calls, status, source FROM timings "
            "ORDER BY scope, name"
        ).fetchall()
    finally:
        conn.close()
    rows_by_key = {(r["scope"], r["name"]): r for r in got}
    assert rows_by_key[("process", "whole_review")]["wall_ms"] == 508
    assert rows_by_key[("fsm_state", "scan_project")]["n_calls"] == 2
    assert rows_by_key[("agent", "sec-csrf")]["wall_ms"] == 88
    assert all(r["status"] == "measured" and r["source"] == "runner" for r in got)


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
    assert ingest.collect(["nonexistent"], include_self_reported=False) == []
