---
id: mob-jetpack-compose
type: primary
depth_role: leaf
focus: "Detect recomposition issues from unstable classes, missing remember/derivedStateOf, side effects in composable bodies, oversized composable functions, and missing LaunchedEffect cleanup."
parents:
  - index.md
covers:
  - Unstable class parameters causing unnecessary recomposition
  - "Missing remember {} for expensive computation inside composable"
  - Missing derivedStateOf for computed values that depend on state
  - "Side effect (network call, database write) in composable body outside LaunchedEffect"
  - "Large composable function with >50 lines of mixed UI and logic"
  - "LaunchedEffect without cancellation-aware cleanup (DisposableEffect)"
  - "Mutable state read in composition but never observed (MutableState without State)"
  - collectAsState on cold Flow triggering recomposition storm
  - Composable function not skippable due to lambda parameter instability
  - "Modifier.composed instead of Modifier.Node (performance)"
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
activation:
  file_globs:
    - "**/*.kt"
  keyword_matches:
    - "@Composable"
    - remember
    - mutableStateOf
    - derivedStateOf
    - LaunchedEffect
    - DisposableEffect
    - SideEffect
    - rememberCoroutineScope
    - collectAsState
    - LazyColumn
    - LazyRow
    - Modifier
    - State<
    - MutableState
  structural_signals:
    - composable_side_effect
    - missing_remember
    - unstable_parameter
    - large_composable
source:
  origin: file
  path: mob-jetpack-compose.md
  hash: "sha256:c54728613431208b8abaac066efeeb498365d9378c3a2fa74ac48e972ff28d78"
---
# Jetpack Compose

## When This Activates

Activates on diffs modifying Kotlin files with @Composable functions, Compose state management (remember, mutableStateOf, derivedStateOf), side effect APIs (LaunchedEffect, DisposableEffect), or Compose UI layouts. Compose's recomposition model re-executes composable functions when their inputs change. If a composable is not skippable (due to unstable parameters) or if it performs expensive work without remember, every recomposition repeats the work. The result is dropped frames, wasted CPU, and a sluggish UI. This reviewer detects patterns that cause excessive recomposition or violate the side-effect discipline.

## Audit Surface

- [ ] Composable parameter is a data class with mutable List/Map/Set fields (unstable)
- [ ] Expensive computation in composable body without remember {}
- [ ] State derived from other state without derivedStateOf {}
- [ ] Network or database call directly in composable body (not in LaunchedEffect/ViewModel)
- [ ] Composable function exceeding ~50 lines with inline logic
- [ ] LaunchedEffect with key = Unit or constant (runs once, never re-triggers)
- [ ] LaunchedEffect key changes too frequently (runs on every recomposition)
- [ ] mutableStateOf() used outside remember {} (recreated on recomposition)
- [ ] Flow.collectAsState() on a flow that emits rapidly without conflation
- [ ] Lambda parameter not remembered (causes child to recompose)
- [ ] Missing key parameter on LazyColumn/LazyRow items
- [ ] Modifier order incorrect (clickable before padding changes click area)

## Detailed Checks

### Recomposition and Stability
<!-- activation: keywords=["@Stable", "@Immutable", "data class", "List", "MutableList", "Map", "Set", "equals", "hashCode", "skippable", "restartable", "recomposition"] -->

- [ ] **Unstable parameter type**: flag composable parameters that are data classes containing `List`, `Map`, `Set`, `MutableList`, or other mutable collection types -- Compose considers these unstable and always recomposes the function, even when the data has not changed
- [ ] **Lambda parameter not stable**: flag composable functions that receive lambda parameters where the caller does not wrap them in `remember { }` -- a new lambda instance is created on each parent recomposition, causing the child to recompose
- [ ] **Missing @Stable or @Immutable annotation**: flag classes used as composable parameters that are logically immutable but not annotated -- the Compose compiler cannot infer stability without the annotation or Kotlin immutable collections
- [ ] **Unstable ViewModel state**: flag ViewModel exposing `StateFlow<DataClass>` where the data class uses mutable collections -- even with collectAsState, the state is unstable for downstream composables

### Remember and DerivedStateOf
<!-- activation: keywords=["remember", "derivedStateOf", "mutableStateOf", "mutableIntStateOf", "mutableFloatStateOf", "rememberSaveable", "key", "calculation"] -->

- [ ] **Missing remember for expensive computation**: flag sorting, filtering, mapping, or formatting operations in the composable body without `remember(key) { }` -- the computation reruns on every recomposition
- [ ] **mutableStateOf outside remember**: flag `mutableStateOf(initialValue)` called in the composable body without `remember { }` -- a new state instance is created on every recomposition, losing the current value
- [ ] **Missing derivedStateOf**: flag state values computed from other state (e.g., `val isValid = name.isNotEmpty() && email.contains("@")`) without `derivedStateOf { }` -- without it, the computation reruns on every recomposition even when the result has not changed
- [ ] **Remember with wrong keys**: flag `remember(key) { }` where the key does not include all inputs that affect the computation -- stale results are returned when an untracked input changes

### Side Effects
<!-- activation: keywords=["LaunchedEffect", "DisposableEffect", "SideEffect", "rememberCoroutineScope", "snapshotFlow", "produceState", "launch", "async", "withContext"] -->

- [ ] **Side effect in composition**: flag network calls, database operations, analytics events, or logging directly in the composable body without wrapping in `LaunchedEffect`, `DisposableEffect`, or `SideEffect` -- the effect runs on every recomposition
- [ ] **LaunchedEffect with constant key**: flag `LaunchedEffect(Unit) { }` or `LaunchedEffect(true) { }` -- the effect runs once and never re-triggers; ensure this is intentional and not a forgotten key parameter
- [ ] **LaunchedEffect key changes every recomposition**: flag `LaunchedEffect(someState) { }` where `someState` changes frequently -- the effect is cancelled and restarted on each change, wasting resources
- [ ] **Missing DisposableEffect for cleanup**: flag resources (listeners, observers, broadcast receivers) registered in a composable without `DisposableEffect { onDispose { } }` for cleanup -- the resource leaks when the composable leaves composition
- [ ] **rememberCoroutineScope launched in composition**: flag `scope.launch { }` directly in the composable body instead of inside a callback -- the coroutine launches on every recomposition

### Composable Function Size and Structure
<!-- activation: keywords=["@Composable", "Column", "Row", "Box", "LazyColumn", "LazyRow", "Scaffold", "Surface", "Card", "fun ", "if ", "when "] -->

- [ ] **Composable too large**: flag composable functions exceeding ~50 lines that mix layout, state management, and business logic -- extract into smaller composables with focused responsibilities
- [ ] **Inline conditional logic**: flag composable bodies with complex `if`/`when` branches that could be extracted into separate composables -- conditional composables affect recomposition scope

### LazyList Performance
<!-- activation: keywords=["LazyColumn", "LazyRow", "LazyVerticalGrid", "items", "item", "key", "contentType", "stickyHeader"] -->

- [ ] **Missing key in LazyColumn/LazyRow items**: flag `items(list) { }` or `itemsIndexed` without a `key` parameter -- without keys, Compose cannot efficiently diff the list and recomposes all visible items on change
- [ ] **Missing contentType**: flag LazyColumn items of different types without `contentType` parameter -- Compose cannot reuse item compositions across different types, increasing memory usage
- [ ] **Heavy computation in item scope**: flag expensive work (image loading, date formatting) inside `LazyColumn { items { } }` without remember -- the work runs for every visible item on each scroll frame

## Common False Positives

- **Compose compiler plugin optimizations**: the Compose compiler marks many standard types as stable. Kotlin data classes with only primitive/String fields are stable by default. Do not flag without checking the compiler report.
- **Single-run LaunchedEffect**: `LaunchedEffect(Unit)` is the correct pattern for effects that should run once when the composable enters composition (analogous to onAppear).
- **ViewModel-scoped state**: state managed in ViewModel with `stateIn` and `collectAsState` is typically stable enough. The recomposition concern applies to the composable parameters, not the ViewModel internals.
- **Small lists**: LazyColumn without keys for lists under ~20 items is acceptable for prototype code. Flag primarily when the list is dynamic or large.

## Severity Guidance

| Finding | Severity |
|---|---|
| Side effect (network/database call) directly in composable body | Critical |
| mutableStateOf outside remember (state lost on recomposition) | Critical |
| Missing key in LazyColumn/LazyRow with dynamic list | Important |
| Unstable parameter causing non-skippable recomposition | Important |
| Missing remember for expensive computation in composable | Important |
| Missing DisposableEffect cleanup for registered listener | Important |
| Composable function >50 lines with mixed concerns | Minor |
| LaunchedEffect key changes too frequently | Minor |
| Missing contentType in heterogeneous LazyColumn | Minor |

## See Also

- `mob-kotlin-coroutines-flow` -- Flow collection and coroutine scope management in Compose
- `mob-android-room-hilt-workmanager` -- Room queries and Hilt injection interact with Compose ViewModels
- `a11y-native-platform-ios-android` -- Compose semantics for accessibility
- `perf-memory-gc` -- unstable composable parameters cause unnecessary object allocation

## Authoritative References

- [Android Developers, "Jetpack Compose" -- official Compose documentation](https://developer.android.com/jetpack/compose)
- [Android Developers, "State and Jetpack Compose" -- state management patterns](https://developer.android.com/jetpack/compose/state)
- [Android Developers, "Side-effects in Compose" -- LaunchedEffect, DisposableEffect, SideEffect](https://developer.android.com/jetpack/compose/side-effects)
- [Android Developers, "Compose performance" -- stability, skippability, and recomposition](https://developer.android.com/jetpack/compose/performance)
