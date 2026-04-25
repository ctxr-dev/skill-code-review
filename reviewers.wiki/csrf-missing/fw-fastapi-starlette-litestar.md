---
id: fw-fastapi-starlette-litestar
type: primary
depth_role: leaf
focus: Detect pitfalls in FastAPI, Starlette, and Litestar applications including missing Pydantic validation, dependency injection side effects, async misuse, CORS misconfiguration, and OpenAPI schema exposure that cause vulnerabilities or production failures.
parents:
  - index.md
covers:
  - "Endpoint accepting raw dict/Any instead of a Pydantic model for request body"
  - "Depends() with database commits, emails, or other side effects in the dependency"
  - "BackgroundTasks function without try/except swallowing errors silently"
  - Missing CORSMiddleware or wildcard allow_origins with allow_credentials=True
  - "sync def endpoint performing blocking I/O on the async event loop"
  - Missing rate limiting on authentication or public endpoints
  - "OpenAPI /docs and /redoc exposed in production without authentication"
  - Missing exception handlers allowing unformatted 500 responses
  - Lifespan context manager not cleaning up resources on shutdown
  - response_model exposing internal fields like hashed_password or internal IDs
  - Missing OAuth2PasswordBearer, APIKeyHeader, or equivalent security dependency
  - "Path/Query/Body parameters without constrained types or validation"
tags:
  - fastapi
  - starlette
  - litestar
  - python
  - async
  - pydantic
  - security
  - validation
  - openapi
  - middleware
activation:
  file_globs:
    - "**/*.py"
  keyword_matches:
    - FastAPI
    - Starlette
    - Litestar
    - litestar
    - APIRouter
    - Depends
    - Query
    - Body
    - Path
    - HTTPException
    - BackgroundTasks
    - middleware
    - lifespan
  structural_signals:
    - FastAPI application with route handlers
    - Starlette ASGI application
    - Litestar controller or route handler
source:
  origin: file
  path: fw-fastapi-starlette-litestar.md
  hash: "sha256:1c7b1e1b5598e51aa87e729aebf47ca1c40dfd5a1fa4173480e71cd51f03de14"
---
# FastAPI / Starlette / Litestar Framework Reviewer

## When This Activates

Activates when diffs touch FastAPI, Starlette, or Litestar application setup, route handlers, dependency injection, middleware, or lifespan management. These ASGI frameworks share a common async model and similar pitfall classes. FastAPI adds Pydantic validation and automatic OpenAPI docs on top of Starlette; Litestar provides its own dependency injection and validation layer. All three make it easy to accidentally block the event loop with sync code, expose internal data models via response schemas, and ship production APIs with unauthenticated docs endpoints. This reviewer focuses on framework-level patterns -- for ORM-specific issues see `orm-sqlalchemy`.

## Audit Surface

- [ ] Endpoint function signature using dict, Any, or no type hint for the request body instead of a Pydantic BaseModel
- [ ] Depends() callable that performs database writes, sends notifications, or calls external APIs
- [ ] BackgroundTasks.add_task() target function with no try/except block
- [ ] CORSMiddleware with allow_origins=['*'] combined with allow_credentials=True
- [ ] sync def route handler calling requests.get(), time.sleep(), or other blocking stdlib calls
- [ ] No rate-limiting middleware (slowapi, or custom) in the middleware stack
- [ ] FastAPI app created without docs_url=None and redoc_url=None in production or without auth dependency on docs
- [ ] No custom exception handler registered for RequestValidationError or HTTPException
- [ ] Lifespan async context manager missing cleanup logic in the finally or after-yield block
- [ ] response_model set to an ORM/internal model that includes sensitive fields
- [ ] Router or app with no Depends() security scheme on protected endpoints
- [ ] Path, Query, or Body parameter without Field constraints (ge, le, max_length, regex)
- [ ] Middleware ordering placing authentication after CORS or after route matching
- [ ] Starlette/Litestar app with DEBUG=True or debug=True in production
- [ ] Missing HTTPS redirect middleware in production deployment

## Detailed Checks

### Pydantic Validation and Response Models
<!-- activation: keywords=["BaseModel", "Field", "response_model", "Body", "Query", "Path", "validator", "field_validator", "model_validator", "schema_extra", "Config", "orm_mode", "from_attributes"] -->

- [ ] **Missing Pydantic model on input**: flag endpoint parameters typed as `dict`, `Any`, `bytes`, or missing type hints for request bodies -- Pydantic validation is FastAPI's primary defense against malformed input; bypassing it admits arbitrary data into the handler; see `principle-fail-fast`
- [ ] **Unconstrained parameters**: flag `Query()`, `Path()`, `Body()`, and `Field()` without constraints (`ge`, `le`, `max_length`, `min_length`, `regex`, `gt`, `lt`) on user-facing inputs -- unbounded strings enable denial-of-service via memory exhaustion and integers outside business range cause logic bugs
- [ ] **response_model leaking internals**: flag `response_model=UserDB` or similar patterns where the response model is the ORM/internal model containing `hashed_password`, `secret_key`, `internal_id`, or `is_superuser` -- use a separate response schema with `model_config = ConfigDict(from_attributes=True)` and only the fields clients should see
- [ ] **model_validate with untrusted data**: flag `Model.model_validate(request.json())` bypassing FastAPI's built-in parsing -- this skips FastAPI's error formatting and returns raw Pydantic errors to clients

### Dependency Injection Pitfalls
<!-- activation: keywords=["Depends", "Provide", "Injectable", "dependency", "get_db", "get_session", "get_current_user", "Security", "OAuth2PasswordBearer", "APIKeyHeader"] -->

- [ ] **Side effects in Depends()**: flag dependencies that commit transactions, send emails, write logs, or call external services -- dependencies may be called multiple times per request (sub-dependencies, overrides in tests); side effects should live in the route handler or a service layer; see `principle-separation-of-concerns`
- [ ] **Missing security dependency**: flag route handlers or entire routers without a security dependency (`Depends(get_current_user)`, `OAuth2PasswordBearer`, `APIKeyHeader`, or Litestar guards) on endpoints that access or modify user data -- unauthenticated endpoints are broken access control; see `sec-owasp-a01-broken-access-control`
- [ ] **Database session not closed**: flag `Depends(get_db)` where `get_db` is a regular function (not a generator with `yield` and `finally`) -- sessions leak on exceptions; use `yield session` with `finally: session.close()`
- [ ] **Litestar Provide without sync_to_thread**: flag Litestar `Provide()` wrapping a sync function that performs I/O without `sync_to_thread=True` -- the sync call blocks the event loop

### Async and Event Loop Safety
<!-- activation: keywords=["async def", "sync def", "def ", "await", "asyncio", "run_in_executor", "time.sleep", "requests.get", "requests.post", "open(", "subprocess"] -->

- [ ] **Blocking call in async handler**: flag `sync def` or `async def` route handlers that call `requests.get()`, `requests.post()`, `time.sleep()`, `open()` for file I/O, `subprocess.run()`, or other blocking stdlib calls -- these block the event loop thread, starving all concurrent requests; use `httpx.AsyncClient`, `asyncio.sleep()`, `aiofiles`, or `run_in_executor`
- [ ] **sync def with heavy computation**: flag `def` (sync) route handlers in FastAPI performing CPU-intensive work -- FastAPI runs sync handlers in a threadpool with limited workers; CPU work should use `run_in_executor` with a `ProcessPoolExecutor` or be offloaded to a task queue
- [ ] **Missing await on coroutine**: flag coroutine calls without `await` -- the coroutine is created but never executed; Python may issue a RuntimeWarning but the route returns without the intended operation completing

### Background Tasks and Error Handling
<!-- activation: keywords=["BackgroundTasks", "add_task", "background", "exception_handler", "RequestValidationError", "HTTPException", "StarletteHTTPException", "on_event", "lifespan"] -->

- [ ] **Background task without error handling**: flag functions passed to `BackgroundTasks.add_task()` that contain no try/except -- background tasks run after the response is sent; unhandled exceptions are logged but not reported to the client or to error tracking; wrap in try/except and report to Sentry or equivalent
- [ ] **Missing exception handlers**: flag FastAPI/Starlette apps without custom handlers for `RequestValidationError` and `HTTPException` -- the default 422 response includes Pydantic's raw error format which leaks field names and type internals; customize for consistent error envelopes
- [ ] **Lifespan missing cleanup**: flag `@asynccontextmanager` lifespan functions that create resources (DB pools, HTTP clients, caches) in the setup phase but have no `finally` block or post-yield cleanup -- on shutdown, connections leak and graceful termination fails
- [ ] **on_event deprecated usage**: flag `@app.on_event("startup")` and `@app.on_event("shutdown")` -- these are deprecated in FastAPI 0.93+; use the lifespan parameter instead for proper resource lifecycle management

### CORS, Security Headers, and OpenAPI Exposure
<!-- activation: keywords=["CORSMiddleware", "allow_origins", "allow_credentials", "docs_url", "redoc_url", "openapi_url", "/docs", "/redoc", "/openapi.json", "TrustedHostMiddleware", "HTTPSRedirectMiddleware"] -->

- [ ] **CORS wildcard with credentials**: flag `CORSMiddleware(allow_origins=["*"], allow_credentials=True)` -- this is rejected by browsers but signals intent to allow any origin with cookies; if the origin is dynamically reflected from the request, it enables cross-origin attacks; see `sec-owasp-a05-misconfiguration`
- [ ] **OpenAPI docs exposed in production**: flag FastAPI apps where `docs_url`, `redoc_url`, and `openapi_url` are not disabled or protected by an auth dependency in production -- the schema reveals every endpoint, parameter, and response model to unauthenticated users; set `docs_url=None, redoc_url=None, openapi_url=None` or gate behind auth
- [ ] **Missing TrustedHostMiddleware**: flag production ASGI apps without `TrustedHostMiddleware` -- without host validation, host header injection attacks can poison absolute URLs in responses
- [ ] **Missing HTTPS redirect**: flag production deployments without `HTTPSRedirectMiddleware` or equivalent proxy-level redirect -- HTTP traffic exposes credentials and session tokens in transit

### Rate Limiting and Abuse Prevention
<!-- activation: keywords=["slowapi", "rate", "limit", "throttle", "login", "auth", "register", "password", "token", "Limiter"] -->

- [ ] **Missing rate limiting**: flag ASGI apps with authentication endpoints but no rate-limiting middleware (slowapi, custom middleware, or API gateway config) -- brute-force and credential stuffing attacks go unchecked
- [ ] **Rate limiter not applied to auth routes**: flag rate-limiting middleware that is applied globally with a generous limit but not overridden with a stricter limit on login, registration, and password reset routes -- 100 req/min globally is too generous for auth endpoints

## Common False Positives

- **Internal microservice APIs**: services behind a service mesh or VPN may legitimately skip CORS, rate limiting, and OpenAPI auth. Verify the deployment context before flagging.
- **sync def route handlers doing no I/O**: FastAPI runs sync handlers in a threadpool; a sync handler that only performs CPU-light computation (JSON manipulation, simple math) is not blocking the event loop and does not need to be async.
- **OpenAPI docs in dev/staging**: docs endpoints enabled in development or staging environments are expected. Only flag when production settings or environment detection is absent.
- **response_model with explicit exclude**: if the response model uses `model_config` with `json_schema_extra` or `Field(exclude=True)` to hide sensitive fields, the internal model may be acceptable as response_model.
- **BackgroundTasks for non-critical work**: fire-and-forget tasks like analytics pings may intentionally omit error handling. Flag only when the task performs business-critical operations (email delivery, payment callbacks).

## Severity Guidance

| Finding | Severity |
|---|---|
| CORS wildcard with credentials reflecting origin | Critical |
| Missing security dependency on endpoints handling user data | Critical |
| response_model exposing hashed_password or secret fields | Critical |
| Blocking I/O call (requests, time.sleep) in async route handler | Critical |
| Endpoint accepting raw dict/Any without Pydantic validation | Important |
| OpenAPI docs exposed in production without authentication | Important |
| BackgroundTasks function without error handling | Important |
| Depends() with database session not using yield/finally | Important |
| Missing exception handlers for RequestValidationError | Important |
| Lifespan context manager missing cleanup logic | Important |
| Missing rate limiting on auth endpoints | Important |
| Missing TrustedHostMiddleware in production | Important |
| Unconstrained Query/Path/Body parameters | Minor |
| Using deprecated on_event instead of lifespan | Minor |
| Missing HTTPS redirect middleware | Minor |

## See Also

- `orm-sqlalchemy` -- SQLAlchemy session management and query pitfalls in async FastAPI apps
- `sec-owasp-a01-broken-access-control` -- missing auth dependencies and unauthenticated endpoints
- `sec-owasp-a05-misconfiguration` -- CORS wildcards, exposed docs, debug mode in production
- `sec-owasp-a03-injection` -- SQL injection via raw queries in route handlers
- `principle-fail-fast` -- validate at the boundary with Pydantic models, not deep in business logic
- `principle-separation-of-concerns` -- dependencies should not mix retrieval with side effects

## Authoritative References

- [FastAPI Documentation -- Security](https://fastapi.tiangolo.com/tutorial/security/)
- [FastAPI Documentation -- Dependencies](https://fastapi.tiangolo.com/tutorial/dependencies/)
- [FastAPI Documentation -- Handling Errors](https://fastapi.tiangolo.com/tutorial/handling-errors/)
- [FastAPI Documentation -- Background Tasks](https://fastapi.tiangolo.com/tutorial/background-tasks/)
- [Starlette Documentation -- Middleware](https://www.starlette.io/middleware/)
- [Litestar Documentation -- Guards and Security](https://docs.litestar.dev/latest/usage/security/)
- [Pydantic Documentation -- Validators](https://docs.pydantic.dev/latest/concepts/validators/)
- [OWASP -- REST Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html)
