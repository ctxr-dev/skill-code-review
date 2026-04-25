---
id: arch-state-machines
type: primary
depth_role: leaf
focus: Detect implicit state transitions, missing states, invalid transitions not rejected, and state explosion without hierarchical decomposition
parents:
  - index.md
covers:
  - State transition happening implicitly through field mutation instead of explicit transition
  - Missing states -- real-world state not represented in the state machine
  - Invalid state transitions accepted without validation or rejection
  - State explosion without hierarchical or parallel state decomposition
  - Boolean flags used instead of explicit states
  - Transition side effects not associated with the transition itself
  - "Missing terminal/final states -- state machine can run forever"
  - State machine with no initial state definition
  - Guard conditions scattered across codebase instead of on transitions
  - "State machine reimplemented with ad-hoc if/else chains"
  - "State transitions handled by if/else chains instead of state objects"
  - Illegal state transitions not validated, allowing impossible state sequences
  - State objects with knowledge of all other states, creating tight coupling
  - Missing state pattern where boolean flags proliferate to track mode
  - State objects that mutate shared context unsafely during transitions
  - "Transition side effects (notifications, logging) inconsistently applied across states"
  - "Missing terminal/error state leaving the machine stuck in undefined behavior"
  - Context exposes state-specific methods that are invalid in certain states
  - State objects holding mutable instance state that leaks between transitions
  - State pattern applied where a simple enum and switch suffices
tags:
  - state-machine
  - FSM
  - state
  - transition
  - guard
  - statechart
  - architecture
  - correctness
  - behavioral-pattern
  - design-patterns
  - fsm
  - lifecycle
  - workflow
aliases:
  - pattern-state
activation:
  file_globs:
    - "**/*state*"
    - "**/*machine*"
    - "**/*status*"
    - "**/*workflow*"
    - "**/*fsm*"
    - "**/*transition*"
    - "**/*statechart*"
  keyword_matches:
    - state
    - machine
    - status
    - transition
    - guard
    - FSM
    - statechart
    - XState
    - state_machine
    - enum
    - initial
    - final
  structural_signals:
    - state_enum_definition
    - transition_function
    - state_machine_config
source:
  origin: file
  path: arch-state-machines.md
  hash: "sha256:4ba350dafff4979645d0e70d7be33dd6b4ff9d815977b74e24dd44180b758f99"
---
# State Machines

## When This Activates

Activates on diffs involving status fields, state enums, transition functions, workflow state management, or state machine configurations. State machines formalize the states an entity can be in and the valid transitions between them. When implemented properly, they prevent invalid states, document the lifecycle, and centralize transition logic. When implemented poorly -- through direct field mutation, ad-hoc if/else chains, or boolean flag combinations -- they allow invalid transitions, miss states, and scatter guard logic. This reviewer detects diff-visible signals of state machine violations.

## Audit Surface

- [ ] Status field changed by direct assignment without transition validation
- [ ] Real-world state (e.g., 'pending_review', 'partially_shipped') absent from state enum
- [ ] setState() or status assignment with no check for valid current state
- [ ] State enum with 15+ values and no hierarchical grouping
- [ ] Multiple boolean flags representing what should be a single state field
- [ ] Side effect (email, charge, notification) triggered by polling state rather than on transition
- [ ] No terminal or final state defined -- process has no defined end
- [ ] State machine constructor or factory with no explicit initial state
- [ ] Guard condition (if order.isPaid && order.isShipped) in business logic instead of on transition
- [ ] If/else or switch chain with 8+ branches on a status field
- [ ] State transition possible but not tested
- [ ] Concurrent state modification without conflict detection

## Detailed Checks

### Explicit Transitions
<!-- activation: keywords=["status", "state", "transition", "set", "assign", "update", "change", "move", "advance"] -->

- [ ] **Direct status mutation**: flag code that assigns a status field directly (`order.status = 'shipped'`) without going through a transition function that validates the current state -- direct mutation bypasses transition rules
- [ ] **Missing transition validation**: flag setState or status update methods that accept any target state without checking whether the transition from the current state is valid -- invalid transitions corrupt entity lifecycle
- [ ] **Transition without recording**: flag state transitions that do not record when and why the transition occurred -- transition history is essential for audit and debugging
- [ ] **Concurrent transition conflict**: flag state transitions with no optimistic locking, version check, or compare-and-swap -- concurrent transitions can overwrite each other, producing impossible state sequences

### Missing and Incomplete States
<!-- activation: keywords=["enum", "status", "state", "pending", "active", "complete", "cancel", "error", "partial", "review"] -->

- [ ] **Missing intermediate state**: flag workflows where real-world intermediate states (pending_review, partially_shipped, awaiting_approval) are not represented in the state enum -- business processes skipping these states lose visibility
- [ ] **Boolean flag combination as state**: flag entities using multiple boolean flags (isPaid, isShipped, isRefunded) that represent combinations better modeled as explicit states -- N booleans create 2^N implicit states, most of which are invalid
- [ ] **Missing error/failure state**: flag state machines with no error, failed, or rejected state -- every process can fail, and the state machine must represent that
- [ ] **Missing terminal state**: flag state machines with no final or terminal state -- without a defined end, processes run indefinitely or leak resources

### Guard Conditions
<!-- activation: keywords=["guard", "condition", "check", "validate", "if", "can", "allow", "eligible", "permitted"] -->

- [ ] **Scattered guard logic**: flag guard conditions (business rule checks that determine whether a transition is allowed) implemented in controllers, services, or UI code instead of on the transition definition itself -- guards belong on the transition
- [ ] **Missing guard on dangerous transition**: flag transitions to critical states (cancelled, refunded, deleted) with no guard condition -- destructive transitions should always be guarded
- [ ] **Duplicate guard logic**: flag the same guard condition reimplemented in multiple places (API handler, service, UI) -- centralize on the transition

### State Explosion
<!-- activation: keywords=["state", "enum", "count", "hierarchy", "parallel", "nested", "composite", "substates", "region"] -->

- [ ] **Flat state explosion**: flag state enums or configurations with 15+ states and no hierarchical grouping -- large flat state machines become unmaintainable; use hierarchical or parallel states (statecharts)
- [ ] **Combinatorial state**: flag entities where the effective state is the combination of multiple independent fields (orderStatus x paymentStatus x shippingStatus) without a formal composite state model -- use parallel (orthogonal) regions
- [ ] **Missing hierarchical decomposition**: flag complex state machines that could benefit from substates (e.g., "Active" containing "InProgress" and "Paused" as substates) but use flat enumeration instead

### Ad-Hoc State Machine Implementation
<!-- activation: keywords=["if", "else", "switch", "case", "status", "state", "==", "===", "equals", "match"] -->

- [ ] **If/else chain as state machine**: flag methods with 8+ if/else or switch/case branches on a status field -- this is an implicit state machine that should be made explicit with a transition table or state machine library
- [ ] **Scattered transition logic**: flag state-dependent behavior spread across multiple files or methods instead of centralized in a state machine definition -- scattered logic makes it impossible to reason about valid transitions
- [ ] **Side effects triggered by polling**: flag code that polls a status field and triggers side effects (send email when status == 'approved') instead of triggering side effects as part of the transition -- polling misses rapid transitions and introduces timing bugs

### Transition Side Effects
<!-- activation: keywords=["effect", "action", "entry", "exit", "on", "transition", "trigger", "notify", "email", "event"] -->

- [ ] **Side effect not on transition**: flag side effects (emails, events, notifications) triggered by checking current state rather than being fired as part of the transition -- associating effects with transitions ensures they fire exactly once
- [ ] **Missing entry/exit actions**: flag state machine configurations where cleanup or setup that should happen on entering or leaving a state is performed externally -- use entry/exit actions on the state definition
- [ ] **Transition side effect failure not handled**: flag transitions where a side effect failure (email send fails) leaves the entity in the new state with no compensation or retry -- decide whether to roll back the transition or retry the effect

## Common False Positives

- **Simple two-state toggle**: entities with only two states (active/inactive, enabled/disabled) do not need a formal state machine library. Direct assignment with a simple validation check is sufficient.
- **Enum status without lifecycle**: status enums that classify entities (type, category, priority) but do not represent a lifecycle with transitions are not state machines.
- **Framework-managed state**: ORM lifecycle callbacks (before_save, after_create) that manage entity status transitions are a form of state management. Flag only when the callbacks bypass transition validation.
- **UI component state**: local UI component state (open/closed, loading/loaded/error) managed by a framework (React useState, XState) is typically correct. Flag only cross-component shared state.

## Severity Guidance

| Finding | Severity |
|---|---|
| Direct status mutation bypassing transition validation | Critical |
| Invalid state transition accepted without rejection | Critical |
| Multiple boolean flags representing combinatorial state | Critical |
| Missing error or failure state in the state machine | Important |
| If/else chain with 8+ branches on status field (implicit state machine) | Important |
| Guard conditions scattered across codebase instead of on transitions | Important |
| Concurrent state modification with no conflict detection | Important |
| State enum with 15+ flat states and no hierarchy | Minor |
| Side effect triggered by polling state rather than on transition | Minor |
| Missing terminal state in the state machine | Minor |

## See Also

- `principle-solid` -- Open/Closed: adding a new state should not require modifying existing transition logic; state machines enable this through declarative transition tables
- `arch-workflow-engines-temporal-cadence` -- workflow engines formalize long-running state machines with durable execution
- `arch-choreography-vs-orchestration` -- orchestrated workflows are state machines; choreography distributes the state machine across participants
- `principle-fail-fast` -- rejecting invalid transitions is a fail-fast principle; silent acceptance allows corruption
- `antipattern-big-ball-of-mud` -- scattered transition logic across the codebase is a structural smell

## Authoritative References

- [David Harel, "Statecharts: A Visual Formalism for Complex Systems" (1987)](https://www.sciencedirect.com/science/article/pii/0167642387900359)
- [XState Documentation -- Statecharts and State Machines](https://xstate.js.org/docs/)
- [Martin Fowler, "State Machine" (2004)](https://martinfowler.com/eaaDev/state-machine.html)
- [Gamma et al., *Design Patterns* (1994), State Pattern](https://www.oreilly.com/library/view/design-patterns-elements/0201633612/)
- [Ian Horrock, *Constructing the User Interface with Statecharts* (1999)](https://www.amazon.com/Constructing-User-Interface-Statecharts-Horrocks/dp/0201342782)
