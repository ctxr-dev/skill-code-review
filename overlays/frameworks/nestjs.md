# NestJS — Review Overlay

Load this overlay for the **architecture-design**, **security**, **api-design**, and **testing** specialists when `@nestjs/core` is detected in project dependencies.

---

## Module Boundaries

- [ ] Each feature module explicitly declares what it `exports` — providers that are only used internally are not exported, keeping the module's public API intentional and minimal
- [ ] Cross-module dependencies flow through the module system (`imports`/`exports`) rather than direct class instantiation or `require()`; direct instantiation bypasses DI and breaks testability
- [ ] Circular module dependencies are resolved with `forwardRef(() => ModuleClass)` on both sides and are documented with a comment explaining why the cycle exists — unresolved circular deps cause silent `undefined` injection at runtime
- [ ] `GlobalModule` (`@Global()`) is used sparingly and only for truly cross-cutting concerns (config, logging, database connection); business feature modules are never marked global

## Guards, Pipes, and Interceptors

- [ ] The ordering of guards, interceptors, and pipes at the controller and handler level is intentional and reviewed: guards run first (auth/authz), then interceptors (logging, transform), then pipes (validation/coercion)
- [ ] `AuthGuard` or custom guards are applied at the controller level as the default; individual handlers that bypass auth are explicitly annotated with a `@Public()` decorator (or equivalent) and the reason is documented
- [ ] Pipes performing DTO validation use `class-validator` decorators in combination with `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` — missing `whitelist: true` allows unvalidated extra properties to pass through
- [ ] `ValidationPipe` is registered globally (via `app.useGlobalPipes`) or at the controller level consistently — ad-hoc pipe registration at individual handler level that leaves other handlers unvalidated is flagged
- [ ] Interceptors that measure timing or add response metadata do not swallow exceptions — they must re-throw or delegate to the exception filter chain

## Provider Scope

- [ ] Providers that hold request-specific state (e.g., tenant ID, authenticated user) use `scope: Scope.REQUEST` — `DEFAULT` (singleton) scope for stateful request context causes data leakage between concurrent requests
- [ ] `Scope.TRANSIENT` is used deliberately and its performance implications (a new instance per injection) are understood; it is not used as a default when `DEFAULT` would suffice
- [ ] Scoped providers (REQUEST or TRANSIENT) are not injected into singleton providers without understanding that the singleton provider will capture the scope of the first instantiation — this is a common source of subtle bugs

## DTOs and Validation

- [ ] DTO classes use `class-validator` decorators for all fields, including nested objects decorated with `@ValidateNested()` and `@Type(() => NestedDto)` from `class-transformer` — without `@Type`, nested objects are not transformed and validation fails silently
- [ ] DTOs do not expose internal database entity fields (auto-incremented IDs, `createdAt`, `updatedAt`, `deletedAt`) in request bodies — these are set server-side only
- [ ] Response DTOs or serialization interceptors (`ClassSerializerInterceptor`) are used to strip sensitive fields (passwords, tokens, internal flags) from outbound responses

## Configuration

- [ ] `ConfigService` from `@nestjs/config` is used for all environment variable access — direct `process.env.*` references outside of the config setup are flagged as they bypass validation and defaults
- [ ] `ConfigModule` is configured with a validation schema (e.g., `validationSchema` via Joi or `validate` function) so that missing required environment variables cause a startup failure with a clear error rather than a runtime `undefined` value later

## Exception Handling

- [ ] Exception filters are registered at the appropriate scope (global, controller, or handler) and handle both NestJS `HttpException` subtypes and unexpected errors — unrecognized error types should not result in a generic 500 with no logging
- [ ] Business logic throws typed `HttpException` subclasses (`NotFoundException`, `ForbiddenException`, etc.) rather than raw `Error` objects, so exception filters and logging have consistent structure to work with

## Testing

- [ ] Unit tests for services and guards use `TestingModule` with mock providers rather than importing real modules — importing full modules in unit tests couples the test to the entire dependency tree
- [ ] E2E tests that test HTTP behavior use `supertest` against a fully bootstrapped `INestApplication` and cover at least one happy path and one auth-rejection path per controller

## Microservices

- [ ] Microservice message patterns (`@MessagePattern`, `@EventPattern`) validate their incoming payload with a pipe — messages arriving via a broker have no HTTP middleware layer and are often less scrutinized
- [ ] Transport-layer errors (broker disconnect, serialization failure) are handled at the client call site with a timeout strategy; fire-and-forget events do not silently fail in ways that cause data inconsistency
