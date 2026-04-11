---
tools:
  - name: checkstyle
    purpose: "Java code style checker"
  - name: ktlint
    command: "ktlint --reporter=json"
    purpose: "Kotlin linter and formatter"
  - name: spotbugs
    purpose: "Java static analysis for bug patterns"
---

# Java / Kotlin — Review Overlay

Load this overlay for the **Type Safety**, **Reliability**, and **Architecture** specialists when Java or Kotlin code is being reviewed.

## Null Safety

- [ ] Kotlin code uses `?` nullable types only where `null` is a meaningful value; non-nullable types are the default and nullability is not introduced to avoid initialization
- [ ] `!!` (non-null assertion) is absent from production Kotlin code; use `?.let`, `?: return`, or `requireNotNull()` with a message instead
- [ ] Java code annotates method parameters and return types with `@NonNull` / `@Nullable` (JSR-305 or JetBrains annotations) so Kotlin interop infers correct nullability
- [ ] `Optional<T>` is used only as a return type for methods where absence is a meaningful result; it is not used for fields, method parameters, or collections

## Resource Management

- [ ] Java code uses try-with-resources (`try (var r = open()) { … }`) for all `AutoCloseable` resources; no manual `.close()` in `finally` blocks
- [ ] Kotlin code uses the `.use { }` extension for `Closeable` / `AutoCloseable` resources
- [ ] Database connections, HTTP clients, and thread pools have an explicit lifecycle and are closed on application shutdown

## Functional and Stream Patterns

- [ ] Java Stream / Kotlin Sequence operations are preferred over imperative loops for collection transformations; the intent is clearer and composable
- [ ] Kotlin `Sequence` is used instead of `List` for lazy pipelines over large or infinite collections; `asSequence()` is the correct conversion
- [ ] Stream pipelines do not perform side effects inside `map` / `filter`; side effects belong in `forEach` or collected-and-then-processed forms

## Immutability and Defaults

- [ ] Kotlin properties are `val` by default; `var` is used only when mutation is necessary and the mutability is documented
- [ ] Java fields are `final` by default in value-holding classes; mutable fields have a documented reason
- [ ] Kotlin `data class` is used for value types; `copy()` usage does not inadvertently share mutable nested objects

## Modern Language Features

- [ ] Kotlin sealed classes / Java sealed classes (Java 17+) are used for closed type hierarchies instead of open class hierarchies with instanceof chains
- [ ] Pattern matching (`when` in Kotlin, `switch` expressions / pattern matching in Java 21+) is used instead of `if-else if` chains on types
- [ ] Kotlin coroutines use structured concurrency: coroutines are launched in a `CoroutineScope` tied to a lifecycle; `GlobalScope` is absent from production code
- [ ] `suspend` functions propagate cancellation correctly; they do not call blocking APIs without `withContext(Dispatchers.IO)` wrapping

## Architecture — Dependency Injection

- [ ] `new ConcreteClass()` is absent from business logic; dependencies are injected (constructor injection preferred) so components are testable in isolation
- [ ] DI framework annotations (`@Inject`, `@Autowired`, `@Bean`) are on the constructor, not on fields, to make dependencies explicit and support immutability
- [ ] Service lifetimes (singleton, request-scoped) are explicit and match the actual usage pattern; a request-scoped bean must not be injected into a singleton directly
