---
id: perf-big-o-analysis
type: primary
depth_role: leaf
focus: "Detect O(n^2) or worse algorithmic complexity in hot paths where a more efficient algorithm or data structure exists"
parents:
  - index.md
covers:
  - "Nested loops iterating over the same or related collections producing O(n^2) behavior"
  - "Repeated linear search in a list where a set or map lookup would be O(1)"
  - Quadratic string building via repeated concatenation instead of a builder
  - Bubble sort, insertion sort, or selection sort on collections that may grow large
  - Cartesian product joins in application code instead of index-backed lookups
  - "Repeated list.contains() or array.includes() inside a loop instead of a pre-built set"
  - Recursive algorithms with overlapping subproblems and no memoization
  - Sorting inside a loop that executes per request
  - Exponential backtracking in regex patterns applied to user input
  - "Naive string matching (indexOf in a loop) instead of KMP or built-in optimized search"
tags:
  - big-o
  - complexity
  - quadratic
  - nested-loop
  - performance
  - algorithm
  - hot-path
activation:
  file_globs:
    - "**/*.py"
    - "**/*.java"
    - "**/*.ts"
    - "**/*.js"
    - "**/*.go"
    - "**/*.rs"
    - "**/*.rb"
    - "**/*.cs"
    - "**/*.kt"
    - "**/*.scala"
    - "**/*.cpp"
    - "**/*.c"
  keyword_matches:
    - for
    - while
    - foreach
    - map
    - filter
    - find
    - contains
    - includes
    - indexOf
    - sort
    - sorted
    - "remove(0)"
    - "insert(0)"
    - concat
    - append
    - +=
  structural_signals:
    - nested_loop
    - loop_contains_search
    - string_concat_in_loop
    - sort_in_loop
    - recursive_no_memo
source:
  origin: file
  path: perf-big-o-analysis.md
  hash: "sha256:cb7dedad4aac380d9c0976ceef7be8fd3141abebf429e922a05764cb30360fb5"
---
# Big-O Complexity Analysis

## When This Activates

Activates on diffs containing nested loops, repeated search operations, string building in loops, or recursive functions over collections. The most impactful performance bug is not a slow library call -- it is an algorithm whose cost grows quadratically (or worse) with input size. Code that works fine with 100 items can bring down production when the collection grows to 10,000. This reviewer detects diff-visible signals of O(n^2) or worse complexity in code paths that handle variable-size input, focusing on cases where a better algorithm or data structure is readily available.

## Audit Surface

- [ ] Nested for/foreach/while loops both iterating over collections
- [ ] list.contains(), array.includes(), or .indexOf() called inside a loop
- [ ] String concatenation with + or += inside a loop body
- [ ] Collection.sort() or .sorted() called inside a loop
- [ ] Recursive function with no memoization and overlapping subproblem structure
- [ ] Filter or find inside a map/flatMap producing O(n*m) traversal
- [ ] Set difference, intersection, or union implemented via nested iteration
- [ ] Regex with nested quantifiers applied to untrusted input (ReDoS risk)
- [ ] Repeated .remove(0) or .insert(0) on an ArrayList/array causing O(n) shifts
- [ ] Graph traversal with no visited-set producing exponential revisits
- [ ] Naive deduplication via nested comparison instead of hash-based approach
- [ ] Building an adjacency structure by scanning all edges per node

## Detailed Checks

### Nested Loop Quadratics
<!-- activation: keywords=["for", "while", "foreach", "each", "loop", "iterate", "nested"] -->

- [ ] **Nested iteration over same collection**: flag two nested loops both iterating over the same collection (e.g., comparing all pairs) -- consider whether a sort-then-scan, hash-based, or partitioning approach reduces complexity
- [ ] **Nested iteration over related collections**: flag a loop over collection A containing a loop over collection B where B's size scales with A -- pre-index B into a map keyed by the lookup field to reduce from O(n*m) to O(n+m)
- [ ] **Filter/find inside map or flatMap**: flag `.filter()` or `.find()` nested inside `.map()` or `.flatMap()` operating on another collection -- build a lookup map before the outer iteration
- [ ] **Cartesian product by accident**: flag code that produces all pairs of two collections when only matching pairs are needed -- this is an accidental cross-join; use a hash join pattern instead

### Linear Search in Loop
<!-- activation: keywords=["contains", "includes", "indexOf", "find", "in ", "has", "exist", "lookup", "search"] -->

- [ ] **List.contains inside loop**: flag `list.contains(x)`, `array.includes(x)`, `.indexOf(x) != -1` called inside a loop -- convert the list to a Set/HashSet before the loop for O(1) lookups
- [ ] **Repeated map.get with fallback scan**: flag code that attempts a map lookup, then falls back to a linear scan of the map's entries on miss -- the fallback defeats the map's purpose
- [ ] **String matching in loop**: flag repeated `str.indexOf(pattern)` or `str.contains(pattern)` inside a loop over patterns without pre-compilation -- consider a compiled regex, Aho-Corasick, or trie

### Quadratic String Building
<!-- activation: keywords=["concat", "+=", "+ ", "append", "StringBuilder", "StringBuffer", "join", "format", "interpolate", "string"] -->

- [ ] **String concatenation in loop**: flag `result += str`, `result = result + str`, or equivalent inside a loop -- each concatenation copies the entire accumulated string; use StringBuilder, StringBuffer, list-then-join, or io.StringWriter
- [ ] **Repeated format/interpolation in accumulation**: flag `f"..."` or template literal concatenation building a large string incrementally inside a loop -- collect parts in a list and join once
- [ ] **Byte array growth by copy**: flag `bytes = bytes + newBytes` or equivalent in a loop -- use a ByteArrayOutputStream, Buffer, or pre-allocated slice

### Sorting and Ordering in Hot Paths
<!-- activation: keywords=["sort", "sorted", "orderBy", "order_by", "Collections.sort", "Array.sort", "qsort"] -->

- [ ] **Sort inside loop**: flag `.sort()` or `.sorted()` called inside a loop body -- sorting is O(n log n); inside a loop of m iterations this becomes O(m * n log n); sort once outside the loop or use a sorted data structure
- [ ] **Naive top-K via full sort**: flag sorting an entire collection to extract the top K elements -- use a min-heap / priority queue for O(n log k) instead of O(n log n)
- [ ] **Repeated sort of unchanging data**: flag the same collection sorted multiple times across a request when the data has not changed -- sort once, store the result

### Exponential and Recursive Complexity
<!-- activation: keywords=["recursive", "recurse", "fibonacci", "permutation", "combination", "backtrack", "memo", "cache", "dp", "dynamic programming"] -->

- [ ] **Recursive without memoization**: flag recursive functions with overlapping subproblems (Fibonacci-like recurrences, partition problems, tree re-traversals) that lack memoization or dynamic programming -- exponential blowup
- [ ] **Graph traversal without visited set**: flag DFS or BFS that does not maintain a visited set -- without it, cycles cause infinite loops and DAGs cause exponential revisits
- [ ] **Regex backtracking (ReDoS)**: flag regex patterns with nested quantifiers (`(a+)+`, `(a|a)*`, `(.*a){n}`) applied to user-supplied input -- these can cause catastrophic backtracking; use atomic groups, possessive quantifiers, or RE2-compatible engines

## Common False Positives

- **Small bounded collections**: nested loops over collections with a known small upper bound (e.g., enum values, weekdays, config entries with <20 items) are fine. Flag only when the collection size is unbounded or data-driven.
- **Intentional all-pairs computation**: some algorithms legitimately require O(n^2) comparison (e.g., edit distance, similarity matrices, collision detection). Flag only when a more efficient alternative exists for the specific use case.
- **One-time initialization**: quadratic code that runs once at startup on a small dataset (e.g., building a config map) is acceptable. Flag only hot paths that execute per request or per event.
- **Language-optimized string concatenation**: some runtimes (Go, modern JVM) optimize simple `+` concatenation in certain patterns. Flag only when the loop iteration count is unbounded.

## Severity Guidance

| Finding | Severity |
|---|---|
| Nested loops over unbounded collections in a request-serving path | Critical |
| Regex with nested quantifiers applied to user input (ReDoS) | Critical |
| list.contains() inside a loop over a large, data-driven collection | Important |
| String concatenation in a loop with unbounded iterations | Important |
| Sort called inside a loop body | Important |
| Recursive function with overlapping subproblems and no memoization | Important |
| Graph traversal without visited set | Important |
| Naive top-K via full sort when K << N | Minor |
| Quadratic set operations (intersection, difference) on small collections | Minor |
| Repeated .remove(0) on ArrayList in a loop | Minor |

## See Also

- `antipattern-premature-optimization` -- optimization should be guided by profiling, but O(n^2) in a hot path is not premature to fix; it is a correctness-adjacent issue
- `principle-dry-kiss-yagni` -- the simplest correct algorithm is often also the efficient one (hash lookup vs nested scan)
- `data-n-plus-1-and-query-perf` -- N+1 queries are the database equivalent of nested-loop quadratics
- `perf-hot-path-allocations` -- quadratic string building is both an algorithmic and an allocation problem
- `perf-profiling-discipline` -- profiling confirms which paths are hot; this reviewer flags structural complexity regardless

## Authoritative References

- [Thomas H. Cormen et al., *Introduction to Algorithms* (CLRS), 4th ed. (2022) -- algorithmic complexity fundamentals](https://mitpress.mit.edu/books/introduction-algorithms-fourth-edition)
- [Brendan Gregg, *Systems Performance*, 2nd ed. (2020) -- methodology for identifying algorithmic hotspots via profiling](https://www.brendangregg.com/systems-performance-2nd-edition-book.html)
- [OWASP, "Regular Expression Denial of Service (ReDoS)" -- catastrophic backtracking patterns](https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS)
- [Rob Pike, "Go Proverbs" -- "A little copying is better than a little dependency" applies to choosing the right algorithm over importing complexity](https://go-proverbs.github.io/)
