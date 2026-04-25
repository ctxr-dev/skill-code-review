---
id: principle-grasp
type: primary
depth_role: leaf
focus: Enforce GRASP responsibility-assignment patterns to ensure objects and modules are given the right responsibilities.
parents:
  - index.md
covers:
  - "Creator: object creation assigned to the class with the most initialization data"
  - "Information Expert: responsibility assigned to the class holding the required data"
  - "Controller: UI/transport layer delegates to a thin coordinating object, not domain logic directly"
  - "Low Coupling: minimize unnecessary inter-module dependencies"
  - "High Cohesion: each module's responsibilities are strongly related"
  - "Polymorphism: type-based behavior handled via polymorphic dispatch, not conditionals"
  - "Pure Fabrication: introduce service objects when no domain class is a natural home"
  - "Indirection: intermediate objects decouple volatile dependencies"
  - "Protected Variations: stable interfaces shield against anticipated change points"
  - Responsibility misplacement across layers
  - Anemic coordinators that do too much domain logic
  - Feature envy as a misassigned-responsibility symptom
tags:
  - grasp
  - responsibility-assignment
  - coupling
  - cohesion
  - patterns
  - architecture
activation:
  file_globs:
    - "**/*.{java,kt,scala,cs,ts,js,py,rb,go,rs,swift}"
  keyword_matches:
    - class
    - interface
    - service
    - controller
    - factory
    - repository
    - handler
    - manager
    - provider
    - coordinator
    - delegate
  structural_signals:
    - new_class_definition
    - class_method_addition
    - dependency_injection
source:
  origin: file
  path: principle-grasp.md
  hash: "sha256:c46e332e26237193e971367e9b94793598090975323351d1704807078ddba622"
---
# GRASP Responsibility Assignment

## When This Activates

Activates when diffs introduce or modify classes, services, controllers, factories, repositories, or any named module boundary. GRASP provides the fundamental reasoning framework for *where* to place new responsibilities -- complementing SOLID's focus on *how* to structure them.

## Audit Surface

- [ ] Business logic resides in the domain/service layer, not in controllers or transport handlers
- [ ] Object creation is assigned to the class with the strongest relationship to the created object's initialization data
- [ ] Decisions are made by the class that owns the relevant data (Information Expert)
- [ ] New cross-module dependencies are justified and do not tighten coupling unnecessarily
- [ ] Each module's public API serves a single, cohesive purpose
- [ ] Type-varying behavior uses polymorphic dispatch rather than conditional type-checking
- [ ] Infrastructure concerns that have no natural domain home are placed in explicit Pure Fabrication service classes
- [ ] Volatile dependencies are accessed through intermediate indirection layers
- [ ] Known variation points are shielded behind stable interfaces (Protected Variations)
- [ ] Controller classes delegate to domain/service objects and contain no business rules
- [ ] No pass-through service that adds no coordination, validation, or translation value
- [ ] Factory/creation logic is consolidated rather than duplicated across call sites
- [ ] Helper methods operate on local state, not by reaching into another object's internals
- [ ] No new circular dependencies introduced between modules
- [ ] Diff does not measurably increase coupling (new cross-boundary imports should be scrutinized)
- [ ] New methods added to a class are cohesive with its existing responsibility

## Detailed Checks

### Creator and Information Expert
<!-- activation: keywords=["new", "create", "build", "factory", "construct", "init", "from"] -->

- [ ] **Creator justification**: the class calling `new`/`create` has the initialization data, closely aggregates the created object, or records it -- if none apply, creation responsibility is misplaced
- [ ] **Scattered creation**: same object type is instantiated in 3+ unrelated locations -- consolidate into a Creator or Factory
- [ ] **Information Expert alignment**: the method making a decision or computation lives in the class that holds the data needed for that decision
- [ ] **Data jealousy**: method in class A calls 3+ getters on class B to make a decision -- that decision belongs in class B
- [ ] **Derived data ownership**: computed/derived values are calculated by the class owning the source data, not by external callers
- [ ] **Projection leakage**: a class exposes raw internal data for others to process instead of providing a domain-meaningful method

### Controller and Coordination
<!-- activation: keywords=["controller", "handler", "endpoint", "route", "action", "dispatch", "orchestrate"] -->

- [ ] **Thin controller test**: controller methods should delegate to service/domain objects within 5-10 lines; longer methods likely contain misplaced business logic
- [ ] **No domain logic in controllers**: conditionals, calculations, validations, or state transitions in the controller layer belong in the domain or service layer
- [ ] **Session/request state handling**: controller unpacks request context and passes it down, does not thread request-specific state deep into the domain
- [ ] **System operation mapping**: each controller action maps to a single system operation/use case; avoid multi-purpose endpoints
- [ ] **Coordinator vs. doer**: if a "coordinator" class is computing results itself rather than delegating, it has absorbed too much responsibility

### Low Coupling and High Cohesion
<!-- activation: keywords=["import", "require", "inject", "depend", "bind", "module", "package"] -->

- [ ] **Import direction**: dependencies flow from outer layers inward (infrastructure -> application -> domain), never the reverse
- [ ] **Coupling delta**: count new cross-module imports in the diff; each one must be justified
- [ ] **Stable dependency principle**: depend on modules that change less frequently than you do
- [ ] **Interface-mediated coupling**: dependencies on volatile modules should go through an interface/abstraction, not directly
- [ ] **Cohesion check**: all public methods of the class under review relate to the same conceptual responsibility; unrelated methods indicate low cohesion
- [ ] **Method-data affinity**: methods use most of the class's fields; a method using none of the class's state likely belongs elsewhere
- [ ] **Circular dependency detection**: A depends on B depends on A -- extract the shared concern into a third module

### Polymorphism and Protected Variations
<!-- activation: keywords=["instanceof", "typeof", "is", "switch", "match", "case", "type", "kind", "variant"] -->

- [ ] **Type-switching smell**: `if/switch` on object type to select behavior should be replaced with polymorphic method dispatch
- [ ] **Variation point identification**: where the domain has known variation (payment methods, notification channels, storage backends), is there a stable interface insulating callers?
- [ ] **Plugin architecture**: anticipated extension points use strategy/plugin patterns, not hardcoded branches
- [ ] **Conditional elimination**: repeated `instanceof`/`typeof` checks across the codebase for the same type hierarchy indicate missing polymorphism
- [ ] **Protected Variations compliance**: when a third-party or volatile dependency changes, how many files in this codebase must change? Shield with an adapter/interface

### Pure Fabrication and Indirection
<!-- activation: keywords=["service", "adapter", "gateway", "repository", "proxy", "mediator", "facade"] -->

- [ ] **Domain class overload**: if adding a responsibility to a domain class would hurt cohesion, prefer a Pure Fabrication (service object, adapter, gateway)
- [ ] **Naming clarity**: fabricated service classes have intention-revealing names that describe their coordination role, not generic names like `Manager` or `Helper`
- [ ] **Indirection justification**: every intermediate layer must provide decoupling value; pass-through indirection that adds no transformation or abstraction is needless complexity
- [ ] **Repository pattern compliance**: data-access logic lives in repository classes, not scattered across business logic
- [ ] **Adapter isolation**: third-party API interactions wrapped in an adapter so the domain never depends on external contracts directly

## Common False Positives

- **Microservices with thin domain layers**: in small services, a controller that delegates to a single service method may look "too thin" -- that is fine; the service is the real unit.
- **Functional pipelines**: in functional codebases, data flows through transformations rather than being dispatched polymorphically. Pattern matching on algebraic data types is idiomatic, not a GRASP violation.
- **CQRS read models**: query-side projections may legitimately fetch and assemble data from multiple sources without violating Information Expert, since the read model *is* the expert for that query shape.
- **Simple scripts and CLIs**: GRASP is designed for systems with multiple collaborating objects; a 50-line script does not need GRASP-level analysis.
- **DTOs crossing boundaries**: data-transfer objects carrying data between layers are not anemic-domain violations; they are transport artifacts.

## Severity Guidance

| Finding | Severity |
|---|---|
| Business rules embedded in controller/transport layer | high |
| Decision logic operating entirely on another object's getters | high |
| Circular dependency introduced between modules | high |
| Type-checking conditional replacing polymorphic dispatch (3+ branches) | medium |
| Object creation scattered across 3+ unrelated call sites | medium |
| New cross-module dependency without interface mediation | medium |
| Pass-through service adding no coordination value | low |
| Slightly low cohesion in a small internal class | low |
| Pure Fabrication named generically (e.g., `DataManager`) | low |

## See Also

- `principle-solid` -- SRP and ISP directly reinforce GRASP cohesion and expert patterns
- `principle-tell-dont-ask` -- behavioral co-location is the operational test for Information Expert
- `principle-encapsulation` -- information hiding protects the data that Information Expert relies on
- `principle-composition-over-inheritance` -- composition is often the mechanism for Indirection and Protected Variations

## Authoritative References

- [Craig Larman, *Applying UML and Patterns* (3rd ed., 2004), Chapters 17-25](https://www.pearson.com/en-us/subject-catalog/p/applying-uml-and-patterns-an-introduction-to-object-oriented-analysis-and-design-and-iterative-development/P200000009490)
- [Craig Larman, "GRASP: Designing Objects with Responsibilities"](https://en.wikipedia.org/wiki/GRASP_(object-oriented_design))
- [Martin Fowler, "Patterns of Enterprise Application Architecture" (2002), Chapter 9: Domain Logic Patterns](https://martinfowler.com/books/eaa.html)
