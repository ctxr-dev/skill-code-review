---
id: migration-sql
type: index
depth_role: subcategory
depth: 1
focus: API version deprecated without migration path for consumers; Active record pattern mixed with data mapper causing confusion; Adding a column with a volatile default locking the table; Atlas declarative mode applying destructive changes without review
parents:
  - "../index.md"
shared_covers: []
entries:
  - id: data-relational-modeling
    file: data-relational-modeling.md
    type: primary
    focus: Detect normalization gaps, missing constraints, wrong data types, unjustified denormalization, and missing indexes on foreign keys in relational database schemas
    tags:
      - relational
      - normalization
      - constraints
      - data-types
      - indexes
      - foreign-key
      - schema-design
      - data-architecture
  - id: data-schema-migrations
    file: data-schema-migrations.md
    type: primary
    focus: Detect non-reversible migrations, locking DDL on large tables, data loss risks, missing backfill steps, and deployment ordering issues in database schema migrations
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
  - id: db-sqlite
    file: db-sqlite.md
    type: primary
    focus: Detect SQLite-specific pitfalls around WAL mode, busy timeouts, concurrent write contention, file locking, FTS5 configuration, and production misuse
    tags:
      - sqlite
      - wal
      - busy-timeout
      - concurrent-writes
      - fts5
      - json1
      - journal-mode
      - file-locking
      - embedded-database
  - id: migration-alembic
    file: migration-alembic.md
    type: primary
    focus: Detect Alembic migration pitfalls including autogenerate misses, branch merging conflicts, offline mode limitations, bulk operations misuse, and depends_on ordering errors
    tags:
      - alembic
      - migration
      - python
      - sqlalchemy
      - autogenerate
      - branch
      - offline
      - bulk-operations
      - data-architecture
  - id: migration-atlas-goose
    file: migration-atlas-goose.md
    type: primary
    focus: Detect Atlas and Goose migration pitfalls including declarative vs versioned mode confusion, Atlas schema drift, Goose SQL vs Go migration tradeoffs, and rollback discipline
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
  - id: migration-flyway-liquibase
    file: migration-flyway-liquibase.md
    type: primary
    focus: Detect Flyway and Liquibase pitfalls including non-repeatable migration editing, checksum mismatch, out-of-order execution, missing rollback support, baseline misuse, and environment-specific migration errors
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
  - id: mob-android-room-hilt-workmanager
    file: mob-android-room-hilt-workmanager.md
    type: primary
    focus: Detect Room queries on the main thread, missing database migrations, Hilt scope mismatches, WorkManager constraint omissions, and missing foreground service type declarations.
    tags:
      - room
      - hilt
      - workmanager
      - android
      - database
      - dependency-injection
      - background-work
      - migration
      - jetpack
      - dagger
  - id: modern-expand-contract
    file: modern-expand-contract.md
    type: primary
    focus: "Detect expand-contract (parallel change) violations where the contract is broken during migration, old consumers are not migrated, new fields lack backfill, the expand phase ships without population, or old fields are removed prematurely"
    tags:
      - expand-contract
      - parallel-change
      - migration
      - schema-evolution
      - backward-compatibility
      - contract
      - api-versioning
      - online-ddl
      - zero-downtime
      - gh-ost
      - pt-osc
      - blue-green
      - dual-write
      - backfill
      - migration-safety
      - data-architecture
  - id: modern-strangler-fig
    file: modern-strangler-fig.md
    type: primary
    focus: Detect strangler fig migration failures where new functionality bypasses the new system, old system is not gradually replaced, feature parity is unchecked, dual-running lacks comparison, rollback is absent, or traffic shifting has no metrics
    tags:
      - strangler-fig
      - migration
      - incremental
      - legacy
      - routing
      - facade
      - traffic-shifting
      - feature-parity
      - rollback
  - id: orm-diesel-sqlx-rust
    file: orm-diesel-sqlx-rust.md
    type: primary
    focus: "Detect Rust data access pitfalls including diesel compile-time safety gaps vs sqlx runtime query verification, connection pool misconfiguration (deadpool/bb8/r2d2), migration ordering, and type mapping errors"
    tags:
      - diesel
      - sqlx
      - rust
      - connection-pool
      - migration
      - type-safety
      - deadpool
      - bb8
      - r2d2
      - data-architecture
  - id: orm-django
    file: orm-django.md
    type: primary
    focus: "Detect Django ORM pitfalls including N+1 from missing select_related/prefetch_related, raw SQL injection, migration squashing risks, queryset evaluation timing, F/Q expression misuse, and signal side effects"
    tags:
      - django
      - orm
      - python
      - n-plus-1
      - select-related
      - raw-sql
      - migration
      - queryset
      - signals
      - data-architecture
  - id: orm-drizzle
    file: orm-drizzle.md
    type: primary
    focus: "Detect Drizzle ORM pitfalls including type safety gaps in raw SQL, missing prepared statements, schema push vs migrate confusion, connection handling, and SQL injection in sql`` template misuse"
    tags:
      - drizzle
      - orm
      - typescript
      - nodejs
      - type-safety
      - prepared-statements
      - migration
      - raw-sql
      - data-architecture
  - id: orm-ecto-elixir
    file: orm-ecto-elixir.md
    type: primary
    focus: "Detect Ecto/Elixir pitfalls including preload vs join confusion, Repo transaction misuse, changeset validation gaps, raw fragment injection, migration lock timeout, and sandbox leaks"
    tags:
      - ecto
      - elixir
      - preload
      - fragment
      - changeset
      - transaction
      - migration
      - sandbox
      - n-plus-1
      - data-architecture
  - id: orm-typeorm
    file: orm-typeorm.md
    type: primary
    focus: Detect TypeORM pitfalls including eager loading explosion, query builder injection, migration synchronize misuse, subscriber side effects, connection pool exhaustion, and active record vs data mapper confusion
    tags:
      - typeorm
      - orm
      - typescript
      - nodejs
      - eager-loading
      - query-builder
      - migration
      - injection
      - n-plus-1
      - data-architecture
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Migration Sql

**Focus:** API version deprecated without migration path for consumers; Active record pattern mixed with data mapper causing confusion; Adding a column with a volatile default locking the table; Atlas declarative mode applying destructive changes without review

## Children

| File | Type | Focus |
|------|------|-------|
| [data-relational-modeling.md](data-relational-modeling.md) | 📄 primary | Detect normalization gaps, missing constraints, wrong data types, unjustified denormalization, and missing indexes on foreign keys in relational database schemas |
| [data-schema-migrations.md](data-schema-migrations.md) | 📄 primary | Detect non-reversible migrations, locking DDL on large tables, data loss risks, missing backfill steps, and deployment ordering issues in database schema migrations |
| [db-sqlite.md](db-sqlite.md) | 📄 primary | Detect SQLite-specific pitfalls around WAL mode, busy timeouts, concurrent write contention, file locking, FTS5 configuration, and production misuse |
| [migration-alembic.md](migration-alembic.md) | 📄 primary | Detect Alembic migration pitfalls including autogenerate misses, branch merging conflicts, offline mode limitations, bulk operations misuse, and depends_on ordering errors |
| [migration-atlas-goose.md](migration-atlas-goose.md) | 📄 primary | Detect Atlas and Goose migration pitfalls including declarative vs versioned mode confusion, Atlas schema drift, Goose SQL vs Go migration tradeoffs, and rollback discipline |
| [migration-flyway-liquibase.md](migration-flyway-liquibase.md) | 📄 primary | Detect Flyway and Liquibase pitfalls including non-repeatable migration editing, checksum mismatch, out-of-order execution, missing rollback support, baseline misuse, and environment-specific migration errors |
| [mob-android-room-hilt-workmanager.md](mob-android-room-hilt-workmanager.md) | 📄 primary | Detect Room queries on the main thread, missing database migrations, Hilt scope mismatches, WorkManager constraint omissions, and missing foreground service type declarations. |
| [modern-expand-contract.md](modern-expand-contract.md) | 📄 primary | Detect expand-contract (parallel change) violations where the contract is broken during migration, old consumers are not migrated, new fields lack backfill, the expand phase ships without population, or old fields are removed prematurely |
| [modern-strangler-fig.md](modern-strangler-fig.md) | 📄 primary | Detect strangler fig migration failures where new functionality bypasses the new system, old system is not gradually replaced, feature parity is unchecked, dual-running lacks comparison, rollback is absent, or traffic shifting has no metrics |
| [orm-diesel-sqlx-rust.md](orm-diesel-sqlx-rust.md) | 📄 primary | Detect Rust data access pitfalls including diesel compile-time safety gaps vs sqlx runtime query verification, connection pool misconfiguration (deadpool/bb8/r2d2), migration ordering, and type mapping errors |
| [orm-django.md](orm-django.md) | 📄 primary | Detect Django ORM pitfalls including N+1 from missing select_related/prefetch_related, raw SQL injection, migration squashing risks, queryset evaluation timing, F/Q expression misuse, and signal side effects |
| [orm-drizzle.md](orm-drizzle.md) | 📄 primary | Detect Drizzle ORM pitfalls including type safety gaps in raw SQL, missing prepared statements, schema push vs migrate confusion, connection handling, and SQL injection in sql`` template misuse |
| [orm-ecto-elixir.md](orm-ecto-elixir.md) | 📄 primary | Detect Ecto/Elixir pitfalls including preload vs join confusion, Repo transaction misuse, changeset validation gaps, raw fragment injection, migration lock timeout, and sandbox leaks |
| [orm-typeorm.md](orm-typeorm.md) | 📄 primary | Detect TypeORM pitfalls including eager loading explosion, query builder injection, migration synchronize misuse, subscriber side effects, connection pool exhaustion, and active record vs data mapper confusion |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
