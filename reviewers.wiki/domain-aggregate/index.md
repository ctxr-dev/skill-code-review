---
id: domain-aggregate
type: index
depth_role: subcategory
depth: 1
focus: "API gateway containing business logic instead of pure routing and composition; Abbreviations or acronyms that obscure domain meaning; Aggregate boundary not aligned with true consistency boundary; Aggregate containing too many entities or value objects (god aggregate)"
parents:
  - "../index.md"
shared_covers: []
entries:
  - id: aggregate-query
    file: "aggregate-query/index.md"
    type: index
    focus: "Aggregate boundary not aligned with true consistency boundary; Aggregate containing too many entities or value objects (god aggregate); Aggregate root exposing internal entities for direct external manipulation; Aggregate root not protecting its invariants on state change"
  - id: api-gateway-and-bff-composition
    file: api-gateway-and-bff-composition.md
    type: primary
    focus: Detect API gateway and BFF anti-patterns including business logic in the gateway, missing gateway-level rate limiting, aggregation timeout issues, and incorrect auth delegation
    tags:
      - api-gateway
      - bff
      - backend-for-frontend
      - gateway
      - composition
      - aggregation
      - routing
      - rate-limiting
      - authentication
      - authorization
      - proxy
      - frontend
      - api
      - architecture
  - id: api-graphql
    file: api-graphql.md
    type: primary
    focus: "Detect N+1 resolver queries, unbounded query depth/complexity, overfetching in schema design, missing per-field authorization, and introspection enabled in production"
    tags:
      - graphql
      - api
      - resolver
      - n+1
      - dataloader
      - query-depth
      - query-complexity
      - authorization
      - introspection
      - schema-design
  - id: arch-clean-architecture
    file: arch-clean-architecture.md
    type: primary
    focus: Detect dependency rule violations where inner rings import outer rings, use cases contain framework code, or entities depend on infrastructure
    tags:
      - clean-architecture
      - dependency-rule
      - use-case
      - entity
      - ports
      - rings
      - architecture
  - id: ddd-tactical-application-services
    type: primary
    focus: Detect application services containing domain logic, application services directly accessing infrastructure, and application services performing orchestration that belongs in domain services.
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
    file: "../classes-class/ddd-tactical-application-services.md"
  - id: ddd-ubiquitous-language
    file: ddd-ubiquitous-language.md
    type: primary
    focus: Detect code names that diverge from domain terminology, inconsistent naming across bounded contexts, technical jargon where domain language belongs, and glossary drift between code and domain experts.
    tags:
      - ubiquitous-language
      - ddd
      - naming
      - domain-driven-design
      - bounded-context
      - glossary
      - readability
  - id: pattern-eip-transformation
    file: pattern-eip-transformation.md
    type: primary
    focus: Detect misuse, absence, and over-engineering of Enterprise Integration message transformation patterns -- mapping, enrichment, normalization, and canonical data models.
    tags:
      - eip
      - transformation
      - mapping
      - enricher
      - normalizer
      - canonical
      - translator
      - converter
      - enterprise-integration
  - id: principle-separation-of-concerns
    file: principle-separation-of-concerns.md
    type: primary
    focus: Ensure distinct concerns live in distinct modules with no cross-contamination
    tags:
      - separation-of-concerns
      - architecture
      - layering
      - modularity
      - single-responsibility
      - clean-architecture
  - id: principle-tell-dont-ask
    file: principle-tell-dont-ask.md
    type: primary
    focus: Ensure behavior lives with the data it operates on, eliminating feature envy, getter-chain decision-making, and anemic domain models.
    tags:
      - tell-dont-ask
      - feature-envy
      - anemic-domain
      - law-of-demeter
      - encapsulation
      - behavior-colocation
children:
  - "aggregate-query/index.md"
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Domain Aggregate

**Focus:** API gateway containing business logic instead of pure routing and composition; Abbreviations or acronyms that obscure domain meaning; Aggregate boundary not aligned with true consistency boundary; Aggregate containing too many entities or value objects (god aggregate)

## Children

| File | Type | Focus |
|------|------|-------|
| [api-gateway-and-bff-composition.md](api-gateway-and-bff-composition.md) | 📄 primary | Detect API gateway and BFF anti-patterns including business logic in the gateway, missing gateway-level rate limiting, aggregation timeout issues, and incorrect auth delegation |
| [api-graphql.md](api-graphql.md) | 📄 primary | Detect N+1 resolver queries, unbounded query depth/complexity, overfetching in schema design, missing per-field authorization, and introspection enabled in production |
| [arch-clean-architecture.md](arch-clean-architecture.md) | 📄 primary | Detect dependency rule violations where inner rings import outer rings, use cases contain framework code, or entities depend on infrastructure |
| [ddd-ubiquitous-language.md](ddd-ubiquitous-language.md) | 📄 primary | Detect code names that diverge from domain terminology, inconsistent naming across bounded contexts, technical jargon where domain language belongs, and glossary drift between code and domain experts. |
| [pattern-eip-transformation.md](pattern-eip-transformation.md) | 📄 primary | Detect misuse, absence, and over-engineering of Enterprise Integration message transformation patterns -- mapping, enrichment, normalization, and canonical data models. |
| [principle-separation-of-concerns.md](principle-separation-of-concerns.md) | 📄 primary | Ensure distinct concerns live in distinct modules with no cross-contamination |
| [principle-tell-dont-ask.md](principle-tell-dont-ask.md) | 📄 primary | Ensure behavior lives with the data it operates on, eliminating feature envy, getter-chain decision-making, and anemic domain models. |
| [aggregate-query/index.md](aggregate-query/index.md) | 📁 index | Aggregate boundary not aligned with true consistency boundary; Aggregate containing too many entities or value objects (god aggregate); Aggregate root exposing internal entities for direct external manipulation; Aggregate root not protecting its invariants on state change |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
