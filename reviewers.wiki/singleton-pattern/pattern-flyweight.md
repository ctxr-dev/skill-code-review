---
id: pattern-flyweight
type: primary
depth_role: leaf
focus: Detect misuse, over-application, and absence of the Flyweight pattern in shared-object memory optimization code.
parents:
  - index.md
covers:
  - Flyweights with mutable intrinsic state violating sharing safety
  - "Flyweight factories without proper identity/equality for cache keys"
  - "Flyweight applied to objects that are not actually memory-heavy (premature optimization)"
  - Extrinsic state accidentally stored in the flyweight instead of being passed in
  - Missing flyweight where thousands of similar objects consume excessive memory
  - Flyweight cache with no size limit causing memory leak
  - Thread-unsafe flyweight factory in concurrent code
  - "Flyweight equality confusion: identity (==) vs structural equality (equals)"
  - "Flyweight cache keys that do not correctly implement equals/hashCode"
  - Flyweight used where object pooling or interning would be more appropriate
tags:
  - flyweight
  - structural-pattern
  - design-patterns
  - memory
  - sharing
  - caching
  - immutability
  - pool
  - intern
activation:
  file_globs:
    - "**/*.{java,kt,scala,cs,ts,js,py,rb,go,rs,swift,cpp,h,hpp,php}"
  keyword_matches:
    - Flyweight
    - pool
    - cache
    - intern
    - shared
    - reuse
    - weight
    - immutable
    - intrinsic
    - extrinsic
    - symbol
    - glyph
    - valueOf
    - intPool
    - stringPool
  structural_signals:
    - factory_with_cache_map
    - immutable_shared_instances
    - intern_or_canonicalize_method
source:
  origin: file
  path: pattern-flyweight.md
  hash: "sha256:6ce80c51df53f0ca9a205f20e0bebc86eb81c639f306eb2c1896f0ac4c1c3c5e"
---
# Flyweight Pattern

## When This Activates

Activates when diffs introduce shared object caches, interning mechanisms, object pools keyed by intrinsic state, or `*Flyweight`, `*Pool`, `*Cache`, or `*Intern` classes. Also activates when code allocates large numbers of similar objects (text glyphs, game tiles, symbol table entries) that could share common state. The Flyweight pattern trades complexity for memory savings, but it introduces sharing hazards: mutable intrinsic state becomes a correctness disaster, and incorrect cache keys cause subtle aliasing bugs.

## Audit Surface

- [ ] Flyweight objects are immutable -- all intrinsic state is set at creation and never modified
- [ ] Flyweight factory cache keys properly implement equals/hashCode (or equivalent) and are immutable
- [ ] Flyweight optimization is justified by profiling: the shared objects are numerous and their unshared allocation would be measurably wasteful
- [ ] Extrinsic state is always passed as method parameters, never stored in the flyweight
- [ ] Flyweight cache has a bounded size or uses weak/soft references to allow garbage collection
- [ ] Flyweight factory is thread-safe for the target environment's concurrency model
- [ ] Code comparing flyweights uses the correct equality mechanism (identity vs structural) consistently
- [ ] Cache keys are not mutable objects that could change after map insertion
- [ ] Pattern is flyweight (shared state) not object pool (managed lifecycle) -- the distinction is clear
- [ ] Flyweight factory handles hash collisions correctly -- different keys do not alias to the same instance
- [ ] Extrinsic state is not accidentally captured by the flyweight through closures or stored references
- [ ] Flyweight interface operations accept extrinsic state as parameters when needed
- [ ] Ad-hoc interning (String.intern, Integer.valueOf) is recognized as flyweight usage and reviewed accordingly
- [ ] Flyweight objects do not have finalizers or destructors that would cause issues when shared

## Detailed Checks

### Mutable Intrinsic State
<!-- activation: keywords=["mutable", "set", "update", "modify", "change", "state", "field", "property"] -->

- [ ] **Mutable fields on shared object**: flyweight has setter methods or public mutable fields -- one client's modification affects all clients sharing the same instance, causing non-deterministic behavior
- [ ] **Mutable collection in flyweight**: flyweight contains a `List`, `Map`, or `Set` that can be modified after creation -- even if the reference is final, the contents can change
- [ ] **Lazy-initialized field**: flyweight has a field computed lazily on first access -- in concurrent code, multiple threads may race on initialization; in single-threaded code, the flyweight becomes stateful
- [ ] **Intrinsic state evolves**: business logic updates a field that was intrinsic at design time but is now treated as mutable -- the flyweight invariant is violated, and sharing becomes dangerous
- [ ] **Defensive copy missing**: flyweight returns a reference to an internal mutable object (array, date, collection) -- callers can mutate it, corrupting the shared state
- [ ] **Builder produces mutable flyweight**: flyweight is constructed via a builder but the builder does not create a frozen/immutable instance -- post-construction mutation is possible

### Cache Key Correctness
<!-- activation: keywords=["cache", "map", "key", "hash", "equals", "lookup", "get", "put", "intern", "canonical"] -->

- [ ] **Missing equals/hashCode**: cache key type relies on default identity-based equals/hashCode, causing logically identical keys to create duplicate flyweights -- memory savings are lost
- [ ] **Mutable cache key**: the key object passed to the factory can be mutated after insertion, causing the map to lose track of the entry -- use immutable keys or defensive copies
- [ ] **Inconsistent equals/hashCode**: cache key's `equals()` and `hashCode()` do not agree -- objects that are equal have different hash codes, causing cache misses and duplicate entries
- [ ] **Hash collision aliasing**: factory's cache lookup finds a colliding entry and returns the wrong flyweight -- use equals check after hash lookup, not just hash comparison
- [ ] **Composite key without all dimensions**: cache key does not include all intrinsic state fields, causing different flyweights to be aliased (e.g., caching by name but not by color)
- [ ] **String key allocation**: cache key is a formatted string (`name + ":" + size`) allocating a new string per lookup -- use a value-type key or tuple to avoid GC pressure

### Premature Optimization (Over-Applied Flyweight)
<!-- activation: keywords=["Flyweight", "flyweight", "pool", "cache", "shared", "reuse", "optimize", "memory"] -->

- [ ] **Few instances**: fewer than 100 instances of the "flyweight" type exist at runtime -- the memory savings are negligible and the complexity is unjustified
- [ ] **Small objects**: each object occupies only a few bytes (e.g., a wrapper around an int and a boolean) -- sharing saves less memory than the cache map entry itself consumes
- [ ] **No profiling evidence**: flyweight was introduced based on intuition ("there will be lots of these") without memory profiling showing actual waste
- [ ] **Modern runtime handles it**: language runtime already interns or optimizes the objects in question (e.g., small integers in Java/Python, string interning in .NET) -- manual flyweight is redundant
- [ ] **Complexity cost exceeds benefit**: flyweight requires separating intrinsic from extrinsic state, threading extrinsic state through all operations, and managing a factory cache -- this complexity is not justified by the memory savings
- [ ] **Object lifecycle mismatch**: flyweight cache prevents garbage collection of objects that should be short-lived, actually increasing memory usage compared to letting the GC reclaim them

### Extrinsic State Leaks
<!-- activation: keywords=["extrinsic", "context", "position", "color", "state", "parameter", "pass", "method", "operation"] -->

- [ ] **Stored extrinsic state**: flyweight stores context-specific data (position, user, session) as instance fields instead of receiving it as method parameters -- the object can no longer be shared across contexts
- [ ] **Closure capture**: flyweight captures extrinsic state through a closure or lambda stored at creation time, binding it to one context and preventing sharing
- [ ] **Accumulated context**: flyweight accumulates context-specific data over its lifetime through method calls (e.g., a `setPosition()` method) -- this state should be external
- [ ] **Missing extrinsic parameter**: flyweight operation needs context-specific data but the interface does not include it as a parameter -- the flyweight must store it internally, violating the pattern
- [ ] **Extrinsic state in wrong layer**: client code manages extrinsic state in ad-hoc local variables instead of a structured context object -- error-prone and hard to maintain

### Missing Flyweight Opportunity
<!-- activation: keywords=["new", "create", "allocate", "thousands", "millions", "large", "memory", "heap", "GC", "OutOfMemory"] -->

- [ ] **Repeated identical objects**: code creates thousands of objects with the same intrinsic state (e.g., `new Font("Arial", 12)` on every character) -- a flyweight factory would share one instance
- [ ] **String duplication**: application stores millions of strings with high duplication (e.g., country codes, status values) without interning -- `String.intern()` or a string cache would reduce memory
- [ ] **Symbol table**: compiler, interpreter, or template engine creates a new symbol object for every occurrence of an identifier instead of interning symbols
- [ ] **Game object duplication**: game creates a new tile/sprite/entity object for every cell in a large grid even though most cells share the same type and appearance
- [ ] **Configuration repetition**: every object in a large collection carries its own copy of shared configuration data (locale, theme, defaults) instead of referencing a shared flyweight

### Flyweight Factory Thread Safety
<!-- activation: keywords=["factory", "concurrent", "thread", "synchronized", "lock", "ConcurrentHashMap", "computeIfAbsent", "volatile"] -->

- [ ] **Unsynchronized get-or-create**: factory checks the cache and inserts on miss without synchronization -- in concurrent code, multiple threads create duplicate flyweights for the same key
- [ ] **Lock contention**: factory uses a global lock for the entire cache map -- `ConcurrentHashMap.computeIfAbsent` or read-write locks would reduce contention
- [ ] **Double creation waste**: concurrent threads each create a flyweight, but only one is stored -- the other is discarded, wasting the creation cost (acceptable if creation is cheap, problematic if expensive)
- [ ] **Cache stampede**: many threads simultaneously request a flyweight for a new key, all creating instances before one wins the cache insertion -- use a single-flight or futures-based approach for expensive creation
- [ ] **Initialization race**: flyweight's intrinsic state is set after construction via setters rather than in the constructor, creating a window where a partially-initialized flyweight is visible to other threads

## Common False Positives

- **Language-built-in interning**: Java's `Integer.valueOf()` cache (-128 to 127), Python's small integer cache, and .NET string interning are runtime-managed flyweights. Do not flag these as missing a manual flyweight.
- **Enum values**: language enums are singleton flyweights by definition. Using enums for shared constant state is idiomatic.
- **Connection pools**: connection pools manage object lifecycle (checkout, return, close), not shared state. They are pools, not flyweights -- different patterns solving different problems.
- **DI singleton scope**: a service registered as singleton in a DI container shares one instance but is not a flyweight -- it has no intrinsic/extrinsic state separation.
- **Constant objects**: `static final` / `const` objects that are naturally shared are simple constants, not flyweight pattern instances. Do not flag them for "missing factory."
- **Prototype/clone patterns**: object cloning creates copies for independent use. This is the opposite of flyweight sharing.

## Severity Guidance

| Finding | Severity |
|---|---|
| Mutable intrinsic state on shared flyweight (data corruption risk) | critical |
| Cache key with broken equals/hashCode causing wrong flyweight returned | high |
| Extrinsic state stored in flyweight, preventing safe sharing | high |
| Flyweight factory not thread-safe in concurrent code | high |
| Flyweight cache grows unbounded with no eviction (memory leak) | medium |
| Thousands of identical objects allocated without sharing (missing flyweight) | medium |
| Flyweight applied to objects with trivial memory footprint (premature optimization) | medium |
| Defensive copy missing -- callers can mutate shared flyweight internals | medium |
| Flyweight factory uses mutable cache key | medium |
| Ad-hoc interning without recognizing it as flyweight pattern | low |
| Flyweight with finalizer/destructor called on shared instance | low |
| Minor: string key allocation in hot-path flyweight lookup | low |

## See Also

- `pattern-singleton` -- singletons share a single instance globally; flyweights share instances by intrinsic state key. A flyweight factory may itself be a singleton.
- `pattern-factory-method` -- flyweight factories are specialized factories that cache and return shared instances
- `principle-encapsulation` -- flyweight intrinsic state must be encapsulated and immutable to maintain sharing safety
- `principle-coupling-cohesion` -- extrinsic state separation keeps flyweight objects cohesive (only intrinsic state) and decoupled from usage context

## Authoritative References

- [Erich Gamma et al., *Design Patterns: Elements of Reusable Object-Oriented Software* (1994), Flyweight](https://www.oreilly.com/library/view/design-patterns-elements/0201633612/)
- [Joshua Bloch, *Effective Java* (3rd ed., 2018), Item 6: Avoid creating unnecessary objects](https://www.oreilly.com/library/view/effective-java/9780134686097/)
- [Martin Fowler, *Patterns of Enterprise Application Architecture* (2002), Identity Map](https://martinfowler.com/eaaCatalog/identityMap.html)
- [Brian Goetz et al., *Java Concurrency in Practice* (2006), Chapter 5: Building Blocks -- concurrent collections for safe caching](https://www.oreilly.com/library/view/java-concurrency-in/0321349601/)
