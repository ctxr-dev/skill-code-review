---
id: streaming-dns
type: index
depth_role: subcategory
depth: 1
focus: "/etc/hosts reliance in production bypassing DNS failover; AbortController/AbortSignal not wired to fetch or stream operations; Background jobs running more frequently than business need requires; Blocking read/write/accept on socket where epoll/kqueue/io_uring would scale"
parents:
  - "../index.md"
shared_covers: []
entries:
  - id: conc-async-cancellation
    file: conc-async-cancellation.md
    type: primary
    focus: Detect missing cancellation propagation, ignored cancel tokens, resource leaks on cancellation, and unstructured cancellation scopes.
    tags:
      - cancellation
      - async
      - context
      - CancellationToken
      - AbortController
      - timeout
      - cooperative-cancellation
  - id: db-connection-pooling
    file: db-connection-pooling.md
    type: primary
    focus: Detect database connection pooling pitfalls around pool sizing, leak detection, idle timeout, PgBouncer mode selection, HikariCP configuration, and connection-per-request anti-patterns
    tags:
      - connection-pool
      - pgbouncer
      - hikaricp
      - pool-sizing
      - leak-detection
      - idle-timeout
      - database-connection
      - c3p0
      - dbcp
      - sqlalchemy-pool
      - knex-pool
  - id: domain-gaming-anti-cheat
    file: domain-gaming-anti-cheat.md
    type: primary
    focus: Detect client-trusted game state, missing server-side validation of player actions, speed and teleport hack vectors, exploitable game economies, replay attacks, and leaderboard manipulation in game systems
    tags:
      - anti-cheat
      - cheat
      - exploit
      - server-authority
      - validation
      - game-security
      - speed-hack
      - wallhack
      - aimbot
      - economy
      - leaderboard
  - id: domain-real-time-crdt-ot-presence-websocket
    file: domain-real-time-crdt-ot-presence-websocket.md
    type: primary
    focus: Detect broken conflict resolution, presence leaks, unbounded document growth, and missing reconnection sync in real-time collaborative systems
    tags:
      - crdt
      - ot
      - operational-transform
      - presence
      - collaborative
      - real-time
      - websocket
      - Yjs
      - Automerge
      - ShareDB
      - conflict-resolution
      - cursor
  - id: perf-io-multiplexing-epoll-kqueue-io-uring
    file: perf-io-multiplexing-epoll-kqueue-io-uring.md
    type: primary
    focus: "Detect blocking I/O where async multiplexing would scale, wrong event loop model, io_uring submission queue issues, and epoll edge vs level trigger misuse"
    tags:
      - epoll
      - kqueue
      - io-uring
      - select
      - poll
      - event-loop
      - async
      - multiplexing
      - non-blocking
      - performance
  - id: qa-sustainability-green-software
    file: qa-sustainability-green-software.md
    type: primary
    focus: Detect unnecessary computation, oversized assets, missing caching for repeated expensive work, unnecessary network round-trips, idle resource consumption, and missing auto-scaling down
    tags:
      - sustainability
      - green-software
      - energy
      - efficiency
      - caching
      - polling
      - assets
      - optimization
      - scale-to-zero
  - id: reliability-load-shedding
    file: reliability-load-shedding.md
    type: primary
    focus: Detect missing admission control under overload, priority-unaware shedding, shedding of healthy requests, and absent queue depth monitoring
    tags:
      - load-shedding
      - admission-control
      - overload
      - priority
      - queue-depth
      - throttle
      - 503
      - capacity
  - id: http-streaming
    file: "http-streaming/index.md"
    type: index
    focus: "/etc/hosts reliance in production bypassing DNS failover; Breaking change in proto without version bump; Buffering layer defeating streaming purpose; CNAME chain too deep causing resolution latency and fragility"
children:
  - "http-streaming/index.md"
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Streaming Dns

**Focus:** /etc/hosts reliance in production bypassing DNS failover; AbortController/AbortSignal not wired to fetch or stream operations; Background jobs running more frequently than business need requires; Blocking read/write/accept on socket where epoll/kqueue/io_uring would scale

## Children

| File | Type | Focus |
|------|------|-------|
| [conc-async-cancellation.md](conc-async-cancellation.md) | 📄 primary | Detect missing cancellation propagation, ignored cancel tokens, resource leaks on cancellation, and unstructured cancellation scopes. |
| [db-connection-pooling.md](db-connection-pooling.md) | 📄 primary | Detect database connection pooling pitfalls around pool sizing, leak detection, idle timeout, PgBouncer mode selection, HikariCP configuration, and connection-per-request anti-patterns |
| [domain-gaming-anti-cheat.md](domain-gaming-anti-cheat.md) | 📄 primary | Detect client-trusted game state, missing server-side validation of player actions, speed and teleport hack vectors, exploitable game economies, replay attacks, and leaderboard manipulation in game systems |
| [domain-real-time-crdt-ot-presence-websocket.md](domain-real-time-crdt-ot-presence-websocket.md) | 📄 primary | Detect broken conflict resolution, presence leaks, unbounded document growth, and missing reconnection sync in real-time collaborative systems |
| [perf-io-multiplexing-epoll-kqueue-io-uring.md](perf-io-multiplexing-epoll-kqueue-io-uring.md) | 📄 primary | Detect blocking I/O where async multiplexing would scale, wrong event loop model, io_uring submission queue issues, and epoll edge vs level trigger misuse |
| [qa-sustainability-green-software.md](qa-sustainability-green-software.md) | 📄 primary | Detect unnecessary computation, oversized assets, missing caching for repeated expensive work, unnecessary network round-trips, idle resource consumption, and missing auto-scaling down |
| [reliability-load-shedding.md](reliability-load-shedding.md) | 📄 primary | Detect missing admission control under overload, priority-unaware shedding, shedding of healthy requests, and absent queue depth monitoring |
| [http-streaming/index.md](http-streaming/index.md) | 📁 index | /etc/hosts reliance in production bypassing DNS failover; Breaking change in proto without version bump; Buffering layer defeating streaming purpose; CNAME chain too deep causing resolution latency and fragility |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
