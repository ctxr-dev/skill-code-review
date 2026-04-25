---
id: mob-combine-reactive
type: primary
depth_role: leaf
focus: Detect missing cancellable storage, publishers not completed, sink without strong self management, scheduler misuse, and incorrect Subject vs Publisher choices in Combine and reactive frameworks.
parents:
  - index.md
covers:
  - AnyCancellable not stored -- subscription immediately cancelled
  - Publisher chain never completes, holding resources indefinitely
  - "sink closure capturing self strongly without [weak self]"
  - Subscriber receiving values on background scheduler without switching to main for UI
  - "Subject used where a computed publisher (map, combineLatest) suffices"
  - PassthroughSubject exposed publicly instead of erased publisher
  - "assign(to:on:) creating retain cycle with self as root"
  - "Multiple subscriptions to same expensive publisher without share()"
  - Error type mismatch causing setFailureType or mapError boilerplate
  - "Combine chain without error handling (sink receives completion with error)"
tags:
  - combine
  - reactive
  - rxswift
  - publisher
  - subscriber
  - cancellable
  - scheduler
  - ios
  - apple
  - reactive-programming
activation:
  file_globs:
    - "**/*.swift"
  keyword_matches:
    - Combine
    - import Combine
    - AnyCancellable
    - Publisher
    - Subscriber
    - sink
    - assign
    - PassthroughSubject
    - CurrentValueSubject
    - "receive(on:"
    - "subscribe(on:"
    - "share()"
    - flatMap
    - map
    - combineLatest
    - merge
    - eraseToAnyPublisher
    - "store(in:"
  structural_signals:
    - cancellable_not_stored
    - sink_strong_self
    - missing_receive_on_main
    - subject_exposed_publicly
source:
  origin: file
  path: mob-combine-reactive.md
  hash: "sha256:4ea58b6c9cae4ce1af5ce61c1a634e33084d490b86b01649fa6c288acc5a6df1"
---
# Combine and Reactive Streams

## When This Activates

Activates on diffs that import Combine, use publisher/subscriber APIs, create Subjects, or manage AnyCancellable storage. Combine's subscription model is resource-based: every subscription holds references along the chain from subscriber back to the publisher. If the cancellable token is dropped, the subscription is cancelled immediately (silently doing nothing). If the cancellable is stored but the closure captures self strongly, the subscription creates a retain cycle. This reviewer catches both failure modes and related scheduler/operator misuse.

## Audit Surface

- [ ] sink() or assign() result not stored in Set<AnyCancellable> or variable
- [ ] Publisher chain without .receive(on: DispatchQueue.main) before UI update
- [ ] sink closure capturing self without [weak self]
- [ ] assign(to:on: self) creating strong reference cycle
- [ ] PassthroughSubject or CurrentValueSubject exposed as public property
- [ ] Expensive publisher (network, database) subscribed multiple times without share()
- [ ] Publisher that never sends completion (infinite stream without cancel)
- [ ] Combine chain with no .catch, .replaceError, or failure handling in sink
- [ ] receive(on:) placed before expensive operators (should be after)
- [ ] Subject.send() called from background thread without synchronization
- [ ] flatMap without maxPublishers limit causing unbounded concurrency
- [ ] store(in: &cancellables) on a set that is cleared too early

## Detailed Checks

### Cancellable Storage
<!-- activation: keywords=["AnyCancellable", "cancellable", "store(in:", "cancel", "sink", "assign", "Set<AnyCancellable>"] -->

- [ ] **Cancellable not stored**: flag `publisher.sink { ... }` where the returned `AnyCancellable` is not assigned to a variable or stored in a `Set<AnyCancellable>` -- the subscription is immediately cancelled and the closure never executes
- [ ] **Cancellable stored in local variable**: flag `let cancellable = publisher.sink { ... }` inside a function body without storing it in a property -- the cancellable is deallocated when the function returns
- [ ] **Cancellables set cleared prematurely**: flag `cancellables.removeAll()` or reassignment of the cancellable set before subscriptions are expected to complete -- all subscriptions are cancelled
- [ ] **assign(to:) vs assign(to:on:)**: flag `assign(to:on: self)` which retains self strongly -- use `assign(to: &$property)` (iOS 14+) which does not create a retain cycle

### Strong Self in Sink and Map
<!-- activation: keywords=["sink", "map", "flatMap", "self", "[weak self]", "[unowned self]", "guard let", "receiveValue", "receiveCompletion"] -->

- [ ] **Sink capturing self strongly**: flag `.sink { self.property = $0 }` or `.sink(receiveValue: { self.update($0) })` without `[weak self]` -- the subscription retains self through the closure, and self retains the cancellable, forming a cycle
- [ ] **Map/flatMap capturing self**: flag `.map { self.transform($0) }` in a chain stored on self -- while intermediate operators do not retain the subscriber, the full chain from sink back to publisher does
- [ ] **Unowned self in long-lived subscription**: flag `[unowned self]` in subscriptions that may outlive the owner -- crashes on access after dealloc

### Scheduler Misuse
<!-- activation: keywords=["receive(on:", "subscribe(on:", "DispatchQueue", "RunLoop", "main", "global", "scheduler", "thread"] -->

- [ ] **UI update on background scheduler**: flag `.sink { self.label.text = $0 }` without `.receive(on: DispatchQueue.main)` before the sink -- UIKit and SwiftUI require main thread for UI updates
- [ ] **receive(on:) before expensive operators**: flag `.receive(on: .main).map { expensiveTransform($0) }` -- the expensive work runs on the main thread; place `receive(on:)` after transformation
- [ ] **subscribe(on:) confusion**: flag `subscribe(on:)` used when `receive(on:)` is intended -- `subscribe(on:)` affects the upstream subscription, not downstream value delivery

### Subject vs Publisher Design
<!-- activation: keywords=["PassthroughSubject", "CurrentValueSubject", "Subject", "eraseToAnyPublisher", "send(", "AnyPublisher", "public", "internal", "private"] -->

- [ ] **Subject exposed publicly**: flag public or internal `PassthroughSubject` or `CurrentValueSubject` properties -- external code can send values, violating encapsulation; expose `.eraseToAnyPublisher()` instead
- [ ] **Subject where operator suffices**: flag `PassthroughSubject` used to bridge when `$property` (Published), `.publisher`, `map`, `combineLatest`, or `NotificationCenter.publisher` provides the same stream declaratively
- [ ] **CurrentValueSubject without initial value consideration**: flag `CurrentValueSubject` where the initial value is a placeholder (empty string, zero) that subscribers incorrectly treat as real data

### Error Handling and Completion
<!-- activation: keywords=["Failure", "Error", "catch", "replaceError", "retry", "setFailureType", "mapError", "completion", ".failure", "Never"] -->

- [ ] **No error handling in sink**: flag `.sink(receiveCompletion: { _ in }, receiveValue: { ... })` where the completion handler ignores `.failure` -- errors are silently swallowed and the stream stops
- [ ] **Missing catch or replaceError**: flag publisher chains with `Failure != Never` that reach `.assign(to:)` without error handling -- `assign` requires `Failure == Never`
- [ ] **flatMap without maxPublishers**: flag `.flatMap { self.networkRequest($0) }` without `.flatMap(maxPublishers: .max(1))` -- each upstream value creates a new subscription; without a limit, rapid upstream values create unbounded concurrent requests

## Common False Positives

- **One-shot publishers**: publishers that complete after a single value (Future, URLSession.dataTaskPublisher) are automatically cleaned up on completion. The cancellable still needs storage to keep the subscription alive until completion.
- **SwiftUI @Published**: SwiftUI manages subscriptions to @Published properties internally. Do not flag missing cancellable storage for SwiftUI view bindings.
- **Intentional fire-and-forget**: some publishers trigger side effects and the caller intentionally discards the cancellable. This is valid only if the publisher is guaranteed to complete quickly.
- **assign(to: &$property)**: the keypathless assign variant (iOS 14+) does not create a retain cycle. Do not flag.

## Severity Guidance

| Finding | Severity |
|---|---|
| Cancellable not stored (subscription immediately cancelled) | Critical |
| assign(to:on: self) creating retain cycle | Critical |
| Sink capturing self strongly without [weak self] | Important |
| UI update without receive(on: .main) | Important |
| flatMap without maxPublishers on network requests | Important |
| Error silently swallowed in sink completion handler | Important |
| PassthroughSubject exposed as public property | Minor |
| receive(on: .main) placed before expensive operator | Minor |
| Subject used where declarative operator suffices | Minor |

## See Also

- `mob-swiftui` -- SwiftUI property wrappers interact with Combine publishers
- `mob-uikit` -- UIKit views need main-thread scheduling for Combine-driven updates
- `conc-async-cancellation` -- Combine cancellation is a form of cooperative cancellation
- `perf-memory-gc` -- uncancelled subscriptions are reference leaks in ARC

## Authoritative References

- [Apple, "Combine Framework" -- publisher, subscriber, and cancellation semantics](https://developer.apple.com/documentation/combine)
- [Apple, "Receiving and Handling Events with Combine" -- practical Combine patterns](https://developer.apple.com/documentation/combine/receiving-and-handling-events-with-combine)
- [Apple, "Processing Published Elements with Subscribers" -- sink and assign lifecycle](https://developer.apple.com/documentation/combine/processing-published-elements-with-subscribers)
