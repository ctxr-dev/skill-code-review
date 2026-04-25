---
id: antipattern-singleton-as-global
type: primary
depth_role: leaf
focus: Detect singletons used as socially acceptable global mutable state, bypassing dependency injection and damaging testability
parents:
  - index.md
covers:
  - Singleton holding mutable collections, maps, or caches accessible from anywhere in the codebase
  - Singleton used to avoid passing dependencies through constructors or function parameters
  - "Singleton with reset() or clear() methods added solely for test isolation"
  - "Production code calling getInstance() directly instead of receiving the dependency via injection"
  - "Singleton accumulating unrelated responsibilities (config + cache + auth state)"
  - Module-level mutable variables in Python or JS acting as implicit singletons
  - Singleton storing request-scoped or user-scoped state in a globally shared instance
  - Static mutable fields accessed across threads with no synchronization
  - Companion object or static class used as a hidden mutable state container
  - "Singleton used as a service locator -- code calls Singleton.get(ServiceType) instead of receiving the service"
  - Singleton hiding global mutable state behind a controlled access point
  - Singleton making code untestable by creating hard dependencies
  - "Double-checked locking implemented incorrectly (missing volatile, memory barriers)"
  - Thread-unsafe lazy initialization in concurrent environments
  - Singleton used as a disguised global variable for convenience
  - Singleton where a DI-scoped instance would be more appropriate
  - "Singleton holding resources that are never released (memory leaks)"
  - Singleton serialization breaking the single-instance guarantee
  - Singleton subclassing creating ambiguous instance ownership
  - Overuse of singleton for objects that have no intrinsic reason to be unique
  - Singleton preventing parallel test execution due to shared state
tags:
  - singleton
  - global-state
  - anti-pattern
  - testability
  - dependency-injection
  - mutable-state
  - architecture
  - coupling
  - creational-pattern
  - design-patterns
  - concurrency
aliases:
  - pattern-singleton
activation:
  file_globs:
    - "**/*.{java,kt,scala,cs,ts,js,py,rb,go,rs,swift,cpp,h,hpp,php}"
  keyword_matches:
    - Singleton
    - getInstance
    - instance
    - shared
    - static
    - global
    - companion object
    - "@Singleton"
    - once
    - lazy_static
    - sharedInstance
    - INSTANCE
    - module-level
    - let mut
    - "var "
    - static mut
  structural_signals:
    - private_constructor_static_field
    - static_accessor_method
    - module_level_mutable
    - global_variable
source:
  origin: file
  path: antipattern-singleton-as-global.md
  hash: "sha256:af0ff5b3f40245069a9f07e1db3a5d64ad41868e8ccbb0e7e966cb3ad8fb2886"
---
# Singleton as Global State

## When This Activates

Activates when diffs contain singleton access patterns (`getInstance()`, `.shared`, `.instance`, `INSTANCE`), static mutable fields, module-level mutable variables, or `@Singleton` annotations paired with mutable internal state. This reviewer complements `pattern-singleton` (which checks pattern implementation correctness -- thread safety, serialization, lazy initialization). This reviewer specifically targets the **anti-pattern**: using the Singleton as a socially acceptable way to introduce global mutable state. The distinction matters: a correctly implemented singleton that holds mutable state accessed from everywhere is still an architecture problem, even if its double-checked locking is perfect. The symptom is code that calls `AppState.getInstance().getCache().put(...)` from 30 different classes -- it is a global variable wearing a design pattern costume.

## Audit Surface

- [ ] Class with getInstance()/shared/instance accessor whose internal state is mutable
- [ ] Singleton holding a mutable Map, List, Set, cache, or registry written to at runtime
- [ ] Production code calling Singleton.getInstance() directly instead of depending on an injected interface
- [ ] Singleton with a reset(), clear(), or resetForTesting() method
- [ ] Singleton constructor/initializer that accepts no parameters (hiding dependencies)
- [ ] Singleton accumulating fields from unrelated domains (config + metrics + cache + auth)
- [ ] Module-level mutable variable (Python dict/list, JS let/var object) imported by multiple files
- [ ] Singleton storing per-request, per-user, or per-tenant state in a shared instance
- [ ] Static mutable field accessed from multiple threads with no lock, volatile, or atomic
- [ ] Test file using reflection, PowerMock, or module reload to replace singleton state
- [ ] Singleton acting as service locator (get(Class) or resolve(name) methods)
- [ ] Companion object or static nested class holding mutable state beyond simple constants
- [ ] Singleton that is the only reason several unrelated modules share a transitive dependency
- [ ] Global mutable state guarded by comments like "not thread-safe" or "call before X"

## Detailed Checks

### Mutable State Behind a Singleton Facade
<!-- activation: keywords=["getInstance", "shared", "instance", "INSTANCE", "Map", "HashMap", "Dictionary", "dict", "List", "ArrayList", "cache", "Cache", "store", "Store", "registry", "Registry", "put", "set", "add", "remove", "clear", "mutable"] -->

- [ ] **Mutable collections**: flag singletons whose fields include mutable Maps, Lists, Sets, or custom caches that are written to after initialization -- these are global variables with a getter API
- [ ] **Write access from anywhere**: check whether multiple unrelated classes call methods that mutate the singleton's state (`cache.put()`, `registry.register()`, `config.set()`) -- if state can be changed from anywhere, ordering and concurrency bugs are inevitable
- [ ] **No encapsulation of mutation**: flag singletons that expose their mutable collections directly (`getCache()` returning the raw Map) rather than providing domain-specific methods with invariant enforcement
- [ ] **State that grows without bound**: flag singleton-held caches or registries with no eviction policy, size limit, or TTL -- these become memory leaks that only manifest under production load
- [ ] **Initialization ordering dependency**: flag singletons whose correctness depends on being initialized before other singletons or before certain methods are called -- temporal coupling is a hallmark of global state

### Singleton as Dependency Injection Bypass
<!-- activation: keywords=["getInstance", "shared", "instance", "new ", "constructor", "init", "inject", "@Autowired", "@Inject", "resolve", "getBean", "ServiceLocator"] -->

- [ ] **Direct getInstance() in business logic**: flag production classes that call `Singleton.getInstance()` in method bodies instead of receiving the dependency through their constructor or method parameters -- every call site is a hidden dependency invisible in the class's API
- [ ] **Constructor hiding**: flag singletons with no-argument constructors (or no constructor at all) that acquire their own dependencies internally -- the singleton's dependency graph is invisible and cannot be substituted
- [ ] **Service locator pattern**: flag singletons that act as service locators (`AppContext.getInstance().getService(UserService.class)`) -- this is the singleton-as-global anti-pattern compounded by dynamic resolution that defeats static analysis and IDE navigation
- [ ] **Counting call sites**: count how many distinct classes call `getInstance()` on the singleton -- if 10+ classes across unrelated packages depend on it directly, the singleton is the hub of a hidden dependency web
- [ ] **Test double impossibility**: check whether any test can substitute the singleton's behavior without reflection, PowerMock, or modifying global state -- if substitution requires hacks, the design forces integration testing where unit testing would suffice

### Test Isolation Damage
<!-- activation: keywords=["test", "Test", "spec", "Spec", "reset", "clear", "mock", "stub", "fake", "setUp", "tearDown", "beforeEach", "afterEach", "@Before", "@After", "reflect", "PowerMock", "Mockito", "patch", "monkeypatch"] -->

- [ ] **reset() or clear() methods**: flag singletons with `reset()`, `clear()`, `resetForTesting()`, or `@VisibleForTesting` backdoors -- these exist solely because the singleton's global state leaks between tests. The fix is dependency injection, not a reset switch
- [ ] **Reflection-based test override**: flag test code that uses reflection to set the private `instance` field to null, replace it with a mock, or access internal state -- this is fragile, language-specific, and a symptom of untestable design
- [ ] **Test ordering dependency**: flag test suites where tests pass individually but fail when run in a different order or in parallel because singleton state leaks between test cases
- [ ] **monkeypatch/patch of module globals**: flag Python tests using `monkeypatch.setattr` or `unittest.mock.patch` on module-level mutable state imported from production code -- this works but confirms the production code has global state
- [ ] **Setup/teardown singleton management**: flag test base classes with `@Before`/`@After` methods dedicated to resetting singleton state -- the test infrastructure is managing the design problem instead of fixing it

### Responsibility Accumulation (God Singleton)
<!-- activation: keywords=["config", "Config", "cache", "Cache", "auth", "Auth", "metrics", "Metrics", "state", "State", "context", "Context", "app", "App", "global", "Global"] -->

- [ ] **Multi-domain fields**: flag singletons with fields spanning unrelated domains -- when a single instance holds configuration, caching, authentication state, and metrics counters, it is a God Object hiding behind the Singleton pattern
- [ ] **Growing over time**: check git history for the singleton -- if it has accumulated fields and methods over many PRs, each adding "just one more thing," it is exhibiting accretion typical of global state
- [ ] **Mixed read-write patterns**: flag singletons where some consumers only read (config) and others write (cache, state) -- these are separate concerns forced into one instance because "it's already there"
- [ ] **Cross-cutting concern collector**: flag singletons that become the dumping ground for cross-cutting concerns (logging config, feature flags, rate limits, circuit breaker state) -- each concern should be its own injected service

### Module-Level Mutable State (Implicit Singletons)
<!-- activation: keywords=["module", "global", "let ", "var ", "const ", "static ", "static mut", "lazy_static", "thread_local", "import ", "require", "from ", "export "] -->

- [ ] **Python module-level mutables**: flag `dict`, `list`, `set`, or custom objects defined at module scope and imported by multiple files -- these are implicit singletons with no access control and are mutated via direct reference
- [ ] **JavaScript/TypeScript module state**: flag `let` or `var` declarations at module scope that hold mutable objects (arrays, maps, class instances) exported and imported by other modules -- module scope is singleton scope in bundled JS
- [ ] **Rust `static mut` or unguarded `lazy_static`**: flag `static mut` (requires unsafe) and `lazy_static!` with interior mutability not wrapped in `Mutex`/`RwLock` -- global mutable state in Rust defeats the borrow checker's guarantees
- [ ] **Go package-level variables**: flag `var` declarations at package scope that are written to by multiple functions or goroutines -- these are global mutable state regardless of Go's lack of a Singleton pattern
- [ ] **C/C++ file-scope statics with external mutation**: flag `static` variables in .c/.cpp files that are mutated by functions called from multiple translation units -- these are hidden global state even if not in a header

## Common False Positives

- **Framework-managed singletons**: DI containers (Spring `@Singleton`, Dagger `@Singleton`, .NET `AddSingleton`) manage lifecycle and enable substitution. When production code receives the instance via constructor injection and tests substitute it via DI configuration, the anti-pattern does not apply. Flag only when `getInstance()` is called directly.
- **Immutable singletons**: a singleton that is fully initialized at startup and never mutated afterward (configuration loaded once, locale constants, feature flag snapshot frozen at boot) is not global *mutable* state. Verify that no write methods exist before flagging.
- **Logger instances**: standard logging frameworks use singleton-like patterns. Logger state is append-only and idempotent. Do not flag standard logging unless the singleton *also* holds non-logging mutable state.
- **Application entry point wiring**: the main function or composition root that creates singletons and wires them into the dependency graph is not the anti-pattern -- it is the solution. Flag only if the singletons are accessed via `getInstance()` from deep within the call graph instead of being injected from the root.
- **Caches with proper lifecycle**: singletons managing caches are appropriate when the cache has eviction, TTL, size bounds, and the singleton is accessed through an injected interface rather than a static accessor. Flag only the access pattern, not the existence of a cache.
- **Thread-local state**: `ThreadLocal` (Java), `thread_local!` (Rust), and equivalent mechanisms provide per-thread isolation. These are not global shared state, though they can still cause test isolation issues.

## Severity Guidance

| Finding | Severity |
|---|---|
| Singleton storing per-request or per-user state in a globally shared instance | Critical |
| Static mutable field accessed from multiple threads with no synchronization | Critical |
| Singleton holding credentials, tokens, or secrets as mutable global state | Critical |
| 10+ classes calling getInstance() directly across unrelated packages | Important |
| Singleton with reset()/clear() method added for test isolation | Important |
| Module-level mutable dict/list imported and mutated by multiple files | Important |
| Singleton accumulating unrelated responsibilities (3+ domains) | Important |
| Singleton used as service locator (get(Class) or resolve(name)) | Important |
| Production code calling getInstance() in 3-5 classes within one package | Minor |
| Test using monkeypatch/reflection to override singleton for test doubles | Minor |
| Singleton with mutable cache but proper eviction and injected interface | Minor |
| Companion object holding mutable state for one tightly-scoped use case | Minor |

## See Also

- `pattern-singleton` -- checks singleton implementation correctness (thread safety, serialization, lazy init); this reviewer checks whether the singleton *should exist at all* as a state container
- `antipattern-god-object` -- singletons that accumulate unrelated responsibilities become god objects; the singleton access pattern accelerates this because adding a field is easier than creating a new injectable service
- `principle-coupling-cohesion` -- every direct getInstance() call is hidden coupling that does not appear in constructor signatures, making the dependency graph invisible
- `principle-encapsulation` -- singletons as global state break encapsulation by making internal state universally accessible
- `principle-solid` -- violates DIP (depending on concrete singleton class instead of an abstraction) and SRP (singleton accumulating responsibilities)
- `principle-immutability-by-default` -- if the singleton were immutable, most global-state concerns would disappear; mutability is the core of the anti-pattern
- `smell-primitive-obsession` -- module-level mutable dicts and lists used as registries are primitive-obsession singletons that should be proper types with enforced invariants

## Authoritative References

- [Miško Hevery, "Singletons are Pathological Liars" (blog, 2008)](http://misko.hevery.com/2008/08/17/singletons-are-pathological-liars/)
- [Miško Hevery, "Root Cause of Singletons" (blog, 2008) -- why singletons damage testability](http://misko.hevery.com/2008/08/25/root-cause-of-singletons/)
- [Mark Seemann, *Dependency Injection in .NET* (2nd ed., 2019), Chapter 5: "Anti-Patterns" -- Ambient Context and Service Locator](https://www.manning.com/books/dependency-injection-principles-practices-patterns)
- [Robert C. Martin, *Clean Architecture* (2017), Chapter 12: Components -- avoiding global dependencies and hidden coupling](https://www.oreilly.com/library/view/clean-architecture-a/9780134494272/)
- [Martin Fowler, "Inversion of Control Containers and the Dependency Injection pattern" (2004)](https://martinfowler.com/articles/injection.html)
- [Erich Gamma et al., *Design Patterns* (1994), Singleton -- the original pattern description, frequently cited as the most overused pattern](https://www.oreilly.com/library/view/design-patterns-elements/0201633612/)
