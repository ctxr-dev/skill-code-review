"""Sharded path scheme for the benchmark harness — kills the flat-dir fs bottleneck.

A `run_id` is one benchmark variant/iteration (e.g. "default", "prod", "iter1").
`shard` = first 2 hex of sha256(pr_id), so no directory ever holds more than a
couple hundred entries no matter how many runs/PRs accumulate.

Layout:
  tmp/repos/<ab>/<pr>/                       materialized repo (shared across runs)
  tmp/runs/<run_id>/<ab>/<pr>/               a review's output (.skill-code-review + run.log)
  tmp/judge/<run_id>/<ab>/<pr>.json          judge verdict for (run_id, pr)
  tmp/judge/<run_id>/<ab>/_input_<pr>.json   judge input for (run_id, pr)
  tmp/results/<run_id>/                       per-run leaderboard / metrics

All driver scripts import this module so the layout lives in exactly one place.
"""
from __future__ import annotations

import hashlib
from pathlib import Path

# This module lives in skill-code-review/scripts/ (tracked, durable). The benchmark
# DATA it points at lives under skill-code-review/tmp/ (gitignored, regenerable,
# safe to delete — only data, never scripts, lives there).
REPO = Path(__file__).resolve().parent.parent  # .../skill-code-review
TMP = REPO / "tmp"


def shard(pr_id: str) -> str:
    return hashlib.sha256(pr_id.encode("utf-8")).hexdigest()[:2]


def repo_dir(pr_id: str) -> Path:
    return TMP / "repos" / shard(pr_id) / pr_id


def run_dir(run_id: str, pr_id: str) -> Path:
    return TMP / "runs" / run_id / shard(pr_id) / pr_id


def judge_dir(run_id: str, pr_id: str) -> Path:
    return TMP / "judge" / run_id / shard(pr_id)


def judge_path(run_id: str, pr_id: str) -> Path:
    return judge_dir(run_id, pr_id) / f"{pr_id}.json"


def judge_input_path(run_id: str, pr_id: str) -> Path:
    return judge_dir(run_id, pr_id) / f"_input_{pr_id}.json"


def results_dir(run_id: str) -> Path:
    return TMP / "results" / run_id


def iter_judge_files(run_id: str):
    """Yield (pr_id, verdict_path) for every judged PR under a run_id."""
    base = TMP / "judge" / run_id
    if not base.is_dir():
        return
    for p in sorted(base.rglob("*.json")):
        if p.name.startswith("_input_"):
            continue
        yield p.stem, p
