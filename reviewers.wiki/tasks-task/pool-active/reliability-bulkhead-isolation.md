---
id: reliability-bulkhead-isolation
type: primary
depth_role: leaf
focus: Detect shared resource pools, missing isolation between dependencies, and resource exhaustion cascading across unrelated operations
parents:
  - index.md
covers:
  - Shared thread pool serving all external dependencies -- one slow dependency exhausts threads for all
  - Shared connection pool across unrelated downstream services
  - No isolation between critical and non-critical request paths
  - Single HTTP client instance used for all outbound calls
  - Resource exhaustion in one dependency cascading to unrelated endpoints
  - No limit on concurrent requests to a single downstream
  - Worker pool processes high-priority and low-priority tasks with no separation
  - Memory-unbounded operation in shared process threatening co-located services
  - Unbounded thread pools that create unlimited threads under load, exhausting OS resources
  - Tasks submitted to pools that never check results, silently losing exceptions
  - "Pool sized incorrectly for the workload: CPU-bound vs I/O-bound confusion"
  - Thread pools that are never shut down, leaking threads and preventing graceful termination
  - "Thread pool used for a single task execution where async/await or a direct call suffices"
  - Tasks relying on thread-local state that assumes a dedicated thread, broken by pool reuse
  - "Executors.newCachedThreadPool() in production without understanding its unbounded nature"
  - Blocking tasks submitted to a pool sized for CPU-bound work, starving other tasks
  - "Fork/join pool used for blocking I/O, exhausting the common pool shared by the entire JVM"
  - Thread pool created per-request instead of shared, negating the pooling benefit
  - Rejected execution handler silently discarding tasks under load
tags:
  - bulkhead
  - isolation
  - thread-pool
  - connection-pool
  - resilience
  - resource-exhaustion
  - cascading-failure
  - concurrency
  - concurrency-pattern
  - design-patterns
  - executor
  - worker
  - performance
  - resource-management
aliases:
  - pattern-thread-pool
activation:
  file_globs:
    - "**/*.{java,kt,scala,cs,ts,js,py,rb,go,rs,ex,exs}"
  keyword_matches:
    - bulkhead
    - Bulkhead
    - thread pool
    - threadPool
    - connection pool
    - semaphore
    - Semaphore
    - max_connections
    - maxConnections
    - pool_size
    - poolSize
    - isolation
    - concurrent
    - max_concurrent
    - worker
    - executor
  structural_signals:
    - shared_pool_for_multiple_dependencies
    - no_concurrency_limit_on_outbound
    - critical_path_sharing_resources
source:
  origin: file
  path: reliability-bulkhead-isolation.md
  hash: "sha256:6aaabc53be66513e05e44a850b62f0cafa7efa9fb69edb7b373310616e59aceb"
---
# Bulkhead Isolation

## When This Activates

Activates when diffs introduce outbound service calls, configure thread/connection pools, add worker or executor services, or modify concurrency settings. The bulkhead pattern isolates resource pools so that a failure or slowdown in one dependency cannot exhaust resources needed by unrelated operations. Without bulkheads, a single slow downstream can drain the shared thread pool, starving every endpoint in the service.

## Audit Surface

- [ ] Single thread/goroutine pool handles calls to all external dependencies
- [ ] One HTTP/gRPC client instance used for all downstream services
- [ ] No concurrency limit on calls to individual dependencies
- [ ] Critical path shares resources with non-critical path
- [ ] Slow dependency exhausts caller's thread pool blocking unrelated endpoints
- [ ] Database connection pool shared across modules with no per-module limit
- [ ] Background job workers share the same pool as real-time request handlers
- [ ] No max-in-flight or concurrency limit on outbound requests to a single service
- [ ] Memory-intensive operation runs in the same process as latency-sensitive handlers
- [ ] Connection pool max size exceeds the downstream's capacity
- [ ] Bulkhead configured but never tested under contention
- [ ] No metric on pool utilization or queue depth

## Detailed Checks

### Thread and Connection Pool Isolation
<!-- activation: keywords=["thread", "pool", "executor", "connection", "client", "http", "grpc", "semaphore", "worker", "goroutine", "async"] -->

- [ ] **Single pool for all dependencies**: one thread pool or executor service handles calls to payment service, inventory service, notification service, and more -- a slowdown in any one blocks threads for all others; allocate separate pools per dependency
- [ ] **Shared HTTP client**: a single `HttpClient` / `axios` / `reqwest` instance (and its connection pool) is used for all outbound calls -- connection pool exhaustion on one dependency starves others; create dedicated clients per dependency
- [ ] **No pool size limit**: thread pool or connection pool has no configured maximum -- under load, unbounded pool growth causes memory exhaustion or file descriptor limits
- [ ] **Pool sized to downstream capacity**: connection pool max exceeds what the downstream can handle -- the pool being full does not protect the downstream from overload

### Critical vs Non-Critical Path Separation
<!-- activation: keywords=["critical", "priority", "checkout", "payment", "auth", "login", "analytics", "recommendation", "logging", "non-critical", "optional"] -->

- [ ] **Critical path blocked by non-critical**: checkout or authentication handler waits on the same thread pool as analytics or recommendation calls -- a slow recommendation service blocks purchases
- [ ] **No priority queue**: task executor processes work in FIFO order with no priority distinction -- low-priority background work delays high-priority request handling
- [ ] **Real-time and batch share workers**: event-driven consumers processing real-time events share the same worker pool as batch import jobs -- a large batch import starves real-time processing
- [ ] **No separate deployment for critical path**: critical and non-critical handlers are co-deployed with no resource isolation -- a memory leak in non-critical code crashes the critical service

### Concurrency Limiting Per Dependency
<!-- activation: keywords=["concurrent", "semaphore", "limit", "max", "inflight", "in-flight", "throttle", "rate", "capacity", "saturate"] -->

- [ ] **Unbounded outbound concurrency**: code fires requests to a downstream with no semaphore or concurrency limit -- under spike load, the caller sends more requests than the downstream can handle, causing downstream overload
- [ ] **Semaphore not released on error**: concurrency-limiting semaphore is acquired but not released in the error path -- permits leak until the bulkhead is fully blocked
- [ ] **Bulkhead queue unbounded**: requests that cannot acquire a bulkhead permit are queued with no queue depth limit -- the queue grows unbounded, consuming memory and delaying callers far beyond their timeout
- [ ] **Bulkhead timeout missing**: request waits indefinitely for a bulkhead permit -- callers should fail fast with a bulkhead-full error after a short wait

### Resource Exhaustion Cascading
<!-- activation: keywords=["memory", "OOM", "file descriptor", "socket", "disk", "CPU", "exhaust", "leak", "unbounded", "cascade"] -->

- [ ] **Memory-unbounded operation**: a request handler buffers an entire large response or file in memory with no size limit -- OOM kills the process, taking down all co-located handlers
- [ ] **File descriptor leak**: connections are not closed on error paths, leaking file descriptors -- eventual exhaustion prevents all new connections in the process
- [ ] **CPU-intensive operation on shared event loop**: a compute-heavy operation runs on the main event loop (Node.js, asyncio) blocking all other handlers -- offload to a worker thread/process with a bounded pool
- [ ] **No container resource limits**: service container has no memory or CPU limits set -- a runaway operation in one container can starve co-located containers on the same node

## Common False Positives

- **Connection pooling libraries with built-in limits**: HikariCP, pgBouncer, and similar libraries manage pool sizes internally. Do not flag if the pool is already size-bounded and the max is reasonable for the downstream's capacity.
- **Single-dependency services**: a service that calls only one external dependency does not need per-dependency bulkheads -- the entire service is effectively one bulkhead. Flag only when multiple dependencies share resources.
- **Serverless functions**: Lambda, Cloud Functions, and similar serverless runtimes isolate each invocation. Connection pool sharing is still relevant but thread pool isolation is managed by the platform.
- **Event loop architectures with explicit backpressure**: Node.js, Vert.x, and asyncio use a single event loop by design. The concern is not the shared loop but whether CPU-bound work is offloaded and backpressure is applied on outbound calls.

## Severity Guidance

| Finding | Severity |
|---|---|
| Critical path (auth, payment) shares thread pool with non-critical path | Critical |
| Unbounded outbound concurrency to a dependency on the request path | Critical |
| Single HTTP client for all dependencies with no connection pool isolation | Important |
| Background jobs and real-time handlers share the same worker pool | Important |
| No container memory/CPU limits on a shared node | Important |
| Bulkhead semaphore not released on error path (permit leak) | Important |
| CPU-intensive work on shared event loop blocking all handlers | Important |
| Pool sized larger than downstream capacity | Minor |
| No pool utilization metrics emitted | Minor |

## See Also

- `reliability-circuit-breaker` -- circuit breaker stops calling a failing dependency; bulkhead prevents the failure from consuming shared resources
- `reliability-timeout-deadline-propagation` -- timeouts prevent individual calls from holding pool resources indefinitely
- `reliability-backpressure` -- backpressure limits inbound load; bulkhead limits outbound resource consumption per dependency
- `reliability-load-shedding` -- load shedding rejects requests at the front door; bulkhead isolates resource pools within the service
- `antipattern-distributed-monolith` -- shared resource pools across dependencies are a coupling vector

## Authoritative References

- [Michael Nygard, *Release It!* (2nd ed., 2018), Chapter 5: "Bulkheads"](https://pragprog.com/titles/mnee2/release-it-second-edition/)
- [Microsoft, Cloud Design Patterns: Bulkhead](https://learn.microsoft.com/en-us/azure/architecture/patterns/bulkhead)
- [Sam Newman, *Building Microservices* (2nd ed., 2021), Chapter 11: "Isolation"](https://www.oreilly.com/library/view/building-microservices-2nd/9781492034018/)
- [Netflix, "Fault Tolerance in a High Volume, Distributed System" (2012)](https://netflixtechblog.com/fault-tolerance-in-a-high-volume-distributed-system-91ab4faae74a)
