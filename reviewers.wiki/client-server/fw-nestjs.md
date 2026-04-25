---
id: fw-nestjs
type: primary
depth_role: leaf
focus: Detect NestJS-specific pitfalls in dependency injection, validation pipes, guards, interceptors, module architecture, and decorator usage that cause security gaps, circular dependencies, or architectural violations.
parents:
  - index.md
covers:
  - Circular dependency injection between providers or modules
  - Missing ValidationPipe globally or per-route allowing unvalidated input
  - Guards not applied to all routes or missing on specific endpoints
  - Interceptors with side effects registered in wrong order
  - Missing exception filters allowing unhandled errors to leak internals
  - "Providers registered at wrong scope (DEFAULT vs REQUEST vs TRANSIENT)"
  - Module imports creating tight coupling between feature modules
  - Missing DTO validation with class-validator decorators
  - Controller containing business logic that should delegate to a service
  - Missing health check module for production readiness
  - GraphQL resolver without auth guard allowing unauthenticated access
  - "Missing Swagger/OpenAPI decorators reducing API discoverability"
tags:
  - nestjs
  - dependency-injection
  - validation
  - guards
  - interceptors
  - modules
  - decorators
  - typescript
  - backend
  - enterprise
activation:
  file_globs:
    - "**/*.controller.ts"
    - "**/*.service.ts"
    - "**/*.module.ts"
    - "**/*.guard.ts"
    - "**/*.pipe.ts"
    - "**/nest-cli.json"
  keyword_matches:
    - "@Controller"
    - "@Injectable"
    - "@Module"
    - "@Guard"
    - "@Pipe"
    - "@Interceptor"
    - "@Get"
    - "@Post"
    - NestJS
    - NestFactory
  structural_signals:
    - Circular dependency between providers
    - Missing global validation pipe
    - Controller with business logic
source:
  origin: file
  path: fw-nestjs.md
  hash: "sha256:b535ab01f0fece1e574083d0f07124411054410221f027543bd709e1e53740e8"
---
# NestJS Dependency Injection, Validation, and Architecture Pitfalls

## When This Activates

Activates when diffs touch NestJS controllers, services, modules, guards, pipes, interceptors, or the NestFactory bootstrap. NestJS layers an opinionated architecture (modules, providers, decorators) on top of Express or Fastify. Its DI container, guard/interceptor pipeline, and module system introduce a class of bugs where missing decorators silently skip validation, circular dependencies crash at startup, providers hold stale state across requests, and controllers absorb business logic that belongs in services. This reviewer targets patterns specific to the NestJS architectural model that general TypeScript reviewers miss.

## Audit Surface

- [ ] Two or more providers injecting each other directly (circular dependency without forwardRef)
- [ ] NestFactory.create() without app.useGlobalPipes(new ValidationPipe()) and no per-route UsePipes
- [ ] Controller method with no @UseGuards() and no global guard registered via APP_GUARD
- [ ] Multiple @UseInterceptors() on the same route where execution order affects correctness
- [ ] Application with no global exception filter and no per-controller exception filter
- [ ] Provider with Scope.DEFAULT that holds per-request state (mutable instance fields set during requests)
- [ ] Module importing another feature module directly instead of a shared module
- [ ] DTO class with no class-validator decorators
- [ ] Controller method exceeding 15 lines of business logic not delegated to an injected service
- [ ] Production application with no health check endpoint
- [ ] GraphQL resolver without auth guard
- [ ] Controller methods missing Swagger/OpenAPI decorators
- [ ] Dynamic module forRoot/forAsync without proper provider exports
- [ ] Entity class used directly as API response type instead of a response DTO
- [ ] Service swallowing exceptions without logging or re-throwing as HttpException

## Detailed Checks

### Dependency Injection and Scoping
<!-- activation: keywords=["@Injectable", "@Inject", "forwardRef", "Scope", "DEFAULT", "REQUEST", "TRANSIENT", "ModuleRef", "LazyModuleLoader", "circular", "provider"] -->

- [ ] **Circular dependency**: flag two or more providers where A injects B and B injects A (or longer cycles) without `forwardRef(() => ...)` -- NestJS throws a runtime error at bootstrap; use forwardRef as a temporary fix but refactor to eliminate the cycle by extracting shared logic into a third provider
- [ ] **Wrong provider scope**: flag providers decorated with `@Injectable()` (default singleton scope) that store per-request state in instance properties (e.g., `this.currentUser = ...` set during a request) -- singleton providers are shared across all requests; use `Scope.REQUEST` or pass request context explicitly
- [ ] **REQUEST-scoped provider overuse**: flag providers using `Scope.REQUEST` without necessity -- request-scoped providers create a new instance per request and force all dependents into request scope, causing significant performance overhead; use only when truly per-request state is required
- [ ] **Missing provider export**: flag modules that register providers used by other modules but do not include them in `exports` -- importing the module gives access only to exported providers; non-exported providers cause a missing dependency error in the consuming module

### Validation and Input Safety
<!-- activation: keywords=["ValidationPipe", "UsePipes", "class-validator", "IsString", "IsEmail", "IsNotEmpty", "IsNumber", "ValidateNested", "Transform", "DTO", "plainToInstance", "whitelist", "forbidNonWhitelisted"] -->

- [ ] **Missing global ValidationPipe**: flag NestFactory bootstrap code that does not call `app.useGlobalPipes(new ValidationPipe())` or register ValidationPipe via `APP_PIPE` -- without it, class-validator decorators on DTOs are ignored and all input passes through unvalidated; see `sec-owasp-a03-injection`
- [ ] **ValidationPipe without whitelist**: flag `new ValidationPipe()` without `{ whitelist: true }` -- without whitelisting, extra properties not defined in the DTO pass through to the handler, enabling mass-assignment attacks
- [ ] **DTO without decorators**: flag DTO classes (used in `@Body()`, `@Query()`, `@Param()`) that have properties without class-validator decorators -- the ValidationPipe only validates decorated properties; undecorated properties are accepted without validation
- [ ] **Entity as API response**: flag controller methods returning entity/model classes directly instead of mapping to response DTOs -- entities may contain password hashes, internal IDs, or soft-delete flags not intended for API consumers; see `sec-owasp-a01-broken-access-control`

### Guards, Interceptors, and Filters
<!-- activation: keywords=["@UseGuards", "CanActivate", "APP_GUARD", "@UseInterceptors", "NestInterceptor", "@UseFilters", "ExceptionFilter", "HttpException", "RpcException", "WsException", "AuthGuard", "RolesGuard", "JwtAuthGuard"] -->

- [ ] **Unguarded endpoints**: flag controller methods on routes that handle sensitive data or mutations with no `@UseGuards()` decorator and no global guard registered via `APP_GUARD` -- unauthenticated or unauthorized access to these endpoints is a broken access control vulnerability; see `sec-owasp-a01-broken-access-control`
- [ ] **Guard on controller but not on specific methods**: flag controllers with `@UseGuards(AuthGuard)` at the class level but individual methods decorated with `@Public()` or `@SkipAuth()` without clear justification -- ensure public endpoints are intentional, not accidental
- [ ] **Missing exception filter**: flag applications with no global exception filter and controllers with no `@UseFilters()` -- the default NestJS exception filter returns `{ statusCode, message, error }` which may leak internal error messages in production
- [ ] **Interceptor order dependency**: flag routes with multiple `@UseInterceptors()` where the interceptors depend on execution order (e.g., logging interceptor should wrap caching interceptor) -- NestJS executes interceptors in registration order; document and test the intended order

### Module Architecture
<!-- activation: keywords=["@Module", "imports", "exports", "providers", "controllers", "forRoot", "forRootAsync", "forFeature", "DynamicModule", "Global", "SharedModule"] -->

- [ ] **Direct feature module import**: flag modules that import other feature modules directly to access a single provider instead of using a shared module -- this creates tight coupling between feature boundaries; extract the shared provider into a SharedModule or use a dedicated module; see `principle-separation-of-concerns`
- [ ] **@Global() module overuse**: flag more than one or two modules decorated with `@Global()` -- global modules make all their providers available everywhere, bypassing the module boundary system and making dependency tracking impossible
- [ ] **Dynamic module without forRootAsync**: flag dynamic modules (database, config, third-party) registered with `forRoot({ ... })` using hardcoded values instead of `forRootAsync({ useFactory })` with injected ConfigService -- hardcoded values prevent environment-specific configuration and make testing difficult
- [ ] **Monolithic AppModule**: flag an AppModule that directly registers many providers and controllers instead of delegating to feature modules -- this defeats NestJS's modular architecture; each bounded context should be a separate module

### Controller Discipline and API Documentation
<!-- activation: keywords=["@Controller", "@Get", "@Post", "@Put", "@Delete", "@Patch", "@Body", "@Param", "@Query", "@ApiOperation", "@ApiResponse", "@ApiTags", "Swagger", "OpenAPI"] -->

- [ ] **Business logic in controller**: flag controller methods exceeding 15 lines of non-delegation code (logic beyond parameter extraction, service call, and response mapping) -- controllers should be thin; delegate business rules, data access, and orchestration to injected services; see `principle-separation-of-concerns`
- [ ] **Missing Swagger decorators**: flag controller methods without `@ApiOperation()`, `@ApiResponse()`, or `@ApiTags()` decorators when the project has `@nestjs/swagger` installed -- undocumented endpoints reduce API discoverability and prevent accurate client generation
- [ ] **Missing health check**: flag production NestJS applications (detected via Dockerfile, kubernetes manifests, or deploy configs) with no `@nestjs/terminus` HealthModule or custom `/health` endpoint -- orchestrators need a health probe to manage container lifecycle
- [ ] **Service swallowing exceptions**: flag service methods with try/catch blocks that catch errors, log them (or do nothing), and return a default value without re-throwing as an appropriate HttpException -- this hides failures from the controller and returns misleading success responses

## Common False Positives

- **Intentionally public endpoints**: login, registration, health check, and webhook endpoints legitimately skip auth guards; verify they are decorated with `@Public()` or equivalent.
- **Scope.REQUEST for multi-tenant services**: services that must resolve the current tenant per-request legitimately use request scope.
- **forwardRef for bidirectional relationships**: some module architectures legitimately require forwardRef; flag only when the circular dependency can be eliminated by restructuring.
- **Entity returned in internal/admin APIs**: internal tools or admin panels may return full entities if the API is access-controlled and not public-facing.
- **Missing Swagger on non-REST controllers**: WebSocket gateways, microservice controllers, and GraphQL resolvers use different documentation approaches.

## Severity Guidance

| Finding | Severity |
|---|---|
| Missing global ValidationPipe (all input unvalidated) | Critical |
| Unguarded endpoint exposing sensitive data or mutations | Critical |
| Entity with password/secret fields returned as API response | Critical |
| DTO without class-validator decorators (validation bypass) | Critical |
| Circular dependency without forwardRef (startup crash) | Important |
| Singleton provider storing per-request state (race condition) | Important |
| ValidationPipe without whitelist (mass-assignment risk) | Important |
| Missing exception filter leaking internal errors | Important |
| Controller with 15+ lines of business logic | Important |
| Direct feature module import creating tight coupling | Minor |
| Missing Swagger/OpenAPI decorators | Minor |
| Missing health check endpoint | Minor |
| @Global() module overuse | Minor |
| Dynamic module with hardcoded forRoot values | Minor |

## See Also

- `sec-owasp-a03-injection` -- unvalidated DTO input is an injection vector
- `sec-owasp-a01-broken-access-control` -- missing guards and exposed entity fields
- `sec-owasp-a05-misconfiguration` -- default exception filter, missing ValidationPipe
- `principle-separation-of-concerns` -- controller/service boundary and module architecture
- `principle-fail-fast` -- ValidationPipe with whitelist rejects bad input at the boundary

## Authoritative References

- [NestJS Documentation -- "Validation"](https://docs.nestjs.com/techniques/validation)
- [NestJS Documentation -- "Guards"](https://docs.nestjs.com/guards)
- [NestJS Documentation -- "Interceptors"](https://docs.nestjs.com/interceptors)
- [NestJS Documentation -- "Modules"](https://docs.nestjs.com/modules)
- [NestJS Documentation -- "Injection Scopes"](https://docs.nestjs.com/fundamentals/injection-scopes)
- [NestJS Documentation -- "Circular Dependency"](https://docs.nestjs.com/fundamentals/circular-dependency)
- [NestJS Documentation -- "Exception Filters"](https://docs.nestjs.com/exception-filters)
- [NestJS Documentation -- "OpenAPI (Swagger)"](https://docs.nestjs.com/openapi/introduction)
