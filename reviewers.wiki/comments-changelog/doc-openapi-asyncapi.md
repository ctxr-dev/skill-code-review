---
id: doc-openapi-asyncapi
type: primary
depth_role: leaf
focus: Detect OpenAPI and AsyncAPI documentation-level issues including missing examples, absent descriptions, no versioning strategy, and lack of CI validation
parents:
  - index.md
covers:
  - "API spec drift from implementation (documentation perspective)"
  - Missing request and response examples in spec
  - Schema properties without descriptions
  - Missing error response documentation
  - No versioning strategy for the API spec
  - Spec file not validated or linted in CI
  - Missing authentication documentation in spec
  - Missing deprecation notices on sunset endpoints
  - Changelog of spec changes not maintained
  - OpenAPI spec does not match implemented endpoint behavior
  - "Schema missing request/response examples for key endpoints"
  - Incomplete schema -- missing required fields, types, or descriptions
  - Breaking schema change without version bump
  - AsyncAPI spec not covering all published event types
  - Schema referencing undefined components or types
  - Missing error response definitions in schema
  - "Schema with overly permissive types (object without properties, any)"
tags:
  - openapi
  - asyncapi
  - api-documentation
  - examples
  - descriptions
  - versioning
  - ci-validation
  - spectral
  - schema
  - swagger
  - api-spec
  - documentation
  - drift
  - validation
  - contract
aliases:
  - api-openapi-asyncapi-schema
activation:
  file_globs:
    - "**/openapi*"
    - "**/swagger*"
    - "**/asyncapi*"
    - "**/*.yaml"
    - "**/*.yml"
    - "**/*.json"
  keyword_matches:
    - openapi
    - OpenAPI
    - swagger
    - asyncapi
    - AsyncAPI
    - description
    - example
    - examples
    - deprecated
    - security
    - securitySchemes
    - servers
    - tags
  structural_signals:
    - OpenAPI document structure
    - AsyncAPI document structure
source:
  origin: file
  path: doc-openapi-asyncapi.md
  hash: "sha256:50c645aeb31c672ce941131fde7a3d787964e39cccfbd9f7a7a69287e26a3265"
---
# OpenAPI / AsyncAPI Documentation Quality

## When This Activates

Activates when diffs modify OpenAPI or AsyncAPI specification files with a focus on documentation quality -- descriptions, examples, versioning, and consumer experience. While `api-openapi-asyncapi-schema` focuses on schema correctness and spec-implementation drift, this reviewer focuses on whether the spec serves as effective documentation for API consumers. A technically correct spec with no descriptions and no examples is a data structure, not documentation.

## Audit Surface

- [ ] OpenAPI spec has endpoints without any description or summary
- [ ] Request body schema has no example or examples field
- [ ] Response schema has no example demonstrating realistic data
- [ ] Schema properties lack description fields (consumers must guess semantics)
- [ ] API spec defines no error responses (only 2xx documented)
- [ ] No info.version field or version has not been bumped after breaking changes
- [ ] Spec file is not linted by Spectral or equivalent in CI
- [ ] Security schemes section is empty or missing on endpoints requiring auth
- [ ] Deprecated endpoints lack a deprecation notice or sunset header documentation
- [ ] AsyncAPI spec has channels without message descriptions
- [ ] No API changelog tracking spec changes across versions
- [ ] Spec servers section references only localhost or placeholder URLs
- [ ] Tags are unused or inconsistently applied across endpoints

## Detailed Checks

### Description and Summary Coverage
<!-- activation: keywords=["description", "summary", "info", "paths", "channels", "components"] -->

- [ ] Every path item (endpoint) has a `summary` (short, shown in navigation) and a `description` (detailed, shown in endpoint detail view) -- summaries alone are insufficient for complex endpoints
- [ ] Every schema property has a `description` explaining its semantics, constraints, and relationship to business concepts -- `userId: string` without description forces consumers to guess
- [ ] Every parameter (query, path, header) has a `description` explaining its purpose, valid values, and defaults
- [ ] The `info.description` field provides an overview of the entire API: its purpose, authentication requirements, rate limits, and conventions
- [ ] AsyncAPI channel descriptions explain what events flow through the channel, when they are published, and who the intended consumers are

### Example Quality
<!-- activation: keywords=["example", "examples", "requestBody", "responses", "schema", "properties"] -->

- [ ] Every request body schema has at least one `example` with realistic data -- not `"string"` for a name field or `0` for a price, but `"Jane Doe"` and `29.99`
- [ ] Every success response schema has an `example` showing the complete response shape with realistic values
- [ ] Error response schemas have examples showing the error structure (ideally RFC 7807 Problem Details format)
- [ ] Examples are self-consistent: if a request example creates an entity with `id: "abc-123"`, the corresponding response example returns the same `id`
- [ ] Multiple examples are provided for endpoints with polymorphic responses or conditional behavior (e.g., different response shapes based on query parameters)

### Versioning and Lifecycle
<!-- activation: keywords=["version", "info", "deprecated", "sunset", "x-deprecated", "x-sunset"] -->

- [ ] `info.version` is present and follows semantic versioning -- consumers use this to detect breaking changes
- [ ] When the diff introduces a breaking change (removed endpoint, changed response shape, new required field), `info.version` major version is bumped
- [ ] Deprecated endpoints are marked with `deprecated: true` and include a description explaining what to use instead and when the endpoint will be removed
- [ ] If the API uses URL-based versioning (/v1/, /v2/), the spec file is versioned accordingly and older versions remain available
- [ ] An API changelog or migration guide exists documenting changes between versions

### CI Validation and Linting
<!-- activation: keywords=["ci", "pipeline", "spectral", "redocly", "lint", "validate", "build"] -->

- [ ] A CI step runs a spec linter (Spectral, Redocly, Vacuum) on every PR that modifies the spec file -- catching documentation gaps before merge
- [ ] Linting rules are configured to enforce description and example requirements, not just structural validity
- [ ] The spec is rendered as part of the docs build (Redoc, Swagger UI, Stoplight) to catch rendering issues early
- [ ] Spec validation failures block the build -- an invalid spec should not be deployable

### Authentication and Security Documentation
<!-- activation: keywords=["security", "securitySchemes", "bearerAuth", "apiKey", "oauth2", "Authorization"] -->

- [ ] Security schemes are defined in `components/securitySchemes` and applied to endpoints that require authentication
- [ ] Each security scheme has a description explaining how to obtain credentials (link to developer portal, registration flow)
- [ ] Endpoints that are publicly accessible without authentication are explicitly documented as such (not just missing the security requirement)
- [ ] OAuth2 scopes are documented with descriptions explaining what each scope grants access to

## Common False Positives

- **Internal-only APIs**: APIs consumed only by the same team may intentionally have lighter documentation. Flag for external-facing or cross-team APIs.
- **Code-first generated specs**: Specs generated from code annotations (FastAPI, NestJS, Springdoc) inherit descriptions from code comments. Missing descriptions should be fixed in code, not the spec.
- **Spec-in-progress**: Draft specs in feature branches may be intentionally incomplete. Flag only specs on the default branch or in ready-for-review PRs.
- **Mock server specs**: Specs used solely for mock servers or contract testing may prioritize schema accuracy over documentation quality.

## Severity Guidance

| Finding | Severity |
|---|---|
| No error responses documented on any endpoint (consumers cannot handle failures) | Important |
| Breaking change without version bump (consumers break silently) | Important |
| Spec not validated in CI (drift and errors accumulate) | Important |
| Security schemes missing on endpoints that require authentication | Important |
| Endpoints missing descriptions or summaries | Minor |
| Schema properties missing descriptions | Minor |
| Request/response schemas missing examples | Minor |
| Deprecated endpoint without sunset notice | Minor |
| Servers section has only localhost | Minor |

## See Also

- `api-openapi-asyncapi-schema` -- covers schema correctness and spec-implementation drift; this reviewer covers documentation quality
- `doc-site-generators` -- API reference sites generated from specs need the spec to be well-documented
- `pr-description-quality` -- PRs modifying APIs should describe the spec changes
- `doc-changelog-keep-a-changelog` -- API changelogs follow similar principles to project changelogs

## Authoritative References

- [OpenAPI Specification 3.1.0](https://spec.openapis.org/oas/v3.1.0)
- [AsyncAPI Specification 3.0](https://www.asyncapi.com/docs/reference/specification/latest)
- [Spectral -- OpenAPI and AsyncAPI Linter](https://stoplight.io/open-source/spectral)
- [Redocly CLI](https://redocly.com/docs/cli/)
- [APIs You Won't Hate: API Documentation Best Practices](https://apisyouwonthate.com/blog/api-documentation-best-practices)
