---
id: iac-argocd
type: primary
depth_role: leaf
focus: Detect Argo CD misconfigurations including sync policy gaps, missing health checks, overly permissive RBAC, ApplicationSet without progressive rollout, and secrets in Application manifests
parents:
  - index.md
covers:
  - Sync policy without prune -- orphaned resources accumulate in cluster
  - Auto-sync without self-heal -- manual changes persist as drift
  - Missing health checks on custom resources
  - Sync windows not configured for production namespaces
  - RBAC too permissive -- broad project or cluster access
  - ApplicationSet without progressive rollout strategy
  - Secrets in Application manifests or Helm values
  - Missing sync retry policy for transient failures
  - No notification controller for sync failures
  - Application targeting HEAD of default branch without revision pinning
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
activation:
  file_globs:
    - "**/argocd/**"
    - "**/applications/**"
    - "**/appprojects/**"
    - "**/applicationsets/**"
    - "**/*argocd*.yaml"
  keyword_matches:
    - Application
    - AppProject
    - ApplicationSet
    - syncPolicy
    - automated
    - prune
    - selfHeal
    - argocd
    - argoproj.io
    - SyncWindow
    - RollingSync
  structural_signals:
    - "kind: Application"
    - "kind: AppProject"
    - "kind: ApplicationSet"
    - "apiVersion: argoproj.io"
source:
  origin: file
  path: iac-argocd.md
  hash: "sha256:d34eb54206eec9fbfe4e13eab2cd9c4b28fb531a5e4def2e0f18055a02f30b0b"
---
# Argo CD

## When This Activates

Activates when diffs touch Argo CD Application, AppProject, ApplicationSet, or configuration manifests. Argo CD is the GitOps controller that reconciles cluster state with Git -- a sync policy without prune leaves orphaned resources consuming cluster resources, auto-sync without self-heal allows manual kubectl changes to persist as undetected drift, and overly permissive AppProject RBAC lets any application deploy to any namespace. This reviewer catches Argo CD configuration mistakes that cause resource sprawl, security boundary violations, and deployment failures.

## Audit Surface

- [ ] Application syncPolicy without automated.prune
- [ ] Automated sync without selfHeal
- [ ] No health checks for custom resources
- [ ] No SyncWindow for production namespaces
- [ ] AppProject with broad cluster or namespace wildcards
- [ ] ApplicationSet without progressive rollout
- [ ] Literal secret in Application Helm values
- [ ] Application without sync retry policy
- [ ] No Notification triggers for sync failures
- [ ] Application with targetRevision HEAD or empty
- [ ] AppProject allowing *namespace or* cluster
- [ ] Missing ignoreDifferences for operator-managed fields
- [ ] Missing resource exclusion for cluster-scoped resources

## Detailed Checks

### Sync Policy
<!-- activation: keywords=["syncPolicy", "automated", "prune", "selfHeal", "retry", "syncOptions", "Replace", "ServerSideApply", "applyOutOfSyncOnly"] -->

- [ ] **Missing prune**: flag Applications with `syncPolicy.automated` but without `prune: true` -- without prune, resources deleted from Git remain in the cluster as orphans, consuming resources and potentially serving traffic
- [ ] **Missing selfHeal**: flag Applications with auto-sync but without `selfHeal: true` -- without self-heal, manual `kubectl` changes persist until the next Git commit triggers a sync, creating drift between Git and cluster state
- [ ] **No retry policy**: flag Applications without `syncPolicy.retry` -- transient failures (API server overload, CRD not yet installed) cause the sync to fail permanently without retries; configure `retry.limit` with backoff
- [ ] **targetRevision HEAD**: flag Applications with `targetRevision: HEAD` or empty targetRevision -- HEAD tracks the default branch tip, meaning any merge immediately deploys; pin to a tag, SHA, or release branch for production
- [ ] **Missing ignoreDifferences**: flag Applications deploying resources managed by operators (cert-manager certificates, Prometheus rules) without `ignoreDifferences` for operator-mutated fields -- without it, Argo CD shows perpetual out-of-sync status

### Health Checks
<!-- activation: keywords=["health", "healthChecks", "resource.customizations", "lua", "argocd-cm", "resourceHealthChecks"] -->

- [ ] **No custom health checks**: flag deployments of custom resources (CRDs) without corresponding health check configuration in argocd-cm or resource.customizations -- Argo CD reports custom resources as Healthy by default even when they are failing, hiding broken deployments
- [ ] **Health check always returns Healthy**: flag Lua health check scripts that unconditionally return "Healthy" -- this defeats the purpose of health checking and masks failures
- [ ] **Missing degraded status mapping**: flag health checks that only map to Healthy and Progressing without a Degraded state -- without Degraded, partial failures are invisible in the Argo CD dashboard

### Sync Windows
<!-- activation: keywords=["SyncWindow", "sync-window", "schedule", "duration", "namespaces", "clusters", "applications", "deny", "allow"] -->

- [ ] **No sync windows for production**: flag production namespaces or clusters without SyncWindow resources -- without sync windows, automated syncs can deploy during peak traffic, maintenance windows, or change freezes
- [ ] **Allow-all sync window**: flag SyncWindows with `applications: ['*']` and `clusters: ['*']` in allow windows -- broad allow windows defeat the purpose of change control
- [ ] **Missing deny window for change freezes**: flag production environments without deny SyncWindows during known change freeze periods (holidays, compliance windows)

### RBAC and AppProject
<!-- activation: keywords=["AppProject", "project", "destinations", "sourceRepos", "clusterResourceWhitelist", "namespaceResourceBlacklist", "roles", "policies"] -->

- [ ] **Wildcard namespace in AppProject**: flag AppProject with `destinations[].namespace: '*'` -- this allows any Application in the project to deploy to any namespace, bypassing namespace-level isolation
- [ ] **Wildcard cluster in AppProject**: flag AppProject with `destinations[].server: '*'` -- this allows deployment to any cluster, including production, from any Application in the project
- [ ] **Wildcard sourceRepos**: flag AppProject with `sourceRepos: ['*']` -- this allows Applications to pull from any Git repository, enabling supply chain attacks via malicious repo references
- [ ] **clusterResourceWhitelist too broad**: flag AppProject with `clusterResourceWhitelist` including `kind: '*'` -- this allows Applications to create cluster-scoped resources (ClusterRoles, Namespaces) that affect the entire cluster

### ApplicationSet and Progressive Rollout
<!-- activation: keywords=["ApplicationSet", "generator", "RollingSync", "strategy", "Progressive", "template", "goTemplate"] -->

- [ ] **ApplicationSet without progressive rollout**: flag ApplicationSets deploying to multiple clusters or environments without `strategy.type: RollingSync` -- without progressive rollout, all Applications are synced simultaneously, meaning a bad commit deploys everywhere at once
- [ ] **No maxUpdate limit**: flag RollingSync strategy without `maxUpdate` -- without a limit, all targets update in parallel, negating the benefit of rolling sync
- [ ] **Secrets in ApplicationSet template**: flag ApplicationSet templates with literal secrets in Helm values, environment variables, or annotations -- the secret is replicated to every generated Application

### Secrets in Manifests
<!-- activation: keywords=["values", "helm", "secret", "password", "token", "apiKey", "sealedSecrets", "ExternalSecret"] -->

- [ ] **Secrets in Application Helm values**: flag Application manifests with `spec.source.helm.values` or `valuesObject` containing literal passwords, tokens, or API keys -- Application manifests are stored in Git; use ExternalSecrets, SealedSecrets, or Vault injection
- [ ] **Secrets in Application parameters**: flag `spec.source.helm.parameters` with secret values -- parameters are visible in the Argo CD UI and API
- [ ] **Plain Kubernetes Secret in GitOps repo**: flag plain Kubernetes Secret manifests with data/stringData in the GitOps repository -- use SealedSecrets, ExternalSecrets, or SOPS-encrypted secrets instead

## Common False Positives

- **Manual sync for production**: some teams intentionally disable auto-sync on production Applications, requiring manual sync via the UI or CLI as an approval gate. Missing auto-sync is not always a finding.
- **HEAD for development environments**: tracking HEAD on development clusters is acceptable for rapid iteration.
- **ApplicationSet without RollingSync for non-prod**: progressive rollout is primarily needed for production multi-cluster deployments.
- **Wildcard in default project**: the default AppProject may have wildcards for development clusters where strict isolation is not required.

## Severity Guidance

| Finding | Severity |
|---|---|
| Literal secret in Application Helm values or parameters | Critical |
| Plain Kubernetes Secret in GitOps repository | Critical |
| AppProject with wildcard namespace and cluster on production | Critical |
| Wildcard sourceRepos in AppProject | Important |
| Missing prune on auto-synced Application | Important |
| Missing selfHeal on auto-synced Application | Important |
| ApplicationSet without progressive rollout to production | Important |
| No sync windows for production namespaces | Important |
| Missing custom health checks for CRDs | Minor |
| targetRevision HEAD on non-production Application | Minor |
| Missing sync retry policy | Minor |
| Missing ignoreDifferences for operator fields | Minor |

## See Also

- `iac-fluxcd` -- alternative GitOps controller with analogous sync and health concerns
- `sec-secrets-management-and-rotation` -- secrets must not appear in GitOps repositories
- `sec-owasp-a05-misconfiguration` -- Argo CD misconfiguration is infrastructure misconfiguration
- `k8s-manifest-correctness` -- Kubernetes manifests deployed via Argo CD inherit manifest-level concerns
- `iac-secrets-sops-sealed-secrets-vault` -- secret management patterns for GitOps workflows

## Authoritative References

- [Argo CD Documentation: Sync Policy](https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/)
- [Argo CD Documentation: Projects](https://argo-cd.readthedocs.io/en/stable/user-guide/projects/)
- [Argo CD Documentation: ApplicationSet](https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/)
- [Argo CD Documentation: Resource Health](https://argo-cd.readthedocs.io/en/stable/operator-manual/health/)
- [Argo CD Documentation: Sync Windows](https://argo-cd.readthedocs.io/en/stable/user-guide/sync_windows/)
