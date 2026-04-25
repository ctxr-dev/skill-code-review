---
id: test-contract-pact
type: primary
depth_role: leaf
focus: Verify consumer-driven contract tests are complete, provider verification is not missing, and contract versions are managed properly
parents:
  - index.md
covers:
  - Consumer-side contract test missing for a new API consumer
  - Provider verification not configured or not running in CI
  - Pact broker or contract repository not integrated into the deployment pipeline
  - Schema drift between consumer expectations and provider implementation
  - Contract version not tied to git commit or release version
  - Breaking provider change deployed without verifying all consumer contracts
  - Consumer test asserting on fields not in the provider contract
  - Provider state setup missing or incomplete for contract verification
  - "Pact matchers too loose (regex matching everything) or too strict (exact string match on timestamps)"
  - Contract tests not covering error response scenarios
  - Multiple consumer versions not managed, leading to stale contracts
  - Can-i-deploy check not integrated into deployment pipeline
tags:
  - contract-testing
  - pact
  - consumer-driven-contracts
  - api-contract
  - provider-verification
  - schema-drift
activation:
  file_globs:
    - "**/*pact*"
    - "**/*Pact*"
    - "**/*contract*"
    - "**/*Contract*"
    - "**/pacts/**"
    - "**/*.pact.json"
    - "**/*consumer*test*"
    - "**/*provider*test*"
    - "**/*stub*"
    - "**/*.proto"
  keyword_matches:
    - pact
    - Pact
    - contract
    - consumer
    - provider
    - PactVerification
    - PactBroker
    - can-i-deploy
    - canDeploy
    - spring-cloud-contract
    - WireMock
    - stub
    - interaction
    - providerState
    - "given("
    - uponReceiving
  structural_signals:
    - pact_test_class
    - contract_test_file
    - provider_verification
    - consumer_test
source:
  origin: file
  path: test-contract-pact.md
  hash: "sha256:8fa8c3dc7c610000477bffb4034a5f2eeb397ed7c0338570e0e3a9f3dbe0d273"
---
# Contract Testing (Pact / Consumer-Driven Contracts)

## When This Activates

Activates when the diff modifies Pact files, contract test files, API client code that consumes external services, or provider API endpoints. Also activates when protobuf/OpenAPI schemas change, since these define the contract surface. Contract tests are the primary safety net against breaking changes in distributed systems; gaps in contract coverage are integration failures waiting to happen.

## Audit Surface

- [ ] New HTTP/gRPC client added without a corresponding consumer contract test
- [ ] Provider service changed without running contract verification against all consumers
- [ ] Pact file committed to repository instead of published to a broker
- [ ] Consumer contract test uses exact value matching instead of type-based matchers
- [ ] Provider state callback is a no-op or does not set up the required data
- [ ] Contract verification runs only locally, not in CI
- [ ] Consumer contract does not cover 4xx/5xx error responses
- [ ] Pact/contract file references a provider version that no longer exists
- [ ] Contract test uses request/response body matching that allows any structure (overly permissive)
- [ ] No can-i-deploy or equivalent gate in the deployment pipeline
- [ ] Consumer contract asserts on fields the consumer does not actually use
- [ ] Provider verification test has pending or ignored interactions
- [ ] Contract file not versioned with participant version (git SHA or semver)
- [ ] Multiple consumers of the same provider with no matrix verification
- [ ] gRPC/protobuf contract changes not validated against compiled stubs

## Detailed Checks

### Consumer Contract Completeness
<!-- activation: keywords=["consumer", "pact", "interaction", "uponReceiving", "given(", "withRequest", "willRespondWith", "expectation"] -->

- [ ] **Missing consumer test**: a new API client or service call is added in the diff but no corresponding consumer contract test exists -- add a Pact consumer test or Spring Cloud Contract stub
- [ ] **Happy-path only**: consumer contract covers only 200/success responses -- add interactions for expected error responses (400 validation error, 404 not found, 500 server error)
- [ ] **Overly strict matching**: consumer uses exact string matching on fields like timestamps, UUIDs, or generated IDs -- use Pact matchers (like, eachLike, regex, integer, datetime) to match structure and type
- [ ] **Overly loose matching**: consumer uses a regex that matches anything (`.*`) or does not assert on critical fields -- the contract permits the provider to change important response structure without detection
- [ ] **Phantom fields**: consumer contract asserts on response fields the consumer code never reads -- remove them to avoid false contract failures when the provider drops unused fields

### Provider Verification
<!-- activation: keywords=["provider", "verify", "verification", "providerState", "stateHandler", "PactVerification", "@PactBroker", "publishVerificationResults"] -->

- [ ] **Missing provider verification**: provider service has consumers publishing contracts to the broker but no provider verification test exists -- add a verification test that runs against all published consumer contracts
- [ ] **Provider state not implemented**: contract interaction specifies `given("a user exists")` but the provider state handler is empty or missing -- the verification passes vacuously or uses stale data
- [ ] **Verification not in CI**: provider verification runs locally but is not part of the CI pipeline -- breaking changes reach production because verification is manual
- [ ] **Pending interactions ignored**: provider verification marks failing interactions as "pending" indefinitely -- pending should be time-boxed; investigate and fix or renegotiate the contract
- [ ] **Results not published**: provider verification runs but does not publish results back to the broker -- can-i-deploy cannot determine compatibility

### Contract Versioning and Broker Management
<!-- activation: keywords=["broker", "version", "tag", "branch", "canDeploy", "can-i-deploy", "deploy", "publish", "webhook", "matrix"] -->

- [ ] **No participant versioning**: contracts are published without a version tied to git SHA or semver -- the broker cannot track which version of consumer/provider is compatible
- [ ] **Pact files in git**: pact JSON files are committed to the repository instead of published to a broker -- manual file management does not scale and leads to stale contracts
- [ ] **Missing can-i-deploy**: the deployment pipeline does not call `pact-broker can-i-deploy` before deploying -- a provider can be deployed with breaking changes against live consumers
- [ ] **Stale consumer contracts**: consumer contracts reference old provider versions or have not been regenerated after consumer code changes -- the contract does not reflect actual consumer needs
- [ ] **No branch or environment tagging**: contracts are published without branch or environment tags -- the broker cannot distinguish between main, staging, and feature-branch contracts

### Schema Drift Detection
<!-- activation: keywords=["schema", "openapi", "swagger", "protobuf", "proto", "graphql", "avro", "thrift", "drift", "breaking", "compatibility"] -->

- [ ] **OpenAPI/protobuf change without contract update**: the API schema file is modified but contract tests are not updated to reflect the change -- schema and contracts diverge
- [ ] **Removed field still in contract**: provider removes a response field but the consumer contract still expects it -- the contract test will fail at verification, but only if verification is running
- [ ] **Added required field not in contract**: provider adds a required request field but existing consumer contracts do not include it -- consumers will get 400 errors after deployment
- [ ] **Type change without matcher update**: a field changes from string to integer in the schema but the contract matcher still expects a string -- type mismatch goes undetected if matchers are too loose

## Common False Positives

- **Internal-only APIs**: services that communicate only within a monorepo or monolith may use integration tests instead of contract tests. Flag only when the services are independently deployable.
- **Protobuf backward compatibility**: protobuf is designed for backward-compatible evolution (additive changes). Adding optional fields does not require contract test updates if the consumer uses proto3 defaults.
- **Test-only stubs**: WireMock stubs used purely for unit test mocking are not contract tests. Flag only when stubs substitute for missing contract verification.
- **GraphQL introspection**: GraphQL schemas are self-documenting via introspection. Flag only when consumers rely on specific field presence without testing.

## Severity Guidance

| Finding | Severity |
|---|---|
| Provider deployed without running contract verification against any consumer | Critical |
| No can-i-deploy gate in the deployment pipeline | Critical |
| New API consumer with no contract test | Important |
| Provider state handler is a no-op, making verification pass vacuously | Important |
| Consumer contract covers only happy-path responses | Important |
| Pact files committed to git instead of published to a broker | Important |
| Contract uses overly strict matching on non-deterministic fields | Minor |
| Consumer contract asserts on fields the consumer does not read | Minor |
| Contract not tagged with branch or environment metadata | Minor |

## See Also

- `test-integration` -- integration tests complement contract tests; contract tests verify the contract, integration tests verify the wiring
- `principle-fail-fast` -- missing can-i-deploy gates allow incompatible deployments instead of failing fast
- `principle-separation-of-concerns` -- contract tests separate "does the API shape match" from "does the integration work end-to-end"
- `antipattern-flaky-non-deterministic-tests` -- overly strict matchers on timestamps and UUIDs cause flaky contract tests

## Authoritative References

- [Pact Foundation -- Consumer-Driven Contract Testing](https://docs.pact.io/)
- [Pact Broker -- Sharing Contracts and Verification Results](https://docs.pact.io/pact_broker)
- [Beth Skurrie, "Contract Testing vs Integration Testing" (2020)](https://pactflow.io/blog/contract-testing-vs-integration-testing/)
- [Sam Newman, *Building Microservices* (2nd ed., 2021), Chapter 8: "Contract Tests and CDCs"](https://www.oreilly.com/library/view/building-microservices-2nd/9781492034018/)
- [Spring Cloud Contract -- alternative to Pact for JVM services](https://spring.io/projects/spring-cloud-contract)
