---
id: perf-profiling-discipline
type: primary
depth_role: leaf
focus: Detect optimization without profiling evidence, microbenchmarks measuring the wrong thing, profiler overhead distorting results, and missing flamegraph analysis
parents:
  - index.md
covers:
  - Performance optimization applied without profiling data justifying the change
  - Microbenchmark measuring JIT warmup, GC, or class loading instead of steady state
  - "Profiler overhead (instrumentation mode) distorting results"
  - Missing flamegraph or call-tree analysis for latency investigation
  - "Benchmark not representative of production workload (wrong data size, wrong distribution)"
  - "Wall-clock time used when CPU time is the correct metric (or vice versa)"
  - Coordinated omission in latency measurement
  - "Percentile blindness -- reporting only mean/median, hiding tail latency"
  - Continuous profiling not enabled in production deployments
  - Profiling overhead not measured or exceeding budget
  - Missing CPU profile for compute-bound services
  - Missing allocation profile for GC-heavy services
  - Profile data not correlated with traces via span-profile linking
  - Profiling agent misconfigured with wrong service name or tags
  - "Wall-clock profiling not enabled for I/O-bound services"
  - Lock contention profiling missing for concurrent systems
  - Profile retention too short for regression comparison
  - "Bit manipulation where arithmetic operators would be clearer (x >> 1 instead of x / 2)"
  - Hand-rolled data structures replacing standard library collections without benchmarked justification
  - Caching added without profiling data or cache-hit-rate measurement
  - "Object pooling for cheap-to-allocate objects (small structs, short-lived DTOs)"
  - "Manual memory management in garbage-collected languages (explicit free, WeakReference abuse)"
  - Loop unrolling, branch prediction hints, or SIMD intrinsics in application-layer code
  - "Custom serialization bypassing standard formats (JSON, protobuf) for marginal speed"
  - Inlined code that duplicates logic across call sites for marginal call-overhead savings
  - "Premature use of unsafe/unchecked blocks to skip bounds checks without profiling justification"
  - Micro-benchmarked code paths that handle less than 1 percent of traffic
  - String pre-allocation, buffer sizing, or capacity hints without measured allocation pressure
  - Denormalized database schema without read-performance evidence
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
aliases:
  - obs-continuous-profiling-pyroscope-parca
  - antipattern-premature-optimization
activation:
  file_globs:
    - "**/*bench*"
    - "**/*Benchmark*"
    - "**/*perf*"
    - "**/*profile*"
    - "**/*latency*"
    - "**/*throughput*"
    - "**/*load*"
  keyword_matches:
    - benchmark
    - profile
    - profiler
    - flamegraph
    - flame graph
    - pprof
    - async-profiler
    - JFR
    - perf record
    - latency
    - throughput
    - p99
    - p95
    - percentile
    - mean
    - median
    - nanoTime
    - Stopwatch
    - performance
    - optimize
    - optimiz
  structural_signals:
    - benchmark_code
    - profiling_config
    - optimization_without_evidence
    - latency_measurement
source:
  origin: file
  path: perf-profiling-discipline.md
  hash: "sha256:14c1e5d36751e593a369f4840b48f4474ff089826c98e6bdb729b721b1706035"
---
# Profiling Discipline

## When This Activates

Activates on diffs that optimize performance, add benchmarks, configure profiling tools, or measure latency/throughput. The cardinal rule of performance engineering is "measure first, optimize second." Optimization without profiling is guessing -- it often targets the wrong bottleneck, adds complexity to non-critical paths, and produces unmaintainable code. Equally dangerous are benchmarks that measure the wrong thing: cold JIT, profiler overhead, or non-representative workloads produce misleading numbers that guide further wrong optimizations. This reviewer checks that performance work is grounded in sound measurement methodology.

## Audit Surface

- [ ] PR optimizing code with no profiling data, benchmark, or flamegraph cited
- [ ] Microbenchmark with no warmup phase measuring cold-start performance
- [ ] Benchmark result reported as single number without variance or percentiles
- [ ] Profiling done with instrumentation agent that adds >5% overhead
- [ ] Latency measured at client without correcting for coordinated omission
- [ ] Mean latency reported without p99 or p999
- [ ] Benchmark data size or shape not representative of production
- [ ] System.currentTimeMillis() used for sub-millisecond timing
- [ ] Benchmark comparing languages or frameworks with different warm-up characteristics
- [ ] Load test running at constant request rate (open-loop) without measuring queue depth
- [ ] Performance regression test with no baseline or threshold
- [ ] Production profiling not attempted before speculative optimization

## Detailed Checks

### Optimization Without Evidence
<!-- activation: keywords=["optimize", "performance", "fast", "speed", "efficient", "improve", "cache", "pool", "batch", "inline", "unroll", "prefetch", "rewrite"] -->

- [ ] **No profiling cited**: flag PR descriptions claiming performance improvement without referencing profiling output, flamegraphs, benchmark results, or EXPLAIN plans -- without measurement, the optimization target is unknown; request profiling evidence
- [ ] **Speculative optimization**: flag code changes that increase complexity (caching, pooling, batching, manual memory management) without evidence that the original code was a bottleneck -- see `antipattern-premature-optimization`
- [ ] **No before/after comparison**: flag performance PRs without before-and-after numbers from the same benchmark -- without comparison, the improvement is unverifiable

### Microbenchmark Methodology
<!-- activation: keywords=["benchmark", "Benchmark", "bench", "JMH", "BenchmarkDotNet", "criterion", "hyperfine", "timeit", "measure", "timing", "warmup"] -->

- [ ] **No warmup phase**: flag benchmarks timing code without warmup iterations -- JIT-compiled runtimes need warmup to reach steady state; results without warmup measure the interpreter
- [ ] **Dead code elimination**: flag benchmark code where the result is not consumed (not returned, not passed to a sink, not written to volatile) -- the compiler may eliminate the entire computation
- [ ] **Non-representative data**: flag benchmarks using toy data (10 items, empty strings, sequential integers) when production data has different characteristics (millions of items, Unicode strings, skewed distributions) -- results do not transfer
- [ ] **Single-run measurement**: flag benchmarks that run the measured code once and report the result -- a single run includes noise from GC, OS scheduling, and thermal throttling; run multiple iterations and report statistics

### Measurement Errors
<!-- activation: keywords=["latency", "throughput", "p99", "p95", "p50", "percentile", "mean", "median", "average", "coordinated omission", "HDR", "histogram", "wall clock", "CPU time", "nanoTime", "currentTimeMillis"] -->

- [ ] **Coordinated omission**: flag latency measurement systems that stop sending new requests while waiting for slow responses -- this hides tail latency because the measuring system backs off during overload; use an open-loop load generator (wrk2, Gatling with constant rate) or correct with HDR Histogram
- [ ] **Only mean/median reported**: flag latency reports showing only mean or median without p99/p999 -- the mean hides tail latency; a service with 10ms mean and 5s p99 has very different user impact than one with 10ms mean and 15ms p99
- [ ] **Wrong clock for scale**: flag `System.currentTimeMillis()`, `Date.now()`, or equivalent millisecond-resolution clocks for microsecond-scale benchmarks -- use nanosecond-resolution clocks (System.nanoTime, performance.now, clock_gettime(CLOCK_MONOTONIC))
- [ ] **Wall clock vs CPU time confusion**: flag using wall-clock time to measure CPU-bound work on a loaded system, or CPU time to measure I/O-bound work -- wall clock includes wait time; CPU time excludes it; choose the metric that matches what you are measuring

### Profiler Selection and Overhead
<!-- activation: keywords=["profiler", "profile", "async-profiler", "JFR", "pprof", "perf", "flamegraph", "flame graph", "instrument", "sample", "trace", "overhead", "agent"] -->

- [ ] **Instrumentation profiler for production**: flag use of instrumentation-mode profilers (adding bytecode or callbacks to every method entry/exit) for production profiling or for results used to guide optimization -- instrumentation adds 5-50% overhead, distorting hot-path identification; use sampling profilers (async-profiler, perf, pprof)
- [ ] **No flamegraph for latency investigation**: flag latency investigations that rely only on log timestamps or ad-hoc timing without generating a flamegraph or call-tree profile -- flamegraphs show where time is actually spent; log timestamps show only when, not where
- [ ] **Profiler safe-point bias**: flag Java profiling with built-in tools that sample only at safe points (jstack, old hprof) -- safe-point sampling is biased toward long-running methods; use async-profiler or JFR for accurate sampling

### Load Testing Methodology
<!-- activation: keywords=["load test", "stress test", "k6", "Locust", "Gatling", "JMeter", "wrk", "vegeta", "hey", "ab", "concurrent", "rate", "throughput", "saturation"] -->

- [ ] **Closed-loop load test**: flag load tests where new requests are sent only when previous responses return (closed-loop / fixed concurrency) -- closed-loop hides queuing delays; for latency SLOs, use open-loop (constant arrival rate) to reveal how the system behaves under offered load
- [ ] **No throughput saturation point**: flag load tests that run at a single request rate without finding the saturation point -- a load test at 50% capacity tells you nothing about behavior at 100%; increase rate until latency degrades to find the ceiling

## Common False Positives

- **Algorithmic complexity fixes**: replacing O(n^2) with O(n log n) does not require profiling evidence -- the improvement is provably correct from complexity analysis. See `perf-big-o-analysis`.
- **Security fixes**: performance-adjacent changes for security (rate limiting, input validation) do not need profiling justification.
- **Known hot paths**: established hot paths documented in the codebase (rendering loop, request parser, serialization) may justify optimization without a new profiling run, if historical profiling evidence exists.
- **Framework-provided benchmarks**: if the PR uses JMH, Criterion, BenchmarkDotNet, or equivalent framework with built-in warmup and statistics, warmup methodology concerns are typically handled automatically.

## Severity Guidance

| Finding | Severity |
|---|---|
| Complex optimization applied with no profiling evidence | Critical |
| Benchmark with no warmup measuring cold performance (misleading results) | Critical |
| Coordinated omission in latency measurement (hides tail latency) | Important |
| Only mean/median reported without percentiles | Important |
| Instrumentation profiler used for production profiling (distorted results) | Important |
| Non-representative benchmark data size or distribution | Important |
| No before/after comparison for performance PR | Minor |
| Millisecond clock used for microsecond-scale measurement | Minor |
| Closed-loop load test without saturation point analysis | Minor |

## See Also

- `antipattern-premature-optimization` -- the antipattern this reviewer is the antidote to
- `perf-jit-warmup` -- JIT warmup is the most common microbenchmark methodology error
- `perf-big-o-analysis` -- complexity analysis is valid without profiling; this reviewer covers empirical measurement
- `principle-dry-kiss-yagni` -- KISS and YAGNI argue against complexity without evidence; profiling provides the evidence
- `data-n-plus-1-and-query-perf` -- EXPLAIN plans are the query equivalent of flamegraphs

## Authoritative References

- [Brendan Gregg, *Systems Performance*, 2nd ed. (2020) -- comprehensive performance analysis methodology, USE method, and flamegraphs](https://www.brendangregg.com/systems-performance-2nd-edition-book.html)
- [Gil Tene, "How NOT to Measure Latency" (2013) -- coordinated omission and latency measurement pitfalls](https://www.infoq.com/presentations/latency-response-time/)
- [Aleksey Shipilev, "JMH Samples" -- correct microbenchmarking methodology for JVM](https://hg.openjdk.org/code-tools/jmh/file/tip/jmh-samples/)
- [Brendan Gregg, "Flame Graphs" -- visualization methodology for profiling data](https://www.brendangregg.com/flamegraphs.html)
