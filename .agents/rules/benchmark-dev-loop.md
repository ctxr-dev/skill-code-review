# Benchmark Dev Loop (dogfood, no-push, gated experiment, ultracode)

> **SCOPE:** Applies when DEVELOPING skill-code-review itself, specifically while
> running the Martian benchmark optimization program on the
> `feat/martian-benchmark-program` branch. If this skill is installed inside another
> project, ignore this rule there.

These are non-negotiable so the optimization program stays attributable, honest, and
local: every code change is reviewed by the product itself, nothing leaves the machine
until the user says so, and every experiment moves one lever under a fixed predicate.
The decided methodology lives in [`docs/plans/beating-competitors.md`](../../docs/plans/beating-competitors.md)
section 6 and in the [`scr-benchmark-optimizer`](../skills/scr-benchmark-optimizer/SKILL.md)
skill; this rule is the followable essence and it MUST stay in lockstep with both (a
change to the loop updates all three in the SAME commit).

## Dogfood (the product reviews its own code)

Every CODE change to skill-code-review (Python under `code_review/`, `scripts/`, or
`tests/`) must be reviewed by skill-code-review ITSELF before acceptance. The dev gate
runs in this fixed order per experiment, and a later stage never starts until the
earlier one is satisfied:

1. **Green first.** `uv run ruff check code_review/ tests/` plus `uv run mypy
   code_review/` plus `uv run pytest`, all green. A broken product can not review, so
   nothing downstream runs until this passes.
2. **Dogfood.** Run the PRODUCT reviewer on the diff
   (`python -m code_review.cli review`) and ADDRESS its findings. The reviewer the
   program is sharpening is the same reviewer that guards the program's own code.
3. **The F1 5-gate benchmark** (below). Quality and speed levers alike clear the same
   predicate.

Order is load-bearing: green, then dogfood, then benchmark. The dogfood step targets
CODE (Python). Pure docs or markdown edits (this rule, plans, READMEs, reviewer prose
that is not code) are EXEMPT from the product-reviewer step, but the green gate
(ruff, mypy, pytest) still applies and still must pass before commit.

## No push, the user is the gate

Nothing is pushed to the remote until the program reaches its number-1-AI-code-reviewer
goal AND the USER personally authorizes the push. Concretely, while this program runs:

- NO `git push`, NO PR opened, NO merge, NO change to `main`.
- All work stays local on `feat/martian-benchmark-program`. Commits and tags are local.
- The user is the only gate that converts local proven work into a remote artifact. Do
  not infer authorization from a green benchmark or a banked win: the win unlocks the
  ASK, the user's explicit yes unlocks the push.

## The gated experiment loop

One change per round, proof before scale, a never-stale state surface. The full
predicate, statistics, and ramp rules are section 6 of the plan; the followable essence:

- **One change per round.** A round moves a SINGLE attributable lever (ranker OR
  specialist OR routing OR one threshold OR one corpus batch, never two). The diff is
  attributable to one logical change; no "while I am here" bundling.
- **The 5-gate PROMOTE predicate.** Let B be the baseline measurement and C the
  candidate, each N rounds, paired bootstrap deltas over PRs. Promote iff ALL hold:
  - GATE-1 RECALL non-regression: `mean(recall_C) >= mean(recall_B)` AND
    `lower-95%-CI(recall_C - recall_B) >= -0.03`.
  - GATE-2 NOISE non-regression: `mean(fp_per_pr_C) <= mean(fp_per_pr_B)` AND
    `upper-95%-CI(fp_per_pr_C - fp_per_pr_B) <= +0.30`.
  - GATE-3 PROGRESS (the teeth): `lower-95%-CI(F1_C - F1_B) > 0` (the paired delta-F1
    CI strictly excludes 0).
  - GATE-4 STABILITY: `stdev(F1_C over N) <= stdev(F1_B) + 0.02`.
  - GATE-5 COST guard: `mean($/review_C) <= 1.25 * mean($/review_B)`.

  GATE-1 is the hard recall floor: a speed change that regresses recall outside its CI
  reverts the instant it does so, no matter how much latency it saved. Speed never
  trades away recall (latency is reported as a first-class metric on the row but it is
  OUT of the predicate). All green promotes; GATE-1/2/4/5 red reverts; only GATE-3
  straddling 0 is inconclusive (revert, retry at the next rung).
- **The dead-ends ledger.** Every measurement, pass or fail, writes a row. A failed
  hypothesis is NEVER re-walked at the same or smaller PR set: before starting a round,
  check the ledger and pick another lever if a matching dead-end exists at this rung or
  smaller. Inconclusive (GATE-3 only) records a retry at the next rung; a genuine
  regression records no retry.
- **Proof-before-scale ramp.** Grow the PR set (5, then 10, 15, 20) ONLY after a
  tagged, CI-separated win is banked at the current rung. The PR set is frozen during a
  round; ramping is a separate gated step and never rolls the PR set backward (more PRs
  is always more honest).
- **The you-are-here surface.** `benchmarks/STATE.md` is GENERATED from the DB (never
  hand-edited, same discipline as the generated wiki); it is the live position, read it
  instead of trusting memory. The tracker is `benchmarks/experiments.db`.
- **One runner only.** Reviews run ONLY through the product runner
  (`code_review/cli.py` plus `runner.py`); never a throwaway or parallel review
  orchestrator. The tracker of record is `benchmarks/experiments.db`.

## Ultracode intensity

All code-or-thinking subagent work on this program runs at ULTRACODE intensity:
parallel deep work plus adversarial verification, with nested flows allowed (a worker
may spawn its own verified sub-flow). The CONDUCTOR stays organizational: it
decomposes, delegates, and integrates, it does not do the deep work inline. This keeps
every lever both explored hard and checked hard before it touches the gate.

## Before any commit

`uv run ruff check code_review/ tests/` plus `uv run mypy code_review/` plus
`uv run pytest`, all green. Code changes additionally require the dogfood product-review
pass (above) with its findings addressed; quality or speed levers additionally require
the 5-gate predicate green and a tagged, recorded experiment row. Nothing is pushed
until the user authorizes it (above).
