# Code Review Skill for Claude Code

[![npm](https://img.shields.io/npm/v/@ctxr/skill-code-review)](https://www.npmjs.com/package/@ctxr/skill-code-review)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Multi-specialist code review system for [Claude Code](https://claude.ai/code). Selects specialists from a wiki-organised corpus (~476 leaves under ~59 subcategories), runs the relevant ones in parallel, integrates external linters and analyzers, and produces structured reports with a GO / NO-GO verdict.

Auto-detects your tech stack (Python, JS, TS, Swift, Go, Rust, Java, Kotlin, Scala, C#, Ruby, PHP, Dart, C, C++, Objective-C, shell, SQL, R, Lua) and activates only the relevant specialists from the wiki corpus.

## Quick Start

```bash
# Install into your project
npx @ctxr/kit install @ctxr/skill-code-review
```

Then in Claude Code:

```text
/skill-code-review
```

## Prerequisites

- [Claude Code](https://claude.ai/code) CLI or IDE extension
- Git repository with commits to review

## Installation

### Manual

```bash
git clone https://github.com/ctxr-dev/skill-code-review.git /tmp/skill-code-review
mkdir -p .claude/skills
cp -r /tmp/skill-code-review .claude/skills/skill-code-review
```

### Git Submodule

```bash
git submodule add https://github.com/ctxr-dev/skill-code-review.git \
    .claude/skills/skill-code-review
```

## Usage

```text
/skill-code-review                                # diff review, auto-detect everything
/skill-code-review help                           # show all arguments
/skill-code-review full                           # review entire codebase
/skill-code-review mode=thorough                  # max depth within detected stack
/skill-code-review format=json                    # structured JSON output
/skill-code-review tools=interactive              # ask to install missing linters
/skill-code-review scope-dir=src/api              # only review src/api/
/skill-code-review scope-reviewer=sec-owasp-a01   # force-activate a specific leaf id
/skill-code-review max-reviewers=15               # tighter token budget (default 30)
/skill-code-review base=origin/main head=HEAD     # explicit commit range
```

See [report-format.md](report-format.md) for the full argument reference, output examples, and JSON schema.

### How it works

The orchestrator runs eleven sequential steps:

1. **Deep Project Scan** — detects languages, frameworks, monorepo structure from manifests.
2. **Risk-Tier Triage** — buckets the diff into trivial / lite / full / sensitive; caps specialist count at 3 / 8 / 20 / 30; short-circuits trivial diffs with no risk signal.
3. **Tree Descent** — deterministic walk of `reviewers.wiki/`; gathers candidate leaves by `focus` + `activation:`.
4. **LLM Trim** — picks the final K = cap leaves from candidates with one-sentence justifications. Justifications become the audit trail in the manifest.
5. **Tool Discovery** — collects external linters from picked leaves' `tools:` arrays and runs available ones.
6. **Parallel Dispatch** — every picked leaf runs as a blind sub-agent in parallel.
7. **Collect Findings** — deduplicates and categorises by severity.
8. **Verify Coverage** — every diff file reviewed by ≥ 2 specialists.
9. **Synthesize Release Readiness** — 8 gates aggregate findings via dimension/tag predicates.
10. **Write Run Directory** — sharded `.skill-code-review/<shard>/<run-id>/` with `manifest.json` + `report.md` + `report.json`.
11. **Stdout / Return Value** — prints the report in the chosen format.

## Corpus

Specialists live in [`reviewers.wiki/`](reviewers.wiki/index.md) — a wiki-organised corpus of ~476 leaves under ~59 top-level subcategories, built from `reviewers.src/` via `skill-llm-wiki` (deterministic mode, fan-out target 6, max depth 5). Coverage spans:

- **Languages** — every supported language as a `lang-<name>.md` leaf.
- **Frameworks** — `fw-*.md` leaves for the frameworks named in the [Phase C detection table](code-reviewer.md).
- **Concerns** — security (decomposed across OWASP categories), correctness, tests, performance, architecture, readability, documentation, observability, CLI, API, domain footguns.
- **Patterns / anti-patterns / DDD / clean-architecture / hexagonal / microservices** — each as their own leaf.

See [SKILL.md](SKILL.md) for the full architecture summary.

## Report Format

Every review produces (markdown or JSON):

- **Release Verdict** — GO / NO-GO / CONDITIONAL
- **SOLID Compliance** — principle-by-principle status
- **Issues** — clickable [file:line](file#Lline) links, severity, specialist, impact, fix
- **Tool Results** — pass/fail/skipped for each external linter/analyzer
- **Specialist Results** — per-reviewer status with issue counts
- **Release Gates** — 8-gate assessment
- **Coverage Matrix** — files × specialists

## Architecture

```text
skill-code-review/
├── SKILL.md                  # Skill metadata and architecture overview
├── code-reviewer.md          # Orchestrator: scans, descends the wiki, dispatches specialists
├── release-readiness.md      # 8-gate scorecard, dimension-predicate binding
├── report-format.md          # Canonical report format + JSON schema + argument spec
├── reviewers.src/            # Source corpus (gitignored; wiki is source of truth in repo)
└── reviewers.wiki/
    ├── index.md              # Root index — entries[] of subcategories
    ├── <subcat>/
    │   ├── index.md          # Subcategory index — entries[] of leaves
    │   ├── <leaf>.md         # Specialist (frontmatter + body checklist)
    │   └── ...
    └── ... (~59 subcategories, ~476 leaves total)
```

## Customization

### Add a reviewer

1. Author a new source file in `reviewers.src/<id>.md` with the v2 frontmatter (`id`, `type`, `focus`, `covers[]`, `dimensions[]`, `audit_surface[]`, `activation`, `tools[]`, `tags[]`).
2. Run the validators: `npm run validate:src` (parses + body shape + dimensions taxonomy).
3. Rebuild the wiki via `skill-llm-wiki`:

   ```bash
   node /path/to/skill-llm-wiki/scripts/cli.mjs build /path/to/skill-code-review/reviewers.src \
     --quality-mode deterministic --fanout-target 6 --max-depth 5 --soft-dag-parents --accept-dirty
   ```

4. Move the produced `reviewers.src.wiki/` over the existing `reviewers.wiki/`, validate the result, commit.

The wiki layer takes care of clustering, slug generation, soft-DAG parents, and balance — no manual placement under a subcategory is needed.

### Add a language or framework

Same procedure as a reviewer — the language/framework is just a `lang-<name>.md` or `fw-<name>.md` leaf in `reviewers.src/`. Update Phase C of [`code-reviewer.md`](code-reviewer.md) if the framework is new and the dependency-name detection needs to know about it.

### Severity levels

- **Critical** — must fix, blocks merge (security, data loss, correctness)
- **Important** — should fix, blocks merge (SOLID violation, missing tests)
- **Minor** — advisory, does not block (naming, style)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup and conventions.

## Releasing

Releases are PR-gated. Version bumps land on `main` through a review gate like any other change; only the tag push is automated.

### One-time setup

Enable these on the repo before your first release:

- Repository secret `NPM_TOKEN` set to an npm access token with publish rights on the `@ctxr` scope (`npm token create`).
- **Settings → Actions → General → Workflow permissions**: enable **Allow GitHub Actions to create and approve pull requests** so `release.yml` can open its version-bump PR with `GITHUB_TOKEN`. If the checkbox is greyed out, an organization-level Actions policy is restricting it; ask an org admin to unlock the setting first.
- (Optional, recommended) GitHub-managed CodeQL default setup: Security → Code security → enable default setup for `javascript-typescript` and `actions`.
- (Optional) A branch ruleset on `main` requiring PR review + code scanning. The release flow works without it; gates are strictly stricter when enabled.

### Cutting a release

1. **Actions → Release → Run workflow**.
   - Branch selector: `main` (the workflow refuses any other ref).
   - Version bump: `patch` / `minor` / `major`.
   - Click **Run workflow**.
2. The workflow bumps `package.json` on a fresh `release/v<version>` branch and opens a PR to `main` titled `release: v<version>`.
3. Review the PR (diff is just version fields). Approve + merge.
4. On merge, `tag-on-main.yml` fires automatically:
   - Detects the version change.
   - Creates and pushes the annotated `v<version>` tag via `GITHUB_TOKEN`.
5. **Actions → Publish to npm → Run workflow** on the `v<version>` tag. The workflow runs `npm ci + validate:fsm + lint + test`, verifies the tag matches `package.json`, and publishes the package to npm.

> **Why a manual dispatch for step 5?** GitHub's built-in `GITHUB_TOKEN` cannot trigger further workflows (`on: push: tags` won't fire when a workflow pushed the tag). So the tag auto-creation stops at the tag. Publishing is one extra click. To make it fully automatic, swap the push credential in `tag-on-main.yml` for a GitHub App token or fine-grained PAT stored as a repo secret, then the `push: tags` trigger on `publish.yml` will fire and step 5 happens by itself.

From **Run workflow** on Release to **published on npm** is one dispatch + one PR merge + one dispatch (or one dispatch + one PR merge, once a PAT/App-token is wired in).

See [GitHub Releases](https://github.com/ctxr-dev/skill-code-review/releases) for the changelog.

### Troubleshooting

- **Release workflow fails with "dispatched from non-main ref"** — you selected a feature branch in the Actions UI. Re-dispatch with `main`.
- **`tag-on-main` fails with "Tag vX.Y.Z exists but points at …"** — a stale/orphan tag from a prior failed release. Delete and re-run:

  ```bash
  git push origin --delete vX.Y.Z
  ```

  Then merge a trivial no-op PR to `main` (or revert-and-re-merge the release PR) to retrigger `tag-on-main`. Direct pushes to `main` may be blocked by branch protection, so the PR path is the reliable retrigger.
- **`publish.yml` fails on "Verify version matches tag"** — tag and `package.json` disagree. Investigate the merge commit; this should not happen under the PR-based flow.
- **GitHub Actions is not permitted to create pull requests** — org or enterprise policy blocks the `GITHUB_TOKEN` from opening PRs. Enable **Allow GitHub Actions to create and approve pull requests** at the org level (Settings → Actions → General → Workflow permissions), or ask the enterprise admin to unlock the setting.

## License

[MIT](LICENSE)

## Example

### Prompt

> Use code review global skill to review frontend

<img width="1330" height="722" alt="Screenshot 2026-04-11 at 22 00 35" src="https://github.com/user-attachments/assets/e2009b02-3cba-422c-b92c-655901a575ff" />

<img width="1348" height="1189" alt="Screenshot 2026-04-11 at 22 00 59" src="https://github.com/user-attachments/assets/b249d3be-3bde-468c-9cc2-3066af1aff2c" />

<img width="1352" height="890" alt="Screenshot 2026-04-11 at 22 01 22" src="https://github.com/user-attachments/assets/dd350032-3d95-4657-a5cf-01d746ab595b" />

<img width="1334" height="1035" alt="Screenshot 2026-04-11 at 22 01 39" src="https://github.com/user-attachments/assets/46e06599-211e-479b-a7af-bc80116524c6" />

<img width="1346" height="888" alt="Screenshot 2026-04-11 at 22 02 09" src="https://github.com/user-attachments/assets/47c5507f-b6f6-4be9-a8c4-a4236ff4d6ed" />
