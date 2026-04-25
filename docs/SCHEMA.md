# Reviewer Source File Schema

Every `.md` file in `reviewers.src/` must conform to this schema.

## Frontmatter (YAML)

```yaml
---
id: <kebab-case, matches filename without .md>
type: universal | conditional | overlay
tier: 1 | 2 | 3                    # 1=always-run, 2=signal-driven, 3=escalation-only
focus: <one sentence — narrowest possible scope>
dimensions:                         # subset of the 7 review dimensions
  - correctness
  - security
  - performance
  - tests
  - readability
  - architecture
  - documentation
covers:                             # 3–15 granular bullets (used for similarity matching)
  - "..."
audit_surface:                      # 10–20 high-signal review items
  - "..."
languages: [<list> | all]           # which languages this reviewer applies to
tags: [<topical tags>]              # for TF-IDF routing
last_reviewed: <YYYY-MM-DD>         # freshness tracking
activation:                         # how the orchestrator decides to load this reviewer
  file_globs: ["**/*.py", ...]
  keyword_matches: [...]
  structural_signals: [...]
  escalation_from: [<reviewer-ids>] # tier 3 only
tools:                              # optional external linters / SAST
  - name: <tool-name>
    command: <exact command>         # optional
    purpose: <what it checks>
---
```

## Body Sections (required, in order)

```markdown
# <Title>

## When This Activates
<!-- Tiny section, always loaded by the orchestrator -->

## Audit Surface
<!-- 10–20 high-signal checklist bullets, always loaded -->

## Detailed Checks
<!-- H3 sub-sections, loaded selectively based on diff content -->
<!-- Each H3 may carry activation hints in HTML comments -->

### <Topic 1>
<!-- activation: file_globs=["..."], keywords=["..."] -->

### <Topic 2>
...

## Common False Positives
<!-- Always loaded — helps calibrate reviewer confidence -->

## Severity Guidance
<!-- Always loaded — maps findings to severity levels -->

## See Also
<!-- Always loaded — cross-references to related reviewers -->

## Authoritative References
<!-- Always loaded — external links only -->
```

## Body Length Contract

| Tier | Max lines | Max audit_surface bullets | Max H3 sub-sections |
|------|-----------|---------------------------|---------------------|
| 1    | 200       | 12                        | 4                   |
| 2    | 500       | 20                        | 8                   |
| 3    | 800       | 25                        | 12                  |

Reviewers exceeding these limits fail validation.
