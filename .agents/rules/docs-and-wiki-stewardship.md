# Docs & Reviewer-Corpus Stewardship

> **SCOPE:** Applies when DEVELOPING skill-code-review itself — writing its docs,
> evolving its reviewer corpus, or running its benchmark loop. If this skill is
> installed inside another project, ignore this rule there.

These are non-negotiable so the skill's docs and corpus get sharper over sessions,
never staler or noisier.

## README discipline

`README.md` exists to explain, concisely, **why** the reviewer works, **how** it
works, and **how it compares** to other reviewers. Specifically:

- Lead with the problem it solves (the coverage-vs-noise compromise) and the
  approach (wiki-routed specialists → parallel 100% coverage → deterministic
  collection → neutral ranker → verdict).
- Include a **benchmark comparison table** vs competing reviewers (recall /
  precision / F1 on the open Greptile/Martian set), and say plainly what it means
  (strict golden-match metric; where this skill stands; honest caveats).
- **Cut the noise.** No directory trees / ASCII file maps, no badge rows, no
  step-by-step dev setup or lint/test minutiae, no version-migration footnotes.
  Those live in `CONTRIBUTING.md` / `CHANGELOG.md` / `SKILL.md`. Link, don't inline.
- One screen of signal beats three of boilerplate. Every line earns its place.

## Keep the skills current with findings

The `.agents/skills/` files are the project's institutional memory. When a
benchmark run, optimization, or fix changes how the skill works or how it compares:

- Update `scr-benchmark-optimizer` (numbers, levers, lessons) in the SAME change —
  do not let it describe a runtime that no longer exists (e.g. an old harness).
- Update `scr-reviewers-wiki-authoring` when the corpus contract, build flow, or an
  authoring lesson changes.
- A `.claude/skills/<name>/SKILL.md` (and other client stubs) is a thin redirect to
  the canonical `.agents/skills/<name>/SKILL.md`; keep the stub's description in
  sync but never fork content into it.

## Reviewer-corpus stewardship (never degrade)

- Extend `reviewers.wiki` ONLY via the [`scr-reviewers-wiki-authoring`](../skills/scr-reviewers-wiki-authoring/SKILL.md)
  skill: author in `reviewers.src/`, regenerate with `skill-llm-wiki`
  (deterministic), validate, promote, commit both layers. **Never hand-edit the
  generated `reviewers.wiki/` or hand-place a leaf.**
- Activation globs are SPECIFIC, never `**/*`; `focus` is one sharp line; bodies
  carry concrete bug-hunting heuristics + explicit "Common False Positives".
- Every corpus change is **benchmark-verified** (frontier-or-better; record the
  versioned result) before it is kept. A change to the SET or STRUCTURE of reviewers
  is **human-gated** — written, statistically-justified proposal + explicit
  confirmation.
- Encode GENERAL review principles, not per-benchmark-golden rules (over-fitting).

## Benchmark harness location & layout

- The harness lives at `skill-code-review/tmp/` (gitignored) — it travels with the
  skill, not in the parent repo.
- Every output directory is **nested/sharded** (the product's
  `.skill-code-review/<yyyy>/<mm>/<dd>/<ab>/<rest5>/` tree + content-addressed
  `specialists/<ab>/<rest5>/`). Never let a single directory accumulate thousands of
  entries (filesystem bottleneck). New large-fan-out outputs adopt the same sharding.
- Drive reviews ONLY through the product (`cli.py` / `runner.py`); `tmp/` holds
  benchmark DATA + MEASUREMENT scripts only — never a parallel review orchestrator.

## Before any commit

`uv run ruff check ctxr_skill_code_review/ tests/` · `uv run mypy
ctxr_skill_code_review/` · `uv run pytest` — all green. Corpus changes additionally
require the `skill-llm-wiki` validate pass and the benchmark check above.
