---
id: lock-numa
type: index
depth_role: subcategory
depth: 1
focus: "ABA problem in CAS-based data structures allowing corrupted state; ARM/POWER reordering manifesting in production but not on x86 dev machines; Atomic load followed by non-atomic store (or vice versa) on the same variable; Atomic operation on wrong granularity -- atomicity needed across multiple fields but applied to one"
parents:
  - "../index.md"
shared_covers: []
entries:
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
  - id: pattern-monitor-object
    file: pattern-monitor-object.md
    type: primary
    focus: Detect misuse, deadlock risk, and absence of the Monitor Object pattern in synchronized shared-state code.
    tags:
      - monitor
      - concurrency-pattern
      - design-patterns
      - synchronization
      - lock
      - mutex
      - condition-variable
      - deadlock
  - id: perf-numa-awareness
    file: perf-numa-awareness.md
    type: primary
    focus: Detect cross-NUMA memory access, missing thread-to-core affinity, and memory allocation policies ignoring NUMA topology
    tags:
      - numa
      - memory
      - affinity
      - topology
      - multi-socket
      - latency
      - thread-binding
      - performance
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Lock Numa

**Focus:** ABA problem in CAS-based data structures allowing corrupted state; ARM/POWER reordering manifesting in production but not on x86 dev machines; Atomic load followed by non-atomic store (or vice versa) on the same variable; Atomic operation on wrong granularity -- atomicity needed across multiple fields but applied to one

## Children

| File | Type | Focus |
|------|------|-------|
| [conc-lock-discipline-deadlock.md](conc-lock-discipline-deadlock.md) | 📄 primary | Detect inconsistent lock ordering, overly broad lock scope, nested locks, and missing timeout/try-lock usage that leads to deadlocks. |
| [conc-memory-model-ordering.md](conc-memory-model-ordering.md) | 📄 primary | Detect volatile/atomic misuse, happens-before violations, incorrect fence placement, and instruction reordering bugs across threads. |
| [conc-starvation-and-livelock.md](conc-starvation-and-livelock.md) | 📄 primary | Detect priority inversion, reader/writer starvation, livelock from equal-priority contention, and unfair scheduling in concurrent systems. |
| [conc-stm.md](conc-stm.md) | 📄 primary | Detect transaction retry storms, oversized transactions, side effects inside transactions, and read-set inflation in software transactional memory. |
| [pattern-monitor-object.md](pattern-monitor-object.md) | 📄 primary | Detect misuse, deadlock risk, and absence of the Monitor Object pattern in synchronized shared-state code. |
| [perf-numa-awareness.md](perf-numa-awareness.md) | 📄 primary | Detect cross-NUMA memory access, missing thread-to-core affinity, and memory allocation policies ignoring NUMA topology |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
