---
id: pattern-abstract-factory
type: primary
depth_role: leaf
focus: Detect misuse, over-application, and absence of the Abstract Factory pattern when creating families of related objects.
parents:
  - index.md
covers:
  - Abstract factory producing unrelated objects that violate family cohesion
  - Abstract factory overkill when only a single product type exists
  - Factory hierarchy where a simple factory method would suffice
  - Missing abstract factory when multiple related objects must vary together
  - Concrete factory instantiated directly instead of injected or resolved
  - "Inconsistent product families: factory A creates products X+Y but factory B only creates X"
  - "Abstract factory interface growing with every new product type (ISP violation)"
  - "Factory returning products from mixed families (cross-contamination)"
  - Abstract factory confused with service locator or dependency injection container
  - "Platform/theme/environment switching done via if/else instead of factory families"
  - Factory methods returning concrete types instead of abstractions
  - Factory methods that are thin wrappers around constructors with no polymorphic intent
  - God-switch factory methods with growing case lists violating OCP
  - Missing factory methods where callers are coupled to concrete constructors
  - Factory methods with side effects beyond object creation
  - "Factory method return type too broad (returns Object/any) or too narrow (returns concrete)"
  - Static factory methods confused with the Factory Method design pattern
  - Factory methods that silently return null instead of failing fast
  - Factory method naming inconsistency within the same codebase
  - "Factory methods in wrong location (on the product instead of the creator)"
tags:
  - abstract-factory
  - creational-pattern
  - design-patterns
  - product-family
  - object-creation
  - factory-method
  - polymorphism
aliases:
  - pattern-factory-method
activation:
  file_globs:
    - "**/*.{java,kt,scala,cs,ts,js,py,rb,go,rs,swift,cpp,h,hpp,php}"
  keyword_matches:
    - AbstractFactory
    - Factory
    - create
    - family
    - suite
    - kit
    - provider
    - registry
    - theme
    - platform
    - variant
  structural_signals:
    - interface_with_multiple_create_methods
    - parallel_class_hierarchies
    - factory_injection
source:
  origin: file
  path: pattern-abstract-factory.md
  hash: "sha256:c5cca921e45b93cdc2ec49ad10739fc26ee92a75c092b5757233027556ab86c2"
---
# Abstract Factory Pattern

## When This Activates

Activates when diffs introduce factory interfaces with multiple creation methods, add parallel class hierarchies for products and their creators, or contain platform/theme/variant switching logic that creates families of related objects. The Abstract Factory pattern is frequently over-applied (wrapping a single product in a factory hierarchy) and under-applied (scattering family-selection logic across client code).

## Audit Surface

- [ ] All products created by a single abstract factory belong to one cohesive family (UI kit, database suite, protocol stack)
- [ ] The factory hierarchy is justified: at least two concrete families exist or are concretely planned
- [ ] The abstract factory interface is not a single-product factory disguised with unnecessary ceremony
- [ ] Concrete factories are injected or resolved, never directly instantiated by client code
- [ ] Every concrete factory implements all create methods; no missing or stubbed-out product creators
- [ ] Products from different families are never mixed in the same client context
- [ ] The abstract factory interface is narrow enough that adding a new product does not force all concrete factories to change
- [ ] Factory method names use abstract product terminology, not concrete type names
- [ ] Client code depends on the abstract factory interface, not on any concrete factory
- [ ] Platform/theme/environment selection is centralized in factory selection logic, not scattered across business code
- [ ] The pattern is not duplicating what a DI container already provides
- [ ] No runtime type checks are needed to determine which products a factory produces
- [ ] Product types created by the factory have a genuine "must vary together" relationship
- [ ] Abstract factory is not confused with a service locator that returns unrelated services

## Detailed Checks

### Family Cohesion Violations
<!-- activation: keywords=["create", "make", "produce", "factory", "family", "suite", "kit"] -->

- [ ] **Unrelated products**: factory interface declares create methods for objects that have no conceptual "vary together" relationship -- e.g., a factory that creates both `Logger` and `UserRepository` is a service locator, not an abstract factory
- [ ] **Cross-family contamination**: a single concrete factory pulls products from multiple families -- e.g., `DarkThemeFactory.createButton()` returns a dark button but `createIcon()` returns a default-theme icon
- [ ] **Family identity test**: if you swap the entire concrete factory for a different one, do ALL products change cohesively? If some products stay the same, they do not belong in this factory
- [ ] **Product coupling**: products created by the same factory should interoperate without further adaptation; if they require adapters or converters, the family boundary is wrong
- [ ] **Growing factory interface**: each new product type adds a method to the abstract factory, forcing all concrete factories to implement it -- consider a parameterized create method or a separate factory

### Over-Application (Patternitis)
<!-- activation: keywords=["Factory", "Abstract", "interface", "create", "implement"] -->

- [ ] **Single product family**: abstract factory with only one concrete factory -- unless a second family is imminent, this is YAGNI; a simple factory method or constructor suffices
- [ ] **Single product per family**: factory interface with just one create method -- this is a factory method, not an abstract factory; remove the unnecessary abstraction layer
- [ ] **Thin factory passthrough**: concrete factories that do nothing but call product constructors with no configuration, caching, or composition -- the factory is not earning its keep
- [ ] **Test-only justification**: abstract factory exists solely to swap in test doubles -- dependency injection or constructor injection achieves the same result with less ceremony
- [ ] **Future-proofing without evidence**: factory hierarchy created "in case we need another family later" -- violates YAGNI; introduce the pattern when the second family actually arrives

### Missing Abstract Factory
<!-- activation: keywords=["if", "switch", "platform", "theme", "variant", "os", "environment", "config", "dark", "light"] -->

- [ ] **Scattered family selection**: client code contains repeated if/switch blocks choosing between product variants (e.g., `if (os == "windows") new WinButton(); else new MacButton();`) -- centralize in a factory
- [ ] **Inconsistent family selection**: different parts of the codebase select product variants independently, risking mixed families (dark theme buttons with light theme scrollbars)
- [ ] **Copy-paste product creation**: the same multi-product creation sequence (create A, create B, wire them together) is duplicated in multiple places -- a factory would encapsulate this
- [ ] **Configuration-driven families**: product selection depends on config/env but the selection logic is embedded in business code instead of a factory resolved at startup
- [ ] **New variant difficulty**: adding a new product family (new theme, new platform) requires editing dozens of files with conditionals instead of adding one new concrete factory

### Concrete Factory Exposure
<!-- activation: keywords=["new", "import", "instantiate", "resolve", "inject", "bind"] -->

- [ ] **Direct concrete factory instantiation**: client code uses `new DarkThemeFactory()` instead of receiving the factory through injection or a configuration-driven resolver
- [ ] **Import coupling**: client module imports the concrete factory class; it should only import the abstract factory interface
- [ ] **Factory selection in business logic**: the choice of which concrete factory to use is embedded in domain code instead of being resolved at the composition root
- [ ] **Hardcoded factory in tests**: test code instantiates a specific concrete factory instead of using a test factory; when a new product is added, all tests break

### Interface Design Issues
<!-- activation: keywords=["interface", "abstract", "trait", "protocol", "method", "create"] -->

- [ ] **Fat factory interface**: factory declares 6+ create methods, making every new concrete factory expensive to implement -- split into smaller, role-specific factory interfaces
- [ ] **Asymmetric factories**: one concrete factory implements all create methods but another stubs half of them with `throw NotImplementedError` -- the families are not truly parallel
- [ ] **Leaky product names**: factory method named `createPostgreSQLConnection()` instead of `createConnection()` -- the abstract interface should not reveal concrete product identities
- [ ] **Missing type safety**: factory returns `Object`/`any` and callers downcast -- the abstract factory should use generic type parameters or separate typed methods
- [ ] **Product creation order dependency**: products must be created in a specific sequence (A before B) but the factory interface does not enforce or document this constraint

## Common False Positives

- **DI container module definitions**: frameworks like Dagger, Guice, or .NET DI modules define multi-binding "factories" as part of their container configuration. These are not Abstract Factory pattern instances.
- **Builder/configuration objects**: classes that configure multiple related settings (ThemeConfig with colors, fonts, spacing) are configuration objects, not abstract factories, even if they produce variant groups.
- **Plugin registries**: a registry mapping plugin IDs to constructors serves a different purpose than an Abstract Factory, even though both produce objects polymorphically.
- **Test fixture factories**: test utility methods that create families of related test objects (`createTestOrder()` which also creates customer and items) are test helpers, not pattern instances.
- **Factory functions in functional languages**: higher-order functions returning configured closures are idiomatic, not Abstract Factory misuse.

## Severity Guidance

| Finding | Severity |
|---|---|
| Factory creates unrelated objects violating family cohesion | high |
| Products from different families mixed in client context | high |
| Scattered platform/theme conditionals instead of factory families | medium |
| Abstract factory with only one concrete family and no planned second | medium |
| Concrete factory directly instantiated instead of injected | medium |
| Factory interface growing unboundedly with each new product type | medium |
| Single-product abstract factory (should be factory method) | low |
| Minor naming inconsistency in factory methods | low |
| Abstract factory wrapping simple constructor delegation | low |

## See Also

- `pattern-factory-method` -- simpler alternative when only one product type varies; Abstract Factory composes multiple factory methods
- `pattern-builder` -- when product construction is complex and step-by-step, Builder may be more appropriate than a factory
- `principle-solid` -- Abstract Factory supports OCP (new families without modifying clients) and ISP (keep factory interfaces narrow)

## Authoritative References

- [Erich Gamma et al., *Design Patterns: Elements of Reusable Object-Oriented Software* (1994), Abstract Factory](https://www.oreilly.com/library/view/design-patterns-elements/0201633612/)
- [Robert C. Martin, *Agile Software Development: Principles, Patterns, and Practices* (2002), Chapter 29: Abstract Factory](https://www.pearson.com/en-us/subject-catalog/p/agile-software-development-principles-patterns-and-practices/P200000009483/)
- [Mark Seemann, *Dependency Injection in .NET* (2nd ed., 2019), Chapter 6: Composition Root and Factories](https://www.manning.com/books/dependency-injection-principles-practices-patterns)
