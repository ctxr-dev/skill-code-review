"""Tests for ``benchmarks/experiments.py`` (the experiment tracker).

These tests are deliberately self-contained: they import the tracker module by
file path (benchmarks/ is not an importable package) and exercise the DB layer
plus the generated STATE.md against a TEMP database. They never import
``scripts/stats.py`` at collection time, so the suite is collectable and runnable
even before that module exists. The only path that would touch scripts/stats.py
is the ``gate`` subcommand's lazy import, which is not exercised here.

Coverage:
  - init creates the five tables (experiments, metrics, findings, dead_ends,
    timings).
  - record persists an experiment row plus metric and finding rows.
  - a round-trip read returns the same values (float tolerance on numerics).
  - render_state produces a do-not-edit header and reflects the recorded baseline.
  - the dead-end hash is stable and normalized.
"""

from __future__ import annotations

import importlib.util
import sqlite3
import sys
from collections.abc import Iterator
from pathlib import Path
from types import ModuleType

import pytest

REPO = Path(__file__).resolve().parent.parent
TRACKER_PATH = REPO / "benchmarks" / "experiments.py"


def _load_tracker() -> ModuleType:
    """Load benchmarks/experiments.py by path (it is not a package module).

    The module is registered in ``sys.modules`` BEFORE exec so the ``@dataclass``
    machinery can resolve its own module while evaluating annotations (otherwise
    ``sys.modules[cls.__module__]`` is None and dataclass field setup crashes).
    """
    name = "benchmarks_experiments"
    spec = importlib.util.spec_from_file_location(name, TRACKER_PATH)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


@pytest.fixture(scope="module")
def tracker() -> Iterator[ModuleType]:
    if not TRACKER_PATH.is_file():
        pytest.skip(f"tracker not present at {TRACKER_PATH}")
    module = _load_tracker()
    try:
        yield module
    finally:
        # Pop the by-path import so it does not leak into later suites that may
        # import an `experiments`/`benchmarks_experiments` module of their own.
        sys.modules.pop("benchmarks_experiments", None)


@pytest.fixture
def db_conn(tracker: ModuleType, tmp_path: Path) -> sqlite3.Connection:
    """A fresh, initialized DB in a temp dir. Closed by the test runner via GC,
    but we also close explicitly at the end of each test that uses it.
    """
    db_path = tmp_path / "experiments.db"
    conn = tracker.connect(db_path)
    tracker.init_db(conn)
    return conn


def _baseline_row() -> dict[str, object]:
    return {
        "run_id": "run-001",
        "ts": "2026-06-09T00:00:00+00:00",
        "git_sha": "deadbee",
        "pr_set_id": "pr5",
        "baseline_tag": "v-bench-0.1.0-pr5",
        "backend": "claude",
        "config_json": {"backend": "claude", "max_workers": 8},
        "lever": "baseline",
        "hypothesis": "lock the first baseline",
        "diff_stat": "0 files changed",
        "n_rounds": 3,
        "recall_mean": 0.50,
        "recall_ci_lo": 0.42,
        "recall_ci_hi": 0.58,
        "precision_mean": 0.60,
        "f1_mean": 0.545,
        "f1_ci_lo": 0.49,
        "f1_ci_hi": 0.60,
        "fp_per_pr_mean": 1.8,
        "cost_mean": 0.0,
        "f1_stdev": 0.03,
        "verdict": "promote",
        "calibration_tag": None,
        "notes": "pilot baseline",
    }


def test_init_creates_all_tables(db_conn: sqlite3.Connection) -> None:
    names = {
        r[0]
        for r in db_conn.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table'"
        ).fetchall()
    }
    assert {"experiments", "metrics", "findings", "dead_ends", "timings"} <= names
    db_conn.close()


def test_init_is_idempotent(tracker: ModuleType, db_conn: sqlite3.Connection) -> None:
    # Calling init_db again must not raise and must not drop data.
    tracker.upsert_experiment(db_conn, _baseline_row())
    tracker.init_db(db_conn)
    assert tracker.get_experiment(db_conn, "run-001") is not None
    db_conn.close()


def test_record_round_trip(tracker: ModuleType, db_conn: sqlite3.Connection) -> None:
    row = _baseline_row()
    tracker.upsert_experiment(db_conn, row)
    tracker.upsert_metric(
        db_conn,
        {
            "run_id": "run-001",
            "tool": "skill-prod",
            "recall": 0.50,
            "precision": 0.60,
            "f1": 0.545,
            "tp": 10,
            "fp": 9,
            "fn": 10,
            "fp_per_pr": 1.8,
            "ci_low": 0.49,
            "ci_high": 0.60,
            "usd_per_review": 0.0,
        },
    )
    db_conn.execute(
        "INSERT INTO findings "
        "(run_id, pr_id, tool, finding_idx, defect_confidence, severity, matched, golden_count) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        ("run-001", "cal.com-14943", "skill-prod", 0, 0.82, "important", 1, 4),
    )
    db_conn.commit()

    back = tracker.get_experiment(db_conn, "run-001")
    assert back is not None
    assert back["run_id"] == "run-001"
    assert back["pr_set_id"] == "pr5"
    assert back["verdict"] == "promote"
    assert back["f1_mean"] == pytest.approx(0.545)
    assert back["recall_ci_lo"] == pytest.approx(0.42)
    # config_json round-trips as a JSON string we can re-parse.
    import json

    cfg = json.loads(back["config_json"])
    assert cfg["max_workers"] == 8

    mrows = tracker.metrics_for(db_conn, "run-001")
    assert len(mrows) == 1
    assert mrows[0]["tool"] == "skill-prod"
    assert mrows[0]["f1"] == pytest.approx(0.545)

    frows = db_conn.execute(
        "SELECT * FROM findings WHERE run_id = ?", ("run-001",)
    ).fetchall()
    assert len(frows) == 1
    assert frows[0]["matched"] == 1
    assert frows[0]["defect_confidence"] == pytest.approx(0.82)
    db_conn.close()


def test_latest_proven_is_promoted_baseline(
    tracker: ModuleType, db_conn: sqlite3.Connection
) -> None:
    tracker.upsert_experiment(db_conn, _baseline_row())
    # A later, reverted experiment must NOT become the live baseline.
    reverted = _baseline_row()
    reverted.update({"run_id": "run-002", "ts": "2026-06-10T00:00:00+00:00",
                     "verdict": "revert", "f1_mean": 0.40})
    tracker.upsert_experiment(db_conn, reverted)
    proven = tracker.latest_proven(db_conn)
    assert proven is not None
    assert proven["run_id"] == "run-001"
    db_conn.close()


def test_connect_sets_busy_timeout(tracker: ModuleType, tmp_path: Path) -> None:
    """connect() applies a busy_timeout so concurrent CLI/ingest writers retry on a
    lock instead of failing immediately with SQLITE_BUSY."""
    db = tmp_path / "bt.db"
    conn = tracker.connect(db)
    try:
        (busy_ms,) = conn.execute("PRAGMA busy_timeout").fetchone()
        assert busy_ms == tracker.BUSY_TIMEOUT_MS
        assert busy_ms > 0
    finally:
        conn.close()


def test_leaderboard_skill_annotation_uses_dash_terminated_prefix(
    tracker: ModuleType, db_conn: sqlite3.Connection
) -> None:
    """The leaderboard '(skill)' annotation keys off SKILL_TOOL_PREFIX ('skill-'),
    the SAME prefix the verdict-ingest filter and the score.py star use, so a tool
    like 'skillset' is NOT mis-annotated as a skill variant (the bare-'skill'
    prefix-drift bug)."""
    assert tracker.SKILL_TOOL_PREFIX == "skill-"
    tracker.upsert_experiment(db_conn, _baseline_row())
    for tool in ("skill-prod", "skillset", "competitor-x"):
        tracker.upsert_metric(db_conn, {"run_id": "run-001", "tool": tool, "f1": 0.5})
    db_conn.commit()
    md = tracker.render_leaderboard(db_conn)
    assert "skill-prod (skill)" in md
    assert "skillset (skill)" not in md  # no-dash tool is NOT annotated
    assert "competitor-x (skill)" not in md
    db_conn.close()


def test_latest_proven_recognizes_ramp_verdict(
    tracker: ModuleType, db_conn: sqlite3.Connection
) -> None:
    """RAMP is a first-class proven-baseline verdict (PROVEN_VERDICTS), so a ramped
    experiment is a live baseline the same way a promoted one is. This guards the
    SQL in latest_proven against drifting from the verdict vocabulary."""
    assert "ramp" in tracker.PROVEN_VERDICTS
    ramped = _baseline_row()
    ramped.update({"run_id": "run-ramp", "ts": "2026-06-11T00:00:00+00:00",
                   "verdict": tracker.VERDICT_RAMP})
    tracker.upsert_experiment(db_conn, ramped)
    proven = tracker.latest_proven(db_conn)
    assert proven is not None
    assert proven["run_id"] == "run-ramp"
    db_conn.close()


def test_cmd_record_refuses_promoting_verdict(
    tracker: ModuleType, tmp_path: Path
) -> None:
    """The gate subcommand is the SOLE authority for the proven-baseline verdicts.
    `record --verdict promote|ramp` is rejected so an operator cannot synthesise a
    baseline that never cleared the gate (latest_proven keys off those verdicts)."""
    db = tmp_path / "guard.db"
    for verdict in tracker.PROVEN_VERDICTS:
        with pytest.raises(SystemExit):
            tracker.main(["--db", str(db), "record", "run-x",
                          "--verdict", verdict, "--apply"])
    # A non-promoting placeholder verdict records fine.
    rc = tracker.main(["--db", str(db), "record", "run-y",
                       "--verdict", tracker.VERDICT_INCONCLUSIVE, "--apply"])
    assert rc == 0
    conn = tracker.connect(db)
    try:
        row = tracker.get_experiment(conn, "run-y")
        assert row is not None
        assert row["verdict"] == tracker.VERDICT_INCONCLUSIVE
        # The rejected run was never persisted.
        assert tracker.get_experiment(conn, "run-x") is None
    finally:
        conn.close()


def test_render_state_has_do_not_edit_header_and_baseline(
    tracker: ModuleType, db_conn: sqlite3.Connection
) -> None:
    tracker.upsert_experiment(db_conn, _baseline_row())
    md = tracker.render_state(db_conn)
    assert "DO NOT EDIT" in md
    assert "YOU ARE HERE" in md
    # The recorded baseline tag and PR set surface in the generated state.
    assert "v-bench-0.1.0-pr5" in md
    assert "pr5" in md
    # F1 mean is rendered to 3 places.
    assert "0.545" in md
    db_conn.close()


def test_render_state_empty_db(tracker: ModuleType, db_conn: sqlite3.Connection) -> None:
    md = tracker.render_state(db_conn)
    assert "NONE locked yet" in md
    assert "DO NOT EDIT" in md
    db_conn.close()


def test_status_line_reflects_baseline(
    tracker: ModuleType, db_conn: sqlite3.Connection
) -> None:
    assert "no baseline locked yet" in tracker.status_line(db_conn)
    tracker.upsert_experiment(db_conn, _baseline_row())
    line = tracker.status_line(db_conn)
    assert "v-bench-0.1.0-pr5" in line
    assert "F1 0.545" in line
    db_conn.close()


def test_dead_end_hash_is_stable_and_normalized(tracker: ModuleType) -> None:
    a = tracker.hypothesis_hash("Tune the ranker threshold", "ranker")
    b = tracker.hypothesis_hash("  tune   the RANKER  threshold ", "  RANKER ")
    assert a == b  # case-folded and whitespace-normalized
    c = tracker.hypothesis_hash("a different hypothesis", "ranker")
    assert a != c


def test_init_creates_timings_table(db_conn: sqlite3.Connection) -> None:
    names = {
        r[0]
        for r in db_conn.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table'"
        ).fetchall()
    }
    assert "timings" in names
    db_conn.close()


def test_timings_table_and_slowest_round_trip(
    tracker: ModuleType, db_conn: sqlite3.Connection
) -> None:
    """Measured timing rows round-trip, slowest aggregates by (scope, name) and
    ranks by total wall time, and self_reported rows are excluded by default."""
    # Two PRs, same agent -> aggregated across PRs.
    tracker.upsert_timing(db_conn, {
        "run_id": "r1", "pr_id": "pr-a", "scope": "agent", "name": "lang-python",
        "wall_ms": 500, "source": "runner"})
    tracker.upsert_timing(db_conn, {
        "run_id": "r1", "pr_id": "pr-b", "scope": "agent", "name": "lang-python",
        "wall_ms": 700, "source": "runner"})
    tracker.upsert_timing(db_conn, {
        "run_id": "r1", "pr_id": "pr-a", "scope": "process", "name": "whole_review",
        "wall_ms": 2000, "source": "runner"})
    # A self_reported (hallucinated) row must NOT pollute the measured ranking.
    tracker.upsert_timing(db_conn, {
        "run_id": "r1", "pr_id": "pr-a", "scope": "agent", "name": "noisy-leaf",
        "wall_ms": 999999, "status": "self_reported", "source": "specialist_json"})

    # n_calls + status default correctly.
    row = db_conn.execute(
        "SELECT n_calls, status FROM timings WHERE name = 'lang-python' AND pr_id = 'pr-a'"
    ).fetchone()
    assert row["n_calls"] == 1
    assert row["status"] == "measured"

    measured = tracker.slowest_timings(db_conn, top=10)
    names = [r["name"] for r in measured]
    assert "noisy-leaf" not in names  # self_reported excluded by default
    by_name = {r["name"]: r for r in measured}
    assert by_name["whole_review"]["total_ms"] == 2000  # ranked first
    assert measured[0]["name"] == "whole_review"
    # lang-python aggregates across the two PRs.
    assert by_name["lang-python"]["prs"] == 2
    assert by_name["lang-python"]["calls"] == 2
    assert by_name["lang-python"]["total_ms"] == 1200

    # all-status surfaces the self_reported row; scope filter narrows.
    all_status = tracker.slowest_timings(db_conn, measured_only=False, top=10)
    assert any(r["name"] == "noisy-leaf" for r in all_status)
    agents = tracker.slowest_timings(db_conn, scope="agent", top=10)
    assert {r["name"] for r in agents} == {"lang-python"}
    db_conn.close()


def test_timings_cost_column_round_trips(
    tracker: ModuleType, db_conn: sqlite3.Connection
) -> None:
    """The cost column is part of TIMING_COLUMNS and persists the per-call /
    per-review PROXY cost."""
    assert "cost" in tracker.TIMING_COLUMNS
    tracker.upsert_timing(db_conn, {
        "run_id": "r1", "pr_id": "pr-a", "scope": "process", "name": "whole_review",
        "wall_ms": 2000, "cost": 0.0026, "source": "runner"})
    row = db_conn.execute(
        "SELECT cost FROM timings WHERE name = 'whole_review' AND pr_id = 'pr-a'"
    ).fetchone()
    assert row["cost"] == 0.0026
    db_conn.close()


def test_init_db_adds_cost_column_to_preexisting_timings_table(
    tracker: ModuleType, tmp_path: Path
) -> None:
    """init_db migrates a live (pre-cost) DB: CREATE TABLE IF NOT EXISTS is a no-op
    once the table exists, so the guarded ALTER must add the column. A row with a
    cost value is then insertable (upsert_timing projects TIMING_COLUMNS, which now
    includes cost)."""
    db_path = tmp_path / "legacy.db"
    conn = tracker.connect(db_path)
    # Simulate the OLD timings table (no cost column), as the live gitignored DB
    # was created before this change.
    conn.execute(
        "CREATE TABLE timings (run_id TEXT NOT NULL, pr_id TEXT NOT NULL, "
        "scope TEXT, name TEXT, wall_ms INTEGER, tokens_in INTEGER, "
        "tokens_out INTEGER, started_at TEXT, ended_at TEXT, n_calls INTEGER DEFAULT 1, "
        "status TEXT DEFAULT 'measured', source TEXT, "
        "PRIMARY KEY (run_id, pr_id, scope, name))"
    )
    conn.commit()
    cols_before = {r[1] for r in conn.execute("PRAGMA table_info(timings)")}
    assert "cost" not in cols_before

    tracker.init_db(conn)  # idempotent migration adds the column
    cols_after = {r[1] for r in conn.execute("PRAGMA table_info(timings)")}
    assert "cost" in cols_after

    # Re-running init_db is safe (the ALTER is guarded), and a cost row inserts.
    tracker.init_db(conn)
    tracker.upsert_timing(conn, {
        "run_id": "r1", "pr_id": "pr-a", "scope": "process", "name": "whole_review",
        "wall_ms": 1, "cost": 0.0026, "source": "runner"})
    (got,) = conn.execute(
        "SELECT cost FROM timings WHERE name = 'whole_review'").fetchone()
    assert got == 0.0026
    conn.close()


def test_gate5_binds_once_cost_mean_is_populated(tracker: ModuleType) -> None:
    """GATE-5 (cost <= 1.25x baseline) fails CLOSED while baseline cost_mean is
    None (routed to inconclusive via cost_baseline_missing). Once a real baseline
    cost is recorded it binds: an in-budget candidate passes, an over-budget one
    fails, WITHOUT any change to the finding gates."""
    base_no_cost = {"recall_mean": 0.5, "fp_per_pr_mean": 1.8, "f1_mean": 0.55,
                    "f1_ci_lo": 0.49, "f1_ci_hi": 0.60, "f1_stdev": 0.03,
                    "cost_mean": None}
    # A candidate that clears the other hard gates and the progress CI.
    cand = {"recall_mean": 0.5, "fp_per_pr_mean": 1.8, "f1_mean": 0.70,
            "f1_ci_lo": 0.65, "f1_ci_hi": 0.75, "f1_stdev": 0.03,
            "pr_set_id": "pr20", "cost_mean": 0.0026}

    # Baseline cost missing -> GATE-5 red, cost_baseline_missing, inconclusive.
    r0 = tracker.summary_stat_gate(base_no_cost, cand)
    assert r0["gates"]["gate_5_cost"] is False
    assert "cost_baseline_missing" in r0["detail"]["notes"]
    assert r0["verdict"] == tracker.VERDICT_INCONCLUSIVE

    # Populate baseline cost -> GATE-5 binds against a real ratio.
    base = {**base_no_cost, "cost_mean": 0.0026}
    r_in = tracker.summary_stat_gate(base, {**cand, "cost_mean": 0.0026})  # ratio 1.0
    assert r_in["gates"]["gate_5_cost"] is True
    assert "cost_baseline_missing" not in r_in["detail"]["notes"]
    assert r_in["verdict"] == tracker.VERDICT_PROMOTE

    # Over the 1.25x budget -> GATE-5 red, a genuine cost regression -> revert.
    r_over = tracker.summary_stat_gate(base, {**cand, "cost_mean": 0.0026 * 1.5})
    assert r_over["gates"]["gate_5_cost"] is False
    assert r_over["verdict"] == tracker.VERDICT_REVERT

    # SYMMETRY: a missing CANDIDATE cost must also fail GATE-5 CLOSED (not default
    # to 0.0 and pass trivially), routed to inconclusive like the baseline case.
    cand_no_cost = {k: v for k, v in cand.items() if k != "cost_mean"}
    r_cand = tracker.summary_stat_gate(base, cand_no_cost)
    assert r_cand["gates"]["gate_5_cost"] is False
    assert "cost_candidate_missing" in r_cand["detail"]["notes"]
    assert r_cand["detail"]["cost_ratio"] is None
    assert r_cand["verdict"] == tracker.VERDICT_INCONCLUSIVE

    # A non-positive candidate cost is invalid telemetry, not a real 0-cost review:
    # it must fail GATE-5 CLOSED too, symmetric with the baseline <= 0 guard, so a
    # 0.0 does NOT pass 0.0 <= 1.25*baseline trivially.
    r_zero = tracker.summary_stat_gate(base, {**cand, "cost_mean": 0.0})
    assert r_zero["gates"]["gate_5_cost"] is False
    assert "cost_candidate_missing" in r_zero["detail"]["notes"]
    assert r_zero["verdict"] == tracker.VERDICT_INCONCLUSIVE

    # bool is a subclass of int: a malformed cost_mean: True must NOT coerce to 1.0
    # and bind GATE-5 on garbage; it reads as missing and fails closed on both sides.
    r_bool = tracker.summary_stat_gate({**base, "cost_mean": True}, cand)
    assert r_bool["gates"]["gate_5_cost"] is False
    assert "cost_baseline_missing" in r_bool["detail"]["notes"]


def test_check_warns_on_known_dead_end(
    tracker: ModuleType, db_conn: sqlite3.Connection
) -> None:
    h = tracker.hypothesis_hash("raise tau_agree", "reconciler")
    tracker.upsert_dead_end(
        db_conn,
        {
            "hypothesis_hash": h,
            "lever": "reconciler",
            "pr_set_id": "pr5",
            "summary": "raising tau_agree dropped recall",
            "why_failed": "gate1_recall",
            "retry_at_pr_set": "pr10",
        },
    )
    found = db_conn.execute(
        "SELECT * FROM dead_ends WHERE hypothesis_hash = ?", (h,)
    ).fetchone()
    assert found is not None
    assert found["why_failed"] == "gate1_recall"
    db_conn.close()
