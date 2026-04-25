---
id: net-mqtt-amqp-stomp
type: primary
depth_role: leaf
focus: Detect messaging protocol issues including MQTT without TLS, incorrect QoS for critical messages, missing dead-letter exchanges, topic ACL gaps, and consumer acknowledgment misuse
parents:
  - index.md
covers:
  - MQTT broker connection without TLS exposing messages in transit
  - QoS 0 used for critical messages with no delivery guarantee
  - Missing last will and testament for ungraceful client disconnection
  - Topic or queue ACL too broad allowing unauthorized subscribe or publish
  - Retained messages with stale data served to new subscribers
  - AMQP exchange type mismatch causing messages to be dropped or misrouted
  - Missing dead-letter exchange for undeliverable or rejected messages
  - STOMP connection without authentication
  - Missing heartbeat or keepalive on broker connections
  - Message TTL not configured causing queue bloat
  - Missing consumer acknowledgment allowing message loss
  - Messages without schemas or contracts, breaking consumers on producer-side changes
  - God messages carrying too many fields, coupling every consumer to an ever-growing payload
  - Missing correlation IDs in request-reply flows, making response matching impossible
  - "Messages carrying behavior (serialized code, commands with logic) instead of data"
  - Missing dead-letter queues for messages that cannot be processed
  - Messages without idempotency keys, causing duplicate processing on retry
  - Fire-and-forget publish with no delivery guarantee where at-least-once is needed
  - "Missing message envelope separating headers/metadata from payload"
  - "Payload serialization format chosen without considering schema evolution (no Avro, Protobuf, or JSON Schema)"
  - Timestamp or ordering metadata absent from messages that require temporal ordering
  - "Topic/queue naming with no convention, making routing and discovery ad-hoc"
  - Consumer deserialization failures with no fallback or dead-letter handling
  - Polling consumers with no backoff or throttle, busy-waiting on empty queues
  - Event-driven consumers without error handling or dead-letter routing
  - Transactional endpoints without idempotency, causing duplicate processing on redelivery
  - Competing consumers that assume message ordering, violating concurrency guarantees
  - Service activator that leaks messaging infrastructure into business logic
  - Consumer that commits offset or acknowledges before processing completes
  - "Gateway that exposes messaging semantics (queues, topics, acks) to the caller"
  - Polling consumer that fetches one message at a time when batching is available
  - Consumer with no graceful shutdown, losing in-flight messages on termination
  - Endpoint with no health check or readiness probe, accepting messages before dependencies are ready
  - Channel adapter that hard-codes broker connection details instead of using configuration
  - Unbounded queue between producer and consumer leading to memory exhaustion under load
  - Missing backpressure causing producers to overwhelm consumers
  - Consumers that silently drop or swallow messages on processing error
  - Poison pill or shutdown signal not implemented, causing consumers to hang forever
  - Single-threaded producer-consumer where direct method calls would suffice
  - "Queue without proper visibility guarantees across threads (non-thread-safe collection)"
  - Producer-consumer with no dead-letter or retry strategy for failed messages
  - "Consumer that acknowledges messages before processing completes (at-most-once when at-least-once is needed)"
  - Multiple consumers on a non-thread-safe queue without external synchronization
  - Producer-consumer pipeline with no monitoring of queue depth or consumer lag
  - Queue ordering assumptions violated by concurrent consumers
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
aliases:
  - pattern-eip-messaging
  - pattern-eip-endpoint
  - pattern-producer-consumer
activation:
  file_globs:
    - "**/*mqtt*"
    - "**/*amqp*"
    - "**/*stomp*"
    - "**/*broker*"
    - "**/*rabbitmq*"
    - "**/*activemq*"
    - "**/*mosquitto*"
    - "**/*emqx*"
  keyword_matches:
    - MQTT
    - AMQP
    - STOMP
    - broker
    - publish
    - subscribe
    - topic
    - queue
    - QoS
    - retain
    - will
    - exchange
    - binding
    - routing_key
    - ack
    - nack
  structural_signals:
    - "MQTT client connection or publish/subscribe"
    - AMQP channel, exchange, or queue declaration
    - STOMP connection or subscription
source:
  origin: file
  path: net-mqtt-amqp-stomp.md
  hash: "sha256:4e762d23cbf1f98ad7b0285407c9110c0c37f5cdbe3a95f45cab95c0aaaeebf7"
---
# MQTT, AMQP, and STOMP Messaging

## When This Activates

Activates when diffs touch MQTT client/broker configuration, AMQP exchange/queue/binding declarations, STOMP connection setup, or message publish/subscribe logic. Messaging protocols are the backbone of event-driven and IoT architectures, but each has distinct reliability semantics. MQTT QoS levels determine delivery guarantees. AMQP exchanges route messages based on type and binding rules -- a mismatch silently drops messages. All three protocols require TLS for transport security, heartbeats for connection health, and proper acknowledgment for reliable message processing. This reviewer detects configuration gaps that cause message loss, security exposure, or resource exhaustion.

## Audit Surface

- [ ] MQTT connection without TLS (port 1883 instead of 8883)
- [ ] MQTT publish with QoS 0 on messages requiring delivery guarantee
- [ ] MQTT client with no last will and testament configured
- [ ] MQTT topic filter using # wildcard allowing subscription to all topics
- [ ] Retained message published without expiry or cleanup strategy
- [ ] AMQP exchange declared with wrong type for the routing pattern
- [ ] AMQP queue with no dead-letter exchange configured
- [ ] STOMP CONNECT frame with no login or passcode
- [ ] Broker connection with no heartbeat interval configured
- [ ] Messages published without TTL on a queue with no max-length
- [ ] Consumer using auto-ack mode for messages requiring reliable processing
- [ ] No reconnection logic on broker connection loss
- [ ] Queue declared without durability for persistent messages

## Detailed Checks

### Transport Security and Authentication
<!-- activation: keywords=["tls", "ssl", "port", "1883", "8883", "connect", "login", "password", "passcode", "auth", "credential", "anonymous", "acl"] -->

- [ ] **MQTT without TLS**: flag MQTT connections on port 1883 or with TLS explicitly disabled -- MQTT messages, including credentials sent in the CONNECT packet, are transmitted in plaintext. Use port 8883 with TLS or configure TLS on the standard port
- [ ] **STOMP without auth**: flag STOMP CONNECT frames with no `login` or `passcode` headers -- unauthenticated STOMP allows any client to publish and subscribe. Configure broker authentication
- [ ] **Topic ACL too broad**: flag MQTT topic subscriptions using the `#` multi-level wildcard (subscribes to all topics) or `+` single-level wildcard in sensitive topic hierarchies -- overly broad subscriptions expose data the client should not receive. Configure per-client topic ACLs on the broker
- [ ] **Anonymous access enabled**: flag broker configurations allowing anonymous connections in production -- every client should authenticate. Disable anonymous access on Mosquitto, EMQX, RabbitMQ, and ActiveMQ production deployments

### Message Delivery Guarantees
<!-- activation: keywords=["QoS", "qos", "ack", "nack", "acknowledge", "confirm", "publish", "deliver", "guarantee", "at-most-once", "at-least-once", "exactly-once", "auto_ack", "noAck"] -->

- [ ] **QoS 0 for critical messages**: flag MQTT publishes using QoS 0 (at-most-once, fire-and-forget) for messages that require delivery confirmation (orders, alerts, state changes) -- QoS 0 provides no acknowledgment; the message may be lost on network interruption. Use QoS 1 (at-least-once) or QoS 2 (exactly-once) for critical messages
- [ ] **Auto-ack on critical consumer**: flag AMQP consumers with `auto_ack=True` or `noAck=true` for messages that require reliable processing -- auto-ack removes the message from the queue immediately on delivery; if the consumer crashes before processing, the message is lost. Use manual acknowledgment
- [ ] **No publisher confirms**: flag AMQP publishers sending critical messages without publisher confirms (`confirm_select`) -- without confirms, the publisher does not know if the broker accepted and persisted the message
- [ ] **Queue not durable**: flag AMQP queue declarations without `durable=True` for queues handling persistent messages -- non-durable queues are lost on broker restart, along with all their messages

### Dead Letters and Message Lifecycle
<!-- activation: keywords=["dead-letter", "dlx", "dlq", "reject", "ttl", "expiry", "expire", "max-length", "overflow", "retain", "retained", "will", "testament", "lwt"] -->

- [ ] **No dead-letter exchange**: flag AMQP queues with no dead-letter exchange (DLX) configured -- rejected, expired, or overflow messages are silently dropped. Configure a DLX so failed messages can be inspected and reprocessed
- [ ] **No message TTL**: flag queues with no message TTL and no max-length policy -- if consumers stop processing, messages accumulate indefinitely, causing disk exhaustion and broker instability
- [ ] **Stale retained messages**: flag MQTT retained messages published without a cleanup or expiry strategy -- retained messages are delivered to every new subscriber; stale retained data causes new clients to act on outdated information
- [ ] **Missing last will and testament**: flag MQTT clients representing devices or services that do not configure a last will and testament (LWT) -- without LWT, other clients cannot detect that the publisher disconnected ungracefully

### Connection Management and Exchange Routing
<!-- activation: keywords=["heartbeat", "keepalive", "reconnect", "connection", "exchange", "fanout", "direct", "topic", "headers", "binding", "routing"] -->

- [ ] **No heartbeat**: flag broker connections without heartbeat interval configured -- MQTT has built-in keepalive (set in CONNECT), AMQP has negotiated heartbeats, and STOMP has heart-beat header. Without heartbeats, dead connections are not detected for minutes to hours
- [ ] **No reconnection logic**: flag broker client connections with no automatic reconnection on disconnect -- broker restarts, network blips, and load balancer drains are normal events. Use exponential backoff on reconnection
- [ ] **Exchange type mismatch**: flag AMQP message routing where the exchange type does not match the intended routing pattern -- `fanout` ignores routing keys (broadcasts to all), `direct` requires exact key match, `topic` supports wildcards. Using `fanout` when `topic` is needed sends messages to unintended consumers; using `direct` when `topic` is needed drops messages that do not match exactly
- [ ] **Binding missing or wrong key**: flag AMQP queues bound to exchanges with incorrect or missing routing keys -- messages matching no binding are silently dropped (unless an alternate exchange is configured)

## Common False Positives

- **QoS 0 for telemetry**: high-frequency sensor telemetry (temperature readings every second) commonly uses QoS 0 because individual message loss is acceptable and the next reading arrives shortly. Do not flag QoS 0 on explicitly non-critical, high-frequency telemetry topics.
- **Non-durable queues for transient data**: queues for real-time metrics, presence updates, or cache invalidation events may be intentionally non-durable because the data is transient. Verify the use case before flagging.
- **Auto-ack for idempotent consumers**: if the consumer is fully idempotent and processes each message in under a second, auto-ack may be acceptable for throughput. Verify idempotency before flagging.
- **Retained messages for device state**: MQTT retained messages are the standard pattern for publishing device current state (online/offline, last known value). This is correct usage -- flag only when retained data has no expiry and the device may be permanently removed.

## Severity Guidance

| Finding | Severity |
|---|---|
| MQTT connection without TLS in production | Critical |
| Auto-ack on consumer processing financial or order messages | Critical |
| No dead-letter exchange (rejected messages silently lost) | Important |
| QoS 0 for messages requiring delivery guarantee | Important |
| STOMP connection with no authentication | Important |
| Topic ACL allowing # wildcard subscription to all topics | Important |
| No broker heartbeat (dead connections undetected) | Important |
| Queue not durable for persistent messages | Important |
| No reconnection logic on broker disconnect | Minor |
| Missing last will and testament | Minor |
| No message TTL on unbounded queue | Minor |
| Exchange type mismatch for routing pattern | Minor |

## See Also

- `reliability-exactly-once-semantics` -- MQTT QoS 2 and AMQP publisher confirms relate to exactly-once delivery
- `reliability-circuit-breaker` -- broker connection failures should trigger circuit breaking in publishers
- `sec-owasp-a05-misconfiguration` -- anonymous broker access and missing TLS are security misconfigurations
- `api-async-event` -- async event patterns built on messaging protocols
- `reliability-backpressure` -- consumer backpressure when processing cannot keep up with message rate

## Authoritative References

- [MQTT v5.0 Specification (OASIS)](https://docs.oasis-open.org/mqtt/mqtt/v5.0/mqtt-v5.0.html)
- [AMQP 0-9-1 Model Explained (RabbitMQ)](https://www.rabbitmq.com/tutorials/amqp-concepts)
- [STOMP Protocol Specification](https://stomp.github.io/stomp-specification-1.2.html)
- [RabbitMQ Reliability Guide](https://www.rabbitmq.com/docs/reliability)
- [Eclipse Mosquitto -- Security](https://mosquitto.org/documentation/authentication-methods/)
