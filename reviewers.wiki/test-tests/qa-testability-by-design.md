---
id: qa-testability-by-design
type: primary
depth_role: leaf
focus: Detect static method calls preventing mocking, hidden dependencies via service locator or global state, non-deterministic behavior, tightly coupled components, missing dependency injection, and side effects in constructors
parents:
  - index.md
covers:
  - Static method calls to external services preventing test substitution
  - Hidden dependencies resolved via service locator or global registry
  - Non-deterministic behavior from time, random, file system, or network in logic
  - Tightly coupled components that cannot be tested in isolation
  - Missing dependency injection — dependencies created internally
  - "Side effects in constructors or initializers (I/O, network, state mutation)"
  - Sealed or final classes preventing test doubles in languages that need subclassing
  - Global mutable state shared across tests causing order-dependent failures
  - Deep inheritance hierarchies requiring complex setup to test leaf classes
tags:
  - testability
  - dependency-injection
  - static-methods
  - service-locator
  - non-determinism
  - coupling
  - side-effects
  - mocking
  - test-doubles
activation:
  file_globs:
    - "**/*"
  keyword_matches:
    - static
    - "new "
    - getInstance
    - resolve
    - container
    - locator
    - global
    - singleton
    - DateTime.now
    - Date.now
    - time.time
    - Random
    - Math.random
    - System.getenv
    - os.environ
    - process.env
  structural_signals:
    - Static method call to external dependency
    - "Constructor with I/O or network calls"
    - Global state access in business logic
source:
  origin: file
  path: qa-testability-by-design.md
  hash: "sha256:6ae69894f10a5c6fa0a32f6d1f403b2b5837eb5adc3cecdd94c49e883882066b"
---
# Testability by Design

## When This Activates

Activates on diffs that add or modify business logic, service classes, or component wiring. Testability is not an afterthought -- it is a design property. Code that is hard to test is usually hard to test because it violates dependency inversion, hides its collaborators, or depends on non-deterministic external state. These same properties also make the code hard to understand, modify, and reuse. This reviewer detects structural patterns that prevent or hinder unit testing, driving toward designs where every component can be tested in isolation with deterministic inputs and outputs.

## Audit Surface

- [ ] Static method call to external service (database, HTTP, file system) in business logic
- [ ] Service locator or container.resolve() call inside business logic method
- [ ] Direct call to DateTime.now(), Date.now(), System.currentTimeMillis() in logic
- [ ] Random number generation without injectable seed or source
- [ ] File system read/write inside business logic without abstraction
- [ ] Constructor performing HTTP call, database query, or file I/O
- [ ] Class creating its own dependencies internally (new dependency inside method)
- [ ] Global variable or singleton mutated during business logic execution
- [ ] Final/sealed class used as dependency preventing test double creation
- [ ] Method with 4+ collaborators making isolated testing require extensive mocking
- [ ] Environment variable read deep inside business logic instead of injected config
- [ ] Thread.sleep or delay call inside business logic (non-deterministic timing)

## Detailed Checks

### Hidden Dependencies
<!-- activation: keywords=["static", "getInstance", "resolve", "container", "locator", "registry", "lookup", "ServiceProvider", "getBean", "inject"] -->

- [ ] **Service locator in business logic**: flag calls to `container.resolve()`, `ServiceProvider.get()`, `getBean()`, or global registry lookups inside business methods -- the method's dependencies are invisible to callers and tests; accept dependencies via constructor parameters instead
- [ ] **Static calls to external services**: flag static method calls that reach databases, HTTP endpoints, file systems, or message queues from within business logic -- static calls cannot be substituted in tests; wrap behind an injectable interface
- [ ] **Global state as implicit dependency**: flag business logic reading or mutating global variables, module-level state, or singletons without those being declared as constructor dependencies -- global state makes tests order-dependent and prevents parallel execution

### Constructor and Initialization Side Effects
<!-- activation: keywords=["constructor", "init", "__init__", "new", "create", "build", "setup", "configure", "connect"] -->

- [ ] **I/O in constructor**: flag constructors that perform HTTP calls, database queries, file reads, or send messages -- constructors should only assign dependencies; defer I/O to explicit method calls so tests can instantiate objects without triggering side effects
- [ ] **Dependency creation in constructor**: flag constructors that create their own dependencies (`this.repo = new DatabaseRepository()`) instead of accepting them as parameters -- internal creation prevents substitution with test doubles
- [ ] **Complex logic in constructor**: flag constructors with conditional logic, loops, or exception handling beyond simple assignment -- move logic to factory methods or initialization methods that can be tested and overridden independently

### Non-Deterministic Behavior
<!-- activation: keywords=["now", "time", "Date", "DateTime", "clock", "random", "Random", "uuid", "UUID", "sleep", "delay", "Thread.sleep"] -->

- [ ] **Direct time access**: flag direct calls to `DateTime.now()`, `Date.now()`, `time.time()`, `System.currentTimeMillis()`, or `Instant.now()` in business logic -- inject a clock abstraction (`Clock`, `TimeProvider`) so tests can control time
- [ ] **Uninjectable randomness**: flag use of `Math.random()`, `Random()`, or language random APIs without injectable seed or source -- inject a random source so tests produce deterministic results
- [ ] **Thread.sleep in logic**: flag `Thread.sleep()`, `time.sleep()`, `delay()`, or `setTimeout` in business logic -- sleep makes tests slow and non-deterministic; inject a scheduler abstraction or use a virtual clock

### Tight Coupling Preventing Isolation
<!-- activation: keywords=["new ", "import", "require", "extends", "implements", "final", "sealed", "private", "internal"] -->

- [ ] **Concrete dependency creation**: flag methods that instantiate collaborators with `new` inside their body rather than receiving them -- each `new` in a method is a hardcoded decision that cannot be overridden in tests
- [ ] **Sealed/final dependency class**: flag dependencies declared as final or sealed that prevent test-double creation in languages requiring subclassing for mocks -- use interfaces or open the class to test doubles
- [ ] **Deep inheritance for testing**: flag test setups that require instantiating a deep inheritance chain to test a leaf class -- prefer composition over inheritance; extract the behavior under test into a separate, independently testable component
- [ ] **Excessive collaborators**: flag methods that interact with 4+ collaborator objects -- each collaborator is a mock in tests; excessive mocking signals the method is doing too much; split responsibilities

### Environment and Configuration Coupling
<!-- activation: keywords=["env", "environ", "process.env", "System.getenv", "os.environ", "config", "settings", "properties"] -->

- [ ] **Environment variable deep in logic**: flag business logic that reads environment variables directly (`process.env.X`, `os.environ["X"]`, `System.getenv("X")`) -- inject configuration as typed parameters or config objects; deep env reads make tests depend on environment setup
- [ ] **File path hardcoding**: flag business logic with hardcoded file paths for configuration, data, or templates -- inject paths or use resource abstractions so tests can provide test-specific data

## Common False Positives

- **Composition roots**: DI container configuration, main() functions, and application bootstrap code legitimately resolve and wire dependencies -- this is the one place service locator patterns are appropriate.
- **Static pure functions**: static methods that are pure functions (no I/O, no state mutation, deterministic) are perfectly testable without mocking and should not be flagged.
- **Framework-managed injection**: frameworks like Spring, Guice, and NestJS manage dependency injection at the framework level -- constructors may appear to create dependencies but are actually framework-injected.
- **Value objects and DTOs**: instantiating simple value objects or data transfer objects with `new` inside methods is fine -- these are not external dependencies.

## Severity Guidance

| Finding | Severity |
|---|---|
| Constructor performing HTTP call or database query | Critical |
| Service locator used in business logic, hiding dependencies | Important |
| Static call to database or external service in business logic | Important |
| Direct DateTime.now() in business logic affecting behavior | Important |
| Global mutable state accessed from business logic | Important |
| Class creating its own heavy dependencies internally | Minor |
| Environment variable read deep in business logic | Minor |
| Final/sealed dependency class preventing test doubles | Minor |

## See Also

- `principle-solid` -- Dependency Inversion Principle is the foundation of testable design
- `principle-encapsulation` -- encapsulation of dependencies behind interfaces enables test substitution
- `test-unit-discipline` -- testability enables the discipline; discipline validates the testability
- `principle-separation-of-concerns` -- separating I/O from logic is the primary testability enabler

## Authoritative References

- [Michael Feathers, *Working Effectively with Legacy Code* (2004) -- seams, dependency breaking techniques](https://www.oreilly.com/library/view/working-effectively-with/0131177052/)
- [Mark Seemann, *Dependency Injection: Principles, Practices, and Patterns* (2019)](https://www.manning.com/books/dependency-injection-principles-practices-patterns)
- [Gerard Meszaros, *xUnit Test Patterns* (2007) -- test doubles and testability patterns](http://xunitpatterns.com/)
- [Miško Hevery, "Guide: Writing Testable Code" (Google)](http://misko.hevery.com/code-reviewers-guide/)
