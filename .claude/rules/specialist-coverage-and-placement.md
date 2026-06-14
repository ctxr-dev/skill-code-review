# Specialist Coverage & Placement (Claude client reference)

> **SCOPE:** Applies when DEVELOPING skill-code-review itself, during any benchmark or
> dogfood review cycle. If this skill is installed inside another project, ignore this
> rule there.

**Canonical rule:** [`../../.agents/rules/specialist-coverage-and-placement.md`](../../.agents/rules/specialist-coverage-and-placement.md)

This `.claude/rules/` copy exists so the Claude client discovers the rule. Read and
follow the canonical file above, it is the single source of truth. MANDATORY in every
skill-code-review development cycle. In brief:

- **A missed case with no owning specialist means WRITE one.** When a benchmark PR or
  dogfood review misses a real defect because no focused specialist covers that class,
  author a new specialist (or correct a low-quality one that mis-frames the pattern).
  Never route around it, down-rank it, or record it as a dead-end.
- **Generalize, never over-fit.** Encode the CLASS of defect (general mechanism,
  heuristics, Common False Positives), not the single golden. A leaf that only fires on
  the exact problem PR games the metric and is rejected.
- **Control-verify on the problem PR.** Probe the specialist in isolation first (a
  routing/ranking fix cannot fix a specialist-analysis miss), then run a control review
  confirming the miss is now caught AND the five-codebase no-regression gate holds.
- **Place it correctly via frontmatter.** New specialists land in the right wiki node
  by FRONTMATTER (id prefix, type, dimensions, tags, covers, escalation_from) resolved
  against `reviewers.layout.yaml` pins, authored in `reviewers.src/` and rebuilt, never
  hand-placed. A new prefix needs a layout pin first. If an existing specialist is
  mis-allocated (not descended to when it should be), fix its frontmatter so the layout
  routes it correctly, then rebuild + drift-check: mis-placement silently costs recall.
