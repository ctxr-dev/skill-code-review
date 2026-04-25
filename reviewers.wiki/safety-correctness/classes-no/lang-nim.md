---
id: lang-nim
type: primary
depth_role: leaf
focus: Catch memory management bugs, macro misuse, and non-idiomatic patterns in Nim code
parents:
  - index.md
covers:
  - "ARC/ORC memory management pitfalls — cycles, moved refs, sink semantics"
  - Destructor and finalizer correctness
  - Generic and template type safety
  - Effect tracking violations — side effects in func vs proc
  - C-backend interop safety — emit, importc, header mismatches
  - Macro hygiene and gensym discipline
  - Style-insensitive identifier collisions
  - Concept constraints on generic parameters
  - "Exception handling vs Result/Option patterns"
  - Module export visibility and symbol leakage
tags:
  - nim
  - systems
  - memory-management
  - arc-orc
  - metaprogramming
activation:
  file_globs:
    - "**/*.nim"
    - "**/*.nims"
    - "**/*.nimble"
    - "**/nim.cfg"
    - "**/config.nims"
  structural_signals:
    - Nim source files present in diff
    - Nimble package manifest changed
    - nim.cfg or config.nims build configuration changed
source:
  origin: file
  path: lang-nim.md
  hash: "sha256:c313a27b00087b7a0e224dfb4976a48dc1619cc506480f1b60ebdc085c0aa9d2"
---
# Nim Quality Reviewer

## When This Activates

Activates when a diff contains `.nim`, `.nims`, or `.nimble` files, or Nim configuration files. Focuses on ARC/ORC memory management correctness, effect tracking, macro hygiene, and safe C interop. Particularly relevant for code using custom destructors, templates, or the C FFI.

Pay special attention to `=destroy`/`=copy`/`=sink` hook implementations, `{.raises.}` annotations, and any `importc`/`emit` FFI boundaries. These are the highest-severity areas in Nim code reviews.

## Audit Surface

- [ ] `ref` object cycles are handled — either restructured for ARC or ORC is explicitly selected
- [ ] Custom `=destroy`, `=copy`, `=sink` hooks are self-consistent and do not double-free
- [ ] `func` is used instead of `proc` for pure computations; `{.noSideEffect.}` is honest
- [ ] Templates do not capture unintended symbols from the call site (hygiene)
- [ ] Macros use `genSym()` for internal identifiers to avoid name collisions
- [ ] `importc` declarations match C header signatures — pointer types, sizes, calling convention
- [ ] No two public symbols differ only by style-insensitive comparison (e.g., `myVar` vs `my_var`)
- [ ] Generic procs constrain type parameters with concepts or type classes in public API
- [ ] `defer` used for resource cleanup in procedures that can raise
- [ ] `except` blocks do not catch `Defect` (panics) — only `CatchableError` subtypes
- [ ] Seq and string indexing guarded by length checks or uses `high()` bound
- [ ] `cast` used only for unsafe low-level ops; `type()` conversions preferred for safe casts

## Detailed Checks

### Memory Management (ARC/ORC)
<!-- activation: keywords=["ref", "ptr", "destroy", "sink", "move", "GC", "orc", "arc"] -->

Nim's ARC (Automatic Reference Counting) and ORC (cycle collector on top of ARC) replaced the older Boehm/refc GC. ARC does not handle cycles — ORC does but adds overhead. Custom destructors must be self-consistent to avoid double-free and use-after-move bugs.

- [ ] `ref` objects that form cycles either use ORC (`--gc:orc`) or break cycles with `ptr` + manual management
- [ ] `=destroy` frees all owned resources; does not call procs that may raise
- [ ] `=copy` performs deep copy when the object owns heap resources
- [ ] `=sink` transfers ownership correctly; source object left in a valid moved-from state
- [ ] `=wasMoved` zeroes out pointer fields to prevent double-free on moved objects
- [ ] No use of `GC_ref`/`GC_unref` with ARC/ORC — these are Boehm/refc-only APIs
- [ ] `ptr` objects (manually managed) have clear ownership documentation and matching `dealloc`
- [ ] `lent` return type used to avoid unnecessary copies from container access procs
- [ ] `sink` parameters used for last-use arguments to enable move semantics
- [ ] `owned` modifier used on ref return types to transfer ownership explicitly to caller
- [ ] `cursor` type not stored beyond the container's lifetime — dangling pointer risk
- [ ] Weak references (via custom ref wrappers) not dereferenced after the target is destroyed
- [ ] `alloc`/`alloc0`/`dealloc` in low-level code paired correctly; `alloc0` zeroes memory
- [ ] `cast[ref T](nil)` not used to construct nil refs — use `default(ref T)` or explicit nil check
- [ ] Closure captures in `ref` callbacks do not keep entire object graphs alive unnecessarily
- [ ] `system.reset` used to explicitly clear `ref` fields and allow ARC to free early
- [ ] No `ref` to stack-allocated object returned from proc — dangling reference after proc returns

### Effect System and Purity
<!-- activation: keywords=["func", "proc", "noSideEffect", "raises", "tags"] -->

Nim's effect system is unique among systems languages — it tracks side effects, exceptions, and tags at the type level. The compiler enforces purity on `func` and can verify exception specifications. Misuse of `cast` to bypass effects is a critical anti-pattern.

- [ ] `func` keyword used for functions with no side effects — compiler enforces this
- [ ] `{.raises: [].}` pragma on procs that must not raise; all exceptions handled internally
- [ ] `{.tags: [].}` used to declare tag-free procs where required
- [ ] Side-effectful operations (I/O, global mutation) not hidden inside `func` via `cast`
- [ ] Exception hierarchies inherit from `CatchableError`, not `Defect` (which is for unrecoverable bugs)
- [ ] `{.push raises: [].}` sections reviewed — ensure they don't mask genuinely fallible code
- [ ] `{.gcsafe.}` pragma used for procs called from threads; compiler enforces no GC-unsafe access
- [ ] Procs passed to C callbacks marked `{.cdecl.}` and `{.gcsafe.}` to prevent GC interactions
- [ ] `{.raises: [IOError].}` annotations match actual exception behavior — not over- or under-specified
- [ ] `forbids` pragma (Nim 2.0+) used to explicitly ban certain effects in a scope
- [ ] `noReturn` pragma on procs that always raise or call `quit` — helps compiler verify exhaustiveness
- [ ] `{.sideEffect.}` not applied to genuinely pure code just to call impure procs — refactor instead
- [ ] `{.locks: 0.}` (lock level annotation) used on procs that must not acquire locks — prevents deadlock chains
- [ ] Effect annotations on iterator procs match the effects of the yielded body — iterator effects propagate

### Templates and Macros
<!-- activation: keywords=["template", "macro", "quote", "genSym", "untyped", "typed"] -->

Nim's metaprogramming operates at three levels: templates (source-level substitution), macros (AST transformation), and generics (type parameterization). Hygiene and bounded expansion are the key review concerns.

- [ ] Templates with `untyped` parameters document expected AST node kinds
- [ ] Macros use `genSym(nskVar, "name")` for internal variables to avoid capture
- [ ] `quote do:` blocks use backtick injection (`\`ident\``) correctly
- [ ] Complex macros include `dumpTree` or `treeRepr` debugging behind a `-d:debug` flag
- [ ] `{.dirty.}` templates justified — prefer hygienic templates by default
- [ ] Macro-generated code tested via `expandMacros` or `dumpAstGen` in tests
- [ ] No recursive macro expansion that could cause compile-time hang
- [ ] `typed` macro parameters preferred when AST must be type-checked before transformation
- [ ] Template `bind` used to resolve symbols in the definition context, not the call site
- [ ] `getAst` and `quote do` not mixed in confusing ways — pick one idiom per macro
- [ ] Macros that generate procs ensure the generated code compiles in isolation (testable)
- [ ] `static:` blocks used for compile-time assertions; not confused with `compileTime` pragma on procs
- [ ] `{.redefine.}` pragma used intentionally for method-like redefinition — not masking accidental overrides
- [ ] Macro-generated types registered with `{.inject.}` when needed outside macro scope

### C and Foreign Function Interface
<!-- activation: keywords=["importc", "emit", "header", "cdecl", "dynlib", "ptr"] -->

Nim compiles to C by default, making C interop seamless but also hiding dangerous type mismatches. The `importc` and `emit` pragmas bypass Nim's safety guarantees, so FFI boundaries need extra scrutiny.

- [ ] `importc` procs specify `header` or `dynlib` pragma — no relying on ambient include paths
- [ ] C `int` mapped to `cint`, not Nim `int` (different sizes on different platforms)
- [ ] Pointer parameters: C `char*` mapped to `cstring`; nullable pointers use `ptr` not `cstring`
- [ ] `emit` blocks are minimal and contain only C code that cannot be expressed via Nim pragmas
- [ ] Callback functions use `{.cdecl.}` calling convention
- [ ] String ownership clear: Nim strings passed to C must outlive the C call (no premature GC)
- [ ] `{.importc, nodecl.}` justified — usually means relying on C macro, which is fragile
- [ ] `{.passC.}` and `{.passL.}` pragmas specify compiler/linker flags needed by C dependencies
- [ ] `sizeof` and `offsetOf` used in static assertions to verify Nim types match C struct layout
- [ ] `{.union.}` pragma used for C union types; field access discipline documented (only one active field)
- [ ] `cstring` not stored in Nim data structures — convert to Nim `string` immediately for GC safety
- [ ] `{.exportc.}` procs have stable ABI — name mangling disabled for symbols intended for C consumption
- [ ] Nim `seq` and `string` not passed to C directly — they have a hidden header; use `addr seq[0]` for data pointer

### Error Handling and Exceptions
<!-- activation: keywords=["try", "except", "raise", "finally", "defer", "Option", "Result"] -->

Nim uses exceptions by default but the ecosystem is moving toward `{.raises: [].}` and `Result` types for predictable error handling. The key distinction is `CatchableError` (recoverable) vs `Defect` (unrecoverable) — catching `Defect` masks programming errors.

- [ ] `except CatchableError` preferred over bare `except` (which catches `Defect` too)
- [ ] `finally` or `defer` used for cleanup — not relying on exception handler to release resources
- [ ] Re-raised exceptions preserve the original stack trace (`raise` without argument inside `except`)
- [ ] `Option[T]` / `Result[T, E]` types used for expected failures; exceptions for truly exceptional cases
- [ ] Error messages include context (what operation failed, which input was invalid)
- [ ] `{.raises: [IOError, ValueError].}` pragmas on public API procs for documentation
- [ ] `getCurrentExceptionMsg()` used inside `except` blocks, not stale exception variables
- [ ] Custom exception types inherit from `CatchableError` and carry structured data, not just strings
- [ ] `defer` does not itself raise — exceptions in `defer` mask the original exception
- [ ] `try` blocks kept small — only wrapping the fallible operation, not unrelated code
- [ ] Error message strings allocated before entering error path — allocation in error handler can fail
- [ ] `setCurrentException(nil)` called after handling — stale exception not leaked into subsequent code

### Type System and Generics
<!-- activation: keywords=["concept", "generic", "typedesc", "static", "distinct"] -->

Nim's type system includes distinct types, object variants, concepts, and compile-time evaluation. Concepts constrain generics at the call site rather than at instantiation, providing better error messages.

- [ ] `distinct` types used for domain values that should not implicitly convert (e.g., Meters vs Feet)
- [ ] Concept definitions include all required operations — incomplete concepts cause confusing errors
- [ ] `static[T]` parameters used for compile-time values; not confused with `compileTime` pragma
- [ ] Object variants (`case kind: ...`) have all branch values handled in case statements
- [ ] Recursive types use `ref` to avoid infinite size; forward declarations where needed
- [ ] `openArray` used in proc parameters instead of `seq` to accept both arrays and seqs
- [ ] `typedesc` parameters constrain compile-time type arguments — not left as bare `type`
- [ ] `{.borrow.}` pragma used on distinct types to inherit procs from the base type intentionally
- [ ] Generic type instantiation avoids code bloat — shared implementation for pointer-like types
- [ ] `when` compile-time conditionals used for platform-specific code, not runtime `if`
- [ ] Range types (`range[0..100]`) used to encode value constraints at the type level
- [ ] `{.requiresInit.}` on object types that must be fully initialized — prevents zero-init bugs
- [ ] `case` statements on object variant `kind` field handle all branches — compiler warns but does not error by default
- [ ] `Natural` and `Positive` types used for indices and counts instead of plain `int` where appropriate
- [ ] `object` vs `ref object` chosen intentionally — value semantics (stack) vs reference semantics (heap)
- [ ] `{.pure.}` enum used to require qualified access — prevents namespace pollution from enum values
- [ ] Tuple unpacking used for multi-return: `let (a, b) = multiReturn()` — not accessing by index
- [ ] `system.sizeof` used in assertions to verify struct layout matches expectations

### Module Structure and Packaging
<!-- activation: file_globs=["**/*.nimble"], keywords=["import", "export", "include"] -->

Nim's module system uses `import` for separate compilation and `include` for textual inclusion. The `*` export marker controls visibility. Nimble is the package manager with `.nimble` manifest files.

- [ ] Only intended public symbols are marked with `*`; internal helpers remain private
- [ ] `include` used sparingly — prefer `import` to maintain proper module boundaries
- [ ] `.nimble` file specifies `requires` with version constraints, not unconstrained
- [ ] `nim.cfg` or `config.nims` does not hardcode paths that break on other machines
- [ ] Circular imports avoided — restructure with a shared types module if needed
- [ ] Test files in `tests/` directory follow `t*.nim` naming convention for nimble
- [ ] `{.used.}` pragma applied only to symbols that are intentionally unused (e.g., reserved for future use)
- [ ] `import std/[os, strutils]` submodule syntax used for selective std lib imports
- [ ] `export` statement used deliberately to re-export types from dependencies — not accidentally leaking
- [ ] `nim doc` generates clean documentation; `##` doc comments present on public procs
- [ ] `runnableExamples` blocks included in public proc doc comments for verifiable examples
- [ ] `when isMainModule:` block used for module self-tests and example usage

### Performance Patterns
<!-- activation: keywords=["openArray", "seq", "string", "iterator", "closure"] -->

Nim's performance model is close to C when compiled with `--opt:speed`. Key concerns are unnecessary copies (especially of `seq` and `string`), closure iterator overhead, and missing move semantics.

- [ ] Hot loops use `items` / `pairs` iterators, not indexed access with bounds checks
- [ ] `openArray` parameters avoid unnecessary seq copies at call sites
- [ ] Closure iterators (`iterator ... {.closure.}`) heap-allocate state — use inline iterators for perf
- [ ] String concatenation in loops uses `add` to a pre-allocated buffer, not repeated `&`
- [ ] `shallow` copies used intentionally for performance, with documented aliasing semantics
- [ ] `--opt:speed` vs `--opt:size` choice documented for release builds
- [ ] `newSeqOfCap` used when final seq size is known — avoids repeated reallocations
- [ ] `system.move` called on last-use variables to avoid unnecessary copy under ARC
- [ ] Object fields ordered by size to minimize padding (alignment-aware layout)
- [ ] `{.inline.}` pragma used only on tiny hot-path procs — over-inlining causes I-cache pressure
- [ ] `{.noInit.}` used on large stack arrays that are immediately filled — avoids zero-init overhead
- [ ] `toOpenArray` used to pass sub-ranges without copying
- [ ] `{.global.}` variables initialized thread-safely — race condition on first access from multiple threads
- [ ] `parallel` statement (if using) correctly handles non-overlapping data partitioning

## Common False Positives

- **Style-insensitive duplicates in private scope**: Nim's style insensitivity only causes collisions for exported symbols; local variables differing by case are fine
- **`proc` instead of `func` for simple getters**: If the proc accesses a global config or logger, `proc` is correct even for simple operations
- **`ptr` usage in low-level code**: Direct pointer manipulation is expected in allocator implementations, ring buffers, and FFI wrappers
- **`{.push raises: [].}` in library headers**: This is a common and correct pattern for Nim libraries to enforce exception-free APIs
- **`include` for splitting large modules**: Some Nim projects split implementation across files using `include` — this is accepted when the module is genuinely cohesive

## Severity Guidance

| Finding | Severity |
|---|---|
| Double-free from incorrect `=destroy`/`=copy` hooks | Critical |
| Cycle under ARC without ORC — memory leak | Critical |
| `importc` type mismatch causing memory corruption | Critical |
| Bare `except` catching `Defect` (masks panics) | Critical |
| Use-after-move — accessing moved `ref` object | Critical |
| `cstring` stored in Nim container (dangling pointer after GC) | Critical |
| Missing `defer`/`finally` for resource cleanup on raise path | Important |
| `func` with hidden side effects via `cast` | Important |
| Unhygienic template capturing call-site names | Important |
| Public generic without concept constraint | Important |
| Style-insensitive exported symbol collision | Important |
| Missing `{.gcsafe.}` on proc passed to thread | Important |
| `defer` block raises — masks original exception | Important |
| Missing `{.raises.}` annotation on public API | Minor |
| `seq` parameter where `openArray` suffices | Minor |
| Closure iterator where inline would suffice | Minor |
| `include` used where `import` would provide better encapsulation | Minor |
| Missing `newSeqOfCap` pre-allocation for known-size collections | Minor |

## See Also

- `lang-c-cpp` — C backend interop patterns
- `lang-python` — Similar scripting ergonomics, different memory model

## Authoritative References

- [Nim Manual](https://nim-lang.org/docs/manual.html)
- [Nim Destructors and Move Semantics](https://nim-lang.org/docs/destructors.html)
- [Nim Effect System](https://nim-lang.org/docs/manual.html#effect-system)
- [Nim Templates and Macros](https://nim-lang.org/docs/manual.html#templates)
- [Nim Style Guide](https://nim-lang.org/docs/nep1.html)
- [Nimble Package Manager Docs](https://github.com/nim-lang/nimble#readme)
