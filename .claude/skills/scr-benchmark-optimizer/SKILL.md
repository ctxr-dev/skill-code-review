---
name: scr-benchmark-optimizer
version: 2.0.0
description: >
  Self-improvement loop for skill-code-review: benchmark vs competitors on the
  open Greptile/Martian set (real bar = full-50 Cubic F1 0.62) and apply proven
  optimizations until it sits on the precision-recall frontier (high coverage AND
  low noise). Reviews run through the PRODUCT runner. This is a client reference;
  the canonical skill lives under .agents/skills/.
audience: ai-agents
---

# scr-benchmark-optimizer (Claude client reference)

**Canonical skill:** [`../../../.agents/skills/scr-benchmark-optimizer/SKILL.md`](../../../.agents/skills/scr-benchmark-optimizer/SKILL.md)

This `.claude/skills/` copy exists so the Claude client discovers the skill.
Always read and follow the canonical file above — it is the single source of
truth for the optimization loop, the architecture principles (100% coverage,
ThreadPoolExecutor parallelism, deterministic collection + neutral ranker/deduper
agent, fault tolerance, agent-agnostic dispatch, human-gated wiki changes), how to
drive reviews through the product CLI, the harness layout under
`skill-code-review/tmp/`, and the current standing vs competitors.

Sibling client folders (create the same one-file reference when those clients are
used): `.codex/skills/`, `.cursor/skills/`, `.windsurf/skills/`, `.gemini/skills/`.
