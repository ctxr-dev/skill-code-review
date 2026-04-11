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

Releases are automated via GitHub Actions:

1. Go to Actions → Release workflow → Run workflow
2. Choose version bump: patch / minor / major
3. The workflow bumps `package.json`, commits, tags, and pushes
4. The tag triggers the Publish workflow which publishes to npm
