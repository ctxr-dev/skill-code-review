---
id: pattern-prototype
type: primary
depth_role: leaf
focus: "Detect misuse of clone/copy operations, shallow-vs-deep copy errors, and missing prototype support on frequently duplicated objects."
parents:
  - index.md
covers:
  - Shallow copy when deep copy is required, causing shared mutable state between original and clone
  - Prototype registry holding mutable prototypes that callers modify after retrieval
  - "Clone method skipping re-initialization of transient fields (IDs, timestamps, event listeners)"
  - "Missing clone/copy support on objects that are frequently duplicated"
  - Serialization-based cloning introducing performance and correctness hazards
  - "Cloneable interface misuse in Java (broken contract, missing super.clone())"
  - "Spread operator / Object.assign shallow copy traps in JavaScript/TypeScript"
  - "Copy constructor omitting newly added fields (maintenance hazard)"
  - "Clone producing objects that violate the original's invariants"
  - Prototype pattern used where a factory or builder would be clearer
tags:
  - prototype
  - clone
  - copy
  - deep-copy
  - creational-pattern
  - design-patterns
  - object-duplication
activation:
  file_globs:
    - "**/*.{java,kt,scala,cs,ts,js,py,rb,go,rs,swift,cpp,h,hpp,php}"
  keyword_matches:
    - clone
    - copy
    - deepcopy
    - prototype
    - duplicate
    - Cloneable
    - copy constructor
    - spread
    - Object.assign
    - structuredClone
    - copy.copy
    - copy.deepcopy
    - Clone
    - dup
    - marshal
  structural_signals:
    - clone_method_definition
    - copy_constructor
    - spread_operator
    - prototype_registry
source:
  origin: file
  path: pattern-prototype.md
  hash: "sha256:ffbeebe5765f045b607f375bb9592a433e49ffbf9988e986af06c2f2dde24672"
---
# Prototype Pattern

## When This Activates

Activates when diffs introduce or modify clone/copy methods, use spread operators or `Object.assign` for object duplication, implement `Cloneable` or copy constructors, or create prototype registries. The Prototype pattern's primary misuse vector is the shallow-vs-deep copy mistake, which produces bugs that are notoriously hard to diagnose because the original and clone silently share mutable state.

## Audit Surface

- [ ] Every clone/copy operation produces the correct depth: shallow copy only when all fields are immutable or primitive; deep copy when mutable nested objects exist
- [ ] Prototype registry entries are immutable or defensively copied before returning to callers
- [ ] Cloned objects get fresh identity fields (IDs, timestamps, UUIDs) rather than inheriting the original's
- [ ] Transient state (event listeners, observers, open connections, locks) is not carried to the clone
- [ ] Spread operators and `Object.assign` are not used on objects with nested mutable references
- [ ] Serialization-based cloning is not used in hot paths or on objects with non-serializable fields
- [ ] Java `Cloneable` implementations call `super.clone()` and properly deep-copy mutable fields
- [ ] Copy constructors are updated when new fields are added to the class
- [ ] Clone output satisfies the same invariants as a freshly constructed object
- [ ] Objects that are frequently duplicated provide an explicit clone/copy method instead of relying on callers to copy field-by-field
- [ ] `structuredClone()` in JS/TS is not used on objects containing functions, class instances, or DOM nodes
- [ ] Performance-sensitive code does not clone large objects unnecessarily; consider copy-on-write or immutable structures
- [ ] Prototype pattern is justified: the object is expensive to construct from scratch, not trivially re-creatable

## Detailed Checks

### Shallow vs. Deep Copy Errors
<!-- activation: keywords=["clone", "copy", "shallow", "deep", "spread", "assign", "dup", "marshal"] -->

- [ ] **Shared mutable reference**: clone copies a reference to a mutable collection, map, or nested object -- mutating the clone's field also mutates the original's (or vice versa)
- [ ] **One-level-deep trap**: deep copy handles the first level of nesting but not deeper levels -- e.g., cloning a `List<List<Item>>` copies the outer list but shares inner lists
- [ ] **Immutability assumption**: code uses shallow copy because "these fields never change" but lacks enforcement -- a future contributor may add mutations and trigger aliasing bugs
- [ ] **Spread operator on nested object**: `{...obj}` or `[...arr]` in JS/TS copies top-level properties but shares nested objects -- common source of React state bugs
- [ ] **Python `copy.copy()` vs `copy.deepcopy()`**: `copy.copy()` is shallow; if the object contains lists, dicts, or custom objects, `copy.deepcopy()` is likely needed
- [ ] **Go struct value copy with pointer fields**: copying a Go struct copies pointer values, not the pointed-to data -- both structs share the same heap objects
- [ ] **C++ copy constructor with raw pointers**: default copy constructor copies pointer values; without deep copy logic, both objects point to the same memory (double-free risk)

### Transient Field Re-initialization
<!-- activation: keywords=["id", "uuid", "timestamp", "listener", "observer", "callback", "handler", "connection", "lock", "mutex", "session"] -->

- [ ] **Cloned identity**: clone retains the original's database ID, UUID, or business key -- inserting the clone creates a duplicate key violation or overwrites the original
- [ ] **Stale timestamp**: clone carries the original's `createdAt` or `modifiedAt` timestamp instead of receiving a fresh one
- [ ] **Inherited subscriptions**: clone inherits the original's event listeners or observer registrations -- events now fire handlers on both objects, causing duplicate side effects
- [ ] **Open resource sharing**: clone shares the original's open connection, file handle, or socket -- closing one breaks the other
- [ ] **Lock/mutex copying**: clone copies a mutex or lock object (Go `sync.Mutex`, Java `ReentrantLock`) -- the clone and original share lock state, causing deadlocks or race conditions
- [ ] **Session/context leakage**: clone carries the original's request context, transaction, or session reference -- operations on the clone affect the original's transaction scope

### Prototype Registry Issues
<!-- activation: keywords=["registry", "prototype", "cache", "template", "pool", "catalog", "store", "map"] -->

- [ ] **Mutable prototypes**: registry stores mutable prototype objects; callers modify the retrieved prototype thinking they have a private copy, corrupting the registry entry for all future callers
- [ ] **Missing defensive copy**: registry returns prototypes without cloning; `registry.get("template").setName("modified")` corrupts the template
- [ ] **Stale prototypes**: registry is populated at startup but prototypes are never refreshed when underlying configuration changes -- callers get outdated clones
- [ ] **Memory leak**: registry accumulates prototypes that are never removed, growing without bound
- [ ] **Thread-unsafe registry access**: prototype retrieval and cloning is not atomic; concurrent access can produce partially-modified clones

### Serialization-Based Cloning
<!-- activation: keywords=["serialize", "deserialize", "JSON.parse", "JSON.stringify", "pickle", "marshal", "ObjectOutputStream", "structuredClone", "toJSON", "fromJSON"] -->

- [ ] **Performance hazard**: serialization/deserialization for cloning in a hot loop -- orders of magnitude slower than field-by-field copy; unacceptable in performance-sensitive code
- [ ] **Non-serializable fields lost**: serialization round-trip silently drops fields that are not serializable (functions, closures, transient fields, file handles)
- [ ] **Type information lost**: `JSON.parse(JSON.stringify(obj))` strips prototype chain, class identity, `Date` objects (become strings), `Map`/`Set` (become plain objects), and `undefined` values
- [ ] **Circular reference crash**: `JSON.stringify` throws on circular references; `structuredClone` handles them but with performance cost
- [ ] **Security risk with pickle/marshal**: deserializing untrusted data can execute arbitrary code (Python pickle, Ruby Marshal) -- never use serialization-based cloning on external input
- [ ] **structuredClone limitations**: does not clone functions, DOM nodes, property descriptors, or prototype chains; produces a plain object for class instances

### Language-Specific Clone Pitfalls
<!-- activation: keywords=["Cloneable", "super.clone", "Clone", "derive", "copy_with", "copyWith", "NSCopying", "ICloneable", "MemberwiseClone"] -->

- [ ] **Java Cloneable contract**: class implements `Cloneable` but does not override `clone()`, or overrides it without calling `super.clone()` -- breaks the contract for subclasses
- [ ] **Java clone() not deep**: `super.clone()` produces a shallow copy; mutable fields (arrays, collections, dates) must be explicitly deep-copied in the override
- [ ] **C# `MemberwiseClone`**: `MemberwiseClone()` is shallow; reference-type fields are shared; `ICloneable.Clone()` returns `object`, requiring casts and lacking deep-copy guarantees
- [ ] **Rust `#[derive(Clone)]`**: auto-derived `Clone` calls `.clone()` on each field -- for large heap-allocated fields (`Vec`, `String`, `HashMap`), this is an expensive deep copy; consider `Rc`/`Arc` for shared ownership instead
- [ ] **Swift value-type copy-on-write**: Swift structs are value types with COW semantics, but classes are reference types; mixing them in a struct creates unexpected sharing on copy
- [ ] **Kotlin `data class copy()`**: `copy()` is shallow; nested mutable objects in a data class are shared between original and copy
- [ ] **Dart `copyWith()`**: manual `copyWith` implementations must be updated when fields are added; missing fields in `copyWith` silently retain old values

## Common False Positives

- **Immutable object copying**: if all fields of the copied object are primitives or immutable types, shallow copy is correct and deep copy is unnecessary overhead. Do not flag shallow copy of genuinely immutable objects.
- **Value type semantics**: Go structs (without pointer fields), Rust structs (with `Copy` trait), and Swift structs use value-copy semantics by design. Copying them is idiomatic, not a clone pattern concern.
- **Spread for React state updates**: `{...state, field: newValue}` is the React-idiomatic way to produce new state. This is intentionally shallow. Only flag it if nested mutable state is being modified without nested spread.
- **Builder's `toBuilder()` or `copy()`**: this is a Builder pattern mechanism, not a Prototype pattern instance; review under `pattern-builder` instead.
- **Test fixture duplication**: test code that copies fixtures for isolation is test infrastructure, not a Prototype pattern usage.

## Severity Guidance

| Finding | Severity |
|---|---|
| Shallow copy of object with mutable nested fields (aliasing bug) | high |
| Clone retains original's database ID or business key | high |
| Prototype registry returns mutable prototype without defensive copy | high |
| Serialization-based cloning of untrusted data (pickle/marshal) | high |
| Clone inherits event listeners causing duplicate side effects | medium |
| Copy constructor missing newly added fields | medium |
| Serialization-based cloning in performance-hot path | medium |
| Go struct copy containing sync.Mutex or channel | medium |
| structuredClone used on objects with functions/class instances | medium |
| Prototype pattern for trivially constructible object (overkill) | low |
| Shallow copy of object with only immutable fields (harmless) | low |
| Minor: clone method naming inconsistency (clone vs. copy vs. dup) | low |

## See Also

- `pattern-builder` -- when the goal is configurable construction (not duplication of existing objects), Builder is a better fit
- `principle-immutability-by-default` -- immutable objects eliminate shallow-vs-deep copy concerns entirely; prefer immutability to cloning
- `principle-encapsulation` -- clone methods that expose internal mutable state violate encapsulation; defensive copying is an encapsulation concern

## Authoritative References

- [Erich Gamma et al., *Design Patterns: Elements of Reusable Object-Oriented Software* (1994), Prototype](https://www.oreilly.com/library/view/design-patterns-elements/0201633612/)
- [Joshua Bloch, *Effective Java* (3rd ed., 2018), Item 13: Override clone judiciously](https://www.oreilly.com/library/view/effective-java/9780134686097/)
- [MDN Web Docs, "structuredClone()"](https://developer.mozilla.org/en-US/docs/Web/API/structuredClone)
- [Python Documentation, "copy -- Shallow and deep copy operations"](https://docs.python.org/3/library/copy.html)
