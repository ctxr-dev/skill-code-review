---
id: orm-diesel-sqlx-rust
type: primary
depth_role: leaf
focus: "Detect Rust data access pitfalls including diesel compile-time safety gaps vs sqlx runtime query verification, connection pool misconfiguration (deadpool/bb8/r2d2), migration ordering, and type mapping errors"
parents:
  - index.md
covers:
  - "Diesel compile-time query safety bypassed via sql_query() with string formatting"
  - "sqlx::query!() macro not used -- falling back to unverified runtime strings"
  - "Connection pool exhaustion from misconfigured deadpool/bb8/r2d2 settings"
  - Migration ordering issues between diesel and sqlx migration systems
  - Type mapping mismatch between Rust types and database column types
  - "Missing #[derive(Queryable)] field ordering not matching SELECT column order"
  - N+1 from sequential queries in a loop without batch loading
  - Transaction scope holding pool connection across async .await points
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
activation:
  file_globs:
    - "**/*.rs"
    - "**/diesel.toml"
    - "**/sqlx-data.json"
    - "**/migrations/**"
    - "**/Cargo.toml"
  keyword_matches:
    - diesel
    - sqlx
    - "query!"
    - sql_query
    - PgConnection
    - PgPool
    - MySqlPool
    - SqlitePool
    - deadpool
    - bb8
    - r2d2
    - RunMigrations
    - "table!"
    - Queryable
    - FromRow
    - Insertable
source:
  origin: file
  path: orm-diesel-sqlx-rust.md
  hash: "sha256:c9f611098c887cfee678080ca2e072496476c5a69c9a2a8ef257f024e47d07ac"
---
# Diesel and sqlx (Rust)

## When This Activates

Activates on Rust diffs involving `diesel` or `sqlx` crate usage, migration files, connection pool configuration (deadpool, bb8, r2d2), or `Cargo.toml` changes adding database dependencies. Diesel provides compile-time query safety via its DSL but offers escape hatches (`sql_query`) that bypass it. sqlx verifies queries at compile time via macros but falls back to unchecked strings when macros are not used. This reviewer catches the gaps in both approaches.

## Audit Surface

- [ ] diesel::sql_query() with format!() or string concatenation
- [ ] sqlx::query() used instead of sqlx::query!() losing compile-time verification
- [ ] Connection pool without max_size or connection_timeout configuration
- [ ] Diesel migration with down.sql missing or empty
- [ ] Queryable struct field order not matching table! macro or SELECT column order
- [ ] sqlx migrate run used without checking for pending migrations in CI
- [ ] Sequential Repo queries inside a for/iter loop without batch operation
- [ ] Transaction held across .await of external HTTP call or channel send
- [ ] Missing FromRow derive or manual column mapping on sqlx result struct
- [ ] Diesel Insertable struct with Option fields not matching nullable columns

## Detailed Checks

### Diesel Safety Gaps
<!-- activation: keywords=["sql_query", "format!", "diesel", "table!", "Queryable", "Insertable", "AsChangeset", "allow_tables_to_appear_in_same_query"] -->

- [ ] **sql_query with format!**: flag `diesel::sql_query(format!("SELECT ... WHERE id = {}", id))` -- this bypasses Diesel's compile-time safety; use `diesel::sql_query("SELECT ... WHERE id = $1").bind::<Integer, _>(id)` with typed bind parameters
- [ ] **Queryable field order mismatch**: flag `#[derive(Queryable)]` structs where field declaration order does not match the column order in the `table!` macro or SELECT -- Diesel maps by position, not name; reorder fields to match columns
- [ ] **Missing Insertable validation**: flag `#[derive(Insertable)]` structs with `Option<T>` fields for columns that are `NOT NULL` without defaults -- the insert will fail at runtime with a database constraint error
- [ ] **allow_tables_to_appear_in_same_query overuse**: flag this macro used to join tables that should not be joined -- it exists for legitimate cross-table queries but can mask schema design issues

### sqlx Compile-Time Verification
<!-- activation: keywords=["sqlx", "query!", "query_as!", "query_scalar!", "query(", "FromRow", "sqlx::query", "DATABASE_URL"] -->

- [ ] **query() instead of query!()**: flag `sqlx::query("SELECT ...")` (runtime string) used where `sqlx::query!("SELECT ...")` (compile-time verified) could be used -- the macro catches SQL syntax errors, type mismatches, and missing columns at compile time
- [ ] **Missing DATABASE_URL for macros**: flag projects using `sqlx::query!()` macros without `.env` containing `DATABASE_URL` or `sqlx-data.json` for offline mode -- macros need database access at compile time or a cached query file
- [ ] **FromRow derive mismatch**: flag `#[derive(FromRow)]` structs where field names or types do not match the query result columns -- sqlx maps by name; mismatched names cause runtime errors

### Connection Pool Configuration
<!-- activation: keywords=["deadpool", "bb8", "r2d2", "Pool", "pool", "max_size", "connection_timeout", "PgPool", "PgPoolOptions", "min_connections", "max_connections"] -->

- [ ] **Default pool size**: flag `PgPoolOptions::new()` or pool builder without explicit `max_connections` -- defaults may be insufficient for production; set based on expected concurrency and database `max_connections`
- [ ] **Missing connection timeout**: flag pool configuration without `acquire_timeout` or `connection_timeout` -- without a timeout, requests queue indefinitely when the pool is exhausted
- [ ] **Pool per request**: flag pool creation inside a request handler or per-invocation function -- create the pool once at application startup and share via state (Axum State, Actix Data, Rocket State)

### Migration Ordering
<!-- activation: keywords=["migration", "migrate", "diesel migration", "sqlx migrate", "up.sql", "down.sql", "run", "revert"] -->

- [ ] **Missing down.sql**: flag Diesel migrations with an empty or missing `down.sql` -- every migration should be reversible; write the rollback SQL
- [ ] **Mixed migration systems**: flag projects using both Diesel and sqlx migration directories -- pick one migration system to avoid ordering conflicts and double-application
- [ ] **Migration not idempotent**: flag migration SQL without `IF NOT EXISTS` / `IF EXISTS` guards -- re-running a migration (e.g., after partial failure) should not error

### Transaction Scope in Async
<!-- activation: keywords=["transaction", "begin", "commit", "rollback", ".await", "async", "spawn", "tokio"] -->

- [ ] **Transaction across .await**: flag database transactions that hold a connection across `.await` points for external I/O (HTTP, file, channel) -- the connection is held for the entire await duration; restructure to minimize transaction scope
- [ ] **Transaction in spawn**: flag `tokio::spawn` or `task::spawn` inside a transaction block -- spawned tasks outlive the transaction; the connection may be returned to the pool while the task still references it
- [ ] **Missing rollback on error**: flag transaction blocks that use `?` operator without ensuring the transaction is rolled back on error -- sqlx auto-rolls back on drop, but Diesel requires explicit rollback or drop

### N+1 and Batch Operations
<!-- activation: keywords=["for", "iter", "map", "loop", "collect", "batch", "bulk", "IN", "ANY"] -->

- [ ] **Query in loop**: flag `for id in ids { diesel::query(...).filter(id.eq(id)).first(...) }` -- batch with `.filter(id_column.eq_any(&ids))` or `WHERE id = ANY($1)` in sqlx
- [ ] **Sequential inserts**: flag `for item in items { diesel::insert_into(...).values(&item).execute(...) }` -- use `.values(&items_vec)` for batch insert in a single statement

## Common False Positives

- **sql_query for complex queries**: some queries cannot be expressed in Diesel's DSL; `sql_query` with bind parameters (not format!) is the intended escape hatch.
- **query() for dynamic SQL**: `sqlx::query()` is necessary when the SQL structure is determined at runtime (dynamic filters, conditional JOINs).
- **Small loop batches**: querying inside a loop over a small, fixed collection (e.g., 3 config keys) is acceptable.

## Severity Guidance

| Finding | Severity |
|---|---|
| sql_query() with format!() containing user input | Critical |
| sqlx::query() with string concatenation and user input | Critical |
| Transaction held across external I/O .await | Important |
| Pool created per request | Important |
| Queryable struct field order mismatch | Important |
| Missing down.sql on destructive migration | Important |
| sqlx::query() used where query!() would work | Minor |
| Default pool size in production | Minor |
| N+1 from sequential queries in loop | Important |
| Missing connection timeout on pool | Minor |

## See Also

- `data-n-plus-1-and-query-perf` -- N+1 detection patterns apply to Diesel/sqlx sequential queries
- `sec-owasp-a03-injection` -- sql_query() with format!() is a Rust-specific SQL injection vector
- `data-schema-migrations` -- Diesel/sqlx migration safety follows general DDL patterns
- `migration-flyway-liquibase` -- alternative migration tools for polyglot projects

## Authoritative References

- [Diesel Documentation, "Getting Started"](https://diesel.rs/guides/getting-started)
- [sqlx Documentation](https://docs.rs/sqlx/latest/sqlx/)
- [Diesel Documentation, "Raw SQL"](https://diesel.rs/guides/extending-diesel.html)
- [sqlx Documentation, "Compile-Time Verification"](https://docs.rs/sqlx/latest/sqlx/macro.query.html)
