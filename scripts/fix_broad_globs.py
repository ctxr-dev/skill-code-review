#!/usr/bin/env python
"""Replace catch-all activation globs (`**/*`, `*`, `**`) with a precise all-code
brace glob in reviewers.src/ leaves.

The cross-cutting leaves (principles/smells/antipatterns/qa/test-discipline) are
universal-on-CODE, but their `structural_signals` are prose ("Any code diff") that
don't functionally match a project profile — so `**/*` was their only working
trigger. Dropping it would break activation; instead we express "all code files"
precisely with the brace glob the gate's _compile_glob supports (matches code, not
docs/json/Dockerfile). Other specific globs and keyword/structural signals are kept.

Usage: python scripts/fix_broad_globs.py [--apply]
"""
from __future__ import annotations

import sys
from pathlib import Path

import frontmatter
import yaml

REPO = Path(__file__).resolve().parent.parent
SRC = REPO / "reviewers.src"
BROAD = {"**/*", "*", "**", "**/**"}
CODE_GLOB = ("**/*.{py,pyi,ts,tsx,js,jsx,mjs,cjs,go,rs,java,kt,rb,swift,cs,php,"
             "cpp,cc,c,h,hpp,scala,ex,exs,erl,clj,dart,lua,r,m,sh,sql}")
KEY_ORDER = ["id", "type", "focus", "parents", "aliases", "covers",
             "dimensions", "audit_surface", "languages", "tags", "activation", "tools"]
GENERATED = ("depth_role", "source")


def _ordered(meta: dict) -> dict:
    out = {k: meta[k] for k in KEY_ORDER if k in meta}
    for k in meta:
        if k not in out and k not in GENERATED:
            out[k] = meta[k]
    return out


def main() -> int:
    apply = "--apply" in sys.argv
    fixed = []
    for f in sorted(SRC.glob("*.md")):
        post = frontmatter.load(f)
        meta = dict(post.metadata)
        act = meta.get("activation") or {}
        fg = act.get("file_globs") or []
        if not any(g.strip() in BROAD for g in fg):
            continue
        kept = [g for g in fg if g.strip() not in BROAD]
        if CODE_GLOB not in kept:
            kept.append(CODE_GLOB)
        act["file_globs"] = kept
        meta["activation"] = act
        fixed.append(meta["id"])
        if apply:
            fm = yaml.safe_dump(_ordered(meta), sort_keys=False, allow_unicode=True,
                                width=100, default_flow_style=False)
            f.write_text(f"---\n{fm}---\n\n{post.content.lstrip(chr(10))}", encoding="utf-8")
    print(f"{'FIXED' if apply else 'WOULD FIX'} {len(fixed)} leaves: {fixed[:10]}{'...' if len(fixed) > 10 else ''}")
    if not apply:
        print("dry-run; re-run with --apply.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
