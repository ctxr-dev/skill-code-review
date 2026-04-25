---
id: ai-ml-distributed-training-ddp-fsdp-deepspeed
type: primary
depth_role: leaf
focus: Detect gradient synchronization bugs, uneven data distribution, missing checkpoint saving, FSDP shard configuration mismatches, NCCL timeouts, and DeepSpeed ZeRO stage mischoice
parents:
  - index.md
covers:
  - "Gradient synchronization bugs in DDP (unsynchronized parameters, unused params)"
  - "Uneven data distribution across workers (last batch imbalance)"
  - Missing distributed checkpoint saving or loading
  - "FSDP shard configuration mismatch (wrapping policy, mixed precision)"
  - NCCL timeout causing silent hangs
  - DeepSpeed ZeRO stage mischoice for model size
  - All-reduce on wrong process group
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
activation:
  file_globs:
    - "**/*train*"
    - "**/*distributed*"
    - "**/*ddp*"
    - "**/*fsdp*"
    - "**/*deepspeed*"
    - "**/*parallel*"
  keyword_matches:
    - DistributedDataParallel
    - DDP
    - FSDP
    - FullyShardedDataParallel
    - DeepSpeed
    - deepspeed
    - ZeRO
    - init_process_group
    - world_size
    - rank
    - local_rank
    - nccl
    - NCCL
    - all_reduce
    - broadcast
    - DistributedSampler
    - dist.
  structural_signals:
    - ddp_unused_params
    - missing_distributed_sampler
    - checkpoint_all_ranks
source:
  origin: file
  path: ai-ml-distributed-training-ddp-fsdp-deepspeed.md
  hash: "sha256:6e94a30770f9bb7ca80e2070b4904b28d84c6b586028d49fb403d21705e5118b"
---
# Distributed Training (DDP, FSDP, DeepSpeed)

## When This Activates

Activates when diffs contain PyTorch DistributedDataParallel (DDP), FullyShardedDataParallel (FSDP), DeepSpeed configuration, or multi-GPU/multi-node training logic. Distributed training multiplies the complexity of every training operation -- gradient synchronization must be exact, data must be evenly distributed, checkpoints must be saved correctly across shards, and a single misconfigured NCCL timeout can hang a cluster. Bugs are subtle: training completes but produces a worse model because gradients were averaged incorrectly.

## Audit Surface

- [ ] DDP with find_unused_parameters=True as permanent workaround
- [ ] DataLoader without DistributedSampler
- [ ] Checkpoint saved on all ranks (DDP) or without proper FSDP state dict
- [ ] FSDP wrapping policy mismatched with model architecture
- [ ] NCCL timeout not configured
- [ ] DeepSpeed ZeRO stage not matched to model/memory requirements
- [ ] Missing barrier before checkpoint load
- [ ] Mixed precision config inconsistent between FSDP and model
- [ ] Learning rate not scaled for effective batch size
- [ ] Logging on all ranks instead of rank 0 only

## Detailed Checks

### DDP Gradient Synchronization
<!-- activation: keywords=["DistributedDataParallel", "DDP", "find_unused_parameters", "gradient", "sync", "all_reduce", "backward", "no_sync"] -->

- [ ] **find_unused_parameters as permanent fix**: flag `DDP(model, find_unused_parameters=True)` without a comment explaining why -- this flag adds overhead to every backward pass; it should be a temporary workaround while fixing the model to use all parameters in every forward pass
- [ ] **Unused parameter not handled**: flag DDP models where some parameters are not used in every forward pass without either `find_unused_parameters=True` or explicit gradient zeroing -- DDP hangs during all-reduce waiting for gradients that never arrive
- [ ] **Gradient accumulation without no_sync**: flag gradient accumulation steps that do not use `model.no_sync()` context manager for intermediate steps -- without no_sync, DDP synchronizes gradients on every backward() call, negating the benefit of accumulation

### Data Distribution
<!-- activation: keywords=["DistributedSampler", "Sampler", "DataLoader", "batch_size", "drop_last", "world_size", "rank"] -->

- [ ] **Missing DistributedSampler**: flag DataLoader in multi-GPU training without `DistributedSampler` -- without it, every GPU processes the same data, effectively training with duplicated batches and incorrect gradient averaging
- [ ] **drop_last not set**: flag DistributedSampler DataLoader without `drop_last=True` -- the last batch may be smaller on some ranks, causing a size mismatch during all-reduce and a hang
- [ ] **Learning rate not scaled**: flag multi-GPU training where the learning rate is not scaled by the number of GPUs (linear scaling rule) -- effective batch size increases linearly with GPU count; the learning rate should increase proportionally (or use warmup)

### Checkpoint Management
<!-- activation: keywords=["checkpoint", "save", "load", "state_dict", "save_pretrained", "rank", "barrier", "full_state_dict", "sharded_state_dict"] -->

- [ ] **Checkpoint on all ranks (DDP)**: flag `torch.save(model.state_dict())` executed on all ranks without a `if rank == 0:` guard -- in DDP, all ranks have identical parameters; saving on every rank wastes storage and may cause file corruption from concurrent writes
- [ ] **FSDP checkpoint without proper state dict**: flag FSDP model saving without using `FullStateDictConfig` or `ShardedStateDictConfig` -- direct state_dict() on FSDP returns only the local shard, not the full model
- [ ] **No barrier before load**: flag distributed checkpoint loading without `dist.barrier()` before rank 0 loads and broadcasts -- without a barrier, other ranks may proceed before the checkpoint is ready

### FSDP Configuration
<!-- activation: keywords=["FSDP", "FullyShardedDataParallel", "auto_wrap", "wrapping_policy", "MixedPrecision", "ShardingStrategy", "FULL_SHARD", "SHARD_GRAD_OP"] -->

- [ ] **Wrong wrapping policy**: flag FSDP auto-wrap policies that wrap too many small layers (creating excessive communication overhead) or too few large layers (not reducing memory enough) -- wrap at transformer block boundaries for transformer models
- [ ] **Mixed precision mismatch**: flag FSDP MixedPrecision config that specifies a precision (e.g., BF16) but the model's layers expect a different precision -- this causes dtype mismatch errors or silent precision loss
- [ ] **Wrong sharding strategy**: flag `FULL_SHARD` for models that fit in GPU memory with `SHARD_GRAD_OP` -- full sharding adds communication overhead; use it only when gradient+optimizer sharding alone is insufficient

### DeepSpeed ZeRO Configuration
<!-- activation: keywords=["DeepSpeed", "deepspeed", "ZeRO", "zero_optimization", "stage", "offload", "partition"] -->

- [ ] **ZeRO stage too high**: flag DeepSpeed ZeRO Stage 3 when the model fits with Stage 2 (optimizer + gradient partitioning) -- Stage 3 adds parameter partitioning overhead and slower forward/backward passes
- [ ] **ZeRO stage too low**: flag ZeRO Stage 1 for large models that OOM -- Stage 1 only partitions optimizer states; consider Stage 2 or 3 for larger memory savings
- [ ] **CPU offload without need**: flag ZeRO offload to CPU when GPU memory is sufficient -- CPU offload dramatically slows training and should be a last resort

### NCCL and Communication
<!-- activation: keywords=["NCCL", "nccl", "timeout", "NCCL_TIMEOUT", "init_process_group", "backend", "gloo", "rendezvous"] -->

- [ ] **NCCL timeout not set**: flag `init_process_group` without explicit timeout or `NCCL_TIMEOUT` environment variable -- default NCCL timeout (30 minutes) means a hang takes 30 minutes to detect; set a shorter timeout for faster failure detection
- [ ] **Logging on all ranks**: flag print statements, logging calls, or metrics reporting executed on all ranks instead of guarded with `if rank == 0:` -- multi-rank logging produces duplicated, interleaved output that is impossible to read

## Common False Positives

- **Single-GPU code with DDP wrapper**: some teams wrap single-GPU code in DDP for compatibility. The overhead is minimal and the code is correct; do not flag unless performance is critical.
- **Research prototypes**: distributed training research may intentionally use non-standard configurations. Flag with a note for research directories.
- **Framework-managed distribution**: HuggingFace Trainer, PyTorch Lightning, and similar frameworks manage DDP/FSDP internally. Verify that the framework is not already handling the flagged concern.

## Severity Guidance

| Finding | Severity |
|---|---|
| Missing DistributedSampler (training on duplicate data) | Critical |
| FSDP checkpoint saved as local shard only | Critical |
| Gradient accumulation without no_sync in DDP | Important |
| find_unused_parameters=True as permanent workaround | Important |
| NCCL timeout not configured | Important |
| Learning rate not scaled for multi-GPU effective batch size | Important |
| Logging on all ranks | Minor |
| DeepSpeed ZeRO stage suboptimal for model size | Minor |

## See Also

- `ai-ml-training-pytorch-tensorflow-jax-sklearn` -- single-GPU training discipline
- `ai-ml-gpu-cuda-pitfalls` -- GPU memory and transfer issues amplified in multi-GPU
- `ai-ml-experiment-tracking-mlflow-wandb` -- distributed experiments need coordinated tracking
- `reliability-timeout-deadline-propagation` -- NCCL timeouts are deadline propagation

## Authoritative References

- [PyTorch, "Distributed Data Parallel"](https://pytorch.org/docs/stable/generated/torch.nn.parallel.DistributedDataParallel.html)
- [PyTorch, "FSDP Tutorial"](https://pytorch.org/tutorials/intermediate/FSDP_tutorial.html)
- [DeepSpeed Documentation](https://www.deepspeed.ai/docs/)
- [HuggingFace, "Efficient Training on Multiple GPUs"](https://huggingface.co/docs/transformers/en/perf_train_gpu_many)
