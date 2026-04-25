---
id: pattern-memento
type: primary
depth_role: leaf
focus: "Detect misuse, over-application, and absence of the Memento pattern in state-snapshot and undo/redo code."
parents:
  - index.md
covers:
  - Mementos that expose internal state, breaking originator encapsulation
  - Mementos holding references to mutable objects, causing snapshot corruption
  - Unbounded memento history leading to memory leaks or OOM
  - Memento restore that leaves the originator in an inconsistent intermediate state
  - Missing memento where undo is implemented by re-computing from scratch
  - Caretaker inspecting or modifying memento contents it should treat as opaque
  - "Memento that captures too much state (entire object graph) when a delta would suffice"
  - "Memento serialization that breaks when the originator's class evolves"
  - Shared memento instances reused across multiple restore operations causing aliasing bugs
  - Memento without timestamp or ordering metadata making history navigation unreliable
tags:
  - memento
  - behavioural-pattern
  - design-patterns
  - undo
  - redo
  - snapshot
  - state
  - history
  - checkpoint
activation:
  file_globs:
    - "**/*.{java,kt,scala,cs,ts,js,py,rb,go,rs,swift,cpp,h,hpp,php}"
  keyword_matches:
    - Memento
    - memento
    - snapshot
    - undo
    - redo
    - history
    - save
    - restore
    - checkpoint
    - rollback
    - backup
    - caretaker
    - originator
    - version
  structural_signals:
    - class_with_save_and_restore_methods
    - stack_of_state_objects
    - undo_redo_method_pair
source:
  origin: file
  path: pattern-memento.md
  hash: "sha256:9600e64f1501f3bf5d8036437dde38066688dafd902047187d65cf1de3eaeb69"
---
# Memento Pattern

## When This Activates

Activates when diffs introduce classes that capture and externalize an object's internal state, add undo/redo stacks or history management, implement `save()`/`restore()` or `createMemento()`/`setMemento()` pairs, or add snapshot, checkpoint, or rollback mechanisms. The Memento pattern preserves encapsulation while enabling state restoration, but it breaks down when mementos leak internal state, hold mutable references that corrupt snapshots, or accumulate unboundedly.

## Audit Surface

- [ ] Memento class is opaque to the caretaker -- no public getters, setters, or fields expose originator internals
- [ ] Memento stores deep copies of mutable state, not references to the originator's live objects
- [ ] History collection has a bounded size with an eviction policy (LRU, max count, max age)
- [ ] Restore operation is atomic -- the originator is never left in a half-restored state if an error occurs
- [ ] Undo/redo uses saved snapshots, not expensive re-computation from initial state
- [ ] Caretaker treats mementos as opaque tokens -- it stores and retrieves but never reads or modifies contents
- [ ] Memento captures only the state that actually changes, not the entire object graph unnecessarily
- [ ] Memento format is versioned or has a compatibility strategy for class evolution
- [ ] Each history entry holds a distinct memento instance -- no aliased references between entries
- [ ] Mementos have ordering metadata (sequence number, timestamp) for reliable history navigation
- [ ] createMemento() and restore() are symmetric -- every field saved is restored and vice versa
- [ ] Sensitive state in mementos is protected (encrypted, access-controlled) when persisted or serialized
- [ ] Redo stack is cleared when a new action is performed (standard undo/redo contract)
- [ ] Memento creation on hot paths is profiled for performance impact
- [ ] Memento pattern is not over-applied to simple value objects where immutable copies suffice

## Detailed Checks

### Encapsulation Violations
<!-- activation: keywords=["Memento", "memento", "snapshot", "state", "get", "set", "public", "field", "expose", "access"] -->

- [ ] **Public state accessors**: memento class has `getX()`/`setX()` methods or public fields that allow the caretaker or any other class to inspect or modify the originator's saved state -- the memento should be opaque
- [ ] **Wide memento interface**: memento exposes a "wide" interface to all classes instead of a narrow interface to the caretaker (opaque) and a wide interface only to the originator -- use inner classes or package-private access to enforce this
- [ ] **Caretaker reads memento**: caretaker code inspects memento contents to make decisions (e.g., comparing states, displaying state details) -- the caretaker should only store and pass mementos back to the originator
- [ ] **Memento as DTO**: memento is used as a data transfer object passed across layers, exposing internal state to code that should not know about it
- [ ] **Serialized memento as API**: memento is serialized to JSON/XML and exposed through an API, making the originator's internal structure part of the public contract

### Mutable Reference Corruption
<!-- activation: keywords=["reference", "copy", "clone", "deep", "shallow", "mutable", "list", "map", "collection", "array", "object"] -->

- [ ] **Shallow copy of collections**: memento stores a reference to the originator's mutable list, map, or set -- modifying the originator after snapshot creation corrupts the memento
- [ ] **Shared mutable domain objects**: memento holds references to domain entities that continue to be mutated by the originator -- the snapshot silently changes
- [ ] **Array reference sharing**: memento stores the originator's array reference without copying -- subsequent originator modifications alter the "saved" state
- [ ] **Nested mutable objects**: memento deep-copies the top-level collection but its elements contain mutable fields that are still shared -- partial deep copy
- [ ] **Restore reference aliasing**: restoring from a memento sets the originator's fields to the memento's references, causing the originator and memento to share mutable state post-restore -- subsequent changes corrupt the memento for future restores

### Unbounded History (Memory Leak)
<!-- activation: keywords=["history", "stack", "list", "undo", "redo", "push", "add", "store", "save", "queue", "buffer"] -->

- [ ] **No size limit**: undo/redo stack or history list grows without bound as the user performs actions -- in long-running applications this causes OOM
- [ ] **No eviction policy**: old mementos are never removed -- implement LRU eviction, maximum count, or maximum age
- [ ] **Large memento payloads**: each memento captures the entire object graph (megabytes per snapshot) and hundreds accumulate -- use delta/incremental mementos for large state
- [ ] **Memento retains external resources**: memento holds references to file handles, database connections, or streams that are never released when the memento is evicted
- [ ] **History survives scope**: memento history persists after the feature or dialog that created it is closed -- the history should be scoped to the originator's lifecycle
- [ ] **No monitoring**: no metrics or logging track history size, making unbounded growth invisible until OOM

### Inconsistent Restore
<!-- activation: keywords=["restore", "set", "apply", "rollback", "revert", "undo", "load", "recover"] -->

- [ ] **Partial restore**: restore sets originator fields one at a time; if an exception occurs mid-way, the originator is left in a state that is neither the current nor the saved state
- [ ] **Asymmetric save/restore**: createMemento() saves fields A, B, C but restore() only sets A and B -- field C is stale after restore
- [ ] **Observer notification during restore**: originator fires change events for each field set during restore, triggering cascading updates from intermediate states -- batch or suppress notifications until restore completes
- [ ] **Invariant violation**: restoring individual fields temporarily breaks class invariants (e.g., start > end) before all fields are set -- validate invariants only after full restore
- [ ] **Side-effect replay**: restore triggers side effects (database writes, network calls) that should only occur on forward execution, not on undo
- [ ] **Redo stack corruption**: performing undo does not properly push the current state onto the redo stack, making redo impossible or restoring to the wrong state

### Missing Memento
<!-- activation: keywords=["undo", "redo", "rollback", "revert", "history", "replay", "recompute", "rebuild", "recalculate"] -->

- [ ] **Re-computation undo**: undo is implemented by discarding all state and replaying every action from the beginning -- this is O(n) in the number of actions and becomes prohibitively slow
- [ ] **Manual field backup**: code saves individual fields to local variables before an operation and restores them in a catch block -- this is ad-hoc memento without the pattern's guarantees
- [ ] **Serialization-based snapshot**: the entire object is serialized to JSON/XML for undo -- this is expensive, fragile to schema changes, and exposes internal state
- [ ] **Database-as-undo**: every state change is written to a database and undo reads back the previous row -- appropriate for persistence but excessive for in-memory undo
- [ ] **No undo capability**: users can perform destructive operations with no undo mechanism, and the domain has clear undo requirements (editors, forms, wizards, configuration tools)

### Over-Applied Memento
<!-- activation: keywords=["Memento", "memento", "snapshot", "simple", "immutable", "value", "record", "copy"] -->

- [ ] **Immutable originator**: the originator is already immutable or uses value objects -- "saving state" is just keeping a reference to the previous immutable instance, and the full memento apparatus adds no value
- [ ] **Single-field undo**: undo only needs to restore a single primitive value -- a local variable or a simple stack of values is clearer than a full memento class hierarchy
- [ ] **Command pattern fit**: operations are well-defined and invertible -- the Command pattern with undo() is a better fit than capturing entire state snapshots

## Common False Positives

- **ORM / persistence snapshots**: frameworks like Hibernate dirty-checking or EF Core change tracking capture entity state for persistence purposes. These are infrastructure mechanisms, not application-level memento misuse.
- **Event sourcing**: event-sourced systems rebuild state by replaying events. This is an architectural pattern, not a missing memento -- the event log is the history mechanism.
- **Immutable data structures (persistent collections)**: functional languages and libraries (Clojure, Immutable.js) use structural sharing for efficient snapshots. These are not mementos; they are a fundamentally different approach to state management.
- **Version control / audit logs**: systems that maintain a full audit trail in a database are implementing business requirements, not the memento pattern.
- **React state / Redux time-travel**: UI frameworks that support time-travel debugging have their own state management idioms that should not be flagged as memento misuse.

## Severity Guidance

| Finding | Severity |
|---|---|
| Memento stores mutable references that get silently corrupted after save | high |
| Restore leaves originator in inconsistent partial state on error | high |
| Unbounded memento history causing OOM in long-running application | high |
| Memento exposes originator's internal state via public accessors | medium |
| Caretaker reads or modifies memento contents, breaking encapsulation contract | medium |
| createMemento() and restore() are asymmetric (field mismatch) | medium |
| Undo implemented by full re-computation, O(n) in action count | medium |
| Redo stack not cleared on new action, causing unexpected redo behavior | medium |
| Memento captures entire object graph when only a few fields changed | low |
| Full memento class hierarchy for a single-field undo | low |
| Memento has no ordering metadata (timestamp or sequence number) | low |

## See Also

- `principle-encapsulation` -- the memento pattern exists to preserve encapsulation during state externalization; exposing memento contents defeats this purpose
- `pattern-command` -- commands with undo() are an alternative to memento when operations are invertible; memento is preferred when state is complex and operations are not easily invertible
- `principle-solid` -- wide memento interfaces violate ISP; mementos coupled to concrete originator internals violate DIP
- `principle-immutability-by-default` -- immutable originator state eliminates the need for deep-copy mementos entirely

## Authoritative References

- [Erich Gamma et al., *Design Patterns: Elements of Reusable Object-Oriented Software* (1994), Memento](https://www.oreilly.com/library/view/design-patterns-elements/0201633612/)
- [Robert C. Martin, *Agile Software Development* (2002), Chapter 33: Memento Pattern](https://www.oreilly.com/library/view/agile-software-development/0135974445/)
- [Eric Freeman et al., *Head First Design Patterns* (2nd ed., 2020), Memento Pattern](https://www.oreilly.com/library/view/head-first-design/9781492077992/)
- [Joshua Bloch, *Effective Java* (3rd ed., 2018), Item 50: Make defensive copies when needed](https://www.oreilly.com/library/view/effective-java/9780134686097/)
