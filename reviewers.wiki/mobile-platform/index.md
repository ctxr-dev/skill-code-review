---
id: mobile-platform
type: index
depth_role: subcategory
depth: 1
focus: "mobile-platform: Detect embedded / RTOS hazards -- ISR misuse, watchdog omissions, stack sizing, priority inversion, DMA memory placement, missing volatile, and MMIO / memory-barrier bugs; Detect Room queries on the main thread, missing ..."
parents:
  - "../index.md"
shared_covers: []
tags:
  - 60fps
  - actor
  - android
  - appimage
  - apple
  - async
  - async-await
  - autolayout
  - background-work
  - bare-metal
  - battery
  - boundary
  - bridge
  - build
  - cache
  - caching
  - cancellable
  - cancellation
  - canonical-abi
  - chocolatey
generator: "skill-llm-wiki/v1"
entries:
  - id: embedded-firmware-rtos
    file: embedded-firmware-rtos.md
    type: primary
    focus: "Detect embedded / RTOS hazards -- ISR misuse, watchdog omissions, stack sizing, priority inversion, DMA memory placement, missing volatile, and MMIO / memory-barrier bugs"
    tags:
      - embedded
      - firmware
      - rtos
      - freertos
      - zephyr
      - mcu
      - bare-metal
      - isr
      - dma
      - watchdog
      - cortex
  - id: mob-android-room-hilt-workmanager
    file: mob-android-room-hilt-workmanager.md
    type: primary
    focus: Detect Room queries on the main thread, missing database migrations, Hilt scope mismatches, WorkManager constraint omissions, and missing foreground service type declarations.
    tags:
      - room
      - hilt
      - workmanager
      - android
      - database
      - dependency-injection
      - background-work
      - migration
      - jetpack
      - dagger
  - id: mob-combine-reactive
    file: mob-combine-reactive.md
    type: primary
    focus: Detect missing cancellable storage, publishers not completed, sink without strong self management, scheduler misuse, and incorrect Subject vs Publisher choices in Combine and reactive frameworks.
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
  - id: mob-core-data-swiftdata
    file: mob-core-data-swiftdata.md
    type: primary
    focus: Detect main context blocking UI, missing background context for writes, fetch requests without predicate or sort causing full scans, missing migration plans, and concurrency violations in Core Data and SwiftData.
    tags:
      - core-data
      - swiftdata
      - persistence
      - database
      - migration
      - concurrency
      - ios
      - apple
      - nsfetchrequest
      - managed-object
  - id: mob-flutter
    file: mob-flutter.md
    type: primary
    focus: "Detect setState in build causing loops, missing dispose() for controllers, large widget trees without const, platform channel error handling gaps, and missing error widgets in Flutter."
    tags:
      - flutter
      - dart
      - widget
      - state
      - dispose
      - platform-channel
      - build
      - const
      - mobile
      - cross-platform
      - null-safety
      - async
      - streams
      - isolates
      - pub
      - widget-lifecycle
  - id: mob-jetpack-compose
    file: mob-jetpack-compose.md
    type: primary
    focus: "Detect recomposition issues from unstable classes, missing remember/derivedStateOf, side effects in composable bodies, oversized composable functions, and missing LaunchedEffect cleanup."
    tags:
      - jetpack-compose
      - android
      - recomposition
      - remember
      - state
      - launchedeffect
      - composable
      - ui
      - kotlin
      - material
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
  - id: mob-kotlin-multiplatform
    file: mob-kotlin-multiplatform.md
    type: primary
    focus: "Detect expect/actual declaration mismatches, platform-specific code leaking into common modules, missing iOS memory management (autoreleasepool), and shared mutable state without proper synchronization in Kotlin Multiplatform."
    tags:
      - kotlin-multiplatform
      - kmp
      - kmm
      - ios
      - android
      - expect-actual
      - common-module
      - native
      - cross-platform
      - interop
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
  - id: mob-react-native
    file: mob-react-native.md
    type: primary
    focus: Detect bridge overhead from frequent native calls, large state serialization on the JS thread, missing native module error handling, missing Hermes optimization, and navigation memory leaks in React Native.
    tags:
      - react-native
      - mobile
      - bridge
      - hermes
      - navigation
      - flatlist
      - performance
      - native-module
      - cross-platform
      - javascript
  - id: mob-swift-concurrency-actors
    file: mob-swift-concurrency-actors.md
    type: primary
    focus: Detect data races from actor reentrancy, MainActor blocking, uncancelled Tasks, missing Sendable conformance, and structured concurrency violations in Swift concurrency.
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
  - id: mob-uikit
    file: mob-uikit.md
    type: primary
    focus: "Detect retain cycles in closures, missing dealloc/deinit cleanup, Auto Layout ambiguity, massive view controllers, and non-weak delegate references in UIKit code."
    tags:
      - uikit
      - ios
      - retain-cycle
      - memory-leak
      - autolayout
      - massive-view-controller
      - delegate
      - lifecycle
      - apple
  - id: os-packaging-homebrew-apt-snap-flatpak-winget-appimage
    file: os-packaging-homebrew-apt-snap-flatpak-winget-appimage.md
    type: primary
    focus: "Detect OS-packaging hazards across Homebrew, Debian/apt, Snap, Flatpak, RPM, Chocolatey, winget, and AppImage -- missing checksums, weak sandboxing, hardcoded paths, unsigned artefacts, and broken uninstall cleanup"
    tags:
      - packaging
      - homebrew
      - debian
      - rpm
      - snap
      - flatpak
      - chocolatey
      - winget
      - appimage
      - msix
      - reproducible-build
      - uninstall
      - sandboxing
  - id: wasm-interface-types
    file: wasm-interface-types.md
    type: primary
    focus: Detect raw wasm imports where the component model is appropriate, unversioned WIT schemas, canonical ABI leakage, and expensive boundary crossings
    tags:
      - wasm
      - wit
      - wit-bindgen
      - wasm-bindgen
      - component-model
      - interface-types
      - canonical-abi
      - boundary
      - versioning
  - id: wasm-safety-boundary
    file: wasm-safety-boundary.md
    type: primary
    focus: "Detect host/guest trust boundary violations, unchecked memory access via guest pointers, missing fuel/instruction limits, and sandbox-escape patterns in WebAssembly embeddings"
    tags:
      - wasm
      - webassembly
      - wasmtime
      - wasmer
      - wasmi
      - wasi
      - sandbox
      - memory-safety
      - trust-boundary
      - host-function
      - fuel
      - epoch
      - resource-limits
      - cache
      - isolation
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Mobile Platform

**Focus:** mobile-platform: Detect embedded / RTOS hazards -- ISR misuse, watchdog omissions, stack sizing, priority inversion, DMA memory placement, missing volatile, and MMIO / memory-barrier bugs; Detect Room queries on the main thread, missing ...

## Children

| File | Type | Focus |
|------|------|-------|
| [embedded-firmware-rtos.md](embedded-firmware-rtos.md) | 📄 primary | Detect embedded / RTOS hazards -- ISR misuse, watchdog omissions, stack sizing, priority inversion, DMA memory placement, missing volatile, and MMIO / memory-barrier bugs |
| [mob-android-room-hilt-workmanager.md](mob-android-room-hilt-workmanager.md) | 📄 primary | Detect Room queries on the main thread, missing database migrations, Hilt scope mismatches, WorkManager constraint omissions, and missing foreground service type declarations. |
| [mob-combine-reactive.md](mob-combine-reactive.md) | 📄 primary | Detect missing cancellable storage, publishers not completed, sink without strong self management, scheduler misuse, and incorrect Subject vs Publisher choices in Combine and reactive frameworks. |
| [mob-core-data-swiftdata.md](mob-core-data-swiftdata.md) | 📄 primary | Detect main context blocking UI, missing background context for writes, fetch requests without predicate or sort causing full scans, missing migration plans, and concurrency violations in Core Data and SwiftData. |
| [mob-flutter.md](mob-flutter.md) | 📄 primary | Detect setState in build causing loops, missing dispose() for controllers, large widget trees without const, platform channel error handling gaps, and missing error widgets in Flutter. |
| [mob-jetpack-compose.md](mob-jetpack-compose.md) | 📄 primary | Detect recomposition issues from unstable classes, missing remember/derivedStateOf, side effects in composable bodies, oversized composable functions, and missing LaunchedEffect cleanup. |
| [mob-kotlin-coroutines-flow.md](mob-kotlin-coroutines-flow.md) | 📄 primary | Detect GlobalScope leaks, missing coroutine cancellation, Flow collection blocking the main thread, StateFlow vs SharedFlow misuse, and uncaught exceptions in launch blocks. |
| [mob-kotlin-multiplatform.md](mob-kotlin-multiplatform.md) | 📄 primary | Detect expect/actual declaration mismatches, platform-specific code leaking into common modules, missing iOS memory management (autoreleasepool), and shared mutable state without proper synchronization in Kotlin Multiplatform. |
| [mob-perf-60fps-battery-network.md](mob-perf-60fps-battery-network.md) | 📄 primary | Detect main thread work causing frame drops, unreleased wake locks, background polling without constraints, image decoding on the main thread, and missing offline caching strategies in mobile apps. |
| [mob-react-native.md](mob-react-native.md) | 📄 primary | Detect bridge overhead from frequent native calls, large state serialization on the JS thread, missing native module error handling, missing Hermes optimization, and navigation memory leaks in React Native. |
| [mob-swift-concurrency-actors.md](mob-swift-concurrency-actors.md) | 📄 primary | Detect data races from actor reentrancy, MainActor blocking, uncancelled Tasks, missing Sendable conformance, and structured concurrency violations in Swift concurrency. |
| [mob-swiftui.md](mob-swiftui.md) | 📄 primary | Detect SwiftUI lifecycle mismanagement with @State/@Binding, overly complex view bodies, missing onDisappear cleanup, NavigationStack misuse, environment object propagation failures, and unbuildable previews. |
| [mob-uikit.md](mob-uikit.md) | 📄 primary | Detect retain cycles in closures, missing dealloc/deinit cleanup, Auto Layout ambiguity, massive view controllers, and non-weak delegate references in UIKit code. |
| [os-packaging-homebrew-apt-snap-flatpak-winget-appimage.md](os-packaging-homebrew-apt-snap-flatpak-winget-appimage.md) | 📄 primary | Detect OS-packaging hazards across Homebrew, Debian/apt, Snap, Flatpak, RPM, Chocolatey, winget, and AppImage -- missing checksums, weak sandboxing, hardcoded paths, unsigned artefacts, and broken uninstall cleanup |
| [wasm-interface-types.md](wasm-interface-types.md) | 📄 primary | Detect raw wasm imports where the component model is appropriate, unversioned WIT schemas, canonical ABI leakage, and expensive boundary crossings |
| [wasm-safety-boundary.md](wasm-safety-boundary.md) | 📄 primary | Detect host/guest trust boundary violations, unchecked memory access via guest pointers, missing fuel/instruction limits, and sandbox-escape patterns in WebAssembly embeddings |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
