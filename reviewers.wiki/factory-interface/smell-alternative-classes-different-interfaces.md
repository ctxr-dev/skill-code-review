---
id: smell-alternative-classes-different-interfaces
type: primary
depth_role: leaf
focus: Detect classes that serve the same role but expose different method names or signatures, preventing interchangeability.
parents:
  - index.md
covers:
  - "Two classes performing the same function with different method names (e.g., fetch vs. retrieve)"
  - Parallel implementations for different platforms with non-aligned APIs
  - Wrapper classes around similar third-party libraries with inconsistent interfaces
  - Duck-typed objects serving the same role that cannot be swapped without caller changes
  - Classes implementing the same concept with different parameter ordering or types
  - Provider or adapter classes with divergent method signatures despite equivalent purpose
  - Missing shared interface or protocol that would unify interchangeable classes
  - Copy-paste classes that drifted apart in naming but still do the same thing
  - Strategy implementations that cannot be used interchangeably due to interface mismatch
  - Service classes with equivalent capabilities but different method granularity
tags:
  - alternative-classes
  - code-smell
  - oo-abusers
  - interface
  - protocol
  - polymorphism
  - interchangeability
activation:
  file_globs:
    - "**/*.{java,kt,scala,cs,ts,js,py,rb,go,rs,swift,cpp,h,hpp,php}"
  keyword_matches:
    - class
    - interface
    - protocol
    - trait
    - adapter
    - wrapper
    - convert
    - compat
    - strategy
    - provider
    - impl
  structural_signals:
    - parallel_classes_with_different_method_names
    - provider_classes_without_shared_interface
    - wrapper_classes_with_inconsistent_apis
source:
  origin: file
  path: smell-alternative-classes-different-interfaces.md
  hash: "sha256:ee35df3564e6b0c88a676299027796dfaedc81a52cd13584d5a65bab327b4d1f"
---
# Alternative Classes with Different Interfaces

## When This Activates

Activates when diffs introduce or modify classes that serve the same role -- providers, adapters, strategies, wrappers, or platform-specific implementations -- but expose different method names, parameter signatures, or return types. The smell is about missed unification: two classes could be interchangeable behind a shared interface, but they cannot be swapped without modifying callers because their APIs diverged. This forces callers to know which concrete class they are using, defeating polymorphism and making it harder to add new alternatives.

## Audit Surface

- [ ] Classes serving the same role expose the same method names, not synonyms (get/fetch, send/dispatch)
- [ ] Classes wrapping different backends share a common interface with aligned method signatures
- [ ] Caller code does not use if/else or switch to adapt to different class APIs for the same operation
- [ ] Method names for equivalent operations are identical across alternative implementations
- [ ] Equivalent operations take the same parameter types in the same order across implementations
- [ ] A shared interface, protocol, or abstract base class unifies classes intended for the same role
- [ ] Adapter/wrapper classes expose a consistent API regardless of the underlying third-party library
- [ ] Duck-typed objects serving the same context have identical method sets for the shared role
- [ ] Test code does not duplicate initialization logic due to divergent APIs on equivalent classes
- [ ] Factory or DI configuration can select between implementations using a shared type
- [ ] Similarly named classes (XProvider, YProvider) have aligned method signatures
- [ ] Platform-specific implementations share an interface enforced at compile time or by tests
- [ ] Equivalent operations return the same types (or compatible types) across implementations
- [ ] Parameter ordering is consistent across alternative classes for the same operation
- [ ] Error handling strategy (exceptions vs. error codes vs. Result types) is consistent across alternatives

## Detailed Checks

### Synonym Method Names
<!-- activation: keywords=["get", "fetch", "retrieve", "find", "load", "send", "dispatch", "emit", "post", "create", "make", "build", "new", "delete", "remove", "destroy"] -->

- [ ] **Verb synonyms for same operation**: one class uses `fetchUser()`, another uses `getUser()`, a third uses `retrieveUser()` -- standardize on one verb for the shared interface
- [ ] **Noun variation**: `getPaymentMethod()` vs. `getPaymentInstrument()` for the same concept -- align the domain language across implementations
- [ ] **Prefix/suffix inconsistency**: `loadConfig()` vs. `configLoad()` or `getById()` vs. `findById()` -- method naming conventions diverge between classes with the same role
- [ ] **Method count mismatch for same capability**: one class exposes `save(entity)`, another splits into `validate(entity)` + `persist(entity)` -- different granularity for equivalent operations
- [ ] **Boolean naming inconsistency**: one class has `isEnabled()`, another has `checkEnabled()` or `enabled()` -- callers must know which variant they are working with

### Divergent Signatures for Same Operation
<!-- activation: keywords=["parameter", "argument", "return", "signature", "type", "order", "overload"] -->

- [ ] **Parameter order swapped**: `send(recipient, message)` in one class vs. `send(message, recipient)` in another -- swapped parameter order prevents interchangeability and causes subtle bugs
- [ ] **Different parameter types**: one implementation takes a string ID, another takes an integer ID, a third takes a typed ID object -- align on a single ID type or provide conversion
- [ ] **Return type mismatch**: one class returns `User`, another returns `Optional<User>`, a third returns `UserDTO` -- callers cannot treat them uniformly
- [ ] **Async vs. sync signature**: one implementation is synchronous (`User getUser()`), another returns a future/promise (`Future<User> getUser()`) -- unifying interface must pick one model
- [ ] **Extra parameters in one implementation**: one class requires `getUser(id, options)` while another only needs `getUser(id)` -- use default parameters or an options object to align
- [ ] **Different error types**: one throws `NotFoundException`, another throws `NoSuchElementException`, a third returns null -- callers cannot handle errors uniformly

### Missing Shared Interface
<!-- activation: keywords=["interface", "protocol", "trait", "abstract", "contract", "implements", "extends", "duck", "structural"] -->

- [ ] **No formal interface**: two classes serve the same role but neither implements a shared interface -- introduce one to enable polymorphic dispatch and DI
- [ ] **Interface exists but not used**: a shared interface was defined but one or more implementations do not declare it (missing `implements`/`extends`) -- callers reference concrete types instead
- [ ] **Implicit protocol (duck typing)**: in dynamically typed languages, two objects respond to overlapping but different method sets -- document and enforce the expected protocol with tests or type hints
- [ ] **Separate interface per implementation**: each implementation defines its own interface (`AwsStorageInterface`, `GcpStorageInterface`) instead of sharing `StorageInterface` -- defeats the purpose of abstraction
- [ ] **Interface drift**: a shared interface existed but one implementation added extra methods that callers now depend on -- the interface no longer represents the full contract
- [ ] **Generic replaced by concrete**: code was written against an interface but callers import the concrete class directly, bypassing the abstraction -- new alternatives cannot be substituted

### Wrapper/Adapter Inconsistency
<!-- activation: keywords=["adapter", "wrapper", "client", "sdk", "driver", "connector", "provider", "gateway", "bridge"] -->

- [ ] **Third-party wrapper divergence**: wrappers around AWS SDK, GCP SDK, Azure SDK expose different method names for equivalent operations (upload/put/store) -- internal code is coupled to the wrapper's arbitrary naming
- [ ] **Config initialization mismatch**: one wrapper takes a connection string, another takes structured config, a third reads from environment -- initialization API should be consistent
- [ ] **Inconsistent lifecycle management**: one wrapper has `connect()`/`disconnect()`, another has `open()`/`close()`, a third auto-connects -- callers cannot manage lifecycle uniformly
- [ ] **Error translation inconsistency**: one wrapper re-throws vendor exceptions, another wraps them in custom exceptions, a third swallows them -- error behavior diverges across alternatives
- [ ] **Missing adapter layer**: code directly uses two different third-party APIs for the same capability without an adapter normalizing them -- switching providers requires changing all call sites

### Platform-Specific Implementations
<!-- activation: keywords=["platform", "os", "android", "ios", "web", "aws", "gcp", "azure", "linux", "windows", "mac"] -->

- [ ] **Platform API naming divergence**: `AndroidNotificationService.push()` vs. `IosNotificationService.send()` vs. `WebNotificationService.notify()` -- same operation, three names
- [ ] **Capability asymmetry without interface**: one platform implementation supports batch operations, another does not, and there is no interface defining the common subset -- callers cannot write platform-agnostic code
- [ ] **Platform-specific types leaking**: one implementation returns `AndroidBitmap`, another returns `UIImage` -- the return types prevent abstraction; use a platform-neutral type
- [ ] **Feature detection divergence**: one platform class has `isSupported()`, another has `canDo()`, a third requires try/catch -- align capability-checking API
- [ ] **No compile-time enforcement**: platform implementations are selected at runtime but share no compile-time interface -- adding a new platform has no type-system guidance for which methods to implement

## Common False Positives

- **Intentionally different APIs for different concerns**: two classes may share some structural similarity but serve genuinely different purposes (e.g., `UserRepository` and `UserCache` both have "get by ID" but have different semantics for staleness, writes, etc.). Do not force a shared interface if the contracts differ.
- **Adapter pattern in progress**: a diff may introduce a wrapper for one third-party library as the first step before aligning others. Flag only if the project has multiple wrappers that have been inconsistent for a long time.
- **Language-idiomatic naming**: in some languages, `get` is conventional (Java), while `fetch` is conventional for async operations (JavaScript). Cross-language inconsistency in polyglot projects may be intentional.
- **Versioned APIs**: `V1Client` and `V2Client` may have different interfaces because they wrap different API versions. The difference is intentional; flag only if they should be interchangeable.
- **Read vs. write interfaces**: `UserReader` and `UserWriter` are intentionally different interfaces following CQRS. Do not flag as "alternative classes."
- **Different abstraction levels**: a low-level `HttpClient` and a high-level `ApiClient` serve different abstraction layers. They are not alternatives despite overlapping capabilities.

## Severity Guidance

| Finding | Severity |
|---|---|
| Two implementations of a core service have different APIs and callers use if/else to adapt | high |
| Platform-specific implementations have no shared interface and a new platform is being added | high |
| Method parameter order is swapped between two interchangeable classes (bug-prone) | high |
| Provider classes serving the same role use synonym method names (fetch/get/retrieve) | medium |
| Third-party wrappers expose inconsistent APIs for the same underlying operation | medium |
| Return types differ across implementations for the same operation | medium |
| Error handling strategy (throw vs. return error) differs across alternative classes | medium |
| Shared interface exists but one implementation has drifted, adding extra methods | medium |
| Duck-typed objects have mostly-overlapping but not identical method sets | medium |
| Minor naming inconsistency in internal utility classes rarely used polymorphically | low |
| Classes with similar names but genuinely different purposes (false positive candidate) | low |

## See Also

- `principle-solid` -- ISP drives splitting over-broad interfaces into focused ones that alternative classes can share; DIP ensures callers depend on the shared abstraction, not concrete implementations
- `principle-encapsulation` -- alternative classes with different interfaces leak implementation details (vendor naming, platform types) through their API surface
- `pattern-adapter` -- the adapter pattern is the primary remedy: wrap divergent implementations behind a common interface
- `pattern-strategy` -- once alternative classes share an interface, they become interchangeable strategies
- `principle-composition-over-inheritance` -- composition with a shared interface is preferred over parallel class hierarchies that drift apart

## Authoritative References

- [Martin Fowler, *Refactoring* (2nd ed., 2018), Alternative Classes with Different Interfaces smell](https://refactoring.com/)
- [Martin Fowler, *Refactoring* (2nd ed., 2018), Rename Method](https://refactoring.com/catalog/renameMethod.html)
- [Martin Fowler, *Refactoring* (2nd ed., 2018), Move Method](https://refactoring.com/catalog/moveFunction.html)
- [Robert C. Martin, *Clean Code* (2008), Chapter 10: Classes -- organizing for change](https://www.oreilly.com/library/view/clean-code/9780136083238/)
- [Erich Gamma et al., *Design Patterns* (1994), Adapter pattern](https://www.oreilly.com/library/view/design-patterns-elements/0201633612/)
