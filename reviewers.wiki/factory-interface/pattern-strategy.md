---
id: pattern-strategy
type: primary
depth_role: leaf
focus: Detect misuse, over-application, and absence of the Strategy pattern in algorithm-selection code.
parents:
  - index.md
covers:
  - Strategy interface with only one implementation, adding abstraction without benefit
  - "Strategies selected by if/else or switch instead of dependency injection or registry lookup"
  - Strategy that depends on context internals, coupling strategy to its consumer
  - Strategies sharing mutable state through the context object
  - Missing strategy where conditional branching duplicates algorithm logic across call sites
  - Strategy interface too broad -- forces implementations to provide methods they do not need
  - Strategy selection logic scattered across multiple call sites instead of centralized
  - Context class that checks strategy type before delegating, defeating polymorphic dispatch
  - Strategies with overlapping responsibilities producing ambiguous selection
  - Strategy swapped at runtime without thread safety in concurrent contexts
tags:
  - strategy
  - behavioral-pattern
  - design-patterns
  - algorithm
  - policy
  - injection
  - composition
activation:
  file_globs:
    - "**/*.{java,kt,scala,cs,ts,js,py,rb,go,rs,swift,cpp,h,hpp,php}"
  keyword_matches:
    - Strategy
    - strategy
    - policy
    - algorithm
    - sort
    - compare
    - handler
    - processor
    - resolver
    - provider
    - behavior
  structural_signals:
    - interface_with_single_method_injected_into_class
    - if_else_chain_selecting_algorithm
    - class_accepting_behavior_parameter
source:
  origin: file
  path: pattern-strategy.md
  hash: "sha256:2cd357b7d893d11d7cfffe809acf3ac63d2f5b656ca461540b07d3713028fbee"
---
# Strategy Pattern

## When This Activates

Activates when diffs introduce interfaces or abstract classes representing interchangeable algorithms (comparators, validators, formatters, pricing policies), inject behavior via constructor or method parameters, add if/else or switch blocks selecting between algorithm variants, or define classes named `*Strategy`, `*Policy`, `*Handler`, `*Processor`. The Strategy pattern enables open/closed extension of algorithms, but it becomes harmful when there is only one implementation, when selection logic undermines polymorphism, or when strategies couple back to the context's internals.

## Audit Surface

- [ ] Strategy interface has more than one concrete implementation, or a second implementation is clearly anticipated
- [ ] Strategy is injected into the context (constructor, setter, method parameter) rather than selected by if/else or switch inside the context
- [ ] Strategy implementation depends only on data passed through the strategy method parameters, not on context internals
- [ ] Strategies are stateless or manage their own isolated state -- no shared mutable state via context
- [ ] Duplicated conditional logic across call sites has been consolidated into a strategy or extracted behind a factory
- [ ] Strategy interface is narrow: every method is meaningful for every implementation (Interface Segregation)
- [ ] Strategy selection logic is centralized in a factory, registry, or DI configuration
- [ ] Context delegates to the strategy polymorphically without type-checking the strategy instance
- [ ] No two strategy implementations are behaviorally identical (redundant implementations)
- [ ] Strategy field assignment is thread-safe if the context is shared across threads
- [ ] Strategy does not require the context object in its constructor, avoiding circular dependencies
- [ ] Lambda strategies do not capture mutable variables from the enclosing scope
- [ ] Context passes only the data the strategy needs, not a reference to itself
- [ ] Stateless strategies are reused (singleton or cached) rather than re-instantiated per call
- [ ] Default strategy is a no-op or sensible default implementation, not null

## Detailed Checks

### Single-Implementation Strategy (YAGNI)
<!-- activation: keywords=["Strategy", "interface", "implements", "abstract", "only", "single", "one"] -->

- [ ] **Premature abstraction**: strategy interface has exactly one implementation and no tests or documentation suggest additional implementations are planned -- the interface is unnecessary indirection
- [ ] **Speculative generality**: strategy was introduced "for future extensibility" but the second implementation never materialized after months -- remove the abstraction until a second variant is needed
- [ ] **Test double does not count**: the only second "implementation" is a mock or stub in tests -- this does not justify the abstraction in production code; a simple function or direct implementation suffices
- [ ] **Interface with default methods only**: strategy interface provides default implementations for all methods and the single concrete class overrides none -- the interface is ceremonial

### Selection by Conditional Instead of Injection
<!-- activation: keywords=["if", "else", "switch", "case", "select", "choose", "resolve", "map", "factory", "registry", "config"] -->

- [ ] **If/else selection in context**: the context class contains `if (type == A) use strategyA else if (type == B) use strategyB` -- this defeats OCP; new strategies require modifying the context
- [ ] **Switch on enum or string**: a switch statement maps enum values or string identifiers to strategy instances -- extract to a factory or registry so the context remains closed to modification
- [ ] **Duplicated selection logic**: the same if/else or switch selecting a strategy appears in multiple classes -- centralize in a single factory or DI configuration
- [ ] **Hardcoded strategy in context constructor**: context always creates the same concrete strategy in its constructor instead of accepting it as a parameter -- cannot vary behavior without modifying the context
- [ ] **Configuration-driven selection without registry**: strategy type is read from config but resolved via a chain of if/else instead of a map lookup or service locator

### Strategy-Context Coupling
<!-- activation: keywords=["context", "internal", "field", "private", "getState", "getData", "this", "self", "accessor", "coupling"] -->

- [ ] **Strategy accesses context internals**: strategy calls context's private or package-private methods, or accesses its fields directly -- the strategy is coupled to the context's implementation, not its interface
- [ ] **Context passes itself to strategy**: `strategy.execute(this)` exposes the entire context API surface to the strategy -- pass only the data the strategy needs as explicit parameters
- [ ] **Circular dependency**: strategy holds a reference to the context and the context holds a reference to the strategy -- refactor to pass data through method parameters instead
- [ ] **Strategy casts context to concrete type**: strategy receives a context interface but casts it to a concrete class to access additional methods -- breaks the abstraction boundary
- [ ] **Strategy reads context state that changes between calls**: strategy's behavior depends on context state that may change, but the strategy caches the value from its first call -- stale data risk

### Shared Mutable State Between Strategies
<!-- activation: keywords=["state", "mutable", "shared", "field", "cache", "accumulate", "counter", "buffer", "thread", "concurrent"] -->

- [ ] **Strategies sharing mutable context fields**: context passes a mutable map/list/buffer to multiple strategies across calls, and strategies modify it -- one strategy's side effects leak to another
- [ ] **Strategy with instance state reused across contexts**: a single strategy instance holds mutable fields and is shared by multiple context instances -- cross-context contamination
- [ ] **Non-thread-safe strategy in concurrent context**: strategy holds mutable state and the context invokes it from multiple threads -- add synchronization or make the strategy stateless
- [ ] **Strategy accumulates state across invocations**: strategy caches results from previous calls, producing different behavior on identical inputs depending on call history

### Missing Strategy (Duplicated Conditional Logic)
<!-- activation: keywords=["if", "else", "switch", "case", "duplicate", "copy", "branch", "conditional", "same", "similar"] -->

- [ ] **Duplicated algorithm branching**: the same `if (type == A) ... else if (type == B) ...` logic selecting an algorithm appears in 3+ methods or classes -- extract into a strategy with polymorphic dispatch
- [ ] **Open/closed violation**: adding a new algorithm variant requires modifying existing code in multiple locations -- a strategy interface would allow adding a new implementation class without touching existing code
- [ ] **Conditional with complex branches**: an if/else chain has 4+ branches, each containing 10+ lines of algorithm logic -- the method is too long and each branch is a strategy candidate
- [ ] **Type code driving behavior**: a class uses an enum or int field to select behavior in multiple methods -- replace the type code with a strategy object (Replace Conditional with Polymorphism refactoring)

### Over-Applied Strategy
<!-- activation: keywords=["Strategy", "policy", "simple", "trivial", "wrapper", "unnecessary", "abstraction", "over-engineer"] -->

- [ ] **Strategy for trivial variation**: a strategy interface wraps a single expression or one-liner that differs between implementations -- a lambda parameter or simple function is more appropriate
- [ ] **Strategy with rigid interface for heterogeneous behaviors**: strategy interface forces all implementations into the same method signature, but the behaviors differ fundamentally -- they are not interchangeable algorithms
- [ ] **Strategy per configuration value**: each strategy implementation differs only in a constant or configuration parameter -- a single parameterized implementation suffices

## Common False Positives

- **Comparator/Predicate in standard libraries**: `Comparator<T>`, `Predicate<T>`, `Function<T,R>` are language-level strategy patterns. Do not flag standard library usage as pattern overhead.
- **DI-registered services**: framework-managed services injected via DI (Spring `@Service`, .NET `IServiceCollection`) follow strategy principles. Do not flag as "over-applied strategy" unless only one implementation exists permanently.
- **Sort comparators**: custom comparators passed to sort functions are canonical strategy usage. Do not flag.
- **Middleware/plugin systems**: Express middleware, webpack plugins, and similar extensibility points are strategy-like by design. Flag only if the extension point has a single permanent plugin.
- **Functional programming higher-order functions**: passing functions as parameters in FP languages is idiomatic, not "strategy pattern ceremony."

## Severity Guidance

| Finding | Severity |
|---|---|
| Strategy accesses context private internals, tightly coupling strategy to implementation | high |
| Duplicated if/else algorithm selection logic in 5+ locations | high |
| Non-thread-safe strategy shared across concurrent contexts | high |
| If/else or switch selecting strategy inside context, violating OCP | medium |
| Strategy interface with exactly one implementation and no clear second use case | medium |
| Strategies sharing mutable state through context | medium |
| Context type-checks strategy instance before delegating | medium |
| Strategy selection logic copy-pasted across 3+ call sites | medium |
| Default strategy is null instead of no-op | medium |
| Strategy interface too broad, forcing no-op methods in implementations | low |
| Stateless strategy re-instantiated on every call | low |
| Trivial behavior wrapped in full strategy interface when a lambda suffices | low |

## See Also

- `principle-solid` -- strategies support OCP (add new algorithms without modifying context) and DIP (context depends on strategy abstraction, not concrete algorithms)
- `principle-coupling-cohesion` -- strategies decouple algorithm selection from algorithm implementation; coupling back to context internals defeats this
- `pattern-factory-method` -- factory method can be used to create strategies; check that factory logic does not duplicate the if/else the strategy was meant to eliminate
- `principle-composition-over-inheritance` -- strategy favors composition over inheritance for varying behavior; check that template method was not a better fit for fixed-skeleton algorithms

## Authoritative References

- [Erich Gamma et al., *Design Patterns: Elements of Reusable Object-Oriented Software* (1994), Strategy](https://www.oreilly.com/library/view/design-patterns-elements/0201633612/)
- [Robert C. Martin, *Agile Software Development* (2002), Chapter 22: Strategy and Template Method](https://www.oreilly.com/library/view/agile-software-development/0135974445/)
- [Martin Fowler, *Refactoring* (2nd ed., 2018), Replace Conditional with Polymorphism](https://refactoring.com/catalog/replaceConditionalWithPolymorphism.html)
- [Joshua Kerievsky, *Refactoring to Patterns* (2004), Replace Conditional Logic with Strategy](https://www.oreilly.com/library/view/refactoring-to-patterns/0321213351/)
