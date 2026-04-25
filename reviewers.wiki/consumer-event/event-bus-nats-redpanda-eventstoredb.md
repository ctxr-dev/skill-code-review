---
id: event-bus-nats-redpanda-eventstoredb
type: primary
depth_role: leaf
focus: Detect persistence gaps, compatibility assumptions, missing idempotency on projections, and under-configured stream policies across NATS, Redpanda, and EventStoreDB
parents:
  - index.md
covers:
  - "NATS core pub/sub used where JetStream persistence is required"
  - Redpanda config assumed Kafka-compatible without explicit verification
  - EventStoreDB projections without idempotency -- replays cause duplicate side effects
  - "Stream / bucket retention policy missing or defaulted to unlimited"
  - Subscription without durable consumer -- restart loses position
  - "Missing flow control / slow consumer disconnects in NATS JetStream"
  - Stream replication factor too low for production durability
  - "Stream-level auth absent -- all clients can publish/subscribe to any subject"
  - "Consumer offset/sequence commit before side-effect write completes"
tags:
  - nats
  - jetstream
  - redpanda
  - eventstoredb
  - event-store
  - stream
  - subject
  - event-sourcing
  - messaging
  - kafka-compatible
activation:
  file_globs:
    - "**/*.java"
    - "**/*.kt"
    - "**/*.scala"
    - "**/*.cs"
    - "**/*.go"
    - "**/*.rs"
    - "**/*.py"
    - "**/*.ts"
    - "**/*.js"
    - "**/*.rb"
    - "**/*.yaml"
    - "**/*.yml"
    - "**/*.toml"
  keyword_matches:
    - NATS
    - nats.io
    - JetStream
    - js.publish
    - jetstream
    - Redpanda
    - rpk
    - EventStoreDB
    - event_store
    - EventStore
    - stream
    - subject
    - projection
    - catch-up subscription
    - persistent subscription
    - durable
    - ack_policy
    - retention
  structural_signals:
    - nats_publish_without_jetstream
    - jetstream_stream_config
    - eventstore_projection_definition
    - redpanda_broker_config
    - kafka_compat_admin_call
source:
  origin: file
  path: event-bus-nats-redpanda-eventstoredb.md
  hash: "sha256:d03638c40ae17230814c868403c6ba59d715dadfd10ba84ba1cbb6d7a8b75ef7"
---
# Event Bus: NATS, Redpanda, EventStoreDB

## When This Activates

Activates on diffs that configure or use NATS (core or JetStream), Redpanda (Kafka API-compatible), or EventStoreDB. The three share a family resemblance (streams, subscriptions, consumers) but differ in defaults, durability semantics, and operational surface. Common mistakes: using NATS core where JetStream persistence is required; assuming Redpanda is a drop-in Kafka without verifying every API call; running EventStoreDB projections that are not idempotent, so a replay corrupts downstream state. This reviewer applies alongside `reliability-exactly-once-semantics` and `reliability-backpressure`.

## Audit Surface

- [ ] NATS `publish`/`subscribe` used for data that must survive broker restart (no JetStream)
- [ ] NATS JetStream stream created without `retention`, `max_age`, `max_bytes`, `max_msgs`
- [ ] JetStream consumer with `ack_policy=None` on a stream that needs delivery guarantees
- [ ] Subscription without durable name -- offset resets on reconnect
- [ ] Redpanda topic config copied from Kafka without verifying schema registry / transactions support
- [ ] Kafka admin API used against Redpanda without verifying supported admin surface
- [ ] EventStoreDB projection treats events as non-idempotent on replay
- [ ] EventStoreDB subscription starts from `$all` without a checkpoint strategy
- [ ] Missing consumer group / queue group -- all consumers receive every message
- [ ] Replication factor = 1 in production
- [ ] No TLS between client and broker
- [ ] No per-subject / per-stream auth
- [ ] Slow consumer drops messages without alerting or DLQ
- [ ] Projection without idempotency key from event metadata
- [ ] Stream retention policy 'interest' on a durable-subscription stream
- [ ] Producer publishes without acks=all / durable=true in high-value write path
- [ ] Consumer ack / commit before downstream side effect completes
- [ ] No dead-letter stream / replay mechanism for poison events

## Detailed Checks

### NATS Core vs JetStream Persistence
<!-- activation: keywords=["nc.publish", "nc.subscribe", "nats.connect", "jetstream", "JetStream", "js.publish", "StreamConfig", "ConsumerConfig", "add_stream", "addStream"] -->

- [ ] **Core NATS for durable data**: flag `nc.publish("orders.created", data)` in a path where the message must not be lost on broker restart -- core NATS is at-most-once in-memory delivery. Use JetStream (`js.publish`) with a configured stream.
- [ ] **JetStream stream with no retention limits**: flag `StreamConfig{ subjects: [...] }` without `max_age` / `max_bytes` / `max_msgs` -- storage grows unbounded. Also set a `retention` policy (`limits`, `interest`, `workqueue`) explicitly.
- [ ] **Interest-based retention on a late consumer**: flag `retention: interest` on a stream whose consumers may disconnect for long periods -- messages are deleted when no active interest. Use `limits` retention for durable subscribers.
- [ ] **Consumer `ack_policy=None` with business events**: flag `AckPolicy::None` on consumers of critical events -- no delivery guarantee. Use `Explicit` (preferred) or `All`.
- [ ] **Non-durable ephemeral consumer for a persistent subscriber**: flag consumer creation without a `durable_name` in a service that restarts -- ephemeral consumers disappear on disconnect and lose position.

### Flow Control, Backpressure, and Slow Consumers
<!-- activation: keywords=["flow_control", "flowControl", "max_ack_pending", "ack_wait", "idle_heartbeat", "slow consumer", "drop", "pending_msgs"] -->

- [ ] **No `max_ack_pending` on a slow path**: flag JetStream consumers without `max_ack_pending` for workloads with variable processing time -- unbounded in-flight messages OOM the client or overwhelm downstream.
- [ ] **Slow-consumer drops without alert**: flag clients that do not monitor `slow_consumer` events / dropped-message counters -- NATS drops messages when a subscriber can't keep up; this must be observable.
- [ ] **`ack_wait` shorter than processing P99**: flag `ack_wait` (redelivery timeout) smaller than the 99th percentile handler duration -- the same message is redelivered while the first handler is still running.
- [ ] **Flow control disabled on push consumer**: flag push consumers without `flow_control=true` and `idle_heartbeat` -- without flow control the consumer can be overwhelmed; without heartbeats the client can't detect disconnection.

### Redpanda Kafka Compatibility Verification
<!-- activation: keywords=["bootstrap.servers", "kafka-clients", "franz-go", "confluent-kafka", "schema registry", "redpanda", "rpk", "isolation.level", "transactional.id", "idempotent"] -->

- [ ] **Assuming full Kafka admin API parity**: flag use of Kafka admin APIs against Redpanda without checking the compat matrix -- Redpanda is ~Kafka-compatible but specific admin calls and MirrorMaker2 features vary by version.
- [ ] **Transactions assumed**: flag use of Kafka transactions (`transactional.id`, `isolation.level=read_committed`) without verifying the Redpanda version supports them in production (earlier versions had limitations).
- [ ] **Schema registry assumed compatible**: flag `schema.registry.url` pointing at a non-Redpanda Schema Registry without checking compatibility -- Redpanda has its own Schema Registry implementation; third-party registries may differ on subject naming and compatibility rules.
- [ ] **tiered storage / compaction config copied verbatim**: flag broker-side tiered storage or log-compaction settings copied from a Kafka cluster without validating Redpanda-specific property names -- Redpanda uses its own config keys (`redpanda.yaml`) even when Kafka-compatible settings exist.
- [ ] **`acks=1` where `acks=all` is needed**: flag producer configuration with `acks=1` for high-value writes -- `acks=1` loses data on leader failure. Use `acks=all` plus `min.insync.replicas >= 2`.

### EventStoreDB Projections and Idempotency
<!-- activation: keywords=["projection", "continuous", "catch-up", "persistent subscription", "subscribeToAll", "subscribe_to_all", "$by_category", "linkTo", "emit", "checkpoint"] -->

- [ ] **Non-idempotent projection**: flag projection handlers that perform non-idempotent side effects (increment a counter, insert without dedup key) -- projections can replay from any checkpoint. Use `eventId` or `causationId` as an idempotency key.
- [ ] **Projection emits with linkTo but without guard**: flag `linkTo` / `emit` inside a projection without checking whether the link already exists -- re-emission on replay duplicates.
- [ ] **Catch-up subscription without checkpoint store**: flag subscriptions that start from `$all` or `$ce-<category>` without persisting the last processed position -- on restart you replay everything or (worse) rely on in-memory state.
- [ ] **Persistent subscription ack before side effect**: flag `ack(eventId)` called before the downstream side effect (DB write, outbound API) succeeds -- on crash the event is considered processed while the side effect was lost.
- [ ] **$all subscription without category/type filter**: flag raw `$all` subscriptions consumed by a bounded context that only needs a few streams -- filter at the subscription via `IEventFilter` or subscribe to `$ce-<category>`.

### Durability, Replication, and Consistency
<!-- activation: keywords=["num_replicas", "replication_factor", "replicas", "min.insync.replicas", "acks", "durable", "quorum", "storage", "file", "memory"] -->

- [ ] **Replication factor = 1**: flag `num_replicas: 1` for JetStream or `replication.factor=1` for Redpanda topics on production clusters -- no tolerance for broker loss. Use 3 with `min.insync.replicas=2`.
- [ ] **`storage: memory` for durable data**: flag JetStream streams configured with `storage: memory` for durable events -- lost on broker restart. Use `file` storage.
- [ ] **Producer publish without durability flag**: flag NATS `publish` where JetStream API is used but without waiting for ack -- `js.publish` is async; ensure code awaits the PubAck, not fire-and-forget.
- [ ] **EventStoreDB cluster running single-node in production**: flag `EVENTSTORE_CLUSTER_SIZE=1` for production -- run a 3-node cluster with gossip.

### Authentication, Authorization, and Transport Security
<!-- activation: keywords=["nats://", "tls", "ssl", "credsFile", "nkeys", "jwt", "account", "permission", "user", "pass", "token", "mtls", "SASL"] -->

- [ ] **No TLS to broker**: flag `nats://broker:4222` / `kafka://broker:9092` / `esdb://server:2113?tls=false` in production configs -- use TLS (`tls://`, `kafka+ssl://`, `esdb+tls://`) with CA pinning.
- [ ] **No subject-level auth (NATS)**: flag NATS server configs that permit wildcard publish/subscribe for all accounts -- define per-account permissions for subject patterns.
- [ ] **Redpanda ACLs absent**: flag `rpk acl list` showing no ACLs for a production cluster -- enforce topic-level allow/deny. Also verify `superusers` is set.
- [ ] **EventStoreDB default admin password**: flag deployments retaining the default `admin/changeit` credentials -- rotate and store in secret manager.
- [ ] **JetStream accounts sharing a single user**: flag all services using the same JetStream creds -- blast radius on compromise. One cred per service, scoped subjects.

### Poison Messages, DLQ, and Recovery
<!-- activation: keywords=["dead letter", "dlq", "poison", "maxDeliver", "max_deliver", "redeliver", "replay", "retry", "DeadLetterStream"] -->

- [ ] **No `max_deliver`**: flag JetStream consumers without `max_deliver` -- a poison message redelivers indefinitely, blocking the consumer.
- [ ] **`max_deliver` set but no DLQ**: flag consumers that stop redelivery but discard the message instead of routing to a DLQ stream -- lost errors mean lost debuggability.
- [ ] **No replay tooling for EventStoreDB**: flag services reading a stream without a documented way to replay from a checkpoint -- when a downstream bug is fixed, you need replay.

## Common False Positives

- **NATS core for hot ephemeral data**: telemetry fan-out, presence pings, and request/reply patterns are legitimate core-NATS use cases. Flag only when the data must survive restart.
- **Single-replica dev clusters**: `replication_factor=1` in a dev/test config is fine. Flag production-targeted configs (checked via environment/branch).
- **Redpanda using truly Kafka-compatible slice**: consumer/producer APIs via `librdkafka` / `franz-go` are broadly compatible. Flag only admin/transaction/schema-registry edges.
- **Projections that are already idempotent by construction**: a projection that writes a `PUT` (not `INSERT`) by event id is naturally idempotent -- no explicit key check needed.
- **Test-only brokers without TLS/auth**: local docker-compose with auth disabled is fine; flag only production/staging configs.

## Severity Guidance

| Finding | Severity |
|---|---|
| NATS core used for data that must survive broker restart | Critical |
| Replication factor = 1 in production (any of the three) | Critical |
| EventStoreDB projection with non-idempotent side effect | Critical |
| Consumer acks before downstream side effect commits | Critical |
| No TLS between client and broker in production | Critical |
| Default or shared broker credentials in production | Critical |
| JetStream `storage: memory` for durable events | Important |
| No `max_deliver` + DLQ for poison message handling | Important |
| `acks=1` / missing PubAck wait in high-value write path | Important |
| Consumer without durable name in a restartable service | Important |
| No subject/topic-level ACLs on a multi-tenant broker | Important |
| No `max_ack_pending` on a slow JetStream consumer | Important |
| Redpanda admin/transaction feature used without compat verification | Important |
| `ack_wait` shorter than P99 processing time | Important |
| `$all` subscription without filter where category filter suffices | Minor |
| Stream missing explicit retention even with reasonable defaults | Minor |
| Projection replay tooling not documented | Minor |

## See Also

- `reliability-exactly-once-semantics` -- ack-before-write, idempotent consumers, outbox
- `reliability-backpressure` -- `max_ack_pending`, flow control, slow consumers
- `sec-owasp-a05-misconfiguration` -- default creds, missing TLS, missing ACLs
- `sec-secrets-management-and-rotation` -- broker creds and rotation
- `api-async-event` -- event contracts, schema evolution
- `perf-network-io` -- broker throughput and batch tuning

## Authoritative References

- [NATS JetStream Concepts](https://docs.nats.io/nats-concepts/jetstream)
- [NATS JetStream Consumers](https://docs.nats.io/nats-concepts/jetstream/consumers)
- [Redpanda vs Kafka Feature Matrix](https://docs.redpanda.com/current/reference/kafka-compatibility/)
- [Redpanda Topic Configuration](https://docs.redpanda.com/current/reference/properties/topic-properties/)
- [EventStoreDB Projections](https://developers.eventstore.com/server/v22.10/projections.html)
- [EventStoreDB Persistent Subscriptions](https://developers.eventstore.com/clients/grpc/persistent-subscriptions.html)
- [Kafka `acks` semantics](https://kafka.apache.org/documentation/#producerconfigs_acks)
