---
id: partition-key
type: index
depth_role: subcategory
depth: 1
focus: ALLOW FILTERING queries performing full table scans; ANALYZE not run after significant data loads; Ack deadline too short causing duplicate delivery; Autocomplete without debounce or rate limit
parents:
  - "../index.md"
shared_covers: []
entries:
  - id: ai-ml-data-pipelines-pandas-polars-dask-spark
    file: ai-ml-data-pipelines-pandas-polars-dask-spark.md
    type: primary
    focus: Detect pandas on data too large for memory, missing dtypes with object columns, chained indexing, Spark shuffle too wide, missing schema validation on input, and Polars lazy not collected
    tags:
      - pandas
      - Polars
      - Dask
      - Spark
      - DataFrame
      - data-pipeline
      - memory
      - dtype
      - schema
      - shuffle
  - id: cloud-aws-dynamodb-single-table
    file: cloud-aws-dynamodb-single-table.md
    type: primary
    focus: Detect DynamoDB design pitfalls including hot partition keys, missing GSIs for access patterns, scan-over-query usage, absent TTL on ephemeral data, and capacity mode mismatches
    tags:
      - aws
      - dynamodb
      - single-table
      - partition-key
      - gsi
      - scan
      - query
      - ttl
      - capacity
      - streams
      - lsi
      - hot-partition
      - rcu
      - wcu
      - throttling
  - id: cloud-cloudflare-workers-durable-objects-r2-d1
    file: cloud-cloudflare-workers-durable-objects-r2-d1.md
    type: primary
    focus: "Detect Workers KV consistency misunderstanding, Durable Objects misuse, R2/D1 pitfalls, secrets in wrangler.toml, and CPU/subrequest limit violations"
    tags:
      - cloudflare
      - workers
      - durable-objects
      - r2
      - d1
      - kv
      - edge
      - serverless
  - id: data-document-modeling
    file: data-document-modeling.md
    type: primary
    focus: Detect unbounded arrays, deep nesting, missing schema validation, poor reference-vs-embed decisions, and document size risks in document databases
    tags:
      - document-db
      - mongodb
      - nosql
      - embedding
      - referencing
      - schema-validation
      - arrays
      - nesting
      - data-architecture
  - id: data-sharding-partitioning
    file: data-sharding-partitioning.md
    type: primary
    focus: Detect wrong shard keys, hot partitions, cross-shard query patterns, missing rebalancing strategies, and partition pruning failures
    tags:
      - sharding
      - partitioning
      - shard-key
      - hot-partition
      - rebalancing
      - scatter-gather
      - data-architecture
  - id: db-bigquery
    file: db-bigquery.md
    type: primary
    focus: Detect BigQuery pitfalls around slot usage, clustering, partitioning, wildcard tables, DML quotas, streaming inserts vs batch loading, and cost control
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
  - id: db-cassandra-scylla
    file: db-cassandra-scylla.md
    type: primary
    focus: Detect Cassandra and ScyllaDB pitfalls around partition key design, tombstone accumulation, compaction strategy, consistency levels, lightweight transactions, and materialized view lag
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
  - id: db-clickhouse
    file: db-clickhouse.md
    type: primary
    focus: Detect ClickHouse pitfalls around MergeTree engine selection, ORDER BY key design, materialized view synchronization, deduplication semantics, JOIN limitations, and bulk insert requirements
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
  - id: db-cockroachdb-spanner-tidb
    file: db-cockroachdb-spanner-tidb.md
    type: primary
    focus: Detect distributed SQL pitfalls around clock skew, transaction contention, interleaved tables, zone configuration, and the unique performance characteristics of globally distributed ACID databases
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
  - id: db-memcached
    file: db-memcached.md
    type: primary
    focus: Detect Memcached pitfalls around cache stampede, key length limits, expiry strategy, lack of persistence, serialization overhead, and connection pooling
    tags:
      - memcached
      - cache
      - stampede
      - thundering-herd
      - expiry
      - serialization
      - connection-pool
      - slab
      - consistent-hashing
  - id: db-redis
    file: db-redis.md
    type: primary
    focus: "Detect Redis pitfalls around memory limits, eviction policy, persistence gaps, pub/sub reliability, Lua script safety, cluster mode key distribution, and key naming conventions"
    tags:
      - redis
      - cache
      - eviction
      - persistence
      - rdb
      - aof
      - pubsub
      - lua
      - cluster
      - memory
      - key-naming
      - big-key
  - id: db-redshift
    file: db-redshift.md
    type: primary
    focus: "Detect Redshift pitfalls around distribution keys, sort keys, VACUUM/ANALYZE maintenance, WLM queue configuration, Spectrum external table misuse, and encoding selection"
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
  - id: db-snowflake
    file: db-snowflake.md
    type: primary
    focus: Detect Snowflake pitfalls around warehouse sizing, clustering keys, zero-copy clones, time travel cost, external tables, and UDF security boundaries
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
  - id: db-timescaledb-influxdb
    file: db-timescaledb-influxdb.md
    type: primary
    focus: Detect time-series database pitfalls around hypertable chunk sizing, continuous aggregate freshness, retention policies, tag vs field confusion, and cardinality explosion
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
  - id: perf-db-query
    file: perf-db-query.md
    type: primary
    focus: "Detect full table scans, missing indexes, SELECT *, unbounded result sets, expensive JOINs, and query patterns that degrade under production data volumes"
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
  - id: qa-cost-finops
    file: qa-cost-finops.md
    type: primary
    focus: Detect unbounded cloud resource scaling, missing cost alerts, expensive queries without optimization, unused provisioned resources, excessive logging verbosity, and missing cost-allocation tags
    tags:
      - cost
      - finops
      - cloud
      - scaling
      - budget
      - logging
      - tags
      - optimization
      - reserved-capacity
      - lifecycle
      - tokens
      - monitoring
      - caching
      - model-selection
      - batch
      - spend
  - id: search-tantivy-meili-typesense-algolia
    file: search-tantivy-meili-typesense-algolia.md
    type: primary
    focus: "Detect exposed admin keys, missing schema configuration (synonyms, facets, ranking), reindex and hybrid-search pitfalls across Tantivy, Meilisearch, Typesense, and Algolia"
    tags:
      - search
      - tantivy
      - meilisearch
      - typesense
      - algolia
      - instantsearch
      - index
      - synonyms
      - facets
      - ranking
      - hybrid
      - reindex
      - BM25
      - TF-IDF
      - vector-search
      - hybrid-search
      - relevance
      - elasticsearch
      - opensearch
      - solr
      - analyzer
      - tokenizer
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Partition Key

**Focus:** ALLOW FILTERING queries performing full table scans; ANALYZE not run after significant data loads; Ack deadline too short causing duplicate delivery; Autocomplete without debounce or rate limit

## Children

| File | Type | Focus |
|------|------|-------|
| [ai-ml-data-pipelines-pandas-polars-dask-spark.md](ai-ml-data-pipelines-pandas-polars-dask-spark.md) | 📄 primary | Detect pandas on data too large for memory, missing dtypes with object columns, chained indexing, Spark shuffle too wide, missing schema validation on input, and Polars lazy not collected |
| [cloud-aws-dynamodb-single-table.md](cloud-aws-dynamodb-single-table.md) | 📄 primary | Detect DynamoDB design pitfalls including hot partition keys, missing GSIs for access patterns, scan-over-query usage, absent TTL on ephemeral data, and capacity mode mismatches |
| [cloud-cloudflare-workers-durable-objects-r2-d1.md](cloud-cloudflare-workers-durable-objects-r2-d1.md) | 📄 primary | Detect Workers KV consistency misunderstanding, Durable Objects misuse, R2/D1 pitfalls, secrets in wrangler.toml, and CPU/subrequest limit violations |
| [data-document-modeling.md](data-document-modeling.md) | 📄 primary | Detect unbounded arrays, deep nesting, missing schema validation, poor reference-vs-embed decisions, and document size risks in document databases |
| [data-sharding-partitioning.md](data-sharding-partitioning.md) | 📄 primary | Detect wrong shard keys, hot partitions, cross-shard query patterns, missing rebalancing strategies, and partition pruning failures |
| [db-bigquery.md](db-bigquery.md) | 📄 primary | Detect BigQuery pitfalls around slot usage, clustering, partitioning, wildcard tables, DML quotas, streaming inserts vs batch loading, and cost control |
| [db-cassandra-scylla.md](db-cassandra-scylla.md) | 📄 primary | Detect Cassandra and ScyllaDB pitfalls around partition key design, tombstone accumulation, compaction strategy, consistency levels, lightweight transactions, and materialized view lag |
| [db-clickhouse.md](db-clickhouse.md) | 📄 primary | Detect ClickHouse pitfalls around MergeTree engine selection, ORDER BY key design, materialized view synchronization, deduplication semantics, JOIN limitations, and bulk insert requirements |
| [db-cockroachdb-spanner-tidb.md](db-cockroachdb-spanner-tidb.md) | 📄 primary | Detect distributed SQL pitfalls around clock skew, transaction contention, interleaved tables, zone configuration, and the unique performance characteristics of globally distributed ACID databases |
| [db-memcached.md](db-memcached.md) | 📄 primary | Detect Memcached pitfalls around cache stampede, key length limits, expiry strategy, lack of persistence, serialization overhead, and connection pooling |
| [db-redis.md](db-redis.md) | 📄 primary | Detect Redis pitfalls around memory limits, eviction policy, persistence gaps, pub/sub reliability, Lua script safety, cluster mode key distribution, and key naming conventions |
| [db-redshift.md](db-redshift.md) | 📄 primary | Detect Redshift pitfalls around distribution keys, sort keys, VACUUM/ANALYZE maintenance, WLM queue configuration, Spectrum external table misuse, and encoding selection |
| [db-snowflake.md](db-snowflake.md) | 📄 primary | Detect Snowflake pitfalls around warehouse sizing, clustering keys, zero-copy clones, time travel cost, external tables, and UDF security boundaries |
| [db-timescaledb-influxdb.md](db-timescaledb-influxdb.md) | 📄 primary | Detect time-series database pitfalls around hypertable chunk sizing, continuous aggregate freshness, retention policies, tag vs field confusion, and cardinality explosion |
| [perf-db-query.md](perf-db-query.md) | 📄 primary | Detect full table scans, missing indexes, SELECT *, unbounded result sets, expensive JOINs, and query patterns that degrade under production data volumes |
| [qa-cost-finops.md](qa-cost-finops.md) | 📄 primary | Detect unbounded cloud resource scaling, missing cost alerts, expensive queries without optimization, unused provisioned resources, excessive logging verbosity, and missing cost-allocation tags |
| [search-tantivy-meili-typesense-algolia.md](search-tantivy-meili-typesense-algolia.md) | 📄 primary | Detect exposed admin keys, missing schema configuration (synonyms, facets, ranking), reindex and hybrid-search pitfalls across Tantivy, Meilisearch, Typesense, and Algolia |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
