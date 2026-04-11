---
tools:
  - name: scalafix
    command: "scalafix --check"
    purpose: "Scala refactoring and linting tool"
  - name: scalafmt
    command: "scalafmt --check"
    purpose: "Scala code formatter (check mode)"
---

# Scala — Review Overlay

Load this overlay for the **Type Safety**, **Reliability**, and **Functional Correctness** specialists when Scala code is being reviewed. Covers both Scala 2 (2.13+) and Scala 3.

---

## Type System and Null Safety

- [ ] `Option[T]` used instead of `null`; `Option.apply(x)` used at Java interop boundaries to safely convert `null` to `None`
- [ ] `.get` absent from `Option`, `Try`, `Either` in production code — use `map`/`flatMap`/`fold`/`getOrElse`/pattern match
- [ ] ADTs modeled with `sealed trait` + `case object`/`case class` (Scala 2) or `enum` (Scala 3); compiler verifies exhaustive matches
- [ ] Domain primitives use opaque types (Scala 3) or value classes extending `AnyVal` (Scala 2) — no raw `String`/`Int` for IDs, currencies, timestamps
- [ ] Variance annotations (`+A` covariant, `-A` contravariant) correct for position — covariant in output, contravariant in input
- [ ] `Any`, `AnyRef`, `asInstanceOf[T]` absent from production code — use typed pattern matching for safe downcasting
- [ ] (Scala 3) Union types (`A | B`) used for lightweight alternatives; intersection types (`A & B`) for composing capabilities

*Refs: [Scala 3 Enums](https://docs.scala-lang.org/scala3/reference/enums/enums.html), [Opaque Types](https://docs.scala-lang.org/scala3/reference/other-new-features/opaques.html)*

## Functional Patterns

- [ ] `val` is the default; `var` only with justification and confined to smallest scope
- [ ] Nested `flatMap`/`map` beyond two levels refactored into `for`-comprehensions
- [ ] `map`/`flatMap` contain only pure transformations; side effects use `foreach`, `.tap`, or are sequenced in an effect type
- [ ] Expected failures return `Either[E, A]` or `Try[A]` — exceptions reserved for truly fatal conditions
- [ ] `return` keyword absent — last expression is the return value (`return` allocates `NonLocalReturnControl` in lambdas)
- [ ] Recursive functions annotated with `@tailrec` — compiler errors if not in tail position

*Refs: [Effective Scala](https://twitter.github.io/effectivescala/)*

## Pattern Matching

- [ ] Matches on sealed types are exhaustive; `-Wconf:cat=other-match-analysis:error` or equivalent enabled
- [ ] Catch-all `case _ =>` not used on sealed types unless justified with a comment
- [ ] Custom extractors (`unapply`) defined for reusable complex destructuring patterns

## Implicits and Givens

- [ ] (Scala 3) `given`/`using` used instead of `implicit`; `implicit` only in Scala 2 or cross-built code
- [ ] Implicit/given instances defined in companion objects — not scattered across unrelated files
- [ ] Implicit conversions absent from new code — extension methods used instead (Scala 3 `extension`, Scala 2 `implicit class`)
- [ ] Context bounds (`[A: Ordering]`) preferred over explicit `using`/`implicit` parameter lists when instance is summoned but not named

*Refs: [Scala 2 to 3 Migration](https://docs.scala-lang.org/scala3/guides/migration/compatibility-intro.html)*

## Concurrency and Effects

- [ ] `Future` receives explicit `ExecutionContext` — `ExecutionContext.Implicits.global` not used in production
- [ ] `Await.result`/`Await.ready` absent from production code — acceptable only in tests or `main`
- [ ] Effect-based code (Cats Effect `IO`, ZIO) acquires resources via `Resource.make` / `ZIO.acquireRelease` — no manual acquire/release
- [ ] Fiber concurrency follows structured concurrency — fibers supervised, joined or cancelled before parent completes
- [ ] (Akka/Pekko) Typed actors (`Behavior[T]`) used — not classic untyped actors; message types are sealed hierarchies

*Refs: [Cats Effect](https://typelevel.org/cats-effect/), [ZIO](https://zio.dev/), [Pekko](https://pekko.apache.org/)*

## Error Handling

- [ ] `catch` blocks use `NonFatal` guard from `scala.util.control.NonFatal` — never catch `OutOfMemoryError`, `StackOverflowError`
- [ ] Domain errors modeled as sealed trait hierarchies (error ADTs), not string messages or generic exceptions
- [ ] `Future` errors handled via `.recover`/`.recoverWith`/`.transform` — not `try`/`catch` wrapping `Future` blocks

## Collections

- [ ] Immutable collections (`List`, `Vector`, `Map`, `Set`) by default; mutable only in local performance-critical scopes, converted to immutable at boundaries
- [ ] `LazyList` used for lazy sequences — not deprecated `Stream` (deprecated since 2.13)
- [ ] `.view` used for chained transformations on large collections to avoid intermediate allocations
- [ ] `.head`/`.tail` not called on potentially empty collections — use `.headOption` or pattern match

*Refs: [Scala Collections](https://docs.scala-lang.org/overviews/collections-2.13/introduction.html)*

## Build and Module Conventions

- [ ] Standard sbt/Mill layout: `src/main/scala/`, `src/test/scala/`
- [ ] Compiler flags include `-Xfatal-warnings` (Scala 2) or `-Werror` (Scala 3), `-deprecation`, `-unchecked`
- [ ] `package object` absent in Scala 3 code — top-level definitions used instead
- [ ] Case classes are `final` (Scala 2) or leaves of a sealed hierarchy — extending case classes breaks `equals`/`hashCode`

*Refs: [sbt](https://www.scala-sbt.org/), [Scalafmt](https://scalameta.org/scalafmt/), [Scalafix](https://scalacenter.github.io/scalafix/)*
