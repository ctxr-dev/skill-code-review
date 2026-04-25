---
id: net-websocket-protocol
type: primary
depth_role: leaf
focus: "Detect WebSocket protocol issues including missing auth on upgrade, absent heartbeat, no reconnection logic, missing message size limits, and insecure ws:// usage"
parents:
  - index.md
covers:
  - WebSocket upgrade handler with no authentication or authorization check
  - "No heartbeat or ping/pong mechanism to detect dead connections"
  - Missing reconnection with exponential backoff on connection drop
  - Message framing issues causing partial message delivery
  - No message size limit allowing memory exhaustion attacks
  - No rate limiting on incoming WebSocket messages
  - Missing close frame handling causing unclean disconnections
  - Binary and text frame confusion causing decode errors
  - "WebSocket over ws:// instead of wss:// exposing traffic in transit"
  - Missing origin validation enabling cross-site WebSocket hijacking
  - WebSocket or SSE connection with no heartbeat or keepalive mechanism
  - Client with no automatic reconnection logic on connection drop
  - WebSocket messages with no framing protocol or message type envelope
  - Missing authentication on WebSocket upgrade or SSE endpoint
  - No connection idle timeout allowing abandoned connections to persist
  - Missing backpressure handling when server sends faster than client consumes
  - SSE endpoint with no retry field for client reconnection timing
  - WebSocket endpoint with no message size limit
  - No graceful shutdown protocol for active connections
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
aliases:
  - api-sse-and-websocket-protocol
activation:
  file_globs:
    - "**/*websocket*"
    - "**/*ws*"
    - "**/*socket*"
    - "**/*realtime*"
    - "**/*real-time*"
  keyword_matches:
    - WebSocket
    - websocket
    - ws
    - wss
    - socket
    - upgrade
    - frame
    - ping
    - pong
    - close
    - onmessage
    - onclose
    - onerror
    - socket.io
    - "ws://"
  structural_signals:
    - WebSocket server or handler creation
    - WebSocket upgrade handling
    - WebSocket client connection
source:
  origin: file
  path: net-websocket-protocol.md
  hash: "sha256:c75180eb33795bab992206aac017fb4e35667d3d70fa78aa2603537ad89dafc4"
---
# WebSocket Protocol

## When This Activates

Activates when diffs touch WebSocket server or client implementations, upgrade handlers, message handling, or real-time communication setup. WebSocket connections are long-lived, stateful, and fundamentally different from HTTP request-response. They require authentication at upgrade time (HTTP middleware does not run on subsequent frames), heartbeats to detect dead connections, reconnection logic for inevitable network drops, message size limits to prevent abuse, and TLS (wss://) for transport security. This reviewer focuses on protocol-level correctness and security gaps specific to WebSocket. It complements `api-sse-and-websocket-protocol` which covers the broader real-time streaming pattern including SSE.

## Audit Surface

- [ ] WebSocket upgrade with no auth token or session validation
- [ ] WebSocket server with no ping/pong interval configured
- [ ] Client WebSocket with no reconnection logic on close or error
- [ ] Reconnection with fixed delay instead of exponential backoff
- [ ] WebSocket accepting messages without maxPayload or size limit
- [ ] No per-connection or per-IP message rate limit
- [ ] WebSocket connection closed without sending close frame
- [ ] Text frame sent where binary was expected or vice versa
- [ ] ws:// URL used in production (no TLS)
- [ ] WebSocket server not validating Origin header on upgrade
- [ ] No idle timeout for connections with no activity
- [ ] Partial message reassembly not handled for fragmented frames
- [ ] No per-user connection limit

## Detailed Checks

### Authentication and Origin Security
<!-- activation: keywords=["auth", "token", "jwt", "cookie", "session", "upgrade", "origin", "Origin", "handshake", "header", "credential", "CORS"] -->

- [ ] **No auth on upgrade**: flag WebSocket upgrade handlers that accept connections without validating authentication (JWT, session cookie, or short-lived token) -- after the upgrade, HTTP middleware does not execute on WebSocket frames; all auth must happen during the handshake
- [ ] **Missing origin validation**: flag WebSocket servers that do not check the `Origin` header during the upgrade request -- without origin validation, any website can open a WebSocket to the server (cross-site WebSocket hijacking), stealing data or performing actions as the authenticated user
- [ ] **Long-lived token in URL**: flag WebSocket connections passing auth tokens in the URL query string without short expiry -- URL tokens are logged by proxies and servers. Use tokens with seconds-level expiry or pass credentials via the first message after connection
- [ ] **No per-message authorization**: flag WebSocket handlers that authenticate only at connection time but allow all message types without per-message permission checks -- a user's permissions may change during a long-lived connection

### Heartbeat and Connection Health
<!-- activation: keywords=["ping", "pong", "heartbeat", "keepalive", "alive", "interval", "timeout", "idle", "dead", "stale"] -->

- [ ] **No server ping/pong**: flag WebSocket servers with no ping frame interval configured -- without heartbeats, half-open connections persist indefinitely, consuming memory and file descriptors. Send pings every 30-60 seconds
- [ ] **Client not responding to pings**: flag WebSocket client implementations that do not respond to ping frames with pong -- the server cannot distinguish a live idle client from a dead connection
- [ ] **No idle timeout**: flag WebSocket connections with no maximum idle duration -- connections where no data or ping/pong has been exchanged should be closed after a configurable period to reclaim resources
- [ ] **No client-side heartbeat timeout**: flag clients that do not monitor for missing server pings -- even with server-side pings, the client should detect when it has not received any data within an expected interval and trigger reconnection

### Reconnection and Resilience
<!-- activation: keywords=["reconnect", "reconnection", "retry", "backoff", "jitter", "close", "error", "onclose", "onerror", "disconnect"] -->

- [ ] **No reconnection logic**: flag WebSocket clients with no reconnection on close or error events -- network interruptions, server restarts, and load balancer drains are normal; clients must reconnect automatically
- [ ] **Fixed-delay reconnection**: flag reconnection logic that reconnects immediately or at a fixed interval -- use exponential backoff with jitter to prevent thundering herd when many clients reconnect simultaneously after a server restart
- [ ] **No max reconnect attempts**: flag reconnection logic with no upper bound or circuit breaker -- infinitely reconnecting to an unreachable server wastes battery (mobile), bandwidth, and client resources
- [ ] **State not restored after reconnect**: flag clients that reconnect but do not re-subscribe to channels, replay missed messages, or restore application state -- a reconnection that drops state is equivalent to data loss for the user

### Message Framing and Size Limits
<!-- activation: keywords=["message", "frame", "maxPayload", "maxSize", "binary", "text", "opcode", "fragment", "size", "limit", "parse", "serialize"] -->

- [ ] **No message size limit**: flag WebSocket servers without a `maxPayload` or equivalent size limit -- a single oversized message can exhaust server memory. Set a limit appropriate for the use case (e.g., 64 KB for chat, 1 MB for file transfer)
- [ ] **Binary/text frame mismatch**: flag code sending binary data as a text frame or text as a binary frame -- text frames must contain valid UTF-8; sending binary data as text causes decode errors on the receiver. Use the correct opcode for the data type
- [ ] **No rate limiting**: flag WebSocket servers with no per-connection message rate limit -- a malicious or buggy client can flood the server with messages, consuming CPU and potentially affecting other connections on the same server
- [ ] **Missing close frame**: flag WebSocket connections terminated by dropping the TCP connection without sending a close frame with status code and reason -- proper close frames allow the other side to distinguish intentional disconnection from network failure and clean up resources

### Transport Security
<!-- activation: keywords=["ws://", "wss://", "tls", "ssl", "secure", "encrypt", "plaintext", "insecure"] -->

- [ ] **ws:// in production**: flag WebSocket connections using `ws://` instead of `wss://` in production configuration -- unencrypted WebSocket traffic is vulnerable to interception and modification by any intermediary on the network path
- [ ] **Mixed content**: flag HTTPS pages that open WebSocket connections over `ws://` -- browsers block mixed content by default; this causes a connection failure in addition to the security risk

## Common False Positives

- **Socket.IO and similar libraries**: Socket.IO, Phoenix Channels, and ActionCable handle ping/pong, reconnection, and framing internally. Verify library configuration rather than flagging missing manual implementation.
- **Development and testing**: localhost WebSocket connections using `ws://` and without auth are normal in development. Verify these are not deployed to production.
- **Internal service mesh**: WebSocket connections between internal services on a trusted network with mTLS at the mesh layer may not need application-level origin validation or per-connection auth.
- **Browser native ping/pong**: browser WebSocket API does not expose ping/pong frames; the browser handles pong responses automatically. Do not flag browser-side code for missing pong handling.

## Severity Guidance

| Finding | Severity |
|---|---|
| WebSocket upgrade with no authentication check | Critical |
| Missing origin validation (cross-site WebSocket hijacking) | Critical |
| ws:// used in production (no encryption) | Critical |
| No ping/pong heartbeat (connections die silently) | Important |
| No client reconnection logic | Important |
| No message size limit (memory exhaustion) | Important |
| No per-connection rate limit | Important |
| Fixed-delay reconnection without backoff | Minor |
| Close without close frame | Minor |
| Binary/text frame type mismatch | Minor |
| No idle timeout on WebSocket connections | Minor |

## See Also

- `api-sse-and-websocket-protocol` -- broader real-time streaming patterns including SSE
- `sec-owasp-a01-broken-access-control` -- WebSocket auth is a specific access control concern
- `sec-rate-limit-and-dos` -- message rate limiting is DoS prevention for persistent connections
- `sec-owasp-a10-ssrf` -- WebSocket proxies can be SSRF vectors
- `reliability-circuit-breaker` -- reconnection logic should include circuit breaking

## Authoritative References

- [RFC 6455 -- The WebSocket Protocol](https://datatracker.ietf.org/doc/html/rfc6455)
- [OWASP Testing Guide -- WebSocket Security](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/11-Client-side_Testing/10-Testing_WebSockets)
- [MDN -- WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Christian Schneider, "Cross-Site WebSocket Hijacking" (2013)](https://christian-schneider.net/CrossSiteWebSocketHijacking.html)
