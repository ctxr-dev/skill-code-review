---
id: domain-real-time-crdt-ot-presence-websocket
type: primary
depth_role: leaf
focus: Detect broken conflict resolution, presence leaks, unbounded document growth, and missing reconnection sync in real-time collaborative systems
parents:
  - index.md
covers:
  - Custom conflict resolution without formal CRDT or OT guarantees
  - Missing tombstones causing deleted items to reappear on sync
  - Presence state leaked to unauthorized users
  - WebSocket opened without authentication on connect
  - Missing reconnection with state sync after disconnect
  - Document state growing unbounded with no garbage collection
  - "Undo/redo broken under collaborative edits"
  - Causal ordering not maintained across peers
  - Server broadcast without authorization check per recipient
  - Missing heartbeat or keepalive causing silent disconnects
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
activation:
  file_globs:
    - "**/*crdt*"
    - "**/*collab*"
    - "**/*presence*"
    - "**/*websocket*"
    - "**/*socket*"
    - "**/*yjs*"
    - "**/*automerge*"
    - "**/*sharedb*"
    - "**/*ot.*"
    - "**/*operational*"
  keyword_matches:
    - CRDT
    - OT
    - operational transform
    - presence
    - collaborative
    - real-time
    - cursor
    - conflict
    - merge
    - Yjs
    - Automerge
    - ShareDB
    - WebSocket
    - socket
    - channel
    - Y.Doc
    - Awareness
    - syncProtocol
    - prosemirror-collab
  structural_signals:
    - websocket_upgrade_handler
    - crdt_merge_function
    - presence_broadcast
    - conflict_resolution_logic
source:
  origin: file
  path: domain-real-time-crdt-ot-presence-websocket.md
  hash: "sha256:4ff95026751a9f4fd77da8f0d00f2c8802571d635340659d9ed3f77e8a084a08"
---
# Real-Time CRDT / OT / Presence / WebSocket

## When This Activates

Activates on diffs involving CRDT libraries (Yjs, Automerge), operational transform (ShareDB, ot.js), presence/awareness protocols, WebSocket handlers, or custom collaborative editing logic. Real-time collaboration has deceptive correctness requirements: conflict resolution must guarantee convergence, presence must respect authorization boundaries, connections must survive network interruptions with state sync, and document state must be garbage-collected to prevent unbounded growth. Failures in these areas produce intermittent, hard-to-reproduce bugs -- documents diverge between users, deleted content reappears, or unauthorized users see cursor positions.

## Audit Surface

- [ ] Custom merge function without CRDT or OT convergence guarantee
- [ ] Deleted items reappear because tombstones are missing or expired
- [ ] Presence data visible to users without document access
- [ ] WebSocket upgrade accepted before auth token verification
- [ ] Client reconnects without requesting missed operations or state resync
- [ ] CRDT document size grows monotonically with no GC
- [ ] Undo stack broken under concurrent collaborative edits
- [ ] Operations applied out of causal order
- [ ] Server broadcasts to all sockets without per-user auth check
- [ ] No heartbeat/ping-pong -- dead connections leak resources
- [ ] WebSocket message size unbounded
- [ ] No rate limit on incoming WebSocket messages

## Detailed Checks

### Conflict Resolution Correctness
<!-- activation: keywords=["merge", "conflict", "resolve", "CRDT", "OT", "transform", "converge", "sync", "apply", "operation", "Y.Doc", "Automerge"] -->

- [ ] **Custom merge without formal model**: flag code that implements ad-hoc conflict resolution (last-write-wins on fields, manual three-way merge) without using a CRDT library or OT algorithm -- custom merge functions rarely guarantee convergence across all operation orderings
- [ ] **Missing tombstones**: flag delete operations that remove items from the data structure rather than marking them as deleted -- without tombstones, a concurrent insert-adjacent-to-deleted-item causes the deleted item to reappear on sync
- [ ] **Tombstone accumulation without GC**: flag CRDT implementations where tombstones are never garbage-collected -- over time, tombstones dominate document size; GC requires coordinating a snapshot across all peers
- [ ] **Causal ordering violated**: flag operation application that does not check causal dependencies (vector clocks, Lamport timestamps, or library-managed state vectors) -- applying an operation before its causal predecessor produces an inconsistent state

### Presence and Authorization
<!-- activation: keywords=["presence", "awareness", "cursor", "selection", "user", "broadcast", "auth", "permission", "room", "channel"] -->

- [ ] **Presence leaked to unauthorized users**: flag presence broadcasts (cursor position, selection, user identity) that go to all connected sockets in a room without verifying each recipient has read access to the document
- [ ] **WebSocket without auth on connect**: flag WebSocket upgrade handlers that do not verify an auth token (JWT, session cookie, ticket) before accepting the connection -- unauthenticated sockets can receive document updates
- [ ] **No auth revalidation on reconnect**: flag reconnection logic that reuses a stale token without revalidating -- a user's access may have been revoked since the original connection
- [ ] **Room join without permission check**: flag socket room/channel join that does not verify the user has access to the document associated with that room

### Reconnection and State Sync
<!-- activation: keywords=["reconnect", "resume", "offline", "sync", "state vector", "catch up", "missed", "disconnect", "retry", "backoff"] -->

- [ ] **No state sync on reconnect**: flag reconnection logic that reopens the WebSocket but does not request missed operations or a full state snapshot -- the client's local state diverges from the server after a disconnect
- [ ] **Missing state vector exchange**: flag Yjs/Automerge sync protocols that do not exchange state vectors on reconnect -- without the state vector, the server cannot determine which operations the client is missing
- [ ] **No exponential backoff on reconnect**: flag reconnection loops that retry immediately or at a fixed interval -- thundering herd after a server restart overwhelms the server
- [ ] **Offline edits discarded**: flag offline-capable editors that discard locally queued operations on reconnect instead of merging them -- user work is lost

### Document Growth and Performance
<!-- activation: keywords=["GC", "garbage", "compact", "snapshot", "size", "memory", "history", "prune", "truncate", "encode", "decode"] -->

- [ ] **Unbounded document history**: flag CRDT documents that retain full operation history with no compaction or snapshot mechanism -- document encoding size grows linearly with edit count, eventually causing slow load times and OOM
- [ ] **No periodic snapshot**: flag systems that always replay the full operation log on document open -- use periodic snapshots to bound load time
- [ ] **Large binary in CRDT**: flag CRDT documents used to store large binary blobs (images, files) inline -- binary data should be stored externally with only references in the CRDT
- [ ] **Undo/redo with concurrent edits**: flag undo implementations that naively reverse the last local operation without accounting for concurrent remote operations -- the undo may reverse a different user's edit or produce an invalid state

## Common False Positives

- **Well-tested CRDT libraries**: Yjs, Automerge, and Diamond Types provide convergence guarantees. Do not flag their internal merge logic -- flag only custom extensions or overrides of their conflict resolution.
- **Single-writer systems**: if the architecture guarantees a single writer per document (exclusive lock), CRDT/OT is unnecessary. Verify the single-writer invariant holds under all failure modes.
- **Ephemeral presence without persistence**: cursor positions that are purely ephemeral (not stored, not used for access decisions) have lower security impact. Still flag if leaked to unauthorized users.
- **Short-lived documents**: documents that exist only for the duration of a session (whiteboards, ephemeral pads) may tolerate unbounded growth. Flag only for long-lived documents.

## Severity Guidance

| Finding | Severity |
|---|---|
| Custom merge without convergence guarantee (documents diverge) | Critical |
| WebSocket accepts connections without authentication | Critical |
| Presence data leaked to unauthorized users | Critical |
| Missing tombstones -- deleted content reappears | Important |
| No state sync on reconnect -- client diverges after disconnect | Important |
| CRDT document grows unbounded with no GC or compaction | Important |
| Causal ordering not maintained across peers | Important |
| No heartbeat -- dead connections leak server resources | Minor |
| Undo/redo produces unexpected results with concurrent edits | Minor |
| No rate limit on incoming WebSocket messages | Minor |

## See Also

- `conc-race-conditions-data-races` -- concurrent edits without CRDT/OT are a data race at the document level
- `sec-owasp-a01-broken-access-control` -- presence leaks and unauthenticated WebSockets are access control failures
- `reliability-backpressure` -- WebSocket servers must handle slow consumers to prevent message queue growth
- `principle-fail-fast` -- reconnection without state sync silently produces diverged state instead of failing visibly

## Authoritative References

- [Martin Kleppmann et al., "A Conflict-Free Replicated JSON Datatype" (2017)](https://arxiv.org/abs/1608.03960)
- [Yjs Documentation, "Sync Protocol" and "Awareness Protocol"](https://docs.yjs.dev/)
- [Automerge Documentation, "Sync Protocol"](https://automerge.org/docs/)
- [Joseph Gentle, "Operational Transformation" (2010)](https://operational-transformation.github.io/)
- [IETF RFC 6455, "The WebSocket Protocol"](https://datatracker.ietf.org/doc/html/rfc6455)
