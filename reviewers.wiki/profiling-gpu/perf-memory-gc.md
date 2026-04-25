---
id: perf-memory-gc
type: primary
depth_role: leaf
focus: Detect memory leaks, excessive GC pressure, large object heap issues, and finalizer abuse in managed-runtime and reference-counted environments
parents:
  - index.md
covers:
  - "Event listener or callback registered but never removed (leak)"
  - Closure capturing references that prevent garbage collection
  - Unbounded in-memory cache or map growing without eviction
  - Large objects allocated frequently causing LOH fragmentation or GC promotion
  - Finalizer or destructor performing expensive work or blocking
  - Weak reference chains used for caching without understanding GC behavior
  - Global or static collections accumulating entries over application lifetime
  - Timer or interval not cleared on component unmount or scope exit
  - Subscription to observable or event bus not unsubscribed
  - Thread-local storage accumulating data in thread-pool environments
  - Short-lived objects promoted to old generation due to mid-life crisis
tags:
  - memory-leak
  - gc
  - garbage-collection
  - finalizer
  - event-listener
  - closure
  - dispose
  - performance
activation:
  file_globs:
    - "**/*.java"
    - "**/*.kt"
    - "**/*.cs"
    - "**/*.js"
    - "**/*.ts"
    - "**/*.tsx"
    - "**/*.py"
    - "**/*.go"
    - "**/*.rb"
  keyword_matches:
    - addEventListener
    - removeEventListener
    - subscribe
    - unsubscribe
    - dispose
    - Disposable
    - finalize
    - finalizer
    - __del__
    - WeakReference
    - ThreadLocal
    - setInterval
    - setTimeout
    - clearInterval
    - useEffect
    - static
    - global
    - GC
    - heap
    - memory
  structural_signals:
    - event_listener_no_removal
    - interval_no_clear
    - subscribe_no_unsubscribe
    - static_collection_growth
source:
  origin: file
  path: perf-memory-gc.md
  hash: "sha256:a85e10ff1fbd84ce6845ffa9d8ebaef19357c0745df60306df73957d77d12603"
---
# Memory Leaks and GC Pressure

## When This Activates

Activates on diffs introducing event listeners, subscriptions, timers, static collections, finalizers, closures, or resource management code. Memory leaks in managed-runtime languages are reference leaks -- objects remain reachable via forgotten references, preventing garbage collection. The symptoms are gradual heap growth, increasing GC pause times, and eventual OOM crashes. Unlike off-by-one errors, memory leaks rarely manifest in testing and only appear under sustained production load. This reviewer detects patterns that are known to cause reference leaks and GC pressure across managed runtimes.

## Audit Surface

- [ ] addEventListener or on() without corresponding removeEventListener or off()
- [ ] setInterval or setTimeout without clearInterval or clearTimeout on cleanup
- [ ] Observable.subscribe() without unsubscribe in teardown or finally
- [ ] Static or global collection (List, Map, Set) that grows during runtime
- [ ] Closure referencing large outer scope variables in a long-lived callback
- [ ] Finalizer or __del__ performing I/O, synchronization, or complex logic
- [ ] WeakReference used for caching without understanding collection timing
- [ ] Thread-local (ThreadLocal, thread_local!) populated in thread-pool threads
- [ ] Large byte array or buffer allocated in a hot path (>85KB on .NET, LOH)
- [ ] Object retained by multiple references preventing expected GC collection
- [ ] React useEffect with no cleanup function for subscriptions or timers
- [ ] Disposable or AutoCloseable resource not closed in finally or try-with-resources

## Detailed Checks

### Event Listener and Subscription Leaks
<!-- activation: keywords=["addEventListener", "removeEventListener", "on(", "off(", "subscribe", "unsubscribe", "observe", "emit", "event", "listener", "handler", "callback", "useEffect", "componentWillUnmount"] -->

- [ ] __Listener without removal__: flag `addEventListener`, `.on()`, or equivalent event registration with no corresponding removal in a cleanup path (componentWillUnmount, useEffect cleanup, dispose, close) -- the listener retains a reference to its closure and all captured variables
- [ ] __Subscription without unsubscribe__: flag `.subscribe()` on observables (RxJS, RxJava, Reactor) without `.unsubscribe()` or equivalent in a teardown path -- each subscription holds a reference chain back to the source
- [ ] __React useEffect without cleanup__: flag `useEffect` hooks that register subscriptions, timers, or event listeners and do not return a cleanup function -- the effect re-runs on re-render, stacking registrations

### Timer and Interval Leaks
<!-- activation: keywords=["setInterval", "setTimeout", "clearInterval", "clearTimeout", "Timer", "ScheduledExecutorService", "schedule", "periodic", "cron", "tick"] -->

- [ ] __setInterval without clear__: flag `setInterval` or `setTimeout` without corresponding `clearInterval` / `clearTimeout` in cleanup -- timers keep their callback alive, preventing GC of captured scope
- [ ] __Scheduled task not cancelled__: flag `ScheduledExecutorService.schedule()`, `Timer.schedule()`, or framework-specific periodic tasks without cancellation on shutdown or scope exit

### Static and Global Collection Growth
<!-- activation: keywords=["static", "global", "singleton", "module-level", "class-level", "companion", "shared", "Map", "HashMap", "List", "Set", "dict", "cache", "registry", "store"] -->

- [ ] __Unbounded static collection__: flag static or module-level collections (static Map, global dict, class-level List) that add entries during runtime without ever removing them -- this is a memory leak by accumulation
- [ ] __Thread-local in thread pool__: flag `ThreadLocal` variables populated in servlets, request handlers, or async tasks running on a thread pool -- pool threads are reused, so thread-local values accumulate and are never GC'd unless explicitly removed

### Finalizer and Destructor Abuse
<!-- activation: keywords=["finalize", "finalizer", "__del__", "destructor", "weak", "WeakReference", "SoftReference", "PhantomReference", "prevent_gc"] -->

- [ ] __Finalizer with side effects__: flag `finalize()` (Java), `__del__` (Python), or destructor implementations that perform I/O, acquire locks, or do complex work -- finalizers run on GC threads with no ordering guarantee; they delay collection and can cause deadlocks
- [ ] __Weak reference for caching__: flag `WeakReference` or `SoftReference` used as a caching mechanism without understanding that the GC can clear them at any time -- this creates unpredictable cache eviction; use a proper cache with explicit eviction

### Resource Disposal
<!-- activation: keywords=["Disposable", "dispose", "close", "AutoCloseable", "Closeable", "using", "try-with-resources", "context manager", "with ", "defer", "finally"] -->

- [ ] __Resource not closed__: flag `AutoCloseable`, `Closeable`, `IDisposable` resources (streams, connections, file handles) opened without try-with-resources, using statement, context manager, or defer -- leaked handles exhaust OS resources
- [ ] __Dispose not called in error path__: flag disposal that happens only on the happy path; errors or exceptions skip the cleanup -- use finally, defer, or RAII patterns to ensure cleanup regardless of exit path

## Common False Positives

- __Application-lifetime singletons__: static collections populated once at startup with bounded configuration data are not leaks. Flag only when new entries are added during runtime.
- __Framework-managed lifecycle__: many frameworks (Spring, Angular, React class components) manage listener lifecycle automatically. Verify the component lifecycle before flagging missing removal.
- __Intentional global state__: some architectures use global registries by design (plugin systems, service locators). Flag only when entries accumulate without bounds.
- __WeakHashMap in Java__: WeakHashMap correctly evicts entries when keys are GC'd. Do not flag as a leak unless the keys are kept alive by other references.

## Severity Guidance

| Finding | Severity |
|---|---|
| Unbounded static collection growing with request/event data | Critical |
| Event listener registered in loop or per-request with no removal | Critical |
| Resource (stream, connection) not closed in error path | Critical |
| setInterval without clearInterval in component lifecycle | Important |
| Observable subscribe without unsubscribe in teardown | Important |
| ThreadLocal not removed after use in thread-pool context | Important |
| Finalizer performing I/O or acquiring locks | Important |
| useEffect without cleanup for timer or subscription | Important |
| WeakReference used as ad-hoc cache mechanism | Minor |
| Large allocation in hot path causing LOH pressure (.NET) | Minor |

## See Also

- `perf-hot-path-allocations` -- allocation pressure in loops causes GC pressure covered here
- `perf-caching-strategy` -- unbounded caches are both a caching problem and a memory leak
- `principle-fail-fast` -- resource leaks manifest late; fail-fast patterns (try-with-resources, RAII) catch them early
- `antipattern-exception-swallowing` -- swallowed exceptions often skip cleanup code, causing leaks

## Authoritative References

- [Oracle, "Java Garbage Collection Tuning Guide" -- understanding GC behavior, generations, and large objects](https://docs.oracle.com/en/java/javase/21/gctuning/)
- [Chrome DevTools, "Fix Memory Problems" -- heap snapshots and allocation timeline for JavaScript memory leaks](https://developer.chrome.com/docs/devtools/memory-problems/)
- [Microsoft, ".NET Memory Management" -- Large Object Heap, generations, and Disposable pattern](https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/)
- [Brendan Gregg, *Systems Performance*, 2nd ed. (2020), Chapter 7: "Memory" -- memory profiling methodology](https://www.brendangregg.com/systems-performance-2nd-edition-book.html)
