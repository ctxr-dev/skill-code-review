---
id: classes-class
type: index
depth_role: subcategory
depth: 1
focus: "4+ layers between a request and the actual work (controller-service-manager-handler-repository-adapter); API contracts that leak internal implementation details forcing tight version coupling; API endpoint handlers with identical structure differing only in the entity name; Abstract base class with a single concrete subclass"
parents:
  - "../index.md"
shared_covers: []
entries:
  - id: antipattern-chatty-coupling
    file: antipattern-chatty-coupling.md
    type: primary
    focus: Detect excessive fine-grained interactions between components that should communicate through coarser-grained interfaces
    tags:
      - chatty
      - coupling
      - n-plus-one
      - performance
      - round-trip
      - batch
      - api-design
  - id: antipattern-copy-paste
    file: antipattern-copy-paste.md
    type: primary
    focus: Detect copy-pasted code blocks that introduce duplication, divergence risk, and latent bugs from imperfect adaptation
    tags:
      - copy-paste
      - duplication
      - dry
      - clone
      - divergence
      - bug
      - duplicate-code
      - dispensable
      - readability
      - architecture
      - correctness
      - clean-code
  - id: antipattern-god-object
    file: antipattern-god-object.md
    type: primary
    focus: Detect classes or modules that centralize too many responsibilities, becoming universal coupling magnets that everything depends on
    tags:
      - god-object
      - god-class
      - blob
      - universal-coupling
      - srp
      - architecture
      - clean-code
      - anti-pattern
      - large-class
      - bloater
      - readability
      - divergent-change
      - code-smell
      - single-responsibility
      - change-preventer
      - refactoring
      - middle-man
      - coupler
      - delegation
      - wrapper
      - proxy
      - facade
      - over-abstraction
      - over-engineering
      - indirection
      - premature-abstraction
      - architecture-astronaut
      - lazy-class
      - dispensable
  - id: antipattern-golden-hammer
    file: antipattern-golden-hammer.md
    type: primary
    focus: Detect use of a familiar technology, pattern, or tool for every problem regardless of whether it fits the specific requirements
    tags:
      - golden-hammer
      - over-engineering
      - technology-choice
      - fit-for-purpose
      - architecture
      - anti-pattern
      - complexity
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
  - id: pattern-mediator
    file: pattern-mediator.md
    type: primary
    focus: Detect misuse, over-application, and absence of the Mediator pattern in inter-object coordination code.
    tags:
      - mediator
      - behavioural-pattern
      - design-patterns
      - coordination
      - decoupling
      - event-bus
      - message-bus
  - id: principle-encapsulation
    file: principle-encapsulation.md
    type: primary
    focus: Enforce information hiding, public surface minimization, and invariant protection to prevent implementation detail leakage.
    tags:
      - encapsulation
      - information-hiding
      - invariants
      - public-api
      - security
      - access-control
  - id: principle-grasp
    file: principle-grasp.md
    type: primary
    focus: Enforce GRASP responsibility-assignment patterns to ensure objects and modules are given the right responsibilities.
    tags:
      - grasp
      - responsibility-assignment
      - coupling
      - cohesion
      - patterns
      - architecture
  - id: principle-law-of-demeter
    file: principle-law-of-demeter.md
    type: primary
    focus: Minimize structural coupling by ensuring objects talk only to their immediate collaborators
    tags:
      - law-of-demeter
      - coupling
      - encapsulation
      - train-wreck
      - method-chains
      - structural-coupling
  - id: principle-solid
    file: principle-solid.md
    type: primary
    focus: "Enforce Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, and Dependency Inversion principles in every diff."
    tags:
      - solid
      - srp
      - ocp
      - lsp
      - isp
      - dip
      - design-principles
      - architecture
  - id: qa-maintainability
    file: qa-maintainability.md
    type: primary
    focus: Detect aggregated maintainability-index signals including high cyclomatic complexity, low cohesion, high coupling, missing tests for changed code, magic numbers, long methods, and deep nesting
    tags:
      - maintainability
      - complexity
      - cyclomatic
      - cohesion
      - coupling
      - magic-numbers
      - nesting
      - long-method
      - test-coverage
  - id: qa-modifiability
    file: qa-modifiability.md
    type: primary
    focus: Detect change amplification, rigid dependencies, missing extension points, hardcoded policy, and insufficient interface segregation that make the codebase resistant to modification
    tags:
      - modifiability
      - change-amplification
      - rigidity
      - extension-points
      - hardcoded-policy
      - interface-segregation
      - shotgun-surgery
      - connascence
  - id: smell-feature-envy
    file: smell-feature-envy.md
    type: primary
    focus: Detect methods that use more fields and methods of another class than their own, indicating misplaced logic.
    tags:
      - feature-envy
      - coupler
      - misplaced-logic
      - move-method
      - tell-dont-ask
      - clean-code
  - id: smell-inappropriate-intimacy
    file: smell-inappropriate-intimacy.md
    type: primary
    focus: "Detect classes that access each other's private or internal details, creating tight bidirectional coupling."
    tags:
      - inappropriate-intimacy
      - coupler
      - encapsulation
      - coupling
      - bidirectional-dependency
      - clean-code
  - id: smell-incomplete-library-class
    file: smell-incomplete-library-class.md
    type: primary
    focus: Detect scattered workarounds, extensions, and patches that compensate for library or framework limitations.
    tags:
      - incomplete-library-class
      - coupler
      - workaround
      - extension
      - polyfill
      - utility
      - clean-code
  - id: smell-long-parameter-list
    file: smell-long-parameter-list.md
    type: primary
    focus: Detect functions with too many parameters, boolean flag arguments, and parameter patterns that signal missing abstractions
    tags:
      - long-parameter-list
      - bloater
      - readability
      - function-signature
      - clean-code
  - id: smell-message-chains
    file: smell-message-chains.md
    type: primary
    focus: Detect long chains of method calls or property accesses that navigate through object graphs, coupling callers to intermediate structure.
    tags:
      - message-chains
      - coupler
      - law-of-demeter
      - navigation
      - getter-chain
      - clean-code
  - id: smell-temporary-field
    file: smell-temporary-field.md
    type: primary
    focus: Detect class fields that are only valid in certain states or methods, leading to null checks and temporal coupling.
    tags:
      - temporary-field
      - code-smell
      - oo-abusers
      - null-safety
      - temporal-coupling
      - encapsulation
  - id: wasm-interface-types
    file: wasm-interface-types.md
    type: primary
    focus: Detect raw wasm imports where the component model is appropriate, unversioned WIT schemas, canonical ABI leakage, and expensive boundary crossings
    tags:
      - wasm
      - wit
      - wit-bindgen
      - wasm-bindgen
      - component-model
      - interface-types
      - canonical-abi
      - boundary
      - versioning
  - id: context-module
    file: "context-module/index.md"
    type: index
    focus: "Afferent coupling (Ca): how many modules depend on this one; Business logic embedded in API handlers, CLI commands, or UI components; Circular dependencies between bounded contexts; Circular dependencies between packages or modules"
    tags:
      - architecture
children:
  - "context-module/index.md"
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Classes Class

**Focus:** 4+ layers between a request and the actual work (controller-service-manager-handler-repository-adapter); API contracts that leak internal implementation details forcing tight version coupling; API endpoint handlers with identical structure differing only in the entity name; Abstract base class with a single concrete subclass

## Children

| File | Type | Focus |
|------|------|-------|
| [antipattern-chatty-coupling.md](antipattern-chatty-coupling.md) | 📄 primary | Detect excessive fine-grained interactions between components that should communicate through coarser-grained interfaces |
| [antipattern-copy-paste.md](antipattern-copy-paste.md) | 📄 primary | Detect copy-pasted code blocks that introduce duplication, divergence risk, and latent bugs from imperfect adaptation |
| [antipattern-god-object.md](antipattern-god-object.md) | 📄 primary | Detect classes or modules that centralize too many responsibilities, becoming universal coupling magnets that everything depends on |
| [antipattern-golden-hammer.md](antipattern-golden-hammer.md) | 📄 primary | Detect use of a familiar technology, pattern, or tool for every problem regardless of whether it fits the specific requirements |
| [arch-layered.md](arch-layered.md) | 📄 primary | Detect layer skipping, circular layer dependencies, and business logic misplaced in presentation or data layers |
| [ddd-tactical-application-services.md](ddd-tactical-application-services.md) | 📄 primary | Detect application services containing domain logic, application services directly accessing infrastructure, and application services performing orchestration that belongs in domain services. |
| [pattern-mediator.md](pattern-mediator.md) | 📄 primary | Detect misuse, over-application, and absence of the Mediator pattern in inter-object coordination code. |
| [principle-encapsulation.md](principle-encapsulation.md) | 📄 primary | Enforce information hiding, public surface minimization, and invariant protection to prevent implementation detail leakage. |
| [principle-grasp.md](principle-grasp.md) | 📄 primary | Enforce GRASP responsibility-assignment patterns to ensure objects and modules are given the right responsibilities. |
| [principle-law-of-demeter.md](principle-law-of-demeter.md) | 📄 primary | Minimize structural coupling by ensuring objects talk only to their immediate collaborators |
| [principle-solid.md](principle-solid.md) | 📄 primary | Enforce Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, and Dependency Inversion principles in every diff. |
| [qa-maintainability.md](qa-maintainability.md) | 📄 primary | Detect aggregated maintainability-index signals including high cyclomatic complexity, low cohesion, high coupling, missing tests for changed code, magic numbers, long methods, and deep nesting |
| [qa-modifiability.md](qa-modifiability.md) | 📄 primary | Detect change amplification, rigid dependencies, missing extension points, hardcoded policy, and insufficient interface segregation that make the codebase resistant to modification |
| [smell-feature-envy.md](smell-feature-envy.md) | 📄 primary | Detect methods that use more fields and methods of another class than their own, indicating misplaced logic. |
| [smell-inappropriate-intimacy.md](smell-inappropriate-intimacy.md) | 📄 primary | Detect classes that access each other's private or internal details, creating tight bidirectional coupling. |
| [smell-incomplete-library-class.md](smell-incomplete-library-class.md) | 📄 primary | Detect scattered workarounds, extensions, and patches that compensate for library or framework limitations. |
| [smell-long-parameter-list.md](smell-long-parameter-list.md) | 📄 primary | Detect functions with too many parameters, boolean flag arguments, and parameter patterns that signal missing abstractions |
| [smell-message-chains.md](smell-message-chains.md) | 📄 primary | Detect long chains of method calls or property accesses that navigate through object graphs, coupling callers to intermediate structure. |
| [smell-temporary-field.md](smell-temporary-field.md) | 📄 primary | Detect class fields that are only valid in certain states or methods, leading to null checks and temporal coupling. |
| [wasm-interface-types.md](wasm-interface-types.md) | 📄 primary | Detect raw wasm imports where the component model is appropriate, unversioned WIT schemas, canonical ABI leakage, and expensive boundary crossings |
| [context-module/index.md](context-module/index.md) | 📁 index | Afferent coupling (Ca): how many modules depend on this one; Business logic embedded in API handlers, CLI commands, or UI components; Circular dependencies between bounded contexts; Circular dependencies between packages or modules |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
