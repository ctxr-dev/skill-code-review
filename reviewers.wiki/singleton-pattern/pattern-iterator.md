---
id: pattern-iterator
type: primary
depth_role: leaf
focus: Detect misuse, over-application, and absence of the Iterator pattern in collection-traversal code.
parents:
  - index.md
covers:
  - Custom iterators that do not handle concurrent modification of the underlying collection
  - Iterators with hidden side effects that mutate the collection during iteration
  - Iterators that leak internal collection structure through their API
  - Missing iterator where index-based loops expose collection internals
  - Infinite iterators without termination guards
  - "Iterator implementations that violate the iteration protocol (hasNext/next contract)"
  - "Iterators that hold resources (file handles, DB cursors) without a close/dispose mechanism"
  - Multiple active iterators on the same collection interfering with each other
  - "Generator/yield-based iterators with complex state that is hard to reason about"
  - Custom iterator where standard library iteration suffices
tags:
  - iterator
  - behavioral-pattern
  - design-patterns
  - traversal
  - collection
  - generator
  - yield
  - stream
  - cursor
activation:
  file_globs:
    - "**/*.{java,kt,scala,cs,ts,js,py,rb,go,rs,swift,cpp,h,hpp,php}"
  keyword_matches:
    - Iterator
    - iterator
    - iterable
    - next
    - hasNext
    - yield
    - generator
    - cursor
    - enumerate
    - iter
    - __iter__
    - __next__
    - Symbol.iterator
    - for...of
    - stream
  structural_signals:
    - class_implementing_iterator_interface
    - generator_function_with_yield
    - custom_next_method_on_collection
source:
  origin: file
  path: pattern-iterator.md
  hash: "sha256:73f180554b316f5996919480b956cd1d28f262d122d5ef89d6502c8e1e245f9e"
---
# Iterator Pattern

## When This Activates

Activates when diffs introduce custom iterator or iterable implementations, use generator functions with `yield`/`yield*`, add cursor-based traversal of databases or external resources, implement `Symbol.iterator`/`__iter__`/`Iterator` interfaces, or use index-based loops over abstracted collections. The Iterator pattern provides uniform traversal without exposing collection internals, but it introduces risks when concurrent modification goes undetected, when iterators produce side effects, or when infinite sequences lack termination guards.

## Audit Surface

- [ ] Custom iterator detects concurrent modification (e.g., fail-fast with ConcurrentModificationException or a modification counter)
- [ ] Iterator's `next()` does not modify the underlying collection as a side effect of traversal
- [ ] Iterator API does not expose internal collection structure (backing arrays, tree nodes, hash buckets)
- [ ] Collection traversal uses the iterator/iterable protocol rather than index-based access to internal structure
- [ ] Every infinite iterator or generator has a termination guard (take, limit, break, timeout) at the consumption site
- [ ] Consumer checks `hasNext()` before `next()`, or uses for-each/for-of that handles protocol automatically
- [ ] Resource-holding iterators (file, DB cursor, network) implement Closeable/AutoCloseable and are used in try-with-resources or equivalent
- [ ] Multiple simultaneous iterators on the same collection do not interfere with each other
- [ ] Generator functions have clear, linear control flow -- complex branching with multiple yield points is refactored
- [ ] Standard library iteration mechanisms are used unless custom iteration provides a clear benefit
- [ ] Iterator's `remove()` or mutation method is either properly implemented or explicitly documented as unsupported
- [ ] Iterator does not skip or duplicate elements when the collection size changes during iteration
- [ ] Lazy iterator chain depth is bounded and does not create excessive wrapper object allocation
- [ ] Iterator is either reusable (returns a fresh iterator from `iterator()`) or single-use behavior is documented

## Detailed Checks

### Concurrent Modification During Iteration
<!-- activation: keywords=["concurrent", "modify", "add", "remove", "delete", "insert", "resize", "ConcurrentModificationException", "fail-fast", "modCount", "lock", "synchronized"] -->

- [ ] **No modification detection**: custom iterator does not track a modification count or version number -- if the collection changes during iteration, the iterator silently delivers stale, duplicate, or missing elements
- [ ] **Remove during iteration without iterator.remove()**: code calls `collection.remove(element)` inside a for-each loop instead of using `iterator.remove()` -- causes ConcurrentModificationException in Java or undefined behavior in other languages
- [ ] **Add during iteration**: code adds elements to the collection inside the iteration loop -- the iterator may or may not see the new elements depending on implementation, creating unpredictable behavior
- [ ] **Concurrent thread modification**: one thread iterates while another modifies the collection without synchronization -- the iterator may throw, skip elements, or deliver duplicates
- [ ] **Iterator over a view or snapshot**: the iterator traverses a live view of the collection (subList, filtered view) that is invalidated by modification to the backing collection
- [ ] **Defensive copy missing**: iterator should traverse a snapshot of the collection when concurrent modification is expected, but traverses the live collection instead

### Iterators With Side Effects
<!-- activation: keywords=["side effect", "mutate", "modify", "write", "delete", "update", "state", "count", "log", "emit", "fire"] -->

- [ ] **next() modifies collection**: calling `next()` removes the element from the collection, changes element state, or triggers a side effect (emit event, write log) -- iteration should be read-only unless explicitly documented
- [ ] **Stateful iteration**: iterator maintains state (running total, last-seen element) that affects what `next()` returns -- this makes iteration non-repeatable and order-dependent
- [ ] **Iterator advances other iterators**: calling `next()` on one iterator advances a shared internal cursor, affecting other iterators on the same collection -- each iterator should have independent position
- [ ] **Generator with side effects between yields**: generator function performs I/O, database writes, or state mutations between yield points -- consumers do not expect side effects from iteration
- [ ] **Iteration triggers lazy computation with side effects**: lazy iterator computes values on demand, but the computation has side effects (network calls, logging) that multiply with each iteration

### Leaking Collection Internals
<!-- activation: keywords=["internal", "node", "array", "bucket", "index", "pointer", "backing", "raw", "expose", "implementation"] -->

- [ ] **Iterator exposes internal nodes**: iterator returns tree nodes, linked-list nodes, or hash map entries instead of the contained values -- clients couple to the collection's internal structure
- [ ] **Index-based access on abstracted type**: code uses `collection.get(i)` in a for-loop on a type that may be a linked list (O(n) per access) instead of using an iterator (O(1) per step) -- the index-based loop assumes array-backed storage
- [ ] **Iterator returns mutable internal references**: iterator yields references to internal objects that the caller can modify, breaking the collection's invariants (e.g., modifying a TreeMap key)
- [ ] **Collection-specific iteration method**: the collection exposes a traversal method (`visitNodes()`, `walkBuckets()`) that reveals its internal organization -- provide a standard iterator instead
- [ ] **Raw pointer or handle exposed**: in C/C++/Rust, the iterator yields raw pointers to internal storage that become dangling if the collection reallocates

### Missing Iterator (Index-Based Loop Anti-Pattern)
<!-- activation: keywords=["for", "index", "i++", "get(", "size()", "length", "count", "[]", "elementAt", "charAt"] -->

- [ ] **Index loop over abstract collection**: code uses `for (int i = 0; i < list.size(); i++) list.get(i)` when the collection type could be a linked list, skip list, or other structure where indexed access is O(n) -- use the collection's iterator or for-each
- [ ] **Index loop exposes collection type**: changing the collection from ArrayList to LinkedList would degrade the loop from O(n) to O(n^2) -- an iterator decouples traversal from storage
- [ ] **Off-by-one in index loop**: manual index management introduces off-by-one errors (starting at 1, using `<=` instead of `<`) that an iterator protocol prevents
- [ ] **Parallel index iteration**: two collections iterated in lockstep with shared index `i` -- if the collections have different sizes, the code fails silently or throws
- [ ] **String character iteration**: `str.charAt(i)` in a loop over a UTF-16 string mishandles surrogate pairs -- use a character iterator or codepoint stream

### Infinite Iterators Without Termination
<!-- activation: keywords=["infinite", "unlimited", "endless", "generate", "repeat", "cycle", "forever", "while true", "yield", "stream", "lazy", "take", "limit"] -->

- [ ] **Unbounded generator consumed fully**: a generator produces values indefinitely (`while (true) yield nextValue()`) and the consumer uses `for ... of` or `collect()` without a `take(n)`, `limit(n)`, or `break` -- the program hangs or exhausts memory
- [ ] **Stream without terminal limit**: `Stream.generate(() -> ...)` or `itertools.count()` piped to `collect(toList())` without `.limit(n)` -- unbounded memory allocation
- [ ] **Recursive generator without base case**: generator function yields and then calls itself recursively without a depth or count guard -- stack overflow
- [ ] **Retry iterator without max attempts**: an iterator retries a failing operation on each `next()` call with no maximum retry count -- infinite loop on persistent failures
- [ ] **Cycle iterator as default**: `itertools.cycle()` or equivalent used as a default iterator when a finite iterator was intended -- silent infinite loop

### Resource-Holding Iterators
<!-- activation: keywords=["close", "dispose", "resource", "file", "cursor", "connection", "stream", "handle", "AutoCloseable", "Closeable", "with", "using", "try", "finally", "context manager"] -->

- [ ] **DB cursor not closed**: iterator wraps a database cursor (ResultSet, MongoDB cursor) but does not implement Closeable/AutoCloseable -- cursor stays open if iteration is abandoned early
- [ ] **File iterator not closed**: iterator reads lines from a file but is not used in try-with-resources or equivalent -- file handle leaks if an exception interrupts iteration
- [ ] **Network stream iterator**: iterator reads from a network stream/socket -- if the consumer breaks early, the connection is not properly closed, leaking sockets
- [ ] **No close on early termination**: iterator implements Closeable but the consumer uses `break` to exit the loop without calling `close()` -- use try-with-resources or language equivalent
- [ ] **Generator with cleanup**: generator allocates a resource before the first `yield` and cleans up after the last, but if the consumer abandons the generator, cleanup never runs -- use try/finally in the generator body

### Over-Applied Custom Iterator
<!-- activation: keywords=["custom", "iterator", "implement", "class", "wrapper", "own", "simple", "standard", "library"] -->

- [ ] **Custom iterator wrapping standard collection**: a custom `Iterator` class wraps an `ArrayList` or `HashMap` adding no additional behavior -- use the collection's built-in iterator directly
- [ ] **Re-implementing language protocol**: custom class re-implements `__iter__`/`__next__` (Python) or `Symbol.iterator`/`next` (JavaScript) on a class that could simply extend or compose a built-in iterable
- [ ] **Iterator for a small fixed collection**: custom iterator for a collection that is always small (under 10 elements) -- a simple array or list with standard iteration is simpler and faster

## Common False Positives

- **Standard library iterators**: Java `Iterator<T>`, Python `__iter__`/`__next__`, JavaScript `Symbol.iterator`, Rust `Iterator` trait implementations are the standard way to make collections iterable. Do not flag standard protocol implementations.
- **Reactive streams**: RxJS Observables, Reactor Flux, Akka Streams are push-based and not GoF iterators. Do not flag as "custom iterator" unless they wrap a pull-based collection.
- **Database pagination**: cursor-based or keyset pagination over database results is appropriate; do not flag as "index-based loop anti-pattern."
- **Array/vector index loops in performance-critical code**: in languages like C, C++, Rust, and Go, index-based loops over contiguous arrays are idiomatic and performant. Do not flag as "missing iterator."
- **Python generators for pipeline processing**: generator pipelines (`gen1 | gen2 | gen3`) are idiomatic Python for lazy data processing. Flag only if termination guards are missing on infinite sources.

## Severity Guidance

| Finding | Severity |
|---|---|
| Concurrent modification during iteration causing silent element skipping or duplication | high |
| DB cursor or file handle not closed on early iteration termination | high |
| Infinite iterator consumed without limit, causing hang or OOM | high |
| next() modifies the underlying collection as a side effect | high |
| Iterator exposes mutable internal references allowing collection invariant violation | medium |
| Index-based loop over linked list or non-random-access collection (O(n^2)) | medium |
| Two simultaneous iterators sharing a cursor on the same collection | medium |
| Generator with side effects between yields surprising consumers | medium |
| Iterator returns stale elements after collection modification (no fail-fast) | medium |
| Custom iterator reimplementing standard library protocol with no added value | low |
| Iterator not reusable (second iteration silently empty) without documentation | low |
| Lazy iterator chain creating deep wrapper nesting | low |

## See Also

- `pattern-composite` -- composites often need iterators for tree traversal; verify the iterator handles recursive structures and cycles correctly
- `principle-encapsulation` -- iterators encapsulate collection internals; leaking nodes or indexes breaks encapsulation
- `principle-separation-of-concerns` -- iteration logic (traversal order, filtering) should be separated from collection storage logic
- `principle-law-of-demeter` -- index-based access reaches into collection internals; iterators provide a minimal interface honoring LoD

## Authoritative References

- [Erich Gamma et al., *Design Patterns: Elements of Reusable Object-Oriented Software* (1994), Iterator](https://www.oreilly.com/library/view/design-patterns-elements/0201633612/)
- [Joshua Bloch, *Effective Java* (3rd ed., 2018), Item 58: Prefer for-each loops to traditional for loops](https://www.oreilly.com/library/view/effective-java/9780134686097/)
- [MDN Web Docs, Iteration protocols](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols)
- [Python Documentation, Iterator Types](https://docs.python.org/3/library/stdtypes.html#iterator-types)
