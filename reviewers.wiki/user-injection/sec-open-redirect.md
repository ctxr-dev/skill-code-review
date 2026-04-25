---
id: sec-open-redirect
type: primary
depth_role: leaf
focus: Detect Open Redirect vulnerabilities where user-controlled input determines the target of HTTP redirects without validation against an allowlist.
parents:
  - index.md
covers:
  - Redirect URLs taken from query parameters without validation
  - "Login return URLs (return_to, next, continue) accepted without allowlist check"
  - "OAuth/OIDC redirect_uri not strictly validated against registered URIs"
  - "Protocol-relative URLs (//evil.com) bypassing naive hostname checks"
  - "JavaScript-based redirects (window.location) with user-controlled values"
  - Meta refresh tags with user-supplied URLs
  - HTTP 3xx responses with Location header set from user input
  - URL parsing inconsistencies allowing bypass of redirect validation
  - Server-side forwards dispatching to user-controlled paths
  - URL shortener or proxy endpoints accepting arbitrary destination URLs
  - Subdomain-based bypass where attacker registers evil.example.com
  - "Data URI or javascript: scheme in redirect target"
tags:
  - open-redirect
  - redirect
  - url-validation
  - phishing
  - CWE-601
activation:
  file_globs:
    - "**/*.js"
    - "**/*.ts"
    - "**/*.jsx"
    - "**/*.tsx"
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
    - "**/*.cshtml"
    - "**/middleware*"
    - "**/auth*"
    - "**/login*"
    - "**/oauth*"
  keyword_matches:
    - redirect
    - location
    - Location
    - "301"
    - "302"
    - "303"
    - "307"
    - "308"
    - return_to
    - next
    - continue
    - callback
    - redirect_uri
    - returnUrl
    - goto
    - url
    - forward
    - navigate
    - window.location
    - meta refresh
  structural_signals:
    - Redirect response with user-controlled target URL
    - Login handler with return URL parameter
    - OAuth callback with redirect_uri parameter
source:
  origin: file
  path: sec-open-redirect.md
  hash: "sha256:96f6c83e31f8aeab3ef520cdf99e276c85da056ee235589a27cd63961f837d2b"
---
# Open Redirect (CWE-601)

## When This Activates

Activates when diffs modify redirect logic, login/logout flows, OAuth callback handling, URL routing, or any code that sets the HTTP Location header or JavaScript navigation target from user-supplied input. Open redirects enable phishing by abusing victim trust in the legitimate domain, and they serve as gadgets to bypass SSRF allowlists, steal OAuth tokens, and chain with other vulnerabilities.

## Audit Surface

- [ ] HTTP redirect (301/302/303/307/308) with Location header derived from request parameter
- [ ] Login handler reading return_to, next, continue, or callback from query string
- [ ] OAuth authorization endpoint accepting redirect_uri without strict registered-URI comparison
- [ ] Express res.redirect(), Django redirect(), Rails redirect_to using user-supplied URL
- [ ] window.location, window.location.href, or window.location.replace set from URL parameter
- [ ] Meta refresh tag with content URL sourced from request data
- [ ] URL validation checking only prefix or substring instead of full origin match
- [ ] Protocol-relative URL (//host/path) accepted by redirect handler
- [ ] Redirect target validated client-side but not server-side
- [ ] Server-side forward (RequestDispatcher.forward, Flask send_from_directory) with user path
- [ ] URL parameter named goto, url, forward, navigate, dest, destination, returnUrl, redir, or out
- [ ] Redirect after logout, password reset, or email verification using user-supplied URL
- [ ] Link-shortener or go-link service accepting arbitrary target URLs without access control
- [ ] SAML RelayState parameter used as redirect target without validation
- [ ] Backslash or encoded characters (\\evil.com, %2F%2Fevil.com) bypassing URL parsing

## Detailed Checks

### Redirect Sink Identification
<!-- activation: keywords=["redirect", "res.redirect", "redirect_to", "HttpResponseRedirect", "RedirectResponse", "http.Redirect", "Response.Redirect", "header('Location", "sendRedirect", "301", "302", "307"] -->

- [ ] **Framework redirect functions**: identify all calls to `res.redirect()` (Express), `redirect()` (Django/Flask), `redirect_to` (Rails), `Response.Redirect()` (ASP.NET), `http.Redirect()` (Go), `sendRedirect()` (Java Servlet) -- if the target URL originates from user input, it is an open redirect
- [ ] **Raw Location header**: code that sets `Location` in the response header directly (`response.headers['Location']`, `setHeader("Location", ...)`) with user-controlled values bypasses framework-level safeguards
- [ ] **JavaScript navigation**: `window.location = url`, `window.location.href = url`, `window.location.replace(url)`, `window.location.assign(url)`, `window.open(url)` with URL sourced from `URLSearchParams`, `document.location.search`, or `document.referrer`
- [ ] **Meta refresh redirect**: `<meta http-equiv="refresh" content="0;url=USER_INPUT">` in server-rendered HTML is an open redirect if the URL is not validated
- [ ] **Transitive taint**: track variables assigned from request parameters through transformations -- URL decoding, base64 decoding, and string concatenation propagate taint to redirect targets

### Login and Post-Authentication Redirects
<!-- activation: keywords=["login", "return_to", "next", "continue", "callback", "returnUrl", "redirect_after", "post_login", "signin"] -->

- [ ] **Return URL parameter**: login pages commonly accept `?next=/dashboard` or `?return_to=/profile` to redirect after authentication; an unvalidated parameter allows `?next=https://evil.com` phishing
- [ ] **Default redirect fallback**: verify that when validation rejects the return URL, the code falls back to a safe default (e.g., `/` or `/dashboard`) rather than redirecting to a partially-validated URL
- [ ] **Post-logout redirect**: logout flows that accept a redirect parameter (`?post_logout_redirect_uri=`) face the same open redirect risk
- [ ] **Password reset and email verification**: redirect parameters on password-reset confirmation or email-verification endpoints are often overlooked

### OAuth and SAML Redirect Validation
<!-- activation: keywords=["redirect_uri", "oauth", "oidc", "saml", "RelayState", "state", "authorization", "callback", "code", "token"] -->

- [ ] **Strict redirect_uri matching**: OAuth 2.0 authorization servers must compare `redirect_uri` exactly against registered URIs -- substring or prefix matching allows `https://legit.com.evil.com` or `https://legit.com/callback/../attacker-path`
- [ ] **Dynamic redirect_uri**: OAuth clients that accept `redirect_uri` from user input (instead of using a hardcoded registered URI) enable token theft via open redirect on the client
- [ ] **SAML RelayState**: SAML responses include a RelayState parameter the SP uses as a redirect target after SSO; if not validated, it is an open redirect
- [ ] **State parameter confusion**: OAuth `state` parameter is for CSRF prevention, but some implementations misuse it to carry redirect URLs

### URL Validation Bypass Patterns
<!-- activation: keywords=["url", "parse", "URL", "hostname", "origin", "startsWith", "includes", "indexOf", "match", "regex", "allowlist", "whitelist"] -->

- [ ] **Protocol-relative URLs**: `//evil.com` is interpreted by browsers as `https://evil.com`; validation that only checks for `http://` or `https://` prefix misses this
- [ ] **Backslash confusion**: `https://legit.com\@evil.com` or `/\evil.com` may be parsed differently by the server URL parser and the browser, allowing bypass
- [ ] **URL encoding bypass**: `%2F%2Fevil.com` (double-encoded `//evil.com`), `%00` null bytes, or unicode normalization tricks can bypass naive string checks
- [ ] **Substring matching**: checking `url.includes("example.com")` is defeated by `evil.com?example.com` or `example.com.evil.com`
- [ ] **Prefix matching**: checking `url.startsWith("https://example.com")` is defeated by `https://example.com.evil.com`
- [ ] **Relative path abuse**: `/../../../evil.com` or `/..;/evil.com` may resolve unexpectedly depending on the server framework's path normalization
- [ ] **Data and javascript schemes**: `javascript:alert(1)` or `data:text/html,...` as redirect targets execute code in the user's browser context

### Allowlist Implementation
<!-- activation: keywords=["allowlist", "whitelist", "allowed", "permitted", "valid", "trusted", "domain", "origin", "host"] -->

- [ ] **Origin-based allowlist**: validate the redirect target by parsing the URL and comparing the scheme + host + port against a hardcoded allowlist of permitted origins -- never rely on string matching
- [ ] **Relative-URL-only policy**: the safest approach for login redirects is to accept only relative paths (starting with `/` but not `//`) and reject any absolute URL
- [ ] **Allowlist maintenance**: verify the allowlist does not include wildcard domains, deprecated domains, or domains the organization no longer controls
- [ ] **Cryptographic token approach**: an alternative to allowlists is to sign redirect URLs with an HMAC, ensuring they were generated by the application itself

### Server-Side Request Forwarding
<!-- activation: keywords=["forward", "dispatch", "RequestDispatcher", "send_from_directory", "proxy", "internal", "include"] -->

- [ ] **Forward vs redirect**: server-side forwards (Java `RequestDispatcher.forward()`, internal proxy passes) execute within the server context; user-controlled forward paths can expose internal resources or trigger SSRF
- [ ] **Path traversal in forwards**: forward paths constructed from user input must be validated against a prefix to prevent `../` traversal to sensitive internal endpoints
- [ ] **Internal proxy endpoints**: reverse proxy or API gateway routes that forward requests to user-specified backends are SSRF vectors if not constrained to an allowlist

## Common False Positives

- **Hardcoded redirect targets**: `redirect("/dashboard")` or `redirect_to root_path` with no user input is safe -- the target is a compile-time constant.
- **Relative-path-only redirects with proper validation**: code that explicitly rejects URLs starting with `//`, containing `://`, or not starting with `/` is likely safe against open redirect.
- **OAuth redirect_uri validated against registered URIs**: if the authorization server performs exact-match comparison against a database of registered redirect URIs, this is the correct OAuth 2.0 behavior, not a vulnerability.
- **Framework-provided safe redirect helpers**: Django's `url_has_allowed_host_and_scheme()`, Rails `url_for` with controller/action (not raw URL), and ASP.NET `Url.IsLocalUrl()` provide validated redirects when used correctly.
- **Internal microservice redirects**: redirects between internal services behind a load balancer where the target is derived from service discovery (not user input) are not open redirects.

## Severity Guidance

| Finding | Severity |
|---|---|
| Login return URL parameter used as redirect target without any validation | Critical |
| OAuth redirect_uri accepted without strict registered-URI comparison | Critical |
| HTTP Location header set directly from user-controlled query parameter | Critical |
| window.location assigned from URL parameter without origin validation | Important |
| Redirect validation uses substring or prefix matching (bypassable) | Important |
| Post-logout redirect parameter without allowlist validation | Important |
| Protocol-relative URL (//) not rejected by redirect validation | Important |
| SAML RelayState used as redirect target without validation | Important |
| Meta refresh tag with user-supplied URL | Important |
| Server-side forward path constructed from user input without prefix check | Important |
| Redirect falls back to partially-validated URL instead of safe default | Minor |
| Redirect allowlist includes deprecated or unused domains | Minor |

## See Also

- `sec-owasp-a01-broken-access-control` -- open redirects bypass access control by leveraging trusted domain reputation
- `sec-owasp-a10-ssrf` -- open redirects can be chained with SSRF to bypass allowlists
- `sec-xss-reflected` -- open redirect targets echoed in page body create reflected XSS opportunities
- `sec-owasp-a03-injection` -- URL injection into redirect targets is a form of injection
- `sec-owasp-a04-insecure-design` -- missing redirect validation is a design-level security gap
- `sec-csrf` -- open redirect combined with OAuth can steal authorization codes, similar impact to CSRF
- `principle-fail-fast` -- reject invalid redirect targets early before processing the request

## Authoritative References

- [CWE-601: URL Redirection to Untrusted Site (Open Redirect)](https://cwe.mitre.org/data/definitions/601.html)
- [OWASP Unvalidated Redirects and Forwards Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html)
- [OWASP Testing Guide - Open Redirect](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/11-Client-side_Testing/04-Testing_for_Client-side_URL_Redirect)
- [PortSwigger - Open Redirect](https://portswigger.net/kb/issues/00500100_open-redirection-reflected)
- [OAuth 2.0 Security Best Current Practice - Redirect URI Validation](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics#section-4.1)
