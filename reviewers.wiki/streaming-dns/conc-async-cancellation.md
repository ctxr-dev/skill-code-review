---
id: conc-async-cancellation
type: primary
depth_role: leaf
focus: Detect missing cancellation propagation, ignored cancel tokens, resource leaks on cancellation, and unstructured cancellation scopes.
parents:
  - index.md
covers:
  - Cancellation token or context not propagated to child tasks or downstream calls
  - CancellationToken passed but never checked in long-running loops
  - "Resource (connection, file handle, temp file) not cleaned up when operation is cancelled"
  - Cancellation scope is not structured -- parent does not cancel children on its own cancellation
  - "Task.Run or go func without propagating the parent's cancellation context"
  - "HTTP request cancelled by client but server continues processing (wasted resources)"
  - CancellationTokenSource not disposed, leaking timer registrations
  - "AbortController/AbortSignal not wired to fetch or stream operations"
  - Python asyncio task cancelled but CancelledError caught and swallowed
  - Kotlin coroutine cancellation not cooperative -- blocking call ignores isActive
  - Go context.WithCancel cancel function not called, leaking goroutine and context tree
tags:
  - cancellation
  - async
  - context
  - CancellationToken
  - AbortController
  - timeout
  - cooperative-cancellation
activation:
  file_globs:
    - "**/*.{cs,java,kt,scala,py,ts,js,go,rs,swift,cpp}"
  keyword_matches:
    - cancel
    - Cancel
    - Cancellation
    - CancellationToken
    - CancellationTokenSource
    - AbortController
    - AbortSignal
    - context.WithCancel
    - context.WithTimeout
    - ctx.Done
    - ctx.Err
    - CancelledError
    - asyncio.CancelledError
    - isActive
    - ensureActive
    - TaskCanceledException
  structural_signals:
    - async_method_without_cancellation_parameter
    - cancellation_token_unused
    - context_cancel_not_deferred
source:
  origin: file
  path: conc-async-cancellation.md
  hash: "sha256:b2fb9696e88f76a79fb48d6fd5a65b453b6d2c98fb7e63f887789cf9dafb6c62"
---
# Async Cancellation

## When This Activates

Activates when diffs introduce async operations with cancellation support (CancellationToken in .NET, context.Context in Go, AbortController in JavaScript, asyncio cancellation in Python, Kotlin coroutine cancellation), add long-running loops or I/O operations that should be cancellable, or modify HTTP handler code where client disconnection should stop server-side processing. Cancellation bugs are silent resource leaks: the system continues doing work that nobody wants, consuming CPU, memory, database connections, and network bandwidth.

## Audit Surface

- [ ] Async methods accept and forward a cancellation token/context to downstream calls
- [ ] Long-running loops check cancellation at each iteration or at regular intervals
- [ ] Resources acquired before cancellation are cleaned up in finally/defer/drop
- [ ] Parent cancellation automatically propagates to all child tasks
- [ ] Spawned tasks receive the parent's cancellation context, not a fresh one
- [ ] HTTP handlers stop processing when the client disconnects
- [ ] CancellationTokenSource/.NET timers are disposed to avoid GC root leaks
- [ ] JavaScript AbortController signals are wired to fetch, stream, and event listener operations
- [ ] Python CancelledError is re-raised after cleanup, not caught and swallowed
- [ ] Kotlin coroutines use cancellable functions and check isActive
- [ ] Go context cancel functions are deferred immediately after context creation
- [ ] Timeout cancellation and user-initiated cancellation are distinguishable
- [ ] Cancellation code paths have test coverage

## Detailed Checks

### Missing Cancellation Propagation
<!-- activation: keywords=["propagate", "forward", "pass", "token", "context", "child", "downstream", "parent", "spawn", "Task.Run", "go func", "create_task"] -->

- [ ] **Async method ignores cancellation**: method signature has no `CancellationToken`, `context.Context`, or `AbortSignal` parameter -- callers have no way to cancel the operation
- [ ] **Token not forwarded**: method accepts a `CancellationToken` but passes `CancellationToken.None` or a new `CancellationTokenSource` to downstream calls -- the parent's cancellation does not reach the child
- [ ] **Go context not propagated**: `context.Background()` is used inside a function that has access to a parent context -- the parent's timeout and cancellation are ignored
- [ ] **Task.Run without token**: `.NET Task.Run(() => ...)` does not receive the cancellation token -- the spawned task runs to completion even if the parent is cancelled
- [ ] **Python create_task without cancel forwarding**: `asyncio.create_task(coro)` creates a task that is not cancelled when the parent task is cancelled -- use `TaskGroup` (Python 3.11+) for structured cancellation

### Ignored Cancel Token
<!-- activation: keywords=["check", "poll", "isActive", "IsCancellationRequested", "Done", "Err", "ThrowIfCancellationRequested", "ensureActive", "loop", "while", "for"] -->

- [ ] **Token accepted but never checked**: function accepts a `CancellationToken` but never calls `ThrowIfCancellationRequested()` or checks `IsCancellationRequested` -- the token is decorative
- [ ] **Long loop without cancellation check**: a loop processes thousands of items but does not check `ctx.Done()`, `token.IsCancellationRequested`, or `isActive` on any iteration -- cancellation is delayed until the loop completes
- [ ] **Blocking call not cancellable**: a synchronous blocking call (JDBC query, file read) does not use an interruptible or timed variant -- the thread blocks until the call completes regardless of cancellation
- [ ] **Kotlin blocking call in coroutine**: a coroutine calls a blocking function without `withContext(Dispatchers.IO)` and without checking `isActive` -- the coroutine ignores cancellation during the blocking call

### Resource Cleanup on Cancellation
<!-- activation: keywords=["cleanup", "resource", "dispose", "close", "release", "finally", "defer", "using", "connection", "handle", "temp", "file", "transaction", "rollback"] -->

- [ ] **Connection not closed on cancel**: a database connection or HTTP client is opened, then the operation is cancelled, but the connection is not closed because the cleanup code is only on the success path
- [ ] **Temporary file not deleted on cancel**: a temp file is created for processing, but cancellation skips the cleanup code that deletes it -- temp files accumulate on disk
- [ ] **Transaction not rolled back on cancel**: a database transaction is started, operations are partially applied, then the task is cancelled without rollback -- the transaction holds locks until it times out
- [ ] **Dispose not called**: .NET `CancellationTokenSource` with a timer is not disposed -- the timer registration leaks as a GC root, preventing collection
- [ ] **Go context tree leak**: `context.WithCancel` or `context.WithTimeout` returns a cancel function that is never called -- the context tree grows, leaking memory proportional to the number of requests

### Cancellation Scope Structure
<!-- activation: keywords=["scope", "structured", "TaskGroup", "nursery", "withTimeout", "withCancel", "linked", "combined", "composite"] -->

- [ ] **Fire-and-forget async task**: `Task.Run`, `asyncio.create_task`, or `go func` launches work outside any structured scope -- when the parent is cancelled, the orphaned task continues running
- [ ] **Unlinked cancellation sources**: parent and child use separate `CancellationTokenSource` instances that are not linked -- cancelling the parent does not cancel the child
- [ ] **Missing withTimeout scope**: an operation should have a deadline but relies on the caller to cancel -- use `context.WithTimeout` (Go), `withTimeout` (Kotlin), or `CancellationTokenSource(TimeSpan)` (.NET) to enforce a deadline
- [ ] **Catch-all swallows cancellation**: a `catch (Exception)` or `except Exception` block catches the cancellation exception and converts it to a regular error -- the cancellation signal is lost and upstream code does not know the operation was cancelled

### Language-Specific Cancellation Pitfalls
<!-- activation: keywords=["AbortController", "AbortSignal", "CancelledError", "OperationCanceledException", "TaskCanceledException", "context.Canceled", "isActive", "ensureActive", "job", "Job", "cancel"] -->

- [ ] **JavaScript fetch without AbortSignal**: `fetch(url)` has no `signal` option -- the request cannot be cancelled on component unmount or timeout, wasting server resources and network bandwidth
- [ ] **Python CancelledError swallowed**: `except asyncio.CancelledError: pass` or `except Exception:` catches the cancellation and continues -- the task appears to complete normally instead of propagating cancellation
- [ ] **Go ctx.Err() not checked after select**: after `select { case <-ctx.Done(): }`, code does not check `ctx.Err()` to distinguish `context.Canceled` from `context.DeadlineExceeded` -- error reporting is imprecise
- [ ] **Kotlin Job.cancel() on wrong scope**: cancelling a `Job` cancels all children, but the code cancels the parent scope instead of the specific child -- unrelated coroutines are cancelled

## Common False Positives

- **Best-effort background work**: some operations (cache warming, metrics reporting, log flushing) are best-effort and intentionally not cancellable. Do not flag these if the intent is documented.
- **Atomic short operations**: a function that completes in microseconds does not need cancellation checks. Flag only operations that may take seconds or longer.
- **Framework-managed cancellation**: ASP.NET Core automatically cancels `HttpContext.RequestAborted` on client disconnect; Go HTTP server cancels `r.Context()`. Do not flag the framework mechanism; flag only if the handler ignores it.
- **Retry with fresh context**: retry logic intentionally creates a fresh context to avoid inheriting the old deadline. This is correct if the retry should have its own timeout.

## Severity Guidance

| Finding | Severity |
|---|---|
| Cancellation token not propagated to downstream I/O (resource leak at scale) | high |
| Resource (connection, transaction) not cleaned up on cancellation | high |
| Go context cancel function never called (context tree leak) | high |
| Python CancelledError swallowed, cancellation signal lost | high |
| Long-running loop does not check cancellation | medium |
| Fire-and-forget task without structured cancellation scope | medium |
| CancellationTokenSource not disposed (timer registration leak) | medium |
| JavaScript fetch without AbortSignal in component with unmount | medium |
| Cancellation path has no test coverage | medium |
| Blocking call in Kotlin coroutine ignoring isActive | medium |
| Timeout not enforced on potentially long operation | low |
| ctx.Err() not checked to distinguish cancel vs deadline | low |

## See Also

- `conc-structured-concurrency` -- structured concurrency provides automatic cancellation propagation; verify scope boundaries
- `conc-futures-promises` -- futures/promises need cancellation wiring; verify unhandled rejection on cancellation
- `conc-csp-channels` -- Go context.Done must be selected alongside channel operations
- `conc-actor-model` -- actor systems need graceful shutdown (poison pill) which is a form of cancellation
- `principle-fail-fast` -- swallowing cancellation exceptions violates fail-fast; cancellation must propagate
- `pattern-thread-pool` -- thread pool tasks need cancellation support; verify submitted tasks check tokens

## Authoritative References

- [.NET Documentation: Cancellation in Managed Threads](https://learn.microsoft.com/en-us/dotnet/standard/threading/cancellation-in-managed-threads)
- [Go Documentation: Context](https://pkg.go.dev/context)
- [Kotlin Documentation: Coroutine Cancellation and Timeouts](https://kotlinlang.org/docs/cancellation-and-timeouts.html)
- [Python Documentation: asyncio Task Cancellation](https://docs.python.org/3/library/asyncio-task.html#task-cancellation)
- [MDN Web Docs: AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)
