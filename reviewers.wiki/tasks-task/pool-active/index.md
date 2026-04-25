---
id: pool-active
type: index
depth_role: subcategory
depth: 2
focus: Active object holding locks during request processing, negating the decoupling benefit; Active object proxy that exposes internal concurrency primitives to callers; Active object scheduler that silently drops requests on queue overflow; Active object servant that leaks thread-local state across unrelated requests
parents:
  - "../index.md"
shared_covers: []
entries:
  - id: conc-structured-concurrency
    file: conc-structured-concurrency.md
    type: primary
    focus: "Detect fire-and-forget tasks, missing parent-child task lifetime binding, unhandled child exceptions, and TaskGroup/nursery misuse."
    tags:
      - structured-concurrency
      - TaskGroup
      - nursery
      - CoroutineScope
      - errgroup
      - scoped-tasks
      - concurrency
      - lifecycle
  - id: conc-work-stealing
    file: conc-work-stealing.md
    type: primary
    focus: Detect work-stealing deque contention, task granularity issues, ForkJoinPool common pool abuse, and unbalanced work distribution.
    tags:
      - work-stealing
      - ForkJoinPool
      - rayon
      - parallel-stream
      - task-granularity
      - concurrency
      - performance
  - id: mob-swift-concurrency-actors
    file: mob-swift-concurrency-actors.md
    type: primary
    focus: Detect data races from actor reentrancy, MainActor blocking, uncancelled Tasks, missing Sendable conformance, and structured concurrency violations in Swift concurrency.
    tags:
      - swift-concurrency
      - async-await
      - actor
      - sendable
      - mainactor
      - task
      - structured-concurrency
      - data-race
      - ios
      - apple
  - id: pattern-active-object
    file: pattern-active-object.md
    type: primary
    focus: Detect misuse, over-application, and absence of the Active Object pattern in asynchronous decoupling code.
    tags:
      - active-object
      - concurrency-pattern
      - design-patterns
      - actor
      - mailbox
      - async
      - decoupling
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
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Pool Active

**Focus:** Active object holding locks during request processing, negating the decoupling benefit; Active object proxy that exposes internal concurrency primitives to callers; Active object scheduler that silently drops requests on queue overflow; Active object servant that leaks thread-local state across unrelated requests

## Children

| File | Type | Focus |
|------|------|-------|
| [conc-structured-concurrency.md](conc-structured-concurrency.md) | 📄 primary | Detect fire-and-forget tasks, missing parent-child task lifetime binding, unhandled child exceptions, and TaskGroup/nursery misuse. |
| [conc-work-stealing.md](conc-work-stealing.md) | 📄 primary | Detect work-stealing deque contention, task granularity issues, ForkJoinPool common pool abuse, and unbalanced work distribution. |
| [mob-swift-concurrency-actors.md](mob-swift-concurrency-actors.md) | 📄 primary | Detect data races from actor reentrancy, MainActor blocking, uncancelled Tasks, missing Sendable conformance, and structured concurrency violations in Swift concurrency. |
| [pattern-active-object.md](pattern-active-object.md) | 📄 primary | Detect misuse, over-application, and absence of the Active Object pattern in asynchronous decoupling code. |
| [reliability-bulkhead-isolation.md](reliability-bulkhead-isolation.md) | 📄 primary | Detect shared resource pools, missing isolation between dependencies, and resource exhaustion cascading across unrelated operations |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
