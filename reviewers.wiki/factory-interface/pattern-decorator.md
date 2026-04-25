---
id: pattern-decorator
type: primary
depth_role: leaf
focus: Detect misuse, over-application, and absence of the Decorator pattern in behavior-extension code.
parents:
  - index.md
covers:
  - "Decorators that break the decorated component's interface contract"
  - "Decorator ordering bugs where the sequence of wrapping changes correctness (auth-then-log vs log-then-auth)"
  - Decorator stacks that accumulate into unreadable, undebuggable layers
  - Decorators with state mutation that leaks to the wrapped component or other decorators
  - Missing decorator where subclassing is used for cross-cutting concerns
  - Decorators that swallow exceptions from the wrapped component
  - Decorator-component interface mismatch after interface evolution
  - Decorators that short-circuit and never delegate to the wrapped component
  - "Transparent decorator identity issues (equals/hashCode, type checks)"
  - Decorator applied where aspect-oriented programming or middleware would be more appropriate
tags:
  - decorator
  - structural-pattern
  - design-patterns
  - wrapper
  - cross-cutting
  - middleware
  - composition
activation:
  file_globs:
    - "**/*.{java,kt,scala,cs,ts,js,py,rb,go,rs,swift,cpp,h,hpp,php}"
  keyword_matches:
    - Decorator
    - Wrapper
    - wrap
    - decorate
    - middleware
    - intercept
    - enhance
    - augment
    - "@decorator"
    - proxy
  structural_signals:
    - class_implementing_interface_with_same_type_field
    - method_delegating_to_field_with_extras
    - stacked_wrapping
source:
  origin: file
  path: pattern-decorator.md
  hash: "sha256:e8fad6ddacf747a0301977e243af4ac1e95e71fc398b0b54d25b6e5d6deb3d85"
---
# Decorator Pattern

## When This Activates

Activates when diffs introduce classes that implement an interface and hold a field of the same interface type, add wrapping logic around method calls (logging, caching, retries, auth), stack multiple wrappers on a single component, or use `@decorator` syntax in Python/TypeScript. The Decorator pattern is powerful for composing cross-cutting concerns but becomes a maintenance hazard when ordering is implicit, contracts are broken, or decorators accumulate into opaque stacks.

## Audit Surface

- [ ] Every decorator implements exactly the same interface as the component it wraps -- no added or removed methods
- [ ] Decorator delegates to the wrapped component for all interface methods, not just some
- [ ] Decorator does not silently alter return values, suppress exceptions, or change observable behavior beyond its stated purpose
- [ ] Decorator wrapping order is documented, tested, or enforced when ordering affects correctness
- [ ] Decorator stack depth is reasonable (3-4 max); deeper stacks are justified and have debugging support
- [ ] Decorator holds no mutable state that leaks to or from the wrapped component
- [ ] Cross-cutting concerns (logging, caching, auth) use decorators or middleware, not subclass hierarchies
- [ ] Decorator does not swallow exceptions from the delegate -- it may translate or wrap them but must propagate failure
- [ ] All interface methods are implemented after interface evolution -- no default/empty stubs hiding missing delegation
- [ ] Decorator does not conditionally skip delegation entirely (short-circuit) without clear documentation
- [ ] Identity operations (equals, hashCode, toString, compareTo) either delegate to the wrapped component or are explicitly overridden with documented semantics
- [ ] Decorator accepts the component interface type, not a concrete implementation
- [ ] No duplicate cross-cutting concerns exist in the decorator chain
- [ ] Decorator side effects occur during method delegation, not in the constructor
- [ ] Decorator is transparent: callers cannot distinguish a decorated component from an undecorated one (Liskov Substitution)

## Detailed Checks

### Interface Contract Violations
<!-- activation: keywords=["Decorator", "decorate", "wrap", "delegate", "implement", "interface", "override"] -->

- [ ] **Missing method delegation**: decorator implements the component interface but one or more methods throw `UnsupportedOperationException`, return null, or have empty bodies instead of delegating
- [ ] **Return value mutation**: decorator modifies the return value of the delegate (e.g., filtering a list, transforming a response) in ways that violate the interface's postconditions
- [ ] **Exception swallowing**: decorator catches exceptions from the delegate and returns a default value, hiding failures from callers who expect the original exception contract
- [ ] **Precondition strengthening**: decorator adds validation that rejects inputs the wrapped component would accept, violating Liskov Substitution Principle
- [ ] **Postcondition weakening**: decorator returns results that the interface's contract would not permit from the unwrapped component (e.g., returning null when the interface guarantees non-null)
- [ ] **Side-effect introduction**: decorator adds observable side effects (I/O, state mutation) that the interface contract does not specify -- callers may be surprised

### Ordering Bugs
<!-- activation: keywords=["order", "chain", "stack", "middleware", "pipeline", "sequence", "before", "after", "first", "last"] -->

- [ ] **Auth-after-logging**: logging decorator wraps the auth decorator, causing unauthenticated request details to be logged before auth rejects them -- security and compliance risk
- [ ] **Cache-before-validation**: caching decorator wraps the validation decorator, returning cached results for inputs that should fail validation
- [ ] **Retry-outside-timeout**: retry decorator wraps a timeout decorator, causing retries to restart the timeout clock -- total wait time is retries x timeout instead of a single timeout
- [ ] **Transaction-order bug**: transactional decorator wraps audit logging, causing audit records to be lost if the transaction rolls back
- [ ] **Implicit ordering**: decorator stacking order is determined by constructor call nesting or DI container registration order, with no explicit documentation or test verifying the correct sequence
- [ ] **Non-commutative composition**: two decorators produce different results depending on order, but neither the code nor tests assert the correct order

### Decorator Stack Accumulation
<!-- activation: keywords=["stack", "chain", "wrap", "layer", "nested", "depth", "compose", "pipe"] -->

- [ ] **Opaque debugging**: when a decorated method fails, the stack trace passes through 5+ decorator layers, making root-cause identification slow -- consider logging the decorator chain at construction time
- [ ] **Performance overhead**: each decorator adds a virtual method call, potential object allocation, and exception-handling frame -- measure latency for hot paths with deep stacks
- [ ] **Duplicated decorators**: the same decorator type appears more than once in the chain (e.g., two caching decorators at different levels) -- likely a configuration error
- [ ] **Invisible composition**: the final decorated object is assembled in a DI container or factory, and developers cannot easily inspect what decorators are applied -- add diagnostic tooling or logging
- [ ] **Better fit: middleware pipeline**: if decorators are always applied in a fixed sequence with shared context, a middleware pipeline (ASP.NET, Express, Rack) is a more explicit, debuggable model

### State Mutation Leaks
<!-- activation: keywords=["state", "mutable", "field", "cache", "counter", "buffer", "accumulate", "shared"] -->

- [ ] **Shared mutable reference**: decorator and wrapped component both reference the same mutable object (list, map, config), and mutations from one leak to the other
- [ ] **Accumulated state across calls**: decorator accumulates state (counters, buffers, caches) that persists across calls and affects subsequent behavior -- the component interface does not advertise this statefulness
- [ ] **Thread-unsafe decorator state**: decorator holds mutable state (request counter, rate limiter bucket) accessed from multiple threads without synchronization
- [ ] **State desync**: decorator caches a value from the wrapped component that later changes, serving stale data -- invalidation is missing
- [ ] **Decorator affecting delegate state**: decorator modifies arguments before passing them to the delegate, causing the delegate to operate on different data than the caller intended

### Missing Decorator (Subclass Abuse)
<!-- activation: keywords=["extends", "inherits", "super", "override", "logging", "caching", "auth", "retry", "metric", "trace"] -->

- [ ] **Logging subclass**: `LoggingService extends Service` overrides methods to add logging before/after `super.method()` -- this should be a logging decorator wrapping the service interface
- [ ] **Caching subclass**: `CachingRepository extends Repository` adds caching behavior through inheritance -- a caching decorator would be composable and reusable
- [ ] **Auth subclass**: `AuthorizedController extends Controller` adds authorization checks via inheritance -- authorization is a cross-cutting concern that belongs in a decorator or middleware
- [ ] **Combinatorial explosion**: need Logging + Caching requires `LoggingCachingService`, Logging + Auth requires `LoggingAuthService` -- the number of subclasses grows multiplicatively instead of being composed from independent decorators
- [ ] **Mixin/trait overuse**: language mixins or traits used to compose cross-cutting concerns create a fixed combination at compile time -- decorators allow runtime composition

### Identity and Transparency Issues
<!-- activation: keywords=["equals", "hashCode", "instanceof", "typeof", "is", "as", "cast", "identity", "type", "getClass"] -->

- [ ] **Broken equality**: decorator does not delegate `equals`/`hashCode` to the wrapped component, causing collections and caches to treat decorated and undecorated instances as different objects
- [ ] **Type check failure**: code uses `instanceof`/`is`/`typeof` to check for the concrete component type, which fails when the component is decorated -- design should depend on the interface, not the concrete type
- [ ] **toString obscures delegate**: decorator's `toString()` shows only the decorator layer, hiding the wrapped component's identity -- debug output is confusing
- [ ] **Serialization breaks**: decorated object is serialized but the decorator layer is not serializable, or deserialization strips the decorator and returns the raw component

## Common False Positives

- **Python/TypeScript `@decorator` syntax**: language-level decorators (function decorators, class decorators) modify classes or functions at definition time. They share the name but are a different mechanism; only flag them if they wrap an interface-typed object at runtime.
- **Middleware pipelines**: Express middleware, ASP.NET middleware, and Rack middleware are decorator-like but operate within an explicit pipeline framework. Do not flag well-structured middleware as "decorator stacks."
- **Stream wrappers**: `BufferedInputStream(FileInputStream(...))` and similar I/O stream chaining is idiomatic decorator usage in the Java ecosystem. Do not flag standard library stream composition.
- **React higher-order components**: HOCs like `withAuth(withLogging(Component))` use decorator composition. Flag only if the HOC stack is genuinely unmanageable (5+) or breaks component contracts.
- **Method interception via AOP**: frameworks like AspectJ or Spring AOP apply cross-cutting concerns through proxies. These are architectural alternatives to manual decorators, not misuse.

## Severity Guidance

| Finding | Severity |
|---|---|
| Decorator swallows exceptions from delegate, hiding failures | high |
| Auth-after-logging or similar ordering bug with security implications | high |
| Decorator breaks interface contract (missing delegation, altered postconditions) | high |
| Decorator holds thread-unsafe mutable state in concurrent code | high |
| Decorator conditionally skips delegation without documentation | medium |
| 5+ decorator layers stacked with no diagnostic tooling | medium |
| Subclass hierarchy used for composable cross-cutting concerns | medium |
| Decorator does not implement newly added interface methods | medium |
| Decorator breaks equals/hashCode causing collection bugs | medium |
| Duplicate decorator in the chain (e.g., double-logging) | low |
| Decorator naming does not communicate the enhancement it provides | low |
| Minor: decorator could be replaced by a simpler middleware hook | low |

## See Also

- `pattern-adapter` -- adapters change the interface; decorators preserve it. If the "decorator" translates between different interfaces, it is an adapter.
- `pattern-proxy` -- proxies control access to the real subject; decorators add behavior. If the "decorator" adds access control or lazy loading, consider whether it is actually a proxy.
- `principle-solid` -- decorators support OCP (add behavior without modifying existing code) and LSP (decorated component must be substitutable for the raw component)
- `principle-separation-of-concerns` -- decorators isolate cross-cutting concerns from core logic
- `principle-composition-over-inheritance` -- decorators are the canonical example of favoring composition over inheritance for behavior extension

## Authoritative References

- [Erich Gamma et al., *Design Patterns: Elements of Reusable Object-Oriented Software* (1994), Decorator](https://www.oreilly.com/library/view/design-patterns-elements/0201633612/)
- [Robert C. Martin, *Agile Software Development* (2002), Chapter 35: Decorator Pattern](https://www.oreilly.com/library/view/agile-software-development/0135974445/)
- [Joshua Bloch, *Effective Java* (3rd ed., 2018), Item 18: Favor composition over inheritance](https://www.oreilly.com/library/view/effective-java/9780134686097/)
- [Martin Fowler, *Patterns of Enterprise Application Architecture* (2002), Plugin pattern](https://martinfowler.com/eaaCatalog/)
