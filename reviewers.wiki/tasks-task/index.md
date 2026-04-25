---
id: tasks-task
type: index
depth_role: subcategory
depth: 1
focus: Active object holding locks during request processing, negating the decoupling benefit; Active object proxy that exposes internal concurrency primitives to callers; Active object scheduler that silently drops requests on queue overflow; Active object servant that leaks thread-local state across unrelated requests
parents:
  - "../index.md"
shared_covers: []
entries:
  - id: ai-llm-agent-design
    file: ai-llm-agent-design.md
    type: primary
    focus: Detect unbounded agent loops, missing maximum iterations, absent human-in-the-loop for destructive actions, lost agent state on crash, missing reflection steps, and uncoordinated multi-agent systems
    tags:
      - agent
      - loop
      - iteration-limit
      - human-in-the-loop
      - state-persistence
      - multi-agent
      - reflection
  - id: antipattern-exception-swallowing
    file: antipattern-exception-swallowing.md
    type: primary
    focus: "Detect catch/except/rescue blocks that silently discard exceptions, hiding failures from callers and masking bugs"
    tags:
      - exception-swallowing
      - error-handling
      - silent-failure
      - catch
      - except
      - rescue
      - error
      - anti-pattern
      - correctness
      - security
  - id: conc-csp-channels
    file: conc-csp-channels.md
    type: primary
    focus: Detect goroutine leaks, unbuffered channel deadlocks, missing select timeouts, and unrestricted channel direction in CSP-style code.
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
  - id: lang-javascript
    file: lang-javascript.md
    type: primary
    focus: Catch JavaScript-specific bugs, runtime pitfalls, and async anti-patterns in diffs
    tags:
      - javascript
      - async
      - promises
      - node
      - browser
      - event-loop
      - security
  - id: reliability-timeout-deadline-propagation
    file: reliability-timeout-deadline-propagation.md
    type: primary
    focus: Detect missing timeouts on external calls, deadlines not propagated through call chains, and timeout budget mismanagement
    tags:
      - timeout
      - deadline
      - propagation
      - budget
      - cascading
      - latency
      - cancellation
      - context
  - id: pool-active
    file: "pool-active/index.md"
    type: index
    focus: Active object holding locks during request processing, negating the decoupling benefit; Active object proxy that exposes internal concurrency primitives to callers; Active object scheduler that silently drops requests on queue overflow; Active object servant that leaks thread-local state across unrelated requests
children:
  - "pool-active/index.md"
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Tasks Task

**Focus:** Active object holding locks during request processing, negating the decoupling benefit; Active object proxy that exposes internal concurrency primitives to callers; Active object scheduler that silently drops requests on queue overflow; Active object servant that leaks thread-local state across unrelated requests

## Children

| File | Type | Focus |
|------|------|-------|
| [ai-llm-agent-design.md](ai-llm-agent-design.md) | 📄 primary | Detect unbounded agent loops, missing maximum iterations, absent human-in-the-loop for destructive actions, lost agent state on crash, missing reflection steps, and uncoordinated multi-agent systems |
| [antipattern-exception-swallowing.md](antipattern-exception-swallowing.md) | 📄 primary | Detect catch/except/rescue blocks that silently discard exceptions, hiding failures from callers and masking bugs |
| [conc-csp-channels.md](conc-csp-channels.md) | 📄 primary | Detect goroutine leaks, unbuffered channel deadlocks, missing select timeouts, and unrestricted channel direction in CSP-style code. |
| [lang-javascript.md](lang-javascript.md) | 📄 primary | Catch JavaScript-specific bugs, runtime pitfalls, and async anti-patterns in diffs |
| [reliability-timeout-deadline-propagation.md](reliability-timeout-deadline-propagation.md) | 📄 primary | Detect missing timeouts on external calls, deadlines not propagated through call chains, and timeout budget mismanagement |
| [pool-active/index.md](pool-active/index.md) | 📁 index | Active object holding locks during request processing, negating the decoupling benefit; Active object proxy that exposes internal concurrency primitives to callers; Active object scheduler that silently drops requests on queue overflow; Active object servant that leaks thread-local state across unrelated requests |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
