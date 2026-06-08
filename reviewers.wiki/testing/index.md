---
id: testing
type: index
depth_role: subcategory
depth: 1
focus: "testing: Detect unbounded cloud resource scaling, missing cost alerts, expensive queries without optimization, unused provisioned resources, excessive logging verbosity, and missing cost-allocation tags; Detect aggregated maintainability..."
parents:
  - "../index.md"
shared_covers: []
tags:
  - aaa-pattern
  - acceptance-test
  - afl
  - api-contract
  - approval-test
  - approval-testing
  - assertion-quality
  - assertion-strength
  - assertions
  - assets
  - baseline
  - batch
  - benchmark
  - blast-radius
  - branch-coverage
  - budget
  - caching
  - change-amplification
  - chaos-engineering
  - characterization-test
generator: "skill-llm-wiki/v1"
entries:
  - id: antipattern-flaky-non-deterministic-tests
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
    file: "../antipatterns-smells/antipattern-flaky-non-deterministic-tests.md"
  - id: cicd-test-parallelization-and-flaky-quarantine
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
    file: "../cicd-build/cicd-test-parallelization-and-flaky-quarantine.md"
  - id: qa-cost-finops
    file: qa-cost-finops.md
    type: primary
    focus: Detect unbounded cloud resource scaling, missing cost alerts, expensive queries without optimization, unused provisioned resources, excessive logging verbosity, and missing cost-allocation tags
    tags:
      - cost
      - finops
      - cloud
      - scaling
      - budget
      - logging
      - tags
      - optimization
      - reserved-capacity
      - lifecycle
      - tokens
      - monitoring
      - caching
      - model-selection
      - batch
      - spend
  - id: qa-maintainability
    file: qa-maintainability.md
    type: primary
    focus: Detect aggregated maintainability-index signals including high cyclomatic complexity, low cohesion, high coupling, missing tests for changed code, magic numbers, long methods, and deep nesting
    tags:
      - maintainability
      - complexity
      - cyclomatic
      - cohesion
      - coupling
      - magic-numbers
      - nesting
      - long-method
      - test-coverage
  - id: qa-modifiability
    file: qa-modifiability.md
    type: primary
    focus: Detect change amplification, rigid dependencies, missing extension points, hardcoded policy, and insufficient interface segregation that make the codebase resistant to modification
    tags:
      - modifiability
      - change-amplification
      - rigidity
      - extension-points
      - hardcoded-policy
      - interface-segregation
      - shotgun-surgery
      - connascence
  - id: qa-portability-interoperability
    file: qa-portability-interoperability.md
    type: primary
    focus: "Detect OS-specific code without abstraction, hardcoded paths, platform-specific APIs without fallback, missing charset/encoding handling, and byte-order assumptions that hinder portability and interoperability"
    tags:
      - portability
      - interoperability
      - cross-platform
      - encoding
      - charset
      - endianness
      - paths
      - locale
      - os-specific
  - id: qa-sustainability-green-software
    file: qa-sustainability-green-software.md
    type: primary
    focus: Detect unnecessary computation, oversized assets, missing caching for repeated expensive work, unnecessary network round-trips, idle resource consumption, and missing auto-scaling down
    tags:
      - sustainability
      - green-software
      - energy
      - efficiency
      - caching
      - polling
      - assets
      - optimization
      - scale-to-zero
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
  - id: qa-usability-beyond-a11y
    file: qa-usability-beyond-a11y.md
    type: primary
    focus: Detect usability anti-patterns beyond accessibility — unhelpful error messages, missing progress indicators, destructive actions without confirmation, inconsistent UI patterns, missing undo capability, and poor defaults
    tags:
      - usability
      - ux
      - error-messages
      - confirmation
      - undo
      - defaults
      - feedback
      - empty-state
      - progress
  - id: test-chaos-engineering
    file: test-chaos-engineering.md
    type: primary
    focus: Detect missing failure injection for critical dependencies, absent steady-state hypotheses, uncontrolled blast radius, and missing rollback plans
    tags:
      - chaos-engineering
      - failure-injection
      - resilience
      - game-day
      - steady-state
      - blast-radius
      - circuit-breaker
      - fault-tolerance
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
  - id: test-fuzzing
    file: test-fuzzing.md
    type: primary
    focus: Detect missing fuzz targets for parsers and deserializers, verify corpus management, and ensure coverage-guided fuzzing is properly configured
    tags:
      - fuzzing
      - fuzz-testing
      - libfuzzer
      - afl
      - go-fuzz
      - jazzer
      - oss-fuzz
      - corpus
      - crash-triage
      - security-testing
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
  - id: test-performance-regression
    file: test-performance-regression.md
    type: primary
    focus: Detect missing benchmark tests, benchmarks not in CI, missing baseline comparisons, and micro-benchmarks measuring the wrong thing
    tags:
      - benchmark
      - performance-regression
      - micro-benchmark
      - jmh
      - criterion
      - hyperfine
      - baseline
      - ci-benchmark
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
  - id: test-snapshot-and-golden-file
    file: test-snapshot-and-golden-file.md
    type: primary
    focus: Detect oversized snapshots, unreviewed snapshot updates, non-deterministic snapshot content, and golden file management issues
    tags:
      - snapshot-testing
      - golden-file
      - jest-snapshot
      - inline-snapshot
      - approval-testing
      - determinism
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
  - id: test-visual-regression
    file: test-visual-regression.md
    type: primary
    focus: Detect missing visual regression snapshots for UI changes, flaky visual diffs from animation or timing, and unreviewed snapshot approvals
    tags:
      - visual-regression
      - percy
      - chromatic
      - playwright-visual
      - screenshot-testing
      - ui-testing
      - pixel-diff
      - design-system
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Testing

**Focus:** testing: Detect unbounded cloud resource scaling, missing cost alerts, expensive queries without optimization, unused provisioned resources, excessive logging verbosity, and missing cost-allocation tags; Detect aggregated maintainability...

## Children

| File | Type | Focus |
|------|------|-------|
| [qa-cost-finops.md](qa-cost-finops.md) | 📄 primary | Detect unbounded cloud resource scaling, missing cost alerts, expensive queries without optimization, unused provisioned resources, excessive logging verbosity, and missing cost-allocation tags |
| [qa-maintainability.md](qa-maintainability.md) | 📄 primary | Detect aggregated maintainability-index signals including high cyclomatic complexity, low cohesion, high coupling, missing tests for changed code, magic numbers, long methods, and deep nesting |
| [qa-modifiability.md](qa-modifiability.md) | 📄 primary | Detect change amplification, rigid dependencies, missing extension points, hardcoded policy, and insufficient interface segregation that make the codebase resistant to modification |
| [qa-portability-interoperability.md](qa-portability-interoperability.md) | 📄 primary | Detect OS-specific code without abstraction, hardcoded paths, platform-specific APIs without fallback, missing charset/encoding handling, and byte-order assumptions that hinder portability and interoperability |
| [qa-sustainability-green-software.md](qa-sustainability-green-software.md) | 📄 primary | Detect unnecessary computation, oversized assets, missing caching for repeated expensive work, unnecessary network round-trips, idle resource consumption, and missing auto-scaling down |
| [qa-testability-by-design.md](qa-testability-by-design.md) | 📄 primary | Detect static method calls preventing mocking, hidden dependencies via service locator or global state, non-deterministic behavior, tightly coupled components, missing dependency injection, and side effects in constructors |
| [qa-usability-beyond-a11y.md](qa-usability-beyond-a11y.md) | 📄 primary | Detect usability anti-patterns beyond accessibility — unhelpful error messages, missing progress indicators, destructive actions without confirmation, inconsistent UI patterns, missing undo capability, and poor defaults |
| [test-chaos-engineering.md](test-chaos-engineering.md) | 📄 primary | Detect missing failure injection for critical dependencies, absent steady-state hypotheses, uncontrolled blast radius, and missing rollback plans |
| [test-characterization.md](test-characterization.md) | 📄 primary | Ensure characterization tests for legacy code are properly labeled, document pinned behavior, and are not mistaken for specification tests |
| [test-contract-pact.md](test-contract-pact.md) | 📄 primary | Verify consumer-driven contract tests are complete, provider verification is not missing, and contract versions are managed properly |
| [test-coverage-quality-not-quantity.md](test-coverage-quality-not-quantity.md) | 📄 primary | Detect high coverage masking weak assertions, coverage gaming, untested error paths, and neglected critical-path coverage |
| [test-doubles-and-isolation.md](test-doubles-and-isolation.md) | 📄 primary | Detect over-mocking, mock behavior divergence from real implementations, spy overuse, and missing verification on mock interactions |
| [test-e2e-strategy.md](test-e2e-strategy.md) | 📄 primary | Ensure E2E tests are scoped correctly, resist flakiness, manage test data properly, and do not abuse retries |
| [test-fuzzing.md](test-fuzzing.md) | 📄 primary | Detect missing fuzz targets for parsers and deserializers, verify corpus management, and ensure coverage-guided fuzzing is properly configured |
| [test-integration.md](test-integration.md) | 📄 primary | Ensure integration tests use real dependencies correctly, isolate test state, verify API contracts, and avoid over-mocking |
| [test-load-k6-locust-gatling-jmeter.md](test-load-k6-locust-gatling-jmeter.md) | 📄 primary | Detect missing load tests for performance-critical endpoints, unrealistic load profiles, and absent SLO assertions |
| [test-mutation.md](test-mutation.md) | 📄 primary | Detect surviving mutants indicating weak assertions, ensure mutation testing is configured correctly, and enforce mutation score thresholds |
| [test-performance-regression.md](test-performance-regression.md) | 📄 primary | Detect missing benchmark tests, benchmarks not in CI, missing baseline comparisons, and micro-benchmarks measuring the wrong thing |
| [test-property-based.md](test-property-based.md) | 📄 primary | Detect missing property-based tests for large input spaces and ensure property tests are well-configured with meaningful properties |
| [test-snapshot-and-golden-file.md](test-snapshot-and-golden-file.md) | 📄 primary | Detect oversized snapshots, unreviewed snapshot updates, non-deterministic snapshot content, and golden file management issues |
| [test-unit-discipline.md](test-unit-discipline.md) | 📄 primary | Enforce Arrange-Act-Assert structure, single-behavior assertions, clear naming, independence, and absence of logic in unit tests |
| [test-visual-regression.md](test-visual-regression.md) | 📄 primary | Detect missing visual regression snapshots for UI changes, flaky visual diffs from animation or timing, and unreviewed snapshot approvals |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
