---
id: sec-owasp-a05-misconfiguration
type: primary
depth_role: leaf
focus: Detect security misconfigurations including debug mode in production, missing security headers, default credentials, verbose error exposure, and unnecessary features enabled
parents:
  - index.md
covers:
  - Debug mode or development settings enabled in production configuration
  - "Default credentials (admin/admin, root/root) left in configuration or code"
  - Unnecessary features, services, ports, or HTTP methods enabled
  - Stack traces and internal error details exposed to end users
  - Directory listing enabled on web servers
  - "Security headers missing (CSP, HSTS, X-Content-Type-Options, X-Frame-Options)"
  - Verbose error messages leaking internal paths, versions, or technology stack
  - Default admin consoles or management endpoints accessible without restriction
  - Permissive CORS configuration deployed to production
  - Development dependencies or debug tools included in production builds
  - "Unnecessary HTTP methods (TRACE, OPTIONS) enabled without restriction"
  - Cloud storage buckets or services configured with public access
  - "Security cookie flags missing (Secure, HttpOnly, SameSite)"
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
activation:
  file_globs:
    - "**/*config*"
    - "**/*settings*"
    - "**/*.yaml"
    - "**/*.yml"
    - "**/*.toml"
    - "**/*.ini"
    - "**/*.conf"
    - "**/*.env*"
    - "**/*.properties"
    - "**/Dockerfile*"
    - "**/docker-compose*"
    - "**/nginx*"
    - "**/apache*"
    - "**/httpd*"
    - "**/*webpack*"
    - "**/*vite*"
    - "**/package.json"
    - "**/Gemfile"
    - "**/requirements*.txt"
    - "**/pom.xml"
    - "**/build.gradle*"
  keyword_matches:
    - debug
    - DEBUG
    - config
    - production
    - prod
    - deploy
    - default
    - admin
    - console
    - header
    - CORS
    - verbose
    - error
    - stack
    - trace
    - expose
    - enable
    - disable
    - allow
    - cookie
    - secure
    - httponly
    - samesite
    - actuator
    - devtools
    - profiler
    - autoindex
    - directory
    - listing
  structural_signals:
    - Configuration file change
    - Error handler or middleware definition
    - Web server configuration block
    - Docker or deployment configuration
    - Dependency file change
source:
  origin: file
  path: sec-owasp-a05-misconfiguration.md
  hash: "sha256:838d91182d290a63e297023b7e0aba06f3bab13ec7af29bc54aab747a7309215"
---
# Security Misconfiguration (OWASP A05:2021)

## When This Activates

Activates when diffs touch configuration files, deployment manifests, error handling middleware, web server configuration, security header setup, or dependency declarations. Security misconfiguration is pervasive because every application has configuration, and the secure setting is rarely the default. This reviewer checks for insecure defaults that were not changed, development settings that leaked to production, missing hardening measures, and unnecessary attack surface left enabled.

**Primary CWEs**: CWE-16 (Configuration), CWE-209 (Generation of Error Message Containing Sensitive Information), CWE-1004 (Sensitive Cookie Without HttpOnly Flag), CWE-614 (Sensitive Cookie in HTTPS Session Without Secure Attribute).

## Audit Surface

- [ ] DEBUG=True, debug=true, or equivalent in production configuration files
- [ ] Default username/password pair in configuration, seed data, or initialization code
- [ ] Stack trace or exception detail in HTTP error response body
- [ ] Directory listing enabled in web server config (autoindex on, Options +Indexes)
- [ ] Missing Content-Security-Policy header in HTTP responses
- [ ] Missing Strict-Transport-Security header or max-age below 31536000
- [ ] Missing X-Content-Type-Options: nosniff header
- [ ] Missing X-Frame-Options or CSP frame-ancestors directive
- [ ] Verbose error handler returning database errors, file paths, or version info to client
- [ ] Admin panel (Django admin, phpMyAdmin, Spring Boot Actuator) on public interface
- [ ] CORS configured with wildcard or reflected origin in production
- [ ] TRACE or TRACK HTTP method enabled
- [ ] Session cookie missing Secure, HttpOnly, or SameSite attribute
- [ ] Development dependency (debug toolbar, profiler, hot-reload) in production bundle
- [ ] Cloud storage bucket policy with public read or write access
- [ ] Exposed .git, .env, .DS_Store, or backup files accessible via web
- [ ] XML parser with default (permissive) entity processing configuration
- [ ] Logging configured at DEBUG level in production

## Detailed Checks

### Debug Mode and Development Settings
<!-- activation: keywords=["DEBUG", "debug", "development", "dev", "devtools", "hot-reload", "livereload", "sourcemap", "source-map", "profiler", "toolbar", "verbose", "FLASK_DEBUG", "DJANGO_DEBUG", "NODE_ENV"] -->

- [ ] **Django DEBUG=True**: flag `DEBUG = True` in settings files that could reach production (settings.py without environment gating, settings/production.py). DEBUG=True exposes full stack traces, SQL queries, template context, and the Django debug toolbar to all users
- [ ] **Flask debug mode**: flag `app.run(debug=True)`, `FLASK_DEBUG=1`, or `FLASK_ENV=development` in production deployments -- debug mode enables the Werkzeug interactive debugger, which allows arbitrary code execution from the browser
- [ ] **Node.js NODE_ENV not set to production**: flag configurations where `NODE_ENV` is set to `development` or is absent in production Dockerfiles and deployment configs -- frameworks like Express disable security features and expose verbose errors in non-production mode
- [ ] **Spring Boot DevTools in production**: flag `spring-boot-devtools` as a compile/runtime dependency (not in devOnly or testImplementation scope) -- DevTools enables remote debugging, auto-restart, and live reload in production
- [ ] **Source maps in production**: flag webpack/vite/esbuild configurations that generate source maps for production builds without restricting access -- source maps expose the complete original source code
- [ ] **Debug logging in production**: flag logging configuration set to DEBUG or TRACE level in production configs -- debug logs may contain sensitive data (request bodies, tokens, PII) and generate excessive volume

### Security Headers
<!-- activation: keywords=["header", "Content-Security-Policy", "CSP", "Strict-Transport-Security", "HSTS", "X-Content-Type-Options", "X-Frame-Options", "X-XSS-Protection", "Referrer-Policy", "Permissions-Policy", "helmet", "secure_headers"] -->

- [ ] **Missing Content-Security-Policy**: flag web applications without a CSP header -- CSP is the primary defense against XSS after output encoding. At minimum, set `default-src 'self'` and tighten from there. Flag `unsafe-inline` and `unsafe-eval` directives as they weaken CSP significantly
- [ ] **Missing or weak HSTS**: flag HTTPS applications without `Strict-Transport-Security` or with `max-age` less than 31536000 (one year). Missing HSTS allows SSL stripping attacks. Include `includeSubDomains` when all subdomains support HTTPS
- [ ] **Missing X-Content-Type-Options**: flag responses without `X-Content-Type-Options: nosniff` -- without it, browsers may MIME-sniff responses and execute uploaded files as scripts
- [ ] **Missing clickjacking protection**: flag responses without `X-Frame-Options: DENY` (or SAMEORIGIN) or `Content-Security-Policy: frame-ancestors 'none'` -- missing frame protection enables clickjacking attacks
- [ ] **Missing Referrer-Policy**: flag applications without `Referrer-Policy` header -- the default browser behavior leaks the full URL (including query parameters with tokens) in the Referer header to third-party sites
- [ ] **Helmet/secure_headers not configured**: flag Express.js applications without `helmet()` middleware or Rails applications without `config.action_dispatch.default_headers` hardened -- these libraries set multiple security headers with a single configuration

### Error Handling and Information Leakage (CWE-209)
<!-- activation: keywords=["error", "exception", "stack", "trace", "traceback", "500", "Internal Server Error", "detail", "message", "dump", "render_exception", "showDetailedErrors", "include_stacktrace"] -->

- [ ] **Stack traces in HTTP responses**: flag error handlers that include exception stack traces, class names, file paths, or line numbers in responses sent to clients. Production error responses should return a generic message and correlation ID, with details logged server-side only
- [ ] **Database error messages exposed**: flag error responses containing SQL error messages, database table names, column names, or connection strings -- these reveal the database schema and technology to attackers
- [ ] **Framework version disclosure**: flag HTTP headers or error pages that reveal the application framework and version (X-Powered-By, Server header with version) -- version disclosure helps attackers find known CVEs
- [ ] **Spring Boot Actuator exposed**: flag Spring Boot Actuator endpoints (`/actuator/env`, `/actuator/beans`, `/actuator/heapdump`, `/actuator/configprops`) accessible without authentication -- these expose environment variables (including secrets), bean configuration, and heap dumps
- [ ] **PHP phpinfo() accessible**: flag `phpinfo()` calls or pages accessible in production -- phpinfo exposes the entire PHP configuration, environment variables, and installed modules
- [ ] **Detailed validation errors**: flag validation error responses that reveal internal field names, database constraints, or business rules that help attackers craft valid inputs

### Cookie Security (CWE-1004, CWE-614)
<!-- activation: keywords=["cookie", "Cookie", "set-cookie", "Set-Cookie", "session", "Secure", "HttpOnly", "SameSite", "httponly", "secure", "samesite", "express-session", "cookie-session"] -->

- [ ] **Missing Secure flag**: flag session cookies and authentication cookies set without the `Secure` attribute -- without it, the cookie is sent over HTTP connections, exposing it to network sniffing
- [ ] **Missing HttpOnly flag**: flag session cookies set without `HttpOnly` -- without it, JavaScript can read the cookie via `document.cookie`, enabling session theft through XSS
- [ ] **Missing or lax SameSite**: flag session cookies without `SameSite=Strict` or `SameSite=Lax` -- without SameSite, cookies are sent on cross-site requests, enabling CSRF. `SameSite=None` requires `Secure` and should only be used for legitimate cross-site scenarios (embedded iframes, OAuth callbacks)
- [ ] **Overly broad cookie scope**: flag cookies with `Domain` set to a parent domain (e.g., `.example.com` when only `app.example.com` needs it) or `Path=/` when a narrower path is appropriate -- broader scope increases exposure to subdomain takeover and other attacks

### Default and Unnecessary Features
<!-- activation: keywords=["default", "admin", "console", "panel", "management", "actuator", "phpMyAdmin", "swagger", "api-docs", "graphiql", "playground", "TRACE", "OPTIONS", "methods", "allow", "enable", "install"] -->

- [ ] **Default credentials**: flag configuration files, database initialization scripts, or seed data containing default username/password pairs (`admin/admin`, `root/password`, `test/test`, `changeme`) that could reach production -- even "temporary" defaults get deployed
- [ ] **Admin panels on public interface**: flag admin consoles (Django admin, Rails admin, phpMyAdmin, Adminer, Spring Boot Admin) accessible on the same host and port as the public application without additional authentication or IP restriction
- [ ] **API documentation endpoints in production**: flag Swagger UI, GraphiQL, API playground, or OpenAPI spec endpoints accessible in production without authentication -- these provide attackers a complete map of all endpoints, parameters, and data types
- [ ] **Unnecessary HTTP methods**: flag web server or framework configuration that enables TRACE (enables cross-site tracing, leaks cookies), DELETE, or PUT methods on endpoints that should only accept GET and POST
- [ ] **Exposed infrastructure files**: flag web server configurations that do not block access to `.git/`, `.env`, `.DS_Store`, `*.bak`, `*.sql`, `web.config`, or other sensitive files that should never be served
- [ ] **Development packages in production**: flag `devDependencies` installed in production Docker images (npm install without --production or --omit=dev), debug gems in Gemfile production group, or test dependencies in the production classpath

### Cloud and Infrastructure Configuration
<!-- activation: keywords=["bucket", "s3", "gcs", "blob", "storage", "public", "acl", "policy", "terraform", "cloudformation", "kubernetes", "k8s", "helm", "docker", "container", "privileged", "root"] -->

- [ ] **Public cloud storage**: flag S3 bucket policies, GCS bucket ACLs, or Azure Blob container policies that grant public read or write access unless the bucket is explicitly intended for public static assets
- [ ] **Container running as root**: flag Dockerfiles without `USER` directive (defaults to root) or Kubernetes manifests with `runAsUser: 0` or `privileged: true` -- containers should run as non-root with minimal privileges
- [ ] **Secrets in environment variables in manifests**: flag Kubernetes manifests, docker-compose files, or CI/CD configs with secrets as plaintext environment variables instead of references to a secrets manager or sealed secrets
- [ ] **Overly permissive IAM policies**: flag IAM policies with `Action: "*"` or `Resource: "*"` -- follow least-privilege: grant only the specific actions on specific resources needed

## Common False Positives

- **Development-only configuration files**: files like `settings/development.py`, `config/development.yaml`, or `.env.development` are intended to have debug settings enabled. Flag only when these settings could reach production (e.g., no environment gating, shared config file).
- **Test configurations**: test fixtures and test configuration files may intentionally use weak settings, default credentials, or disabled security features. Valid when clearly scoped to test execution only.
- **CSP in report-only mode**: `Content-Security-Policy-Report-Only` is a valid deployment strategy for rolling out CSP. It does not enforce the policy but collects violation reports. Flag only if report-only has been in place for an extended period with no plan to enforce.
- **Internal tooling**: monitoring dashboards, admin panels, and actuator endpoints behind a VPN, bastion host, or service mesh with mTLS are appropriately secured by network controls. Verify the network restriction exists.
- **Intentionally public storage buckets**: CDN origins, public documentation sites, and open-source release buckets are intentionally public. Verify the bucket contains only intended public content.

## Severity Guidance

| Finding | Severity |
|---|---|
| Debug mode enabled in production (Flask debugger, Django DEBUG=True) | Critical |
| Default credentials in production configuration or deployment | Critical |
| Spring Boot Actuator /heapdump or /env exposed without auth | Critical |
| Cloud storage bucket with public write access | Critical |
| Stack trace with internal paths and query details in HTTP error response | Important |
| Session cookie missing Secure or HttpOnly flag | Important |
| Missing Content-Security-Policy header | Important |
| Missing HSTS header on HTTPS application | Important |
| Admin panel accessible on public interface without additional auth | Important |
| API documentation (Swagger, GraphiQL) accessible in production without auth | Important |
| Source maps included in production build without access restriction | Important |
| Container running as root with no security context | Important |
| Missing X-Content-Type-Options: nosniff | Minor |
| Missing Referrer-Policy header | Minor |
| Framework version disclosed in Server or X-Powered-By header | Minor |
| DEBUG logging level in production (no sensitive data confirmed) | Minor |

## See Also

- `principle-fail-fast` -- secure defaults should be enforced at startup; missing configuration should fail the application rather than falling back to insecure defaults
- `principle-separation-of-concerns` -- security configuration should be centralized, not scattered across handler files
- `sec-owasp-a01-broken-access-control` -- CORS misconfiguration and exposed admin endpoints are also access control failures
- `sec-owasp-a02-crypto-failures` -- TLS misconfiguration and cookie security overlap with cryptographic failures
- `sec-owasp-a03-injection` -- verbose error messages can aid injection attacks by revealing query structure

## Authoritative References

- [OWASP Top 10:2021 - A05 Security Misconfiguration](https://owasp.org/Top10/A05_2021-Security_Misconfiguration/)
- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [OWASP Testing Guide - Configuration and Deployment Management Testing](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/02-Configuration_and_Deployment_Management_Testing/)
- [CWE-16: Configuration](https://cwe.mitre.org/data/definitions/16.html)
- [CWE-209: Generation of Error Message Containing Sensitive Information](https://cwe.mitre.org/data/definitions/209.html)
- [Mozilla Web Security Guidelines](https://infosec.mozilla.org/guidelines/web_security)
- [CIS Benchmarks](https://www.cisecurity.org/cis-benchmarks) -- platform-specific hardening guides for web servers, containers, and cloud services
