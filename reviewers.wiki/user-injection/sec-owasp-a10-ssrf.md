---
id: sec-owasp-a10-ssrf
type: primary
depth_role: leaf
focus: Detect server-side request forgery via user-controlled URLs passed to HTTP clients without validation or allowlisting
parents:
  - index.md
covers:
  - User-supplied URLs passed to HTTP client libraries without validation
  - "URL parsing that allows scheme switching to file://, gopher://, dict://"
  - SSRF via HTTP redirect following to internal IP addresses
  - DNS rebinding exploits not mitigated by post-resolution IP checks
  - Internal service URLs constructable from user-controlled input segments
  - Image, webhook, and callback URLs fetched server-side without allowlist
  - "Cloud metadata endpoint accessible via SSRF (169.254.169.254)"
  - URL validation bypasses using IPv6, decimal IP, or URL encoding
  - Partial URL injection via host, path, or port user input
  - "SSRF through XML external entity (XXE) or SVG processing"
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
activation:
  file_globs:
    - "**/*.py"
    - "**/*.js"
    - "**/*.ts"
    - "**/*.java"
    - "**/*.go"
    - "**/*.rb"
    - "**/*.php"
    - "**/*.cs"
    - "**/*.rs"
  keyword_matches:
    - url
    - URL
    - fetch
    - request
    - http
    - https
    - get
    - post
    - curl
    - wget
    - download
    - webhook
    - callback
    - proxy
    - redirect
    - forward
    - image_url
    - avatar_url
    - import_url
  structural_signals:
    - http_client_call
    - url_from_user_input
    - url_construction
    - redirect_handling
    - webhook_handler
    - proxy_endpoint
    - file_download_handler
source:
  origin: file
  path: sec-owasp-a10-ssrf.md
  hash: "sha256:5e36e1d7afdba9b4bc0abb12fb2410745b26bac4b54e79e5aba5d4dead67f836"
---
# Server-Side Request Forgery (OWASP A10:2021)

## When This Activates

Activates when the diff contains HTTP client calls, URL construction, proxy or redirect logic, webhook handlers, image/file fetch endpoints, or any pattern where a URL is derived from user input and used in a server-side request. Also activates on keywords like `url`, `fetch`, `request`, `curl`, `download`, `webhook`, `callback`, `proxy`, `redirect`, `image_url`. This reviewer detects server-side request forgery (CWE-918) where an attacker induces the server to make requests to unintended destinations, potentially accessing internal services, cloud metadata, or other resources behind the network perimeter.

## Audit Surface

- [ ] User-supplied URL passed directly to HTTP client (fetch, requests, HttpClient)
- [ ] URL constructed by concatenating user input with base URL
- [ ] URL scheme not restricted to https:// only
- [ ] HTTP client configured to follow redirects from user-supplied URL
- [ ] No allowlist check on resolved hostname or IP address before request
- [ ] No blocklist for private/reserved IP ranges (10.x, 172.16-31.x, 192.168.x, 127.x, 169.254.x)
- [ ] Cloud metadata URL (169.254.169.254, metadata.google.internal) not blocked
- [ ] Webhook or callback URL from user input fetched without domain validation
- [ ] Image URL (avatar, thumbnail, import) fetched server-side from user input
- [ ] URL validation performed before DNS resolution (TOCTOU with DNS rebinding)
- [ ] URL parser inconsistency between validation and fetch libraries
- [ ] Host header or X-Forwarded-Host used to construct internal request URLs
- [ ] File download endpoint accepting arbitrary URLs
- [ ] Proxy or redirect endpoint forwarding user-supplied destination
- [ ] GraphQL or API endpoint accepting URL arguments for server-side fetch
- [ ] PDF generator, link preview, or HTML renderer fetching user-supplied URLs
- [ ] SVG or XML processing that resolves external entities to URLs
- [ ] DNS resolution result not checked against private IP ranges

## Detailed Checks

### Direct URL Pass-Through
<!-- activation: keywords=["requests.get", "requests.post", "fetch(", "http.get", "http.Get", "HttpClient", "urllib", "urlopen", "axios", "got(", "node-fetch", "curl_exec", "file_get_contents", "open-uri", "Faraday", "RestClient", "WebClient", "HttpWebRequest"] -->

- [ ] **User URL to HTTP client**: flag any pattern where a user-supplied value (request parameter, form field, API body field, database record populated by users) is passed as the URL argument to an HTTP client library without validation -- this is the primary SSRF vector (CWE-918)
- [ ] **Python requests with user URL**: flag `requests.get(user_url)`, `requests.post(user_url)`, `urllib.request.urlopen(user_url)`, `httpx.get(user_url)` -- Python HTTP libraries will happily request `file:///etc/passwd` or `http://169.254.169.254/`
- [ ] **Node.js fetch/axios with user URL**: flag `fetch(userUrl)`, `axios.get(userUrl)`, `got(userUrl)`, `http.get(userUrl)` -- Node HTTP clients follow redirects by default, enabling redirect-based SSRF
- [ ] **Java HttpClient with user URL**: flag `HttpClient.newHttpClient().send(HttpRequest.newBuilder().uri(URI.create(userUrl)))` or Apache HttpClient `HttpGet(userUrl)` -- Java URL class supports `file:`, `jar:`, and `netdoc:` schemes
- [ ] **Go http.Get with user URL**: flag `http.Get(userURL)`, `http.Post(userURL, ...)`, `client.Do(req)` where req.URL is user-controlled -- Go's HTTP client follows redirects by default
- [ ] **PHP file_get_contents/curl with user URL**: flag `file_get_contents($userUrl)`, `curl_setopt($ch, CURLOPT_URL, $userUrl)` -- PHP's `file_get_contents` supports `php://`, `data://`, `expect://` wrappers in addition to HTTP

### URL Construction and Partial Injection
<!-- activation: keywords=["format", "interpolate", "concat", "join", "replace", "template", "f-string", "sprintf", "+", "base_url", "baseUrl", "host", "endpoint", "path", "port"] -->

- [ ] **URL constructed via string concatenation**: flag patterns like `baseUrl + "/" + userInput` or `f"https://api.internal/{user_path}"` where any segment (host, port, path) contains user input -- path traversal in the URL path (`../`) can escape the intended base, and host injection can redirect to attacker-controlled servers
- [ ] **Host from user input**: flag URL construction where the hostname or domain is derived from user input, even partially -- `https://{user_domain}.internal.api/` allows arbitrary host targeting if the domain is not validated
- [ ] **Port from user input**: flag URL construction where the port number comes from user input -- scanning internal ports via `http://internal-host:{user_port}/` reveals running services
- [ ] **Path traversal in URL path**: flag URL construction that appends user input to a path without sanitizing `../`, `..%2f`, or `..%252f` -- URL-encoded path traversal can escape the intended API prefix
- [ ] **URL assembled from multiple user inputs**: flag patterns where scheme, host, port, and path are each independently user-controlled -- even if individual fields are validated, their combination may target an unintended destination

### Scheme and Protocol Restrictions
<!-- activation: keywords=["scheme", "protocol", "file://", "ftp://", "gopher://", "dict://", "ldap://", "data:", "php://", "jar:", "netdoc:", "https://", "http://", "url.protocol", "url.scheme", "getScheme", "getProtocol"] -->

- [ ] **No scheme restriction**: flag URL validation that does not explicitly check the URL scheme/protocol against an allowlist of `https` (and `http` only if required) -- `file://`, `gopher://`, `dict://`, `ldap://`, and `data:` schemes enable file reading, arbitrary TCP, and other attacks
- [ ] **Scheme validation via string prefix**: flag scheme checks using `url.startsWith("http")` -- this matches `httpevil://` and can be bypassed with mixed-case or whitespace
- [ ] **PHP stream wrappers**: flag PHP code that passes user URLs to functions supporting stream wrappers (`file_get_contents`, `include`, `fopen`) without restricting to http/https -- `php://filter`, `data://`, `expect://`, and `zip://` enable code execution
- [ ] **Java URL schemes**: flag Java URL processing without restricting schemes -- `java.net.URL` supports `file:`, `jar:`, and `netdoc:` protocols

### Redirect Following and DNS Rebinding
<!-- activation: keywords=["redirect", "follow", "location", "302", "301", "307", "308", "maxRedirects", "followRedirects", "allow_redirects", "dns", "resolve", "rebind", "TOCTOU", "getaddrinfo"] -->

- [ ] **Redirects followed to internal targets**: flag HTTP clients configured to follow redirects (the default in most libraries) when requesting user-supplied URLs -- an attacker hosts a URL that 302-redirects to `http://169.254.169.254/` or `http://localhost:8080/admin` and the server follows it
- [ ] **No redirect destination validation**: flag redirect-following code that does not validate each redirect destination against the same URL policy -- a chain of redirects can traverse from an allowed external host to a blocked internal one
- [ ] **DNS rebinding (TOCTOU)**: flag URL validation patterns that resolve the hostname, check the IP, then make a separate HTTP request -- between the check and the request, the DNS record can change to an internal IP. Validate the IP *after* the connection is established, or use the resolved IP directly
- [ ] **HTTP client using system DNS without pinning**: flag HTTP requests to user-controlled hostnames that rely on the system DNS resolver without binding to the resolved IP -- DNS rebinding attacks exploit the gap between resolution and connection

### Cloud Metadata and Internal Service Protection
<!-- activation: keywords=["169.254.169.254", "metadata", "metadata.google.internal", "100.100.100.200", "fd00:", "instance", "credentials", "iam", "token", "cloud", "aws", "gcp", "azure", "imds", "internal", "localhost", "127.0.0.1", "0.0.0.0", "10.", "172.16", "192.168"] -->

- [ ] **Cloud metadata endpoint not blocked**: flag SSRF-susceptible code without explicit blocking of cloud metadata endpoints -- `http://169.254.169.254/latest/meta-data/iam/security-credentials/` (AWS), `http://metadata.google.internal/` (GCP), `http://169.254.169.254/metadata/identity/oauth2/token` (Azure) return IAM credentials that grant full cloud account access
- [ ] **Private IP ranges not blocked**: flag URL validation that does not reject private/reserved IP ranges: `127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16` (link-local), `::1`, `fd00::/8` -- internal services are the primary SSRF target
- [ ] **IP bypass via encoding**: flag IP validation that does not handle decimal IPs (`2130706433` = `127.0.0.1`), octal IPs (`0177.0.0.1` = `127.0.0.1`), IPv6 mapped IPv4 (`::ffff:127.0.0.1`), or URL-encoded IPs -- attackers use alternative representations to bypass naive blocklists
- [ ] **Localhost aliases not blocked**: flag blocklists that check only `127.0.0.1` without also blocking `localhost`, `0.0.0.0`, `[::1]`, `0x7f000001`, `127.1`, and OS-specific loopback names
- [ ] **AWS IMDS v1 accessible**: flag environments where IMDSv1 (no token required) is available -- IMDSv2 requires a PUT request with a hop limit, which makes SSRF exploitation significantly harder; enforce IMDSv2 at the infrastructure level

### Indirect SSRF Vectors
<!-- activation: keywords=["pdf", "render", "preview", "thumbnail", "screenshot", "headless", "puppeteer", "playwright", "wkhtmltopdf", "chromium", "svg", "xml", "entity", "DOCTYPE", "SYSTEM", "xlink:href", "import", "include", "ssinclude"] -->

- [ ] **PDF/HTML renderer fetching user URLs**: flag HTML-to-PDF converters (wkhtmltopdf, Puppeteer, Playwright, WeasyPrint) rendering user-controlled HTML -- embedded `<img>`, `<link>`, `<iframe>`, `<script>`, or CSS `url()` references are fetched server-side
- [ ] **Link preview / unfurling**: flag link preview features that fetch user-provided URLs to extract Open Graph metadata, titles, or thumbnails -- the preview fetcher is an HTTP client under attacker control
- [ ] **SVG processing with external references**: flag SVG parsers that resolve `xlink:href`, `<image>`, or `<use>` elements pointing to external URLs -- SVG is XML and can contain SSRF payloads
- [ ] **XXE enabling SSRF**: flag XML parsers with external entity resolution enabled (`DOCTYPE SYSTEM`, `ENTITY`) -- XML external entities can fetch arbitrary URLs server-side
- [ ] **Import/include from user-specified URL**: flag template engines, configuration loaders, or schema resolvers that accept URLs from user input -- `$ref` in JSON Schema, `include` in configuration files, and template imports can trigger server-side fetches

## Common False Positives

- **Internal service-to-service calls with hardcoded URLs**: HTTP clients calling hardcoded internal URLs (e.g., `http://auth-service:8080/validate`) are not SSRF unless any part of the URL is derived from user input. Verify no user data influences the URL.
- **User URLs stored and displayed but not fetched**: storing a URL in a database and rendering it as an `<a href>` in HTML is not SSRF -- the browser, not the server, fetches the URL. Flag only when the server itself makes the request.
- **Allowlisted domain with strict validation**: if the code validates the user URL against an explicit allowlist of domains and rejects everything else, SSRF is mitigated. Verify the allowlist cannot be bypassed via open redirects on allowed domains.
- **Outbound webhook to customer-configured URL**: some SaaS products intentionally call customer-provided webhook URLs. This is SSRF by design, but should still have private-IP blocking and metadata-endpoint blocking.
- **DNS resolution for display purposes only**: resolving a hostname to display its IP without making an HTTP request to it is not SSRF. Flag only when the resolved address is used in a subsequent connection.

## Severity Guidance

| Finding | Severity |
|---|---|
| User URL passed directly to HTTP client with no validation | Critical |
| Cloud metadata endpoint (169.254.169.254) not blocked in SSRF-capable code | Critical |
| Private IP ranges not blocked in URL validation | Critical |
| HTTP client following redirects to arbitrary destinations from user URL | Critical |
| PHP file_get_contents or stream wrappers on user URL | Critical |
| URL scheme not restricted (file://, gopher://, dict:// allowed) | Important |
| DNS rebinding not mitigated (validation before resolution, separate fetch) | Important |
| PDF renderer or link previewer fetching user-controlled URLs without restrictions | Important |
| URL constructed by concatenating user input into host or path segments | Important |
| SVG or XML processing resolving external entity URLs | Important |
| Blocklist checks only 127.0.0.1 without other loopback representations | Important |
| IP validation not handling decimal, octal, or IPv6-mapped representations | Minor |
| Webhook URL to customer-configured endpoint with private IP blocking in place | Minor |
| Internal HTTP call with hardcoded URL but no validation framework applied | Minor |

## See Also

- `sec-owasp-a03-injection` -- SSRF is a form of injection where the payload is a URL; XXE-based SSRF overlaps with injection
- `sec-owasp-a01-broken-access-control` -- SSRF bypasses network-level access controls by using the server as a proxy
- `sec-owasp-a05-misconfiguration` -- IMDSv1 enabled and overly permissive network policies are configuration issues enabling SSRF
- `principle-fail-fast` -- URL validation must reject invalid URLs immediately, not attempt to normalize and continue
- `principle-encapsulation` -- URL fetching should be encapsulated in a hardened HTTP client wrapper that enforces SSRF protections

## Authoritative References

- [OWASP Top 10:2021 -- A10 Server-Side Request Forgery (SSRF)](https://owasp.org/Top10/A10_2021-Server-Side_Request_Forgery_%28SSRF%29/)
- [CWE-918: Server-Side Request Forgery (SSRF)](https://cwe.mitre.org/data/definitions/918.html)
- [OWASP SSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
- [PortSwigger Web Security Academy: Server-Side Request Forgery](https://portswigger.net/web-security/ssrf)
- [AWS: Use IMDSv2 to mitigate SSRF](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html)
- [Orange Tsai, "A New Era of SSRF" (BlackHat 2017) -- URL parsing inconsistencies](https://www.blackhat.com/docs/us-17/thursday/us-17-Tsai-A-New-Era-Of-SSRF-Exploiting-URL-Parser-In-Trending-Programming-Languages.pdf)
- [HackerOne: Top SSRF Reports](https://www.hackerone.com/vulnerability-and-security-testing/how-server-side-request-forgery-ssrf)
