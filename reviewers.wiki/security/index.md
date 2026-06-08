---
id: security
type: index
depth_role: subcategory
depth: 1
focus: "security: Detect cookie consent and tracking-pixel compliance gaps including tracking scripts loading before consent, missing or asymmetric consent banner, uncategorized consent, ad-tech pixels firing pre-consent, missing IAB TCF v2.2 in..."
parents:
  - "../index.md"
shared_covers: []
tags:
  - a07
  - a08
  - a10
  - abac
  - access-control
  - adtech
  - algorithm
  - allowlist
  - artifact
  - attack-surface
  - attestation
  - authenticated-encryption
  - authentication
  - authorization
  - billion-laughs
  - binaryformatter
  - bola
  - browser-security
  - business-logic
  - cache-deception
generator: "skill-llm-wiki/v1"
entries:
  - id: cookie-consent-tracking-pixel-compliance
    file: cookie-consent-tracking-pixel-compliance.md
    type: primary
    focus: Detect cookie consent and tracking-pixel compliance gaps including tracking scripts loading before consent, missing or asymmetric consent banner, uncategorized consent, ad-tech pixels firing pre-consent, missing IAB TCF v2.2 integration, consent not persisted across loads, and dark-pattern UI
    tags:
      - cookie
      - consent
      - tracking
      - pixel
      - gdpr
      - ccpa
      - cpra
      - eprivacy
      - iab-tcf
      - dark-patterns
      - adtech
  - id: crypto-jwt-pitfalls
    file: crypto-jwt-pitfalls.md
    type: primary
    focus: Detect JWT security pitfalls including algorithm confusion, missing claim validation, and unsafe token storage
    tags:
      - jwt
      - authentication
      - token
      - cryptography
      - CWE-345
      - CWE-347
      - CWE-290
  - id: crypto-nonce-iv-management
    file: crypto-nonce-iv-management.md
    type: primary
    focus: Detect static, reused, or improperly generated initialization vectors and nonces in symmetric encryption
    tags:
      - cryptography
      - nonce
      - IV
      - initialization-vector
      - GCM
      - CTR
      - CBC
      - CWE-329
      - CWE-330
  - id: crypto-oauth-oidc-pitfalls
    file: crypto-oauth-oidc-pitfalls.md
    type: primary
    focus: Detect OAuth 2.0 and OpenID Connect security pitfalls including deprecated flows, missing PKCE, and token mishandling
    tags:
      - oauth
      - oidc
      - authentication
      - authorization
      - token
      - CWE-346
      - CWE-352
      - CWE-601
  - id: crypto-padding-oracle
    file: crypto-padding-oracle.md
    type: primary
    focus: Detect padding oracle attack surfaces arising from unauthenticated CBC encryption and distinguishable error responses
    tags:
      - cryptography
      - padding-oracle
      - CBC
      - authenticated-encryption
      - MAC
      - HMAC
      - CWE-354
      - CWE-347
  - id: crypto-timing-attacks
    file: crypto-timing-attacks.md
    type: primary
    focus: Detect timing side-channel vulnerabilities in cryptographic comparison and verification operations
    tags:
      - cryptography
      - timing-attack
      - side-channel
      - constant-time
      - HMAC
      - token-verification
      - CWE-208
  - id: crypto-webauthn-passkeys
    file: crypto-webauthn-passkeys.md
    type: primary
    focus: Detect WebAuthn, Passkeys, and FIDO2 security pitfalls including challenge replay, origin validation, and credential binding errors
    tags:
      - webauthn
      - passkeys
      - fido2
      - authentication
      - mfa
      - CWE-287
      - CWE-346
  - id: sec-csrf
    file: sec-csrf.md
    type: primary
    focus: Detect Cross-Site Request Forgery vulnerabilities where state-changing requests lack proper anti-CSRF protections.
    tags:
      - csrf
      - cross-site-request-forgery
      - session-security
      - cookies
      - authentication
      - CWE-352
  - id: sec-deserialization
    file: sec-deserialization.md
    type: primary
    focus: Detect insecure deserialization patterns across all major languages where untrusted data is deserialized into executable object graphs
    tags:
      - deserialization
      - insecure-deserialization
      - RCE
      - gadget-chain
      - pickle
      - ObjectInputStream
      - BinaryFormatter
      - marshal
      - serialize
      - CWE-502
      - owasp
      - a08
      - integrity
      - SRI
      - CDN
      - "CI/CD"
      - artifact
      - signing
      - supply-chain
      - security
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
  - id: sec-idor-and-mass-assignment
    file: sec-idor-and-mass-assignment.md
    type: primary
    focus: Detect Insecure Direct Object Reference and Mass Assignment vulnerabilities where user-supplied identifiers access resources without ownership checks or request bodies bind directly to data models without field allowlists.
    tags:
      - idor
      - bola
      - mass-assignment
      - access-control
      - authorization
      - CWE-639
      - CWE-915
      - CWE-284
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
  - id: sec-owasp-a01-broken-access-control
    file: sec-owasp-a01-broken-access-control.md
    type: primary
    focus: Detect missing or bypassable authorization checks that allow users to act outside their intended permissions
    tags:
      - owasp
      - access-control
      - authorization
      - IDOR
      - CORS
      - path-traversal
      - privilege-escalation
      - RBAC
      - ABAC
      - JWT
      - CWE-284
      - CWE-285
      - CWE-639
      - CWE-22
      - CWE-862
      - CWE-863
  - id: sec-owasp-a02-crypto-failures
    file: sec-owasp-a02-crypto-failures.md
    type: primary
    focus: Detect use of weak cryptographic algorithms, insecure key management, and missing encryption for sensitive data in transit and at rest
    tags:
      - owasp
      - cryptography
      - encryption
      - hashing
      - TLS
      - key-management
      - password-storage
      - sensitive-data
      - CWE-327
      - CWE-328
      - CWE-326
      - CWE-319
      - CWE-312
      - CWE-916
      - algorithm
      - cipher
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
  - id: sec-owasp-a04-insecure-design
    file: sec-owasp-a04-insecure-design.md
    type: primary
    focus: Detect missing security controls that stem from flawed design -- absent rate limiting, business logic flaws, missing trust boundaries, and insufficient resource constraints
    tags:
      - owasp
      - insecure-design
      - rate-limiting
      - business-logic
      - race-condition
      - trust-boundary
      - resource-limits
      - TOCTOU
      - CWE-799
      - CWE-770
      - CWE-307
      - CWE-362
      - CWE-840
  - id: sec-owasp-a05-misconfiguration
    file: sec-owasp-a05-misconfiguration.md
    type: primary
    focus: Detect security misconfigurations including debug mode in production, missing security headers, default credentials, verbose error exposure, and unnecessary features enabled
    tags:
      - owasp
      - misconfiguration
      - security-headers
      - debug-mode
      - default-credentials
      - error-handling
      - hardening
      - CWE-16
      - CWE-209
      - CWE-1004
      - CWE-614
  - id: sec-owasp-a07-authn-failures
    file: sec-owasp-a07-authn-failures.md
    type: primary
    focus: Detect weak authentication mechanisms, insecure session management, and credential handling flaws
    tags:
      - owasp
      - a07
      - authentication
      - session
      - jwt
      - cookie
      - credential
      - password
      - mfa
      - login
      - security
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
  - id: sec-path-traversal-and-file-uploads
    file: sec-path-traversal-and-file-uploads.md
    type: primary
    focus: Detect path traversal vulnerabilities and insecure file upload handling that enable unauthorized file access, code execution, or denial of service
    tags:
      - path-traversal
      - directory-traversal
      - file-upload
      - zip-slip
      - symlink
      - LFI
      - RFI
      - CWE-22
      - CWE-434
      - CWE-73
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
  - id: sec-supply-chain-sbom-slsa-sigstore
    file: sec-supply-chain-sbom-slsa-sigstore.md
    type: primary
    focus: Detect supply chain vulnerabilities including unpinned dependencies, mutable image tags, missing lock files, unsigned artifacts, absent SBOM generation, and dependency confusion risks
    tags:
      - supply-chain
      - sbom
      - slsa
      - sigstore
      - cosign
      - dependency-management
      - lock-file
      - pinning
      - provenance
      - dependency-confusion
      - CWE-829
      - CWE-494
      - CWE-1104
      - container
      - cyclonedx
      - spdx
      - syft
      - attestation
      - OCI
      - CWE-1395
  - id: sec-threat-modeling-stride-dread-linddun
    file: sec-threat-modeling-stride-dread-linddun.md
    type: primary
    focus: Systematic threat analysis of trust boundary changes, new attack surfaces, and data flow modifications using STRIDE, DREAD, and LINDDUN frameworks
    tags:
      - threat-modeling
      - stride
      - dread
      - linddun
      - trust-boundary
      - attack-surface
      - data-flow
      - privacy
      - escalation-reviewer
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
  - id: sec-xxe-and-xml-parsers
    file: sec-xxe-and-xml-parsers.md
    type: primary
    focus: Detect XML External Entity injection and XML parser misconfigurations that enable file disclosure, SSRF, or denial of service
    tags:
      - XXE
      - XML
      - external-entity
      - DTD
      - billion-laughs
      - XSLT
      - XInclude
      - SOAP
      - SVG
      - CWE-611
      - CWE-776
      - CWE-827
      - saml
      - sso
      - authentication
      - xml
      - signature
      - CWE-347
      - CWE-290
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Security

**Focus:** security: Detect cookie consent and tracking-pixel compliance gaps including tracking scripts loading before consent, missing or asymmetric consent banner, uncategorized consent, ad-tech pixels firing pre-consent, missing IAB TCF v2.2 in...

## Children

| File | Type | Focus |
|------|------|-------|
| [cookie-consent-tracking-pixel-compliance.md](cookie-consent-tracking-pixel-compliance.md) | 📄 primary | Detect cookie consent and tracking-pixel compliance gaps including tracking scripts loading before consent, missing or asymmetric consent banner, uncategorized consent, ad-tech pixels firing pre-consent, missing IAB TCF v2.2 integration, consent not persisted across loads, and dark-pattern UI |
| [crypto-jwt-pitfalls.md](crypto-jwt-pitfalls.md) | 📄 primary | Detect JWT security pitfalls including algorithm confusion, missing claim validation, and unsafe token storage |
| [crypto-nonce-iv-management.md](crypto-nonce-iv-management.md) | 📄 primary | Detect static, reused, or improperly generated initialization vectors and nonces in symmetric encryption |
| [crypto-oauth-oidc-pitfalls.md](crypto-oauth-oidc-pitfalls.md) | 📄 primary | Detect OAuth 2.0 and OpenID Connect security pitfalls including deprecated flows, missing PKCE, and token mishandling |
| [crypto-padding-oracle.md](crypto-padding-oracle.md) | 📄 primary | Detect padding oracle attack surfaces arising from unauthenticated CBC encryption and distinguishable error responses |
| [crypto-timing-attacks.md](crypto-timing-attacks.md) | 📄 primary | Detect timing side-channel vulnerabilities in cryptographic comparison and verification operations |
| [crypto-webauthn-passkeys.md](crypto-webauthn-passkeys.md) | 📄 primary | Detect WebAuthn, Passkeys, and FIDO2 security pitfalls including challenge replay, origin validation, and credential binding errors |
| [sec-csrf.md](sec-csrf.md) | 📄 primary | Detect Cross-Site Request Forgery vulnerabilities where state-changing requests lack proper anti-CSRF protections. |
| [sec-deserialization.md](sec-deserialization.md) | 📄 primary | Detect insecure deserialization patterns across all major languages where untrusted data is deserialized into executable object graphs |
| [sec-http-parameter-pollution.md](sec-http-parameter-pollution.md) | 📄 primary | Detect HTTP Parameter Pollution vulnerabilities where duplicate, overloaded, or inconsistently parsed parameters allow attackers to bypass security controls or inject unexpected values. |
| [sec-idor-and-mass-assignment.md](sec-idor-and-mass-assignment.md) | 📄 primary | Detect Insecure Direct Object Reference and Mass Assignment vulnerabilities where user-supplied identifiers access resources without ownership checks or request bodies bind directly to data models without field allowlists. |
| [sec-open-redirect.md](sec-open-redirect.md) | 📄 primary | Detect Open Redirect vulnerabilities where user-controlled input determines the target of HTTP redirects without validation against an allowlist. |
| [sec-owasp-a01-broken-access-control.md](sec-owasp-a01-broken-access-control.md) | 📄 primary | Detect missing or bypassable authorization checks that allow users to act outside their intended permissions |
| [sec-owasp-a02-crypto-failures.md](sec-owasp-a02-crypto-failures.md) | 📄 primary | Detect use of weak cryptographic algorithms, insecure key management, and missing encryption for sensitive data in transit and at rest |
| [sec-owasp-a03-injection.md](sec-owasp-a03-injection.md) | 📄 primary | Detect injection vulnerabilities where untrusted input is concatenated into queries, commands, templates, or interpreters without proper sanitization or parameterization |
| [sec-owasp-a04-insecure-design.md](sec-owasp-a04-insecure-design.md) | 📄 primary | Detect missing security controls that stem from flawed design -- absent rate limiting, business logic flaws, missing trust boundaries, and insufficient resource constraints |
| [sec-owasp-a05-misconfiguration.md](sec-owasp-a05-misconfiguration.md) | 📄 primary | Detect security misconfigurations including debug mode in production, missing security headers, default credentials, verbose error exposure, and unnecessary features enabled |
| [sec-owasp-a07-authn-failures.md](sec-owasp-a07-authn-failures.md) | 📄 primary | Detect weak authentication mechanisms, insecure session management, and credential handling flaws |
| [sec-owasp-a10-ssrf.md](sec-owasp-a10-ssrf.md) | 📄 primary | Detect server-side request forgery via user-controlled URLs passed to HTTP clients without validation or allowlisting |
| [sec-path-traversal-and-file-uploads.md](sec-path-traversal-and-file-uploads.md) | 📄 primary | Detect path traversal vulnerabilities and insecure file upload handling that enable unauthorized file access, code execution, or denial of service |
| [sec-request-smuggling-and-cache-poisoning.md](sec-request-smuggling-and-cache-poisoning.md) | 📄 primary | Detect HTTP request smuggling vectors and web cache poisoning patterns that exploit inconsistencies between proxies, backends, and caching layers |
| [sec-supply-chain-sbom-slsa-sigstore.md](sec-supply-chain-sbom-slsa-sigstore.md) | 📄 primary | Detect supply chain vulnerabilities including unpinned dependencies, mutable image tags, missing lock files, unsigned artifacts, absent SBOM generation, and dependency confusion risks |
| [sec-threat-modeling-stride-dread-linddun.md](sec-threat-modeling-stride-dread-linddun.md) | 📄 primary | Systematic threat analysis of trust boundary changes, new attack surfaces, and data flow modifications using STRIDE, DREAD, and LINDDUN frameworks |
| [sec-xss-dom.md](sec-xss-dom.md) | 📄 primary | Detect DOM-based Cross-Site Scripting where user-controlled data flows into dangerous browser APIs without sanitization. |
| [sec-xss-reflected.md](sec-xss-reflected.md) | 📄 primary | Detect Reflected Cross-Site Scripting where server-side code echoes user-supplied request data in HTTP responses without proper output encoding. |
| [sec-xxe-and-xml-parsers.md](sec-xxe-and-xml-parsers.md) | 📄 primary | Detect XML External Entity injection and XML parser misconfigurations that enable file disclosure, SSRF, or denial of service |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
