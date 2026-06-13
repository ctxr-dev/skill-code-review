"""Tests for the McNemar recall-axis wiring in ``scripts/score.py`` (plan 7.3).

The 5-gate predicate's named trio is bootstrap CIs, a paired permutation test on
delta-F1, and McNemar exact on the recall axis over SHARED goldens. The first two
are reached through ``score.py --baseline``; this module pins the third: that
``score._baseline_block`` builds the per-golden caught/missed booleans from the
judge verdicts (``n_golden`` + per-tool ``matched_golden``) and actually calls
``stats.mcnemar_recall`` (the building block that previously had zero consumers
outside its own module).

numpy/scipy/statsmodels are DEV-only deps the integrator adds under the bench
extra; until installed the whole module skips (so a plain ``uv run pytest`` stays
green), and once installed the real assertions run. score.py and stats.py live in
scripts/ (not the code_review package), so scripts/ goes on sys.path the same way
the harness scripts do.
"""

from __future__ import annotations

import importlib
import json
from collections.abc import Iterator
from pathlib import Path
from types import ModuleType

import pytest

# statsmodels is the load-bearing dep for the exact McNemar test; skip the whole
# module cleanly if the integrator has not yet added the dev/bench extra.
pytest.importorskip("numpy")
pytest.importorskip("scipy")
pytest.importorskip("statsmodels")

# scripts/ + benchmarks/ are on sys.path via conftest (the single owner of that
# setup); no per-module sys.path.insert here.


@pytest.fixture
def harness(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Iterator[ModuleType]:
    """Import paths + score with TMP redirected to an isolated tree.

    Reloading score after monkeypatching ``paths.TMP`` makes its module-level path
    derivations point at the throwaway tree, so the test never touches real tmp/
    data. Yields the freshly reloaded ``score`` module, then reloads it again on
    teardown AFTER monkeypatch.undo() so the module's rebound path derivations no
    longer point at this test's (now-deleted) tmp_path and cannot leak into later
    tests (symmetric with the ingest fixtures, which reload in finally).
    """
    paths = importlib.import_module("paths")
    monkeypatch.setattr(paths, "TMP", tmp_path / "tmp")
    score = importlib.import_module("score")
    importlib.reload(score)
    try:
        yield score
    finally:
        monkeypatch.undo()
        importlib.reload(score)  # rebind against the restored (unpatched) paths


def _write_verdict(
    score: ModuleType,
    run_id: str,
    pr_id: str,
    n_golden: int,
    tool_to_matched: dict[str, list[int]],
) -> None:
    """Materialize one committed-shaped judge verdict (the layout score.py reads).

    Each tool's ``tp/fp/fn`` are derived from its ``matched_golden`` so the file
    is internally consistent: tp == |matched|, fn == n_golden - tp. fp is a
    harmless constant; it never feeds the recall-axis McNemar test.
    """
    paths = importlib.import_module("paths")
    tools: dict[str, dict[str, object]] = {}
    for tool, matched in tool_to_matched.items():
        tp = len(matched)
        tools[tool] = {
            "tp": tp,
            "fp": 1,
            "fn": n_golden - tp,
            "n_candidates": tp + 1,
            "matched_golden": list(matched),
        }
    vpath = paths.judge_path(run_id, pr_id)
    vpath.parent.mkdir(parents=True, exist_ok=True)
    vpath.write_text(json.dumps({"pr_id": pr_id, "n_golden": n_golden, "tools": tools}))


def test_per_pr_golden_caught_reads_n_golden_and_matched(harness: ModuleType) -> None:
    """per_pr_golden_caught maps pr -> (n_golden, caught indices) from the verdict."""
    score = harness
    _write_verdict(score, "cand", "pr-a", 3, {"skill-prod": [0, 2]})
    _write_verdict(score, "cand", "pr-b", 2, {"skill-prod": []})
    got = score.per_pr_golden_caught("cand", ["pr-a", "pr-b"], "skill-prod")
    assert got["pr-a"] == (3, {0, 2})
    assert got["pr-b"] == (2, set())


def test_per_pr_golden_caught_skips_missing_n_golden(harness: ModuleType) -> None:
    """A verdict without a usable n_golden is skipped (goldens unenumerable)."""
    paths = importlib.import_module("paths")
    score = harness
    vpath = paths.judge_path("cand", "pr-x")
    vpath.parent.mkdir(parents=True, exist_ok=True)
    vpath.write_text(
        json.dumps({"pr_id": "pr-x", "tools": {"skill-prod": {"matched_golden": [0]}}})
    )
    assert score.per_pr_golden_caught("cand", ["pr-x"], "skill-prod") == {}


def test_mcnemar_vectors_align_over_shared_goldens(harness: ModuleType) -> None:
    """Paired booleans cover exactly the shared PRs' goldens, position-aligned.

    Baseline misses golden 1 of pr-a that the candidate catches (a candidate-only
    discordant pair); pr-c exists only in the candidate run, so its goldens are
    excluded from the shared paired vectors.
    """
    score = harness
    _write_verdict(score, "base", "pr-a", 2, {"skill-prod": [0]})
    _write_verdict(score, "base", "pr-b", 1, {"skill-prod": [0]})
    _write_verdict(score, "cand", "pr-a", 2, {"skill-prod": [0, 1]})
    _write_verdict(score, "cand", "pr-b", 1, {"skill-prod": [0]})
    _write_verdict(score, "cand", "pr-c", 2, {"skill-prod": [0, 1]})

    base_caught, cand_caught = score._mcnemar_vectors(
        "cand", "base", ["pr-a", "pr-b", "pr-c"], ["pr-a", "pr-b"], "skill-prod"
    )
    # 3 shared goldens: pr-a g0, pr-a g1, pr-b g0 (pr-c excluded as unshared).
    assert len(base_caught) == 3
    assert len(cand_caught) == 3
    # The single discordant pair is candidate-only (pr-a golden 1).
    discordant_cand_only = sum(
        1 for b, c in zip(base_caught, cand_caught, strict=True) if c and not b
    )
    discordant_base_only = sum(
        1 for b, c in zip(base_caught, cand_caught, strict=True) if b and not c
    )
    assert discordant_cand_only == 1
    assert discordant_base_only == 0


def test_baseline_block_reports_mcnemar_with_discordant_counts(harness: ModuleType) -> None:
    """_baseline_block emits a populated mcnemar_recall block (the wiring proof).

    The candidate catches one golden per PR that the baseline misses, so McNemar
    sees a clean candidate-only column and reports it. This is the call site that
    was previously absent: stats.mcnemar_recall is now reached from score.py.
    """
    score = harness
    # 4 PRs, each 3 goldens; baseline catches {0}, candidate catches {0,1} ->
    # 4 candidate-only discordant goldens, 0 baseline-only.
    for i in range(4):
        pid = f"pr-{i}"
        _write_verdict(score, "base", pid, 3, {"skill-prod": [0]})
        _write_verdict(score, "cand", pid, 3, {"skill-prod": [0, 1]})

    block = score._baseline_block(
        "cand", "base", [f"pr-{i}" for i in range(4)], [f"pr-{i}" for i in range(4)],
        "skill-prod",
    )
    mc = block["mcnemar_recall"]
    assert mc["n_shared_goldens"] == 12  # 4 PRs * 3 goldens
    assert mc["candidate_only"] == 4
    assert mc["baseline_only"] == 0
    assert 0.0 <= mc["pvalue"] <= 1.0


def test_mcnemar_vectors_empty_without_shared_prs(harness: ModuleType) -> None:
    """Disjoint PR sets -> no shared goldens -> the paired vectors are empty.

    _baseline_block guards on this (it records mcnemar_recall as skipped rather
    than calling stats.mcnemar_recall on empty input); here we pin the vector
    builder, the source of that empty signal.
    """
    score = harness
    _write_verdict(score, "cand", "pr-only-cand", 2, {"skill-prod": [0]})
    _write_verdict(score, "base", "pr-only-base", 2, {"skill-prod": [0]})
    base_caught, cand_caught = score._mcnemar_vectors(
        "cand", "base", ["pr-only-cand"], ["pr-only-base"], "skill-prod"
    )
    assert base_caught == []
    assert cand_caught == []


def test_baseline_block_records_mcnemar_skip_when_no_n_golden(harness: ModuleType) -> None:
    """Shared PRs but no enumerable goldens -> mcnemar_recall recorded as skipped.

    The PR sets overlap (so the gate's paired bootstrap has shared PRs and runs
    cleanly), but the verdicts omit n_golden, so no per-golden booleans exist.
    _baseline_block must record the McNemar block as skipped rather than fabricate
    a statistic on empty input.
    """
    paths = importlib.import_module("paths")
    score = harness
    pr_ids = [f"pr-{i}" for i in range(3)]
    for run in ("base", "cand"):
        for pid in pr_ids:
            vpath = paths.judge_path(run, pid)
            vpath.parent.mkdir(parents=True, exist_ok=True)
            # No top-level n_golden -> goldens unenumerable -> McNemar skipped.
            vpath.write_text(
                json.dumps({
                    "pr_id": pid,
                    "tools": {"skill-prod": {"tp": 1, "fp": 1, "fn": 1, "n_candidates": 2}},
                })
            )
    block = score._baseline_block("cand", "base", pr_ids, pr_ids, "skill-prod")
    mc = block["mcnemar_recall"]
    assert mc["n_shared_goldens"] == 0
    assert "pvalue" not in mc
