# Code Review Skill for Claude Code

[![npm](https://img.shields.io/npm/v/@ctxr-dev/skill-code-review)](https://www.npmjs.com/package/@ctxr-dev/skill-code-review)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Multi-specialist code review system for [Claude Code](https://claude.ai/code). Dispatches up to 18 specialist AI reviewers in parallel, integrates external linters and analyzers, and produces structured reports with a GO / NO-GO verdict.

Auto-detects your tech stack (TypeScript, Python, Go, Rust, Java/Kotlin, Scala) and activates only the relevant reviewers, overlays, and tools.

## Quick Start

```bash
# Install into your project
npx @ctxr-dev/skills install @ctxr-dev/skill-code-review
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
/skill-code-review scope-reviewer=security        # only security specialist
/skill-code-review base=origin/main head=HEAD     # explicit commit range
```

See [report-format.md](report-format.md) for the full argument reference, output examples, and JSON schema.

### How it works

1. **Scan** — detects languages, frameworks, monorepo structure from manifests
2. **Tools** — discovers and runs external linters/analyzers (eslint, semgrep, mypy, clippy, etc.)
3. **Route** — reads `reviewers/index.yaml` to select specialists deterministically
4. **Overlay** — loads framework-specific checks for detected tech (React, Prisma, Django, Docker, etc.)
5. **Dispatch** — all selected specialists run in parallel with filtered diffs + tool output
6. **Verify** — every file reviewed by at least 2 specialists
7. **Verdict** — 8-gate release readiness: GO / NO-GO / CONDITIONAL

## Reviewers

**7 universal** (always active): clean-code-solid, architecture-design, test-quality, security, error-resilience, initialization-hygiene, release-readiness

**11 conditional** (activated by signals): language-quality, concurrency-async, performance, dependency-supply-chain, documentation-quality, data-validation, api-design, observability, cli-quality, hooks-safety, readme-quality

**27 overlays** (loaded per framework): 17 frameworks, 6 languages, 4 infrastructure

See [SKILL.md](SKILL.md) for full specialist descriptions.

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
├── SKILL.md                  # Skill metadata and overview
├── code-reviewer.md          # Orchestrator (reads index for routing)
├── report-format.md          # Canonical report format + JSON schema + argument spec
├── reviewers/
│   ├── index.yaml            # Auto-generated from reviewer frontmatter
│   ├── clean-code-solid.md   # Each reviewer has YAML frontmatter (tools, audit_surface)
│   ├── security.md
│   └── ... (18 reviewers)
└── overlays/
    ├── index.md              # Overlay routing table
    ├── frameworks/           # 17 framework overlays (some with tool declarations)
    ├── languages/            # 6 language overlays (all with tool declarations)
    └── infra/                # 4 infrastructure overlays (some with tool declarations)
```

## Customization

### Add a framework overlay

1. `npm run new:overlay -- frameworks <name>`
2. Fill in the checklist items and optional `tools` frontmatter
3. Add row to `overlays/index.md`
4. `npm run validate && npm run lint`

### Add a reviewer

1. `npm run new:reviewer -- <id>`
2. Fill in frontmatter (tools, audit_surface, activation) and checklist
3. `npm run index:build && npm run validate && npm run lint`

### Severity levels

- **Critical** — must fix, blocks merge (security, data loss, correctness)
- **Important** — should fix, blocks merge (SOLID violation, missing tests)
- **Minor** — advisory, does not block (naming, style)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, conventions, and release process.

## Releases

See [GitHub Releases](https://github.com/ctxr-dev/skill-code-review/releases) for changelog.

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


