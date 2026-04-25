---
id: fw-vapor-swift
type: primary
depth_role: leaf
focus: "Detect Vapor (Swift) pitfalls in Content validation, Fluent authorization, middleware configuration, async blocking, CSRF protection, secrets management, response data leakage, and error handling that cause security vulnerabilities or runtime failures."
parents:
  - index.md
  - "../csrf-missing/index.md"
covers:
  - Missing Content validation on request bodies
  - Fluent queries returning data without authorization checks
  - Missing CORS middleware or misconfigured allowed origins
  - Missing rate limiting middleware on public endpoints
  - Missing error middleware exposing internal details
  - Async route handlers blocking the EventLoop
  - Missing CSRF protection on form-handling routes
  - Secrets hardcoded in configure.swift or checked into source
  - Missing TLS configuration for production
  - Response models leaking internal database fields
  - Database connection pool not configured for production load
  - Missing authentication middleware on protected routes
tags:
  - vapor
  - swift
  - server-side-swift
  - fluent
  - middleware
  - validation
  - authentication
  - async
  - eventloop
  - web-framework
activation:
  file_globs:
    - "**/*.swift"
    - "**/Package.swift"
  keyword_matches:
    - Vapor
    - vapor
    - Application
    - Request
    - Response
    - Content
    - Fluent
    - Middleware
    - route
    - app.get
    - app.post
    - req.content
    - req.auth
    - Authenticatable
  structural_signals:
    - "Vapor application with configure() and routes() functions"
    - Route handlers using Request and returning Response or Content
    - "Fluent model definitions with @ID and @Field property wrappers"
source:
  origin: file
  path: fw-vapor-swift.md
  hash: "sha256:fb441c8c7bb01cc49618f127bda8e308a518887929c8b7982efc8b098bcd1440"
---
# Vapor (Swift) Framework Reviewer

## When This Activates

Activates when diffs touch Swift files importing Vapor, Fluent, or using Vapor's routing, middleware, or Content APIs. Vapor runs on SwiftNIO's event-loop architecture where blocking the loop degrades all concurrent connections. Its Codable-based Content system silently decodes malformed input if validation is skipped, Fluent queries default to returning all records without authorization scoping, and the default error middleware exposes internal details in non-production environments. This reviewer targets Vapor-specific pitfalls that general Swift linting does not catch.

## Audit Surface

- [ ] Route handler decoding req.content without Validatable conformance or manual validation
- [ ] Fluent query (.all(), .first(), .find()) without filtering by authenticated user
- [ ] Application missing CORSMiddleware or CORSMiddleware.Configuration with allowedOrigin: .all
- [ ] No RateLimitMiddleware or equivalent on public-facing route groups
- [ ] No custom ErrorMiddleware registered -- default Vapor error responses leak debug info
- [ ] Route closure calling blocking I/O (FileManager, synchronous URLSession) on the EventLoop
- [ ] Form-handling POST routes without CSRF token validation
- [ ] Secrets (API keys, database passwords) as string literals in configure.swift or routes.swift
- [ ] Production deployment without TLS configuration
- [ ] Fluent Model fields (password hashes, internal IDs) in response DTO
- [ ] app.databases.use() without maxConnectionsPerEventLoop or connectionPoolTimeout
- [ ] Route group missing auth middleware (UserAuthenticator or equivalent)
- [ ] FileMiddleware serving directories without path traversal protection
- [ ] Leaf template rendering user input without escaping

## Detailed Checks

### Content Validation
<!-- activation: keywords=["Content", "Validatable", "validate", "req.content.decode", "Decodable", "req.query.decode", "beforeDecode", "afterDecode"] -->

- [ ] **Missing Validatable**: flag request DTOs conforming to `Content` but not `Validatable` -- Vapor's `req.content.decode(T.self)` succeeds on any Decodable; without `Validatable`, constraints (non-empty strings, email format, numeric ranges) are not enforced; use `try T.validate(content: req)` before decoding
- [ ] **Decode without try**: flag `req.content.decode(T.self)` without `try` or error handling -- decoding failures throw and should return 400 Bad Request, not 500 Internal Server Error
- [ ] **Query param injection**: flag `req.query.decode(T.self)` where T contains fields used directly in Fluent queries without sanitization -- query parameters are user-controlled strings
- [ ] **Missing numeric bounds**: flag Validatable implementations that validate string fields but skip numeric range checks (`.range(1...)`, `.range(...1000)`) -- unbounded integers can cause overflow or business logic errors

### Fluent Authorization
<!-- activation: keywords=["Fluent", "Model", ".all()", ".first()", ".find()", ".query(on:", ".filter(", "req.auth.require", "Authenticatable", "$", "@Parent", "@Children"] -->

- [ ] **Unscoped query**: flag `Model.query(on: req.db).all()` or `.first()` without a `.filter(\.$user == authenticatedUser)` or equivalent -- returning all records without authorization scoping is broken access control; see `sec-owasp-a01-broken-access-control`
- [ ] **find() without ownership check**: flag `Model.find(id, on: req.db)` followed by returning the model without verifying the authenticated user owns or has access to it -- IDOR vulnerability via ID enumeration
- [ ] **Missing req.auth.require**: flag route handlers accessing data without `let user = try req.auth.require(User.self)` -- routes behind auth middleware must still extract and use the authenticated identity
- [ ] **Cascade delete without auth**: flag `.delete(on: req.db)` called on a model fetched by ID without verifying ownership -- unauthenticated deletion via ID guessing

### Middleware Configuration
<!-- activation: keywords=["middleware", "CORSMiddleware", "ErrorMiddleware", "FileMiddleware", "SessionsMiddleware", "app.middleware", "grouped", "Authenticator", "RateLimitMiddleware"] -->

- [ ] **CORS wildcard**: flag `CORSMiddleware.Configuration(allowedOrigin: .all)` in production -- this allows any origin to make credentialed requests; use `.custom("https://yourdomain.com")` or `.originBased` with validation; see `sec-owasp-a05-misconfiguration`
- [ ] **Missing error middleware**: flag applications without `app.middleware.use(ErrorMiddleware.default(environment: app.environment))` or a custom error middleware -- without it, unhandled errors return raw debug information
- [ ] **FileMiddleware path traversal**: flag `FileMiddleware(publicDirectory: ...)` serving a directory that contains configuration files, `.env`, or source code -- validate the public directory is isolated from application code
- [ ] **Auth middleware not grouped**: flag route groups handling sensitive data without `.grouped(UserAuthenticator())` and `.grouped(User.guardMiddleware())` -- auth middleware must be applied before route handlers

### EventLoop Blocking
<!-- activation: keywords=["EventLoop", "eventLoop", "NIO", "threadPool", "blocking", "FileManager", "URLSession", "sleep", "Thread.sleep", "DispatchQueue", "sync"] -->

- [ ] **Blocking I/O on EventLoop**: flag route handlers calling `FileManager.default` operations, synchronous `URLSession` calls, `Thread.sleep`, or `DispatchQueue.main.sync` -- SwiftNIO event loops must never block; use `req.application.threadPool.runIfActive` or async/await with proper task groups
- [ ] **Synchronous file read**: flag `Data(contentsOf: URL)` or `String(contentsOf:)` in route handlers -- use `req.fileio.collectFile(at:)` or NonBlockingFileIO for async file access
- [ ] **CPU-intensive work on EventLoop**: flag route handlers performing JSON parsing of large payloads, image processing, or cryptographic operations inline -- offload to the thread pool via `req.application.threadPool`
- [ ] **Missing EventLoopFuture error handling**: flag `.flatMap` or `.map` chains without `.flatMapError` or `catchFlatMapError` -- unhandled errors in NIO future chains cause silent failures

### Secrets and Configuration
<!-- activation: keywords=["Environment", "SECRET", "API_KEY", "DATABASE_URL", "password", "secret", "configure", "app.databases", "app.jwt", "signer"] -->

- [ ] **Hardcoded secrets**: flag string literals that appear to be API keys, database passwords, or JWT signing keys in `configure.swift`, `routes.swift`, or any `.swift` file -- use `Environment.get("KEY")` or `Environment.process.DATABASE_URL`; see `sec-owasp-a05-misconfiguration`
- [ ] **Missing environment check**: flag production-specific configuration (TLS, database pool size) not gated behind `app.environment == .production` -- development defaults reaching production causes security gaps
- [ ] **JWT signer without rotation**: flag `app.jwt.signers.use(.hs256(key:))` with a single static key and no key rotation mechanism -- compromised signing keys affect all tokens
- [ ] **Database URL in source**: flag `app.databases.use(.postgres(url: "postgres://..."))` with inline connection strings -- connection strings contain credentials; use environment variables

### Response Data Safety
<!-- activation: keywords=["Content", "Response", "encode", "toDTO", "Public", "password", "hash", "deletedAt", "internalId", "@Field"] -->

- [ ] **Model as response**: flag Fluent `Model` types returned directly as route handler responses (conforming to `Content`) -- database models contain password hashes, internal IDs, soft-delete timestamps, and relationship keys that should not reach clients; create separate response DTOs
- [ ] **Password hash in response**: flag response types containing fields named `password`, `passwordHash`, `hashedPassword`, or `secret` -- even hashed passwords must never appear in API responses
- [ ] **Missing toDTO pattern**: flag route handlers that do `return model` without transformation -- establish a `toDTO()` or `toPublic()` convention that explicitly selects client-safe fields
- [ ] **Error details in production**: flag custom error middleware or `AbortError` messages containing stack traces, SQL queries, or file paths -- sanitize error messages in production; return generic messages with correlation IDs

### Connection Pool and Performance
<!-- activation: keywords=["maxConnectionsPerEventLoop", "connectionPoolTimeout", "databases.use", "pool", "connection", "PostgresConfiguration", "MySQLConfiguration"] -->

- [ ] **Unconfigured pool**: flag `app.databases.use(.postgres(...))` without `maxConnectionsPerEventLoop` -- the default pool size may be insufficient for production load, causing connection timeouts under concurrent requests
- [ ] **Missing connection timeout**: flag database configuration without `connectionPoolTimeout` -- without a timeout, exhausted pools block indefinitely instead of failing fast with an error; see `principle-fail-fast`
- [ ] **Multiple database configs without pool tuning**: flag applications using multiple databases (read replicas, different services) without per-database pool configuration -- each database connection pool must be sized independently

## Common False Positives

- **Internal microservice routes**: routes behind an API gateway or service mesh may legitimately skip auth middleware if authentication is handled upstream. Verify the deployment architecture.
- **Admin/seed scripts**: `Model.query(on: db).all()` in migration or seed files is expected -- these run in privileged contexts, not in route handlers.
- **Content without Validatable on GET responses**: response DTOs conforming to `Content` for encoding do not need `Validatable`; only flag on request-decoding DTOs.
- **Blocking in CLI commands**: Vapor CLI commands (`app.commands.use`) may use synchronous I/O since they do not run on the EventLoop-serving HTTP requests.
- **CORS wildcard on public APIs**: genuinely public read-only APIs may use `allowedOrigin: .all` if no credentials are involved. Verify the route does not accept cookies or tokens.

## Severity Guidance

| Finding | Severity |
|---|---|
| Hardcoded secrets (API keys, DB passwords) in source files | Critical |
| Fluent query returning all records without authorization scoping (IDOR) | Critical |
| Route handler decoding request without any validation | Critical |
| Missing auth middleware on routes handling sensitive data | Critical |
| CORS allowedOrigin: .all with credentialed routes | Important |
| Blocking I/O on SwiftNIO EventLoop | Important |
| Fluent Model returned directly as API response (data leakage) | Important |
| Missing ErrorMiddleware exposing debug info in production | Important |
| Form POST routes without CSRF token validation | Important |
| Database pool not configured for production load | Minor |
| Missing TLS configuration for production deployment | Minor |
| JWT signer without key rotation mechanism | Minor |

## See Also

- `lang-swift` -- Swift language-level pitfalls: optionals, concurrency, memory management
- `sec-owasp-a01-broken-access-control` -- unscoped Fluent queries and missing auth middleware
- `sec-owasp-a05-misconfiguration` -- CORS wildcard, hardcoded secrets, missing TLS
- `sec-csrf` -- form-handling routes without CSRF token validation
- `sec-owasp-a03-injection` -- query parameter injection via unvalidated Content decoding
- `principle-fail-fast` -- Content validation and connection pool timeouts enforce fail-fast
- `principle-separation-of-concerns` -- response DTOs separate internal models from API contracts

## Authoritative References

- [Vapor Documentation](https://docs.vapor.codes/)
- [Vapor Documentation -- Content](https://docs.vapor.codes/basics/content/)
- [Vapor Documentation -- Validation](https://docs.vapor.codes/basics/validation/)
- [Vapor Documentation -- Middleware](https://docs.vapor.codes/basics/middleware/)
- [Vapor Documentation -- Authentication](https://docs.vapor.codes/security/authentication/)
- [Fluent Documentation](https://docs.vapor.codes/fluent/overview/)
- [SwiftNIO Documentation](https://swiftpackageindex.com/apple/swift-nio/documentation)
