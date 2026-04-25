---
id: test-e2e-strategy
type: primary
depth_role: leaf
focus: Ensure E2E tests are scoped correctly, resist flakiness, manage test data properly, and do not abuse retries
parents:
  - index.md
covers:
  - "E2E test suite too large (testing business logic that should be unit-tested)"
  - "E2E test suite too small (critical user journeys not covered)"
  - "Flakiness signals: sleep-based waits, animation-dependent assertions, network-sensitive checks"
  - "Test data management: shared mutable data, no cleanup, hardcoded IDs"
  - Environment parity gaps between test and production
  - No parallel execution strategy, causing slow feedback loops
  - "Retry abuse: retrying flaky tests instead of fixing root causes"
  - "Missing test isolation: tests depending on other tests having run first"
  - No clear ownership of E2E tests, leading to suite neglect
  - "E2E tests not integrated into CI/CD pipeline"
  - "Selector fragility: tests coupled to CSS classes, XPaths, or DOM structure"
  - Missing visual or accessibility checks in E2E flows
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
activation:
  file_globs:
    - "**/*e2e*"
    - "**/*E2E*"
    - "**/*end-to-end*"
    - "**/*acceptance*"
    - "**/*journey*"
    - "**/*smoke*"
    - "**/*.spec.ts"
    - "**/*.spec.js"
    - "**/cypress/**"
    - "**/playwright/**"
    - "**/selenium/**"
    - "**/*Page*Object*"
    - "**/pages/**"
  keyword_matches:
    - e2e
    - end-to-end
    - playwright
    - cypress
    - selenium
    - webdriver
    - puppeteer
    - page.goto
    - page.click
    - cy.visit
    - cy.get
    - browser
    - driver
    - waitFor
    - waitForSelector
    - data-testid
    - getByRole
    - getByText
  structural_signals:
    - e2e_test_file
    - page_object_class
    - browser_test
    - acceptance_test
source:
  origin: file
  path: test-e2e-strategy.md
  hash: "sha256:d647c309dd609913cc6efbc52c2532b2d6d4a339040ced3aeac7e33770b61705"
---
# E2E Test Strategy

## When This Activates

Activates when the diff modifies E2E test files, page objects, test infrastructure (Playwright/Cypress/Selenium config), or when production code changes critical user-facing flows without E2E test updates. E2E tests sit at the top of the testing pyramid -- they are expensive, slow, and prone to flakiness. This reviewer ensures they are used strategically: covering critical journeys without duplicating unit-level checks.

## Audit Surface

- [ ] E2E test that validates business rules better suited to a unit test
- [ ] Critical user journey (signup, checkout, payment) with no E2E coverage
- [ ] E2E test using Thread.sleep, page.waitForTimeout, or fixed delays instead of explicit waits
- [ ] E2E test with hardcoded test user credentials or database IDs
- [ ] E2E test modifying shared production-like data without cleanup
- [ ] E2E test suite that takes >30 minutes, blocking deployment pipeline
- [ ] E2E test with retry count >2, masking flakiness instead of fixing it
- [ ] E2E test depending on another test having run first for data setup
- [ ] Test selectors using CSS class names, XPaths, or generated IDs instead of data-testid
- [ ] E2E test running against a staging environment with no test data isolation
- [ ] E2E test asserting on exact pixel positions, colors, or animation states
- [ ] No smoke test or health check before E2E suite starts
- [ ] E2E test not in CI or only runs on a manual trigger
- [ ] E2E suite has no parallelization strategy
- [ ] E2E test creates side effects (emails, notifications, charges) in shared environments

## Detailed Checks

### E2E Scope: Too Many vs Too Few
<!-- activation: keywords=["e2e", "end-to-end", "journey", "flow", "scenario", "acceptance", "smoke", "critical-path"] -->

- [ ] **Testing the pyramid upside down**: E2E suite contains hundreds of tests that verify individual business rules -- push these to unit or integration tests and keep E2E focused on critical user journeys
- [ ] **Missing critical journey coverage**: core flows (user registration, authentication, checkout, payment, onboarding) have no E2E test -- these are the highest-risk paths and deserve E2E validation
- [ ] **Duplicate coverage**: E2E test verifies the same logic as an existing unit or integration test without adding user-journey value -- remove the E2E duplication and rely on lower-level tests
- [ ] **No negative E2E tests**: all E2E tests follow happy paths -- add at least one E2E test for a critical error flow (payment failure, auth rejection, validation error display)

### Flakiness Signals
<!-- activation: keywords=["sleep", "wait", "timeout", "retry", "flaky", "intermittent", "waitForTimeout", "page.waitForTimeout", "cy.wait", "Thread.sleep", "time.sleep"] -->

- [ ] **Fixed sleep instead of explicit wait**: test uses `page.waitForTimeout(3000)`, `cy.wait(5000)`, or `Thread.sleep()` instead of `waitForSelector`, `waitForResponse`, or assertion-based polling -- fixed sleeps are the top cause of E2E flakiness
- [ ] **Animation/transition sensitivity**: test asserts during a CSS animation or page transition without waiting for the animation to complete -- use `waitForLoadState`, `waitForNavigation`, or animation-complete events
- [ ] **Network-dependent assertion**: test asserts on data loaded from an API without waiting for the network response to settle -- use `waitForResponse` or network idle detection
- [ ] **Race between click and navigation**: test clicks a link and immediately asserts on the new page without waiting for navigation -- the assertion runs before navigation completes

### Test Data Management
<!-- activation: keywords=["test-data", "seed", "fixture", "factory", "user", "account", "login", "credential", "database", "setup", "cleanup", "teardown"] -->

- [ ] **Hardcoded credentials**: test logs in with hardcoded username/password that exist only in a specific environment -- use environment variables or API-based user creation
- [ ] **Shared mutable test data**: multiple E2E tests modify the same user account, order, or record -- create isolated test data per test or per suite
- [ ] **No cleanup**: test creates resources (users, orders, files) in a shared environment and does not clean them up -- leftover data accumulates and pollutes future runs
- [ ] **Database ID hardcoding**: test references specific database IDs (e.g., `user_id=42`) that may not exist after a database reset -- create or look up data dynamically

### Retry Abuse and CI Integration
<!-- activation: keywords=["retry", "retries", "rerun", "flaky", "ci", "pipeline", "parallel", "shard", "worker", "timeout"] -->

- [ ] **High retry count**: test or suite is configured with >2 retries -- retries mask flakiness; each retry should trigger investigation of the root cause
- [ ] **Retry without failure tracking**: tests are retried in CI but failures are not logged or tracked -- flaky test metrics are essential for prioritizing fixes
- [ ] **No parallelization**: E2E suite runs sequentially, taking >20 minutes -- use sharding, parallel workers, or test splitting to keep feedback loops fast
- [ ] **Not in CI**: E2E tests exist but are not executed in the CI/CD pipeline -- they provide no safety net for deployments
- [ ] **No pre-suite health check**: E2E suite starts without verifying the target environment is healthy -- a down service causes all tests to fail, wasting CI time

### Selector and Locator Discipline
<!-- activation: keywords=["selector", "locator", "css", "xpath", "data-testid", "getByRole", "getByText", "getByLabel", "cy.get", "page.locator", "querySelector", "findElement"] -->

- [ ] **CSS class selectors**: test uses `.btn-primary`, `.header-nav`, or similar CSS classes that change with styling -- use `data-testid`, `getByRole`, or `getByLabel` for resilient selection
- [ ] **Deep XPath**: test uses a multi-level XPath (`//div[3]/ul/li[2]/a`) that breaks with any DOM restructuring -- use accessible roles or test IDs
- [ ] **Generated ID selectors**: test uses IDs generated by the framework (e.g., `#react-root-123`) that change between builds -- use stable `data-testid` attributes
- [ ] **Text-based selectors for dynamic content**: test selects by exact text that includes dates, counts, or user-specific data -- use partial matching or test IDs

## Common False Positives

- **Intentional smoke tests**: a small number of broad E2E tests that verify the application starts and the main page loads are valid smoke tests, not scope violations.
- **Short fixed waits for known timing**: a 100ms wait after a CSS animation with a known 80ms duration is pragmatic when no animation-complete event is available.
- **Retry in CI for infrastructure flakiness**: a single retry to recover from transient CI infrastructure issues (container startup, network blip) is acceptable if accompanied by flakiness tracking.
- **Page objects with CSS selectors**: page object patterns may encapsulate CSS selectors in one place, making changes manageable even though selectors are fragile.

## Severity Guidance

| Finding | Severity |
|---|---|
| Critical user journey (auth, checkout, payment) has no E2E coverage | Critical |
| E2E tests not running in CI/CD pipeline | Critical |
| E2E test uses fixed sleep >2s as primary synchronization strategy | Important |
| Hardcoded credentials or database IDs in E2E test | Important |
| Retry count >2 with no flakiness tracking | Important |
| Test data not cleaned up in shared environment | Important |
| E2E test duplicates logic tested at the unit level | Minor |
| CSS class or XPath selectors instead of data-testid / accessible roles | Minor |
| E2E suite runs sequentially with no parallelization plan | Minor |

## See Also

- `antipattern-flaky-non-deterministic-tests` -- sleep-based waits and shared state are the root of E2E flakiness
- `test-visual-regression` -- visual regression tests complement E2E functional tests for UI correctness
- `test-accessibility-axe-lighthouse` -- E2E flows should include accessibility assertions
- `principle-dry-kiss-yagni` -- over-investing in E2E tests when unit tests suffice violates YAGNI
- `principle-fail-fast` -- E2E tests with no health check waste CI time on a dead environment

## Authoritative References

- [Martin Fowler, "The Practical Test Pyramid" (2018)](https://martinfowler.com/articles/practical-test-pyramid.html)
- [Playwright Best Practices -- locators, auto-waiting, test isolation](https://playwright.dev/docs/best-practices)
- [Cypress Best Practices -- anti-patterns, custom commands, conditional testing](https://docs.cypress.io/guides/references/best-practices)
- [Google Testing Blog, "Just Say No to More End-to-End Tests" (2015)](https://testing.googleblog.com/2015/04/just-say-no-to-more-end-to-end-tests.html)
- [Ham Vocke, "The Practical Test Pyramid" (2018)](https://martinfowler.com/articles/practical-test-pyramid.html)
