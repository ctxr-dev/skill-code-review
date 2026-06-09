---
name: scr-scripts
version: 1.0.0
description: >
  Index + cookbooks for skill-code-review/scripts/ (durable dev tooling for the
  reviewer corpus + benchmark harness; not part of the code_review package). For
  every script: what/when/why/how + the exact sequence it belongs in. This is a
  client reference; the canonical skill lives under .agents/skills/.
audience: ai-agents
---

# scr-scripts (Claude client reference)

**Canonical skill:** [`../../../.agents/skills/scr-scripts/SKILL.md`](../../../.agents/skills/scr-scripts/SKILL.md)

This `.claude/skills/` copy exists so the Claude client discovers the skill. Read
and follow the canonical file above, it is the single source of truth for what
every script in `skill-code-review/scripts/` does, when/why to run it, its exact
invocation, and the cookbooks (regenerate the wiki, recover reviewers.src, backfill
v2 frontmatter, run/score a benchmark iteration, fast ranker tuning, add a leaf).
`scripts/` = durable tracked tooling; `tmp/` = regenerable data; neither is part of
the `code_review` runtime package. Keep the canonical index current when adding a
script.

Sibling client folders (create the same one-file reference when those clients are
used): `.codex/skills/`, `.cursor/skills/`, `.windsurf/skills/`, `.gemini/skills/`.
