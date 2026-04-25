---
id: test-coverage-quality-not-quantity
type: primary
depth_role: leaf
focus: Detect high coverage masking weak assertions, coverage gaming, untested error paths, and neglected critical-path coverage
parents:
  - index.md
covers:
  - "Tests that execute code paths but make no meaningful assertions (assertion-free coverage)"
  - "Coverage inflated by testing trivial code (getters, setters, toString, equals/hashCode)"
  - "Error handling paths (catch blocks, fallback branches) not covered by any test"
  - Branch coverage significantly lower than line coverage indicating untested conditionals
  - Critical business logic paths not tested despite high overall coverage percentage
  - Coverage collected from integration or E2E tests masking absence of unit tests
  - Dead code appearing covered because it runs as a side effect of other tests
  - New code added without any corresponding test additions
  - Coverage thresholds met by quantity of trivial tests, not quality of meaningful ones
  - Mutation testing revealing surviving mutants in supposedly well-covered code
tags:
  - coverage
  - test-quality
  - assertion-quality
  - branch-coverage
  - mutation-testing
  - coverage-gaming
activation:
  file_globs:
    - "**/*"
  keyword_matches: []
  structural_signals:
    - Any code diff
source:
  origin: file
  path: test-coverage-quality-not-quantity.md
  hash: "sha256:0b2be3b1f29900dc49fe80f6abd4ec60bf73448f450af9a685dc6454b6a6b5c2"
---
# Test Coverage: Quality Not Quantity

## When This Activates

Always loaded. Coverage percentage is the most commonly gamed metric in software development. This reviewer distinguishes meaningful coverage (assertions that would catch real bugs) from hollow coverage (code exercised without verification). It flags diffs where new production code lacks tests and where existing tests provide a false sense of security.

## Audit Surface

- [ ] Test method executes production code but contains no assertion or only trivially true assertions
- [ ] Test suite for a class covers only getters/setters/constructors, not business methods
- [ ] Catch/except/rescue blocks in production code not exercised by any test
- [ ] Ternary or conditional branch where only one side is tested
- [ ] New production file has 0% test coverage
- [ ] Coverage report shows >90% line coverage but <60% branch coverage
- [ ] Test asserts only that no exception is thrown (smoke test) for complex logic
- [ ] Production code with cyclomatic complexity >10 tested by a single happy-path test
- [ ] Code coverage collected from a broad integration test, not targeted unit tests
- [ ] Mutation test report shows >20% surviving mutants in covered code
- [ ] Diff adds production code lines but no test file changes
- [ ] Guard clauses and early returns not exercised by any test case

## Detailed Checks

### Assertion-Free and Weak-Assertion Coverage
<!-- activation: keywords=["test", "assert", "expect", "should", "verify", "coverage", "@Test", "def test_", "it(", "func Test"] -->

- [ ] **No-assertion test**: test method calls production code and returns without any assertion -- this inflates coverage while verifying nothing; add assertions on return values, state changes, or side effects
- [ ] **Trivially true assertion**: test asserts `assertTrue(true)`, `expect(1).toBe(1)`, or `assertNotNull(result)` on a method that never returns null -- replace with assertions that would fail if the behavior regressed
- [ ] **Smoke-test-only coverage**: test calls a complex method and asserts only that it does not throw -- add assertions on the returned value or observable side effects
- [ ] **Assertion on mock setup**: test asserts on a value it configured the mock to return, verifying mock configuration rather than production logic
- [ ] **Coverage from logging or toString**: code path is covered only because a logging framework or debugger calls toString, not because a test exercises the logic intentionally

### Untested Error and Edge Paths
<!-- activation: keywords=["catch", "except", "error", "throw", "raise", "else", "default", "fallback", "guard", "return early", "if", "switch"] -->

- [ ] **Uncovered catch block**: production code has try-catch/try-except but no test forces the exception path -- error handling is the most defect-prone code and the least tested
- [ ] **Else-branch gap**: if-else or ternary where tests exercise only the truthy branch -- the falsy branch may contain the actual bug
- [ ] **Default/fallback untested**: switch/match default case or configuration fallback value never exercised by a test -- these are the paths that execute when assumptions fail
- [ ] **Guard clause not triggered**: early-return guard clauses in a function never hit by any test input -- guards exist to prevent invalid states and must be tested
- [ ] **Error message correctness untested**: error paths that construct user-facing error messages are exercised but the message content is not asserted

### Coverage of Critical Business Logic
<!-- activation: keywords=["service", "handler", "process", "calculate", "validate", "authorize", "payment", "billing", "order", "transfer", "schedule"] -->

- [ ] **New business logic without tests**: diff adds a method with business rules (validation, calculation, state transition) but the test file is unchanged -- require test additions proportional to logic complexity
- [ ] **Single happy-path test for complex logic**: method with multiple branches, edge cases, or state transitions is tested by a single test with typical input -- add boundary, error, and edge-case tests
- [ ] **Coverage from unrelated test**: a business method is "covered" because an integration test happens to invoke it transitively, not because a focused unit test targets it -- add a direct unit test
- [ ] **Refactored code with unchanged tests**: production code is significantly restructured but tests remain identical -- tests may no longer exercise the intended paths after refactoring

## Common False Positives

- **Generated code**: auto-generated DTOs, protobuf stubs, ORM entities may not warrant dedicated tests. Flag only when the generated code contains custom business logic.
- **Thin delegation layers**: a service method that delegates entirely to another well-tested method does not need its own deep test suite. Verify delegation is correct, not that the delegate works.
- **Framework-required boilerplate**: constructors, equals/hashCode on value objects, and toString may be covered by framework tests or tested indirectly through integration tests.
- **Intentional smoke tests**: some teams maintain a "canary" test that verifies a module loads without error. This is valid as a deployment gate, not as a substitute for behavioral tests.

## Severity Guidance

| Finding | Severity |
|---|---|
| New business logic (validation, auth, payment) added with zero test coverage | Critical |
| Test method with zero assertions inflating coverage metrics | Important |
| Error/catch path in production code with no test exercising it | Important |
| Coverage from integration test masking absence of focused unit tests for complex logic | Important |
| Only happy-path tested for method with cyclomatic complexity >10 | Important |
| Getter/setter-only test suite with no business method coverage | Minor |
| Branch coverage gap on non-critical utility code | Minor |
| Coverage drop in refactored code where tests still pass but paths shifted | Minor |

## See Also

- `test-unit-discipline` -- assertion-free tests also violate AAA structure
- `test-mutation` -- mutation testing is the strongest signal for weak assertions in covered code
- `principle-fail-fast` -- untested error paths often silently swallow errors
- `antipattern-flaky-non-deterministic-tests` -- flaky tests provide coverage numbers but unreliable signal
- `principle-dry-kiss-yagni` -- testing trivial code (getters/setters) is YAGNI applied to test effort

## Authoritative References

- [Martin Fowler, "Test Coverage" (2012) -- coverage is a tool for finding untested code, not a target](https://martinfowler.com/bliki/TestCoverage.html)
- [Brian Marick, "How to Misuse Code Coverage" (1999)](http://www.exampler.com/testing-com/writings/coverage.pdf)
- [Vladimir Khorikov, *Unit Testing Principles, Practices, and Patterns* (2020) -- the four pillars of a good test](https://www.manning.com/books/unit-testing)
- [Pitest / Stryker -- mutation testing as a coverage quality indicator](https://pitest.org/)
- [Google Testing Blog, "Code Coverage Best Practices" (2020)](https://testing.googleblog.com/2020/08/code-coverage-best-practices.html)
