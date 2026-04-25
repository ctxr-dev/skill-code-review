---
id: smell-speculative-generality
type: primary
depth_role: leaf
focus: Detect abstractions, indirection layers, and extension points created for anticipated future needs that have no current consumers
parents:
  - index.md
covers:
  - Abstract classes or interfaces with only one implementation and no planned second
  - Generic type parameters instantiated with only one concrete type throughout the codebase
  - Hook methods or extension points never overridden or called by external code
  - "Parameters accepted by a function but never used (added for future flexibility)"
  - "Indirection layers (facades, adapters, mediators) with only one path through them"
  - Plugin or extension systems with zero plugins
  - Factory methods or abstract factories that produce only one concrete product
  - Configuration options that no deployment ever changes from the default
  - Event systems with events that have zero subscribers
  - Base classes designed for inheritance hierarchies that never materialized
tags:
  - speculative-generality
  - dispensable
  - yagni
  - over-engineering
  - abstraction
  - readability
  - architecture
  - clean-code
activation:
  file_globs:
    - "*"
  keyword_matches:
    - abstract
    - interface
    - virtual
    - override
    - generic
    - template
    - factory
    - plugin
    - provider
    - extension
    - hook
    - base
    - strategy
  structural_signals:
    - single_implementation_interface
    - unused_type_parameter
    - unused_parameter
    - unoverridden_virtual_method
source:
  origin: file
  path: smell-speculative-generality.md
  hash: "sha256:3baed41597250b54e64a121620f4028390d54f737653d4a93debd11e55e563b9"
---
# Speculative Generality

## When This Activates

Activates on any diff that introduces or modifies abstractions, generic types, extension points, or indirection layers. Speculative Generality is the Dispensable smell of premature abstraction -- code designed for flexibility that is never exercised. Each speculative layer adds cognitive overhead for readers who must understand an abstraction only to discover it has one concrete path. The litmus test: remove the abstraction and inline the single concrete implementation -- does anything break or become harder to understand? If not, the abstraction is speculative.

## Audit Surface

- [ ] Abstract class or interface has exactly one implementation and no test doubles leveraging the abstraction
- [ ] Generic type parameter is instantiated with only one type in all usages
- [ ] Virtual or overridable method is never overridden in any subclass
- [ ] Function parameter is declared but never referenced in the body
- [ ] Indirection layer (facade, mediator, adapter) has exactly one path with no branching or multiplexing
- [ ] Plugin interface or extension point is defined but zero external plugins implement it
- [ ] Factory creates only one product type with no conditional selection
- [ ] Configuration parameter has only one value across all environments and deployments
- [ ] Event or callback hook is defined but has zero subscribers or listeners
- [ ] Inheritance hierarchy has only two levels: abstract base and single concrete subclass
- [ ] Method accepts a more general type than any caller ever provides
- [ ] Code comment says "for future use", "may be needed later", or "in case we need to"
- [ ] Type parameter has a constraint that only one type in the codebase satisfies
- [ ] Builder pattern used for an object with 2-3 fields that could be a simple constructor

## Detailed Checks

### Single-Implementation Abstractions
<!-- activation: keywords=["abstract", "interface", "protocol", "trait", "implements", "extends"] -->

- [ ] Search the codebase for all implementations of the interface or subclasses of the abstract class -- if exactly one exists, the abstraction is speculative
- [ ] Check whether test code creates mocks or stubs of the interface -- a test double counts as a second implementation that justifies the abstraction
- [ ] Verify whether the interface is part of a public library or SDK boundary where consumers provide their own implementations -- library boundaries justify single-implementation interfaces
- [ ] Check the git history for the interface's age -- an interface with one implementation for 12+ months is unlikely to gain a second
- [ ] Flag abstract methods that the single implementation overrides with trivial pass-through or delegation -- the abstraction layer adds cost without adding value
- [ ] Identify interfaces where every method signature exactly mirrors the single implementation's public methods with no subsetting -- the interface is a redundant copy of the class contract

### Unused Generics and Type Parameters
<!-- activation: keywords=["generic", "template", "<T>", "<T,", "type parameter", "TypeVar", "where T"] -->

- [ ] Search for all instantiation sites of the generic type -- if only one concrete type is ever used, the generic adds complexity without flexibility
- [ ] Check whether the type parameter has constraints that only one type satisfies -- the generic is effectively a fixed type with extra syntax
- [ ] Identify generic methods where callers always pass the same type argument -- the method could accept the concrete type directly
- [ ] Flag generic collection types used to hold a single known element type throughout the codebase (e.g., `Repository<T>` always used as `Repository<User>`)
- [ ] Check whether removing the generic and hardcoding the single type simplifies method signatures, error messages, and IDE navigation

### Unoverridden Hook and Extension Points
<!-- activation: keywords=["virtual", "override", "protected", "hook", "on", "before", "after", "will", "did"] -->

- [ ] Identify virtual or protected methods intended as hook points that no subclass overrides -- the extensibility was anticipated but never exercised
- [ ] Check for event hooks (onBefore, onAfter, willChange, didChange) with zero registered listeners -- the notification system has no audience
- [ ] Flag template method patterns where the abstract steps have only one implementation -- the template adds indirection without multiple concrete variants
- [ ] Identify callback parameters or function-typed arguments that are always called with the same function -- the callback could be hardcoded
- [ ] Check for middleware or interceptor chains with exactly one element -- the chain infrastructure is overhead for a single step

### Unused Parameters and Over-General Signatures
<!-- activation: keywords=["param", "arg", "argument", "unused", "function ", "def ", "func "] -->

- [ ] Flag function parameters that are never referenced in the method body -- they were added for anticipated future use or left over from a refactoring
- [ ] Identify parameters typed as a base class or interface when callers always pass a specific subclass -- the over-general type suggests anticipated polymorphism that did not materialize
- [ ] Check for methods that accept a configuration or options object where most fields are always set to their defaults -- the configuration surface is speculative
- [ ] Flag variadic parameters or rest arguments that are always called with a fixed number of arguments
- [ ] Identify methods with parameters guarded by comments like "reserved for future use" or "not yet implemented"

### Speculative Patterns and Architectural Layers
<!-- activation: keywords=["factory", "builder", "provider", "strategy", "adapter", "facade", "mediator", "plugin", "extension", "registry"] -->

- [ ] Flag factory methods or classes that always produce the same concrete type -- the factory indirection provides no selection benefit
- [ ] Identify builder patterns used for objects with 2-3 fields where a simple constructor or static factory method would be clearer
- [ ] Check for adapter or facade layers that wrap a single service with no adaptation logic -- the layer adds a hop without transforming anything
- [ ] Flag strategy pattern implementations with only one strategy -- inline the strategy until a second variant is needed
- [ ] Identify registry or plugin systems with zero registered plugins or extensions -- the registry infrastructure serves no current consumer
- [ ] Check for mediator or event bus systems with only one publisher and one subscriber -- direct communication would be simpler
- [ ] Flag provider abstractions that always return the same instance or value -- the provider is a constant with extra ceremony

### Future-Use Comments and YAGNI Violations
<!-- activation: keywords=["future", "later", "TODO", "eventually", "might", "may need", "in case", "placeholder"] -->

- [ ] Flag code accompanied by comments like "for future use", "placeholder for", "will be used when", or "may be needed later" -- the feature should be built when needed, not before
- [ ] Identify classes or modules with names containing "Base", "Abstract", "Generic", or "Common" that serve only one consumer
- [ ] Check for configuration infrastructure (config files, environment variable readers, feature flags) for features that do not yet exist
- [ ] Flag empty interface implementations (all methods are no-ops) created as placeholders for future functionality
- [ ] Identify pre-built extension points mentioned in architecture documents but not exercised by any current requirement

## Common False Positives

- **Dependency injection for testing**: Interfaces with one production implementation but used with mocks or stubs in tests are not speculative -- testability is a current need, not a future one.
- **Public library APIs**: Libraries and SDKs must provide extension points for consumers. A single internal implementation is expected when the library invites external implementations.
- **Framework contracts**: Frameworks (Spring, ASP.NET, Rails) require implementing interfaces or extending base classes. The abstraction is mandated, not speculative.
- **Serialization and protocol compliance**: Generic types used in serialization frameworks (e.g., `JsonSerializer<T>`) are required by the framework even when used with few types.
- **Architectural boundaries**: Interfaces at architectural boundaries (between layers, between microservices) exist to enforce decoupling, not for polymorphism. They earn their existence by preventing import direction violations.
- **Upcoming planned work**: If a second implementation is actively in development on another branch or tracked in a sprint, the abstraction is timely, not speculative. Verify with the team before flagging.

## Severity Guidance

| Finding | Severity |
|---|---|
| Multi-layer abstraction (interface + abstract class + factory + builder) serving one concrete type | Important |
| Plugin or extension system with zero plugins and no external consumer documentation | Important |
| Unused function parameters that mislead callers about what the function needs | Important |
| Interface with one implementation and no test doubles, unchanged for 12+ months | Minor |
| Generic type instantiated with one concrete type in a small codebase | Minor |
| Virtual method never overridden in any subclass | Minor |
| Builder for an object with 2-3 fields | Minor |
| "For future use" comment on a parameter or method | Minor |

## See Also

- `smell-lazy-class` -- speculative abstractions often create lazy classes: the interface, the abstract base, and the single implementation where only the implementation does work
- `principle-dry-kiss-yagni` -- YAGNI is the direct principle violated by speculative generality; build what is needed now, not what might be needed later
- `smell-dead-code` -- speculative extension points that are never exercised are a form of dead code; the hook exists but nobody calls it
- `principle-separation-of-concerns` -- speculative layers add artificial separation that does not correspond to distinct concerns

## Authoritative References

- [Martin Fowler, "Refactoring" (2018), Speculative Generality smell](https://refactoring.com/catalog/)
- [Ron Jeffries, "You Aren't Gonna Need It" (XP principle)](https://ronjeffries.com/xprog/articles/practices/pracnotneed/)
- [Robert C. Martin, "Clean Code" (2008), Chapter 17: Smells and Heuristics](https://www.oreilly.com/library/view/clean-code-a/9780136083238/)
- [Martin Fowler, "Refactoring" (2018), Collapse Hierarchy / Inline Class](https://refactoring.com/catalog/)
