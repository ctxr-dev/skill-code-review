---
id: data-sharding-partitioning
type: primary
depth_role: leaf
focus: Detect wrong shard keys, hot partitions, cross-shard query patterns, missing rebalancing strategies, and partition pruning failures
parents:
  - index.md
covers:
  - Shard key with low cardinality causing uneven data distribution
  - Monotonically increasing shard key creating write hotspot on one shard
  - Query pattern that requires cross-shard scatter-gather on most requests
  - No rebalancing or resharding strategy documented
  - Partition pruning not possible because queries lack the partition key
  - Range partition boundaries creating uneven partition sizes
  - Hash partitioning used where range queries on the partition key are needed
  - Missing partition key in WHERE clause forcing full partition scan
  - Global secondary index without understanding cross-partition cost
  - Shard key that changes after record creation causing data migration
tags:
  - sharding
  - partitioning
  - shard-key
  - hot-partition
  - rebalancing
  - scatter-gather
  - data-architecture
activation:
  file_globs:
    - "**/*shard*"
    - "**/*partition*"
    - "**/*migration*"
    - "**/*.sql"
    - "**/*schema*"
    - "**/*table*"
    - "**/*dynamo*"
    - "**/*cassandra*"
    - "**/*cockroach*"
    - "**/*vitess*"
    - "**/*citus*"
    - "**/*spanner*"
  keyword_matches:
    - shard
    - partition
    - PARTITION BY
    - shard_key
    - partition_key
    - hash
    - range
    - list
    - DISTRIBUTE BY
    - CLUSTERED BY
    - split
    - rebalance
    - resharding
    - scatter
    - gather
    - hot
    - skew
    - DynamoDB
    - Cassandra
    - CockroachDB
    - Vitess
    - Citus
    - Spanner
  structural_signals:
    - partition_definition
    - shard_key_configuration
    - distributed_table_creation
source:
  origin: file
  path: data-sharding-partitioning.md
  hash: "sha256:6481ee2cc55177861d0799563c4c2d7d727fc064942f7b61cecb1ee03904163b"
---
# Sharding and Partitioning

## When This Activates

Activates on diffs involving partitioned table definitions, shard key configurations, distributed table creation (Citus, Vitess, CockroachDB, Spanner), DynamoDB/Cassandra partition key design, or queries against sharded/partitioned tables. Sharding and partitioning distribute data across physical storage units for scalability, but a wrong shard key or partition strategy causes catastrophic performance problems: hot partitions concentrate load on one node, cross-shard queries add latency on every request, and missing partition pruning negates the benefit of partitioning entirely. This reviewer detects these data distribution mistakes.

## Audit Surface

- [ ] Shard key chosen with fewer than 1000 distinct values for a table with millions of rows
- [ ] Auto-increment ID or timestamp used as sole shard key (monotonic hotspot)
- [ ] Application query joining data across shards or partitions
- [ ] No documented resharding or rebalancing procedure
- [ ] Query on partitioned table without partition key in WHERE clause
- [ ] Range partitions with uneven data distribution across boundaries
- [ ] Hash partitioning on a column frequently used in range queries
- [ ] Update to a column that is part of the shard or partition key
- [ ] Global secondary index on a sharded table without cost analysis
- [ ] Cross-shard transaction or distributed JOIN
- [ ] Shard count that is not a power of two or prime (complicating future resharding)
- [ ] Partition maintenance (adding future partitions) not automated

## Detailed Checks

### Shard Key Selection
<!-- activation: keywords=["shard", "shard_key", "partition_key", "distribute", "hash", "cardinality", "key", "primary", "cluster", "bucket"] -->

- [ ] **Low-cardinality shard key**: flag shard keys with fewer distinct values than shards (e.g., sharding by country code across 256 shards) -- low cardinality means many shards receive no data while others are overloaded
- [ ] **Monotonic shard key**: flag auto-increment IDs, timestamps, or sequential values used as the sole shard key -- all new writes target the shard owning the highest key range, creating a write hotspot
- [ ] **Mutable shard key**: flag shard or partition key columns that can be updated after row creation -- changing the shard key requires moving the row between shards, which is expensive and error-prone
- [ ] **Shard key not in common queries**: flag shard keys that do not appear in the WHERE clause of the most frequent queries -- queries that cannot include the shard key must scatter across all shards
- [ ] **Compound shard key imbalance**: flag compound shard keys where the leading component has low cardinality (e.g., status + user_id) -- the leading component dominates distribution

### Hot Partition Detection
<!-- activation: keywords=["hot", "skew", "imbalance", "uneven", "distribution", "load", "throughput", "throttle", "capacity", "overload"] -->

- [ ] **Write hotspot**: flag partition designs where a temporal or sequential pattern concentrates writes on one partition (e.g., current-month partition receives all writes) -- the hotspot limits write throughput to one node's capacity
- [ ] **Skewed range partitions**: flag range partition boundaries that create uneven data distribution (e.g., alphabetical ranges A-M / N-Z when 70% of keys start with A-M) -- design boundaries based on data distribution, not intuition
- [ ] **Single-tenant hot partition**: flag multi-tenant partition designs where one large tenant dominates a partition -- use tenant-aware sub-partitioning or dedicated partitions for large tenants
- [ ] **DynamoDB hot partition key**: flag DynamoDB table designs where the partition key has insufficient cardinality or where a few key values receive disproportionate traffic -- DynamoDB throttles at the partition level

### Cross-Shard Query Patterns
<!-- activation: keywords=["cross", "scatter", "gather", "join", "distributed", "fan-out", "broadcast", "multi-shard", "global", "secondary index", "GSI"] -->

- [ ] **Cross-shard JOIN**: flag SQL JOINs that must touch multiple shards to produce results -- cross-shard joins add network round trips and coordination overhead; co-locate related data on the same shard
- [ ] **Scatter-gather on hot path**: flag queries in request-serving code that require scatter-gather across all shards (no shard key in WHERE) -- these queries scale inversely with shard count
- [ ] **Global secondary index cost**: flag global secondary indexes on sharded tables without documented analysis of the cross-partition write amplification -- every write to the base table must update the global index across shards
- [ ] **Cross-shard transaction**: flag distributed transactions spanning multiple shards -- cross-shard transactions require two-phase commit and significantly increase latency and failure modes

### Partition Pruning
<!-- activation: keywords=["partition", "prune", "PARTITION BY", "RANGE", "LIST", "HASH", "WHERE", "scan", "all partitions", "explain"] -->

- [ ] **Query without partition key**: flag queries on partitioned tables that do not include the partition key column in the WHERE clause -- the database must scan all partitions, negating the partitioning benefit
- [ ] **Hash partition with range query**: flag hash-partitioned columns used in range queries (BETWEEN, >, <) -- hash partitioning destroys ordering; range queries must scan all partitions; use range partitioning for range query patterns
- [ ] **Partition maintenance not automated**: flag range-partitioned tables (especially by date) with no automated process for creating future partitions -- if the next partition does not exist when data arrives, inserts fail or land in a default catch-all partition
- [ ] **Too many partitions**: flag tables with >10,000 partitions -- excessive partitions increase planning overhead and metadata management cost

### Rebalancing and Growth
<!-- activation: keywords=["rebalance", "reshard", "migrate", "split", "merge", "grow", "scale", "add shard", "consistent hashing", "virtual node"] -->

- [ ] **No resharding plan**: flag sharded systems with no documented procedure for adding or removing shards -- growth is inevitable; without a resharding plan, scaling requires downtime
- [ ] **Fixed shard count with no virtual sharding**: flag shard configurations with a fixed shard count and no virtual shard or consistent hashing layer -- adding physical shards requires remapping all data
- [ ] **Resharding requires full data migration**: flag shard key designs that require moving all data when adding shards -- use consistent hashing or virtual shards to minimize data movement during resharding

## Common False Positives

- **Single-node partitioning for maintenance**: partitioning a table on a single database node for maintenance operations (dropping old partitions) is valid even without distribution concerns. Do not flag as a sharding issue.
- **Small tables**: tables under 10 million rows rarely need sharding. Partitioning for maintenance (TTL, archival) is still valid.
- **Analytics scatter-gather**: analytical queries that intentionally scan all partitions (nightly aggregations, reporting) are expected. Flag only scatter-gather in latency-sensitive request-serving paths.
- **Managed auto-sharding**: services like DynamoDB with adaptive capacity and Spanner with automatic splits handle some distribution concerns. Flag only explicit misconfigurations.

## Severity Guidance

| Finding | Severity |
|---|---|
| Monotonic shard key concentrating all writes on one shard | Critical |
| Cross-shard scatter-gather query in request-serving hot path | Critical |
| Shard key with lower cardinality than shard count | Critical |
| Query on partitioned table without partition key in WHERE clause (hot path) | Important |
| Mutable shard key column allowing post-creation updates | Important |
| Cross-shard distributed transaction | Important |
| No resharding or rebalancing plan documented | Important |
| Hash partitioning on column used in range queries | Important |
| Range partitions with highly skewed data distribution | Minor |
| Partition maintenance not automated for time-range partitions | Minor |
| Fixed shard count with no virtual sharding layer | Minor |

## See Also

- `data-relational-modeling` -- correct relational modeling is a prerequisite; partitioning a badly modeled table compounds the problem
- `data-n-plus-1-and-query-perf` -- cross-shard N+1 queries are exponentially worse than single-database N+1
- `data-time-series-modeling` -- time-series data is the most common use case for time-range partitioning
- `principle-separation-of-concerns` -- shard key selection encodes data access concerns into the physical layout

## Authoritative References

- [Martin Kleppmann, *Designing Data-Intensive Applications* (2017), Chapter 6: "Partitioning"](https://dataintensive.net/)
- [Rick Houlihan, "Advanced Design Patterns for DynamoDB" (re:Invent 2018) -- partition key design](https://www.youtube.com/watch?v=HaEPXoXVf2k)
- [Vitess Documentation, "Sharding" and "VSchema"](https://vitess.io/docs/)
- [CockroachDB Documentation, "Partitioning" and "Multi-Region"](https://www.cockroachlabs.com/docs/)
- [Cassandra Documentation, "Partition Key Design"](https://cassandra.apache.org/doc/latest/)
