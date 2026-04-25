---
id: lang-swift
type: primary
depth_role: leaf
focus: Catch Swift-specific bugs, memory management issues, concurrency errors, and protocol misuse in diffs
parents:
  - index.md
covers:
  - Optional handling — force unwrap, pyramid of doom, nil coalescing
  - Value vs reference type semantics and unintended sharing
  - ARC retain cycles from strong reference closures
  - Protocol-oriented design and existential container overhead
  - "Swift concurrency — async/await, actors, Sendable"
  - "@MainActor annotation and main-thread-only API access"
  - Copy-on-write semantics for value types with reference storage
  - KeyPath type safety and performance
  - Codable conformance correctness
  - "Access control (internal by default) and module boundaries"
  - Error handling with typed throws and Result
tags:
  - swift
  - ios
  - macos
  - concurrency
  - actors
  - arc
  - protocols
  - swiftui
activation:
  file_globs:
    - "**/*.swift"
    - "**/Package.swift"
  structural_signals:
    - Swift source files in diff
    - Swift Package Manager manifest changed
    - Xcode project Swift files modified
source:
  origin: file
  path: lang-swift.md
  hash: "sha256:76cf905ac421609aa15a224d8b0cae370109cd8034a6100f8ed870ebb35e247f"
---
# Swift Quality Reviewer

## When This Activates

Activates when the diff contains `.swift` files or when `Package.swift` is modified. Covers iOS, macOS, server-side Swift, and Swift Package Manager projects.

## Audit Surface

- [ ] No force unwrap (`!`) without a preceding `guard` or invariant proof
- [ ] Closures capturing `self` use `[weak self]` or `[unowned self]` to prevent retain cycles
- [ ] Types crossing actor boundaries conform to `Sendable`
- [ ] `@MainActor` applied to UI-updating code — no background UIKit/SwiftUI calls
- [ ] `async` functions do not bridge back to sync with semaphores or `DispatchQueue.sync`
- [ ] Value types with reference-type stored properties implement CoW correctly
- [ ] `any Protocol` existentials replaced with generics (`<T: Protocol>`) where performance matters
- [ ] `guard let` preferred over nested `if let` for early returns
- [ ] No `T!` implicitly unwrapped optionals in new code without IBOutlet justification
- [ ] Error handling uses do-catch with specific error types, not catch-all
- [ ] `Codable` types handle missing/extra keys gracefully
- [ ] No data races — strict concurrency checking passes clean
- [ ] Access control is intentional — `public` and `open` only on true API surface

## Detailed Checks

### Optionals and Unwrapping
<!-- activation: keywords=["optional", "nil", "guard", "if let", "unwrap", "Optional"] -->

- [ ] Force unwrap (`!`) is justified — the value is provably non-nil at that point
- [ ] `guard let` / `guard case` used for early exits, not nested `if let`
- [ ] `Optional.map` / `flatMap` used for optional chaining transforms
- [ ] Nil coalescing (`??`) default values are sensible, not hiding bugs
- [ ] `Optional<Optional<T>>` (double optional) is intentional, not an accident
- [ ] `switch` on optionals handles `.none` case explicitly
- [ ] No implicitly unwrapped optionals (`T!`) except for IBOutlets and truly late-initialized stored properties
- [ ] `as?` preferred over `as!` for conditional downcasting

### Memory Management and ARC
<!-- activation: keywords=["weak", "unowned", "retain", "cycle", "deinit", "self", "closure", "ARC"] -->

- [ ] Closures stored as properties capture `[weak self]` — especially in long-lived objects
- [ ] `[unowned self]` used only when the closure's lifetime is strictly shorter than `self`
- [ ] Delegate properties are `weak` to prevent retain cycles
- [ ] `deinit` is not relied upon for critical cleanup in concurrent code (timing is non-deterministic)
- [ ] No strong reference cycles between parent and child objects
- [ ] Closure capture lists capture only needed variables, not entire `self` unnecessarily
- [ ] Notification observers are removed in `deinit` or use token-based API
- [ ] `autoreleasepool` used in tight loops creating many temporary Objective-C objects

### Swift Concurrency
<!-- activation: keywords=["async", "await", "actor", "Task", "Sendable", "@MainActor", "nonisolated", "AsyncSequence"] -->

- [ ] `@Sendable` closures do not capture mutable state without actor isolation
- [ ] `actor` types have no public mutable properties (external access is async)
- [ ] `nonisolated` on actor methods only when the method accesses no mutable state
- [ ] `Task { }` is not used as a fire-and-forget escape hatch — handle errors
- [ ] `Task.detached` is justified — inheriting actor context via `Task { }` is usually correct
- [ ] `AsyncSequence` / `AsyncStream` used for asynchronous iteration, not callback adapters
- [ ] `withCheckedContinuation` / `withCheckedThrowingContinuation` resumes exactly once
- [ ] Structured concurrency (`TaskGroup`, `async let`) preferred over unstructured `Task { }`
- [ ] `@MainActor` inherited through class hierarchy — child classes honor parent's isolation
- [ ] No blocking calls (`Thread.sleep`, `DispatchSemaphore.wait`) in async context

### Value vs Reference Types
<!-- activation: keywords=["struct", "class", "enum", "value type", "reference", "mutating", "inout"] -->

- [ ] `struct` used by default; `class` only when identity or inheritance is needed
- [ ] `mutating` methods on structs clearly communicate intent to modify
- [ ] `inout` parameters are justified — not used to simulate reference semantics
- [ ] Copy-on-write implemented with `isKnownUniquelyReferenced` for structs wrapping reference storage
- [ ] Enums with associated values use `Equatable`/`Hashable` synthesis where possible
- [ ] No large structs passed by value in hot loops — consider passing by reference or refactoring
- [ ] `class` types that should not be subclassed are marked `final`

### Protocol-Oriented Design
<!-- activation: keywords=["protocol", "Protocol", "extension", "default implementation", "associatedtype", "existential", "any ", "some "] -->

- [ ] Protocols are focused — small number of requirements, single responsibility
- [ ] Default implementations in protocol extensions are intentional and documented
- [ ] `some Protocol` (opaque types) preferred over `any Protocol` (existential) for return types
- [ ] Protocol with `associatedtype` cannot be used as existential — use generics or type erasure
- [ ] `@objc` protocol conformance required only for Objective-C interop patterns
- [ ] Protocol composition (`P1 & P2`) used instead of mega-protocols
- [ ] `where` clauses on protocol extensions are correct and do not create ambiguous dispatch

### Error Handling
<!-- activation: keywords=["throw", "catch", "Error", "Result", "do ", "try"] -->

- [ ] `do/catch` catches specific error types, not a bare `catch` for all
- [ ] `try?` is used only when nil is an acceptable replacement for any error
- [ ] `try!` is justified with a comment explaining why the call cannot fail
- [ ] Custom error types conform to `Error` and provide meaningful descriptions
- [ ] `Result<Success, Failure>` used at API boundaries for callback-based error handling
- [ ] Error cases are exhaustive — no silent swallowing of unknown error variants
- [ ] Typed throws (Swift 6+) used where the error type is known and limited

### Codable and Serialization
<!-- activation: keywords=["Codable", "Decodable", "Encodable", "CodingKeys", "JSON", "decode", "encode"] -->

- [ ] `CodingKeys` enum covers all properties — no accidental exclusions
- [ ] Optional properties handle missing keys gracefully (default `nil`)
- [ ] Custom `init(from: Decoder)` validates data ranges and formats
- [ ] Date decoding strategy is explicit (`.iso8601`, `.secondsSince1970`, custom)
- [ ] Nested container decoding is tested with malformed input
- [ ] `@CodableIgnored` or manual `CodingKeys` used to exclude computed/transient properties
- [ ] JSON key strategy (`convertFromSnakeCase`) matches the API contract

### Performance and Build
<!-- activation: keywords=["performance", "@inlinable", "lazy", "Collection", "Sequence", "compile"] -->

- [ ] `lazy` sequences used for chained transforms that do not need full materialization
- [ ] `@inlinable` used judiciously in library code — commits to ABI stability
- [ ] `ContiguousArray` used instead of `Array` when Element is not a class/protocol
- [ ] `reserveCapacity` called on collections with known final size
- [ ] Computed properties that are expensive cache their result or use `lazy var`
- [ ] No unnecessary `String(describing:)` or string interpolation in logging that may be disabled
- [ ] `Set` used for membership testing instead of `Array.contains`

## Common False Positives

- **Force unwrap in tests**: `XCTUnwrap` is preferred, but `!` in test assertions is lower risk
- **`[weak self]` in short-lived closures**: completion handlers that execute once and are released do not create retain cycles
- **`@MainActor` on entire class**: applying `@MainActor` to a view model class is standard SwiftUI practice, not over-annotation
- **`any Protocol` in older codebases**: pre-Swift 5.7 code does not have `any` syntax; flagging it in unchanged code is noise
- **`class` for reference semantics**: view models, services, and coordinators legitimately require reference semantics
- **`try!` for static resources**: loading a bundled JSON or image that is guaranteed to exist at compile time

## Severity Guidance

| Finding | Severity |
|---|---|
| Data race — shared mutable state across actors without Sendable | Critical |
| Retain cycle causing memory leak | Critical |
| Force unwrap on user input or network data | Critical |
| UI update from background thread | Critical |
| Missing `[weak self]` in stored closure | Important |
| `Task { }` fire-and-forget with no error handling | Important |
| Blocking call in async context | Important |
| `any Protocol` where generic would avoid existential overhead | Important |
| Missing Codable validation on external data | Important |
| Force unwrap with known invariant but no comment | Minor |
| `if let` nesting where `guard let` is cleaner | Minor |
| Missing `final` on class not designed for subclassing | Minor |
| Non-exhaustive `catch` with acceptable fallback | Minor |

## See Also

- `security-general` — language-agnostic security review
- `testing-quality` — test structure and coverage patterns
- `concurrency-review` — deep concurrency analysis across languages

## Authoritative References

- [The Swift Programming Language](https://docs.swift.org/swift-book/)
- [Swift Evolution Proposals](https://github.com/swiftlang/swift-evolution)
- [Swift Concurrency Manifesto](https://gist.github.com/lattner/31ed37682ef1576b16bca1432ea9f782)
- [WWDC — Eliminate Data Races Using Swift Concurrency](https://developer.apple.com/videos/play/wwdc2022/110351/)
- [Swift API Design Guidelines](https://www.swift.org/documentation/api-design-guidelines/)
- [SwiftLint Rules](https://realm.github.io/SwiftLint/rule-directory.html)
