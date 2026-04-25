---
id: test-integration
type: primary
depth_role: leaf
focus: Ensure integration tests use real dependencies correctly, isolate test state, verify API contracts, and avoid over-mocking
parents:
  - index.md
covers:
  - Integration test mocking the very dependency it should be testing against
  - Missing Testcontainers or equivalent for database, cache, or message broker dependencies
  - Database state leaking between integration tests due to missing cleanup or transaction rollback
  - API contract assumptions not verified against the actual service
  - Integration test hitting a shared staging environment instead of a local or ephemeral instance
  - Test data setup coupled to database seed scripts that drift from schema
  - Missing network failure and timeout testing for external service integrations
  - Integration tests running in-process when they should verify wire-protocol behavior
  - Over-broad integration test that exercises many code paths, masking unit test gaps
  - "No cleanup of created resources (files, queue messages, database rows) after test"
  - Integration test suite with no CI configuration or skipped in CI
  - "Missing retry/idempotency verification for message-driven integrations"
tags:
  - integration-test
  - testcontainers
  - database-testing
  - api-contract
  - test-isolation
  - test-cleanup
activation:
  file_globs:
    - "**/*integration*"
    - "**/*integ*"
    - "**/*IT.*"
    - "**/*IT_*"
    - "**/*_it.*"
    - "**/it_*"
    - "**/*test*"
    - "**/*spec*"
    - "**/*Test*"
    - "**/*Spec*"
  keyword_matches:
    - integration
    - testcontainer
    - Testcontainers
    - docker-compose
    - database
    - db
    - redis
    - postgres
    - mysql
    - mongo
    - kafka
    - rabbit
    - http
    - api
    - endpoint
    - WireMock
    - MockServer
    - VCR
    - Polly
    - nock
  structural_signals:
    - integration_test_class
    - database_connection_in_test
    - http_client_in_test
    - container_setup
source:
  origin: file
  path: test-integration.md
  hash: "sha256:deccd3ee4c6718ce53d33b375f3ac4671570c969274b96a98516cb082e8c0315"
---
# Integration Test Discipline

## When This Activates

Activates when the diff adds or modifies integration tests, or when production code changes integration points (database queries, HTTP clients, message producers/consumers) without corresponding integration test updates. Integration tests verify that components work together through real interfaces; their value is destroyed when they mock the very dependencies they should exercise or when they leak state between test runs.

## Audit Surface

- [ ] Test labeled 'integration' that mocks the database, HTTP client, or message broker it claims to integrate with
- [ ] Database integration test without transaction rollback, truncation, or container per test
- [ ] Integration test connecting to a hardcoded host/port instead of a configurable or containerized endpoint
- [ ] Test creates records in a shared database table without cleanup in teardown
- [ ] HTTP integration test asserting on response body without verifying status code and headers
- [ ] Integration test with no timeout, risking CI hangs when the external dependency is unavailable
- [ ] Test uses an in-memory database (H2, SQLite :memory:) as a substitute for the production database engine
- [ ] Integration test suite not tagged or filtered separately from unit tests
- [ ] Queue/event integration test that publishes but never verifies consumption
- [ ] Test depends on data seeded by a previous test method (order-dependent)
- [ ] Integration test file lacks docker-compose, Testcontainers, or similar infrastructure setup
- [ ] External API integration test with no recorded/stubbed responses for CI (no WireMock, VCR, Polly)
- [ ] Test asserts on exact database row counts instead of presence/absence of expected records
- [ ] Integration test missing negative case: what happens when the dependency is down or returns an error
- [ ] Test creates filesystem artifacts (temp files, directories) without cleanup

## Detailed Checks

### Real Dependencies vs Mocks
<!-- activation: keywords=["mock", "stub", "fake", "spy", "Mockito", "unittest.mock", "jest.mock", "sinon", "testdouble", "Testcontainers", "docker-compose", "WireMock", "VCR"] -->

- [ ] **Mocking the integration point**: integration test mocks the database client, HTTP client, or message broker -- this makes it a unit test wearing integration clothes; use a real or containerized dependency
- [ ] **In-memory database substitution**: test uses H2 instead of PostgreSQL, SQLite instead of MySQL, or similar -- SQL dialect differences hide real bugs; use Testcontainers with the production database engine
- [ ] **Third-party API without contract stub**: integration test calls a real third-party API in CI -- use WireMock, VCR, Polly, or nock with recorded responses; test against real API only in a dedicated contract verification step
- [ ] **Mock behavior divergence**: a mock or stub is configured with behavior that does not match the real dependency (e.g., mock always returns success, real service returns pagination) -- validate mock behavior against real responses periodically
- [ ] **Hybrid mock confusion**: test mixes real and mocked dependencies in a way that makes it unclear what is actually being tested -- be explicit about what is real and what is faked

### Database Cleanup and Isolation
<!-- activation: keywords=["database", "db", "sql", "insert", "delete", "truncate", "transaction", "rollback", "seed", "migrate", "schema"] -->

- [ ] **No cleanup strategy**: test inserts rows but neither rolls back a transaction, truncates tables, nor uses a fresh container -- subsequent tests see leftover data
- [ ] **Shared database across parallel tests**: tests run in parallel against the same database without schema-per-test, transaction isolation, or unique prefixes -- data collisions cause flakiness
- [ ] **Seed script drift**: test data loaded from a SQL seed file that has not been updated to match schema migrations -- inserts fail or produce invalid state
- [ ] **Assertion on row count**: test asserts `COUNT(*) = 3` instead of asserting that specific expected records exist -- unrelated test data or leftover rows break this assertion
- [ ] **Manual cleanup order**: teardown requires deleting from tables in foreign-key order -- use TRUNCATE CASCADE or transaction rollback to avoid ordering fragility

### API Contract Verification
<!-- activation: keywords=["http", "rest", "graphql", "grpc", "api", "endpoint", "status", "header", "content-type", "schema", "openapi", "swagger"] -->

- [ ] **Status code ignored**: test asserts on response body but does not check HTTP status code -- a 200 with error body or a 500 with HTML are not caught
- [ ] **Content-Type unchecked**: test parses JSON response without verifying Content-Type header -- the endpoint may return HTML error pages in production failure modes
- [ ] **Schema validation missing**: API response structure is assumed correct without validating against OpenAPI/Swagger/JSON Schema -- schema drift goes undetected
- [ ] **Missing error response tests**: only success (2xx) responses are tested -- verify 4xx and 5xx responses have correct error format and status codes
- [ ] **Hardcoded URLs**: test contains hardcoded `http://localhost:8080` instead of a configurable base URL -- breaks in CI and across environments

### Isolation Between Integration Tests
<!-- activation: keywords=["beforeAll", "beforeEach", "setUp", "tearDown", "afterEach", "afterAll", "fixture", "shared", "state", "order", "sequence", "depends"] -->

- [ ] **Order-dependent tests**: test B relies on data created by test A -- each test must set up its own preconditions
- [ ] **Shared mutable fixture**: `beforeAll` creates a shared resource that tests modify without resetting -- use `beforeEach` or copy the fixture per test
- [ ] **Port or resource conflict**: multiple integration test classes bind the same port or create the same named resource -- use dynamic port allocation and unique resource names
- [ ] **Missing timeout**: integration test has no timeout annotation or configuration -- a hung connection or unresponsive container stalls the entire CI pipeline
- [ ] **No negative/failure testing**: all integration tests verify the happy path -- add tests for dependency unavailability, timeout, malformed responses, and partial failures

### Environment and CI Concerns
<!-- activation: keywords=["ci", "pipeline", "docker", "container", "environment", "config", "skip", "ignore", "tag", "category", "group"] -->

- [ ] **Integration tests not separated from unit tests**: no tagging, naming convention, or build profile separates integration tests -- unit test suite becomes slow and flaky
- [ ] **Skipped in CI**: integration tests are annotated `@Ignore`, `@Disabled`, `skip`, or excluded from CI pipeline -- they provide no value if they never run
- [ ] **Environment parity**: integration tests use a different OS, database version, or runtime version than production -- environment-specific bugs slip through
- [ ] **Missing docker-compose or container config**: integration test file references external dependencies but the repository has no docker-compose.yml, Testcontainers config, or equivalent -- new developers cannot run the tests

## Common False Positives

- **Contract tests with Pact/Spring Cloud Contract**: these intentionally use stubs/mocks as part of the contract testing strategy. They are not integration tests; they are contract tests (see `test-contract-pact`).
- **In-memory database for rapid feedback**: some teams deliberately use H2/SQLite for fast integration tests and rely on a separate compatibility suite for the production engine. Flag only when no production-engine tests exist at all.
- **Test utilities that wrap mocks**: helper classes that provide pre-configured test doubles for third-party libraries are not over-mocking; they are infrastructure for focused integration tests.
- **Shared test data fixtures**: read-only reference data loaded in `beforeAll` and never modified is safe to share across tests.

## Severity Guidance

| Finding | Severity |
|---|---|
| Integration test mocks the dependency it is supposed to verify | Critical |
| Database state leaks between tests causing non-deterministic results | Critical |
| Integration test suite skipped or disabled in CI pipeline | Important |
| No cleanup strategy for created database records, files, or messages | Important |
| API integration test ignores status code or Content-Type | Important |
| Hardcoded host/port instead of configurable or containerized endpoint | Important |
| In-memory database substitution with no production-engine test suite | Minor |
| Integration tests not tagged or separated from unit tests | Minor |
| Missing negative/failure-path integration test | Minor |

## See Also

- `test-contract-pact` -- consumer-driven contracts complement integration tests for service boundaries
- `test-doubles-and-isolation` -- mock hygiene in unit tests prevents the need to over-rely on integration tests
- `antipattern-flaky-non-deterministic-tests` -- database leaks and port conflicts are top causes of integration test flakiness
- `principle-fail-fast` -- integration tests without timeouts violate fail-fast by hanging instead of failing
- `principle-separation-of-concerns` -- integration tests should test integration points, not reimport unit-level logic

## Authoritative References

- [Martin Fowler, "Integration Testing" (2018)](https://martinfowler.com/bliki/IntegrationTest.html)
- [Testcontainers -- database, message broker, and service containers for integration testing](https://www.testcontainers.org/)
- [Sam Newman, *Building Microservices* (2nd ed., 2021), Chapter 8: "Testing"](https://www.oreilly.com/library/view/building-microservices-2nd/9781492034018/)
- [WireMock -- API simulation for reliable integration testing](https://wiremock.org/)
- [Google Testing Blog, "Testing on the Toilet: Testing State vs. Testing Interactions" (2013)](https://testing.googleblog.com/2013/03/testing-on-toilet-testing-state-vs.html)
