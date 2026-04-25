---
id: reliability-timeout-deadline-propagation
type: primary
depth_role: leaf
focus: Detect missing timeouts on external calls, deadlines not propagated through call chains, and timeout budget mismanagement
parents:
  - index.md
covers:
  - "External HTTP/gRPC/database call with no timeout configured"
  - Timeout not propagated from caller to downstream -- downstream outlives caller
  - "Per-call timeout longer than the caller's overall deadline"
  - No deadline budget tracking across sequential calls in a request
  - Default infinite timeout on HTTP client or database driver
  - Timeout set but no handling of timeout error -- caller hangs
  - gRPC deadline not forwarded from incoming to outgoing context
  - Sequential calls each get the full timeout instead of splitting the remaining budget
  - Read timeout set but no connect timeout
  - "Timeout on blocking operations (file I/O, DNS, lock acquisition) missing"
tags:
  - timeout
  - deadline
  - propagation
  - budget
  - cascading
  - latency
  - cancellation
  - context
activation:
  file_globs:
    - "**/*.{java,kt,scala,cs,ts,js,py,rb,go,rs,ex,exs}"
  keyword_matches:
    - timeout
    - Timeout
    - deadline
    - Deadline
    - context
    - Context
    - cancel
    - Cancel
    - connectTimeout
    - readTimeout
    - socketTimeout
    - requestTimeout
    - statement_timeout
    - query_timeout
    - withDeadline
    - withTimeout
    - AbortSignal
    - CancellationToken
  structural_signals:
    - external_call_without_timeout
    - deadline_not_propagated
    - sequential_calls_without_budget
source:
  origin: file
  path: reliability-timeout-deadline-propagation.md
  hash: "sha256:db7f9acb93fe92c062d2a2af6639be6cfd096281dcadbe3e8170d70ccd35c70b"
---
# Timeout and Deadline Propagation

## When This Activates

Activates when diffs add or modify external service calls, configure HTTP/gRPC clients, set up database connections, or introduce call chains across services. Every external call must have a timeout, and that timeout must be bounded by the caller's remaining deadline. Without proper propagation, a single slow downstream blocks resources indefinitely, and callers wait for responses that will never arrive in time.

## Audit Surface

- [ ] HTTP client call with no explicit timeout
- [ ] gRPC call does not propagate incoming deadline to outgoing context
- [ ] Database query with no statement or query timeout
- [ ] Sequential external calls each given the full timeout instead of remaining budget
- [ ] Connect timeout missing -- only read timeout is set
- [ ] DNS resolution has no timeout
- [ ] Lock acquisition or mutex wait with no timeout
- [ ] File or socket I/O with no timeout or cancellation
- [ ] Timeout error caught but not propagated to caller
- [ ] API gateway timeout shorter than backend timeout
- [ ] No remaining-budget calculation before downstream calls
- [ ] Async operation awaited with no timeout

## Detailed Checks

### Missing Timeouts
<!-- activation: keywords=["http", "fetch", "axios", "request", "grpc", "database", "query", "connection", "socket", "client", "redis", "cache", "call"] -->

- [ ] **No timeout on HTTP call**: `fetch()`, `axios()`, `HttpClient`, or `requests.get()` called without timeout parameter -- default is often infinite; always set an explicit timeout
- [ ] **No database query timeout**: SQL query or ORM call executed without `statement_timeout`, `query_timeout`, or equivalent -- a slow query holds a connection pool slot indefinitely
- [ ] **No connect timeout**: read/response timeout is configured but connect timeout is not -- connection to an unreachable host hangs for the OS default (often 2+ minutes)
- [ ] **No timeout on cache call**: Redis, Memcached, or in-memory cache call has no timeout -- cache server failure hangs the request instead of falling back
- [ ] **No timeout on lock/mutex**: distributed lock acquisition (Redis SETNX, ZooKeeper, database advisory lock) waits indefinitely -- add a timeout to prevent deadlock

### Deadline Propagation Through Call Chains
<!-- activation: keywords=["context", "deadline", "propagate", "forward", "remaining", "budget", "parent", "incoming", "outgoing", "metadata", "header"] -->

- [ ] **gRPC deadline not forwarded**: incoming gRPC context has a deadline but the outgoing call creates a new context without copying the deadline -- downstream can outlive the original caller
- [ ] **HTTP deadline not passed**: the incoming request has a timeout but the outbound HTTP call creates its own independent timeout -- the downstream may still be working after the client has timed out and disconnected
- [ ] **No remaining budget calculation**: code makes 3 sequential calls each with a 5-second timeout but the overall request budget is 10 seconds -- total possible timeout is 15 seconds, exceeding the budget
- [ ] **Deadline header not set**: in HTTP call chains, no `X-Request-Deadline` or equivalent header is set -- downstream services have no visibility into how much time remains
- [ ] **Context not cancelled on timeout**: when the parent request times out, child contexts or outgoing requests are not cancelled -- abandoned downstream work wastes resources

### Timeout vs Caller Deadline Alignment
<!-- activation: keywords=["gateway", "proxy", "load balancer", "upstream", "downstream", "SLA", "latency", "budget", "alignment", "shorter", "longer"] -->

- [ ] **Backend timeout exceeds gateway timeout**: API gateway or load balancer times out at 30 seconds but the backend has a 60-second timeout -- the backend continues processing after the client has disconnected, wasting resources
- [ ] **Per-call timeout exceeds overall SLA**: individual call timeout is 10 seconds but the user-facing SLA is 3 seconds -- the call can succeed but the user has already seen an error
- [ ] **Retry timeout not subtracted from budget**: after a failed attempt consuming 3 seconds of a 10-second budget, the retry uses another full 10-second timeout instead of the remaining 7 seconds
- [ ] **Parallel calls each get the full budget**: fan-out to 5 services each with a 10-second timeout when the budget is 10 seconds is correct for parallel; but if sequential, total is 50 seconds

### Timeout Error Handling
<!-- activation: keywords=["catch", "except", "error", "timeout", "cancel", "abort", "deadline exceeded", "DEADLINE_EXCEEDED", "TimeoutError", "TimeoutException"] -->

- [ ] **Timeout swallowed**: catch block catches TimeoutException but returns a default value or null without propagating the timeout signal -- the caller does not know the operation timed out
- [ ] **Timeout not distinguished from other errors**: all exceptions are caught uniformly; timeout errors should trigger specific handling (circuit breaker increment, deadline propagation, retry decision)
- [ ] **Resource not cleaned up on timeout**: a timeout occurs but the underlying connection, file handle, or transaction is not closed or rolled back -- resource leak accumulates
- [ ] **Timeout logged at wrong severity**: timeout on a retry-able call logged as ERROR flooding alerts; timeout on a critical non-retriable call logged as WARN missing alerts -- match log level to impact

## Common False Positives

- **Streaming and long-poll endpoints**: WebSocket, SSE, and long-polling endpoints intentionally have long or no timeouts. Verify the endpoint type before flagging. Look for idle timeouts and heartbeat mechanisms instead.
- **Background batch processing**: batch jobs processing large datasets may legitimately run for hours. Flag only if the batch job calls external services without per-call timeouts.
- **Framework-managed timeouts**: web frameworks (Express, Spring, ASP.NET) often set default request timeouts. Verify that the framework default is not already covering the case before flagging.
- **gRPC streaming**: bidirectional streaming RPCs do not use deadlines the same way as unary calls. Per-message timeouts or keepalive configuration is the appropriate mechanism.

## Severity Guidance

| Finding | Severity |
|---|---|
| External call on request path with no timeout (infinite default) | Critical |
| Backend timeout exceeds gateway/caller timeout (orphaned work) | Critical |
| gRPC deadline not propagated to outgoing calls | Important |
| Sequential calls each get full timeout exceeding overall budget | Important |
| Connect timeout missing (only read timeout set) | Important |
| Timeout error caught and swallowed -- caller unaware | Important |
| No remaining budget calculation before downstream call | Important |
| Database query with no statement timeout | Important |
| Lock acquisition with no timeout | Minor |
| Timeout logged at wrong severity level | Minor |

## See Also

- `reliability-retry-with-backoff` -- retry budget must respect the remaining deadline; each attempt decrements from the overall timeout
- `reliability-circuit-breaker` -- timeouts feed the circuit breaker's failure count; circuit breaker trips before deadline exhaustion
- `reliability-bulkhead-isolation` -- timeout prevents a single call from holding pool resources; bulkhead prevents exhaustion of the pool itself
- `reliability-saga-distributed-tx` -- saga step timeouts and overall saga deadline must be propagated
- `principle-fail-fast` -- missing timeout is the opposite of fail-fast; the caller waits forever instead of detecting the failure early

## Authoritative References

- [Google SRE Book, Chapter 22: "Addressing Cascading Failures" -- Deadline Propagation](https://sre.google/sre-book/addressing-cascading-failures/)
- [gRPC Documentation: Deadlines](https://grpc.io/docs/guides/deadlines/)
- [Michael Nygard, *Release It!* (2nd ed., 2018), Chapter 5: "Timeouts"](https://pragprog.com/titles/mnee2/release-it-second-edition/)
- [Microsoft, Cloud Design Patterns: Timeout](https://learn.microsoft.com/en-us/azure/architecture/patterns/)
