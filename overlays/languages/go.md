---
tools:
  - name: go-vet
    command: "go vet ./..."
    purpose: "Go static analysis for suspicious constructs"
  - name: golangci-lint
    command: "golangci-lint run --out-format json"
    purpose: "Go meta-linter (vet, staticcheck, errcheck, etc.)"
---

# Go — Review Overlay

Load this overlay for the **Reliability**, **Concurrency**, and **Maintainability** specialists when Go code is being reviewed.

## Error Handling

- [ ] Every error return value is checked; `_` discards on error values are absent without a documented justification
- [ ] `errors.Is(err, target)` is used for sentinel error comparison, not `err == ErrFoo` (which breaks across `%w` wrapping)
- [ ] `errors.As(err, &target)` is used to unwrap and inspect typed errors rather than direct type assertions on the error interface
- [ ] Errors are wrapped with context using `fmt.Errorf("operation %s: %w", name, err)` at each layer so the call stack is reconstructable from the message
- [ ] Error strings begin lowercase and do not end with punctuation (Go convention), avoiding double-punctuation in wrapped chains

## Context Propagation

- [ ] `context.Context` is the first parameter of every function that performs I/O, calls external services, or may need cancellation
- [ ] Contexts are not stored in structs; they are passed explicitly through the call chain
- [ ] `context.Background()` is only used at the top level (main, test setup, server root); downstream code receives the caller's context
- [ ] Long-running operations check `ctx.Err()` or select on `ctx.Done()` at appropriate intervals; they do not ignore cancellation

## Concurrency

- [ ] Every goroutine has a bounded lifetime — it terminates when a context is cancelled, a channel is closed, or an explicit signal is received; no fire-and-forget goroutines in production code
- [ ] Channels are closed by the sender (the producer side), never the receiver; closing from the receiver causes a panic
- [ ] `sync.WaitGroup`, `errgroup.Group`, or a structured concurrency helper is used to wait for goroutines; raw goroutine launch without tracking is absent from code that needs coordinated shutdown
- [ ] Shared mutable state accessed from multiple goroutines is protected by a `sync.Mutex`, `sync.RWMutex`, or a dedicated goroutine owning the state; no data races

## Design Conventions

- [ ] `defer` is placed immediately after acquiring a resource (file open, mutex lock, connection checkout) so cleanup cannot be accidentally omitted
- [ ] Interfaces are defined at the consumer (the package that uses them), not at the producer (the package that implements them); small single-method interfaces are preferred
- [ ] Unexported types and fields are the default; identifiers are exported only when needed by external callers
- [ ] Struct embedding is used for composition, not inheritance simulation; embedded types' methods must not conflict or create ambiguous selectors
- [ ] `init()` functions are avoided in non-main packages; global side effects make packages hard to test and reason about
