#!/usr/bin/env python
"""Aggregate per-PR judge verdicts into a leaderboard for one run-id.

Usage:
  score.py <run_id> [pr_id ...]
      Point estimates only (the original behaviour, unchanged output).
  score.py <run_id> [pr_id ...] --ci [--tool skill-prod]
      Also attach bootstrap 95% CIs (recall/precision/F1) for the target tool,
      resampling the PR as the unit (scripts/stats.py, numpy, B=10000).
  score.py <run_id> [pr_id ...] --ci --baseline <baseline-run-id> [--tool ...]
      Additionally run the paired tests (McNemar on the recall axis, permutation
      on delta-F1) and the 5-gate PROMOTE predicate (plan section 6.3) of the
      target tool in <run_id> against the same tool in <baseline-run-id>.

run_id e.g. default | prod | iter1. Reads tmp/judge/<run_id>/<ab>/<pr>.json
(each: {tools:{tool:{tp,fp,fn,n_candidates}}}). Computes micro-averaged
precision/recall/F1 + FP counts per tool over the PRs where that tool had
candidates. Writes tmp/results/<run_id>/{metrics.json,leaderboard.md}.

The statistics live in scripts/stats.py (numpy/scipy/statsmodels, DEV-only) and
are imported LAZILY, only when --ci/--baseline is passed, so the default point
estimate path keeps running with zero third-party deps.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))
import paths

DEFAULT_TARGET_TOOL = "skill-prod"


def _aggregate(run_id: str, pr_ids: list[str]) -> dict[str, dict]:
    """Pool per-PR judge verdicts into per-tool totals (the leaderboard core)."""
    judged = dict(paths.iter_judge_files(run_id))  # pr_id -> verdict path
    agg: dict[str, dict] = {}
    for pid in pr_ids:
        f = judged.get(pid) or paths.judge_path(run_id, pid)
        if not f.exists():
            continue
        data = json.loads(f.read_text())
        for tool, v in data.get("tools", {}).items():
            a = agg.setdefault(tool, {"tp": 0, "fp": 0, "fn": 0, "n_prs": 0, "n_cand": 0, "prs": []})
            a["tp"] += v.get("tp", 0)
            a["fp"] += v.get("fp", 0)
            a["fn"] += v.get("fn", 0)
            a["n_cand"] += v.get("n_candidates", 0)
            a["n_prs"] += 1
            a["prs"].append(pid)
    return agg


def _rows(agg: dict[str, dict]) -> list[dict]:
    rows = []
    for tool, a in agg.items():
        tp, fp, fn = a["tp"], a["fp"], a["fn"]
        prec = tp / (tp + fp) if (tp + fp) else 0.0
        rec = tp / (tp + fn) if (tp + fn) else 0.0
        f1 = 2 * prec * rec / (prec + rec) if (prec + rec) else 0.0
        rows.append({
            "tool": tool, "tp": tp, "fp": fp, "fn": fn, "golden": tp + fn,
            "n_prs": a["n_prs"], "n_cand": a["n_cand"],
            "precision": round(prec, 4), "recall": round(rec, 4), "f1": round(f1, 4),
            "fp_per_pr": round(fp / a["n_prs"], 2) if a["n_prs"] else 0.0,
        })
    rows.sort(key=lambda r: r["f1"], reverse=True)
    return rows


def per_pr_counts(run_id: str, pr_ids: list[str], tool: str) -> dict[str, dict[str, float]]:
    """One round mapping pr_id -> {tp,fp,fn} for a single tool (stats.py input).

    A PR where the tool produced no verdict simply contributes nothing; stats.py
    treats absent PRs as zero-count, so the column alignment stays correct.
    """
    judged = dict(paths.iter_judge_files(run_id))
    out: dict[str, dict[str, float]] = {}
    for pid in pr_ids:
        f = judged.get(pid) or paths.judge_path(run_id, pid)
        if not f.exists():
            continue
        v = json.loads(f.read_text()).get("tools", {}).get(tool)
        if not isinstance(v, dict):
            continue
        out[pid] = {
            "tp": float(v.get("tp", 0)),
            "fp": float(v.get("fp", 0)),
            "fn": float(v.get("fn", 0)),
        }
    return out


def per_pr_golden_caught(
    run_id: str, pr_ids: list[str], tool: str
) -> dict[str, tuple[int, set[int]]]:
    """Map pr_id -> (n_golden, caught_golden_indices) for one tool (McNemar input).

    The judge verdict records, per PR, a top-level `n_golden` (the count of golden
    defects for that PR) and, per tool, a `matched_golden` list (the golden
    indices that tool's review caught). Together they give the per-golden recall
    booleans McNemar needs: golden g in 0..n_golden-1 was caught iff g is in
    `matched_golden`. A PR missing `n_golden` is skipped (we cannot enumerate its
    goldens); a tool missing `matched_golden` simply caught nothing.
    """
    judged = dict(paths.iter_judge_files(run_id))
    out: dict[str, tuple[int, set[int]]] = {}
    for pid in pr_ids:
        f = judged.get(pid) or paths.judge_path(run_id, pid)
        if not f.exists():
            continue
        data = json.loads(f.read_text())
        n_golden = data.get("n_golden")
        if not isinstance(n_golden, int) or n_golden <= 0:
            continue
        v = data.get("tools", {}).get(tool)
        if not isinstance(v, dict):
            continue
        matched = v.get("matched_golden") or []
        caught = {int(g) for g in matched if 0 <= int(g) < n_golden}
        out[pid] = (n_golden, caught)
    return out


def _mcnemar_vectors(
    run_id: str,
    baseline_run: str,
    pr_ids: list[str],
    baseline_pr_ids: list[str],
    tool: str,
) -> tuple[list[bool], list[bool]]:
    """Paired per-golden caught/missed booleans over the SHARED goldens.

    A golden is shared when its PR is judged in BOTH runs; the per-golden booleans
    are concatenated in a deterministic (sorted PR id, then golden index) order so
    the two arms align position-for-position. This is the exact recall-axis input
    `stats.mcnemar_recall` consumes: one boolean per shared golden per arm.
    """
    cand = per_pr_golden_caught(run_id, pr_ids, tool)
    base = per_pr_golden_caught(baseline_run, baseline_pr_ids, tool)
    baseline_caught: list[bool] = []
    candidate_caught: list[bool] = []
    for pid in sorted(set(cand) & set(base)):
        cand_n, cand_set = cand[pid]
        base_n, base_set = base[pid]
        # The same PR must expose the same golden set in both runs (the golden
        # defects are fixed by the benchmark); take the conservative overlap so a
        # stray n_golden mismatch never misaligns the paired vectors.
        n = min(cand_n, base_n)
        for g in range(n):
            baseline_caught.append(g in base_set)
            candidate_caught.append(g in cand_set)
    return baseline_caught, candidate_caught


def _ci_block(run_id: str, pr_ids: list[str], tool: str) -> dict[str, Any]:
    """Bootstrap CIs for one tool's metrics. Lazily imports scripts/stats.py."""
    # Lazy import keeps the default point-estimate path free of numpy/scipy.
    import stats

    rounds = [per_pr_counts(run_id, pr_ids, tool)]
    block: dict[str, Any] = {"tool": tool, "n_prs": len(rounds[0])}
    for metric in ("recall", "precision", "f1"):
        ci = stats.bootstrap_ci(rounds, metric)
        block[metric] = {"point": ci.point, "ci_lo": ci.lo, "ci_hi": ci.hi}
    return block


def _baseline_block(
    run_id: str,
    baseline_run: str,
    pr_ids: list[str],
    baseline_pr_ids: list[str],
    tool: str,
) -> dict[str, Any]:
    """Paired tests + the 5-gate PROMOTE predicate vs a named baseline run.

    Each measurement here is a single round (one score.py run); the gate's
    multi-round stability input (GATE-4) therefore sees one round per arm, so its
    stdev is 0 by construction. The harness records multi-round measurements via
    the tracker; this is the single-run convenience view.
    """
    # Lazy import keeps the default point-estimate path free of numpy/scipy.
    import stats

    cand_round = per_pr_counts(run_id, pr_ids, tool)
    base_round = per_pr_counts(baseline_run, baseline_pr_ids, tool)
    cand_rounds = [cand_round]
    base_rounds = [base_round]

    f1_delta = stats.paired_delta_ci(base_rounds, cand_rounds, "f1")
    recall_delta = stats.paired_delta_ci(base_rounds, cand_rounds, "recall")
    perm = stats.paired_permutation_f1(base_rounds, cand_rounds)
    gate = stats.gate_predicate(base_rounds, cand_rounds)
    # GateDetail is a dataclass; drop it from the JSON payload (the booleans and
    # the verdict are the load-bearing summary; the detail is verbose internals).
    gate_summary = {k: v for k, v in gate.items() if k != "detail"}

    # Paired McNemar exact on the recall axis over SHARED goldens (plan 7.3 /
    # 6.3): the named trio's recall-axis test, distinct from the bootstrap recall
    # delta. It reads per-golden caught/missed booleans (not the pooled tp/fp/fn
    # the deltas use), so we build them here from `n_golden` + `matched_golden`.
    base_caught, cand_caught = _mcnemar_vectors(
        run_id, baseline_run, pr_ids, baseline_pr_ids, tool
    )
    mcnemar_block: dict[str, Any]
    if base_caught:
        mc = stats.mcnemar_recall(base_caught, cand_caught)
        mcnemar_block = {
            "statistic": mc.statistic,
            "pvalue": mc.pvalue,
            "baseline_only": mc.b_only,
            "candidate_only": mc.c_only,
            "n_shared_goldens": len(base_caught),
        }
    else:
        # No shared goldens (e.g. disjoint PR sets or missing n_golden): the test
        # is undefined, so we record that explicitly rather than fabricate a result.
        mcnemar_block = {"n_shared_goldens": 0, "note": "no shared goldens; McNemar skipped"}

    return {
        "tool": tool,
        "baseline_run": baseline_run,
        "f1_delta": {"point": f1_delta.point, "ci_lo": f1_delta.lo, "ci_hi": f1_delta.hi},
        "recall_delta": {
            "point": recall_delta.point, "ci_lo": recall_delta.lo, "ci_hi": recall_delta.hi
        },
        "mcnemar_recall": mcnemar_block,
        "permutation_f1": {"statistic": perm.statistic, "pvalue": perm.pvalue},
        "gate": gate_summary,
    }


def _star(t: str) -> str:
    return " ⭐" if t.startswith("skill-") else ""


def _leaderboard_md(run_id: str, pr_ids: list[str], rows: list[dict]) -> str:
    lines = [
        f"# Leaderboard [{run_id}] — {len(pr_ids)} PRs (judge: Opus 4.8, Martian rule)",
        "",
        "| tool | recall | precision | F1 | TP | FP | FN | FP/PR | PRs |",
        "|---|---|---|---|---|---|---|---|---|",
    ]
    for r in rows:
        lines.append(
            f"| {r['tool']}{_star(r['tool'])} | {r['recall']:.2f} | {r['precision']:.2f} | "
            f"{r['f1']:.2f} | {r['tp']} | {r['fp']} | {r['fn']} | {r['fp_per_pr']:.1f} | "
            f"{r['n_prs']} |")
    return "\n".join(lines) + "\n"


def _build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="score.py",
        description="Aggregate judge verdicts into a leaderboard (optionally with CIs + gate).",
    )
    p.add_argument("run_id", nargs="?", default="default",
                   help="run-id to score (e.g. default | prod | iter1)")
    p.add_argument("pr_ids", nargs="*", help="explicit PR ids (default: all judged)")
    p.add_argument("--ci", action="store_true",
                   help="attach bootstrap CIs for the target tool (needs scripts/stats.py deps)")
    p.add_argument("--baseline", metavar="RUN_ID",
                   help="run paired tests + the 5-gate predicate vs this baseline run")
    p.add_argument("--tool", default=DEFAULT_TARGET_TOOL,
                   help=f"target tool for --ci/--baseline (default {DEFAULT_TARGET_TOOL})")
    return p


def main(argv: list[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)
    run_id = args.run_id
    results = paths.results_dir(run_id)

    judged = dict(paths.iter_judge_files(run_id))
    pr_ids = args.pr_ids or sorted(judged)
    agg = _aggregate(run_id, pr_ids)
    rows = _rows(agg)

    metrics_out: dict[str, Any] = {"rows": rows, "pr_ids": pr_ids}

    if args.ci or args.baseline:
        metrics_out["ci"] = _ci_block(run_id, pr_ids, args.tool)
    if args.baseline:
        baseline_judged = dict(paths.iter_judge_files(args.baseline))
        baseline_pr_ids = sorted(baseline_judged)
        metrics_out["baseline_comparison"] = _baseline_block(
            run_id, args.baseline, pr_ids, baseline_pr_ids, args.tool
        )

    results.mkdir(parents=True, exist_ok=True)
    (results / "metrics.json").write_text(json.dumps(metrics_out, indent=2))

    md = _leaderboard_md(run_id, pr_ids, rows)
    (results / "leaderboard.md").write_text(md)
    print(md, end="")

    if "ci" in metrics_out:
        print("\nbootstrap CIs (" + args.tool + "):")
        print(json.dumps(metrics_out["ci"], indent=2))
    if "baseline_comparison" in metrics_out:
        bc = metrics_out["baseline_comparison"]
        print(f"\npaired vs baseline '{args.baseline}' ({args.tool}):")
        print(json.dumps(bc, indent=2, default=str))
        mc = bc["mcnemar_recall"]
        if mc.get("n_shared_goldens"):
            print(
                f"\nMcNemar recall (shared goldens={mc['n_shared_goldens']}): "
                f"p={mc['pvalue']:.4f} "
                f"(baseline-only={mc['baseline_only']}, candidate-only={mc['candidate_only']})"
            )
        print(f"\nGATE VERDICT: {bc['gate'].get('verdict')}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
