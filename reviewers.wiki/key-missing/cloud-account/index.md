---
id: cloud-account
type: index
depth_role: subcategory
depth: 2
focus: "Cloud Function Gen1 used instead of Gen2 without justification; Cloud Run CPU always-allocated without justification; ClusterRole with wildcard verbs (*) granting all operations; ClusterRoleBinding to default service account -- every pod in the namespace inherits permissions"
parents:
  - "../index.md"
shared_covers: []
entries:
  - id: cloud-gcp-cloud-functions-cloud-run
    file: cloud-gcp-cloud-functions-cloud-run.md
    type: primary
    focus: Detect cold start neglect, missing IAM invoker restrictions, secret leaks in env vars, and misconfigured concurrency in Cloud Functions and Cloud Run
    tags:
      - gcp
      - cloud-functions
      - cloud-run
      - serverless
      - cold-start
      - concurrency
      - iam
  - id: cloud-gcp-iam-and-workload-identity
    file: cloud-gcp-iam-and-workload-identity.md
    type: primary
    focus: Detect overly permissive GCP IAM bindings, primitive role usage, service account key leaks, and missing Workload Identity federation
    tags:
      - gcp
      - iam
      - workload-identity
      - service-account
      - least-privilege
      - cloud-security
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
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Cloud Account

**Focus:** Cloud Function Gen1 used instead of Gen2 without justification; Cloud Run CPU always-allocated without justification; ClusterRole with wildcard verbs (*) granting all operations; ClusterRoleBinding to default service account -- every pod in the namespace inherits permissions

## Children

| File | Type | Focus |
|------|------|-------|
| [cloud-gcp-cloud-functions-cloud-run.md](cloud-gcp-cloud-functions-cloud-run.md) | 📄 primary | Detect cold start neglect, missing IAM invoker restrictions, secret leaks in env vars, and misconfigured concurrency in Cloud Functions and Cloud Run |
| [cloud-gcp-iam-and-workload-identity.md](cloud-gcp-iam-and-workload-identity.md) | 📄 primary | Detect overly permissive GCP IAM bindings, primitive role usage, service account key leaks, and missing Workload Identity federation |
| [k8s-rbac.md](k8s-rbac.md) | 📄 primary | Detect overly permissive Kubernetes RBAC configurations including wildcard verbs, cluster-admin bindings, escalation paths, and service account misuse |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
