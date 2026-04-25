---
id: net-http-1-1-2-3-quic
type: primary
depth_role: leaf
focus: "Detect HTTP protocol version misuse including HTTP/1.1 without keep-alive, HTTP/2 without TLS, missing HTTP/3 fallback, HPACK/QPACK compression attacks, and ALPN negotiation gaps"
parents:
  - index.md
covers:
  - "HTTP/1.1 with Connection: close causing a new TCP+TLS handshake per request"
  - "Head-of-line blocking in HTTP/1.1 not mitigated by connection pooling or upgrade"
  - "HTTP/2 cleartext (h2c) enabled in production exposing traffic to interception"
  - "HTTP/3 or QUIC fallback not configured causing hard failure on UDP-blocked networks"
  - "Missing ALPN negotiation leading to protocol mismatch or silent HTTP/1.1 downgrade"
  - HPACK or QPACK decompression bomb via crafted headers
  - Connection coalescing assumed without verifying certificate SAN coverage
  - "Missing Alt-Svc header preventing HTTP/3 upgrade discovery"
  - Excessive concurrent streams exhausting server resources
  - "Missing HTTP/2 flow control allowing fast sender to overwhelm slow receiver"
  - Synchronous blocking HTTP call in a request-serving thread
  - Missing connection pooling for repeated outbound calls to the same host
  - HTTP keep-alive disabled or not utilized for repeated requests
  - "Large response payloads without gzip/brotli compression"
  - Multiple sequential network calls that could be parallelized or batched
  - DNS resolution on every request instead of caching
  - Missing timeout on outbound HTTP or TCP calls
  - Chatty protocol with many small round trips instead of batch request
  - Retry without backoff or jitter causing thundering herd
  - TLS handshake per request due to no connection reuse
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
aliases:
  - perf-network-io
activation:
  file_globs:
    - "**/*http*"
    - "**/*server*"
    - "**/*proxy*"
    - "**/*gateway*"
    - "**/*nginx*"
    - "**/*haproxy*"
    - "**/*envoy*"
    - "**/*caddy*"
    - "**/*traefik*"
  keyword_matches:
    - HTTP
    - http
    - "HTTP/2"
    - "HTTP/3"
    - QUIC
    - h2
    - h3
    - h2c
    - connection
    - keep-alive
    - keepalive
    - pipeline
    - multiplexing
    - HPACK
    - QPACK
    - Alt-Svc
    - ALPN
  structural_signals:
    - HTTP server or client version configuration
    - ALPN protocol negotiation setup
    - Alt-Svc header configuration
source:
  origin: file
  path: net-http-1-1-2-3-quic.md
  hash: "sha256:c65d8daea153c1b0e7a5553fb663185b4eb55d58b55a4cde8f50f8e863cf9760"
---
# HTTP/1.1, HTTP/2, HTTP/3 and QUIC

## When This Activates

Activates when diffs touch HTTP server or client configuration, proxy settings (nginx, haproxy, envoy, caddy, traefik), ALPN negotiation, Alt-Svc headers, or HTTP version selection. Each HTTP version has distinct performance characteristics and failure modes. HTTP/1.1 suffers from head-of-line blocking and per-connection overhead. HTTP/2 multiplexes streams but introduces compression attack surface (HPACK bombs) and flow control complexity. HTTP/3 over QUIC eliminates TCP head-of-line blocking but requires UDP connectivity and careful fallback. Misconfiguring protocol versions causes latency regressions, security exposure, or connectivity failures.

## Audit Surface

- [ ] HTTP/1.1 client or server with keep-alive disabled or Connection: close set
- [ ] HTTP/1.1 pipeline of sequential requests with no parallelism strategy
- [ ] HTTP/2 cleartext (h2c) enabled on a non-localhost listener
- [ ] HTTP/3 or QUIC server with no HTTP/2 or HTTP/1.1 fallback path
- [ ] TLS configuration missing ALPN protocol list (h2, http/1.1)
- [ ] No max header list size configured (HPACK/QPACK bomb vector)
- [ ] Connection coalescing across domains without matching SAN entries
- [ ] Alt-Svc header absent on HTTP/2 server that supports HTTP/3
- [ ] MAX_CONCURRENT_STREAMS set above 250 or left at unlimited default
- [ ] HTTP/2 SETTINGS_INITIAL_WINDOW_SIZE left at 64 KB default for high-throughput use
- [ ] Server push enabled without resource awareness (wasted bandwidth)
- [ ] QUIC 0-RTT replay not mitigated for non-idempotent requests

## Detailed Checks

### HTTP/1.1 Connection Efficiency
<!-- activation: keywords=["keep-alive", "keepalive", "Connection:", "close", "pipeline", "persistent", "connection pool", "HTTP/1.1", "http1"] -->

- [ ] **Keep-alive disabled**: flag HTTP/1.1 clients or servers with `Connection: close` or keep-alive explicitly disabled -- each request pays the full TCP+TLS handshake cost (1-3 round trips), which dominates latency for small payloads
- [ ] **No connection pooling**: flag HTTP/1.1 usage making repeated requests to the same host without a connection pool -- browsers open 6 parallel connections per origin; server-to-server code should pool similarly to mitigate head-of-line blocking
- [ ] **Pipelining assumed**: flag code relying on HTTP/1.1 pipelining -- most intermediaries and servers do not support it reliably; use HTTP/2 multiplexing or concurrent connections instead

### HTTP/2 Configuration
<!-- activation: keywords=["h2", "h2c", "HTTP/2", "http2", "SETTINGS", "MAX_CONCURRENT_STREAMS", "WINDOW_SIZE", "push", "server push", "multiplexing", "stream", "priority"] -->

- [ ] **h2c in production**: flag HTTP/2 cleartext (h2c) enabled on non-localhost listeners -- h2c provides no encryption, making traffic vulnerable to interception and tampering. Use h2 (HTTP/2 over TLS) for all production traffic
- [ ] **Unlimited concurrent streams**: flag HTTP/2 servers with MAX_CONCURRENT_STREAMS not set or set above 250 -- an attacker can open thousands of streams simultaneously to exhaust server memory and CPU (Rapid Reset attack, CVE-2023-44487)
- [ ] **Default flow control window**: flag high-throughput HTTP/2 configurations using the default 64 KB initial window size -- the small window causes frequent WINDOW_UPDATE frames, adding latency on high-bandwidth transfers. Tune to 1-16 MB for bulk data
- [ ] **Server push without pruning**: flag HTTP/2 server push configurations that push resources unconditionally -- pushed resources the client already has cached waste bandwidth. Most implementations have deprecated or removed server push; prefer 103 Early Hints

### HTTP/3 and QUIC Fallback
<!-- activation: keywords=["HTTP/3", "h3", "QUIC", "quic", "Alt-Svc", "alt-svc", "UDP", "fallback", "0-RTT"] -->

- [ ] **No fallback to HTTP/2**: flag HTTP/3/QUIC-only server deployments with no HTTP/2 fallback -- corporate firewalls and some ISPs block UDP; clients unable to reach the QUIC endpoint need an HTTP/2 path
- [ ] **Missing Alt-Svc header**: flag HTTP/2 servers that support HTTP/3 but do not advertise it via the `Alt-Svc` response header -- without Alt-Svc, clients have no discovery mechanism to upgrade to HTTP/3
- [ ] **QUIC 0-RTT without replay protection**: flag HTTP/3 configurations enabling 0-RTT (early data) without restricting it to idempotent methods -- 0-RTT data can be replayed by a network attacker; non-idempotent requests (POST, PUT, DELETE) must not be processed from early data

### ALPN and Header Compression Security
<!-- activation: keywords=["ALPN", "alpn", "negotiate", "HPACK", "QPACK", "header", "compress", "bomb", "decompression", "max_header_list_size", "coalesce"] -->

- [ ] **Missing ALPN**: flag TLS configurations that do not specify ALPN protocol list -- without ALPN, the client and server cannot negotiate the HTTP version during the TLS handshake, causing silent downgrade to HTTP/1.1
- [ ] **HPACK/QPACK bomb not mitigated**: flag HTTP/2 or HTTP/3 servers without a max header list size limit (SETTINGS_MAX_HEADER_LIST_SIZE) -- an attacker can send compressed headers that expand to megabytes, exhausting server memory
- [ ] **Unsafe connection coalescing**: flag HTTP/2 connection coalescing across domains without verifying that the server certificate's SAN covers all coalesced domains -- reusing a connection for a domain not covered by the certificate violates TLS security guarantees

## Common False Positives

- **Internal service mesh**: Istio, Linkerd, and Envoy sidecars handle HTTP/2 multiplexing and connection management transparently. Application-level HTTP/1.1 to the sidecar is acceptable when the mesh handles h2 between proxies.
- **Health check endpoints**: HTTP/1.1 keep-alive disabled on health check endpoints hit by load balancers is normal -- these are single-request connections by design.
- **HTTP/2 push removed by CDN**: many CDNs (Cloudflare, Fastly) have disabled server push. Flagging missing push configuration on origins behind such CDNs is a false positive.
- **Development servers**: local development servers (webpack-dev-server, Vite) commonly use HTTP/1.1 or h2c. Do not flag unless the configuration is shared with production.

## Severity Guidance

| Finding | Severity |
|---|---|
| h2c (HTTP/2 cleartext) enabled on public-facing listener | Critical |
| MAX_CONCURRENT_STREAMS unlimited (Rapid Reset vector) | Critical |
| HPACK/QPACK decompression with no header size limit | Important |
| HTTP/1.1 keep-alive disabled on high-traffic service-to-service path | Important |
| Missing ALPN causing silent HTTP/1.1 downgrade | Important |
| HTTP/3 deployment with no HTTP/2 fallback | Important |
| QUIC 0-RTT enabled for non-idempotent requests | Important |
| Alt-Svc header missing for HTTP/3 discovery | Minor |
| HTTP/2 default flow control window on high-throughput path | Minor |
| Server push enabled without cache-awareness | Minor |

## See Also

- `crypto-tls-configuration` -- ALPN and TLS version settings are part of TLS configuration
- `net-tls-configuration` -- network-level TLS termination affects HTTP version negotiation
- `perf-network-io` -- HTTP connection management is a core network I/O concern
- `sec-owasp-a05-misconfiguration` -- h2c in production and missing stream limits are security misconfigurations
- `reliability-timeout-deadline-propagation` -- HTTP/2 stream deadlines must propagate correctly

## Authoritative References

- [RFC 9113 -- HTTP/2](https://www.rfc-editor.org/rfc/rfc9113)
- [RFC 9114 -- HTTP/3](https://www.rfc-editor.org/rfc/rfc9114)
- [RFC 9000 -- QUIC: A UDP-Based Multiplexed and Secure Transport](https://www.rfc-editor.org/rfc/rfc9000)
- [RFC 7301 -- TLS ALPN Extension](https://www.rfc-editor.org/rfc/rfc7301)
- [CVE-2023-44487 -- HTTP/2 Rapid Reset Attack](https://www.cve.org/CVERecord?id=CVE-2023-44487)
- [Cloudflare, "HTTP/2 Rapid Reset: deconstructing the record-breaking attack" (2023)](https://blog.cloudflare.com/technical-breakdown-http2-rapid-reset-ddos-attack/)
