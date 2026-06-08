#!/usr/bin/env python
"""Deterministic v2-frontmatter backfill for reviewers.src/ leaves.

Adds the four v2 fields the corpus is missing, deterministically:
  - audit_surface[] : the body "## Audit Surface" bullets, verbatim.
  - languages[]     : lang-<x> -> [x]; else activation.file_globs extensions -> langs;
                      config/path-only or **/* globs -> ["all"].
  - tools[]         : a small curated allow-map (sparse; optional field, omitted when none).
  - dimensions[]    : a prefix -> dimensions BASELINE (>=1 from the closed set).
                      derive_dimensions_llm.py refines these afterward.

Edits leaves in place, preserving canonical key order. Idempotent (recomputes).
Usage: python scripts/derive_v2.py [--apply]   (default dry-run summary)
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

import frontmatter
import yaml

REPO = Path(__file__).resolve().parent.parent
SRC = REPO / "reviewers.src"
KEY_ORDER = ["id", "type", "focus", "parents", "aliases", "covers",
             "dimensions", "audit_surface", "languages", "tags", "activation", "tools"]
GENERATED = ("depth_role", "source")
DIM_SET = {"architecture", "correctness", "documentation", "performance", "readability", "security", "tests"}

# id-prefix -> baseline dimensions (>=1, all in the closed set). Refined by LLM pass.
PREFIX_DIMS: dict[str, list[str]] = {
    "lang": ["correctness"], "fw": ["correctness"], "sec": ["security"], "crypto": ["security"],
    "cookie": ["security"], "compliance": ["security", "documentation"], "pattern": ["architecture"],
    "antipattern": ["architecture", "readability"], "smell": ["readability"], "principle": ["architecture"],
    "arch": ["architecture"], "ddd": ["architecture"], "domain": ["correctness"], "footgun": ["correctness"],
    "conc": ["correctness"], "reliability": ["correctness", "architecture"], "db": ["correctness", "performance"],
    "orm": ["correctness", "performance"], "migration": ["correctness"], "data": ["architecture", "correctness"],
    "cloud": ["architecture", "security"], "iac": ["architecture", "security"], "k8s": ["architecture", "security"],
    "container": ["security"], "cicd": ["architecture"], "ci": ["architecture"], "build": ["architecture"],
    "pr": ["readability"], "fe": ["readability", "performance"], "a11y": ["readability"], "i18n": ["readability"],
    "xr": ["readability"], "browser": ["correctness"], "graphics": ["performance"], "game": ["performance"],
    "mob": ["correctness"], "os": ["correctness"], "embedded": ["correctness"], "wasm": ["performance"],
    "ai": ["correctness"], "test": ["tests"], "qa": ["tests"], "obs": ["architecture", "correctness"],
    "analytics": ["architecture"], "experimentation": ["architecture"], "incident": ["architecture"],
    "feature": ["architecture"], "perf": ["performance"], "api": ["architecture", "correctness"],
    "net": ["correctness", "security"], "email": ["correctness"], "notification": ["correctness"],
    "search": ["correctness", "performance"], "edge": ["performance"], "event": ["architecture", "correctness"],
    "doc": ["documentation"], "conventional": ["documentation"], "author": ["documentation"],
    "tool": ["architecture"], "modern": ["architecture"], "glue": ["correctness"], "cli": ["readability"],
    "licensing": ["documentation"], "export": ["correctness"], "jupyter": ["readability"], "binary": ["correctness"],
}

EXT_LANG = {
    ".py": "python", ".pyi": "python", ".ts": "typescript", ".tsx": "typescript", ".js": "javascript",
    ".jsx": "javascript", ".mjs": "javascript", ".cjs": "javascript", ".go": "go", ".rs": "rust",
    ".java": "java", ".kt": "kotlin", ".kts": "kotlin", ".rb": "ruby", ".swift": "swift", ".cs": "csharp",
    ".php": "php", ".cpp": "cpp", ".cc": "cpp", ".cxx": "cpp", ".h": "cpp", ".hpp": "cpp", ".c": "c",
    ".scala": "scala", ".sc": "scala", ".ex": "elixir", ".exs": "elixir", ".erl": "erlang", ".clj": "clojure",
    ".dart": "dart", ".lua": "lua", ".r": "r", ".m": "objective-c", ".sh": "shell", ".sql": "sql",
}
# curated, sparse tools allow-map by id prefix/exact
TOOLS_BY_PREFIX = {
    "lang-python": [{"name": "ruff", "purpose": "Python lint/style"}, {"name": "mypy", "purpose": "Python type check"}],
    "lang-typescript": [{"name": "tsc", "purpose": "TypeScript type check"}, {"name": "eslint", "purpose": "TS/JS lint"}],
    "lang-javascript": [{"name": "eslint", "purpose": "JS lint"}],
    "lang-go": [{"name": "go vet", "purpose": "Go static checks"}, {"name": "golangci-lint", "purpose": "Go linters"}],
    "lang-rust": [{"name": "clippy", "purpose": "Rust lints"}],
    "lang-ruby": [{"name": "rubocop", "purpose": "Ruby lint"}],
    "lang-php": [{"name": "phpstan", "purpose": "PHP static analysis"}],
}


def _prefix(lid: str) -> str:
    return lid.split("-", 1)[0]


def _audit_surface(body: str) -> list[str]:
    lines = body.splitlines()
    out: list[str] = []
    inside = False
    for ln in lines:
        if re.match(r"^##\s+Audit Surface\s*$", ln, re.I):
            inside = True
            continue
        if inside and re.match(r"^##\s+\S", ln):
            break
        if inside:
            m = re.match(r"^\s*[-*]\s+(?:\[[ xX]\]\s+)?(.+?)\s*$", ln)
            if m and m.group(1).strip():
                out.append(m.group(1).strip())
    return out


def _languages(lid: str, activation: dict) -> list[str] | str:
    if lid.startswith("lang-"):
        return [lid[len("lang-"):]]
    globs = (activation or {}).get("file_globs") or []
    langs: set[str] = set()
    broad = False
    for g in globs:
        if g.strip() in ("**/*", "*", "**"):
            broad = True
            continue
        # expand simple brace sets: **/*.{ts,tsx}
        m = re.search(r"\{([^}]*)\}", g)
        exts = []
        if m:
            for part in m.group(1).split(","):
                exts.append("." + part.strip().lstrip("."))
        else:
            mm = re.search(r"(\.[A-Za-z0-9]+)$", g)
            if mm:
                exts.append(mm.group(1))
        for e in exts:
            if e.lower() in EXT_LANG:
                langs.add(EXT_LANG[e.lower()])
    if langs:
        return sorted(langs)
    return "all" if (broad or not globs) else "all"


def _tools(lid: str) -> list[dict] | None:
    for k, v in TOOLS_BY_PREFIX.items():
        if lid == k or lid.startswith(k + "-"):
            return v
    return None


def _ordered(meta: dict) -> dict:
    out: dict = {}
    for k in KEY_ORDER:
        if k in meta:
            out[k] = meta[k]
    for k in meta:
        if k not in out and k not in GENERATED:
            out[k] = meta[k]
    return out


def _dump(meta: dict, body: str) -> str:
    fm = yaml.safe_dump(meta, sort_keys=False, allow_unicode=True, width=100, default_flow_style=False)
    return f"---\n{fm}---\n\n{body.lstrip(chr(10))}"


def main() -> int:
    apply = "--apply" in sys.argv
    stats = {"audit_surface_empty": [], "lang_all": 0, "tools_added": 0, "written": 0}
    for f in sorted(SRC.glob("*.md")):
        post = frontmatter.load(f)
        meta = dict(post.metadata)
        lid = meta["id"]
        meta["audit_surface"] = _audit_surface(post.content)
        if not meta["audit_surface"]:
            stats["audit_surface_empty"].append(lid)
        meta["languages"] = _languages(lid, meta.get("activation") or {})
        if meta["languages"] == "all":
            stats["lang_all"] += 1
        meta["dimensions"] = list(PREFIX_DIMS.get(_prefix(lid), ["correctness"]))
        t = _tools(lid)
        if t:
            meta["tools"] = t
            stats["tools_added"] += 1
        meta = _ordered(meta)
        if apply:
            f.write_text(_dump(meta, post.content), encoding="utf-8")
        stats["written"] += 1
    print(f"{'WROTE' if apply else 'DRY'} {stats['written']} leaves | "
          f"languages=all: {stats['lang_all']} | tools added: {stats['tools_added']} | "
          f"audit_surface EMPTY: {len(stats['audit_surface_empty'])} {stats['audit_surface_empty'][:8]}")
    if not apply:
        print("dry-run; re-run with --apply.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
