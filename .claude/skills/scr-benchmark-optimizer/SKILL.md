---
name: scr-benchmark-optimizer
version: 3.0.0
description: >
  Self-improvement loop for skill-code-review: benchmark it against competing AI
  code reviewers on the open Martian offline-50 set, then drive its bug-finding
  quality UP (recall and F1) and its review latency DOWN through a strictly gated
  experiment loop. Reviews run through the PRODUCT runner; the tracker is
  benchmarks/experiments.db (queried via benchmarks/experiments.py); every change is
  ONE attributable lever, proven by the EXACT 5-gate PROMOTE predicate over N rounds
  before it is tagged. Never stop the PROGRAM on a regression: revert the CHANGE and
  record a negative. Nothing is pushed until the USER authorizes it. This is a client
  reference; the canonical skill lives under .agents/skills/.
audience: ai-agents
---

# scr-benchmark-optimizer (Claude client reference)

**Canonical skill:** [`../../../.agents/skills/scr-benchmark-optimizer/SKILL.md`](../../../.agents/skills/scr-benchmark-optimizer/SKILL.md)

This `.claude/skills/` copy exists so the Claude client discovers the skill. Always
read and follow the canonical file above, it is the single source of truth for the
gated optimization loop and stays in lockstep with
[`docs/plans/beating-competitors.md`](../../../docs/plans/beating-competitors.md)
section 6 and the [`benchmark-dev-loop`](../../rules/benchmark-dev-loop.md) rule. The
canonical file owns: the tracker (`benchmarks/experiments.db` via
`benchmarks/experiments.py`: record, ci, gate, compare, state, status, slowest, check);
the EXACT 5-gate PROMOTE predicate (GATE-1 recall floor at delta-CI minus 0.03, GATE-2
fp/PR ceiling plus 0.30, GATE-3 paired delta-F1 CI strictly above 0, GATE-4 stdev plus
0.02, GATE-5 cost at most 1.25x); lever-typed N (ranker-only N=5 via `scripts/rerank.py`,
full-run N=3); the dead-ends ledger (never re-walk a failed hypothesis at the same or
smaller PR set); the proof-before-scale ramp; the generated `benchmarks/STATE.md`
you-are-here surface; DOGFOOD (the product reviews its own code changes), NO-PUSH (the
user is the gate), and ULTRACODE intensity; the architecture principles (100% coverage,
ThreadPoolExecutor parallelism, deterministic collection + neutral ranker/deduper agent,
fault tolerance, agent-agnostic dispatch, human-gated wiki changes); how to drive reviews
through the product CLI; the harness layout under `skill-code-review/tmp/`; and the
hard-won lessons. The rule of the loop: never stop the PROGRAM on a regression, always
revert the CHANGE and record a negative.

Sibling client folders (create the same one-file reference when those clients are
used): `.codex/skills/`, `.cursor/skills/`, `.windsurf/skills/`, `.gemini/skills/`.
