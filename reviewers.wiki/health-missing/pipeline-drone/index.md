---
id: pipeline-drone
type: index
depth_role: subcategory
depth: 2
focus: Actions referenced by mutable tag instead of full SHA pin; Agent label too broad -- any available node; Agent pool without capability matching for job requirements; Approval gate missing on production deployment stage
parents:
  - "../index.md"
shared_covers: []
entries:
  - id: ai-ml-orchestration-airflow-prefect-dagster-kubeflow
    file: ai-ml-orchestration-airflow-prefect-dagster-kubeflow.md
    type: primary
    focus: Detect DAG import side effects, oversized tasks, missing retries on transient failures, hardcoded connections, and absent failure alerting in ML pipeline orchestrators
    tags:
      - orchestration
      - Airflow
      - Prefect
      - Dagster
      - Kubeflow
      - DAG
      - pipeline
      - retry
      - idempotency
      - alerting
  - id: cicd-buildkite-drone-tekton
    file: cicd-buildkite-drone-tekton.md
    type: primary
    focus: Detect Buildkite, Drone, and Tekton pipeline security and reliability issues including unpinned plugins, secrets in config, missing timeouts, and insufficient step isolation
    tags:
      - buildkite
      - drone
      - tekton
      - ci-cd
      - pipeline
      - plugins
      - secrets
      - timeout
      - CWE-829
      - CWE-798
  - id: cicd-github-actions
    file: cicd-github-actions.md
    type: primary
    focus: Detect GitHub Actions security and reliability issues including unpinned actions, secrets exposure, excessive permissions, pull_request_target dangers, and missing concurrency controls
    tags:
      - github-actions
      - ci-cd
      - workflow
      - supply-chain
      - secrets
      - permissions
      - CWE-829
      - CWE-798
  - id: cicd-jenkins
    file: cicd-jenkins.md
    type: primary
    focus: Detect Jenkins pipeline security and reliability issues including script blocks in declarative pipelines, credentials in pipeline code, unpinned shared libraries, overly broad agent labels, missing timeouts, and missing retry on flaky stages
    tags:
      - jenkins
      - ci-cd
      - pipeline
      - jenkinsfile
      - groovy
      - credentials
      - shared-library
      - CWE-798
      - CWE-269
      - azure-devops
      - service-connection
      - variable-group
      - approval-gate
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Pipeline Drone

**Focus:** Actions referenced by mutable tag instead of full SHA pin; Agent label too broad -- any available node; Agent pool without capability matching for job requirements; Approval gate missing on production deployment stage

## Children

| File | Type | Focus |
|------|------|-------|
| [ai-ml-orchestration-airflow-prefect-dagster-kubeflow.md](ai-ml-orchestration-airflow-prefect-dagster-kubeflow.md) | 📄 primary | Detect DAG import side effects, oversized tasks, missing retries on transient failures, hardcoded connections, and absent failure alerting in ML pipeline orchestrators |
| [cicd-buildkite-drone-tekton.md](cicd-buildkite-drone-tekton.md) | 📄 primary | Detect Buildkite, Drone, and Tekton pipeline security and reliability issues including unpinned plugins, secrets in config, missing timeouts, and insufficient step isolation |
| [cicd-github-actions.md](cicd-github-actions.md) | 📄 primary | Detect GitHub Actions security and reliability issues including unpinned actions, secrets exposure, excessive permissions, pull_request_target dangers, and missing concurrency controls |
| [cicd-jenkins.md](cicd-jenkins.md) | 📄 primary | Detect Jenkins pipeline security and reliability issues including script blocks in declarative pipelines, credentials in pipeline code, unpinned shared libraries, overly broad agent labels, missing timeouts, and missing retry on flaky stages |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
