---
id: migration-atlas-goose
type: primary
depth_role: leaf
focus: Detect Atlas and Goose migration pitfalls including declarative vs versioned mode confusion, Atlas schema drift, Goose SQL vs Go migration tradeoffs, and rollback discipline
parents:
  - index.md
covers:
  - Atlas declarative mode applying destructive changes without review
  - Atlas schema drift between desired state and actual database
  - Goose SQL migration without corresponding down migration
  - Goose Go migration with import side effects or non-deterministic behavior
  - Rollback discipline -- missing or untested down migrations
  - Atlas dev-database not matching production database version
  - Goose migration table lock contention in concurrent deploys
  - Mixed Atlas declarative and versioned workflows in same project
tags:
  - atlas
  - goose
  - migration
  - go
  - declarative
  - versioned
  - schema-drift
  - rollback
  - data-architecture
activation:
  file_globs:
    - "**/atlas.hcl"
    - "**/*.hcl"
    - "**/migrations/**"
    - "**/*_migration*"
    - "**/*.sql"
  keyword_matches:
    - atlas
    - goose
    - schema apply
    - schema diff
    - schema inspect
    - goose up
    - goose down
    - goose create
    - +goose Up
    - +goose Down
    - atlas migrate
    - atlas schema
source:
  origin: file
  path: migration-atlas-goose.md
  hash: "sha256:00c6fa831af8cb81bfe053e39fd1608e413d0795ecbecd797ad491b72becaa67"
---
# Atlas and Goose Migrations

## When This Activates

Activates on diffs touching Atlas HCL schema files, Atlas migration directories, Goose SQL migration files (with `-- +goose Up/Down` markers), or Goose Go migration files. Atlas offers both declarative (desired-state) and versioned migration workflows; Goose supports SQL and Go migration formats. This reviewer catches the pitfalls specific to each tool and their interaction.

## Audit Surface

- [ ] atlas schema apply without --dry-run review on production
- [ ] Atlas desired schema file out of sync with application code
- [ ] Goose SQL migration missing -- +goose Down section
- [ ] Goose Go migration performing network calls or non-deterministic operations
- [ ] atlas schema diff generating DROP that was not intended
- [ ] Atlas dev-database using different version than production
- [ ] Goose migration using both SQL and Go formats inconsistently
- [ ] Missing atlas schema inspect comparison before apply
- [ ] Goose binary migration (.go) not compiled for production environment
- [ ] Atlas lint warnings not addressed before merge

## Detailed Checks

### Atlas Declarative Mode
<!-- activation: keywords=["atlas", "schema apply", "schema diff", "schema inspect", "declarative", "desired", "hcl", ".hcl"] -->

- [ ] **Apply without dry-run**: flag `atlas schema apply` in production pipelines without `--dry-run` review step -- declarative mode calculates and applies diffs automatically; always review the plan before applying
- [ ] **Unintended destructive diff**: flag `atlas schema diff` output containing `DROP TABLE` or `DROP COLUMN` that was not explicitly intended -- removing a table/column from the desired schema file generates a DROP; verify the removal is intentional
- [ ] **Dev database version mismatch**: flag Atlas `dev-url` pointing to a different database version than production -- Atlas uses the dev database to simulate changes; version mismatch can generate incompatible SQL
- [ ] **Mixed declarative and versioned**: flag projects that use both `atlas schema apply` (declarative) and `atlas migrate apply` (versioned) on the same database -- pick one workflow; mixing causes drift and double-application

### Atlas Versioned Migrations
<!-- activation: keywords=["atlas migrate", "migrate diff", "migrate apply", "migrate lint", "migrate hash", "atlas.sum"] -->

- [ ] **Modified applied migration**: flag changes to migration files tracked in `atlas.sum` -- Atlas verifies migration integrity via hash file; modifications break the hash chain
- [ ] **Lint warnings ignored**: flag `atlas migrate lint` warnings in CI that are not addressed -- Atlas lint detects destructive changes, data-dependent operations, and backward-incompatible modifications
- [ ] **Missing atlas.sum update**: flag new migration files without corresponding `atlas.sum` update -- run `atlas migrate hash` to update the integrity file

### Goose SQL Migrations
<!-- activation: keywords=["goose", "+goose Up", "+goose Down", "goose create", "goose up", "goose down", "goose status", ".sql"] -->

- [ ] **Missing Down section**: flag Goose SQL migrations with `-- +goose Up` but no `-- +goose Down` section -- every migration should be reversible; add a Down section with the rollback SQL
- [ ] **Down section is no-op**: flag `-- +goose Down` sections that are empty or contain only comments -- a destructive Up (DROP, ALTER) with no-op Down makes rollback impossible
- [ ] **StatementBegin/End missing**: flag multi-statement Down or Up sections without `-- +goose StatementBegin` / `-- +goose StatementEnd` markers -- Goose executes each statement individually by default; multi-statement blocks (functions, triggers) need explicit markers
- [ ] **Non-idempotent migration**: flag migrations without `IF EXISTS` / `IF NOT EXISTS` guards that would fail on re-execution -- add guards for safer retry behavior

### Goose Go Migrations
<!-- activation: keywords=["goose.AddMigration", "goose.AddMigrationNoTx", "func up", "func down", "RegisterMigration", ".go"] -->

- [ ] **Network calls in Go migration**: flag Go migration functions that make HTTP calls, connect to external services, or read from non-database sources -- migrations should be self-contained and depend only on the database state
- [ ] **Non-deterministic operations**: flag Go migrations using `time.Now()`, `rand`, or other non-deterministic functions for data generation -- migrations must produce the same result on every run for reproducibility
- [ ] **Missing NoTx for DDL**: flag Go migrations performing DDL operations (CREATE INDEX CONCURRENTLY) registered with `goose.AddMigration` (transactional) instead of `goose.AddMigrationNoTx` (non-transactional) -- some DDL cannot run inside a transaction
- [ ] **Binary not compiled for target**: flag Go migrations in projects where the migration binary is not built for the deployment environment -- Go migrations are compiled; ensure the binary matches the target OS/architecture

### Rollback Discipline
<!-- activation: keywords=["rollback", "down", "revert", "undo", "goose down", "atlas migrate down"] -->

- [ ] **Untested rollback**: flag migration files where the Down/rollback has never been executed in CI -- rollbacks that fail in production are useless; test both Up and Down in CI
- [ ] **Partial rollback**: flag rollback sequences where rolling back one migration requires rolling back others due to dependencies -- document the required rollback order and test the full sequence
- [ ] **Data loss on rollback**: flag Down migrations that drop columns or tables containing data created by the Up migration -- if the Up adds a column and users populate it, the Down should archive rather than drop

## Common False Positives

- **Atlas declarative for dev**: `atlas schema apply` without dry-run is acceptable for local development databases.
- **Goose Go migrations for complex logic**: Go format is the correct choice when migration logic requires conditional data transformation that SQL cannot express.
- **Missing Down for additive-only**: purely additive migrations (adding a nullable column) have low rollback risk; missing Down is less critical.

## Severity Guidance

| Finding | Severity |
|---|---|
| atlas schema apply on production without dry-run | Critical |
| Unintended DROP in atlas schema diff | Critical |
| Modified migration breaking atlas.sum hash chain | Critical |
| Missing goose Down on destructive migration | Important |
| Dev database version mismatch with production | Important |
| Network calls in Go migration | Important |
| Atlas lint warnings not addressed | Important |
| Non-idempotent migration SQL | Minor |
| Mixed declarative and versioned workflows | Minor |
| StatementBegin/End missing for multi-statement block | Minor |

## See Also

- `data-schema-migrations` -- general migration safety patterns that Atlas and Goose must follow
- `migration-safe-online-patterns` -- online DDL patterns for zero-downtime migrations
- `migration-flyway-liquibase` -- JVM migration tools with similar versioning patterns
- `orm-diesel-sqlx-rust` -- Diesel/sqlx migration systems in the Rust ecosystem

## Authoritative References

- [Atlas Documentation, "Declarative Migrations"](https://atlasgo.io/declarative/apply)
- [Atlas Documentation, "Versioned Migrations"](https://atlasgo.io/versioned/diff)
- [Goose Documentation](https://pressly.github.io/goose/)
- [Atlas Documentation, "Migration Linting"](https://atlasgo.io/versioned/lint)
