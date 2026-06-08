#!/usr/bin/env python
"""Generate batched inputs for the dimensions LLM-assist pass.

Writes tmp/dims/batch_NN.json — each a list of {id, focus, tags, audit_surface,
baseline} for ~60 leaves. Parallel agents read a batch, classify dimensions
(closed set, >=1, may refine the baseline), and write tmp/dims/out_NN.json as
{id: [dims]}. apply_dimensions.py folds the results back into reviewers.src.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import frontmatter

sys.path.insert(0, str(Path(__file__).resolve().parent))
import paths  # noqa: E402

REPO = paths.REPO
SRC = REPO / "reviewers.src"
OUT = paths.TMP / "dims"
BATCH = 60


def main() -> int:
    leaves = []
    for f in sorted(SRC.glob("*.md")):
        m = frontmatter.load(f).metadata
        leaves.append({
            "id": m["id"],
            "focus": m.get("focus", ""),
            "tags": (m.get("tags") or [])[:8],
            "audit_surface": (m.get("audit_surface") or [])[:4],
            "baseline": m.get("dimensions") or [],
        })
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob("batch_*.json"):
        old.unlink()
    n = 0
    for i in range(0, len(leaves), BATCH):
        (OUT / f"batch_{n:02d}.json").write_text(json.dumps(leaves[i:i + BATCH], indent=1))
        n += 1
    print(f"wrote {n} batches ({len(leaves)} leaves, {BATCH}/batch) to {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
