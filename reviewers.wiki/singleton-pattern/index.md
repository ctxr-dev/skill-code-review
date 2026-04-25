---
id: singleton-pattern
type: index
depth_role: subcategory
depth: 1
focus: "Accumulator patterns replaceable with fold/reduce/map; Broken DCL variants using a boolean flag instead of checking the object reference; Builder duplicating validation logic already present in the product constructor; Builder missing validation in build() allowing invalid objects"
parents:
  - "../index.md"
shared_covers: []
entries:
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
  - id: pattern-builder
    file: pattern-builder.md
    type: primary
    focus: Detect misuse, over-application, and absence of the Builder pattern in step-by-step object construction.
    tags:
      - builder
      - creational-pattern
      - design-patterns
      - fluent-api
      - object-construction
      - immutability
  - id: pattern-chain-of-responsibility
    file: pattern-chain-of-responsibility.md
    type: primary
    focus: Detect misuse, over-application, and absence of the Chain of Responsibility pattern in request-dispatch code.
    tags:
      - chain-of-responsibility
      - behavioral-pattern
      - design-patterns
      - handler
      - middleware
      - pipeline
      - dispatch
      - filter
  - id: pattern-composite
    file: pattern-composite.md
    type: primary
    focus: Detect misuse, over-application, and absence of the Composite pattern in tree-structured object code.
    tags:
      - composite
      - structural-pattern
      - design-patterns
      - tree
      - hierarchy
      - recursion
      - component
  - id: pattern-double-checked-locking
    file: pattern-double-checked-locking.md
    type: primary
    focus: Detect broken, unnecessary, and misapplied double-checked locking in lazy initialization code.
    tags:
      - double-checked-locking
      - concurrency-pattern
      - design-patterns
      - lazy-initialization
      - volatile
      - memory-model
      - singleton
  - id: pattern-flyweight
    file: pattern-flyweight.md
    type: primary
    focus: Detect misuse, over-application, and absence of the Flyweight pattern in shared-object memory optimization code.
    tags:
      - flyweight
      - structural-pattern
      - design-patterns
      - memory
      - sharing
      - caching
      - immutability
      - pool
      - intern
  - id: pattern-interpreter
    file: pattern-interpreter.md
    type: primary
    focus: Detect misuse, over-application, and absence of the Interpreter pattern in grammar and expression-evaluation code.
    tags:
      - interpreter
      - behavioural-pattern
      - design-patterns
      - grammar
      - DSL
      - expression
      - parse
      - evaluate
      - AST
      - security
  - id: pattern-iterator
    file: pattern-iterator.md
    type: primary
    focus: Detect misuse, over-application, and absence of the Iterator pattern in collection-traversal code.
    tags:
      - iterator
      - behavioral-pattern
      - design-patterns
      - traversal
      - collection
      - generator
      - yield
      - stream
      - cursor
  - id: pattern-memento
    file: pattern-memento.md
    type: primary
    focus: "Detect misuse, over-application, and absence of the Memento pattern in state-snapshot and undo/redo code."
    tags:
      - memento
      - behavioural-pattern
      - design-patterns
      - undo
      - redo
      - snapshot
      - state
      - history
      - checkpoint
  - id: pattern-proxy
    file: pattern-proxy.md
    type: primary
    focus: Detect misuse, over-application, and absence of the Proxy pattern in access-control and indirection code.
    tags:
      - proxy
      - structural-pattern
      - design-patterns
      - access-control
      - lazy-loading
      - caching
      - remote
      - dynamic-proxy
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
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Singleton Pattern

**Focus:** Accumulator patterns replaceable with fold/reduce/map; Broken DCL variants using a boolean flag instead of checking the object reference; Builder duplicating validation logic already present in the product constructor; Builder missing validation in build() allowing invalid objects

## Children

| File | Type | Focus |
|------|------|-------|
| [antipattern-singleton-as-global.md](antipattern-singleton-as-global.md) | 📄 primary | Detect singletons used as socially acceptable global mutable state, bypassing dependency injection and damaging testability |
| [pattern-builder.md](pattern-builder.md) | 📄 primary | Detect misuse, over-application, and absence of the Builder pattern in step-by-step object construction. |
| [pattern-chain-of-responsibility.md](pattern-chain-of-responsibility.md) | 📄 primary | Detect misuse, over-application, and absence of the Chain of Responsibility pattern in request-dispatch code. |
| [pattern-composite.md](pattern-composite.md) | 📄 primary | Detect misuse, over-application, and absence of the Composite pattern in tree-structured object code. |
| [pattern-double-checked-locking.md](pattern-double-checked-locking.md) | 📄 primary | Detect broken, unnecessary, and misapplied double-checked locking in lazy initialization code. |
| [pattern-flyweight.md](pattern-flyweight.md) | 📄 primary | Detect misuse, over-application, and absence of the Flyweight pattern in shared-object memory optimization code. |
| [pattern-interpreter.md](pattern-interpreter.md) | 📄 primary | Detect misuse, over-application, and absence of the Interpreter pattern in grammar and expression-evaluation code. |
| [pattern-iterator.md](pattern-iterator.md) | 📄 primary | Detect misuse, over-application, and absence of the Iterator pattern in collection-traversal code. |
| [pattern-memento.md](pattern-memento.md) | 📄 primary | Detect misuse, over-application, and absence of the Memento pattern in state-snapshot and undo/redo code. |
| [pattern-proxy.md](pattern-proxy.md) | 📄 primary | Detect misuse, over-application, and absence of the Proxy pattern in access-control and indirection code. |
| [principle-command-query-separation.md](principle-command-query-separation.md) | 📄 primary | Verify that functions either perform an action (command) or return data (query) but do not mix both responsibilities |
| [principle-dry-kiss-yagni.md](principle-dry-kiss-yagni.md) | 📄 primary | Flag duplication, unnecessary complexity, and speculative features that hurt maintainability |
| [principle-immutability-by-default.md](principle-immutability-by-default.md) | 📄 primary | Prefer immutable state as the default and treat mutability as an explicit, justified exception |
| [smell-switch-statements.md](smell-switch-statements.md) | 📄 primary | Detect switch/if-else chains that dispatch on type tags and should be replaced with polymorphism. |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
