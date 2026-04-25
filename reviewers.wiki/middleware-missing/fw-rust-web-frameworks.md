---
id: fw-rust-web-frameworks
type: primary
depth_role: leaf
focus: "Detect pitfalls specific to Rust web frameworks (Axum, Actix-web, Rocket) including silent extractor failures, blocking on async runtime, shared state races, missing middleware, and panic-induced worker crashes."
parents:
  - index.md
covers:
  - "Axum extractor rejection returning opaque 400/500 without custom error handling"
  - "Shared mutable state without Arc<Mutex<T>> or equivalent synchronization"
  - "Blocking I/O on Tokio async runtime without spawn_blocking"
  - Missing Tower middleware for timeout, rate limiting, or compression
  - Actix-web mutable App data causing data races
  - Missing CORS configuration on API routes
  - Rocket fairings with unintended side effects
  - Missing graceful shutdown configuration
  - Panic in handler crashing the Actix worker thread
  - Missing request body size limits enabling denial of service
  - "Unwrap/expect on user input causing handler panics"
  - Missing error type conversions losing context in handler chains
tags:
  - rust
  - axum
  - actix-web
  - rocket
  - tower
  - tokio
  - web-framework
  - backend
  - async
  - security
activation:
  file_globs:
    - "**/*.rs"
    - "**/Cargo.toml"
  keyword_matches:
    - axum
    - actix_web
    - actix-web
    - rocket
    - Router
    - get
    - post
    - Handler
    - FromRequest
    - extract
    - State
    - Extension
    - Json
    - Query
    - Path
    - tower
    - ServiceBuilder
  structural_signals:
    - Axum Router with route definitions
    - Actix-web App or HttpServer setup
    - Rocket launch or mount configuration
source:
  origin: file
  path: fw-rust-web-frameworks.md
  hash: "sha256:539674404d62455e9b840bd6ddc9dda45e0ae534045eed812432cde1b02b2300"
---
# Rust Web Framework Pitfalls (Axum, Actix-web, Rocket)

## When This Activates

Activates when diffs touch Rust web framework setup, route definitions, middleware/layer configuration, extractor implementations, or handler functions using Axum, Actix-web, or Rocket. Rust's type system prevents many bug classes at compile time, but web framework pitfalls sit at the boundary between compile-time safety and runtime behavior: Axum silently returns opaque error codes when extractors fail, blocking calls on the Tokio runtime starve all tasks, and `.unwrap()` on user input panics the handler. The ownership model also creates patterns where developers reach for `Arc<Mutex<T>>` when a lock-free approach or `RwLock` is correct, and where error types are flattened into `StatusCode` losing diagnostic context. This reviewer detects framework-specific patterns that general Rust reviewers miss.

## Audit Surface

- [ ] Axum handler with extractor (Json, Query, Path) but no custom rejection handler
- [ ] Shared state using Arc<Mutex<T>> where RwLock or lock-free structure is more appropriate
- [ ] std::fs, std::net, or std::thread::sleep called inside async fn handler
- [ ] Axum Router without ServiceBuilder layers for timeout or rate limiting
- [ ] Actix-web App::data() or web::Data with interior mutability but no synchronization
- [ ] API server with no CORS layer or middleware
- [ ] Rocket fairing on_request/on_response performing heavy I/O
- [ ] Server started without graceful shutdown signal handler
- [ ] Handler containing .unwrap() or .expect() on user-derived input
- [ ] Missing request body size limit (no RequestBodyLimit layer or equivalent)
- [ ] Error type implementing IntoResponse that discards the source error chain
- [ ] Handler returning Result<impl IntoResponse, StatusCode> losing error details
- [ ] Static items (lazy_static, once_cell) with mutable state accessed from handlers
- [ ] Missing tower-http TraceLayer or logging middleware
- [ ] Database pool not configured with max connections or timeout

## Detailed Checks

### Extractor Error Handling
<!-- activation: keywords=["Json", "Query", "Path", "Form", "FromRequest", "extract", "rejection", "IntoResponse", "StatusCode", "Extension", "State"] -->

- [ ] **Silent extractor rejection**: flag Axum handlers using `Json<T>`, `Query<T>`, or `Path<T>` extractors without a custom rejection handler or without using `Result<Json<T>, JsonRejection>` -- when deserialization fails, Axum returns a bare 400 or 422 with a plain-text body that leaks internal type names; implement `IntoResponse` for a custom error type or use the rejection extractor pattern; see `principle-fail-fast`
- [ ] **Extractor ordering**: flag Axum handlers where `Json<T>` (which consumes the body) appears before other body-consuming extractors -- the request body can only be consumed once; the second extractor fails silently
- [ ] **Missing Deserialize validation**: flag request types that derive `Deserialize` but lack validation beyond type checking (no `#[validate]` from the validator crate or manual checks) -- valid JSON with out-of-range values passes deserialization but violates business rules
- [ ] **Actix-web extractor errors**: flag Actix-web handlers using `web::Json<T>` or `web::Query<T>` without configuring `JsonConfig::error_handler()` or `QueryConfig::error_handler()` -- the default error response is framework-generated and may leak implementation details

### Blocking on Async Runtime
<!-- activation: keywords=["std::fs", "std::net", "sleep", "thread::sleep", "block_on", "blocking", "spawn_blocking", "tokio::task", "block_in_place", "reqwest::blocking", "File::open", "read_to_string"] -->

- [ ] **Blocking I/O in async handler**: flag `std::fs::read`, `std::fs::write`, `std::net::TcpStream`, `std::thread::sleep`, or `reqwest::blocking` called inside an `async fn` handler -- these block the Tokio worker thread, starving all other tasks on that thread; use `tokio::fs`, `tokio::net`, `tokio::time::sleep`, or wrap in `tokio::task::spawn_blocking`
- [ ] **CPU-intensive work on runtime**: flag tight loops, heavy computation, or synchronous cryptographic operations inside async handlers without `spawn_blocking` -- even without I/O, CPU-bound work blocks the runtime; see `conc-structured-concurrency`
- [ ] **Nested runtime creation**: flag `tokio::runtime::Runtime::new()` or `#[tokio::main]` inside code called from an already-running Tokio runtime -- this panics with "Cannot start a runtime from within a runtime"

### Shared State and Synchronization
<!-- activation: keywords=["Arc", "Mutex", "RwLock", "State", "Data", "Extension", "lazy_static", "once_cell", "OnceCell", "static", "Atomic", "DashMap", "clone"] -->

- [ ] **Arc<Mutex<T>> for read-heavy state**: flag `Arc<Mutex<T>>` used for state that is read far more often than written -- `Arc<RwLock<T>>` or `DashMap` allows concurrent readers without contention; Mutex serializes all access; see `conc-lock-discipline-deadlock`
- [ ] **Mutable static without synchronization**: flag `static mut` or `lazy_static!` / `once_cell::Lazy` wrapping a non-`Sync` type accessed from handlers -- this is undefined behavior or a compile error; use `Arc<RwLock<T>>` in application state
- [ ] **Actix-web data race**: flag `web::Data<RefCell<T>>` or `web::Data<Cell<T>>` in Actix-web -- Actix handlers run on multiple threads; `RefCell`/`Cell` are not `Sync` and will either fail to compile or cause UB via unsafe code; use `web::Data<Mutex<T>>`
- [ ] **State cloned per request**: flag patterns where the full application state is cloned (not the `Arc`) on every request -- cloning large state structures instead of cloning the `Arc` handle wastes memory and CPU

### Middleware and Layer Configuration
<!-- activation: keywords=["ServiceBuilder", "layer", "Layer", "tower", "tower-http", "CorsLayer", "TimeoutLayer", "RateLimitLayer", "TraceLayer", "CompressionLayer", "middleware", "wrap", "fairing"] -->

- [ ] **Missing timeout layer**: flag Axum/Tower services without `TimeoutLayer` or `RequestBodyTimeoutLayer` -- without a timeout, slow clients hold connections indefinitely; see `reliability-timeout-deadline-propagation`
- [ ] **Missing CORS configuration**: flag API servers without `CorsLayer` (tower-http) or Actix-web CORS middleware -- browser clients cannot call the API; misconfigured CORS with `.allow_any_origin().allow_credentials(true)` is equivalent to no CORS; see `sec-owasp-a05-misconfiguration`
- [ ] **Missing body size limit**: flag servers without `RequestBodyLimitLayer` (Axum) or `PayloadConfig::limit()` (Actix-web) -- unbounded request bodies enable memory exhaustion
- [ ] **Missing tracing/logging**: flag servers without `TraceLayer` (tower-http) or equivalent request logging -- production servers without request logging are blind to errors and abuse
- [ ] **Missing compression**: flag API servers returning large JSON without `CompressionLayer` -- compression reduces bandwidth by 60-80% for JSON payloads with minimal CPU cost

### Panic Safety and Error Handling
<!-- activation: keywords=["unwrap", "expect", "panic", "catch_unwind", "IntoResponse", "Result", "anyhow", "thiserror", "Error", "StatusCode", "?"] -->

- [ ] **Unwrap on user input**: flag `.unwrap()` or `.expect()` on values derived from request data (headers, body, query params, path params) -- malformed input panics the handler; in Actix-web this kills the worker thread; use `?` with proper error conversion or match/if-let
- [ ] **Error type losing context**: flag handler error types that convert to bare `StatusCode` (e.g., `impl IntoResponse for MyError` returning only `StatusCode::INTERNAL_SERVER_ERROR`) without logging the source error -- the client gets an opaque 500, and operators get no diagnostic information
- [ ] **Missing catch_unwind in Actix-web**: flag Actix-web configurations without panic handling -- by default, a panic in a handler kills the worker thread; with enough panics the server degrades; use `middleware::Condition` with catch_unwind or ensure handlers never panic
- [ ] **Anyhow in handler signatures**: flag handlers returning `anyhow::Result<impl IntoResponse>` without an `IntoResponse` impl for `anyhow::Error` -- this does not compile in Axum by default; use a custom error type that wraps anyhow and implements `IntoResponse`

## Common False Positives

- **CLI tools or build scripts**: Rust files that import web framework types for code generation, testing, or client-side use do not need middleware or graceful shutdown.
- **Unwrap on infallible operations**: `.unwrap()` on `Mutex::lock()` is idiomatic when the lock is never poisoned (no panic while holding it). Only flag unwrap on user-derived input.
- **Blocking in spawn_blocking**: `std::fs` or `std::thread::sleep` inside a `spawn_blocking` closure is correct by design.
- **Single-threaded Actix runtime**: Actix-web can run on a single-threaded runtime (`#[actix_web::main(workers = 1)]`) where `RefCell` is safe -- but this is rare in production.
- **Test modules**: `#[cfg(test)]` modules using `reqwest::blocking` or `std::thread::sleep` are not async handlers.
- **Rocket managed state**: Rocket's `State<T>` requires `T: Send + Sync`, so the type system enforces thread safety.

## Severity Guidance

| Finding | Severity |
|---|---|
| Blocking I/O on Tokio runtime without spawn_blocking | Critical |
| Mutable static or RefCell in Actix-web shared state (data race) | Critical |
| .unwrap() on user-derived input in handler (panic crash) | Critical |
| Missing request body size limit (memory exhaustion DoS) | Important |
| Silent extractor rejection leaking type names | Important |
| Missing timeout layer on server | Important |
| Arc<Mutex<T>> on read-heavy state causing contention | Important |
| Error type losing source error chain (blind 500s) | Important |
| Missing CORS configuration for browser-facing API | Important |
| Missing graceful shutdown signal handler | Important |
| Missing request logging/tracing middleware | Minor |
| Missing compression layer for JSON APIs | Minor |
| CPU-intensive work on async runtime without spawn_blocking | Important |
| Nested Tokio runtime creation (panic) | Important |

## See Also

- `sec-owasp-a05-misconfiguration` -- missing CORS, missing rate limiting, missing body size limits
- `conc-async-cancellation` -- Tokio cancellation safety and task lifecycle
- `conc-race-conditions-data-races` -- shared state synchronization in concurrent handlers
- `reliability-timeout-deadline-propagation` -- request timeouts and graceful shutdown
- `principle-fail-fast` -- extractor error handling at the handler boundary

## Authoritative References

- [Axum Documentation -- Error Handling](https://docs.rs/axum/latest/axum/error_handling/index.html)
- [Axum Documentation -- Extractors](https://docs.rs/axum/latest/axum/extract/index.html)
- [Actix-web Documentation -- Application State](https://actix.rs/docs/application/#state)
- [Rocket Documentation -- Fairings](https://rocket.rs/guide/fairings/)
- [Tower Documentation -- ServiceBuilder](https://docs.rs/tower/latest/tower/struct.ServiceBuilder.html)
- [Tokio Documentation -- Bridging Sync and Async](https://tokio.rs/tokio/topics/bridging)
- [tower-http Documentation](https://docs.rs/tower-http/latest/tower_http/)
