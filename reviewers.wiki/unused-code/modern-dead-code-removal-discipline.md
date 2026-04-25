---
id: modern-dead-code-removal-discipline
type: primary
depth_role: leaf
focus: Detect dead code removal discipline failures where identified dead code is not removed promptly, removal is mixed with feature changes, feature flags are not cleaned up, dead dependencies linger, unused database artifacts remain, or commented-out code is preserved
parents:
  - index.md
covers:
  - Dead code identified in review or tooling but not removed in the same or follow-up PR
  - Dead code removal mixed with unrelated feature changes in the same PR
  - Feature flags not cleaned up after full rollout -- both flag checks and dead branches remain
  - Dead dependencies listed in manifest but no code imports them
  - Unused database columns, tables, or indexes not scheduled for removal
  - Commented-out code preserved instead of deleted
  - Deprecated APIs still present in codebase with no removal timeline
  - Dead test helpers, fixtures, or test utilities with no callers
  - Unused configuration keys in config files
  - Unused classes, modules, or packages that are still maintained and updated during refactorings
  - Dead feature flags that are always off with no rollout plan or removal timeline
  - Deprecated APIs or methods annotated as deprecated but with no scheduled removal date
  - Unused database tables or columns still present in migrations and schema definitions
  - "Unused dependencies in package manifests (package.json, pom.xml, Gemfile, requirements.txt)"
  - Commented-out code blocks preserved across multiple commits as insurance
  - Configuration blocks for decommissioned services, environments, or infrastructure
  - Test fixtures, helpers, or factories for features that have been deleted
  - Abstractions and extension points built for future use that never arrived
  - Unused environment variables defined in deployment configs but read by no code
  - Import aliases or re-exports for modules that no downstream consumer references
  - "Unused CI/CD pipeline stages, build targets, or Makefile rules for retired workflows"
  - Unreachable code after return, throw, break, or continue statements
  - Unused functions, methods, or classes with no call sites
  - Unused imports or require statements
  - Unused variables, parameters, or local declarations
  - Feature-flagged code where the flag is permanently off or the feature has been fully rolled out
  - Commented-out code blocks preserved as backup instead of relying on version control
  - Unused private methods that lost their last caller during a refactoring
  - Unused enum values or constants that no code path references
  - Unused type definitions, interfaces, or type aliases
  - Dead branches in conditionals where the condition is always true or always false
tags:
  - dead-code
  - removal
  - cleanup
  - discipline
  - feature-flags
  - dependencies
  - hygiene
  - refactoring
  - boat-anchor
  - dead-weight
  - unused
  - dispensable
  - yagni
  - maintenance-burden
  - anti-pattern
  - clean-code
  - unreachable
  - readability
  - performance
aliases:
  - antipattern-boat-anchor
  - smell-dead-code
activation:
  file_globs:
    - "*"
  keyword_matches:
    - deprecated
    - unused
    - dead
    - remove
    - cleanup
    - TODO
    - FIXME
    - flag
    - toggle
    - commented
    - legacy
    - obsolete
  structural_signals:
    - dead_code_detected
    - unused_import
    - unused_dependency
    - feature_flag_stale
source:
  origin: file
  path: modern-dead-code-removal-discipline.md
  hash: "sha256:4cdd5c8457d797a632f18769eb64b05e21ac75e1f480e40b6c30215ddf5ddcc8"
---
# Dead Code Removal Discipline

## When This Activates

Activates when diffs contain dead code identified by linters, reviewers, or annotations; when feature flags appear fully rolled out; when dependency manifests change; or when commented-out code is present. This reviewer does not just detect dead code (that is `smell-dead-code`), but enforces the **discipline** of removing it promptly, cleanly, and atomically. Dead code that is identified but tolerated becomes lava flow. This reviewer ensures that identification leads to removal in a timely, isolated, and complete manner.

## Audit Surface

- [ ] PR identifies dead code (via comment, review, or linter) but does not remove it
- [ ] Dead code removal PR includes unrelated feature additions or bug fixes
- [ ] Feature flag fully rolled out for 30+ days but flag check and old branch still in code
- [ ] Dependency in manifest file has no import or require in any source file
- [ ] Database migration adds column but no migration removes previously identified dead columns
- [ ] Commented-out code block of 3+ lines in production source
- [ ] Deprecated annotation or decorator on a function with no removal date or ticket
- [ ] Test file imports helper that has zero callers in any test
- [ ] Config key defined but not read by any code path
- [ ] Unused CSS classes, HTML templates, or static assets
- [ ] Dead feature branch merged but its code was already superseded
- [ ] Removal TODO older than 90 days without corresponding cleanup PR

## Detailed Checks

### Prompt Removal After Identification
<!-- activation: keywords=["dead", "unused", "unreachable", "TODO", "FIXME", "remove", "delete", "cleanup", "linter", "warning"] -->

- [ ] **Identified but not removed**: flag diffs where review comments, linter warnings, or TODO annotations identify dead code but the PR does not remove it and does not create a follow-up ticket -- dead code must be removed when identified or tracked for immediate removal
- [ ] **Removal deferred indefinitely**: flag TODO comments for dead code removal that are older than 90 days with no corresponding cleanup PR or ticket -- deferred removal is abandoned removal
- [ ] **New dead code introduced**: flag diffs that introduce new code that is immediately dead (unreachable statements, unused functions, unused parameters) -- dead code should not be added in the first place
- [ ] **Partial removal**: flag removal PRs that delete some dead code but leave related dead artifacts (tests for the removed code, config entries, documentation references) -- removal must be complete

### Isolation of Removal PRs
<!-- activation: keywords=["refactor", "cleanup", "remove", "delete", "feature", "fix", "add", "implement"] -->

- [ ] **Removal mixed with features**: flag PRs that combine dead code removal with new feature additions or bug fixes -- removal PRs should be atomic and self-contained so they can be reviewed, reverted, and bisected independently
- [ ] **Large removal PR without justification**: flag removal PRs that delete more than 1000 lines without a clear description of what was removed and why -- large deletions need review context to ensure nothing live was accidentally removed
- [ ] **Removal PR without test verification**: flag dead code removal that does not run the full test suite or verify that no tests break -- tests may have been the only callers, and their failure confirms the code was not actually dead

### Feature Flag Cleanup
<!-- activation: keywords=["flag", "feature", "toggle", "rollout", "experiment", "enabled", "disabled", "config", "isEnabled", "is_enabled"] -->

- [ ] **Stale feature flag**: flag feature flags that evaluate to the same value (always true or always false) in all environments for 30+ days -- the flag check, the dead branch, and the flag registration must all be removed
- [ ] **Partial flag cleanup**: flag removal of the feature flag check but not the dead code branch, or removal of the dead branch but not the flag registration -- cleanup must remove all three: the conditional, the dead branch, and the flag definition
- [ ] **Flag cleanup mixed with flag addition**: flag PRs that clean up one stale flag while adding a new one -- separate concerns to keep the PR reviewable
- [ ] **Experiment concluded but code remains**: flag A/B test or experiment code where the experiment has concluded (winner selected) but the losing variant's code and the experiment infrastructure remain

### Dependency and Artifact Cleanup
<!-- activation: keywords=["dependency", "package", "import", "require", "install", "devDependency", "migration", "column", "table", "index", "asset", "css", "template"] -->

- [ ] **Dead dependency in manifest**: flag dependencies listed in package.json, Cargo.toml, go.mod, Gemfile, requirements.txt, or equivalent that are not imported or required by any source file -- dead dependencies increase install time, attack surface, and maintenance burden
- [ ] **Dead dev dependency**: flag devDependencies for tools or libraries no longer referenced in test files, build scripts, or configuration -- dead dev dependencies slow CI and may have vulnerabilities
- [ ] **Unused database artifacts**: flag database columns, tables, or indexes identified as unused (no application code references them) without a removal migration scheduled -- unused schema artifacts waste storage and confuse developers
- [ ] **Dead static assets**: flag CSS files, images, templates, or other static assets not referenced by any code, HTML, or build configuration -- dead assets bloat deployments

### Commented-Out Code
<!-- activation: keywords=["//", "#", "/*", "*/", "<!--", "comment"] -->

- [ ] **Commented-out code blocks**: flag blocks of 3+ lines of commented-out code in production source files -- version control preserves history; commented-out code is dead code that pretends to be a comment
- [ ] **Commented-out code with "just in case" annotation**: flag commented-out code with annotations like "keep for reference," "might need later," or "just in case" -- this is the definition of a boat anchor; delete it and recover from version control if needed
- [ ] **Commented-out test cases**: flag commented-out test cases that hide gaps in test coverage -- either fix and re-enable the test or delete it with an explanation

## Common False Positives

- **Deprecated public API with external consumers**: public APIs marked deprecated cannot be removed until all external consumers have migrated. The deprecation annotation should include a sunset date and migration guide. Accept if these are present.
- **Feature flag in ramp-up**: a flag actively being ramped up (not yet at 100% in all environments) is not stale. Verify rollout status before flagging.
- **Optional dependencies**: some ecosystems support optional or peer dependencies that are not directly imported but are required at runtime by other packages. Verify the dependency relationship before flagging.
- **Database columns with external readers**: columns read by reporting tools, ETL pipelines, or data warehouses outside the application codebase may appear unused. Verify with data engineering before flagging.
- **Migration history**: database migration files are append-only history and should not be deleted even when they reference removed columns. Flag only the absence of a new removal migration, not the old migration file.

## Severity Guidance

| Finding | Severity |
|---|---|
| Dead code removal PR mixed with unrelated feature changes | Important |
| Feature flag fully rolled out 30+ days with dead branch still present | Important |
| Dead dependency in manifest with known vulnerability | Critical |
| Dead dependency in manifest (no known vulnerability) | Minor |
| Commented-out code block of 5+ lines in production source | Important |
| Removal TODO older than 90 days with no follow-up | Important |
| Partial flag cleanup (conditional removed but dead branch remains) | Important |
| New unreachable code introduced in diff | Important |
| Unused database column with no removal migration scheduled | Minor |
| Dead test helper with no callers | Minor |
| Commented-out single line of code | Minor |
| Dead CSS or static asset | Minor |

## See Also

- `smell-dead-code` -- detects dead code at the syntax and reference level; this reviewer enforces the discipline of actually removing it
- `antipattern-lava-flow` -- dead code that is not removed hardens into lava flow
- `antipattern-boat-anchor` -- commented-out code kept "just in case" is a boat anchor
- `principle-dry-kiss-yagni` -- YAGNI argues against keeping code that has no current consumer
- `principle-feature-flags-and-config` -- feature flag lifecycle includes cleanup after rollout

## Authoritative References

- [Martin Fowler, "Refactoring" (2nd ed., 2018), "Remove Dead Code"](https://refactoring.com/catalog/removeDeadCode.html)
- [Robert C. Martin, "Clean Code" (2008), Chapter 17: Smells and Heuristics -- Dead Function](https://www.oreilly.com/library/view/clean-code-a/9780136083238/)
- [Pete Hodgson, "Feature Toggles" on martinfowler.com -- Lifecycle section](https://martinfowler.com/articles/feature-toggles.html)
- [Tidy First? by Kent Beck (2023), separating cleanup from feature work](https://www.oreilly.com/library/view/tidy-first/9781098151232/)
