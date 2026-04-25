---
id: principle-encapsulation
type: primary
depth_role: leaf
focus: Enforce information hiding, public surface minimization, and invariant protection to prevent implementation detail leakage.
parents:
  - index.md
covers:
  - "Public surface minimization: expose only what clients genuinely need"
  - Implementation detail leakage through return types, parameter types, or error messages
  - "Invariant protection: internal state cannot be corrupted by external callers"
  - Mutable internal collection exposure without defensive copying
  - "Getter/setter proliferation defeating the purpose of encapsulation"
  - "Package/module visibility misuse (everything public by default)"
  - Internal data structures leaked through serialization or API responses
  - Encapsulation bypass via reflection, friend classes, or runtime hacks
  - Configuration and secrets exposure through overly broad accessors
  - Leaky abstractions revealing underlying implementation technology
  - Type system underuse for enforcing access boundaries
tags:
  - encapsulation
  - information-hiding
  - invariants
  - public-api
  - security
  - access-control
activation:
  file_globs:
    - "**/*.{java,kt,scala,cs,ts,js,py,rb,go,rs,swift,cpp,h,hpp}"
  keyword_matches:
    - public
    - export
    - expose
    - getter
    - setter
    - internal
    - private
    - protected
    - readonly
    - "get "
    - "set "
    - __
    - friend
    - reflect
    - accessible
  structural_signals:
    - visibility_modifier
    - property_accessor
    - module_export
source:
  origin: file
  path: principle-encapsulation.md
  hash: "sha256:5b9af88c33f77b28354898dd85c57b6abaf4fa5332890349f303ea71ad4cecc3"
---
# Encapsulation and Information Hiding

## When This Activates

Activates when diffs modify public APIs, add/change class fields or properties, export module symbols, introduce getters/setters, or alter visibility modifiers. Encapsulation violations are insidious: they create implicit contracts with internal details, making future refactoring impossible without breaking callers.

## Audit Surface

- [ ] Every new public member is justified -- could it be private, internal, or package-private instead?
- [ ] Getters returning collections return unmodifiable views or defensive copies, not raw mutable references
- [ ] Setters validate invariants before accepting new values; no unchecked `setX(value)` on constrained state
- [ ] Public constructors do not expose implementation-specific setup details
- [ ] Method signatures use domain abstractions, not implementation types (e.g., `List` over `ArrayList`, `Stream` over `Channel`)
- [ ] Error messages and exceptions do not leak file paths, SQL queries, internal class names, or stack traces to end users
- [ ] Module exports are minimized: only the public contract is exported, internal helpers stay private
- [ ] API responses do not include internal database IDs, ORM metadata, or debug fields outside the documented contract
- [ ] Protected fields exist only in classes explicitly designed for extension
- [ ] No reflection-based access to private members in production code
- [ ] Configuration accessors do not expose raw credentials; secrets are consumed, never returned
- [ ] Domain objects hide persistence identity from the domain layer
- [ ] Object construction enforces all invariants -- no way to create an invalid instance
- [ ] Leaky abstraction check: does the public API reveal the underlying technology (database type, message broker, etc.)?
- [ ] Internal constants and enums used only for implementation are not exported

## Detailed Checks

### Public Surface Audit
<!-- activation: keywords=["public", "export", "module.exports", "pub ", "open ", "__all__", "package"] -->

- [ ] **Default-to-private rule**: every new symbol starts private and is promoted only when a concrete external need arises; "might need it later" is not a justification
- [ ] **Export inventory**: in the diff, list every newly exported symbol -- each must have a documented consumer
- [ ] **API surface growth tracking**: is the public surface of this module growing monotonically? Each addition is a permanent maintenance commitment
- [ ] **Transitive exposure**: a public method that returns an internal type effectively makes that internal type public; check return types for accidental exposure
- [ ] **Namespace pollution**: does the export add top-level names that could collide or confuse? Prefer namespaced or nested exports
- [ ] **Visibility mismatch**: public method that is only called by one internal method -- demote it

### Mutable State Protection
<!-- activation: keywords=["get", "return", "list", "map", "set", "array", "collection", "slice", "vec", "dict"] -->

- [ ] **Collection escape**: getter returns `this.items` directly -- mutating the returned reference corrupts internal state; return `Collections.unmodifiableList()`, `Object.freeze()`, `.copy()`, or equivalent
- [ ] **Shallow copy trap**: defensive copy of a collection still exposes mutable elements; verify deep immutability where required
- [ ] **Date/time mutability**: returning `Date` objects (Java) or mutable temporal types by reference allows external mutation; return immutable alternatives
- [ ] **Builder finalization**: after `build()`, can the builder be reused to produce a second object that shares mutable state with the first?
- [ ] **Setter without validation**: `setBalance(amount)` that accepts negative values when the invariant requires non-negative -- setter must enforce constraints
- [ ] **Internal state reset**: public `clear()` or `reset()` method that can put the object into an invalid intermediate state

### Implementation Detail Leakage
<!-- activation: keywords=["HashMap", "ArrayList", "SqlException", "ConnectionString", "impl", "internal", "struct", "schema"] -->

- [ ] **Concrete type in signature**: method returns `HashMap<K,V>` instead of `Map<K,V>` -- locks implementation choice into the public contract
- [ ] **ORM entities in API**: persistence entities (with `@Entity`, `@Table`, etc.) returned directly from service methods or endpoints instead of mapped DTOs
- [ ] **Exception class leakage**: catching a library-specific exception and re-throwing it through a public API -- wrap in a domain-specific exception
- [ ] **SQL in error messages**: database query fragments, table names, or constraint names visible in user-facing errors
- [ ] **File system paths in responses**: internal absolute paths (`/opt/app/data/...`) leaked in logs, errors, or API bodies accessible to clients
- [ ] **Technology-specific configuration**: public API accepts or returns config objects tied to a specific library (e.g., accepting a `RedisOptions` directly)
- [ ] **Serialization leakage**: `@JsonProperty` or similar annotations exposing internal field names that differ from the documented API contract

### Invariant and Construction Safety
<!-- activation: keywords=["constructor", "init", "new", "build", "create", "factory", "validate", "require", "assert", "check"] -->

- [ ] **Invalid object prevention**: can a caller construct an instance of this class that violates its documented invariants? If yes, tighten the constructor
- [ ] **Required field enforcement**: all required fields are set at construction time, not left as null/default to be filled in later by setters
- [ ] **Validation completeness**: constructor validates all constraints (ranges, formats, relationships between fields); domain objects should never exist in an invalid state
- [ ] **Copy constructor / clone safety**: if the class supports copying, does the copy maintain all invariants and produce a truly independent instance?
- [ ] **Deserialization bypass**: JSON/XML deserialization can bypass constructor validation -- ensure deserialized objects are validated before use
- [ ] **Partial initialization**: factory or builder that allows `build()` to succeed when required fields are missing

## Common False Positives

- **Data Transfer Objects (DTOs)**: DTOs are intended to expose all their fields publicly -- they are data carriers by design, not encapsulation violators.
- **Record / data class types**: languages with `record` (Java 16+), `data class` (Kotlin), `dataclass` (Python), or `struct` (Go) intentionally make fields accessible; this is idiomatic.
- **Test code**: tests often access internal state for assertion purposes. Reflection-based access in tests is generally acceptable, though test-specific accessors are preferable.
- **Serialization frameworks**: `@JsonProperty`, `Serialize`, etc. necessarily expose fields to the serialization layer. The concern is when internal names leak into the external contract.
- **Configuration classes**: configuration objects with public fields are often intentional; the concern is when they expose secrets, not when they expose settings.

## Severity Guidance

| Finding | Severity |
|---|---|
| Getter returning mutable reference to internal collection | high |
| Credentials or secrets accessible through public accessor | high |
| SQL or internal paths leaked in user-facing error messages | high |
| Object constructable in an invalid state bypassing invariants | high |
| ORM/persistence entity exposed directly through public API | medium |
| Public method that could be private (no external callers) | medium |
| Concrete implementation type in public method signature | medium |
| Protected field in a class not designed for extension | medium |
| Internal constant exported unnecessarily | low |
| Slight over-exposure of module internals in a stable internal API | low |

## See Also

- `principle-solid` -- ISP ensures interfaces do not over-expose; SRP keeps encapsulation boundaries aligned with responsibilities
- `principle-tell-dont-ask` -- asking for data and computing externally is the behavioral symptom of encapsulation failure
- `principle-grasp` -- Information Expert assigns responsibility to the data owner, reinforcing encapsulation
- `principle-composition-over-inheritance` -- inheritance breaks encapsulation by coupling subclass to parent implementation

## Authoritative References

- [David Parnas, "On the Criteria to be Used in Decomposing Systems into Modules" (1972)](https://www.win.tue.nl/~wstomv/edu/2ip30/references/criteria_for_modularization.pdf)
- [Joshua Bloch, *Effective Java* (3rd ed., 2018), Item 15-17: Minimize accessibility, use accessors, minimize mutability](https://www.oreilly.com/library/view/effective-java/9780134686097/)
- [Scott Meyers, *Effective C++* (3rd ed., 2005), Item 22: Declare data members private](https://www.oreilly.com/library/view/effective-c-55/0321334876/)
- [Robert C. Martin, *Clean Code* (2008), Chapter 6: Objects and Data Structures](https://www.oreilly.com/library/view/clean-code-a/9780136083238/)
