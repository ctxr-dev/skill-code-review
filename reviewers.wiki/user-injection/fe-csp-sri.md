---
id: fe-csp-sri
type: primary
depth_role: leaf
focus: Detect missing or misconfigured Content-Security-Policy headers and missing Subresource Integrity hashes that leave applications vulnerable to XSS, script injection, and CDN compromise.
parents:
  - index.md
covers:
  - Missing Content-Security-Policy header entirely
  - CSP with unsafe-inline allowing inline script execution
  - "CSP with unsafe-eval allowing eval() and dynamic code generation"
  - Missing SRI hashes on scripts loaded from CDNs
  - "CSP nonce not rotated per request (reused static nonce)"
  - report-uri or report-to not configured for CSP violation monitoring
  - CSP in report-only mode left in production without enforcement
  - Overly permissive CSP with wildcard sources
  - Missing Trusted Types policy for DOM XSS prevention
  - "Script-src allowing data: or blob: URIs"
  - Missing X-Frame-Options header allowing iframe embedding by attackers
  - Missing or weak Content-Security-Policy frame-ancestors directive
  - "Missing Strict-Transport-Security (HSTS) header"
  - "Missing X-Content-Type-Options: nosniff header"
  - Missing or overly permissive Referrer-Policy
  - Missing Permissions-Policy header
  - "CSP with unsafe-eval allowing eval() and similar"
  - "CSP with wildcard (*) sources undermining the policy"
  - HSTS without includeSubDomains exposing subdomains to downgrade
  - "HSTS max-age too short (less than one year)"
  - CSP report-only mode left in production without enforcement
  - Security headers set in application code but overridden by reverse proxy
  - Inconsistent header configuration across endpoints or environments
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
aliases:
  - sec-clickjacking-and-headers
activation:
  file_globs:
    - "**/*.html"
    - "**/middleware.*"
    - "**/headers.*"
    - "**/next.config.*"
    - "**/nginx.conf"
    - "**/security-headers.*"
    - "**/helmet*"
  keyword_matches:
    - Content-Security-Policy
    - CSP
    - integrity=
    - nonce
    - unsafe-inline
    - unsafe-eval
    - script-src
    - helmet
    - report-uri
    - Trusted-Types
  structural_signals:
    - missing CSP header
    - unsafe-inline in CSP
    - missing SRI on CDN script
source:
  origin: file
  path: fe-csp-sri.md
  hash: "sha256:a3012dae6d778f49448676781e9f74d54ef9b303193fd02a039c2e532af6a762"
---
# Content-Security-Policy and Subresource Integrity Pitfalls

## When This Activates

Activates when diffs touch security header configuration, HTML templates with script/link tags, middleware setting response headers, or CSP policy definitions. CSP is the strongest browser-side defense against XSS -- but a single `unsafe-inline` or `unsafe-eval` in script-src undermines the entire policy. SRI ensures CDN-hosted scripts have not been tampered with -- but a missing `integrity` attribute means a compromised CDN can inject arbitrary code. This reviewer catches the CSP and SRI gaps that leave applications vulnerable despite having security headers in place.

## Audit Surface

- [ ] Application serving HTML responses without Content-Security-Policy header
- [ ] CSP script-src containing 'unsafe-inline' without nonce or hash fallback
- [ ] CSP script-src containing 'unsafe-eval'
- [ ] CSP default-src or script-src containing wildcard (*)
- [ ] Script or link tag loading from CDN without integrity attribute
- [ ] Script tag with integrity attribute but missing crossorigin='anonymous'
- [ ] CSP nonce attribute with a static value (same across requests)
- [ ] CSP report-uri or report-to directive missing
- [ ] Content-Security-Policy-Report-Only without corresponding enforcing policy in production
- [ ] CSP script-src including data: or blob: URI schemes
- [ ] Missing require-trusted-types-for directive for applications using innerHTML
- [ ] CSP frame-ancestors missing (clickjacking vector)
- [ ] Style-src with unsafe-inline without nonce for CSS-in-JS frameworks

## Detailed Checks

### CSP Policy Completeness
<!-- activation: keywords=["Content-Security-Policy", "CSP", "script-src", "default-src", "style-src", "connect-src", "helmet"] -->

- [ ] **No CSP header**: flag applications serving HTML without any Content-Security-Policy header -- without CSP, the browser allows all script sources, inline scripts, and eval(), leaving the application fully vulnerable to XSS; even a basic CSP provides significant protection; see `sec-xss-dom`
- [ ] **Missing frame-ancestors**: flag CSP policies without a `frame-ancestors` directive -- this allows the page to be embedded in iframes on any domain, enabling clickjacking attacks; see `sec-clickjacking-and-headers`
- [ ] **Report-only without enforcement**: flag production deployments using only `Content-Security-Policy-Report-Only` without a corresponding enforcing `Content-Security-Policy` header -- report-only logs violations but does not block them; it should be used for policy testing, not as the sole production policy
- [ ] **Missing connect-src**: flag CSP policies that do not restrict `connect-src` -- without it, XSS payloads can exfiltrate data to any domain via fetch, XMLHttpRequest, or WebSocket

### unsafe-inline and unsafe-eval
<!-- activation: keywords=["unsafe-inline", "unsafe-eval", "nonce", "hash", "strict-dynamic", "eval("] -->

- [ ] **unsafe-inline in script-src**: flag CSP with `'unsafe-inline'` in script-src -- this allows any inline script to execute, completely defeating CSP's XSS protection; migrate to nonces (`'nonce-{random}'`) or hashes (`'sha256-{hash}'`) for legitimate inline scripts
- [ ] **unsafe-eval in script-src**: flag CSP with `'unsafe-eval'` in script-src -- this allows eval(), new Function(), setTimeout(string), and setInterval(string), enabling code injection attacks; refactor code to avoid eval-based patterns; see `fe-build-webpack` for devtool eval concerns
- [ ] **Wildcard source**: flag CSP with `*` in default-src or script-src -- a wildcard allows scripts from any domain, enabling attackers to host malicious scripts on any CDN; use explicit domain allowlists
- [ ] **data: or blob: in script-src**: flag CSP allowing `data:` or `blob:` in script-src -- attackers can construct data: or blob: URIs containing malicious scripts that bypass domain restrictions

### Nonce Management
<!-- activation: keywords=["nonce", "nonce-", "crypto", "randomBytes", "generateNonce"] -->

- [ ] **Static nonce**: flag CSP nonces that use a hardcoded or static value (e.g., `nonce-abc123` in a configuration file) -- nonces must be cryptographically random and unique per response; a static nonce is equivalent to unsafe-inline since the attacker knows the value
- [ ] **Nonce not propagated to inline scripts**: flag CSP with nonce-based policy where inline script tags do not carry the matching `nonce` attribute -- scripts without the nonce are blocked, breaking functionality
- [ ] **Missing strict-dynamic**: flag CSP with nonces that does not include `'strict-dynamic'` -- strict-dynamic allows scripts loaded by nonced scripts to execute without individual nonce/hash entries, simplifying CSP for applications that dynamically load scripts

### Subresource Integrity
<!-- activation: keywords=["integrity=", "crossorigin", "cdn", "unpkg", "cdnjs", "jsdelivr", "cloudflare", "script src="] -->

- [ ] **CDN script without SRI**: flag `<script src="https://cdn...">` or `<link href="https://cdn...">` loading third-party resources from CDNs without an `integrity` attribute -- if the CDN is compromised, the attacker's modified script executes in the user's browser; add SRI hash
- [ ] **SRI without crossorigin**: flag tags with `integrity` attribute but missing `crossorigin="anonymous"` -- SRI verification fails for cross-origin resources without the crossorigin attribute, and the browser falls back to loading without integrity checking
- [ ] **Outdated SRI hash**: flag SRI hashes that do not match the current version of the CDN resource being loaded -- version upgrades require updating the integrity hash; mismatched hashes block the resource entirely

### Trusted Types and Advanced Policies
<!-- activation: keywords=["Trusted-Types", "trustedTypes", "require-trusted-types-for", "createPolicy", "innerHTML", "DOMPurify"] -->

- [ ] **Missing Trusted Types**: flag applications that use innerHTML, document.write, or other DOM XSS sinks without a `require-trusted-types-for 'script'` CSP directive -- Trusted Types force all dangerous sink operations through a policy function, providing defense-in-depth against DOM XSS; see `sec-xss-dom`
- [ ] **Missing violation reporting**: flag CSP policies without `report-uri` or `report-to` directive -- without reporting, CSP violations go unnoticed and policy refinement is impossible
- [ ] **CSS-in-JS unsafe-inline**: flag style-src with `'unsafe-inline'` in projects using CSS-in-JS (styled-components, emotion) -- use nonces for style injection instead; some CSS-in-JS libraries support nonce propagation

## Common False Positives

- **unsafe-inline for legacy migration**: projects actively migrating to nonce-based CSP may temporarily need unsafe-inline as a fallback during transition.
- **unsafe-eval for development**: development environments with webpack eval-based devtools legitimately need unsafe-eval; only flag production configurations.
- **Report-only for new policies**: deploying a new CSP in report-only mode for monitoring before enforcement is a correct practice.
- **SRI on self-hosted scripts**: scripts served from the same origin do not need SRI since the server controls the content.
- **No CSP on non-HTML responses**: API endpoints returning JSON do not need CSP headers.

## Severity Guidance

| Finding | Severity |
|---|---|
| No Content-Security-Policy header on HTML responses | Critical |
| unsafe-inline in script-src in production | Critical |
| unsafe-eval in script-src in production | Critical |
| CDN script without SRI integrity hash | Critical |
| Static nonce reused across requests | Critical |
| Wildcard (*) in script-src or default-src | Important |
| data: or blob: allowed in script-src | Important |
| Missing frame-ancestors (clickjacking) | Important |
| Report-only without enforcing policy in production | Important |
| Missing CSP violation reporting | Minor |
| SRI without crossorigin attribute | Minor |
| Missing Trusted Types for DOM sink protection | Minor |

## See Also

- `sec-xss-dom` -- CSP is the primary defense against XSS; DOM XSS bypasses need Trusted Types
- `sec-clickjacking-and-headers` -- frame-ancestors in CSP replaces X-Frame-Options for clickjacking protection
- `fe-build-webpack` -- webpack devtool eval modes conflict with CSP unsafe-eval restrictions
- `fe-build-vite` -- Vite dev server may require CSP adjustments for HMR
- `fe-service-worker-pwa` -- service worker scripts must comply with CSP

## Authoritative References

- [MDN -- "Content-Security-Policy"](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy)
- [MDN -- "Subresource Integrity"](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity)
- [web.dev -- "Content Security Policy"](https://web.dev/articles/csp)
- [Google -- "CSP Evaluator"](https://csp-evaluator.withgoogle.com/)
- [W3C -- "Trusted Types"](https://w3c.github.io/trusted-types/dist/spec/)
- [OWASP -- "Content Security Policy Cheat Sheet"](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
