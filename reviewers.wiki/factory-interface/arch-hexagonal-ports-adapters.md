---
id: arch-hexagonal-ports-adapters
type: primary
depth_role: leaf
focus: Detect adapters containing business logic, ports not defined as interfaces, and direct infrastructure access bypassing ports
parents:
  - index.md
covers:
  - Adapter class containing business rules, domain validation, or workflow orchestration
  - Port defined as a concrete class instead of an interface or abstract type
  - Application core importing adapter or infrastructure modules directly
  - "Driving adapter (controller) calling driven adapter (repository) without going through the core"
  - Missing port -- infrastructure accessed directly from application service without abstraction
  - Adapter implementing multiple unrelated ports, violating interface segregation
  - Domain model importing from adapter or infrastructure packages
  - "Port interface leaking infrastructure types (SQL ResultSet, HTTP Request, framework DTO)"
  - Test that cannot substitute a fake adapter because the port is missing or concrete
  - Adapter performing data transformation that encodes business rules
  - "Adapters that leak the adaptee's interface instead of fully translating to the target"
  - Adapters containing business logic beyond pure interface translation
  - "Adapter chains (A adapts B adapts C) adding unnecessary indirection"
  - Missing adapters where client code conforms directly to a third-party interface
  - Two-way adapters that create tight bidirectional coupling
  - "Class adapters (via inheritance) that break encapsulation of the adaptee"
  - Adapters that catch and swallow exceptions from the adaptee instead of translating them
  - Adapters wrapping adaptees that already conform to the target interface
  - Adapters with state that diverges from the underlying adaptee
  - Over-applied adapter where a simple method call or lambda would suffice
tags:
  - hexagonal
  - ports-and-adapters
  - port
  - adapter
  - architecture
  - dependency-inversion
  - infrastructure
  - structural-pattern
  - design-patterns
  - wrapper
  - interface-translation
  - integration
aliases:
  - pattern-adapter
activation:
  file_globs:
    - "**/ports/**"
    - "**/adapters/**"
    - "**/adapter/**"
    - "**/driven/**"
    - "**/driving/**"
    - "**/infrastructure/**"
    - "**/infra/**"
    - "**/core/**"
    - "**/application/**"
    - "**/domain/**"
  keyword_matches:
    - port
    - adapter
    - driven
    - driving
    - hexagonal
    - infrastructure
    - gateway
    - repository
    - interface
    - abstract
  structural_signals:
    - port_interface_definition
    - adapter_implementation
    - dependency_injection
source:
  origin: file
  path: arch-hexagonal-ports-adapters.md
  hash: "sha256:f9d1d9b9061a1ebded24ed2adff79f5c8390272ff7ec34ea5d7cd9ce66c1b080"
---
# Hexagonal Architecture (Ports & Adapters)

## When This Activates

Activates on diffs touching port definitions, adapter implementations, application core services, or infrastructure integration code. Hexagonal architecture (Alistair Cockburn) organizes a system so the application core communicates with the outside world exclusively through **ports** (interfaces defined by the core) and **adapters** (implementations that translate between the core and external systems). The core must have zero knowledge of which adapters are connected. Violations occur when adapters contain business logic, ports are concrete rather than abstract, or the core reaches past ports to access infrastructure directly. This reviewer detects these boundary violations in diffs.

## Audit Surface

- [ ] Adapter class contains conditional business logic (if/else on domain rules)
- [ ] Port is a concrete class rather than an interface, trait, or abstract class
- [ ] Application service imports an infrastructure or adapter module directly
- [ ] Controller calls repository or external client without passing through application core
- [ ] Application service instantiates a concrete adapter instead of accepting an injected port
- [ ] Port interface method signature uses infrastructure-specific types
- [ ] Domain entity or value object imports from adapter or infrastructure namespace
- [ ] Single adapter class implements 3+ unrelated port interfaces
- [ ] Adapter performs validation or computation that belongs in the domain layer
- [ ] Test cannot swap adapter implementation because no port interface exists
- [ ] Driven port interface changes whenever the underlying infrastructure changes
- [ ] Application core has a compile-time dependency on a database driver or HTTP library

## Detailed Checks

### Port Definition Integrity
<!-- activation: keywords=["port", "interface", "abstract", "trait", "protocol", "contract", "boundary"] -->

- [ ] **Port not abstract**: flag port definitions that are concrete classes instead of interfaces, traits, abstract classes, or protocols -- without abstraction, adapters cannot be substituted
- [ ] **Infrastructure types in port signature**: flag port method signatures that use SQL ResultSet, HTTP Request/Response, framework-specific DTOs, or driver-specific types -- port signatures must use domain types only
- [ ] **Port changes with infrastructure**: flag port interface modifications that are driven by a change in the underlying infrastructure (new database column, API field rename) rather than by a domain requirement -- this indicates the port is leaking infrastructure concerns
- [ ] **Missing port**: flag application services that access infrastructure (database, HTTP, file system, message broker) without going through a defined port interface -- every external dependency needs a port

### Adapter Boundary Discipline
<!-- activation: keywords=["adapter", "controller", "repository", "gateway", "client", "handler", "driver", "connector", "impl"] -->

- [ ] **Business logic in adapter**: flag adapter classes that contain domain validation, business rule evaluation, pricing logic, or workflow orchestration -- adapters must only translate between port interface and external system protocol
- [ ] **Adapter-to-adapter call**: flag a driving adapter (controller) directly invoking a driven adapter (repository, HTTP client) without routing through the application core -- this bypasses all business rules
- [ ] **Fat adapter**: flag adapter classes exceeding trivial mapping that contain conditional branching on domain concepts -- if the adapter needs to understand domain rules, move the logic to the core
- [ ] **Adapter implementing too many ports**: flag a single adapter class implementing 3+ unrelated port interfaces -- each adapter should serve one external system concern

### Application Core Isolation
<!-- activation: keywords=["service", "application", "core", "domain", "usecase", "interactor", "import", "require", "from"] -->

- [ ] **Core imports infrastructure**: flag application service or domain model files importing database drivers, HTTP libraries, message broker clients, or file system APIs -- the core must depend only on ports and domain types
- [ ] **Core instantiates concrete adapter**: flag application services that use `new ConcreteRepository()` or equivalent instead of receiving the port through constructor injection -- this hard-couples the core to a specific adapter
- [ ] **Domain model depends on adapter**: flag domain entities or value objects that import from adapter or infrastructure namespaces -- domain models are the innermost layer and must be self-contained
- [ ] **Framework dependency in core**: flag the application core having a compile-time (build) dependency on a framework or infrastructure library -- core should compile without any adapter or driver on the classpath

### Driving vs Driven Adapter Clarity
<!-- activation: keywords=["driving", "driven", "inbound", "outbound", "primary", "secondary", "input", "output"] -->

- [ ] **Driving adapter with persistence**: flag controllers or API handlers that directly perform persistence operations -- driving adapters receive input and delegate to the core; persistence is a driven adapter concern
- [ ] **Driven adapter initiating workflow**: flag repository or client adapters that trigger application-level workflows or call other driven adapters -- driven adapters respond to the core, they do not orchestrate
- [ ] **Missing driving port**: flag application services that expose their methods without a defined driving (input) port interface -- driving ports define the application's API contract

### Testability Through Ports
<!-- activation: keywords=["test", "spec", "mock", "stub", "fake", "fixture", "inject"] -->

- [ ] **Untestable core**: flag application services that cannot be tested without real infrastructure because ports are missing or concrete -- the hexagonal architecture's primary benefit is test isolation through port substitution
- [ ] **Test mocking infrastructure directly**: flag tests that mock database drivers or HTTP libraries instead of substituting a fake adapter through a port -- mocking at the wrong level makes tests brittle
- [ ] **Integration test as unit test**: flag tests labeled as unit tests that require adapter infrastructure (database, network) to run -- unit tests should use in-memory port implementations

## Common False Positives

- **Composition root**: the module that wires ports to concrete adapters (main, DI container configuration) legitimately references both ports and adapters. This is not a violation.
- **Adapter-internal helpers**: utility classes private to an adapter module (SQL query builders, HTTP header mappers) may contain conditional logic that is infrastructure translation, not business logic.
- **Shared domain primitives in ports**: port signatures using shared value objects (Money, Email, UserId) from the domain layer is correct, not infrastructure leakage.
- **Framework-idiomatic patterns**: some frameworks (Spring, NestJS) use annotations on port implementations for DI wiring. The annotation on the adapter is acceptable; the annotation on the port interface or domain is not.

## Severity Guidance

| Finding | Severity |
|---|---|
| Application core importing infrastructure or adapter module | Critical |
| Domain entity depending on adapter or infrastructure namespace | Critical |
| Driving adapter calling driven adapter directly, bypassing core | Critical |
| Adapter containing business rules or domain validation | Important |
| Port defined as concrete class instead of interface | Important |
| Port signature using infrastructure-specific types | Important |
| Application service instantiating concrete adapter | Important |
| Missing port for an infrastructure dependency | Minor |
| Single adapter implementing 3+ unrelated ports | Minor |
| Test mocking infrastructure directly instead of using port substitution | Minor |

## See Also

- `arch-clean-architecture` -- clean architecture formalizes the ring structure; hexagonal architecture emphasizes symmetric port/adapter pairs
- `principle-solid` -- Dependency Inversion Principle (DIP) and Interface Segregation Principle (ISP) are the foundations of ports and adapters
- `principle-coupling-cohesion` -- ports decouple the core from infrastructure; adapters encapsulate external system coupling
- `principle-separation-of-concerns` -- ports define concern boundaries between application logic and infrastructure translation
- `antipattern-big-ball-of-mud` -- missing ports and leaky adapters collapse hexagonal structure into a ball of mud

## Authoritative References

- [Alistair Cockburn, "Hexagonal Architecture" (2005)](https://alistair.cockburn.us/hexagonal-architecture/)
- [Robert C. Martin, *Clean Architecture* (2017), Chapter 22: "The Clean Architecture" -- dependency rule as generalization of ports and adapters](https://www.oreilly.com/library/view/clean-architecture-a/9780134494272/)
- [Juan Manuel Garrido de Paz, "Hexagonal Architecture: The Complete Reference"](https://jmgarridopaz.github.io/content/hexagonalarchitecture.html)
- [Vaughn Vernon, *Implementing Domain-Driven Design* (2013), Chapter 4: Architecture -- Ports and Adapters with DDD](https://www.oreilly.com/library/view/implementing-domain-driven-design/9780133039900/)
- [Netflix, "Ready for changes with Hexagonal Architecture" (2020)](https://netflixtechblog.com/ready-for-changes-with-hexagonal-architecture-b315ec967749)
