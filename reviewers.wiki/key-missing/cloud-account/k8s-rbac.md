---
id: k8s-rbac
type: primary
depth_role: leaf
focus: Detect overly permissive Kubernetes RBAC configurations including wildcard verbs, cluster-admin bindings, escalation paths, and service account misuse
parents:
  - index.md
covers:
  - "ClusterRole with wildcard verbs (*) granting all operations"
  - ClusterRoleBinding to default service account -- every pod in the namespace inherits permissions
  - "Role with escalation verbs (bind, impersonate, escalate) enabling privilege escalation"
  - ServiceAccount token auto-mounted when not needed -- unnecessary credential exposure
  - cluster-admin bound to workload identity -- full cluster control from a pod
  - Missing RBAC for custom CRDs -- no access control on custom resources
  - "Overly broad namespace-level permissions (all resources, all verbs)"
  - Service account shared across unrelated workloads -- blast radius expansion
  - RoleBinding granting access to secrets without justification
  - Subject referencing a Group that includes all authenticated users
tags:
  - kubernetes
  - rbac
  - clusterrole
  - rolebinding
  - serviceaccount
  - security
  - least-privilege
  - authorization
activation:
  file_globs:
    - "**/*.yaml"
    - "**/*.yml"
    - "**/k8s/**"
    - "**/kubernetes/**"
    - "**/manifests/**"
  keyword_matches:
    - ClusterRole
    - ClusterRoleBinding
    - Role
    - RoleBinding
    - ServiceAccount
    - rbac.authorization.k8s.io
    - subjects
    - rules
    - verbs
    - resources
    - apiGroups
  structural_signals:
    - "kind: ClusterRole"
    - "kind: ClusterRoleBinding"
    - "kind: Role"
    - "kind: RoleBinding"
    - "kind: ServiceAccount"
source:
  origin: file
  path: k8s-rbac.md
  hash: "sha256:891170da0fb43f25e1079cbd000411a5fd828619861c813e317740db745dbb6f"
---
# Kubernetes RBAC

## When This Activates

Activates on diffs touching Kubernetes RBAC resources (ClusterRole, ClusterRoleBinding, Role, RoleBinding, ServiceAccount). Kubernetes RBAC is deny-by-default, but a single overly permissive binding can grant an attacker full cluster control. Wildcard verbs on a ClusterRole mean every API operation is allowed; binding cluster-admin to a workload service account means a compromised pod owns the entire cluster; and auto-mounted tokens give every pod credentials it may never need. This reviewer detects RBAC misconfigurations that widen the blast radius of any compromise.

## Audit Surface

- [ ] ClusterRole with verbs: ['*'] or resources: ['*']
- [ ] ClusterRoleBinding binding to ServiceAccount named 'default'
- [ ] Role or ClusterRole with escalation verbs (bind, impersonate, escalate)
- [ ] Pod spec without automountServiceAccountToken: false
- [ ] ClusterRoleBinding referencing cluster-admin for workload identity
- [ ] Custom CRD without corresponding RBAC Role/ClusterRole
- [ ] Role with resources: ['*'] and verbs: ['*'] in a namespace
- [ ] Multiple unrelated Deployments sharing a ServiceAccount
- [ ] Role granting get/list/watch on secrets without documented need
- [ ] ClusterRoleBinding with subject 'system:authenticated'
- [ ] ServiceAccount with no corresponding RoleBinding (unused)
- [ ] RoleBinding in kube-system granting access to non-system workloads

## Detailed Checks

### Wildcard and Overly Broad Permissions
<!-- activation: keywords=["verbs", "resources", "apiGroups", "*", "wildcard", "rules"] -->

- [ ] **Wildcard verbs**: flag ClusterRole or Role rules with `verbs: ["*"]` -- this grants create, get, list, watch, update, patch, delete, and deletecollection on the matched resources; enumerate the specific verbs needed
- [ ] **Wildcard resources**: flag rules with `resources: ["*"]` -- this matches every resource type in the API group, including secrets, configmaps, and custom resources; list only the resources the workload needs
- [ ] **Wildcard apiGroups**: flag rules with `apiGroups: ["*"]` combined with broad resources or verbs -- this spans every API group including RBAC itself, enabling self-escalation
- [ ] **Namespace-scoped wildcard Role**: flag Role (not ClusterRole) with `resources: ["*"]` and `verbs: ["*"]` -- even namespace-scoped, this grants access to all secrets, configmaps, and pods in the namespace

### Privilege Escalation Paths
<!-- activation: keywords=["bind", "impersonate", "escalate", "cluster-admin", "system:masters", "system:authenticated", "escalation"] -->

- [ ] **Escalation verbs**: flag roles containing `bind`, `impersonate`, or `escalate` verbs -- `bind` allows attaching any role to any subject, `impersonate` allows acting as any user/group, `escalate` allows modifying roles to add permissions the modifier does not hold
- [ ] **cluster-admin bound to workload**: flag ClusterRoleBinding that binds the built-in `cluster-admin` ClusterRole to a ServiceAccount used by application workloads -- a compromised pod gains unrestricted cluster access
- [ ] **system:masters group binding**: flag any RoleBinding or ClusterRoleBinding referencing the `system:masters` group -- this group bypasses all RBAC checks and cannot be restricted by admission controllers
- [ ] **system:authenticated as subject**: flag ClusterRoleBinding with `kind: Group, name: system:authenticated` -- this includes every authenticated user and service account, effectively granting the role to all pods in the cluster

### Service Account Hygiene
<!-- activation: keywords=["ServiceAccount", "serviceAccountName", "automountServiceAccountToken", "default", "token", "secret"] -->

- [ ] **Default service account used**: flag pods or ClusterRoleBindings referencing the `default` ServiceAccount -- every pod in the namespace inherits any permissions granted to it; create dedicated service accounts per workload
- [ ] **Token auto-mounted unnecessarily**: flag pod specs without `automountServiceAccountToken: false` -- most pods do not need to call the Kubernetes API; auto-mounted tokens are attack surface for SSRF and container escape
- [ ] **Shared service account across unrelated workloads**: flag multiple Deployments, StatefulSets, or Jobs referencing the same ServiceAccount when the workloads serve different purposes -- a compromise of one workload grants the RBAC permissions of all
- [ ] **Unused service account**: flag ServiceAccount resources with no matching pod spec referenceAccountName or RoleBinding -- orphaned accounts add confusion and may later be mistakenly granted permissions

### Secrets Access
<!-- activation: keywords=["secrets", "configmaps", "get", "list", "watch", "create", "patch"] -->

- [ ] **Broad secrets access**: flag roles granting get, list, or watch on `secrets` resource without a documented reason -- secrets contain TLS keys, database passwords, and API tokens; access should be tightly scoped
- [ ] **Secrets create/update permissions**: flag roles granting create, update, or patch on secrets -- write access to secrets allows injecting malicious credentials or overwriting TLS certificates
- [ ] **ConfigMap write in kube-system**: flag roles granting update or patch on configmaps in kube-system -- certain configmaps (e.g., kube-proxy, coredns) control cluster-level behavior

### Custom Resource RBAC
<!-- activation: keywords=["CustomResourceDefinition", "CRD", "apiextensions", "custom", "operator"] -->

- [ ] **CRD without RBAC**: flag custom CRDs that define new resource types but have no corresponding Role or ClusterRole restricting access -- by default, cluster-admin can access them but no other roles can, leading teams to grant overly broad access as a workaround
- [ ] **Operator with cluster-wide permissions**: flag operator service accounts with ClusterRole bindings when the operator only manages resources in specific namespaces -- scope to Role + RoleBinding per namespace

## Common False Positives

- **System controllers**: kube-controller-manager, kube-scheduler, and other system components require broad permissions by design. Only flag RBAC for application workloads.
- **Operator frameworks**: Operators (OLM, Helm-based, Kubebuilder) often require cluster-wide access to manage CRDs and watch all namespaces. Verify the operator's RBAC matches its documented requirements.
- **CI/CD deploy accounts**: deployment service accounts may need broad create/update permissions during rollout. Flag if the account remains bound after deployment completes.
- **Namespace admin roles**: platform teams may define a namespace-admin ClusterRole for team autonomy. This is valid when scoped via RoleBinding to a single namespace, not via ClusterRoleBinding.

## Severity Guidance

| Finding | Severity |
|---|---|
| cluster-admin bound to workload ServiceAccount | Critical |
| ClusterRole with wildcard verbs and wildcard resources | Critical |
| Escalation verbs (bind, impersonate, escalate) granted to workload | Critical |
| system:authenticated group granted non-trivial permissions | Critical |
| ClusterRoleBinding to default ServiceAccount | Important |
| Broad secrets access without justification | Important |
| Service account token auto-mounted unnecessarily | Important |
| Shared service account across unrelated workloads | Important |
| Namespace-scoped wildcard Role | Important |
| Custom CRD without corresponding RBAC definitions | Minor |
| Unused ServiceAccount with no bindings | Minor |
| Operator with cluster-wide permissions when namespace-scoped suffices | Minor |

## See Also

- `sec-owasp-a01-broken-access-control` -- broken access control principles applicable to Kubernetes RBAC
- `k8s-manifest-correctness` -- workload-level securityContext complements RBAC controls
- `k8s-pod-security-standards` -- Pod Security Admission enforces security boundaries alongside RBAC
- `cloud-gcp-gke` -- GKE-specific RBAC and Workload Identity integration
- `cloud-azure-managed-identity-aks` -- AKS-specific Azure AD RBAC integration

## Authoritative References

- [Kubernetes Documentation: Using RBAC Authorization](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- [Kubernetes Documentation: Service Accounts](https://kubernetes.io/docs/concepts/security/service-accounts/)
- [NSA/CISA Kubernetes Hardening Guide -- RBAC Section](https://media.defense.gov/2022/Aug/29/2003066362/-1/-1/0/CTR_KUBERNETES_HARDENING_GUIDANCE_1.2_20220829.PDF)
- [Kubernetes RBAC Good Practices](https://kubernetes.io/docs/concepts/security/rbac-good-practices/)
