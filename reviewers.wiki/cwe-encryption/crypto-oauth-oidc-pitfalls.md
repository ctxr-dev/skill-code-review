---
id: crypto-oauth-oidc-pitfalls
type: primary
depth_role: leaf
focus: Detect OAuth 2.0 and OpenID Connect security pitfalls including deprecated flows, missing PKCE, and token mishandling
parents:
  - index.md
covers:
  - Implicit grant flow used, exposing tokens in URL fragments and browser history
  - Missing state parameter enabling CSRF attacks on the authorization flow
  - Missing PKCE for public clients enabling authorization code interception
  - Authorization code stored or logged, creating a replay or theft vector
  - Token endpoint accessed over HTTP instead of HTTPS
  - client_secret embedded in frontend or mobile code
  - redirect_uri not strictly validated, enabling open redirect and token theft
  - Refresh tokens issued without rotation, enabling persistent access after theft
  - Access tokens with excessive scope violating principle of least privilege
  - Missing nonce in OIDC authorization requests enabling token replay
  - "ID token not fully validated (signature, issuer, audience, expiry)"
  - Authorization code reuse not prevented
  - Token response not validated for token_type and scope
tags:
  - oauth
  - oidc
  - authentication
  - authorization
  - token
  - CWE-346
  - CWE-352
  - CWE-601
activation:
  file_globs:
    - "**/*oauth*"
    - "**/*oidc*"
    - "**/*openid*"
    - "**/*auth*"
    - "**/*token*"
    - "**/*callback*"
    - "**/*redirect*"
    - "**/*login*"
    - "**/*grant*"
    - "**/*pkce*"
  keyword_matches:
    - OAuth
    - oauth
    - OIDC
    - openid
    - authorize
    - token
    - grant
    - implicit
    - code
    - PKCE
    - state
    - nonce
    - redirect_uri
    - client_id
    - client_secret
    - scope
    - refresh_token
    - access_token
    - id_token
    - bearer
  structural_signals:
    - Import of OAuth or OIDC library
    - Authorization URL construction
    - Token exchange or refresh logic
    - Redirect URI handling in callback route
    - OAuth middleware configuration
source:
  origin: file
  path: crypto-oauth-oidc-pitfalls.md
  hash: "sha256:ad8f245c28d49e8e259c97ca10030510b0d373ae3aea5ddf84ef2d56f305f351"
---
# OAuth 2.0 / OpenID Connect Security Pitfalls

## When This Activates

Activates when diffs touch OAuth 2.0 authorization flows, OpenID Connect configuration, token handling, or redirect URI processing. OAuth/OIDC is the dominant delegation and identity protocol suite for web and mobile applications. The protocol's flexibility means there are many ways to implement it insecurely -- deprecated flows, missing security parameters, and improper token handling are common sources of authentication bypass and account takeover.

**Primary CWEs**: CWE-346 (Origin Validation Error), CWE-352 (Cross-Site Request Forgery), CWE-601 (URL Redirection to Untrusted Site).

## Audit Surface

- [ ] Implicit grant (response_type=token) used instead of authorization code + PKCE
- [ ] Authorization request missing state parameter or state not validated on callback
- [ ] Public client (SPA, mobile) not using PKCE (code_challenge / code_verifier)
- [ ] Authorization code written to logs, stored in database, or visible in URL history
- [ ] Token endpoint URL uses http:// instead of https://
- [ ] client_secret present in JavaScript bundle, mobile binary, or frontend configuration
- [ ] redirect_uri validation uses prefix matching, substring matching, or allows wildcards
- [ ] Refresh tokens reused indefinitely without rotation or expiry
- [ ] Access token scope broader than required for the specific operation
- [ ] OIDC authorization request missing nonce parameter
- [ ] ID token signature not verified against issuer JWKS
- [ ] ID token iss, aud, or exp claims not validated
- [ ] Authorization code accepted more than once (replay)
- [ ] Token stored in localStorage or URL query parameters
- [ ] CORS policy on token endpoint too permissive
- [ ] Redirect URI registered with localhost or HTTP scheme in production
- [ ] Missing at_hash validation when ID token delivered alongside access token
- [ ] Device code flow with insufficient polling interval enforcement

## Detailed Checks

### Deprecated and Insecure Grant Types (CWE-346)
<!-- activation: keywords=["implicit", "response_type=token", "grant_type", "password", "resource_owner"] -->

- [ ] **Implicit grant flow**: flag `response_type=token` or `response_type=id_token token` in authorization requests. The implicit flow delivers tokens in the URL fragment, which is exposed in browser history, referrer headers, and proxy logs. It provides no mechanism for client authentication or sender-constraining tokens. Use authorization code flow with PKCE instead (OAuth 2.1 removes implicit grant entirely)
- [ ] **Resource Owner Password Credentials (ROPC)**: flag `grant_type=password` usage. ROPC requires the client to handle user credentials directly, breaking the delegation model that makes OAuth secure. It is incompatible with MFA and is removed in OAuth 2.1
- [ ] **Authorization code flow without PKCE for public clients**: flag SPAs, mobile apps, or desktop apps using the authorization code flow without PKCE (`code_challenge` and `code_verifier`). Without PKCE, an attacker who intercepts the authorization code (via malicious app on the same device, open redirect, or referrer leakage) can exchange it for tokens. RFC 7636 PKCE is now required for all public clients and recommended for confidential clients

### State and CSRF Protection (CWE-352)
<!-- activation: keywords=["state", "csrf", "callback", "redirect", "authorize", "code"] -->

- [ ] **Missing state parameter**: flag authorization requests that do not include a `state` parameter. The state parameter prevents CSRF attacks where an attacker tricks the victim into completing an OAuth flow that links the attacker's account. The state must be a cryptographically random value bound to the user's session
- [ ] **State not validated on callback**: flag callback/redirect handlers that do not compare the returned `state` parameter against the value stored in the user's session before the authorization request. Generating state but not validating it provides no protection
- [ ] **State stored in localStorage**: flag implementations that store the state parameter in localStorage instead of a session cookie or server-side session. localStorage state survives across tabs and is vulnerable to XSS-based extraction before the legitimate callback

### Redirect URI Validation (CWE-601)
<!-- activation: keywords=["redirect_uri", "redirect", "callback", "register", "allowlist", "whitelist", "url", "origin"] -->

- [ ] **Loose redirect_uri matching**: flag authorization server code that validates redirect_uri using prefix matching (`startsWith`), substring matching (`includes`/`contains`), regex without anchoring, or domain-only matching without path. An attacker can register `https://legitimate.com/callback/../attacker` or `https://legitimate.com.attacker.com` to steal authorization codes. Redirect URIs must be compared using exact string matching per RFC 6749 Section 3.1.2.3
- [ ] **Wildcard redirect URIs**: flag redirect_uri registrations containing wildcards (`*`) in any position. Wildcard redirects allow the attacker to redirect tokens to any path on the domain, increasing the chance of finding an open redirect or JavaScript-accessible endpoint
- [ ] **HTTP redirect URIs in production**: flag redirect URIs using `http://` (except `http://localhost` for development). Authorization codes and tokens in the redirect URL can be intercepted over unencrypted connections
- [ ] **Open redirect on the redirect URI path**: flag redirect URI endpoints that themselves perform further redirects based on user-controlled parameters. Even with exact redirect_uri matching, if the endpoint at that URI has an open redirect, the token can be forwarded to an attacker

### Token Handling and Storage (CWE-522)
<!-- activation: keywords=["access_token", "refresh_token", "token", "store", "localStorage", "cookie", "header", "Bearer", "interceptor"] -->

- [ ] **Tokens in localStorage**: flag access tokens or refresh tokens stored in `localStorage` or `sessionStorage`. Use httpOnly, Secure, SameSite cookies or a Backend-for-Frontend (BFF) pattern that keeps tokens server-side
- [ ] **Tokens in URL parameters**: flag access tokens passed as URL query parameters (`?access_token=...`). URLs are logged by servers, proxies, and browsers. Use the Authorization header with Bearer scheme instead
- [ ] **Refresh token without rotation**: flag refresh token implementations that accept the same refresh token indefinitely. Per OAuth 2.1 and Security BCP, refresh tokens for public clients must be sender-constrained or rotated on every use. When a rotated refresh token is reused, all tokens in the grant should be revoked (replay detection)
- [ ] **No refresh token expiry**: flag refresh tokens with no absolute expiry. Even with rotation, refresh tokens should have a maximum lifetime (e.g., 30 days) after which re-authentication is required

### Client Secret Management (CWE-798)
<!-- activation: keywords=["client_secret", "client_id", "confidential", "public", "frontend", "spa", "mobile", "native"] -->

- [ ] **client_secret in frontend code**: flag `client_secret` values in JavaScript bundles, React/Angular/Vue source files, mobile app source code, or any code that ships to untrusted clients. Public clients cannot keep secrets -- use PKCE with no client_secret, or use a BFF (Backend-for-Frontend) pattern where the confidential client lives server-side
- [ ] **client_secret in version control**: flag client_secret values committed to source code repositories, even in configuration files or .env files. Secrets should be injected from a secrets manager at deployment time
- [ ] **client_secret in URL query parameter**: flag client authentication via query parameter (`?client_secret=...`) instead of HTTP Basic authentication header or request body. Query parameters appear in server logs and proxy logs

### OIDC ID Token Validation (CWE-345)
<!-- activation: keywords=["id_token", "openid", "oidc", "nonce", "at_hash", "claims", "userinfo", "jwks", "discovery"] -->

- [ ] **ID token signature not verified**: flag code that parses the ID token payload without verifying the signature against the issuer's JWKS. An unverified ID token can be forged by any party
- [ ] **Missing claim validation**: flag ID token processing that does not validate `iss` (must match the issuer URL), `aud` (must contain the client_id), `exp` (must not be expired), and `iat` (must be reasonably recent). All four checks are required by the OIDC specification
- [ ] **Missing nonce validation**: flag OIDC authorization requests that do not include a `nonce` parameter, or callback handlers that do not validate the nonce claim in the returned ID token against the session-stored value. The nonce prevents ID token replay attacks
- [ ] **Missing at_hash validation**: flag flows where the ID token is returned alongside an access token (hybrid flow) but the `at_hash` claim is not validated. The at_hash binds the ID token to the specific access token, preventing token substitution

### Scope and Consent Management
<!-- activation: keywords=["scope", "permission", "consent", "least_privilege", "offline_access", "admin"] -->

- [ ] **Excessive scope requests**: flag authorization requests that request broader scopes than needed for the operation (e.g., requesting `admin` or `write:*` when only `read:profile` is needed). Excessive scope increases the blast radius if the token is stolen
- [ ] **offline_access without justification**: flag requests for the `offline_access` scope (which grants refresh tokens) when the application does not need to access resources while the user is offline. Refresh tokens are high-value targets
- [ ] **Scope not validated on resource server**: flag resource servers (APIs) that check only that a valid token is present but do not verify that the token's scope includes the permission required for the specific endpoint. Token validity alone is insufficient -- scope enforcement is mandatory

## Common False Positives

- **Implicit grant in legacy documentation or comments**: references to the implicit flow in documentation, migration guides, or comments explaining why it was replaced are not vulnerabilities. Only flag actual implementation code.
- **PKCE in confidential clients**: while PKCE is recommended for confidential clients too, its absence in a server-side confidential client (with a properly protected client_secret) is lower risk than in a public client. Do not flag as Critical.
- **client_secret in server-side environment variables**: a client_secret loaded from an environment variable on a backend server is acceptable (though a secrets manager is preferred). Only flag client_secrets that reach client-side code.
- **Test OAuth configurations**: test files may contain test client_ids and client_secrets pointing to development identity providers. Valid when clearly scoped to tests and the credentials cannot access production resources.
- **localhost redirect URIs in development configuration**: `http://localhost:*` redirect URIs in development-only configuration files are standard OAuth development practice. Flag only when present in production configuration.

## Severity Guidance

| Finding | Severity |
|---|---|
| client_secret exposed in frontend/mobile code | Critical |
| Redirect URI validated with prefix/substring matching (open redirect to token theft) | Critical |
| Authorization code accepted multiple times without invalidation | Critical |
| ID token signature not verified | Critical |
| Implicit grant used in new implementation | Important |
| Missing state parameter or state not validated on callback | Important |
| Missing PKCE for public client (SPA, mobile) | Important |
| Refresh token not rotated on use for public clients | Important |
| ID token iss/aud/exp claims not validated | Important |
| Access or refresh token stored in localStorage | Important |
| Token endpoint accessed over HTTP | Important |
| Missing nonce in OIDC authorization request | Important |
| Authorization code written to logs | Important |
| Excessive scope requested beyond operational need | Minor |
| Missing at_hash validation in hybrid flow | Minor |
| PKCE not used for confidential client (recommended but not critical) | Minor |

## See Also

- `sec-owasp-a07-authn-failures` -- OAuth/OIDC pitfalls are a primary cause of authentication failures
- `sec-owasp-a05-misconfiguration` -- redirect URI validation and token endpoint configuration are misconfiguration concerns
- `crypto-jwt-pitfalls` -- ID tokens and access tokens are typically JWTs; all JWT pitfalls apply
- `sec-csrf` -- missing state parameter is a CSRF vulnerability specific to OAuth flows
- `sec-open-redirect` -- redirect_uri validation failures are a specific class of open redirect
- `principle-fail-fast` -- OAuth flows should reject invalid state, missing PKCE, or bad redirect_uri immediately

## Authoritative References

- [RFC 6749 - The OAuth 2.0 Authorization Framework](https://datatracker.ietf.org/doc/html/rfc6749)
- [RFC 7636 - Proof Key for Code Exchange (PKCE)](https://datatracker.ietf.org/doc/html/rfc7636)
- [OAuth 2.0 Security Best Current Practice (RFC 9700)](https://datatracker.ietf.org/doc/html/rfc9700)
- [OAuth 2.1 Draft](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-12)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
- [OWASP OAuth Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/OAuth_Cheat_Sheet.html)
- [CWE-346: Origin Validation Error](https://cwe.mitre.org/data/definitions/346.html)
- [CWE-352: Cross-Site Request Forgery](https://cwe.mitre.org/data/definitions/352.html)
- [CWE-601: URL Redirection to Untrusted Site](https://cwe.mitre.org/data/definitions/601.html)
