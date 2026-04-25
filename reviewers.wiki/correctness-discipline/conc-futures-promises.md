---
id: conc-futures-promises
type: primary
depth_role: leaf
focus: Detect unhandled rejections, unconsumed future results, error-swallowing promise chains, and callback-to-async migration issues.
parents:
  - index.md
covers:
  - "Promise rejection unhandled -- process crashes (Node.js) or error silently lost"
  - Promise.all fails fast but partial results and cleanup are not handled
  - Future result never awaited -- computation runs but outcome is discarded
  - "Callback hell (deeply nested callbacks) where async/await or futures would be clearer"
  - "CompletableFuture chain missing exceptionally/handle terminal"
  - Tokio JoinHandle dropped, losing panics and errors from spawned tasks
  - "Python asyncio Future result never retrieved -- 'Task exception was never retrieved'"
  - "Sequential await in loop where concurrent execution (Promise.all) is appropriate"
  - "Mixing async/await with raw .then() causing unhandled rejection gaps"
  - Future chaining that swallows the error type, losing context for debugging
  - Promise.race without cleanup of losing branches
tags:
  - futures
  - promises
  - async-await
  - CompletableFuture
  - Task
  - unhandled-rejection
  - concurrency
activation:
  file_globs:
    - "**/*.{js,ts,mjs,mts,py,java,kt,scala,cs,rs,swift,go,dart,rb}"
  keyword_matches:
    - Promise
    - promise
    - then
    - catch
    - async
    - await
    - Future
    - CompletableFuture
    - Task
    - Task.Run
    - supplyAsync
    - thenApply
    - exceptionally
    - JoinHandle
    - create_task
    - asyncio
    - resolve
    - reject
    - allSettled
    - Promise.all
  structural_signals:
    - promise_chain_without_catch
    - future_result_discarded
    - sequential_await_in_loop
source:
  origin: file
  path: conc-futures-promises.md
  hash: "sha256:e07727069e82792de84cfbee982169cb1e2c1f3eaeb77d4394c67ba17f2a50b8"
---
# Futures and Promises

## When This Activates

Activates when diffs use JavaScript/TypeScript Promises, Java `CompletableFuture`, .NET `Task`, Python `asyncio.Future`/`asyncio.Task`, Rust `Future`/`JoinHandle`, Kotlin `Deferred`, or any async/await pattern. Futures and promises represent eventual results, but unhandled rejections, unconsumed results, and incorrect chaining produce silent failures that pass all tests and fail in production under load or error conditions.

## Audit Surface

- [ ] Every promise chain has error handling (.catch, try/catch around await, or .handle/.exceptionally)
- [ ] Promise.all/allSettled choice matches whether partial failure is acceptable
- [ ] Future/Task results are consumed -- not discarded when the operation has side effects
- [ ] Callback nesting is converted to async/await or flat promise chains where possible
- [ ] CompletableFuture chains have a terminal error handler
- [ ] Spawned task JoinHandles are awaited or explicitly detached with documented justification
- [ ] Python asyncio task exceptions are retrieved before task is garbage-collected
- [ ] Concurrent operations are batched with Promise.all, not awaited sequentially in a loop
- [ ] Async/await and .then() are not mixed in the same error-handling scope
- [ ] Error context is preserved through the chain (not erased by generic catch-rethrow)
- [ ] Promise.race losing branches have cleanup (abort, cancel, timeout)
- [ ] Nested .then() callbacks are flattened by returning the inner promise
- [ ] Async functions have consistent return/throw behavior on all paths

## Detailed Checks

### Unhandled Rejections and Missing Error Handling
<!-- activation: keywords=["catch", "reject", "rejection", "unhandled", "error", "exception", "throw", "fail", "crash", "then", "await", "try"] -->

- [ ] **Floating promise**: `doAsync()` called without `await` or `.catch()` -- if the promise rejects, Node.js emits an `unhandledRejection` event (which crashes the process by default in Node 15+), and browsers log it silently
- [ ] **.then() without .catch()**: `fetch(url).then(r => r.json())` -- if fetch or json() throws, the rejection is unhandled; add `.catch(err => ...)` or wrap in try/catch with await
- [ ] **catch-and-ignore**: `.catch(() => {})` or `.catch(e => console.log(e))` -- the error is logged but the caller receives `undefined` instead of the expected result, causing downstream failures
- [ ] **CompletableFuture no terminal**: `supplyAsync(() -> ...).thenApply(...)` without `.exceptionally()` or `.handle()` -- exceptions in the chain are stored in the future but never observed
- [ ] **async function implicit undefined**: an async function catches an error and returns nothing on the error path -- the caller receives `undefined` instead of a rejected promise, masking the failure

### Unconsumed Future Results
<!-- activation: keywords=["discard", "ignore", "fire", "forget", "result", "JoinHandle", "Task", "Future", "submit", "spawn", "create_task", "void"] -->

- [ ] **JoinHandle dropped in Rust**: `tokio::spawn(async { ... })` returns a `JoinHandle` that is dropped -- if the task panics, the error is silently lost
- [ ] **Python task not awaited**: `asyncio.create_task(coro())` without storing or awaiting the task -- if the task raises an exception, Python logs "Task exception was never retrieved" at GC time
- [ ] **Java Future discarded**: `executor.submit(callable)` returns a `Future` that is not assigned to a variable -- if the callable throws, the exception vanishes
- [ ] **.NET Task not awaited**: `DoSomethingAsync()` called without `await` or `.Wait()` -- the task runs but its result (including exceptions) is never observed; the compiler warns (CS4014) but it may be suppressed
- [ ] **Intentional fire-and-forget without annotation**: if discarding the result is intentional (best-effort logging, metrics), the intent should be explicit (`_ = task`, `// fire-and-forget`, `@SuppressWarnings`)

### Promise.all and Concurrent Composition
<!-- activation: keywords=["all", "allSettled", "race", "any", "Promise.all", "Promise.allSettled", "Promise.race", "WhenAll", "WhenAny", "gather", "join", "parallel", "concurrent", "batch"] -->

- [ ] **Promise.all without error handling**: `Promise.all(promises)` rejects on the first failure, but the other promises continue running -- their rejections may be unhandled, and their side effects are not rolled back
- [ ] **Promise.all when allSettled is needed**: code needs all results even if some fail (e.g., fetching data from multiple sources), but uses `Promise.all` which fails fast -- use `Promise.allSettled` and inspect each result
- [ ] **Sequential await in loop**: `for (const url of urls) { await fetch(url); }` runs requests sequentially -- use `Promise.all(urls.map(url => fetch(url)))` for concurrent execution (unless ordering is required)
- [ ] **Promise.race without cleanup**: `Promise.race([fetch(url), timeout(5000)])` -- if fetch wins, the timeout timer is not cleared; if timeout wins, the fetch response is not consumed (connection leak)
- [ ] **Python asyncio.gather return_exceptions**: `asyncio.gather(*tasks)` raises on the first exception; use `return_exceptions=True` if partial results are needed -- but then results mix values and exceptions, requiring careful inspection

### Callback-to-Async Migration
<!-- activation: keywords=["callback", "then", "nested", "pyramid", "hell", "indent", "chain", "flat", "async", "await", "promisify"] -->

- [ ] **Callback pyramid**: four or more levels of nested callbacks (`fs.readFile(f, (err, data) => { parse(data, (err, obj) => { ... })})`) -- convert to async/await or promise chains for readability and error handling
- [ ] **Mixed .then() and await**: the same function uses both `.then()` chains and `await` -- error handling is fragmented; a rejection in the `.then()` chain may not be caught by the surrounding `try/catch`
- [ ] **Manual Promise wrapping**: `new Promise((resolve, reject) => { callback((err, result) => { ... })})` used in a codebase that has `util.promisify` or equivalent -- unnecessary boilerplate
- [ ] **Nested .then()**: `.then(result => { return fetch(url).then(r => r.json()).then(data => { ... }) })` -- the inner promise should be returned, not nested, to keep the chain flat and error handling unified

### Future Chain Error Handling
<!-- activation: keywords=["exceptionally", "handle", "whenComplete", "recover", "recoverWith", "onFailure", "onComplete", "thenCompose", "flatMap", "map"] -->

- [ ] **Error type erased**: `.catch(e => { throw new Error('failed') })` discards the original error's message, stack, and type -- use `throw new Error('context', { cause: e })` (ES2022) or rethrow the original
- [ ] **CompletableFuture handle vs exceptionally**: `.handle((result, ex) -> ...)` is called on both success and failure; `.exceptionally(ex -> ...)` is called only on failure -- using the wrong one causes null checks and type confusion
- [ ] **Scala Future recover too broad**: `.recover { case _: Exception => default }` catches all exceptions including fatal ones (OOM, StackOverflow) -- use a specific exception type
- [ ] **Error mapped to null/None**: future error is caught and mapped to `null`, `None`, or an empty result -- downstream code sees a successful result with no data, masking the failure

## Common False Positives

- **Event emitter patterns**: Node.js event emitters (`on('data')`, `on('error')`) are callback-based by design and do not need conversion to promises if the event stream is long-lived.
- **Intentional fire-and-forget**: logging, metrics, and cache warming tasks may intentionally discard results. Do not flag if the intent is documented or annotated.
- **Test assertions with await**: test frameworks (Jest, Mocha) handle promise rejections in test cases. Do not flag missing `.catch()` in test code that uses `expect(...).rejects`.
- **Framework lifecycle hooks**: framework hooks (React useEffect cleanup, Angular OnDestroy) manage async lifecycle. Flag only if the cleanup is missing, not the pattern itself.
- **Stream/observable patterns**: RxJS observables and Node.js streams use subscribe/pipe rather than await. Do not flag these as "missing await."

## Severity Guidance

| Finding | Severity |
|---|---|
| Floating promise with no .catch() or try/catch in production code | high |
| Future/Task result discarded when the operation has side effects or may fail | high |
| Promise.all without error handling for rejected promises | high |
| JoinHandle/Task dropped, silently losing panics or exceptions | high |
| Sequential await in loop where concurrent execution is possible (performance) | medium |
| Mixed .then() and await in same function (error handling gap) | medium |
| Error type erased in catch/recover, losing original context | medium |
| Promise.race without cleanup of losing branch | medium |
| Callback pyramid where async/await is available | medium |
| Nested .then() instead of flat chain with returned promises | low |
| Python task exception only logged at GC time | medium |
| CompletableFuture chain without terminal error handler | medium |
| Intentional fire-and-forget without explicit annotation | low |

## See Also

- `conc-async-cancellation` -- cancellation must propagate through future chains; verify cancellation wiring
- `conc-structured-concurrency` -- structured concurrency scopes replace manual Promise.all/gather with automatic child tracking
- `conc-race-conditions-data-races` -- futures that share mutable state via closures may introduce races
- `pattern-thread-pool` -- futures submitted to thread pools need result consumption and exception handling
- `principle-fail-fast` -- swallowed rejections and erased errors violate fail-fast; errors must propagate
- `principle-encapsulation` -- promise chains should encapsulate error handling; leaking unhandled rejections breaks encapsulation

## Authoritative References

- [MDN Web Docs: Using Promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises)
- [Node.js Documentation: Unhandled Rejections](https://nodejs.org/api/process.html#event-unhandledrejection)
- [Java SE Documentation: CompletableFuture](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/CompletableFuture.html)
- [Tokio Documentation: Tasks](https://tokio.rs/tokio/tutorial/spawning)
- [Python Documentation: asyncio Tasks](https://docs.python.org/3/library/asyncio-task.html)
