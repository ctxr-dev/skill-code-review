---
id: ddd-tactical-repositories
type: primary
depth_role: leaf
focus: Detect repositories returning DTOs instead of aggregates, query methods bypassing aggregate roots, repositories containing business logic, and per-entity repositories instead of per-aggregate.
parents:
  - index.md
covers:
  - Repository returning DTOs, projections, or raw data instead of aggregate roots
  - Repository with query methods that load child entities bypassing the aggregate root
  - "Repository containing business logic (validation, calculation, domain rules)"
  - Repository defined per entity instead of per aggregate root
  - Repository with generic CRUD methods not aligned with domain operations
  - "Repository interface in the wrong layer (infrastructure instead of domain)"
  - Repository doing joins or projections that belong in a read model or query service
  - "Repository accepting domain logic parameters (predicates, specifications) it evaluates internally"
  - "Aggregate containing too many entities or value objects (god aggregate)"
  - Aggregate root exposing internal entities for direct external manipulation
  - Cross-aggregate reference by object instead of by identity
  - Transaction or unit of work spanning multiple aggregates
  - Aggregate without a clear root that enforces invariants
  - Child entity accessible and modifiable without going through the aggregate root
  - Aggregate root not protecting its invariants on state change
  - Repository loading or saving parts of an aggregate independently
  - Aggregate boundary not aligned with true consistency boundary
tags:
  - repository
  - ddd
  - tactical-design
  - aggregate-root
  - persistence
  - domain-driven-design
  - infrastructure
  - aggregate
  - invariant
  - consistency-boundary
  - transaction
aliases:
  - ddd-tactical-aggregates
activation:
  file_globs:
    - "**/*repository*"
    - "**/*Repository*"
    - "**/*repo*"
    - "**/*Repo*"
    - "**/*dao*"
    - "**/*Dao*"
    - "**/*store*"
    - "**/*Store*"
    - "**/*persistence*"
  keyword_matches:
    - repository
    - Repository
    - repo
    - Repo
    - DAO
    - dao
    - store
    - Store
    - find
    - save
    - delete
    - persist
    - query
    - fetch
    - load
  structural_signals:
    - repository_class
    - data_access_method
    - query_method
source:
  origin: file
  path: ddd-tactical-repositories.md
  hash: "sha256:e5cfc06c077d7712565af2ad3e53d3f6d917b550531a8db70486a4a3539deace"
---
# Tactical Repositories

## When This Activates

Activates on diffs involving repository, DAO, or data store classes -- particularly when new query methods are added or when repository return types diverge from aggregate roots. A repository in DDD provides the illusion of an in-memory collection of aggregates: you put aggregates in and take aggregates out, and the persistence mechanism is hidden behind the interface. The most common violations are repositories that return DTOs or projections (leaking persistence concerns into the domain), repositories defined for child entities instead of aggregate roots (breaking the aggregate boundary), and repositories that contain business logic (the repository's job is persistence, not domain rules).

## Audit Surface

- [ ] Repository method returning a DTO, Map, or raw database type instead of an aggregate
- [ ] Repository method that loads a child entity without its aggregate root
- [ ] Repository class containing if/else business logic, calculations, or domain rule checks
- [ ] Repository defined for a non-root entity that belongs inside an aggregate
- [ ] Repository interface defined in an infrastructure package instead of the domain layer
- [ ] Repository with complex query methods that assemble projections from multiple tables
- [ ] Repository method that updates a child entity independently of its aggregate root
- [ ] Repository with methods like findByStatusAndDateAndCustomerType (query service concern)
- [ ] Repository using raw SQL with business logic in the query (CASE WHEN for domain rules)
- [ ] Generic repository base class used for all entities regardless of aggregate boundaries
- [ ] Repository save method that persists child entities in separate transactions from the root
- [ ] Repository method count or aggregation (SUM, AVG) that belongs in a reporting/read service

## Detailed Checks

### Return Type Discipline
<!-- activation: keywords=["return", "find", "get", "load", "fetch", "query", "select", "DTO", "dto", "Map", "List", "Optional", "Result"] -->

- [ ] **DTO return type**: flag repository methods that return DTOs, view models, or response objects instead of aggregate roots -- repositories retrieve domain objects, not presentation types
- [ ] **Raw data return**: flag repository methods returning `Map`, `Object[]`, `Tuple`, or raw database types -- the domain should not know about persistence representation
- [ ] **Projection in repository**: flag repository methods that select a subset of aggregate fields (projection) -- this belongs in a read model query service, not the aggregate repository
- [ ] **Primitive return for domain concept**: flag `repository.findOrderTotal(orderId)` returning `BigDecimal` -- load the aggregate and ask it for the total

### Aggregate Boundary Violations
<!-- activation: keywords=["child", "item", "line", "detail", "sub", "nested", "inner", "entity", "save", "persist", "update", "delete"] -->

- [ ] **Per-entity repository**: flag repositories like `LineItemRepository`, `OrderDetailRepository`, `AddressRepository` when the entity is part of an aggregate with a different root -- only the aggregate root gets a repository
- [ ] **Child entity loading**: flag repository methods that load child entities (`findLineItemsByOrderId`) without returning the full aggregate -- callers should load the aggregate and navigate to children via the root
- [ ] **Independent child persistence**: flag repository save/update methods that persist a child entity separately from its aggregate root -- the entire aggregate must be persisted as a unit
- [ ] **Generic repository for all entities**: flag a single `GenericRepository<T>` used for both aggregate roots and child entities -- this ignores aggregate boundaries

### Business Logic in Repository
<!-- activation: keywords=["if", "else", "switch", "case", "validate", "check", "calculate", "rule", "logic", "when", "condition"] -->

- [ ] **Domain rules in queries**: flag SQL or ORM queries containing business logic (CASE WHEN for domain categorization, WHERE clauses encoding business rules) -- domain logic belongs in domain objects, not in queries
- [ ] **Validation in repository**: flag repository methods that validate domain invariants before persisting -- validation belongs on the aggregate, not in the persistence layer
- [ ] **Conditional persistence logic**: flag repository methods with if/else branches making domain decisions about what to save or how to transform data before saving
- [ ] **Computed fields in repository**: flag repository code that calculates derived values (totals, statuses, ranks) during persistence -- these computations belong on the domain model

### Layer Placement
<!-- activation: keywords=["interface", "abstract", "contract", "port", "domain", "infrastructure", "impl", "implementation", "adapter"] -->

- [ ] **Interface in wrong layer**: flag repository interfaces defined in the infrastructure or persistence package -- the interface belongs in the domain layer; only the implementation lives in infrastructure
- [ ] **Domain layer depending on persistence**: flag domain classes importing repository implementations or persistence framework types -- depend on the repository interface, not the implementation
- [ ] **Missing repository interface**: flag concrete repository classes with no corresponding interface -- the domain layer needs an abstraction to depend on, not a concrete persistence class

## Common False Positives

- **CQRS read-side repositories**: in CQRS architectures, query/read repositories that return DTOs or projections are correct by design -- the read side is separate from the aggregate write side.
- **Specification pattern**: repositories accepting Specification objects to filter results is a valid DDD pattern, not business logic in the repository -- the specification encapsulates the criteria.
- **Paging and sorting**: repository methods that accept paging parameters and return paginated results are infrastructure concerns, not domain logic.
- **Existence checks**: `repository.existsById(id)` returning a boolean is a common optimization that does not violate aggregate boundaries.
- **Event store**: repositories in event-sourced systems store events, not aggregate snapshots. Their interface differs from traditional repositories but is still valid DDD.
- **Spring Data / ActiveRecord generated queries**: framework-generated query methods like `findByEmail` are conventions of the tooling, not business logic in the repository.

## Severity Guidance

| Finding | Severity |
|---|---|
| Repository containing if/else business logic or domain rule calculations | Critical |
| Repository persisting child entity independently of aggregate root in separate transaction | Critical |
| Repository defined for a non-root entity that lives inside an aggregate | Important |
| Repository method returning DTO or raw database type instead of aggregate | Important |
| Repository method loading child entity without aggregate root | Important |
| Repository interface defined in infrastructure instead of domain layer | Important |
| Repository with complex multi-table projection query (belongs in read service) | Important |
| Generic repository used for all entities ignoring aggregate boundaries | Minor |
| Repository method with aggregation query (COUNT, SUM) for reporting | Minor |

## See Also

- `ddd-tactical-aggregates` -- repositories exist per aggregate root; aggregate boundaries determine repository scope
- `ddd-tactical-application-services` -- application services coordinate repository calls; business logic belongs in the domain, not the repository
- `principle-solid` -- Dependency Inversion: domain depends on repository interface (abstraction), infrastructure provides implementation
- `principle-separation-of-concerns` -- repositories handle persistence; domain objects handle business rules
- `antipattern-anemic-domain-model` -- when repositories return DTOs, it often indicates the domain model is too anemic to be worth loading
- `smell-feature-envy` -- repository methods with domain logic envy the domain model's responsibility

## Authoritative References

- [Eric Evans, *Domain-Driven Design* (2003), Chapter 6: "The Life Cycle of a Domain Object" -- Repositories](https://www.oreilly.com/library/view/domain-driven-design-tackling/0321125215/)
- [Vaughn Vernon, *Implementing Domain-Driven Design* (2013), Chapter 12: "Repositories"](https://www.oreilly.com/library/view/implementing-domain-driven-design/9780133039900/)
- [Martin Fowler, "Repository" pattern](https://www.martinfowler.com/eaaCatalog/repository.html)
- [Robert C. Martin, *Clean Architecture* (2017), Chapter 20: "Business Rules" -- keeping domain logic out of data access](https://www.oreilly.com/library/view/clean-architecture-a/9780134494272/)
