---
id: simd-vectorization
type: index
depth_role: subcategory
depth: 1
focus: "0-based vs 1-based indexing confusion across language or API boundaries; APOC procedures exposing file system or shell access; Allocations inside Update / FixedUpdate / _process / Tick causing GC spikes; Array length vs last valid index (length is last_index + 1)"
parents:
  - "../index.md"
shared_covers: []
entries:
  - id: db-neo4j-graph
    file: db-neo4j-graph.md
    type: primary
    focus: Detect Neo4j and graph database pitfalls around Cypher injection, APOC security, index usage, unbounded traversals, Cartesian products, and relationship direction semantics
    tags:
      - neo4j
      - graph
      - cypher
      - injection
      - apoc
      - index
      - traversal
      - cartesian-product
      - relationship
      - graph-database
      - graph-db
      - gremlin
      - super-node
      - data-architecture
  - id: footgun-off-by-one
    file: footgun-off-by-one.md
    type: primary
    focus: "Detect fencepost errors, inclusive/exclusive range confusion, 0-based vs 1-based indexing mistakes, and boundary condition bugs"
    tags:
      - off-by-one
      - fencepost
      - boundary
      - indexing
      - range
      - CWE-193
      - CWE-131
  - id: game-engines-unity-unreal-godot
    file: game-engines-unity-unreal-godot.md
    type: primary
    focus: Detect per-frame allocations, hot-path engine API misuse, coroutine leaks, and missing pooling in Unity, Unreal, and Godot game code
    tags:
      - gamedev
      - unity
      - unreal
      - godot
      - game-engine
      - performance
      - gc
      - hot-path
      - coroutines
  - id: perf-hot-path-allocations
    file: perf-hot-path-allocations.md
    type: primary
    focus: Detect unnecessary heap allocations, boxing, and object creation in tight loops and per-request hot paths
    tags:
      - allocation
      - gc-pressure
      - boxing
      - hot-path
      - tight-loop
      - object-creation
      - performance
  - id: perf-simd-vectorization
    file: perf-simd-vectorization.md
    type: primary
    focus: Detect patterns that defeat auto-vectorization, branch-heavy loops preventing SIMD, unaligned memory access, and incorrect manual SIMD usage
    tags:
      - simd
      - vectorization
      - auto-vectorization
      - intrinsics
      - alignment
      - data-dependency
      - performance
      - numerical
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Simd Vectorization

**Focus:** 0-based vs 1-based indexing confusion across language or API boundaries; APOC procedures exposing file system or shell access; Allocations inside Update / FixedUpdate / _process / Tick causing GC spikes; Array length vs last valid index (length is last_index + 1)

## Children

| File | Type | Focus |
|------|------|-------|
| [db-neo4j-graph.md](db-neo4j-graph.md) | 📄 primary | Detect Neo4j and graph database pitfalls around Cypher injection, APOC security, index usage, unbounded traversals, Cartesian products, and relationship direction semantics |
| [footgun-off-by-one.md](footgun-off-by-one.md) | 📄 primary | Detect fencepost errors, inclusive/exclusive range confusion, 0-based vs 1-based indexing mistakes, and boundary condition bugs |
| [game-engines-unity-unreal-godot.md](game-engines-unity-unreal-godot.md) | 📄 primary | Detect per-frame allocations, hot-path engine API misuse, coroutine leaks, and missing pooling in Unity, Unreal, and Godot game code |
| [perf-hot-path-allocations.md](perf-hot-path-allocations.md) | 📄 primary | Detect unnecessary heap allocations, boxing, and object creation in tight loops and per-request hot paths |
| [perf-simd-vectorization.md](perf-simd-vectorization.md) | 📄 primary | Detect patterns that defeat auto-vectorization, branch-heavy loops preventing SIMD, unaligned memory access, and incorrect manual SIMD usage |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
