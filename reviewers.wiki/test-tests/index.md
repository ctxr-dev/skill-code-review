---
id: test-tests
type: index
depth_role: subcategory
depth: 1
focus: API contract assumptions not verified against the actual service; Assertions inside loops without clarity on which iteration failed; Behavior pinned by characterization test without understanding whether it is correct or a bug; Branch coverage significantly lower than line coverage indicating untested conditionals
parents:
  - "../index.md"
shared_covers: []
entries:
  - id: antipattern-flaky-non-deterministic-tests
    file: antipattern-flaky-non-deterministic-tests.md
    type: primary
    focus: Detect tests that pass or fail unpredictably due to hidden dependencies on time, ordering, network, shared state, or randomness
    tags:
      - flaky-tests
      - non-determinism
      - test-reliability
      - time-dependency
      - shared-state
      - test-isolation
      - anti-pattern
  - id: cicd-test-parallelization-and-flaky-quarantine
    file: cicd-test-parallelization-and-flaky-quarantine.md
    type: primary
    focus: Detect CI test execution issues including uneven test splitting, missing flaky test quarantine, retries masking real failures, absent timing data for splitting, and missing flaky detection automation
    tags:
      - testing
      - ci-cd
      - parallelism
      - flaky-tests
      - quarantine
      - test-splitting
      - performance
  - id: qa-testability-by-design
    file: qa-testability-by-design.md
    type: primary
    focus: Detect static method calls preventing mocking, hidden dependencies via service locator or global state, non-deterministic behavior, tightly coupled components, missing dependency injection, and side effects in constructors
    tags:
      - testability
      - dependency-injection
      - static-methods
      - service-locator
      - non-determinism
      - coupling
      - side-effects
      - mocking
      - test-doubles
  - id: test-characterization
    file: test-characterization.md
    type: primary
    focus: Ensure characterization tests for legacy code are properly labeled, document pinned behavior, and are not mistaken for specification tests
    tags:
      - characterization-test
      - legacy-code
      - pinning-test
      - approval-test
      - golden-master
      - refactoring-safety-net
  - id: test-contract-pact
    file: test-contract-pact.md
    type: primary
    focus: Verify consumer-driven contract tests are complete, provider verification is not missing, and contract versions are managed properly
    tags:
      - contract-testing
      - pact
      - consumer-driven-contracts
      - api-contract
      - provider-verification
      - schema-drift
  - id: test-coverage-quality-not-quantity
    file: test-coverage-quality-not-quantity.md
    type: primary
    focus: Detect high coverage masking weak assertions, coverage gaming, untested error paths, and neglected critical-path coverage
    tags:
      - coverage
      - test-quality
      - assertion-quality
      - branch-coverage
      - mutation-testing
      - coverage-gaming
  - id: test-doubles-and-isolation
    file: test-doubles-and-isolation.md
    type: primary
    focus: Detect over-mocking, mock behavior divergence from real implementations, spy overuse, and missing verification on mock interactions
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
  - id: test-e2e-strategy
    file: test-e2e-strategy.md
    type: primary
    focus: Ensure E2E tests are scoped correctly, resist flakiness, manage test data properly, and do not abuse retries
    tags:
      - e2e
      - end-to-end
      - acceptance-test
      - flakiness
      - test-data
      - parallel-execution
      - playwright
      - cypress
      - selenium
  - id: test-integration
    file: test-integration.md
    type: primary
    focus: Ensure integration tests use real dependencies correctly, isolate test state, verify API contracts, and avoid over-mocking
    tags:
      - integration-test
      - testcontainers
      - database-testing
      - api-contract
      - test-isolation
      - test-cleanup
  - id: test-load-k6-locust-gatling-jmeter
    file: test-load-k6-locust-gatling-jmeter.md
    type: primary
    focus: Detect missing load tests for performance-critical endpoints, unrealistic load profiles, and absent SLO assertions
    tags:
      - load-testing
      - performance
      - k6
      - locust
      - gatling
      - jmeter
      - slo
      - latency
      - throughput
      - stress-test
      - soak-test
  - id: test-mutation
    file: test-mutation.md
    type: primary
    focus: Detect surviving mutants indicating weak assertions, ensure mutation testing is configured correctly, and enforce mutation score thresholds
    tags:
      - mutation-testing
      - pitest
      - stryker
      - mutant
      - mutation-score
      - test-quality
      - assertion-strength
  - id: test-property-based
    file: test-property-based.md
    type: primary
    focus: Detect missing property-based tests for large input spaces and ensure property tests are well-configured with meaningful properties
    tags:
      - property-based-testing
      - quickcheck
      - hypothesis
      - fast-check
      - generators
      - shrinking
      - fuzzing-lite
  - id: test-unit-discipline
    file: test-unit-discipline.md
    type: primary
    focus: Enforce Arrange-Act-Assert structure, single-behavior assertions, clear naming, independence, and absence of logic in unit tests
    tags:
      - unit-test
      - aaa-pattern
      - test-naming
      - test-independence
      - test-discipline
      - assertions
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Test Tests

**Focus:** API contract assumptions not verified against the actual service; Assertions inside loops without clarity on which iteration failed; Behavior pinned by characterization test without understanding whether it is correct or a bug; Branch coverage significantly lower than line coverage indicating untested conditionals

## Children

| File | Type | Focus |
|------|------|-------|
| [antipattern-flaky-non-deterministic-tests.md](antipattern-flaky-non-deterministic-tests.md) | 📄 primary | Detect tests that pass or fail unpredictably due to hidden dependencies on time, ordering, network, shared state, or randomness |
| [cicd-test-parallelization-and-flaky-quarantine.md](cicd-test-parallelization-and-flaky-quarantine.md) | 📄 primary | Detect CI test execution issues including uneven test splitting, missing flaky test quarantine, retries masking real failures, absent timing data for splitting, and missing flaky detection automation |
| [qa-testability-by-design.md](qa-testability-by-design.md) | 📄 primary | Detect static method calls preventing mocking, hidden dependencies via service locator or global state, non-deterministic behavior, tightly coupled components, missing dependency injection, and side effects in constructors |
| [test-characterization.md](test-characterization.md) | 📄 primary | Ensure characterization tests for legacy code are properly labeled, document pinned behavior, and are not mistaken for specification tests |
| [test-contract-pact.md](test-contract-pact.md) | 📄 primary | Verify consumer-driven contract tests are complete, provider verification is not missing, and contract versions are managed properly |
| [test-coverage-quality-not-quantity.md](test-coverage-quality-not-quantity.md) | 📄 primary | Detect high coverage masking weak assertions, coverage gaming, untested error paths, and neglected critical-path coverage |
| [test-doubles-and-isolation.md](test-doubles-and-isolation.md) | 📄 primary | Detect over-mocking, mock behavior divergence from real implementations, spy overuse, and missing verification on mock interactions |
| [test-e2e-strategy.md](test-e2e-strategy.md) | 📄 primary | Ensure E2E tests are scoped correctly, resist flakiness, manage test data properly, and do not abuse retries |
| [test-integration.md](test-integration.md) | 📄 primary | Ensure integration tests use real dependencies correctly, isolate test state, verify API contracts, and avoid over-mocking |
| [test-load-k6-locust-gatling-jmeter.md](test-load-k6-locust-gatling-jmeter.md) | 📄 primary | Detect missing load tests for performance-critical endpoints, unrealistic load profiles, and absent SLO assertions |
| [test-mutation.md](test-mutation.md) | 📄 primary | Detect surviving mutants indicating weak assertions, ensure mutation testing is configured correctly, and enforce mutation score thresholds |
| [test-property-based.md](test-property-based.md) | 📄 primary | Detect missing property-based tests for large input spaces and ensure property tests are well-configured with meaningful properties |
| [test-unit-discipline.md](test-unit-discipline.md) | 📄 primary | Enforce Arrange-Act-Assert structure, single-behavior assertions, clear naming, independence, and absence of logic in unit tests |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
