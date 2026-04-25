---
id: api-rest
type: primary
depth_role: leaf
focus: Detect REST convention violations including wrong HTTP methods, missing status codes, non-resource URLs, missing pagination, and inconsistent naming
parents:
  - index.md
covers:
  - Wrong HTTP method for the operation -- POST for read, GET for mutation
  - Missing or wrong HTTP status codes on success and error responses
  - Non-resource, verb-based URL paths instead of noun-based resources
  - List endpoints missing pagination support
  - Inconsistent naming conventions across endpoints -- camelCase vs snake_case, plural vs singular
  - Missing HATEOAS links or self-referencing URLs when hypermedia is expected
  - Returning 200 OK for errors with an error body instead of proper status codes
  - Missing Content-Type or Accept header handling
  - Nested resources deeper than two levels
  - Missing idempotency support on non-idempotent operations
tags:
  - rest
  - api
  - http
  - http-methods
  - status-codes
  - pagination
  - naming
  - resource-design
  - idempotency
activation:
  file_globs:
    - "**/*controller*"
    - "**/*route*"
    - "**/*router*"
    - "**/*handler*"
    - "**/*endpoint*"
    - "**/*resource*"
    - "**/*api*"
    - "**/openapi*"
    - "**/swagger*"
    - "**/*.yaml"
    - "**/*.yml"
  keyword_matches:
    - GET
    - POST
    - PUT
    - PATCH
    - DELETE
    - route
    - router
    - endpoint
    - controller
    - handler
    - REST
    - api
    - status
    - pagination
    - page
    - limit
    - offset
    - cursor
  structural_signals:
    - HTTP route definition with method and path
    - Response status code assignment
    - Pagination parameter handling
source:
  origin: file
  path: api-rest.md
  hash: "sha256:f5bb49536ffa238d6f439bee770205b12a1879ae966e19f7391cf213f8f5c213"
---
# REST API Conventions

## When This Activates

Activates when diffs touch HTTP route definitions, controller methods, response status code handling, URL path definitions, or OpenAPI/Swagger specifications. REST (Representational State Transfer) relies on uniform interface constraints -- resources identified by URIs, standard HTTP methods with defined semantics, proper status codes, and stateless interactions. Violating these conventions makes APIs unpredictable, harder to cache, difficult to document, and fragile to integrate with. This reviewer detects misuse of HTTP methods, wrong status codes, non-resource URLs, missing pagination, and naming inconsistencies visible in the diff.

## Audit Surface

- [ ] GET endpoint that mutates state or triggers side effects
- [ ] POST used for retrieval instead of GET
- [ ] PUT or PATCH handler that does not return 200 or 204 on success
- [ ] DELETE handler returning 200 with a body instead of 204 No Content
- [ ] POST creation endpoint not returning 201 Created with Location header
- [ ] Route path containing a verb instead of a resource noun (e.g., /getUsers, /createOrder)
- [ ] List endpoint returning unbounded results with no pagination parameters
- [ ] Inconsistent field casing across request/response bodies in the same API
- [ ] Inconsistent plural/singular resource naming across endpoints
- [ ] Catch-all error handler returning 200 OK with error details in body
- [ ] Missing 404 response when a resource is not found -- returns 200 with null
- [ ] Missing 409 Conflict for concurrent modification or duplicate creation
- [ ] PATCH endpoint requiring the full resource instead of partial update
- [ ] Nested resource URL deeper than /resources/{id}/sub-resources/{id}
- [ ] Endpoint missing Content-Type negotiation or ignoring Accept header
- [ ] Non-idempotent PUT -- calling PUT twice produces different results

## Detailed Checks

### HTTP Method Semantics
<!-- activation: keywords=["GET", "POST", "PUT", "PATCH", "DELETE", "app.get", "app.post", "app.put", "app.delete", "@GetMapping", "@PostMapping", "@PutMapping", "@DeleteMapping", "router.get", "router.post"] -->

- [ ] **GET with side effects**: flag GET handlers that write to a database, send emails, trigger jobs, or mutate any state -- GET must be safe (no side effects) and idempotent per RFC 7231. Caches, crawlers, and prefetch mechanisms assume GET is safe
- [ ] **POST for retrieval**: flag POST endpoints whose sole purpose is returning data that could be a GET with query parameters -- POST prevents caching and violates uniform interface. Exception: complex search with large query bodies may legitimately use POST
- [ ] **Non-idempotent PUT**: flag PUT handlers that append, increment, or conditionally modify instead of replacing the full resource -- PUT must be idempotent (multiple identical requests produce the same result as a single one)
- [ ] **PATCH as full replace**: flag PATCH endpoints that require the entire resource body instead of accepting partial updates -- this is PUT semantics under a PATCH method
- [ ] **DELETE with required body**: flag DELETE endpoints that require a request body for identification -- the resource should be identified by the URL alone

### Status Code Correctness
<!-- activation: keywords=["status", "statusCode", "res.status", "HttpStatus", "StatusCode", "200", "201", "204", "400", "401", "403", "404", "409", "422", "500"] -->

- [ ] **200 for creation**: flag POST creation handlers returning 200 instead of 201 Created -- clients rely on 201 to confirm resource creation, and the Location header should contain the new resource URI
- [ ] **200 for deletion**: flag DELETE handlers returning 200 with the deleted resource body instead of 204 No Content -- 204 signals success without response body overhead
- [ ] **200 for errors**: flag error responses wrapped in a 200 OK with an error flag in the body (`{ "success": false, "error": "..." }`) -- this prevents HTTP-aware clients, proxies, and monitoring from detecting failures
- [ ] **500 for client errors**: flag handlers returning 500 for validation failures, missing fields, or bad input -- these are 400 (Bad Request), 422 (Unprocessable Entity), or 409 (Conflict)
- [ ] **Missing 404 on not found**: flag handlers returning 200 with null or empty body when a resource does not exist -- return 404 Not Found

### Resource-Oriented URL Design
<!-- activation: keywords=["route", "path", "url", "endpoint", "/api", "router", "prefix", "mapping"] -->

- [ ] **Verb in URL path**: flag route paths containing action verbs (`/getUser`, `/createOrder`, `/deleteItem`, `/updateProfile`) -- REST uses HTTP methods to express the action; URLs should be nouns identifying resources (`/users`, `/orders/{id}`)
- [ ] **Singular collection name**: flag collection endpoints using singular nouns (`/user` for the list) when other endpoints use plural -- pick one convention (plural is standard) and apply it consistently
- [ ] **Deep nesting**: flag URLs nested deeper than two resource levels (`/orgs/{id}/teams/{id}/members/{id}/roles`) -- deep nesting makes URLs fragile and hard to maintain. Flatten by promoting sub-resources to top-level with filters
- [ ] **ID in URL and body**: flag endpoints that accept a resource ID in both the URL path and the request body -- the URL is the canonical identifier; duplicating it creates inconsistency

### Pagination on Collections
<!-- activation: keywords=["list", "find", "search", "all", "index", "page", "limit", "offset", "cursor", "paginate", "per_page"] -->

- [ ] **Unbounded list**: flag collection endpoints that return all records with no pagination parameters -- this is both a performance risk and a usability issue as data grows
- [ ] **No total count or next page indicator**: flag paginated responses missing total count, next page link, or has_more flag -- clients cannot build pagination UI without knowing if more data exists
- [ ] **No max page size**: flag pagination that accepts a client-provided page size with no server-enforced upper bound -- `?limit=1000000` bypasses pagination intent. See `sec-rate-limit-and-dos`
- [ ] **Inconsistent pagination style**: flag APIs using offset-based pagination on some endpoints and cursor-based on others without clear rationale -- consistency reduces client complexity

### Naming and Consistency
<!-- activation: keywords=["name", "field", "property", "key", "case", "camel", "snake", "kebab", "response", "request", "body", "json"] -->

- [ ] **Mixed field casing**: flag request or response bodies that mix camelCase and snake_case field names within the same API -- pick one convention and enforce it globally
- [ ] **Inconsistent resource names**: flag endpoints where some resources are plural (`/users`) and others singular (`/order`) -- apply a consistent pluralization strategy
- [ ] **Boolean naming**: flag boolean fields with ambiguous names (`status`, `flag`) instead of predicate-style names (`is_active`, `has_access`) -- ambiguous names force consumers to guess the type
- [ ] **Date format inconsistency**: flag APIs returning dates in multiple formats (Unix timestamps, ISO 8601, locale strings) across different endpoints -- standardize on ISO 8601 (RFC 3339)

## Common False Positives

- **RPC-style endpoints by design**: some APIs intentionally use RPC-style URLs (`/rpc/send-email`, `/actions/calculate-tax`) for operations that do not map cleanly to CRUD on a resource. This is valid when documented as non-RESTful.
- **GraphQL or gRPC endpoints**: non-REST APIs served over HTTP use POST by design. Do not flag these as REST violations.
- **Bulk operations**: `POST /users/bulk-create` or `DELETE /users/bulk` are pragmatic deviations from pure REST for batch efficiency.
- **Search endpoints using POST**: complex search queries with large filter objects may legitimately use POST to avoid URL length limits. Verify the body is genuinely too complex for query parameters.
- **Framework conventions**: some frameworks (Rails, Django) have conventional URL patterns that differ from textbook REST. Verify against the project's adopted conventions before flagging.

## Severity Guidance

| Finding | Severity |
|---|---|
| GET endpoint that mutates state (database write, payment, email) | Critical |
| All errors returned as 200 OK with error flag in body | Critical |
| PUT endpoint not idempotent (append/increment behavior) | Important |
| POST creation endpoint returning 200 instead of 201 | Important |
| List endpoint with no pagination support | Important |
| Verb-based URL paths across the API | Important |
| Mixed field casing (camelCase and snake_case) in same API | Minor |
| DELETE returning 200 with body instead of 204 | Minor |
| Inconsistent plural/singular resource naming | Minor |
| Date format inconsistency across endpoints | Minor |

## See Also

- `principle-solid` -- Interface Segregation applies to API design; clients should not depend on endpoints they do not use
- `principle-coupling-cohesion` -- REST resource boundaries should reflect cohesive domain concepts, not database tables
- `principle-naming-and-intent` -- URL paths and field names should clearly communicate the resource and its structure
- `api-versioning-deprecation` -- versioning strategy for REST APIs when breaking changes are needed
- `api-problem-json-rfc7807` -- standardized error response format for REST APIs
- `api-openapi-asyncapi-schema` -- OpenAPI spec should match implementation
- `sec-rate-limit-and-dos` -- pagination and request size limits protect against resource exhaustion

## Authoritative References

- [RFC 7231: HTTP/1.1 Semantics and Content -- Method Definitions](https://datatracker.ietf.org/doc/html/rfc7231#section-4)
- [RFC 7231: HTTP/1.1 Semantics and Content -- Status Codes](https://datatracker.ietf.org/doc/html/rfc7231#section-6)
- [RFC 5789: PATCH Method for HTTP](https://datatracker.ietf.org/doc/html/rfc5789)
- [Microsoft REST API Guidelines](https://github.com/microsoft/api-guidelines/blob/vNext/Guidelines.md)
- [Google API Design Guide -- Resource-Oriented Design](https://cloud.google.com/apis/design/resources)
- [Zalando RESTful API Guidelines](https://opensource.zalando.com/restful-api-guidelines/)
