---
id: pattern-active-object
type: primary
depth_role: leaf
focus: Detect misuse, over-application, and absence of the Active Object pattern in asynchronous decoupling code.
parents:
  - index.md
covers:
  - Active object with unbounded request queue leading to memory exhaustion under load
  - Active object that blocks the caller despite being designed for asynchronous execution
  - "Missing error propagation from the active object's worker thread to the caller"
  - Active object without proper shutdown or cleanup, leaving orphan threads
  - Active object scheduler that silently drops requests on queue overflow
  - Missing active object where a thread is manually managed with shared mutable state
  - Active object used for trivially synchronous work, adding unnecessary indirection
  - Active object with no backpressure, allowing producers to overwhelm the internal queue
  - Active object servant that leaks thread-local state across unrelated requests
  - Active object proxy that exposes internal concurrency primitives to callers
  - "Actor/mailbox pattern with no supervision or dead-letter handling for failed messages"
  - Active object holding locks during request processing, negating the decoupling benefit
tags:
  - active-object
  - concurrency-pattern
  - design-patterns
  - actor
  - mailbox
  - async
  - decoupling
activation:
  file_globs:
    - "**/*.{java,kt,scala,cs,ts,js,py,rb,go,rs,swift,cpp,h,hpp,erl,ex,exs}"
  keyword_matches:
    - ActiveObject
    - active object
    - actor
    - mailbox
    - message queue
    - async
    - dispatch
    - scheduler
    - proxy
    - future
    - servant
    - Akka
    - Erlang
    - GenServer
    - channel
  structural_signals:
    - class_with_internal_queue_and_worker_thread
    - actor_message_dispatch
    - proxy_returning_future
source:
  origin: file
  path: pattern-active-object.md
  hash: "sha256:fec757c5af0542197fe0858e2f94bc1c6495a1c0531e8b21deb08a7d2e256530"
---
# Active Object Pattern

## When This Activates

Activates when diffs introduce classes that decouple method invocation from method execution via a private worker thread and request queue, use actor/mailbox patterns (Akka actors, Erlang/Elixir GenServer, Go channel-based workers), return `Future`/`Promise` from proxy methods that schedule work internally, or manually manage a thread with a message loop. The Active Object pattern enables asynchronous execution without exposing threads to callers, but its internal queue, worker lifecycle, and error propagation paths are common sources of production failures.

## Audit Surface

- [ ] Request queue has a bounded capacity with a defined rejection or backpressure policy
- [ ] Callers actually observe the `Future`/`Promise` result -- errors are not silently lost
- [ ] Exceptions thrown in the servant are propagated back to the caller via the `Future`/`Promise`
- [ ] Active object has an explicit shutdown path that drains pending requests before terminating
- [ ] Worker thread is a daemon or is joined on shutdown -- no orphan threads outlive the application
- [ ] Proxy methods are genuinely asynchronous -- they enqueue and return immediately, never blocking
- [ ] Servant object contains no shared mutable state accessed from outside the worker thread
- [ ] Active object is justified: the decoupling it provides is needed, not just ceremonial indirection
- [ ] Thread is not started in a constructor (partially-constructed object escapes to the worker)
- [ ] Actor mailbox handles unrecognized message types with a dead-letter or logging strategy
- [ ] GenServer/actor `call` operations use finite timeouts to prevent caller hangs
- [ ] Channel-based implementations send a close/done signal for graceful termination
- [ ] Active object proxy does not expose the internal queue, scheduler, or synchronization primitives
- [ ] Servant methods that perform I/O use timeouts to avoid blocking the single worker indefinitely
- [ ] Fire-and-forget sends are intentional and documented -- not accidental error suppression

## Detailed Checks

### Queue Capacity and Backpressure
<!-- activation: keywords=["queue", "mailbox", "buffer", "capacity", "bound", "offer", "put", "enqueue", "channel", "backpressure", "overflow"] -->

- [ ] **Unbounded queue**: the active object uses an unbounded queue (`LinkedList`, `chan` without capacity, `LinkedBlockingQueue()` with no size argument) -- under sustained load, producers fill memory until the JVM/process crashes with OOM
- [ ] **Silent drop on overflow**: when the queue is full, the proxy silently discards the request without notifying the caller -- data loss with no visibility
- [ ] **Blocking producer on full queue**: proxy calls `queue.put()` which blocks when full, turning the async pattern into a synchronous bottleneck -- consider `offer()` with timeout and explicit rejection
- [ ] **No monitoring**: queue depth is not observable via metrics or logging -- operators cannot detect backlog growth before OOM
- [ ] **Unbounded Akka mailbox**: actor uses the default unbounded mailbox; under load the mailbox grows until the JVM is killed -- configure a bounded mailbox with a `mailbox-push-timeout-time`

### Error Propagation
<!-- activation: keywords=["future", "promise", "result", "error", "exception", "catch", "fail", "callback", "then", "await", "handle"] -->

- [ ] **Swallowed exception in worker**: the worker thread's run loop catches `Exception`/`Throwable` and logs it but does not propagate it to the caller's `Future` -- the caller hangs or receives a default value
- [ ] **Fire-and-forget without intent**: proxy returns `void` instead of a `Future`, making it impossible for the caller to detect failure -- acceptable only if the operation is truly best-effort
- [ ] **GenServer crash not supervised**: an Erlang/Elixir GenServer crashes on an unhandled message but has no supervisor to restart it -- all subsequent messages to the dead process are lost
- [ ] **Unobserved Task/Promise**: in .NET or JS, the `Task`/`Promise` returned by the active object is never awaited -- unhandled rejections crash the process (Node.js) or silently vanish (.NET)
- [ ] **Partial completion visibility**: a multi-step servant operation fails midway but the caller only sees "failed" with no indication of which steps completed -- important for operations with side effects

### Shutdown and Lifecycle
<!-- activation: keywords=["shutdown", "stop", "close", "terminate", "dispose", "join", "interrupt", "cancel", "drain", "poison", "lifecycle"] -->

- [ ] **No shutdown method**: the active object starts a thread but provides no way to stop it -- on application shutdown the thread runs indefinitely or is killed mid-operation
- [ ] **Shutdown without drain**: shutdown interrupts the worker immediately, discarding all queued requests -- pending work is silently lost
- [ ] **Poison pill missing**: the queue-based shutdown uses a flag checked between dequeues, but a blocking `take()` call means the worker never sees the flag -- use a poison pill (sentinel message) to unblock the take
- [ ] **Thread started in constructor**: the constructor starts the worker thread before the object is fully initialized -- the thread may see a partially-constructed servant or proxy
- [ ] **Orphan thread on exception**: if the active object's constructor throws after starting the thread, the thread is never stopped and leaks
- [ ] **GenServer terminate callback missing**: Erlang/Elixir GenServer does not implement `terminate/2`, so resources held by the process (file handles, connections) are not cleaned up

### Synchronous Disguise
<!-- activation: keywords=["block", "wait", "get", "join", "await", "synchronous", "sync", "result", "blocking"] -->

- [ ] **Blocking proxy method**: proxy method calls `future.get()` immediately after enqueuing, making the call synchronous from the caller's perspective -- the active object adds overhead without benefit
- [ ] **Infinite await**: proxy or caller awaits the result with no timeout -- if the servant hangs, the caller hangs
- [ ] **Sequential chaining**: every call to the active object is immediately awaited before the next one is issued, serializing all work and eliminating any concurrency benefit
- [ ] **Synchronous actor ask**: Akka `ask` pattern with `Await.result()` on the calling thread, blocking a thread pool thread -- defeats the actor model's non-blocking design

### Over-Application
<!-- activation: keywords=["simple", "single", "direct", "overhead", "unnecessary", "wrapper", "indirection"] -->

- [ ] **Single-caller active object**: only one thread ever calls the active object -- the queue and worker thread are pure overhead; a direct method call suffices
- [ ] **Trivial servant**: the servant performs a sub-millisecond computation with no I/O -- the cost of enqueuing, context-switching, and dequeuing exceeds the work itself
- [ ] **Active object wrapping a thread-safe service**: the servant is already thread-safe (immutable, or uses internal synchronization) -- the active object's serialization adds latency without correctness benefit
- [ ] **One-shot active object**: the active object is created, used for a single call, then discarded -- a plain `async`/`await` or `Future.supplyAsync` is simpler and cheaper

## Common False Positives

- **Framework-managed actors**: Akka, Erlang/OTP, and Orleans actors are lifecycle-managed by the runtime. Supervision trees, bounded mailboxes, and dead-letter offices are configured declaratively. Do not flag framework-idiomatic usage unless the configuration is missing.
- **Go channel idiom**: a goroutine reading from a channel is the standard Go concurrency idiom. Flag only if the channel is unbounded (it never is in Go -- channels have a fixed buffer or are unbuffered) or if there is no close signal.
- **Event loop runtimes**: Node.js, Python asyncio, and Tokio use a single-threaded event loop that is structurally an active object. This is runtime infrastructure, not a pattern to flag.
- **Thread pool task submission**: submitting a `Runnable`/`Callable` to an `ExecutorService` is not an active object -- it lacks the dedicated queue-per-object and servant encapsulation. See `pattern-thread-pool` instead.
- **UI thread dispatch**: Android `Handler`/`Looper`, iOS `DispatchQueue.main`, and Swing `invokeLater` are active object implementations managed by the platform. Flag only if error handling or lifecycle management is missing.

## Severity Guidance

| Finding | Severity |
|---|---|
| Unbounded queue with no backpressure in production active object | high |
| Exceptions swallowed in worker thread, caller never informed | high |
| No shutdown path -- worker thread leaks on application termination | high |
| GenServer/actor without supervisor, messages lost on crash | high |
| Thread started in constructor, partially-constructed object escapes | medium |
| Proxy method blocks synchronously, defeating async purpose | medium |
| Fire-and-forget send where errors matter but are unobservable | medium |
| Active object for trivially synchronous, single-caller work | medium |
| GenServer call with infinite timeout | medium |
| Missing queue depth metrics for operational visibility | low |
| Active object wrapping an already thread-safe service | low |
| One-shot active object where async/await suffices | low |

## See Also

- `pattern-thread-pool` -- thread pools execute tasks on shared threads; active objects dedicate a thread to a single object's queue. If work is generic and stateless, a thread pool fits better.
- `pattern-producer-consumer` -- the active object's queue is a single-producer-single-consumer structure; verify the same capacity and shutdown concerns.
- `pattern-observer` -- actors often implement publish/subscribe internally; verify observer registration lifecycle within the actor.
- `principle-encapsulation` -- the active object proxy must encapsulate all concurrency details; exposing the queue or worker breaks the pattern's contract.
- `principle-fail-fast` -- silent queue overflow and swallowed exceptions violate fail-fast; errors must surface to callers.

## Authoritative References

- [R. Greg Lavender and Douglas C. Schmidt, "Active Object: An Object Behavioral Pattern for Concurrent Programming" (PLOPD, 1996)](https://www.dre.vanderbilt.edu/~schmidt/PDF/Active-Objects.pdf)
- [Douglas C. Schmidt et al., *Pattern-Oriented Software Architecture Volume 2: Patterns for Concurrent and Networked Objects* (2000)](https://www.wiley.com/en-us/Pattern+Oriented+Software+Architecture+Volume+2-p-9780471606956)
- [Carl Hewitt, "A Universal Modular ACTOR Formalism for Artificial Intelligence" (1973)](https://dl.acm.org/doi/10.5555/1624775.1624804)
- [Akka Documentation: Actor Model](https://doc.akka.io/docs/akka/current/typed/actors.html)
- [Erlang/OTP Design Principles: GenServer Behaviour](https://www.erlang.org/doc/design_principles/gen_server_concepts.html)
