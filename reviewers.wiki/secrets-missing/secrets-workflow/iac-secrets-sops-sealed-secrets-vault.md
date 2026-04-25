---
id: iac-secrets-sops-sealed-secrets-vault
type: primary
depth_role: leaf
focus: Detect misconfigurations in SOPS, Sealed Secrets, and HashiCorp Vault including missing key rotation, outdated controllers, overly broad Vault policies, unencrypted secrets at rest, missing rotation schedules, plaintext secrets in git history, and absent audit trails
parents:
  - index.md
covers:
  - SOPS encryption key not rotated within policy period
  - Sealed Secrets controller running outdated version
  - Vault policy with overly broad path wildcards
  - Secrets not encrypted at rest in the secrets backend
  - Missing automated secret rotation schedule
  - Plaintext secrets present in git history
  - Missing audit trail for secret access
  - SOPS .sops.yaml missing or misconfigured
  - SealedSecret using cluster-wide scope unnecessarily
  - Vault AppRole or token with no TTL
  - "Secrets printed or echoed in CI/CD job logs"
  - Secrets passed as environment variables visible to all child processes
  - Long-lived secrets without rotation mechanism
  - Same secret value shared across dev, staging, and production
  - Static cloud credentials instead of OIDC federation
  - Secrets derived at runtime not masked in CI logs
  - Secrets written to files included in build artifacts
  - Secrets in pipeline cache entries
  - "Secrets passed as command-line arguments (visible in process list)"
  - Missing secret scanning in CI pipeline
  - "Secrets hardcoded in .gitlab-ci.yml instead of CI/CD variables"
  - "CI/CD variables not marked as protected or masked"
  - Shared runners used without tag restrictions for privileged jobs
  - "Jobs without rules or only/except restrictions running on unintended branches"
  - Job dependencies creating serialization bottlenecks
  - Artifacts without expiry consuming storage indefinitely
  - Deploy jobs without environment protection rules or approval gates
  - "include: remote without version pin or integrity check"
  - "Overly permissive Docker-in-Docker (dind) service configuration"
  - Missing interruptible flag on redundant pipeline runs
  - Hardcoded API keys, passwords, and tokens in source code
  - Secrets in configuration files committed to version control
  - Secrets as environment variable defaults in application code
  - "Secrets in CI/CD pipeline files without using secret variable references"
  - Long-lived tokens and credentials without rotation mechanism
  - Secrets logged in application output or included in error messages
  - "Secrets passed as URL query parameters (logged by proxies and browsers)"
  - Secrets embedded in client-side code or JavaScript bundles
  - "Missing secret scanning in CI/CD pipelines"
  - .env files committed without .gitignore exclusion
  - Secrets in Docker build args or layers visible in image history
  - Private keys or certificates stored in source repositories
tags:
  - sops
  - sealed-secrets
  - vault
  - secrets
  - encryption
  - rotation
  - audit
  - key-management
  - gitops
  - ci-cd
  - oidc
  - masking
  - environment-variables
  - CWE-798
  - CWE-532
  - CWE-214
  - gitlab-ci
  - pipeline
  - deploy
  - environment-protection
  - CWE-269
  - credentials
  - hardcoded
  - kms
  - secret-scanning
  - CWE-312
  - CWE-319
aliases:
  - cicd-pipeline-secrets-discipline
  - cicd-gitlab-ci
  - sec-secrets-management-and-rotation
activation:
  file_globs:
    - "**/.sops.yaml"
    - "**/*.sops.*"
    - "**/sealed-secret*"
    - "**/vault-policy*"
    - "**/vault/**"
    - "**/external-secret*"
    - "**/*secret*.yaml"
  keyword_matches:
    - sops
    - SealedSecret
    - vault
    - Vault
    - AppRole
    - transit
    - kv
    - "secret/data"
    - creation_rules
    - encrypted_regex
    - ExternalSecret
    - SecretStore
    - ClusterSecretStore
  structural_signals:
    - sops_encrypted_file
    - "kind: SealedSecret"
    - vault_policy_definition
    - "kind: ExternalSecret"
    - "kind: SecretStore"
source:
  origin: file
  path: iac-secrets-sops-sealed-secrets-vault.md
  hash: "sha256:21e16877d04577c46739f9fcf051af9379adddc95ffc8d9d0f622f7af88085f9"
---
# Secrets Management -- SOPS, Sealed Secrets, and Vault

## When This Activates

Activates when diffs touch SOPS configuration or encrypted files, Sealed Secrets manifests, HashiCorp Vault policies or configuration, or External Secrets Operator resources. These tools form the secrets management layer for GitOps and IaC workflows -- a SOPS key that is never rotated accumulates exposure risk with every team member change, a Vault policy with wildcard paths grants access to every secret in the instance, and plaintext secrets in git history remain extractable even after encryption is added. This reviewer catches secrets management misconfigurations that undermine the entire encryption and access control chain.

## Audit Surface

- [ ] SOPS key age exceeding rotation policy
- [ ] Sealed Secrets controller not updated in 6+ months
- [ ] Vault policy with broad path wildcards
- [ ] Secrets backend without encryption at rest
- [ ] Secret without rotation schedule or expiry
- [ ] Git history containing plaintext secrets
- [ ] Vault audit device not enabled
- [ ] Missing .sops.yaml configuration
- [ ] SealedSecret with cluster-wide scope
- [ ] Vault token or AppRole without TTL
- [ ] SOPS file encrypted to revoked or expired key
- [ ] Vault policy with root or sudo capability
- [ ] External Secrets without refresh interval
- [ ] Missing secret version tracking

## Detailed Checks

### SOPS Configuration and Key Management
<!-- activation: keywords=["sops", ".sops.yaml", "creation_rules", "age", "pgp", "kms", "gcp_kms", "azure_kv", "encrypted_regex", "mac"] -->

- [ ] **Missing .sops.yaml**: flag repositories using SOPS without a `.sops.yaml` configuration file -- without creation_rules, each encrypt operation requires manual key specification, leading to inconsistent encryption and wrong-key errors
- [ ] **Key not rotated**: flag SOPS-encrypted files where the encryption key (AGE, PGP, KMS) has not been rotated within the organization's key rotation policy (typically 90 days) -- stale keys accumulate exposure; use `sops updatekeys` to re-encrypt with current keys
- [ ] **Encrypted to revoked key**: flag SOPS files still encrypted to keys belonging to departed team members or revoked service accounts -- run `sops updatekeys` to remove revoked recipients
- [ ] **encrypted_regex too narrow**: flag `.sops.yaml` creation_rules with `encrypted_regex` that does not cover all secret fields -- fields outside the regex are stored in plaintext in the SOPS file, visible in Git
- [ ] **Plaintext MAC tampering risk**: flag SOPS files without MAC (Message Authentication Code) verification -- MAC ensures the encrypted file has not been tampered with; SOPS adds MAC by default but it can be stripped

### Sealed Secrets
<!-- activation: keywords=["SealedSecret", "sealed-secret", "kubeseal", "scope", "cluster-wide", "namespace-wide", "strict", "controller"] -->

- [ ] **Outdated controller**: flag Sealed Secrets controller versions not updated within 6 months -- controller updates include security fixes and certificate rotation; outdated controllers may have known vulnerabilities
- [ ] **Cluster-wide scope without justification**: flag SealedSecrets with `sealedsecrets.bitnami.com/cluster-wide: "true"` -- cluster-wide scope allows the secret to be decrypted in any namespace, violating namespace isolation; use strict (default) or namespace-wide scope
- [ ] **Certificate rotation not configured**: flag Sealed Secrets installations without automatic certificate rotation -- the sealing key certificate expires; without rotation, all SealedSecrets become undecryptable after expiry
- [ ] **Raw Secret alongside SealedSecret**: flag plain Kubernetes Secret manifests in the same directory as SealedSecrets -- this indicates incomplete migration to SealedSecrets, with some secrets still in plaintext

### Vault Policy and Access
<!-- activation: keywords=["vault", "policy", "path", "capabilities", "create", "read", "update", "delete", "list", "sudo", "root", "AppRole", "token", "ttl", "max_ttl", "audit"] -->

- [ ] **Overly broad policy path**: flag Vault policies with paths like `secret/*`, `sys/*`, or `+/+/*` with broad capabilities (create, read, update, delete, list) -- wildcard paths grant access to all secrets under the path; use specific paths per application or service
- [ ] **Root or sudo capability**: flag Vault policies granting `root` token access or `sudo` capability on sensitive paths -- root tokens bypass all policies; sudo allows policy-override operations that should be restricted to break-glass procedures
- [ ] **Token without TTL**: flag Vault tokens or AppRole configurations without `default_ttl` and `max_ttl` -- tokens without TTL never expire, accumulating as permanent credential exposure; set TTL based on usage pattern (short for CI, moderate for services)
- [ ] **Audit device not enabled**: flag Vault instances without at least one audit device enabled -- without audit logging, secret access is untraceable; enable file or syslog audit device and ship logs to SIEM
- [ ] **Missing response wrapping**: flag Vault secret delivery to applications without response wrapping (cubbyhole) for initial token delivery -- unwrapped tokens can be intercepted during delivery

### Plaintext Secrets in Git
<!-- activation: keywords=["git", "history", "log", "rebase", "BFG", "filter-branch", "plaintext", "committed"] -->

- [ ] **Plaintext in git history**: flag repositories where SOPS or SealedSecrets were adopted but git history still contains the original plaintext secrets -- `git log -p` reveals every previous version; use BFG Repo-Cleaner or `git filter-repo` to remove plaintext from history
- [ ] **Encryption added without history rewrite**: flag commits that encrypt a previously-plaintext file without evidence of history cleanup -- the encrypted file is secure going forward, but the plaintext commit remains accessible
- [ ] **Force-push required acknowledgment**: flag history rewrites that will require force-push to shared branches -- coordinate with the team to ensure all clones rebase

### Secret Rotation and Lifecycle
<!-- activation: keywords=["rotate", "rotation", "expire", "ttl", "lease", "renew", "refresh", "ExternalSecret", "refreshInterval", "version"] -->

- [ ] **No rotation schedule**: flag secrets (database credentials, API keys, TLS certificates) with no evidence of automated rotation -- use Vault's dynamic secrets, AWS Secrets Manager rotation, or External Secrets Operator's refreshInterval
- [ ] **External Secrets without refresh**: flag ExternalSecret resources without `spec.refreshInterval` -- without refresh, the Kubernetes Secret is populated once and never updated, making rotation at the source ineffective
- [ ] **Missing secret version tracking**: flag secrets management without version identifiers (Vault KV v2 versioning, AWS Secrets Manager version stages) -- without versioning, rotation requires coordinated deployment; versioning enables gradual migration

## Common False Positives

- **Development SOPS keys without rotation**: development and testing keys do not need the same rotation cadence as production keys.
- **Cluster-wide SealedSecret for shared infrastructure**: some secrets (TLS wildcard certificates, shared service accounts) legitimately need cluster-wide scope.
- **Broad Vault policy for admin automation**: CI/CD automation that provisions Vault paths may need broader policies temporarily; verify these are time-limited.
- **Plaintext in git history for non-sensitive repos**: public/open-source repositories may have acceptable plaintext in history if the values are example or test credentials.

## Severity Guidance

| Finding | Severity |
|---|---|
| Vault policy with root or sudo capability | Critical |
| Plaintext secrets in git history (production credentials) | Critical |
| Vault audit device not enabled | Critical |
| Secrets backend without encryption at rest | Critical |
| Vault policy with broad wildcard paths | Important |
| SOPS key not rotated within policy period | Important |
| Vault token or AppRole without TTL | Important |
| SealedSecret with cluster-wide scope | Important |
| Sealed Secrets controller not updated | Important |
| ExternalSecret without refresh interval | Important |
| Missing .sops.yaml configuration | Minor |
| Missing secret version tracking | Minor |
| SOPS encrypted_regex too narrow | Minor |

## See Also

- `sec-secrets-management-and-rotation` -- comprehensive secrets management patterns beyond IaC tools
- `sec-owasp-a05-misconfiguration` -- misconfigured secrets management is a top security risk
- `iac-argocd` -- Argo CD integrates with SOPS and SealedSecrets for GitOps secret delivery
- `iac-fluxcd` -- Flux CD has native SOPS decryption support
- `iac-terraform` -- Terraform state contains secrets that need encryption

## Authoritative References

- [SOPS Documentation](https://github.com/getsops/sops)
- [Sealed Secrets Documentation](https://github.com/bitnami-labs/sealed-secrets)
- [HashiCorp Vault Security Best Practices](https://developer.hashicorp.com/vault/tutorials/operations/production-hardening)
- [HashiCorp Vault Policies](https://developer.hashicorp.com/vault/docs/concepts/policies)
- [External Secrets Operator Documentation](https://external-secrets.io/)
