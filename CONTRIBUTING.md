# Contributing to skill-code-review

## Setup

```bash
uv sync --all-extras
```

This installs the package in editable mode (sibling-linking
`../fsm/` per Principle 2) and the dev extras (pytest, ruff, mypy).
Pre-commit enforcement runs `uv run ruff check` and `uv run pytest`
on staged Python files.

## Before every commit

```bash
uv run ruff check ctxr_skill_code_review/ tests/
uv run mypy ctxr_skill_code_review/
uv run pytest
```

All three must pass.

## Development Workflow

### Adding a Reviewer (or language / framework)

The corpus lives in two layers: hand-authored sources at `reviewers.src/`, and the wiki-organised tree at `reviewers.wiki/` produced by [`skill-llm-wiki`](https://github.com/ctxr-dev/skill-llm-wiki). Authors only touch the source layer; the wiki layer is regenerated from sources.

1. Author `reviewers.src/<id>.md` with the v2 frontmatter:

   ```yaml
   id: <kebab-case>            # must match filename
   type: primary | overlay | universal
   focus: <one-line description>
   covers:                     # 3–15 granular bullets, used for similarity clustering
     - "..."
   dimensions:                 # ≥ 1 of: architecture, correctness, documentation, performance, readability, security, tests
     - "..."
   audit_surface:              # what this reviewer audits
     - "..."
   languages: [<list> | all]
   tags: [<topical tags>]
   activation:                 # routing signals
     file_globs: ["**/*.py"]
     keyword_matches: [...]
     structural_signals: [...]
     escalation_from: [<reviewer-ids>]
   tools:                      # optional external linters / SAST / etc.
     - {name: ..., command: ..., purpose: ...}
   ```

2. Run the source validators:

   ```bash
   npm run validate:src        # frontmatter + body shape + dimensions taxonomy
   npm run test:src            # unit tests covering the parser/validators
   ```

3. Rebuild the wiki via `skill-llm-wiki` (sibling project):

   ```bash
   node /path/to/skill-llm-wiki/scripts/cli.mjs build /path/to/skill-code-review/reviewers.src \
     --quality-mode deterministic --fanout-target 6 --max-depth 5 --soft-dag-parents --accept-dirty
   ```

4. Validate the rebuilt wiki:

   ```bash
   node /path/to/skill-llm-wiki/scripts/cli.mjs validate /path/to/skill-code-review/reviewers.src.wiki
   ```

5. Move the produced `reviewers.src.wiki/` over the existing `reviewers.wiki/`, commit both `reviewers.src/` source change and the rebuilt `reviewers.wiki/`.

The wiki layer handles clustering, slug generation, soft-DAG parents, balance enforcement, and root containment — no manual placement under a subcategory is needed.

### Updating Phase C framework detection

Adding a framework that the orchestrator doesn't yet recognise from manifests requires updating the Phase C table in [`docs/code-reviewer-design.md`](docs/code-reviewer-design.md). The table maps dependency names to semantic categories so the Project Profile carries the right signal into Step 3 (Tree Descent).

### FSM authoring

The orchestrator's flow is defined as a Pydantic `FsmSpec` literal at
[`ctxr_skill_code_review/spec.py`](ctxr_skill_code_review/spec.py).
The engine that consumes this spec lives in the standalone
[`ctxr-fsm`](https://github.com/ctxr-dev/fsm) Python package,
referenced from `pyproject.toml::dependencies` as
`ctxr-fsm[sqlite] >= 0.1.0a1`. The `[tool.uv.sources]` block
sibling-links `../fsm/` in editable mode during dev (Principle 2).

The FSM design substrate, MCP tool reference, predicate-DSL grammar,
worker contract, and storage-layout reference all live in the FSM
package's `docs/` directory at <https://github.com/ctxr-dev/fsm>.

**For local engine hacking** against the sibling checkout at
`../fsm`, edits are picked up automatically — the editable install
follows the source. To swap to a different ctxr-fsm version, update
the sources block in `pyproject.toml` (e.g. drop the
`[tool.uv.sources]` block entirely to pin to a PyPI release).

**To add a new state:**

1. Add a `State(...)` factory in `spec.py` mirroring the existing
   patterns; remember to declare `id` (snake_case), `worker=` /
   `loop=` / `inline=` (mutually exclusive), `outputs[]`,
   `post_validations` (predicate DSL expressions), and `transitions[]`.
2. Append the new state to `build_spec()`'s `states=[…]` list in the
   correct position (entry state is the first list element only by
   convention; `entry=` controls the actual entry id).
3. If the state is `inline=…`, add the handler callable to
   `ctxr_skill_code_review/handlers.py` and register it in
   `INLINE_HANDLERS`. If it is a worker, drop a new prompt template
   under `ctxr_skill_code_review/workers/<role>.md`.
4. Run `uv run pytest tests/test_spec.py` — the spec module's
   structural tests catch missing handler registrations, malformed
   transitions, and shape regressions.

**Closed vocabularies → StrEnums (W14i discipline).** Any new field
whose values form a closed vocabulary (verdict, status, severity, …)
declares a `StrEnum` in `spec.py` and references members by name
rather than literal strings. The W14i sweep enforces this across the
whole tree.

### Validation

```bash
uv run pytest tests/                          # spec + handler + install + e2e tests
uv run ruff check ctxr_skill_code_review/ tests/
uv run mypy ctxr_skill_code_review/
```

These three pass before any commit. Source-corpus validation for
hand-authored `reviewers.src/` leaves runs through `skill-llm-wiki`
(sibling project) — see the "Adding a Reviewer" section above for
the rebuild + validate flow.

## File Structure

```
SKILL.md                              LLM entry point — bootstrap + run loop
code-reviewer.md                      Runtime-contract stub (redirect to SKILL.md + design doc)
release-readiness.md                  8-gate predicate reference (consumed by handlers, not LLMs)
report-format.md                      Report contract (consumed by handlers, not LLMs)
docs/code-reviewer-design.md          Eleven-step orchestrator design rationale (humans only)
ctxr_skill_code_review/
  spec.py                             Pydantic FsmSpec literal (state machine + schemas)
  handlers.py                         9 deterministic inline handlers + report renderer
  install.py                          Idempotent register() one-shot + CLI entry
  workers/*.md                        Per-state worker prompts (LLM-readable, self-contained)
tests/                                pytest suite
reviewers.src/                        Source corpus (gitignored)
reviewers.wiki/                       Wiki-organised corpus — source of truth in repo
  index.md                            Root index — entries[] of subcategories
  <subcat>/index.md                   Subcategory index — entries[] of leaves
  <subcat>/<leaf>.md                  Specialist reviewer
pyproject.toml                        Package metadata, dev sources, tool config
```

## Conventions

- **Reviewer files** must have an H1 title as the first heading
- **Reviewer IDs** use kebab-case matching the filename (e.g., `sec-owasp-a01-broken-access-control` → `sec-owasp-a01-broken-access-control.md`)
- Tier caps governing per-type body length budgets are enforced by `skill-llm-wiki`'s build pass — soft-warn on overrun, never hard-block
- Use consistent severity levels: Critical, Important, Minor

## Releasing

Releases are PR-gated and manual per Principle 2 (no auto-publish to
PyPI). The pre-v3 npm release workflow under `.github/workflows/` is
preserved for v2.x point releases (which still ship from npm); v3+
releases ship as Python wheels via a separate
`workflow_dispatch`-only publish.

For v3.x the procedure is:

1. Bump `pyproject.toml` `[project].version` on a `release/v<version>`
   branch and open a PR.
2. Review + merge the PR.
3. A maintainer runs the manual PyPI publish workflow against the
   merge commit. The workflow runs `uv sync`, `uv run pytest`,
   `uv run ruff check`, `uv run mypy`, then `uv build` +
   `uv publish` with a PyPI trusted publisher.

No auto-publish on tag push; the human gate is the trigger.
