---
id: arch-clean-architecture
type: primary
depth_role: leaf
focus: Detect dependency rule violations where inner rings import outer rings, use cases contain framework code, or entities depend on infrastructure
parents:
  - index.md
covers:
  - Entity or domain model importing infrastructure, framework, or persistence modules
  - Use case or interactor importing HTTP, UI, or delivery-mechanism code
  - "Framework annotations (ORM, HTTP, serialization) on entity or value object classes"
  - "Use case returning a framework-specific type (HTTP response, DTO with serialization annotations)"
  - Interface adapter layer containing business logic instead of pure mapping
  - Missing use case boundary -- controller calling repository directly
  - Concrete infrastructure dependency in use case constructor without interface
  - Entity depending on a third-party library that is not a pure language extension
  - "Circular dependency between rings (e.g., entity importing from interface adapters)"
  - Test for a use case that requires spinning up a framework or database
tags:
  - clean-architecture
  - dependency-rule
  - use-case
  - entity
  - ports
  - rings
  - architecture
activation:
  file_globs:
    - "**/domain/**"
    - "**/entities/**"
    - "**/usecases/**"
    - "**/use_cases/**"
    - "**/interactors/**"
    - "**/adapters/**"
    - "**/infrastructure/**"
    - "**/ports/**"
    - "**/core/**"
    - "**/application/**"
  keyword_matches:
    - usecase
    - use_case
    - interactor
    - entity
    - domain
    - port
    - adapter
    - gateway
    - presenter
    - repository
    - infrastructure
  structural_signals:
    - ring_dependency_direction
    - framework_annotation_on_entity
    - use_case_boundary
source:
  origin: file
  path: arch-clean-architecture.md
  hash: "sha256:b3d6eb20db02adb533bb4f240230fc8aa4e4156d1e592a220e669d588f13c0ed"
---
# Clean Architecture

## When This Activates

Activates on diffs touching domain entities, use cases, adapters, or infrastructure layers in projects organized along Clean Architecture rings. Clean Architecture (Robert C. Martin) mandates a strict **dependency rule**: source code dependencies must point inward -- outer rings (frameworks, drivers, UI) depend on inner rings (entities, use cases), never the reverse. Violations collapse the architecture's core benefit: the ability to change frameworks, databases, and delivery mechanisms without touching business rules. This reviewer detects diff-visible signals that the dependency rule is broken or that ring responsibilities are misplaced.

## Audit Surface

- [ ] Entity or value object imports an ORM, HTTP, or framework module
- [ ] Use case or interactor imports a controller, presenter, or view class
- [ ] Framework annotation (@Entity, @Table, @JsonProperty, @Controller) on a domain entity
- [ ] Use case method signature returns or accepts a framework-specific type
- [ ] Controller or gateway contains conditional business logic (if/else on domain rules)
- [ ] Use case constructor takes a concrete class instead of an interface/port
- [ ] Entity class references a repository, service client, or file-system API
- [ ] Interface adapter performs domain validation or business computation
- [ ] Circular import path between inner ring module and outer ring module
- [ ] Use case test requires a running database, HTTP server, or message broker
- [ ] Domain layer depends on a third-party library that imposes infrastructure constraints
- [ ] Missing output port -- use case calls infrastructure directly instead of through an interface

## Detailed Checks

### Dependency Rule -- Inward Only
<!-- activation: keywords=["import", "require", "from", "use", "using", "include", "entity", "domain", "usecase", "interactor"] -->

- [ ] **Entity imports outer ring**: flag entity or value object files that import from adapters, infrastructure, frameworks, or UI layers -- entities are the innermost ring and must have zero outward dependencies
- [ ] **Use case imports delivery mechanism**: flag use case or interactor files that import controllers, presenters, views, or HTTP-specific modules -- use cases define input/output ports, they do not know the delivery mechanism
- [ ] **Dependency direction reversal**: flag any import path where an inner-ring module depends on an outer-ring module -- even transitive violations (entity -> shared lib -> infrastructure) break the rule
- [ ] **Circular ring dependency**: flag circular imports between rings (e.g., use case imports adapter, adapter imports use case) -- this destroys the unidirectional dependency graph

### Framework Leakage into Domain
<!-- activation: keywords=["@Entity", "@Table", "@Column", "@JsonProperty", "@Serializable", "ORM", "Hibernate", "TypeORM", "Sequelize", "ActiveRecord", "Django", "annotation"] -->

- [ ] **ORM annotations on entities**: flag domain entity classes decorated with ORM annotations (@Entity, @Table, @Column, ActiveRecord inheritance) -- the entity must be persistence-ignorant; map in the adapter layer
- [ ] **Serialization annotations on entities**: flag @JsonProperty, @Serializable, or similar on domain classes -- serialization format is an outer-ring concern
- [ ] **Framework base class**: flag domain entities extending a framework base class (Django Model, ActiveRecord::Base, TypeORM BaseEntity) -- inheritance from a framework locks the entity to that framework
- [ ] **Framework types in use case signatures**: flag use case methods that accept or return HttpRequest, HttpResponse, DataFrame, or other framework types -- use plain data structures or domain-defined DTOs

### Use Case Boundary Integrity
<!-- activation: keywords=["usecase", "use_case", "interactor", "execute", "handle", "command", "query", "input", "output", "port", "boundary"] -->

- [ ] **Missing input/output ports**: flag use cases that accept raw HTTP request objects or return framework response objects instead of defining their own input/output data structures
- [ ] **Use case calling infrastructure directly**: flag use cases that instantiate concrete repository, HTTP client, or message broker classes instead of depending on an interface (output port)
- [ ] **Controller bypassing use case**: flag controllers that call repositories or infrastructure directly, skipping the use case layer entirely -- every business operation should flow through a use case
- [ ] **Use case orchestrating UI concerns**: flag use cases that format responses for display, paginate results, or set HTTP status codes -- these are adapter responsibilities

### Interface Adapter Misuse
<!-- activation: keywords=["adapter", "controller", "presenter", "gateway", "mapper", "converter", "translator"] -->

- [ ] **Business logic in adapter**: flag controllers, presenters, or gateways that contain domain validation, business rules, or calculations -- adapters should only translate between formats
- [ ] **Adapter bypassing use case**: flag adapters that call other adapters or infrastructure directly without going through a use case -- this short-circuits the architecture
- [ ] **Fat adapter**: flag adapter classes with more than trivial mapping logic -- if an adapter needs conditional branching on domain concepts, the logic belongs in the use case

### Testability Violations
<!-- activation: keywords=["test", "spec", "mock", "stub", "fake", "fixture", "setup", "before"] -->

- [ ] **Use case test needs infrastructure**: flag use case tests that require a database connection, HTTP server, or external service -- use case tests should run with in-memory fakes injected through ports
- [ ] **Entity test needs framework**: flag entity unit tests that import framework test utilities (Django TestCase, Spring Boot test context) -- entity tests should be plain unit tests
- [ ] **Unmockable dependency**: flag use cases that depend on concrete classes instead of interfaces, making it impossible to substitute test doubles

## Common False Positives

- **Composition root / main module**: the outermost wiring module (main, app, bootstrap) legitimately imports from all rings to assemble the dependency graph. This is not a violation -- it is the only place where concrete implementations are resolved.
- **Shared kernel or domain primitives**: a small shared library of domain primitives (Money, Email, DateRange) used across bounded contexts is acceptable if it contains no infrastructure dependencies.
- **Framework-generated code**: scaffolded or generated code (protobuf stubs, GraphQL type definitions) may mix concerns. Review the source definitions, not the generated output.
- **Micro-framework CRUD**: in trivially small applications with no business logic, enforcing full ring separation adds ceremony without benefit. Flag only when business rules exist but are misplaced.

## Severity Guidance

| Finding | Severity |
|---|---|
| Entity importing infrastructure or framework module | Critical |
| Use case importing controller, presenter, or UI module | Critical |
| Circular dependency between architectural rings | Critical |
| ORM annotations (@Entity, @Table) directly on domain entity class | Important |
| Use case depending on concrete infrastructure class without interface | Important |
| Controller containing business logic (domain validation, calculations) | Important |
| Use case returning a framework-specific type (HttpResponse) | Important |
| Use case test requiring database or running framework context | Minor |
| Adapter with slightly more than trivial mapping logic | Minor |

## See Also

- `principle-solid` -- the Dependency Inversion Principle (DIP) is the foundation of the dependency rule; clean architecture is DIP applied at the architectural level
- `principle-separation-of-concerns` -- each ring has a distinct concern: entities own business rules, use cases orchestrate application flow, adapters translate
- `arch-hexagonal-ports-adapters` -- hexagonal architecture shares the ports-and-adapters concept; clean architecture adds explicit ring layering
- `antipattern-big-ball-of-mud` -- violating the dependency rule systematically collapses clean architecture into a big ball of mud
- `principle-coupling-cohesion` -- the dependency rule minimizes coupling between rings while maximizing cohesion within each ring

## Authoritative References

- [Robert C. Martin, *Clean Architecture* (2017), Chapters 20-22: The Dependency Rule, Clean Architecture, Presenters and Humble Objects](https://www.oreilly.com/library/view/clean-architecture-a/9780134494272/)
- [Robert C. Martin, "The Clean Architecture" (2012)](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Alistair Cockburn, "Hexagonal Architecture" (2005)](https://alistair.cockburn.us/hexagonal-architecture/) -- the precursor that inspired Clean Architecture's ports concept
- [Jeffrey Palermo, "The Onion Architecture" (2008)](https://jeffreypalermo.com/2008/07/the-onion-architecture-part-1/) -- a closely related layered approach with similar dependency direction
- [Martin Fowler, "Inversion of Control Containers and the Dependency Injection Pattern" (2004)](https://martinfowler.com/articles/injection.html)
