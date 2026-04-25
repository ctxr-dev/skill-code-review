---
id: db-snowflake
type: primary
depth_role: leaf
focus: Detect Snowflake pitfalls around warehouse sizing, clustering keys, zero-copy clones, time travel cost, external tables, and UDF security boundaries
parents:
  - index.md
covers:
  - Warehouse sizing mismatch for query complexity and concurrency
  - Clustering keys not defined or misaligned with query filters
  - Zero-copy clones used without understanding storage cost implications after divergence
  - Time travel retention set too high consuming excessive storage
  - External tables without schema validation or access control
  - UDFs with unrestricted network or file system access
  - "Queries queueing due to warehouse auto-suspend/resume latency"
  - Large result sets not using result caching
tags:
  - snowflake
  - warehouse
  - clustering-key
  - zero-copy-clone
  - time-travel
  - external-table
  - udf
  - cost-control
  - data-warehouse
activation:
  file_globs:
    - "**/*snowflake*"
    - "**/*.sql"
    - "**/dbt*"
    - "**/terraform*"
    - "**/*warehouse*"
    - "**/*analytics*"
  keyword_matches:
    - snowflake
    - Snowflake
    - warehouse
    - CLUSTER BY
    - clustering
    - zero-copy
    - clone
    - time travel
    - DATA_RETENTION
    - UNDROP
    - external table
    - stage
    - COPY INTO
    - UDF
    - UDTF
    - snowpark
    - snowpipe
    - task
    - stream
    - result_scan
    - ACCOUNT_USAGE
source:
  origin: file
  path: db-snowflake.md
  hash: "sha256:d076ca6b8cf49adfc049258342655690f029b5dc08d4cfd0e092401148d9850b"
---
# Snowflake Pitfalls

## When This Activates

Activates on diffs involving Snowflake SQL, warehouse configuration, dbt models, Terraform resources, or Snowpark code. Snowflake's separation of storage and compute, auto-scaling warehouses, and micro-partitioning create unique cost and performance pitfalls: oversized warehouses burn credits on simple queries. Missing clustering keys cause full micro-partition scans on large tables. Zero-copy clones become expensive once writes diverge. Time travel retention on non-critical data wastes storage. UDFs can become security boundaries when external access is granted. This reviewer targets detection heuristics for Snowflake-specific cost, performance, and security pitfalls.

## Audit Surface

- [ ] Warehouse size too large for simple queries or too small for complex joins
- [ ] Multi-cluster warehouse not enabled for high-concurrency workloads
- [ ] Large table (>1 TB) without clustering keys
- [ ] Query filtering on columns not included in clustering key
- [ ] Zero-copy clone assumed to be free after extensive DML divergence
- [ ] Time travel DATA_RETENTION_TIME_IN_DAYS set to 90 on non-critical tables
- [ ] External table on S3/GCS/ADLS without file format validation
- [ ] JavaScript or Python UDF with access to external network
- [ ] Warehouse auto-suspend set too aggressively (cache eviction) or too long (cost)
- [ ] Query result caching disabled (USE_CACHED_RESULT = FALSE)
- [ ] COPY INTO without ON_ERROR = ABORT_STATEMENT for critical loads
- [ ] Materialized view not leveraged for repeated expensive aggregations
- [ ] Transient table used for data requiring fail-safe protection
- [ ] SELECT * in views or downstream queries on wide tables

## Detailed Checks

### Warehouse Sizing and Configuration
<!-- activation: keywords=["warehouse", "WAREHOUSE", "CREATE WAREHOUSE", "ALTER WAREHOUSE", "XSMALL", "SMALL", "MEDIUM", "LARGE", "XLARGE", "2XLARGE", "auto_suspend", "auto_resume", "multi_cluster", "scaling_policy", "concurrency"] -->

- [ ] **Oversized warehouse for simple queries**: flag warehouses sized LARGE or above running primarily simple SELECT or aggregation queries on <100 GB -- each size doubles cost; right-sizing saves 50%+ of compute credits
- [ ] **Auto-suspend too long**: flag `auto_suspend` > 300 seconds (5 minutes) for interactive warehouses -- idle warehouses consume credits; 60-120 seconds is typical for interactive workloads
- [ ] **Auto-suspend too aggressive for data-heavy queries**: flag `auto_suspend` < 60 seconds on warehouses running repeated queries on the same data -- aggressive suspension evicts the warehouse cache, forcing cold reads on every query
- [ ] **No multi-cluster for concurrent users**: flag single-cluster warehouses serving >10 concurrent users -- queries queue when the warehouse is busy; multi-cluster warehouses auto-scale to handle concurrency

### Clustering Keys
<!-- activation: keywords=["CLUSTER BY", "clustering", "micro-partition", "pruning", "SYSTEM$CLUSTERING_INFORMATION", "recluster", "AUTOMATIC_CLUSTERING"] -->

- [ ] **Large table without clustering**: flag tables >1 TB without clustering keys -- Snowflake's automatic micro-partitioning may not align with query filter patterns on large tables, causing full scans
- [ ] **Clustering key mismatch**: flag clustering keys that do not match the most common WHERE clause columns -- queries filtering on non-clustered columns must scan all micro-partitions
- [ ] **Too many clustering columns**: flag clustering keys with >4 columns -- each additional column reduces clustering effectiveness; prioritize the most selective filter columns

### Zero-Copy Clones and Time Travel
<!-- activation: keywords=["clone", "CLONE", "CREATE TABLE ... CLONE", "CREATE DATABASE ... CLONE", "time travel", "DATA_RETENTION_TIME_IN_DAYS", "UNDROP", "fail-safe", "transient", "temporary"] -->

- [ ] **Clone cost assumption**: flag documentation or comments assuming zero-copy clones remain free indefinitely -- after cloning, any DML on either the source or clone creates new micro-partitions that are charged separately; heavy DML post-clone can double storage costs
- [ ] **Excessive time travel on non-critical data**: flag `DATA_RETENTION_TIME_IN_DAYS` set to 90 days on staging, temporary, or non-critical tables -- time travel stores historical micro-partitions; 90 days of retention on high-churn tables significantly increases storage cost
- [ ] **Transient table for critical data**: flag transient tables (no fail-safe period) used for data that cannot be recreated -- transient tables save storage cost but provide no fail-safe recovery after time travel expires

### External Tables and Security
<!-- activation: keywords=["external table", "EXTERNAL TABLE", "stage", "STAGE", "COPY INTO", "snowpipe", "UDF", "UDTF", "JavaScript", "Python", "snowpark", "EXTERNAL ACCESS", "NETWORK POLICY"] -->

- [ ] **External table without validation**: flag external tables on S3/GCS/ADLS without explicit file format, schema validation, or error handling -- malformed files cause query failures or silent data corruption
- [ ] **COPY INTO without error handling**: flag `COPY INTO` without `ON_ERROR = ABORT_STATEMENT` or explicit error handling for critical data loads -- default behavior (`ABORT_STATEMENT` for `COPY INTO`) may vary by client; be explicit
- [ ] **UDF with external access**: flag JavaScript or Python UDFs with EXTERNAL ACCESS INTEGRATION -- these UDFs can reach external networks, potentially exfiltrating data or introducing supply chain risks. Review the access policy and allowed endpoints
- [ ] **No network policy**: flag Snowflake accounts without network policies restricting IP ranges -- without network policies, Snowflake is accessible from any IP

## Common False Positives

- **Large warehouse for ELT/transform workloads**: complex dbt models or large-scale transformations legitimately need LARGE+ warehouses. Flag only for simple query workloads.
- **90-day time travel for compliance**: regulated industries may require 90-day retention for audit purposes. Flag only for non-compliance-driven tables.
- **Transient tables for staging/temp data**: transient tables are correct for ETL staging that is recreatable. Flag only for final/production data.
- **Clone for development environments**: zero-copy clones for development and testing are cost-effective even with some divergence. Flag only when heavy DML is expected post-clone without cost awareness.

## Severity Guidance

| Finding | Severity |
|---|---|
| UDF with external network access without documented security review | Critical |
| No network policy on Snowflake account | Critical |
| Large table (>1 TB) without clustering keys on filtered columns | Important |
| Oversized warehouse (2x+ needed) burning unnecessary credits | Important |
| COPY INTO without error handling for critical data load | Important |
| Transient table for non-recreatable production data | Important |
| Auto-suspend too long (>5 min) on interactive warehouse | Minor |
| 90-day time travel on non-critical staging table | Minor |
| SELECT * in views on wide tables | Minor |

## See Also

- `data-n-plus-1-and-query-perf` -- N+1 patterns in Snowflake manifest as repeated small queries instead of batch operations
- `data-sharding-partitioning` -- clustering keys are Snowflake's partitioning strategy for query pruning
- `db-bigquery` -- BigQuery comparison for similar warehouse cost and partitioning pitfalls
- `db-redshift` -- Redshift comparison for distribution and sort key design

## Authoritative References

- [Snowflake Documentation: Warehouse Considerations](https://docs.snowflake.com/en/user-guide/warehouses-considerations)
- [Snowflake Documentation: Clustering Keys](https://docs.snowflake.com/en/user-guide/tables-clustering-keys)
- [Snowflake Documentation: Zero-Copy Cloning](https://docs.snowflake.com/en/user-guide/tables-storage-considerations#label-cloning-tables)
- [Snowflake Documentation: Time Travel](https://docs.snowflake.com/en/user-guide/data-time-travel)
- [Snowflake Documentation: UDF Security](https://docs.snowflake.com/en/developer-guide/udf/udf-security)
