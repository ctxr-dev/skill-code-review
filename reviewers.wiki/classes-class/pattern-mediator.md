---
id: pattern-mediator
type: primary
depth_role: leaf
focus: Detect misuse, over-application, and absence of the Mediator pattern in inter-object coordination code.
parents:
  - index.md
covers:
  - Mediators that grow into god objects knowing and controlling all colleagues
  - Mediators containing business logic instead of pure coordination
  - Colleagues communicating directly, bypassing the mediator inconsistently
  - "Missing mediator where N objects have N*(N-1) direct dependencies"
  - Mediator holding colleague state instead of just routing messages
  - Mediator with circular dependency on colleagues through concrete types
  - Single-colleague mediator that is unnecessary indirection
  - Mediator with no interface making testing and substitution impossible
  - Mediator that silently drops messages instead of reporting routing failures
  - Over-applied mediator where two objects communicate directly with no fan-out
tags:
  - mediator
  - behavioural-pattern
  - design-patterns
  - coordination
  - decoupling
  - event-bus
  - message-bus
activation:
  file_globs:
    - "**/*.{java,kt,scala,cs,ts,js,py,rb,go,rs,swift,cpp,h,hpp,php}"
  keyword_matches:
    - Mediator
    - mediator
    - coordinator
    - hub
    - bus
    - dispatcher
    - orchestrator
    - broker
    - EventBus
    - MessageBus
    - central
  structural_signals:
    - class_referencing_multiple_colleague_types
    - colleague_classes_sharing_mediator_field
    - notify_method_dispatching_to_multiple_handlers
source:
  origin: file
  path: pattern-mediator.md
  hash: "sha256:668c4a4da3032a47403cc2ef30b0b008e14598971cbb37b8ac36d83b7e15fb9a"
---
# Mediator Pattern

## When This Activates

Activates when diffs introduce classes that coordinate communication between multiple peer objects, add `*Mediator`, `*Coordinator`, `*Hub`, `*Dispatcher`, or `*Bus` classes, or when multiple objects hold direct references to each other forming a communication mesh. The Mediator pattern centralizes complex inter-object communication to reduce coupling, but it frequently degrades into a god object that knows everything about every colleague, or accumulates business logic that belongs in the colleagues themselves.

## Audit Surface

- [ ] Mediator has a bounded, cohesive coordination responsibility -- it does not orchestrate unrelated subsystems
- [ ] Mediator delegates all business logic to colleagues -- it routes and coordinates, not decides
- [ ] All colleague-to-colleague communication flows through the mediator -- no direct references bypass it
- [ ] Objects that communicate in a mesh pattern (3+ mutual dependencies) use a mediator to decouple
- [ ] Mediator is stateless or holds only transient routing state -- it does not cache or accumulate colleague data
- [ ] Mediator depends on colleague abstractions (interfaces), not concrete implementations
- [ ] Message dispatch uses type-safe mechanisms, not string keys or magic constants
- [ ] Colleagues can be tested independently by substituting the mediator with a mock
- [ ] Mediator reports routing failures (no handler, dead subscriber) instead of silently dropping messages
- [ ] Event bus or message bus validates subscriber registrations and prevents orphaned subscriptions
- [ ] Mediator is not applied to trivially simple communication between just two objects
- [ ] Mediator methods represent coordination concerns, not 1:1 pass-throughs of colleague APIs
- [ ] Coupling between mediator and colleagues is unidirectional: colleagues know the mediator interface, mediator knows colleague interfaces, but not the reverse at the concrete level
- [ ] Mediator boundaries are clear -- no overlapping mediators coordinate the same colleagues
- [ ] Mediator has an abstract type or interface to allow substitution in tests and alternative implementations

## Detailed Checks

### God Mediator Detection
<!-- activation: keywords=["Mediator", "mediator", "coordinator", "hub", "bus", "dispatcher", "orchestrator", "central"] -->

- [ ] **Method count explosion**: mediator has 20+ public methods covering coordination for unrelated colleague groups -- split into focused mediators per bounded context
- [ ] **Dependency accumulation**: mediator constructor accepts 10+ colleague dependencies, indicating it coordinates too many concerns -- extract separate mediators
- [ ] **Knowledge centralization**: mediator knows the internal state, method signatures, and sequencing of all colleagues -- it has become a procedural controller, not a communication hub
- [ ] **Change magnet**: every new colleague or interaction requires modifying the mediator -- the mediator violates OCP and centralizes all change impact
- [ ] **Long coordination methods**: individual mediator methods run 50+ lines orchestrating complex multi-step flows -- extract to application services or saga coordinators

### Business Logic in Mediator
<!-- activation: keywords=["if", "else", "switch", "calculate", "validate", "rule", "logic", "decide", "determine", "check"] -->

- [ ] **Decision logic**: mediator contains if/else or switch statements that make business decisions (pricing, authorization, validation) -- these belong in colleagues or domain services
- [ ] **Transformation logic**: mediator transforms data between colleagues beyond simple format adaptation -- domain-meaningful transformation belongs in the domain layer
- [ ] **Aggregation logic**: mediator aggregates data from multiple colleagues and computes results -- this is business logic disguised as coordination
- [ ] **Validation**: mediator validates business rules before routing messages -- validation belongs in the colleagues or dedicated validators
- [ ] **Stateful workflow**: mediator tracks multi-step workflow progress (saga state, step counters) that constitutes business process logic -- use a dedicated workflow coordinator or state machine

### Direct Colleague Communication (Bypass)
<!-- activation: keywords=["notify", "send", "publish", "emit", "fire", "trigger", "dispatch", "handler", "listener", "subscribe"] -->

- [ ] **Selective bypass**: some colleagues communicate through the mediator while others call each other directly -- the inconsistency creates hidden coupling and makes the dependency graph unpredictable
- [ ] **Back-channel reference**: colleague holds a direct reference to another colleague "for performance" or "convenience," undermining the mediator's purpose
- [ ] **Event leakage**: colleague publishes events both through the mediator and through a separate event mechanism, splitting the communication channel
- [ ] **Circular notification**: colleague A notifies the mediator, mediator notifies colleague B, B directly calls A -- the direct callback creates a cycle that bypasses the mediator on the return path
- [ ] **Colleague discovery**: colleague dynamically looks up other colleagues (service locator, DI container) instead of communicating through the mediator

### Missing Mediator (Communication Mesh)
<!-- activation: keywords=["notify", "update", "sync", "send", "reference", "depend", "call", "wire", "connect", "register"] -->

- [ ] **N-way direct coupling**: three or more objects hold direct references to each other and call methods on each other -- the number of dependencies grows quadratically, a mediator would reduce to N
- [ ] **Duplicated coordination**: the same multi-object synchronization logic appears in several colleagues -- a mediator would centralize it
- [ ] **Fragile wiring**: adding a new participant requires updating multiple existing participants with new references -- a mediator would localize the wiring
- [ ] **UI component mesh**: form controls directly update each other (text field changes combo box, combo box changes label) without a coordinating form mediator
- [ ] **Service mesh**: microservices or modules call each other in a dense graph with no orchestrating service or message broker to mediate

### Mediator State Accumulation
<!-- activation: keywords=["state", "cache", "store", "hold", "track", "accumulate", "field", "mutable", "map", "buffer"] -->

- [ ] **Cached colleague state**: mediator caches colleague data to "avoid re-fetching" -- the cache becomes stale, and the mediator now manages data consistency it should not own
- [ ] **Accumulated message history**: mediator stores all messages for replay or audit -- this responsibility belongs in a separate audit log or event store, not the mediator
- [ ] **Colleague registry as state**: mediator maintains a mutable registry of colleagues that changes at runtime with no lifecycle management -- unregistered colleagues leave dangling references
- [ ] **Correlation state**: mediator tracks correlation between requests and responses across colleagues, accumulating state that grows unboundedly -- use explicit correlation IDs passed through messages instead
- [ ] **Shared mutable context**: mediator holds a context object that colleagues read from and write to, making the mediator a shared-state container rather than a message router

### Over-Applied Mediator
<!-- activation: keywords=["Mediator", "mediator", "coordinator", "simple", "two", "pair", "direct", "unnecessary"] -->

- [ ] **Two-party mediator**: mediator coordinates exactly two objects that could communicate directly with a simple interface dependency -- the mediator adds indirection without reducing coupling
- [ ] **No fan-out**: every mediator method routes to exactly one colleague -- no many-to-many coordination occurs, so the mediator is just unnecessary indirection
- [ ] **Premature decoupling**: mediator introduced "for future flexibility" when only two or three objects communicate and the interaction is straightforward -- add the mediator when the communication mesh actually grows

## Common False Positives

- **Application services / use case orchestrators**: classes in the application layer that coordinate domain objects to fulfill a use case are not mediators -- they are legitimate orchestration layers in Clean Architecture or Hexagonal Architecture.
- **Message brokers (RabbitMQ, Kafka)**: infrastructure message brokers mediate communication by design. Do not flag the broker itself; flag application code that misuses the broker.
- **MediatR / CQRS handlers**: libraries like MediatR (C#) or similar dispatch frameworks route commands and queries to handlers. The dispatch infrastructure is not a god mediator; flag only if business logic leaks into the pipeline.
- **UI framework event systems**: React context, Angular services, or SwiftUI environment objects that share state are framework-provided mediation. Flag only if application code builds an ad-hoc mediator that duplicates framework capabilities.
- **Redux / Flux stores**: centralized state stores receive actions and dispatch updates. They are architectural mediators by design -- flag only if the store contains business logic beyond state transitions.

## Severity Guidance

| Finding | Severity |
|---|---|
| Mediator contains business logic that belongs in domain objects | high |
| Mediator has grown into a god object with 20+ methods spanning unrelated concerns | high |
| Colleagues bypass the mediator with direct references, creating hidden coupling | high |
| Three or more objects have quadratic direct dependencies with no mediator | medium |
| Mediator caches colleague state, causing stale data and consistency bugs | medium |
| Mediator depends on concrete colleague types, preventing independent testing | medium |
| Mediator silently drops messages with no error reporting | medium |
| Mediator dispatches on string keys or magic constants with no type safety | medium |
| Two-party mediator adding unnecessary indirection | low |
| Mediator method names mirror colleague APIs 1:1 | low |
| Mediator introduced prematurely for a simple communication topology | low |

## See Also

- `pattern-observer` -- observers handle one-to-many notification; mediators handle many-to-many coordination. If the "mediator" only broadcasts events to subscribers, it may be an observer/event emitter.
- `pattern-facade` -- facades simplify subsystem access; mediators decouple peer communication. If the "mediator" only delegates to subsystems without peer coordination, it may be a facade.
- `principle-coupling-cohesion` -- the mediator exists to reduce coupling between peers; a god mediator re-centralizes that coupling
- `principle-separation-of-concerns` -- business logic in the mediator violates separation of concerns
- `principle-solid` -- god mediators violate SRP; concrete colleague dependencies violate DIP
- `principle-encapsulation` -- mediator holding colleague state breaks colleague encapsulation

## Authoritative References

- [Erich Gamma et al., *Design Patterns: Elements of Reusable Object-Oriented Software* (1994), Mediator](https://www.oreilly.com/library/view/design-patterns-elements/0201633612/)
- [Robert C. Martin, *Agile Software Development* (2002), Chapter 33: Mediator and Observer](https://www.oreilly.com/library/view/agile-software-development/0135974445/)
- [Eric Freeman et al., *Head First Design Patterns* (2nd ed., 2020), Mediator Pattern](https://www.oreilly.com/library/view/head-first-design/9781492077992/)
- [Martin Fowler, *Patterns of Enterprise Application Architecture* (2002), Event Aggregator](https://martinfowler.com/eaaDev/EventAggregator.html)
