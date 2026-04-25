---
id: antipattern-lava-flow
type: primary
depth_role: leaf
focus: Detect dead or hardened code from previous iterations that persists because nobody understands it well enough to safely remove it
parents:
  - index.md
covers:
  - Code paths guarded by always-true or always-false conditions that nobody simplifies
  - "Functions with 'old', 'legacy', 'deprecated', 'v1', 'backup', or 'orig' in their names still called in production"
  - Commented-out code with dates or annotations older than 6 months
  - "TODO/FIXME comments referencing tickets that have been completed, closed, or abandoned"
  - Orphaned source files not imported or referenced by any other file in the project
  - Migration files for database schemas, tables, or columns that no longer exist
  - Environment-specific branches or configuration for decommissioned environments
  - Code behind feature flags that were fully rolled out months ago but never cleaned up
  - Multiple coexisting implementations of the same logic where only one is active
  - Compatibility shims for library versions or API contracts the project no longer supports
  - Catch-all exception handlers that silently swallow errors from extinct code paths
tags:
  - lava-flow
  - dead-code
  - legacy
  - fossilized
  - hardened
  - dispensable
  - architecture
  - readability
  - anti-pattern
activation:
  file_globs:
    - "*"
  keyword_matches:
    - legacy
    - old
    - deprecated
    - v1
    - v2
    - backup
    - orig
    - TODO
    - FIXME
    - HACK
    - XXX
    - do not remove
    - backwardscompat
    - if true
    - if false
  structural_signals:
    - always_true_condition
    - always_false_condition
    - commented_out_code
    - unused_function
    - stale_todo
source:
  origin: file
  path: antipattern-lava-flow.md
  hash: "sha256:795cb277487ad50bcb6d2ddb74924db8053d535f35529153394db13e07598912"
---
# Lava Flow

## When This Activates

Activates on any diff that introduces, modifies, or touches code adjacent to fossilized remnants from previous iterations. Lava Flow describes code that has cooled and hardened in place -- dead logic, abandoned implementations, and vestigial structures from earlier architectures that nobody removes because nobody fully understands what it does or whether something still depends on it. Unlike the Boat Anchor (which is retained deliberately "just in case"), Lava Flow persists through **fear and uncertainty**: the cost of understanding it feels higher than the cost of leaving it. Over time, Lava Flow accumulates sedimentary layers -- each new developer routes around it, adds defensive checks for it, and documents warnings not to touch it, making the codebase progressively harder to understand and modify.

## Audit Surface

- [ ] Function or class name contains 'old', 'legacy', 'deprecated', 'v1', 'v2', 'backup', 'orig', 'tmp', or 'previous'
- [ ] Conditional branch is guarded by a literal true/false or a constant that evaluates to always-true/always-false
- [ ] Commented-out code block has a date annotation older than 6 months or references a past release
- [ ] TODO or FIXME comment references a ticket ID that is closed, resolved, or not found in the tracker
- [ ] Source file has zero importers and is not registered as an entry point or plugin
- [ ] Database migration references a table or column that does not exist in the current schema
- [ ] Configuration block targets an environment name not present in deployment infrastructure
- [ ] Feature flag is set to 100% or true in all environments for 30+ days with old code path still present
- [ ] Two or more functions implement the same logic with names suggesting versioning (processV1, processV2)
- [ ] Compatibility layer or polyfill targets a runtime, browser, or library version below the project's minimum
- [ ] Try-catch block wraps code that was refactored away, leaving the catch handling exceptions that can no longer be thrown
- [ ] Git blame shows a code block untouched for 12+ months in a file that is otherwise actively maintained
- [ ] Import of a module that itself has no active callers (transitive dead chain)
- [ ] Conditional import or dynamic require for a module path that does not exist
- [ ] Code comment says 'do not remove', 'needed for backwards compatibility', or 'not sure if still used' without evidence

## Detailed Checks

### Legacy-Named Functions and Versioned Duplicates
<!-- activation: keywords=["old", "legacy", "deprecated", "v1", "v2", "backup", "orig", "previous", "new_", "_new", "tmp", "Old", "Legacy"] -->

- [ ] **Legacy naming in active call paths**: flag functions, methods, or classes whose names contain `old`, `legacy`, `deprecated`, `v1`, `backup`, `orig`, `tmp`, or `previous` that are still called from production code -- the name admits the code should not exist, yet it persists
- [ ] **Versioned duplicates**: flag cases where `processV1` and `processV2` (or `handleOld` and `handleNew`) coexist and both have callers -- one should be canonical and the other removed
- [ ] **Renamed-but-not-replaced**: flag functions where a newer version exists but the old version was never deleted -- callers were migrated but the original remains as dead weight
- [ ] **Legacy wrappers**: flag functions whose body is a single call to a newer function with parameter adaptation -- the wrapper is a vestigial compatibility layer that should be inlined
- [ ] **Naming contagion**: flag cases where a legacy-named function is called by a non-legacy function, spreading the legacy taint into otherwise clean code paths

### Always-True and Always-False Conditions
<!-- activation: keywords=["if", "else", "true", "false", "1 == 1", "0 == 1", "DEBUG", "ENABLE", "DISABLE", "const ", "final "] -->

- [ ] **Literal dead branches**: flag `if (true)`, `if (false)`, `if (1 == 0)`, or equivalent constructs in production code -- one branch is permanently dead and the conditional is noise
- [ ] **Constant-guarded branches**: flag conditions that reference a constant, configuration value, or environment variable that evaluates to the same value in all environments -- the branch is effectively always-true or always-false
- [ ] **Impossible type checks**: flag type-narrowing conditions that can never be true given the declared type (e.g., checking an integer for null in a non-nullable context)
- [ ] **Dead else branches**: flag else branches on conditions that are always true -- the else block is Lava Flow that will never execute
- [ ] **Nested dead conditions**: flag conditions inside an already-dead branch -- layers of dead conditionals indicate accumulated Lava Flow from multiple iterations

### Stale TODOs, FIXMEs, and Ticket References
<!-- activation: keywords=["TODO", "FIXME", "HACK", "XXX", "TEMP", "JIRA", "ISSUE", "BUG", "TICKET", "GH-", "PROJ-", "#"] -->

- [ ] **Completed ticket references**: flag TODO or FIXME comments that reference a ticket ID (JIRA, GitHub issue, Linear, etc.) where the ticket has been closed or resolved -- the TODO outlived its purpose
- [ ] **Abandoned ticket references**: flag TODO comments referencing tickets that were closed as "won't fix," "duplicate," or "abandoned" -- the work will never happen and the comment is misleading
- [ ] **Undated TODOs older than 12 months**: flag TODO/FIXME comments where git blame shows the line was written 12+ months ago with no associated ticket or tracking -- these are fossilized intentions
- [ ] **Stale HACK markers**: flag HACK or XXX comments where the temporary workaround they describe has been in place for 6+ months -- the hack has become permanent
- [ ] **Cascading stale TODOs**: flag files with 3+ stale TODO/FIXME comments -- this density indicates systematic neglect of cleanup obligations

### Orphaned Files and Transitive Dead Chains
<!-- activation: keywords=["import ", "require", "from ", "use ", "include ", "export ", "module "] -->

- [ ] **Zero-importer source files**: flag source files (not entry points, not test files, not configuration) that are not imported by any other file in the project -- they are Lava Flow if they contain production logic
- [ ] **Transitive dead chains**: flag file A that imports file B where file B itself has no other importers and no active callers -- the entire chain is dead
- [ ] **Orphaned after refactoring**: flag files that lost their last importer in a recent diff but were not deleted in the same diff -- the refactoring left debris behind
- [ ] **Dead re-exports**: flag barrel files or index modules that re-export symbols from an orphaned module -- the re-export creates the illusion of usage
- [ ] **Conditional imports for removed paths**: flag dynamic imports or conditional requires referencing file paths that do not exist on disk -- the import will always fail or never execute

### Fossilized Infrastructure and Compatibility Layers
<!-- activation: keywords=["migration", "schema", "polyfill", "shim", "compat", "fallback", "workaround", "patch", "backport", "env", "staging", "production", "development"] -->

- [ ] **Migrations for absent schemas**: flag database migration files that create, alter, or reference tables or columns that do not exist in the current schema -- the migration is historical but could confuse schema analysis tools
- [ ] **Compatibility shims for unsupported versions**: flag polyfills, shims, or compatibility layers that target runtime versions, browser versions, or library versions below the project's declared minimum -- the shim will never activate
- [ ] **Decommissioned environment branches**: flag `if (env === 'staging-old')` or configuration blocks for environment names not present in the current deployment infrastructure -- these branches are dead
- [ ] **Workaround annotations past their expiry**: flag code comments referencing upstream bugs with fix versions that have already been released -- the workaround can be replaced with the proper solution
- [ ] **Dead error handling for removed integrations**: flag catch blocks, retry logic, or circuit breaker configuration for external services that are no longer called -- the error handling protects a connection that no longer exists

### Commented-Out Code with Age Indicators
<!-- activation: keywords=["//", "#", "/*", "*/", "<!--", "2020", "2021", "2022", "2023", "2024", "2025"] -->

- [ ] **Dated commented-out code**: flag commented-out code blocks that include a date, timestamp, or version reference older than 6 months -- the code has been dead long enough to confirm nobody needs it
- [ ] **Author-annotated dead code**: flag commented-out code with annotations like "// disabled by [name]" or "// turned off for [reason]" where the reason is no longer relevant
- [ ] **Commented-out code referencing deleted symbols**: flag commented-out code that references functions, classes, variables, or APIs that no longer exist in the codebase -- the code cannot be restored without rewriting it
- [ ] **Multi-file commented-out patterns**: flag the same code pattern commented out in multiple files -- this suggests a systematic deactivation that should have been a deletion

## Common False Positives

- **Database migrations are append-only by design**: migration files for tables that no longer exist are part of the migration history and must be retained for rollback capability. Flag only when the migration runner itself references a nonexistent table in a way that would fail, or when the project uses a squash/rebase migration strategy that should consolidate old migrations.
- **Backward-compatible API versioning**: API endpoints or functions named `v1`, `v2` may coexist intentionally to serve different client versions. Flag only when an older version has zero traffic or consumers according to API metrics, or when the version is behind a permanently-off flag.
- **Defensive TODO comments for known upstream issues**: TODOs referencing open upstream bugs or language proposals are not stale -- they track a real external dependency. Verify the ticket status before flagging.
- **Gradual migration in progress**: during a planned migration (e.g., moving from library A to library B), both old and new implementations legitimately coexist. Flag only when the migration has stalled (no progress in 30+ days) or has been declared complete but old code remains.
- **Polyfills for broad platform support**: projects targeting browsers, embedded systems, or diverse runtimes may intentionally maintain polyfills for versions within their support matrix. Verify the support matrix before flagging a polyfill as Lava Flow.
- **Legal or compliance requirements**: some industries require retaining historical code or configuration for audit trails. Accept if documented with a regulatory citation.

## Severity Guidance

| Finding | Severity |
|---|---|
| Two versioned duplicates of the same logic both called in production (processV1/processV2) | Critical |
| Always-false condition guarding a production code path that silently disables functionality | Critical |
| Orphaned source file actively maintained (modified in recent PRs) but with zero importers | Critical |
| Feature flag fully rolled out 30+ days ago with old code path still present | Critical |
| TODO/FIXME referencing a ticket closed more than 6 months ago | Important |
| Function with legacy/old/deprecated naming still in active call paths | Important |
| Compatibility shim targeting a runtime version below the project's declared minimum | Important |
| Commented-out code block with date annotation older than 6 months | Important |
| Configuration block for a decommissioned environment | Important |
| Catch block for exceptions from a removed integration | Important |
| Always-true condition wrapping code that could be unconditional | Minor |
| Undated TODO without a ticket reference, less than 6 months old by git blame | Minor |
| Dead else branch in test or debug-only code | Minor |
| Migration file for a historical schema change (append-only migration strategy) | Minor |

## See Also

- `antipattern-boat-anchor` -- Boat Anchors are kept deliberately "just in case"; Lava Flow is kept because nobody dares remove it. Boat Anchors have an owner who chose to keep them; Lava Flow is orphaned
- `smell-dead-code` -- Dead Code is the leaf-level symptom (unreachable statements, unused variables); Lava Flow is the systemic condition where entire subsystems are fossilized
- `smell-speculative-generality` -- speculative abstractions that never found consumers harden into Lava Flow over time
- `smell-comments-as-deodorant` -- stale TODO/FIXME comments and commented-out code are both Lava Flow indicators and deodorant comment smells
- `principle-dry-kiss-yagni` -- YAGNI prevents Lava Flow at the source; if the code was never needed, it should never have been written. Once written and abandoned, KISS demands its removal
- `principle-separation-of-concerns` -- Lava Flow blurs the boundary between live and dead concerns, making it impossible to determine what the system actually does
- `antipattern-big-ball-of-mud` -- extensive Lava Flow is a leading contributor to Big Ball of Mud: when developers route around fossilized code, the resulting detours destroy architectural structure

## Authoritative References

- [Brian Foote & Joseph Yoder, "Big Ball of Mud" (1997), Section 6: "Reconstruction" -- describes how dead code accumulates as architecture erodes](http://www.laputan.org/mud/)
- [Michael Feathers, *Working Effectively with Legacy Code* (2004), identifying seams and safely removing code nobody understands](https://www.oreilly.com/library/view/working-effectively-with/0131177052/)
- [Robert C. Martin, *Clean Code* (2008), Chapter 17: Smells and Heuristics -- "Dead Function" and "Obsolete Comment"](https://www.oreilly.com/library/view/clean-code-a/9780136083238/)
- [Martin Fowler, *Refactoring* (2nd ed., 2018), "Remove Dead Code" and "Remove Flag Argument"](https://refactoring.com/catalog/)
- [Adam Tornhill, *Your Code as a Crime Scene* (2015), using code age analysis to identify fossilized code regions](https://pragprog.com/titles/atcrime/your-code-as-a-crime-scene/)
- [William Brown et al., *AntiPatterns: Refactoring Software, Architectures, and Projects in Crisis* (1998), "Lava Flow" anti-pattern](https://www.wiley.com/en-us/AntiPatterns%3A+Refactoring+Software%2C+Architectures%2C+and+Projects+in+Crisis-p-9780471197133)
