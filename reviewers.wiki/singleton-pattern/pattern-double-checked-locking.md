---
id: pattern-double-checked-locking
type: primary
depth_role: leaf
focus: Detect broken, unnecessary, and misapplied double-checked locking in lazy initialization code.
parents:
  - index.md
covers:
  - "DCL without volatile/atomic on the instance field, exposing partially constructed objects"
  - "DCL in languages where it is unnecessary due to runtime guarantees (Python GIL, Go sync.Once)"
  - "DCL implemented manually when the language provides a safer primitive (Lazy<T>, lazy_static, Once)"
  - DCL applied to non-singleton scenarios where simpler initialization suffices
  - Broken DCL variants using a boolean flag instead of checking the object reference
  - DCL with incorrect memory ordering, allowing instruction reordering to break the pattern
  - DCL in a single-threaded context where a simple null check is sufficient
  - DCL that locks on the wrong object, providing no mutual exclusion
  - DCL with exception-unsafe initialization that leaves the instance in a broken state
  - DCL optimization applied to a cold path where lock overhead is irrelevant
tags:
  - double-checked-locking
  - concurrency-pattern
  - design-patterns
  - lazy-initialization
  - volatile
  - memory-model
  - singleton
activation:
  file_globs:
    - "**/*.{java,kt,scala,cs,ts,js,py,rb,go,rs,swift,cpp,h,hpp}"
  keyword_matches:
    - double-checked
    - double checked
    - DCL
    - volatile
    - atomic
    - synchronized
    - lazy
    - once
    - Lazy
    - OnceCell
    - sync.Once
    - dispatch_once
    - LazyLock
    - instance
    - initialized
  structural_signals:
    - null_check_then_synchronized_then_null_check
    - lazy_initialization_with_lock
    - volatile_instance_field
source:
  origin: file
  path: pattern-double-checked-locking.md
  hash: "sha256:24af121e4d8554c5dabdb04b134d3a01d242832378ef0e6e807fd1e310252527"
---
# Double-Checked Locking Pattern

## When This Activates

Activates when diffs introduce the classic null-check-then-lock-then-null-check pattern for lazy initialization, use `volatile`/`atomic` annotations on instance fields alongside synchronization, implement singleton `getInstance()` methods with lock optimization, or manually implement lazy initialization in languages that offer built-in safe alternatives. DCL is one of the most error-prone concurrency patterns: it looks correct to sequential reasoning but requires specific memory model guarantees to work. Most manual implementations are broken or unnecessary.

## Audit Surface

- [ ] Instance field is marked `volatile` (Java/C#), `atomic` (C++), or uses acquire/release memory ordering
- [ ] A language-provided safe alternative is not available (if it is, use it instead of manual DCL)
- [ ] The outer check tests the object reference, not a separate boolean flag
- [ ] The inner check (after acquiring the lock) re-tests the same condition as the outer check
- [ ] Memory ordering on atomic operations is at least acquire on load and release on store
- [ ] DCL is not used in a GIL-protected language where it provides no concurrency benefit
- [ ] The code is actually concurrent -- DCL in single-threaded code is needless complexity
- [ ] The lock object is the correct one -- the same lock that guards the instance field assignment
- [ ] Initialization cannot throw, or if it can, the instance field is not set until initialization succeeds
- [ ] The code path is hot enough that lock contention justifies DCL over simple synchronized lazy init
- [ ] The inner synchronized block does not assign the field before the constructor/factory completes
- [ ] The pattern is for a genuinely long-lived object (singleton, cache), not a per-request object

## Detailed Checks

### Memory Visibility Correctness
<!-- activation: keywords=["volatile", "atomic", "memory", "barrier", "fence", "ordering", "acquire", "release", "happens-before", "visibility", "partial", "constructed", "reorder"] -->

- [ ] **Missing volatile (Java)**: the instance field is not `volatile` -- the Java Memory Model permits the JIT to reorder the assignment and the constructor, so a reading thread may see a non-null reference to a partially-constructed object
- [ ] **Missing volatile (C#)**: same issue in .NET -- without `volatile` or `Thread.MemoryBarrier()`, the CLR may reorder reads and writes, exposing an incomplete object
- [ ] **Wrong memory ordering (C++)**: `std::atomic` is used with `memory_order_relaxed` on store or load -- DCL requires at least `memory_order_release` on the store and `memory_order_acquire` on the load to establish happens-before
- [ ] **No atomic at all (C++)**: the instance pointer is a raw pointer without `std::atomic`, relying on the hope that pointer writes are atomic on the platform -- this is undefined behavior per the C++ standard
- [ ] **Partial construction visible**: the constructor writes fields after the reference is assigned -- a thread that reads the non-null reference may see default values for the object's fields (the "out-of-thin-air" problem)
- [ ] **Store before construction completes**: assignment `instance = new Foo()` is compiled to: allocate, assign pointer, call constructor -- without volatile, the second thread can see the assigned pointer before the constructor runs

### Unnecessary DCL (Safer Alternatives Exist)
<!-- activation: keywords=["Lazy", "lazy", "OnceCell", "OnceLock", "LazyLock", "lazy_static", "once_cell", "sync.Once", "dispatch_once", "Singleton", "enum", "static", "holder", "companion", "module"] -->

- [ ] **Java: use holder class or enum**: the Initialization-on-Demand Holder idiom (`private static class Holder { static final X INSTANCE = new X(); }`) is thread-safe by JLS guarantee, simpler, and faster than DCL -- or use an `enum` singleton
- [ ] **Kotlin: use `lazy {}`**: Kotlin's `by lazy { }` with `LazyThreadSafetyMode.SYNCHRONIZED` (the default) is a correct, built-in DCL -- manual DCL in Kotlin is reinventing the wheel with more room for error
- [ ] **Rust: use `OnceLock` / `LazyLock`**: `std::sync::OnceLock` (or `once_cell::sync::Lazy`) provides safe, lock-free lazy initialization -- manual DCL with `unsafe` is unnecessary and dangerous
- [ ] **Go: use `sync.Once`**: `sync.Once.Do(func())` is the idiomatic and correct Go equivalent of DCL -- hand-rolled DCL with `sync.Mutex` and a flag is error-prone
- [ ] **C#: use `Lazy<T>`**: `Lazy<T>` with `LazyThreadSafetyMode.ExecutionAndPublication` is a correct, built-in DCL -- manual implementation risks the same volatile/barrier bugs
- [ ] **Python: GIL makes DCL unnecessary**: the GIL serializes bytecode execution, so a simple `if instance is None: instance = Foo()` is safe for CPython -- DCL adds complexity with no benefit (but note: this does not apply to PyPy or free-threaded Python 3.13+)
- [ ] **Swift: use `dispatch_once` or static let**: Swift's `static let` properties are lazily initialized with dispatch_once semantics, guaranteed by the runtime -- manual DCL is redundant
- [ ] **C++: use `std::call_once` or function-local static**: since C++11, function-local statics are initialized thread-safely (the "Meyers singleton") -- `std::call_once` is the explicit equivalent

### Broken DCL Variants
<!-- activation: keywords=["flag", "boolean", "bool", "initialized", "ready", "done", "check", "if", "null", "nil", "None", "nullptr"] -->

- [ ] **Boolean flag instead of reference check**: code uses `if (!initialized)` where `initialized` is a separate boolean set after construction -- the boolean can be set to `true` before the instance is fully visible to other threads, even with volatile on the flag, because the flag and the reference are not a single atomic operation
- [ ] **Missing inner check**: the code acquires the lock but does not re-check the condition inside the synchronized block -- a second thread that was blocked on the lock now creates a second instance
- [ ] **Check-after-lock only**: the code locks first then checks -- this is safe but is simple synchronized lazy init, not DCL, and pays the full lock cost on every access. If this was intended to be DCL, the outer check is missing.
- [ ] **Checking wrong field**: the outer check tests a different field or condition than the inner check -- the invariant that the two checks agree is broken
- [ ] **Null check on primitive**: the instance is a primitive type (int, boolean) where "null" has no meaning -- DCL does not apply; use an `AtomicInteger` or `AtomicBoolean` instead

### Exception Safety
<!-- activation: keywords=["exception", "error", "throw", "try", "catch", "finally", "fail", "retry", "recover", "null", "broken"] -->

- [ ] **Instance assigned before constructor completes**: `instance = new Foo()` where `Foo()` can throw -- if the constructor throws, `instance` may be left in an inconsistent state depending on the language's memory model and compiler behavior
- [ ] **No recovery on init failure**: initialization throws but the field remains null and the code never retries -- subsequent calls see null and either NPE or skip initialization permanently
- [ ] **Caught exception leaves field set**: try-catch around initialization catches the error but does not reset the field to null -- the half-initialized instance is served to all subsequent callers
- [ ] **Factory method with side effects**: the initialization factory performs side effects (file creation, service registration) before returning -- on failure, the side effects are not rolled back, but the field is reset to null, so the next attempt performs duplicate side effects

### Over-Application
<!-- activation: keywords=["cold", "startup", "init", "config", "once", "rarely", "single", "overhead", "premature", "optimization"] -->

- [ ] **Cold path optimization**: DCL is applied to code that runs once during application startup (config loading, DI container init) -- the lock is contended exactly once; simple synchronized lazy init is clearer and equally fast
- [ ] **Single-threaded context**: the lazy initialization runs in a single-threaded context (main thread startup, script execution, CLI tool) -- DCL adds complexity with zero concurrency benefit
- [ ] **Per-request lazy init**: DCL guards a per-request or per-session object that is not shared across threads -- a simple null check suffices
- [ ] **Premature optimization**: no profiling evidence shows that lock contention on the lazy init path is a bottleneck -- DCL is applied "just in case" rather than in response to measured contention

## Common False Positives

- **Language-idiomatic lazy init**: Kotlin `by lazy`, Rust `OnceLock`/`LazyLock`, Go `sync.Once`, Swift `static let`, C++ function-local statics are the correct alternatives to DCL. Do not flag them as "manual DCL needed."
- **Enum singletons (Java)**: `enum Singleton { INSTANCE }` provides thread-safe lazy initialization by JLS guarantee. This is not DCL and should not be flagged.
- **Spring/CDI container singletons**: DI frameworks manage singleton scope internally with proper synchronization. Do not flag container-managed singletons for missing DCL.
- **Initialization-on-Demand Holder (Java)**: the holder class idiom leverages class loading guarantees for thread-safe lazy init. This is the recommended replacement for DCL, not a variant of it.
- **Atomic operations on simple values**: using `AtomicReference.compareAndSet()` or `std::atomic::compare_exchange_strong()` for lock-free lazy init is a different (and often superior) pattern. Do not classify it as broken DCL.

## Severity Guidance

| Finding | Severity |
|---|---|
| DCL without volatile/atomic on instance field in concurrent code | critical |
| Boolean-flag DCL variant where flag and reference are not atomic together | high |
| Missing inner null check after acquiring lock | high |
| Instance field assigned before constructor completes, exception possible | high |
| Manual DCL in a language offering a safe built-in alternative | medium |
| DCL in GIL-protected Python (CPython) where it is unnecessary | medium |
| Wrong memory ordering (relaxed instead of acquire/release) in C++ | critical |
| DCL on a cold path where simple synchronized init suffices | low |
| DCL in single-threaded context adding needless complexity | low |
| Missing recovery path when initialization throws | medium |

## See Also

- `pattern-singleton` -- DCL is most commonly used for singleton lazy initialization; verify the singleton justification with the same scrutiny
- `pattern-monitor-object` -- the inner synchronized block of DCL is a degenerate monitor; the same lock correctness rules apply
- `principle-immutability-by-default` -- if the lazily-initialized object is immutable, safe publication via volatile/final is simpler than DCL
- `principle-fail-fast` -- initialization failures in DCL must surface immediately; silent half-initialization violates fail-fast

## Authoritative References

- [Brian Goetz et al., *Java Concurrency in Practice* (2006), Section 16.2.4: Double-Checked Locking](https://jcip.net/)
- [William Pugh, "The 'Double-Checked Locking is Broken' Declaration" (2004)](http://www.cs.umd.edu/~pugh/java/memoryModel/DoubleCheckedLocking.html)
- [Scott Meyers and Andrei Alexandrescu, "C++ and the Perils of Double-Checked Locking" (2004)](https://www.aristeia.com/Papers/DDJ_Jul_Aug_2004_revised.pdf)
- [Joshua Bloch, *Effective Java* (3rd ed., 2018), Item 83: Use lazy initialization judiciously](https://www.oreilly.com/library/view/effective-java/9780134686097/)
- [Douglas C. Schmidt et al., *Pattern-Oriented Software Architecture Volume 2* (2000), Double-Checked Locking Optimization](https://www.wiley.com/en-us/Pattern+Oriented+Software+Architecture+Volume+2-p-9780471606956)
