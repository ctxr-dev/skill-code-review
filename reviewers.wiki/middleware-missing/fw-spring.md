---
id: fw-spring
type: primary
depth_role: leaf
focus: Detect Spring Boot and Spring Framework pitfalls including dependency injection anti-patterns, security misconfigurations, WebFlux blocking violations, transaction proxy failures, and actuator exposure that cause vulnerabilities or silent misbehavior.
parents:
  - index.md
covers:
  - "Field injection via @Autowired instead of constructor injection"
  - "Missing @Valid or @Validated on @RequestBody parameters"
  - "Spring Security permitAll() too broad or missing CSRF for non-API endpoints"
  - "Blocking calls inside WebFlux reactive chain (Mono/Flux)"
  - "@Transactional on private methods silently not proxied"
  - Circular bean dependencies causing startup failure or hidden coupling
  - Actuator endpoints exposed without authentication
  - "Missing @ControllerAdvice for global error handling"
  - Property placeholders with empty default values
  - Missing profile-specific configuration for secrets
  - "Open Session in View (OSIV) enabled by default causing lazy loading outside transactions"
  - "@Async method called from same class bypassing proxy"
  - "Missing @ResponseStatus or explicit status on error responses"
tags:
  - spring
  - spring-boot
  - java
  - kotlin
  - dependency-injection
  - security
  - webflux
  - reactive
  - transactions
  - actuator
activation:
  file_globs:
    - "**/*.java"
    - "**/*.kt"
    - "**/pom.xml"
    - "**/build.gradle*"
    - "**/application.yml"
    - "**/application.properties"
  keyword_matches:
    - "@SpringBootApplication"
    - "@RestController"
    - "@Service"
    - "@Repository"
    - "@Autowired"
    - "@Bean"
    - "@Configuration"
    - WebFlux
    - Mono
    - Flux
    - "@GetMapping"
    - "@PostMapping"
    - "@RequestBody"
  structural_signals:
    - Spring Boot application main class
    - Spring Security configuration class
    - Spring MVC controller with mapping annotations
source:
  origin: file
  path: fw-spring.md
  hash: "sha256:1c44e5a17f10e27119ec9ebb18e9dd9715b151f7e61f6e40c570039766364e54"
---
# Spring Boot / Spring Framework Pitfalls

## When This Activates

Activates when diffs touch Spring Boot application setup, Spring MVC/WebFlux controllers, Spring Security configuration, bean definitions, transaction management, or application properties. Spring's convention-over-configuration approach means many defaults are silently active: OSIV keeps Hibernate sessions open through the view layer, actuator endpoints are exposed on the management port, and CSRF protection is enabled but frequently disabled wholesale. The proxy-based AOP model creates a particularly insidious class of bugs where `@Transactional` and `@Async` annotations are silently ignored when called from within the same class. This reviewer detects Spring-specific patterns that general Java/Kotlin reviewers miss.

## Audit Surface

- [ ] @Autowired annotation on a field rather than a constructor parameter
- [ ] @RequestBody parameter without @Valid or @Validated annotation
- [ ] HttpSecurity configuration with .permitAll() on broad URL patterns
- [ ] Spring Security .csrf().disable() on a web application serving browser clients
- [ ] Mono.block(), Flux.blockFirst(), or Thread.sleep() inside a WebFlux handler
- [ ] @Transactional annotation on a private method or called from within the same class
- [ ] Circular @Autowired or @Inject dependencies between beans
- [ ] Actuator endpoints exposed without security or exposure restrictions
- [ ] No @ControllerAdvice or @ExceptionHandler beans in the application
- [ ] ${property:} placeholder with empty default value in application.yml/properties
- [ ] Secrets (passwords, API keys) in application.yml without profile separation or vault reference
- [ ] spring.jpa.open-in-view=true (default) or not explicitly disabled
- [ ] @Async method invoked from within the same bean class
- [ ] Missing @ResponseStatus on custom exception classes
- [ ] @Component or @Service with mutable instance fields shared across requests
- [ ] Missing spring-boot-starter-validation dependency with @Valid annotations
- [ ] RestTemplate or WebClient without connection/read timeout configuration

## Detailed Checks

### Dependency Injection Anti-patterns
<!-- activation: keywords=["@Autowired", "@Inject", "@Component", "@Service", "@Repository", "@Bean", "@Configuration", "constructor", "RequiredArgsConstructor", "circular"] -->

- [ ] **Field injection**: flag `@Autowired` on instance fields -- field injection hides dependencies, prevents immutability, makes testing harder (requires reflection or Spring context), and allows the object to exist in a partially initialized state; use constructor injection (or Lombok `@RequiredArgsConstructor`); see `principle-solid`
- [ ] **Circular dependencies**: flag constructor injection cycles (Spring will throw `BeanCurrentlyInCreationException`) and `@Lazy`-annotated parameters used to break cycles -- `@Lazy` masks a design problem; refactor to break the cycle via an event, a mediator bean, or by merging the beans; see `principle-coupling-cohesion`
- [ ] **Mutable singleton state**: flag `@Component` or `@Service` beans (default singleton scope) with mutable instance fields (non-final, no synchronization) -- concurrent requests share the same instance; mutable fields cause race conditions; see `conc-race-conditions-data-races`
- [ ] **@Bean method not static in @Configuration**: flag `@Bean` methods in `@Configuration(proxyBeanMethods = false)` lite mode that depend on other beans via method calls -- without proxy, the method is invoked directly instead of returning the singleton

### Request Validation and Error Handling
<!-- activation: keywords=["@Valid", "@Validated", "@RequestBody", "@RequestParam", "@PathVariable", "BindingResult", "MethodArgumentNotValidException", "@ControllerAdvice", "@ExceptionHandler", "@ResponseStatus", "ResponseEntity"] -->

- [ ] **Missing @Valid on @RequestBody**: flag controller methods with `@RequestBody` parameters that lack `@Valid` or `@Validated` -- without these, JSR-380 bean validation constraints (`@NotNull`, `@Size`, `@Email`) on the DTO are never checked; malformed input reaches business logic; see `principle-fail-fast`
- [ ] **Missing validation dependency**: flag projects using `@Valid` annotations without `spring-boot-starter-validation` in pom.xml or build.gradle -- validation is silently skipped when the dependency is absent
- [ ] **No global error handler**: flag applications without a `@ControllerAdvice` class handling `MethodArgumentNotValidException`, `ConstraintViolationException`, and generic `Exception` -- without this, Spring returns default whitelabel error pages or framework-generated JSON that leaks stack traces
- [ ] **Missing @ResponseStatus**: flag custom exception classes thrown from controllers without `@ResponseStatus` and not handled by any `@ExceptionHandler` -- Spring defaults to 500 Internal Server Error for all unhandled exceptions

### Spring Security Configuration
<!-- activation: keywords=["HttpSecurity", "WebSecurityConfigurerAdapter", "SecurityFilterChain", "permitAll", "csrf", "cors", "authorizeRequests", "authorizeHttpRequests", "oauth2", "formLogin", "httpBasic", "sessionManagement"] -->

- [ ] **Overly broad permitAll()**: flag `.requestMatchers("/**").permitAll()` or `.anyRequest().permitAll()` -- this disables authentication for the entire application; use allowlists for public paths and require authentication by default; see `sec-owasp-a01-broken-access-control`
- [ ] **CSRF disabled for browser app**: flag `.csrf().disable()` or `.csrf(csrf -> csrf.disable())` on applications that serve HTML forms or use cookie-based sessions -- CSRF protection is needed for browser clients; only disable for stateless APIs using token-based auth (JWT, API keys); see `sec-csrf`
- [ ] **Missing CORS configuration**: flag REST APIs without `.cors()` configuration in HttpSecurity or a `CorsConfigurationSource` bean -- the default blocks all cross-origin requests; see `sec-owasp-a05-misconfiguration`
- [ ] **Actuator without auth**: flag applications with `spring-boot-starter-actuator` where `management.endpoints.web.exposure.include` is set to `*` or includes `env`, `configprops`, `heapdump` without security restrictions -- these endpoints expose secrets, heap dumps, and environment variables

### WebFlux Reactive Pitfalls
<!-- activation: keywords=["Mono", "Flux", "WebFlux", "reactive", "block()", "blockFirst()", "blockLast()", "subscribe()", "Schedulers", "publishOn", "subscribeOn", "flatMap", "map", "doOnNext"] -->

- [ ] **Blocking in reactive chain**: flag `Mono.block()`, `Flux.blockFirst()`, `Flux.blockLast()`, `Thread.sleep()`, `java.io.File` operations, or JDBC calls inside a WebFlux handler or reactive pipeline -- blocking calls on the Netty event loop thread starve all other requests; wrap in `Mono.fromCallable(...).subscribeOn(Schedulers.boundedElastic())`
- [ ] **Subscribe instead of return**: flag handlers that call `.subscribe()` on a Mono/Flux and return void instead of returning the Mono/Flux -- the response completes before the reactive chain finishes; backpressure is lost; errors are swallowed
- [ ] **Mixing MVC and WebFlux**: flag projects with both `spring-boot-starter-web` and `spring-boot-starter-webflux` dependencies -- Spring Boot defaults to MVC when both are present; WebFlux annotations may silently not activate
- [ ] **Missing error handling in chain**: flag reactive chains without `.onErrorResume()`, `.onErrorReturn()`, or `.doOnError()` -- unhandled errors in Mono/Flux propagate as 500s without logging

### Transaction and Proxy Pitfalls
<!-- activation: keywords=["@Transactional", "@Async", "TransactionTemplate", "propagation", "isolation", "rollbackFor", "proxy", "self-invocation", "REQUIRES_NEW"] -->

- [ ] **@Transactional on private method**: flag `@Transactional` on `private` methods -- Spring's proxy-based AOP cannot intercept private methods; the annotation is silently ignored and no transaction is created
- [ ] **Self-invocation bypassing proxy**: flag methods within a `@Service` or `@Component` that call another `@Transactional` or `@Async` method on `this` -- self-invocation bypasses the Spring proxy; the annotation has no effect; inject the bean into itself or use `TransactionTemplate`/`AsyncTaskExecutor`
- [ ] **Missing rollbackFor**: flag `@Transactional` without `rollbackFor` when the method throws checked exceptions -- by default, Spring only rolls back on unchecked exceptions; checked exceptions commit the transaction, potentially persisting partial state
- [ ] **OSIV enabled**: flag applications that do not explicitly set `spring.jpa.open-in-view=false` -- OSIV is enabled by default and keeps the Hibernate session open through the view layer, causing lazy-loading queries outside the service transaction, N+1 queries in serialization, and connection pool exhaustion

### Configuration and Externalization
<!-- activation: keywords=["application.yml", "application.properties", "spring.profiles", "@Value", "${", "Environment", "ConfigurationProperties", "secret", "password", "key", "token", "actuator", "management.endpoints"] -->

- [ ] **Secrets in config files**: flag passwords, API keys, tokens, or connection strings hardcoded in `application.yml` or `application.properties` without `${VAULT_*}`, `${SM_*}`, or environment variable references -- secrets in committed config files are exposed in version control; use Spring Cloud Vault, AWS Secrets Manager, or environment variables; see `sec-secrets-management-and-rotation`
- [ ] **Empty default placeholders**: flag `${property:}` (colon with empty default) in configuration -- this silently resolves to an empty string instead of failing fast; use `${property}` (no default) to fail on missing config
- [ ] **Missing profile-specific config**: flag a single `application.yml` with no `application-{profile}.yml` variants and no `spring.profiles.active` usage -- all environments (dev, staging, prod) share the same config including database URLs and secrets
- [ ] **RestTemplate/WebClient without timeouts**: flag `RestTemplate` or `WebClient` beans without `setConnectTimeout()` and `setReadTimeout()` -- the default has no timeout; slow downstream services hold threads indefinitely; see `reliability-timeout-deadline-propagation`

## Common False Positives

- **Field injection in test classes**: `@Autowired` on fields in `@SpringBootTest` or `@WebMvcTest` test classes is acceptable since tests are not production singletons.
- **CSRF disabled on pure REST APIs**: APIs authenticated solely via JWT, API keys, or OAuth2 tokens (no cookies) correctly disable CSRF.
- **OSIV in monoliths with tight controller-service coupling**: OSIV may be intentionally enabled in traditional MVC monoliths where lazy loading in the view is the designed pattern. Flag but note context.
- **@Transactional on interface methods**: Spring can proxy interfaces correctly; `@Transactional` on interface default methods works with JDK dynamic proxies.
- **Blocking calls in @Scheduled methods**: Scheduled tasks do not run on the reactive event loop; blocking I/O is acceptable.
- **Actuator behind management port**: if `management.server.port` is set to a different port and that port is not exposed externally, actuator endpoints may be safe without auth.

## Severity Guidance

| Finding | Severity |
|---|---|
| Secrets hardcoded in committed application.yml/properties | Critical |
| Actuator env/configprops/heapdump exposed without auth | Critical |
| Spring Security permitAll() on all requests | Critical |
| Missing @Valid on @RequestBody with user-facing input | Important |
| CSRF disabled on browser-facing application | Important |
| Blocking call in WebFlux reactive chain | Important |
| @Transactional on private method or self-invocation | Important |
| Field injection instead of constructor injection | Important |
| Missing @ControllerAdvice global error handler | Important |
| OSIV enabled by default without explicit configuration | Important |
| RestTemplate/WebClient without timeout configuration | Important |
| Circular bean dependencies masked by @Lazy | Minor |
| Empty default in property placeholder | Minor |
| Missing profile-specific configuration | Minor |
| Missing @ResponseStatus on exception classes | Minor |

## See Also

- `sec-owasp-a01-broken-access-control` -- Spring Security permitAll and missing auth
- `sec-owasp-a05-misconfiguration` -- actuator exposure, CSRF misconfiguration, missing CORS
- `sec-owasp-a03-injection` -- unvalidated @RequestBody reaching queries
- `conc-race-conditions-data-races` -- mutable singleton state in Spring beans
- `reliability-timeout-deadline-propagation` -- RestTemplate/WebClient timeouts and OSIV connection holding
- `principle-fail-fast` -- @Valid on request boundaries, fail on missing config
- `principle-solid` -- constructor injection and single-responsibility beans

## Authoritative References

- [Spring Boot Reference -- Production-ready Features (Actuator)](https://docs.spring.io/spring-boot/reference/actuator/)
- [Spring Security Reference -- Servlet Security](https://docs.spring.io/spring-security/reference/servlet/index.html)
- [Spring Framework -- Transaction Management](https://docs.spring.io/spring-framework/reference/data-access/transaction.html)
- [Spring WebFlux Reference](https://docs.spring.io/spring-framework/reference/web/webflux.html)
- [Spring Boot -- OSIV Warning](https://docs.spring.io/spring-boot/reference/data/sql.html#data.sql.jpa.open-entity-manager-in-view)
- [Baeldung -- Spring @Transactional Pitfalls](https://www.baeldung.com/spring-transactional-pitfalls)
- [OWASP -- Spring Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Spring_Security_Cheat_Sheet.html)
