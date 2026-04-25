---
id: ddd-strategic-bounded-contexts
type: primary
depth_role: leaf
focus: "Detect bounded context boundary violations -- importing another context's internals, shared kernel growing unbounded, missing anti-corruption layers, and coupling that erodes context autonomy."
parents:
  - index.md
covers:
  - "Direct import of another bounded context's internal classes or modules"
  - Shared kernel that has grown beyond its originally scoped surface area
  - Missing anti-corruption layer between contexts with different models
  - "Domain model from one context leaking into another context's domain layer"
  - Single database schema shared across bounded contexts without isolation
  - Circular dependencies between bounded contexts
  - Context boundary not aligned with team ownership or deployment unit
  - Infrastructure coupling masquerading as domain integration
  - Integration point between bounded contexts with no anti-corruption layer
  - Upstream context model leaking directly into downstream context domain
  - Conformist pattern adopted implicitly rather than as an explicit architectural decision
  - Shared kernel evolving without coordinated agreement between contexts
  - Published language missing at integration boundary
  - Open Host Service exposing internal model instead of a curated API
  - "Customer/Supplier relationship without negotiated contracts"
  - Partnership contexts evolving independently without coordination
tags:
  - bounded-context
  - ddd
  - strategic-design
  - context-boundary
  - shared-kernel
  - anti-corruption-layer
  - architecture
  - context-mapping
  - acl
  - integration
  - published-language
  - open-host-service
aliases:
  - ddd-context-mapping
activation:
  file_globs:
    - "**/*context*"
    - "**/*module*"
    - "**/*bounded*"
    - "**/*shared*"
    - "**/*kernel*"
    - "**/*integration*"
    - "**/*acl*"
    - "**/*anticorruption*"
  keyword_matches:
    - context
    - module
    - bounded
    - shared
    - kernel
    - import
    - from
    - require
    - namespace
    - package
  structural_signals:
    - cross_package_import
    - shared_module_growth
    - circular_dependency
source:
  origin: file
  path: ddd-strategic-bounded-contexts.md
  hash: "sha256:6e26e9defdd7de704403420a40874bc8eb1bf4204f4ada1859e76927c000926b"
---
# Strategic Bounded Contexts

## When This Activates

Activates on diffs involving imports across module or package boundaries, changes to shared libraries, or modifications that touch code in multiple bounded contexts. A bounded context is a linguistic and model boundary: within it, every term has one precise meaning and the model is internally consistent. When code crosses these boundaries without explicit integration patterns (anti-corruption layers, published language, or well-scoped shared kernels), models bleed into each other, creating the Big Ball of Mud that DDD exists to prevent. The most common violation is a direct import from another context's internal package, treating it as a convenient library rather than a separate model.

## Audit Surface

- [ ] Import statement reaching into another bounded context's internal package
- [ ] Class from context A used directly in context B's domain logic without translation
- [ ] Shared library or module growing in scope with types from multiple contexts
- [ ] Database table or schema referenced by code in two or more bounded contexts
- [ ] Event or message contract defined in a shared kernel that is context-specific
- [ ] Circular import chain between two bounded context packages
- [ ] Domain entity from one context stored as a field (not an ID) in another context's entity
- [ ] Service in context A calling an internal (non-public) method of context B
- [ ] Migration or schema file touching tables owned by different contexts
- [ ] Shared utility module containing domain logic rather than pure infrastructure
- [ ] Test in one context importing and constructing domain objects from another context
- [ ] Package or namespace structure that does not clearly delineate context boundaries

## Detailed Checks

### Cross-Context Import Violations
<!-- activation: keywords=["import", "from", "require", "using", "include", "namespace", "package"] -->

- [ ] **Internal package import**: flag imports like `from orders.internal.pricing import PriceCalculator` from the shipping context -- internal packages are private to their context
- [ ] **Deep path import**: flag imports that navigate deep into another context's directory structure (`../../billing/domain/invoice.py`) instead of using a published API
- [ ] **Domain class reuse**: flag direct use of another context's entity, value object, or aggregate in a different context's domain layer -- each context should own its own model
- [ ] **Circular dependency**: flag bidirectional imports between two bounded context packages -- this indicates a missing shared kernel or incorrect boundary placement

### Shared Kernel Scope Creep
<!-- activation: keywords=["shared", "kernel", "common", "core", "lib", "util", "base"] -->

- [ ] **Growing shared kernel**: flag shared/common modules that receive new domain types with each PR -- a shared kernel should be small, stable, and co-owned
- [ ] **Context-specific types in shared kernel**: flag types that belong to a single context placed in a shared module for convenience -- only genuinely shared concepts belong in the kernel
- [ ] **Shared kernel without explicit ownership**: flag shared modules with no documented ownership or co-evolution agreement between the consuming teams
- [ ] **Domain logic in utility modules**: flag business rules in `common/utils` or `shared/helpers` -- domain logic must live in a bounded context, not in infrastructure

### Database and Schema Coupling
<!-- activation: keywords=["table", "schema", "migration", "database", "db", "sql", "entity", "model", "column"] -->

- [ ] **Shared table across contexts**: flag when code in two bounded contexts reads from or writes to the same database table -- each context should own its data store or use views/APIs
- [ ] **Cross-context foreign keys**: flag foreign key constraints between tables owned by different contexts -- use eventual consistency or ID references instead
- [ ] **Single migration file touching multiple context schemas**: flag migration files that alter tables belonging to different bounded contexts in the same transaction

### Boundary Alignment
<!-- activation: keywords=["module", "package", "namespace", "directory", "folder", "structure", "boundary"] -->

- [ ] **Missing context boundary in code structure**: flag codebases where domain code for multiple contexts lives in a flat structure without clear package or module separation
- [ ] **Context boundary misaligned with deployment**: flag when a bounded context cannot be independently deployed because it shares a binary or deployment unit with another context's code
- [ ] **No public API surface**: flag bounded contexts that expose all classes publicly instead of defining a narrow public interface for other contexts to consume

## Common False Positives

- **Infrastructure and cross-cutting concerns**: logging, metrics, authentication, serialization frameworks are legitimately shared across contexts -- they are infrastructure, not domain coupling.
- **Published language / API contracts**: DTOs, protobuf definitions, or API schemas explicitly designed as integration contracts between contexts are not boundary violations -- they are the correct integration pattern.
- **Monolith in early decomposition**: a monolith being gradually decomposed may intentionally have blurred boundaries during migration. Flag only if new code deepens the coupling.
- **Shared value objects**: truly universal value objects like `Money`, `EmailAddress`, `DateRange` may legitimately live in a shared kernel if both contexts agree on their semantics.
- **Event schemas in event store**: event schemas published for consumption are integration contracts, not internal model leakage.

## Severity Guidance

| Finding | Severity |
|---|---|
| Circular dependency between two bounded context packages | Critical |
| Domain entity from context A used directly in context B's aggregate with no ACL | Critical |
| Shared database table written to by two bounded contexts | Critical |
| Import reaching into another context's internal package | Important |
| Shared kernel growing with context-specific types | Important |
| Migration touching tables owned by different contexts | Important |
| Test constructing domain objects from another context | Minor |
| Package structure does not clearly delineate context boundaries | Minor |

## See Also

- `ddd-context-mapping` -- once boundaries are established, context mapping defines how contexts integrate
- `ddd-ubiquitous-language` -- each bounded context maintains its own ubiquitous language; cross-context naming divergence is expected and correct
- `antipattern-anemic-domain-model` -- shared kernels with only data types and no behavior indicate anemic modeling
- `principle-solid` -- Dependency Inversion applies at the context level: depend on published interfaces, not internal concretions
- `principle-encapsulation` -- bounded context encapsulation is the macro-level application of information hiding

## Authoritative References

- [Eric Evans, *Domain-Driven Design* (2003), Chapter 14: "Maintaining Model Integrity" -- Bounded Context, Context Map](https://www.oreilly.com/library/view/domain-driven-design-tackling/0321125215/)
- [Vaughn Vernon, *Implementing Domain-Driven Design* (2013), Chapter 2: "Domains, Subdomains, and Bounded Contexts"](https://www.oreilly.com/library/view/implementing-domain-driven-design/9780133039900/)
- [Martin Fowler, "BoundedContext" (2014)](https://www.martinfowler.com/bliki/BoundedContext.html)
- [Nick Tune, *Patterns, Principles, and Practices of Domain-Driven Design* (2015), Part III: Strategic Design](https://www.wiley.com/en-us/Patterns%2C+Principles%2C+and+Practices+of+Domain+Driven+Design-p-9781118714706)
