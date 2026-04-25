---
id: lang-scala
type: primary
depth_role: leaf
focus: "Sealed ADTs, Option/Either discipline, effect systems (Cats Effect, ZIO), implicits/givens, and immutable-first Scala idioms"
parents:
  - index.md
covers:
  - "Option over null — no .get calls, fold/map/getOrElse for extraction"
  - Sealed traits and enums for ADTs with exhaustive pattern matching
  - "Givens (Scala 3) and implicits (Scala 2) — companion placement, no implicit conversions"
  - "Effect systems — Cats Effect IO/ZIO used correctly with Resource for lifecycle management"
  - Immutable collections by default — mutable only in local scope, converted at boundaries
  - For-comprehensions used for monadic composition at 3+ nesting levels
  - Future discipline — explicit ExecutionContext, no Await.result in production
  - NonFatal in all catch blocks — fatal errors never caught
  - "Either/Try for expected failures — exceptions for unexpected/fatal conditions only"
  - "Opaque types (Scala 3) or value classes (Scala 2) for domain primitives"
tags:
  - scala
  - cats-effect
  - zio
  - adts
  - implicits
  - givens
  - option
  - either
  - effect-systems
  - functional
activation:
  file_globs:
    - "**/*.scala"
    - "**/*.sc"
    - "**/build.sbt"
    - "**/Build.scala"
    - "**/plugins.sbt"
  structural_signals:
    - Scala source files in diff
    - sbt build file changes
source:
  origin: file
  path: lang-scala.md
  hash: "sha256:a1434394c24d2a42b8523b92520cea55fc1bb99eb51b566520faa8098af1f81c"
---
# Scala Quality Reviewer

## When This Activates

Activated when the diff contains `.scala` or `.sc` files, or changes to `build.sbt` / `Build.scala` / `plugins.sbt`. Covers ADT design with sealed types, Option/Either discipline, effect system usage (Cats Effect, ZIO), implicit/given resolution, immutable collection patterns, and Scala-specific pitfalls.

## Audit Surface

- [ ] No `.get` on `Option`, `Try`, or `Either` in production — use `fold`, `map`, `getOrElse`, or pattern match
- [ ] Sealed traits/enums have exhaustive matches — no unguarded wildcard `_` catching future variants
- [ ] `val` by default — `var` only with clear justification; `case class` fields immutable
- [ ] `NonFatal` guard in every `catch` block — `OOM`, `StackOverflowError`, `InterruptedException` never caught
- [ ] `ExecutionContext` explicitly provided to `Future` — `scala.concurrent.ExecutionContext.global` not used in production services
- [ ] `Await.result` absent from production code — present only in tests, scripts, or `main` entry points
- [ ] Effect types (`IO` / `ZIO`) use `Resource` / `acquireRelease` for safe resource lifecycle
- [ ] Implicits (Scala 2) or givens (Scala 3) defined in companion objects — not scattered in random scopes
- [ ] No implicit conversions in new code — use extension methods (Scala 3) or explicit conversion functions
- [ ] Immutable collections by default — mutable collections confined to local scopes, converted at boundaries
- [ ] For-comprehension used over nested `flatMap`/`map` at 3+ depth levels
- [ ] `LazyList` used, not deprecated `Stream`; `.view` used for chained lazy transformations
- [ ] Compiler flags include `-Xfatal-warnings` / `-Werror`, `-deprecation`, `-unchecked`

## Detailed Checks

### Option, Either, and Error Modeling
<!-- activation: keywords=["Option", "Some", "None", "Either", "Left", "Right", "Try", ".get", "fold", "getOrElse"] -->

- [ ] `Option[T]` used for values that may be absent — never `null` in Scala code
- [ ] `.get` never called on `Option` / `Try` / `Either` in production — it throws on empty/failure
- [ ] `fold` used for exhaustive extraction: `opt.fold(default)(transform)`
- [ ] `getOrElse` provides a meaningful default — not a default that hides bugs (e.g., `0`, `""`)
- [ ] `Either[E, A]` used for expected domain errors — `Left` carries error info, `Right` carries success
- [ ] `Either` right-biased usage (Scala 2.12+) — `for`-comprehensions work directly on `Either`
- [ ] `Try` used only for wrapping code that throws — not as a general error type in new APIs
- [ ] No mixing `Option` and `null` — once in `Option`-land, stay there
- [ ] `collect` / `collectFirst` with partial functions used for type-safe extraction from collections
- [ ] `.flatten` used to unwrap nested `Option[Option[T]]` — not manual matching

### Sealed ADTs and Pattern Matching
<!-- activation: keywords=["sealed", "case class", "case object", "enum", "match", "unapply"] -->

- [ ] Sealed traits (Scala 2) or `enum` (Scala 3) used for algebraic data types
- [ ] `match` on sealed types exhaustive — no catch-all `_` unless the ADT is `@unchecked` or open
- [ ] Case classes used for ADT variants carrying data — case objects for singleton variants
- [ ] Case class fields are `val` (default) — no `var` fields in case classes
- [ ] `copy()` semantics understood — nested mutable state shared between original and copy
- [ ] Pattern match guards (`case x if condition =>`) preferred over nested `if` inside match body
- [ ] Extractor objects (`unapply`) used judiciously — not for simple field access
- [ ] `@unchecked` annotation on pattern match only when non-exhaustiveness is intentional and documented
- [ ] Scala 3 `enum` used over sealed trait hierarchies for simple ADTs with no type parameters

### Implicits, Givens, and Type Classes
<!-- activation: keywords=["implicit", "given", "using", "summon", "extension", "context bound", "Ordering", "Codec"] -->

- [ ] Implicit values (Scala 2) / givens (Scala 3) defined in companion objects for automatic resolution
- [ ] No implicit conversions in new code — use `extension` methods (Scala 3) or explicit `.toX` methods
- [ ] Context bounds (`[T: Ordering]`) preferred over explicit implicit parameters when the instance is not named
- [ ] `summon[T]` (Scala 3) / `implicitly[T]` (Scala 2) used sparingly — prefer context bound + method syntax
- [ ] Implicit scope not polluted — no wildcard imports of implicit-rich packages (`import x._`)
- [ ] Type class instances are coherent — at most one instance per type in implicit scope
- [ ] `given`/`using` clauses use named parameters when the same type appears multiple times
- [ ] Extension methods (Scala 3) scoped to their module — not globally polluting every type

### Effect Systems (Cats Effect / ZIO)
<!-- activation: keywords=["IO", "ZIO", "Resource", "Ref", "Fiber", "bracket", "acquireRelease", "Sync", "Async", "Concurrent"] -->

- [ ] Side effects wrapped in `IO` / `ZIO` — not executed eagerly at construction time
- [ ] `Resource` / `acquireRelease` used for all resources (connections, file handles, thread pools)
- [ ] `Ref` used for concurrent mutable state — not `var` or `AtomicReference` inside effect code
- [ ] `Fiber` results joined or cancelled — no fire-and-forget fibers leaking
- [ ] Error channel typed — `IO[A]` with `ApplicativeError` / `ZIO[R, E, A]` with explicit `E`
- [ ] `flatMap` chains not excessively long — extract named intermediate values for readability
- [ ] `IO.blocking` / `ZIO.attemptBlocking` wraps JVM blocking calls — not run on compute pool
- [ ] `IO.defer` / `ZIO.suspend` used to prevent eager evaluation of effect construction
- [ ] `cats.effect.unsafe.implicits.global` / `IORuntime` not imported in library code — only in main
- [ ] Test code uses `cats.effect.testing.specs2` / `zio.test` — not `unsafeRunSync` in tests

### Immutability and Collections
<!-- activation: keywords=["List", "Vector", "Map", "Set", "mutable", "immutable", "collection", "Buffer", "ArrayBuffer"] -->

- [ ] `scala.collection.immutable` types used by default — `List`, `Vector`, `Map`, `Set`
- [ ] Mutable collections (`ArrayBuffer`, `mutable.Map`) used only in local computation, converted to immutable at boundaries
- [ ] `Vector` preferred over `List` for indexed access and large collections
- [ ] `Map.getOrElse` / `Map.get` (returning `Option`) used — not `Map.apply` which throws on missing key
- [ ] Collection operations chained with `.view` for laziness when not all results are needed
- [ ] `LazyList` used instead of deprecated `Stream` (Scala 2.13+)
- [ ] `++` / `:::` used for concatenation — not `+:` in a loop (O(n^2) for `List`)
- [ ] `SortedMap` / `SortedSet` used when ordering is needed — not sorting after every insertion
- [ ] No `collection.mutable._` wildcard import leaking mutable types into API signatures

### For-Comprehensions and Monadic Composition
<!-- activation: keywords=["for", "yield", "flatMap", "map", "traverse", "sequence"] -->

- [ ] For-comprehension used when `flatMap`/`map` nesting exceeds 2 levels
- [ ] `=` (value definition) in for-comprehension used for intermediate results — not `<-` on non-monadic values
- [ ] Guard conditions (`if` in for-comprehension) used judiciously — they can silently filter in `Option`/`List`
- [ ] `traverse` / `sequence` used for `List[Future[A]]` to `Future[List[A]]` conversion — not manual fold
- [ ] For-comprehension over mixed monads avoided — `OptionT` / `EitherT` transformers used to unify
- [ ] No side effects in for-comprehension generators — side effects go in the yield or a separate statement
- [ ] `parTraverse` / `parSequence` (Cats) or `ZIO.foreachPar` used for concurrent traversal

### Future Discipline
<!-- activation: keywords=["Future", "Await", "ExecutionContext", "Promise", "onComplete", "recover"] -->

- [ ] `ExecutionContext` explicitly passed — never using `ExecutionContext.global` in production services
- [ ] `Await.result` absent from production code — only in tests, scripts, or `main` entry
- [ ] `Future` composition via `for`-comprehension or `flatMap` — not nested callbacks
- [ ] `recover` / `recoverWith` handle specific exceptions — not bare `case _ =>`
- [ ] `Future.successful` / `Future.failed` used for pre-computed values — not wrapping in `Future { }` unnecessarily
- [ ] `Promise` used only when bridging callback-based APIs — not as a general concurrency primitive
- [ ] `Future` not created in a `val` at class level — it starts executing immediately at construction
- [ ] Migration path: new code uses effect types (Cats Effect/ZIO) instead of `Future` where possible

### Build Configuration and Compiler Settings
<!-- activation: file_globs=["**/build.sbt", "**/Build.scala", "**/plugins.sbt"], keywords=["scalacOptions", "libraryDependencies"] -->

- [ ] Compiler flags include `-deprecation`, `-unchecked`, `-feature`
- [ ] `-Xfatal-warnings` (Scala 2) or `-Werror` (Scala 3) enabled in CI
- [ ] `-Wunused:imports` or equivalent enabled — no dead imports accumulating
- [ ] `scalafmt` and `scalafix` configured and enforced in CI
- [ ] Library dependencies use `%%` for Scala cross-versioned artifacts
- [ ] Test dependencies scoped with `% Test`
- [ ] No `SNAPSHOT` dependencies in release builds
- [ ] Scala 3 code does not use `package object` — uses top-level definitions instead
- [ ] Cross-compilation (`crossScalaVersions`) configured if the library targets multiple Scala versions

## Common False Positives

- `.get` on `Map` returning `Option` is fine (it returns `Option[V]`) — only flag `.apply` which throws, or `.get` on `Option` / `Try`
- `var` in Akka actors or local mutation in tight loops for performance is acceptable — flag only when `val` with transformation works
- `implicit` conversions in Scala 2 legacy code that predates extension methods may be intentional — suggest migration as Minor
- `Await.result` in test code and sbt task definitions is expected — only flag in `src/main/`
- `catch { case e: Exception => }` may be acceptable when `NonFatal` is used inside (check the full block)
- Wildcard `_` in pattern match on non-sealed types (e.g., `Int`, `String`) is normal — only flag on sealed types

## Severity Guidance

| Finding | Severity |
|---------|----------|
| `.get` on `Option`/`Try`/`Either` in production path | Critical |
| Catching fatal errors (no `NonFatal` guard) | Critical |
| Resource not wrapped in `Resource`/`acquireRelease` in effect code | Critical |
| `Await.result` in production code (blocks thread pool) | Critical |
| Missing exhaustive match on sealed type | Important |
| `Future` without explicit `ExecutionContext` | Important |
| `var` where `val` with transformation would work | Important |
| Implicit conversion in new code | Important |
| Mutable collection leaking into public API | Important |
| Nested `flatMap` where for-comprehension improves readability | Minor |
| `List` where `Vector` is better for access pattern | Minor |
| `implicitly[T]` where context bound suffices | Minor |
| Missing `-Xfatal-warnings` in build configuration | Minor |

## See Also

- `language-quality` — universal type system, resource management, and concurrency checks
- `lang-java` — JVM-level concerns, serialization, and build tooling
- `concurrency-async` — cross-language async and concurrency patterns
- `error-resilience` — cross-language error handling and resilience patterns
- `performance` — cross-language performance review

## Authoritative References

- [Scala 3 Reference](https://docs.scala-lang.org/scala3/reference/)
- [Scala 2 Language Specification](https://scala-lang.org/files/archive/spec/2.13/)
- [Cats Effect Documentation](https://typelevel.org/cats-effect/)
- [ZIO Documentation](https://zio.dev/)
- [Scala Style Guide](https://docs.scala-lang.org/style/)
- [Scalafix Rules](https://scalacenter.github.io/scalafix/)
- [WartRemover Warts](https://www.wartremover.org/doc/warts.html)
- [Effective Scala — Twitter](https://twitter.github.io/effectivescala/)
