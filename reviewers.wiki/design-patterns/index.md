---
id: design-patterns
type: index
depth_role: subcategory
depth: 1
focus: "design-patterns: Detect misuse, over-application, and absence of the Abstract Factory pattern when creating families of related objects.; Detect misuse, over-application, and absence of the Active Object pattern in asynchronous decouplin..."
parents:
  - "../index.md"
shared_covers: []
tags:
  - abstract-factory
  - access-control
  - action
  - active-object
  - actor
  - aggregator
  - algorithm
  - api-design
  - ast
  - async
  - base-class
  - behavioral-pattern
  - behavioural-pattern
  - builder
  - caching
  - callback
  - canonical
  - chain-of-responsibility
  - checkpoint
  - clone
generator: "skill-llm-wiki/v1"
entries:
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
  - id: pattern-active-object
    file: pattern-active-object.md
    type: primary
    focus: Detect misuse, over-application, and absence of the Active Object pattern in asynchronous decoupling code.
    tags:
      - active-object
      - concurrency-pattern
      - design-patterns
      - actor
      - mailbox
      - async
      - decoupling
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
  - id: pattern-command
    file: pattern-command.md
    type: primary
    focus: Detect misuse, over-application, and absence of the Command pattern in operation-encapsulation code.
    tags:
      - command
      - behavioural-pattern
      - design-patterns
      - undo
      - redo
      - invoker
      - receiver
      - action
      - operation
      - queue
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
  - id: pattern-eip-routing
    file: pattern-eip-routing.md
    type: primary
    focus: Detect misuse, absence, and over-engineering of Enterprise Integration message routing patterns -- content-based routing, splitting, aggregating, and scatter-gather.
    tags:
      - eip
      - routing
      - content-based-router
      - splitter
      - aggregator
      - scatter-gather
      - routing-slip
      - recipient-list
      - enterprise-integration
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
  - id: pattern-monitor-object
    file: pattern-monitor-object.md
    type: primary
    focus: Detect misuse, deadlock risk, and absence of the Monitor Object pattern in synchronized shared-state code.
    tags:
      - monitor
      - concurrency-pattern
      - design-patterns
      - synchronization
      - lock
      - mutex
      - condition-variable
      - deadlock
  - id: pattern-observer
    file: pattern-observer.md
    type: primary
    focus: Detect misuse, over-application, and absence of the Observer pattern in event-driven notification code.
    tags:
      - observer
      - behavioral-pattern
      - design-patterns
      - event
      - listener
      - subscribe
      - publish
      - notification
      - callback
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
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Design Patterns

**Focus:** design-patterns: Detect misuse, over-application, and absence of the Abstract Factory pattern when creating families of related objects.; Detect misuse, over-application, and absence of the Active Object pattern in asynchronous decouplin...

## Children

| File | Type | Focus |
|------|------|-------|
| [pattern-abstract-factory.md](pattern-abstract-factory.md) | 📄 primary | Detect misuse, over-application, and absence of the Abstract Factory pattern when creating families of related objects. |
| [pattern-active-object.md](pattern-active-object.md) | 📄 primary | Detect misuse, over-application, and absence of the Active Object pattern in asynchronous decoupling code. |
| [pattern-builder.md](pattern-builder.md) | 📄 primary | Detect misuse, over-application, and absence of the Builder pattern in step-by-step object construction. |
| [pattern-chain-of-responsibility.md](pattern-chain-of-responsibility.md) | 📄 primary | Detect misuse, over-application, and absence of the Chain of Responsibility pattern in request-dispatch code. |
| [pattern-command.md](pattern-command.md) | 📄 primary | Detect misuse, over-application, and absence of the Command pattern in operation-encapsulation code. |
| [pattern-composite.md](pattern-composite.md) | 📄 primary | Detect misuse, over-application, and absence of the Composite pattern in tree-structured object code. |
| [pattern-decorator.md](pattern-decorator.md) | 📄 primary | Detect misuse, over-application, and absence of the Decorator pattern in behavior-extension code. |
| [pattern-double-checked-locking.md](pattern-double-checked-locking.md) | 📄 primary | Detect broken, unnecessary, and misapplied double-checked locking in lazy initialization code. |
| [pattern-eip-routing.md](pattern-eip-routing.md) | 📄 primary | Detect misuse, absence, and over-engineering of Enterprise Integration message routing patterns -- content-based routing, splitting, aggregating, and scatter-gather. |
| [pattern-eip-transformation.md](pattern-eip-transformation.md) | 📄 primary | Detect misuse, absence, and over-engineering of Enterprise Integration message transformation patterns -- mapping, enrichment, normalization, and canonical data models. |
| [pattern-facade.md](pattern-facade.md) | 📄 primary | Detect misuse, over-application, and absence of the Facade pattern in subsystem-simplification code. |
| [pattern-flyweight.md](pattern-flyweight.md) | 📄 primary | Detect misuse, over-application, and absence of the Flyweight pattern in shared-object memory optimization code. |
| [pattern-interpreter.md](pattern-interpreter.md) | 📄 primary | Detect misuse, over-application, and absence of the Interpreter pattern in grammar and expression-evaluation code. |
| [pattern-iterator.md](pattern-iterator.md) | 📄 primary | Detect misuse, over-application, and absence of the Iterator pattern in collection-traversal code. |
| [pattern-mediator.md](pattern-mediator.md) | 📄 primary | Detect misuse, over-application, and absence of the Mediator pattern in inter-object coordination code. |
| [pattern-memento.md](pattern-memento.md) | 📄 primary | Detect misuse, over-application, and absence of the Memento pattern in state-snapshot and undo/redo code. |
| [pattern-monitor-object.md](pattern-monitor-object.md) | 📄 primary | Detect misuse, deadlock risk, and absence of the Monitor Object pattern in synchronized shared-state code. |
| [pattern-observer.md](pattern-observer.md) | 📄 primary | Detect misuse, over-application, and absence of the Observer pattern in event-driven notification code. |
| [pattern-prototype.md](pattern-prototype.md) | 📄 primary | Detect misuse of clone/copy operations, shallow-vs-deep copy errors, and missing prototype support on frequently duplicated objects. |
| [pattern-proxy.md](pattern-proxy.md) | 📄 primary | Detect misuse, over-application, and absence of the Proxy pattern in access-control and indirection code. |
| [pattern-strategy.md](pattern-strategy.md) | 📄 primary | Detect misuse, over-application, and absence of the Strategy pattern in algorithm-selection code. |
| [pattern-template-method.md](pattern-template-method.md) | 📄 primary | Detect misuse, over-application, and absence of the Template Method pattern in skeleton-algorithm code. |
| [pattern-visitor.md](pattern-visitor.md) | 📄 primary | Detect misuse, over-application, and absence of the Visitor pattern in element-type-dispatch code. |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
