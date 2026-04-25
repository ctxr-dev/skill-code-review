---
id: lang-rust
type: primary
depth_role: leaf
focus: Ownership, borrowing, lifetimes, error handling, unsafe usage, and idiomatic Rust patterns
parents:
  - index.md
covers:
  - Ownership and borrowing correctness — moves, clones, and references used appropriately
  - Lifetime annotations explicit where elision is misleading or insufficient
  - "Error handling via Result/Option with ? propagation — no unwrap in production paths"
  - Minimal unsafe blocks with documented invariants and sound abstractions
  - Trait design — coherence, object safety, blanket impls, supertraits
  - Iterator chains preferred over manual loops; collect turbofish explicit
  - "Async runtime discipline — tokio vs async-std not mixed; Send/Sync bounds satisfied"
  - Pin correctness for self-referential types and async futures
  - Derive macro hygiene — Debug, Clone, PartialEq, Eq, Hash applied where appropriate
  - Cargo.toml dependency hygiene — features minimal, versions pinned, no wildcard deps
  - Clippy and rustfmt compliance — no suppressed warnings without justification
tags:
  - rust
  - ownership
  - borrowing
  - lifetimes
  - unsafe
  - async
  - tokio
  - traits
  - error-handling
activation:
  file_globs:
    - "**/*.rs"
    - "**/Cargo.toml"
    - "**/Cargo.lock"
  structural_signals:
    - Rust source files in diff
    - Cargo.toml changes
source:
  origin: file
  path: lang-rust.md
  hash: "sha256:271398acdc64638f45c013590fd299f882eba30c6aa372ed9b0bf5cb35eb39e3"
---
# Rust Quality Reviewer

## When This Activates

Activated when the diff contains `.rs` files or changes to `Cargo.toml`/`Cargo.lock`. Covers ownership and borrowing correctness, lifetime annotations, error handling discipline, unsafe usage, trait design, async runtime patterns, and Cargo dependency hygiene.

## Audit Surface

- [ ] No `unwrap()` / `expect()` in production code — propagate errors with `?` or match explicitly
- [ ] Every `clone()` has a reason — not used to silence the borrow checker without thought
- [ ] `unsafe` blocks are minimal, localized, and carry `// SAFETY:` comments documenting the invariant
- [ ] Error types implement `std::error::Error` — libraries use `thiserror`, applications use `anyhow`
- [ ] Lifetimes are explicit when compiler elision would produce a confusing or incorrect signature
- [ ] No `Rc<RefCell<>>` where ownership, plain references, or `Arc<Mutex<>>` would suffice
- [ ] Iterator adapters (`map`, `filter`, `flat_map`, `collect`) preferred over manual index loops
- [ ] Async functions contain at least one `.await` — no sync-only bodies in async fn
- [ ] `Send` + `Sync` bounds satisfied for all types crossing thread or task boundaries
- [ ] Trait objects (`dyn Trait`) justified — static dispatch preferred when the set of types is known
- [ ] `match` arms exhaustive on enums; wildcard `_` on `#[non_exhaustive]` enums handles future variants
- [ ] No `panic!` / `unreachable!` in recoverable error paths — only for true invariant violations
- [ ] `Drop` implementations are correct — no double-free, no use-after-drop via `ManuallyDrop`
- [ ] Feature flags are strictly additive — no feature that removes functionality

## Detailed Checks

### Ownership and Borrowing
<!-- activation: keywords=["&", "&mut", "move", "clone", "borrow", "owned"] -->

- [ ] Moved values not used after move — compiler catches this, but verify intent is correct
- [ ] Mutable borrows (`&mut`) not aliased — only one `&mut` active at a time
- [ ] References do not outlive their referents — no dangling reference risks in unsafe code
- [ ] `Cow<'_, T>` used where a value might or might not need to be owned (avoiding unconditional clone)
- [ ] Large structs passed by reference, not by value, unless moves are intentional
- [ ] `std::mem::take` / `std::mem::replace` used instead of clone-then-assign patterns
- [ ] Temporary values not borrowed across await points (borrow checker catches this, but intent matters)
- [ ] `Arc::clone(&x)` style used instead of `x.clone()` to clarify intent with reference-counted types

### Error Handling and Result/Option
<!-- activation: keywords=["Result", "Option", "unwrap", "expect", "?", "anyhow", "thiserror"] -->

- [ ] `?` operator used for propagation — not manual `match` on `Result` just to re-wrap
- [ ] Error context added with `.context()` (anyhow) or `.map_err()` — not bare `?` losing provenance
- [ ] `Option::unwrap_or_default()` / `unwrap_or_else()` preferred over `match` for simple defaults
- [ ] `.ok()` on `Result` only when the error is genuinely irrelevant — not silencing important failures
- [ ] Custom error enums carry enough context to diagnose the problem (file path, key, input value)
- [ ] No `Box<dyn Error>` in library code — use concrete error types for downstream matching
- [ ] `From` impls for error conversion are correct and don't lose information
- [ ] `Result<(), E>` returned from main or entry points — not `unwrap()` at top level

### Unsafe Code
<!-- activation: keywords=["unsafe", "raw pointer", "*const", "*mut", "ManuallyDrop", "transmute"] -->

- [ ] Every `unsafe` block has a `// SAFETY:` comment explaining why the invariants hold
- [ ] `unsafe` is not used to bypass the borrow checker when safe alternatives exist
- [ ] Raw pointer dereferences validated — pointer is non-null, aligned, and points to valid memory
- [ ] `transmute` avoided where `as` casts or `from_raw_parts` suffice
- [ ] `ManuallyDrop` values are actually dropped or explicitly leaked — no silent resource leak
- [ ] FFI boundaries (`extern "C"`) handle null pointers and invalid inputs defensively
- [ ] `unsafe impl Send` / `unsafe impl Sync` justified — the type truly is thread-safe
- [ ] Unsafe abstractions expose a safe API — unsafety does not leak to callers

### Trait Design and Generics
<!-- activation: keywords=["trait", "impl", "dyn", "where", "associated type", "blanket"] -->

- [ ] Traits are object-safe when they need to be used as `dyn Trait`
- [ ] Blanket implementations don't conflict with downstream impls (orphan rule respected)
- [ ] Associated types preferred over generic type parameters when there's exactly one valid type per impl
- [ ] `where` clauses used for readability when bounds are complex
- [ ] Supertraits (`trait Foo: Bar`) only when the dependency is truly required
- [ ] `Default` implemented for types that have a natural zero/empty state
- [ ] `Display` implemented for types that appear in user-facing messages (not just `Debug`)
- [ ] Sealed trait pattern used when extensibility outside the crate is not intended

### Async and Concurrency
<!-- activation: keywords=["async", "await", "tokio", "async-std", "spawn", "Mutex", "RwLock", "Arc", "channel"] -->

- [ ] Tokio and async-std runtimes not mixed in the same binary
- [ ] `tokio::sync::Mutex` used inside async code, not `std::sync::Mutex` (which blocks the executor)
- [ ] `tokio::spawn` tasks are `Send` — no non-Send types held across `.await`
- [ ] Cancellation safety: operations inside `tokio::select!` branches are cancel-safe or documented
- [ ] `JoinHandle` collected and awaited — spawned tasks not silently detached
- [ ] Blocking I/O wrapped in `tokio::task::spawn_blocking`, not called directly in async context
- [ ] Channel senders dropped to signal completion — receivers don't hang waiting forever
- [ ] `Pin<Box<dyn Future>>` used correctly — self-referential futures not moved after pinning

### Performance Patterns
<!-- activation: keywords=["collect", "Vec", "HashMap", "iter", "into_iter", "capacity", "Box", "String"] -->

- [ ] `Vec::with_capacity()` / `HashMap::with_capacity()` used when the size is known or estimable
- [ ] `collect::<Result<Vec<_>, _>>()` used to short-circuit on first error in iterator chains
- [ ] `&str` accepted in function parameters instead of `String` (or `impl AsRef<str>`)
- [ ] `into_iter()` used when ownership transfer is intended — not `iter().cloned()`
- [ ] Small `Copy` types passed by value, not by reference
- [ ] `Box<[T]>` or `Arc<[T]>` used for immutable heap slices — not `Vec<T>` that will never grow
- [ ] Stack-heavy types boxed to avoid stack overflow in deeply recursive code
- [ ] String formatting in hot paths uses `write!` to a buffer, not repeated `format!` allocations

### Cargo and Dependency Hygiene
<!-- activation: file_globs=["**/Cargo.toml"], keywords=["dependencies", "features", "workspace"] -->

- [ ] No wildcard version (`*`) in `[dependencies]` — use semver ranges or exact pins
- [ ] `default-features = false` used when only specific features are needed
- [ ] Workspace dependencies use `workspace = true` for version consistency
- [ ] `#[cfg(test)]` deps in `[dev-dependencies]`, not `[dependencies]`
- [ ] No duplicate dependencies at different versions (check `cargo tree -d`)
- [ ] `edition = "2021"` or later — not stuck on an old edition without reason
- [ ] `rust-version` (MSRV) specified if the crate is published
- [ ] Binary size: unused features of large crates (serde, tokio) disabled

### Testing Conventions
<!-- activation: keywords=["#[test]", "#[cfg(test)]", "assert", "mock", "proptest"] -->

- [ ] Tests use `#[cfg(test)]` module — test code not compiled into production binary
- [ ] `assert_eq!` / `assert_ne!` preferred over bare `assert!` for better failure messages
- [ ] Error cases tested — not just the happy path
- [ ] `#[should_panic]` includes `expected` substring to avoid masking wrong panics
- [ ] Integration tests in `tests/` directory — not mixing integration and unit tests
- [ ] `proptest` or `quickcheck` used for property-based testing of pure functions
- [ ] Test helpers return `Result` and use `?` — not `unwrap()` that obscures the failure location
- [ ] Async tests use `#[tokio::test]` (not manually building a runtime)

## Common False Positives

- `unwrap()` in test code is acceptable and expected — only flag it in `src/` production paths
- `clone()` on small `Copy`-like types (e.g., `Arc`, `Rc`, small enums) is normal and cheap
- `unsafe` in FFI bindings or low-level allocator code is expected — focus on whether invariants are documented, not on its mere presence
- `Box<dyn Error>` in binary crate error types is fine — the concern is library crates where downstream needs to match
- `#[allow(clippy::...)]` with a justification comment is acceptable — only flag bare suppression

## Severity Guidance

| Finding | Severity |
|---------|----------|
| `unwrap()` on user/network/file input in production | Critical |
| Use-after-free risk in unsafe code | Critical |
| Data race (missing `Send`/`Sync` or wrong mutex type in async) | Critical |
| Missing error context on `?` propagation | Important |
| Unnecessary `clone()` in hot path | Important |
| `unsafe` block without `// SAFETY:` comment | Important |
| Non-idiomatic iterator usage (manual loop instead of adapters) | Minor |
| Missing `#[must_use]` on pure functions returning values | Minor |
| `format!` where `write!` would avoid allocation | Minor |
| Missing `Default` derive on a type with natural default | Minor |

## See Also

- `language-quality` — universal type system, resource management, and concurrency checks
- `concurrency-async` — cross-language async and concurrency patterns
- `error-resilience` — cross-language error handling and resilience patterns
- `performance` — cross-language performance review
- `security` — memory safety and input validation

## Authoritative References

- [The Rust Reference](https://doc.rust-lang.org/reference/)
- [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/)
- [Rustonomicon — The Dark Arts of Unsafe Rust](https://doc.rust-lang.org/nomicon/)
- [Clippy Lint Documentation](https://rust-lang.github.io/rust-clippy/master/)
- [Tokio Tutorial](https://tokio.rs/tokio/tutorial)
- [Error Handling in Rust (blog)](https://blog.burntsushi.net/rust-error-handling/)
- [Rust Performance Book](https://nnethercote.github.io/perf-book/)
