---
id: antipattern-spaghetti-code
type: primary
depth_role: leaf
focus: Detect tangled control flow with no discernible structure, where logic paths interweave and cannot be followed linearly
parents:
  - index.md
covers:
  - "Deeply nested conditionals (4+ levels) creating pyramid-shaped code"
  - Goto-like jumps using labeled breaks, continue with complex conditions, or exceptions as flow control
  - Functions with multiple unrelated responsibilities interleaved rather than separated
  - Callback hell and pyramid of doom in asynchronous code
  - "Unstructured error handling with try/catch wrapping entire function bodies"
  - Temporal coupling where functions must be called in a specific undocumented order
  - Global mutable state read and written from scattered locations with no clear ownership
  - Control flow that depends on type checks or instanceof chains instead of polymorphism
  - Boolean flag parameters that fork function behavior into unrelated paths
  - "Switch/case or if/else chains exceeding 10 branches with interleaved side effects"
  - "Mixed abstraction levels within a single function (bit manipulation next to HTTP calls)"
  - Functions exceeding 50 lines with 3+ distinct logical phases not extracted into named steps
  - "Functions exceeding ~40 lines of logic (excluding blanks and braces)"
  - High cyclomatic complexity from deeply nested conditionals and loops
  - High cognitive complexity from interleaved control flow and state mutation
  - Multiple levels of abstraction mixed in a single function body
  - Functions requiring scrolling to read in a standard editor viewport
  - Functions with many local variables competing for reader attention
  - Setup-work-cleanup patterns crammed into one function body
  - Functions with interleaved comment blocks acting as section dividers
  - "Functions whose name cannot describe everything they do without using 'and'"
  - "Functions with deeply nested blocks (3+ levels of indentation)"
tags:
  - spaghetti-code
  - control-flow
  - nesting
  - complexity
  - readability
  - callback-hell
  - temporal-coupling
  - anti-pattern
  - long-method
  - bloater
  - extract-method
  - clean-code
aliases:
  - smell-long-method
activation:
  file_globs:
    - "*"
  keyword_matches:
    - if
    - else
    - switch
    - case
    - for
    - while
    - try
    - catch
    - break
    - continue
    - goto
    - callback
    - then
    - await
    - throw
    - raise
  structural_signals:
    - deeply_nested_block
    - conditional_chain
    - loop_body
    - try_catch_block
    - callback_nesting
source:
  origin: file
  path: antipattern-spaghetti-code.md
  hash: "sha256:d0f71ff04d2990e56bde77dfda146215250c376575bdaa1836ed48e1bf965f10"
---
# Spaghetti Code

## When This Activates

Activates on any diff that introduces or modifies control flow statements (conditionals, loops, try/catch, break/continue, callbacks). Spaghetti code is tangled control flow with no discernible structure -- the reader cannot follow the logic without mentally simulating every branch, nesting level, and side effect. Unlike general "long method" concerns, spaghetti code specifically targets the **interweaving of logic paths**: deeply nested conditionals, goto-like jumps, callback pyramids, temporal coupling between functions, and scattered mutations of shared state. The damage is cumulative -- each additional branch or nesting level multiplies the cognitive load and the probability of bugs hiding in untested paths.

## Audit Surface

- [ ] Function body nests 4+ levels of conditionals, loops, or try/catch
- [ ] Labeled break or continue statement (Java, JS, Go, Rust)
- [ ] Exception thrown and caught within the same function for flow control
- [ ] Callback nested 3+ levels deep (pyramid of doom)
- [ ] try/catch wrapping the entire function body with a generic catch
- [ ] Function requires callers to invoke setup methods in a specific order before use
- [ ] Global or module-level mutable variable written in one function and read in another
- [ ] Function accepts a boolean parameter that selects between two unrelated code paths
- [ ] Switch/case or if/else chain with 10+ branches containing side effects
- [ ] Function mixes 3+ abstraction levels (raw I/O, business rules, formatting)
- [ ] Single function body contains 3+ unrelated logical phases not separated into helpers
- [ ] Cyclomatic complexity exceeds 15 for a single function
- [ ] Deeply nested ternary expressions (2+ levels)
- [ ] Control flow depends on string comparisons or magic values instead of typed enums
- [ ] Function has 5+ return points scattered throughout nested conditionals

## Detailed Checks

### Deep Nesting and Pyramid Code
<!-- activation: keywords=["if", "else", "for", "while", "switch", "match", "case", "with", "when"] -->

- [ ] Count indentation levels inside function bodies -- flag functions with 4+ nesting levels of conditionals, loops, or try/catch
- [ ] Identify arrow-shaped code: functions that indent rightward for the first half and dedent for the second half -- this is the classic spaghetti shape
- [ ] Flag nested conditionals that can be flattened with early returns (guard clauses) -- `if (err) return` eliminates a nesting level
- [ ] Flag `if` chains where later branches depend on state set by earlier branches within the same nesting tree -- these create invisible temporal dependencies
- [ ] Flag nested loops containing conditionals containing more loops -- the total nesting depth is the product of complexity, not the sum
- [ ] Flag `else` blocks that are longer than the `if` block -- the main path should be the happy path; long `else` blocks indicate inverted logic

### Goto-Like Jumps and Non-Local Control Flow
<!-- activation: keywords=["break", "continue", "goto", "label:", "throw", "raise", "return", "exit", "abort"] -->

- [ ] **Labeled break/continue** (Java `break outer;`, JS `break label;`, Go `break Label`): these are goto statements in disguise and make loop logic impossible to follow at a glance
- [ ] **Exceptions as flow control**: throwing an exception and catching it in the same function or in an immediately adjacent caller to implement branching -- exceptions should signal unexpected failures, not expected business conditions
- [ ] **Multiple return points in nested code**: 5+ return statements scattered across different nesting levels make it impossible to determine what a function returns without reading every branch
- [ ] **Early exit from deeply nested scope**: `return` or `break` from inside 3+ levels of nesting -- the reader must mentally track which scope is being exited
- [ ] **Process.exit / os.exit / sys.exit called from non-main code**: hard exits from library or service code bypass all cleanup and calling conventions

### Callback Hell and Asynchronous Spaghetti
<!-- activation: keywords=["callback", "then", "done", "next", "err", "error", "Promise", "async", "await", "subscribe", "on(", "addListener"] -->

- [ ] **Pyramid of doom**: callbacks nested 3+ levels deep, producing rightward-drifting indentation -- refactor to async/await, promises, or named functions
- [ ] **Mixed async patterns**: same function using callbacks, promises, and async/await simultaneously -- pick one pattern and use it consistently
- [ ] **Unhandled rejection paths**: `.then()` chains without `.catch()`, or `await` without surrounding try/catch, or callback that ignores the `err` parameter
- [ ] **Event listener spaghetti**: multiple `on`/`addEventListener` calls that interact through shared closure state, creating invisible dependencies between event handlers
- [ ] **Nested `await` in conditionals**: `if (await a()) { if (await b()) { if (await c()) { ... } } }` -- flatten with early returns or extract an orchestration function

### Temporal Coupling and Hidden Sequencing
<!-- activation: keywords=["init", "setup", "configure", "initialize", "prepare", "connect", "open", "start", "boot", "register", "before", "after"] -->

- [ ] **Required call order**: functions that must be called in a specific sequence (init before configure before start) with no compile-time or runtime enforcement -- callers must read documentation or source code to use correctly
- [ ] **State machine without a state machine**: object whose methods are only valid in certain states, but the states are implicit (tracked by boolean flags or nullable fields) rather than enforced by a state type
- [ ] **Setup/teardown asymmetry**: resource acquisition in one method and release in another with no guarantee the release method is called (no try-finally, no RAII, no context manager)
- [ ] **Phase-dependent behavior**: functions that behave differently depending on when they are called relative to other functions -- the behavior depends on hidden mutable state rather than explicit parameters
- [ ] **Initialization order bugs**: module-level or class-level state that must be populated by one function before another function can run, with no null check or explicit dependency

### Global Mutable State Spaghetti
<!-- activation: keywords=["global", "static", "singleton", "var ", "let ", "module", "shared", "state", "cache", "registry", "context"] -->

- [ ] **Write-from-anywhere globals**: mutable global or module-level variable that is written by 2+ functions in different files -- ownership is unclear and race conditions are likely
- [ ] **Read-distant-write**: a function reads a global variable that was last written by a function in a completely unrelated module -- the data flow is invisible
- [ ] **Stateful utility functions**: utility or helper functions that maintain internal state between calls via static variables or closures -- callers cannot reason about behavior without knowing call history
- [ ] **Configuration globals mutated after startup**: global config objects that are modified during request handling rather than fixed at initialization -- each request may see different config depending on timing
- [ ] **Implicit context threading**: functions that communicate through a shared mutable context object (thread-local, request context, global dict) rather than through parameters and return values

### Mixed Abstraction Levels
<!-- activation: keywords=["def ", "func ", "function ", "fn ", "method", "class ", "public ", "private ", "export "] -->

- [ ] **Abstraction level mixing**: a single function that manipulates bytes/bits, calls business logic methods, and formats output for display -- each level should be in a separate function
- [ ] **Inline SQL or regex in business logic**: raw SQL strings or complex regex patterns embedded in functions that also contain domain decisions -- extract data access and parsing into dedicated functions
- [ ] **Infrastructure interleaved with domain**: HTTP header manipulation, database connection management, or file system operations interleaved line-by-line with business rule evaluation
- [ ] **Boolean parameter forking**: function that accepts a boolean (or string flag) parameter and uses it to select between two completely unrelated code paths -- this is two functions wearing a trench coat

## Common False Positives

- **State machines with intentional nesting**: parsers, lexers, and protocol handlers may have deeply nested switches that map directly to a grammar or state diagram. Check whether the nesting mirrors a specification before flagging.
- **Generated code**: code generated by parser generators (ANTLR, yacc), state machine compilers, or protocol buffer compilers may have deep nesting by design. Review the generator input, not the output.
- **Mathematical algorithms**: numerical methods, matrix operations, and scientific computing routines may have legitimately deep loop nesting (triple-nested loops for 3D operations). Flag only when the nesting includes branching logic, not pure iteration.
- **Test setup with sequential steps**: integration tests may legitimately require sequential setup steps (create user, create order, add items, submit). Flag only when the test body itself has tangled control flow, not sequential arrangement.
- **Pattern matching exhaustiveness**: functional languages (Rust `match`, Scala `match`, Haskell `case`) encourage exhaustive pattern matching that may have many branches -- this is idiomatic when each branch is a short expression, not a code block.
- **Error handling in systems code**: low-level systems code (device drivers, network protocols) may require checking error conditions at every step. Flag only when error handling obscures the main logic path.

## Severity Guidance

| Finding | Severity |
|---|---|
| Function with 4+ nesting levels and cyclomatic complexity exceeding 20 | Critical |
| Global mutable state written by multiple functions across different files | Critical |
| Exceptions used as flow control within the same function | Critical |
| Callback nesting 4+ levels deep with shared closure state | Critical |
| Temporal coupling requiring undocumented call sequence for correctness | Important |
| Function with 5+ return points scattered across nested conditionals | Important |
| Boolean parameter that forks a function into two unrelated code paths | Important |
| Mixed abstraction levels within a single function (3+ levels) | Important |
| Switch/case chain with 10+ branches containing side effects | Important |
| Function with 3 nesting levels that could use guard clauses | Minor |
| Deeply nested ternary (2 levels) where a named variable would suffice | Minor |
| Event listeners sharing closure state within a single module | Minor |

## See Also

- `smell-long-method` -- spaghetti code often manifests inside long methods, but a short method can also be spaghetti if its control flow is tangled
- `principle-separation-of-concerns` -- spaghetti code is the function-level failure to separate concerns
- `principle-solid` -- SRP violations at the function level produce multi-responsibility spaghetti
- `principle-naming-and-intent` -- extracting named helper functions from spaghetti code makes each step self-documenting
- `antipattern-big-ball-of-mud` -- spaghetti code is the function-level analog of the system-level Big Ball of Mud
- `principle-encapsulation` -- global mutable state spaghetti breaks encapsulation at the module level
- `smell-switch-statements` -- long switch chains are a specific form of spaghetti that polymorphism can resolve
- `principle-fail-fast` -- guard clauses (fail-fast returns) are the primary tool for flattening nested spaghetti

## Authoritative References

- [Robert C. Martin, *Clean Code* (2008), Chapter 3: Functions -- "Do One Thing" and structured programming](https://www.oreilly.com/library/view/clean-code-a/9780136083238/)
- [Thomas McCabe, "A Complexity Measure" (1976) -- cyclomatic complexity as a measure of control flow tangling](https://ieeexplore.ieee.org/document/1702388)
- [Edsger Dijkstra, "Go To Statement Considered Harmful" (1968)](https://homepages.cwi.nl/~storm/teaching/reader/Dijkstra68.pdf)
- [Martin Fowler, *Refactoring* (2nd ed., 2018), "Replace Nested Conditional with Guard Clauses" and "Decompose Conditional"](https://refactoring.com/catalog/)
- [Michael Feathers, *Working Effectively with Legacy Code* (2004), Chapter 22: "I Need to Change a Monster Method"](https://www.oreilly.com/library/view/working-effectively-with/0131177052/)
- [G. Ann Campbell, "Cognitive Complexity: A new way of measuring understandability" (SonarSource, 2017)](https://www.sonarsource.com/docs/CognitiveComplexity.pdf)
