#!/usr/bin/env python
"""Statistics for the Martian benchmark program (DEV-only tooling for scripts/).

This module is the statistical engine behind the 5-gate PROMOTE predicate
(plan section 6.3) and the bootstrap CIs that score.py reports (plan section
7.3). It is imported by score.py and benchmarks/experiments.py; it is NOT part
of the runtime code_review package and adds ZERO runtime deps. Its third-party
imports (numpy, scipy, statsmodels) are DEV-only and the integrator declares
them under a dev/bench extra in pyproject.toml.

The unit of evidence is the PR. Everything here resamples PRs (never findings),
so within-PR correlation never leaks into a confidence interval. All RNG is
seeded with numpy.default_rng(0) for bit-stable reruns.

Vocabulary (plan section 6.1):
  - Round: one product run over the frozen PR set, scored to per-PR {tp,fp,fn}.
  - Measurement: N rounds of one config, reduced to mean + bootstrap 95% CI.
  - The gate compares a baseline Measurement against a candidate Measurement.

Data shapes:
  A per-PR counts record is a mapping pr_id -> {"tp": int, "fp": int, "fn": int}.
  A "round" is one such mapping. A measurement is a list of rounds (length N).
"""
from __future__ import annotations

import sys
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass, field
from pathlib import Path
from typing import TYPE_CHECKING, Literal

import numpy as np
from scipy.stats import permutation_test
from statsmodels.stats.contingency_tables import mcnemar
from statsmodels.stats.multitest import multipletests

# benchmarks/experiments.py is the single, pure-stdlib owner of the 5-gate
# threshold constants and the summary-statistics fallback gate. Import them here
# (adding benchmarks/ to sys.path the same way the harness scripts do) so the two
# engines NEVER carry divergent threshold literals or two copies of the summary
# gate. experiments.py imports cleanly without numpy, so this is side-effect-free.
_BENCH = Path(__file__).resolve().parent.parent / "benchmarks"
if str(_BENCH) not in sys.path:
    sys.path.insert(0, str(_BENCH))
import experiments as _experiments  # noqa: E402  (path inserted just above)  # type: ignore[import-not-found]

if TYPE_CHECKING:  # pragma: no cover - typing only
    from numpy.random import Generator
    from numpy.typing import NDArray

# Bootstrap resample count (plan sections 6.3 / 7.3: B = 10,000, resample = PR).
B_DEFAULT = 10_000
# The 5-gate thresholds and the underpower floor are OWNED by experiments.py;
# alias them here so both engines read one source of truth (plan 6.3).
MIN_PRS_FOR_PROMOTE = _experiments.MIN_PRS_FOR_PROMOTE
GATE1_RECALL_DELTA_FLOOR = _experiments.GATE1_RECALL_DELTA_FLOOR
GATE2_FP_DELTA_CEILING = _experiments.GATE2_FP_DELTA_CEILING
GATE4_STDEV_SLACK = _experiments.GATE4_STDEV_SLACK
GATE5_COST_MULTIPLIER = _experiments.GATE5_COST_MULTIPLIER
# A fixed seed makes every CI and permutation p-value bit-stable across reruns.
SEED = 0

PRCounts = Mapping[str, Mapping[str, float]]
Verdict = Literal["PROMOTE", "REVERT", "INCONCLUSIVE"]


# --------------------------------------------------------------------------- #
# Metric arithmetic over per-PR counts (pooled / micro-averaged).
# --------------------------------------------------------------------------- #
def _safe_div(num: float, den: float) -> float:
    """Division that returns 0.0 on a zero denominator (the score.py rule)."""
    return num / den if den else 0.0


def recall_from_counts(tp: float, fp: float, fn: float) -> float:
    """Recall = tp / (tp + fn); 0.0 when there are no positives (score.py rule)."""
    return _safe_div(tp, tp + fn)


def precision_from_counts(tp: float, fp: float, fn: float) -> float:
    """Precision = tp / (tp + fp); 0.0 when there are no predicted positives."""
    return _safe_div(tp, tp + fp)


def f1_from_counts(tp: float, fp: float, fn: float) -> float:
    """F1 = harmonic mean of precision and recall; 0.0 when both are 0."""
    prec = precision_from_counts(tp, fp, fn)
    rec = recall_from_counts(tp, fp, fn)
    return _safe_div(2 * prec * rec, prec + rec)


# metric name -> function over pooled (tp, fp, fn) sums. Typed precisely as the
# (tp, fp, fn) -> metric signature so callers need no `# type: ignore[operator]`.
_MetricFn = Callable[[float, float, float], float]
_METRIC_FNS: dict[str, _MetricFn] = {
    "recall": recall_from_counts,
    "precision": precision_from_counts,
    "f1": f1_from_counts,
}


def _ordered_prs(round_counts: PRCounts) -> list[str]:
    """Deterministically ordered PR ids (sorted) for stable matrix columns."""
    return sorted(round_counts)


def _counts_matrix(round_counts: PRCounts, pr_ids: Sequence[str]) -> NDArray[np.float64]:
    """Stack a round's per-PR counts into an (n_prs, 3) float array [tp, fp, fn].

    A PR absent from this round contributes zeros, so a round may legitimately
    omit a PR (e.g. a tool produced no candidates) without misaligning columns.
    """
    rows = []
    for pid in pr_ids:
        c = round_counts.get(pid, {})
        rows.append([float(c.get("tp", 0.0)), float(c.get("fp", 0.0)), float(c.get("fn", 0.0))])
    return np.asarray(rows, dtype=np.float64)


def _pool_rounds(rounds: Sequence[PRCounts], pr_ids: Sequence[str]) -> NDArray[np.float64]:
    """Average each PR's counts across N rounds -> one (n_prs, 3) per-PR matrix.

    Averaging (rather than summing) keeps the per-PR counts on their natural
    one-round scale, which is what fp_per_pr and the bootstrap should reflect.
    """
    if not rounds:
        return np.zeros((len(pr_ids), 3), dtype=np.float64)
    stacked = np.stack([_counts_matrix(r, pr_ids) for r in rounds], axis=0)
    return stacked.mean(axis=0)


# --------------------------------------------------------------------------- #
# (a) per-PR bootstrap CIs.
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class CI:
    """A point estimate plus a percentile bootstrap confidence interval."""

    point: float
    lo: float
    hi: float

    def as_triple(self) -> tuple[float, float, float]:
        return (self.point, self.lo, self.hi)


def _metric_over_matrix(mat: NDArray[np.float64], metric: str) -> float:
    """Micro-averaged metric over a (n_prs, 3) [tp, fp, fn] matrix."""
    tp, fp, fn = mat[:, 0].sum(), mat[:, 1].sum(), mat[:, 2].sum()
    fn_obj = _METRIC_FNS[metric]
    return float(fn_obj(tp, fp, fn))


def bootstrap_ci(
    rounds: Sequence[PRCounts],
    metric: str,
    *,
    b: int = B_DEFAULT,
    alpha: float = 0.05,
    rng: Generator | None = None,
) -> CI:
    """Percentile bootstrap 95% CI for one metric, resampling the PR as the unit.

    The point estimate is the micro-averaged metric over the per-PR counts
    pooled across the N rounds. Each bootstrap replicate resamples PRs with
    replacement (unit = PR, plan 6.3) and recomputes the micro-average, so the
    interval reflects PR-to-PR variability, the dominant noise source on a
    small benchmark slice.
    """
    if metric not in _METRIC_FNS:
        raise ValueError(f"unknown metric {metric!r}; expected one of {sorted(_METRIC_FNS)}")
    pr_ids = _ordered_prs_union(rounds)
    mat = _pool_rounds(rounds, pr_ids)
    n = mat.shape[0]
    point = _metric_over_matrix(mat, metric)
    if n == 0:
        return CI(point=point, lo=point, hi=point)
    gen = rng if rng is not None else np.random.default_rng(SEED)
    idx = gen.integers(0, n, size=(b, n))
    fn_obj = _METRIC_FNS[metric]
    reps = np.empty(b, dtype=np.float64)
    for k in range(b):
        sample = mat[idx[k]]
        tp, fp, fn = sample[:, 0].sum(), sample[:, 1].sum(), sample[:, 2].sum()
        reps[k] = fn_obj(tp, fp, fn)
    lo = float(np.quantile(reps, alpha / 2))
    hi = float(np.quantile(reps, 1 - alpha / 2))
    return CI(point=point, lo=lo, hi=hi)


def _ordered_prs_union(rounds: Sequence[PRCounts]) -> list[str]:
    """Sorted union of PR ids seen across all rounds (stable column order)."""
    seen: set[str] = set()
    for r in rounds:
        seen.update(r)
    return sorted(seen)


def fp_per_pr_mean(rounds: Sequence[PRCounts]) -> float:
    """Mean false positives per PR over the pooled (per-round-averaged) counts."""
    pr_ids = _ordered_prs_union(rounds)
    mat = _pool_rounds(rounds, pr_ids)
    n = mat.shape[0]
    return float(mat[:, 1].sum() / n) if n else 0.0


# --------------------------------------------------------------------------- #
# Paired per-PR vectors (shared PRs between baseline and candidate).
# --------------------------------------------------------------------------- #
def _per_pr_metric_vectors(
    baseline: Sequence[PRCounts],
    candidate: Sequence[PRCounts],
    metric: str,
) -> tuple[NDArray[np.float64], NDArray[np.float64], list[str]]:
    """Per-PR metric value for baseline and candidate over their SHARED PRs.

    Returns (baseline_vec, candidate_vec, shared_pr_ids). Each PR's counts are
    averaged across its measurement's rounds before the metric is computed, so
    one value per PR per arm. Pairing is by PR id (the resample unit).
    """
    b_ids = set(_ordered_prs_union(baseline))
    c_ids = set(_ordered_prs_union(candidate))
    shared = sorted(b_ids & c_ids)
    b_mat = _pool_rounds(baseline, shared)
    c_mat = _pool_rounds(candidate, shared)
    fn_obj = _METRIC_FNS[metric]
    b_vec = np.array(
        [fn_obj(b_mat[i, 0], b_mat[i, 1], b_mat[i, 2]) for i in range(len(shared))],
        dtype=np.float64,
    )
    c_vec = np.array(
        [fn_obj(c_mat[i, 0], c_mat[i, 1], c_mat[i, 2]) for i in range(len(shared))],
        dtype=np.float64,
    )
    return b_vec, c_vec, shared


def paired_delta_ci(
    baseline: Sequence[PRCounts],
    candidate: Sequence[PRCounts],
    metric: str,
    *,
    b: int = B_DEFAULT,
    alpha: float = 0.05,
    rng: Generator | None = None,
) -> CI:
    """Paired bootstrap CI for (candidate - baseline) of a metric over shared PRs.

    This is the interval GATE-1 (recall delta) and GATE-3 (F1 delta) read. The
    resample unit is the PR: each replicate draws the same PR indices for both
    arms (paired), so per-PR difficulty cancels and the CI is tight.
    """
    b_vec, c_vec, shared = _per_pr_metric_vectors(baseline, candidate, metric)
    n = len(shared)
    delta = c_vec - b_vec
    point = float(delta.mean()) if n else 0.0
    if n == 0:
        return CI(point=point, lo=point, hi=point)
    gen = rng if rng is not None else np.random.default_rng(SEED)
    idx = gen.integers(0, n, size=(b, n))
    reps = delta[idx].mean(axis=1)
    lo = float(np.quantile(reps, alpha / 2))
    hi = float(np.quantile(reps, 1 - alpha / 2))
    return CI(point=point, lo=lo, hi=hi)


# --------------------------------------------------------------------------- #
# (b) paired McNemar exact on shared goldens (recall axis).
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class McNemarResult:
    """Exact McNemar test over a shared set of golden defects.

    b_only: goldens the BASELINE caught but the candidate missed.
    c_only: goldens the CANDIDATE caught but the baseline missed.
    The discordant pairs (b_only, c_only) are the test's evidence; concordant
    pairs (both caught, both missed) are uninformative and excluded.
    """

    statistic: float
    pvalue: float
    b_only: int
    c_only: int


def mcnemar_recall(
    baseline_caught: Sequence[bool],
    candidate_caught: Sequence[bool],
) -> McNemarResult:
    """Exact McNemar on per-golden caught/missed booleans (paired, recall axis).

    Each input is one boolean per shared golden defect: True if that arm's
    review caught it. Uses statsmodels' exact binomial McNemar (no continuity
    correction needed for the exact variant), the test plan section 6.3 names
    for the recall axis on shared goldens.
    """
    if len(baseline_caught) != len(candidate_caught):
        raise ValueError("baseline_caught and candidate_caught must align per golden")
    b_arr = np.asarray(baseline_caught, dtype=bool)
    c_arr = np.asarray(candidate_caught, dtype=bool)
    both = int(np.sum(b_arr & c_arr))
    b_only = int(np.sum(b_arr & ~c_arr))
    c_only = int(np.sum(~b_arr & c_arr))
    neither = int(np.sum(~b_arr & ~c_arr))
    table = [[both, b_only], [c_only, neither]]
    res = mcnemar(table, exact=True)
    return McNemarResult(
        statistic=float(res.statistic),
        pvalue=float(res.pvalue),
        b_only=b_only,
        c_only=c_only,
    )


# --------------------------------------------------------------------------- #
# (c) paired permutation test on delta-F1 (samples / paired).
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class PermutationResult:
    """Result of a paired permutation test: the observed statistic and its
    two-sided p-value (secondary evidence on the delta-F1 axis, plan 7.3)."""

    statistic: float
    pvalue: float


def paired_permutation_f1(
    baseline: Sequence[PRCounts],
    candidate: Sequence[PRCounts],
    *,
    n_resamples: int = B_DEFAULT,
    rng: Generator | None = None,
) -> PermutationResult:
    """Paired permutation test on per-PR F1, candidate vs baseline.

    Uses scipy.stats.permutation_test with permutation_type='samples' (the
    paired form: each PR's two F1 values may swap arms), the test plan section
    6.3 names. Two-sided by default; the gate reads the CI, not this p-value,
    but it is recorded as secondary evidence (plan 7.3).
    """
    b_vec, c_vec, shared = _per_pr_metric_vectors(baseline, candidate, "f1")
    if len(shared) < 2:
        # permutation_test needs at least a couple of paired observations to
        # have any non-degenerate permutation distribution.
        return PermutationResult(statistic=float(c_vec.mean() - b_vec.mean()) if shared else 0.0,
                                 pvalue=1.0)
    gen = rng if rng is not None else np.random.default_rng(SEED)

    def _stat(x: NDArray[np.float64], y: NDArray[np.float64]) -> float:
        return float(np.mean(x) - np.mean(y))

    res = permutation_test(
        (c_vec, b_vec),
        _stat,
        permutation_type="samples",
        n_resamples=n_resamples,
        alternative="two-sided",
        random_state=gen,
        vectorized=False,
    )
    return PermutationResult(statistic=float(res.statistic), pvalue=float(res.pvalue))


# --------------------------------------------------------------------------- #
# (d) Benjamini-Hochberg FDR.
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class FDRResult:
    """Benjamini-Hochberg FDR outcome: per-hypothesis reject flags and the
    BH-corrected p-values, aligned with the input p-value order (plan 7.3)."""

    reject: list[bool]
    pvalues_corrected: list[float]


def bh_fdr(pvalues: Sequence[float], *, alpha: float = 0.05) -> FDRResult:
    """Benjamini-Hochberg FDR correction over many compared variants (plan 7.3).

    Thin wrapper over statsmodels multipletests(method='fdr_bh'); applied when a
    single report compares many variants so the headline p-values are not read
    naively. An empty input returns empty results.
    """
    if not pvalues:
        return FDRResult(reject=[], pvalues_corrected=[])
    reject, pvals_corr, _, _ = multipletests(list(pvalues), alpha=alpha, method="fdr_bh")
    return FDRResult(reject=[bool(x) for x in reject], pvalues_corrected=[float(x) for x in pvals_corr])


# --------------------------------------------------------------------------- #
# F1 stability across rounds (GATE-4 input).
# --------------------------------------------------------------------------- #
def f1_per_round(rounds: Sequence[PRCounts]) -> list[float]:
    """Micro-averaged F1 for each round independently (one value per round)."""
    out: list[float] = []
    for r in rounds:
        pr_ids = _ordered_prs(r)
        mat = _counts_matrix(r, pr_ids)
        out.append(_metric_over_matrix(mat, "f1"))
    return out


def _stdev(values: Sequence[float]) -> float:
    """Population stdev; 0.0 for fewer than two values (a single round is flat)."""
    if len(values) < 2:
        return 0.0
    return float(np.std(np.asarray(values, dtype=np.float64), ddof=0))


# --------------------------------------------------------------------------- #
# Cost per review (GATE-5 input).
# --------------------------------------------------------------------------- #
def mean_cost(per_round_cost: Sequence[float] | None) -> float | None:
    """Mean dollars/review across rounds, or None when cost was not recorded."""
    if not per_round_cost:
        return None
    return float(np.mean(np.asarray(per_round_cost, dtype=np.float64)))


# --------------------------------------------------------------------------- #
# (e) the EXACT 5-gate PROMOTE predicate (plan section 6.3).
# --------------------------------------------------------------------------- #
@dataclass
class GateDetail:
    """Per-gate booleans plus the computed quantities the verdict rests on."""

    gate_1_recall: bool = False
    gate_2_noise: bool = False
    gate_3_progress: bool = False
    gate_4_stability: bool = False
    gate_5_cost: bool = False
    # computed CIs / scalars (as_triple-able CIs are stored as plain triples).
    recall_baseline: tuple[float, float, float] = (0.0, 0.0, 0.0)
    recall_candidate: tuple[float, float, float] = (0.0, 0.0, 0.0)
    recall_delta_ci: tuple[float, float, float] = (0.0, 0.0, 0.0)
    f1_baseline: tuple[float, float, float] = (0.0, 0.0, 0.0)
    f1_candidate: tuple[float, float, float] = (0.0, 0.0, 0.0)
    f1_delta_ci: tuple[float, float, float] = (0.0, 0.0, 0.0)
    fp_per_pr_baseline: float = 0.0
    fp_per_pr_candidate: float = 0.0
    fp_per_pr_delta_ci_hi: float = 0.0
    f1_stdev_baseline: float = 0.0
    f1_stdev_candidate: float = 0.0
    cost_baseline: float | None = None
    cost_candidate: float | None = None
    notes: list[str] = field(default_factory=list)


def _fp_per_pr_delta_ci(
    baseline: Sequence[PRCounts],
    candidate: Sequence[PRCounts],
    *,
    b: int,
    rng: Generator,
    alpha: float = 0.05,
) -> CI:
    """Paired bootstrap CI for (candidate - baseline) false-positives-per-PR.

    GATE-2 reads the UPPER (1 - alpha/2) bound of this interval. Resample unit =
    PR; paired by PR id over the shared set, same machinery as the metric deltas.
    ``alpha`` defaults to 0.05 (a 95% interval), matching ``bootstrap_ci`` /
    ``paired_delta_ci``; the bounds are derived from alpha rather than hardcoded.
    """
    b_ids = set(_ordered_prs_union(baseline))
    c_ids = set(_ordered_prs_union(candidate))
    shared = sorted(b_ids & c_ids)
    n = len(shared)
    b_mat = _pool_rounds(baseline, shared)
    c_mat = _pool_rounds(candidate, shared)
    delta = c_mat[:, 1] - b_mat[:, 1]  # per-PR fp difference
    point = float(delta.mean()) if n else 0.0
    if n == 0:
        return CI(point=point, lo=point, hi=point)
    idx = rng.integers(0, n, size=(b, n))
    reps = delta[idx].mean(axis=1)
    lo = float(np.quantile(reps, alpha / 2))
    hi = float(np.quantile(reps, 1 - alpha / 2))
    return CI(point=point, lo=lo, hi=hi)


def gate_predicate(
    baseline_rounds: Sequence[PRCounts],
    candidate_rounds: Sequence[PRCounts],
    *,
    baseline_cost: Sequence[float] | None = None,
    candidate_cost: Sequence[float] | None = None,
    b: int = B_DEFAULT,
    min_prs: int = MIN_PRS_FOR_PROMOTE,
) -> dict[str, object]:
    """Apply the EXACT 5-gate PROMOTE predicate (plan section 6.3).

    Each argument is a measurement: a list of rounds, each round a mapping
    pr_id -> {tp, fp, fn}. Cost is an optional per-round dollars/review list.

    The five gates, verbatim from section 6.3:
      GATE-1 RECALL non-regression:
          mean(recall_C) >= mean(recall_B)
          AND lower-95%-CI(recall_C - recall_B) >= -0.03
      GATE-2 NOISE non-regression:
          mean(fp_per_pr_C) <= mean(fp_per_pr_B)
          AND upper-95%-CI(fp_per_pr_C - fp_per_pr_B) <= +0.30
      GATE-3 PROGRESS (the teeth):
          lower-95%-CI(F1_C - F1_B) > 0   (paired delta-F1 CI strictly excludes 0)
      GATE-4 STABILITY:
          stdev(F1_C over N) <= stdev(F1_B) + 0.02
      GATE-5 COST guard:
          mean($/review_C) <= 1.25 * mean($/review_B)

    Verdict mapping (section 6.3):
      all green                       -> PROMOTE
      GATE-1/2/4/5 red                -> REVERT       (genuine regression)
      only GATE-3 straddles zero      -> INCONCLUSIVE (revert, retry at next rung)
    Underpower guard: with fewer than `min_prs` shared PRs the predicate never
    PROMOTEs; it returns INCONCLUSIVE (the CI may separate at more PRs).

    Returns a dict with: verdict, the five gate booleans, a nested GateDetail
    dump, and the computed CIs (each as a (point, lo, hi) triple).
    """
    detail = GateDetail()

    # CIs and scalars the gates read. Each estimate gets its OWN freshly seeded
    # generator so the predicate is order-independent and bit-stable per gate.
    rec_b = bootstrap_ci(baseline_rounds, "recall", b=b, rng=np.random.default_rng(SEED))
    rec_c = bootstrap_ci(candidate_rounds, "recall", b=b, rng=np.random.default_rng(SEED))
    f1_b = bootstrap_ci(baseline_rounds, "f1", b=b, rng=np.random.default_rng(SEED))
    f1_c = bootstrap_ci(candidate_rounds, "f1", b=b, rng=np.random.default_rng(SEED))
    rec_delta = paired_delta_ci(baseline_rounds, candidate_rounds, "recall", b=b,
                                rng=np.random.default_rng(SEED))
    f1_delta = paired_delta_ci(baseline_rounds, candidate_rounds, "f1", b=b,
                               rng=np.random.default_rng(SEED))
    fp_delta = _fp_per_pr_delta_ci(baseline_rounds, candidate_rounds, b=b,
                                   rng=np.random.default_rng(SEED))

    fp_b = fp_per_pr_mean(baseline_rounds)
    fp_c = fp_per_pr_mean(candidate_rounds)
    std_b = _stdev(f1_per_round(baseline_rounds))
    std_c = _stdev(f1_per_round(candidate_rounds))
    cost_b = mean_cost(baseline_cost)
    cost_c = mean_cost(candidate_cost)

    detail.recall_baseline = rec_b.as_triple()
    detail.recall_candidate = rec_c.as_triple()
    detail.recall_delta_ci = rec_delta.as_triple()
    detail.f1_baseline = f1_b.as_triple()
    detail.f1_candidate = f1_c.as_triple()
    detail.f1_delta_ci = f1_delta.as_triple()
    detail.fp_per_pr_baseline = fp_b
    detail.fp_per_pr_candidate = fp_c
    detail.fp_per_pr_delta_ci_hi = fp_delta.hi
    detail.f1_stdev_baseline = std_b
    detail.f1_stdev_candidate = std_c
    detail.cost_baseline = cost_b
    detail.cost_candidate = cost_c

    # GATE-1 RECALL non-regression.
    detail.gate_1_recall = (rec_c.point >= rec_b.point) and (
        rec_delta.lo >= GATE1_RECALL_DELTA_FLOOR
    )
    # GATE-2 NOISE non-regression.
    detail.gate_2_noise = (fp_c <= fp_b) and (fp_delta.hi <= GATE2_FP_DELTA_CEILING)
    # GATE-3 PROGRESS: paired delta-F1 CI strictly excludes 0 (lower bound > 0).
    detail.gate_3_progress = f1_delta.lo > 0.0
    # GATE-4 STABILITY.
    detail.gate_4_stability = std_c <= (std_b + GATE4_STDEV_SLACK)
    # GATE-5 COST guard: vacuously true when cost was not recorded for both arms.
    if cost_b is None or cost_c is None:
        detail.gate_5_cost = True
        detail.notes.append("cost not recorded for both arms; GATE-5 treated as pass")
    else:
        detail.gate_5_cost = cost_c <= (GATE5_COST_MULTIPLIER * cost_b)

    # Underpower guard (plan 6.3): too few shared PRs -> never PROMOTE.
    _, _, shared = _per_pr_metric_vectors(baseline_rounds, candidate_rounds, "f1")
    n_shared = len(shared)
    underpowered = n_shared < min_prs

    booleans = {
        "gate_1_recall": detail.gate_1_recall,
        "gate_2_noise": detail.gate_2_noise,
        "gate_3_progress": detail.gate_3_progress,
        "gate_4_stability": detail.gate_4_stability,
        "gate_5_cost": detail.gate_5_cost,
    }

    no_regression = (
        detail.gate_1_recall
        and detail.gate_2_noise
        and detail.gate_4_stability
        and detail.gate_5_cost
    )

    verdict: Verdict
    if underpowered:
        verdict = "INCONCLUSIVE"
        detail.notes.append(
            f"underpowered: {n_shared} shared PRs < min_prs={min_prs}; cannot PROMOTE"
        )
    elif no_regression and detail.gate_3_progress:
        verdict = "PROMOTE"
    elif no_regression and not detail.gate_3_progress:
        # Only GATE-3 fails (the progress CI straddles zero) -> INCONCLUSIVE.
        verdict = "INCONCLUSIVE"
        detail.notes.append("only GATE-3 straddles zero; retry at next rung")
    else:
        # A non-regression gate (1/2/4/5) is red -> genuine regression.
        verdict = "REVERT"

    return {
        "verdict": verdict,
        "n_shared_prs": n_shared,
        "underpowered": underpowered,
        **booleans,
        "detail": detail,
    }


# --------------------------------------------------------------------------- #
# (f) the tracker's row-based entry point (benchmarks/experiments.py contract).
# --------------------------------------------------------------------------- #
# benchmarks/experiments.py lazily imports `promote_gate(baseline_row,
# candidate_row) -> mapping` and expects a mapping with keys verdict/gates/detail.
# It hands two EXPERIMENT ROWS (dict summaries from the DB), not per-PR samples.
# When the rows carry embedded per-PR `rounds` (the high-fidelity path the
# harness can populate), we run the exact paired-bootstrap gate_predicate;
# otherwise we evaluate the five gates over the recorded summary statistics
# (means + CIs). Either way the return shape is uniform so the tracker can
# normalize it. Verdicts are lower-cased to match the tracker's vocabulary
# ("promote"/"revert"/"inconclusive").
_ROUNDS_KEYS = ("rounds", "per_pr_rounds", "per_pr")
_COST_KEYS = ("per_round_cost", "round_costs", "costs")


def _coerce_rounds(value: object) -> list[PRCounts] | None:
    """Best-effort coercion of an embedded per-PR rounds payload to the gate
    shape (a list of pr_id -> {tp,fp,fn} mappings). Returns None if the shape is
    not recognizable, so the caller falls back to the summary-stat path."""
    if not isinstance(value, list) or not value:
        return None
    out: list[PRCounts] = []
    for rnd in value:
        if not isinstance(rnd, dict):
            return None
        coerced: dict[str, Mapping[str, float]] = {}
        for pid, counts in rnd.items():
            if not isinstance(counts, dict):
                return None
            coerced[str(pid)] = {
                "tp": float(counts.get("tp", 0.0)),
                "fp": float(counts.get("fp", 0.0)),
                "fn": float(counts.get("fn", 0.0)),
            }
        out.append(coerced)
    return out


def _embedded_rounds(row: Mapping[str, object]) -> list[PRCounts] | None:
    for key in _ROUNDS_KEYS:
        if key in row:
            rounds = _coerce_rounds(row[key])
            if rounds is not None:
                return rounds
    return None


def _embedded_cost(row: Mapping[str, object]) -> list[float] | None:
    for key in _COST_KEYS:
        val = row.get(key)
        if isinstance(val, list) and val:
            try:
                return [float(x) for x in val]
            except (TypeError, ValueError):
                return None
    return None


def promote_gate(
    baseline_row: Mapping[str, object],
    candidate_row: Mapping[str, object],
) -> dict[str, object]:
    """Row-based 5-gate predicate for benchmarks/experiments.py (plan 6.3 / 8).

    Each argument is an experiment row (a DB summary dict). When BOTH rows carry
    embedded per-PR `rounds` (one of the keys in `_ROUNDS_KEYS`), the exact
    paired-bootstrap `gate_predicate` runs; otherwise the gates are evaluated
    over the recorded summary statistics via the SINGLE owner of that arithmetic,
    ``experiments.summary_stat_gate`` (so the two engines never drift). Returns
    the tracker's expected mapping with keys: verdict (lower-cased), gates
    (per-gate booleans), detail.
    """
    base_rounds = _embedded_rounds(baseline_row)
    cand_rounds = _embedded_rounds(candidate_row)
    if base_rounds is not None and cand_rounds is not None:
        raw = gate_predicate(
            base_rounds,
            cand_rounds,
            baseline_cost=_embedded_cost(baseline_row),
            candidate_cost=_embedded_cost(candidate_row),
        )
        detail = raw.get("detail")
        gates = {
            "gate_1_recall": bool(raw.get("gate_1_recall")),
            "gate_2_noise": bool(raw.get("gate_2_noise")),
            "gate_3_progress": bool(raw.get("gate_3_progress")),
            "gate_4_stability": bool(raw.get("gate_4_stability")),
            "gate_5_cost": bool(raw.get("gate_5_cost")),
        }
        notes = list(getattr(detail, "notes", []) or [])
        return {
            "verdict": str(raw.get("verdict", "INCONCLUSIVE")).lower(),
            "gates": gates,
            "detail": {
                "engine": "scripts.stats.gate_predicate",
                "n_shared_prs": raw.get("n_shared_prs"),
                "underpowered": raw.get("underpowered"),
                "notes": notes,
            },
        }
    return _experiments.summary_stat_gate(dict(baseline_row), dict(candidate_row))


__all__ = [
    "B_DEFAULT",
    "CI",
    "MIN_PRS_FOR_PROMOTE",
    "SEED",
    "FDRResult",
    "GateDetail",
    "McNemarResult",
    "PermutationResult",
    "bh_fdr",
    "bootstrap_ci",
    "f1_from_counts",
    "f1_per_round",
    "fp_per_pr_mean",
    "gate_predicate",
    "mcnemar_recall",
    "mean_cost",
    "paired_delta_ci",
    "paired_permutation_f1",
    "precision_from_counts",
    "promote_gate",
    "recall_from_counts",
]
