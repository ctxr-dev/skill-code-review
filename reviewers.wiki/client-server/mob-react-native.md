---
id: mob-react-native
type: primary
depth_role: leaf
focus: Detect bridge overhead from frequent native calls, large state serialization on the JS thread, missing native module error handling, missing Hermes optimization, and navigation memory leaks in React Native.
parents:
  - index.md
covers:
  - Frequent synchronous bridge calls causing JS-native round-trip overhead
  - Large state objects serialized across the bridge on every render
  - Native module methods missing error callbacks or promise rejection
  - Hermes engine not enabled or bytecode precompilation not configured
  - "Navigation stack accumulating screens without cleanup (memory leak)"
  - FlatList without keyExtractor or getItemLayout
  - "Inline function/object creation in JSX props causing unnecessary re-renders"
  - Missing ErrorBoundary around native-bridged components
  - Large images not cached or resized before display
  - Animated API running on JS thread instead of native driver
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
activation:
  file_globs:
    - "**/*.js"
    - "**/*.jsx"
    - "**/*.ts"
    - "**/*.tsx"
    - "**/*.java"
    - "**/*.kt"
    - "**/*.m"
    - "**/*.mm"
    - "**/*.swift"
  keyword_matches:
    - react-native
    - React Native
    - NativeModules
    - TurboModule
    - FlatList
    - SectionList
    - Animated
    - useNativeDriver
    - Hermes
    - react-navigation
    - NavigationContainer
    - createStackNavigator
    - createNativeStackNavigator
    - ErrorBoundary
    - keyExtractor
  structural_signals:
    - bridge_call_in_loop
    - large_bridge_payload
    - missing_native_error_handling
    - flatlist_without_key
source:
  origin: file
  path: mob-react-native.md
  hash: "sha256:1f3cc1689c7e951b0a5beb18fa1f30c4d1687ff2104b7a1c1df4c34afbaaf7a4"
---
# React Native

## When This Activates

Activates on diffs modifying React Native components, native modules, navigation setup, list components, or animation code. React Native's architecture (whether classic bridge or new architecture with JSI) involves communication between JavaScript and native runtimes. Every bridge crossing serializes data, and excessive crossings cause frame drops. The JS thread is single-threaded -- blocking it with large serialization, unoptimized lists, or JS-driven animations freezes the entire UI. This reviewer detects patterns that cause bridge overhead, JS thread congestion, and memory leaks.

## Audit Surface

- [ ] NativeModules.X.method() called in a render loop or rapid interval
- [ ] Large object passed through bridge (>1KB serialized per frame)
- [ ] Native module @ReactMethod without Promise parameter or callback error handling
- [ ] Hermes not enabled in android/app/build.gradle or Podfile
- [ ] React Navigation stack without screen unmount or listener cleanup
- [ ] FlatList without keyExtractor prop
- [ ] FlatList without getItemLayout for fixed-height items
- [ ] Inline arrow function or object literal in JSX prop (new reference each render)
- [ ] Missing ErrorBoundary wrapping native view components
- [ ] Image source without cache policy or resize mode
- [ ] Animated.timing/spring without useNativeDriver: true
- [ ] console.log statements left in production code (serialization overhead)
- [ ] Large JSON.parse or JSON.stringify on the JS thread blocking renders

## Detailed Checks

### Bridge Overhead and Native Calls
<!-- activation: keywords=["NativeModules", "TurboModule", "bridge", "native", "requireNativeComponent", "UIManager", "dispatchViewManagerCommand", "JSI", "fabric"] -->

- [ ] **Bridge call in render or loop**: flag `NativeModules.X.method()` inside a component render function, useEffect with frequent triggers, or setInterval -- each call serializes arguments, crosses the bridge, and deserializes results, taking 5-15ms per round trip
- [ ] **Large bridge payload**: flag native module calls or event emissions passing objects >1KB per call at high frequency -- serialization and deserialization on the bridge consume JS thread time
- [ ] **Missing error handling in native module**: flag native module methods (Java/Kotlin `@ReactMethod`, ObjC `RCT_EXPORT_METHOD`) that do not call `promise.reject()` or `callback.invoke(error, null)` on error paths -- the JS side hangs or receives undefined
- [ ] **Synchronous native call**: flag `NativeModules.X.methodSync()` (synchronous bridge calls) -- they block the JS thread until the native method returns; use async methods instead

### JS Thread Performance
<!-- activation: keywords=["JSON.parse", "JSON.stringify", "console.log", "console.warn", "Animated", "useNativeDriver", "InteractionManager", "requestAnimationFrame", "setTimeout"] -->

- [ ] **JS-driven animation**: flag `Animated.timing()` or `Animated.spring()` without `useNativeDriver: true` -- JS-driven animations run each frame's calculation on the JS thread, competing with React renders for the single JS thread
- [ ] **console.log in production**: flag `console.log`, `console.warn`, or `console.error` in non-debug code paths -- React Native serializes logged objects across the bridge for each call, consuming JS thread time
- [ ] **Large JSON on JS thread**: flag `JSON.parse()` or `JSON.stringify()` on large objects (API responses, stored data) without offloading to a background thread or native module -- parsing blocks rendering
- [ ] **Missing InteractionManager**: flag heavy computations triggered immediately on mount without `InteractionManager.runAfterInteractions()` -- the computation blocks the transition animation

### FlatList and List Performance
<!-- activation: keywords=["FlatList", "SectionList", "VirtualizedList", "keyExtractor", "getItemLayout", "renderItem", "windowSize", "maxToRenderPerBatch", "initialNumToRender", "removeClippedSubviews"] -->

- [ ] **Missing keyExtractor**: flag `FlatList` or `SectionList` without `keyExtractor` prop -- React cannot efficiently diff list items and re-renders the entire list on data change
- [ ] **Missing getItemLayout**: flag `FlatList` with fixed-height items that does not provide `getItemLayout` -- without it, FlatList cannot jump to arbitrary positions and must measure every item
- [ ] **Inline renderItem**: flag `renderItem={({ item }) => <Component />}` creating a new function on each render -- extract to a named function or use `useCallback` to prevent unnecessary item re-renders
- [ ] **Default windowSize**: flag FlatList with large datasets using the default `windowSize` (21) without tuning -- reducing windowSize decreases off-screen rendering but may show blanks during fast scrolling

### Navigation and Memory
<!-- activation: keywords=["NavigationContainer", "createStackNavigator", "createNativeStackNavigator", "createBottomTabNavigator", "useNavigation", "useFocusEffect", "addListener", "navigation.navigate", "navigation.push"] -->

- [ ] **Stack accumulating screens**: flag `navigation.push()` used repeatedly without ever popping or resetting the stack -- each pushed screen stays mounted, consuming memory
- [ ] **Listener not cleaned up**: flag `navigation.addListener()` without returning the unsubscribe function from useEffect cleanup -- the listener accumulates on each focus
- [ ] **Missing useFocusEffect cleanup**: flag `useFocusEffect` callbacks that register subscriptions without returning a cleanup function -- subscriptions stack on each screen focus
- [ ] **Heavy work on screen mount**: flag screens performing expensive operations (API calls, large state initialization) in useEffect without checking if the screen is still focused

### Hermes and Build Optimization
<!-- activation: keywords=["hermes", "Hermes", "hermesEnabled", "enableHermes", "bytecode", "jsc", "JavaScriptCore", "build.gradle", "Podfile"] -->

- [ ] **Hermes not enabled**: flag Android `build.gradle` with `hermesEnabled = false` or iOS Podfile without Hermes -- Hermes provides faster startup, lower memory, and bytecode precompilation
- [ ] **Missing bytecode precompilation**: flag Hermes-enabled builds without bytecode bundle generation (`hermes-engine` transformer) -- precompiled bytecode eliminates JS parsing at startup

## Common False Positives

- **New Architecture (Fabric/TurboModules)**: apps using the new architecture have significantly reduced bridge overhead. Native module calls via JSI are synchronous and cheap. Verify the architecture before flagging bridge costs.
- **useNativeDriver limitations**: some animated properties (layout-related: width, height, padding) cannot use the native driver. Flag only when native driver is available but not used.
- **Development-only console.log**: React Native strips console statements with Babel in release builds when configured. Verify the Babel config before flagging.
- **Small lists**: FlatList optimizations are unnecessary for lists under 50 items. Do not flag missing getItemLayout on short lists.

## Severity Guidance

| Finding | Severity |
|---|---|
| Native module method missing error handling (JS hangs) | Critical |
| Bridge call inside render loop (frame drops) | Critical |
| Animated without useNativeDriver (JS thread congestion) | Important |
| FlatList without keyExtractor on dynamic list | Important |
| Navigation listener not cleaned up (memory leak) | Important |
| Hermes not enabled (slower startup, higher memory) | Important |
| Inline function in JSX prop causing re-renders | Minor |
| Missing getItemLayout on fixed-height FlatList | Minor |
| console.log in production code path | Minor |

## See Also

- `fw-react` -- React patterns (hooks, memoization) apply to React Native components
- `perf-memory-gc` -- JS thread memory leaks from event listeners and subscriptions
- `a11y-native-platform-ios-android` -- React Native accessibility via accessibilityLabel prop
- `mob-perf-60fps-battery-network` -- frame rate and battery optimization for mobile

## Authoritative References

- [React Native Documentation, "Performance" -- bridge, JS thread, and rendering optimization](https://reactnative.dev/docs/performance)
- [React Native Documentation, "Hermes" -- enabling Hermes engine](https://reactnative.dev/docs/hermes)
- [React Native Documentation, "Optimizing Flatlist Configuration"](https://reactnative.dev/docs/optimizing-flatlist-configuration)
- [React Navigation Documentation, "Performance" -- screen lifecycle and memory management](https://reactnavigation.org/docs/performance)
