---
tools:
  - name: cargo-check
    command: "cargo check --message-format json"
    purpose: "Rust type checking without building"
  - name: cargo-clippy
    command: "cargo clippy --message-format json"
    purpose: "Rust lint for idiomatic code"
  - name: cargo-audit
    command: "cargo audit --json"
    purpose: "Rust dependency vulnerability scan"
---

# Rust — Review Overlay

Load this overlay for the **Reliability**, **Performance**, and **Safety** specialists when Rust code is being reviewed.

## Error Handling

- [ ] `.unwrap()` and `.expect()` are absent from production code paths; they are acceptable only in tests, examples, and infallible invariants that are documented with a comment
- [ ] `.expect("reason")` is preferred over `.unwrap()` wherever a panic can theoretically occur during development, providing a diagnostic message
- [ ] `panic!` is not used for recoverable errors; `Result<T, E>` is returned and the caller decides how to handle the failure
- [ ] Custom error types implement the `std::error::Error` trait (or `thiserror::Error` derive) to interoperate with the error handling ecosystem
- [ ] The `?` operator is used to propagate errors rather than `match err { Ok(v) => v, Err(e) => return Err(e) }` boilerplate
- [ ] Error types in library crates are non-exhaustive (`#[non_exhaustive]`) or use `thiserror` sealed variants to allow adding variants without a breaking change

## Ownership and Cloning

- [ ] `.clone()` calls are justified — each one is either necessary (multiple owners needed) or a deliberate trade-off (e.g., simplicity over zero-copy); excessive cloning in hot paths is a performance red flag
- [ ] Ownership is passed by value when the callee needs to own the data; borrows (`&T`, `&mut T`) are used when the callee only needs to read or mutate temporarily
- [ ] `Rc<T>` / `Arc<T>` usage is deliberate; shared ownership is a design decision, not a workaround for borrow checker complaints
- [ ] `Arc<Mutex<T>>` patterns are reviewed for lock contention and potential deadlock; lock guards are not held across `.await` points

## Unsafe Code

- [ ] `unsafe` blocks are minimal in scope — they wrap the smallest possible expression, not entire functions
- [ ] Every `unsafe` block has a comment explaining the invariant that makes it sound (e.g., "SAFETY: the pointer is non-null and aligned because …")
- [ ] `unsafe impl Send` / `unsafe impl Sync` have corresponding SAFETY comments proving thread safety
- [ ] Unsafe code is isolated in dedicated modules with a safe public API; callers never need to write `unsafe` to use the abstraction

## Idiomatic Patterns

- [ ] Iterator adapters (`map`, `filter`, `flat_map`, `fold`, `collect`) are used instead of imperative `for` loops where the intent is clearer
- [ ] `derive` attributes (`Debug`, `Clone`, `PartialEq`, `Hash`, `Serialize`, `Deserialize`) are applied wherever derivable rather than hand-implemented
- [ ] Lifetime annotations are minimized through ownership redesign; a function that requires three lifetime parameters is usually a design smell
- [ ] `match` arms are exhaustive without a wildcard `_ => unreachable!()` catch-all unless truly exhaustive reasoning is documented
- [ ] `String` vs `&str` and `Vec<T>` vs `&[T]` choices are consistent with ownership intent; API boundaries prefer `&str` / `&[T]` for flexibility
