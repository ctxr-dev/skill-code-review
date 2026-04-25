---
id: conc-structured-concurrency
type: primary
depth_role: leaf
focus: "Detect fire-and-forget tasks, missing parent-child task lifetime binding, unhandled child exceptions, and TaskGroup/nursery misuse."
parents:
  - index.md
covers:
  - Fire-and-forget task spawned with no parent tracking or cancellation binding
  - Parent completes before child tasks finish, leaving orphan tasks running
  - Exception in child task not propagated to parent, silently lost
  - TaskGroup or nursery exited with pending tasks still running
  - Structured scope violated by leaking a task handle outside the scope boundary
  - Mixed structured and unstructured concurrency creating inconsistent lifetime guarantees
  - "Cancellation of parent does not cancel children (scope leak)"
  - "Error in one child does not cancel siblings (partial failure unhandled)"
  - CoroutineScope used as a global scope instead of a structured lifecycle scope
  - asyncio.TaskGroup exception handling swallows or mishandles ExceptionGroup
tags:
  - structured-concurrency
  - TaskGroup
  - nursery
  - CoroutineScope
  - errgroup
  - scoped-tasks
  - concurrency
  - lifecycle
activation:
  file_globs:
    - "**/*.{kt,java,py,swift,rs,go,js,ts,cs,scala}"
  keyword_matches:
    - TaskGroup
    - taskGroup
    - nursery
    - CoroutineScope
    - coroutineScope
    - supervisorScope
    - GlobalScope
    - structured
    - errgroup
    - StructuredTaskScope
    - withTaskGroup
    - async let
    - TaskGroup.addTask
  structural_signals:
    - task_spawned_outside_structured_scope
    - parent_returns_before_children
    - exception_in_child_not_propagated
source:
  origin: file
  path: conc-structured-concurrency.md
  hash: "sha256:b920cc983c833db7e405ceb20e1bd2119a33da718ca8aa8e7527de905c878acc"
---
# Structured Concurrency

## When This Activates

Activates when diffs spawn concurrent tasks (goroutines, coroutines, async tasks), use structured concurrency primitives (Python `asyncio.TaskGroup`, Kotlin `coroutineScope`, Swift `withTaskGroup`, Java `StructuredTaskScope`, Go `errgroup.Group`), or introduce fire-and-forget background work that should have a bounded lifetime. Structured concurrency ensures that concurrent task lifetimes mirror lexical scopes: a parent never completes before its children, exceptions propagate upward, and cancellation propagates downward. Violating these invariants produces orphan tasks, lost errors, and resource leaks.

## Audit Surface

- [ ] Every spawned task is bound to a scope that waits for it before completing
- [ ] No task handle or reference escapes the scope that created it
- [ ] Child exceptions propagate to the parent scope, not silently swallowed
- [ ] Structured scope blocks until all children complete (or are cancelled)
- [ ] Parent cancellation propagates to all child tasks
- [ ] One child's failure cancels siblings where fail-fast semantics are desired
- [ ] GlobalScope/Dispatchers.Unconfined/raw spawn is not used for work that should be scoped
- [ ] Python ExceptionGroup from TaskGroup is handled with `except*`, not bare `except`
- [ ] Java StructuredTaskScope is preferred over raw ExecutorService for scoped concurrent work
- [ ] Go errgroup.Group replaces bare goroutine spawning where error collection is needed
- [ ] Task lifetime is bounded by the logical operation (request, transaction, batch)
- [ ] Unstructured escape hatches (if used) are documented and justified

## Detailed Checks

### Fire-and-Forget Tasks
<!-- activation: keywords=["fire", "forget", "spawn", "launch", "go func", "create_task", "Task.Run", "tokio::spawn", "async", "background", "detach", "GlobalScope"] -->

- [ ] **GlobalScope.launch in Kotlin**: `GlobalScope.launch { ... }` creates a coroutine with no parent -- it outlives the calling function, is not cancelled when the caller is cancelled, and exceptions may be lost
- [ ] **asyncio.create_task without TaskGroup**: `asyncio.create_task(coro())` outside a `TaskGroup` creates an unstructured task -- if the calling coroutine completes or is cancelled, the task runs as an orphan
- [ ] **go func without errgroup**: `go func() { ... }()` spawns a goroutine with no error propagation or lifetime binding -- use `errgroup.Group.Go()` to collect errors and wait for completion
- [ ] **Task.Run in .NET without await**: `Task.Run(() => ...)` without awaiting or tracking the task -- if the task fails, the exception is only observed when the GC finalizes the task (or never)
- [ ] **tokio::spawn detached**: `tokio::spawn(async { ... })` returns a `JoinHandle` that is dropped -- the task runs detached with no error propagation; use a `JoinSet` for structured task management

### Parent Not Waiting for Children
<!-- activation: keywords=["wait", "join", "await", "complete", "finish", "parent", "return", "scope", "exit", "WaitGroup", "Done", "JoinSet"] -->

- [ ] **Function returns before children finish**: a function spawns tasks and returns immediately -- the caller receives a result while background tasks are still running, potentially mutating state the caller assumes is final
- [ ] **Scope exits with pending tasks**: a `CoroutineScope` or `TaskGroup` is manually completed or cancelled while children are still running -- some runtimes silently cancel children; others leave them orphaned
- [ ] **WaitGroup.Wait() on wrong path**: Go `wg.Wait()` is called only on the success path -- if an early return occurs on an error path, spawned goroutines are not waited for
- [ ] **Missing JoinSet.join_next()**: Rust `JoinSet` is created and tasks are added, but `join_next()` is never called in a loop -- results and errors from completed tasks are never observed

### Exception Propagation from Children
<!-- activation: keywords=["exception", "error", "propagate", "ExceptionGroup", "except*", "cause", "suppress", "swallow", "crash", "fail", "handle", "unhandled"] -->

- [ ] **Child exception silently lost**: a child task throws but the parent scope catches a generic exception and continues -- the child's error is not surfaced to the caller, leading to silent data corruption
- [ ] **ExceptionGroup not handled**: Python 3.11+ `TaskGroup` raises `ExceptionGroup` containing all child exceptions; code uses `except Exception:` which does not catch `ExceptionGroup` (it inherits from `BaseException`) -- use `except*` for individual exception types
- [ ] **supervisorScope misused**: Kotlin `supervisorScope` prevents child failures from cancelling siblings -- correct for independent tasks, but incorrect when tasks are interdependent and one failure should stop all
- [ ] **errgroup error discarded**: Go `errgroup.Group.Wait()` returns the first error, but the caller does not check it -- the error from the failed goroutine is silently dropped

### TaskGroup/Nursery Misuse
<!-- activation: keywords=["TaskGroup", "taskGroup", "nursery", "withTaskGroup", "addTask", "start_soon", "start", "scope", "StructuredTaskScope"] -->

- [ ] **Task handle escapes scope**: a task or coroutine reference is stored in a variable outside the `TaskGroup` scope and used after the scope exits -- the task may be cancelled or completed, and using the handle is undefined
- [ ] **Dynamic task spawning after scope close**: code attempts to add tasks to a `TaskGroup` after iteration/completion has started -- some runtimes raise errors, others silently ignore the addition
- [ ] **Nested TaskGroups without cancellation link**: inner `TaskGroup` is created without inheriting the outer group's cancellation -- cancelling the outer group does not cancel the inner group's tasks
- [ ] **StructuredTaskScope.fork() without join()**: Java `StructuredTaskScope` forks tasks but `join()` is not called -- the scope's close() throws because join() was never invoked

### Mixed Structured and Unstructured
<!-- activation: keywords=["mixed", "GlobalScope", "Dispatchers.Unconfined", "detach", "background", "daemon", "raw", "unstructured", "escape"] -->

- [ ] **Structured scope wrapping unstructured spawn**: a `coroutineScope` block internally uses `GlobalScope.launch` -- the structured scope exits and cancels, but the GlobalScope coroutine continues running
- [ ] **Unstructured task storing structured result**: a fire-and-forget task writes a result that the structured scope depends on -- the write may happen after the scope exits, causing a race
- [ ] **Background daemon thread in structured context**: a long-lived daemon thread is started inside a request-scoped structured scope -- the thread outlives the scope and may hold resources
- [ ] **Escape hatch undocumented**: code intentionally uses an unstructured spawn (e.g., for cross-request caching) but does not document why structured concurrency is inappropriate

## Common False Positives

- **Application-lifetime background services**: long-lived background tasks (health check loops, metrics exporters, cache refreshers) intentionally outlive any single request scope. Do not flag `GlobalScope` if the task is genuinely application-scoped and has its own shutdown mechanism.
- **Event loop main tasks**: the top-level `asyncio.run()` or `runBlocking` is inherently unstructured. Do not flag the outermost scope.
- **Framework-managed concurrency**: web frameworks (Spring, ASP.NET, Ktor) manage request-scoped task lifetimes. Do not flag framework-managed scopes; flag only user-spawned tasks within those scopes.
- **Test coroutines**: test frameworks provide their own coroutine scopes (`runTest`, `TestCoroutineScope`). Do not flag test-specific scope usage.

## Severity Guidance

| Finding | Severity |
|---|---|
| Fire-and-forget task in request-handling code (orphan task, lost error) | high |
| Parent returns before child tasks complete (data race on results) | high |
| Child exception not propagated to parent (silent failure) | high |
| GlobalScope.launch in request-scoped code (lifetime leak) | high |
| TaskGroup ExceptionGroup not handled with except* (Python) | medium |
| errgroup.Wait() error not checked (Go) | medium |
| Task handle escapes structured scope boundary | medium |
| supervisorScope used where coroutineScope is needed (interdependent tasks) | medium |
| Unstructured spawn inside structured scope (cancellation leak) | medium |
| Missing documentation for intentional unstructured escape hatch | low |
| StructuredTaskScope.fork() without join() (Java) | medium |
| Nested TaskGroups without cancellation inheritance | low |

## See Also

- `conc-async-cancellation` -- structured concurrency provides automatic cancellation; verify cancellation propagates through scopes
- `conc-futures-promises` -- futures need structured consumption; TaskGroup replaces manual Promise.all/gather
- `conc-csp-channels` -- Go errgroup provides structured concurrency for goroutines communicating via channels
- `conc-actor-model` -- actors have long lifetimes outside structured scopes; verify they have their own lifecycle management
- `pattern-thread-pool` -- StructuredTaskScope (Java) replaces raw ExecutorService for scoped work
- `principle-encapsulation` -- structured scopes encapsulate concurrent task lifetime; escaping the scope breaks encapsulation

## Authoritative References

- [Martin Sustrik, "Structured Concurrency" (2016)](https://250bpm.com/blog:71/)
- [Nathaniel J. Smith, "Notes on Structured Concurrency" (2018)](https://vorpus.org/blog/notes-on-structured-concurrency-or-go-statement-considered-harmful/)
- [JEP 453: Structured Concurrency (Java)](https://openjdk.org/jeps/453)
- [Kotlin Documentation: Coroutine Context and Dispatchers](https://kotlinlang.org/docs/coroutine-context-and-dispatchers.html)
- [Python Documentation: asyncio.TaskGroup](https://docs.python.org/3/library/asyncio-task.html#asyncio.TaskGroup)
