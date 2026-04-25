---
id: migration-flyway-liquibase
type: primary
depth_role: leaf
focus: Detect Flyway and Liquibase pitfalls including non-repeatable migration editing, checksum mismatch, out-of-order execution, missing rollback support, baseline misuse, and environment-specific migration errors
parents:
  - index.md
covers:
  - Editing a previously applied Flyway versioned migration causing checksum mismatch
  - Liquibase changeset modified after deployment causing checksum validation failure
  - Out-of-order migration execution causing dependency issues
  - Missing rollback tag or rollback SQL in Liquibase changesets
  - Flyway baseline applied incorrectly skipping required migrations
  - "Environment-specific SQL (database-specific syntax) without conditional execution"
  - "Repeatable migration (R__) with non-idempotent SQL"
  - Missing preconditions in Liquibase changesets for safe re-execution
  - Flyway callbacks with side effects that differ across environments
tags:
  - flyway
  - liquibase
  - migration
  - checksum
  - rollback
  - baseline
  - changelog
  - versioned-migration
  - data-architecture
activation:
  file_globs:
    - "**/flyway/**"
    - "**/db/migration/**"
    - "**/V__*"
    - "**/R__*"
    - "**/liquibase/**"
    - "**/changelog*"
    - "**/*changelog*"
    - "**/changesets/**"
  keyword_matches:
    - flyway
    - Flyway
    - liquibase
    - Liquibase
    - changeset
    - changeSet
    - changelog
    - V__
    - R__
    - baseline
    - checksum
    - rollback
    - precondition
    - outOfOrder
source:
  origin: file
  path: migration-flyway-liquibase.md
  hash: "sha256:189560dd9dabd35cc6a47b8e93bbbc4c485de89a082da1326a54c49477da2a61"
---
# Flyway and Liquibase Migrations

## When This Activates

Activates on diffs touching Flyway migration files (`V__`, `R__`), Liquibase changelogs (XML, YAML, JSON, SQL), or configuration files for either tool. Flyway and Liquibase are the standard migration tools for JVM projects but have strict rules: editing applied migrations breaks checksums, out-of-order execution causes subtle bugs, and missing rollbacks make incidents unrecoverable. This reviewer enforces migration discipline for both tools.

## Audit Surface

- [ ] Previously applied Flyway V__ migration file modified (checksum will change)
- [ ] Liquibase changeset with id already deployed modified in new commit
- [ ] Flyway outOfOrder=true enabled without team awareness of ordering risks
- [ ] Liquibase changeset without rollback block for destructive operation
- [ ] Flyway baseline set to skip migrations that contain required schema changes
- [ ] Database-specific SQL without dbms precondition
- [ ] Flyway R__ repeatable migration containing INSERT without ON CONFLICT/upsert
- [ ] Liquibase changeset missing preconditions (tableExists, columnExists)
- [ ] Multiple changesets in one changelog file without logicalFilePath
- [ ] Flyway placeholder ${} used without environment variable set
- [ ] Liquibase context/label mismatch between environments
- [ ] Migration file naming that causes ordering ambiguity

## Detailed Checks

### Checksum and Immutability
<!-- activation: keywords=["checksum", "V__", "changeset", "modify", "edit", "hash", "repair", "validation"] -->

- [ ] **Modified versioned migration**: flag any change to a Flyway `V__*` migration file that has been applied to any environment -- applied migrations are immutable; create a new versioned migration instead; if the change is truly needed, use `flyway repair` to update the checksum
- [ ] **Modified deployed changeset**: flag changes to Liquibase changesets (identified by `id` + `author` + `logicalFilePath`) that were already applied -- Liquibase validates checksums on each run; modify only if you also update the checksum or add `validCheckSum`
- [ ] **Repeatable migration not idempotent**: flag Flyway `R__*` migration that uses `INSERT` without `ON CONFLICT DO NOTHING` or `MERGE` -- repeatable migrations re-run when their checksum changes; they must be idempotent

### Out-of-Order Execution
<!-- activation: keywords=["outOfOrder", "out-of-order", "version", "ordering", "V1", "V2", "sequence", "gap"] -->

- [ ] **outOfOrder enabled globally**: flag `flyway.outOfOrder=true` in production configuration -- out-of-order execution allows migrations with lower version numbers to run after higher ones, causing unpredictable ordering; enable only during explicit remediation, not as a default
- [ ] **Version numbering ambiguity**: flag migration files where version comparison is ambiguous (e.g., `V1.1__` and `V1.10__` -- numeric vs string sorting) -- use zero-padded versions (`V1.01__`, `V1.10__`) or timestamp-based versions
- [ ] **Gap in migration sequence**: flag missing version numbers in the migration sequence -- gaps indicate a migration was deleted or never committed; verify intentionality

### Rollback Support
<!-- activation: keywords=["rollback", "undo", "revert", "down", "tag", "Flyway Teams", "Flyway Undo"] -->

- [ ] **Missing Liquibase rollback**: flag Liquibase changesets performing `dropTable`, `dropColumn`, `modifyDataType`, or `addNotNullConstraint` without a `<rollback>` block -- destructive operations must have explicit rollback SQL
- [ ] **Flyway without undo**: flag Flyway Community Edition projects with no rollback strategy -- Community does not support undo migrations; maintain manual rollback scripts or use Flyway Teams
- [ ] **Missing tag before destructive migration**: flag destructive Liquibase changesets without a preceding `tagDatabase` changeset -- tags enable targeted rollback to a known-good state

### Baseline and Environment Config
<!-- activation: keywords=["baseline", "baselineVersion", "baselineOnMigrate", "context", "label", "dbms", "precondition", "placeholder"] -->

- [ ] **Baseline skipping migrations**: flag `flyway.baselineVersion` set to a version that skips migrations containing required schema changes on a new environment -- new environments need all migrations; use baseline only for existing databases
- [ ] **baselineOnMigrate in production**: flag `flyway.baselineOnMigrate=true` in production -- this silently baselines when the metadata table is missing, potentially skipping all migrations; set explicitly with `flyway baseline`
- [ ] **Missing dbms precondition**: flag Liquibase changesets with database-specific SQL (e.g., `CREATE INDEX CONCURRENTLY` for PostgreSQL) without `<preconditions><dbms type="postgresql"/></preconditions>` -- the changeset will fail on other database engines
- [ ] **Unresolved placeholders**: flag Flyway SQL containing `${PLACEHOLDER}` without corresponding values in configuration or environment -- unresolved placeholders cause migration failures at runtime

### Migration Hygiene
<!-- activation: keywords=["logicalFilePath", "changelog", "include", "includeAll", "runOnChange", "runAlways", "context"] -->

- [ ] **Missing logicalFilePath**: flag Liquibase changelog files that are refactored (moved/renamed) without setting `logicalFilePath` to the original path -- Liquibase uses the file path as part of the changeset identifier; moving a file makes it appear as a new changeset
- [ ] **Context mismatch**: flag Liquibase changesets with `context` attributes that do not match any environment's runtime context -- the changeset will never execute in any environment
- [ ] **runOnChange on non-idempotent changeset**: flag `runOnChange="true"` on a changeset that is not idempotent (e.g., INSERT without ON CONFLICT) -- runOnChange re-executes on modification, causing duplicate data

## Common False Positives

- **Flyway repair for intentional fix**: using `flyway repair` to update checksums after fixing a typo in an unapplied migration is acceptable.
- **outOfOrder for feature branches**: temporary `outOfOrder=true` during feature branch integration is a valid workflow; flag only in production configuration.
- **Repeatable migrations for views/functions**: `R__` migrations for `CREATE OR REPLACE VIEW` or `CREATE OR REPLACE FUNCTION` are inherently idempotent.

## Severity Guidance

| Finding | Severity |
|---|---|
| Modified applied versioned migration (checksum mismatch) | Critical |
| baselineOnMigrate=true in production | Critical |
| Missing rollback on destructive Liquibase changeset | Important |
| outOfOrder enabled as production default | Important |
| Database-specific SQL without dbms precondition | Important |
| Non-idempotent repeatable migration | Important |
| Baseline skipping required migrations | Important |
| Unresolved Flyway placeholder | Minor |
| Version numbering ambiguity | Minor |
| Missing logicalFilePath after file move | Minor |

## See Also

- `data-schema-migrations` -- general migration safety patterns that Flyway/Liquibase must follow
- `orm-hibernate-jpa` -- Flyway/Liquibase are the standard migration tools for Hibernate/JPA projects
- `migration-safe-online-patterns` -- online DDL patterns for zero-downtime migrations with Flyway/Liquibase
- `migration-alembic` -- Python equivalent for comparison of migration tool patterns

## Authoritative References

- [Flyway Documentation, "Migrations"](https://documentation.red-gate.com/fd/migrations-184127470.html)
- [Flyway Documentation, "Baseline"](https://documentation.red-gate.com/fd/baseline-184127456.html)
- [Liquibase Documentation, "Changesets"](https://docs.liquibase.com/concepts/changelogs/changeset.html)
- [Liquibase Documentation, "Rollback"](https://docs.liquibase.com/workflows/liquibase-community/using-rollback.html)
