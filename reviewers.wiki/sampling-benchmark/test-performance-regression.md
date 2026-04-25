---
id: test-performance-regression
type: primary
depth_role: leaf
focus: Detect missing benchmark tests, benchmarks not in CI, missing baseline comparisons, and micro-benchmarks measuring the wrong thing
parents:
  - index.md
covers:
  - Performance-critical function without a benchmark test
  - Benchmark test not integrated into CI pipeline
  - Benchmark results not compared to a stored baseline
  - Micro-benchmark measuring framework overhead instead of the target operation
  - Benchmark not using proper warm-up phase, measuring cold-start JIT or cache behavior
  - Benchmark results affected by GC pauses, context switches, or other system noise
  - Missing benchmark for algorithm or data structure change
  - Benchmark with too few iterations to be statistically significant
  - "No regression threshold: benchmark runs but results are not gated"
  - Benchmark measuring wall-clock time instead of CPU time for CPU-bound operations
tags:
  - benchmark
  - performance-regression
  - micro-benchmark
  - jmh
  - criterion
  - hyperfine
  - baseline
  - ci-benchmark
activation:
  file_globs:
    - "**/*bench*"
    - "**/*Bench*"
    - "**/*benchmark*"
    - "**/*Benchmark*"
    - "**/*perf*"
    - "**/benches/**"
  keyword_matches:
    - benchmark
    - Benchmark
    - "@Benchmark"
    - BenchmarkDotNet
    - criterion
    - hyperfine
    - bench_function
    - b.iter
    - testing.B
    - func Benchmark
    - "@BenchmarkMode"
    - JMH
    - warmup
    - throughput
    - "ops/sec"
    - "ns/op"
    - regression
    - baseline
  structural_signals:
    - benchmark_function
    - benchmark_annotation
    - benchmark_configuration
source:
  origin: file
  path: test-performance-regression.md
  hash: "sha256:5b33ae97be83ea1d3503e436f86cc4ae6082dbdd89f12680930484e3ccd20545"
---
# Performance Regression Testing

## When This Activates

Activates when the diff modifies performance-critical code paths (algorithms, data structures, serialization, hot loops), benchmark files, or benchmark CI configuration. Also activates when a PR changes a function known to be on a hot path without adding or updating benchmarks. Performance regressions are silent -- they do not break tests -- and can only be caught by benchmarks that run in CI and compare against baselines.

## Audit Surface

- [ ] Algorithm or data structure change in a hot path without a benchmark
- [ ] Benchmark test file not included in CI configuration
- [ ] Benchmark runs but does not compare results to a stored baseline or previous run
- [ ] Micro-benchmark that includes setup/teardown in the measured region
- [ ] Benchmark without warm-up iterations (JVM: JIT not triggered, .NET: tiered compilation not settled)
- [ ] Benchmark with <100 iterations, insufficient for statistical significance
- [ ] Benchmark measures elapsed wall-clock time for a CPU-bound operation instead of CPU cycles or instructions
- [ ] No regression threshold defined: benchmark cannot fail the build on performance degradation
- [ ] Benchmark uses shared state or global setup that varies between runs
- [ ] Benchmark allocates inside the measurement loop, measuring allocator behavior instead of logic
- [ ] Benchmark result includes I/O or network latency when testing a CPU-bound function
- [ ] PR changes a hot-path function but does not update or add benchmarks

## Detailed Checks

### Missing Benchmarks
<!-- activation: keywords=["algorithm", "sort", "search", "hash", "serialize", "parse", "encode", "decode", "transform", "process", "loop", "batch", "hot", "critical", "latency"] -->

- [ ] **Hot path without benchmark**: a function on a known hot path (request handler, serializer, core algorithm) is modified without an accompanying benchmark -- add a benchmark that measures the function's throughput or latency in isolation
- [ ] **Algorithm change without measurement**: PR replaces a sorting algorithm, search strategy, or data structure without benchmarking both old and new implementations -- performance claims without measurements are speculation
- [ ] **New serialization/deserialization without benchmark**: code adds a new codec, parser, or formatter in a latency-sensitive path without benchmarking it -- serialization is a common performance bottleneck
- [ ] **Allocation-heavy change without memory benchmark**: PR adds object allocations in a hot loop without benchmarking memory allocation rate -- allocation pressure drives GC pauses

### Benchmark Methodology
<!-- activation: keywords=["benchmark", "bench", "iter", "warmup", "warm-up", "setup", "teardown", "iteration", "sample", "measurement", "blackhole", "consume", "doNotOptimize"] -->

- [ ] **No warm-up**: benchmark does not perform warm-up iterations before measurement -- on JVM, the first iterations measure interpreted code, not JIT-compiled code; on other platforms, cold caches skew results
- [ ] **Setup in measured region**: benchmark includes data allocation, file I/O, or other setup inside the timed section -- extract setup to a separate phase so only the target operation is measured
- [ ] **Dead code elimination**: benchmark result is not consumed (returned, stored, or passed to a blackhole/doNotOptimize) -- the compiler may optimize away the entire computation, producing meaningless zero-latency results
- [ ] **Insufficient iterations**: benchmark runs <100 iterations, producing results with high variance and low confidence -- use the framework's default iteration count or increase until standard deviation is <5% of the mean
- [ ] **Wall-clock for CPU-bound**: benchmark measures elapsed (wall-clock) time for a CPU-bound operation -- use CPU time or perf counters to exclude OS scheduling jitter; or control for system noise with statistical methods

### Baseline Comparison and CI Integration
<!-- activation: keywords=["baseline", "compare", "regression", "threshold", "gate", "ci", "pipeline", "trend", "previous", "stored", "archive", "report"] -->

- [ ] **No baseline**: benchmark runs but results are not compared to any stored baseline -- a 30% regression is invisible without comparison; store and compare baselines
- [ ] **No regression threshold**: benchmark comparison exists but no threshold defines what constitutes a regression (e.g., >10% slower) -- without a threshold, the benchmark is informational only and cannot gate the build
- [ ] **Not in CI**: benchmark exists in the source tree but is not executed in CI -- it provides no automated regression detection
- [ ] **Baseline staleness**: stored baseline was recorded months ago against different hardware or a different codebase version -- refresh baselines periodically and record the hardware/environment
- [ ] **No statistical rigor**: benchmark comparison uses a single run, not multiple runs with statistical tests (t-test, confidence intervals) -- a single-sample comparison cannot distinguish signal from noise

### Common Micro-Benchmark Pitfalls
<!-- activation: keywords=["micro", "nano", "ns", "us", "ms", "allocat", "gc", "garbage", "jit", "optimize", "inline", "vectorize", "cache", "memory"] -->

- [ ] **Measuring the wrong thing**: benchmark measures allocator throughput, GC pause time, or JIT compilation rather than the application logic -- isolate the target operation from runtime artifacts
- [ ] **Constant folding**: benchmark input is a compile-time constant, allowing the compiler to precompute the result -- use runtime-varying inputs to prevent constant folding
- [ ] **Cache effects**: benchmark runs on a small dataset that fits entirely in L1/L2 cache, but production workloads exceed cache size -- benchmark with production-representative data sizes
- [ ] **Single input size**: benchmark measures only one input size -- benchmark across multiple input sizes to detect algorithmic complexity regressions (O(n) to O(n^2))
- [ ] **System noise not controlled**: benchmark runs without CPU pinning, frequency scaling disabled, or other noise reduction -- on shared CI runners, control for variance with multiple runs and statistical analysis

## Common False Positives

- **Non-critical paths**: not every function needs a benchmark. Internal admin tools, one-off scripts, and low-frequency batch jobs do not need micro-benchmarks.
- **Framework-managed warm-up**: JMH, Criterion, BenchmarkDotNet handle warm-up automatically. Do not flag missing warm-up when using these frameworks with default settings.
- **Macro-benchmarks via load tests**: system-level performance is measured by load tests. Micro-benchmarks complement load tests for isolated functions; one does not replace the other.
- **Benchmark on CI runners with variance**: CI runners have inherent variance. A benchmark that uses statistical comparison (Criterion, JMH) already accounts for this; do not flag runner variance as a methodology problem.

## Severity Guidance

| Finding | Severity |
|---|---|
| Hot-path algorithm change without any benchmark | Important |
| Benchmark not in CI, providing no automated regression detection | Important |
| Benchmark results not compared to a baseline | Important |
| Micro-benchmark with dead code elimination (result not consumed) | Important |
| Benchmark includes setup/teardown in the measured region | Minor |
| No warm-up iterations (when not using a framework that handles it) | Minor |
| Single-sample comparison without statistical significance | Minor |
| Benchmark with <100 iterations producing high-variance results | Minor |

## See Also

- `test-load-k6-locust-gatling-jmeter` -- load tests measure system-level performance; benchmarks measure function-level performance
- `principle-fail-fast` -- benchmarks without thresholds silently regress instead of failing fast
- `antipattern-premature-optimization` -- benchmarks should target known hot paths, not speculative bottlenecks
- `principle-dry-kiss-yagni` -- do not benchmark trivial functions that are not on a hot path

## Authoritative References

- [JMH -- Java Microbenchmark Harness by Oracle](https://openjdk.org/projects/code-tools/jmh/)
- [Criterion.rs -- statistics-driven benchmarking for Rust](https://bheisler.github.io/criterion.rs/book/)
- [BenchmarkDotNet -- benchmarking for .NET](https://benchmarkdotnet.org/)
- [Go Testing -- benchmarks with testing.B](https://pkg.go.dev/testing#hdr-Benchmarks)
- [Denis Bakhvalov, *Performance Analysis and Tuning on Modern CPUs* (2020)](https://book.easyperf.net/perf_book)
- [Aleksey Shipilev, "JMH Samples" -- micro-benchmark pitfalls](https://hg.openjdk.org/code-tools/jmh/file/tip/jmh-samples/)
