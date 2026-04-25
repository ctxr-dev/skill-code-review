---
id: hash-certificate
type: index
depth_role: subcategory
depth: 1
focus: "AES-GCM nonce reuse (catastrophic -- reveals authentication key); Argon2 configured with insufficient memory parameter for the deployment environment; CN/SAN not validated against expected client identity; Certificate chain not verified to a trusted root CA"
parents:
  - "../index.md"
shared_covers: []
entries:
  - id: crypto-jwt-pitfalls
    file: crypto-jwt-pitfalls.md
    type: primary
    focus: Detect JWT security pitfalls including algorithm confusion, missing claim validation, and unsafe token storage
    tags:
      - jwt
      - authentication
      - token
      - cryptography
      - CWE-345
      - CWE-347
      - CWE-290
  - id: crypto-nonce-iv-management
    file: crypto-nonce-iv-management.md
    type: primary
    focus: Detect static, reused, or improperly generated initialization vectors and nonces in symmetric encryption
    tags:
      - cryptography
      - nonce
      - IV
      - initialization-vector
      - GCM
      - CTR
      - CBC
      - CWE-329
      - CWE-330
  - id: footgun-hash-selection-and-salting
    file: footgun-hash-selection-and-salting.md
    type: primary
    focus: Detect weak hash functions for security purposes, unsalted or improperly salted hashes, hash truncation, and password hashing without KDF
    tags:
      - hash
      - salt
      - HMAC
      - MD5
      - SHA1
      - password
      - KDF
      - CWE-328
      - CWE-759
      - CWE-916
      - cryptography
      - password-hashing
      - bcrypt
      - argon2
      - scrypt
      - PBKDF2
      - authentication
      - CWE-261
      - hash-collision
      - HashDoS
      - denial-of-service
      - hash-table
      - CWE-407
      - CWE-400
      - hashing
      - integrity
      - collision-resistance
      - CWE-760
  - id: net-tls-configuration
    file: net-tls-configuration.md
    type: primary
    focus: Detect network-level TLS deployment issues in reverse proxies and load balancers including weak cipher suites in server config, missing OCSP stapling, certificate management gaps, and TLS termination at wrong layer
    tags:
      - tls
      - ssl
      - nginx
      - haproxy
      - envoy
      - traefik
      - caddy
      - certificate
      - ocsp
      - sni
      - cipher
      - proxy
      - termination
      - mtls
      - certificates
      - authentication
      - mutual-auth
      - CWE-295
      - CWE-296
      - CWE-297
      - configuration
      - transport-security
      - CWE-326
      - CWE-327
  - id: sec-owasp-a02-crypto-failures
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
    file: "../cwe-encryption/sec-owasp-a02-crypto-failures.md"
  - id: sec-owasp-a07-authn-failures
    file: sec-owasp-a07-authn-failures.md
    type: primary
    focus: Detect weak authentication mechanisms, insecure session management, and credential handling flaws
    tags:
      - owasp
      - a07
      - authentication
      - session
      - jwt
      - cookie
      - credential
      - password
      - mfa
      - login
      - security
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Hash Certificate

**Focus:** AES-GCM nonce reuse (catastrophic -- reveals authentication key); Argon2 configured with insufficient memory parameter for the deployment environment; CN/SAN not validated against expected client identity; Certificate chain not verified to a trusted root CA

## Children

| File | Type | Focus |
|------|------|-------|
| [crypto-jwt-pitfalls.md](crypto-jwt-pitfalls.md) | 📄 primary | Detect JWT security pitfalls including algorithm confusion, missing claim validation, and unsafe token storage |
| [crypto-nonce-iv-management.md](crypto-nonce-iv-management.md) | 📄 primary | Detect static, reused, or improperly generated initialization vectors and nonces in symmetric encryption |
| [footgun-hash-selection-and-salting.md](footgun-hash-selection-and-salting.md) | 📄 primary | Detect weak hash functions for security purposes, unsalted or improperly salted hashes, hash truncation, and password hashing without KDF |
| [net-tls-configuration.md](net-tls-configuration.md) | 📄 primary | Detect network-level TLS deployment issues in reverse proxies and load balancers including weak cipher suites in server config, missing OCSP stapling, certificate management gaps, and TLS termination at wrong layer |
| [sec-owasp-a07-authn-failures.md](sec-owasp-a07-authn-failures.md) | 📄 primary | Detect weak authentication mechanisms, insecure session management, and credential handling flaws |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
