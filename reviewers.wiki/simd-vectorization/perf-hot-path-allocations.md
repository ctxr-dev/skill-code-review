---
id: perf-hot-path-allocations
type: primary
depth_role: leaf
focus: Detect unnecessary heap allocations, boxing, and object creation in tight loops and per-request hot paths
parents:
  - index.md
covers:
  - Object allocation inside a tight loop that could be hoisted or reused
  - "Boxing and unboxing of primitives in hot paths (Integer vs int, object vs value type)"
  - String concatenation via + in loops instead of StringBuilder or join
  - Closure or lambda capturing variables and allocating per invocation in hot loops
  - Varargs methods causing array allocation on every call in tight loops
  - "Autoboxing in collections (List<Integer> vs IntList, Map<String,Integer>)"
  - Iterator or stream object created per element in a nested loop
  - Temporary array or list created inside a loop body for single-use computation
  - Regex compiled inside a loop instead of pre-compiled as a constant
  - DateTimeFormatter, SimpleDateFormat, or Pattern created per call instead of reused
  - Unnecessary defensive copies in getters called from tight loops
tags:
  - allocation
  - gc-pressure
  - boxing
  - hot-path
  - tight-loop
  - object-creation
  - performance
activation:
  file_globs:
    - "**/*.java"
    - "**/*.kt"
    - "**/*.scala"
    - "**/*.cs"
    - "**/*.py"
    - "**/*.go"
    - "**/*.rs"
    - "**/*.ts"
    - "**/*.js"
    - "**/*.cpp"
  keyword_matches:
    - "new "
    - "new("
    - allocate
    - malloc
    - "make("
    - append
    - boxing
    - Integer
    - Boolean
    - Float
    - Double
    - String.format
    - Pattern.compile
    - "Regex("
    - SimpleDateFormat
    - "values()"
    - varargs
    - Object...
  structural_signals:
    - allocation_in_loop
    - boxing_in_hot_path
    - regex_compile_in_loop
    - lambda_in_tight_loop
source:
  origin: file
  path: perf-hot-path-allocations.md
  hash: "sha256:5e66e377f9e97cd67bd377790f7ffdd73121276ef50eb5bc9f8e031e9e6878de"
---
# Hot-Path Allocation Detection

## When This Activates

Activates on diffs containing loops, high-frequency methods, or request-handling code with object allocations. Every heap allocation has a cost: the allocator must find free memory, initialize the object, and the garbage collector must eventually trace and reclaim it. In tight loops and per-request hot paths, unnecessary allocations create GC pressure that manifests as latency spikes, increased pause times, and reduced throughput. This reviewer detects allocation patterns that are wasteful in hot paths and that have well-known fixes: hoisting, reuse, pre-compilation, or value types.

## Audit Surface

- [ ] new Object(), new SomeClass(), or equivalent constructor call inside a loop body
- [ ] Autoboxing conversion (int to Integer, float to Float) inside a loop or hot method
- [ ] String concatenation with + or += inside a loop
- [ ] Lambda or closure created inside a loop that captures mutable outer state
- [ ] Regex Pattern.compile() or new Regex() inside a loop
- [ ] Varargs call (Object... args) inside a tight loop
- [ ] Stream or iterator created per element in a nested iteration
- [ ] Temporary collection (new ArrayList, new HashMap) created inside a loop body
- [ ] DateTimeFormatter, SimpleDateFormat, or NumberFormat created per invocation
- [ ] Defensive copy (Collections.unmodifiableList, .toList(), .clone()) in a getter called per iteration
- [ ] Enum.values() called per iteration (allocates a new array each time in Java)
- [ ] String.format() or String.formatted() inside a tight loop

## Detailed Checks

### Object Allocation in Loops
<!-- activation: keywords=["new ", "new(", "create", "build", "construct", "alloc", "make(", "malloc", "loop", "for", "while", "each"] -->

- [ ] **Constructor in loop body**: flag `new SomeClass(...)` or equivalent object construction inside a loop when the object could be created once before the loop and reused or reset per iteration
- [ ] **Temporary collection per iteration**: flag `new ArrayList()`, `new HashMap()`, `[]`, `{}` created inside a loop body for single-use aggregation -- pre-allocate before the loop and clear per iteration, or accumulate into a single collection
- [ ] **Regex compiled per iteration**: flag `Pattern.compile()`, `new Regex()`, `re.compile()` inside a loop -- compile once as a static/constant and reuse
- [ ] **Formatter per invocation**: flag `new SimpleDateFormat()`, `DateTimeFormatter.ofPattern()`, `new DecimalFormat()` created per method call -- these are expensive to construct; create once and reuse (thread-safely where needed)

### Boxing and Unboxing
<!-- activation: keywords=["Integer", "Long", "Float", "Double", "Boolean", "Short", "Byte", "Character", "boxing", "unbox", "autobox", "wrapper", "primitive", "value type"] -->

- [ ] **Autoboxing in loop**: flag implicit boxing (int to Integer, double to Double) occurring inside a loop -- each box is a heap allocation; use primitive-specialized collections (IntList, LongArrayList, int[]) or restructure to avoid boxing
- [ ] **Boxed type in collection used in hot path**: flag `List<Integer>`, `Map<String, Double>`, `Set<Long>` used in a hot-path loop when a primitive-specialized alternative exists -- consider Eclipse Collections, HPPC, or Koloboke for JVM; typed arrays for JS/TS
- [ ] **Enum.values() per iteration**: flag `MyEnum.values()` called inside a loop in Java/Kotlin -- values() allocates a new array on every call; cache it in a static field

### String and Formatting Allocations
<!-- activation: keywords=["String", "string", "concat", "format", "formatted", "sprintf", "printf", "interpolat", "StringBuilder", "StringBuffer", "join", "template"] -->

- [ ] **String concatenation in loop**: flag `result += str` or `result = result + str` inside a loop -- use StringBuilder (Java/C#), strings.Builder (Go), list-then-join (Python), or buf.WriteString (Go)
- [ ] **String.format in tight loop**: flag `String.format()`, `String.formatted()`, `sprintf`, or equivalent formatting calls inside tight loops -- formatting involves parsing the format string each time; pre-build or use a builder
- [ ] **Implicit toString allocations**: flag implicit `toString()` calls inside logging or string building in a hot loop -- guard with log level checks or avoid string conversion entirely in non-logging paths

### Closures and Varargs
<!-- activation: keywords=["lambda", "closure", "=>", "->", "function(", "func(", "varargs", "Object...", "params ", "args ", "spread", "..."] -->

- [ ] **Capturing lambda in loop**: flag lambdas or closures created inside a loop that capture outer mutable variables -- each iteration allocates a new closure object; extract to a method reference or hoist the closure
- [ ] **Varargs array allocation**: flag methods with varargs (Object... args, params object[]) called inside tight loops -- each call allocates a new array; provide overloads with fixed parameter counts for the common cases
- [ ] **Stream pipeline per iteration**: flag `.stream().filter().map().collect()` inside a loop when the same transformation could be done with a single stream over the outer collection

## Common False Positives

- **Cold paths and startup code**: allocations in code that runs once (initialization, configuration parsing, migration) are fine. Flag only paths that execute per request, per event, or per iteration in a hot loop.
- **Short-lived objects in generational GC**: modern generational GCs handle short-lived objects efficiently (young generation collection). Flag only when the allocation rate is high enough to cause frequent GC pauses or promotion to old generation.
- **Immutable value objects**: creating small immutable objects (records, data classes) is often the correct design choice. Flag only when profiling shows allocation pressure or when the object could trivially be reused.
- **Logging frameworks**: most logging frameworks already guard against allocation when the log level is disabled. Flag only when the guarding is absent and the allocation is in a hot path.

## Severity Guidance

| Finding | Severity |
|---|---|
| Regex compiled inside a loop in a request-serving path | Critical |
| Object allocation inside a tight inner loop processing large datasets | Critical |
| String concatenation in loop with unbounded iterations | Important |
| Autoboxing in a hot-path loop over large collections | Important |
| Formatter (DateTimeFormatter, SimpleDateFormat) created per invocation | Important |
| Enum.values() called per iteration in a loop | Important |
| Varargs method called in a tight loop (array allocation per call) | Minor |
| Capturing lambda created inside a loop | Minor |
| Temporary collection created inside a loop for small fixed-size aggregation | Minor |

## See Also

- `perf-big-o-analysis` -- quadratic string building is both an algorithmic and allocation problem
- `perf-memory-gc` -- sustained allocation pressure leads to GC issues covered by that reviewer
- `antipattern-premature-optimization` -- not all allocations need optimization; profile first for cold paths
- `principle-dry-kiss-yagni` -- hoisting allocations is not premature optimization when the loop is a known hot path
- `perf-profiling-discipline` -- allocation profiling (JFR, async-profiler alloc mode, pprof) confirms hotspots

## Authoritative References

- [Aleksey Shipilev, "JVM Anatomy Quarks" -- allocation, escape analysis, and GC pressure on the JVM](https://shipilev.net/jvm/anatomy-quarks/)
- [Brendan Gregg, *Systems Performance*, 2nd ed. (2020), Chapter 5: "Applications" -- memory allocation profiling](https://www.brendangregg.com/systems-performance-2nd-edition-book.html)
- [Go Blog, "Profiling Go Programs" -- pprof heap profiling for allocation hotspots](https://go.dev/blog/pprof)
- [Microsoft, ".NET Performance Tips" -- boxing, string concatenation, and allocation guidance](https://learn.microsoft.com/en-us/dotnet/framework/performance/performance-tips)
