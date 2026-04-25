---
id: fw-fastify
type: primary
depth_role: leaf
focus: Detect Fastify-specific pitfalls in schema validation, plugin encapsulation, lifecycle hooks, error handling, and performance patterns that cause validation bypasses, scope leaks, or unhandled errors.
parents:
  - index.md
covers:
  - "Missing JSON schema validation on route definitions (Fastify's core strength)"
  - Plugin encapsulation violations accessing parent scope decorators
  - Missing custom error handler allowing default error responses to leak internals
  - Async plugin without proper fastify-plugin wrapping or await register
  - preHandler hooks performing side effects that break request isolation
  - Missing content-type parser limits enabling payload-based denial of service
  - Missing rate limiting on public or authentication endpoints
  - Missing CORS configuration on API-serving instances
  - "reply.send() called after reply already sent causing FST_ERR_REP_ALREADY_SENT"
  - Large payloads processed in memory instead of using streaming
  - Missing structured request logging configuration
  - Missing graceful shutdown with onClose hooks
tags:
  - fastify
  - nodejs
  - schema-validation
  - plugin
  - hooks
  - backend
  - rest-api
  - performance
  - encapsulation
activation:
  file_globs:
    - "**/*.js"
    - "**/*.ts"
  keyword_matches:
    - fastify
    - Fastify
    - register
    - route
    - preHandler
    - onRequest
    - schema
    - Type
    - TypeBox
    - fastify-plugin
    - decorateRequest
    - addHook
  structural_signals:
    - Route without JSON schema validation
    - Plugin encapsulation violation
    - Missing error handler
source:
  origin: file
  path: fw-fastify.md
  hash: "sha256:68715df1f9f361a9e9af18ddcab8ef78dfb0f3e381e85118b490dc01b6e734a4"
---
# Fastify Schema Validation, Plugin Encapsulation, and Lifecycle Pitfalls

## When This Activates

Activates when diffs touch Fastify instance creation, route definitions, plugin registrations, lifecycle hooks, or schema definitions. Fastify differentiates itself from Express through built-in JSON schema validation, an encapsulated plugin system, and structured lifecycle hooks. Misusing these features -- skipping schema validation, breaking encapsulation boundaries, or mismanaging async plugin registration -- negates Fastify's advantages and introduces bugs that are unique to its architecture. This reviewer targets patterns specific to Fastify's design philosophy.

## Audit Surface

- [ ] Route definition without schema property or with schema missing body/querystring/params validation
- [ ] Plugin accessing parent scope decorators without fastify-plugin wrapper
- [ ] Fastify instance with no setErrorHandler() call (default handler exposes stack traces)
- [ ] Async plugin not wrapped in fastify-plugin or not properly awaited via after()
- [ ] preHandler or onRequest hook writing to shared mutable state outside request scope
- [ ] Fastify instance without bodyLimit option or route without specific bodyLimit for uploads
- [ ] API instance with no @fastify/rate-limit or custom rate limiting plugin
- [ ] API instance with no @fastify/cors registration
- [ ] Route handler calling reply.send() after a branch that already sent a response
- [ ] Route handler reading entire large payload into memory instead of streaming
- [ ] Fastify instance created without logger option or with logger: false in production
- [ ] Fastify instance without onClose hook for connection cleanup or graceful shutdown
- [ ] Schema using Type.Any() or Type.Unknown() where a specific type is known
- [ ] Decorator access without hasDecorator() guard in a plugin with uncertain registration order
- [ ] fastify.listen() binding to 0.0.0.0 without explicit documentation of intent

## Detailed Checks

### JSON Schema Validation
<!-- activation: keywords=["schema", "body", "querystring", "params", "headers", "response", "Type.", "TypeBox", "Ajv", "validation", "serialize"] -->

- [ ] **Missing route schema**: flag route definitions that omit the `schema` property entirely or define `schema` without `body`, `querystring`, or `params` sections when the handler accesses those request properties -- Fastify's built-in Ajv validation is its primary defense against malformed input; skipping it discards free validation and serialization performance
- [ ] **Type.Any() or Type.Unknown() overuse**: flag TypeBox schemas using `Type.Any()` or `Type.Unknown()` for fields where the expected type is known -- these disable validation for that field, creating a hole in the schema
- [ ] **Missing response schema**: flag routes returning user-facing data without a `response` schema -- response schemas enable fast serialization via fast-json-stringify and prevent accidental leakage of internal fields (password hashes, internal IDs) that are not in the schema
- [ ] **Schema-handler mismatch**: flag routes where the schema defines fields that the handler does not use, or the handler accesses request properties not covered by the schema -- this indicates a stale schema that no longer validates what the handler processes

### Plugin Encapsulation
<!-- activation: keywords=["register", "fastify-plugin", "fp(", "decorate", "decorateRequest", "decorateReply", "hasDecorator", "encapsulate", "plugin"] -->

- [ ] **Encapsulation bypass without fastify-plugin**: flag plugins that access or depend on decorators, hooks, or plugins from a parent scope without being wrapped in `fastify-plugin` (or `fp()`) -- Fastify encapsulates each plugin in its own context; unwrapped plugins cannot see parent decorators, leading to undefined decorator errors at runtime
- [ ] **Unnecessary fastify-plugin wrapper**: flag plugins wrapped in `fastify-plugin` that only register routes and do not need to share decorators or hooks with sibling plugins -- unnecessary scope breaking weakens encapsulation and can cause decorator name collisions
- [ ] **Missing hasDecorator guard**: flag plugins that access `request.customProp` or `fastify.customService` without first checking `fastify.hasDecorator('customService')` -- if plugin registration order changes, the decorator may not exist yet, causing a runtime crash
- [ ] **Plugin registration order dependency**: flag plugins where the registration order matters for correctness (plugin B depends on decorator from plugin A) but this dependency is not documented or enforced via `after()` or dependency declarations

### Lifecycle Hooks and Error Handling
<!-- activation: keywords=["addHook", "onRequest", "preHandler", "preParsing", "preValidation", "preSerialization", "onSend", "onResponse", "onError", "onClose", "setErrorHandler", "setNotFoundHandler"] -->

- [ ] **Missing custom error handler**: flag Fastify instances that do not call `setErrorHandler()` -- the default error handler returns the error message and statusCode to the client, which in production can leak stack traces and internal error details
- [ ] **Hook mutating shared state**: flag `preHandler`, `onRequest`, or other lifecycle hooks that write to module-level variables or shared objects -- hooks run per-request and shared mutation causes race conditions under concurrent load
- [ ] **Missing onClose hook for cleanup**: flag Fastify instances that open database connections, message queue connections, or file handles but do not register `onClose` hooks to clean them up -- without cleanup, graceful shutdown leaves connections dangling
- [ ] **Hook swallowing errors**: flag lifecycle hooks that catch errors but do not re-throw or call `reply.send()` with an error response -- the request hangs until the client timeout fires

### Reply Safety and Streaming
<!-- activation: keywords=["reply.send", "reply.code", "reply.type", "reply.header", "return", "stream", "pipeline", "pump", "multipart", "FST_ERR"] -->

- [ ] **Double reply.send()**: flag route handlers or hooks where `reply.send()` can execute more than once (e.g., send in a conditional branch followed by unconditional send) -- Fastify throws FST_ERR_REP_ALREADY_SENT; the second send is silently dropped and the error is logged
- [ ] **Missing return after reply.send() in hook**: flag preHandler hooks that call `reply.send()` to short-circuit but do not `return reply` -- without the return, the next hook or handler still executes
- [ ] **Large payload without streaming**: flag route handlers that buffer entire request bodies for file uploads or large JSON payloads when `@fastify/multipart` with streaming or `request.raw` piping would be appropriate -- buffering large payloads causes memory spikes under load
- [ ] **Missing content-type limit**: flag Fastify instances without explicit `bodyLimit` in server options and routes handling uploads without per-route `bodyLimit` -- the default is 1MB which may be too large for most routes or too small for uploads; set explicitly per use case

### Logging and Observability
<!-- activation: keywords=["logger", "log", "pino", "request.log", "reply.log", "serializers", "redact"] -->

- [ ] **Logging disabled**: flag `fastify({ logger: false })` or missing logger option in production configuration -- Fastify integrates Pino by default; disabling it removes structured request logging, making production debugging impossible
- [ ] **Sensitive data in logs**: flag logger configurations without `serializers` or `redact` options when the application handles authentication tokens, passwords, or PII -- Pino logs the full request by default; use redact paths to mask sensitive headers (authorization, cookie)
- [ ] **request.log not used**: flag route handlers using `console.log` instead of `request.log` -- console.log lacks request context (request ID, timing); Pino's child logger on each request provides correlated, structured logs

## Common False Positives

- **Internal RPC routes without schema**: routes called only by trusted internal services with a shared contract (protobuf, gRPC gateway) may skip JSON schema validation if the contract is enforced elsewhere.
- **fastify-plugin on shared utility plugins**: plugins registering shared decorators (database clients, auth utilities) correctly use fastify-plugin to break encapsulation by design.
- **logger: false in test configuration**: disabling logging in test environments is standard practice to reduce noise.
- **Type.Any() for webhook payloads**: incoming webhooks from third parties with unstable schemas may legitimately use Type.Any() with manual validation in the handler.
- **Missing CORS on server-to-server APIs**: APIs that only serve backend clients do not need CORS headers.

## Severity Guidance

| Finding | Severity |
|---|---|
| Route without schema validation on user-facing input | Critical |
| Default error handler leaking stack traces in production | Critical |
| Hook mutating shared module-level state (race condition) | Critical |
| SQL/NoSQL injection via unvalidated request properties | Critical |
| Plugin encapsulation violation causing runtime undefined errors | Important |
| Missing response schema leaking internal fields | Important |
| Double reply.send() causing FST_ERR_REP_ALREADY_SENT | Important |
| Large payload buffered in memory without streaming | Important |
| Missing rate limiting on auth endpoints | Important |
| Missing onClose hook for database connection cleanup | Important |
| Logging disabled in production configuration | Minor |
| console.log used instead of request.log | Minor |
| Missing bodyLimit configuration | Minor |
| Type.Any() used where specific type is known | Minor |

## See Also

- `sec-owasp-a03-injection` -- input validation bypasses when schema validation is missing
- `sec-owasp-a05-misconfiguration` -- missing error handler, default settings, logging disabled
- `principle-fail-fast` -- schema validation at the route boundary is fail-fast by design
- `principle-separation-of-concerns` -- plugin encapsulation enforces module boundaries
- `perf-startup-cold-start` -- response schemas enable fast-json-stringify for serialization performance

## Authoritative References

- [Fastify Documentation -- "Validation and Serialization"](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/)
- [Fastify Documentation -- "Plugins"](https://fastify.dev/docs/latest/Reference/Plugins/)
- [Fastify Documentation -- "Lifecycle"](https://fastify.dev/docs/latest/Reference/Lifecycle/)
- [Fastify Documentation -- "Encapsulation"](https://fastify.dev/docs/latest/Guides/Encapsulation/)
- [Fastify Documentation -- "Logging"](https://fastify.dev/docs/latest/Reference/Logging/)
- [Fastify Documentation -- "Recommendations"](https://fastify.dev/docs/latest/Guides/Recommendations/)
