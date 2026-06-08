---
name: scr-scripts
version: 1.0.0
description: >
  Index + cookbooks for skill-code-review/scripts/ — the durable, tracked dev
  tooling for the reviewer corpus and the benchmark harness (NOT part of the
  code_review runtime package). Says, for every script, what it does, WHEN to reach
  for it, how to run it, and the exact SEQUENCE it belongs in. Read this before
  running or adding any script so you never run the wrong one or skip a step.
audience: ai-agents
when_to_use: >
  Use whenever you are about to run a script under scripts/, author a new one, or
  perform a corpus/benchmark workflow (reconstruct/backfill/validate the wiki,
  regenerate it, run or tune a benchmark iteration). Pairs with
  scr-reviewers-wiki-authoring (corpus) and scr-benchmark-optimizer (benchmark).
---

# scr-scripts

`skill-code-review/scripts/` holds the **durable, tracked** developer tooling.
Rules of the road:

- **`scripts/` = tooling; `tmp/` = data.** Scripts live here (committed); the
  benchmark DATA they read/write lives under gitignored `tmp/` (safe to delete).
  Never put a script in `tmp/`. These scripts are NOT part of the `code_review`
  runtime package and are not shipped to consumers.
- **Run from the repo root** via `uv run python scripts/<name>.py ...` so the venv
  (frontmatter, pyyaml, the `code_review` package for `rerank.py`) resolves.
- **Most mutating scripts default to a DRY RUN** and take `--apply` to write. Always
  dry-run first, read the summary, then `--apply`.
- **Keep this file current:** adding a script to `scripts/` without a row here (and
  a cookbook if it belongs to a sequence) is a stewardship violation — see the
  docs-and-wiki-stewardship rule.

## Two families

### A. Corpus authoring / maintenance (the `reviewers.wiki` layer)
Pairs with [`scr-reviewers-wiki-authoring`](../scr-reviewers-wiki-authoring/SKILL.md).
The corpus is two layers: hand-authored `reviewers.src/<id>.md` → generated
`reviewers.wiki/` (built by the sibling `../skill-llm-wiki`, pinned by
`reviewers.layout.yaml`).

| script | when / why | run |
|---|---|---|
| `reconstruct_src.py` | The `reviewers.src/` authoring layer is missing/lost and you must recover it from the built `reviewers.wiki/` (drops generated `depth_role`/`source`, preserves authored frontmatter incl. multi-parent `parents`, flattens to `reviewers.src/<id>.md`). | `uv run python scripts/reconstruct_src.py --apply` |
| `roundtrip_diff.py` | Prove a reconstruction/rebuild is LOSSLESS — same leaf-id set + byte-identical bodies + authored frontmatter — comparing `reviewers.src/` (or a rebuilt `<wiki>`) against `reviewers.wiki/`. | `uv run python scripts/roundtrip_diff.py [reviewers.src.wiki]` |
| `derive_v2.py` | Backfill the deterministic v2 frontmatter into `reviewers.src/`: `audit_surface` (from each body's `## Audit Surface`), `languages`, `tools`, and the `dimensions` prefix BASELINE. | `uv run python scripts/derive_v2.py --apply` |
| `make_dims_batches.py` | Stage the per-leaf inputs (`tmp/dims/batch_NN.json`) for the `dimensions` LLM-assist refinement. | `uv run python scripts/make_dims_batches.py` |
| `apply_dimensions.py` | Fold the LLM-assist results (`tmp/dims/out_*.json`, written by parallel classifier agents) back into `reviewers.src/` `dimensions`, validated against the closed set (fallback to baseline on miss). | `uv run python scripts/apply_dimensions.py --apply` |
| `fix_broad_globs.py` | Replace catch-all activation globs (`**/*`/`*`/`**`/`**/**`) with the precise all-code brace glob (matches code, not docs/json) so leaves stop over-activating. | `uv run python scripts/fix_broad_globs.py --apply` |
| `validate_layout.py` | THE shape gate: enforce `reviewers.layout.yaml` — 100% pin coverage + the v2 frontmatter contract on `reviewers.src/`, and (with `--wiki`) taxonomy/placement/depth/fanout on a built tree. `--report` = warn-only (exit 0). | `uv run python scripts/validate_layout.py [--wiki <dir>] [--report]` |

### B. Benchmark harness (measuring the product vs competitors)
Pairs with [`scr-benchmark-optimizer`](../scr-benchmark-optimizer/SKILL.md). Reviews
are driven by the PRODUCT (`python -m code_review.cli review`), never these scripts;
these only set up data and measure results. All paths come from `scripts/paths.py`
(run-id + pr-shard: `tmp/{repos/<ab>/<pr>, runs/<run-id>/<ab>/<pr>, judge/<run-id>/<ab>/<pr>.json}`).

| script | when / why | run |
|---|---|---|
| `paths.py` | The single source of the sharded tmp layout. NOT run directly — imported by every other harness script. Touch this to change the layout in one place. | (import only) |
| `setup_repo.py` | Materialize a benchmark PR's repo at the correct **merge-base** diff (`base_diff`) so `git diff BASE..HEAD` == the PR diff competitors reviewed. | `uv run python scripts/setup_repo.py <pr-id>` |
| `migrate_tmp.py` | One-shot migrate an old flat `tmp/` into the run-id + pr-shard layout (idempotent). | `uv run python scripts/migrate_tmp.py --apply` |
| `build_judge_input_prod.py` | Extract a review's candidates (skill-prod / -primary / -scoped) + the committed competitor sets into a judge input for one (pr, run-id). | `uv run python scripts/build_judge_input_prod.py <pr-id> <run-id>` |
| `score.py` | Aggregate per-(PR,tool) judge verdicts for a run-id into a leaderboard (`results/<run-id>/`). | `uv run python scripts/score.py <run-id>` |
| `rerank.py` | FAST ranker-only loop: re-run the product's `rank_findings` worker on an existing review's findings to test a `finding-ranker.md` change WITHOUT re-rolling specialists (~1 call/PR; average ≥3 — the ranker is stochastic). | `uv run python scripts/rerank.py <pr-id> <src-run-id> <out-run-id>` |

## Cookbooks (proper sequences)

**1. Regenerate `reviewers.wiki` deterministically from source** (the canonical build):
```
# reviewers.src/ present + reviewers.layout.yaml authored
uv run python scripts/validate_layout.py                 # src: 100% pins, 0 contract findings
node ../skill-llm-wiki/scripts/cli.mjs build "$(pwd)/reviewers.src" \
  --layout-config "$(pwd)/reviewers.layout.yaml" --quality-mode deterministic
node ../skill-llm-wiki/scripts/cli.mjs validate "$(pwd)/reviewers.src.wiki"   # 0 errors
uv run python scripts/validate_layout.py --wiki reviewers.src.wiki            # placement clean
mv reviewers.wiki /tmp/reviewers.wiki.bak && mv reviewers.src.wiki reviewers.wiki
# then the benchmark gate (cookbook 4) before committing
```

**2. Recover a lost `reviewers.src/`**:
```
uv run python scripts/reconstruct_src.py --apply
uv run python scripts/roundtrip_diff.py            # ROUND-TRIP OK ✓ before trusting it
```

**3. Backfill / refresh v2 frontmatter across all leaves**:
```
uv run python scripts/derive_v2.py --apply         # audit_surface/languages/tools/dimensions baseline
uv run python scripts/fix_broad_globs.py --apply   # sharpen catch-all globs
uv run python scripts/make_dims_batches.py         # -> tmp/dims/batch_NN.json
#   fan out parallel classifier agents: each reads a batch, writes tmp/dims/out_NN.json
uv run python scripts/apply_dimensions.py --apply  # fold results back
uv run python scripts/validate_layout.py           # 0 contract findings
```

**4. Run a benchmark iteration** (a `<run-id>` = one variant, e.g. `iter4`):
```
uv run python scripts/setup_repo.py <pr-id>        # once per PR (materialize repo)
export GITHUB_TOKEN="$(gh auth token)"; export CTXR_SCR_CALL_TIMEOUT=600
uv run python -m code_review.cli review --repo tmp/repos/<ab>/<pr> \
  --base <base_diff> --head <head> --run-dir tmp/runs/<run-id>/<ab>/<pr> \
  --backend claude --max-workers 8 --clean       # the PRODUCT does the review
uv run python scripts/build_judge_input_prod.py <pr-id> <run-id>
#   judge each (pr, run-id) with the Martian rule -> judge/<run-id>/<ab>/<pr>.json
uv run python scripts/score.py <run-id>            # leaderboard
```

**5. Fast ranker tuning** (no specialist re-roll):
```
# edit code_review/workers/finding-ranker.md
uv run python scripts/rerank.py <pr-id> <src-run-id> <new-run-id>   # per PR, ≥3 rounds
#   then build_judge_input_prod.py + judge + score.py for <new-run-id>
```

**6. Add or sharpen a reviewer leaf** — follow
[`scr-reviewers-wiki-authoring`](../scr-reviewers-wiki-authoring/SKILL.md): edit
`reviewers.src/<id>.md` → `validate_layout.py` → cookbook 1 (regenerate) → cookbook 4
(benchmark gate, frontier-or-better) → human-gated commit.

## Before any commit
`uv run ruff check code_review/ tests/` · `uv run mypy code_review/` · `uv run pytest`.
A corpus change also runs `validate_layout.py` + the skill-llm-wiki validate + the
benchmark gate (cookbook 4).
