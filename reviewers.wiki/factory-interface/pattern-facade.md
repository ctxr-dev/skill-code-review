---
id: pattern-facade
type: primary
depth_role: leaf
focus: Detect misuse, over-application, and absence of the Facade pattern in subsystem-simplification code.
parents:
  - index.md
covers:
  - Facades that grow into god objects accumulating unrelated subsystem orchestration
  - Facades leaking subsystem types in their public API signatures
  - Facades containing business logic that should be delegated to subsystem components
  - Thin facades that add no simplification over direct subsystem calls
  - Missing facades where client code orchestrates multiple subsystem calls directly
  - Facades that suppress subsystem errors instead of translating them
  - Facades with mutable state that should be stateless coordination
  - Facades coupled to concrete subsystem classes instead of abstractions
  - Single-method facades that are just unnecessary indirection
  - Facades that prevent advanced clients from accessing subsystem capabilities
tags:
  - facade
  - structural-pattern
  - design-patterns
  - simplification
  - api-design
  - subsystem
  - gateway
activation:
  file_globs:
    - "**/*.{java,kt,scala,cs,ts,js,py,rb,go,rs,swift,cpp,h,hpp,php}"
  keyword_matches:
    - Facade
    - facade
    - gateway
    - service
    - api
    - client
    - simplified
    - unified
    - aggregate
  structural_signals:
    - class_delegating_to_multiple_subsystem_objects
    - orchestration_method_calling_multiple_services
    - high_fan_out_class
source:
  origin: file
  path: pattern-facade.md
  hash: "sha256:dff06aae871ef1c094c88b48eab7285ba5be2f62fc73181575f6e2720b6f6359"
---
# Facade Pattern

## When This Activates

Activates when diffs introduce classes that coordinate multiple subsystem objects behind a simplified API, add `*Facade`, `*Gateway`, or `*Service` classes that aggregate calls to lower-level components, or when client code performs multi-step orchestration of subsystem objects. The Facade pattern is meant to provide a simple entry point to a complex subsystem, but it frequently degrades into a god object or a pass-through layer that adds cost without value.

## Audit Surface

- [ ] Facade has a cohesive, bounded responsibility -- all methods relate to a single subsystem or use case family
- [ ] No subsystem-internal types (entities, exceptions, enums) appear in the facade's public method signatures
- [ ] Facade delegates all business logic to subsystem components -- it orchestrates, not implements
- [ ] Every facade method simplifies a genuinely complex interaction; single-delegation methods are justified
- [ ] Client code uses the facade instead of directly orchestrating multiple subsystem objects
- [ ] Facade translates subsystem exceptions into facade-level errors meaningful to clients
- [ ] Facade is stateless or its state is clearly justified and documented
- [ ] Facade depends on abstractions of subsystem components, not concrete implementations
- [ ] Facade does not prevent advanced clients from accessing the subsystem directly when needed
- [ ] No overlapping facades exist for the same subsystem -- responsibilities are clearly partitioned
- [ ] Facade is not a 1:1 pass-through of the subsystem's interface
- [ ] Facade method names describe client-facing operations, not subsystem implementation steps
- [ ] Facade's dependency count is reasonable (<10); high counts suggest the facade spans too many concerns
- [ ] Client code does not import both facade types and subsystem types the facade is supposed to hide

## Detailed Checks

### God Facade Detection
<!-- activation: keywords=["Facade", "facade", "Service", "service", "Manager", "manager", "gateway", "controller"] -->

- [ ] **Method count explosion**: facade has 15+ public methods covering unrelated subsystem areas -- split into multiple focused facades (one per bounded context or use case family)
- [ ] **Dependency accumulation**: facade constructor accepts 10+ subsystem dependencies, indicating it coordinates too many concerns -- each concern deserves its own facade
- [ ] **Responsibility creep**: facade started as a simple entry point but now handles user management, billing, notifications, and reporting -- extract focused facades
- [ ] **Change magnet**: every new feature requires modifying the facade because it is the single entry point for all client interactions -- this violates OCP
- [ ] **Long methods**: individual facade methods are 50+ lines of orchestration code, suggesting they should be decomposed into smaller, focused methods or delegated to an application service

### Subsystem Type Leakage
<!-- activation: keywords=["return", "parameter", "type", "import", "expose", "public", "api", "signature"] -->

- [ ] **Subsystem types in signatures**: facade method accepts or returns types defined within the subsystem (e.g., `InventoryItem`, `ShippingRate`) -- clients must import subsystem packages, defeating the facade's purpose
- [ ] **Exception leakage**: facade propagates subsystem-specific exceptions (e.g., `DatabaseConnectionException`) instead of translating to facade-level exceptions (e.g., `OrderServiceException`)
- [ ] **Enum exposure**: facade uses subsystem-internal enums in its API (e.g., `WarehouseZone.NORTH`) that clients should not know about
- [ ] **Collection of internals**: facade returns `List<SubsystemEntity>` instead of a facade-defined summary type or DTO
- [ ] **Configuration leakage**: facade exposes subsystem configuration details (connection strings, cache TTLs) in its API

### Business Logic in Facades
<!-- activation: keywords=["if", "else", "switch", "calculate", "validate", "rule", "logic", "check", "determine"] -->

- [ ] **Decision logic**: facade contains if/else or switch statements that make business decisions -- these decisions belong in domain services or subsystem components
- [ ] **Calculations**: facade performs arithmetic, aggregation, or transformation that constitutes business logic -- delegate to the appropriate domain object
- [ ] **Validation**: facade validates business rules before delegating -- validation belongs in the domain layer or the subsystem's own entry points
- [ ] **Data transformation**: facade maps between internal formats in ways that encode business meaning -- this is domain logic, not orchestration
- [ ] **Stateful coordination**: facade tracks workflow state (steps completed, retry counts) that constitutes business process logic -- use a workflow engine or state machine in the domain layer

### Thin Facade (No Value Added)
<!-- activation: keywords=["delegate", "forward", "pass", "call", "simple", "wrapper", "proxy"] -->

- [ ] **Single-call pass-through**: facade method delegates to exactly one subsystem method with identical parameters and return type -- the facade adds indirection without simplification
- [ ] **1:1 method mapping**: every facade method corresponds to exactly one subsystem method with no parameter reduction, error translation, or orchestration -- the facade is a mirror
- [ ] **No parameter simplification**: facade accepts the same complex parameter set as the subsystem, just forwarding it -- clients gain nothing
- [ ] **No error simplification**: facade propagates subsystem exceptions unchanged -- no translation or unification occurs
- [ ] **Premature facade**: facade created "for future flexibility" but the subsystem has a single class with a clean API -- add a facade when complexity actually warrants it

### Missing Facade
<!-- activation: keywords=["new", "create", "init", "setup", "configure", "step", "then", "sequence", "call", "invoke"] -->

- [ ] **Multi-step orchestration in clients**: client code calls 3+ subsystem objects in sequence to accomplish a single logical operation -- this coordination should be behind a facade
- [ ] **Duplicated orchestration**: the same sequence of subsystem calls appears in multiple client locations -- extract into a facade method
- [ ] **Client coupling to subsystem internals**: clients import and depend on multiple internal subsystem classes, creating fragile coupling -- a facade would provide a stable API
- [ ] **Knowledge burden**: new developers must understand the subsystem's internal structure to use it correctly -- a facade would encode the correct usage patterns
- [ ] **Breaking changes propagate**: internal subsystem refactoring requires changes in multiple client files because there is no facade to absorb the impact

### Facade Accessibility and Flexibility
<!-- activation: keywords=["advanced", "custom", "direct", "access", "bypass", "override", "escape", "hatch"] -->

- [ ] **Opaque facade**: facade is the only way to use the subsystem, and it does not expose the subsystem for advanced use cases -- provide escape hatches or access to subsystem components when justified
- [ ] **Over-simplified API**: facade strips away capabilities that legitimate clients need, forcing them to work around the facade or access the subsystem via reflection
- [ ] **Configuration inflexibility**: facade hardcodes subsystem configuration that advanced clients need to customize -- accept configuration parameters or provide a builder-style API

## Common False Positives

- **Application services / use case classes**: classes named `*Service` that orchestrate domain objects are application services (Clean Architecture), not GoF Facades. Orchestration logic in this layer is appropriate.
- **API controllers**: REST/GraphQL controllers coordinate multiple services to fulfill requests. This is their job; they are not "facades with too much logic."
- **Module public APIs**: a module's `index.ts` or `__init__.py` that re-exports selected symbols is an access-control mechanism, not a facade pattern instance.
- **Anti-corruption layers (DDD)**: ACLs intentionally translate between bounded contexts. They may look like facades but have a different purpose (protecting domain integrity).
- **Service aggregation in BFF**: Backend-for-Frontend patterns intentionally aggregate multiple backend calls into a single response. This is legitimate orchestration, not facade misuse.

## Severity Guidance

| Finding | Severity |
|---|---|
| Facade with 20+ methods spanning unrelated concerns (god facade) | high |
| Facade contains business logic that belongs in the domain layer | high |
| Subsystem types leaked in facade's public API, coupling clients to internals | medium |
| Client code orchestrates 3+ subsystem objects without a facade | medium |
| Facade is a 1:1 pass-through adding no simplification | medium |
| Facade catches and suppresses subsystem exceptions silently | medium |
| Facade dependency count exceeds 10 subsystem components | medium |
| Facade prevents advanced clients from accessing needed subsystem capabilities | low |
| Facade method names mirror subsystem method names (no abstraction) | low |
| Premature facade for a single-class subsystem | low |

## See Also

- `pattern-adapter` -- adapters translate between incompatible interfaces; facades simplify a complex interface. If the facade has a single subsystem dependency, it may be an adapter.
- `principle-separation-of-concerns` -- god facades violate separation of concerns by spanning too many subsystem areas
- `principle-coupling-cohesion` -- facades should have high cohesion (related methods) and reduce coupling between clients and subsystems
- `principle-encapsulation` -- facades encapsulate subsystem complexity; leaking subsystem types breaks this encapsulation
- `principle-solid` -- god facades violate SRP; business logic in facades violates the single level of abstraction principle

## Authoritative References

- [Erich Gamma et al., *Design Patterns: Elements of Reusable Object-Oriented Software* (1994), Facade](https://www.oreilly.com/library/view/design-patterns-elements/0201633612/)
- [Robert C. Martin, *Clean Architecture* (2017), Chapter 22: Presenters and Humble Objects](https://www.oreilly.com/library/view/clean-architecture-a/9780134494272/)
- [Eric Evans, *Domain-Driven Design* (2003), Anti-Corruption Layer and Facade](https://www.oreilly.com/library/view/domain-driven-design-tackling/0321125215/)
- [Martin Fowler, *Patterns of Enterprise Application Architecture* (2002), Service Layer](https://martinfowler.com/eaaCatalog/serviceLayer.html)
