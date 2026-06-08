---
id: data-architecture
type: index
depth_role: subcategory
depth: 1
focus: "data-architecture: Detect missing backup strategies, untested restore procedures, undefined RPO/RTO, missing point-in-time recovery, and absent cross-region replication for disaster recovery; Detect CDC lag risks, missing ordering guaran..."
parents:
  - "../index.md"
shared_covers: []
tags:
  - aggregate
  - architecture
  - arrays
  - async
  - audit-trail
  - backfill
  - backup
  - cdc
  - change-data-capture
  - consistency
  - constraints
  - cqrs
  - cross-region
  - data-architecture
  - data-loss
  - data-types
  - ddd
  - ddl
  - debezium
  - deploy-ordering
generator: "skill-llm-wiki/v1"
entries:
  - id: data-backup-restore-dr-rpo-rto
    file: data-backup-restore-dr-rpo-rto.md
    type: primary
    focus: "Detect missing backup strategies, untested restore procedures, undefined RPO/RTO, missing point-in-time recovery, and absent cross-region replication for disaster recovery"
    tags:
      - backup
      - restore
      - disaster-recovery
      - RPO
      - RTO
      - PITR
      - cross-region
      - resilience
      - data-architecture
  - id: data-cdc-event-sourcing
    file: data-cdc-event-sourcing.md
    type: primary
    focus: Detect CDC lag risks, missing ordering guarantees, schema compatibility gaps, and consumer idempotency failures in change data capture and event sourcing pipelines
    tags:
      - cdc
      - change-data-capture
      - event-sourcing
      - debezium
      - kafka-connect
      - replication
      - idempotency
      - schema-evolution
      - data-architecture
      - async
      - event
      - event-api
      - dlq
      - retry
      - ordering
      - messaging
      - kafka
      - rabbitmq
      - sqs
      - event-driven
      - events
      - DLQ
      - architecture
      - immutability
      - snapshot
      - replay
      - upcasting
      - versioning
      - event-store
      - aggregate
      - domain-event
      - audit-trail
      - ddd
      - cqrs
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
  - id: data-relational-modeling
    file: data-relational-modeling.md
    type: primary
    focus: Detect normalization gaps, missing constraints, wrong data types, unjustified denormalization, and missing indexes on foreign keys in relational database schemas
    tags:
      - relational
      - normalization
      - constraints
      - data-types
      - indexes
      - foreign-key
      - schema-design
      - data-architecture
  - id: data-replication-consistency
    file: data-replication-consistency.md
    type: primary
    focus: Detect missing read-after-write guarantees, stale read risks, split-brain configurations, and quorum misconfiguration in replicated data systems
    tags:
      - replication
      - consistency
      - read-after-write
      - stale-read
      - split-brain
      - quorum
      - eventual-consistency
      - data-architecture
  - id: data-schema-migrations
    file: data-schema-migrations.md
    type: primary
    focus: Detect non-reversible migrations, locking DDL on large tables, data loss risks, missing backfill steps, and deployment ordering issues in database schema migrations
    tags:
      - migration
      - schema-evolution
      - DDL
      - rollback
      - deploy-ordering
      - data-loss
      - locking
      - backfill
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
  - id: ddd-tactical-domain-events
    type: primary
    focus: "Detect domain events carrying too much data (god events), events not named in past tense, mutable events, and missing events for significant domain state changes."
    tags:
      - domain-events
      - ddd
      - tactical-design
      - event-driven
      - cqrs
      - event-sourcing
      - domain-driven-design
    file: "../architecture/ddd-tactical-domain-events.md"
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Data Architecture

**Focus:** data-architecture: Detect missing backup strategies, untested restore procedures, undefined RPO/RTO, missing point-in-time recovery, and absent cross-region replication for disaster recovery; Detect CDC lag risks, missing ordering guaran...

## Children

| File | Type | Focus |
|------|------|-------|
| [data-backup-restore-dr-rpo-rto.md](data-backup-restore-dr-rpo-rto.md) | 📄 primary | Detect missing backup strategies, untested restore procedures, undefined RPO/RTO, missing point-in-time recovery, and absent cross-region replication for disaster recovery |
| [data-cdc-event-sourcing.md](data-cdc-event-sourcing.md) | 📄 primary | Detect CDC lag risks, missing ordering guarantees, schema compatibility gaps, and consumer idempotency failures in change data capture and event sourcing pipelines |
| [data-document-modeling.md](data-document-modeling.md) | 📄 primary | Detect unbounded arrays, deep nesting, missing schema validation, poor reference-vs-embed decisions, and document size risks in document databases |
| [data-relational-modeling.md](data-relational-modeling.md) | 📄 primary | Detect normalization gaps, missing constraints, wrong data types, unjustified denormalization, and missing indexes on foreign keys in relational database schemas |
| [data-replication-consistency.md](data-replication-consistency.md) | 📄 primary | Detect missing read-after-write guarantees, stale read risks, split-brain configurations, and quorum misconfiguration in replicated data systems |
| [data-schema-migrations.md](data-schema-migrations.md) | 📄 primary | Detect non-reversible migrations, locking DDL on large tables, data loss risks, missing backfill steps, and deployment ordering issues in database schema migrations |
| [data-sharding-partitioning.md](data-sharding-partitioning.md) | 📄 primary | Detect wrong shard keys, hot partitions, cross-shard query patterns, missing rebalancing strategies, and partition pruning failures |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
