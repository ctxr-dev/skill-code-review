---
id: context-module
type: index
depth_role: subcategory
depth: 2
focus: "Afferent coupling (Ca): how many modules depend on this one; Business logic embedded in API handlers, CLI commands, or UI components; Circular dependencies between bounded contexts; Circular dependencies between packages or modules"
parents:
  - "../index.md"
shared_covers: []
tags:
  - architecture
entries:
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
  - id: principle-coupling-cohesion
    file: principle-coupling-cohesion.md
    type: primary
    focus: Evaluate module dependency structure for excessive coupling and insufficient cohesion
    tags:
      - coupling
      - cohesion
      - dependencies
      - architecture
      - modularity
      - solid
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Context Module

**Focus:** Afferent coupling (Ca): how many modules depend on this one; Business logic embedded in API handlers, CLI commands, or UI components; Circular dependencies between bounded contexts; Circular dependencies between packages or modules

## Children

| File | Type | Focus |
|------|------|-------|
| [arch-modular-monolith.md](arch-modular-monolith.md) | 📄 primary | Detect module boundary violations including direct access to another module's internals, missing public API surfaces, and shared database tables between modules |
| [ddd-strategic-bounded-contexts.md](ddd-strategic-bounded-contexts.md) | 📄 primary | Detect bounded context boundary violations -- importing another context's internals, shared kernel growing unbounded, missing anti-corruption layers, and coupling that erodes context autonomy. |
| [principle-coupling-cohesion.md](principle-coupling-cohesion.md) | 📄 primary | Evaluate module dependency structure for excessive coupling and insufficient cohesion |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
