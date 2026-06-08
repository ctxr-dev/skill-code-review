#!/usr/bin/env python
"""Fast re-rank measurement: re-run ONLY the product's rank_findings worker on an
existing review's findings, to test a finding-ranker.md change without a full
(specialist-rerolling) re-review. Uses the product dispatch verbatim — this is
measurement of a single product stage, not a reimplementation of the FSM.

Usage: rerank.py <pr_id> <src_variant> <out_variant>
  e.g. rerank.py sentry-67876 iter1 iter2   # re-rank iter1 findings -> iter2
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import paths  # noqa: E402

SKILL = paths.REPO  # skill-code-review (has the code_review package + reviewers.wiki)
sys.path.insert(0, str(SKILL))
from code_review.dispatch import make_dispatchers  # noqa: E402

IDX = json.loads((paths.TMP / "bench-index.json").read_text())


def _report(pr_id: str, variant: str) -> dict:
    run = paths.run_dir(variant, pr_id)
    rjs = sorted((run / ".skill-code-review").rglob("report.json"),
                 key=lambda p: p.stat().st_mtime, reverse=True)
    return json.loads(rjs[0].read_text())


def main() -> None:
    pr_id, src, out = sys.argv[1], sys.argv[2], sys.argv[3]
    e = IDX[pr_id]
    rep = _report(pr_id, src)
    findings = rep.get("issues", [])
    dispatch_worker, _ = make_dispatchers(
        str(paths.repo_dir(pr_id)), SKILL / "reviewers.wiki",
        base=e["base_diff"], head=e["head"], backend="claude")
    res = dispatch_worker("rank_findings", {
        "findings": findings,
        "changed_paths": [g for g in []],  # not needed for ranking text
        "args": {},
    })
    ranked = res.get("findings", [])
    primary = [f for f in ranked if f.get("primary")]
    outdir = paths.run_dir(out, pr_id)
    outdir.mkdir(parents=True, exist_ok=True)
    (outdir / "reranked.json").write_text(json.dumps(
        {"pr_id": pr_id, "findings": ranked, "severity_counts": res.get("severity_counts")}, indent=2))
    print(json.dumps({"pr_id": pr_id, "total": len(ranked), "primary": len(primary),
                      "primary_titles": [(f.get("title") or "")[:80] for f in primary]}, indent=2))


if __name__ == "__main__":
    main()
