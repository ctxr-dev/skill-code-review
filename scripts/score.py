#!/usr/bin/env python
"""Aggregate per-PR judge verdicts into a leaderboard for one run-id.

Usage: score.py <run_id> [pr_id ...]   (run_id e.g. default | prod | iter1)
Reads tmp/judge/<run_id>/<ab>/<pr>.json (each: {tools:{tool:{tp,fp,fn,n_candidates}}}).
Computes micro-averaged precision/recall/F1 + FP counts per tool over the
PRs where that tool had candidates. Writes tmp/results/<run_id>/{metrics.json,leaderboard.md}.
"""
from __future__ import annotations
import json, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import paths  # noqa: E402

RUN_ID = sys.argv[1] if len(sys.argv) > 1 else "default"
RESULTS = paths.results_dir(RUN_ID)


def main() -> None:
    explicit = sys.argv[2:]
    judged = dict(paths.iter_judge_files(RUN_ID))  # pr_id -> verdict path
    pr_ids = explicit or sorted(judged)
    agg: dict[str, dict] = {}
    for pid in pr_ids:
        f = judged.get(pid) or paths.judge_path(RUN_ID, pid)
        if not f.exists():
            continue
        data = json.loads(f.read_text())
        for tool, v in data.get("tools", {}).items():
            a = agg.setdefault(tool, {"tp": 0, "fp": 0, "fn": 0, "n_prs": 0, "n_cand": 0, "prs": []})
            a["tp"] += v.get("tp", 0); a["fp"] += v.get("fp", 0); a["fn"] += v.get("fn", 0)
            a["n_cand"] += v.get("n_candidates", 0); a["n_prs"] += 1; a["prs"].append(pid)

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

    RESULTS.mkdir(parents=True, exist_ok=True)
    (RESULTS / "metrics.json").write_text(json.dumps({"rows": rows, "pr_ids": pr_ids}, indent=2))

    def star(t): return " ⭐" if t.startswith("skill-") else ""
    lines = [
        f"# Leaderboard [{RUN_ID}] — {len(pr_ids)} PRs (judge: Opus 4.8, Martian rule)",
        "",
        "| tool | recall | precision | F1 | TP | FP | FN | FP/PR | PRs |",
        "|---|---|---|---|---|---|---|---|---|",
    ]
    for r in rows:
        lines.append(
            f"| {r['tool']}{star(r['tool'])} | {r['recall']:.2f} | {r['precision']:.2f} | "
            f"{r['f1']:.2f} | {r['tp']} | {r['fp']} | {r['fn']} | {r['fp_per_pr']:.1f} | {r['n_prs']} |")
    (RESULTS / "leaderboard.md").write_text("\n".join(lines) + "\n")
    print("\n".join(lines))


if __name__ == "__main__":
    main()
