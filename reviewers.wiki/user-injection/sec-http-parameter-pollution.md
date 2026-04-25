---
id: sec-http-parameter-pollution
type: primary
depth_role: leaf
focus: Detect HTTP Parameter Pollution vulnerabilities where duplicate, overloaded, or inconsistently parsed parameters allow attackers to bypass security controls or inject unexpected values.
parents:
  - index.md
covers:
  - Duplicate parameter names handled inconsistently between proxy and backend
  - "Query string parsing differences between layers (first-wins vs last-wins)"
  - "Array parameter injection (param[]=a&param[]=b) exploiting type confusion"
  - Parameter precedence confusion when multiple sources are merged
  - Comma-separated parameter value injection
  - Parameter injection via URL rewriting or path-to-query translation
  - JSON and form parameter merging creating unexpected overrides
  - Query string parameters overriding body parameters or vice versa
  - Framework-specific parameter coercion creating security-relevant type confusion
  - Server-side request construction concatenating user-supplied parameters
tags:
  - hpp
  - parameter-pollution
  - query-string
  - parsing
  - injection
  - CWE-235
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
    - "**/middleware*"
    - "**/proxy*"
    - "**/gateway*"
    - "**/routes/**"
    - "**/controllers/**"
  keyword_matches:
    - param
    - query
    - querystring
    - URLSearchParams
    - parse
    - qs
    - body
    - form
    - multipart
    - merge
    - assign
    - extend
    - spread
    - req.query
    - request.GET
    - params
    - getParameter
    - getParameterValues
  structural_signals:
    - Multiple parameter sources merged into single object
    - Server-side URL construction with user parameters
    - Proxy or gateway forwarding query parameters
source:
  origin: file
  path: sec-http-parameter-pollution.md
  hash: "sha256:0d27768f8edcbc1cf8f1eb88aaa7df040010579aa39d56ebfda7313149ef4d65"
---
# HTTP Parameter Pollution (CWE-235)

## When This Activates

Activates when diffs modify query string parsing, parameter handling, URL construction, request forwarding or proxying logic, middleware that merges parameter sources, or security filters that inspect request parameters. HTTP Parameter Pollution exploits the fact that different components in the request processing chain may handle duplicate or overloaded parameters differently, allowing attackers to bypass validation, inject values, or override security-critical parameters.

## Audit Surface

- [ ] Query string parsed by middleware and re-parsed by application code differently
- [ ] Reverse proxy (nginx, Apache, HAProxy) and backend framework handling duplicate params differently
- [ ] Request handler merging query, body, and path parameters into a single object
- [ ] URL constructed server-side by concatenating user-supplied parameter values
- [ ] Array parameter (param[]=val) accepted where scalar was expected
- [ ] Parameter value split on comma where attacker injects additional values
- [ ] Express req.query, req.body, and req.params merged or checked inconsistently
- [ ] WAF or security filter checking one parameter occurrence while backend uses another
- [ ] OAuth or payment callback URL with user-appended query parameters
- [ ] Redirect URL built by appending query parameters without encoding
- [ ] API gateway transforming request parameters before forwarding to backend
- [ ] GraphQL variables or REST query filters parsed from URL with duplicate keys
- [ ] Form action URL containing hardcoded parameters overridable by form fields
- [ ] getParameter() returning first value while getParameterValues() returns all
- [ ] Object.assign, spread operator, or dict merge combining user params with defaults
- [ ] URL.searchParams or URLSearchParams handling of duplicate keys

## Detailed Checks

### Duplicate Parameter Handling Across Layers
<!-- activation: keywords=["param", "query", "duplicate", "proxy", "gateway", "nginx", "apache", "haproxy", "upstream", "forward"] -->

- [ ] **First-wins vs last-wins**: different technologies resolve duplicate parameters differently -- PHP and Java Servlet use last occurrence, ASP.NET uses first, Express/qs returns an array, Python Flask uses first, Go uses first -- an attacker submitting `role=user&role=admin` may bypass a WAF that checks the first value while the backend uses the last
- [ ] **Proxy-backend mismatch**: if a reverse proxy (nginx, Apache mod_proxy) forwards the raw query string to a backend, and the proxy's parameter inspection logic uses a different precedence than the backend framework, HPP bypass is possible
- [ ] **WAF bypass**: Web Application Firewalls that inspect only the first (or last) occurrence of a parameter can be bypassed by placing the malicious value in the occurrence the WAF does not inspect but the backend processes
- [ ] **Load balancer parameter routing**: some load balancers route based on query parameters; HPP can cause requests to be routed to unintended backends

### Parameter Source Merging
<!-- activation: keywords=["merge", "assign", "extend", "spread", "Object.assign", "_.merge", "_.extend", "dict", "update", "req.query", "req.body", "req.params", "request.GET", "request.POST"] -->

- [ ] **Multi-source merge order**: Express merges `req.params`, `req.query`, and `req.body` separately, but many applications merge them manually (`Object.assign({}, req.query, req.body)`) -- the merge order determines which source wins in case of key collision
- [ ] **Body overriding query**: if an application checks a security parameter (e.g., `action=read`) from the query string but the merge also includes body parameters, an attacker can submit `action=delete` in the POST body to override the query string value
- [ ] **Path parameter collision**: URL path parameters (`:id` in `/users/:id`) may collide with query parameters of the same name; verify the application uses the intended source for each parameter
- [ ] **Prototype pollution via merge**: deep merge utilities (`_.merge`, `_.defaultsDeep`) can introduce prototype pollution when merging user-controlled objects (`__proto__`, `constructor.prototype`) -- while distinct from HPP, it co-occurs in the same code patterns
- [ ] **Default value override**: `Object.assign(defaults, userParams)` lets user parameters override every default including security-relevant ones; prefer `Object.assign({}, defaults, userParams)` with explicit precedence, or better, extract only expected keys

### Server-Side URL Construction
<!-- activation: keywords=["url", "URL", "URLSearchParams", "querystring", "qs.stringify", "urlencode", "http_build_query", "format", "concat", "append", "redirect", "fetch", "request", "axios", "http.get"] -->

- [ ] **Parameter injection via concatenation**: building a URL like `baseUrl + "?token=" + serverToken + "&user=" + userInput` allows an attacker to submit `userInput = "evil&token=stolen"` injecting an extra `token` parameter -- the backend receiving the request may use the attacker's `token` instead of the server's
- [ ] **Use URL builder APIs**: always use structured URL builders (`URLSearchParams.append()`, `urllib.parse.urlencode()`, `http_build_query()`) rather than string concatenation to construct query strings -- these encode special characters (`&`, `=`, `#`) preventing parameter injection
- [ ] **Fragment injection**: user input appended to URLs without encoding may include `#fragment` that truncates the query string in the browser, or `&extra_param=value` that adds parameters
- [ ] **SSRF amplification**: HPP in server-side HTTP requests can modify the target endpoint's behavior; combined with SSRF, it enables bypassing parameter-based access controls on internal services

### Array and Type Coercion Attacks
<!-- activation: keywords=["array", "[]", "param[]", "getParameterValues", "getlist", "getAll", "type", "typeof", "instanceof", "isArray", "parseInt", "Number"] -->

- [ ] **Array injection where scalar expected**: submitting `id[]=1&id[]=2` where the application expects a scalar `id` can cause type errors, bypass length checks, or trigger unexpected code paths (e.g., SQL `IN` clause instead of `=`)
- [ ] **Type confusion in validation**: validation checking `typeof param === 'string'` fails when Express/qs parses `param[]=value` as an array, potentially skipping validation entirely
- [ ] **Numeric coercion**: `param=1e999` may parse as `Infinity`, `param=0x41` as `65`, or `param=` as `0` or `NaN` -- verify that numeric parameters are validated after coercion, not before
- [ ] **Boolean coercion**: `param=true`, `param=1`, `param=yes` may be interpreted differently by different parsing layers; security-relevant boolean parameters must use strict parsing

### Comma-Separated Value Injection
<!-- activation: keywords=["split", "comma", "join", "csv", "separator", "delimiter", ","] -->

- [ ] **Comma-delimited parameters**: APIs that accept comma-separated values (`?fields=name,email`) allow injection if user input is concatenated: `userInput = "name,role,password_hash"` would expose sensitive fields
- [ ] **Header value injection**: HTTP headers that accept comma-separated values (e.g., `X-Forwarded-For`, `Accept`) can be polluted with additional values
- [ ] **SQL or filter injection**: comma-separated column names or sort fields passed to SQL queries or ORM filters without validation can inject additional columns or expressions

### OAuth and Payment Callback Pollution
<!-- activation: keywords=["oauth", "callback", "redirect_uri", "payment", "webhook", "return_url", "success_url", "cancel_url", "notify_url"] -->

- [ ] **Callback URL parameter injection**: if an OAuth `redirect_uri` or payment `return_url` is built by appending parameters (`callback_url + "?code=" + code`), an attacker who controls part of the callback URL can inject `&code=attacker_code` to override the legitimate authorization code
- [ ] **Pre-existing query parameters**: when the callback URL already contains query parameters (`https://app.com/callback?extra=1`), appending `&code=value` with string concatenation instead of proper URL parsing may collide with existing parameters
- [ ] **Payment amount or currency override**: payment gateway integrations that pass amount or currency as URL parameters and build the redirect URL from user input are vulnerable to HPP-based amount manipulation

### Form Action and Hidden Field Overrides
<!-- activation: keywords=["form", "action", "hidden", "input", "submit", "method", "enctype"] -->

- [ ] **Form action URL parameters**: if a form's `action` attribute includes query parameters (`action="/update?type=user"`), form fields with the same name (`<input name="type" value="admin">`) may override the URL parameter depending on the server framework
- [ ] **Hidden field override**: hidden fields used for security (CSRF tokens, record IDs) can be overridden if the attacker can inject additional form fields with the same name via DOM manipulation or HPP in the form action URL

## Common False Positives

- **Intentional array parameters**: APIs designed to accept array parameters (`?tag=python&tag=java` or `?ids[]=1&ids[]=2`) with proper validation and type handling are not HPP vulnerabilities -- verify the code expects and handles arrays correctly.
- **URL construction using proper URL builder APIs**: code using `URLSearchParams.append()`, `urllib.parse.urlencode()`, or `http_build_query()` properly encodes parameter values, preventing injection of additional parameters.
- **Single-layer parameter handling**: applications where a single framework parses parameters once and all code reads from that parsed result have no proxy-backend mismatch risk (though other HPP vectors may still apply).
- **Read-only parameter use**: parameters used only for display or logging (not for authorization, routing, or data modification) have lower HPP impact.
- **Explicit parameter extraction**: code that explicitly extracts named parameters (`const { name, email } = req.body`) rather than passing the entire body object is resistant to mass assignment but may still have HPP issues if the parameter value is polluted.

## Severity Guidance

| Finding | Severity |
|---|---|
| Server-side URL construction by concatenation allowing parameter injection in security-critical request (OAuth, payment) | Critical |
| WAF or security filter bypassable via duplicate parameters with different proxy/backend precedence | Critical |
| Parameter source merge allowing body parameter to override security-critical query parameter | Important |
| Callback URL (OAuth redirect_uri, payment return_url) built with string concatenation from user input | Important |
| Array parameter injection causing type confusion that bypasses validation | Important |
| Form action URL parameters overridable by form field values on security-critical forms | Important |
| Comma-separated parameter injection exposing sensitive fields or columns | Important |
| Duplicate query parameters handled differently by application layers (ambiguous precedence) | Minor |
| Numeric or boolean type coercion causing unexpected but non-security-critical behavior | Minor |
| Hidden form field overridable via HPP with low-impact result | Minor |

## See Also

- `sec-owasp-a03-injection` -- HPP is a parameter injection attack that modifies application behavior
- `sec-owasp-a01-broken-access-control` -- HPP can bypass parameter-based access control checks
- `sec-owasp-a10-ssrf` -- HPP in server-side HTTP requests can modify the request sent to internal services
- `sec-open-redirect` -- HPP in redirect URL construction can inject or override the redirect target
- `sec-csrf` -- HPP can bypass CSRF token validation if the token parameter is duplicated
- `sec-idor-and-mass-assignment` -- parameter merging issues are closely related to mass assignment
- `sec-owasp-a04-insecure-design` -- relying on a single parameter occurrence without defensive parsing is a design weakness

## Authoritative References

- [CWE-235: Improper Handling of Extra Parameters](https://cwe.mitre.org/data/definitions/235.html)
- [OWASP Testing Guide - HTTP Parameter Pollution](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/07-Input_Validation_Testing/04-Testing_for_HTTP_Parameter_Pollution)
- [HTTP Parameter Pollution - Original Research (Balduzzi, Gimenez, Balzarotti, Kirda)](https://owasp.org/www-pdf-archive/AppsecEU09_CarettoniDiPaola_v0.8.pdf)
- [PortSwigger - HTTP Parameter Pollution](https://portswigger.net/web-security/request-smuggling)
- [CAPEC-460: HTTP Parameter Pollution](https://capec.mitre.org/data/definitions/460.html)
