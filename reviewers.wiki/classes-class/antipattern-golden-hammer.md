---
id: antipattern-golden-hammer
type: primary
depth_role: leaf
focus: Detect use of a familiar technology, pattern, or tool for every problem regardless of whether it fits the specific requirements
parents:
  - index.md
covers:
  - ORM used for bulk data operations where raw SQL or batch APIs would be orders of magnitude faster
  - "Microservices architecture for a small team's internal tool with no scaling or isolation need"
  - NoSQL document store used for highly relational data requiring joins and referential integrity
  - "Global state management (Redux, Vuex, NgRx) for local component state"
  - Kubernetes for a single-container application that could run on a single VM or PaaS
  - Design pattern applied where a plain function or simple conditional would suffice
  - "Same language or framework used for workloads it handles poorly (Python for CPU-bound without native extensions)"
  - Abstract factory or strategy pattern for a single concrete implementation with no variation
  - Event-driven architecture for simple synchronous request-response workflows
  - "Full DDD tactical patterns (aggregates, repositories, domain events) for a CRUD endpoint with no business rules"
tags:
  - golden-hammer
  - over-engineering
  - technology-choice
  - fit-for-purpose
  - architecture
  - anti-pattern
  - complexity
activation:
  file_globs:
    - "**/*service*"
    - "**/*factory*"
    - "**/*strategy*"
    - "**/*abstract*"
    - "**/*repository*"
    - "**/*store*"
    - "**/*redux*"
    - "**/*saga*"
    - "**/docker-compose*"
    - "**/Dockerfile*"
    - "**/*k8s*"
    - "**/kubernetes*"
    - "**/helm*"
  keyword_matches:
    - ORM
    - Kubernetes
    - k8s
    - microservice
    - Redux
    - store
    - NoSQL
    - MongoDB
    - DynamoDB
    - pattern
    - factory
    - abstract
    - framework
    - docker
    - container
    - GraphQL
    - event bus
    - message queue
    - hexagonal
    - clean architecture
  structural_signals:
    - pattern_with_single_implementation
    - orm_in_loop
    - global_state_for_local_use
    - complex_infrastructure_for_simple_app
source:
  origin: file
  path: antipattern-golden-hammer.md
  hash: "sha256:6206d7a4c859aa7e169d613cf0ae744c5e1adfdc430fba67b23b8d7ae533bc15"
---
# Golden Hammer

## When This Activates

Activates on diffs involving technology choices, pattern implementations, infrastructure configuration, or framework usage where the tool or pattern appears disproportionate to the problem. The golden hammer anti-pattern -- "when all you have is a hammer, everything looks like a nail" -- manifests when developers default to a familiar technology, pattern, or architecture regardless of whether it fits the problem at hand. The cost is not just over-engineering: the wrong tool actively fights the problem, creating performance bottlenecks, unnecessary complexity, operational burden, and code that is harder to understand than a simpler solution would be. This reviewer detects signals that a technology or pattern choice is driven by familiarity rather than fitness.

## Audit Surface

- [ ] ORM query inside a loop for bulk insert, update, or delete (batch API or raw SQL ignored)
- [ ] ORM used for complex reporting query with 4+ joins that would be clearer as raw SQL
- [ ] Redux/Vuex/NgRx store managing state used by only one component
- [ ] Kubernetes manifests for a project with a single container and no scaling requirements
- [ ] Docker-compose with orchestration tooling for a project that runs as a single process
- [ ] Abstract factory, strategy, or builder pattern with exactly one concrete implementation
- [ ] Interface with a single implementation created for a non-boundary dependency
- [ ] NoSQL document store with application-level joins or manual referential integrity enforcement
- [ ] Microservice boundary drawn where a module or library boundary would suffice
- [ ] Event bus or message queue for communication between two components in the same process
- [ ] Full hexagonal/clean architecture layers for a simple CRUD resource with no business logic
- [ ] GraphQL server for an API with a single consumer and no field-selection benefit
- [ ] CPU-bound computation in Python/Ruby/Node.js without native extensions or offloading
- [ ] Caching layer added before profiling proves a performance bottleneck exists
- [ ] Generic type parameters on a class instantiated with only one type argument throughout the codebase

## Detailed Checks

### ORM as Golden Hammer
<!-- activation: keywords=["ORM", "ActiveRecord", "Hibernate", "SQLAlchemy", "Sequelize", "TypeORM", "Prisma", "Entity Framework", "Django ORM", "Eloquent", "GORM", "save", "create", "findAll", "findMany", "bulk", "batch"] -->

- [ ] **ORM in a loop for bulk operations**: flag ORM `save()`, `create()`, or `update()` calls inside a loop when the ORM provides `bulkCreate()`, `insertMany()`, or `saveAll()` methods -- or when raw SQL `INSERT ... VALUES (...)` with multiple rows would be dramatically faster
- [ ] **ORM for complex analytics queries**: flag ORM query builders assembling queries with 4+ joins, subqueries, window functions, or CTEs -- these are often clearer and more performant as raw SQL or a purpose-built query
- [ ] **ORM for schema-less or dynamic queries**: flag ORM usage where the query structure varies at runtime (dynamic column selection, conditional joins) and the ORM abstractions are fighting the dynamism -- raw SQL builders or query DSLs may be a better fit
- [ ] **N+1 from ORM lazy loading**: flag ORM relationships accessed inside loops without eager loading -- the ORM makes N+1 easy to write and hard to notice
- [ ] **ORM for ETL or data pipeline**: flag ORM model usage in batch/ETL jobs processing 10k+ records -- ORMs add per-row overhead (identity map, change tracking, object allocation) that makes large-scale data processing orders of magnitude slower

### Microservices as Golden Hammer
<!-- activation: keywords=["microservice", "service", "API", "endpoint", "gateway", "deploy", "container", "docker", "kubernetes", "k8s", "helm"] -->

- [ ] **Microservice for a small team**: flag microservice architecture (separate repos, separate deployments, service-to-service HTTP) for a project with fewer than 5 developers and no independent scaling requirements -- a modular monolith provides the same code organization without operational overhead
- [ ] **Microservice per CRUD entity**: flag services whose entire responsibility is CRUD operations on one database table with no independent business logic -- these are modules, not services
- [ ] **Kubernetes for single-container app**: flag Kubernetes manifests (Deployment, Service, Ingress, HPA) for a project that runs as a single container with no scaling, service mesh, or multi-tenancy requirements -- a PaaS, single-VM deployment, or serverless function would suffice
- [ ] **Docker-compose orchestration overhead**: flag docker-compose setups with sidecar containers, network policies, and volume mounts for a project that could run as `python app.py` or `node server.js` during development
- [ ] **Service mesh for 2-3 services**: flag Istio, Linkerd, or Consul service mesh configuration for a system with fewer than 5 services -- the mesh adds more operational complexity than it solves

### Design Patterns as Golden Hammer
<!-- activation: keywords=["Factory", "factory", "Strategy", "strategy", "Builder", "builder", "Abstract", "abstract", "Pattern", "pattern", "Interface", "interface", "implements", "extends"] -->

- [ ] **Factory with one product**: flag `AbstractFactory`, `Factory`, or factory method implementations that create only one concrete type -- a direct constructor call is simpler and equally flexible
- [ ] **Strategy with one strategy**: flag strategy pattern implementations where only one concrete strategy exists in the codebase -- the indirection adds complexity with no variation benefit
- [ ] **Interface with one implementation**: flag interfaces (or abstract classes) with exactly one concrete implementation when the interface is not at an architectural boundary (not a port in hexagonal, not a test seam) -- premature abstraction adds navigation cost
- [ ] **Builder for simple objects**: flag builder pattern implementations for objects with 3 or fewer required fields and no complex construction logic -- a constructor or factory method is simpler
- [ ] **Observer/event for two participants**: flag observer pattern or event bus usage where there is exactly one publisher and one subscriber in the same process -- a direct method call is clearer
- [ ] **Generic type parameter used with one type**: flag generic class definitions (`class Foo<T>`) where `T` is only ever instantiated as one concrete type throughout the codebase -- the generic adds cognitive overhead without enabling reuse

### Architecture Patterns as Golden Hammer
<!-- activation: keywords=["hexagonal", "clean architecture", "onion", "ports", "adapters", "DDD", "aggregate", "repository", "domain event", "bounded context", "CQRS", "event sourcing"] -->

- [ ] **Full hexagonal/clean architecture for CRUD**: flag ports-and-adapters, onion architecture, or clean architecture layering (controller -> use case -> port -> adapter -> repository) for a resource with only CRUD operations and no business invariants -- the layers add indirection without protecting any business rules
- [ ] **DDD tactical patterns for anemic domain**: flag aggregate roots, domain events, repositories, and value objects used in a codebase where the "domain objects" have no business methods -- the tactical patterns are meaningless without a rich domain model to protect
- [ ] **CQRS for simple read/write**: flag CQRS (separate read and write models) for a resource with no divergent read/write requirements, no complex projections, and no performance asymmetry -- CQRS adds a second model to maintain for no benefit
- [ ] **Event sourcing for transactional CRUD**: flag event sourcing where the events are just CRUD wrappers (`OrderCreated`, `OrderUpdated`, `OrderDeleted`) with no business meaning -- a simple database table with timestamps provides the same audit trail with less complexity

### Wrong Runtime for the Workload
<!-- activation: keywords=["python", "ruby", "node", "javascript", "CPU", "compute", "process", "batch", "transform", "train", "model", "loop", "iterate", "benchmark"] -->

- [ ] **CPU-bound in interpreted language**: flag tight computational loops (matrix operations, image processing, cryptography, parsing, simulation) in Python, Ruby, or Node.js without native extensions (numpy, C extensions, Rust FFI, WebAssembly) -- the interpreter overhead makes these 10-100x slower than a compiled language
- [ ] **In-process data transformation for large datasets**: flag in-memory data transformations of 100k+ records in a language without efficient data structures for the task -- consider streaming, database-side computation, or a purpose-built tool (pandas, Spark, SQL)
- [ ] **Long-running synchronous process in single-threaded runtime**: flag batch jobs or data pipelines running in Node.js's single thread or Python's GIL-bound threading -- consider multiprocessing, a worker queue, or a runtime suited for CPU parallelism
- [ ] **Premature caching**: flag cache layer introduction (Redis, Memcached, in-memory cache) without evidence of a performance bottleneck from profiling -- caching adds cache invalidation complexity, and the bottleneck may be elsewhere

### Premature Optimization as Golden Hammer
<!-- activation: keywords=["cache", "Redis", "Memcached", "optimize", "performance", "pool", "buffer", "pre-compute", "index", "denormalize"] -->

- [ ] **Caching without profiling evidence**: flag new cache layers added without accompanying benchmark data, profiling output, or performance test results demonstrating the need -- premature caching is a common golden hammer
- [ ] **Database denormalization without read volume evidence**: flag denormalized schemas or materialized views added preemptively without evidence that the normalized query is a bottleneck
- [ ] **Connection pooling for low-traffic service**: flag complex connection pool configuration (min/max/idle timeout/eviction) for a service handling fewer than 10 requests per second -- default pool settings or no pool is sufficient
- [ ] **Pre-computation for infrequently accessed data**: flag batch pre-computation jobs that materialize results queried fewer than once per minute -- compute on demand is simpler and cheaper

## Common False Positives

- **Interface for testability**: an interface with one production implementation but substituted in tests (mock, stub, fake) is a legitimate test seam, not premature abstraction. Check whether the interface is used in test doubles before flagging.
- **Pattern preparing for known upcoming variation**: if the PR description, ticket, or comments reference an imminent second implementation, the pattern is forward-looking, not golden-hammer. Flag only when no concrete plan for variation exists.
- **Infrastructure mandated by organization**: Kubernetes, service mesh, or microservices may be required by platform team standards regardless of project size. Flag the organizational mandate, not the individual developer's choice.
- **ORM for maintainability over performance**: in non-performance-critical paths, ORM usage for type safety, migration management, and query composition may be a reasonable trade-off. Flag only when the ORM is actively causing problems (N+1, bulk operation slowness).
- **Clean architecture for evolving product**: a product expected to grow significantly may benefit from clean architecture even if the current feature set is simple. Flag only when the architecture overhead is large relative to the actual business logic.
- **Caching in latency-sensitive paths**: caching in hot paths with measured latency requirements (P99 < 50ms) is justified even without a formal profiling report. Flag only when caching is added to infrequently called paths.

## Severity Guidance

| Finding | Severity |
|---|---|
| ORM save/create in a loop processing 1000+ records where bulk API exists | Critical |
| CPU-bound computation in interpreted language without native extensions in production hot path | Critical |
| NoSQL document store with application-level joins enforcing relational integrity in code | Important |
| Microservice boundary for a CRUD entity with no independent scaling or deployment need | Important |
| Design pattern (factory, strategy, observer) with exactly one concrete implementation | Important |
| Full hexagonal/clean architecture for a CRUD endpoint with no business invariants | Important |
| Kubernetes manifests for a single-container project with no scaling requirements | Important |
| Global state store (Redux/Vuex/NgRx) for state used by a single component | Minor |
| Builder pattern for an object with 2-3 fields and no complex construction | Minor |
| Cache layer added without profiling evidence in a low-traffic path | Minor |
| Generic type parameter instantiated with only one type | Minor |
| Event sourcing with CRUD-wrapper events and no business-meaningful events | Minor |

## See Also

- `antipattern-over-abstraction` -- over-abstraction is the golden hammer applied specifically to design patterns and architectural layers
- `smell-speculative-generality` -- speculative generality creates abstractions for imagined future needs, a close cousin of the golden hammer
- `principle-dry-kiss-yagni` -- YAGNI directly opposes the golden hammer: do not add complexity until the requirement demands it
- `principle-coupling-cohesion` -- golden hammer choices often increase coupling by forcing ill-fitting abstractions into the design
- `antipattern-chatty-coupling` -- ORM N+1 problems are a golden hammer consequence that manifests as chatty coupling
- `pattern-strategy` -- strategy pattern is legitimate when multiple strategies exist, but a golden hammer when only one does
- `pattern-facade` -- facade is the appropriate tool to simplify complex subsystems, not a pattern to impose on simple ones

## Authoritative References

- [Abraham Maslow, *The Psychology of Science* (1966) -- "If the only tool you have is a hammer, it is tempting to treat everything as if it were a nail"](https://en.wikipedia.org/wiki/Law_of_the_instrument)
- [Andrew Hunt & David Thomas, *The Pragmatic Programmer* (1999), "The Evils of Duplication" and tool selection](https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition/)
- [Martin Fowler, "Is High Quality Software Worth the Cost?" (2019)](https://martinfowler.com/articles/is-quality-worth-cost.html)
- [Sam Newman, *Building Microservices* (2nd ed., 2021), Chapter 1: "Should I Use Microservices?" -- when microservices are and are not appropriate](https://www.oreilly.com/library/view/building-microservices-2nd/9781492034018/)
- [Rich Hickey, "Simple Made Easy" (Strange Loop 2011) -- the distinction between simple and easy, and why familiar tools are not always simple](https://www.infoq.com/presentations/Simple-Made-Easy/)
- [George Fairbanks, *Just Enough Software Architecture* (2010), Chapter 3: "Risk-Driven Architecture" -- match architectural investment to risk](https://www.georgefairbanks.com/book/)
