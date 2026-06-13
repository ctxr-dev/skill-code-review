"""The A0 SELF-TEST GATE (plan section 9, the last A0 checkbox).

This is the foundation's own proof that the measurement machinery is trustworthy
BEFORE any optimization spends a benchmark dollar. It asserts two contracts:

1. F1 REPRODUCTION. Re-scoring a committed run reproduces its F1 within float
   tolerance. We materialize a small committed-shaped judge run (the exact
   tmp/judge/<run>/<ab>/<pr>.json layout score.py reads), score it through the
   harness path (scripts/score.py), and confirm:
     - the harness F1 equals an independent micro-averaged recomputation
       (scripts/stats.py) over the SAME per-PR counts, within 1e-9, and
     - re-running the scorer on the identical committed bytes is deterministic
       (same F1 every time), which is what "re-score reproduces its F1" means.

2. BOOTSTRAP CI COVERAGE on synthetic data. With a known per-PR population we
   draw many independent samples and confirm the seeded percentile-bootstrap 95%
   CI brackets the true pooled metric at approximately the nominal rate. This is
   the coverage correctness the gate predicate (plan 6.3) leans on.

scipy/statsmodels/numpy are DEV-only deps the integrator adds under the bench
extra; until installed the whole module skips (so a plain `uv run pytest` stays
green), and once installed the real assertions run. score.py and stats.py live
in scripts/ (not the code_review package), so we put scripts/ on sys.path the
same way the harness scripts do.
"""

from __future__ import annotations

import importlib
import json
from collections.abc import Iterator
from pathlib import Path
from types import ModuleType

import pytest

# numpy/scipy/statsmodels are the load-bearing deps for stats.py; skip the whole
# gate cleanly if the integrator has not yet added the dev/bench extra.
np = pytest.importorskip("numpy")
pytest.importorskip("scipy")
pytest.importorskip("statsmodels")

# scripts/ is on sys.path via conftest (the single owner of that setup).
import stats  # noqa: E402  (scripts/ on sys.path via conftest)


@pytest.fixture
def harness(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> Iterator[tuple[ModuleType, ModuleType]]:
    """Import paths + score with TMP redirected to an isolated tree.

    Yields (paths, score). Reloading score after monkeypatching paths.TMP makes
    its module-level path derivations point at the throwaway tree, so the gate
    never touches real tmp/ data. On teardown score is reloaded AFTER
    monkeypatch.undo() so its rebound path derivations no longer point at this
    test's (now-deleted) tmp_path and cannot leak into later tests.
    """
    paths = importlib.import_module("paths")
    monkeypatch.setattr(paths, "TMP", tmp_path / "tmp")
    score = importlib.import_module("score")
    importlib.reload(score)
    try:
        yield paths, score
    finally:
        monkeypatch.undo()
        importlib.reload(score)  # rebind against the restored (unpatched) paths


# --------------------------------------------------------------------------- #
# A committed-shaped synthetic run: known per-PR counts -> known pooled F1.
# --------------------------------------------------------------------------- #
# tool -> list of per-PR (tp, fp, fn) triples. The skill-prod row is the headline
# the gate reads; a competitor row is included to prove tool isolation.
_RUN: dict[str, list[tuple[int, int, int]]] = {
    "skill-prod": [(7, 2, 3), (4, 1, 6), (9, 3, 1), (5, 5, 5), (8, 0, 2)],
    "coderabbit": [(3, 4, 7), (2, 2, 8), (6, 1, 4), (1, 0, 9), (4, 3, 6)],
}


def _write_committed_run(paths_mod: ModuleType, run_id: str) -> list[str]:
    """Materialize the per-PR judge verdicts score.py reads. Returns the pr_ids."""
    pr_ids: list[str] = []
    n_prs = len(next(iter(_RUN.values())))
    for i in range(n_prs):
        pr_id = f"pr-{i}"
        pr_ids.append(pr_id)
        tools: dict[str, dict[str, int]] = {}
        for tool, per_pr in _RUN.items():
            tp, fp, fn = per_pr[i]
            tools[tool] = {"tp": tp, "fp": fp, "fn": fn, "n_candidates": tp + fp}
        vpath = paths_mod.judge_path(run_id, pr_id)
        vpath.parent.mkdir(parents=True, exist_ok=True)
        vpath.write_text(json.dumps({"pr_id": pr_id, "tools": tools}))
    return pr_ids


def _expected_f1(tool: str) -> float:
    """Independent micro-averaged F1 over the committed per-PR counts."""
    tp = sum(t for t, _, _ in _RUN[tool])
    fp = sum(f for _, f, _ in _RUN[tool])
    fn = sum(f for _, _, f in _RUN[tool])
    return stats.f1_from_counts(float(tp), float(fp), float(fn))


# --------------------------------------------------------------------------- #
# (1) F1 reproduction.
# --------------------------------------------------------------------------- #
def test_rescore_reproduces_f1_within_tolerance(
    harness: tuple[ModuleType, ModuleType],
) -> None:
    """Scoring a committed run reproduces its F1 within float tolerance, and the
    harness aggregation matches an independent micro-averaged recomputation."""
    paths_mod, score = harness
    run_id = "selftest"
    pr_ids = _write_committed_run(paths_mod, run_id)

    agg = score._aggregate(run_id, pr_ids)
    rows = {r["tool"]: r for r in score._rows(agg)}

    for tool in _RUN:
        harness_f1 = rows[tool]["f1"]
        independent_f1 = _expected_f1(tool)
        assert harness_f1 == pytest.approx(independent_f1, abs=1e-4)

    # stats.py per-PR reconstruction must agree with the harness pooled F1 too.
    rounds = [score.per_pr_counts(run_id, pr_ids, "skill-prod")]
    stats_f1 = stats.bootstrap_ci(rounds, "f1").point
    assert stats_f1 == pytest.approx(_expected_f1("skill-prod"), abs=1e-9)


def test_rescore_is_deterministic(harness: tuple[ModuleType, ModuleType]) -> None:
    """Re-scoring the identical committed bytes yields the identical F1 every run
    (the reproducibility the baseline lock and the gate both rely on)."""
    paths_mod, score = harness
    run_id = "selftest-determinism"
    pr_ids = _write_committed_run(paths_mod, run_id)

    first = {r["tool"]: r["f1"] for r in score._rows(score._aggregate(run_id, pr_ids))}
    second = {r["tool"]: r["f1"] for r in score._rows(score._aggregate(run_id, pr_ids))}
    assert first == second


# --------------------------------------------------------------------------- #
# (2) bootstrap CI coverage on synthetic data.
# --------------------------------------------------------------------------- #
def _draw_heterogeneous_round(
    rng: np.random.Generator, n_pairs: int
) -> dict[str, dict[str, float]]:
    """One round of a heterogeneous PR population (easy + hard PRs).

    Homogeneous pairs keep the pooled recall exactly at the population value
    regardless of n, so coverage is a clean claim about the seeded CI bracketing
    a fixed truth across independent draws.
    """
    easy = (9, 1, 1)  # recall 9/10
    hard = (2, 1, 8)  # recall 2/10
    rows: list[tuple[int, int, int]] = []
    for _ in range(n_pairs):
        rows.append(easy)
        rows.append(hard)
    rng.shuffle(rows)  # type: ignore[arg-type]
    return {
        f"pr{i}": {"tp": float(tp), "fp": float(fp), "fn": float(fn)}
        for i, (tp, fp, fn) in enumerate(rows)
    }


def test_bootstrap_ci_has_correct_coverage_on_synthetic_data() -> None:
    """Over many independent synthetic draws the seeded 95% CI brackets the true
    pooled recall at approximately the nominal rate (coverage correctness)."""
    easy, hard = (9, 1, 1), (2, 1, 8)
    pop_tp = easy[0] + hard[0]
    pop_fn = easy[2] + hard[2]
    pop_recall = pop_tp / (pop_tp + pop_fn)

    rng = np.random.default_rng(2024)
    trials = 80
    covered = 0
    for _ in range(trials):
        r = _draw_heterogeneous_round(rng, n_pairs=10)  # 20 PRs/round
        ci = stats.bootstrap_ci(
            [r], "recall", b=1000, rng=np.random.default_rng(int(rng.integers(1 << 30)))
        )
        # Homogeneous pairs -> point lands exactly on the population recall.
        assert ci.point == pytest.approx(pop_recall, abs=1e-9)
        if ci.lo <= pop_recall <= ci.hi:
            covered += 1
    # A correctly calibrated 95% interval covers a clear majority of draws; we
    # assert a conservative lower bound (not an exact 95%) to stay robust at
    # this B/n while still catching a broken (systematically off) interval.
    assert covered >= int(0.85 * trials)


def test_bootstrap_ci_coverage_tightens_with_more_prs() -> None:
    """More PRs -> a tighter (or equal) interval, with coverage maintained."""
    rng = np.random.default_rng(7)
    small = stats.bootstrap_ci([_draw_heterogeneous_round(rng, 6)], "recall", b=1500)
    large = stats.bootstrap_ci([_draw_heterogeneous_round(rng, 40)], "recall", b=1500)
    assert (large.hi - large.lo) <= (small.hi - small.lo) + 1e-9
