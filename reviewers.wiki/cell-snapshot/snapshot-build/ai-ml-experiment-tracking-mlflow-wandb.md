---
id: ai-ml-experiment-tracking-mlflow-wandb
type: primary
depth_role: leaf
focus: Detect experiments not logged, hyperparameters not tracked, model artifacts not versioned, missing comparison between runs, and absent model registry usage
parents:
  - index.md
covers:
  - Training experiments not logged to any tracking system
  - Hyperparameters not recorded alongside metrics
  - "Model artifacts not versioned (weights, config, tokenizer)"
  - No comparison between experiment runs
  - Missing model registry for production model management
  - Metrics logged but not visualized or alerted on
  - No link between experiment and training data version
tags:
  - experiment-tracking
  - MLflow
  - "W&B"
  - Weights-and-Biases
  - TensorBoard
  - model-registry
  - reproducibility
  - MLOps
activation:
  file_globs:
    - "**/*train*"
    - "**/*experiment*"
    - "**/*mlflow*"
    - "**/*wandb*"
    - "**/*track*"
  keyword_matches:
    - mlflow
    - wandb
    - tensorboard
    - experiment
    - log_metric
    - log_param
    - log_artifact
    - log_model
    - run
    - init
    - start_run
    - SummaryWriter
    - tracker
    - registry
  structural_signals:
    - training_without_tracking
    - no_hyperparameter_logging
    - no_model_registry
source:
  origin: file
  path: ai-ml-experiment-tracking-mlflow-wandb.md
  hash: "sha256:e9ac0ed4b4902f047ad6406e224ce1f916145037877feeed62d2f3c96a4aac83"
---
# Experiment Tracking (MLflow, W&B)

## When This Activates

Activates when diffs contain model training code, hyperparameter configuration, model saving/loading, or experiment management. Without experiment tracking, ML development is flying blind -- you cannot compare runs, reproduce results, or trace a production model back to its training configuration. This reviewer ensures every experiment is logged, versioned, and comparable.

## Audit Surface

- [ ] Training script with no tracking system calls
- [ ] Training loop with no hyperparameter logging
- [ ] Model saved without artifact versioning
- [ ] No metric comparison between runs
- [ ] No model registry for production promotion
- [ ] Training data version not recorded
- [ ] Experiment with no tags or description
- [ ] Metrics only in stdout (not tracked)
- [ ] No reproducibility metadata (git hash, deps)
- [ ] Model deployed without experiment link

## Detailed Checks

### Experiment Logging
<!-- activation: keywords=["train", "fit", "epoch", "batch", "loss", "metric", "accuracy", "log", "track", "record"] -->

- [ ] **No experiment tracking**: flag training scripts that do not call any experiment tracking API (MLflow `mlflow.log_metric`, W&B `wandb.log`, TensorBoard `SummaryWriter.add_scalar`) -- training without tracking produces unreproducible, uncomparable results
- [ ] **Metrics only in stdout**: flag training code that prints metrics to console but does not log them to a tracking system -- stdout metrics are lost when the terminal closes and cannot be compared across runs
- [ ] **No hyperparameter logging**: flag training runs that log metrics but not hyperparameters (learning rate, batch size, model architecture, regularization) -- without hyperparameters, you cannot understand why one run outperformed another
- [ ] **Metrics logged at wrong granularity**: flag training loops that log metrics only at epoch level when step-level logging is needed for debugging (loss spikes, gradient anomalies), or conversely log every step when only epoch summaries are useful (generating millions of data points)

### Artifact and Model Versioning
<!-- activation: keywords=["save", "save_model", "log_model", "log_artifact", "checkpoint", "artifact", "model_path", "weights", "registry"] -->

- [ ] **Model saved without versioning**: flag `model.save()`, `torch.save()`, or equivalent that writes to a local path with no artifact tracking (MLflow `log_model`, W&B `log_artifact`) -- unversioned model files are overwritten, lost, and untraceable
- [ ] **No model registry**: flag production model deployment with no model registry (MLflow Model Registry, W&B Model Registry, SageMaker) -- a registry provides staging/production promotion, version rollback, and audit trail
- [ ] **No data version recorded**: flag experiment runs that do not record the training data version or hash -- a model's performance is inseparable from its training data; changing data without tracking invalidates comparisons
- [ ] **Configuration not saved with model**: flag model artifacts saved without the associated configuration (model architecture, preprocessing parameters, tokenizer config) -- the model weights alone are insufficient to reproduce inference
- [ ] **No dependency snapshot**: flag experiment artifacts that do not include a requirements.txt, conda environment export, or equivalent dependency snapshot -- library version differences silently change model behavior

### Run Comparison and Reproducibility
<!-- activation: keywords=["compare", "baseline", "best", "previous", "reproduce", "git", "commit", "environment", "dependencies", "seed"] -->

- [ ] **No baseline comparison**: flag experiment runs with no comparison to a baseline or previous best -- without comparison, you cannot determine if a change improved or degraded performance
- [ ] **No reproducibility metadata**: flag experiments that do not record git commit hash, dependency versions, or random seeds -- these are required to reproduce results
- [ ] **No experiment description**: flag experiment runs with no tags, description, or notes -- undocumented runs become incomprehensible within weeks
- [ ] **Run not linked to code version**: flag experiment tracking that does not record the git commit or code revision that produced the run -- without this link, you cannot inspect the exact code that generated a result

### Production Model Lifecycle
<!-- activation: keywords=["deploy", "production", "staging", "promote", "registry", "serve", "inference", "rollback"] -->

- [ ] **Model deployed without registry entry**: flag production model deployments that bypass the model registry -- the registry is the single source of truth for which model version is in production
- [ ] **No rollback capability**: flag model promotion to production with no documented rollback procedure or previous version retained -- when a new model performs worse, instant rollback is essential
- [ ] **No model lineage**: flag production models that cannot be traced back to their training run, dataset version, and code commit -- lineage is required for debugging production issues and regulatory compliance

## Common False Positives

- **Quick local experiments**: rapid iteration in notebooks may skip formal experiment tracking. Flag with a note but do not treat as Critical for clearly exploratory work.
- **Automated hyperparameter search**: tools like Optuna or Ray Tune manage their own tracking. Verify that the hyperparameter search framework logs to a shared tracking system.
- **Inference-only code**: code that only loads and runs a model does not need experiment tracking. Verify the code is actually training.
- **Framework auto-logging**: MLflow's `mlflow.autolog()` and W&B's `wandb.init(config=...)` auto-capture many parameters. Verify auto-logging is enabled before flagging missing parameter logging.
- **Fine-tuning with fixed hyperparameters**: fine-tuning scripts that always use the same hyperparameters (e.g., standard LoRA config) may not need per-run hyperparameter logging. Still flag if the values could reasonably change.

## Severity Guidance

| Finding | Severity |
|---|---|
| Production model deployed without link to experiment run | Important |
| Training script with no experiment tracking | Important |
| Model saved without artifact versioning | Important |
| No hyperparameter logging alongside metrics | Minor |
| No reproducibility metadata (git hash, seeds) | Minor |
| No baseline comparison between runs | Minor |

## See Also

- `ai-ml-training-pytorch-tensorflow-jax-sklearn` -- training code that should be tracked
- `ai-ml-orchestration-airflow-prefect-dagster-kubeflow` -- orchestrators trigger training runs that should be tracked
- `ai-llm-eval-harness` -- LLM evaluation metrics should be tracked like training metrics

## Authoritative References

- [MLflow Documentation](https://mlflow.org/docs/latest/index.html)
- [Weights & Biases Documentation](https://docs.wandb.ai/)
- [TensorBoard Documentation](https://www.tensorflow.org/tensorboard)
- [Google, "Rules of Machine Learning: Best Practices for ML Engineering"](https://developers.google.com/machine-learning/guides/rules-of-ml)
- [Martin Fowler, "Continuous Delivery for Machine Learning"](https://martinfowler.com/articles/cd4ml.html)
