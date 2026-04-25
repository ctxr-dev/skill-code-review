---
id: sec-owasp-a07-authn-failures
type: primary
depth_role: leaf
focus: Detect weak authentication mechanisms, insecure session management, and credential handling flaws
parents:
  - index.md
covers:
  - Weak password policy enforcement allowing trivial passwords
  - Session tokens exposed in URLs or query parameters
  - Missing session invalidation on logout or password change
  - Session fixation vulnerabilities from reusing pre-authentication session IDs
  - Credentials transmitted over unencrypted HTTP connections
  - Missing multi-factor authentication on sensitive operations
  - JWT accepting none algorithm or missing signature verification
  - JWT without expiry claim or with excessive token lifetime
  - Long-lived tokens without refresh or rotation mechanism
  - Cookies missing Secure, HttpOnly, or SameSite attributes
  - Credential stuffing not mitigated by rate limiting on login endpoints
  - Plaintext password storage or weak hashing algorithms
  - Hardcoded credentials or API keys in source code
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
activation:
  file_globs:
    - "**/auth/**"
    - "**/login/**"
    - "**/session/**"
    - "**/middleware/auth*"
    - "**/controllers/auth*"
    - "**/routes/auth*"
    - "**/security/**"
    - "**/jwt/**"
    - "**/oauth/**"
  keyword_matches:
    - login
    - auth
    - authenticate
    - session
    - cookie
    - token
    - JWT
    - password
    - credential
    - signup
    - register
    - logout
    - MFA
    - 2FA
    - OTP
    - remember
    - session_id
    - Set-Cookie
  structural_signals:
    - authentication_handler
    - session_management
    - cookie_configuration
    - jwt_creation
    - jwt_verification
    - password_validation
    - login_endpoint
source:
  origin: file
  path: sec-owasp-a07-authn-failures.md
  hash: "sha256:b497558873263446a0b585e8d1e03964eabcc02dd086394542a4684fea8bf292"
---
# Identification and Authentication Failures (OWASP A07:2021)

## When This Activates

Activates when the diff touches authentication code, session management, JWT handling, cookie configuration, login/signup endpoints, password validation, or credential storage. Also activates on keywords like `login`, `auth`, `session`, `cookie`, `token`, `JWT`, `password`, `MFA`, `Set-Cookie`. This reviewer detects broken authentication mechanisms (CWE-287), session fixation (CWE-384), insufficient session expiration (CWE-613), missing Secure flag on cookies (CWE-614), missing HttpOnly flag (CWE-1004), and missing MFA on critical operations (CWE-308).

## Audit Surface

- [ ] Password validation accepting fewer than 8 characters or no complexity requirements
- [ ] Session token appended to URL as query parameter or path segment
- [ ] Logout handler that does not invalidate the server-side session
- [ ] Password change flow that does not invalidate existing sessions
- [ ] Session ID reused after authentication without regeneration
- [ ] Login endpoint or credential transmission over HTTP (not HTTPS)
- [ ] JWT verification configured to accept alg: none or alg: HS256 when RS256 expected
- [ ] JWT created without exp claim or with expiry exceeding 24 hours
- [ ] Refresh token with no rotation, expiry, or revocation capability
- [ ] Set-Cookie header missing Secure flag
- [ ] Set-Cookie header missing HttpOnly flag
- [ ] Set-Cookie header missing SameSite attribute or set to None without Secure
- [ ] Login endpoint with no rate limiting, CAPTCHA, or account lockout
- [ ] Password stored using MD5, SHA-1, SHA-256, or unsalted hash
- [ ] Hardcoded password, API key, or secret in source code
- [ ] Remember-me token stored as predictable or reversible value
- [ ] Authentication bypass via parameter manipulation or forced browsing
- [ ] MFA implementation allowing code reuse or lacking brute-force protection
- [ ] Password reset token without expiry or single-use enforcement
- [ ] User enumeration through differing login error messages or response timing

## Detailed Checks

### Password Policy and Storage
<!-- activation: keywords=["password", "passwd", "pass_word", "hash", "bcrypt", "scrypt", "argon2", "pbkdf2", "md5", "sha1", "sha256", "salt", "validate", "strength", "policy", "min_length", "minLength"] -->

- [ ] **Weak minimum length**: flag password validation that accepts fewer than 8 characters -- NIST SP 800-63B recommends a minimum of 8 characters with a maximum of at least 64
- [ ] **No complexity beyond length**: flag password policies that rely solely on character-class rules (uppercase + digit + symbol) without checking against breached password lists -- NIST recommends checking against known-compromised passwords
- [ ] **Insecure hash algorithm**: flag password storage using MD5, SHA-1, SHA-256, or any non-password-specific hash -- use bcrypt, scrypt, argon2id, or PBKDF2 with appropriate work factors (CWE-916)
- [ ] **Missing or static salt**: flag password hashing without a per-user random salt or with a hardcoded salt value -- shared salts enable rainbow table attacks
- [ ] **Plaintext password in logs or responses**: flag code that logs, returns in API responses, or stores passwords in plaintext -- passwords must never leave the hashing layer
- [ ] **Password comparison using equality operator**: flag `password == storedHash` or timing-vulnerable comparisons -- use constant-time comparison functions to prevent timing side-channels

### Session Management
<!-- activation: keywords=["session", "session_id", "sessionId", "sid", "cookie", "Set-Cookie", "regenerate", "invalidate", "destroy", "expire", "timeout"] -->

- [ ] **Missing session regeneration after login**: flag authentication flows that do not call session regeneration (e.g., `req.session.regenerate()`, `session_regenerate_id()`) after successful authentication -- allows session fixation (CWE-384)
- [ ] **Session not invalidated on logout**: flag logout handlers that clear the client cookie but do not destroy the server-side session store entry -- the old session ID remains valid
- [ ] **Session not invalidated on password change**: flag password change flows that do not invalidate all other active sessions for the user -- compromised sessions persist after credential rotation
- [ ] **Session token in URL**: flag session IDs passed as query parameters (`?sid=`, `?token=`, `?session_id=`) -- URLs are logged in browser history, proxy logs, and Referer headers (CWE-598)
- [ ] **Excessive session lifetime**: flag session configurations with timeout exceeding 30 minutes of inactivity or absolute lifetime exceeding 12 hours without re-authentication -- long-lived sessions increase the window of compromise (CWE-613)
- [ ] **Missing session binding**: flag sessions that are not bound to client attributes (IP range, user-agent fingerprint) -- stolen session tokens can be replayed from any client

### Cookie Security Flags
<!-- activation: keywords=["cookie", "Set-Cookie", "Secure", "HttpOnly", "SameSite", "setCookie", "set_cookie", "cookie_opts", "cookieOptions", "session.cookie"] -->

- [ ] **Missing Secure flag**: flag cookies containing session tokens or authentication data without the `Secure` attribute -- cookie will be transmitted over unencrypted HTTP connections (CWE-614)
- [ ] **Missing HttpOnly flag**: flag authentication cookies without `HttpOnly` -- cookie is accessible to JavaScript, enabling theft via XSS (CWE-1004)
- [ ] **Missing or misconfigured SameSite**: flag authentication cookies without `SameSite` attribute or with `SameSite=None` without the `Secure` flag -- enables CSRF attacks via cross-site requests
- [ ] **Cookie domain set too broadly**: flag cookies with domain set to a parent domain (e.g., `.example.com` when the app runs on `app.example.com`) -- sibling subdomains can read the cookie
- [ ] **Cookie without expiry on sensitive tokens**: flag persistent cookies (those with `Expires` or `Max-Age`) for session tokens -- session cookies should expire when the browser closes unless remember-me is explicitly chosen

### JWT Security
<!-- activation: keywords=["jwt", "JWT", "jsonwebtoken", "jose", "jws", "jwe", "alg", "none", "HS256", "RS256", "exp", "iat", "verify", "sign", "decode", "token", "bearer", "claim"] -->

- [ ] **None algorithm accepted**: flag JWT verification that does not explicitly reject `alg: none` -- attackers can forge tokens by stripping the signature and setting the algorithm to none (CWE-287)
- [ ] **Algorithm confusion**: flag JWT verification that accepts both HMAC (HS256) and RSA (RS256) without explicit algorithm enforcement -- an attacker can sign a token with the public RSA key using HS256 and the verifier will accept it
- [ ] **Missing expiry claim**: flag JWT creation without `exp` (expiration) claim -- tokens without expiry are valid forever if not revoked
- [ ] **Excessive token lifetime**: flag JWTs with `exp` set more than 1 hour in the future for access tokens or more than 30 days for refresh tokens -- long-lived tokens increase compromise window
- [ ] **Secret key too short or hardcoded**: flag HMAC JWT signing keys shorter than 256 bits or hardcoded in source code -- short keys are brute-forceable and hardcoded keys compromise all tokens when leaked
- [ ] **Decoding without verification**: flag use of `jwt.decode()` without verification (e.g., `jwt.decode(token, options={verify: false})` or Python `jwt.decode(token, options={"verify_signature": False})`) -- treats untrusted input as authenticated

### Rate Limiting and Brute-Force Protection
<!-- activation: keywords=["login", "authenticate", "rate", "limit", "throttle", "lockout", "captcha", "brute", "attempt", "retry", "block", "ban", "credential_stuffing"] -->

- [ ] **No rate limiting on login endpoint**: flag login endpoints without rate limiting middleware or logic -- enables credential stuffing and brute-force attacks (CWE-307)
- [ ] **Rate limit by IP only**: flag rate limiting that uses only IP address -- attackers distribute attacks across IPs; also rate-limit by account identifier
- [ ] **No account lockout mechanism**: flag login flows with no lockout or progressive delay after repeated failures -- unlimited attempts allow offline-speed brute-forcing
- [ ] **Missing CAPTCHA after threshold**: flag login flows that never present a CAPTCHA or proof-of-work challenge after repeated failures from the same source
- [ ] **Rate limit response leaks information**: flag rate limit responses that return different messages for valid vs. invalid usernames -- enables user enumeration via rate-limit timing

### Multi-Factor Authentication
<!-- activation: keywords=["MFA", "2FA", "OTP", "TOTP", "HOTP", "authenticator", "sms_code", "verification_code", "two_factor", "multi_factor", "second_factor"] -->

- [ ] **MFA absent on sensitive operations**: flag account settings changes, password resets, and administrative actions that do not require MFA -- high-value operations must require step-up authentication (CWE-308)
- [ ] **OTP code reuse**: flag MFA implementations that accept the same OTP code more than once within its validity window -- enables replay attacks
- [ ] **No brute-force protection on OTP entry**: flag OTP verification endpoints without rate limiting -- 6-digit TOTP codes have only 1 million combinations, brute-forceable without protection
- [ ] **SMS as sole MFA factor**: flag MFA implementations that only support SMS-based codes -- SMS is vulnerable to SIM swapping and interception; offer TOTP or WebAuthn as alternatives
- [ ] **MFA bypass via fallback**: flag MFA flows with insecure fallback options (security questions, email-only recovery) that allow bypassing the second factor entirely

### Credential Exposure and Enumeration
<!-- activation: keywords=["error", "message", "invalid", "incorrect", "not found", "does not exist", "no account", "wrong password", "reset", "forgot", "recovery", "email", "username"] -->

- [ ] **Differential error messages**: flag login responses that distinguish between "user not found" and "wrong password" -- use a generic message like "invalid credentials" to prevent user enumeration (CWE-203)
- [ ] **Timing-based enumeration**: flag login flows where the response time differs measurably between existing and non-existing users (e.g., skipping password hashing for unknown users) -- normalize response times regardless of user existence
- [ ] **Password reset enumeration**: flag password reset endpoints that confirm whether an email exists in the system -- always return "if the account exists, a reset link was sent"
- [ ] **Credentials in URL or GET parameters**: flag login forms using GET method or password reset tokens in query strings longer than necessary -- credentials in URLs are logged by proxies and browsers

## Common False Positives

- **Internal admin tools behind VPN**: authentication requirements may be intentionally relaxed for internal-only tools behind network controls. Verify the tool is truly not exposed to the internet before accepting.
- **Machine-to-machine tokens with long lifetime**: service accounts and API tokens between internal services may use longer-lived credentials by design. Flag only when these tokens have no rotation or revocation mechanism.
- **Password policies in test or seed code**: test fixtures and seed data often use simple passwords. These are acceptable only in test code, never in production configuration.
- **JWT decode for claims inspection**: calling `jwt.decode()` without verification is acceptable when the caller only needs to read claims (e.g., extracting `sub` for logging) and does not use the claims for authorization. Verify the decoded claims are not used for access control decisions.
- **SameSite=None for legitimate cross-origin flows**: OAuth callbacks, payment redirects, and embedded iframes may require `SameSite=None` with `Secure`. Verify the cross-origin use case is legitimate.

## Severity Guidance

| Finding | Severity |
|---|---|
| JWT accepting alg: none or algorithm confusion vulnerability | Critical |
| Plaintext password storage or reversible encryption for passwords | Critical |
| Hardcoded credentials or API keys in source code | Critical |
| Session fixation: no regeneration after authentication | Critical |
| Login endpoint without any rate limiting or brute-force protection | Critical |
| Authentication cookie missing Secure flag (transmitted over HTTP) | Important |
| Authentication cookie missing HttpOnly flag (accessible via XSS) | Important |
| Session not invalidated on logout or password change | Important |
| JWT without expiry claim | Important |
| Password hashing with non-password-specific algorithm (SHA-256, MD5) | Important |
| MFA absent on sensitive operations (password change, admin actions) | Important |
| User enumeration via differential error messages | Important |
| SameSite attribute missing on authentication cookies | Minor |
| Session timeout exceeding recommended threshold with compensating controls | Minor |
| Password policy minimum length at 8 (acceptable but consider 12+) | Minor |
| OTP validity window longer than standard but under 5 minutes | Minor |

## See Also

- `sec-owasp-a01-broken-access-control` -- authentication failures often cascade into access control bypasses
- `sec-owasp-a05-misconfiguration` -- cookie flags and session configuration are security configuration concerns
- `sec-owasp-a09-logging-monitoring-failures` -- authentication events must be logged for breach detection
- `principle-fail-fast` -- authentication checks must fail fast and deny access on any error
- `principle-encapsulation` -- session and credential management should be encapsulated in dedicated modules

## Authoritative References

- [OWASP Top 10:2021 -- A07 Identification and Authentication Failures](https://owasp.org/Top10/A07_2021-Identification_and_Authentication_Failures/)
- [CWE-287: Improper Authentication](https://cwe.mitre.org/data/definitions/287.html)
- [CWE-384: Session Fixation](https://cwe.mitre.org/data/definitions/384.html)
- [CWE-613: Insufficient Session Expiration](https://cwe.mitre.org/data/definitions/613.html)
- [CWE-614: Sensitive Cookie in HTTPS Session Without 'Secure' Attribute](https://cwe.mitre.org/data/definitions/614.html)
- [CWE-1004: Sensitive Cookie Without 'HttpOnly' Flag](https://cwe.mitre.org/data/definitions/1004.html)
- [CWE-308: Use of Single-factor Authentication](https://cwe.mitre.org/data/definitions/308.html)
- [NIST SP 800-63B: Digital Identity Guidelines -- Authentication and Lifecycle Management](https://pages.nist.gov/800-63-3/sp800-63b.html)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [RFC 7519: JSON Web Token (JWT)](https://datatracker.ietf.org/doc/html/rfc7519)
