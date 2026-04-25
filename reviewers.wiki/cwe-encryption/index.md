---
id: cwe-encryption
type: index
depth_role: subcategory
depth: 1
focus: Access tokens with excessive scope violating principle of least privilege; Array or table indexing with secret-dependent indices enabling cache-timing attacks; Attestation not validated when required by organizational policy; Authenticator response counter not checked for cloned authenticator detection
parents:
  - "../index.md"
shared_covers: []
entries:
  - id: crypto-oauth-oidc-pitfalls
    file: crypto-oauth-oidc-pitfalls.md
    type: primary
    focus: Detect OAuth 2.0 and OpenID Connect security pitfalls including deprecated flows, missing PKCE, and token mishandling
    tags:
      - oauth
      - oidc
      - authentication
      - authorization
      - token
      - CWE-346
      - CWE-352
      - CWE-601
  - id: crypto-padding-oracle
    file: crypto-padding-oracle.md
    type: primary
    focus: Detect padding oracle attack surfaces arising from unauthenticated CBC encryption and distinguishable error responses
    tags:
      - cryptography
      - padding-oracle
      - CBC
      - authenticated-encryption
      - MAC
      - HMAC
      - CWE-354
      - CWE-347
  - id: crypto-timing-attacks
    file: crypto-timing-attacks.md
    type: primary
    focus: Detect timing side-channel vulnerabilities in cryptographic comparison and verification operations
    tags:
      - cryptography
      - timing-attack
      - side-channel
      - constant-time
      - HMAC
      - token-verification
      - CWE-208
  - id: crypto-webauthn-passkeys
    file: crypto-webauthn-passkeys.md
    type: primary
    focus: Detect WebAuthn, Passkeys, and FIDO2 security pitfalls including challenge replay, origin validation, and credential binding errors
    tags:
      - webauthn
      - passkeys
      - fido2
      - authentication
      - mfa
      - CWE-287
      - CWE-346
  - id: sec-owasp-a02-crypto-failures
    file: sec-owasp-a02-crypto-failures.md
    type: primary
    focus: Detect use of weak cryptographic algorithms, insecure key management, and missing encryption for sensitive data in transit and at rest
    tags:
      - owasp
      - cryptography
      - encryption
      - hashing
      - TLS
      - key-management
      - password-storage
      - sensitive-data
      - CWE-327
      - CWE-328
      - CWE-326
      - CWE-319
      - CWE-312
      - CWE-916
      - algorithm
      - cipher
  - id: sec-owasp-a04-insecure-design
    file: sec-owasp-a04-insecure-design.md
    type: primary
    focus: Detect missing security controls that stem from flawed design -- absent rate limiting, business logic flaws, missing trust boundaries, and insufficient resource constraints
    tags:
      - owasp
      - insecure-design
      - rate-limiting
      - business-logic
      - race-condition
      - trust-boundary
      - resource-limits
      - TOCTOU
      - CWE-799
      - CWE-770
      - CWE-307
      - CWE-362
      - CWE-840
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Cwe Encryption

**Focus:** Access tokens with excessive scope violating principle of least privilege; Array or table indexing with secret-dependent indices enabling cache-timing attacks; Attestation not validated when required by organizational policy; Authenticator response counter not checked for cloned authenticator detection

## Children

| File | Type | Focus |
|------|------|-------|
| [crypto-oauth-oidc-pitfalls.md](crypto-oauth-oidc-pitfalls.md) | 📄 primary | Detect OAuth 2.0 and OpenID Connect security pitfalls including deprecated flows, missing PKCE, and token mishandling |
| [crypto-padding-oracle.md](crypto-padding-oracle.md) | 📄 primary | Detect padding oracle attack surfaces arising from unauthenticated CBC encryption and distinguishable error responses |
| [crypto-timing-attacks.md](crypto-timing-attacks.md) | 📄 primary | Detect timing side-channel vulnerabilities in cryptographic comparison and verification operations |
| [crypto-webauthn-passkeys.md](crypto-webauthn-passkeys.md) | 📄 primary | Detect WebAuthn, Passkeys, and FIDO2 security pitfalls including challenge replay, origin validation, and credential binding errors |
| [sec-owasp-a02-crypto-failures.md](sec-owasp-a02-crypto-failures.md) | 📄 primary | Detect use of weak cryptographic algorithms, insecure key management, and missing encryption for sensitive data in transit and at rest |
| [sec-owasp-a04-insecure-design.md](sec-owasp-a04-insecure-design.md) | 📄 primary | Detect missing security controls that stem from flawed design -- absent rate limiting, business logic flaws, missing trust boundaries, and insufficient resource constraints |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
