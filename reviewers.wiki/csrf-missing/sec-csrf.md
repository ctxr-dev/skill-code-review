---
id: sec-csrf
type: primary
depth_role: leaf
focus: Detect Cross-Site Request Forgery vulnerabilities where state-changing requests lack proper anti-CSRF protections.
parents:
  - index.md
covers:
  - "State-changing endpoints accepting GET requests instead of POST/PUT/DELETE"
  - HTML forms missing CSRF tokens
  - AJAX requests without anti-CSRF headers or tokens
  - SameSite cookie attribute missing or set to None without justification
  - CORS configuration allowing credentials with broad or wildcard origins
  - CSRF token present in form but not validated server-side
  - APIs relying solely on cookies for authentication without additional CSRF protection
  - Missing Origin or Referer header validation on state-changing endpoints
  - "CSRF token leaked in URL (query string or Referer header)"
  - Token-per-session without rotation allowing session fixation CSRF
  - "Subresource requests (img, script src) triggering state changes"
  - Double-submit cookie pattern without proper binding to session
tags:
  - csrf
  - cross-site-request-forgery
  - session-security
  - cookies
  - authentication
  - CWE-352
activation:
  file_globs:
    - "**/*.js"
    - "**/*.ts"
    - "**/*.py"
    - "**/*.rb"
    - "**/*.php"
    - "**/*.java"
    - "**/*.go"
    - "**/*.cs"
    - "**/*.html"
    - "**/*.erb"
    - "**/*.ejs"
    - "**/*.hbs"
    - "**/*.jinja"
    - "**/*.jinja2"
    - "**/*.cshtml"
    - "**/middleware*"
    - "**/security*"
  keyword_matches:
    - csrf
    - CSRF
    - token
    - form
    - POST
    - PUT
    - DELETE
    - PATCH
    - cookie
    - session
    - SameSite
    - Origin
    - Referer
    - X-CSRF
    - X-XSRF
    - _token
    - authenticity_token
    - csrfmiddlewaretoken
  structural_signals:
    - State-changing route handler
    - Form template without token field
    - Cookie configuration block
source:
  origin: file
  path: sec-csrf.md
  hash: "sha256:8454087cb535a0c5d5c26bad0ec483d60cf37d7b16870ee3e821619139366aa6"
---
# Cross-Site Request Forgery (CWE-352)

## When This Activates

Activates when diffs modify form handling, route definitions for state-changing endpoints, cookie configuration, CORS settings, authentication middleware, or CSRF middleware configuration. CSRF exploits the browser's automatic inclusion of cookies on cross-origin requests to trick authenticated users into performing unintended actions.

## Audit Surface

- [ ] State-changing operation (create, update, delete) handled by a GET endpoint
- [ ] HTML form with method=POST missing a CSRF token hidden field
- [ ] AJAX call to state-changing endpoint without X-CSRF-Token or X-XSRF-Token header
- [ ] Cookie set without SameSite attribute or with SameSite=None
- [ ] CORS configuration with Access-Control-Allow-Credentials: true and broad Allow-Origin
- [ ] CSRF middleware or filter disabled or bypassed for specific routes
- [ ] Server-side handler not validating the submitted CSRF token against the session token
- [ ] CSRF token transmitted in URL query string (leaks via Referer header)
- [ ] Login endpoint without CSRF protection (login CSRF)
- [ ] API endpoint authenticated solely by session cookie without Bearer token or CSRF header
- [ ] JSON API accepting requests with Content-Type: application/x-www-form-urlencoded (form-based CSRF)
- [ ] Logout or session-management endpoint missing CSRF protection
- [ ] Webhook or callback endpoint that also serves authenticated user requests
- [ ] File upload endpoint missing CSRF token validation
- [ ] Double-submit cookie CSRF token not cryptographically bound to session ID
- [ ] CSRF token not regenerated after login (fixation)
- [ ] Multi-step form or wizard losing CSRF token between steps
- [ ] Custom CSRF implementation instead of framework-provided middleware

## Detailed Checks

### State-Changing GET Endpoints
<!-- activation: keywords=["GET", "get", "app.get", "router.get", "@GetMapping", "@app.route", "get_", "HttpGet"] -->

- [ ] **GET for side effects**: any GET endpoint that creates, updates, or deletes data is a CSRF vector -- browsers pre-fetch GET URLs, `<img src>` tags trigger them, and links can be embedded anywhere
- [ ] **Idempotency check**: GET handlers should be idempotent and side-effect-free; state changes belong in POST, PUT, PATCH, or DELETE handlers
- [ ] **Link-based actions**: "Delete", "Approve", "Cancel" actions implemented as GET links are trivially exploitable; verify they require POST with a CSRF token
- [ ] **GraphQL via GET**: GraphQL endpoints accepting mutations via GET query parameters are vulnerable; restrict mutations to POST only

### CSRF Token Presence and Validation
<!-- activation: keywords=["csrf", "token", "_token", "authenticity_token", "csrfmiddlewaretoken", "X-CSRF", "X-XSRF", "__RequestVerificationToken"] -->

- [ ] **Token in every form**: verify every HTML form that submits to a state-changing endpoint includes a CSRF token hidden field (Django `{% csrf_token %}`, Rails `authenticity_token`, Laravel `@csrf`, ASP.NET `@Html.AntiForgeryToken()`)
- [ ] **Server-side validation**: the presence of a token field is insufficient; verify the server-side handler validates the token (Django middleware, Rails `protect_from_forgery`, Express `csurf`, Spring `CsrfFilter`)
- [ ] **CSRF middleware bypass**: check for routes or route groups that explicitly disable CSRF middleware (`@csrf_exempt` in Django, `VerifyCsrfToken::$except` in Laravel, `csrf: false` in Express)
- [ ] **AJAX token inclusion**: AJAX libraries (axios, fetch) must include the CSRF token in a header (X-CSRF-Token, X-XSRF-Token) or body for every state-changing request
- [ ] **Token-per-request vs token-per-session**: token-per-session is acceptable but must be rotated on login; token-per-request provides better protection but requires careful SPA handling
- [ ] **Token leakage**: CSRF tokens must not appear in URLs (query strings), as they leak via the Referer header to third-party resources loaded on the page

### Cookie Configuration
<!-- activation: keywords=["cookie", "SameSite", "Set-Cookie", "session", "Secure", "HttpOnly", "Domain", "Path"] -->

- [ ] **SameSite attribute**: session cookies should set `SameSite=Lax` (default in modern browsers) or `SameSite=Strict`; `SameSite=None` requires `Secure` and should only be used when cross-site access is genuinely needed
- [ ] **SameSite=None audit**: every cookie with `SameSite=None` must have an explicit justification (cross-origin iframe embedding, federated login); flag any session cookie with `SameSite=None` without clear rationale
- [ ] **Secure flag**: cookies with `Secure` are only sent over HTTPS, preventing MITM CSRF on downgraded connections; session cookies must have `Secure=true` in production
- [ ] **HttpOnly flag**: while not a CSRF defense directly, `HttpOnly` prevents JavaScript access to session cookies, limiting XSS-to-CSRF escalation
- [ ] **Cookie scope**: overly broad `Domain` or `Path` on session cookies exposes them to sibling subdomains that may have weaker security

### CORS and Origin Validation
<!-- activation: keywords=["CORS", "Access-Control", "Origin", "Referer", "Allow-Origin", "Allow-Credentials", "cors(", "corsOptions"] -->

- [ ] **Credentials with wildcard origin**: `Access-Control-Allow-Credentials: true` combined with `Access-Control-Allow-Origin: *` is rejected by browsers, but some misconfigured servers reflect the request Origin header -- verify the origin is validated against an allowlist
- [ ] **Origin reflection**: servers that echo back the `Origin` request header as `Access-Control-Allow-Origin` without validation allow any origin to make credentialed requests
- [ ] **Null origin**: `Access-Control-Allow-Origin: null` is exploitable via sandboxed iframes; do not allow the null origin with credentials
- [ ] **Origin/Referer header validation**: for APIs not using CSRF tokens, verify the server checks the `Origin` or `Referer` header against expected values and rejects requests with missing or unexpected origins
- [ ] **Preflight bypass**: simple requests (GET, POST with form content types) do not trigger CORS preflight; a JSON API must reject non-JSON Content-Types to prevent form-based CSRF

### Login and Session Management CSRF
<!-- activation: keywords=["login", "logout", "signin", "signout", "authenticate", "session", "password", "register"] -->

- [ ] **Login CSRF**: login forms without CSRF protection allow attackers to log the victim into the attacker's account, potentially capturing sensitive data entered under the attacker's session
- [ ] **Logout CSRF**: while lower severity, CSRF on logout disrupts user experience and can be chained with other attacks
- [ ] **Password change**: password change and email change forms must require the current password AND a CSRF token
- [ ] **Session token rotation**: CSRF token must be regenerated when the session changes (login, privilege escalation) to prevent session fixation CSRF

### API Authentication Patterns
<!-- activation: keywords=["Bearer", "Authorization", "JWT", "API key", "fetch", "axios", "XMLHttpRequest", "api", "endpoint"] -->

- [ ] **Cookie-only API authentication**: APIs that authenticate solely via session cookies without requiring a Bearer token, API key, or CSRF header in the request are vulnerable to CSRF
- [ ] **Custom header defense**: requiring a custom header (X-Requested-With, X-CSRF-Token) on state-changing API requests is an effective CSRF defense because custom headers trigger CORS preflight
- [ ] **Content-Type defense**: JSON APIs should reject requests with `Content-Type: application/x-www-form-urlencoded` or `multipart/form-data` to prevent form-based CSRF; only accept `application/json`
- [ ] **JWT in cookie**: JWTs stored in HttpOnly cookies face the same CSRF risks as session cookies; they still need CSRF token protection or SameSite=Strict

## Common False Positives

- **Bearer token authentication**: APIs that authenticate via `Authorization: Bearer <token>` header (not cookies) are not vulnerable to CSRF because browsers do not automatically include this header on cross-origin requests.
- **API-only services with no cookie auth**: microservices that only accept API keys or service-to-service tokens have no browser-originated session to forge.
- **SameSite=Lax cookies on modern browsers**: `SameSite=Lax` (the default since Chrome 80) prevents CSRF via POST-based cross-site requests. GET-based CSRF remains possible but is lower risk if GET endpoints are side-effect-free.
- **Read-only GET endpoints**: GET endpoints that only return data and have no side effects are not CSRF targets.
- **CORS preflight on non-simple requests**: requests with `Content-Type: application/json` trigger CORS preflight; if the server does not allow the cross-origin, the request is blocked. However, do not rely solely on this if the server also accepts form content types.

## Severity Guidance

| Finding | Severity |
|---|---|
| State-changing GET endpoint (delete, approve, transfer) without CSRF protection | Critical |
| Missing CSRF token on financial transaction or privilege escalation form | Critical |
| CORS allows credentials with reflected or wildcard origin | Critical |
| CSRF middleware disabled for state-changing routes without compensating control | Critical |
| Session cookie missing SameSite attribute (or SameSite=None without justification) | Important |
| CSRF token present in form but not validated server-side | Important |
| Login form missing CSRF protection | Important |
| JSON API accepting form-encoded Content-Type on state-changing endpoints | Important |
| CSRF token in URL query string | Important |
| Logout endpoint missing CSRF protection | Minor |
| CSRF token not rotated after login | Minor |

## See Also

- `sec-xss-dom` -- XSS can be used to steal CSRF tokens, bypassing CSRF protections entirely
- `sec-xss-reflected` -- reflected XSS can deliver CSRF-like attacks without needing a cross-site context
- `sec-clickjacking-and-headers` -- clickjacking is a related UI redress attack; X-Frame-Options prevents iframe-based CSRF variants
- `sec-owasp-a01-broken-access-control` -- CSRF is an access control bypass exploiting ambient authority (cookies)
- `sec-owasp-a07-authn-failures` -- session management weaknesses amplify CSRF impact

## Authoritative References

- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [CWE-352: Cross-Site Request Forgery](https://cwe.mitre.org/data/definitions/352.html)
- [OWASP Testing Guide - CSRF](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/06-Session_Management_Testing/05-Testing_for_Cross_Site_Request_Forgery)
- [PortSwigger - CSRF](https://portswigger.net/web-security/csrf)
- [RFC 6265bis - SameSite Cookies](https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis)
- [Fetch Standard - CORS](https://fetch.spec.whatwg.org/#http-cors-protocol)
