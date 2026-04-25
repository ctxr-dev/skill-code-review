---
id: k8s-network-policies
type: primary
depth_role: leaf
focus: Detect missing or misconfigured Kubernetes NetworkPolicies including absent default-deny, overly broad selectors, missing DNS egress exceptions, and selector mismatches
parents:
  - index.md
covers:
  - Missing default-deny NetworkPolicy -- all pod-to-pod traffic allowed by default
  - NetworkPolicy allowing all ingress or egress via empty rules
  - Missing egress restriction -- pods can reach the public internet
  - "Overly broad podSelector ({}) matching all pods in namespace"
  - Missing DNS egress exception causing pod DNS resolution failure
  - "ipBlock with /0 CIDR -- allows traffic from or to any IP address"
  - Namespace isolation not enforced -- no policies in application namespaces
  - NetworkPolicy selector not matching any pods -- ineffective policy
  - Ingress rule without port restriction -- all ports exposed
  - Missing namespaceSelector on ingress -- cross-namespace access unrestricted
tags:
  - kubernetes
  - network-policy
  - network-segmentation
  - microsegmentation
  - ingress
  - egress
  - zero-trust
activation:
  file_globs:
    - "**/*.yaml"
    - "**/*.yml"
    - "**/k8s/**"
    - "**/kubernetes/**"
    - "**/manifests/**"
  keyword_matches:
    - NetworkPolicy
    - networkpolicy
    - ingress
    - egress
    - podSelector
    - namespaceSelector
    - ipBlock
    - policyTypes
  structural_signals:
    - "kind: NetworkPolicy"
    - "apiVersion: networking.k8s.io"
source:
  origin: file
  path: k8s-network-policies.md
  hash: "sha256:bc540a02b4ea8a4a33b779272734ed23e8e28654f732d5918b70061bba09c450"
---
# Kubernetes Network Policies

## When This Activates

Activates on diffs touching NetworkPolicy resources, namespace definitions, or workload manifests in namespaces that should have network segmentation. Kubernetes allows all pod-to-pod traffic by default -- there is no firewall between workloads unless NetworkPolicies are explicitly applied. A missing default-deny policy means a compromised pod can reach every other pod in the cluster, exfiltrate data to the internet, and scan internal services. This reviewer detects network policy gaps that leave the cluster's east-west and north-south traffic uncontrolled.

## Audit Surface

- [ ] Namespace with workloads but no NetworkPolicy resources
- [ ] No default-deny-all ingress NetworkPolicy in namespace
- [ ] No default-deny-all egress NetworkPolicy in namespace
- [ ] NetworkPolicy with empty ingress rule (- {}) allowing all sources
- [ ] NetworkPolicy with empty egress rule (- {}) allowing all destinations
- [ ] podSelector: {} on allow-rule matching all pods in namespace
- [ ] Egress policy without exception for kube-dns (UDP/TCP 53)
- [ ] ipBlock with cidr: 0.0.0.0/0 without except clause
- [ ] NetworkPolicy labels not matching any existing pod labels
- [ ] Ingress rule without ports field -- all ports open
- [ ] Missing namespaceSelector allowing cross-namespace ingress
- [ ] policyTypes missing egress -- egress unrestricted

## Detailed Checks

### Default-Deny Foundation
<!-- activation: keywords=["default-deny", "deny-all", "default", "deny", "policyTypes", "Ingress", "Egress"] -->

- [ ] **Missing default-deny ingress**: flag namespaces containing workload pods but no NetworkPolicy with `podSelector: {}` and `policyTypes: [Ingress]` with empty ingress rules -- without this, all ingress is allowed and individual allow-policies have no deny baseline to restrict against
- [ ] **Missing default-deny egress**: flag namespaces without an egress-deny-all policy -- without default-deny egress, any pod can make outbound connections to the internet, internal services, and cloud metadata APIs
- [ ] **policyTypes omitting Egress**: flag NetworkPolicies that specify ingress rules but do not include Egress in policyTypes -- the absence of Egress in policyTypes means egress is completely unrestricted even though the policy appears to be in place
- [ ] **Deny-all policy only at cluster level**: flag clusters relying solely on a cluster-wide deny-all without per-namespace policies -- namespace-level policies document intent and survive namespace migrations

### Overly Permissive Rules
<!-- activation: keywords=["ingress", "egress", "from", "to", "allow", "podSelector", "namespaceSelector", "ipBlock", "ports"] -->

- [ ] **Empty ingress rule (allow-all)**: flag NetworkPolicy with `ingress: [{}]` -- an empty from-rule matches all sources, effectively disabling ingress restriction for the selected pods
- [ ] **Empty egress rule (allow-all)**: flag NetworkPolicy with `egress: [{}]` -- an empty to-rule matches all destinations, effectively disabling egress restriction
- [ ] **podSelector: {} in allow-rule**: flag allow rules using `podSelector: {}` (empty selector) -- this matches every pod in the namespace; specify labels to match only intended peers
- [ ] **ipBlock 0.0.0.0/0**: flag ipBlock rules with `cidr: 0.0.0.0/0` without a narrow except clause -- this allows traffic from or to any IP address, including the public internet and cloud metadata endpoints (169.254.169.254)
- [ ] **Ingress without port restriction**: flag ingress rules that specify source selectors but omit the ports field -- all ports on the target pod are exposed to the matched sources; always specify the exact ports needed

### DNS and Essential Egress
<!-- activation: keywords=["dns", "kube-dns", "coredns", "53", "kube-system", "UDP", "TCP"] -->

- [ ] **Missing DNS egress exception**: flag default-deny egress policies without an egress rule allowing UDP and TCP port 53 to the kube-dns pods (typically in kube-system) -- blocking DNS breaks all name resolution, causing cascading failures across the namespace
- [ ] **DNS exception too broad**: flag DNS egress rules that allow port 53 to all destinations instead of scoping to kube-system namespace -- an overly broad DNS rule allows DNS-based data exfiltration to external resolvers
- [ ] **Missing metadata API block**: flag egress policies that allow 0.0.0.0/0 without excepting 169.254.169.254/32 -- cloud metadata APIs expose instance credentials and should be explicitly blocked unless workloads use instance metadata (e.g., for Workload Identity)

### Selector Correctness
<!-- activation: keywords=["podSelector", "matchLabels", "matchExpressions", "labels", "selector", "namespace"] -->

- [ ] **Selector matches no pods**: flag NetworkPolicy whose podSelector labels do not match any existing Deployment, StatefulSet, or DaemonSet pod template labels in the same namespace -- the policy exists but protects nothing
- [ ] **Stale selectors after label refactoring**: flag NetworkPolicies whose selectors reference label keys or values that were changed in the same diff -- the policy becomes ineffective after the label change
- [ ] **Missing namespaceSelector on cross-namespace ingress**: flag ingress rules that use podSelector without namespaceSelector -- without namespaceSelector, the rule matches pods only in the NetworkPolicy's own namespace, which may not be the intent
- [ ] **Namespace selector matches all namespaces**: flag ingress or egress rules with `namespaceSelector: {}` -- this matches every namespace in the cluster, including kube-system and untrusted tenant namespaces

### Egress Restriction for Sensitive Workloads
<!-- activation: keywords=["egress", "external", "internet", "database", "backend", "service", "cidr", "except"] -->

- [ ] **Database workloads with internet egress**: flag Deployments labeled as database or stateful workloads in namespaces without egress restrictions -- databases should never initiate outbound internet connections
- [ ] **No egress restriction to internal services**: flag namespaces where egress allows traffic to all cluster-internal IPs -- restrict egress to the specific services the workload needs (e.g., only the database namespace)
- [ ] **Missing egress to monitoring stack**: flag egress-restricted namespaces without exceptions for Prometheus scraping, log collectors, or tracing endpoints -- monitoring becomes blind in locked-down namespaces

## Common False Positives

- **Service mesh enforcement**: Istio, Linkerd, and Consul enforce network policies at the mesh layer via mTLS and AuthorizationPolicy. If a service mesh is in place, Kubernetes NetworkPolicies may be redundant for east-west traffic.
- **CNI plugin limitations**: not all CNI plugins support NetworkPolicy (e.g., Flannel without Calico). Flag the absence of policies but note that enforcement depends on the CNI.
- **Ingress controller namespace**: the ingress controller namespace may legitimately need broad egress to reach backends in all namespaces.
- **Monitoring namespaces**: Prometheus, Grafana, and logging agents often need wide ingress access to scrape metrics from all namespaces.
- **kube-system namespace**: system components in kube-system may not have NetworkPolicies by design. Flag only application namespaces.

## Severity Guidance

| Finding | Severity |
|---|---|
| No default-deny ingress in namespace with sensitive workloads | Critical |
| No default-deny egress -- pods can reach internet freely | Critical |
| ipBlock 0.0.0.0/0 in ingress without except clause | Critical |
| NetworkPolicy with empty ingress/egress rules (allow-all) | Important |
| Missing DNS egress exception (breaks all name resolution) | Important |
| Egress to cloud metadata API (169.254.169.254) not blocked | Important |
| podSelector: {} in allow-rule matching all namespace pods | Important |
| NetworkPolicy selector not matching any pods | Important |
| Ingress rule without port restriction | Minor |
| Namespace selector matches all namespaces in allow-rule | Minor |
| Missing egress exception for monitoring stack | Minor |

## See Also

- `k8s-manifest-correctness` -- workload-level manifest checks complement network segmentation
- `k8s-pod-security-standards` -- hostNetwork: true bypasses NetworkPolicies entirely
- `k8s-service-mesh-istio-linkerd-consul` -- mesh-layer network controls supplement or replace NetworkPolicies
- `sec-owasp-a05-misconfiguration` -- missing network segmentation is a misconfiguration
- `sec-owasp-a01-broken-access-control` -- network-level access control enforcement

## Authoritative References

- [Kubernetes Documentation: Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [Kubernetes Documentation: Declare Network Policy](https://kubernetes.io/docs/tasks/administer-cluster/declare-network-policy/)
- [Calico Documentation: Kubernetes Network Policy](https://docs.tigera.io/calico/latest/network-policy/)
- [Cilium Documentation: Network Policies](https://docs.cilium.io/en/stable/security/policy/)
- [NSA/CISA Kubernetes Hardening Guide -- Network Separation](https://media.defense.gov/2022/Aug/29/2003066362/-1/-1/0/CTR_KUBERNETES_HARDENING_GUIDANCE_1.2_20220829.PDF)
