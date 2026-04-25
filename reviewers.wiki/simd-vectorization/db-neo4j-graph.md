---
id: db-neo4j-graph
type: primary
depth_role: leaf
focus: Detect Neo4j and graph database pitfalls around Cypher injection, APOC security, index usage, unbounded traversals, Cartesian products, and relationship direction semantics
parents:
  - index.md
covers:
  - Cypher injection via string concatenation in query construction
  - APOC procedures exposing file system or shell access
  - Missing indexes on node properties used in MATCH WHERE clauses
  - Unbounded variable-length traversals consuming all heap memory
  - Cartesian products from unconnected MATCH patterns
  - Relationship direction ignored or misused in queries
  - EAGER operations loading entire result set into memory
  - Missing LIMIT on MATCH queries returning large result sets
  - Cypher or Gremlin query built via string concatenation with user input
  - Super-node pattern where one node accumulates millions of relationships
  - Missing index on node property used in MATCH or WHERE clause
  - "Relationship modeled as a node when it should be an edge (and vice versa)"
  - Traversal query with no depth bound allowing unbounded graph walks
  - Missing node label or edge type reducing query planner effectiveness
  - "Property stored on relationship that should be on a node (or vice versa)"
  - Dense relationship pattern with no fan-out mitigation strategy
  - Missing uniqueness constraint on identifier properties
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
aliases:
  - data-graph-modeling
activation:
  file_globs:
    - "**/*neo4j*"
    - "**/*graph*"
    - "**/*cypher*"
    - "**/*.cypher"
    - "**/*repository*"
  keyword_matches:
    - neo4j
    - Neo4j
    - cypher
    - Cypher
    - MATCH
    - MERGE
    - CREATE
    - RETURN
    - WHERE
    - OPTIONAL MATCH
    - WITH
    - UNWIND
    - apoc
    - APOC
    - graph
    - node
    - relationship
    - path
    - shortestPath
    - "bolt://"
    - "neo4j://"
source:
  origin: file
  path: db-neo4j-graph.md
  hash: "sha256:c1808e646aa187834e048a00e30745e040979ceaaa90643614b04289ed5caa81"
---
# Neo4j / Graph Database Pitfalls

## When This Activates

Activates on diffs involving Cypher queries, Neo4j driver usage, APOC procedure calls, or graph schema definitions. Graph databases excel at traversing relationships but create unique pitfalls: Cypher injection is as dangerous as SQL injection but less understood. Unbounded variable-length paths can traverse the entire graph. Cartesian products from unconnected MATCH patterns multiply result rows exponentially. Missing indexes force full label scans. APOC procedures can expose file system and shell access if not restricted. This reviewer targets detection heuristics for graph-database-specific security, performance, and correctness pitfalls.

## Audit Surface

- [ ] Cypher query built with string concatenation or interpolation containing user input
- [ ] APOC procedures (apoc.load.*, apoc.cypher.run*) enabled without restriction
- [ ] MATCH (n:Label) WHERE n.property = value without index on Label.property
- [ ] Variable-length path pattern without upper bound ([:REL*])
- [ ] Two or more disconnected MATCH patterns producing Cartesian product
- [ ] Relationship direction omitted (-[:REL]-) when direction is semantically meaningful
- [ ] PROFILE/EXPLAIN showing EagerAggregation or Eager pipe on large data
- [ ] MATCH without LIMIT returning unbounded result set
- [ ] MERGE without ON CREATE/ON MATCH causing duplicate nodes
- [ ] Unparameterized Cypher query preventing query plan caching
- [ ] LOAD CSV without periodic commit on large files
- [ ] Node label not used in MATCH pattern (full graph scan)
- [ ] OPTIONAL MATCH without null-check on subsequent WHERE

## Detailed Checks

### Cypher Injection
<!-- activation: keywords=["query", "concat", "+", "interpolat", "format", "f\"", "f'", "template", "${", "string", "param", "user", "input", "sanitize"] -->

- [ ] **String concatenation in Cypher**: flag `"MATCH (n) WHERE n.name = '" + userInput + "'"` and all variants (f-strings, template literals, String.format) -- this enables Cypher injection where an attacker can terminate the string and inject arbitrary Cypher clauses (DETACH DELETE, CALL procedures)
- [ ] **Unparameterized queries**: flag Cypher queries that embed values directly instead of using `$parameter` syntax -- beyond injection risk, unparameterized queries prevent Neo4j from caching and reusing query plans, degrading performance
- [ ] **User input in APOC procedure arguments**: flag APOC calls where file paths, URLs, or Cypher strings include user-controlled input -- APOC procedures like `apoc.load.json`, `apoc.cypher.runFile` can access the file system

### APOC Security
<!-- activation: keywords=["apoc", "APOC", "apoc.load", "apoc.cypher", "apoc.export", "apoc.util", "apoc.trigger", "dbms.security", "procedure", "unrestricted"] -->

- [ ] **Unrestricted APOC procedures**: flag Neo4j configurations with APOC installed but `dbms.security.procedures.unrestricted=apoc.*` -- this grants all APOC procedures access to the file system, network, and JVM internals. Restrict to only the specific procedures needed
- [ ] **apoc.cypher.run with dynamic queries**: flag `apoc.cypher.run()` or `apoc.cypher.runMany()` with dynamically constructed Cypher -- this is the graph database equivalent of eval(); the string is executed as Cypher with full privileges
- [ ] **APOC triggers on production data**: flag `apoc.trigger.add` on production databases without careful review -- triggers execute on every transaction commit and can cause cascading performance issues

### Index and Query Performance
<!-- activation: keywords=["INDEX", "CREATE INDEX", "index", "MATCH", "WHERE", "PROFILE", "EXPLAIN", "scan", "AllNodesScan", "NodeByLabelScan", "Filter", "EagerAggregation"] -->

- [ ] **Missing property index**: flag MATCH patterns with WHERE clause filtering on a property without a corresponding index -- Neo4j must scan all nodes with that label, which is O(n) on the label size
- [ ] **No label in MATCH**: flag `MATCH (n) WHERE n.prop = value` without a label -- this forces an AllNodesScan across the entire database instead of a label-scoped scan
- [ ] **EAGER pipe in query plan**: flag queries whose PROFILE output shows Eager operations on large intermediate result sets -- Eager pipes materialize all rows in memory before the next operator, causing heap pressure on large graphs
- [ ] **LOAD CSV without periodic commit**: flag `LOAD CSV` on files >10k rows without `USING PERIODIC COMMIT` (Neo4j 4.x) or `:auto` transactions -- the entire load runs in one transaction, consuming heap

### Traversal and Path Patterns
<!-- activation: keywords=["*", "*..", "*1..", "path", "shortestPath", "allShortestPaths", "variable-length", "UNWIND", "collect", "depth", "hop"] -->

- [ ] **Unbounded variable-length path**: flag `(a)-[:REL*]->(b)` without an upper bound -- in a connected graph, this can traverse every reachable node, consuming all available heap. Always specify an upper bound: `[:REL*1..5]`
- [ ] **Missing upper bound on shortestPath**: flag `shortestPath((a)-[*]->(b))` without a maxHops constraint -- finding shortest paths in large graphs without depth limits is computationally expensive
- [ ] **OPTIONAL MATCH without null check**: flag `OPTIONAL MATCH (a)-[:REL]->(b)` followed by operations on `b` without checking `b IS NOT NULL` -- OPTIONAL MATCH returns null for unmatched patterns, causing silent null propagation

### Cartesian Products and Pattern Design
<!-- activation: keywords=["MATCH", "CROSS", "Cartesian", "CartesianProduct", "product", "disconnect", "comma", "pattern", "MERGE"] -->

- [ ] **Cartesian product from disconnected patterns**: flag `MATCH (a:Label1), (b:Label2) WHERE a.prop = b.prop` -- when patterns are separated by commas without a path connecting them, Neo4j generates the Cartesian product of all nodes matching each pattern. Connect patterns or use WITH to scope intermediate results
- [ ] **MERGE without unique constraint**: flag `MERGE (n:Label {prop: value})` without a uniqueness constraint on Label.prop -- without the constraint, concurrent MERGE operations can create duplicate nodes due to race conditions
- [ ] **Relationship direction semantics**: flag bidirectional pattern `(a)-[:EMPLOYS]-(b)` for relationships that are semantically directional -- omitting direction returns relationships in both directions, doubling results and causing incorrect traversals

## Common False Positives

- **Unbounded paths in graph analytics**: graph algorithm libraries (GDS) intentionally traverse unbounded paths. Flag only in application-level Cypher queries.
- **Cartesian product for graph construction**: MATCH patterns with MERGE for one-time data import may intentionally use Cartesian products. Flag only in query-time application code.
- **APOC for admin tooling**: APOC procedures in migration or admin scripts running with privileged credentials are lower risk. Flag unrestricted access and user-input-driven calls.
- **Bidirectional relationships by design**: some relationships (FRIENDS_WITH, RELATED_TO) are semantically bidirectional. Flag direction omission only for directional relationships.

## Severity Guidance

| Finding | Severity |
|---|---|
| Cypher query built with string concatenation containing user input | Critical |
| APOC procedures unrestricted (apoc.*) on production database | Critical |
| Unbounded variable-length path without upper bound | Critical |
| Cartesian product from disconnected MATCH patterns on large labels | Important |
| Missing index on property used in high-frequency MATCH WHERE | Important |
| MERGE without uniqueness constraint (duplicate node risk) | Important |
| Unparameterized Cypher queries preventing plan caching | Important |
| LOAD CSV without periodic commit on large file | Minor |
| OPTIONAL MATCH without null check on dependent variable | Minor |
| Relationship direction omitted on semantically directional relationship | Minor |

## See Also

- `sec-owasp-a03-injection` -- Cypher injection is a specific injection subtype covered generically by OWASP A03
- `data-n-plus-1-and-query-perf` -- N+1 patterns in graph databases manifest as per-node property lookups instead of pattern matching with RETURN
- `db-connection-pooling` -- Neo4j Bolt driver connection pool configuration affects query throughput

## Authoritative References

- [Neo4j Documentation: Cypher Manual](https://neo4j.com/docs/cypher-manual/current/)
- [Neo4j Documentation: Indexes for Search Performance](https://neo4j.com/docs/cypher-manual/current/indexes-for-search-performance/)
- [OWASP: Cypher Injection](https://owasp.org/www-community/attacks/Cypher_Injection)
- [Neo4j Documentation: APOC User Guide](https://neo4j.com/labs/apoc/)
- [Neo4j Documentation: Query Tuning](https://neo4j.com/docs/cypher-manual/current/query-tuning/)
