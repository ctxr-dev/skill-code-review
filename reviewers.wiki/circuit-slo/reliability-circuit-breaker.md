---
id: reliability-circuit-breaker
type: primary
depth_role: leaf
focus: Detect missing circuit breakers on external calls, misconfigured thresholds, absent half-open recovery, hidden failures, and missing fallbacks
parents:
  - index.md
covers:
  - External service call with no circuit breaker protection
  - Circuit breaker threshold set too high allowing prolonged cascading failure
  - Circuit breaker threshold set too low causing false trips on normal error rates
  - No half-open state to test recovery -- circuit stays open until manual reset
  - Circuit breaker absorbing failures silently with no alerting or logging
  - No fallback behavior when circuit is open -- caller receives raw error
  - "Circuit breaker wrapping non-network operations (local computation, in-memory cache)"
  - Shared circuit breaker instance across unrelated dependencies
  - Circuit breaker state not shared across instances in a cluster
  - Circuit breaker reset timeout too short flooding a recovering service
  - Retry loop with fixed delay or no delay between attempts
  - Retry without jitter causing thundering herd on recovery
  - Retry on non-idempotent operations risking duplicate side effects
  - Retry on non-transient errors wasting resources on permanent failures
  - Unlimited retry count or no max-attempts cap
  - Retry without circuit breaker integration amplifying cascading failure
  - Retry delay shorter than downstream recovery time
  - Retry resetting timeout budget instead of respecting caller deadline
  - Retry on 4xx client errors that will never succeed
  - Retry with no logging or metrics for observability
tags:
  - circuit-breaker
  - resilience
  - fault-tolerance
  - fallback
  - cascading-failure
  - half-open
  - threshold
  - retry
  - backoff
  - jitter
  - transient-error
  - idempotency
  - thundering-herd
aliases:
  - reliability-retry-with-backoff
activation:
  file_globs:
    - "**/*.{java,kt,scala,cs,ts,js,py,rb,go,rs,ex,exs}"
  keyword_matches:
    - circuit
    - breaker
    - CircuitBreaker
    - circuit_breaker
    - half-open
    - halfOpen
    - fallback
    - Hystrix
    - resilience4j
    - Polly
    - opossum
    - pybreaker
    - gobreaker
    - failsafe
  structural_signals:
    - external_call_without_circuit_breaker
    - circuit_breaker_configuration
    - fallback_method
source:
  origin: file
  path: reliability-circuit-breaker.md
  hash: "sha256:1837a764729aa1dd6c6b1a1afff16695fef231742535162a5d59d2fecf4722ff"
---
# Circuit Breaker

## When This Activates

Activates when diffs add or modify external service calls, configure circuit breaker libraries (resilience4j, Hystrix, Polly, opossum, gobreaker), or introduce fallback logic. A circuit breaker prevents a failing downstream from dragging the caller down by failing fast once a failure threshold is crossed, then periodically probing for recovery. Missing, misconfigured, or silently failing circuit breakers allow cascading failures to propagate across the entire system.

## Audit Surface

- [ ] HTTP/gRPC/database call to external dependency with no circuit breaker
- [ ] Circuit breaker failure threshold allows 50+ consecutive failures before tripping
- [ ] Circuit breaker failure threshold trips on 1-2 errors causing false positives
- [ ] No half-open state or automatic recovery probe configured
- [ ] Circuit in open state returns error with no fallback
- [ ] Circuit breaker failure count not logged or emitted as a metric
- [ ] Single circuit breaker shared across multiple unrelated downstream services
- [ ] Circuit breaker wrapping a local/in-process call that cannot fail transiently
- [ ] Half-open state allows full traffic instead of a single probe request
- [ ] Circuit breaker reset timeout under 5 seconds
- [ ] No alert when circuit transitions to open state
- [ ] Circuit breaker configured but never tested under failure conditions

## Detailed Checks

### Missing Circuit Breaker
<!-- activation: keywords=["http", "fetch", "axios", "request", "grpc", "client", "call", "service", "external", "downstream", "api", "database", "redis", "cache"] -->

- [ ] **Unprotected external call**: HTTP, gRPC, or database client call to an external dependency has no circuit breaker wrapping it -- a downstream outage will exhaust the caller's threads/connections
- [ ] **New dependency added without circuit breaker**: a new service integration is introduced but the existing circuit breaker configuration does not cover it -- every external dependency needs its own circuit breaker instance
- [ ] **Circuit breaker on the wrong layer**: circuit breaker wraps individual low-level calls but not the logical operation -- a single operation making 5 calls opens 5 circuits independently instead of treating the dependency as one unit
- [ ] **Internal call unnecessarily wrapped**: circuit breaker around an in-process method call or local cache lookup -- circuit breakers are for remote/unreliable dependencies, not local code

### Threshold and Timing Configuration
<!-- activation: keywords=["threshold", "failure", "rate", "count", "consecutive", "window", "timeout", "reset", "sleep", "open", "interval"] -->

- [ ] **Threshold too high**: failure rate threshold is 80%+ or consecutive failure count is 50+ -- the circuit allows sustained damage before tripping; typical thresholds are 50% failure rate or 5-10 consecutive failures
- [ ] **Threshold too low**: circuit trips on 1-2 failures or 5% error rate -- normal transient errors trigger false trips causing unnecessary degradation
- [ ] **Sliding window too small**: failure rate is computed over 2-3 requests -- a single failure creates a 50% rate and trips the circuit prematurely
- [ ] **Reset timeout too short**: half-open probe fires after 1-3 seconds -- the downstream has not had time to recover, probe fails, circuit reopens in a tight loop
- [ ] **Reset timeout too long**: half-open probe waits 10+ minutes -- callers are degraded far longer than necessary after the downstream recovers

### Half-Open State and Recovery
<!-- activation: keywords=["half-open", "halfOpen", "probe", "recovery", "reset", "test", "permit", "trial"] -->

- [ ] **No half-open state**: circuit transitions directly from open to closed after a timer, flooding the recovering downstream with full traffic -- half-open should permit one or a few probe requests
- [ ] **Half-open permits full traffic**: half-open state does not limit concurrent requests -- all waiting requests rush through simultaneously, potentially re-tripping the circuit
- [ ] **Half-open success threshold too high**: circuit requires 10+ successful probes to close -- recovery is unnecessarily slow; 1-3 successful probes is typical
- [ ] **No automatic recovery**: circuit stays open until manual intervention (restart, config change, API call) -- half-open automatic probing is essential for self-healing

### Fallback and Failure Visibility
<!-- activation: keywords=["fallback", "default", "cache", "stale", "degrade", "error", "log", "metric", "alert", "notify", "monitor"] -->

- [ ] **No fallback when open**: circuit in open state throws an exception or returns an HTTP 500 to the end user with no fallback -- provide cached data, a default response, or a degraded experience
- [ ] **Fallback hides the failure**: fallback returns a successful response with no indication that it is degraded -- callers and monitoring cannot distinguish healthy from degraded operation
- [ ] **Circuit state not observable**: no metric emitted when circuit transitions between closed/open/half-open -- operations team cannot detect or alert on circuit trips
- [ ] **Error swallowed in fallback**: fallback catches the circuit-open exception and returns null/empty with no logging -- the failure is invisible in application logs

## Common False Positives

- **Service mesh circuit breaking**: Istio, Linkerd, and Envoy provide circuit breaking at the proxy layer. Application-level circuit breakers may be redundant if the mesh is properly configured. Verify mesh configuration before flagging.
- **SDK-managed retries with built-in circuit breaking**: AWS SDK, Google Cloud client libraries, and similar SDKs include retry and circuit breaking internally. Do not flag these unless the application adds another layer.
- **Read-through cache as implicit fallback**: a caching layer in front of a dependency may serve stale data on failure, acting as a natural fallback. Verify the cache TTL and staleness tolerance before flagging missing fallback.
- **Batch jobs and offline processing**: background jobs that can be safely retried later may not need a circuit breaker if they have dead-letter queue and retry infrastructure.

## Severity Guidance

| Finding | Severity |
|---|---|
| Synchronous external call on the request path with no circuit breaker | Critical |
| No half-open state -- circuit stays open until manual reset | Critical |
| Shared circuit breaker across unrelated dependencies (one failure trips all) | Important |
| Failure threshold allows 50+ failures before tripping | Important |
| No fallback when circuit is open on a user-facing path | Important |
| Circuit breaker state transitions not logged or metricked | Important |
| Half-open permits full traffic instead of limited probes | Minor |
| Reset timeout under 5 seconds causing probe storms | Minor |
| Circuit breaker on local/in-process call (unnecessary overhead) | Minor |

## See Also

- `reliability-retry-with-backoff` -- retries and circuit breakers must be coordinated; retries feed the circuit breaker's failure count
- `reliability-bulkhead-isolation` -- circuit breaker prevents cascade from one dependency; bulkhead isolates resource pools between dependencies
- `reliability-graceful-degradation` -- circuit breaker fallback is one form of graceful degradation
- `reliability-timeout-deadline-propagation` -- circuit breaker should trip before the caller's deadline expires
- `antipattern-distributed-monolith` -- missing circuit breakers are a primary signal of distributed monolith coupling
- `principle-fail-fast` -- an open circuit breaker is a fail-fast mechanism; hiding the failure in a silent fallback violates the principle

## Authoritative References

- [Michael Nygard, *Release It!* (2nd ed., 2018), Chapter 5: "Circuit Breaker"](https://pragprog.com/titles/mnee2/release-it-second-edition/)
- [Martin Fowler, "CircuitBreaker" (2014)](https://martinfowler.com/bliki/CircuitBreaker.html)
- [Microsoft, Cloud Design Patterns: Circuit Breaker](https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker)
- [Netflix, "Making the Netflix API More Resilient" (2011)](https://netflixtechblog.com/making-the-netflix-api-more-resilient-a8ec62159c2d)
