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

# The benchmarks/ tree is TRACKED (committed), unlike the gitignored tmp/ data
# (plan section 8). It holds the experiment tracker DB, the generated markdown
# state surfaces (STATE/HISTORY/LEADERBOARD), and the versioned calibration
# artifacts. The layout lives here, in one place, next to the tmp sharding
# helpers, so experiments.py and ingest_verdicts.py share a single source of
# truth for these paths instead of each re-deriving them.
BENCH = REPO / "benchmarks"


def bench_db_path() -> Path:
    """The tracked SQLite tracker DB (benchmarks/experiments.db, plan section 8)."""
    return BENCH / "experiments.db"


def calibration_dir() -> Path:
    """The tracked calibration-artifact directory (benchmarks/calibration/).

    Holds the versioned <tag-or-date>.json curves and the stable current.json
    the product loads at review time (plan 7.2). Not created here; the
    calibrator makes it on first --apply.
    """
    return BENCH / "calibration"


def state_md_path() -> Path:
    """Generated 'YOU ARE HERE' state surface (benchmarks/STATE.md, plan 6.7)."""
    return BENCH / "STATE.md"


def history_md_path() -> Path:
    """Generated full experiment ledger (benchmarks/HISTORY.md, plan section 8)."""
    return BENCH / "HISTORY.md"


def leaderboard_md_path() -> Path:
    """Generated best-tool leaderboard (benchmarks/LEADERBOARD.md, plan section 8)."""
    return BENCH / "LEADERBOARD.md"


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
