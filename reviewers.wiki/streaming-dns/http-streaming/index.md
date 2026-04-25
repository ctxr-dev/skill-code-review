---
id: http-streaming
type: index
depth_role: subcategory
depth: 2
focus: "/etc/hosts reliance in production bypassing DNS failover; Breaking change in proto without version bump; Buffering layer defeating streaming purpose; CNAME chain too deep causing resolution latency and fragility"
parents:
  - "../index.md"
shared_covers: []
entries:
  - id: ai-llm-streaming-latency
    file: ai-llm-streaming-latency.md
    type: primary
    focus: Detect streaming not used for user-facing responses, TTFT not measured, missing partial response handling, unhandled streaming errors, and buffering that defeats the purpose of streaming
    tags:
      - streaming
      - latency
      - TTFT
      - SSE
      - WebSocket
      - buffering
      - user-experience
      - real-time
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
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Http Streaming

**Focus:** /etc/hosts reliance in production bypassing DNS failover; Breaking change in proto without version bump; Buffering layer defeating streaming purpose; CNAME chain too deep causing resolution latency and fragility

## Children

| File | Type | Focus |
|------|------|-------|
| [ai-llm-streaming-latency.md](ai-llm-streaming-latency.md) | 📄 primary | Detect streaming not used for user-facing responses, TTFT not measured, missing partial response handling, unhandled streaming errors, and buffering that defeats the purpose of streaming |
| [api-grpc.md](api-grpc.md) | 📄 primary | Detect protobuf design issues, backward compatibility violations, streaming misuse, incorrect error codes, missing deadline propagation, and oversized messages |
| [net-dns-pitfalls.md](net-dns-pitfalls.md) | 📄 primary | Detect DNS resolution issues including caching beyond TTL, resolution in hot paths, missing failover, DNS rebinding, and hardcoded IP addresses |
| [net-http-1-1-2-3-quic.md](net-http-1-1-2-3-quic.md) | 📄 primary | Detect HTTP protocol version misuse including HTTP/1.1 without keep-alive, HTTP/2 without TLS, missing HTTP/3 fallback, HPACK/QPACK compression attacks, and ALPN negotiation gaps |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
