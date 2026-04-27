# Report Format Reference

This file defines the canonical output format for code reviews. The orchestrator reads this file to produce consistent reports. It contains three sections:

1. **Arguments** — all supported arguments with defaults
2. **Markdown report** — the beautiful human-readable format (default for users)
3. **JSON schema** — the structured format for programmatic consumption

---

## Arguments

When the skill is invoked, parse arguments from the invocation context as `key=value` pairs. Flags (no value) are boolean true when present.

| Argument | Values | Default | Description |
|----------|--------|---------|-------------|
| help | (flag) | — | Print this argument table and exit. No review is run. |
| format | auto, markdown, json | auto | Output format. `auto` resolves via the stdout TTY heuristic in `emit-stdout.mjs`: markdown when stdout is a TTY (interactive user), JSON otherwise (piped consumer / sub-agent). `yaml` is reserved for a future PR; passing it today emits a stderr notice and falls back to markdown. |
| full | (flag) | — | Review entire codebase, not just git diff. Respects scope-dir. |
| base | auto, git SHA or ref | auto | Base commit for diff. Auto: merge-base with origin/main or HEAD~1. Ignored if full. |
| head | git SHA or ref | HEAD | Head commit for diff. |
| scope-dir | comma-separated paths | all | Restrict review to these directories. |
| scope-lang | comma-separated languages | all detected | Force specific languages (e.g. typescript,python). |
| scope-framework | comma-separated frameworks | all detected | Force specific frameworks (e.g. react,prisma). |
| scope-reviewer | comma-separated reviewer IDs | auto-routed | Force specific reviewers, skip auto-routing. |
| scope-severity | critical, important, minor | all | Only report issues at or above this severity. |
| scope-gate | comma-separated gate numbers | all | Only evaluate specific release gates. |
| tools | silent, interactive, skip | silent | Tool execution mode. silent=use available, skip missing. interactive=ask about missing tools. skip=no tools. |
| mode | standard, thorough | standard | Review depth. thorough=max depth within detected stack, all tools enabled, lower activation thresholds. |

### Base Auto-Detection

When `base` is not specified and `full` is not set:

1. Try `git merge-base HEAD origin/main` — if the branch has an upstream
2. Try `git merge-base HEAD origin/master` — fallback for master-based repos
3. Fall back to `HEAD~1` — if no remote tracking branch exists

### Full Review Mode

When `full` is set, the orchestrator uses `git ls-files` (filtered by scope-dir if set) instead of `git diff`. All source files in scope are reviewed, not just changed files. Use for new project audits, periodic health checks, or scoped deep dives.

### Thorough Mode

When `mode=thorough`:

- Smart routing still applies — only reviewer leaves relevant to the detected stack are dispatched
- ALL tools declared by activated leaves are enabled
- Leaves activate on weaker signals (tangential file matches, partial focus overlap)
- All severity levels reported (scope-severity ignored)
- Tool mode auto-selected: `interactive` when user is present, `silent` in CI/piped contexts
- Sets `full` automatically if no base/head specified

Use for critical releases, security audits, or new project onboarding.

### Tool Modes

- `tools=silent` (default): Run tools that are already installed. Skip missing tools and note them in the report. No prompts.
- `tools=interactive`: For each missing tool, ask the user if they want to install it. Offer platform-appropriate methods (the AI determines install options at runtime — brew, npm, pip, cargo, etc.). If user declines, skip.
- `tools=skip`: Don't run any external tools. Pure AI checklist review only.

Tools are declared in each reviewer leaf's frontmatter (`tools:` array). The orchestrator collects all tools from activated leaves, deduplicates by name, checks availability, and runs them against scoped files.

### Format Auto-Detection

When `format=auto` (the default), [`scripts/inline-states/emit-stdout.mjs`](scripts/inline-states/emit-stdout.mjs) resolves the format from `process.stdout.isTTY`:

- TTY stdout (interactive user / slash command / chat) → **markdown**
- Non-TTY stdout (piped consumer, sub-agent, CI) → **JSON**

The TTY check approximates "user vs tool" because the runner can't introspect "subagent vs user" directly from inside the process.

---

## Markdown Report Format

This is the canonical example. Match this structure exactly when producing markdown output. Replace sample data with actual review data.

```markdown
# Code Review Report

## Verdict

| | |
|---|---|
| **Decision** | **NO-GO** |
| **Blocking** | 1 critical, 1 important |
| **Reviewed** | Add user authentication with JWT tokens |
| **Range** | abc1234..def5678 |
| **Files** | 8 files changed |
| **Stack** | TypeScript, React, Prisma |
| **Mode** | diff (base auto-detected: origin/main) |
| **Specialists** | 12 of 476 dispatched |

## SOLID Compliance

| Principle | Status | Finding |
|-----------|--------|---------|
| SRP | PASS | Clean separation in src/domain/ |
| OCP | PASS | Strategy pattern for auth providers |
| LSP | N/A | No inheritance hierarchies in diff |
| ISP | PASS | Narrow interfaces for token service |
| DIP | FAIL | AuthService directly imports PrismaClient |
| DRY | PASS | Shared validation schemas |
| KISS | PASS | Straightforward control flow |
| YAGNI | PASS | No speculative abstractions |

## Issues

**File references use clickable links:** `[file:line](file#Lline)` — works in GitHub, IDEs, and AI chat.

### Critical — Blocks Merge

| # | Specialist | Location | Title | Impact | Fix |
|---|-----------|----------|-------|--------|-----|
| 1 | security | [src/api/auth.ts:42](src/api/auth.ts#L42) | SQL injection in login query | Attacker can extract DB via string interpolation | Use parameterized query: `prisma.$queryRaw(Prisma.sql\`...\`)` |

### Important — Should Fix Before Merge

| # | Specialist | Location | Title | Impact | Fix |
|---|-----------|----------|-------|--------|-----|
| 1 | clean-code-solid | [src/services/auth.ts:15](src/services/auth.ts#L15) | DIP: AuthService imports PrismaClient directly | Untestable without DB; violates dependency inversion | Inject repository interface via constructor |
| 2 | test-quality | src/services/auth.ts | Missing unit tests for token refresh | Refresh logic untested; regression risk | Add tests for expired, valid, and malformed tokens |

### Minor — Advisory

| # | Specialist | Location | Title | Fix |
|---|-----------|----------|-------|-----|
| 1 | language-quality | [src/utils/jwt.ts:8](src/utils/jwt.ts#L8) | `any` return type on `decodeToken` | Add `DecodedToken` return type |
| 2 | documentation-quality | README.md | — | No auth setup instructions | Add "Authentication" section with env vars |

## Strengths

- **[security]** All passwords hashed with bcrypt (cost 12); no plaintext storage
- **[clean-code-solid]** Clean SRP: each auth concern in its own module
- **[test-quality]** Login flow has 6 test cases covering happy path, invalid credentials, and lockout

## Tool Results

| Tool | Status | Findings | Specialist |
|------|--------|----------|-----------|
| tsc | PASS (0 errors) | — | language-quality |
| eslint | FAIL (3 issues) | 2 warnings, 1 error | clean-code-solid |
| semgrep | PASS | — | security |
| npm audit | SKIP (not installed) | — | dependency-supply-chain |

## Specialist Results

| Specialist | Status | C | I | M | Key Finding |
|-----------|--------|---|---|---|-------------|
| clean-code-solid | FAIL | 0 | 1 | 0 | DIP violation in AuthService |
| architecture-design | PASS | 0 | 0 | 0 | Clean layering |
| test-quality | FAIL | 0 | 1 | 0 | Missing refresh token tests |
| security | FAIL | 1 | 0 | 0 | SQL injection in auth handler |
| error-resilience | PASS | 0 | 0 | 0 | Good error propagation |
| initialization-hygiene | PASS | 0 | 0 | 0 | No stubs or TODOs |
| language-quality | PASS | 0 | 0 | 1 | Minor type annotation gap |
| performance | PASS | 0 | 0 | 0 | Indexed queries |
| data-validation | PASS | 0 | 0 | 0 | Zod schemas at boundary |
| api-design | PASS | 0 | 0 | 0 | RESTful conventions followed |
| documentation-quality | PASS | 0 | 0 | 1 | Missing auth docs |
| release-readiness | NO-GO | — | — | — | Gate 6 (Security) FAIL |

## Release Gates

| # | Gate | Status | Blockers |
|---|------|--------|----------|
| 1 | SOLID & Clean Code | FAIL | 1 Important (DIP) |
| 2 | Error Handling | PASS | — |
| 3 | Type Safety | PASS | — |
| 4 | Test Coverage | FAIL | 1 Important (missing tests) |
| 5 | Architecture | PASS | — |
| 6 | Security | FAIL | 1 Critical (SQL injection) |
| 7 | Documentation | PASS | — |
| 8 | Domain Quality | PASS | — |

## Coverage

| File | Reviewed By |
|------|-----------|
| src/api/auth.ts | clean-code-solid, security, api-design, language-quality |
| src/services/auth.ts | clean-code-solid, architecture-design, error-resilience, test-quality |
| src/utils/jwt.ts | language-quality, security |
| src/models/user.ts | data-validation, architecture-design |
| prisma/schema.prisma | data-validation |
| src/middleware/auth.ts | security, api-design |
| src/tests/auth.test.ts | test-quality |
| README.md | documentation-quality |
```

---

## JSON Schema

When `format=json` or auto-detected as tool context, produce this exact structure:

```json
{
  "verdict": "GO | NO-GO | CONDITIONAL",
  "summary": {
    "description": "What was reviewed",
    "range": {
      "base": "abc1234",
      "head": "def5678"
    },
    "mode": "diff | full",
    "files_changed": 8,
    "stack": ["TypeScript", "React", "Prisma"],
    "specialists_dispatched": 12,
    "specialists_total": 476,
    "scope": {
      "dirs": null,
      "langs": null,
      "frameworks": null,
      "reviewers": null,
      "severity_filter": null,
      "gates_filter": null
    }
  },
  "methodology": {
    "SRP": "PASS",
    "OCP": "PASS",
    "LSP": "N/A",
    "ISP": "PASS",
    "DIP": "FAIL",
    "DRY": "PASS",
    "KISS": "PASS",
    "YAGNI": "PASS"
  },
  "issues": [
    {
      "id": 1,
      "severity": "critical",
      "specialist": "security",
      "file": "src/api/auth.ts",
      "line": 42,
      "title": "SQL injection in login query",
      "description": "String interpolation in SQL query allows attacker to extract database contents",
      "impact": "Data breach — full database readable by unauthenticated attacker",
      "fix": "Use parameterized query: prisma.$queryRaw(Prisma.sql`...`)",
      "principle": "OWASP A03 Injection"
    },
    {
      "id": 2,
      "severity": "important",
      "specialist": "clean-code-solid",
      "file": "src/services/auth.ts",
      "line": 15,
      "title": "DIP: AuthService imports PrismaClient directly",
      "description": "Direct dependency on Prisma makes AuthService untestable without a database",
      "impact": "Cannot unit test authentication logic in isolation",
      "fix": "Inject a UserRepository interface via constructor",
      "principle": "DIP"
    }
  ],
  "strengths": [
    {
      "specialist": "security",
      "description": "All passwords hashed with bcrypt (cost 12); no plaintext storage"
    }
  ],
  "tool_results": [
    {
      "name": "tsc",
      "status": "pass",
      "findings": 0,
      "specialist": "language-quality",
      "output_summary": null
    },
    {
      "name": "npm-audit",
      "status": "skipped",
      "reason": "not installed",
      "specialist": "dependency-supply-chain"
    }
  ],
  "specialists": [
    {
      "id": "security",
      "status": "fail",
      "critical": 1,
      "important": 0,
      "minor": 0,
      "key_finding": "SQL injection in auth handler"
    }
  ],
  "gates": [
    {
      "number": 1,
      "name": "SOLID & Clean Code",
      "status": "FAIL",
      "blockers": 1
    }
  ],
  "coverage": [
    {
      "file": "src/api/auth.ts",
      "reviewers": ["clean-code-solid", "security", "api-design", "language-quality"]
    }
  ]
}
```

### Field Rules

- `verdict`: exactly one of `GO`, `NO-GO`, `CONDITIONAL`
- `summary.description`: string
- `summary.files_changed`: integer
- `summary.specialists_dispatched`: integer (count of leaves dispatched in Step 6 of `code-reviewer.md`)
- `summary.specialists_total`: integer (count of leaves under `reviewers.wiki/`, queried at runtime — do not hard-code)
- `summary.mode`: `diff` or `full`
- `summary.scope`: all fields `null` when no scope filters; array of strings when filtered
- `summary.scope` field mapping from arguments: `scope-dir` → `dirs`, `scope-lang` → `langs`, `scope-framework` → `frameworks`, `scope-reviewer` → `reviewers`, `scope-severity` → `severity_filter`, `scope-gate` → `gates_filter`
- `issues[].severity`: exactly one of `critical`, `important`, `minor` (lowercase)
- `issues[].line`: integer or `null` if not applicable
- `issues[].principle`: string or `null`
- `strengths[].specialist`: string — leaf id from `reviewers.wiki/`, kebab-case, matches the leaf's `id:` frontmatter field
- `specialists[].status`: exactly one of `pass`, `fail` (lowercase)
- `specialists[].critical`, `.important`, `.minor`: integer (non-negative)
- `gates[].status`: exactly one of `PASS`, `FAIL`, `N/A` (uppercase)
- `tool_results[].status`: exactly one of `pass`, `fail`, `skipped` (lowercase)
- `tool_results[].reason`: string, present only when status is `skipped`
- `tool_results[].findings`: integer or `null`
- `tool_results[].specialist`: string — leaf id from `reviewers.wiki/` that declared this tool
- All arrays may be empty but must be present (no omission)

### YAML Output (reserved)

`format=yaml` is reserved for a future PR that bundles a YAML serializer. The current `emit-stdout.mjs` handler treats it as unimplemented: it emits a stderr notice and falls back to markdown. When the serializer lands, the output structure will be the JSON form translated into YAML syntax, with the same fields and rules.
