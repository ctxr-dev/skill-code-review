---
id: ddd-tactical-application-services
type: primary
depth_role: leaf
focus: Detect application services containing domain logic, application services directly accessing infrastructure, and application services performing orchestration that belongs in domain services.
parents:
  - index.md
  - "../domain-aggregate/index.md"
covers:
  - Application service containing business rules, calculations, or domain decisions
  - "Application service directly calling infrastructure (database, HTTP, file system) without going through ports"
  - Application service orchestrating domain logic that should be a domain service
  - Application service with complex conditional branching on domain state
  - Application service that is an anemic pass-through with no coordination value
  - Application service bypassing the domain model to work directly with persistence
  - Application service mixing transaction management with domain logic
  - Application service with domain vocabulary in its implementation instead of delegating to domain objects
  - "Entity or model classes containing only getters/setters with no business methods"
  - Service classes that extract multiple fields from a domain object to make decisions
  - Domain objects passed through layers without ever being asked to perform behavior
  - Validation logic living in a separate validator service instead of on the entity itself
  - "State transitions managed externally (service sets status) instead of internally (entity.approve())"
  - DTOs used deep inside domain logic rather than at architectural boundaries
  - Business rules scattered across multiple service classes instead of cohesive on the entity
  - Domain objects with public setters that allow invariant-violating state changes
  - "Manager or service classes named after the entity they manipulate (OrderManager for Order)"
  - Identical conditional logic repeated across services because the entity does not encapsulate it
  - "Enums checked externally with if/switch instead of polymorphic behavior on the domain object"
  - Multiple service codebases with ORM models or migrations for the same tables
  - Direct SQL queries against tables owned by another service
  - Database triggers coupling writes from one service to reads by another
  - Shared stored procedures called by multiple services
  - Migration files in one service affecting tables another service depends on
  - Connection strings to the same database in multiple service configs
  - Services joining across tables they do not own
  - Foreign keys referencing tables owned by a different service
  - Shared database views spanning tables from different service domains
  - Multiple services reading from or writing to the same cache key namespace
  - Multiple services sharing the same database or schema with no ownership boundary
  - Synchronous HTTP or gRPC call chains 3+ services deep for a single user request
  - Services that must be deployed in lockstep due to shared schema migrations or config
  - Shared libraries containing business logic rather than pure utilities
  - Service A cannot function when service B is down -- no resilience, fallback, or degradation
  - Distributed transactions spanning services without saga or outbox pattern
  - Services communicating through a shared filesystem, shared cache, or shared mutable state
  - API contracts that leak internal implementation details forcing tight version coupling
  - Shared database tables written by one service and read by another
  - Deployment pipeline that builds or deploys multiple services as a single unit
  - Service integration tests that require 5+ services running simultaneously
  - Synchronous call chains spanning 3+ services for a single request
  - Shared libraries containing business logic or domain models
  - Missing service discovery or hardcoded service addresses
  - Chatty inter-service communication with many small calls
  - Service with no independent deployment capability
  - Missing circuit breaker, timeout, or retry on inter-service calls
  - Service exposing internal implementation details in API contracts
  - Shared database or schema between services
  - Distributed transaction without saga or outbox pattern
  - Service that cannot start or operate when a dependency is down
  - "Classes consisting only of getters and setters with no domain behavior (anemic domain model)"
  - DTOs used deep inside domain logic instead of being confined to API or persistence boundaries
  - Records or structs with public mutable fields and no invariant enforcement
  - Value objects missing equality, comparison, or formatting logic that belongs with the data
  - Entities with no domain methods -- all business logic lives in external service classes
  - Classes where every field is publicly writable with no validation on set
  - "Data holders that are queried and manipulated by multiple external classes (feature envy magnets)"
  - Classes that accumulate getters but never accumulate the behavior that operates on those getters
  - Mutable data objects passed through multiple layers without any layer enriching them with behavior
  - Domain model objects that are indistinguishable from database row representations
tags:
  - application-service
  - ddd
  - tactical-design
  - domain-service
  - orchestration
  - hexagonal
  - domain-driven-design
  - anemic-domain-model
  - encapsulation
  - data-class
  - service-layer
  - anti-pattern
  - tell-dont-ask
  - shared-database
  - database-coupling
  - service-boundaries
  - data-ownership
  - microservices
  - architecture
  - distributed-monolith
  - coupling
  - deployment
  - database
  - resilience
  - saga
  - service
  - discovery
  - chatty
  - dispensable
  - anemic-domain
  - domain-modeling
  - clean-code
aliases:
  - antipattern-anemic-domain-model
  - antipattern-shared-database-across-services
  - antipattern-distributed-monolith
  - arch-microservices
  - smell-data-class
activation:
  file_globs:
    - "**/*service*"
    - "**/*Service*"
    - "**/*usecase*"
    - "**/*UseCase*"
    - "**/*interactor*"
    - "**/*Interactor*"
    - "**/*handler*"
    - "**/*Handler*"
    - "**/*application*"
  keyword_matches:
    - service
    - Service
    - usecase
    - UseCase
    - interactor
    - Interactor
    - handler
    - Handler
    - application
    - orchestrat
    - coordinate
  structural_signals:
    - service_class
    - orchestration_method
    - transaction_boundary
source:
  origin: file
  path: ddd-tactical-application-services.md
  hash: "sha256:ea6e2988fff27db667f6f1168ee612214e42543862873b4b1246013704cec9e4"
---
# Tactical Application Services

## When This Activates

Activates on diffs involving service, use case, interactor, or handler classes in the application layer. Application services are thin orchestration layers: they accept a command, load aggregates from repositories, invoke domain behavior, persist results, and publish events. They must not contain domain logic -- that belongs on aggregates, entities, value objects, or domain services. They must not directly access infrastructure -- that is the adapter layer's job via ports. The most common violation is application services that grow into domain logic dumping grounds, making business decisions with if/else chains on entity state instead of telling the domain objects to act.

## Audit Surface

- [ ] Application service method with if/else branching on domain entity state
- [ ] Application service directly importing database, HTTP, or file system classes
- [ ] Application service performing calculations (totals, discounts, eligibility) instead of delegating to domain
- [ ] Application service method longer than 20 lines containing domain logic mixed with coordination
- [ ] Application service calling repository, then doing domain logic, then calling another repository
- [ ] Application service creating domain objects by setting fields instead of using factory or constructor
- [ ] Application service catching domain exceptions and making business decisions on them
- [ ] Application service with methods named using domain verbs (approve, escalate) that contain the logic instead of delegating
- [ ] Application service that is a one-line pass-through adding no orchestration value
- [ ] Application service method accessing 2+ repositories and performing domain logic between calls
- [ ] Application service directly constructing infrastructure objects (connections, clients)
- [ ] Application service duplicating domain logic already present on the domain model

## Detailed Checks

### Domain Logic Leakage
<!-- activation: keywords=["if", "else", "switch", "case", "when", "calculate", "compute", "determine", "check", "validate", "eligible", "can", "should", "allow"] -->

- [ ] **Conditional on domain state**: flag application service code like `if (order.getStatus() == PENDING && order.getTotal() > limit)` -- this business decision belongs on the aggregate (`order.canBeApproved()`)
- [ ] **Calculation in service**: flag application services computing derived values (discounts, totals, fees, eligibility scores) -- these calculations belong on domain objects or domain services
- [ ] **Domain vocabulary in service implementation**: flag service methods named `approveOrder` whose body contains the approval logic instead of calling `order.approve()` -- the service should delegate, not implement
- [ ] **Duplicated domain logic**: flag application service code that reimplements logic already present on the domain model -- this creates inconsistency when the domain logic changes

### Infrastructure Access
<!-- activation: keywords=["database", "db", "sql", "http", "client", "connection", "file", "socket", "cache", "redis", "queue", "import", "require"] -->

- [ ] **Direct infrastructure import**: flag application services importing database drivers, HTTP clients, file system APIs, or message queue clients directly -- use port interfaces and inject adapters
- [ ] **Connection management in service**: flag application services creating database connections, HTTP clients, or file handles -- infrastructure lifecycle belongs in the adapter layer
- [ ] **Raw SQL in application service**: flag SQL strings or query builder usage in application service code -- persistence details belong in repository implementations
- [ ] **Infrastructure exception handling**: flag application services catching `SQLException`, `HttpException`, or `IOException` and making domain decisions -- translate infrastructure exceptions at the adapter boundary

### Orchestration Responsibility
<!-- activation: keywords=["repository", "save", "find", "load", "persist", "publish", "emit", "notify", "send", "transaction", "Transactional"] -->

- [ ] **Domain logic between repository calls**: flag application service methods that load an aggregate, perform domain logic inline, then save -- the domain logic should be called as a method on the aggregate
- [ ] **Fat orchestration**: flag application service methods longer than 20 lines that mix coordination with domain decisions -- extract domain logic to domain objects or domain services
- [ ] **Missing domain service**: flag application service orchestrating logic that involves multiple aggregates' domain rules -- this cross-aggregate domain logic belongs in a domain service, not the application service
- [ ] **Anemic pass-through**: flag application services whose methods do nothing but call a single repository method with no coordination -- this adds a layer without value

### Domain Object Construction
<!-- activation: keywords=["new ", "create", "build", "construct", "set", "setter", "factory", "Builder"] -->

- [ ] **Field-by-field construction**: flag application services that create domain objects by instantiating and then calling setters -- use factory methods or rich constructors on the domain model
- [ ] **Construction without validation**: flag application services assembling aggregates from raw input without going through domain factories that enforce invariants
- [ ] **Service as factory**: flag application services containing complex object creation logic that belongs in a dedicated domain factory

## Common False Positives

- **Thin services in simple domains**: in domains with minimal business logic, application services may legitimately contain all coordination. Flag only when there is extractable domain logic being missed.
- **Transaction coordination**: application services managing transaction boundaries (`@Transactional`) is correct -- this is infrastructure orchestration, not domain logic.
- **Input validation**: basic input validation (null checks, format validation on incoming commands) in the application service is acceptable -- distinguish from domain invariant validation.
- **Error mapping**: translating domain exceptions into application-layer error responses is appropriate application service responsibility.
- **CQRS query handlers**: query/read handlers that assemble DTOs from read models may contain projection logic that is not domain logic -- it is presentation coordination.
- **Saga/Process Manager**: sagas coordinate across multiple aggregates by design and may contain routing logic that resembles domain decisions but is actually process flow.

## Severity Guidance

| Finding | Severity |
|---|---|
| Application service containing complex business rules with multi-branch domain state decisions | Critical |
| Application service directly constructing database connections or HTTP clients | Critical |
| Application service performing domain calculations (pricing, eligibility, scoring) | Important |
| Application service duplicating logic already present on domain objects | Important |
| Application service method with 30+ lines mixing coordination and domain logic | Important |
| Application service creating domain objects via setters instead of factory/constructor | Important |
| Application service with raw SQL or query builder code | Important |
| Application service as one-line pass-through with no orchestration value | Minor |
| Application service catching infrastructure exceptions at application boundary | Minor |

## See Also

- `antipattern-anemic-domain-model` -- when application services contain domain logic, the domain model is anemic by definition
- `ddd-tactical-aggregates` -- application services load and save aggregates; domain logic lives on the aggregates
- `ddd-tactical-repositories` -- application services use repositories through interfaces; repositories are ports, not infrastructure
- `principle-solid` -- SRP: application services coordinate, domain objects decide; DIP: depend on port interfaces, not infrastructure
- `principle-tell-dont-ask` -- application services should tell domain objects what to do, not query state and decide for them
- `principle-separation-of-concerns` -- application orchestration, domain logic, and infrastructure access are three separate concerns

## Authoritative References

- [Eric Evans, *Domain-Driven Design* (2003), Chapter 5: "A Model Expressed in Software" -- Services (distinguishing domain vs. application services)](https://www.oreilly.com/library/view/domain-driven-design-tackling/0321125215/)
- [Vaughn Vernon, *Implementing Domain-Driven Design* (2013), Chapter 14: "Application"](https://www.oreilly.com/library/view/implementing-domain-driven-design/9780133039900/)
- [Alistair Cockburn, "Hexagonal Architecture" (2005) -- ports and adapters, application service as the hexagon boundary](https://alistair.cockburn.us/hexagonal-architecture/)
- [Robert C. Martin, *Clean Architecture* (2017), Chapter 22: "The Clean Architecture" -- use cases as application services](https://www.oreilly.com/library/view/clean-architecture-a/9780134494272/)
