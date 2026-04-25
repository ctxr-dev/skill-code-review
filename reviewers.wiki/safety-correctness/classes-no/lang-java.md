---
id: lang-java
type: primary
depth_role: leaf
focus: "Nullability, resource management, modern Java idioms (records, sealed classes, virtual threads), and type safety"
parents:
  - index.md
covers:
  - "Nullability discipline — @NonNull/@Nullable annotations, Optional for return values only"
  - "try-with-resources for all AutoCloseable instances — no manual close() calls"
  - "Stream API correctness — no side effects in map/filter, proper terminal operations"
  - Records for data carriers — immutable, compact canonical constructors
  - Sealed classes and interfaces for exhaustive type hierarchies
  - "Virtual threads (Project Loom) — no pinning, no synchronized in virtual thread paths"
  - var usage — local inference only, type still clear from context
  - "equals/hashCode contract — consistent, symmetric, handles null"
  - Serialization safety — no Serializable on new classes without justification
  - "Exception handling — checked exceptions declared, no catch(Exception) swallowing"
  - Immutability by default — final fields, unmodifiable collections, defensive copies
  - "Null safety — nullable types explicit, no !! in production, safe calls and Elvis operator"
  - "Scope functions — let/run/with/apply/also used appropriately, not nested beyond readability"
  - Coroutines — structured concurrency, no GlobalScope, proper cancellation and exception handling
  - Flow — cold streams collected safely, backpressure handled, no leaks
  - "Data classes for value objects — correct copy() semantics, destructuring"
  - "Sealed classes/interfaces for exhaustive when expressions"
  - Delegation — by lazy, by map, interface delegation used idiomatically
  - "Inline/value classes for type-safe wrappers without runtime overhead"
  - Java interop — nullability annotations on Java-facing API, platform type handling
  - Structured concurrency — coroutine scopes tied to lifecycle, SupervisorJob where needed
tags:
  - java
  - nullability
  - streams
  - records
  - sealed-classes
  - virtual-threads
  - optional
  - serialization
  - kotlin
  - coroutines
  - flow
  - null-safety
  - scope-functions
  - data-classes
  - java-interop
aliases:
  - lang-kotlin
activation:
  file_globs:
    - "**/*.java"
    - "**/pom.xml"
    - "**/build.gradle"
    - "**/build.gradle.kts"
  structural_signals:
    - Java source files in diff
    - Maven or Gradle build file changes
source:
  origin: file
  path: lang-java.md
  hash: "sha256:9818159cf5c3336690c1286870e7c91784dafaa8313751869220d0d485846525"
---
# Java Quality Reviewer

## When This Activates

Activated when the diff contains `.java` files or changes to `pom.xml` / `build.gradle` / `build.gradle.kts`. Covers nullability discipline, resource management, modern Java features (records, sealed classes, virtual threads), stream API correctness, and common Java pitfalls.

## Audit Surface

- [ ] Null dereference risk mitigated — `@Nullable` / `@NonNull` annotations on public API boundaries
- [ ] `Optional<T>` used only for return values — never for fields, parameters, or collection elements
- [ ] All `AutoCloseable` resources managed via try-with-resources — no manual `close()` calls
- [ ] Stream intermediate operations are side-effect-free; every stream has a terminal operation
- [ ] Records used for data carriers and value objects — not mutable POJOs with boilerplate
- [ ] Sealed classes / interfaces used for closed type hierarchies requiring exhaustive handling
- [ ] `equals()` and `hashCode()` both overridden together; contract is symmetric, transitive, consistent
- [ ] No bare `catch (Exception e) {}` — exceptions handled specifically or rethrown with context
- [ ] Collections returned from public APIs are unmodifiable — internal mutable state not leaked
- [ ] `var` used only where the inferred type is obvious from context (constructor, literal, factory)
- [ ] No raw types — all generics fully parameterized
- [ ] Shared mutable state properly synchronized or uses `java.util.concurrent` types
- [ ] `Serializable` not added to new classes without justification
- [ ] String comparison uses `.equals()`, not `==` (except enum or interned constants)

## Detailed Checks

### Nullability and Optional
<!-- activation: keywords=["null", "Optional", "@Nullable", "@NonNull", "NullPointerException"] -->

- [ ] `@NonNull` / `@Nullable` (JetBrains, Jakarta, or JSR-305) annotations on all public method parameters and return types
- [ ] `Optional.get()` never called without prior `isPresent()` check — use `orElse()`, `orElseThrow()`, `map()`, `ifPresent()`
- [ ] `Optional.of()` not called with a value that might be null — use `Optional.ofNullable()`
- [ ] No `Optional` fields in classes — use a nullable field with `@Nullable` annotation instead
- [ ] No `Optional` parameters — callers forced into unnecessary wrapping; use overloads or `@Nullable`
- [ ] Null checks at public API entry points — internal code trusts its own invariants
- [ ] `Objects.requireNonNull()` used in constructors for fail-fast validation
- [ ] No returning `null` from a method declared to return a collection — return empty collection instead
- [ ] `Map.getOrDefault()` / `computeIfAbsent()` used instead of get-then-null-check patterns

### Resource Management
<!-- activation: keywords=["try", "close", "AutoCloseable", "InputStream", "Connection", "finally"] -->

- [ ] Every `AutoCloseable` resource (`InputStream`, `Connection`, `PreparedStatement`, `ResultSet`) in try-with-resources
- [ ] Multiple resources in a single try-with-resources block — not nested try blocks
- [ ] No `close()` calls in `finally` blocks — this pattern is obsolete since Java 7
- [ ] Resources not passed to methods that may store references beyond the try block scope
- [ ] Custom classes that manage resources implement `AutoCloseable`
- [ ] Connection pools (HikariCP, etc.) used for database access — not per-request `DriverManager.getConnection()`
- [ ] `BufferedReader` / `BufferedWriter` wrap raw streams for I/O performance
- [ ] `Files.newBufferedReader()` / `Files.newInputStream()` used over `FileReader` / `FileInputStream`

### Stream API Discipline
<!-- activation: keywords=["stream", "map", "filter", "collect", "forEach", "reduce", "flatMap"] -->

- [ ] No side effects in `map()`, `filter()`, `flatMap()` — these must be pure functions
- [ ] `forEach()` not used for collecting results — use `collect()` or `toList()`
- [ ] `Stream.toList()` (Java 16+) used for simple collection — not `collect(Collectors.toList())`
- [ ] Parallel streams used only for CPU-bound work on large datasets — not for I/O or small collections
- [ ] Streams not reused after terminal operation — create a new stream
- [ ] `Optional` returned from `findFirst()` / `findAny()` handled properly — not `.get()` without check
- [ ] `Collectors.toUnmodifiableMap()` / `toUnmodifiableList()` used when immutability is desired
- [ ] Stream pipeline not excessively long — extract intermediate steps to named variables for readability

### Records, Sealed Classes, and Modern Idioms
<!-- activation: keywords=["record", "sealed", "permits", "var", "switch", "pattern", "instanceof"] -->

- [ ] Records used for data carriers — not classes with only getters and a constructor
- [ ] Record compact canonical constructors validate invariants — not a separate static factory
- [ ] Sealed classes/interfaces list all `permits` explicitly when subclasses are in different files
- [ ] Pattern matching in `switch` covers all sealed subtypes — no default arm hiding missing cases
- [ ] `instanceof` pattern matching (`if (obj instanceof String s)`) used over cast-after-check
- [ ] `var` not used where it hides the type — e.g., `var x = someMethod()` when the return type is non-obvious
- [ ] Text blocks (`"""`) used for multi-line strings — not concatenation of `\n` strings
- [ ] `switch` expressions (with `->`) used over statement switches where applicable

### Equals, HashCode, and Object Contract
<!-- activation: keywords=["equals", "hashCode", "compareTo", "Comparable", "toString"] -->

- [ ] `equals()` and `hashCode()` both overridden — never one without the other
- [ ] `equals()` is reflexive, symmetric, transitive, consistent, and handles `null`
- [ ] `hashCode()` uses the same fields as `equals()` — never fewer
- [ ] `instanceof` check in `equals()` (not `getClass()`) unless there's a specific inheritance concern
- [ ] Mutable fields not used in `hashCode()` — or the object is never used as a map key / set element
- [ ] `Comparable.compareTo()` consistent with `equals()` — or the inconsistency is documented
- [ ] `Objects.hash()` used for multi-field `hashCode()` — not manual prime-multiply
- [ ] Records inherit correct `equals()` / `hashCode()` — no manual override needed unless custom behavior required

### Concurrency and Threading
<!-- activation: keywords=["synchronized", "Thread", "ExecutorService", "CompletableFuture", "volatile", "Atomic", "Lock", "virtual"] -->

- [ ] `synchronized` blocks as small as possible — not entire methods unless necessary
- [ ] `ReentrantLock` / `ReadWriteLock` used when `synchronized` is too coarse
- [ ] `volatile` on fields read by multiple threads without other synchronization
- [ ] `ConcurrentHashMap` used for shared maps — not `synchronizedMap` wrapper
- [ ] `CompletableFuture` chains handle exceptions — `exceptionally()` or `handle()` present
- [ ] `ExecutorService` shut down properly in `finally` or try-with-resources (Java 19+)
- [ ] Virtual threads (Java 21+): no `synchronized` blocks holding during I/O (causes pinning)
- [ ] Virtual threads: no `ThreadLocal` carrying large state — virtual threads are cheap but numerous
- [ ] No `Thread.sleep()` for coordination — use `CountDownLatch`, `Phaser`, or `CompletableFuture`

### Serialization and Security Pitfalls
<!-- activation: keywords=["Serializable", "ObjectInputStream", "ObjectOutputStream", "transient", "serialVersionUID"] -->

- [ ] New classes do not implement `Serializable` unless required by framework (JPA entity, caching)
- [ ] `serialVersionUID` declared if class is `Serializable` — prevents deserialization mismatch
- [ ] `transient` on fields that should not be serialized (passwords, locks, connections)
- [ ] `ObjectInputStream` never used on untrusted input — deserialization attacks (use JSON/protobuf instead)
- [ ] `readObject()` / `readResolve()` validate invariants if custom serialization is needed
- [ ] No `String` passwords — use `char[]` and clear after use
- [ ] SQL queries use `PreparedStatement` with parameters — never string concatenation
- [ ] User input validated before use in file paths, URLs, or reflection calls

### Build and Dependency Management
<!-- activation: file_globs=["**/pom.xml", "**/build.gradle", "**/build.gradle.kts"], keywords=["dependency", "plugin", "version"] -->

- [ ] Dependencies specify exact versions or ranges — no `LATEST` / `RELEASE` / `+` dynamic versions
- [ ] Test dependencies scoped to `test` (Maven) or `testImplementation` (Gradle)
- [ ] No dependency version conflicts — check with `mvn dependency:tree` or `gradle dependencies`
- [ ] Compiler source/target level matches the project's minimum Java version
- [ ] `-Xlint:all` or equivalent warnings enabled — not suppressed globally
- [ ] Annotation processors (Lombok, MapStruct) in `annotationProcessor` scope, not `compile`

## Common False Positives

- `Optional` as a field in a builder pattern intermediate state is acceptable — flag only in domain entities
- `catch (Exception e)` at top-level request handlers (servlet filters, message listeners) is valid when it logs and returns an error response — flag only when it silently swallows
- `var` in tests is generally fine even when the type is not obvious — readability standards are lower in test code
- `synchronized` on legacy code that predates `java.util.concurrent` may be intentional — suggest modernization as Minor, not Important
- Raw types in reflection-heavy frameworks (Spring bean definitions) may be unavoidable — flag only in application code
- `System.out.println` in CLI `main()` methods and build plugins is valid — flag only in library/server code

## Severity Guidance

| Finding | Severity |
|---------|----------|
| Null dereference risk on untrusted input without check | Critical |
| Resource leak — `AutoCloseable` not in try-with-resources | Critical |
| SQL injection via string concatenation in query | Critical |
| Deserialization of untrusted input via `ObjectInputStream` | Critical |
| `equals()` without `hashCode()` (or vice versa) | Important |
| `Optional.get()` without presence check | Important |
| Side effects in stream intermediate operations | Important |
| `synchronized` on virtual thread I/O path (pinning) | Important |
| Missing `@Nullable` annotation on public API | Important |
| `var` where the type is genuinely unclear | Minor |
| `Collectors.toList()` where `Stream.toList()` suffices | Minor |
| Missing `final` on local variables | Minor |
| Manual `hashCode()` instead of `Objects.hash()` | Minor |

## See Also

- `language-quality` — universal type system, resource management, and concurrency checks
- `lang-kotlin` — Kotlin-specific checks and Java/Kotlin interop concerns
- `concurrency-async` — cross-language async and concurrency patterns
- `error-resilience` — cross-language error handling and resilience patterns
- `security` — injection, deserialization, and input validation

## Authoritative References

- [Java Language Specification](https://docs.oracle.com/javase/specs/jls/se21/html/index.html)
- [Effective Java, 3rd Edition — Joshua Bloch](https://www.oreilly.com/library/view/effective-java/9780134686097/)
- [Java API Documentation](https://docs.oracle.com/en/java/javase/21/docs/api/)
- [JEP 395: Records](https://openjdk.org/jeps/395)
- [JEP 409: Sealed Classes](https://openjdk.org/jeps/409)
- [JEP 444: Virtual Threads](https://openjdk.org/jeps/444)
- [SpotBugs Bug Descriptions](https://spotbugs.readthedocs.io/en/latest/bugDescriptions.html)
- [Error Prone Bug Patterns](https://errorprone.info/bugpatterns)
