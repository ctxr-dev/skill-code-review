---
id: iac-bicep-arm
type: primary
depth_role: leaf
focus: Detect Bicep and ARM template misconfigurations including hardcoded secrets, missing parameter defaults and validation, unversioned Bicep modules, missing resource locks, and deployment mode risks
parents:
  - index.md
covers:
  - Hardcoded secrets in Bicep or ARM template parameters and variables
  - Missing parameter defaults leaving deployments brittle
  - ARM template without $schema validation
  - Bicep modules referenced without version pinning
  - Missing resource locks on production stateful resources
  - Deployment mode incremental vs complete misuse
  - "Output exposing sensitive values without @secure decorator"
  - Missing tags on Azure resources
  - No what-if check in CI before deployment
  - Bicep linter warnings suppressed globally
tags:
  - azure
  - bicep
  - arm
  - iac
  - secrets
  - resource-locks
  - deployment-mode
  - tags
  - modules
activation:
  file_globs:
    - "**/*.bicep"
    - "**/*.bicepparam"
    - "**/azuredeploy.json"
    - "**/mainTemplate.json"
    - "**/*.arm.json"
    - "**/bicepconfig.json"
  keyword_matches:
    - resource
    - param
    - module
    - targetScope
    - Microsoft.
    - deployment
    - bicep
    - ARM
    - template
    - resourceGroup
    - "@secure"
    - CanNotDelete
  structural_signals:
    - hardcoded_secret_in_bicep
    - missing_secure_decorator
    - missing_resource_lock
    - complete_deployment_mode
source:
  origin: file
  path: iac-bicep-arm.md
  hash: "sha256:a49bdede92f679e317cafbb1e0e63d7ed0b0341e960c0684b49de8a28143b502"
---
# Bicep and ARM Templates

## When This Activates

Activates when diffs touch Bicep files, ARM JSON templates, or Bicep configuration files. Bicep and ARM define Azure resource lifecycles -- a missing @secure decorator exposes secrets in deployment logs, complete deployment mode deletes resources not in the template, and unversioned Bicep modules silently pull breaking changes. This reviewer catches Azure IaC mistakes that cause secret exposure, accidental resource deletion, and deployment failures.

## Audit Surface

- [ ] Literal secret, password, or key in parameter default or variable
- [ ] Parameter for credential without @secure() decorator
- [ ] ARM template missing $schema property
- [ ] Bicep module reference without version pin
- [ ] Stateful resource without CanNotDelete resource lock
- [ ] Complete deployment mode without explicit resource listing
- [ ] Output returning sensitive value
- [ ] Azure resource missing standard tags
- [ ] CI pipeline without az deployment what-if
- [ ] Bicep linter rules suppressed globally
- [ ] Missing dependsOn for ordering
- [ ] Key Vault reference not used for secrets
- [ ] API version outdated or unpinned

## Detailed Checks

### Secrets in Templates
<!-- activation: keywords=["@secure", "secure", "password", "secret", "apiKey", "connectionString", "listKeys", "Microsoft.KeyVault", "reference"] -->

- [ ] **Hardcoded secrets in parameters**: flag `param` declarations with default values containing passwords, keys, or tokens -- Bicep parameters with defaults are visible in template source and deployment history; use `@secure()` decorator with no default and inject via Key Vault reference
- [ ] **Missing @secure decorator**: flag parameters named password, secret, key, token, or connectionString without `@secure()` -- without the decorator, the value appears in plaintext in deployment logs and Azure activity log
- [ ] **Secret in output**: flag output blocks that return passwords, connection strings, or keys -- outputs are stored in deployment history accessible to anyone with Reader role on the resource group
- [ ] **Key Vault not used for secrets**: flag deployments passing secrets as plain parameters instead of using Key Vault references (`Microsoft.KeyVault/vaults`) -- Key Vault references fetch secrets at deployment time without exposing them in the template

### Module Versioning
<!-- activation: keywords=["module", "br:", "ts:", "registry", "version", "tag", "bicepconfig"] -->

- [ ] **Unversioned Bicep module**: flag module references using `br:` or `ts:` without a tag or digest -- unversioned modules pull the latest, causing non-reproducible deployments
- [ ] **Local module path without versioning strategy**: flag relative-path modules in monorepos without a clear versioning or change control mechanism -- changes to shared modules affect all consumers immediately
- [ ] **Module registry without authentication**: flag bicepconfig.json referencing external module registries without credential configuration

### Resource Locks and Protection
<!-- activation: keywords=["CanNotDelete", "ReadOnly", "lock", "Microsoft.Authorization/locks", "deletionPolicy"] -->

- [ ] **Missing resource lock on stateful resources**: flag SQL databases, Storage Accounts, Cosmos DB, Key Vaults, and managed disks without a `Microsoft.Authorization/locks` resource with `CanNotDelete` level -- without locks, accidental deletions or complete-mode deployments destroy production data
- [ ] **ReadOnly lock on mutable resources**: flag ReadOnly locks on resources that require routine updates (scale changes, configuration) -- ReadOnly locks block all write operations, including legitimate operational changes

### Deployment Mode
<!-- activation: keywords=["Complete", "Incremental", "mode", "deployment", "what-if", "az deployment"] -->

- [ ] **Complete mode without safety**: flag deployment configurations using `Complete` mode -- complete mode deletes all resources in the resource group not defined in the template; this is destructive and should only be used with full resource listing and what-if validation
- [ ] **Missing what-if in CI**: flag CI pipelines that run `az deployment group create` without preceding `az deployment group what-if` -- what-if shows the diff of changes before applying, preventing accidental deletions
- [ ] **No deployment validation step**: flag pipelines without `az deployment group validate` -- validation catches schema errors and type mismatches before the deployment begins

### Template Hygiene
<!-- activation: keywords=["$schema", "tags", "apiVersion", "dependsOn", "condition", "bicepconfig", "linter"] -->

- [ ] **Missing $schema in ARM**: flag ARM JSON templates without the `$schema` property -- schema validation catches invalid property names and types at authoring time
- [ ] **Missing tags**: flag Azure resources without tags for environment, team, service, and costCenter -- tags are required for Azure cost management and governance policies
- [ ] **Outdated API version**: flag resources using API versions more than 2 years old -- outdated API versions miss bug fixes, security patches, and new features
- [ ] **Linter suppression**: flag bicepconfig.json with broad linter rule suppressions (`no-unused-params`, `secure-parameter-default` set to off) -- suppressing security-related linter rules hides real issues

## Common False Positives

- **Complete mode in dedicated resource groups**: complete mode is safe when the resource group contains only the resources defined in the template (single-purpose resource groups).
- **Missing locks on ephemeral resources**: resource locks are unnecessary on dev/test resource groups that are routinely destroyed.
- **API version on preview resources**: preview/beta Azure services may only have recent API versions available. Outdated API version checks apply to GA services.
- **Local modules in small projects**: single-team projects with few Bicep files do not need versioned module registries.

## Severity Guidance

| Finding | Severity |
|---|---|
| Hardcoded secret in parameter default or variable | Critical |
| Missing @secure on password/key parameter | Critical |
| Complete deployment mode on shared resource group | Critical |
| Output exposing secret value | Critical |
| Missing resource lock on production SQL/Storage/Cosmos | Important |
| Unversioned Bicep module from registry | Important |
| Missing what-if step in CI pipeline | Important |
| ARM template missing $schema | Important |
| Missing resource tags | Minor |
| Outdated API version | Minor |
| Bicep linter rules suppressed | Minor |

## See Also

- `sec-secrets-management-and-rotation` -- secrets must not appear in Bicep/ARM templates
- `sec-owasp-a05-misconfiguration` -- misconfigured deployments and missing security controls
- `iac-terraform` -- alternative IaC tool with analogous state and versioning concerns
- `iac-drift-detection` -- detecting drift between template and actual Azure resources
- `cloud-azure-managed-identity-aks` -- Azure-specific identity and access patterns

## Authoritative References

- [Bicep Best Practices](https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/best-practices)
- [ARM Template Best Practices](https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/best-practices)
- [Azure Resource Locks](https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/lock-resources)
- [Bicep Linter Rules](https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/linter)
- [PSRule for Azure](https://azure.github.io/PSRule.Rules.Azure/)
