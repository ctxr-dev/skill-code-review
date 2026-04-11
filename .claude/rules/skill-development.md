# Skill Development Rules

> **SCOPE:** These rules apply ONLY when developing this skill itself (the skill-code-review repository). If this skill is installed inside another project (e.g., `someproject/.claude/skills/skill-code-review/`), this entire `.claude/` directory is out of scope — ignore it completely. Do not apply these rules to the containing project. Do not reference these files during code review dispatch.

## Architecture

**Index-based routing for token efficiency:**

- The orchestrator (`code-reviewer.md`, ~330 lines) reads `reviewers/index.yaml` for routing decisions — it never loads reviewer `.md` files to decide dispatch.
- Each reviewer `.md` file has YAML frontmatter (id, type, focus, audit_surface, languages, activation) — this is the source of truth.
- `reviewers/index.yaml` is auto-generated from frontmatter via `npm run index:build`. Never edit it manually.
- Overlays are loaded ONLY when framework/language detected. Every byte costs tokens at review time.
- The `.claude/settings.json` hook auto-rebuilds the index when reviewer files are edited.

## Adding a New Language

1. Create `overlays/languages/<lang>.md` — follow `java-kotlin.md` structure: H1, lead line, `## Section` + `- [ ]` items, canonical ref links
2. Add row to `overlays/index.md` Language Overlays table
3. Add `## <Lang>` section to `reviewers/language-quality.md` (before `## Output Format`)
4. Update language list in `reviewers/language-quality.md` Output Format section
5. Update `reviewers/language-quality.md` frontmatter: add to `languages` and `activation.file_globs`
6. Update `code-reviewer.md`: runtime versions block, dependencies block, Phase C framework table
7. Update counts in `SKILL.md` and `README.md`
8. Run `npm run index:build && npm run validate && npm run lint`

## Adding a New Framework Overlay

1. Create `overlays/frameworks/<name>.md`
2. Add row to `overlays/index.md`
3. Add dependency name to `code-reviewer.md` Phase C framework table
4. Update overlay count in `SKILL.md` and `README.md`
5. Run `npm run validate && npm run lint`

## Adding a New Reviewer

1. Create `reviewers/<id>.md` with YAML frontmatter and H1 title
2. Frontmatter must include: `id`, `type`, `focus`, `audit_surface`, and `activation` (if conditional)
3. `id` must match filename exactly (kebab-case)
4. Use `- [ ]` checklist format, severity guide, output format section
5. Run `npm run index:build` — this generates the index entry automatically
6. Update `release-readiness.md` gate assignments if applicable
7. Update reviewer count in `SKILL.md`, `README.md`, `code-reviewer.md`, `package.json`
8. Run `npm run validate && npm run lint`

## Conventions

- **IDs**: kebab-case, must match filename
- **Max 500 lines** per file (validator warns)
- **Severity**: Critical (blocks merge), Important (blocks merge), Minor (advisory). The aggregator uses originating specialist's severity — it does not re-classify.
- **Naming consistency**: IDs must be identical in frontmatter, release-readiness.md gates, overlays/index.md specialist columns, SKILL.md, README.md
- **Counts**: update all references when adding/removing reviewers or overlays
- **Canonical references**: link to official docs at end of each overlay section
- **Tools**: optional `tools` array in frontmatter (reviewers and overlays). Each entry: `name` (required), `command` (optional — exact command to run), `purpose` (required — what it checks). No install commands — AI resolves those at runtime.
- **Clickable file links**: in reports, use `[file:line](file#Lline)` format for GitHub/IDE compatibility

## Before Every Commit

```bash
npm run index:build && npm run validate && npm run lint
```

The pre-commit hook enforces this automatically. The index:build step regenerates `reviewers/index.yaml` from frontmatter.
