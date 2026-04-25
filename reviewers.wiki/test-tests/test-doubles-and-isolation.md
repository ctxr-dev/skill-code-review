---
id: test-doubles-and-isolation
type: primary
depth_role: leaf
focus: Detect over-mocking, mock behavior divergence from real implementations, spy overuse, and missing verification on mock interactions
parents:
  - index.md
covers:
  - Mocking code you own instead of refactoring for testability
  - Mock behavior diverging from the real implementation it replaces
  - "Spy overuse: verifying internal method calls instead of observable outcomes"
  - "Missing verify() on mock interactions that are the whole point of the test"
  - Test doubles for third-party libraries without contract tests to ensure fidelity
  - "Deep mock chains (when().thenReturn() on mock.method().subMethod()) creating brittle tests"
  - "Partial mocks (@Spy, partial()) that test a mix of real and fake behavior"
  - "Mock setup that is longer than the test's assertion phase"
  - Mocking value objects, DTOs, or data classes that could be constructed directly
  - Static method mocking as a workaround for untestable design
  - "Mock returning mock (mock nesting) making tests incomprehensible"
  - Reset or re-stub of mocks mid-test indicating the test does too much
tags:
  - mocking
  - test-doubles
  - stub
  - spy
  - fake
  - mock-discipline
  - over-mocking
  - test-isolation
  - verification
activation:
  file_globs:
    - "**/*test*"
    - "**/*spec*"
    - "**/*Test*"
    - "**/*Spec*"
    - "**/__tests__/**"
    - "**/tests/**"
  keyword_matches:
    - mock
    - Mock
    - stub
    - Stub
    - spy
    - Spy
    - fake
    - Fake
    - "when("
    - thenReturn
    - "returns("
    - mockReturnValue
    - jest.mock
    - jest.fn
    - sinon
    - unittest.mock
    - patch
    - MagicMock
    - Mockito
    - verify
    - assert_called
    - "expect(mock"
    - toHaveBeenCalled
    - mockImplementation
  structural_signals:
    - mock_setup
    - verify_interaction
    - stub_configuration
    - spy_creation
source:
  origin: file
  path: test-doubles-and-isolation.md
  hash: "sha256:b7232f58b10159dddd29297adaecea46a419413f9bfbeb73e27f67e2739e944e"
---
# Test Doubles and Isolation

## When This Activates

Activates when the diff adds or modifies test files containing mocks, stubs, spies, or fakes. Test doubles are essential for isolating the unit under test from its dependencies, but undisciplined use creates tests that are tightly coupled to implementation details, fragile under refactoring, and misleading about the real system's behavior. The rule of thumb: mock what you do not own; do not mock what you do own.

## Audit Surface

- [ ] Test mocks a class the team owns and maintains (not a third-party or infrastructure dependency)
- [ ] Mock configured to return a specific value that does not match how the real dependency behaves
- [ ] verify() called on internal implementation methods rather than on boundary interactions
- [ ] Mock interaction not verified: mock is set up but never asserted on (verify/assert_called)
- [ ] Test double for an external API/library without a corresponding contract or integration test
- [ ] Mock chain: when(mock.getA().getB().getC()).thenReturn(value) traversing multiple layers
- [ ] Partial mock (@Spy) overriding some methods while using real implementations for others
- [ ] Mock setup phase >15 lines, dominating the test body
- [ ] Mock of a data class, record, or value object instead of constructing a real instance
- [ ] PowerMock, Mockito.mockStatic, or equivalent used to mock static methods
- [ ] Mock returning another mock creating multi-level fake object graphs
- [ ] Test resets or re-configures a mock between actions in the same test method
- [ ] Any or argumentCaptor used for every argument instead of matching on specific values
- [ ] Mock configured with lenient() or ignoring extra invocations globally
- [ ] Same mock configured differently across many tests with no shared factory or builder

## Detailed Checks

### Over-Mocking (Mocking What You Own)
<!-- activation: keywords=["mock", "Mock", "jest.mock", "Mockito.mock", "unittest.mock", "patch", "MagicMock", "stub", "createMock"] -->

- [ ] **Mocking a domain service**: test mocks a service class the team owns instead of testing through it or refactoring it for testability -- mocking your own code hides design problems and creates tests coupled to implementation
- [ ] **Mocking data objects**: test mocks a DTO, value object, entity, or data class instead of constructing a real instance -- real instances are simpler and more reliable than mock configurations
- [ ] **Mocking to avoid setup**: test mocks a dependency because setting it up is hard -- the difficulty is a design smell (tight coupling, missing interface); refactor the dependency instead of mocking around it
- [ ] **Static method mocking**: test uses PowerMock, Mockito.mockStatic, or similar to mock a static method -- static mocking is a workaround for untestable design; refactor to use dependency injection
- [ ] **Mock of a pure function**: test mocks a stateless, side-effect-free function -- call the real function; pure functions are trivially testable and should not be replaced with fakes

### Mock Behavior Divergence
<!-- activation: keywords=["when(", "thenReturn", "returns(", "mockReturnValue", "mockResolvedValue", "mockImplementation", "onCall", "stub("] -->

- [ ] **Optimistic mock**: mock always returns success, never throws, and never returns error codes -- real dependencies fail; test at least one failure scenario with the mock configured to throw or return an error
- [ ] **Outdated mock behavior**: mock is configured to return a response format that the real dependency no longer uses (e.g., old API version) -- periodically validate mock behavior against the real dependency via contract or integration tests
- [ ] **Mock skipping validation**: real dependency validates its inputs, but the mock accepts anything -- this hides integration bugs where the production code passes invalid data to the real dependency
- [ ] **Missing side effects in mock**: real dependency has side effects (caching, logging, state mutation) that the mock does not replicate, and the test relies on those side effects not happening -- document this explicitly
- [ ] **Overly permissive return types**: mock returns null or empty object where the real dependency would return a rich response -- the test exercises an unrealistic code path

### Spy Overuse and Verification Discipline
<!-- activation: keywords=["spy", "Spy", "verify", "assert_called", "toHaveBeenCalled", "toHaveBeenCalledWith", "times(", "never(", "atLeast", "calledOnce", "calledWith"] -->

- [ ] **Verifying implementation, not behavior**: test uses verify()/assert_called to check that specific internal methods were called in a specific order -- prefer asserting on observable output (return values, state changes, side effects at boundaries)
- [ ] **Unverified mock**: mock is set up with when/thenReturn but no verify or assertion checks that the mock was actually called -- the test passes regardless of whether the code under test interacts with the dependency
- [ ] **Over-specified verification**: verify checks exact argument values, call count, and order for every mock interaction -- this makes the test brittle; verify only the interactions that are part of the test's specification
- [ ] **Spy on the class under test**: test creates a spy of the class being tested, overriding some methods -- this tests a Frankenstein object that is neither the real class nor a clean double
- [ ] **any() for all arguments**: every verify/when uses any() matchers, asserting only that a method was called regardless of arguments -- match on at least the critical arguments

### Mock Complexity and Readability
<!-- activation: keywords=["when(", "chain", "deep", "nested", "setup", "configure", "builder", "factory", "reset", "lenient"] -->

- [ ] **Deep mock chains**: `when(mock.getRepo().findById(id).orElse(null)).thenReturn(entity)` -- this is a Law of Demeter violation in test code; inject the direct dependency instead of mocking through a chain
- [ ] **Mock setup dominance**: mock configuration consumes >15 lines, overshadowing the action and assertion -- extract a mock builder or factory, or reconsider the test's scope
- [ ] **Mock returning mock**: `when(mockA.getB()).thenReturn(mockB); when(mockB.getC()).thenReturn(value)` -- multi-level mock graphs are incomprehensible; refactor the dependency graph or use a fake implementation
- [ ] **Mid-test re-stubbing**: test reconfigures a mock between two actions in the same test method -- this is two tests in one; split into separate test methods
- [ ] **Global lenient mocking**: entire mock is configured as lenient, suppressing unnecessary-stubbing warnings -- lenient mocking hides dead mock setup; remove unused stubs instead

## Common False Positives

- **Mocking infrastructure boundaries**: mocking HTTP clients, database drivers, file systems, and message brokers is correct practice for unit tests. These are third-party/infrastructure dependencies, not "your own code."
- **Fakes over mocks**: providing a hand-written in-memory implementation (fake) of an interface is not over-mocking -- fakes are often the preferred test double for repositories and services with complex behavior.
- **Verify for command-style operations**: when the unit under test's purpose is to orchestrate side effects (send email, publish event, write to database), verifying mock interactions is appropriate because the side effect is the observable behavior.
- **DI frameworks providing mocks**: frameworks like `@MockBean` (Spring) and `jest.mock()` at the module level are standard patterns for replacing infrastructure in integration tests.

## Severity Guidance

| Finding | Severity |
|---|---|
| Mock behavior diverges from real dependency in a way that hides bugs | Critical |
| Test double for third-party API with no contract or integration test ensuring fidelity | Important |
| Unverified mock: mock configured but no assertion checks it was called | Important |
| Deep mock chain traversing 3+ levels of method calls | Important |
| Static method mocking as workaround for untestable design | Important |
| Mocking a data class or value object instead of constructing a real instance | Minor |
| Mock setup >15 lines without extraction into a factory or builder | Minor |
| Spy on the class under test (partial mock of the SUT) | Minor |
| Lenient mocking suppressing unnecessary-stubbing warnings | Minor |

## See Also

- `test-unit-discipline` -- mock discipline is a prerequisite for clean AAA structure; mock setup belongs in Arrange
- `test-integration` -- integration tests complement unit tests by verifying behavior against real dependencies
- `test-contract-pact` -- contract tests ensure test doubles for third-party services remain faithful
- `principle-separation-of-concerns` -- over-mocking often indicates insufficient separation between concerns
- `principle-coupling-cohesion` -- deep mock chains signal high coupling in production code
- `antipattern-flaky-non-deterministic-tests` -- mock state leaking between tests causes flakiness

## Authoritative References

- [Steve Freeman and Nat Pryce, *Growing Object-Oriented Software, Guided by Tests* (2009) -- mock roles not objects, only mock types you own](https://www.growing-object-oriented-software.com/)
- [Gerard Meszaros, *xUnit Test Patterns* (2007) -- test doubles taxonomy: dummy, stub, spy, mock, fake](http://xunitpatterns.com/)
- [Martin Fowler, "Mocks Aren't Stubs" (2007)](https://martinfowler.com/articles/mocksArentStubs.html)
- [Vladimir Khorikov, *Unit Testing Principles, Practices, and Patterns* (2020) -- London vs Detroit schools of testing](https://www.manning.com/books/unit-testing)
- [Eric Elliott, "Mocking is a Code Smell" (2017)](https://medium.com/javascript-scene/mocking-is-a-code-smell-944a70c90a6a)
