---
id: pattern-eip-routing
type: primary
depth_role: leaf
focus: Detect misuse, absence, and over-engineering of Enterprise Integration message routing patterns -- content-based routing, splitting, aggregating, and scatter-gather.
parents:
  - index.md
covers:
  - "Content-based routers with growing if/else chains violating OCP"
  - Missing default or fallback route causing silent message loss
  - Routers coupled to message body internals instead of routing on headers
  - Splitter without a corresponding aggregator leaving orphaned message fragments
  - Routing slip with no error or compensation path for failed steps
  - Scatter-gather without timeout on slow responders causing indefinite blocking
  - Dynamic router with no route validation, silently sending messages to nonexistent destinations
  - Recipient list that grows unbounded, fanning out to all consumers regardless of relevance
  - Aggregator with no completion condition, accumulating fragments forever
  - Filter that silently discards messages with no audit trail or dead-letter
  - Multicast with no error isolation -- one failing recipient blocks or poisons the entire fan-out
tags:
  - eip
  - routing
  - content-based-router
  - splitter
  - aggregator
  - scatter-gather
  - routing-slip
  - recipient-list
  - enterprise-integration
activation:
  file_globs:
    - "**/*.{java,kt,scala,cs,ts,js,py,rb,go,rs,ex,exs,erl,cpp,hpp,php}"
  keyword_matches:
    - route
    - router
    - Router
    - routing
    - split
    - aggregate
    - scatter
    - gather
    - filter
    - recipient
    - multicast
    - routing slip
    - content-based
    - dynamic router
    - dispatch
    - fanout
  structural_signals:
    - if_else_chain_routing_messages_by_type
    - splitter_without_aggregator
    - scatter_dispatch_with_no_timeout
source:
  origin: file
  path: pattern-eip-routing.md
  hash: "sha256:1b013c25f906af996856e447ee2b4fc9625366e2dd682ca4ec9a9f0b16d7924d"
---
# EIP Message Routing

## When This Activates

Activates when diffs introduce message routing logic (if/else or switch on message type to select a destination), splitter/aggregator pairs, scatter-gather dispatches to multiple services, routing slip step sequences, recipient list construction, content-based routing configuration, or multicast/fan-out logic. Message routing determines which messages reach which consumers. Broken routing causes silent message loss (no default route), rigid architectures (if/else routers violating OCP), orphaned data (splitter without aggregator), and availability incidents (scatter-gather without timeout). This reviewer detects where routing patterns are misapplied, incomplete, or over-engineered.

## Audit Surface

- [ ] Content-based routers dispatch on a header or type discriminator, not deep message body inspection
- [ ] Every router has a default or fallback route that handles unrecognized message types explicitly (error, DLQ, or log)
- [ ] Router logic is extensible without modification -- new message types can be added via configuration, registry, or handler registration
- [ ] Every splitter has a corresponding aggregator (or an explicit design decision that fragments are independent)
- [ ] Routing slips include an error/compensation step for each fallible step in the sequence
- [ ] Scatter-gather calls have a timeout per responder and a strategy for partial results
- [ ] Dynamic routers validate that the resolved destination exists before sending
- [ ] Recipient lists are filtered to relevant consumers, not broadcast to all
- [ ] Aggregators have a completion condition (count, timeout, or sentinel) and do not accumulate fragments forever
- [ ] Message filters that discard messages log, meter, or DLQ the discarded messages
- [ ] Fan-out to multiple recipients has error isolation -- one failing recipient does not block others
- [ ] Router logic is decoupled from the message schema module
- [ ] Routing tables or configuration can be refreshed at runtime when routes change
- [ ] Duplicated messages in fan-out carry deduplication keys so consumers can detect copies
- [ ] Router performance is acceptable -- routing decisions do not require expensive I/O or computation per message

## Detailed Checks

### Content-Based Router
<!-- activation: keywords=["route", "router", "Router", "dispatch", "switch", "case", "if", "else", "type", "content", "header", "match", "select"] -->

- [ ] **If/else chain router**: router dispatches messages via a growing `if/else if/else` or `switch/case` chain on message type -- adding a new message type requires modifying the router code, violating OCP
- [ ] **Routing on body internals**: router inspects deep fields of the message body (`message.payload.order.customer.region`) instead of routing on a header or top-level type discriminator -- couples router to producer's domain model
- [ ] **No default branch**: router handles types A, B, C but has no `else`/`default` -- a message of type D passes through silently with no processing, no error, and no log
- [ ] **Router as god class**: router contains business logic beyond routing (validation, transformation, enrichment) -- it should only decide the destination, not process the message
- [ ] **Hardcoded destinations**: route destinations are string literals in the router code instead of externalized configuration -- changing a destination requires redeployment
- [ ] **Router with side effects**: routing decision mutates the message (adds fields, changes headers) as a side effect -- downstream consumers see a message that differs from what the producer sent

### Splitter and Aggregator
<!-- activation: keywords=["split", "splitter", "aggregate", "aggregator", "fragment", "batch", "chunk", "part", "piece", "reassemble", "collect", "combine", "merge", "join"] -->

- [ ] **Splitter without aggregator**: a message is split into N fragments and dispatched, but no aggregator collects the results -- downstream receives orphaned fragments with no way to reconstruct the whole
- [ ] **Aggregator without completion condition**: aggregator waits for fragments but has no timeout, count threshold, or sentinel fragment -- if one fragment is lost, the aggregator waits forever, leaking memory
- [ ] **Fragment ordering assumed**: aggregator assumes fragments arrive in order, but the transport does not guarantee ordering -- reassembly produces corrupted results
- [ ] **Missing correlation in fragments**: splitter does not stamp each fragment with a correlation ID linking it back to the original message -- aggregator cannot group fragments from different split operations
- [ ] **Partial aggregation not handled**: aggregator requires all N fragments but only N-1 arrive (one failed processing) -- no timeout or partial-result strategy exists
- [ ] **Splitter on unbounded input**: splitter breaks a message into fragments proportional to input size with no upper bound -- a large input creates thousands of fragments that overwhelm downstream consumers

### Routing Slip
<!-- activation: keywords=["routing slip", "routingSlip", "step", "pipeline", "saga", "workflow", "sequence", "chain", "itinerary", "hop"] -->

- [ ] **No error path**: routing slip defines a happy-path sequence of steps but has no error handler -- if step 3 of 5 fails, the message is stuck with no compensation for steps 1-2
- [ ] **No compensation**: steps in the slip perform side effects (database writes, API calls) but there is no compensating action defined for rollback on downstream failure
- [ ] **Slip modification mid-flight**: a step modifies the routing slip itself (adds or removes future steps) without validation -- the remaining sequence may become invalid or circular
- [ ] **No progress tracking**: there is no mechanism to determine which step the message is currently on -- debugging and retry require replaying the entire slip from the start
- [ ] **Infinite slip**: routing slip contains a cycle (step A routes to step B which routes back to step A) -- add cycle detection or a maximum hop count

### Scatter-Gather
<!-- activation: keywords=["scatter", "gather", "fan-out", "fanout", "broadcast", "parallel", "all", "collect", "await", "Promise.all", "CompletableFuture", "WhenAll", "WaitGroup", "join", "timeout"] -->

- [ ] **No timeout**: scatter dispatches requests to N services and blocks until all respond -- one slow or dead responder blocks the entire gather phase indefinitely
- [ ] **No partial result strategy**: gather requires all N responses but one responder fails -- the entire operation fails instead of returning partial results with a degraded-but-functional response
- [ ] **Unbounded scatter**: scatter dispatches to a dynamically-determined recipient list with no upper bound -- a large list creates a thundering herd that overwhelms responders
- [ ] **No error isolation**: scatter uses `Promise.all` / `CompletableFuture.allOf` / `WaitGroup` where one exception cancels or poisons the collection of all results -- use `allSettled` or individual error handling
- [ ] **Duplicate responses**: gather does not deduplicate responses when a responder retries -- counted twice, skewing aggregated results
- [ ] **Sequential scatter**: requests are dispatched sequentially instead of in parallel, negating the scatter-gather latency benefit -- total time is the sum of all responders instead of the maximum

### Recipient List and Multicast
<!-- activation: keywords=["recipient", "multicast", "fan-out", "fanout", "broadcast", "distribute", "notify", "all", "list", "subscribers", "consumers"] -->

- [ ] **Broadcast to all**: recipient list includes every registered consumer regardless of interest -- each consumer receives and discards irrelevant messages, wasting network, deserialization, and processing
- [ ] **Static recipient list**: list is hardcoded or loaded once at startup -- adding or removing a recipient requires redeployment instead of dynamic registration
- [ ] **No error isolation in multicast**: one recipient throwing an exception prevents remaining recipients from receiving the message -- deliver to each recipient independently with individual error handling
- [ ] **Message mutation during multicast**: a recipient modifies the message object in place, and subsequent recipients see the modified version -- clone the message before dispatching to each recipient
- [ ] **Ordering dependency across recipients**: recipients are assumed to process messages in a specific order, but multicast delivers concurrently -- use sequential dispatch if ordering matters

### Message Filter
<!-- activation: keywords=["filter", "Filter", "discard", "drop", "skip", "ignore", "predicate", "match", "criteria", "accept", "reject"] -->

- [ ] **Silent discard**: filter drops messages that do not match criteria with no logging, metric, or dead-letter routing -- discarded messages vanish without a trace
- [ ] **Filter as business logic**: filter contains complex business rules beyond simple predicate matching -- it should decide include/exclude, not transform or enrich
- [ ] **Expensive filter predicate**: filter evaluates its predicate by calling an external service or database per message -- add caching or move the filter upstream where the data is already available
- [ ] **Inverted filter logic**: filter is supposed to pass matching messages but is implemented as `if (matches) discard()` instead of `if (!matches) discard()` -- logic inversion silently routes wrong messages

## Common False Positives

- **HTTP routers**: web framework routers (Express, Spring MVC, ASP.NET) route HTTP requests by URL path and method. These are not message routers in the EIP sense. Flag only when they exhibit content-based routing on the request body with OCP violations.
- **Event-driven architecture dispatchers**: in-process event dispatchers (MediatR, EventEmitter) that map event types to handlers are a form of routing but are managed by the framework. Flag only when the dispatch logic is hand-written with growing if/else chains.
- **MapReduce frameworks**: Hadoop/Spark split-map-reduce pipelines are a form of splitter-aggregator but managed by the framework. Do not flag the framework's splitting mechanism.
- **Load balancers**: network load balancers (round-robin, least-connections) distribute messages but are infrastructure, not application-level routers. Do not flag.
- **Database sharding**: routing writes to shards by key is a routing pattern but operates at the data layer. Flag only if the sharding logic is implemented in application code with an if/else chain.

## Severity Guidance

| Finding | Severity |
|---|---|
| No default/fallback route -- unrecognized messages silently dropped | high |
| Splitter without aggregator and fragments require reassembly | high |
| Scatter-gather with no timeout -- one dead responder blocks the system | high |
| Routing slip with no error/compensation path for side-effecting steps | high |
| Content-based router with 8+ if/else branches, violating OCP | medium |
| Router coupled to deep message body fields instead of headers | medium |
| Aggregator with no completion condition, accumulating fragments indefinitely | medium |
| Fan-out with no error isolation -- one failure blocks remaining recipients | medium |
| Message filter silently discards without logging or DLQ | medium |
| Scatter-gather with no partial result strategy | medium |
| Recipient list broadcasts to all consumers regardless of interest | low |
| Static routing table with no runtime refresh mechanism | low |
| Sequential scatter negating parallelism benefit | low |
| Hardcoded route destinations instead of externalized configuration | low |

## See Also

- `pattern-eip-messaging` -- routing depends on well-structured messages with type headers; schemaless or god messages make content-based routing fragile
- `pattern-eip-transformation` -- routers often precede transformers; a router coupled to message internals creates the same problem as a transformer coupled to both schemas
- `pattern-eip-endpoint` -- endpoints produce and consume routed messages; endpoint misconfiguration (missing ack, no DLQ) compounds routing failures
- `pattern-chain-of-responsibility` -- a content-based router with if/else chains is a degenerate chain of responsibility; consider refactoring to a handler chain
- `pattern-strategy` -- routing decisions can be extracted into strategy objects to satisfy OCP instead of growing if/else chains
- `principle-solid` -- content-based routers with if/else chains violate OCP (open for extension, closed for modification)
- `principle-fail-fast` -- missing default routes and silent message drops violate fail-fast

## Authoritative References

- [Gregor Hohpe & Bobby Woolf, *Enterprise Integration Patterns* (2003), Chapters 7-8: Message Routing](https://www.enterpriseintegrationpatterns.com/)
- [Gregor Hohpe, "Content-Based Router"](https://www.enterpriseintegrationpatterns.com/patterns/messaging/ContentBasedRouter.html)
- [Gregor Hohpe, "Scatter-Gather"](https://www.enterpriseintegrationpatterns.com/patterns/messaging/BroadcastAggregate.html)
- [Gregor Hohpe, "Routing Slip"](https://www.enterpriseintegrationpatterns.com/patterns/messaging/RoutingTable.html)
- [Chris Richardson, *Microservices Patterns* (2018), Chapter 4: Saga Pattern](https://microservices.io/patterns/data/saga.html)
- [Apache Camel, Enterprise Integration Patterns](https://camel.apache.org/components/latest/eips/enterprise-integration-patterns.html)
