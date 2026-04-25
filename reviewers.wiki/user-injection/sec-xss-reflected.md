---
id: sec-xss-reflected
type: primary
depth_role: leaf
focus: Detect Reflected Cross-Site Scripting where server-side code echoes user-supplied request data in HTTP responses without proper output encoding.
parents:
  - index.md
covers:
  - URL query parameters reflected in HTML page output without encoding
  - Error messages echoing user input verbatim
  - Search results pages displaying the raw query string
  - Redirect URLs echoed in page body or meta-refresh tags
  - HTTP request headers reflected in response body
  - Form values re-displayed on validation error pages without escaping
  - 404 and error pages interpolating the requested path without encoding
  - "JSON responses with user input served as text/html"
  - Server-side frameworks with auto-escaping disabled reflecting request data
  - URL path segments interpolated in HTML responses
  - Debug or diagnostic pages reflecting request parameters
  - User-generated content rendered without output encoding in HTML context
  - Rich text editors outputting raw HTML stored and re-displayed without sanitization
  - Database values interpolated in server-side templates without auto-escaping
  - "File uploads (SVG, HTML, XML) served inline with executable content"
  - User-controlled fields reflected in emails and notification templates
  - Markdown renderers allowing raw HTML passthrough
  - "API responses containing user content served with text/html content type"
  - "User profile fields (display name, bio, description) rendered in other users' views"
  - Comment and messaging systems storing and displaying raw user input
  - CMS and admin panels rendering user-submitted content without escaping
  - Webhook payloads with user content displayed in dashboards
  - Log viewers rendering stored user input as HTML
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
aliases:
  - sec-xss-stored
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
    - "**/*.erb"
    - "**/*.ejs"
    - "**/*.hbs"
    - "**/*.jinja"
    - "**/*.jinja2"
    - "**/*.twig"
    - "**/*.cshtml"
    - "**/*.html"
  keyword_matches:
    - query
    - param
    - search
    - q=
    - redirect
    - error
    - message
    - echo
    - reflect
    - response
    - render
    - request.query
    - request.params
    - req.query
    - request.GET
    - "params["
  structural_signals:
    - Request parameter used in response body
    - Error handler interpolating user input
    - Search query displayed in results page
source:
  origin: file
  path: sec-xss-reflected.md
  hash: "sha256:cef975527eb5cf6fbe91a8e01d8aa017115438831858f440f89dd4edff90f974"
---
# Reflected Cross-Site Scripting (CWE-79)

## When This Activates

Activates when diffs modify server-side request handlers, error pages, search result pages, redirect logic, or any endpoint that includes request-sourced data in the HTTP response body. Reflected XSS requires social engineering (tricking a user into clicking a crafted URL), but it remains widely exploitable through phishing, URL shorteners, and open redirects.

## Audit Surface

- [ ] Server-side template interpolating request.query, request.params, or request.body into HTML response
- [ ] Error page echoing the invalid input value back to the user without encoding
- [ ] Search results page displaying the search query term without escaping
- [ ] Redirect endpoint echoing the target URL in the response body
- [ ] Custom 404/error handler interpolating the requested path in HTML
- [ ] Form validation error page re-rendering submitted field values without escaping
- [ ] Request header (User-Agent, Referer, Accept-Language) reflected in server-generated HTML
- [ ] Controller action concatenating request parameters into an HTML string response
- [ ] JSON error response containing user input served with Content-Type: text/html
- [ ] Logging or debug endpoint reflecting request data in a web-rendered view
- [ ] URL path parameter interpolated in breadcrumb, page title, or heading
- [ ] OAuth callback or SSO handler echoing state/error parameters in the page
- [ ] API documentation or Swagger UI reflecting user-supplied parameter values
- [ ] PDF or report generation including reflected request parameters in HTML intermediate
- [ ] Server-sent event or WebSocket response echoing user-supplied data back as HTML

## Detailed Checks

### Request Parameter to Response Tracing
<!-- activation: keywords=["request.query", "request.params", "req.query", "req.params", "request.GET", "request.POST", "request.args", "params[", "request.form", "HttpServletRequest", "r.URL.Query"] -->

- [ ] **Direct reflection**: identify every code path where a request parameter (query string, path parameter, POST body field, header) is included in the HTTP response body -- each is a potential reflected XSS vector
- [ ] **Framework-specific sources**: Node/Express `req.query`, `req.params`, `req.body`; Django `request.GET`, `request.POST`; Flask `request.args`, `request.form`; Rails `params[]`; Spring `@RequestParam`; Go `r.URL.Query()`; PHP `$_GET`, `$_POST`, `$_REQUEST`
- [ ] **Transitive taint**: track variables assigned from request parameters through transformations -- string concatenation, format strings, and template variable assignment propagate taint
- [ ] **Multi-step reflection**: parameter stored in session or flash message and displayed on the next page load -- still a reflected XSS if the attacker controls the initial request

### Error Page Reflection
<!-- activation: keywords=["error", "exception", "404", "500", "not found", "invalid", "bad request", "message", "flash"] -->

- [ ] **Custom error handlers**: verify custom 404, 400, and 500 error pages do not interpolate the requested URL path or query parameters into the HTML response
- [ ] **Validation error messages**: form validation that says "Invalid value: [user_input]" reflects the input; verify the echoed value is HTML-encoded
- [ ] **Framework default error pages**: development-mode error pages (Django debug, Express default, Spring Boot Whitelabel) often reflect request data; ensure production uses custom error handlers
- [ ] **Flash messages with user content**: flash messages containing user input (e.g., "User [name] not found") must encode the interpolated value
- [ ] **API error responses**: error objects like `{"error": "Unknown field: <user_param>"}` are safe as JSON but dangerous if the endpoint can serve text/html

### Search and Listing Pages
<!-- activation: keywords=["search", "query", "q=", "results", "filter", "sort", "keyword", "term", "find"] -->

- [ ] **Search term display**: "Showing results for: [query]" is the classic reflected XSS pattern; verify the query is HTML-encoded before rendering
- [ ] **Filter and sort parameters**: filter labels, sort column names, and pagination parameters displayed in the page must be encoded
- [ ] **No-results pages**: "No results found for [query]" pages are commonly overlooked; verify encoding on empty-result paths too
- [ ] **Autocomplete and suggestion endpoints**: if the server echoes back the partial query in JSON, verify the consumer client HTML-encodes before rendering

### Redirect URL Reflection
<!-- activation: keywords=["redirect", "return_url", "next", "callback", "continue", "goto", "url=", "redirect_uri", "Location"] -->

- [ ] **Open redirect to XSS**: redirect endpoints that echo the target URL in the page body (e.g., "Redirecting to: [url]") before the meta-refresh or JavaScript redirect allow XSS via `javascript:` URLs
- [ ] **OAuth/SSO callbacks**: OAuth error parameters (`error_description`, `state`) echoed in the callback page without encoding
- [ ] **URL in meta refresh tag**: `<meta http-equiv="refresh" content="0; url=[user_input]">` allows injection if the URL is not validated and encoded
- [ ] **Location header injection**: while not XSS directly, CRLF injection in redirect Location headers can inject response body content

### Output Encoding by Context
<!-- activation: keywords=["encode", "escape", "html", "safe", "raw", "render", "template", "interpolate", "format", "sprintf", "f-string"] -->

- [ ] **HTML body context**: user input in HTML body must be HTML-entity-encoded (`<` to `&lt;`, `>` to `&gt;`, `"` to `&quot;`, `'` to `&#x27;`, `&` to `&amp;`)
- [ ] **HTML attribute context**: user input in attribute values must be attribute-encoded and the attribute must be quoted; unquoted attributes can break out with spaces
- [ ] **JavaScript context**: user input embedded in inline `<script>` blocks must be JavaScript-string-escaped (or better, passed via data attributes and read from DOM)
- [ ] **URL context**: user input in URL parameters must be percent-encoded; user input in full URLs must be scheme-validated
- [ ] **CSS context**: user input in inline styles or style blocks must be CSS-escaped; `expression()` and `url()` can execute scripts in older browsers
- [ ] **Framework auto-escaping reliance**: verify the framework's auto-escaping is actually active and covers the specific output context; explicitly disabled auto-escaping (Jinja2 `|safe`, ERB `raw`, Razor `Html.Raw()`) is a finding

### Header and Content-Type Hygiene
<!-- activation: keywords=["Content-Type", "text/html", "application/json", "X-Content-Type-Options", "charset", "response.setHeader", "response.headers"] -->

- [ ] **Content-Type mismatch**: endpoints returning user-influenced data should set `Content-Type: application/json` (or text/plain) with `charset=utf-8`; never `text/html` for API-style responses
- [ ] **X-Content-Type-Options: nosniff**: prevents browsers from MIME-sniffing a JSON or text/plain response as HTML; must be set on all responses
- [ ] **Charset declaration**: missing or inconsistent charset allows encoding-based XSS (UTF-7 attacks); always declare `charset=utf-8`
- [ ] **Content-Disposition on downloads**: responses that serve user-influenced content should use `Content-Disposition: attachment` when inline rendering is not intended

## Common False Positives

- **Auto-escaped template engines with default settings**: Django, Jinja2 (autoescape=True), Twig, and Razor auto-escape by default. Values rendered through standard syntax (`{{ var }}` in Django/Jinja2, `@var` in Razor) are safe unless explicitly marked raw.
- **JSON API responses with application/json Content-Type**: JSON-encoded responses with proper Content-Type are not exploitable as reflected XSS, even if they contain user input. Verify the Content-Type is actually set.
- **React/Vue/Angular SSR with framework escaping**: these frameworks escape interpolated values during server-side rendering by default. Only dangerouslySetInnerHTML/v-html/bypassSecurityTrustHtml bypass the escaping.
- **URL-encoded redirect in Location header only**: a redirect that only sets the Location header and returns 302 with no body content has no reflection point. Only flag if the body also echoes the URL.
- **Parameterized log messages**: logging that writes `log.info("Query: {}", query)` does not reflect to the user unless the log viewer renders HTML.

## Severity Guidance

| Finding | Severity |
|---|---|
| Request parameter directly interpolated in HTML response without any encoding | Critical |
| Custom error page echoing user input in HTML body without escaping | Critical |
| Search results page displaying raw query string | Critical |
| Auto-escaping explicitly disabled in template rendering request parameters | Critical |
| Form validation error page reflecting submitted values without encoding | Important |
| Request header reflected in response body (lower exploitability, requires header injection) | Important |
| JSON error response with user input but Content-Type set to text/html | Important |
| Redirect page echoing target URL before performing redirect | Important |
| Missing X-Content-Type-Options: nosniff on endpoints reflecting user data | Minor |
| User input reflected in HTML comment (limited exploitability with `-->` injection) | Minor |

## See Also

- `sec-xss-dom` -- DOM XSS is purely client-side; reflected XSS involves server-side reflection
- `sec-xss-stored` -- stored XSS persists; reflected XSS requires the victim to visit a crafted URL
- `sec-csrf` -- CSRF tokens in forms also mitigate some reflected XSS delivery vectors
- `sec-clickjacking-and-headers` -- CSP and X-Content-Type-Options headers provide defense-in-depth
- `sec-owasp-a03-injection` -- reflected XSS is a server-side injection attack via HTTP response
- `principle-fail-fast` -- validate and reject malformed input before it reaches template rendering

## Authoritative References

- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Scripting_Prevention_Cheat_Sheet.html)
- [CWE-79: Improper Neutralization of Input During Web Page Generation](https://cwe.mitre.org/data/definitions/79.html)
- [OWASP Testing Guide - Reflected XSS](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/07-Input_Validation_Testing/01-Testing_for_Reflected_Cross_Site_Scripting)
- [PortSwigger - Reflected XSS](https://portswigger.net/web-security/cross-site-scripting/reflected)
- [OWASP Output Encoding Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Scripting_Prevention_Cheat_Sheet.html#output-encoding-rules-summary)
