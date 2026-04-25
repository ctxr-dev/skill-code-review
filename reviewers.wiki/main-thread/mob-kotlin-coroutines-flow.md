---
id: mob-kotlin-coroutines-flow
type: primary
depth_role: leaf
focus: Detect GlobalScope leaks, missing coroutine cancellation, Flow collection blocking the main thread, StateFlow vs SharedFlow misuse, and uncaught exceptions in launch blocks.
parents:
  - index.md
covers:
  - GlobalScope.launch leaking coroutines beyond the intended lifecycle
  - Coroutine missing cancellation when parent scope is destroyed
  - Flow collected on Dispatchers.Main with blocking upstream operators
  - "StateFlow used where SharedFlow is needed (replay semantics mismatch)"
  - "SharedFlow used where StateFlow is needed (missing current value)"
  - "Exception not caught in launch block (crashes the app or is silently lost)"
  - Flow.collect called in viewModelScope without lifecycle awareness
  - runBlocking used on the main thread freezing the UI
  - Channel not closed causing coroutine to suspend forever
  - CoroutineExceptionHandler not installed on supervisorScope
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
activation:
  file_globs:
    - "**/*.kt"
  keyword_matches:
    - launch
    - async
    - GlobalScope
    - viewModelScope
    - lifecycleScope
    - coroutineScope
    - supervisorScope
    - withContext
    - Dispatchers
    - Flow
    - StateFlow
    - SharedFlow
    - MutableStateFlow
    - MutableSharedFlow
    - collect
    - emit
    - flowOn
    - runBlocking
    - Channel
  structural_signals:
    - globalscope_usage
    - missing_cancellation
    - flow_on_main_thread
    - exception_not_caught
source:
  origin: file
  path: mob-kotlin-coroutines-flow.md
  hash: "sha256:657dfca03d70f411d627a41020170ca03276c46c5ce7decb99ccd4dacabb4b49"
---
# Kotlin Coroutines and Flow

## When This Activates

Activates on diffs that use Kotlin coroutines (launch, async, withContext), Flow APIs (StateFlow, SharedFlow, collect), or coroutine scope management (viewModelScope, lifecycleScope, supervisorScope). Coroutines are lightweight but not free -- a leaked coroutine consumes memory, holds references, and may perform work (network calls, database writes) long after the user has navigated away. The structured concurrency model prevents leaks when used correctly, but GlobalScope, unstructured launch, and missing exception handling bypass these safety nets.

## Audit Surface

- [ ] GlobalScope.launch or GlobalScope.async without justification
- [ ] launch {} without structured scope (viewModelScope, lifecycleScope)
- [ ] Flow.collect {} on Dispatchers.Main with heavy upstream transformation
- [ ] StateFlow with replay=0 semantics needed (should be SharedFlow)
- [ ] SharedFlow used for UI state (missing initial value; should be StateFlow)
- [ ] launch { } without try/catch or CoroutineExceptionHandler
- [ ] async { } result never awaited (.await() not called)
- [ ] runBlocking {} on the main thread
- [ ] Channel.receive() without close or cancellation mechanism
- [ ] flowOn(Dispatchers.Main) applied to CPU-bound operators
- [ ] collectLatest not used for rapid emissions (processing stale values)
- [ ] SupervisorJob not used when child failures should not cancel siblings

## Detailed Checks

### GlobalScope and Unstructured Coroutines
<!-- activation: keywords=["GlobalScope", "launch", "async", "CoroutineScope", "viewModelScope", "lifecycleScope", "Job", "SupervisorJob", "cancel"] -->

- [ ] **GlobalScope usage**: flag `GlobalScope.launch` or `GlobalScope.async` -- coroutines launched in GlobalScope outlive any component lifecycle, leak memory, and cannot be cancelled by the caller; use viewModelScope, lifecycleScope, or a custom supervised scope
- [ ] **Orphan launch**: flag `launch { }` called on `CoroutineScope(Dispatchers.IO)` created inline without storing the scope and calling `.cancel()` -- the scope and its coroutines leak
- [ ] **Missing scope cancellation**: flag Activity, Fragment, or ViewModel creating a custom CoroutineScope without cancelling it in onDestroy/onCleared -- all child coroutines leak
- [ ] **Fire-and-forget async**: flag `async { }` where `.await()` is never called -- exceptions in the async block are silently lost, and the result is discarded

### Exception Handling
<!-- activation: keywords=["try", "catch", "CoroutineExceptionHandler", "supervisorScope", "SupervisorJob", "CancellationException", "exception", "throw", "failure"] -->

- [ ] **Launch without exception handling**: flag `launch { riskyOperation() }` without `try/catch` inside the block or a `CoroutineExceptionHandler` on the scope -- an uncaught exception cancels the parent scope (and all siblings) or crashes the app
- [ ] **CancellationException caught**: flag `catch (e: Exception)` that catches `CancellationException` without rethrowing it -- cancellation must propagate; catching it prevents cooperative cancellation
- [ ] **Missing SupervisorJob**: flag scopes where independent child coroutines should not cancel each other on failure but the scope uses a regular Job -- use SupervisorJob or supervisorScope
- [ ] **Exception in async swallowed**: flag `async { }` wrapped in `try { deferred.await() } catch (e: Exception) { /* ignored */ }` -- the exception is caught but discarded, hiding failures

### Flow Collection and Threading
<!-- activation: keywords=["collect", "collectLatest", "flowOn", "Dispatchers", "Main", "IO", "Default", "conflate", "buffer", "stateIn", "shareIn", "launchIn"] -->

- [ ] **Heavy flow on main thread**: flag `flow { heavyComputation() }.collect { updateUI(it) }` without `flowOn(Dispatchers.Default)` before the heavy operator -- the computation runs on the collector's dispatcher (main thread if in lifecycleScope)
- [ ] **flowOn after collect**: flag `flow.collect { }.flowOn(Dispatchers.IO)` -- flowOn only affects upstream operators; placing it after collect has no effect (it does not compile, but the intent indicates confusion)
- [ ] **runBlocking on main thread**: flag `runBlocking { }` in Activity, Fragment, or @MainThread contexts -- runBlocking blocks the current thread, freezing the UI
- [ ] **collectLatest not used for rapid emissions**: flag `collect { }` on flows that emit rapidly (search input, sensor data) where processing stale values wastes work -- `collectLatest` cancels the previous collector on each new emission

### StateFlow vs SharedFlow
<!-- activation: keywords=["StateFlow", "MutableStateFlow", "SharedFlow", "MutableSharedFlow", "stateIn", "shareIn", "replay", "value", "SharingStarted"] -->

- [ ] **SharedFlow for UI state**: flag `MutableSharedFlow` used to represent UI state (screen data, loading state) -- SharedFlow has no initial value and new collectors miss the current state; use MutableStateFlow
- [ ] **StateFlow for events**: flag `MutableStateFlow` used for one-shot events (navigation, toast, snackbar) -- StateFlow has a value that persists and is re-delivered to new collectors; use SharedFlow with replay=0 or Channel
- [ ] **stateIn without initial value consideration**: flag `flow.stateIn(scope, SharingStarted.WhileSubscribed(), initialValue)` where the initial value (often null or empty) causes a visible flash of empty state in the UI
- [ ] **shareIn with wrong SharingStarted**: flag `shareIn(scope, SharingStarted.Eagerly)` for expensive flows (network, database) that should only run when collectors are active -- use `WhileSubscribed(5000)` to allow for configuration changes

### Channels
<!-- activation: keywords=["Channel", "produce", "consumeEach", "send", "receive", "close", "offer", "trySend", "tryReceive"] -->

- [ ] **Channel not closed**: flag `Channel` usage where the producer never calls `close()` -- receivers suspend forever waiting for values after the producer is done
- [ ] **Channel used where Flow suffices**: flag `Channel` for broadcasting values to multiple consumers -- Channel is a single-consumer primitive; use SharedFlow for fan-out
- [ ] **Buffered channel without backpressure strategy**: flag unbounded `Channel(Channel.UNLIMITED)` on high-throughput producers -- memory grows without bound; use Channel.BUFFERED or CONFLATED

## Common False Positives

- **Application-scoped coroutines**: work scoped to the Application lifecycle (background sync, analytics) may correctly use a custom ApplicationScope. Do not flag if the scope is tied to the app process.
- **viewModelScope automatically cancels**: Jetpack viewModelScope cancels on ViewModel.onCleared(). Do not flag missing cancellation for coroutines launched in viewModelScope.
- **Dispatchers.Main.immediate**: Android's Main.immediate dispatcher is the correct default for UI work. Do not flag main-thread collection when the upstream is already on a background dispatcher.
- **Test coroutines**: test code using `runBlocking` or `runTest` is expected. Do not flag runBlocking in test files.

## Severity Guidance

| Finding | Severity |
|---|---|
| GlobalScope.launch leaking coroutine beyond component lifecycle | Critical |
| runBlocking on main thread (UI freeze) | Critical |
| Launch without exception handling (app crash or silent failure) | Important |
| CancellationException caught and not rethrown | Important |
| Heavy Flow computation on Dispatchers.Main | Important |
| SharedFlow used for UI state (missing current value) | Important |
| Fire-and-forget async without awaiting result | Minor |
| StateFlow used for one-shot events | Minor |
| collectLatest not used for rapid emissions | Minor |

## See Also

- `mob-jetpack-compose` -- Compose collectAsState and LaunchedEffect interact with Flow
- `mob-android-room-hilt-workmanager` -- Room returns Flow; collection and scope management apply
- `conc-structured-concurrency` -- Kotlin's structured concurrency model
- `conc-async-cancellation` -- cooperative cancellation patterns across languages
- `principle-fail-fast` -- swallowing CancellationException violates fail-fast

## Authoritative References

- [Kotlin Documentation, "Coroutines" -- structured concurrency and cancellation](https://kotlinlang.org/docs/coroutines-guide.html)
- [Kotlin Documentation, "StateFlow and SharedFlow" -- hot stream design](https://kotlinlang.org/docs/flow.html#stateflow)
- [Android Developers, "Kotlin Coroutines on Android" -- viewModelScope and lifecycleScope](https://developer.android.com/kotlin/coroutines)
- [Android Developers, "A safer way to collect flows from Android UIs" -- repeatOnLifecycle](https://medium.com/androiddevelopers/a-safer-way-to-collect-flows-from-android-uis-23080b1f8bda)
