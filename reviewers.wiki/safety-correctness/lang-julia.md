---
id: lang-julia
type: primary
depth_role: leaf
focus: Catch type stability, dispatch, and performance bugs in Julia code
parents:
  - index.md
covers:
  - Type instability causing dynamic dispatch and allocation on hot paths
  - Multiple dispatch correctness — method ambiguity, piracy, and specificity
  - Global variable performance penalty and const discipline
  - Abstract vs concrete types in containers and struct fields
  - Package precompilation and load-time side effects
  - "@inbounds/@simd annotation safety and correctness"
  - "Scoping rules (soft/hard scope in REPL vs scripts, let blocks)"
  - Module design and public API discipline
  - "Memory allocation patterns (views vs copies, broadcasting)"
  - Exception handling patterns and type hierarchy
  - "Metaprogramming hygiene (generated functions, macros)"
tags:
  - scientific-computing
  - numerical
  - high-performance
  - jit
  - multiple-dispatch
  - hpc
activation:
  file_globs:
    - "**/*.jl"
    - "**/Project.toml"
    - "**/Manifest.toml"
  structural_signals:
    - Julia source files in diff
    - Project.toml or Manifest.toml dependency changes
    - Module definitions or package structure changes
source:
  origin: file
  path: lang-julia.md
  hash: "sha256:17653bfedb49ea760f6112e639eb38bb4f814527bae38aebd5793d039f1607c6"
---
# Julia Quality Reviewer

## When This Activates

Activated when the diff contains `.jl` source files or Julia package manifests (`Project.toml`, `Manifest.toml`). Covers both application code and package development, with emphasis on performance-critical numerical and scientific computing patterns.

## Audit Surface

- [ ] Function return type varies by code path — `@code_warntype` shows `Union` or `Any` (type instability)
- [ ] `struct` field typed as `Any`, `Real`, `AbstractArray`, or other abstract type — prevents efficient memory layout
- [ ] Non-`const` global variable read inside a performance-critical function
- [ ] Type piracy: defining a method on a function you don't own for types you don't own
- [ ] `@inbounds` applied without prior bounds validation — out-of-bounds is undefined behavior, not a catchable error
- [ ] Array allocated via comprehension or `similar` where in-place broadcast (`.=`) would suffice
- [ ] Module `export` list includes internal helper functions not intended for public use
- [ ] `__init__()` function missing for operations that must run at load time (not precompile time)
- [ ] For loop at global scope behaves differently in REPL (soft scope) vs script (hard scope)
- [ ] Method ambiguity exists: `f(::A, ::B)` and `f(::C, ::D)` where `A <: C` and `D <: B` with no `f(::A, ::D)` defined
- [ ] String built by repeated `*` concatenation in a loop — use `IOBuffer` and `String(take!(io))`
- [ ] `mutable struct` used for data that never changes after construction — immutable enables stack allocation
- [ ] Package lacks `PrecompileTools` workload for common entry points — slow time-to-first-execution

## Detailed Checks

### Type Stability and Inference
<!-- activation: keywords=["function", "return", "Union", "Any", "code_warntype", "typeof", "::", "Core.Box"] -->

- [ ] Function return type is consistent across all branches — `if cond; return 1; else; return 1.0; end` is unstable (Int64 vs Float64), use `1.0` in both branches or explicit conversion
- [ ] Container element types are concrete: `Vector{Float64}` not `Vector{Real}` or `Vector{Any}` — abstract element types box every element, destroying performance
- [ ] Type parameters on structs are concrete at construction: `MyStruct{Float64}(...)` not `MyStruct{Real}(...)` unless the struct is parametric and dispatch happens on the parameter
- [ ] `@code_warntype` run on critical functions — red-highlighted `Any`, `Union{...}`, or `Core.Box` in body types indicates instability or captured variable issues
- [ ] Small `Union` types (2-3 members) are acceptable — Julia 1.0+ handles small unions efficiently via union splitting; `Union{Nothing, T}` is idiomatic
- [ ] `convert` and `promote` methods are defined for custom numeric types that interact with built-in arithmetic operators
- [ ] Return type annotation (`::T`) used sparingly — it inserts a runtime `convert` call, not a static compile-time guarantee; it does not fix instability, it masks it with conversion
- [ ] `isa` / `typeof` checks in hot paths suggest a design that should use dispatch instead — runtime type checks defeat compiler optimizations
- [ ] Keyword argument types are stable: `f(; x=nothing)` where `x` is sometimes `nothing` and sometimes a value creates instability; use `f(; x::Union{Nothing,Int}=nothing)` or separate methods
- [ ] Closures capture variables by reference — if the captured variable changes type in a loop, the closure is type-unstable; use `let` barrier or pass as argument
- [ ] Dictionary value types are concrete: `Dict{String, Any}` is a performance sink; `Dict{String, Float64}` or a struct is better

### Multiple Dispatch and Method Design
<!-- activation: keywords=["function", "method", "dispatch", "abstract", "struct", "::", "where", "promote_rule"] -->

- [ ] No type piracy: new methods only added when at least one argument type is defined in the current package — piracy causes unpredictable behavior when packages load
- [ ] `Aqua.test_piracy()` passes in the test suite — automated piracy detection catches accidental piracy from overly generic method signatures
- [ ] Method ambiguities resolved: `Aqua.test_ambiguities()` passes — ambiguous methods cause `MethodError` at runtime for specific argument combinations
- [ ] `where` clauses constrain type parameters tightly: `f(x::Vector{T}) where {T<:Real}` not `where T` (unconstrained) — unconstrained params accept anything including non-numeric types
- [ ] Abstract type hierarchy is shallow and meaningful — deep hierarchies (>3 levels) add complexity without benefit; prefer composition with traits
- [ ] Fallback methods (`f(x)` without type annotation) are intentional — they prevent `MethodError` for unsupported types and may silently hide bugs by accepting wrong inputs
- [ ] `Base` function extensions use `import` correctly: `import Base: show` then `Base.show(io::IO, x::MyType)` — or qualify explicitly without import
- [ ] Inner constructors enforce invariants: `function MyStruct(x); @assert x > 0; new(x); end` — outer constructors should not bypass inner constructor checks
- [ ] `promote_rule` definitions are consistent: if `promote_rule(A, B) = C`, then `C` should be able to represent both `A` and `B` without loss
- [ ] Method signatures do not over-constrain: `f(x::Vector{Float64})` rejects `Vector{Float32}`; use `f(x::AbstractVector{<:AbstractFloat})` for generality

### Global Variables and Constants
<!-- activation: keywords=["global", "const", "module", "let", "Ref"] -->

- [ ] Module-level variables are `const` unless they genuinely need mutation at runtime — non-const globals force the compiler to insert type checks on every access
- [ ] Non-const globals accessed in hot functions: pass as function arguments instead, or use `const` Ref: `const SETTING = Ref{Int}(0)`
- [ ] `const` global containers (Dict, Vector) have stable value types — `const` prevents reassignment but contents can mutate; the container type is what the compiler uses
- [ ] `Ref{T}()` used for typed mutable global state — avoids Any boxing while allowing mutation: `const COUNTER = Ref{Int}(0); COUNTER[] += 1`
- [ ] Global configuration uses `const` Dict or module-scoped Ref, not bare mutable global variables — benchmark shows 10-100x difference on hot paths
- [ ] `let` block used to create closure-scoped constants in global scope — common pattern for C library handles: `const lib_handle = let; h = dlopen("lib"); finalizer(dlclose, h); h; end`
- [ ] Reassigning a `const` global to a value of the same type emits a warning but works — reassigning to a different type is an error; neither should appear in production code
- [ ] Global `Threads.Atomic{T}` used for thread-safe counters — plain global variables are not atomic even with `const`

### Memory and Allocation Patterns
<!-- activation: keywords=["broadcast", ".", "@.", "copy", "view", "similar", "allocat", "GC", "@views", "in-place", "sizehint!", "resize!"] -->

- [ ] Broadcasting uses dot syntax (`f.(x)` or `@.` macro) for element-wise operations — avoids allocating intermediate temporary arrays
- [ ] `@views` macro applied to slicing operations: `A[1:10, :]` allocates a new array; `@view A[1:10, :]` creates a zero-copy view into the original
- [ ] Pre-allocated output arrays used with mutating functions: `mul!(C, A, B)` instead of `C = A * B`; `ldiv!` instead of `\`; convention is `!` suffix means mutation
- [ ] String concatenation in loops uses `IOBuffer`: `io = IOBuffer(); for s in strs; print(io, s); end; String(take!(io))` — or use `join(strs)`
- [ ] `similar(A)` used to allocate output with matching type, element type, and size — not `zeros()` when all values will be overwritten (unnecessary initialization)
- [ ] Tuple used instead of small Vector for fixed-size collections — tuples are stack-allocated and unboxed; `SVector` from StaticArrays.jl for fixed-size arrays with arithmetic
- [ ] `sizehint!` called on containers that will grow incrementally to a known final size — reduces reallocation count
- [ ] Splatting (`f(args...)`) in tight loops may cause heap allocation of the tuple — benchmark and consider manual argument passing for hot paths
- [ ] `copy` vs `deepcopy`: `copy` is shallow (nested arrays share data); `deepcopy` is recursive (expensive); choose based on mutation intent
- [ ] Column-major order: Julia arrays are column-major — iterate `for j in axes(A,2), i in axes(A,1)` not `for i, j` to avoid cache misses on large arrays
- [ ] `reinterpret` and `unsafe_wrap` create views with different element types — mutation affects the underlying data; ensure lifetime management is correct

### @inbounds, @simd, and Unsafe Annotations
<!-- activation: keywords=["@inbounds", "@simd", "@fastmath", "unsafe", "@turbo", "ccall", "pointer", "cfunction", "GC.@preserve"] -->

- [ ] `@inbounds` is preceded by an explicit bounds check or the loop indices are provably in range (e.g., `for i in eachindex(A)`)
- [ ] `@inbounds` is not applied to an entire large function body — scope it to the specific loop or array access that needs it
- [ ] `@simd` applied only to innermost loops with independent iterations — no cross-iteration data dependencies, no branches, no function calls with side effects
- [ ] `@fastmath` understood: it enables floating-point reassociation, may change results, and assumes no NaN/Inf — never use for financial, scientific validation, or IEEE-compliance-required code
- [ ] `ccall` argument types match C function signature exactly — wrong types cause segfaults, memory corruption, or silent wrong results
- [ ] `ccall` string arguments: use `Cstring` or `Ref{Cchar}`; Julia strings may be moved by GC during the C call — use `GC.@preserve` or `pointer(s)` carefully
- [ ] `unsafe_wrap` array: the wrapped memory must outlive the Julia Array — if the C library frees the memory, the Julia array becomes a dangling pointer
- [ ] `@turbo` (LoopVectorization.jl) applied only to loops meeting its requirements: no branches in loop body, simple arithmetic, contiguous array access
- [ ] `@ccall` (Julia 1.5+) used instead of legacy `ccall` syntax for readability — but verify that the type mapping is correct
- [ ] `GC.@preserve` used when passing pointers derived from Julia objects to C — prevents GC from collecting the object during the ccall

### Module Design and Package Structure
<!-- activation: file_globs=["**/src/**/*.jl", "**/Project.toml"], keywords=["module", "export", "import", "using", "include", "public", "__init__", "precompile"] -->

- [ ] `export` list is intentional and minimal — only public API symbols exported; internals accessed via `Module.internal_func()`
- [ ] `using OtherPackage: specific_function` preferred over bare `using OtherPackage` — avoids importing all exports and reduces namespace collisions
- [ ] `include` order in module file matches dependency order — functions must be defined before first use in Julia (no forward declarations)
- [ ] `__init__()` function handles runtime initialization: RNG seeding, C library handle loading, conditional dependencies, global state setup that cannot happen during precompilation
- [ ] `PrecompileTools.@setup_workload` / `@compile_workload` included for common entry points — reduces time-to-first-execution for users
- [ ] `Project.toml` `[compat]` section has entries for all direct dependencies with upper bounds — prevents breakage from new major versions
- [ ] Test dependencies listed in `[extras]` and `[targets]` sections, not in main `[deps]` — users should not need to install test-only packages
- [ ] Package extension (`ext/` directory, Julia 1.9+) used for optional dependency integrations instead of `Requires.jl` — extensions are precompile-friendly
- [ ] `VERSION` in module matches Project.toml version — avoid `const VERSION = v"1.2.3"` that can drift from the manifest

### Scoping Rules and Control Flow
<!-- activation: keywords=["for", "while", "let", "begin", "do", "global", "local", "scope", "try", "catch", "finally"] -->

- [ ] Loop variables at global scope (outside functions): in Julia 1.5+ REPL, `for i in 1:5; x = i; end` updates outer `x` (soft scope); in scripts, it creates a new local `x` — use `global x = i` explicitly when modifying outer variable from a script
- [ ] `let` blocks used to capture loop variable in closures: `[let i=i; () -> i end for i in 1:5]` — without `let`, all closures capture the same variable and see the final value
- [ ] `try-catch` blocks catch specific exception types: `catch e::DomainError` — bare `catch e` hides bugs by catching `MethodError`, `BoundsError`, and `InterruptException`
- [ ] `finally` block used for cleanup that must run regardless of exception — file handles, lock releases, temporary directory removal
- [ ] `do` block syntax used correctly with functions that take a callable first argument: `open(path) do io; ...; end` is equivalent to `open(f, path)` — the `do` block becomes the first argument
- [ ] Short-circuit evaluation (`&&`, `||`) used for control flow: `condition && action()` is idiomatic but avoid when `action()` returns a non-boolean value that could confuse readers
- [ ] `@goto`/`@label` avoided entirely — use functions, early returns, or restructured control flow; `@goto` makes code nearly impossible to reason about
- [ ] `for` loop over `eachindex(A)` preferred over `1:length(A)` — handles offset arrays (OffsetArrays.jl) correctly

### Testing and Quality Assurance
<!-- activation: file_globs=["**/test/**/*.jl", "**/test/runtests.jl"], keywords=["@test", "@testset", "Test", "Aqua"] -->

- [ ] `@testset` groups related tests with descriptive names — not a flat list of `@test` at the top level of `runtests.jl`
- [ ] `@test_throws ExceptionType expr` checks for specific exception types — not bare `@test_throws Exception` which catches everything
- [ ] `@test a == b` preferred over manual tolerance checks — use `@test a ≈ b` (isapprox) for floating-point with default or explicit `atol`/`rtol`
- [ ] `Aqua.test_all(MyPackage)` included in test suite — catches piracy, ambiguities, unbound type parameters, stale dependencies, and missing compat entries
- [ ] `@inferred f(args)` tests used for functions that must be type-stable — this test fails if the return type is not concretely inferred
- [ ] Test fixtures use `mktempdir() do dir; ...; end` for automatic cleanup — or `@testset` teardown patterns
- [ ] CI tests run on minimum supported Julia version specified in `[compat]` — not just the latest release
- [ ] Doctests (`jldoctest`) in docstrings are tested via `Documenter.jl` and kept up to date with API changes
- [ ] `@test_warn` and `@test_nowarn` used to verify warning behavior — especially for deprecation warnings in migration code
- [ ] Randomized tests use `Random.seed!` at test level for reproducibility — or accept that flaky failures may occur and document the strategy

## Common False Positives

- **Type instability in non-hot-path code**: Setup code, file I/O, configuration parsing, and CLI argument processing do not need type stability. Only flag instability in computational kernels, inner loops, and frequently-called functions.
- **Abstract types in function signatures**: `f(x::AbstractVector)` is idiomatic Julia for generic programming — abstract types are problematic in struct fields and container element types, not in dispatch signatures where they enable polymorphism.
- **Small unions in return types**: Julia's union splitting efficiently handles `Union{Nothing, T}` (similar to `Optional`). Return types like `Union{Nothing, Int}` from `findfirst`, `match`, etc. are idiomatic and optimized.
- **`mutable struct` for stateful objects**: Structs that genuinely manage mutable state (IO handles, caches, accumulators, connection pools) should be mutable. Only flag mutable structs whose fields are never modified after construction.
- **Global `const` containers**: A `const Dict{String, Float64}` is idiomatic for lookup tables. The `const` prevents reassignment of the binding; mutation of dictionary contents is expected and has no performance penalty.
- **`@inbounds` with `eachindex`**: Loops using `for i in eachindex(A)` are provably in-bounds — `@inbounds` here is safe and appropriate for performance-critical code.

## Severity Guidance

| Finding | Severity |
|---------|----------|
| Type instability in inner loop / computational kernel | Critical |
| `@inbounds` without bounds verification on user input | Critical |
| Type piracy on foreign function + foreign type | Critical |
| `ccall` type mismatch (segfault / memory corruption risk) | Critical |
| `unsafe_wrap` with potentially freed memory | Critical |
| Abstract-typed struct field (`field::Any`, `field::Real`) | Important |
| Non-const global in performance-critical function | Important |
| Method ambiguity detected by Aqua.jl | Important |
| Missing `__init__()` for runtime-only operations | Important |
| String `*` concatenation in loop (allocation churn) | Important |
| Column-major iteration order violation on large arrays | Important |
| Mutable struct that never mutates after construction | Minor |
| Missing `@inferred` test for documented-stable function | Minor |
| `using Package` instead of `using Package: func` | Minor |
| Missing `PrecompileTools` workload | Minor |
| `export` includes internal helpers | Minor |
| Bare `catch e` without type filter | Minor |

## See Also

- `lang-python` — Python scientific computing patterns (NumPy/SciPy equivalents)
- `lang-r` — R statistical computing patterns
- `concern-performance` — General performance review patterns
- `concern-testing` — Testing discipline across languages

## Authoritative References

- [Julia Documentation](https://docs.julialang.org/en/v1/) — Official language reference and manual
- [Julia Performance Tips](https://docs.julialang.org/en/v1/manual/performance-tips/) — Essential performance guide (must-read for Julia developers)
- [JET.jl](https://aviatesk.github.io/JET.jl/stable/) — Static analysis tool documentation
- [Aqua.jl](https://github.com/JuliaTesting/Aqua.jl) — Package quality assurance testing
- [Julia Style Guide](https://docs.julialang.org/en/v1/manual/style-guide/) — Official style conventions
- [Pkg.jl Documentation](https://pkgdocs.julialang.org/v1/) — Package development and dependency management
- [PrecompileTools.jl](https://julialang.github.io/PrecompileTools.jl/stable/) — Reducing time-to-first-execution
- [SciML Style Guide](https://github.com/SciML/SciMLStyle) — Style guide for scientific computing Julia packages
