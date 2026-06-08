#!/usr/bin/env python
"""Reconstruct the lost `reviewers.src/` authoring layer from the built
`reviewers.wiki/`.

The source layer was never committed and is gone; the wiki is the only copy of the
leaf content. The skill-llm-wiki build forwards authored frontmatter verbatim and
ADDS `depth_role` + `source` (and re-derives `parents` from clustering). So to
recover the source we: walk every leaf, DROP the build-generated `depth_role` +
`source`, PRESERVE everything authored (incl. `parents` — 9 leaves use multi-parent
soft-DAG links), and write a FLAT `reviewers.src/<id>.md` (the build re-clusters
into subcategories). Bodies are copied byte-for-byte.

Deterministic + idempotent. Verify with roundtrip_diff.py before trusting it.

Usage: python scripts/reconstruct_src.py [--apply]   (default: dry-run summary)
"""
from __future__ import annotations

import sys
from pathlib import Path

import frontmatter
import yaml

REPO = Path(__file__).resolve().parent.parent
WIKI = REPO / "reviewers.wiki"
SRC = REPO / "reviewers.src"

GENERATED = ("depth_role", "source")  # build-derived; never authored
# Canonical key order for stable diffs (v2 backfill fields are added later, in order).
KEY_ORDER = ["id", "type", "focus", "parents", "aliases", "covers",
             "dimensions", "audit_surface", "languages", "tags", "activation", "tools"]


def _ordered(meta: dict) -> dict:
    out: dict = {}
    for k in KEY_ORDER:
        if k in meta:
            out[k] = meta[k]
    for k in meta:  # any unexpected authored key, preserved at the end
        if k not in out and k not in GENERATED:
            out[k] = meta[k]
    return out


def _dump(meta: dict, body: str) -> str:
    fm = yaml.safe_dump(meta, sort_keys=False, allow_unicode=True, width=100, default_flow_style=False)
    return f"---\n{fm}---\n\n{body.lstrip(chr(10))}"


def main() -> int:
    apply = "--apply" in sys.argv
    leaves = [f for f in WIKI.rglob("*.md") if f.name != "index.md"]
    ids: dict[str, Path] = {}
    dups: list[str] = []
    for f in leaves:
        post = frontmatter.load(f)
        lid = post.metadata.get("id")
        if not isinstance(lid, str):
            print(f"SKIP (no id): {f}")
            continue
        if lid in ids:
            dups.append(lid)
        ids[lid] = f
    if dups:
        print(f"WARNING: duplicate ids: {dups}")

    if apply and SRC.exists():
        import shutil
        shutil.rmtree(SRC)
    SRC.mkdir(parents=True, exist_ok=True) if apply else None

    written = 0
    for lid, f in sorted(ids.items()):
        post = frontmatter.load(f)
        meta = _ordered(dict(post.metadata))
        text = _dump(meta, post.content)
        if apply:
            (SRC / f"{lid}.md").write_text(text, encoding="utf-8")
        written += 1
    print(f"{'WROTE' if apply else 'WOULD WRITE'} {written} leaves to reviewers.src/ "
          f"(flat). dropped generated fields: {GENERATED}.")
    if not apply:
        print("dry-run; re-run with --apply.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
