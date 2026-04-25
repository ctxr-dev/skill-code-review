---
id: aggregate-query
type: index
depth_role: subcategory
depth: 2
focus: "Aggregate boundary not aligned with true consistency boundary; Aggregate containing too many entities or value objects (god aggregate); Aggregate root exposing internal entities for direct external manipulation; Aggregate root not protecting its invariants on state change"
parents:
  - "../index.md"
shared_covers: []
entries:
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
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Aggregate Query

**Focus:** Aggregate boundary not aligned with true consistency boundary; Aggregate containing too many entities or value objects (god aggregate); Aggregate root exposing internal entities for direct external manipulation; Aggregate root not protecting its invariants on state change

## Children

| File | Type | Focus |
|------|------|-------|
| [arch-cqrs.md](arch-cqrs.md) | 📄 primary | Detect command handlers returning data, query handlers with side effects, read model consistency gaps, and command/query bus misconfiguration |
| [ddd-tactical-domain-events.md](ddd-tactical-domain-events.md) | 📄 primary | Detect domain events carrying too much data (god events), events not named in past tense, mutable events, and missing events for significant domain state changes. |
| [ddd-tactical-repositories.md](ddd-tactical-repositories.md) | 📄 primary | Detect repositories returning DTOs instead of aggregates, query methods bypassing aggregate roots, repositories containing business logic, and per-entity repositories instead of per-aggregate. |
| [ddd-tactical-specification.md](ddd-tactical-specification.md) | 📄 primary | Detect complex query conditions scattered across services instead of specification objects, non-composable specifications, and specifications placed in the wrong architectural layer. |
| [ddd-tactical-value-objects.md](ddd-tactical-value-objects.md) | 📄 primary | Detect value objects with accidental identity, mutable value objects, equality not based on attributes, value objects with setters, and primitives used where value objects should exist. |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
