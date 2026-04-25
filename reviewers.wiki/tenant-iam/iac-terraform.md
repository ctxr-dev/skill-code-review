---
id: iac-terraform
type: primary
depth_role: leaf
focus: "Detect Terraform misconfigurations including unpinned module/provider versions, local state backends, hardcoded secrets, missing lifecycle guards on stateful resources, and count/for_each misuse"
parents:
  - index.md
covers:
  - Module source without version constraint -- silent breaking changes on next init
  - State stored in local backend -- no locking, no collaboration, data loss risk
  - Hardcoded secrets in .tf or .tfvars files
  - Stateful resource missing lifecycle prevent_destroy
  - count used where for_each with a map is more appropriate
  - Provider version not pinned -- unpredictable behavior across environments
  - Missing terraform fmt and validate in CI pipeline
  - Sensitive output not marked with sensitive = true
  - No backend encryption for remote state
  - Data source used without lifecycle precondition
  - Wildcard provider version constraint
  - Module without required_providers block
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
activation:
  file_globs:
    - "**/*.tf"
    - "**/*.tfvars"
    - "**/*.tf.json"
    - "**/terraform.lock.hcl"
    - "**/.terraform-version"
  keyword_matches:
    - terraform
    - resource
    - module
    - provider
    - variable
    - output
    - backend
    - lifecycle
    - prevent_destroy
    - for_each
    - count
    - data
  structural_signals:
    - backend_local
    - hardcoded_secret_in_tf
    - unpinned_provider
    - missing_lifecycle_prevent_destroy
source:
  origin: file
  path: iac-terraform.md
  hash: "sha256:b1c0d4ef4d4a7e199be9ba143c87a36b8f1fd51a562b02c192610cc1568a60fd"
---
# Terraform

## When This Activates

Activates when diffs touch Terraform HCL files, variable definitions, or Terraform lock files. Terraform manages infrastructure lifecycle declaratively, but its defaults are permissive: modules without version pins silently pull breaking changes, local state backends lose state on disk failure, and sensitive outputs are printed in plaintext to CI logs. A single misconfigured lifecycle block can allow `terraform destroy` to delete a production database. This reviewer catches the HCL-level mistakes that cause state corruption, secret exposure, and infrastructure drift.

## Audit Surface

- [ ] Module source with no version or ref pinned
- [ ] Backend block set to local or absent entirely
- [ ] Literal secret, password, or API key in .tf or .tfvars
- [ ] Stateful resource missing lifecycle { prevent_destroy = true }
- [ ] count used with conditional logic that should be for_each
- [ ] required_providers block missing version constraint
- [ ] CI pipeline missing terraform fmt -check and validate steps
- [ ] Output block missing sensitive = true for credentials
- [ ] Remote backend without encryption enabled
- [ ] Variable for secret without sensitive = true
- [ ] Provider alias without version constraint
- [ ] terraform.tfstate committed to version control
- [ ] Data source without ordering guard
- [ ] Module using unpinned git ref
- [ ] No saved plan artifact for CI apply step

## Detailed Checks

### Secrets in Terraform Code
<!-- activation: keywords=["password", "secret", "api_key", "token", "credentials", "connection_string", "sensitive", "access_key", "private_key"] -->

- [ ] **Hardcoded secrets in .tf files**: flag literal string values assigned to arguments named password, secret, api_key, token, access_key, or private_key in resource or data blocks -- secrets in HCL are committed to version control and visible in state files; use variable references with sensitive = true or a secrets manager data source
- [ ] **Secrets in .tfvars files**: flag .tfvars files containing actual credential values -- .tfvars files are often committed; use environment variables (TF_VAR_*), a secrets manager data source, or CI secret injection instead
- [ ] **Variable without sensitive flag**: flag variables that accept secrets (names containing password, secret, key, token) without `sensitive = true` -- without the flag, Terraform prints the value in plan output and CI logs
- [ ] **Output leaking secrets**: flag output blocks that reference sensitive values (passwords, connection strings, keys) without `sensitive = true` -- Terraform displays unsensitive outputs in the console and stores them in plaintext in state

### State Backend Security
<!-- activation: keywords=["backend", "terraform.tfstate", "s3", "gcs", "azurerm", "remote", "cloud", "encrypt", "lock", "dynamodb_table"] -->

- [ ] **Local backend**: flag configurations with `backend "local"` or no backend block at all -- local state has no locking (concurrent applies corrupt state), no encryption at rest, and is lost if the disk fails; use a remote backend (S3, GCS, Azure Blob, Terraform Cloud)
- [ ] **Remote backend without encryption**: flag S3 backend without `encrypt = true`, GCS backend without default encryption, or Azure backend without ARM encryption -- state files contain every resource attribute including secrets in plaintext
- [ ] **Missing state locking**: flag S3 backend without `dynamodb_table` for locking -- without locking, concurrent terraform apply runs corrupt the state file
- [ ] **State file committed**: flag terraform.tfstate, terraform.tfstate.backup, or .terraform directory present in version control -- state files contain plaintext secrets and infrastructure details

### Module and Provider Versioning
<!-- activation: keywords=["module", "source", "version", "required_providers", "required_version", "ref=", "tag=", "registry.terraform.io"] -->

- [ ] **Unpinned module version**: flag module blocks with no `version` constraint (registry modules) or no `ref` tag/SHA (git modules) -- without pinning, `terraform init` pulls the latest version which may contain breaking changes
- [ ] **Wildcard provider constraint**: flag `required_providers` with version `">= X"` or no constraint -- use pessimistic constraint `"~> X.Y"` to allow patch updates while preventing major version breaks
- [ ] **Missing required_version**: flag root modules without a `required_version` constraint in the terraform block -- different Terraform CLI versions produce different state formats and behavior
- [ ] **Missing .terraform.lock.hcl**: flag repositories with Terraform code but no committed lock file -- the lock file pins exact provider versions and hashes for reproducible builds

### Lifecycle and Stateful Resources
<!-- activation: keywords=["lifecycle", "prevent_destroy", "create_before_destroy", "ignore_changes", "aws_db_instance", "aws_s3_bucket", "aws_dynamodb_table", "google_sql_database_instance", "azurerm_storage_account"] -->

- [ ] **Missing prevent_destroy on stateful resources**: flag RDS instances, S3 buckets, DynamoDB tables, Cloud SQL instances, Azure Storage accounts, and similar data-bearing resources without `lifecycle { prevent_destroy = true }` -- without this guard, `terraform destroy` or resource replacement deletes the data permanently
- [ ] **create_before_destroy missing on zero-downtime resources**: flag load balancers, DNS records, and security groups that require zero-downtime replacement but lack `lifecycle { create_before_destroy = true }` -- Terraform's default destroy-then-create causes service interruption
- [ ] **Overly broad ignore_changes**: flag `lifecycle { ignore_changes = all }` -- this silently prevents Terraform from managing the resource, creating permanent drift; use specific attribute lists when external systems modify particular fields

### Count vs For_Each
<!-- activation: keywords=["count", "for_each", "count.index", "each.key", "each.value", "toset", "tomap", "length"] -->

- [ ] **count for non-toggle resources**: flag `count = length(var.items)` patterns where items is a list -- removing an element from the middle of the list causes Terraform to destroy and recreate all subsequent resources due to index shift; use `for_each` with a map or set instead
- [ ] **count for conditional creation**: using `count = var.enabled ? 1 : 0` is acceptable for boolean toggles, but flag it when the resource has downstream references that would benefit from for_each keying
- [ ] **for_each on unstable keys**: flag `for_each` with keys derived from resource attributes that change -- this causes unnecessary destroy/recreate cycles; keys should be stable identifiers

### CI Pipeline Integration
<!-- activation: keywords=["fmt", "validate", "plan", "apply", "CI", "pipeline", "github", "gitlab", "jenkins", "atlantis", "terraform-plan", "terraform-apply"] -->

- [ ] **Missing fmt check**: flag CI configurations that run terraform plan/apply but do not run `terraform fmt -check` -- inconsistent formatting causes noisy diffs and merge conflicts
- [ ] **Missing validate step**: flag CI pipelines without `terraform validate` before plan -- validate catches syntax errors and type mismatches cheaply before the expensive plan step
- [ ] **Plan without saved artifact**: flag CI pipelines that run `terraform plan` and `terraform apply` as separate steps without saving the plan to a file (`terraform plan -out=plan.tfplan`) -- without a saved plan, the apply step re-plans and may apply different changes than what was reviewed

## Common False Positives

- **Ephemeral or test resources**: prevent_destroy is unnecessary on resources in development or ephemeral environments that are routinely destroyed and recreated.
- **count = var.enabled ? 1 : 0 toggle pattern**: this is idiomatic Terraform for conditional resource creation and is not a count misuse.
- **Module version ranges in library modules**: library modules intended for broad consumption may use wider version ranges than application modules. The concern is primarily for root modules.
- **Example .tfvars in documentation**: .tfvars.example files with placeholder values (YOUR_KEY_HERE) are not secret leaks.

## Severity Guidance

| Finding | Severity |
|---|---|
| Hardcoded secret in .tf or .tfvars file | Critical |
| terraform.tfstate committed to version control | Critical |
| Local backend on production infrastructure | Critical |
| Missing prevent_destroy on production RDS or DynamoDB | Critical |
| Remote backend without encryption | Important |
| Missing state locking (no DynamoDB table for S3) | Important |
| Unpinned module version (registry or git) | Important |
| Wildcard provider version constraint | Important |
| Output leaking sensitive value | Important |
| count misuse causing index-shift destroy/recreate | Important |
| Missing terraform fmt/validate in CI | Minor |
| Missing required_version constraint | Minor |
| Overly broad ignore_changes | Minor |

## See Also

- `sec-secrets-management-and-rotation` -- secrets must not appear in Terraform code or state
- `sec-owasp-a05-misconfiguration` -- IaC misconfiguration is a top OWASP risk category
- `iac-drift-detection` -- Terraform state drift detection and remediation
- `iac-secrets-sops-sealed-secrets-vault` -- secrets management for IaC workflows
- `cloud-aws-cloudformation-sam-cdk` -- alternative AWS IaC tool with overlapping concerns

## Authoritative References

- [Terraform Best Practices](https://www.terraform-best-practices.com/)
- [HashiCorp Terraform Documentation: Backend Configuration](https://developer.hashicorp.com/terraform/language/settings/backends/configuration)
- [HashiCorp Terraform Documentation: Module Sources](https://developer.hashicorp.com/terraform/language/modules/sources)
- [tfsec Documentation](https://aquasecurity.github.io/tfsec/)
- [Checkov Terraform Policies](https://www.checkov.io/5.Policy%20Index/terraform.html)
