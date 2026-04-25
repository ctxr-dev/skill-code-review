---
id: db-bigquery
type: primary
depth_role: leaf
focus: Detect BigQuery pitfalls around slot usage, clustering, partitioning, wildcard tables, DML quotas, streaming inserts vs batch loading, and cost control
parents:
  - index.md
covers:
  - Slot usage spikes from unoptimized queries processing too much data
  - Missing clustering on frequently filtered columns
  - Missing partitioning on time-based tables
  - Wildcard table queries without _TABLE_SUFFIX filter
  - "DML quota exceeded from frequent UPDATE/DELETE/MERGE operations"
  - Streaming inserts used when batch loading would be cheaper and sufficient
  - "SELECT * scanning all columns wasting slot time and cost"
  - "Missing cost controls (custom quotas, maximum bytes billed)"
  - BigQuery full scan without partition filter on partitioned table
  - Missing clustering on high-cardinality filter columns
  - DML quota exceeded by frequent single-row operations
  - Streaming inserts used where batch loading is more appropriate
  - Missing slot reservations for predictable cost
  - "Pub/Sub subscription without dead letter topic"
  - "Missing Pub/Sub message ordering when order matters"
  - Ack deadline too short causing duplicate delivery
  - "Pub/Sub push endpoint without authentication"
  - Missing BigQuery access controls on sensitive datasets
tags:
  - bigquery
  - gcp
  - google-cloud
  - slot
  - partition
  - clustering
  - wildcard
  - dml-quota
  - streaming-insert
  - cost-control
  - data-warehouse
  - pubsub
  - data-pipeline
  - cost-optimization
  - partitioning
  - dead-letter
aliases:
  - cloud-gcp-bigquery-pubsub
activation:
  file_globs:
    - "**/*bigquery*"
    - "**/*bq_*"
    - "**/*.sql"
    - "**/terraform*"
    - "**/dbt*"
    - "**/*warehouse*"
    - "**/*analytics*"
  keyword_matches:
    - bigquery
    - BigQuery
    - bq
    - PARTITION BY
    - CLUSTER BY
    - _TABLE_SUFFIX
    - _PARTITIONTIME
    - _PARTITIONDATE
    - maximum_bytes_billed
    - streaming insert
    - insertAll
    - MERGE
    - DML
    - slot
    - on-demand
    - flat-rate
    - editions
    - google.cloud.bigquery
    - "@google-cloud/bigquery"
source:
  origin: file
  path: db-bigquery.md
  hash: "sha256:7d0d4820b6adccbb6f3e6188070fcb804cf0798dc773846891757af3861b69d4"
---
# BigQuery Pitfalls

## When This Activates

Activates on diffs involving BigQuery SQL, table definitions, Terraform/CDK resources, dbt models, or client SDK usage. BigQuery is a serverless data warehouse that charges by bytes scanned (on-demand) or slot-seconds (editions). Its columnar storage, automatic partitioning, and separation of storage from compute create unique pitfalls: SELECT * scans all columns at full cost. Unpartitioned tables force full scans on every query. DML operations have strict quotas. Streaming inserts cost 5x more than batch loads. This reviewer targets detection heuristics for BigQuery-specific cost, quota, and performance pitfalls.

## Audit Surface

- [ ] SELECT * on wide tables without column pruning
- [ ] Table without partition (full table scan on every query)
- [ ] Partitioned table queried without partition filter in WHERE clause
- [ ] Table without clustering on frequently filtered columns
- [ ] Wildcard table query without _TABLE_SUFFIX predicate
- [ ] DML statements (UPDATE, DELETE, MERGE) run more frequently than quota allows
- [ ] Streaming inserts (insertAll API) for batch/ETL data that is not time-sensitive
- [ ] No maximum_bytes_billed set on queries
- [ ] Cross-region query accessing data in another region
- [ ] Materialized view not used for repeated expensive aggregations
- [ ] ORDER BY without LIMIT on large result sets
- [ ] UNNEST on large arrays without pre-filtering
- [ ] No cost labels on datasets or queries for attribution
- [ ] Slot reservation not sized for concurrent query load

## Detailed Checks

### Partitioning and Clustering
<!-- activation: keywords=["PARTITION BY", "partition", "CLUSTER BY", "cluster", "CREATE TABLE", "_PARTITIONTIME", "_PARTITIONDATE", "ingestion time", "time_partitioning", "range_partitioning"] -->

- [ ] **Unpartitioned large table**: flag tables >1 GB without partition definition -- every query scans the entire table, incurring maximum cost and slot usage. Partition by a date/timestamp column or use ingestion-time partitioning
- [ ] **Query without partition filter**: flag queries on partitioned tables without a WHERE clause on the partition column -- the query scans all partitions, negating the cost and performance benefit of partitioning. Enable `require_partition_filter` on the table
- [ ] **Missing clustering on filter columns**: flag tables with >10 GB where queries frequently filter on non-partition columns without clustering -- clustering sorts data within partitions by specified columns, reducing bytes scanned by orders of magnitude
- [ ] **Clustering column order mismatch**: flag CLUSTER BY columns ordered differently from the most common query filter pattern -- BigQuery clusters by prefix; queries filtering on the second cluster column without the first get no benefit

### Cost Control
<!-- activation: keywords=["maximum_bytes_billed", "cost", "billing", "on-demand", "slot", "reservation", "dry_run", "bytes_processed", "labels", "budget"] -->

- [ ] **No maximum_bytes_billed**: flag queries or job configurations without `maximum_bytes_billed` set -- without a cap, a single malformed query (missing partition filter, accidental cross join) can scan petabytes and cost thousands of dollars
- [ ] **SELECT * on wide tables**: flag `SELECT *` on tables with >50 columns -- BigQuery charges by bytes scanned; SELECT * reads every column. Specify only needed columns
- [ ] **No cost attribution labels**: flag datasets and recurring queries without labels for cost attribution -- without labels, billing anomalies cannot be traced to specific teams or pipelines
- [ ] **Streaming inserts for batch data**: flag use of the insertAll (streaming) API for data that is not time-sensitive -- streaming inserts cost ~$0.05/GB vs. free batch loads; for ETL and batch pipelines, use load jobs

### DML and Quota Management
<!-- activation: keywords=["UPDATE", "DELETE", "MERGE", "DML", "quota", "rate limit", "INSERT INTO", "INSERT SELECT", "COPY"] -->

- [ ] **Frequent DML operations**: flag UPDATE, DELETE, or MERGE statements scheduled more frequently than BigQuery's DML quotas allow (currently 20 DML statements per table per day for free tier, higher for standard) -- exceeding quotas causes job failures
- [ ] **DML on large partitions**: flag MERGE or UPDATE operations that rewrite large partitions -- BigQuery DML rewrites entire partitions; targeting specific partitions in the WHERE clause reduces data processed
- [ ] **INSERT ... SELECT without partition pruning**: flag INSERT INTO ... SELECT that reads from a large source table without partition filters -- the SELECT side incurs full scan cost

### Wildcard and Cross-Region
<!-- activation: keywords=["_TABLE_SUFFIX", "_TABLE_PREFIX", "wildcard", "`project.dataset.table_*`", "region", "cross-region", "location", "US", "EU", "multi_region"] -->

- [ ] **Wildcard without _TABLE_SUFFIX filter**: flag wildcard table queries (`FROM dataset.events_*`) without `WHERE _TABLE_SUFFIX BETWEEN ...` -- without the suffix filter, all matching tables are scanned
- [ ] **Cross-region data access**: flag queries referencing datasets in a different region from the job location -- cross-region queries incur network transfer costs and higher latency

### Query Optimization
<!-- activation: keywords=["ORDER BY", "LIMIT", "UNNEST", "ARRAY", "JOIN", "CROSS JOIN", "self join", "materialized view", "WITH", "CTE", "subquery", "APPROX_COUNT_DISTINCT"] -->

- [ ] **ORDER BY without LIMIT**: flag ORDER BY on large result sets without LIMIT -- sorting materializes the entire result set in memory; use LIMIT or omit ORDER BY for intermediate CTEs
- [ ] **Exact COUNT DISTINCT where approximate suffices**: flag COUNT(DISTINCT ...) on high-cardinality columns where exact precision is not required -- use APPROX_COUNT_DISTINCT for ~1% error at dramatically lower cost
- [ ] **Missing materialized view for repeated aggregation**: flag identical expensive aggregation queries run on a schedule without a materialized view -- materialized views are auto-refreshed and scanned instead of the base table

## Common False Positives

- **SELECT * in dbt models with column selection downstream**: dbt models may use SELECT * in staging models when column selection happens in downstream models. Flag only in final models or direct queries.
- **Streaming inserts for real-time dashboards**: applications requiring sub-second data freshness correctly use streaming inserts. Flag only for batch/ETL pipelines.
- **Unpartitioned small tables**: tables <1 GB have minimal scan cost. Flag partitioning only for tables that will grow beyond 1 GB.
- **DML for GDPR deletion**: periodic data deletion for compliance may exceed quotas. Note the quota constraint but do not flag the DML itself.

## Severity Guidance

| Finding | Severity |
|---|---|
| No maximum_bytes_billed on user-facing or automated queries | Critical |
| Unpartitioned table >100 GB queried without full-scan awareness | Critical |
| Query on partitioned table without partition filter | Important |
| SELECT * on table with >50 columns in production pipeline | Important |
| Streaming inserts used for batch data (5x cost premium) | Important |
| Wildcard table query without _TABLE_SUFFIX filter | Important |
| DML operations exceeding table quota frequency | Important |
| Missing clustering on tables >10 GB with filtered queries | Minor |
| ORDER BY without LIMIT on large intermediate result | Minor |
| COUNT(DISTINCT) where APPROX_COUNT_DISTINCT would suffice | Minor |

## See Also

- `data-n-plus-1-and-query-perf` -- N+1 query patterns in BigQuery manifest as multiple small queries instead of one batch query
- `data-sharding-partitioning` -- BigQuery partitioning is the primary data organization strategy
- `db-snowflake` -- Snowflake comparison for similar warehouse cost and performance pitfalls
- `db-redshift` -- Redshift comparison for similar warehouse distribution and sort key design

## Authoritative References

- [BigQuery Documentation: Partitioned Tables](https://cloud.google.com/bigquery/docs/partitioned-tables)
- [BigQuery Documentation: Clustered Tables](https://cloud.google.com/bigquery/docs/clustered-tables)
- [BigQuery Documentation: Best Practices for Controlling Costs](https://cloud.google.com/bigquery/docs/best-practices-costs)
- [BigQuery Documentation: Quotas and Limits](https://cloud.google.com/bigquery/quotas)
- [BigQuery Documentation: Loading Data](https://cloud.google.com/bigquery/docs/loading-data)
