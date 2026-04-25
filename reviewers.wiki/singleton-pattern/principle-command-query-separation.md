---
id: principle-command-query-separation
type: primary
depth_role: leaf
focus: "Verify that functions either perform an action (command) or return data (query) but do not mix both responsibilities"
parents:
  - index.md
covers:
  - Getter or query-named functions that mutate state as a side effect
  - "Void/command functions that return computed values the caller needs"
  - Functions that read-then-write atomically but expose neither operation cleanly
  - Cache-populating reads that behave differently on first vs subsequent calls
  - "Builder/fluent methods that both mutate and return (conventional exception)"
  - Event-emitting getters that trigger observer cascades
  - Save methods that also return the saved entity with server-generated fields
  - Validation functions that both check and fix the input
  - "Pop/dequeue operations that combine removal with retrieval"
  - Transaction-scoped operations that query and mutate in one call for atomicity
tags:
  - cqs
  - side-effects
  - query
  - command
  - mutation
  - separation-of-concerns
  - api-design
activation:
  file_globs:
    - "**/*"
  keyword_matches:
    - function
    - method
    - return
    - void
    - get
    - set
    - query
    - command
    - mutate
    - fetch
    - find
    - save
    - update
    - delete
    - create
    - send
    - emit
  structural_signals:
    - Function definitions in diff
    - Method definitions in diff
    - Return statements in diff
source:
  origin: file
  path: principle-command-query-separation.md
  hash: "sha256:6d83166a5f491232318f7157173a8c64a70578b7387497af062481c3f23d0cc1"
---
# Command-Query Separation

## When This Activates

Loaded when diffs contain function or method definitions. CQS violations create some of the hardest bugs to diagnose: a caller invokes what looks like a read, not expecting that it changed state. This reviewer identifies mixed-responsibility functions and guides them toward a clean split.

## Audit Surface

- [ ] Function named get/find/is/has/check/compute that writes state, emits events, or calls I/O
- [ ] Function named set/save/update/delete/create/send that returns a meaningful value used by callers
- [ ] Method modifies this/self fields AND returns a non-this value
- [ ] Database read function that also writes (INSERT ... RETURNING, upsert in a find method)
- [ ] Validation function that both reports errors and mutates input to fix them
- [ ] Iterator.next() style combined advance-and-return operations lacking CQS-aware design
- [ ] REST endpoint handler that mixes GET semantics (idempotent read) with POST semantics (state change)
- [ ] Cache.getOrCreate that transparently creates entries -- invisible write on read path
- [ ] Logger or metrics call inside a query function that alters observable system state
- [ ] Event dispatch (publish, emit, notify) inside a computation/query function
- [ ] Property setter that triggers cascading writes to related objects or external systems
- [ ] Pop/shift/dequeue that removes and returns -- consider separate peek + remove
- [ ] Transaction wrapper that both executes the operation and returns the result
- [ ] Test assertion that also has side effects (modifying test state while checking)
- [ ] Sort/filter method that both mutates the collection and returns it

## Detailed Checks

### Query Functions That Mutate
<!-- activation: keywords=["get", "find", "fetch", "is", "has", "check", "compute", "calculate", "count", "query", "select", "read", "lookup", "resolve"] -->

- [ ] Functions with query-style names (`get*`, `find*`, `is*`, `has*`, `compute*`, `count*`) must be free of observable side effects -- no database writes, no event emission, no shared-state mutation
- [ ] A function returning a value should be safe to call any number of times with the same arguments and produce the same result (referential transparency for queries)
- [ ] Cache population on first read is acceptable only if the cache is an implementation detail invisible to callers -- verify no caller depends on the caching side effect
- [ ] Lazy initialization triggered by a getter is acceptable if the initialized state is immutable once set; flag if the lazy init can fail and leave the object in a partially initialized state
- [ ] Read operations that acquire locks must release them before returning -- a query should not change the concurrency state observable to other threads
- [ ] Computed properties that trigger ORM lazy-loading are a known CQS tension point -- document the I/O cost in the interface or prefetch explicitly

### Command Functions That Return
<!-- activation: keywords=["set", "save", "update", "delete", "create", "send", "emit", "publish", "write", "insert", "remove", "mutate", "push", "enqueue"] -->

- [ ] If a command function returns the modified entity (e.g., `save` returns the entity with a new ID), consider whether this is a convenience or a hidden query -- if callers need the returned value, document it as an intentional query+command
- [ ] Void functions that return error codes or success booleans are acceptable -- the return signals command outcome, not a separate query
- [ ] `create` functions that return the created entity are a pragmatic CQS exception -- document the return value in the signature or docstring
- [ ] Functions that return `this` for fluent chaining (builders, configurators) are a recognized exception -- verify the chain reads naturally and does not obscure mutation
- [ ] If a command returns a value that callers ignore, the return value may be dead code -- check whether any caller actually uses it; if none, make it void

### Mixed Operations Requiring Atomicity
<!-- activation: keywords=["atomic", "transaction", "lock", "upsert", "getOrCreate", "findOrInsert", "pop", "dequeue", "compareAndSwap", "putIfAbsent"] -->

- [ ] `getOrCreate` / `findOrInsert` / `upsert` patterns combine query and command for atomicity -- this is a recognized exception, but name it to make the dual nature explicit (prefer `getOrCreate` over `find`)
- [ ] `pop` / `dequeue` / `take` combines retrieval and removal -- if the pattern is avoidable, offer `peek` + `remove` as an alternative; if atomicity is required (concurrent queue), document why
- [ ] Compare-and-swap / test-and-set operations are inherently CQS violations for concurrency correctness -- accept them but verify they are encapsulated in a concurrency primitive, not scattered through business logic
- [ ] Database `INSERT ... RETURNING` or `UPDATE ... RETURNING` is a pragmatic exception -- ensure the function name reflects both operations (e.g., `createAndReturn`, `saveUser` returning the saved entity)
- [ ] Transaction-scoped read-modify-write sequences should be encapsulated in a single well-named function that makes the atomic nature obvious from the name

### API and Endpoint Design
<!-- activation: keywords=["endpoint", "handler", "route", "controller", "REST", "GET", "POST", "PUT", "DELETE", "graphql", "mutation", "query"] -->

- [ ] HTTP GET handlers must be idempotent and free of state changes -- any request logging or analytics is acceptable, but cache writes, counter increments, or "mark as read" behavior belongs in POST/PUT
- [ ] GraphQL queries must not trigger mutations -- if a resolver populates a cache or triggers a side effect, it should be a mutation
- [ ] REST endpoints that both create a resource and return a list (e.g., POST that returns all items) are a CQS violation at the API level -- return only the created resource; let the client re-query the list
- [ ] Webhook handlers that both acknowledge receipt and trigger processing should separate the acknowledgment (sync response) from the processing (async command)

### Validation as Query vs Command
<!-- activation: keywords=["validate", "sanitize", "normalize", "clean", "fix", "repair", "correct", "transform"] -->

- [ ] Validation functions should be pure queries: accept input, return a list of errors or a boolean -- they must not modify the input
- [ ] Sanitization/normalization functions are commands: they transform input. Name them `sanitize*` or `normalize*`, never `validate*`
- [ ] Functions that both validate and fix (e.g., `validateAndFix`, `cleanInput`) should be split into `validate` (query) + `sanitize` (command) unless the combined operation is atomic and the name reflects it
- [ ] Schema validation libraries that mutate input to apply defaults (e.g., setting missing fields) are a hidden CQS violation -- verify callers expect the mutation or use a copy

## Common False Positives

- **Builder/fluent pattern**: Methods that mutate state and return `this`/`self` for chaining are an accepted convention. Do not flag these unless they return something other than the builder itself.
- **Iterator protocol**: `next()` advancing and returning is fundamental to the iterator contract. Flag only if a CQS-clean alternative (like separate `peek`/`advance`) would improve the API without breaking the protocol.
- **Logging and telemetry**: Read-path functions that log or emit metrics are not CQS violations if the logging is purely observational and does not affect the function's return value or system state. Flag only if the logging has side effects (rate limiting, circuit breaking).
- **Immutable return from command**: A command that returns the new immutable state (functional style, Redux reducers) is not a CQS violation -- the return value is the new state, not a separate query.
- **Framework-mandated patterns**: Some frameworks require handlers to both mutate and return (Express middleware calling `next()` and returning, React `useReducer`). Accept framework contracts.

## Severity Guidance

| Finding | Severity |
|---|---|
| GET endpoint or GraphQL query that writes to database or triggers state change | Critical |
| Security/auth check function that mutates authentication state as side effect | Critical |
| Query-named function that emits events consumed by other systems | Important |
| Validation function that silently mutates input data | Important |
| Getter that triggers lazy-load with no documentation of I/O cost | Important |
| Command that returns a value no caller uses (dead return) | Minor |
| getOrCreate that is well-named but lacks documentation about atomic semantics | Minor |
| Sort that mutates and returns the same collection (standard library pattern) | Minor |

## See Also

- `principle-least-astonishment` -- CQS violations are a primary source of astonishment
- `principle-fail-fast` -- queries with hidden side effects delay error detection
- `principle-naming-and-intent` -- the name is the first signal of whether a function is a query or command
- `principle-dry-kiss-yagni` -- mixed functions are often complex (KISS violation) and do too much

## Authoritative References

- [Bertrand Meyer - Object-Oriented Software Construction, Section 23.1](https://www.amazon.com/Object-Oriented-Software-Construction-Bertrand-Meyer/dp/0136291554)
- [Martin Fowler - CommandQuerySeparation](https://martinfowler.com/bliki/CommandQuerySeparation.html)
- [Greg Young - CQRS Documents](https://cqrs.files.wordpress.com/2010/11/cqrs_documents.pdf)
- [Clean Code, Ch. 3: Functions (Command Query Separation)](https://www.oreilly.com/library/view/clean-code-a/9780136083238/)
- [Mark Seemann - CQS versus server-generated IDs](https://blog.ploeh.dk/2014/08/11/cqs-versus-server-generated-ids/)
