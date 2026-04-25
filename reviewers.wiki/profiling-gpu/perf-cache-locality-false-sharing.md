---
id: perf-cache-locality-false-sharing
type: primary
depth_role: leaf
focus: Detect false sharing on CPU cache lines in concurrent code, poor data layout for cache locality, and random access patterns on large datasets
parents:
  - index.md
covers:
  - False sharing -- adjacent fields in struct modified by different threads on same cache line
  - Array-of-structs layout causing cache misses in column-oriented access
  - Random access pattern over large array defeating hardware prefetcher
  - "Linked data structures (linked list, tree with pointers) with poor spatial locality"
  - Thread-local counters or accumulators packed on same cache line
  - Hot and cold fields interleaved in same struct wasting cache space
  - Hash table with chaining causing pointer-chasing cache misses
  - "Matrix traversal in wrong order (column-major on row-major layout)"
tags:
  - cache-locality
  - false-sharing
  - cache-line
  - spatial-locality
  - temporal-locality
  - AoS-SoA
  - prefetch
  - performance
activation:
  file_globs:
    - "**/*.java"
    - "**/*.kt"
    - "**/*.cpp"
    - "**/*.c"
    - "**/*.rs"
    - "**/*.go"
    - "**/*.cs"
    - "**/*.zig"
  keyword_matches:
    - cache
    - cacheline
    - cache_line
    - false sharing
    - padding
    - align
    - Contended
    - cacheline_aligned
    - "repr(align"
    - atomic
    - Atomic
    - concurrent
    - parallel
    - thread
    - volatile
    - prefetch
  structural_signals:
    - concurrent_struct_fields
    - thread_indexed_array
    - linked_list_hot_path
    - matrix_traversal_order
source:
  origin: file
  path: perf-cache-locality-false-sharing.md
  hash: "sha256:7c83a717d0bce9171f365c6276eb639cb6ebb82ea2ac3de52cf4163cf8521e0e"
---
# Cache Locality and False Sharing

## When This Activates

Activates on diffs involving concurrent data structures, large array processing, matrix operations, or struct/class definitions used in hot paths. CPU caches operate on 64-byte cache lines, not individual bytes. When two threads modify adjacent fields on the same cache line, the hardware cache coherence protocol forces the line to bounce between cores (false sharing), destroying throughput. Similarly, data layouts that scatter hot data across memory (linked lists, interleaved hot/cold fields, wrong traversal order) cause cache misses that dominate execution time. This reviewer detects data layout and access patterns that cause cache-related performance degradation.

## Audit Surface

- [ ] Struct or class with fields modified by different threads without cache-line padding
- [ ] Array of counters or flags indexed by thread ID (false sharing risk)
- [ ] Linked list or tree traversal in a hot path over large dataset
- [ ] Large struct with hot fields and cold fields interleaved
- [ ] Matrix accessed in column-major order when stored in row-major (or vice versa)
- [ ] Random index access pattern over array > L2 cache size
- [ ] Hash table with separate chaining (linked list buckets) in hot path
- [ ] Object graph traversal following pointers across heap allocations
- [ ] Concurrent atomic counters adjacent in memory without @Contended or padding
- [ ] Large array of objects (Java/C#) where each element is a heap pointer
- [ ] Parallel loop partitioning where adjacent partitions share cache-line boundary

## Detailed Checks

### False Sharing Detection
<!-- activation: keywords=["thread", "atomic", "Atomic", "volatile", "concurrent", "parallel", "lock", "mutex", "counter", "Contended", "padding", "align", "cacheline"] -->

- [ ] **Adjacent concurrent fields**: flag structs or classes where different threads write to different fields and the fields are adjacent in memory with no padding -- add `@Contended` (Java), `alignas(64)` (C++), `#[repr(align(64))]` (Rust), or explicit padding fields to separate them onto different cache lines
- [ ] **Thread-indexed array**: flag arrays indexed by thread ID or worker ID where each thread writes to its own slot -- adjacent slots share a cache line causing false sharing; pad each slot to 64 bytes or use per-thread variables
- [ ] **Parallel reduction with shared accumulator**: flag parallel loops where multiple threads increment the same counter or accumulator -- each write invalidates the cache line on all other cores; use thread-local accumulators and merge at the end

### Data Layout for Locality
<!-- activation: keywords=["struct", "class", "field", "layout", "hot", "cold", "array", "SoA", "AoS", "matrix", "row", "column", "traverse", "iterate"] -->

- [ ] **Hot/cold field interleaving**: flag structs where frequently accessed fields (read every iteration) are interleaved with rarely accessed fields (read on exception paths) -- hot fields spanning two cache lines halve effective cache utilization; group hot fields together at the beginning of the struct
- [ ] **Array-of-structs for column access**: flag AoS layouts where the hot loop accesses only one or two fields across all elements -- each cache line loads the entire struct but only one field is used; consider struct-of-arrays (SoA) layout for better spatial locality
- [ ] **Matrix traversal order**: flag matrix traversal in column-major order when the matrix is stored row-major (C/C++/Java/Python) or vice versa (Fortran) -- wrong traversal order causes a cache miss per element instead of one per cache line

### Pointer-Chasing and Indirection
<!-- activation: keywords=["linked", "list", "node", "pointer", "next", "tree", "graph", "traverse", "walk", "follow", "dereference", "indirection", "heap"] -->

- [ ] **Linked list in hot path**: flag linked list traversal in a hot path over large datasets -- each node is a separate heap allocation with no spatial locality; the hardware prefetcher cannot predict the next address; consider a contiguous array or arena allocation
- [ ] **Chained hash table**: flag hash tables with linked-list chaining (separate chaining) in hot paths -- each chain link is a pointer dereference to a random heap location; consider open addressing (Robin Hood, Swiss Table) for better locality
- [ ] **Object graph traversal**: flag code following object pointers across a large heap (graph traversal, tree walk) without batching or prefetching -- each dereference is a potential cache miss; consider flattening the structure or using software prefetch hints

### Large Dataset Random Access
<!-- activation: keywords=["random", "index", "lookup", "binary search", "hash", "shuffle", "permutation", "indirect", "gather", "scatter"] -->

- [ ] **Random access over L2-sized array**: flag random index access (binary search, hash probe, indirect indexing) over arrays larger than L2 cache (~256KB-1MB per core) -- each access is likely a cache miss; consider B-tree, radix sort, or cache-oblivious data structures
- [ ] **Indirect sort or permutation**: flag sorting or permuting large arrays using an index array (indirect access) -- the indirect accesses have poor locality; consider in-place permutation or sorting the data directly

## Common False Positives

- **Single-threaded code**: false sharing requires concurrent writes from different threads. Do not flag shared structs in single-threaded code.
- **Small datasets**: cache locality matters for datasets larger than L1/L2 cache. Do not flag linked lists or random access on small collections (<1000 elements).
- **Correctness-first designs**: some data structures (trees, graphs) inherently require pointer indirection. Flag only when the access pattern is in a measured hot path and a cache-friendly alternative exists.
- **Padded by runtime**: some runtimes (Java with JEP 142, C# with StructLayout) may pad fields automatically. Verify before flagging.

## Severity Guidance

| Finding | Severity |
|---|---|
| False sharing on concurrent counters in high-throughput path | Critical |
| Thread-indexed array without cache-line padding | Critical |
| Linked list traversal in hot inner loop over >10K elements | Important |
| Matrix traversal in wrong order (cache miss per element) | Important |
| Hot/cold field interleaving in frequently allocated struct | Important |
| Array-of-structs for column-oriented access in numerical loop | Minor |
| Random access over large array without prefetch hints | Minor |
| Chained hash table in hot lookup path | Minor |

## See Also

- `perf-simd-vectorization` -- SoA layout benefits both vectorization and cache locality
- `perf-numa-awareness` -- NUMA adds another level of memory access cost beyond cache lines
- `perf-big-o-analysis` -- algorithmic complexity dominates cache effects for large enough N
- `perf-profiling-discipline` -- hardware counter profiling (cache-misses, L1-dcache-load-misses) validates cache problems

## Authoritative References

- [Ulrich Drepper, "What Every Programmer Should Know About Memory" (2007) -- definitive guide to cache hierarchy, locality, and false sharing](https://people.freebsd.org/~lstewart/articles/cpumemory.pdf)
- [Martin Thompson, "Mechanical Sympathy" blog -- false sharing, cache lines, and CPU-friendly data structures](https://mechanical-sympathy.blogspot.com/)
- [Agner Fog, "Optimizing Software in C++" -- data layout, alignment, and cache optimization](https://www.agner.org/optimize/)
- [Intel, "Avoiding and Identifying False Sharing Among Threads"](https://www.intel.com/content/www/us/en/developer/articles/technical/avoiding-and-identifying-false-sharing-among-threads.html)
