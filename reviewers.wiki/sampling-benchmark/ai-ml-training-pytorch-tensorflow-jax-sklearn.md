---
id: ai-ml-training-pytorch-tensorflow-jax-sklearn
type: primary
depth_role: leaf
focus: Detect GPU training without mixed precision, data loading bottlenecks, missing gradient clipping, absent learning rate schedules, overfitting from no validation split, and reproducibility issues from unseeded randomness
parents:
  - index.md
covers:
  - "Training on GPU without mixed precision (FP16/BF16)"
  - "Data loading bottleneck (no prefetch, insufficient workers)"
  - Missing gradient clipping causing training instability
  - "No learning rate schedule (constant LR throughout training)"
  - Overfitting due to no validation split or early stopping
  - Reproducibility issues from no seed set for random number generators
  - "Model not saved after training (checkpoint lost)"
  - Training loop without loss monitoring or logging
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
activation:
  file_globs:
    - "**/*train*"
    - "**/*model*"
    - "**/*fit*"
    - "**/*learn*"
  keyword_matches:
    - train
    - fit
    - DataLoader
    - Dataset
    - optimizer
    - loss
    - backward
    - gradient
    - epoch
    - batch
    - model.train
    - model.eval
    - torch
    - tensorflow
    - tf.
    - jax
    - sklearn
    - mixed_precision
    - autocast
    - GradScaler
    - learning_rate
    - lr_scheduler
  structural_signals:
    - training_loop
    - no_mixed_precision
    - no_validation_split
source:
  origin: file
  path: ai-ml-training-pytorch-tensorflow-jax-sklearn.md
  hash: "sha256:98b908452dc214d9d7dc5696413a38dc1e54a8e03aa08e3075578f426009af12"
---
# ML Training Discipline (PyTorch, TensorFlow, JAX, sklearn)

## When This Activates

Activates when diffs contain model training loops, optimizer configuration, data loading setup, or evaluation logic for ML models. Training code has a unique failure mode: bugs do not crash the program -- they silently degrade model quality, waste GPU hours, or produce irreproducible results. This reviewer catches the most common and costly training mistakes.

## Audit Surface

- [ ] GPU training without mixed precision
- [ ] DataLoader with num_workers=0 or no prefetch
- [ ] No gradient clipping configured
- [ ] Static learning rate with no scheduler
- [ ] No validation or test split
- [ ] No random seed set
- [ ] Training loop with no checkpoint saving
- [ ] No loss or metric logging
- [ ] model.eval() not called before validation
- [ ] Gradient accumulation not properly scaled

## Detailed Checks

### Mixed Precision and GPU Utilization
<!-- activation: keywords=["cuda", "gpu", "autocast", "GradScaler", "mixed_precision", "float16", "bfloat16", "fp16", "bf16", "amp"] -->

- [ ] **No mixed precision**: flag GPU training without mixed precision (PyTorch `torch.cuda.amp.autocast`, TensorFlow `tf.keras.mixed_precision.set_global_policy('mixed_float16')`, JAX `jnp.bfloat16`) -- mixed precision roughly doubles throughput and halves memory usage on modern GPUs with minimal accuracy impact
- [ ] **GradScaler missing with FP16**: flag PyTorch FP16 mixed precision without `GradScaler` -- FP16 underflow causes zero gradients without loss scaling. BF16 does not need GradScaler
- [ ] **model.eval() not called for validation**: flag validation or inference loops where `model.eval()` is not called before and `model.train()` not restored after -- dropout and batch normalization behave differently in train vs eval mode

### Data Loading Performance
<!-- activation: keywords=["DataLoader", "num_workers", "prefetch", "pin_memory", "batch_size", "Dataset", "tf.data", "data.map", "data.prefetch"] -->

- [ ] **No parallel data loading**: flag `DataLoader(num_workers=0)` or absent `num_workers` parameter with GPU training -- data loading on the main process creates a GPU idle bottleneck; set num_workers to 2-4x CPU cores
- [ ] **No prefetching**: flag TensorFlow `tf.data` pipelines without `.prefetch(tf.data.AUTOTUNE)` or PyTorch without `prefetch_factor` -- prefetching overlaps data preparation with GPU computation
- [ ] **pin_memory not set**: flag PyTorch DataLoader for GPU training without `pin_memory=True` -- pinned memory enables faster CPU-to-GPU transfer

### Gradient Management
<!-- activation: keywords=["gradient", "clip", "clip_grad_norm", "clip_grad_value", "clipnorm", "clipvalue", "accumulation", "backward", "zero_grad"] -->

- [ ] **No gradient clipping**: flag training loops without gradient clipping (`torch.nn.utils.clip_grad_norm_`, TensorFlow optimizer `clipnorm`/`clipvalue`) -- gradient explosion causes NaN losses and wasted training runs
- [ ] **Gradient accumulation not scaled**: flag gradient accumulation where the loss is not divided by the accumulation steps -- unscaled accumulation produces effectively larger learning rates

### Learning Rate and Optimization
<!-- activation: keywords=["learning_rate", "lr", "scheduler", "StepLR", "CosineAnnealing", "WarmupDecay", "OneCycleLR", "ReduceLROnPlateau", "warmup"] -->

- [ ] **No learning rate schedule**: flag training with a constant learning rate and no scheduler (StepLR, CosineAnnealingLR, OneCycleLR, ReduceLROnPlateau) -- constant LR either converges too slowly or oscillates around the minimum
- [ ] **No warmup**: flag training with a large learning rate from step 0 with no warmup phase -- warmup prevents early instability, especially with Adam variants and large batch sizes

### Overfitting Prevention and Reproducibility
<!-- activation: keywords=["validation", "val", "test", "split", "train_test_split", "seed", "manual_seed", "random", "reproducib", "early_stopping", "checkpoint", "save"] -->

- [ ] **No validation split**: flag training that uses the full dataset with no validation or test split -- without validation, there is no way to detect overfitting or compare model versions
- [ ] **No early stopping**: flag training for a fixed number of epochs with no early stopping based on validation metrics -- the model may start overfitting long before training completes
- [ ] **No random seed**: flag training code that does not set seeds for all random sources (`torch.manual_seed`, `np.random.seed`, `random.seed`, `tf.random.set_seed`, `PYTHONHASHSEED`) -- unseeded training is not reproducible
- [ ] **No checkpoint saving**: flag training loops that do not save model checkpoints -- if training crashes or is interrupted, all progress is lost

### Logging and Monitoring
<!-- activation: keywords=["log", "print", "wandb", "mlflow", "tensorboard", "loss", "metric", "monitor", "nan", "inf"] -->

- [ ] **No loss monitoring**: flag training loops that do not log loss values at each step or epoch -- without monitoring, you cannot detect divergence, NaN losses, or training stalls until the run completes
- [ ] **No NaN/Inf detection**: flag training loops that do not check for NaN or Inf in the loss -- NaN losses indicate numerical instability but training continues wasting GPU hours on garbage gradients
- [ ] **Metrics not logged to tracking system**: flag training metrics printed to console but not logged to MLflow, W&B, or TensorBoard -- see `ai-ml-experiment-tracking-mlflow-wandb` for tracking discipline

## Common False Positives

- **Quick experiments and hyperparameter search**: fast iteration experiments may intentionally skip mixed precision, schedulers, or extensive validation. Flag with a note for non-production training scripts.
- **sklearn on small datasets**: sklearn models trained on small tabular datasets do not need mixed precision, gradient clipping, or data loader optimization.
- **Inference-only code**: code that loads a pre-trained model for inference does not need training-specific checks. Verify the code is actually training.

## Severity Guidance

| Finding | Severity |
|---|---|
| No validation split (overfitting undetectable) | Critical |
| No checkpoint saving during long training runs | Important |
| No gradient clipping | Important |
| GPU training without mixed precision | Minor |
| No learning rate schedule | Minor |
| DataLoader with num_workers=0 on GPU | Minor |
| No random seed for reproducibility | Minor |

## See Also

- `ai-ml-gpu-cuda-pitfalls` -- GPU-specific performance issues beyond mixed precision
- `ai-ml-experiment-tracking-mlflow-wandb` -- training metrics should be tracked in experiment systems
- `ai-ml-distributed-training-ddp-fsdp-deepspeed` -- distributed training adds gradient sync complexity
- `perf-memory-gc` -- memory leaks in training loops accumulate over epochs

## Authoritative References

- [PyTorch, "Automatic Mixed Precision"](https://pytorch.org/docs/stable/amp.html)
- [TensorFlow, "Mixed Precision Training"](https://www.tensorflow.org/guide/mixed_precision)
- [PyTorch, "Performance Tuning Guide"](https://pytorch.org/tutorials/recipes/recipes/tuning_guide.html)
- [Andrej Karpathy, "A Recipe for Training Neural Networks"](https://karpathy.github.io/2019/04/25/recipe/)
