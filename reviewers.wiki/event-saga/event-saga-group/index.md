---
id: event-saga-group
type: index
depth_role: subcategory
depth: 2
focus: Ad-hoc distributed writes across services with no saga coordination; Aggregate emitting events without validating business invariants first; Aggregate rehydration loading all events without snapshot optimization; Aggregate with hundreds of events and no snapshot mechanism
parents:
  - "../index.md"
shared_covers: []
entries:
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
    file: "../../domain-aggregate/aggregate-query/ddd-tactical-domain-events.md"
  - id: domain-streaming-kafka-pulsar-kinesis-watermarks
    file: domain-streaming-kafka-pulsar-kinesis-watermarks.md
    type: primary
    focus: Detect offset mismanagement, missing DLQ, producer misconfiguration, watermark gaps, and partition skew in streaming pipelines
    tags:
      - kafka
      - pulsar
      - kinesis
      - streaming
      - watermark
      - window
      - offset
      - consumer-group
      - partition
      - flink
      - spark-streaming
      - DLQ
      - exactly-once
  - id: reliability-exactly-once-semantics
    file: reliability-exactly-once-semantics.md
    type: primary
    focus: Detect at-most-once where at-least-once is needed, at-least-once without idempotent consumers, and exactly-once claims without transactional outbox
    tags:
      - exactly-once
      - at-least-once
      - at-most-once
      - delivery
      - idempotent
      - outbox
      - deduplication
      - ack
      - offset
      - dual-write
      - transactional-outbox
      - cdc
      - event-publishing
      - messaging
      - consistency
      - microservices
  - id: reliability-saga-distributed-tx
    file: reliability-saga-distributed-tx.md
    type: primary
    focus: "Detect saga steps without compensation, missing timeouts, non-idempotent steps, volatile state, and orchestration/choreography discipline violations"
    tags:
      - saga
      - distributed-transaction
      - compensation
      - orchestration
      - choreography
      - idempotent
      - timeout
      - consistency
      - workflow
      - event
      - command
      - architecture
      - microservices
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Event Saga Group

**Focus:** Ad-hoc distributed writes across services with no saga coordination; Aggregate emitting events without validating business invariants first; Aggregate rehydration loading all events without snapshot optimization; Aggregate with hundreds of events and no snapshot mechanism

## Children

| File | Type | Focus |
|------|------|-------|
| [data-cdc-event-sourcing.md](data-cdc-event-sourcing.md) | 📄 primary | Detect CDC lag risks, missing ordering guarantees, schema compatibility gaps, and consumer idempotency failures in change data capture and event sourcing pipelines |
| [domain-streaming-kafka-pulsar-kinesis-watermarks.md](domain-streaming-kafka-pulsar-kinesis-watermarks.md) | 📄 primary | Detect offset mismanagement, missing DLQ, producer misconfiguration, watermark gaps, and partition skew in streaming pipelines |
| [reliability-exactly-once-semantics.md](reliability-exactly-once-semantics.md) | 📄 primary | Detect at-most-once where at-least-once is needed, at-least-once without idempotent consumers, and exactly-once claims without transactional outbox |
| [reliability-saga-distributed-tx.md](reliability-saga-distributed-tx.md) | 📄 primary | Detect saga steps without compensation, missing timeouts, non-idempotent steps, volatile state, and orchestration/choreography discipline violations |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
