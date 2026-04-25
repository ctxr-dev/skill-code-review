---
id: sampling-benchmark
type: index
depth_role: subcategory
depth: 1
focus: Benchmark measuring wall-clock time instead of CPU time for CPU-bound operations; Benchmark not using proper warm-up phase, measuring cold-start JIT or cache behavior; Benchmark results affected by GC pauses, context switches, or other system noise; Benchmark results not compared to a stored baseline
parents:
  - "../index.md"
shared_covers: []
entries:
  - id: ai-ml-training-pytorch-tensorflow-jax-sklearn
    file: ai-ml-training-pytorch-tensorflow-jax-sklearn.md
    type: primary
    focus: Detect GPU training without mixed precision, data loading bottlenecks, missing gradient clipping, absent learning rate schedules, overfitting from no validation split, and reproducibility issues from unseeded randomness
    tags:
      - training
      - PyTorch
      - TensorFlow
      - JAX
      - sklearn
      - mixed-precision
      - gradient-clipping
      - learning-rate
      - reproducibility
  - id: modern-parallel-run
    file: modern-parallel-run.md
    type: primary
    focus: "Detect parallel run (shadow traffic) failures where execution lacks result comparison, comparison is incomplete, divergence has no alerting, the parallel path outlives its validation period, or performance impact is unmeasured"
    tags:
      - parallel-run
      - shadow-traffic
      - dark-launch
      - comparison
      - divergence
      - migration
      - verification
  - id: obs-sampling-strategies
    file: obs-sampling-strategies.md
    type: primary
    focus: Detect trace sampling misconfigurations that lose critical signal, over-sample routine traffic, or produce inconsistent sampling decisions across services
    tags:
      - sampling
      - tracing
      - head-sampling
      - tail-sampling
      - cost
      - observability
      - opentelemetry
      - probabilistic
      - rate
      - traces
  - id: test-performance-regression
    file: test-performance-regression.md
    type: primary
    focus: Detect missing benchmark tests, benchmarks not in CI, missing baseline comparisons, and micro-benchmarks measuring the wrong thing
    tags:
      - benchmark
      - performance-regression
      - micro-benchmark
      - jmh
      - criterion
      - hyperfine
      - baseline
      - ci-benchmark
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Sampling Benchmark

**Focus:** Benchmark measuring wall-clock time instead of CPU time for CPU-bound operations; Benchmark not using proper warm-up phase, measuring cold-start JIT or cache behavior; Benchmark results affected by GC pauses, context switches, or other system noise; Benchmark results not compared to a stored baseline

## Children

| File | Type | Focus |
|------|------|-------|
| [ai-ml-training-pytorch-tensorflow-jax-sklearn.md](ai-ml-training-pytorch-tensorflow-jax-sklearn.md) | 📄 primary | Detect GPU training without mixed precision, data loading bottlenecks, missing gradient clipping, absent learning rate schedules, overfitting from no validation split, and reproducibility issues from unseeded randomness |
| [modern-parallel-run.md](modern-parallel-run.md) | 📄 primary | Detect parallel run (shadow traffic) failures where execution lacks result comparison, comparison is incomplete, divergence has no alerting, the parallel path outlives its validation period, or performance impact is unmeasured |
| [obs-sampling-strategies.md](obs-sampling-strategies.md) | 📄 primary | Detect trace sampling misconfigurations that lose critical signal, over-sample routine traffic, or produce inconsistent sampling decisions across services |
| [test-performance-regression.md](test-performance-regression.md) | 📄 primary | Detect missing benchmark tests, benchmarks not in CI, missing baseline comparisons, and micro-benchmarks measuring the wrong thing |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
