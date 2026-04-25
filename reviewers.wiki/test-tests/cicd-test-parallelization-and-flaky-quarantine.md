---
id: cicd-test-parallelization-and-flaky-quarantine
type: primary
depth_role: leaf
focus: Detect CI test execution issues including uneven test splitting, missing flaky test quarantine, retries masking real failures, absent timing data for splitting, and missing flaky detection automation
parents:
  - index.md
covers:
  - Tests not split evenly across parallel containers
  - "Flaky tests not quarantined (run in main suite causing random failures)"
  - Retry on test failure masking genuine regressions
  - No test timing data collected for intelligent splitting
  - Missing automated flaky test detection
  - Test suite without parallelism despite long runtime
  - "Parallel tests with shared mutable state (database, files)"
  - Test order dependency not detected
  - Quarantined tests never re-evaluated for stability
  - Missing test result reporting to CI platform
tags:
  - testing
  - ci-cd
  - parallelism
  - flaky-tests
  - quarantine
  - test-splitting
  - performance
activation:
  file_globs:
    - "**/.github/workflows/*"
    - "**/.gitlab-ci*"
    - "**/.circleci/**"
    - "**/Jenkinsfile*"
    - "**/azure-pipelines*"
    - "**/.buildkite/**"
    - "**/jest.config*"
    - "**/pytest.ini"
    - "**/pyproject.toml"
    - "**/.rspec"
  keyword_matches:
    - parallel
    - parallelism
    - split
    - shard
    - flaky
    - quarantine
    - retry
    - rerun
    - timing
    - junit
    - test-results
    - store_test_results
    - test-splitter
  structural_signals:
    - CI test job configuration change
    - Test parallelization or splitting change
    - Retry or rerun configuration change
source:
  origin: file
  path: cicd-test-parallelization-and-flaky-quarantine.md
  hash: "sha256:9dbceac2fed516c20af89c9e2fbdb64a3e3b2f53bcf266a91ad80f952b6f60e8"
---
# Test Parallelization and Flaky Test Quarantine

## When This Activates

Activates when diffs touch CI/CD test job configuration, test runner settings, or test splitting/parallelization setup. Long test suites without parallelization slow developer feedback loops, while flaky tests erode trust in CI signals and train developers to ignore failures. Retries without quarantine mask genuine regressions, and uneven test splitting wastes parallel capacity. This reviewer detects patterns that degrade CI test reliability, waste compute resources, or allow flaky tests to block or desensitize the development team.

## Audit Surface

- [ ] Parallel CI containers without test splitting command
- [ ] Flaky test annotated or skipped without quarantine tracking
- [ ] Retry or rerun-failed without flaky test isolation
- [ ] No test timing artifact stored for split optimization
- [ ] No flaky test detection job or tool in CI pipeline
- [ ] Test suite over 10 minutes without parallelization
- [ ] Parallel tests sharing database without isolation
- [ ] Tests with sleep or timing-dependent assertions
- [ ] Quarantine list not reviewed in over 90 days
- [ ] Missing JUnit/xUnit XML upload to CI platform
- [ ] Test sharding by file count instead of timing
- [ ] Retry count > 2 without flaky classification

## Detailed Checks

### Test Splitting and Parallelism
<!-- activation: keywords=["parallel", "parallelism", "split", "shard", "matrix", "container", "timing", "filesize", "round-robin"] -->

- [ ] **Parallelism without splitting**: flag CI jobs with `parallelism: N` or `matrix:` strategy where each container runs the full test suite instead of a split subset -- this multiplies runtime and cost by N instead of dividing by N. Use `circleci tests split`, `jest --shard`, `pytest-split`, or equivalent
- [ ] **Splitting by file count instead of timing**: flag test splitting using round-robin file distribution or file count -- tests vary wildly in duration, causing one container to finish in 30 seconds while another runs for 10 minutes. Split by historical timing data for even distribution
- [ ] **No timing data collected**: flag test pipelines without JUnit XML or test timing artifact upload -- without timing data, intelligent splitting falls back to naive file-based distribution. Upload test results on every run: `store_test_results` (CircleCI), `actions/upload-artifact` with JUnit XML, or `test_report` (GitLab)
- [ ] **Long test suite without parallelism**: flag test suites with total runtime exceeding 10 minutes that run on a single container without parallelization -- long feedback loops reduce developer productivity and increase the cost of every CI run

### Flaky Test Quarantine
<!-- activation: keywords=["flaky", "quarantine", "skip", "xfail", "pending", "intermittent", "unstable", "allow_failure"] -->

- [ ] **Flaky test not quarantined**: flag tests marked with `skip`, `@Ignore`, `xfail`, `pending`, or comments like `// flaky` that remain in the main test suite -- these tests randomly fail, blocking merges and eroding CI trust. Move flaky tests to a dedicated quarantine suite that runs separately and does not block merges
- [ ] **Quarantine without tracking**: flag quarantined tests without an associated issue, ticket, or tracking mechanism -- quarantined tests forgotten without tracking become permanently disabled, reducing test coverage silently
- [ ] **Stale quarantine list**: flag quarantine configurations or skip annotations that have not been reviewed in over 90 days -- flaky tests may have been fixed upstream, or the underlying cause may have been resolved. Schedule regular quarantine review
- [ ] **No flaky detection automation**: flag CI pipelines without automated flaky test detection (repeated test runs, statistical analysis, or flaky-detection tools) -- manual flaky identification is slow and incomplete. Use tools like `pytest-repeat`, `jest --detectOpenHandles`, BuildPulse, or Launchable

### Retry Strategy and Failure Masking
<!-- activation: keywords=["retry", "rerun", "reruns", "flaky", "attempt", "max-retries", "rerun-failed", "allow_failure"] -->

- [ ] **Retry masking real failures**: flag test jobs with retry count > 1 without distinguishing between flaky and genuine failures -- if a test fails, is retried, and passes, the CI reports success. But the initial failure may indicate a real race condition or intermittent bug. Log retry occurrences and classify repeatedly retried tests as flaky candidates
- [ ] **High retry count**: flag retry counts above 2 for test steps -- high retry counts indicate systemic flakiness that should be addressed at the root cause, not masked by retries. Three attempts (1 initial + 2 retries) is a reasonable maximum
- [ ] **Retry without flaky classification**: flag retry configurations that do not feed data into a flaky test tracking system -- retries that succeed on second attempt should automatically flag the test for quarantine review
- [ ] **allow_failure / continue-on-error on test jobs**: flag test jobs marked as non-blocking (`allow_failure: true`, `continue-on-error: true`) -- this desensitizes the team to test failures and allows regressions to merge

### Shared State and Test Isolation
<!-- activation: keywords=["database", "db", "redis", "shared", "state", "fixture", "setup", "teardown", "beforeAll", "afterAll", "sleep", "setTimeout", "wait"] -->

- [ ] **Parallel tests sharing database**: flag parallel test containers sharing a single database instance without schema isolation (separate databases, schemas, or transaction rollback) -- concurrent writes to shared tables cause random test failures that are impossible to reproduce locally
- [ ] **Tests with timing-dependent assertions**: flag tests using `sleep()`, `setTimeout()`, or fixed-duration waits for async operations -- timing-based assertions are inherently flaky across environments with different CPU speeds. Use polling, waitFor patterns, or explicit synchronization
- [ ] **Test order dependency**: flag test suites where test order is not randomized (`--randomize` in RSpec, `--random-order` in pytest) -- order-dependent tests pass in sequence but fail when parallelized or when test discovery order changes
- [ ] **Missing test isolation in parallel runs**: flag parallel test execution without database truncation, sandbox transactions, or fixture isolation between tests -- shared mutable state between parallel workers is the primary source of flaky failures in parallelized suites

## Common False Positives

- **Intentionally serial tests**: some integration or end-to-end tests must run serially due to shared external resources (hardware, third-party sandbox). Serial execution is valid when documented.
- **Small test suites**: projects with test suites under 2 minutes do not need parallelization. The overhead of splitting and artifact transfer may exceed the time savings.
- **Retry for infrastructure flakiness**: retry on CI infrastructure failures (runner crash, network timeout) is distinct from test flakiness. Infrastructure retries at the job level (not test level) are appropriate.
- **Quarantine suite as separate job**: a quarantine suite running as a separate non-blocking job is the desired pattern. Only flag when quarantined tests remain in the main blocking suite.

## Severity Guidance

| Finding | Severity |
|---|---|
| Retry masking genuine regression (no flaky tracking) | Important |
| allow_failure on critical test job (regressions merge silently) | Important |
| Parallel tests sharing database without isolation | Important |
| Parallelism without test splitting (N times cost, no benefit) | Important |
| Flaky test in main suite without quarantine | Minor |
| No timing data for test splitting | Minor |
| Test splitting by file count instead of timing | Minor |
| Long test suite without parallelization (>10 min) | Minor |
| Quarantine list not reviewed in 90+ days | Minor |
| Missing flaky test detection automation | Minor |

## See Also

- `cicd-github-actions` -- GitHub Actions matrix strategy and test result upload
- `cicd-gitlab-ci` -- GitLab CI parallel keyword and test reports
- `cicd-circleci` -- CircleCI parallelism and test splitting
- `cicd-caching-strategy` -- caching test dependencies for faster parallel runs
- `cicd-merge-queue-and-branch-protection` -- required status checks and flaky test impact on merge queue

## Authoritative References

- [CircleCI Test Splitting](https://circleci.com/docs/parallelism-faster-jobs/)
- [GitHub Actions Matrix Strategy](https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/running-variations-of-jobs-in-a-workflow)
- [Jest Sharding](https://jestjs.io/docs/cli#--shard)
- [pytest-split Plugin](https://github.com/jerry-git/pytest-split)
- [Google Testing Blog: Flaky Tests](https://testing.googleblog.com/2016/05/flaky-tests-at-google-and-how-we.html)
- [BuildPulse Flaky Test Detection](https://buildpulse.io/)
