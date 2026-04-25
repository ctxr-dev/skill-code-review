---
id: cloud-gcp-iam-and-workload-identity
type: primary
depth_role: leaf
focus: Detect overly permissive GCP IAM bindings, primitive role usage, service account key leaks, and missing Workload Identity federation
parents:
  - index.md
covers:
  - "Primitive roles (Owner/Editor/Viewer) used instead of predefined or custom roles"
  - Service account key JSON downloaded and stored in code or CI
  - allUsers or allAuthenticatedUsers in IAM bindings granting public access
  - Missing Organization Policy constraints for domain-restricted sharing
  - Service account impersonation without documented justification
  - Cross-project IAM grants without audit trail
  - Workload Identity not configured for GKE or Cloud Run workloads
  - User-managed service account keys instead of Workload Identity Federation
  - IAM conditions missing for time-bound or resource-bound access
  - Service account with Token Creator or Act As role on broad scope
tags:
  - gcp
  - iam
  - workload-identity
  - service-account
  - least-privilege
  - cloud-security
activation:
  file_globs:
    - "**/*.tf"
    - "**/*.yaml"
    - "**/*.yml"
    - "**/*.json"
    - "**/*.py"
    - "**/*.go"
    - "**/*.ts"
    - "**/*.js"
  keyword_matches:
    - google
    - gcp
    - IAM
    - iam
    - "roles/"
    - serviceAccount
    - workloadIdentity
    - bindings
    - members
    - Policy
  structural_signals:
    - gcp_iam_binding
    - google_project_iam
    - service_account_key
source:
  origin: file
  path: cloud-gcp-iam-and-workload-identity.md
  hash: "sha256:f19ac1fa395796cd41a08ff54c72086a6f2b8a82ceffd4f958f779872a5b5f61"
---
# GCP IAM and Workload Identity

## When This Activates

Activates on diffs involving GCP IAM policy bindings, service account configuration, Workload Identity setup, or Terraform/Pulumi/Deployment Manager resources for Google Cloud. GCP IAM misconfigurations are the leading cause of cloud breaches -- primitive roles grant thousands of permissions, downloaded service account keys become long-lived credentials that bypass audit, and public bindings (allUsers) expose resources to the internet. This reviewer detects diff-visible signals of these GCP identity and access management violations.

## Audit Surface

- [ ] roles/owner, roles/editor, or roles/viewer assigned in IAM policy
- [ ] Service account key file (.json) committed or referenced in source
- [ ] allUsers or allAuthenticatedUsers in member binding
- [ ] IAM binding at organization or folder level with primitive role
- [ ] Service account impersonation without documented justification
- [ ] Cross-project IAM binding granting access to external project
- [ ] GKE pod using node-level default service account instead of Workload Identity
- [ ] Missing iam.disableServiceAccountKeyCreation org policy constraint
- [ ] Conditional IAM binding absent for temporary or elevated access
- [ ] Service account with roles/iam.serviceAccountTokenCreator at project level
- [ ] Terraform IAM resource without lifecycle ignore on etag
- [ ] Missing audit log configuration for IAM admin activity

## Detailed Checks

### Primitive Role Detection
<!-- activation: keywords=["roles/owner", "roles/editor", "roles/viewer", "OWNER", "EDITOR", "VIEWER", "primitive"] -->

- [ ] **Primitive role in binding**: flag any IAM binding using roles/owner, roles/editor, or roles/viewer -- these grant thousands of permissions; replace with the narrowest predefined role (e.g., roles/storage.objectViewer instead of roles/viewer)
- [ ] **Primitive role at org/folder scope**: flag primitive roles bound at organization or folder level -- blast radius is every project in the hierarchy
- [ ] **Editor role granted to service account**: flag roles/editor on any service account -- Editor can modify nearly all resources and is never appropriate for automated workloads

### Service Account Key Hygiene
<!-- activation: keywords=["serviceAccountKey", "key.json", "credentials.json", "GOOGLE_APPLICATION_CREDENTIALS", "createKey", "private_key"] -->

- [ ] **Downloaded key file**: flag any .json file containing private_key_id or references to a service account key file -- use Workload Identity Federation for external workloads or Workload Identity for GKE/Cloud Run
- [ ] **Key in CI/CD environment variable**: flag GOOGLE_APPLICATION_CREDENTIALS pointing to a committed file -- inject short-lived tokens via Workload Identity Federation instead
- [ ] **Missing key rotation**: flag service account keys without evidence of rotation mechanism -- keys should be rotated every 90 days maximum, but eliminating keys entirely is preferred

### Workload Identity Configuration
<!-- activation: keywords=["workloadIdentity", "workload_identity", "iam.gke.io", "workloadIdentityPool", "oidc"] -->

- [ ] **Node SA used by pods**: flag GKE workloads not annotated with iam.gke.io/gcp-service-account -- pods inherit the node's service account which is typically over-privileged
- [ ] **Missing Workload Identity pool for external**: flag CI/CD or external workloads authenticating with service account keys instead of Workload Identity Federation with OIDC/SAML provider
- [ ] **Workload Identity pool without attribute conditions**: flag pools that accept any token from the provider without filtering by repository, branch, or subject

### Public Access Bindings
<!-- activation: keywords=["allUsers", "allAuthenticatedUsers", "public", "anonymous"] -->

- [ ] **allUsers binding**: flag any IAM binding with member allUsers -- this grants unauthenticated public access to the resource
- [ ] **allAuthenticatedUsers binding**: flag allAuthenticatedUsers -- this grants access to any Google account, not just organization members; it is effectively public
- [ ] **Missing domain-restricted sharing**: flag absence of Organization Policy constraint iam.allowedPolicyMemberDomains when allUsers/allAuthenticatedUsers bindings are removed -- the constraint prevents re-introduction

### Cross-Project and Impersonation
<!-- activation: keywords=["impersonate", "actAs", "serviceAccountUser", "cross-project", "generateAccessToken"] -->

- [ ] **Unscoped impersonation**: flag roles/iam.serviceAccountUser or roles/iam.serviceAccountTokenCreator at project level -- scope to specific service accounts with IAM conditions
- [ ] **Cross-project grant without comment**: flag IAM bindings referencing service accounts or users from other projects without an inline comment explaining the business justification
- [ ] **Token generation without scope restriction**: flag generateAccessToken calls without specifying a limited scope or lifetime

## Common False Positives

- **Terraform plan output**: roles/editor in Terraform plan output may reflect existing state, not a new assignment. Check whether the binding is being added or is pre-existing.
- **CI/CD bootstrap service account**: the initial Terraform service account often requires roles/owner temporarily. Flag but acknowledge if there is evidence of post-bootstrap role reduction.
- **allUsers on public-facing Cloud Run services**: public APIs intentionally use allUsers as the invoker. Verify the service is genuinely intended to be public and has its own authentication layer.
- **Workload Identity in non-GKE contexts**: on-premise or multi-cloud workloads may legitimately use service account keys when Workload Identity Federation is not yet available for their identity provider.

## Severity Guidance

| Finding | Severity |
|---|---|
| allUsers or allAuthenticatedUsers in IAM binding | Critical |
| Service account key committed to repository | Critical |
| roles/owner or roles/editor on a service account | Critical |
| Primitive role at organization or folder scope | Critical |
| Node service account used by GKE pods (no Workload Identity) | Important |
| Service account impersonation without justification | Important |
| Cross-project IAM grant without audit comment | Important |
| Missing attribute conditions on Workload Identity pool | Important |
| Missing org policy constraint for domain-restricted sharing | Minor |
| Terraform IAM resource missing lifecycle ignore on etag | Minor |

## See Also

- `cloud-aws-iam-least-privilege` -- AWS equivalent of least-privilege IAM review
- `sec-owasp-a01-broken-access-control` -- broken access control patterns applicable across clouds
- `sec-secrets-management-and-rotation` -- key rotation and secret hygiene
- `sec-owasp-a05-misconfiguration` -- general cloud misconfiguration patterns

## Authoritative References

- [Google Cloud, "IAM Best Practices"](https://cloud.google.com/iam/docs/using-iam-securely)
- [Google Cloud, "Workload Identity Federation"](https://cloud.google.com/iam/docs/workload-identity-federation)
- [Google Cloud, "Workload Identity for GKE"](https://cloud.google.com/kubernetes-engine/docs/concepts/workload-identity)
- [Google Cloud, "Organization Policy Constraints"](https://cloud.google.com/resource-manager/docs/organization-policy/org-policy-constraints)
- [Google Cloud, "Service Account Best Practices"](https://cloud.google.com/iam/docs/best-practices-service-accounts)
