---
id: platform-composable
type: index
depth_role: subcategory
depth: 1
focus: "@MainActor annotation and main-thread-only API access; ARC retain cycles from strong reference closures; Access control (internal by default) and module boundaries; AnyCancellable not stored -- subscription immediately cancelled"
parents:
  - "../index.md"
shared_covers: []
entries:
  - id: lang-swift
    file: lang-swift.md
    type: primary
    focus: Catch Swift-specific bugs, memory management issues, concurrency errors, and protocol misuse in diffs
    tags:
      - swift
      - ios
      - macos
      - concurrency
      - actors
      - arc
      - protocols
      - swiftui
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
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Platform Composable

**Focus:** @MainActor annotation and main-thread-only API access; ARC retain cycles from strong reference closures; Access control (internal by default) and module boundaries; AnyCancellable not stored -- subscription immediately cancelled

## Children

| File | Type | Focus |
|------|------|-------|
| [lang-swift.md](lang-swift.md) | 📄 primary | Catch Swift-specific bugs, memory management issues, concurrency errors, and protocol misuse in diffs |
| [mob-combine-reactive.md](mob-combine-reactive.md) | 📄 primary | Detect missing cancellable storage, publishers not completed, sink without strong self management, scheduler misuse, and incorrect Subject vs Publisher choices in Combine and reactive frameworks. |
| [mob-core-data-swiftdata.md](mob-core-data-swiftdata.md) | 📄 primary | Detect main context blocking UI, missing background context for writes, fetch requests without predicate or sort causing full scans, missing migration plans, and concurrency violations in Core Data and SwiftData. |
| [mob-flutter.md](mob-flutter.md) | 📄 primary | Detect setState in build causing loops, missing dispose() for controllers, large widget trees without const, platform channel error handling gaps, and missing error widgets in Flutter. |
| [mob-jetpack-compose.md](mob-jetpack-compose.md) | 📄 primary | Detect recomposition issues from unstable classes, missing remember/derivedStateOf, side effects in composable bodies, oversized composable functions, and missing LaunchedEffect cleanup. |
| [mob-kotlin-multiplatform.md](mob-kotlin-multiplatform.md) | 📄 primary | Detect expect/actual declaration mismatches, platform-specific code leaking into common modules, missing iOS memory management (autoreleasepool), and shared mutable state without proper synchronization in Kotlin Multiplatform. |
| [mob-uikit.md](mob-uikit.md) | 📄 primary | Detect retain cycles in closures, missing dealloc/deinit cleanup, Auto Layout ambiguity, massive view controllers, and non-weak delegate references in UIKit code. |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
