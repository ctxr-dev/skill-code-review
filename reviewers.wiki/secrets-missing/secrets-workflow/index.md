---
id: secrets-workflow
type: index
depth_role: subcategory
depth: 2
focus: .env files committed without .gitignore exclusion; Activity performing non-idempotent operation without idempotency key; Activity without retry policy or timeout configuration; Application targeting HEAD of default branch without revision pinning
parents:
  - "../index.md"
shared_covers: []
entries:
  - id: cicd-argo-workflows
    file: cicd-argo-workflows.md
    type: primary
    focus: Detect Argo Workflows security and reliability issues including missing RBAC on workflow templates, secrets in workflow specs, absent artifact garbage collection, missing resource limits, and retry without backoff
    tags:
      - argo-workflows
      - ci-cd
      - kubernetes
      - workflow
      - rbac
      - artifacts
      - retry
      - resource-limits
      - CWE-798
      - CWE-269
      - background-jobs
      - sidekiq
      - celery
      - bullmq
      - hangfire
      - temporal
      - queues
      - idempotency
      - dlq
      - cron
      - cadence
      - activity
      - determinism
      - versioning
      - architecture
  - id: cicd-circleci
    file: cicd-circleci.md
    type: primary
    focus: Detect CircleCI security and reliability issues including unpinned orbs, secrets in config, missing context restrictions, improper parallelism, wrong resource classes, and missing workspace persistence
    tags:
      - circleci
      - ci-cd
      - orbs
      - pipeline
      - secrets
      - parallelism
      - CWE-829
      - CWE-798
  - id: container-docker-compose-discipline
    file: container-docker-compose-discipline.md
    type: primary
    focus: Detect Docker Compose pitfalls including missing healthchecks, unguarded depends_on, host path mounts without read-only, secrets in environment, missing resource limits, and privileged mode
    tags:
      - docker
      - compose
      - docker-compose
      - healthcheck
      - volumes
      - secrets
      - restart
      - networking
      - CWE-250
  - id: iac-argocd
    file: iac-argocd.md
    type: primary
    focus: Detect Argo CD misconfigurations including sync policy gaps, missing health checks, overly permissive RBAC, ApplicationSet without progressive rollout, and secrets in Application manifests
    tags:
      - argocd
      - gitops
      - sync
      - rbac
      - applicationset
      - health-checks
      - sync-windows
      - secrets
      - kubernetes
  - id: iac-secrets-sops-sealed-secrets-vault
    file: iac-secrets-sops-sealed-secrets-vault.md
    type: primary
    focus: Detect misconfigurations in SOPS, Sealed Secrets, and HashiCorp Vault including missing key rotation, outdated controllers, overly broad Vault policies, unencrypted secrets at rest, missing rotation schedules, plaintext secrets in git history, and absent audit trails
    tags:
      - sops
      - sealed-secrets
      - vault
      - secrets
      - encryption
      - rotation
      - audit
      - key-management
      - gitops
      - ci-cd
      - oidc
      - masking
      - environment-variables
      - CWE-798
      - CWE-532
      - CWE-214
      - gitlab-ci
      - pipeline
      - deploy
      - environment-protection
      - CWE-269
      - credentials
      - hardcoded
      - kms
      - secret-scanning
      - CWE-312
      - CWE-319
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Secrets Workflow

**Focus:** .env files committed without .gitignore exclusion; Activity performing non-idempotent operation without idempotency key; Activity without retry policy or timeout configuration; Application targeting HEAD of default branch without revision pinning

## Children

| File | Type | Focus |
|------|------|-------|
| [cicd-argo-workflows.md](cicd-argo-workflows.md) | 📄 primary | Detect Argo Workflows security and reliability issues including missing RBAC on workflow templates, secrets in workflow specs, absent artifact garbage collection, missing resource limits, and retry without backoff |
| [cicd-circleci.md](cicd-circleci.md) | 📄 primary | Detect CircleCI security and reliability issues including unpinned orbs, secrets in config, missing context restrictions, improper parallelism, wrong resource classes, and missing workspace persistence |
| [container-docker-compose-discipline.md](container-docker-compose-discipline.md) | 📄 primary | Detect Docker Compose pitfalls including missing healthchecks, unguarded depends_on, host path mounts without read-only, secrets in environment, missing resource limits, and privileged mode |
| [iac-argocd.md](iac-argocd.md) | 📄 primary | Detect Argo CD misconfigurations including sync policy gaps, missing health checks, overly permissive RBAC, ApplicationSet without progressive rollout, and secrets in Application manifests |
| [iac-secrets-sops-sealed-secrets-vault.md](iac-secrets-sops-sealed-secrets-vault.md) | 📄 primary | Detect misconfigurations in SOPS, Sealed Secrets, and HashiCorp Vault including missing key rotation, outdated controllers, overly broad Vault policies, unencrypted secrets at rest, missing rotation schedules, plaintext secrets in git history, and absent audit trails |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
