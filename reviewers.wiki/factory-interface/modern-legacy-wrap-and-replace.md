---
id: modern-legacy-wrap-and-replace
type: primary
depth_role: leaf
focus: Detect wrap-and-replace failures where the wrapper adds behavior beyond pure delegation, does not match the original interface, is tested in isolation from the original, the replacement diverges functionally, or integration tests at the seam are missing
parents:
  - index.md
covers:
  - Wrapper adds business logic, validation, or transformation instead of pure delegation
  - "Wrapper does not match the original component's interface signature"
  - Wrapper tested only against itself, not verifying equivalence with original behavior
  - Replacement implementation not functionally equivalent to the original
  - "Missing integration tests covering the boundary (seam) between wrapper and wrapped component"
  - Wrapper silently changes error handling or exception semantics
  - Wrapper introduces side effects not present in the original
  - Multiple wrappers stacked without clear layering rationale
tags:
  - wrap-and-replace
  - wrapper
  - delegation
  - legacy
  - seam
  - refactoring
  - adapter
  - facade
  - equivalence
activation:
  file_globs:
    - "**/wrapper*"
    - "**/wrap*"
    - "**/adapter*"
    - "**/facade*"
    - "**/proxy*"
    - "**/shim*"
    - "**/compat*"
    - "**/legacy*"
  keyword_matches:
    - wrapper
    - wrap
    - delegate
    - forward
    - proxy
    - shim
    - adapter
    - facade
    - original
    - legacy
    - replace
    - seam
    - compat
  structural_signals:
    - delegation_pattern
    - wrapper_class
    - adapter_pattern
    - facade_pattern
source:
  origin: file
  path: modern-legacy-wrap-and-replace.md
  hash: "sha256:c224517f5fd2851b01b9721e2663826c1f0cb694932e52baf667291f0d85af9d"
---
# Legacy Wrap and Replace

## When This Activates

Activates when diffs introduce wrapper classes, adapter layers, facade functions, or shim modules around existing components, particularly when the intent is to eventually replace the wrapped component. Wrap-and-replace is the technique of inserting a thin delegation layer around a legacy component, migrating all callers to use the wrapper, and then replacing the wrapper's internals with a new implementation. This reviewer flags wrappers that violate pure delegation (adding logic, changing interfaces, altering error semantics), replacements that diverge from original behavior, and missing tests at the seam.

## Audit Surface

- [ ] Wrapper function or class contains conditional logic beyond delegation
- [ ] Wrapper method signature differs from the original's interface
- [ ] Wrapper catches and transforms exceptions from the original
- [ ] Wrapper adds caching, logging, or metrics not present in the original
- [ ] Tests for wrapper mock the original instead of calling through to it
- [ ] Replacement has different return types or error codes than the original
- [ ] No integration test exercises the seam between caller and wrapper
- [ ] Wrapper modifies input parameters before delegating
- [ ] Wrapper modifies return values after delegation
- [ ] Multiple nested wrappers around the same component
- [ ] Wrapper swallows exceptions from the original and returns defaults
- [ ] Original component's tests not re-run against the replacement

## Detailed Checks

### Pure Delegation Enforcement
<!-- activation: keywords=["wrapper", "wrap", "delegate", "forward", "call", "invoke", "pass", "proxy", "through"] -->

- [ ] **Logic in wrapper**: flag wrapper functions or classes that contain conditional logic (`if`, `switch`, `match`), data transformation, validation, or computation beyond directly calling the wrapped component -- wrappers must be pure delegation during the wrapping phase; behavior changes come later during the replacement phase
- [ ] **Input modification**: flag wrappers that transform, filter, or augment input parameters before passing them to the original -- callers expect the same contract; input modification changes that contract silently
- [ ] **Output modification**: flag wrappers that transform, filter, or augment return values from the original before returning to callers -- output modification means callers get different behavior from the wrapper than from the original
- [ ] **Side effects added**: flag wrappers that introduce side effects (logging, metrics, caching, event emission) not present in the original -- while these are often desirable, they must be introduced explicitly as a separate concern, not smuggled in during the wrapping phase
- [ ] **Exception transformation**: flag wrappers that catch exceptions from the original and re-throw different exception types, return error codes, or return default values -- callers relying on specific exception types will break

### Interface Fidelity
<!-- activation: keywords=["interface", "signature", "parameter", "return", "type", "method", "function", "arg", "override"] -->

- [ ] **Signature mismatch**: flag wrappers whose method signatures differ from the original's interface in parameter count, parameter types, return type, or optionality -- the wrapper must be a drop-in replacement for the original at the call site
- [ ] **Missing methods**: flag wrapper classes that expose only a subset of the original's public interface -- callers using the omitted methods will break when migrated to the wrapper
- [ ] **Extra methods**: flag wrappers that add new public methods not present on the original -- these methods couple callers to the wrapper rather than the abstraction, complicating the eventual replacement
- [ ] **Changed nullability or optionality**: flag wrappers that accept null where the original did not, or reject null where the original accepted it -- nullability changes are contract changes

### Testing the Seam
<!-- activation: keywords=["test", "spec", "assert", "expect", "mock", "stub", "integration", "seam", "verify", "equivalence"] -->

- [ ] **Wrapper tested with mocked original**: flag tests for the wrapper that mock or stub the wrapped component instead of calling through to it -- these tests verify the wrapper's delegation code, not that the wrapper behaves identically to the original
- [ ] **No integration test at the seam**: flag the boundary between callers and the wrapper without an integration test verifying end-to-end behavior -- the seam is the highest-risk point for behavioral divergence
- [ ] **Original's test suite not run against wrapper**: flag replacement wrappers without running the original component's existing test suite against the wrapper -- if the original's tests pass against the wrapper, behavioral equivalence is validated
- [ ] **No characterization tests**: flag wrapping of a poorly-tested legacy component without first writing characterization tests that document the original's actual behavior (including edge cases and error conditions) -- without characterization tests, behavioral divergence in the replacement goes undetected

### Replacement Equivalence
<!-- activation: keywords=["replace", "swap", "new", "implementation", "rewrite", "equivalent", "same", "behavior", "migrate", "cutover"] -->

- [ ] **Functional divergence**: flag replacement implementations that produce different results for the same inputs compared to the original -- functional equivalence must be verified before callers are migrated
- [ ] **Changed error behavior**: flag replacements that return success where the original returned an error, or vice versa -- error behavior is part of the contract
- [ ] **Changed performance characteristics**: flag replacements with significantly different latency, memory usage, or throughput characteristics without documentation -- callers may depend on performance properties
- [ ] **Incomplete replacement**: flag replacements that handle the happy path but do not handle error cases, edge cases, or boundary conditions that the original handled -- partial replacements cause subtle regressions

### Wrapper Layering and Lifecycle
<!-- activation: keywords=["wrapper", "wrap", "layer", "nested", "stack", "chain", "multiple", "decorator", "remove", "unwrap"] -->

- [ ] **Stacked wrappers**: flag multiple nested wrappers around the same component (wrapper around wrapper around original) -- each layer adds indirection, latency, and cognitive load; consolidate into a single wrapper
- [ ] **Wrapper outlived its purpose**: flag wrappers that were introduced for migration but the migration is complete and the wrapper has not been inlined or removed -- post-migration wrappers are dead indirection
- [ ] **Wrapper as permanent fixture**: flag wrappers documented as "temporary for migration" that have existed for 6+ months without the wrapped component being replaced -- the wrapper has become permanent accidental complexity

## Common False Positives

- **Decorator pattern**: decorators intentionally add behavior (caching, logging, authorization) on top of a component. This is not a delegation purity violation if the intent is decoration rather than migration wrapping. Verify the stated purpose.
- **Adapter pattern for third-party libraries**: adapters around external libraries intentionally translate interfaces and are permanent, not temporary migration scaffolding.
- **Middleware**: HTTP middleware, message handlers, and pipeline stages are designed to intercept and modify requests/responses. These are not migration wrappers.
- **Test doubles**: mock objects, stubs, and fakes are intentional wrappers for testing. They are not subject to delegation purity rules.

## Severity Guidance

| Finding | Severity |
|---|---|
| Wrapper silently changes error handling or exception semantics | Critical |
| Replacement produces different results than original for same inputs | Critical |
| Wrapper method signature does not match original's interface | Critical |
| Wrapper contains conditional business logic beyond delegation | Important |
| No integration test at the seam between caller and wrapper | Important |
| Original's test suite not run against replacement | Important |
| Wrapper modifies inputs or outputs during delegation | Important |
| Tests mock the original instead of calling through | Important |
| Stacked wrappers (wrapper around wrapper) | Minor |
| Wrapper adds logging or metrics not in original | Minor |
| Wrapper exists 6+ months after migration declared complete | Minor |

## See Also

- `modern-branch-by-abstraction` -- branch-by-abstraction uses an interface; wrap-and-replace uses direct delegation without requiring an interface
- `principle-solid` -- Liskov Substitution Principle demands the wrapper be substitutable for the original
- `principle-separation-of-concerns` -- the wrapper must not conflate delegation with new behavior
- `antipattern-lava-flow` -- wrappers left after migration harden into lava flow

## Authoritative References

- [Michael Feathers, "Working Effectively with Legacy Code" (2004), Chapter 9: Seams and Wrappers](https://www.oreilly.com/library/view/working-effectively-with/0131177052/)
- [Martin Fowler, "Refactoring" (2nd ed., 2018), "Wrap Function" and "Wrap Class"](https://refactoring.com/catalog/)
- [Sam Newman, "Building Microservices" (2nd ed., 2021), Chapter 3: Splitting the Monolith](https://www.oreilly.com/library/view/building-microservices-2nd/9781492034018/)
- [Joshua Kerievsky, "Refactoring to Patterns" (2004), "Move Embellishment to Decorator"](https://www.oreilly.com/library/view/refactoring-to-patterns/0321213351/)
