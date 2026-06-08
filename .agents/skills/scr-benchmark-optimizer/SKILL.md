---
name: scr-benchmark-optimizer
version: 2.0.0
description: >
  Self-improvement loop for skill-code-review: benchmark it against competing AI
  code reviewers on the open Greptile/Martian benchmark, diagnose recall/precision
  losses, and apply PROVEN optimizations to the FSM, dispatch, and reviewer prompts
  until it sits on (or above) the precision-recall frontier — high bug coverage AND
  low noise. Reviews run through the PRODUCT runner (the Python FSM + adaptive
  ThreadPoolExecutor), never a throwaway harness. Every run is a versioned
  experiment; never stop on a regression; never restructure reviewers.wiki without
  human confirmation.
audience: ai-agents
when_to_use: >
  Use whenever you want to measure or improve skill-code-review's bug-finding
  quality vs competitors, after changing reviewers/handlers/dispatch/prompts, or to
  continue the optimization loop from the last versioned experiment.
---

# scr-benchmark-optimizer

The discipline that keeps `skill-code-review` measurably better than competing AI
code reviewers. A closed loop: **measure (via the product) → judge consistently →
diagnose → improve → re-measure → record a versioned experiment → compare.** Never
stop on a regression; never apply an unproven heuristic; never change the SET or
STRUCTURE of `reviewers.wiki` without explicit human confirmation.

## The benchmark and what "winning" means

`withmartian/code-review-benchmark` (MIT): 50 bug-fix PRs across 5 repos
(Sentry/py, Grafana/go, Cal.com/ts, Discourse/rb, Keycloak/java), ~136
human-verified golden comments, and committed competitor candidate sets judged by
three models. The judge rule: a finding is a **true positive** only if it matches a
golden; **every non-golden finding is a false positive** (a deliberately harsh
precision metric). So the goal is the **precision-recall frontier**: catch the
goldens (recall) while emitting few non-golden findings (precision).

**The real bar is the FULL 50, not a sub-slice.** Committed full-50 leaderboard
(Opus-4.5 judge), top tools:

| tool | recall | precision | F1 |
|---|---|---|---|
| **cubic-v2** | 0.69 | 0.56 | **0.62** |
| qodo-extended-v2 | 0.61 | 0.55 | 0.58 |
| augment | 0.61 | 0.47 | 0.54 |
| macroscope | 0.44 | 0.48 | 0.46 |
| bugbot | 0.44 | 0.47 | 0.45 |
| greptile-v4-1 | 0.48 | 0.40 | 0.44 |
| coderabbit (full) | ~0.40 | ~0.35 | ~0.40 |

**Cubic is the leader at F1 0.62 — and it is NOT a precision wizard:** ~3.5
findings/PR (mid-pack), and it carries false positives too. Its edge is *framing
accuracy* on the golden distribution. Beating "all competitors" means **F1 > 0.62
on the full 50**, on the frontier (don't trade all recall for precision).

> Do NOT chase the 5-PR pilot number. The pilot (one PR/repo) is a **Cubic-favorable
> slice** where Cubic scores ~0.83; the full 50 is the honest 0.62. Optimize for the
> full set.

## Current standing (measured, honest)

Reviews run through the product runner with `--backend claude`. Measured on the
**5-PR pilot** (small, noisy, Cubic-favorable):

- baseline → **iter1**: F1 0.46 → **0.64** (precision 0.33 → 0.57, recall held 0.73)
  via the Cubic-conservative ranker + general specialist recall heuristics.
- iter2/iter3: principled refinements (lost-update = primary; observability defect =
  primary; distinct null-deref findings) net-flat on the pilot — **the 5-PR signal is
  noise-bound** (ranker is stochastic; run-to-run F1 swings ±0.05-0.1, rivalling the
  tuning deltas).
- Specialist **recall ceiling 0.82** (9/11 goldens found); skill-prod-primary is #2
  behind Cubic and ahead of coderabbit/copilot/greptile/bugbot.

**The full-50 number is the open question** — the pilot is too small/favorable to
declare "beat all". A full-50 run is gated on human go-ahead (it crosses the locked
5-repo pilot scope and is token-heavy).

## The harness (gitignored, under `skill-code-review/tmp/`)

The benchmark harness lives INSIDE the skill repo at `skill-code-review/tmp/`
(gitignored) — it travels with the skill it benchmarks. Reviews are driven by the
**product**, not a throwaway orchestrator. `tmp/` holds **only benchmark DATA**
(regenerable, safe to delete); every durable harness/driver script lives in the
tracked `skill-code-review/scripts/` dir (NOT in `tmp/`, NOT in the `code_review`
package). **Every output dir is run-id + pr-shard nested** (`shard` = first 2 hex of
`sha256(pr_id)`) so no directory ever accumulates thousands of entries (filesystem
bottleneck) — `scripts/paths.py` is the single source of the layout; all driver
scripts import it. A `run-id` is one variant/iteration (`default`/`prod`/
`iter1`/…). Layout:

- `tmp/repos/<ab>/<pr>/` — materialised repo (shared across runs); `scripts/setup_repo.py`
  writes here at the **merge-base** diff (`base_diff` from `bench-index.json`; use
  `git merge-base(base,head)`, NEVER `baseRefOid..head` — OBSERVATIONS #8).
- `tmp/runs/<run-id>/<ab>/<pr>/` — one review's output (its `.skill-code-review/<yyyy>/
  <mm>/<dd>/<ab>/<rest5>/` tree + `run.log`).
- `tmp/judge/<run-id>/<ab>/<pr>.json` (+ `_input_<pr>.json`) — judge verdicts/inputs.
- `tmp/results/<run-id>/` — per-run leaderboard/metrics. `bench/` — benchmark clone.
- `scripts/build_judge_input_prod.py <pr> <run-id>` — extract candidates (skill-prod /
  skill-prod-primary / skill-prod-scoped) + competitor sets → `judge/<run-id>/<ab>/
  _input_<pr>.json`.
- `scripts/score.py <run-id>` — aggregate per-(PR,tool) verdicts → `results/<run-id>/`.
- `scripts/rerank.py <pr> <src-run-id> <out-run-id>` — **fast ranker-only loop**: re-run
  the product's `rank_findings` worker on an existing review's findings (isolates a
  finding-ranker.md change without re-rolling specialists; ~1 call/PR).
- `scripts/migrate_tmp.py` — one-shot migrator to this layout (idempotent, `--apply`).
- `results/PROD-REPORT.md` — the leaderboard + analysis. `OBSERVATIONS.md` — every
  bug/friction/finding with a ✅/🛠️/⏳/➖ status board.

## Running a review (the product, every time)

```bash
cd skill-code-review
export GITHUB_TOKEN="$(gh auth token)"          # specialists/workers read the repo
export CTXR_SCR_CALL_TIMEOUT=600                 # per-agent-call ceiling (env-tunable)
uv run python -m code_review.cli review \
  --repo tmp/repos/<ab>/<pr> --base <base_diff> --head <head> \
  --run-dir tmp/runs/<run-id>/<ab>/<pr> --backend claude --max-workers 8 --clean
# (compute <ab>/<pr> paths via scripts/paths.py: repo_dir(pr) / run_dir(run_id, pr))
```

`--backend` is agent-agnostic (`claude` | `codex` | `cursor` | `anthropic` |
`openai`). `--clean` wipes the run dir's `.skill-code-review` for a fresh,
cache-free run. The runner drives the FSM in-process with an adaptive thread pool;
worker + specialist calls are fault-tolerant (retry/backoff, graceful degradation).

## The loop (one iteration)

1. **Measure.** Run the product CLI over the PR set (5-PR pilot to iterate; full 50
   to declare). 100% diff coverage: every changed file is sharded into specialist
   units. Stays fault-free (see robustness below).
2. **Judge once, consistently.** `build_judge_input_prod.py` per PR, then judge
   (one model = the session, Martian rule) into `judge/<variant>_<pr>.json`. Reuse
   committed competitor verdicts (same judge model) for apples-to-apples.
3. **Diagnose.** Per PR, which goldens were MISSED (recall loss → specialist depth or
   leaf coverage) and which non-goldens were marked `primary` (precision loss →
   ranker). Distinguish "real bug outside the golden set" (benchmark incompleteness)
   from "noise" (genuine over-reporting).
4. **Improve.** Edit the right layer (see Levers). Gate green (ruff + mypy + pytest).
5. **Re-measure + record.** For a ranker-only change, use `rerank.py` (fast) and
   average ≥3 rounds (the ranker is stochastic). For a specialist/routing change,
   re-run the full review. Record a versioned result; keep only changes that move the
   frontier; else revert.
6. **Escalate if blocked.** If the only remaining gain needs a different reviewer SET
   or STRUCTURE (a COVERAGE problem), STOP and propose a `reviewers.wiki` change
   (proven statistical methods only) for human confirmation — and follow the
   `scr-reviewers-wiki-authoring` skill.

## Where to optimize (levers, by symptom)

- **Precision (too many non-golden primaries):** `workers/finding-ranker.md`. Make
  `primary` the block-this-PR set; demote real-but-secondary findings (defensive
  hardening, load/cost-only perf, no-test/magic-number) to advisory. Keep CONCRETE
  correctness/security bugs primary even when edge-case. The ranker emits compact
  per-index decisions; the runner re-attaches scores (`dispatch._apply_rank_decisions`).
- **Recall (a golden no specialist surfaced):** `workers/specialist.md`. Add GENERAL
  bug-hunting heuristics (unset/missing-state null-deref; external-tool argument
  format/units; shadowed/duplicate definitions; cache-recursing-through-self). Emit
  ONE finding per distinct root cause — never bundle a None-deref with a KeyError.
- **Routing (right leaves not picked):** `workers/tree-descender.md` /
  `trim-candidates.md` (metadata-only, no file reads) — and leaf `focus`/`activation`
  in the wiki (the `scr-reviewers-wiki-authoring` skill). Beware broad `**/*` globs:
  they over-activate and bias routing toward generic leaves.
- **Coverage (no leaf exists for a bug class):** a reviewers.wiki change — human-gated.

## Architecture contract (baked into the product)

1. **100% coverage, always.** The dispatch loop shards EVERY changed file into units
   — 10 files or 1000, review them all; a failed unit is a `status: failed` row, not
   a lost file.
2. **Regulated parallelism.** `runner.py` dispatches specialists through an adaptive
   `ThreadPoolExecutor` (AIMD: halve workers on rate-limit, +1 on success, bounded).
3. **Deterministic, big-data-safe collection.** `collect_findings` is pure Python;
   per-leaf findings are persisted and merged algorithmically — never one giant agent
   context.
4. **Two-stage dedup.** Deterministic location + embedding/token clustering, then a
   neutral **ranker/deduper agent** adjudicates residual duplicates (compact
   decisions only). Never silently merge distinct bugs.
5. **Never overflow context.** Worker inputs are compacted (heavy leaf fields stripped
   for the prompt, rehydrated by id afterward); overflow sub-shards and retries.
6. **Fault tolerance.** Worker AND specialist calls retry rate-limit/overflow with
   backoff; an empty/unparseable agent reply is retryable; best-effort stages (e.g.
   `tool_discovery`) DEGRADE instead of faulting; null optional fields are stripped
   before schema validation. A flaky routing worker can never zero a review (the
   deterministic coverage floor).
7. **Sharper specialists, neutral ranker.** Specialists favor recall (report every
   plausible defect with a `confidence`); the ranker is the precision gate
   (`primary` selection). Selectivity, not suppression — demote, don't drop.
8. **Agent-agnostic + prompt-externalised.** All prompts live in `workers/*.md`
   (never hardcoded in Python); any backend (claude/codex/cursor/api) works.
9. **Wiki structure is human-gated.** Mechanical FSM/dispatch/prompt changes are
   free. Any change to the SET or STRUCTURE of `reviewers.wiki` needs a written,
   statistically-justified proposal and human confirmation — see
   `scr-reviewers-wiki-authoring`.
10. **Versioned experiments.** Every run is recorded with headline stats; compare
    across versions; update `OBSERVATIONS.md` status checkmarks.

## Hard-won lessons (do not regress these)

- **Drive reviews ONLY through the product** (`cli.py` / `runner.py`). Never build a
  parallel review orchestrator in `tmp/`. tmp holds DATA + MEASUREMENT only.
- **Keep all prompts in `workers/*.md`.** Read them; never inline prompt text in
  Python.
- **Worker inputs must not be truncated.** Truncating `activated_leaves` at a char
  cap cut the array mid-list and silently dropped the alphabetically-late
  (lang-/sec-/footgun-/crypto-) leaves → only generic antipatterns routed. Compact
  per-leaf (drop `covers`/`audit_surface`), never truncate the SET.
- **Routing workers decide from metadata, not files.** An agentic wiki-file-reading
  tree-descender/tool-runner is 6-8 min and times out; reading the brief metadata is
  ~1 min.
- **The ranker is stochastic.** At 5 PRs the noise rivals the deltas — average ≥3
  rounds (use `rerank.py`) and prefer the full 50 for a stable signal. Don't add
  per-golden rules to chase the pilot: that is over-fitting.
- **Many "false positives" are real bugs outside the golden set.** Audit before
  suppressing; don't make the product worse to game an incomplete golden set.

## Before any commit to skill-code-review

```bash
uv run ruff check code_review/ tests/
uv run mypy code_review/
uv run pytest
```

All three must pass. A `reviewers.wiki` change additionally requires the
human-confirmed proposal and the `scr-reviewers-wiki-authoring` build/validate flow.
