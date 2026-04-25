---
id: antipattern-chatty-coupling
type: primary
depth_role: leaf
focus: Detect excessive fine-grained interactions between components that should communicate through coarser-grained interfaces
parents:
  - index.md
covers:
  - Multiple sequential calls to the same collaborator within a single method
  - "N+1 remote/database calls in a loop instead of batched operations"
  - Fine-grained RPC or HTTP calls between microservices that should be a single aggregate call
  - Controller or handler issuing 5+ service calls to assemble a single response
  - Getter chains used to extract data piecemeal from a collaborator
  - Back-and-forth ping-pong calls between two objects to complete one logical operation
  - Multiple round-trips to cache or external store for data available in one fetch
  - Event-driven systems where a single operation emits 5+ fine-grained events consumed by the same subscriber
  - Test setup that calls the subject 10+ times to configure it instead of using a builder or config object
  - DTO assembly that queries the same service repeatedly for related fields
tags:
  - chatty
  - coupling
  - n-plus-one
  - performance
  - round-trip
  - batch
  - api-design
activation:
  file_globs:
    - "**/*"
  keyword_matches:
    - for
    - forEach
    - map
    - fetch
    - query
    - request
    - client.
    - service.
    - repository.
    - cache.get
    - redis.
    - http.
    - grpc
    - await
  structural_signals:
    - Multiple calls to the same object in sequence
    - Remote or database calls inside loop bodies
    - Sequential HTTP or gRPC calls in a single method
source:
  origin: file
  path: antipattern-chatty-coupling.md
  hash: "sha256:1d49bd9fb6d0c1c40d77e9a1f9817d2d22651e0918a0a2ef371e48ccb08e8655"
---
# Chatty Coupling

## When This Activates

Activates on any diff. Chatty coupling is one of the most common performance and design problems — components that interact through many fine-grained calls instead of a few coarse-grained ones. The cost is especially severe across process, network, or I/O boundaries (database, HTTP, gRPC, cache), but even in-process chatty interactions signal a missing abstraction or misplaced responsibility.

## Audit Surface

- [ ] Method making 3+ sequential calls to the same collaborator object
- [ ] Loop body containing a remote call, database query, or HTTP request (N+1)
- [ ] Controller/handler calling 5+ service methods to build one response
- [ ] Two classes calling each other in alternation to complete one workflow
- [ ] Multiple cache.get() calls in sequence for related keys fetchable in one multi-get
- [ ] Service method that makes 3+ outbound HTTP/gRPC calls sequentially
- [ ] Event publisher emitting 5+ events for what is logically one state change
- [ ] Object constructed via 8+ sequential setter calls instead of a builder or constructor
- [ ] Repository queried in a loop instead of using an IN clause or batch fetch
- [ ] Function reading the same config/context object field-by-field across 5+ lines
- [ ] GraphQL resolver making individual DB queries per field instead of batched DataLoader
- [ ] Test method calling the subject 10+ times for setup rather than a single configuration call

## Detailed Checks

### N+1 Query and Call Patterns
<!-- activation: keywords=["for", "forEach", "map", "each", "loop", "query", "find", "get", "fetch", "select", "WHERE", "await"] -->

- [ ] Database query inside a loop body — replace with a single query using IN clause, JOIN, or batch API
- [ ] ORM lazy-loading triggered inside a loop (accessing a relationship field per iteration)
- [ ] HTTP/gRPC call per item in a collection — replace with a batch endpoint or bulk request
- [ ] Cache lookup per item — replace with multi-get (mget, getAll, getMulti)
- [ ] File read per item — collect paths and read in one pass where possible
- [ ] Await inside a loop body where iterations are independent — use Promise.all / asyncio.gather / parallel streams

### Sequential Same-Collaborator Calls
<!-- activation: keywords=["service.", "client.", "repository.", "dao.", "store.", "manager.", "api.", "helper."] -->

- [ ] 3+ calls to the same service/repository in a single method — consider a coarser-grained method on the collaborator that returns everything needed
- [ ] Piecemeal data assembly: calling getA(), getB(), getC() on the same object when a single getABC() or a DTO would reduce round-trips
- [ ] Setter sequences: obj.setX(); obj.setY(); obj.setZ(); obj.setW(); — consider a builder, constructor, or config object
- [ ] Read-modify-write sequences across a remote boundary: get(), transform locally, put() — consider a server-side update/patch operation
- [ ] Repeated validation calls: validate(a); validate(b); validate(c); — consider validateAll([a, b, c])

### Cross-Service Chattiness
<!-- activation: keywords=["http", "grpc", "fetch", "axios", "request", "client", "api", "endpoint", "microservice", "remote"] -->

- [ ] Orchestrating service making 3+ sequential synchronous calls to downstream services — consider an aggregate endpoint, BFF (backend-for-frontend), or parallel fan-out
- [ ] Request waterfall: service A calls B, waits, then calls C with B's result, waits, then calls D with C's result — evaluate whether B→C→D can be collapsed or parallelized
- [ ] Chatty health checks: calling 5+ downstream health endpoints sequentially at startup instead of in parallel
- [ ] API that requires the client to make N calls to complete one user action — consider a composite/batch endpoint

### Ping-Pong and Callback Chattiness
<!-- activation: keywords=["callback", "notify", "event", "emit", "publish", "on", "listener", "observer"] -->

- [ ] Two objects calling each other in alternation: A.doX() calls B.doY() which calls A.doZ() which calls B.doW() — the workflow should live in one place or use a mediator
- [ ] Event publisher emitting many fine-grained events for one logical state change — consider a single coarse event with all relevant data
- [ ] Observer that queries the subject for additional data after every notification — the event payload should carry the data the observer needs
- [ ] Callback chains where each callback triggers the next — consider a pipeline or chain-of-responsibility

### In-Process Chattiness
<!-- activation: keywords=["get", "getter", "field", "property", "config", "context", "settings", "env"] -->

- [ ] Method extracting 5+ individual fields from a parameter object across separate lines — pass the object and let the callee extract what it needs, or create a focused projection
- [ ] Function reading config/environment values one-by-one instead of receiving a typed config object
- [ ] Test setup making 10+ individual calls to configure the test subject — use a builder, factory, or fixture
- [ ] DTO assembled by calling 5+ getters on a domain object — consider a dedicated mapping method or projection on the domain object itself

## Common False Positives

- **Intentional sequential dependencies**: when call B genuinely depends on the result of call A, sequential execution is correct. Only flag when calls are independent and could be batched or parallelized.
- **Small fixed N**: iterating over 3 items with a DB call each is technically N+1 but may not matter if N is always small and bounded. Flag only when N is unbounded or large.
- **Fluent/builder APIs**: `builder.withA().withB().withC().build()` is idiomatic composition, not chatty coupling — each call returns the builder, not a remote result.
- **Test readability**: test setup that uses explicit sequential calls for clarity may be preferable to a dense builder. Flag only when the chattiness causes slow tests (real I/O) or obscures test intent.
- **Stream/pipeline APIs**: `.filter().map().reduce()` chains are lazy transformations, not chatty calls — they execute as a single pass.

## Severity Guidance

| Finding | Severity |
|---|---|
| N+1 database query in a loop with unbounded N | Critical |
| N+1 HTTP/gRPC call in a loop with unbounded N | Critical |
| Sequential remote calls that could be parallelized (3+ calls, 100ms+ each) | Important |
| Controller orchestrating 5+ service calls for one response | Important |
| Ping-pong between two objects for one logical operation | Important |
| 5+ fine-grained events for one state change | Minor |
| Piecemeal getter extraction from a single in-process object | Minor |
| Sequential setter calls where a builder exists but is not used | Minor |
| Config values read one-by-one instead of as a typed object | Minor |

## See Also

- `principle-coupling-cohesion` — chatty coupling is a symptom of high efferent coupling and misplaced responsibilities
- `principle-law-of-demeter` — getter chains are often the mechanism through which chatty interactions happen
- `principle-separation-of-concerns` — chattiness often arises when orchestration logic is in the wrong layer
- `smell-feature-envy` — a method that makes many calls to another object's fields likely has feature envy
- `smell-message-chains` — navigation chains are a specific form of chatty interaction
- `pattern-facade` — a facade can consolidate chatty fine-grained calls into a coarse-grained interface

## Authoritative References

- [Martin Fowler — "Refactoring" (2018), Remote Facade pattern](https://martinfowler.com/books/refactoring.html)
- [Martin Fowler — "Patterns of Enterprise Application Architecture" (2002), Lazy Load / N+1](https://martinfowler.com/eaaCatalog/)
- [Sam Newman — "Building Microservices" (2021), Chapter 4: Inter-Service Communication](https://www.oreilly.com/library/view/building-microservices-2nd/9781492034018/)
- [Gregor Hohpe — "Enterprise Integration Patterns" (2003), Message Aggregation](https://www.enterpriseintegrationpatterns.com/)
