---
id: smell-temporary-field
type: primary
depth_role: leaf
focus: Detect class fields that are only valid in certain states or methods, leading to null checks and temporal coupling.
parents:
  - index.md
covers:
  - Class field set in one method and read in another with no guarantee of call order
  - "Field that is null/undefined/nil most of the time and only populated during specific operations"
  - Field used as inter-method communication channel instead of method parameters or return values
  - Field requiring null checks everywhere because it is not always valid
  - Boolean flag field controlling method behavior that should be a parameter or separate class
  - "Field set in a setup/init method and used in a run/execute method with temporal coupling"
  - Optional or nullable field that is only meaningful in one of several class states
  - Field caching a computation result that is only valid within a single method call
  - Field accumulating intermediate results across method calls instead of local variables
  - Field introduced to avoid passing a value as a parameter through method signatures
tags:
  - temporary-field
  - code-smell
  - oo-abusers
  - null-safety
  - temporal-coupling
  - encapsulation
activation:
  file_globs:
    - "**/*.{java,kt,scala,cs,ts,js,py,rb,go,rs,swift,cpp,h,hpp,php}"
  keyword_matches:
    - class
    - field
    - property
    - "null"
    - undefined
    - nil
    - None
    - optional
    - temp
    - flag
    - state
  structural_signals:
    - field_set_in_one_method_read_in_another
    - nullable_field_with_scattered_null_checks
    - field_reset_after_use
source:
  origin: file
  path: smell-temporary-field.md
  hash: "sha256:f0acc9a16fc3a297380cef40be694dea16007d4369b9956f3f4e5c78285a3fda"
---
# Temporary Field Smell

## When This Activates

Activates when diffs add or modify class fields that are not initialized in the constructor, are nullable/optional for no domain reason, or are used to pass data between methods rather than through parameters and return values. Temporary fields make a class harder to reason about because the object is only fully valid in certain states. The core question is: does every field of this class have a meaningful value at all times, or do some fields exist only to smuggle data between method calls?

## Audit Surface

- [ ] Every class field is initialized in the constructor or has a meaningful default value
- [ ] No field is written exclusively in one method and read exclusively in a different non-constructor method
- [ ] Fields that are null/undefined after construction have a clear lifecycle documented or enforced by types
- [ ] Null checks on a field do not appear in 3+ methods (scattered defensive checks signal a temporary field)
- [ ] No field is set at the start of a public method solely to be read by private helpers in the same call
- [ ] Boolean flag fields do not toggle method behavior -- use a parameter, strategy, or state pattern instead
- [ ] Setup/init + execute/run pairs enforce call order via the type system or builder, not by convention
- [ ] No field exists solely to avoid adding a parameter to a method signature
- [ ] No field is reset to null/default at the end of a method after being used temporarily
- [ ] Fields typed as Optional/Nullable have a genuine domain reason (not just "sometimes we don't have it yet")
- [ ] Test code does not require calling methods in a magic order to populate fields before use
- [ ] Class has a clear separation between always-valid state and lifecycle-dependent state
- [ ] Fields used as loop accumulators between methods are refactored to local variables or return values
- [ ] New fields added in the diff do not introduce inter-method data smuggling

## Detailed Checks

### Null/Undefined Most of the Time
<!-- activation: keywords=["null", "undefined", "nil", "None", "Optional", "Nullable", "?", "!"] -->

- [ ] **Post-construction null**: field is declared but not set in the constructor, leaving it null until some method is called -- callers must know the protocol or risk null pointer exceptions
- [ ] **Defensive null checks everywhere**: 3+ methods guard against the field being null with `if (field != null)` or `field?.` -- this scatters the "is it ready?" concern across the class
- [ ] **Null as sentinel**: field is null to mean "not yet computed" and non-null to mean "ready" -- replace with an explicit state enum or Optional with clear semantics
- [ ] **Reset to null after use**: a method sets the field, uses it, then sets it back to null -- the field is a local variable masquerading as instance state
- [ ] **Nullable for one code path**: field is always non-null in the primary flow but nullable because one edge-case path skips initialization -- consider extracting the edge case into a separate class

### Inter-Method Data Smuggling
<!-- activation: keywords=["field", "property", "this", "self", "set", "get", "pass", "share", "communicate"] -->

- [ ] **Set-then-call pattern**: method A sets a field, then calls method B which reads it -- the field is acting as an implicit parameter; pass it explicitly
- [ ] **Return-via-field**: method A populates a field as its "result" and the caller reads the field afterward instead of using a return value -- obscures data flow
- [ ] **Accumulator field**: a field accumulates results across multiple private method calls within a single public method invocation -- use a local variable or return intermediate results
- [ ] **Context field avoids parameter threading**: a field was introduced to avoid passing a value through 3+ method signatures -- consider a parameter object or restructure the call chain
- [ ] **Test setup reveals smuggling**: test must call `obj.prepare(data)` before `obj.execute()` with no compile-time enforcement -- temporal coupling via temporary field

### Boolean Flag Fields
<!-- activation: keywords=["flag", "boolean", "bool", "isReady", "isInitialized", "isProcessing", "enabled", "active", "dirty", "mode"] -->

- [ ] **Mode flag**: a boolean field toggles which branch a method takes (`if (this.useNewLogic)`) -- extract into two classes or use a strategy parameter
- [ ] **Initialized flag**: `isInitialized` field checked at the start of methods to guard against use before setup -- the type system should prevent this (builder pattern, two-phase construction with distinct types)
- [ ] **Processing flag**: `isProcessing` set to true during a method and false at the end -- this is re-entrant state management that belongs in a local variable or method-scoped guard
- [ ] **Dirty flag as temp state**: `isDirty` set during mutation and checked during save, but only valid between those calls -- temporal coupling that breaks if methods are called out of order
- [ ] **Flag controlling unrelated behavior**: a boolean field affects methods that are unrelated to each other -- the class has two responsibilities toggled by a flag; split the class

### Temporal Coupling Between Methods
<!-- activation: keywords=["init", "setup", "prepare", "configure", "build", "execute", "run", "process", "start", "finish", "close"] -->

- [ ] **Required call order**: class documentation or tests reveal that methods must be called in a specific sequence (init -> configure -> run) -- fields set in earlier steps are temporary until the final step uses them
- [ ] **Lifecycle state machine**: object transitions through states (created -> configured -> running -> done) with fields only valid in certain states -- make states explicit with types or a state pattern
- [ ] **Builder-like class that isn't a builder**: class accumulates configuration in fields via setters, then an `execute` method uses them all -- extract a builder or parameter object
- [ ] **Deferred validation**: fields are set across multiple methods and validated only when a final method is called -- invalid intermediate states are possible
- [ ] **Cleanup method required**: fields must be explicitly cleared via a `reset()` or `cleanup()` method between uses -- temporary state leaking across invocations

### Field as Cached Computation
<!-- activation: keywords=["cache", "computed", "lazy", "memoize", "result", "last", "previous", "temp", "intermediate"] -->

- [ ] **Single-use cache**: field caches a computed value that is only used within one method call and never accessed again -- a local variable is clearer
- [ ] **Stale cache with no invalidation**: field caches a derived value but is not updated when source data changes -- readers get stale results
- [ ] **Cache with lifecycle mismatch**: cached field outlives the data it was computed from (e.g., request-scoped data cached in a singleton) -- leads to data leaks or incorrect results
- [ ] **Lazy field without thread safety**: field is lazily initialized on first access but not synchronized -- race condition in concurrent contexts

## Common False Positives

- **Lazy initialization (memoization)**: fields that are null until first access and then permanently non-null are a valid pattern (especially with language-level lazy support like Kotlin `lazy`, Python `@cached_property`). Flag only if the cached value can become stale or the lazy init is not thread-safe when needed.
- **Builder pattern fields**: builder objects accumulate state via setters before `build()` is called. This is the intended use of incremental field population. Flag only if the builder allows `build()` before all required fields are set.
- **ORM/serialization entities**: framework-managed entities (JPA, ActiveRecord) often have nullable fields due to persistence lifecycle. Flag only if business logic accesses these fields without checking lifecycle state.
- **State machines with explicit state types**: if the class models a legitimate state machine and states are explicitly tracked (e.g., sealed class state), fields valid only in certain states are acceptable if the state type enforces access.
- **Event handler registration**: fields holding event handlers or callbacks that are set after construction are standard in event-driven frameworks.
- **DI-injected optional dependencies**: fields injected by a DI container that are optional by design (`@Autowired(required=false)`) are not temporary fields.

## Severity Guidance

| Finding | Severity |
|---|---|
| Field read without initialization causes NullPointerException/crash in production path | high |
| Required call order not enforced by types; tests pass only because they follow the convention | high |
| Field used as inter-method communication where parameter passing is straightforward | medium |
| Boolean flag toggles unrelated behaviors in the class | medium |
| 3+ methods null-check the same field defensively | medium |
| Field reset to null at end of method (local variable in disguise) | medium |
| Lazy field without thread safety in shared-context class | medium |
| Field caching a single-use computation that could be a local variable | low |
| Field set in constructor but only used in one method (unnecessary state) | low |
| Nullable field in ORM entity without business logic access issues | low |

## See Also

- `principle-encapsulation` -- temporary fields leak internal lifecycle details; a well-encapsulated object is valid in all publicly observable states
- `principle-solid` -- SRP is violated when a class has fields for multiple independent concerns toggled by flags; ISP is violated when some fields are only relevant to some callers
- `smell-primitive-obsession` -- boolean flags controlling behavior are a form of primitive obsession; replace with types or strategies
- `pattern-strategy` -- mode-flag fields that toggle behavior should be replaced with strategy injection
- `pattern-state` -- lifecycle-dependent fields suggest the class is modeling a state machine and should make states explicit

## Authoritative References

- [Martin Fowler, *Refactoring* (2nd ed., 2018), Temporary Field smell](https://refactoring.com/)
- [Martin Fowler, *Refactoring* (2nd ed., 2018), Introduce Special Case / Introduce Null Object](https://refactoring.com/catalog/introduceSpecialCase.html)
- [Robert C. Martin, *Clean Code* (2008), Chapter 10: Classes -- cohesion and temporal coupling](https://www.oreilly.com/library/view/clean-code/9780136083238/)
- [Joshua Kerievsky, *Refactoring to Patterns* (2004), Introduce Null Object](https://www.oreilly.com/library/view/refactoring-to-patterns/0321213351/)
- [Martin Fowler, *Refactoring* (1st ed., 1999), Temporary Field smell](https://refactoring.com/)
