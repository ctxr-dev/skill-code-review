# Express — Review Overlay

Load this overlay for the **security**, **api-design**, **observability**, and **performance** specialists when `express` is detected in project dependencies.

---

## Security

- [ ] `helmet()` is registered as the very first middleware so security headers are set on all responses, including error responses
- [ ] CORS configuration explicitly lists allowed origins rather than using `origin: '*'` in production; credentials mode and allowed methods/headers are tightly scoped
- [ ] `express.json()` and `express.urlencoded()` specify a `limit` (e.g., `'1mb'`) to prevent body-based DoS attacks
- [ ] Rate limiting (`express-rate-limit` or equivalent) is applied to authentication, password reset, and other sensitive endpoints before route handlers
- [ ] `app.set('trust proxy', ...)` is configured correctly — set to the number of trusted proxies (or their IP range) when behind a load balancer; never set to `true` unconditionally in production as it allows IP spoofing
- [ ] File upload endpoints validate MIME type and file size server-side (not relying on `Content-Type` header alone) and store uploads outside the web root
- [ ] Static file serving (`express.static`) does not expose `.env`, `node_modules`, or source files — the served directory is strictly scoped
- [ ] Template engines have auto-escaping enabled; user input is never passed to `res.render` as a template string itself (template injection)
- [ ] Session middleware (`express-session`) sets `httpOnly: true`, `secure: true` (in production), `sameSite: 'strict'`, and a strong `secret` sourced from environment variables, not hardcoded

## Middleware Ordering

- [ ] Error-handling middleware (four-argument signature: `(err, req, res, next)`) is registered last, after all routes and other middleware
- [ ] Authentication middleware runs before any route handlers that require authentication — it is not applied selectively in an ad-hoc manner inside handlers
- [ ] Compression middleware (`compression`) is placed after security headers but before route handlers

## Error Handling

- [ ] Async route handlers are wrapped with a try/catch or an async wrapper (e.g., `express-async-errors`, `asyncHandler`) to ensure unhandled promise rejections reach the error middleware rather than crashing the process
- [ ] The error-handling middleware does not leak stack traces, internal error messages, or file paths to clients in production (`NODE_ENV` check)
- [ ] All code paths in route handlers either call `next(err)` on failure or send a response — there are no paths that leave the request hanging

## API Design

- [ ] Route parameters (`:id`, `:slug`) are validated and sanitized before use in DB queries or file paths — no raw param passed to SQL or `fs` calls
- [ ] Response status codes are semantically correct: 400 for client errors, 401 for unauthenticated, 403 for unauthorized, 404 for not found, 500 for server errors
- [ ] Routes are organized into `express.Router()` instances grouped by resource; the main `app` file mounts routers rather than defining all routes inline

## Observability

- [ ] Request logging middleware (e.g., `morgan`) is in place and logs method, path, status, and response time; sensitive query params and auth headers are not logged
- [ ] Unhandled `process.on('uncaughtException')` and `process.on('unhandledRejection')` handlers log the error and perform a graceful shutdown rather than silently swallowing errors
