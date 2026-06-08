---
id: data-stores
type: index
depth_role: subcategory
depth: 1
focus: "data-stores: Detect BigQuery pitfalls around slot usage, clustering, partitioning, wildcard tables, DML quotas, streaming inserts vs batch loading, and cost control; Detect Cassandra and ScyllaDB pitfalls around partition key design, tom..."
parents:
  - "../index.md"
shared_covers: []
tags:
  - advisory-lock
  - aggregation
  - alembic
  - allow-filtering
  - analyze
  - analyzer
  - aof
  - apoc
  - atlas
  - autogenerate
  - aws
  - baseline
  - bb8
  - big-key
  - bigquery
  - branch
  - brin
  - bulk-insert
  - bulk-operations
  - busy-timeout
generator: "skill-llm-wiki/v1"
entries:
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
  - id: db-connection-pooling
    file: db-connection-pooling.md
    type: primary
    focus: Detect database connection pooling pitfalls around pool sizing, leak detection, idle timeout, PgBouncer mode selection, HikariCP configuration, and connection-per-request anti-patterns
    tags:
      - connection-pool
      - pgbouncer
      - hikaricp
      - pool-sizing
      - leak-detection
      - idle-timeout
      - database-connection
      - c3p0
      - dbcp
      - sqlalchemy-pool
      - knex-pool
  - id: db-elasticsearch-opensearch
    file: db-elasticsearch-opensearch.md
    type: primary
    focus: Detect Elasticsearch and OpenSearch pitfalls around mapping explosion, shard sizing, refresh interval, query vs filter context, deep pagination, and analyzer misconfiguration
    tags:
      - elasticsearch
      - opensearch
      - mapping
      - shard
      - refresh
      - query
      - filter
      - pagination
      - analyzer
      - index-template
      - ilm
      - nested
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
  - id: db-mongodb
    file: db-mongodb.md
    type: primary
    focus: Detect MongoDB pitfalls around schema validation gaps, index strategy, aggregation pipeline misuse, sharding key selection, ObjectId assumptions, and WiredTiger cache pressure
    tags:
      - mongodb
      - mongo
      - schema-validation
      - index
      - aggregation
      - sharding
      - wiredtiger
      - oplog
      - objectid
      - replica-set
  - id: db-mysql-mariadb
    file: db-mysql-mariadb.md
    type: primary
    focus: Detect MySQL and MariaDB pitfalls around storage engine selection, replication lag, deadlocks, gap locks, character set mismatches, and missing slow query analysis
    tags:
      - mysql
      - mariadb
      - innodb
      - myisam
      - replication
      - deadlock
      - gap-lock
      - character-set
      - collation
      - slow-query
      - query-cache
  - id: db-neo4j-graph
    file: db-neo4j-graph.md
    type: primary
    focus: Detect Neo4j and graph database pitfalls around Cypher injection, APOC security, index usage, unbounded traversals, Cartesian products, and relationship direction semantics
    tags:
      - neo4j
      - graph
      - cypher
      - injection
      - apoc
      - index
      - traversal
      - cartesian-product
      - relationship
      - graph-database
      - graph-db
      - gremlin
      - super-node
      - data-architecture
  - id: db-postgres
    file: db-postgres.md
    type: primary
    focus: Detect PostgreSQL-specific pitfalls around VACUUM, MVCC bloat, lock escalation, index misuse, CTE materialization, connection exhaustion, and missing pg_stat analysis
    tags:
      - postgres
      - postgresql
      - vacuum
      - mvcc
      - explain
      - locks
      - indexes
      - gin
      - gist
      - brin
      - cte
      - pg_stat
      - connection-pool
      - advisory-lock
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
  - id: db-sqlite
    file: db-sqlite.md
    type: primary
    focus: Detect SQLite-specific pitfalls around WAL mode, busy timeouts, concurrent write contention, file locking, FTS5 configuration, and production misuse
    tags:
      - sqlite
      - wal
      - busy-timeout
      - concurrent-writes
      - fts5
      - json1
      - journal-mode
      - file-locking
      - embedded-database
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
  - id: migration-alembic
    file: migration-alembic.md
    type: primary
    focus: Detect Alembic migration pitfalls including autogenerate misses, branch merging conflicts, offline mode limitations, bulk operations misuse, and depends_on ordering errors
    tags:
      - alembic
      - migration
      - python
      - sqlalchemy
      - autogenerate
      - branch
      - offline
      - bulk-operations
      - data-architecture
  - id: migration-atlas-goose
    file: migration-atlas-goose.md
    type: primary
    focus: Detect Atlas and Goose migration pitfalls including declarative vs versioned mode confusion, Atlas schema drift, Goose SQL vs Go migration tradeoffs, and rollback discipline
    tags:
      - atlas
      - goose
      - migration
      - go
      - declarative
      - versioned
      - schema-drift
      - rollback
      - data-architecture
  - id: migration-flyway-liquibase
    file: migration-flyway-liquibase.md
    type: primary
    focus: Detect Flyway and Liquibase pitfalls including non-repeatable migration editing, checksum mismatch, out-of-order execution, missing rollback support, baseline misuse, and environment-specific migration errors
    tags:
      - flyway
      - liquibase
      - migration
      - checksum
      - rollback
      - baseline
      - changelog
      - versioned-migration
      - data-architecture
  - id: migration-knex-objection
    file: migration-knex-objection.md
    type: primary
    focus: "Detect Knex/Objection.js pitfalls including knex.raw injection, migration lock table issues, batch numbering conflicts, Objection graph operations, and transaction scope misuse"
    tags:
      - knex
      - objection
      - migration
      - nodejs
      - javascript
      - sql-injection
      - raw-query
      - transaction
      - graph-operations
      - data-architecture
  - id: orm-diesel-sqlx-rust
    file: orm-diesel-sqlx-rust.md
    type: primary
    focus: "Detect Rust data access pitfalls including diesel compile-time safety gaps vs sqlx runtime query verification, connection pool misconfiguration (deadpool/bb8/r2d2), migration ordering, and type mapping errors"
    tags:
      - diesel
      - sqlx
      - rust
      - connection-pool
      - migration
      - type-safety
      - deadpool
      - bb8
      - r2d2
      - data-architecture
  - id: orm-django
    file: orm-django.md
    type: primary
    focus: "Detect Django ORM pitfalls including N+1 from missing select_related/prefetch_related, raw SQL injection, migration squashing risks, queryset evaluation timing, F/Q expression misuse, and signal side effects"
    tags:
      - django
      - orm
      - python
      - n-plus-1
      - select-related
      - raw-sql
      - migration
      - queryset
      - signals
      - data-architecture
  - id: orm-drizzle
    file: orm-drizzle.md
    type: primary
    focus: "Detect Drizzle ORM pitfalls including type safety gaps in raw SQL, missing prepared statements, schema push vs migrate confusion, connection handling, and SQL injection in sql`` template misuse"
    tags:
      - drizzle
      - orm
      - typescript
      - nodejs
      - type-safety
      - prepared-statements
      - migration
      - raw-sql
      - data-architecture
  - id: orm-ecto-elixir
    file: orm-ecto-elixir.md
    type: primary
    focus: "Detect Ecto/Elixir pitfalls including preload vs join confusion, Repo transaction misuse, changeset validation gaps, raw fragment injection, migration lock timeout, and sandbox leaks"
    tags:
      - ecto
      - elixir
      - preload
      - fragment
      - changeset
      - transaction
      - migration
      - sandbox
      - n-plus-1
      - data-architecture
  - id: orm-hibernate-jpa
    file: orm-hibernate-jpa.md
    type: primary
    focus: "Detect Hibernate/JPA pitfalls including LazyInitializationException, N+1 with fetch joins, second-level cache staleness, flush mode confusion, JPQL injection, and entity lifecycle misuse"
    tags:
      - hibernate
      - jpa
      - java
      - kotlin
      - lazy-loading
      - n-plus-1
      - cache
      - jpql
      - entity-lifecycle
      - spring
      - data-architecture
  - id: orm-prisma
    file: orm-prisma.md
    type: primary
    focus: Detect Prisma-specific pitfalls including N+1 via implicit relation loading, raw query injection, missing indexes in schema, migration drift, connection pool exhaustion, and transaction misuse
    tags:
      - prisma
      - orm
      - n-plus-1
      - connection-pool
      - migration
      - raw-sql
      - typescript
      - nodejs
      - data-architecture
  - id: orm-sqlalchemy
    file: orm-sqlalchemy.md
    type: primary
    focus: "Detect SQLAlchemy pitfalls including session mismanagement, lazy loading N+1, detached instance access, connection pool misconfiguration, raw text() injection, and expire_on_commit confusion"
    tags:
      - sqlalchemy
      - orm
      - python
      - session
      - lazy-loading
      - connection-pool
      - injection
      - n-plus-1
      - data-architecture
  - id: orm-typeorm
    file: orm-typeorm.md
    type: primary
    focus: Detect TypeORM pitfalls including eager loading explosion, query builder injection, migration synchronize misuse, subscriber side effects, connection pool exhaustion, and active record vs data mapper confusion
    tags:
      - typeorm
      - orm
      - typescript
      - nodejs
      - eager-loading
      - query-builder
      - migration
      - injection
      - n-plus-1
      - data-architecture
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Data Stores

**Focus:** data-stores: Detect BigQuery pitfalls around slot usage, clustering, partitioning, wildcard tables, DML quotas, streaming inserts vs batch loading, and cost control; Detect Cassandra and ScyllaDB pitfalls around partition key design, tom...

## Children

| File | Type | Focus |
|------|------|-------|
| [db-bigquery.md](db-bigquery.md) | 📄 primary | Detect BigQuery pitfalls around slot usage, clustering, partitioning, wildcard tables, DML quotas, streaming inserts vs batch loading, and cost control |
| [db-cassandra-scylla.md](db-cassandra-scylla.md) | 📄 primary | Detect Cassandra and ScyllaDB pitfalls around partition key design, tombstone accumulation, compaction strategy, consistency levels, lightweight transactions, and materialized view lag |
| [db-clickhouse.md](db-clickhouse.md) | 📄 primary | Detect ClickHouse pitfalls around MergeTree engine selection, ORDER BY key design, materialized view synchronization, deduplication semantics, JOIN limitations, and bulk insert requirements |
| [db-cockroachdb-spanner-tidb.md](db-cockroachdb-spanner-tidb.md) | 📄 primary | Detect distributed SQL pitfalls around clock skew, transaction contention, interleaved tables, zone configuration, and the unique performance characteristics of globally distributed ACID databases |
| [db-connection-pooling.md](db-connection-pooling.md) | 📄 primary | Detect database connection pooling pitfalls around pool sizing, leak detection, idle timeout, PgBouncer mode selection, HikariCP configuration, and connection-per-request anti-patterns |
| [db-elasticsearch-opensearch.md](db-elasticsearch-opensearch.md) | 📄 primary | Detect Elasticsearch and OpenSearch pitfalls around mapping explosion, shard sizing, refresh interval, query vs filter context, deep pagination, and analyzer misconfiguration |
| [db-memcached.md](db-memcached.md) | 📄 primary | Detect Memcached pitfalls around cache stampede, key length limits, expiry strategy, lack of persistence, serialization overhead, and connection pooling |
| [db-mongodb.md](db-mongodb.md) | 📄 primary | Detect MongoDB pitfalls around schema validation gaps, index strategy, aggregation pipeline misuse, sharding key selection, ObjectId assumptions, and WiredTiger cache pressure |
| [db-mysql-mariadb.md](db-mysql-mariadb.md) | 📄 primary | Detect MySQL and MariaDB pitfalls around storage engine selection, replication lag, deadlocks, gap locks, character set mismatches, and missing slow query analysis |
| [db-neo4j-graph.md](db-neo4j-graph.md) | 📄 primary | Detect Neo4j and graph database pitfalls around Cypher injection, APOC security, index usage, unbounded traversals, Cartesian products, and relationship direction semantics |
| [db-postgres.md](db-postgres.md) | 📄 primary | Detect PostgreSQL-specific pitfalls around VACUUM, MVCC bloat, lock escalation, index misuse, CTE materialization, connection exhaustion, and missing pg_stat analysis |
| [db-redis.md](db-redis.md) | 📄 primary | Detect Redis pitfalls around memory limits, eviction policy, persistence gaps, pub/sub reliability, Lua script safety, cluster mode key distribution, and key naming conventions |
| [db-redshift.md](db-redshift.md) | 📄 primary | Detect Redshift pitfalls around distribution keys, sort keys, VACUUM/ANALYZE maintenance, WLM queue configuration, Spectrum external table misuse, and encoding selection |
| [db-snowflake.md](db-snowflake.md) | 📄 primary | Detect Snowflake pitfalls around warehouse sizing, clustering keys, zero-copy clones, time travel cost, external tables, and UDF security boundaries |
| [db-sqlite.md](db-sqlite.md) | 📄 primary | Detect SQLite-specific pitfalls around WAL mode, busy timeouts, concurrent write contention, file locking, FTS5 configuration, and production misuse |
| [db-timescaledb-influxdb.md](db-timescaledb-influxdb.md) | 📄 primary | Detect time-series database pitfalls around hypertable chunk sizing, continuous aggregate freshness, retention policies, tag vs field confusion, and cardinality explosion |
| [migration-alembic.md](migration-alembic.md) | 📄 primary | Detect Alembic migration pitfalls including autogenerate misses, branch merging conflicts, offline mode limitations, bulk operations misuse, and depends_on ordering errors |
| [migration-atlas-goose.md](migration-atlas-goose.md) | 📄 primary | Detect Atlas and Goose migration pitfalls including declarative vs versioned mode confusion, Atlas schema drift, Goose SQL vs Go migration tradeoffs, and rollback discipline |
| [migration-flyway-liquibase.md](migration-flyway-liquibase.md) | 📄 primary | Detect Flyway and Liquibase pitfalls including non-repeatable migration editing, checksum mismatch, out-of-order execution, missing rollback support, baseline misuse, and environment-specific migration errors |
| [migration-knex-objection.md](migration-knex-objection.md) | 📄 primary | Detect Knex/Objection.js pitfalls including knex.raw injection, migration lock table issues, batch numbering conflicts, Objection graph operations, and transaction scope misuse |
| [orm-diesel-sqlx-rust.md](orm-diesel-sqlx-rust.md) | 📄 primary | Detect Rust data access pitfalls including diesel compile-time safety gaps vs sqlx runtime query verification, connection pool misconfiguration (deadpool/bb8/r2d2), migration ordering, and type mapping errors |
| [orm-django.md](orm-django.md) | 📄 primary | Detect Django ORM pitfalls including N+1 from missing select_related/prefetch_related, raw SQL injection, migration squashing risks, queryset evaluation timing, F/Q expression misuse, and signal side effects |
| [orm-drizzle.md](orm-drizzle.md) | 📄 primary | Detect Drizzle ORM pitfalls including type safety gaps in raw SQL, missing prepared statements, schema push vs migrate confusion, connection handling, and SQL injection in sql`` template misuse |
| [orm-ecto-elixir.md](orm-ecto-elixir.md) | 📄 primary | Detect Ecto/Elixir pitfalls including preload vs join confusion, Repo transaction misuse, changeset validation gaps, raw fragment injection, migration lock timeout, and sandbox leaks |
| [orm-hibernate-jpa.md](orm-hibernate-jpa.md) | 📄 primary | Detect Hibernate/JPA pitfalls including LazyInitializationException, N+1 with fetch joins, second-level cache staleness, flush mode confusion, JPQL injection, and entity lifecycle misuse |
| [orm-prisma.md](orm-prisma.md) | 📄 primary | Detect Prisma-specific pitfalls including N+1 via implicit relation loading, raw query injection, missing indexes in schema, migration drift, connection pool exhaustion, and transaction misuse |
| [orm-sqlalchemy.md](orm-sqlalchemy.md) | 📄 primary | Detect SQLAlchemy pitfalls including session mismanagement, lazy loading N+1, detached instance access, connection pool misconfiguration, raw text() injection, and expire_on_commit confusion |
| [orm-typeorm.md](orm-typeorm.md) | 📄 primary | Detect TypeORM pitfalls including eager loading explosion, query builder injection, migration synchronize misuse, subscriber side effects, connection pool exhaustion, and active record vs data mapper confusion |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
