---
id: net-tcp-keepalive-timeouts-retries
type: primary
depth_role: leaf
focus: "Detect TCP configuration issues including missing keepalive, absent connect/read/write timeouts, Nagle interference with latency-sensitive traffic, and connection pool health gaps"
parents:
  - index.md
covers:
  - Missing TCP keepalive causing dead connections to persist undetected for hours
  - Keepalive interval too long to detect failures promptly
  - Missing connect, read, or write timeouts on socket operations
  - "Nagle's algorithm not disabled for latency-sensitive traffic"
  - Missing SO_REUSEADDR or SO_REUSEPORT causing bind failures on restart
  - Connection pool without health check allowing dead connections to be handed out
  - Missing TCP backlog tuning causing connection drops under load
  - Half-open connections not detected by the application
  - FIN_WAIT and TIME_WAIT accumulation exhausting ephemeral ports
  - Missing RST handling causing application errors on connection reset
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
activation:
  file_globs:
    - "**/*socket*"
    - "**/*tcp*"
    - "**/*connection*"
    - "**/*pool*"
    - "**/*server*"
    - "**/*client*"
    - "**/*net*"
  keyword_matches:
    - TCP
    - tcp
    - keepalive
    - keep-alive
    - SO_KEEPALIVE
    - TCP_KEEPIDLE
    - TCP_KEEPINTVL
    - TCP_KEEPCNT
    - timeout
    - connect_timeout
    - read_timeout
    - write_timeout
    - socket
    - Nagle
    - TCP_NODELAY
  structural_signals:
    - TCP socket creation or configuration
    - Socket option setting
    - Connection pool configuration
source:
  origin: file
  path: net-tcp-keepalive-timeouts-retries.md
  hash: "sha256:67212d977c96bf386289d00d0a2ea77c29528b2b14312202b9cebcce21fd880d"
---
# TCP Keepalive, Timeouts, and Retries

## When This Activates

Activates when diffs touch TCP socket configuration, socket options (keepalive, timeouts, Nagle), connection pool setup, or server listen parameters. TCP is the transport layer for HTTP, gRPC, database connections, and most network services, yet its defaults are hostile to production: keepalive probes start after 2 hours (connections die silently behind load balancers with 5-minute idle timeouts), no socket operation has a default timeout (a hung peer blocks the caller forever), and Nagle's algorithm adds 40ms latency to small writes. This reviewer detects TCP-level misconfigurations that cause silent connection death, latency spikes, and resource exhaustion.

## Audit Surface

- [ ] TCP socket with SO_KEEPALIVE not enabled
- [ ] TCP keepalive idle time (TCP_KEEPIDLE) exceeding 600 seconds
- [ ] Socket connection with no connect timeout
- [ ] Socket read operation with no read timeout or SO_RCVTIMEO
- [ ] Socket write operation with no write timeout or SO_SNDTIMEO
- [ ] Latency-sensitive protocol without TCP_NODELAY set
- [ ] Server socket without SO_REUSEADDR (bind failure on fast restart)
- [ ] Connection pool with no health check or test-on-borrow
- [ ] TCP listen backlog at default (128) for high-connection-rate service
- [ ] No handling of connection reset (ECONNRESET/RST) in read/write path
- [ ] High-connection service not tuning TIME_WAIT reuse
- [ ] Socket linger (SO_LINGER) misconfigured causing data loss or port exhaustion

## Detailed Checks

### TCP Keepalive Configuration
<!-- activation: keywords=["keepalive", "keep-alive", "SO_KEEPALIVE", "TCP_KEEPIDLE", "TCP_KEEPINTVL", "TCP_KEEPCNT", "idle", "dead", "half-open", "probe"] -->

- [ ] **Keepalive not enabled**: flag TCP sockets or connection pools where `SO_KEEPALIVE` is not set -- without keepalive, dead connections (peer crashed, network path broken) are not detected until the next read/write attempt, which may be hours later. Cloud load balancers (AWS ALB: 350s, GCP: 600s) close idle connections; without keepalive, the client does not know the connection is dead
- [ ] **Keepalive idle too long**: flag TCP keepalive with `TCP_KEEPIDLE` exceeding 600 seconds (10 minutes) -- the Linux default is 7200 seconds (2 hours), far too long for production. Set idle time below the load balancer's idle timeout (typically 60-300 seconds)
- [ ] **Keepalive interval and count not tuned**: flag keepalive configurations that set `TCP_KEEPIDLE` but not `TCP_KEEPINTVL` (interval between probes) or `TCP_KEEPCNT` (number of failed probes before close) -- defaults are 75 seconds interval and 9 probes, meaning detection takes idle + (interval * count) = potentially 11+ minutes with defaults. Set interval to 10-30 seconds and count to 3-5
- [ ] **Application-level keepalive missing**: flag long-lived connections (database pools, message broker connections) relying solely on TCP keepalive without application-level heartbeats -- some intermediaries strip TCP keepalive probes. Application-level pings provide end-to-end health verification

### Timeout Configuration
<!-- activation: keywords=["timeout", "connect_timeout", "read_timeout", "write_timeout", "SO_RCVTIMEO", "SO_SNDTIMEO", "setConnectTimeout", "setSoTimeout", "deadline", "hang"] -->

- [ ] **No connect timeout**: flag `socket.connect()`, `dial()`, or equivalent calls with no connect timeout -- if the remote host is unreachable (black-holed), the connection attempt hangs for the OS TCP retransmission timeout (typically 60-120 seconds on Linux). Set connect timeout to 3-10 seconds
- [ ] **No read timeout**: flag socket read operations with no `SO_RCVTIMEO` or application-level read timeout -- a peer that accepts the connection but never responds (or responds slowly) blocks the reader indefinitely. Set read timeout appropriate to expected response time
- [ ] **No write timeout**: flag socket write operations with no `SO_SNDTIMEO` or application-level write timeout -- if the send buffer fills (peer not receiving), writes block indefinitely. Set write timeout to prevent hung writers
- [ ] **Single timeout for all phases**: flag code that sets one timeout value for the entire connection lifecycle instead of separate connect, read, and write timeouts -- connect should be short (3-10 seconds), read depends on the expected operation duration, and write should match backpressure tolerance. A single generous timeout masks connect failures

### Nagle's Algorithm and Latency
<!-- activation: keywords=["Nagle", "TCP_NODELAY", "nodelay", "no_delay", "latency", "delay", "small", "write", "coalesce", "buffer"] -->

- [ ] **Nagle not disabled for interactive traffic**: flag latency-sensitive protocols (real-time messaging, gaming, interactive APIs, RPC) without `TCP_NODELAY` set -- Nagle's algorithm buffers small writes for up to 40ms to coalesce them into larger segments, adding latency to every small message. Set `TCP_NODELAY` on connections where latency matters more than throughput
- [ ] **TCP_NODELAY on bulk transfer**: flag `TCP_NODELAY` set on connections used for bulk data transfer (file transfer, backup, replication) -- disabling Nagle on bulk transfers increases packet count without latency benefit, wasting bandwidth and CPU on per-packet overhead. Nagle is beneficial when writes are large
- [ ] **Nagle combined with delayed ACK**: flag environments where Nagle's algorithm on the sender combines with delayed ACK on the receiver -- this combination causes a minimum 40ms latency per write-read-write exchange (the "Nagle-delayed ACK deadlock"). If the protocol requires write-wait-write patterns, disable Nagle

### Connection Pool Health and Socket Reuse
<!-- activation: keywords=["pool", "connection pool", "health", "test", "validate", "borrow", "evict", "SO_REUSEADDR", "SO_REUSEPORT", "backlog", "listen", "TIME_WAIT", "FIN_WAIT", "linger", "SO_LINGER", "ECONNRESET", "RST"] -->

- [ ] **Pool without health check**: flag connection pools that do not validate connections before handing them out (test-on-borrow) or periodically (test-while-idle) -- a pool full of dead connections causes a burst of errors when traffic arrives. Use TCP keepalive plus periodic validation queries (database ping, MQTT PINGREQ)
- [ ] **Missing SO_REUSEADDR**: flag server sockets created without `SO_REUSEADDR` -- without it, restarting a server fails with "address already in use" because the previous socket's `TIME_WAIT` state holds the port for 60-120 seconds
- [ ] **TIME_WAIT exhaustion**: flag high-connection-rate services (HTTP clients making thousands of short-lived connections) without `SO_REUSEADDR`, connection pooling, or `tcp_tw_reuse` kernel tuning -- each closed connection holds an ephemeral port in TIME_WAIT for 60 seconds; at high rates, the ephemeral port range (typically 28,000 ports) is exhausted
- [ ] **SO_LINGER misconfigured**: flag `SO_LINGER` set with timeout 0, which causes the kernel to send RST instead of FIN on close -- this aborts the connection, potentially losing in-flight data. Use `SO_LINGER` with 0 only when intentionally aborting (e.g., error recovery); otherwise let the kernel perform graceful close

## Common False Positives

- **HTTP client libraries managing sockets**: high-level HTTP clients (Go's `http.Client`, Java's `HttpClient`, Python's `requests`) manage TCP keepalive, timeouts, and Nagle internally. Verify library defaults before flagging low-level socket options.
- **Service mesh sidecar**: Envoy, Linkerd, and Istio sidecars handle TCP keepalive and timeouts at the proxy layer. Application connections to localhost sidecars may not need these settings.
- **Database driver defaults**: most production database drivers (pgx, mysql-connector, go-sql-driver) configure keepalive and timeouts by default. Check driver documentation before flagging.
- **Loopback connections**: connections to `127.0.0.1` or `::1` do not traverse NATs or load balancers, making keepalive and aggressive timeouts less critical. Flag only cross-network connections.

## Severity Guidance

| Finding | Severity |
|---|---|
| No connect timeout on outbound socket (hangs for 2+ minutes on black hole) | Critical |
| No read timeout on socket handling production traffic | Critical |
| TCP keepalive idle time at default 2 hours behind cloud load balancer | Important |
| Connection pool with no health check (hands out dead connections) | Important |
| Nagle not disabled on latency-sensitive interactive protocol | Important |
| Missing SO_REUSEADDR on server socket (bind failure on restart) | Important |
| TIME_WAIT exhaustion on high-connection-rate client | Important |
| No write timeout on socket | Minor |
| TCP listen backlog at default for high-connection service | Minor |
| SO_LINGER set to 0 (RST instead of graceful close) | Minor |
| Keepalive interval and count not tuned (slow detection) | Minor |

## See Also

- `reliability-timeout-deadline-propagation` -- TCP timeouts must fit within the overall request deadline budget
- `reliability-circuit-breaker` -- connection failures should trigger circuit breaking
- `perf-network-io` -- TCP configuration directly impacts network I/O performance
- `net-http-1-1-2-3-quic` -- HTTP keep-alive builds on TCP keepalive
- `net-tls-configuration` -- TLS handshake adds to connect-time timeout budget

## Authoritative References

- [RFC 9293 -- Transmission Control Protocol (TCP)](https://www.rfc-editor.org/rfc/rfc9293)
- [RFC 1122 -- Requirements for Internet Hosts, Section 4.2.3.6 (TCP Keep-Alives)](https://datatracker.ietf.org/doc/html/rfc1122#section-4.2.3.6)
- [Brendan Gregg, *Systems Performance*, 2nd ed. (2020), Chapter 10: "Network"](https://www.brendangregg.com/systems-performance-2nd-edition-book.html)
- [John Nagle, "Congestion Control in IP/TCP Internetworks" (RFC 896)](https://www.rfc-editor.org/rfc/rfc896)
- [Linux TCP Tuning -- kernel.org](https://www.kernel.org/doc/Documentation/networking/ip-sysctl.txt)
