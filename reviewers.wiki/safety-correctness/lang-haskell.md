---
id: lang-haskell
type: primary
depth_role: leaf
focus: Haskell correctness, purity, laziness safety, type-driven design, and ecosystem idioms
parents:
  - index.md
covers:
  - Purity and effect boundary discipline
  - Typeclass instance coherence and lawfulness
  - "Monad/applicative usage and transformer stacks"
  - Laziness traps — space leaks, thunk accumulation
  - Text vs String performance and correctness
  - Strictness annotations and bang patterns
  - "Effect systems (mtl, transformers, polysemy, effectful)"
  - "Lens/optics usage and readability"
  - "Cabal/Stack build hygiene and dependency bounds"
  - Partial function avoidance
  - Testing with QuickCheck properties and HUnit
tags:
  - haskell
  - functional
  - purity
  - laziness
  - types
  - monads
  - ghc
  - cabal
  - stack
activation:
  file_globs:
    - "**/*.hs"
    - "**/*.lhs"
    - "**/*.cabal"
    - "**/stack.yaml"
    - "**/cabal.project"
  structural_signals:
    - "Haskell source files or Cabal/Stack project configuration in diff"
source:
  origin: file
  path: lang-haskell.md
  hash: "sha256:25f206fbe3c12baa8d79cbab8d6f7f6f32ea0e12eda7bab363cd7648966b488f"
---
# Haskell Quality Reviewer

## When This Activates

Activates when the diff contains `.hs`, `.lhs` files, or Haskell build configuration (`.cabal`, `stack.yaml`, `cabal.project`). Applies GHC Haskell idioms and conventions. Assumes modern GHC (9.x) unless project config indicates otherwise.

## Audit Surface

- [ ] No partial functions (`head`, `tail`, `fromJust`, `read`, `!!`) — use total alternatives
- [ ] `Text` used for string data — not `String`/`[Char]` in non-trivial code
- [ ] Strictness annotations on data fields that accumulate in long-lived structures
- [ ] IO confined to outer layers — pure core, impure shell
- [ ] Typeclass instances are lawful — Functor/Applicative/Monad laws hold
- [ ] Space leaks checked — `foldl'` not `foldl`, `BangPatterns` on accumulators
- [ ] Monad transformer stack ordered correctly — `ReaderT` outermost, `IO` innermost
- [ ] Error types explicit — no `MonadFail`/error string for domain errors
- [ ] Exhaustive pattern matching — no incomplete patterns
- [ ] Dependency bounds in cabal file — version ranges, not unconstrained
- [ ] Orphan instances avoided — instances defined in class or type module
- [ ] No `unsafePerformIO` outside clearly documented FFI boundaries
- [ ] Qualified imports for ambiguous names — no namespace collisions

## Detailed Checks

### Purity and Effect Boundaries
<!-- activation: keywords=["IO", "unsafePerformIO", "MonadIO", "liftIO", "effect", "ReaderT"] -->

- [ ] Pure functions never use `IO` — if `IO` appears in a type signature, it must be justified
- [ ] `unsafePerformIO` used only for FFI or global mutable references with documented thread safety
- [ ] `liftIO` calls isolated to adapter/infrastructure layers — domain logic is pure
- [ ] Effect systems (mtl classes, polysemy, effectful) used to constrain which effects each function can perform
- [ ] `MonadIO` constraint used sparingly — prefer specific effect constraints (`MonadReader`, `MonadLogger`)
- [ ] No `IO` in data types stored long-term — IO actions as values are a smell unless explicitly deferred computation
- [ ] `main :: IO ()` is a thin orchestration layer calling into pure business logic
- [ ] `Debug.Trace` calls removed before merge — they are side effects in pure code

### Type System and Typeclasses
<!-- activation: keywords=["class", "instance", "deriving", "newtype", "data", "type family", "GADT"] -->

- [ ] Typeclass instances obey laws: Functor (identity, composition), Monad (left/right identity, associativity)
- [ ] No orphan instances — instance defined in the module that defines the class or the type
- [ ] `newtype` used for domain types wrapping primitives — prevents mixing `UserId` with `OrderId`
- [ ] `deriving` strategies explicit: `stock`, `newtype`, `anyclass`, `via` — not ambiguous default
- [ ] Type families are injective or have documentation noting ambiguity — GHC error messages are poor otherwise
- [ ] GADTs used to enforce protocol invariants at the type level — phantom types for simpler cases
- [ ] No overlapping instances without `{-# OVERLAPPING #-}` pragma and documented resolution
- [ ] `Coercible`/`coerce` used for zero-cost newtype conversions instead of manual wrap/unwrap

### Laziness and Space Leaks
<!-- activation: keywords=["foldl", "foldr", "seq", "BangPatterns", "strict", "evaluate", "force", "NFData"] -->

- [ ] `foldl'` (strict left fold) used instead of `foldl` — `foldl` accumulates thunks leading to stack overflow
- [ ] Accumulator parameters have bang patterns (`!acc`) or `seq` forcing in recursive functions
- [ ] `Data.Map.Strict` / `Data.HashMap.Strict` used instead of lazy variants for maps that grow over time
- [ ] Strict data fields (`data Foo = Foo !Int !Text`) on types stored in long-lived data structures
- [ ] `evaluate` or `force` (from `Control.DeepSeq`) used before storing results in IORef/MVar/STM
- [ ] No lazy I/O (`hGetContents`, `readFile` from `Prelude`) — use `Data.Text.IO` or streaming libraries
- [ ] Builders (`Data.Text.Builder`, `Data.ByteString.Builder`) used for incremental string construction
- [ ] `-O2` profiling checked for unexpected heap residency before release

### Text, ByteString, and String
<!-- activation: keywords=["Text", "ByteString", "String", "pack", "unpack", "encodeUtf8", "decodeUtf8"] -->

- [ ] `Data.Text` for human-readable strings — not `String` (which is `[Char]`, O(n) per character)
- [ ] `Data.ByteString` for binary data and I/O — `Strict` for bounded, `Lazy` for streaming
- [ ] `encodeUtf8`/`decodeUtf8` at I/O boundaries — not scattered throughout business logic
- [ ] `decodeUtf8'` (safe) preferred over `decodeUtf8` (throws on invalid UTF-8) for external input
- [ ] `OverloadedStrings` enabled for `Text`/`ByteString` literals — string literals are `IsString a => a`
- [ ] No `String` in API signatures (function types, record fields) except for GHC/library interop
- [ ] Text concatenation via `<>` (Semigroup) or `Data.Text.Builder` — not `++` on String
- [ ] `Show` not used for user-facing output — `Show` is for debugging; use `Display` or custom rendering

### Error Handling
<!-- activation: keywords=["Either", "Maybe", "ExceptT", "throwError", "catchError", "MonadError", "Exception"] -->

- [ ] `Maybe` for optional values; `Either ErrorType a` for operations that can fail with context
- [ ] Domain error types are sum types (`data AppError = NotFound | Forbidden | ...`) — not strings
- [ ] `ExceptT` / `MonadError` for effect-tracked errors — not `error :: String -> a` which throws exceptions
- [ ] `fromJust` never used — pattern match on `Maybe` or use `fromMaybe` with default
- [ ] Exception types have `Exception` instance for `catch`/`throw` interop with IO
- [ ] `bracket` / `finally` used for resource cleanup in IO — not bare `catch` that may leak
- [ ] `SomeException` caught only at top-level handlers — specific exceptions caught at specific layers
- [ ] `MonadFail` not used for business logic errors — it is for pattern match failures in `do` notation

### Pattern Matching and Totality
<!-- activation: keywords=["case", "of", "LambdaCase", "where", "let", "pattern"] -->

- [ ] All pattern matches exhaustive — GHC `-Wall` catches this; no `_` catch-all hiding missing cases
- [ ] `LambdaCase` / `\case` used for single-argument case analysis — cleaner than `\x -> case x of`
- [ ] Record pattern matching uses named fields — positional matching breaks on field reordering
- [ ] `ViewPatterns` used sparingly — they hide computation in pattern position
- [ ] Boolean blindness avoided — use sum types (`data Permission = Allowed | Denied`) not `Bool`
- [ ] `where` clauses do not shadow outer bindings — GHC warns with `-Wname-shadowing`
- [ ] Guard expressions preferred over nested `if-then-else` chains — more readable with pattern matching

### Concurrency and STM
<!-- activation: keywords=["MVar", "IORef", "TVar", "STM", "async", "forkIO", "Chan", "TMVar"] -->

- [ ] `STM` used for composable transactions — not `IORef` with manual locking
- [ ] `TVar` modifications are small — large STM transactions retry frequently under contention
- [ ] `MVar` used as a mutex or one-place channel — not as a general-purpose mutable variable
- [ ] `async` library used for structured concurrency — `withAsync` ensures child thread cleanup
- [ ] `forkIO` threads have exception handlers — unhandled exceptions in forked threads are silent
- [ ] Strict evaluation forced before writing to `TVar`/`MVar`/`IORef` — lazy values cause space leaks and lock contention
- [ ] `Chan` / `TChan` not used for single-consumer queues — use `TQueue` (no duplicates issue)
- [ ] Deadlock potential checked — `MVar` take/put ordering consistent across code paths

### Build and Dependency Hygiene
<!-- activation: file_globs=["**/*.cabal", "**/stack.yaml", "**/cabal.project", "**/package.yaml"] -->

- [ ] Version bounds on all dependencies in `.cabal` file — no unbounded `base` or core library deps
- [ ] `default-language: Haskell2010` or `GHC2021` specified
- [ ] `-Wall -Wcompat` in `ghc-options` — and `-Werror` in CI builds
- [ ] Language extensions listed per-module (`{-# LANGUAGE ... #-}`) or in cabal `default-extensions`
- [ ] Dangerous extensions (`TemplateHaskell`, `UndecidableInstances`) justified in comments
- [ ] Test suite depends on QuickCheck for property-based testing of pure functions
- [ ] `exposed-modules` in library stanza is minimal — internal modules in `other-modules`
- [ ] Hackage-bound packages have `synopsis`, `description`, `license`, `tested-with` fields

## Common False Positives

- **`foldl` on short, known-length lists** — `foldl` is fine for 3-element lists; the space leak concern is for unbounded input
- **`String` in GHC API interop** — GHC libraries use `String` extensively; conversion at the boundary is the right call
- **Lazy `ByteString` for streaming** — lazy `ByteString` is correct for streaming I/O (conduit, pipes, HTTP response bodies); only strict variants for bounded data
- **`unsafePerformIO` for global configuration** — the `{-# NOINLINE configRef #-}` + `unsafePerformIO (newIORef ...)` pattern is a well-known accepted idiom for global mutable state
- **Orphan instances in test modules** — test-only orphans (e.g., `Arbitrary` instances) are acceptable when confined to test suites
- **Partial record fields with `-Wno-partial-fields`** — some projects intentionally use partial fields with a linting pragma; flag only if pragma is absent

## Severity Guidance

| Finding | Severity |
|---------|----------|
| `unsafePerformIO` without documentation/justification | Critical |
| Space leak in long-running process (lazy fold, lazy TVar) | Critical |
| Partial function (`head`, `fromJust`) on user input | Critical |
| Orphan instance in library code | Critical |
| `foldl` on unbounded input | Important |
| `String` in public API signatures | Important |
| Missing exhaustive pattern match | Important |
| Lazy I/O (`hGetContents`) in production | Important |
| Unlawful typeclass instance | Important |
| `IO` in domain logic layer | Important |
| Missing `-Wall` in cabal ghc-options | Minor |
| `Show` used for user-facing output | Minor |
| Unbounded dependency version | Minor |
| `if-then-else` where guards would be clearer | Minor |

## See Also

- `language-quality` — universal type-system and resource checks
- `performance` — cross-language performance review
- `architecture-design` — pure core / impure shell patterns
- `concurrency-async` — cross-language concurrency patterns

## Authoritative References

- [Haskell Wiki — Avoiding Space Leaks](https://wiki.haskell.org/Memory_leak)
- [GHC User's Guide](https://downloads.haskell.org/ghc/latest/docs/users_guide/)
- [Haskell Wiki — Typeclassopedia](https://wiki.haskell.org/Typeclassopedia)
- [What I Wish I Knew When Learning Haskell](http://dev.stephendiehl.com/hask/)
- [Cabal User's Guide](https://cabal.readthedocs.io/en/stable/)
- [Haskell Style Guide (kowainik)](https://kowainik.github.io/posts/2019-02-06-style-guide)
- [Real World Haskell — Concurrency and Parallelism](http://book.realworldhaskell.org/read/concurrent-and-multicore-programming.html)
