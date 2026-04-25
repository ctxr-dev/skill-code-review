---
id: principle-least-astonishment
type: primary
depth_role: leaf
focus: Flag code that behaves differently from what a careful reader of the signature, name, or type would expect
parents:
  - index.md
covers:
  - Functions with surprising side effects not implied by name or signature
  - Inconsistent return shapes across branches of the same function
  - Hidden mutation of input arguments
  - Order-dependent initialization or method call sequences
  - Operator overloads with non-intuitive semantics
  - Boolean parameters that invert or fundamentally change function behavior
  - Implicit type coercions that alter values silently
  - Context-dependent behavior that varies based on global or ambient state
  - "Convention violations within the codebase's own established patterns"
  - APIs that require reading implementation to use correctly
  - Magic values with undocumented special meaning
  - Async functions that block, or sync-looking functions that spawn background work
tags:
  - surprise
  - side-effects
  - consistency
  - mutation
  - convention
  - api-design
activation:
  file_globs:
    - "**/*"
  keyword_matches:
    - get
    - set
    - find
    - fetch
    - return
    - override
    - operator
    - implicit
    - async
    - default
  structural_signals:
    - Any code diff
source:
  origin: file
  path: principle-least-astonishment.md
  hash: "sha256:416cfa8eb7d7f9a281f7d46587aa07134df0369b19ca7160f1e7184af0fdda73"
---
# Principle of Least Astonishment

## When This Activates

Loaded for all code diffs. This reviewer catches the subtle bugs and maintenance traps that arise when code behavior diverges from what its signature, name, or type promises. These issues rarely trigger linters but reliably confuse future maintainers.

## Audit Surface

- [ ] Function named get/find/is/has that mutates state or triggers I/O side effects
- [ ] Return type varies across branches (e.g., object vs null vs undefined vs empty array)
- [ ] Input arguments modified in place without caller's explicit opt-in
- [ ] Method order matters but no compiler or runtime enforcement prevents misordering
- [ ] Operator overload does something unrelated to the operator's mathematical meaning
- [ ] Boolean flag parameter that fundamentally alters control flow
- [ ] toString/equals/hashCode override with non-standard semantics
- [ ] Default parameter value with side effects (e.g., mutable object, current timestamp)
- [ ] Public API where the happy path requires catching exceptions
- [ ] Collection returned from getter that is secretly a live view (mutations affect source)
- [ ] Async function that never awaits anything (misleading async marker)
- [ ] Method that silently ignores some arguments under certain conditions
- [ ] Setter that triggers cascading writes, network calls, or validation beyond the set field
- [ ] Implicit conversion (constructor, cast operator) that loses precision or changes semantics
- [ ] Callback parameter invoked synchronously in some paths and asynchronously in others
- [ ] API that returns different types depending on input arity or type (overload ambiguity)

## Detailed Checks

### Surprising Side Effects
<!-- activation: keywords=["get", "find", "is", "has", "check", "validate", "compute", "calculate", "fetch"] -->

- [ ] Functions with query-style names (get*, find*, is*, has*, compute*) must not write to databases, send network requests, update caches, or mutate shared state -- if they do, rename to reflect the side effect or extract the side effect
- [ ] Property getters / accessor methods must not trigger expensive computation or I/O -- cache or make the cost visible via a method name like `loadX()` or `computeX()`
- [ ] Logging inside a pure-looking function is acceptable only if it does not affect control flow or performance characteristics
- [ ] Constructors and factory methods should not start background threads, open network connections, or register global handlers -- use explicit `start()` or `connect()` lifecycle methods
- [ ] Predicate functions (returning bool) must not have side effects -- a caller may short-circuit evaluation

### Inconsistent Return Shapes
<!-- activation: keywords=["return", "null", "undefined", "none", "empty", "optional", "maybe", "result"] -->

- [ ] All branches of a function return the same structural type -- do not return `{data: T}` in the happy path and `null` on error; use a consistent envelope or Result type
- [ ] Functions that can fail return either an error type or throw -- never mix both strategies in the same function
- [ ] Collection-returning functions return empty collections on "no results" rather than null/None -- callers should not need null checks before iteration
- [ ] Async functions either always return a promise or never do -- do not conditionally return a raw value for cached/sync paths
- [ ] Overloaded functions with different return types per overload signature have unambiguous dispatch -- the caller should not need to inspect the result to know which overload ran
- [ ] Pagination or streaming APIs clearly distinguish "no more data" from "empty page" via a dedicated field or sentinel, not absence of the data field

### Hidden Mutation and Aliasing
<!-- activation: keywords=["mutate", "modify", "update", "push", "append", "splice", "sort", "reverse", "assign"] -->

- [ ] Functions must not modify input arguments unless the name clearly implies mutation (e.g., `sortInPlace`, `appendTo`) -- if mutation is needed, document it or return a new value
- [ ] Getters returning collections return defensive copies or unmodifiable views -- never expose internal mutable state
- [ ] Shared references (arrays, maps, objects passed between modules) are documented as shared -- or deep-copied at the boundary
- [ ] Sorting, reversing, or filtering operations that modify the original collection are flagged -- prefer non-destructive alternatives
- [ ] Caching decorators or memoization that stores references to mutable arguments risk stale-cache bugs -- verify cache keys are immutable or cloned

### Order Dependencies and Temporal Coupling
<!-- activation: keywords=["init", "setup", "before", "after", "first", "then", "must", "sequence", "order"] -->

- [ ] If methods must be called in a specific order, the API enforces it (builder pattern, state types, or runtime checks) -- relying on documentation alone is a bug source
- [ ] Initialization sequences that fail silently when steps are skipped or reordered -- each step should validate its preconditions
- [ ] Event handlers that assume a specific prior event has already fired -- explicitly check precondition state
- [ ] Module-level side effects (global registration, monkey-patching) whose correctness depends on import order -- make registration explicit and idempotent

### Convention and Pattern Consistency
<!-- activation: keywords=["pattern", "convention", "consistent", "style", "standard", "usual", "typical"] -->

- [ ] New code that handles the same concern differently from existing code in the same codebase without justification (e.g., one endpoint uses middleware auth, the new one does inline auth)
- [ ] Naming patterns that break the established convention in surrounding code (e.g., `fetchUser` alongside existing `getUser`, `getUserById`)
- [ ] Error handling strategy in the diff differs from the file's or module's established pattern (exceptions vs error codes vs Result types)
- [ ] Data access pattern diverges from the ORM/repository pattern already in use (raw SQL in a codebase that uses an ORM everywhere else)

### Implicit Coercion and Type Surprise
<!-- activation: keywords=["cast", "convert", "coerce", "implicit", "toString", "toInt", "parse", "Number", "String"] -->

- [ ] Implicit narrowing conversions (long to int, double to float, BigDecimal to double) without explicit acknowledgment of precision loss
- [ ] String concatenation with non-string types relying on implicit toString -- prefer explicit formatting
- [ ] Equality comparison between different types where implicit coercion produces surprising results (JS `==`, Python `0 == False`)
- [ ] Constructor or conversion operator marked `implicit` (Scala, C++, Kotlin) that could be invoked unintentionally by the compiler

## Common False Positives

- **Framework conventions**: Some frameworks require getters to have side effects (e.g., lazy-loading ORMs, reactive data binding). Verify the pattern is a documented framework idiom before flagging.
- **Intentional in-place mutation**: Data pipeline stages that explicitly mutate a shared context object by design (documented in the pipeline's contract) are not violations.
- **Builder pattern**: Builder methods that both mutate internal state and return `this` are expected to combine query and command. The fluent API is the convention.
- **Caching/memoization on read**: A getter that populates a cache on first access is a well-known pattern. Flag it only if the cache write has observable side effects beyond the cache itself (e.g., database writes, metrics emission).
- **Test doubles**: Mocks and stubs often have intentionally surprising behavior to test edge cases. Do not flag test infrastructure for convention violations.

## Severity Guidance

| Finding | Severity |
|---|---|
| Getter/query function that writes to database or sends network request | Critical |
| Security check function with side effects that skip on short-circuit | Critical |
| Input arguments silently mutated, causing aliasing bugs in callers | Important |
| Inconsistent return shape (null vs empty collection) across branches | Important |
| Callback invoked sync in some paths, async in others (Zalgo) | Important |
| Boolean parameter that silently disables validation | Important |
| Async marker on function that never awaits (misleading) | Minor |
| Logging inside a pure-looking function | Minor |
| Naming inconsistency with established codebase convention | Minor |
| Operator overload with non-obvious but documented semantics | Minor |

## See Also

- `principle-command-query-separation` -- the formal version of "queries should not have side effects"
- `principle-naming-and-intent` -- surprise often originates from names that mislead
- `principle-fail-fast` -- silent failures are a specific category of astonishing behavior
- `principle-dry-kiss-yagni` -- over-clever code (KISS violation) is a frequent surprise source

## Authoritative References

- [Principle of Least Astonishment (POLA) - Wikipedia](https://en.wikipedia.org/wiki/Principle_of_least_astonishment)
- [Clean Code, Ch. 3: Functions - Robert C. Martin](https://www.oreilly.com/library/view/clean-code-a/9780136083238/)
- [API Design Guidelines - Microsoft](https://learn.microsoft.com/en-us/dotnet/standard/design-guidelines/)
- [Hyrum's Law](https://www.hyrumslaw.com/)
- [Isaac Z. Schlueter - Designing for Confusion Resistance](https://izs.me/)
