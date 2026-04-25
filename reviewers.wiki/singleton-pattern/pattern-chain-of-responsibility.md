---
id: pattern-chain-of-responsibility
type: primary
depth_role: leaf
focus: Detect misuse, over-application, and absence of the Chain of Responsibility pattern in request-dispatch code.
parents:
  - index.md
covers:
  - Chains where no handler processes the request, causing silent drops
  - Ordering bugs where a generic handler precedes a specific one, shadowing it
  - Handlers that both handle AND forward the request, creating ambiguous responsibility
  - Chains where every handler always forwards, performing no actual handling
  - "Missing chain pattern where nested if/else dispatches requests to handlers"
  - Chain with no termination -- request loops back to the first handler
  - Handler that modifies the request object before forwarding, causing side effects for downstream handlers
  - Chain with hardcoded handler ordering that cannot be reconfigured
  - Handler with side effects that execute even when the handler does not handle the request
  - "Missing default/fallback handler at the end of the chain"
tags:
  - chain-of-responsibility
  - behavioral-pattern
  - design-patterns
  - handler
  - middleware
  - pipeline
  - dispatch
  - filter
activation:
  file_globs:
    - "**/*.{java,kt,scala,cs,ts,js,py,rb,go,rs,swift,cpp,h,hpp,php}"
  keyword_matches:
    - Chain
    - handler
    - next
    - handle
    - process
    - middleware
    - pipeline
    - filter
    - interceptor
    - successor
    - request
    - dispatch
  structural_signals:
    - class_with_next_field_of_same_type
    - method_calling_next_handle
    - linked_list_of_handlers
source:
  origin: file
  path: pattern-chain-of-responsibility.md
  hash: "sha256:dd6ec7536d89f0fca39a33e3e10ef48ff849463457073b33c9ae74eb9362b3bc"
---
# Chain of Responsibility Pattern

## When This Activates

Activates when diffs introduce classes with a `next` or `successor` field of the same handler type, implement middleware pipelines (Express, ASP.NET, Rack), add request/command dispatch logic with multiple potential handlers, or define classes named `*Handler`, `*Filter`, `*Interceptor` with a `handle`/`process` method that optionally delegates to a next handler. The Chain of Responsibility decouples request senders from receivers, but it creates correctness risks when requests silently drop, handler ordering introduces shadowing, or the chain devolves into a pass-through pipeline with no actual handling.

## Audit Surface

- [ ] Every request that enters the chain is either handled by a handler or reaches a terminal fallback that produces a meaningful response or error
- [ ] Handler ordering places specific handlers before generic ones -- no handler is shadowed by a preceding catch-all
- [ ] Each handler either handles the request OR forwards it, not both (unless explicitly designed as a pipeline with documented pass-through semantics)
- [ ] At least one handler in the chain terminates for each request type -- the chain is not a pure pass-through where nothing is actually decided
- [ ] Nested if/else or switch blocks dispatching to handlers are refactored into a chain when there are 4+ branches and extensibility is needed
- [ ] Chain does not cycle -- the last handler's next reference is null or a terminal handler, not the first handler
- [ ] Handlers treat the request as immutable or document the mutations they perform before forwarding
- [ ] Handler ordering is configurable (DI, configuration, builder) rather than hardcoded in constructor chains
- [ ] Handlers do not perform expensive side effects (I/O, logging, metrics) when passing through without handling
- [ ] A default handler at the end of the chain handles unmatched requests explicitly
- [ ] Chain length is reasonable and the request path is debuggable (tracing, logging on entry/exit)
- [ ] Handlers do not swallow exceptions from downstream handlers
- [ ] Handler predicates (canHandle checks) are lightweight and side-effect-free
- [ ] Chain is configured once and reused, not rebuilt per request
- [ ] Handlers with overlapping predicates have a deterministic, documented resolution order

## Detailed Checks

### Silent Request Drops
<!-- activation: keywords=["handle", "next", "null", "unhandled", "default", "fallback", "missing", "drop", "silent", "ignore", "lost"] -->

- [ ] **No terminal handler**: chain ends with the last handler's `next` being null; if no handler accepts the request, the method returns null/void silently -- the caller cannot distinguish "handled with no result" from "unhandled"
- [ ] **Null next without error**: handler checks `if (next != null) next.handle(request)` but does nothing when next is null and it did not handle the request itself -- the request disappears
- [ ] **Catch-all handler missing**: the chain assumes at least one handler will always match, but a new request type is introduced that none handle -- add a default handler that throws or returns an error
- [ ] **Logging gap**: when no handler processes a request, there is no log or metric -- silent drops are invisible in production
- [ ] **Void return type hides drop**: the `handle()` method returns void, making it impossible for the caller to know whether the request was actually handled -- consider returning a boolean or result object

### Handler Ordering Bugs
<!-- activation: keywords=["order", "first", "last", "before", "after", "generic", "specific", "priority", "sequence", "shadow", "catch-all"] -->

- [ ] **Generic before specific**: a handler that accepts all requests (e.g., `DefaultHandler`, wildcard matcher, `canHandle() { return true }`) is placed before specific handlers -- it absorbs all requests and the specific handlers never execute
- [ ] **Priority inversion**: a low-priority handler is positioned before a high-priority handler due to registration order -- the priority field exists but is not used to sort the chain
- [ ] **Overlapping predicates**: two handlers match the same request type with different predicates -- depending on chain order, either handler may execute, creating non-deterministic behavior
- [ ] **Hardcoded order**: handler ordering is determined by the sequence of `new HandlerA(new HandlerB(new HandlerC()))` constructor nesting -- adding a handler between A and B requires restructuring the construction code
- [ ] **Configuration-order dependency**: handlers are registered in a DI container or configuration file in a specific order, but the ordering constraint is not documented -- a refactoring that changes registration order silently breaks dispatch

### Handle-and-Forward Ambiguity
<!-- activation: keywords=["handle", "next", "forward", "pass", "delegate", "continue", "process", "both", "also", "and"] -->

- [ ] **Handler processes and forwards**: handler performs work on the request (logging, transformation, partial processing) and then calls `next.handle(request)` -- it is unclear whether the request has been "handled" or is still seeking a handler
- [ ] **Responsibility duplication**: two handlers both partially handle the same request, each assuming the other will complete the work -- the request is half-handled by each
- [ ] **Side effects on forward**: handler performs irreversible side effects (database write, HTTP call) and then forwards to the next handler, which may reject or further process the request -- the side effect cannot be rolled back
- [ ] **Ambiguous return value**: handler returns a result but also forwards to the next handler -- does the caller get this handler's result or the next handler's result?
- [ ] **Pipeline vs. chain confusion**: the code is structured as a chain of responsibility but behaves as a pipeline (every handler always forwards) -- rename and restructure to pipeline semantics for clarity

### Pass-Through Chain (No Actual Handling)
<!-- activation: keywords=["next", "forward", "pass", "always", "continue", "delegate", "pipeline", "middleware", "filter"] -->

- [ ] **All handlers forward**: every handler in the chain calls `next.handle()` unconditionally -- no handler terminates the chain, meaning the pattern provides no request dispatch, just sequential processing
- [ ] **Handlers add behavior but never decide**: each handler adds logging, metrics, or transformation but no handler makes a dispatch decision -- this is middleware/pipeline, not chain of responsibility
- [ ] **Terminal handler is unreachable**: a handler exists at the end of the chain to perform the actual work, but intermediate handlers always forward, making the chain a linear pipeline to the terminal -- simplify to direct middleware
- [ ] **Single handler chain**: the chain has one handler that always handles the request -- the chain infrastructure adds no value over a direct call

### Missing Chain of Responsibility
<!-- activation: keywords=["if", "else", "switch", "case", "dispatch", "route", "resolve", "match", "type", "instanceof", "handle"] -->

- [ ] **Nested if/else dispatch**: a method contains `if (request.type == A) handleA() else if (request.type == B) handleB() else ...` with 4+ branches -- a chain allows adding handlers without modifying the dispatch method
- [ ] **Switch on request type**: a switch statement maps request types to handler functions, requiring modification for every new type -- violates OCP; a chain is open for extension
- [ ] **Scattered dispatch logic**: multiple classes contain similar if/else request routing -- consolidate into a single chain that routes requests through a sequence of handlers
- [ ] **Hardcoded handler registration**: new request types require modifying a central dispatch function -- a chain with configurable handler registration allows extension without modification

### Chain Configuration and Performance
<!-- activation: keywords=["config", "build", "register", "add", "order", "performance", "slow", "expensive", "predicate", "canHandle", "rebuild"] -->

- [ ] **Chain rebuilt per request**: handler chain is constructed (allocated, linked) on every incoming request instead of being built once and reused -- unnecessary allocation pressure
- [ ] **Expensive canHandle predicate**: handler's `canHandle()` performs I/O (database lookup, HTTP call) or expensive computation (regex compilation, reflection) on every request -- cache the predicate result or simplify the check
- [ ] **Long chain with sequential scan**: 10+ handlers checked sequentially for every request -- consider a dispatch map or index for O(1) routing if the handler count grows
- [ ] **No handler removal mechanism**: handlers can be added to the chain but not removed -- stale or deprecated handlers continue processing and cannot be disabled without rebuilding the chain
- [ ] **Exception in handler breaks chain**: a handler throws an uncaught exception, preventing subsequent handlers from being consulted -- add try/catch in the dispatch loop to handle individual handler failures

## Common False Positives

- **Middleware pipelines**: Express.js middleware, ASP.NET middleware pipeline, Rack middleware, and Django middleware are explicit pipeline architectures where every handler forwards. This is by design, not a "pass-through chain" anti-pattern.
- **Servlet filter chains**: Java Servlet `FilterChain` is the canonical Chain of Responsibility in the Java web ecosystem. Do not flag standard filter chain usage.
- **Exception handler chains**: try/catch chains in error handling (catch specific exception, then general) are a form of chain of responsibility at the language level. Do not flag standard exception handling.
- **Event bubbling**: DOM event bubbling and capture follow chain-of-responsibility semantics. Do not flag browser event propagation.
- **Validation pipelines**: input validation chains where multiple validators each check one rule and all must pass are pipeline patterns, not dispatch chains. Do not flag as "no handler terminates."

## Severity Guidance

| Finding | Severity |
|---|---|
| Request silently dropped with no fallback handler and no error indication | high |
| Generic catch-all handler shadows all specific handlers | high |
| Handler performs irreversible side effect and then forwards to a handler that may reject | high |
| Chain forms a cycle causing infinite processing | high |
| Handler swallows exception from downstream handler, hiding failures | medium |
| Nested if/else with 6+ dispatch branches that should be a chain | medium |
| Handler ordering is hardcoded and undocumented, fragile to registration changes | medium |
| Two handlers with overlapping predicates producing non-deterministic dispatch | medium |
| Handlers mutate request before forwarding without documentation | medium |
| Pass-through chain where no handler terminates (pipeline mislabeled as chain) | low |
| Chain rebuilt on every request instead of configured once | low |
| Expensive canHandle predicate running on every request | low |

## See Also

- `pattern-decorator` -- decorator and chain of responsibility both link objects in a chain; decorator always forwards (adds behavior), while chain of responsibility may terminate. Verify the correct pattern is applied.
- `pattern-composite` -- chain of responsibility can be combined with composite (tree-structured handler hierarchies); verify both patterns' contracts hold
- `principle-solid` -- chains support OCP (add new handlers without modifying existing ones); shadowing violates LSP if a handler claims to handle a request it should not
- `principle-separation-of-concerns` -- each handler should address one concern; handlers that both dispatch and process blur the separation

## Authoritative References

- [Erich Gamma et al., *Design Patterns: Elements of Reusable Object-Oriented Software* (1994), Chain of Responsibility](https://www.oreilly.com/library/view/design-patterns-elements/0201633612/)
- [Robert C. Martin, *Agile Software Development* (2002), Chapter 23: Chain of Responsibility](https://www.oreilly.com/library/view/agile-software-development/0135974445/)
- [Martin Fowler, *Patterns of Enterprise Application Architecture* (2002), Front Controller](https://martinfowler.com/eaaCatalog/frontController.html)
- [Microsoft, ASP.NET Core Middleware](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/middleware/)
