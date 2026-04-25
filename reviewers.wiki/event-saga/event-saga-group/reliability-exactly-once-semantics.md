---
id: reliability-exactly-once-semantics
type: primary
depth_role: leaf
focus: Detect at-most-once where at-least-once is needed, at-least-once without idempotent consumers, and exactly-once claims without transactional outbox
parents:
  - index.md
covers:
  - At-most-once delivery where message loss is unacceptable
  - At-least-once delivery without idempotent consumer causing duplicates
  - Exactly-once claims without transactional outbox or deduplication mechanism
  - Auto-ack before processing -- message lost if consumer crashes
  - Manual ack after processing but before downstream write commits
  - Dual write -- database commit and message publish not atomic
  - Consumer offset committed before processing completes
  - No dead-letter queue for poison messages causing infinite redelivery
  - Transaction outbox table without a reliable poller or CDC
  - Outbox table without a relay or poller leaving messages stuck indefinitely
  - Outbox entries without ordering guarantees causing downstream consumers to process events out of order
  - Outbox relay that does not handle duplicates forcing downstream consumers to deal with at-least-once delivery
  - Outbox table without cleanup or retention policy leading to unbounded table growth
  - "Missing outbox where a service writes to its database and publishes an event non-atomically (dual-write problem)"
  - Outbox relay that marks messages as sent but does not retry on publish failure
  - Outbox entry missing metadata needed for routing, ordering, or deduplication
  - CDC-based outbox without handling schema changes in the captured table
  - "Outbox polling interval too aggressive (wastes resources) or too slow (increases latency)"
  - Outbox relay running as a singleton with no failover or leader election
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
aliases:
  - pattern-outbox
activation:
  file_globs:
    - "**/*.{java,kt,scala,cs,ts,js,py,rb,go,rs,ex,exs}"
  keyword_matches:
    - exactly-once
    - at-least-once
    - at-most-once
    - ack
    - acknowledge
    - commit
    - offset
    - outbox
    - transactional outbox
    - CDC
    - dedup
    - deduplication
    - dead letter
    - DLQ
    - idempotent
    - consumer
    - producer
    - publish
    - subscribe
    - Kafka
    - RabbitMQ
    - SQS
    - NATS
    - Pulsar
  structural_signals:
    - auto_ack_before_processing
    - dual_write_db_and_broker
    - offset_commit_before_processing
source:
  origin: file
  path: reliability-exactly-once-semantics.md
  hash: "sha256:ff6770fc0b67e5d1872de752429629d6b2674f26e66cc687d3580e00ee39df7e"
---
# Exactly-Once Semantics

## When This Activates

Activates when diffs introduce message consumers, producers, event publishing, Kafka offset management, queue acknowledgment, or transactional outbox patterns. Distributed message delivery guarantees (at-most-once, at-least-once, effectively-exactly-once) are frequently misconfigured. The most common failures are: losing messages by acknowledging before processing, duplicating side effects by not deduplicating at-least-once deliveries, and claiming exactly-once without the atomic outbox mechanism that makes it possible.

## Audit Surface

- [ ] Consumer auto-acknowledges before processing
- [ ] At-least-once consumer has no deduplication
- [ ] No transactional outbox for atomic DB + publish
- [ ] Kafka offset committed before message processed
- [ ] Database write and message publish are separate operations
- [ ] Outbox table has no poller or CDC relay
- [ ] No dead-letter queue for poison messages
- [ ] Consumer acks then downstream write fails
- [ ] Fire-and-forget publish with no confirmation
- [ ] Outbox poller runs on multiple instances with no lock
- [ ] Deduplication window too short for late duplicates
- [ ] Exactly-once producer without read-committed consumer

## Detailed Checks

### At-Most-Once Where At-Least-Once Is Needed
<!-- activation: keywords=["ack", "acknowledge", "auto_ack", "autoAck", "auto_commit", "autoCommit", "noAck", "fire-and-forget", "confirm", "offset"] -->

- [ ] **Auto-ack before processing**: consumer configuration sets `autoAck=true`, `auto.commit.interval.ms`, or `noAck` -- message is acknowledged before the handler completes; a crash loses the message permanently
- [ ] **Offset committed before processing**: Kafka consumer commits the offset at the start of the poll loop or on a timer, before the batch is fully processed -- a crash after commit but before completion loses messages
- [ ] **Fire-and-forget publish**: producer publishes a message without waiting for broker acknowledgment (acks=0, no publisher confirms) -- message lost on broker failure
- [ ] **Ack then downstream failure**: consumer acknowledges the message, then the downstream write (database, API call) fails -- the message is lost because the broker will not redeliver it

### At-Least-Once Without Idempotent Consumer
<!-- activation: keywords=["idempotent", "dedup", "deduplication", "duplicate", "redelivery", "retry", "process", "handler", "consumer", "at-least-once"] -->

- [ ] **No deduplication on consumer**: consumer processes messages with at-least-once delivery but has no deduplication (message ID check, idempotency key, upsert) -- redelivered messages cause duplicate records, charges, or emails
- [ ] **Deduplication in memory only**: processed message IDs stored in a local set or dictionary -- process restart clears the set, and duplicates are processed again
- [ ] **Deduplication window too short**: dedup records expire after 1 hour but broker can redeliver messages up to 7 days later -- late duplicates slip through
- [ ] **No dead-letter queue**: a poison message (malformed, unprocessable) is redelivered infinitely, blocking the consumer -- configure a DLQ after N failed attempts

### Dual Write and Transactional Outbox
<!-- activation: keywords=["outbox", "transactional", "dual write", "publish", "event", "database", "commit", "transaction", "CDC", "change data capture", "poller", "relay"] -->

- [ ] **Dual write**: code writes to the database and then publishes a message to the broker as two separate operations -- if the publish fails, the database write is committed without the message; if the process crashes between the two, the message is lost
- [ ] **No outbox pattern**: events that must be published reliably are sent directly to the broker without a transactional outbox -- use an outbox table written in the same DB transaction as the business data
- [ ] **Outbox table without relay**: outbox table exists but no poller, CDC (Debezium), or relay process reads from it and publishes to the broker -- messages accumulate in the table forever
- [ ] **Outbox poller without distributed lock**: multiple service instances each run an outbox poller -- without a lock, the same outbox record is published multiple times
- [ ] **Outbox records not marked as published**: poller reads and publishes but does not delete or mark records -- records are republished on every poll cycle

### End-to-End Exactly-Once Configuration
<!-- activation: keywords=["exactly-once", "transactional", "isolation", "read-committed", "idempotent producer", "enable.idempotence", "transactional.id", "processing.guarantee"] -->

- [ ] **Producer idempotence without consumer dedup**: Kafka producer has `enable.idempotence=true` (prevents duplicate publishes) but the consumer does not use `isolation.level=read_committed` -- the consumer sees uncommitted messages from aborted transactions
- [ ] **Exactly-once Kafka Streams without transactional sink**: Kafka Streams `processing.guarantee=exactly_once_v2` but the sink writes to an external database without idempotent writes -- exactly-once is broken at the boundary
- [ ] **Cross-system exactly-once claimed**: code comments or docs claim exactly-once delivery between two different systems (e.g., Kafka to PostgreSQL) without a transactional outbox or CDC bridge -- cross-system exactly-once requires the outbox pattern or two-phase commit

## Common False Positives

- **Idempotent operations by nature**: consumers that perform upserts (INSERT ON CONFLICT UPDATE), set operations (SADD), or overwrite operations are inherently idempotent. Do not flag missing deduplication if the operation itself is idempotent.
- **At-most-once acceptable**: some workloads (metrics, logs, ephemeral notifications) accept message loss. Do not flag at-most-once delivery if the use case explicitly tolerates loss.
- **Exactly-once within Kafka Streams**: Kafka Streams with `exactly_once_v2` provides end-to-end exactly-once within the Kafka ecosystem. Do not flag this as "claims without outbox" -- the exactly-once guarantee is real within Kafka-to-Kafka processing.
- **Framework-managed ack**: Spring Kafka, MassTransit, and similar frameworks manage acknowledgment after the handler returns. Verify framework behavior before flagging auto-ack.

## Severity Guidance

| Finding | Severity |
|---|---|
| Auto-ack before processing on a financial or order message | Critical |
| Dual write (DB + publish) with no outbox pattern | Critical |
| At-least-once consumer with no deduplication on payment/order events | Critical |
| Kafka offset committed before batch processing completes | Important |
| No dead-letter queue for poison messages (infinite redelivery) | Important |
| Outbox table with no poller or CDC relay | Important |
| Fire-and-forget publish on critical event path | Important |
| Deduplication window shorter than broker retention/redelivery window | Minor |
| Outbox poller on multiple instances without distributed lock | Minor |
| Exactly-once producer without read-committed consumer isolation | Minor |

## See Also

- `reliability-idempotency` -- idempotent consumers are the mechanism that makes at-least-once delivery safe
- `reliability-saga-distributed-tx` -- saga steps use at-least-once delivery and must be idempotent
- `pattern-outbox` -- transactional outbox is the canonical solution to the dual-write problem
- `reliability-backpressure` -- consumer backpressure interacts with delivery guarantees; slow consumers must not lose acked messages
- `principle-fail-fast` -- auto-ack before processing silently loses messages, hiding failures

## Authoritative References

- [Martin Kleppmann, *Designing Data-Intensive Applications* (2017), Chapter 11: "Stream Processing"](https://dataintensive.net/)
- [Jay Kreps, "Exactly-once Semantics Are Possible" (Confluent, 2017)](https://www.confluent.io/blog/exactly-once-semantics-are-possible-heres-how-apache-kafka-does-it/)
- [Pat Helland, "Life beyond Distributed Transactions" (2007)](https://queue.acm.org/detail.cfm?id=3025012)
- [Gunnar Morling, "Reliable Microservices Data Exchange With the Outbox Pattern" (Debezium)](https://debezium.io/blog/2019/02/19/reliable-microservices-data-exchange-with-the-outbox-pattern/)
