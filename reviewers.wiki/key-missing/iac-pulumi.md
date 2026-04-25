---
id: iac-pulumi
type: primary
depth_role: leaf
focus: Detect Pulumi misconfigurations including plaintext secrets in config, unencrypted state backends, missing ComponentResource grouping, unpinned provider versions, and leaking stack outputs
parents:
  - index.md
covers:
  - Secrets stored as plaintext config values instead of using pulumi config set --secret
  - "Stack outputs exposing secret values without pulumi.secret()"
  - State backend without encryption at rest
  - Flat resource graphs not using ComponentResource for logical grouping
  - Missing resource tags for cost allocation and ownership
  - Provider versions unpinned in package requirements
  - Missing stack tags for environment identification
  - Hardcoded credentials in Pulumi program code
  - "No Pulumi policy pack (CrossGuard) in CI"
  - Missing pulumi preview in CI before pulumi up
tags:
  - pulumi
  - iac
  - secrets
  - state
  - componentresource
  - tags
  - providers
  - crossguard
activation:
  file_globs:
    - "**/Pulumi.yaml"
    - "**/Pulumi.*.yaml"
    - "**/__main__.py"
    - "**/index.ts"
    - "**/main.go"
  keyword_matches:
    - pulumi
    - ComponentResource
    - StackReference
    - Output
    - export
    - Config
    - secret
    - Provider
    - ResourceOptions
  structural_signals:
    - pulumi_config_plaintext_secret
    - missing_component_resource
    - unpinned_provider
source:
  origin: file
  path: iac-pulumi.md
  hash: "sha256:2db1ebd7bf539950d8a766f0ce1842db6f224601d8d03989a756c93503c553e7"
---
# Pulumi

## When This Activates

Activates when diffs touch Pulumi program files, stack configuration, or Pulumi.yaml project files. Pulumi uses general-purpose languages (TypeScript, Python, Go, C#) for infrastructure, which means secrets can hide in normal variable assignments, stack outputs can leak credentials to the console, and the full expressiveness of the language can create resource graphs that are difficult to audit. This reviewer catches Pulumi-specific misconfigurations that cause secret exposure, state corruption, and ungoverned infrastructure sprawl.

## Audit Surface

- [ ] Config value set without --secret for credential
- [ ] Stack output wrapping secret without pulumi.secret()
- [ ] State backend without encryption at rest
- [ ] Flat resource graph without ComponentResource grouping
- [ ] Cloud resource missing standard tags
- [ ] Provider package without version pin
- [ ] Stack without stack tags
- [ ] Literal credential in Pulumi program source
- [ ] CI pipeline without pulumi preview before up
- [ ] No CrossGuard policy pack configured
- [ ] Secret config accessed and logged unsafely
- [ ] Missing runtime version constraint in Pulumi.yaml

## Detailed Checks

### Secrets in Config and Code
<!-- activation: keywords=["Config", "config", "secret", "password", "token", "api_key", "requireSecret", "getSecret", "secret_value", "plaintext"] -->

- [ ] **Plaintext config for secrets**: flag `pulumi config set db-password hunter2` patterns in stack config YAML where the value is not encrypted (missing `secure:` prefix) -- use `pulumi config set --secret` to encrypt the value with the stack's encryption provider
- [ ] **Hardcoded credentials in program**: flag literal strings assigned to password, secret, token, or key arguments in resource constructors -- Pulumi programs are source code committed to version control; use `config.require_secret()` or `config.get_secret()`
- [ ] **Secret accessed then leaked**: flag patterns where `config.require_secret()` result is logged, printed, or interpolated into a non-secret output -- the secret wrapper only protects the value if it stays within the Pulumi Output chain
- [ ] **Stack output without secret wrapping**: flag `pulumi.export("db_password", password)` where the value is a credential -- use `pulumi.export("db_password", pulumi.Output.secret(password))` to prevent the value appearing in `pulumi stack output`

### State Backend Encryption
<!-- activation: keywords=["backend", "login", "s3://", "gs://", "azblob://", "state", "encrypt", "passphrase", "kms", "PULUMI_BACKEND_URL"] -->

- [ ] **Unencrypted state backend**: flag state backends (S3, GCS, Azure Blob) configured without server-side encryption or without a secrets provider (awskms, gcpkms, azurekeyvault) -- Pulumi state contains all resource properties including secrets in plaintext unless encrypted
- [ ] **Default passphrase provider**: flag stacks using the default passphrase secrets provider with a weak or committed passphrase -- use a cloud KMS secrets provider (awskms, gcpkms, azurekeyvault) for production stacks
- [ ] **State file committed**: flag Pulumi state files (.pulumi directory contents) committed to version control -- state files contain plaintext resource attributes

### Resource Organization
<!-- activation: keywords=["ComponentResource", "Resource", "ResourceOptions", "parent", "providers", "aliases", "StackReference", "component"] -->

- [ ] **Missing ComponentResource grouping**: flag Pulumi programs with more than 10 resources defined at the root stack level without ComponentResource abstractions -- ComponentResource provides logical grouping, enables reuse, and makes `pulumi stack` output readable
- [ ] **No parent set on child resources**: flag resources created inside a ComponentResource without `parent=self` (Python) or `{ parent: this }` (TypeScript) -- without parent, resources appear at root level in the state tree, defeating the purpose of grouping
- [ ] **StackReference without version pinning**: flag StackReference reads from other stacks without versioned output contracts -- changes to the referenced stack's outputs break the consuming stack silently

### Provider and Dependency Versioning
<!-- activation: keywords=["requirements", "package.json", "go.mod", "pulumi-aws", "pulumi-gcp", "pulumi-azure", "version", "Provider"] -->

- [ ] **Unpinned provider package**: flag provider packages (pulumi-aws, pulumi-gcp, pulumi-azure-native) in requirements.txt, package.json, or go.mod without version pins -- unpinned providers pull latest on install, causing non-reproducible infrastructure
- [ ] **Missing Pulumi CLI version constraint**: flag Pulumi.yaml without a runtime version or projects without .pulumi-version file -- different CLI versions may interpret programs differently
- [ ] **Explicit provider without version**: flag `Provider` resource constructors without a `version` argument when multiple provider versions coexist -- this can cause resources to be managed by the wrong provider version

### Tags and Governance
<!-- activation: keywords=["tags", "Tags", "stack_tags", "costCenter", "environment", "team", "owner"] -->

- [ ] **Missing resource tags**: flag cloud resources (EC2, S3, RDS, VPC, GCP instances, Azure resources) created without tags for environment, team/owner, service, and cost center -- tags are essential for cost allocation, access control, and incident triage
- [ ] **Missing stack tags**: flag stacks without tags in Pulumi.yaml or set via `pulumi stack tag set` -- stack tags enable filtering and governance across large organizations
- [ ] **No CrossGuard policy pack**: flag CI pipelines running `pulumi up` without `--policy-pack` or without a default policy pack configured -- CrossGuard prevents non-compliant resources from being created

## Common False Positives

- **Development stacks with local backend**: local backend is acceptable for personal development and experimentation stacks that do not manage shared infrastructure.
- **Passphrase provider for local development**: the passphrase secrets provider is fine for local stacks where KMS access is not available.
- **ComponentResource not needed for small programs**: programs with fewer than 5 resources do not benefit from ComponentResource grouping.
- **Tag-exempt resources**: some resources (IAM policies, CloudWatch metrics) do not support tags. Only flag taggable resources.

## Severity Guidance

| Finding | Severity |
|---|---|
| Hardcoded credential in Pulumi program source | Critical |
| Plaintext secret in stack config (missing --secret) | Critical |
| State backend without encryption | Critical |
| Stack output leaking secret value | Important |
| Unpinned provider package version | Important |
| Missing ComponentResource for large resource graphs | Important |
| Secret config value logged or printed | Important |
| Missing resource tags on production infrastructure | Minor |
| Missing stack tags | Minor |
| No CrossGuard policy pack in CI | Minor |
| Missing pulumi preview in CI pipeline | Minor |

## See Also

- `sec-secrets-management-and-rotation` -- secrets handling patterns applicable to Pulumi config and outputs
- `sec-owasp-a05-misconfiguration` -- infrastructure misconfiguration as a security risk
- `iac-terraform` -- alternative IaC tool with analogous state and versioning concerns
- `iac-drift-detection` -- detecting drift between Pulumi state and actual infrastructure

## Authoritative References

- [Pulumi Documentation: Secrets](https://www.pulumi.com/docs/concepts/secrets/)
- [Pulumi Documentation: State and Backends](https://www.pulumi.com/docs/concepts/state/)
- [Pulumi Documentation: Component Resources](https://www.pulumi.com/docs/concepts/resources/components/)
- [Pulumi CrossGuard Documentation](https://www.pulumi.com/docs/using-pulumi/crossguard/)
- [Pulumi Best Practices](https://www.pulumi.com/docs/using-pulumi/best-practices/)
