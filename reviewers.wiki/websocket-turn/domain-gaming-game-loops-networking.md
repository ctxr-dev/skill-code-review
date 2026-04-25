---
id: domain-gaming-game-loops-networking
type: primary
depth_role: leaf
focus: Detect frame-rate-dependent physics, client-authoritative state, missing server reconciliation, broken network prediction, ECS archetype fragmentation, and tick rate mismatches in game loops and networking
parents:
  - index.md
covers:
  - Physics or game logic tied to frame rate instead of fixed timestep
  - Client-authoritative game state enabling cheats
  - Missing server reconciliation for client-predicted state
  - Network prediction without rollback capability
  - ECS with excessive archetype fragmentation
  - Tick rate mismatch between client and server
  - Input handling on render thread instead of fixed update
  - Missing lag compensation for hit detection
  - "Delta time accumulated without clamping (spiral of death)"
  - Deterministic simulation broken by floating-point non-determinism
tags:
  - game-loop
  - fixed-timestep
  - netcode
  - prediction
  - rollback
  - ecs
  - tick-rate
  - lag-compensation
  - interpolation
  - delta-time
activation:
  file_globs:
    - "**/*game*loop*"
    - "**/*tick*"
    - "**/*update*"
    - "**/*netcode*"
    - "**/*prediction*"
    - "**/*rollback*"
    - "**/*ecs*"
    - "**/*entity*"
    - "**/*component*"
    - "**/*system*"
    - "**/*interpolat*"
  keyword_matches:
    - game loop
    - tick
    - frame
    - delta time
    - fixed update
    - netcode
    - prediction
    - interpolation
    - rollback
    - ECS
    - entity
    - component
    - system
    - deltaTime
    - fixedUpdate
    - FixedUpdate
    - Time.deltaTime
    - GetTickCount
    - tick_rate
  structural_signals:
    - Main game loop or update function
    - Network state synchronization handler
    - ECS world or system registration
source:
  origin: file
  path: domain-gaming-game-loops-networking.md
  hash: "sha256:0f4e27b88d06a135623dc306ddb2e54ce73dfcb693fac3811e449a6335deb7a4"
---
# Game Loop, Timestep, and Network Architecture

## When This Activates

Activates when diffs touch game loop logic, physics updates, network synchronization, client prediction, ECS architecture, or tick-rate management. Frame-rate-dependent physics causes inconsistent behavior across hardware, client-authoritative state enables cheating, and missing reconciliation breaks the illusion of responsive multiplayer. These are the most common sources of shipped game bugs.

## Audit Surface

- [ ] Game logic multiplied by variable delta time instead of using fixed timestep
- [ ] Client sends authoritative position, health, or score to server
- [ ] Client-side prediction has no server reconciliation or correction
- [ ] Prediction rollback not implemented for mispredicted state
- [ ] ECS world has high archetype count relative to entity count
- [ ] Client tick rate differs from server tick rate with no interpolation
- [ ] Input polling or processing occurs in render/draw callback
- [ ] Hit detection uses client timestamp without server-side lag compensation
- [ ] Delta time not clamped -- single large frame causes physics explosion
- [ ] Floating-point operations in deterministic simulation without fixed-point or ordered ops
- [ ] Network snapshot interpolation buffer too small (jitter visible)
- [ ] Game state serialization includes unnecessary fields (bandwidth waste)
- [ ] No input buffer for network input delay hiding
- [ ] Simulation step count unbounded per frame (spiral of death)

## Detailed Checks

### Fixed Timestep and Delta Time
<!-- activation: keywords=["delta", "deltaTime", "fixedUpdate", "timestep", "step", "accumulator", "frame", "fps", "Time.deltaTime", "dt"] -->

- [ ] **Variable delta time in physics**: physics calculations (velocity, gravity, collision) multiply by the frame's delta time -- results differ at 30fps vs 144fps. Use a fixed timestep accumulator pattern where the simulation always advances by a constant dt
- [ ] **No delta time clamping**: if a frame takes abnormally long (alt-tab, debugger break), the accumulated delta time causes a massive physics step or many catch-up steps. Clamp accumulated time to a maximum (e.g., 250ms)
- [ ] **Spiral of death**: when simulation falls behind, the code runs unlimited simulation steps per frame to catch up -- each step makes the frame longer, causing more catch-up, until the game freezes. Cap simulation steps per frame
- [ ] **Input in render callback**: input polling or gameplay input processing in the render/draw function instead of the fixed update -- input responsiveness varies with frame rate

### Client-Server Authority
<!-- activation: keywords=["client", "server", "authoritative", "trust", "position", "health", "score", "state", "send", "validate"] -->

- [ ] **Client-authoritative state**: client sends its own position, health, score, or inventory to the server and the server accepts it without validation -- any value can be spoofed. The server must be the authority for all gameplay-critical state
- [ ] **No server-side movement validation**: server accepts client-reported position without checking against maximum movement speed and previous position -- enables speed hacks and teleportation
- [ ] **Client determines hit outcome**: client reports "I hit player X for Y damage" and the server records it -- the client can report hits that never happened. The server must verify hit detection from authoritative positions

### Prediction and Reconciliation
<!-- activation: keywords=["prediction", "reconciliation", "rollback", "rewind", "snapshot", "correction", "desync", "misprediction"] -->

- [ ] **Prediction without reconciliation**: client predicts local state (movement, actions) but never corrects when the server's authoritative state diverges -- the client and server desynchronize permanently
- [ ] **No rollback on misprediction**: when the server corrects the client, the client snaps to the corrected state instead of rolling back to the corrected state and re-simulating forward through buffered inputs -- causes visible teleporting
- [ ] **Snapshot buffer too small**: interpolation between server snapshots uses a buffer smaller than one round-trip time -- network jitter causes visible stuttering or extrapolation artifacts
- [ ] **No input delay buffer**: client sends inputs with no buffering -- network jitter causes inputs to arrive late, forcing the server to drop them or stall

### Lag Compensation
<!-- activation: keywords=["lag", "compensation", "rewind", "hitbox", "hit", "latency", "timestamp", "RTT", "ping"] -->

- [ ] **No lag compensation for hit detection**: server checks hits against current-time positions instead of rewinding to the shooting player's perceived time -- high-latency players cannot hit targets they visually aimed at
- [ ] **Unlimited rewind window**: lag compensation rewinds arbitrarily far into the past -- very high-latency or manipulated timestamps allow "shooting around corners" long after the target moved
- [ ] **Client timestamp not validated**: the server uses the client-supplied timestamp for rewind without sanity-checking against RTT -- clients can forge timestamps for unfair advantage

### ECS Architecture
<!-- activation: keywords=["ECS", "entity", "component", "system", "archetype", "world", "query", "sparse", "dense"] -->

- [ ] **Excessive archetype fragmentation**: unique component combinations create many archetypes with few entities each -- iteration performance degrades as systems traverse many small tables instead of few large ones
- [ ] **Component added/removed every frame**: adding or removing components in the hot loop forces archetype migrations every frame -- move entities between archetypes sparingly, or use flag components
- [ ] **System execution order undefined**: systems with data dependencies have no explicit ordering -- race conditions between systems produce frame-to-frame non-determinism

### Tick Rate and Synchronization
<!-- activation: keywords=["tick", "tick_rate", "tickrate", "sync", "frequency", "hertz", "Hz", "update_rate"] -->

- [ ] **Client/server tick rate mismatch without interpolation**: client updates at 60Hz and server at 20Hz with no interpolation between server states -- client-side movement appears choppy at the server's lower rate
- [ ] **Deterministic simulation with float non-determinism**: lockstep or rollback netcode requires deterministic simulation but uses floating-point operations that differ across platforms -- use fixed-point math or enforce operation ordering
- [ ] **State serialization includes redundant fields**: full game state sent every tick including unchanged fields -- use delta compression or only send changed state to reduce bandwidth

## Common False Positives

- **Visual-only interpolation**: smoothing camera position or particle effects with variable delta time is correct for rendering and should not be flagged as a physics error.
- **Turn-based games**: turn-based games do not need fixed timesteps, tick-rate management, or lag compensation. Flag only real-time systems.
- **Single-player offline**: games with no multiplayer do not need client-server authority, prediction, or reconciliation. Client-authoritative state is acceptable when there is no server.
- **UI animations**: UI tweens and transitions using frame delta time are cosmetic, not gameplay-affecting.

## Severity Guidance

| Finding | Severity |
|---|---|
| Client-authoritative gameplay state (position, health, score) | Critical |
| Physics tied to variable frame rate (no fixed timestep) | Critical |
| Hit detection without server-side lag compensation in competitive game | Important |
| Client prediction without server reconciliation | Important |
| Delta time not clamped (spiral of death risk) | Important |
| Input handling in render callback instead of fixed update | Important |
| Deterministic simulation using non-deterministic float ops | Important |
| ECS archetype fragmentation causing performance regression | Minor |
| Client/server tick rate mismatch without interpolation | Minor |
| Snapshot interpolation buffer undersized | Minor |

## See Also

- `principle-separation-of-concerns` -- simulation logic must be separated from rendering logic
- `principle-fail-fast` -- desync detection should halt and resync rather than accumulate drift

## Authoritative References

- [Glenn Fiedler, "Fix Your Timestep!"](https://gafferongames.com/post/fix_your_timestep/)
- [Glenn Fiedler, "Networked Physics"](https://gafferongames.com/categories/networked-physics/)
- [Gabriel Gambetta, "Fast-Paced Multiplayer" (Client-Server Game Architecture)](https://www.gabrielgambetta.com/client-server-game-architecture.html)
- [Valve Developer Community, "Source Multiplayer Networking"](https://developer.valvesoftware.com/wiki/Source_Multiplayer_Networking)
- [Unity ECS Documentation](https://docs.unity3d.com/Packages/com.unity.entities@latest)
- [GGPO Rollback Networking SDK](https://www.ggpo.net/)
