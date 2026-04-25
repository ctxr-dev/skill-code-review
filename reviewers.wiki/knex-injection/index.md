---
id: knex-injection
type: index
depth_role: subcategory
depth: 1
focus: "Accessing attributes on detached instances after session close; Advisory locks held across transactions without timeout or release; Async session misuse -- blocking I/O inside async session context; Batch numbering conflict from concurrent migration development"
parents:
  - "../index.md"
shared_covers: []
entries:
  - id: api-federation-apollo
    file: api-federation-apollo.md
    type: primary
    focus: Detect GraphQL Federation issues including subgraph boundary violations, entity resolution failures, shared type conflicts, and composition errors
    tags:
      - graphql
      - federation
      - apollo
      - subgraph
      - supergraph
      - gateway
      - entity
      - composition
      - resolveReference
      - schema
  - id: db-postgres
    file: db-postgres.md
    type: primary
    focus: Detect PostgreSQL-specific pitfalls around VACUUM, MVCC bloat, lock escalation, index misuse, CTE materialization, connection exhaustion, and missing pg_stat analysis
    tags:
      - postgres
      - postgresql
      - vacuum
      - mvcc
      - explain
      - locks
      - indexes
      - gin
      - gist
      - brin
      - cte
      - pg_stat
      - connection-pool
      - advisory-lock
  - id: lang-sql
    file: lang-sql.md
    type: primary
    focus: Catch correctness, security, and performance bugs in SQL queries and schema changes
    tags:
      - database
      - queries
      - schema
      - migrations
      - performance
      - injection
  - id: migration-knex-objection
    file: migration-knex-objection.md
    type: primary
    focus: "Detect Knex/Objection.js pitfalls including knex.raw injection, migration lock table issues, batch numbering conflicts, Objection graph operations, and transaction scope misuse"
    tags:
      - knex
      - objection
      - migration
      - nodejs
      - javascript
      - sql-injection
      - raw-query
      - transaction
      - graph-operations
      - data-architecture
  - id: orm-hibernate-jpa
    file: orm-hibernate-jpa.md
    type: primary
    focus: "Detect Hibernate/JPA pitfalls including LazyInitializationException, N+1 with fetch joins, second-level cache staleness, flush mode confusion, JPQL injection, and entity lifecycle misuse"
    tags:
      - hibernate
      - jpa
      - java
      - kotlin
      - lazy-loading
      - n-plus-1
      - cache
      - jpql
      - entity-lifecycle
      - spring
      - data-architecture
  - id: orm-prisma
    file: orm-prisma.md
    type: primary
    focus: Detect Prisma-specific pitfalls including N+1 via implicit relation loading, raw query injection, missing indexes in schema, migration drift, connection pool exhaustion, and transaction misuse
    tags:
      - prisma
      - orm
      - n-plus-1
      - connection-pool
      - migration
      - raw-sql
      - typescript
      - nodejs
      - data-architecture
  - id: orm-sqlalchemy
    file: orm-sqlalchemy.md
    type: primary
    focus: "Detect SQLAlchemy pitfalls including session mismanagement, lazy loading N+1, detached instance access, connection pool misconfiguration, raw text() injection, and expire_on_commit confusion"
    tags:
      - sqlalchemy
      - orm
      - python
      - session
      - lazy-loading
      - connection-pool
      - injection
      - n-plus-1
      - data-architecture
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Knex Injection

**Focus:** Accessing attributes on detached instances after session close; Advisory locks held across transactions without timeout or release; Async session misuse -- blocking I/O inside async session context; Batch numbering conflict from concurrent migration development

## Children

| File | Type | Focus |
|------|------|-------|
| [api-federation-apollo.md](api-federation-apollo.md) | 📄 primary | Detect GraphQL Federation issues including subgraph boundary violations, entity resolution failures, shared type conflicts, and composition errors |
| [db-postgres.md](db-postgres.md) | 📄 primary | Detect PostgreSQL-specific pitfalls around VACUUM, MVCC bloat, lock escalation, index misuse, CTE materialization, connection exhaustion, and missing pg_stat analysis |
| [lang-sql.md](lang-sql.md) | 📄 primary | Catch correctness, security, and performance bugs in SQL queries and schema changes |
| [migration-knex-objection.md](migration-knex-objection.md) | 📄 primary | Detect Knex/Objection.js pitfalls including knex.raw injection, migration lock table issues, batch numbering conflicts, Objection graph operations, and transaction scope misuse |
| [orm-hibernate-jpa.md](orm-hibernate-jpa.md) | 📄 primary | Detect Hibernate/JPA pitfalls including LazyInitializationException, N+1 with fetch joins, second-level cache staleness, flush mode confusion, JPQL injection, and entity lifecycle misuse |
| [orm-prisma.md](orm-prisma.md) | 📄 primary | Detect Prisma-specific pitfalls including N+1 via implicit relation loading, raw query injection, missing indexes in schema, migration drift, connection pool exhaustion, and transaction misuse |
| [orm-sqlalchemy.md](orm-sqlalchemy.md) | 📄 primary | Detect SQLAlchemy pitfalls including session mismanagement, lazy loading N+1, detached instance access, connection pool misconfiguration, raw text() injection, and expire_on_commit confusion |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
