---
id: crypto-timing-attacks
type: primary
depth_role: leaf
focus: Detect timing side-channel vulnerabilities in cryptographic comparison and verification operations
parents:
  - index.md
covers:
  - "String equality (== / !=) used for MAC, hash, or token verification instead of constant-time comparison"
  - Early-return on first mismatched byte in custom comparison loops
  - "Conditional branches that depend on secret data (key bytes, plaintext values)"
  - Array or table indexing with secret-dependent indices enabling cache-timing attacks
  - HMAC verification that short-circuits on length or prefix mismatch
  - Password or credential comparison using standard string equality
  - Token comparison using language-default equality operators
  - RSA decryption or signature verification without blinding
  - "Timing differences in authentication error paths (user-not-found vs wrong-password)"
tags:
  - cryptography
  - timing-attack
  - side-channel
  - constant-time
  - HMAC
  - token-verification
  - CWE-208
activation:
  file_globs:
    - "**/*auth*"
    - "**/*verify*"
    - "**/*token*"
    - "**/*hmac*"
    - "**/*mac*"
    - "**/*signature*"
    - "**/*webhook*"
    - "**/*crypto*"
    - "**/*hash*"
    - "**/*digest*"
    - "**/*compare*"
  keyword_matches:
    - compare
    - equal
    - verify
    - validate
    - check
    - hmac
    - HMAC
    - mac
    - MAC
    - token
    - digest
    - hash
    - signature
    - timing
    - constant_time
    - secure_compare
    - hmac.compare_digest
    - MessageDigest.isEqual
    - crypto.timingSafeEqual
    - safe_str_cmp
    - secure_cmp
    - "Rack::Utils.secure_compare"
    - consttime_memequal
    - OpenSSL.fixed_length_secure_compare
  structural_signals:
    - Comparison of two byte arrays or hex strings in authentication context
    - HMAC computation followed by equality check
    - "Token or digest variable compared with == or !="
    - Custom loop iterating over bytes with conditional return
source:
  origin: file
  path: crypto-timing-attacks.md
  hash: "sha256:959f853a24d8e484302099f1d35dd917456f371f54587156a8f56836528f11af"
---
# Cryptographic Timing Attacks

## When This Activates

Activates when diffs contain cryptographic verification logic -- HMAC validation, token comparison, hash checking, signature verification, or any code path that compares secret or security-sensitive byte sequences. Timing side-channels allow attackers to deduce secret values byte-by-byte by measuring response time differences. Standard string equality operators (==, !=, .equals()) short-circuit on the first differing byte, leaking information about how many leading bytes match.

**Primary CWE**: CWE-208 (Observable Timing Discrepancy).

## Audit Surface

- [ ] HMAC digest compared with == or != instead of constant-time function
- [ ] Hash digest compared with == or != instead of constant-time function
- [ ] API token or session token compared with standard string equality
- [ ] CSRF token verification using == or string comparison
- [ ] Password reset token validated with non-constant-time comparison
- [ ] JWT signature bytes compared without constant-time equality
- [ ] Custom byte-comparison loop with early return on mismatch
- [ ] Conditional branch or early exit based on secret key material
- [ ] Array lookup indexed by secret-dependent value (AES S-box, etc.)
- [ ] Authentication code path with measurably different timing for valid vs invalid users
- [ ] HMAC verification that checks length before comparing bytes
- [ ] Webhook signature verification using == or != on hex/base64 digest
- [ ] OTP or TOTP code compared with standard string equality
- [ ] License key validation with short-circuit string comparison
- [ ] Comparison result used in branch that leaks timing via error message latency

## Detailed Checks

### Non-Constant-Time String/Byte Comparison (CWE-208)
<!-- activation: keywords=["==", "!=", ".equals(", "strcmp", "compare", "===", "!==", "hmac", "digest", "hash", "token", "signature"] -->

- [ ] **Direct == / != on digests**: flag any code that compares HMAC outputs, hash digests, or cryptographic signatures using `==`, `!=`, `===`, `!==`, `.equals()`, or `strcmp()`. These operators return as soon as the first differing byte is found, enabling byte-by-byte brute force. The correct alternatives by language:
  - **Python**: `hmac.compare_digest(a, b)` or `secrets.compare_digest(a, b)`
  - **Node.js**: `crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))`
  - **Ruby**: `Rack::Utils.secure_compare(a, b)` or `ActiveSupport::SecurityUtils.secure_compare(a, b)`
  - **Go**: `subtle.ConstantTimeCompare(a, b)`
  - **Java**: `MessageDigest.isEqual(a, b)`
  - **C/C++**: `CRYPTO_memcmp()` (OpenSSL), `consttime_memequal()` (NetBSD), or `sodium_memcmp()` (libsodium)
  - **.NET**: `CryptographicOperations.FixedTimeEquals(a, b)`
- [ ] **Hex or base64 string comparison**: flag comparison of hex-encoded or base64-encoded digests with string equality. Even though the encoding expands the alphabet, timing leaks still reveal information. Convert to bytes first, then use constant-time comparison
- [ ] **Length check before comparison**: flag code that returns early when two digests have different lengths before performing the actual comparison. While a length mismatch in a fixed-output hash is already suspicious, the pattern trains developers to add short-circuits that leak timing

### Custom Comparison Loops (CWE-208)
<!-- activation: keywords=["for", "while", "loop", "byte", "char", "index", "break", "return", "mismatch"] -->

- [ ] **Early-return comparison loop**: flag loops that compare two byte arrays element-by-element and return `false` or break on the first mismatch. This is the textbook timing oracle. The fix is to accumulate differences with XOR and check at the end:

  ```
  result = 0
  for i in range(len(a)):
      result |= a[i] ^ b[i]
  return result == 0
  ```

- [ ] **Counting matching bytes**: flag code that counts how many bytes match and returns true only if the count equals the expected length -- if the count variable is checked with an early return, timing still leaks
- [ ] **Loop with data-dependent iteration count**: flag loops where the number of iterations depends on secret data (e.g., iterating until a null terminator in a secret string)

### HMAC Verification Logic (CWE-208)
<!-- activation: keywords=["hmac", "HMAC", "mac", "MAC", "verify", "webhook", "signature", "sign", "digest"] -->

- [ ] **HMAC computed then compared with ==**: the most common pattern -- code correctly computes `HMAC(key, message)` but then compares it to the provided MAC with `==`. Flag and recommend the language-appropriate constant-time comparison function
- [ ] **Webhook signature verification**: flag webhook handlers (GitHub, Stripe, Slack, Twilio) that verify the `X-Hub-Signature`, `Stripe-Signature`, or similar header by comparing the computed HMAC with `==` or `!=`
- [ ] **HMAC verify function that returns early on type/encoding mismatch**: flag HMAC verification functions that return false immediately when the input is not valid hex/base64 before reaching the constant-time comparison -- an attacker can distinguish "malformed" from "wrong" by timing

### Secret-Dependent Branching and Indexing (CWE-208)
<!-- activation: keywords=["key", "secret", "private", "plaintext", "decrypt", "if", "switch", "case", "index", "lookup", "table"] -->

- [ ] **Branching on secret bytes**: flag `if`/`switch` statements where the condition depends on secret key material, decrypted plaintext, or intermediate cryptographic state. Modern CPUs have branch predictors that create observable timing differences
- [ ] **Secret-dependent array indexing**: flag table lookups (S-boxes, substitution tables) indexed by secret-dependent values in software AES or other cipher implementations. Cache-line access patterns are observable via cache-timing attacks (Flush+Reload, Prime+Probe). Prefer bitsliced or constant-time table implementations
- [ ] **Secret-dependent memory access patterns**: flag code where the memory address accessed depends on secret data -- even if the operation is a simple read, cache effects make it observable

### Authentication Timing Oracles (CWE-208)
<!-- activation: keywords=["login", "authenticate", "password", "user", "email", "username", "credential", "attempt"] -->

- [ ] **Different code paths for valid vs invalid users**: flag authentication code that performs password hashing only when the user exists. An attacker can enumerate valid usernames by measuring response time. The fix is to always hash against a dummy value when the user is not found
- [ ] **Error message timing**: flag code that returns different errors ("user not found" vs "wrong password") if the timing of these paths differs measurably. Even if error messages are identical, the timing delta can leak information if one path does a database lookup + hash while the other returns immediately
- [ ] **Account lockout timing**: flag lockout checks that return early before performing the hash comparison -- this creates a timing difference between locked and unlocked accounts

### Password and OTP Comparison (CWE-208)
<!-- activation: keywords=["password", "otp", "OTP", "totp", "TOTP", "hotp", "pin", "PIN", "passcode", "2fa", "mfa"] -->

- [ ] **Password comparison with ==**: flag direct string comparison of passwords (even hashed passwords) with `==`. Although password hashing with bcrypt/argon2 typically includes a built-in constant-time verification function (e.g., `bcrypt.checkpw()`), custom implementations may skip this
- [ ] **OTP/TOTP comparison with ==**: flag one-time password verification that compares the user-supplied code with the expected code using `==`. OTPs are short (6-8 digits) but timing attacks can still reduce the search space significantly
- [ ] **PIN comparison without constant-time**: flag numeric PIN verification using `==` or integer comparison -- even numeric comparisons can leak timing information in some implementations

## Common False Positives

- **Non-security comparisons**: comparing hash values for caching, deduplication, content addressing, or data structure operations (hash maps, sets) is not security-sensitive. Valid when the hash is not used for authentication or integrity verification of untrusted data.
- **Comparison after asymmetric verification**: if a signature is verified by a library function that internally uses constant-time comparison (e.g., `RSA_verify()`, `ed25519.Verify()`), a subsequent boolean check of the return value is not a timing vulnerability.
- **Test code**: test assertions comparing expected vs actual digests using `assertEqual` or `expect().toBe()` are not exploitable. Valid only in test files.
- **Public data comparison**: comparing non-secret values (public keys, certificate fingerprints displayed to users, file checksums shown in UI) does not require constant-time comparison because the values are already public.
- **Database-backed token lookup**: if token validation is done by querying a database with the token as a WHERE clause, the timing is dominated by the database query, not the string comparison. However, this pattern has its own issues (SQL timing) and a constant-time comparison after retrieval is still preferred.

## Severity Guidance

| Finding | Severity |
|---|---|
| HMAC or signature verification using == / != | Critical |
| Webhook signature compared with standard string equality | Critical |
| JWT signature bytes compared without constant-time function | Critical |
| API token or session token compared with == | Important |
| CSRF token or password reset token compared with == | Important |
| Custom byte-comparison loop with early return on mismatch | Important |
| Authentication path with measurable timing difference for valid vs invalid users | Important |
| OTP/TOTP verification using == | Important |
| Secret-dependent array indexing in cipher implementation | Minor |
| Length check before constant-time comparison of fixed-size digests | Minor |
| Password comparison with == where hashing library provides verify function | Minor |

## See Also

- `sec-owasp-a02-crypto-failures` -- parent category covering cryptographic failures broadly
- `crypto-algorithm-selection` -- ensuring the right algorithm is chosen before verification
- `crypto-nonce-iv-management` -- nonce reuse can also create side-channel opportunities
- `principle-fail-fast` -- cryptographic verification should fail fast but not leak timing information

## Authoritative References

- [CWE-208: Observable Timing Discrepancy](https://cwe.mitre.org/data/definitions/208.html)
- [OWASP Testing Guide - Timing Attacks](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/10-Business_Logic_Testing/04-Test_for_Process_Timing)
- [Coda Hale - A Lesson in Timing Attacks](https://codahale.com/a-lesson-in-timing-attacks/)
- [Python hmac.compare_digest documentation](https://docs.python.org/3/library/hmac.html#hmac.compare_digest)
- [Node.js crypto.timingSafeEqual documentation](https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b)
- [NIST SP 800-185 - SHA-3 Derived Functions](https://csrc.nist.gov/publications/detail/sp/800-185/final)
