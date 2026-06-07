"""CLI to run a code review through the product runner (FSM + adaptive thread
pool) with the headless-``claude`` dispatch backend. Orchestration lives in
runner.py; prompts live in workers/*.md; this only wires them together.

    python -m ctxr_skill_code_review.cli review \
        --repo <path> --base <sha> --head <sha> --run-dir <out> [--max-workers 8]
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from .dispatch import BACKENDS, make_dispatchers
from .runner import run_review


def _skill_root() -> Path:
    return Path(__file__).resolve().parent.parent


def cmd_review(a: argparse.Namespace) -> int:
    wiki = _skill_root() / "reviewers.wiki"
    repo = str(Path(a.repo).resolve())  # diff cwd + project_root (must be absolute)
    run_dir = str(Path(a.run_dir).resolve())  # decoupled artefact storage_root
    if a.clean:
        import shutil
        shutil.rmtree(Path(run_dir) / ".skill-code-review", ignore_errors=True)
    dispatch_worker, dispatch_specialist = make_dispatchers(
        repo, wiki, base=a.base, head=a.head, backend=a.backend)
    # project_root = the repo (so `git diff base..head` runs there); storage_root
    # = run_dir (so artefacts land outside the repo, leaving it pristine).
    args = {"project_root": repo, "storage_root": str(Path(run_dir) / ".skill-code-review"),
            "base": a.base, "head": a.head}
    if a.tools:
        args["tools"] = a.tools
    res = run_review(args, dispatch_worker=dispatch_worker,
                     dispatch_specialist=dispatch_specialist,
                     max_workers=a.max_workers, min_workers=a.min_workers)
    summary = {
        "faulted": res.faulted, "fault": res.fault, "verdict": res.verdict,
        "run_dir_path": res.run_dir_path, "n_findings": len(res.findings),
        "stats": vars(res.stats),
    }
    print(json.dumps(summary, indent=2, default=str))
    return 2 if res.faulted else 0


def main() -> int:
    p = argparse.ArgumentParser(prog="ctxr-skill-code-review")
    sub = p.add_subparsers(dest="cmd", required=True)
    r = sub.add_parser("review", help="run a review via the FSM runner")
    r.add_argument("--repo", required=True)
    r.add_argument("--base", required=True)
    r.add_argument("--head", required=True)
    r.add_argument("--run-dir", required=True)
    r.add_argument("--backend", default="claude", choices=sorted(BACKENDS),
                   help="agent backend: claude | codex | cursor | anthropic | openai")
    r.add_argument("--max-workers", type=int, default=8)
    r.add_argument("--min-workers", type=int, default=1)
    r.add_argument("--tools", default="silent")
    r.add_argument("--clean", action="store_true",
                   help="wipe <run-dir>/.skill-code-review before running (fresh, cache-free)")
    r.set_defaults(func=cmd_review)
    a = p.parse_args()
    return int(a.func(a))


if __name__ == "__main__":
    raise SystemExit(main())
