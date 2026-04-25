---
id: arch-modular-monolith
type: primary
depth_role: leaf
focus: "Detect module boundary violations including direct access to another module's internals, missing public API surfaces, and shared database tables between modules"
parents:
  - index.md
covers:
  - "Module A importing internal classes from module B instead of using B's public API"
  - Missing public API surface -- module exposes everything or nothing
  - Shared database tables written by multiple modules
  - Circular dependency between modules
  - "Module reaching into another module's database tables or schema"
  - Cross-module domain model sharing without a published contract
  - "Module boundary not enforced at compile time (no visibility modifiers, no module system)"
  - Integration through shared mutable state instead of explicit API calls
  - Transaction spanning multiple module boundaries
  - Module with no clear boundary -- all packages accessible from outside
  - Controllers or API handlers importing repository or database modules directly, bypassing service layers
  - Business logic embedded in API handlers, CLI commands, or UI components
  - Circular dependencies between packages or modules
  - No clear module boundaries -- all source files in one flat directory or package
  - Imports crossing every architectural boundary without a discernible dependency direction
  - Shared mutable state accessed from unrelated modules without synchronization or ownership
  - Configuration values, secrets, or raw SQL embedded in business logic
  - Utility modules imported by every file in the codebase, acting as implicit coupling hubs
  - No dependency inversion -- high-level modules importing low-level infrastructure directly
  - Test files importing from every layer because the code under test has no isolation
  - Diff adding a new import that creates a dependency cycle between packages
  - Module structure where removing or renaming one file would break files across 5+ unrelated packages
tags:
  - modular-monolith
  - module-boundary
  - public-api
  - encapsulation
  - architecture
  - coupling
  - big-ball-of-mud
  - layering
  - boundaries
  - modularity
  - anti-pattern
  - dependency-direction
aliases:
  - antipattern-big-ball-of-mud
activation:
  file_globs:
    - "**/modules/**"
    - "**/module/**"
    - "**/bounded-context/**"
    - "**/contexts/**"
    - "**/features/**"
    - "**/internal/**"
    - "**/public/**"
    - "**/api/**"
  keyword_matches:
    - module
    - internal
    - public
    - boundary
    - context
    - feature
    - package-private
    - __all__
    - export
    - facade
  structural_signals:
    - module_boundary_import
    - cross_module_dependency
    - shared_database_table
source:
  origin: file
  path: arch-modular-monolith.md
  hash: "sha256:d9a41dcc98b6c8797589b8ff43c07da792c3bc57ba46ea6785534cd8d0103794"
---
# Modular Monolith

## When This Activates

Activates on diffs in projects organized into explicit modules, bounded contexts, or feature directories within a single deployable unit. A modular monolith delivers the encapsulation benefits of microservices without the operational complexity of distributed systems -- but only if module boundaries are enforced. The moment modules reach into each other's internals, share database tables, or form circular dependencies, the architecture degrades into an unstructured monolith. This reviewer detects diff-visible boundary violations.

## Audit Surface

- [ ] Import from another module's internal package (not its public API)
- [ ] Module has no index, facade, or public API file -- all internals are directly importable
- [ ] Two modules write to the same database table
- [ ] Module A's migration references tables owned by module B
- [ ] Circular import between two module packages
- [ ] Cross-module direct class instantiation instead of calling an API
- [ ] Domain entity from module A used directly in module B's code
- [ ] Shared mutable state (global, singleton) accessed by multiple modules
- [ ] Transaction spans tables owned by different modules
- [ ] Module's internal package has no access restriction (no package-private, no __all__)
- [ ] Module boundary violations visible in import graph -- bidirectional dependencies
- [ ] Integration test couples 3+ modules with direct internal access

## Detailed Checks

### Module Boundary Enforcement
<!-- activation: keywords=["import", "require", "from", "internal", "public", "api", "module", "package", "export", "facade", "__all__"] -->

- [ ] __Internal import across modules__: flag imports from another module's internal packages (anything not in the module's public API/facade) -- inter-module access must go through the defined public surface
- [ ] __Missing public API surface__: flag modules that expose all internal classes without a public API file (index.ts, __init__.py with __all__, facade class, or api package) -- without an explicit public surface, everything is implicitly public
- [ ] __Direct class instantiation across modules__: flag code in module A that directly instantiates a class from module B's internals instead of calling B's public service or factory
- [ ] __No compile-time enforcement__: flag modules that rely on convention rather than language features (package-private, internal keyword, module system) to enforce boundaries -- conventions erode without tooling

### Shared Data Ownership
<!-- activation: keywords=["database", "table", "schema", "migration", "SQL", "entity", "model", "repository", "INSERT", "UPDATE", "SELECT"] -->

- [ ] __Shared table writes__: flag two or more modules writing to the same database table -- each table should be owned by exactly one module
- [ ] __Cross-module table read__: flag module A reading directly from module B's database tables -- use B's API to access B's data
- [ ] __Cross-module migration__: flag database migrations in module A that alter tables owned by module B -- migrations must be scoped to the owning module
- [ ] __Transaction spanning modules__: flag transactions that span tables owned by different modules -- each module should manage its own transactional boundary
- [ ] __Shared ORM entity__: flag a single ORM entity class used by multiple modules -- each module should have its own persistence model for tables it owns

### Cross-Module Domain Coupling
<!-- activation: keywords=["entity", "domain", "model", "value", "aggregate", "shared", "contract", "event", "dto"] -->

- [ ] __Shared domain entity__: flag domain entity or aggregate classes from module A being used directly in module B's business logic -- modules should communicate through DTOs or published events
- [ ] __Missing anti-corruption layer__: flag module B consuming module A's types directly without mapping to its own domain model -- an ACL prevents A's changes from cascading into B
- [ ] __Circular module dependency__: flag bidirectional dependencies between modules -- if A depends on B and B depends on A, they are not truly separate modules
- [ ] __Implicit coupling through events__: flag event payloads that contain module-internal types instead of a published contract schema -- event contracts must be stable and independent of internal models

### Module Isolation Testing
<!-- activation: keywords=["test", "spec", "mock", "stub", "fixture", "integration", "setup"] -->

- [ ] __Test requires multiple modules__: flag unit tests that import from multiple modules' internals to set up a single test case -- each module should be testable in isolation
- [ ] __No module-level integration test__: flag modules with no tests validating the public API contract -- the public API is the module's guarantee to consumers
- [ ] __Cross-module fixture sharing__: flag test fixtures or factories from module A reused in module B's tests -- each module should own its test data

## Common False Positives

- __Shared kernel__: a small, explicitly defined shared kernel (common value objects, event contracts) that multiple modules depend on is an intentional DDD pattern, not a boundary violation. Flag only when the shared kernel grows unbounded or contains module-specific logic.
- __Module composition root__: the application's wiring code (main, DI configuration) legitimately imports from multiple modules' public APIs to compose them.
- __Cross-module event handling__: modules subscribing to each other's published events through an event bus is correct modular communication, not a boundary violation.
- __Monorepo tooling imports__: build tools, linters, and code generators may import from multiple modules for analysis purposes.

## Severity Guidance

| Finding | Severity |
|---|---|
| Two modules writing to the same database table | Critical |
| Circular dependency between modules | Critical |
| Module A importing module B's internal classes (not public API) | Critical |
| Transaction spanning multiple module boundaries | Important |
| Module with no defined public API surface | Important |
| Domain entity shared across module boundaries without DTO/contract | Important |
| Cross-module database migration | Important |
| Missing compile-time boundary enforcement | Minor |
| Test requiring imports from multiple modules' internals | Minor |
| Module-level integration test absent | Minor |

## See Also

- `principle-encapsulation` -- module boundaries are encapsulation at the architectural level; internals must be hidden behind a public API
- `principle-coupling-cohesion` -- modules must be highly cohesive internally and loosely coupled to each other
- `principle-separation-of-concerns` -- each module owns a distinct bounded context or business capability
- `antipattern-big-ball-of-mud` -- unenforced module boundaries degrade a modular monolith into an unstructured monolith
- `antipattern-distributed-monolith` -- a modular monolith avoids distributed-monolith problems by keeping modules in-process while enforcing boundaries
- `arch-microservices` -- modular monolith is the precursor to microservices; well-enforced module boundaries make future extraction straightforward

## Authoritative References

- [Kamil Grzybek, "Modular Monolith: A Primer" (2019)](https://www.kamilgrzybek.com/blog/posts/modular-monolith-primer)
- [Simon Brown, "Modular Monoliths" (2018, NDC Conference)](https://www.youtube.com/watch?v=5OjqD-ow8GE)
- [Eric Evans, *Domain-Driven Design* (2003), Chapter 14: "Maintaining Model Integrity" -- Bounded Contexts](https://www.oreilly.com/library/view/domain-driven-design-tackling/0321125215/)
- [Vaughn Vernon, *Implementing Domain-Driven Design* (2013), Chapter 3: "Context Maps"](https://www.oreilly.com/library/view/implementing-domain-driven-design/9780133039900/)
- [Martin Fowler, "MonolithFirst" (2015)](https://martinfowler.com/bliki/MonolithFirst.html)
