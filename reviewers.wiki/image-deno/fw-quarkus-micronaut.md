---
id: fw-quarkus-micronaut
type: primary
depth_role: leaf
focus: Detect Quarkus and Micronaut pitfalls including GraalVM native-image reflection breakage, CDI scope misuse, event-loop blocking, missing health checks, and serialization failures that cause build-time or runtime errors invisible during JVM development.
parents:
  - index.md
covers:
  - Reflection use that breaks GraalVM native image compilation
  - "Missing @RegisterForReflection on classes accessed reflectively"
  - CDI scope misuse -- ApplicationScoped bean holding request state
  - Missing health and readiness check endpoints for Kubernetes
  - "Blocking I/O on Vert.x event loop thread in Quarkus reactive routes"
  - Missing input validation on JAX-RS or Micronaut endpoints
  - Missing security annotations on endpoints
  - "Micronaut missing @Introspected for bean serialization"
  - Configuration not externalized for different environments
  - Missing dev services cleanup in test containers
  - Test containers not configured for native image tests
  - "CDI @Inject on private fields without accessor"
tags:
  - quarkus
  - micronaut
  - graalvm
  - native-image
  - cdi
  - jakarta-ee
  - reactive
  - vert-x
  - kubernetes
  - java
  - kotlin
activation:
  file_globs:
    - "**/*.java"
    - "**/*.kt"
    - "**/pom.xml"
    - "**/build.gradle*"
  keyword_matches:
    - "@QuarkusMain"
    - "@ApplicationScoped"
    - "@RequestScoped"
    - "@Inject"
    - "@Path"
    - "@GET"
    - "@POST"
    - Micronaut
    - "@Controller"
    - "@Singleton"
    - MicronautApplication
    - quarkus
    - micronaut
  structural_signals:
    - Quarkus application with CDI annotations
    - "Micronaut application with @Controller endpoints"
    - GraalVM native image build configuration
source:
  origin: file
  path: fw-quarkus-micronaut.md
  hash: "sha256:cc6d58cf14a958bd1be0d95c61d1df75da6259d869eb437b9c58df03869cdc9d"
---
# Quarkus and Micronaut Framework Pitfalls

## When This Activates

Activates when diffs touch Quarkus or Micronaut application code, CDI/bean definitions, JAX-RS or Micronaut controller endpoints, configuration files, or native image build configuration. Both frameworks optimize for fast startup and low memory via build-time processing and ahead-of-time compilation, but this creates a unique class of bugs: code that works perfectly on the JVM fails silently or crashes in native images because reflection, dynamic proxies, or classpath scanning are unavailable. CDI scoping errors where `@ApplicationScoped` beans hold request state cause race conditions that only surface under concurrent load. Vert.x-based reactive routes block the event loop with JDBC or file I/O. This reviewer detects framework-specific patterns that general Java/Kotlin reviewers miss.

## Audit Surface

- [ ] Class accessed via reflection without @RegisterForReflection or reflect-config.json
- [ ] @ApplicationScoped bean with mutable instance fields storing per-request state
- [ ] @RequestScoped bean injected into @ApplicationScoped bean
- [ ] Missing health/readiness endpoint dependency for Kubernetes deployment
- [ ] Thread.sleep(), java.io.File, or JDBC calls inside a reactive handler
- [ ] JAX-RS endpoint without @Valid on request body DTO
- [ ] Micronaut @Controller endpoint without @Valid on @Body parameter
- [ ] Endpoint handling sensitive data without security annotations
- [ ] Micronaut DTO missing @Introspected annotation
- [ ] Hardcoded configuration instead of @ConfigProperty or @Value
- [ ] Secrets in application.properties without profile overrides or vault
- [ ] Dev Services started but not cleaned up in integration tests
- [ ] Native image test missing from test suite
- [ ] @Inject on private field in Quarkus CDI
- [ ] Missing @Produces/@Consumes on JAX-RS endpoints
- [ ] Entity serialization with circular references without DTO mapping

## Detailed Checks

### GraalVM Native Image Compatibility
<!-- activation: keywords=["native", "GraalVM", "reflect", "Class.forName", "getDeclaredMethod", "getDeclaredField", "newInstance", "@RegisterForReflection", "reflect-config", "proxy-config", "resource-config", "@Introspected", "native-image"] -->

- [ ] **Unregistered reflection**: flag `Class.forName()`, `getDeclaredMethod()`, `getDeclaredField()`, or `getConstructor().newInstance()` on classes not annotated with `@RegisterForReflection` (Quarkus) or `@Introspected`/`@ReflectiveAccess` (Micronaut) and not listed in `reflect-config.json` -- native image compilation strips unreachable code; reflective access to unregistered classes throws `ClassNotFoundException` or `NoSuchMethodException` at runtime
- [ ] **Dynamic proxy without registration**: flag `java.lang.reflect.Proxy.newProxyInstance()` or third-party libraries that create dynamic proxies without corresponding `proxy-config.json` entries -- dynamic proxies require explicit registration for native images
- [ ] **Resource loading without registration**: flag `getResourceAsStream()` or `ClassLoader.getResource()` for files not listed in `resource-config.json` or `quarkus.native.resources.includes` -- resources not registered at build time are absent from the native binary
- [ ] **Missing @Introspected in Micronaut**: flag Micronaut DTO, entity, or configuration classes used in serialization (Jackson), HTTP parameter binding, or bean validation that lack `@Introspected` -- Micronaut uses compile-time introspection instead of reflection; without this annotation, serialization fails in native images and sometimes silently falls back to slower reflection on JVM

### CDI Scope and Bean Lifecycle
<!-- activation: keywords=["@ApplicationScoped", "@RequestScoped", "@SessionScoped", "@Dependent", "@Singleton", "@Inject", "Instance<", "Provider<", "CreationalContext", "scope", "proxy"] -->

- [ ] **ApplicationScoped with request state**: flag `@ApplicationScoped` beans with non-final mutable instance fields that store per-request data (user ID, request context, temporary computation results) -- a single instance is shared across all requests; concurrent modifications cause race conditions; use `@RequestScoped` or pass state via method parameters; see `conc-race-conditions-data-races`
- [ ] **RequestScoped in ApplicationScoped**: flag `@RequestScoped` beans injected directly (not via `Instance<T>` or `Provider<T>`) into `@ApplicationScoped` beans -- the injected proxy resolves the request scope at call time, which works in Quarkus but is a common source of confusion; verify the access pattern is intentional and not storing the reference in a field
- [ ] **@Inject on private fields (Quarkus)**: flag `@Inject` on `private` fields in Quarkus -- Quarkus uses build-time bytecode generation and requires injected fields to be at least package-private; private injection works only via reflection, which breaks native images
- [ ] **Singleton vs ApplicationScoped confusion**: flag `@Singleton` used where `@ApplicationScoped` is intended -- `@Singleton` beans are not proxied (no lazy initialization, no interception); `@ApplicationScoped` is proxied and supports `@Transactional`, `@CacheResult`, and other interceptors

### Reactive and Event-Loop Safety
<!-- activation: keywords=["@Route", "reactive", "Uni", "Multi", "Vert.x", "Mutiny", "event loop", "blocking", "Thread.sleep", "java.io", "JDBC", "@Blocking", "@NonBlocking", "SmallRye", "io.smallrye"] -->

- [ ] **Blocking on event loop**: flag `Thread.sleep()`, `java.io.File` operations, JDBC calls, or synchronous HTTP client calls inside Quarkus reactive routes (`@Route`), Mutiny `Uni`/`Multi` pipelines, or any handler running on the Vert.x event loop -- blocking the event loop freezes all other requests on that thread; use `@Blocking` annotation or offload to a worker pool via `Uni.emitOn(Infrastructure.getDefaultWorkerPool())`
- [ ] **Missing @Blocking annotation**: flag RESTEasy Reactive endpoints that perform JDBC or file I/O without `@Blocking` -- RESTEasy Reactive runs on the event loop by default; without `@Blocking`, the handler blocks the I/O thread
- [ ] **Uni not returned**: flag handlers that create a `Uni` or `Multi` but call `.subscribe()` or `.await().indefinitely()` instead of returning it -- the framework cannot manage backpressure or cancellation; errors may be swallowed
- [ ] **Missing timeout on Uni chain**: flag `Uni` chains making external calls without `.ifNoItem().after(Duration.of(...)).fail()` -- without a timeout, a stalled downstream service blocks the chain indefinitely; see `reliability-timeout-deadline-propagation`

### Security and Input Validation
<!-- activation: keywords=["@RolesAllowed", "@Secured", "@PermitAll", "@DenyAll", "@Authenticated", "SecurityIdentity", "@Valid", "@BeanParam", "@FormParam", "@QueryParam", "@PathParam", "@Body", "quarkus.http.auth", "micronaut.security"] -->

- [ ] **Missing security annotations**: flag endpoints handling sensitive data (user profiles, payments, admin operations) without `@RolesAllowed`, `@Secured`, `@Authenticated`, or `@PermitAll` -- without security annotations, the default behavior depends on configuration and may allow unauthenticated access; see `sec-owasp-a01-broken-access-control`
- [ ] **Missing input validation**: flag JAX-RS endpoints with `@BeanParam` or request body DTOs without `@Valid`, and Micronaut endpoints with `@Body` parameters without `@Valid` -- unvalidated input reaches business logic and may cause injection or data corruption; see `principle-fail-fast`
- [ ] **Missing @Produces/@Consumes**: flag JAX-RS endpoints without `@Produces(MediaType.APPLICATION_JSON)` or `@Consumes` annotations -- without these, the framework negotiates content types ambiguously; endpoints may accept XML (enabling XXE) or produce unexpected formats
- [ ] **Quarkus CORS not configured**: flag Quarkus API applications without `quarkus.http.cors=true` and `quarkus.http.cors.origins` in configuration -- the default blocks all cross-origin requests; see `sec-owasp-a05-misconfiguration`

### Configuration and Observability
<!-- activation: keywords=["application.properties", "application.yml", "@ConfigProperty", "@Value", "MicroProfile Config", "health", "readiness", "liveness", "SmallRyeHealth", "management", "micrometer", "metrics"] -->

- [ ] **Hardcoded configuration**: flag database URLs, API endpoints, credentials, or feature flags hardcoded in Java/Kotlin source instead of using `@ConfigProperty` (Quarkus), `@Value` (Micronaut), or MicroProfile Config -- hardcoded values cannot be overridden per environment; secrets are exposed in source control
- [ ] **Missing health endpoints**: flag Kubernetes-deployed applications without `quarkus-smallrye-health` or `micronaut-management` dependencies -- Kubernetes liveness and readiness probes fail without health endpoints, causing unnecessary pod restarts or traffic routing to unready instances; see `reliability-health-checks`
- [ ] **Secrets in plain config**: flag `application.properties` or `application.yml` containing passwords, tokens, or connection strings without `${VAULT_*}`, environment variable references, or profile-specific overrides -- committed secrets are exposed in version control
- [ ] **Missing native image test**: flag projects with GraalVM native profile configured but no `@QuarkusIntegrationTest` or `@MicronautTest(nativeImage = true)` -- code that works on JVM may fail in native image; test the native binary in CI

## Common False Positives

- **Reflection in JVM-only code paths**: libraries or code explicitly guarded by `ImageInfo.inImageCode()` checks can use reflection safely in JVM mode without native image registration.
- **@Singleton in Micronaut**: Micronaut's `@Singleton` is the standard scope (equivalent to Spring's default); unlike Quarkus CDI, it does not lack proxy features relevant to interception.
- **Dev Services in dev/test profiles**: Quarkus Dev Services (testcontainers) are designed for development and testing; they auto-start and auto-stop. Only flag cleanup issues in CI or production profiles.
- **@RequestScoped in @ApplicationScoped via proxy**: In Quarkus, injecting a `@RequestScoped` bean into `@ApplicationScoped` works correctly via the CDI proxy -- the proxy resolves the correct request-scoped instance per call. This is intentional and not a bug.
- **Blocking in @Blocking-annotated endpoints**: endpoints annotated with `@Blocking` are explicitly moved off the event loop; JDBC and file I/O calls are correct.
- **@Introspected not needed for Jackson on JVM**: Micronaut Jackson serialization works without `@Introspected` on JVM via reflection, but fails in native image.

## Severity Guidance

| Finding | Severity |
|---|---|
| Unregistered reflection breaking native image at runtime | Critical |
| Blocking I/O on Vert.x event loop thread | Critical |
| ApplicationScoped bean storing mutable per-request state (race) | Critical |
| Secrets hardcoded in committed configuration files | Critical |
| Missing security annotations on sensitive endpoints | Important |
| Missing @Valid on request body DTOs | Important |
| Missing @Introspected in Micronaut (native image failure) | Important |
| @Inject on private field in Quarkus (native image failure) | Important |
| Missing health/readiness endpoints for Kubernetes | Important |
| Missing @Blocking on RESTEasy Reactive JDBC handler | Important |
| Missing @Produces/@Consumes on JAX-RS endpoints | Minor |
| Missing native image integration test | Minor |
| Missing timeout on Uni chain | Minor |
| Singleton vs ApplicationScoped confusion | Minor |
| Dev Services cleanup in CI | Minor |

## See Also

- `sec-owasp-a01-broken-access-control` -- missing security annotations on endpoints
- `sec-owasp-a05-misconfiguration` -- missing CORS, missing health endpoints, secrets in config
- `conc-race-conditions-data-races` -- ApplicationScoped beans with mutable state
- `reliability-timeout-deadline-propagation` -- Uni timeouts and external call deadlines
- `reliability-health-checks` -- Kubernetes liveness and readiness probes
- `principle-fail-fast` -- input validation at endpoint boundaries

## Authoritative References

- [Quarkus -- Tips for Writing Native Applications](https://quarkus.io/guides/writing-native-applications-tips)
- [Quarkus -- CDI Reference](https://quarkus.io/guides/cdi-reference)
- [Quarkus -- Security Overview](https://quarkus.io/guides/security-overview)
- [Quarkus -- Reactive Routes](https://quarkus.io/guides/reactive-routes)
- [Micronaut -- GraalVM Native Image](https://docs.micronaut.io/latest/guide/#graal)
- [Micronaut -- Bean Introspection](https://docs.micronaut.io/latest/guide/#introspection)
- [Micronaut -- Security](https://micronaut-projects.github.io/micronaut-security/latest/guide/)
- [GraalVM -- Native Image Compatibility](https://www.graalvm.org/latest/reference-manual/native-image/metadata/)
