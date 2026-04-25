---
id: api-problem-json-rfc7807
type: primary
depth_role: leaf
focus: Detect inconsistent API error formats, missing RFC 7807 Problem Details fields, internal detail leakage, and non-standard error response shapes
parents:
  - index.md
covers:
  - API error responses not following RFC 7807 Problem Details structure
  - Error response missing required type, title, or status fields
  - Error detail field leaking stack traces, SQL queries, or internal paths
  - Inconsistent error shapes across different endpoints in the same API
  - Error type URI not a dereferenceable URL or not stable
  - Missing instance field for correlating specific error occurrences
  - Non-standard error fields outside the RFC 7807 extension mechanism
  - "Error response Content-Type not set to application/problem+json"
tags:
  - error
  - error-handling
  - rfc7807
  - rfc9457
  - problem-details
  - problem-json
  - api
  - rest
  - status-code
  - security
activation:
  file_globs:
    - "**/*error*"
    - "**/*exception*"
    - "**/*problem*"
    - "**/*handler*"
    - "**/*middleware*"
    - "**/*filter*"
    - "**/*response*"
    - "**/*controller*"
  keyword_matches:
    - error
    - problem
    - exception
    - ProblemDetail
    - ProblemDetails
    - "application/problem+json"
    - rfc7807
    - rfc9457
    - type
    - title
    - status
    - detail
    - instance
    - stack
    - trace
    - message
  structural_signals:
    - Error response object construction
    - Exception handler or error middleware
    - Content-Type header set for error responses
source:
  origin: file
  path: api-problem-json-rfc7807.md
  hash: "sha256:3320d4223b34647f3cbf0041c1a3553f872c210b1f0131b23f1b81031dbd755b"
---
# RFC 7807 Problem Details for HTTP APIs

## When This Activates

Activates when diffs touch error response construction, exception handlers, error middleware, or API error documentation. RFC 7807 (updated by RFC 9457) defines a standard format for machine-readable error responses in HTTP APIs -- Problem Details. Without a standard error format, every API invents its own shape (`{ error: string }`, `{ message, code }`, `{ errors: [] }`), forcing each client to implement custom parsing per API. Worse, ad-hoc error responses frequently leak stack traces, SQL queries, and server paths. This reviewer detects non-standard error formats, missing Problem Details fields, and internal information leakage in error responses.

## Audit Surface

- [ ] Error response body with ad-hoc shape (e.g., { error: string } or { message: string })
- [ ] Error response missing type field (URI identifying the error kind)
- [ ] Error response missing title field (short human-readable summary)
- [ ] Error response missing status field (HTTP status code in body)
- [ ] Error detail field containing stack trace, SQL query, file path, or server hostname
- [ ] Different error formats across endpoints (some return { error }, others { errors: [] })
- [ ] Error type field using non-URI values (error codes, enum strings)
- [ ] Error response served with application/json instead of application/problem+json
- [ ] Missing instance field for unique error occurrence tracking
- [ ] Validation errors not using RFC 7807 extension fields consistently
- [ ] Error response exposing internal service names or infrastructure details
- [ ] Generic 500 error body with no type classification

## Detailed Checks

### Problem Details Structure
<!-- activation: keywords=["error", "problem", "ProblemDetail", "type", "title", "status", "detail", "instance", "response", "body", "json"] -->

- [ ] **Missing type field**: flag error responses without a `type` member -- the type is a URI that identifies the kind of problem and should be dereferenceable (returning documentation about the error). Without it, clients cannot programmatically categorize errors. When no specific type is defined, use `"about:blank"` and let the `title` match the HTTP status phrase
- [ ] **Missing title field**: flag error responses without a `title` member -- the title is a short, human-readable summary of the problem type. It should be the same for all occurrences of the same problem type
- [ ] **Missing status field**: flag error responses without a `status` member -- including the HTTP status code in the body ensures the status is available even when intermediaries (proxies, gateways) modify the HTTP status line
- [ ] **Inconsistent error shape**: flag APIs where different endpoints return different error structures -- one returns `{ error: "msg" }`, another returns `{ message: "msg", code: 123 }`, a third returns `{ errors: [{...}] }`. Standardize on Problem Details across all endpoints
- [ ] **Non-URI type value**: flag `type` fields containing error codes (`"VALIDATION_ERROR"`), enum strings, or integers instead of URIs -- the specification requires a URI reference

### Internal Information Leakage
<!-- activation: keywords=["stack", "trace", "stackTrace", "traceback", "sql", "query", "path", "file", "line", "server", "hostname", "internal", "debug", "exception"] -->

- [ ] **Stack trace in detail**: flag error responses where the `detail` field or any response field contains a stack trace -- stack traces reveal framework versions, file paths, and code structure to attackers. Log the full trace server-side, return a sanitized message to clients. See `sec-owasp-a01-broken-access-control`
- [ ] **SQL query in error**: flag error responses containing SQL queries or database error messages -- these reveal table names, column names, and query structure, enabling SQL injection refinement
- [ ] **File path or line number**: flag error responses containing server file paths (`/app/src/controllers/UserController.java:42`) -- internal paths reveal the technology stack and directory structure
- [ ] **Internal service names**: flag error responses that reference internal service names, hostnames, or IP addresses (`upstream service payment-service-prod-3 returned 503`) -- this leaks infrastructure topology
- [ ] **Debug mode in production**: flag error handlers that include debug information (full exception details, request dump) based on environment without verifying the environment is not production

### Validation Error Extension
<!-- activation: keywords=["validation", "validate", "invalid", "field", "errors", "constraint", "required", "format", "minimum", "maximum"] -->

- [ ] **Validation errors not structured**: flag validation error responses that return a flat error string instead of structured field-level errors -- clients need to know which fields failed and why. Use RFC 7807 extension members (e.g., `errors` array with `pointer` and `detail` per field)
- [ ] **No field pointer**: flag validation error details that describe the error without indicating which request field caused it -- use JSON Pointer (RFC 6901) or field name to identify the failing field
- [ ] **Missing error-per-field**: flag validation that returns only the first error found instead of all validation errors -- users must fix and resubmit for each error sequentially, degrading the experience

### Content-Type and Media Type
<!-- activation: keywords=["Content-Type", "content-type", "media", "application/problem+json", "application/json", "header", "accept"] -->

- [ ] **Wrong Content-Type**: flag error responses served with `application/json` instead of `application/problem+json` when the body follows RFC 7807 structure -- the media type signals to clients that the body is a Problem Details document, enabling generic error handling middleware
- [ ] **Missing Content-Type on errors**: flag error responses with no Content-Type header set -- without it, clients cannot determine the response format

### Correlation and Debugging
<!-- activation: keywords=["instance", "correlation", "request", "id", "trace", "tracking", "reference", "occurr"] -->

- [ ] **Missing instance field**: flag error responses without an `instance` member -- the instance is a URI reference that identifies the specific occurrence of the problem (e.g., a request ID or error log reference). Without it, correlating a client-reported error to server logs requires manual timestamp matching
- [ ] **No correlation to logs**: flag error responses that provide no mechanism (instance URI, request ID header, error reference code) for the client to reference when contacting support -- "I got a 500 error" is not actionable without a correlation identifier

## Common False Positives

- **APIs not adopting RFC 7807**: RFC 7807 is a recommendation, not a mandate. APIs that intentionally use a different error format (GraphQL errors, JSON:API errors) should not be flagged. This reviewer applies when the project has adopted or should adopt Problem Details.
- **GraphQL error format**: GraphQL has its own error specification (`{ errors: [{ message, locations, path }] }`). Do not apply RFC 7807 rules to GraphQL responses.
- **JSON:API error format**: JSON:API defines its own error structure (`{ errors: [{ status, title, detail, source }] }`). This is a valid standard and should not be flagged as non-compliant.
- **Framework-provided error handling**: frameworks like Spring Boot (`ProblemDetail`), ASP.NET (`ProblemDetails`), FastAPI automatically produce RFC 7807 responses. Verify the framework configuration rather than flagging custom error handlers.
- **about:blank type**: using `"about:blank"` as the type is valid per the specification when no specific error type URI is defined -- the title should then match the HTTP status phrase.

## Severity Guidance

| Finding | Severity |
|---|---|
| Stack trace exposed in production error response | Critical |
| SQL query or database error message in error response | Critical |
| Internal file paths or server hostnames in error response | Important |
| Inconsistent error formats across API endpoints | Important |
| Error response missing type, title, and status fields | Important |
| Debug mode enabled in production error handler | Important |
| Validation errors returned as flat string instead of structured | Minor |
| Error response using application/json instead of application/problem+json | Minor |
| Missing instance field for error correlation | Minor |
| Non-URI type value in Problem Details | Minor |

## See Also

- `sec-owasp-a01-broken-access-control` -- error responses leaking internals is an information disclosure risk
- `principle-fail-fast` -- standardized error responses help clients fail fast on errors instead of misinterpreting responses
- `principle-least-astonishment` -- consistent error formats across an API follow the principle of least surprise
- `api-rest` -- proper HTTP status codes complement Problem Details structure
- `api-openapi-asyncapi-schema` -- error response schemas in OpenAPI should reference the Problem Details structure

## Authoritative References

- [RFC 9457: Problem Details for HTTP APIs (2023, obsoletes RFC 7807)](https://datatracker.ietf.org/doc/html/rfc9457)
- [RFC 7807: Problem Details for HTTP APIs (2016, original)](https://datatracker.ietf.org/doc/html/rfc7807)
- [RFC 6901: JavaScript Object Notation (JSON) Pointer](https://datatracker.ietf.org/doc/html/rfc6901)
- [IANA Problem Types Registry](https://www.iana.org/assignments/http-problem-types/http-problem-types.xhtml)
- [Spring Boot -- Problem Details Support](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-ann-rest-exceptions.html)
- [ASP.NET Core -- Problem Details](https://learn.microsoft.com/en-us/aspnet/core/web-api/handle-errors)
