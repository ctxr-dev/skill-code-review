---
id: concurrency
type: index
depth_role: subcategory
depth: 1
focus: "concurrency: Detect unbounded mailboxes, shared mutable state between actors, blocking inside actors, and missing supervision in actor-based systems.; Detect missing cancellation propagation, ignored cancel tokens, resource leaks on canc..."
parents:
  - "../index.md"
shared_covers: []
tags:
  - aba
  - abortcontroller
  - actor
  - actor-model
  - akka
  - async
  - async-await
  - atomic
  - atomically
  - atomicity
  - atomics
  - barrier
  - cancellation
  - cancellationtoken
  - cas
  - channels
  - communicating-sequential-processes
  - compare-and-swap
  - completablefuture
  - composability
generator: "skill-llm-wiki/v1"
entries:
  - id: conc-actor-model
    file: conc-actor-model.md
    type: primary
    focus: Detect unbounded mailboxes, shared mutable state between actors, blocking inside actors, and missing supervision in actor-based systems.
    tags:
      - actor
      - actor-model
      - akka
      - erlang
      - elixir
      - orleans
      - concurrency
      - supervision
      - mailbox
  - id: conc-async-cancellation
    file: conc-async-cancellation.md
    type: primary
    focus: Detect missing cancellation propagation, ignored cancel tokens, resource leaks on cancellation, and unstructured cancellation scopes.
    tags:
      - cancellation
      - async
      - context
      - CancellationToken
      - AbortController
      - timeout
      - cooperative-cancellation
  - id: conc-csp-channels
    file: conc-csp-channels.md
    type: primary
    focus: Detect goroutine leaks, unbuffered channel deadlocks, missing select timeouts, and unrestricted channel direction in CSP-style code.
    tags:
      - csp
      - channels
      - goroutine
      - go
      - concurrency
      - deadlock
      - goroutine-leak
      - select
      - communicating-sequential-processes
  - id: conc-futures-promises
    file: conc-futures-promises.md
    type: primary
    focus: Detect unhandled rejections, unconsumed future results, error-swallowing promise chains, and callback-to-async migration issues.
    tags:
      - futures
      - promises
      - async-await
      - CompletableFuture
      - Task
      - unhandled-rejection
      - concurrency
  - id: conc-lock-discipline-deadlock
    file: conc-lock-discipline-deadlock.md
    type: primary
    focus: "Detect inconsistent lock ordering, overly broad lock scope, nested locks, and missing timeout/try-lock usage that leads to deadlocks."
    tags:
      - deadlock
      - lock-ordering
      - lock-discipline
      - concurrency
      - mutex
      - synchronization
      - contention
  - id: conc-memory-model-ordering
    file: conc-memory-model-ordering.md
    type: primary
    focus: "Detect volatile/atomic misuse, happens-before violations, incorrect fence placement, and instruction reordering bugs across threads."
    tags:
      - memory-model
      - happens-before
      - volatile
      - atomic
      - reordering
      - fence
      - barrier
      - visibility
      - concurrency
      - race-condition
      - data-race
      - toctou
      - synchronization
      - atomicity
      - thread-safety
      - memory-ordering
      - atomics
      - false-sharing
      - lock-free
      - CWE-362
      - CWE-567
      - CAS
      - ABA
      - wait-free
      - compare-and-swap
  - id: conc-starvation-and-livelock
    file: conc-starvation-and-livelock.md
    type: primary
    focus: "Detect priority inversion, reader/writer starvation, livelock from equal-priority contention, and unfair scheduling in concurrent systems."
    tags:
      - starvation
      - livelock
      - priority-inversion
      - fairness
      - scheduling
      - concurrency
      - contention
      - deadlock-variant
  - id: conc-stm
    file: conc-stm.md
    type: primary
    focus: Detect transaction retry storms, oversized transactions, side effects inside transactions, and read-set inflation in software transactional memory.
    tags:
      - stm
      - software-transactional-memory
      - transaction
      - retry
      - atomically
      - TVar
      - Ref
      - concurrency
      - composability
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
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Concurrency

**Focus:** concurrency: Detect unbounded mailboxes, shared mutable state between actors, blocking inside actors, and missing supervision in actor-based systems.; Detect missing cancellation propagation, ignored cancel tokens, resource leaks on canc...

## Children

| File | Type | Focus |
|------|------|-------|
| [conc-actor-model.md](conc-actor-model.md) | 📄 primary | Detect unbounded mailboxes, shared mutable state between actors, blocking inside actors, and missing supervision in actor-based systems. |
| [conc-async-cancellation.md](conc-async-cancellation.md) | 📄 primary | Detect missing cancellation propagation, ignored cancel tokens, resource leaks on cancellation, and unstructured cancellation scopes. |
| [conc-csp-channels.md](conc-csp-channels.md) | 📄 primary | Detect goroutine leaks, unbuffered channel deadlocks, missing select timeouts, and unrestricted channel direction in CSP-style code. |
| [conc-futures-promises.md](conc-futures-promises.md) | 📄 primary | Detect unhandled rejections, unconsumed future results, error-swallowing promise chains, and callback-to-async migration issues. |
| [conc-lock-discipline-deadlock.md](conc-lock-discipline-deadlock.md) | 📄 primary | Detect inconsistent lock ordering, overly broad lock scope, nested locks, and missing timeout/try-lock usage that leads to deadlocks. |
| [conc-memory-model-ordering.md](conc-memory-model-ordering.md) | 📄 primary | Detect volatile/atomic misuse, happens-before violations, incorrect fence placement, and instruction reordering bugs across threads. |
| [conc-starvation-and-livelock.md](conc-starvation-and-livelock.md) | 📄 primary | Detect priority inversion, reader/writer starvation, livelock from equal-priority contention, and unfair scheduling in concurrent systems. |
| [conc-stm.md](conc-stm.md) | 📄 primary | Detect transaction retry storms, oversized transactions, side effects inside transactions, and read-set inflation in software transactional memory. |
| [conc-structured-concurrency.md](conc-structured-concurrency.md) | 📄 primary | Detect fire-and-forget tasks, missing parent-child task lifetime binding, unhandled child exceptions, and TaskGroup/nursery misuse. |
| [conc-work-stealing.md](conc-work-stealing.md) | 📄 primary | Detect work-stealing deque contention, task granularity issues, ForkJoinPool common pool abuse, and unbalanced work distribution. |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
