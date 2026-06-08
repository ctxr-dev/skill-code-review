---
id: principles
type: index
depth_role: subcategory
depth: 1
focus: "principles: Verify that functions either perform an action (command) or return data (query) but do not mix both responsibilities; Detect inappropriate inheritance hierarchies and promote delegation/composition as the default reuse mechan..."
parents:
  - "../index.md"
shared_covers: []
tags:
  - access-control
  - anemic-domain
  - api-design
  - architecture
  - behavior-colocation
  - clean-architecture
  - clean-code
  - cohesion
  - command
  - composition
  - concurrency
  - consistency
  - convention
  - coupling
  - cqs
  - defensive-copy
  - defensive-programming
  - delegation
  - dependencies
  - design-patterns
generator: "skill-llm-wiki/v1"
entries:
  - id: principle-command-query-separation
    file: principle-command-query-separation.md
    type: primary
    focus: "Verify that functions either perform an action (command) or return data (query) but do not mix both responsibilities"
    tags:
      - cqs
      - side-effects
      - query
      - command
      - mutation
      - separation-of-concerns
      - api-design
  - id: principle-composition-over-inheritance
    file: principle-composition-over-inheritance.md
    type: primary
    focus: "Detect inappropriate inheritance hierarchies and promote delegation/composition as the default reuse mechanism."
    tags:
      - composition
      - inheritance
      - delegation
      - strategy
      - mixins
      - design-patterns
      - reuse
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
  - id: principle-dry-kiss-yagni
    file: principle-dry-kiss-yagni.md
    type: primary
    focus: Flag duplication, unnecessary complexity, and speculative features that hurt maintainability
    tags:
      - dry
      - kiss
      - yagni
      - simplicity
      - duplication
      - over-engineering
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
  - id: principle-fail-fast
    file: principle-fail-fast.md
    type: primary
    focus: Verify that errors are detected and surfaced at the earliest possible point rather than propagated silently
    tags:
      - fail-fast
      - validation
      - error-handling
      - preconditions
      - defensive-programming
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
  - id: principle-immutability-by-default
    file: principle-immutability-by-default.md
    type: primary
    focus: Prefer immutable state as the default and treat mutability as an explicit, justified exception
    tags:
      - immutability
      - mutability
      - state
      - concurrency
      - value-objects
      - functional
      - defensive-copy
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
  - id: principle-least-astonishment
    file: principle-least-astonishment.md
    type: primary
    focus: Flag code that behaves differently from what a careful reader of the signature, name, or type would expect
    tags:
      - surprise
      - side-effects
      - consistency
      - mutation
      - convention
      - api-design
  - id: principle-naming-and-intent
    file: principle-naming-and-intent.md
    type: primary
    focus: Ensure names reveal intent, maintain consistent vocabulary, and eliminate the need for explanatory comments
    tags:
      - naming
      - readability
      - intent
      - vocabulary
      - domain-language
      - clean-code
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
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Principles

**Focus:** principles: Verify that functions either perform an action (command) or return data (query) but do not mix both responsibilities; Detect inappropriate inheritance hierarchies and promote delegation/composition as the default reuse mechan...

## Children

| File | Type | Focus |
|------|------|-------|
| [principle-command-query-separation.md](principle-command-query-separation.md) | 📄 primary | Verify that functions either perform an action (command) or return data (query) but do not mix both responsibilities |
| [principle-composition-over-inheritance.md](principle-composition-over-inheritance.md) | 📄 primary | Detect inappropriate inheritance hierarchies and promote delegation/composition as the default reuse mechanism. |
| [principle-coupling-cohesion.md](principle-coupling-cohesion.md) | 📄 primary | Evaluate module dependency structure for excessive coupling and insufficient cohesion |
| [principle-dry-kiss-yagni.md](principle-dry-kiss-yagni.md) | 📄 primary | Flag duplication, unnecessary complexity, and speculative features that hurt maintainability |
| [principle-encapsulation.md](principle-encapsulation.md) | 📄 primary | Enforce information hiding, public surface minimization, and invariant protection to prevent implementation detail leakage. |
| [principle-fail-fast.md](principle-fail-fast.md) | 📄 primary | Verify that errors are detected and surfaced at the earliest possible point rather than propagated silently |
| [principle-grasp.md](principle-grasp.md) | 📄 primary | Enforce GRASP responsibility-assignment patterns to ensure objects and modules are given the right responsibilities. |
| [principle-immutability-by-default.md](principle-immutability-by-default.md) | 📄 primary | Prefer immutable state as the default and treat mutability as an explicit, justified exception |
| [principle-law-of-demeter.md](principle-law-of-demeter.md) | 📄 primary | Minimize structural coupling by ensuring objects talk only to their immediate collaborators |
| [principle-least-astonishment.md](principle-least-astonishment.md) | 📄 primary | Flag code that behaves differently from what a careful reader of the signature, name, or type would expect |
| [principle-naming-and-intent.md](principle-naming-and-intent.md) | 📄 primary | Ensure names reveal intent, maintain consistent vocabulary, and eliminate the need for explanatory comments |
| [principle-separation-of-concerns.md](principle-separation-of-concerns.md) | 📄 primary | Ensure distinct concerns live in distinct modules with no cross-contamination |
| [principle-solid.md](principle-solid.md) | 📄 primary | Enforce Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, and Dependency Inversion principles in every diff. |
| [principle-tell-dont-ask.md](principle-tell-dont-ask.md) | 📄 primary | Ensure behavior lives with the data it operates on, eliminating feature envy, getter-chain decision-making, and anemic domain models. |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
