#!/usr/bin/env python
"""Build a per-PR judge input from a product-runner review of one run-id.

Usage: build_judge_input_prod.py <pr_id> <run_id>   (run_id e.g. prod | iter1)
Candidates come from that run's report via the sharded layout
`paths.run_dir(run_id, pr_id)/.skill-code-review/**/report.json`
(tmp/runs/<run-id>/<ab>/<pr>/...). Emits:
  - skill-prod          : every issue (honest, FP-heavy headline)
  - skill-prod-primary  : issues flagged primary=True (rank-stage selectivity)
  - skill-prod-scoped   : correctness/security leaves at critical|important
Competitor candidate sets are copied from the committed Opus-4.5 candidates so
score.py compares apples-to-apples against the same judge. Output goes to
`paths.judge_input_path(run_id, pr_id)`.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import paths  # noqa: E402

ROOT = paths.TMP
BENCH = ROOT / "bench" / "offline"
INDEX = json.loads((ROOT / "bench-index.json").read_text())
CAND = json.loads((BENCH / "results" / "anthropic_claude-opus-4-5-20251101" / "candidates.json").read_text())

COMPETITORS = ["coderabbit", "greptile-v4-1", "bugbot", "copilot", "graphite", "macroscope", "cubic-v2"]
_CORRECTNESS_RE = re.compile(r"^(sec-|lang-|fw-|orm-|footgun-|reliability-|data-)")
_CORRECTNESS_EXTRA = {"principle-fail-fast"}


def _is_correctness(issue: dict) -> bool:
    spec = issue.get("reviewer_id", "") or issue.get("specialist", "")
    dims = issue.get("dimensions") or []
    return (
        bool(_CORRECTNESS_RE.match(spec))
        or spec in _CORRECTNESS_EXTRA
        or "security" in dims
        or "correctness" in dims
    )


VARIANT = sys.argv[2] if len(sys.argv) > 2 else "prod"


def _prod_issues(pr_id: str) -> list[dict]:
    run = paths.run_dir(VARIANT, pr_id)
    rjs = list((run / ".skill-code-review").rglob("report.json")) if run.exists() else []
    if not rjs:
        return []
    # newest report wins if multiple shards exist
    rjs.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    return json.loads(rjs[0].read_text()).get("issues", [])


def _text(i: dict) -> str:
    return (i.get("title", "") + ". " + i.get("description", "")).strip()


def main() -> None:
    pr_id = sys.argv[1]
    e = INDEX[pr_id]
    key = e["original_key"]
    issues = _prod_issues(pr_id)
    golden = [g["comment"] for g in e["golden_comments"]]
    tools: dict[str, list[str]] = {
        "skill-prod": [_text(i) for i in issues],
        "skill-prod-primary": [_text(i) for i in issues if i.get("primary")],
        "skill-prod-scoped": [
            _text(i) for i in issues
            if i.get("severity") in ("critical", "important") and _is_correctness(i)
        ],
    }
    comp = CAND.get(key, {})
    for t in COMPETITORS:
        if t in comp:
            tools[t] = [c.get("text", "") for c in comp[t] if c.get("text")]
    out = {"pr_id": pr_id, "original_key": key, "lang": e["lang"],
           "n_issues_prod": len(issues), "golden": golden, "tools": tools}
    ip = paths.judge_input_path(VARIANT, pr_id)
    ip.parent.mkdir(parents=True, exist_ok=True)
    ip.write_text(json.dumps(out, indent=2))
    print(json.dumps({"pr_id": pr_id, "n_golden": len(golden),
                      "tool_candidate_counts": {k: len(v) for k, v in tools.items()}}, indent=2))


if __name__ == "__main__":
    main()
