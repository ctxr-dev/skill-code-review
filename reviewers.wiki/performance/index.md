---
id: performance
type: index
depth_role: subcategory
depth: 1
focus: "performance: Detect reflection not registered for AOT, resource files not included in native image, native image config drift, and GraalVM substitution issues; Detect O(n^2) or worse algorithmic complexity in hot paths where a more effic..."
parents:
  - "../index.md"
shared_covers: []
tags:
  - affinity
  - algorithm
  - alignment
  - allocation
  - anti-pattern
  - aos-soa
  - aot
  - async
  - auto-vectorization
  - benchmark
  - benchmarking
  - big-o
  - boxing
  - cache-line
  - cache-locality
  - closure
  - cold-start
  - complexity
  - container
  - continuous-profiling
generator: "skill-llm-wiki/v1"
entries:
  - id: perf-aot-graalvm-mojo
    file: perf-aot-graalvm-mojo.md
    type: primary
    focus: Detect reflection not registered for AOT, resource files not included in native image, native image config drift, and GraalVM substitution issues
    tags:
      - aot
      - graalvm
      - native-image
      - reflection
      - resource
      - proxy
      - quarkus
      - micronaut
      - mojo
      - performance
  - id: perf-big-o-analysis
    file: perf-big-o-analysis.md
    type: primary
    focus: "Detect O(n^2) or worse algorithmic complexity in hot paths where a more efficient algorithm or data structure exists"
    tags:
      - big-o
      - complexity
      - quadratic
      - nested-loop
      - performance
      - algorithm
      - hot-path
  - id: perf-cache-locality-false-sharing
    file: perf-cache-locality-false-sharing.md
    type: primary
    focus: Detect false sharing on CPU cache lines in concurrent code, poor data layout for cache locality, and random access patterns on large datasets
    tags:
      - cache-locality
      - false-sharing
      - cache-line
      - spatial-locality
      - temporal-locality
      - AoS-SoA
      - prefetch
      - performance
  - id: perf-db-query
    file: perf-db-query.md
    type: primary
    focus: "Detect full table scans, missing indexes, SELECT *, unbounded result sets, expensive JOINs, and query patterns that degrade under production data volumes"
    tags:
      - database
      - query
      - index
      - full-scan
      - select-star
      - join
      - pagination
      - sql
      - orm
      - performance
      - n-plus-1
      - query-performance
      - eager-loading
      - data-architecture
  - id: perf-hot-path-allocations
    file: perf-hot-path-allocations.md
    type: primary
    focus: Detect unnecessary heap allocations, boxing, and object creation in tight loops and per-request hot paths
    tags:
      - allocation
      - gc-pressure
      - boxing
      - hot-path
      - tight-loop
      - object-creation
      - performance
  - id: perf-io-multiplexing-epoll-kqueue-io-uring
    file: perf-io-multiplexing-epoll-kqueue-io-uring.md
    type: primary
    focus: "Detect blocking I/O where async multiplexing would scale, wrong event loop model, io_uring submission queue issues, and epoll edge vs level trigger misuse"
    tags:
      - epoll
      - kqueue
      - io-uring
      - select
      - poll
      - event-loop
      - async
      - multiplexing
      - non-blocking
      - performance
  - id: perf-jit-warmup
    file: perf-jit-warmup.md
    type: primary
    focus: Detect benchmarking before JIT warmup, JIT deoptimization triggers, megamorphic call sites, and class hierarchy changes that invalidate compiled code
    tags:
      - jit
      - warmup
      - benchmark
      - deoptimization
      - megamorphic
      - inlining
      - jvm
      - v8
      - performance
  - id: perf-memory-gc
    file: perf-memory-gc.md
    type: primary
    focus: Detect memory leaks, excessive GC pressure, large object heap issues, and finalizer abuse in managed-runtime and reference-counted environments
    tags:
      - memory-leak
      - gc
      - garbage-collection
      - finalizer
      - event-listener
      - closure
      - dispose
      - performance
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
  - id: perf-profiling-discipline
    file: perf-profiling-discipline.md
    type: primary
    focus: Detect optimization without profiling evidence, microbenchmarks measuring the wrong thing, profiler overhead distorting results, and missing flamegraph analysis
    tags:
      - profiling
      - benchmark
      - flamegraph
      - latency
      - percentile
      - measurement
      - coordinated-omission
      - performance
      - continuous-profiling
      - pyroscope
      - parca
      - cpu
      - allocation
      - overhead
      - observability
      - premature-optimization
      - readability
      - correctness
      - benchmarking
      - anti-pattern
  - id: perf-simd-vectorization
    file: perf-simd-vectorization.md
    type: primary
    focus: Detect patterns that defeat auto-vectorization, branch-heavy loops preventing SIMD, unaligned memory access, and incorrect manual SIMD usage
    tags:
      - simd
      - vectorization
      - auto-vectorization
      - intrinsics
      - alignment
      - data-dependency
      - performance
      - numerical
  - id: perf-startup-cold-start
    file: perf-startup-cold-start.md
    type: primary
    focus: Detect heavy initialization at startup, lazy init deferred to first request, and cold-start penalties in serverless and containerized environments
    tags:
      - startup
      - cold-start
      - serverless
      - lambda
      - container
      - initialization
      - latency
      - readiness
      - performance
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Performance

**Focus:** performance: Detect reflection not registered for AOT, resource files not included in native image, native image config drift, and GraalVM substitution issues; Detect O(n^2) or worse algorithmic complexity in hot paths where a more effic...

## Children

| File | Type | Focus |
|------|------|-------|
| [perf-aot-graalvm-mojo.md](perf-aot-graalvm-mojo.md) | 📄 primary | Detect reflection not registered for AOT, resource files not included in native image, native image config drift, and GraalVM substitution issues |
| [perf-big-o-analysis.md](perf-big-o-analysis.md) | 📄 primary | Detect O(n^2) or worse algorithmic complexity in hot paths where a more efficient algorithm or data structure exists |
| [perf-cache-locality-false-sharing.md](perf-cache-locality-false-sharing.md) | 📄 primary | Detect false sharing on CPU cache lines in concurrent code, poor data layout for cache locality, and random access patterns on large datasets |
| [perf-db-query.md](perf-db-query.md) | 📄 primary | Detect full table scans, missing indexes, SELECT *, unbounded result sets, expensive JOINs, and query patterns that degrade under production data volumes |
| [perf-hot-path-allocations.md](perf-hot-path-allocations.md) | 📄 primary | Detect unnecessary heap allocations, boxing, and object creation in tight loops and per-request hot paths |
| [perf-io-multiplexing-epoll-kqueue-io-uring.md](perf-io-multiplexing-epoll-kqueue-io-uring.md) | 📄 primary | Detect blocking I/O where async multiplexing would scale, wrong event loop model, io_uring submission queue issues, and epoll edge vs level trigger misuse |
| [perf-jit-warmup.md](perf-jit-warmup.md) | 📄 primary | Detect benchmarking before JIT warmup, JIT deoptimization triggers, megamorphic call sites, and class hierarchy changes that invalidate compiled code |
| [perf-memory-gc.md](perf-memory-gc.md) | 📄 primary | Detect memory leaks, excessive GC pressure, large object heap issues, and finalizer abuse in managed-runtime and reference-counted environments |
| [perf-numa-awareness.md](perf-numa-awareness.md) | 📄 primary | Detect cross-NUMA memory access, missing thread-to-core affinity, and memory allocation policies ignoring NUMA topology |
| [perf-profiling-discipline.md](perf-profiling-discipline.md) | 📄 primary | Detect optimization without profiling evidence, microbenchmarks measuring the wrong thing, profiler overhead distorting results, and missing flamegraph analysis |
| [perf-simd-vectorization.md](perf-simd-vectorization.md) | 📄 primary | Detect patterns that defeat auto-vectorization, branch-heavy loops preventing SIMD, unaligned memory access, and incorrect manual SIMD usage |
| [perf-startup-cold-start.md](perf-startup-cold-start.md) | 📄 primary | Detect heavy initialization at startup, lazy init deferred to first request, and cold-start penalties in serverless and containerized environments |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
