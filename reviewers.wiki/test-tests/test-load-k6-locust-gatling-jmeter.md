---
id: test-load-k6-locust-gatling-jmeter
type: primary
depth_role: leaf
focus: Detect missing load tests for performance-critical endpoints, unrealistic load profiles, and absent SLO assertions
parents:
  - index.md
covers:
  - Performance-critical endpoint added without a corresponding load test
  - Load test with unrealistic user count, ramp-up, or duration that does not model production traffic
  - "No baseline comparison: load test runs but results are not compared to previous runs"
  - "Missing SLO assertions (p95 latency, error rate, throughput) in load test scripts"
  - Load test running against a local or dev environment that does not match production capacity
  - "Load test generating constant load instead of realistic traffic patterns (spikes, ramp, soak)"
  - No think time between virtual user actions, creating unrealistic request rates
  - Load test results not archived or trended over time
  - Load test not in CI or only triggered manually
  - Test data for load testing insufficient or reusing the same record causing cache bias
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
activation:
  file_globs:
    - "**/*load*"
    - "**/*perf*"
    - "**/*stress*"
    - "**/*soak*"
    - "**/*spike*"
    - "**/*benchmark*"
    - "**/*.js"
    - "**/*.py"
    - "**/*.scala"
    - "**/*.jmx"
    - "**/k6/**"
    - "**/locust*"
    - "**/gatling/**"
    - "**/jmeter/**"
  keyword_matches:
    - k6
    - locust
    - gatling
    - jmeter
    - loadtest
    - load_test
    - performance
    - throughput
    - latency
    - p95
    - p99
    - rps
    - vus
    - virtual users
    - ramp
    - soak
    - spike
    - stress
    - http.get
    - http.post
    - HttpUser
    - TaskSet
    - scenario
    - setUp
    - thresholds
  structural_signals:
    - load_test_script
    - performance_test_config
    - threshold_definition
    - scenario_definition
source:
  origin: file
  path: test-load-k6-locust-gatling-jmeter.md
  hash: "sha256:2fa76b85214b1fe6abadf4e57e27b3ccbeb0d80789d1763f23e4057e5a600a76"
---
# Load Testing (k6, Locust, Gatling, JMeter)

## When This Activates

Activates when the diff modifies load test scripts, performance test configuration, or when production code changes performance-critical endpoints (high-traffic APIs, data processing pipelines, payment flows) without corresponding load test updates. Load tests are the only way to verify that a system meets its performance SLOs under realistic traffic; missing or unrealistic load tests leave performance regressions undetected until production.

## Audit Surface

- [ ] New API endpoint or critical path change without a load test
- [ ] Load test script with a flat constant-VU scenario and no ramp-up/ramp-down phase
- [ ] Load test with no threshold or assertion on latency (p95, p99), error rate, or throughput
- [ ] Load test targeting localhost or a dev server instead of a staging/performance environment
- [ ] Virtual users performing actions with no sleep/think time between requests
- [ ] Load test using a single hardcoded user or record, not a pool of test data
- [ ] Load test results not stored or compared to a baseline
- [ ] Load test with a duration <1 minute that cannot detect memory leaks, connection exhaustion, or GC pressure
- [ ] Load test script that ignores response validation (no check for status code or response body)
- [ ] Soak test absent for services expected to run continuously
- [ ] Spike test absent for services expected to handle sudden traffic bursts
- [ ] Load test not integrated into CI/CD pipeline

## Detailed Checks

### Load Profile Realism
<!-- activation: keywords=["vus", "users", "ramp", "stages", "duration", "rate", "constant", "scenario", "profile", "traffic", "pattern", "think_time", "sleep", "wait_time"] -->

- [ ] **No ramp-up**: test immediately starts with peak VU count -- production traffic ramps gradually; sudden start stresses connection pooling and initialization paths unrealistically
- [ ] **No think time**: virtual users fire requests back-to-back with no delay -- real users have think time between actions (reading, clicking, typing); add `sleep(1-5s)` or `wait_time = between(1, 5)` between requests
- [ ] **Single scenario**: test exercises only one API endpoint or user action -- model realistic user journeys that combine multiple endpoints with varying frequency
- [ ] **Constant load only**: test uses only constant VU count, missing ramp-up, spike, and soak phases -- use staged profiles to test elasticity and sustained load
- [ ] **Duration too short**: test runs for <1 minute, insufficient to detect resource leaks, connection exhaustion, or GC pressure -- run soak tests for 15+ minutes

### SLO Assertions and Thresholds
<!-- activation: keywords=["threshold", "check", "assert", "p95", "p99", "latency", "error", "rate", "throughput", "slo", "sla", "response_time", "http_req_duration"] -->

- [ ] **No thresholds**: load test runs and produces metrics but has no assertions on p95/p99 latency, error rate, or throughput -- without thresholds, the test can only be evaluated by manual inspection
- [ ] **Threshold too loose**: p95 latency threshold is >5 seconds for a user-facing API -- set thresholds based on production SLOs, not arbitrary large values
- [ ] **No error rate check**: test does not assert that HTTP error rate stays below a threshold (e.g., <1%) -- a load test that produces 50% errors but meets latency targets is useless
- [ ] **Missing response validation**: load test does not check response status codes or body content -- the server may return 200 with error bodies or cached stale responses under load
- [ ] **No throughput assertion**: test does not verify that the system achieves a minimum requests-per-second under the given load -- latency alone does not prove the system can handle the traffic volume

### Test Data and Environment
<!-- activation: keywords=["data", "user", "account", "token", "credential", "seed", "pool", "environment", "staging", "production", "config", "base_url", "host"] -->

- [ ] **Single test record**: all virtual users operate on the same record (same user ID, same product, same account) -- this creates unrealistic cache hit rates and database contention patterns; use a pool of test data
- [ ] **Hardcoded credentials**: load test script contains hardcoded passwords, API keys, or tokens -- use environment variables or a secrets manager
- [ ] **Wrong environment**: load test targets localhost or a development server with a single instance -- results do not predict production performance; run against a staging environment that mirrors production topology
- [ ] **No data cleanup**: load test creates persistent records (orders, users, logs) without cleanup -- accumulated data degrades environment quality over time
- [ ] **Shared environment without isolation**: load test runs against a staging environment concurrently used by other teams -- results are unreliable due to interference

### CI Integration and Trend Tracking
<!-- activation: keywords=["ci", "pipeline", "trend", "baseline", "compare", "report", "archive", "schedule", "nightly", "grafana", "prometheus", "influxdb"] -->

- [ ] **Not in CI**: load tests exist but are only run manually -- they provide no automated regression detection
- [ ] **No baseline comparison**: load test results are not compared to previous runs -- a 20% latency regression goes unnoticed without trend analysis
- [ ] **Results not archived**: load test output is ephemeral (console only) -- store results in InfluxDB, Prometheus, Grafana, or a file archive for trending
- [ ] **No alerting on regression**: load test in CI does not fail the build when thresholds are breached -- it must be a quality gate
- [ ] **Nightly-only with no PR gate**: load tests run only in nightly builds, not on PRs that change performance-critical code -- add a lighter smoke-load test to the PR pipeline

## Common False Positives

- **Internal tools and admin APIs**: low-traffic internal APIs may not need load tests. Flag only for user-facing or high-traffic endpoints.
- **Existing comprehensive suite**: if a robust load test suite already covers the changed endpoint, a new test for a minor parameter change is unnecessary.
- **Feature-flagged code**: code behind a disabled feature flag does not need immediate load testing. Track it for when the flag is enabled.
- **Short CI load test**: a 30-second load test in CI that validates basic performance thresholds is a valid smoke test, not an insufficient load test.

## Severity Guidance

| Finding | Severity |
|---|---|
| Performance-critical endpoint (payment, auth, search) with no load test | Critical |
| Load test with no SLO thresholds or assertions | Important |
| Load test targeting wrong environment (localhost/dev instead of staging) | Important |
| Virtual users with no think time creating unrealistic request rates | Important |
| Load test results not compared to baseline, missing regressions | Important |
| Load test using single hardcoded test record creating cache bias | Minor |
| Load test not integrated into CI pipeline | Minor |
| Missing soak or spike test scenario for critical service | Minor |

## See Also

- `test-performance-regression` -- micro-benchmarks complement load tests; load tests verify system-level performance
- `principle-fail-fast` -- load tests without thresholds do not fail fast on performance regressions
- `antipattern-flaky-non-deterministic-tests` -- load tests on shared environments without isolation produce flaky results
- `principle-separation-of-concerns` -- separate load test scenarios for different user journeys and endpoints

## Authoritative References

- [k6 Documentation -- thresholds, scenarios, and checks](https://k6.io/docs/)
- [Locust Documentation -- writing load tests in Python](https://docs.locust.io/)
- [Gatling Documentation -- Scala-based load testing](https://gatling.io/docs/)
- [JMeter Best Practices -- Apache](https://jmeter.apache.org/usermanual/best-practices.html)
- [Google SRE Book, Chapter 31: "Load Testing"](https://sre.google/sre-book/testing-reliability/)
