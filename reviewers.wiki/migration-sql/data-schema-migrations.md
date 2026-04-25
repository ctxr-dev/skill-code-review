---
id: data-schema-migrations
type: primary
depth_role: leaf
focus: Detect non-reversible migrations, locking DDL on large tables, data loss risks, missing backfill steps, and deployment ordering issues in database schema migrations
parents:
  - index.md
covers:
  - Migration that drops a column or table with no backup or reversibility
  - "Locking DDL (ALTER TABLE) on a large table in a blocking migration"
  - "Migration that could lose data (column drop, type narrowing, NOT NULL without default)"
  - Missing backfill step for a new NOT NULL column
  - Deployment ordering issue where application code depends on a migration not yet applied
  - Migration and rollback not tested together
  - Rename column breaking existing application code or queries
  - Adding a column with a volatile default locking the table
  - Foreign key added to a large table without CONCURRENTLY or equivalent
  - No down migration defined for an up migration
tags:
  - migration
  - schema-evolution
  - DDL
  - rollback
  - deploy-ordering
  - data-loss
  - locking
  - backfill
  - data-architecture
activation:
  file_globs:
    - "**/*migration*"
    - "**/*migrate*"
    - "**/*flyway*"
    - "**/*liquibase*"
    - "**/*alembic*"
    - "**/*knex*"
    - "**/*prisma*"
    - "**/*schema*"
    - "**/*.sql"
    - "**/db/**"
    - "**/database/**"
    - "**/*changelog*"
  keyword_matches:
    - migration
    - migrate
    - ALTER TABLE
    - DROP COLUMN
    - DROP TABLE
    - ADD COLUMN
    - RENAME
    - NOT NULL
    - DEFAULT
    - flyway
    - liquibase
    - alembic
    - knex
    - prisma
    - "up()"
    - "down()"
    - rollback
    - DDL
    - schema
    - backfill
  structural_signals:
    - migration_file
    - schema_change
    - ddl_statement
    - migration_class
source:
  origin: file
  path: data-schema-migrations.md
  hash: "sha256:041c3f3f7755921ab287ba635d0809a8d98c4d9f1631cd811ce098a18d6b5492"
---
# Schema Migrations

## When This Activates

Activates on diffs involving database migration files (Flyway, Liquibase, Alembic, Knex, Prisma Migrate, Rails migrations, Django migrations), raw DDL scripts, or schema change procedures. Schema migrations are the highest-risk database operations in production systems: a bad migration can lock tables for hours, silently drop data, or create a mismatch between application code and database schema that causes cascading failures. This reviewer detects unsafe migration patterns -- non-reversible changes, locking DDL, data loss risks, missing backfill steps, and deployment ordering mistakes that cause downtime.

## Audit Surface

- [ ] DROP COLUMN or DROP TABLE with no preceding data backup step
- [ ] ALTER TABLE on a table with >1M rows without online DDL or CONCURRENTLY flag
- [ ] ADD COLUMN NOT NULL with no DEFAULT value on an existing table
- [ ] Column type change that narrows the domain (VARCHAR(255) to VARCHAR(50), INT to SMALLINT)
- [ ] New column referenced in application code deployed before migration runs
- [ ] RENAME COLUMN without expand-and-contract migration strategy
- [ ] ADD DEFAULT with a volatile expression (NOW(), RANDOM()) on a large table
- [ ] ADD FOREIGN KEY without CREATE INDEX CONCURRENTLY on the FK column first
- [ ] Migration file with up() but no corresponding down() or rollback
- [ ] Multiple DDL statements in one migration that should be separated for safe rollback
- [ ] Data migration (UPDATE) mixed with schema migration (ALTER) in one step
- [ ] Migration running outside a transaction on a database that supports transactional DDL

## Detailed Checks

### Non-Reversible Migrations
<!-- activation: keywords=["DROP", "drop", "RENAME", "rename", "rollback", "down", "revert", "undo", "irreversible", "destructive"] -->

- [ ] **DROP without backup**: flag DROP COLUMN or DROP TABLE statements with no preceding data backup, archive, or soft-delete step in the migration -- dropped data is unrecoverable after the migration commits
- [ ] **Missing down migration**: flag migration files that define an up/forward step but no corresponding down/rollback step -- every migration should be reversible to enable safe rollback on deploy failure
- [ ] **Rename without expand-and-contract**: flag column or table renames applied as a single step -- rename via expand (add new column), migrate (copy data), contract (drop old column) to avoid breaking application code between deploy steps
- [ ] **Type narrowing**: flag column type changes that narrow the domain (larger VARCHAR to smaller, INT to SMALLINT, BIGINT to INT) -- existing data that exceeds the new bounds will cause the migration to fail or data to be truncated

### Locking DDL on Large Tables
<!-- activation: keywords=["ALTER TABLE", "ADD COLUMN", "DROP COLUMN", "ADD INDEX", "CREATE INDEX", "FOREIGN KEY", "LOCK", "CONCURRENTLY", "ONLINE", "pt-online", "gh-ost", "large", "rows"] -->

- [ ] **Blocking ALTER on large table**: flag ALTER TABLE statements on tables with >1M rows that do not use online DDL (MySQL ALGORITHM=INPLACE, PostgreSQL CONCURRENTLY, pt-online-schema-change, gh-ost) -- blocking ALTER acquires an exclusive lock that blocks all reads and writes for the duration
- [ ] **ADD INDEX without CONCURRENTLY**: flag CREATE INDEX on large tables without the CONCURRENTLY option (PostgreSQL) or equivalent online mechanism -- index creation locks the table for writes in standard mode
- [ ] **ADD FOREIGN KEY locking both tables**: flag ADD FOREIGN KEY constraints that lock both the source and target tables -- add the index first with CONCURRENTLY, then add the FK constraint with NOT VALID, then VALIDATE separately
- [ ] **Volatile default on large table**: flag ADD COLUMN with a DEFAULT expression that is volatile (NOW(), gen_random_uuid()) on a large table -- in some database versions, this rewrites every row; verify the database version supports cheap metadata-only defaults

### Data Loss Risks
<!-- activation: keywords=["NOT NULL", "DEFAULT", "backfill", "UPDATE", "data", "truncate", "convert", "cast", "type change", "domain"] -->

- [ ] **NOT NULL without default on existing table**: flag ADD COLUMN NOT NULL with no DEFAULT value on a table that already has rows -- the migration will fail because existing rows have no value for the new column; add with DEFAULT or add as nullable then backfill then add NOT NULL
- [ ] **Data migration in schema migration**: flag UPDATE or INSERT statements mixed with ALTER TABLE in the same migration -- separate data migrations from schema migrations for independent rollback and to avoid holding locks during data backfill
- [ ] **Missing backfill step**: flag a new column that is added as nullable, referenced in application code as required, but has no backfill migration to populate existing rows -- old rows will have NULL values that break application logic
- [ ] **Truncation on type change**: flag type changes where existing data may not fit (e.g., TEXT to VARCHAR(100) without verifying max data length) -- the migration will fail or silently truncate data

### Deployment Ordering
<!-- activation: keywords=["deploy", "release", "version", "order", "dependency", "application", "code", "migration", "before", "after", "rollback", "backward compatible"] -->

- [ ] **Code depends on unapplied migration**: flag application code that references a new column or table in the same release as the migration that creates it, without ensuring the migration runs first -- if migration fails, the application crashes on missing column
- [ ] **Migration depends on new code**: flag migrations that assume new application code is running (e.g., a migration that calls an API or relies on new enum values in application logic) -- migrations should be independent of application version
- [ ] **Non-backward-compatible migration**: flag migrations that break the previous version of application code (column rename, column drop, type change) -- the migration should be backward-compatible so the old application version continues working during rolling deploys
- [ ] **Multiple DDL in single migration without transaction**: flag migrations with multiple DDL statements where a partial failure leaves the schema in an inconsistent state -- on databases with transactional DDL (PostgreSQL), wrap multi-statement migrations in a transaction; on MySQL, separate into individual migrations

### Migration Hygiene
<!-- activation: keywords=["transaction", "lock_timeout", "statement_timeout", "idempotent", "IF EXISTS", "IF NOT EXISTS", "checksum", "version", "history"] -->

- [ ] **No lock timeout**: flag migrations without a lock_timeout or statement_timeout setting -- a migration waiting for a lock on a busy table can queue up and eventually cascade into a full outage
- [ ] **Non-idempotent migration**: flag migrations that fail on re-run (CREATE TABLE without IF NOT EXISTS, ADD COLUMN without IF NOT EXISTS check) -- idempotent migrations are safer in retry scenarios
- [ ] **Missing transaction on transactional DDL database**: flag multi-statement migrations on PostgreSQL or SQL Server that do not run inside an explicit transaction -- partial migration application leaves the schema in an inconsistent state

## Common False Positives

- **Small tables**: locking DDL on small tables (<100K rows) completes in milliseconds and does not need online DDL tooling. Flag only for tables above the size threshold.
- **Development-only migrations**: migrations that run only in development or test environments do not need production-grade safety. Flag only migrations targeting production.
- **Intentional data deletion**: migrations that intentionally drop deprecated columns or tables with explicit business sign-off are not violations. Flag only when the drop appears accidental or undocumented.
- **Database-native safe defaults**: PostgreSQL 11+ handles ADD COLUMN with constant DEFAULT as metadata-only. Do not flag constant defaults on modern PostgreSQL versions.

## Severity Guidance

| Finding | Severity |
|---|---|
| DROP COLUMN or DROP TABLE with no backup on production table | Critical |
| Blocking ALTER TABLE on large table without online DDL | Critical |
| ADD COLUMN NOT NULL without DEFAULT on table with existing rows | Critical |
| Migration that breaks previous application version during rolling deploy | Important |
| Missing down/rollback migration for a destructive up migration | Important |
| Data migration mixed with schema migration in single step | Important |
| Column rename without expand-and-contract strategy | Important |
| Code references column created by migration in same release with no ordering guarantee | Important |
| Non-idempotent migration that fails on re-run | Minor |
| Missing lock_timeout on migration | Minor |
| Type narrowing without data verification | Minor |

## See Also

- `data-relational-modeling` -- schema migrations implement changes to the relational model; modeling quality determines migration safety
- `principle-fail-fast` -- migrations should fail fast on constraint violations rather than silently corrupting data
- `data-replication-consistency` -- migrations on replicated databases must account for replication lag during schema changes
- `data-retention-and-gdpr` -- migrations dropping columns may be part of a GDPR data deletion pipeline

## Authoritative References

- [Skeema, "Safe Operations for High Volume PostgreSQL" (2021)](https://www.braintreepayments.com/blog/safe-operations-for-high-volume-postgresql/)
- [GitHub Engineering, "gh-ost: Online Schema Migrations at Scale"](https://github.blog/engineering/infrastructure/gh-ost-github-s-online-schema-migration-tool-for-mysql/)
- [Flyway Documentation, "Migrations" and "Callbacks"](https://documentation.red-gate.com/fd/migrations-184127470.html)
- [Andrew Kane, "Strong Migrations" -- safe migration patterns for Rails](https://github.com/ankane/strong_migrations)
- [PostgreSQL Documentation, "ALTER TABLE" and "CREATE INDEX CONCURRENTLY"](https://www.postgresql.org/docs/current/sql-altertable.html)
