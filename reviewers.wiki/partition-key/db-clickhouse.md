---
id: db-clickhouse
type: primary
depth_role: leaf
focus: Detect ClickHouse pitfalls around MergeTree engine selection, ORDER BY key design, materialized view synchronization, deduplication semantics, JOIN limitations, and bulk insert requirements
parents:
  - index.md
covers:
  - "MergeTree engine variant mismatch for workload (Replacing, Aggregating, Collapsing)"
  - ORDER BY key selection not matching primary query filter patterns
  - Materialized views with incorrect source table or missing refresh
  - ReplacingMergeTree deduplication only at merge time, not query time
  - "JOIN performance limitations (right table must fit in memory)"
  - Small inserts instead of bulk batches causing too many parts
  - "Mutations (ALTER UPDATE/DELETE) being expensive async operations"
  - Nullable columns adding storage and query overhead
tags:
  - clickhouse
  - mergetree
  - olap
  - columnar
  - materialized-view
  - deduplication
  - bulk-insert
  - join
  - mutation
  - partition
activation:
  file_globs:
    - "**/*clickhouse*"
    - "**/*.sql"
    - "**/ch_*"
    - "**/*analytics*"
    - "**/*warehouse*"
  keyword_matches:
    - clickhouse
    - ClickHouse
    - MergeTree
    - ReplacingMergeTree
    - AggregatingMergeTree
    - CollapsingMergeTree
    - SummingMergeTree
    - Distributed
    - MaterializedView
    - FINAL
    - PREWHERE
    - ORDER BY
    - PARTITION BY
    - LowCardinality
    - toYYYYMM
    - inserter
    - batch insert
source:
  origin: file
  path: db-clickhouse.md
  hash: "sha256:d0db88b062df6887da2c5a35c8c7b08370a6935ed7fd7e2a8b2a5a9d79052e29"
---
# ClickHouse Pitfalls

## When This Activates

Activates on diffs involving ClickHouse table definitions, queries, materialized views, or insert logic. ClickHouse is a columnar OLAP database optimized for analytics on large datasets. Its MergeTree engine family, background merge semantics, and columnar storage create unique pitfalls: ReplacingMergeTree does not deduplicate at query time. Small inserts create too many parts, triggering "too many parts" errors. JOINs require the right table to fit in memory. ALTER UPDATE/DELETE are expensive asynchronous mutations, not lightweight operations. This reviewer targets detection heuristics for these ClickHouse-specific architectural pitfalls.

## Audit Surface

- [ ] MergeTree engine without explicit ORDER BY matching query patterns
- [ ] ReplacingMergeTree used with expectation of immediate deduplication
- [ ] AggregatingMergeTree without matching -State/-Merge function pairs
- [ ] Materialized view referencing wrong source or missing POPULATE
- [ ] JOIN where right-side table exceeds available memory
- [ ] INSERT with fewer than 1000 rows per batch
- [ ] ALTER TABLE UPDATE or DELETE used for routine data modification
- [ ] Nullable column where default value would suffice
- [ ] FINAL keyword used on large tables in hot query path
- [ ] Distributed table without proper sharding key
- [ ] PREWHERE not leveraged for selective column filtering
- [ ] String columns used where LowCardinality or Enum would reduce storage
- [ ] TTL not configured for time-series data retention
- [ ] Too many partitions (>1000) from fine-grained PARTITION BY

## Detailed Checks

### MergeTree Engine Selection
<!-- activation: keywords=["MergeTree", "ReplacingMergeTree", "AggregatingMergeTree", "CollapsingMergeTree", "SummingMergeTree", "VersionedCollapsingMergeTree", "ENGINE =", "ORDER BY", "PARTITION BY"] -->

- [ ] **Wrong MergeTree variant**: flag MergeTree used where ReplacingMergeTree is needed (update semantics), or AggregatingMergeTree where only simple SUM is needed (SummingMergeTree suffices) -- each variant has specific merge-time behavior; mismatching the engine to the workload causes incorrect results or wasted resources
- [ ] **ORDER BY not matching query filters**: flag ORDER BY keys that do not match the most common WHERE clause columns -- the ORDER BY defines the primary index in ClickHouse; queries that filter on columns not in the ORDER BY prefix perform full-part scans
- [ ] **Too many partitions**: flag PARTITION BY with fine granularity (e.g., daily on high-volume data) producing >1000 partitions -- each partition has its own set of parts; too many partitions slow merges and startup

### Deduplication Semantics
<!-- activation: keywords=["ReplacingMergeTree", "FINAL", "deduplicate", "dedup", "version", "argMax", "last", "latest", "upsert"] -->

- [ ] **ReplacingMergeTree without FINAL or argMax**: flag queries on ReplacingMergeTree tables that expect deduplicated results without using the FINAL keyword or argMax/argMin functions -- ReplacingMergeTree deduplicates only during background merges, not at query time; unmerged parts return duplicate rows
- [ ] **FINAL on large table in hot path**: flag FINAL modifier on tables with >100M rows in latency-sensitive queries -- FINAL forces synchronous deduplication at read time, which is slow; consider argMax with GROUP BY as an alternative
- [ ] **Missing version column in ReplacingMergeTree**: flag ReplacingMergeTree without a version column -- without a version, the merge keeps an arbitrary row among duplicates; with a version column, it keeps the highest version

### Materialized Views
<!-- activation: keywords=["MATERIALIZED VIEW", "CREATE MATERIALIZED VIEW", "TO", "POPULATE", "State(", "Merge(", "AggregateFunction"] -->

- [ ] **Materialized view without TO clause**: flag materialized views without an explicit target table (TO clause) -- implicit target tables are harder to manage, query independently, and back up
- [ ] **Missing -State/-Merge pairs**: flag AggregatingMergeTree materialized views where the insertion query uses aggregate functions (e.g., `sumState`) but the reading query does not use the corresponding merge functions (e.g., `sumMerge`) -- results will be incorrect partial aggregates
- [ ] **POPULATE on large source**: flag CREATE MATERIALIZED VIEW ... POPULATE on a table with >1B rows -- POPULATE blocks and may timeout; use INSERT INTO ... SELECT to populate incrementally

### Insert Patterns and Mutations
<!-- activation: keywords=["INSERT", "insert", "batch", "bulk", "Buffer", "ALTER TABLE", "UPDATE", "DELETE", "mutation", "parts", "too many parts"] -->

- [ ] **Small inserts**: flag INSERT statements with <1000 rows per batch or row-at-a-time inserts -- each INSERT creates a new part; ClickHouse performs poorly with many small parts and may throw "too many parts" errors. Buffer tables or client-side batching are required
- [ ] **ALTER UPDATE/DELETE for routine operations**: flag ALTER TABLE ... UPDATE or ALTER TABLE ... DELETE in application code -- these are asynchronous mutations that rewrite entire parts; they are expensive and not designed for OLTP-style row updates
- [ ] **Missing Buffer table for high-frequency inserts**: flag applications inserting more than once per second into a MergeTree table without a Buffer table intermediary -- the Buffer engine batches small inserts before flushing to the target table

### Data Types and Query Optimization
<!-- activation: keywords=["Nullable", "LowCardinality", "Enum", "String", "PREWHERE", "WHERE", "GLOBAL", "JOIN", "IN", "subquery"] -->

- [ ] **Nullable where unnecessary**: flag Nullable columns where a default empty value ("", 0, epoch) would suffice -- Nullable adds a separate bitmask column per nullable column, increasing storage and reducing query performance
- [ ] **String instead of LowCardinality**: flag String columns with <10000 distinct values that could be LowCardinality(String) -- LowCardinality uses dictionary encoding, reducing storage by 10-100x and accelerating GROUP BY
- [ ] **JOIN without GLOBAL for distributed queries**: flag JOINs on distributed tables without the GLOBAL keyword -- without GLOBAL, the right-side subquery executes on every shard independently, causing redundant computation
- [ ] **Large right-side table in JOIN**: flag JOINs where the right table exceeds available memory -- ClickHouse loads the entire right table of a JOIN into memory; use subqueries with IN for large-table lookups

## Common False Positives

- **FINAL in low-frequency dashboard queries**: FINAL on tables with <10M rows for dashboard queries is often acceptable. Flag only on high-frequency or latency-sensitive paths.
- **Small inserts from external data sources**: when ClickHouse receives data from Kafka or other streaming sources, the Kafka engine handles batching internally. Flag only direct INSERT statements.
- **ALTER DELETE for GDPR compliance**: data deletion for regulatory compliance is a legitimate use of mutations. Note the cost but do not flag as incorrect.
- **Nullable for genuinely optional data**: columns representing truly unknown values (not "empty") correctly use Nullable. Flag only when a sentinel default would be more appropriate.

## Severity Guidance

| Finding | Severity |
|---|---|
| Row-at-a-time inserts causing "too many parts" errors | Critical |
| ORDER BY key not matching primary query filter pattern | Critical |
| ReplacingMergeTree queried without FINAL or argMax (returning duplicates) | Important |
| ALTER UPDATE/DELETE used for routine data modification | Important |
| Materialized view with missing -Merge functions on read | Important |
| JOIN with right table exceeding available memory | Important |
| String column with <10k distinct values not using LowCardinality | Minor |
| Nullable column where default value would suffice | Minor |
| FINAL on large table in hot path | Minor |
| PARTITION BY too fine-grained (>1000 partitions) | Minor |

## See Also

- `data-n-plus-1-and-query-perf` -- N+1 patterns in analytics pipelines manifest as repeated small queries instead of batch reads
- `data-schema-migrations` -- ClickHouse schema changes (ADD COLUMN, MODIFY ORDER BY) have specific constraints and merge implications
- `db-timescaledb-influxdb` -- time-series alternatives with different trade-offs for retention and continuous aggregation

## Authoritative References

- [ClickHouse Documentation: MergeTree Engine Family](https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/)
- [ClickHouse Documentation: Materialized Views](https://clickhouse.com/docs/en/sql-reference/statements/create/view#materialized-view)
- [ClickHouse Documentation: Best Practices for Inserting Data](https://clickhouse.com/docs/en/cloud/bestpractices/bulk-inserts)
- [Altinity Blog: ClickHouse ReplacingMergeTree Explained](https://altinity.com/blog/replacingmergetree-explained)
- [ClickHouse Documentation: Performance Tips](https://clickhouse.com/docs/en/operations/tips)
