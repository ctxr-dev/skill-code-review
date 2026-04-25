---
name: skill-code-review
description: Use when completing tasks, implementing major features, or before merging to verify work meets requirements. Dispatches specialised reviewers selected from a wiki-organised corpus (~476 leaves) by semantic tree descent against the diff, then aggregates findings into an 8-gate GO/NO-GO release verdict.
---

# Requesting Code Review

Dispatch a code review orchestrator that scans the project, auto-detects the tech stack, descends `reviewers.wiki/` to select specialists semantically based on the diff and Project Profile, dispatches them in parallel, verifies coverage, and produces a unified report with a GO/NO-GO release verdict.

**Core principles:** SOLID, Clean Code, DRY, KISS, YAGNI, security, correctness, tests, architecture, performance, readability, documentation — covered by the corpus's 7-axis dimensions taxonomy. Only relevant leaves loaded — token-efficient by design.

## Architecture

```text
code-reviewer.md          Orchestrator: scans the project, descends the wiki, dispatches specialists in parallel
reviewers.wiki/           Wiki-organised corpus of ~476 specialist leaves under ~59 top-level subcategories
  index.md                Root index — entries[] lists subcategories with id + file + focus + tags
  <subcat>/index.md       Subcategory index — entries[] of leaves (or sub-subcategory indices)
  <subcat>/<leaf>.md      Specialist leaf — frontmatter (id, focus, dimensions, covers, activation, tools) + body
release-readiness.md      8-gate scorecard; gate-to-leaf binding by dimensions[] + tags[] predicate
report-format.md          Argument reference, markdown report shape, JSON schema
```

### How It Works

1. **Deep Project Scanner** (Step 0) — scans manifests, detects languages/frameworks/monorepo structure, produces a Project Profile.
2. **Wiki tree descent** (Step 1) — reads `reviewers.wiki/index.md`, descends only into subcategories whose `focus` is relevant to the Profile + diff. At leaf level, evaluates `activation:` (file globs, structural signals, escalation) for the final dispatch decision.
3. **Token-budget cap** — bounds total activated leaves at 30 by default; configurable via `max-reviewers=N`.
4. **Parallel dispatch** (Step 2) — each specialist gets: leaf body + Project Profile + filtered diff + tool-discovery output.
5. **Coverage verification** (Step 4) — every file in the diff covered by at least 2 specialists.
6. **8-gate verdict** (Step 5) — gates aggregate findings by `dimensions[]` + `tags[]` predicate; produces GO / NO-GO / CONDITIONAL.

## Corpus

The corpus lives at `reviewers.wiki/` and was built from `reviewers.src/` via `skill-llm-wiki` (deterministic mode, fan-out target 6, max depth 5, soft-DAG parents). It covers:

- **Languages** — Python, JS, TS, Swift, Go, Rust, Java, Kotlin, Scala, C#, Ruby, PHP, Dart, C, C++, Objective-C, shell, SQL, R, Lua. Each as a `lang-<name>.md` leaf.
- **Frameworks** — every framework in Phase C of `code-reviewer.md`'s detection table (web, ORM, test, UI, validation, auth, state, GraphQL, gRPC, …) as `fw-*.md` leaves.
- **Concerns** — security (decomposed by OWASP / dimension), correctness, tests, performance, architecture, readability, documentation, observability, CLI/API, domain-specific footguns.
- **Anti-patterns + design patterns + DDD + clean-architecture / hexagonal / microservices** as their own leaves.

Leaves carry rich frontmatter: `id`, `type`, `focus`, `covers[]`, `dimensions[]` (7-axis), `audit_surface[]`, `activation` (file_globs / keyword_matches / structural_signals / escalation_from), `tools[]`, `tags[]`, `languages`. The orchestrator routes off `focus` and `dimensions`/`tags`; specialists themselves use the body checklist.

## When to Request Review

**Mandatory:**

- After completing a phase from the implementation plan
- After completing a major feature
- Before merge to main

**Optional but valuable:**

- When stuck (fresh perspective)
- Before refactoring (baseline check)
- After fixing complex bug

## How to Request

**Basic usage:**

```text
/skill-code-review
```

The orchestrator auto-detects the base commit, scans the project, descends the wiki, and produces the report.

**With arguments:**

```text
/skill-code-review help                              # show all arguments
/skill-code-review full                              # review entire codebase
/skill-code-review format=json                       # structured JSON output
/skill-code-review scope-dir=src/api                 # only review src/api/
/skill-code-review scope-reviewer=sec-owasp-a01      # force-activate a specific leaf
/skill-code-review max-reviewers=15                  # tighter token budget
/skill-code-review base=origin/main head=HEAD        # explicit commit range
```

See `report-format.md` for the full argument reference, output format examples, and JSON schema.

**Output formats:**

- **Markdown** (default for users) — full report with tables, verdicts, coverage matrix
- **JSON/YAML** (default for tools, or `format=json`) — structured data for CI/automation

**Act on feedback:**

- Fix Critical issues immediately
- Fix Important issues before proceeding
- Note Minor issues for later
- Push back if reviewer is wrong (with reasoning)

## Red Flags

**Never:**

- Skip review because "it's simple"
- Ignore Critical issues
- Proceed with unfixed Important issues
- Argue with valid technical feedback

**If reviewer wrong:**

- Push back with technical reasoning
- Show code/tests that prove it works
- Request clarification

See orchestrator: `code-reviewer.md`
See corpus: `reviewers.wiki/index.md`
See gates: `release-readiness.md`
