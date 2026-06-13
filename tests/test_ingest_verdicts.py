"""Unit tests for ``scripts/ingest_verdicts.py`` on a synthetic verdict+input pair.

The harness scripts are not an importable package, so we add ``scripts/`` to
``sys.path`` (the same trick the scripts use on each other). Both ``paths.TMP``
(where the synthetic judge files live) and ``ingest_verdicts.DB_PATH`` (where
rows are written) are monkeypatched to a pytest ``tmp_path`` so the test never
touches the real ``tmp/`` data or the tracked ``benchmarks/`` DB.
"""

from __future__ import annotations

import importlib
import json
import sqlite3
from collections.abc import Iterator
from pathlib import Path
from types import ModuleType
from typing import Any

import pytest

# scripts/ + benchmarks/ are on sys.path via conftest (the single owner of that
# setup); no per-module sys.path.insert here.


@pytest.fixture
def harness(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> Iterator[tuple[ModuleType, ModuleType]]:
    """Import ``paths`` + ``ingest_verdicts`` with TMP and DB_PATH redirected.

    Returns the two modules. ``paths.TMP`` points at an isolated tree and
    ``ingest_verdicts.DB_PATH`` at a throwaway sqlite file, so the test is
    hermetic. On teardown ``ingest_verdicts`` is re-reloaded after monkeypatch has
    reverted paths, so its rebound module-level references do not leak this test's
    deleted tmp_path into later tests.
    """
    paths = importlib.import_module("paths")
    monkeypatch.setattr(paths, "TMP", tmp_path / "tmp")
    ingest = importlib.import_module("ingest_verdicts")
    importlib.reload(ingest)  # rebind module-level DB_PATH/BENCHMARKS after reload
    monkeypatch.setattr(ingest, "DB_PATH", tmp_path / "benchmarks" / "experiments.db")
    # The findings table is created by the tracker's canonical init_db (single
    # schema owner); there is no longer a duplicated CREATE TABLE to force.
    try:
        yield paths, ingest
    finally:
        monkeypatch.undo()
        importlib.reload(ingest)  # rebind against the restored (unpatched) paths


def _write_pair(
    paths_mod: ModuleType,
    run_id: str,
    pr_id: str,
    *,
    golden: list[str],
    skill_candidates: list[dict[str, Any]],
    matched: list[int],
    competitor: list[str] | None = None,
) -> None:
    """Write one synthetic judge input + verdict pair into the sharded layout."""
    in_path = paths_mod.judge_input_path(run_id, pr_id)
    in_path.parent.mkdir(parents=True, exist_ok=True)
    tools_in: dict[str, list] = {"skill-prod": skill_candidates}
    if competitor is not None:
        tools_in["coderabbit"] = competitor
    in_path.write_text(json.dumps({
        "pr_id": pr_id,
        "golden": golden,
        "tools": tools_in,
    }))

    verdict_path = paths_mod.judge_path(run_id, pr_id)
    verdict_path.parent.mkdir(parents=True, exist_ok=True)
    tools_v: dict[str, dict] = {
        "skill-prod": {
            "tp": len(matched),
            "fp": len(skill_candidates) - len(matched),
            "fn": max(0, len(golden) - len(matched)),
            "matched": matched,
            "n_candidates": len(skill_candidates),
        },
    }
    if competitor is not None:
        # Competitors record matched_golden (per-golden), not per-candidate.
        tools_v["coderabbit"] = {
            "tp": 1, "fp": 0, "fn": 0,
            "n_candidates": len(competitor), "matched_golden": [0],
        }
    verdict_path.write_text(json.dumps({"pr_id": pr_id, "tools": tools_v}))


def test_rows_label_correct_by_matched_index(harness: tuple[ModuleType, ModuleType]) -> None:
    """One row per skill candidate; ``matched`` flags exactly the matched idx."""
    paths_mod, ingest = harness
    _write_pair(
        paths_mod, "iter1", "demo-1",
        golden=["G0", "G1"],
        skill_candidates=[
            {"text": "finding zero", "defect_confidence": 0.2, "severity": "minor", "idx": 0},
            {"text": "finding one", "defect_confidence": 0.9, "severity": "critical", "idx": 1},
            {"text": "finding two", "defect_confidence": 0.5, "severity": "important", "idx": 2},
        ],
        matched=[1],  # only candidate idx 1 matched a golden
    )
    rows = ingest.rows_for_pr("iter1", "demo-1")
    assert len(rows) == 3
    # row = (run_id, pr_id, tool, finding_idx, defect_confidence, severity, matched, golden_count)
    by_idx = {r[3]: r for r in rows}
    assert by_idx[0][6] == 0 and by_idx[1][6] == 1 and by_idx[2][6] == 0
    assert by_idx[1][4] == 0.9 and by_idx[1][5] == "critical"
    assert all(r[7] == 2 for r in rows)  # golden_count carried on every row
    assert all(r[0] == "iter1" and r[1] == "demo-1" and r[2] == "skill-prod" for r in rows)


def test_competitor_tools_are_skipped(harness: tuple[ModuleType, ModuleType]) -> None:
    """Competitor verdicts (matched_golden, no per-candidate label) are ignored."""
    paths_mod, ingest = harness
    _write_pair(
        paths_mod, "iter1", "demo-2",
        golden=["G0"],
        skill_candidates=[
            {"text": "a", "defect_confidence": 0.7, "severity": "critical", "idx": 0},
        ],
        matched=[0],
        competitor=["comp finding"],
    )
    rows = ingest.rows_for_pr("iter1", "demo-2")
    assert {r[2] for r in rows} == {"skill-prod"}  # no coderabbit rows
    assert len(rows) == 1


def test_dry_run_writes_nothing_apply_writes(harness: tuple[ModuleType, ModuleType]) -> None:
    """Default is dry-run (no DB); write_rows persists the exact rows."""
    paths_mod, ingest = harness
    _write_pair(
        paths_mod, "iter1", "demo-3",
        golden=["G0", "G1"],
        skill_candidates=[
            {"text": "x", "defect_confidence": 0.1, "severity": "minor", "idx": 0},
            {"text": "y", "defect_confidence": 0.8, "severity": "important", "idx": 1},
        ],
        matched=[1],
    )
    rows = ingest.collect("iter1", ["demo-3"])
    assert len(rows) == 2
    assert not ingest.DB_PATH.exists()  # collect/dry-run never creates the DB

    n = ingest.write_rows(rows, ingest.DB_PATH)
    assert n == 2
    assert ingest.DB_PATH.exists()

    conn = sqlite3.connect(ingest.DB_PATH)
    try:
        got = conn.execute(
            "SELECT run_id, pr_id, tool, finding_idx, defect_confidence, "
            "severity, matched, golden_count FROM findings ORDER BY finding_idx"
        ).fetchall()
    finally:
        conn.close()
    assert got == [
        ("iter1", "demo-3", "skill-prod", 0, 0.1, "minor", 0, 2),
        ("iter1", "demo-3", "skill-prod", 1, 0.8, "important", 1, 2),
    ]


def test_legacy_bare_string_candidates_tolerated(
    harness: tuple[ModuleType, ModuleType],
) -> None:
    """An old judge-input with bare-string candidates yields null labels, not a crash."""
    paths_mod, ingest = harness
    in_path = paths_mod.judge_input_path("iter1", "demo-4")
    in_path.parent.mkdir(parents=True, exist_ok=True)
    in_path.write_text(json.dumps({
        "pr_id": "demo-4",
        "golden": ["G0"],
        "tools": {"skill-prod": ["bare string one", "bare string two"]},
    }))
    verdict_path = paths_mod.judge_path("iter1", "demo-4")
    verdict_path.parent.mkdir(parents=True, exist_ok=True)
    verdict_path.write_text(json.dumps({
        "pr_id": "demo-4",
        "tools": {"skill-prod": {"tp": 1, "fp": 1, "fn": 0, "matched": [0], "n_candidates": 2}},
    }))
    rows = ingest.rows_for_pr("iter1", "demo-4")
    assert len(rows) == 2
    assert rows[0][4] is None and rows[0][5] is None  # null confidence/severity
    assert rows[0][6] == 1 and rows[1][6] == 0  # matched flag still correct


def test_missing_files_yield_no_rows(harness: tuple[ModuleType, ModuleType]) -> None:
    """No verdict or no input for a PR -> no rows (never a partial/garbage row)."""
    _paths_mod, ingest = harness
    assert ingest.rows_for_pr("iter1", "nonexistent") == []


def test_apples_to_apples_skill_meta_side_table(
    harness: tuple[ModuleType, ModuleType],
) -> None:
    """Skill candidates are bare strings in the judge prompt (apples-to-apples with
    competitors); the per-finding labels come from the idx-aligned `skill_meta`
    side-table, which ingest joins back on idx."""
    paths_mod, ingest = harness
    in_path = paths_mod.judge_input_path("iter1", "demo-meta")
    in_path.parent.mkdir(parents=True, exist_ok=True)
    in_path.write_text(json.dumps({
        "pr_id": "demo-meta",
        "golden": ["G0", "G1"],
        # Bare-string candidate lists for EVERY tool (no inline confidence/severity).
        "tools": {
            "skill-prod": ["finding zero", "finding one", "finding two"],
            "coderabbit": ["comp a", "comp b"],
        },
        # Out-of-band labels, idx-aligned with the skill candidate list.
        "skill_meta": {
            "skill-prod": [
                {"defect_confidence": 0.2, "severity": "minor", "idx": 0},
                {"defect_confidence": 0.9, "severity": "critical", "idx": 1},
                {"defect_confidence": 0.5, "severity": "important", "idx": 2},
            ],
        },
    }))
    verdict_path = paths_mod.judge_path("iter1", "demo-meta")
    verdict_path.parent.mkdir(parents=True, exist_ok=True)
    verdict_path.write_text(json.dumps({
        "pr_id": "demo-meta",
        "tools": {
            "skill-prod": {"tp": 1, "fp": 2, "fn": 1, "matched": [1], "n_candidates": 3},
            "coderabbit": {"tp": 1, "fp": 0, "fn": 1, "matched_golden": [0], "n_candidates": 2},
        },
    }))
    rows = ingest.rows_for_pr("iter1", "demo-meta")
    # Only skill rows; competitor (matched_golden, no per-candidate label) skipped.
    assert {r[2] for r in rows} == {"skill-prod"}
    by_idx = {r[3]: r for r in rows}
    # Labels are recovered from skill_meta, joined on idx.
    assert by_idx[1][4] == 0.9 and by_idx[1][5] == "critical"
    assert by_idx[0][4] == 0.2 and by_idx[2][5] == "important"
    # matched flag still set from the verdict's candidate-index list.
    assert by_idx[0][6] == 0 and by_idx[1][6] == 1 and by_idx[2][6] == 0
    assert all(r[7] == 2 for r in rows)  # golden_count on every row
