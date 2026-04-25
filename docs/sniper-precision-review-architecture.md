# Sniper-Precision Code Review Architecture — Investigation + Design

**Investigation date:** 2026-04-26
**Status:** proposal — awaiting user direction before implementation

This document synthesises five parallel sub-agent investigations into how to use the 476-leaf `reviewers.wiki/` corpus for high-precision code review. Sources: GitHub Copilot mechanics, SOTA AI review tools (CodeRabbit, Greptile, Cursor Bugbot, Sourcegraph, Aider, Codacy, Snyk Code, Qodo PR-Agent), multi-agent SE research (arxiv 2024-2026), Cloudflare's production review system, Claude Code sub-agent dispatch mechanics, and a thorough audit of our own wiki's routing surface.

## Headline finding

Five independent investigations converge on the same backbone: **risk-tiered triage → hybrid routing (deterministic + small LLM trim) → parallel independent specialists → verification judge pass → predicate-based aggregation → dual-format persistent reports**. Multi-agent role-based systems with cross-talk underperform simpler architectures (arxiv 2509.01494) — the win is from the *judge* and the *manifest*, not from agent chatter.

## Convergent patterns (≥ 3 sources agree)

| Pattern | Sources |
|---|---|
| Static prefilter → LLM trim (hybrid routing) | Cloudflare, CodeRabbit, Greptile, Bito |
| Specialists run blind in parallel, no cross-talk | Cloudflare, Calimero, arxiv 2509 (cross-talk underperforms) |
| Verification / judge pass after primary review | CodeRabbit, Cursor v1, Snyk Code |
| Risk-tier-gated specialist count | Cloudflare (trivial/lite/full/sensitive) |
| Severity × agreement (single-source criticals get demoted) | Calimero, Cloudflare reasonableness filter |
| Hard precision bias — silence is OK | GitHub Copilot (29% silent rate) |
| Persistent execution manifest as coverage proof | Cloudflare, Calimero, Baz.co |
| SARIF for tooling + Markdown for humans | GitHub, Cloudflare, generic SOTA |

## Divergent design choices (interesting space)

- **Single-call vs agentic loop**: Qodo PR-Agent does one LLM call (~30s, cheap); Cursor moved *from* 8-pass ensemble *back to* single agentic loop because tool-use beat ensembling.
- **Hypothesis-first vs role-first**: Baz.co generates risk hypotheses *then* dispatches specialists; most others always run a fixed role set.
- **Embedding vs graph retrieval**: Sourcegraph abandoned embeddings for repo-level work; Greptile graph-index outperforms vectors at review time.

## Wiki audit findings

The Explore agent audited our 476 leaves. Routing primitives are strong but uneven:

| Metric | State | Quality |
|---|---|---|
| Activation block coverage | 476/476 | Excellent |
| `file_globs` coverage | 475/476 | Excellent |
| `keyword_matches` coverage | 448/476 | Good |
| `structural_signals` coverage | 441/476 | Good |
| `escalation_from` usage | 1/476 | **Severely under-used** |
| Routing dead zones | 0 | Excellent |
| `dimensions:` explicit field | 0/476 | **Missing — inferred from tags** |
| `tools:` populated | 0/476 | **Missing — declared inline only** |
| Cluster focus alignment | ~70% well, ~30% heterogeneous | Fair |

**Heterogeneous cluster examples**: `bomb-gas` (rate-limit + access-control + auth), `cache-edge` (float drift + cache + query-param bypass), `health-missing` (Jupyter/Python lints, not health checks), `aria-visual` (ARIA + visual rendering), `cell-snapshot` (mixed languages + async + BPF). Slug names mislead but the multi-cover focus strings (post skill-llm-wiki PR #20) carry the routing signal correctly.

## Proposed architecture

Six tiers, each addresses a specific failure mode:

```
TIER 0 — Project Profile (existing, kept)
   Languages, frameworks, monorepo structure, CI/IaC.

TIER 1 — Risk-tier triage (new)
   Bucket the diff:
     trivial   ≤ 10 lines, single file       → cap 3 specialists
     lite      ≤ 100 lines, ≤ 5 files        → cap 8 specialists
     full      > 100 lines OR > 5 files      → cap 20 specialists
     sensitive any path matches /security|auth|crypto|infra|deploy/  → cap 30 specialists
   Force-skip the rest of the pipeline on `trivial` if no signal triggers.

TIER 2 — Hybrid routing (replaces current Step 1 single-stage descent)
   Stage A (deterministic, ~free):
     - Wiki tree descent by focus (existing)
     - Activation gate per leaf (file_globs / keyword_matches /
       structural_signals / escalation_from)
     - Output: ~30 candidate leaves (the current behaviour)
   Stage B (LLM trim, one cheap call):
     - Pass profile + diff summary + 30 candidate-leaf focuses
     - Pick final K = tier-cap, with one-line justification per pick
     - The justifications ARE the coverage proof

TIER 3 — Hypothesis pre-pass (optional, new)
   Baz.co pattern. One small LLM call: "given this diff, what could go wrong?"
   Produces 5-15 risk hypotheses. Map each to ≥ 1 selected specialist.
   Specialists with no hypothesis get demoted (cap-bound). Hypotheses with
   no specialist trigger a coverage-gap flag.

TIER 4 — Parallel dispatch (existing parallelism, new prompt scaffold)
   K Agent sub-task calls in a single message (parallel).
   Each specialist sub-agent receives:
     - Its leaf body
     - Project Profile
     - Filtered diff (file_globs-narrowed)
     - "What NOT to Flag" guardrails (per leaf or per category)
     - Logical-certificate scaffold (Meta SemiFormalReasoning):
         premises → execution_path → conclusion → severity_rationale
     - "Empty findings is the expected outcome" instruction
   Each specialist returns:
     - JSON findings array
     - Execution metadata (runtime, tokens, status)
   NO cross-talk — specialists are blind to each other.

TIER 5 — Verification judge (new)
   Single sub-agent receives: union of all specialist findings.
   For each finding:
     - Re-read the cited file:line
     - Verify the claim is supported by the actual code
     - If not supported: drop with reason
     - If supported: keep, possibly merge with near-duplicates
   Compute severity × agreement: a Critical flagged by exactly one
   specialist gets demoted to Important unless the leaf is
   high-confidence on its dimension.

TIER 6 — Report synthesis (extends existing Step 5/6)
   Orchestrator writes a sharded run-id-keyed directory:
     .skill-code-review/<shard>/<run-id>/
       manifest.json         — specialist-execution log + decisions
       findings.sarif        — SARIF 2.1.0 for tooling/cumulative tracking
       report.md             — human report (current shape, enriched)
       findings/<leaf>.md    — per-leaf detail (optional drill-down)
       routing.md            — Stage A + Stage B trace, hypothesis map
   shard = first 2 hex chars of the run-id hash → 256 shards, bounded
   entries-per-shard at 100k+ accumulated runs (mirrors skill-llm-wiki's
   similarity-cache pattern; APFS/ext4 directory degradation is a known
   issue at ~10k flat entries).
   8-gate aggregation by dimension predicate (existing).
   Emit empty findings when warranted — silence is a valid result.
```

## Why each tier earns its place

| Tier | Justification | Source |
|---|---|---|
| 1 — Risk-tier | Cloudflare burns ~$0.30/PR if no tiering; tiers cut median cost by ~70% | Cloudflare blog |
| 2A — Static prefilter | Cuts 476 → 30 in O(1), no LLM cost | Greptile graph, CodeRabbit Codegraph |
| 2B — LLM trim | One cheap call replaces brittle "pure LLM router"; justification doubles as coverage proof | CodeRabbit, Greptile |
| 3 — Hypothesis | Sniper-precise: hypothesis-first systems flag fewer false positives | Baz.co |
| 4 — Blind parallel | arxiv 2509: cross-talk hurts F1; multi-pass independent + aggregate gives Gemini-2.5-Flash a +43% F1 lift | arxiv 2509.01494 |
| 4 — Logical-certificate | Meta reports +10-15 F1 from premise→execution→conclusion scaffold | Meta SemiFormalReasoning |
| 5 — Verification | Three independent SOTA tools converged on this — it's the highest-leverage quality lever | CodeRabbit, Cursor v1, Snyk |
| 5 — Severity × agreement | Single-source criticals are noisy; agreement is the cheapest confidence signal | Calimero |
| 6 — Manifest | Without it, "we reviewed everything" is unverifiable | Cloudflare, Calimero |
| 6 — Dual format | SARIF flows into GitHub Code Scanning; Markdown is for humans. Different audiences, different formats. | OASIS SARIF, GitHub docs |

## Concrete implementation sub-tasks

Ranked from highest leverage / lowest cost to highest cost.

### Tier-1 priority (do first — biggest precision wins per token)

1. **Add risk-tier pre-filter** in `code-reviewer.md` Step 0.5 (new sub-step). 4 buckets, fixed caps. Replaces the single 30-leaf token cap with tier-aware bounding. ~50 lines of orchestrator text.
2. **Two-stage routing** in Step 1 — existing tree descent becomes Stage A; add a Stage B "LLM trim" step that picks final K from candidates with explicit justifications. ~80 lines.
3. **Verification judge pass** as new Step 3.5 — one sub-agent re-validates findings before report synthesis. ~40 lines + sub-agent spec.
4. **Specialist-execution manifest** — new artifact `manifest.json` capturing which leaves ran, status, runtime, finding count. ~30 lines added to Step 6.

### Tier-2 priority (corpus quality — improves Tier-1 wins)

1. **Add explicit `dimensions:` field** to all 476 leaves' frontmatter (currently inferred from tags). Requires source edits + wiki rebuild. The gate-aggregation predicates already use `dimensions[]`; making it explicit improves predictability.
2. **Normalize tag casing** — `CWE-*` (uppercase) is consistent but `OWASP` mixes cases. Quick fix.
3. **Populate `tools:` field** where leaves' audit_surface mentions specific linters. Lifts each leaf's `tools[]` declaration to a routable level.
4. **Add `escalation_from` chains** for cross-cutting concerns (threat modeling, documentation, breaking-change drift). Currently only 1/476 uses this — huge unused capability.

### Tier-3 priority (architectural — bigger code changes)

1. **Hypothesis pre-pass** in Step 1.5 (new). Optional flag (`--hypothesis-mode`); off by default. Maps risk hypotheses to specialists, surfaces coverage gaps. ~60 lines.
2. **Logical-certificate scaffold** in Step 2 specialist prompt template. Each specialist's prompt includes the premise→execution→conclusion structure. Improves accuracy +10-15 F1 reported.
3. **Persistent report directory** under `.skill-code-review/<run-id>/`. Includes `manifest.json`, `findings.sarif`, `report.md`, optional per-leaf detail. Already aligned with the v2 plan's Phase 4.
4. **SARIF output** — implement in addition to the existing JSON output. Phase 4 of the v2 plan covers most of the schema enrichments needed; SARIF mapping is mechanical from there.

### Future skill-llm-wiki PRs (out of scope for this skill, surface as upstream issues)

- **Slug-naming algorithm refinement** — heterogeneous cluster slugs (`bomb-gas`, `cache-edge`, `health-missing`) mislead readers. The TF-IDF token-pair approach should be augmented or replaced by a multi-cover synthesis similar to the focus-string fix from PR #20.
- **Cluster heterogeneity scorer** — emit a build-time warning when a cluster's member focuses span > N distinct dimensions.

> Both items are formally carved out of the skill-code-review plan into the **"Upstream `skill-llm-wiki` items (delegated)"** section at the end of [`../skill-code-review-v2.md`](../skill-code-review-v2.md). The principle (locked 2026-04-26): wiki-build-pipeline issues live in `skill-llm-wiki`'s repo, never as workarounds inside this skill.

## What to NOT do (anti-patterns surfaced)

- **Multi-agent cross-talk**: arxiv 2509.01494 shows specialists priming each other's prompts hurts F1. Keep them blind.
- **N-pass ensemble + majority voting**: Cursor abandoned 8-pass voting because single-agent tool-use beat it. With 476 leaves you already have ensemble diversity.
- **Pure-LLM router**: brittle, hallucinates leaf names. Always prefilter deterministically first.
- **Specialist comment fan-out without dedup**: 30 specialists × 5 findings = 150 comments. Use the judge pass.
- **Treating empty findings as failure**: Copilot is silent on 29% of reviews — that's the precision win.

## Token-economics estimate (rough, for a typical full-tier PR)

| Stage | Calls | Tokens (in) | Tokens (out) |
|---|---|---|---|
| Tier 1 triage | 0 (deterministic) | 0 | 0 |
| Stage A descent | 0 (deterministic) | 0 | 0 |
| Stage B LLM trim | 1 | ~3K (30 candidates + diff summary) | ~500 (K picks + justifications) |
| Hypothesis pre-pass | 1 (optional) | ~2K | ~800 |
| K specialists (K=20 for full tier) | 20 (parallel) | ~50K (2.5K avg each) | ~30K (1.5K avg each) |
| Verification judge | 1 | ~10K (all findings + cited code) | ~3K (kept + reasons) |
| Report synthesis | 0 (orchestrator) | 0 | 0 |
| **Total** | **23** | **~65K** | **~34K** |

That's ~$0.30 per full-tier PR at Sonnet pricing — same ballpark as Cloudflare's published numbers. Trivial-tier PRs would be ~$0.03.

## Recommended sub-task ordering for execution

A staged rollout that ships value early and measures along the way:

**Sprint 1** (tightens routing without architectural change) — pulls from Tier-1 priority:

- Risk-tier pre-filter
- Two-stage routing with LLM trim + justifications
- Specialist-execution manifest

**Sprint 2** (quality lever) — pulls from Tier-1 priority:

- Verification judge pass
- Severity × agreement in 8-gate aggregation (covered by the verification judge tier)

**Sprint 3** (corpus quality) — pulls from Tier-2 priority:

- Add explicit `dimensions:` to leaves + rebuild
- Normalize tag casing
- Populate `tools:`
- Add `escalation_from` chains

**Sprint 4** (architectural enrichments + Phase 4 from v2 plan) — pulls from Tier-3 priority:

- Persistent report directory + SARIF
- Logical-certificate scaffold

**Sprint 5** (optional advanced) — pulls from Tier-3 priority:

- Hypothesis pre-pass

**Future skill-llm-wiki PRs** (delegated upstream):

- Slug-naming refinement
- Cluster heterogeneity scorer

## Sources

- arxiv 2509.01494 — Benchmarking LLM-based Code Review (Multi-Review independent passes give +43% F1 over single-pass; multi-agent cross-talk underperforms)
- arxiv 2603.00539 — LLM Reviewer Overcorrection Bias
- ACM TOSEM 10.1145/3712003 — LLM Multi-Agent Systems for SE survey
- Cloudflare Blog — Orchestrating AI Code Review at Scale (131k reviews / 30 days, public production architecture)
- GitHub Blog — 60M Copilot Code Reviews; Copilot Code Review agentic architecture (Mar 2026)
- CodeRabbit — Pipeline vs Agentic, agentic code validation
- Cursor Blog — Building a better Bugbot (regressed from 8-pass to single agent)
- Greptile — Graph-based codebase context
- Snyk DeepCode — Symbolic + generative hybrid
- Qodo PR-Agent — Open-source multi-agent reference (Apache-2.0)
- Baz.co — Architecture of Agentic Code Review (5-stage)
- Aider — Repo-map ranking algorithm (open-source MIT)
- Sourcegraph — Repo-level Semantic Graph (RSG); abandoned embeddings
- Calimero — Multi-agent reference impl (5 agents + aggregator)
- Meta — Semi-formal reasoning prompt scaffold (+10-15 F1)
- OASIS SARIF 2.1.0 spec
- Anthropic — Claude Code subagents docs; Managed Agents docs
