---
id: arch-cqrs
type: primary
depth_role: leaf
focus: "Detect command handlers returning data, query handlers with side effects, read model consistency gaps, and command/query bus misconfiguration"
parents:
  - index.md
covers:
  - Command handler returning domain data beyond a simple acknowledgment
  - "Query handler modifying state (database writes, event publishing, cache invalidation)"
  - "Read model not handling eventual consistency (stale data, missing projections)"
  - Command and query models sharing the same database table or ORM entity
  - "Command/query bus routing misconfiguration or missing handler registration"
  - Query bypassing the read model and hitting the write database directly
  - Command handler performing queries to validate instead of using domain state
  - Missing projection rebuild capability for read models
  - Read model updated synchronously in the command handler instead of via events
  - Command handler with no validation before mutating state
  - CQRS where read and write models are identical, adding indirection without benefit
  - Missing eventual consistency handling on the read side causing stale reads without user awareness
  - Command handlers that execute query logic or return query results
  - Query handlers that mutate state or trigger side effects
  - CQRS applied to a simple CRUD domain where a single model suffices
  - Event store without snapshots causing slow aggregate reconstruction for long-lived aggregates
  - Missing projection rebuild capability making read model corruption unrecoverable
  - "Command validation that queries the read model instead of the write model (stale data decisions)"
  - Projections that silently skip failed events leaving the read model permanently inconsistent
  - Read model and write model using the same database without separation
tags:
  - cqrs
  - command
  - query
  - read-model
  - write-model
  - separation
  - architecture
  - command-query
  - projection
  - event-driven
  - microservices
aliases:
  - pattern-cqrs-pattern
activation:
  file_globs:
    - "**/*command*"
    - "**/*query*"
    - "**/*handler*"
    - "**/*read-model*"
    - "**/*readmodel*"
    - "**/*projection*"
    - "**/*bus*"
    - "**/*dispatch*"
    - "**/*cqrs*"
  keyword_matches:
    - command
    - query
    - handler
    - dispatch
    - bus
    - CQRS
    - read model
    - write model
    - projection
    - aggregate
    - execute
  structural_signals:
    - command_handler_definition
    - query_handler_definition
    - bus_configuration
source:
  origin: file
  path: arch-cqrs.md
  hash: "sha256:d8b7afe9cb1d01d0c0e2ad04fc3b164bbf79369d694c445d87ed81a0e70160fa"
---
# CQRS (Command Query Responsibility Segregation)

## When This Activates

Activates on diffs involving command handlers, query handlers, read models, projections, or command/query bus configuration. CQRS separates the write path (commands that mutate state) from the read path (queries that return data), enabling independent optimization of each. Violations occur when command handlers return data (violating the command side's write-only contract), query handlers produce side effects (violating the query side's read-only contract), or read models do not account for eventual consistency. This reviewer detects these CQRS-specific violations.

## Audit Surface

- [ ] Command handler method returns entity, list, or complex data type
- [ ] Query handler performs INSERT, UPDATE, DELETE, or publishes events
- [ ] Read model query returns stale data with no staleness indicator
- [ ] Same ORM entity or table used by both command and query paths
- [ ] Command bus dispatches to zero handlers or multiple handlers for same command
- [ ] Query reads directly from the write-side database
- [ ] Command handler executes a query to another service or read model
- [ ] Read model has no rebuild/replay mechanism
- [ ] Command handler updates both write model and read model synchronously
- [ ] Query handler constructor injects write-side repository
- [ ] Missing handler registration for a command or query type
- [ ] Command contains query-like fields (pagination, sorting, filters)

## Detailed Checks

### Command Side Discipline
<!-- activation: keywords=["command", "handler", "execute", "handle", "dispatch", "mutate", "write", "create", "update", "delete", "aggregate"] -->

- [ ] **Command handler returns data**: flag command handler methods that return domain entities, lists, or complex data types -- a command handler should return at most an ID or acknowledgment (success/failure); if the caller needs data after a command, issue a separate query
- [ ] **Command contains query fields**: flag command DTOs that include pagination, sorting, filtering, or projection fields -- these are query concerns that do not belong on a command
- [ ] **Command handler queries read model**: flag command handlers that query the read model or a query handler to gather data for validation -- use the aggregate's own state or domain services for command validation
- [ ] **Missing command validation**: flag command handlers that mutate state without validating the command first -- validation should occur before any state change
- [ ] **Command handler updates read model synchronously**: flag command handlers that directly update the read model in the same transaction -- read models should be updated asynchronously via domain events or a projection mechanism

### Query Side Discipline
<!-- activation: keywords=["query", "handler", "get", "find", "list", "search", "read", "fetch", "select", "projection"] -->

- [ ] **Query handler with side effects**: flag query handlers that perform INSERT, UPDATE, DELETE, publish events, send notifications, or modify caches -- queries must be side-effect-free
- [ ] **Query handler injects write repository**: flag query handler constructors that receive a write-side repository, aggregate repository, or command-side service -- this signals the query handler may bypass the read model
- [ ] **Query bypasses read model**: flag queries that read directly from the write-side database or aggregate store instead of the optimized read model -- this defeats CQRS's read optimization benefit
- [ ] **Query returns write-side types**: flag query handlers that return aggregate root objects or write-side domain entities -- queries should return read-optimized DTOs or view models

### Read Model Integrity
<!-- activation: keywords=["read model", "readmodel", "projection", "view", "materialized", "eventual", "consistency", "stale", "rebuild", "replay"] -->

- [ ] **No staleness handling**: flag read model queries that present data as authoritative with no indication that the data may be eventually consistent -- UIs and APIs consuming read models must be eventual-consistency-aware
- [ ] **Missing rebuild capability**: flag read models with no documented or implemented rebuild/replay mechanism -- when projections drift or corrupt, rebuilding from the event stream or write model is essential
- [ ] **Shared model between sides**: flag the same ORM entity, table, or data model used by both command handlers and query handlers -- CQRS requires separate models for each side
- [ ] **Projection not idempotent**: flag read model projections that fail when replayed because they use non-idempotent operations (INSERT without upsert, counter increment without reset) -- projections must be safely replayable

### Command/Query Bus Configuration
<!-- activation: keywords=["bus", "dispatch", "register", "mediator", "middleware", "handler", "route", "map"] -->

- [ ] **Missing handler registration**: flag command or query types that have no registered handler -- dispatching an unhandled command/query is a runtime error
- [ ] **Multiple handlers for one command**: flag command types routed to multiple handlers -- each command should have exactly one handler (queries may have one per read model)
- [ ] **Misrouted command as query**: flag a command being dispatched through the query bus or vice versa -- routing through the wrong bus bypasses the appropriate middleware
- [ ] **Missing bus middleware**: flag command/query bus configurations missing essential middleware (validation, logging, authorization) -- middleware is the cross-cutting concern insertion point

## Common False Positives

- **Command returning created ID**: a command handler returning the ID of a newly created entity (e.g., `return createdId`) is a widely accepted pragmatic exception, not a violation. Flag only when the handler returns full entities or collections.
- **Simple CRUD without read optimization**: in trivially small applications, using the same model for reads and writes is pragmatic. Flag shared models only when the application has distinct read and write performance or shape requirements.
- **Synchronous read model in monolith**: in a monolithic application, updating the read model synchronously in the same process (not the same transaction) may be acceptable for simplicity. Flag only when async projection is expected.
- **Cache as read model**: an application cache populated from write-side events functions as a read model. This is not a CQRS violation.

## Severity Guidance

| Finding | Severity |
|---|---|
| Query handler performing database writes or publishing events | Critical |
| Command handler returning full entity or collection data | Critical |
| Same ORM entity used for both command and query paths | Important |
| Command handler updating read model in same transaction | Important |
| Query reading directly from write-side database | Important |
| Read model projection not idempotent | Important |
| Missing handler registration for a command/query type | Important |
| Read model with no rebuild/replay mechanism | Minor |
| Command DTO containing pagination or sorting fields | Minor |
| No staleness indicator on read model responses | Minor |

## See Also

- `pattern-cqrs-pattern` -- the pattern-level reviewer covers CQRS implementation details; this reviewer covers architectural-level CQRS violations
- `principle-command-query-separation` -- CQS at the method level is the foundation; CQRS applies CQS at the architectural level
- `arch-event-sourcing` -- event sourcing pairs naturally with CQRS; events drive read model projections
- `arch-event-driven` -- event-driven architecture provides the async communication channel for CQRS read model updates
- `principle-separation-of-concerns` -- CQRS separates the read concern from the write concern at the model and infrastructure level

## Authoritative References

- [Greg Young, "CQRS Documents" (2010)](https://cqrs.files.wordpress.com/2010/11/cqrs_documents.pdf)
- [Martin Fowler, "CQRS" (2011)](https://martinfowler.com/bliki/CQRS.html)
- [Microsoft, "CQRS Pattern" (Azure Architecture Center)](https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs)
- [Vaughn Vernon, *Implementing Domain-Driven Design* (2013), Chapter 4: "CQRS"](https://www.oreilly.com/library/view/implementing-domain-driven-design/9780133039900/)
- [Udi Dahan, "Clarified CQRS" (2009)](https://udidahan.com/2009/12/09/clarified-cqrs/)
