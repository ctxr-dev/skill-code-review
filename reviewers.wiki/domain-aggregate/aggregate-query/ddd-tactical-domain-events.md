---
id: ddd-tactical-domain-events
type: primary
depth_role: leaf
focus: "Detect domain events carrying too much data (god events), events not named in past tense, mutable events, and missing events for significant domain state changes."
parents:
  - index.md
  - "../../event-saga/event-saga-group/index.md"
covers:
  - "Event carrying entire aggregate state instead of minimal relevant data (god event)"
  - Event not named in past tense describing what happened
  - Event with mutable fields or setter methods
  - Significant domain state change with no corresponding event published
  - Event used for command-style orchestration instead of notification
  - Event handler modifying the event object
  - "Event without a timestamp or causation/correlation metadata"
  - Event schema tightly coupled to aggregate internal structure
tags:
  - domain-events
  - ddd
  - tactical-design
  - event-driven
  - cqrs
  - event-sourcing
  - domain-driven-design
activation:
  file_globs:
    - "**/*event*"
    - "**/*Event*"
    - "**/*message*"
    - "**/*publish*"
    - "**/*emit*"
    - "**/*handler*"
    - "**/*listener*"
    - "**/*subscriber*"
  keyword_matches:
    - event
    - Event
    - publish
    - emit
    - raise
    - dispatch
    - handler
    - listener
    - subscriber
    - occurred
    - happened
    - domain event
  structural_signals:
    - event_class
    - event_publication
    - event_handler
source:
  origin: file
  path: ddd-tactical-domain-events.md
  hash: "sha256:663ab9024d79d7db9e72a951923ea98f9323f1c24f5e906db2f520bceab4ddef"
---
# Tactical Domain Events

## When This Activates

Activates on diffs involving event classes, event publishers, event handlers, or aggregate methods that change state without emitting events. Domain events represent something significant that happened in the domain -- they are facts in past tense. They enable loose coupling between aggregates, support eventual consistency, and are the backbone of event-driven and event-sourced architectures. The most common violations are god events that carry entire aggregate snapshots (creating tight coupling between producer and consumer), events named as commands (confusing intent with fact), and mutable events (events are historical records and must not change after creation).

## Audit Surface

- [ ] Event class with 10+ fields or containing a full aggregate snapshot
- [ ] Event named as a command (CreateOrder, ProcessPayment) instead of past tense (OrderCreated, PaymentProcessed)
- [ ] Event class with setter methods or non-final mutable fields
- [ ] Aggregate state transition method that does not publish a domain event
- [ ] Event handler that modifies the event object before or after processing
- [ ] Event class missing timestamp, event ID, or aggregate ID
- [ ] Event handler performing a command (creating/modifying another aggregate) synchronously
- [ ] Event payload containing nested entity objects instead of IDs and summary data
- [ ] Event class with the same fields as the aggregate it represents (1:1 copy)
- [ ] Domain-significant action (approval, cancellation, escalation) with no event emitted
- [ ] Event published from outside the aggregate (from a service instead of the aggregate root)
- [ ] Event handler with complex branching logic that belongs in a domain or application service

## Detailed Checks

### Event Naming
<!-- activation: keywords=["event", "Event", "class ", "interface ", "record ", "data class", "Created", "Updated", "Deleted", "Processed", "Completed"] -->

- [ ] **Command-style naming**: flag events named as imperative commands (`CreateOrder`, `ProcessPayment`, `SendNotification`) -- events must be past tense (`OrderCreated`, `PaymentProcessed`, `NotificationSent`)
- [ ] **Generic event names**: flag events named `DataChanged`, `EntityUpdated`, `StateModified` -- event names should use domain vocabulary (`OrderShipped`, `ClaimEscalated`, `PolicyRenewed`)
- [ ] **CRUD event names**: flag `OrderUpdated` or `CustomerModified` when a more specific domain event exists -- `OrderShipped`, `CustomerAddressChanged`, `CustomerTierUpgraded` carry more meaning
- [ ] **Verb-noun inversion**: flag `UpdateOrder` (command) used as an event -- the correct form is `OrderUpdated` (fact)

### Event Payload Size and Coupling
<!-- activation: keywords=["field", "property", "data", "payload", "body", "content", "snapshot", "state", "aggregate"] -->

- [ ] **God event**: flag event classes with 10+ fields or containing a full aggregate snapshot -- events should carry only the data consumers need to react, not the full aggregate state
- [ ] **Aggregate mirror**: flag events whose fields are a 1:1 copy of the aggregate's fields -- this couples consumers to the aggregate's internal structure
- [ ] **Nested entities in payload**: flag events containing full entity objects instead of IDs and summary values -- consumers should not receive internal aggregate structure
- [ ] **Missing essential metadata**: flag events without `eventId`, `occurredAt` (timestamp), or `aggregateId` -- these are needed for idempotency, ordering, and traceability

### Event Immutability
<!-- activation: keywords=["set", "setter", "mut", "mutable", "var ", "modify", "change", "update"] -->

- [ ] **Mutable event fields**: flag event classes with non-final, non-readonly fields -- events represent historical facts and must be immutable
- [ ] **Setter methods on events**: flag setter methods on event classes -- events should be constructed once and never modified
- [ ] **Event handler mutating event**: flag event handlers or listeners that modify the event object they receive -- events are shared across handlers and must not be changed
- [ ] **Builder pattern allowing partial events**: flag event builders that allow construction without required fields (aggregate ID, timestamp)

### Missing Events and Publication Discipline
<!-- activation: keywords=["approve", "reject", "cancel", "complete", "ship", "pay", "refund", "escalate", "transition", "status", "state"] -->

- [ ] **State change without event**: flag aggregate methods that perform domain-significant state transitions (approve, cancel, ship, escalate) without publishing a corresponding domain event
- [ ] **Event published from service**: flag services that create and publish domain events instead of the aggregate root -- the aggregate should own its event publication to ensure consistency
- [ ] **Synchronous command in handler**: flag event handlers that synchronously create or modify aggregates in another bounded context -- use asynchronous processing or saga/process manager
- [ ] **Complex handler logic**: flag event handlers containing business decision logic that belongs in a domain service -- handlers should translate events into commands, not make domain decisions

## Common False Positives

- **Integration events vs domain events**: integration events at system boundaries may legitimately carry more data for external consumers. A rich integration event at an API gateway is not a god event.
- **Event sourcing projections**: in event-sourced systems, events may carry sufficient data to rebuild state -- this is by design, not payload bloat.
- **CQRS update events**: events used to update read models may carry denormalized data for projection convenience. This is a read-model optimization, not a domain event violation.
- **Framework-mandated metadata**: some event frameworks require additional metadata fields (partition key, schema version). These are infrastructure concerns, not domain coupling.
- **Audit events**: events published purely for audit logging may carry a full state snapshot by compliance requirement.

## Severity Guidance

| Finding | Severity |
|---|---|
| Domain-significant state change (approval, cancellation) with no event emitted in event-driven system | Critical |
| Event handler mutating the event object | Critical |
| Event with 15+ fields mirroring aggregate state (god event) | Important |
| Event named as imperative command instead of past-tense fact | Important |
| Event class with setter methods or mutable fields | Important |
| Event published from service layer instead of aggregate root | Important |
| Event missing timestamp or event ID | Important |
| Event containing nested entity objects instead of IDs | Minor |
| Generic event name (DataChanged) where a domain-specific name would be clearer | Minor |

## See Also

- `ddd-tactical-aggregates` -- aggregates publish domain events; events enable eventual consistency between aggregates
- `ddd-tactical-application-services` -- application services coordinate event handlers; domain logic in handlers is misplaced
- `ddd-ubiquitous-language` -- event names must use domain vocabulary in past tense
- `principle-naming-and-intent` -- event naming is a specific application of intent-revealing names
- `principle-immutability-by-default` -- domain events are the strongest case for immutability; they represent historical facts

## Authoritative References

- [Eric Evans, *Domain-Driven Design* (2003), Chapter 5 and subsequent community extensions on Domain Events](https://www.oreilly.com/library/view/domain-driven-design-tackling/0321125215/)
- [Vaughn Vernon, *Implementing Domain-Driven Design* (2013), Chapter 8: "Domain Events"](https://www.oreilly.com/library/view/implementing-domain-driven-design/9780133039900/)
- [Martin Fowler, "DomainEvent" (2005)](https://www.martinfowler.com/eaaDev/DomainEvent.html)
- [Greg Young, "CQRS and Event Sourcing" (2010)](https://cqrs.files.wordpress.com/2010/11/cqrs_documents.pdf)
