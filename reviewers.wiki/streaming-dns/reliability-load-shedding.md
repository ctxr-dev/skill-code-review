---
id: reliability-load-shedding
type: primary
depth_role: leaf
focus: Detect missing admission control under overload, priority-unaware shedding, shedding of healthy requests, and absent queue depth monitoring
parents:
  - index.md
covers:
  - No admission control under overload -- service accepts all requests until it crashes
  - Priority-unaware shedding -- high-value requests dropped alongside low-value ones
  - "Load shedding that drops requests already in progress (wasting work)"
  - No queue depth or concurrency monitoring to trigger shedding
  - Shedding threshold is static and does not adapt to current capacity
  - "Shed requests receive no informative response (connection reset vs 503 with Retry-After)"
  - "Load shedding at the wrong layer (application vs load balancer vs queue)"
  - No gradual shedding -- system goes from accepting all to rejecting all
tags:
  - load-shedding
  - admission-control
  - overload
  - priority
  - queue-depth
  - throttle
  - 503
  - capacity
activation:
  file_globs:
    - "**/*.{java,kt,scala,cs,ts,js,py,rb,go,rs,ex,exs,yaml,yml}"
  keyword_matches:
    - shed
    - shedding
    - admission
    - overload
    - throttle
    - reject
    - "503"
    - Retry-After
    - concurrency
    - max_connections
    - maxConcurrent
    - queue depth
    - semaphore
    - rate limit
    - backpressure
    - circuit
    - capacity
  structural_signals:
    - no_concurrency_limit
    - no_queue_depth_check
    - static_shedding_threshold
source:
  origin: file
  path: reliability-load-shedding.md
  hash: "sha256:8f257fcd85e03e1877a6aa4f4158ae4520183b4a17acc7621bb26cc2be80d3d5"
---
# Load Shedding

## When This Activates

Activates when diffs modify request handling, configure concurrency limits, add middleware, or set up load balancer/gateway configuration. Load shedding is the deliberate rejection of excess requests to preserve the ability to serve remaining requests successfully. Without shedding, an overloaded service degrades for everyone -- latencies spike, timeouts cascade, and the service eventually crashes, turning a partial overload into a total outage.

## Audit Surface

- [ ] Service has no concurrency limit or admission control
- [ ] Load shedding drops without priority distinction
- [ ] In-progress requests cancelled instead of rejecting new ones
- [ ] No metric used for shedding decisions
- [ ] Shedding threshold is a hardcoded constant
- [ ] Rejected requests receive connection reset or 500 instead of 503
- [ ] No upstream shedding at LB or gateway layer
- [ ] System jumps from 0% to 100% rejection
- [ ] CPU/memory shedding triggers too late
- [ ] Shedding does not account for request cost
- [ ] No load test validating shedding behavior
- [ ] Shedding decision logic is expensive

## Detailed Checks

### Missing Admission Control
<!-- activation: keywords=["concurrency", "limit", "max", "connection", "request", "thread", "queue", "accept", "reject", "semaphore", "capacity"] -->

- [ ] **No concurrency limit**: web server or application has no max-concurrent-requests setting -- under spike load, all requests are accepted, threads/goroutines multiply, memory grows, and the process crashes or becomes unresponsive
- [ ] **Unbounded request queue**: requests queue up when all workers are busy with no queue depth limit -- queued requests wait beyond their timeout, wasting resources when they are eventually processed but the client has already disconnected
- [ ] **No per-endpoint concurrency limit**: a single expensive endpoint (report generation, export) can consume all worker threads, starving lightweight endpoints (health check, simple reads) -- use per-endpoint or per-path concurrency limits
- [ ] **No connection limit at the server level**: HTTP server accepts unlimited connections -- each connection consumes memory and file descriptors; set `maxConnections` or equivalent

### Priority-Aware Shedding
<!-- activation: keywords=["priority", "critical", "important", "tier", "class", "weight", "tenant", "customer", "premium", "free"] -->

- [ ] **Uniform shedding**: under overload, requests are rejected randomly or FIFO regardless of priority -- high-value requests (paid customers, checkout flows, health checks) should be preserved while low-priority requests (background sync, analytics) are shed first
- [ ] **No request classification**: there is no mechanism to tag requests with a priority class -- without classification, priority-aware shedding is impossible
- [ ] **Health checks shed alongside traffic**: load shedding rejects /health requests, causing the orchestrator to remove the instance, worsening the overload -- health checks should be exempt from shedding
- [ ] **Request cost not considered**: a cheap GET and an expensive report-generation POST are treated equally -- shed expensive requests first to free more capacity

### Shedding Response Quality
<!-- activation: keywords=["503", "429", "Retry-After", "reject", "error", "response", "status", "header", "retry"] -->

- [ ] **Connection reset on shed**: rejected requests get a TCP RST or connection timeout instead of a proper HTTP response -- clients cannot distinguish overload from network failure and retry aggressively
- [ ] **500 instead of 503**: rejected requests receive HTTP 500 (server error) instead of 503 (service unavailable) -- clients and monitoring treat it as a bug rather than temporary overload
- [ ] **No Retry-After header**: 503 response does not include a `Retry-After` header -- well-behaved clients cannot back off appropriately
- [ ] **No shedding metric**: rejected requests are not counted in a metric -- the operations team cannot see that shedding is active or measure its effectiveness

### Adaptive vs Static Thresholds
<!-- activation: keywords=["threshold", "adaptive", "dynamic", "static", "config", "auto", "adjust", "latency", "cpu", "memory", "utilization"] -->

- [ ] **Hardcoded threshold**: shedding triggers at a fixed number (e.g., reject above 1000 concurrent) that does not account for instance size, deployment changes, or workload variation -- use adaptive shedding based on latency, CPU, or measured capacity
- [ ] **CPU/memory trigger too late**: shedding activates at 95% CPU or 90% memory -- by this point, the service is already severely degraded; trigger earlier based on response latency percentiles
- [ ] **Shedding based solely on rate**: rate-based shedding (100 req/s max) does not account for request cost variation -- a burst of cheap requests is shed while expensive requests pass; combine with concurrency-based shedding
- [ ] **No gradual ramp**: shedding jumps from 0% rejection to 100% rejection with no intermediate states -- implement progressive shedding (shed low-priority first, then medium, then high) as load increases

## Common False Positives

- **Rate limiting for abuse prevention**: rate limiters (per-IP, per-API-key) that protect against abuse are not load shedding. They operate at a different layer and have different goals. Do not flag rate limiting as "missing priority-aware shedding."
- **Serverless auto-scaling**: Lambda, Cloud Functions, and Cloud Run auto-scale to match load. Load shedding is less relevant when the platform scales automatically, though concurrency limits per function instance still apply.
- **Queue-based architectures**: systems that use message queues inherently shed load by letting the queue buffer -- the queue provides backpressure. Flag only if the queue itself is unbounded.
- **Internal services with controlled callers**: an internal service called only by a known set of clients with rate-limited callers may not need its own admission control if the callers enforce limits.

## Severity Guidance

| Finding | Severity |
|---|---|
| No concurrency limit or admission control on a public-facing service | Critical |
| Health checks shed alongside traffic (orchestrator removes instance) | Critical |
| Rejected requests receive connection reset (clients retry storm) | Important |
| No priority distinction in shedding (all requests treated equally) | Important |
| In-progress requests cancelled to free resources (wasted work) | Important |
| Hardcoded threshold not adjusted for instance capacity | Minor |
| No Retry-After header on 503 responses | Minor |
| No load test validating shedding behavior | Minor |
| Shedding decision logic itself is expensive | Minor |

## See Also

- `reliability-backpressure` -- backpressure signals between internal components; load shedding rejects at the service boundary
- `reliability-graceful-degradation` -- shedding is one form of degradation; partial responses are another
- `reliability-bulkhead-isolation` -- bulkhead limits per-dependency resources; shedding limits total inbound load
- `reliability-circuit-breaker` -- upstream circuit breakers may trip when a downstream sheds; coordinate thresholds
- `sec-rate-limit-and-dos` -- rate limiting prevents abuse; load shedding protects capacity under legitimate overload

## Authoritative References

- [Google SRE Book, Chapter 22: "Addressing Cascading Failures" -- Load Shedding](https://sre.google/sre-book/addressing-cascading-failures/)
- [Netflix, "Keeping Netflix Reliable Using Prioritized Load Shedding" (2023)](https://netflixtechblog.com/keeping-netflix-reliable-using-prioritized-load-shedding-6cc827b02f94)
- [Amazon, "Using Load Shedding to Survive a Surge" (2023)](https://aws.amazon.com/builders-library/using-load-shedding-to-avoid-overload/)
- [Michael Nygard, *Release It!* (2nd ed., 2018), Chapter 5: "Shed Load"](https://pragprog.com/titles/mnee2/release-it-second-edition/)
