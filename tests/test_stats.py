"""Tests for ``scripts/stats.py`` (the benchmark statistics engine).

Two contracts are exercised:

1. Bootstrap CI coverage on a SYNTHETIC dataset: when we know the per-PR
   ground truth, the seeded percentile bootstrap must bracket the true pooled
   metric, be deterministic across reruns, and tighten as PRs accumulate.
2. The 5-gate ``gate_predicate`` returns the RIGHT verdict on hand-crafted
   promote / revert / inconclusive fixtures (plan section 6.3), including the
   under-12-PR underpower guard that forbids PROMOTE.

scipy/statsmodels/numpy are DEV-only deps the integrator adds under a
dev/bench extra. Until they are installed the whole module is skipped (so the
default ``uv run pytest`` stays green pre-integration); once installed the real
assertions run.
"""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

# numpy is the load-bearing dep for stats.py; skip the module cleanly if the
# integrator has not yet added the dev/bench extra.
np = pytest.importorskip("numpy")
pytest.importorskip("scipy")
pytest.importorskip("statsmodels")

# stats.py lives in the tracked scripts/ dir (not the code_review package), so
# put it on the path the same way the harness scripts do.
SCRIPTS = Path(__file__).resolve().parent.parent / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

import stats  # noqa: E402  (path inserted just above)


# --------------------------------------------------------------------------- #
# Synthetic data helpers.
# --------------------------------------------------------------------------- #
def _round_from_per_pr(
    per_pr: list[tuple[int, int, int]],
    *,
    prefix: str = "pr",
) -> dict[str, dict[str, float]]:
    """Build one round mapping pr_id -> {tp,fp,fn} from a list of count triples."""
    return {
        f"{prefix}{i}": {"tp": float(tp), "fp": float(fp), "fn": float(fn)}
        for i, (tp, fp, fn) in enumerate(per_pr)
    }


def _synthetic_dataset(
    n_prs: int,
    *,
    tp: int = 7,
    fp: int = 2,
    fn: int = 3,
    seed: int = 1,
) -> tuple[list[dict[str, dict[str, float]]], float]:
    """A single-round measurement of ``n_prs`` PRs with a known pooled recall.

    Every PR carries identical counts, so the pooled (micro-averaged) recall is
    exactly tp/(tp+fn) and is the value the bootstrap CI must bracket. Returns
    (rounds, true_recall).
    """
    per_pr = [(tp, fp, fn)] * n_prs
    rounds = [_round_from_per_pr(per_pr)]
    true_recall = tp / (tp + fn)
    return rounds, true_recall


# --------------------------------------------------------------------------- #
# (1) bootstrap CI coverage on synthetic data.
# --------------------------------------------------------------------------- #
def test_bootstrap_ci_brackets_true_metric() -> None:
    """The percentile bootstrap interval must contain the known pooled metric."""
    rounds, true_recall = _synthetic_dataset(40, tp=7, fp=2, fn=3)
    ci = stats.bootstrap_ci(rounds, "recall", b=2000)
    assert ci.lo <= true_recall <= ci.hi
    # Point estimate equals the exact pooled recall (no resampling noise there).
    assert ci.point == pytest.approx(true_recall, abs=1e-9)
    assert ci.lo <= ci.point <= ci.hi


def test_bootstrap_ci_is_deterministic() -> None:
    """Seeded RNG (default_rng(0)) makes the interval bit-stable across reruns."""
    rounds, _ = _synthetic_dataset(25)
    a = stats.bootstrap_ci(rounds, "f1", b=1500)
    b = stats.bootstrap_ci(rounds, "f1", b=1500)
    assert a.as_triple() == b.as_triple()


def test_bootstrap_ci_degenerate_when_homogeneous() -> None:
    """All PRs identical -> every resample reproduces the same metric, so the
    interval collapses onto the point (a sanity check that the resample unit is
    truly the PR)."""
    rounds, true_recall = _synthetic_dataset(15, tp=5, fp=1, fn=5)
    ci = stats.bootstrap_ci(rounds, "recall", b=1000)
    assert ci.lo == pytest.approx(true_recall, abs=1e-9)
    assert ci.hi == pytest.approx(true_recall, abs=1e-9)


def test_bootstrap_ci_tightens_with_more_prs() -> None:
    """With heterogeneous PRs the CI width shrinks as the sample grows, and
    coverage of the empirical/true value is maintained.

    Coverage check: over many independent synthetic draws of a heterogeneous
    PR population, the seeded 95% CI brackets the population pooled recall in a
    clear majority of draws (a coverage smoke test, not an exact 95% claim at
    these B/n)."""
    rng = np.random.default_rng(123)
    # A heterogeneous population: half the PRs are "easy" (high recall), half
    # "hard" (low recall). Population pooled recall is the count-weighted mix.
    easy = (9, 1, 1)   # recall 9/10
    hard = (2, 1, 8)   # recall 2/10
    pop_tp = easy[0] + hard[0]
    pop_fn = easy[2] + hard[2]
    pop_recall = pop_tp / (pop_tp + pop_fn)

    def draw_round(n_pairs: int) -> dict[str, dict[str, float]]:
        rows: list[tuple[int, int, int]] = []
        for _ in range(n_pairs):
            rows.append(easy)
            rows.append(hard)
        rng.shuffle(rows)
        return _round_from_per_pr(rows)

    small = stats.bootstrap_ci([draw_round(6)], "recall", b=2000)   # 12 PRs
    large = stats.bootstrap_ci([draw_round(40)], "recall", b=2000)  # 80 PRs
    # Both intervals are centred on the population recall (homogeneous pairs ->
    # exact pooled value regardless of n).
    assert small.point == pytest.approx(pop_recall, abs=1e-9)
    assert large.point == pytest.approx(pop_recall, abs=1e-9)
    # More PRs -> a tighter (or equal) interval.
    assert (large.hi - large.lo) <= (small.hi - small.lo) + 1e-9

    # Coverage smoke test across independent heterogeneous draws.
    covered = 0
    trials = 40
    for _ in range(trials):
        r = draw_round(8)
        ci = stats.bootstrap_ci([r], "recall", b=800, rng=np.random.default_rng(rng.integers(1 << 30)))
        if ci.lo <= pop_recall <= ci.hi:
            covered += 1
    assert covered >= int(0.85 * trials)


# --------------------------------------------------------------------------- #
# Paired helpers used by the gate.
# --------------------------------------------------------------------------- #
def test_paired_delta_ci_positive_when_candidate_better() -> None:
    """A uniformly better candidate yields a delta-F1 CI strictly above zero."""
    base = [_round_from_per_pr([(4, 4, 6)] * 20)]   # low precision + recall
    cand = [_round_from_per_pr([(8, 1, 2)] * 20)]   # better both axes
    ci = stats.paired_delta_ci(base, cand, "f1", b=2000)
    assert ci.lo > 0.0
    assert ci.point > 0.0


def test_mcnemar_recall_discordant_counts() -> None:
    """McNemar tallies discordant pairs correctly and returns a valid p-value."""
    # 6 goldens: 2 both-caught, 1 baseline-only, 3 candidate-only, 0 neither.
    base = [True, True, True, False, False, False]
    cand = [True, True, False, True, True, True]
    res = stats.mcnemar_recall(base, cand)
    assert res.b_only == 1
    assert res.c_only == 3
    assert 0.0 <= res.pvalue <= 1.0


def test_bh_fdr_orders_and_bounds() -> None:
    """BH correction returns one decision/adjusted-p per input, all in [0,1]."""
    res = stats.bh_fdr([0.001, 0.04, 0.2, 0.9])
    assert len(res.reject) == 4
    assert len(res.pvalues_corrected) == 4
    assert all(0.0 <= p <= 1.0 for p in res.pvalues_corrected)
    # The smallest raw p stays the most significant after correction.
    assert res.reject[0] is True


def test_paired_permutation_f1_runs() -> None:
    """Permutation test returns a statistic and a p-value in [0,1]."""
    base = [_round_from_per_pr([(4, 4, 6)] * 14)]
    cand = [_round_from_per_pr([(8, 1, 2)] * 14)]
    res = stats.paired_permutation_f1(base, cand, n_resamples=500)
    assert 0.0 <= res.pvalue <= 1.0


# --------------------------------------------------------------------------- #
# (2) gate_predicate verdicts on hand-crafted fixtures.
# --------------------------------------------------------------------------- #
def _measurement(per_pr_by_round: list[list[tuple[int, int, int]]]) -> list[dict[str, dict[str, float]]]:
    """Build an N-round measurement; each inner list is one round's per-PR counts.

    All rounds must describe the SAME ordered PR set (same pr ids) so the pair
    matching and stability stdev see aligned PRs across rounds.
    """
    return [_round_from_per_pr(rnd) for rnd in per_pr_by_round]


def test_gate_predicate_promote() -> None:
    """Candidate beats baseline on F1 with no regression on any axis, >=12 PRs,
    stable across rounds, cheaper-or-equal cost -> PROMOTE."""
    n = 16
    # Baseline: mediocre precision (lots of fp), decent recall.
    base_round = [(6, 5, 4)] * n
    # Candidate: same recall (tp/fn identical) but far fewer false positives ->
    # higher precision -> higher F1, lower fp/PR. Recall non-regressed.
    cand_round = [(6, 1, 4)] * n
    baseline = _measurement([base_round, base_round, base_round])
    candidate = _measurement([cand_round, cand_round, cand_round])
    out = stats.gate_predicate(
        baseline,
        candidate,
        baseline_cost=[1.00, 1.00, 1.00],
        candidate_cost=[1.05, 1.05, 1.05],
        b=2000,
    )
    assert out["verdict"] == "PROMOTE"
    assert out["gate_1_recall"] is True
    assert out["gate_2_noise"] is True
    assert out["gate_3_progress"] is True
    assert out["gate_4_stability"] is True
    assert out["gate_5_cost"] is True


def test_gate_predicate_revert_on_recall_regression() -> None:
    """Candidate drops recall hard (misses goldens) -> GATE-1 red -> REVERT."""
    n = 16
    base_round = [(8, 2, 2)] * n   # recall 8/10
    cand_round = [(3, 2, 7)] * n   # recall 3/10 (big drop)
    baseline = _measurement([base_round] * 3)
    candidate = _measurement([cand_round] * 3)
    out = stats.gate_predicate(baseline, candidate, b=2000)
    assert out["verdict"] == "REVERT"
    assert out["gate_1_recall"] is False


def test_gate_predicate_revert_on_noise_blowup() -> None:
    """Candidate keeps recall but floods false positives -> GATE-2 red -> REVERT."""
    n = 16
    base_round = [(6, 1, 4)] * n   # 1 fp/PR
    cand_round = [(6, 6, 4)] * n   # 6 fp/PR, recall unchanged
    baseline = _measurement([base_round] * 3)
    candidate = _measurement([cand_round] * 3)
    out = stats.gate_predicate(baseline, candidate, b=2000)
    assert out["verdict"] == "REVERT"
    assert out["gate_2_noise"] is False


def test_gate_predicate_inconclusive_when_no_progress() -> None:
    """No regression on any axis, but candidate == baseline so the delta-F1 CI
    straddles zero -> only GATE-3 fails -> INCONCLUSIVE (not PROMOTE)."""
    n = 16
    same = [(6, 2, 4)] * n
    baseline = _measurement([same] * 3)
    candidate = _measurement([same] * 3)
    out = stats.gate_predicate(
        baseline,
        candidate,
        baseline_cost=[1.0, 1.0, 1.0],
        candidate_cost=[1.0, 1.0, 1.0],
        b=2000,
    )
    assert out["verdict"] == "INCONCLUSIVE"
    assert out["gate_1_recall"] is True
    assert out["gate_2_noise"] is True
    assert out["gate_3_progress"] is False
    assert out["gate_4_stability"] is True
    assert out["gate_5_cost"] is True


def test_gate_predicate_underpowered_never_promotes() -> None:
    """Fewer than 12 shared PRs -> INCONCLUSIVE even when the candidate clearly
    wins on F1 (the underpower guard forbids PROMOTE)."""
    n = 5  # below MIN_PRS_FOR_PROMOTE
    base_round = [(6, 5, 4)] * n
    cand_round = [(6, 1, 4)] * n   # strictly better, would PROMOTE if powered
    baseline = _measurement([base_round] * 3)
    candidate = _measurement([cand_round] * 3)
    out = stats.gate_predicate(baseline, candidate, b=2000)
    assert out["verdict"] == "INCONCLUSIVE"
    assert out["underpowered"] is True
    assert out["n_shared_prs"] == n


def test_gate_predicate_cost_guard_reverts_on_blowup() -> None:
    """A clear F1 win is still REVERTed when cost more than 1.25x the baseline
    (GATE-5 is a non-regression gate, so its failure routes to REVERT)."""
    n = 16
    base_round = [(6, 5, 4)] * n
    cand_round = [(6, 1, 4)] * n
    baseline = _measurement([base_round] * 3)
    candidate = _measurement([cand_round] * 3)
    out = stats.gate_predicate(
        baseline,
        candidate,
        baseline_cost=[1.00, 1.00, 1.00],
        candidate_cost=[2.00, 2.00, 2.00],  # 2.0x > 1.25x
        b=2000,
    )
    assert out["gate_5_cost"] is False
    assert out["verdict"] == "REVERT"
