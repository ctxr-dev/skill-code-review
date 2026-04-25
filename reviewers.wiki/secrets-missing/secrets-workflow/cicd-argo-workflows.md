---
id: cicd-argo-workflows
type: primary
depth_role: leaf
focus: Detect Argo Workflows security and reliability issues including missing RBAC on workflow templates, secrets in workflow specs, absent artifact garbage collection, missing resource limits, and retry without backoff
parents:
  - index.md
covers:
  - Workflow templates accessible without RBAC restrictions
  - Secrets embedded in workflow spec instead of Kubernetes secret references
  - Artifact repository without garbage collection policy
  - "Workflow pods without resource limits (cpu, memory)"
  - Retry strategy without backoff causing thundering herd
  - Workflow running as root or with privileged security context
  - Missing activeDeadlineSeconds on workflow or template
  - WorkflowTemplate without namespace-scoped RBAC
  - "S3/GCS artifact credentials hardcoded in workflow"
  - "Missing node affinity or toleration for GPU/specialized workloads"
  - Job performs side effects without idempotency, so retries duplicate
  - Retry policy missing or retries exhausted silently
  - No dead-letter queue or retries-exhausted handler
  - "Large payloads enqueued inline (queue/memory bloat)"
  - No priority configuration mixing latency-sensitive and bulk jobs
  - "No concurrency / rate limits on worker causing resource exhaustion"
  - "Scheduled/cron jobs using server local time instead of explicit timezone"
  - No per-job timeout, allowing a hung job to consume a worker forever
  - "Long-running jobs without heartbeat / visibility extension"
  - Job state leaking across retries via shared globals or memoization
  - "Temporal / durable workflow using non-deterministic code (now(), random, IO)"
  - "Workflow function containing non-deterministic code (random, time, UUID, network call)"
  - Activity without retry policy or timeout configuration
  - Workflow versioning not handled -- breaking changes corrupt running workflows
  - Large payload stored in workflow state instead of external storage
  - Blocking call inside workflow function instead of using activity
  - Activity performing non-idempotent operation without idempotency key
  - Workflow signal or query handler with side effects
  - Missing heartbeat for long-running activities
  - "Child workflow used where activity suffices (unnecessary complexity)"
  - Workflow replay not tested
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
aliases:
  - background-jobs-sidekiq-celery-bullmq-hangfire-temporal
  - arch-workflow-engines-temporal-cadence
activation:
  file_globs:
    - "**/argo/**"
    - "**/workflows/**"
    - "**/*workflow*.yaml"
    - "**/*workflow*.yml"
    - "**/*wftmpl*.yaml"
  keyword_matches:
    - "apiVersion: argoproj.io"
    - "kind: Workflow"
    - "kind: WorkflowTemplate"
    - "kind: ClusterWorkflowTemplate"
    - "kind: CronWorkflow"
    - retryStrategy
    - activeDeadlineSeconds
    - podGC
    - artifactGC
    - argo
  structural_signals:
    - Argo Workflow manifest change
    - WorkflowTemplate or ClusterWorkflowTemplate change
    - CronWorkflow schedule change
source:
  origin: file
  path: cicd-argo-workflows.md
  hash: "sha256:e9dda7434e1a828fddf903731d21255dd8b8c02623cd95b1d7ef802854b9332b"
---
# Argo Workflows Security and Reliability

## When This Activates

Activates when diffs touch Argo Workflow, WorkflowTemplate, ClusterWorkflowTemplate, or CronWorkflow manifests. Argo Workflows orchestrate Kubernetes-native pipelines that spawn pods with access to cluster resources, artifact stores, and secrets. Missing RBAC allows unauthorized workflow submission, embedded secrets in specs are stored in etcd and visible to anyone with API access, unbounded retries without backoff overwhelm downstream services, and missing resource limits allow a single workflow to starve the cluster. This reviewer detects Argo-specific patterns that compromise cluster security, waste resources, or reduce workflow reliability.

## Audit Surface

- [ ] Workflow spec with hardcoded secret, password, or token
- [ ] WorkflowTemplate without serviceAccountName or RBAC
- [ ] Artifact configuration without garbage collection or TTL
- [ ] Container template without resources.limits
- [ ] retryStrategy without backoff configuration
- [ ] SecurityContext missing or set to privileged
- [ ] Missing activeDeadlineSeconds on Workflow
- [ ] ClusterWorkflowTemplate with broad access
- [ ] Artifact repository credentials in plain text
- [ ] Missing podGC for completed pod cleanup
- [ ] DAG task without dependencies creating race condition
- [ ] Volume mount of host path or Docker socket

## Detailed Checks

### RBAC and Access Control
<!-- activation: keywords=["serviceAccountName", "ClusterWorkflowTemplate", "WorkflowTemplate", "rbac", "role", "binding", "namespace"] -->

- [ ] **WorkflowTemplate without service account**: flag WorkflowTemplates without `serviceAccountName` -- workflows inherit the default service account, which may have broader permissions than needed. Assign a dedicated service account with least-privilege RBAC for each workflow
- [ ] **ClusterWorkflowTemplate with broad scope**: flag ClusterWorkflowTemplates that are accessible from any namespace without RBAC restrictions -- any user who can create Workflow resources in any namespace can reference the template. Prefer namespace-scoped WorkflowTemplates or restrict ClusterWorkflowTemplate access via RBAC
- [ ] **Workflow service account with cluster-admin**: flag workflows using a service account bound to `cluster-admin` or other broad ClusterRoles -- the workflow pods inherit these permissions and can modify any cluster resource. Scope permissions to the specific resources the workflow needs
- [ ] **Missing namespace restriction**: flag CronWorkflows or WorkflowTemplates without namespace annotations that could be deployed to production namespaces accidentally -- use namespace-level policies to restrict which workflow specs can run where

### Secrets in Workflow Specs
<!-- activation: keywords=["secret", "password", "token", "key", "credential", "env:", "value:", "parameters:", "artifacts:"] -->

- [ ] **Hardcoded secrets in spec**: flag Workflow specs containing hardcoded passwords, API keys, tokens, or connection strings in `env:`, `parameters:`, or `arguments:` blocks -- Workflow specs are stored in etcd and visible via the Argo API. Use Kubernetes Secrets with `valueFrom: secretKeyRef` or external secret operators
- [ ] **Artifact repository credentials in plain text**: flag `artifactRepository` configurations with S3 access keys, GCS service account keys, or other credentials in plain text -- use Kubernetes Secrets or workload identity (IRSA, GKE Workload Identity) to authenticate to artifact stores
- [ ] **Secret passed as workflow parameter**: flag secrets passed via `arguments.parameters` -- parameter values are visible in the Argo UI, API responses, and etcd. Use Kubernetes Secrets mounted as volumes or environment variables instead
- [ ] **Environment variable with credential value**: flag `env:` entries with `value:` containing credential-like strings instead of `valueFrom: secretKeyRef` -- plain values are stored in the Workflow resource and logged in pod specs

### Artifact Garbage Collection and Storage
<!-- activation: keywords=["artifacts:", "artifactGC", "artifactRepository", "s3:", "gcs:", "ttl", "podGC", "completed"] -->

- [ ] **Missing artifact GC**: flag workflows producing artifacts without `artifactGC` configuration or TTL strategy -- artifacts accumulate in the object store indefinitely, consuming storage and cost. Set `artifactGC.strategy` to `OnWorkflowDeletion` or configure TTL-based cleanup
- [ ] **Missing podGC**: flag workflows without `podGC` configuration -- completed pods persist in the cluster consuming etcd storage and cluttering `kubectl get pods` output. Set `podGC.strategy` to `OnPodCompletion` or `OnWorkflowCompletion`
- [ ] **Artifact repository without encryption**: flag S3 or GCS artifact repository configurations without server-side encryption enabled -- workflow artifacts may contain build outputs, test data, or intermediate results that should be encrypted at rest

### Resource Limits and Timeouts
<!-- activation: keywords=["resources:", "limits:", "requests:", "activeDeadlineSeconds", "timeout", "retryStrategy", "backoff"] -->

- [ ] **Missing resource limits**: flag container templates without `resources.limits.cpu` and `resources.limits.memory` -- unbounded pods can consume entire node resources, starving other workloads and triggering OOM kills. Set limits based on expected workload
- [ ] **Missing activeDeadlineSeconds**: flag Workflows and WorkflowTemplates without `activeDeadlineSeconds` -- without a deadline, stuck workflows run indefinitely consuming cluster resources. Set a deadline appropriate to the expected workflow duration
- [ ] **Retry without backoff**: flag `retryStrategy` configurations without `backoff` -- retries without exponential backoff create a thundering herd effect when the failure is caused by an overloaded downstream service. Use `backoff: { duration: "5s", factor: 2, maxDuration: "5m" }`
- [ ] **Unlimited retry count**: flag `retryStrategy.limit` set to 0 or missing -- unlimited retries on a persistently failing step waste resources indefinitely. Set a finite retry limit (typically 3-5)

### Pod Security and Isolation
<!-- activation: keywords=["securityContext", "privileged", "runAsRoot", "runAsNonRoot", "hostPath", "volumes:", "volumeMounts:"] -->

- [ ] **Privileged security context**: flag workflow step containers with `securityContext.privileged: true` -- privileged containers have full host access and represent a container escape risk. Use specific capabilities or rootless alternatives
- [ ] **Missing runAsNonRoot**: flag workflow templates without `securityContext.runAsNonRoot: true` -- containers default to running as root. Set non-root execution at the workflow or template level
- [ ] **Host path volume mount**: flag workflows mounting host paths or the Docker socket -- these provide escape routes from container isolation. Use emptyDir or PVC volumes for workflow data
- [ ] **DAG task without explicit dependencies**: flag DAG tasks that share workspace data but lack `dependencies:` declarations -- without explicit ordering, tasks may race on shared files, producing non-deterministic results

## Common False Positives

- **Development namespace workflows**: workflows in development namespaces may legitimately use broader permissions during iteration. Flag only for production or shared namespaces.
- **One-shot workflows**: single-run Workflows with no CronWorkflow schedule may not need artifact GC if the Workflow itself is cleaned up promptly.
- **GPU workloads**: GPU-bound workflows legitimately need larger resource limits and specific node affinity. The resource limit check should assess proportionality, not just magnitude.
- **Init containers**: init containers in workflow pods may need root access for setup tasks. Flag only the main step containers running workflow logic.

## Severity Guidance

| Finding | Severity |
|---|---|
| Hardcoded secret in Workflow spec | Critical |
| Workflow service account with cluster-admin | Critical |
| Privileged container without justification | Important |
| Missing activeDeadlineSeconds (unbounded execution) | Important |
| Retry without backoff (thundering herd risk) | Important |
| Artifact repository credentials in plain text | Important |
| ClusterWorkflowTemplate without RBAC restriction | Important |
| Missing resource limits on workflow pods | Minor |
| Missing podGC (completed pods accumulate) | Minor |
| Missing artifact GC (storage accumulation) | Minor |
| Host path volume mount in workflow | Minor |

## See Also

- `sec-secrets-management-and-rotation` -- secrets lifecycle in Kubernetes and CI/CD
- `container-image-hardening` -- container security context and privilege controls
- `cicd-pipeline-secrets-discipline` -- cross-platform CI secrets hygiene
- `cicd-deploy-strategies` -- deployment safety and rollback patterns
- `sec-owasp-a05-misconfiguration` -- misconfigured workflow RBAC as security risk

## Authoritative References

- [Argo Workflows Security](https://argo-workflows.readthedocs.io/en/latest/security/)
- [Argo Workflows RBAC](https://argo-workflows.readthedocs.io/en/latest/argo-server-auth-mode/)
- [Argo Workflows Artifact Repository](https://argo-workflows.readthedocs.io/en/latest/configure-artifact-repository/)
- [Kubernetes Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
- [OWASP CI/CD Security Top 10](https://owasp.org/www-project-top-10-ci-cd-security-risks/)
