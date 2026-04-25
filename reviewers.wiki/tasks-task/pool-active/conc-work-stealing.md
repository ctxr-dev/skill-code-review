---
id: conc-work-stealing
type: primary
depth_role: leaf
focus: Detect work-stealing deque contention, task granularity issues, ForkJoinPool common pool abuse, and unbalanced work distribution.
parents:
  - index.md
covers:
  - Work-stealing deque contention from tasks too fine-grained for the overhead of stealing
  - Task granularity too coarse -- work is not decomposed enough to benefit from work stealing
  - "ForkJoinPool.commonPool() abused with blocking tasks, starving all parallel streams in the JVM"
  - Unbalanced work distribution where some workers finish early and steal nothing useful
  - Fork without join -- subtasks spawned but results never collected
  - Recursive task decomposition without base case threshold, creating millions of micro-tasks
  - "Work-stealing pool used for I/O-bound work where a blocking-thread pool is more appropriate"
  - "ForkJoinTask.invoke() on the common pool from within another ForkJoinTask, causing thread starvation"
  - Rayon par_iter with heterogeneous element processing times causing load imbalance
  - Work-stealing scheduler contention from false sharing on adjacent deque slots
tags:
  - work-stealing
  - ForkJoinPool
  - rayon
  - parallel-stream
  - task-granularity
  - concurrency
  - performance
activation:
  file_globs:
    - "**/*.{java,kt,scala,rs,cpp,c,hpp,go,py,cs}"
  keyword_matches:
    - ForkJoin
    - ForkJoinPool
    - ForkJoinTask
    - RecursiveTask
    - RecursiveAction
    - commonPool
    - parallelStream
    - parallel
    - rayon
    - par_iter
    - par_bridge
    - work_steal
    - work-stealing
    - WorkStealingPool
    - Executors.newWorkStealingPool
    - ManagedBlocker
    - fork
    - join
    - invoke
  structural_signals:
    - recursive_task_decomposition
    - parallel_stream_with_blocking
    - fork_without_join
source:
  origin: file
  path: conc-work-stealing.md
  hash: "sha256:7d06597985672fe0363e5851dd1dab44c981627312fe9c026f16a98b9eb44777"
---
# Work-Stealing Schedulers

## When This Activates

Activates when diffs use Java `ForkJoinPool`/`ForkJoinTask`/`RecursiveTask`, parallel streams (`parallelStream()`), `Executors.newWorkStealingPool()`, Rust `rayon` (`par_iter`, `join`, `scope`), .NET parallel LINQ, or any work-stealing scheduler. Work stealing enables dynamic load balancing for recursive and parallel workloads, but incorrect task granularity, blocking on the common pool, and unbalanced decomposition cause performance degradation worse than sequential execution.

## Audit Surface

- [ ] Recursive decomposition has a sequential threshold (stop splitting below N elements)
- [ ] ForkJoinPool.commonPool() is reserved for CPU-bound, non-blocking work only
- [ ] Every `fork()` has a corresponding `join()` to collect the subtask result
- [ ] Work items have roughly uniform processing cost, or dynamic splitting is used
- [ ] Recursive splitting has a base case that runs sequentially
- [ ] Blocking I/O inside ForkJoinTask uses `ForkJoinPool.ManagedBlocker`
- [ ] Custom ForkJoinPool is used for workloads isolated from the common pool
- [ ] Task splitting produces enough parallelism without creating millions of micro-tasks
- [ ] Rayon/parallel stream elements have similar per-element cost
- [ ] False sharing is avoided on work-stealing deque internal structures
- [ ] Thread count matches available cores for CPU-bound parallelism
- [ ] Work stealing provides measured speedup over sequential -- not added speculatively

## Detailed Checks

### Task Granularity
<!-- activation: keywords=["granularity", "threshold", "split", "decompose", "base", "case", "sequential", "size", "small", "fine", "coarse", "overhead", "micro"] -->

- [ ] **No sequential threshold**: `RecursiveTask` decomposes work all the way down to single elements -- the overhead of creating, forking, and joining millions of tasks exceeds the computation itself
- [ ] **Threshold too high**: the sequential threshold is set so high (e.g., processing the entire array sequentially) that the task is never split -- no parallelism occurs despite using a ForkJoinPool
- [ ] **Threshold hardcoded for specific hardware**: the threshold is tuned for a specific machine (e.g., `if (size < 10000)`) -- on a machine with more/fewer cores, the granularity is wrong
- [ ] **Rayon par_iter on tiny collection**: `vec.par_iter().map(...)` on a collection of 10 elements -- the thread synchronization cost exceeds the computation; use the sequential threshold or check collection size

### ForkJoinPool Common Pool Abuse
<!-- activation: keywords=["commonPool", "common pool", "parallelStream", "parallel()", "supplyAsync", "CompletableFuture", "default", "shared", "global", "starvation", "blocking"] -->

- [ ] **Blocking I/O on common pool**: `parallelStream().map(item -> httpClient.get(item.url()))` blocks common pool threads on network I/O -- all parallel streams and `CompletableFuture` chains in the JVM are starved
- [ ] **CompletableFuture.supplyAsync() without executor**: defaults to `ForkJoinPool.commonPool()` -- if the supplier blocks, it contaminates the pool shared by all parallel operations
- [ ] **Common pool parallelism mismatch**: the common pool's parallelism defaults to `Runtime.getRuntime().availableProcessors() - 1` -- for blocking workloads this is far too few; for CPU-bound work on large containers it may exceed cgroup limits
- [ ] **Nested parallelStream**: a parallel stream inside another parallel stream's map -- both use the common pool, the inner stream may see no available threads, effectively running sequentially with fork/join overhead
- [ ] **No ManagedBlocker for blocking operations**: a `ForkJoinTask` performs blocking work without implementing `ManagedBlocker` -- the pool cannot compensate by adding threads, causing thread starvation

### Fork Without Join
<!-- activation: keywords=["fork", "join", "invoke", "result", "get", "complete", "submit", "execute", "fire", "forget"] -->

- [ ] **fork() without join()**: `subtask.fork()` is called but `subtask.join()` is never called -- the subtask executes but its result is silently discarded, and exceptions are lost
- [ ] **Join on wrong task**: in a recursive binary split, both halves are forked but only one is joined -- the other half's result is lost, and the final result is incomplete
- [ ] **Invoke vs fork/join**: a single task calls `subtask.invoke()` (synchronous) when it should `fork()` the first subtask and compute the second locally -- `invoke()` on both subtasks serializes the work
- [ ] **Correct fork/compute/join pattern**: the canonical pattern is `left.fork(); rightResult = right.compute(); leftResult = left.join()` -- inverting the order (compute left, then fork right, then join right) serializes execution

### Work Distribution and Load Balance
<!-- activation: keywords=["balance", "imbalance", "unbalanced", "skew", "distribution", "partition", "split", "even", "uniform", "heterogeneous", "load"] -->

- [ ] **Even split on skewed data**: data is split evenly by index, but processing time per element varies wildly (e.g., some API calls take 1ms, others take 10s) -- workers that get fast elements finish early and idle
- [ ] **No dynamic splitting**: work is partitioned at the top level into N chunks (one per thread), with no further splitting -- if one chunk takes 10x longer, N-1 threads idle while one is busy
- [ ] **Binary split on 64 cores**: recursive decomposition always splits in half, producing log2(N) levels -- with 64 cores, the first 6 levels only create tasks, not parallelism; consider wider splits or work-stealing-aware partitioning
- [ ] **Rayon join with asymmetric closures**: `rayon::join(|| expensive_work(), || trivial_work())` -- the stealing overhead for the trivial closure exceeds its execution time

### False Sharing and Contention
<!-- activation: keywords=["false sharing", "cache line", "contention", "padding", "alignment", "deque", "steal", "CAS", "atomic", "slot"] -->

- [ ] **Adjacent result slots**: parallel tasks write results to adjacent array indices -- on architectures with 64-byte cache lines, writes to adjacent indices cause false sharing, serializing the parallel work
- [ ] **Shared accumulator**: parallel tasks increment a shared atomic counter for progress tracking -- the counter bounces between CPU caches on every increment, creating a serial bottleneck
- [ ] **Work-stealing deque contention**: custom work-stealing implementation has a deque per worker, but the deque's head and tail pointers are on the same cache line -- stealing causes false sharing with the owner's push/pop

## Common False Positives

- **Small collections with parallel stream**: Java `parallelStream()` on small collections is often idiomatic and the overhead is minimal with the default pool. Flag only if profiling shows it is a bottleneck.
- **Rayon global pool with CPU-bound work**: Rayon's global thread pool is designed for CPU-bound work and is properly sized by default. Do not flag `par_iter()` usage on large collections with uniform work.
- **ManagedBlocker in library code**: some libraries internally implement `ManagedBlocker` for their blocking operations. Verify before flagging "missing ManagedBlocker."
- **Parallel test execution**: test runners use work-stealing for parallel test execution. This is infrastructure, not application code.
- **Framework parallel pipelines**: Apache Spark, Flink, and similar frameworks manage work distribution internally. Flag only if the application-level partitioning is incorrect.

## Severity Guidance

| Finding | Severity |
|---|---|
| Blocking I/O on ForkJoinPool.commonPool() starving all parallel streams | high |
| Fork without join -- subtask result silently discarded | high |
| No sequential threshold in recursive decomposition (millions of micro-tasks) | high |
| CompletableFuture.supplyAsync() with blocking supplier on common pool | high |
| No ManagedBlocker for blocking ForkJoinTask | medium |
| Nested parallelStream causing thread starvation on common pool | medium |
| Even data split on workload with highly variable per-element cost | medium |
| Sequential threshold hardcoded for specific hardware | medium |
| False sharing on adjacent result array slots in parallel computation | medium |
| Rayon par_iter on collection too small to benefit from parallelism | low |
| Binary split producing insufficient parallelism for high core count | low |
| Common pool parallelism not adjusted for container cgroup limits | low |

## See Also

- `pattern-thread-pool` -- work-stealing pools are a specialized thread pool; verify the same lifecycle and sizing concerns
- `conc-lock-free-atomics` -- work-stealing deques use lock-free CAS internally; verify ordering correctness
- `conc-starvation-and-livelock` -- unbalanced work distribution causes worker starvation
- `conc-race-conditions-data-races` -- parallel tasks writing to shared data structures may race
- `conc-futures-promises` -- CompletableFuture defaults to the common ForkJoinPool; verify isolation
- `pattern-producer-consumer` -- work-stealing is an alternative to centralized task queues; compare for the workload

## Authoritative References

- [Robert D. Blumofe and Charles E. Leiserson, "Scheduling Multithreaded Computations by Work Stealing" (1999)](https://doi.org/10.1145/324133.324234)
- [Doug Lea, "A Java Fork/Join Framework" (2000)](http://gee.cs.oswego.edu/dl/papers/fj.pdf)
- [Java SE Documentation: ForkJoinPool](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/ForkJoinPool.html)
- [Rayon Documentation: How Rayon Works](https://github.com/rayon-rs/rayon/blob/main/FAQ.md)
- [Nir Shavit and Dan Touitou, "Software Transactional Memory" (1995)](https://doi.org/10.1145/224964.224987)
