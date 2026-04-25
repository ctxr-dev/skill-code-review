---
id: data-cdc-event-sourcing
type: primary
depth_role: leaf
focus: Detect CDC lag risks, missing ordering guarantees, schema compatibility gaps, and consumer idempotency failures in change data capture and event sourcing pipelines
parents:
  - index.md
  - "../../consumer-event/index.md"
covers:
  - CDC consumer not handling out-of-order events
  - CDC pipeline with no lag monitoring or alerting
  - "Schema change in source breaking CDC consumers (missing compatibility check)"
  - "Consumer processing CDC events without idempotency (duplicate handling)"
  - "CDC event missing ordering metadata (LSN, sequence number, timestamp)"
  - Tombstone or delete event not propagated or not handled by consumers
  - CDC connector misconfigured to skip events on error instead of failing
  - "Source schema evolution without Avro/Protobuf compatibility mode"
  - Missing dead letter queue for unprocessable CDC events
  - Consumer offset management that can lose or duplicate events
  - Event schema change without versioning or backward compatibility
  - Event published without idempotency key for consumer deduplication
  - Consumer assuming strict ordering across partitions or topics
  - No dead letter queue configured for unprocessable events
  - Retry logic without exponential backoff or max retry cap
  - Event contract not documented or registered in a schema registry
  - "Missing event metadata (timestamp, source, correlation ID)"
  - "Event payload too large for the broker's message size limit"
  - Consumer coupling to producer internals via event payload structure
  - Fire-and-forget publish with no delivery acknowledgment
  - Event handler not idempotent -- reprocessing causes duplicate side effects
  - Consumer assuming strict event ordering without partitioning guarantees
  - Missing dead letter queue for failed event processing
  - Fire-and-forget publishing without at-least-once delivery guarantee
  - Event schema evolution not handled -- missing versioning or backward compatibility
  - Event payload containing mutable references instead of immutable snapshots
  - Synchronous processing in an event handler blocking the consumer
  - Missing event correlation ID for tracing across handlers
  - Event handler performing long-running operations without checkpointing
  - No backpressure mechanism when consumer falls behind producer
  - Event object mutated after creation -- events must be immutable
  - Aggregate with hundreds of events and no snapshot mechanism
  - "Event replay triggering side effects (emails, HTTP calls, charges)"
  - Missing event versioning or upcasting for schema evolution
  - Deleting or updating events in the event store
  - "Event handler that cannot be replayed safely (non-idempotent projection)"
  - Aggregate rehydration loading all events without snapshot optimization
  - Event store missing optimistic concurrency control
  - Event type not registered in schema registry or type map
  - Large payload stored directly in event instead of as a reference
  - Events that are mutable or retroactively modified, breaking the immutable audit trail
  - Event schemas without versioning or upcasting strategy for evolution
  - Event store without snapshots causing slow aggregate reconstruction
  - Event handlers with side effects during replay producing duplicated effects
  - Missing event sourcing where an audit trail is reconstructed from mutable state
  - God events carrying too much data or meaningless events carrying too little
  - Aggregate emitting events without validating business invariants first
  - Event store with no concurrency control allowing conflicting writes
  - Projection replay that is not idempotent, corrupting the read model on rebuild
  - Events stored in a format that cannot be deserialized after schema evolution
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
aliases:
  - api-async-event
  - arch-event-driven
  - arch-event-sourcing
  - pattern-event-sourcing
activation:
  file_globs:
    - "**/*cdc*"
    - "**/*debezium*"
    - "**/*connector*"
    - "**/*kafka*"
    - "**/*consumer*"
    - "**/*producer*"
    - "**/*event*"
    - "**/*changelog*"
    - "**/*outbox*"
    - "**/*capture*"
    - "**/*stream*"
  keyword_matches:
    - CDC
    - change data capture
    - Debezium
    - Kafka Connect
    - connector
    - replication slot
    - WAL
    - binlog
    - oplog
    - offset
    - consumer
    - dead letter
    - schema registry
    - Avro
    - Protobuf
    - tombstone
    - snapshot
    - LSN
    - outbox
  structural_signals:
    - cdc_connector_config
    - consumer_handler
    - schema_registry_config
    - outbox_table_definition
source:
  origin: file
  path: data-cdc-event-sourcing.md
  hash: "sha256:3f39e554df883dc87d908fb0dce2eae1d49da99d207b2a0236faad937019eb04"
---
# CDC and Event Sourcing Pipelines

## When This Activates

Activates on diffs involving CDC connector configurations (Debezium, Kafka Connect, DynamoDB Streams, MongoDB Change Streams), event consumer code, schema registry settings, outbox table definitions, or offset management. CDC pipelines capture database changes as a stream of events -- a powerful pattern for data integration, but one with strict correctness requirements. If the consumer is not idempotent, duplicates corrupt downstream data. If ordering is not preserved, updates apply out of sequence. If schema evolution is uncontrolled, a source column rename silently breaks all consumers. This reviewer detects these CDC-specific pipeline reliability gaps.

## Audit Surface

- [ ] CDC consumer with no idempotent processing (no dedup key, no upsert)
- [ ] CDC pipeline with no lag metric or consumer lag alerting
- [ ] Source table schema change without checking CDC consumer compatibility
- [ ] CDC event without sequence number, LSN, or ordering field
- [ ] Delete or truncate event type not handled in consumer logic
- [ ] Debezium or equivalent connector with errors.tolerance=all (skip on error)
- [ ] Schema registry not configured or compatibility mode set to NONE
- [ ] No dead letter queue for failed CDC event processing
- [ ] Consumer committing offsets before processing completes (at-most-once)
- [ ] CDC source table missing logical replication identity or primary key
- [ ] Snapshot phase not handled by consumer (initial load vs. streaming)
- [ ] Multiple consumers reading same CDC topic without partition assignment strategy

## Detailed Checks

### Consumer Idempotency
<!-- activation: keywords=["consumer", "handler", "process", "apply", "upsert", "dedup", "idempotent", "duplicate", "exactly-once", "at-least-once", "retry", "offset", "commit"] -->

- [ ] **Non-idempotent consumer**: flag CDC event consumers that use INSERT (not upsert), counter increment, or non-idempotent operations -- CDC delivers at-least-once; consumers must handle duplicates safely via upsert, dedup keys, or idempotency tokens
- [ ] **Offset committed before processing**: flag consumers that commit the offset/checkpoint before processing the event completes -- if the consumer crashes after commit but before processing, the event is lost (at-most-once delivery)
- [ ] **Offset committed too late**: flag consumers that process events but commit offsets only periodically with large intervals -- if the consumer restarts, it reprocesses all events since the last commit, amplifying duplicate load
- [ ] **No dedup window**: flag consumers with no mechanism to detect and discard duplicate events within a time or sequence window -- even with upsert, knowing about duplicates is important for monitoring

### Ordering Guarantees
<!-- activation: keywords=["order", "sequence", "LSN", "offset", "partition", "key", "timestamp", "before", "after", "causality", "reorder"] -->

- [ ] **Missing ordering metadata**: flag CDC events with no sequence number, LSN, or monotonic ordering field -- without ordering metadata, consumers cannot detect out-of-order delivery or apply events in the correct sequence
- [ ] **Partition key mismatch**: flag CDC topic partition keys that do not match the entity key -- events for the same entity landing on different partitions can be consumed out of order by parallel consumers
- [ ] **Consumer ignoring event ordering**: flag consumers that process events without checking sequence order or timestamp monotonicity -- out-of-order events cause older state to overwrite newer state
- [ ] **Multi-table CDC without causal ordering**: flag CDC pipelines capturing changes from multiple related tables (orders and order_items) without ensuring causal ordering between them -- consumers may see the child before the parent

### Schema Compatibility
<!-- activation: keywords=["schema", "registry", "Avro", "Protobuf", "JSON Schema", "compatible", "compatibility", "evolve", "breaking", "version", "serialize", "deserialize"] -->

- [ ] **No schema registry**: flag CDC pipelines with no schema registry (Confluent Schema Registry, AWS Glue Schema Registry) -- without a registry, schema changes in the source silently break consumers
- [ ] **Compatibility mode NONE**: flag schema registry configurations with compatibility mode set to NONE -- this allows breaking schema changes; use BACKWARD, FORWARD, or FULL compatibility
- [ ] **Source schema change without consumer check**: flag ALTER TABLE or model changes on CDC source tables without verifying that all downstream CDC consumers can handle the new schema -- a column rename, drop, or type change breaks deserialization
- [ ] **Missing default for new field**: flag new fields added to CDC event schemas without default values -- consumers on the old schema cannot deserialize events with unknown fields if the serialization format requires defaults

### CDC Pipeline Reliability
<!-- activation: keywords=["connector", "Debezium", "Kafka Connect", "error", "tolerance", "dead letter", "DLQ", "retry", "fail", "skip", "snapshot", "slot", "replication"] -->

- [ ] **Error skipping**: flag CDC connector configurations with `errors.tolerance=all` or equivalent skip-on-error settings -- skipping failed events means silent data loss; fail loudly and route to a dead letter queue
- [ ] **Missing dead letter queue**: flag CDC pipelines with no dead letter queue (DLQ) for events that fail processing -- without a DLQ, unprocessable events are either skipped (data loss) or block the pipeline indefinitely
- [ ] **Missing replication identity**: flag CDC source tables without a primary key or REPLICA IDENTITY FULL setting (PostgreSQL) -- without a replication identity, UPDATE and DELETE events cannot identify which row changed
- [ ] **Snapshot not handled**: flag CDC consumers that do not distinguish between snapshot events (initial bulk load) and streaming events (ongoing changes) -- snapshot events may have different semantics (no before-image, different ordering)

### Lag Monitoring and Operations
<!-- activation: keywords=["lag", "monitor", "alert", "delay", "behind", "offset", "consumer group", "backlog", "throughput", "backpressure"] -->

- [ ] **No lag monitoring**: flag CDC pipelines with no monitoring of consumer lag (offset lag, time-based lag) -- undetected lag means stale downstream data with no visibility into the staleness
- [ ] **No lag alerting threshold**: flag lag monitoring without an alerting threshold -- monitoring without alerting means the team discovers lag only when downstream consumers report stale data
- [ ] **No backpressure strategy**: flag high-throughput CDC pipelines with no backpressure mechanism (consumer scaling, rate limiting, buffering) -- without backpressure, a burst of source changes can overwhelm consumers
- [ ] **Replication slot growth not monitored**: flag PostgreSQL logical replication slots with no monitoring of WAL retention growth -- an inactive slot prevents WAL cleanup and can fill the disk

## Common False Positives

- **Development connectors**: CDC connectors in development or test environments may legitimately skip errors for convenience. Flag only production configurations.
- **Idempotent by destination**: if the CDC consumer writes to an idempotent destination (upsert-capable database, S3 with overwrite), explicit dedup in the consumer may be unnecessary.
- **Compacted topics**: Kafka topics with log compaction provide natural dedup for the latest state per key. Consumers reading compacted topics may not need sequence checking.
- **Single-partition topics**: if a CDC topic has one partition and one consumer, ordering is guaranteed by the platform. Do not flag missing ordering checks for single-partition setups.

## Severity Guidance

| Finding | Severity |
|---|---|
| CDC connector configured to skip errors silently (errors.tolerance=all) | Critical |
| Consumer committing offsets before processing completes (data loss) | Critical |
| Non-idempotent consumer on at-least-once CDC pipeline | Critical |
| Source schema change breaking CDC consumer deserialization | Important |
| No dead letter queue for failed event processing | Important |
| CDC source table missing replication identity / primary key | Important |
| No schema registry or compatibility mode set to NONE | Important |
| Consumer ignoring event ordering for same entity | Important |
| No consumer lag monitoring or alerting | Minor |
| Snapshot events not distinguished from streaming events | Minor |
| Replication slot WAL growth not monitored | Minor |

## See Also

- `arch-event-sourcing` -- event sourcing uses append-only event streams; CDC captures changes from mutable stores
- `data-replication-consistency` -- CDC pipelines create eventually consistent replicas; lag determines staleness
- `data-schema-migrations` -- schema migrations on CDC source tables must check downstream consumer compatibility
- `principle-fail-fast` -- CDC pipelines must fail on unprocessable events, not skip them silently
- `compliance-gdpr-data-subject-rights` -- CDC pipelines propagating PII must support GDPR deletion downstream

## Authoritative References

- [Gunnar Morling et al., "Debezium Documentation" -- CDC connector configuration and best practices](https://debezium.io/documentation/)
- [Martin Kleppmann, *Designing Data-Intensive Applications* (2017), Chapter 11: "Stream Processing"](https://dataintensive.net/)
- [Confluent Documentation, "Schema Registry" and "Schema Evolution"](https://docs.confluent.io/platform/current/schema-registry/)
- [Pat Helland, "Immutability Changes Everything" (2015) -- immutable event streams as integration backbone](https://queue.acm.org/detail.cfm?id=2884038)
