---
id: snapshot-build
type: index
depth_role: subcategory
depth: 2
focus: Build environment not isolated or ephemeral; Build parameters not captured in provenance; FROM targets not pinned to digest; Golden files not version-controlled or stored outside the repository
parents:
  - "../index.md"
shared_covers: []
entries:
  - id: ai-ml-experiment-tracking-mlflow-wandb
    file: ai-ml-experiment-tracking-mlflow-wandb.md
    type: primary
    focus: Detect experiments not logged, hyperparameters not tracked, model artifacts not versioned, missing comparison between runs, and absent model registry usage
    tags:
      - experiment-tracking
      - MLflow
      - "W&B"
      - Weights-and-Biases
      - TensorBoard
      - model-registry
      - reproducibility
      - MLOps
  - id: build-earthly
    file: build-earthly.md
    type: primary
    focus: Detect Earthly misconfigurations including missing --push flag, secrets in Earthfile, large build contexts, missing cache mounts, and non-reproducible RUN commands
    tags:
      - earthly
      - earthfile
      - containerized-builds
      - cache
      - secrets
      - reproducibility
      - push
      - ci
  - id: build-reproducibility-slsa-sigstore
    file: build-reproducibility-slsa-sigstore.md
    type: primary
    focus: Detect non-reproducible build patterns, missing provenance attestation, absent SLSA compliance measures, unsigned artifacts, and missing build attestation
    tags:
      - reproducibility
      - slsa
      - sigstore
      - cosign
      - provenance
      - attestation
      - signing
      - in-toto
      - supply-chain
      - build-integrity
  - id: test-snapshot-and-golden-file
    file: test-snapshot-and-golden-file.md
    type: primary
    focus: Detect oversized snapshots, unreviewed snapshot updates, non-deterministic snapshot content, and golden file management issues
    tags:
      - snapshot-testing
      - golden-file
      - jest-snapshot
      - inline-snapshot
      - approval-testing
      - determinism
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Snapshot Build

**Focus:** Build environment not isolated or ephemeral; Build parameters not captured in provenance; FROM targets not pinned to digest; Golden files not version-controlled or stored outside the repository

## Children

| File | Type | Focus |
|------|------|-------|
| [ai-ml-experiment-tracking-mlflow-wandb.md](ai-ml-experiment-tracking-mlflow-wandb.md) | 📄 primary | Detect experiments not logged, hyperparameters not tracked, model artifacts not versioned, missing comparison between runs, and absent model registry usage |
| [build-earthly.md](build-earthly.md) | 📄 primary | Detect Earthly misconfigurations including missing --push flag, secrets in Earthfile, large build contexts, missing cache mounts, and non-reproducible RUN commands |
| [build-reproducibility-slsa-sigstore.md](build-reproducibility-slsa-sigstore.md) | 📄 primary | Detect non-reproducible build patterns, missing provenance attestation, absent SLSA compliance measures, unsigned artifacts, and missing build attestation |
| [test-snapshot-and-golden-file.md](test-snapshot-and-golden-file.md) | 📄 primary | Detect oversized snapshots, unreviewed snapshot updates, non-deterministic snapshot content, and golden file management issues |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
