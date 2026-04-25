---
id: crypto-nonce-iv-management
type: primary
depth_role: leaf
focus: Detect static, reused, or improperly generated initialization vectors and nonces in symmetric encryption
parents:
  - index.md
covers:
  - Static or hardcoded initialization vectors used across encryptions
  - IVs reused with the same key in CBC, CTR, or GCM modes
  - Counter-mode nonces reused with the same key
  - Random IVs for CTR or GCM not generated from a CSPRNG
  - "IV length incorrect for the algorithm (e.g., not 12 bytes for AES-GCM)"
  - Nonce not included with ciphertext so receiver cannot decrypt
  - "AES-GCM nonce reuse (catastrophic -- reveals authentication key)"
  - ChaCha20-Poly1305 nonce reuse
  - Deterministic nonce schemes without proper domain separation
  - "IV generated from predictable source (timestamp, counter without key scope)"
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
activation:
  file_globs:
    - "**/*crypto*"
    - "**/*cipher*"
    - "**/*encrypt*"
    - "**/*decrypt*"
    - "**/*aes*"
    - "**/*gcm*"
  keyword_matches:
    - IV
    - iv
    - nonce
    - Nonce
    - GCM
    - CTR
    - CBC
    - counter
    - initialization vector
    - AES
    - ChaCha
    - encrypt
    - cipher
    - random
    - salt
  structural_signals:
    - Cipher initialization with IV or nonce parameter
    - "Byte array or buffer assigned to IV/nonce variable"
    - Random byte generation for encryption context
    - GCM or CTR mode cipher instantiation
    - Ciphertext construction or parsing with prepended bytes
source:
  origin: file
  path: crypto-nonce-iv-management.md
  hash: "sha256:e67cf782fbfff169453c4557144ba09affb2aff425de4c842bc54c64d7da6921"
---
# Nonce and IV Management

## When This Activates

Activates when diffs touch symmetric encryption code that involves initialization vectors (IVs) or nonces -- particularly AES-GCM, AES-CTR, AES-CBC, or ChaCha20-Poly1305. Nonce and IV misuse is one of the most dangerous cryptographic errors because it can completely break confidentiality and authenticity even when the algorithm and key are perfectly chosen. AES-GCM nonce reuse is catastrophic: it reveals the authentication key and allows forgery of arbitrary ciphertexts.

**Primary CWEs**: CWE-329 (Generation of Predictable IV with CBC Mode), CWE-330 (Use of Insufficiently Random Values).

## Audit Surface

- [ ] IV or nonce assigned to a constant, zero-filled array, or hardcoded byte sequence
- [ ] Same IV variable reused in a loop or across multiple encrypt calls with the same key
- [ ] AES-GCM nonce generated from Math.random, random.random, or other non-CSPRNG
- [ ] AES-GCM nonce length not 12 bytes (96 bits)
- [ ] CTR mode counter initialized to zero without ensuring unique key per message
- [ ] Nonce derived from user input or other attacker-controllable source
- [ ] Ciphertext stored or transmitted without prepended IV/nonce
- [ ] IV generated from timestamp, sequential counter, or PID
- [ ] ChaCha20 nonce not 12 bytes or reused across messages with same key
- [ ] CBC IV not random (using zero IV, fixed IV, or ECB-encrypted IV)
- [ ] Encrypt function that accepts IV as parameter but has a default value
- [ ] Nonce generation and encryption not atomic (race condition possible)
- [ ] Deterministic nonce (SIV mode) used without understanding its properties
- [ ] Counter nonce without overflow detection for high-volume encryption

## Detailed Checks

### Static and Hardcoded IVs (CWE-329)
<!-- activation: keywords=["IV", "iv", "nonce", "new byte", "bytes(", "b\"\\x00", "Buffer.alloc", "make([]byte", "initialization_vector", "init_vector"] -->

- [ ] **Zero IV**: flag IVs initialized as all-zero byte arrays (`new byte[16]`, `bytes(16)`, `Buffer.alloc(16)`, `[0]*16`, `make([]byte, 16)`). A zero IV is the most common IV misuse and breaks CBC security (first block becomes ECB) and is catastrophic for CTR/GCM (nonce reuse across all messages using the same key)
- [ ] **Hardcoded IV**: flag IVs assigned from string literals, hardcoded byte arrays, or constants. Examples: `iv = b"\x01\x02\x03..."`, `byte[] iv = {0x01, 0x02, ...}`, `const iv = "1234567890123456"`. A static IV means every encryption with the same key produces partially or fully deterministic ciphertext
- [ ] **IV from deterministic source**: flag IVs derived from timestamps (`time.time()`, `System.currentTimeMillis()`), sequential counters without key-scoping, process IDs, or other predictable values. For CBC, IVs must be indistinguishable from random; for CTR/GCM, they must never repeat with the same key
- [ ] **Default IV parameter**: flag encrypt functions with a default IV parameter value (e.g., `def encrypt(data, key, iv=DEFAULT_IV)`) -- callers may omit the IV and unknowingly reuse the default

### AES-GCM Nonce Reuse (CWE-329, CWE-330)
<!-- activation: keywords=["GCM", "gcm", "AES-GCM", "AESGCM", "AES/GCM", "GCMParameterSpec", "aead", "AEAD", "nonce"] -->

- [ ] **Catastrophic nonce reuse**: flag any pattern where the same nonce could be used twice with the same AES-GCM key. GCM nonce reuse reveals the authentication key (GHASH key H) via polynomial interpolation and allows an attacker to forge arbitrary ciphertexts and decrypt all messages encrypted with that key. This is not a theoretical concern -- it is a practical, exploitable vulnerability
- [ ] **Random nonce collision risk**: flag random 96-bit GCM nonces when the same key encrypts more than approximately 2^32 messages -- the birthday bound for 96-bit nonces gives a 50% collision probability at 2^48 messages, but NIST recommends limiting to 2^32 invocations per key for a negligible collision probability. For high-volume encryption, use deterministic nonce construction (counter-based) or key rotation
- [ ] **Non-CSPRNG for GCM nonce**: flag GCM nonces generated from `Math.random()`, `random.random()`, `rand()`, or `java.util.Random`. Even for random nonces, a weak PRNG increases collision probability dramatically. Use `crypto.randomBytes`, `os.urandom`, `SecureRandom`, or `crypto/rand`
- [ ] **Wrong nonce length**: flag AES-GCM nonces that are not 12 bytes (96 bits). While GCM technically supports other lengths, non-96-bit nonces undergo an extra GHASH step that degrades security properties and is a common source of interoperability bugs

### CTR Mode Counter Management (CWE-329)
<!-- activation: keywords=["CTR", "ctr", "counter", "AES-CTR", "AES/CTR", "Counter", "SICBlockCipher"] -->

- [ ] **Counter reuse with same key**: flag CTR mode where the same counter value could encrypt different plaintext blocks with the same key. CTR mode XORs plaintext with a keystream derived from the counter -- if the same counter block is reused, XORing two ciphertexts cancels the keystream and reveals the XOR of the two plaintexts
- [ ] **Counter starting at zero without unique key**: flag CTR counter initialized to zero when the key is reused across messages. Each message must start at a unique counter offset, or each message must use a unique key
- [ ] **Counter overflow without detection**: flag high-volume CTR encryption without overflow detection. A 32-bit counter overflows after 2^32 blocks (~68 GB for AES), at which point counter values repeat. Implementations must detect counter wraparound and fail or rotate the key
- [ ] **Counter from external input**: flag counter values derived from user-supplied data -- an attacker could supply a counter that collides with a previous encryption

### CBC IV Requirements (CWE-329)
<!-- activation: keywords=["CBC", "cbc", "AES-CBC", "AES/CBC", "IV", "iv", "initialization_vector"] -->

- [ ] **CBC with non-random IV**: CBC mode requires an unpredictable IV -- specifically, the IV must be indistinguishable from random to an attacker who can observe previous ciphertexts. Flag IVs that are derived from the key, previous ciphertext block (unless explicitly implementing cipher-block chaining), or sequential counters
- [ ] **CBC IV reuse**: flag same IV used with the same key across different messages -- this makes the first encrypted block deterministic and enables chosen-plaintext attacks (BEAST attack on TLS 1.0 exploited predictable IVs)
- [ ] **CBC IV not prepended to ciphertext**: flag CBC encryption where the IV is not stored alongside the ciphertext -- the decryptor needs the IV to recover the first block. If the IV is lost, decryption silently produces corrupted output for the first block

### Nonce Transmission and Storage (CWE-329)
<!-- activation: keywords=["prepend", "concat", "encode", "decode", "ciphertext", "message", "serialize", "pack", "unpack"] -->

- [ ] **Nonce not included with ciphertext**: flag encryption code that returns only the ciphertext without the nonce/IV. The receiver must have the exact nonce to decrypt. Standard practice is to prepend the nonce to the ciphertext (e.g., `nonce || ciphertext || tag` for GCM)
- [ ] **Nonce/ciphertext parsing mismatch**: flag decryption code that extracts the nonce from the wrong byte offset or with the wrong length. A mismatch silently produces incorrect plaintext or an authentication failure
- [ ] **Nonce stored separately from ciphertext**: flag designs that store the nonce in a different database column, file, or message field from the ciphertext without strong referential integrity -- if the association is broken, decryption fails silently or produces garbage

### ChaCha20-Poly1305 Nonce Requirements (CWE-329)
<!-- activation: keywords=["ChaCha", "chacha", "Poly1305", "poly1305", "XChaCha", "xchacha", "AEAD"] -->

- [ ] **ChaCha20-Poly1305 nonce reuse**: flag nonce reuse with ChaCha20-Poly1305 -- like GCM, nonce reuse is catastrophic, revealing the Poly1305 key and enabling forgery
- [ ] **Wrong nonce size**: standard ChaCha20-Poly1305 (RFC 8439) uses a 12-byte nonce. XChaCha20-Poly1305 uses a 24-byte nonce with a larger nonce space safer for random generation. Flag nonce sizes that do not match the chosen variant
- [ ] **Random nonce without XChaCha**: flag random nonce generation for standard ChaCha20-Poly1305 in high-volume scenarios -- the 12-byte nonce has the same birthday-bound concerns as GCM. Prefer XChaCha20-Poly1305 (24-byte nonce) when random nonces are desired

## Common False Positives

- **IV in test vectors**: cryptographic test vectors from NIST or RFC publications use fixed IVs by design for reproducibility. Valid when the code is clearly in a test file and the IV matches a published test vector.
- **IV for idempotent encryption (SIV mode)**: synthetic IV modes (AES-SIV, AES-GCM-SIV) deliberately derive the IV from the plaintext to provide deterministic encryption with nonce-misuse resistance. This is correct behavior for SIV modes -- do not flag.
- **Sequential nonce in protocol context**: some protocols (TLS 1.3, WireGuard) use sequential counters as nonces by design, with the protocol guaranteeing uniqueness. Valid when the code implements a defined protocol specification.
- **IV variable naming**: variables named `iv` in non-cryptographic contexts (Roman numeral IV, initialization value for accumulators, etc.) are not IVs.
- **Salt for KDF**: salts for PBKDF2, scrypt, or HKDF are not IVs, even though they serve a similar uniqueness purpose. They have different requirements (salts can be public; IVs for CBC must be unpredictable).

## Severity Guidance

| Finding | Severity |
|---|---|
| AES-GCM nonce reuse with same key | Critical |
| ChaCha20-Poly1305 nonce reuse with same key | Critical |
| Hardcoded or zero IV used with a reused key | Critical |
| CTR counter reuse with same key | Critical |
| GCM nonce from non-CSPRNG (Math.random, rand()) | Critical |
| CBC with predictable (non-random) IV | Important |
| AES-GCM nonce not 12 bytes | Important |
| Nonce not prepended to or stored with ciphertext | Important |
| Random nonce without volume-based key rotation for GCM | Important |
| CTR counter overflow not detected | Important |
| Encrypt function with default IV parameter | Important |
| IV from timestamp or sequential source for CBC | Important |
| Nonce/ciphertext byte offset mismatch in decryption | Minor |
| Counter nonce without domain separation across subsystems | Minor |

## See Also

- `sec-owasp-a02-crypto-failures` -- parent category for all cryptographic failures including IV/nonce misuse
- `crypto-algorithm-selection` -- algorithm choice determines nonce requirements (GCM vs CBC vs CTR)
- `crypto-padding-oracle` -- CBC IV issues often co-occur with padding oracle vulnerabilities
- `crypto-key-management-kms-hsm-vault` -- key rotation is the complement to nonce management for preventing reuse
- `principle-fail-fast` -- encryption must fail on invalid or missing nonce, not silently use a default

## Authoritative References

- [NIST SP 800-38D - Recommendation for Block Cipher Modes: GCM](https://csrc.nist.gov/publications/detail/sp/800-38d/final)
- [NIST SP 800-38A - Recommendation for Block Cipher Modes of Operation (CBC, CTR)](https://csrc.nist.gov/publications/detail/sp/800-38a/final)
- [CWE-329: Generation of Predictable IV with CBC Mode](https://cwe.mitre.org/data/definitions/329.html)
- [CWE-330: Use of Insufficiently Random Values](https://cwe.mitre.org/data/definitions/330.html)
- [RFC 8439 - ChaCha20 and Poly1305 for IETF Protocols](https://datatracker.ietf.org/doc/html/rfc8439)
- [Nonce-Disrespecting Adversaries: Practical Forgery Attacks on GCM in TLS](https://eprint.iacr.org/2016/475.pdf)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
