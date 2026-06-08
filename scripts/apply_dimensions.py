#!/usr/bin/env python
"""Fold the LLM-assist dimension classifications (tmp/dims/out_*.json) back into
reviewers.src/ leaves. Validates against the closed set; falls back to the existing
baseline for any leaf the pass missed or returned invalidly.

Usage: python scripts/apply_dimensions.py [--apply]
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import frontmatter
import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent))
import paths  # noqa: E402

REPO = paths.REPO
SRC = REPO / "reviewers.src"
DIMS = paths.TMP / "dims"
DIM_SET = {"architecture", "correctness", "documentation", "performance", "readability", "security", "tests"}
KEY_ORDER = ["id", "type", "focus", "parents", "aliases", "covers",
             "dimensions", "audit_surface", "languages", "tags", "activation", "tools"]
GENERATED = ("depth_role", "source")


def _ordered(meta: dict) -> dict:
    out = {k: meta[k] for k in KEY_ORDER if k in meta}
    for k in meta:
        if k not in out and k not in GENERATED:
            out[k] = meta[k]
    return out


def _clean(dims) -> list[str]:
    if not isinstance(dims, list):
        return []
    seen, out = set(), []
    for d in dims:
        d = str(d).strip().lower()
        if d in DIM_SET and d not in seen:
            seen.add(d)
            out.append(d)
    return out


def main() -> int:
    apply = "--apply" in sys.argv
    mapping: dict[str, list[str]] = {}
    for f in sorted(DIMS.glob("out_*.json")):
        for k, v in json.loads(f.read_text()).items():
            mapping[k] = _clean(v)
    print(f"loaded {len(mapping)} classified ids from {len(list(DIMS.glob('out_*.json')))} batches")

    fallback, changed, total = [], 0, 0
    for leaf in sorted(SRC.glob("*.md")):
        post = frontmatter.load(leaf)
        meta = dict(post.metadata)
        lid = meta["id"]
        total += 1
        new = mapping.get(lid)
        if not new:  # missing or empty/invalid -> keep baseline
            fallback.append(lid)
            continue
        if new != (meta.get("dimensions") or []):
            changed += 1
        meta["dimensions"] = new
        if apply:
            fm = yaml.safe_dump(_ordered(meta), sort_keys=False, allow_unicode=True,
                                width=100, default_flow_style=False)
            leaf.write_text(f"---\n{fm}---\n\n{post.content.lstrip(chr(10))}", encoding="utf-8")
    print(f"{'APPLIED' if apply else 'DRY'}: {total} leaves | changed-from-baseline: {changed} | "
          f"fallback-to-baseline (uncovered/invalid): {len(fallback)} {fallback[:8]}")
    if not apply:
        print("dry-run; re-run with --apply.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
