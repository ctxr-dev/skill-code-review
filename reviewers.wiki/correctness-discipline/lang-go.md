---
id: lang-go
type: primary
depth_role: leaf
focus: Catch Go-specific bugs, concurrency errors, error handling anti-patterns, and interface misuse in diffs
parents:
  - index.md
covers:
  - Error handling discipline — checked returns, wrapping, sentinel errors
  - context.Context propagation and cancellation
  - Goroutine lifecycle and leak prevention
  - Channel usage patterns and deadlock risks
  - Interface design — accept interfaces, return structs
  - nil interface vs nil pointer trap
  - defer ordering and closure capture bugs
  - Race condition patterns detectable by review
  - Module versioning and dependency hygiene
  - Generics usage and constraint design
  - Struct copying with mutexes or internal pointers
tags:
  - go
  - concurrency
  - goroutines
  - channels
  - error-handling
  - context
  - interfaces
activation:
  file_globs:
    - "**/*.go"
    - "**/go.mod"
    - "**/go.sum"
  structural_signals:
    - Go source files in diff
    - Go module files changed
    - Go test files present
source:
  origin: file
  path: lang-go.md
  hash: "sha256:c6142b543b42935ca283f03095e459be8204b072455fd23b17e1cf36d6f5a78f"
---
# Go Quality Reviewer

## When This Activates

Activates when the diff contains `.go` files or when Go module files (`go.mod`, `go.sum`) are modified. Covers standard library usage, concurrency patterns, and module management.

## Audit Surface

- [ ] Every error return is checked — no `val, _ := f()` without justification
- [ ] `context.Context` is the first parameter and threaded through call chains
- [ ] Every goroutine has a clear shutdown path (context cancellation, done channel, WaitGroup)
- [ ] Shared mutable state is protected by `sync.Mutex`, `sync.RWMutex`, or channels
- [ ] `defer` inside loops is intentional (defers stack — not per-iteration cleanup)
- [ ] Nil interface trap understood: `(*T)(nil)` stored in `interface{}` is not `== nil`
- [ ] Errors wrapped with `fmt.Errorf("...: %w", err)` for `errors.Is`/`errors.As` chains
- [ ] Structs containing `sync.Mutex` are passed by pointer, never copied
- [ ] Channel direction (`chan<-`, `<-chan`) specified in function signatures
- [ ] No `init()` functions with side effects (database connections, goroutines)
- [ ] Exported interfaces are minimal and defined by the consumer, not the implementer
- [ ] No goroutines launched at package level or in `init()`
- [ ] `select` with `default` does not busy-spin (add a small sleep or reconsider design)
- [ ] Nil slice vs empty slice distinction handled at API boundaries

## Detailed Checks

### Error Handling
<!-- activation: keywords=["error", "err", "fmt.Errorf", "errors.Is", "errors.As", "errors.New"] -->

- [ ] No ignored errors: `_, err := f(); if err != nil` — never `f()` alone when it returns error
- [ ] Error wrapping uses `%w` verb for unwrappable chains, `%v` only when wrapping is intentional break
- [ ] Sentinel errors are package-level `var` using `errors.New`, not compared by string
- [ ] `errors.Is` used instead of `==` for comparing wrapped errors
- [ ] `errors.As` used instead of type assertion for extracting typed errors from chains
- [ ] Error messages are lowercase, no trailing punctuation (Go convention)
- [ ] Error messages include enough context to diagnose without the stack trace
- [ ] Multi-error patterns use `errors.Join` (Go 1.20+) not hand-rolled slices
- [ ] No `log.Fatal` / `os.Exit` in library code — only in `main`

### Context Propagation
<!-- activation: keywords=["context", "ctx", "Context", "WithCancel", "WithTimeout", "WithValue"] -->

- [ ] `context.Context` is always the first parameter, named `ctx`
- [ ] `context.Background()` used only in `main`, tests, or top-level entry points
- [ ] `context.TODO()` is a temporary placeholder — should not ship to production
- [ ] `context.WithCancel` return cancel function is always deferred or called
- [ ] `context.WithTimeout`/`WithDeadline` cancel deferred immediately after creation
- [ ] `context.Value` used only for request-scoped data, not for passing dependencies
- [ ] HTTP handlers use `r.Context()` not `context.Background()`
- [ ] Long operations check `ctx.Done()` periodically for cancellation

### Goroutines and Channels
<!-- activation: keywords=["go ", "goroutine", "chan", "select", "sync", "WaitGroup", "Mutex"] -->

- [ ] Goroutine lifecycle is bounded — every `go func()` has a termination condition
- [ ] `sync.WaitGroup.Add` called before `go func()`, not inside it
- [ ] Unbuffered channels have matching sender/receiver — no deadlock risk
- [ ] Buffered channel size is justified, not arbitrary
- [ ] `select` with `case <-ctx.Done()` for cancellable operations
- [ ] No goroutine leak: goroutine blocked on channel with no sender/closer
- [ ] `sync.Once` used for lazy initialization, not `sync.Mutex` + bool flag
- [ ] `sync.Pool` objects are not held across GC cycles (reset before Put)
- [ ] `sync.Map` used only for append-only or read-heavy maps with many goroutines
- [ ] Channel close is done by sender only — never by receiver
- [ ] `range` over channel terminates when channel is closed

### Interface Design
<!-- activation: keywords=["interface", "Interface", "implements"] -->

- [ ] Interfaces are defined by the consumer package, not the provider
- [ ] Interfaces are small: 1-3 methods (Go proverb: the bigger the interface, the weaker the abstraction)
- [ ] Functions accept interfaces, return concrete structs
- [ ] No empty `interface{}` — use `any` (Go 1.18+) and prefer generics where possible
- [ ] Interface satisfaction is verified at compile time: `var _ Interface = (*Struct)(nil)`
- [ ] No stuttering in names: `reader.Reader` — prefer `io.Reader` pattern

### Generics
<!-- activation: keywords=["Generic", "TypeParam", "comparable", "constraints", "any"] -->

- [ ] Generic type parameters have meaningful constraints (not just `any`)
- [ ] `comparable` constraint used when map keys or `==` comparison is needed
- [ ] No over-generification — concrete types are fine when only one type is needed
- [ ] Generic functions tested with edge types (nil, zero value, interface types)
- [ ] Type inference works at call sites — callers should not need explicit type args

### Defer and Resource Management
<!-- activation: keywords=["defer", "Close", "cleanup", "resource"] -->

- [ ] `defer` follows resource acquisition immediately: `f, err := os.Open(...); if err != nil {...}; defer f.Close()`
- [ ] `defer` in loops is intentional — typically should be refactored to a helper function
- [ ] Deferred closure captures variables by reference — loop variable mutation affects deferred call
- [ ] `defer` on `*sql.Rows` Close is after error check on `Query`
- [ ] `resp.Body.Close()` deferred after nil check on HTTP response
- [ ] Multiple defers execute LIFO — order matters for dependent cleanup

### Performance
<!-- activation: keywords=["performance", "benchmark", "allocation", "pool", "cache"] -->

- [ ] Pre-allocate slices with `make([]T, 0, expectedCap)` when size is known
- [ ] `strings.Builder` used instead of `+` concatenation in loops
- [ ] `sync.Pool` used for frequently allocated and short-lived objects
- [ ] Struct fields ordered to minimize padding (largest to smallest alignment)
- [ ] `map` pre-sized with `make(map[K]V, expectedSize)` when count is known
- [ ] No unnecessary `reflect` usage in hot paths
- [ ] Benchmark tests exist for performance-critical functions (`func BenchmarkX(b *testing.B)`)

### Security
<!-- activation: keywords=["sql", "http", "template", "exec", "crypto", "tls", "secret"] -->

- [ ] SQL uses parameterized queries — no `fmt.Sprintf` into query strings
- [ ] `html/template` used for HTML output (auto-escapes), not `text/template`
- [ ] `crypto/rand` used for secrets — not `math/rand`
- [ ] TLS `MinVersion` set to `tls.VersionTLS12` or higher
- [ ] No `#nosec` annotations without documented justification
- [ ] HTTP handlers set appropriate security headers (CORS, CSP, HSTS)
- [ ] File paths from user input are sanitized with `filepath.Clean` and restricted to allowed directories
- [ ] Command execution uses `exec.Command` with separate args, not shell interpolation

## Common False Positives

- **`_ = f()` for intentionally ignored errors**: acceptable when the function's error is documented as ignorable (e.g., `fmt.Fprintf` to stdout) and annotated with a comment
- **Empty `default` in `select`**: polling patterns legitimately use `select` with `default` for non-blocking checks
- **`init()` for registering drivers**: `database/sql` and `image` packages idiomatically use `init()` for driver registration
- **`interface{}` / `any` in serialization code**: JSON marshaling and reflection-based code legitimately uses `any`
- **`context.Background()` in tests**: test functions commonly use `context.Background()` as the root context
- **Large interfaces from third-party contracts**: when implementing an external gRPC service or HTTP handler interface, the size is dictated by the contract

## Severity Guidance

| Finding | Severity |
|---|---|
| Goroutine leak (no termination path) | Critical |
| Data race (shared mutation without synchronization) | Critical |
| SQL injection via string concatenation | Critical |
| Unchecked error on security-critical operation | Critical |
| Ignored error return (non-security) | Important |
| Missing context propagation | Important |
| `defer` in loop accumulating resources | Important |
| Nil interface trap in error comparison | Important |
| Struct with mutex copied by value | Important |
| Missing channel direction in signature | Minor |
| Non-idiomatic error message formatting | Minor |
| Interface defined at provider instead of consumer | Minor |
| Unnecessary `sync.Map` for simple cases | Minor |

## See Also

- `security-general` — language-agnostic security review
- `testing-quality` — test structure and coverage patterns
- `concurrency-review` — deep concurrency analysis across languages

## Authoritative References

- [Effective Go](https://go.dev/doc/effective_go)
- [Go Code Review Comments](https://go.dev/wiki/CodeReviewComments)
- [Go Proverbs — Rob Pike](https://go-proverbs.github.io/)
- [staticcheck Documentation](https://staticcheck.dev/docs/)
- [Go Blog — Error Handling](https://go.dev/blog/go1.13-errors)
- [Go Blog — Contexts and Structs](https://go.dev/blog/context-and-structs)
- [Go Vulnerability Database](https://vuln.go.dev/)
