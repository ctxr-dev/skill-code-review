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

Apples-to-apples judge prompt: EVERY tool (skill and competitor) emits its
candidates as a bare-string list, so the LLM judge sees the same shape for all
tools and the product's self-reported confidence/severity are NOT presented as
anchoring cues for the skill tools only. The per-finding labels the calibrator
needs (plan 7.1) are carried OUT-OF-BAND in a sibling `skill_meta` block
(`{tool: [{defect_confidence, severity, idx}, ...]}`, idx-aligned with that
tool's bare-string candidate list), which the judge never reads and
`scripts/ingest_verdicts.py` joins back on idx to write one labelled row per
skill finding. The judge verdict still records per-candidate `matched: [idx...]`
for skill tools; idx is the position in the bare-string list.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import paths

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
    return ((i.get("title") or "") + ". " + (i.get("description") or "")).strip()


def _skill_candidates(issues: list[dict]) -> list[str]:
    """The bare-string candidate list for a skill tool (the judge-prompt shape).

    Returns one readable string per issue, position-aligned (idx) with the
    `skill_meta` block built by `_skill_meta`. Keeping skill candidates bare
    matches the competitor shape so the judge sees no anchoring cue (confidence /
    severity) for the skill tools only.
    """
    return [_text(i) for i in issues]


def _skill_meta(issues: list[dict]) -> list[dict]:
    """The OUT-OF-BAND per-finding labels for a skill tool (the calibrator input).

    Shape per the per-finding label prerequisite (plan 7.1), idx-aligned with the
    bare-string candidate list from `_skill_candidates`:
      {"defect_confidence": <float|None>, "severity": <str|None>,
       "idx": <position in the candidate list>}
    `idx` is the candidate's 0-based position (the index the judge records in
    `matched` and that ingest_verdicts joins on as `correct = idx in matched`).
    `defect_confidence` sources the product's self-reported `confidence`;
    `severity` is carried verbatim so the calibrator can bucket per severity. The
    judge never sees this block, so it cannot anchor on it.
    """
    return [
        {
            "defect_confidence": i.get("confidence"),
            "severity": i.get("severity"),
            "idx": idx,
        }
        for idx, i in enumerate(issues)
    ]


def main() -> None:
    pr_id = sys.argv[1]
    e = INDEX[pr_id]
    key = e["original_key"]
    issues = _prod_issues(pr_id)
    golden = [g["comment"] for g in e["golden_comments"]]
    primary_issues = [i for i in issues if i.get("primary")]
    scoped_issues = [
        i for i in issues
        if i.get("severity") in ("critical", "important") and _is_correctness(i)
    ]
    # Every tool emits a bare-string candidate list so the judge sees one uniform
    # shape (apples-to-apples; no confidence/severity anchoring for skill tools).
    skill_issue_sets = {
        "skill-prod": issues,
        "skill-prod-primary": primary_issues,
        "skill-prod-scoped": scoped_issues,
    }
    tools: dict[str, list[str]] = {
        name: _skill_candidates(iss) for name, iss in skill_issue_sets.items()
    }
    # Out-of-band per-finding labels (idx-aligned with each skill tool's
    # candidate list); the judge never reads this, ingest_verdicts joins on idx.
    skill_meta: dict[str, list[dict]] = {
        name: _skill_meta(iss) for name, iss in skill_issue_sets.items()
    }
    comp = CAND.get(key, {})
    for t in COMPETITORS:
        if t in comp:
            tools[t] = [c.get("text", "") for c in comp[t] if c.get("text")]
    out = {"pr_id": pr_id, "original_key": key, "lang": e["lang"],
           "n_issues_prod": len(issues), "golden": golden, "tools": tools,
           "skill_meta": skill_meta}
    ip = paths.judge_input_path(VARIANT, pr_id)
    ip.parent.mkdir(parents=True, exist_ok=True)
    ip.write_text(json.dumps(out, indent=2))
    print(json.dumps({"pr_id": pr_id, "n_golden": len(golden),
                      "tool_candidate_counts": {k: len(v) for k, v in tools.items()}}, indent=2))


if __name__ == "__main__":
    main()
