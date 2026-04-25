---
id: db-redshift
type: primary
depth_role: leaf
focus: "Detect Redshift pitfalls around distribution keys, sort keys, VACUUM/ANALYZE maintenance, WLM queue configuration, Spectrum external table misuse, and encoding selection"
parents:
  - index.md
covers:
  - Distribution key mismatch causing data shuffling on JOINs
  - Sort key not matching query filter and ORDER BY patterns
  - Missing VACUUM causing unsorted regions and deleted row ghosts
  - ANALYZE not run after significant data loads
  - WLM queue misconfiguration causing query queueing or memory exhaustion
  - Spectrum external tables used for latency-sensitive queries
  - "Encoding (compression) not specified or auto-selected suboptimally"
  - COPY command without manifest or error handling
tags:
  - redshift
  - aws
  - distribution-key
  - sort-key
  - vacuum
  - analyze
  - wlm
  - spectrum
  - encoding
  - copy
  - data-warehouse
activation:
  file_globs:
    - "**/*redshift*"
    - "**/*.sql"
    - "**/terraform*"
    - "**/dbt*"
    - "**/*warehouse*"
    - "**/*analytics*"
  keyword_matches:
    - redshift
    - Redshift
    - DISTKEY
    - DISTSTYLE
    - SORTKEY
    - COMPOUND
    - INTERLEAVED
    - VACUUM
    - ANALYZE
    - WLM
    - concurrency scaling
    - Spectrum
    - external table
    - COPY
    - UNLOAD
    - svv_
    - stl_
    - stv_
    - pg_catalog
    - ENCODE
    - AZ64
    - LZO
    - ZSTD
source:
  origin: file
  path: db-redshift.md
  hash: "sha256:6d869702fca6879b4428bba45102a854f4c13faf2cde94b2e21b629b9d99cf43"
---
# Redshift Pitfalls

## When This Activates

Activates on diffs involving Redshift SQL, table definitions, dbt models, Terraform resources, or COPY/UNLOAD operations. Redshift's MPP (Massively Parallel Processing) architecture distributes data across slices using distribution keys. Wrong distribution keys cause network-intensive data redistribution on every JOIN. Missing sort keys force full-table scans. VACUUM and ANALYZE are not automatic by default and must be scheduled. WLM queue misconfiguration causes query queueing under concurrency. This reviewer targets detection heuristics for Redshift-specific distribution, sort, and operational pitfalls.

## Audit Surface

- [ ] Table without explicit DISTKEY or using DISTSTYLE EVEN for JOIN-heavy workload
- [ ] Large table JOIN where neither table is distributed on the JOIN key
- [ ] Sort key columns not matching the most common WHERE or ORDER BY clauses
- [ ] Compound sort key with wrong column order
- [ ] Interleaved sort key on table with frequent loads (expensive VACUUM)
- [ ] VACUUM not scheduled after DELETE-heavy workloads
- [ ] ANALYZE not run after loading >10% new data
- [ ] WLM queue with too many concurrent slots and insufficient memory per slot
- [ ] Spectrum query on small files (<128 MB) or many files in hot path
- [ ] Column encoding set to RAW (no compression) on large text columns
- [ ] COPY without MANIFEST or with ACCEPTINVCHARS silently corrupting data
- [ ] Leader-node-only functions used on compute-intensive queries
- [ ] UNLOAD without parallel off for downstream consumers expecting single file
- [ ] Cross-database query without understanding compute implications

## Detailed Checks

### Distribution Key Design
<!-- activation: keywords=["DISTKEY", "DISTSTYLE", "EVEN", "KEY", "ALL", "AUTO", "distribution", "redistribute", "broadcast", "DS_DIST", "DS_BCAST"] -->

- [ ] **DISTSTYLE EVEN on JOIN-heavy table**: flag large tables with DISTSTYLE EVEN that are frequently joined -- EVEN distributes rows round-robin across slices; JOINs require redistributing data over the network (DS_DIST_INNER, DS_DIST_OUTER in EXPLAIN)
- [ ] **Distribution key mismatch on JOIN**: flag JOINs between two large tables where the JOIN column is not the DISTKEY of at least one table -- Redshift must redistribute one or both tables across slices, which is the most expensive operation in a query plan
- [ ] **DISTSTYLE ALL on large table**: flag DISTSTYLE ALL on tables >10 GB -- ALL copies the entire table to every slice, consuming memory and slowing COPY loads. Use ALL only for small dimension tables (<10M rows)
- [ ] **No distribution key specified**: flag CREATE TABLE without explicit DISTKEY or DISTSTYLE -- Redshift chooses AUTO, which may not be optimal for the query pattern

### Sort Key Design
<!-- activation: keywords=["SORTKEY", "COMPOUND", "INTERLEAVED", "sort", "unsorted", "zone map", "min/max", "block", "1MB"] -->

- [ ] **Missing sort key on filtered table**: flag tables >100 GB without sort keys that are frequently filtered by WHERE clause -- sort keys enable zone map filtering; without them, every query scans all 1 MB blocks
- [ ] **Compound sort key column order**: flag compound sort keys where the first column is not the most commonly filtered column -- compound sort keys are effective only when the query filters on a prefix of the key columns
- [ ] **Interleaved sort key on frequently loaded table**: flag interleaved sort keys on tables with frequent incremental loads -- VACUUM REINDEX on interleaved sort keys is extremely expensive and must be run regularly to maintain zone map effectiveness
- [ ] **High unsorted percentage**: flag tables with >20% unsorted rows (visible in svv_table_info) -- unsorted regions bypass zone maps, degrading query performance

### VACUUM and ANALYZE
<!-- activation: keywords=["VACUUM", "ANALYZE", "unsorted", "statistics", "stale", "auto_analyze", "auto_vacuum", "VACUUM REINDEX", "VACUUM DELETE ONLY", "VACUUM SORT ONLY"] -->

- [ ] **No VACUUM schedule**: flag tables with DELETE or UPDATE operations without a scheduled VACUUM -- deleted rows leave ghosts that are scanned but not returned, wasting I/O; unsorted regions from INSERTs bypass zone maps
- [ ] **ANALYZE not run after bulk load**: flag COPY or INSERT INTO ... SELECT that adds >10% of table size without subsequent ANALYZE -- stale statistics cause the query planner to choose suboptimal join strategies and scan methods
- [ ] **VACUUM FULL on large table during peak hours**: flag VACUUM (full reclaim) on tables >100 GB during query-serving hours -- VACUUM FULL acquires a table-level lock and can run for hours

### WLM and Concurrency
<!-- activation: keywords=["WLM", "queue", "concurrency", "slot", "memory", "query_group", "wlm_query_slot_count", "concurrency scaling", "short query acceleration", "SQA"] -->

- [ ] **Too many WLM slots**: flag WLM queues with >15 concurrent query slots -- each slot gets a fraction of available memory; too many slots cause each query to spill to disk
- [ ] **No short query acceleration**: flag WLM configurations without Short Query Acceleration (SQA) enabled -- SQA routes quick queries to a fast lane, preventing them from queueing behind long-running analytics
- [ ] **No concurrency scaling for burst workloads**: flag clusters with bursty query patterns without concurrency scaling enabled -- queries queue when all slots are occupied during peak

### Spectrum and COPY
<!-- activation: keywords=["Spectrum", "external table", "external schema", "COPY", "UNLOAD", "MANIFEST", "ACCEPTINVCHARS", "MAXERROR", "COMPUPDATE", "ENCODING", "RAW", "AZ64", "LZO", "ZSTD"] -->

- [ ] **Spectrum on small files**: flag Spectrum external tables pointing to many small files (<128 MB each) -- Spectrum is optimized for large files; many small files incur per-file overhead that dominates query time. Compact files to 128 MB-1 GB
- [ ] **COPY without MANIFEST**: flag COPY from S3 without a MANIFEST file when data completeness matters -- without a MANIFEST, COPY loads all files matching the prefix, which can include partial or duplicate files
- [ ] **ENCODE RAW on large columns**: flag VARCHAR or TEXT columns with ENCODE RAW (no compression) -- RAW encoding wastes storage and I/O bandwidth; AZ64 or ZSTD typically compress text 3-10x

## Common False Positives

- **DISTSTYLE EVEN for isolated tables**: tables that are never joined or are always the small side of a broadcast join do not need a distribution key. Flag only for JOIN-heavy patterns.
- **Interleaved sort key on append-only tables**: interleaved sort keys on tables that receive only appends (no deletes) need less frequent VACUUM REINDEX. Flag only when deletes are present.
- **VACUUM during maintenance window**: scheduled VACUUM during off-peak hours is the correct approach. Flag only when VACUUM is never scheduled or runs during peak.
- **Small external tables via Spectrum**: Spectrum for infrequently queried archive data is cost-effective regardless of file size. Flag only for latency-sensitive hot paths.

## Severity Guidance

| Finding | Severity |
|---|---|
| Distribution key mismatch causing redistribution on high-frequency large-table JOIN | Critical |
| No VACUUM schedule on table with frequent deletes (ghost row accumulation) | Critical |
| Missing sort key on >100 GB table with filtered queries | Important |
| WLM queue with >15 slots causing disk spill | Important |
| ANALYZE not run after bulk load (stale statistics) | Important |
| COPY without MANIFEST for critical data loads | Important |
| ENCODE RAW on large VARCHAR columns | Minor |
| Spectrum on many small files in hot query path | Minor |
| Interleaved sort key on table with frequent loads | Minor |

## See Also

- `data-n-plus-1-and-query-perf` -- N+1 patterns in Redshift manifest as repeated small queries instead of batch CTEs
- `data-sharding-partitioning` -- distribution key design is the primary data distribution strategy in Redshift
- `db-bigquery` -- BigQuery comparison for similar warehouse partitioning and cost pitfalls
- `db-snowflake` -- Snowflake comparison for similar warehouse sizing and clustering decisions

## Authoritative References

- [AWS Redshift Documentation: Distribution Styles](https://docs.aws.amazon.com/redshift/latest/dg/c_choosing_dist_sort.html)
- [AWS Redshift Documentation: Sort Keys](https://docs.aws.amazon.com/redshift/latest/dg/t_Sorting_data.html)
- [AWS Redshift Documentation: VACUUM](https://docs.aws.amazon.com/redshift/latest/dg/r_VACUUM_command.html)
- [AWS Redshift Documentation: WLM Configuration](https://docs.aws.amazon.com/redshift/latest/dg/cm-c-implementing-workload-management.html)
- [AWS Redshift Documentation: Amazon Redshift Spectrum](https://docs.aws.amazon.com/redshift/latest/dg/c-using-spectrum.html)
