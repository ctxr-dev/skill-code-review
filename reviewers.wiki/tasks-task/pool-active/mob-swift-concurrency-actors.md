---
id: mob-swift-concurrency-actors
type: primary
depth_role: leaf
focus: Detect data races from actor reentrancy, MainActor blocking, uncancelled Tasks, missing Sendable conformance, and structured concurrency violations in Swift concurrency.
parents:
  - index.md
covers:
  - Actor reentrancy causing unexpected state between await points
  - "Blocking work on @MainActor freezing the UI"
  - Task created but never cancelled on scope exit
  - Non-Sendable type crossing actor boundary
  - Unstructured Task.init or Task.detached without justification
  - "Missing try/catch around throwing async calls"
  - "Async let not awaited (value silently discarded)"
  - withCheckedContinuation resumed more than once or never
  - Actor-isolated property accessed from nonisolated context
  - Priority inversion from low-priority task holding actor
tags:
  - swift-concurrency
  - async-await
  - actor
  - sendable
  - mainactor
  - task
  - structured-concurrency
  - data-race
  - ios
  - apple
activation:
  file_globs:
    - "**/*.swift"
  keyword_matches:
    - async
    - await
    - actor
    - Actor
    - "@MainActor"
    - "@Sendable"
    - Sendable
    - Task
    - Task.detached
    - TaskGroup
    - withTaskGroup
    - async let
    - withCheckedContinuation
    - withUnsafeContinuation
    - nonisolated
    - isolated
  structural_signals:
    - actor_reentrancy
    - main_actor_blocking
    - task_not_cancelled
    - non_sendable_crossing
source:
  origin: file
  path: mob-swift-concurrency-actors.md
  hash: "sha256:64a59ec700f03f86bc67982c3ccdd11637d1f1dfe2b383c3953a177f212b2e0d"
---
# Swift Concurrency and Actors

## When This Activates

Activates on diffs introducing async/await, actors, @MainActor annotations, Task creation, Sendable types, or continuations. Swift concurrency provides compile-time data race safety through actor isolation and Sendable checking, but the compiler's checking is gradual (strict concurrency is opt-in until Swift 6). Actor reentrancy, continuation misuse, and MainActor blocking are runtime bugs that the compiler does not catch. This reviewer detects concurrency patterns that are syntactically valid but semantically dangerous.

## Audit Surface

- [ ] Actor method with multiple await points and mutable state reads between them
- [ ] @MainActor function performing synchronous heavy computation or blocking I/O
- [ ] Task { } created in viewDidLoad/onAppear without cancellation in deinit/onDisappear
- [ ] Non-Sendable class passed across actor boundary or to Task closure
- [ ] Task.init or Task.detached used instead of async let or TaskGroup
- [ ] Throwing async function called without try or do/catch
- [ ] async let result never awaited (implicitly cancelled and discarded)
- [ ] withCheckedContinuation with code path that never calls resume
- [ ] withCheckedContinuation with code path that calls resume twice
- [ ] Nonisolated access to actor-isolated property without await
- [ ] Long-running computation inside actor (blocks other callers)
- [ ] Task.sleep used for real delays instead of Clock.sleep

## Detailed Checks

### Actor Reentrancy
<!-- activation: keywords=["actor", "await", "self.", "state", "mutate", "reentrancy", "suspension", "interleave"] -->

- [ ] **State read after await**: flag actor methods that read mutable state, await an async call, then use the previously read value -- another caller may have mutated the state during the suspension point
- [ ] **Check-then-act across await**: flag patterns like `if self.cache[key] == nil { self.cache[key] = await fetch(key) }` -- between the nil check and the assignment, another caller may have populated the cache, causing duplicate work or inconsistency
- [ ] **Assumption of atomicity**: flag actor methods that assume multiple await calls execute atomically -- each await is a potential interleaving point where other actor methods can run
- [ ] **Long computation in actor**: flag CPU-intensive synchronous work inside an actor method -- it blocks all other callers of that actor until complete; offload to a detached task or nonisolated function

### MainActor Blocking
<!-- activation: keywords=["@MainActor", "MainActor", "DispatchQueue.main", "main", "UI", "blocking", "synchronous", "sleep", "Thread.sleep"] -->

- [ ] **Heavy work on MainActor**: flag `@MainActor` functions or classes that perform CPU-intensive computation (parsing, sorting large collections, image processing) -- the main actor is the UI thread; blocking it freezes the interface
- [ ] **Blocking I/O on MainActor**: flag synchronous file reads, network calls, or database queries in @MainActor context -- use async alternatives or move to a nonisolated context
- [ ] **Thread.sleep on MainActor**: flag `Thread.sleep` or `usleep` in @MainActor context -- use `try await Task.sleep` which suspends without blocking

### Task Lifecycle
<!-- activation: keywords=["Task", "Task {", "Task.detached", "Task.init", "cancel", "isCancelled", "checkCancellation", "onDisappear", "deinit", "viewWillDisappear"] -->

- [ ] **Unstructured Task without cancellation**: flag `Task { }` created in `viewDidLoad`, `onAppear`, or `init` without storing the task handle and calling `.cancel()` in the corresponding cleanup (deinit, onDisappear) -- the task continues after the view is gone
- [ ] **Task.detached without justification**: flag `Task.detached` used to escape actor isolation when the work should remain on the actor -- detached tasks lose the parent's priority, actor context, and cancellation; prefer `Task { }` or structured concurrency
- [ ] **Missing Task.checkCancellation**: flag long-running async loops that do not call `try Task.checkCancellation()` or check `Task.isCancelled` -- the task ignores cancellation
- [ ] **async let not awaited**: flag `async let result = someFunc()` where `result` is never awaited -- the child task is implicitly cancelled on scope exit, silently discarding work and errors

### Sendable Conformance
<!-- activation: keywords=["Sendable", "@Sendable", "nonisolated", "sending", "transfer", "actor", "Task", "closure"] -->

- [ ] **Non-Sendable type crossing boundary**: flag class instances, mutable structs with reference-type properties, or closures capturing mutable state that cross actor boundaries -- this is a data race in Swift 6 strict mode
- [ ] **Missing @Sendable on closure**: flag closures passed to `Task { }`, `Task.detached { }`, or across actor boundaries that are not marked @Sendable -- the closure may capture non-Sendable state
- [ ] **Sendable conformance on mutable class**: flag `class Foo: Sendable` where the class has mutable stored properties without synchronization -- Sendable on a class requires immutability or internal locking

### Continuations
<!-- activation: keywords=["withCheckedContinuation", "withUnsafeContinuation", "withCheckedThrowingContinuation", "resume", "continuation"] -->

- [ ] **Continuation never resumed**: flag code paths in `withCheckedContinuation` or `withCheckedThrowingContinuation` where the continuation is not called -- the caller hangs indefinitely
- [ ] **Continuation resumed twice**: flag code paths where `resume` is called more than once (e.g., in both success and error branches without mutual exclusion) -- double resume crashes at runtime with checked continuations
- [ ] **Unsafe continuation used unnecessarily**: flag `withUnsafeContinuation` when `withCheckedContinuation` would work -- checked continuations detect double-resume and never-resume at runtime with a clear error

## Common False Positives

- **Intentional actor reentrancy**: some actor methods are designed to be reentrant and handle the interleaving correctly (e.g., idempotent cache population). Verify before flagging.
- **@MainActor for coordination only**: lightweight @MainActor methods that only update a few UI properties are not blocking the main thread. Flag only heavy computation.
- **Task in SwiftUI .task modifier**: SwiftUI's `.task` modifier automatically cancels the task on view disappear. Do not flag missing cancellation if the task is started via `.task`.
- **Sendable warnings in pre-Swift 6**: many projects have not adopted strict concurrency. Sendable warnings may be intentionally deferred. Still flag as advisory.

## Severity Guidance

| Finding | Severity |
|---|---|
| Continuation never resumed (caller hangs forever) | Critical |
| Continuation resumed twice (runtime crash) | Critical |
| Actor reentrancy with stale state after await | Critical |
| Non-Sendable type crossing actor boundary (data race) | Important |
| MainActor blocked by heavy synchronous computation | Important |
| Task created without cancellation on scope exit | Important |
| async let result never awaited | Important |
| Task.detached used without justification | Minor |
| Missing Task.checkCancellation in long loop | Minor |
| Unsafe continuation used where checked would suffice | Minor |

## See Also

- `mob-swiftui` -- SwiftUI .task modifier provides structured concurrency for views
- `mob-combine-reactive` -- bridging Combine publishers to async/await via AsyncSequence
- `conc-async-cancellation` -- Swift Task cancellation is cooperative and follows these patterns
- `conc-structured-concurrency` -- TaskGroup and async let are Swift's structured concurrency primitives
- `principle-fail-fast` -- continuation misuse hangs instead of failing fast

## Authoritative References

- [Apple, "Swift Concurrency" -- async/await, actors, and structured concurrency](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/concurrency/)
- [Apple, "Sendable and Actor Isolation" -- data race safety model](https://developer.apple.com/documentation/swift/sendable)
- [Swift Evolution, "SE-0306: Actors" -- actor reentrancy design rationale](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0306-actors.md)
- [Apple, "Migrating to Swift 6" -- strict concurrency checking adoption guide](https://www.swift.org/migration/documentation/migrationguide/)
