---
id: safety-correctness
type: index
depth_role: subcategory
depth: 1
focus: "32-bit multiplication overflow in 64-bit code (multiply before widen); @inbounds/@simd annotation safety and correctness; ARC/ORC memory management pitfalls — cycles, moved refs, sink semantics; Abstract vs concrete types in containers and struct fields"
parents:
  - "../index.md"
shared_covers: []
entries:
  - id: footgun-integer-overflow-sign-extension
    file: footgun-integer-overflow-sign-extension.md
    type: primary
    focus: "Detect unchecked arithmetic overflow, signed/unsigned confusion, narrowing casts, and integer promotion hazards"
    tags:
      - integer-overflow
      - signed-unsigned
      - narrowing
      - type-safety
      - CWE-190
      - CWE-191
      - CWE-681
      - CWE-195
      - c
      - memory-safety
      - undefined-behaviour
      - buffer-overflow
      - pointers
      - security
  - id: lang-fsharp
    file: lang-fsharp.md
    type: primary
    focus: "F# idioms, type safety, computation expressions, async workflows, and functional-first correctness"
    tags:
      - fsharp
      - dotnet
      - functional
      - ml-family
      - discriminated-unions
      - computation-expressions
  - id: lang-haskell
    file: lang-haskell.md
    type: primary
    focus: Haskell correctness, purity, laziness safety, type-driven design, and ecosystem idioms
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
  - id: lang-julia
    file: lang-julia.md
    type: primary
    focus: Catch type stability, dispatch, and performance bugs in Julia code
    tags:
      - scientific-computing
      - numerical
      - high-performance
      - jit
      - multiple-dispatch
      - hpc
  - id: wasm-safety-boundary
    file: wasm-safety-boundary.md
    type: primary
    focus: "Detect host/guest trust boundary violations, unchecked memory access via guest pointers, missing fuel/instruction limits, and sandbox-escape patterns in WebAssembly embeddings"
    tags:
      - wasm
      - webassembly
      - wasmtime
      - wasmer
      - wasmi
      - wasi
      - sandbox
      - memory-safety
      - trust-boundary
      - host-function
      - fuel
      - epoch
      - resource-limits
      - cache
      - isolation
  - id: classes-no
    file: "classes-no/index.md"
    type: index
    focus: "ARC/ORC memory management pitfalls — cycles, moved refs, sink semantics; Application and release structure; Async runtime discipline — tokio vs async-std not mixed; Send/Sync bounds satisfied; Binary and string handling (UTF-8, iolists)"
children:
  - "classes-no/index.md"
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Safety Correctness

**Focus:** 32-bit multiplication overflow in 64-bit code (multiply before widen); @inbounds/@simd annotation safety and correctness; ARC/ORC memory management pitfalls — cycles, moved refs, sink semantics; Abstract vs concrete types in containers and struct fields

## Children

| File | Type | Focus |
|------|------|-------|
| [footgun-integer-overflow-sign-extension.md](footgun-integer-overflow-sign-extension.md) | 📄 primary | Detect unchecked arithmetic overflow, signed/unsigned confusion, narrowing casts, and integer promotion hazards |
| [lang-fsharp.md](lang-fsharp.md) | 📄 primary | F# idioms, type safety, computation expressions, async workflows, and functional-first correctness |
| [lang-haskell.md](lang-haskell.md) | 📄 primary | Haskell correctness, purity, laziness safety, type-driven design, and ecosystem idioms |
| [lang-julia.md](lang-julia.md) | 📄 primary | Catch type stability, dispatch, and performance bugs in Julia code |
| [wasm-safety-boundary.md](wasm-safety-boundary.md) | 📄 primary | Detect host/guest trust boundary violations, unchecked memory access via guest pointers, missing fuel/instruction limits, and sandbox-escape patterns in WebAssembly embeddings |
| [classes-no/index.md](classes-no/index.md) | 📁 index | ARC/ORC memory management pitfalls — cycles, moved refs, sink semantics; Application and release structure; Async runtime discipline — tokio vs async-std not mixed; Send/Sync bounds satisfied; Binary and string handling (UTF-8, iolists) |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
