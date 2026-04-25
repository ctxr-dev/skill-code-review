---
id: main-thread
type: index
depth_role: subcategory
depth: 1
focus: "@Binding passed to child but parent does not own the state; @ObservedObject recreated on parent re-render (should be @StateObject); @State used for reference types instead of @StateObject or @Observable; ARC ownership qualifiers and retain cycle prevention"
parents:
  - "../index.md"
shared_covers: []
entries:
  - id: lang-objective-c
    file: lang-objective-c.md
    type: primary
    focus: Objective-C correctness, ARC memory management, Apple framework idioms, and modern syntax adoption
    tags:
      - objective-c
      - objc
      - ios
      - macos
      - apple
      - arc
      - memory-management
      - cocoa
  - id: mob-kotlin-coroutines-flow
    file: mob-kotlin-coroutines-flow.md
    type: primary
    focus: Detect GlobalScope leaks, missing coroutine cancellation, Flow collection blocking the main thread, StateFlow vs SharedFlow misuse, and uncaught exceptions in launch blocks.
    tags:
      - kotlin
      - coroutines
      - flow
      - stateflow
      - sharedflow
      - globalscope
      - dispatchers
      - structured-concurrency
      - android
      - cancellation
  - id: mob-perf-60fps-battery-network
    file: mob-perf-60fps-battery-network.md
    type: primary
    focus: Detect main thread work causing frame drops, unreleased wake locks, background polling without constraints, image decoding on the main thread, and missing offline caching strategies in mobile apps.
    tags:
      - mobile-performance
      - 60fps
      - battery
      - network
      - caching
      - wake-lock
      - jank
      - frame-rate
      - image-decoding
      - offline
      - ios
      - android
  - id: mob-swiftui
    file: mob-swiftui.md
    type: primary
    focus: "Detect SwiftUI lifecycle mismanagement with @State/@Binding, overly complex view bodies, missing onDisappear cleanup, NavigationStack misuse, environment object propagation failures, and unbuildable previews."
    tags:
      - swiftui
      - ios
      - apple
      - state-management
      - lifecycle
      - navigation
      - preview
      - environment
      - declarative-ui
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Main Thread

**Focus:** @Binding passed to child but parent does not own the state; @ObservedObject recreated on parent re-render (should be @StateObject); @State used for reference types instead of @StateObject or @Observable; ARC ownership qualifiers and retain cycle prevention

## Children

| File | Type | Focus |
|------|------|-------|
| [lang-objective-c.md](lang-objective-c.md) | 📄 primary | Objective-C correctness, ARC memory management, Apple framework idioms, and modern syntax adoption |
| [mob-kotlin-coroutines-flow.md](mob-kotlin-coroutines-flow.md) | 📄 primary | Detect GlobalScope leaks, missing coroutine cancellation, Flow collection blocking the main thread, StateFlow vs SharedFlow misuse, and uncaught exceptions in launch blocks. |
| [mob-perf-60fps-battery-network.md](mob-perf-60fps-battery-network.md) | 📄 primary | Detect main thread work causing frame drops, unreleased wake locks, background polling without constraints, image decoding on the main thread, and missing offline caching strategies in mobile apps. |
| [mob-swiftui.md](mob-swiftui.md) | 📄 primary | Detect SwiftUI lifecycle mismanagement with @State/@Binding, overly complex view bodies, missing onDisappear cleanup, NavigationStack misuse, environment object propagation failures, and unbuildable previews. |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
