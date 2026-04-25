---
id: consumer-event
type: index
depth_role: subcategory
depth: 1
focus: "AMQP exchange type mismatch causing messages to be dropped or misrouted; Avro default values missing, blocking reader-side evolution; Bounce handling missing -- hard and soft bounces not tracked; Breaking schema change without rolling a new major message/topic"
parents:
  - "../index.md"
shared_covers: []
entries:
  - id: analytics-event-schema-discipline
    file: analytics-event-schema-discipline.md
    type: primary
    focus: Detect analytics event-schema gaps including inconsistent naming conventions, no event registry, PII in event properties, high-cardinality dimensions, unversioned payload changes, duplicated events, missing identify-on-auth anonymous stitching, and third-party sends without contract review
    tags:
      - analytics
      - event-schema
      - tracking-plan
      - product-analytics
      - governance
      - data-quality
      - mixpanel
      - amplitude
      - segment
      - rudderstack
      - posthog
  - id: binary-serialization-protobuf-avro-flatbuffers-msgpack-thrift
    file: binary-serialization-protobuf-avro-flatbuffers-msgpack-thrift.md
    type: primary
    focus: Detect schema-evolution hazards in binary serialization formats -- reused field numbers, missing reserved markers, enum reordering, required fields added, and schema-registry integration gaps
    tags:
      - protobuf
      - thrift
      - avro
      - flatbuffers
      - capnproto
      - msgpack
      - serialization
      - schema-evolution
      - schema-registry
      - reserved
  - id: cloud-aws-eventbridge-sqs-sns-kinesis-step-functions
    file: cloud-aws-eventbridge-sqs-sns-kinesis-step-functions.md
    type: primary
    focus: Detect messaging and orchestration pitfalls including missing DLQs, absent retry configuration, incorrect visibility timeouts, Kinesis shard sizing, and Step Functions error handling gaps
    tags:
      - aws
      - eventbridge
      - sqs
      - sns
      - kinesis
      - step-functions
      - dlq
      - retry
      - messaging
      - orchestration
  - id: data-cdc-event-sourcing
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
    file: "../event-saga/event-saga-group/data-cdc-event-sourcing.md"
  - id: email-deliverability-spf-dkim-dmarc
    file: email-deliverability-spf-dkim-dmarc.md
    type: primary
    focus: "Detect email-sending misconfiguration that harms deliverability, reputation, and compliance -- SPF, DKIM, DMARC, bounce/complaint handling, unsubscribe, and IP warming"
    tags:
      - email
      - smtp
      - spf
      - dkim
      - dmarc
      - deliverability
      - bounce
      - complaint
      - unsubscribe
      - ses
      - sendgrid
      - mailgun
      - postmark
  - id: event-bus-nats-redpanda-eventstoredb
    file: event-bus-nats-redpanda-eventstoredb.md
    type: primary
    focus: Detect persistence gaps, compatibility assumptions, missing idempotency on projections, and under-configured stream policies across NATS, Redpanda, and EventStoreDB
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
  - id: net-mqtt-amqp-stomp
    file: net-mqtt-amqp-stomp.md
    type: primary
    focus: Detect messaging protocol issues including MQTT without TLS, incorrect QoS for critical messages, missing dead-letter exchanges, topic ACL gaps, and consumer acknowledgment misuse
    tags:
      - mqtt
      - amqp
      - stomp
      - broker
      - messaging
      - qos
      - dead-letter
      - topic
      - queue
      - acknowledgment
      - pub-sub
      - eip
      - message
      - event
      - kafka
      - rabbitmq
      - sqs
      - enterprise-integration
      - endpoint
      - consumer
      - producer
      - gateway
      - service-activator
      - channel-adapter
      - polling
      - competing-consumer
      - producer-consumer
      - concurrency-pattern
      - design-patterns
      - backpressure
      - pipeline
  - id: pattern-observer
    file: pattern-observer.md
    type: primary
    focus: Detect misuse, over-application, and absence of the Observer pattern in event-driven notification code.
    tags:
      - observer
      - behavioral-pattern
      - design-patterns
      - event
      - listener
      - subscribe
      - publish
      - notification
      - callback
  - id: reliability-idempotency
    file: reliability-idempotency.md
    type: primary
    focus: Detect non-idempotent operations exposed to retry or redelivery, missing idempotency keys, and partial completion without rollback
    tags:
      - idempotency
      - idempotent
      - deduplication
      - retry
      - at-least-once
      - exactly-once
      - upsert
      - side-effect
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Consumer Event

**Focus:** AMQP exchange type mismatch causing messages to be dropped or misrouted; Avro default values missing, blocking reader-side evolution; Bounce handling missing -- hard and soft bounces not tracked; Breaking schema change without rolling a new major message/topic

## Children

| File | Type | Focus |
|------|------|-------|
| [analytics-event-schema-discipline.md](analytics-event-schema-discipline.md) | 📄 primary | Detect analytics event-schema gaps including inconsistent naming conventions, no event registry, PII in event properties, high-cardinality dimensions, unversioned payload changes, duplicated events, missing identify-on-auth anonymous stitching, and third-party sends without contract review |
| [binary-serialization-protobuf-avro-flatbuffers-msgpack-thrift.md](binary-serialization-protobuf-avro-flatbuffers-msgpack-thrift.md) | 📄 primary | Detect schema-evolution hazards in binary serialization formats -- reused field numbers, missing reserved markers, enum reordering, required fields added, and schema-registry integration gaps |
| [cloud-aws-eventbridge-sqs-sns-kinesis-step-functions.md](cloud-aws-eventbridge-sqs-sns-kinesis-step-functions.md) | 📄 primary | Detect messaging and orchestration pitfalls including missing DLQs, absent retry configuration, incorrect visibility timeouts, Kinesis shard sizing, and Step Functions error handling gaps |
| [email-deliverability-spf-dkim-dmarc.md](email-deliverability-spf-dkim-dmarc.md) | 📄 primary | Detect email-sending misconfiguration that harms deliverability, reputation, and compliance -- SPF, DKIM, DMARC, bounce/complaint handling, unsubscribe, and IP warming |
| [event-bus-nats-redpanda-eventstoredb.md](event-bus-nats-redpanda-eventstoredb.md) | 📄 primary | Detect persistence gaps, compatibility assumptions, missing idempotency on projections, and under-configured stream policies across NATS, Redpanda, and EventStoreDB |
| [net-mqtt-amqp-stomp.md](net-mqtt-amqp-stomp.md) | 📄 primary | Detect messaging protocol issues including MQTT without TLS, incorrect QoS for critical messages, missing dead-letter exchanges, topic ACL gaps, and consumer acknowledgment misuse |
| [pattern-observer.md](pattern-observer.md) | 📄 primary | Detect misuse, over-application, and absence of the Observer pattern in event-driven notification code. |
| [reliability-idempotency.md](reliability-idempotency.md) | 📄 primary | Detect non-idempotent operations exposed to retry or redelivery, missing idempotency keys, and partial completion without rollback |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
