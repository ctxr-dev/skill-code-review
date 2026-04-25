---
id: mob-flutter
type: primary
depth_role: leaf
focus: "Detect setState in build causing loops, missing dispose() for controllers, large widget trees without const, platform channel error handling gaps, and missing error widgets in Flutter."
parents:
  - index.md
covers:
  - "setState() called during build phase causing infinite rebuild loop"
  - TextEditingController, AnimationController, or ScrollController not disposed
  - "Large widget tree without const constructors (unnecessary rebuilds)"
  - Platform channel method call without error handling on native side
  - Missing ErrorWidget.builder for graceful production error handling
  - "BuildContext used after async gap (widget may be unmounted)"
  - StatefulWidget used where StatelessWidget suffices
  - Heavy computation in build method instead of in initState or dedicated isolate
  - GlobalKey overuse causing widget identity issues
  - Missing keys on dynamically reordered lists
  - Sound null safety — no unnecessary nullable types, proper null checks
  - "Async/await correctness — unawaited futures, stream lifecycle, error propagation"
  - Isolate usage for CPU-intensive work — no blocking the main isolate
  - "Records and pattern matching (Dart 3+) — exhaustive switches, sealed class hierarchies"
  - Extension types for zero-cost wrapper types
  - Flutter widget lifecycle — dispose, setState, BuildContext usage
  - Stream subscription management — no leaked listeners
  - Effective Dart style compliance — naming, doc comments, library organization
  - Immutability — const constructors, final fields, unmodifiable collections
  - pub.dev dependency hygiene — version constraints, platform compatibility
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
aliases:
  - lang-dart
activation:
  file_globs:
    - "**/*.dart"
  keyword_matches:
    - flutter
    - "import 'package:flutter"
    - StatelessWidget
    - StatefulWidget
    - State<
    - "build("
    - setState
    - dispose
    - initState
    - TextEditingController
    - AnimationController
    - ScrollController
    - MethodChannel
    - EventChannel
    - PlatformException
    - ErrorWidget
    - "const "
    - GlobalKey
    - mounted
  structural_signals:
    - setstate_in_build
    - controller_not_disposed
    - missing_const_widget
    - platform_channel_no_error
source:
  origin: file
  path: mob-flutter.md
  hash: "sha256:8fb447d524ba48a9fdd47b46d695ad70bffc7ce9fa7049dfd1d30827b31f62c9"
---
# Flutter

## When This Activates

Activates on diffs modifying Dart files that import Flutter, define Widget subclasses, manage State lifecycle, use platform channels, or configure error handling. Flutter's widget rebuild model is efficient only when the framework can skip unchanged subtrees. Missing const constructors, setState misuse, and undisposed controllers defeat these optimizations and cause visual glitches, memory leaks, and unnecessary CPU work. Platform channel errors that go unhandled crash the app with cryptic native exceptions.

## Audit Surface

- [ ] setState() called inside build() method (infinite loop)
- [ ] TextEditingController created without dispose() in State.dispose()
- [ ] AnimationController without dispose() or vsync: this without TickerProviderStateMixin
- [ ] ScrollController without dispose()
- [ ] Widget tree with >5 nesting levels without const constructors on static children
- [ ] MethodChannel.invokeMethod without PlatformException catch
- [ ] Native platform channel handler without result.error() on failure paths
- [ ] ErrorWidget.builder not set in main() for production error display
- [ ] BuildContext used after await (mounted check missing)
- [ ] StatefulWidget with no mutable state (should be StatelessWidget)
- [ ] Heavy computation (sort, filter, parse) inside build()
- [ ] GlobalKey used for widget identification instead of ValueKey or ObjectKey
- [ ] ListView.builder without key on items that can reorder

## Detailed Checks

### setState Misuse
<!-- activation: keywords=["setState", "build", "State<", "initState", "didChangeDependencies", "didUpdateWidget", "markNeedsBuild", "notifyListeners"] -->

- [ ] **setState in build**: flag `setState()` called directly or indirectly during the `build()` method -- this schedules another build during the current build, creating an infinite rebuild loop
- [ ] **setState after dispose**: flag `setState()` called in async callbacks without checking `mounted` -- the state may have been disposed, causing "setState called after dispose" error
- [ ] **setState with no state change**: flag `setState(() {})` with an empty callback or where the enclosed mutation is not actually read by the build method -- triggers an unnecessary rebuild
- [ ] **BuildContext after async gap**: flag `context` usage (Navigator.of(context), Theme.of(context), showDialog) after an `await` -- the widget may have been unmounted; check `mounted` first (or use the newer pattern with BuildContext extension)

### Controller Lifecycle
<!-- activation: keywords=["TextEditingController", "AnimationController", "ScrollController", "TabController", "PageController", "FocusNode", "StreamController", "dispose", "initState", "TickerProviderStateMixin", "SingleTickerProviderStateMixin"] -->

- [ ] **Controller not disposed**: flag `TextEditingController`, `AnimationController`, `ScrollController`, `TabController`, `PageController`, `FocusNode`, or `StreamController` created in `initState` or as a field without `.dispose()` in `State.dispose()` -- the controller leaks native resources
- [ ] **AnimationController without TickerProvider**: flag `AnimationController(vsync: this)` on a State that does not mix in `TickerProviderStateMixin` or `SingleTickerProviderStateMixin` -- compilation fails or animations misbehave
- [ ] **Controller created in build**: flag controllers created inside `build()` instead of `initState` -- a new controller is created on every rebuild, losing state and leaking the previous one
- [ ] **StreamController not closed**: flag `StreamController` created without `.close()` in dispose -- open streams hold listeners and prevent garbage collection

### Const Constructors and Widget Tree
<!-- activation: keywords=["const ", "Widget", "Container", "Padding", "SizedBox", "Text(", "Icon(", "Center(", "Column(", "Row(", "Expanded", "child:"] -->

- [ ] **Missing const on static widgets**: flag widget subtrees with no dynamic data that do not use `const` constructors -- without const, Flutter creates new widget instances on every rebuild and cannot skip the subtree comparison
- [ ] **Deeply nested widget tree**: flag build methods with >5 levels of widget nesting -- extract inner subtrees into separate widgets or helper methods for readability and targeted rebuilds
- [ ] **Heavy computation in build**: flag sorting, filtering, API response parsing, or string formatting inside `build()` -- these run on every rebuild; move to initState, didChangeDependencies, or compute asynchronously

### Platform Channels
<!-- activation: keywords=["MethodChannel", "EventChannel", "BasicMessageChannel", "invokeMethod", "setMethodCallHandler", "PlatformException", "MissingPluginException", "result.success", "result.error"] -->

- [ ] **Missing PlatformException catch**: flag `MethodChannel.invokeMethod()` without `try/catch` for `PlatformException` or `MissingPluginException` -- native errors propagate as unhandled exceptions and crash the app
- [ ] **Native handler missing error path**: flag native (Android/iOS) platform channel handlers that call `result.success()` but never call `result.error()` or `result.notImplemented()` on failure -- the Dart side receives null or hangs
- [ ] **EventChannel without error stream handling**: flag `EventChannel.receiveBroadcastStream()` listeners that handle `onData` but not `onError` -- native errors crash the listener
- [ ] **Channel name mismatch**: flag platform channel names on Dart and native sides that do not match exactly (including case and prefix) -- calls silently fail with MissingPluginException

### Error Handling and Keys
<!-- activation: keywords=["ErrorWidget", "FlutterError", "runZonedGuarded", "GlobalKey", "ValueKey", "ObjectKey", "UniqueKey", "Key", "ListView.builder", "ReorderableListView"] -->

- [ ] **Missing ErrorWidget.builder**: flag main() or app initialization that does not set `ErrorWidget.builder` for production -- the default error widget shows a red screen with stack trace, which is unacceptable for users
- [ ] **Missing FlutterError.onError**: flag apps without custom `FlutterError.onError` handler -- framework errors in release mode are silently swallowed; log them or report to a crash service
- [ ] **GlobalKey overuse**: flag `GlobalKey` used where `ValueKey` or `ObjectKey` suffices -- GlobalKey maintains global state across the widget tree and is expensive; use typed keys for list items
- [ ] **Missing keys on reorderable list**: flag `ListView.builder` or `ReorderableListView` items without explicit keys -- Flutter cannot preserve item state during reordering

## Common False Positives

- **Riverpod/Bloc state management**: state management libraries handle rebuilds through their own mechanisms (ConsumerWidget, BlocBuilder). setState is not used, and const optimizations may not apply to their builders.
- **Hot reload artifacts**: some controller issues only appear during hot reload (initState not re-called). Verify the issue persists across cold starts.
- **Short-lived widgets**: widgets that exist for a single frame (splash screens, transitions) may not need const optimization.
- **Built-in widgets**: Flutter's built-in widgets (Text, Icon, SizedBox) have const constructors by default when all parameters are const. Dart lints already suggest adding const.

## Severity Guidance

| Finding | Severity |
|---|---|
| setState called during build (infinite loop) | Critical |
| BuildContext used after await without mounted check | Critical |
| Platform channel error not caught (app crash) | Critical |
| Controller not disposed (resource leak) | Important |
| Native platform handler missing error path | Important |
| Missing ErrorWidget.builder in production | Important |
| Missing const constructors on static widget subtree | Minor |
| StatefulWidget with no mutable state | Minor |
| Heavy computation in build method | Minor |

## See Also

- `mob-perf-60fps-battery-network` -- frame rate and jank detection applies to Flutter
- `a11y-native-platform-ios-android` -- Flutter Semantics widget for accessibility
- `perf-memory-gc` -- undisposed controllers are memory leaks
- `principle-fail-fast` -- platform channel errors should fail visibly, not silently

## Authoritative References

- [Flutter Documentation, "Performance best practices" -- rebuild optimization and const widgets](https://docs.flutter.dev/perf/best-practices)
- [Flutter Documentation, "State management" -- setState, lifecycle, and disposal](https://docs.flutter.dev/data-and-backend/state-mgmt)
- [Flutter Documentation, "Writing custom platform-specific code" -- MethodChannel patterns](https://docs.flutter.dev/platform-integration/platform-channels)
- [Flutter Documentation, "Handling errors in Flutter" -- ErrorWidget, FlutterError, zones](https://docs.flutter.dev/testing/errors)
