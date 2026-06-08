#!/usr/bin/env python
"""Verify reconstruct_src.py is lossless: the leaf SET and BODIES recovered into
reviewers.src/ must match the current reviewers.wiki/.

We compare CONTENT, not directory placement (the build re-clusters, so subcategory
paths legitimately differ; the runtime enumerates all dirs, so placement is
cosmetic). Checks:
  (a) same set of leaf ids,
  (b) byte-identical bodies (post-frontmatter content),
  (c) authored frontmatter equal (ignoring build-generated depth_role/source and
      the re-derived parents).

Usage: python scripts/roundtrip_diff.py [<other_wiki_dir>]
  default compares reviewers.src/ (flat) against reviewers.wiki/.
  pass a rebuilt wiki dir (e.g. reviewers.src.wiki) to compare a fresh build.
"""
from __future__ import annotations

import sys
from pathlib import Path

import frontmatter

REPO = Path(__file__).resolve().parent.parent
WIKI = REPO / "reviewers.wiki"
OTHER = Path(sys.argv[1]) if len(sys.argv) > 1 else (REPO / "reviewers.src")
IGNORE = {"depth_role", "source", "parents"}


def _leaves(root: Path) -> dict[str, frontmatter.Post]:
    out: dict[str, frontmatter.Post] = {}
    for f in root.rglob("*.md"):
        if f.name == "index.md":
            continue
        p = frontmatter.load(f)
        lid = p.metadata.get("id")
        if isinstance(lid, str):
            out[lid] = p
    return out


def main() -> int:
    a, b = _leaves(WIKI), _leaves(OTHER)
    ok = True
    only_a, only_b = set(a) - set(b), set(b) - set(a)
    if only_a or only_b:
        ok = False
        print(f"LEAF SET MISMATCH: only in wiki={sorted(only_a)[:10]} only in other={sorted(only_b)[:10]}")
    print(f"leaves: wiki={len(a)} other={len(b)} common={len(set(a) & set(b))}")
    body_mismatch, fm_mismatch = [], []
    for lid in sorted(set(a) & set(b)):
        if a[lid].content.strip() != b[lid].content.strip():
            body_mismatch.append(lid)
        fa = {k: v for k, v in a[lid].metadata.items() if k not in IGNORE}
        fb = {k: v for k, v in b[lid].metadata.items() if k not in IGNORE}
        if fa != fb:
            fm_mismatch.append(lid)
    if body_mismatch:
        ok = False
        print(f"BODY MISMATCH ({len(body_mismatch)}): {body_mismatch[:10]}")
    if fm_mismatch:
        ok = False
        print(f"FRONTMATTER MISMATCH ({len(fm_mismatch)}): {fm_mismatch[:10]}")
        for lid in fm_mismatch[:3]:
            fa = {k: v for k, v in a[lid].metadata.items() if k not in IGNORE}
            fb = {k: v for k, v in b[lid].metadata.items() if k not in IGNORE}
            print(f"  {lid}: wiki-keys={sorted(fa)} other-keys={sorted(fb)}")
    print("ROUND-TRIP OK ✓" if ok else "ROUND-TRIP FAILED ✗")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
