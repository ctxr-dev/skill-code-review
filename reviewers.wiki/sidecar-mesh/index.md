---
id: sidecar-mesh
type: index
depth_role: subcategory
depth: 1
focus: "Ambassador introducing single point of failure between service and external dependency; Ambassador modifying request/response semantics beyond protocol-level concerns; Ambassador not transparent to the primary service -- service knows about ambassador internals; Bases referenced by URL without pinned commit or tag"
parents:
  - "../index.md"
shared_covers: []
tags:
  - kubernetes
entries:
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

# Sidecar Mesh

**Focus:** Ambassador introducing single point of failure between service and external dependency; Ambassador modifying request/response semantics beyond protocol-level concerns; Ambassador not transparent to the primary service -- service knows about ambassador internals; Bases referenced by URL without pinned commit or tag

## Children

| File | Type | Focus |
|------|------|-------|
| [iac-fluxcd.md](iac-fluxcd.md) | 📄 primary | Detect Flux CD misconfigurations including unpinned source references, missing notification providers, Kustomization without health checks, absent suspend capability, HelmRelease validation gaps, and aggressive reconciliation intervals |
| [k8s-kustomize-discipline.md](k8s-kustomize-discipline.md) | 📄 primary | Detect Kustomize anti-patterns including full-manifest patches, unpinned remote bases, missing namespace overlays, stale configMaps, and overlay complexity obscuring intent |
| [k8s-manifest-correctness.md](k8s-manifest-correctness.md) | 📄 primary | Detect Kubernetes manifest misconfigurations including missing resource limits, absent probes, insecure securityContext, missing disruption budgets, and image hygiene issues |
| [k8s-network-policies.md](k8s-network-policies.md) | 📄 primary | Detect missing or misconfigured Kubernetes NetworkPolicies including absent default-deny, overly broad selectors, missing DNS egress exceptions, and selector mismatches |
| [k8s-service-mesh-istio-linkerd-consul.md](k8s-service-mesh-istio-linkerd-consul.md) | 📄 primary | Detect service mesh misconfigurations including permissive mTLS, missing authorization policies, absent timeouts and circuit breakers, unenforced sidecar injection, and mesh bypass vectors |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
