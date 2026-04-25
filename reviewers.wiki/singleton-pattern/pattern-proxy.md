---
id: pattern-proxy
type: primary
depth_role: leaf
focus: Detect misuse, over-application, and absence of the Proxy pattern in access-control and indirection code.
parents:
  - index.md
covers:
  - "Proxies that diverge from the real subject's interface, breaking substitutability"
  - "Proxies with hidden side effects (caching, logging, access control) undiscoverable by callers"
  - Proxy chains where multiple proxies wrap the same subject, degrading performance
  - Virtual proxies with incorrect lazy-initialization thread safety
  - Protection proxies with bypassable access checks
  - Caching proxies with stale data and missing invalidation
  - Remote proxies hiding network failure modes from callers
  - "Dynamic proxies (reflection-based) with unchecked method dispatch"
  - Proxy that holds a stale reference to a disposed or replaced real subject
  - Missing proxy where clients directly interact with expensive or restricted resources
tags:
  - proxy
  - structural-pattern
  - design-patterns
  - access-control
  - lazy-loading
  - caching
  - remote
  - dynamic-proxy
activation:
  file_globs:
    - "**/*.{java,kt,scala,cs,ts,js,py,rb,go,rs,swift,cpp,h,hpp,php}"
  keyword_matches:
    - Proxy
    - proxy
    - lazy
    - virtual
    - remote
    - cache
    - protection
    - guard
    - interceptor
    - handler
    - InvocationHandler
    - Proxy.newProxyInstance
    - dynamic proxy
  structural_signals:
    - class_implementing_interface_with_lazy_field
    - reflection_based_method_dispatch
    - access_check_before_delegation
source:
  origin: file
  path: pattern-proxy.md
  hash: "sha256:e8a1fe9f7257eda05a5dab4d845ac3e90650b7903cad40fb85df552b011cd85d"
---
# Proxy Pattern

## When This Activates

Activates when diffs introduce classes that control access to another object (lazy loading, access control, caching, remote delegation), use `java.lang.reflect.Proxy`, `InvocationHandler`, ES6 `Proxy`, or Python `__getattr__` delegation, add protection checks before method forwarding, or introduce lazy-initialization wrappers. The Proxy pattern is deceptively simple but hides correctness traps: thread-unsafe lazy init, bypassable security, stale caches, and hidden network failures.

## Audit Surface

- [ ] Proxy implements the exact same interface as the real subject -- no added or omitted methods
- [ ] Proxy behavior (caching, auth, logging) is documented and discoverable by callers, not hidden
- [ ] No proxy chains exist where each layer adds overhead (reflection, synchronization, serialization)
- [ ] Virtual proxy lazy initialization is thread-safe for the target environment's concurrency model
- [ ] Protection proxy access checks cannot be bypassed by obtaining a direct reference to the real subject
- [ ] Caching proxy has explicit TTL, max size, and invalidation strategy
- [ ] Remote proxy surfaces network failures explicitly -- no silent fallbacks or default return values
- [ ] Dynamic proxy handles Object methods (equals, hashCode, toString) correctly
- [ ] Proxy does not hold a stale reference to a disposed, closed, or replaced real subject
- [ ] Expensive or restricted resources are accessed through a proxy, not directly by clients
- [ ] Proxy overhead (reflection, synchronization) is acceptable on the code path where it is used
- [ ] Proxy and real subject share a common interface defined in a module accessible to both
- [ ] Proxy does not expose operations beyond the real subject's interface
- [ ] Smart reference proxy releases the real subject when no longer needed
- [ ] Proxy does not log, cache, or transmit sensitive data from method arguments

## Detailed Checks

### Interface Divergence
<!-- activation: keywords=["Proxy", "proxy", "interface", "implement", "delegate", "subject", "real"] -->

- [ ] **Missing methods**: proxy does not implement all methods of the subject interface -- callers get `NoSuchMethodError` or similar at runtime when calling methods that exist on the real subject
- [ ] **Extra methods**: proxy exposes methods not on the subject interface (e.g., `getProxyStats()`, `invalidateCache()`), breaking substitutability -- move these to a separate management interface
- [ ] **Return type mismatch**: proxy method returns a different type than the real subject (e.g., wrapping the result in `Optional` or a `Future` when the interface specifies a raw value)
- [ ] **Exception signature change**: proxy throws exceptions not declared by the subject interface, forcing callers to handle proxy-specific errors
- [ ] **Generic type erasure**: dynamic proxy loses generic type information, causing `ClassCastException` when callers use typed return values

### Hidden Side Effects
<!-- activation: keywords=["cache", "log", "auth", "metric", "trace", "audit", "throttle", "rate", "limit", "count"] -->

- [ ] **Invisible caching**: proxy caches return values but callers assume every call reaches the real subject -- stale data or inconsistent behavior results
- [ ] **Invisible logging**: proxy logs method arguments including sensitive data (credentials, PII, tokens) -- this is both a security risk and a GDPR/compliance concern
- [ ] **Invisible auth**: proxy silently rejects unauthorized calls by returning null or empty results instead of throwing an access-denied exception -- callers cannot distinguish "no data" from "no permission"
- [ ] **Invisible metrics**: proxy collects timing or usage metrics that add overhead to every call -- acceptable for monitoring but must not impact hot-path performance
- [ ] **Side effect ordering**: proxy performs logging, auth, and caching in an order that creates bugs (e.g., caching unauthorized responses, logging before auth validation)

### Lazy Initialization Thread Safety
<!-- activation: keywords=["lazy", "virtual", "initialize", "init", "load", "create", "null", "volatile", "synchronized", "lock", "once", "OnceCell"] -->

- [ ] **Unprotected lazy init**: `if (subject == null) subject = createSubject()` without synchronization -- in concurrent code, multiple threads create multiple subjects, wasting resources or causing errors
- [ ] **Double-checked locking without volatile**: subject field is checked outside synchronization and assigned inside, but missing `volatile` (Java/C#) or equivalent memory barrier -- threads may see a partially-constructed subject
- [ ] **Lock contention on hot path**: every proxy method call acquires a lock to check if the subject is initialized, even after initialization is complete -- use `volatile` check or `OnceCell`/`lazy_static`
- [ ] **Initialization failure handling**: subject creation throws an exception but the proxy does not reset to allow retry -- subsequent calls see a null subject or fail with a confusing error
- [ ] **Initialization ordering**: subject initialization depends on resources that may not be available yet (database, network) -- proxy must handle or document the initialization window

### Protection Proxy Security
<!-- activation: keywords=["protection", "guard", "auth", "access", "permission", "role", "check", "security", "authorize", "deny"] -->

- [ ] **Direct reference bypass**: client code obtains a direct reference to the real subject (via DI container, factory, or public field), bypassing the protection proxy entirely
- [ ] **Incomplete method coverage**: protection proxy checks access on some methods but not others -- an attacker can use unchecked methods to achieve the same effect
- [ ] **Time-of-check-to-time-of-use (TOCTOU)**: proxy checks permissions before delegating, but permissions change between check and use -- the real subject operates with revoked permissions
- [ ] **Role/permission hardcoding**: proxy hardcodes role names or permission strings instead of delegating to an authorization service -- changes require code modifications
- [ ] **Error information leakage**: protection proxy's access-denied response reveals information about the real subject's existence, type, or capabilities to unauthorized callers
- [ ] **Missing audit trail**: protection proxy denies access but does not log the denial -- security monitoring has blind spots

### Caching Proxy Correctness
<!-- activation: keywords=["cache", "memoize", "store", "hit", "miss", "invalidate", "TTL", "expire", "evict", "stale"] -->

- [ ] **No invalidation**: caching proxy stores results indefinitely -- underlying data changes but the proxy serves stale responses
- [ ] **No size limit**: cache grows unbounded, eventually causing memory exhaustion -- add maximum entry count or memory cap
- [ ] **Cache key correctness**: cache key does not include all relevant method arguments or context (e.g., user identity, locale), causing incorrect cache hits across different callers
- [ ] **Mutable cached values**: proxy returns a reference to a cached mutable object -- callers modify the cached value, corrupting it for subsequent reads
- [ ] **Concurrent cache population**: multiple threads simultaneously compute the same cached value (thundering herd) -- use a locking or single-flight mechanism
- [ ] **Cache-through writes**: write operations do not invalidate or update the cache, causing the next read to return stale data

### Remote Proxy Failure Handling
<!-- activation: keywords=["remote", "RPC", "HTTP", "gRPC", "network", "timeout", "retry", "fallback", "circuit", "connection"] -->

- [ ] **Silent fallback**: remote proxy catches network exceptions and returns a default value, hiding the fact that the operation did not actually execute -- callers make decisions based on false data
- [ ] **Missing timeout**: remote proxy calls do not specify a timeout, potentially blocking the calling thread indefinitely
- [ ] **Retry without idempotency check**: remote proxy retries failed calls that may have partially succeeded (e.g., payment processing), causing duplicate side effects
- [ ] **No circuit breaker**: remote proxy continues calling a failing service, adding latency to every request instead of failing fast after a threshold
- [ ] **Serialization mismatch**: remote proxy serializes/deserializes method arguments and return values, but schema evolution between client and server causes silent data loss or corruption

### Dynamic Proxy Pitfalls
<!-- activation: keywords=["InvocationHandler", "Proxy.newProxyInstance", "reflect", "invoke", "intercept", "MethodInterceptor", "__getattr__", "Proxy(", "handler", "trap"] -->

- [ ] **Missing Object method handling**: dynamic proxy's invoke handler does not explicitly handle `equals`, `hashCode`, `toString` -- these calls are dispatched to the handler instead of behaving correctly, breaking collections and logging
- [ ] **Unchecked method dispatch**: invoke handler uses `method.invoke(target, args)` without handling methods not present on the target, leading to confusing `InvocationTargetException` wrappers
- [ ] **Performance on hot path**: reflection-based dispatch adds measurable overhead (method lookup, boxing, exception wrapping) -- on hot paths, prefer compile-time proxies or code generation
- [ ] **Exception unwrapping**: `InvocationTargetException` wraps the real exception -- proxy must unwrap and rethrow the cause, not propagate the reflection wrapper
- [ ] **Class loading issues**: dynamic proxy created with the wrong class loader cannot load interface classes in modular or OSGi environments

## Common False Positives

- **ORM lazy-loading proxies**: Hibernate/JPA lazy-loaded entity proxies are framework-managed. Do not flag them as "hidden side effects" unless the lazy-loading causes N+1 query issues.
- **ES6 Proxy for reactivity**: Vue.js, MobX, and Solid.js use ES6 Proxy for reactive state tracking. This is framework-idiomatic, not GoF Proxy misuse.
- **gRPC/Thrift generated stubs**: auto-generated client stubs are remote proxies by design. Flag only if error handling or timeout configuration is missing.
- **Dependency injection proxies**: Spring, CDI, and Guice create proxies for scoped beans. These are container-managed and do not need manual thread safety.
- **Mock objects in tests**: test frameworks (Mockito, unittest.mock, Moq) create proxies for test doubles. These are test infrastructure, not production code proxies.

## Severity Guidance

| Finding | Severity |
|---|---|
| Protection proxy bypassable via direct reference to real subject | critical |
| Proxy logs or caches sensitive data (credentials, PII) | critical |
| Thread-unsafe lazy initialization in concurrent code | high |
| Remote proxy silently swallows network errors, returning defaults | high |
| Caching proxy with no invalidation serving stale security-sensitive data | high |
| Dynamic proxy does not handle equals/hashCode, breaking collections | medium |
| Proxy chain of 3+ layers adding cumulative overhead | medium |
| Caching proxy without size limit risking memory exhaustion | medium |
| Remote proxy retries non-idempotent operations | medium |
| Protection proxy with incomplete method coverage | medium |
| Proxy exposes extra methods not on the subject interface | low |
| Dynamic proxy performance overhead on non-hot path | low |
| Smart reference proxy missing cleanup on last-reference drop | low |

## See Also

- `pattern-decorator` -- decorators add behavior while preserving the interface; proxies control access. If the "proxy" adds logging or caching as primary purpose, it may be a decorator.
- `pattern-adapter` -- adapters change interfaces; proxies preserve them. If the proxy translates between different interfaces, it is an adapter.
- `pattern-singleton` -- virtual proxies often use singleton-like lazy initialization; verify thread safety with the same rigor
- `principle-encapsulation` -- proxies encapsulate access control and lifecycle management; hidden side effects undermine this
- `principle-separation-of-concerns` -- a proxy should handle one concern (access control OR caching OR lazy init), not all three

## Authoritative References

- [Erich Gamma et al., *Design Patterns: Elements of Reusable Object-Oriented Software* (1994), Proxy](https://www.oreilly.com/library/view/design-patterns-elements/0201633612/)
- [Joshua Bloch, *Effective Java* (3rd ed., 2018), Item 65: Prefer interfaces to reflection](https://www.oreilly.com/library/view/effective-java/9780134686097/)
- [Martin Fowler, *Patterns of Enterprise Application Architecture* (2002), Lazy Load](https://martinfowler.com/eaaCatalog/lazyLoad.html)
- [Michael Nygard, *Release It!* (2nd ed., 2018), Chapter 5: Stability Patterns -- Circuit Breaker](https://pragprog.com/titles/mnee2/release-it-second-edition/)
