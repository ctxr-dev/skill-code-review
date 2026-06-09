# Benchmark Dev Loop (Claude client reference)

> **SCOPE:** Applies when DEVELOPING skill-code-review itself, while running the
> Martian benchmark program on `feat/martian-benchmark-program`. If this skill is
> installed inside another project, ignore this rule there.

**Canonical rule:** [`../../.agents/rules/benchmark-dev-loop.md`](../../.agents/rules/benchmark-dev-loop.md)

This `.claude/rules/` copy exists so the Claude client discovers the rule. Read and
follow the canonical file above, it is the single source of truth, and it stays in
lockstep with [`docs/plans/beating-competitors.md`](../../docs/plans/beating-competitors.md)
section 6 and the [`scr-benchmark-optimizer`](../skills/scr-benchmark-optimizer/SKILL.md)
skill. In brief:

- **Dogfood.** Every CODE change is reviewed by the product itself before acceptance,
  in order: (a) ruff + mypy + pytest green, (b) run the product reviewer
  (`python -m code_review.cli review`) on the diff and address its findings, (c) the F1
  5-gate benchmark. Pure docs/markdown edits skip the product-review step (green gate
  still applies).
- **No push, user is the gate.** No `git push`, no PR, no merge, no touching `main`
  until the number-1 goal is reached AND the user personally authorizes it. All work
  stays local on `feat/martian-benchmark-program`.
- **Gated experiment loop.** One lever per round; the 5-gate PROMOTE predicate (GATE-1
  recall floor at delta-CI minus 0.03, GATE-2 fp/PR ceiling plus 0.30, GATE-3 paired
  delta-F1 CI strictly above 0, GATE-4 stdev plus 0.02, GATE-5 cost at most 1.25x);
  dead-ends ledger (never re-walk a failed hypothesis at the same or smaller PR set);
  proof-before-scale ramp; `benchmarks/STATE.md` is the generated you-are-here surface;
  reviews run only through the product runner, tracked in `benchmarks/experiments.db`.
- **Ultracode.** All code-or-thinking subagent work runs at ultracode intensity
  (parallel deep work plus adversarial verification, nested flows allowed); the
  conductor stays organizational and delegates.
