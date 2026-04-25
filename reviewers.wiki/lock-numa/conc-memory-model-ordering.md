---
id: conc-memory-model-ordering
type: primary
depth_role: leaf
focus: "Detect volatile/atomic misuse, happens-before violations, incorrect fence placement, and instruction reordering bugs across threads."
parents:
  - index.md
covers:
  - "Volatile field used for compound read-modify-write operations (not atomic)"
  - Instruction reordering across threads causing stale or inconsistent reads
  - Happens-before chain broken by missing synchronization action
  - Memory fence placed on wrong side of the critical store or load
  - "C++ volatile used for inter-thread communication (not a threading construct)"
  - Java final field semantics relied upon but constructor publishes this before completion
  - "Double-checked locking without volatile (partially constructed object visible)"
  - "Relaxed atomic used where acquire/release semantics are required"
  - "ARM/POWER reordering manifesting in production but not on x86 dev machines"
  - "Go memory model violation: goroutine reads unsynchronized shared variable"
  - Python multiprocessing shared memory without proper synchronization
  - Shared mutable field read and written from multiple threads without synchronization
  - TOCTOU gap between checking a condition and acting on it across threads
  - "Read-modify-write on a non-atomic variable (counter++, flag toggle) without a lock or atomic"
  - "HashMap/dict/slice mutated concurrently without a concurrent collection or lock"
  - Struct or object published to another thread before construction completes
  - Lazy initialization race where two threads both see null and create duplicate instances
  - "Boolean flag used to communicate between threads without volatile/atomic"
  - Iterator over a collection modified concurrently, causing ConcurrentModificationException or silent corruption
  - Go race on map access detected by -race but absent from CI
  - "Rust Send/Sync bounds bypassed via unsafe, enabling data races"
  - Java happens-before chain broken by missing volatile or synchronized
  - "File-system TOCTOU between stat/exists check and open/create"
  - "Relaxed ordering where acquire/release is needed for data synchronization"
  - "Compiler/CPU reordering of loads and stores across threads"
  - "volatile misunderstanding: Java volatile provides happens-before, C volatile does not"
  - Memory fence placement incorrect or missing
  - "False sharing: independent atomics in same cache line causing performance degradation"
  - "SeqCst used everywhere (correct but slow) vs targeted acquire/release"
  - Compare-and-swap loop without appropriate ordering
  - "Load/store pair on separate atomics not providing intended ordering guarantee"
  - "Relaxed memory ordering used where acquire/release or sequential consistency is required"
  - ABA problem in CAS-based data structures allowing corrupted state
  - CAS loop without backoff causing CPU spin under contention
  - Atomic operation on wrong granularity -- atomicity needed across multiple fields but applied to one
  - "fetch_add/fetch_or used where a CAS loop is needed for conditional update"
  - "Atomic load followed by non-atomic store (or vice versa) on the same variable"
  - Spurious CAS failure not handled in weak CAS platforms
  - Lock-free stack or queue with incorrect memory ordering causing lost nodes
  - AtomicReference used for compound state that requires atomic update of multiple fields
  - Volatile used in place of atomic where read-modify-write is needed
  - "Memory fence placed incorrectly, allowing reordering of critical stores/loads"
tags:
  - memory-model
  - happens-before
  - volatile
  - atomic
  - reordering
  - fence
  - barrier
  - visibility
  - concurrency
  - race-condition
  - data-race
  - toctou
  - synchronization
  - atomicity
  - thread-safety
  - memory-ordering
  - atomics
  - false-sharing
  - lock-free
  - CWE-362
  - CWE-567
  - CAS
  - ABA
  - wait-free
  - compare-and-swap
aliases:
  - conc-race-conditions-data-races
  - footgun-memory-ordering-atomics
  - conc-lock-free-atomics
activation:
  file_globs:
    - "**/*.{java,kt,scala,cs,cpp,c,h,hpp,rs,go,swift,zig}"
  keyword_matches:
    - volatile
    - Volatile
    - atomic
    - Atomic
    - memory_order
    - happens-before
    - happens before
    - fence
    - barrier
    - memory_order_relaxed
    - memory_order_acquire
    - memory_order_release
    - memory_order_seq_cst
    - Ordering
    - Acquire
    - Release
    - SeqCst
    - final
    - synchronized
    - reorder
  structural_signals:
    - volatile_field_with_compound_access
    - atomic_without_ordering
    - shared_field_without_synchronization
source:
  origin: file
  path: conc-memory-model-ordering.md
  hash: "sha256:020751c259da6f6efba04c4b7045600dc310ef61aca3d08c657e44ffdb113c95"
---
# Memory Model and Ordering

## When This Activates

Activates when diffs use `volatile` (Java/C#/C++), `std::atomic` with explicit memory orderings, memory fences/barriers, `final` field publication in constructors, or introduce shared variables accessed from multiple threads. Memory model bugs are the most insidious concurrency defects: they work correctly on x86 (which has a strong memory model), pass all tests, and fail only on ARM, POWER, or Apple Silicon in production. The compiler and CPU reorder instructions for performance; the memory model defines which reorderings are visible to other threads.

## Audit Surface

- [ ] Every shared variable has a synchronization mechanism that establishes happens-before
- [ ] Volatile is used for visibility only; compound read-modify-write uses atomics
- [ ] The happens-before chain from writer to reader is complete (no gap)
- [ ] Fences are correctly placed: release before the publishing store, acquire after the consuming load
- [ ] C++ volatile is not used for inter-thread communication
- [ ] Java final fields are safely published (constructor completes before `this` is shared)
- [ ] Double-checked locking uses volatile/atomic on the lazily-initialized field
- [ ] Atomic memory orderings are the weakest correct choice, not blindly Relaxed or SeqCst
- [ ] Code has been validated on weak memory model architectures (ARM, POWER) or with model checkers
- [ ] Go code follows the Go Memory Model: channels, sync primitives, or atomic for synchronization
- [ ] Statement order in source code is not relied upon for inter-thread visibility guarantees
- [ ] Object publication uses a release-store (or equivalent) so all fields are visible to the reader

## Detailed Checks

### Volatile Misuse
<!-- activation: keywords=["volatile", "Volatile", "visibility", "flag", "ready", "done", "stop", "published", "increment", "count"] -->

- [ ] **Java volatile for increment**: `volatile int count; count++` -- volatile guarantees visibility but `count++` is a read-modify-write operation that is not atomic; two threads may read the same value and increment to the same result
- [ ] **Java volatile for compound check-then-act**: `if (volatileFlag) { doWork(); }` where `doWork()` depends on other non-volatile fields -- only the flag read has happens-before, not the other fields (unless they are also volatile or final)
- [ ] **C++ volatile for threading**: C++ `volatile` prevents compiler optimization of reads/writes (designed for memory-mapped I/O) but provides zero threading guarantees -- use `std::atomic` for inter-thread communication
- [ ] **C# volatile assumptions**: C# `volatile` provides acquire/release semantics but not atomicity for 64-bit values on 32-bit platforms -- use `Interlocked` operations for 64-bit values
- [ ] **Volatile array elements**: Java `volatile int[]` makes the array reference volatile, not the elements -- reads/writes to `array[i]` have no happens-before guarantee; use `AtomicIntegerArray`

### Happens-Before Violations
<!-- activation: keywords=["happens-before", "happens before", "visibility", "stale", "out of thin air", "reorder", "order", "see", "observe", "publish", "synchronize"] -->

- [ ] **Broken happens-before chain**: thread A writes to field X, then writes to volatile field V; thread B reads volatile V, then reads X -- this is correct only if B reads the value written by A to V (establishing happens-before); if B reads V before A writes it, there is no happens-before for X
- [ ] **Non-volatile field read across threads**: field is written by one thread and read by another with no synchronization -- the JMM allows the reader to see a stale value indefinitely (the write may never become visible)
- [ ] **Constructor publishes `this` early**: constructor stores `this` into a shared field before all fields are initialized -- other threads may see a partially-constructed object with default values for uninitialized fields
- [ ] **Go unsynchronized shared variable**: a goroutine writes to a package-level variable and another goroutine reads it with no channel, mutex, or atomic operation -- per the Go memory model, the read may return the zero value or a stale value
- [ ] **Final field leak in Java**: `final` fields are guaranteed visible after construction only if the reference is not published via `this` during construction -- if `this` escapes the constructor, final field guarantees are void

### Fence and Barrier Placement
<!-- activation: keywords=["fence", "barrier", "mfence", "dmb", "lfence", "sfence", "memory_order", "Release", "Acquire", "std::atomic_thread_fence", "sync.atomic"] -->

- [ ] **Release fence after store**: `store(data); fence(Release)` -- the release fence must come before the publishing store, not after; placing it after allows the store to be reordered before the data writes
- [ ] **Acquire fence before load**: `fence(Acquire); load(flag)` -- the acquire fence must come after the consuming load, not before; placing it before does not prevent reordering of the load with subsequent reads
- [ ] **Standalone fence without matching pair**: a release fence in the writer has no matching acquire fence in the reader (or vice versa) -- unpaired fences provide no inter-thread ordering guarantee
- [ ] **Fence used instead of atomic ordering**: code uses `std::atomic_thread_fence(memory_order_release)` + plain store instead of `atomic.store(value, memory_order_release)` -- the fence applies to all preceding operations but the plain store can still race; use atomic operations with ordering
- [ ] **Platform-specific fence**: code uses `__asm__ volatile("mfence")` or `MemoryBarrier()` instead of portable atomic operations -- the fence is architecture-specific and may not work on other platforms

### Architecture-Specific Reordering
<!-- activation: keywords=["ARM", "POWER", "x86", "TSO", "weak", "strong", "architecture", "platform", "reorder", "store buffer", "load buffer", "Apple Silicon", "aarch64"] -->

- [ ] **x86-only testing**: code is developed and tested on x86 (Total Store Order) which hides most reorderings -- on ARM or POWER, the same code may fail because loads can be reordered before stores and stores can be reordered with each other
- [ ] **Store-load reordering**: thread A stores X=1 then loads Y; thread B stores Y=1 then loads X -- on x86 both may read 0 (store buffer forwarding); on ARM this and additional reorderings are possible
- [ ] **Dependent load reordering (Alpha)**: historically, DEC Alpha could reorder dependent loads (load pointer, then load through pointer) -- modern architectures do not, but the C++ memory model still requires `memory_order_consume` or `memory_order_acquire` for this pattern
- [ ] **Apple Silicon in production**: code tested on Intel Macs (x86) is deployed on Apple Silicon (ARM) without re-testing memory model assumptions -- ARM allows more reorderings than x86

### Publication and Safe Initialization
<!-- activation: keywords=["publish", "initialize", "init", "construct", "final", "immutable", "double-checked", "singleton", "lazy", "instance", "once"] -->

- [ ] **Double-checked locking without volatile**: `if (instance == null) { synchronized (...) { if (instance == null) { instance = new Foo(); }}}` -- without `volatile` on `instance`, a thread may see a non-null reference to a partially-constructed object (Java, pre-JSR-133 was broken; post-JSR-133 still requires volatile)
- [ ] **Lazy initialization race in Go**: `if singleton == nil { singleton = newInstance() }` without `sync.Once` -- two goroutines may both see nil and create two instances, or one may see a partially-initialized struct
- [ ] **Safe publication not used**: an object is constructed and stored into a shared field without a release operation -- the reading thread may see the reference but read default values for the object's fields
- [ ] **Immutable object unsafely published**: even though the object is logically immutable, if it is published without a happens-before relationship, the reader may see partially-constructed state (Java final fields are an exception only if publication rules are followed)

## Common False Positives

- **Thread-confined variables**: variables accessed only from a single thread do not need volatile/atomic. Verify thread confinement before flagging.
- **Synchronized block coverage**: all reads and writes within `synchronized` blocks on the same lock have happens-before. Do not flag field visibility if the access is always within a synchronized block.
- **Java final fields (correct publication)**: `final` fields initialized in the constructor and published after construction are safely visible to all threads. Do not flag these as "missing volatile."
- **Immutable data**: truly immutable objects (all fields final/const, no mutable references) are safely publishable after construction. Do not flag reads of immutable shared data.
- **x86-only deployment**: if the codebase is exclusively deployed on x86 (and this is documented), weaker orderings may appear safe. Flag as a portability concern, not a production bug.

## Severity Guidance

| Finding | Severity |
|---|---|
| Shared variable accessed across threads with no synchronization (data race) | critical |
| C++ volatile used for inter-thread communication | critical |
| Double-checked locking without volatile/atomic (partially-constructed object) | high |
| Happens-before chain broken -- reader may see stale data | high |
| Constructor publishes `this` before fields are initialized | high |
| Release fence placed after store instead of before | high |
| Java volatile used for compound read-modify-write | high |
| Go shared variable without channel, mutex, or atomic | high |
| Code tested only on x86, deployed on ARM/POWER | medium |
| Volatile array reference vs volatile array elements (Java) | medium |
| Standalone fence without matching pair | medium |
| Relaxed atomic where acquire/release is needed | high |
| Final field guarantee voided by constructor this-escape | medium |

## See Also

- `conc-lock-free-atomics` -- lock-free algorithms require precise memory ordering; this reviewer validates the ordering choices
- `conc-race-conditions-data-races` -- data races are memory model violations; this reviewer focuses on the ordering semantics
- `conc-lock-discipline-deadlock` -- locks provide happens-before implicitly; verify lock coverage for shared state
- `pattern-double-checked-locking` -- DCL is the classic memory model pitfall; verify volatile on the instance field
- `principle-immutability-by-default` -- immutable objects need minimal publication guarantees; prefer immutability
- `pattern-monitor-object` -- monitors provide happens-before via lock/unlock; verify the monitor covers all shared state

## Authoritative References

- [Jeremy Manson, William Pugh, and Sarita V. Adve, "The Java Memory Model" (2005)](https://doi.org/10.1145/1040305.1040336)
- [Hans-J. Boehm and Sarita V. Adve, "Foundations of the C++ Concurrency Memory Model" (2008)](https://doi.org/10.1145/1375581.1375591)
- [Go Documentation: The Go Memory Model](https://go.dev/ref/mem)
- [Herb Sutter, "atomic<> Weapons: The C++ Memory Model and Modern Hardware" (2012)](https://herbsutter.com/2013/02/11/atomic-weapons-the-c-memory-model-and-modern-hardware/)
- [Russ Cox, "Memory Models" (research.swtch.com, 2021)](https://research.swtch.com/mm)
