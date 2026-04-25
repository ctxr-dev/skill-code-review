---
id: footgun-rng-csprng
type: primary
depth_role: leaf
focus: Detect use of insecure PRNGs for security tokens, predictable seeds, insufficient entropy, UUID misuse, and random value truncation
parents:
  - index.md
covers:
  - "Math.random() or language equivalent used for security tokens, keys, or nonces"
  - "Predictable seed (time, PID, constant) for PRNG in security context"
  - "Insufficient entropy: token shorter than 128 bits"
  - UUID v4 used as unguessable secret without verifying CSPRNG backing
  - Random value truncated via modulo or substring, losing entropy and introducing bias
  - Fallback to weak PRNG when CSPRNG is unavailable
  - "Math.random() used for security-sensitive purposes (tokens, keys, nonces, IDs)"
  - "Python random module (random.random, random.randint, random.choice) used for security"
  - java.util.Random instead of java.security.SecureRandom for cryptographic material
  - "C/C++ rand()/srand() used for key generation, tokens, or nonces"
  - Unseeded or time-seeded PRNGs used for security-sensitive values
  - Custom random number generator implementations instead of platform CSPRNG
  - "/dev/urandom vs /dev/random misuse and entropy starvation concerns"
  - Insufficient entropy at startup in containers, VMs, or embedded systems
  - Random values truncated or modulo-reduced, losing entropy
  - UUID versions used as unguessable secrets when not all versions provide randomness
  - Weak seeding of otherwise-strong PRNGs
  - Predictable random values from shared or global PRNG state
tags:
  - randomness
  - PRNG
  - CSPRNG
  - entropy
  - token
  - CWE-330
  - CWE-338
  - cryptography
  - token-generation
  - key-generation
aliases:
  - crypto-rng-csprng
activation:
  file_globs:
    - "**/*random*"
    - "**/*token*"
    - "**/*secret*"
    - "**/*key*"
    - "**/*nonce*"
    - "**/*uuid*"
    - "**/*session*"
    - "**/*auth*"
  keyword_matches:
    - Math.random
    - random
    - Random
    - rand
    - srand
    - SecureRandom
    - crypto.randomBytes
    - crypto.getRandomValues
    - os.urandom
    - secrets
    - uuid
    - UUID
    - token
    - generate
    - entropy
    - seed
  structural_signals:
    - Token or key generation function
    - UUID creation for security-sensitive identifiers
    - Session ID or CSRF token generation
source:
  origin: file
  path: footgun-rng-csprng.md
  hash: "sha256:9fa15fb62b83ebda45d371b3923dce7daf5153e63b8950d06128dae51bb117b4"
---
# RNG/CSPRNG Footguns

## When This Activates

Activates when diffs generate tokens, keys, nonces, session IDs, CSRF tokens, or any value whose security depends on unpredictability. This reviewer detects the most common randomness footgun: using a fast but predictable PRNG (Math.random, random.random, java.util.Random) where a CSPRNG is required. These PRNGs use deterministic algorithms (Mersenne Twister, xorshift128+, LCG) whose output is fully predictable once the internal state is known -- and the state can often be recovered from a handful of outputs.

**Cross-reference**: `crypto-rng-csprng` covers the same domain in depth. This footgun reviewer provides a lightweight, detection-focused checklist for diffs that may not trigger the full crypto reviewer.

## Audit Surface

- [ ] Math.random(), random.random(), java.util.Random, rand() for security tokens
- [ ] PRNG seeded with time(), Date.now(), PID, or fixed constant
- [ ] Token or key with fewer than 128 bits of entropy
- [ ] UUID v1 or v3/v5 used where unguessability is required
- [ ] UUID v4 from non-standard library without CSPRNG verification
- [ ] Random value reduced with modulo operator (biased distribution)
- [ ] Short hex token (< 32 hex chars = < 128 bits)
- [ ] Global PRNG shared across threads
- [ ] Fallback to weak PRNG when crypto API unavailable
- [ ] PRNG output as encryption key without KDF
- [ ] Token encoding losing entropy bits

## Detailed Checks

### Insecure PRNG for Security Purposes (CWE-338)
<!-- activation: keywords=["Math.random", "random.random", "random.randint", "random.choice", "java.util.Random", "ThreadLocalRandom", "rand(", "srand(", "mt_rand", "System.Random"] -->

- [ ] **Math.random() for tokens**: V8's xorshift128+ state can be recovered from a few outputs. Flag `Math.random()` used to generate tokens, session IDs, nonces, or passwords. Use `crypto.randomBytes()` (Node.js) or `crypto.getRandomValues()` (browser)
- [ ] **Python random module for security**: Mersenne Twister is fully predictable after 624 consecutive 32-bit outputs. Flag `random.random()`, `random.randint()`, `random.choice()` for tokens. Use `secrets.token_bytes()`, `secrets.token_hex()`, `secrets.choice()`
- [ ] **java.util.Random for crypto**: 48-bit LCG, trivially predictable. Flag `new Random()` and `ThreadLocalRandom` for security values. Use `java.security.SecureRandom`
- [ ] **C rand()/srand() for keys**: small-state LCG. Flag for any security purpose. Use `getrandom()`, `arc4random()`, or `/dev/urandom`

### Predictable Seeds (CWE-330)
<!-- activation: keywords=["seed", "srand", "setSeed", "time(", "Date.now", "System.currentTimeMillis", "getpid", "nanoTime", "time.time"] -->

- [ ] **Time-based seed**: flag PRNGs seeded with `time()`, `Date.now()`, `System.currentTimeMillis()`. An attacker who knows the approximate time can brute-force the ~2^32 seed space in seconds
- [ ] **PID-based seed**: flag `srand(getpid())`. PID space is typically 2^15 to 2^22 -- trivially exhaustible
- [ ] **Fixed constant seed**: flag `Random(42)` or `srand(12345)` outside test code. Produces identical output on every run

### Insufficient Entropy and Truncation (CWE-330)
<!-- activation: keywords=["token", "key", "nonce", "generate", "length", "bits", "bytes", "hex", "base64", "urlsafe", "modulo", "%"] -->

- [ ] **Token too short**: flag security tokens with fewer than 128 bits of entropy. `random_hex(8)` = 32 bits, brute-forceable. Minimum: `random_hex(32)` = 128 bits
- [ ] **Modulo bias**: flag `rand() % N`. When N does not divide the PRNG range evenly, some values are more likely. Use rejection sampling or `secrets.randbelow(N)`
- [ ] **Truncation via substring**: flag `token.substring(0, 8)` on a longer random string. The truncation may reduce entropy below the security threshold

### UUID Security Assumptions (CWE-330)
<!-- activation: keywords=["uuid", "UUID", "guid", "GUID", "v1", "v4", "v7", "uuidv4", "randomUUID"] -->

- [ ] **UUID v1 as secret**: UUID v1 contains MAC address and timestamp -- fully predictable. Flag as unguessable identifier
- [ ] **UUID v3/v5 as secret**: deterministic given namespace and name -- zero randomness. Flag as security token
- [ ] **UUID v4 from unknown source**: most standard libraries use CSPRNG for v4, but verify. UUID v4 provides 122 bits of entropy -- adequate for session tokens, not for encryption keys

### Fallback and Shared State
<!-- activation: keywords=["fallback", "polyfill", "global", "shared", "static", "singleton", "thread", "concurrent"] -->

- [ ] **Fallback to weak PRNG**: flag code that catches CSPRNG initialization failure and falls back to `Math.random()` or equivalent. A CSPRNG failure should be a hard error, not a silent downgrade (cross-ref: `principle-fail-fast`)
- [ ] **Global PRNG without synchronization**: flag a single PRNG instance shared across threads without locking. Race conditions can produce repeated outputs or corrupted state

## Common False Positives

- **Math.random for UI/UX**: animation jitter, randomized layouts, non-security A/B bucketing, game mechanics are not security-sensitive.
- **random module for testing**: deterministic test data generation with fixed seed is correct for reproducibility.
- **Simulation and statistics**: Monte Carlo, sampling, and shuffle for non-security purposes are valid PRNG uses.
- **UUID v4 for non-secret identifiers**: database primary keys and correlation IDs where only uniqueness (not secrecy) is required.

## Severity Guidance

| Finding | Severity |
|---|---|
| Math.random/random.random generating auth tokens or encryption keys | Critical |
| PRNG seeded with fixed constant in production security code | Critical |
| Security token with fewer than 128 bits of entropy | Important |
| UUID v1 used as unguessable secret | Important |
| Modulo bias in security token generation | Important |
| Fallback to weak PRNG when CSPRNG fails | Important |
| Global PRNG shared across threads without sync | Minor |
| PRNG output used as key without KDF | Minor |

## See Also

- `crypto-rng-csprng` -- comprehensive CSPRNG review; this footgun reviewer is a lightweight detection layer
- `crypto-hash-selection-and-salting` -- salt generation requires CSPRNG
- `principle-fail-fast` -- CSPRNG failure should be fatal, not a silent fallback
- `footgun-hash-selection-and-salting` -- salts must be generated from CSPRNG

## Authoritative References

- [CWE-330: Use of Insufficiently Random Values](https://cwe.mitre.org/data/definitions/330.html)
- [CWE-338: Use of Cryptographically Weak PRNG](https://cwe.mitre.org/data/definitions/338.html)
- [OWASP: Insufficient Entropy](https://owasp.org/www-community/vulnerabilities/Insufficient_Entropy)
- [Python secrets module documentation](https://docs.python.org/3/library/secrets.html)
- [RFC 4086: Randomness Requirements for Security](https://www.rfc-editor.org/rfc/rfc4086)
