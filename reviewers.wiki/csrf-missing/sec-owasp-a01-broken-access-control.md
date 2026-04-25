---
id: sec-owasp-a01-broken-access-control
type: primary
depth_role: leaf
focus: Detect missing or bypassable authorization checks that allow users to act outside their intended permissions
parents:
  - index.md
covers:
  - Missing authorization checks on API endpoints or route handlers
  - "Insecure Direct Object References (IDOR) — accessing resources by ID without ownership verification"
  - Elevation of privilege via role or permission manipulation in user-controlled input
  - CORS misconfiguration allowing wildcard origins with credentials
  - Path traversal in file serving, upload, or download operations
  - API endpoints that bypass UI-only access restrictions
  - JWT claims accepted without signature verification or expiration checks
  - Role and permission checks enforced in UI only, absent from server-side logic
  - Directory listing or file browsing enabled on static asset servers
  - Metadata, actuator, or admin endpoints exposed without authentication
  - "Forced browsing to unauthenticated pages (admin panels, debug endpoints)"
  - HTTP method override or verb tampering to bypass authorization
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
activation:
  file_globs:
    - "**/*controller*"
    - "**/*handler*"
    - "**/*route*"
    - "**/*middleware*"
    - "**/*guard*"
    - "**/*policy*"
    - "**/*auth*"
    - "**/*permission*"
    - "**/*cors*"
    - "**/security*"
    - "**/*.yaml"
    - "**/*.yml"
    - "**/*.conf"
    - "**/*.config.*"
  keyword_matches:
    - auth
    - permission
    - role
    - access
    - ACL
    - RBAC
    - ABAC
    - authorize
    - policy
    - guard
    - middleware
    - cors
    - CORS
    - jwt
    - token
    - claim
    - isAdmin
    - canAccess
    - hasRole
    - hasPermission
    - "@PreAuthorize"
    - "[Authorize]"
    - allow_origins
    - path.join
    - sendFile
    - readFile
  structural_signals:
    - Route definition without authorization middleware
    - Database query using request parameter as primary key
    - CORS configuration block
    - JWT decode or verify call
    - File path concatenation with user input
source:
  origin: file
  path: sec-owasp-a01-broken-access-control.md
  hash: "sha256:c28b597de8d070fabc90a401432eceb1c6b8129ad61b2b5ac2bf247043215f5d"
---
# Broken Access Control (OWASP A01:2021)

## When This Activates

Activates when diffs touch route definitions, controller methods, authorization middleware, CORS configuration, file-serving logic, JWT handling, or any code that gates access to resources. Broken access control is the #1 OWASP Top 10 risk (2021) because it directly enables unauthorized data access, modification, and privilege escalation. Every endpoint that serves data or mutates state must enforce authorization server-side -- UI-only restrictions are trivially bypassed.

**Primary CWEs**: CWE-284 (Improper Access Control), CWE-285 (Improper Authorization), CWE-639 (Authorization Bypass Through User-Controlled Key), CWE-22 (Path Traversal), CWE-862 (Missing Authorization), CWE-863 (Incorrect Authorization).

## Audit Surface

- [ ] Route or endpoint handler missing authorization middleware or decorator
- [ ] Database query using user-supplied ID without verifying caller ownership
- [ ] Role or permission value accepted from request body, query param, or JWT without validation
- [ ] CORS configuration with Access-Control-Allow-Origin set to * alongside credentials
- [ ] File path constructed from user input without canonicalization or prefix check
- [ ] Server-side handler lacks the authorization check that the UI enforces
- [ ] JWT parsed but claims (sub, role, exp, aud) not verified against expected values
- [ ] Admin or internal endpoint accessible without authentication gate
- [ ] Directory listing enabled in web server or static file middleware config
- [ ] Actuator, health-check, or metrics endpoint exposed on public interface
- [ ] Missing @PreAuthorize, [Authorize], or equivalent decorator on controller method
- [ ] Multi-tenant query missing tenant_id filter or scoping
- [ ] HTTP method not restricted -- DELETE or PUT accepted where only GET is intended
- [ ] Session or token not invalidated on logout, role change, or password reset
- [ ] Horizontal privilege escalation -- user A can access user B resources by changing IDs
- [ ] Vertical privilege escalation -- normal user can access admin functions
- [ ] API versioning exposes older endpoints without current authorization rules
- [ ] GraphQL query or mutation missing authorization resolver

## Detailed Checks

### Missing Authorization on Endpoints (CWE-862)
<!-- activation: keywords=["route", "router", "app.get", "app.post", "app.put", "app.delete", "@GetMapping", "@PostMapping", "@RequestMapping", "@Controller", "def index", "def show", "def create", "def update", "def destroy", "HandleFunc", "http.Handle"] -->

- [ ] Every route handler has an explicit authorization check -- either middleware applied at the route/group level or a check inside the handler body. A handler with no authorization logic is open to any authenticated (or unauthenticated) user
- [ ] New endpoints added to an existing controller inherit the controller-level authorization, or have their own. Verify the new route is not accidentally outside the auth middleware group
- [ ] API endpoints that the UI never calls directly are still protected -- attackers call APIs directly, not through the UI
- [ ] Internal-only or admin endpoints are on a separate port, network, or behind an additional auth layer -- not just an undocumented URL path
- [ ] GraphQL resolvers enforce authorization per-field or per-type, not just at the query root -- nested resolvers can leak unauthorized data
- [ ] Webhook or callback endpoints validate the caller identity (signature verification, shared secret) rather than trusting any incoming request

### Insecure Direct Object Reference (CWE-639)
<!-- activation: keywords=["findById", "findOne", "get_object_or_404", "params[:id]", "req.params.id", "request.args.get", "PathVariable", "@Param", "WHERE id =", "pk=", "uuid="] -->

- [ ] Every database lookup by user-supplied ID includes an ownership or tenancy check: `WHERE id = :id AND owner_id = :currentUser` or equivalent scope. A bare `findById(req.params.id)` is an IDOR vulnerability
- [ ] Enumerable identifiers (sequential integers) are especially dangerous -- if the only barrier to accessing another user's data is guessing the next integer, access control is broken. Prefer UUIDs, but UUIDs alone are not authorization
- [ ] Bulk or list endpoints filter results to the caller's scope -- `SELECT * FROM orders` without `WHERE user_id = :caller` returns everyone's data
- [ ] File download or export endpoints verify the caller has access to the requested resource, not just that the resource exists
- [ ] Nested resource lookups verify the parent-child relationship: `/users/123/orders/456` must verify that order 456 belongs to user 123, and that the caller is user 123

### CORS Misconfiguration
<!-- activation: keywords=["CORS", "cors", "Access-Control-Allow-Origin", "allow_origins", "allowedOrigins", "origin", "credentials", "Access-Control-Allow-Credentials"] -->

- [ ] `Access-Control-Allow-Origin: *` is never used together with `Access-Control-Allow-Credentials: true` -- this combination allows any website to make authenticated cross-origin requests and read responses
- [ ] The origin is not blindly reflected from the request `Origin` header into `Access-Control-Allow-Origin` -- this is equivalent to wildcard and allows any site to make credentialed requests
- [ ] Allowed origins are an explicit allowlist of trusted domains, not a regex that can be bypassed (e.g., `.*example.com` matches `evilexample.com`)
- [ ] CORS configuration in development (allow all origins) is not deployed to production -- check for environment-conditional CORS settings
- [ ] Preflight responses do not expose sensitive headers or methods unnecessarily

### Path Traversal (CWE-22)
<!-- activation: keywords=["path.join", "os.path.join", "sendFile", "readFile", "open(", "File.new", "filepath.Join", "Paths.get", "../", "..\\", "filename", "upload", "download"] -->

- [ ] File paths constructed from user input are canonicalized (`realpath`, `Path.resolve`, `filepath.Abs`) and then verified to start with the expected base directory -- `path.join(base, userInput)` alone does not prevent `../` traversal
- [ ] File upload filenames are sanitized or replaced entirely -- the original filename from the client may contain `../`, null bytes, or OS-specific special characters
- [ ] Static file serving middleware is configured with a root directory and does not follow symlinks outside that root
- [ ] Archive extraction (zip, tar) validates that extracted paths do not escape the target directory (Zip Slip vulnerability)
- [ ] URL path parameters used to select files or templates are validated against an allowlist, not used as raw filesystem paths

### JWT and Token Validation
<!-- activation: keywords=["jwt", "JWT", "jsonwebtoken", "jose", "decode", "verify", "sign", "token", "claim", "exp", "iss", "aud", "sub", "Bearer"] -->

- [ ] JWTs are verified with `verify()`, not just `decode()` -- decoding without signature verification means anyone can forge tokens
- [ ] The `alg` header is validated server-side -- accepting `alg: none` or allowing algorithm confusion (RS256 vs HS256) breaks all security
- [ ] Expiration (`exp`) is checked and tokens with no expiration are rejected
- [ ] Issuer (`iss`) and audience (`aud`) claims are validated against expected values -- a token issued for Service A should not be accepted by Service B
- [ ] Role or permission claims in the JWT are cross-checked against a server-side source of truth, not trusted blindly -- a user can modify their own token if the secret leaks
- [ ] Tokens are revoked on logout, password change, and permission change -- if the system has no revocation mechanism, token lifetime must be very short

### Privilege Escalation via User-Controlled Input
<!-- activation: keywords=["role", "isAdmin", "admin", "permission", "group", "level", "privilege", "setRole", "updateRole", "grant", "elevate", "promote"] -->

- [ ] Role or privilege fields are never accepted from the request body during user creation or update -- a `POST /users { "role": "admin" }` request should not be able to self-elevate
- [ ] Mass assignment protections are in place -- frameworks that auto-bind request fields to model properties (Rails strong params, Django form fields, Spring `@ModelAttribute`) must explicitly exclude sensitive fields like `role`, `is_admin`, `permissions`
- [ ] Permission checks use the server-side session/token identity, not a user-supplied identity field -- `req.body.userId` is attacker-controlled, `req.user.id` (from verified session) is not
- [ ] Feature flags or plan tier checks are enforced server-side -- do not rely on the client to hide premium features

### Multi-Tenant Data Isolation
<!-- activation: keywords=["tenant", "organization", "org_id", "team_id", "workspace", "account_id", "company_id", "scope", "partition"] -->

- [ ] Every database query in a multi-tenant system includes a tenant filter -- missing tenant scoping leaks data across organizations
- [ ] Tenant context is derived from the authenticated session, not from request parameters -- `?tenant_id=other_org` must not override the session tenant
- [ ] Background jobs and async workers carry tenant context through the job payload and enforce it on execution, not just on enqueue
- [ ] Cache keys include tenant identifier to prevent cross-tenant cache poisoning
- [ ] Database connection or schema selection in multi-database tenancy is set from trusted context, not user input

## Common False Positives

- **Public endpoints by design**: login, registration, password reset initiation, public content APIs, and health checks are intentionally unauthenticated. Verify the endpoint is documented as public and does not leak sensitive data.
- **Service-to-service calls behind a network boundary**: internal microservice calls on a private network may rely on network-level isolation instead of per-request authorization. Valid only when the network boundary is enforced (service mesh, VPC, mTLS) -- flag if the service is reachable from the public internet.
- **Authorization handled by API gateway**: when an API gateway (Kong, Envoy, AWS API Gateway) enforces authorization before the request reaches application code, the handler legitimately has no auth check. Verify the gateway policy is in the diff or documented.
- **Intentional CORS permissiveness for public APIs**: public APIs that serve non-sensitive data (e.g., CDN content, public catalog) may use `Access-Control-Allow-Origin: *` without credentials. This is safe when no cookies or tokens are involved.
- **UUIDs as identifiers**: using UUIDs reduces IDOR risk through unguessability, but UUIDs are not authorization. If the system has no access control beyond UUID secrecy, flag it. If UUIDs supplement proper ownership checks, do not flag the UUID itself.

## Severity Guidance

| Finding | Severity |
|---|---|
| Endpoint serving sensitive data with no authorization check | Critical |
| IDOR: database lookup by user-supplied ID without ownership verification | Critical |
| JWT `decode()` used instead of `verify()` for authentication decisions | Critical |
| CORS wildcard origin with credentials enabled | Critical |
| Path traversal: user input in file path without canonicalization and prefix check | Critical |
| Role or admin flag accepted from request body without server-side validation | Critical |
| Multi-tenant query missing tenant_id scoping | Critical |
| Authorization check present but bypassable via HTTP method override | Important |
| JWT expiration not checked | Important |
| Admin endpoint on same port/interface as public endpoints without extra auth | Important |
| Directory listing enabled on web server serving application files | Important |
| Mass assignment protection missing on model with sensitive fields | Important |
| Session not invalidated on password change or role modification | Important |
| CORS origin validated with bypassable regex | Minor |
| Enumerable integer IDs used as sole resource identifier (with ownership check present) | Minor |
| Missing `X-Frame-Options` or CSP `frame-ancestors` on authenticated pages | Minor |

## See Also

- `principle-fail-fast` -- missing authorization should fail the request immediately, not let it proceed and hope downstream code catches it
- `principle-encapsulation` -- access control logic should be encapsulated in middleware or decorators, not scattered through handler bodies
- `principle-separation-of-concerns` -- authorization is a cross-cutting concern that should be separated from business logic
- `sec-owasp-a05-misconfiguration` -- CORS and directory listing issues overlap with security misconfiguration
- `sec-owasp-a04-insecure-design` -- missing access control often stems from insecure design that omitted threat modeling

## Authoritative References

- [OWASP Top 10:2021 - A01 Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)
- [OWASP Testing Guide - Authorization Testing](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/05-Authorization_Testing/)
- [CWE-284: Improper Access Control](https://cwe.mitre.org/data/definitions/284.html)
- [CWE-639: Authorization Bypass Through User-Controlled Key](https://cwe.mitre.org/data/definitions/639.html)
- [CWE-22: Improper Limitation of a Pathname to a Restricted Directory](https://cwe.mitre.org/data/definitions/22.html)
- [PortSwigger Web Security Academy - Access Control Vulnerabilities](https://portswigger.net/web-security/access-control)
- [OWASP ASVS v4.0 - V4 Access Control](https://owasp.org/www-project-application-security-verification-standard/)
