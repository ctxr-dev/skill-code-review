---
id: compliance-iso27001
type: primary
depth_role: leaf
focus: Detect ISO 27001 Annex A control gaps including missing asset classification, absent access control policy enforcement, missing backup verification, no secure development lifecycle signals, and information leakage channels
parents:
  - index.md
covers:
  - Missing information asset classification or labeling
  - No access control policy enforcement in code
  - Missing backup verification or integrity check
  - No secure development lifecycle signals in pipeline
  - Information leakage through error messages or metadata
  - Missing logging and monitoring for security events
  - No network segmentation signals in service configuration
  - Missing malware protection or input validation controls
  - Cryptographic controls not aligned with policy
  - Missing physical or environmental security signals in deployment config
tags:
  - iso27001
  - annex-a
  - isms
  - asset-classification
  - access-control
  - secure-development
  - information-leakage
  - compliance
activation:
  file_globs:
    - "**/*security*"
    - "**/*policy*"
    - "**/*classify*"
    - "**/*classification*"
    - "**/*backup*"
    - "**/*restore*"
    - "**/*deploy*"
    - "**/*pipeline*"
    - "**/Dockerfile"
    - "**/.github/workflows/*"
    - "**/*network*"
    - "**/*firewall*"
  keyword_matches:
    - iso27001
    - ISO27001
    - isms
    - classification
    - confidential
    - restricted
    - internal
    - access_control
    - access_policy
    - backup
    - restore
    - sast
    - dast
    - security_testing
    - information_leakage
    - asset_inventory
    - network_policy
    - segmentation
  structural_signals:
    - Security policy configuration or enforcement
    - Asset or data classification logic
    - Backup or recovery configuration
    - "CI/CD security scanning stage"
source:
  origin: file
  path: compliance-iso27001.md
  hash: "sha256:469f4f8c64d1edb749ece3e30fdc11c2e6104840ab4336f2c67fd1f256454b90"
---
# ISO 27001 Annex A Controls

## When This Activates

Activates when diffs touch security policy enforcement, access control logic, backup configuration, CI/CD pipeline security stages, deployment manifests, or error handling that may leak information. ISO 27001 (2022 revision) requires an Information Security Management System (ISMS) with controls from Annex A spanning organizational, people, physical, and technological categories. Code-level signals reveal whether these controls are implemented or merely documented -- a gap auditors will identify during certification surveillance visits.

**Framework**: ISO/IEC 27001:2022, Annex A (93 controls in 4 themes).

## Audit Surface

- [ ] Data model or storage without classification label (public, internal, confidential, restricted)
- [ ] API endpoint without access control policy check
- [ ] No role-based or attribute-based access enforcement on sensitive operations
- [ ] Backup configuration without integrity verification or test restore
- [ ] CI/CD pipeline without security testing stage (SAST, DAST, dependency scan)
- [ ] Error response exposing internal paths, stack traces, or system details
- [ ] HTTP headers leaking server version, framework, or technology stack
- [ ] Verbose exception output in production configuration
- [ ] Security event (auth failure, access denial) not logged
- [ ] No network policy or firewall rules in deployment manifests
- [ ] Cryptographic algorithm selection not aligned with organizational policy
- [ ] File upload without malware scanning or type validation
- [ ] Metadata (EXIF, document properties) not stripped from user-facing output
- [ ] Privileged operation without additional authentication step
- [ ] No asset inventory reference for new services or data stores

## Detailed Checks

### Asset Classification and Inventory (A.5.9, A.5.10, A.5.12)
<!-- activation: keywords=["classification", "label", "asset", "inventory", "confidential", "restricted", "internal", "public", "data_class", "sensitivity"] -->

- [ ] **No classification on data models**: flag new data models, database tables, or storage buckets that lack classification annotations (public, internal, confidential, restricted). A.5.12 requires information classification and labeling aligned with the classification scheme
- [ ] **No asset inventory update for new services**: flag new services, data stores, or external integrations introduced without reference to an asset inventory or register. A.5.9 requires an inventory of information and associated assets
- [ ] **Classification not enforced in access paths**: flag data access paths where the classification label is present in the model but not checked in the access control layer. Labels without enforcement provide false assurance

### Access Control Policy Enforcement (A.5.15, A.5.18, A.8.3)
<!-- activation: keywords=["access", "role", "rbac", "abac", "permission", "authorize", "grant", "deny", "privilege", "admin", "policy"] -->

- [ ] **Missing access control on endpoints**: flag API endpoints or handlers serving classified data without access control checks. A.5.15 requires access control rules based on business and security requirements
- [ ] **No least-privilege enforcement**: flag default role assignments that grant excessive permissions. A.5.18 requires access rights provisioned on a need-to-know, need-to-use basis
- [ ] **Privileged operations without step-up auth**: flag administrative operations (user management, configuration changes, data export) that do not require additional authentication beyond standard session tokens. A.8.3 requires privileged access management controls
- [ ] **No access revocation process**: flag user lifecycle code that creates accounts without a corresponding deactivation or revocation mechanism. Cross-reference with `principle-encapsulation`

### Secure Development Lifecycle (A.8.25, A.8.26, A.8.27)
<!-- activation: keywords=["pipeline", "ci", "cd", "sast", "dast", "security_scan", "dependency", "vulnerability", "test", "review"] -->

- [ ] **No security testing in CI/CD**: flag deployment pipelines without SAST, DAST, or dependency vulnerability scanning stages. A.8.25 requires secure development rules applied throughout the lifecycle
- [ ] **No dependency scanning**: flag projects with third-party dependencies that have no automated vulnerability scanning (Dependabot, Snyk, Trivy, npm audit). A.8.26 requires application security requirements
- [ ] **No code review enforcement**: flag repositories where branch protection does not require pull request reviews before merge. A.8.27 requires secure system architecture and engineering principles

### Information Leakage Prevention (A.5.14, A.8.12)
<!-- activation: keywords=["error", "exception", "stack_trace", "header", "server", "version", "metadata", "exif", "verbose", "debug"] -->

- [ ] **Stack traces in production responses**: flag error handlers returning full stack traces, internal file paths, or framework details in production API responses. A.8.12 requires data leakage prevention
- [ ] **Server version headers exposed**: flag web server or application framework configuration that does not suppress `Server`, `X-Powered-By`, or other technology-revealing headers
- [ ] **Metadata leakage in files**: flag file serving endpoints that do not strip EXIF data from images or metadata from documents before serving to users. Metadata can reveal internal paths, author names, and system information
- [ ] **Verbose logging in production**: flag production configurations with DEBUG or TRACE log levels enabled, which may expose sensitive internal state. Cross-reference with `sec-owasp-a09-logging-monitoring-failures`

### Backup and Recovery (A.8.13, A.8.14)
<!-- activation: keywords=["backup", "restore", "recovery", "snapshot", "replicate", "rpo", "rto", "disaster"] -->

- [ ] **No backup verification**: flag backup configurations without automated integrity verification or test restore procedures. A.8.13 requires backup copies to be tested regularly
- [ ] **No recovery point objective defined**: flag data storage systems without documented RPO/RTO targets or automated backup schedules
- [ ] **Backup without encryption**: flag backup configurations that do not encrypt backup data at rest, especially for classified or confidential data

### Cryptographic Controls (A.8.24)
<!-- activation: keywords=["encrypt", "decrypt", "cipher", "algorithm", "AES", "RSA", "SHA", "TLS", "certificate", "key"] -->

- [ ] **Weak cryptographic algorithm**: flag use of deprecated algorithms (MD5, SHA1 for integrity, DES, 3DES, RC4) that violate organizational cryptographic policy. A.8.24 requires defined rules for effective use of cryptography
- [ ] **Inconsistent TLS configuration**: flag mixed TLS versions or cipher suites across services that should share the same cryptographic baseline. Cross-reference with `crypto-password-hashing-argon2-scrypt-bcrypt`

## Common False Positives

- **Development-only configurations**: debug logging, permissive CORS, and simplified auth in development configurations are expected.
- **Test environments**: CI pipelines for test environments may legitimately lack production security scanning stages.
- **Public data**: data explicitly classified as public does not require encryption or strict access controls.
- **Framework defaults**: some frameworks (Spring Boot, Rails) include sensible security defaults that satisfy controls without explicit code.

## Severity Guidance

| Finding | Severity |
|---|---|
| Classified data endpoint without access control | Critical |
| Stack traces or internal details in production error responses | Critical |
| No security testing in CI/CD pipeline | Important |
| No backup verification or test restore | Important |
| Weak cryptographic algorithm in production | Important |
| No asset classification on data models | Important |
| Server version headers exposed | Minor |
| No asset inventory reference for new services | Minor |
| Metadata not stripped from user-facing files | Minor |

## See Also

- `sec-owasp-a09-logging-monitoring-failures` -- logging and monitoring controls overlap with A.8.15, A.8.16
- `sec-secrets-management-and-rotation` -- cryptographic key management aligns with A.8.24
- `compliance-soc2` -- significant control overlap between ISO 27001 and SOC 2 TSC
- `compliance-fedramp-nist-800-53` -- NIST 800-53 maps to many ISO 27001 controls
- `principle-encapsulation` -- access control boundaries align with encapsulation principles

## Authoritative References

- [ISO/IEC 27001:2022 - Information Security Management Systems](https://www.iso.org/standard/27001)
- [ISO/IEC 27002:2022 - Information Security Controls](https://www.iso.org/standard/75652.html)
- [ISO 27001 Annex A Controls Reference](https://www.iso.org/standard/75652.html)
- [NIST Cybersecurity Framework to ISO 27001 Mapping](https://www.nist.gov/cyberframework)
