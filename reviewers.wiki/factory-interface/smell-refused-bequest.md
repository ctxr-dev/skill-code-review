---
id: smell-refused-bequest
type: primary
depth_role: leaf
focus: Detect subclasses that reject or ignore inherited methods and fields, signaling a broken inheritance contract.
parents:
  - index.md
covers:
  - Subclass overriding parent method with empty body, no-op, or pass
  - Subclass overriding parent method to throw NotImplementedError or UnsupportedOperationException
  - Subclass using only a small fraction of inherited methods, ignoring the rest
  - Subclass created for one method while inheriting a large interface it does not need
  - Inheritance used for code reuse where the subclass is not substitutable for the parent
  - Subclass that removes or restricts capabilities the parent advertises
  - "Overridden method returning hardcoded default to avoid implementing parent's contract"
  - Subclass ignoring inherited fields that are meaningless for its purpose
  - Abstract method implemented with throw or empty body because the subclass does not need it
  - Subclass violating Liskov Substitution Principle by narrowing parent behavior
tags:
  - refused-bequest
  - code-smell
  - oo-abusers
  - inheritance
  - lsp
  - substitutability
  - liskov
activation:
  file_globs:
    - "**/*.{java,kt,scala,cs,ts,js,py,rb,go,rs,swift,cpp,h,hpp,php}"
  keyword_matches:
    - extends
    - inherits
    - override
    - super
    - base
    - abstract
    - NotImplementedError
    - UnsupportedOperationException
    - pass
    - noop
    - throw
  structural_signals:
    - override_with_empty_body
    - override_throwing_not_implemented
    - subclass_using_few_parent_methods
source:
  origin: file
  path: smell-refused-bequest.md
  hash: "sha256:deaa98350551a6f8f8c7daee633a7d1adf67c9d8475e77c4434d0dcb2a39f704"
---
# Refused Bequest Smell

## When This Activates

Activates when diffs introduce subclasses that override parent methods with no-ops, throw exceptions for methods they do not support, use only a fraction of the inherited interface, or otherwise reject the contract that the parent class establishes. A subclass that refuses its bequest signals a broken is-a relationship -- the subclass is not truly substitutable for the parent, violating the Liskov Substitution Principle. The inheritance exists for code reuse convenience rather than genuine subtyping.

## Audit Surface

- [ ] No subclass override has an empty body, pass statement, or return-only stub
- [ ] No subclass override throws NotImplementedError, UnsupportedOperationException, or equivalent
- [ ] Subclass uses the majority of inherited methods, not just a small fraction
- [ ] Subclass was not created solely to reuse one parent method while ignoring the rest
- [ ] Subclass does not restrict or narrow capabilities that the parent type advertises
- [ ] Overridden methods honor the parent's documented contract and postconditions
- [ ] Inherited fields have meaningful values in the subclass, not dummy or default placeholders
- [ ] Composition was considered as an alternative to inheritance (delegate instead of extend)
- [ ] Client code does not need to type-check before calling inherited methods
- [ ] Abstract methods in the base class have meaningful implementations in all subclasses
- [ ] Subclass does not add public methods that are nonsensical when accessed through a parent reference
- [ ] Subclass inheriting a large interface implements all methods substantively
- [ ] Substitutability test: replacing parent with subclass does not break callers
- [ ] Subclass constructor uses parent constructor parameters meaningfully, not with dummy values

## Detailed Checks

### No-Op and Throw Overrides
<!-- activation: keywords=["override", "pass", "noop", "return", "throw", "NotImplementedError", "UnsupportedOperationException", "NotSupportedException", "AbstractMethodError"] -->

- [ ] **Empty override**: subclass overrides a parent method with `{}`, `pass`, or `return` -- the subclass is rejecting behavior the parent promises
- [ ] **Throw-on-call override**: subclass overrides a method to throw `NotImplementedError` or `UnsupportedOperationException` -- callers expecting the parent contract get a runtime surprise
- [ ] **Return null/default override**: override returns null, 0, empty list, or false without performing the parent's documented operation -- silent contract violation
- [ ] **Override suppressing side effects**: parent method saves to database, sends notification, or updates state; subclass override skips these -- callers depending on the side effect are broken
- [ ] **Override with logging only**: subclass override only logs a message ("not implemented for this type") and returns -- a disguised no-op that may go unnoticed in production
- [ ] **Partial implementation**: override handles some inputs correctly but throws or no-ops for others that the parent would handle -- inconsistent substitutability

### Low Utilization of Inherited Interface
<!-- activation: keywords=["extends", "inherits", "class", "interface", "methods", "abstract", "implements"] -->

- [ ] **Small usage ratio**: subclass overrides or calls fewer than 30% of inherited non-private methods -- the inheritance surface is mostly wasted
- [ ] **Single-method subclass**: subclass exists to override or use one method while inheriting 10+ others -- extract the needed behavior via composition or a narrower interface
- [ ] **Inherited interface bloat**: subclass implements an interface (through the parent) whose methods are irrelevant -- the parent abstraction is too broad for this subclass
- [ ] **Dead inherited state**: parent defines fields (size, capacity, count) that the subclass never reads or writes -- the subclass carries meaningless state
- [ ] **Selective super calls**: subclass explicitly calls `super.methodA()` but never `super.methodB()` through `super.methodZ()` -- the unused parent methods are dead weight

### Inheritance for Reuse Without Substitutability
<!-- activation: keywords=["extends", "reuse", "share", "common", "base", "helper", "utility", "convenience"] -->

- [ ] **Reuse-driven inheritance**: subclass was created because the parent had a useful method, not because the subclass is-a parent -- replace with composition: hold a reference to the parent and delegate
- [ ] **Convenience base class**: a class named `BaseX` or `AbstractX` exists only to share utility methods among subclasses that are not polymorphically interchangeable
- [ ] **Non-substitutable subclass**: code that accepts the parent type would malfunction if given this subclass -- LSP violation indicating the relationship should be has-a, not is-a
- [ ] **Subclass narrowing preconditions**: parent method accepts any positive number, subclass throws if the number exceeds 100 -- strengthened precondition violates LSP
- [ ] **Subclass weakening postconditions**: parent method guarantees a non-null return, subclass returns null in edge cases -- weakened postcondition violates LSP
- [ ] **Marker subclass**: subclass adds no behavior and no state, existing only for type discrimination -- use a type tag, interface, or annotation instead

### Partial Interface Implementation in Hierarchies
<!-- activation: keywords=["abstract", "interface", "implements", "sealed", "virtual", "pure"] -->

- [ ] **Uneven abstract method implementation**: base class defines 5 abstract methods; some subclasses implement all 5, others throw on 2 -- the abstraction is too broad for all subclasses
- [ ] **Interface Segregation needed**: a single parent interface forces subclasses to implement methods they do not need -- split into smaller, role-specific interfaces
- [ ] **Optional methods by convention**: documentation says "override if needed, default is no-op" -- the method should not be in the base class if subclasses regularly skip it
- [ ] **Adapter-pattern workaround**: a subclass overrides every method of a large interface with no-ops and subclasses of that override only the methods they care about -- this is the Adapter pattern compensating for a too-broad interface
- [ ] **Template method with skippable steps**: template method calls hook methods that some subclasses leave empty -- consider making the hooks optional or using composition

## Common False Positives

- **Intentional no-op in Null Object pattern**: a Null Object subclass (e.g., `NullLogger`, `NoOpHandler`) intentionally implements all methods as no-ops. This is a deliberate design pattern, not refused bequest -- flag only if the null object is not named/documented as such.
- **Test doubles and mocks**: test stubs that extend production classes with no-op overrides are standard testing practice. Do not flag classes in test directories.
- **Framework lifecycle hooks**: overriding `onDestroy()`, `dispose()`, or `tearDown()` with an empty body when there is nothing to clean up is normal. Flag only if the parent's core behavioral methods are no-oped.
- **Abstract base class with optional hooks**: if the base class documents that certain methods are optional extension points (not part of the core contract), empty overrides are fine.
- **Partial interface implementation during development**: a subclass that throws `NotImplementedError` with a TODO comment in an active feature branch is work-in-progress, not a smell -- flag only in main/release branches.
- **Sealed hierarchy exhaustive variants**: in a sealed class hierarchy where some variants genuinely do not need certain methods (e.g., `Empty` case), no-op implementations may be correct.

## Severity Guidance

| Finding | Severity |
|---|---|
| Override throws at runtime for a method callers expect to work (LSP violation in production path) | high |
| Subclass narrows parent preconditions or weakens postconditions, breaking substitutability | high |
| Client code type-checks before calling inherited methods due to unreliable subclass support | high |
| Override with empty body for a method that performs critical operations in the parent | medium |
| Subclass uses fewer than 30% of inherited methods (inheritance for reuse, not subtyping) | medium |
| Inherited fields set to dummy values or ignored by the subclass | medium |
| Abstract method implemented as no-op in some subclasses (interface too broad) | medium |
| Subclass created for one method when composition would suffice | medium |
| Convenience base class sharing utilities without polymorphic contract | low |
| Framework lifecycle hook overridden with empty body (nothing to clean up) | low |
| Single optional hook method left empty in a template method pattern | low |

## See Also

- `principle-solid` -- LSP (subclass must be substitutable for parent) is the formal principle behind this smell; ISP (split broad interfaces) is the remedy for forced no-op implementations
- `principle-composition-over-inheritance` -- refused bequest is a primary signal that composition should replace inheritance
- `principle-encapsulation` -- subclasses that reject inherited interface expose broken abstraction boundaries
- `pattern-strategy` -- replacing inheritance-for-one-method with strategy injection avoids refused bequest
- `pattern-adapter` -- when a subclass no-ops most of an interface, an adapter around a narrower interface may be the correct pattern

## Authoritative References

- [Martin Fowler, *Refactoring* (2nd ed., 2018), Refused Bequest smell](https://refactoring.com/)
- [Martin Fowler, *Refactoring* (2nd ed., 2018), Replace Inheritance with Delegation](https://refactoring.com/catalog/replaceInheritanceWithDelegation.html)
- [Robert C. Martin, *Agile Software Development* (2002), Chapter 10: Liskov Substitution Principle](https://www.oreilly.com/library/view/agile-software-development/0135974445/)
- [Joshua Kerievsky, *Refactoring to Patterns* (2004), Replace Inheritance with Delegation](https://www.oreilly.com/library/view/refactoring-to-patterns/0321213351/)
- [Barbara Liskov & Jeannette Wing, "A Behavioral Notion of Subtyping" (1994), ACM TOPLAS 16(6)](https://dl.acm.org/doi/10.1145/197320.197383)
