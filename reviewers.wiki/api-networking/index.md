---
id: api-networking
type: index
depth_role: subcategory
depth: 1
focus: "api-networking: Detect GraphQL Federation issues including subgraph boundary violations, entity resolution failures, shared type conflicts, and composition errors; Detect API gateway and BFF anti-patterns including business logic in the ..."
parents:
  - "../index.md"
shared_covers: []
tags:
  - acknowledgment
  - aggregation
  - algolia
  - alpn
  - alt-svc
  - amqp
  - analyzer
  - api
  - api-gateway
  - apns
  - apollo
  - architecture
  - authentication
  - authorization
  - backend-for-frontend
  - backlog
  - backpressure
  - backward-compatibility
  - bff
  - bm25
generator: "skill-llm-wiki/v1"
entries:
  - id: api-federation-apollo
    file: api-federation-apollo.md
    type: primary
    focus: Detect GraphQL Federation issues including subgraph boundary violations, entity resolution failures, shared type conflicts, and composition errors
    tags:
      - graphql
      - federation
      - apollo
      - subgraph
      - supergraph
      - gateway
      - entity
      - composition
      - resolveReference
      - schema
  - id: api-gateway-and-bff-composition
    file: api-gateway-and-bff-composition.md
    type: primary
    focus: Detect API gateway and BFF anti-patterns including business logic in the gateway, missing gateway-level rate limiting, aggregation timeout issues, and incorrect auth delegation
    tags:
      - api-gateway
      - bff
      - backend-for-frontend
      - gateway
      - composition
      - aggregation
      - routing
      - rate-limiting
      - authentication
      - authorization
      - proxy
      - frontend
      - api
      - architecture
  - id: api-graphql
    file: api-graphql.md
    type: primary
    focus: "Detect N+1 resolver queries, unbounded query depth/complexity, overfetching in schema design, missing per-field authorization, and introspection enabled in production"
    tags:
      - graphql
      - api
      - resolver
      - n+1
      - dataloader
      - query-depth
      - query-complexity
      - authorization
      - introspection
      - schema-design
  - id: api-grpc
    file: api-grpc.md
    type: primary
    focus: Detect protobuf design issues, backward compatibility violations, streaming misuse, incorrect error codes, missing deadline propagation, and oversized messages
    tags:
      - grpc
      - protobuf
      - proto
      - api
      - backward-compatibility
      - streaming
      - deadline
      - status-codes
      - message-size
      - flow-control
      - backpressure
      - channel
      - interceptor
      - keepalive
      - metadata
      - retry
  - id: api-hateoas-jsonapi-jsonld
    file: api-hateoas-jsonapi-jsonld.md
    type: primary
    focus: "Detect hypermedia API issues including missing links in responses, hardcoded URLs in clients, non-standard media types, missing self links, and incorrect JSON:API or JSON-LD structure"
    tags:
      - hateoas
      - hypermedia
      - json-api
      - jsonapi
      - json-ld
      - hal
      - links
      - rest
      - media-type
      - self-link
  - id: api-problem-json-rfc7807
    file: api-problem-json-rfc7807.md
    type: primary
    focus: Detect inconsistent API error formats, missing RFC 7807 Problem Details fields, internal detail leakage, and non-standard error response shapes
    tags:
      - error
      - error-handling
      - rfc7807
      - rfc9457
      - problem-details
      - problem-json
      - api
      - rest
      - status-code
      - security
  - id: api-rest
    file: api-rest.md
    type: primary
    focus: Detect REST convention violations including wrong HTTP methods, missing status codes, non-resource URLs, missing pagination, and inconsistent naming
    tags:
      - rest
      - api
      - http
      - http-methods
      - status-codes
      - pagination
      - naming
      - resource-design
      - idempotency
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
  - id: edge-runtimes-deno-bun-node
    file: edge-runtimes-deno-bun-node.md
    type: primary
    focus: "Detect runtime-incompatible APIs, overbroad permissions, cold-start blindspots, and unpinned deps across Deno, Bun, and Node.js (including edge/isolate deployments)"
    tags:
      - deno
      - bun
      - node
      - edge-runtime
      - isolate
      - v8
      - workers
      - deno-deploy
      - cold-start
      - permissions
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
  - id: net-dns-pitfalls
    file: net-dns-pitfalls.md
    type: primary
    focus: Detect DNS resolution issues including caching beyond TTL, resolution in hot paths, missing failover, DNS rebinding, and hardcoded IP addresses
    tags:
      - dns
      - resolution
      - ttl
      - caching
      - rebinding
      - dnssec
      - srv
      - ipv6
      - failover
      - timeout
      - multi-region
      - disaster-recovery
      - DNS
      - replication-lag
      - split-brain
      - health-routing
      - resilience
  - id: net-http-1-1-2-3-quic
    file: net-http-1-1-2-3-quic.md
    type: primary
    focus: "Detect HTTP protocol version misuse including HTTP/1.1 without keep-alive, HTTP/2 without TLS, missing HTTP/3 fallback, HPACK/QPACK compression attacks, and ALPN negotiation gaps"
    tags:
      - http
      - http2
      - http3
      - quic
      - keep-alive
      - multiplexing
      - alpn
      - hpack
      - qpack
      - alt-svc
      - protocol
      - network
      - io
      - connection-pool
      - compression
      - timeout
      - latency
      - performance
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
  - id: net-tcp-keepalive-timeouts-retries
    file: net-tcp-keepalive-timeouts-retries.md
    type: primary
    focus: "Detect TCP configuration issues including missing keepalive, absent connect/read/write timeouts, Nagle interference with latency-sensitive traffic, and connection pool health gaps"
    tags:
      - tcp
      - keepalive
      - timeout
      - nagle
      - nodelay
      - socket
      - connection-pool
      - backlog
      - reuseaddr
      - time-wait
  - id: net-tls-configuration
    file: net-tls-configuration.md
    type: primary
    focus: Detect network-level TLS deployment issues in reverse proxies and load balancers including weak cipher suites in server config, missing OCSP stapling, certificate management gaps, and TLS termination at wrong layer
    tags:
      - tls
      - ssl
      - nginx
      - haproxy
      - envoy
      - traefik
      - caddy
      - certificate
      - ocsp
      - sni
      - cipher
      - proxy
      - termination
      - mtls
      - certificates
      - authentication
      - mutual-auth
      - CWE-295
      - CWE-296
      - CWE-297
      - configuration
      - transport-security
      - CWE-326
      - CWE-327
  - id: net-webrtc
    file: net-webrtc.md
    type: primary
    focus: Detect WebRTC configuration issues including hardcoded TURN credentials, missing TURN fallback, SDP manipulation vulnerabilities, and missing encryption validation
    tags:
      - webrtc
      - ice
      - stun
      - turn
      - sdp
      - srtp
      - data-channel
      - media
      - signaling
      - peer-connection
  - id: net-websocket-protocol
    file: net-websocket-protocol.md
    type: primary
    focus: "Detect WebSocket protocol issues including missing auth on upgrade, absent heartbeat, no reconnection logic, missing message size limits, and insecure ws:// usage"
    tags:
      - websocket
      - ws
      - wss
      - upgrade
      - ping-pong
      - reconnection
      - framing
      - origin
      - rate-limit
      - protocol
      - sse
      - server-sent-events
      - real-time
      - streaming
      - heartbeat
      - authentication
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
  - id: search-tantivy-meili-typesense-algolia
    file: search-tantivy-meili-typesense-algolia.md
    type: primary
    focus: "Detect exposed admin keys, missing schema configuration (synonyms, facets, ranking), reindex and hybrid-search pitfalls across Tantivy, Meilisearch, Typesense, and Algolia"
    tags:
      - search
      - tantivy
      - meilisearch
      - typesense
      - algolia
      - instantsearch
      - index
      - synonyms
      - facets
      - ranking
      - hybrid
      - reindex
      - BM25
      - TF-IDF
      - vector-search
      - hybrid-search
      - relevance
      - elasticsearch
      - opensearch
      - solr
      - analyzer
      - tokenizer
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Api Networking

**Focus:** api-networking: Detect GraphQL Federation issues including subgraph boundary violations, entity resolution failures, shared type conflicts, and composition errors; Detect API gateway and BFF anti-patterns including business logic in the ...

## Children

| File | Type | Focus |
|------|------|-------|
| [api-federation-apollo.md](api-federation-apollo.md) | 📄 primary | Detect GraphQL Federation issues including subgraph boundary violations, entity resolution failures, shared type conflicts, and composition errors |
| [api-gateway-and-bff-composition.md](api-gateway-and-bff-composition.md) | 📄 primary | Detect API gateway and BFF anti-patterns including business logic in the gateway, missing gateway-level rate limiting, aggregation timeout issues, and incorrect auth delegation |
| [api-graphql.md](api-graphql.md) | 📄 primary | Detect N+1 resolver queries, unbounded query depth/complexity, overfetching in schema design, missing per-field authorization, and introspection enabled in production |
| [api-grpc.md](api-grpc.md) | 📄 primary | Detect protobuf design issues, backward compatibility violations, streaming misuse, incorrect error codes, missing deadline propagation, and oversized messages |
| [api-hateoas-jsonapi-jsonld.md](api-hateoas-jsonapi-jsonld.md) | 📄 primary | Detect hypermedia API issues including missing links in responses, hardcoded URLs in clients, non-standard media types, missing self links, and incorrect JSON:API or JSON-LD structure |
| [api-problem-json-rfc7807.md](api-problem-json-rfc7807.md) | 📄 primary | Detect inconsistent API error formats, missing RFC 7807 Problem Details fields, internal detail leakage, and non-standard error response shapes |
| [api-rest.md](api-rest.md) | 📄 primary | Detect REST convention violations including wrong HTTP methods, missing status codes, non-resource URLs, missing pagination, and inconsistent naming |
| [api-webhook.md](api-webhook.md) | 📄 primary | Detect webhook implementation gaps including missing signature verification, no retry with backoff, absent idempotency handling, unconfigured timeouts, and no secret rotation |
| [edge-runtimes-deno-bun-node.md](edge-runtimes-deno-bun-node.md) | 📄 primary | Detect runtime-incompatible APIs, overbroad permissions, cold-start blindspots, and unpinned deps across Deno, Bun, and Node.js (including edge/isolate deployments) |
| [email-deliverability-spf-dkim-dmarc.md](email-deliverability-spf-dkim-dmarc.md) | 📄 primary | Detect email-sending misconfiguration that harms deliverability, reputation, and compliance -- SPF, DKIM, DMARC, bounce/complaint handling, unsubscribe, and IP warming |
| [event-bus-nats-redpanda-eventstoredb.md](event-bus-nats-redpanda-eventstoredb.md) | 📄 primary | Detect persistence gaps, compatibility assumptions, missing idempotency on projections, and under-configured stream policies across NATS, Redpanda, and EventStoreDB |
| [net-dns-pitfalls.md](net-dns-pitfalls.md) | 📄 primary | Detect DNS resolution issues including caching beyond TTL, resolution in hot paths, missing failover, DNS rebinding, and hardcoded IP addresses |
| [net-http-1-1-2-3-quic.md](net-http-1-1-2-3-quic.md) | 📄 primary | Detect HTTP protocol version misuse including HTTP/1.1 without keep-alive, HTTP/2 without TLS, missing HTTP/3 fallback, HPACK/QPACK compression attacks, and ALPN negotiation gaps |
| [net-mqtt-amqp-stomp.md](net-mqtt-amqp-stomp.md) | 📄 primary | Detect messaging protocol issues including MQTT without TLS, incorrect QoS for critical messages, missing dead-letter exchanges, topic ACL gaps, and consumer acknowledgment misuse |
| [net-tcp-keepalive-timeouts-retries.md](net-tcp-keepalive-timeouts-retries.md) | 📄 primary | Detect TCP configuration issues including missing keepalive, absent connect/read/write timeouts, Nagle interference with latency-sensitive traffic, and connection pool health gaps |
| [net-tls-configuration.md](net-tls-configuration.md) | 📄 primary | Detect network-level TLS deployment issues in reverse proxies and load balancers including weak cipher suites in server config, missing OCSP stapling, certificate management gaps, and TLS termination at wrong layer |
| [net-webrtc.md](net-webrtc.md) | 📄 primary | Detect WebRTC configuration issues including hardcoded TURN credentials, missing TURN fallback, SDP manipulation vulnerabilities, and missing encryption validation |
| [net-websocket-protocol.md](net-websocket-protocol.md) | 📄 primary | Detect WebSocket protocol issues including missing auth on upgrade, absent heartbeat, no reconnection logic, missing message size limits, and insecure ws:// usage |
| [notification-delivery-apns-fcm-webpush.md](notification-delivery-apns-fcm-webpush.md) | 📄 primary | Detect push-notification pitfalls across APNs, FCM, and WebPush -- token handling, batching, silent-push abuse, payload privacy, and unsubscribe discipline |
| [search-tantivy-meili-typesense-algolia.md](search-tantivy-meili-typesense-algolia.md) | 📄 primary | Detect exposed admin keys, missing schema configuration (synonyms, facets, ranking), reindex and hybrid-search pitfalls across Tantivy, Meilisearch, Typesense, and Algolia |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
