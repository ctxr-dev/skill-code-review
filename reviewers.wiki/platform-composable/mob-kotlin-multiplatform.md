---
id: mob-kotlin-multiplatform
type: primary
depth_role: leaf
focus: "Detect expect/actual declaration mismatches, platform-specific code leaking into common modules, missing iOS memory management (autoreleasepool), and shared mutable state without proper synchronization in Kotlin Multiplatform."
parents:
  - index.md
covers:
  - expect declaration without matching actual in one or more platform targets
  - "Platform-specific API (UIKit, Android SDK) imported in common source set"
  - Missing autoreleasepool in iOS target for tight loops with Objective-C interop
  - Shared mutable state accessed from multiple platform threads without synchronization
  - "Object freezing (legacy memory model) issues or missing @SharedImmutable"
  - "Kotlin/Native coroutine dispatcher mismatch with iOS main thread"
  - "Common code depending on JVM-specific APIs (java.util, java.io)"
  - Missing platform-specific test coverage for actual implementations
  - SKIE or KMP-NativeCoroutines not used for Swift-friendly coroutine interop
  - Large shared module including platform-specific transitive dependencies
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
activation:
  file_globs:
    - "**/*.kt"
    - "**/*.kts"
    - "**/*.swift"
  keyword_matches:
    - "expect "
    - "actual "
    - commonMain
    - iosMain
    - androidMain
    - KotlinMultiplatform
    - kotlin-multiplatform
    - "Kotlin/Native"
    - KMM
    - KMP
    - "@SharedImmutable"
    - autoreleasepool
    - freeze
    - isFrozen
    - SKIE
    - KMP-NativeCoroutines
    - CInterop
  structural_signals:
    - expect_without_actual
    - platform_import_in_common
    - shared_mutable_state
    - missing_autoreleasepool
source:
  origin: file
  path: mob-kotlin-multiplatform.md
  hash: "sha256:58614a909d8484fd10585a37c570ead7c254b6bed40d99c4e1b99bf5e7a9ae76"
---
# Kotlin Multiplatform

## When This Activates

Activates on diffs modifying Kotlin Multiplatform (KMP) projects -- common source sets, expect/actual declarations, platform-specific source sets (iosMain, androidMain), or Gradle configuration for multiplatform targets. KMP shares business logic across iOS and Android, but the boundary between common and platform code has sharp edges: expect/actual mismatches cause compilation failures on one platform, platform APIs accidentally used in common code break other targets, and Kotlin/Native's memory model (especially in legacy mode) introduces concurrency constraints absent on JVM.

## Audit Surface

- [ ] expect fun/class without actual in every declared target (compilation failure)
- [ ] Import of android.*, UIKit, or java.* in commonMain source set
- [ ] Tight loop in iosMain without autoreleasepool wrapper (memory spike)
- [ ] Mutable var or shared collection accessed from multiple threads without AtomicReference or Mutex
- [ ] Dispatchers.Main used in iosMain without ensuring it maps to the iOS main thread
- [ ] Common module using reflection (kotlin-reflect) unavailable on all targets
- [ ] actual implementation diverging from expect contract (different semantics)
- [ ] Missing iosTest or androidTest for actual implementations
- [ ] Kotlin suspend function exposed to Swift without wrapper or SKIE
- [ ] Common module .gradle.kts depending on platform-specific artifacts
- [ ] Frozen object mutation (legacy memory model) causing InvalidMutabilityException
- [ ] expect/actual for interface when a common interface would suffice

## Detailed Checks

### Expect/Actual Correctness
<!-- activation: keywords=["expect ", "actual ", "expect class", "expect fun", "expect val", "actual class", "actual fun", "actual val", "actual typealias"] -->

- [ ] **Missing actual declaration**: flag `expect` declarations in commonMain without corresponding `actual` in one or more target source sets -- the project compiles for some targets but fails for others
- [ ] **Semantic divergence**: flag `actual` implementations that behave differently from the `expect` contract (different error handling, threading behavior, or return value semantics) -- callers in common code assume uniform behavior
- [ ] **Expect where interface suffices**: flag `expect`/`actual` patterns used for dependency injection or strategy patterns where a common interface with platform-specific factory would be simpler and more testable
- [ ] **Actual typealias overuse**: flag `actual typealias Foo = PlatformFoo` where the platform type's API surface exceeds the expect declaration -- consumers may accidentally depend on platform-specific members

### Common Module Purity
<!-- activation: keywords=["import android", "import UIKit", "import java.", "import javax.", "import kotlinx.cinterop", "import platform.", "commonMain", "commonTest"] -->

- [ ] **Platform import in common**: flag imports of `android.*`, `java.*`, `javax.*`, `UIKit`, `Foundation`, or `platform.*` in `commonMain` or `commonTest` source sets -- these break compilation for other targets
- [ ] **JVM-specific standard library**: flag usage of `java.util.Date`, `java.io.File`, `java.util.UUID` in common code -- use `kotlinx-datetime`, `okio`, or expect/actual wrappers
- [ ] **Platform-specific Gradle dependency in common**: flag `commonMain` dependencies block pulling in artifacts available only on one platform (e.g., Android Room, iOS Alamofire)
- [ ] **Reflection in common**: flag `kotlin-reflect` or `KClass` operations in common code that are unavailable or limited on Kotlin/Native

### iOS Memory and Interop
<!-- activation: keywords=["autoreleasepool", "objc", "NSObject", "CInterop", "cinterop", "freeze", "isFrozen", "@SharedImmutable", "memScoped", "StableRef", "ObjCName"] -->

- [ ] **Missing autoreleasepool**: flag tight loops or batch processing in `iosMain` that create Objective-C objects (NSString, NSData, NSURL) without wrapping in `autoreleasepool { }` -- temporary objects accumulate and spike memory until the next runloop drain
- [ ] **Frozen object mutation (legacy)**: flag mutable state modifications on objects that may be frozen in legacy Kotlin/Native memory model -- causes `InvalidMutabilityException` at runtime
- [ ] **StableRef not disposed**: flag `StableRef.create()` without corresponding `.dispose()` -- the reference prevents garbage collection of the Kotlin object
- [ ] **C interop memory not freed**: flag `memScoped { }` blocks where allocated C memory escapes the scope -- the memory is freed when memScoped exits, leaving a dangling pointer

### Concurrency and Dispatchers
<!-- activation: keywords=["Dispatchers", "Main", "IO", "Default", "newSingleThreadContext", "AtomicReference", "Mutex", "withLock", "Thread", "Worker", "nativeHeap"] -->

- [ ] **Dispatchers.Main on iOS**: flag `Dispatchers.Main` usage in common or iosMain without verifying it dispatches to the iOS main thread -- the behavior depends on the coroutine library version and configuration
- [ ] **Shared mutable state without synchronization**: flag `var` properties or mutable collections in `object` declarations or companion objects in common code accessed from coroutines on different dispatchers without `AtomicReference`, `Mutex`, or `@Volatile`
- [ ] **newSingleThreadContext on Native**: flag `newSingleThreadContext` in Kotlin/Native -- it creates an actual OS thread; prefer `Dispatchers.Default` for CPU work
- [ ] **Missing main-thread dispatch for UI**: flag common code that triggers UI updates via callbacks or flows without ensuring the delivery happens on the main dispatcher of each platform

### Swift Interop
<!-- activation: keywords=["SKIE", "KMP-NativeCoroutines", "suspend", "Flow", "Swift", "KotlinSuspend", "completionHandler", "Cancellable", "@ObjCName", "@HiddenFromObjC"] -->

- [ ] **Suspend function exposed to Swift without wrapper**: flag `suspend fun` in common module API consumed by Swift without SKIE, KMP-NativeCoroutines, or a manual wrapper -- Swift sees the raw completion handler with untyped Any? return
- [ ] **Flow exposed without conversion**: flag `Flow<T>` return types in common API used from Swift without SKIE or a native wrapper -- Swift cannot collect Kotlin Flows natively; they need conversion to AsyncSequence or Combine Publisher
- [ ] **Missing @ObjCName or @HiddenFromObjC**: flag public API in common module without explicit Objective-C naming annotations -- the generated Objective-C/Swift API names may be unidiomatic or conflicting

## Common False Positives

- **New Kotlin/Native memory model**: since Kotlin 1.7.20, the new memory model is default and does not require freezing. Do not flag freeze/SharedImmutable issues unless the project uses the legacy memory model.
- **Single-target KMP**: projects targeting only one platform (e.g., Android-only with plans for iOS) may intentionally use platform APIs in common during prototyping.
- **SKIE-managed interop**: projects using SKIE automatically get Swift-friendly wrappers for suspend/Flow. Do not flag missing manual wrappers if SKIE is configured.
- **Test source sets**: test code may use platform-specific assertions or mocking libraries. Do not flag platform imports in test source sets that match the target.

## Severity Guidance

| Finding | Severity |
|---|---|
| expect declaration without actual in a target (compilation failure) | Critical |
| Platform-specific import in commonMain (breaks other targets) | Critical |
| Shared mutable state without synchronization (data race) | Critical |
| Missing autoreleasepool in tight iOS interop loop (memory spike) | Important |
| Suspend function exposed to Swift without interop wrapper | Important |
| actual implementation with different semantics than expect | Important |
| Dispatchers.Main not verified for iOS target | Minor |
| Missing platform-specific test for actual implementation | Minor |
| expect/actual used where common interface would suffice | Minor |

## See Also

- `mob-kotlin-coroutines-flow` -- coroutine and Flow patterns that apply in common code
- `mob-swift-concurrency-actors` -- Swift concurrency interacts with Kotlin/Native coroutines via SKIE
- `principle-separation-of-concerns` -- common/platform boundary is a separation-of-concerns decision
- `conc-race-conditions-data-races` -- shared mutable state in KMP is a data race risk

## Authoritative References

- [Kotlin Documentation, "Kotlin Multiplatform" -- project structure and expect/actual](https://kotlinlang.org/docs/multiplatform.html)
- [Kotlin Documentation, "Kotlin/Native memory management" -- new and legacy memory models](https://kotlinlang.org/docs/native-memory-manager.html)
- [JetBrains, "SKIE" -- Swift-friendly Kotlin Multiplatform interop](https://skie.touchlab.co/)
- [Touchlab, "KMP-NativeCoroutines" -- coroutine interop for Swift/Objective-C](https://github.com/nicklockwood/KMP-NativeCoroutines)
