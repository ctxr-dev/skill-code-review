---
id: perf-db-query
type: primary
depth_role: leaf
focus: "Detect full table scans, missing indexes, SELECT *, unbounded result sets, expensive JOINs, and query patterns that degrade under production data volumes"
parents:
  - index.md
covers:
  - Full table scan due to missing index or non-sargable WHERE clause
  - Missing index on column used in WHERE, JOIN ON, or ORDER BY
  - "SELECT * fetching unnecessary columns in production query paths"
  - Unbounded query returning all rows with no LIMIT or pagination
  - N+1 query pattern -- query per parent row in a loop
  - Expensive JOIN without analysis of cardinality or index coverage
  - OR conditions preventing index use
  - "Function applied to indexed column defeating index (non-sargable)"
  - Implicit type conversion in WHERE causing index bypass
  - Missing covering index for index-only scan opportunity
  - DISTINCT or GROUP BY on high-cardinality unindexed column
  - "Query executed inside a loop iterating over parent records (N+1)"
  - Lazy-loaded relationship accessed in a loop without eager loading
  - Missing JOIN causing multiple sequential queries for related data
  - Query with no WHERE clause or index support causing full table scan
  - "SELECT * fetching all columns when only a subset is needed"
  - Missing index on column used in WHERE, JOIN, or ORDER BY
  - Unbounded query returning entire table with no LIMIT
  - ORM method call inside loop that triggers a database query per iteration
  - Pagination implemented via OFFSET on large tables instead of keyset pagination
  - "COUNT(*) on large table without caching or approximate alternative"
tags:
  - database
  - query
  - index
  - full-scan
  - select-star
  - join
  - pagination
  - sql
  - orm
  - performance
  - n-plus-1
  - query-performance
  - eager-loading
  - data-architecture
aliases:
  - data-n-plus-1-and-query-perf
activation:
  file_globs:
    - "**/*.sql"
    - "**/*repository*"
    - "**/*dao*"
    - "**/*query*"
    - "**/*model*"
    - "**/*migration*"
    - "**/*schema*"
  keyword_matches:
    - SELECT
    - INSERT
    - UPDATE
    - DELETE
    - FROM
    - WHERE
    - JOIN
    - INDEX
    - query
    - execute
    - prepare
    - findAll
    - findBy
    - createQuery
    - rawQuery
    - sql
  structural_signals:
    - sql_query
    - orm_query
    - missing_where
    - missing_index
    - select_star
source:
  origin: file
  path: perf-db-query.md
  hash: "sha256:69a79aa8c7bcca6f26ad2f23260cd28fc145bd95fc7d4842fc8a986fac529a0d"
---
# Database Query Performance

## When This Activates

Activates on diffs containing SQL queries (raw or ORM-generated), schema changes, migration files, or data access code. Query performance is the most common cause of production incidents in data-driven applications. Queries that perform well on development datasets with hundreds of rows can cause full table scans, lock contention, and timeouts under production volumes of millions of rows. This reviewer detects query patterns visible in the diff that are known to degrade with data growth, focusing on issues that should be caught before code reaches production.

## Audit Surface

- [ ] Query with no WHERE clause on a table that grows over time
- [ ] SELECT * or ORM equivalent fetching all columns
- [ ] Column in WHERE clause with no supporting index
- [ ] Column in JOIN ON condition with no index on the FK side
- [ ] ORDER BY on non-indexed column with large result set
- [ ] OFFSET-based pagination on a table with >100K rows
- [ ] Function call wrapping indexed column in WHERE (LOWER, YEAR, CAST)
- [ ] OR condition in WHERE joining two different indexed columns
- [ ] Correlated subquery in WHERE or SELECT
- [ ] LIKE with leading wildcard (%term) on indexed column
- [ ] COUNT(*) on large table in request-serving path
- [ ] Multi-table JOIN with no analysis of intermediate cardinality
- [ ] INSERT or UPDATE without batching in a loop
- [ ] Missing EXPLAIN or query plan analysis in PR for new query

## Detailed Checks

### Full Table Scans and Missing Indexes
<!-- activation: keywords=["WHERE", "INDEX", "index", "scan", "EXPLAIN", "Seq Scan", "TABLE ACCESS FULL", "filter", "search"] -->

- [ ] **Missing index on WHERE column**: flag queries filtering on a column that has no index in the schema -- every execution requires a full table scan growing linearly with table size
- [ ] **Non-sargable WHERE clause**: flag function calls wrapping indexed columns (`WHERE LOWER(email) = ?`, `WHERE YEAR(created_at) = ?`, `WHERE CAST(id AS VARCHAR) = ?`) -- the function prevents index use; use a computed/expression index or rewrite the condition
- [ ] **Implicit type conversion**: flag WHERE conditions comparing mismatched types (string column compared to integer) -- implicit casting prevents index use in most databases
- [ ] **OR defeating index**: flag `WHERE col_a = ? OR col_b = ?` where each column has a separate index -- most query planners cannot merge two index scans efficiently; consider UNION ALL of two indexed queries

### SELECT * and Column Waste
<!-- activation: keywords=["SELECT *", "select *", "SELECT", "column", "fetch", "projection", "field"] -->

- [ ] **SELECT * in application code**: flag SELECT * or ORM equivalents (no explicit column list) in production code paths -- fetching unused columns wastes I/O, network bandwidth, and memory; explicit column selection enables covering indexes
- [ ] **Large TEXT/BLOB fetched unnecessarily**: flag queries that fetch TEXT, BLOB, JSONB, or XML columns when only scalar columns are needed -- large columns dramatically increase I/O per row

### Unbounded Result Sets and Pagination
<!-- activation: keywords=["LIMIT", "OFFSET", "page", "paginate", "cursor", "keyset", "findAll", "all()", "unbounded", "COUNT"] -->

- [ ] **No LIMIT on growing table**: flag queries with no LIMIT returning all rows from a table that grows over time -- the result set grows unboundedly; add LIMIT with pagination or streaming
- [ ] **OFFSET pagination on large table**: flag `LIMIT N OFFSET M` on tables with >100K rows -- OFFSET scans and discards M rows per page; use keyset (WHERE id > last_seen_id) pagination
- [ ] **COUNT(*) in hot path**: flag `COUNT(*)` on large tables in request-serving code -- use approximate counts (pg_class.reltuples, HyperLogLog) or cached counts for UI display

### JOIN Performance
<!-- activation: keywords=["JOIN", "join", "INNER JOIN", "LEFT JOIN", "LEFT OUTER JOIN", "CROSS JOIN", "ON", "foreign_key", "fk_", "relationship"] -->

- [ ] **Missing FK index**: flag JOIN ON conditions where the foreign key column has no index -- the database must scan the entire FK table for each row of the driving table
- [ ] **Cartesian JOIN**: flag CROSS JOIN or JOINs with no ON condition (implicit cartesian) -- the result set is the product of both tables; ensure this is intentional
- [ ] **Multi-way JOIN without cardinality analysis**: flag JOINs across 3+ tables without evidence that the intermediate result sets are bounded -- large intermediate sets blow up memory and execution time

### Writes and Batching
<!-- activation: keywords=["INSERT", "UPDATE", "DELETE", "save", "persist", "batch", "bulk", "loop", "for", "each"] -->

- [ ] **Single-row INSERT in loop**: flag INSERT or UPDATE executed per row inside a loop -- use batch INSERT (multi-row VALUES), bulk UPDATE, or COPY/LOAD DATA for large sets
- [ ] **Missing transaction for batch writes**: flag a sequence of related writes without an explicit transaction -- partial completion on failure leaves data in an inconsistent state

## Common False Positives

- **Small reference tables**: SELECT * or unindexed queries on small, bounded reference tables (countries, currencies, config) are fine. Flag only tables that grow with user data.
- **Analytics and reporting queries**: full scans and complex JOINs are expected in offline analytics or batch reporting. Flag only queries in request-serving or latency-sensitive code paths.
- **ORM-managed indexes**: some ORMs (Rails, Django) auto-create indexes on foreign keys. Verify the migration files before flagging a missing FK index.
- **EXPLAIN already provided**: if the PR includes EXPLAIN output showing acceptable performance, do not flag the query.

## Severity Guidance

| Finding | Severity |
|---|---|
| Unbounded query on a growing table in request-serving path | Critical |
| Missing index on WHERE column of high-frequency query | Critical |
| N+1 query pattern (query per row in a loop) | Critical |
| Single-row INSERT/UPDATE in a loop without batching | Important |
| SELECT * in production hot-path query | Important |
| Non-sargable WHERE clause defeating index | Important |
| OFFSET pagination on large table | Important |
| Missing FK index on JOIN column | Important |
| COUNT(*) on large table in hot path | Minor |
| Multi-way JOIN without cardinality analysis | Minor |
| OR condition preventing single-index scan | Minor |

## See Also

- `data-n-plus-1-and-query-perf` -- dedicated reviewer for N+1 patterns with ORM-specific detection heuristics
- `perf-caching-strategy` -- caching is often applied to mask slow queries; fix the query first
- `data-relational-modeling` -- poor schema design is the root cause of many query performance issues
- `data-schema-migrations` -- index additions and schema changes should be reviewed for locking impact
- `perf-profiling-discipline` -- EXPLAIN analysis is the profiling discipline equivalent for database queries

## Authoritative References

- [Markus Winand, *SQL Performance Explained* / Use The Index, Luke (2012)](https://use-the-index-luke.com/)
- [Percona, "High Performance MySQL", 4th ed. (2021) -- query optimization and index strategies](https://www.percona.com/resources)
- [PostgreSQL Documentation, "EXPLAIN" -- understanding and analyzing query plans](https://www.postgresql.org/docs/current/using-explain.html)
- [Brendan Gregg, *Systems Performance*, 2nd ed. (2020) -- database and I/O performance methodology](https://www.brendangregg.com/systems-performance-2nd-edition-book.html)
