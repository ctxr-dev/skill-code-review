---
id: pattern-observer
type: primary
depth_role: leaf
focus: Detect misuse, over-application, and absence of the Observer pattern in event-driven notification code.
parents:
  - index.md
covers:
  - Memory leaks from observers that subscribe but never unsubscribe
  - Notification order dependencies where observers assume a specific dispatch sequence
  - Observers with side effects that modify the subject during notification
  - "Missing thread safety in subject's observer list for concurrent subscribe/notify"
  - "Event storms from cascading notifications (observer triggers another notify)"
  - Missing observer pattern where polling is used instead of push notification
  - Observer that throws exceptions disrupting notification to remaining observers
  - Subject holding strong references to short-lived observers preventing garbage collection
  - Overly broad event subscriptions where observer receives notifications it ignores
  - Subject with no observers still performing expensive computation to prepare notifications
tags:
  - observer
  - behavioral-pattern
  - design-patterns
  - event
  - listener
  - subscribe
  - publish
  - notification
  - callback
activation:
  file_globs:
    - "**/*.{java,kt,scala,cs,ts,js,py,rb,go,rs,swift,cpp,h,hpp,php}"
  keyword_matches:
    - Observer
    - listener
    - subscribe
    - unsubscribe
    - on
    - off
    - emit
    - event
    - notify
    - publish
    - callback
    - EventEmitter
    - addEventListener
    - watch
    - signal
  structural_signals:
    - class_with_list_of_callbacks_or_listeners
    - method_iterating_listener_list_calling_update
    - subscribe_without_matching_unsubscribe
source:
  origin: file
  path: pattern-observer.md
  hash: "sha256:238147ab8049f5b6c74eeda1676e8d9dbc18cbe778554b1063eb431384f12980"
---
# Observer Pattern

## When This Activates

Activates when diffs introduce event subscription mechanisms (addEventListener, on/off, subscribe/unsubscribe, EventEmitter), add notification dispatch loops over listener collections, implement callback registration for state change monitoring, or use reactive streams or signals. The Observer pattern decouples subjects from their dependents, but it introduces subtle correctness risks: memory leaks from orphaned subscriptions, cascading notification storms, re-entrant modification of the subject during dispatch, and thread-safety gaps in the observer list.

## Audit Surface

- [ ] Every subscribe/on/addEventListener has a corresponding unsubscribe/off/removeEventListener on the appropriate lifecycle boundary
- [ ] Notification loop iterates over a snapshot or copy of the observer list, not the live collection
- [ ] No observer modifies the subject's state inside its update/notify callback
- [ ] Subject's observer list is thread-safe if subscribe, unsubscribe, or notify can be called from multiple threads
- [ ] No cascading notification chains exist where observer A's reaction triggers observer B's notification
- [ ] Push-based notification is used instead of polling when the source supports subscription
- [ ] A single observer throwing an exception does not prevent remaining observers from being notified
- [ ] Subject uses weak references or explicit lifecycle management to avoid retaining dead observers
- [ ] Observers subscribe only to the specific events they need, not to overly broad event types
- [ ] Subject skips expensive payload computation when the observer list is empty
- [ ] Duplicate subscriptions are either prevented or explicitly tolerated and documented
- [ ] Notification delivers a consistent snapshot of subject state, not a partially-updated view
- [ ] Anonymous closures or lambdas used as listeners can be identified and removed
- [ ] No reference cycles between subject and observer prevent garbage collection
- [ ] Observer registration and deregistration are idempotent (double-subscribe or double-unsubscribe do not corrupt state)

## Detailed Checks

### Memory Leaks from Missing Unsubscribe
<!-- activation: keywords=["subscribe", "unsubscribe", "addEventListener", "removeEventListener", "on", "off", "dispose", "destroy", "cleanup", "teardown", "componentWillUnmount", "onDestroy", "ngOnDestroy"] -->

- [ ] **Subscribe without unsubscribe**: observer registers in `init`/`constructor`/`componentDidMount` but no teardown method calls the corresponding unsubscribe -- the subject accumulates dead observers
- [ ] **Anonymous listener cannot be removed**: `emitter.on('event', () => { ... })` creates an anonymous function with no handle for removal -- store the reference for later `off()` calls
- [ ] **Subscription in loop**: observer subscribes inside a loop or repeated call path without checking for existing subscription -- each iteration adds a duplicate listener
- [ ] **Framework lifecycle mismatch**: observer subscribes in a framework hook that runs more often than the cleanup hook (e.g., React `useEffect` without cleanup return, Angular component subscribing in `ngOnChanges` but unsubscribing in `ngOnDestroy`)
- [ ] **Closure captures large scope**: listener closure captures a reference to a large object (component tree, request context), preventing its garbage collection for the lifetime of the subject
- [ ] **WeakRef not used for optional observers**: long-lived subjects (global event bus, singleton service) hold strong references to short-lived observers (UI components, request handlers) -- use WeakRef, WeakSet, or framework-provided weak subscription

### Re-entrant Notification and Subject Mutation
<!-- activation: keywords=["notify", "emit", "update", "callback", "handler", "onChange", "dispatch", "trigger", "fire", "setState"] -->

- [ ] **Observer mutates subject**: observer's update callback calls a setter on the subject, triggering `notify()` while the current notification loop is still running -- infinite loop or inconsistent state
- [ ] **Observer adds/removes observers**: observer's callback subscribes a new observer or unsubscribes itself during notification iteration -- concurrent modification of the observer list
- [ ] **Notification during construction**: subject calls `notify()` from its constructor before all observers have had a chance to subscribe -- observers miss the initial state change
- [ ] **Inconsistent state snapshot**: subject notifies observers between two related state changes (e.g., updates `width` and notifies before updating `height`), delivering a partially-updated state
- [ ] **Guard against re-entrancy missing**: no flag or queue prevents nested `notify()` calls from executing immediately -- consider deferring nested notifications to after the current dispatch completes

### Event Storms and Cascading Notifications
<!-- activation: keywords=["cascade", "chain", "storm", "flood", "loop", "cycle", "recursive", "propagate", "bubble", "ripple"] -->

- [ ] **Notification cascade**: observer A handles an event by modifying state that triggers observer B, which modifies state that triggers observer C, creating an unpredictable execution chain
- [ ] **Bidirectional binding loop**: two subjects observe each other; a change in one triggers an update in the other, which triggers an update back -- infinite cycle without a termination guard
- [ ] **Exponential fan-out**: subject with N observers, each of which triggers M sub-notifications -- total handlers invoked grows exponentially per event
- [ ] **Missing debounce/throttle**: rapid state changes each trigger a full notification cycle -- consider batching or coalescing notifications (e.g., React's batched state updates, requestAnimationFrame coalescing)
- [ ] **No maximum cascade depth**: cascading notifications have no depth limit -- add a re-entrancy counter and throw or log when exceeded

### Thread Safety of Observer List
<!-- activation: keywords=["thread", "concurrent", "synchronized", "lock", "mutex", "atomic", "volatile", "CopyOnWriteArrayList", "ConcurrentHashMap", "race", "async"] -->

- [ ] **Unsynchronized list**: subject's observer list is an `ArrayList`, `list`, or plain array modified by `subscribe`/`unsubscribe` from one thread and iterated by `notify` from another -- use CopyOnWriteArrayList, synchronized block, or lock
- [ ] **Iterator invalidation**: `notify()` iterates the observer list while another thread calls `subscribe()` -- ConcurrentModificationException or skipped/duplicated notifications
- [ ] **Async notify with stale snapshot**: `notify()` captures the observer list and dispatches asynchronously, but an observer unsubscribed between capture and delivery still receives the notification
- [ ] **Lock ordering deadlock**: subject lock acquired during `notify()`, and an observer's callback tries to acquire the same lock (e.g., calling `unsubscribe` from within the callback) -- deadlock
- [ ] **Atomic publish of multi-field state**: subject updates multiple fields and then notifies, but without memory barriers, observers on other threads may see partially-updated state

### Missing Observer (Polling Anti-Pattern)
<!-- activation: keywords=["poll", "timer", "setInterval", "setTimeout", "cron", "schedule", "check", "loop", "sleep", "wait", "busy"] -->

- [ ] **Timer-based polling**: code polls a resource on a fixed interval (`setInterval`, `Timer`, `ScheduledExecutor`) when the resource supports event-based notification -- wastes CPU and introduces latency equal to half the polling interval
- [ ] **Busy-wait loop**: thread sits in a `while(!changed) { sleep(N); }` loop checking for state changes -- replace with condition variable, event, or observer subscription
- [ ] **Database polling**: application queries a table for changes on a timer when the database supports change data capture, triggers, or LISTEN/NOTIFY -- observer pattern eliminates polling overhead
- [ ] **File system polling**: code checks file modification timestamps in a loop when OS-level file watchers (inotify, FSEvents, kqueue) are available

### Over-Applied Observer
<!-- activation: keywords=["Observer", "EventEmitter", "event", "listener", "bus", "pubsub", "signal"] -->

- [ ] **Single observer on a dedicated subject**: a full Observer pattern (subject interface, observer interface, registration, notification) is implemented for exactly one observer that never changes -- a direct method call is simpler
- [ ] **Global event bus for local communication**: two co-located components communicate through a global event bus instead of a direct reference or callback parameter -- adds indirection without benefit
- [ ] **Event-driven spaghetti**: critical control flow is routed through a chain of events, making the execution path impossible to trace in a debugger -- consider direct calls for core business logic and reserve events for cross-cutting concerns

## Common False Positives

- **Framework event systems**: React `useEffect` subscriptions, Angular `@Output()` EventEmitter, Vue `$emit`, Svelte stores, and similar framework-native event systems are idiomatic. Flag only when lifecycle management (unsubscribe) is missing.
- **DOM event listeners**: `addEventListener`/`removeEventListener` on DOM elements is the standard browser API. Flag only when removal is missing and the element outlives the handler's intended scope.
- **Reactive streams (RxJS, Reactor, Akka Streams)**: these libraries build on the observer concept with structured lifecycle (dispose, cancel, complete). Flag only when subscriptions leak or error handling is missing.
- **Message broker consumers**: Kafka, RabbitMQ, or SQS consumers are subscription-based by nature. Do not flag as "over-applied observer."
- **Signal/slot mechanisms**: Qt signals/slots, Godot signals, and similar engine-level mechanisms are framework-native observer implementations. Flag only for missing disconnections.

## Severity Guidance

| Finding | Severity |
|---|---|
| Memory leak: subscribe without unsubscribe in long-lived subject | high |
| Re-entrant notification causing infinite loop or stack overflow | high |
| Unsynchronized observer list in concurrent code causing race conditions | high |
| Observer mutates subject during notification, corrupting state | high |
| Cascading notification storm with no depth limit | medium |
| Exception in one observer prevents remaining observers from being notified | medium |
| Anonymous listener that cannot be unsubscribed in a component with finite lifecycle | medium |
| Polling used where event-based notification is available and straightforward | medium |
| Partially-updated subject state visible to observers during notification | medium |
| Full observer pattern for a single, never-changing observer | low |
| Missing empty-list check before expensive notification payload computation | low |
| Duplicate subscription producing duplicate handler invocations | low |

## See Also

- `principle-coupling-cohesion` -- the observer pattern reduces coupling between subject and observers; misuse (observer modifying subject) reintroduces tight coupling
- `principle-separation-of-concerns` -- observers should handle their concern only, not reach back into the subject to orchestrate further changes
- `principle-encapsulation` -- subject internals should not leak through the notification payload; observers should not depend on subject implementation details
- `pattern-composite` -- composite subjects (e.g., event bus routing to sub-buses) combine observer with composite; verify both patterns' contracts hold

## Authoritative References

- [Erich Gamma et al., *Design Patterns: Elements of Reusable Object-Oriented Software* (1994), Observer](https://www.oreilly.com/library/view/design-patterns-elements/0201633612/)
- [Robert C. Martin, *Agile Software Development* (2002), Chapter 24: Observer Pattern](https://www.oreilly.com/library/view/agile-software-development/0135974445/)
- [MDN Web Docs, EventTarget.addEventListener](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener)
- [ReactiveX, Observable Contract](https://reactivex.io/documentation/contract.html)
