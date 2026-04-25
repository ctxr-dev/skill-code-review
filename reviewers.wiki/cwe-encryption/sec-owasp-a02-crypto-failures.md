---
id: sec-owasp-a02-crypto-failures
type: primary
depth_role: leaf
focus: Detect use of weak cryptographic algorithms, insecure key management, and missing encryption for sensitive data in transit and at rest
parents:
  - index.md
  - "../hash-certificate/index.md"
covers:
  - "Use of broken or weak hash algorithms (MD5, SHA1) for security-sensitive purposes"
  - "Use of obsolete symmetric ciphers (DES, 3DES, RC4, Blowfish) or insecure modes (ECB)"
  - Hardcoded encryption keys, secrets, or passwords in source code
  - "Insufficient key length (RSA <2048 bits, AES <128 bits, EC <256 bits)"
  - "HTTP URLs used for transmitting sensitive data instead of HTTPS/TLS"
  - Custom or home-grown cryptographic implementations
  - "Predictable or reused initialization vectors (IVs) and nonces"
  - "Passwords stored as plaintext or hashed without proper KDF (bcrypt, argon2, scrypt)"
  - "Sensitive data (passwords, tokens, PII) written to logs or error messages"
  - Missing at-rest encryption for databases, files, or backups containing PII or secrets
  - Certificate validation disabled or hostname verification skipped
  - Weak or missing HMAC on data requiring integrity verification
  - "MD5 or SHA1 used for security-sensitive purposes (signatures, MACs, password hashing)"
  - DES, 3DES, RC4, or Blowfish selected in new encryption code
  - RSA key size below 2048 bits
  - "RSA encryption with PKCS#1 v1.5 padding instead of OAEP"
  - ECB mode used with any block cipher
  - Custom or roll-your-own cryptographic algorithm implementations
  - "Deprecated TLS versions (1.0, 1.1) explicitly configured"
  - "Weak cipher suites enabled (NULL, EXPORT, DES, RC4)"
  - DSA selected for new signing code instead of EdDSA or ECDSA
  - Hardcoded algorithm strings that prevent cryptographic agility
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
aliases:
  - crypto-algorithm-selection
activation:
  file_globs:
    - "**/*crypto*"
    - "**/*crypt*"
    - "**/*encrypt*"
    - "**/*hash*"
    - "**/*password*"
    - "**/*secret*"
    - "**/*tls*"
    - "**/*ssl*"
    - "**/*cert*"
    - "**/*key*"
    - "**/*.pem"
    - "**/*.key"
    - "**/*.env"
    - "**/*config*"
  keyword_matches:
    - crypto
    - encrypt
    - decrypt
    - hash
    - MD5
    - SHA1
    - SHA256
    - AES
    - RSA
    - key
    - secret
    - password
    - bcrypt
    - argon2
    - scrypt
    - TLS
    - SSL
    - certificate
    - HMAC
    - cipher
    - iv
    - nonce
    - PBKDF2
    - digest
    - createHash
    - createCipher
    - hashlib
    - MessageDigest
    - SecretKeySpec
    - verify=False
    - InsecureSkipVerify
  structural_signals:
    - Import of cryptographic library
    - Hash function invocation
    - Cipher initialization
    - Key generation or key derivation
    - TLS or SSL configuration
    - Password hashing or verification
source:
  origin: file
  path: sec-owasp-a02-crypto-failures.md
  hash: "sha256:f89fc7c96e4871d8351a657d5bf837b8baa668270147bf06cbdaa0b641fc8f7c"
---
# Cryptographic Failures (OWASP A02:2021)

## When This Activates

Activates when diffs touch encryption, hashing, key management, TLS configuration, password storage, or code that handles sensitive data (credentials, PII, tokens). Cryptographic failures expose sensitive data through use of weak algorithms, poor key management, or missing encryption entirely. This category was previously called "Sensitive Data Exposure" and was elevated to #2 in OWASP 2021 because failures here directly enable data breaches.

**Primary CWEs**: CWE-327 (Use of Broken Crypto Algorithm), CWE-328 (Use of Weak Hash), CWE-326 (Inadequate Encryption Strength), CWE-319 (Cleartext Transmission), CWE-312 (Cleartext Storage of Sensitive Information), CWE-916 (Use of Password Hash With Insufficient Computational Effort).

## Audit Surface

- [ ] MD5 or SHA1 used for password hashing, token generation, or integrity verification
- [ ] DES, 3DES, RC4, or Blowfish cipher selected in encryption code
- [ ] ECB mode specified for block cipher operation
- [ ] Encryption key, API secret, or password literal in source code
- [ ] RSA key generated with fewer than 2048 bits
- [ ] AES key shorter than 128 bits or using a non-standard key size
- [ ] HTTP URL used for API calls, webhooks, or redirects carrying sensitive data
- [ ] TLS verification disabled (verify=False, InsecureSkipVerify, NODE_TLS_REJECT_UNAUTHORIZED=0)
- [ ] Password stored with plain SHA-256/SHA-512 without salt or iterations
- [ ] Password stored using reversible encryption instead of one-way hashing
- [ ] Sensitive data (credentials, PII, tokens) included in log statements
- [ ] Random values generated with non-cryptographic PRNG (Math.random, rand(), random.random)
- [ ] IV or nonce set to a fixed value, zero, or derived from predictable source
- [ ] Custom encryption or hashing algorithm implemented instead of using vetted library
- [ ] Certificate pinning absent for mobile or high-security client applications
- [ ] Secrets stored in environment variables without secrets management integration
- [ ] Encryption key derived from password without using PBKDF2, scrypt, or argon2
- [ ] Missing HSTS header or max-age set too low

## Detailed Checks

### Weak Hash Algorithms (CWE-327, CWE-328)
<!-- activation: keywords=["MD5", "md5", "SHA1", "sha1", "SHA-1", "hashlib", "MessageDigest", "createHash", "Digest", "digest", "hash(", "Hash.new"] -->

- [ ] **MD5 in security context**: flag any use of MD5 for password hashing, token generation, integrity checks on untrusted data, or digital signatures. MD5 has known collision attacks since 2004 and preimage weaknesses. It is acceptable only for non-security checksums (file deduplication, cache keys) with a comment documenting the non-security purpose
- [ ] **SHA1 in security context**: flag SHA1 for signatures, certificates, HMAC keys, or integrity verification of security-critical data. SHA1 has demonstrated collision attacks (SHAttered, 2017). Acceptable for legacy interop or git commit hashing where noted
- [ ] **Plain SHA-256/SHA-512 for passwords**: fast hashes without salt and iterations are vulnerable to rainbow tables and GPU brute-force. Passwords must use bcrypt (cost >= 10), argon2id, or scrypt -- never plain SHA-family hashes
- [ ] **Hardcoded salt or empty salt**: flag password hashing with a fixed, empty, or short salt. Salts must be unique per password and at least 16 bytes, generated from a CSPRNG
- [ ] **Hash used for encryption**: flag code that uses a hash function to "encrypt" data (XOR with hash output, repeated hashing as stream cipher) -- hashing is not encryption

### Weak Ciphers and Modes (CWE-326, CWE-327)
<!-- activation: keywords=["DES", "3DES", "TripleDES", "RC4", "RC2", "Blowfish", "ECB", "cipher", "Cipher", "AES", "createCipher", "createCipheriv", "SecretKeySpec", "Cipher.getInstance"] -->

- [ ] **Obsolete ciphers**: flag DES (56-bit key), 3DES (deprecated by NIST 2023), RC4 (biased keystream), RC2, and Blowfish (64-bit block size) -- use AES-128 or AES-256 instead
- [ ] **ECB mode**: flag AES-ECB or any block cipher in ECB mode -- ECB leaks patterns in plaintext because identical blocks produce identical ciphertext. Use GCM (authenticated), CBC with HMAC, or CTR mode
- [ ] **CBC without authentication**: flag AES-CBC used without a separate HMAC or in a context vulnerable to padding oracle attacks. Prefer AES-GCM which provides both confidentiality and authenticity
- [ ] **Insufficient key length**: flag RSA keys < 2048 bits, AES keys < 128 bits, or elliptic curve keys < 256 bits. Current NIST recommendations: RSA-2048+, AES-128+, P-256+
- [ ] **createCipher without IV (Node.js)**: flag `crypto.createCipher()` which derives key and IV from a password using MD5 with no salt -- use `crypto.createCipheriv()` with explicit key and random IV

### Hardcoded Secrets and Keys (CWE-798)
<!-- activation: keywords=["key", "secret", "password", "token", "api_key", "apiKey", "SECRET_KEY", "private_key", "credentials", "conn_string", "connection_string"] -->

- [ ] **Encryption keys in source code**: flag string literals that look like encryption keys (base64-encoded 16/32/64-byte strings, hex strings of those lengths) assigned to variables named key, secret, encryption_key, or similar
- [ ] **API keys and tokens**: flag hardcoded API keys, OAuth secrets, JWT signing secrets, and database passwords in source code -- these belong in a secrets manager (Vault, AWS Secrets Manager, GCP Secret Manager), not in code or environment variables
- [ ] **Default credentials**: flag test or default credentials (`admin/admin`, `password123`, `changeme`) in configuration files or source code that could reach production
- [ ] **Private keys committed to repository**: flag `.pem`, `.key`, `.p12`, `.pfx` files or inline private key blocks (`-----BEGIN RSA PRIVATE KEY-----`) in the diff
- [ ] **Secrets in configuration files**: flag secrets in `application.yml`, `.env` files, `docker-compose.yml`, or Kubernetes manifests without references to a secrets manager

### Insecure Transport (CWE-319)
<!-- activation: keywords=["http://", "HTTP", "TLS", "SSL", "verify", "InsecureSkipVerify", "REJECT_UNAUTHORIZED", "certificate", "cert", "HSTS", "Strict-Transport-Security", "redirect"] -->

- [ ] **HTTP for sensitive data**: flag `http://` URLs in API client configurations, webhook registrations, OAuth redirect URIs, or any endpoint transmitting credentials, tokens, or PII
- [ ] **TLS verification disabled**: flag `verify=False` (Python requests), `InsecureSkipVerify: true` (Go), `NODE_TLS_REJECT_UNAUTHORIZED='0'` (Node.js), `ServerCertificateCustomValidationCallback` returning true (.NET) -- these disable the chain-of-trust that TLS depends on
- [ ] **Outdated TLS versions**: flag explicit configuration of TLS 1.0 or TLS 1.1 -- both are deprecated. Minimum should be TLS 1.2, prefer TLS 1.3
- [ ] **Missing HSTS**: flag web applications serving over HTTPS without `Strict-Transport-Security` header, or with `max-age` less than 31536000 (one year)
- [ ] **Mixed content**: flag HTTPS pages that load resources (scripts, stylesheets, API calls) over HTTP

### Insecure Randomness
<!-- activation: keywords=["random", "Random", "rand", "Math.random", "uuid", "token", "nonce", "iv", "generate", "SecureRandom", "os.urandom", "crypto.randomBytes", "secrets"] -->

- [ ] **Non-cryptographic PRNG for security tokens**: flag `Math.random()` (JavaScript), `random.random()` (Python), `rand()` (C/Ruby), `java.util.Random` for generating session tokens, CSRF tokens, password reset tokens, or encryption nonces. Use `crypto.randomBytes`, `secrets.token_hex`, `SecureRandom`, or `/dev/urandom`
- [ ] **Fixed or zero IV/nonce**: flag initialization vectors or nonces set to a constant, zero, or counter starting from zero without proper construction. IVs for CBC must be random; nonces for GCM must never repeat with the same key
- [ ] **Predictable seed**: flag PRNG seeded with time, PID, or other guessable values when used for security purposes
- [ ] **UUID v1 for unguessable identifiers**: flag UUID v1 (time-based) used where unguessability is required -- UUID v1 contains the MAC address and timestamp and is predictable. Use UUID v4 (random) or UUID v7

### Sensitive Data Exposure in Logs and Errors
<!-- activation: keywords=["log", "logger", "print", "console.log", "console.error", "debug", "trace", "error_message", "stack_trace", "dump", "inspect", "repr", "toString"] -->

- [ ] **Credentials in logs**: flag log statements that include passwords, API keys, bearer tokens, session IDs, or private keys -- even at DEBUG level, these persist in log aggregation systems and are accessible to operations staff
- [ ] **PII in logs**: flag logging of email addresses, SSNs, credit card numbers, health data, or other PII without masking or redaction
- [ ] **Sensitive data in error responses**: flag exception handlers that return full stack traces, database connection strings, internal paths, or query details to the client
- [ ] **Sensitive data in URL query parameters**: flag tokens, passwords, or API keys passed as URL query parameters -- these appear in browser history, server access logs, and referrer headers

## Common False Positives

- **MD5/SHA1 for non-security purposes**: checksums for file deduplication, cache invalidation, content addressing (git), or ETag generation are not security-sensitive uses of weak hashes. Valid when a comment documents the non-security purpose.
- **Test fixtures with hardcoded keys**: test files may contain hardcoded keys for deterministic test cases. Valid only when the key is clearly scoped to tests (in a test directory, test file, or test configuration) and cannot be mistaken for a production secret.
- **HTTP for localhost or internal services**: `http://localhost`, `http://127.0.0.1`, or internal service mesh URLs that never leave the machine or encrypted network are acceptable. Flag if the URL could be configured to point externally.
- **Legacy interop requiring old algorithms**: some systems must interoperate with legacy partners requiring 3DES, SHA1, or TLS 1.0. Valid only with a documented migration plan and compensating controls (additional encryption layer, IP allowlist).
- **Password hashing library internals**: code inside bcrypt, argon2, or scrypt library implementations may use raw SHA or HMAC as building blocks -- this is correct internal use, not a vulnerability.

## Severity Guidance

| Finding | Severity |
|---|---|
| Passwords stored as plaintext or with reversible encryption | Critical |
| Hardcoded encryption key or signing secret in source code | Critical |
| JWT signing secret hardcoded or signing disabled (alg: none) | Critical |
| TLS certificate verification disabled in production code | Critical |
| MD5 or SHA1 used for password hashing | Critical |
| DES, RC4, or ECB mode used to encrypt sensitive data | Critical |
| Passwords hashed with SHA-256/SHA-512 without salt or iterations | Important |
| Non-cryptographic PRNG used for security tokens or nonces | Important |
| Sensitive data (credentials, PII) logged without masking | Important |
| HTTP used for API calls or webhooks carrying sensitive data | Important |
| Fixed or zero IV/nonce in cipher operation | Important |
| RSA key < 2048 bits or AES key < 128 bits | Important |
| Missing HSTS header on HTTPS application | Minor |
| Secrets in environment variables without secrets manager (with no better alternative) | Minor |
| UUID v1 used where unguessability is preferred but not security-critical | Minor |

## See Also

- `principle-fail-fast` -- cryptographic operations should fail loudly on invalid parameters, not fall back to insecure defaults
- `principle-encapsulation` -- encryption and hashing logic should be encapsulated in a crypto service, not scattered across the codebase
- `sec-owasp-a01-broken-access-control` -- cryptographic failures in JWT validation enable access control bypass
- `sec-owasp-a05-misconfiguration` -- TLS configuration and HSTS are also misconfiguration concerns

## Authoritative References

- [OWASP Top 10:2021 - A02 Cryptographic Failures](https://owasp.org/Top10/A02_2021-Cryptographic_Failures/)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [NIST SP 800-131A Rev 2 - Transitioning the Use of Cryptographic Algorithms](https://csrc.nist.gov/publications/detail/sp/800-131a/rev-2/final)
- [CWE-327: Use of a Broken or Risky Cryptographic Algorithm](https://cwe.mitre.org/data/definitions/327.html)
- [CWE-312: Cleartext Storage of Sensitive Information](https://cwe.mitre.org/data/definitions/312.html)
- [Mozilla Server Side TLS Guidelines](https://wiki.mozilla.org/Security/Server_Side_TLS)
