---
id: compliance-fedramp-nist-800-53
type: primary
depth_role: leaf
focus: Detect FedRAMP and NIST 800-53 compliance gaps including non-FIPS 140-2 cryptography, missing continuous monitoring, boundary protection gaps, absent audit record generation, and MFA not enforced
parents:
  - index.md
covers:
  - Cryptographic modules not FIPS 140-2 validated
  - Missing continuous monitoring or automated scanning
  - Boundary protection gaps between security zones
  - Audit record generation missing for security-relevant events
  - Multi-factor authentication not enforced for privileged access
  - Session management not enforcing timeouts or re-authentication
  - System interconnection without documented authorization
  - Configuration management baseline not enforced
  - Least privilege not implemented in service accounts
  - Missing system integrity verification or file integrity monitoring
tags:
  - fedramp
  - nist-800-53
  - fips-140-2
  - continuous-monitoring
  - boundary-protection
  - audit-records
  - mfa
  - compliance
  - federal
activation:
  file_globs:
    - "**/*fedramp*"
    - "**/*fips*"
    - "**/*nist*"
    - "**/*gov*"
    - "**/*federal*"
    - "**/*boundary*"
    - "**/*audit*"
    - "**/*compliance*"
    - "**/*security_group*"
    - "**/*network_policy*"
    - "**/Dockerfile"
  keyword_matches:
    - fedramp
    - FedRAMP
    - fips
    - FIPS
    - nist
    - NIST
    - 800-53
    - continuous_monitoring
    - boundary_protection
    - audit_record
    - mfa
    - multi_factor
    - fips_mode
    - FIPS_MODE
    - gov
    - federal
    - authorization_boundary
    - security_control
    - conmon
    - poam
  structural_signals:
    - Infrastructure security group or network policy definition
    - Audit logging configuration for security events
    - Authentication flow with MFA check
    - Cryptographic module initialization or configuration
source:
  origin: file
  path: compliance-fedramp-nist-800-53.md
  hash: "sha256:84355aaff99a6b4febb3a58ffe49e52ced1a71290051e80802bc193651151e5d"
---
# FedRAMP / NIST 800-53

## When This Activates

Activates when diffs touch cryptographic configuration, audit logging, authentication flows, network boundaries, deployment infrastructure, or compliance-related configuration. FedRAMP authorization requires cloud services to implement NIST SP 800-53 controls at Low, Moderate, or High baselines. Code-level violations -- non-FIPS cryptography, missing audit records, unprotected boundaries, or absent MFA -- prevent or jeopardize Authorization to Operate (ATO). These gaps are identified during 3PAO assessment and continuous monitoring and can result in ATO suspension.

**Framework**: NIST SP 800-53 Rev 5, FedRAMP Baselines (Low/Moderate/High).

## Audit Surface

- [ ] Non-FIPS cryptographic library or algorithm used (OpenSSL without FIPS mode)
- [ ] AES key size below 256 bits in government context
- [ ] No automated vulnerability scanning in CI/CD pipeline
- [ ] No continuous monitoring agent or configuration reference
- [ ] Service-to-service communication crossing trust boundary without TLS mutual auth
- [ ] External API call without network boundary enforcement
- [ ] Security event not generating audit record (AU-2 event list)
- [ ] Audit record missing required fields (identity, timestamp, outcome, source)
- [ ] Administrative endpoint without MFA enforcement
- [ ] Session timeout not configured or exceeds 15-minute idle limit
- [ ] System interconnection without authorization reference in config
- [ ] Infrastructure deployed without hardened baseline image reference
- [ ] Service account with broad permissions instead of least privilege
- [ ] No file integrity monitoring or system integrity verification
- [ ] Unapproved software or package installed without justification

## Detailed Checks

### FIPS 140-2/140-3 Cryptographic Compliance (SC-13)
<!-- activation: keywords=["fips", "FIPS", "crypto", "encrypt", "decrypt", "AES", "RSA", "SHA", "openssl", "bouncycastle", "tls", "certificate", "key_size"] -->

- [ ] **Non-FIPS cryptographic module**: flag use of cryptographic libraries not operating in FIPS mode. OpenSSL must be compiled with FIPS module enabled; BouncyCastle must use the FIPS-certified provider; AWS SDK must use AWS-LC FIPS. SC-13 requires FIPS-validated cryptography for all federal data
- [ ] **Non-approved algorithm**: flag use of algorithms not on the FIPS approved list (MD5, SHA-1 for signatures, DES, 3DES, RC4, Blowfish). Only FIPS-approved algorithms (AES, SHA-2/SHA-3, RSA 2048+, ECDSA P-256+) are acceptable
- [ ] **Insufficient key length**: flag AES-128 where AES-256 is required by the system security plan, or RSA below 2048 bits. FedRAMP High baseline typically requires AES-256
- [ ] **TLS configuration not FIPS-compliant**: flag TLS cipher suites including non-FIPS algorithms or TLS versions below 1.2. Cross-reference with `crypto-password-hashing-argon2-scrypt-bcrypt`

### Audit Record Generation (AU-2, AU-3, AU-12)
<!-- activation: keywords=["audit", "log", "event", "record", "trail", "security_event", "login", "logout", "access", "modify", "delete"] -->

- [ ] **Missing audit record for AU-2 events**: flag security-relevant events not generating audit records. AU-2 events typically include: successful/failed logons, privilege escalation, account management, object access, policy changes, and system events
- [ ] **Audit record missing required fields**: flag audit log entries without all AU-3 required fields: event type, timestamp (UTC), source, identity of subject, outcome (success/failure), and affected object
- [ ] **Audit records not centralized**: flag logging configurations that write audit records only to local storage without forwarding to a centralized log management system. AU-6 requires audit review and analysis capability. Cross-reference with `sec-owasp-a09-logging-monitoring-failures`

### Boundary Protection (SC-7)
<!-- activation: keywords=["boundary", "firewall", "security_group", "network_policy", "ingress", "egress", "proxy", "gateway", "dmz", "trust_zone"] -->

- [ ] **No boundary enforcement between zones**: flag service-to-service communication crossing trust boundaries (internet-facing to internal, public to management) without TLS mutual authentication or network-level controls
- [ ] **Missing egress controls**: flag outbound network calls from application code with no reference to egress filtering, proxy, or allowed-destination configuration. SC-7(5) requires deny-by-default egress with explicit allow rules
- [ ] **Authorization boundary not documented**: flag new external service integrations without reference to system interconnection agreements or authorization boundary documentation

### Multi-Factor Authentication (IA-2)
<!-- activation: keywords=["mfa", "multi_factor", "two_factor", "2fa", "totp", "authenticator", "yubikey", "fido", "webauthn", "admin", "privileged"] -->

- [ ] **No MFA for privileged access**: flag administrative endpoints, infrastructure management interfaces, or privileged operations that do not enforce multi-factor authentication. IA-2(1) requires MFA for privileged accounts
- [ ] **No MFA for network access**: flag remote access or VPN configurations without MFA enforcement. IA-2(2) requires MFA for network access to non-privileged accounts at Moderate baseline and above
- [ ] **MFA bypass in code**: flag conditional logic that allows skipping MFA verification for certain users or conditions in production code paths

### Continuous Monitoring (CA-7, RA-5)
<!-- activation: keywords=["scan", "vulnerability", "monitor", "continuous", "baseline", "compliance", "nessus", "qualys", "rapid7", "conmon"] -->

- [ ] **No vulnerability scanning in pipeline**: flag CI/CD pipelines without automated vulnerability scanning (SAST, DAST, container scanning). RA-5 requires automated vulnerability scanning with defined frequency
- [ ] **No continuous monitoring reference**: flag deployment configurations without reference to continuous monitoring agents or scanning configurations. CA-7 requires ongoing assessment of security controls
- [ ] **No configuration baseline enforcement**: flag infrastructure deployments not referencing hardened baseline images (CIS benchmarks, STIGs). CM-2 requires documented configuration baselines

### Session Management (AC-12, SC-10)
<!-- activation: keywords=["session", "timeout", "idle", "expire", "token", "jwt", "cookie", "re_authenticate"] -->

- [ ] **No session timeout**: flag session configurations without idle timeout. FedRAMP Moderate requires 15-minute idle timeout for web applications and 30 minutes for non-interactive sessions
- [ ] **Session timeout too long**: flag idle timeouts exceeding 15 minutes for interactive web sessions. AC-12 requires automatic session termination after defined inactivity
- [ ] **No re-authentication for sensitive operations**: flag sensitive operations (data export, admin actions) that do not require re-authentication after session establishment

## Common False Positives

- **Non-federal deployments**: FIPS requirements apply only to systems processing federal data. Commercial deployments may legitimately use non-FIPS cryptography.
- **FIPS mode at infrastructure level**: when FIPS is enforced at the OS or container level (FIPS-enabled RHEL, FIPS-enabled EKS), application-level FIPS configuration may be redundant.
- **Development environments**: non-production environments may use non-FIPS configurations for testing convenience.
- **Pre-ATO development**: systems in development before ATO submission may not yet implement all controls.

## Severity Guidance

| Finding | Severity |
|---|---|
| Non-FIPS cryptographic module in federal system | Critical |
| Security event not generating audit record | Critical |
| Administrative access without MFA | Critical |
| Service crossing trust boundary without mutual TLS | Important |
| No vulnerability scanning in CI/CD pipeline | Important |
| Session timeout exceeding 15 minutes | Important |
| Audit record missing required AU-3 fields | Important |
| No continuous monitoring reference | Minor |
| No configuration baseline enforcement | Minor |
| Missing egress controls | Minor |

## See Also

- `sec-owasp-a09-logging-monitoring-failures` -- audit logging requirements overlap with AU-2/AU-3
- `sec-secrets-management-and-rotation` -- credential management aligns with IA controls
- `compliance-iso27001` -- ISO 27001 maps to many NIST 800-53 controls
- `compliance-soc2` -- SOC 2 and FedRAMP share common security control themes
- `principle-fail-fast` -- boundary violations should fail fast rather than fall through

## Authoritative References

- [NIST SP 800-53 Rev 5 - Security and Privacy Controls](https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final)
- [FedRAMP Security Controls Baselines](https://www.fedramp.gov/documents/)
- [FIPS 140-2 / FIPS 140-3 Standard](https://csrc.nist.gov/publications/detail/fips/140/3/final)
- [NIST SP 800-137 - Continuous Monitoring](https://csrc.nist.gov/publications/detail/sp/800-137/final)
- [FedRAMP Continuous Monitoring Strategy Guide](https://www.fedramp.gov/assets/resources/documents/CSP_Continuous_Monitoring_Strategy_Guide.pdf)
