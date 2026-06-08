# Code Review Orchestrator: Design Rationale

> **Audience: humans designing or evolving this skill.** This document is the
> step-by-step intent narrative for the FSM-driven orchestrator. It is **not**
> a runtime spec, and an LLM running the skill must **not** read it: the
> runtime contract is code (see the table below), and the LLM-facing entry
> point is `../SKILL.md` at the repo root. v3 builds the review on the
> `ctxr-fsm` (Python) state machine. The legacy Node review runner is gone;
> a review executes either through the LLM-orchestrated FSM (the LLM drives
> the MCP `fsm.*` surface) or through the in-process Python runner
> (`python -m code_review.cli review ...`, see [programmatic-runner.md](programmatic-runner.md)).
> If you arrived here while running a review, stop and re-read `SKILL.md`,
> you are on the wrong path.
>
> The eleven Steps below describe what each FSM state *does* in human terms.
> Each Step carries a callout naming its FSM state id and the handler / worker
> that implements it. Read this for understanding; the code is authoritative.

## What the orchestrator does (conceptually)

It coordinates a team of specialised code reviewers selected from a wiki of ~476 leaves at `reviewers.wiki/`. The flow: parse arguments, scan the project, descend the wiki tree to select relevant specialists, dispatch them in parallel, collect findings, verify coverage, and produce a unified report with a GO/NO-GO verdict.

The orchestrator does NOT review code itself, it scans, routes, collects, deduplicates, verifies, and reports.

## Runtime contract

**This document describes intent. The runtime contract is code.**

| Layer | File | Role |
|---|---|---|
| State machine | [`code_review/spec.py`](../code_review/spec.py) | Authoritative state transitions, preconditions, outputs, worker response schemas, a Pydantic `FsmSpec` literal. |
| Runner | [`ctxr-fsm`](https://github.com/ctxr-dev/fsm) (Python, MCP) | The LLM orchestrator drives the FSM through `fsm.start_run` + `fsm.get_brief` + `fsm.commit_outputs`. Inline states advance server-side; workers pause for LLM dispatch. |
| Inline-state handlers | [`code_review/handlers.py`](../code_review/handlers.py) | Deterministic Python implementations of each non-worker step. (Most are pure-in/pure-out; `write_run_directory` and `emit_stdout` intentionally perform side effects, filesystem writes and stdout/stderr, but each remains byte-deterministic given identical inputs.) |
| Worker prompts | [`code_review/workers/*.md`](../code_review/workers/) | LLM-judgement steps. Six worker roles: `project-scanner`, `tree-descender`, `trim-candidates`, `tool-runner`, `specialist-batch` (per-leaf prompt is the leaf body), `finding-ranker`. |
| Verifier prompts | [`code_review/verifiers/*.md`](../code_review/verifiers/) | Adversarial panel (3 votes, 2-of-3 quorum, fail-closed) gating five worker states. See [verifier-panel.md](verifier-panel.md). |
| Activation gate | `handle_activate_leaves` in [`handlers.py`](../code_review/handlers.py) | Deterministic file_globs / keyword_matches / structural_signals / escalation_from evaluation. Runs as the `activate_leaves` inline state so the orchestrator never has to trust an LLM-eyeballed activation_match. |
| Report shape | [`report-format.md`](../report-format.md) | Canonical JSON / markdown report contract, what `report.json` and `report.md` look like. |

**The eleven prose Steps below are not the runtime spec.** They document what each FSM state *does* in human terms. Each Step now carries a callout naming its FSM state id and the handler / worker that implements it. Read the prose to understand intent; trust the linked code for what actually executes.

### Complete state map (19 states)

The authoritative count is `len(fsm.states)` in [`code_review/spec.py`](../code_review/spec.py) (exposed as `state_count`). The eleven narrative Steps cover the main flow; the table below is the full set, including the inline planner / merge / rank / edge states the prose folds in. "Gated" means an adversarial verifier panel runs on that state (see [verifier-panel.md](verifier-panel.md)).

| State | Kind | Implemented by | Notes |
|---|---|---|---|
| `scan_project` | worker (gated) | `project-scanner` | Step 1 |
| `risk_tier_triage` | inline | `handle_risk_tier_triage` | Step 2; may short-circuit |
| `activate_leaves` | inline | `handle_activate_leaves` | deterministic activation gate |
| `tree_descend` | worker (gated) | `tree-descender` | Step 3 |
| `llm_trim` | worker (gated) | `trim-candidates` | Step 4; coverage floor backstop |
| `tool_discovery` | worker (gated) | `tool-runner` | Step 5; only degradable worker |
| `plan_specialist_batches` | inline | `handle_plan_specialist_batches` | deterministic batch planner |
| `dispatch_specialists` | loop worker | `specialist-batch` | Step 6; not verifier-gated |
| `merge_specialist_outputs` | inline | `handle_merge_specialist_outputs` | enforces no-missed-file |
| `collect_findings` | inline | `handle_collect_findings` | Step 7; dedup + semantic merge. See [ranker-and-dedup.md](ranker-and-dedup.md) |
| `rank_findings` | worker (gated) | `finding-ranker` | LLM second opinion + selectivity. See [ranker-and-dedup.md](ranker-and-dedup.md) |
| `verify_coverage` | inline | `handle_verify_coverage` | Step 8 |
| `synthesize_release_readiness` | inline | `handle_synthesize_release_readiness` | Step 9; gate verdict. See [gate-predicates.md](gate-predicates.md) |
| `write_run_directory` | inline | `handle_write_run_directory` | Step 10; sharded run dir |
| `emit_stdout` | inline | `handle_emit_stdout` | Step 11 |
| `short_circuit_exit` | inline | `handle_short_circuit_exit` | trivial-tier fast path to the run dir |
| `stage_a_empty` | inline | `handle_stage_a_empty` | no activated leaves, clean exit |
| `verifier_stuck` | inline | `handle_verifier_stuck` | 3 same-state rejections, degraded-but-completing |
| `terminal` | terminal | (none) | end |

### Subsystem deep-dives

This document is the orchestration narrative. For the runtime subsystems:

- [programmatic-runner.md](programmatic-runner.md): the in-process runner, AIMD concurrency, fault tolerance, coverage floor, degradable workers.
- [cli-and-dispatch.md](cli-and-dispatch.md): the `review` CLI and the agent-agnostic backends (claude / codex / cursor / anthropic / openai), prompt loading, tier routing.
- [ranker-and-dedup.md](ranker-and-dedup.md): the two-stage `collect_findings` + `rank_findings` design (the precision lever).
- [verifier-panel.md](verifier-panel.md): the adversarial verifier panel and `verifier_stuck`.
- [gate-predicates.md](gate-predicates.md): the eight release-readiness gates and the GO / NO-GO verdict.
- [benchmarks.md](benchmarks.md): benchmark methodology, the harness, and the no-regression gate.
- [SCHEMA.md](SCHEMA.md): the reviewer-leaf v2 frontmatter contract and `reviewers.layout.yaml`.

> **FSM substrate.** The engine + MCP surface live in the standalone [`ctxr-fsm`](https://github.com/ctxr-dev/fsm) Python package; the project DB at `.ctxr-fsm/fsm.db` stores runs / events / commit signatures. See [`ctxr-dev/fsm/docs/`](https://github.com/ctxr-dev/fsm/tree/main/docs) for the substrate documentation. The Markdown narrative below documents the action body of each state in human terms; the Pydantic `FsmSpec` literal in [`code_review/spec.py`](../code_review/spec.py) is the machine-readable contract for state transitions, preconditions, outputs, and worker response schemas.

## Context

**Description:** {DESCRIPTION}
**Plan/Requirements:** {PLAN_REFERENCE}
**Arguments:** {ARGS}

## Argument Parsing

Parse `{ARGS}` as space-separated `key=value` pairs. Flags without values are boolean true.

If `help` is present: read `report-format.md`, print the Arguments table, stop. Do not run a review.

Validate `base` and `head` values: reject any value containing spaces, semicolons, pipes, backticks, or shell metacharacters. Allow only `^[a-zA-Z0-9_./@~^{}-]+$`. This prevents injection into git commands.

Resolve arguments per the full specification in `report-format.md` (Arguments section). Key defaults: `format=auto`, `base=auto` (merge-base with origin/main), `head=HEAD`.

The orchestrator runs as eleven sequential steps. Each step has defined inputs and outputs. Do not skip steps. Do not reorder steps. Each step's outputs feed the next step's inputs.

---

## Step 1: Deep Project Scan

> **Action body for FSM state `scan_project`.** Worker: [`code_review/workers/project-scanner.md`](../code_review/workers/project-scanner.md) (role: `project-scanner`). The runner is authoritative; this prose documents intent.

Build a **Project Profile** that every later step consumes. Respect `scope-*` arguments.

### File Discovery

If `full` mode:

- `git ls-files`, all tracked source files.
- If `scope-dir` is set, filter to files under those paths.

If diff mode (default):

- `git diff --name-only {base}..{head}`, changed files.
- `git diff --stat {base}..{head}`, line counts per file.
- If `scope-dir` is set, filter to files under those paths.

Always run the language census:

```bash
git ls-files | awk -F. '{print tolower($NF)}' | sort | uniq -c | sort -rn | head -20
```

### Manifest and Config Reads (run in parallel)

Read these files when present (use Glob to find, Read to extract):

**Runtime versions:**

- `.nvmrc`, `.node-version` → Node.js
- `rust-toolchain.toml` → Rust
- `.python-version`, `pyproject.toml` `[project.requires-python]` → Python
- `go.mod` first line `go X.Y` → Go
- `.java-version`, `.sdkmanrc` → Java
- `build.sbt` `scalaVersion`, `.scala-version` → Scala
- `.tool-versions` → asdf

**Dependencies (extract `dependencies` + `devDependencies`):**

- `package.json` (root + workspace packages)
- `pyproject.toml` `[project.dependencies]` + `[project.optional-dependencies]`
- `Cargo.toml` `[dependencies]`
- `go.mod` `require` block
- `Gemfile`, `pom.xml`, `build.gradle`, `build.sbt`, `build.sc`

**Monorepo detection:**

- `pnpm-workspace.yaml` → pnpm workspaces
- Root `package.json` `"workspaces"` → npm/yarn workspaces
- `Cargo.toml` `[workspace]` → Cargo workspaces
- `go.work` → Go workspaces
- `nx.json` / `turbo.json` / `lerna.json` → monorepo tooling

For monorepos: enumerate packages, read each manifest, classify as app/library/shared, mark which are affected by the diff.

**CI/CD and infrastructure:**

- Glob `.github/workflows/*.yml` → GitHub Actions
- Glob `.gitlab-ci.yml` → GitLab CI
- Glob `Dockerfile*`, `docker-compose*` → Docker
- Glob `*.tf` → Terraform
- Glob `k8s/`, `kubernetes/`, `helm/` → Kubernetes
- Glob `Pulumi.yaml`, `cdk.json` → IaC

**Build and tooling:**

- Glob `tsconfig.json`, `vite.config.*`, `webpack.config.*` → build system
- Glob `.eslintrc*`, `eslint.config.*`, `biome.json` → linters
- Glob `Makefile`, `justfile`, `taskfile.yml` → task runners

### Framework Classification

Map detected dependency names to semantic categories using this table. Categories enter the Project Profile and inform Step 3's tree descent, leaves carrying matching tags or focus-string mentions become high-priority routing candidates.

| Category | Dependency Names |
| -------- | ---------------- |
| web | next, express, fastify, @nestjs/core, django, flask, gin-gonic/gin, axum, actix-web, spring-boot, rails, hono, koa, http4s, play-framework, tapir, akka-http, pekko-http |
| orm | prisma, @prisma/client, drizzle-orm, typeorm, sequelize, sqlalchemy, gorm, diesel, knex, slick, doobie, quill |
| test | vitest, jest, pytest, playwright, cypress, @testing-library/\*, junit, testng, rspec, scalatest, munit, specs2, zio-test |
| ui | react, react-dom, vue, svelte, @angular/core, solid-js, preact |
| validation | zod, joi, yup, valibot, pydantic, class-validator, ajv, io-ts, marshmallow |
| auth | next-auth, passport, lucia, jsonwebtoken, @auth/core |
| state | zustand, redux, @reduxjs/toolkit, jotai, recoil, mobx, pinia, vuex |
| graphql | graphql, @apollo/server, type-graphql, graphql-yoga, strawberry-graphql |
| grpc | @grpc/grpc-js, grpcio, tonic, protobuf |

A `web` framework on the diff makes leaves under web/api/security clusters higher-priority candidates; a `state` library makes frontend/state-management clusters higher-priority. The wiki's leaves directly cover these frameworks (`fw-react.md`, `fw-django-rails.md`, etc.), they get activated by the leaf-level `activation:` gate during Step 3.

### Project Profile Output

Produce a compact profile block:

```text
=== PROJECT PROFILE ===
repo: <name>

[languages]
 <lang> <percent>% (<runtime version> via <source>)

[frameworks]
 <category>: <name>@<version>, ...

[structure]
 <type> (<tool>), <N> packages
 <path> (<description>) [AFFECTED]

[infra]
 ci: <system>
 container: <tools>
 iac: <tools>

[build]
 build: <tools>
 lint: <tools>
=== END PROJECT PROFILE ===
```

**Step 1 outputs:** `project_profile`, `changed_paths`, `diff_stats` (`lines_changed`, `files_changed`).

---

## Step 2: Risk-Tier Triage

> **Action body for FSM state `risk_tier_triage`.** Inline-state handler: `handle_risk_tier_triage` in [`code_review/handlers.py`](../code_review/handlers.py). Pure-function: same `(changed_paths, diff_stats, project_profile, args) → (tier, cap, risk_signals)` for every run. The handler is authoritative; this prose documents intent.

Bucket the diff into one of four tiers. The tier sets the upper bound on specialist count and gates the short-circuit transition (the FSM moves directly from `risk_tier_triage` to `short_circuit_exit` when `tier == 'trivial'` AND `len(risk_signals) == 0` AND no scope-overrides, no Step 3 round-trip required).

### Tier rules

```text
INPUT: changed_paths, diff_stats, project_profile
OUTPUT: { tier, cap, rationale } recorded in the run manifest

trivial = lines_changed ≤ 10 AND files_changed = 1 AND no risk-path match → cap 3
lite = lines_changed ≤ 100 AND files_changed ≤ 5 AND no risk-path match → cap 8
full = lines_changed > 100 OR files_changed > 5 → cap 20
sensitive = ANY risk-path match OR ANY high-risk Project-Profile signal → cap 30
```

### Risk-path patterns

A path matches "risk" if it (case-insensitive) contains any of: `auth`, `crypto`, `secret`, `password`, `token`, `infra`, `deploy`, `migration`, `migrate`, `iam`, `rbac`, `oauth`, `jwt`, `session`, `key`, `tls`, `ssl`, `cert`, `kms`, `vault`. A path also matches "risk" if it is itself a Dockerfile, k8s manifest, Terraform file, CI workflow, or schema migration file.

### High-risk Project-Profile signals

- Schema migration files in the diff (`migrations/`, `prisma/migrations/`, alembic/flyway/atlas/knex output).
- IaC plan changes (`*.tf`, `helm/`, `k8s/`).
- Cloud-config edits (`*.cdk.ts`, `serverless.yml`, `Pulumi.yaml`).
- Dependency upgrades touching auth/crypto/HTTP libs.
- CI workflow edits that could change build/release behaviour.

### Short-circuit clause

The FSM short-circuits directly from `risk_tier_triage` to `short_circuit_exit` based on the Step 2 decision inputs alone (`tier`, `risk_signals`, `scope_overrides_present`); Step 3 does not run on this path. Concretely: `tier == trivial` AND no risk signals AND no `scope-*` override ⇒ emit empty findings, write the manifest with `short_circuited: true`, exit with GO verdict. Silence is a valid result.

### Tier-cap override

Explicit `max-reviewers=N` argument overrides the tier-default cap. The orchestrator clamps `N` to the range `[3, 50]`.

**Step 2 outputs:** `tier`, `cap`, `tier_rationale`.

---

## Step 3: Tree Descent

> **Action body for FSM state `tree_descend`.** Worker prompt: [`code_review/workers/tree-descender.md`](../code_review/workers/tree-descender.md). The activation gate runs *upstream* of this worker as the `activate_leaves` inline state (`handle_activate_leaves` in `handlers.py`), so the tree-descender worker only does the focus-descent LLM judgement on a pre-computed candidate set. The handler + worker pair is authoritative; this prose documents intent.

Walk the wiki tree at `reviewers.wiki/` to gather a candidate leaf set. Activation evaluation (file_globs / keyword_matches / structural_signals / escalation_from) is deterministic; only the parent-`focus` semantic descent calls the LLM.

### Routing model

The corpus is a hierarchical wiki. Each subcategory `index.md` carries a multi-cover `focus` string that describes what the cluster contains. Each leaf carries an `activation:` block of file globs, structural signals, and (sometimes) `escalation_from` ids. Routing is semantic descent: read parent `focus` strings, decide which branches are relevant to the current diff and Project Profile, descend, evaluate leaf `activation:` to produce candidates.

This mirrors `skill-llm-wiki`'s `guide/` routing pattern.

### Argument-driven overrides

If `scope-reviewer=<id1>,<id2>,...` is set: force-activate the named leaf ids. Resolve each id to its path under `reviewers.wiki/` by reading the root `index.md` and descending one level into each subcategory's `entries:` if needed. Forced leaves bypass the activation gate.

If `scope-lang=<l1>,<l2>,...` is set: restrict the descent to leaves whose `languages` matches one of the forced languages, plus leaves with `languages: all` or absent.

If `scope-framework=<f1>,<f2>,...` is set: restrict the descent to leaves whose `tags:` includes the forced framework name(s).

### Descent procedure

1. Read `reviewers.wiki/index.md`. Its `entries:` block lists ~59 top-level subcategories with `id`, `file`, `focus`, and (sometimes) `tags`.

2. For each top-level entry, evaluate whether to descend by matching the `focus` string semantically against the Project Profile (languages, frameworks, infra) AND against the diff's content (file types, dependency changes, code shape). Use semantic judgement; do not keyword-grep.

 - Drop branches whose focus is clearly orthogonal (e.g. a frontend cluster on a backend-only diff).
 - Keep branches that are partially or wholly relevant.
 - Keep cross-cutting branches (security, correctness, tests, docs, performance) when ANY part of the diff plausibly triggers their concerns.

3. For each retained top-level branch, read its `index.md`. If its `entries:` contain further sub-category indices (`type: index`), repeat the focus-match step. Otherwise the entries are leaves.

4. For each candidate leaf encountered, evaluate its `activation:` block:

 - `file_globs` against the changed file list.
 - `keyword_matches` against the diff body (grep).
 - `structural_signals` against the Project Profile.
 - `escalation_from`: if any listed reviewer is already a candidate, add this one too.

 ANY signal match → mark the leaf as a Step 3 candidate. If a leaf has no `activation:` block, mark it as a candidate iff its parent subcategory was retained AND its `focus` is itself a clear match against the diff.

**Step 3 outputs:** `stage_a_candidates`, list of `{ id, path, activation_match[] }`. Typical size 25-40 leaves on a non-trivial PR.

---

## Step 4: LLM Trim

> **Action body for FSM state `llm_trim`.** Worker prompt: [`code_review/workers/trim-candidates.md`](../code_review/workers/trim-candidates.md) (role: `trim-candidates`). A referential-integrity validator on the worker's output (tracked under issue [`#13`](https://github.com/ctxr-dev/skill-code-review/issues/13)) is not currently bundled into the v3 port, the engine's JSON-schema validation on the worker's `response_schema` enforces shape but not cross-field referential consistency. The worker is authoritative; this prose documents intent.

Pick the final K = `cap` leaves from Step 3's candidates with explicit per-pick justifications. One sub-agent dispatch (or inline reasoning).

### Trim prompt construction

Build the prompt with:

- The Project Profile block (from Step 1).
- A diff summary: changed-file list + first 200 lines of unified diff per file. NOT the full diff, the trim's job is selection, not review.
- The Step 3 candidate list as `id | path | focus | dimensions | tags`.
- The tier and cap.
- The instruction template:

 > Pick the K most relevant leaves for this diff. For each pick, write one sentence explaining what in the diff or Project Profile triggered the relevance, be specific about file paths or code patterns. Reject leaves whose focus is plausible but not actually triggered by the diff. Aim for diversity across `dimensions[]` so the cap covers correctness/security/tests/docs/perf rather than 20 security leaves.

### Output shape

Structured JSON:

```json
{
 "tier": "<trivial|lite|full|sensitive>",
 "cap": <K>,
 "picked": [
 { "id": "<leaf-id>", "path": "<wiki-path>", "justification": "<1 sentence>", "dimensions": ["..."] }
 ],
 "rejected": [
 { "id": "<leaf-id>", "reason": "<1 sentence>" }
 ]
}
```

### Coverage gate

Every file in the diff must be covered by ≥ 2 picked leaves, by `file_globs` match OR by content overlap with the leaf's `covers:` / `focus:`. If a file falls below 2-coverage, request the next-most-relevant rejected leaf with a "coverage rescue" justification. Document the rescue in the manifest under `routing.stage_b.coverage_rescues[]`.

### Manifest contribution

The full picked + rejected output goes into `manifest.json` under `routing.stage_b`. The justifications are the auditable coverage proof, every dispatch is traceable to a stated reason.

**Step 4 outputs:** `picked_leaves[]`, list of `{ id, path, justification, dimensions[] }`.

---

## Step 5: Tool Discovery

> **Action body for FSM state `tool_discovery`.** Worker: [`code_review/workers/tool-runner.md`](../code_review/workers/tool-runner.md) (role: `tool-runner`). The runner is authoritative; this prose documents intent.

Collect external tools declared by the picked leaves. Run available tools before specialist dispatch so their output flows into specialist prompts.

1. Collect all `tools:` entries from each picked leaf's frontmatter. Deduplicate by `name`.
2. Check availability for each tool: `which <name>`, `npx <name> --version`, or project-local detection.
3. Apply tool mode (from `tools` argument, default `silent`):
 - `silent`: run available tools, skip missing, note skips in the report.
 - `interactive`: for each missing tool, ask the user whether to install. Offer platform-appropriate methods (the AI determines options at runtime: brew, npm, pip, cargo, etc.).
 - `skip`: do not run any tools.
4. If `mode=thorough`: enable all declared tools (do not skip optional ones). Auto-select `interactive` if a user is present, `silent` if CI.
5. Execute available tools against scoped files. Prefer JSON / structured output when the tool's `command` field specifies it.
6. Store results to pass to relevant specialists in Step 6.

**Step 5 outputs:** `tool_results[]`, list of `{ name, status, findings, output, scoped_files[] }`.

---

## Step 6: Dispatch Specialists

> **Action body for FSM state `dispatch_specialists`.** Worker: [`code_review/workers/specialist-batch.md`](../code_review/workers/specialist-batch.md) (role: `specialist-batch`). This is a Loop state: each iteration dispatches one planned specialist batch (the per-leaf specialist prompt is the leaf body read from the wiki), and the loop terminates when the worker reports `loop_done=true`. The deterministic batch plan comes from `plan_specialist_batches`. The runner is authoritative; this prose documents intent.

Run all picked leaves in parallel as Agent sub-tasks.

For each picked leaf:

1. Read the leaf's instruction file from `reviewers.wiki/<resolved-path>/<id>.md`. The path was captured in Step 4, no second lookup needed.
2. Build the filtered diff:
 - In monorepos: `git diff {base_sha}..{head_sha} -- <affected-package-paths>`.
 - Otherwise: `git diff {base_sha}..{head_sha} -- <relevant-paths-for-this-specialist>`. Use the leaf's `activation.file_globs` to narrow when present.
3. Build the specialist prompt with:
 - The leaf's full markdown body.
 - The Project Profile block from Step 1.
 - The filtered diff.
 - Any tool-discovery output relevant to this leaf.
 - `{DESCRIPTION}` and `{PLAN_REFERENCE}` from this context.
4. Tell the specialist: "This project uses [frameworks from Profile]. Focus on [affected packages]. Findings should reference [the leaf's `dimensions:`] for gate aggregation."
5. Standards handling: if the leaf's body contains an `## Authoritative Standards` section with URLs, instruct: "Fetch the latest version of each listed standard URL for the most current guidance. If a URL is unreachable, use the checklist in this file as the authoritative fallback."
6. Dispatch via the Agent tool as a separate sub-agent.

Dispatch ALL specialists in parallel: emit one message with multiple Agent tool calls. Do NOT dispatch sequentially.

**Step 6 outputs:** `specialist_outputs[]`, list of per-leaf JSON findings + execution metadata.

---

## Step 7: Collect Findings

> **Action body for FSM state `collect_findings`.** Inline-state handler: `handle_collect_findings` in [`code_review/handlers.py`](../code_review/handlers.py). Dedup keyed by `(file, line, normalised_title)`; the tie-breaker breaks severity ties by the persisted `__winner` / `__origin` stamp, never by the changing `flagged_by[0]`. Pure-function: byte-identical output for byte-identical input. The handler is authoritative; this prose documents intent.

Wait for all specialists to complete. Then:

1. Collect all findings from all specialists.
2. Deduplicate: when two specialists flag the same `(file, line, normalised_title)`, keep the one with higher severity. Note which specialists both flagged it (cross-validated → higher confidence).
3. Categorise by severity: Critical > Important > Minor.
4. Count blocking issues (Critical + Important).

**Step 7 outputs:** `findings[]`, deduplicated, categorised list.

---

## Step 8: Verify Coverage

> **Action body for FSM state `verify_coverage`.** Inline-state handler: `handle_verify_coverage` in [`code_review/handlers.py`](../code_review/handlers.py). Per-leaf scope is narrowed by reading each picked leaf's `activation.file_globs[]` from its on-disk frontmatter; `coverage_rule_violated` is set when any changed file has < 2 reviewers after rescues. The handler is authoritative; this prose documents intent.

Build a coverage matrix: for every file in the diff, list which specialists reviewed it.

- Every file MUST be covered by ≥ 2 specialists.
- If any file has < 2 coverage, flag it in the report as a gap.

**Step 8 outputs:** `coverage_matrix[]`, list of `{ file, reviewers[] }`; `coverage_gaps[]`, list of files below threshold.

---

## Step 9: Synthesize Release Readiness

> **Action body for FSM state `synthesize_release_readiness`.** Inline-state handler: `handle_synthesize_release_readiness` in [`code_review/handlers.py`](../code_review/handlers.py). The eight-gate predicate match against picked leaf dimensions, the verdict computation, and the B4 hard-coverage-rule promotion to NO-GO all live in code there, the prose below describes intent. The handler is authoritative.

Apply the 8-gate release readiness framework using the deduplicated findings from Step 7. Gate-to-specialist binding is **predicate-based**, using each leaf's `dimensions:` array (passed through tree_descend's response_schema) and a tag-like signal derived from the leaf id. The runtime predicates live in `handlers._gate_matches` (referenced from `handle_synthesize_release_readiness`). Tags are not currently in the run env (the trim worker emits dimensions but not tags); the inline-state handler approximates tags from kebab-case segments of the leaf id, plus the full id, plus 2-4 segment slides, so a leaf id like `error-handling-async` matches both single-token (`error`, `handling`, `async`) and compound (`error-handling`, `handling-async`) tags. Lifting `tags:` into the env (via the trim worker's response_schema) is tracked for a later sprint.

The 7-axis dimensions taxonomy (`architecture`, `correctness`, `documentation`, `performance`, `readability`, `security`, `tests`) covers the 8 gates as follows:

| Gate | Predicate (any-of) |
|------|-------------------|
| 1, SOLID & Clean Code | dimensions ∋ `readability`; OR tags ∋ {`solid`, `dry`, `kiss`, `yagni`} |
| 2, Error Handling & Resilience | dimensions ∋ `correctness` AND tags ∋ {`error-handling`, `resilience`, `fault-tolerance`, `retry`, `circuit-breaker`} |
| 3, Code Quality & Type Safety | dimensions ∋ `correctness`; OR tags ∋ {`type-safety`, `idioms`, `dead-code`} |
| 4, Test Coverage | dimensions ∋ `tests` |
| 5, Architecture & Design | dimensions ∋ {`architecture`, `performance`}; OR tags ∋ {`api-design`, `module-boundaries`, `dependencies`} |
| 6, Security & Safety | dimensions ∋ `security` |
| 7, Documentation | dimensions ∋ `documentation` |
| 8, Domain-specific quality | tags ∋ {`cli`, `api`, `observability`, `domain-*`}; OR id matches `domain-*` / `obs-*` / `cli-*` / `api-*` |

For each gate: collect the picked leaves whose frontmatter satisfies the predicate, route their findings into that gate. A leaf may contribute to multiple gates (e.g. a security-correctness leaf with both dimensions feeds gates 6 AND 3).

Gate verdict rule: PASS if every gate-tagged Critical and Important finding is resolved; FAIL if any blocker remains; N/A if no leaf satisfies the gate's predicate.

See `release-readiness.md` (project root) for the full audit checklist per gate.

**Step 9 outputs:** `gates[]`, list of `{ number, name, status, contributing_leaves[], blocker_count }`; `verdict`. The `synthesize_release_readiness` handler emits only `GO` or `NO-GO` (`NO-GO` if any gate FAILs or the hard coverage rule is violated, else `GO`). `CONDITIONAL` is a valid report verdict but is produced by edge/degraded states (for example `stage_a_empty`), not by this gate computation.

---

## Step 10: Write Run Directory

> **Action body for FSM state `write_run_directory`.** Inline-state handler: `handle_write_run_directory` in [`code_review/handlers.py`](../code_review/handlers.py). `build_report_payload(run_id, env)` produces the canonical [`report-format.md`](../report-format.md) JSON shape (verdict / summary / methodology / issues / strengths / tool_results / specialists / gates / coverage); `write_run_artefacts` persists `report.json`, `report.md`, and updates `manifest.json`. Edge states `short_circuit_exit` and `stage_a_empty` route through this state too. The handler is authoritative; this prose documents intent.

Every review writes a sharded run-keyed directory at `.skill-code-review/<shard>/<run-id>/`. The directory is the canonical output; Step 11's stdout / return value is the human-readable report plus a pointer to the directory.

### Run-id format

```text
run-id = <YYYYMMDD>-<HHMMSS>-<hash7>
hash7 = first 7 chars of sha256(repo-name + base-sha + head-sha + run-timestamp)
shard = first 2 chars of hash7
```

Path: `.skill-code-review/<shard>/<run-id>/`.

For example: `.skill-code-review/a3/20260426-001512-a3f7c9b/`.

### Why shard

A flat directory of run-ids hits filesystem degradation around 10k entries (APFS / ext4 directory lookups slow, kernel VFS caches evict). Sharding by the first 2 hex chars of the hash gives 256 shards with bounded entries-per-shard. With 100k accumulated reviews that is ~390 entries per shard, fast lookups, no rebalance needed.

The shard prefix derives from the hash, not the timestamp, so timestamp-clustered runs (a CI burst writing 50 PRs in 5 minutes) still distribute evenly across shards.

### Files written per run

- `manifest.json`, structured execution record. See "Manifest schema" below.
- `report.md`, human-readable report, identical to what Step 11 prints to stdout.
- `report.json`, structured findings (same content as `report.md` in JSON shape per `report-format.md`).

`.skill-code-review/` is gitignored. Users can opt to commit specific run directories with `git add -f`.

### Manifest schema (`manifest.json`)

```json
{
 "run_id": "<YYYYMMDD>-<HHMMSS>-<hash7>",
 "timestamp": "<ISO-8601>",
 "repo": "<name>",
 "base_sha": "<sha>",
 "head_sha": "<sha>",
 "args": { "<arg>": "<value>", "...": "..." },

 "tier": "trivial | lite | full | sensitive",
 "tier_cap": <integer>,
 "tier_rationale": "<one sentence>",
 "short_circuited": <true|false>,

 "routing": {
 "stage_a": {
 "candidates": [
 { "id": "<leaf-id>", "path": "<wiki-path>", "activation_match": ["file_globs"|"keyword_matches"|"structural_signals"|"escalation_from", "..."] }
 ]
 },
 "stage_b": {
 "picked": [{ "id": "<leaf-id>", "path": "<wiki-path>", "justification": "<sentence>", "dimensions": ["..."] }],
 "rejected": [{ "id": "<leaf-id>", "reason": "<sentence>" }],
 "coverage_rescues": [{ "file": "<path>", "rescued_leaf": "<id>", "reason": "<sentence>" }]
 }
 },

 "specialists": [
 {
 "id": "<leaf-id>",
 "status": "completed | failed | skipped",
 "runtime_ms": <integer>,
 "tokens_in": <integer>,
 "tokens_out": <integer>,
 "finding_count": <integer>,
 "skip_reason": "<sentence-if-skipped>"
 }
 ],

 "gates": [
 {
 "number": 1,
 "name": "SOLID & Clean Code",
 "status": "PASS | FAIL | N/A",
 "contributing_leaves": ["<leaf-id>", "..."],
 "blocker_count": <integer>
 }
 ],

 "verdict": "GO | CONDITIONAL | NO-GO"
}
```

All required fields are present even when empty (e.g. `routing.stage_b.picked: []` on a short-circuited trivial review). The manifest is the coverage proof: which leaves were Stage 3 candidates, which Step 4 picked and why, which ran successfully, what each gate is composed of, and the final verdict. Every dispatch is traceable.

**Step 10 outputs:** `run_dir_path`, persisted `manifest.json`, `report.md`, `report.json`.

---

## Step 11: Stdout / Return Value

> **Action body for FSM state `emit_stdout`.** Inline-state handler: `handle_emit_stdout` in [`code_review/handlers.py`](../code_review/handlers.py). Format negotiation (`auto`/`markdown`/`json`), scope-severity / scope-gate filtering, and the canonical `Manifest: <path>` trailer all live in code there. The handler is authoritative; this prose documents intent.

Read `report-format.md` for the canonical report structure.

1. Determine format: check the `format` argument. Supported values are `markdown` and `json`; `auto` resolves to markdown when stdout is a TTY (interactive user) and JSON otherwise (piped / sub-agent). `yaml` is reserved for a future PR that bundles a serializer; passing it today emits a stderr notice and falls back to markdown.
2. If `scope-severity` is set: filter issues to only include those at or above the specified severity.
3. If `scope-gate` is set: only include the specified gates in the release readiness section.
4. If markdown: print `report.md` content; append a final line `Manifest: <run_dir_path>/manifest.json` so the user can drill in.
5. If json: print `report.json` content. The `Manifest:` pointer goes to stderr so stdout remains valid JSON for downstream parsers.

**Step 11 outputs:** stdout content; exit status.

---

## Critical Rules

**DO:**

- Run Step 1 (Deep Project Scan) before any other step.
- Run Step 2 (Risk-Tier Triage) before any LLM call. The tier sets the specialist cap and gates the short-circuit.
- Honour the short-circuit clause: when Step 2 returns `tier == trivial` AND no risk signals AND no `scope-*` override, the FSM transitions directly from `risk_tier_triage` to `short_circuit_exit` (Step 3 does not run on this path); the run exits with empty findings and a GO verdict.
- Run Step 3 (Tree Descent): an LLM worker walks by parent `focus` semantically, but the per-leaf `activation:` evaluation is deterministic (file-glob / structural-signal / escalation matching, not judgement). Output a candidate set carrying explicit activation-match reasons.
- Run Step 4 (LLM Trim) on Step 3's candidates. Each pick carries a justification. Each rejection carries a reason.
- Enforce coverage in Step 4: every file in the diff is covered by ≥ 2 picked leaves; rescue from rejected when needed.
- Run Step 5 (Tool Discovery) on the picked leaves' `tools:` declarations.
- Dispatch ALL specialists in Step 6 in parallel, one message with multiple Agent tool calls.
- Include the Project Profile in every specialist's prompt.
- Include the filtered diff (not the full diff) scoped to relevant packages.
- Verify coverage in Step 8: every file reviewed by ≥ 2 specialists.
- Aggregate findings into gates (Step 9) by the dimension/tag predicate, not by leaf-id lists.
- Treat empty findings as a valid result. Silence is precision, not failure.
- Write the manifest in Step 10 on every run, including short-circuited ones.

**DO NOT:**

- Review code yourself. You are a scanner, router, and aggregator.
- Skip any step.
- Reorder steps.
- Run Step 4 without Step 3 first. Step 4 trims; it does not enumerate from scratch.
- Let specialists see each other's findings during Step 6. They run blind in parallel.
- Read every subcategory's `index.md` in Step 3. Descend only where the parent's focus is relevant.
- Read leaf bodies to decide routing. The parent index's focus + the leaf's frontmatter has every routing signal.
- Activate every cross-cutting category. Apply the Project Profile + diff filter even for security/correctness/tests.
- Dispatch every leaf blindly. Use the cap and the predicate.
- Hard-code leaf ids in gate aggregation. Use the dimension/tag predicate.
- Produce a report without a verdict.
- Let methodology violations slide as "minor". They compound.
