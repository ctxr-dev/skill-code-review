#!/usr/bin/env python
"""Validate reviewers.src/ or a built reviewers.wiki/ against reviewers.layout.yaml.

Standalone (not part of the code_review package): the wiki SHAPE contract enforcer.
Codes (mirror the eventual skill-llm-wiki build-driver):
  LAYOUT-UNPINNED   a leaf id matches no pin (and policy.unpinned == reject)
  LAYOUT-CONTRACT   frontmatter contract violation (required/enum/nonempty/forbid)
  LAYOUT-TAXONOMY   built wiki has a top-level dir not in the taxonomy (wiki mode)
  LAYOUT-PIN        a leaf sits in a dir != its pinned category (wiki mode)
  LAYOUT-DEPTH      a leaf deeper than policy.max_depth (wiki mode)
  LAYOUT-FANOUT     a node exceeds policy.fanout_hard_max (wiki mode)

Usage:
  python scripts/validate_layout.py                 # validate reviewers.src/ (pins + contract)
  python scripts/validate_layout.py --wiki <dir>    # also taxonomy/placement/depth/fanout
  python scripts/validate_layout.py --report        # warn-only, exit 0 (pre-backfill mode)
"""
from __future__ import annotations

import fnmatch
import sys
from dataclasses import dataclass
from pathlib import Path

import frontmatter
import yaml

REPO = Path(__file__).resolve().parent.parent
LAYOUT = REPO / "reviewers.layout.yaml"


@dataclass
class Finding:
    severity: str  # "error" | "warn"
    code: str
    target: str
    message: str


def _load_layout() -> dict:
    return yaml.safe_load(LAYOUT.read_text())


def category_for(leaf_id: str, taxonomy: list[dict]) -> str | None:
    for cat in taxonomy:
        for rule in cat.get("pin", []):
            if "id" in rule and leaf_id == rule["id"]:
                return cat["id"]
            if "id_prefix" in rule and leaf_id.startswith(rule["id_prefix"]):
                return cat["id"]
            if "id_glob" in rule and fnmatch.fnmatch(leaf_id, rule["id_glob"]):
                return cat["id"]
    return None


def _is_internal(path: Path, root: Path) -> bool:
    """True when any path segment below `root` is a dot-directory.

    Skill-llm-wiki keeps its internals in dot-folders (`.llmwiki/` private
    git, `.work/`, `.shape/`, `.layout/`); every content walker in that
    tool skips `.`-prefixed entries. A built sibling wiki carries those
    folders on disk, so the validator must skip them too — they are never
    wiki content and their fanout/leaf counts are an implementation detail.
    """
    try:
        rel = path.relative_to(root)
    except ValueError:
        return False
    return any(part.startswith(".") for part in rel.parts)


def _leaf_files(root: Path) -> list[Path]:
    return [
        f
        for f in root.rglob("*.md")
        if f.name != "index.md" and not _is_internal(f, root)
    ]


def _get(d: dict, dotted: str):
    cur = d
    for k in dotted.split("."):
        if not isinstance(cur, dict) or k not in cur:
            return None
        cur = cur[k]
    return cur


def _check_contract(lid: str, meta: dict, contract: dict) -> list[Finding]:
    out: list[Finding] = []
    spec = contract.get("leaf", {})
    for field in spec.get("required", []):
        if field not in meta:
            out.append(Finding("error", "LAYOUT-CONTRACT", lid, f"missing required field '{field}'"))
    enums = spec.get("enums", {})
    if "type" in meta and meta["type"] not in enums.get("type", [meta.get("type")]):
        out.append(Finding("error", "LAYOUT-CONTRACT", lid, f"type '{meta['type']}' not in {enums['type']}"))
    dim_enum = set(enums.get("dimensions", []))
    dims = meta.get("dimensions")
    if dims is not None and dim_enum:
        bad = [d for d in (dims if isinstance(dims, list) else [dims]) if d not in dim_enum]
        if bad:
            out.append(Finding("error", "LAYOUT-CONTRACT", lid, f"dimensions not in closed set: {bad}"))
    for field in spec.get("require_nonempty", []):
        v = meta.get(field)
        if field in meta and (v is None or (hasattr(v, "__len__") and len(v) == 0)):
            out.append(Finding("error", "LAYOUT-CONTRACT", lid, f"'{field}' present but empty"))
    # runtime-shape rules (mirror code_review.handlers._validate_v2_field)
    langs = meta.get("languages")
    if langs is not None and not (langs == "all" or (isinstance(langs, list) and langs and all(isinstance(x, str) for x in langs))):
        out.append(Finding("error", "LAYOUT-CONTRACT", lid, "languages must be 'all' or a non-empty string list"))
    tools = meta.get("tools")
    if tools is not None:
        ok = isinstance(tools, list) and all(
            isinstance(t, dict) and isinstance(t.get("name"), str) and t.get("name")
            and isinstance(t.get("purpose"), str) and t.get("purpose")
            and (t.get("command") is None or isinstance(t.get("command"), str)) for t in tools)
        if not ok:
            out.append(Finding("error", "LAYOUT-CONTRACT", lid, "tools must be [{name,purpose,command?}]"))
    for dotted, forbidden in (spec.get("forbid", {}) or {}).items():
        v = _get(meta, dotted)
        if isinstance(v, list):
            hit = [x for x in v if x in forbidden]
            if hit:
                out.append(Finding("error", "LAYOUT-CONTRACT", lid, f"{dotted} contains forbidden {hit}"))
    return out


def main() -> int:
    report = "--report" in sys.argv
    wiki_idx = sys.argv.index("--wiki") if "--wiki" in sys.argv else -1
    wiki = Path(sys.argv[wiki_idx + 1]) if wiki_idx >= 0 else None
    target = wiki if wiki else (REPO / "reviewers.src")

    layout = _load_layout()
    taxonomy = layout["taxonomy"]
    policy = layout.get("policy", {})
    contract = layout.get("frontmatter_contract", {})
    cat_ids = {c["id"] for c in taxonomy}
    findings: list[Finding] = []

    for f in _leaf_files(target):
        post = frontmatter.load(f)
        meta = dict(post.metadata)
        lid = str(meta.get("id") or f.stem)
        cat = category_for(lid, taxonomy)
        if cat is None and policy.get("unpinned") == "reject":
            findings.append(Finding("error", "LAYOUT-UNPINNED", lid, "matches no pin in taxonomy"))
        findings.extend(_check_contract(lid, meta, contract))
        if wiki is not None:  # placement checks only meaningful on a built tree
            rel = f.relative_to(wiki)
            depth = len(rel.parts) - 1  # dirs above the file
            if depth > policy.get("max_depth", 99):
                findings.append(Finding("error", "LAYOUT-DEPTH", lid, f"depth {depth} > max_depth"))
            top = rel.parts[0] if len(rel.parts) > 1 else "(root)"
            if cat and top != cat:
                findings.append(Finding("error", "LAYOUT-PIN", lid, f"in '{top}', pinned to '{cat}'"))
            if top not in cat_ids and top != "(root)":
                findings.append(Finding("error", "LAYOUT-TAXONOMY", top, "top-level dir not in taxonomy"))

    if wiki is not None:  # fanout per directory
        dirs = [wiki, *[p for p in wiki.rglob("*") if p.is_dir() and not _is_internal(p, wiki)]]
        for d in dirs:
            # Count content children only — skip index.md and skill-internal
            # dot-folders (the private git, work/shape/layout dirs).
            n = len([c for c in d.iterdir()
                     if c.name != "index.md" and not c.name.startswith(".")])
            if n > policy.get("fanout_hard_max", 999):
                findings.append(Finding("error", "LAYOUT-FANOUT", str(d.relative_to(wiki) or "."),
                                        f"{n} children > fanout_hard_max"))

    errors = [x for x in findings if x.severity == "error"]
    by_code: dict[str, int] = {}
    for x in findings:
        by_code[x.code] = by_code.get(x.code, 0) + 1
    print(f"target: {target}  | leaves: {len(_leaf_files(target))}")
    print("findings by code:", by_code or "{} (clean)")
    for x in errors[:25]:
        print(f"  [{x.code}] {x.target}: {x.message}")
    if len(errors) > 25:
        print(f"  ... +{len(errors) - 25} more")
    unpinned = by_code.get("LAYOUT-UNPINNED", 0)
    print(f"\nPIN COVERAGE: {'100% (0 unpinned) ✓' if unpinned == 0 else f'{unpinned} UNPINNED ✗'}")
    if report:
        print("(--report mode: exit 0 regardless)")
        return 0
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
