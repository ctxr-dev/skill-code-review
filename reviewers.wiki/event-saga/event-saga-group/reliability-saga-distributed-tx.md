---
id: reliability-saga-distributed-tx
type: primary
depth_role: leaf
focus: "Detect saga steps without compensation, missing timeouts, non-idempotent steps, volatile state, and orchestration/choreography discipline violations"
parents:
  - index.md
covers:
  - Saga step without a corresponding compensating transaction
  - Saga with no overall timeout allowing zombie transactions
  - Non-idempotent saga steps producing duplicate effects on redelivery
  - Saga execution state stored in memory only -- lost on crash
  - "Missing orchestrator or choreography discipline (hybrid confusion)"
  - Compensation failure silently dropped with no retry or escalation
  - Irreversible step placed early in saga with no compensating alternative
  - Ad-hoc distributed writes across services with no saga coordination
  - Saga step publishes events before local transaction commits
  - No observability into saga step progression or failure
  - Choreography with implicit event ordering assumptions between participants
  - "Orchestrator accumulating business logic from participants (god orchestrator)"
  - Missing compensation or rollback in choreography when a participant fails
  - Choreography with no way to trace the overall workflow state
  - Orchestrator directly calling participants synchronously instead of via commands
  - Mixing choreography and orchestration in the same workflow without clear boundaries
  - Choreography participant publishing events that encode control flow
  - Orchestrator with no timeout or dead participant detection
  - Missing idempotency in choreography participants
  - Orchestrator owning data that belongs to participants
  - Saga steps without compensating transactions leaving the system in an inconsistent state on failure
  - Saga mixing orchestration and choreography styles within the same transaction boundary
  - Non-idempotent saga steps that produce duplicated side effects on retry
  - Saga with no overall timeout or deadline allowing zombie transactions to run indefinitely
  - Missing saga where distributed writes span multiple services with no consistency mechanism
  - Saga state stored only in memory and lost on process crash or restart
  - Compensating transactions that are not commutative with concurrent forward steps
  - Saga orchestrator that is a single point of failure with no persistence
  - Missing saga participant that silently drops compensation requests
  - Forward step with irreversible side effect and no compensating alternative
  - Saga without observability into which step failed and which compensations ran
tags:
  - saga
  - distributed-transaction
  - compensation
  - orchestration
  - choreography
  - idempotent
  - timeout
  - consistency
  - workflow
  - event
  - command
  - architecture
  - microservices
aliases:
  - arch-choreography-vs-orchestration
  - pattern-saga
activation:
  file_globs:
    - "**/*.{java,kt,scala,cs,ts,js,py,rb,go,rs,ex,exs,yaml,yml}"
  keyword_matches:
    - saga
    - Saga
    - compensate
    - compensation
    - orchestrator
    - choreography
    - distributed transaction
    - rollback
    - workflow
    - step
    - process manager
    - temporal
    - durable execution
    - Eventuate
    - MassTransit
    - Axon
    - NServiceBus
  structural_signals:
    - saga_step_without_compensation
    - orchestrator_class
    - distributed_write_without_saga
source:
  origin: file
  path: reliability-saga-distributed-tx.md
  hash: "sha256:8b2ab4e9248110a2a780a732222d35965165f7ac21d148bc73fb59be4d063a6a"
---
# Saga and Distributed Transaction Coordination

## When This Activates

Activates when diffs introduce multi-step workflows across services, add saga frameworks (Temporal, Axon, MassTransit, Eventuate, NServiceBus, AWS Step Functions), define step/compensate method pairs, or perform writes across multiple services without coordination. This reviewer focuses on the reliability discipline of saga implementations -- ensuring every step has compensation, state survives crashes, steps are idempotent, and timeouts prevent zombies.

## Audit Surface

- [ ] Forward saga step has no matching compensation defined
- [ ] No overall timeout or deadline on saga execution
- [ ] Saga step handler is not idempotent
- [ ] Saga state stored in memory only
- [ ] Saga mixes orchestration and choreography styles
- [ ] Compensation failure not retried or escalated
- [ ] Irreversible step has no compensating strategy
- [ ] Service writes with no saga or consistency mechanism
- [ ] Saga step emits event before local transaction commits
- [ ] No logging or tracing of saga step transitions
- [ ] Compensation runs in wrong order
- [ ] No stale-saga watchdog for stuck sagas

## Detailed Checks

### Compensation Completeness
<!-- activation: keywords=["compensate", "compensation", "rollback", "undo", "reverse", "cancel", "refund", "saga", "step"] -->

- [ ] **Missing compensation**: saga defines steps A, B, C but only A and B have compensating actions -- if C fails, the system cannot fully roll back
- [ ] **Compensation assumes full completion**: compensation reverses the full effect of the forward step, but partial completion (3 of 5 items reserved) is not handled
- [ ] **Compensation not retried on failure**: compensation step fails (network error) and is not retried -- the system stays inconsistent with no recovery path
- [ ] **Wrong compensation order**: compensations run in forward order (A, B, C) instead of reverse (C, B, A) -- dependent state is not properly unwound
- [ ] **Irreversible step without strategy**: step sends email or captures payment with no semantic compensation (apology email, refund) and no acknowledgment that it is irreversible

### Timeout and Stale Saga Detection
<!-- activation: keywords=["timeout", "deadline", "expire", "stale", "zombie", "stuck", "watchdog", "TTL", "duration", "long-running"] -->

- [ ] **No saga-level timeout**: saga runs indefinitely if a participant is permanently down -- resources remain reserved and locks held
- [ ] **No per-step timeout**: individual step has no timeout -- a slow participant blocks the entire saga
- [ ] **Timeout fires with no action**: timeout marks saga as expired but does not trigger compensation or escalation
- [ ] **No stale-saga detector**: no periodic scan finds sagas stuck in intermediate state beyond expected duration

### Step Idempotency
<!-- activation: keywords=["idempotent", "retry", "duplicate", "redelivery", "at-least-once", "dedup", "key"] -->

- [ ] **Non-idempotent step in at-least-once system**: saga step inserts a record or charges a card without deduplication -- redelivery creates duplicates
- [ ] **No idempotency key per step invocation**: step handler has no mechanism to detect duplicate invocations from the saga orchestrator
- [ ] **Side effect on every invocation**: step sends notification on each call -- orchestrator retry multiplies notifications

### State Durability and Recovery
<!-- activation: keywords=["state", "memory", "persist", "store", "crash", "restart", "durable", "recovery", "database", "checkpoint"] -->

- [ ] **In-memory saga state**: saga tracks current step, completed steps, and compensation log in a local variable or dictionary -- process crash loses all progress
- [ ] **No recovery on startup**: saga state is persisted but no startup scan resumes or compensates incomplete sagas
- [ ] **State update not atomic with step completion**: step completes and then state is updated separately -- crash between the two creates inconsistency

### Orchestration vs Choreography Discipline
<!-- activation: keywords=["orchestrator", "choreography", "event", "command", "publish", "subscribe", "dispatch", "coordinator"] -->

- [ ] **Hybrid confusion**: some steps are command-driven by an orchestrator while others are event-triggered by choreography -- ownership of sequencing is split
- [ ] **Orchestrator listens to domain events**: orchestrator subscribes to generic domain events instead of receiving explicit step-completion replies -- cannot distinguish its saga's events from unrelated events
- [ ] **No single owner of progress**: in pure choreography, no participant tracks overall saga state -- a lost event stalls the saga with no detection

## Common False Positives

- **Saga frameworks with built-in guarantees**: Temporal, AWS Step Functions, Azure Durable Functions, MassTransit, and Axon Saga provide durable state, timeouts, and retry. Do not flag framework-managed infrastructure; flag only missing application logic (no compensation defined, non-idempotent handler).
- **Single-database transactions**: writes to multiple tables in one ACID transaction are not distributed transactions. Flag only cross-service or cross-database writes.
- **Eventual consistency by design**: some architectures accept temporary inconsistency with reconciliation. Do not flag if the contract is explicit and documented.
- **Workflow engines for pipelines**: Airflow, Prefect for data pipelines are not sagas. Flag only if the workflow mutates distributed state requiring consistency.

## Severity Guidance

| Finding | Severity |
|---|---|
| Distributed writes across services with no consistency mechanism | Critical |
| Forward step with no compensation defined | Critical |
| Saga state in memory only -- lost on crash | Important |
| Non-idempotent step in at-least-once environment | Important |
| No saga-level timeout (zombie saga risk) | Important |
| Compensation failure silently dropped | Important |
| Event emitted before local transaction commits | Important |
| Hybrid orchestration/choreography in same saga | Minor |
| No saga step transition logging | Minor |
| Compensation in forward order instead of reverse | Minor |

## See Also

- `pattern-saga` -- canonical saga pattern implementation guidance; this reviewer enforces the reliability discipline
- `reliability-idempotency` -- saga steps must be idempotent; cross-reference for idempotency key mechanics
- `reliability-timeout-deadline-propagation` -- saga timeout is a form of deadline; per-step timeouts must propagate
- `pattern-outbox` -- saga steps that publish events must use transactional outbox to avoid dual-write
- `reliability-exactly-once-semantics` -- saga steps need effectively-exactly-once processing via idempotent consumers
- `antipattern-distributed-monolith` -- ad-hoc distributed writes without saga are a distributed monolith signal
- `principle-fail-fast` -- compensation failures must be surfaced, not silently swallowed

## Authoritative References

- [Chris Richardson, *Microservices Patterns* (2018), Chapter 4: Sagas](https://microservices.io/patterns/data/saga.html)
- [Hector Garcia-Molina & Kenneth Salem, "Sagas" (1987)](https://www.cs.cornell.edu/andru/cs711/2002fa/reading/sagas.pdf)
- [Temporal.io Documentation: Saga Pattern](https://docs.temporal.io/encyclopedia/sagas)
- [Microsoft, Cloud Design Patterns: Compensating Transaction](https://learn.microsoft.com/en-us/azure/architecture/patterns/compensating-transaction)
