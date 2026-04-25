---
id: secrets-missing
type: index
depth_role: subcategory
depth: 1
focus: .env files committed without .gitignore exclusion; Activity performing non-idempotent operation without idempotency key; Activity without retry policy or timeout configuration; Application targeting HEAD of default branch without revision pinning
parents:
  - "../index.md"
shared_covers: []
entries:
  - id: cicd-merge-queue-and-branch-protection
    file: cicd-merge-queue-and-branch-protection.md
    type: primary
    focus: Detect branch protection and merge queue issues including unprotected main branches, missing required reviews, missing status checks, allowed force push, absent merge queue for high-traffic repos, and missing signed commits
    tags:
      - branch-protection
      - merge-queue
      - code-review
      - ci-cd
      - git
      - governance
      - signed-commits
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
  - id: secrets-workflow
    file: "secrets-workflow/index.md"
    type: index
    focus: .env files committed without .gitignore exclusion; Activity performing non-idempotent operation without idempotency key; Activity without retry policy or timeout configuration; Application targeting HEAD of default branch without revision pinning
children:
  - "secrets-workflow/index.md"
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Secrets Missing

**Focus:** .env files committed without .gitignore exclusion; Activity performing non-idempotent operation without idempotency key; Activity without retry policy or timeout configuration; Application targeting HEAD of default branch without revision pinning

## Children

| File | Type | Focus |
|------|------|-------|
| [cicd-merge-queue-and-branch-protection.md](cicd-merge-queue-and-branch-protection.md) | 📄 primary | Detect branch protection and merge queue issues including unprotected main branches, missing required reviews, missing status checks, allowed force push, absent merge queue for high-traffic repos, and missing signed commits |
| [container-runtime-gvisor-kata-sysbox.md](container-runtime-gvisor-kata-sysbox.md) | 📄 primary | Detect sandboxed container runtime misconfigurations including workloads missing RuntimeClass, gVisor syscall compatibility gaps, Kata nested virtualization issues, and missing fallback runtime strategies |
| [iac-crossplane.md](iac-crossplane.md) | 📄 primary | Detect Crossplane misconfigurations including untested compositions, missing providerConfigRef, absent deletion policies, XRD validation gaps, claim namespace issues, and non-idempotent patches |
| [k8s-admission-opa-kyverno-gatekeeper.md](k8s-admission-opa-kyverno-gatekeeper.md) | 📄 primary | Detect misconfigured Kubernetes admission policies including audit-mode-only enforcement, missing critical controls, overly broad exclusions, and untested policy logic |
| [k8s-helm-chart-quality.md](k8s-helm-chart-quality.md) | 📄 primary | Detect Helm chart pitfalls including hardcoded values in templates, missing defaults, absent schema validation, deprecated APIs, missing labels, and untested charts |
| [k8s-operator-and-crd-design.md](k8s-operator-and-crd-design.md) | 📄 primary | Detect Kubernetes operator and CRD design flaws including non-idempotent reconcilers, missing finalizers, absent status updates, overly broad watches, and CRD validation gaps |
| [k8s-pod-security-standards.md](k8s-pod-security-standards.md) | 📄 primary | Detect pods violating Kubernetes Pod Security Standards including running as root, privileged mode, missing seccomp profiles, undropped capabilities, and absent PSA namespace labels |
| [secrets-workflow/index.md](secrets-workflow/index.md) | 📁 index | .env files committed without .gitignore exclusion; Activity performing non-idempotent operation without idempotency key; Activity without retry policy or timeout configuration; Application targeting HEAD of default branch without revision pinning |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
