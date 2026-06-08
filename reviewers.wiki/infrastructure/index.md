---
id: infrastructure
type: index
depth_role: subcategory
depth: 1
focus: "infrastructure: Detect Docker Compose pitfalls including missing healthchecks, unguarded depends_on, host path mounts without read-only, secrets in environment, missing resource limits, and privileged mode; Detect container image securit..."
parents:
  - "../index.md"
shared_covers: []
tags:
  - admission
  - ambassador
  - ansible
  - apparmor
  - applicationset
  - architecture
  - argocd
  - arm
  - audit
  - authorization
  - aws
  - azure
  - base
  - bicep
  - binary-authorization
  - cache
  - capabilities
  - cdk
  - cel
  - chart
generator: "skill-llm-wiki/v1"
entries:
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
  - id: container-image-hardening
    file: container-image-hardening.md
    type: primary
    focus: Detect container image security and hygiene issues including running as root, unpinned base images, missing multi-stage builds, secrets in layers, and unnecessary packages
    tags:
      - container
      - docker
      - dockerfile
      - image
      - security
      - hardening
      - multi-stage
      - root
      - digest
      - CWE-250
  - id: container-image-scanning-trivy-grype-clair
    file: container-image-scanning-trivy-grype-clair.md
    type: primary
    focus: Detect gaps in container image vulnerability scanning including missing CI integration, ignored critical findings, scan-only-at-build patterns, and incomplete package coverage
    tags:
      - container
      - scanning
      - vulnerability
      - trivy
      - grype
      - clair
      - CVE
      - security
      - pipeline
      - CWE-1395
  - id: container-runtime-gvisor-kata-sysbox
    file: container-runtime-gvisor-kata-sysbox.md
    type: primary
    focus: Detect sandboxed container runtime misconfigurations including workloads missing RuntimeClass, gVisor syscall compatibility gaps, Kata nested virtualization issues, and missing fallback runtime strategies
    tags:
      - container
      - runtime
      - gvisor
      - kata
      - sysbox
      - sandbox
      - runtimeclass
      - isolation
      - security
  - id: iac-ansible
    file: iac-ansible.md
    type: primary
    focus: Detect Ansible misconfigurations including plaintext passwords in variables, missing privilege escalation controls, unnotified handlers, roles without tests, hardcoded hosts, missing vault encryption, and idempotency violations
    tags:
      - ansible
      - iac
      - vault
      - secrets
      - idempotency
      - handlers
      - molecule
      - roles
      - privilege-escalation
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
  - id: iac-bicep-arm
    file: iac-bicep-arm.md
    type: primary
    focus: Detect Bicep and ARM template misconfigurations including hardcoded secrets, missing parameter defaults and validation, unversioned Bicep modules, missing resource locks, and deployment mode risks
    tags:
      - azure
      - bicep
      - arm
      - iac
      - secrets
      - resource-locks
      - deployment-mode
      - tags
      - modules
  - id: iac-chef-puppet-salt
    file: iac-chef-puppet-salt.md
    type: primary
    focus: Detect Chef, Puppet, and Salt misconfigurations including hardcoded credentials in recipes and manifests, missing test coverage, non-idempotent resources, incomplete metadata, and state ordering issues
    tags:
      - chef
      - puppet
      - salt
      - iac
      - configuration-management
      - idempotency
      - testing
      - secrets
      - recipes
      - manifests
  - id: iac-cloudformation-sam-cdk
    file: iac-cloudformation-sam-cdk.md
    type: primary
    focus: Detect CloudFormation, SAM, and CDK misconfigurations including hardcoded secrets in templates, missing DeletionPolicy on stateful resources, absent drift detection, CDK L1 overuse, missing stack tags, and no rollback triggers
    tags:
      - aws
      - cloudformation
      - sam
      - cdk
      - iac
      - deletion-policy
      - drift
      - secrets
      - stack
      - template
  - id: iac-crossplane
    file: iac-crossplane.md
    type: primary
    focus: Detect Crossplane misconfigurations including untested compositions, missing providerConfigRef, absent deletion policies, XRD validation gaps, claim namespace issues, and non-idempotent patches
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
  - id: iac-drift-detection
    file: iac-drift-detection.md
    type: primary
    focus: Detect missing or misconfigured infrastructure drift detection including absent drift checks, non-actionable alerts, missing automated remediation, unreconciled manual changes, unscheduled state refresh, and missing drift reports in CI
    tags:
      - drift
      - detection
      - reconciliation
      - iac
      - state
      - remediation
      - monitoring
      - compliance
      - security
  - id: iac-fluxcd
    file: iac-fluxcd.md
    type: primary
    focus: Detect Flux CD misconfigurations including unpinned source references, missing notification providers, Kustomization without health checks, absent suspend capability, HelmRelease validation gaps, and aggressive reconciliation intervals
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
  - id: iac-nix
    file: iac-nix.md
    type: primary
    focus: Detect Nix and NixOS misconfigurations including unpinned flake inputs, impure derivations, missing flake checks, large closure sizes, uncached store paths in CI, missing devShell, and unfree package allowances
    tags:
      - nix
      - nixos
      - flakes
      - derivation
      - closure
      - cache
      - devshell
      - reproducibility
      - unfree
  - id: iac-pulumi
    file: iac-pulumi.md
    type: primary
    focus: Detect Pulumi misconfigurations including plaintext secrets in config, unencrypted state backends, missing ComponentResource grouping, unpinned provider versions, and leaking stack outputs
    tags:
      - pulumi
      - iac
      - secrets
      - state
      - componentresource
      - tags
      - providers
      - crossguard
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
  - id: iac-terraform
    file: iac-terraform.md
    type: primary
    focus: "Detect Terraform misconfigurations including unpinned module/provider versions, local state backends, hardcoded secrets, missing lifecycle guards on stateful resources, and count/for_each misuse"
    tags:
      - terraform
      - iac
      - hcl
      - state
      - modules
      - providers
      - secrets
      - lifecycle
      - fmt
      - validate
  - id: k8s-admission-opa-kyverno-gatekeeper
    file: k8s-admission-opa-kyverno-gatekeeper.md
    type: primary
    focus: Detect misconfigured Kubernetes admission policies including audit-mode-only enforcement, missing critical controls, overly broad exclusions, and untested policy logic
    tags:
      - kubernetes
      - admission
      - opa
      - gatekeeper
      - kyverno
      - rego
      - cel
      - policy
      - webhook
      - governance
  - id: k8s-helm-chart-quality
    file: k8s-helm-chart-quality.md
    type: primary
    focus: Detect Helm chart pitfalls including hardcoded values in templates, missing defaults, absent schema validation, deprecated APIs, missing labels, and untested charts
    tags:
      - kubernetes
      - helm
      - chart
      - values
      - templates
      - quality
      - labels
      - hooks
      - schema
  - id: k8s-kustomize-discipline
    file: k8s-kustomize-discipline.md
    type: primary
    focus: Detect Kustomize anti-patterns including full-manifest patches, unpinned remote bases, missing namespace overlays, stale configMaps, and overlay complexity obscuring intent
    tags:
      - kubernetes
      - kustomize
      - overlay
      - patch
      - configmap
      - base
      - gitops
      - configuration
  - id: k8s-manifest-correctness
    file: k8s-manifest-correctness.md
    type: primary
    focus: Detect Kubernetes manifest misconfigurations including missing resource limits, absent probes, insecure securityContext, missing disruption budgets, and image hygiene issues
    tags:
      - kubernetes
      - k8s
      - manifest
      - resources
      - probes
      - security-context
      - pdb
      - image
      - correctness
  - id: k8s-network-policies
    file: k8s-network-policies.md
    type: primary
    focus: Detect missing or misconfigured Kubernetes NetworkPolicies including absent default-deny, overly broad selectors, missing DNS egress exceptions, and selector mismatches
    tags:
      - kubernetes
      - network-policy
      - network-segmentation
      - microsegmentation
      - ingress
      - egress
      - zero-trust
  - id: k8s-operator-and-crd-design
    file: k8s-operator-and-crd-design.md
    type: primary
    focus: Detect Kubernetes operator and CRD design flaws including non-idempotent reconcilers, missing finalizers, absent status updates, overly broad watches, and CRD validation gaps
    tags:
      - kubernetes
      - operator
      - crd
      - controller
      - reconciler
      - kubebuilder
      - controller-runtime
      - finalizer
      - status
  - id: k8s-pod-security-standards
    file: k8s-pod-security-standards.md
    type: primary
    focus: Detect pods violating Kubernetes Pod Security Standards including running as root, privileged mode, missing seccomp profiles, undropped capabilities, and absent PSA namespace labels
    tags:
      - kubernetes
      - pod-security
      - psa
      - pss
      - seccomp
      - capabilities
      - apparmor
      - selinux
      - hardening
      - CWE-250
      - gcp
      - gke
      - workload-identity
      - network-policy
      - binary-authorization
  - id: k8s-rbac
    file: k8s-rbac.md
    type: primary
    focus: Detect overly permissive Kubernetes RBAC configurations including wildcard verbs, cluster-admin bindings, escalation paths, and service account misuse
    tags:
      - kubernetes
      - rbac
      - clusterrole
      - rolebinding
      - serviceaccount
      - security
      - least-privilege
      - authorization
  - id: k8s-service-mesh-istio-linkerd-consul
    file: k8s-service-mesh-istio-linkerd-consul.md
    type: primary
    focus: Detect service mesh misconfigurations including permissive mTLS, missing authorization policies, absent timeouts and circuit breakers, unenforced sidecar injection, and mesh bypass vectors
    tags:
      - kubernetes
      - service-mesh
      - istio
      - linkerd
      - consul
      - mtls
      - authorization
      - circuit-breaker
      - sidecar
      - envoy
      - ambassador
      - proxy
      - cross-cutting
      - architecture
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Infrastructure

**Focus:** infrastructure: Detect Docker Compose pitfalls including missing healthchecks, unguarded depends_on, host path mounts without read-only, secrets in environment, missing resource limits, and privileged mode; Detect container image securit...

## Children

| File | Type | Focus |
|------|------|-------|
| [container-docker-compose-discipline.md](container-docker-compose-discipline.md) | 📄 primary | Detect Docker Compose pitfalls including missing healthchecks, unguarded depends_on, host path mounts without read-only, secrets in environment, missing resource limits, and privileged mode |
| [container-image-hardening.md](container-image-hardening.md) | 📄 primary | Detect container image security and hygiene issues including running as root, unpinned base images, missing multi-stage builds, secrets in layers, and unnecessary packages |
| [container-image-scanning-trivy-grype-clair.md](container-image-scanning-trivy-grype-clair.md) | 📄 primary | Detect gaps in container image vulnerability scanning including missing CI integration, ignored critical findings, scan-only-at-build patterns, and incomplete package coverage |
| [container-runtime-gvisor-kata-sysbox.md](container-runtime-gvisor-kata-sysbox.md) | 📄 primary | Detect sandboxed container runtime misconfigurations including workloads missing RuntimeClass, gVisor syscall compatibility gaps, Kata nested virtualization issues, and missing fallback runtime strategies |
| [iac-ansible.md](iac-ansible.md) | 📄 primary | Detect Ansible misconfigurations including plaintext passwords in variables, missing privilege escalation controls, unnotified handlers, roles without tests, hardcoded hosts, missing vault encryption, and idempotency violations |
| [iac-argocd.md](iac-argocd.md) | 📄 primary | Detect Argo CD misconfigurations including sync policy gaps, missing health checks, overly permissive RBAC, ApplicationSet without progressive rollout, and secrets in Application manifests |
| [iac-bicep-arm.md](iac-bicep-arm.md) | 📄 primary | Detect Bicep and ARM template misconfigurations including hardcoded secrets, missing parameter defaults and validation, unversioned Bicep modules, missing resource locks, and deployment mode risks |
| [iac-chef-puppet-salt.md](iac-chef-puppet-salt.md) | 📄 primary | Detect Chef, Puppet, and Salt misconfigurations including hardcoded credentials in recipes and manifests, missing test coverage, non-idempotent resources, incomplete metadata, and state ordering issues |
| [iac-cloudformation-sam-cdk.md](iac-cloudformation-sam-cdk.md) | 📄 primary | Detect CloudFormation, SAM, and CDK misconfigurations including hardcoded secrets in templates, missing DeletionPolicy on stateful resources, absent drift detection, CDK L1 overuse, missing stack tags, and no rollback triggers |
| [iac-crossplane.md](iac-crossplane.md) | 📄 primary | Detect Crossplane misconfigurations including untested compositions, missing providerConfigRef, absent deletion policies, XRD validation gaps, claim namespace issues, and non-idempotent patches |
| [iac-drift-detection.md](iac-drift-detection.md) | 📄 primary | Detect missing or misconfigured infrastructure drift detection including absent drift checks, non-actionable alerts, missing automated remediation, unreconciled manual changes, unscheduled state refresh, and missing drift reports in CI |
| [iac-fluxcd.md](iac-fluxcd.md) | 📄 primary | Detect Flux CD misconfigurations including unpinned source references, missing notification providers, Kustomization without health checks, absent suspend capability, HelmRelease validation gaps, and aggressive reconciliation intervals |
| [iac-nix.md](iac-nix.md) | 📄 primary | Detect Nix and NixOS misconfigurations including unpinned flake inputs, impure derivations, missing flake checks, large closure sizes, uncached store paths in CI, missing devShell, and unfree package allowances |
| [iac-pulumi.md](iac-pulumi.md) | 📄 primary | Detect Pulumi misconfigurations including plaintext secrets in config, unencrypted state backends, missing ComponentResource grouping, unpinned provider versions, and leaking stack outputs |
| [iac-secrets-sops-sealed-secrets-vault.md](iac-secrets-sops-sealed-secrets-vault.md) | 📄 primary | Detect misconfigurations in SOPS, Sealed Secrets, and HashiCorp Vault including missing key rotation, outdated controllers, overly broad Vault policies, unencrypted secrets at rest, missing rotation schedules, plaintext secrets in git history, and absent audit trails |
| [iac-terraform.md](iac-terraform.md) | 📄 primary | Detect Terraform misconfigurations including unpinned module/provider versions, local state backends, hardcoded secrets, missing lifecycle guards on stateful resources, and count/for_each misuse |
| [k8s-admission-opa-kyverno-gatekeeper.md](k8s-admission-opa-kyverno-gatekeeper.md) | 📄 primary | Detect misconfigured Kubernetes admission policies including audit-mode-only enforcement, missing critical controls, overly broad exclusions, and untested policy logic |
| [k8s-helm-chart-quality.md](k8s-helm-chart-quality.md) | 📄 primary | Detect Helm chart pitfalls including hardcoded values in templates, missing defaults, absent schema validation, deprecated APIs, missing labels, and untested charts |
| [k8s-kustomize-discipline.md](k8s-kustomize-discipline.md) | 📄 primary | Detect Kustomize anti-patterns including full-manifest patches, unpinned remote bases, missing namespace overlays, stale configMaps, and overlay complexity obscuring intent |
| [k8s-manifest-correctness.md](k8s-manifest-correctness.md) | 📄 primary | Detect Kubernetes manifest misconfigurations including missing resource limits, absent probes, insecure securityContext, missing disruption budgets, and image hygiene issues |
| [k8s-network-policies.md](k8s-network-policies.md) | 📄 primary | Detect missing or misconfigured Kubernetes NetworkPolicies including absent default-deny, overly broad selectors, missing DNS egress exceptions, and selector mismatches |
| [k8s-operator-and-crd-design.md](k8s-operator-and-crd-design.md) | 📄 primary | Detect Kubernetes operator and CRD design flaws including non-idempotent reconcilers, missing finalizers, absent status updates, overly broad watches, and CRD validation gaps |
| [k8s-pod-security-standards.md](k8s-pod-security-standards.md) | 📄 primary | Detect pods violating Kubernetes Pod Security Standards including running as root, privileged mode, missing seccomp profiles, undropped capabilities, and absent PSA namespace labels |
| [k8s-rbac.md](k8s-rbac.md) | 📄 primary | Detect overly permissive Kubernetes RBAC configurations including wildcard verbs, cluster-admin bindings, escalation paths, and service account misuse |
| [k8s-service-mesh-istio-linkerd-consul.md](k8s-service-mesh-istio-linkerd-consul.md) | 📄 primary | Detect service mesh misconfigurations including permissive mTLS, missing authorization policies, absent timeouts and circuit breakers, unenforced sidecar injection, and mesh bypass vectors |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
