---
id: domain-streaming-kafka-pulsar-kinesis-watermarks
type: primary
depth_role: leaf
focus: Detect offset mismanagement, missing DLQ, producer misconfiguration, watermark gaps, and partition skew in streaming pipelines
parents:
  - index.md
covers:
  - Consumer not committing offsets causing reprocessing on restart
  - Missing dead-letter queue for poison messages
  - Producer without idempotency enabled
  - Missing watermark strategy causing late data to be dropped silently
  - Window size mismatch with data arrival rate
  - Partition key causing hot partitions
  - Missing exactly-once semantics on critical paths
  - Schema registry not used causing deserialization failures
  - Consumer group rebalance storms
  - Missing lag monitoring and alerting
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
activation:
  file_globs:
    - "**/*kafka*"
    - "**/*pulsar*"
    - "**/*kinesis*"
    - "**/*flink*"
    - "**/*streaming*"
    - "**/*consumer*"
    - "**/*producer*"
    - "**/*watermark*"
  keyword_matches:
    - Kafka
    - Pulsar
    - Kinesis
    - stream
    - watermark
    - window
    - late data
    - offset
    - consumer group
    - partition
    - topic
    - producer
    - broker
    - Flink
    - Spark Streaming
    - KafkaConsumer
    - KafkaProducer
    - StreamsBuilder
    - KStream
    - KTable
  structural_signals:
    - kafka_consumer_config
    - producer_config
    - stream_processor_topology
    - watermark_assignment
    - window_definition
source:
  origin: file
  path: domain-streaming-kafka-pulsar-kinesis-watermarks.md
  hash: "sha256:ad27a08035da98d208a3690609977212de5328e2d6833bc6d3c146627ad2bc19"
---
# Streaming: Kafka / Pulsar / Kinesis / Watermarks

## When This Activates

Activates on diffs involving Kafka, Pulsar, Kinesis, Flink, or Spark Streaming configurations, consumer/producer code, window operations, or watermark assignments. Streaming pipelines fail in ways that are invisible until data is audited: offsets committed before processing cause message loss, missing watermarks silently drop late data, hot partitions create throughput bottlenecks, and missing DLQs cause poison messages to block an entire consumer group. This reviewer detects these streaming-specific misconfigurations.

## Audit Surface

- [ ] Consumer auto-commits offsets before processing completes
- [ ] No dead-letter topic for poison messages
- [ ] Producer acks=0 or acks=1 on loss-intolerant path
- [ ] Producer idempotence not enabled
- [ ] No watermark strategy -- late data dropped silently
- [ ] Window duration mismatched with data arrival rate
- [ ] Partition key causes hot partitions
- [ ] No schema registry -- schema changes break consumers
- [ ] Consumer group sizing wrong relative to partition count
- [ ] No consumer lag metric or alert
- [ ] Exactly-once needed but not configured end-to-end
- [ ] No backpressure between processor and sink

## Detailed Checks

### Offset and Acknowledgment Management
<!-- activation: keywords=["offset", "commit", "ack", "acknowledge", "auto.commit", "enable.auto.commit", "checkpoint", "seek", "reset", "earliest", "latest"] -->

- [ ] **Auto-commit before processing**: flag `enable.auto.commit=true` or commit-on-timer without ensuring messages are fully processed before the commit -- a crash after commit but before processing loses messages
- [ ] **Offset committed too early**: flag manual offset commit that occurs before the processing result is persisted to the sink -- the message is lost if the sink write fails
- [ ] **Offset committed too late or never**: flag consumers that never commit offsets -- on restart, all messages since the last committed offset are reprocessed, causing duplicate side effects without idempotent consumers
- [ ] **auto.offset.reset misconfigured**: flag `auto.offset.reset=latest` on consumers where missing historical messages is unacceptable -- new consumer groups skip all existing messages

### Dead-Letter Queue and Poison Messages
<!-- activation: keywords=["DLQ", "dead letter", "dead-letter", "poison", "retry", "fail", "error", "skip", "deserialize", "corrupt", "malformed"] -->

- [ ] **No DLQ configured**: flag consumer pipelines with no dead-letter topic -- a single poison message (malformed, schema mismatch) blocks the partition indefinitely or causes infinite retries
- [ ] **Silent skip on error**: flag consumers that catch deserialization errors and silently skip the message with no logging, metric, or DLQ routing -- data loss goes undetected
- [ ] **Unbounded retries**: flag retry logic with no maximum retry count -- a permanently failing message retries forever, blocking all subsequent messages on that partition
- [ ] **DLQ without monitoring**: flag dead-letter topics with no alert on message arrival -- poison messages accumulate without anyone investigating

### Producer Configuration
<!-- activation: keywords=["producer", "acks", "idempotent", "idempotence", "enable.idempotence", "retries", "linger", "batch", "compression", "key", "partitioner"] -->

- [ ] **Missing idempotence**: flag Kafka producers without `enable.idempotence=true` -- network retries can produce duplicate messages in the topic
- [ ] **acks=0 or acks=1 on critical path**: flag producers with `acks=0` (fire-and-forget) or `acks=1` (leader-only) on paths where message loss is unacceptable -- use `acks=all` for durability
- [ ] **No message key or poor key choice**: flag producers sending keyed messages with a key that has low cardinality (boolean, enum with 2-3 values) or extreme skew -- all messages for one key land on one partition, creating a hot partition
- [ ] **Missing schema registry**: flag producers serializing with Avro, Protobuf, or JSON Schema but not registering schemas in a schema registry -- a schema change by the producer breaks all consumers with no compatibility check

### Watermarks, Windows, and Late Data
<!-- activation: keywords=["watermark", "window", "tumbling", "sliding", "session", "late", "allowed lateness", "trigger", "pane", "event time", "processing time", "WatermarkStrategy", "BoundedOutOfOrderness"] -->

- [ ] **No watermark strategy**: flag Flink/Spark Streaming window operations that use processing time instead of event time, or event-time windows with no watermark generator -- late-arriving data is either dropped or windows never close
- [ ] **Allowed lateness too short**: flag windows where `allowedLateness` is shorter than the observed data delay (e.g., 1 second allowed but data arrives up to 5 minutes late) -- late events are silently discarded
- [ ] **Window size mismatch**: flag tumbling/sliding windows whose duration is much larger than the data arrival rate (window never fills) or much smaller (excessive overhead per window) -- verify window size matches the business requirement
- [ ] **No side output for late data**: flag window operations that drop late data with no side output or logging -- late data should be routed to a secondary sink for reconciliation

### Consumer Group and Partition Management
<!-- activation: keywords=["consumer group", "group.id", "partition", "rebalance", "assign", "subscribe", "concurrency", "parallelism", "lag", "backlog"] -->

- [ ] **More consumers than partitions**: flag consumer groups with more consumer instances than topic partitions -- excess consumers sit idle, wasting resources
- [ ] **No consumer lag monitoring**: flag consumer deployments with no metric on consumer lag (offset delta between latest and committed) -- growing lag indicates the consumer cannot keep up
- [ ] **Rebalance storms**: flag consumer configurations with short `session.timeout.ms` and long processing times -- slow message processing causes the consumer to be evicted, triggering a rebalance that further slows processing
- [ ] **Static group membership not used**: flag frequently-rebalancing consumer groups that do not use `group.instance.id` for static membership -- rolling deploys cause full rebalances instead of incremental reassignment

## Common False Positives

- **Idempotent consumers by design**: consumers performing upserts or set operations are safe under reprocessing. Do not flag missing exactly-once if the consumer is inherently idempotent.
- **Processing-time windows intentional**: some use cases (monitoring dashboards, rate counters) intentionally use processing time. Do not flag missing watermarks if event-time semantics are not required.
- **Low-throughput topics**: topics with <100 messages/day do not need tuned partitioning or aggressive lag monitoring. Focus on high-throughput production topics.
- **Compacted topics**: log-compacted topics (changelog, snapshot) have different offset semantics. Do not flag offset management patterns designed for compacted topics.

## Severity Guidance

| Finding | Severity |
|---|---|
| Auto-commit offsets before processing on loss-intolerant path | Critical |
| No DLQ -- poison message blocks partition | Critical |
| Producer acks=0 on critical message path | Critical |
| Missing watermark strategy -- late data silently dropped | Important |
| Producer idempotence not enabled -- duplicates on retry | Important |
| Hot partition from skewed partition key | Important |
| No schema registry -- schema changes break consumers | Important |
| No consumer lag monitoring or alerting | Minor |
| Window size mismatched with data arrival rate | Minor |
| More consumers than partitions (wasted resources) | Minor |

## See Also

- `reliability-exactly-once-semantics` -- end-to-end exactly-once requires coordinated producer, broker, and consumer configuration
- `reliability-backpressure` -- streaming sinks that cannot keep up need backpressure to prevent unbounded buffering
- `principle-fail-fast` -- silent message drops and missing DLQs hide failures instead of surfacing them
- `reliability-idempotency` -- at-least-once delivery is safe only with idempotent consumers

## Authoritative References

- [Jay Kreps, "The Log: What every software engineer should know" (2013)](https://engineering.linkedin.com/distributed-systems/log-what-every-software-engineer-should-know-about-real-time-datas-unifying)
- [Apache Kafka Documentation, "Consumer Configurations" and "Producer Configurations"](https://kafka.apache.org/documentation/)
- [Apache Flink Documentation, "Event Time and Watermarks"](https://nightlies.apache.org/flink/flink-docs-stable/docs/concepts/time/)
- [Tyler Akidau, "The world beyond batch: Streaming 101 & 102" (O'Reilly, 2015)](https://www.oreilly.com/radar/the-world-beyond-batch-streaming-101/)
- [Confluent, "Schema Registry Overview"](https://docs.confluent.io/platform/current/schema-registry/)
