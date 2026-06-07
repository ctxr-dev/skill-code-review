---
name: scr-benchmark-optimizer
version: 1.0.0
description: >
  Self-improvement loop for skill-code-review: benchmark it against competitors
  on the open Greptile/Martian code-review benchmark, diagnose recall/precision
  losses, and apply PROVEN mechanical optimizations to the FSM + reviewers until
  it sits on (or above) the precision-recall frontier — high bug coverage AND low
  noise. Re-runnable across many iterations; every run is a versioned experiment.
audience: ai-agents
when_to_use: >
  Use whenever you want to measure or improve skill-code-review's bug-finding
  quality vs competitors, after changing reviewers/handlers/prompts, or to
  continue the optimization loop from the last versioned experiment.
---

# scr-benchmark-optimizer

The discipline that keeps `skill-code-review` measurably better than competing AI
code reviewers. It is a closed loop: **measure → diagnose → improve (mechanically)
→ re-measure → record a versioned experiment → compare**. Never stop on a
regression; never apply an unproven heuristic; never change `reviewers.wiki`
structure without explicit human confirmation.

## The target (what "winning" means)

The open benchmark (`withmartian/code-review-benchmark`, 50 PRs / 5 repos / ~136
human golden bugs) scores every finding that does NOT match a golden bug as a
false positive. So the goal is the **precision-recall frontier**: catch the bugs
(recall) while emitting few non-bug findings (precision). Land **between the
noisiest competitor and the most accurate** — beat the noisy engines (CodeRabbit,
Greptile, Copilot, Bugbot) on BOTH axes, and close on the leader (Cubic).

Baseline competitors (validated vs the committed Opus-4.5 judge):
Cubic 0.91/0.77 (F1 0.83) · Macroscope 0.45/0.83 · Bugbot 0.55/0.43 ·
CodeRabbit 0.64/0.35 · Copilot 0.55/0.30 · Greptile-v4-1 0.45/0.31.

Current skill standing (baked, 5-PR pilot): **recall 0.818 / precision 0.692 /
F1 0.75** — dominates CodeRabbit, Greptile, Copilot, Bugbot; beats Macroscope on
F1; at the high-precision setting it is on the frontier (precision > Cubic's).
The remaining gap to Cubic is **recall** (2 of 11 goldens were not found by any
specialist = reviewer COVERAGE, not noise).

## The harness (gitignored, under `ctxr-dev/tmp/`)

- `bench/` — clone of the benchmark. `bench-index.json` — 50 PRs with the
  **merge-base** diff (NEVER use `baseRefOid..head`; it includes drift — see
  OBSERVATIONS #8). `setup_repo.py` rebuilds a PR's repo at the correct base.
- `driver/driver.py` — resumable IN-PROCESS FSM driver (engine + real inline
  handlers; no MCP cosignature friction). `review_workflow.js` drives a full
  review per PR with per-leaf parallel specialists + model routing.
- `driver/optimize_workflow.js` (label TP/FP + golden-blind defect-score),
  `sweep.py` / `dedup_sweep.py` (threshold sweep, embedding dedup),
  `analyze.py` (diagnose recall/precision losses), `rank_workflow.js`
  (LLM dedup+rank), `judge_workflow.js` (one consistent judge), `score.py`.
- `embed/embed.mjs` — Xenova (`all-mpnet-base-v2`) embedder; used for finding
  dedup and (reserved) fast wiki routing.
- `experiments/` — **versioned experiment MD files** (`exp.py record|compare`),
  YAML frontmatter carries the headline stats so you compare WITHOUT reading
  bodies; bodies preserve full detail for deep debugging.
- `OBSERVATIONS.md` — every bug/friction/divergence with a ✅/🛠️/⏳/➖ status board.
- `results/REPORT.md` — the current leaderboard + analysis.

## The loop (one iteration)

1. **Measure.** Run `review_workflow.js` over the PR set (5-PR pilot first; full
   50 to confirm). Each review: scan → activate → tree-descend → trim →
   tool-discovery → **dispatch_specialists (loop, ALL files sharded — 100%
   coverage)** → collect (dedup + selectivity) → gates → report.
2. **Judge once, consistently.** `judge_workflow.js` (one model, Martian rule);
   validate it reproduces the committed competitor numbers before trusting it.
3. **Diagnose.** Label each finding TP/FP (golden-aware) + score defect-confidence
   (golden-blind); `analyze.py` shows under-rated goldens (recall loss) and
   over-rated non-goldens (precision loss). `sweep.py` finds the best threshold.
4. **Improve — MECHANICAL only** (see Principles). Re-bake.
5. **Re-measure + record.** `exp.py record vNN <name> --json <stats>`; then
   `exp.py compare`. Keep the change only if it moves the frontier; else revert.
6. **Escalate if blocked.** If the only remaining gain needs a different reviewer
   set/structure (a COVERAGE problem), STOP and propose a `reviewers.wiki`
   restructure (proven statistical methods only) for human confirmation.

## Principles (the architecture contract)

1. **100% coverage, always.** The FSM loop shards EVERY changed file into
   dispatch units across iterations — 10 files or 1000, review them all. Never
   drop a file. The planner's `total_files_planned` is asserted at merge.
2. **Regulated parallelism (ThreadPoolExecutor / batched fan-out).** Dispatch
   specialists in bounded parallel batches; scale the worker count DOWN on rate
   limits / context pressure and back UP when healthy. Orchestration lives in the
   FSM loop layer, not in individual reviewers.
3. **Deterministic, big-data-safe collection.** `collect_findings` is pure Python
   — it aggregates arbitrarily large finding sets without loading them into any
   agent context. Findings are persisted per-leaf (one file per unit) and merged
   algorithmically.
4. **Two-stage dedup.** (a) Deterministic clustering by location + embedding
   cosine (or token-overlap fallback) collapses obvious duplicates; (b) a
   **deduper AGENT always adjudicates SUSPECTED/borderline clusters** (join /
   keep-separate / drop) — never silently merge distinct bugs, never silently
   keep triplicates. The final report may be large; that is fine.
5. **Never overflow context.** Specialists get only their file slice + room to
   read connected files; if a slice is too big, sub-shard it (the planner does)
   or have the specialist delegate to its own sub-agent and return a wrapped
   conclusion. The collector/deduper never ingest the whole corpus at once.
6. **Fault tolerance.** Tolerate context-overflow (sub-shard, retry smaller) and
   rate limits (backoff + dynamic worker count). A failed unit becomes a
   `status: failed` row, not a lost file.
7. **Sharper specialists.** Each specialist applies bug-hunting heuristics
   (data-flow/provenance, error/edge paths, contract/behavior change, security,
   test-validity) and **reads import-connected files** (where a consumed value is
   set, the definition of a called fn, the covering tests) to VERIFY before
   reporting. Emits a per-finding `confidence`. Reports DEFECTS, not style
   opinions. Silence is precision.
8. **Selectivity, not suppression.** Rank findings by defect `confidence`;
   surface a `primary` (block-worthy) set above a threshold and keep the rest as
   advisory. Do NOT drop real bugs to game precision — rank them.
9. **Embeddings (Xenova, biggest practical model).** For finding dedup AND for
   fast `reviewers.wiki` routing (embed leaves + the diff, retrieve top-K by
   cosine instead of long LLM tree-scans). Proven, deterministic, cheap.
10. **Wiki structure is human-gated.** Mechanical FSM/prompt/handler changes are
    free. Any change to the SET or STRUCTURE of reviewers in `reviewers.wiki`
    requires a written proposal (justified by a proven statistical method) and
    explicit human confirmation before editing.
11. **Versioned experiments.** Every run/iteration is an `experiments/vNN-*.md`
    with frontmatter stats; compare across versions via frontmatter only; keep
    the full body for debugging. Update `OBSERVATIONS.md` status checkmarks.

## What has been baked (mechanical, tests green)

- `workers/specialist.md`: heuristics + import-connected-file verification +
  per-finding `confidence` + precision discipline.
- `spec.py`: `confidence` / `verified_via` on the specialist finding schema.
- `handlers.collect_findings`: `_semantic_merge` (embedding dedup via
  `CTXR_SCR_EMBED_CMD` hook, else location+token-overlap) + confidence-based
  `primary` selection; `_build_issue` surfaces `primary`/`corroboration`/`confidence`.

- `rank_findings` FSM stage (worker, 19-state spec): neutral defect-confidence
  scoring + **deduper-agent** adjudication of residual duplicates + `primary`
  selection, with its own verifier panel. Makes the shipped FSM natively produce
  the frontier result. (Principle 4b ✅)

## Still open (next levers — see OBSERVATIONS.md)

- ThreadPoolExecutor with dynamic scaling + rate-limit/overflow fault tolerance
  baked into the loop layer (Principle 2, 6) — req #27/#30.
- Recall to beat Cubic: APPROVED `reviewers.wiki` restructure — embedding
  dense-retrieval routing + MMR selection + coverage-gap domain leaves (e.g.
  media/image-processing), pilot-validated. See WIKI-RESTRUCTURE-PROPOSAL.md.
- Fresh validation pilots: confirm the native `rank_findings` stage reproduces
  F1 0.75, then the wiki routing's recall gain.

## Before any commit to skill-code-review

```bash
uv run ruff check ctxr_skill_code_review/ tests/
uv run mypy ctxr_skill_code_review/
uv run pytest
```
All three must pass. Wiki changes additionally require the human-confirmed plan.
