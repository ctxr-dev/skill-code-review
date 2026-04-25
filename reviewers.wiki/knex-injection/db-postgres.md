---
id: db-postgres
type: primary
depth_role: leaf
focus: Detect PostgreSQL-specific pitfalls around VACUUM, MVCC bloat, lock escalation, index misuse, CTE materialization, connection exhaustion, and missing pg_stat analysis
parents:
  - index.md
covers:
  - Missing or deferred VACUUM causing table bloat and transaction ID wraparound
  - Long-running transactions holding back MVCC visibility and preventing dead tuple cleanup
  - Inappropriate lock modes causing unnecessary contention or deadlocks
  - Missing EXPLAIN ANALYZE before deploying query changes
  - Partial indexes not leveraged for filtered queries
  - "GIN/GIST/BRIN index misuse or missing for appropriate column types"
  - Advisory locks held across transactions without timeout or release
  - CTEs materializing unexpectedly in older Postgres versions
  - pg_stat_user_tables and pg_stat_statements not monitored
  - Connection limits exceeded due to missing pooling or leaked connections
  - Sequence cache misconfiguration causing gaps or contention
  - "NOTIFY/LISTEN without consumer causing memory pressure"
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
activation:
  file_globs:
    - "**/*.sql"
    - "**/postgres*"
    - "**/pg_*"
    - "**/postgresql*"
    - "**/migration*"
    - "**/schema*"
    - "**/*repository*"
    - "**/*dao*"
    - "**/knex*"
    - "**/prisma*"
    - "**/sequelize*"
    - "**/typeorm*"
    - "**/sqlalchemy*"
    - "**/alembic*"
  keyword_matches:
    - postgres
    - postgresql
    - pg_
    - psql
    - VACUUM
    - ANALYZE
    - EXPLAIN
    - FOR UPDATE
    - LOCK TABLE
    - advisory_lock
    - pg_stat
    - NOTIFY
    - LISTEN
    - BRIN
    - GIN
    - GIST
    - CTE
    - WITH RECURSIVE
    - idle_in_transaction
    - max_connections
    - pgbouncer
source:
  origin: file
  path: db-postgres.md
  hash: "sha256:a39fa1a0d0eb8f3a3403b173370c0ee6727e4f93c4e96fa8d61046f76a9ac3ef"
---
# PostgreSQL Pitfalls

## When This Activates

Activates on diffs involving PostgreSQL queries, migrations, configuration, or ORM code targeting Postgres. PostgreSQL's MVCC model, sophisticated index types, and advisory lock system offer powerful capabilities but create unique failure modes. Autovacuum misconfiguration leads to table bloat and eventually transaction ID wraparound -- a full database freeze. Long-running transactions silently prevent dead tuple cleanup. CTEs that materialize unnecessarily defeat the optimizer. Connection exhaustion under load crashes the entire cluster. This reviewer focuses on detection heuristics specific to PostgreSQL's architecture.

## Audit Surface

- [ ] Autovacuum disabled or aggressive thresholds overridden on high-churn tables
- [ ] Transaction held open across HTTP calls, user input waits, or external API calls
- [ ] LOCK TABLE or SELECT ... FOR UPDATE with overly broad scope
- [ ] Query deployed without EXPLAIN ANALYZE output in the review
- [ ] Sequential scan on a table with >10k rows where an index could apply
- [ ] Partial index missing WHERE clause matching the query's filter
- [ ] GIN index on JSONB column not created for containment queries
- [ ] BRIN index used on non-physically-ordered data
- [ ] Advisory lock acquired (pg_advisory_lock) without matching unlock or timeout
- [ ] CTE used where a subquery would allow predicate pushdown
- [ ] pg_stat_statements extension not enabled in production config
- [ ] max_connections set high without PgBouncer or similar pooler
- [ ] idle_in_transaction_session_timeout not configured
- [ ] SET statement_timeout missing for user-facing queries
- [ ] NOTIFY payload exceeding 8000 bytes or LISTEN without active consumer

## Detailed Checks

### VACUUM and Bloat
<!-- activation: keywords=["VACUUM", "autovacuum", "dead_tuple", "bloat", "wraparound", "xid", "freeze", "pg_stat_user_tables", "n_dead_tup"] -->

- [ ] **Autovacuum disabled**: flag `ALTER TABLE ... SET (autovacuum_enabled = false)` -- disabling autovacuum on any table risks bloat and eventually transaction ID wraparound, which halts the entire database
- [ ] **Aggressive threshold overrides without justification**: flag custom `autovacuum_vacuum_threshold` or `autovacuum_vacuum_scale_factor` set extremely high -- this delays VACUUM on high-churn tables, letting dead tuples accumulate
- [ ] **No monitoring of dead tuple ratio**: flag production configurations where pg_stat_user_tables.n_dead_tup is not monitored or alerted on -- bloat is invisible until query performance degrades
- [ ] **Missing VACUUM after bulk DELETE or UPDATE**: flag migration or batch scripts that DELETE or UPDATE large row counts without scheduling a manual VACUUM ANALYZE afterward

### MVCC and Long Transactions
<!-- activation: keywords=["BEGIN", "COMMIT", "ROLLBACK", "transaction", "idle_in_transaction", "snapshot", "xmin", "visibility", "serializable", "repeatable read"] -->

- [ ] **Transaction spanning external calls**: flag patterns where a database transaction is opened, then an HTTP request, message publish, or sleep occurs before COMMIT -- the open transaction holds a snapshot that prevents VACUUM from cleaning dead tuples created by other sessions
- [ ] **Missing idle_in_transaction_session_timeout**: flag PostgreSQL configs without `idle_in_transaction_session_timeout` set -- leaked idle-in-transaction connections silently block VACUUM and consume connection slots
- [ ] **SERIALIZABLE without retry logic**: flag use of SERIALIZABLE isolation level without application-level retry on serialization failures (SQLSTATE 40001) -- Postgres will abort one transaction in a conflict

### Lock Contention
<!-- activation: keywords=["LOCK", "FOR UPDATE", "FOR SHARE", "FOR NO KEY UPDATE", "advisory_lock", "pg_advisory", "deadlock", "lock_timeout", "SKIP LOCKED", "NOWAIT"] -->

- [ ] **LOCK TABLE in EXCLUSIVE or ACCESS EXCLUSIVE mode**: flag explicit LOCK TABLE statements with strong lock modes -- these block all concurrent reads or writes and are rarely needed outside DDL migrations
- [ ] **SELECT FOR UPDATE without NOWAIT or SKIP LOCKED**: flag FOR UPDATE in user-facing queries without NOWAIT (fail fast) or SKIP LOCKED (skip contested rows) -- under contention, requests queue behind the lock holder
- [ ] **Advisory lock without release**: flag `pg_advisory_lock()` calls without matching `pg_advisory_unlock()` in the same code path, or without using `pg_advisory_xact_lock()` which auto-releases at transaction end
- [ ] **Missing lock_timeout**: flag sessions performing DDL or explicit locks without `SET lock_timeout` -- without a timeout, a lock attempt can block indefinitely waiting for a conflicting lock

### Index Strategy
<!-- activation: keywords=["CREATE INDEX", "INDEX", "USING gin", "USING gist", "USING brin", "USING btree", "partial index", "WHERE", "INCLUDE", "CONCURRENTLY", "REINDEX", "jsonb", "tsvector", "array", "range"] -->

- [ ] **Missing CONCURRENTLY on production index creation**: flag `CREATE INDEX` without `CONCURRENTLY` on tables that receive production traffic -- non-concurrent index builds take an ACCESS EXCLUSIVE lock that blocks all writes
- [ ] **BRIN on non-correlated data**: flag BRIN indexes on columns where physical row order does not correlate with column values -- BRIN relies on physical correlation; random-order data yields useless min/max ranges
- [ ] **Missing GIN index for JSONB containment**: flag queries using `@>`, `?`, `?|`, `?&` operators on JSONB columns without a GIN index -- these operators cannot use btree indexes
- [ ] **Partial index WHERE clause mismatch**: flag partial indexes whose WHERE clause does not match the query's WHERE conditions -- the planner will not use the index if the predicate does not match exactly

### CTE and Query Optimization
<!-- activation: keywords=["WITH ", "CTE", "WITH RECURSIVE", "MATERIALIZED", "NOT MATERIALIZED", "EXPLAIN", "ANALYZE", "query plan", "seq scan", "bitmap", "hash join"] -->

- [ ] **CTE materialization barrier**: flag CTEs in Postgres < 12 or CTEs without `NOT MATERIALIZED` hint that act as optimization fences -- the planner cannot push predicates into a materialized CTE, causing full-table scans inside the CTE
- [ ] **Missing EXPLAIN ANALYZE for new queries**: flag new or modified queries without accompanying EXPLAIN ANALYZE output in the PR -- query plans reveal seq scans, nested loops on large tables, and incorrect join strategies invisible from SQL text alone
- [ ] **WITH RECURSIVE without termination bound**: flag recursive CTEs without a LIMIT or cycle-detection clause -- infinite recursion consumes memory and CPU until the statement_timeout kills it

### Connection Management
<!-- activation: keywords=["max_connections", "connection", "pool", "pgbouncer", "pg_stat_activity", "idle", "connection_limit", "SET ROLE", "statement_timeout"] -->

- [ ] **High max_connections without pooler**: flag `max_connections` > 200 without an external connection pooler (PgBouncer, Odyssey, pgcat) -- each Postgres backend consumes ~5-10 MB of RAM and OS resources; high connection counts cause context switching overhead
- [ ] **No statement_timeout for application queries**: flag application code opening connections without `SET statement_timeout` -- runaway queries consume connections and CPU indefinitely
- [ ] **Connection leak pattern**: flag database connection acquisition without corresponding close/release in a finally/defer/ensure block -- leaked connections exhaust the pool under load

## Common False Positives

- **Intentional full-table VACUUM**: batch maintenance scripts that run `VACUUM FULL` during maintenance windows are deliberate, not accidental autovacuum misconfiguration.
- **Advisory locks for distributed coordination**: systems intentionally using advisory locks as a distributed mutex may hold locks across transactions by design. Verify the unlock path exists.
- **CTE for readability**: CTEs used purely for code organization in Postgres >= 12 with inlining are not performance problems. Flag only when the CTE is referenced multiple times (forcing materialization) or on Postgres < 12.
- **SERIALIZABLE for financial correctness**: some domains require SERIALIZABLE isolation. Flag only the absence of retry logic, not the isolation level choice itself.

## Severity Guidance

| Finding | Severity |
|---|---|
| Autovacuum disabled on a table without compensating manual VACUUM schedule | Critical |
| Transaction held open across external HTTP call or unbounded user wait | Critical |
| CREATE INDEX without CONCURRENTLY on a production table with active traffic | Critical |
| max_connections > 200 with no connection pooler and no statement_timeout | Important |
| SELECT FOR UPDATE without NOWAIT, SKIP LOCKED, or lock_timeout | Important |
| Advisory lock acquired without matching release or transaction-scoped variant | Important |
| CTE acting as optimization fence preventing predicate pushdown | Important |
| Missing EXPLAIN ANALYZE for new complex query | Minor |
| BRIN index on column with low physical correlation | Minor |
| pg_stat_statements not enabled in development/staging environment | Minor |

## See Also

- `data-n-plus-1-and-query-perf` -- N+1 queries are amplified in Postgres when each round trip opens a new transaction snapshot
- `data-schema-migrations` -- Postgres DDL is transactional; migration strategies interact with MVCC and lock behavior
- `db-connection-pooling` -- PgBouncer mode selection (session vs transaction) directly affects Postgres connection utilization
- `sec-owasp-a03-injection` -- SQL injection applies to all Postgres query construction patterns

## Authoritative References

- [PostgreSQL Documentation: Routine Vacuuming](https://www.postgresql.org/docs/current/routine-vacuuming.html)
- [PostgreSQL Documentation: Explicit Locking](https://www.postgresql.org/docs/current/explicit-locking.html)
- [PostgreSQL Documentation: Index Types (GIN, GiST, BRIN)](https://www.postgresql.org/docs/current/indexes-types.html)
- [Citus Data, "When Postgres Blocks: 7 Tips for Dealing with Locks"](https://www.citusdata.com/blog/2018/02/22/seven-tips-for-dealing-with-postgres-locks/)
- [PostgreSQL Wiki: Don't Do This](https://wiki.postgresql.org/wiki/Don%27t_Do_This)
