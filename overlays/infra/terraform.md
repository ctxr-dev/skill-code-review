# Terraform — Review Overlay

Load this overlay for the **Security**, **Reliability**, and **Architecture** specialists when Terraform (or OpenTofu) code is being reviewed.

> **Canonical reference:** <https://developer.hashicorp.com/terraform/cloud-docs/recommended-practices> — HashiCorp recommended practices.

## Security — IAM and Access

- [ ] IAM policies follow least-privilege: no `"Action": "*"`, `"Resource": "*"`, or `"Effect": "Allow"` combinations that grant admin-equivalent access unless explicitly justified
- [ ] No resource is publicly accessible by default — S3 buckets have `block_public_acls = true` and `block_public_policy = true`, security groups do not open `0.0.0.0/0` ingress on sensitive ports
- [ ] Encryption at rest is enabled on all data stores (S3 SSE, RDS storage_encrypted, EBS encrypted, etc.); encryption in transit (TLS) is enforced at the resource level where configurable
- [ ] Sensitive variable values are marked `sensitive = true` in variable declarations; they are not interpolated into `tags`, names, or other plaintext outputs

## State Management

- [ ] Remote state backend (S3 + DynamoDB, GCS, Terraform Cloud, etc.) is configured; no `local` backend is used for shared or production infrastructure
- [ ] State backend has versioning and encryption enabled; accidental state corruption can be recovered from a prior version
- [ ] State locking is configured (DynamoDB lock table for S3 backend) to prevent concurrent `apply` operations from corrupting state
- [ ] `terraform_remote_state` data sources reference only the outputs they need, not the entire state of another workspace

## Workflow Safety

- [ ] `plan` output is reviewed before `apply` in CI; `apply` does not run automatically without a human approval gate for production environments
- [ ] Destructive operations flagged in the plan (`# forces replacement`, `will be destroyed`) require explicit acknowledgment or a separate targeted plan
- [ ] `prevent_destroy = true` lifecycle rule is set on stateful resources (databases, S3 buckets) to guard against accidental destruction
- [ ] `terraform validate` and a linter (`tflint`, `checkov`, or equivalent) run in CI on every PR

## Module Design

- [ ] Module boundaries reflect ownership and lifecycle: resources that are deployed and destroyed together are in the same module; resources with different lifetimes are separated
- [ ] Module outputs expose only what callers need; internal resource IDs that are implementation details are not exported
- [ ] Module sources are pinned to a specific version tag or commit SHA; `source = "…//module?ref=main"` floats and can break silently
- [ ] Provider versions are pinned in `required_providers` with a pessimistic constraint (`~> 5.0`); no unpinned providers that accept any version
- [ ] Variable defaults are absent for required inputs; callers must provide values explicitly rather than relying on a potentially stale default
