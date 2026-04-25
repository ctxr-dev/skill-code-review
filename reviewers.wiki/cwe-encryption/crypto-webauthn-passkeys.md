---
id: crypto-webauthn-passkeys
type: primary
depth_role: leaf
focus: Detect WebAuthn, Passkeys, and FIDO2 security pitfalls including challenge replay, origin validation, and credential binding errors
parents:
  - index.md
covers:
  - Relying party ID mismatch allowing cross-origin credential use
  - Challenge not validated or reused, enabling replay attacks
  - User verification not required when security policy demands it
  - Attestation not validated when required by organizational policy
  - "Credential ID stored but not bound to a specific user (credential confusion)"
  - "Missing resident key / discoverable credential when UX expects passkey flow"
  - Origin validation missing or too permissive allowing cross-origin authentication
  - Authenticator response counter not checked for cloned authenticator detection
  - Registration ceremony not requiring user presence
  - Credential public key not stored or verified correctly
tags:
  - webauthn
  - passkeys
  - fido2
  - authentication
  - mfa
  - CWE-287
  - CWE-346
activation:
  file_globs:
    - "**/*webauthn*"
    - "**/*passkey*"
    - "**/*fido*"
    - "**/*authenticator*"
    - "**/*credential*"
    - "**/*attestation*"
    - "**/*assertion*"
  keyword_matches:
    - WebAuthn
    - webauthn
    - passkey
    - passkeys
    - FIDO
    - FIDO2
    - authenticator
    - credential
    - challenge
    - attestation
    - assertion
    - PublicKeyCredential
    - navigator.credentials
    - rp
    - rpId
    - userVerification
    - discoverable
  structural_signals:
    - Import of WebAuthn or FIDO2 library
    - "navigator.credentials.create() or navigator.credentials.get() call"
    - PublicKeyCredentialCreationOptions or PublicKeyCredentialRequestOptions construction
    - Attestation or assertion response parsing
    - Challenge generation or validation logic
source:
  origin: file
  path: crypto-webauthn-passkeys.md
  hash: "sha256:88bcbafd22d67f2dab182ac3bac5323fcfc5601931feac000e59f1aef35047f7"
---
# WebAuthn / Passkeys / FIDO2 Security

## When This Activates

Activates when diffs touch WebAuthn registration (attestation) or authentication (assertion) ceremonies, passkey configuration, FIDO2 server implementation, or credential management. WebAuthn provides phishing-resistant authentication by binding credentials to origins, but implementation errors can undermine these guarantees. The protocol's ceremony-based design means each step must be validated correctly -- skipping any check creates an exploitable gap.

**Primary CWEs**: CWE-287 (Improper Authentication), CWE-346 (Origin Validation Error).

## Audit Surface

- [ ] Relying party ID (rpId) does not match the effective domain or is too broad
- [ ] Challenge generated with non-cryptographic PRNG or reused across ceremonies
- [ ] Challenge not validated against server-stored value on assertion response
- [ ] userVerification set to 'discouraged' when biometric/PIN should be required
- [ ] Attestation statement not validated when enterprise policy requires device attestation
- [ ] Credential ID not associated with a specific user account in the database
- [ ] Multiple users allowed to register the same credential ID
- [ ] Origin in clientDataJSON not validated against expected origin
- [ ] rpIdHash in authenticatorData not validated against expected rpId
- [ ] Sign count not tracked or not compared to detect cloned authenticators
- [ ] Registration allows authenticator without user presence (UP flag not checked)
- [ ] Discoverable credential not requested when passkey UX requires it
- [ ] Timeout set too long, allowing stale ceremony completion
- [ ] Credential public key stored without integrity protection
- [ ] allowCredentials list sent for discoverable credential flows (privacy leak)
- [ ] Fallback to password without step-up when WebAuthn fails

## Detailed Checks

### Challenge Generation and Validation (CWE-287, CWE-330)
<!-- activation: keywords=["challenge", "random", "nonce", "generate", "validate", "verify", "session", "store", "compare"] -->

- [ ] **Non-cryptographic challenge**: flag challenge generation using `Math.random()`, `random.random()`, `rand()`, or other non-cryptographic PRNGs. The challenge must be generated from a CSPRNG (e.g., `crypto.randomBytes(32)`, `os.urandom(32)`, `SecureRandom`). A predictable challenge allows an attacker to pre-compute assertions
- [ ] **Challenge reuse**: flag code that uses a static challenge, reuses the same challenge across multiple ceremonies, or does not invalidate the challenge after successful use. Each ceremony must use a fresh challenge that is single-use. The server must store the challenge in the session and delete it after validation
- [ ] **Challenge not validated on response**: flag assertion verification code that does not compare the challenge in `clientDataJSON` against the server-stored challenge. Without this check, an attacker can replay a captured assertion response from a different ceremony
- [ ] **Challenge too short**: flag challenges shorter than 16 bytes. The WebAuthn specification requires at least 16 bytes of randomness. Use 32 bytes for adequate security margin
- [ ] **Challenge not bound to session**: flag implementations where the challenge is stored in a way that is not bound to the authenticated session (e.g., stored in localStorage on the client, or in a global server-side cache without session binding). The challenge must be tied to the specific user session to prevent cross-session replay

### Origin and Relying Party Validation (CWE-346)
<!-- activation: keywords=["origin", "rpId", "rp", "domain", "host", "clientDataJSON", "type", "crossOrigin"] -->

- [ ] **Origin not validated**: flag assertion verification that does not check the `origin` field in `clientDataJSON` against the expected origin (scheme + host + port). Without origin validation, a phishing site on a different origin could submit stolen authenticator responses. The origin must match exactly (no substring or prefix matching)
- [ ] **rpId too broad**: flag relying party ID configuration that uses a parent domain when a more specific subdomain would be appropriate. For example, using `rpId: "example.com"` when the service runs on `app.example.com` means any subdomain of `example.com` (including potentially compromised ones) can accept the credential. Use the most specific rpId that covers the required deployment
- [ ] **rpIdHash not verified**: flag server-side verification code that does not compute `SHA-256(rpId)` and compare it against the `rpIdHash` in the `authenticatorData`. This ensures the authenticator was responding to the correct relying party, not a different one
- [ ] **clientDataJSON type not checked**: flag verification code that does not validate the `type` field in `clientDataJSON` is `"webauthn.create"` for registration or `"webauthn.get"` for authentication. Mixing up types could allow a registration response to be used as an authentication response

### User Verification and Presence (CWE-287)
<!-- activation: keywords=["userVerification", "userPresence", "UV", "UP", "flags", "required", "preferred", "discouraged", "biometric", "PIN"] -->

- [ ] **userVerification not required when it should be**: flag `userVerification: "discouraged"` or `userVerification: "preferred"` in contexts where the authentication is the sole factor (no password + WebAuthn, just WebAuthn). When WebAuthn is the only authentication factor, `userVerification: "required"` must be set to ensure the authenticator confirms user identity via biometric or PIN. Without UV, anyone with physical access to the authenticator device can authenticate
- [ ] **UV flag not checked in response**: flag server-side verification that does not check the UV (user verification) flag in `authenticatorData.flags` when `userVerification: "required"` was requested. Even if the server requests UV, a modified client could omit it -- the server must verify the flag is set
- [ ] **UP flag not checked**: flag verification code that does not check the UP (user presence) flag in `authenticatorData.flags`. User presence (physical interaction with the authenticator) must always be verified to prevent remote authenticator use without the user's knowledge

### Credential Binding and Storage (CWE-287)
<!-- activation: keywords=["credential", "credentialId", "publicKey", "user", "account", "store", "register", "database", "bind"] -->

- [ ] **Credential not bound to user**: flag registration code that stores the credential ID and public key without associating them with a specific user account. Without user binding, an attacker could register a credential and then claim it belongs to another user (credential confusion)
- [ ] **Duplicate credential ID allowed**: flag registration that does not check whether the credential ID is already registered to another user. Each credential ID must be unique across all users. If the authenticator returns a credential ID already in the database for a different user, registration must fail
- [ ] **Public key not stored**: flag registration that acknowledges the credential but does not persist the public key from the attestation response. Without the public key, the server cannot verify future assertions and may fall back to insecure methods
- [ ] **Credential metadata not tracked**: flag implementations that do not store credential creation time, last-used time, and sign counter alongside the credential. This metadata is needed for counter validation, credential lifecycle management, and security monitoring

### Attestation Validation
<!-- activation: keywords=["attestation", "fmt", "attStmt", "packed", "tpm", "android-key", "fido-u2f", "none", "enterprise", "direct"] -->

- [ ] **Attestation not validated when required by policy**: flag `attestation: "none"` or missing attestation validation in enterprise deployments that require device attestation to ensure only approved authenticator models are registered. When the deployment policy requires specific authenticator types (e.g., FIPS-certified keys), the attestation statement must be validated against a trust store of approved attestation root certificates
- [ ] **Attestation format not checked**: flag verification that does not validate the attestation statement format (`fmt`) and verify the attestation statement (`attStmt`) according to the format-specific verification procedure. An invalid or unsupported format should be rejected
- [ ] **Self-attestation accepted when direct attestation required**: flag configurations that accept self-attestation (where the credential key signs its own attestation) when the policy requires direct or enterprise attestation from a known manufacturer

### Sign Counter and Cloned Authenticator Detection
<!-- activation: keywords=["counter", "signCount", "clone", "increment", "stored", "compare", "detect"] -->

- [ ] **Sign counter not tracked**: flag authentication verification that does not store and compare the `signCount` from `authenticatorData`. The sign counter increments on each authentication. If the server receives a counter value less than or equal to the stored value, this indicates a cloned authenticator (the original and the clone both increment from the same starting value, but one will fall behind). The server should flag this and optionally lock the credential
- [ ] **Counter regression not acted upon**: flag code that detects counter regression (current < stored) but takes no action. At minimum, log a security alert. Recommended: lock the credential and require re-registration

### Discoverable Credentials and Passkey UX
<!-- activation: keywords=["discoverable", "resident", "residentKey", "requireResidentKey", "allowCredentials", "conditional", "mediation"] -->

- [ ] **Missing resident key for passkey flow**: flag registration that does not request `residentKey: "required"` or `requireResidentKey: true` when the UX expects a passkey flow (username-less login). Non-discoverable credentials require the server to send an `allowCredentials` list, which means the user must first identify themselves (typically by entering a username). True passkey UX requires discoverable (resident) credentials
- [ ] **allowCredentials sent for discoverable flow**: flag authentication ceremonies that send a populated `allowCredentials` list when using discoverable credentials for username-less login. Sending `allowCredentials` leaks which credential IDs are registered, enabling account enumeration. For discoverable credential flows, omit `allowCredentials` or send an empty list

## Common False Positives

- **userVerification: "preferred" in MFA context**: when WebAuthn is a second factor (password + WebAuthn), `userVerification: "preferred"` is acceptable because the password provides the first factor. Only flag when WebAuthn is the sole factor.
- **attestation: "none" for consumer applications**: most consumer-facing applications do not need device attestation. Flagging `attestation: "none"` is valid only when enterprise or regulatory policy requires attestation.
- **Test credentials with static challenges**: test suites may use fixed challenges and pre-computed responses for deterministic testing. Valid when clearly scoped to test code.
- **Sign counter 0 for non-incrementing authenticators**: some authenticators (particularly platform authenticators) always return a sign count of 0, indicating they do not support counters. This is a known limitation, not a bug in the server code. The server should handle counter == 0 as "counter not supported" and skip regression checks.

## Severity Guidance

| Finding | Severity |
|---|---|
| Challenge not validated against server-stored value | Critical |
| Origin not validated in clientDataJSON | Critical |
| Credential not bound to user account (credential confusion) | Critical |
| rpIdHash not verified in authenticatorData | Critical |
| Challenge generated with non-cryptographic PRNG | Important |
| userVerification not required when WebAuthn is sole factor | Important |
| UV flag not checked in server response verification | Important |
| Sign counter not tracked (cloned authenticator undetectable) | Important |
| Duplicate credential ID registration allowed | Important |
| rpId set to parent domain unnecessarily | Minor |
| Attestation not validated (consumer context, no policy requirement) | Minor |
| allowCredentials populated in discoverable credential flow | Minor |
| Timeout set longer than 5 minutes | Minor |

## See Also

- `sec-owasp-a07-authn-failures` -- WebAuthn pitfalls are authentication failures
- `sec-owasp-a02-crypto-failures` -- challenge generation and signature verification are cryptographic operations
- `crypto-jwt-pitfalls` -- WebAuthn is often combined with JWT-based session tokens after authentication
- `principle-fail-fast` -- each ceremony step must fail on any validation error
- `principle-encapsulation` -- WebAuthn ceremony logic should be centralized in a dedicated module

## Authoritative References

- [W3C Web Authentication: An API for accessing Public Key Credentials (Level 3)](https://www.w3.org/TR/webauthn-3/)
- [FIDO Alliance - FIDO2 Specifications](https://fidoalliance.org/fido2/)
- [OWASP WebAuthn Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html)
- [Yubico WebAuthn Developer Guide](https://developers.yubico.com/WebAuthn/WebAuthn_Developer_Guide/)
- [CWE-287: Improper Authentication](https://cwe.mitre.org/data/definitions/287.html)
- [CWE-346: Origin Validation Error](https://cwe.mitre.org/data/definitions/346.html)
- [passkeys.dev - Passkey Implementation Guide](https://passkeys.dev/)
