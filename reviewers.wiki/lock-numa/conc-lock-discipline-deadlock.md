---
id: conc-lock-discipline-deadlock
type: primary
depth_role: leaf
focus: "Detect inconsistent lock ordering, overly broad lock scope, nested locks, and missing timeout/try-lock usage that leads to deadlocks."
parents:
  - index.md
covers:
  - Inconsistent lock acquisition ordering across code paths causing ABBA deadlock
  - Nested lock acquisition without documented ordering, risking deadlock under contention
  - "Lock held during blocking I/O, network calls, or external service invocations"
  - Missing try-lock or timeout causing indefinite blocking on contended locks
  - Lock scope too wide, serializing unrelated operations and destroying throughput
  - "Lock acquired but not released on all code paths (missing finally/defer/RAII)"
  - Reentrant lock assumption on non-reentrant mutex causing self-deadlock
  - Lock ordering violated by callback or listener invoked while lock is held
  - Database locks interleaving with in-memory locks creating cross-layer deadlocks
  - Multiple readers starved by write-lock preference in ReadWriteLock
  - Lock convoy forming from frequent acquisition of a single hot lock
tags:
  - deadlock
  - lock-ordering
  - lock-discipline
  - concurrency
  - mutex
  - synchronization
  - contention
activation:
  file_globs:
    - "**/*.{java,kt,scala,cs,py,rb,go,rs,swift,cpp,c,h,hpp,ts,zig}"
  keyword_matches:
    - lock
    - Lock
    - mutex
    - Mutex
    - synchronized
    - sync
    - RwLock
    - ReentrantLock
    - ReadWriteLock
    - tryLock
    - try_lock
    - deadlock
    - acquire
    - release
    - unlock
    - defer
    - finally
    - guard
    - Monitor
  structural_signals:
    - nested_lock_acquisition
    - lock_without_unlock_in_finally
    - multiple_mutex_fields
source:
  origin: file
  path: conc-lock-discipline-deadlock.md
  hash: "sha256:8e4f7e5ccbe28c4d243e23d4b9591ac200163be5a511f896afd8d6bf4e294051"
---
# Lock Discipline and Deadlock Prevention

## When This Activates

Activates when diffs introduce lock acquisitions (mutex, synchronized, ReentrantLock, RwLock), add nested locking across multiple objects, hold locks during I/O or external calls, or acquire locks without timeout or try-lock patterns. Deadlocks are the most feared concurrency bug: they freeze production systems with no automatic recovery, produce no error message, and are nearly impossible to reproduce in testing because they depend on precise thread scheduling.

## Audit Surface

- [ ] All code paths that acquire multiple locks use a consistent, documented ordering
- [ ] No lock is held while invoking a callback, listener, or virtual/overridden method
- [ ] No lock is held during blocking I/O (network, disk, database, message broker)
- [ ] Lock acquisitions use tryLock with timeout where indefinite blocking is unacceptable
- [ ] Lock scope is minimized to only the critical section that requires mutual exclusion
- [ ] Lock release is guaranteed via finally/defer/RAII -- no exception path skips unlock
- [ ] Non-reentrant mutexes are not acquired by code that may recursively re-enter
- [ ] Lock ordering is documented (comment, naming convention, or design doc) when multiple locks exist
- [ ] ReadWriteLock fairness policy is chosen intentionally for the read/write ratio
- [ ] In-memory locks and database locks do not form cross-layer cycles
- [ ] Lock granularity matches the data -- independent state groups use independent locks
- [ ] Locks are not held across await/yield points in async code
- [ ] Spinlocks are used only for very short, non-blocking critical sections
- [ ] Lock retry loops use backoff and a bounded attempt count

## Detailed Checks

### Inconsistent Lock Ordering
<!-- activation: keywords=["order", "ordering", "nested", "hierarchy", "ABBA", "cycle", "deadlock", "multiple", "two", "lock", "acquire"] -->

- [ ] **ABBA deadlock**: path A acquires lock X then lock Y; path B acquires lock Y then lock X -- under concurrent execution, each thread holds one lock and waits for the other, freezing both
- [ ] **Lock ordering not documented**: codebase has multiple named locks but no convention (comment, naming prefix with order number, architecture doc) establishing their acquisition order
- [ ] **Dynamic lock ordering**: locks are acquired on objects from a collection where the order depends on runtime input -- use a canonical ordering (e.g., by object ID) to prevent cycles
- [ ] **Cross-module lock interaction**: a method in module A acquires lock A and calls module B which internally acquires lock B; elsewhere, the reverse occurs -- the lock interaction is invisible at the call site

### Lock Held During I/O or External Calls
<!-- activation: keywords=["I/O", "network", "http", "database", "file", "send", "receive", "call", "request", "query", "sleep", "blocking", "external", "callback", "listener", "dispatch"] -->

- [ ] **I/O under lock**: synchronized method or lock-guarded block calls a database, HTTP endpoint, or file system -- all other threads waiting on this lock are blocked for the entire I/O duration
- [ ] **Callback under lock**: lock is held while invoking a callback, observer, or event handler -- the callback may attempt to acquire another lock, creating a deadlock cycle invisible to the lock holder
- [ ] **Virtual dispatch under lock**: lock is held while calling an overridable method -- a subclass override may acquire another lock or perform I/O, violating the lock discipline of the base class
- [ ] **Sleep under lock**: `Thread.sleep()`, `time.sleep()`, or equivalent is called inside a critical section -- the lock is held for the entire sleep duration

### Missing Timeout and Try-Lock
<!-- activation: keywords=["tryLock", "try_lock", "timeout", "timed", "wait", "indefinite", "block", "hang", "forever", "deadlock"] -->

- [ ] **Indefinite lock.lock()**: code calls `lock()` or `mutex.lock()` with no timeout -- if a deadlock or long hold occurs, the thread blocks forever with no diagnostic
- [ ] **tryLock return value ignored**: `tryLock()` returns `false` but the code proceeds as if the lock was acquired -- the critical section executes without mutual exclusion
- [ ] **No deadlock detection**: system has complex locking but no mechanism (thread dump monitoring, watchdog, lock-order checker) to detect deadlocks in production
- [ ] **Lock wait in request path**: a user-facing request path acquires a lock that may be held for seconds by a background task -- user requests hang with no timeout or fallback

### Lock Scope Too Wide
<!-- activation: keywords=["scope", "method", "entire", "broad", "coarse", "wide", "minimize", "reduce", "narrow", "critical", "section", "synchronized"] -->

- [ ] **Entire method synchronized**: a method is synchronized or wrapped in a lock but only a few lines actually access shared state -- the I/O, logging, and computation outside the critical section needlessly hold the lock
- [ ] **Lock held across allocation**: lock is held while allocating memory, constructing objects, or running expensive computation that does not touch shared state -- other threads are blocked during non-critical work
- [ ] **Lock held across loop**: a lock is acquired before a loop that processes multiple items, each iteration accessing shared state once -- acquiring and releasing inside the loop (if semantics permit) reduces hold time
- [ ] **Synchronized getter and setter**: both getter and setter are synchronized, but compound check-then-set is done by the caller without holding the lock -- the synchronization gives false confidence

### Lock Release Guarantees
<!-- activation: keywords=["finally", "defer", "RAII", "guard", "unlock", "release", "drop", "close", "exception", "error", "panic", "throw"] -->

- [ ] **Missing finally/defer on unlock**: `lock.lock()` is called but `lock.unlock()` is not in a `finally` block (Java/C#) or `defer` statement (Go) -- if an exception or panic occurs, the lock is never released
- [ ] **Manual lock in Rust without guard**: code calls `mutex.lock().unwrap()` and stores the raw value, dropping the `MutexGuard` early or not at all -- prefer `let _guard = mutex.lock().unwrap()` for RAII
- [ ] **Unlock on wrong path**: unlock is in an `if` branch but not in the `else` branch -- one code path leaks the lock
- [ ] **Double unlock**: lock is released in both the normal path and the `finally` block -- double unlock panics in Go and causes undefined behavior in C++

### Async and Coroutine Lock Hazards
<!-- activation: keywords=["async", "await", "coroutine", "yield", "suspend", "continuation", "tokio", "asyncio", "Task", "CompletableFuture"] -->

- [ ] **Lock held across await**: a `Mutex` or `synchronized` block spans an `await` point -- the continuation may resume on a different thread that does not own the lock (C#, Kotlin coroutines, Rust async)
- [ ] **std::sync::Mutex in async Rust**: `std::sync::Mutex` blocks the async runtime thread when contended -- use `tokio::sync::Mutex` which yields the task instead
- [ ] **Python asyncio with threading.Lock**: `threading.Lock` blocks the event loop thread -- use `asyncio.Lock` for async code

## Common False Positives

- **RAII languages with scope guards**: Rust `MutexGuard`, C++ `std::lock_guard`, and Go `defer mu.Unlock()` release locks automatically. Do not flag missing explicit unlock when RAII/defer is used correctly.
- **Single-lock systems**: code with only one lock cannot deadlock from lock ordering. Flag only scope and I/O concerns, not ordering.
- **Database-only locking**: database row-level locks managed by the DB engine with deadlock detection and automatic rollback. Do not flag unless combined with in-memory locks.
- **Lock-free code**: code using atomics or CAS loops intentionally avoids locks. See `conc-lock-free-atomics` instead.
- **Test fixtures**: test code acquiring locks in a controlled single-threaded sequence does not need ordering discipline. Flag only if the test exercises concurrent lock acquisition.

## Severity Guidance

| Finding | Severity |
|---|---|
| ABBA lock ordering across production code paths (deadlock risk) | critical |
| Lock not released on exception path (missing finally/defer/RAII) | critical |
| Lock held during blocking I/O in request-handling code | high |
| Callback or virtual dispatch invoked while lock is held | high |
| Non-reentrant mutex re-entered from same thread (self-deadlock) | high |
| Lock held across await point in async code | high |
| No timeout on lock acquisition in user-facing request path | medium |
| Lock scope spans entire method when only a few lines need it | medium |
| Lock ordering convention undocumented in multi-lock codebase | medium |
| Spinlock used for potentially long or blocking critical section | medium |
| ReadWriteLock fairness not considered for read-heavy workload | low |
| Lock retry loop without backoff | low |

## See Also

- `conc-race-conditions-data-races` -- data races are the problem that locks solve; verify that the lock actually covers all access paths
- `conc-lock-free-atomics` -- atomics avoid locking entirely for simple state; consider whether a lock is necessary
- `conc-starvation-and-livelock` -- incorrect lock discipline causes starvation (readers or writers never proceed) and livelock (threads retry forever)
- `pattern-monitor-object` -- the monitor pattern encapsulates lock discipline; verify wait/notify correctness within monitors
- `principle-encapsulation` -- locks should be private to the owning object; exposing locks breaks discipline
- `pattern-active-object` -- active objects eliminate explicit locking via message passing; consider as an alternative

## Authoritative References

- [Brian Goetz et al., *Java Concurrency in Practice* (2006), Chapter 10: Avoiding Liveness Hazards](https://jcip.net/)
- [Edward A. Lee, "The Problem with Threads" (2006)](https://www2.eecs.berkeley.edu/Pubs/TechRpts/2006/EECS-2006-1.pdf)
- [Cormac Flanagan and Stephen N. Freund, "Type-Based Race Detection for Java" (2000)](https://doi.org/10.1145/349299.349328)
- [The Rustonomicon: Concurrency](https://doc.rust-lang.org/nomicon/concurrency.html)
- [Go Documentation: sync.Mutex](https://pkg.go.dev/sync#Mutex)
