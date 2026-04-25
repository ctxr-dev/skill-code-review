---
id: test-characterization
type: primary
depth_role: leaf
focus: Ensure characterization tests for legacy code are properly labeled, document pinned behavior, and are not mistaken for specification tests
parents:
  - index.md
covers:
  - Legacy code without any tests covered by characterization tests that pin existing behavior
  - Characterization tests not labeled or tagged as such, creating confusion with specification tests
  - Behavior pinned by characterization test without understanding whether it is correct or a bug
  - Characterization test that asserts on implementation details rather than observable behavior
  - Characterization test retained after the code has been refactored and proper specification tests added
  - No plan to replace characterization tests with specification tests over time
  - Characterization test for generated or third-party code that should not be pinned
  - Over-reliance on characterization tests delaying proper understanding of legacy behavior
  - "Characterization test covering too much scope (entire workflow) instead of individual units"
tags:
  - characterization-test
  - legacy-code
  - pinning-test
  - approval-test
  - golden-master
  - refactoring-safety-net
activation:
  file_globs:
    - "**/*characterization*"
    - "**/*Characterization*"
    - "**/*pinning*"
    - "**/*legacy*test*"
    - "**/*approval*"
    - "**/*golden*master*"
    - "**/*test*"
    - "**/*spec*"
  keyword_matches:
    - characterization
    - pinning
    - legacy
    - existing behavior
    - current behavior
    - golden master
    - approval
    - documents behavior
    - pins behavior
    - safety net
    - refactor
  structural_signals:
    - characterization_test_annotation
    - legacy_code_test
    - pinning_test
source:
  origin: file
  path: test-characterization.md
  hash: "sha256:08bd6ae0aa7c745cadb5fa94e033839e71042ccce48c2aee7c33f4e73c1b9064"
---
# Characterization Tests

## When This Activates

Activates when the diff adds tests for pre-existing legacy code, modifies legacy code that has characterization tests, or when test files contain signals of behavior-pinning intent (comments mentioning "current behavior", "existing behavior", or "safety net"). Characterization tests are a legitimate tool for safe refactoring of legacy code, but they must be clearly labeled, intentionally scoped, and treated as temporary -- not as a permanent substitute for specification tests that verify intended behavior.

## Audit Surface

- [ ] Test added for existing (not new) code that asserts on current behavior without verifying correctness
- [ ] Test file or test method missing @Tag('characterization'), @Category, or naming convention indicating characterization purpose
- [ ] Test comment says 'pins current behavior' or 'documents existing behavior' but the test is in the main test suite without distinction
- [ ] Characterization test asserts on internal state, log output, or side effects rather than public API output
- [ ] Characterization test retained for code that has been fully refactored with new specification tests
- [ ] Large characterization test covering an entire workflow instead of individual functions
- [ ] No documentation of whether the pinned behavior is known-correct, known-buggy, or unknown
- [ ] Characterization test for third-party library behavior that should be a contract test instead
- [ ] Characterization test suite growing without a corresponding plan to replace with specification tests
- [ ] Diff modifies legacy code covered by characterization tests but does not update the tests

## Detailed Checks

### Labeling and Identification
<!-- activation: keywords=["characterization", "pinning", "legacy", "safety net", "existing behavior", "current behavior", "tag", "category", "label"] -->

- [ ] **Missing label**: test pins existing behavior but is not tagged (`@Tag("characterization")`, `@Category(CharacterizationTest.class)`, naming convention like `*_characterization_test`) -- unlabeled characterization tests are indistinguishable from specification tests and create false confidence
- [ ] **Mixed in main suite**: characterization tests are in the same directory and run in the same suite as specification tests -- separate them so they can be run, reported, and sunset independently
- [ ] **No intent comment**: test asserts on legacy behavior without a comment explaining why (e.g., "Pinning current behavior before refactoring payment module; correctness TBD") -- future maintainers cannot distinguish intentional pins from lazy tests
- [ ] **Missing correctness annotation**: pinned behavior is not annotated as known-correct, known-buggy, or unknown -- when the refactoring happens, the team will not know which assertions to trust

### Scope and Granularity
<!-- activation: keywords=["workflow", "end-to-end", "integration", "unit", "function", "method", "class", "module", "scope"] -->

- [ ] **Workflow-level pinning**: characterization test covers an entire multi-step workflow instead of individual functions -- broad tests are fragile and hard to update; pin at the smallest unit possible
- [ ] **Internal state assertion**: test asserts on private fields, log output, or database state rather than public API return values -- implementation-detail assertions break during refactoring, defeating the test's purpose
- [ ] **Over-specified assertions**: test asserts on exact string formatting, whitespace, or incidental output details -- use structural assertions or approval tests with normalization to tolerate irrelevant changes
- [ ] **Third-party behavior pinning**: test characterizes the behavior of a third-party library -- this should be a contract test or an integration test, not a characterization test; the library's behavior is not yours to pin

### Lifecycle and Sunset
<!-- activation: keywords=["refactor", "replace", "migrate", "sunset", "remove", "deprecate", "specification", "spec", "TODO", "FIXME", "temporary"] -->

- [ ] **Retained past refactoring**: legacy code has been fully refactored with new specification tests, but the old characterization tests remain -- remove or archive characterization tests once specification tests cover the same behavior
- [ ] **No sunset plan**: characterization test suite is growing but there is no documented plan (TODO, ticket, or roadmap) to replace them with specification tests -- characterization tests are technical debt; track them
- [ ] **Growing without bound**: every legacy code change adds more characterization tests without converting existing ones -- set a policy to convert N existing characterization tests for each new one added
- [ ] **Stale characterization test**: pinned behavior has changed but the characterization test was updated to match the new behavior without investigation -- the test should have been reviewed to determine if the behavior change is correct

### Relationship to Other Test Types
<!-- activation: keywords=["specification", "unit", "contract", "approval", "golden", "snapshot", "regression"] -->

- [ ] **Masquerading as specification test**: test is written like a specification test (descriptive name, clear assertions) but actually just records observed behavior without verifying correctness -- label it honestly
- [ ] **Duplicate of existing spec test**: characterization test asserts the same behavior as an existing specification test -- remove the duplicate
- [ ] **Could be a property test**: characterized behavior has a mathematical or structural property (idempotency, symmetry, invariant) -- a property test would be more expressive and robust
- [ ] **Could be an approval/snapshot test**: characterized behavior produces complex output better captured by approval testing tools (ApprovalTests, Verify) than by manual assertions

## Common False Positives

- **Regression tests**: a test that was written alongside the original code to specify intended behavior is not a characterization test, even if it tests old code. Characterization tests are written after the fact to pin unknown behavior.
- **Approval tests by design**: some teams use approval testing as their primary testing strategy, not as a characterization technique. Flag only when the approval test is labeled or commented as temporary.
- **Test for bug compatibility**: some code intentionally preserves buggy behavior for backward compatibility. A test pinning this behavior is valid and should document the bug it preserves.
- **Snapshot tests**: not all snapshot tests are characterization tests. Snapshot tests for new code are specification tests that happen to use snapshot assertions.

## Severity Guidance

| Finding | Severity |
|---|---|
| Characterization test retained after full refactoring with specification tests already in place | Important |
| Characterization test not labeled or tagged, mixed into specification test suite | Important |
| Legacy code modified but covering characterization tests not updated | Important |
| No documentation of whether pinned behavior is correct, buggy, or unknown | Minor |
| Characterization test suite growing without a sunset plan | Minor |
| Workflow-level characterization test where unit-level would suffice | Minor |
| Characterization test asserts on internal state rather than public API | Minor |

## See Also

- `test-unit-discipline` -- specification tests should follow AAA; characterization tests should too, but their assertions reflect observed, not intended, behavior
- `test-snapshot-and-golden-file` -- golden master tests are a form of characterization testing with snapshot tooling
- `principle-dry-kiss-yagni` -- retaining characterization tests past their usefulness is dead code
- `principle-separation-of-concerns` -- characterization tests that pin entire workflows mix concerns

## Authoritative References

- [Michael Feathers, *Working Effectively with Legacy Code* (2004), Chapter 13: "Characterization Tests"](https://www.oreilly.com/library/view/working-effectively-with/0131177052/)
- [Emily Bache, *The Coding Dojo Handbook* (2013) -- approval testing as characterization](https://leanpub.com/codingdojohandbook)
- [ApprovalTests -- approval testing for characterization across languages](https://approvaltests.com/)
- [Martin Fowler, "Characterization Testing" (2014)](https://martinfowler.com/bliki/CharacterizationTest.html)
