---
id: iac-crossplane
type: primary
depth_role: leaf
focus: Detect Crossplane misconfigurations including untested compositions, missing providerConfigRef, absent deletion policies, XRD validation gaps, claim namespace issues, and non-idempotent patches
parents:
  - index.md
covers:
  - Composition not covered by composition tests or render tests
  - Managed resource without providerConfigRef binding
  - Missing deletionPolicy on managed resources
  - XRD without OpenAPI validation schema
  - Claim created without namespace or in wrong namespace
  - Composition patches not idempotent -- repeated reconciliation changes resources
  - Missing ProviderConfig for multi-account or multi-region
  - CompositeResource without required readiness checks
  - Composition using deprecated patch types
  - "Missing usage/dependency tracking between managed resources"
tags:
  - crossplane
  - iac
  - composition
  - xrd
  - claim
  - managed-resource
  - provider
  - kubernetes
  - gitops
activation:
  file_globs:
    - "**/crossplane/**"
    - "**/compositions/**"
    - "**/claims/**"
    - "**/xrd*"
    - "**/*.crossplane.yaml"
  keyword_matches:
    - apiextensions.crossplane.io
    - Composition
    - CompositeResourceDefinition
    - Claim
    - providerConfigRef
    - managed
    - crossplane
    - ProviderConfig
    - patchSets
  structural_signals:
    - "kind: Composition"
    - "kind: CompositeResourceDefinition"
    - "kind: ProviderConfig"
    - "apiextensions.crossplane.io/v1"
source:
  origin: file
  path: iac-crossplane.md
  hash: "sha256:1665bd421fc8b92670e4e5d3849633b5b7446d0f11e2a2e3935d5645a4d841c9"
---
# Crossplane

## When This Activates

Activates when diffs touch Crossplane compositions, XRDs, claims, managed resources, or ProviderConfig files. Crossplane extends Kubernetes to manage cloud infrastructure declaratively -- a missing providerConfigRef binds resources to the default provider account (potentially the wrong one), an untested composition deploys broken infrastructure on the first claim, and missing deletion policies leave orphaned cloud resources accruing cost. This reviewer catches Crossplane-specific misconfigurations that cause cloud resource sprawl, data loss, and reconciliation failures.

## Audit Surface

- [ ] Composition without corresponding test YAML
- [ ] Managed resource missing providerConfigRef
- [ ] Managed resource without explicit deletionPolicy
- [ ] XRD missing openAPIV3Schema validation
- [ ] Claim without metadata.namespace
- [ ] Composition patch without default value for optional fields
- [ ] ProviderConfig missing for cross-account management
- [ ] CompositeResource without connectionDetails
- [ ] Composition using deprecated patchSets syntax
- [ ] No readinessChecks in Composition resources
- [ ] Managed resource without forProvider fields
- [ ] Environment config not propagated through composition

## Detailed Checks

### Composition Testing
<!-- activation: keywords=["Composition", "composition", "render", "test", "patchSets", "resources", "base", "patches"] -->

- [ ] **Untested composition**: flag Composition manifests with no corresponding test file (crossplane render test, composition function test, or example claim with expected output) -- compositions are opaque YAML transformations; without tests, the first real claim discovers bugs in production
- [ ] **Composition patches not idempotent**: flag patches that produce different outputs on repeated reconciliation -- non-idempotent patches cause thrashing where the managed resource is updated every reconciliation cycle, triggering unnecessary cloud API calls and potential rate limiting
- [ ] **Missing readinessChecks**: flag Composition resources blocks without readinessChecks -- without them, the composite resource reports Ready before the managed resources are actually provisioned, causing downstream consumers to fail
- [ ] **Deprecated patch syntax**: flag compositions using deprecated patch types or patchSets formats from older Crossplane versions -- deprecated syntax may break on upgrade

### Managed Resource Configuration
<!-- activation: keywords=["providerConfigRef", "deletionPolicy", "forProvider", "initProvider", "managementPolicies", "ProviderConfig"] -->

- [ ] **Missing providerConfigRef**: flag managed resources without `spec.providerConfigRef` -- without an explicit reference, the resource binds to the default ProviderConfig, which may be the wrong cloud account, region, or credentials
- [ ] **Missing deletionPolicy**: flag managed resources without an explicit `spec.deletionPolicy` -- the default behavior varies by provider; explicitly set `Orphan` (keep cloud resource on CR delete) or `Delete` (remove cloud resource) based on the resource's statefulness
- [ ] **Missing forProvider fields**: flag managed resources with empty or incomplete `spec.forProvider` -- Crossplane requires provider-specific fields to create cloud resources; missing fields cause the resource to enter a permanent error state
- [ ] **No connectionDetails**: flag compositions that create resources with connection information (databases, caches, message brokers) without propagating connectionDetails to the composite -- consumers need connection strings, endpoints, and credentials

### XRD Schema and Claims
<!-- activation: keywords=["CompositeResourceDefinition", "XRD", "openAPIV3Schema", "Claim", "claimNames", "spec.versions", "validation", "required"] -->

- [ ] **XRD without validation**: flag CompositeResourceDefinitions where `spec.versions[].schema.openAPIV3Schema` is missing or has no property-level validation (enum, pattern, minimum, maximum) -- without validation, claims with invalid values reach the composition and fail at the cloud provider level with cryptic errors
- [ ] **Claim without namespace**: flag Claim manifests without `metadata.namespace` -- claims are namespace-scoped; omitting namespace defaults to the kubectl context's namespace, which may be wrong in CI/CD
- [ ] **Missing required fields in XRD**: flag XRD schemas that do not mark critical fields as required -- optional fields without defaults cause compositions to produce incomplete managed resources
- [ ] **ClaimNames not set**: flag XRDs without `spec.claimNames` -- without claim names, platform users cannot create namespace-scoped claims, forcing them to use cluster-scoped CompositeResources

### Provider Management
<!-- activation: keywords=["ProviderConfig", "Provider", "controllerConfig", "runtimeConfig", "DeploymentRuntimeConfig", "credential"] -->

- [ ] **Single ProviderConfig for multi-account**: flag environments managing resources across multiple cloud accounts or regions with only one ProviderConfig -- each account/region combination needs its own ProviderConfig to ensure correct credential binding
- [ ] **Provider credentials in plaintext**: flag ProviderConfig with inline credentials instead of references to Kubernetes Secrets or external secret stores -- credentials in YAML manifests are committed to version control
- [ ] **Missing provider upgrade strategy**: flag Crossplane providers without version pinning or upgrade constraints -- unpinned providers auto-update and may introduce breaking CRD changes

## Common False Positives

- **Default ProviderConfig by design**: some organizations use a single cloud account where the default ProviderConfig is intentional. Only flag when multi-account or multi-region is in use.
- **deletionPolicy Delete for ephemeral resources**: development environments may intentionally use Delete policy for easy cleanup.
- **Simple XRDs without validation**: prototype or internal-only XRDs with a small team may skip detailed validation initially.
- **Composition tests in separate repo**: some organizations keep composition tests in a dedicated test repository.

## Severity Guidance

| Finding | Severity |
|---|---|
| Provider credentials in plaintext in ProviderConfig | Critical |
| Missing providerConfigRef in multi-account environment | Critical |
| Missing deletionPolicy on stateful managed resource (database, storage) | Important |
| Untested composition deployed to production | Important |
| XRD without openAPIV3Schema validation | Important |
| Non-idempotent composition patches | Important |
| Missing readinessChecks in composition | Important |
| Claim without namespace | Minor |
| Missing connectionDetails propagation | Minor |
| Deprecated patch syntax | Minor |

## See Also

- `k8s-manifest-correctness` -- Crossplane resources are Kubernetes manifests and inherit manifest-level concerns
- `sec-secrets-management-and-rotation` -- provider credentials must not be plaintext in manifests
- `sec-owasp-a05-misconfiguration` -- misconfigured Crossplane resources create cloud misconfigurations
- `iac-drift-detection` -- Crossplane continuously reconciles but external drift still needs monitoring
- `iac-terraform` -- alternative IaC approach with analogous state and versioning patterns

## Authoritative References

- [Crossplane Documentation: Compositions](https://docs.crossplane.io/latest/concepts/compositions/)
- [Crossplane Documentation: Composite Resource Definitions](https://docs.crossplane.io/latest/concepts/composite-resource-definitions/)
- [Crossplane Documentation: Managed Resources](https://docs.crossplane.io/latest/concepts/managed-resources/)
- [Crossplane Documentation: ProviderConfig](https://docs.crossplane.io/latest/concepts/providers/)
- [Crossplane Best Practices](https://docs.crossplane.io/latest/guides/best-practices/)
