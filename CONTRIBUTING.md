# Contributing to skill-code-review

## Setup

```bash
npm install
```

This installs dev dependencies and sets up the pre-commit hook via Husky.

## Development Workflow

### Adding a New Reviewer

```bash
npm run new:reviewer -- <reviewer-id>
```

This scaffolds `reviewers/<id>.md` with the correct template. After filling it in:

1. Add the reviewer to the embedded index in `code-reviewer.md` (the `- id:` YAML block)
2. Run `npm run validate` to verify consistency

### Adding a New Overlay

```bash
npm run new:overlay -- <category> <name>
```

Categories: `frameworks`, `languages`, `infra`. After filling it in:

1. Add a row to `overlays/index.md` under the correct section
2. Run `npm run validate` to verify consistency

### Validation

```bash
npm run validate    # structural checks
npm run lint        # markdown lint
npm run lint:fix    # auto-fix markdown issues
```

The pre-commit hook runs both automatically.

#### What the Validator Checks

- **SKILL.md frontmatter** — `name` and `description` fields present
- **Reviewer index** — every `- id:` in `code-reviewer.md` has a matching file in `reviewers/`, and vice versa
- **Overlay index** — every file in `overlays/index.md` exists on disk, and every overlay file is listed
- **Cross-references** — all relative markdown links resolve to existing files
- **Required files** — SKILL.md, code-reviewer.md, README.md, LICENSE, overlays/index.md
- **Line count** — warns if any reviewer exceeds 500 lines (token budget)

## File Structure

```
SKILL.md                  Skill metadata (frontmatter + overview)
code-reviewer.md          Orchestrator with embedded Reviewer Index
reviewers/                Specialist reviewer files (one per concern)
overlays/
  index.md                Master overlay routing table
  frameworks/             Framework-specific checks
  languages/              Language-specific checks
  infra/                  Infrastructure-specific checks
```

## Conventions

- **Reviewer files** must have an H1 title as the first heading
- **Overlay files** must be registered in `overlays/index.md`
- **Reviewer IDs** use kebab-case matching the filename (e.g., `clean-code-solid` → `clean-code-solid.md`)
- Keep reviewers under 500 lines for token efficiency
- Use consistent severity levels: Critical, Important, Minor

## Releasing

Releases are PR-gated; the bot does not push to `main` directly. One dispatch + one PR merge ships the package.

1. Actions → Release → Run workflow. Branch selector: `main` (any other ref is rejected). Version bump: `patch` / `minor` / `major`.
2. The workflow bumps `package.json` on a `release/v<version>` branch and opens a release PR.
3. Review + merge the PR.
4. `tag-on-main.yml` detects the version change on the merge commit, creates the annotated `v<version>` tag, and pushes it.
5. The tag push triggers `publish.yml`, which runs `index:build + validate + lint + test`, verifies tag/version agreement, and runs `npm publish --access public --provenance`.

Full operator walkthrough (including troubleshooting for stale/orphan tags, non-main dispatches, and the "Allow GitHub Actions to create and approve pull requests" org-level policy) lives in the [Releasing section of the README](README.md#releasing).
