---
id: crypto-jwt-pitfalls
type: primary
depth_role: leaf
focus: Detect JWT security pitfalls including algorithm confusion, missing claim validation, and unsafe token storage
parents:
  - index.md
covers:
  - alg=none accepted, allowing unsigned tokens to bypass signature verification
  - "HS256/RS256 algorithm confusion enabling key confusion attacks"
  - kid parameter injection leading to key retrieval from attacker-controlled sources
  - "JKU/X5U header manipulation to supply attacker-controlled signing keys"
  - "JWT without expiry (exp claim) allowing indefinite token validity"
  - "JWT without audience (aud) validation enabling cross-service token reuse"
  - "JWT without issuer (iss) validation enabling token forgery from untrusted issuers"
  - HMAC signing secret too short, enabling brute-force key recovery
  - JWT stored in localStorage exposing tokens to XSS attacks
  - JWT used as a session mechanism without revocation infrastructure
  - Unsigned JWTs accepted as valid by the application
  - Nested JWTs without validating inner signature
  - JWT payload treated as trusted before signature verification
tags:
  - jwt
  - authentication
  - token
  - cryptography
  - CWE-345
  - CWE-347
  - CWE-290
activation:
  file_globs:
    - "**/*jwt*"
    - "**/*token*"
    - "**/*auth*"
    - "**/*jose*"
    - "**/*jws*"
    - "**/*jwe*"
    - "**/*bearer*"
    - "**/*claim*"
    - "**/*middleware*"
  keyword_matches:
    - JWT
    - jwt
    - jsonwebtoken
    - jose
    - jws
    - jwe
    - token
    - bearer
    - claim
    - sign
    - verify
    - decode
    - alg
    - HS256
    - RS256
    - ES256
    - exp
    - aud
    - iss
    - kid
    - header
    - payload
  structural_signals:
    - Import of JWT or JOSE library
    - Token signing or verification function call
    - Bearer token extraction from Authorization header
    - JWT decode without verify
    - Algorithm selection in JWT options
source:
  origin: file
  path: crypto-jwt-pitfalls.md
  hash: "sha256:ef0cd9cef48a453fb3e1c97349f95bfc79459ed7ae0a8acd036e27eb08fcbfe0"
---
# JWT Security Pitfalls

## When This Activates

Activates when diffs touch JWT creation, verification, parsing, or configuration. JSON Web Tokens are the dominant bearer token format for APIs and SPAs, but their flexibility creates a large attack surface. Most JWT vulnerabilities stem from trusting attacker-controlled header fields, skipping claim validation, or confusing the verification key type. A single misconfiguration can allow complete authentication bypass.

**Primary CWEs**: CWE-345 (Insufficient Verification of Data Authenticity), CWE-347 (Improper Verification of Cryptographic Signature), CWE-290 (Authentication Bypass by Spoofing).

## Audit Surface

- [ ] Library or code accepts alg=none or does not enforce an explicit algorithm allowlist
- [ ] Token verification uses the alg header from the token itself to select the key type
- [ ] HMAC verification key is an RSA/EC public key (algorithm confusion)
- [ ] kid, jku, or x5u header values used without validation or allowlisting
- [ ] Token issued without exp claim or exp set unreasonably far in the future
- [ ] aud claim not checked during verification, or audience set to a wildcard
- [ ] iss claim not checked during verification, or issuer not pinned to expected value
- [ ] HMAC secret shorter than 256 bits (32 bytes)
- [ ] JWT stored in localStorage or sessionStorage instead of httpOnly cookie
- [ ] No token revocation mechanism (blocklist, short-lived + refresh, or session binding)
- [ ] jwt.decode() called without verification (signature not checked)
- [ ] Token payload parsed and used before verify() is called
- [ ] Nested JWT (inner JWS inside outer JWE) with only outer signature validated
- [ ] JWT signing key hardcoded in source code
- [ ] Token lifetime (exp - iat) exceeds 1 hour for access tokens without justification
- [ ] nbf (not before) claim not validated, allowing future-dated tokens
- [ ] typ header not checked, allowing JWS where JWE is expected or vice versa
- [ ] JWKS endpoint fetched over HTTP or without certificate validation
- [ ] Clock skew tolerance set too high (> 60 seconds) weakening expiry enforcement

## Detailed Checks

### Algorithm None and Algorithm Confusion (CWE-345, CWE-347)
<!-- activation: keywords=["alg", "none", "HS256", "RS256", "algorithm", "verify", "sign", "key", "secret", "public"] -->

- [ ] **alg=none accepted**: flag any JWT library configuration or custom code that does not explicitly reject the `none` algorithm. The `none` algorithm produces unsigned tokens -- if accepted, any attacker can forge a valid-looking token. Most libraries reject `none` by default, but some require explicit opt-in to enforcement. Look for `algorithms` allowlist parameters being absent or including `none`
- [ ] **Algorithm not pinned on verification**: flag verification code that does not specify an explicit `algorithms` parameter or allowlist. When the library reads the algorithm from the token header, an attacker can switch from RS256 to HS256 and sign with the (public) RSA key as the HMAC secret. The verifier must always declare which algorithm(s) it expects
- [ ] **Key confusion (HS256/RS256 swap)**: flag code that passes an RSA public key to an HMAC verification function. In the classic CVE-2015-9235 attack, the attacker changes the header to HS256 and uses the publicly available RSA key as the HMAC shared secret. The fix: never use the same key object for both asymmetric and symmetric verification; pin the algorithm
- [ ] **Dynamic algorithm selection from header**: flag code like `jwt.verify(token, key, { algorithm: decoded.header.alg })` that reads the algorithm from the untrusted token. The algorithm must come from server-side configuration, never from the token

### Header Parameter Injection (CWE-290)
<!-- activation: keywords=["kid", "jku", "x5u", "x5c", "header", "jwks", "key_url", "certificate"] -->

- [ ] **kid injection**: flag code that uses the `kid` (Key ID) header parameter to construct file paths, database queries, or URLs without validation. Attackers can inject path traversal (`../../etc/passwd`), SQL injection, or point to attacker-controlled key material. The kid value must be matched against a server-side allowlist
- [ ] **jku/x5u manipulation**: flag code that fetches signing keys from the `jku` (JWK Set URL) or `x5u` (X.509 Certificate URL) header without validating the URL against a pinned allowlist. An attacker can point these to their own server hosting a key they control. These headers should be ignored or validated against a strict allowlist of trusted URLs
- [ ] **x5c chain not validated**: flag code that accepts the `x5c` (X.509 Certificate Chain) header and uses the embedded certificate to verify the signature without validating the certificate chain against a trusted root. The attacker can embed their own certificate

### Missing Claim Validation (CWE-345)
<!-- activation: keywords=["exp", "aud", "iss", "nbf", "iat", "claim", "validate", "check", "option"] -->

- [ ] **No exp validation**: flag tokens issued without an `exp` (expiration) claim or verification code that does not check expiry. Tokens without expiry remain valid forever -- if stolen, they grant permanent access. Access tokens should expire within 15-60 minutes
- [ ] **No aud validation**: flag verification code that does not validate the `aud` (audience) claim against the expected service identifier. Without audience validation, a token issued for Service A can be replayed against Service B if they share a signing key or trust the same issuer
- [ ] **No iss validation**: flag verification code that does not check the `iss` (issuer) claim against a pinned expected value. Without issuer validation, tokens from untrusted identity providers may be accepted
- [ ] **Excessive token lifetime**: flag access tokens with `exp - iat > 3600` (1 hour) without documented justification. Long-lived access tokens increase the window for stolen token abuse. Use short-lived access tokens with refresh token rotation instead
- [ ] **Clock skew too generous**: flag clock skew / leeway tolerance greater than 60 seconds. Large tolerances weaken the expiry guarantee and widen the replay window

### Weak Signing Keys (CWE-326)
<!-- activation: keywords=["secret", "key", "sign", "HMAC", "HS256", "HS384", "HS512", "generate", "random"] -->

- [ ] **HMAC secret too short**: flag HMAC signing secrets shorter than 256 bits (32 bytes) for HS256, 384 bits for HS384, or 512 bits for HS512. Short secrets can be brute-forced offline -- the attacker only needs the token (which is often in URLs, logs, or browser storage). Use `openssl rand -base64 64` or equivalent CSPRNG to generate secrets
- [ ] **Signing key hardcoded**: flag JWT signing secrets or private keys embedded as string literals in source code. Keys must be loaded from a secrets manager, HSM, or environment-injected secret at runtime
- [ ] **Signing key shared across environments**: flag configuration where production and staging/development share the same JWT signing key. A token from a development environment should not be valid in production

### Unsafe Token Storage and Transport (CWE-922)
<!-- activation: keywords=["localStorage", "sessionStorage", "cookie", "httpOnly", "secure", "SameSite", "XSS", "document.cookie", "Authorization", "Bearer"] -->

- [ ] **localStorage/sessionStorage exposure**: flag JWTs stored in `localStorage` or `sessionStorage`. These are accessible to any JavaScript running on the page -- a single XSS vulnerability leaks the token. Prefer httpOnly, Secure, SameSite=Strict cookies for browser-based applications
- [ ] **Cookie without httpOnly or Secure flags**: flag JWT cookies set without `httpOnly` (accessible to JavaScript) or without `Secure` (sent over HTTP). Also verify `SameSite=Strict` or `SameSite=Lax` is set to mitigate CSRF
- [ ] **Token in URL**: flag JWTs passed as URL query parameters (e.g., `?token=eyJ...`). URLs appear in browser history, server access logs, referrer headers, and proxy logs

### JWT as Session Without Revocation (CWE-613)
<!-- activation: keywords=["session", "logout", "revoke", "blacklist", "blocklist", "refresh", "rotate"] -->

- [ ] **No revocation mechanism**: flag systems that use JWTs as the sole session mechanism without any revocation infrastructure. When a user changes their password, gets their account compromised, or an admin needs to terminate sessions, there is no way to invalidate outstanding JWTs. Implement at least one: token blocklist with TTL, short-lived tokens (< 15 min) paired with server-side refresh tokens, or session binding that checks a server-side session store
- [ ] **Refresh token without rotation**: flag refresh token implementations that reuse the same refresh token indefinitely. Refresh tokens must be rotated on each use (issuing a new refresh token and invalidating the old one) to limit the damage of token theft

### Decode Before Verify (CWE-345)
<!-- activation: keywords=["decode", "parse", "payload", "claims", "base64", "JSON.parse", "atob"] -->

- [ ] **jwt.decode() used for authorization decisions**: flag calls to `jwt.decode()`, `jose.decodeJwt()`, or manual Base64 decoding of the JWT payload when the result is used for authorization or business logic without prior `verify()`. Decoding without verification means the token signature is not checked -- anyone can craft a valid-looking payload. Decode-only is acceptable only for logging or pre-flight inspection where no security decision depends on the result
- [ ] **Payload accessed before verify returns**: flag code patterns where the token is parsed, claims are extracted, and then verification happens (or happens in a separate code path that might not execute). The verify-then-use pattern must be enforced: always call verify first, then use the verified claims object it returns

### JWKS Endpoint Security
<!-- activation: keywords=["jwks", "JWKS", "well-known", "openid-configuration", "keys", "fetch", "http"] -->

- [ ] **JWKS over HTTP**: flag JWKS (JSON Web Key Set) endpoints configured with `http://` URLs. The JWKS endpoint provides the public keys used to verify tokens -- an attacker who can intercept this request (MITM) can substitute their own keys. Always use HTTPS
- [ ] **JWKS without caching or rate limiting**: flag implementations that fetch the JWKS endpoint on every token verification without caching. This creates a denial-of-service vector (the auth server is hit on every request) and increases latency. Cache keys with a reasonable TTL (5-15 minutes) and implement a maximum refresh rate
- [ ] **JWKS endpoint not validated**: flag code that accepts an arbitrary JWKS URL from configuration, user input, or token headers without validating it against a pinned allowlist of trusted issuers

## Common False Positives

- **jwt.decode() for logging or display**: using decode-without-verify to log token claims, display user info in debug tools, or inspect token structure is acceptable when no authorization decision depends on the decoded data. The code path must not branch on decoded claims for access control.
- **Test fixtures with known secrets**: test files may hardcode JWT secrets like `"test-secret"` for deterministic test cases. Valid only when clearly scoped to test directories and the secret cannot reach production configuration.
- **Short-lived tokens in internal microservices**: some service mesh architectures use very short-lived (seconds) unsigned or weakly-signed tokens where mTLS provides the actual authentication. Valid when the trust boundary is documented and the unsigned token never leaves the encrypted mesh.
- **Algorithm flexibility in library code**: JWT libraries themselves must support multiple algorithms -- flagging library internals for supporting `none` is a false positive. Focus on application code that configures or invokes the library.

## Severity Guidance

| Finding | Severity |
|---|---|
| alg=none accepted in production token verification | Critical |
| Algorithm confusion possible (no algorithm pinning on verify) | Critical |
| JWT signing secret hardcoded in source code | Critical |
| jwt.decode() result used for authorization without verify | Critical |
| kid parameter used in file path or SQL query without sanitization | Critical |
| jku/x5u header followed without URL allowlist | Critical |
| HMAC signing secret shorter than 256 bits | Important |
| Token issued without exp claim | Important |
| aud or iss claim not validated during verification | Important |
| JWT stored in localStorage (XSS exposure) | Important |
| No token revocation mechanism with token lifetime > 15 minutes | Important |
| Refresh token not rotated on use | Important |
| JWKS endpoint fetched over HTTP | Important |
| Access token lifetime exceeds 1 hour | Minor |
| Clock skew tolerance between 60-300 seconds | Minor |
| nbf claim not validated | Minor |

## See Also

- `sec-owasp-a02-crypto-failures` -- JWT key management is a subset of broader cryptographic failure patterns
- `sec-owasp-a07-authn-failures` -- JWT pitfalls directly enable authentication bypass
- `crypto-algorithm-selection` -- algorithm choice for JWT signing overlaps with general crypto algorithm guidance
- `crypto-timing-attacks` -- HMAC comparison in custom JWT verification must use constant-time comparison
- `principle-fail-fast` -- JWT verification should reject tokens on any validation failure, not fall through to insecure defaults
- `principle-encapsulation` -- JWT creation and verification logic should be centralized, not scattered across handlers

## Authoritative References

- [RFC 7519 - JSON Web Token](https://datatracker.ietf.org/doc/html/rfc7519)
- [RFC 7515 - JSON Web Signature](https://datatracker.ietf.org/doc/html/rfc7515)
- [RFC 7516 - JSON Web Encryption](https://datatracker.ietf.org/doc/html/rfc7516)
- [OWASP JWT Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- [CWE-345: Insufficient Verification of Data Authenticity](https://cwe.mitre.org/data/definitions/345.html)
- [CWE-347: Improper Verification of Cryptographic Signature](https://cwe.mitre.org/data/definitions/347.html)
- [CVE-2015-9235 - JWT Algorithm Confusion](https://nvd.nist.gov/vuln/detail/CVE-2015-9235)
- [Critical vulnerabilities in JSON Web Token libraries (Auth0)](https://auth0.com/blog/critical-vulnerabilities-in-json-web-token-libraries/)
