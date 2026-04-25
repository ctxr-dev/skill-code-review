---
id: sec-request-smuggling-and-cache-poisoning
type: primary
depth_role: leaf
focus: Detect HTTP request smuggling vectors and web cache poisoning patterns that exploit inconsistencies between proxies, backends, and caching layers
parents:
  - index.md
covers:
  - "Transfer-Encoding / Content-Length ambiguity enabling CL.TE or TE.CL smuggling"
  - "HTTP/2 downgrade smuggling via header injection in cleartext reproxy"
  - Cache key manipulation through unkeyed headers or unkeyed query parameters
  - Cache poisoning via Host header injection or X-Forwarded-Host abuse
  - Response splitting via CRLF injection in HTTP response headers
  - Inconsistent request parsing between reverse proxy and backend server
  - Vary header misuse enabling cache deception attacks
  - "Web cache deception via path confusion (e.g., /profile.css cached publicly)"
  - "Request smuggling via ambiguous chunked encoding (chunk-ext, trailing headers)"
  - HTTP desync caused by connection reuse between proxy and backend
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
activation:
  file_globs:
    - "**/*proxy*"
    - "**/*cache*"
    - "**/*nginx*"
    - "**/*haproxy*"
    - "**/*varnish*"
    - "**/*cdn*"
    - "**/*middleware*"
    - "**/*header*"
    - "**/*gateway*"
    - "**/nginx.conf"
    - "**/haproxy.cfg"
    - "**/Caddyfile"
    - "**/varnish*.vcl"
  keyword_matches:
    - Transfer-Encoding
    - Content-Length
    - chunked
    - proxy
    - cache
    - Cache-Control
    - Vary
    - Host
    - header
    - X-Forwarded
    - reverse proxy
    - CDN
    - nginx
    - haproxy
    - varnish
    - cloudflare
    - Surrogate-Control
    - X-Original-URL
    - X-Rewrite-URL
    - setHeader
    - writeHead
    - addHeader
    - no-store
    - no-cache
    - public
    - private
    - s-maxage
  structural_signals:
    - HTTP header manipulation in middleware or handler
    - Proxy or gateway configuration file
    - Cache configuration or cache key definition
    - Response header set from request-derived value
    - Reverse proxy upstream definition
source:
  origin: file
  path: sec-request-smuggling-and-cache-poisoning.md
  hash: "sha256:e7c94f87e6c5e45bf3bf0bcf0a69f10a6d45798ec189528b83a8d7df9453dc27"
---
# HTTP Request Smuggling and Web Cache Poisoning

## When This Activates

Activates when diffs touch proxy configurations (nginx, HAProxy, Varnish, Caddy, CDN rules), HTTP header manipulation (setting response headers, reading Host/X-Forwarded-* headers), cache control directives, or middleware that processes Transfer-Encoding or Content-Length. These vulnerability classes exploit disagreements between components in the HTTP processing chain: a proxy and backend may disagree on where one request ends and the next begins (smuggling), or a cache may store a poisoned response and serve it to other users (cache poisoning). Both are high-impact because they can affect all users behind the same infrastructure.

**Primary CWEs**: CWE-444 (HTTP Request/Response Smuggling), CWE-113 (HTTP Response Splitting), CWE-525 (Information Exposure Through Browser Caching).

## Audit Surface

- [ ] Backend manually parsing Transfer-Encoding or Content-Length headers instead of relying on framework
- [ ] Proxy configuration forwarding both Transfer-Encoding and Content-Length headers
- [ ] HTTP response headers set from user-controlled input without CRLF sanitization
- [ ] Cache-Control or Surrogate-Control headers missing on sensitive endpoints
- [ ] Vary header missing or incomplete, allowing cache collisions across users
- [ ] Host header read directly from request and reflected in response or used in URL construction
- [ ] X-Forwarded-Host, X-Forwarded-Proto, or X-Original-URL trusted without validation
- [ ] Reverse proxy configuration with connection reuse to backend (keep-alive without normalization)
- [ ] HTTP/2-to-HTTP/1.1 downgrade in proxy layer without header sanitization
- [ ] Static file cache rules matching URL suffixes (.css, .js, .jpg) without checking response type
- [ ] Cache key excluding query parameters or specific headers that influence response content
- [ ] Application setting response headers (Location, Set-Cookie) from unvalidated input
- [ ] Custom Transfer-Encoding values (e.g., chunked with whitespace or capitalization variants)
- [ ] Backend accepting requests with both Transfer-Encoding and Content-Length simultaneously
- [ ] CDN or reverse proxy cache rules caching responses based on path extension alone
- [ ] Missing Cache-Control: no-store on authenticated or personalized endpoints
- [ ] URL path normalization differences between proxy and application routing
- [ ] Trailer headers accepted in chunked transfer encoding without validation

## Detailed Checks

### CL.TE and TE.CL Request Smuggling (CWE-444)
<!-- activation: keywords=["Transfer-Encoding", "Content-Length", "chunked", "proxy_pass", "ProxyPass", "upstream", "backend", "keepalive"] -->

- [ ] **Dual header forwarding**: flag proxy configurations that forward both `Transfer-Encoding` and `Content-Length` to backends without stripping one -- RFC 7230 requires senders to not include both, but proxies that forward both create CL.TE or TE.CL desync depending on which header each component prioritizes
- [ ] **Non-standard chunked encoding variants**: flag acceptance of `Transfer-Encoding: xchunked`, `Transfer-Encoding : chunked` (space before colon), `Transfer-Encoding: chunked, identity`, or mixed-case variations -- these non-standard variants may be processed differently by proxy and backend, enabling smuggling
- [ ] **Connection reuse without normalization**: flag proxy configurations using persistent connections to backends (`keepalive` in nginx, `http-reuse always` in HAProxy) without ensuring request normalization -- connection reuse is a prerequisite for smuggling; if the proxy does not normalize, a smuggled prefix contaminates the next request on the reused connection
- [ ] **Manual Content-Length calculation**: flag application code that manually computes or overrides `Content-Length` headers -- incorrect Content-Length allows an attacker to make the backend read past the intended request boundary

### HTTP/2 Downgrade Smuggling
<!-- activation: keywords=["HTTP/2", "h2", "h2c", "http2", "grpc", "proxy_http_version", "cleartext", "ALPN"] -->

- [ ] **HTTP/2-to-HTTP/1.1 reproxy**: flag reverse proxy configurations that accept HTTP/2 from clients but downgrade to HTTP/1.1 for backend connections -- HTTP/2 pseudo-headers (`:method`, `:path`, `:authority`) can contain characters (newlines, colons) that are invalid in HTTP/1.1, enabling header injection during the downgrade
- [ ] **H2C smuggling via Upgrade**: flag backend servers or proxies that accept `h2c` (cleartext HTTP/2) upgrades -- attackers can use the HTTP/1.1 Upgrade mechanism to tunnel HTTP/2 requests, bypassing proxy-level access controls
- [ ] **Missing HPACK validation on reproxy**: flag HTTP/2 frontends that do not validate or sanitize header values before serializing them into HTTP/1.1 -- HPACK-encoded headers can carry newlines that become CRLF injection in the downstream HTTP/1.1 connection

### Response Splitting and Header Injection (CWE-113)
<!-- activation: keywords=["setHeader", "writeHead", "addHeader", "header(", "response.header", "res.set", "Location", "Set-Cookie", "redirect", "Content-Disposition"] -->

- [ ] **User input in response headers**: flag code that sets HTTP response headers from user-controlled values without stripping `\r\n` -- CRLF characters in a header value terminate the header section and allow the attacker to inject a complete response body, enabling XSS or cache poisoning
- [ ] **Redirect URL from user input**: flag `Location` header set from `req.query.redirect` or similar without validation -- beyond open redirect (CWE-601), CRLF in the redirect URL can split the response
- [ ] **Set-Cookie from user input**: flag `Set-Cookie` header where the cookie name or value derives from user input -- header injection in Set-Cookie can inject additional cookies or split the response
- [ ] **Missing framework header sanitization**: flag frameworks or HTTP libraries that do not automatically reject header values containing `\r` or `\n` -- modern frameworks (Express 4.x+, Spring Boot, Django) reject these, but older versions or raw socket handlers may not

### Cache Poisoning via Unkeyed Inputs
<!-- activation: keywords=["Host", "X-Forwarded-Host", "X-Forwarded-Proto", "X-Forwarded-For", "X-Original-URL", "X-Rewrite-URL", "cache", "CDN", "Vary", "Varnish", "Cloudflare", "Fastly", "Akamai"] -->

- [ ] **Host header reflected in cached response**: flag applications that use the `Host` header to construct URLs (asset URLs, canonical links, password reset links) in responses that are cached -- an attacker sends a request with a poisoned Host header, the response containing the attacker's domain is cached, and all subsequent users receive the poisoned response
- [ ] **Unkeyed X-Forwarded-Host**: flag applications that use `X-Forwarded-Host` to generate URLs in cached responses without including it in the cache key (Vary header or CDN key config) -- this header is attacker-controlled and typically unkeyed by caches
- [ ] **Unkeyed query parameters**: flag cache configurations that strip certain query parameters from the cache key while the application uses them to alter response content -- parameters like `utm_*`, `callback`, or `lang` may be excluded from cache keys but influence the response
- [ ] **Fat GET poisoning**: flag cache configurations that cache GET responses while the application reads the request body on GET requests -- an attacker's GET body alters the response, which is then cached for bodyless GET requests from other users

### Web Cache Deception
<!-- activation: keywords=["cache", "static", "public", "s-maxage", "max-age", "extension", ".css", ".js", ".jpg", ".png", ".woff", "path_info", "pathinfo"] -->

- [ ] **Path confusion caching**: flag cache rules that cache responses based on URL path extension (`.css`, `.js`, `.jpg`) without verifying the response `Content-Type` -- an attacker can request `/account/settings/anything.css`, and if the backend ignores the extension and serves the authenticated account page, the cache stores it as a static asset accessible to anyone
- [ ] **Missing Cache-Control on sensitive endpoints**: flag authenticated or personalized endpoints that do not set `Cache-Control: no-store, private` -- without explicit cache prohibition, intermediary caches (CDN, reverse proxy, browser) may cache and serve personalized data to other users
- [ ] **Overly broad static asset rules**: flag proxy/CDN rules like `if (req.url ~ "\.(css|js|png)$") { set beresp.ttl = 1d; }` that do not verify the upstream response status code or Content-Type -- 404 pages or error responses matching the pattern get cached, and legitimate assets are replaced

### Vary Header and Cache Key Integrity
<!-- activation: keywords=["Vary", "Accept-Encoding", "Accept-Language", "Accept", "Cookie", "Authorization", "cache-key", "hash_data"] -->

- [ ] **Missing Vary on content-negotiated responses**: flag responses whose content changes based on `Accept-Language`, `Accept-Encoding`, `Accept`, or `Cookie` but do not include the corresponding `Vary` header -- caches will serve a single variant to all users regardless of their headers
- [ ] **Vary: Cookie on CDN-cached pages**: flag pages that set `Vary: Cookie` while being served through a CDN that does not support cookie-based cache keying -- this effectively makes every request a cache miss or, worse, the CDN ignores Vary: Cookie and caches the first user's personalized page
- [ ] **Vary: * (cache-busting)**: flag `Vary: *` which makes the response uncacheable by any cache -- this may be intentional for sensitive responses but is often a misconfiguration that destroys cache efficiency

## Common False Positives

- **Internal-only services behind VPN**: services that are not exposed to the public internet and sit behind a VPN or private network have a reduced (but not zero) smuggling risk. Internal attackers or compromised clients can still exploit smuggling.
- **Framework handles header sanitization**: modern web frameworks (Express 4.17+, Django, Spring Boot, ASP.NET Core) automatically reject header values containing CRLF. Verify the framework version before dismissing.
- **Cache-Control already set by framework**: some frameworks set `Cache-Control: no-cache` or `no-store` by default on all responses. Verify the default behavior before flagging missing headers.
- **CDN-specific cache key configuration**: CDN vendors (Cloudflare, Fastly, Akamai) have their own cache key configuration mechanisms that may include headers not visible in the application code. Verify the CDN configuration separately.
- **Static site generators**: fully static sites with no personalized content have minimal cache deception risk. Flag only if the site serves any authenticated or personalized pages.

## Severity Guidance

| Finding | Severity |
|---|---|
| Proxy forwarding both Transfer-Encoding and Content-Length to backend | Critical |
| HTTP/2 to HTTP/1.1 downgrade without header sanitization | Critical |
| User input in response header without CRLF stripping | Critical |
| Host header reflected in cached response used for URL construction | Critical |
| Path-based cache rule without Content-Type or status code verification | Important |
| Missing Cache-Control: no-store on authenticated/personalized endpoints | Important |
| Unkeyed X-Forwarded-Host used in cached response generation | Important |
| Missing Vary header on content-negotiated cached response | Important |
| Connection reuse to backend without request normalization | Important |
| Non-standard Transfer-Encoding variants accepted by proxy | Important |
| Vary: Cookie on CDN that does not support cookie-based keying | Minor |
| Cache-Control headers set but missing Surrogate-Control for CDN layer | Minor |
| Static asset cache rules caching error responses | Minor |

## See Also

- `sec-owasp-a03-injection` -- CRLF/header injection is a form of injection where the interpreter is the HTTP protocol parser
- `sec-owasp-a05-misconfiguration` -- proxy and cache misconfigurations are the root cause of most smuggling and poisoning vectors
- `sec-owasp-a10-ssrf` -- cache poisoning with attacker-controlled URLs can redirect backend requests to attacker infrastructure
- `principle-fail-fast` -- proxies should reject ambiguous requests rather than guessing intent

## Authoritative References

- [CWE-444: Inconsistent Interpretation of HTTP Requests (HTTP Request Smuggling)](https://cwe.mitre.org/data/definitions/444.html)
- [CWE-113: Improper Neutralization of CRLF Sequences in HTTP Headers](https://cwe.mitre.org/data/definitions/113.html)
- [CWE-525: Use of Web Browser Cache Containing Sensitive Information](https://cwe.mitre.org/data/definitions/525.html)
- [PortSwigger: HTTP Request Smuggling](https://portswigger.net/web-security/request-smuggling)
- [PortSwigger: Web Cache Poisoning](https://portswigger.net/web-security/web-cache-poisoning)
- [PortSwigger: Web Cache Deception](https://portswigger.net/web-security/web-cache-deception)
- [RFC 7230 Section 3.3.3: Message Body Length](https://datatracker.ietf.org/doc/html/rfc7230#section-3.3.3)
- [James Kettle: HTTP Desync Attacks (DEF CON 27)](https://portswigger.net/research/http-desync-attacks-request-smuggling-reborn)
- [James Kettle: Practical Cache Poisoning (2018)](https://portswigger.net/research/practical-web-cache-poisoning)
