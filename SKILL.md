---
name: skill-code-review
description: Use when completing tasks, implementing major features, or before merging to verify work meets requirements. Dispatches specialised reviewers selected from a wiki-organised corpus (~476 leaves) by semantic tree descent against the diff, then aggregates findings into an 8-gate GO/NO-GO release verdict.
---

# Requesting Code Review

Dispatch a code review orchestrator that scans the project, auto-detects the tech stack, descends `reviewers.wiki/` to select specialists semantically based on the diff and Project Profile, dispatches them in parallel, verifies coverage, and produces a unified report with a GO/NO-GO release verdict.

**Core principles:** SOLID, Clean Code, DRY, KISS, YAGNI, security, correctness, tests, architecture, performance, readability, documentation — covered by the corpus's 7-axis dimensions taxonomy. Only leaves relevant to the diff are loaded — token-efficient by design.

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

The orchestrator runs eleven sequential steps. See `code-reviewer.md` for the full specification. Headline mechanics:

1. **Deep Project Scan** — detects languages, frameworks, monorepo structure; produces a Project Profile.
2. **Risk-Tier Triage** — buckets the diff into trivial / lite / full / sensitive; sets the specialist cap (3 / 8 / 20 / 30); short-circuits trivial diffs with no risk signal.
3. **Tree Descent** — walks `reviewers.wiki/` deterministically, gathers candidate leaves whose `activation:` matches the diff or whose parent subcategory's `focus` is relevant.
4. **LLM Trim** — picks K = cap leaves from the candidates with one-sentence justifications per pick. Justifications are the audit trail.
5. **Tool Discovery** — collects external linters/SAST declared by picked leaves; runs available ones; feeds output into specialist prompts.
6. **Parallel Dispatch** — every picked leaf runs as a sub-agent in parallel, blind to other specialists, receiving leaf body + Project Profile + filtered diff + tool output.
7. **Collect Findings** — gathers all specialist outputs, deduplicates `(file, line, normalised_title)`, categorises by severity.
8. **Verify Coverage** — every diff file must be reviewed by ≥ 2 specialists.
9. **Synthesize Release Readiness** — 8 gates aggregate findings via dimension/tag predicates; produces GO / CONDITIONAL / NO-GO.
10. **Write Run Directory** — sharded `.skill-code-review/<shard>/<run-id>/` directory with `manifest.json`, `report.md`, `report.json`. The manifest is the coverage proof.
11. **Stdout / Return Value** — prints the report in the chosen format, appends a pointer to the manifest.

## Corpus

The corpus lives at `reviewers.wiki/`. Sources at `reviewers.src/` are passed through `skill-llm-wiki` (deterministic mode, fan-out target 6, max depth 5, soft-DAG parents) to produce the wiki. It covers:

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
