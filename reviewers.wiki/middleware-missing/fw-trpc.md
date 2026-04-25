---
id: fw-trpc
type: primary
depth_role: leaf
focus: Detect tRPC security and runtime pitfalls including publicProcedure on protected endpoints, missing input validation, inconsistent middleware application, subscription resource leaks, unbounded response payloads, error detail leakage, and missing rate limiting.
parents:
  - index.md
  - "../csrf-missing/index.md"
covers:
  - publicProcedure used on endpoints that should require authentication
  - Missing Zod input schema on procedures accepting user data
  - Middleware not applied consistently across router sub-trees
  - Subscription without cleanup on disconnect
  - Large payloads in tRPC responses without pagination
  - TRPCError messages leaking internal details to client
  - Missing rate limiting middleware on public procedures
  - Procedure handler doing too much instead of delegating to service layer
  - tRPC router growing into monolith without sub-router decomposition
  - Type inference lost via explicit any or unknown casts
  - Missing error formatting in createTRPCContext or error formatter
  - Type safety bypassed via any casts, ts-ignore, or untyped inputs
  - Flat router with all procedures in a single file instead of modular organization
  - Middleware that mutates context without proper typing
  - Inconsistent procedure naming -- mixed verbs and nouns
  - Error handling using generic throws instead of TRPCError with proper codes
  - Query procedure performing mutations or vice versa
  - "Missing input validation despite Zod/superstruct schema being available"
  - Procedure exposing internal types to client
  - "Missing middleware for cross-cutting concerns (auth, logging)"
  - Missing input validation via zValidator or manual checks on route handlers
  - "c.env secrets leaking to client responses in edge/worker context"
  - Middleware ordering issues where auth runs after route handlers
  - Missing global error handler via app.onError
  - CORS misconfiguration allowing wildcard origins with credentials
  - "Missing rate limiting for edge/worker deployments"
  - "c.html() called with unsanitized user input enabling XSS"
  - "Missing OpenAPI schema generation via hono/zod-openapi"
  - "Context object (c) captured in closures or stored in long-lived references causing memory leaks in serverless"
  - Missing type-safe routes via hc client or RPC types
  - "c.req.query()/c.req.param() used without validation or type coercion"
  - "Middleware not calling await next() or returning before next()"
  - Serverless function timeout too short for cold start workloads
  - Edge function using Node.js APIs not available at edge runtime
  - Secrets committed in vercel.json or netlify.toml
  - Missing ISR or revalidation configuration for stale content
  - Build output exceeding platform limits
  - Missing security headers in _headers or vercel.json
  - Environment variable exposed to client via NEXT_PUBLIC_ or framework prefix
  - Missing rate limiting on serverless function endpoints
  - Middleware doing heavy computation at edge
  - Missing cache-control headers on API routes
  - "Missing helmet() middleware for security headers"
  - Missing rate limiting on public or auth endpoints
  - body-parser without payload size limits enabling denial of service
  - CORS wildcard origin combined with credentials allowing cookie theft
  - Error handling middleware not registered last in the middleware chain
  - "Async route handlers without try/catch or express-async-errors wrapper"
  - "SQL/NoSQL injection via unsanitized req.body or req.params"
  - Missing input validation on request body, params, and query
  - res.send with user-controlled content enabling reflected XSS
  - Missing CSRF protection on state-changing endpoints
  - trust proxy not configured when running behind a reverse proxy
  - Static file serving from application root exposing source files
  - "Callback hell in route handlers instead of async/await"
  - Binding errors silently ignored allowing malformed input into handlers
  - Goroutine leak in handlers due to missing context cancellation
  - Missing recovery middleware letting a panic crash the entire server
  - Missing CORS middleware on API routes
  - Missing rate-limiting middleware on auth endpoints
  - "context.Background() used instead of request-scoped context in handlers"
  - Writing to ResponseWriter after handler returns causing data race
  - "Missing graceful shutdown on SIGTERM/SIGINT"
  - Error strings instead of structured error responses
  - Missing request timeout middleware
  - Global mutable state accessed from handlers without synchronization
  - Fiber fasthttp body reuse after handler returns
  - Missing request body size limit
tags:
  - trpc
  - typescript
  - security
  - authentication
  - validation
  - rate-limiting
  - subscriptions
  - pagination
  - error-handling
  - middleware
  - web-framework
  - type-safety
  - router
  - procedure
  - rpc
  - api
  - zod
  - hono
  - edge
  - workers
  - cloudflare
  - deno
  - bun
  - serverless
  - vercel
  - netlify
  - isr
  - jamstack
  - security-headers
  - express
  - nodejs
  - rest-api
  - backend
  - http
  - go
  - gin
  - echo
  - fiber
  - chi
  - net-http
  - goroutine
aliases:
  - api-trpc
  - fw-hono
  - cloud-vercel-netlify-edge
  - fw-express
  - fw-go-web-frameworks
activation:
  file_globs:
    - "**/*.ts"
    - "**/*.tsx"
  keyword_matches:
    - trpc
    - tRPC
    - createTRPCRouter
    - publicProcedure
    - protectedProcedure
    - middleware
    - input
    - query
    - mutation
    - subscription
    - createCallerFactory
    - TRPCError
  structural_signals:
    - tRPC router with procedure definitions
    - tRPC middleware chain with context transformation
    - tRPC subscription with observable or async iterable
source:
  origin: file
  path: fw-trpc.md
  hash: "sha256:3cd4d120ead33441329e00c8c46c091e8deb8ebbde7df3add0dccf05c80b99bd"
---
# tRPC Security and Runtime Reviewer

## When This Activates

Activates when diffs touch tRPC router definitions, procedure implementations, middleware, or server configuration. While the companion `api-trpc` reviewer covers API design quality (type safety, naming, router organization), this reviewer focuses on security and runtime concerns: procedures exposed without authentication, missing input validation enabling injection, subscriptions leaking resources, responses exposing internal data, and errors revealing server internals. tRPC's simplicity makes it easy to add procedures without realizing they are publicly accessible by default.

## Audit Surface

- [ ] publicProcedure on mutation or query accessing user-specific data
- [ ] Procedure with .input() missing or using z.any()/z.unknown()/z.object({}).passthrough()
- [ ] protectedProcedure middleware checking auth but not applied to all sensitive routers
- [ ] subscription() without observable cleanup, return, or AbortController
- [ ] Query returning full database records without .select() or pagination
- [ ] TRPCError message containing stack trace, SQL query, or internal file path
- [ ] tRPC server setup without rate limiting middleware on public-facing procedures
- [ ] Procedure handler with 50+ lines of business logic instead of service delegation
- [ ] Single appRouter file with 20+ procedures and no mergeRouters
- [ ] Procedure input/output typed as any, unknown, or using as any in return
- [ ] createTRPCRouter without errorFormatter stripping internal details
- [ ] publicProcedure on subscription endpoint allowing unauthenticated real-time access
- [ ] Middleware mutating context without proper type via .pipe()
- [ ] createCallerFactory used in production request handling instead of client

## Detailed Checks

### Authentication and Authorization
<!-- activation: keywords=["publicProcedure", "protectedProcedure", "middleware", "ctx.session", "ctx.user", "isAuthed", "enforce", "auth", "session", "UNAUTHORIZED"] -->

- [ ] **publicProcedure on sensitive endpoint**: flag `publicProcedure` on mutations or queries that access, modify, or delete user-specific data (profile, orders, settings, billing) -- `publicProcedure` requires no authentication; use `protectedProcedure` or a role-based middleware; see `sec-owasp-a01-broken-access-control`
- [ ] **Inconsistent middleware application**: flag routers where some procedures use `protectedProcedure` and others in the same domain router use `publicProcedure` without clear justification -- mixed auth within a router suggests a missed procedure; audit all procedures in the file
- [ ] **Auth check in handler body**: flag procedures that check `ctx.session` or `ctx.user` inside the handler instead of using middleware -- this duplicates auth logic and risks forgetting the check; extract to a reusable middleware; see `principle-separation-of-concerns`
- [ ] **publicProcedure on subscription**: flag `publicProcedure.subscription()` -- unauthenticated subscriptions consume server resources (WebSocket connections, memory) and may expose real-time data to unauthorized users
- [ ] **Missing authorization after authentication**: flag `protectedProcedure` handlers that verify authentication (user exists) but not authorization (user owns the resource) -- IDOR vulnerability via ID enumeration

### Input Validation
<!-- activation: keywords=["input", "z.", "zod", "schema", "z.object", "z.string", "z.number", "z.any", "z.unknown", "passthrough", "validate", "parse"] -->

- [ ] **Missing input schema**: flag procedures that accept parameters via `ctx` or raw request data without `.input(z.object({...}))` -- tRPC procedures without input schemas accept any payload; use Zod for schema validation; see `principle-fail-fast`
- [ ] **z.any() or z.unknown() input**: flag `.input(z.any())` or `.input(z.unknown())` -- these accept any shape without validation, defeating type safety and enabling injection; define explicit schemas
- [ ] **z.object({}).passthrough()**: flag input schemas using `.passthrough()` -- this allows arbitrary additional fields through validation; use `.strict()` to reject unexpected fields or omit `.passthrough()`
- [ ] **Missing string constraints**: flag `z.string()` inputs without `.min()`, `.max()`, or `.regex()` constraints on fields used in database queries or displayed to users -- unbounded strings enable denial-of-service (megabyte inputs) and stored XSS
- [ ] **Numeric input without bounds**: flag `z.number()` inputs without `.min()`, `.max()`, `.int()`, or `.positive()` where the value is used as a limit, offset, or ID -- negative or excessively large values cause unexpected behavior

### Subscription Safety
<!-- activation: keywords=["subscription", "observable", "emit", "unsubscribe", "cleanup", "AbortController", "AsyncIterable", "WebSocket", "ws"] -->

- [ ] **Subscription without cleanup**: flag `subscription()` handlers using `observable()` without returning a cleanup function -- when clients disconnect, the observable continues running, leaking timers, event listeners, or database connections
- [ ] **Missing AbortController**: flag subscription handlers that start async operations (setInterval, event listeners, database watchers) without an AbortController or equivalent mechanism to cancel them on disconnect
- [ ] **Unbounded subscription emit**: flag subscriptions that emit events without any throttling or batching -- a high-frequency data source (real-time metrics, chat) can overwhelm the WebSocket connection and client
- [ ] **Subscription broadcasting sensitive data**: flag subscriptions that emit data without filtering by the authenticated user -- a subscription emitting all order updates instead of only the current user's orders leaks data

### Response Size and Pagination
<!-- activation: keywords=["findMany", "find", "select", "limit", "offset", "cursor", "pagination", "take", "skip", "page", "pageSize", "infinite"] -->

- [ ] **Unbounded query response**: flag procedures that return database query results (Prisma `findMany()`, Drizzle `.select()`, raw SQL) without `.take()`, `LIMIT`, or cursor-based pagination -- returning all records from a growing table causes OOM and slow responses
- [ ] **Missing pagination input**: flag list/search procedures without `limit` and `offset`/`cursor` in the input schema -- clients cannot control page size; hardcode a maximum limit (e.g., 100) even with default pagination
- [ ] **Full model in response**: flag procedures returning Prisma models or ORM entities directly instead of selecting specific fields -- internal fields (passwordHash, deletedAt, internalNotes) leak to the client; use `.select()` or map to a DTO
- [ ] **Missing response size check**: flag procedures that aggregate or collect data in memory before responding without a size guard -- set a maximum response size or stream large datasets

### Error Handling and Information Leakage
<!-- activation: keywords=["TRPCError", "errorFormatter", "error", "throw", "catch", "INTERNAL_SERVER_ERROR", "message", "stack", "cause"] -->

- [ ] **Error leaking internals**: flag `throw new TRPCError({ code: '...', message: error.message })` where `error` is a caught database, ORM, or system error -- raw error messages contain SQL queries, file paths, and stack traces; sanitize before including in TRPCError
- [ ] **Missing errorFormatter**: flag `initTRPC.create()` or `createTRPCRouter` without an `errorFormatter` that strips internal details from error responses -- the default formatter includes the full error shape; production deployments should mask internal errors
- [ ] **Stack trace in error cause**: flag TRPCError with `cause: error` where `error` is an unfiltered caught exception -- the `cause` field is serialized and sent to the client in development mode; ensure production error formatting removes it
- [ ] **Generic error codes**: flag `throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })` for errors that have a more specific code (BAD_REQUEST, NOT_FOUND, FORBIDDEN, CONFLICT) -- generic codes hide error semantics from clients
- [ ] **Unhandled promise in procedure**: flag async procedure handlers without try/catch around database or external service calls -- unhandled rejections become INTERNAL_SERVER_ERROR with potentially verbose messages

### Rate Limiting and Abuse Prevention
<!-- activation: keywords=["rateLimit", "rateLimiter", "throttle", "limit", "publicProcedure", "middleware", "ip", "window", "token bucket"] -->

- [ ] **No rate limiting on public procedures**: flag tRPC setups with `publicProcedure` endpoints but no rate limiting middleware -- public procedures are accessible without authentication and are brute-force/DDoS targets; apply rate limiting via tRPC middleware, Express/Fastify middleware, or an API gateway
- [ ] **Rate limit not on auth procedures**: flag login, registration, password reset, or OTP verification procedures without rate limiting -- these are high-value brute-force targets regardless of whether they use publicProcedure or protectedProcedure
- [ ] **Missing per-user rate limit**: flag rate limiting applied only by IP without per-user limits on authenticated procedures -- a single authenticated user can abuse expensive operations from a single connection

### Procedure Responsibility
<!-- activation: keywords=["procedure", "handler", "service", "repository", "prisma", "db.", "email", "notification", "queue", "logger"] -->

- [ ] **Fat procedure handler**: flag procedure handlers exceeding ~50 lines that contain database queries, business logic, email sending, and response mapping inline -- extract to a service layer; procedures should validate input, call a service, and return the result; see `principle-separation-of-concerns`
- [ ] **Direct database access in procedure**: flag procedures that import and use Prisma/Drizzle/database client directly instead of through a service or repository -- this couples the API layer to the database schema and prevents reuse
- [ ] **Side effects in query procedure**: flag query procedures that send emails, enqueue jobs, write audit logs, or perform any mutation -- queries may be retried, prefetched, or cached by the client; side effects belong in mutations

## Common False Positives

- **publicProcedure on health/status endpoints**: health checks, version endpoints, and public content listing legitimately use publicProcedure. Only flag when the endpoint accesses user-specific or sensitive data.
- **z.object({}).passthrough() for webhook payloads**: endpoints receiving external webhook payloads may need passthrough to accept unknown fields. Verify the use case before flagging.
- **No rate limiting behind API gateway**: if the tRPC server runs behind an API gateway (AWS API Gateway, Cloudflare) that handles rate limiting, application-level rate limiting may be redundant.
- **Full model return in internal tools**: admin dashboards or internal debugging tools may intentionally return full database models. Verify the exposure context.
- **createCallerFactory in tests**: `createCallerFactory` is the standard approach for testing tRPC procedures. Only flag its use in production request-handling code.

## Severity Guidance

| Finding | Severity |
|---|---|
| publicProcedure on endpoint accessing/modifying user data (authz bypass) | Critical |
| TRPCError leaking SQL queries, file paths, or stack traces to client | Critical |
| Missing input validation on mutation accepting user-controlled data | Critical |
| Subscription emitting unfiltered data to all connected users | Critical |
| protectedProcedure without authorization check (IDOR) | Important |
| Missing errorFormatter in production tRPC setup | Important |
| Unbounded query response without pagination | Important |
| Subscription without cleanup function (resource leak) | Important |
| No rate limiting on login/registration procedures | Important |
| Fat procedure handler with inline business logic (50+ lines) | Minor |
| Missing string length constraints on z.string() input | Minor |
| createCallerFactory used in production request path | Minor |
| Generic INTERNAL_SERVER_ERROR code for specific errors | Minor |

## See Also

- `api-trpc` -- tRPC API design quality: type safety, naming, router organization, procedure semantics
- `sec-owasp-a01-broken-access-control` -- publicProcedure on sensitive endpoints is broken access control
- `sec-owasp-a03-injection` -- missing input validation enables injection via procedure parameters
- `sec-owasp-a05-misconfiguration` -- missing error formatter leaking internals is security misconfiguration
- `principle-fail-fast` -- Zod input validation enforces fail-fast at the API boundary
- `principle-separation-of-concerns` -- procedure handlers should delegate to services, not contain business logic

## Authoritative References

- [tRPC Documentation](https://trpc.io/docs)
- [tRPC Documentation -- Error Handling](https://trpc.io/docs/server/error-handling)
- [tRPC Documentation -- Error Formatting](https://trpc.io/docs/server/error-formatting)
- [tRPC Documentation -- Middleware](https://trpc.io/docs/server/middlewares)
- [tRPC Documentation -- Subscriptions](https://trpc.io/docs/server/subscriptions)
- [Zod Documentation](https://zod.dev/)
- [OWASP -- API Security Top 10](https://owasp.org/API-Security/)
