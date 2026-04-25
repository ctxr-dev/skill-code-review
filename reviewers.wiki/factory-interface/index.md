---
id: factory-interface
type: index
depth_role: subcategory
depth: 1
focus: "Abstract classes or interfaces with only one implementation and no planned second; Abstract factory confused with service locator or dependency injection container; Abstract factory for a single product family -- no family switching ever occurs; Abstract factory interface growing with every new product type (ISP violation)"
parents:
  - "../index.md"
shared_covers: []
entries:
  - id: antipattern-god-object
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
    file: "../classes-class/antipattern-god-object.md"
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
  - id: modern-branch-by-abstraction
    file: modern-branch-by-abstraction.md
    type: primary
    focus: Detect branch-by-abstraction failures where the abstraction layer is missing before an implementation swap, old implementations linger after stabilization, abstractions leak details, or feature toggles are absent for switching
    tags:
      - branch-by-abstraction
      - abstraction
      - refactoring
      - implementation-swap
      - feature-toggle
      - interface
      - dependency-inversion
      - bridge
      - structural-pattern
      - design-patterns
      - implementation
      - separation
      - platform
  - id: modern-legacy-wrap-and-replace
    file: modern-legacy-wrap-and-replace.md
    type: primary
    focus: Detect wrap-and-replace failures where the wrapper adds behavior beyond pure delegation, does not match the original interface, is tested in isolation from the original, the replacement diverges functionally, or integration tests at the seam are missing
    tags:
      - wrap-and-replace
      - wrapper
      - delegation
      - legacy
      - seam
      - refactoring
      - adapter
      - facade
      - equivalence
  - id: pattern-abstract-factory
    file: pattern-abstract-factory.md
    type: primary
    focus: Detect misuse, over-application, and absence of the Abstract Factory pattern when creating families of related objects.
    tags:
      - abstract-factory
      - creational-pattern
      - design-patterns
      - product-family
      - object-creation
      - factory-method
      - polymorphism
  - id: pattern-decorator
    file: pattern-decorator.md
    type: primary
    focus: Detect misuse, over-application, and absence of the Decorator pattern in behavior-extension code.
    tags:
      - decorator
      - structural-pattern
      - design-patterns
      - wrapper
      - cross-cutting
      - middleware
      - composition
  - id: pattern-facade
    file: pattern-facade.md
    type: primary
    focus: Detect misuse, over-application, and absence of the Facade pattern in subsystem-simplification code.
    tags:
      - facade
      - structural-pattern
      - design-patterns
      - simplification
      - api-design
      - subsystem
      - gateway
  - id: pattern-prototype
    file: pattern-prototype.md
    type: primary
    focus: "Detect misuse of clone/copy operations, shallow-vs-deep copy errors, and missing prototype support on frequently duplicated objects."
    tags:
      - prototype
      - clone
      - copy
      - deep-copy
      - creational-pattern
      - design-patterns
      - object-duplication
  - id: pattern-strategy
    file: pattern-strategy.md
    type: primary
    focus: Detect misuse, over-application, and absence of the Strategy pattern in algorithm-selection code.
    tags:
      - strategy
      - behavioral-pattern
      - design-patterns
      - algorithm
      - policy
      - injection
      - composition
  - id: pattern-template-method
    file: pattern-template-method.md
    type: primary
    focus: Detect misuse, over-application, and absence of the Template Method pattern in skeleton-algorithm code.
    tags:
      - template-method
      - behavioral-pattern
      - design-patterns
      - inheritance
      - hook
      - skeleton
      - algorithm
      - base-class
  - id: pattern-visitor
    file: pattern-visitor.md
    type: primary
    focus: Detect misuse, over-application, and absence of the Visitor pattern in element-type-dispatch code.
    tags:
      - visitor
      - behavioural-pattern
      - design-patterns
      - double-dispatch
      - traversal
      - ast
      - expression
      - element
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
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Factory Interface

**Focus:** Abstract classes or interfaces with only one implementation and no planned second; Abstract factory confused with service locator or dependency injection container; Abstract factory for a single product family -- no family switching ever occurs; Abstract factory interface growing with every new product type (ISP violation)

## Children

| File | Type | Focus |
|------|------|-------|
| [antipattern-patternitis.md](antipattern-patternitis.md) | 📄 primary | Detect design patterns applied where none is needed, creating unnecessary structural complexity for problems a plain function or direct code would solve |
| [arch-hexagonal-ports-adapters.md](arch-hexagonal-ports-adapters.md) | 📄 primary | Detect adapters containing business logic, ports not defined as interfaces, and direct infrastructure access bypassing ports |
| [modern-branch-by-abstraction.md](modern-branch-by-abstraction.md) | 📄 primary | Detect branch-by-abstraction failures where the abstraction layer is missing before an implementation swap, old implementations linger after stabilization, abstractions leak details, or feature toggles are absent for switching |
| [modern-legacy-wrap-and-replace.md](modern-legacy-wrap-and-replace.md) | 📄 primary | Detect wrap-and-replace failures where the wrapper adds behavior beyond pure delegation, does not match the original interface, is tested in isolation from the original, the replacement diverges functionally, or integration tests at the seam are missing |
| [pattern-abstract-factory.md](pattern-abstract-factory.md) | 📄 primary | Detect misuse, over-application, and absence of the Abstract Factory pattern when creating families of related objects. |
| [pattern-decorator.md](pattern-decorator.md) | 📄 primary | Detect misuse, over-application, and absence of the Decorator pattern in behavior-extension code. |
| [pattern-facade.md](pattern-facade.md) | 📄 primary | Detect misuse, over-application, and absence of the Facade pattern in subsystem-simplification code. |
| [pattern-prototype.md](pattern-prototype.md) | 📄 primary | Detect misuse of clone/copy operations, shallow-vs-deep copy errors, and missing prototype support on frequently duplicated objects. |
| [pattern-strategy.md](pattern-strategy.md) | 📄 primary | Detect misuse, over-application, and absence of the Strategy pattern in algorithm-selection code. |
| [pattern-template-method.md](pattern-template-method.md) | 📄 primary | Detect misuse, over-application, and absence of the Template Method pattern in skeleton-algorithm code. |
| [pattern-visitor.md](pattern-visitor.md) | 📄 primary | Detect misuse, over-application, and absence of the Visitor pattern in element-type-dispatch code. |
| [principle-composition-over-inheritance.md](principle-composition-over-inheritance.md) | 📄 primary | Detect inappropriate inheritance hierarchies and promote delegation/composition as the default reuse mechanism. |
| [smell-alternative-classes-different-interfaces.md](smell-alternative-classes-different-interfaces.md) | 📄 primary | Detect classes that serve the same role but expose different method names or signatures, preventing interchangeability. |
| [smell-parallel-inheritance-hierarchies.md](smell-parallel-inheritance-hierarchies.md) | 📄 primary | Detect mirrored class hierarchies where adding a subclass in one tree forces adding a corresponding subclass in another |
| [smell-refused-bequest.md](smell-refused-bequest.md) | 📄 primary | Detect subclasses that reject or ignore inherited methods and fields, signaling a broken inheritance contract. |
| [smell-speculative-generality.md](smell-speculative-generality.md) | 📄 primary | Detect abstractions, indirection layers, and extension points created for anticipated future needs that have no current consumers |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
