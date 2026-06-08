---
id: reliability
type: index
depth_role: subcategory
depth: 1
focus: "reliability: Detect unbounded queues, missing flow control between producer and consumer, and message loss under load; Detect shared resource pools, missing isolation between dependencies, and resource exhaustion cascading across unrelat..."
parents:
  - "../index.md"
shared_covers: []
tags:
  - "503"
  - ack
  - admission-control
  - architecture
  - at-least-once
  - at-most-once
  - backoff
  - backpressure
  - bounded
  - budget
  - bulkhead
  - cancellation
  - capacity
  - cascading
  - cascading-failure
  - cdc
  - choreography
  - circuit-breaker
  - command
  - compensation
generator: "skill-llm-wiki/v1"
entries:
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
  - id: reliability-bulkhead-isolation
    file: reliability-bulkhead-isolation.md
    type: primary
    focus: Detect shared resource pools, missing isolation between dependencies, and resource exhaustion cascading across unrelated operations
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
  - id: reliability-circuit-breaker
    file: reliability-circuit-breaker.md
    type: primary
    focus: Detect missing circuit breakers on external calls, misconfigured thresholds, absent half-open recovery, hidden failures, and missing fallbacks
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
  - id: reliability-exactly-once-semantics
    file: reliability-exactly-once-semantics.md
    type: primary
    focus: Detect at-most-once where at-least-once is needed, at-least-once without idempotent consumers, and exactly-once claims without transactional outbox
    tags:
      - exactly-once
      - at-least-once
      - at-most-once
      - delivery
      - idempotent
      - outbox
      - deduplication
      - ack
      - offset
      - dual-write
      - transactional-outbox
      - cdc
      - event-publishing
      - messaging
      - consistency
      - microservices
  - id: reliability-graceful-degradation
    file: reliability-graceful-degradation.md
    type: primary
    focus: Detect all-or-nothing responses, missing fallbacks, untested degraded modes, and absent feature flags for degradation control
    tags:
      - graceful-degradation
      - fallback
      - feature-flag
      - resilience
      - partial-response
      - degraded-mode
      - kill-switch
  - id: reliability-health-checks
    file: reliability-health-checks.md
    type: primary
    focus: "Detect shallow health checks, missing dependency probes, health endpoints that overload dependencies, and absent readiness/liveness distinction"
    tags:
      - health-check
      - readiness
      - liveness
      - probe
      - kubernetes
      - dependency
      - monitoring
      - observability
  - id: reliability-idempotency
    file: reliability-idempotency.md
    type: primary
    focus: Detect non-idempotent operations exposed to retry or redelivery, missing idempotency keys, and partial completion without rollback
    tags:
      - idempotency
      - idempotent
      - deduplication
      - retry
      - at-least-once
      - exactly-once
      - upsert
      - side-effect
  - id: reliability-load-shedding
    file: reliability-load-shedding.md
    type: primary
    focus: Detect missing admission control under overload, priority-unaware shedding, shedding of healthy requests, and absent queue depth monitoring
    tags:
      - load-shedding
      - admission-control
      - overload
      - priority
      - queue-depth
      - throttle
      - 503
      - capacity
  - id: reliability-saga-distributed-tx
    file: reliability-saga-distributed-tx.md
    type: primary
    focus: "Detect saga steps without compensation, missing timeouts, non-idempotent steps, volatile state, and orchestration/choreography discipline violations"
    tags:
      - saga
      - distributed-transaction
      - compensation
      - orchestration
      - choreography
      - idempotent
      - timeout
      - consistency
      - workflow
      - event
      - command
      - architecture
      - microservices
  - id: reliability-timeout-deadline-propagation
    file: reliability-timeout-deadline-propagation.md
    type: primary
    focus: Detect missing timeouts on external calls, deadlines not propagated through call chains, and timeout budget mismanagement
    tags:
      - timeout
      - deadline
      - propagation
      - budget
      - cascading
      - latency
      - cancellation
      - context
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Reliability

**Focus:** reliability: Detect unbounded queues, missing flow control between producer and consumer, and message loss under load; Detect shared resource pools, missing isolation between dependencies, and resource exhaustion cascading across unrelat...

## Children

| File | Type | Focus |
|------|------|-------|
| [reliability-backpressure.md](reliability-backpressure.md) | 📄 primary | Detect unbounded queues, missing flow control between producer and consumer, and message loss under load |
| [reliability-bulkhead-isolation.md](reliability-bulkhead-isolation.md) | 📄 primary | Detect shared resource pools, missing isolation between dependencies, and resource exhaustion cascading across unrelated operations |
| [reliability-circuit-breaker.md](reliability-circuit-breaker.md) | 📄 primary | Detect missing circuit breakers on external calls, misconfigured thresholds, absent half-open recovery, hidden failures, and missing fallbacks |
| [reliability-exactly-once-semantics.md](reliability-exactly-once-semantics.md) | 📄 primary | Detect at-most-once where at-least-once is needed, at-least-once without idempotent consumers, and exactly-once claims without transactional outbox |
| [reliability-graceful-degradation.md](reliability-graceful-degradation.md) | 📄 primary | Detect all-or-nothing responses, missing fallbacks, untested degraded modes, and absent feature flags for degradation control |
| [reliability-health-checks.md](reliability-health-checks.md) | 📄 primary | Detect shallow health checks, missing dependency probes, health endpoints that overload dependencies, and absent readiness/liveness distinction |
| [reliability-idempotency.md](reliability-idempotency.md) | 📄 primary | Detect non-idempotent operations exposed to retry or redelivery, missing idempotency keys, and partial completion without rollback |
| [reliability-load-shedding.md](reliability-load-shedding.md) | 📄 primary | Detect missing admission control under overload, priority-unaware shedding, shedding of healthy requests, and absent queue depth monitoring |
| [reliability-saga-distributed-tx.md](reliability-saga-distributed-tx.md) | 📄 primary | Detect saga steps without compensation, missing timeouts, non-idempotent steps, volatile state, and orchestration/choreography discipline violations |
| [reliability-timeout-deadline-propagation.md](reliability-timeout-deadline-propagation.md) | 📄 primary | Detect missing timeouts on external calls, deadlines not propagated through call chains, and timeout budget mismanagement |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
