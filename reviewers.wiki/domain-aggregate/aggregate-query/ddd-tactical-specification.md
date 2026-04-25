---
id: ddd-tactical-specification
type: primary
depth_role: leaf
focus: Detect complex query conditions scattered across services instead of specification objects, non-composable specifications, and specifications placed in the wrong architectural layer.
parents:
  - index.md
covers:
  - Complex business query conditions duplicated across multiple service methods
  - Inline boolean expressions encoding domain selection criteria instead of named specifications
  - "Specification objects that cannot be composed (AND, OR, NOT)"
  - "Specification logic in the infrastructure/repository layer instead of the domain layer"
  - Query predicates that mix domain criteria with persistence concerns
  - Domain selection criteria expressed as raw SQL or ORM query methods instead of specifications
  - Specification class tightly coupled to a persistence framework
  - Hard-coded filter conditions that should be parameterized specifications
tags:
  - specification
  - ddd
  - tactical-design
  - query
  - criteria
  - predicate
  - composable
  - domain-driven-design
activation:
  file_globs:
    - "**/*spec*"
    - "**/*Spec*"
    - "**/*specification*"
    - "**/*criteria*"
    - "**/*Criteria*"
    - "**/*predicate*"
    - "**/*filter*"
    - "**/*query*"
    - "**/*rule*"
    - "**/*service*"
  keyword_matches:
    - specification
    - Specification
    - criteria
    - Criteria
    - predicate
    - filter
    - where
    - condition
    - match
    - satisfy
    - isSatisfiedBy
    - eligible
    - qualifies
  structural_signals:
    - complex_boolean_expression
    - repeated_filter_condition
    - query_predicate
source:
  origin: file
  path: ddd-tactical-specification.md
  hash: "sha256:5030d2320d03cb3775059c30c226d655154f3d5c4d07f62ac26a228f9021c49d"
---
# Tactical Specification

## When This Activates

Activates on diffs involving service methods with complex filtering logic, criteria or specification classes, repository query methods with inline business rules, or any code that selects domain objects based on business conditions. The Specification pattern encapsulates a business rule that determines whether an object satisfies a criterion. Instead of scattering `if (order.status == ACTIVE && order.total > threshold && customer.isVip())` across services and repositories, you create a named, composable specification: `new ActiveHighValueVipOrderSpec()`. Specifications live in the domain layer, can be combined with AND/OR/NOT, and can be used for both in-memory filtering and query generation.

## Audit Surface

- [ ] Service method with 3+ conditions in a single if/where clause filtering domain objects
- [ ] Same filtering condition (status check, date range, eligibility rule) repeated in 2+ locations
- [ ] Specification or criteria class that cannot be combined with other specifications
- [ ] Specification class importing persistence framework types (JPA Criteria, SQL builders)
- [ ] Repository method with complex WHERE clause encoding business rules
- [ ] Lambda or predicate filtering domain collections with inline business logic
- [ ] Hard-coded magic values in filter conditions (status == 'ACTIVE' && age > 30)
- [ ] Domain filtering criteria expressed differently in code and in SQL for the same concept
- [ ] Service method accepting multiple boolean parameters to configure filtering behavior
- [ ] Query method name encoding business rule (findActiveOverdueOrdersForVipCustomers) instead of accepting a specification

## Detailed Checks

### Scattered Query Conditions
<!-- activation: keywords=["if", "filter", "where", "find", "select", "match", "&&", "||", "and", "or", "status", "active", "eligible", "overdue"] -->

- [ ] **Duplicated filter logic**: flag the same business filtering condition (e.g., `status == ACTIVE && !expired && total > threshold`) appearing in 2+ service or repository methods -- extract to a named specification
- [ ] **Complex inline predicate**: flag service methods with 3+ conjunctive or disjunctive conditions filtering domain objects inline -- this domain selection criterion deserves a name
- [ ] **Magic values in conditions**: flag hard-coded values in filter expressions (`age > 65`, `balance < 0`, `status == "PENDING"`) that represent business rules -- encapsulate in a specification with a domain-meaningful name
- [ ] **Boolean parameter explosion**: flag methods accepting 3+ boolean flags to configure filtering behavior (`findOrders(boolean active, boolean overdue, boolean vip)`) -- use composable specifications instead
- [ ] **Filter logic divergence**: flag when the same business criterion is expressed differently in code (in-memory filter) and in a query (SQL WHERE clause) -- a specification should be the single source of truth for both

### Specification Composability
<!-- activation: keywords=["specification", "Specification", "spec", "Spec", "criteria", "Criteria", "and", "or", "not", "combine", "compose"] -->

- [ ] **Non-composable specification**: flag specification classes with no mechanism for AND/OR/NOT composition -- specifications should be combinable to build complex criteria from simple ones
- [ ] **God specification**: flag a single specification class with 5+ conditions that should be decomposed into smaller, composable specifications (`OverdueSpec AND HighValueSpec AND VipCustomerSpec`)
- [ ] **Specification returning non-boolean**: flag specification methods that return complex objects instead of a boolean `isSatisfiedBy` result -- specifications evaluate to true/false
- [ ] **Specification with side effects**: flag specification `isSatisfiedBy` methods that modify state -- specifications must be pure predicates with no side effects

### Layer Placement
<!-- activation: keywords=["domain", "infrastructure", "repository", "persistence", "JPA", "Hibernate", "SQL", "query", "criteria", "import"] -->

- [ ] **Specification in infrastructure layer**: flag specification classes defined in persistence or infrastructure packages -- specifications express domain rules and belong in the domain layer
- [ ] **Persistence-coupled specification**: flag specifications that import JPA Criteria API, Hibernate, SQL builder, or ORM-specific types -- the domain specification should be persistence-agnostic; a separate adapter translates it to queries
- [ ] **Repository-embedded business rules**: flag repository methods whose query logic encodes business criteria that should be specifications passed in as parameters
- [ ] **Specification in presentation layer**: flag specification-like logic in controllers or API handlers -- business filtering criteria belong in the domain, invoked by the application service

### Missing Specification Opportunities
<!-- activation: keywords=["eligible", "qualifies", "satisfies", "matches", "applies", "valid", "active", "overdue", "expired", "pending", "approved"] -->

- [ ] **Named method hiding specification**: flag methods like `isEligibleForDiscount(order)` on a service class that could be a reusable specification object -- `DiscountEligibilitySpec.isSatisfiedBy(order)`
- [ ] **Query method per business rule**: flag repositories with methods like `findActiveOverdueOrders()`, `findVipCustomerOrders()`, `findHighValuePendingOrders()` -- each encodes a business rule that should be a composable specification passed to a generic `findAll(spec)` method
- [ ] **Hardcoded report filters**: flag reporting or analytics code with inline business rule conditions that duplicate domain filtering logic from elsewhere in the codebase

## Common False Positives

- **Simple single-condition filters**: a single `status == ACTIVE` check does not warrant a specification object -- the pattern is for complex or reusable business criteria.
- **Infrastructure query optimization**: some query optimizations require persistence-specific logic (index hints, query plans). These are separate from domain specifications and may legitimately live in the repository.
- **CQRS read-side queries**: read model queries may use specialized query objects or projections that are not domain specifications -- they serve the read side, which has different design constraints.
- **Framework conventions**: Spring Data Specification, JPA Criteria, or Django Q objects are tools for implementing the pattern. Using these framework types in the repository implementation (not the domain) is the adapter, not a violation.
- **Trivial CRUD filtering**: simple pagination, sorting, or basic field-equality lookups do not need specification objects -- reserve the pattern for genuine business selection criteria.
- **Functional-style predicates**: in functional codebases, composable predicate functions serve the same role as specification objects. `filterBy(isActive.and(isOverdue))` is a valid functional specification.

## Severity Guidance

| Finding | Severity |
|---|---|
| Same business filtering condition with 3+ criteria duplicated in 3+ locations | Critical |
| Specification class coupled to persistence framework (imports JPA/Hibernate/SQL) in domain layer | Critical |
| Complex inline business predicate (4+ conditions) with magic values and no named abstraction | Important |
| Specification class with no composition mechanism (AND/OR/NOT) | Important |
| Repository method encoding business rules in WHERE clause instead of accepting specification | Important |
| Business filtering logic duplicated between in-memory filter and SQL query | Important |
| Service method accepting 3+ boolean parameters to configure filtering | Minor |
| Single business criterion not yet extracted to specification but used in only one place | Minor |

## See Also

- `ddd-tactical-repositories` -- repositories should accept specifications as parameters for flexible querying without hardcoded business rules
- `ddd-tactical-application-services` -- application services compose and pass specifications to repositories; they do not implement filter logic inline
- `ddd-ubiquitous-language` -- specifications should be named using domain vocabulary (OverdueOrderSpec, VipCustomerCriteria)
- `principle-solid` -- OCP: new filtering criteria should be new specification classes, not modifications to existing query methods; SRP: each specification encapsulates one business rule
- `principle-dry-kiss-yagni` -- DRY: duplicated filter conditions across services violate Don't Repeat Yourself
- `smell-duplicate-code` -- scattered identical filter conditions are a form of duplicate code
- `antipattern-magic-numbers-strings` -- hard-coded values in filter conditions are magic numbers/strings

## Authoritative References

- [Eric Evans, *Domain-Driven Design* (2003), Chapter 9: "Making Implicit Concepts Explicit" -- Specification](https://www.oreilly.com/library/view/domain-driven-design-tackling/0321125215/)
- [Vaughn Vernon, *Implementing Domain-Driven Design* (2013), Chapter 14: "Application" -- using specifications for queries](https://www.oreilly.com/library/view/implementing-domain-driven-design/9780133039900/)
- [Martin Fowler, "Specification" pattern](https://www.martinfowler.com/apsupp/spec.pdf)
- [Eric Evans and Martin Fowler, "Specifications" (2005)](https://www.martinfowler.com/apsupp/spec.pdf)
