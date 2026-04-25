---
id: profiling-gpu
type: index
depth_role: subcategory
depth: 1
focus: "All-reduce on wrong process group; Array-of-structs layout causing cache misses in column-oriented access; Benchmark measuring cold JIT performance instead of steady-state; Benchmark not representative of production workload (wrong data size, wrong distribution)"
parents:
  - "../index.md"
shared_covers: []
entries:
  - id: ai-ml-distributed-training-ddp-fsdp-deepspeed
    file: ai-ml-distributed-training-ddp-fsdp-deepspeed.md
    type: primary
    focus: Detect gradient synchronization bugs, uneven data distribution, missing checkpoint saving, FSDP shard configuration mismatches, NCCL timeouts, and DeepSpeed ZeRO stage mischoice
    tags:
      - distributed-training
      - DDP
      - FSDP
      - DeepSpeed
      - ZeRO
      - NCCL
      - gradient-sync
      - checkpoint
      - multi-GPU
  - id: ai-ml-gpu-cuda-pitfalls
    file: ai-ml-gpu-cuda-pitfalls.md
    type: primary
    focus: Detect CPU-GPU transfer in hot loops, missing CUDA stream synchronization, OOM without gradient checkpointing, kernel launch overhead, and pinned memory not used for data transfer
    tags:
      - GPU
      - CUDA
      - memory-transfer
      - stream
      - kernel-launch
      - gradient-checkpointing
      - pinned-memory
      - OOM
  - id: embedded-firmware-rtos
    file: embedded-firmware-rtos.md
    type: primary
    focus: "Detect embedded / RTOS hazards -- ISR misuse, watchdog omissions, stack sizing, priority inversion, DMA memory placement, missing volatile, and MMIO / memory-barrier bugs"
    tags:
      - embedded
      - firmware
      - rtos
      - freertos
      - zephyr
      - mcu
      - bare-metal
      - isr
      - dma
      - watchdog
      - cortex
  - id: graphics-shaders-webgl-webgpu
    file: graphics-shaders-webgl-webgpu.md
    type: primary
    focus: Detect GPU hazards in shaders and graphics pipelines -- warp divergence, CPU-GPU sync stalls, missing precision, unfiltered textures, and undiagnosed errors in WebGL and WebGPU code
    tags:
      - graphics
      - shaders
      - webgl
      - webgpu
      - glsl
      - wgsl
      - hlsl
      - gpu
      - rendering
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
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Profiling Gpu

**Focus:** All-reduce on wrong process group; Array-of-structs layout causing cache misses in column-oriented access; Benchmark measuring cold JIT performance instead of steady-state; Benchmark not representative of production workload (wrong data size, wrong distribution)

## Children

| File | Type | Focus |
|------|------|-------|
| [ai-ml-distributed-training-ddp-fsdp-deepspeed.md](ai-ml-distributed-training-ddp-fsdp-deepspeed.md) | 📄 primary | Detect gradient synchronization bugs, uneven data distribution, missing checkpoint saving, FSDP shard configuration mismatches, NCCL timeouts, and DeepSpeed ZeRO stage mischoice |
| [ai-ml-gpu-cuda-pitfalls.md](ai-ml-gpu-cuda-pitfalls.md) | 📄 primary | Detect CPU-GPU transfer in hot loops, missing CUDA stream synchronization, OOM without gradient checkpointing, kernel launch overhead, and pinned memory not used for data transfer |
| [embedded-firmware-rtos.md](embedded-firmware-rtos.md) | 📄 primary | Detect embedded / RTOS hazards -- ISR misuse, watchdog omissions, stack sizing, priority inversion, DMA memory placement, missing volatile, and MMIO / memory-barrier bugs |
| [graphics-shaders-webgl-webgpu.md](graphics-shaders-webgl-webgpu.md) | 📄 primary | Detect GPU hazards in shaders and graphics pipelines -- warp divergence, CPU-GPU sync stalls, missing precision, unfiltered textures, and undiagnosed errors in WebGL and WebGPU code |
| [perf-big-o-analysis.md](perf-big-o-analysis.md) | 📄 primary | Detect O(n^2) or worse algorithmic complexity in hot paths where a more efficient algorithm or data structure exists |
| [perf-cache-locality-false-sharing.md](perf-cache-locality-false-sharing.md) | 📄 primary | Detect false sharing on CPU cache lines in concurrent code, poor data layout for cache locality, and random access patterns on large datasets |
| [perf-jit-warmup.md](perf-jit-warmup.md) | 📄 primary | Detect benchmarking before JIT warmup, JIT deoptimization triggers, megamorphic call sites, and class hierarchy changes that invalidate compiled code |
| [perf-memory-gc.md](perf-memory-gc.md) | 📄 primary | Detect memory leaks, excessive GC pressure, large object heap issues, and finalizer abuse in managed-runtime and reference-counted environments |
| [perf-profiling-discipline.md](perf-profiling-discipline.md) | 📄 primary | Detect optimization without profiling evidence, microbenchmarks measuring the wrong thing, profiler overhead distorting results, and missing flamegraph analysis |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
