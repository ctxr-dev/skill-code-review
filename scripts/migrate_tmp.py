#!/usr/bin/env python
"""One-shot migration: flat/cluttered tmp/ -> run-id + pr-shard sharded layout.

  repos/<pr>            -> repos/<ab>/<pr>
  runs/<pr>/<variant>/  -> runs/<variant>/<ab>/<pr>/
  runs/<pr>/<loose file> -> runs/_legacy/<ab>/<pr>/<file>
  judge/[_input_](<variant>_)?<pr>.json -> judge/<variant or default>/<ab>/[_input_]<pr>.json

Idempotent-ish: skips moves whose target already exists. Reversible (tmp is
gitignored). Variant is inferred by stripping a known pr-id suffix (longest match).
"""
from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

import paths  # noqa: E402

TMP = paths.TMP
PR_IDS = sorted(json.loads((TMP / "bench-index.json").read_text()).keys(), key=len, reverse=True)


def _variant_pr(stem: str) -> tuple[str, str] | None:
    """'prod_sentry-67876' -> ('prod','sentry-67876'); 'sentry-67876' -> ('default',...)."""
    for pr in PR_IDS:  # longest first
        if stem == pr:
            return "default", pr
        if stem.endswith("_" + pr):
            return stem[: -(len(pr) + 1)], pr
    return None


def _mv(src: Path, dst: Path, log: list[str]) -> None:
    if not src.exists() or src.resolve() == dst.resolve():
        return
    if dst.exists():
        log.append(f"skip (exists): {dst.relative_to(TMP)}")
        return
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(src), str(dst))
    log.append(f"{src.relative_to(TMP)} -> {dst.relative_to(TMP)}")


def main() -> int:
    dry = "--apply" not in sys.argv
    log: list[str] = []

    # 1. repos/<pr> -> repos/<ab>/<pr>   (skip already-sharded 2-hex dirs)
    repos = TMP / "repos"
    if repos.is_dir():
        for d in sorted(repos.iterdir()):
            if d.is_dir() and not (len(d.name) == 2 and all(c in "0123456789abcdef" for c in d.name)):
                tgt = paths.repo_dir(d.name)
                log.append(f"[repo] {d.name} -> {tgt.relative_to(TMP)}") if dry else _mv(d, tgt, log)

    # 2. runs/<pr>/<variant|loose> -> runs/<variant>/<ab>/<pr>/  (skip already run-id dirs)
    runs = TMP / "runs"
    known_runids = set()  # after migration the first level is the run-id
    if runs.is_dir():
        for prdir in sorted(runs.iterdir()):
            if not prdir.is_dir() or prdir.name not in (set(PR_IDS)):
                continue  # already-migrated run-id dirs or stray files
            for child in sorted(prdir.iterdir()):
                if child.is_dir():
                    tgt = paths.run_dir(child.name, prdir.name)
                    known_runids.add(child.name)
                    log.append(f"[run] {prdir.name}/{child.name} -> {tgt.relative_to(TMP)}") if dry else _mv(child, tgt, log)
                else:  # loose file (prod.log, rerank-r1.out, ...)
                    tgt = paths.run_dir("_legacy", prdir.name) / child.name
                    log.append(f"[run-loose] {prdir.name}/{child.name} -> {tgt.relative_to(TMP)}") if dry else _mv(child, tgt, log)
            if not dry and prdir.exists() and not any(prdir.iterdir()):
                prdir.rmdir()

    # 3. judge/[_input_](variant_)?pr.json -> judge/<variant>/<ab>/[_input_]pr.json
    judge = TMP / "judge"
    if judge.is_dir():
        for f in sorted(judge.glob("*.json")):
            stem = f.stem
            is_input = stem.startswith("_input_")
            core = stem[len("_input_"):] if is_input else stem
            vp = _variant_pr(core)
            if not vp:
                log.append(f"[judge] UNPARSED {f.name}")
                continue
            variant, pr = vp
            tgt = paths.judge_input_path(variant, pr) if is_input else paths.judge_path(variant, pr)
            log.append(f"[judge] {f.name} -> {tgt.relative_to(TMP)}") if dry else _mv(f, tgt, log)

    print("\n".join(log) if log else "(nothing to migrate)")
    print(f"\n{'DRY-RUN' if dry else 'APPLIED'} — {len(log)} moves. "
          + ("re-run with --apply to execute." if dry else "done."))
    return 0


if __name__ == "__main__":
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    raise SystemExit(main())
