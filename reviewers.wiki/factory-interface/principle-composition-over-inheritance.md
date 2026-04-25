---
id: principle-composition-over-inheritance
type: primary
depth_role: leaf
focus: "Detect inappropriate inheritance hierarchies and promote delegation/composition as the default reuse mechanism."
parents:
  - index.md
covers:
  - "Deep inheritance hierarchies (>2 levels) that create fragile coupling"
  - "Convenience base class smell: base class exists only to share utility code"
  - "Mixin abuse: excessive mixin/trait layering creating diamond or ordering problems"
  - Inheritance for code reuse rather than genuine is-a subtyping
  - Delegation and strategy patterns as alternatives to inheritance
  - Framework-mandated inheritance vs. voluntary inheritance
  - Template method overuse where strategy pattern is more flexible
  - "Override fragility: subclass behavior depends on parent implementation details"
  - "Parallel inheritance hierarchies (adding one subclass requires adding others)"
  - Favor composition of small, focused behaviors over monolithic base classes
tags:
  - composition
  - inheritance
  - delegation
  - strategy
  - mixins
  - design-patterns
  - reuse
activation:
  file_globs:
    - "**/*.{java,kt,scala,cs,ts,js,py,rb,go,rs,swift,cpp,h,hpp}"
  keyword_matches:
    - extends
    - inherits
    - super
    - base
    - mixin
    - override
    - abstract class
    - virtual
    - trait
    - "with "
    - "include "
    - "class.*<.*>"
    - open class
  structural_signals:
    - class_inheritance
    - method_override
    - mixin_composition
    - abstract_class_definition
source:
  origin: file
  path: principle-composition-over-inheritance.md
  hash: "sha256:c12fe978388c6394691757d010b0b20d42e73d6e6917f894c0d6f01759665ad2"
---
# Composition Over Inheritance

## When This Activates

Activates when diffs introduce class inheritance, extend existing hierarchies, add mixins/traits, or override methods. Inheritance is the tightest form of coupling in OOP -- it should be reserved for genuine subtype relationships, not used as a convenience mechanism for code sharing.

## Audit Surface

- [ ] New class extending a concrete (non-abstract) class is justified as a true is-a relationship
- [ ] Inheritance hierarchy does not exceed 2 levels beyond framework-mandated base classes
- [ ] Base class defines a genuine subtype contract, not just shared utility methods
- [ ] Subclass does not override the majority of parent methods (suggests wrong abstraction)
- [ ] Mixins/traits composed together have no overlapping method names or ordering-sensitive behavior
- [ ] Subclass actually uses most of the inherited interface; no large inherited surface goes unused
- [ ] Subclass behavior does not depend on parent's internal call ordering (fragile base class)
- [ ] No parallel inheritance hierarchies where adding one variant forces additions in multiple trees
- [ ] Protected members in the base class serve the subtype contract, not ad-hoc sharing
- [ ] Abstract class has at least 2 concrete subclasses (no premature abstraction)
- [ ] Composition/delegation was considered before reaching for inheritance
- [ ] Has-a relationships are modeled with fields/properties, not inheritance
- [ ] Constructor chains through the hierarchy are shallow and comprehensible
- [ ] God base class has not accumulated unrelated utility state and methods

## Detailed Checks

### Hierarchy Depth and Fragile Base Class
<!-- activation: keywords=["extends", "super", "base", "override", "virtual", "abstract class", "open class"] -->

- [ ] **Depth check**: count inheritance levels from the concrete class to `Object`/root, excluding framework base classes; flag hierarchies deeper than 3 levels
- [ ] **Fragile base class test**: does the subclass call `super.method()` in an override? If the parent reorders or modifies its internal method calls, does the subclass break?
- [ ] **Override ratio**: if a subclass overrides more than 50% of parent's non-final methods, the parent is likely the wrong abstraction -- consider replacing inheritance with composition
- [ ] **Base class modification frequency**: if the base class is modified frequently, all subclasses are at risk of breakage -- this is the core fragile base class problem
- [ ] **Constructor chain complexity**: constructors passing 5+ parameters through `super()` across multiple levels are hard to reason about; flatten with composition
- [ ] **Down-call antipattern**: base class constructor calls a virtual/overridable method that subclass overrides -- subclass is invoked before its constructor completes

### Convenience Base Class and Reuse Misuse
<!-- activation: keywords=["Base", "Abstract", "Common", "Shared", "Default", "Mixin", "Helper"] -->

- [ ] **Is-a vs. has-a test**: can you say "SubClass IS-A BaseClass" in the domain language? If it only makes sense as "SubClass USES features of BaseClass," prefer composition
- [ ] **Utility base class smell**: base class named `BaseX`, `CommonX`, `AbstractX`, or `SharedX` that provides grab-bag utility methods rather than defining a polymorphic contract
- [ ] **Single-subclass abstract class**: abstract class with only one implementation is premature abstraction -- inline the abstraction until a second variant emerges
- [ ] **Inherited baggage**: subclass inherits 20 methods but only uses 3 -- the rest are dead weight coupling the subclass to unnecessary parent implementation
- [ ] **Test-only inheritance**: class extends another solely to reuse test setup -- prefer test helper composition or shared fixtures
- [ ] **Configuration inheritance**: inheriting from a base class to get default configuration values -- use composition with a config object instead

### Mixin and Trait Abuse
<!-- activation: keywords=["mixin", "trait", "with ", "include", "module", "protocol extension", "default implementation"] -->

- [ ] **Mixin count**: class composes more than 3-4 mixins/traits -- cognitive load becomes unmanageable; consolidate or rethink the decomposition
- [ ] **Method name collision**: two mixins provide methods with the same name -- resolution order becomes significant and fragile
- [ ] **Stateful mixins**: mixins that introduce mutable instance state are especially dangerous in multiple-mixin compositions; state ownership becomes ambiguous
- [ ] **Diamond problem**: two mixins inherit from a common ancestor, creating ambiguous method resolution
- [ ] **Mixin for namespace**: mixin used solely to inject convenience methods into a class -- prefer explicit delegation or a composed service object
- [ ] **Ordering sensitivity**: behavior changes depending on the order mixins are listed -- this is fragile and confusing

### Composition and Delegation Alternatives
<!-- activation: keywords=["delegate", "strategy", "compose", "inject", "wrap", "decorate", "adapter", "forward"] -->

- [ ] **Strategy extraction**: when subclasses differ only in one algorithm or behavior, extract a strategy interface and inject the variant behavior
- [ ] **Decorator opportunity**: when adding cross-cutting behavior (logging, caching, validation) to a class, prefer decorator/wrapper over subclassing
- [ ] **Delegation simplicity**: behavior reuse via a composed helper object with explicit delegation is more transparent than inherited behavior from a base class
- [ ] **Interface composition**: in languages supporting it (Go, Rust, TypeScript), prefer composing small interfaces over building inheritance trees
- [ ] **Has-a refactoring**: if a subclass relationship could be refactored to "ClassA has a field of type ClassB" without losing expressiveness, composition is the better model
- [ ] **Template Method vs. Strategy**: Template Method (inheritance-based) is appropriate when the overall algorithm is fixed; if variants diverge significantly, Strategy (composition-based) is more flexible

## Common False Positives

- **Framework-mandated inheritance**: many frameworks require extending base classes (React.Component, Django View, Spring Controller). These are acceptable; the concern is *voluntary* inheritance beyond what the framework requires.
- **Algebraic data type hierarchies**: sealed class/interface hierarchies modeling sum types (e.g., `Shape = Circle | Rectangle`) are proper use of inheritance for exhaustive type discrimination.
- **Genuine is-a taxonomies**: a domain model where `SavingsAccount extends BankAccount` represents a real business subtype relationship is appropriate inheritance.
- **Language idioms**: some languages (Java pre-8, early Python) had limited composition mechanisms, making inheritance the practical choice. Judge modern code by modern alternatives.
- **Trait-based polymorphism in Rust/Go**: Rust traits and Go interfaces are composition mechanisms despite using similar syntax to inheritance; they are the *solution*, not the problem.
- **Single-level inheritance**: one level of inheritance below an abstract class with a clear contract is normal and expected.

## Severity Guidance

| Finding | Severity |
|---|---|
| Inheritance hierarchy 4+ levels deep with fragile super calls | high |
| Concrete class extended for code reuse with no subtype relationship | high |
| Down-call in base class constructor to overridable method | high |
| God base class with 15+ methods accumulated over time | medium |
| Mixin composition with method name collisions | medium |
| Single-subclass abstract class (premature abstraction) | medium |
| Subclass inheriting large interface but using small fraction | medium |
| 4+ mixins on a single class | medium |
| Parallel inheritance hierarchy requiring coupled additions | medium |
| Template Method used where Strategy would be more flexible | low |
| Minor convenience inheritance in internal/private code | low |

## See Also

- `principle-solid` -- LSP violations often stem from inappropriate inheritance; ISP flags inherited interface bloat
- `principle-encapsulation` -- inheritance breaks encapsulation by coupling subclass to parent internals
- `principle-grasp` -- Polymorphism pattern guides when inheritance IS appropriate; Indirection guides when composition is better
- `principle-tell-dont-ask` -- composition with delegation naturally supports tell-dont-ask style

## Authoritative References

- [Gang of Four, *Design Patterns* (1994), Chapter 1: "Favor object composition over class inheritance"](https://www.oreilly.com/library/view/design-patterns-elements/0201633612/)
- [Joshua Bloch, *Effective Java* (3rd ed., 2018), Item 18: Favor composition over inheritance](https://www.oreilly.com/library/view/effective-java/9780134686097/)
- [Sandi Metz, *Practical Object-Oriented Design* (2nd ed., 2018), Chapter 8: Combining Objects with Composition](https://www.poodr.com/)
- [Martin Fowler, "Replace Inheritance with Delegation" refactoring](https://refactoring.com/catalog/replaceInheritanceWithDelegation.html)
