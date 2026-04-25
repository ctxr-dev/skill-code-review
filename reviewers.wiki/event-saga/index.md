---
id: event-saga
type: index
depth_role: subcategory
depth: 1
focus: "API key hardcoded in source or committed to version control; API key not rotated or shared across environments; API response not validated (missing choices, empty content); APNs certificate or p8 auth key expiry not monitored"
parents:
  - "../index.md"
shared_covers: []
entries:
  - id: ai-llm-sdk-anthropic-openai-cohere
    file: ai-llm-sdk-anthropic-openai-cohere.md
    type: primary
    focus: Detect missing API key rotation, hardcoded model names, absent retry with backoff on rate limits, missing streaming error handling, unvalidated responses, absent usage tracking, and max_tokens not set
    tags:
      - SDK
      - API-key
      - Anthropic
      - OpenAI
      - Cohere
      - retry
      - rate-limit
      - streaming
      - token-usage
      - max-tokens
  - id: api-webhook
    file: api-webhook.md
    type: primary
    focus: Detect webhook implementation gaps including missing signature verification, no retry with backoff, absent idempotency handling, unconfigured timeouts, and no secret rotation
    tags:
      - webhook
      - api
      - signature
      - hmac
      - retry
      - idempotency
      - timeout
      - secret-rotation
      - callback
  - id: domain-iot-mqtt-coap-ota-fleet
    file: domain-iot-mqtt-coap-ota-fleet.md
    type: primary
    focus: "Detect insecure MQTT/CoAP transport, overly broad topic ACLs, unsigned OTA updates, hardcoded device credentials, missing firmware rollback, telemetry flooding, and absent device attestation in IoT fleet systems"
    tags:
      - iot
      - mqtt
      - coap
      - ota
      - firmware
      - fleet
      - telemetry
      - device
      - dtls
      - shadow
      - twin
      - edge
      - embedded
      - security
  - id: notification-delivery-apns-fcm-webpush
    file: notification-delivery-apns-fcm-webpush.md
    type: primary
    focus: Detect push-notification pitfalls across APNs, FCM, and WebPush -- token handling, batching, silent-push abuse, payload privacy, and unsubscribe discipline
    tags:
      - push
      - notifications
      - apns
      - fcm
      - firebase
      - webpush
      - vapid
      - mobile
      - privacy
      - device-token
  - id: pattern-eip-routing
    file: pattern-eip-routing.md
    type: primary
    focus: Detect misuse, absence, and over-engineering of Enterprise Integration message routing patterns -- content-based routing, splitting, aggregating, and scatter-gather.
    tags:
      - eip
      - routing
      - content-based-router
      - splitter
      - aggregator
      - scatter-gather
      - routing-slip
      - recipient-list
      - enterprise-integration
  - id: reliability-backpressure
    file: reliability-backpressure.md
    type: primary
    focus: Detect unbounded queues, missing flow control between producer and consumer, and message loss under load
    tags:
      - backpressure
      - flow-control
      - queue
      - bounded
      - producer-consumer
      - reactive
      - throttle
      - overflow
  - id: event-saga-group
    file: "event-saga-group/index.md"
    type: index
    focus: Ad-hoc distributed writes across services with no saga coordination; Aggregate emitting events without validating business invariants first; Aggregate rehydration loading all events without snapshot optimization; Aggregate with hundreds of events and no snapshot mechanism
children:
  - "event-saga-group/index.md"
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Event Saga

**Focus:** API key hardcoded in source or committed to version control; API key not rotated or shared across environments; API response not validated (missing choices, empty content); APNs certificate or p8 auth key expiry not monitored

## Children

| File | Type | Focus |
|------|------|-------|
| [ai-llm-sdk-anthropic-openai-cohere.md](ai-llm-sdk-anthropic-openai-cohere.md) | 📄 primary | Detect missing API key rotation, hardcoded model names, absent retry with backoff on rate limits, missing streaming error handling, unvalidated responses, absent usage tracking, and max_tokens not set |
| [api-webhook.md](api-webhook.md) | 📄 primary | Detect webhook implementation gaps including missing signature verification, no retry with backoff, absent idempotency handling, unconfigured timeouts, and no secret rotation |
| [domain-iot-mqtt-coap-ota-fleet.md](domain-iot-mqtt-coap-ota-fleet.md) | 📄 primary | Detect insecure MQTT/CoAP transport, overly broad topic ACLs, unsigned OTA updates, hardcoded device credentials, missing firmware rollback, telemetry flooding, and absent device attestation in IoT fleet systems |
| [notification-delivery-apns-fcm-webpush.md](notification-delivery-apns-fcm-webpush.md) | 📄 primary | Detect push-notification pitfalls across APNs, FCM, and WebPush -- token handling, batching, silent-push abuse, payload privacy, and unsubscribe discipline |
| [pattern-eip-routing.md](pattern-eip-routing.md) | 📄 primary | Detect misuse, absence, and over-engineering of Enterprise Integration message routing patterns -- content-based routing, splitting, aggregating, and scatter-gather. |
| [reliability-backpressure.md](reliability-backpressure.md) | 📄 primary | Detect unbounded queues, missing flow control between producer and consumer, and message loss under load |
| [event-saga-group/index.md](event-saga-group/index.md) | 📁 index | Ad-hoc distributed writes across services with no saga coordination; Aggregate emitting events without validating business invariants first; Aggregate rehydration loading all events without snapshot optimization; Aggregate with hundreds of events and no snapshot mechanism |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
