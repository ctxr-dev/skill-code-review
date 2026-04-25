---
id: antipattern-flaky-non-deterministic-tests
type: primary
depth_role: leaf
focus: Detect tests that pass or fail unpredictably due to hidden dependencies on time, ordering, network, shared state, or randomness
parents:
  - index.md
covers:
  - "Tests depending on wall-clock time (Date.now, time.time, System.currentTimeMillis) without freezing or mocking the clock"
  - Tests depending on execution order via shared mutable state between test cases
  - "Tests using sleep/delay for synchronization instead of explicit waits, latches, or polling"
  - Tests hitting real network, database, or filesystem without mocking, stubbing, or containers
  - Tests using random data with no fixed seed, making failures unreproducible
  - Tests asserting floating-point equality without epsilon or approximate matchers
  - Tests sensitive to locale, timezone, or encoding of the host machine
  - Tests sharing singleton or global state without cleanup or isolation
  - "Tests relying on HashMap/Set iteration order or unstable sort output"
  - Tests with hardcoded ports, temp paths, or resource identifiers that collide under parallel execution
  - Tests asserting on log output, error messages, or exception strings that may change across versions
  - Tests with race conditions from shared fixtures modified concurrently
tags:
  - flaky-tests
  - non-determinism
  - test-reliability
  - time-dependency
  - shared-state
  - test-isolation
  - anti-pattern
activation:
  file_globs:
    - "**/*test*"
    - "**/*spec*"
    - "**/*Test*"
    - "**/*Spec*"
    - "**/__tests__/**"
    - "**/tests/**"
    - "**/test/**"
    - "**/*_test.*"
    - "**/*_spec.*"
  keyword_matches:
    - test
    - "it("
    - describe
    - spec
    - expect
    - assert
    - should
    - "@Test"
    - def test_
    - func Test
    - "#[test]"
    - sleep
    - setTimeout
    - Date.now
    - time.time
    - random
    - Math.random
    - Thread.sleep
    - time.sleep
    - asyncio.sleep
    - Instant.now
    - fixture
    - beforeEach
    - afterEach
    - setUp
    - tearDown
    - mock
    - stub
    - fake
  structural_signals:
    - test_function
    - test_class
    - sleep_in_test
    - time_dependent_assertion
    - shared_mutable_state
    - network_call_in_test
source:
  origin: file
  path: antipattern-flaky-non-deterministic-tests.md
  hash: "sha256:96c572d9471e342369e6edacacaa7d3c325faf73742eb5f6c9b225d71824382a"
---
# Flaky Non-Deterministic Tests

## When This Activates

Activates on diffs that add or modify test files containing signals of non-determinism: time-dependent assertions, sleep-based synchronization, random data without seeds, real network or filesystem access, shared mutable state, or floating-point equality checks. Flaky tests are tests that pass and fail without any code change, poisoning developer trust in the test suite. When a test suite has even a few flaky tests, developers learn to ignore failures, re-run until green, or skip the suite entirely -- destroying the safety net that tests are meant to provide. The root cause is always a hidden dependency on something the test does not control: the clock, the network, execution order, the host locale, or shared state. This reviewer detects the diff-visible signals that a test has such a dependency.

## Audit Surface

- [ ] Test calls Date.now(), time.time(), System.currentTimeMillis(), Instant.now(), or DateTime.UtcNow without a mocked or frozen clock
- [ ] Test uses Thread.sleep(), time.sleep(), setTimeout(), asyncio.sleep(), or Task.Delay() for synchronization
- [ ] Test opens a real HTTP connection, socket, or database connection without mocking or container
- [ ] Test uses Math.random(), random.random(), rand(), or Random() without a fixed seed
- [ ] Test asserts exact floating-point equality (assertEqual, toBe, ===) without epsilon tolerance
- [ ] Test reads environment variables, locale, or timezone from the host without overriding them
- [ ] Test writes to a shared file path, temp directory, or global variable without cleanup (afterEach, tearDown)
- [ ] Test relies on HashMap/Dictionary iteration order or sort stability for assertion
- [ ] Test uses a hardcoded port number (e.g., 8080, 3000) that may conflict in parallel CI
- [ ] Test asserts on error message strings, log output, or exception text that is not part of the public API
- [ ] Test modifies a class-level or module-level variable and does not reset it in teardown
- [ ] Test uses a real filesystem path that may not exist on all CI runners
- [ ] Test depends on insertion order of records without an ORDER BY or explicit sorting before assertion
- [ ] Test has conditional skip logic based on platform or environment that hides failures
- [ ] Test captures system time before and after an operation and asserts elapsed time within a tight bound
- [ ] Async test missing an await, causing the test to pass before assertions run

## Detailed Checks

### Time-Dependent Tests
<!-- activation: keywords=["Date.now", "time.time", "System.currentTimeMillis", "Instant.now", "DateTime", "UtcNow", "clock", "timestamp", "time()", "freeze", "travel", "timecop", "FakeClock", "Clock.fixed"] -->

- [ ] **Wall-clock in assertion**: flag tests that call a real time API (Date.now, time.time, Instant.now, DateTime.UtcNow) and use the result in an assertion -- the assertion may pass or fail depending on execution speed, time of day, or daylight-saving transitions
- [ ] **Elapsed-time assertion with tight bound**: flag tests that measure elapsed time (`end - start < 100ms`) for non-performance-test purposes -- execution time varies with CI load, garbage collection pauses, and machine specs
- [ ] **Date formatting without fixed timezone**: flag tests that format or parse dates without explicitly setting the timezone -- the test passes on the developer's machine but fails on a CI runner in a different timezone
- [ ] **No clock injection**: flag classes under test that call time APIs directly and are tested without a clock mock or injection point -- the test cannot control time and is vulnerable to time-based flakiness
- [ ] **Midnight / boundary tests**: flag tests that assert on date components (day, month, year) from real clock calls -- these fail when the test runs near midnight, month-end, or year-end boundaries

### Sleep-Based Synchronization
<!-- activation: keywords=["sleep", "Thread.sleep", "time.sleep", "asyncio.sleep", "Task.Delay", "setTimeout", "delay", "wait", "pause", "usleep"] -->

- [ ] **Sleep instead of explicit wait**: flag `Thread.sleep()`, `time.sleep()`, `asyncio.sleep()`, or `setTimeout()` in test code used to wait for an asynchronous condition -- use polling with a timeout, a latch, a semaphore, or an explicit condition wait instead
- [ ] **Fixed delay for async operation**: flag tests that sleep a fixed duration (e.g., 500ms) before asserting on the result of an async operation -- the operation may take longer on slow CI, or the sleep wastes time when the operation completes faster
- [ ] **Sleep to avoid race condition**: flag sleep calls placed between test steps to "allow time" for state to propagate (cache invalidation, event processing, eventual consistency) -- the sleep is a heuristic; use deterministic synchronization
- [ ] **Sleep in retry loop**: flag `while (!condition) { sleep(N) }` patterns without a maximum iteration count or total timeout -- these can hang indefinitely in CI if the condition is never met

### Shared Mutable State
<!-- activation: keywords=["static", "global", "shared", "class variable", "module", "singleton", "beforeAll", "beforeClass", "@BeforeAll", "setUpClass", "cleanup", "reset", "tearDown", "afterEach", "afterAll"] -->

- [ ] **Global or static variable modified without reset**: flag tests that write to a global, static, or class-level variable without a corresponding teardown/afterEach/cleanup step that restores the original value -- subsequent tests see the modified state
- [ ] **Singleton state leaking between tests**: flag tests that modify a singleton's internal state (configuration, registry entries, cached values) without resetting the singleton between tests -- test execution order determines pass/fail
- [ ] **Shared database without transaction rollback**: flag integration tests that insert, update, or delete database records without wrapping the test in a transaction that rolls back, or without truncating tables in teardown -- tests leak data to each other
- [ ] **Shared filesystem artifact**: flag tests that write to a fixed file path without cleanup -- a prior test's leftover file can cause the next test to pass or fail depending on execution order
- [ ] **Environment variable mutation**: flag tests that set environment variables (process.env, os.environ, System.setProperty) without restoring originals in teardown -- environment leaks affect all subsequent tests in the process

### Random Data Without Reproducibility
<!-- activation: keywords=["random", "Math.random", "Random(", "rand(", "uuid", "UUID", "faker", "Faker", "generate", "arbitrary", "property-based", "seed", "srand"] -->

- [ ] **Random without seed**: flag tests using random number generators (Math.random, random.random, Random(), rand()) without setting a fixed seed -- failures cannot be reproduced because the input changes each run
- [ ] **Faker or factory without seed**: flag test data generators (Faker, FactoryBot, factory_boy) that use random data without a fixed seed -- the generated data varies per run, making failures intermittent
- [ ] **UUID in assertion**: flag tests that generate UUIDs and assert on them without capturing the value -- UUID generation is non-deterministic by design
- [ ] **Property-based test without seed logging**: flag property-based tests (Hypothesis, QuickCheck, fast-check) that do not log or print the seed on failure -- the failing case cannot be reproduced without the seed
- [ ] **Random selection from collection**: flag tests that randomly select an element from a list (e.g., `list[random.randint(0, len(list))]`) for use in assertions -- the test exercises a different path each run

### External Dependency Without Isolation
<!-- activation: keywords=["http", "fetch", "request", "axios", "curl", "socket", "connect", "database", "db", "redis", "mongo", "postgres", "mysql", "filesystem", "file", "fs.", "open(", "Path", "tempfile", "NamedTemporaryFile"] -->

- [ ] **Real network call in unit test**: flag tests that make HTTP requests, open sockets, or connect to external APIs without mocking, stubbing, or using a test server -- network failures, latency, and rate limits make these flaky
- [ ] **Real database without container**: flag tests that connect to a real database without using a test container (Testcontainers, docker-compose) or in-memory database -- the test depends on the database being available and in a known state
- [ ] **Filesystem path assumption**: flag tests that read from or write to hardcoded absolute paths (/tmp/myapp, C:\Users\...) -- the path may not exist, may lack permissions, or may differ across OS and CI environments
- [ ] **Hardcoded port number**: flag tests that bind to a specific port (8080, 3000, 5432) without using port 0 (OS-assigned) -- parallel test execution or other processes may already hold the port
- [ ] **DNS or hostname dependency**: flag tests that resolve hostnames (localhost, specific domain names) -- DNS resolution can fail or vary across environments

### Ordering and Precision Assumptions
<!-- activation: keywords=["assertEqual", "assertEquals", "toBe", "toEqual", "expect(", "assert_equal", "should eq", "sort", "order", "float", "double", "decimal", "precision", "epsilon", "approximate", "closeTo", "HashMap", "HashSet", "dict", "set("] -->

- [ ] **Floating-point exact equality**: flag assertions comparing floating-point results with exact equality (`assertEqual(0.1 + 0.2, 0.3)`, `expect(x).toBe(y)`) -- use approximate matchers (toBeCloseTo, assertAlmostEqual, assert_in_delta) with an explicit epsilon
- [ ] **Unordered collection in ordered assertion**: flag assertions that compare the contents of a HashMap, HashSet, dictionary, or set using an order-sensitive matcher (assertEqual on a list representation) -- iteration order is not guaranteed
- [ ] **Database query without ORDER BY**: flag test assertions on a list of records retrieved from a database without an explicit ORDER BY -- the database may return rows in any order
- [ ] **String representation of unordered data**: flag assertions on `.toString()` or string serialization of maps, sets, or other unordered structures -- the string representation varies across runs and implementations
- [ ] **Locale-sensitive string comparison**: flag assertions comparing formatted numbers, dates, or currency strings without setting a fixed locale -- "1,000.00" vs "1.000,00" depends on the host locale

## Common False Positives

- **Intentional performance/benchmark tests**: tests that measure elapsed time with explicit performance thresholds and labeled as benchmark or performance tests are not flaky -- they are testing a specific performance property. Flag only when time assertions appear in functional tests.
- **Property-based testing frameworks**: frameworks like Hypothesis, QuickCheck, and fast-check use randomness by design and handle seed management internally (shrinking, replay). Flag only when seed logging or replay capability is absent.
- **Integration tests with Testcontainers**: tests using Testcontainers, docker-compose test profiles, or in-memory databases (H2, SQLite :memory:) have isolated external dependencies by design. Flag only when real external services are accessed directly.
- **Sleep in end-to-end tests for UI rendering**: E2E tests may use short sleeps for UI rendering or animation completion when explicit wait APIs are unavailable. Flag only when the sleep replaces an available waitFor/waitUntil/polling API.
- **Randomized test data with framework-managed seeds**: some test frameworks (pytest with pytest-randomly, RSpec with --seed) manage seeds at the suite level. Flag only when no seed management is present at any level.
- **Tests for non-deterministic algorithms**: tests for randomized algorithms (Monte Carlo, genetic algorithms) may intentionally use random input. Flag only when the test asserts on a specific output rather than a statistical property.

## Severity Guidance

| Finding | Severity |
|---|---|
| Test makes real HTTP/network call without any mocking, stubbing, or test server | Critical |
| Test modifies global/static/singleton state without teardown reset | Critical |
| Async test missing await, allowing assertions to be skipped entirely | Critical |
| Test uses Thread.sleep/time.sleep as sole synchronization for async operation | Important |
| Test calls wall-clock API (Date.now, Instant.now) in assertion without clock mock | Important |
| Test uses random data without fixed seed and no failure reproduction mechanism | Important |
| Test writes to shared file path or binds to hardcoded port without cleanup | Important |
| Test asserts on HashMap/Set iteration order or database results without ORDER BY | Important |
| Test asserts exact floating-point equality without epsilon | Minor |
| Test asserts on error message strings or log output that may change | Minor |
| Test reads host locale, timezone, or encoding without overriding | Minor |
| Test uses conditional skip that may hide real failures on certain platforms | Minor |

## See Also

- `principle-fail-fast` -- flaky tests violate fail-fast by hiding real failures behind non-deterministic noise
- `principle-encapsulation` -- tests that depend on global state violate encapsulation of test scope
- `principle-separation-of-concerns` -- tests that mix unit logic with network/filesystem/time concerns lack separation
- `principle-coupling-cohesion` -- tests coupled to wall-clock time, execution order, or host environment have hidden coupling

## Authoritative References

- [Martin Fowler, "Eradicating Non-Determinism in Tests" (2011)](https://martinfowler.com/articles/nonDeterminism.html)
- [Google Testing Blog, "Flaky Tests at Google and How We Mitigate Them" (2016)](https://testing.googleblog.com/2016/05/flaky-tests-at-google-and-how-we.html)
- [John Micco, "The State of Continuous Integration Testing at Google" (IEEE ICSE 2017)](https://research.google/pubs/pub45861/)
- [Gerard Meszaros, *xUnit Test Patterns* (2007), Chapter 16: "Non-Deterministic Tests" and Chapter 17: "Test Smells"](http://xunitpatterns.com/)
- [Michael Feathers, *Working Effectively with Legacy Code* (2004), Chapter 23: "Dealing with Non-Determinism"](https://www.oreilly.com/library/view/working-effectively-with/0131177052/)
- [Kent Beck, *Test-Driven Development: By Example* (2002) -- tests must be isolated, repeatable, and deterministic](https://www.oreilly.com/library/view/test-driven-development/0321146530/)
