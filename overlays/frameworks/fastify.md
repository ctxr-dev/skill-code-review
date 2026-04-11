# Fastify — Review Overlay

Load this overlay for the **security**, **api-design**, **performance**, and **architecture-design** specialists when `fastify` is detected in project dependencies.

---

## Security

- [ ] Every route defines a `schema` with both `body` and `querystring` (or `params`) schemas — Fastify silently passes unvalidated fields when no schema is present, so omission is a security gap, not just a quality gap
- [ ] `setErrorHandler` is registered as a centralized error handler and does not forward raw `error.message` or stack traces to clients in production; sensitive internals are masked before the response is sent
- [ ] Rate limiting (`@fastify/rate-limit`) is applied to authentication, registration, and password-reset routes; limits are per-IP by default and not easily bypassed by spoofed headers unless `trustProxy` is intentionally enabled
- [ ] CORS (`@fastify/cors`) specifies an explicit `origin` allowlist in production — `origin: true` or `origin: '*'` is flagged unless the service is a fully public API with no cookies or credentials
- [ ] `Content-Type` parsing is restricted to the MIME types each route actually accepts; custom `contentTypeParser` registrations validate and size-limit their input before parsing
- [ ] Static file serving (`@fastify/static`) is scoped to an explicit `root` directory and `prefix`; directory traversal protection (`dotfiles: 'deny'`) is enabled

## Schema Validation

- [ ] JSON Schema definitions are centralized (e.g., `$ref` to a shared schema store registered via `fastify.addSchema`) rather than duplicated inline across routes
- [ ] TypeBox or `@sinclair/typebox` schemas use `Type.Strict(...)` where appropriate so that additional properties are rejected rather than silently stripped
- [ ] Route response schemas are defined for all success status codes (200, 201, etc.) — missing response schemas disable `fast-json-stringify` serialization, causing performance regression and potential data leakage through accidental field inclusion
- [ ] Enum and `const` constraints in schemas are used for fixed-value fields (e.g., `status`, `role`) rather than relying on application-layer checks alone

## Plugin Encapsulation

- [ ] Plugins that register routes, decorators, or hooks intended to be globally visible are wrapped with `fastify-plugin` (`fp(...)`) — plugins without `fp` create an encapsulated scope and their decorators are invisible to sibling plugins
- [ ] Plugins that should remain encapsulated (auth context, tenant scoping) deliberately omit `fastify-plugin` to enforce scope boundaries
- [ ] Plugin registration order is reviewed: plugins that others depend on (e.g., database connector, auth plugin) are registered before the plugins that consume them; `await fastify.register(...)` is used when inter-plugin ordering matters
- [ ] Custom decorators added via `fastify.decorate`, `fastify.decorateRequest`, or `fastify.decorateReply` do not mutate the prototype of a shared object — initial values for reference types are provided via a factory function, not a shared object literal

## Lifecycle Hooks

- [ ] `onRequest` hooks handle auth and early rejection; `preHandler` hooks handle authorization and business-level validation — the distinction is not blurred (e.g., DB calls do not appear in `onRequest`)
- [ ] `onSend` hooks that modify the payload handle both object and string payloads — Fastify may pass the serialized string to `onSend` depending on whether a response schema is set
- [ ] `onError` hooks are used for side-effects (logging, metrics) only and do not attempt to send a second response after the error handler has already replied

## Performance

- [ ] `fast-json-stringify` is leveraged by ensuring all routes with JSON responses have a response schema; routes that intentionally return dynamic shapes document this trade-off
- [ ] Async route handlers do not mix `reply.send()` with a returned value — only one mechanism is used per handler to avoid double-send warnings and unpredictable behavior
- [ ] `fastify.listen` is called with `{ host: '0.0.0.0' }` (not `'localhost'`) in containerized deployments so the server binds to all interfaces, not just loopback
