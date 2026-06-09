#!/usr/bin/env python
"""Verify reviewers.wiki is an exact rebuild of reviewers.src (no drift, no hand-edits).

reviewers.src is the source of truth (flat, hand-authored leaves). reviewers.wiki is a
DETERMINISTIC projection of it, built by skill-llm-wiki and pinned by reviewers.layout.yaml.
Because the build is byte-stable, the committed wiki must equal a fresh rebuild of the
source. This check enforces that: it rebuilds into a throwaway temp dir and compares every
content file (every *.md, excluding skill-internal dot-dirs) to the committed reviewers.wiki/.

A failure means one of:
  - someone hand-edited reviewers.wiki/ (forbidden: the wiki is generated), or
  - reviewers.src/ (or reviewers.layout.yaml) changed without rebuilding + committing the wiki.
Fix by editing reviewers.src/ (never the wiki), rebuilding, and committing both layers.

Usage:
  python scripts/check_wiki_drift.py            # exit 0 = no drift, 1 = drift, 2 = could not run
Env:
  SKILL_LLM_WIKI   path to skill-llm-wiki's CLI (default: ../skill-llm-wiki/scripts/cli.mjs)
"""
from __future__ import annotations

import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
SRC = REPO / "reviewers.src"
WIKI = REPO / "reviewers.wiki"
LAYOUT = REPO / "reviewers.layout.yaml"
CLI = Path(
    os.environ.get("SKILL_LLM_WIKI", str(REPO.parent / "skill-llm-wiki" / "scripts" / "cli.mjs"))
)


def _content_files(root: Path) -> dict[str, Path]:
    """Map relative-path -> file for every *.md under root, skipping dot-directories.

    Dot-dirs (.llmwiki private git, .work, .shape, .layout) are build internals, not wiki
    content; they may carry op-ids/timestamps and are intentionally excluded.
    """
    out: dict[str, Path] = {}
    for p in root.rglob("*.md"):
        rel = p.relative_to(root)
        if any(part.startswith(".") for part in rel.parts):
            continue
        out[str(rel)] = p
    return out


def main() -> int:
    if not CLI.exists():
        sys.stderr.write(
            f"drift-check: skill-llm-wiki CLI not found at {CLI}.\n"
            "Set SKILL_LLM_WIKI to the path of skill-llm-wiki/scripts/cli.mjs.\n"
        )
        return 2
    if not WIKI.is_dir() or not SRC.is_dir():
        sys.stderr.write("drift-check: reviewers.src/ and reviewers.wiki/ must both exist.\n")
        return 2

    tmp = Path(tempfile.mkdtemp(prefix="wiki-drift-"))
    try:
        # Build from a copy so the output (reviewers.src.wiki) lands in tmp, never the repo.
        src_copy = tmp / "reviewers.src"
        shutil.copytree(SRC, src_copy)
        layout_copy = tmp / "reviewers.layout.yaml"
        shutil.copy(LAYOUT, layout_copy)

        proc = subprocess.run(
            [
                "node",
                str(CLI),
                "build",
                str(src_copy),
                "--layout-config",
                str(layout_copy),
                "--quality-mode",
                "deterministic",
                "--soft-dag-parents",
                "--accept-dirty",
            ],
            capture_output=True,
            text=True,
        )
        rebuilt = tmp / "reviewers.src.wiki"
        if proc.returncode != 0 or not rebuilt.is_dir():
            sys.stderr.write("drift-check: rebuild failed.\n" + (proc.stderr or proc.stdout)[-2000:] + "\n")
            return 2

        committed = _content_files(WIKI)
        fresh = _content_files(rebuilt)

        stale = sorted(set(committed) - set(fresh))   # committed but the rebuild does not produce
        absent = sorted(set(fresh) - set(committed))  # rebuild produces but not committed
        changed = sorted(
            k for k in (set(committed) & set(fresh))
            if committed[k].read_bytes() != fresh[k].read_bytes()
        )

        if stale or absent or changed:
            print("WIKI DRIFT DETECTED: reviewers.wiki is NOT an exact rebuild of reviewers.src.")
            print("The wiki is generated. Author in reviewers.src (or reviewers.layout.yaml),")
            print("rebuild via skill-llm-wiki, and commit both layers. Do not hand-edit the wiki.\n")
            for k in stale:
                print(f"  committed-only (hand-added or stale, not produced by a rebuild): {k}")
            for k in absent:
                print(f"  rebuild-only (the committed wiki is missing it): {k}")
            for k in changed:
                print(f"  content differs (committed != rebuild): {k}")
            total = len(stale) + len(absent) + len(changed)
            print(f"\n{total} drifted file(s) out of {len(committed)} committed content files.")
            return 1

        print(
            f"reviewers.wiki is an exact rebuild of reviewers.src "
            f"({len(committed)} content files match). No drift."
        )
        return 0
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    raise SystemExit(main())
