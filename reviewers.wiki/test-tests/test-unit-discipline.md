---
id: test-unit-discipline
type: primary
depth_role: leaf
focus: Enforce Arrange-Act-Assert structure, single-behavior assertions, clear naming, independence, and absence of logic in unit tests
parents:
  - index.md
covers:
  - "Test body not structured as Arrange-Act-Assert (or Given-When-Then)"
  - Multiple unrelated assertions in a single test verifying more than one behavior
  - Test name does not describe the scenario and expected outcome
  - Tests that depend on execution order or shared mutable state
  - "Conditional logic (if/else, try/catch, loops) inside test bodies"
  - Assertions inside loops without clarity on which iteration failed
  - "Test that tests nothing (no assertion, no expected exception)"
  - Magic values in assertions without explanation of their significance
  - Test coupling to implementation details rather than observable behavior
  - Test setup that is longer than the actual assertion, indicating wrong abstraction level
tags:
  - unit-test
  - aaa-pattern
  - test-naming
  - test-independence
  - test-discipline
  - assertions
activation:
  file_globs:
    - "**/*"
  keyword_matches: []
  structural_signals:
    - Any code diff
source:
  origin: file
  path: test-unit-discipline.md
  hash: "sha256:d4dac6c15173bdefe973c257447cc48f1bfa82e7765d7269dd9dd6f3821d0252"
---
# Unit Test Discipline

## When This Activates

Always loaded. Every diff should be checked for unit test quality regardless of whether the diff touches test files directly. Production code added without corresponding tests is also in scope. Well-structured unit tests are the foundation of a trustworthy test suite; undisciplined tests create maintenance burden and false confidence.

## Audit Surface

- [ ] Test body lacks clear separation into setup, action, and assertion phases
- [ ] Single test method contains assertions on unrelated behaviors
- [ ] Test name is generic (test1, testMethod, should_work) or does not state expected outcome
- [ ] Test reads or writes class-level / static mutable state without isolation
- [ ] Test body contains if/else, switch, or ternary branching
- [ ] Test body contains try/catch used to assert non-exception paths
- [ ] Test body contains a loop that runs assertions (for/while over assert)
- [ ] Test method has no assertion and no expected-exception annotation
- [ ] Hardcoded magic numbers or strings in assertions with no explanatory variable or comment
- [ ] Test calls private methods or accesses private fields via reflection
- [ ] Test asserts on internal state (field values) instead of observable output or side effects
- [ ] Excessive setup lines (>15) in a single test suggesting integration-level scope

## Detailed Checks

### Arrange-Act-Assert Structure
<!-- activation: keywords=["test", "it(", "describe", "spec", "expect", "assert", "should", "@Test", "def test_", "func Test", "#[test]"] -->

- [ ] **Missing separation**: test body runs setup, action, and assertions in an interleaved stream -- restructure into distinct Arrange, Act, Assert (or Given-When-Then) phases with blank-line separation
- [ ] **Multiple acts**: test performs more than one state-changing action before asserting -- split into separate tests, each exercising one behavior
- [ ] **Assert before act**: assertions placed before the action under test, typically leftover from copy-paste -- reorder so assertions follow the action
- [ ] **No act at all**: test arranges data and asserts on it without invoking the unit under test -- the test verifies test setup, not production behavior
- [ ] **Arrange dominance**: setup phase is 80%+ of the test body, suggesting the test is at the wrong abstraction level or needs a test builder/factory

### Test Naming and Intent
<!-- activation: keywords=["test", "it(", "describe", "should", "when", "given", "then", "expect", "@DisplayName"] -->

- [ ] **Opaque name**: test named `test1`, `testFoo`, `shouldWork`, or a method name echo (`testProcess`) -- rename to describe scenario and expected outcome (e.g., `returns_empty_list_when_filter_matches_nothing`)
- [ ] **Missing negative cases**: all tests are happy-path; no test names indicate error, edge, or boundary scenarios -- add tests for invalid input, empty input, boundary values
- [ ] **Name contradicts body**: test name says "throws exception" but body asserts a return value, or vice versa -- align name with actual assertion
- [ ] **Inconsistent convention**: test file mixes naming conventions (camelCase, snake_case, BDD-style) -- standardize per project convention

### No Logic in Tests
<!-- activation: keywords=["if", "else", "switch", "case", "for", "while", "try", "catch", "&&", "||", "?"] -->

- [ ] **Conditional assertion**: test contains `if (condition) { assert X } else { assert Y }` -- this is two tests masquerading as one; split them
- [ ] **Loop-driven assertions**: test iterates a collection and asserts inside the loop -- if the collection is empty the test passes vacuously; use parameterized tests or assert on the collection as a whole
- [ ] **Try-catch for expected exceptions**: test wraps the act in try-catch and asserts in the catch block -- use the framework's expected-exception mechanism (`assertThrows`, `expect().toThrow()`, `pytest.raises`)
- [ ] **Computed expected values**: test recalculates the expected value using the same logic as production code -- this tests nothing; use a literal expected value derived from specification

### Test Independence and Isolation
<!-- activation: keywords=["static", "global", "shared", "beforeAll", "beforeClass", "@BeforeAll", "setUp", "tearDown", "order", "depends", "sequence"] -->

- [ ] **Order dependence**: test assumes a specific execution order (e.g., testA creates data, testB reads it) -- each test must arrange its own preconditions
- [ ] **Shared mutable fixture**: tests share a mutable object initialized in `beforeAll`/`@BeforeClass` and one test mutates it -- use `beforeEach`/`@BeforeEach` or deep-copy the fixture
- [ ] **Database or file leakage**: test writes to a shared resource and does not clean up, affecting subsequent tests -- wrap in a transaction or use per-test temp resources
- [ ] **Singleton pollution**: test modifies a singleton (config, registry, cache) without restoring it -- isolate via dependency injection or reset in teardown

## Common False Positives

- **Parameterized / data-driven tests**: frameworks like `@ParameterizedTest`, `pytest.mark.parametrize`, `it.each` intentionally run the same assertion with multiple inputs. This is not "multiple behaviors in one test."
- **Builder-pattern setup**: a fluent builder in the arrange phase may look like excessive setup but is a single logical operation creating a test fixture.
- **Assertion libraries with chaining**: `expect(x).to.be.an('array').that.includes(42).and.has.length(3)` is a single logical assertion on one value, not multiple unrelated assertions.
- **Integration tests in a unit test file**: some projects co-locate integration tests. Flag only if the file is clearly a unit test file and the test requires external infrastructure.

## Severity Guidance

| Finding | Severity |
|---|---|
| Test method with zero assertions and no expected-exception annotation | Critical |
| Conditional logic (if/else) hiding untested branches inside a test | Important |
| Multiple unrelated behaviors asserted in a single test | Important |
| Test depends on execution order of other tests | Important |
| Test name does not describe scenario or expected outcome | Minor |
| Magic values in assertions without explanatory context | Minor |
| Arrange phase exceeds 15 lines but behavior is correct | Minor |

## See Also

- `antipattern-flaky-non-deterministic-tests` -- undisciplined tests with shared state are the leading cause of flakiness
- `principle-fail-fast` -- tests with no assertions silently pass, violating fail-fast
- `principle-dry-kiss-yagni` -- over-extracted test helpers can obscure test intent; keep tests readable even if slightly repetitive
- `principle-separation-of-concerns` -- test logic mixed with setup and assertion logic harms readability
- `test-doubles-and-isolation` -- mock hygiene is a prerequisite for true test independence
- `test-coverage-quality-not-quantity` -- passing tests without meaningful assertions inflate coverage without value

## Authoritative References

- [Gerard Meszaros, *xUnit Test Patterns* (2007) -- Arrange-Act-Assert, Test Smells, and Principles of Test Automation](http://xunitpatterns.com/)
- [Kent Beck, *Test-Driven Development: By Example* (2002) -- isolated, repeatable, self-checking tests](https://www.oreilly.com/library/view/test-driven-development/0321146530/)
- [Roy Osherove, *The Art of Unit Testing* (3rd ed., 2024) -- naming conventions, single assert per test, trustworthy tests](https://www.manning.com/books/the-art-of-unit-testing-third-edition)
- [Vladimir Khorikov, *Unit Testing Principles, Practices, and Patterns* (2020) -- testing observable behavior, not implementation details](https://www.manning.com/books/unit-testing)
