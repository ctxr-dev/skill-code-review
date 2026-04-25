---
id: tenant-iam
type: index
depth_role: subcategory
depth: 1
focus: AKS cluster without managed identity enabled; AKS without private cluster configuration; API endpoint accessible without tenant context validation; AdministratorAccess managed policy attached to role or user
parents:
  - "../index.md"
shared_covers: []
entries:
  - id: arch-multi-tenant-saas
    file: arch-multi-tenant-saas.md
    type: primary
    focus: Detect tenant data isolation failures, missing tenant context propagation, cross-tenant query leaks, and tenant-unaware caching
    tags:
      - multi-tenant
      - SaaS
      - tenant-isolation
      - data-leak
      - security
      - caching
      - architecture
  - id: cloud-aws-iam-least-privilege
    file: cloud-aws-iam-least-privilege.md
    type: primary
    focus: Detect overly permissive IAM policies, wildcard actions and resources, missing condition keys, and unsafe trust relationships in AWS IAM configurations
    tags:
      - aws
      - iam
      - least-privilege
      - policy
      - role
      - trust
      - permission-boundary
      - condition-key
  - id: cloud-azure-managed-identity-aks
    file: cloud-azure-managed-identity-aks.md
    type: primary
    focus: Detect ClientSecretCredential usage instead of Managed Identity, overly broad Azure RBAC, and AKS cluster misconfigurations for identity and networking
    tags:
      - azure
      - managed-identity
      - aks
      - rbac
      - workload-identity
      - key-vault
      - cloud-security
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
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Tenant Iam

**Focus:** AKS cluster without managed identity enabled; AKS without private cluster configuration; API endpoint accessible without tenant context validation; AdministratorAccess managed policy attached to role or user

## Children

| File | Type | Focus |
|------|------|-------|
| [arch-multi-tenant-saas.md](arch-multi-tenant-saas.md) | 📄 primary | Detect tenant data isolation failures, missing tenant context propagation, cross-tenant query leaks, and tenant-unaware caching |
| [cloud-aws-iam-least-privilege.md](cloud-aws-iam-least-privilege.md) | 📄 primary | Detect overly permissive IAM policies, wildcard actions and resources, missing condition keys, and unsafe trust relationships in AWS IAM configurations |
| [cloud-azure-managed-identity-aks.md](cloud-azure-managed-identity-aks.md) | 📄 primary | Detect ClientSecretCredential usage instead of Managed Identity, overly broad Azure RBAC, and AKS cluster misconfigurations for identity and networking |
| [iac-terraform.md](iac-terraform.md) | 📄 primary | Detect Terraform misconfigurations including unpinned module/provider versions, local state backends, hardcoded secrets, missing lifecycle guards on stateful resources, and count/for_each misuse |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
