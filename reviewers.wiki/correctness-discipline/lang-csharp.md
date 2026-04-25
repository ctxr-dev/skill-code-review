---
id: lang-csharp
type: primary
depth_role: leaf
focus: "Nullable reference types, async/await correctness, IDisposable discipline, records, Span<T>, and modern C# patterns"
parents:
  - index.md
covers:
  - Nullable reference types enabled and respected — no null dereference warnings suppressed
  - "async/await correctness — no async void, ConfigureAwait discipline, cancellation token propagation"
  - "IDisposable/IAsyncDisposable — using declarations, no leaked resources"
  - Records for immutable data — value equality, with-expressions, positional syntax
  - Pattern matching — switch expressions, property patterns, relational patterns
  - LINQ discipline — deferred execution understood, no multiple enumeration of IEnumerable
  - "Span<T> and Memory<T> for zero-allocation slicing in hot paths"
  - ValueTask for high-throughput async paths — correct usage discipline
  - "ConfigureAwait(false) in library code — no deadlocks from sync-over-async"
  - "Exception handling — specific types, no catch(Exception) swallowing"
tags:
  - csharp
  - dotnet
  - async-await
  - nullable
  - disposable
  - records
  - span
  - linq
  - pattern-matching
activation:
  file_globs:
    - "**/*.cs"
    - "**/*.csx"
    - "**/*.csproj"
    - "**/*.sln"
  structural_signals:
    - "C# source files in diff"
    - .csproj or .sln changes
source:
  origin: file
  path: lang-csharp.md
  hash: "sha256:def7857da1db4fe3be2121c4f67a577b482f7ae9978df8e6aab892b4195e95f0"
---
# C# Quality Reviewer

## When This Activates

Activated when the diff contains `.cs` or `.csx` files, or changes to `.csproj` / `.sln` files. Covers nullable reference types, async/await patterns, resource disposal, records and pattern matching, LINQ correctness, Span/Memory usage, and .NET ecosystem conventions.

## Audit Surface

- [ ] Nullable reference types enabled (`#nullable enable`) and no `!` (null-forgiving) without justification
- [ ] No `async void` except in event handlers — all async methods return `Task` or `ValueTask`
- [ ] `CancellationToken` propagated through all async call chains and passed to framework methods
- [ ] `IDisposable` / `IAsyncDisposable` resources managed via `using` declarations — no manual `Dispose()`
- [ ] `ConfigureAwait(false)` used in library code to prevent synchronization context deadlocks
- [ ] No `.Result` or `.Wait()` on `Task` in async context — causes thread pool starvation and deadlocks
- [ ] Records used for immutable value objects — value equality semantics correct
- [ ] LINQ queries materialized before reuse — no multiple enumeration of `IEnumerable<T>`
- [ ] `switch` expressions exhaustive — discard `_` pattern only with clear justification
- [ ] `Span<T>` / `ReadOnlySpan<T>` used for slicing in performance-critical paths
- [ ] `ValueTask` consumed exactly once — not awaited multiple times or stored in variables for reuse
- [ ] String comparison specifies `StringComparison` — not bare `==` for user/culture-sensitive data
- [ ] No string concatenation in loops — `StringBuilder` or `string.Join` used

## Detailed Checks

### Nullable Reference Types
<!-- activation: keywords=["null", "?", "!", "#nullable", "NullReferenceException", "?.", "??"] -->

- [ ] `#nullable enable` at project level (in `.csproj`) or file level — not disabled globally
- [ ] Null-forgiving operator `!` used only at validated boundaries (deserialization, framework injection) with a comment
- [ ] `?.` (null-conditional) and `??` (null-coalescing) used instead of explicit null checks where concise
- [ ] `??=` (null-coalescing assignment) used for lazy initialization patterns
- [ ] Method parameters annotated — `[NotNull]`, `[MaybeNull]`, `[NotNullWhen]` attributes where compiler inference is insufficient
- [ ] `string?` vs `string` distinguished — no implicit assumption that strings are never null
- [ ] Null checks at public API entry points — `ArgumentNullException.ThrowIfNull()` (C# 10+) preferred
- [ ] No `default!` to silence nullable warnings — fix the actual nullability issue
- [ ] Generic constraints include `notnull` where null type arguments would be invalid

### Async/Await Patterns
<!-- activation: keywords=["async", "await", "Task", "ValueTask", "ConfigureAwait", "CancellationToken"] -->

- [ ] `async void` used only in event handlers — never in business logic (exceptions crash the process)
- [ ] `ConfigureAwait(false)` on every `await` in library code (not needed in ASP.NET Core, but required in shared libs)
- [ ] `CancellationToken` accepted as the last parameter and forwarded to all awaited calls
- [ ] `Task.Run` not used to wrap async methods — it needlessly offloads to thread pool
- [ ] `Task.WhenAll` used for parallel independent operations — not sequential await in a loop
- [ ] No `.Result`, `.Wait()`, or `.GetAwaiter().GetResult()` in async code paths — deadlock risk
- [ ] `ValueTask` used for methods that frequently complete synchronously (cached values, pooled buffers)
- [ ] `ValueTask` consumed exactly once — not stored, awaited twice, or passed to `WhenAll`
- [ ] Async methods suffixed with `Async` by convention (except interface implementations and overrides)
- [ ] `IAsyncDisposable` implemented for types holding async resources; disposed with `await using`

### IDisposable and Resource Management
<!-- activation: keywords=["IDisposable", "IAsyncDisposable", "using", "Dispose", "GC", "Finalize"] -->

- [ ] `using` declaration (C# 8+) or `using` block for every `IDisposable` — scope matches resource lifetime
- [ ] `await using` for `IAsyncDisposable` resources — not mixing sync dispose with async resources
- [ ] Classes owning `IDisposable` fields implement `IDisposable` themselves — no orphaned resources
- [ ] `Dispose(bool)` pattern followed when the class has both managed and unmanaged resources
- [ ] No `GC.SuppressFinalize` without a finalizer — and finalizers only when unmanaged resources exist
- [ ] `HttpClient` not created per-request — use `IHttpClientFactory` or a singleton with `SocketsHttpHandler`
- [ ] `DbConnection` / `DbCommand` in `using` — not held open across request boundaries
- [ ] Streams flushed before disposal when writes must be durable — `Dispose` does not guarantee flush

### Records and Immutability
<!-- activation: keywords=["record", "init", "with", "required", "readonly", "immutable"] -->

- [ ] `record` (or `record struct`) used for data transfer objects and value objects
- [ ] `init` properties used for immutable-after-construction semantics — not `set` on value types
- [ ] `required` keyword (C# 11+) on properties that must be set at construction
- [ ] `with`-expression used for non-destructive mutation — not manual copying of properties
- [ ] `record struct` used for small value types that benefit from value equality without heap allocation
- [ ] `readonly struct` used for types that should not mutate after creation
- [ ] `readonly` on struct members that don't modify state — prevents defensive copies
- [ ] `ImmutableArray<T>` / `ImmutableList<T>` used when thread-safe immutable collections are needed
- [ ] Positional records (`record Point(int X, int Y)`) used for concise value types with deconstruction

### Pattern Matching
<!-- activation: keywords=["switch", "is", "when", "pattern", "and", "or", "not", "var pattern"] -->

- [ ] `switch` expression used over `switch` statement when returning a value
- [ ] Property patterns (`case { Name: "foo" }`) used for readable multi-property checks
- [ ] Relational patterns (`case > 0 and < 100`) used instead of chained `if` conditions
- [ ] `is not null` used instead of `!= null` for consistency with pattern matching style
- [ ] Exhaustive switch on enums — no missing cases hidden by a discard `_`
- [ ] Type patterns (`is string s`) used instead of `as` + null check
- [ ] `when` guards used in switch arms for conditional matching
- [ ] Recursive patterns not nested too deeply — extract named variables for readability

### LINQ Discipline
<!-- activation: keywords=["LINQ", "Select", "Where", "OrderBy", "GroupBy", "ToList", "IEnumerable", "IQueryable"] -->

- [ ] `IEnumerable<T>` not enumerated multiple times — call `.ToList()` / `.ToArray()` when reusing
- [ ] `IQueryable<T>` composition used for database queries — not materializing then filtering in memory
- [ ] `Any()` preferred over `Count() > 0` for existence checks — avoids full enumeration
- [ ] `FirstOrDefault()` return value checked for null/default — not assumed to always find a match
- [ ] `SingleOrDefault()` used when exactly one match is expected — not `First()` hiding duplicates
- [ ] LINQ method syntax and query syntax not mixed in the same expression
- [ ] `Select` projections close over minimal state — not capturing entire objects in closures
- [ ] `AsEnumerable()` / `AsQueryable()` transitions are intentional — not accidentally switching execution context

### Span, Memory, and Performance
<!-- activation: keywords=["Span", "ReadOnlySpan", "Memory", "stackalloc", "ArrayPool", "StringBuilder"] -->

- [ ] `ReadOnlySpan<char>` used for string slicing instead of `Substring()` in hot paths
- [ ] `stackalloc` used for small fixed-size buffers — not for unbounded sizes (stack overflow risk)
- [ ] `ArrayPool<T>.Shared` used for temporary buffers — returned in `finally` block
- [ ] `StringBuilder` used for string building in loops — not `+=` concatenation
- [ ] `string.Create()` used for known-length string construction — avoids intermediate allocations
- [ ] `Span<T>` not stored in fields or used in async methods — it is a stack-only type
- [ ] `Memory<T>` used when the span-like type needs to live on the heap or cross async boundaries
- [ ] `ValueTuple` / `struct` used for small composite return values — not allocating a class

### Exception Handling
<!-- activation: keywords=["try", "catch", "throw", "Exception", "ArgumentException", "InvalidOperationException"] -->

- [ ] Specific exception types caught — no bare `catch (Exception)` except at top-level handlers
- [ ] `throw;` used to rethrow (preserving stack trace) — not `throw ex;`
- [ ] Custom exceptions derive from `Exception` and include standard constructors (message, inner)
- [ ] `ArgumentNullException`, `ArgumentOutOfRangeException`, `InvalidOperationException` used for preconditions
- [ ] Exception messages include context — what was expected, what was received, which parameter
- [ ] `ExceptionDispatchInfo.Capture` used when rethrowing from a different context (e.g., aggregate exceptions)
- [ ] No exceptions for control flow — not using try/catch instead of `TryParse` or `TryGetValue`
- [ ] `finally` blocks do not throw — exceptions in `finally` mask the original exception

## Common False Positives

- `ConfigureAwait(false)` is not needed in ASP.NET Core top-level code (no sync context) — flag only in shared/library code
- `async void` in WPF/WinForms event handlers (`button_Click`) is the expected pattern
- `.Result` / `.Wait()` in `Main()` methods or console app entry points before C# 7.1 async main is acceptable
- `!` (null-forgiving) on Entity Framework navigation properties and DI-injected fields is a common pattern — flag only when used to silence genuine null risks
- `IEnumerable<T>` return types on repository interfaces are intentional for deferred execution — flag only when the caller enumerates multiple times
- `switch` with `_` discard on non-enum types (string, int) is normal — flag only on enum/sealed types

## Severity Guidance

| Finding | Severity |
|---------|----------|
| `async void` in non-event-handler code | Critical |
| `.Result` / `.Wait()` in async context (deadlock) | Critical |
| `IDisposable` resource not in `using` block — resource leak | Critical |
| SQL built by string interpolation — injection risk | Critical |
| Missing `CancellationToken` propagation in long-running operations | Important |
| `#nullable` disabled or `!` used without justification | Important |
| Multiple enumeration of `IEnumerable<T>` | Important |
| `ValueTask` awaited twice or stored | Important |
| Missing `ConfigureAwait(false)` in library code | Important |
| `throw ex;` instead of `throw;` (stack trace lost) | Important |
| `string +=` in loop instead of `StringBuilder` | Minor |
| `Count() > 0` instead of `Any()` | Minor |
| Missing `Async` suffix on async method name | Minor |
| `switch` statement where `switch` expression would be cleaner | Minor |

## See Also

- `language-quality` — universal type system, resource management, and concurrency checks
- `concurrency-async` — cross-language async and concurrency patterns
- `error-resilience` — cross-language error handling and resilience patterns
- `performance` — cross-language performance review
- `security` — injection, input validation, and cryptography

## Authoritative References

- [C# Language Reference](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/)
- [.NET API Design Guidelines](https://learn.microsoft.com/en-us/dotnet/standard/design-guidelines/)
- [Async/Await Best Practices](https://learn.microsoft.com/en-us/archive/msdn-magazine/2013/march/async-await-best-practices-in-asynchronous-programming)
- [Nullable Reference Types](https://learn.microsoft.com/en-us/dotnet/csharp/nullable-references)
- [IDisposable Pattern](https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/implementing-dispose)
- [Memory and Span Usage Guidelines](https://learn.microsoft.com/en-us/dotnet/standard/memory-and-spans/memory-t-usage-guidelines)
- [Roslyn Analyzers Documentation](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/overview)
- [Performance Best Practices for .NET](https://learn.microsoft.com/en-us/dotnet/core/performance/)
