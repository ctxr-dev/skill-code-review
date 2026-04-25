---
id: db-cassandra-scylla
type: primary
depth_role: leaf
focus: Detect Cassandra and ScyllaDB pitfalls around partition key design, tombstone accumulation, compaction strategy, consistency levels, lightweight transactions, and materialized view lag
parents:
  - index.md
covers:
  - Partition key design causing hot partitions or oversized partitions
  - Tombstone accumulation from frequent deletes without compaction tuning
  - Compaction strategy mismatch for the workload pattern
  - Consistency level misuse causing stale reads or unnecessary latency
  - "Lightweight transactions (LWT) used in high-throughput paths"
  - Materialized views causing write amplification and inconsistency
  - ALLOW FILTERING queries performing full table scans
  - Secondary indexes on high-cardinality columns
tags:
  - cassandra
  - scylla
  - scylladb
  - partition-key
  - tombstone
  - compaction
  - consistency-level
  - lwt
  - materialized-view
  - allow-filtering
activation:
  file_globs:
    - "**/*cassandra*"
    - "**/*scylla*"
    - "**/*.cql"
    - "**/*cqlsh*"
    - "**/schema.cql"
    - "**/*repository*"
    - "**/*dao*"
  keyword_matches:
    - cassandra
    - scylla
    - CQL
    - cqlsh
    - partition key
    - clustering key
    - CONSISTENCY
    - QUORUM
    - LOCAL_QUORUM
    - ALL
    - ONE
    - IF NOT EXISTS
    - IF EXISTS
    - ALLOW FILTERING
    - USING TTL
    - USING TIMESTAMP
    - materialized view
    - compaction
    - tombstone
    - gc_grace_seconds
    - BATCH
source:
  origin: file
  path: db-cassandra-scylla.md
  hash: "sha256:88f32fa5e89cd60aec31ff2083480b444b860ce0fdf51d7fb67083110448d675"
---
# Cassandra / ScyllaDB Pitfalls

## When This Activates

Activates on diffs involving CQL queries, Cassandra/Scylla schema definitions, driver configuration, or data modeling code. Cassandra's distributed, partition-based architecture requires a fundamentally different data modeling approach than relational databases. The partition key is the single most important design decision -- it determines data distribution, query capability, and operational health. Tombstone accumulation from deletes silently degrades read performance. Lightweight transactions impose Paxos overhead that cripples throughput. This reviewer targets detection heuristics for these distributed-specific pitfalls.

## Audit Surface

- [ ] Partition key with low cardinality (e.g., status, country) causing hot partitions
- [ ] Partition key with monotonically increasing values (timestamp, counter) creating hotspots
- [ ] Frequent DELETE or TTL-based expiration without TWCS or adjusted gc_grace_seconds
- [ ] SizeTieredCompactionStrategy on update-heavy tables (should be LeveledCompactionStrategy)
- [ ] Consistency level ALL or EACH_QUORUM on latency-sensitive reads
- [ ] IF NOT EXISTS or IF conditions (LWT) in write-heavy hot paths
- [ ] Materialized view on a table with high write throughput
- [ ] ALLOW FILTERING in application query code
- [ ] Secondary index on a column with millions of distinct values
- [ ] SELECT * without partition key in WHERE clause
- [ ] Partition size exceeding 100 MB or 100k rows
- [ ] Batch statements spanning multiple partitions
- [ ] Unlogged batch used across partitions for atomicity (not supported)
- [ ] IN clause with large number of partition keys

## Detailed Checks

### Partition Key Design
<!-- activation: keywords=["PRIMARY KEY", "partition key", "clustering", "CREATE TABLE", "hot partition", "cardinality", "bucket", "shard"] -->

- [ ] **Low-cardinality partition key**: flag partition keys with few distinct values (status, boolean, country code) -- all rows with the same partition key land on the same node, creating hot partitions that overload one node while others sit idle
- [ ] **Monotonic partition key**: flag partition keys using raw timestamps, UUIDs v1 sorted by time, or auto-incrementing values -- new writes always target the same partition range, creating a write hotspot on one node
- [ ] **Oversized partitions**: flag data models where a single partition can accumulate >100 MB or >100k rows -- large partitions cause heap pressure, slow reads, and compaction stalls. Add a bucketing component to the partition key
- [ ] **Query without partition key**: flag SELECT statements without the partition key in the WHERE clause -- these become full cluster scans (scatter-gather to all nodes), which is the Cassandra equivalent of a full table scan

### Tombstones and Deletes
<!-- activation: keywords=["DELETE", "TTL", "USING TTL", "tombstone", "gc_grace_seconds", "compaction", "read repair", "null", "expired"] -->

- [ ] **Tombstone accumulation**: flag workloads with frequent DELETEs or TTL expirations without TimeWindowCompactionStrategy (TWCS) -- tombstones are markers that persist until gc_grace_seconds expires and compaction runs; accumulated tombstones slow reads as Cassandra must skip them
- [ ] **Short gc_grace_seconds with repair not running**: flag gc_grace_seconds < 864000 (10 days) without confirmed regular repairs -- if a node is down longer than gc_grace_seconds, deleted data can resurrect when the node rejoins
- [ ] **Null columns as implicit tombstones**: flag INSERT or UPDATE statements that explicitly set columns to null -- Cassandra treats null writes as tombstones, silently accumulating delete markers

### Compaction Strategy
<!-- activation: keywords=["compaction", "SizeTiered", "Leveled", "TimeWindow", "STCS", "LCS", "TWCS", "compaction_strategy"] -->

- [ ] **STCS on update-heavy table**: flag SizeTieredCompactionStrategy on tables with frequent updates to existing rows -- STCS creates multiple versions of the same row across SSTables, causing read amplification. Use LeveledCompactionStrategy for update-heavy workloads
- [ ] **TWCS on non-time-series data**: flag TimeWindowCompactionStrategy on tables without a time-based write pattern -- TWCS assumes data arrives in time order and is deleted/expired by window; random writes break its assumptions
- [ ] **No compaction strategy specified**: flag CREATE TABLE without explicit compaction strategy -- the default (STCS) may not match the workload; be deliberate about the choice

### Consistency Levels and LWT
<!-- activation: keywords=["CONSISTENCY", "QUORUM", "LOCAL_QUORUM", "ALL", "ONE", "ANY", "SERIAL", "LOCAL_SERIAL", "IF NOT EXISTS", "IF EXISTS", "IF ", "lightweight transaction", "LWT", "Paxos"] -->

- [ ] **CL ALL or EACH_QUORUM for reads**: flag consistency level ALL or EACH_QUORUM on read paths -- a single unavailable replica fails the entire read; use LOCAL_QUORUM for strong consistency with fault tolerance
- [ ] **CL ONE for writes that must not be lost**: flag consistency level ONE or ANY for critical writes -- the write is acknowledged by a single replica and can be lost if that node fails before replication
- [ ] **LWT in high-throughput path**: flag IF NOT EXISTS, IF EXISTS, or IF condition on INSERT/UPDATE in hot write paths -- LWT uses Paxos consensus requiring 4 round trips, reducing throughput by 4-10x compared to normal writes
- [ ] **Mixed consistency levels causing read-your-writes violations**: flag patterns where write CL + read CL do not satisfy W + R > N (e.g., write ONE, read ONE with RF=3) -- this allows reading stale data

### Anti-Patterns in Queries
<!-- activation: keywords=["ALLOW FILTERING", "SECONDARY INDEX", "CREATE INDEX", "IN (", "BATCH", "SELECT *", "ORDER BY", "LIMIT", "paging"] -->

- [ ] **ALLOW FILTERING in application code**: flag ALLOW FILTERING in any non-ad-hoc query -- this forces a full partition or cluster scan, which is prohibitively expensive at scale
- [ ] **Secondary index on high-cardinality column**: flag CREATE INDEX on columns with millions of distinct values -- secondary indexes in Cassandra are local to each node and require scatter-gather for high-cardinality lookups
- [ ] **Multi-partition BATCH**: flag BATCH statements that span multiple partition keys -- multi-partition batches use a coordinator log and are slower than individual writes; use unlogged batches only for operations within a single partition
- [ ] **Large IN clause**: flag IN clauses with >10 partition keys -- each value in the IN clause hits a potentially different node, and the coordinator must aggregate all responses

## Common False Positives

- **ALLOW FILTERING in cqlsh ad-hoc queries**: developers querying data manually via cqlsh may use ALLOW FILTERING safely. Flag only when it appears in application code or prepared statements.
- **LWT for idempotent setup operations**: using IF NOT EXISTS for one-time schema or reference data setup is acceptable. Flag only in hot application write paths.
- **Multi-partition BATCH for atomic cross-partition writes**: some use cases genuinely need atomicity across partitions (rare). Note the performance cost but do not flag as incorrect.
- **CL ONE for non-critical telemetry**: analytics and telemetry writes with CL ONE are acceptable when data loss is tolerable.

## Severity Guidance

| Finding | Severity |
|---|---|
| ALLOW FILTERING in application query code | Critical |
| Low-cardinality partition key causing hot partition on high-traffic table | Critical |
| Tombstone accumulation with no compaction strategy to address it | Critical |
| LWT (IF NOT EXISTS/IF condition) in high-throughput write path | Important |
| CL ALL or EACH_QUORUM on latency-sensitive read path | Important |
| Multi-partition BATCH used where individual writes suffice | Important |
| Secondary index on high-cardinality column | Important |
| STCS on update-heavy table causing read amplification | Important |
| Oversized partitions approaching 100 MB without bucketing | Minor |
| Missing explicit compaction strategy on CREATE TABLE | Minor |

## See Also

- `data-sharding-partitioning` -- partition key design in Cassandra is the primary sharding decision
- `data-n-plus-1-and-query-perf` -- N+1 patterns in Cassandra manifest as multiple partition reads that should be denormalized into one
- `db-connection-pooling` -- Cassandra driver connection pools and load balancing policy affect query routing

## Authoritative References

- [Apache Cassandra Documentation: Data Modeling](https://cassandra.apache.org/doc/latest/cassandra/data_modeling/)
- [DataStax: Cassandra Anti-Patterns](https://www.datastax.com/blog/cassandra-anti-patterns-queues-and-queue-datasets)
- [ScyllaDB Documentation: Compaction Strategies](https://docs.scylladb.com/stable/architecture/compaction/compaction-strategies.html)
- [DataStax: Lightweight Transactions](https://docs.datastax.com/en/cassandra-oss/3.x/cassandra/dml/dmlLtwtTransactions.html)
- [The Last Pickle: Cassandra Tombstones](https://thelastpickle.com/blog/2016/07/27/about-deletes-and-tombstones.html)
