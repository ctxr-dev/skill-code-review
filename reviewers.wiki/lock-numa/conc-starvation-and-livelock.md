---
id: conc-starvation-and-livelock
type: primary
depth_role: leaf
focus: "Detect priority inversion, reader/writer starvation, livelock from equal-priority contention, and unfair scheduling in concurrent systems."
parents:
  - index.md
covers:
  - Priority inversion where a high-priority thread waits for a lock held by a low-priority thread
  - Reader starvation from writer-preferring ReadWriteLock under write-heavy workload
  - Writer starvation from reader-preferring ReadWriteLock under read-heavy workload
  - Livelock from two threads repeatedly yielding to each other without making progress
  - Unfair lock causing some threads to acquire it far more often than others
  - Thread pool task starvation from long-running tasks blocking the pool
  - Spinlock starvation on NUMA architectures where remote core threads lose CAS races
  - Priority ceiling or priority inheritance not applied to prevent inversion
  - Consumer starvation in producer-consumer when producer rate overwhelms consumer
  - Coroutine starvation from a coroutine that never yields
tags:
  - starvation
  - livelock
  - priority-inversion
  - fairness
  - scheduling
  - concurrency
  - contention
  - deadlock-variant
activation:
  file_globs:
    - "**/*.{java,kt,scala,cs,cpp,c,h,hpp,rs,go,py,swift,zig}"
  keyword_matches:
    - starvation
    - starve
    - livelock
    - priority
    - fairness
    - fair
    - unfair
    - "ReentrantLock(true)"
    - ReentrantReadWriteLock
    - ReadWriteLock
    - RwLock
    - yield
    - backoff
    - spinlock
    - spin
    - contention
    - retry
    - priority_inherit
    - PTHREAD_PRIO_INHERIT
  structural_signals:
    - unfair_lock_with_high_contention
    - symmetric_retry_logic
    - spinlock_without_backoff
source:
  origin: file
  path: conc-starvation-and-livelock.md
  hash: "sha256:086c6df0635c291e63717f21693c5d0b8df54af90afe1c95c9ee3b238412851d"
---
# Starvation and Livelock

## When This Activates

Activates when diffs introduce ReadWriteLocks, priority-sensitive thread scheduling, retry/backoff logic for contention resolution, spinlocks, or concurrent systems where fairness matters. Starvation and livelock are liveness failures: the system is running (not deadlocked), but some threads make no progress. Unlike deadlocks, starvation and livelock do not freeze the system entirely -- they degrade specific paths, making them harder to detect and diagnose.

## Audit Surface

- [ ] Priority inversion is prevented by priority inheritance or priority ceiling protocols
- [ ] ReadWriteLock fairness is chosen intentionally for the workload's read/write ratio
- [ ] Contention resolution uses asymmetric backoff to prevent livelock symmetry
- [ ] Lock fairness (FIFO vs unfair) is explicitly chosen and documented
- [ ] Thread pool isolation prevents long tasks from starving short tasks
- [ ] Spinlocks use backoff (exponential, MCS, CLH) on NUMA/multi-core systems
- [ ] Consumer throughput matches or exceeds sustained producer throughput
- [ ] Cooperative coroutines yield at regular intervals -- no monopolization
- [ ] Retry strategies break symmetry (random jitter, exponential backoff, ID-based priority)
- [ ] Starvation is observable via wait-time metrics, lock-hold-time metrics, or logging
- [ ] Writer/reader priority is explicit, not left to the default of the locking implementation
- [ ] Thread priorities are not mixed on shared locks without inversion protection

## Detailed Checks

### Priority Inversion
<!-- activation: keywords=["priority", "inversion", "inheritance", "ceiling", "high", "low", "real-time", "RT", "SCHED", "PTHREAD_PRIO", "boost", "critical"] -->

- [ ] **Classic priority inversion**: high-priority thread H waits for lock held by low-priority thread L; medium-priority thread M preempts L -- H is effectively blocked by M, which has lower priority than H
- [ ] **No priority inheritance**: lock is shared between threads of different priorities, but the OS/runtime is not configured to boost the lock holder's priority to the highest waiting priority -- use `PTHREAD_PRIO_INHERIT` or equivalent
- [ ] **Priority ceiling not set**: in real-time systems, the priority ceiling protocol prevents inversion by raising the holder's priority to the ceiling of the lock -- missing on locks shared across priority levels
- [ ] **User-space priority inversion**: application-level priority queues are used, but the underlying lock or thread pool does not respect priorities -- a low-priority task holding a shared resource blocks high-priority tasks
- [ ] **Go runtime priority inversion**: Go does not expose thread priorities, but goroutine scheduling is cooperative -- a CPU-bound goroutine that does not yield starves other goroutines, creating a de facto inversion

### Reader/Writer Starvation
<!-- activation: keywords=["reader", "writer", "ReadWriteLock", "RwLock", "read", "write", "prefer", "fair", "unfair", "starve", "starvation"] -->

- [ ] **Writer-preferring lock starves readers**: `ReentrantReadWriteLock(false)` (unfair) or a writer-preferring implementation blocks new readers when a writer is waiting -- under sustained write traffic, readers are perpetually blocked
- [ ] **Reader-preferring lock starves writers**: as long as at least one reader holds the lock, new readers are admitted -- a continuous stream of readers prevents any writer from ever acquiring the write lock
- [ ] **Fair lock overhead ignored**: `ReentrantReadWriteLock(true)` (fair) prevents starvation but adds significant overhead (FIFO queue management) -- under low contention, fair locks waste throughput for no benefit
- [ ] **RwLock default policy unknown**: Rust `std::sync::RwLock` and Go `sync.RWMutex` do not specify fairness guarantees in their documentation -- the behavior is OS/implementation-dependent and may change between versions
- [ ] **Write lock held too long**: a writer holds the lock during I/O or computation, blocking all readers -- readers that could run concurrently are serialized behind the writer

### Livelock
<!-- activation: keywords=["livelock", "live lock", "retry", "yield", "back off", "backoff", "symmetric", "collision", "contend", "bounce", "spin", "progress"] -->

- [ ] **Symmetric backoff**: two threads detect contention and both back off for the same duration, then retry simultaneously, collide again, and repeat forever -- add random jitter to break symmetry
- [ ] **Polite lock release**: thread A acquires lock 1, tries lock 2, fails, releases lock 1, and immediately retries -- thread B does the same in reverse; both perpetually acquire one lock and release it, making no progress
- [ ] **CAS contention without backoff**: multiple threads CAS-loop on the same atomic variable with no backoff -- under high contention, threads spend CPU time but rarely succeed, and the "winner" changes randomly
- [ ] **Equal-priority contention**: two processes with equal priority repeatedly preempt each other on a shared resource -- neither makes progress because neither has priority to proceed first
- [ ] **Retry storm as livelock**: a distributed system with aggressive retry policies causes all nodes to retry simultaneously after a transient failure -- the retries collide, causing further failures, creating a self-sustaining livelock

### Thread Pool and Task Starvation
<!-- activation: keywords=["pool", "task", "starve", "starvation", "queue", "long", "blocking", "worker", "timeout", "deadline", "slow", "batch"] -->

- [ ] **Long task starves short tasks**: a thread pool has N threads and N-1 long-running tasks monopolize them -- short tasks wait in the queue until a long task finishes, causing timeout violations
- [ ] **Blocking task in async pool**: a blocking call in an async/event-loop pool occupies the single thread (or one of few threads) -- all other tasks are starved until the blocking call completes
- [ ] **Single-queue bottleneck**: all tasks funnel through a single FIFO queue -- a burst of slow tasks blocks all subsequent fast tasks; use priority queues or separate queues for fast/slow paths
- [ ] **No task timeout**: tasks in the pool have no deadline -- a hung task occupies a thread forever, permanently reducing pool capacity
- [ ] **Virtual thread pinning (Java)**: virtual threads pinned to carrier threads inside `synchronized` blocks starve other virtual threads that need carrier threads

### Coroutine and Event Loop Starvation
<!-- activation: keywords=["coroutine", "event loop", "yield", "await", "cooperative", "preemptive", "monopolize", "block", "asyncio", "tokio", "Node", "single-threaded"] -->

- [ ] **CPU-bound coroutine without yield**: a coroutine performs heavy computation without yielding (`await asyncio.sleep(0)`, `tokio::task::yield_now()`) -- the event loop is monopolized and all other coroutines are starved
- [ ] **Node.js event loop blocking**: synchronous computation or blocking I/O on the Node.js event loop thread -- all pending callbacks, timers, and I/O handlers are starved until the blocking call completes
- [ ] **Tokio blocking in async context**: `std::thread::sleep()` or blocking I/O inside a Tokio task without `spawn_blocking()` -- the Tokio worker thread is blocked, reducing the pool's effective parallelism
- [ ] **Go goroutine without preemption points**: before Go 1.14, a tight loop without function calls could not be preempted -- it would monopolize the OS thread indefinitely; Go 1.14+ has asynchronous preemption, but `GOMAXPROCS=1` can still cause visible starvation

## Common False Positives

- **Intentional unfair locks**: unfair locks are the default in many languages (Java `ReentrantLock(false)`) and are appropriate for low-contention scenarios where throughput matters more than fairness. Do not flag unfair locks without evidence of contention.
- **Single-threaded contexts**: starvation is a multi-thread/multi-task concern. Code running on a single thread by design does not have starvation issues.
- **Cooperative scheduling by design**: some systems (game loops, embedded controllers) intentionally use cooperative scheduling where tasks are expected to yield promptly. Do not flag the scheduling model itself; flag only tasks that violate the yield contract.
- **Retry with jitter already applied**: many libraries (AWS SDK, gRPC) implement exponential backoff with jitter internally. Do not flag "missing jitter" if the library handles it.
- **Test workloads**: test code with artificial delays or tight loops may trigger starvation detectors but is not production behavior.

## Severity Guidance

| Finding | Severity |
|---|---|
| Priority inversion on lock shared between real-time and background threads | high |
| Reader starvation under sustained write traffic (service unavailable for reads) | high |
| Writer starvation under sustained read traffic (writes never complete) | high |
| Livelock from symmetric backoff with no jitter | high |
| Blocking call on event loop / single-threaded async runtime | high |
| Long-running task starving short tasks in shared thread pool | high |
| CAS contention without backoff burning CPU with no progress | medium |
| Virtual thread pinning causing carrier thread starvation (Java) | medium |
| CPU-bound coroutine without yield monopolizing event loop | medium |
| No starvation monitoring (wait time, lock hold time metrics) | medium |
| Unfair lock under known high contention | medium |
| Write lock held during I/O blocking all readers | medium |
| ReadWriteLock fairness policy not explicitly chosen | low |
| Retry storm potential in distributed system without jitter | medium |

## See Also

- `conc-lock-discipline-deadlock` -- deadlock is the extreme liveness failure; starvation is the partial version where some threads progress
- `conc-lock-free-atomics` -- CAS contention without backoff is a form of livelock; verify backoff in CAS loops
- `conc-work-stealing` -- unbalanced work distribution causes worker starvation in work-stealing pools
- `conc-race-conditions-data-races` -- starvation can mask race conditions by serializing access unintentionally
- `pattern-thread-pool` -- thread pool sizing and task isolation prevent task starvation
- `pattern-producer-consumer` -- consumer starvation occurs when producer rate exceeds consumer capacity

## Authoritative References

- [Lampson, Butler W. and David D. Redell, "Experience with Processes and Monitors in Mesa" (1980)](https://doi.org/10.1145/358818.358824)
- [Sha, L., R. Rajkumar, and J. P. Lehoczky, "Priority Inheritance Protocols: An Approach to Real-Time Synchronization" (1990)](https://doi.org/10.1109/2.59302)
- [Brian Goetz et al., *Java Concurrency in Practice* (2006), Chapter 10: Avoiding Liveness Hazards](https://jcip.net/)
- [Maurice Herlihy and Nir Shavit, *The Art of Multiprocessor Programming* (2nd ed., 2020), Chapter 7: Spin Locks and Contention](https://www.elsevier.com/books/the-art-of-multiprocessor-programming/herlihy/978-0-12-415950-1)
- [Go Documentation: The Go Memory Model -- Synchronization](https://go.dev/ref/mem)
