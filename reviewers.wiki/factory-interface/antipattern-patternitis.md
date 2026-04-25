---
id: antipattern-patternitis
type: primary
depth_role: leaf
focus: Detect design patterns applied where none is needed, creating unnecessary structural complexity for problems a plain function or direct code would solve
parents:
  - index.md
covers:
  - Factory that creates only one type -- a constructor call is simpler
  - Strategy pattern with a single concrete strategy -- the indirection has no variation to justify it
  - Observer with one subscriber -- a direct method call is clearer and traceable
  - Abstract factory for a single product family -- no family switching ever occurs
  - Builder for objects with fewer than 4 fields and no complex construction rules
  - Decorator wrapping once and never recomposed -- just add the behavior directly
  - Visitor for a two-node hierarchy -- a switch or if-else is shorter and clearer
  - "Command pattern that is just a function call with extra steps (execute method wraps one call)"
  - Mediator between two objects that could communicate directly
  - "Pattern name in class name without pattern behavior (FooFactory that is just a constructor wrapper)"
  - Singleton used for a class that has no reason to restrict instantiation
  - Proxy that adds no access control, caching, or lazy loading over the real subject
tags:
  - patternitis
  - over-engineering
  - design-patterns
  - unnecessary-complexity
  - readability
  - architecture
  - anti-pattern
activation:
  file_globs:
    - "*"
  keyword_matches:
    - Factory
    - factory
    - Strategy
    - strategy
    - Observer
    - observer
    - Builder
    - builder
    - Decorator
    - decorator
    - Visitor
    - visitor
    - Command
    - command
    - Mediator
    - mediator
    - Singleton
    - singleton
    - Proxy
    - proxy
    - Handler
    - handler
    - Listener
    - listener
    - Pattern
    - pattern
    - abstract
    - Abstract
    - implements
    - extends
    - "interface "
    - execute
    - notify
    - subscribe
    - accept
    - visit
    - "build()"
    - getInstance
  structural_signals:
    - pattern_with_single_implementation
    - factory_single_type
    - strategy_single_variant
    - observer_single_subscriber
    - builder_few_fields
source:
  origin: file
  path: antipattern-patternitis.md
  hash: "sha256:62da519ec5f2c84f40a0a9c20c31617f606cb24bfe236a5b36c6574601f8d570"
---
# Patternitis

## When This Activates

Activates on any diff that introduces or modifies classes following design pattern structures -- factories, strategies, observers, builders, decorators, visitors, commands, mediators, singletons, or proxies. Patternitis is the compulsive application of design patterns to problems that do not need them: a factory that creates one type, a strategy with one strategy, an observer with one subscriber. Each pattern adds classes, interfaces, and indirection that are justified only when the pattern's core benefit -- variation, decoupling, or compositional flexibility -- is actually exploited. When the pattern is applied prophylactically, the code becomes harder to read, navigate, and modify for no structural benefit. The key diagnostic question is: "Does this pattern have multiple variants, subscribers, decorators, or product families today, and if not, is there a concrete, near-term plan for more?"

## Audit Surface

- [ ] Factory class or method that instantiates only one concrete type throughout the codebase
- [ ] Strategy interface with exactly one implementation and no test doubles
- [ ] Observer/listener registration with exactly one subscriber ever attached
- [ ] Abstract factory creating products from a single family with no family-switching logic
- [ ] Builder class for an object with 3 or fewer fields and no conditional construction
- [ ] Decorator applied once with no further wrapping or dynamic composition
- [ ] Visitor interface with visit methods for only 1-2 node types
- [ ] Command class whose execute method delegates to a single method call with no undo, queue, or logging
- [ ] Mediator coordinating exactly two participants that have no other collaborators
- [ ] Class named XxxFactory, XxxStrategy, XxxObserver, XxxCommand whose structure does not match the pattern's intent
- [ ] Singleton for a class that holds no shared state or expensive resource
- [ ] Proxy that delegates every method to the real subject with no added behavior
- [ ] State pattern with only two states and no transitions added after initial implementation
- [ ] Chain of responsibility with exactly one handler in the chain
- [ ] Template method with exactly one subclass providing the variant steps
- [ ] Pattern introduction in the same PR with no second implementation or documented plan for one

## Detailed Checks

### Single-Variant Creational Patterns
<!-- activation: keywords=["Factory", "factory", "Builder", "builder", "Abstract", "abstract", "create", "build", "make", "construct", "getInstance", "newInstance", "Singleton", "singleton"] -->

- [ ] **Factory creating one type**: flag factory classes or factory methods where every code path returns the same concrete type -- `new ConcreteType()` is simpler, and the factory can be extracted later if a second type appears
- [ ] **Abstract factory with one family**: flag abstract factory implementations where only one concrete factory exists -- the abstraction over families is unused; a simple factory method (or direct construction) suffices
- [ ] **Builder for trivial objects**: flag builder pattern for classes with 3 or fewer fields, no field-level validation in the builder, no conditional defaults, and no immutable construction requirement that a constructor cannot satisfy -- the builder adds a class and a fluent API for trivial assembly
- [ ] **Singleton without justification**: flag singleton pattern (`getInstance`, `static instance`, `@Singleton`) for classes that hold no expensive resource (connection pool, thread pool, configuration) and no process-wide shared state -- the singleton restricts instantiation for no reason and hinders testing
- [ ] **Prototype pattern for simple cloning**: flag prototype `clone()` implementations for objects that could be constructed fresh with equal cost -- prototype is justified only when construction is significantly more expensive than copying

### Single-Variant Behavioral Patterns
<!-- activation: keywords=["Strategy", "strategy", "Observer", "observer", "Command", "command", "Visitor", "visitor", "Mediator", "mediator", "State", "state", "Chain", "chain", "Handler", "handler", "execute", "notify", "subscribe", "accept", "visit", "handle"] -->

- [ ] **Strategy with one strategy**: flag strategy interfaces with exactly one concrete implementation and no test doubles using the interface -- the indirection adds a file and a navigation hop for zero variation benefit
- [ ] **Observer with one subscriber**: flag observer/event/listener registrations where exactly one subscriber ever registers -- the publish-subscribe infrastructure (registration list, notification loop, event type) is overhead when a direct method call would do
- [ ] **Command wrapping a single call**: flag command classes whose `execute()` method contains a single delegation to another method, with no undo support, no command queue, no logging, and no macro composition -- the command is a function call with extra steps
- [ ] **Visitor for a tiny hierarchy**: flag visitor implementations where the visited hierarchy has only 1-2 node types -- a simple `switch`/`match`/`if-else` on the type is shorter, localized, and equally extensible at this scale
- [ ] **Mediator between two objects**: flag mediator classes that coordinate exactly two participants -- two objects can communicate via direct method calls or a callback without a third-party coordinator

### Single-Variant Structural Patterns
<!-- activation: keywords=["Decorator", "decorator", "Proxy", "proxy", "Adapter", "adapter", "Wrapper", "wrapper", "Facade", "facade", "Bridge", "bridge", "wrap", "delegate", "intercept"] -->

- [ ] **Decorator never composed**: flag decorator pattern implementations where the decorator is applied exactly once and never stacked or dynamically composed -- if you always use `new LoggingService(new RealService())` and never `new CachingService(new LoggingService(new RealService()))`, the decorator is a wrapper with no compositional payoff
- [ ] **Proxy adding no behavior**: flag proxy classes that delegate every method to the real subject without adding access control, lazy initialization, caching, logging, or remote dispatch -- the proxy is pure indirection
- [ ] **Bridge with one implementation dimension**: flag bridge pattern where only one implementor hierarchy exists -- the bridge separates abstraction from implementation, but with one of each, it is just an interface with one class
- [ ] **Adapter for an internal class**: flag adapter pattern wrapping a class within the same codebase (not a third-party library) where the adapter's interface is identical to the adaptee's -- rename or refactor the adaptee instead

### Pattern Names Without Pattern Behavior
<!-- activation: keywords=["Factory", "Strategy", "Observer", "Command", "Builder", "Singleton", "Decorator", "Visitor", "Mediator", "Proxy", "Handler", "Manager", "Provider", "Processor", "Resolver"] -->

- [ ] **FooFactory that is just a constructor**: flag classes named `XxxFactory` whose only method calls `new Xxx(...)` with the same parameters -- the factory name suggests creation logic (type selection, configuration, pooling) that does not exist
- [ ] **XxxStrategy that is the only strategy**: flag classes named `XxxStrategy` where no other `Strategy` implementations exist and the class is not behind an interface -- the name promises interchangeability that the code does not deliver
- [ ] **XxxCommand with no command infrastructure**: flag classes named `XxxCommand` that are instantiated and executed inline (not queued, not undone, not logged as commands) -- the naming convention implies infrastructure that is absent
- [ ] **XxxHandler in a non-chain context**: flag classes named `XxxHandler` that are called directly (not dispatched through a chain, registry, or mediator) -- "Handler" implies dynamic dispatch, but the code uses static calls
- [ ] **Pattern suffix inflation**: flag codebases where 5+ classes are named with pattern suffixes (Factory, Strategy, Builder, Command, Handler) but fewer than half exhibit the pattern's structural behavior -- the naming convention has become cargo cult

### Premature Pattern Introduction
<!-- activation: keywords=["interface ", "abstract ", "implements ", "extends ", "new ", "create", "pattern"] -->

- [ ] **Pattern added in same PR as only implementation**: flag design pattern infrastructure (interface + one implementation, abstract factory + one concrete factory, strategy interface + one strategy) introduced in the same PR with no accompanying second variant -- the pattern can be extracted when a second variant appears
- [ ] **Pattern justified by TODO comment**: flag pattern infrastructure accompanied by `// TODO: add second strategy`, `// Future: more factories` -- comments are not commitments, and the second variant may never arrive
- [ ] **Pattern from a tutorial or template**: flag boilerplate pattern code that matches common tutorial structures verbatim (naming, structure, comments) with no adaptation to the domain -- the pattern was applied by rote, not by need
- [ ] **Over-patterned simple CRUD**: flag CRUD operations wrapped in command, strategy, or factory patterns where the operations are simple create/read/update/delete with no business rules -- patterns add layers to trivial operations

## Common False Positives

- **Framework-mandated patterns**: some frameworks require factory methods (Spring `@Bean`), command objects (CQRS frameworks), or strategy interfaces (plugin systems). Flag only when custom pattern infrastructure exceeds what the framework requires.
- **Pattern with test doubles**: a strategy or observer interface with one production implementation but used with mocks or fakes in tests is a legitimate test seam. Verify no test file references the interface before flagging.
- **Pattern preparing for imminent variation**: if the PR description, linked ticket, or code comments reference a concrete, near-term second implementation (not "someday"), the pattern may be forward-looking. Flag only when no plan is documented.
- **Builder for immutable objects in languages without named parameters**: in Java or Go, a builder for a 4+ field immutable object is often the clearest construction API. Flag only when the language supports named or default parameters that would suffice.
- **Command pattern for undo/redo or audit logging**: command objects that support undo, are queued for deferred execution, or are logged for audit trails are using the pattern's full capability. Flag only when execute-and-forget is the only usage.
- **Visitor in compiler or AST processing**: visitor pattern in parsers, compilers, or AST processors with a hierarchy that grows over time is a legitimate use. Flag only when the hierarchy is tiny and stable.

## Severity Guidance

| Finding | Severity |
|---|---|
| 5+ pattern-named classes where fewer than half exhibit the pattern's structural behavior | Critical |
| Factory, strategy, or observer with one implementation and no test doubles or documented plan for variation | Important |
| Builder for an object with 2-3 fields and no complex construction logic | Important |
| Command class whose execute method is a single delegation with no undo, queue, or logging | Important |
| Decorator applied once and never composed with other decorators | Important |
| Singleton for a class with no shared state or expensive resource | Important |
| Visitor for a 1-2 node hierarchy | Minor |
| Mediator between exactly two participants | Minor |
| Pattern introduced in same PR as only implementation with TODO for second variant | Minor |
| Proxy that delegates identically to the real subject | Minor |
| Class named XxxFactory that only wraps a constructor call | Minor |

## See Also

- `antipattern-over-abstraction` -- over-abstraction is the broader category; patternitis is specifically about design pattern misuse
- `antipattern-golden-hammer` -- patternitis is the golden hammer where the hammer is "design patterns" as a category
- `smell-speculative-generality` -- patterns applied for future variation that never arrives are speculative generality
- `smell-middle-man` -- single-variant patterns often produce middle-man classes that only delegate
- `smell-lazy-class` -- a strategy interface with one strategy, or a factory that creates one type, is a lazy class with no reason to exist
- `principle-dry-kiss-yagni` -- YAGNI directly opposes patternitis: do not add pattern infrastructure until a second variant demands it
- `principle-coupling-cohesion` -- unnecessary pattern interfaces increase coupling (more dependencies) without improving cohesion
- `pattern-factory-method` -- factory method is legitimate with multiple products; patternitis when there is only one
- `pattern-strategy` -- strategy is legitimate with multiple strategies; patternitis when there is only one
- `pattern-observer` -- observer is legitimate with multiple subscribers; patternitis when there is only one
- `pattern-builder` -- builder is legitimate for complex construction; patternitis for trivial objects
- `pattern-decorator` -- decorator is legitimate when composed; patternitis when applied once

## Authoritative References

- [Erich Gamma et al., *Design Patterns: Elements of Reusable Object-Oriented Software* (1994), Introduction: "Design patterns should not be applied indiscriminately"](https://www.oreilly.com/library/view/design-patterns-elements/0201633612/)
- [Robert C. Martin, *Clean Code* (2008), Chapter 12: "Emergence" -- rule 4, "Minimal Classes and Methods"](https://www.oreilly.com/library/view/clean-code-a/9780136083238/)
- [Martin Fowler, *Refactoring* (2nd ed., 2018), "Inline Class" and "Inline Function" -- removing unnecessary indirection](https://refactoring.com/catalog/)
- [John Ousterhout, *A Philosophy of Software Design* (2018), Chapter 4: "Modules Should Be Deep" -- shallow modules (many interfaces, little functionality) are a design smell](https://web.stanford.edu/~ouster/cgi-bin/aposd.php)
- [Kent Beck, *Implementation Patterns* (2007) -- "Communication" over "cleverness"; code should communicate intent, not the author's pattern vocabulary](https://www.oreilly.com/library/view/implementation-patterns/9780321413093/)
- [Joel Spolsky, "Don't Let Architecture Astronauts Scare You" (2001)](https://www.joelonsoftware.com/2001/04/21/dont-let-architecture-astronauts-scare-you/)
