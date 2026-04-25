---
id: user-injection
type: index
depth_role: subcategory
depth: 1
focus: "404 and error pages interpolating the requested path without encoding; API responses containing user content served with text/html content type; Angular [innerHTML] binding without DomSanitizer; Array parameter injection (param[]=a&param[]=b) exploiting type confusion"
parents:
  - "../index.md"
shared_covers: []
entries:
  - id: fe-csp-sri
    file: fe-csp-sri.md
    type: primary
    focus: Detect missing or misconfigured Content-Security-Policy headers and missing Subresource Integrity hashes that leave applications vulnerable to XSS, script injection, and CDN compromise.
    tags:
      - csp
      - sri
      - content-security-policy
      - subresource-integrity
      - xss-prevention
      - security
      - frontend
      - clickjacking
      - security-headers
      - hsts
      - x-frame-options
      - CWE-1021
      - CWE-693
      - CWE-16
  - id: fw-htmx
    file: fw-htmx.md
    type: primary
    focus: Detect htmx-specific pitfalls in user-controlled URLs, HTML fragment XSS, missing CSRF tokens, unsafe swap modes, missing confirmation on destructive actions, URL manipulation via hx-push-url, server endpoint design, and polling without rate limits.
    tags:
      - htmx
      - hypermedia
      - html
      - xss
      - csrf
      - ssrf
      - progressive-enhancement
      - polling
      - fragments
      - server-rendering
      - web-framework
  - id: sec-http-parameter-pollution
    file: sec-http-parameter-pollution.md
    type: primary
    focus: Detect HTTP Parameter Pollution vulnerabilities where duplicate, overloaded, or inconsistently parsed parameters allow attackers to bypass security controls or inject unexpected values.
    tags:
      - hpp
      - parameter-pollution
      - query-string
      - parsing
      - injection
      - CWE-235
  - id: sec-open-redirect
    file: sec-open-redirect.md
    type: primary
    focus: Detect Open Redirect vulnerabilities where user-controlled input determines the target of HTTP redirects without validation against an allowlist.
    tags:
      - open-redirect
      - redirect
      - url-validation
      - phishing
      - CWE-601
  - id: sec-owasp-a03-injection
    file: sec-owasp-a03-injection.md
    type: primary
    focus: Detect injection vulnerabilities where untrusted input is concatenated into queries, commands, templates, or interpreters without proper sanitization or parameterization
    tags:
      - owasp
      - injection
      - SQL-injection
      - command-injection
      - NoSQL-injection
      - LDAP-injection
      - template-injection
      - XSS
      - XXE
      - code-injection
      - CWE-89
      - CWE-78
      - CWE-90
      - CWE-943
      - CWE-1336
      - CWE-917
      - ssti
      - server-side
      - sandbox-escape
      - CWE-94
  - id: sec-owasp-a10-ssrf
    file: sec-owasp-a10-ssrf.md
    type: primary
    focus: Detect server-side request forgery via user-controlled URLs passed to HTTP clients without validation or allowlisting
    tags:
      - owasp
      - a10
      - ssrf
      - url
      - fetch
      - request
      - redirect
      - metadata
      - dns-rebinding
      - allowlist
      - security
  - id: sec-request-smuggling-and-cache-poisoning
    file: sec-request-smuggling-and-cache-poisoning.md
    type: primary
    focus: Detect HTTP request smuggling vectors and web cache poisoning patterns that exploit inconsistencies between proxies, backends, and caching layers
    tags:
      - request-smuggling
      - cache-poisoning
      - cache-deception
      - HTTP-desync
      - CRLF-injection
      - response-splitting
      - proxy
      - CDN
      - CWE-444
      - CWE-113
      - CWE-525
  - id: sec-xss-dom
    file: sec-xss-dom.md
    type: primary
    focus: Detect DOM-based Cross-Site Scripting where user-controlled data flows into dangerous browser APIs without sanitization.
    tags:
      - xss
      - dom-xss
      - client-side
      - injection
      - browser-security
      - CWE-79
  - id: sec-xss-reflected
    file: sec-xss-reflected.md
    type: primary
    focus: Detect Reflected Cross-Site Scripting where server-side code echoes user-supplied request data in HTTP responses without proper output encoding.
    tags:
      - xss
      - reflected-xss
      - output-encoding
      - injection
      - server-side
      - CWE-79
      - stored-xss
      - persistent-xss
      - sanitization
      - user-content
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# User Injection

**Focus:** 404 and error pages interpolating the requested path without encoding; API responses containing user content served with text/html content type; Angular [innerHTML] binding without DomSanitizer; Array parameter injection (param[]=a&param[]=b) exploiting type confusion

## Children

| File | Type | Focus |
|------|------|-------|
| [fe-csp-sri.md](fe-csp-sri.md) | 📄 primary | Detect missing or misconfigured Content-Security-Policy headers and missing Subresource Integrity hashes that leave applications vulnerable to XSS, script injection, and CDN compromise. |
| [fw-htmx.md](fw-htmx.md) | 📄 primary | Detect htmx-specific pitfalls in user-controlled URLs, HTML fragment XSS, missing CSRF tokens, unsafe swap modes, missing confirmation on destructive actions, URL manipulation via hx-push-url, server endpoint design, and polling without rate limits. |
| [sec-http-parameter-pollution.md](sec-http-parameter-pollution.md) | 📄 primary | Detect HTTP Parameter Pollution vulnerabilities where duplicate, overloaded, or inconsistently parsed parameters allow attackers to bypass security controls or inject unexpected values. |
| [sec-open-redirect.md](sec-open-redirect.md) | 📄 primary | Detect Open Redirect vulnerabilities where user-controlled input determines the target of HTTP redirects without validation against an allowlist. |
| [sec-owasp-a03-injection.md](sec-owasp-a03-injection.md) | 📄 primary | Detect injection vulnerabilities where untrusted input is concatenated into queries, commands, templates, or interpreters without proper sanitization or parameterization |
| [sec-owasp-a10-ssrf.md](sec-owasp-a10-ssrf.md) | 📄 primary | Detect server-side request forgery via user-controlled URLs passed to HTTP clients without validation or allowlisting |
| [sec-request-smuggling-and-cache-poisoning.md](sec-request-smuggling-and-cache-poisoning.md) | 📄 primary | Detect HTTP request smuggling vectors and web cache poisoning patterns that exploit inconsistencies between proxies, backends, and caching layers |
| [sec-xss-dom.md](sec-xss-dom.md) | 📄 primary | Detect DOM-based Cross-Site Scripting where user-controlled data flows into dangerous browser APIs without sanitization. |
| [sec-xss-reflected.md](sec-xss-reflected.md) | 📄 primary | Detect Reflected Cross-Site Scripting where server-side code echoes user-supplied request data in HTTP responses without proper output encoding. |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
