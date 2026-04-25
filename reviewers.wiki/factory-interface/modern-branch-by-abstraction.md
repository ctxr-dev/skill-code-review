---
id: modern-branch-by-abstraction
type: primary
depth_role: leaf
focus: Detect branch-by-abstraction failures where the abstraction layer is missing before an implementation swap, old implementations linger after stabilization, abstractions leak details, or feature toggles are absent for switching
parents:
  - index.md
covers:
  - Implementation swapped without introducing an abstraction layer first
  - Old implementation not removed after new implementation is stable and fully deployed
  - Abstraction layer leaks implementation-specific types, exceptions, or behaviors
  - Missing feature toggle to switch between old and new implementations at runtime
  - Abstraction interface shaped around old implementation rather than domain needs
  - New implementation not behind the same abstraction as the old one
  - Both implementations registered in the dependency injection container simultaneously without toggle
  - Abstraction introduced but callers still reference concrete implementations directly
  - "Bridge pattern confused with adapter (bridge is designed up-front, adapter is after-the-fact)"
  - "Bridge with only one implementor on each side (YAGNI -- no independent variation)"
  - "Abstraction and implementation hierarchies that do not vary independently (pattern not needed)"
  - Missing bridge where a class hierarchy explodes combinatorially
  - Bridge where the abstraction leaks implementation details through its API
  - "Bridge with implementations that share significant state with the abstraction (tight coupling)"
  - Over-engineered bridge for a single-platform, single-rendering scenario
  - Bridge implementation interface that is too broad or too narrow
  - Missing refined abstractions where the base abstraction handles all variation via conditionals
tags:
  - branch-by-abstraction
  - abstraction
  - refactoring
  - implementation-swap
  - feature-toggle
  - interface
  - dependency-inversion
  - bridge
  - structural-pattern
  - design-patterns
  - implementation
  - separation
  - platform
aliases:
  - pattern-bridge
activation:
  file_globs:
    - "**/interface*"
    - "**/abstract*"
    - "**/adapter*"
    - "**/impl*"
    - "**/provider*"
    - "**/strategy*"
    - "**/factory*"
  keyword_matches:
    - interface
    - abstract
    - implements
    - extends
    - adapter
    - provider
    - strategy
    - swap
    - replace
    - toggle
    - branch by abstraction
    - implementation
    - inject
    - bind
    - register
  structural_signals:
    - interface_introduction
    - implementation_swap
    - dual_implementation
    - dependency_injection
source:
  origin: file
  path: modern-branch-by-abstraction.md
  hash: "sha256:09f3d472daad1628b2d139993d77928f4d1d46e450d0eb1eb7841707aaf8a015"
---
# Branch by Abstraction

## When This Activates

Activates when diffs introduce abstraction layers (interfaces, abstract classes, strategy patterns), swap one implementation for another, register multiple implementations in a dependency injection container, or add feature toggles for implementation switching. Branch by Abstraction is the technique of introducing an abstraction layer around a component before replacing its implementation, so that the old and new implementations can coexist behind a stable interface and be switched via configuration rather than code changes. This reviewer flags skipped abstraction steps, leaked implementation details, missing toggles, and lingering dead implementations.

## Audit Surface

- [ ] Concrete implementation replaced inline without an intervening interface or abstract type
- [ ] Two implementations of the same contract coexist with no toggle to switch between them
- [ ] Interface or abstract class shaped by the old implementation's method signatures rather than domain semantics
- [ ] New implementation exposes methods not present on the abstraction
- [ ] Old implementation still wired in production after new implementation has been stable for 30+ days
- [ ] Feature toggle missing for runtime switching between old and new implementations
- [ ] Callers import concrete class instead of the abstraction
- [ ] Abstraction catches implementation-specific exceptions and re-throws them unwrapped
- [ ] Test suite tests only one implementation behind the abstraction, not both
- [ ] DI container binds both implementations without conditional resolution
- [ ] Rollback requires code change rather than toggle flip
- [ ] Abstraction has only one implementation and no plan for the second

## Detailed Checks

### Abstraction Layer Presence and Timing
<!-- activation: keywords=["interface", "abstract", "trait", "protocol", "contract", "swap", "replace", "refactor", "migrate"] -->

- [ ] **Missing abstraction before swap**: flag diffs that replace one concrete implementation with another without first introducing an interface or abstract type -- the swap should happen in two steps: (1) introduce abstraction and wire old implementation behind it, (2) add new implementation and switch
- [ ] **Abstraction introduced simultaneously with swap**: flag PRs that add an interface and immediately wire only the new implementation -- the old implementation should be behind the abstraction first so the interface is validated against the existing behavior
- [ ] **Callers still reference concrete types**: flag callers that import or depend on the concrete implementation class rather than the abstraction -- this coupling defeats the purpose of the abstraction layer
- [ ] **No plan for second implementation**: flag newly introduced abstractions with a single implementation and no documentation or ticket indicating the planned second implementation -- speculative abstractions without a migration plan are premature

### Abstraction Quality and Leakage
<!-- activation: keywords=["interface", "abstract", "return", "throw", "exception", "error", "type", "generic", "parameter"] -->

- [ ] **Implementation-shaped interface**: flag interfaces whose method signatures mirror the old implementation's API rather than expressing domain operations -- the abstraction should be shaped by what callers need, not by how the old system works
- [ ] **Leaking implementation types**: flag abstractions that expose implementation-specific types (e.g., a database cursor type, an HTTP library's response class) in their method signatures -- use domain types or standard library types
- [ ] **Leaking implementation exceptions**: flag abstractions that allow implementation-specific exceptions to propagate to callers -- the abstraction should catch vendor exceptions and translate them to domain-level errors
- [ ] **Extra methods on new implementation**: flag new implementations that add public methods not present on the abstraction interface -- callers using these methods are coupled to the concrete type and cannot switch back

### Feature Toggle for Implementation Switching
<!-- activation: keywords=["toggle", "flag", "feature", "switch", "config", "enable", "disable", "fallback", "provider", "bind", "inject", "resolve"] -->

- [ ] **Missing toggle**: flag dual-implementation setups with no feature flag or configuration to switch between them at runtime -- without a toggle, switching requires a code change and deployment
- [ ] **Toggle not wired to DI resolution**: flag feature toggles that exist in configuration but are not connected to the dependency injection or factory logic that selects the implementation -- the toggle has no effect
- [ ] **Rollback requires code change**: flag implementation swaps where reverting to the old implementation requires modifying source code rather than flipping a toggle or config value -- this makes rollback slow and risky
- [ ] **Toggle evaluates at startup only**: flag implementations where the toggle is read once at application startup with no ability to change at runtime -- runtime toggles enable instant rollback without restart

### Old Implementation Cleanup
<!-- activation: keywords=["old", "legacy", "deprecated", "remove", "delete", "cleanup", "dead", "unused", "previous", "original"] -->

- [ ] **Old implementation retained after stabilization**: flag old implementations that remain in the codebase after the new implementation has been the sole active path in production for 30+ days -- the old code is now dead weight
- [ ] **Old implementation still in DI container**: flag dependency injection configurations that still register the old implementation even though the toggle permanently selects the new one -- the registration is dead code
- [ ] **Tests still exercise only old implementation**: flag test suites that test only the old implementation while production runs the new one -- tests must cover what production uses
- [ ] **Partial cleanup**: flag PRs that remove the old implementation class but leave its tests, configuration entries, or factory branches behind -- cleanup must be complete

### Shared Test Suite for Both Implementations
<!-- activation: keywords=["test", "spec", "assert", "expect", "verify", "parameterized", "contract test", "interface test"] -->

- [ ] **No shared contract tests**: flag dual implementations without a shared test suite that runs the same assertions against both -- contract tests guarantee behavioral equivalence
- [ ] **Tests coupled to implementation**: flag tests that assert on implementation details (mock interactions, internal state) rather than observable behavior through the abstraction -- implementation-coupled tests break when swapping
- [ ] **New implementation undertested**: flag new implementations with significantly fewer tests than the old one -- coverage parity is needed before the toggle is flipped

## Common False Positives

- **Strategy pattern by design**: some systems permanently maintain multiple implementations behind a strategy interface (e.g., multiple payment processors, storage backends). Flag only when one is clearly marked for removal.
- **Adapter for third-party libraries**: adapter patterns around external libraries are permanent abstractions, not temporary migration scaffolding. Do not flag these as "old implementation not removed."
- **Interface extraction for testability**: introducing an interface solely for mocking in tests does not require a feature toggle or second implementation. Accept if the interface has one production implementation and test doubles.
- **Compile-time selection**: some languages select implementations at compile time (Rust traits with feature flags, C++ templates). The toggle is the build configuration, not a runtime flag.

## Severity Guidance

| Finding | Severity |
|---|---|
| Implementation swapped without introducing abstraction first | Critical |
| Callers reference concrete type instead of abstraction during migration | Critical |
| Old implementation retained 30+ days after new one is stable in production | Important |
| No feature toggle for switching between implementations | Important |
| Abstraction leaks implementation-specific types or exceptions | Important |
| Interface shaped by old implementation rather than domain needs | Important |
| No shared contract tests for both implementations | Important |
| Toggle exists but is not wired to DI resolution | Minor |
| New implementation has extra methods not on the abstraction | Minor |
| Tests exercise only old implementation while production uses new one | Minor |

## See Also

- `principle-solid` -- Dependency Inversion Principle requires depending on abstractions, which branch-by-abstraction enforces
- `principle-separation-of-concerns` -- the abstraction layer separates the "what" from the "how" during migration
- `principle-feature-flags-and-config` -- feature toggles are the mechanism for runtime switching between implementations
- `antipattern-lava-flow` -- old implementations left behind after migration become lava flow

## Authoritative References

- [Jez Humble & Dave Farley, "Continuous Delivery" (2010), Chapter 13: Branch by Abstraction](https://continuousdelivery.com/)
- [Martin Fowler, "BranchByAbstraction" (2014)](https://martinfowler.com/bliki/BranchByAbstraction.html)
- [Paul Hammant, "Branch by Abstraction" (2013)](https://trunkbaseddevelopment.com/branch-by-abstraction/)
- [Sam Newman, "Building Microservices" (2nd ed., 2021), Chapter 3: Splitting the Monolith](https://www.oreilly.com/library/view/building-microservices-2nd/9781492034018/)
