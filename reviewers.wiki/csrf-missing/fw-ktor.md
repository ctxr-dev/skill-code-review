---
id: fw-ktor
type: primary
depth_role: leaf
focus: Detect Ktor-specific pitfalls including missing plugins for content negotiation, error handling, and authentication, coroutine scope misuse, blocking calls without dispatcher switch, and unvalidated request input that cause silent failures or security holes.
parents:
  - index.md
covers:
  - Missing ContentNegotiation plugin causing manual serialization
  - Missing StatusPages plugin for structured error handling
  - Missing Authentication plugin on routes requiring auth
  - GlobalScope used instead of application or call coroutine scope
  - Blocking calls in coroutine context without Dispatchers.IO
  - Missing CORS plugin on API serving browser clients
  - Missing request validation on received input
  - "call.receive() without try-catch for malformed input"
  - Missing graceful shutdown configuration
  - Large request body without size limit
  - Missing call logging or monitoring plugin
  - Sensitive data in Ktor configuration without environment variable substitution
tags:
  - ktor
  - kotlin
  - coroutines
  - web-framework
  - backend
  - plugins
  - security
  - async
activation:
  file_globs:
    - "**/*.kt"
    - "**/build.gradle.kts"
  keyword_matches:
    - ktor
    - Ktor
    - Application
    - routing
    - get
    - post
    - call
    - respond
    - receive
    - install
    - plugin
    - ContentNegotiation
    - StatusPages
    - Authentication
  structural_signals:
    - "Ktor Application module with install() blocks"
    - "Ktor routing DSL with get/post/put/delete blocks"
    - Ktor plugin configuration
source:
  origin: file
  path: fw-ktor.md
  hash: "sha256:7d1f7293e3a6d6f65f02222e9ad040f190eebf0a87b565708e60e2b1360382ef"
---
# Ktor Framework Pitfalls

## When This Activates

Activates when diffs touch Ktor application setup, plugin installation, routing definitions, or request handlers. Ktor is a lightweight, plugin-based Kotlin framework where every capability -- serialization, error handling, authentication, CORS, logging -- must be explicitly installed as a plugin. Unlike full-stack frameworks, Ktor ships with nothing enabled by default. A missing `ContentNegotiation` plugin means every handler must manually serialize responses. Missing `StatusPages` means exceptions propagate as opaque 500 errors. The coroutine-first model introduces pitfalls where `GlobalScope` outlives the application lifecycle and blocking calls on the default dispatcher starve the coroutine pool. This reviewer detects Ktor-specific patterns that general Kotlin reviewers miss.

## Audit Surface

- [ ] Ktor Application module without ContentNegotiation plugin installed
- [ ] Ktor Application module without StatusPages plugin installed
- [ ] Routing block with authenticated endpoints without Authentication plugin
- [ ] GlobalScope.launch or GlobalScope.async inside a route handler
- [ ] Thread.sleep(), java.io.File, or JDBC calls inside a handler without withContext(Dispatchers.IO)
- [ ] API-serving application without CORS plugin installed
- [ ] call.receive<T>() without surrounding try-catch or validation
- [ ] Route handler that receives user input without validation
- [ ] Server started without graceful shutdown hook
- [ ] No request size limit configured
- [ ] Application without CallLogging or monitoring plugin
- [ ] application.conf with hardcoded secrets not using environment variable substitution
- [ ] Route handler catching generic Exception and returning 200 OK
- [ ] Missing rate limiting on auth endpoints
- [ ] call.respond() called after handler has already responded

## Detailed Checks

### Plugin Configuration
<!-- activation: keywords=["install", "plugin", "ContentNegotiation", "StatusPages", "CORS", "CallLogging", "Authentication", "Sessions", "Compression", "DefaultHeaders", "ForwardedHeaders", "module"] -->

- [ ] **Missing ContentNegotiation**: flag Ktor application modules that define routes returning data objects but do not `install(ContentNegotiation)` with a serialization format (kotlinx.serialization, Jackson, Gson) -- without this plugin, `call.respond(dataObject)` throws an exception or returns an empty response; every handler must manually serialize
- [ ] **Missing StatusPages**: flag applications without `install(StatusPages)` -- without StatusPages, unhandled exceptions in route handlers return a bare 500 Internal Server Error with no body; there is no global mechanism to map exceptions to structured error responses; see `principle-fail-fast`
- [ ] **Missing CORS**: flag API applications serving browser clients without `install(CORS)` -- the default blocks all cross-origin requests; configure allowed hosts, methods, and headers explicitly; see `sec-owasp-a05-misconfiguration`
- [ ] **Missing CallLogging**: flag production applications without `install(CallLogging)` or a custom logging plugin -- without request logging, there is no visibility into traffic patterns, errors, or abuse
- [ ] **Missing Compression**: flag API applications returning large JSON payloads without `install(Compression)` -- compression reduces bandwidth by 60-80% for JSON with minimal CPU cost
- [ ] **Missing DefaultHeaders**: flag applications without `install(DefaultHeaders)` -- without explicit headers, responses lack security-relevant headers like `X-Content-Type-Options` and `X-Frame-Options`

### Authentication and Authorization
<!-- activation: keywords=["Authentication", "authenticate", "jwt", "session", "bearer", "basic", "oauth", "principal", "call.principal", "authorize", "role"] -->

- [ ] **Missing Authentication plugin**: flag routing blocks that handle user-specific data or privileged operations without wrapping them in `authenticate("provider") { ... }` -- without the Authentication plugin, there is no identity verification; any client can access the endpoints; see `sec-owasp-a01-broken-access-control`
- [ ] **Auth routes without authenticate block**: flag routes that manually check headers or tokens for authentication instead of using the `authenticate` block -- manual auth checks are error-prone, inconsistent, and bypass the plugin's principal resolution
- [ ] **Missing authorization after authentication**: flag `authenticate` blocks that verify identity but never check roles or permissions via `call.principal<T>()` -- authentication without authorization means any authenticated user can access any endpoint
- [ ] **JWT without expiry validation**: flag JWT authentication configuration without `validate` block checking `expiresAt` or without `withAudience`/`withIssuer` claims verification -- tokens without expiry or audience validation are reusable indefinitely across services

### Coroutine Scope and Blocking
<!-- activation: keywords=["GlobalScope", "launch", "async", "withContext", "Dispatchers", "runBlocking", "coroutineScope", "supervisorScope", "CoroutineScope", "delay", "Thread.sleep", "blocking"] -->

- [ ] **GlobalScope in handlers**: flag `GlobalScope.launch` or `GlobalScope.async` inside route handlers -- GlobalScope coroutines are not bound to the request or application lifecycle; they survive server shutdown, leak resources, and their exceptions are silently swallowed; use the `call` coroutine scope or `application.launch`; see `conc-async-cancellation`
- [ ] **Blocking on default dispatcher**: flag `Thread.sleep()`, `java.io.File` operations, JDBC calls, or synchronous HTTP clients inside route handlers without `withContext(Dispatchers.IO)` -- Ktor route handlers run on the default coroutine dispatcher; blocking calls starve the thread pool and freeze all request processing
- [ ] **runBlocking in handler**: flag `runBlocking { }` inside a route handler or suspend function -- `runBlocking` blocks the current thread waiting for the coroutine to complete; in a handler this blocks the Ktor worker thread, defeating the purpose of coroutines
- [ ] **Missing structured concurrency**: flag `CoroutineScope(Dispatchers.Default).launch { ... }` creating ad-hoc scopes in handlers -- the scope is not cancelled when the request completes; use `coroutineScope { }` or `supervisorScope { }` for structured child coroutines

### Input Handling and Validation
<!-- activation: keywords=["receive", "call.receive", "receiveText", "receiveParameters", "receiveMultipart", "validate", "ContentType", "contentType", "request.queryParameters", "call.parameters"] -->

- [ ] **Unguarded call.receive()**: flag `call.receive<T>()` without a surrounding try-catch -- if the request body is missing, malformed, or the wrong content type, `receive()` throws `ContentTransformationException` or `BadRequestException`; without StatusPages and without try-catch, the client gets an opaque 500 error
- [ ] **Missing input validation**: flag handlers that use `call.receive<T>()` or `call.parameters["id"]` and pass the values directly to database queries, file operations, or external calls without validation -- unvalidated input enables injection, path traversal, and data corruption; see `sec-owasp-a03-injection`
- [ ] **Missing request size limit**: flag Ktor server configuration without `requestContentLength` limits or custom `ContentLength` checks -- without limits, clients can send arbitrarily large payloads, exhausting server memory
- [ ] **Null parameter without handling**: flag `call.parameters["key"]` or `call.request.queryParameters["key"]` used without null checks or the `?:` operator -- missing parameters return null; calling methods on null causes `NullPointerException` in the handler

### Server Configuration and Lifecycle
<!-- activation: keywords=["embeddedServer", "engineMain", "application.conf", "application.yaml", "ShutdownUrl", "gracefulShutdown", "connector", "sslConnector", "ktor.deployment", "environment", "config"] -->

- [ ] **Missing graceful shutdown**: flag `embeddedServer` calls without a `ShutdownUrl` plugin, `addShutdownHook`, or `stop(gracePeriod, timeout)` -- without graceful shutdown, in-flight requests are dropped on SIGTERM during deployment, causing 502 errors; see `reliability-timeout-deadline-propagation`
- [ ] **Secrets in application.conf**: flag `application.conf` or `application.yaml` containing passwords, API keys, or tokens as string literals instead of `${ENV_VAR}` HOCON substitution or `System.getenv()` -- committed secrets are exposed in version control; see `sec-owasp-a05-misconfiguration`
- [ ] **Missing ForwardedHeaders plugin**: flag applications deployed behind a reverse proxy without `install(ForwardedHeaders)` or `install(XForwardedHeaders)` -- without this, `call.request.origin.remoteHost` reflects the proxy IP, not the client, breaking rate limiting and audit logging
- [ ] **Double response**: flag handlers where `call.respond()` can be called more than once (e.g., respond in a conditional branch and also after the branch) -- the second `respond` throws `ResponseAlreadySentException`, crashing the handler

## Common False Positives

- **Test applications**: Ktor `testApplication { }` blocks do not need production plugins (CORS, CallLogging, rate limiting, graceful shutdown).
- **Internal microservices**: services behind a mesh or VPN may legitimately skip CORS and rate limiting if network-layer controls exist.
- **Ktor client code**: `io.ktor.client.*` imports are the HTTP client, not the server -- client code does not need server plugins.
- **engineMain with application.conf**: when using `engineMain`, graceful shutdown is handled by the engine configuration (`ktor.deployment.shutdown.url` or signal handling); check the config file.
- **ContentNegotiation not needed for static/HTML**: routes that serve static files or HTML templates via `call.respondText(contentType = ContentType.Text.Html)` do not need ContentNegotiation.
- **Blocking calls in withContext(Dispatchers.IO)**: JDBC, file I/O, and Thread.sleep inside `withContext(Dispatchers.IO)` are correctly offloaded.

## Severity Guidance

| Finding | Severity |
|---|---|
| Missing Authentication plugin on endpoints handling user data | Critical |
| SQL/path injection via unvalidated call.receive() or call.parameters | Critical |
| Secrets hardcoded in application.conf | Critical |
| GlobalScope.launch in handler (coroutine leak, silent failure) | Important |
| Blocking call on default dispatcher without Dispatchers.IO | Important |
| Missing StatusPages plugin (opaque 500 errors) | Important |
| call.receive() without try-catch (unhandled deserialization errors) | Important |
| Missing request body size limit | Important |
| Missing ContentNegotiation plugin | Important |
| runBlocking inside route handler | Important |
| Missing graceful shutdown configuration | Important |
| Missing CORS plugin for browser-facing API | Minor |
| Missing CallLogging plugin | Minor |
| Missing Compression plugin | Minor |
| Missing ForwardedHeaders behind reverse proxy | Minor |
| Double call.respond() in handler | Minor |

## See Also

- `sec-owasp-a01-broken-access-control` -- missing authentication and authorization on Ktor routes
- `sec-owasp-a03-injection` -- unvalidated input from call.receive() or call.parameters
- `sec-owasp-a05-misconfiguration` -- missing CORS, secrets in config, missing security headers
- `conc-async-cancellation` -- GlobalScope vs structured concurrency, coroutine lifecycle
- `reliability-timeout-deadline-propagation` -- graceful shutdown and request timeouts
- `principle-fail-fast` -- StatusPages for structured error responses, input validation

## Authoritative References

- [Ktor Documentation -- Plugins](https://ktor.io/docs/server-plugins.html)
- [Ktor Documentation -- Authentication and Authorization](https://ktor.io/docs/server-auth.html)
- [Ktor Documentation -- Content Negotiation and Serialization](https://ktor.io/docs/server-serialization.html)
- [Ktor Documentation -- Status Pages](https://ktor.io/docs/server-status-pages.html)
- [Ktor Documentation -- CORS](https://ktor.io/docs/server-cors.html)
- [Kotlin Documentation -- Coroutines Best Practices](https://kotlinlang.org/docs/coroutines-and-channels.html)
- [Kotlin Documentation -- Structured Concurrency](https://kotlinlang.org/docs/coroutines-basics.html#structured-concurrency)
