---
id: game-engines-unity-unreal-godot
type: primary
depth_role: leaf
focus: Detect per-frame allocations, hot-path engine API misuse, coroutine leaks, and missing pooling in Unity, Unreal, and Godot game code
parents:
  - index.md
covers:
  - "Allocations inside Update / FixedUpdate / _process / Tick causing GC spikes"
  - "Unity Find*, SendMessage, GetComponent called per frame in hot paths"
  - "Missing object pooling for frequently spawned/destroyed entities"
  - "Unreal replicated UPROPERTY lacking validation / authority checks"
  - "Godot scene tree access across frames without null / is_inside_tree checks"
  - "Coroutines / tasks not stopped on disable / destroy (leaks)"
  - "Physics queries without layer mask (overly broad collision tests)"
  - "Blueprint calling into C++ per tick (VM overhead) or vice versa"
  - "Update / tick doing blocking I/O, file reads, or network calls"
  - "Missing [SerializeField] / UPROPERTY() where inspector/serialization expected"
  - Frame-time budget not measured; no profiler markers in hot paths
tags:
  - gamedev
  - unity
  - unreal
  - godot
  - game-engine
  - performance
  - gc
  - hot-path
  - coroutines
activation:
  file_globs:
    - "**/*.cs"
    - "**/*.cpp"
    - "**/*.uproject"
    - "**/*.gd"
    - "**/Assets/**"
    - "**/ProjectSettings/**"
    - "**/Source/**/*.h"
  keyword_matches:
    - MonoBehaviour
    - Update
    - FixedUpdate
    - LateUpdate
    - Coroutine
    - StartCoroutine
    - UPROPERTY
    - UFUNCTION
    - Blueprint
    - AActor
    - UObject
    - Tick
    - Node
    - _process
    - _physics_process
    - GDScript
    - GetComponent
    - Instantiate
    - Destroy
    - SerializeField
  structural_signals:
    - hot_path_allocation
    - missing_pooling
    - coroutine_leak
    - per_frame_find
source:
  origin: file
  path: game-engines-unity-unreal-godot.md
  hash: "sha256:e93953558de9ce2655b7db388269fef78e7a942fab22d5b238d911169ea68d8b"
---
# Game Engines (Unity, Unreal, Godot)

## When This Activates

Activates on diffs touching Unity C# scripts, Unreal C++ / Blueprint assets, or Godot GDScript / C# nodes. Game loops run code 60-120 times per second; allocations, string lookups, and broad queries that look cheap in ordinary code become frame-hitching stutter here. This reviewer flags per-frame waste, resource leaks tied to scene/actor lifetime, and networked-state hazards that exploit players or desync sessions.

## Audit Surface

- [ ] Update / FixedUpdate / Tick / _process allocates each frame (new, string concat, LINQ, boxing)
- [ ] GameObject.Find / FindObjectOfType / SendMessage in hot path
- [ ] GetComponent<T>() called per frame instead of cached
- [ ] Instantiate / Destroy in hot path without object pooling
- [ ] Coroutines started with no matching Stop in OnDisable / OnDestroy
- [ ] Physics.Raycast / OverlapSphere without layerMask
- [ ] UPROPERTY(Replicated) without server-side validation
- [ ] Tick performs blocking I/O, file read, or HTTP call
- [ ] Blueprint -> C++ call each tick (BlueprintNativeEvent overhead)
- [ ] Godot get_node() with long NodePath string called per frame
- [ ] Signals / delegates / timers not disconnected on node exit
- [ ] Missing [SerializeField] on private field designer is wiring
- [ ] Material property set via string name each frame (use cached ID)
- [ ] No profiler markers around suspected hot path
- [ ] _process /_physics_process ignores delta (framerate-dependent)
- [ ] Addressables / async loads not cancelled on scene unload
- [ ] RPC / NetMulticast flooded without cooldown or relevancy check
- [ ] DontDestroyOnLoad missing for cross-scene singletons
- [ ] No documented frame-time budget or slow-frame fallback
- [ ] Destroy(this) followed by further member access in same frame

## Detailed Checks

### Per-Frame Allocations and GC Pressure
<!-- activation: keywords=["Update", "FixedUpdate", "LateUpdate", "Tick", "_process", "_physics_process", "new ", "ToArray", "Select", "Where", "string", "+", "ToString"] -->

- [ ] **Allocation in per-frame method**: flag `new List<>`, `new T[]`, LINQ chains, or string concatenation inside Update / FixedUpdate / Tick / _process -- each allocation pressures the GC and causes frame hitches on collection
- [ ] **Boxing in hot path**: flag value types passed to APIs taking `object` (e.g., `string.Format`, `Debug.Log(someInt)`) each frame -- boxing allocates even when no explicit `new` is present
- [ ] **String concatenation in log / debug calls**: flag `Debug.Log("x=" + x)` in Update even if the log is stripped in release -- the string is built before the log call decides to no-op; use string interpolation with conditional compilation or remove from hot path
- [ ] **Foreach over non-array collections**: in older Unity / Mono versions, `foreach` over `List<T>` allocates an enumerator; flag in hot paths and prefer indexed for-loops on critical paths

### Expensive Engine Lookups in Hot Path
<!-- activation: keywords=["Find", "FindObjectOfType", "FindObjectsOfType", "SendMessage", "GetComponent", "get_node", "FindActorsOfClass"] -->

- [ ] **GameObject.Find / FindObjectOfType in Update**: flag any `Find*` call inside a per-frame method -- these scan the scene graph and are O(n) on every frame; cache the reference in Awake/Start
- [ ] **SendMessage / BroadcastMessage**: flag in hot paths -- reflection-based dispatch costs ~100x a direct call; prefer UnityEvent, interface calls, or cached delegates
- [ ] **GetComponent<T>() per frame**: flag `GetComponent<Rigidbody>()` etc. called inside Update -- cache in Awake; the only exception is when the component can be added/removed at runtime, which should be rare
- [ ] **Godot get_node() with NodePath string**: flag `get_node("../Path/To/Thing")` inside _process -- cache the reference in_ready and use @onready var where possible
- [ ] **Unreal TActorIterator / GetAllActorsOfClass in Tick**: flag -- iterate once and cache, or use gameplay tags / subsystems

### Object Pooling and Lifetime
<!-- activation: keywords=["Instantiate", "Destroy", "SpawnActor", "QueueFree", "instance_from_id", "pool"] -->

- [ ] **Instantiate / Destroy in hot path without pool**: flag bullet, particle, VFX, damage-number spawns that call `Instantiate` per fire and `Destroy` on hit -- use an object pool (ObjectPool<T> in Unity 2021+, UObjectPool in Unreal, preallocated arrays in Godot)
- [ ] **Coroutine leak on disable**: flag `StartCoroutine` without corresponding `StopCoroutine` / `StopAllCoroutines` in `OnDisable` -- coroutines survive GameObject deactivation in some engine versions and can reference destroyed objects
- [ ] **Signal / delegate not disconnected**: flag Godot `connect()` without matching `disconnect()` in `_exit_tree`, Unity `event += handler` without `-=`, or Unreal `AddDynamic` without `RemoveDynamic` -- leaked subscriptions prevent garbage collection and can fire on destroyed objects
- [ ] **Addressables / async load not cancelled**: flag `Addressables.LoadAssetAsync` with no `Release` on scene unload or cancellation when the requester is destroyed mid-load

### Physics and Query Hygiene
<!-- activation: keywords=["Raycast", "OverlapSphere", "SweepTest", "LineTrace", "PhysicsQuery", "Overlap"] -->

- [ ] **Physics query without layer mask**: flag `Physics.Raycast`, `OverlapSphere`, `SphereCast` called without a layer mask argument -- default mask hits every collider including UI and triggers, wasting time and producing wrong hits
- [ ] **Raycast in Update instead of FixedUpdate**: flag physics queries in Update for gameplay logic that affects physics -- FixedUpdate matches the physics timestep and gives deterministic results
- [ ] **Non-alloc variants not used**: flag `Physics.OverlapSphere` returning a new array in hot path; prefer `OverlapSphereNonAlloc` with a reusable buffer

### Networking and Replication Safety
<!-- activation: keywords=["UPROPERTY", "Replicated", "ReplicatedUsing", "RPC", "NetMulticast", "Server", "Client", "Command", "ClientRpc", "ServerRpc"] -->

- [ ] **Replicated property without server validation**: flag `UPROPERTY(Replicated)` or Unity `[SyncVar]` on gameplay-critical state (health, score, inventory) without server-side mutation and validation -- clients can tamper with local state otherwise
- [ ] **RPC flood without cooldown**: flag `ServerRpc` / `Command` called per-frame (e.g., position update every tick) without interpolation or rate limiting -- floods bandwidth and server CPU
- [ ] **Authority not checked**: flag code mutating replicated state without `HasAuthority()` / `isServer` guard -- double-applies state or desyncs clients

### Tick / Update Doing Wrong Work
<!-- activation: keywords=["File.Read", "WebRequest", "UnityWebRequest", "FStreamingLevel", "load_file", "HttpClient"] -->

- [ ] **Blocking I/O in Tick**: flag `File.ReadAllText`, synchronous HTTP, or `JsonConvert.DeserializeObject(largePayload)` inside Update / Tick -- freeze the main thread and drop frames; use async loads and off-main-thread parsing
- [ ] **Blueprint calling into C++ every tick**: flag Blueprint Tick graphs that call native functions through BlueprintCallable marshaling each frame -- move the whole tick into C++ or use BlueprintNativeEvent with native path

### Engine-Specific Editor and Serialization Hygiene
<!-- activation: keywords=["SerializeField", "UPROPERTY", "export", "@export", "public", "private"] -->

- [ ] **Missing [SerializeField] on private field**: flag private fields in MonoBehaviour expected to be wired in the Inspector but missing `[SerializeField]` -- the wiring silently breaks or forces `public` which leaks API
- [ ] **UPROPERTY missing on UObject pointer**: flag `UObject*` member without `UPROPERTY()` -- GC cannot see the reference and may collect the object; also blocks replication and editor visibility
- [ ] **Godot @export missing for designer value**: flag script values intended for Inspector tweaking that lack `@export` -- designers cannot adjust without editing code

### Frame Budget and Observability
<!-- activation: keywords=["Profiler", "BeginSample", "SCOPE_CYCLE_COUNTER", "Stopwatch", "deltaTime", "delta"] -->

- [ ] **No profiler markers around expensive hot path**: flag long Update / Tick bodies with no `Profiler.BeginSample` / `SCOPE_CYCLE_COUNTER` / `Performance.GetTicksMSec` wrapping the work -- without markers, regressions are invisible in the profiler
- [ ] **Framerate-dependent logic**: flag `_process` / Update that does `position += velocity` without multiplying by `delta` / `Time.deltaTime` -- movement speed then depends on framerate
- [ ] **No documented frame-time budget**: flag new subsystems added to Tick without a comment stating expected cost (e.g., "< 0.5ms at 100 actors") and no fallback for slow frames

## Common False Positives

- **Editor-only code**: `[ExecuteInEditMode]`, `WITH_EDITOR`, `@tool` scripts do not run at gameplay framerates. Relax per-frame-allocation flags there.
- **Rare-path Update**: some MonoBehaviours only tick when active briefly (e.g., a door opening). Allocation in a 20-frame animation is usually fine.
- **Legitimate new per frame**: building a small struct like `new Vector3(x,y,z)` does not allocate (value type). Do not flag value-type constructors as GC-relevant.
- **Intentional Find on level load**: `Find*` inside Start / BeginPlay / _ready is fine; only flag inside per-frame methods.
- **Prototyping code**: clearly-marked prototype scenes may skip pooling and profiling. Flag with Minor severity unless the prototype is on a merge path.

## Severity Guidance

| Finding | Severity |
|---|---|
| Replicated / SyncVar gameplay state with no server validation (cheatable) | Critical |
| Blocking I/O in Update / Tick causing frame hitch | Important |
| Find* / FindObjectOfType in per-frame method | Important |
| Instantiate/Destroy in hot path without pooling | Important |
| Coroutine / signal leak referencing destroyed object | Important |
| Physics query without layer mask | Minor |
| Missing profiler markers or frame-budget note | Minor |
| Missing [SerializeField] / UPROPERTY / @export on designer field | Minor |

## See Also

- `domain-gaming-game-loops-networking` -- authoritative loop design, prediction, and lag compensation
- `perf-hot-path-allocations` -- general allocation-in-hot-path detection
- `perf-memory-gc` -- GC tuning and allocation profiling techniques
- `principle-fail-fast` -- fail-fast vs. late-fail for network / authority errors

## Authoritative References

- [Unity, "Optimizing Scripts in Unity Games"](https://docs.unity3d.com/Manual/MobileOptimizationPracticalScriptingOptimizations.html)
- [Unity, "Understanding Automatic Memory Management"](https://docs.unity3d.com/Manual/performance-garbage-collector.html)
- [Unreal Engine, "Optimization Guidelines"](https://dev.epicgames.com/documentation/en-us/unreal-engine/performance-and-profiling-in-unreal-engine)
- [Unreal Engine, "Actor Replication"](https://dev.epicgames.com/documentation/en-us/unreal-engine/actor-replication-in-unreal-engine)
- [Godot, "Performance best practices"](https://docs.godotengine.org/en/stable/tutorials/performance/general_optimization.html)
- [Godot, "Idle and Physics Callbacks"](https://docs.godotengine.org/en/stable/tutorials/scripting/idle_and_physics_processing.html)
