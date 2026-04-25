---
id: lang-sql
type: primary
depth_role: leaf
focus: Catch correctness, security, and performance bugs in SQL queries and schema changes
parents:
  - index.md
covers:
  - SQL injection via string concatenation or improper parameterization
  - Missing or misused indexes — full table scans on large tables
  - "NULL semantics violations (three-valued logic surprises)"
  - Transaction isolation level mismatches causing phantom reads or lost updates
  - N+1 query patterns and missing JOIN optimization
  - "Window function correctness (PARTITION BY, ORDER BY, frame specification)"
  - CTE materialization behavior differences across databases
  - "Locking and deadlock patterns (SELECT FOR UPDATE, advisory locks)"
  - "Schema migration safety (locking DDL, backward compatibility)"
  - Implicit type coercion causing index bypass or wrong results
  - EXPLAIN plan analysis for query performance
tags:
  - database
  - queries
  - schema
  - migrations
  - performance
  - injection
activation:
  file_globs:
    - "**/*.sql"
    - "**/migrations/**"
    - "**/migrate/**"
    - "**/*migration*"
    - "**/*schema*"
  structural_signals:
    - SQL files or database migration files in diff
    - "Query strings in application code (ORM or raw SQL)"
    - Schema definition or ALTER TABLE statements
source:
  origin: file
  path: lang-sql.md
  hash: "sha256:f87039b6ad7b00800b42895299798b44973d9117929107c38e1a6400fbaeafea"
---
# SQL Quality Reviewer

## When This Activates

Activated when the diff contains `.sql` files, database migration files, schema definitions, or application code constructing SQL queries. Covers standard SQL and common dialects (PostgreSQL, MySQL, SQLite, T-SQL).

## Audit Surface

- [ ] String concatenation or interpolation used to build SQL — parameterized queries / prepared statements required
- [ ] `WHERE col = NULL` instead of `WHERE col IS NULL` — equality with NULL always yields UNKNOWN
- [ ] Column in WHERE/JOIN/ORDER BY on table with >10K rows lacks an index
- [ ] `SELECT *` in production queries — breaks callers when schema changes, wastes bandwidth
- [ ] Transaction scope too wide — holds locks across slow operations, external calls, or user wait
- [ ] Query inside a loop fetches related rows individually (N+1 pattern) — use JOIN or batch IN
- [ ] Migration adds `NOT NULL` column without `DEFAULT` on a populated table — full table rewrite + lock
- [ ] Window function omits `ORDER BY` — row ordering within partition is nondeterministic
- [ ] CTE prevents optimizer from pushing predicates down (PostgreSQL < 12 always materializes)
- [ ] `LIMIT N` without `ORDER BY` — results are nondeterministic and vary between executions
- [ ] Implicit type cast in WHERE (e.g., `WHERE varchar_col = 123`) bypasses index
- [ ] `DELETE FROM table` or `UPDATE table SET ...` without WHERE — potential mass data loss
- [ ] `DISTINCT` used to deduplicate results from a JOIN that incorrectly produces duplicates
- [ ] `COUNT(*)` on multi-million row table without considering approximate count or cached count
- [ ] Foreign key constraint missing on column that references another table's primary key

## Detailed Checks

### SQL Injection and Input Safety
<!-- activation: keywords=["execute", "exec", "query", "prepare", "format", "concat", "interpolat", "%s", "f\"", "${"] -->

- [ ] All user-supplied values pass through parameterized queries (`$1`, `?`, `:name`) — never concatenated into SQL strings
- [ ] Dynamic table/column names (which cannot be parameterized) are validated against a strict allowlist of known identifiers
- [ ] `EXECUTE format(...)` in PL/pgSQL uses `%I` for identifiers and `%L` for literals — `%s` is never used with user input
- [ ] ORM `.raw()` / `.execute()` / `Arel.sql()` calls use parameter binding, not string interpolation or f-strings
- [ ] Stored procedures that build dynamic SQL use `sp_executesql` with typed parameters (T-SQL) or `EXECUTE ... USING` (PL/pgSQL)
- [ ] LIKE patterns escape user input: `%`, `_`, and `\` in search terms are escaped before interpolation into LIKE clauses
- [ ] Application-layer SQL query logging does not leak sensitive parameter values — use parameterized logging with placeholders
- [ ] Second-order injection: data read from the database and used to construct subsequent queries is also parameterized
- [ ] Batch/bulk insert paths also use parameterized queries — bulk operations are not exempt from injection protections

### NULL Semantics and Three-Valued Logic
<!-- activation: keywords=["NULL", "IS NULL", "COALESCE", "IFNULL", "NULLIF", "NOT IN", "CASE", "NVL"] -->

- [ ] `WHERE col = NULL` and `WHERE col != NULL` are never used — must use `IS NULL` / `IS NOT NULL` (SQL uses three-valued logic)
- [ ] `NOT IN (subquery)` where subquery may return NULL — the entire predicate evaluates to UNKNOWN, returning zero rows; use `NOT EXISTS` instead
- [ ] `COUNT(col)` vs `COUNT(*)`: `COUNT(col)` silently excludes NULLs, `COUNT(*)` counts all rows — the correct one is chosen for the business requirement
- [ ] `COALESCE` / `IFNULL` / `NVL` used to handle NULLs in aggregations, computations, and display values
- [ ] `GROUP BY` correctly handles NULL — NULL values are grouped into a single group (all NULLs compare equal for grouping)
- [ ] Unique constraints on NULLable columns: PostgreSQL allows multiple NULLs (SQL standard); SQL Server allows only one — behavior is database-specific
- [ ] `CASE WHEN col = value` does not match NULL rows — add explicit `WHEN col IS NULL THEN ...` branch if NULL rows need handling
- [ ] Boolean columns that are NULLable create three-state logic: `WHERE flag` excludes both NULL and FALSE rows; `WHERE flag IS NOT FALSE` includes NULL
- [ ] String concatenation with NULL: `'hello' || NULL` is NULL in standard SQL — use `CONCAT()` or `COALESCE` to handle NULLable strings
- [ ] Aggregate functions on empty sets: `SUM()` returns NULL (not 0), `COUNT()` returns 0 — `COALESCE(SUM(col), 0)` if zero is desired
- [ ] `NULLIF(a, b)` returns NULL when `a = b` — useful for preventing division by zero: `x / NULLIF(y, 0)`

### Indexing and Query Performance
<!-- activation: keywords=["INDEX", "EXPLAIN", "ANALYZE", "WHERE", "JOIN", "ORDER BY", "GROUP BY", "HAVING", "LIKE", "SCAN", "SEEK"] -->

- [ ] `EXPLAIN ANALYZE` (PostgreSQL) or equivalent has been run for new or modified queries touching tables with >10K rows
- [ ] Composite index column order matches query access pattern: equality predicates first, then range, then sort columns
- [ ] Functions on indexed columns defeat the index: `WHERE LOWER(email) = ...` needs a functional index on `LOWER(email)`
- [ ] `LIKE '%prefix'` (leading wildcard) cannot use B-tree index — consider `pg_trgm` GIN index or full-text search for contains queries
- [ ] `OR` in WHERE clause may prevent index use — rewrite as `UNION ALL` of two indexed queries, or use a GIN index
- [ ] JOIN order and algorithm (NESTED LOOP vs HASH JOIN vs MERGE JOIN) is appropriate for the data size ratio between joined tables
- [ ] Covering index considered for queries that only select indexed columns — enables index-only scan, avoiding heap fetch
- [ ] Partial index (`CREATE INDEX ... WHERE condition`) used for queries that always filter on a specific condition (e.g., `WHERE deleted_at IS NULL`)
- [ ] Multi-column index does not include low-cardinality leading column (e.g., boolean) — the optimizer may skip it
- [ ] Index on foreign key columns exists — without it, DELETE on the parent table causes sequential scan on the child
- [ ] Over-indexing checked: each index slows writes (INSERT/UPDATE/DELETE) — unused indexes should be dropped

### Transactions, Locking, and Isolation
<!-- activation: keywords=["BEGIN", "COMMIT", "ROLLBACK", "LOCK", "FOR UPDATE", "ISOLATION", "SERIALIZABLE", "deadlock", "SAVEPOINT"] -->

- [ ] Transaction isolation level is appropriate: READ COMMITTED for most workloads, SERIALIZABLE for invariant enforcement across multiple reads
- [ ] `SELECT ... FOR UPDATE` specifies `NOWAIT` (fail fast) or `SKIP LOCKED` (queue processing) when appropriate to avoid blocking
- [ ] Deadlock risk: multiple tables locked in consistent order across all code paths that lock the same tables
- [ ] Long-running transactions avoided — they hold locks, prevent autovacuum/VACUUM (PostgreSQL), increase replication lag, and bloat WAL
- [ ] Read-only transactions marked as such (`SET TRANSACTION READ ONLY` or framework equivalent) — enables optimizer shortcuts
- [ ] Advisory locks (`pg_advisory_lock`) have matching unlock — `pg_advisory_xact_lock` auto-releases at transaction end (safer)
- [ ] Optimistic locking (version column or updated_at check) used for user-facing update flows to prevent lost updates
- [ ] Savepoints used for partial rollback within larger transactions: `SAVEPOINT sp1; ... ROLLBACK TO sp1;` allows retrying a sub-operation
- [ ] Gap locking (InnoDB) understood: range queries in REPEATABLE READ lock gaps between index values, which can cause unexpected blocking
- [ ] Explicit `LOCK TABLE` is almost never needed — row-level locking via `FOR UPDATE` is preferred

### Schema Design and Migrations
<!-- activation: file_globs=["**/migrations/**", "**/*migration*", "**/*schema*"], keywords=["CREATE TABLE", "ALTER TABLE", "ADD COLUMN", "DROP", "RENAME", "CONSTRAINT"] -->

- [ ] `ALTER TABLE ADD COLUMN` with `NOT NULL` includes a `DEFAULT` value — without it, PostgreSQL rewrites the entire table (holding `ACCESS EXCLUSIVE` lock)
- [ ] `CREATE INDEX CONCURRENTLY` (PostgreSQL) used instead of `CREATE INDEX` on live tables — non-concurrent index creation locks the table against writes
- [ ] Migration is backward-compatible: old application code can run against the new schema during rolling deploy window
- [ ] `DROP COLUMN` is not in the same deploy as code removal — deploy code change first (stop reading the column), then drop in a subsequent migration
- [ ] Data type chosen correctly: `TIMESTAMP WITH TIME ZONE` (timestamptz) over bare `TIMESTAMP` for timezone-aware data; bare TIMESTAMP loses timezone context
- [ ] `TEXT` vs `VARCHAR(n)`: prefer `TEXT` in PostgreSQL unless the length constraint is a genuine business rule (no performance difference)
- [ ] Enum types: new values added with `ALTER TYPE ADD VALUE` — but enum values cannot be removed or reordered without recreating the type
- [ ] Check constraints or domain types enforce business rules at the database level — not just in application code
- [ ] Column rename uses application-level alias first, then schema rename — avoids breaking running application instances
- [ ] Default values on existing columns: in PostgreSQL 11+, `ADD COLUMN ... DEFAULT` is fast (stored in catalog); older versions rewrite the table
- [ ] Foreign key `ON DELETE` action is explicit: `CASCADE`, `SET NULL`, `RESTRICT`, or `NO ACTION` — default `NO ACTION` may surprise if not intended

### Window Functions and CTEs
<!-- activation: keywords=["OVER", "PARTITION BY", "ROW_NUMBER", "RANK", "DENSE_RANK", "LAG", "LEAD", "NTILE", "WITH", "RECURSIVE", "MATERIALIZED"] -->

- [ ] Window function has explicit `ORDER BY` when row ordering matters — `ROW_NUMBER()`, `RANK()`, `LAG()`, `LEAD()` all depend on order
- [ ] Frame specification is explicit: `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` vs default `RANGE BETWEEN ...` — `RANGE` includes ties, `ROWS` does not
- [ ] `ROW_NUMBER()` tiebreaking is deterministic — add sufficient `ORDER BY` columns to guarantee unique ordering (e.g., add primary key)
- [ ] Recursive CTE has a termination condition — check that the recursive term's WHERE clause narrows the result set each iteration
- [ ] Recursive CTE depth is bounded: add `WHERE depth < max_depth` or use database-specific `max_recursion` setting to prevent infinite loops
- [ ] CTE materialization controlled in PostgreSQL >= 12: use `WITH cte AS MATERIALIZED (...)` or `NOT MATERIALIZED` to guide optimizer
- [ ] `WITH RECURSIVE` anchor and recursive terms have compatible column types and column counts
- [ ] Aggregate window functions (`SUM() OVER`, `COUNT() OVER`) do not accidentally duplicate aggregation that already exists in the query
- [ ] `DISTINCT` inside window function: `COUNT(DISTINCT col) OVER (...)` is not supported in all databases — check dialect support
- [ ] Named windows (`WINDOW w AS (...)`) used when multiple window functions share the same partition and order specification

### Application Integration Patterns
<!-- activation: keywords=["ORM", "query", "fetch", "cursor", "batch", "pagination", "offset", "keyset", "N+1", "eager", "lazy"] -->

- [ ] N+1 detection: ORM eager-loading (`select_related`/`prefetch_related`/`includes`/`joinedload`) used for relationships accessed in loops
- [ ] Cursor-based (keyset) pagination preferred over `OFFSET` for large datasets — `WHERE id > :last_id ORDER BY id LIMIT :page_size`
- [ ] `OFFSET` pagination has deterministic `ORDER BY` — otherwise pages shift when concurrent inserts/deletes occur
- [ ] Batch operations use multi-row `INSERT ... VALUES (...), (...)`, `COPY` (PostgreSQL), or `LOAD DATA` (MySQL) — not individual INSERT per row
- [ ] Connection pool size appropriate: PostgreSQL max_connections defaults to 100; hundreds of application connections need PgBouncer or similar pooler
- [ ] Query timeout set at application level (`statement_timeout` in PostgreSQL, `MAX_EXECUTION_TIME` in MySQL) to prevent runaway queries
- [ ] Result set size bounded — queries that could return millions of rows have `LIMIT` or use streaming cursor (server-side cursor)
- [ ] ORM-generated queries reviewed for unexpected behavior: `SELECT ... IN (list)` with empty list, lazy loading triggered in template rendering, N+1 in serialization
- [ ] Upsert (`INSERT ... ON CONFLICT` / `MERGE`) used instead of SELECT-then-INSERT/UPDATE to avoid race conditions
- [ ] Bulk update patterns use `UPDATE ... FROM` (PostgreSQL) or temp table JOIN (cross-database) — not row-by-row UPDATE in a loop

## Common False Positives

- **`SELECT *` in migrations or admin scripts**: Ad-hoc queries, migration data transforms, and admin/debug scripts may legitimately use `SELECT *` when the column list is not stable or when exploring data interactively.
- **Missing index on small tables**: Tables with fewer than a few thousand rows perform fine with sequential scans — the optimizer prefers seq scan anyway. Only flag missing indexes on tables expected to grow or already large.
- **CTE vs subquery performance**: In PostgreSQL >= 12, non-recursive CTEs are automatically inlined (not materialized). The materialization concern only applies to older PostgreSQL or databases that always materialize CTEs.
- **`COUNT(*)` on small tables**: Exact count is fine for tables with thousands of rows. Only suggest approximate-count alternatives (`reltuples`, HyperLogLog) for multi-million row tables.
- **NULL-allowing unique columns**: PostgreSQL correctly allows multiple NULLs in unique-constrained columns per SQL standard. This is expected behavior, not a constraint violation.
- **`DISTINCT` in UNION**: `UNION` (without ALL) already deduplicates — `DISTINCT` in `SELECT DISTINCT ... UNION SELECT DISTINCT ...` is redundant but harmless.

## Severity Guidance

| Finding | Severity |
|---------|----------|
| SQL injection (string concatenation with user input) | Critical |
| `DELETE`/`UPDATE` without `WHERE` clause | Critical |
| Migration that locks table for extended time on production | Critical |
| Missing transaction around multi-step data modification | Critical |
| Second-order SQL injection (data from DB used in query) | Critical |
| N+1 query pattern on hot path | Important |
| Missing index on large table's frequently-queried column | Important |
| NULL semantics bug (`NOT IN` with NULLable subquery) | Important |
| Implicit type cast defeating index usage | Important |
| `SELECT *` in production application code | Important |
| Transaction isolation level too low for consistency requirement | Important |
| Missing foreign key `ON DELETE` action specification | Important |
| Missing `ORDER BY` with `LIMIT` | Minor |
| `DISTINCT` masking a JOIN that produces duplicates | Minor |
| CTE vs subquery style preference | Minor |
| Missing foreign key constraint on optional relationship | Minor |
| Redundant `DISTINCT` in UNION | Minor |

## See Also

- `concern-security` — General injection and input validation patterns
- `concern-performance` — Application-level performance review
- `concern-data-integrity` — Data validation and consistency patterns

## Authoritative References

- [PostgreSQL Documentation](https://www.postgresql.org/docs/current/) — Comprehensive reference for PostgreSQL features and behavior
- [Use The Index, Luke](https://use-the-index-luke.com/) — SQL indexing and query performance guide
- [SQLFluff](https://docs.sqlfluff.com/) — SQL linter documentation and rule reference
- [Squawk](https://squawkhq.com/docs/) — PostgreSQL migration safety checker
- [OWASP SQL Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html) — Injection prevention cheat sheet
- [Markus Winand — Modern SQL](https://modern-sql.com/) — SQL standard features and cross-database behavior
- [PostgreSQL Lock Types](https://www.postgresql.org/docs/current/explicit-locking.html) — Lock modes and conflict matrix
