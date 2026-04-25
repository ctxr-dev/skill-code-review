---
id: conc-csp-channels
type: primary
depth_role: leaf
focus: Detect goroutine leaks, unbuffered channel deadlocks, missing select timeouts, and unrestricted channel direction in CSP-style code.
parents:
  - index.md
covers:
  - Unbuffered channel deadlock from missing sender or receiver
  - "Goroutine leak from sending to a channel with no consumer (no close, no timeout)"
  - Channel direction not restricted in function signatures, allowing accidental misuse
  - Select statement without default or timeout case, blocking indefinitely
  - Channel not closed by producer, causing consumers to range-block forever
  - Sending on a closed channel causing a panic
  - Multiple goroutines closing the same channel causing a panic
  - Buffered channel used as semaphore without proper release on error paths
  - Context.Done not checked in select alongside channel operations
  - "Fan-in/fan-out pattern leaking goroutines when one branch cancels"
  - Channel of channels pattern with unbounded nesting
tags:
  - csp
  - channels
  - goroutine
  - go
  - concurrency
  - deadlock
  - goroutine-leak
  - select
  - communicating-sequential-processes
activation:
  file_globs:
    - "**/*.{go,rs,swift,kt,scala,ex,exs,clj}"
  keyword_matches:
    - chan
    - channel
    - Channel
    - goroutine
    - go func
    - select
    - "make(chan"
    - mpsc
    - crossbeam
    - flume
    - "tokio::sync::mpsc"
    - async_channel
    - CSP
  structural_signals:
    - channel_send_receive_pair
    - select_statement
    - goroutine_spawning_with_channel
source:
  origin: file
  path: conc-csp-channels.md
  hash: "sha256:8cdcb8a7cb2030c68cd320a671f21caedf019d1b4781ca807025567cccdad691"
---
# CSP and Channels

## When This Activates

Activates when diffs use Go channels (`chan`), Rust channel types (`mpsc`, `crossbeam`, `flume`, `tokio::sync::mpsc`), Kotlin/Swift channel abstractions, or Clojure `core.async`, spawn goroutines or tasks that communicate via channels, use `select` statements for multiplexing channel operations, or implement fan-in/fan-out patterns. CSP (Communicating Sequential Processes) eliminates shared state by communicating via channels, but channel misuse produces deadlocks and goroutine leaks that are as severe as data races and harder to detect.

## Audit Surface

- [ ] Every unbuffered channel send has a guaranteed matching receive (and vice versa)
- [ ] Goroutines that send to a channel have a consumer, timeout, or cancellation path
- [ ] Function signatures use directional channel types where possible
- [ ] Select statements include timeout or context.Done for cancellation
- [ ] The producer (and only the producer) closes the channel when it finishes sending
- [ ] No code sends on a closed channel (causes panic in Go)
- [ ] Only one goroutine closes any given channel (double-close panics in Go)
- [ ] Buffered channel slots used as semaphores are released via defer
- [ ] Context cancellation is propagated through select alongside channel ops
- [ ] Fan-out goroutines are tracked via WaitGroup/errgroup and drained on cancel
- [ ] Buffer sizes are documented or justified, not arbitrary magic numbers
- [ ] Parent waits for all child goroutines before returning
- [ ] Nil channels in select are intentional, not accidental

## Detailed Checks

### Deadlock from Missing Sender or Receiver
<!-- activation: keywords=["deadlock", "block", "unbuffered", "send", "receive", "make(chan", "chan ", "<-", "hang", "freeze", "stuck"] -->

- [ ] **Unbuffered send with no receiver**: goroutine sends on an unbuffered channel but no other goroutine will ever receive from it -- the sender blocks forever (goroutine leak)
- [ ] **Unbuffered receive with no sender**: goroutine waits on an unbuffered channel but no goroutine will ever send -- the receiver blocks forever
- [ ] **Channel passed but not used**: a channel is created and passed to a goroutine, but the goroutine exits early (error return) without sending -- the parent blocks on receive forever
- [ ] **Buffered channel full with no consumer**: a buffered channel fills up because the consumer exited or was never started -- once full, the sender blocks forever
- [ ] **All goroutines asleep**: Go detects "all goroutines are asleep -- deadlock" at runtime, but only when every goroutine is blocked; if any goroutine is busy (e.g., the HTTP server), the deadlock goes undetected

### Goroutine Leak
<!-- activation: keywords=["goroutine", "go func", "leak", "spawn", "background", "fire", "forget", "cancel", "timeout", "context", "done", "WaitGroup", "errgroup"] -->

- [ ] **Fire-and-forget goroutine with channel**: `go func() { ch <- result }()` -- if no one reads from `ch` (due to error, early return, or timeout), the goroutine blocks on send forever, leaking memory and stack
- [ ] **No context cancellation in goroutine**: a long-lived goroutine does not select on `ctx.Done()` -- when the parent cancels the context, the goroutine continues running, consuming resources
- [ ] **WaitGroup not used**: parent spawns multiple goroutines but does not use `sync.WaitGroup` or `errgroup.Group` to wait for them -- if the parent returns first, goroutines become orphans
- [ ] **Goroutine spawned in loop without limit**: `for range items { go process(item) }` spawns potentially millions of goroutines -- each consumes stack memory; use a worker pool or semaphore pattern
- [ ] **Fan-out without drain**: goroutines are fanned out across channels, but on cancellation only some branches are drained -- the undrained goroutines block on send forever

### Channel Direction and Safety
<!-- activation: keywords=["chan<-", "<-chan", "direction", "bidirectional", "close", "panic", "send", "closed", "nil", "range"] -->

- [ ] **Bidirectional channel in function signature**: function accepts `chan T` when it only sends or only receives -- use `chan<- T` (send-only) or `<-chan T` (receive-only) to prevent accidental misuse
- [ ] **Send on closed channel**: code sends to a channel that may already be closed by another goroutine -- this panics in Go; close only from the sender side
- [ ] **Double close**: two goroutines both attempt to close the same channel -- the second close panics; use `sync.Once` or designate a single closer
- [ ] **Nil channel in select**: a nil channel in a select case blocks forever on that case (effectively disables it) -- ensure this is intentional, not from an uninitialized variable
- [ ] **Range over unclosed channel**: `for v := range ch { ... }` blocks forever if the producer never closes `ch` -- ensure the producer calls `close(ch)` when done

### Select Statement Discipline
<!-- activation: keywords=["select", "case", "default", "timeout", "timer", "After", "context", "Done", "cancel", "multiple", "fan-in"] -->

- [ ] **Select without timeout or context**: `select { case v := <-ch: ... }` blocks indefinitely if no message arrives and the system has no cancellation -- add a `case <-ctx.Done()` or `case <-time.After(timeout)` branch
- [ ] **Select with default in hot loop**: `select { case ...: default: }` in a tight loop busy-waits, consuming 100% CPU -- the default case should do meaningful work or the loop should use a blocking select
- [ ] **Priority channel not handled**: select chooses randomly among ready cases -- if one channel should have priority (e.g., `ctx.Done()` before data channels), use nested selects or check priority first
- [ ] **Fan-in select leaking on one-closed**: fan-in select reads from multiple channels; when one closes, the select receives zero values forever instead of removing that case -- track closed channels and nil them out

### Buffered Channel Semantics
<!-- activation: keywords=["buffer", "buffered", "capacity", "semaphore", "limit", "size", "make(chan", "len(", "cap("] -->

- [ ] **Buffer size as semaphore without defer release**: `sem := make(chan struct{}, N)` used to limit concurrency, but the `<-sem` release is not in a defer -- if the goroutine panics or returns early, a slot is permanently lost
- [ ] **Arbitrary buffer size**: `make(chan T, 100)` with no comment or rationale -- the buffer size affects backpressure behavior and memory usage; document the choice
- [ ] **Buffer hides deadlock**: a buffered channel delays the deadlock but does not prevent it -- once the buffer fills, the same blocking behavior occurs; the buffer only buys time, not correctness

## Common False Positives

- **Single-goroutine channel usage in tests**: test code may create channels and goroutines in a controlled, single-goroutine test. Do not flag missing select/timeout if the test verifies specific synchronization behavior.
- **Channel used as synchronization primitive**: using a channel purely for signaling (`chan struct{}`) is idiomatic Go. Do not flag the empty struct or the lack of data on the channel.
- **Framework-managed channels**: libraries like `errgroup`, `x/sync/semaphore`, and Kotlin `Channel` manage lifecycle internally. Flag only if the application-level usage is incorrect.
- **Context propagation in HTTP handlers**: Go HTTP handlers receive a context that is cancelled when the client disconnects. Do not flag "missing context" if the handler uses `r.Context()` correctly.

## Severity Guidance

| Finding | Severity |
|---|---|
| Goroutine leak from blocked send with no consumer or timeout | high |
| Unbuffered channel deadlock from missing sender or receiver | high |
| Send on closed channel (panic in production) | high |
| Double close of channel (panic in production) | high |
| Select without timeout or context.Done in request-handling path | high |
| Fan-out goroutines not drained on cancellation | medium |
| Bidirectional channel type where directional suffices | medium |
| Goroutines spawned in loop without concurrency limit | medium |
| Range over channel that producer never closes | medium |
| Buffered channel semaphore without defer release | medium |
| Select with default in tight loop (busy-wait) | medium |
| Arbitrary buffer size without rationale | low |
| Nil channel in select without comment explaining intent | low |

## See Also

- `conc-actor-model` -- actors use mailboxes where CSP uses channels; compare mailbox bounding with channel buffering
- `conc-structured-concurrency` -- structured concurrency ensures goroutine/task lifetime is bounded; verify channel-based goroutines have bounded lifetimes
- `conc-async-cancellation` -- context cancellation must be propagated through select; verify cancellation discipline
- `pattern-producer-consumer` -- channels implement the producer-consumer pattern; verify the same capacity and shutdown concerns
- `conc-race-conditions-data-races` -- channels avoid shared state, but data sent through channels may itself be shared and mutable
- `principle-encapsulation` -- channel direction restriction is a form of encapsulation; bidirectional channels expose unnecessary capability

## Authoritative References

- [C.A.R. Hoare, "Communicating Sequential Processes" (1978)](https://doi.org/10.1145/359576.359585)
- [Go Blog: "Share Memory By Communicating" (2010)](https://go.dev/blog/codelab-share)
- [Go Documentation: Effective Go -- Concurrency](https://go.dev/doc/effective_go#concurrency)
- [Go Documentation: Context](https://pkg.go.dev/context)
- [Bryan C. Mills, "Rethinking Classical Concurrency Patterns" (GopherCon 2018)](https://www.youtube.com/watch?v=5zXAHh5tJqQ)
