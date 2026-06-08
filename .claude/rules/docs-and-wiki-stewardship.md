# Docs & Reviewer-Corpus Stewardship (Claude client reference)

> **SCOPE:** Applies when DEVELOPING skill-code-review itself. If this skill is
> installed inside another project, ignore this rule there.

**Canonical rule:** [`../../.agents/rules/docs-and-wiki-stewardship.md`](../../.agents/rules/docs-and-wiki-stewardship.md)

This `.claude/rules/` copy exists so the Claude client discovers the rule. Read and
follow the canonical file above — it is the single source of truth. In brief:

- **README** explains why/how the reviewer works + a benchmark comparison table;
  cut noise (no directory trees, badges, dev minutiae, migration footnotes — link
  to CONTRIBUTING/CHANGELOG/SKILL instead).
- **Keep the `.agents/skills/` current** with every benchmark/optimization finding;
  never let `scr-benchmark-optimizer` describe a dead runtime.
- **Extend `reviewers.wiki` only via `scr-reviewers-wiki-authoring`** (author in
  `reviewers.src/`, regenerate via skill-llm-wiki, validate, promote, commit both).
  Never hand-edit the generated wiki. Specific activation globs (never `**/*`).
  Benchmark-verify every corpus change; SET/STRUCTURE changes are human-gated.
- **Harness** lives at `skill-code-review/tmp/` (gitignored DATA only), nested/sharded
  layout to avoid an fs bottleneck; drive reviews only through the product.
- **Scripts**: durable dev tooling lives in tracked `scripts/` (never `tmp/`, never the
  `code_review` package); every script is documented in the
  [`scr-scripts`](../skills/scr-scripts/SKILL.md) cookbook — consult it before running
  one, and add a row when you add a script. Mutating scripts dry-run unless `--apply`.
- Before any commit: `ruff` + `mypy` + `pytest` green.
