---
id: principle-immutability-by-default
type: primary
depth_role: leaf
focus: Prefer immutable state as the default and treat mutability as an explicit, justified exception
parents:
  - index.md
covers:
  - "Mutable variables where immutable alternatives exist (let vs const, var vs val)"
  - Shared mutable state causing race conditions or spooky action at a distance
  - Collections mutated after construction instead of built immutably
  - Setter methods on objects that could be immutable value objects
  - Defensive copies missing when mutable objects cross API boundaries
  - In-place mutation of function arguments causing caller-visible side effects
  - "Mutable class fields where final/readonly/frozen would suffice"
  - "Accumulator patterns replaceable with fold/reduce/map"
  - "Date/time objects mutated instead of replaced"
  - "Builder pattern misuse: mutable builder escaping its intended scope"
  - Thread-safety issues stemming from unguarded mutable shared state
  - Value objects implemented as mutable entities
tags:
  - immutability
  - mutability
  - state
  - concurrency
  - value-objects
  - functional
  - defensive-copy
activation:
  file_globs:
    - "**/*.py"
    - "**/*.java"
    - "**/*.kt"
    - "**/*.scala"
    - "**/*.ts"
    - "**/*.js"
    - "**/*.rb"
    - "**/*.go"
    - "**/*.cs"
    - "**/*.rs"
    - "**/*.swift"
    - "**/*.dart"
  keyword_matches:
    - "let "
    - "var "
    - "mut "
    - mutable
    - setter
    - setField
    - modify
    - update
    - state
    - setState
    - ".set("
    - ".push("
    - ".add("
    - ".append("
    - ".remove("
    - ".pop("
    - ".delete("
    - ".clear("
    - freeze
    - readonly
    - "final "
    - "const "
    - "val "
  structural_signals:
    - Variable declarations with mutable keywords
    - Collection mutation methods in diff
    - Setter methods or state modification patterns
source:
  origin: file
  path: principle-immutability-by-default.md
  hash: "sha256:f20f2836d5e33b19f422974c9fe721c68d39de448e4a6544514e2c517fd07beb"
---
# Immutability by Default Reviewer

## When This Activates

Activates when a diff contains variable declarations, state mutations, or collection modification operations. Fires on mutable keywords (`let`, `var`, `mut`), setter patterns, and collection mutation methods (`.push()`, `.add()`, `.set()`).

## Audit Surface

- [ ] Variable declared with `let`/`var`/`mut` that is never reassigned
- [ ] Mutable collection (ArrayList, list, dict) exposed via public getter without defensive copy
- [ ] Setter method on a class that could be constructed once and never modified
- [ ] Function parameter mutated inside the function body
- [ ] Shared mutable state accessed from multiple threads without synchronization
- [ ] Loop accumulator pattern that could be expressed as map/filter/reduce
- [ ] Date or calendar object mutated in place (`setMonth`, `add`) instead of replaced
- [ ] Class field that is `public` and non-final / non-readonly
- [ ] Mutable default argument in Python/Ruby (e.g., `def f(x=[])`)
- [ ] Object spread / copy used only because the original was unnecessarily mutable
- [ ] Mutable global or module-level variable
- [ ] Collection built by repeated `.add()` / `.push()` that could use a literal or builder
- [ ] Reassigned variable used only to hold intermediate pipeline results
- [ ] Config or settings object modified after initialization
- [ ] Entity/model with setters called outside its constructor or factory

## Detailed Checks

### Unnecessary Mutable Declarations
<!-- activation: keywords=["let ", "var ", "mut ", "mutable"] -->

- [ ] Flag `let` (JS/TS/Swift/Rust) where `const` would work -- if the binding is never reassigned, make it `const`
- [ ] Flag `var` (Kotlin/Scala/Go/C#) where `val`/`const`/`:=` with no reassignment would work
- [ ] In Rust, flag `let mut` where the variable is never mutated after initialization
- [ ] In Java, flag fields and locals missing `final` when they are assigned exactly once
- [ ] In Python, flag variables reassigned in a pattern like `x = []; x.append(1); x.append(2)` where `x = [1, 2]` suffices
- [ ] Check for `var` in Scala that is never reassigned -- always prefer `val`
- [ ] In C#, flag fields that could be `readonly` and locals that could be `const` or use `var` with no reassignment

### Shared Mutable State and Concurrency
<!-- activation: keywords=["static", "global", "shared", "thread", "async", "lock", "mutex", "synchronized", "atomic", "volatile"] -->

- [ ] Flag mutable statics or globals accessed from async/threaded code without synchronization primitives
- [ ] Identify class-level mutable fields in objects shared across threads (singleton services, caches, registries)
- [ ] Check for lock-free mutation of shared collections -- even "thread-safe" collections need correct usage patterns
- [ ] Verify that mutable state in request-scoped or actor-scoped objects does not leak to shared scope
- [ ] Flag global mutable registries or caches that lack clear ownership and lifecycle management
- [ ] In Go, check for goroutine-shared maps or slices without mutex protection
- [ ] In JS/TS, check for module-level mutable state in serverless/lambda handlers where cold-start state persists across invocations

### Defensive Copies and API Boundaries
<!-- activation: keywords=["get", "return", "public", "export", "expose", "api", "Collections.unmodifiable", "Object.freeze"] -->

- [ ] Flag public getters that return mutable internal collections directly -- callers can modify the object's state
- [ ] Check constructors that store mutable arguments by reference without copying -- the caller retains the ability to mutate the object's internals
- [ ] Verify that immutable wrappers (`Collections.unmodifiableList`, `Object.freeze`, `frozenset`) are used at API boundaries
- [ ] In Java, flag `getList()` returning the internal `ArrayList` -- return `List.copyOf()` or `Collections.unmodifiableList()`
- [ ] In Python, flag returning internal `list`/`dict` from properties -- return `tuple`/`frozenset`/`MappingProxyType` or a copy
- [ ] Check for date/time fields exposed mutably -- `java.util.Date` and `Calendar` are mutable; prefer `java.time` immutables

### Value Objects and Data Types
<!-- activation: keywords=["class ", "data class", "record", "struct", "case class", "dataclass", "frozen", "namedtuple", "NamedTuple"] -->

- [ ] Verify that types representing values (Money, Coordinate, Email, DateRange) are implemented as immutable -- no setters, all-args constructor, fields final
- [ ] In Kotlin, prefer `data class` with `val` properties over regular class with `var`
- [ ] In Python, prefer `@dataclass(frozen=True)` or `NamedTuple` for value types
- [ ] In Java, prefer `record` types (Java 16+) for value objects -- they are immutable by design
- [ ] In Scala, prefer `case class` with `val` fields -- `var` fields in case classes are a serious code smell
- [ ] In TypeScript, prefer `readonly` on interface fields and `as const` for literal objects
- [ ] Flag entity classes with public setters for identity fields (ID, creation timestamp) that must never change after construction

### Accumulator and Loop Mutation Patterns
<!-- activation: keywords=["for ", "while ", "forEach", "each", ".push(", ".add(", ".append(", "+=", "result =", "acc"] -->

- [ ] Identify `for` loops that build a result by pushing into a mutable collection -- suggest `map`/`filter`/`reduce` or list comprehension
- [ ] Flag index-variable mutation patterns (`i++`, `count += 1`) where a functional pipeline or range would work
- [ ] Check for mutable accumulators in recursive functions where fold/scan would be clearer
- [ ] In JS/TS, flag `let result = []; items.forEach(x => result.push(f(x)))` -- use `items.map(f)` instead
- [ ] In Python, flag `result = []; for x in items: result.append(f(x))` -- use `[f(x) for x in items]`
- [ ] Acknowledge that some accumulator patterns (stateful reductions, early-exit loops) genuinely need mutation -- do not flag these

## Common False Positives

- **Performance-critical inner loops**: Tight loops in hot paths may use mutation for performance. Flag only if the code is not in a proven hot path or if the language optimizer handles immutable patterns equally well.
- **Builder pattern**: Builders are intentionally mutable during construction and immutable after `.build()` -- this is correct usage. Flag only if the builder escapes its scope.
- **State machines and actors**: Actors and explicit state machines legitimately own and mutate their local state -- flag only if the state leaks outside the actor.
- **Test setup**: Tests often build mutable fixtures for convenience. Flag only if mutability causes test interference (shared state between tests).
- **Framework requirements**: Some frameworks require mutable models (ORMs with setter-based hydration, UI frameworks with two-way binding). Flag only when an immutable alternative is practical.
- **I/O buffers and streams**: Buffers, writers, and output streams are inherently mutable -- this is expected.

## Severity Guidance

| Finding | Severity |
|---|---|
| Shared mutable state across threads without synchronization | Critical |
| Mutable global / module-level state in concurrent context | Critical |
| Public getter returning internal mutable collection by reference | Important |
| `let` / `var` / `mut` where `const` / `val` / immutable suffices | Minor |
| Mutable default argument (`def f(x=[])`) | Important |
| Value object with setters instead of immutable construction | Important |
| Loop accumulator replaceable with map/filter/reduce | Minor |
| Function mutating its input parameter | Important |
| Missing defensive copy at API boundary | Important |
| Mutable config object modified after initialization | Important |
| Date/calendar mutated in place instead of replaced | Minor |

## See Also

- `principle-separation-of-concerns` -- Mutable state often signals concerns that should be separated (I/O from logic)
- `principle-coupling-cohesion` -- Shared mutable state is the strongest form of coupling between modules

## Authoritative References

- [Effective Java, Item 17 - "Minimize Mutability"](https://www.oreilly.com/library/view/effective-java/9780134686097/)
- [Rich Hickey - "The Value of Values" (Strange Loop 2012)](https://www.youtube.com/watch?v=-6BsiVyC1kM)
- [Eric Elliott - "The Dao of Immutability"](https://medium.com/javascript-scene/the-dao-of-immutability-9f91a70c88cd)
- [Rust Book - "References and Borrowing"](https://doc.rust-lang.org/book/ch04-02-references-and-borrowing.html)
- [Kotlin docs - "Properties and Fields: val vs var"](https://kotlinlang.org/docs/properties.html)
- [Python docs - "dataclasses.frozen"](https://docs.python.org/3/library/dataclasses.html)
