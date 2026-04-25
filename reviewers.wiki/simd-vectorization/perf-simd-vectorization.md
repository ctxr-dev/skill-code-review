---
id: perf-simd-vectorization
type: primary
depth_role: leaf
focus: Detect patterns that defeat auto-vectorization, branch-heavy loops preventing SIMD, unaligned memory access, and incorrect manual SIMD usage
parents:
  - index.md
covers:
  - Data dependency between loop iterations defeating auto-vectorization
  - Branch-heavy loop body preventing vectorizer from generating SIMD code
  - Unaligned memory access in SIMD intrinsic calls
  - Mixed data types in loop body preventing uniform vector width
  - Function call inside loop body preventing inlining and vectorization
  - Pointer aliasing preventing compiler from proving independence
  - Loop-carried reduction without proper vectorization hints
  - Incorrect SIMD lane ordering or mask usage in manual intrinsics
  - Missing alignment annotation or pragma for vectorizable data
tags:
  - simd
  - vectorization
  - auto-vectorization
  - intrinsics
  - alignment
  - data-dependency
  - performance
  - numerical
activation:
  file_globs:
    - "**/*.c"
    - "**/*.cpp"
    - "**/*.rs"
    - "**/*.go"
    - "**/*.java"
    - "**/*.cs"
    - "**/*.zig"
    - "**/*.nim"
  keyword_matches:
    - simd
    - SIMD
    - vectorize
    - vector
    - SSE
    - AVX
    - AVX2
    - AVX512
    - NEON
    - intrinsic
    - _mm_
    - _mm256_
    - _mm512_
    - vaddq
    - vmulq
    - restrict
    - aligned
    - pragma omp simd
    - ispc
    - Vec4
    - f32x4
    - i32x8
  structural_signals:
    - simd_intrinsic
    - vectorizable_loop
    - data_dependency_in_loop
    - unaligned_load
source:
  origin: file
  path: perf-simd-vectorization.md
  hash: "sha256:a4eae034a0b31406aff6916c7be0551eb556e7abc4bff5f74e2ec6f55563b87c"
---
# SIMD and Auto-Vectorization

## When This Activates

Activates on diffs containing numerical inner loops, SIMD intrinsics, vectorization pragmas, or data-parallel computation over arrays. Modern CPUs execute SIMD (Single Instruction Multiple Data) instructions that process 4-16 elements per cycle, but the compiler's auto-vectorizer gives up silently when it encounters data dependencies, branches, function calls, or aliasing. Manual SIMD intrinsics offer control but introduce portability, alignment, and correctness risks. This reviewer detects patterns that defeat auto-vectorization and common errors in manual SIMD code.

## Audit Surface

- [ ] Loop with data dependency between iterations (arr[i] depends on arr[i-1])
- [ ] If/else branch inside inner loop body over large array
- [ ] Function call inside tight numerical loop body (not inlined)
- [ ] Mixed int/float operations in same loop body
- [ ] Pointer or reference parameters without restrict/noalias annotation
- [ ] Manual SIMD intrinsic (_mm256_load_ps) on potentially unaligned data
- [ ] SIMD code without fallback path for architectures without the required ISA
- [ ] Loop stride != 1 preventing contiguous memory vectorization
- [ ] Reduction variable (sum, max, min) without vectorization-friendly accumulation
- [ ] Array-of-structs layout used in SIMD loop instead of struct-of-arrays
- [ ] SIMD intrinsic with wrong type width (SSE on data needing AVX width)
- [ ] Manual vectorization duplicating auto-vectorizable loop without measurable benefit

## Detailed Checks

### Auto-Vectorization Blockers
<!-- activation: keywords=["for", "while", "loop", "iterate", "array", "vector", "float", "double", "int", "sum", "reduce", "accumulate"] -->

- [ ] **Loop-carried data dependency**: flag loops where iteration i reads or writes a value computed by iteration i-1 (`arr[i] = arr[i-1] * factor`) -- the compiler cannot parallelize iterations with true data dependencies; restructure to break the dependency chain or use a scan/prefix algorithm
- [ ] **Branch in inner loop**: flag if/else or switch statements inside tight numerical inner loops -- branches prevent the vectorizer from generating branchless SIMD code; replace with conditional moves, blending masks, or predicated operations
- [ ] **Non-inlineable function call**: flag function calls inside inner loops that the compiler cannot inline (virtual methods, calls across translation units, extern functions) -- the vectorizer cannot prove the function is pure and side-effect-free; mark as `inline`, `constexpr`, or use link-time optimization
- [ ] **Pointer aliasing**: flag loops operating on pointer parameters without `restrict` or `__restrict` where the compiler cannot prove the pointers do not alias -- aliasing prevents vectorization; add restrict qualifiers or use local copies

### Memory Layout for Vectorization
<!-- activation: keywords=["struct", "array", "layout", "align", "aligned", "AoS", "SoA", "stride", "contiguous", "pack", "padding"] -->

- [ ] **Array-of-structs in SIMD loop**: flag AoS (array of structs) memory layout accessed in a SIMD-critical loop -- SIMD loads expect contiguous same-typed data; transpose to struct-of-arrays (SoA) for vectorizable access
- [ ] **Non-unit stride access**: flag loops accessing array elements with stride > 1 (`arr[i*3]`) in vectorizable contexts -- non-contiguous access requires gather instructions which are slower; restructure data layout for unit-stride access
- [ ] **Missing alignment**: flag SIMD load/store intrinsics (`_mm256_load_ps`, `vld1q_f32`) used on data not guaranteed to be aligned to the vector width -- unaligned loads via aligned intrinsics cause segfaults; use unaligned variants or ensure alignment with `alignas`, `__attribute__((aligned))`, or allocator support

### Manual SIMD Correctness
<!-- activation: keywords=["_mm_", "_mm256_", "_mm512_", "vld", "vst", "vadd", "vmul", "intrinsic", "NEON", "SSE", "AVX", "mask", "blend", "shuffle", "permute"] -->

- [ ] **No architecture fallback**: flag SIMD intrinsic code without a scalar fallback path guarded by runtime CPU feature detection -- the code will crash on CPUs without the required ISA extension; provide a fallback and use `__builtin_cpu_supports`, `cpuid`, or equivalent
- [ ] **Wrong vector width**: flag SSE (128-bit) intrinsics used where AVX2 (256-bit) is available and the data width warrants it, or AVX-512 used where most deployment targets are AVX2 -- match the vector width to the deployment hardware
- [ ] **Incorrect mask or shuffle**: flag SIMD mask, blend, or shuffle operations with hardcoded constants -- verify that the lane ordering matches the intended data permutation; off-by-one in lane indexing produces silent wrong results

### Reduction and Accumulation
<!-- activation: keywords=["sum", "total", "accumulate", "reduce", "min", "max", "dot", "product", "norm", "average"] -->

- [ ] **Scalar reduction in vectorizable loop**: flag a single scalar accumulator (`sum += arr[i]`) in a loop that is otherwise vectorizable -- use multiple partial accumulators or the compiler's reduction clause (`#pragma omp simd reduction(+:sum)`) to enable vectorized reduction
- [ ] **Floating-point reassociation**: flag loops with floating-point reduction where `-ffast-math` or equivalent is not enabled -- strict IEEE floating-point prevents the compiler from reassociating operations for vectorization; use `-ffast-math` only if precision loss is acceptable, or use Kahan summation for accuracy

## Common False Positives

- **Non-numerical code**: SIMD and vectorization are irrelevant for string processing, I/O, or business logic. Flag only numerical inner loops processing arrays of scalars.
- **Small fixed-size loops**: loops over 3-4 elements (vector operations, color channels) do not benefit from SIMD vectorization. Flag only loops over data-driven collections.
- **Compiler already vectorizes**: if the loop generates vector instructions (check with `-ftree-vectorizer-verbose`, `-Rpass=loop-vectorize`, or godbolt.org), the auto-vectorizer has succeeded. Do not flag working auto-vectorization.
- **Application-layer code**: SIMD optimization belongs in libraries, numerical kernels, and hot inner loops -- not in typical application code. See `antipattern-premature-optimization`.

## Severity Guidance

| Finding | Severity |
|---|---|
| SIMD aligned load on unaligned data (crash risk) | Critical |
| SIMD code with no architecture fallback | Critical |
| Loop-carried data dependency in performance-critical numerical kernel | Important |
| Array-of-structs layout in SIMD inner loop | Important |
| Branch in inner loop of numerical hot path | Important |
| Scalar reduction preventing vectorization of large loop | Minor |
| Missing restrict on pointer parameters in numerical code | Minor |
| Manual SIMD duplicating auto-vectorizable loop without profiling justification | Minor |

## See Also

- `perf-cache-locality-false-sharing` -- memory layout (AoS vs SoA) affects both vectorization and cache performance
- `antipattern-premature-optimization` -- manual SIMD in application code without profiling is premature optimization
- `perf-profiling-discipline` -- verify vectorization benefit with benchmarks before and after
- `perf-big-o-analysis` -- algorithmic complexity dominates SIMD gains for large-scale problems

## Authoritative References

- [Agner Fog, "Optimizing Software in C++" -- vectorization, alignment, and SIMD intrinsics](https://www.agner.org/optimize/)
- [Intel Intrinsics Guide -- SSE, AVX, AVX-512 intrinsic reference](https://www.intel.com/content/www/us/en/docs/intrinsics-guide/)
- [LLVM, "Auto-Vectorization in LLVM" -- how the loop vectorizer works and what defeats it](https://llvm.org/docs/Vectorizers.html)
- [Ulrich Drepper, "What Every Programmer Should Know About Memory" (2007) -- memory access patterns and hardware interaction](https://people.freebsd.org/~lstewart/articles/cpumemory.pdf)
