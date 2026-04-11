# Spring — Review Overlay

Load this overlay for the **security**, **architecture-design**, **performance**, and **api-design** specialists when `org.springframework` is detected in build dependencies.

---

## Dependency Injection

- [ ] Constructor injection is used for all mandatory dependencies — field injection (`@Autowired` on fields) is flagged because it obscures the dependency graph, prevents `final` fields, and makes unit testing without a container harder
- [ ] `@Autowired` is omitted on single-constructor classes (Spring injects automatically since 4.3) — redundant annotations are a style signal that the team may be cargo-culting older patterns
- [ ] Circular dependencies are resolved by redesigning the dependency graph rather than by adding `@Lazy` as a quick fix — `@Lazy` defers the error rather than eliminating the problematic coupling

## Bean Lifecycle and Scope

- [ ] Request- or session-scoped beans (`@Scope("request")`) injected into singleton beans use a scoped proxy (`proxyMode = ScopedProxyMode.TARGET_CLASS`) — without this, the singleton captures the instance from the first request
- [ ] `@PostConstruct` methods are free of blocking I/O that could delay application startup; heavy initialization is moved to `ApplicationReadyEvent` listeners or performed lazily
- [ ] Profile-specific beans (`@Profile("prod")`) have a corresponding default or test-profile bean so that context loading in tests does not fail with `NoSuchBeanDefinitionException`

## Transactions

- [ ] `@Transactional` is applied at the service layer, not the repository layer (repositories manage their own per-method transactions) and not directly on controllers
- [ ] Propagation level is deliberate: `REQUIRES_NEW` suspends the outer transaction and is appropriate for audit logging or outbox writes that must commit independently; using it unnecessarily causes excessive connection acquisition
- [ ] `@Transactional` methods are called from outside the bean (not self-invoked within the same class) — Spring AOP proxies do not intercept internal method calls, so `this.someTransactionalMethod()` bypasses the transaction boundary silently
- [ ] Read-only queries use `@Transactional(readOnly = true)` to allow the JPA provider to optimize flush mode and signal to the database that no writes are expected

## JPA and Database

- [ ] `@OneToMany` and `@ManyToMany` associations use `FetchType.LAZY` unless there is a documented and profiled justification for `EAGER` — EAGER fetching on collections is a leading cause of N+1 and Cartesian product bugs
- [ ] Repository queries that return collections of related entities use `JOIN FETCH` or `@EntityGraph` to batch-load associations, preventing N+1 select patterns
- [ ] Entity classes do not implement `Serializable` unless they are used with an HTTP session or a distributed cache that requires serialization — unnecessary serialization invites subtle bugs when entity graphs are large

## Spring Security

- [ ] The security filter chain (`SecurityFilterChain` bean) explicitly defines which paths are permitted without authentication (`permitAll()`) and requires authentication for all other paths — the default is not relied upon and `anyRequest().authenticated()` or equivalent is present
- [ ] CSRF protection is disabled only for stateless REST APIs that authenticate exclusively via tokens (Bearer/JWT); form-based or cookie-session-based flows must keep CSRF enabled
- [ ] CORS is configured via Spring Security's `.cors()` configuration or `CorsConfigurationSource` bean, not via `@CrossOrigin` scattered on individual controllers — centralized CORS config prevents inconsistent policies

## Configuration

- [ ] Secrets (database passwords, API keys) are not present in `application.properties` or `application.yml` committed to source control; they are sourced from environment variables, a secrets manager, or Spring Cloud Config with encryption
- [ ] Actuator endpoints are explicitly scoped: health and info are public; all other endpoints (`/actuator/env`, `/actuator/beans`, `/actuator/heapdump`) are either disabled or restricted to an internal management port with authentication
- [ ] `@Async` methods are backed by a configured `ThreadPoolTaskExecutor` bean with explicit `corePoolSize`, `maxPoolSize`, and `queueCapacity` — the default `SimpleAsyncTaskExecutor` creates an unbounded number of threads and should not be used in production

## Exception Handling

- [ ] A `@ControllerAdvice` class centralizes exception handling with `@ExceptionHandler` methods covering at minimum `MethodArgumentNotValidException` (validation errors), `EntityNotFoundException`, and a catch-all `Exception` handler
- [ ] Error responses conform to a consistent schema (e.g., RFC 9457 Problem Details or a custom envelope) — each exception handler does not invent its own response structure
- [ ] The global exception handler does not expose stack traces, internal class names, or database constraint names in responses when `spring.profiles.active` is `prod`
