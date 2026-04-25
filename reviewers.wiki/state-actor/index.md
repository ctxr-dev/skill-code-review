---
id: state-actor
type: index
depth_role: subcategory
depth: 1
focus: "Actor hierarchy too flat -- no intermediate supervisors for fault isolation; Actor mailbox with no bounded capacity, growing until OOM under sustained load; Actor performing work in constructor before supervision is established; Actor state mutated from outside the actor (shared reference leak)"
parents:
  - "../index.md"
shared_covers: []
entries:
  - id: arch-state-machines
    file: arch-state-machines.md
    type: primary
    focus: Detect implicit state transitions, missing states, invalid transitions not rejected, and state explosion without hierarchical decomposition
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
  - id: conc-actor-model
    file: conc-actor-model.md
    type: primary
    focus: Detect unbounded mailboxes, shared mutable state between actors, blocking inside actors, and missing supervision in actor-based systems.
    tags:
      - actor
      - actor-model
      - akka
      - erlang
      - elixir
      - orleans
      - concurrency
      - supervision
      - mailbox
  - id: pattern-command
    file: pattern-command.md
    type: primary
    focus: Detect misuse, over-application, and absence of the Command pattern in operation-encapsulation code.
    tags:
      - command
      - behavioural-pattern
      - design-patterns
      - undo
      - redo
      - invoker
      - receiver
      - action
      - operation
      - queue
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# State Actor

**Focus:** Actor hierarchy too flat -- no intermediate supervisors for fault isolation; Actor mailbox with no bounded capacity, growing until OOM under sustained load; Actor performing work in constructor before supervision is established; Actor state mutated from outside the actor (shared reference leak)

## Children

| File | Type | Focus |
|------|------|-------|
| [arch-state-machines.md](arch-state-machines.md) | 📄 primary | Detect implicit state transitions, missing states, invalid transitions not rejected, and state explosion without hierarchical decomposition |
| [conc-actor-model.md](conc-actor-model.md) | 📄 primary | Detect unbounded mailboxes, shared mutable state between actors, blocking inside actors, and missing supervision in actor-based systems. |
| [pattern-command.md](pattern-command.md) | 📄 primary | Detect misuse, over-application, and absence of the Command pattern in operation-encapsulation code. |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
