---
name: skill-code-review
description: Use when completing tasks, implementing major features, or before merging to verify work meets requirements. Dispatches up to 18 specialist reviewers with framework-aware overlays for deep, multi-angle code review enforcing SOLID, Clean Code, and engineering best practices.
---

# Requesting Code Review

Dispatch a code review orchestrator that scans the project, auto-detects the tech stack, routes to relevant specialists using an embedded index, loads framework-specific overlays, dispatches all selected specialists in parallel, verifies coverage, and produces a unified report with a GO/NO-GO release verdict.

**Core principles:** SOLID, Clean Code, DRY, KISS, YAGNI enforced on every review. Only relevant reviewers and overlays loaded — token-efficient by design.

## Architecture

```text
code-reviewer.md          Orchestrator with embedded Reviewer Index + Deep Scanner
reviewers/                18 base specialist files (universal checks)
overlays/
  index.md                Master overlay index (LLM reads first to select)
  frameworks/             17 framework overlays (React, Prisma, Django, etc.)
  languages/              5 language overlays (TS, Python, Go, Rust, Java/Kotlin)
  infra/                  4 infrastructure overlays (Docker, GH Actions, Terraform, K8s)
```

### How It Works

1. **Deep Project Scanner** (Step 0) — scans manifests, detects languages/frameworks/monorepo structure, produces a Project Profile
2. **Index-based routing** (Step 1) — reads the embedded Reviewer Index (~300 lines YAML) to select specialists deterministically based on the Profile + diff
3. **Overlay selection** — reads `overlays/index.md`, loads ONLY overlays matching detected frameworks (e.g., Prisma detected → load `overlays/frameworks/prisma.md`)
4. **Parallel dispatch** (Step 2) — each specialist gets: base checklist + relevant overlays + Project Profile + filtered diff
5. **Coverage verification** (Step 4) — every file reviewed by at least 2 specialists
6. **8-gate verdict** (Step 5) — GO / NO-GO / CONDITIONAL with full methodology compliance

## Specialist Team (18 reviewers)

### Always Active (7 universal)

- **clean-code-solid** — SOLID, DRY, KISS, YAGNI, Law of Demeter, POLA, Fail Fast, cyclomatic/cognitive complexity
- **architecture-design** — Clean architecture, hexagonal/DDD, module boundaries, coupling/cohesion, architecture erosion
- **test-quality** — Test pyramid, assertion quality, boundary values, mutation testing, test smells, determinism
- **security** — OWASP Top 10, injection, secrets, crypto, sessions, filesystem safety, serialization
- **error-resilience** — Error hierarchy, retry/circuit-breaker, fallback, partial failure, saga, defensive programming
- **initialization-hygiene** — No stubs, feature completeness, startup/shutdown, dead code, wiring, export hygiene
- **release-readiness** — 8-gate GO/NO-GO aggregator

### Conditionally Active (11 specialists)

- **language-quality** — Language idioms and type safety for TS, Python, Go, Rust, Java/Kotlin, Scala
- **concurrency-async** — Race conditions, thread safety, actors/CSP, backpressure, idempotency
- **performance** — Big-O, hot paths, DB queries, caching, I/O, memory, startup
- **dependency-supply-chain** — CVEs, license compliance, supply chain integrity, maintainer trust
- **documentation-quality** — README, API docs, ADRs, changelogs, config docs, diagram currency
- **data-validation** — Input validation, schema enforcement, config management, env handling
- **api-design** — REST/GraphQL/gRPC/SDK contracts, versioning, semver, event schemas
- **observability** — Structured logging, metrics, tracing, health checks, alerting, audit
- **cli-quality** — Unix philosophy, signals, I/O discipline, exit codes, verbosity, shell completion
- **hooks-safety** — Atomic ops, permissions, symlinks, paths, cross-platform, config parsing
- **readme-quality** — Root README.md structure, accuracy, open-source standards, no redundancy

### Overlays (27 scoped files)

Loaded only when the framework/language/infra is detected in your project:

**Frameworks:** React, Next.js, Express, Fastify, NestJS, Spring, Django, Flask, Prisma, Drizzle, SQLAlchemy, TypeORM, Zod, Pydantic, GraphQL, gRPC, Tailwind

**Languages:** TypeScript, Python, Go, Rust, Java/Kotlin, Scala

**Infrastructure:** Docker, GitHub Actions, Terraform, Kubernetes

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

The orchestrator auto-detects the base commit, scans the project, selects reviewers, and produces the report.

**With arguments:**

```text
/skill-code-review help                           # show all arguments
/skill-code-review full                           # review entire codebase
/skill-code-review format=json                    # structured JSON output
/skill-code-review scope-dir=src/api              # only review src/api/
/skill-code-review scope-reviewer=security        # only security specialist
/skill-code-review base=origin/main head=HEAD     # explicit commit range
```

See `report-format.md` for the full argument reference, output format examples, and JSON schema.

**Output formats:**

- **Markdown** (default for users) — beautiful report with tables, verdicts, coverage matrix
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
See reviewers: `reviewers/`
See overlays: `overlays/index.md`
