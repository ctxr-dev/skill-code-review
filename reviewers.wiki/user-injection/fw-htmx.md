---
id: fw-htmx
type: primary
depth_role: leaf
focus: Detect htmx-specific pitfalls in user-controlled URLs, HTML fragment XSS, missing CSRF tokens, unsafe swap modes, missing confirmation on destructive actions, URL manipulation via hx-push-url, server endpoint design, and polling without rate limits.
parents:
  - index.md
covers:
  - "hx-get/hx-post with user-controlled URLs enabling SSRF or open redirect"
  - HTML fragments returned without output encoding enabling XSS
  - Missing CSRF token in hx-headers or hx-vals for state-changing requests
  - hx-swap innerHTML with unsanitized server response
  - hx-trigger on destructive actions without hx-confirm
  - Missing hx-indicator for loading state UX feedback
  - hx-push-url enabling client-side URL manipulation
  - Server endpoints returning full pages instead of fragments
  - Missing rate limiting on hx-trigger polling endpoints
  - hx-boost on forms without progressive enhancement fallback
  - hx-vals or hx-headers injecting unsanitized user input
  - hyperscript event handlers with inline logic bypassing CSP
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
activation:
  file_globs:
    - "**/*.html"
    - "**/*.jinja"
    - "**/*.hbs"
    - "**/*.ejs"
    - "**/*.erb"
    - "**/*.heex"
  keyword_matches:
    - htmx
    - hx-get
    - hx-post
    - hx-put
    - hx-delete
    - hx-trigger
    - hx-swap
    - hx-target
    - hx-push-url
    - hx-boost
    - hx-vals
    - hx-headers
    - hyperscript
  structural_signals:
    - "HTML elements with hx-* attributes"
    - Server-rendered templates returning HTML fragments
    - htmx script tag inclusion or CDN reference
source:
  origin: file
  path: fw-htmx.md
  hash: "sha256:c12132598b37f108cb9dab860e76e9fbb9a0aab4a7f4f5819e1747c92f0de5a4"
---
# htmx Reviewer

## When This Activates

Activates when diffs touch HTML template files containing `hx-*` attributes or `hyperscript` directives. htmx extends HTML with hypermedia-driven interactions -- the server returns HTML fragments, not JSON, and the client swaps them into the DOM. This architecture shifts security responsibility to the server: every endpoint returning HTML must escape dynamic content (XSS), every state-changing request needs CSRF protection, and user-controlled URLs in `hx-get`/`hx-post` enable SSRF or open redirect. Unlike SPA frameworks that often have client-side sanitization, htmx trusts the server response completely and injects it directly into the DOM.

## Audit Surface

- [ ] hx-get or hx-post attribute value constructed from user input or URL parameter
- [ ] Server endpoint returning HTML fragment without escaping dynamic content
- [ ] hx-post, hx-put, hx-delete, hx-patch without CSRF token in hx-headers or hx-vals
- [ ] hx-swap="innerHTML" on a container receiving server HTML with user-supplied data
- [ ] hx-delete or hx-post on destructive action without hx-confirm attribute
- [ ] htmx request trigger without hx-indicator for user loading feedback
- [ ] hx-push-url="true" on endpoint that accepts user-controlled path segments
- [ ] Server endpoint returning full page HTML instead of fragment
- [ ] hx-trigger="every Ns" polling endpoint without server-side rate limiting
- [ ] hx-boost="true" on form without noscript fallback or standard action attribute
- [ ] hx-vals with JSON containing unsanitized user input sent to server
- [ ] hx-headers injecting authorization tokens from DOM-accessible elements
- [ ] hyperscript with complex logic that should be in server handler
- [ ] hx-target pointing to element outside the component boundary

## Detailed Checks

### URL Injection (SSRF / Open Redirect)
<!-- activation: keywords=["hx-get", "hx-post", "hx-put", "hx-delete", "hx-patch", "url", "href", "action", "data-url", "${", "{{"] -->

- [ ] **User-controlled hx-get/hx-post URL**: flag `hx-get="{{ user_param }}"`, `hx-post="/api/{{ url_segment }}"`, or any `hx-*` URL attribute whose value is interpolated from user input, query parameters, or database content -- attackers can redirect requests to internal services (SSRF) or external phishing sites (open redirect); see `sec-owasp-a01-broken-access-control`
- [ ] **Path traversal in URL attribute**: flag hx-get/hx-post URLs constructed with path segments from user input (e.g., `hx-get="/files/{{ filename }}"`) without server-side path validation -- directory traversal enables access to unintended endpoints
- [ ] **External URL in hx-get**: flag `hx-get="https://external-domain.com/..."` -- htmx will fetch and inject HTML from external sources into the DOM; if the external domain is compromised, this is a stored XSS vector; use `htmx.config.selfRequestsOnly = true`
- [ ] **Dynamic URL from DOM**: flag JavaScript or hyperscript that reads a URL from a DOM element (input value, data attribute) and sets it as an hx-get/hx-post target -- user-manipulable DOM values must not determine request destinations

### XSS via HTML Fragment Injection
<!-- activation: keywords=["hx-swap", "innerHTML", "outerHTML", "beforeend", "afterbegin", "fragment", "render", "template", "partial", "escape", "sanitize"] -->

- [ ] **Unescaped content in fragment**: flag server endpoints that return HTML fragments containing user-supplied data without output encoding -- htmx injects the response directly into the DOM via `innerHTML`; any unescaped `<script>`, event handler attributes, or SVG payloads execute immediately; see `sec-xss-dom`
- [ ] **hx-swap innerHTML on untrusted content**: flag `hx-swap="innerHTML"` (the default) on containers receiving responses from endpoints that include user-generated content (comments, messages, profile fields) -- verify the server template engine auto-escapes; Jinja2 does by default, but ERB and EJS do not without explicit escaping
- [ ] **hx-swap outerHTML replacing security-critical elements**: flag `hx-swap="outerHTML"` on elements that contain security attributes (CSRF tokens, nonces, auth state) -- replacing the entire element removes these attributes from the DOM
- [ ] **Missing Content-Type on fragment response**: flag server endpoints returning HTML fragments without `Content-Type: text/html` -- browsers may interpret the response differently; htmx expects HTML

### CSRF Protection
<!-- activation: keywords=["hx-headers", "hx-vals", "csrf", "CSRF", "X-CSRFToken", "csrfmiddlewaretoken", "csrf_token", "_csrf", "authenticity_token", "hx-post", "hx-put", "hx-delete", "hx-patch"] -->

- [ ] **Missing CSRF on state-changing requests**: flag `hx-post`, `hx-put`, `hx-delete`, `hx-patch` without a CSRF token in `hx-headers` or `hx-vals` -- htmx does not add CSRF tokens automatically; configure globally via `document.body.addEventListener('htmx:configRequest', ...)` or per-element via `hx-headers='{"X-CSRFToken": "{{ csrf_token }}"}'`; see `sec-csrf`
- [ ] **CSRF token in URL parameter**: flag CSRF tokens passed as query parameters in hx-get URLs instead of headers -- tokens in URLs appear in server logs, browser history, and Referer headers
- [ ] **Missing global CSRF config**: flag htmx applications without a global `htmx:configRequest` listener or `hx-headers` on the body element for CSRF -- per-element CSRF is error-prone; global configuration ensures all requests include the token
- [ ] **CSRF token from predictable source**: flag CSRF tokens read from meta tags with static values or predictable patterns -- tokens must be server-generated, per-session, and unpredictable

### Destructive Actions and UX Safety
<!-- activation: keywords=["hx-confirm", "hx-delete", "hx-post", "delete", "remove", "destroy", "cancel", "hx-trigger", "hx-indicator", "htmx-indicator"] -->

- [ ] **Delete without confirmation**: flag `hx-delete` on buttons or links without `hx-confirm="Are you sure?"` -- accidental clicks trigger irreversible deletions; `hx-confirm` provides a native browser confirmation dialog
- [ ] **Destructive POST without confirmation**: flag `hx-post` on actions that modify or delete data (cancel subscription, deactivate account, transfer funds) without `hx-confirm` -- any state change with significant consequences should require confirmation
- [ ] **Missing hx-indicator**: flag htmx interactions (especially those with network latency) without `hx-indicator` pointing to a loading spinner -- without feedback, users click repeatedly, generating duplicate requests; use `hx-indicator="#spinner"` with a CSS class
- [ ] **hx-disable attribute missing**: flag forms that should prevent double-submission without `hx-disabled-elt` or `hx-disable` -- the `hx-disabled-elt="this"` attribute disables the submit button during the request

### URL Manipulation via hx-push-url
<!-- activation: keywords=["hx-push-url", "hx-replace-url", "pushUrl", "replaceUrl", "history", "popstate"] -->

- [ ] **hx-push-url with user-controlled path**: flag `hx-push-url="true"` on requests whose URL contains user-supplied path segments -- the URL is pushed to browser history and displayed in the address bar; attackers can craft URLs that appear to point to trusted paths
- [ ] **hx-push-url without server validation**: flag `hx-push-url` on endpoints that do not validate the request path matches expected patterns -- mismatched URLs in history cause broken back-button navigation
- [ ] **hx-replace-url on sensitive pages**: flag `hx-replace-url` that removes evidence of the current page from history (e.g., replacing a confirmation page URL with the dashboard URL) -- this breaks browser navigation expectations

### Server Endpoint Design
<!-- activation: keywords=["fragment", "partial", "render", "template", "response", "html", "doctype", "head", "body", "layout", "base.html", "extends"] -->

- [ ] **Full page instead of fragment**: flag server endpoints that return complete HTML documents (containing `<!DOCTYPE>`, `<html>`, `<head>`, `<body>`) in response to htmx requests -- htmx expects fragments; full pages injected into existing DOM create nested `<html>` elements and duplicate scripts. Check for `HX-Request` header to differentiate htmx from browser requests
- [ ] **Missing HX-Request check**: flag server endpoints shared between full-page and htmx requests without checking the `HX-Request` header -- return a full page for browser navigation and a fragment for htmx
- [ ] **Fragment with inline scripts**: flag HTML fragments containing `<script>` tags -- htmx processes inline scripts in swapped content, but this practice mixes behavior with content; use htmx events and `hx-on` attributes or hyperscript instead
- [ ] **Missing HX-Trigger response header**: flag server endpoints that should trigger client-side events (toast notifications, modal close, list refresh) but return only HTML without `HX-Trigger` response headers -- use response headers for out-of-band signaling

### Polling and Rate Limiting
<!-- activation: keywords=["hx-trigger", "every", "poll", "load", "revealed", "intersect", "sse", "ws", "hx-trigger='every"] -->

- [ ] **Polling without rate limit**: flag `hx-trigger="every 1s"` or similar short-interval polling without server-side rate limiting -- each connected browser tab generates one request per interval; 1000 users with 1-second polling is 1000 req/s; use longer intervals, SSE (`sse-connect`), or WebSockets for real-time updates
- [ ] **Polling without conditional GET**: flag polling endpoints that return full HTML fragments on every request regardless of changes -- implement `HX-Trigger: load` only when data changes, or use 304 Not Modified responses to reduce bandwidth
- [ ] **hx-trigger load on large lists**: flag `hx-trigger="load"` on elements inside scrollable containers loading large datasets -- use `hx-trigger="revealed"` (intersection observer) for lazy loading instead of loading all items on page load
- [ ] **Missing hx-trigger delay**: flag `hx-trigger="keyup"` on search inputs without `delay:300ms` modifier -- every keystroke fires a server request; use `hx-trigger="keyup changed delay:300ms"` for debouncing

## Common False Positives

- **hx-get with static URLs**: `hx-get="/api/notifications"` with a hardcoded path is safe. Only flag when the URL contains template interpolation, JavaScript variables, or data attribute references.
- **CSRF not needed for GET requests**: `hx-get` requests are idempotent reads and do not need CSRF tokens. Only flag `hx-post`, `hx-put`, `hx-delete`, `hx-patch`.
- **Full pages for non-htmx requests**: endpoints that check `HX-Request` and return full pages for normal browser navigation are correctly designed. Only flag when the full page is returned for htmx requests.
- **Polling in admin dashboards**: low-traffic admin dashboards with a few users may legitimately use short polling intervals without rate limiting. Flag only on public-facing or high-traffic endpoints.
- **hyperscript for simple interactions**: `_="on click toggle .hidden"` for CSS class toggling is appropriate. Only flag hyperscript containing business logic, API calls, or data manipulation.

## Severity Guidance

| Finding | Severity |
|---|---|
| Server endpoint returning unescaped user data in HTML fragment (XSS) | Critical |
| hx-get/hx-post URL constructed from user input (SSRF/open redirect) | Critical |
| hx-post/hx-put/hx-delete without CSRF token on cookie-authenticated app | Critical |
| hx-swap innerHTML on container receiving untrusted external HTML | Critical |
| Missing hx-confirm on destructive delete/cancel/deactivate actions | Important |
| hx-push-url with user-controlled path segments | Important |
| Polling endpoint without rate limiting on public routes | Important |
| Full page HTML returned for htmx request instead of fragment | Important |
| Missing hx-indicator on network-dependent interactions | Minor |
| hx-trigger keyup without delay modifier on search input | Minor |
| hx-boost on form without noscript fallback | Minor |
| Missing HX-Trigger response headers for event signaling | Minor |

## See Also

- `sec-xss-dom` -- htmx innerHTML swap is a direct DOM XSS sink when fragments contain unescaped content
- `sec-csrf` -- htmx does not auto-include CSRF tokens; explicit configuration required
- `sec-owasp-a01-broken-access-control` -- user-controlled URLs in hx-get/hx-post enable SSRF and open redirect
- `sec-owasp-a05-misconfiguration` -- missing htmx.config.selfRequestsOnly, missing CSP for inline scripts
- `principle-separation-of-concerns` -- server endpoints should separate full-page from fragment rendering
- `fw-phoenix-elixir` -- HEEx templates with htmx attributes combine Phoenix escaping with htmx swap semantics

## Authoritative References

- [htmx Documentation](https://htmx.org/docs/)
- [htmx Documentation -- Security](https://htmx.org/docs/#security)
- [htmx Documentation -- hx-headers](https://htmx.org/attributes/hx-headers/)
- [htmx Documentation -- Request Headers](https://htmx.org/docs/#request-headers)
- [OWASP -- Cross-Site Scripting Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Scripting_Prevention_Cheat_Sheet.html)
- [OWASP -- CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
