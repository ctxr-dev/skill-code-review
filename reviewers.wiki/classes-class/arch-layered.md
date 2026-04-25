---
id: arch-layered
type: primary
depth_role: leaf
focus: Detect layer skipping, circular layer dependencies, and business logic misplaced in presentation or data layers
parents:
  - index.md
covers:
  - "Presentation layer importing data/persistence layer directly, bypassing domain/business layer"
  - "Circular dependency between layers (presentation imports domain, domain imports presentation)"
  - "Business logic (validation, rules, calculations) in controllers, views, or API handlers"
  - Business logic in repository, DAO, or data access classes
  - "Domain layer depending on presentation-specific types (HTTP, HTML, view models)"
  - Data layer depending on presentation layer types or modules
  - SQL or persistence logic mixed into service or domain classes
  - Layer boundary defined inconsistently -- some calls skip layers, others do not
  - "Cross-cutting concern (logging, auth) implemented differently per layer instead of as infrastructure"
  - "Missing domain/service layer -- controller directly orchestrating persistence calls"
tags:
  - layered-architecture
  - layers
  - presentation
  - domain
  - data
  - separation
  - architecture
activation:
  file_globs:
    - "**/controllers/**"
    - "**/views/**"
    - "**/services/**"
    - "**/domain/**"
    - "**/repositories/**"
    - "**/dao/**"
    - "**/data/**"
    - "**/presentation/**"
    - "**/business/**"
    - "**/api/**"
    - "**/handlers/**"
  keyword_matches:
    - controller
    - service
    - repository
    - dao
    - layer
    - handler
    - presenter
    - view
    - model
    - domain
  structural_signals:
    - layer_import_direction
    - controller_to_repository_bypass
    - circular_layer_dependency
source:
  origin: file
  path: arch-layered.md
  hash: "sha256:5288033ce8136aa2b4f677a6db5c42377bc2ce1b0ee05af771d0431ba48e0a3c"
---
# Layered Architecture

## When This Activates

Activates on diffs touching controllers, services, repositories, or other layer-organized code. Layered architecture organizes code into horizontal tiers (typically presentation, domain/business, data/persistence) where each layer may depend only on the layer directly below it. Layer skipping (presentation calling data directly) and upward dependencies (domain importing presentation) are the primary violations. Misplaced logic -- business rules in controllers or repositories -- is the most common symptom. This reviewer detects diff-visible signals of layer violations.

## Audit Surface

- [ ] Controller or view imports repository, DAO, or database module directly
- [ ] Controller contains business logic (conditional domain rules, calculations)
- [ ] Repository or DAO contains business rules (validation, eligibility, pricing)
- [ ] Domain service imports a controller, view, or HTTP module
- [ ] Data access layer imports presentation layer types
- [ ] Circular import between two layers
- [ ] SQL query or ORM call appears in a business service class
- [ ] Controller method with 50+ lines orchestrating multiple repository calls
- [ ] Presentation layer performs data transformation that encodes business rules
- [ ] Domain layer returns HTTP status codes or HTML fragments
- [ ] Missing service layer -- no class mediates between controller and repository
- [ ] Cross-cutting concern (auth, logging) reimplemented in each layer independently

## Detailed Checks

### Layer Skipping
<!-- activation: keywords=["controller", "handler", "route", "view", "repository", "dao", "database", "db", "sql", "import", "require"] -->

- [ ] **Presentation to data bypass**: flag controllers, route handlers, or view components that import repository, DAO, or database modules directly -- all data access must go through the domain/service layer
- [ ] **Presentation to infrastructure bypass**: flag controllers that directly call message queues, email services, or external APIs without a service layer intermediary
- [ ] **Missing service layer**: flag projects where controllers directly orchestrate multiple repository calls with no intervening service class -- the orchestration logic is the missing service layer
- [ ] **Inconsistent layer usage**: flag modules where some operations go through the service layer and others skip it -- inconsistency signals architectural erosion

### Upward and Circular Dependencies
<!-- activation: keywords=["import", "require", "from", "use", "using", "include", "circular", "cycle"] -->

- [ ] **Domain imports presentation**: flag domain or service layer files that import controller, view, HTTP, or presentation-specific types -- lower layers must not know about upper layers
- [ ] **Data imports presentation**: flag repository or data access files that import controller or view types -- this creates a dependency from the bottom layer to the top
- [ ] **Circular layer dependency**: flag circular imports between layers (e.g., service imports repository, repository imports service) -- this destroys the directional dependency graph
- [ ] **Domain returns presentation types**: flag service methods that return HTTP status codes, HTML, or framework-specific view models -- domain layer must return domain types

### Business Logic in Presentation Layer
<!-- activation: keywords=["controller", "handler", "route", "endpoint", "view", "component", "resolver", "if", "else", "switch", "validate", "calculate", "check"] -->

- [ ] **Domain rules in controller**: flag controllers with conditional logic that evaluates business rules (eligibility checks, pricing tiers, access rules) -- controllers should delegate to services
- [ ] **Fat controller**: flag controller methods exceeding 30 lines that orchestrate multiple calls, transform data, and apply business rules -- extract to a service
- [ ] **Validation beyond input format**: flag controllers performing domain validation (business rule constraints) rather than input format validation (type checking, required fields) -- domain validation belongs in the service or domain layer
- [ ] **Presentation-layer data transformation**: flag controllers or views that transform data using business rules (calculate totals, apply discounts, filter by eligibility) -- these are domain operations

### Business Logic in Data Layer
<!-- activation: keywords=["repository", "dao", "query", "sql", "find", "save", "delete", "persistence", "store", "fetch"] -->

- [ ] **Business rules in repository**: flag repository or DAO classes containing business validation, eligibility logic, or calculations -- repositories should perform data access only
- [ ] **Smart query as business logic**: flag repository methods with complex SQL WHERE clauses that encode business rules (status transitions, eligibility filters) rather than exposing a general query and letting the service apply rules
- [ ] **Repository orchestrating workflows**: flag repositories that call other repositories, services, or external systems -- repositories should access a single data source and return results

### SQL and Persistence Leakage
<!-- activation: keywords=["sql", "SELECT", "INSERT", "UPDATE", "DELETE", "query", "ORM", "session", "transaction", "connection"] -->

- [ ] **SQL in service layer**: flag SQL query strings, ORM session management, or raw database calls in service or domain classes -- persistence belongs in the data layer
- [ ] **Transaction management in presentation**: flag transaction begin/commit/rollback in controller or presentation code -- transaction boundaries belong in the service or data layer
- [ ] **Domain model as ORM entity**: flag domain model classes annotated with ORM decorators that are used directly in service logic -- consider separating the persistence model from the domain model

## Common False Positives

- **Thin CRUD applications**: in trivially small apps (single entity CRUD) with no business logic, a controller calling a repository directly is a pragmatic choice. Flag only when business rules exist alongside the direct call.
- **Active Record pattern**: frameworks using Active Record (Rails, Django, Laravel) intentionally merge domain and data access. Flag only when business logic escapes into controllers, not the pattern itself.
- **Query objects or specifications**: a controller passing a query specification to a repository is not layer skipping if the specification is a domain concept passed through the service layer.
- **Cross-cutting middleware**: authentication, logging, and metrics middleware that spans layers is an accepted cross-cutting pattern, not a layering violation.

## Severity Guidance

| Finding | Severity |
|---|---|
| Circular dependency between two layers | Critical |
| Controller containing complex business rules (eligibility, pricing, workflow) | Critical |
| Domain or service layer importing presentation modules | Critical |
| Controller importing repository/DAO directly, bypassing service layer | Important |
| Repository containing business validation or eligibility rules | Important |
| SQL or ORM session management in service/domain classes | Important |
| Fat controller (50+ lines orchestrating multiple repository calls) | Important |
| Missing service layer with non-trivial business operations | Minor |
| Inconsistent layer usage (some paths skip, some do not) | Minor |
| Transaction management in presentation layer | Minor |

## See Also

- `arch-clean-architecture` -- clean architecture adds explicit ring structure on top of layering principles
- `principle-solid` -- Single Responsibility: each layer has one reason to change; Dependency Inversion: layers depend on abstractions
- `principle-separation-of-concerns` -- layers are the primary mechanism for separating presentation, business, and data concerns
- `antipattern-big-ball-of-mud` -- systematic layer violations degrade a layered architecture into a big ball of mud
- `principle-coupling-cohesion` -- proper layering maximizes cohesion within layers and minimizes coupling between them

## Authoritative References

- [Martin Fowler, *Patterns of Enterprise Application Architecture* (2002), Chapter 1: "Layering"](https://martinfowler.com/eaaCatalog/)
- [Eric Evans, *Domain-Driven Design* (2003), Chapter 4: "Isolating the Domain" -- Layered Architecture](https://www.oreilly.com/library/view/domain-driven-design-tackling/0321125215/)
- [Frank Buschmann et al., *Pattern-Oriented Software Architecture Vol. 1* (1996), Chapter 2: "Layers"](https://www.wiley.com/en-us/Pattern+Oriented+Software+Architecture+Volume+1-p-9780471958697)
- [Robert C. Martin, *Clean Architecture* (2017), Chapter 22 -- layers as a specific case of the dependency rule](https://www.oreilly.com/library/view/clean-architecture-a/9780134494272/)
