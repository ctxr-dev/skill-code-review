---
id: migration-knex-objection
type: primary
depth_role: leaf
focus: "Detect Knex/Objection.js pitfalls including knex.raw injection, migration lock table issues, batch numbering conflicts, Objection graph operations, and transaction scope misuse"
parents:
  - index.md
covers:
  - "SQL injection via knex.raw() with template literal or string concatenation"
  - Migration lock table not released after failed migration
  - Batch numbering conflict from concurrent migration development
  - "Objection.js graph insert/upsert creating unexpected nested records"
  - Transaction scope not properly passed to nested Objection queries
  - "Missing knex.destroy() causing connection pool leak"
  - Migration using knex.schema without table existence check
  - "knex.raw() in where clause without bindings array"
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
activation:
  file_globs:
    - "**/*migration*"
    - "**/*knex*"
    - "**/knexfile*"
    - "**/*.js"
    - "**/*.ts"
  keyword_matches:
    - knex
    - Knex
    - objection
    - Objection
    - knex.raw
    - insertGraph
    - upsertGraph
    - knex.schema
    - knex.migrate
    - knexfile
    - $relatedQuery
    - $fetchGraph
    - knex_migrations
source:
  origin: file
  path: migration-knex-objection.md
  hash: "sha256:633dd6de941b81de1ce5701e85f4005f8afcf8141823abe06a53cbba72e8f1c1"
---
# Knex and Objection.js

## When This Activates

Activates on diffs involving Knex query builder, Knex migrations, Objection.js models, or `knexfile` configuration. Knex's `raw()` method is the most common SQL injection vector in the Node.js ecosystem, migration lock table issues cause deployment failures, and Objection's graph operations can create unexpected data. This reviewer catches these JavaScript/TypeScript data access pitfalls.

## Audit Surface

- [ ] knex.raw() with template literal containing ${variable} instead of ? bindings
- [ ] knex.raw() with string concatenation instead of parameterized bindings
- [ ] Migration lock table (knex_migrations_lock) stuck after failure
- [ ] Multiple migrations in same batch number from concurrent development
- [ ] insertGraph() or upsertGraph() with user-supplied nested data
- [ ] Transaction not passed to Objection query within transaction scope
- [ ] Missing knex.destroy() in serverless or script environments
- [ ] Migration missing .hasTable() or .hasColumn() existence check
- [ ] knex.raw() result not properly handled (missing .then() or await)
- [ ] Objection $relatedQuery or $fetchGraph inside loop (N+1)

## Detailed Checks

### knex.raw() Injection
<!-- activation: keywords=["knex.raw", "raw(", ".raw(", "whereRaw", "orderByRaw", "havingRaw", "joinRaw", "selectRaw"] -->

- [ ] **Template literal in raw()**: flag `knex.raw(\`SELECT ... WHERE id = ${id}\`)` -- template literals bypass parameterization; use `knex.raw('SELECT ... WHERE id = ?', [id])` with bindings array
- [ ] **String concatenation in raw()**: flag `knex.raw('SELECT ... WHERE name = ' + name)` -- concatenation enables injection; use `?` placeholders with bindings
- [ ] **whereRaw with user input**: flag `.whereRaw('column = ' + userInput)` or `.whereRaw(\`column = ${userInput}\`)` -- use `.whereRaw('column = ?', [userInput])` with bindings
- [ ] **orderByRaw with user input**: flag `.orderByRaw(userInput)` -- users can inject arbitrary SQL; validate against an explicit column whitelist
- [ ] **Missing bindings array**: flag `knex.raw('SELECT ... WHERE id = ?')` without the second argument (bindings array) -- the `?` placeholder is not replaced; pass `[value]` as the second argument

### Migration Lock and Batch Issues
<!-- activation: keywords=["migrate", "migration", "lock", "knex_migrations", "knex_migrations_lock", "batch", "latest", "rollback"] -->

- [ ] **Stuck migration lock**: flag CI/CD pipelines without a mechanism to release the migration lock table on failure -- if a migration fails mid-execution, `knex_migrations_lock` remains locked; add a pre-migration unlock step or use `knex.migrate.forceFreeMigrationsLock()`
- [ ] **Batch number conflict**: flag migration files that will share the same batch number when run together -- all pending migrations run in one batch; if two developers add migrations simultaneously, ordering within the batch is alphabetical, not intent-based
- [ ] **Missing rollback testing**: flag migration files without corresponding rollback logic or tests -- test `knex.migrate.rollback()` in CI to ensure migrations are reversible
- [ ] **Migration without existence check**: flag `knex.schema.createTable()` without prior `knex.schema.hasTable()` check -- re-running a migration fails; use `createTableIfNotExists` or check first

### Objection.js Graph Operations
<!-- activation: keywords=["insertGraph", "upsertGraph", "insertGraphAndFetch", "upsertGraphAndFetch", "$relatedQuery", "$fetchGraph", "allowGraph", "graphInserted"] -->

- [ ] **User input in graph insert**: flag `Model.query().insertGraph(req.body)` -- users can inject nested relation data; validate and whitelist the graph structure using `allowGraph()` and JSON Schema validation before inserting
- [ ] **Upsert graph without relate**: flag `upsertGraph()` without `{relate: true, unrelate: true}` options when needed -- without these, upsertGraph creates new related records instead of linking existing ones
- [ ] **$relatedQuery in loop**: flag `item.$relatedQuery('children')` inside a loop over a collection -- this fires a query per item (N+1); use `.withGraphFetched('children')` on the parent query
- [ ] **Deep graph without allowGraph**: flag `withGraphFetched('[children.[grandchildren]]')` without `allowGraph()` -- unbounded graph depth can fetch the entire database; restrict with `allowGraph('[children]')`

### Transaction Scope
<!-- activation: keywords=["transaction", "trx", "knex.transaction", "Model.transaction", "bindTransaction", "transacting"] -->

- [ ] **Missing transaction passing**: flag Objection queries inside a `knex.transaction()` callback that do not receive the transaction object -- queries without `trx` use the default connection, not the transaction; pass `trx` via `.transacting(trx)` or `Model.query(trx)`
- [ ] **External I/O in transaction**: flag HTTP calls, file operations, or message queue publishes inside `knex.transaction()` -- the transaction holds a connection for the entire callback; move non-DB operations outside
- [ ] **Nested transaction confusion**: flag `knex.transaction()` called inside another transaction callback -- Knex does not support savepoints by default; the inner transaction uses the same connection; use explicit savepoint if needed

### Connection Lifecycle
<!-- activation: keywords=["destroy", "knex.destroy", "pool", "connection", "min", "max", "acquireTimeout", "serverless", "lambda"] -->

- [ ] **Missing destroy**: flag scripts, CLI tools, or serverless functions that create a Knex instance but never call `knex.destroy()` -- the process hangs on open connections; always destroy in finally block
- [ ] **Default pool in serverless**: flag serverless deployments (Lambda, Vercel) using default pool settings (`min: 2, max: 10`) -- each invocation spawns a pool; set `pool: { min: 0, max: 1 }` for serverless
- [ ] **Pool per request**: flag `knex({...})` called inside a request handler -- creates a new pool per request; instantiate once at module scope

## Common False Positives

- **knex.raw with compile-time constants**: `knex.raw('NOW()')` or `knex.raw('TRUE')` with hardcoded strings is safe.
- **insertGraph in seed files**: graph inserts in database seed files with hardcoded data are safe from injection.
- **Stuck lock in development**: migration lock issues in local development are inconvenient but not production-critical.

## Severity Guidance

| Finding | Severity |
|---|---|
| knex.raw() with template literal containing user input | Critical |
| whereRaw/orderByRaw with unsanitized user input | Critical |
| insertGraph(req.body) without validation | Critical |
| Missing transaction passing in transaction scope | Important |
| Stuck migration lock without recovery mechanism | Important |
| $relatedQuery N+1 in loop | Important |
| Pool created per request | Important |
| Deep graph fetch without allowGraph | Important |
| Missing knex.destroy() in serverless | Minor |
| Migration without existence check | Minor |
| Default pool settings in serverless | Minor |

## See Also

- `data-n-plus-1-and-query-perf` -- Objection.js graph fetching and N+1 from $relatedQuery
- `sec-owasp-a03-injection` -- knex.raw() injection is the most common Node.js SQL injection vector
- `data-schema-migrations` -- Knex migration safety follows general DDL patterns
- `orm-prisma` -- alternative Node.js ORM with different migration and type safety model

## Authoritative References

- [Knex.js Documentation, "Raw Queries"](https://knexjs.org/guide/raw.html)
- [Knex.js Documentation, "Migrations"](https://knexjs.org/guide/migrations.html)
- [Objection.js Documentation, "Graph Operations"](https://vincit.github.io/objection.js/guide/query-examples.html#graph-inserts)
- [Objection.js Documentation, "Transactions"](https://vincit.github.io/objection.js/guide/transactions.html)
