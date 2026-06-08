---
name: scr-reviewers-wiki-authoring
version: 1.0.0
description: >
  How to extend skill-code-review's reviewer corpus (reviewers.wiki) without
  degrading it: when a leaf is warranted, the v2 frontmatter contract and what each
  field drives (routing / specialist / ranker), activation + body authoring for
  recall AND precision, the deterministic skill-llm-wiki build/validate/promote flow,
  conventions, and the benchmark-proven lessons. Human-gated; never hand-edit the
  generated wiki. This is a client reference; the canonical skill lives under
  .agents/skills/.
audience: ai-agents
---

# scr-reviewers-wiki-authoring (Claude client reference)

**Canonical skill:** [`../../../.agents/skills/scr-reviewers-wiki-authoring/SKILL.md`](../../../.agents/skills/scr-reviewers-wiki-authoring/SKILL.md)

This `.claude/skills/` copy exists so the Claude client discovers the skill. Always
read and follow the canonical file above — it is the single source of truth for the
two-layer corpus (`reviewers.src/` authored, `reviewers.wiki/` generated), the v2
frontmatter contract and what each field drives, activation rules (specific globs,
never `**/*`), leaf-body authoring (bug-hunting heuristics, distinct findings,
common false positives), id/severity/dimensions conventions, the deterministic
build → validate → promote flow via the sibling `../skill-llm-wiki/`, and the
human-gated, benchmark-verified discipline that keeps the corpus from degrading.

Sibling client folders (create the same one-file reference when those clients are
used): `.codex/skills/`, `.cursor/skills/`, `.windsurf/skills/`, `.gemini/skills/`.
