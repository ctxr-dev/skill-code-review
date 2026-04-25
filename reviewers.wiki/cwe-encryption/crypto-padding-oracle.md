---
id: crypto-padding-oracle
type: primary
depth_role: leaf
focus: Detect padding oracle attack surfaces arising from unauthenticated CBC encryption and distinguishable error responses
parents:
  - index.md
covers:
  - "CBC mode with PKCS#7/PKCS#5 padding and distinguishable error responses"
  - Decrypt-then-verify pattern instead of verify-then-decrypt
  - Custom padding implementations
  - Error messages that distinguish padding errors from other decryption errors
  - "MAC computed over plaintext instead of ciphertext (MAC-then-Encrypt)"
  - Unauthenticated encryption modes used without separate HMAC
  - Timing differences in padding validation code
  - CBC without HMAC exposed to network or untrusted input
  - Missing authenticated encryption when ciphertext integrity matters
tags:
  - cryptography
  - padding-oracle
  - CBC
  - authenticated-encryption
  - MAC
  - HMAC
  - CWE-354
  - CWE-347
activation:
  file_globs:
    - "**/*crypto*"
    - "**/*cipher*"
    - "**/*encrypt*"
    - "**/*decrypt*"
    - "**/*padding*"
    - "**/*pad*"
  keyword_matches:
    - CBC
    - padding
    - PKCS
    - pad
    - unpad
    - decrypt
    - MAC
    - HMAC
    - verify
    - authenticate
    - GCM
    - CCM
    - encrypt-then-mac
    - mac-then-encrypt
  structural_signals:
    - CBC cipher mode instantiation
    - Padding or unpadding operation
    - "Decryption followed by MAC verification (wrong order)"
    - Exception handling around decryption with specific padding error catch
    - HMAC computation in conjunction with encryption
source:
  origin: file
  path: crypto-padding-oracle.md
  hash: "sha256:6820b1a1ea96fceee0048cc08f106a28277e3c761c518ebeaf95d71e1306a5a7"
---
# Padding Oracle Attack Surfaces

## When This Activates

Activates when diffs touch CBC-mode decryption, padding/unpadding logic, MAC composition with encryption, or error handling around decryption operations. Padding oracle attacks allow an attacker to decrypt arbitrary ciphertext without knowing the key by exploiting distinguishable responses (error messages, timing, HTTP status codes) between valid and invalid padding. This class of vulnerability has been exploited in practice against ASP.NET (CVE-2010-3332), TLS (POODLE), and countless custom protocols.

**Primary CWEs**: CWE-354 (Improper Validation of Integrity Check Value), CWE-347 (Improper Verification of Cryptographic Signature).

## Audit Surface

- [ ] AES-CBC with PKCS5 or PKCS7 padding without accompanying HMAC
- [ ] Decryption error handling that returns different responses for padding vs. data errors
- [ ] Try/catch around decryption that catches BadPaddingException separately from other exceptions
- [ ] Decrypt function called before MAC/signature verification
- [ ] HMAC computed over plaintext instead of ciphertext
- [ ] Custom pad/unpad function instead of library-provided padding
- [ ] Error message containing 'padding', 'pad', 'PKCS', or 'block size' exposed to caller
- [ ] HTTP response codes that differ between padding failure and application-level failure
- [ ] Timing-variable padding validation (early return on first invalid byte)
- [ ] CBC mode used for data received from untrusted network source without authentication
- [ ] Encrypt-and-MAC or MAC-then-Encrypt composition instead of Encrypt-then-MAC
- [ ] AES-CBC selected when AES-GCM or ChaCha20-Poly1305 is available
- [ ] Padding removal that does not validate all padding bytes
- [ ] Decryption result returned to client with success/failure distinction before application processing

## Detailed Checks

### Unauthenticated CBC Encryption (CWE-354)
<!-- activation: keywords=["CBC", "cbc", "AES-CBC", "AES/CBC", "PKCS5", "PKCS7", "PKCS5Padding", "PKCS7Padding", "padding"] -->

- [ ] **CBC without HMAC**: flag AES-CBC (or any block cipher in CBC mode) used to encrypt data received from or sent to untrusted parties without an accompanying HMAC or digital signature. Without authentication, an attacker can modify ciphertext and observe whether the modified ciphertext decrypts with valid padding, revealing one byte of plaintext per oracle query
- [ ] **Prefer authenticated encryption**: flag new code selecting AES-CBC when AES-GCM, ChaCha20-Poly1305, or another AEAD (Authenticated Encryption with Associated Data) cipher is available. AEAD modes provide confidentiality and integrity in a single operation, eliminating the padding oracle attack surface entirely
- [ ] **CBC for network protocol**: flag CBC encryption in request/response protocols, APIs, or message queues where an attacker can submit modified ciphertexts and observe the server's response -- this is the classic padding oracle scenario
- [ ] **CBC for stored data without integrity check**: flag CBC-encrypted data stored in databases, files, or cookies without an HMAC -- an attacker with write access to the storage can modify ciphertext and observe application behavior on decryption

### MAC Composition Order (CWE-354)
<!-- activation: keywords=["MAC", "HMAC", "hmac", "mac", "verify", "authenticate", "encrypt-then-mac", "mac-then-encrypt", "encrypt-and-mac", "tag", "digest"] -->

- [ ] **MAC-then-Encrypt (wrong order)**: flag patterns where the MAC is computed over the plaintext and then both are encrypted. This composition leaks whether the ciphertext is valid to an attacker who can modify the ciphertext, because the decryption will succeed or fail in distinguishable ways before the MAC is checked
- [ ] **Encrypt-and-MAC (also wrong)**: flag patterns where encryption and MAC are computed independently over the plaintext and the MAC tag is sent in cleartext. This leaks information about the plaintext through the MAC
- [ ] **Encrypt-then-MAC (correct, verify order matters)**: when Encrypt-then-MAC is used, flag if the implementation decrypts before verifying the MAC. The correct order is: (1) compute HMAC over ciphertext+IV, (2) verify HMAC in constant time, (3) only if HMAC is valid, proceed with decryption
- [ ] **HMAC scope too narrow**: flag HMAC computed over ciphertext only, excluding the IV. The IV must be included in the HMAC input; otherwise, an attacker can replace the IV to corrupt the first plaintext block without detection

### Distinguishable Error Responses (CWE-354)
<!-- activation: keywords=["BadPaddingException", "PaddingError", "InvalidPadding", "padding error", "decrypt", "catch", "except", "error", "status", "response", "400", "500"] -->

- [ ] **Separate padding exception handling**: flag code that catches `BadPaddingException` (Java), `ValueError` from unpadding (Python), or equivalent padding-specific exceptions separately from other decryption errors. The attacker can distinguish these responses to mount the oracle attack. All decryption failures must return the same error regardless of cause
- [ ] **Error messages revealing padding state**: flag error messages that include the word "padding", "invalid pad", "bad PKCS", "block size mismatch", or similar -- these directly expose the oracle. Return a generic "decryption failed" message for all failure modes
- [ ] **Different HTTP status codes**: flag API endpoints that return different HTTP status codes for padding failures (e.g., 400) vs. other decryption failures (e.g., 500) or application-level errors. Attackers can distinguish these via status code alone
- [ ] **Different response timing**: flag decryption code paths where padding failure returns immediately but successful decryption proceeds to further processing -- the timing difference is itself an oracle, even if the error messages are identical

### Timing Side Channels in Padding Validation (CWE-354)
<!-- activation: keywords=["pad", "unpad", "validate", "check", "verify", "constant_time", "compare", "hmac.compare_digest", "MessageDigest.isEqual", "crypto.timingSafeEqual"] -->

- [ ] **Early-return padding check**: flag padding validation that returns `false` on the first invalid byte instead of checking all padding bytes and returning a single result. This creates a timing oracle where the attacker can determine how many padding bytes are correct
- [ ] **Non-constant-time MAC comparison**: flag HMAC verification using `==`, `.equals()`, or byte-by-byte comparison instead of constant-time comparison functions: `hmac.compare_digest()` (Python), `crypto.timingSafeEqual()` (Node.js), `MessageDigest.isEqual()` (Java), `subtle.ConstantTimeCompare()` (Go)
- [ ] **Custom padding removal**: flag hand-written padding removal logic instead of library-provided unpadding. Custom implementations frequently introduce timing or correctness vulnerabilities. Let the crypto library handle padding

### Custom Padding Implementations (CWE-354)
<!-- activation: keywords=["pad", "unpad", "padding", "block_size", "blockSize", "PKCS5", "PKCS7", "zero_pad", "null_pad"] -->

- [ ] **Hand-rolled pad/unpad functions**: flag custom implementations of PKCS#7 padding, zero padding, or any other padding scheme. These are error-prone and frequently introduce vulnerabilities: incomplete validation, off-by-one in padding length, or accepting multiple valid padding formats
- [ ] **Non-standard padding schemes**: flag padding schemes that are not PKCS#7 (also called PKCS#5 for 8-byte blocks). Zero padding, space padding, or bit padding are ambiguous (cannot distinguish padding from data) and are not universally supported
- [ ] **Padding validation that accepts over-length padding**: flag unpadding code that accepts padding length values greater than the block size -- this can indicate a validation bypass. PKCS#7 padding bytes must have a value between 1 and the block size (inclusive)

### Migration to Authenticated Encryption (CWE-354, CWE-347)
<!-- activation: keywords=["GCM", "CCM", "SIV", "AEAD", "authenticated", "migrate", "upgrade", "replace", "deprecate"] -->

- [ ] **Partial AEAD migration**: flag codebases where some encryption paths use AEAD (GCM, CCM, SIV) but others still use unauthenticated CBC. Inconsistent migration leaves attack surface in the un-migrated paths
- [ ] **GCM without using associated data**: flag AES-GCM usage where the associated data (AAD) parameter is empty or unused when context data (key version, sender ID, message type) is available. AAD binds the ciphertext to its context, preventing ciphertext from being replayed in a different context
- [ ] **Downgrade from AEAD to CBC**: flag changes that replace authenticated encryption with unauthenticated CBC -- this is a security regression regardless of the reason

## Common False Positives

- **CBC in legacy decryption path**: code that decrypts historical data encrypted with CBC during a migration to GCM. Valid only when the code is clearly read-only (decrypt only, never encrypt), has an HMAC check or is processing trusted data, and a migration plan exists.
- **PKCS#7 in non-cryptographic context**: PKCS#7 is also a CMS/SMIME container format. Flag only when PKCS#7/PKCS#5 refers to block cipher padding, not to the certificate/message format.
- **Library-internal padding**: cryptographic library source code (OpenSSL, BoringSSL, Go's crypto/cipher) implements padding internally. Do not flag the library's own implementation unless reviewing the library itself.
- **Test vectors with CBC**: test code that verifies CBC encryption against known test vectors with fixed IVs and known padding. Valid when clearly scoped to test files.
- **Authenticated CBC in established protocol**: some protocols (e.g., SSH, IPsec ESP) use CBC with their own MAC mechanisms that have been formally analyzed. Flag only if the implementation deviates from the protocol specification.

## Severity Guidance

| Finding | Severity |
|---|---|
| CBC without HMAC processing untrusted ciphertext from network | Critical |
| Decrypt-then-verify pattern (MAC checked after decryption) | Critical |
| Distinguishable error responses for padding vs. other failures | Critical |
| Non-constant-time MAC comparison | Critical |
| MAC-then-Encrypt or Encrypt-and-MAC composition | Important |
| Custom padding implementation instead of library-provided | Important |
| CBC for stored data without integrity check | Important |
| Early-return padding validation (timing oracle) | Important |
| HMAC scope excludes IV | Important |
| Downgrade from AEAD to unauthenticated CBC | Important |
| AES-GCM without associated data when context is available | Minor |
| CBC chosen for new code when AEAD is available (no untrusted input) | Minor |
| Partial AEAD migration with remaining CBC paths in low-risk code | Minor |

## See Also

- `sec-owasp-a02-crypto-failures` -- parent category; padding oracle is a specific manifestation of cryptographic failure
- `crypto-algorithm-selection` -- choosing AEAD modes (GCM, CCM) over CBC eliminates the padding oracle surface
- `crypto-nonce-iv-management` -- CBC IV correctness is a prerequisite; GCM nonce correctness is critical for AEAD
- `crypto-key-management-kms-hsm-vault` -- MAC keys must be managed with the same rigor as encryption keys
- `principle-fail-fast` -- decryption must fail identically for all error types, not expose the failure reason

## Authoritative References

- [CWE-354: Improper Validation of Integrity Check Value](https://cwe.mitre.org/data/definitions/354.html)
- [CWE-347: Improper Verification of Cryptographic Signature](https://cwe.mitre.org/data/definitions/347.html)
- [Vaudenay, S. (2002) - Security Flaws Induced by CBC Padding](https://www.iacr.org/archive/eurocrypt2002/23320530/cbc02_e02.pdf)
- [OWASP - Padding Oracle Attack](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/09-Testing_for_Weak_Cryptography/02-Testing_for_Padding_Oracle)
- [Moxie Marlinspike - The Cryptographic Doom Principle](https://moxie.org/2011/12/13/the-cryptographic-doom-principle.html)
- [Hugo Krawczyk - The Order of Encryption and Authentication for Protecting Communications](https://eprint.iacr.org/2001/045.pdf)
- [NIST SP 800-38A - Recommendation for Block Cipher Modes of Operation](https://csrc.nist.gov/publications/detail/sp/800-38a/final)
