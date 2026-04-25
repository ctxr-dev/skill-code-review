---
id: ai-ml-gpu-cuda-pitfalls
type: primary
depth_role: leaf
focus: Detect CPU-GPU transfer in hot loops, missing CUDA stream synchronization, OOM without gradient checkpointing, kernel launch overhead, and pinned memory not used for data transfer
parents:
  - index.md
covers:
  - "CPU-GPU data transfer in hot loop (training step, inference loop)"
  - Missing CUDA stream synchronization before using results
  - OOM errors addressable with gradient checkpointing
  - Excessive kernel launch overhead from many small operations
  - Pinned memory not used for host-to-device transfer
  - "GPU memory not freed after inference (no torch.no_grad or cache clearing)"
  - Synchronous operations blocking GPU pipeline
tags:
  - GPU
  - CUDA
  - memory-transfer
  - stream
  - kernel-launch
  - gradient-checkpointing
  - pinned-memory
  - OOM
activation:
  file_globs:
    - "**/*train*"
    - "**/*model*"
    - "**/*cuda*"
    - "**/*gpu*"
    - "**/*inference*"
  keyword_matches:
    - cuda
    - CUDA
    - gpu
    - GPU
    - ".to("
    - ".cuda()"
    - device
    - torch.device
    - pin_memory
    - stream
    - synchronize
    - no_grad
    - gradient_checkpointing
    - empty_cache
    - memory_allocated
    - nvtx
    - kernel
  structural_signals:
    - cpu_gpu_transfer_in_loop
    - missing_stream_sync
    - no_gradient_checkpointing
source:
  origin: file
  path: ai-ml-gpu-cuda-pitfalls.md
  hash: "sha256:224c493d51989f1f12871ecbf1613fdb95d38013c145ecaa6e63276090e6a781"
---
# GPU and CUDA Pitfalls

## When This Activates

Activates when diffs contain GPU device management, CUDA operations, GPU memory management, or training/inference loops targeting GPU hardware. GPU programming has a different performance model than CPU -- the dominant costs are data transfer between CPU and GPU, synchronization points that stall the GPU pipeline, and memory management that determines whether training is possible at all. This reviewer catches patterns that waste GPU compute or cause OOM failures.

## Audit Surface

- [ ] .to('cuda') or .cuda() inside training/inference loop
- [ ] Tensor created on CPU and transferred per batch
- [ ] CUDA stream operations without synchronization
- [ ] Large model OOM without gradient checkpointing
- [ ] DataLoader without pin_memory=True
- [ ] Many small kernel launches instead of fused ops
- [ ] No torch.no_grad() for inference
- [ ] torch.cuda.empty_cache() in training loop
- [ ] GPU memory not monitored
- [ ] Mixed CPU/GPU tensors causing implicit transfer

## Detailed Checks

### CPU-GPU Data Transfer
<!-- activation: keywords=[".to(", ".cuda()", "cpu()", "pin_memory", "non_blocking", "device", "transfer", "copy_", "memcpy"] -->

- [ ] **Transfer in hot loop**: flag `.to('cuda')`, `.to(device)`, or `.cuda()` called inside a training step or inference loop on data that could be pre-allocated or transferred once -- each transfer adds PCIe latency (5-15 microseconds) and blocks both CPU and GPU
- [ ] **No pinned memory**: flag DataLoader for GPU training without `pin_memory=True` -- pinned (page-locked) memory enables asynchronous CPU-to-GPU transfer, overlapping transfer with computation
- [ ] **Synchronous transfer without non_blocking**: flag `.to(device)` without `non_blocking=True` when using pinned memory -- synchronous transfer blocks the CPU until the copy completes; non-blocking allows overlap
- [ ] **Mixed CPU/GPU tensors**: flag operations that mix CPU and GPU tensors (e.g., `gpu_tensor + cpu_tensor`) -- PyTorch silently transfers the CPU tensor to GPU per-operation, causing hidden transfer overhead

### CUDA Streams and Synchronization
<!-- activation: keywords=["stream", "Stream", "synchronize", "current_stream", "wait_stream", "record", "event", "Event"] -->

- [ ] **Missing synchronization**: flag multi-stream CUDA code where results from a non-default stream are consumed without `stream.synchronize()` or event-based waiting -- the result may not be ready, producing garbage data
- [ ] **Unnecessary synchronization**: flag `torch.cuda.synchronize()` called in a training loop for debugging purposes left in production code -- full synchronization stalls the GPU pipeline and destroys overlap benefits
- [ ] **No stream for async operations**: flag code that could benefit from overlapping compute and transfer but uses only the default stream -- use separate streams for data transfer and computation to maximize throughput

### GPU Memory Management
<!-- activation: keywords=["OOM", "out of memory", "gradient_checkpointing", "checkpoint", "empty_cache", "memory_allocated", "max_memory", "reserved", "memory"] -->

- [ ] **No gradient checkpointing for large models**: flag training of large models that OOM without enabling gradient checkpointing (`model.gradient_checkpointing_enable()` in HuggingFace, `torch.utils.checkpoint.checkpoint` in PyTorch) -- gradient checkpointing trades compute for memory by recomputing activations during backward pass
- [ ] **empty_cache in training loop**: flag `torch.cuda.empty_cache()` called inside the training loop -- this is a symptom of a memory leak, not a fix; find and fix the leak instead
- [ ] **No torch.no_grad for inference**: flag inference code without `with torch.no_grad():` context -- without no_grad, PyTorch stores activations for backpropagation, doubling memory usage during inference
- [ ] **Tensors not deleted**: flag intermediate tensors in training that are no longer needed but not deleted or allowed to go out of scope -- accumulated dead tensors cause OOM on later iterations

### Kernel Launch Overhead
<!-- activation: keywords=["kernel", "launch", "fuse", "compile", "torch.compile", "triton", "jit", "script", "trace", "small", "operation"] -->

- [ ] **Many small operations**: flag sequences of small element-wise operations that could be fused into a single kernel -- each kernel launch has ~5-10 microsecond overhead; hundreds of small kernels per step add up to significant overhead
- [ ] **torch.compile not used**: flag performance-critical PyTorch code (custom layers, loss functions) that does not use `torch.compile()` (PyTorch 2.0+) -- torch.compile fuses operations and reduces kernel launch overhead
- [ ] **Python-level loop over GPU operations**: flag Python for-loops performing individual GPU operations per iteration -- batch the operations into a single tensor operation or use torch.vmap

### Memory Monitoring and Debugging
<!-- activation: keywords=["nvidia-smi", "memory_allocated", "memory_reserved", "max_memory", "memory_summary", "profiler", "nvtx", "trace"] -->

- [ ] **No GPU memory monitoring**: flag long training or inference jobs with no GPU memory usage logging (`torch.cuda.memory_allocated()`, `torch.cuda.max_memory_allocated()`, or nvidia-smi) -- memory issues are invisible without monitoring
- [ ] **No profiling for performance-critical code**: flag custom CUDA operations or complex training loops with no profiling (PyTorch Profiler, NVIDIA Nsight, nvtx markers) -- profiling reveals bottlenecks that are invisible to code inspection
- [ ] **Memory leak in inference loop**: flag inference loops where `torch.cuda.memory_allocated()` grows monotonically across iterations -- this indicates tensors being retained across iterations, leading to eventual OOM

## Common False Positives

- **One-time setup transfers**: `.to('cuda')` called once during model initialization (not in a loop) is the correct pattern. Do not flag model.to(device) outside of training/inference loops.
- **Debugging synchronization**: `torch.cuda.synchronize()` used intentionally for profiling or debugging is acceptable if clearly marked as debug-only code.
- **Small models**: gradient checkpointing is unnecessary for models that fit comfortably in GPU memory. Do not flag for small models.

## Severity Guidance

| Finding | Severity |
|---|---|
| CPU-GPU transfer inside hot training loop | Important |
| Missing torch.no_grad() for inference | Important |
| Large model OOM without gradient checkpointing | Important |
| Mixed CPU/GPU tensors causing implicit transfer | Important |
| DataLoader without pin_memory for GPU training | Minor |
| torch.cuda.empty_cache() in training loop | Minor |
| torch.compile not used for custom operations | Minor |

## See Also

- `ai-ml-training-pytorch-tensorflow-jax-sklearn` -- training loop discipline including mixed precision
- `ai-ml-distributed-training-ddp-fsdp-deepspeed` -- multi-GPU adds stream and sync complexity
- `perf-memory-gc` -- GPU memory leaks are analogous to CPU memory leaks

## Authoritative References

- [PyTorch, "CUDA Semantics"](https://pytorch.org/docs/stable/notes/cuda.html)
- [NVIDIA, "CUDA C++ Best Practices Guide"](https://docs.nvidia.com/cuda/cuda-c-best-practices-guide/)
- [PyTorch, "Performance Tuning Guide"](https://pytorch.org/tutorials/recipes/recipes/tuning_guide.html)
- [PyTorch, "Gradient Checkpointing"](https://pytorch.org/docs/stable/checkpoint.html)
