---
id: lang-fsharp
type: primary
depth_role: leaf
focus: "F# idioms, type safety, computation expressions, async workflows, and functional-first correctness"
parents:
  - index.md
covers:
  - Discriminated union exhaustiveness and pattern match completeness
  - "Computation expression correctness (async, task, result, custom CEs)"
  - Active pattern design — total vs partial, performance implications
  - Units of measure correctness and propagation
  - "Railway-oriented programming with Result/Option chaining"
  - Pipeline operator readability and intermediate type clarity
  - Type provider configuration safety and schema drift
  - Async vs Task vs sync interop pitfalls
  - Mutable state discipline in functional-first codebase
  - "Collection pipeline efficiency (Seq vs List vs Array choice)"
  - Module and namespace organization for .NET interop
tags:
  - fsharp
  - dotnet
  - functional
  - ml-family
  - discriminated-unions
  - computation-expressions
activation:
  file_globs:
    - "**/*.fs"
    - "**/*.fsx"
    - "**/*.fsproj"
  structural_signals:
    - "F# source files in diff"
    - fsproj project file changes
source:
  origin: file
  path: lang-fsharp.md
  hash: "sha256:017fcff2e248307f183171417605c0d57a1344e1e156a3cff8d0ace093e19bdd"
---
# F# Quality Reviewer

## When This Activates

Activates when the diff contains `.fs`, `.fsx`, or `.fsproj` files. Applies F#-specific idiom checks on top of the universal language-quality reviewer. Focuses on functional-first correctness, discriminated union design, computation expression usage, and safe .NET interop.

## Audit Surface

- [ ] Pattern matches are exhaustive — no wildcard (`_`) catch-all hiding missing DU cases
- [ ] Discriminated unions model the domain completely — illegal states are unrepresentable
- [ ] Computation expressions use correct `let!`/`return`/`do!` — no accidental double-wrapping (e.g., `async { return! async { ... } }` instead of flattening)
- [ ] Async workflows propagate `CancellationToken` — long-running operations are cancellable
- [ ] `Result`/`Option` railway chains handle all error branches explicitly
- [ ] Units of measure applied to numeric domain values — no bare `float` for currencies, distances, durations
- [ ] Type providers point to stable schemas with fallback — runtime schema drift does not crash the app
- [ ] Mutable bindings (`let mutable`) are justified and localized to performance-critical or interop code
- [ ] `Seq` (lazy) vs `List` (eager) vs `Array` (perf) chosen deliberately — `Seq` not iterated multiple times
- [ ] Custom types implement structural equality/comparison correctly or opt out with `[<NoEquality; NoComparison>]`
- [ ] Tail-call recursion relied upon only where guaranteed (simple self-recursion or `[<TailCall>]` attribute)
- [ ] C# interop boundary handles nulls with `Option.ofObj`/`Option.toObj` — no `NullReferenceException` leaking in

## Detailed Checks

### Discriminated Unions & Pattern Matching
<!-- activation: keywords=["type", "match", "with", "|"] -->

- [ ] Every `match` on a DU is exhaustive without a wildcard — adding a new case produces a compiler warning
- [ ] Wildcard patterns (`_`) used only for genuinely open-ended matches (e.g., integer ranges), never to silence DU exhaustiveness
- [ ] Single-case DUs used for domain primitives (`type EmailAddress = EmailAddress of string`) — not raw strings
- [ ] DU cases carry only the data they need — no "god case" with 8+ fields (use a record instead)
- [ ] Nested pattern matches flattened where possible — prefer `match x, y with` over nested `match`
- [ ] `Option.map`/`Option.bind` preferred over explicit `match x with Some v -> ... | None -> ...` for simple transforms
- [ ] `function` keyword used appropriately — only when the match is the entire function body
- [ ] Guard clauses (`when`) in patterns do not silently drop cases — verify completeness

### Computation Expressions & Monadic Code
<!-- activation: keywords=["async", "task", "result", "let!", "do!", "return!", "yield!"] -->

- [ ] `let!` and `do!` used correctly — `let!` for values, `do!` for unit-returning operations
- [ ] `return` vs `return!` distinguished — `return` wraps a value, `return!` unwraps then re-wraps
- [ ] Custom computation expressions implement `Bind`, `Return`, `Zero` correctly — `Zero` semantics match intent
- [ ] `task { }` (from FSharp.Core 6+) preferred over `async { }` when hot-path perf matters and cancellation is handled separately
- [ ] `Async.RunSynchronously` never called on a UI/request thread — causes deadlocks
- [ ] `Async.Start` used only for fire-and-forget with error handling — exceptions do not vanish silently
- [ ] `Async.Parallel` bounded with `maxDegreeOfParallelism` for I/O-heavy workloads
- [ ] CE `use!` used for disposable resources inside computation expressions — not `let!` followed by manual dispose

### Active Patterns
<!-- activation: keywords=["(|", "active pattern"] -->

- [ ] Total active patterns (banana clips `(|A|B|)`) cover all inputs — no `MatchFailureException` at runtime
- [ ] Partial active patterns (`(|A|_|)`) return `Some`/`None` — callers handle `None` case
- [ ] Parameterized active patterns do not perform expensive computation — they run on every match
- [ ] Active patterns are unit-testable — defined as standalone functions, not buried in match expressions
- [ ] Multi-case active patterns limited to 7 cases (compiler limit) — use DU if more needed

### Units of Measure & Type Safety
<!-- activation: keywords=["[<Measure>]", "measure", "UoM"] -->

- [ ] `[<Measure>]` types defined for all physical/financial quantities — no bare `float` or `decimal`
- [ ] Conversion functions between measure types are explicit and tested (`metersToFeet`)
- [ ] Measure types propagate through calculations — not stripped via `float<_>` cast
- [ ] Generic measure functions constrained properly — `inline` used where measure-polymorphism is needed
- [ ] Measure-annotated values not mixed with un-annotated values without explicit conversion

### Pipeline Operator & Composition
<!-- activation: keywords=["|>", ">>", "<<"] -->

- [ ] Pipeline chains (`|>`) are readable — intermediate steps have obvious types; no chain > 7 steps without a `let` binding
- [ ] Function composition (`>>`) used only when point-free improves clarity — not when it obscures intent
- [ ] Partial application in pipelines creates no closure allocation in hot paths
- [ ] `|> ignore` used deliberately — confirms the discarded return value is intentional
- [ ] Pipelines do not mix side effects with pure transforms — side effects at the end or in `do` bindings

### Error Handling & Railway-Oriented Programming
<!-- activation: keywords=["Result", "Error", "Ok", "failwith", "raise"] -->

- [ ] `Result<'T, 'E>` used for expected failures — not exceptions
- [ ] Exception types used only for unexpected/unrecoverable failures
- [ ] `failwith` and `invalidArg` used only at true assertion boundaries — never for control flow
- [ ] Railway-oriented chains (`Result.bind`, `Result.map`) compose without nested `match` blocks
- [ ] Error types are discriminated unions — not bare strings — enabling exhaustive handling by callers
- [ ] `try`/`with` catches specific exceptions — no bare `with _ ->` swallowing all errors
- [ ] `Async.Catch` or `try`/`with` inside `async { }` — unhandled exceptions do not silently terminate

### Performance & Collection Choice
<!-- activation: keywords=["Seq", "List", "Array", "Map", "Set", "ResizeArray"] -->

- [ ] `List` for small, immutable, recursive data; `Array` for large, indexed, perf-sensitive; `Seq` for lazy/streaming
- [ ] `Seq` pipelines not materialized multiple times — `Seq.cache` or `Seq.toList` used when reuse is needed
- [ ] `Map`/`Set` (immutable, tree-based) vs `Dictionary`/`HashSet` (mutable, hash-based) chosen by access pattern
- [ ] `ResizeArray` (mutable list) used only in localized, performance-critical builders — not leaked into public API
- [ ] String concatenation in loops uses `StringBuilder` — not repeated `+` or `sprintf`
- [ ] `inline` keyword used for performance-critical generic math — not scattered everywhere

### .NET Interop & Null Safety
<!-- activation: keywords=["null", "Nullable", "Option.ofObj", "System.", "open System"] -->

- [ ] All values crossing the C#/F# boundary checked for null — `Option.ofObj`, `Option.ofNullable`
- [ ] F# public API exposed to C# uses `[<AllowNullLiteral>]` or `Nullable<>` annotations where appropriate
- [ ] `Unchecked.defaultof<'T>` not used except in low-level interop — it creates null values that bypass the type system
- [ ] `[<CLIEvent>]` and `[<CLIMutable>]` used correctly for interop — not applied unnecessarily
- [ ] Task/ValueTask from C# libraries awaited correctly — `task { }` CE or `Async.AwaitTask`
- [ ] .NET disposables wrapped in `use` bindings — not `let` bindings that skip disposal

## Common False Positives

- **Wildcard in `match` on primitive types** — wildcards on `int`, `string`, etc. are fine; the concern is only for DUs where exhaustiveness matters
- **`let mutable` in computation expression builders** — internal CE builder state often requires mutability; this is idiomatic
- **`Seq` used once in a pipeline** — single-pass `Seq` pipelines are efficient; only multi-iteration is a problem
- **`ignore` in test code** — test assertions may discard values intentionally
- **`Async.RunSynchronously` in scripts (.fsx)** — acceptable in scripting contexts, not in server/UI code

## Severity Guidance

| Finding | Severity |
|---------|----------|
| Non-exhaustive DU match with wildcard hiding new cases | Critical |
| `Async.RunSynchronously` on request/UI thread | Critical |
| Null leaking across interop boundary without `Option.ofObj` | Critical |
| Double-iteration of `Seq` producing incorrect results | Critical |
| Incorrect `let!`/`return!` in computation expression | Important |
| Missing `CancellationToken` propagation in async | Important |
| Bare `float` where units of measure should be used | Important |
| Mutable binding leaked into public API | Important |
| `failwith` used for expected business logic failure | Important |
| Pipeline chain > 7 steps without intermediate binding | Minor |
| `function` keyword used on multi-line match body | Minor |
| `sprintf` where string interpolation (`$"..."`) suffices | Minor |

## See Also

- `language-quality` — universal type system, resource management, and concurrency checks
- `concurrency-async` — cross-language async/await and concurrency correctness
- `error-resilience` — cross-language error handling patterns
- `performance` — general performance anti-patterns

## Authoritative References

- [F# Language Reference](https://learn.microsoft.com/en-us/dotnet/fsharp/language-reference/) — official language docs
- [F# Style Guide](https://learn.microsoft.com/en-us/dotnet/fsharp/style-guide/) — Microsoft's official style guidance
- [F# Guidelines](https://github.com/fsprojects/FSharpGuidelines) — community design guidelines
- [FSharp.Core API](https://fsharp.github.io/fsharp-core-docs/) — standard library reference
- [Computation Expressions](https://learn.microsoft.com/en-us/dotnet/fsharp/language-reference/computation-expressions) — CE deep-dive
- [Scott Wlaschin — Railway Oriented Programming](https://fsharpforfunandprofit.com/rop/) — canonical error-handling pattern
