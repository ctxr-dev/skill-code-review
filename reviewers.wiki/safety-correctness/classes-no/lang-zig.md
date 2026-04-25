---
id: lang-zig
type: primary
depth_role: leaf
focus: Catch memory safety, comptime misuse, and non-idiomatic patterns in Zig code
parents:
  - index.md
covers:
  - Comptime evaluation correctness and abuse
  - "Error union handling — unreachable, ignored errors, try/catch discipline"
  - "defer/errdefer pairing for resource cleanup"
  - Hidden allocation detection in standard library calls
  - Optional type unwrapping safety
  - Sentinel-terminated slice correctness
  - Packed struct alignment and memory layout
  - "Safety check toggles (ReleaseFast vs ReleaseSafe)"
  - build.zig hygiene and dependency management
  - Pointer provenance and undefined behavior
tags:
  - zig
  - systems
  - comptime
  - memory-safety
  - low-level
activation:
  file_globs:
    - "**/*.zig"
    - "**/build.zig"
    - "**/build.zig.zon"
  structural_signals:
    - Zig source files or build.zig present in diff
    - build.zig.zon dependency manifest changed
source:
  origin: file
  path: lang-zig.md
  hash: "sha256:211d3197b9eebb657d30a671e52456a4c2c0634f145f8ee4ba180a2fff7c9245"
---
# Zig Quality Reviewer

## When This Activates

Activates when a diff contains `.zig` files, `build.zig`, or `build.zig.zon`. Focuses on memory safety, comptime correctness, error handling discipline, and idiomatic Zig patterns. Particularly relevant for code interfacing with C libraries or targeting embedded/performance-critical paths.

Pay special attention to changes in allocator usage, error union handling at API boundaries, and any `@setRuntimeSafety(false)` or `unreachable` markers. These are the highest-severity review targets in Zig code.

## Audit Surface

- [ ] Every `try` expression is in a function whose return type includes the error set, or is inside a `catch` block
- [ ] `defer` and `errdefer` properly pair with every resource acquisition (allocator.alloc, fopen, mutex lock)
- [ ] Comptime blocks do not depend on runtime values; comptime loops are bounded
- [ ] Allocator is passed as a parameter — no global allocator usage in library code
- [ ] Optional values unwrapped with `if (opt) |val|` or `orelse` with safe fallback, not bare `.?`
- [ ] Sentinel-terminated slices (`[:0]u8`) not confused with regular slices (`[]u8`) at FFI boundaries
- [ ] No pointers taken to fields of packed structs (UB in Zig)
- [ ] `@setRuntimeSafety(false)` and `ReleaseFast` mode documented with rationale
- [ ] `build.zig` declares step dependencies explicitly; lazy dependencies resolved correctly
- [ ] Integer wrapping operators (`+%`, `-%`, `*%`) used intentionally, not to silence overflow checks
- [ ] `@cImport`/`@cInclude` types reviewed for nullable pointer mismatches
- [ ] Async frame lifetimes outlive the operations they represent

## Detailed Checks

### Error Handling
<!-- activation: keywords=["try", "catch", "error", "errdefer"] -->

Zig's error handling is explicit by design — every error path must be handled. The most dangerous bugs come from `catch unreachable` on error paths that can actually fire, and from missing `errdefer` on partially-initialized state.

- [ ] Functions that can fail return `!T` (error union); error sets are explicit when crossing API boundaries
- [ ] `catch unreachable` only used when the error is logically impossible, with a comment explaining why
- [ ] `errdefer` releases partially-initialized resources when a multi-step init fails midway
- [ ] Error sets are not excessively broad — avoid `anyerror` in public API signatures
- [ ] `try` is not used inside `defer` blocks (defer cannot fail in Zig)
- [ ] Switch on error unions covers all error cases or has explicit `else` with rationale
- [ ] Error return traces are not accidentally discarded by catching and re-wrapping errors
- [ ] Multiple `errdefer` in sequence ordered correctly — they execute in reverse order (LIFO)
- [ ] Error payload (`catch |err|`) used for logging before propagation in non-trivial error paths
- [ ] Named error sets merged with `||` only when both sets are needed by the caller
- [ ] `nosuspend` not confused with error handling — it suppresses suspension, not errors

### Comptime and Generics
<!-- activation: keywords=["comptime", "inline", "@TypeOf", "@typeInfo"] -->

Zig's comptime is powerful but can produce confusing errors and compile-time hangs when misused. Focus on bounded iteration, proper type constraints, and clear separation between comptime and runtime code.

- [ ] `comptime` parameters are used for type-level programming, not to force-inline hot paths (use `inline` for that)
- [ ] `@typeInfo` switches handle all union cases or have `else` with `@compileError`
- [ ] Comptime string operations (e.g., `std.fmt.comptimePrint`) do not cause excessive compile time
- [ ] Generic functions constrain their type parameters with meaningful checks, not just `anytype`
- [ ] `inline for` and `inline while` are bounded; unbounded comptime loops cause compiler OOM
- [ ] `@compileError` provides an actionable message at misuse sites
- [ ] No accidental runtime code in `comptime` blocks — watch for `std.debug.print` in comptime
- [ ] `comptime var` mutation is limited to comptime scope — results captured in const for runtime
- [ ] `@hasField` and `@hasDecl` used for duck-typing checks on generic types before access
- [ ] Comptime allocations (via comptime allocator) do not escape to runtime — results are frozen at compile time
- [ ] `@embedFile` paths are relative to source file, not working directory — verify paths are correct
- [ ] `@typeName` used for debug output only — not for runtime type dispatch (use tagged unions instead)
- [ ] Comptime-known array sizes used over runtime slices when possible — enables stack allocation

### Memory and Resource Management
<!-- activation: keywords=["alloc", "free", "defer", "create", "destroy"] -->

Zig has no garbage collector — all memory management is manual via explicit allocators. The allocator interface is Zig's central abstraction for memory. Leaks and use-after-free are the most common categories of bugs.

- [ ] Every `allocator.alloc` has a corresponding `allocator.free` in a `defer` or cleanup path
- [ ] `errdefer allocator.free(buf)` used when allocation is followed by a fallible operation
- [ ] `std.ArrayList` and `std.HashMap` call `deinit()` in defer
- [ ] No use-after-free: pointers from `ArrayList.items` invalidated after `append` (capacity change)
- [ ] Slices from temporary allocations not returned from functions (dangling pointer)
- [ ] `ArenaAllocator` used for batch allocations with shared lifetime; freed as a unit
- [ ] `@ptrCast` and `@alignCast` have the correct alignment — misaligned access is UB in ReleaseFast
- [ ] Stack allocations via `[_]u8` arrays sized appropriately; no multi-MB stack buffers
- [ ] `FixedBufferAllocator` capacity sufficient for worst case; allocation failure handled (not caught as unreachable)
- [ ] `allocator.resize` preferred over free+realloc when extending existing allocations
- [ ] Sentinel-terminated allocations (`allocator.allocSentinel`) used for C interop strings
- [ ] No mixing allocators — memory freed with the same allocator that allocated it
- [ ] `GeneralPurposeAllocator` used in debug builds for detecting leaks and double-frees
- [ ] Returned slices from functions document their allocator ownership — caller knows who frees
- [ ] `std.mem.Allocator.Error` (OutOfMemory) handled at appropriate level — not silently ignored
- [ ] Temporary allocations in loops use arena or stack fallback — not hammering the general allocator

### Concurrency and Async
<!-- activation: keywords=["Thread", "Mutex", "async", "await", "suspend"] -->

Zig's threading model is low-level (pthreads wrapper). Data races are undefined behavior. Async/await is being redesigned in newer Zig versions — review async code for frame lifetime correctness.

- [ ] `std.Thread.Mutex` used (not raw atomics) unless performance-critical path is proven
- [ ] Shared mutable state protected by mutex; no data races between threads
- [ ] `@atomicStore` and `@atomicLoad` use appropriate memory ordering (not `.unordered` for sync)
- [ ] Async frames allocated on the heap when they outlive the calling scope
- [ ] `nosuspend` only used when the call is guaranteed not to suspend
- [ ] Thread-local storage (`threadlocal`) not confused with global state
- [ ] `std.Thread.spawn` captures do not reference stack-local variables that go out of scope
- [ ] `@fence` used correctly for acquire-release synchronization; not over-fenced (performance) or under-fenced (correctness)
- [ ] Thread pool via `std.Thread.Pool` preferred over manual thread management for work-stealing patterns
- [ ] Atomic reference counting (`std.atomic.Value`) used for shared ownership across threads
- [ ] `std.Thread.Pool` work items do not capture references to stack-local data of the submitter
- [ ] Thread-safe queues (`std.Thread.ResetEvent`) used for inter-thread signaling, not busy-wait loops
- [ ] `std.os` syscall wrappers preferred over direct `@cImport` of libc for portability
- [ ] `std.Thread.Condition` used with mutex for wait/notify patterns — not spin-waiting on shared variable

### Safety and Undefined Behavior
<!-- activation: keywords=["@setRuntimeSafety", "@ptrCast", "@intFromPtr", "packed"] -->

Zig provides runtime safety checks in Debug and ReleaseSafe builds but allows opting out. Any code that disables safety or performs raw pointer operations needs careful review — these are the highest-risk areas.

- [ ] `@setRuntimeSafety(false)` blocks are minimal and justified; not applied to entire functions
- [ ] No pointer arithmetic that bypasses slice bounds checking without safety rationale
- [ ] Packed struct fields not addressed by pointer — use local copy instead
- [ ] `@bitCast` between types of equal size; source and dest types have compatible representations
- [ ] `@intFromPtr` / `@ptrFromInt` usage is confined to FFI or allocator internals
- [ ] Undefined (`undefined`) used only for lazy initialization with guaranteed write-before-read
- [ ] `@memset` and `@memcpy` length parameters correct; no overlap for `@memcpy`
- [ ] Sentinel-terminated slices: sentinel value verified before slicing — out-of-bounds sentinel read is UB
- [ ] `@truncate` applied only when upper bits are provably irrelevant; prefer `@intCast` with bounds check
- [ ] `@unionInit` used to create tagged unions; direct field write on inactive union member is UB
- [ ] Vector operations (`@Vector`) lane count matches target SIMD width; fallback for non-SIMD targets
- [ ] `@intFromEnum` and `@enumFromInt` used for enum-integer conversion — direct cast is UB for invalid values
- [ ] `@returnAddress` usage confined to profiling/debugging — not used for control flow
- [ ] Integer widths chosen intentionally — `u32` vs `usize` affects portability between 32/64-bit targets
- [ ] `std.math.maxInt` and `std.math.minInt` used for bounds checking — not hardcoded magic numbers

### C Interop and FFI
<!-- activation: keywords=["@cImport", "@cInclude", "extern", "callconv"] -->

Zig's C interop is a core strength but type mismatches at the boundary are a frequent source of UB. C pointer semantics (nullable, ownership, lifetime) must be carefully mapped to Zig's type system.

- [ ] `@cImport` types reviewed: C `NULL` maps to optional pointers in Zig
- [ ] `[*c]` pointers converted to Zig slices with known length before use
- [ ] Calling convention (`callconv(.C)`) specified for exported functions
- [ ] C strings terminated with sentinel zero; `std.mem.span` used to convert to Zig slice
- [ ] Ownership semantics clear: who frees memory allocated by C? Documented at call site
- [ ] `extern` struct layout matches C header — verify with `@sizeOf` and `@offsetOf` assertions
- [ ] `@cImport` not used in library code that must cross-compile — prefer manual `extern` declarations
- [ ] Variadic C functions called via `@cImport` with correct argument types — no implicit promotions
- [ ] C enum values imported correctly — Zig translates them to `c_int`; explicit cast may be needed
- [ ] Linker flags (link libraries, rpaths) specified in `build.zig` not hardcoded in source
- [ ] `[*c]` pointer arithmetic uses `@ptrCast` + slice conversion for bounds safety
- [ ] C `typedef` aliases mapped to Zig `distinct` types when semantics differ from the underlying type
- [ ] `align(@alignOf(T))` used on extern struct fields when C header specifies custom alignment
- [ ] Callback function pointers passed to C outlive the C call — no stack-allocated closure passed as C callback
- [ ] `@ptrCast` between function pointer types verifies calling convention compatibility
- [ ] String literals are comptime-known `[:0]const u8` — no runtime allocation needed for static strings

### Build System (build.zig)
<!-- activation: file_globs=["**/build.zig", "**/build.zig.zon"] -->

The build system is Zig code itself, so it gets full type checking. Review for reproducibility (pinned deps), correct step dependencies, and no hardcoded paths that break cross-compilation.

- [ ] `build.zig.zon` dependencies pinned to specific hashes, not mutable URLs
- [ ] Build steps declare explicit dependencies via `step.dependOn()`
- [ ] No hardcoded system include paths (`/usr/include`); use `b.sysroot` or pkg-config
- [ ] Cross-compilation targets tested if the project claims cross-platform support
- [ ] Install step (`b.installArtifact`) configured for the correct output
- [ ] Test step runs under both Debug and ReleaseSafe modes in CI
- [ ] `b.option` used for user-configurable build flags; documented in `zig build --help`
- [ ] Lazy dependencies in `build.zig.zon` only fetched when the dependent step is actually invoked
- [ ] Custom build steps use `b.addSystemCommand` not `std.ChildProcess` directly
- [ ] Build cache invalidation: generated files use `b.addWriteFiles` or hash-based paths
- [ ] `b.addRunArtifact` used for test binaries that need command-line arguments
- [ ] `@import("builtin")` used to query target OS/arch at comptime for platform-specific code paths

### Idiomatic Zig Patterns
<!-- activation: keywords=["std.", "zig"] -->

Zig favors explicitness and readability over cleverness. The standard library provides well-tested utilities that should be preferred over hand-rolled equivalents.

- [ ] Prefer `std.mem.eql` over manual loop comparison for slices
- [ ] Use `std.enums.values` instead of manual enum iteration
- [ ] Prefer `writer.print` over string concatenation for formatted output
- [ ] Use labeled blocks (`blk: { ... break :blk value; }`) instead of mutable variables for complex init
- [ ] Avoid `@as` when type can be inferred — Zig's type inference handles most cases
- [ ] Use `std.meta.sentinel` to query sentinel values at comptime rather than hardcoding
- [ ] Prefer `std.testing.expect` and `std.testing.expectEqual` over manual assert in tests
- [ ] Use `std.log` with scoped logger instead of `std.debug.print` for production diagnostics
- [ ] Prefer `std.BoundedArray` over manual slice+length tracking for small fixed-capacity buffers
- [ ] Use `std.json.parseFromSlice` rather than hand-rolling JSON parsing
- [ ] Prefer `std.fmt.allocPrint` for dynamic string formatting with allocator
- [ ] Use `std.sort.block` (formerly `std.sort.sort`) for in-place sorting of slices
- [ ] Iterator pattern: return `?T` from `next()` method; `null` signals end of iteration
- [ ] Error messages in `@compileError` and custom error sets are descriptive and actionable
- [ ] `std.testing.allocator` used in tests to detect memory leaks (fails test if allocs not freed)
- [ ] `std.io.getStdOut().writer()` buffered — not flushing on every write in performance paths
- [ ] Enum literals (`.field_name`) used when type can be inferred — avoids verbose `EnumType.field_name`
- [ ] `std.MultiArrayList` used instead of array-of-structs for cache-friendly SoA layout when applicable
- [ ] `std.fs` path operations used for cross-platform file access — no hardcoded `/` or `\` separators
- [ ] `std.process.Child` stdin/stdout/stderr pipes drained to prevent deadlock from full buffers
- [ ] Tuples (`struct { a: T, b: U }`) preferred for returning multiple values instead of out-parameters
- [ ] Doc comments (`///`) present on all public API functions — `zig doc` generates from these

## Common False Positives

- **`unreachable` after exhaustive switch**: Zig requires `unreachable` in some switch arms even when logically impossible — this is correct
- **`_ = value` to discard**: Explicitly discarding return values with `_` is idiomatic Zig, not a bug
- **`@intCast` with known-safe ranges**: When a value is bounds-checked before cast, the `@intCast` is safe
- **`anytype` in internal helpers**: Private utility functions using `anytype` is acceptable; only public API needs explicit constraints
- **`std.heap.page_allocator` in main()**: Top-level allocator choice in application main is fine; the rule applies to library code
- **`undefined` for struct field initialization in tests**: Test code may use `undefined` to test partial initialization paths deliberately

## Severity Guidance

| Finding | Severity |
|---|---|
| Use-after-free, dangling pointer from invalidated slice | Critical |
| UB from pointer to packed struct field | Critical |
| Missing errdefer on fallible init path (resource leak on error) | Critical |
| `catch unreachable` without invariant proof | Critical |
| `@memcpy` with overlapping source/dest | Critical |
| Data race — shared mutable state without mutex or atomic | Critical |
| Unbounded comptime loop (compiler hang/OOM) | Important |
| `anyerror` in public API signature (error set too broad) | Important |
| Missing `allocator.free` (memory leak) | Important |
| `@setRuntimeSafety(false)` without justification comment | Important |
| Bare `.?` unwrap without proven invariant | Important |
| Mixing allocators (alloc with A, free with B) | Important |
| `@truncate` without verifying upper bits are irrelevant | Important |
| C interop type size mismatch (`int` vs `cint`) | Important |
| Non-idiomatic pattern with correct behavior | Minor |
| Missing `zig fmt` formatting | Minor |
| Unused comptime parameter | Minor |
| `@as` used where type inference suffices | Minor |
| Missing scoped logger (using `std.debug.print` in production) | Minor |

## See Also

- `lang-c-cpp` — C interop review, pointer safety patterns
- `lang-rust` — Comparable ownership and safety model

## Authoritative References

- [Zig Language Reference](https://ziglang.org/documentation/master/)
- [Zig Standard Library Docs](https://ziglang.org/documentation/master/std/)
- [Zig Style Guide](https://ziglang.org/documentation/master/#style-guide)
- [Zig Build System Guide](https://ziglang.org/learn/build-system/)
- [Zig Safety Checks Documentation](https://ziglang.org/documentation/master/#safety)
