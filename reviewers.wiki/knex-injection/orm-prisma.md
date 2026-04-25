---
id: orm-prisma
type: primary
depth_role: leaf
focus: Detect Prisma-specific pitfalls including N+1 via implicit relation loading, raw query injection, missing indexes in schema, migration drift, connection pool exhaustion, and transaction misuse
parents:
  - index.md
covers:
  - "N+1 queries via implicit relation traversal without include/select"
  - Raw query injection through $queryRaw or $executeRaw with template literal interpolation
  - "Missing @@index directives in schema.prisma for frequently queried columns"
  - Migration drift between schema.prisma and actual database state
  - Connection pool exhaustion from too many Prisma Client instances
  - Transaction misuse -- interactive transactions holding locks too long
  - "Unchecked .findUnique() returning null passed to non-null context"
  - "Excessive nested create/update in a single write causing unexpected cascade"
  - "Missing @updatedAt or optimistic concurrency control on mutable entities"
  - Client extension or middleware with unintended side effects on every query
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
activation:
  file_globs:
    - "**/schema.prisma"
    - "**/*.prisma"
    - "**/prisma/**"
    - "**/*prisma*"
  keyword_matches:
    - prisma
    - PrismaClient
    - $queryRaw
    - $executeRaw
    - findUnique
    - findMany
    - include
    - schema.prisma
    - prisma migrate
    - prisma db push
source:
  origin: file
  path: orm-prisma.md
  hash: "sha256:f4ed91bbf203e8a9b95c2361c81d7e19afbf5539d4b62dd20b3d511daef02a8c"
---
# Prisma ORM

## When This Activates

Activates on diffs touching `schema.prisma` files, Prisma Client usage, or migration directories under `prisma/`. Prisma's auto-generated client provides excellent type safety but hides performance traps: implicit relation loading triggers N+1 queries, `$queryRaw` with interpolation opens injection vectors, and creating multiple `PrismaClient` instances exhausts the connection pool. This reviewer catches these Prisma-specific pitfalls before they reach production.

## Audit Surface

- [ ] Prisma query in a loop without batching via include, select, or $transaction
- [ ] $queryRaw or $executeRaw called with string interpolation instead of Prisma.sql tagged template
- [ ] schema.prisma model missing @@index on columns used in where/orderBy
- [ ] new PrismaClient() called inside a request handler or hot path instead of module scope
- [ ] Interactive $transaction callback performing I/O or long computation while holding locks
- [ ] findUnique/findFirst result used without null check
- [ ] Deeply nested include (3+ levels) fetching excessive data
- [ ] prisma db push used in production instead of prisma migrate deploy
- [ ] Missing @unique or @@unique on fields used as lookup keys
- [ ] Prisma middleware stacking causing redundant queries or logging overhead
- [ ] Missing relation fields causing implicit many-to-many without explicit join table control
- [ ] Schema enum drift between Prisma schema and application TypeScript enums

## Detailed Checks

### N+1 via Implicit Relations
<!-- activation: keywords=["findMany", "findUnique", "include", "select", "for", "map", "forEach", "loop", "relation", "posts", "author", "comments"] -->

- [ ] **Query in loop**: flag any `prisma.model.findUnique()`, `findFirst()`, or `findMany()` called inside a loop iterating over a parent collection -- batch with `findMany({ where: { id: { in: ids } } })` or use `include` on the parent query
- [ ] **Missing include/select**: flag parent query fetched with `findMany()` followed by iteration that accesses a relation field -- the relation triggers a lazy query per parent; add `include: { relation: true }` or use `select` to the parent query
- [ ] **Over-include**: flag `include` nesting 3+ levels deep (e.g., `include: { posts: { include: { comments: { include: { author: true } } } } }`) -- this generates massive JOINs; flatten with separate queries or use `select` to limit fields

### Raw Query Injection
<!-- activation: keywords=["$queryRaw", "$executeRaw", "queryRawUnsafe", "executeRawUnsafe", "Prisma.sql", "raw", "sql"] -->

- [ ] **Unsafe raw query**: flag `$queryRawUnsafe()` or `$executeRawUnsafe()` with any variable input -- these bypass parameterization entirely; use the tagged template `$queryRaw\`...\`` with `Prisma.sql` instead
- [ ] **Template literal interpolation in $queryRaw**: flag `$queryRaw` called with a regular template literal using `${variable}` instead of the Prisma.sql tagged template -- Prisma's tagged template auto-parameterizes, but a plain template literal does not
- [ ] **String concatenation in raw SQL**: flag raw query strings built with `+` concatenation containing user-supplied values -- always use parameterized placeholders (`$1`, `?`)

### Schema and Index Design
<!-- activation: keywords=["@@index", "@unique", "@@unique", "model", "schema.prisma", "@relation", "@id", "where", "orderBy"] -->

- [ ] **Missing @@index**: flag schema.prisma models where columns used in frequent `where` or `orderBy` clauses have no `@@index` directive -- queries on unindexed columns cause full table scans
- [ ] **Missing @unique on lookup field**: flag fields used in `findUnique()` calls that are not marked `@unique` or `@@unique` in the schema -- Prisma requires a unique constraint for `findUnique`; without it, the query silently falls back to `findFirst`
- [ ] **Implicit many-to-many**: flag implicit many-to-many relations (no explicit join model) where you need to store additional attributes on the relationship -- implicit join tables cannot hold extra columns; use an explicit relation model

### Connection Pool and Client Lifecycle
<!-- activation: keywords=["new PrismaClient", "PrismaClient", "connection", "pool", "$connect", "$disconnect", "serverless", "lambda", "edge"] -->

- [ ] **PrismaClient per request**: flag `new PrismaClient()` inside a request handler, API route, or function body -- each instance creates its own connection pool; instantiate once at module scope and reuse
- [ ] **Missing connection pool sizing**: flag serverless/Lambda deployments without `connection_limit` in the datasource URL -- each Lambda invocation can spawn a pool; set `connection_limit=1` or use Prisma Accelerate/PgBouncer
- [ ] **Missing $disconnect in scripts**: flag CLI scripts or one-shot processes that call Prisma but never call `$disconnect()` -- the process hangs until connections time out

### Transaction Misuse
<!-- activation: keywords=["$transaction", "transaction", "interactive", "sequential", "batch", "isolation"] -->

- [ ] **Long interactive transaction**: flag `$transaction` interactive callbacks that perform external API calls, file I/O, or heavy computation -- the transaction holds a database connection and possibly row locks for the entire callback duration; move non-DB work outside the transaction
- [ ] **Sequential queries without $transaction**: flag multiple related write operations (create parent + create children) not wrapped in `$transaction` -- a failure in the second write leaves orphaned data
- [ ] **Batch vs interactive confusion**: flag `$transaction([...])` batch array used when operations need the result of prior steps -- batch mode executes in parallel; use the interactive callback form when operations depend on each other

### Migration Discipline
<!-- activation: keywords=["prisma migrate", "prisma db push", "migration", "drift", "baseline", "resolve"] -->

- [ ] **db push in production**: flag `prisma db push` usage in production or CI/CD pipelines -- `db push` does not create migration files and can drop data; use `prisma migrate deploy` in production
- [ ] **Migration drift**: flag schemas where `prisma migrate dev` reports drift between the migration history and the actual database -- resolve drift with `prisma migrate resolve` before deploying
- [ ] **Destructive migration not reviewed**: flag generated migration SQL containing DROP or ALTER TYPE that was auto-generated and merged without human review -- always inspect the generated SQL in `prisma/migrations/*/migration.sql`

## Common False Positives

- **Admin/debug scripts**: `new PrismaClient()` in one-shot scripts or CLI tools is acceptable since they run once and exit.
- **Small relation sets**: deeply nested `include` on relations with bounded, small cardinality (e.g., user roles) is acceptable.
- **$queryRaw with tagged template**: Prisma's tagged template literal `$queryRaw\`SELECT ... WHERE id = ${id}\`` auto-parameterizes; do not flag this form as injection.
- **db push in development**: `prisma db push` is the intended workflow for prototyping; flag only in production/CI contexts.

## Severity Guidance

| Finding | Severity |
|---|---|
| $queryRawUnsafe or $executeRawUnsafe with user input | Critical |
| String interpolation in raw SQL query | Critical |
| new PrismaClient() per request in production | Critical |
| Prisma query inside unbounded loop (N+1) | Critical |
| Missing include causing N+1 on large collection | Important |
| Interactive transaction with external I/O | Important |
| prisma db push in production deployment | Important |
| Missing @@index on frequently queried column | Important |
| Deeply nested include (3+ levels) | Minor |
| Missing $disconnect in CLI script | Minor |
| Schema enum drift from application types | Minor |

## See Also

- `data-n-plus-1-and-query-perf` -- general N+1 detection patterns that apply across all ORMs including Prisma
- `data-schema-migrations` -- general migration safety rules; Prisma Migrate generates SQL migrations that must follow these patterns
- `sec-owasp-a03-injection` -- $queryRawUnsafe is a direct SQL injection vector covered by injection rules
- `orm-drizzle` -- alternative TypeScript ORM with different tradeoffs on type safety and raw SQL

## Authoritative References

- [Prisma Documentation, "Connection Management"](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections)
- [Prisma Documentation, "Raw Database Access"](https://www.prisma.io/docs/orm/prisma-client/queries/raw-database-access)
- [Prisma Documentation, "Transactions and Batch Queries"](https://www.prisma.io/docs/orm/prisma-client/queries/transactions)
- [Prisma Documentation, "Prisma Migrate in Production"](https://www.prisma.io/docs/orm/prisma-migrate/workflows/production)
