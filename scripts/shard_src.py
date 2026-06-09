#!/usr/bin/env python
"""Enforce the sharded shape of reviewers.src: one folder per id prefix.

reviewers.src is the flat-leaf source of truth, but a single directory of thousands
of files is a filesystem bottleneck. This script shards each leaf into a folder named
by the FIRST token of its filename (the id prefix before the first hyphen):

  reviewers.src/a11y-aria-and-live-regions.md
    -> reviewers.src/a11y/a11y-aria-and-live-regions.md

The filename (and therefore the leaf id) is unchanged, so the layout pins, the build,
and the validators are unaffected: skill-llm-wiki ingests the source recursively and
derives each leaf id from its filename, and reviewers.layout.yaml pins placement by id,
not by source path. Sharding the source is purely a source-tree concern.

The script is idempotent (re-run after adding a flat leaf to re-shard it) and moves with
`git mv` to preserve history. Dry-run by default; pass --apply to actually move files.

Usage:
  python scripts/shard_src.py            # preview the moves (dry-run)
  python scripts/shard_src.py --apply    # perform the moves
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
SRC = REPO / "reviewers.src"


def _prefix(stem: str) -> str:
    """First token of the id (before the first hyphen). Single-word ids shard on themselves."""
    return stem.split("-", 1)[0]


def main() -> int:
    apply = "--apply" in sys.argv[1:]
    if not SRC.is_dir():
        sys.stderr.write(f"shard_src: {SRC} not found\n")
        return 2

    moves: list[tuple[Path, Path]] = []
    bad: list[str] = []
    for f in sorted(SRC.rglob("*.md")):
        if f.name == "index.md" or any(p.startswith(".") for p in f.relative_to(SRC).parts):
            continue
        stem = f.stem
        prefix = _prefix(stem)
        if not prefix:
            bad.append(f"{f.relative_to(SRC)}: cannot derive a prefix")
            continue
        target = SRC / prefix / f.name
        if f.resolve() != target.resolve():
            moves.append((f, target))

    if bad:
        for b in bad:
            sys.stderr.write(f"shard_src: {b}\n")
        return 2

    if not moves:
        n = sum(1 for f in SRC.rglob("*.md") if f.name != "index.md")
        print(f"reviewers.src is already sharded ({n} leaves, all under <prefix>/). Nothing to do.")
        return 0

    print(f"{'APPLYING' if apply else 'DRY-RUN'}: {len(moves)} leaf/leaves to shard:")
    for src_f, dst_f in moves:
        print(f"  {src_f.relative_to(SRC)}  ->  {dst_f.relative_to(SRC)}")
        if apply:
            dst_f.parent.mkdir(parents=True, exist_ok=True)
            r = subprocess.run(
                ["git", "-C", str(REPO), "mv", str(src_f), str(dst_f)],
                capture_output=True, text=True,
            )
            if r.returncode != 0:
                # Not tracked by git (or git unavailable): fall back to a plain move.
                src_f.replace(dst_f)

    if not apply:
        print("\nRe-run with --apply to perform the moves.")
    else:
        print(f"\nSharded {len(moves)} leaf/leaves. Rebuild the wiki and run scripts/check_wiki_drift.py.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
