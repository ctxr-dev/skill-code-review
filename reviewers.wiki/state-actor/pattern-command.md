---
id: pattern-command
type: primary
depth_role: leaf
focus: Detect misuse, over-application, and absence of the Command pattern in operation-encapsulation code.
parents:
  - index.md
covers:
  - "Commands with no undo support where the domain requires undo/redo"
  - Commands executed directly instead of going through an invoker
  - Command classes that are trivial procedure wrappers adding no queuing, logging, or undo benefit
  - "Commands with side effects in the constructor instead of in execute()"
  - Missing command where operations need to be queued, logged, or undone but are called directly
  - Commands that violate single-responsibility by combining unrelated operations
  - "Command execute() that is not idempotent when the invoker may retry"
  - "Undo implementation that does not fully reverse execute() side effects"
  - Command holding stale receiver references causing use-after-dispose bugs
  - Macro commands with no rollback strategy when a sub-command fails mid-sequence
tags:
  - command
  - behavioural-pattern
  - design-patterns
  - undo
  - redo
  - invoker
  - receiver
  - action
  - operation
  - queue
activation:
  file_globs:
    - "**/*.{java,kt,scala,cs,ts,js,py,rb,go,rs,swift,cpp,h,hpp,php}"
  keyword_matches:
    - Command
    - command
    - execute
    - undo
    - redo
    - action
    - operation
    - task
    - handler
    - dispatch
    - queue
    - invoke
    - run
    - perform
    - Do
    - Undo
  structural_signals:
    - class_with_execute_method
    - undo_redo_stack
    - command_queue_or_history
    - invoker_calling_execute_on_command_interface
source:
  origin: file
  path: pattern-command.md
  hash: "sha256:a7f0cc418a4ed0ea1fc887f6a25dff2b9280a190da6547969f71ea1b2a03bff2"
---
# Command Pattern

## When This Activates

Activates when diffs introduce classes that encapsulate operations as objects with an `execute()` method, add undo/redo stacks, implement command queues or schedulers, or add `*Command`, `*Action`, `*Task`, or `*Handler` classes with execution semantics. The Command pattern enables decoupling of invocation from execution, but it breaks down when commands carry constructor side effects, lack undo support where needed, or add class overhead without enabling any of the pattern's actual benefits (queuing, logging, undo, retry).

## Audit Surface

- [ ] Command constructor captures parameters and receiver references only -- no side effects, I/O, or validation occur until execute()
- [ ] Commands that need undo have a symmetric undo() that fully reverses execute()
- [ ] Commands are dispatched through an invoker, not called directly by client code
- [ ] Each command class provides at least one concrete benefit: queuing, logging, undo, retry, or scheduling
- [ ] Operations that need queuing, scheduling, or undo are encapsulated as command objects, not raw method calls
- [ ] execute() and undo() are symmetric -- every side effect of execute is reversed by undo
- [ ] Command's receiver reference is valid at execution time -- stale or disposed receivers are guarded against
- [ ] Macro/composite commands handle sub-command failure with rollback or compensating actions
- [ ] execute() is idempotent if the invoker may retry on failure
- [ ] Command captures only the data needed for execution, not large state that could be resolved at execution time
- [ ] Each command encapsulates a single cohesive operation
- [ ] Command history (undo stack) has a bounded size with eviction policy
- [ ] Parameters are validated before side effects begin -- execute() does not leave partial state on validation failure
- [ ] Command pattern is applied where it adds value, not to simple synchronous method calls

## Detailed Checks

### Constructor Side Effects
<!-- activation: keywords=["constructor", "new", "init", "create", "build", "setup", "Command", "command"] -->

- [ ] **I/O in constructor**: command constructor opens files, makes network calls, or accesses databases -- these should occur in execute() so the command can be created, queued, and executed at different times
- [ ] **State mutation in constructor**: command constructor modifies the receiver or external state during creation -- creating a command should be a side-effect-free operation
- [ ] **Validation in constructor that throws**: command validates parameters in the constructor and throws, preventing the command from being created -- validate in execute() or provide a separate validate() method so the invoker can decide when to validate
- [ ] **Eager resource acquisition**: command acquires locks, connections, or file handles in the constructor that must be held until execute() -- this ties resource lifetime to command lifetime, not execution lifetime
- [ ] **Logging in constructor**: command logs "operation started" in the constructor instead of in execute() -- the command may be queued and not executed for minutes or hours

### Missing Undo Support
<!-- activation: keywords=["undo", "redo", "reverse", "rollback", "revert", "cancel", "compensate", "history"] -->

- [ ] **No undo method**: command modifies state but has no undo() method, and the application domain requires undo (editors, forms, configuration tools, transactions)
- [ ] **Partial undo**: undo() reverses some side effects but not all -- e.g., undoes database changes but not sent notifications
- [ ] **Undo relies on memento**: undo() requires a full state snapshot captured before execute() -- if the snapshot is missing or stale, undo produces corrupt state; verify memento consistency
- [ ] **Non-invertible operations**: command performs an operation that cannot be reversed (deleting data without backup, sending email) but no compensating action or warning is provided
- [ ] **Redo stack mismanagement**: performing a new command does not clear the redo stack, causing redo to restore an obsolete state
- [ ] **Undo without re-validation**: undo() restores a previous state that may no longer be valid due to concurrent changes -- the restored state should be validated

### Direct Execution (Invoker Bypass)
<!-- activation: keywords=["execute", "run", "invoke", "call", "perform", "dispatch", "handler", "direct"] -->

- [ ] **Client calls execute() directly**: client code creates a command and immediately calls execute() without going through an invoker -- the command gains no queuing, logging, retry, or undo benefits
- [ ] **Mixed invocation**: some commands go through the invoker while others are executed directly -- the inconsistency means some operations are logged/undoable and others are not
- [ ] **Invoker does nothing**: invoker exists but is a pass-through that calls execute() with no added behavior -- the invoker adds indirection without value
- [ ] **Missing invoker capabilities**: invoker calls execute() but does not provide the expected cross-cutting concerns (logging, timing, retry, queueing) -- the invoker is incomplete

### Command Patternitis (Over-Application)
<!-- activation: keywords=["Command", "command", "simple", "wrapper", "delegate", "call", "method", "trivial"] -->

- [ ] **Trivial procedure wrapper**: command class wraps a single method call (`receiver.doThing()`) with no queuing, logging, undo, or retry capability -- the command class is ceremony without benefit
- [ ] **One-shot command**: command is created, executed, and immediately discarded with no history, no queue, and no possibility of replay -- a direct method call is simpler
- [ ] **Command per CRUD operation**: every simple CRUD operation has a command class, but none support undo, queueing, or batching -- the pattern adds boilerplate without utility
- [ ] **Lambda or closure suffices**: the command's execute() method has no state and no undo -- a simple lambda or function reference would serve the same purpose with less ceremony
- [ ] **Premature command extraction**: commands introduced "for future undo support" that is not on the roadmap -- add the pattern when the benefit is concrete

### Macro Command Failure Handling
<!-- activation: keywords=["macro", "composite", "batch", "sequence", "chain", "group", "multi", "transaction", "saga"] -->

- [ ] **No rollback on partial failure**: macro command executes sub-commands in sequence; if sub-command N fails, sub-commands 1..N-1 are not undone, leaving the system in an inconsistent state
- [ ] **Silent sub-command failure**: macro catches sub-command exceptions and continues with the next sub-command -- partial execution without notification
- [ ] **Undo order incorrect**: macro undo() calls sub-command undo() in the same order as execute() instead of reverse order -- dependent side effects are not properly unwound
- [ ] **Non-atomic batch**: macro command is expected to be atomic but has no transaction boundary or saga coordination -- use explicit transaction or compensating commands
- [ ] **Unbounded macro**: macro command accepts an arbitrary number of sub-commands with no size guard -- a macro with thousands of sub-commands may cause timeouts or resource exhaustion

### Receiver Lifetime Issues
<!-- activation: keywords=["receiver", "target", "reference", "dispose", "close", "null", "stale", "expired", "lifecycle"] -->

- [ ] **Stale receiver**: command captures a receiver reference at creation time, but the receiver is disposed, closed, or replaced before execute() runs -- execution fails or corrupts state
- [ ] **Receiver mutated between create and execute**: command captures the receiver but the receiver's state changes between command creation and execution -- the command operates on unexpected state
- [ ] **Null receiver**: command's receiver field can be null if the receiver is optional, but execute() does not guard against this
- [ ] **Receiver coupling**: command depends on concrete receiver type instead of an interface, preventing substitution and testing

## Common False Positives

- **CQRS command handlers**: in CQRS architectures, commands and command handlers are the standard approach. The handler is the invoker; do not flag the pattern itself. Flag only if commands carry side effects in constructors or lack undo where the domain requires it.
- **Job/task queue workers**: background job frameworks (Celery, Sidekiq, Hangfire) serialize tasks for deferred execution. These are infrastructure commands by design; flag only if the job classes violate command hygiene (constructor side effects, no idempotency).
- **Event handlers**: event-driven systems dispatch events to handlers. Handlers consume events, not commands -- they typically do not need undo. Do not flag event handlers as "commands without undo."
- **Controller actions**: MVC controller actions named `execute`, `perform`, or `run` are entry points, not command pattern instances. Flag only if the controller action should be refactored into a command for queuing or undo.
- **Functional pipelines**: languages with first-class functions often pass operations as lambdas. This is a valid lightweight alternative to command objects when undo, queuing, and logging are not needed.

## Severity Guidance

| Finding | Severity |
|---|---|
| Command constructor performs I/O or mutates state before execute() | high |
| Domain requires undo but commands have no undo() method | high |
| Macro command failure leaves system in inconsistent state (no rollback) | high |
| Command.undo() does not fully reverse execute() side effects | high |
| Command references a disposed or stale receiver at execution time | medium |
| Client code executes commands directly, bypassing invoker logging/undo | medium |
| Operations need queuing or scheduling but use direct method calls | medium |
| Command is not idempotent but invoker may retry | medium |
| Redo stack not cleared on new command | medium |
| Trivial command wrapper adding class overhead without any benefit | low |
| Command history grows without bound | low |
| Command class name does not communicate the operation it performs | low |

## See Also

- `pattern-memento` -- memento captures state for undo; command encapsulates operations. Use memento when state is complex and operations are not easily invertible; use command with undo() when operations are invertible.
- `pattern-chain-of-responsibility` -- chain routes a request to a handler; command encapsulates the request itself. Commands can be passed along a chain.
- `pattern-strategy` -- strategies encapsulate algorithms; commands encapsulate operations with lifecycle (execute, undo, queue). If the "command" only selects an algorithm at runtime, it may be a strategy.
- `principle-command-query-separation` -- command objects should be commands (side effects) not queries (return values). execute() should return void or a status, not business data.
- `principle-solid` -- commands that combine unrelated operations violate SRP; invokers coupled to concrete commands violate DIP
- `principle-separation-of-concerns` -- constructor side effects violate separation of construction from execution

## Authoritative References

- [Erich Gamma et al., *Design Patterns: Elements of Reusable Object-Oriented Software* (1994), Command](https://www.oreilly.com/library/view/design-patterns-elements/0201633612/)
- [Robert C. Martin, *Agile Software Development* (2002), Chapter 32: Command and Active Object](https://www.oreilly.com/library/view/agile-software-development/0135974445/)
- [Martin Fowler, *Patterns of Enterprise Application Architecture* (2002), Command pattern](https://martinfowler.com/eaaCatalog/)
- [Eric Freeman et al., *Head First Design Patterns* (2nd ed., 2020), Chapter 6: The Command Pattern](https://www.oreilly.com/library/view/head-first-design/9781492077992/)
