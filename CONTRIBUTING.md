# Contributing to skill-code-review

## Setup

```bash
npm install
```

This installs dev dependencies and sets up the pre-commit hook via Husky.

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

Adding a framework that the orchestrator doesn't yet recognise from manifests requires updating the Phase C table in [`code-reviewer.md`](code-reviewer.md). The table maps dependency names to semantic categories so the Project Profile carries the right signal into Step 3 (Tree Descent).

### FSM authoring (Sprint A foundation)

The orchestrator's flow is also defined as a finite-state-machine YAML at [`fsm/code-reviewer.fsm.yaml`](fsm/code-reviewer.fsm.yaml). The FSM is the substrate for the deterministic-orchestration design described in [`docs/fsm-orchestration-proposal.md`](docs/fsm-orchestration-proposal.md).

When you change the orchestrator's flow, both files must stay in sync until Sprint D collapses the duplication via a generator.

**To add a new state:**

1. Append a new entry to `fsm/code-reviewer.fsm.yaml` `fsm.states[]`. Required fields: `id` (snake_case), `purpose`, `preconditions[]`, `outputs[]`, `transitions[]`.
2. If the state dispatches a worker, declare a `worker:` block with `role`, `prompt_template` (path to the worker template under `fsm/workers/`), `inputs[]` (must reference outputs of upstream states, or `args` for the entry state), and `response_schema` (a valid JSON Schema). Inline states (no LLM call required) omit the `worker:` block.
3. Author the worker prompt template at `fsm/workers/<role>.md`. Pattern: front-matter-free Markdown describing the worker's role, inputs, task, output JSON shape (matching the `response_schema`), constraints, and validation-rejection criteria.
4. Run `npm run validate:fsm` — the static validator catches missing prompt templates, undefined transition targets, unreachable states, missing terminal states, malformed `response_schema`, and input/output flow gaps.
5. Run `npm run test:src` — keep the 128 unit tests green. Add tests under `tests/unit/fsm-*.test.js` for any new helper logic.

**Validators wired into `npm run validate:src`:**

- `validate:body-shape` — enforces the H2 contract on every reviewer in `reviewers.src/`.
- `validate:dimensions` — enforces the 7-axis dimensions taxonomy.
- `validate:fsm` — runs `fsm-validate-static.mjs` over `fsm/code-reviewer.fsm.yaml`.

The FSM YAML validates clean before any commit.

### Validation

```bash
npm run validate:src   # source-corpus validators (parse + body + dimensions)
npm run test:src       # validator unit tests
npm run lint           # markdown lint
npm run lint:fix       # auto-fix markdown issues
```

The pre-commit hook runs `validate:src + lint`.

#### What the Source Validators Check

- **Schema** — every required frontmatter field present, valid types, valid enum values
- **Body shape** — H1 title, required H2 sections per type, tier-cap line counts (soft-warn on overruns)
- **Dimensions taxonomy** — every reviewer declares ≥ 1 dimension from the 7-axis closed vocabulary

## File Structure

```
SKILL.md                  Skill metadata (frontmatter + architecture overview)
code-reviewer.md          Orchestrator (scans, descends the wiki, dispatches)
release-readiness.md      8-gate scorecard (dimension-predicate binding)
report-format.md          Canonical report format + JSON schema + argument spec
reviewers.src/            Source corpus (gitignored)
reviewers.wiki/           Wiki-organised corpus — source of truth in repo
  index.md                Root index — entries[] of subcategories
  <subcat>/index.md       Subcategory index — entries[] of leaves
  <subcat>/<leaf>.md      Specialist reviewer
```

## Conventions

- **Reviewer files** must have an H1 title as the first heading
- **Reviewer IDs** use kebab-case matching the filename (e.g., `sec-owasp-a01-broken-access-control` → `sec-owasp-a01-broken-access-control.md`)
- Tier caps from `scripts/lib/reviewer-schema.mjs` give per-type body length budgets — soft-warn on overrun, never hard-block
- Use consistent severity levels: Critical, Important, Minor

## Releasing

Releases are PR-gated; the bot does not push to `main` directly. One dispatch + one PR merge ships the package.

1. Actions → Release → Run workflow. Branch selector: `main` (any other ref is rejected). Version bump: `patch` / `minor` / `major`.
2. The workflow bumps `package.json` on a `release/v<version>` branch and opens a release PR.
3. Review + merge the PR.
4. `tag-on-main.yml` detects the version change on the merge commit, creates the annotated `v<version>` tag, and pushes it.
5. The tag push triggers `publish.yml`, which runs `index:build + validate + lint + test`, verifies tag/version agreement, and runs `npm publish --access public --provenance`.

Full operator walkthrough (including troubleshooting for stale/orphan tags, non-main dispatches, and the "Allow GitHub Actions to create and approve pull requests" org-level policy) lives in the [Releasing section of the README](README.md#releasing).
