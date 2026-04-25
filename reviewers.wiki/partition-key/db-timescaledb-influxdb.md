---
id: db-timescaledb-influxdb
type: primary
depth_role: leaf
focus: Detect time-series database pitfalls around hypertable chunk sizing, continuous aggregate freshness, retention policies, tag vs field confusion, and cardinality explosion
parents:
  - index.md
covers:
  - "Hypertable chunk interval too small or too large for write/query ratio"
  - Continuous aggregates not refreshed or with gaps in coverage
  - Retention policies deleting data needed by continuous aggregates
  - InfluxDB tag vs field confusion causing high cardinality series
  - Cardinality explosion from high-cardinality tags or unbounded label values
  - Missing compression on old chunks consuming excessive storage
  - "Query without time-range filter scanning all chunks/shards"
  - "Schema design with too many measurements/tables instead of tags"
  - Time-series table or collection missing an index on the timestamp column
  - "Granularity too fine for the query pattern (second-level data queried at daily aggregation)"
  - No retention policy or TTL configured for time-series data
  - Missing compression or encoding on high-volume time-series storage
  - No downsampling strategy for historical data
  - "Wide schema with a column per metric instead of narrow (metric, value) design"
  - Timestamp stored without timezone information
  - Missing partitioning by time range on large time-series tables
  - Out-of-order write handling not configured
  - Query scanning full time range when only recent data is needed
tags:
  - timescaledb
  - influxdb
  - time-series
  - hypertable
  - chunk
  - continuous-aggregate
  - retention
  - cardinality
  - compression
  - tag
  - field
  - prometheus
  - downsampling
  - partitioning
  - data-architecture
aliases:
  - data-time-series-modeling
activation:
  file_globs:
    - "**/*timescale*"
    - "**/*influx*"
    - "**/*tsdb*"
    - "**/*time_series*"
    - "**/*metrics*"
    - "**/*telemetry*"
    - "**/*.flux"
    - "**/*.influxql"
  keyword_matches:
    - timescaledb
    - TimescaleDB
    - hypertable
    - create_hypertable
    - chunk_time_interval
    - continuous_agg
    - add_retention_policy
    - add_compression_policy
    - influxdb
    - InfluxDB
    - flux
    - influxql
    - measurement
    - tag
    - field
    - series
    - bucket
    - "from(bucket"
    - cardinality
    - downsample
source:
  origin: file
  path: db-timescaledb-influxdb.md
  hash: "sha256:cfe6d9cef5542cecdde3112516dfbfa7d2a6b3a284989c508dd82e284d081808"
---
# TimescaleDB / InfluxDB Pitfalls

## When This Activates

Activates on diffs involving TimescaleDB hypertable configuration, InfluxDB queries (Flux/InfluxQL), time-series schema design, or retention/compression policies. Time-series databases optimize for append-heavy workloads with time-ordered data, but their partitioning (chunks/shards), aggregation (continuous aggregates/tasks), and cardinality models create unique failure modes. Wrong chunk intervals degrade both write and query performance. Cardinality explosion from high-cardinality tags exhausts memory. Retention policies that delete raw data before continuous aggregates have processed it create data gaps. This reviewer targets these time-series-specific pitfalls.

## Audit Surface

- [ ] Hypertable chunk_time_interval not tuned for data volume (default 7 days may be wrong)
- [ ] Continuous aggregate with no refresh policy or manual refresh only
- [ ] Retention policy drop_after shorter than continuous aggregate coverage window
- [ ] High-cardinality field (user ID, request ID, UUID) used as InfluxDB tag
- [ ] Series cardinality exceeding 1M causing memory pressure
- [ ] Old data chunks not compressed (TimescaleDB) or downsampled (InfluxDB)
- [ ] Query without WHERE time > ... filtering all chunks
- [ ] One measurement/hypertable per entity instead of using tags for differentiation
- [ ] INSERT without explicit timestamp causing server-time assignment
- [ ] Continuous aggregate query with JOIN or unsupported function
- [ ] Missing index on tag columns for non-time filters
- [ ] InfluxDB task or continuous query with no error handling
- [ ] Downsampling deleting high-resolution data before compliance period
- [ ] TimescaleDB installed but hypertable not created (plain Postgres table)

## Detailed Checks

### Chunk and Partition Sizing
<!-- activation: keywords=["hypertable", "create_hypertable", "chunk_time_interval", "chunk", "shard", "partition", "interval", "compress_chunk", "add_compression_policy"] -->

- [ ] **Default chunk interval on high-volume data**: flag hypertables using the default 7-day chunk_time_interval when data volume exceeds 1M rows/day -- each chunk should contain enough data to fit in ~25% of available memory for efficient querying; high-volume data needs shorter intervals
- [ ] **Chunk interval too small**: flag chunk_time_interval < 1 hour -- too many chunks create planning overhead and file descriptor pressure; each chunk is a separate Postgres table
- [ ] **Missing compression policy**: flag hypertables without `add_compression_policy` when data older than a few days is rarely updated -- uncompressed old chunks waste 10-20x more storage
- [ ] **Plain table instead of hypertable**: flag time-series data stored in a regular Postgres table when TimescaleDB is installed -- the table misses chunk-based partitioning, compression, and retention benefits

### Continuous Aggregates and Retention
<!-- activation: keywords=["continuous_agg", "continuous aggregate", "materialized view", "refresh_continuous_aggregate", "add_refresh_policy", "retention", "drop_after", "add_retention_policy", "downsample", "task"] -->

- [ ] **No refresh policy on continuous aggregate**: flag continuous aggregates without `add_refresh_policy` -- without automatic refresh, the aggregate becomes stale and misses recent data
- [ ] **Retention deleting before aggregate processes**: flag retention policies where `drop_after` is shorter than the continuous aggregate's refresh lag -- raw data is deleted before the aggregate has a chance to incorporate it, creating permanent data gaps
- [ ] **Continuous aggregate with unsupported function**: flag continuous aggregates using JOINs, subqueries, or window functions -- TimescaleDB continuous aggregates support only a subset of SQL; unsupported constructs cause creation errors or incorrect results
- [ ] **InfluxDB task without error handling**: flag InfluxDB Flux tasks that do not handle errors (missing `option task` error notification or dead-letter queue) -- a failing task silently drops downsampled data

### Tag vs Field and Cardinality
<!-- activation: keywords=["tag", "field", "series", "cardinality", "measurement", "label", "metric_name", "label_values", "high cardinality", "series cardinality"] -->

- [ ] **High-cardinality tag**: flag InfluxDB tags containing user IDs, request IDs, UUIDs, IP addresses, or other unbounded values -- each unique tag combination creates a new series; millions of series exhaust memory and slow compaction
- [ ] **Field used where tag is needed**: flag InfluxDB fields that are frequently used in WHERE clauses for filtering -- fields are not indexed; filtering by field value requires a full scan of the time range
- [ ] **Cardinality not monitored**: flag InfluxDB or Prometheus deployments without monitoring of series cardinality -- cardinality creep is invisible until the database runs out of memory
- [ ] **One measurement per entity**: flag schemas with separate measurements (InfluxDB) or hypertables (TimescaleDB) for each entity type when tags/columns would differentiate them -- hundreds of tables create management overhead and prevent cross-entity queries

### Query Patterns
<!-- activation: keywords=["SELECT", "FROM", "WHERE", "time", "GROUP BY", "time(", "window", "range", "bucket", "aggregateWindow", "filter"] -->

- [ ] **Query without time range**: flag time-series queries without a time-range filter (WHERE time > ...) -- without a time range, the query scans all chunks/shards across the entire retention period
- [ ] **Missing time-bucket aggregation**: flag raw-data queries over long time ranges (>24 hours) without time-bucket aggregation -- returning millions of raw points is slow and usually not what the user needs; aggregate into time buckets
- [ ] **Server-assigned timestamps**: flag INSERTs without explicit timestamp values -- server-assigned timestamps introduce clock skew between application and database, and lose the true event time

## Common False Positives

- **Default chunk interval on low-volume data**: for tables with <10k rows/day, the default 7-day chunk interval is appropriate. Flag only for high-volume tables.
- **High-cardinality fields (not tags)**: storing user IDs as InfluxDB fields (not tags) is correct when they are not used for filtering. Flag only when the field is used in WHERE clauses.
- **Manual aggregate refresh for batch ETL**: some systems refresh continuous aggregates on a batch schedule aligned with data arrival. Flag only when no refresh mechanism exists at all.
- **No compression on recent data**: data within the active write window should not be compressed. Flag only when data older than the compression policy threshold remains uncompressed.

## Severity Guidance

| Finding | Severity |
|---|---|
| High-cardinality tag causing series cardinality explosion (>1M series) | Critical |
| Retention policy deleting raw data before continuous aggregate processes it | Critical |
| Query without time-range filter scanning all chunks | Important |
| Missing compression policy on old data wasting 10-20x storage | Important |
| Continuous aggregate without refresh policy (stale data) | Important |
| Plain Postgres table for time-series data when TimescaleDB is available | Important |
| InfluxDB task failing silently without error handling | Minor |
| Default chunk interval on high-volume hypertable | Minor |
| Server-assigned timestamps instead of application-provided | Minor |

## See Also

- `db-postgres` -- TimescaleDB runs as a Postgres extension; all Postgres pitfalls apply to the underlying engine
- `db-clickhouse` -- ClickHouse as an alternative columnar analytics database for time-series workloads
- `data-sharding-partitioning` -- chunk sizing is the partitioning strategy for time-series databases
- `data-n-plus-1-and-query-perf` -- querying time-series data point-by-point instead of in time-range batches

## Authoritative References

- [TimescaleDB Documentation: Hypertables](https://docs.timescale.com/use-timescale/latest/hypertables/)
- [TimescaleDB Documentation: Continuous Aggregates](https://docs.timescale.com/use-timescale/latest/continuous-aggregates/)
- [InfluxDB Documentation: Schema Design](https://docs.influxdata.com/influxdb/v2/write-data/best-practices/schema-design/)
- [InfluxDB Documentation: Understanding Cardinality](https://docs.influxdata.com/influxdb/v2/write-data/best-practices/resolve-high-cardinality/)
- [TimescaleDB Documentation: Compression](https://docs.timescale.com/use-timescale/latest/compression/)
