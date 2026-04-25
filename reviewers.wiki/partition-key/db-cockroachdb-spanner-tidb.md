---
id: db-cockroachdb-spanner-tidb
type: primary
depth_role: leaf
focus: Detect distributed SQL pitfalls around clock skew, transaction contention, interleaved tables, zone configuration, and the unique performance characteristics of globally distributed ACID databases
parents:
  - index.md
covers:
  - Transaction contention from hot rows in globally distributed deployments
  - Clock skew impact on commit latency in Spanner TrueTime and CockroachDB HLC
  - "Interleaved table deprecation and migration (Spanner) or locality optimizations"
  - "Zone config and placement rules not matching read/write geography"
  - Sequential primary keys causing range hotspots
  - Implicit transactions with retry logic missing
  - Large transactions exceeding distributed transaction size limits
  - Cross-region reads without follower reads or stale read options
tags:
  - cockroachdb
  - spanner
  - tidb
  - distributed-sql
  - clock-skew
  - transaction-contention
  - zone-config
  - hotspot
  - global-database
  - newSQL
activation:
  file_globs:
    - "**/*cockroach*"
    - "**/*spanner*"
    - "**/*tidb*"
    - "**/*crdb*"
    - "**/*.sql"
    - "**/terraform*"
    - "**/*migration*"
  keyword_matches:
    - cockroachdb
    - cockroach
    - CockroachDB
    - spanner
    - Spanner
    - tidb
    - TiDB
    - distributed SQL
    - CRDB
    - crdb
    - TrueTime
    - HLC
    - hybrid logical clock
    - zone config
    - REGIONAL
    - GLOBAL
    - follower read
    - AS OF SYSTEM TIME
    - AUTO_RANDOM
    - interleave
    - tikv
    - placement
source:
  origin: file
  path: db-cockroachdb-spanner-tidb.md
  hash: "sha256:4b4f07b928ecf63f1b99b11b5f522402019d2285f3e77d0eb3c23ce6c80aba82"
---
# CockroachDB / Spanner / TiDB Pitfalls

## When This Activates

Activates on diffs involving CockroachDB, Google Cloud Spanner, or TiDB queries, schema definitions, or configuration. Distributed SQL databases provide global ACID transactions but introduce pitfalls absent in single-node databases: sequential keys create range hotspots on a single node. Cross-region transactions pay multi-RTT latency. Transaction contention on hot rows is amplified by global consensus. Clock synchronization (TrueTime, HLC) adds commit latency. Schema changes behave differently than in PostgreSQL or MySQL. This reviewer targets detection heuristics for distributed-SQL-specific correctness and performance pitfalls.

## Audit Surface

- [ ] Auto-incrementing or sequential primary key causing write hotspots
- [ ] Transaction retry logic missing for serialization errors (40001)
- [ ] Cross-region query without follower reads or bounded staleness
- [ ] Zone configuration placing replicas far from primary read/write region
- [ ] Large transaction modifying >64 MB or >10k rows (CockroachDB limit)
- [ ] SELECT FOR UPDATE in distributed context without understanding latency cost
- [ ] Interleaved tables (Spanner) used despite deprecation
- [ ] TiDB specific: AUTO_RANDOM not used for hot-key avoidance
- [ ] Schema change (DDL) run without understanding online DDL behavior
- [ ] Implicit single-statement transaction without awareness of automatic retries
- [ ] Multi-region table without REGIONAL BY ROW or GLOBAL designation
- [ ] Foreign key constraints causing cross-region lookups on every write
- [ ] EXPLAIN ANALYZE not used to verify distributed query plan

## Detailed Checks

### Primary Key and Hotspot Avoidance
<!-- activation: keywords=["PRIMARY KEY", "SERIAL", "AUTO_INCREMENT", "UUID", "uuid", "UNIQUE", "sequential", "hotspot", "AUTO_RANDOM", "gen_random_uuid", "SPLIT AT", "hash-sharded"] -->

- [ ] **Sequential primary key**: flag `SERIAL`, `AUTO_INCREMENT`, or timestamp-based primary keys -- sequential keys insert all new rows into the same range, creating a write hotspot on one node. Use UUID v4 (`gen_random_uuid()`), hash-sharded indexes (CockroachDB), or `AUTO_RANDOM` (TiDB)
- [ ] **Missing hash-sharded index**: flag CockroachDB tables with monotonically increasing index columns without `USING HASH` -- hash-sharded indexes distribute sequential values across ranges
- [ ] **SPLIT AT not planned for known hot ranges**: flag tables with predictable high-traffic key ranges without `ALTER TABLE ... SPLIT AT` pre-splitting -- without pre-splitting, the single initial range absorbs all traffic until CockroachDB auto-splits under load

### Transaction Retries and Contention
<!-- activation: keywords=["transaction", "BEGIN", "COMMIT", "ROLLBACK", "RETRY", "retry", "40001", "serialization", "contention", "SAVEPOINT", "cockroach_restart", "AS OF SYSTEM TIME", "SELECT FOR UPDATE", "FOR UPDATE"] -->

- [ ] **Missing retry loop for serialization errors**: flag transaction code without retry logic for SQLSTATE 40001 -- distributed SQL databases use optimistic concurrency and abort transactions on contention; the application must retry with exponential backoff
- [ ] **CockroachDB retry without SAVEPOINT**: flag CockroachDB transaction retry logic that does not use `SAVEPOINT cockroach_restart` and `ROLLBACK TO SAVEPOINT cockroach_restart` -- CockroachDB's retry protocol requires savepoints to reuse the same transaction
- [ ] **SELECT FOR UPDATE across regions**: flag `SELECT ... FOR UPDATE` on data with leaseholders in another region -- locking across regions adds 2+ RTTs of latency per lock acquisition, creating significant tail latency
- [ ] **Large transaction exceeding limits**: flag transactions modifying >64 MB of data (CockroachDB) or >10 MB per Spanner commit -- exceeding limits causes transaction aborts that are expensive to retry

### Multi-Region and Zone Configuration
<!-- activation: keywords=["zone", "ZONE", "region", "REGIONAL", "GLOBAL", "locality", "placement", "replica", "leaseholder", "follower read", "stale read", "bounded staleness", "AS OF SYSTEM TIME", "multi-region"] -->

- [ ] **No multi-region table configuration**: flag tables in multi-region CockroachDB clusters without `REGIONAL BY ROW`, `REGIONAL BY TABLE`, or `GLOBAL` designation -- without explicit locality, data placement is determined by default zone config, which may place leaseholders far from readers
- [ ] **Cross-region reads without staleness options**: flag read queries in multi-region deployments that always read from the leaseholder -- use follower reads (`AS OF SYSTEM TIME follower_read_timestamp()`) or bounded staleness for reads that tolerate slight staleness, reducing cross-region latency from hundreds to single-digit milliseconds
- [ ] **Foreign key to different region**: flag foreign key constraints where the parent table's leaseholder is in a different region from the child -- every INSERT or UPDATE must validate the FK across regions, adding RTT latency to every write

### Schema Changes and DDL
<!-- activation: keywords=["ALTER TABLE", "ADD COLUMN", "DROP COLUMN", "CREATE INDEX", "DROP INDEX", "schema change", "DDL", "online", "migration", "backfill"] -->

- [ ] **DDL behavior differences from single-node**: flag schema changes written for PostgreSQL/MySQL assumptions without verifying distributed behavior -- CockroachDB and TiDB perform online schema changes that may take longer and behave differently (e.g., CockroachDB rolls out changes across ranges incrementally)
- [ ] **Concurrent schema changes**: flag multiple DDL statements running concurrently on the same table -- distributed databases may serialize or conflict on concurrent schema changes differently than single-node databases
- [ ] **Spanner interleaved tables**: flag `INTERLEAVE IN PARENT` in Spanner schemas -- interleaved tables are deprecated in favor of foreign keys; existing interleaved tables should be migrated

### TiDB-Specific Pitfalls
<!-- activation: keywords=["tidb", "TiDB", "tikv", "AUTO_RANDOM", "tiflash", "coprocessor", "GC", "safe point", "placement rule"] -->

- [ ] **AUTO_INCREMENT without AUTO_RANDOM**: flag TiDB tables using `AUTO_INCREMENT` for primary keys without `AUTO_RANDOM` -- `AUTO_INCREMENT` creates write hotspots on TiKV; `AUTO_RANDOM` distributes writes across regions
- [ ] **TiFlash not leveraged for analytics**: flag analytics queries on TiDB without TiFlash replicas -- TiFlash provides columnar storage for OLAP queries; running analytics on TiKV row-store is suboptimal
- [ ] **GC safe point blocking long transactions**: flag long-running read transactions without awareness of TiDB's GC safe point -- transactions running longer than the GC lifetime cause GC to block, accumulating MVCC versions

## Common False Positives

- **Sequential keys for time-series append-only**: some time-series workloads intentionally use sequential keys with pre-split ranges. Flag only without pre-splitting or hash-sharding.
- **Single-region deployment**: distributed SQL databases in single-region deployments do not suffer cross-region latency. Flag multi-region pitfalls only for multi-region clusters.
- **Automatic retries for implicit transactions**: CockroachDB automatically retries single-statement implicit transactions. Flag missing retry logic only for explicit multi-statement transactions.
- **Spanner interleaved tables in existing schemas**: interleaved tables in production Spanner schemas may be intentional legacy. Flag for new schemas; note migration path for existing ones.

## Severity Guidance

| Finding | Severity |
|---|---|
| Sequential primary key causing write hotspot on high-traffic table | Critical |
| Missing transaction retry logic for serialization errors (40001) | Critical |
| Large transaction exceeding 64 MB limit (CockroachDB) or 10 MB (Spanner) | Important |
| Cross-region reads without follower reads on latency-sensitive path | Important |
| Foreign key constraint causing cross-region validation on every write | Important |
| SELECT FOR UPDATE across regions adding multi-RTT latency | Important |
| TiDB AUTO_INCREMENT without AUTO_RANDOM on write-heavy table | Important |
| No multi-region table configuration in multi-region cluster | Minor |
| Spanner interleaved tables (deprecated) in new schema | Minor |
| DDL behavior assumed identical to single-node PostgreSQL | Minor |

## See Also

- `db-postgres` -- CockroachDB and TiDB are PostgreSQL/MySQL wire-compatible; many Postgres/MySQL pitfalls also apply
- `data-sharding-partitioning` -- range-based data distribution in distributed SQL is an automatic sharding strategy
- `data-schema-migrations` -- online DDL behavior in distributed databases differs from single-node migration strategies
- `db-connection-pooling` -- connection pooling for distributed SQL must account for multi-node topology

## Authoritative References

- [CockroachDB Documentation: Transaction Retry](https://www.cockroachlabs.com/docs/stable/transactions#transaction-retries)
- [CockroachDB Documentation: Multi-Region Capabilities](https://www.cockroachlabs.com/docs/stable/multiregion-overview)
- [Google Cloud Spanner Documentation: Schema Design Best Practices](https://cloud.google.com/spanner/docs/schema-design)
- [TiDB Documentation: AUTO_RANDOM](https://docs.pingcap.com/tidb/stable/auto-random)
- [CockroachDB Documentation: Hash-Sharded Indexes](https://www.cockroachlabs.com/docs/stable/hash-sharded-indexes)
- [Google Cloud Spanner: Avoiding Hotspots](https://cloud.google.com/spanner/docs/schema-design#primary-key-prevent-hotspots)
