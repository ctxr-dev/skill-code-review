---
id: conc-actor-model
type: primary
depth_role: leaf
focus: Detect unbounded mailboxes, shared mutable state between actors, blocking inside actors, and missing supervision in actor-based systems.
parents:
  - index.md
covers:
  - Actor mailbox with no bounded capacity, growing until OOM under sustained load
  - "Blocking I/O or synchronous call inside an actor, stalling its message processing"
  - "Shared mutable state accessed by multiple actors, defeating the actor model's isolation"
  - Missing supervision strategy -- crashed actor is not restarted and messages are lost
  - Dead letter handling absent -- undeliverable messages vanish silently
  - Ask pattern with no timeout causing caller to hang indefinitely
  - Actor performing work in constructor before supervision is established
  - "Unbounded fan-out: actor spawns unlimited children under load"
  - "Actor state mutated from outside the actor (shared reference leak)"
  - Message serialization cost ignored in distributed actor systems
  - Actor hierarchy too flat -- no intermediate supervisors for fault isolation
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
activation:
  file_globs:
    - "**/*.{java,kt,scala,cs,erl,ex,exs,rs,swift,py,go,ts,js}"
  keyword_matches:
    - actor
    - Actor
    - ActorRef
    - ActorSystem
    - GenServer
    - GenStage
    - spawn
    - mailbox
    - message
    - tell
    - ask
    - receive
    - supervisor
    - Supervisor
    - Akka
    - Pekko
    - Orleans
    - Grain
    - Ractor
    - xactor
    - Actix
  structural_signals:
    - class_extending_actor
    - receive_match_block
    - supervisor_strategy_definition
source:
  origin: file
  path: conc-actor-model.md
  hash: "sha256:67f1a9bb045a6194c6621e0741a0b1f5d969a8db2b9506be4e935eec3adb8002"
---
# Actor Model

## When This Activates

Activates when diffs introduce actor-based concurrency using Akka/Pekko (JVM), Erlang/Elixir (OTP), Microsoft Orleans, Actix (Rust), or ad-hoc actor implementations with mailboxes and message passing. The actor model eliminates shared state by design, but production failures come from unbounded mailboxes, blocking inside actors, missing supervision, and accidental state sharing via mutable references in messages.

## Audit Surface

- [ ] Mailbox is bounded or uses a backpressure-aware dispatcher
- [ ] No blocking I/O (HTTP, DB, file, sleep) inside actor message handler
- [ ] All inter-actor communication is via immutable messages -- no shared mutable references
- [ ] Every actor has a supervision strategy (restart, stop, escalate)
- [ ] Dead letters are logged, monitored, or handled with a dead-letter actor
- [ ] Ask/request-response uses a finite timeout with error handling on timeout
- [ ] Actor constructor does not perform side effects before supervision is ready
- [ ] Child actor spawning is bounded under load (no unbounded fan-out)
- [ ] Outgoing messages do not contain mutable references to actor-internal state
- [ ] Messages are serializable if the actor system may be distributed
- [ ] Supervision hierarchy isolates failures -- one subsystem crash does not take down others
- [ ] Actor is not a god-actor handling dozens of unrelated message types
- [ ] State machine actors use stash/become correctly, not ad-hoc boolean flags
- [ ] Graceful shutdown protocol (poison pill, PoisonPill, stop) is implemented

## Detailed Checks

### Unbounded Mailbox and Backpressure
<!-- activation: keywords=["mailbox", "queue", "buffer", "bounded", "unbounded", "overflow", "backpressure", "dispatcher", "throughput", "OOM", "memory"] -->

- [ ] **Default unbounded mailbox**: Akka actors use the default unbounded mailbox -- under sustained load, the mailbox grows until the JVM is killed with OOM; configure a `BoundedMailbox` with `mailbox-push-timeout-time`
- [ ] **No backpressure from actor to producer**: upstream producer sends messages faster than the actor can process them, with no flow control -- use Akka Streams, GenStage (Elixir), or explicit ack-based protocols
- [ ] **Tell without checking actor liveness**: `actorRef.tell(msg)` succeeds even if the actor is stopped -- messages go to dead letters with no notification to the sender
- [ ] **Mailbox priority not set**: all messages have equal priority, but some (health checks, shutdown) should be processed before accumulated backlog

### Blocking Inside Actor
<!-- activation: keywords=["blocking", "block", "sleep", "I/O", "http", "database", "file", "await", "Future", "Thread.sleep", "sync", "jdbc", "query"] -->

- [ ] **Blocking I/O in receive**: actor calls JDBC, HTTP client, or file I/O synchronously inside `receive` -- the actor's thread is blocked, preventing it (and potentially other actors on the same dispatcher) from processing messages
- [ ] **Await inside actor**: `Await.result(future)` inside an Akka actor blocks the dispatcher thread -- use `pipeTo(self)` to pipe the future result back as a message
- [ ] **Thread.sleep in actor**: explicit sleep inside message handler blocks the actor and its dispatcher thread -- use `context.system.scheduler.scheduleOnce` or timers
- [ ] **GenServer blocking call**: Elixir GenServer `handle_call` performs a long synchronous operation -- the calling process is blocked for the duration; use `handle_cast` + reply or `Task.async`

### Shared Mutable State Between Actors
<!-- activation: keywords=["shared", "mutable", "state", "reference", "ref", "var", "global", "static", "singleton", "concurrent", "leak"] -->

- [ ] **Mutable object in message**: actor sends a message containing a mutable reference (list, map, builder) -- both sender and receiver can modify it concurrently, creating a data race that the actor model is designed to prevent
- [ ] **Global mutable singleton**: actors access a shared mutable singleton (cache, registry) outside the actor system -- this reintroduces shared-state concurrency bugs
- [ ] **Actor state leaked via closure**: a closure or callback captures the actor's mutable state and is passed to another thread or actor -- mutations via the closure race with the actor's own message processing
- [ ] **ActorRef stored with mutable context**: `ActorRef` is safe to share, but code stores it alongside mutable data in a shared structure -- the mutable data creates the race, not the ref

### Supervision and Fault Handling
<!-- activation: keywords=["supervisor", "Supervisor", "supervision", "restart", "stop", "escalate", "resume", "strategy", "OneForOne", "AllForOne", "crash", "failure", "fault"] -->

- [ ] **No supervisor**: actor is created as a top-level actor with no supervision strategy -- if it crashes, it stays dead and all subsequent messages are lost
- [ ] **Restart without state recovery**: supervisor restarts a crashed actor, but the new instance starts with empty state -- accumulated state (caches, counters, in-progress work) is lost
- [ ] **AllForOne when OneForOne suffices**: all children are restarted when one fails, but the children are independent -- unnecessary restarts disrupt unrelated work
- [ ] **Supervision escalation infinite loop**: actor escalates to parent, parent escalates to grandparent, all the way to the guardian -- the entire actor system restarts on a single actor failure
- [ ] **Deferred failure detection**: actor silently swallows exceptions in `receive` and continues with corrupted state instead of crashing and letting the supervisor restart it with clean state

### Dead Letters and Lifecycle
<!-- activation: keywords=["dead", "letter", "DeadLetter", "unhandled", "undeliverable", "stop", "terminate", "poison", "PoisonPill", "graceful", "shutdown", "lifecycle", "preStart", "postStop"] -->

- [ ] **Dead letters unmonitored**: messages to stopped actors go to the dead letter office, but no one subscribes to `DeadLetter` events -- lost messages are invisible in production
- [ ] **Unhandled message ignored**: actor's `receive` does not match an incoming message type -- in Akka, it goes to `unhandled()` which publishes to the event stream; in Erlang, it stays in the mailbox forever, leaking memory
- [ ] **Missing preStart/postStop**: actor acquires resources (connections, file handles) but does not release them in `postStop`/`terminate` -- resources leak on actor restart or stop
- [ ] **Graceful shutdown missing**: actor system is shut down abruptly, discarding all in-flight messages -- use coordinated shutdown or drain the mailbox before stopping

## Common False Positives

- **Framework-managed supervision**: Erlang/OTP supervision trees and Akka typed behaviors provide built-in supervision. Do not flag "missing supervisor" when the framework's default supervision is active and appropriate.
- **Immutable messages by language**: Erlang terms are immutable by construction; Scala case classes are immutable by convention. Do not flag message mutability in languages where it is structurally impossible.
- **Virtual actors (Orleans grains)**: Orleans manages activation, deactivation, and placement automatically. Do not flag missing lifecycle management unless the grain holds external resources.
- **Test actors**: test probes and mock actors in test kits do not need supervision or bounded mailboxes.
- **Logging actors**: dedicated logging actors with unbounded mailboxes are acceptable if the alternative is blocking the caller for log writes.

## Severity Guidance

| Finding | Severity |
|---|---|
| Unbounded mailbox in production actor handling external input | high |
| Blocking I/O inside actor message handler | high |
| Mutable object shared between actors via message or closure | high |
| No supervision -- crashed actor stays dead, messages lost | high |
| Ask pattern without timeout in request path | high |
| Actor state leaked via closure to another thread | medium |
| Dead letters unmonitored in production actor system | medium |
| Supervision restarts all children (AllForOne) when only one failed | medium |
| Unhandled message stays in Erlang mailbox forever (memory leak) | medium |
| Missing preStart/postStop resource cleanup | medium |
| God-actor handling too many unrelated message types | low |
| Messages not serializable in potentially-distributable actor system | low |

## See Also

- `pattern-active-object` -- active objects are single-actor structures; the same mailbox, lifecycle, and error concerns apply
- `conc-csp-channels` -- CSP channels are the alternative to actor mailboxes; compare trade-offs for the communication model
- `conc-structured-concurrency` -- actors are long-lived; structured concurrency is task-scoped; verify which model fits the workload
- `pattern-producer-consumer` -- actor mailbox is a producer-consumer queue; verify capacity and backpressure
- `principle-immutability-by-default` -- immutable messages are the foundation of actor safety; mutable messages defeat the model
- `principle-encapsulation` -- actor state must be fully encapsulated; external access breaks the isolation guarantee

## Authoritative References

- [Carl Hewitt, "A Universal Modular ACTOR Formalism for Artificial Intelligence" (1973)](https://dl.acm.org/doi/10.5555/1624775.1624804)
- [Akka Documentation: Actor Model](https://doc.akka.io/docs/akka/current/typed/actors.html)
- [Erlang/OTP Design Principles: Supervision](https://www.erlang.org/doc/design_principles/sup_princ.html)
- [Joe Armstrong, *Programming Erlang* (2nd ed., 2013)](https://pragprog.com/titles/jaerlang2/)
- [Microsoft Orleans Documentation](https://learn.microsoft.com/en-us/dotnet/orleans/)
