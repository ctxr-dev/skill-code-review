# Code Review Skill for Claude Code

A production-grade, multi-specialist code review system for [Claude Code](https://claude.ai/code). Dispatches up to 16 specialist AI reviewers in parallel, each deeply focused on a specific quality dimension — from SOLID principles to security, performance, testing, and more.

**Works on any project** — TypeScript, Python, Go, Rust, Java/Kotlin, Ruby, C#. Monorepos, microservices, CLIs, libraries, APIs, full-stack apps. Auto-detects your tech stack and activates only the relevant reviewers.

## Features

- **16 specialist reviewers** — each focused on one quality dimension, reviewing far deeper than any single reviewer could
- **Smart routing** — auto-detects languages, frameworks, ORMs, and infrastructure from your project manifests
- **Token-efficient overlays** — 27 framework/language/infra overlay files loaded only when relevant (React, Next.js, Prisma, Django, Docker, Terraform, etc.)
- **Index-based architecture** — orchestrator reads a compact index to make routing decisions without loading all reviewer files
- **Monorepo-aware** — scopes reviewers to affected packages; a change in `apps/api/` doesn't trigger React checks from `apps/web/`
- **Coverage guarantee** — every file in the diff is reviewed by at least 2 specialists
- **8-gate release readiness** — GO / NO-GO / CONDITIONAL verdict with full methodology compliance tracking
- **SOLID enforcement** — SRP, OCP, LSP, ISP, DIP, DRY, KISS, YAGNI checked on every review
- **Framework-specific checks** — not just generic rules. If you use Prisma, the security reviewer checks for `$queryRaw` injection. If you use Next.js, it checks for SSR data exposure.

## Specialist Team

### Always Active (7 universal reviewers)

| Reviewer | Focus |
|----------|-------|
| **clean-code-solid** | SOLID, DRY, KISS, YAGNI, Law of Demeter, POLA, complexity metrics |
| **architecture-design** | Module boundaries, clean architecture, hexagonal/DDD, coupling/cohesion |
| **test-quality** | Test pyramid, assertions, boundary values, mutation testing, determinism |
| **security** | OWASP Top 10, injection, secrets, crypto, sessions, filesystem safety |
| **error-resilience** | Error design, retry/circuit-breaker, partial failure, defensive programming |
| **initialization-hygiene** | No stubs, feature completeness, startup/shutdown, dead code, wiring |
| **release-readiness** | 8-gate GO/NO-GO aggregator |

### Conditionally Active (9 specialist reviewers)

| Reviewer | Activated When |
|----------|---------------|
| **language-quality** | Source code in any supported language (TS, Python, Go, Rust, Java/Kotlin) |
| **concurrency-async** | Async/await, threads, goroutines, channels, mutexes detected |
| **performance** | Any code on a hot path, DB queries, caching, or I/O operations |
| **dependency-supply-chain** | Manifest or lock files changed |
| **documentation-quality** | Docs changed or public API modified |
| **data-validation** | Schema validation, config parsing, or input handling code |
| **api-design** | HTTP routes, GraphQL, gRPC, or public SDK exports |
| **observability** | Logging, metrics, tracing, or health check code |
| **cli-quality** | CLI commands, argument parsing, or interactive prompts |
| **filesystem-safety** | File I/O, symlinks, temp files, or process management |

### Framework Overlays (27 scoped files)

Loaded only when the framework is detected in your project:

**Frameworks:** React, Next.js, Express, Fastify, NestJS, Spring, Django, Flask, Prisma, Drizzle, SQLAlchemy, TypeORM, Zod, Pydantic, GraphQL, gRPC, Tailwind

**Languages:** TypeScript, Python, Go, Rust, Java/Kotlin

**Infrastructure:** Docker, GitHub Actions, Terraform, Kubernetes

## Installation

### Option 1: Manual Installation

Copy the skill directory into your project's `.claude/skills/`:

```bash
# Clone the repo
git clone https://github.com/anthropics/skill-code-review.git /tmp/skill-code-review

# Copy into your project
cp -r /tmp/skill-code-review/.claude/skills/skill-code-review \
      .claude/skills/skill-code-review
```

### Option 2: Via npx (recommended)

```bash
# Install
npx @anthropic-ai/skills install skill-code-review

# Update to latest
npx @anthropic-ai/skills update skill-code-review

# List installed skills
npx @anthropic-ai/skills list
```

### Option 3: Git Submodule

```bash
git submodule add https://github.com/anthropics/skill-code-review.git \
    .claude/skills/skill-code-review
```

## Usage

### In Claude Code

Simply invoke the skill:

```
/skill-code-review
```

The orchestrator will automatically:
1. Scan your project (languages, frameworks, monorepo structure)
2. Analyze the git diff
3. Select and dispatch relevant reviewers in parallel
4. Collect, deduplicate, and produce a unified report with a GO/NO-GO verdict

### With Specific Commits

```
/skill-code-review base=origin/main head=HEAD
```

## Report Format

Every review produces a structured report including:

- **Release Verdict** — GO / NO-GO / CONDITIONAL
- **Methodology Compliance** — SOLID principle status table
- **Issues by Severity** — Critical (blocks merge) → Important (blocks merge) → Minor (advisory)
- **Specialist Summary** — pass/fail per reviewer with issue counts
- **Release Readiness Gates** — 8-gate assessment
- **Coverage Matrix** — which files were reviewed by which specialists

## Architecture

```
skill-code-review/
├── SKILL.md                  # Skill metadata and high-level guide
├── code-reviewer.md          # Orchestrator with embedded index + scanner
├── README.md                 # This file
├── LICENSE                   # MIT
├── reviewers/                # Base reviewer files (universal checks)
│   ├── clean-code-solid.md   # SOLID, Clean Code, DRY/KISS/YAGNI
│   ├── architecture-design.md
│   ├── test-quality.md
│   ├── security.md
│   ├── error-resilience.md
│   ├── initialization-hygiene.md
│   ├── release-readiness.md  # 8-gate aggregator
│   ├── language-quality.md   # Multi-language idioms
│   ├── concurrency-async.md
│   ├── performance.md
│   ├── dependency-supply-chain.md
│   ├── documentation-quality.md
│   ├── data-validation.md
│   ├── api-design.md
│   ├── observability.md
│   ├── cli-quality.md
│   └── hooks-safety.md       # Filesystem & runtime safety
└── overlays/                 # Framework-specific scoped checks
    ├── index.md              # Master overlay index (LLM reads first)
    ├── frameworks/           # 17 framework overlays
    │   ├── react.md
    │   ├── nextjs.md
    │   ├── prisma.md
    │   └── ...
    ├── languages/            # 5 language overlays
    │   ├── typescript.md
    │   ├── python.md
    │   └── ...
    └── infra/                # 4 infrastructure overlays
        ├── docker.md
        ├── github-actions.md
        └── ...
```

### How the Index-Based Routing Works

1. **Orchestrator reads the embedded Reviewer Index** (~300 lines of YAML) — knows every reviewer's audit surface, activation signals, and framework applicability without loading any reviewer file
2. **Deep Project Scanner** runs first — detects languages, frameworks, monorepo structure from manifests
3. **Deterministic routing** — Index + Project Profile = exact set of reviewers to dispatch. No judgment calls.
4. **Overlay selection** — reads `overlays/index.md`, loads only overlays matching detected frameworks
5. **Specialist dispatch** — each reviewer gets: base checklist + relevant overlays + Project Profile + filtered diff
6. **Coverage verification** — every file reviewed by at least 2 specialists

## Customization

### Adding a Framework Overlay

1. Create `overlays/frameworks/<framework>.md` with framework-specific checks
2. Add a row to `overlays/index.md` with trigger, specialists, and summary
3. The orchestrator will automatically pick it up when the framework is detected

### Adding a Reviewer

1. Create `reviewers/<name>.md` following the existing template
2. Add an entry to the Reviewer Index YAML block in `code-reviewer.md`
3. Update `release-readiness.md` to include the new reviewer in the appropriate gate

### Tuning Severity

Edit the severity classification table in any reviewer file. The three levels are:
- **Critical** — Must fix. Blocks merge. (data corruption, security vulnerability, broken contract)
- **Important** — Should fix. Blocks merge. (SOLID violation, missing tests, poor error handling)
- **Minor** — Nice to have. Does not block. (naming, style, minor optimization)

## License

MIT License. See [LICENSE](LICENSE).
