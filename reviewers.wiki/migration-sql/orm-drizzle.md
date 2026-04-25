---
id: orm-drizzle
type: primary
depth_role: leaf
focus: "Detect Drizzle ORM pitfalls including type safety gaps in raw SQL, missing prepared statements, schema push vs migrate confusion, connection handling, and SQL injection in sql`` template misuse"
parents:
  - index.md
covers:
  - "Type safety gaps when using sql`` tagged template with untyped placeholders"
  - Missing prepared statements for frequently executed queries
  - Schema push used in production instead of drizzle-kit migrate
  - Connection pool misconfiguration or missing pool wrapper
  - "SQL injection via sql.raw() or string concatenation in query builder"
  - "Missing .execute() causing query to be built but never sent"
  - Incorrect relation inference in relational query API
  - "Transaction callback with external I/O holding connections"
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
activation:
  file_globs:
    - "**/drizzle.config.*"
    - "**/drizzle/**"
    - "**/*schema*"
    - "**/*drizzle*"
  keyword_matches:
    - drizzle
    - drizzle-orm
    - drizzle-kit
    - pgTable
    - mysqlTable
    - sqliteTable
    - "sql`"
    - sql.raw
    - db.query
    - db.select
    - db.insert
    - db.update
    - db.delete
source:
  origin: file
  path: orm-drizzle.md
  hash: "sha256:4897f58eaef27084f570171c2f6b4b8fea8f75577943293d4738c09939581109"
---
# Drizzle ORM

## When This Activates

Activates on diffs touching Drizzle schema definitions (`pgTable`, `mysqlTable`, `sqliteTable`), Drizzle query builder usage, `drizzle.config.*` files, or `drizzle-kit` commands. Drizzle provides excellent TypeScript type safety at the schema level, but developers can bypass safety via `sql.raw()`, misconfigure connection pooling, or confuse `push` (prototyping) with `migrate` (production). This reviewer catches these gaps.

## Audit Surface

- [ ] sql.raw() called with user-supplied input instead of sql`` tagged template with placeholders
- [ ] String concatenation used inside sql`` template bypassing parameterization
- [ ] drizzle-kit push used in production CI/CD instead of drizzle-kit migrate
- [ ] Database connection created per request without a pool
- [ ] High-frequency query without prepared statement
- [ ] Query built with .where() but missing .execute() call
- [ ] Relational query with deeply nested with clause loading excessive data
- [ ] db.transaction() callback performing HTTP calls or filesystem I/O
- [ ] Missing .onConflictDoNothing() or .onConflictDoUpdate() for upsert patterns
- [ ] Schema file enum values diverging from application TypeScript union types

## Detailed Checks

### Type Safety Gaps and Raw SQL Injection
<!-- activation: keywords=["sql`", "sql.raw", "sql.join", "raw", "placeholder", "sql.empty", "interpolation"] -->

- [ ] **sql.raw() with user input**: flag `sql.raw(userInput)` or `sql.raw(variable)` where the variable may contain user-supplied data -- `sql.raw()` inserts the string verbatim with no escaping; use `sql\`...${placeholder}\`` for parameterization
- [ ] **String concatenation in sql template**: flag `sql\`SELECT * FROM ${tableName}\`` where `tableName` is a string variable -- Drizzle's `sql` tagged template parameterizes values but table/column identifiers need `sql.identifier()` or compile-time references
- [ ] **Untyped sql`` result**: flag `sql\`...\`` used in `db.execute()` without `sql<ReturnType>\`...\`` type parameter -- the result is typed as `unknown[]`; add an explicit generic for type safety

### Prepared Statements and Performance
<!-- activation: keywords=["prepare", "prepared", "placeholder", "execute", "db.query", "hot path", "frequent"] -->

- [ ] **Missing prepared statement**: flag high-frequency queries (called per request, in loops) that are not created with `.prepare()` -- prepared statements avoid re-parsing and re-planning on every execution
- [ ] **Forgotten .execute()**: flag query chains ending in `.where()`, `.limit()`, or `.orderBy()` without a terminal `.execute()` or `await` -- the query object is constructed but never sent to the database
- [ ] **Unnecessary dynamic query**: flag queries that always use the same structure but are built dynamically each time -- extract as a prepared statement with `db.query.table.findMany.prepare()` for better performance

### Schema Push vs Migrate
<!-- activation: keywords=["drizzle-kit", "push", "migrate", "generate", "migration", "schema", "production", "deploy"] -->

- [ ] **push in production**: flag `drizzle-kit push` in production deploy scripts or CI/CD -- push applies schema changes directly without migration files; use `drizzle-kit generate` + `drizzle-kit migrate` for auditable, reversible production deployments
- [ ] **Missing migration review**: flag auto-generated migration SQL that is merged without human inspection -- always review the generated SQL in the `drizzle/` migrations directory for destructive operations
- [ ] **Schema-code drift**: flag schema definitions that reference columns or tables not yet migrated -- ensure migrations are applied before code that depends on new schema ships

### Connection Handling
<!-- activation: keywords=["connection", "pool", "postgres", "mysql2", "better-sqlite3", "neon", "planetscale", "serverless", "lambda", "drizzle("] -->

- [ ] **No connection pool**: flag `drizzle(new Client(...))` (node-postgres) without a `Pool` wrapper -- each `Client` is a single connection; use `new Pool()` for concurrent request handling
- [ ] **Pool per request**: flag `new Pool()` or `drizzle()` instantiated inside a request handler -- creates a new pool on each request; instantiate once at module scope
- [ ] **Serverless connection leak**: flag serverless deployments (Lambda, Vercel, Cloudflare) using standard connection pools without limits -- use serverless-compatible drivers (Neon serverless, PlanetScale serverless) or set `max: 1`

### Transaction Scope
<!-- activation: keywords=["transaction", "db.transaction", "rollback", "tx.", "batch"] -->

- [ ] **External I/O in transaction**: flag `db.transaction()` callbacks that call external APIs, read files, or perform non-DB computation -- the transaction holds a connection for the entire callback duration
- [ ] **Missing rollback path**: flag transaction callbacks that catch errors internally without re-throwing -- swallowed errors prevent automatic rollback; let errors propagate or explicitly call `tx.rollback()`
- [ ] **Nested transaction confusion**: flag `db.transaction()` called inside another transaction callback -- Drizzle does not support savepoints in all drivers; verify driver support or restructure

## Common False Positives

- **sql.raw() with compile-time constants**: `sql.raw('NOW()')` or `sql.raw('TRUE')` with hardcoded strings is safe; flag only when the argument could contain user input.
- **push in development**: `drizzle-kit push` is the intended workflow for local development and prototyping.
- **Single-connection scripts**: CLI tools and migration scripts using `new Client()` instead of `Pool` are acceptable for one-shot operations.

## Severity Guidance

| Finding | Severity |
|---|---|
| sql.raw() with user-supplied input | Critical |
| String concatenation bypassing sql`` parameterization | Critical |
| Connection pool created per request | Critical |
| drizzle-kit push in production deployment | Important |
| Missing prepared statement on hot-path query | Important |
| External I/O inside transaction callback | Important |
| Missing .execute() on constructed query | Important |
| Deeply nested relational with clause | Minor |
| Untyped sql`` result | Minor |
| Schema enum drift from TypeScript types | Minor |

## See Also

- `data-n-plus-1-and-query-perf` -- N+1 and query performance patterns apply to Drizzle relational queries
- `data-schema-migrations` -- general migration safety rules for Drizzle-generated SQL migrations
- `sec-owasp-a03-injection` -- sql.raw() injection is a specific instance of the general SQL injection pattern
- `orm-prisma` -- alternative TypeScript ORM with different type safety and migration tradeoffs

## Authoritative References

- [Drizzle ORM Documentation, "SQL and Raw Queries"](https://orm.drizzle.team/docs/sql)
- [Drizzle ORM Documentation, "Prepared Statements"](https://orm.drizzle.team/docs/perf-queries)
- [Drizzle Kit Documentation, "Migrations"](https://orm.drizzle.team/docs/migrations)
- [Drizzle ORM Documentation, "Transactions"](https://orm.drizzle.team/docs/transactions)
