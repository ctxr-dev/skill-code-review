---
id: pattern-monitor-object
type: primary
depth_role: leaf
focus: Detect misuse, deadlock risk, and absence of the Monitor Object pattern in synchronized shared-state code.
parents:
  - index.md
covers:
  - Monitor with exposed lock allowing external callers to introduce deadlocks
  - "Wait/notify without proper predicate loop, vulnerable to spurious wakeups"
  - "Monitor methods that hold locks during I/O or long-running operations"
  - Monitors with nested locking across multiple monitor objects, risking deadlock
  - Missing monitor where shared mutable state uses ad-hoc synchronized blocks scattered across call sites
  - "Monitor using notify() instead of notifyAll(), starving waiting threads"
  - Condition variable waited on without holding the associated lock
  - Monitor with overly coarse locking, serializing unrelated operations
  - Monitor that mixes public lock acquisition with internal synchronization
  - Monitor object with mutable state leaked via reference from synchronized methods
tags:
  - monitor
  - concurrency-pattern
  - design-patterns
  - synchronization
  - lock
  - mutex
  - condition-variable
  - deadlock
activation:
  file_globs:
    - "**/*.{java,kt,scala,cs,ts,js,py,rb,go,rs,swift,cpp,h,hpp}"
  keyword_matches:
    - Monitor
    - monitor
    - synchronized
    - lock
    - mutex
    - wait
    - notify
    - notifyAll
    - condition
    - await
    - signal
    - signalAll
    - guard
    - critical section
    - Condition
    - Lock
    - ReentrantLock
    - Mutex
    - RwLock
  structural_signals:
    - synchronized_methods_on_class
    - lock_with_condition_variable
    - wait_notify_pair
source:
  origin: file
  path: pattern-monitor-object.md
  hash: "sha256:00ece6237c45254c9a8a40ce337b126cd0dc798e94befde3a65e8f5c62b4eddf"
---
# Monitor Object Pattern

## When This Activates

Activates when diffs introduce synchronized methods or blocks protecting shared state, use `ReentrantLock`/`Mutex`/`RwLock` with `Condition`/`ConditionVariable`, call `wait()`/`notify()` or `await()`/`signal()`, or add mutual exclusion around data accessed by multiple threads. The Monitor Object pattern encapsulates synchronization inside the object that owns the state, but incorrect implementation leads to deadlocks, lost signals, spurious wakeup bugs, and performance bottlenecks from overly broad locking.

## Audit Surface

- [ ] All locks and mutexes are private -- no caller can acquire the monitor's lock externally
- [ ] Every `wait()`/`await()` call is inside a `while` loop that re-checks the predicate, not an `if`
- [ ] No synchronized method performs blocking I/O, network calls, or long computations while holding the lock
- [ ] Nested locking across multiple monitors uses a consistent, documented lock ordering
- [ ] Shared mutable state is fully encapsulated within a monitor, not protected by ad-hoc `synchronized` blocks scattered across unrelated classes
- [ ] `notify()` is used only when exactly one waiter exists and all waiters have identical conditions; otherwise `notifyAll()` is used
- [ ] `Condition.await()` / `wait()` is only called while the associated lock is held
- [ ] The lock granularity matches the data: independent fields use independent locks, not one global lock
- [ ] Synchronized methods do not return mutable references to internal state (breaks encapsulation of the monitor)
- [ ] Read-heavy workloads use `ReadWriteLock`/`RwLock`, not an exclusive lock
- [ ] Lock release is guaranteed via `finally`/`defer`/RAII -- no path skips the unlock
- [ ] Check-then-act sequences across multiple monitor method calls are atomic or documented as non-atomic
- [ ] Write locks are not held for read-only operations
- [ ] Condition signaling happens after the state change, not before
- [ ] Monitor logic is encapsulated in one class, not duplicated across multiple files

## Detailed Checks

### Lock Exposure and Encapsulation
<!-- activation: keywords=["lock", "mutex", "synchronized", "public", "expose", "external", "acquire", "shared", "this", "class"] -->

- [ ] **Public lock field**: the monitor's `Lock`/`Mutex` is a public or package-private field -- external code can `lock()` it, introducing deadlocks the monitor cannot reason about
- [ ] **Synchronizing on `this`**: using `synchronized(this)` in Java or `lock(this)` in C# allows any external code with a reference to the object to synchronize on the same monitor, creating unintended contention or deadlock
- [ ] **Synchronizing on a shared constant**: `synchronized("literal")` or `synchronized(SomeClass.class)` uses a lock visible to all code in the JVM, creating contention with unrelated classes
- [ ] **Leaking lock via getter**: a method returns the internal `Lock` or `Condition` object to callers, breaking encapsulation
- [ ] **Mutable reference escape**: a synchronized getter returns a direct reference to an internal mutable collection or object -- callers modify it without holding the lock, causing data races

### Wait/Notify Correctness
<!-- activation: keywords=["wait", "notify", "notifyAll", "condition", "await", "signal", "signalAll", "predicate", "spurious", "wakeup"] -->

- [ ] **Wait without predicate loop**: `wait()` or `Condition.await()` is called inside an `if` instead of a `while` -- spurious wakeups (permitted by the JVM spec and POSIX) cause the thread to proceed when the condition is not actually met
- [ ] **Lost signal**: `notify()`/`signal()` is called before any thread is waiting -- the signal is lost and the waiter that arrives later waits forever
- [ ] **notify() with multiple waiters**: `notify()` wakes one arbitrary waiter, but multiple waiters exist with different conditions -- the wrong waiter is woken, re-checks its condition, goes back to sleep, and the correct waiter is never notified
- [ ] **Condition awaited without lock**: calling `condition.await()` without holding `lock.lock()` throws `IllegalMonitorStateException` at runtime (Java) or causes undefined behavior (C++)
- [ ] **Signal before state change**: condition is signaled before the state it guards is actually updated -- the awakened thread re-checks and finds the predicate still false, going back to sleep (wasted wakeup) or, worse, proceeding with stale state
- [ ] **Timed wait without re-check**: `wait(timeout)` returns but the caller does not distinguish between timeout and notification -- it proceeds assuming the condition is met

### Lock Scope and I/O
<!-- activation: keywords=["I/O", "network", "http", "database", "file", "read", "write", "send", "receive", "request", "query", "sleep", "Thread.sleep", "blocking"] -->

- [ ] **I/O under lock**: a synchronized method calls a database, HTTP endpoint, file system, or message broker while holding the lock -- other threads are blocked for the entire I/O duration, destroying throughput
- [ ] **Sleep under lock**: `Thread.sleep()` or equivalent is called inside a synchronized block -- the lock is held during the entire sleep, blocking all other threads
- [ ] **Callback under lock**: a synchronized method invokes a callback or listener that may re-enter the monitor or acquire other locks -- risk of deadlock or unbounded lock hold time
- [ ] **Logging under lock**: synchronized method calls a logging framework that may perform I/O (file write, network appender) -- this serializes all threads through the logging call
- [ ] **Lock held across `await`**: in async runtimes (C# `async`/`await`, Kotlin coroutines), holding a lock across an `await` point means the continuation may resume on a different thread that does not own the lock

### Deadlock Risks
<!-- activation: keywords=["deadlock", "nested", "order", "ordering", "hierarchy", "cycle", "lock", "acquire", "multiple", "reentrant"] -->

- [ ] **Inconsistent lock ordering**: code acquires monitor A then monitor B in one path, but monitor B then monitor A in another path -- classic ABBA deadlock
- [ ] **Calling external code under lock**: a synchronized method calls a method on another object that may attempt to acquire the same or a different monitor -- lock ordering is uncontrollable across module boundaries
- [ ] **Non-reentrant lock re-entry**: code acquires a non-reentrant lock and then calls a method on the same object that attempts to acquire it again -- immediate deadlock (common with `Mutex` in Rust, `threading.Lock` in Python)
- [ ] **Lock ordering not documented**: multiple monitors exist in the codebase but no documentation or naming convention establishes a consistent acquisition order
- [ ] **Hidden lock in library call**: a synchronized method calls a library or framework method that internally acquires its own lock -- the two-lock interaction is invisible and may deadlock under contention

### Granularity and Performance
<!-- activation: keywords=["performance", "contention", "throughput", "granularity", "ReadWriteLock", "RwLock", "striped", "concurrent", "bottleneck", "coarse", "fine"] -->

- [ ] **Coarse-grained lock**: a single lock protects the entire object when independent groups of fields could be protected by separate locks -- threads contend unnecessarily on unrelated operations
- [ ] **Exclusive lock on read-heavy data**: state is mostly read and rarely written, but an exclusive `Mutex`/`synchronized` is used instead of `ReadWriteLock`/`RwLock` -- readers block each other for no reason
- [ ] **Write lock for read operation**: code acquires a write lock (`writeLock().lock()`) to perform a read-only operation -- downgrades are not always possible, but the lock type should match the access
- [ ] **Lock-free alternative ignored**: the monitor protects a simple counter, flag, or reference that could use an atomic variable (`AtomicInteger`, `AtomicBool`, `atomic.Value`) without locking overhead
- [ ] **Striped locking opportunity**: the monitor protects a large collection where operations on different keys are independent -- consider striped or segmented locks to reduce contention

### Missing Monitor (Ad-Hoc Synchronization)
<!-- activation: keywords=["synchronized", "lock", "shared", "mutable", "thread", "concurrent", "volatile", "atomic", "race", "unsafe"] -->

- [ ] **Scattered synchronized blocks**: shared mutable state is accessed from multiple classes, each wrapping access in its own `synchronized(obj)` block -- this is error-prone; encapsulate the state and its synchronization in a dedicated monitor object
- [ ] **Partial synchronization**: some access paths to shared state are synchronized and others are not -- the unsynchronized paths create data races
- [ ] **Lock on wrong object**: multiple `synchronized` blocks protect the same data but lock on different objects -- they provide no mutual exclusion at all
- [ ] **Manual volatile flag instead of monitor**: a `volatile boolean` is used to coordinate complex state transitions that require atomicity across multiple fields -- volatile only guarantees visibility, not atomicity of compound operations

## Common False Positives

- **Concurrent data structures**: `ConcurrentHashMap`, `sync.Map`, `Arc<Mutex<T>>` in standard library usage are pre-built monitors. Do not flag their usage as "missing monitor encapsulation" unless they are used incorrectly (e.g., check-then-act without `computeIfAbsent`).
- **Database transactions**: transactional isolation in a database provides the same guarantees as a monitor for persisted state. Do not flag DB-backed state for missing in-memory synchronization unless there is also an in-memory cache.
- **Immutable shared state**: objects shared across threads that are immutable after construction need no synchronization. Do not flag reads of final/val/const fields.
- **Single-threaded contexts**: code that runs exclusively on a single thread (UI thread, event loop, main goroutine by convention) does not need monitors. Verify the threading model before flagging.
- **Lock-free algorithms**: code using CAS loops, atomic operations, or memory fences is intentionally avoiding monitors. Flag only if the lock-free implementation is incorrect, not merely for being non-monitor.

## Severity Guidance

| Finding | Severity |
|---|---|
| Wait/notify without predicate loop (spurious wakeup vulnerability) | high |
| Nested locking with inconsistent ordering (deadlock risk) | high |
| Lock held during network I/O or database call | high |
| Public lock field allowing external deadlock introduction | high |
| Synchronized method returns mutable reference to internal state | high |
| notify() used with multiple waiters having different conditions | medium |
| Coarse-grained lock serializing independent operations | medium |
| Exclusive lock on read-heavy data instead of ReadWriteLock | medium |
| Ad-hoc synchronized blocks scattered across classes for same state | medium |
| Condition signaled before guarded state is updated | medium |
| Lock not released in finally/defer block (non-RAII language) | high |
| Write lock acquired for a read-only operation | low |
| Missing lock ordering documentation for multi-monitor codebase | low |
| Lock-free atomic usable in place of a monitor for simple counter/flag | low |

## See Also

- `pattern-active-object` -- active objects serialize access via a message queue, eliminating explicit locking; consider whether an active object is a better fit than a monitor for the workload
- `pattern-double-checked-locking` -- DCL is a specific monitor optimization for lazy initialization; verify it against the same wait/notify and memory model concerns
- `principle-encapsulation` -- the monitor must encapsulate its lock and state; exposing either breaks the pattern's correctness guarantees
- `principle-coupling-cohesion` -- ad-hoc synchronized blocks scattered across classes indicate low cohesion; consolidate into a monitor object
- `principle-immutability-by-default` -- immutable data eliminates the need for monitors entirely; prefer immutability where possible

## Authoritative References

- [Douglas C. Schmidt et al., *Pattern-Oriented Software Architecture Volume 2: Patterns for Concurrent and Networked Objects* (2000), Monitor Object](https://www.wiley.com/en-us/Pattern+Oriented+Software+Architecture+Volume+2-p-9780471606956)
- [Per Brinch Hansen, "Monitors and Concurrent Pascal: A Personal History" (1993)](https://doi.org/10.1145/155360.155361)
- [C.A.R. Hoare, "Monitors: An Operating System Structuring Concept" (1974)](https://doi.org/10.1145/355620.361161)
- [Brian Goetz et al., *Java Concurrency in Practice* (2006), Chapter 14: Building Custom Synchronizers](https://jcip.net/)
- [Joshua Bloch, *Effective Java* (3rd ed., 2018), Item 81: Prefer concurrency utilities to wait and notify](https://www.oreilly.com/library/view/effective-java/9780134686097/)
