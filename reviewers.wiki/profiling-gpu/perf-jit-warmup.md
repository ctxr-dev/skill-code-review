---
id: perf-jit-warmup
type: primary
depth_role: leaf
focus: Detect benchmarking before JIT warmup, JIT deoptimization triggers, megamorphic call sites, and class hierarchy changes that invalidate compiled code
parents:
  - index.md
covers:
  - Benchmark measuring cold JIT performance instead of steady-state
  - Missing warmup iterations in microbenchmark harness
  - "Megamorphic call site (>2 receiver types) preventing inlining"
  - "Class hierarchy change invalidating JIT-compiled code (deoptimization)"
  - Exception-heavy control flow defeating JIT optimization
  - Reflection or dynamic dispatch in hot path preventing JIT optimization
  - "On-stack replacement (OSR) artifacts in benchmark results"
  - Dead code elimination invalidating benchmark measurements
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
activation:
  file_globs:
    - "**/*benchmark*"
    - "**/*Benchmark*"
    - "**/*bench*"
    - "**/*perf*"
    - "**/*test*"
    - "**/*.java"
    - "**/*.kt"
    - "**/*.scala"
    - "**/*.js"
    - "**/*.ts"
  keyword_matches:
    - benchmark
    - Benchmark
    - JMH
    - warmup
    - Warmup
    - nanoTime
    - currentTimeMillis
    - performance.now
    - process.hrtime
    - Blackhole
    - megamorphic
    - deoptimize
    - inline
    - JIT
    - tiered
    - compile
    - interpret
  structural_signals:
    - benchmark_no_warmup
    - megamorphic_dispatch
    - reflection_in_hot_path
    - exception_control_flow
source:
  origin: file
  path: perf-jit-warmup.md
  hash: "sha256:0104219c1bb82d17f64eee6f49bce34599f5c0cc5dee57a593f8707bdb30342e"
---
# JIT Warmup and Optimization Discipline

## When This Activates

Activates on diffs containing benchmark code, performance measurement, polymorphic dispatch in hot paths, or class hierarchy changes affecting JIT-compiled code. JIT compilers (HotSpot C2, GraalVM, V8 TurboFan, .NET RyuJIT) optimize code based on runtime profiling data -- but they need warmup iterations to gather that data. Benchmarks run before warmup measure the interpreter, not steady-state performance. Additionally, certain code patterns (megamorphic dispatch, reflection, exceptions as control flow) prevent JIT optimizers from applying their most effective transformations. This reviewer detects both measurement errors and optimization-defeating patterns.

## Audit Surface

- [ ] Benchmark with no warmup phase (System.nanoTime around cold code)
- [ ] JMH @Benchmark without @Warmup annotation or with insufficient warmup iterations
- [ ] Interface or abstract method called with >2 concrete implementations in hot path
- [ ] New subclass added to hierarchy used in polymorphic hot-path dispatch
- [ ] Reflection (Method.invoke, getattr, eval) in request-serving hot path
- [ ] Exception thrown as control flow in a tight loop
- [ ] Benchmark result variable not consumed (Blackhole, volatile sink) -- dead code risk
- [ ] System.currentTimeMillis() used for microbenchmark timing instead of nanoTime
- [ ] Benchmark running in interpreted mode without disclosure
- [ ] Dynamic proxy or method handle in hot dispatch path
- [ ] Large method body exceeding JIT inline threshold
- [ ] Deoptimization-triggering pattern: uncommon trap, class check failure, null check

## Detailed Checks

### Benchmark Warmup Errors
<!-- activation: keywords=["benchmark", "Benchmark", "bench", "measure", "timing", "nanoTime", "currentTimeMillis", "performance.now", "hrtime", "Stopwatch", "warmup", "Warmup", "JMH", "iteration"] -->

- [ ] **No warmup iterations**: flag benchmarks that time code without a warmup phase -- the first executions run in the interpreter or with unoptimized JIT output; include at least 5-10 warmup iterations before measuring
- [ ] **Wrong timer resolution**: flag `System.currentTimeMillis()` or `Date.now()` for microbenchmarks -- these have millisecond resolution; use `System.nanoTime()`, `performance.now()`, or `process.hrtime.bigint()` for sub-millisecond measurement
- [ ] **Dead code elimination**: flag benchmark code where the computed result is not consumed (not returned, not passed to Blackhole, not assigned to a volatile field) -- the JIT may eliminate the entire computation
- [ ] **Single iteration measurement**: flag benchmarks that run the measured code once and report the result -- a single run includes JIT compilation time, class loading, and GC pauses; use statistical methods over many iterations

### Megamorphic Call Sites
<!-- activation: keywords=["interface", "abstract", "virtual", "dispatch", "polymorphic", "implements", "extends", "override", "vtable", "megamorphic", "bimorphic"] -->

- [ ] **Megamorphic dispatch in hot path**: flag interface method calls or virtual method calls in hot paths where >2 concrete implementations exist at runtime -- JIT compilers inline monomorphic (1 type) and bimorphic (2 types) calls but fall back to slow vtable dispatch for megamorphic sites
- [ ] **New subclass breaking inlining**: flag addition of a new subclass or interface implementation to a type used in a hot dispatch site that was previously monomorphic or bimorphic -- the JIT must deoptimize and recompile, and may not re-achieve the same performance
- [ ] **Strategy pattern with many strategies in hot path**: flag strategy or visitor patterns where the strategy interface has >2 implementations all dispatched through the same hot call site -- consider a switch on an enum or direct dispatch for the hot path

### JIT Deoptimization Triggers
<!-- activation: keywords=["exception", "throw", "catch", "try", "reflect", "invoke", "Method.invoke", "getattr", "eval", "dynamic", "proxy", "MethodHandle", "deoptimize", "uncommon", "trap"] -->

- [ ] **Exception as control flow**: flag exceptions used for non-exceptional control flow in hot paths (e.g., catching NumberFormatException to validate input, using StopIteration in non-generator code) -- exception creation captures a stack trace and triggers deoptimization of the containing method
- [ ] **Reflection in hot path**: flag `Method.invoke()`, `getattr()`, `eval()`, or dynamic proxy invocations in request-serving hot paths -- reflection bypasses JIT inlining and type specialization; extract to a direct call or use MethodHandle with constant lookup
- [ ] **Type check failure**: flag code patterns where a type guard (instanceof, type assertion) frequently fails in a hot path -- the JIT compiles an optimistic fast path; frequent failures trigger deoptimization and recompilation

### Method Size and Inlining
<!-- activation: keywords=["inline", "inlining", "method", "function", "size", "bytecode", "threshold", "hot", "FreqInlineSize", "MaxInlineSize"] -->

- [ ] **Method too large for inlining**: flag hot methods with >325 bytecodes (JVM default FreqInlineSize) or equivalent in other runtimes -- the JIT will not inline large methods even if they are hot; consider splitting into smaller methods with the hot path in a small method
- [ ] **Inlining prevented by call depth**: flag deep call chains in hot paths where each method is small enough to inline individually but the total depth exceeds the inlining budget -- the innermost methods lose inlining benefits

## Common False Positives

- **JMH with default configuration**: JMH defaults include warmup iterations. Only flag if @Warmup is explicitly set to 0 or the benchmark class uses manual timing instead of JMH annotations.
- **Intentionally polymorphic design**: some architectures (plugin systems, handler chains) are intentionally polymorphic and not on hot paths. Flag only when the call site is in a measured hot path.
- **Exception handling for truly exceptional cases**: catching IOException, TimeoutException, or other truly exceptional conditions is correct. Flag only when exceptions are used for expected control flow (input validation, iteration termination).
- **Compiled languages without JIT**: C, C++, Rust, and Go use AOT compilation; JIT warmup does not apply. This reviewer is primarily relevant to JVM, V8/Node.js, .NET, and other JIT-compiled runtimes.

## Severity Guidance

| Finding | Severity |
|---|---|
| Benchmark with no warmup measuring cold/interpreted performance | Critical |
| Dead code elimination making benchmark results meaningless | Critical |
| Megamorphic call site (>2 types) in measured hot path | Important |
| Reflection or dynamic proxy in request-serving hot path | Important |
| Exception used as control flow in tight loop | Important |
| New subclass breaking monomorphic inlining in hot dispatch | Important |
| Wrong timer resolution for microbenchmark (millis instead of nanos) | Minor |
| Method exceeding JIT inlining threshold in hot path | Minor |
| Single-iteration benchmark without statistical analysis | Minor |

## See Also

- `perf-profiling-discipline` -- profiling validates whether a call site is actually hot before worrying about JIT behavior
- `perf-aot-graalvm-mojo` -- AOT compilation eliminates JIT warmup but introduces different constraints
- `perf-big-o-analysis` -- algorithmic complexity matters more than JIT optimization for most code
- `antipattern-premature-optimization` -- optimizing for JIT behavior without profiling evidence is premature
- `perf-startup-cold-start` -- JIT warmup is a contributor to cold-start latency

## Authoritative References

- [Aleksey Shipilev, "JMH: Java Microbenchmark Harness" -- correct microbenchmarking methodology](https://openjdk.org/projects/code-tools/jmh/)
- [Cliff Click, "A Crash Course in Modern Hardware" -- how CPU and JIT interact for performance](https://www.infoq.com/presentations/click-crash-course-modern-hardware/)
- [V8 Blog, "Optimizing Prototypes" -- monomorphic, polymorphic, and megamorphic inline caches](https://v8.dev/blog/fast-properties)
- [Aleksey Shipilev, "JVM Anatomy Quarks" -- JIT compilation, deoptimization, and inlining behavior](https://shipilev.net/jvm/anatomy-quarks/)
