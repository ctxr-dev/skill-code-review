---
id: footgun-hash-selection-and-salting
type: primary
depth_role: leaf
focus: Detect weak hash functions for security purposes, unsalted or improperly salted hashes, hash truncation, and password hashing without KDF
parents:
  - index.md
covers:
  - "MD5 or SHA1 used for security-sensitive hashing (integrity, MAC, signatures)"
  - Unsalted hashes of sensitive data enabling rainbow table attacks
  - Same static salt used for all records defeating per-record uniqueness
  - Hash output truncated below collision-resistance threshold
  - "General-purpose hash (SHA-256) used for password storage instead of KDF (bcrypt, argon2)"
  - HMAC without key rotation schedule
  - Hash of secret concatenated with message without proper HMAC construction
  - "Passwords stored as plaintext or with reversible encoding (Base64, ROT13, XOR)"
  - Passwords hashed with MD5, SHA1, SHA-256, or SHA-512 even with salt -- too fast for passwords
  - bcrypt used with cost factor below 10 providing insufficient work factor
  - "PBKDF2 used with fewer than 100,000 iterations (NIST recommends 600,000+ as of 2023)"
  - Argon2 configured with insufficient memory parameter for the deployment environment
  - scrypt configured with low N, r, or p parameters
  - Password hash not salted per-user allowing rainbow table attacks
  - Password hash stored without embedded algorithm and parameters preventing future upgrades
  - Pepper stored alongside hash in the same database defeating its purpose
  - "HMAC(password) used instead of a proper password KDF"
  - Password hashing performed client-side without server-side rehash
  - Hash map populated from user-controlled keys without randomized hash seed
  - "O(n) degradation per lookup when all keys hash to the same bucket"
  - "HashDoS attack: crafting keys that collide under known hash function"
  - "Language-specific hash predictability: Python dict (pre-3.3), Java HashMap, PHP arrays"
  - Custom hash function without collision resistance for adversarial input
  - MD5 or SHA1 used for integrity verification, checksums, HMAC, or digital signatures
  - Unsalted hashes used for any identification or deduplication of sensitive data
  - General-purpose hash used for password storage instead of password-specific KDF
  - Same static salt used across all records defeating per-record uniqueness
  - "Salt too short (fewer than 16 bytes) providing insufficient collision space"
  - Hash output truncated below the collision-resistance threshold
  - "Hash function used as a cipher (hashing is not encryption)"
  - HMAC constructed with a weak underlying hash function
  - Hash of concatenated values without separator enabling length-extension or collision attacks
  - Custom hash construction instead of using standardized HMAC or HKDF
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
aliases:
  - crypto-password-hashing-argon2-scrypt-bcrypt
  - footgun-hash-collision-dos
  - crypto-hash-selection-and-salting
activation:
  file_globs:
    - "**/*hash*"
    - "**/*password*"
    - "**/*auth*"
    - "**/*crypto*"
    - "**/*digest*"
    - "**/*hmac*"
    - "**/*verify*"
  keyword_matches:
    - MD5
    - md5
    - SHA1
    - sha1
    - SHA256
    - sha256
    - hash
    - Hash
    - digest
    - salt
    - HMAC
    - hmac
    - bcrypt
    - argon2
    - scrypt
    - pbkdf2
    - hashlib
    - MessageDigest
    - createHash
    - password
    - passwd
  structural_signals:
    - Hash function applied to sensitive data
    - Password storage or verification logic
    - HMAC or MAC construction
source:
  origin: file
  path: footgun-hash-selection-and-salting.md
  hash: "sha256:4666c194c9e1f05922308673ff9446eb63ddd337574f50651fc7491dade1c884"
---
# Hash Selection and Salting Footguns

## When This Activates

Activates when diffs use hash functions for security purposes -- integrity verification, data authentication, password storage, pseudonymization, or HMAC construction. This reviewer detects footguns that fall through general crypto reviewers: choosing a broken hash algorithm, forgetting to salt, reusing the same salt, truncating hash output dangerously, or using a fast general-purpose hash where a slow KDF is needed. These are the most common cryptographic mistakes in application code because hash functions "just work" -- they produce output that looks secure regardless of whether the algorithm, salt, or construction is appropriate.

**Cross-reference**: `crypto-hash-selection-and-salting` covers the same domain in depth. This footgun reviewer provides a lightweight, detection-focused checklist for diffs that may not trigger the full crypto reviewer.

## Audit Surface

- [ ] MD5 or SHA1 used for integrity verification, MAC, or digital signatures
- [ ] Hash computed on sensitive data without salt
- [ ] Same salt literal or constant reused across all hash operations
- [ ] Salt shorter than 16 bytes (128 bits)
- [ ] Hash output truncated to short prefix for storage or comparison
- [ ] SHA-256/SHA-512 hashing passwords directly without KDF
- [ ] HMAC key with no documented rotation policy
- [ ] hash(key + message) instead of HMAC(key, message)
- [ ] Salt derived from the data being hashed
- [ ] Hash comparison using == instead of constant-time
- [ ] Password hash with low or no iteration count

## Detailed Checks

### Weak Hash Algorithm Selection (CWE-328)
<!-- activation: keywords=["MD5", "md5", "SHA1", "sha1", "SHA-1", "hashlib.md5", "hashlib.sha1", "MessageDigest", "createHash", "Digest"] -->

- [ ] **MD5 for security**: flag MD5 used for integrity verification of untrusted data, digital signatures, HMAC, or any context where collision resistance matters. MD5 has practical collision attacks since 2004. Acceptable only for non-security checksums (cache keys, ETags) with a documenting comment
- [ ] **SHA1 for security**: flag SHA1 for digital signatures, certificate validation, or integrity in new code. SHA1 has demonstrated collision attacks (SHAttered 2017). Use SHA-256 or SHA-3 minimum
- [ ] **Hash algorithm from user input**: flag code that selects a hash algorithm based on user input or configuration without an allowlist excluding weak algorithms. An attacker can force a downgrade

### Missing and Weak Salts (CWE-759, CWE-760)
<!-- activation: keywords=["salt", "Salt", "SALT", "unsalted", "rainbow", "pepper", "nonce"] -->

- [ ] **No salt on sensitive data hash**: flag hashing email, phone, SSN, or other sensitive data without a salt when the hash is stored for identification or pseudonymization. Without salt, identical inputs produce identical hashes, enabling rainbow table attacks and cross-dataset correlation
- [ ] **Static salt reused everywhere**: flag a salt defined as a string constant and used for all records. A single static salt means two users with the same password get the same hash. Each record needs a unique, random salt
- [ ] **Salt too short**: flag salts shorter than 16 bytes. Short salts reduce the precomputation space insufficiently. NIST recommends 128+ bits
- [ ] **Salt derived from hashed value**: flag `hash(email + email[:4])` or similar. The salt must be independent of the input -- generate from CSPRNG (cross-ref: `crypto-rng-csprng`)

### Password Hashing Without KDF (CWE-916)
<!-- activation: keywords=["password", "passwd", "credential", "login", "SHA256", "SHA512", "hash", "bcrypt", "argon2", "scrypt", "PBKDF2"] -->

- [ ] **SHA-256/SHA-512 for passwords**: flag any general-purpose hash used for password storage, even with salt. GPUs compute billions of SHA-256 per second. Use bcrypt, argon2id, or scrypt which are intentionally slow and memory-hard
- [ ] **Low iteration PBKDF2**: flag PBKDF2 with fewer than 600,000 iterations for SHA-256 (OWASP 2023 recommendation). Lower counts enable GPU-accelerated brute force
- [ ] **bcrypt with low cost factor**: flag bcrypt with work factor below 10 (2^10 = 1024 iterations). Use 12+ for current hardware

### HMAC Construction and Key Management
<!-- activation: keywords=["HMAC", "hmac", "MAC", "mac", "key", "secret", "sign", "verify", "hash(key", "sha256(key"] -->

- [ ] **hash(key || message) instead of HMAC**: flag `SHA256(secret + message)` as a MAC. This is vulnerable to length-extension attacks with Merkle-Damgard hashes (SHA-256, SHA-512). Use the standard HMAC construction via `hmac` module/class
- [ ] **HMAC key not rotated**: flag HMAC keys used for long-lived signatures (API authentication, webhook verification) without a documented rotation mechanism. Key compromise without rotation means all past and future signatures are compromised
- [ ] **HMAC key too short**: flag HMAC keys shorter than the hash output length (32 bytes for HMAC-SHA256). Short keys reduce effective security

### Hash Truncation and Comparison
<!-- activation: keywords=["truncat", "substr", "slice", "prefix", "[:8]", "[:16]", "hex", "compare", "==", "equals", "constant_time", "hmac.compare_digest"] -->

- [ ] **Excessive truncation**: flag hash output truncated below half the digest length. SHA-256 truncated to 64 bits has only 2^32 collision resistance (birthday bound), making collisions feasible with moderate compute
- [ ] **Non-constant-time comparison**: flag `hash1 == hash2` for comparing hash digests in authentication or verification paths. Timing side-channels leak information about matching prefix length. Use `hmac.compare_digest()` (Python), `MessageDigest.isEqual()` (Java), `crypto.timingSafeEqual()` (Node.js)

## Common False Positives

- **MD5/SHA1 for non-security purposes**: cache keys, ETags, content-addressable storage, git commit hashes, and deduplication of non-sensitive data are valid non-security uses of weak hashes.
- **HMAC-SHA1 in legacy protocols**: OAuth 1.0a, TOTP (RFC 6238), and older AWS signatures mandate HMAC-SHA1. Valid when required by protocol specification.
- **Hash comparison in non-auth context**: comparing checksums of public files does not need constant-time comparison.
- **Password hashing library internals**: bcrypt and argon2 use SHA-256/SHA-512 internally as building blocks within the KDF construction. This is correct usage.

## Severity Guidance

| Finding | Severity |
|---|---|
| General-purpose hash for password storage (even with salt) | Critical |
| hash(key \|\| message) for MAC (length-extension vulnerable) | Critical |
| MD5 for integrity verification of untrusted data | Critical |
| Unsalted hash of sensitive data (PII) | Important |
| Static/hardcoded salt reused across all records | Important |
| SHA1 for signatures or integrity in new code | Important |
| Non-constant-time hash comparison in auth path | Important |
| Hash output truncated below collision-resistance threshold | Minor |
| HMAC key shorter than hash output length | Minor |
| HMAC key without documented rotation schedule | Minor |

## See Also

- `crypto-hash-selection-and-salting` -- comprehensive hash function review; this footgun reviewer is a lightweight detection layer
- `crypto-rng-csprng` -- salt generation requires CSPRNG
- `principle-fail-fast` -- hash algorithm negotiation should reject weak algorithms immediately
- `footgun-hash-collision-dos` -- hash table collision attack (different domain from cryptographic hash)

## Authoritative References

- [CWE-328: Use of Weak Hash](https://cwe.mitre.org/data/definitions/328.html)
- [CWE-759: Use of One-Way Hash Without a Salt](https://cwe.mitre.org/data/definitions/759.html)
- [CWE-916: Use of Password Hash With Insufficient Computational Effort](https://cwe.mitre.org/data/definitions/916.html)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [NIST SP 800-131A Rev 2: Transitioning Cryptographic Algorithms](https://csrc.nist.gov/publications/detail/sp/800-131a/rev-2/final)
