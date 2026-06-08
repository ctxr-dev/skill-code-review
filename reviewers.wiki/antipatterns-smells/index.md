---
id: antipatterns-smells
type: index
depth_role: subcategory
depth: 1
focus: "antipatterns-smells: Detect excessive fine-grained interactions between components that should communicate through coarser-grained interfaces; Detect copy-pasted code blocks that introduce duplication, divergence risk, and latent bugs fr..."
parents:
  - "../index.md"
shared_covers: []
tags:
  - abstraction
  - alternative-classes
  - anti-pattern
  - api-design
  - architecture
  - architecture-astronaut
  - batch
  - bidirectional-dependency
  - bloater
  - blob
  - bug
  - callback-hell
  - catch
  - change-preventer
  - chatty
  - clean-code
  - clone
  - code-smell
  - complexity
  - concurrency
generator: "skill-llm-wiki/v1"
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
  - id: antipattern-exception-swallowing
    file: antipattern-exception-swallowing.md
    type: primary
    focus: "Detect catch/except/rescue blocks that silently discard exceptions, hiding failures from callers and masking bugs"
    tags:
      - exception-swallowing
      - error-handling
      - silent-failure
      - catch
      - except
      - rescue
      - error
      - anti-pattern
      - correctness
      - security
  - id: antipattern-flaky-non-deterministic-tests
    file: antipattern-flaky-non-deterministic-tests.md
    type: primary
    focus: Detect tests that pass or fail unpredictably due to hidden dependencies on time, ordering, network, shared state, or randomness
    tags:
      - flaky-tests
      - non-determinism
      - test-reliability
      - time-dependency
      - shared-state
      - test-isolation
      - anti-pattern
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
  - id: antipattern-lava-flow
    file: antipattern-lava-flow.md
    type: primary
    focus: Detect dead or hardened code from previous iterations that persists because nobody understands it well enough to safely remove it
    tags:
      - lava-flow
      - dead-code
      - legacy
      - fossilized
      - hardened
      - dispensable
      - architecture
      - readability
      - anti-pattern
  - id: antipattern-magic-numbers-strings
    file: antipattern-magic-numbers-strings.md
    type: primary
    focus: Detect unexplained literal values embedded in logic with no named constant, enum, or documentation
    tags:
      - magic-number
      - magic-string
      - literal
      - constant
      - readability
      - correctness
      - naming
      - anti-pattern
  - id: antipattern-patternitis
    file: antipattern-patternitis.md
    type: primary
    focus: Detect design patterns applied where none is needed, creating unnecessary structural complexity for problems a plain function or direct code would solve
    tags:
      - patternitis
      - over-engineering
      - design-patterns
      - unnecessary-complexity
      - readability
      - architecture
      - anti-pattern
  - id: antipattern-singleton-as-global
    file: antipattern-singleton-as-global.md
    type: primary
    focus: Detect singletons used as socially acceptable global mutable state, bypassing dependency injection and damaging testability
    tags:
      - singleton
      - global-state
      - anti-pattern
      - testability
      - dependency-injection
      - mutable-state
      - architecture
      - coupling
      - creational-pattern
      - design-patterns
      - concurrency
  - id: antipattern-spaghetti-code
    file: antipattern-spaghetti-code.md
    type: primary
    focus: Detect tangled control flow with no discernible structure, where logic paths interweave and cannot be followed linearly
    tags:
      - spaghetti-code
      - control-flow
      - nesting
      - complexity
      - readability
      - callback-hell
      - temporal-coupling
      - anti-pattern
      - long-method
      - bloater
      - extract-method
      - clean-code
  - id: smell-alternative-classes-different-interfaces
    file: smell-alternative-classes-different-interfaces.md
    type: primary
    focus: Detect classes that serve the same role but expose different method names or signatures, preventing interchangeability.
    tags:
      - alternative-classes
      - code-smell
      - oo-abusers
      - interface
      - protocol
      - polymorphism
      - interchangeability
  - id: smell-data-clumps
    file: smell-data-clumps.md
    type: primary
    focus: Detect groups of data items that repeatedly appear together across function signatures, class fields, and data structures
    tags:
      - data-clumps
      - bloater
      - parameter-object
      - value-object
      - readability
      - architecture
      - clean-code
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
  - id: smell-parallel-inheritance-hierarchies
    file: smell-parallel-inheritance-hierarchies.md
    type: primary
    focus: Detect mirrored class hierarchies where adding a subclass in one tree forces adding a corresponding subclass in another
    tags:
      - parallel-inheritance
      - code-smell
      - change-preventer
      - inheritance
      - hierarchy
      - refactoring
  - id: smell-primitive-obsession
    file: smell-primitive-obsession.md
    type: primary
    focus: Detect domain concepts represented as raw primitive types instead of expressive value objects or domain types
    tags:
      - primitive-obsession
      - bloater
      - value-object
      - domain-modeling
      - type-safety
      - clean-code
  - id: smell-refused-bequest
    file: smell-refused-bequest.md
    type: primary
    focus: Detect subclasses that reject or ignore inherited methods and fields, signaling a broken inheritance contract.
    tags:
      - refused-bequest
      - code-smell
      - oo-abusers
      - inheritance
      - lsp
      - substitutability
      - liskov
  - id: smell-shotgun-surgery
    file: smell-shotgun-surgery.md
    type: primary
    focus: Detect single logical changes that require coordinated parallel edits across many files or modules
    tags:
      - shotgun-surgery
      - code-smell
      - change-preventer
      - refactoring
      - coupling
      - scattered-logic
  - id: smell-speculative-generality
    file: smell-speculative-generality.md
    type: primary
    focus: Detect abstractions, indirection layers, and extension points created for anticipated future needs that have no current consumers
    tags:
      - speculative-generality
      - dispensable
      - yagni
      - over-engineering
      - abstraction
      - readability
      - architecture
      - clean-code
  - id: smell-switch-statements
    file: smell-switch-statements.md
    type: primary
    focus: "Detect switch/if-else chains that dispatch on type tags and should be replaced with polymorphism."
    tags:
      - switch-statements
      - code-smell
      - oo-abusers
      - polymorphism
      - conditional
      - dispatch
      - refactoring
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
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Antipatterns Smells

**Focus:** antipatterns-smells: Detect excessive fine-grained interactions between components that should communicate through coarser-grained interfaces; Detect copy-pasted code blocks that introduce duplication, divergence risk, and latent bugs fr...

## Children

| File | Type | Focus |
|------|------|-------|
| [antipattern-chatty-coupling.md](antipattern-chatty-coupling.md) | 📄 primary | Detect excessive fine-grained interactions between components that should communicate through coarser-grained interfaces |
| [antipattern-copy-paste.md](antipattern-copy-paste.md) | 📄 primary | Detect copy-pasted code blocks that introduce duplication, divergence risk, and latent bugs from imperfect adaptation |
| [antipattern-exception-swallowing.md](antipattern-exception-swallowing.md) | 📄 primary | Detect catch/except/rescue blocks that silently discard exceptions, hiding failures from callers and masking bugs |
| [antipattern-flaky-non-deterministic-tests.md](antipattern-flaky-non-deterministic-tests.md) | 📄 primary | Detect tests that pass or fail unpredictably due to hidden dependencies on time, ordering, network, shared state, or randomness |
| [antipattern-god-object.md](antipattern-god-object.md) | 📄 primary | Detect classes or modules that centralize too many responsibilities, becoming universal coupling magnets that everything depends on |
| [antipattern-golden-hammer.md](antipattern-golden-hammer.md) | 📄 primary | Detect use of a familiar technology, pattern, or tool for every problem regardless of whether it fits the specific requirements |
| [antipattern-lava-flow.md](antipattern-lava-flow.md) | 📄 primary | Detect dead or hardened code from previous iterations that persists because nobody understands it well enough to safely remove it |
| [antipattern-magic-numbers-strings.md](antipattern-magic-numbers-strings.md) | 📄 primary | Detect unexplained literal values embedded in logic with no named constant, enum, or documentation |
| [antipattern-patternitis.md](antipattern-patternitis.md) | 📄 primary | Detect design patterns applied where none is needed, creating unnecessary structural complexity for problems a plain function or direct code would solve |
| [antipattern-singleton-as-global.md](antipattern-singleton-as-global.md) | 📄 primary | Detect singletons used as socially acceptable global mutable state, bypassing dependency injection and damaging testability |
| [antipattern-spaghetti-code.md](antipattern-spaghetti-code.md) | 📄 primary | Detect tangled control flow with no discernible structure, where logic paths interweave and cannot be followed linearly |
| [smell-alternative-classes-different-interfaces.md](smell-alternative-classes-different-interfaces.md) | 📄 primary | Detect classes that serve the same role but expose different method names or signatures, preventing interchangeability. |
| [smell-data-clumps.md](smell-data-clumps.md) | 📄 primary | Detect groups of data items that repeatedly appear together across function signatures, class fields, and data structures |
| [smell-feature-envy.md](smell-feature-envy.md) | 📄 primary | Detect methods that use more fields and methods of another class than their own, indicating misplaced logic. |
| [smell-inappropriate-intimacy.md](smell-inappropriate-intimacy.md) | 📄 primary | Detect classes that access each other's private or internal details, creating tight bidirectional coupling. |
| [smell-incomplete-library-class.md](smell-incomplete-library-class.md) | 📄 primary | Detect scattered workarounds, extensions, and patches that compensate for library or framework limitations. |
| [smell-long-parameter-list.md](smell-long-parameter-list.md) | 📄 primary | Detect functions with too many parameters, boolean flag arguments, and parameter patterns that signal missing abstractions |
| [smell-message-chains.md](smell-message-chains.md) | 📄 primary | Detect long chains of method calls or property accesses that navigate through object graphs, coupling callers to intermediate structure. |
| [smell-parallel-inheritance-hierarchies.md](smell-parallel-inheritance-hierarchies.md) | 📄 primary | Detect mirrored class hierarchies where adding a subclass in one tree forces adding a corresponding subclass in another |
| [smell-primitive-obsession.md](smell-primitive-obsession.md) | 📄 primary | Detect domain concepts represented as raw primitive types instead of expressive value objects or domain types |
| [smell-refused-bequest.md](smell-refused-bequest.md) | 📄 primary | Detect subclasses that reject or ignore inherited methods and fields, signaling a broken inheritance contract. |
| [smell-shotgun-surgery.md](smell-shotgun-surgery.md) | 📄 primary | Detect single logical changes that require coordinated parallel edits across many files or modules |
| [smell-speculative-generality.md](smell-speculative-generality.md) | 📄 primary | Detect abstractions, indirection layers, and extension points created for anticipated future needs that have no current consumers |
| [smell-switch-statements.md](smell-switch-statements.md) | 📄 primary | Detect switch/if-else chains that dispatch on type tags and should be replaced with polymorphism. |
| [smell-temporary-field.md](smell-temporary-field.md) | 📄 primary | Detect class fields that are only valid in certain states or methods, leading to null checks and temporal coupling. |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
