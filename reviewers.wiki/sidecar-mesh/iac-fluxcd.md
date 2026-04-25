---
id: iac-fluxcd
type: primary
depth_role: leaf
focus: Detect Flux CD misconfigurations including unpinned source references, missing notification providers, Kustomization without health checks, absent suspend capability, HelmRelease validation gaps, and aggressive reconciliation intervals
parents:
  - index.md
covers:
  - GitRepository source using branch ref instead of tag or SHA
  - Missing Notification Provider and Alert for deployment failures
  - Kustomization without health checks -- silent broken deployments
  - Missing suspend capability for emergency freeze
  - HelmRelease without values schema validation
  - Reconciliation interval too aggressive -- API server overload
  - "Missing source verification (cosign, GPG)"
  - ImagePolicy without semver constraint
  - Missing dependsOn for deployment ordering
  - Secrets in Kustomization or HelmRelease values
tags:
  - fluxcd
  - gitops
  - kustomization
  - helmrelease
  - source
  - notification
  - health-checks
  - reconciliation
  - kubernetes
activation:
  file_globs:
    - "**/flux-system/**"
    - "**/flux/**"
    - "**/*kustomization*.yaml"
    - "**/*helmrelease*.yaml"
    - "**/*gitrepository*.yaml"
  keyword_matches:
    - Kustomization
    - HelmRelease
    - GitRepository
    - OCIRepository
    - source.toolkit.fluxcd.io
    - kustomize.toolkit.fluxcd.io
    - helm.toolkit.fluxcd.io
    - notification.toolkit.fluxcd.io
    - ImagePolicy
  structural_signals:
    - "kind: Kustomization"
    - "kind: HelmRelease"
    - "kind: GitRepository"
    - "kind: OCIRepository"
    - toolkit.fluxcd.io
source:
  origin: file
  path: iac-fluxcd.md
  hash: "sha256:d342cd1005c1a6b4439b918e3c55187c311bbd594daa031c010ddea5a9c1971b"
---
# Flux CD

## When This Activates

Activates when diffs touch Flux CD resources including GitRepository, OCIRepository, Kustomization, HelmRelease, ImagePolicy, or notification resources. Flux is a GitOps toolkit that continuously reconciles cluster state with sources -- a GitRepository tracking a branch instead of a tag means any push deploys immediately, missing health checks hide broken deployments behind "Applied" status, and aggressive reconciliation intervals overload the Kubernetes API server. This reviewer catches Flux-specific misconfigurations that cause uncontrolled deployments, silent failures, and cluster instability.

## Audit Surface

- [ ] GitRepository using branch ref instead of tag or semver
- [ ] No Notification Provider for deployment failure alerts
- [ ] Kustomization without healthChecks or wait
- [ ] No suspend capability tested or documented
- [ ] HelmRelease without values validation
- [ ] Kustomization with interval under 1 minute
- [ ] GitRepository without source verification
- [ ] ImagePolicy without semver constraint
- [ ] Kustomization without dependsOn for ordering
- [ ] Literal secret in HelmRelease values
- [ ] HelmRelease without timeout
- [ ] Missing ServiceAccount for impersonation
- [ ] OCIRepository without verify block

## Detailed Checks

### Source Pinning and Verification
<!-- activation: keywords=["GitRepository", "OCIRepository", "HelmRepository", "ref", "branch", "tag", "semver", "commit", "verify", "cosign", "GPG", "secretRef"] -->

- [ ] **Branch ref instead of tag/SHA**: flag GitRepository resources with `spec.ref.branch` as the only reference -- branch tracking means every push to the branch triggers reconciliation; use `spec.ref.tag`, `spec.ref.semver`, or `spec.ref.commit` for production sources to pin deployments to explicit releases
- [ ] **Missing source verification**: flag GitRepository and OCIRepository without `spec.verify` -- without verification (cosign signature, GPG signing), Flux trusts any content in the source, enabling supply chain attacks if the repository is compromised
- [ ] **HelmRepository without authentication**: flag HelmRepository pointing to private registries without `spec.secretRef` -- missing auth causes silent reconciliation failures
- [ ] **ImagePolicy without semver constraint**: flag ImagePolicy resources with `spec.policy.semver.range` set to `*` or without semver filtering -- unconstrained image policies auto-deploy any new tag including pre-releases and breaking versions

### Kustomization Health and Dependencies
<!-- activation: keywords=["Kustomization", "healthChecks", "wait", "dependsOn", "interval", "timeout", "prune", "force", "suspend", "serviceAccountName"] -->

- [ ] **Missing health checks**: flag Kustomization resources without `spec.healthChecks` or `spec.wait: true` -- without health checks, Flux reports the Kustomization as Ready after applying manifests, even if Deployments fail to roll out or Pods crash
- [ ] **Missing dependsOn**: flag Kustomizations that deploy applications depending on infrastructure (CRDs, namespaces, cert-manager) without `spec.dependsOn` referencing the infrastructure Kustomization -- without ordering, applications deploy before their prerequisites exist
- [ ] **Missing prune**: flag Kustomizations without `spec.prune: true` -- without prune, resources removed from Git remain in the cluster as orphans
- [ ] **Missing suspend capability**: flag production Kustomizations without documented or tested `spec.suspend` procedure -- during incidents, the ability to quickly suspend reconciliation prevents Flux from overwriting manual hotfixes
- [ ] **Missing ServiceAccount**: flag Kustomizations without `spec.serviceAccountName` -- without impersonation, Flux uses its own cluster-admin ServiceAccount for all reconciliation, violating least-privilege

### HelmRelease Validation
<!-- activation: keywords=["HelmRelease", "values", "valuesFrom", "chart", "timeout", "test", "remediation", "rollback", "upgrade"] -->

- [ ] **Missing values validation**: flag HelmRelease resources deploying charts without validating values against the chart's JSON schema or without documented value constraints -- invalid values cause Helm template rendering failures that are hard to diagnose from Flux status
- [ ] **Missing timeout**: flag HelmRelease without `spec.timeout` -- the default timeout may be too short for large deployments or too long for fast-failing ones; set explicitly based on expected deployment duration
- [ ] **Missing remediation**: flag HelmRelease without `spec.upgrade.remediation` or `spec.install.remediation` -- without remediation configuration, failed upgrades leave the release in a broken state; configure automatic rollback on failure
- [ ] **Secrets in values**: flag HelmRelease with `spec.values` containing literal passwords, tokens, or keys -- use `spec.valuesFrom` with ConfigMap/Secret references, or use external secret injection

### Reconciliation Tuning
<!-- activation: keywords=["interval", "timeout", "retryInterval", "reconcile", "force", "rate"] -->

- [ ] **Interval too aggressive**: flag Kustomization or HelmRelease with `spec.interval` under 1 minute -- aggressive reconciliation generates excessive API server load and Git polling; 5-10 minutes is appropriate for most workloads, with webhook-triggered reconciliation for urgency
- [ ] **Interval too long for critical workloads**: flag production Kustomizations with `spec.interval` over 30 minutes -- long intervals delay drift detection and deployment propagation
- [ ] **Missing retryInterval**: flag resources without distinct retry interval -- the default retry uses the same interval as regular reconciliation, which may be too slow for transient failures or too fast during extended outages

### Notifications and Observability
<!-- activation: keywords=["Provider", "Alert", "notification", "webhook", "slack", "teams", "pagerduty", "event"] -->

- [ ] **No Notification Provider**: flag Flux installations without any `notification.toolkit.fluxcd.io/Provider` resource -- without providers, sync failures, health check failures, and reconciliation errors go unnoticed until users report issues
- [ ] **No Alerts for failure events**: flag environments with Notification Providers but no Alert resources filtering for error/warning severity -- providers without alerts send nothing; configure Alerts for `Kustomization`, `HelmRelease`, and `GitRepository` failure events
- [ ] **Missing event filtering**: flag Alerts without `spec.eventSeverity` or `spec.inclusionList` -- unfiltered alerts generate noise that leads to alert fatigue and missed real failures

## Common False Positives

- **Branch tracking for development**: GitRepository tracking a branch is acceptable for development and staging environments where rapid iteration is desired.
- **Short intervals for canary/progressive**: some environments use short reconciliation intervals as part of progressive delivery or canary analysis.
- **Suspend not needed for non-production**: suspend capability documentation is primarily needed for production environments.
- **Health checks on simple ConfigMaps**: Kustomizations deploying only ConfigMaps and Secrets do not need health checks since these resources are immediately ready.

## Severity Guidance

| Finding | Severity |
|---|---|
| Literal secret in HelmRelease values | Critical |
| GitRepository without source verification in production | Critical |
| Missing health checks on production Kustomization | Important |
| Branch ref on production GitRepository | Important |
| Missing prune on Kustomization | Important |
| ApplicationSet-style rollout without progressive strategy | Important |
| Missing dependsOn for infrastructure ordering | Important |
| No Notification Provider for failure events | Important |
| Reconciliation interval under 1 minute | Minor |
| Missing ServiceAccount for impersonation | Minor |
| HelmRelease without timeout | Minor |
| ImagePolicy without semver constraint | Minor |

## See Also

- `iac-argocd` -- alternative GitOps controller with analogous sync and health concerns
- `sec-secrets-management-and-rotation` -- secrets must not appear in GitOps manifests
- `sec-owasp-a05-misconfiguration` -- Flux misconfiguration propagates to cluster state
- `k8s-manifest-correctness` -- Kubernetes manifests deployed via Flux inherit manifest-level concerns
- `iac-secrets-sops-sealed-secrets-vault` -- SOPS integration with Flux for encrypted secrets

## Authoritative References

- [Flux Documentation: GitRepository](https://fluxcd.io/flux/components/source/gitrepositories/)
- [Flux Documentation: Kustomization](https://fluxcd.io/flux/components/kustomize/kustomizations/)
- [Flux Documentation: HelmRelease](https://fluxcd.io/flux/components/helm/helmreleases/)
- [Flux Documentation: Notifications](https://fluxcd.io/flux/components/notification/)
- [Flux Security Best Practices](https://fluxcd.io/flux/security/)
