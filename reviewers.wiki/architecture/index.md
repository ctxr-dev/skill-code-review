---
id: architecture
type: index
depth_role: subcategory
depth: 1
focus: "architecture: Detect cell boundary violations, missing cell-level isolation, uncontained blast radius, and missing cell routing; Detect dependency rule violations where inner rings import outer rings, use cases contain framework code, or..."
parents:
  - "../index.md"
shared_covers: []
tags:
  - acl
  - adapter
  - aggregate
  - aggregate-root
  - anemic-domain
  - anemic-domain-model
  - anti-corruption-layer
  - anti-pattern
  - application-service
  - architecture
  - behavioral-pattern
  - big-ball-of-mud
  - blast-radius
  - boundaries
  - bounded-context
  - caching
  - cell
  - cell-based
  - chatty
  - clean-architecture
generator: "skill-llm-wiki/v1"
entries:
  - id: arch-cell-based
    file: arch-cell-based.md
    type: primary
    focus: Detect cell boundary violations, missing cell-level isolation, uncontained blast radius, and missing cell routing
    tags:
      - cell-based
      - cell
      - isolation
      - blast-radius
      - routing
      - architecture
      - resilience
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
  - id: arch-cqrs
    file: arch-cqrs.md
    type: primary
    focus: "Detect command handlers returning data, query handlers with side effects, read model consistency gaps, and command/query bus misconfiguration"
    tags:
      - cqrs
      - command
      - query
      - read-model
      - write-model
      - separation
      - architecture
      - command-query
      - projection
      - event-driven
      - microservices
  - id: arch-hexagonal-ports-adapters
    file: arch-hexagonal-ports-adapters.md
    type: primary
    focus: Detect adapters containing business logic, ports not defined as interfaces, and direct infrastructure access bypassing ports
    tags:
      - hexagonal
      - ports-and-adapters
      - port
      - adapter
      - architecture
      - dependency-inversion
      - infrastructure
      - structural-pattern
      - design-patterns
      - wrapper
      - interface-translation
      - integration
  - id: arch-layered
    file: arch-layered.md
    type: primary
    focus: Detect layer skipping, circular layer dependencies, and business logic misplaced in presentation or data layers
    tags:
      - layered-architecture
      - layers
      - presentation
      - domain
      - data
      - separation
      - architecture
  - id: arch-micro-frontends-module-federation
    file: arch-micro-frontends-module-federation.md
    type: primary
    focus: Detect shared state between micro-frontends, version conflicts, CSS leaking across boundaries, and performance overhead from multiple bundles
    tags:
      - micro-frontends
      - module-federation
      - CSS-isolation
      - shared-state
      - performance
      - architecture
  - id: arch-modular-monolith
    file: arch-modular-monolith.md
    type: primary
    focus: "Detect module boundary violations including direct access to another module's internals, missing public API surfaces, and shared database tables between modules"
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
  - id: arch-multi-tenant-saas
    file: arch-multi-tenant-saas.md
    type: primary
    focus: Detect tenant data isolation failures, missing tenant context propagation, cross-tenant query leaks, and tenant-unaware caching
    tags:
      - multi-tenant
      - SaaS
      - tenant-isolation
      - data-leak
      - security
      - caching
      - architecture
  - id: arch-state-machines
    file: arch-state-machines.md
    type: primary
    focus: Detect implicit state transitions, missing states, invalid transitions not rejected, and state explosion without hierarchical decomposition
    tags:
      - state-machine
      - FSM
      - state
      - transition
      - guard
      - statechart
      - architecture
      - correctness
      - behavioral-pattern
      - design-patterns
      - fsm
      - lifecycle
      - workflow
  - id: ddd-strategic-bounded-contexts
    file: ddd-strategic-bounded-contexts.md
    type: primary
    focus: "Detect bounded context boundary violations -- importing another context's internals, shared kernel growing unbounded, missing anti-corruption layers, and coupling that erodes context autonomy."
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
  - id: ddd-tactical-application-services
    file: ddd-tactical-application-services.md
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
  - id: ddd-tactical-domain-events
    file: ddd-tactical-domain-events.md
    type: primary
    focus: "Detect domain events carrying too much data (god events), events not named in past tense, mutable events, and missing events for significant domain state changes."
    tags:
      - domain-events
      - ddd
      - tactical-design
      - event-driven
      - cqrs
      - event-sourcing
      - domain-driven-design
  - id: ddd-tactical-entities
    file: ddd-tactical-entities.md
    type: primary
    focus: "Detect entities without identity, entity equality by value instead of ID, entities exposing state without behavior, and entities managing other entities' lifecycle."
    tags:
      - entity
      - ddd
      - tactical-design
      - identity
      - equality
      - lifecycle
      - domain-driven-design
  - id: ddd-tactical-repositories
    file: ddd-tactical-repositories.md
    type: primary
    focus: Detect repositories returning DTOs instead of aggregates, query methods bypassing aggregate roots, repositories containing business logic, and per-entity repositories instead of per-aggregate.
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
  - id: ddd-tactical-specification
    file: ddd-tactical-specification.md
    type: primary
    focus: Detect complex query conditions scattered across services instead of specification objects, non-composable specifications, and specifications placed in the wrong architectural layer.
    tags:
      - specification
      - ddd
      - tactical-design
      - query
      - criteria
      - predicate
      - composable
      - domain-driven-design
  - id: ddd-tactical-value-objects
    file: ddd-tactical-value-objects.md
    type: primary
    focus: Detect value objects with accidental identity, mutable value objects, equality not based on attributes, value objects with setters, and primitives used where value objects should exist.
    tags:
      - value-object
      - ddd
      - tactical-design
      - immutability
      - primitive-obsession
      - equality
      - domain-driven-design
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
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Architecture

**Focus:** architecture: Detect cell boundary violations, missing cell-level isolation, uncontained blast radius, and missing cell routing; Detect dependency rule violations where inner rings import outer rings, use cases contain framework code, or...

## Children

| File | Type | Focus |
|------|------|-------|
| [arch-cell-based.md](arch-cell-based.md) | 📄 primary | Detect cell boundary violations, missing cell-level isolation, uncontained blast radius, and missing cell routing |
| [arch-clean-architecture.md](arch-clean-architecture.md) | 📄 primary | Detect dependency rule violations where inner rings import outer rings, use cases contain framework code, or entities depend on infrastructure |
| [arch-cqrs.md](arch-cqrs.md) | 📄 primary | Detect command handlers returning data, query handlers with side effects, read model consistency gaps, and command/query bus misconfiguration |
| [arch-hexagonal-ports-adapters.md](arch-hexagonal-ports-adapters.md) | 📄 primary | Detect adapters containing business logic, ports not defined as interfaces, and direct infrastructure access bypassing ports |
| [arch-layered.md](arch-layered.md) | 📄 primary | Detect layer skipping, circular layer dependencies, and business logic misplaced in presentation or data layers |
| [arch-micro-frontends-module-federation.md](arch-micro-frontends-module-federation.md) | 📄 primary | Detect shared state between micro-frontends, version conflicts, CSS leaking across boundaries, and performance overhead from multiple bundles |
| [arch-modular-monolith.md](arch-modular-monolith.md) | 📄 primary | Detect module boundary violations including direct access to another module's internals, missing public API surfaces, and shared database tables between modules |
| [arch-multi-tenant-saas.md](arch-multi-tenant-saas.md) | 📄 primary | Detect tenant data isolation failures, missing tenant context propagation, cross-tenant query leaks, and tenant-unaware caching |
| [arch-state-machines.md](arch-state-machines.md) | 📄 primary | Detect implicit state transitions, missing states, invalid transitions not rejected, and state explosion without hierarchical decomposition |
| [ddd-strategic-bounded-contexts.md](ddd-strategic-bounded-contexts.md) | 📄 primary | Detect bounded context boundary violations -- importing another context's internals, shared kernel growing unbounded, missing anti-corruption layers, and coupling that erodes context autonomy. |
| [ddd-tactical-application-services.md](ddd-tactical-application-services.md) | 📄 primary | Detect application services containing domain logic, application services directly accessing infrastructure, and application services performing orchestration that belongs in domain services. |
| [ddd-tactical-domain-events.md](ddd-tactical-domain-events.md) | 📄 primary | Detect domain events carrying too much data (god events), events not named in past tense, mutable events, and missing events for significant domain state changes. |
| [ddd-tactical-entities.md](ddd-tactical-entities.md) | 📄 primary | Detect entities without identity, entity equality by value instead of ID, entities exposing state without behavior, and entities managing other entities' lifecycle. |
| [ddd-tactical-repositories.md](ddd-tactical-repositories.md) | 📄 primary | Detect repositories returning DTOs instead of aggregates, query methods bypassing aggregate roots, repositories containing business logic, and per-entity repositories instead of per-aggregate. |
| [ddd-tactical-specification.md](ddd-tactical-specification.md) | 📄 primary | Detect complex query conditions scattered across services instead of specification objects, non-composable specifications, and specifications placed in the wrong architectural layer. |
| [ddd-tactical-value-objects.md](ddd-tactical-value-objects.md) | 📄 primary | Detect value objects with accidental identity, mutable value objects, equality not based on attributes, value objects with setters, and primitives used where value objects should exist. |
| [ddd-ubiquitous-language.md](ddd-ubiquitous-language.md) | 📄 primary | Detect code names that diverge from domain terminology, inconsistent naming across bounded contexts, technical jargon where domain language belongs, and glossary drift between code and domain experts. |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
