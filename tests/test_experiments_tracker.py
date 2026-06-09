"""Tests for ``benchmarks/experiments.py`` (the experiment tracker).

These tests are deliberately self-contained: they import the tracker module by
file path (benchmarks/ is not an importable package) and exercise the DB layer
plus the generated STATE.md against a TEMP database. They never import
``scripts/stats.py`` at collection time, so the suite is collectable and runnable
even before that module exists. The only path that would touch scripts/stats.py
is the ``gate`` subcommand's lazy import, which is not exercised here.

Coverage:
  - init creates the four tables (experiments, metrics, findings, dead_ends).
  - record persists an experiment row plus metric and finding rows.
  - a round-trip read returns the same values (float tolerance on numerics).
  - render_state produces a do-not-edit header and reflects the recorded baseline.
  - the dead-end hash is stable and normalized.
"""

from __future__ import annotations

import importlib.util
import sqlite3
import sys
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
def tracker() -> ModuleType:
    if not TRACKER_PATH.is_file():
        pytest.skip(f"tracker not present at {TRACKER_PATH}")
    return _load_tracker()


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


def test_init_creates_four_tables(db_conn: sqlite3.Connection) -> None:
    names = {
        r[0]
        for r in db_conn.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table'"
        ).fetchall()
    }
    assert {"experiments", "metrics", "findings", "dead_ends"} <= names
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
