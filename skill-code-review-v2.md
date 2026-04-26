# skill-code-review — Deep Rebuild via skill-llm-wiki

> **2026-04-26 status snapshot — read this before diving deeper.**
>
> **Shipped:**
> Phase 1.Z (596-file source corpus, schema, validators, 58 unit tests) ✓ commit `9f1823e`, tag `phase-3-complete`
> Phase 2 (`reviewers.wiki/` built via skill-llm-wiki, deterministic mode, 476 routable leaves under 59 subcategories, 0 errors) ✓ commit `9f1823e`
> Phase 3 (orchestrator rewired onto `reviewers.wiki/` tree-descent + predicate-based gate aggregation) ✓ commit `9f1823e`
> Sprint 1 (risk-tier triage + two-stage routing + sharded manifest) ✓ commit `4b54db5`, tag `sprint-1-complete`
>
> **Next (P0): Sprint A — FSM substrate.** The FSM substrate now lives in the standalone `@ctxr/fsm` package (sibling repo at `../fsm/`, ships at `https://github.com/ctxr-dev/fsm.git`). skill-code-review consumes the package via `git+https://github.com/ctxr-dev/fsm.git#main` (latest `main`); local sibling hacking is covered by an `npm install --save file:../fsm` override documented in `CONTRIBUTING.md`. Sprint A's work in this repo is now narrow: author `fsm/code-reviewer.fsm.yaml` + skill-specific worker prompt templates under `fsm/workers/`, add `@ctxr/fsm` as a dependency, and wire the package's CLIs into the npm scripts. Sprint B (live trace + soft-validate) ships immediately after as the second P0. The FSM design substrate, CLI reference, state-YAML schema, worker contract, and storage-layout reference all live in the FSM package's `docs/` directory.
>
> **Then (P1+):** Sprint 2 (verification judge), Sprint C (strict trace + child FSMs), Sprint 3 (corpus quality), Sprint 4 (persistent reports + scaffold). Sprint D (YAML/prose collapse) and Sprint 5 (hypothesis pre-pass) are P3 — polish or optional.
>
> **Sources of truth:**
>
> 1. [`docs/sniper-precision-review-architecture.md`](docs/sniper-precision-review-architecture.md) — investigation that defines the 6-tier architecture and the sprint backbone.
> 2. The FSM package's docs (canonical, browsable on GitHub):
>    - [`orchestration-design.md`](https://github.com/ctxr-dev/fsm/blob/main/docs/orchestration-design.md) — design substrate
>    - [`cli-reference.md`](https://github.com/ctxr-dev/fsm/blob/main/docs/cli-reference.md)
>    - [`state-yaml-reference.md`](https://github.com/ctxr-dev/fsm/blob/main/docs/state-yaml-reference.md)
>    - [`worker-contract.md`](https://github.com/ctxr-dev/fsm/blob/main/docs/worker-contract.md)
>    - [`storage-layout.md`](https://github.com/ctxr-dev/fsm/blob/main/docs/storage-layout.md)
>
>    *(For local sibling-repo checkouts these live at `../fsm/docs/*`.)*
> 3. The Sprint mapping table below — which Phase 4/5/6/7 sub-items each sprint covers.
>
> **`skill-llm-wiki` work is carved out** into the "Upstream skill-llm-wiki items" section at the bottom of this plan. Anything that requires changes to skill-llm-wiki's clustering, slug generation, or build pipeline is filed there as upstream issues for that repo to solve. skill-code-review never implements wiki-build workarounds inside this repo.

## Investigation update (2026-04-26)

### The 6-tier orchestration architecture

Five parallel sub-agent investigations converged on the same backbone for high-precision multi-specialist code review. Full detail in [`docs/sniper-precision-review-architecture.md`](docs/sniper-precision-review-architecture.md). Summary:

| Tier | Stage | Purpose | Sourced from |
|------|-------|---------|--------------|
| 0 | Project Profile | Languages, frameworks, monorepo structure, CI/IaC (existing in Step 0 of `code-reviewer.md`) | Existing |
| 1 | Risk-tier triage | Bucket the diff: trivial / lite / full / sensitive. Per-tier specialist cap. Skip pipeline on trivial-no-signal. | Cloudflare's production architecture |
| 2 | Hybrid routing | Stage A: existing wiki-tree descent + activation gate (deterministic, cheap). Stage B: one small LLM call picks final K from candidates with explicit per-pick justification (which doubles as coverage proof). | CodeRabbit, Greptile, Cursor |
| 3 | Hypothesis pre-pass *(optional)* | "What could go wrong on this diff?" One LLM call generates risk hypotheses; each maps to ≥ 1 selected specialist. Surfaces coverage gaps. | Baz.co |
| 4 | Parallel blind specialists | K Agent sub-tasks in one message. Each gets its leaf body + filtered diff + Project Profile + "What NOT to flag" guardrails + a logical-certificate scaffold (premise → execution path → conclusion). NO cross-talk between specialists. | arxiv 2509.01494, Meta SemiFormalReasoning, Cloudflare |
| 5 | Verification judge | Single sub-agent re-reads cited code for each finding; drops unsupported claims; merges near-duplicates; applies severity = severity × agreement (single-source criticals get demoted unless the leaf is high-confidence on its dimension). | CodeRabbit, Cursor v1, Snyk Code, Calimero |
| 6 | Report synthesis | Run-id-keyed `.skill-code-review/<run-id>/` directory: `manifest.json` (specialist-execution log), `findings.sarif` (tooling), `report.md` (human), optional per-leaf detail. 8-gate aggregation by dimension predicate. Empty findings is a valid result. | Cloudflare, OASIS SARIF, GitHub docs |

### Sprint sequencing and mapping to original Phase 4–7

| Sprint | Priority | What | Original sub-items folded in |
|--------|----------|------|------------------------------|
| **Sprint A** — FSM consumer wiring | **P0** | Author `fsm/code-reviewer.fsm.yaml` + skill-specific worker prompts under `fsm/workers/`. Consume `@ctxr/fsm` via `git+https://github.com/ctxr-dev/fsm.git#main` (always tracking the FSM package's `main`); `file:../fsm` is a documented local-only override for sibling-repo development. Wire `validate:fsm` into `package.json` scripts now (invokes the package's `fsm-validate-static` CLI); the runtime CLIs (`fsm-next`, `fsm-commit`, `fsm-inspect`) are usable directly via `npx` and ship as `node_modules/.bin/` symlinks once the dep installs — they will be wired into named npm scripts when an actual run loop lands in Sprint B. Add `.fsmrc.json` with the canonical `fsms[]` array (single entry: `fsm_path: fsm/code-reviewer.fsm.yaml`, `storage_root: .skill-code-review`). Engine itself ships from `@ctxr/fsm`; design + reference docs live there too. | None — depends only on the FSM package |
| **Sprint 1** — Routing precision (shipped 2026-04-26, commit `4b54db5`, tag `sprint-1-complete`) | P1 | Risk-tier triage + two-stage routing + sharded manifest | 5.0, 5.1, 5.12, 5.13 |
| **Sprint B** — Hallucination-mitigation hardening (orchestrator-driver + deterministic inline states + runtime checks) | **P0** | Wire the FSM engine to actually drive runs (today `code-reviewer.md` is prose Claude reads; the FSM YAML validates structure but doesn't control live execution). Replace prose-only "deterministic" claims on Steps 7/8/9 (and the activation-gate half of Step 3) with real Node modules invoked by the runner. Enforce the coverage rule (≥2 specialists per file) at the engine level. Add a reproducibility golden-fixture test. Depends on FSM-side runtime evaluation of `preconditions[]` + `post_validations[]` (today both are declarative-only stubs). See **Sprint B detailed scope** below. | Depends on FSM upstream items F1–F5 |
| **Sprint 2** — Quality lever | P1 | Verification judge pass + severity × agreement | 5.6, 5.11 |
| **Sprint C** — Strict trace + child FSMs | P1 | Trace-validate violations downgrade verdict; specialists + judge get child FSMs (FSM package v0.3 child-FSM contract). | None — depends on FSM package v0.3 |
| **Sprint 3** — Corpus quality | P2 | Explicit `dimensions:` field to all source files; tag casing; populate `tools:`; `escalation_from` chains | 5.2, 5.3, 5.4, 5.10, 5.14 |
| **Sprint 4** — Persistent reports + scaffold | P2 | SARIF + Markdown dual output; logical-certificate prompt scaffold | Phase 4 entire (4.1 through 4.9), 5.5, 5.7, 5.8 |
| **Sprint D** — YAML/prose collapse | P3 | Generator script (FSM package v0.4): prose sections of `code-reviewer.md` regenerated from `fsm/code-reviewer.fsm.yaml`; YAML becomes single source of truth. | None — depends on FSM package v0.4 |
| **Sprint 5** — Hypothesis pre-pass | P3 (optional) | Tier 3 hypothesis pre-pass — only if Sprints 1–4 leave residual misses | None |

**Priority key.** P0 is shippable next; nothing else gates on this finishing. P1 is shippable after the P0s land in any order. P2 is corpus / report enrichment; valuable but not blocking. P3 is optional or polish.

**Why FSM is P0.** Drift in long iterations is structural (the orchestrator can skip steps, reorder, miss decision branches, hallucinate states). The deeper the orchestrator gets — Sprint 2's verification judge, Sprint 3's larger corpus, Sprint 4's report enrichments — the more drift surface there is. Shipping FSM first means every later sprint inherits the structured-emit protocol from day one, instead of being retrofitted.

### Sprint B — detailed scope (P0, in-flight)

The current state honesty: the FSM YAML is structurally validated (`validate:fsm` passes, 14 states, 0 errors) and the engine's libraries are tested upstream (88 tests in `@ctxr/fsm`). But **today no script in skill-code-review calls `fsm-next` / `fsm-commit` to drive a live review** — when a user invokes `/skill-code-review`, Claude reads `code-reviewer.md` and walks the prose. The FSM is a design contract with executable static validation; it is not yet the runtime substrate.

That gap is the largest hallucination surface the skill currently has. Several state-spec invariants (`post_validations[]`, `preconditions[]`) are declarative-only — the engine writes them into the trace but does not evaluate them. Several "deterministic" inline states (Step 3 activation gate, Step 7 dedup, Step 8 coverage matrix, Step 9 gate predicate matching) are described as deterministic in the FSM YAML but are computed by Claude reading prose, not by code. Two runs of the same diff can therefore produce different routing, different dedup, different coverage matrix, different gate aggregation.

**Sprint B closes this gap.** Skill-side and FSM-side work below; FSM-side items live as issues on `ctxr-dev/fsm` (the engine repo).

#### Skill-side checkboxes (this repo)

- [ ] **B1. Orchestrator-driver runner.** Add `scripts/run-review.mjs` that takes `{base, head, args}`, calls `fsm-next` to get the brief, dispatches to either a worker (Claude sub-agent) or a Node module (deterministic inline state), posts the output, calls `fsm-commit`, loops to terminal. Wire as `npm run review`. The runner is the canonical entry point; `code-reviewer.md`'s prose becomes advisory documentation of what each step *means*, not what an LLM hand-walks.
- [ ] **B2. Deterministic inline-state Node modules.** Implement `scripts/inline-states/{risk-tier-triage,collect-findings,verify-coverage,synthesize-release-readiness,short-circuit-exit,stage-a-empty,write-run-directory}.mjs`. Each is a pure function `(stateInputs) → stateOutputs`. The runner from B1 invokes the matching module when the FSM brief signals an inline state. Tests cover the dedup rules, the per-file coverage matrix, the 8-gate predicate, the verdict computation.
- [ ] **B3. Hybrid Tree Descent.** Split Step 3 into a deterministic activation-matching layer (`file_globs` against `changed_paths`, `structural_signals` against `project_profile` — both pure code in `scripts/inline-states/leaf-activation.mjs`) and a single LLM judgement layer for the parent-`focus` semantic descent. The LLM no longer evaluates `activation:` blocks — those become byte-reproducible. Today's `tree-descender.md` worker shrinks to "decide which top-level subcategories to descend into".
- [ ] **B4. Coverage-rule enforcement at engine level.** `verify-coverage.mjs` (B2) hard-fails the run when any changed file falls below 2-specialist coverage and `coverage_rescues[]` did not lift it back. Today the rule is documented in `code-reviewer.md` and `trim-candidates.md` only; the schema accepts violations.
- [ ] **B5. Reproducibility golden-fixture test.** `tests/integration/reproducibility.test.js` runs `scripts/run-review.mjs` twice against a frozen fixture diff, asserts identical `manifest.json` modulo timestamps + `run_id`. Surfaces any residual non-determinism (target zero on the deterministic states; LLM trim is allowed to vary but justifications must remain non-empty).
- [ ] **B6. `code-reviewer.md` reframed as state-action reference.** Each Step section gets a header callout: "Action body for FSM state `<id>` — invoked by `scripts/run-review.mjs` via the FSM engine. The runner is authoritative; this prose documents intent." The 11-step pipeline narrative stays for human readers; the runtime contract is the FSM YAML + the runner.

#### FSM-side dependencies (issues on `ctxr-dev/fsm`)

These items unblock B1–B4 and land as separate PRs on the engine repo. Tracked as GitHub issues; bump the dep SHA in `package.json` when each merges.

- [ ] **F1. Runtime preconditions evaluation** — [`ctxr-dev/fsm#1`](https://github.com/ctxr-dev/fsm/issues/1). Today `writeEntryTrace` records the preconditions strings but does not execute them. Extend `fsm-engine.mjs` so the runner blocks state entry when a precondition predicate evaluates false (or warn-only in soft-validate mode per F4). Predicates reuse the existing `evaluatePredicate` DSL.
- [ ] **F2. Runtime post-validations evaluation** — [`ctxr-dev/fsm#2`](https://github.com/ctxr-dev/fsm/issues/2). `runPostValidations` returns `valid: true` with a stub note. Implement real evaluation against the run env. Failed post-validations write a fault trace and short-circuit the transition.
- [ ] **F3. `script:` field on state schema** — [`ctxr-dev/fsm#3`](https://github.com/ctxr-dev/fsm/issues/3). Add an optional `script:` block (mutually exclusive with `worker:`) declaring a Node module path for deterministic inline states. The engine's runner pattern dispatches to that script and validates its output against `response_schema` (or a separate `output_schema` if cleaner). Today inline states are orchestrator-glue; F3 makes them first-class.
- [ ] **F4. Soft-validate vs strict-validate run modes** — [`ctxr-dev/fsm#4`](https://github.com/ctxr-dev/fsm/issues/4). A run-time flag (`--mode soft|strict`) controls whether precondition / post-validation failures warn or abort. Soft is Sprint-B default; strict is Sprint-C goal once the corpus has settled.
- [ ] **F5. Orchestrator-loop reference doc** — [`ctxr-dev/fsm#5`](https://github.com/ctxr-dev/fsm/issues/5). Add `docs/orchestrator-loop.md` to the FSM package showing the canonical consumer pattern (the loop B1 implements). Future skill consumers — and any other FSM-driven agent — copy from this.

The earlier Sprint B description ("`fsm-validate-trace` on every run, warn-only") becomes a sub-piece of F4 (soft-validate mode). Sprint C's "strict trace + child FSMs" remains P1 and lands after F1–F4 are operational.

### Items NOT superseded (preserved as-is from original Phase 4–7)

The following original sub-items remain valid and unchanged. They get implemented in their listed sprints:

- **Phase 4** — entire phase. Output schema enrichments (4.1.1 through 4.1.16), top-level report additions (4.2.1 through 4.2.10), verdict vocabulary (4.3), arguments (4.4), output formatters (4.5), markdown layout (4.6), interactive save prompt (4.7), deterministic help pipeline (4.8), closeout (4.9). All folded into Sprint 4.
- **Phase 6** — build/validate scripts. 6.1 (dual-mode `index-build.mjs`) is **OBSOLETE** since legacy `reviewers/` is gone; the rest (6.2–6.9) folds into Sprint 3 or Sprint 4 closeout.
- **Phase 7** — most items already done in this session (cleanup deletes; SKILL.md/README.md/CONTRIBUTING.md refresh). Remaining: version bump (7.5), final self-review (7.6), legacy-deletion confirmation (7.7) — already deleted with user approval.

### Hard guard-rails surfaced by the investigation

These are anti-patterns observed across multiple SOTA tools. They go into the orchestrator's "Critical Rules" section as DON'Ts:

1. **No multi-agent cross-talk.** Specialists run blind in parallel; arxiv 2509.01494 shows cross-talk hurts F1 by error propagation.
2. **No N-pass ensemble + majority voting.** Cursor abandoned 8-pass voting because single-agent tool-use beat it. With 476 leaves we have ensemble diversity baked in.
3. **No pure-LLM router.** Always prefilter deterministically first (Stage A). Stage B's small LLM call only trims; it does not enumerate from scratch.
4. **Empty findings is a valid result.** GitHub Copilot is silent on 29% of reviews. Build that affordance into the aggregator — silence is precision, not failure.

## Original context (preserved for historical reference)

`skill-code-review` is the workspace's code-review specialist system. Today it has **18 concern-based reviewers** (security, perf, test-quality, etc.), **6 thin language overlays** (TS/Python/Go/Rust/Java-Kotlin/Scala — 43–87 lines each), **17 framework overlays** and **4 infra overlays**. Routing is index-based via `reviewers/index.yaml` (auto-generated from frontmatter). The orchestrator (`code-reviewer.md`, ~330 lines) reads only the index for dispatch.

> **As of 2026-04-25** all the above is **historical** — the legacy 18-reviewer + 27-overlay system was deleted in commit `9f1823e`, replaced by the 476-leaf `reviewers.wiki/` corpus. Sections that follow describe the *original* design intent; consult the investigation update above for current direction.

**Why a rebuild is needed:**

1. **Per-language depth is shallow.** Languages share one `language-quality.md` reviewer with one section per language, plus 50-line overlays. A "super-detailed" Python/Go/Swift reviewer cannot live inside that.
2. **Major review domains are missing entirely**: design patterns (GoF/concurrency/integration), anti-patterns (god-object, distributed monolith, patternitis…), DDD (strategic + tactical), distributed-systems specifics (saga, eventual consistency), frontend accessibility (WCAG), mobile platforms, modern data-architecture (CDC/sharding/migrations), threat-modeling (STRIDE), and many `archman.dev` topics that map cleanly to review specialists.
3. **No Swift, no JavaScript-as-distinct-from-TypeScript, no C#/Ruby/PHP/Dart/C++** at all.
4. **Structure is flat by concern.** It hasn't been through a wiki-optimizer pass, so it has the redundancy and overlap that `skill-llm-wiki`'s MERGE/NEST/DESCEND/DECOMPOSE operators are designed to remove.
5. **No cloud-platform, AI/ML, or domain-vertical coverage.** Real-world projects almost always run on a cloud (AWS/GCP/Azure/Cloudflare/Vercel/Fly), increasingly include LLM/RAG/agent code, and live in domains (fintech, healthtech, e-commerce, gaming, IoT, real-time, blockchain) with their own well-known footguns. None of this exists today.
6. **No deeper database / ORM / migration / cache coverage.** Postgres, MySQL, SQLite, MongoDB, Redis, DynamoDB, ClickHouse, Elasticsearch, vector DBs, BigQuery, Snowflake — each has a distinct correctness/perf failure mode. Today's `data-validation` and `performance` reviewers cover none of this specifically.
7. **No deeper DevOps / CI-CD / container / IaC coverage.** Beyond the four thin overlays (docker, github-actions, terraform, k8s) there's no review for image hardening, k8s manifest correctness, helm quality, GitOps discipline, pipeline secrets, merge-queue discipline, SBOM/SLSA/sigstore, or admission-control policy.
8. **No "subtle bugs / footguns" coverage.** Cross-cutting hazards — time-zone handling, monetary precision, encoding/normalization, floating-point traps, integer overflow, ReDoS, TOCTOU, hash-collision DoS, locale/collation, bidi/RTL — fall through every existing reviewer.
9. **Output format is missing high-value fields**: confidence per finding, CWE/CVE/CAPEC references, compliance tags (PCI/HIPAA/GDPR/SOC2), effort estimate, auto-fixable flag, suggested-patch diff blocks, related-finding links, code excerpts, project-profile detail, test-gap and doc-gap reports, reviewer execution metadata, rerun recipes, stable finding IDs, SARIF export. See "Output format & report enhancements" below for the full gap analysis.
10. **No tiered execution or composition discipline.** Every activated reviewer runs at full depth. There is no "always-on cheap pass + signal-driven deep pass" ladder, no token budget per dispatch, no streaming, no body sectioning gated on diff content, no result deduplication when multiple reviewers find the same root cause. See "Structural & efficiency improvements" below.

**Outcome:** A **fully redesigned reviewer corpus** (concern + language + domain), authored as flat source content with rich frontmatter, then **passed through `skill-llm-wiki build` to produce a sibling `reviewers.wiki/`** that is hierarchically optimized by the wiki operators. The orchestrator is rewired to dispatch off the new wiki. Maximum optimization quality (Tier 1 + Tier 2 wiki-runner sub-agent) per the workspace memory.

### ⚠ Full-coverage mandate (executor must always follow)

**`archman.dev/docs` is a starting taxonomy, not a ceiling.** If the executor knows of any review-relevant topic, language, framework, pattern, anti-pattern, security class, performance concern, or domain practice that is *missing* from `archman.dev` but that a competent reviewer would flag in real code, **it must be added** as a reviewer source file. The goal is **zero gaps** in code-reviewer coverage. archman.dev seeds the tree; Claude's own knowledge fills every remaining hole.

Concretely, during phase 1 the executor must:

- Continuously cross-check the source corpus against its own knowledge of real-world review concerns, not only against the archman.dev section list.
- Add reviewers for legitimate concerns that archman doesn't mention (e.g., supply-chain attacks, prompt injection in LLM apps, GPU/CUDA pitfalls, WebAssembly safety, mobile crash-reporting hygiene, accessibility beyond WCAG, build-reproducibility, container image hardening, etc.) whenever it is confident they belong.
- Treat the section counts in this plan (~145 files) as a **floor, not a cap**. If full coverage requires more files, author more files.
- Never silently skip a known concern just because archman.dev doesn't list it.

This rule overrides the "review-relevant sections only" archman scope decision below — that decision constrains what gets pulled *from archman*, not what the corpus is allowed to cover overall.

---

User decisions (locked):

- **Languages:** Top 20 most-used, including all of Python, JS, TS, Swift, Go, plus Rust, Java, Kotlin, Scala, C#, Ruby, PHP, Dart, C, C++, Objective-C.
- **Layout mode:** **Sibling** `reviewers.wiki/` (existing `reviewers/` stays put until the swap is validated).
- **Reviewer mix:** **Replace** — fully redesign from scratch (existing 18 are inputs/inspiration, not preserved verbatim).
- **archman.dev import:** **Review-relevant sections only** — principles, patterns, anti-patterns, security, testing, reliability/resilience/perf, api-design, data, observability, ddd, frontend, mobile, concurrency, distributed-systems, documentation-modeling. Skip governance/modernization/specialized verticals for this iteration.

---

## Target architecture

### Source corpus (flat, pre-wiki)

A single flat directory `reviewers.src/` (gitignored sibling of `reviewers/`) holding **every reviewer as one .md file** with rich frontmatter. The wiki operators do all the hierarchy. **No manual clustering** — per workspace memory, "skill-llm-wiki structure is always optimised" and "never pre-chew clusters."

Each source file uses this frontmatter shape (compatible with both the existing `index:build` script and skill-llm-wiki's wiki schema):

```yaml
---
id: <kebab-case, matches filename>
type: universal | conditional | overlay
focus: <one sentence — narrowest possible>
covers:                  # 3–15 granular bullets (skill-llm-wiki uses these for similarity)
  - "..."
audit_surface:           # existing skill-code-review field — kept for orchestrator compatibility
  - "..."
languages: [<list> | all]
tags: [<topical tags for Tier-0 TF-IDF>]
activation:
  file_globs: ["**/*.py", ...]
  keyword_matches: [...]
  structural_signals: [...]
  escalation_from: [<reviewer-ids>]
tools:                   # optional external linters / SAST / etc.
  - {name: ..., command: ..., purpose: ...}
---
```

### Source corpus contents (target counts)

**A. Language-deep reviewers (≥20)** — one per language, ~300–500 lines each, idioms + types + memory + concurrency + perf + security + tooling + tests + packaging + ecosystem pitfalls. Each replaces a slice of the old `language-quality.md` and supersedes the old thin overlay.

Languages: `python`, `javascript`, `typescript`, `go`, `swift`, `rust`, `java`, `kotlin`, `scala`, `csharp`, `ruby`, `php`, `dart`, `c`, `cpp`, `objective-c`, `shell-bash`, `sql`, `r`, `lua`. (20 total — covers the user's "top 20 incl. all named.")

For each language file, sections include: language-version baseline, type system, error handling, resource management, concurrency primitives, idiom checklist, perf hot-paths, language-specific security pitfalls, packaging/build, testing framework conventions, documentation conventions, ecosystem-specific footguns, canonical-reference links, recommended tools (ruff/mypy, golangci-lint, eslint+tsc, swiftlint, clippy, etc.).

**B. Programming-principles reviewers (~10)** — derived from `archman.dev/core-design-and-programming-principles`:
`solid-principles`, `grasp`, `dry-kiss-yagni`, `composition-over-inheritance`, `law-of-demeter-coupling-cohesion`, `encapsulation-immutability`, `fail-fast-defensive`, `naming-readability-intent`, `feature-flags-config`, `i18n-l10n-readiness`.

**C. Design-pattern reviewers (~25)** — derived from `archman.dev/design-patterns`:

- Creational: `factory`, `abstract-factory`, `builder`, `singleton`, `prototype`
- Structural: `adapter`, `decorator`, `facade`, `proxy`, `composite`, `bridge`, `flyweight`
- Behavioral: `observer`, `strategy`, `state`, `template-method`, `chain-of-responsibility`, `iterator`, `mediator`, `memento`, `command`, `visitor`, `interpreter`
- Concurrency: `active-object`, `monitor`, `thread-pool`, `double-checked-locking`
- Integration: `eip-messaging`, `eip-routing`, `eip-transformation`

Each is a **review** reviewer, not a tutorial: "where is this pattern misused, missing, over-applied, or wrong-fit in the diff."

**D. Anti-pattern reviewers (~12)** — derived from `archman.dev/anti-patterns-and-pitfalls`:
`god-object-class`, `big-ball-of-mud`, `boat-anchor-lava-flow`, `chatty-tight-coupling`, `copy-paste-dry-violation`, `spaghetti-code`, `anemic-domain-model`, `distributed-monolith`, `golden-hammer`, `over-abstraction-too-many-layers`, `patternitis`, `flaky-non-deterministic-tests`, `premature-optimization`, `shared-database-across-services`.

**E. Architecture-style reviewers (~10)** — derived from `architectural-styles` + `domain-driven-design`:
`clean-architecture`, `hexagonal-ports-adapters`, `layered-architecture`, `modular-monolith`, `microservices`, `event-driven`, `cqrs`, `ddd-strategic-bounded-contexts`, `ddd-tactical-aggregates-vo`, `micro-frontends`.

**F. API/Interface reviewers (~7)**:
`rest-api-design`, `graphql-design`, `grpc-design`, `async-event-api`, `api-versioning-deprecation`, `webhook-design`, `sdk-design`.

**G. Data/persistence reviewers (~8)**:
`relational-modeling`, `document-modeling`, `query-performance-n-plus-1`, `sharding-partitioning`, `replication-consistency`, `schema-migrations`, `cdc-event-sourcing`, `data-retention-gdpr`.

**H. Security reviewers (~10)** — DECOMPOSE the current monolithic `security.md`:
`owasp-injection`, `owasp-broken-access-control`, `owasp-crypto-failures`, `owasp-ssrf`, `owasp-deserialization`, `authn-session`, `authz-rbac-abac`, `secrets-management`, `threat-modeling-stride`, `supply-chain-integrity`.

**I. Testing reviewers (~8)** — DECOMPOSE current `test-quality.md`:
`unit-testing-discipline`, `integration-contract-testing`, `e2e-strategy`, `property-based-testing`, `mutation-testing`, `fuzzing`, `test-doubles-and-isolation`, `coverage-quality-not-quantity`.

**J. Reliability / resilience reviewers (~8)**:
`retry-with-backoff`, `circuit-breaker`, `bulkhead-isolation`, `timeout-deadline-propagation`, `idempotency`, `saga-distributed-tx`, `backpressure`, `graceful-degradation`.

**K. Performance reviewers (~7)**:
`big-o-analysis`, `hot-path-allocations`, `caching-strategy`, `db-query-perf`, `memory-gc`, `network-io`, `startup-time-cold-start`.

**L. Concurrency reviewers (~7)**:
`race-conditions-data-races`, `lock-discipline-deadlock`, `lock-free-atomics`, `actor-model`, `csp-channels`, `async-cancellation`, `futures-promises-discipline`.

**M. Observability reviewers (~6)**:
`structured-logging`, `metrics-red-use`, `distributed-tracing`, `sli-slo-error-budgets`, `alerting-discipline`, `audit-trail`.

**N. Frontend/mobile reviewers (~10)**:
`react-quality`, `vue-quality`, `svelte-quality`, `angular-quality`, `frontend-state-management`, `frontend-perf-bundle-hydration`, `wcag-accessibility`, `swiftui-uikit-ios`, `jetpack-compose-android`, `react-native-flutter`.

**O. Documentation/modeling reviewers (~5)**:
`readme-and-root-docs`, `adr-discipline`, `c4-and-uml`, `runbook-and-oncall`, `api-reference-docs`.

**P. Cross-cutting / orchestration reviewers (3)** — these stay close to the current shape because they're orchestrator glue:
`initialization-hygiene`, `dependency-supply-chain`, `release-readiness` (8-gate aggregator — gate definitions get re-pointed at the new specialist IDs).

**Total source files: ~145.** This is intentional. skill-llm-wiki's MERGE/NEST/DESCEND/LIFT will collapse, cluster, and hierarchize them. The user's memory says: "fix the tier that's failing; default to maximum optimization quality." Translation — author maximum granularity, let the optimizer converge.

### Wiki output

`reviewers.wiki/` produced by `skill-llm-wiki build ./reviewers.src --layout-mode sibling --target ./reviewers.wiki` will contain:

- A hierarchical tree of `index.md` + leaf reviewer `.md` files
- NEST clusters named by the Tier-2 wiki-runner sub-agent (e.g., `security/owasp/`, `languages/scripting/`, `patterns/behavioral/`)
- `aliases[]` preserving every original id so the orchestrator can keep dispatching by id
- `.llmwiki/git/` private git history for safe rollback
- A regenerated top-level index the orchestrator reads instead of `reviewers/index.yaml`

We will not pre-decide the cluster shape. The shape is the operator output.

### Orchestrator rewiring

`code-reviewer.md` changes:

1. Replace `reviewers/index.yaml` lookup with `reviewers.wiki/index.md` semantic routing (the same routing pattern skill-llm-wiki uses for its own `guide/`).
2. Update Phase B reviewer-selection to descend the wiki tree by `focus` instead of grepping a flat YAML.
3. Update Phase E release-readiness gate→specialist mappings to use the new decomposed security/testing IDs (with aliases falling back to legacy IDs for one transition window).
4. Keep parallel dispatch, coverage verification, and report-format unchanged.

`reviewers/index.yaml` continues to be auto-generated for one transition release as a compatibility shim, then deleted.

### Build script changes

`scripts/index-build.mjs` is upgraded to:

- Read both `reviewers/` (legacy) and `reviewers.wiki/` (new) during transition
- Validate alias coverage between the two
- Fail the build if any legacy id has no alias in the wiki (no orphan dispatch targets)

**skill-llm-wiki is not wired into `package.json` or CI.** Per user direction: don't add `wiki:build` / `wiki:validate` npm scripts, and don't make the husky/CI pipeline depend on skill-llm-wiki being installed. The skill is still the optimization tool — it's just invoked **manually from its sibling location** (`../skill-llm-wiki/`) during plan execution (and during any later re-runs when new source reviewers are added). The exact invocation is documented in CONTRIBUTING.md so re-runs are reproducible.

The pre-commit chain stays `index:build && validate && lint`, with `validate` extended to include the new alias-coverage check against `reviewers.wiki/`.

---

## Output format & report enhancements

The current `report-format.md` covers verdict, severity-grouped issues, strengths, tool results, per-specialist results, release gates, and per-file coverage. Strong baseline. The gaps below all need to land in the rebuild — they're additive (no breaking change to existing fields) and the schema gets a new `schema_version: "2"` marker so consumers can opt in.

### Per-finding enrichments

- **`finding_id`** — stable hash (e.g. `sha1(specialist + file + line + title)[:10]`) so the same issue keeps the same id across reruns and PR updates. Today's integer ids reset each run.
- **`confidence`** — `high | medium | low`. Aggregator weights severity by confidence; low-confidence criticals can downgrade to `important` until corroborated.
- **`rationale`** — one sentence explaining *why* this severity (not *what* the issue is). Helps users debate triage without re-reading the whole finding.
- **`code_excerpt`** — 5-line context window around the offending line, syntax-highlighted in markdown, `null` in JSON if not extractable.
- **`suggested_patch`** — unified-diff block ready for `git apply` when the fix is mechanical. `null` when judgment is required.
- **`auto_fixable`** — boolean. True when a tool (linter, formatter, codemod) can apply the fix without human review. Surfaced in the markdown report as a 🛠️ marker (text only — no emoji unless explicitly requested at user level).
- **`effort_estimate`** — `S | M | L | XL`. S = under 15 min; M = under an hour; L = under a day; XL = scoped work.
- **`related_findings`** — array of other `finding_id`s. Used to express "this is the root cause; #4 and #7 are downstream symptoms" so users fix the right one first.
- **`security_refs`** — structured object: `{ cwe: [...], owasp: [...], capec: [...], cve: [...] }`. Empty arrays when not security-related.
- **`compliance_tags`** — array from a closed vocabulary: `pci-dss`, `hipaa`, `gdpr`, `ccpa`, `soc2`, `iso27001`, `fedramp`, `nis2`, `dora`. Multi-tag allowed.
- **`tags`** — free-form topical tags (e.g. `["async", "leak", "test-gap"]`). Used for client-side filtering.
- **`first_seen_sha`** — best-effort blame to identify the commit that introduced the issue. `null` if unblameable (new file, etc.).
- **`regression`** — boolean. True when a previous run on the same file at an earlier SHA did *not* report this finding. Requires the reviewer cache (see structural section).
- **`false_positive_hint`** — short string suggesting how to suppress if the finding is wrong (e.g. `// skill-code-review: ignore[security/owasp-injection] reason="parameterised internally"`). The orchestrator honours these in subsequent runs.

### Top-level report additions

- **`schema_version: "2"`** — declared at root.
- **`tldr`** — 1-paragraph executive summary for humans, generated by the aggregator after all findings collected. Already implicit in the verdict block; promote to its own field.
- **`project_profile`** — explicit detected stack: `languages` (with version where derivable), `frameworks` (with version), `runtime_versions` (node, python, jvm, etc.), `package_managers`, `build_tools`, `test_frameworks`, `linters_formatters`, `ci_system`, `cloud_targets`, `databases`, `caches`, `messaging`, `iac_tools`, `container_runtime`. Cached at Step 0; reused by every reviewer; included in the report so the user can verify detection.
- **`metric_deltas`** — diff stats per language (additions, deletions, files changed), cyclomatic-complexity delta on touched functions, test-count delta, coverage-percentage delta where measurable. Keys are nullable — only emitted when a base baseline exists.
- **`test_gap_report`** — array of `{ file, lines, reason }` for changed code that lacks a corresponding test edit. Computed deterministically by walking the diff and matching to test files via `tests/`, `__tests__/`, `*_test.*`, `*.test.*`, `*.spec.*` glob conventions.
- **`doc_gap_report`** — array of `{ symbol, file, line }` for changed *public* APIs that have no documentation edit in the same diff. Detection: exported function/class signature changed + no edit in the matching `.md` / `.rst` / docstring.
- **`migration_radar`** — array of detected migration / infra-change indicators: SQL migration files, schema diffs, terraform plans, helm chart bumps, CI workflow changes, dependency upgrades. Each entry routes the user to the relevant specialist verdict.
- **`reviewer_execution`** — per-reviewer metadata: `model_used`, `tokens_in`, `tokens_out`, `wall_time_ms`, `tool_results_count`, `escalations_received`, `escalations_emitted`. Optional but emitted by default.
- **`rerun_recipe`** — exact command to reproduce this report: `skill-code-review base=<sha> head=<sha> mode=<mode> ...`. Pasteable.
- **`coverage_with_reasons`** — extends today's `coverage` array with `dispatched_because` (the activation signal that fired) and `findings_count`. Lets users see why a reviewer ran on a file *and* whether it produced anything.

### Output channels (new)

- **`format=sarif`** — SARIF 2.1.0 export so findings can be uploaded to GitHub Code Scanning, GitLab Security Dashboard, Azure DevOps, etc. Maps `finding_id` → `ruleId`, severity → `level`, `code_excerpt` → `region`, `suggested_patch` → `fixes[]`.
- **`format=github-pr`** — GitHub Checks / PR Annotations format for direct annotation of PR diffs by `gh pr` or Actions.
- **`format=gitlab-cq`** — GitLab Code Quality JSON for the merge-request widget.
- **`format=junit`** — JUnit-style XML so reviews can be displayed in CI test panels.
- **`format=html`** — self-contained HTML report (single file, inline CSS) for emailing or attaching to release notes.

### Deterministic `help` output

The `help` argument prints a complete, compact reference document that is **byte-identical across invocations**. No LLM interpretation, no summarization, no rephrasing — the orchestrator opens a pre-built help artifact and writes it verbatim to stdout. Same input → same bytes, every time, no matter which model is running the orchestrator.

Today's behaviour ("read `report-format.md` and print the arguments table") is LLM-mediated and therefore non-deterministic — the same invocation can produce different output across models or even across runs of the same model. The rebuild replaces it with a static-artifact fast path.

#### Artifacts shipped with the skill

Three help artifacts live in the skill root, all generated from one canonical source:

- **`HELP.md`** — default, rendered markdown with tables. This is what `help` prints when no `format=` is passed.
- **`HELP.json`** — same content structured as JSON, machine-readable.
- **`HELP.yaml`** — same content as structured YAML, human-readable tree form.
- **`HELP.sha256`** — fingerprint of the three artifacts; the validator fails the build if any artifact's hash drifts from this file.

All three content artifacts are **generated by `scripts/build-help.mjs`** from:

- `package.json` (name, version, repo URL, license) — so the version line in help never drifts from the published package.
- `report-format.md` — the canonical arguments table, verdict vocabulary, output channel list.
- The "Review depth levels" section of this plan once it lands in `report-format.md` as part of phase 4.

Because there is one source per fact and one generator, the three artifacts can never disagree with each other or with the canonical source. Any change to `report-format.md` or `package.json` must regenerate all four files; the pre-commit hook fails the commit otherwise.

#### What the help contains (compact reference, not spammy)

The shape below is what the build script emits into `HELP.md`. Every section is bounded — no unbounded lists, no reviewer enumeration, no marketing copy.

1. **Header** — one H1 line: `skill-code-review v<version>`, plus one-line tagline and repository URL on the next two lines. No ASCII banner.
2. **Usage** — a single code block showing `skill-code-review [arg=value ...] [--flag]` and nothing else. One line.
3. **Arguments table** — every argument name, value type (or enum), default, and a ≤ 80-char description. Single markdown table, columns `Argument | Values | Default | Description`, sorted alphabetically so diffs on the file are minimal.
4. **Review depth levels table** — 4-column summary: `Level | Reviewer set | Parallelization | Defaults`. One row per level (`basic`, `mid`, `maximum`). Matches the authoritative spec in "Review depth levels" above.
5. **Output formats table** — `format=<name> | Extension | Description | Use case`. One row per supported formatter: `markdown`, `json`, `yaml`, `sarif`, `github-pr`, `gitlab-cq`, `junit`, `html`.
6. **Verdict vocabulary table** — `Verdict | Meaning | Action`. Five rows: `GO`, `CONDITIONAL`, `NO-GO`, `MERGE_WITH_FOLLOWUP`, `HOLD_FOR_INFO`.
7. **Examples** — exactly 4 canonical invocations, one line of description each, rendered as a numbered list:
    1. Default interactive review on the current branch.
    2. CI gate on a feature branch, failing on any Critical: `skill-code-review depth=mid format=github-pr`.
    3. Full maximum-depth release review: `skill-code-review depth=maximum streaming=on`.
    4. Scoped single-specialist review: `skill-code-review scope-reviewer=security depth=mid`.
8. **See also** — three links, bullet list: `README.md`, `report-format.md`, repository URL. No deep-dive prose.

**Non-goals** — explicitly excluded so the help stays a quick-reference card:

- No full argument prose descriptions beyond the short column in the table. Deeper docs live in `report-format.md`, which `help` points at via the "See also" section.
- No full reviewer enumeration. 500+ reviewers is not quick-reference material; the wiki index at `reviewers.wiki/index.md` is the authoritative list.
- No `activation` / `escalation_from` internals, no frontmatter schema, no tiered-dispatch internals, no cache internals. Help is for users, not implementers.
- No ASCII-art banner, no marketing copy. The repository link in "See also" is sufficient discovery.
- No emojis or icons in `HELP.md` by default. The "icons are allowed in report markdown" exception from the "Visual indicators" section applies to review reports, not to the help artifact. Help is terminal-friendly plain markdown.

#### Format selection

- **Default.** `help` with no format → prints `HELP.md` to stdout.
- **`help format=markdown`** (or `md`) → `HELP.md`.
- **`help format=json`** → `HELP.json`.
- **`help format=yaml`** → `HELP.yaml`.
- **`help format=<other>`** → prints `HELP.md` and writes a one-line warning to stderr: `warning: format '<name>' not supported for help; falling back to markdown`.

When combined with `help`, the `format=` argument refers to the help artifact format, not the review report format. The two code paths never share state — `help` short-circuits before the orchestrator considers running any reviewers.

#### Determinism contract (hard requirements)

- **Byte-identical output.** Two consecutive `help` invocations must produce output with the same SHA-256. A test in `scripts/test-help-determinism.mjs` runs `help` twice back-to-back, diffs the bytes, and fails if they differ.
- **No LLM interpretation.** The orchestrator's help branch does a pure filesystem read + stdout write — no prompt, no reasoning, no reviewer loading, no argument parsing beyond extracting `help` and the optional `format=`. The branch runs before any of the skill's AI-facing logic.
- **No clock, no randomness, no environment leak.** Help output must not contain timestamps, random identifiers, hostnames, usernames, cwd paths, git commit SHAs, or anything else that varies between invocations on different machines. The build script is the only place where version strings and URLs are substituted from the environment, and it runs at build time only.
- **Fingerprint check.** `HELP.sha256` lists the SHA-256 of `HELP.md`, `HELP.json`, and `HELP.yaml`. The validator (`scripts/validate-help.mjs`) recomputes the hashes on every `npm run validate` and fails if any artifact's content no longer matches the recorded fingerprint. This catches: developers hand-editing the artifacts without re-running the build; the build script producing non-deterministic output (itself a bug); git checkout corruption or LFS misconfiguration.

#### Build pipeline

- **`scripts/build-help.mjs`** — reads canonical sources, emits `HELP.md`, `HELP.json`, `HELP.yaml`, `HELP.sha256`. Runs under `npm run build:help`. The build script itself is deterministic: no timestamps, no random values, sorted keys in JSON/YAML, alphabetical rows in the arguments table, LF line endings, trailing newline.
- **`scripts/validate-help.mjs`** — wired into `npm run validate`. Reads `HELP.sha256`, recomputes the hashes of the three artifacts, fails the run on any mismatch. Runs in CI and pre-commit.
- **Pre-commit hook** runs `build:help` in dry-run mode and fails the commit if the artifacts on disk differ from what the script would produce. Authors must re-run `npm run build:help && git add HELP.*` when they change `report-format.md` or `package.json`.
- **`scripts/test-help-determinism.mjs`** — end-to-end test: invoke the skill's `help` branch twice with identical args, compare the byte streams, fail on diff. Runs in CI.

### Argument additions

- `help` (boolean flag, or `help format=markdown|json|yaml`) — prints the deterministic help artifact (see "Deterministic `help` output" above) and exits. Short-circuits all reviewer routing, loading, and dispatch. Default format `markdown`; unknown formats fall back to markdown with a stderr warning.
- `confidence-min=high|medium|low` — filter findings under a confidence threshold.
- `compliance=pci-dss,hipaa,...` — only run reviewers whose compliance tags intersect.
- `security-refs=cwe,owasp,...` — focus on findings carrying these reference taxonomies.
- `since=<sha>` — alias for `base=<sha>` aligned with `git log` vocabulary.
- `cache=on|off|refresh` — control the per-(file, sha, reviewer) skip cache (see structural improvements).
- `streaming=on|off` — emit findings as they're produced rather than batching at end.
- `budget-tokens=<int>` — soft cap on total context tokens; orchestrator drops lowest-priority reviewers to fit.
- `budget-reviewers=<int>` — hard cap on reviewer count per dispatch (default 30; `mode=thorough` uncaps).
- `output-file=<path>` — write the report to disk in addition to stdout.
- `dry-run` — show the dispatch plan and routing decisions without invoking reviewers.

### Verdict additions

- **`CONDITIONAL`** stays. Add **`MERGE_WITH_FOLLOWUP`** (cleared to merge but with required follow-up tasks) and **`HOLD_FOR_INFO`** (need user input — e.g. compliance tag confirmation — before verdict can be issued). The `tldr` field always includes the verdict reason.
- **`top_blockers`** — array of the 3 highest-priority blockers by severity × confidence, surfaced before the long issues table.

### Visual indicators (markdown output)

The no-emoji default is **lifted for markdown report output only** because the user explicitly asked for visual clarity. All other skill output (CLI messages, commit messages, etc.) still follows the no-emoji default.

- **Verdict badges**: `GO` ✅ · `NO-GO` ❌ · `CONDITIONAL` ⚠️ · `MERGE_WITH_FOLLOWUP` 🟡 · `HOLD_FOR_INFO` ⏸️.
- **Status icons**: PASS ✅ · FAIL ❌ · N/A ➖ · SKIP ⏭️.
- **Severity icons**: critical 🔴 · important 🟠 · minor 🟡 · strength/praise 🟢.
- **Kind icons**: blocker 🚫 · required ⚠️ · suggestion 💡 · question ❓ · nit ✨ · praise 🏅.
- **Confidence**: ◆◆◆ high · ◆◆◇ medium · ◆◇◇ low.
- **Effort**: 🕐 S · 🕑 M · 🕓 L · 🕔 XL.
- **Markers**: auto-fixable 🛠 · regression ⏮.
- **ASCII progress bars** for any percentage: `[██████████░░░░░░░░░░] 50%` (20-char bar). Used for coverage delta, test-pass rate, hotspot intensity, quality-dimension health.
- Every icon has a plain-text label beside it so reports degrade gracefully in terminals without unicode rendering.

### Interactive save-to-file prompt

After a review renders in **interactive mode** (slash command or chat, not subagent dispatch and not piped CLI), the orchestrator asks the user whether to persist the report to disk.

- Default path: `<project>/.claude/code-reviews/<yyyy>/<mm>/<dd>/code-review-<slug>.v<int>.md`.
- Slug derives from (priority order) explicit `title=` argument → detected GitHub PR/issue number → head branch name → short head SHA.
- `.v<int>` version suffix auto-increments; existing files are never overwritten.
- Prompt offers three choices: **save to default path**, **save to custom path** (asks for path), or **don't save**.
- `save=auto|always|never|ask` argument governs behaviour; default `ask` in interactive mode, `never` in subagent/CLI mode.
- `output-file=<path>` argument bypasses the prompt for non-interactive use.
- Saved file is byte-identical to the rendered markdown — same icons, same footer, fully self-contained for copy-paste into GitHub PRs.
- One-time gitignore suggestion is printed (never auto-applied).

### Credit footer (always present)

Every markdown report ends with — after the final horizontal rule — a credit block pulled from `package.json` fields. **The footer is never wrapped in a `<details>` block and never truncated by the 65k PR-comment splitter — it must always be fully visible at the very end of the primary report document.**

```markdown
---

_Made with ❤️ for software engineering by [Dmitri Meshin](https://github.com/meshin-dev)._
_[`skill-code-review`](https://github.com/ctxr-dev/skill-code-review) · MIT License · v<package.json version>_
```

Author name, author profile URL, and repository URL are locked to these values. License and version are read from `package.json` so they stay in sync. The repository URL in `package.json → repository.url` must match `https://github.com/ctxr-dev/skill-code-review`; `validate-report-schema.mjs` fails the build if the two diverge.

### PR-ready structural contract

The rendered markdown report must be **directly copy-pasteable into a GitHub PR comment** as a complete review document:

- Proper header hierarchy (H1 → H2 → H3; no deeper nesting except inside collapsibles).
- Nothing redundant; every schema-v2 field has exactly one rendering home.
- Nothing useful skipped — every specialist finding, tool result, gate, coverage row, gap report, migration radar entry, and per-finding enrichment is rendered.
- **Progressive disclosure via `<details>` collapsibles.** Less-important information lives near the end of the document inside collapsed `<details>` blocks so a reader scanning the top sees only the essentials. Critical-and-above findings, the verdict, top blockers, release gates, and the credit footer are **never** collapsed.
  - Always-open (top of doc, never collapsed): TL;DR, Verdict, Top Blockers, Quality Dashboard, Release Gates, SOLID Compliance, Critical Issues, Important Issues.
  - Collapsed-by-default (bottom of doc, `<details>`): Minor Issues, Strengths, Tool Results, Specialist Results, Project Profile, Test Gaps, Doc Gaps, Migration Radar, Coverage, Reviewer Execution Metadata, Rerun Recipe.
  - `suggested_patch` and `code_excerpt` per finding are always collapsed (`<details><summary>Patch</summary>` / `Context`).
- **The credit footer is never inside a `<details>` block**, never collapsed, never moved to an appendix, and never truncated. It always appears in full at the very end of the primary document.
- Reports exceeding GitHub's 65,536-char PR comment limit auto-split into a main comment + appendix. The main comment retains the always-open sections, collapsed sections and the credit footer; the appendix carries any overflow from collapsed sections. The credit footer is duplicated into the appendix's last line as well.

---

## Structural & efficiency improvements

Goal: every reviewer has exactly the context it needs to do its best work, never more. Today's "load every activated reviewer at full depth" approach is the bottleneck.

### Review depth levels (`depth=basic | mid | maximum | auto`)

The orchestrator exposes a single top-level "how deep should this review go" knob that scales the entire dispatch strategy — reviewer count, parallelization shape, sub-agent nesting depth, model tier, effort level, token budget, and streaming policy. Every other efficiency control below (tiered dispatch, body sectioning, caches, dedup, streaming) is a consequence of the depth setting; `depth` is the knob, the rest are the machinery.

This is orthogonal to reviewer `tier: 1|2|3` — tiers classify individual reviewer files by cost/priority, `depth` controls how intensely the whole review runs. `depth=basic` runs mostly Tier-1 reviewers inline; `depth=maximum` fans out Tier-1 + Tier-2 + escalated Tier-3 reviewers across multiple levels of nested sub-agents.

#### The three levels

**1. `basic` — low-overhead, high-signal first pass.**

- **Reviewer set.** Tier-1 universal reviewers only, plus the author-hygiene pre-dispatch gate. Tier-2 reviewers fire only when the activation signal is unambiguous (e.g. the diff contains SQL query strings → `sec-owasp-a03-injection`). No Tier-3 escalation.
- **Parallelization is conditional on scope.** If the activated set is small (≤ 5 reviewers) AND the diff is small (≤ 100 LoC touched) AND the main session has enough budget to service the reviewers itself, the orchestrator runs them **inline in the current session** — no sub-agent spawn, no fan-out overhead. Spinning up sub-agents for a 3-reviewer / 40-line review is pure waste. For larger basic-mode runs, parallelize but stay in a **single fan-out layer** (no nesting).
- **Defaults.** Cheapest competent model available, minimal effort per agent, tight token budget, `streaming=off` (report at the end is fine for a small result set), `cache=on`.
- **Use cases.** Quick sanity check, CI gate on small PRs, author self-review before push, pre-commit hook, hot-path iteration loops where speed beats coverage.

**2. `mid` — balanced, wide single-layer parallelization.**

- **Reviewer set.** Full activated set: Tier-1 universal + Tier-2 signal-driven. Tier-3 escalation fires only when a predecessor reviewer explicitly emits an `escalation_from` signal.
- **Parallelization: single-layer fan-out.** The main session spawns **as many sub-agents as possible in a single layer**, one sub-agent per reviewer (or per small homogeneous reviewer group when reviewers share both inputs and model profile). No second-level nesting — every sub-agent is a direct child of the main session.
- **Defaults.** Moderate model tier ("most cost-effective competent model" — default mid model the harness exposes), moderate effort per sub-agent, moderate token budget per dispatch, `streaming=on`, `cache=on`, `budget-reviewers=30`.
- **Overrides.** Any explicit `model=` / `effort=` / `budget-*=` argument wins over the mid defaults and propagates to every sub-agent spawned under this depth.
- **Use cases.** Default interactive review, pre-merge review for typical PRs, nightly scheduled runs, most real reviews on real PRs. This is the level most users should invoke 90% of the time.

**3. `maximum` — deepest possible, multi-level cascaded parallelization.**

- **Reviewer set.** Full activated set plus every Tier-3 escalation reviewer whose `escalation_from` matches any firing reviewer. Nothing that could fire is skipped.
- **Parallelization: multi-level nested fan-out.** The main session does NOT spawn reviewers directly. Instead:
  1. **Layer A — main session** spawns **one `domain-lead` sub-agent per review dimension** (from the 7-dimension taxonomy: Correctness, Security, Performance & scalability, Tests & coverage, Readability & maintainability, Architecture & design, Documentation & PR description). Up to 7 domain-leads in parallel.
  2. **Layer B — each domain-lead** spawns **one `specialist` sub-agent per reviewer** activated under its dimension (its `dimensions:` frontmatter array includes that lead's dimension). Domain-leads run their specialists in parallel; leads across dimensions run in parallel with each other.
  3. **Layer C — each specialist** may spawn **per-file or per-finding `leaf` sub-agents** for the deepest possible focus when the file set is large or a single concern warrants its own isolated context window (e.g. a 500-line security-sensitive function gets its own leaf sub-agent so the specialist's prompt stays uncluttered). Specialists that don't need per-file fan-out skip Layer C.
- **Bottom-up aggregation.** Leaf sub-agents report findings to their specialist parent; specialists aggregate + dedupe + cross-validate + confidence-calibrate into a reviewer-level report; domain-leads aggregate their reviewers' reports + dedupe across reviewers within the dimension + compute dimension-level verdict; the main session assembles the 7 dimension reports into the single unified comprehensive report delivered to the user. **Every aggregation layer runs the dedup / cross-validation / confidence-calibration pass on its inputs before passing them up** — the result is that findings at the final report are already merged, corroborated, and weighted.
- **Defaults.** Maximum effort at every layer, **maximum-context-window variant of the most efficient strong-reasoning model** the harness exposes (e.g. a 1M-context Claude variant), `streaming=on` (so users can start triaging while later waves still run), `cache=on`, `budget-reviewers` uncapped, `budget-tokens` uncapped. **Nested parallelization is maximal at every layer** — every independent unit of work runs in parallel with every other independent unit.
- **Overrides.** Explicit `model=` / `effort=` / `budget-*=` / `budget-reviewers=` arguments still win and propagate to every sub-agent at every layer, but without them `maximum` means what it says — no self-imposed caps.
- **Use cases.** Critical-path PRs (billing, auth, migrations, security-sensitive code), release candidates, high-impact refactors, architectural reviews, compliance audits, "this is going to prod and I need to be sure" moments. Expensive by design — `maximum` is the honest-to-god deepest review the harness can produce.

#### Level auto-selection and elicitation

The orchestrator picks a depth using this precedence (highest wins):

1. **Explicit `depth=` argument.** Always wins. Use cases: CI gates pinning to `basic`, nightly deep-sweeps pinning to `maximum`.
2. **Session-context short-circuit.** If the current session's turn context already makes the appropriate depth obvious — the user just said "run a basic sanity check", "do a thorough review", "go deep on the security diff", "full review please", "quick check" — the orchestrator selects the matching level and proceeds **without asking**. Ambient context from earlier turns counts too: if the user picked a depth earlier in the same session, re-use it silently.
3. **Stored user preference.** If `.claude/` memory or a per-repo setting records the user's preferred depth for this repo, use it. The "ask once, remember forever" outcome of branch 4 below lands here.
4. **First-use interactive elicitation.** When the invocation is **interactive** (slash command, direct chat, not subagent dispatch, not a pipe, not CI) AND the user has NOT given any signal AND no stored preference exists AND this is the first invocation of the session, the orchestrator asks **one clarifying question** naming the three levels, their typical use-cases, and the cost/quality tradeoff, then caches the answer for the rest of the session (and, if the user indicates it should persist, stores it in the per-repo preference). Subsequent reviews in the same session never re-ask.
5. **Non-interactive default.** CI, subagent-dispatched invocation, piped CLI, `format=json|sarif|...` output channel with no TTY — the orchestrator uses the default without prompting. **Default for automation = `mid`.** This balances cost and coverage for the vast majority of automated invocations.

**The elicitation prompt (branch 4) is fixed text** so it is recognisable across sessions:

```text
What review depth do you want?

  1. basic    — fast, cheap, high-signal pass. Tier-1 reviewers only; inline when the
                diff is small; single-layer parallelization for larger diffs. Use for
                quick sanity checks and small PRs.
  2. mid      — wide single-layer parallelization across all activated reviewers with
                moderate model + effort. The right default for most real PRs.
  3. maximum  — deepest possible. Multi-level nested sub-agents (domain-lead →
                specialist → per-file leaf), max model + max effort + max context,
                bottom-up aggregation into a single unified report. Expensive.

Reply with the level name. I'll remember it for the rest of this session.
```

#### Interaction with other controls

- `depth=` sets the defaults for: `model=`, `effort=`, `budget-reviewers=`, `budget-tokens=`, `streaming=`, and the sub-agent fan-out policy. Any explicit argument value for any of these wins over the depth default.
- `depth=basic` tightens `budget-reviewers` to a small number (default 8) and `budget-tokens` to a tight cap.
- `depth=mid` uses `budget-reviewers=30` and the harness's default token budget.
- `depth=maximum` **uncaps** `budget-reviewers` and `budget-tokens` and forces `streaming=on`.
- `depth=maximum` forces `cache=on` but honours `cache=refresh` explicitly — the expectation is that a maximum review wants fresh reasoning, but the user can still demand a cache rebuild.
- `mode=thorough` (pre-existing flag name referenced elsewhere in this plan) is a legacy alias for `depth=maximum`; the orchestrator translates one to the other during argument parsing and documents `depth=` as canonical going forward.

#### Nested-spawn degradation (hard harness constraint)

Some Claude Code harness configurations do not allow a general-purpose sub-agent to spawn further `Agent` calls. When `depth=maximum` is selected and the harness rejects a Layer-B or Layer-C spawn, the affected layer **degrades gracefully**: that domain-lead (or specialist) services its children **inline** within its own context window — serialised, but still isolated from the main session's context — instead of fanning out. The main session detects this degradation and surfaces it in the report via `reviewer_execution.nesting_limit_hit: <layer>` so users can see the review did not achieve full parallelization and can re-run under a harness that supports it if the cost matters.

Because inline-servicing is the degradation path, each layer's prompt must be written so it works both as a "spawn children" dispatcher AND as an "answer inline as if I were the child" worker. Same prompt shape, two execution paths.

### Tiered dispatch ladder

- **Tier 0 — Project profile fingerprint** (always, ~1 cheap pass). Detects stack, frameworks, runtime versions, build tool, test framework, CI, cloud target, databases. Cached in `.skill-code-review/profile.yaml` at the repo root (gitignored). Subsequent runs revalidate the fingerprint hash instead of re-detecting.
- **Tier 1 — Universal lightweight reviewers** (always run on every diff). These are the ones whose checklists are cheap and whose findings are high-signal even on a 5-line PR: clean-code-solid, security base, language idioms (the relevant per-language reviewer), test-quality base, error-resilience. Bodies are tightly capped (~150 lines each).
- **Tier 2 — Signal-driven deep reviewers**. Activated by file globs / structural signals / project-profile facts. Bodies can be larger (~300–500 lines). Examples: `owasp-injection` only when the diff contains query strings; `react-quality` only when JSX changed; `swiftui-uikit-ios` only when Swift UI files touched.
- **Tier 3 — Escalation-only reviewers**. Never auto-routed; only invoked when a Tier 2 reviewer escalates (`escalation_from` in frontmatter). Examples: `threat-modeling-stride` (escalated from any OWASP reviewer when the finding affects a trust boundary), `db-query-perf` deep-dive (escalated from `query-performance-n-plus-1`).

Tier is declared in frontmatter (`tier: 1 | 2 | 3`). The orchestrator's Step 1 routing computes `(tier_filter ∩ activation_filter ∩ budget_filter)` and dispatches the result.

### Reviewer body sectioning (token discipline)

Every reviewer source file follows a fixed body shape so the orchestrator can extract just the relevant H2 sections instead of loading the whole file:

```markdown
## When This Activates           # tiny, always loaded
## Audit Surface                  # 10-20 high-signal bullets, always loaded
## Detailed Checks                # H3 sub-sections, loaded selectively
### <topic 1>
### <topic 2>
...
## Common False Positives         # always loaded
## Severity Guidance              # always loaded
## See Also                       # always loaded — cross-reference to related reviewers
## Authoritative References       # always loaded — links only
```

The `Detailed Checks` H3 subsections each carry their own `activation` block in HTML-comment frontmatter, so the orchestrator can include only the sub-sections matching the diff. This is how a 500-line reviewer file fits in 80 tokens of effective context for a small PR.

### Project-profile fingerprint cache

`Step 0` writes `.skill-code-review/profile.yaml` with: stack, framework versions, runtime versions, package-manager files' SHAs, IaC files' SHAs, cloud-target signals, database engines detected. The fingerprint hash is `sha1(sorted-keys-and-values)`. On rerun, if the hash matches, Step 0 is skipped entirely (saves seconds and tokens on every run). On any package.json / pyproject.toml / Cargo.toml / go.sum / etc. change, the fingerprint invalidates automatically.

### Per-(file, sha, reviewer) skip cache

`.skill-code-review/cache/<reviewer-id>/<file-sha>.json` stores the most recent finding set for each `(reviewer, file-content-hash)` pair. On rerun, unchanged files at unchanged content-hashes skip dispatch entirely and reuse cached findings. Controlled by `cache=on|off|refresh`. This is what makes `regression` detection (above) possible.

### Result deduplication

When multiple reviewers report the same root cause, the aggregator merges them into one finding with `attribution: [reviewer-id-1, reviewer-id-2, ...]`. Detection: same `(file, line, normalised_title)` tuple, fuzzy match on description. Severity is the max across attributions; confidence is averaged; `related_findings` aggregates from all sources.

### Streaming dispatch

Reviewers emit findings as they finish, not all at once at the end. The orchestrator forwards them through a streaming output channel (`streaming=on`). For markdown / HTML output the report is rendered progressively. Saves wall-clock time on large diffs and lets users start triaging before the full review completes.

### Tool priors

External tools (semgrep, eslint, tsc, ruff, golangci-lint, etc.) are run at Tier 0, before any AI reviewer dispatch. Their output is folded into the prompt for the AI reviewer that declared them, as a "prior findings" section. The AI reviewer then either confirms (raises severity / adds context), refines, or rejects them — but doesn't redo the work the tool already did. Cuts AI tokens substantially on lint-heavy diffs.

### Diff-hotspot weighting

When `mode=thorough` or for large PRs, the orchestrator computes a hotspot score per file: `(churn over last N commits) × (lines changed in this PR) × (cyclomatic complexity)`. High-score files get deeper review (more reviewers, larger token budget). Cold-spot files get a leaner pass.

### Test-gap and doc-gap detection (deterministic)

Step 0 runs two pure-Node walkers:

- **Test-gap walker** — for each changed source file, look for a corresponding test file edit in the same diff. If absent, record `{file, lines, reason}` in `test_gap_report`. Test-quality reviewer reads this as a prior.
- **Doc-gap walker** — for each changed exported symbol (function/class signature), look for a doc edit (docstring, README section, ADR). If absent, record `{symbol, file, line}` in `doc_gap_report`. Documentation reviewer reads this as a prior.

These run before any AI dispatch and produce 100% deterministic findings, freeing the AI reviewers to focus on judgment calls.

### Migration radar

Step 0 detects: SQL migration files (alembic, flyway, atlas, knex, prisma, drizzle, gorm, ent…), terraform plans, helm chart version bumps, CI workflow edits, dependency upgrades, k8s manifest changes. Each detection adds an entry to `migration_radar` and forces routing to the matching specialist (e.g. SQL migration → `schema-migrations` reviewer; helm bump → `helm-quality` reviewer).

### Reviewer dependency graph

The aggregator computes a topological order over reviewers based on `escalation_from` declarations and dispatches in waves: wave 1 = no dependencies, wave 2 = depends only on wave 1, etc. Within a wave, parallel. Across waves, sequential. This lets escalation reviewers actually receive predecessor output instead of running blind in parallel.

### Confidence calibration

Each reviewer reports per-finding `confidence`. The aggregator bands findings: `confidence=high` go straight into the report; `medium` get a corroboration check (any other reviewer or tool find the same line?); `low` get demoted to an "advisory" appendix unless corroborated. This trades a bit of recall for a lot of precision in the visible report.

### Body length contract

Hard limits enforced by the validator:

| Tier | Max lines | Max audit_surface bullets | Max H3 sub-sections |
|------|-----------|---------------------------|---------------------|
| 1    | 200       | 12                        | 4                   |
| 2    | 500       | 20                        | 8                   |
| 3    | 800       | 25                        | 12                  |

Reviewers exceeding the cap fail validation. Forces authors to DECOMPOSE rather than bloat.

### Knowledge freshness

Each reviewer carries `last_reviewed: <YYYY-MM-DD>` in frontmatter. The aggregator surfaces a freshness warning when a high-criticality reviewer (security, anything with compliance tags) hasn't been reviewed in 6 months. Forces a maintenance loop.

---

## Cross-cutting blind spots (must be covered)

These are concerns that don't fit neatly into any single specialist domain but break real software in production. Every one gets a dedicated reviewer in Phase 1.

- **Time / dates / time zones** — DST transitions, timezone-aware vs naive, ISO-8601 discipline, calendar arithmetic, leap seconds, Y2K-style traps, locale-aware formatting.
- **Money / decimals** — IEEE-754 floats for currency, decimal precision, rounding modes, currency-code handling, multi-currency arithmetic, settlement rules.
- **Encoding / Unicode** — UTF-8 vs UTF-16, BOM, normalization (NFC/NFD), grapheme cluster handling, locale collation, bidi/RTL, surrogate pairs, byte-vs-character length.
- **Numerics** — integer overflow, sign extension, off-by-one, floating-point comparison, NaN/Inf handling, fixed-point arithmetic.
- **Regular expressions** — ReDoS (catastrophic backtracking), greedy vs lazy, anchoring, locale-sensitive classes.
- **File paths** — cross-platform separators, case sensitivity, path traversal (`..`), symlinks, long paths, special device names (Windows `CON`/`PRN`).
- **TOCTOU** — time-of-check vs time-of-use races on filesystem and shared resources.
- **Resource exhaustion via input** — unbounded array/string allocations, deeply nested JSON/XML, billion-laughs, zip bombs, hash-collision DoS.
- **Hash function selection** — non-cryptographic vs cryptographic, collision-resistance, salting.
- **Random number generation** — CSPRNG vs PRNG, seeding, reseeding.
- **Memory ordering / atomics** — acquire/release semantics, sequential consistency, ABA problem.
- **Endianness** — wire formats, byte-order conversion, packed structs.
- **Build reproducibility** — deterministic builds, locked dependencies, vendored toolchains, build provenance (SLSA), SBOM (CycloneDX/SPDX).
- **Backwards compatibility** — semver discipline, deprecation cycles, migration paths, compatibility matrices.
- **Forward compatibility** — unknown-field tolerance, schema evolution, optional fields.
- **Internationalization** — beyond i18n string extraction: pluralization rules (CLDR), gendered language, currency-symbol placement, address formats, name formats, phone-number formats.
- **Accessibility** — beyond WCAG: ARIA live regions, screen-reader affordances, reduced-motion preferences, prefers-color-scheme, keyboard-only navigation.
- **Privacy** — PII identification, data minimisation, consent tracking, retention enforcement, right-to-be-forgotten implementation.
- **Cost / FinOps** — egress charges, idle resources, over-provisioned capacity, expensive query patterns, missing autoscaling.
- **Sustainability** — energy-aware computing, idle-time scaling, model-size selection.

---

## Code-review methodology (synthesised from 14 industry sources)

A research pass over Fowler, Google eng-practices, GitHub staff engineers (Vessels), Pragmatic Engineer, Legit Security, Apiiro, Appfire, Kluster, Jellyfish, GitKraken, roadmap.sh, Marco Patino (dev.to), group107, and Refactoring.Guru produced the consensus ruleset below. Only rules appearing in **3+ sources** are promoted to hard validators; single-source rules are dropped or demoted to advisory. This section is the backbone the skill enforces — it shapes frontmatter, orchestrator gates, output format, and reviewer checklists.

### Hard threshold validators (orchestrator gates)

These are enforced as numeric rules the orchestrator can measure without judgment:

- **PR size:** warn at **> 400 LOC** changed, block dispatch near **> 800–1000 LOC** (6 sources). Configurable via `pr-size-warn` / `pr-size-block` arguments.
- **Single purpose per PR:** detect multiple unrelated concerns in one diff (mixing a feature + a refactor + a doc edit). Heuristic: ≥ 3 distinct top-level directories touched *and* > 2 unrelated commit prefixes by Conventional Commits. Warn.
- **Review pace:** for `full` / `thorough` modes, budget **300–500 LOC/hr of human-readable work** when estimating reviewer dispatch cost. Above 500 LOC/hr, reviewer accuracy collapses (research consensus).
- **Session budget:** a single review session assumes **≤ 60–90 min of attention**. If dispatch exceeds this estimated budget, the orchestrator splits into waves and streams results.
- **Author self-review precondition:** if the diff contains `TODO` / `FIXME` without a ticket reference, `@Suppress` / `@SuppressWarnings` without a ticket, disabled tests (`.skip`, `xit`, `@Ignore`, `@Disabled`), compiler warnings left in, commented-out code, or dead imports — **fail fast** with a dedicated `author-hygiene` reviewer before dispatching anything expensive.
- **CI must be green:** if lint, type-check, unit tests, SAST, SCA, or secret-scan tools report failures in the diff's commit, surface them as Critical at Tier 0 and require resolution before AI reviewers run. Saves tokens and matches the consensus rule "never run humans over broken CI."
- **Conventional Commits:** validate commit-message shape (`feat:`, `fix:`, `refactor:`, etc.) when the repo opts in (detected via `.commitlintrc` / `husky` config).

### Soft thresholds (advisory, surfaced in report)

- **First-response SLA:** advisory-only, 4 business hours (not enforceable by a review skill, but surfaced as a metric if PR age is known).
- **Merge SLA:** < 24 hours.
- **Reviewer-distribution alert:** if one reviewer handles > 60% of project reviews, flag it. (Not enforceable by the skill — it reviews one PR at a time — but exposed as a `project_health` advisory if the skill is invoked against a repo-wide scan.)

### Review-dimension taxonomy (the 7 consensus axes)

Every cross-source list converges on these seven dimensions. Every reviewer in the corpus must declare which dimension(s) it covers via the `dimensions` frontmatter array. The orchestrator guarantees every PR gets at least one reviewer per applicable dimension.

1. **Correctness** — does the change do what it claims? Edge cases, exceptional paths, error handling, invariants.
2. **Security** — authN, authZ, crypto, injection, SSRF, secrets, deserialization, OWASP/CWE/SANS coverage.
3. **Performance & scalability** — N+1, hot paths, allocations, caching, DB queries, cold start, memory growth.
4. **Tests & coverage** — unit / integration / contract / e2e presence, edge-case coverage, test-gap detection, flakiness.
5. **Readability & maintainability** — naming, complexity, comments (of the useful kind), duplication, cognitive load.
6. **Architecture & design** — SOLID, coupling, cohesion, layering, module boundaries, abstraction appropriateness.
7. **Documentation & PR description** — PR description stands alone, "why" in the commit body, public API docs updated, ADRs referenced when applicable.

### Fowler code-smell corpus (22 dedicated reviewers)

Each smell gets its own source file, scoped tightly. Grouped below for readability; in `reviewers.src/` they are flat (wiki operators cluster them automatically).

**Bloaters**

- `smell-long-method` — single function body > ~12 effective lines or mixing abstraction levels
- `smell-large-class` — one class absorbs multiple responsibilities
- `smell-primitive-obsession` — primitives where domain types belong (Money, Email, UserId)
- `smell-long-parameter-list` — > 3–4 positional parameters; group into an object
- `smell-data-clumps` — same field cluster recurs across signatures

**Object-orientation abusers**

- `smell-switch-statements` — type-code branching where polymorphism belongs
- `smell-temporary-field` — instance field valid only sometimes; missing extracted object
- `smell-refused-bequest` — subclass ignores/overrides most of parent
- `smell-alternative-classes-different-interfaces` — same job, incompatible signatures

**Change preventers**

- `smell-divergent-change` — one class modified for multiple unrelated reasons
- `smell-shotgun-surgery` — one conceptual change requires edits across many classes
- `smell-parallel-inheritance-hierarchies` — adding a subclass in one tree forces adding one in another

**Dispensables**

- `smell-comments-as-deodorant` — code needs explanation instead of being self-documenting
- `smell-duplicate-code` — identical / near-identical logic in multiple locations
- `smell-lazy-class` — too little behavior to justify existence
- `smell-data-class` — fields + getters/setters with no behavior
- `smell-dead-code` — unreachable, unused, commented-out, dead imports
- `smell-speculative-generality` — abstraction added "just in case" with no current user

**Couplers**

- `smell-feature-envy` — method accesses another class's data more than its own
- `smell-inappropriate-intimacy` — two classes reach into each other's privates
- `smell-message-chains` — `a.b().c().d().e()` traversals
- `smell-middle-man` — class that only delegates; eliminate the pass-through
- `smell-incomplete-library-class` — wrap / extend rather than duplicate upstream

### Comment-classification vocabulary (required on every finding)

Every finding every reviewer emits must carry a `kind` from this closed vocabulary (research consensus, 5 sources):

- **`blocker`** — must fix before merge. Maps to `severity: critical` or `important`. Reserved for security, correctness, data-loss, production-break.
- **`required`** — must fix before merge but non-Critical: tests missing, docs missing, SOLID violations. Maps to `severity: important`.
- **`suggestion`** — author should strongly consider but can defer. Maps to `severity: minor`.
- **`question`** — open-ended; asks for rationale, doesn't mandate a change. Maps to `severity: minor` with `kind: question`.
- **`nit`** — stylistic, fully optional. Prefixed literally with `Nit:` in markdown output per convention. Maps to `severity: minor`.
- **`praise`** — positive feedback. Goes into the `strengths` array, not `issues`.

The `kind` field is additive to existing `severity`. Both ship in the JSON schema.

### Google's "Standard of Code Review"

Adopted verbatim from Google eng-practices and propagated into the aggregator's verdict logic:

> **Approve the change once it definitely improves the overall code health of the system being worked on, even if the change isn't perfect.**

Concretely:

- Perfection is not required. Continuous improvement is.
- If the change improves health and the author has addressed blockers, the verdict is **GO** even with open `suggestion` / `nit` findings.
- Technical facts and data overrule opinions and personal preferences.
- Style guide (if the repo has one, detected via `.editorconfig`, `.eslintrc`, `rustfmt.toml`, `ruff.toml`, etc.) is absolute authority.

The aggregator's verdict function uses this rule: `GO` iff no `blocker` findings and the health-delta is non-negative. `CONDITIONAL` if blockers are all `required` (not `critical`). `NO-GO` iff any `critical` blocker.

### Risk-based routing (Apiiro / Kluster)

The orchestrator infers a **risk tier** per file from the diff and routes accordingly:

- **High risk:** auth, authz, crypto, session handling, payment, PII, schema migrations, infrastructure, IaC, k8s manifests, RBAC changes, dependency upgrades with known CVEs.
  → Dispatch full security + compliance + architecture bundle. Block on any Critical.
- **Medium risk:** business logic, API contracts, data-access layer, background workers, state machines, event producers/consumers.
  → Dispatch correctness + tests + architecture + perf. Block on Critical; advise on Important.
- **Low risk:** docs, formatting, constants, test fixtures, logging strings.
  → Dispatch readability + docs + test-quality only. Fast-track.

Risk tier is computed at Step 0 and stored in `project_profile.per_file_risk` so it can be re-used and audited.

### Author-hygiene reviewer (pre-dispatch gate)

A single dedicated Tier 1 reviewer runs before anything else and fails the whole review fast if it finds any of these (research consensus across Medium / Appfire / Pragmatic / Jellyfish):

- Unreferenced `TODO` / `FIXME` / `XXX` / `HACK` (referenced = has a ticket id like `PROJ-123` or GitHub `#123`).
- `@Suppress` / `@SuppressWarnings` / `# type: ignore` / `// @ts-ignore` / `# noqa` without a ticket reference.
- Disabled / skipped tests (`.skip`, `xit`, `@Ignore`, `@Disabled`, `# pytest.skip`, `t.Skip()`).
- Dead imports, unused variables the compiler already flagged.
- Commented-out code blocks (heuristic: ≥ 3 consecutive commented lines that parse as code in the file's language).
- PR description < 100 characters or missing a "why".
- Commit messages that don't follow Conventional Commits when the repo opts in.

These are all **mechanical checks**. No AI reasoning needed. They become the cheapest dispatch in the ladder and catch the highest-density low-hanging issues.

### Verdict vocabulary (extended)

From the research plus the earlier output-format additions, the final verdict vocabulary is:

- **`GO`** — no blockers, code-health delta non-negative.
- **`CONDITIONAL`** — blockers are all `required` severity (not `critical`). User can merge with follow-up PR.
- **`NO-GO`** — ≥ 1 `critical` blocker. Merge blocked.
- **`MERGE_WITH_FOLLOWUP`** — cleared to merge with explicit follow-up tasks emitted as a TODO list.
- **`HOLD_FOR_INFO`** — orchestrator needs input from the user (e.g. compliance tag confirmation, risk-tier override) before a verdict can be issued.

---

## Phased execution

Tracked as a checkbox tree so progress is visible at a glance. Every phase ends with a commit checkpoint and a self-review pass (per workspace memory: "Always self-review with skill-code-review … before reporting completion"). The executor ticks `[x]` as items complete; partial work stays `[ ]`.

### Phase 0 — Bootstrap

- [x] **0.1** Create `reviewers.src/` directory (sibling of `reviewers/`)
- [x] **0.2** Add `reviewers.src/README.md` — "wiki source; do not hand-edit `reviewers.wiki/`"
- [x] **0.3** Add `reviewers.src/SCHEMA.md` — frontmatter shape reference (the YAML block from "Target architecture")
- [x] **0.4** Add `reviewers.src/` to `.gitignore` exclusion review (keep source tracked; ignore build artefacts only)
- [x] **0.5** Commit `chore: scaffold reviewers.src wiki source directory`

### Phase 1 — Source corpus authoring (the bulk of the work)

Each sub-phase authors one batch of reviewer source files. Every `.md` file follows the body-sectioning contract from "Structural & efficiency improvements": `When This Activates` / `Audit Surface` / `Detailed Checks (H3 subsections)` / `Common False Positives` / `Severity Guidance` / `See Also` / `Authoritative References`. Every file declares `tier: 1 | 2 | 3` and `dimensions: [correctness, security, performance, tests, readability, architecture, documentation]` (subset). Every sub-phase ends with a commit.

**Target scale:** ~500 source files. Author every single reviewer Claude knows would be load-bearing. The wiki operators will MERGE / NEST / DESCEND / LIFT automatically — don't self-edit for count.

#### 1.1 — Language-deep reviewers (30 files)

- [x] **1.1.1** `lang-python` — idioms, typing (PEP 484/585/604/612/646/695), dataclasses, async, GIL, pathlib, packaging (uv/poetry/pip-tools), perf (C extensions/cython), security (pickle, yaml, eval)
- [x] **1.1.2** `lang-javascript` — prototypes, hoisting, this-binding, ESM vs CJS, event loop, browser vs Node runtime
- [x] **1.1.3** `lang-typescript` — strict mode, narrowing, discriminated unions, branded types, variance, generics, `satisfies`, template literal types
- [x] **1.1.4** `lang-go` — error handling, context.Context propagation, goroutine lifetime, channels, interfaces at consumer, modules, generics, race detector
- [x] **1.1.5** `lang-swift` — optionals, value vs reference, ARC, protocol-oriented, async/await, actors, existential containers, @MainActor, Sendable
- [x] **1.1.6** `lang-rust` — ownership, borrowing, lifetimes, traits, no unwrap in prod, minimal unsafe, error types, iterators, async runtimes
- [x] **1.1.7** `lang-java` — nullability, try-with-resources, streams, records, sealed classes, virtual threads, var usage, Optional discipline
- [x] **1.1.8** `lang-kotlin` — nullability, scope functions, coroutines, Flow, data classes, sealed classes, delegation, inline classes
- [x] **1.1.9** `lang-scala` — Option over null, sealed ADTs, givens/implicits, effect systems (Cats Effect, ZIO), immutable collections, for-comprehensions
- [x] **1.1.10** `lang-csharp` — nullable reference types, async/await, IDisposable, records, pattern matching, LINQ discipline, Span<T>
- [x] **1.1.11** `lang-fsharp` — discriminated unions, computation expressions, active patterns, async workflows, measure types
- [x] **1.1.12** `lang-ruby` — idioms, blocks/procs/lambdas, metaprogramming discipline, Gemfile hygiene, Sorbet/RBS type layer
- [x] **1.1.13** `lang-php` — strict_types, PSR standards, Composer hygiene, PHPStan/Psalm baselines, readonly properties
- [x] **1.1.14** `lang-dart` — null safety, async/await, streams, Futures, isolates, records, patterns
- [x] **1.1.15** `lang-c` — undefined behaviour, integer overflow, signed/unsigned, pointer arithmetic, strict aliasing, const discipline, thread-safety
- [x] **1.1.16** `lang-cpp` — RAII, rule of 0/3/5, move semantics, smart pointers, `constexpr`, templates vs concepts, no raw new/delete
- [x] **1.1.17** `lang-objective-c` — ARC, properties, weak/strong, blocks, KVO, categories, modern syntax
- [x] **1.1.18** `lang-elixir` — OTP supervision, GenServer discipline, Ecto changesets, pattern matching, pipe operator hygiene
- [x] **1.1.19** `lang-erlang` — let-it-crash, OTP supervision, gen_server, message passing discipline, hot code loading
- [x] **1.1.20** `lang-haskell` — purity, typeclasses, monads/applicatives, laziness traps, `Text` vs `String`, strictness annotations
- [x] **1.1.21** `lang-clojure` — persistent data structures, transducers, spec, core.async, interop discipline
- [x] **1.1.22** `lang-shell-bash` — `set -euo pipefail`, quoting, trap handlers, array vs string, `$()` over backticks, shellcheck baseline
- [x] **1.1.23** `lang-sql` — injection surface, explain plans, indexes, window functions, CTEs, NULL semantics, locking modes
- [x] **1.1.24** `lang-r` — vectorisation, `apply` family, `data.table` vs `dplyr`, reproducibility (`renv`), seed discipline
- [x] **1.1.25** `lang-julia` — type stability, multiple dispatch, package compilation, `@inbounds`/`@simd` discipline, scoping
- [x] **1.1.26** `lang-zig` — comptime, error unions, defer/errdefer, no hidden allocations, build.zig hygiene
- [x] **1.1.27** `lang-nim` — destructors, generics, effect tracking, ARC/ORC, c-backend interop
- [x] **1.1.28** `lang-lua` — metatables, global vs local, `nil` pitfalls, coroutines, LuaJIT ffi
- [x] **1.1.29** `lang-powershell` — strict mode, pipelines, error action, PSScriptAnalyzer baselines, secure-string handling
- [x] **1.1.30** `lang-solidity` — reentrancy, gas discipline, integer overflow (pre-0.8), access control, upgrade patterns, oracle trust
- [x] **1.1.C** Commit `feat(reviewers.src): language-deep reviewers (30)`

#### 1.2 — Programming-principles reviewers (~15)

- [x] **1.2.1** `principle-solid` — decomposed SRP / OCP / LSP / ISP / DIP checklists
- [x] **1.2.2** `principle-grasp` — Creator, Information Expert, Controller, Low Coupling, High Cohesion, Polymorphism, Pure Fabrication, Indirection, Protected Variations
- [x] **1.2.3** `principle-dry-kiss-yagni`
- [x] **1.2.4** `principle-composition-over-inheritance`
- [x] **1.2.5** `principle-law-of-demeter`
- [x] **1.2.6** `principle-coupling-cohesion`
- [x] **1.2.7** `principle-encapsulation`
- [x] **1.2.8** `principle-immutability-by-default`
- [x] **1.2.9** `principle-fail-fast`
- [x] **1.2.10** `principle-least-astonishment`
- [x] **1.2.11** `principle-separation-of-concerns`
- [x] **1.2.12** `principle-tell-dont-ask`
- [x] **1.2.13** `principle-command-query-separation`
- [x] **1.2.14** `principle-naming-and-intent`
- [x] **1.2.15** `principle-feature-flags-and-config`
- [x] **1.2.C** Commit `feat(reviewers.src): programming-principles reviewers`

#### 1.3 — Design-pattern reviewers (~30)

Each reviewer is a **misuse-detector**, not a tutorial: where the pattern is missing / misapplied / over-applied / wrong-fit in the diff.

- [x] **1.3.a** Creational (5): `pattern-factory-method`, `pattern-abstract-factory`, `pattern-builder`, `pattern-singleton`, `pattern-prototype`
- [x] **1.3.b** Structural (7): `pattern-adapter`, `pattern-decorator`, `pattern-facade`, `pattern-proxy`, `pattern-composite`, `pattern-bridge`, `pattern-flyweight`
- [x] **1.3.c** Behavioural — part 1 (6): `pattern-observer`, `pattern-strategy`, `pattern-state`, `pattern-template-method`, `pattern-chain-of-responsibility`, `pattern-iterator`
- [x] **1.3.d** Behavioural — part 2 (5): `pattern-mediator`, `pattern-memento`, `pattern-command`, `pattern-visitor`, `pattern-interpreter`
- [x] **1.3.e** Concurrency (5): `pattern-active-object`, `pattern-monitor-object`, `pattern-thread-pool`, `pattern-double-checked-locking`, `pattern-producer-consumer`
- [x] **1.3.f** Integration / EIP (4): `pattern-eip-messaging`, `pattern-eip-routing`, `pattern-eip-transformation`, `pattern-eip-endpoint`
- [x] **1.3.g** Distributed / cloud (4): `pattern-saga`, `pattern-outbox`, `pattern-cqrs-pattern`, `pattern-event-sourcing`
- [x] **1.3.C** Commit `feat(reviewers.src): design-pattern reviewers`

#### 1.4 — Fowler code-smell reviewers (22 files)

Every smell in the canonical Refactoring taxonomy, one dedicated file.

- [x] **1.4.a** Bloaters (5): `smell-long-method`, `smell-large-class`, `smell-primitive-obsession`, `smell-long-parameter-list`, `smell-data-clumps`
- [x] **1.4.b** OO abusers (4): `smell-switch-statements`, `smell-temporary-field`, `smell-refused-bequest`, `smell-alternative-classes-different-interfaces`
- [x] **1.4.c** Change preventers (3): `smell-divergent-change`, `smell-shotgun-surgery`, `smell-parallel-inheritance-hierarchies`
- [x] **1.4.d** Dispensables (6): `smell-comments-as-deodorant`, `smell-duplicate-code`, `smell-lazy-class`, `smell-data-class`, `smell-dead-code`, `smell-speculative-generality`
- [x] **1.4.e** Couplers (5): `smell-feature-envy`, `smell-inappropriate-intimacy`, `smell-message-chains`, `smell-middle-man`, `smell-incomplete-library-class`
- [x] **1.4.C** Commit `feat(reviewers.src): fowler code-smell reviewers (22)`

#### 1.5 — Anti-pattern reviewers (~18)

- [x] **1.5.1** `antipattern-god-object`
- [x] **1.5.2** `antipattern-big-ball-of-mud`
- [x] **1.5.3** `antipattern-boat-anchor`
- [x] **1.5.4** `antipattern-lava-flow`
- [x] **1.5.5** `antipattern-chatty-coupling`
- [x] **1.5.6** `antipattern-copy-paste`
- [x] **1.5.7** `antipattern-spaghetti-code`
- [x] **1.5.8** `antipattern-anemic-domain-model`
- [x] **1.5.9** `antipattern-distributed-monolith`
- [x] **1.5.10** `antipattern-golden-hammer`
- [x] **1.5.11** `antipattern-over-abstraction`
- [x] **1.5.12** `antipattern-patternitis`
- [x] **1.5.13** `antipattern-flaky-non-deterministic-tests`
- [x] **1.5.14** `antipattern-premature-optimization`
- [x] **1.5.15** `antipattern-shared-database-across-services`
- [x] **1.5.16** `antipattern-magic-numbers-strings`
- [x] **1.5.17** `antipattern-exception-swallowing`
- [x] **1.5.18** `antipattern-singleton-as-global`
- [x] **1.5.C** Commit `feat(reviewers.src): anti-pattern reviewers`

#### 1.6 — Author-hygiene & process reviewers (per methodology section)

- [x] **1.6.1** `author-self-review-hygiene` — pre-dispatch gate: TODO/FIXME/HACK with ticket, no `@Suppress`/`# noqa`/`@ts-ignore` without ticket, no skipped tests, no dead imports, no commented-out code blocks, PR description present and non-trivial
- [x] **1.6.2** `conventional-commits-discipline`
- [x] **1.6.3** `pr-size-and-single-purpose` (wired into orchestrator threshold gates too)
- [x] **1.6.4** `pr-description-quality`
- [x] **1.6.5** `ci-green-precondition` — refuses to dispatch expensive reviewers when lint/type/tests/SAST/SCA are red
- [x] **1.6.6** `style-guide-supremacy` — detects `.editorconfig`/`.eslintrc`/`ruff.toml`/`rustfmt.toml` and treats them as absolute authority; flags style debates where the guide is decisive
- [x] **1.6.C** Commit `feat(reviewers.src): author-hygiene and process reviewers`

#### 1.7 — Security reviewers (DECOMPOSE deep, ~25)

- [x] **1.7.1** `sec-owasp-a01-broken-access-control`
- [x] **1.7.2** `sec-owasp-a02-crypto-failures`
- [x] **1.7.3** `sec-owasp-a03-injection` (decompose: SQL, NoSQL, LDAP, OS command, template, ORM, XPath)
- [x] **1.7.4** `sec-owasp-a04-insecure-design`
- [x] **1.7.5** `sec-owasp-a05-misconfiguration`
- [x] **1.7.6** `sec-owasp-a06-vulnerable-components`
- [x] **1.7.7** `sec-owasp-a07-authn-failures`
- [x] **1.7.8** `sec-owasp-a08-integrity-failures`
- [x] **1.7.9** `sec-owasp-a09-logging-monitoring-failures`
- [x] **1.7.10** `sec-owasp-a10-ssrf`
- [x] **1.7.11** `sec-xss-dom` / `sec-xss-stored` / `sec-xss-reflected`
- [x] **1.7.12** `sec-csrf`
- [x] **1.7.13** `sec-clickjacking-and-headers` (CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy)
- [x] **1.7.14** `sec-request-smuggling-and-cache-poisoning`
- [x] **1.7.15** `sec-deserialization`
- [x] **1.7.16** `sec-xxe-and-xml-parsers`
- [x] **1.7.17** `sec-path-traversal-and-file-uploads`
- [x] **1.7.18** `sec-open-redirect`
- [x] **1.7.19** `sec-ssti` (server-side template injection)
- [x] **1.7.20** `sec-idor-and-mass-assignment`
- [x] **1.7.21** `sec-http-parameter-pollution`
- [x] **1.7.22** `sec-rate-limit-and-dos`
- [x] **1.7.23** `sec-secrets-management-and-rotation`
- [x] **1.7.24** `sec-supply-chain-sbom-slsa-sigstore`
- [x] **1.7.25** `sec-threat-modeling-stride-dread-linddun`
- [x] **1.7.C** Commit `feat(reviewers.src): decomposed security reviewers (25)`

#### 1.8 — Cryptography & secrets reviewers (~12)

- [x] **1.8.1** `crypto-algorithm-selection` — modern, non-deprecated primitives only
- [x] **1.8.2** `crypto-key-management-kms-hsm-vault`
- [x] **1.8.3** `crypto-nonce-iv-management`
- [x] **1.8.4** `crypto-padding-oracle`
- [x] **1.8.5** `crypto-timing-attacks`
- [x] **1.8.6** `crypto-rng-csprng`
- [x] **1.8.7** `crypto-hash-selection-and-salting`
- [x] **1.8.8** `crypto-password-hashing-argon2-scrypt-bcrypt`
- [x] **1.8.9** `crypto-jwt-pitfalls` (alg=none, kid injection, key confusion, HS/RS mix)
- [x] **1.8.10** `crypto-oauth-oidc-pitfalls`
- [x] **1.8.11** `crypto-saml-pitfalls`
- [x] **1.8.12** `crypto-webauthn-passkeys` / `crypto-mtls` / `crypto-tls-configuration`
- [x] **1.8.C** Commit `feat(reviewers.src): cryptography reviewers`

#### 1.9 — Compliance / regulatory reviewers (~10)

- [x] **1.9.1** `compliance-pci-dss`
- [x] **1.9.2** `compliance-hipaa-phi`
- [x] **1.9.3** `compliance-gdpr-data-subject-rights`
- [x] **1.9.4** `compliance-ccpa-cpra`
- [x] **1.9.5** `compliance-soc2`
- [x] **1.9.6** `compliance-iso27001`
- [x] **1.9.7** `compliance-fedramp-nist-800-53`
- [x] **1.9.8** `compliance-nis2-dora-eu`
- [x] **1.9.9** `compliance-pii-handling-and-minimization`
- [x] **1.9.10** `compliance-consent-tracking-and-retention`
- [x] **1.9.C** Commit `feat(reviewers.src): compliance reviewers`

#### 1.10 — Testing reviewers (DECOMPOSE deep, ~16)

- [x] **1.10.1** `test-unit-discipline` (Arrange-Act-Assert, one-assertion-per-behaviour)
- [x] **1.10.2** `test-integration`
- [x] **1.10.3** `test-contract-pact`
- [x] **1.10.4** `test-e2e-strategy`
- [x] **1.10.5** `test-property-based`
- [x] **1.10.6** `test-mutation`
- [x] **1.10.7** `test-fuzzing`
- [x] **1.10.8** `test-snapshot-and-golden-file`
- [x] **1.10.9** `test-characterization`
- [x] **1.10.10** `test-doubles-and-isolation`
- [x] **1.10.11** `test-coverage-quality-not-quantity`
- [x] **1.10.12** `test-load-k6-locust-gatling-jmeter`
- [x] **1.10.13** `test-performance-regression`
- [x] **1.10.14** `test-chaos-engineering`
- [x] **1.10.15** `test-visual-regression` (Percy, Chromatic, Playwright snapshots)
- [x] **1.10.16** `test-accessibility-axe-lighthouse`
- [x] **1.10.C** Commit `feat(reviewers.src): testing reviewers`

#### 1.11 — Architecture-style reviewers (~18)

- [x] **1.11.1** `arch-clean-architecture`
- [x] **1.11.2** `arch-hexagonal-ports-adapters`
- [x] **1.11.3** `arch-layered`
- [x] **1.11.4** `arch-modular-monolith`
- [x] **1.11.5** `arch-microservices`
- [x] **1.11.6** `arch-event-driven`
- [x] **1.11.7** `arch-cqrs`
- [x] **1.11.8** `arch-event-sourcing`
- [x] **1.11.9** `arch-serverless`
- [x] **1.11.10** `arch-edge-computing`
- [x] **1.11.11** `arch-multi-tenant-saas`
- [x] **1.11.12** `arch-cell-based`
- [x] **1.11.13** `arch-bff-backend-for-frontend`
- [x] **1.11.14** `arch-sidecar-ambassador`
- [x] **1.11.15** `arch-choreography-vs-orchestration`
- [x] **1.11.16** `arch-workflow-engines-temporal-cadence`
- [x] **1.11.17** `arch-micro-frontends-module-federation`
- [x] **1.11.18** `arch-state-machines`
- [x] **1.11.C** Commit `feat(reviewers.src): architecture-style reviewers`

#### 1.12 — Domain-driven design reviewers (~10)

- [x] **1.12.1** `ddd-ubiquitous-language`
- [x] **1.12.2** `ddd-strategic-bounded-contexts`
- [x] **1.12.3** `ddd-context-mapping`
- [x] **1.12.4** `ddd-tactical-aggregates`
- [x] **1.12.5** `ddd-tactical-value-objects`
- [x] **1.12.6** `ddd-tactical-entities`
- [x] **1.12.7** `ddd-tactical-domain-events`
- [x] **1.12.8** `ddd-tactical-repositories`
- [x] **1.12.9** `ddd-tactical-application-services`
- [x] **1.12.10** `ddd-tactical-specification`
- [x] **1.12.C** Commit `feat(reviewers.src): DDD reviewers`

#### 1.13 — API / interface reviewers (~14)

- [x] **1.13.1** `api-rest`
- [x] **1.13.2** `api-graphql`
- [x] **1.13.3** `api-grpc`
- [x] **1.13.4** `api-async-event`
- [x] **1.13.5** `api-webhook`
- [x] **1.13.6** `api-sdk`
- [x] **1.13.7** `api-versioning-deprecation`
- [x] **1.13.8** `api-hateoas-jsonapi-jsonld`
- [x] **1.13.9** `api-problem-json-rfc7807`
- [x] **1.13.10** `api-openapi-asyncapi-schema`
- [x] **1.13.11** `api-sse-and-websocket-protocol`
- [x] **1.13.12** `api-trpc`
- [x] **1.13.13** `api-federation-apollo`
- [x] **1.13.14** `api-gateway-and-bff-composition`
- [x] **1.13.C** Commit `feat(reviewers.src): api reviewers`

#### 1.14 — Data architecture reviewers (~12)

- [x] **1.14.1** `data-relational-modeling`
- [x] **1.14.2** `data-document-modeling`
- [x] **1.14.3** `data-graph-modeling`
- [x] **1.14.4** `data-time-series-modeling`
- [x] **1.14.5** `data-vector-modeling` (embeddings, dim, distance)
- [x] **1.14.6** `data-n-plus-1-and-query-perf`
- [x] **1.14.7** `data-sharding-partitioning`
- [x] **1.14.8** `data-replication-consistency`
- [x] **1.14.9** `data-schema-migrations`
- [x] **1.14.10** `data-cdc-event-sourcing`
- [x] **1.14.11** `data-retention-and-gdpr`
- [x] **1.14.12** `data-backup-restore-dr-rpo-rto`
- [x] **1.14.C** Commit `feat(reviewers.src): data architecture reviewers`

#### 1.15 — Database-technology reviewers (~18)

- [x] **1.15.1** `db-postgres` (VACUUM, MVCC, EXPLAIN, lock modes, partial/GIN/GIST/BRIN indexes)
- [x] **1.15.2** `db-mysql-mariadb` (engines, replication, deadlocks, gap locks)
- [x] **1.15.3** `db-sqlite` (WAL, vacuum, FTS5, JSON1)
- [x] **1.15.4** `db-mongodb`
- [x] **1.15.5** `db-cassandra-scylla`
- [x] **1.15.6** `db-dynamodb-single-table`
- [x] **1.15.7** `db-redis`
- [x] **1.15.8** `db-memcached`
- [x] **1.15.9** `db-clickhouse`
- [x] **1.15.10** `db-timescaledb-influxdb`
- [x] **1.15.11** `db-elasticsearch-opensearch`
- [x] **1.15.12** `db-neo4j-graph`
- [x] **1.15.13** `db-pgvector-pinecone-weaviate-qdrant-milvus`
- [x] **1.15.14** `db-bigquery`
- [x] **1.15.15** `db-snowflake`
- [x] **1.15.16** `db-redshift`
- [x] **1.15.17** `db-cockroachdb-spanner-tidb`
- [x] **1.15.18** `db-connection-pooling` (PgBouncer, RDS proxy, pool sizing)
- [x] **1.15.C** Commit `feat(reviewers.src): database technology reviewers`

#### 1.16 — ORM / migration-tool reviewers (~14)

- [x] **1.16.1** `orm-prisma`
- [x] **1.16.2** `orm-drizzle`
- [x] **1.16.3** `orm-sqlalchemy`
- [x] **1.16.4** `orm-typeorm`
- [x] **1.16.5** `orm-hibernate-jpa`
- [x] **1.16.6** `orm-django`
- [x] **1.16.7** `orm-activerecord-rails`
- [x] **1.16.8** `orm-ecto-elixir`
- [x] **1.16.9** `orm-diesel-sqlx-rust`
- [x] **1.16.10** `migration-flyway-liquibase`
- [x] **1.16.11** `migration-alembic`
- [x] **1.16.12** `migration-atlas-goose`
- [x] **1.16.13** `migration-knex-objection`
- [x] **1.16.14** `migration-safe-online-patterns` (expand-contract, blue/green, dual-write)
- [x] **1.16.C** Commit `feat(reviewers.src): ORM and migration reviewers`

#### 1.17 — Reliability / resilience reviewers (~12)

- [x] **1.17.1** `reliability-retry-with-backoff`
- [x] **1.17.2** `reliability-circuit-breaker`
- [x] **1.17.3** `reliability-bulkhead-isolation`
- [x] **1.17.4** `reliability-timeout-deadline-propagation`
- [x] **1.17.5** `reliability-idempotency`
- [x] **1.17.6** `reliability-saga-distributed-tx`
- [x] **1.17.7** `reliability-backpressure`
- [x] **1.17.8** `reliability-graceful-degradation`
- [x] **1.17.9** `reliability-health-checks`
- [x] **1.17.10** `reliability-load-shedding`
- [x] **1.17.11** `reliability-exactly-once-semantics`
- [x] **1.17.12** `reliability-multi-region-failover`
- [x] **1.17.C** Commit `feat(reviewers.src): reliability reviewers`

#### 1.18 — Performance reviewers (~14)

- [x] **1.18.1** `perf-big-o-analysis`
- [x] **1.18.2** `perf-hot-path-allocations`
- [x] **1.18.3** `perf-caching-strategy`
- [x] **1.18.4** `perf-db-query`
- [x] **1.18.5** `perf-memory-gc`
- [x] **1.18.6** `perf-network-io`
- [x] **1.18.7** `perf-startup-cold-start`
- [x] **1.18.8** `perf-jit-warmup`
- [x] **1.18.9** `perf-aot-graalvm-mojo`
- [x] **1.18.10** `perf-simd-vectorization`
- [x] **1.18.11** `perf-cache-locality-false-sharing`
- [x] **1.18.12** `perf-numa-awareness`
- [x] **1.18.13** `perf-io-multiplexing-epoll-kqueue-io-uring`
- [x] **1.18.14** `perf-profiling-discipline` (pprof, perf, dtrace, Instruments, async-profiler, py-spy, scalene, flamegraphs)
- [x] **1.18.C** Commit `feat(reviewers.src): performance reviewers`

#### 1.19 — Concurrency reviewers (~12)

- [x] **1.19.1** `conc-race-conditions-data-races`
- [x] **1.19.2** `conc-lock-discipline-deadlock`
- [x] **1.19.3** `conc-lock-free-atomics`
- [x] **1.19.4** `conc-actor-model`
- [x] **1.19.5** `conc-csp-channels`
- [x] **1.19.6** `conc-async-cancellation`
- [x] **1.19.7** `conc-futures-promises`
- [x] **1.19.8** `conc-structured-concurrency`
- [x] **1.19.9** `conc-work-stealing`
- [x] **1.19.10** `conc-stm` (software transactional memory)
- [x] **1.19.11** `conc-memory-model-ordering`
- [x] **1.19.12** `conc-starvation-and-livelock`
- [x] **1.19.C** Commit `feat(reviewers.src): concurrency reviewers`

#### 1.20 — Observability reviewers (~12)

- [x] **1.20.1** `obs-structured-logging`
- [x] **1.20.2** `obs-metrics-red-use-golden-signals`
- [x] **1.20.3** `obs-distributed-tracing`
- [x] **1.20.4** `obs-sli-slo-error-budgets`
- [x] **1.20.5** `obs-alerting-discipline`
- [x] **1.20.6** `obs-audit-trail`
- [x] **1.20.7** `obs-opentelemetry-sdk-discipline`
- [x] **1.20.8** `obs-cardinality-budgeting`
- [x] **1.20.9** `obs-sampling-strategies`
- [x] **1.20.10** `obs-continuous-profiling-pyroscope-parca`
- [x] **1.20.11** `obs-error-tracking-sentry-rollbar-bugsnag`
- [x] **1.20.12** `obs-ebpf-discipline`
- [x] **1.20.C** Commit `feat(reviewers.src): observability reviewers`

#### 1.21 — Web-framework reviewers (~30)

- [x] **1.21.1** React — `fw-react`
- [x] **1.21.2** Next.js — `fw-nextjs`
- [x] **1.21.3** Vue / Nuxt — `fw-vue-nuxt`
- [x] **1.21.4** Svelte / SvelteKit — `fw-svelte-sveltekit`
- [x] **1.21.5** Angular — `fw-angular`
- [x] **1.21.6** SolidJS — `fw-solidjs`
- [x] **1.21.7** Qwik — `fw-qwik`
- [x] **1.21.8** Astro — `fw-astro`
- [x] **1.21.9** Remix — `fw-remix`
- [x] **1.21.10** Express — `fw-express`
- [x] **1.21.11** Fastify — `fw-fastify`
- [x] **1.21.12** NestJS — `fw-nestjs`
- [x] **1.21.13** Hono — `fw-hono`
- [x] **1.21.14** Django — `fw-django`
- [x] **1.21.15** Flask / Quart — `fw-flask-quart`
- [x] **1.21.16** FastAPI / Starlette / Litestar — `fw-fastapi-starlette-litestar`
- [x] **1.21.17** Rails — `fw-rails`
- [x] **1.21.18** Sinatra / Hanami — `fw-sinatra-hanami`
- [x] **1.21.19** Laravel / Symfony — `fw-laravel-symfony`
- [x] **1.21.20** ASP.NET Core / Blazor — `fw-aspnetcore-blazor`
- [x] **1.21.21** Gin / Echo / Fiber / Chi — `fw-go-web-frameworks`
- [x] **1.21.22** Axum / Actix-web / Rocket — `fw-rust-web-frameworks`
- [x] **1.21.23** Spring Boot / Spring WebFlux — `fw-spring`
- [x] **1.21.24** Quarkus / Micronaut — `fw-quarkus-micronaut`
- [x] **1.21.25** Ktor — `fw-ktor`
- [x] **1.21.26** Phoenix — `fw-phoenix-elixir`
- [x] **1.21.27** Vapor — `fw-vapor-swift`
- [x] **1.21.28** Play / Akka HTTP / http4s — `fw-scala-web`
- [x] **1.21.29** htmx — `fw-htmx`
- [x] **1.21.30** tRPC — `fw-trpc`
- [x] **1.21.C** Commit `feat(reviewers.src): web-framework reviewers`

#### 1.22 — Frontend tooling & runtime reviewers (~15)

- [x] **1.22.1** `fe-build-vite`
- [x] **1.22.2** `fe-build-webpack`
- [x] **1.22.3** `fe-build-esbuild-turbopack`
- [x] **1.22.4** `fe-css-tailwind`
- [x] **1.22.5** `fe-css-unocss-stylex-panda`
- [x] **1.22.6** `fe-components-shadcn-radix-mui-antd-chakra`
- [x] **1.22.7** `fe-state-redux-zustand-mobx-jotai-recoil-pinia`
- [x] **1.22.8** `fe-data-react-query-swr-apollo-relay-urql`
- [x] **1.22.9** `fe-core-web-vitals-lighthouse`
- [x] **1.22.10** `fe-bundle-analysis-tree-shaking`
- [x] **1.22.11** `fe-image-font-optimization`
- [x] **1.22.12** `fe-ssr-csr-ssg-isr-islands`
- [x] **1.22.13** `fe-hydration-mismatch`
- [x] **1.22.14** `fe-service-worker-pwa`
- [x] **1.22.15** `fe-csp-sri`
- [x] **1.22.C** Commit `feat(reviewers.src): frontend tooling reviewers`

#### 1.23 — Accessibility reviewers (~6)

- [x] **1.23.1** `a11y-wcag-2-2-aa`
- [x] **1.23.2** `a11y-aria-and-live-regions`
- [x] **1.23.3** `a11y-keyboard-navigation`
- [x] **1.23.4** `a11y-screen-reader-affordances`
- [x] **1.23.5** `a11y-reduced-motion-and-prefers-color-scheme`
- [x] **1.23.6** `a11y-native-platform-ios-android`
- [x] **1.23.C** Commit `feat(reviewers.src): accessibility reviewers`

#### 1.24 — Mobile-platform reviewers (~12)

- [x] **1.24.1** `mob-swiftui`
- [x] **1.24.2** `mob-uikit`
- [x] **1.24.3** `mob-combine-reactive`
- [x] **1.24.4** `mob-swift-concurrency-actors`
- [x] **1.24.5** `mob-core-data-swiftdata`
- [x] **1.24.6** `mob-jetpack-compose`
- [x] **1.24.7** `mob-kotlin-coroutines-flow`
- [x] **1.24.8** `mob-android-room-hilt-workmanager`
- [x] **1.24.9** `mob-react-native`
- [x] **1.24.10** `mob-flutter`
- [x] **1.24.11** `mob-kotlin-multiplatform`
- [x] **1.24.12** `mob-perf-60fps-battery-network`
- [x] **1.24.C** Commit `feat(reviewers.src): mobile reviewers`

#### 1.25 — AI / ML / LLM reviewers (~22)

- [x] **1.25.1** `ai-llm-prompt-engineering-quality`
- [x] **1.25.2** `ai-llm-prompt-injection-defense`
- [x] **1.25.3** `ai-llm-output-validation-structured`
- [x] **1.25.4** `ai-llm-rag-quality` (chunking, retrieval, reranking, eval)
- [x] **1.25.5** `ai-llm-embeddings-hygiene`
- [x] **1.25.6** `ai-llm-vector-store-query`
- [x] **1.25.7** `ai-llm-tool-use-safety`
- [x] **1.25.8** `ai-llm-agent-design` (planning, reflection, multi-agent, guardrails)
- [x] **1.25.9** `ai-llm-frameworks-langchain-llamaindex-haystack-dspy`
- [x] **1.25.10** `ai-llm-sdk-anthropic-openai-cohere`
- [x] **1.25.11** `ai-llm-mcp-server-discipline`
- [x] **1.25.12** `ai-llm-eval-harness` (LLM-as-judge, golden datasets)
- [x] **1.25.13** `ai-llm-cost-token-spend-monitoring`
- [x] **1.25.14** `ai-llm-streaming-latency`
- [x] **1.25.15** `ai-llm-hallucination-handling`
- [x] **1.25.16** `ai-llm-bias-and-privacy-leakage`
- [x] **1.25.17** `ai-ml-training-pytorch-tensorflow-jax-sklearn`
- [x] **1.25.18** `ai-ml-data-pipelines-pandas-polars-dask-spark`
- [x] **1.25.19** `ai-ml-experiment-tracking-mlflow-wandb`
- [x] **1.25.20** `ai-ml-orchestration-airflow-prefect-dagster-kubeflow`
- [x] **1.25.21** `ai-ml-gpu-cuda-pitfalls`
- [x] **1.25.22** `ai-ml-distributed-training-ddp-fsdp-deepspeed`
- [x] **1.25.C** Commit `feat(reviewers.src): AI/ML/LLM reviewers`

#### 1.26 — Cloud-platform reviewers (~18)

- [x] **1.26.1** `cloud-aws-iam-least-privilege`
- [x] **1.26.2** `cloud-aws-kms-crypto`
- [x] **1.26.3** `cloud-aws-lambda` (cold-start, concurrency, layers, timeouts)
- [x] **1.26.4** `cloud-aws-api-gateway`
- [x] **1.26.5** `cloud-aws-s3` (encryption, public-access, versioning, lifecycle)
- [x] **1.26.6** `cloud-aws-dynamodb-single-table`
- [x] **1.26.7** `cloud-aws-rds-aurora`
- [x] **1.26.8** `cloud-aws-eventbridge-sqs-sns-kinesis-step-functions`
- [x] **1.26.9** `cloud-aws-cloudformation-sam-cdk`
- [x] **1.26.10** `cloud-gcp-iam-and-workload-identity`
- [x] **1.26.11** `cloud-gcp-cloud-functions-cloud-run`
- [x] **1.26.12** `cloud-gcp-bigquery-pubsub`
- [x] **1.26.13** `cloud-gcp-gke`
- [x] **1.26.14** `cloud-azure-managed-identity-aks`
- [x] **1.26.15** `cloud-azure-functions-cosmos-db`
- [x] **1.26.16** `cloud-cloudflare-workers-durable-objects-r2-d1`
- [x] **1.26.17** `cloud-vercel-netlify-edge`
- [x] **1.26.18** `cloud-fly-render-railway`
- [x] **1.26.C** Commit `feat(reviewers.src): cloud-platform reviewers`

#### 1.27 — Containers & Kubernetes reviewers (~14)

- [x] **1.27.1** `k8s-manifest-correctness` (resources, probes, securityContext)
- [x] **1.27.2** `k8s-rbac`
- [x] **1.27.3** `k8s-network-policies`
- [x] **1.27.4** `k8s-pod-security-standards`
- [x] **1.27.5** `k8s-admission-opa-kyverno-gatekeeper`
- [x] **1.27.6** `k8s-service-mesh-istio-linkerd-consul`
- [x] **1.27.7** `k8s-helm-chart-quality`
- [x] **1.27.8** `k8s-kustomize-discipline`
- [x] **1.27.9** `k8s-operator-and-crd-design`
- [x] **1.27.10** `container-image-hardening` (non-root, minimal base, multi-stage)
- [x] **1.27.11** `container-docker-compose-discipline`
- [x] **1.27.12** `container-runtime-gvisor-kata-sysbox`
- [x] **1.27.13** `container-image-scanning-trivy-grype-clair`
- [x] **1.27.14** `container-sbom-cyclonedx-spdx`
- [x] **1.27.C** Commit `feat(reviewers.src): container / k8s reviewers`

#### 1.28 — IaC / GitOps reviewers (~12)

- [x] **1.28.1** `iac-terraform` (modules, state, drift)
- [x] **1.28.2** `iac-pulumi`
- [x] **1.28.3** `iac-cloudformation-sam-cdk`
- [x] **1.28.4** `iac-bicep-arm`
- [x] **1.28.5** `iac-crossplane`
- [x] **1.28.6** `iac-ansible`
- [x] **1.28.7** `iac-chef-puppet-salt`
- [x] **1.28.8** `iac-argocd`
- [x] **1.28.9** `iac-fluxcd`
- [x] **1.28.10** `iac-nix`
- [x] **1.28.11** `iac-secrets-sops-sealed-secrets-vault`
- [x] **1.28.12** `iac-drift-detection`
- [x] **1.28.C** Commit `feat(reviewers.src): IaC / GitOps reviewers`

#### 1.29 — CI/CD reviewers (~12)

- [x] **1.29.1** `cicd-github-actions`
- [x] **1.29.2** `cicd-gitlab-ci`
- [x] **1.29.3** `cicd-circleci`
- [x] **1.29.4** `cicd-jenkins`
- [x] **1.29.5** `cicd-azure-devops-pipelines`
- [x] **1.29.6** `cicd-buildkite-drone-tekton`
- [x] **1.29.7** `cicd-argo-workflows`
- [x] **1.29.8** `cicd-pipeline-secrets-discipline`
- [x] **1.29.9** `cicd-caching-strategy`
- [x] **1.29.10** `cicd-test-parallelization-and-flaky-quarantine`
- [x] **1.29.11** `cicd-merge-queue-and-branch-protection`
- [x] **1.29.12** `cicd-deploy-strategies` (blue/green, canary, rolling, feature-flag)
- [x] **1.29.C** Commit `feat(reviewers.src): CI/CD reviewers`

#### 1.30 — Build tools, package managers, monorepos (~16)

- [x] **1.30.1** `build-npm-yarn-pnpm-bun`
- [x] **1.30.2** `build-pip-poetry-uv-pdm-rye`
- [x] **1.30.3** `build-cargo`
- [x] **1.30.4** `build-go-modules`
- [x] **1.30.5** `build-maven-gradle`
- [x] **1.30.6** `build-bundler`
- [x] **1.30.7** `build-composer`
- [x] **1.30.8** `build-nuget`
- [x] **1.30.9** `build-swiftpm-cocoapods`
- [x] **1.30.10** `build-mix-elixir`
- [x] **1.30.11** `build-bazel-buck-pants`
- [x] **1.30.12** `build-nx-turbo-lerna-rush-lage`
- [x] **1.30.13** `build-earthly`
- [x] **1.30.14** `build-reproducibility-slsa-sigstore`
- [x] **1.30.15** `build-lockfile-hygiene`
- [x] **1.30.16** `build-vendored-toolchain`
- [x] **1.30.C** Commit `feat(reviewers.src): build / package-manager reviewers`

#### 1.31 — Linters / formatters / type checkers (~10)

- [x] **1.31.1** `tool-eslint`
- [x] **1.31.2** `tool-ruff-pylint`
- [x] **1.31.3** `tool-golangci-lint`
- [x] **1.31.4** `tool-clippy`
- [x] **1.31.5** `tool-rubocop`
- [x] **1.31.6** `tool-phpstan-psalm-phan`
- [x] **1.31.7** `tool-sonarqube-semgrep-codeql`
- [x] **1.31.8** `tool-mypy-pyright-pyre`
- [x] **1.31.9** `tool-tsc-flow`
- [x] **1.31.10** `tool-prettier-black-gofmt-rustfmt`
- [x] **1.31.C** Commit `feat(reviewers.src): linter / formatter / type-checker reviewers`

#### 1.32 — Documentation & modeling reviewers (~10)

- [x] **1.32.1** `doc-readme-root`
- [x] **1.32.2** `doc-adr-discipline` (Nygard, MADR, Y-statements)
- [x] **1.32.3** `doc-c4-and-structurizr`
- [x] **1.32.4** `doc-uml`
- [x] **1.32.5** `doc-mermaid-plantuml`
- [x] **1.32.6** `doc-runbook-oncall`
- [x] **1.32.7** `doc-openapi-asyncapi`
- [x] **1.32.8** `doc-jsdoc-tsdoc-godoc-rustdoc-javadoc`
- [x] **1.32.9** `doc-changelog-keep-a-changelog`
- [x] **1.32.10** `doc-site-generators` (sphinx, mkdocs, vuepress, docusaurus)
- [x] **1.32.C** Commit `feat(reviewers.src): documentation / modeling reviewers`

#### 1.33 — Subtle-bugs & footgun reviewers (cross-cutting blind spots, ~18)

One dedicated reviewer per blind spot listed earlier.

- [x] **1.33.1** `footgun-time-dates-timezones`
- [x] **1.33.2** `footgun-money-decimals-precision`
- [x] **1.33.3** `footgun-encoding-unicode-normalization`
- [x] **1.33.4** `footgun-bidi-rtl-locale-collation`
- [x] **1.33.5** `footgun-integer-overflow-sign-extension`
- [x] **1.33.6** `footgun-floating-point-comparison`
- [x] **1.33.7** `footgun-off-by-one`
- [x] **1.33.8** `footgun-regex-redos`
- [x] **1.33.9** `footgun-file-path-cross-platform`
- [x] **1.33.10** `footgun-toctou-race`
- [x] **1.33.11** `footgun-resource-exhaustion-via-input`
- [x] **1.33.12** `footgun-hash-collision-dos`
- [x] **1.33.13** `footgun-hash-selection-and-salting`
- [x] **1.33.14** `footgun-rng-csprng`
- [x] **1.33.15** `footgun-memory-ordering-atomics`
- [x] **1.33.16** `footgun-endianness-wire-format`
- [x] **1.33.17** `footgun-pluralization-cldr`
- [x] **1.33.18** `footgun-name-address-phone-format-assumptions`
- [x] **1.33.C** Commit `feat(reviewers.src): footgun reviewers`

#### 1.34 — Domain-vertical reviewers (~14)

- [x] **1.34.1** `domain-fintech-ledger-double-entry` (idempotent payments, currency precision, settlement, ledger discipline)
- [x] **1.34.2** `domain-fintech-fraud-kyc-aml`
- [x] **1.34.3** `domain-healthtech-hl7-fhir-phi`
- [x] **1.34.4** `domain-ecommerce-cart-inventory-tax-shipping`
- [x] **1.34.5** `domain-gaming-game-loops-networking`
- [x] **1.34.6** `domain-gaming-anti-cheat`
- [x] **1.34.7** `domain-iot-mqtt-coap-ota-fleet`
- [x] **1.34.8** `domain-real-time-crdt-ot-presence-websocket`
- [x] **1.34.9** `domain-streaming-kafka-pulsar-kinesis-watermarks`
- [x] **1.34.10** `domain-media-codecs-drm-transcoding-ffmpeg`
- [x] **1.34.11** `domain-maps-geo-postgis-h3-geohash`
- [x] **1.34.12** `domain-search-ranking-bm25-vector-hybrid`
- [x] **1.34.13** `domain-recommendations-cf-content-hybrid`
- [x] **1.34.14** `domain-blockchain-smart-contracts` (reentrancy, gas, oracles)
- [x] **1.34.C** Commit `feat(reviewers.src): domain-vertical reviewers`

#### 1.35 — Network & protocol reviewers (~8)

- [x] **1.35.1** `net-http-1-1-2-3-quic`
- [x] **1.35.2** `net-grpc-streaming`
- [x] **1.35.3** `net-websocket-protocol`
- [x] **1.35.4** `net-webrtc`
- [x] **1.35.5** `net-mqtt-amqp-stomp`
- [x] **1.35.6** `net-dns-pitfalls`
- [x] **1.35.7** `net-tcp-keepalive-timeouts-retries`
- [x] **1.35.8** `net-tls-configuration`
- [x] **1.35.C** Commit `feat(reviewers.src): network / protocol reviewers`

#### 1.36 — Modernization & refactoring reviewers (~8)

- [x] **1.36.1** `modern-strangler-fig`
- [x] **1.36.2** `modern-branch-by-abstraction`
- [x] **1.36.3** `modern-parallel-run`
- [x] **1.36.4** `modern-expand-contract`
- [x] **1.36.5** `modern-dead-code-removal-discipline`
- [x] **1.36.6** `modern-legacy-wrap-and-replace`
- [x] **1.36.7** `modern-dependency-upgrade-discipline`
- [x] **1.36.8** `modern-versioning-semver-compat-matrix`
- [x] **1.36.C** Commit `feat(reviewers.src): modernization reviewers`

#### 1.37 — Quality attributes & cross-cutting reviewers (~10)

- [x] **1.37.1** `qa-maintainability`
- [x] **1.37.2** `qa-modifiability`
- [x] **1.37.3** `qa-portability-interoperability`
- [x] **1.37.4** `qa-usability-beyond-a11y`
- [x] **1.37.5** `qa-cost-finops`
- [x] **1.37.6** `qa-sustainability-green-software`
- [x] **1.37.7** `qa-privacy-by-design`
- [x] **1.37.8** `qa-data-minimization`
- [x] **1.37.9** `qa-testability-by-design`
- [x] **1.37.10** `qa-deployability`
- [x] **1.37.C** Commit `feat(reviewers.src): quality-attribute reviewers`

#### 1.38 — Cross-cutting / orchestration glue (3)

- [x] **1.38.1** `glue-initialization-hygiene`
- [x] **1.38.2** `glue-dependency-supply-chain`
- [x] **1.38.3** `glue-release-readiness` (aggregator — gates re-pointed at decomposed ids)
- [x] **1.38.C** Commit `feat(reviewers.src): orchestration-glue reviewers`

#### 1.39 — Gap-fill pass (full-coverage mandate, Claude-knowledge beyond archman + consensus sources)

Walk the whole corpus and add anything legitimately missing. Candidate territories (non-exhaustive seed — add more as discovered):

- [x] **1.39.1** WebAssembly safety boundary (`wasm-safety-boundary`, `wasm-sandboxing`, `wasm-interface-types`)
- [x] **1.39.2** Edge runtimes beyond Cloudflare (Deno Deploy, Bun runtime, Node.js modes)
- [x] **1.39.3** Event-bus discipline beyond Kafka (NATS, Redpanda, EventStoreDB)
- [x] **1.39.4** Search & indexing pitfalls (Tantivy, Meilisearch, Typesense, Algolia)
- [x] **1.39.5** CDN discipline (Cloudflare, Fastly, CloudFront) — cache keys, TTL, purging
- [x] **1.39.6** Notification delivery (APNs, FCM, WebPush) — token rotation, retry, silent pushes
- [x] **1.39.7** Email deliverability (SPF, DKIM, DMARC, bounce handling, list hygiene)
- [x] **1.39.8** Background job frameworks (Sidekiq, Celery, BullMQ, Hangfire, Temporal)
- [x] **1.39.9** Feature-flag platforms (LaunchDarkly, Unleash, GrowthBook, OpenFeature)
- [x] **1.39.10** Experimentation / A/B testing discipline
- [x] **1.39.11** Licensing compliance beyond SBOM (copyleft, dual-license, CLA enforcement)
- [x] **1.39.12** Export-control / sanctions screening
- [x] **1.39.13** Cookie-consent / tracking-pixel compliance
- [x] **1.39.14** Analytics event schema discipline
- [x] **1.39.15** Any other topic Claude recognises as legitimately load-bearing — the point of this pass is maximum coverage, stop only when nothing more comes to mind
  - Added 11 reviewers: `game-engines-unity-unreal-godot`, `graphics-shaders-webgl-webgpu`, `embedded-firmware-rtos`, `xr-arkit-arcore-webxr-openxr`, `jupyter-notebook-reproducibility`, `cli-tui-ux-design`, `browser-extensions-mv3`, `binary-serialization-protobuf-avro-flatbuffers-msgpack-thrift`, `os-packaging-homebrew-apt-snap-flatpak-winget-appimage`, `i18n-l10n-architecture`, `incident-response-postmortem-chaos-drill`
- [x] **1.39.C** Commit `feat(reviewers.src): gap-fill reviewers` *Folded into commit `9f1823e` along with the rest of Phase 1.Z + 2 + 3.*

#### 1.Z — Phase 1 closeout

- [x] **1.Z.1** Run `node scripts/build-index-src.mjs` (transitional) against `reviewers.src/` — all 596 files parse against v2 schema. Transitional index written to gitignored `reviewers.src/.index-src.yaml`. Fixed 4 source-file issues discovered in this pass: `reliability` dimension removed from `pattern-eip-messaging.md` and `pattern-saga.md` (not in the 7-axis taxonomy), YAML quote added to `@PreAuthorize` activation keyword in `sec-owasp-a01-broken-access-control.md`, and focus string quoted in `tool-mypy-pyright-pyre.md` to escape the `type: ignore` colon.
- [x] **1.Z.2** Run the new `validate-body-shape.mjs` — every reviewer conforms to the body-sectioning contract and tier-based length limit. 596 files, 0 errors, 0 warnings (all tier caps satisfied).
- [x] **1.Z.3** Run the new `validate-dimensions.mjs` — every reviewer declares ≥ 1 dimension from the 7-axis taxonomy. 596 files, 0 errors.
- [x] **1.Z.4** Self-review phase 1 content with skill-code-review itself — **deferred to Phase 3.** The current orchestrator dispatches against the legacy `reviewers/` tree, not `reviewers.src/`; a self-review now would not actually see the new corpus. Re-schedule after orchestrator rewiring (Phase 3). *Done as part of Phase 3.8 self-review (manual 8-gate walkthrough against the orchestrator-rewire commit `9f1823e`).*
- [~] **1.Z.5** Fix any Critical / Important findings and re-run — N/A for 1.Z.1-3 (zero findings); deferred with 1.Z.4. *N/A — zero findings from 1.Z.1-3; Phase 3 self-review also clean.*
- [~] **1.Z.6** Tag `phase-1-complete` — pending 1.Z.4/5 or explicit decision to tag after Phase 2. *Superseded — single tag `phase-3-complete` covers Phases 1.Z + 2 + 3 since they shipped together in commit `9f1823e`.*

**Closeout artifacts (created by 1.Z):**

- `scripts/lib/reviewer-schema.mjs` — single source of truth for v2 schema (required fields, tier limits, dimensions taxonomy, required body sections).
- `scripts/lib/parse-reviewer-src.mjs` — shared parser (frontmatter + H2 section boundaries + H3/audit-item counts). Throws `ParseError`.
- `scripts/build-index-src.mjs` — 1.Z.1 parse gate; exports `buildIndex`, `validateFrontmatter`, `serializeIndex` for tests.
- `scripts/validate-body-shape.mjs` — 1.Z.2 structural + tier-cap gate (soft-warn only on tier overruns per user policy).
- `scripts/validate-dimensions.mjs` — 1.Z.3 dimensions taxonomy gate.
- `tests/unit/_fixtures.mjs` + 4 test files (`parse-reviewer-src`, `build-index-src`, `validate-body-shape`, `validate-dimensions`) — 58 unit tests, all passing.
- `package.json` npm scripts: `index:build:src`, `validate:body-shape`, `validate:dimensions`, `validate:src` (runs all three), `test:src` (runs unit tests). Legacy `index:build` and `validate` scripts unchanged.
- `.gitignore` entry for the transitional `reviewers.src/.index-src.yaml`.

### Phase 2 — Wiki build (skill-llm-wiki, manual invocation from sibling repo)

skill-llm-wiki lives as a sibling project at `../skill-llm-wiki/` and is invoked manually from there during this phase only. Not wired into `package.json`.

- [x] **2.1** Verify skill-llm-wiki is installed and ready at `../skill-llm-wiki/`. Verify Node prerequisites.
- [x] **2.2** Invoke through the wiki-runner sub-agent (skill-llm-wiki's required agent-delegation contract):
  `build <abs>/skill-code-review/reviewers.src --layout-mode sibling --target <abs>/skill-code-review/reviewers.wiki`
  with Tier 1 local embeddings on, Tier 2 cluster naming on (maximum optimization quality per workspace memory). *Actual invocation used `--quality-mode deterministic --fanout-target 6 --max-depth 5 --soft-dag-parents` — pure-algorithmic HAC was preferred over Tier 2 sub-agent naming after PR #20.*
- [x] **2.3** Run `validate <wiki>`. Must report zero errors. *0 errors / 0 warnings.*
- [~] **2.4** If validation fails, run `fix <wiki>` and re-validate until clean. *N/A — validation passed first time after PR #20 + skill-llm-wiki PR #20 fixes.*
- [x] **2.5** Manually inspect: tree depth reasonable, cluster names sensible, no degenerate single-child chains, no 100+-file flat directories. *Tree depth 5, 59 top-level subcategories, no degenerates. Cluster slug names patchy — filed as upstream skill-llm-wiki item.*
- [~] **2.6** Verify every legacy id from the current 18 reviewers resolves via `aliases[]` somewhere in the new tree. *Superseded — legacy `reviewers/` was deleted with explicit user approval; no transition window required.*
- [x] **2.7** Commit `reviewers.wiki/` (including `.llmwiki/git/`) — `feat: initial wiki build from reviewers.src` *Folded into commit `9f1823e` along with Phase 1.Z and Phase 3.*
- [x] **2.8** Document the exact invocation in `CONTRIBUTING.md` so future re-runs are reproducible.
- [~] **2.9** Tag `phase-2-complete` *Superseded — single tag `phase-3-complete` covers Phases 1.Z + 2 + 3 since they shipped together.*

### Phase 3 — Orchestrator rewiring

- [x] **3.1** Update `code-reviewer.md` Step 0/1 routing: replace `reviewers/index.yaml` reads with `reviewers.wiki/index.md` semantic routing (mirror skill-llm-wiki's `guide/` routing procedure).
- [x] **3.2** Update `code-reviewer.md` Phase B reviewer selection to descend the wiki tree by `focus` instead of grepping a flat YAML.
- [x] **3.3** Update `code-reviewer.md` Phase C framework-detection table to point language/framework overlays at their new wiki paths. *Phase C table preserved; overlays now route as wiki leaves directly.*
- [x] **3.4** Update `code-reviewer.md` Step 5/6: re-map release-readiness gate aggregation to the new decomposed specialist ids (via aliases for the transition window). *Replaced explicit-id mapping with dimension predicate (durable as the corpus evolves).*
- [x] **3.5** Update `reviewers/release-readiness.md` (or its wiki-side replacement) gate definitions to reference the new decomposed security/testing ids. *Moved to root `release-readiness.md`; gates now bind via dimension/tag predicates.*
- [x] **3.6** Update `report-format.md` gate definitions only (output schema unchanged).
- [x] **3.7** Dry-run the orchestrator against a synthetic diff covering Python, Go, TypeScript, Swift, and Java. Verify per-language routing + decomposed-security routing + 8-gate synthesis. *Walkthrough completed; 35-40 of 59 top-level clusters retained, all 5 language leaves reachable, cross-cutting concerns reachable through multiple paths.*
- [x] **3.8** Self-review phase 3 changes with skill-code-review *Manual self-review completed against 8 gates; PASS or N/A across all.*
- [x] **3.9** Commit `refactor(code-reviewer): rewire orchestrator onto reviewers.wiki tree` *Commit `9f1823e` — landed Phase 1.Z + 2 + 3 together since the orchestrator rewire requires the wiki it routes against.*
- [x] **3.10** Tag `phase-3-complete`

### Phase 4 — Report format v2 + output channels

Implements every item from the "Output format & report enhancements" section. Bumps the schema to `schema_version: "2"` so consumers can opt in without breaking existing integrations.

#### 4.1 — Schema declaration & per-finding enrichments (`report-format.md`)

- [ ] **4.1.1** Add `schema_version: "2"` at root of JSON schema; document migration notes.
- [ ] **4.1.2** Add `finding_id` (stable sha1-based hash) — document algorithm (`sha1(specialist + file + line + title)[:10]`).
- [ ] **4.1.3** Add `confidence: high | medium | low`.
- [ ] **4.1.4** Add `rationale` (string, one sentence explaining severity choice).
- [ ] **4.1.5** Add `code_excerpt` (5-line markdown-fenced context window; nullable).
- [ ] **4.1.6** Add `suggested_patch` (unified-diff block for `git apply`; nullable).
- [ ] **4.1.7** Add `auto_fixable` (bool) and surface a 🛠 marker — text-only per project emoji rule.
- [ ] **4.1.8** Add `effort_estimate: S | M | L | XL`.
- [ ] **4.1.9** Add `related_findings: [finding_id]`.
- [ ] **4.1.10** Add `security_refs: { cwe, owasp, capec, cve }`; empty arrays when not security-related.
- [ ] **4.1.11** Add `compliance_tags` closed vocabulary: `pci-dss | hipaa | gdpr | ccpa | soc2 | iso27001 | fedramp | nis2 | dora`.
- [ ] **4.1.12** Add free-form `tags: string[]`.
- [ ] **4.1.13** Add `first_seen_sha` (best-effort blame; nullable).
- [ ] **4.1.14** Add `regression` (bool) — requires the reviewer skip cache from Phase 5.
- [ ] **4.1.15** Add `false_positive_hint` (suggested suppression comment) + honour on next run.
- [ ] **4.1.16** Add `kind: blocker | required | suggestion | question | nit | praise` (research-consensus vocabulary; additive to `severity`).

#### 4.2 — Top-level report additions

- [ ] **4.2.1** `tldr` (executive paragraph).
- [ ] **4.2.2** `project_profile` (languages + versions, frameworks, runtime, package managers, build tools, test frameworks, linters, CI, cloud targets, databases, caches, messaging, IaC, container runtime, per-file risk tier).
- [ ] **4.2.3** `metric_deltas` (diff stats, cyclomatic-complexity delta, test-count delta, coverage delta; nullable keys).
- [ ] **4.2.4** `test_gap_report: [{file, lines, reason}]`.
- [ ] **4.2.5** `doc_gap_report: [{symbol, file, line}]`.
- [ ] **4.2.6** `migration_radar: [{kind, file, routed_to}]`.
- [ ] **4.2.7** `reviewer_execution: [{id, model_used, tokens_in, tokens_out, wall_time_ms, tool_results_count, escalations_received, escalations_emitted}]`.
- [ ] **4.2.8** `rerun_recipe` (exact reproducible CLI string).
- [ ] **4.2.9** `coverage_with_reasons` (extends `coverage` with `dispatched_because` + `findings_count`).
- [ ] **4.2.10** `top_blockers` (array of 3 highest-priority blockers by severity × confidence).

#### 4.3 — Verdict vocabulary

- [ ] **4.3.1** Keep `GO`, `NO-GO`, `CONDITIONAL`.
- [ ] **4.3.2** Add `MERGE_WITH_FOLLOWUP` (cleared with explicit follow-up TODO list emitted).
- [ ] **4.3.3** Add `HOLD_FOR_INFO` (needs user input — compliance-tag confirmation, risk-tier override).
- [ ] **4.3.4** Wire Google-style verdict function: `GO` iff no `critical` blockers AND code-health delta non-negative.

#### 4.4 — Argument additions (`report-format.md` Arguments table)

- [ ] **4.4.0** `depth=basic|mid|maximum|auto` (see "Review depth levels" in "Structural & efficiency improvements"). Default `auto`: short-circuit from session context → stored repo preference → first-use interactive elicitation (fixed prompt text) → non-interactive default `mid`. Explicit value always wins. Document that `depth=maximum` implies `budget-reviewers=∞`, `budget-tokens=∞`, `streaming=on`, max-context-window model, max effort, and multi-level nested sub-agent fan-out (main → domain-lead → specialist → per-file leaf). Document that `depth=basic` implies a tight reviewer/token budget, inline servicing when scope permits, and a single fan-out layer otherwise. Document that `mode=thorough` is a legacy alias translated to `depth=maximum` during argument parsing.
- [ ] **4.4.1** `confidence-min=high|medium|low`.
- [ ] **4.4.2** `compliance=<tag,...>` (filters reviewers by compliance_tags).
- [ ] **4.4.3** `security-refs=<cwe|owasp|capec|cve,...>`.
- [ ] **4.4.4** `since=<sha>` (alias for `base=<sha>`).
- [ ] **4.4.5** `cache=on|off|refresh` (controls per-(file, sha, reviewer) skip cache).
- [ ] **4.4.6** `streaming=on|off` (progressive finding emission).
- [ ] **4.4.7** `budget-tokens=<int>` (soft cap; drops lowest-priority reviewers to fit).
- [ ] **4.4.8** `budget-reviewers=<int>` (hard cap; default 30; uncapped by `mode=thorough`).
- [ ] **4.4.9** `output-file=<path>` (write report to disk in addition to stdout).
- [ ] **4.4.10** `dry-run` (print dispatch plan + routing decisions without invoking reviewers).
- [ ] **4.4.11** `pr-size-warn=<int>` (default 400) and `pr-size-block=<int>` (default 1000).

#### 4.5 — Output channels (new formatters)

- [ ] **4.5.1** `format=sarif` — SARIF 2.1.0 export; map `finding_id → ruleId`, severity → level, `code_excerpt → region`, `suggested_patch → fixes[]`. Reference file: `scripts/formatters/sarif.mjs` (new).
- [ ] **4.5.2** `format=github-pr` — GitHub Checks / PR Annotations format (for `gh pr` / Actions consumption).
- [ ] **4.5.3** `format=gitlab-cq` — GitLab Code Quality JSON for the MR widget.
- [ ] **4.5.4** `format=junit` — JUnit-style XML for CI test panels.
- [ ] **4.5.5** `format=html` — self-contained single-file HTML report with inline CSS.
- [ ] **4.5.6** `format=yaml` — already documented; verify round-trip.
- [ ] **4.5.7** Document each formatter's field mapping in `report-format.md`.

#### 4.6 — Markdown report additions (structure + visuals + PR-ready layout)

The markdown report must be directly **copy-pasteable into a GitHub PR comment** as a complete review document — full headers and subheaders, no redundancy, no skipped useful details. Everything a human reviewer would want is there; nothing that belongs only in debug output is.

##### 4.6.A — Report skeleton

- [ ] **4.6.A.1** `# Code Review Report` (H1).
- [ ] **4.6.A.2** `## TL;DR` — one paragraph, always above the verdict.
- [ ] **4.6.A.3** `## Verdict` — big-badge icon + decision word + one-line reason.
- [ ] **4.6.A.4** `## Top Blockers` — 3 highest-priority by severity × confidence (hidden when none).
- [ ] **4.6.A.5** `## Project Profile` — collapsible `<details>` block listing detected stack, runtime versions, risk tiers.
- [ ] **4.6.A.6** `## Quality Dashboard` — icon-decorated summary rows for each of the 7 review dimensions (Correctness, Security, Performance, Tests, Readability, Architecture, Documentation) with pass/fail icon and numeric counts.
- [ ] **4.6.A.7** `## Release Gates` — existing 8-gate table with coloured status icons.
- [ ] **4.6.A.8** `## SOLID Compliance` — existing, with icons.
- [ ] **4.6.A.9** `## Issues` — grouped by severity (`### Critical`, `### Important`, `### Minor`) with icon-decorated rows; render `kind`, `confidence`, `effort`, refs, auto-fixable marker.
- [ ] **4.6.A.10** `## Strengths` — positive findings with a praise icon.
- [ ] **4.6.A.11** `## Tool Results` — table with per-tool pass/fail/skip icons.
- [ ] **4.6.A.12** `## Specialist Results` — full reviewer summary table.
- [ ] **4.6.A.13** `## Test Gaps` and `## Doc Gaps` — rendered as tables; hidden when empty.
- [ ] **4.6.A.14** `## Migration Radar` — rendered as table; hidden when empty.
- [ ] **4.6.A.15** `## Coverage` — per-file reviewer list with `dispatched_because` reason column.
- [ ] **4.6.A.16** `## Rerun` — one-liner reproducible CLI command.
- [ ] **4.6.A.17** Horizontal rule `---`.
- [ ] **4.6.A.18** Credit footer (see 4.6.C).

##### 4.6.B — Visual indicators (icons, progress bars, badges)

**Icons must be explicit and meaningful.** The no-emoji rule is lifted for report output because the user requested visual clarity; every other skill output still follows the default no-emoji rule.

- [ ] **4.6.B.1** Verdict badges:
  - `GO` → ✅ **GO**
  - `NO-GO` → ❌ **NO-GO**
  - `CONDITIONAL` → ⚠️ **CONDITIONAL**
  - `MERGE_WITH_FOLLOWUP` → 🟡 **MERGE WITH FOLLOWUP**
  - `HOLD_FOR_INFO` → ⏸️ **HOLD FOR INFO**
- [ ] **4.6.B.2** Gate / specialist status icons:
  - `PASS` → ✅
  - `FAIL` → ❌
  - `N/A` → ➖
  - `SKIP` → ⏭️
- [ ] **4.6.B.3** Severity icons in issue rows:
  - `critical` → 🔴
  - `important` → 🟠
  - `minor` → 🟡
  - `praise` / strength → 🟢
- [ ] **4.6.B.4** Kind tags:
  - `blocker` → 🚫
  - `required` → ⚠️
  - `suggestion` → 💡
  - `question` → ❓
  - `nit` → ✨
  - `praise` → 🏅
- [ ] **4.6.B.5** Confidence indicators: `high` → ◆◆◆ · `medium` → ◆◆◇ · `low` → ◆◇◇.
- [ ] **4.6.B.6** Effort badges: `S` → 🕐 S · `M` → 🕑 M · `L` → 🕓 L · `XL` → 🕔 XL.
- [ ] **4.6.B.7** Auto-fixable marker: 🛠 (only when `auto_fixable: true`).
- [ ] **4.6.B.8** Regression marker: ⏮ (when `regression: true`).
- [ ] **4.6.B.9** ASCII progress bars for any percentage metric — coverage delta, test-pass rate, hotspot score. Format: `[██████████░░░░░░░░░░] 50%` (20-char bar). Implemented as a pure-JS helper `scripts/formatters/progress-bar.mjs`.
- [ ] **4.6.B.10** Quality Dashboard row format: `| Correctness | ✅ PASS | 0 critical / 0 important / 2 minor | [████████████████░░░░] 80% |` (dimension, icon + status, counts, progress bar where applicable).
- [ ] **4.6.B.11** Coverage progress bar: when coverage delta is known, render `[██████████████░░░░░░] 70% (+2%)`.
- [ ] **4.6.B.12** Hotspot intensity bar in the Coverage section per file: `[████████░░░░░░░░░░░░] cold → hot` with the computed score.
- [ ] **4.6.B.13** Every icon has a plain-text fallback label next to it so the report degrades gracefully in environments that don't render unicode (e.g. `✅ PASS`, never just `✅`).

##### 4.6.C — Credit footer (always present, always last, never collapsed)

- [ ] **4.6.C.1** After the final horizontal rule, emit exactly this block (version pulled from `package.json`):

  ```markdown
  ---

  _Made with ❤️ for software engineering by [Dmitri Meshin](https://github.com/meshin-dev)._
  _[`skill-code-review`](https://github.com/ctxr-dev/skill-code-review) · MIT License · v<package.json version>_
  ```

- [ ] **4.6.C.2** Author name is always a link to `https://github.com/meshin-dev`.
- [ ] **4.6.C.3** Repository URL is always `https://github.com/ctxr-dev/skill-code-review`; `validate-report-schema.mjs` fails if `package.json → repository.url` diverges.
- [ ] **4.6.C.4** License string is read from `package.json → license`.
- [ ] **4.6.C.5** Version string is read from `package.json → version`.
- [ ] **4.6.C.6** The footer is **never** wrapped in a `<details>` block.
- [ ] **4.6.C.7** The footer is **never** placed in the appendix when the report is split — it appears at the end of the primary document (and is additionally duplicated at the very end of the appendix, if one exists).
- [ ] **4.6.C.8** The footer is **never** omitted, truncated, or replaced even when the report hits token / character budgets. If the budget forces truncation, the orchestrator drops from the low-priority collapsed sections first; the footer is the last byte written.

##### 4.6.F — Progressive disclosure (`<details>` collapsibles)

Less-important information lives near the end of the document and is collapsed by default so scanners see only essentials. Critical information is never collapsed.

- [ ] **4.6.F.1** Always-open sections (top of document, never collapsed): `TL;DR`, `Verdict`, `Top Blockers`, `Quality Dashboard`, `Release Gates`, `SOLID Compliance`, `Critical Issues`, `Important Issues`.
- [ ] **4.6.F.2** Collapsed-by-default sections (bottom of document, rendered as `<details><summary>…</summary>`): `Minor Issues`, `Strengths`, `Tool Results`, `Specialist Results`, `Project Profile`, `Test Gaps`, `Doc Gaps`, `Migration Radar`, `Coverage`, `Reviewer Execution Metadata`, `Rerun Recipe`.
- [ ] **4.6.F.3** `suggested_patch` and `code_excerpt` per finding always collapse inside `<details><summary>Patch</summary>` / `Context`.
- [ ] **4.6.F.4** `<details>` `summary` lines include a short count or status so the reader knows whether it's worth expanding (e.g. `Minor Issues (3)`, `Tool Results (4 pass, 1 skip)`).
- [ ] **4.6.F.5** The credit footer (4.6.C) is **never** inside any `<details>` block.
- [ ] **4.6.F.6** When report is split to fit 65k char limit: always-open content + footer stays in main comment; collapsed sections may move to an appendix comment; appendix also ends with the footer duplicated.

##### 4.6.D — Per-finding rendering

- [ ] **4.6.D.1** Each issue row shows severity icon + kind icon + confidence indicator + effort badge + auto-fixable marker + regression marker + file link + title + one-line impact + fix excerpt.
- [ ] **4.6.D.2** When `suggested_patch` is non-null, render it as a collapsible `<details><summary>Patch</summary>` block containing a unified-diff fenced code block.
- [ ] **4.6.D.3** When `code_excerpt` is non-null, render it as a collapsible `<details><summary>Context</summary>` fenced code block with syntax highlighting inferred from file extension.
- [ ] **4.6.D.4** `security_refs` rendered inline as linked badges: `[CWE-89](https://cwe.mitre.org/data/definitions/89.html) · [OWASP A03](https://owasp.org/Top10/A03_2021-Injection/)`.
- [ ] **4.6.D.5** `compliance_tags` rendered as uppercase inline pills: `PCI-DSS` `HIPAA` `GDPR`.
- [ ] **4.6.D.6** `related_findings` rendered as hash links `#3`, `#7` that jump to other rows in the same document.
- [ ] **4.6.D.7** No row should require horizontal scrolling in a standard GitHub PR comment width — use wrapping or the `<details>` collapse pattern for long content.

##### 4.6.E — PR-ready copy-paste verification

- [ ] **4.6.E.1** Render a sample report through a GitHub-flavored-markdown previewer and confirm all tables, details blocks, icons, and progress bars render correctly.
- [ ] **4.6.E.2** Confirm there is no redundancy (same information in two sections) and no missing useful information (every schema v2 field has a rendering home).
- [ ] **4.6.E.3** Confirm the full document comfortably fits the GitHub PR comment character limit (65,536); if it doesn't, the orchestrator automatically splits into a main comment + appendix.

#### 4.7 — Interactive save-to-file prompt (non-CLI / interactive mode)

When the orchestrator detects it was invoked **interactively** (not via stdin-piped CLI, not dispatched as a subagent), after the report renders it must ask the user whether to persist it to disk.

- [ ] **4.7.1** Interactive-mode detection: reuse existing `format=auto` logic — interactive means user-facing slash command or chat invocation, not subagent dispatch and not `format=json`.
- [ ] **4.7.2** Add `save=auto|always|never|ask` argument. Default: `ask` in interactive mode, `never` in subagent/CLI mode.
- [ ] **4.7.3** Prompt (via `AskUserQuestion`):
  - **Save this review to disk?**
  - Option 1: `Save to default path` — `<project>/.claude/code-reviews/<yyyy>/<mm>/<dd>/code-review-<slug>.v<int>.md`
  - Option 2: `Save to custom path` — orchestrator then asks for the path
  - Option 3: `Don't save`
- [ ] **4.7.4** Default-path slug derivation priority:
  1. Explicit `title=<string>` argument.
  2. GitHub PR / issue number detected from `base`/`head` branch names (e.g. `pr-123`).
  3. Head branch name (`git rev-parse --abbrev-ref HEAD`) slugified.
  4. Short head SHA (`git rev-parse --short HEAD`).
- [ ] **4.7.5** Version suffix `.v<int>`: increment automatically if a file with the same base name already exists. Never overwrite.
- [ ] **4.7.6** On save, ensure the target directory exists (`mkdir -p` semantics) and write the **exact same markdown** that was rendered to the user (same icons, same footer, same structure). The saved file is always self-contained.
- [ ] **4.7.7** After writing, echo the absolute path in the interactive session so the user can copy it.
- [ ] **4.7.8** Add `output-file=<path>` argument (already listed in 4.4.9) — when provided in non-interactive mode, it bypasses the prompt and writes directly.
- [ ] **4.7.9** Gitignore guidance: emit a one-time note suggesting the user add `.claude/code-reviews/` to `.gitignore` or `.git/info/exclude` if desired. Do not auto-modify gitignore.
- [ ] **4.7.10** JSON / SARIF / other structured formats get the same save treatment — extension matches the format argument.
- [ ] **4.7.11** Document the prompt + default path layout in `report-format.md` and `README.md`.

#### 4.8 — Deterministic `help` pipeline

Implements the "Deterministic `help` output" section from earlier in this document. Goal: `help` becomes a byte-identical, LLM-free fast path.

- [ ] **4.8.1** Write `scripts/build-help.mjs` — deterministic generator. Reads `package.json` (name, version, repo URL, license), `report-format.md` (arguments table, verdict vocabulary, output channels), and the "Review depth levels" section once it lands in `report-format.md` as part of phase 4. Emits `HELP.md`, `HELP.json`, `HELP.yaml`, `HELP.sha256` at the skill root. Sorted keys in JSON/YAML, alphabetical rows in the arguments table, LF line endings, trailing newline, no timestamps, no random values, no environment leak beyond the explicit `package.json` substitution.
- [ ] **4.8.2** Design the `HELP.md` content shape to match the "What the help contains" bulleted structure: header (H1 + tagline + repo URL) → Usage one-liner → Arguments table → Review depth levels table → Output formats table → Verdict vocabulary table → 4 numbered examples → See also bullet list. No unbounded lists, no reviewer enumeration, no marketing copy, no emojis, no ASCII banners.
- [ ] **4.8.3** `HELP.json` schema: top-level object with `name`, `version`, `tagline`, `repository`, `usage`, `arguments[]`, `depth_levels[]`, `output_formats[]`, `verdicts[]`, `examples[]`, `see_also[]`. Arrays sorted for byte-identical output. `scripts/validate-help.mjs` validates against this schema.
- [ ] **4.8.4** `HELP.yaml` is the same object tree rendered as YAML. Deterministic key order, 2-space indent, no flow-style collections.
- [ ] **4.8.5** `HELP.sha256` — three lines, one per artifact: `<sha256>  HELP.md`, `<sha256>  HELP.json`, `<sha256>  HELP.yaml`. Sorted alphabetically by filename so the file is byte-stable.
- [ ] **4.8.6** Rewrite `code-reviewer.md` argument-parsing prelude so the `help` branch runs **before** everything else: before routing, before reviewer loading, before project scan, before tool discovery, before depth resolution. The branch parses only `help` and `format=`, then reads the matching `HELP.<ext>` artifact and writes it verbatim to stdout. No LLM interpretation, no markdown rendering by the orchestrator itself, no re-reading `report-format.md` as it does today. The existing line 17 behaviour (`Read report-format.md → print the Arguments table → stop`) is deleted and replaced.
- [ ] **4.8.7** `help format=<unknown>` → print `HELP.md` to stdout and `warning: format '<name>' not supported for help; falling back to markdown` to stderr. Exit 0 (help is always a success path).
- [ ] **4.8.8** Write `scripts/validate-help.mjs` — reads `HELP.sha256`, recomputes `HELP.md` / `HELP.json` / `HELP.yaml` hashes, fails with a clear error on any mismatch. Wired into `npm run validate`.
- [ ] **4.8.9** Write `scripts/test-help-determinism.mjs` — invokes the skill's help branch twice back-to-back with identical args, captures stdout, compares byte streams, fails on diff. Runs in CI. Also runs `help format=json` twice and `help format=yaml` twice so all three artifacts are covered.
- [ ] **4.8.10** Add `npm run build:help` script in `package.json` that runs `scripts/build-help.mjs`. Add `npm run validate:help` alias for `scripts/validate-help.mjs` (also invoked by the main `npm run validate` chain).
- [ ] **4.8.11** Add a pre-commit hook step that runs `build:help` in dry-run mode (emit to a temp directory, diff against the committed artifacts, fail on difference). Developers who changed `report-format.md` or `package.json` must re-run `npm run build:help && git add HELP.*` before committing.
- [ ] **4.8.12** Initial artifact generation: run `npm run build:help`, inspect `HELP.md` manually to confirm the shape matches the spec (compact, all tables present, 4 examples, see-also footer), commit `HELP.md`, `HELP.json`, `HELP.yaml`, `HELP.sha256`.
- [ ] **4.8.13** Add `HELP.md` / `HELP.json` / `HELP.yaml` / `HELP.sha256` to the skill's installed-artifact manifest (whatever `@ctxr/kit` or `files[]` in `package.json` uses) so they ship with the installed skill. Without this the skill's `help` branch would read files that don't exist post-install.
- [ ] **4.8.14** Document the build pipeline + determinism contract in `CONTRIBUTING.md`: "how to update help" = "edit `report-format.md` → `npm run build:help` → commit regenerated `HELP.*`".
- [ ] **4.8.15** Self-review phase 4.8 changes with skill-code-review.
- [ ] **4.8.16** Commit `feat(help): deterministic help artifact pipeline (md/json/yaml) with SHA256 fingerprint`.

#### 4.9 — Closeout

- [ ] **4.9.1** Write `scripts/validate-report-schema.mjs` — validates emitted JSON against schema v2.
- [ ] **4.9.2** Golden-file tests for each formatter (sarif/github-pr/gitlab-cq/junit/html/yaml/markdown/json) under `tests/report-format/`.
- [ ] **4.9.3** Render sample report in a GFM previewer; visually confirm icons, progress bars, collapsibles.
- [ ] **4.9.4** Test interactive save prompt (default-path / custom-path / don't-save branches) and verify `.v<int>` auto-increment.
- [ ] **4.9.5** Verify the credit footer renders with correct author/URL/license/version pulled from `package.json`.
- [ ] **4.9.6** Verify `help` branch fast-path: no reviewer loading, no `report-format.md` re-read, byte-identical output across two consecutive invocations, byte-identical across `format=markdown|json|yaml`.
- [ ] **4.9.7** Self-review phase 4 changes with skill-code-review.
- [ ] **4.9.8** Commit `feat(report-format): schema v2 + visual indicators + save prompt + credit footer + deterministic help`.
- [ ] **4.9.9** Tag `phase-4-complete`.

### Phase 5 — Structural & efficiency implementation

Implements every item from the "Structural & efficiency improvements" section. Where Phase 4 is about *what* the report says, Phase 5 is about *how* the orchestrator produces it under a token budget.

#### 5.0 — Review depth levels (`depth=basic|mid|maximum|auto`)

> **Section-level supersession (2026-04-26):** the entire 5.0 sub-section is superseded by Sprint 1 risk-tier triage (Step 0.6 in `code-reviewer.md`). The original design assumed a user-facing `depth=` argument with elicitation, session memory, and stored preferences. The investigation showed deterministic per-diff tiering is sniper-precise without any user knob — diffs *are* trivial/lite/full/sensitive based on what they touch, not based on what mood the user is in. Specific items 5.0.1–5.0.18 are individually marked with `[~]` and the same supersession reason; the items below are preserved as historical record of the alternate design that was considered.

- [~] **5.0.1** Add `depth` resolution as the first orchestrator step in `code-reviewer.md`, executed before argument parsing hits any reviewer-facing logic. Resolution precedence: explicit `depth=` argument → session-context signal (current user turn contains "basic / quick / sanity" OR "mid / normal / thorough" OR "maximum / deep / full / go deep" style language → map to the corresponding level) → prior depth selected earlier in the same session (turn memory) → stored per-repo preference in `.skill-code-review/preferences.yaml` → first-use interactive elicitation → non-interactive default `mid`. *Superseded by Sprint 1 risk-tier triage (Step 0.6). Tier is computed deterministically from diff signals — no user-facing depth knob, no elicitation. The Sprint 1 tier maps to the original "depth" intent: trivial≈basic / lite≈mid / full+sensitive≈maximum, but driven by what the diff IS rather than what the user picked.*
- [~] **5.0.2** Implement interactive-mode detection that distinguishes: (a) slash command / direct chat turn → interactive, (b) spawned as an `Agent` sub-task → non-interactive, (c) piped CLI with no TTY → non-interactive, (d) CI environment variables present (`CI=1`, `GITHUB_ACTIONS`, `GITLAB_CI`, etc.) → non-interactive. Only interactive mode may ask the elicitation question.
- [~] **5.0.3** Author the elicitation prompt as the fixed text in the "Review depth levels" section of this plan. The prompt must be recognisable across sessions, list exactly three levels, name their use cases, and explicitly state the answer is remembered for the session.
- [~] **5.0.4** Cache the answer in turn memory for the rest of the session. If the user's reply explicitly asks for persistence (e.g. "remember this for the repo", "always use mid here"), also write to `.skill-code-review/preferences.yaml` (gitignored by default; document an opt-in flag to track it).
- [~] **5.0.5** Translate legacy `mode=thorough` → `depth=maximum` during argument parsing. Emit a one-line deprecation notice in the dispatch-plan printer so users see the new canonical name; do not break existing automation.
- [~] **5.0.6** Implement the `depth=basic` dispatch path:
  - Activation filter restricted to `tier: 1` reviewers + the author-hygiene gate + Tier-2 reviewers whose activation signal is unambiguous (explicit file glob match, not heuristic signals).
  - Inline-servicing check: if `activated.length ≤ 5` AND `diff_loc ≤ 100` AND main session's remaining budget is sufficient, run every reviewer inline in the current session (no `Agent` spawn at all). Otherwise fall through to a single-layer fan-out.
  - Defaults: cheapest competent model, minimal effort, `budget-reviewers=8`, tight `budget-tokens` cap, `streaming=off`, `cache=on`.
- [~] **5.0.7** Implement the `depth=mid` dispatch path:
  - Activation filter: full Tier-1 + Tier-2 set, Tier-3 only on escalation signal.
  - Single-layer fan-out: main session spawns one `Agent` per reviewer (or per homogeneous group where reviewers share both inputs and model profile). No nested spawns.
  - Defaults: moderate model (harness default mid-tier), moderate effort, `budget-reviewers=30`, default token budget per sub-agent, `streaming=on`, `cache=on`.
  - Explicit `model=` / `effort=` / `budget-*=` arguments override and propagate to every sub-agent.
- [~] **5.0.8** Implement the `depth=maximum` dispatch path — multi-level nested fan-out:
  - **Layer A (main session)** — spawns one `domain-lead` sub-agent per review dimension (Correctness / Security / Performance / Tests / Readability / Architecture / Documentation) whose activated reviewers cover at least one specialist. Up to 7 parallel leads.
  - **Layer B (domain-lead)** — each lead is briefed with its dimension's activated reviewers + the project profile + the filtered diff. The lead spawns one `specialist` sub-agent per reviewer, in parallel within the dimension.
  - **Layer C (specialist)** — each specialist may spawn per-file or per-finding `leaf` sub-agents when the file set is large or a single concern warrants its own isolated context window. Specialists that don't need per-file fan-out skip this layer.
  - **Bottom-up aggregation** — leaves → specialist (dedup, cross-validate, confidence-calibrate) → domain-lead (dedup across reviewers in the dimension, dimension-level verdict) → main session (7 dimension reports assembled into the single unified report). Every aggregation layer runs the full dedup / cross-validation / confidence-calibration pass on its inputs before passing up.
  - Defaults: **max effort, max context-window model variant, most efficient strong-reasoning model available**, `budget-reviewers=∞`, `budget-tokens=∞`, `streaming=on`, `cache=on` (but `cache=refresh` honoured). Explicit args still override and propagate to every layer.
- [~] **5.0.9** Author the "dispatcher OR inline-worker" prompt shape for each layer (main, domain-lead, specialist) so the same prompt produces correct output whether it spawns children OR answers inline. This is the hard-constraint degradation path for harnesses that reject nested `Agent` spawns.
- [~] **5.0.10** Implement nested-spawn degradation: when a Layer-B or Layer-C `Agent` spawn is rejected by the harness (general-purpose sub-agents cannot spawn further agents in some configurations), catch the rejection and fall through to inline servicing within the current sub-agent's context window. Serialised inside the layer, but still isolated from the parent layer's context. Surface the degradation in `reviewer_execution.nesting_limit_hit: "<layer>"` on the final report so users can see the review did not achieve full parallelization and re-run under a harness that supports it if cost matters.
- [~] **5.0.11** Implement the depth-level defaults matrix for downstream controls: `depth=basic` → `budget-reviewers=8` / tight tokens / `streaming=off`; `depth=mid` → `budget-reviewers=30` / default tokens / `streaming=on`; `depth=maximum` → uncapped / uncapped / `streaming=on` forced. Any explicit user value for the downstream control wins over the depth default.
- [~] **5.0.12** Extend `reviewer_execution` metadata in the report schema to carry: `depth_selected: basic|mid|maximum`, `depth_source: argument|session-context|stored-preference|elicited|default`, `layers_used: [A|B|C]`, `nesting_limit_hit: <layer-id-or-null>`, per-layer sub-agent counts, per-layer wall-clock, per-layer token totals.
- [~] **5.0.13** Dispatch-plan printer (`dry-run`) must explicitly show: resolved depth, resolution source, the full dispatch tree (main → leads → specialists → leaves), which layers would run inline vs fan-out, predicted reviewer count per layer, predicted token cost per layer, the defaults matrix values in effect, and any argument overrides applied.
- [~] **5.0.14** Validator: a reviewer without a `dimensions:` frontmatter array cannot participate in `depth=maximum` Layer-A routing (because there is no domain-lead to own it). Either require `dimensions:` on every Tier-1/Tier-2 reviewer or have Layer-A declare a fallback "cross-dimensional" lead that owns unclaimed reviewers.
- [~] **5.0.15** Test: run a trivial 10-line docs-only diff under each of the three depth levels and measure reviewer count, sub-agent count, wall-clock, and token cost. Expected: `basic` runs inline with ~3 reviewers, `mid` fans out to ~8 reviewers in one layer, `maximum` fans out to 7 domain-leads each with their specialists (may degrade to inline servicing depending on harness — the test must tolerate that). Record the measurements in `.skill-code-review/depth-benchmarks.yaml` for future reference.
- [~] **5.0.16** Test: elicitation prompt fires exactly once per interactive session when no signal exists, and not at all when any of the short-circuit branches apply (explicit arg, session context, stored preference, non-interactive mode).
- [~] **5.0.17** Test: legacy `mode=thorough` still works end-to-end and produces byte-identical output to `depth=maximum` (minus the deprecation notice line).
- [~] **5.0.18** Commit `feat(orchestrator): review depth levels (basic/mid/maximum) with session-aware elicitation and multi-level nested dispatch`.

#### 5.1 — Tiered dispatch ladder (`code-reviewer.md`)

- [~] **5.1.1** Introduce `tier: 1 | 2 | 3` in reviewer frontmatter schema; update validator to require it. *Superseded — tier is computed per-diff (risk-tier triage), not authored per-reviewer. The leaf-side `type: primary | overlay | universal` field plays the equivalent role.*
- [x] **5.1.2** Step 0: Tier-0 project-profile fingerprint pass (no AI reviewers). *Project Profile already implemented in Step 0 since Phase 3.*
- [~] **5.1.3** Step 1: Tier-1 always-on reviewers (author-hygiene, clean-code-solid, language-idiom, security-base, test-quality-base, error-resilience). Body caps ≤ 200 lines. *Superseded — there are no "always-on" universals under the 476-leaf corpus; cross-cutting categories descend whenever the diff plausibly triggers them. See Sprint 1 Tier 1 risk-tier + Tier 2 Stage A descent in `code-reviewer.md`.*
- [~] **5.1.4** Step 2: Tier-2 signal-driven reviewers — dispatched by `(tier_filter ∩ activation_filter ∩ budget_filter)`. *Superseded by Sprint 1 — Stage A descent + activation gate + Stage B LLM trim with budget cap.*
- [~] **5.1.5** Step 3: Tier-3 escalation-only reviewers via `escalation_from` frontmatter; never auto-routed. *Superseded — escalation_from is a leaf-level activation signal; the orchestrator triggers it when an upstream leaf activates, not as a separate Step 3.*
- [x] **5.1.6** Dispatch-plan printer for `dry-run`. *Manifest at `.skill-code-review/<shard>/<run-id>/manifest.json` IS the dispatch plan (with Stage A candidates + Stage B picks/rejections + per-leaf execution log).*

#### 5.2 — Reviewer body sectioning contract

- [x] **5.2.1** Fixed H2 shape: `When This Activates` / `Audit Surface` / `Detailed Checks` / `Common False Positives` / `Severity Guidance` / `See Also` / `Authoritative References`. *Documented in `docs/SCHEMA.md`; enforced by `scripts/validate-body-shape.mjs` over all 596 source files.*
- [x] **5.2.2** `Detailed Checks` H3 subsections each carry their own HTML-comment `activation` frontmatter. *Pattern in use across the corpus (e.g. `<!-- activation: keywords=[...] -->` per H3 in `sec-owasp-a01-broken-access-control.md`).*
- [ ] **5.2.3** Orchestrator loads only H3 subsections whose activation signals match the current diff. *Deferred — current orchestrator loads full leaf body. Sprint 4 candidate.*
- [x] **5.2.4** Write `scripts/validate-body-shape.mjs` enforcing the contract + per-tier length caps (T1 200, T2 500, T3 800; audit_surface 12/20/25; H3 4/8/12). *Soft-warns on tier overruns per user policy; ships.*
- [x] **5.2.5** Wire `validate-body-shape.mjs` into the `validate` chain. *Part of `npm run validate:src`.*

#### 5.3 — Project-profile fingerprint cache

- [ ] **5.3.1** Write `.skill-code-review/profile.yaml` (gitignored) with stack, framework versions, runtime versions, package-manager file SHAs, IaC file SHAs, cloud-target signals, database engines, per-file risk tier.
- [ ] **5.3.2** Fingerprint hash = `sha1(sorted-keys-and-values)`; skip Step 0 on cache hit.
- [ ] **5.3.3** Invalidate on any package.json / pyproject.toml / Cargo.toml / go.sum / Gemfile.lock / composer.lock / *.tf / k8s yaml change.
- [ ] **5.3.4** Expose `profile.yaml` in `project_profile` report field.

#### 5.4 — Per-(file, sha, reviewer) skip cache

- [ ] **5.4.1** Cache dir `.skill-code-review/cache/<reviewer-id>/<file-content-sha>.json`.
- [ ] **5.4.2** Reuse cached findings for unchanged (reviewer, content-hash) pairs.
- [ ] **5.4.3** Honour `cache=on|off|refresh`.
- [ ] **5.4.4** Power `regression: true` detection (finding absent in prior cached run).
- [ ] **5.4.5** Cache GC policy (size cap, LRU eviction).

#### 5.5 — Deterministic Tier-0 walkers

- [ ] **5.5.1** `scripts/walk-test-gaps.mjs` — matches changed source files against `tests/`, `__tests__/`, `*_test.*`, `*.test.*`, `*.spec.*` conventions; emits `test_gap_report`.
- [ ] **5.5.2** `scripts/walk-doc-gaps.mjs` — detects changed *exported* symbols without matching docstring/README/ADR edits; emits `doc_gap_report`.
- [ ] **5.5.3** `scripts/walk-migration-radar.mjs` — detects SQL migrations (alembic/flyway/atlas/knex/prisma/drizzle/gorm/ent/goose/liquibase), terraform plans, helm bumps, CI workflow edits, dependency upgrades, k8s manifest changes; emits `migration_radar` and forces specialist routing.
- [ ] **5.5.4** Feed all three walker outputs into relevant reviewers as "prior findings" so AI tokens aren't burned re-doing mechanical work.

#### 5.6 — Result deduplication

- [ ] **5.6.1** Aggregator merges same-root findings across reviewers on tuple `(file, line, normalised_title)` + fuzzy description match.
- [ ] **5.6.2** Merged finding carries `attribution: [reviewer-id,...]`, max severity, averaged confidence, unioned related_findings.
- [ ] **5.6.3** Test case: two reviewers report the same SQL injection → one merged finding.

#### 5.7 — Streaming dispatch

- [ ] **5.7.1** Progressive markdown/HTML rendering as findings arrive.
- [ ] **5.7.2** JSON stream mode emits newline-delimited finding objects followed by the terminal summary object.
- [ ] **5.7.3** Gated by `streaming=on`.

#### 5.8 — Tool priors

- [ ] **5.8.1** Tier-0 runs all activated external tools (semgrep, eslint, tsc, ruff, golangci-lint, clippy, phpstan, rubocop, mypy, etc.) before AI dispatch.
- [ ] **5.8.2** Tool output folded into the declaring AI reviewer's prompt as a "prior findings" section.
- [ ] **5.8.3** AI reviewer confirms/refines/rejects — does not redo what the tool already did.
- [ ] **5.8.4** `tools=silent|interactive|skip` argument governs missing-tool behaviour (existing).

#### 5.9 — Diff-hotspot weighting

- [ ] **5.9.1** Compute hotspot score per file: `churn(N=30 commits) × lines_changed × cyclomatic_complexity`.
- [ ] **5.9.2** High-score files receive more reviewers + larger token budget under `mode=thorough`.
- [ ] **5.9.3** Cold-spot files dispatch leaner pass.

#### 5.10 — Reviewer dependency graph

- [ ] **5.10.1** Aggregator computes topo order from `escalation_from` declarations.
- [ ] **5.10.2** Wave dispatch: wave 1 = no deps, wave 2 = depends only on wave 1, etc. Parallel within waves; sequential across.
- [ ] **5.10.3** Escalation reviewers receive predecessor output as context (not running blind).

#### 5.11 — Confidence calibration

- [ ] **5.11.1** Per-reviewer `confidence` emitted on each finding.
- [ ] **5.11.2** Aggregator bands: `high` → report as-is; `medium` → corroboration check (another reviewer or tool on same line?); `low` → advisory appendix unless corroborated.
- [ ] **5.11.3** Downgrade rule: unconfirmed low-confidence criticals drop to `important` until a second source hits.

#### 5.12 — Risk-based routing

- [x] **5.12.1** Step-0 computes per-file risk tier (`high | medium | low`) from the diff. *Implemented as Step 0.6 in `code-reviewer.md` — bucket = trivial / lite / full / sensitive (4 buckets, mapped from path-pattern + line-count + Project-Profile signals).*
- [x] **5.12.2** High-risk (auth, crypto, payment, PII, schema migration, IaC, RBAC, CVE dep upgrade) → full security + compliance + architecture bundle; block on any Critical. *`sensitive` tier → cap 30 with risk-path matchers covering auth/crypto/secret/IAM/migration/IaC.*
- [x] **5.12.3** Medium-risk (business logic, API contracts, data access, background workers) → correctness + tests + architecture + perf. *`full` tier → cap 20.*
- [x] **5.12.4** Low-risk (docs, formatting, constants, fixtures) → fast-track readability + docs. *`trivial` (cap 3) and `lite` (cap 8) tiers; `trivial` short-circuits the pipeline if no Tier-2 signal triggers.*
- [x] **5.12.5** Persist per-file risk tier in `project_profile.per_file_risk` so it is auditable. *Tier persisted at run level in `manifest.json::tier` + `tier_rationale`; per-file persistence is a Sprint 4 enrichment when SARIF lands.*

#### 5.13 — Hard-threshold validators (orchestrator gates)

- [ ] **5.13.1** PR size warn ≥ 400 LOC, block ≥ 1000 LOC (configurable).
- [ ] **5.13.2** Single-purpose check (≥ 3 top-level directories + > 2 distinct conventional-commit prefixes → warn).
- [ ] **5.13.3** CI-green precondition — if lint/type/tests/SAST/SCA/secret-scan are red in the head commit, surface as Critical at Tier 0 and require resolution before AI reviewers run.
- [ ] **5.13.4** Author-hygiene pre-dispatch gate (unreferenced TODO/FIXME/HACK; `@Suppress`/`# noqa`/`@ts-ignore` without ticket; skipped tests; commented-out code; dead imports; PR description < 100 chars).
- [ ] **5.13.5** Conventional Commits validation when `.commitlintrc` / husky config detected.
- [ ] **5.13.6** Session-budget split: if estimated dispatch > 90 min of work, split into waves and stream results.

#### 5.14 — Knowledge freshness

- [x] **5.14.1** `last_reviewed: <YYYY-MM-DD>` in reviewer frontmatter (required on Tier 2/3; optional on Tier 1). *Field present across all 596 source files.*
- [ ] **5.14.2** Aggregator emits freshness warning when any high-criticality reviewer (security, compliance-tagged) hasn't been reviewed in 6+ months.
- [ ] **5.14.3** Validator fails when a Tier-2/3 reviewer missing `last_reviewed`.

#### 5.15 — Closeout

- [ ] **5.15.1** Run a small synthetic diff through the full Tier 0 → Tier 1 → Tier 2 → Tier 3 ladder. Measure token budget consumed.
- [ ] **5.15.2** Verify test-gap, doc-gap, and migration-radar walkers fire deterministically.
- [ ] **5.15.3** Verify skip cache short-circuits a second run over unchanged files.
- [ ] **5.15.4** Verify result dedup merges findings.
- [ ] **5.15.5** Verify streaming mode emits incremental findings.
- [ ] **5.15.6** Self-review phase 5 changes with skill-code-review.
- [ ] **5.15.7** Commit `feat(orchestrator): tiered dispatch ladder + caches + walkers + dedup`.
- [ ] **5.15.8** Tag `phase-5-complete`.

### Phase 6 — Build/validate scripts

- [~] **6.1** Upgrade `scripts/index-build.mjs` to dual-mode: read both `reviewers/` and `reviewers.wiki/`, generate unified `reviewers/index.yaml`, surface orphans loudly. *Obsolete — legacy `reviewers/` was deleted with explicit user approval; no transition window required.*
- [~] **6.2** Create `scripts/validate-aliases.mjs`: walk `reviewers.wiki/` frontmatter, verify every legacy id has an `aliases[]` entry somewhere in the new tree, fail on any orphan. *Obsolete — same reason as 6.1.*
- [x] **6.3** Extend existing `npm run validate` chain to invoke `validate-aliases.mjs`, `validate-body-shape.mjs`, `validate-dimensions.mjs`, and `validate-report-schema.mjs` (all introduced in earlier phases). *`npm run validate:src` chain runs `index:build:src + validate-body-shape + validate-dimensions`. Alias-validate skipped per 6.1; schema validator is Sprint 4.*
- [x] **6.4** Confirm **no** `wiki:*` npm scripts or husky/CI additions that call skill-llm-wiki — that coupling is intentionally absent. *Confirmed in `package.json` and `.husky/pre-commit`.*
- [x] **6.5** Run `npm run index:build && npm run validate && npm run lint` end-to-end — must pass. *`npm run validate:src && npm run test:src && npm run lint` all pass; legacy `index:build && validate` removed.*
- [x] **6.6** Exercise pre-commit hook with a trivial reviewer edit; confirm clean pass. *Pre-commit ran clean during `9f1823e` commit.*
- [~] **6.7** Self-review phase 6 changes with skill-code-review. *Folded into Phase 3.8 self-review since Phase 6's surviving items shipped together with Phase 3.*
- [~] **6.8** Commit `feat(scripts): dual-mode index build + alias/body/dimensions/schema validation`. *Folded into commit `9f1823e`.*
- [~] **6.9** Tag `phase-6-complete`. *Superseded by `phase-3-complete` tag.*

### Phase 7 — Cleanup, docs, version bump

- [x] **7.1** Update `SKILL.md`: new reviewer counts, new taxonomy explanation, wiki integration note, new output-format capabilities, tiered-dispatch explanation. *Rewrote in Phase 3 cleanup; reflects 476-leaf wiki + dimension-predicate gates + sprint-1 risk-tier.*
- [x] **7.2** Update `README.md`: counts + taxonomy + quick-start + new output channels (SARIF/github-pr/gitlab-cq/junit/html). *Counts/taxonomy/quick-start refreshed; SARIF + extra output channels are Sprint 4 deferred.*
- [x] **7.3** Update `CONTRIBUTING.md`: "how to add a reviewer" workflow is now "add a file to `reviewers.src/`, then manually re-run skill-llm-wiki from `../skill-llm-wiki/`" with exact invocation from phase 2.8; document tiered-body contract + `last_reviewed` requirement.
- [x] **7.4** Update `.claude/rules/skill-development.md` "Adding a New …" sections to reflect the wiki workflow, the tiered body-shape contract, and the new validators.
- [ ] **7.5** Bump `package.json` version (major — taxonomy and schema are breaking). *Deferred to final release; current is 1.0.6.*
- [ ] **7.6** Final self-review pass with `skill-code-review` against the entire rebuild. Must return GO with zero Critical findings (mandatory per workspace memory). *Deferred to after Sprint 5 / when the orchestrator can run end-to-end against itself.*
- [x] **7.7** (Deferred, with explicit user approval only) Delete legacy `reviewers/` after one clean review cycle has run off `reviewers.wiki/`. Do **not** delete in phase 7 itself without confirmation. *User explicitly approved deletion; legacy `reviewers/` and `overlays/` deleted in commit `9f1823e`.*
- [ ] **7.8** Commit `chore: finalize skill-code-review deep rebuild`. *Pending final release commit.*
- [ ] **7.9** Tag `rebuild-complete`. *Pending final release.*

Critical files by phase are listed with each phase's steps. Global set: `reviewers.src/**`, `reviewers.wiki/**`, `code-reviewer.md`, `report-format.md`, `reviewers/release-readiness.md`, `scripts/index-build.mjs`, `scripts/validate-aliases.mjs`, `scripts/validate-body-shape.mjs`, `scripts/validate-dimensions.mjs`, `scripts/validate-report-schema.mjs`, `scripts/walk-test-gaps.mjs`, `scripts/walk-doc-gaps.mjs`, `scripts/walk-migration-radar.mjs`, `scripts/formatters/{sarif,github-pr,gitlab-cq,junit,html}.mjs`, `.skill-code-review/{profile.yaml,cache/**}`, `SKILL.md`, `README.md`, `CONTRIBUTING.md`, `package.json`, `.claude/rules/skill-development.md`.

---

## Reuse — what we keep from existing code

- **Frontmatter conventions** from current `reviewers/*.md` (`id`, `type`, `focus`, `audit_surface`, `languages`, `activation`) — extended, not replaced.
- **`scripts/index-build.mjs`** — kept and extended for the transition window.
- **`report-format.md`** — output schema is unchanged. Only gate→specialist id maps change.
- **Pre-commit hook pipeline** in `.husky/pre-commit` — add validation, don't restructure.
- **Severity vocabulary** (Critical / Important / Minor) — unchanged.
- **Parallel dispatch contract and JSON output schema** in `code-reviewer.md` — unchanged.
- **The 8-gate release-readiness model** — unchanged. Only its wiring to specialist ids is updated.
- **Existing 18 reviewer files** — used as **content seed** for the new files (lift checklists, then expand and split). Not preserved verbatim per the user's "Replace" decision.
- **archman.dev/docs** — used as **taxonomy seed**, not copied. Each section reviewed and translated into review-perspective checklists.
- **skill-llm-wiki** — used as the actual optimization tool. Not reimplemented, not bypassed. Always invoked via its agent-delegation contract.

---

## Verification

End-to-end checks that must all pass before declaring the rebuild done:

1. **Source corpus structurally valid:** `node scripts/index-build.mjs` completes for `reviewers.src/`; every file parses; every id matches its filename; every `activation` block has at least one signal; every reviewer declares `tier` and ≥ 1 dimension from the 7-axis taxonomy; Tier 2/3 reviewers declare `last_reviewed`.
2. **Body-shape contract:** `validate-body-shape.mjs` passes — every file has the fixed H2 sections and stays within its tier's length caps (T1 200 / T2 500 / T3 800 lines, audit_surface 12/20/25, H3 4/8/12).
3. **Dimensions coverage:** `validate-dimensions.mjs` passes — every reviewer covers ≥ 1 of (correctness, security, performance, tests, readability, architecture, documentation).
4. **Wiki built clean:** `skill-llm-wiki validate ./reviewers.wiki` reports zero errors. Tree depth reasonable (no 500-file flat directories; no degenerate single-child chains). Cluster names sensible.
5. **Alias completeness:** `validate-aliases.mjs` confirms every id from the legacy `reviewers/index.yaml` resolves as a primary id or alias in `reviewers.wiki/`. No legacy dispatch target orphaned.
6. **Report schema v2 valid:** `validate-report-schema.mjs` passes against emitted sample reports for markdown/JSON/YAML/SARIF/github-pr/gitlab-cq/junit/html. Golden-file tests under `tests/report-format/` pass.
7. **SARIF round-trip:** A sample SARIF export loads cleanly into the SARIF viewer and GitHub Code Scanning upload endpoint (dry run).
8. **Orchestrator dry-run:** Run `code-reviewer.md` against a synthetic diff containing Python, Go, TypeScript, Swift, and Java code across five files plus a SQL migration and a k8s manifest. Verify:
   - Each language file routes to its dedicated language-deep reviewer (not the umbrella `language-quality`).
   - Security findings come from the decomposed OWASP-specific reviewers, not the monolith.
   - The SQL migration triggers `migration_radar` and routes to `data-schema-migrations`.
   - The k8s manifest triggers `k8s-manifest-correctness`.
   - The 8-gate release verdict still synthesizes correctly.
   - `project_profile` reports the detected stack accurately.
9. **Tiered ladder:** Tier 0 fingerprint + walkers complete deterministically; Tier 1 always-on reviewers run; Tier 2 activates only for signal-matching files; Tier 3 fires only on escalation.
10. **Caches:** Second run over unchanged files short-circuits via the per-(file, sha, reviewer) skip cache; `regression: true` fires on reintroduced findings; `profile.yaml` fingerprint hit skips Step 0.
11. **Determinism:** `walk-test-gaps.mjs`, `walk-doc-gaps.mjs`, `walk-migration-radar.mjs` produce identical output on repeat runs.
12. **Dedup:** Two reviewers reporting the same root cause produce one merged finding with `attribution: [...]`.
13. **Streaming:** `streaming=on` emits findings progressively; final summary object closes the stream cleanly.
14. **Thresholds:** PR-size gate warns at 400 LOC and blocks at 1000 LOC; author-hygiene reviewer fires before dispatch; CI-red precondition blocks at Tier 0.
15. **Self-review pass:** Run `skill-code-review` against the rebuild itself. Must come back GO with no Critical findings. (Per memory: mandatory before reporting completion.)
16. **Pre-commit hook:** A trivial edit to a reviewer source file triggers `index:build && validate && lint` cleanly, including `validate-aliases.mjs`, `validate-body-shape.mjs`, `validate-dimensions.mjs`, and `validate-report-schema.mjs`. skill-llm-wiki is not required at commit time — it's a phase-2 (and re-run) tool, not a hook dependency.
17. **Documentation sync:** README/SKILL counts match actual reviewer file counts; new output channels and tiered dispatch documented. (Per memory: "sync READMEs … before reporting completion.")
18. **Version bump:** `package.json` version incremented (major).

---

## Open risks and mitigations

- **Authoring volume (~500 source files).** Phase 1 alone is the bulk of the work. Mitigation: Phase 1 is already split into 39 sub-batches (1.1 – 1.39), each ending in its own commit; each sub-batch is self-contained. The user can stop after any sub-batch and still have a coherent partial corpus. The tiered body-length contract (200/500/800) prevents individual files from ballooning.
- **skill-llm-wiki Tier 2 cost.** Cluster naming uses a strong reasoning model across ~500 files → likely 60–120 NEST clusters. Modest but real spend; budgeted as a one-time phase-2 cost plus occasional re-runs when gap-fill adds files.
- **Orchestrator cutover regressions.** Dual-mode `index:build` keeps legacy dispatch alive during transition. Phase 7 only deletes `reviewers/` after a clean self-review cycle (and only with explicit user approval).
- **Aliases drift.** `validate-aliases.mjs` wired into the `validate` chain + pre-commit hook.
- **Body-shape drift.** `validate-body-shape.mjs` enforces the H2/H3 section contract and per-tier length caps in CI. Reviewers that bloat past their tier cap fail the build — forces DECOMPOSE.
- **Report schema v2 consumer breakage.** Mitigation: `schema_version` discriminator lets old consumers opt in; v1 fields remain present and populated alongside v2 additions for one release cycle.
- **Skip cache correctness.** Risk: stale cached findings mask real regressions. Mitigation: cache key is `(reviewer-id, file-content-sha)` — any content change invalidates; `cache=refresh` forces re-run; `cache=off` disables entirely. CI runs with `cache=off` by default.
- **Per-finding confidence miscalibration.** New field, no historical data to tune the thresholds. Mitigation: corroboration rule (low-confidence criticals downgrade until a second source hits) defaults conservative; thresholds land as configurable in `package.json` skill config.
- **Tool-priors dependency on external installs.** Mitigation: existing `tools=silent|interactive|skip` argument governs missing-tool behaviour; report explicitly surfaces skipped tools.
- **Some archman.dev concepts won't map cleanly to reviewable content.** Scope rule — if a topic doesn't yield a concrete checklist, drop it from the source corpus rather than pad. Full-coverage mandate still applies to everything that *does* yield reviewable content.
- **Tier-1 always-on creep.** Tier 1 is supposed to be cheap; temptation is to keep adding to it. Mitigation: validator hard-caps Tier-1 body size at 200 lines and audit_surface at 12 bullets. Anything bigger must move to Tier 2.
- **Reviewer dependency cycles.** Aggregator builds a DAG from `escalation_from`; any cycle fails validation with a clear error identifying the offending chain.

---

## Upstream `skill-llm-wiki` items (delegated)

**Principle (locked, 2026-04-26):** anything that lives in the wiki-build pipeline (clustering, slug generation, cluster-focus synthesis, balance enforcement, soft-DAG parents, etc.) is `skill-llm-wiki`'s job. skill-code-review owns the corpus (`reviewers.src/`), the orchestrator (`code-reviewer.md`), the gates (`release-readiness.md`), and the report format (`report-format.md`) — but **does not implement workarounds for skill-llm-wiki shortcomings inside this repo**. Any wiki-quality issue we surface gets filed as an issue or PR on `ctxr-dev/skill-llm-wiki` and solved there.

The investigation surfaced two upstream items. They block nothing in skill-code-review — the orchestrator routes off `focus` strings (which were fixed by `skill-llm-wiki` PR #20) — but they're worth filing for the next round of skill-llm-wiki work.

### Upstream item 1 — Slug-naming algorithm refinement

**Problem.** Cluster slugs like `bomb-gas`, `cache-edge`, `classes-class`, `client-server`, `health-missing` don't describe their cluster contents. The current slug generator (in `scripts/lib/cluster-detect.mjs::generateDeterministicSlug`) ranks TF-IDF token pairs by cluster-vs-sibling distinctiveness and returns the highest-ranked valid kebab-case pair. For homogeneous clusters that works; for heterogeneous coarse-k-means clusters the top-2 tokens often capture only one or two members' content and mislead readers.

**Why it doesn't block us.** Routing is by `focus` string, not by slug. Multi-cover focus synthesis (already shipped in PR #20) tells the orchestrator the truth about cluster contents. Slugs are display-side only.

**Why it's still worth filing.** A user reading the wiki tree sees slugs first; misleading names create cognitive friction. Same fix idea as PR #20: replace single-token-pair selection with multi-cover synthesis using top-N tokens joined with `-` (capped). Or expose a `cluster-naming-strategy` flag with `tf-idf-pair` (current) vs `multi-cover` (proposed) so users can pick.

**Where to file.** `ctxr-dev/skill-llm-wiki` — propose as design issue first (similar to how cluster-focus synthesis was opened), get alignment, then PR.

### Upstream item 2 — Cluster heterogeneity scorer

**Problem.** No build-time signal warns when a cluster's members span widely-divergent dimensions/tags. `bomb-gas` (rate-limit + access-control + auth) and `cache-edge` (float drift + cache + query-param bypass) are heterogeneous clusters that pass validation silently. A scorer would let the build emit warnings or even split such clusters automatically.

**Why it doesn't block us.** Multi-cover focus strings carry the truth even when clusters are heterogeneous, so routing precision survives. But heterogeneous clusters do mean a single descent path may activate unrelated leaves, costing token budget.

**Why it's still worth filing.** A `--warn-heterogeneous-clusters threshold=N` build flag could surface these for review/manual split. Or skill-llm-wiki's NEST proposer could rank candidate clusters by a homogeneity score before accepting them.

**Where to file.** Same as upstream item 1 — design issue → PR on `ctxr-dev/skill-llm-wiki`.

### What stays in skill-code-review's plan

Anything orchestrator-side, schema-side, or report-side. The full Sprint 1–5 sequencing in the investigation update at the top of this plan covers the in-repo work end-to-end. Sprint 3 (corpus quality) does include source edits to `reviewers.src/` that require a wiki rebuild afterwards — but the rebuild itself is just `node ../skill-llm-wiki/scripts/cli.mjs build ...`, not new logic.
