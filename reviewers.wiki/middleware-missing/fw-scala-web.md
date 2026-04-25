---
id: fw-scala-web
type: primary
depth_role: leaf
focus: "Detect pitfalls in Play Framework, Akka HTTP, and http4s including XSS via raw HTML, missing rejection/error handlers, auth middleware gaps, blocking on wrong execution contexts, CSRF misconfig, stream backpressure, resource leaks, and excessive implicit resolution."
parents:
  - index.md
covers:
  - Play controller returning raw HTML from user input without escaping
  - Akka HTTP missing custom RejectionHandler or default rejection leaking internals
  - http4s routes without authentication middleware
  - Blocking calls on Play default dispatcher or Akka HTTP dispatcher
  - "Missing CSRF filter in Play or manual CSRF in Akka HTTP/http4s"
  - Akka HTTP stream without backpressure handling
  - "http4s Resource or Bracket not used for connection/file lifecycle"
  - Play form binding without CSRF token in template
  - Excessive implicit resolution slowing compile and hiding behavior
  - Missing error recovery in Akka Streams graphs
  - Play action without authentication or authorization check
  - Hardcoded secrets in application.conf
tags:
  - play
  - akka-http
  - http4s
  - scala
  - security
  - csrf
  - streams
  - backpressure
  - resource-safety
  - execution-context
  - web-framework
activation:
  file_globs:
    - "**/*.scala"
    - "**/build.sbt"
  keyword_matches:
    - Play
    - play
    - Action
    - Controller
    - AkkaHttp
    - akka-http
    - http4s
    - HttpRoutes
    - IO
    - Resource
    - Directive
    - Route
    - pathPrefix
    - complete
    - onSuccess
  structural_signals:
    - Play controller extending BaseController or AbstractController
    - "Akka HTTP route tree with path/pathPrefix directives"
    - "http4s HttpRoutes with IO or F[_] effect type"
source:
  origin: file
  path: fw-scala-web.md
  hash: "sha256:198b15c06ae9188937fb6350c9df6b829514dd76206ce9621dd2e4a838e4bb72"
---
# Scala Web Frameworks Reviewer (Play / Akka HTTP / http4s)

## When This Activates

Activates when diffs touch Scala files using Play Framework, Akka HTTP, or http4s. These three frameworks share the JVM but differ fundamentally in execution models: Play uses a thread-pool dispatcher where blocking the default pool starves all requests, Akka HTTP uses a directive-based DSL where missing rejection handlers leak route structure, and http4s uses tagless final with `IO`/`Resource` where missing bracket calls leak connections. Each framework has distinct CSRF, auth, and error handling conventions. This reviewer detects framework-specific pitfalls that general Scala linting does not cover.

## Audit Surface

- [ ] Play controller action returning Ok(Html(userInput)) or Ok(s"<div>$userInput</div>")
- [ ] Akka HTTP routes without custom RejectionHandler -- default handler leaks route structure
- [ ] http4s HttpRoutes defined without AuthMiddleware or auth header extraction
- [ ] Blocking call (Await.result, Thread.sleep, JDBC) on Play default ExecutionContext
- [ ] Play application.conf missing CSRF filter or filter disabled
- [ ] Akka Source/Flow without .buffer(), .throttle(), or backpressure strategy
- [ ] http4s client or connection opened without Resource.make or bracket
- [ ] Play form helper in Twirl template without @helper.CSRF.formField
- [ ] Implicit parameters resolved from multiple competing scopes
- [ ] Akka Stream graph without .recover, .recoverWithRetries, or supervision strategy
- [ ] Secrets (play.http.secret.key, db password) as literals in application.conf
- [ ] Play Action.async returning blocking Future on default dispatcher
- [ ] http4s server without global error handler or ServiceErrorHandler
- [ ] Akka HTTP complete() directive with user-supplied string (XSS)

## Detailed Checks

### Play XSS and Template Safety
<!-- activation: keywords=["Ok", "Html", "Twirl", "views.html", "play.twirl", "@", "Html(", "play.api.mvc.Results", "contentAsString"] -->

- [ ] **Raw HTML from user input**: flag `Ok(Html(userInput))`, `Ok(Html(s"...$variable..."))`, or `Ok(play.twirl.api.Html(param))` where the variable originates from request parameters, form data, or database content -- Play's `Html` type marks content as safe; wrapping user input in it bypasses Twirl's auto-escaping; see `sec-xss-dom`
- [ ] **String interpolation in Ok**: flag `Ok(s"<html>...$userInput...</html>").as("text/html")` -- string interpolation produces a `String` that Play renders as HTML when the content type is set; use Twirl templates which auto-escape by default
- [ ] **Missing CSRF in Twirl form**: flag `@helper.form(action)` without `@helper.CSRF.formField` inside the form body -- Play generates a CSRF token but the template must include it; omission causes 403 Forbidden on submission; see `sec-csrf`
- [ ] **@Html in Twirl**: flag `@Html(variable)` in Twirl templates where `variable` is not a compile-time constant -- this bypasses auto-escaping identical to the controller-level `Html()` wrapper

### Akka HTTP Rejection and Error Handling
<!-- activation: keywords=["RejectionHandler", "ExceptionHandler", "reject", "complete", "handleRejections", "handleExceptions", "Route", "seal", "pathPrefix"] -->

- [ ] **Missing RejectionHandler**: flag Akka HTTP route trees without a custom `RejectionHandler` -- the default handler returns detailed rejection reasons (e.g., "The requested resource could not be found" with the exact path), leaking internal route structure to attackers
- [ ] **Missing ExceptionHandler**: flag route trees without `handleExceptions` wrapping -- unhandled exceptions return 500 with InternalServerError containing exception details in non-production mode
- [ ] **complete() with user data**: flag `complete(HttpEntity(ContentTypes.`text/html(UTF-8)`, userString))` -- completing with user-supplied strings as HTML is a direct XSS vector; use a templating engine or escape output; see `sec-xss-dom`
- [ ] **Seal without custom handlers**: flag `Route.seal(routes)` without providing custom rejection and exception handlers -- `seal` uses the defaults which may be acceptable for development but leak information in production

### http4s Auth and Middleware
<!-- activation: keywords=["AuthMiddleware", "AuthedRoutes", "HttpRoutes", "Middleware", "RequestKey", "Header", "Authorization", "Bearer", "Kleisli", "OptionT"] -->

- [ ] **Routes without auth**: flag `HttpRoutes.of[IO]` handling sensitive resources (user data, admin endpoints) without wrapping in `AuthMiddleware` or extracting and validating auth headers -- http4s does not enforce auth by default; see `sec-owasp-a01-broken-access-control`
- [ ] **Missing error handler**: flag http4s server setup without a `ServiceErrorHandler` or global error-handling middleware -- unhandled exceptions return 500 with stack traces
- [ ] **Auth in route body**: flag authentication logic (token parsing, session lookup) duplicated inside individual route case statements instead of extracted into `AuthMiddleware` -- this violates separation of concerns and is error-prone; see `principle-separation-of-concerns`
- [ ] **Middleware ordering**: flag auth middleware applied after logging or metrics middleware that exposes request details for unauthenticated requests -- apply auth first to reject unauthorized requests before any processing

### Blocking Calls and Execution Contexts
<!-- activation: keywords=["Await", "Await.result", "Thread.sleep", "blocking", "ExecutionContext", "dispatcher", "Implicits.global", "Future", "IO.blocking", "blockingDispatcher"] -->

- [ ] **Blocking on default dispatcher (Play)**: flag `Await.result`, `Thread.sleep`, JDBC calls, or synchronous HTTP clients inside Play actions using the default `ExecutionContext` -- Play's default dispatcher has a limited thread pool; blocking it starves all request handling. Use a dedicated `blockingDispatcher` via `actorSystem.dispatchers.lookup("blocking-dispatcher")`
- [ ] **Await.result in Akka HTTP**: flag `Await.result(future, timeout)` inside Akka HTTP route handlers -- this blocks the routing dispatcher and can deadlock; use directive combinators (`onSuccess`, `onComplete`) to handle futures non-blockingly
- [ ] **scala.concurrent.ExecutionContext.Implicits.global**: flag `import scala.concurrent.ExecutionContext.Implicits.global` in production route handlers -- the global execution context has an unbounded fork-join pool unsuitable for production; use the framework-provided dispatcher
- [ ] **IO without blocking context (http4s)**: flag `IO { jdbc.query(...) }` without `IO.blocking { ... }` -- CE3's `IO.apply` runs on the compute pool; JDBC and file I/O must use `IO.blocking` to avoid starving the compute threads

### CSRF Protection
<!-- activation: keywords=["CSRF", "csrf", "CSRFFilter", "CSRF.formField", "csrfToken", "play.filters.csrf", "X-CSRF-Token", "anti-forgery"] -->

- [ ] **CSRF filter disabled (Play)**: flag `play.filters.disabled += "play.filters.csrf.CSRFFilter"` in application.conf -- this globally disables CSRF protection for all browser-facing routes; see `sec-csrf`
- [ ] **Missing CSRF in Akka HTTP/http4s**: flag form-processing POST routes in Akka HTTP or http4s that accept cookies for authentication but have no CSRF token validation -- these frameworks do not provide built-in CSRF; implement custom token generation and validation
- [ ] **CSRF bypass header misconfigured**: flag `play.filters.csrf.header.bypassHeaders` allowing non-standard headers that can be set by JavaScript -- only `X-Requested-With` from AJAX is a safe bypass signal

### Stream Backpressure and Resource Safety
<!-- activation: keywords=["Source", "Flow", "Sink", "buffer", "throttle", "backpressure", "OverflowStrategy", "Resource", "bracket", "Stream", "acquire", "release", "Supervised"] -->

- [ ] **Missing backpressure (Akka)**: flag `Source` or `Flow` stages that produce data faster than downstream can consume without `.buffer(size, OverflowStrategy)` or `.throttle` -- unbounded buffering causes OOM; choose `dropHead`, `dropTail`, `dropBuffer`, or `fail` strategies based on requirements
- [ ] **Missing stream supervision (Akka)**: flag Akka Stream graphs without `.recover`, `.recoverWithRetries`, or `ActorAttributes.supervisionStrategy` -- a single element failure kills the entire stream; add recovery for production resilience
- [ ] **Resource leak (http4s)**: flag http4s `Client` or database connection creation not wrapped in `Resource.make(acquire)(release)` or `bracket` -- connections opened without finalization leak under error conditions; use `Resource` from cats-effect for lifecycle management
- [ ] **fs2 Stream without handleErrorWith**: flag fs2 `Stream[IO, _]` pipelines without `.handleErrorWith` or `.attempt` -- unhandled errors terminate the stream silently

### Secrets and Configuration
<!-- activation: keywords=["application.conf", "secret.key", "password", "db.default", "slick.dbs", "play.http.secret", "config", "ConfigFactory"] -->

- [ ] **Hardcoded play.http.secret.key**: flag `play.http.secret.key = "literal-string"` in application.conf -- this key signs sessions and CSRF tokens; use environment variable substitution: `${?APPLICATION_SECRET}`; see `sec-owasp-a05-misconfiguration`
- [ ] **Database password in config**: flag `db.default.password = "literal"` or `slick.dbs.default.db.password = "literal"` in committed configuration files -- use environment variable substitution or a secrets manager
- [ ] **application.conf in source control**: flag `.conf` files containing production credentials committed without `.gitignore` exclusion -- sensitive configuration must be externalized
- [ ] **Missing config override chain**: flag applications without environment-specific configuration overrides (e.g., `application.prod.conf` including `application.conf` with production overrides) -- a single config file serving all environments risks dev settings in production

## Common False Positives

- **Html() with compile-time constants**: `Ok(Html("<h1>Welcome</h1>"))` with static strings is safe. Only flag when the content includes variables, string interpolation, or database-sourced values.
- **Blocking in test code**: `Await.result` in test suites is standard practice for synchronous test assertions. Only flag in production route handlers and services.
- **http4s routes behind API gateway auth**: routes that rely on upstream API gateway authentication may legitimately skip http4s-level auth middleware. Verify the deployment architecture.
- **Stream without backpressure in bounded sources**: `Source(1 to 100)` with a small, bounded source does not need explicit backpressure configuration. Flag only unbounded or external sources (Kafka, websocket, database cursor).
- **Implicits.global in scripts/tools**: CLI tools, one-off scripts, and sbt tasks may use the global execution context. Only flag in server-side HTTP handling code.

## Severity Guidance

| Finding | Severity |
|---|---|
| Ok(Html(userInput)) or complete() with user HTML (XSS) | Critical |
| Hardcoded play.http.secret.key or database credentials in config | Critical |
| http4s routes serving sensitive data without auth middleware | Critical |
| CSRF filter disabled globally in Play application.conf | Critical |
| Blocking calls (Await.result, JDBC) on Play default dispatcher | Important |
| Akka HTTP missing custom RejectionHandler in production | Important |
| http4s Resource/bracket not used for connection lifecycle | Important |
| Akka Stream without backpressure on unbounded source | Important |
| Missing error recovery in Akka Stream production graph | Important |
| Missing CSRF protection on form POST in Akka HTTP/http4s | Important |
| Twirl template form without @helper.CSRF.formField | Minor |
| ExecutionContext.Implicits.global in production code | Minor |
| Missing ServiceErrorHandler in http4s server setup | Minor |

## See Also

- `lang-scala` -- Scala language-level pitfalls: implicits, pattern matching, Option safety, collection performance
- `sec-xss-dom` -- Play Html() and Akka HTTP complete() with user data are XSS sinks
- `sec-csrf` -- Play CSRF filter, manual CSRF in Akka HTTP/http4s
- `sec-owasp-a01-broken-access-control` -- missing auth middleware in http4s routes
- `sec-owasp-a05-misconfiguration` -- hardcoded secrets in application.conf, missing security headers
- `sec-owasp-a03-injection` -- SQL injection via string interpolation in Slick/Doobie
- `principle-separation-of-concerns` -- auth in middleware vs route body, execution context isolation
- `principle-fail-fast` -- stream supervision and error recovery strategies

## Authoritative References

- [Play Framework Documentation -- Security](https://www.playframework.com/documentation/latest/Security)
- [Play Framework Documentation -- CSRF](https://www.playframework.com/documentation/latest/ScalaCsrf)
- [Akka HTTP Documentation -- Routing](https://doc.akka.io/docs/akka-http/current/routing-dsl/)
- [Akka HTTP Documentation -- Exception Handling](https://doc.akka.io/docs/akka-http/current/routing-dsl/exception-handling.html)
- [http4s Documentation](https://http4s.org/v0.23/docs/)
- [Cats Effect Documentation -- Resource](https://typelevel.org/cats-effect/docs/std/resource)
- [Akka Streams Documentation -- Error Handling](https://doc.akka.io/docs/akka/current/stream/stream-error.html)
