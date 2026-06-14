# Specialist Coverage & Placement (MANDATORY)

> **SCOPE:** Applies when DEVELOPING skill-code-review itself, during any benchmark
> or dogfood review cycle. If this skill is installed inside another project, ignore
> this rule there.

This rule is MANDATORY in every skill-code-review development cycle. The reviewer
corpus IS the product. A real defect that gets MISSED because no focused specialist
owns that case is a corpus gap to FIX, never a dead-end to record and walk past, and
never something to paper over with a routing, ranking, or coverage-floor workaround.

## 1. A missed case with no owning specialist means WRITE one (always)

When reviewing the benchmark PRs (the gold set we use to compare the skill against
competitors) or dogfooding the product, if a genuine defect is missed because there is
no focused specialist for that class of bug:

- **Write the specialist. Every time.** Do not route around it, do not down-rank it,
  do not file it as a dead-end. A missing specialist is a fixable corpus defect.
- This covers BOTH cases:
  - **Absent specialist:** author a NEW leaf for the uncovered class.
  - **Low-quality specialist:** an existing leaf activates and runs but mis-frames or
    misses the pattern (e.g. a recursion leaf reading a facade self-call as a mere
    N+1). CORRECT its body so the specialist recognizes the case. (See also the
    self-improvement lesson: a routing/activation pin can only recover a routing loss,
    not a specialist-analysis miss.)

## 2. Generalize the specialist, never over-fit

- Write for the CLASS of defect, not the single benchmark golden. Encode the general
  mechanism, the bug-hunting heuristics, and the conditions that distinguish the real
  defect from look-alikes, plus an explicit "Common False Positives" section, so the
  specialist catches the FAMILY across languages and frameworks.
- A leaf tuned to fire only on the exact problematic PR is an OVER-FIT and is
  rejected: it games the strict-golden metric instead of making the product better.
  Encode general review principles, not per-benchmark-golden rules.

## 3. Prove it with a CONTROL review on the problematic PR

- After writing or correcting the specialist, prove it actually closed the miss.
  PROBE the specialist in ISOLATION first (run only that specialist on the problematic
  PR diff, improved vs baseline): a specialist-analysis miss cannot be fixed by routing
  or ranking, so confirm the leaf body itself now makes the specialist emit the finding.
- Then run a CONTROL review on the problematic PR and confirm the previously-missed
  defect is now caught, AND the HARD no-regression gate still holds on all five
  benchmark codebases (cal.com-14943, discourse-1, grafana-80329, keycloak-32918,
  sentry-67876): recall/coverage up-or-equal AND false-positives-per-PR down-or-equal
  vs the recorded baseline. If either axis regresses, do not promote.

## 4. Place it in the PROPER wiki structure (frontmatter-driven)

A specialist only helps if the orchestrator can descend to it. Placement is part of
the fix, not an afterthought.

- A NEW specialist MUST land in the correct node of the wiki taxonomy, and placement is
  DETERMINED BY FRONTMATTER (id prefix, `type`, `dimensions`, `tags`, `covers`,
  `escalation_from`) resolved against the layout pins in `reviewers.layout.yaml`, never
  by hand. Author in `reviewers.src/`, choose the id prefix and frontmatter so the
  deterministic layout pins the leaf into the right category, rebuild the wiki via
  `skill-llm-wiki`, and pass `scripts/validate_layout.py` + `scripts/check_wiki_drift.py`.
  Never hand-place a leaf or hand-edit the generated `reviewers.wiki/`.
- If the class needs a NEW id prefix, add the layout pin FIRST (an unpinned leaf is
  rejected by the layout contract).
- If you find an EXISTING specialist MIS-ALLOCATED (descended under the wrong
  category, cluster, or parent, so it is not reached when it should be), treat that as
  a recall bug and FIX it: adjust its frontmatter smartly (id prefix, `type`,
  `dimensions`, `tags`, `covers`, `escalation_from`) so the deterministic layout routes
  it to the correct place, then rebuild + drift-check + re-run the no-regression gate.
  Mis-placement silently costs recall, so correcting it is first-class work.

## Mandatory close-out

A development cycle that surfaces a missed defect with no proper owning specialist is
NOT done until the gap is closed: specialist written or corrected, generalized (no
over-fit), control-verified on the problem PR, and placed (or re-placed) correctly via
frontmatter. Use the
[`scr-reviewers-wiki-authoring`](../skills/scr-reviewers-wiki-authoring/SKILL.md) skill
for the authoring mechanics; this rule sits alongside
[`docs-and-wiki-stewardship`](docs-and-wiki-stewardship.md) (corpus stewardship and the
no-regression gate) and [`benchmark-dev-loop`](benchmark-dev-loop.md) (the gated
experiment loop).
