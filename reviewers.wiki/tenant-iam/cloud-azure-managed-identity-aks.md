---
id: cloud-azure-managed-identity-aks
type: primary
depth_role: leaf
focus: Detect ClientSecretCredential usage instead of Managed Identity, overly broad Azure RBAC, and AKS cluster misconfigurations for identity and networking
parents:
  - index.md
covers:
  - ClientSecretCredential used instead of ManagedIdentity or DefaultAzureCredential
  - "Overly broad RBAC role assignment (Contributor/Owner at subscription scope)"
  - AKS cluster without managed identity enabled
  - Missing Azure AD integration for AKS RBAC
  - Missing network policy in AKS cluster
  - AKS without private cluster configuration
  - Missing pod identity or workload identity for pod-level Azure access
  - Key Vault access without managed identity
  - Service principal secret stored in code or config
  - Missing Azure Policy for AKS governance
tags:
  - azure
  - managed-identity
  - aks
  - rbac
  - workload-identity
  - key-vault
  - cloud-security
activation:
  file_globs:
    - "**/*.tf"
    - "**/*.yaml"
    - "**/*.yml"
    - "**/*.py"
    - "**/*.cs"
    - "**/*.ts"
    - "**/*.js"
    - "**/*.json"
    - "**/*.bicep"
  keyword_matches:
    - azure
    - Azure
    - ManagedIdentity
    - managedIdentity
    - AKS
    - aks
    - DefaultAzureCredential
    - ClientSecretCredential
    - AZURE_CLIENT_ID
    - AZURE_TENANT_ID
    - rbac
  structural_signals:
    - azurerm_kubernetes_cluster
    - azurerm_role_assignment
    - ManagedIdentityCredential
source:
  origin: file
  path: cloud-azure-managed-identity-aks.md
  hash: "sha256:9d0f538db6809c6aa516bb185e2a1915734581c7c4231ac001091f949c12f8a9"
---
# Azure Managed Identity and AKS

## When This Activates

Activates on diffs involving Azure authentication code, RBAC role assignments, AKS cluster definitions, or Terraform/Bicep resources for Azure identity and Kubernetes. Azure Managed Identity eliminates the need for service principal secrets -- yet teams frequently use ClientSecretCredential with long-lived secrets that are committed to repositories, stored in CI variables, and never rotated. AKS clusters without managed identity fall back to service principals, without Azure AD integration lack centralized RBAC, and without private cluster configuration expose the API server to the internet. This reviewer detects diff-visible signals of Azure identity and AKS security violations.

## Audit Surface

- [ ] ClientSecretCredential or client_secret in authentication code
- [ ] Contributor or Owner role at subscription or management group scope
- [ ] AKS cluster without managed identity (identity type)
- [ ] AKS without Azure AD RBAC integration (aadProfile)
- [ ] AKS cluster without network policy (azure or calico)
- [ ] AKS cluster without private cluster enabled
- [ ] Pod accessing Azure resources without workload identity annotations
- [ ] Key Vault SecretClient created with ClientSecretCredential
- [ ] AZURE_CLIENT_SECRET in environment variables or config files
- [ ] AKS without Azure Policy add-on
- [ ] Role assignment without condition or scope narrowing
- [ ] DefaultAzureCredential fallback chain picking up secret from env

## Detailed Checks

### Managed Identity Over Secrets
<!-- activation: keywords=["ClientSecretCredential", "client_secret", "ManagedIdentityCredential", "DefaultAzureCredential", "AZURE_CLIENT_SECRET", "ServicePrincipal"] -->

- [ ] **ClientSecretCredential in code**: flag direct use of ClientSecretCredential -- replace with DefaultAzureCredential (which prefers Managed Identity automatically) or ManagedIdentityCredential explicitly
- [ ] **Service principal secret in config**: flag AZURE_CLIENT_SECRET in environment variables, appsettings.json, or config files -- Managed Identity obtains tokens from the Azure metadata service without any secret
- [ ] **DefaultAzureCredential with secret fallback**: flag code using DefaultAzureCredential alongside AZURE_CLIENT_SECRET in environment -- the fallback chain will use the secret rather than Managed Identity; remove the secret to force MI usage
- [ ] **Key Vault accessed with secrets**: flag Key Vault client initialization using ClientSecretCredential -- Key Vault should always be accessed via Managed Identity to avoid the circular dependency of secrets protecting secrets

### Azure RBAC Scope and Roles
<!-- activation: keywords=["role_assignment", "roleAssignment", "Contributor", "Owner", "Reader", "subscription", "scope", "condition"] -->

- [ ] **Broad role at subscription scope**: flag Contributor or Owner role assignments scoped to an entire subscription or management group -- scope roles to the specific resource group or resource
- [ ] **Owner on automation identity**: flag Owner role on service principals or managed identities -- automated workloads should never have Owner; use Contributor at resource-group scope or custom roles
- [ ] **Missing role assignment conditions**: flag role assignments without conditions when Azure ABAC is available -- conditions restrict when the role applies (e.g., only for resources with specific tags)
- [ ] **Reader role for data access**: flag use of Reader role when the intent is to read data (e.g., Storage Blob Data Reader is needed for blob access; Reader only sees management plane metadata)

### AKS Identity Configuration
<!-- activation: keywords=["kubernetes_cluster", "identity", "aadProfile", "managed_identity", "service_principal", "pod_identity", "workload_identity"] -->

- [ ] **AKS without managed identity**: flag AKS clusters with identity type not set or using service principal -- managed identity eliminates credential rotation burden
- [ ] **Missing Azure AD integration**: flag AKS clusters without aadProfile or azure_active_directory_role_based_access_control -- without it, Kubernetes RBAC is disconnected from Azure AD groups and users
- [ ] **Missing workload identity**: flag pods that need Azure resource access but lack azure.workload.identity/use annotation and associated service account -- pod-level identity is more secure than node-level
- [ ] **Local accounts enabled**: flag AKS clusters with local_account_disabled = false -- local accounts bypass Azure AD authentication

### AKS Network Security
<!-- activation: keywords=["networkPolicy", "network_policy", "private_cluster", "apiServerAccessProfile", "authorized_ip_ranges", "loadBalancer"] -->

- [ ] **No network policy**: flag AKS clusters without network_policy set to "azure" or "calico" -- without network policy, all pods can communicate with all other pods
- [ ] **Public API server**: flag AKS clusters without private_cluster_enabled or without api_server_access_profile with authorized_ip_ranges -- the Kubernetes API server should not be accessible from the public internet
- [ ] **Missing egress control**: flag AKS clusters with outbound type "loadBalancer" (default) without Network Security Group restrictions -- unrestricted egress allows data exfiltration from compromised pods

### AKS Governance
<!-- activation: keywords=["azure_policy", "policy_add_on", "opa", "gatekeeper", "admission", "audit"] -->

- [ ] **Missing Azure Policy add-on**: flag AKS clusters without azure_policy_enabled -- Azure Policy enforces organizational standards (no privileged containers, required labels, allowed registries)
- [ ] **No container registry restriction**: flag AKS clusters without a policy restricting allowed container registries -- pods should only pull from trusted ACR instances
- [ ] **Missing diagnostic settings**: flag AKS clusters without diagnostic_setting exporting kube-audit and kube-audit-admin logs -- these logs are essential for security incident investigation

## Common False Positives

- **Local development with DefaultAzureCredential**: DefaultAzureCredential legitimately falls back to Azure CLI, Visual Studio, or environment variables during local development. Flag only when the fallback reaches production.
- **Terraform bootstrap with Owner**: initial Terraform service principal may require Owner temporarily. Acknowledge if there is evidence of post-bootstrap role reduction.
- **Public AKS for development clusters**: non-production clusters may intentionally be public. Flag but note the environment context.
- **AKS with Istio service mesh**: clusters using Istio may enforce network policy at the mesh layer rather than with Kubernetes NetworkPolicy.

## Severity Guidance

| Finding | Severity |
|---|---|
| Service principal secret committed to repository | Critical |
| Owner or Contributor at subscription scope on automation identity | Critical |
| AKS API server publicly accessible without IP restrictions | Critical |
| ClientSecretCredential used when Managed Identity is available | Important |
| AKS without managed identity | Important |
| Missing network policy in AKS | Important |
| Missing Azure AD integration for AKS RBAC | Important |
| Pods without workload identity for Azure access | Important |
| Missing Azure Policy add-on | Minor |
| AKS local accounts not disabled | Minor |
| Missing diagnostic settings for audit logs | Minor |

## See Also

- `cloud-aws-iam-least-privilege` -- AWS equivalent of least-privilege identity review
- `cloud-gcp-iam-and-workload-identity` -- GCP equivalent of workload identity patterns
- `sec-owasp-a01-broken-access-control` -- broken access control patterns across clouds
- `sec-secrets-management-and-rotation` -- secret hygiene and rotation policies

## Authoritative References

- [Microsoft, "Managed Identities for Azure Resources"](https://learn.microsoft.com/en-us/azure/active-directory/managed-identities-azure-resources/overview)
- [Microsoft, "AKS Security Best Practices"](https://learn.microsoft.com/en-us/azure/aks/best-practices)
- [Microsoft, "AKS Workload Identity"](https://learn.microsoft.com/en-us/azure/aks/workload-identity-overview)
- [Microsoft, "Azure RBAC Best Practices"](https://learn.microsoft.com/en-us/azure/role-based-access-control/best-practices)
- [Microsoft, "AKS Network Policies"](https://learn.microsoft.com/en-us/azure/aks/use-network-policies)
