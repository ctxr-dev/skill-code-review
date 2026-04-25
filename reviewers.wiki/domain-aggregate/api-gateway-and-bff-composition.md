---
id: api-gateway-and-bff-composition
type: primary
depth_role: leaf
focus: Detect API gateway and BFF anti-patterns including business logic in the gateway, missing gateway-level rate limiting, aggregation timeout issues, and incorrect auth delegation
parents:
  - index.md
covers:
  - API gateway containing business logic instead of pure routing and composition
  - Missing rate limiting at the gateway level
  - Aggregation calls to backend services with no timeout or circuit breaker
  - Gateway performing authentication but not delegating authorization to services
  - BFF coupling to multiple unrelated frontend clients
  - Gateway transforming response shapes with complex domain logic
  - No request correlation ID propagated through the gateway
  - Gateway becoming a single point of failure with no redundancy
  - "Missing request/response logging at the gateway layer"
  - "BFF containing business rules, validation, or domain logic (should delegate to backend services)"
  - BFF serving multiple frontends instead of being specific to one
  - BFF growing into a monolith that aggregates all backend services
  - BFF performing data persistence or owning state
  - BFF duplicating logic already present in backend services
  - BFF with no clear frontend consumer
  - "BFF making excessive backend calls (chatty BFF)"
  - BFF leaking backend service internals to the frontend
  - "BFF handling authentication/authorization that should be centralized"
  - BFF with shared code across multiple BFF instances
tags:
  - api-gateway
  - bff
  - backend-for-frontend
  - gateway
  - composition
  - aggregation
  - routing
  - rate-limiting
  - authentication
  - authorization
  - proxy
  - frontend
  - api
  - architecture
aliases:
  - arch-bff-backend-for-frontend
activation:
  file_globs:
    - "**/*gateway*"
    - "**/*bff*"
    - "**/*proxy*"
    - "**/*aggregat*"
    - "**/*composit*"
    - "**/*kong*"
    - "**/*envoy*"
    - "**/*nginx*"
    - "**/*traefik*"
    - "**/*apigee*"
    - "**/*zuul*"
    - "**/*ocelot*"
  keyword_matches:
    - gateway
    - Gateway
    - BFF
    - bff
    - proxy
    - aggregate
    - compose
    - composition
    - upstream
    - downstream
    - backend
    - frontend
    - route
    - forward
    - Kong
    - Envoy
    - nginx
    - Traefik
    - Apigee
    - Zuul
    - Ocelot
  structural_signals:
    - API gateway route configuration
    - Request aggregation across multiple backend services
    - Proxy or forwarding middleware setup
source:
  origin: file
  path: api-gateway-and-bff-composition.md
  hash: "sha256:c807824c33ef93dad2bd2da2821683fead9e9cd0e2b812dd713fc9586b637aec"
---
# API Gateway and BFF Composition

## When This Activates

Activates when diffs touch API gateway configuration, BFF (Backend for Frontend) composition logic, request routing rules, response aggregation code, or proxy middleware. API gateways and BFFs sit between clients and backend services, handling cross-cutting concerns (auth, rate limiting, routing) and response composition. When these layers absorb business logic, they become bottlenecks that are hard to test, scale, and deploy independently. When they lack resilience patterns, a single slow backend brings down all clients. This reviewer detects gateway layer anti-patterns and missing infrastructure concerns.

## Audit Surface

- [ ] Gateway route handler containing conditional business logic (if/switch on domain state)
- [ ] Gateway configuration with no rate limit or throttle rules
- [ ] Gateway aggregation call to backend service with no timeout configured
- [ ] Gateway performing role-based authorization instead of delegating to backend services
- [ ] BFF serving multiple frontend platforms (web, mobile, TV) with a single composition
- [ ] Gateway response transformer with complex data mapping or calculation logic
- [ ] Gateway not injecting or propagating X-Request-ID or correlation headers
- [ ] Single gateway instance with no horizontal scaling or failover
- [ ] Gateway not logging request method, path, status, and latency
- [ ] Gateway aggregating calls sequentially instead of in parallel where possible
- [ ] Gateway caching responses without cache invalidation strategy
- [ ] Gateway stripping authorization headers before forwarding to backend
- [ ] Gateway retry logic without idempotency check on the underlying operation
- [ ] Backend service exposing endpoints that should only be accessible through the gateway

## Detailed Checks

### Business Logic Leakage
<!-- activation: keywords=["if", "switch", "case", "condition", "rule", "logic", "calculate", "transform", "map", "filter", "validate", "domain", "business"] -->

- [ ] **Domain logic in gateway**: flag gateway handlers that contain business rules, domain validation, data calculations, or conditional logic based on domain state -- the gateway should route, authenticate, rate-limit, and compose, not implement business rules. Business logic belongs in backend services
- [ ] **Complex response transformation**: flag gateway response transformers that reshape, merge, or compute derived fields from backend responses -- simple field renaming and filtering are acceptable, but transformations involving business rules (pricing calculations, eligibility checks, data enrichment from domain knowledge) should be in backend services
- [ ] **Gateway-specific data model**: flag gateway code that defines its own domain entities or data models beyond simple DTOs -- the gateway should pass through or compose backend responses, not maintain a parallel domain model
- [ ] **Validation beyond format checking**: flag request validation in the gateway that goes beyond format/type checking (checking business constraints, cross-field validation, database lookups) -- format validation is appropriate; business validation belongs downstream

### Rate Limiting at Gateway
<!-- activation: keywords=["rate", "limit", "throttle", "quota", "requests", "per", "second", "minute", "429", "too many", "abuse", "ddos", "protection"] -->

- [ ] **No rate limiting**: flag gateway configurations with no rate limiting, throttling, or quota enforcement -- the gateway is the single entry point and the natural place to enforce rate limits before requests reach backend services. See `sec-rate-limit-and-dos`
- [ ] **Uniform rate limit**: flag gateways applying the same rate limit to all endpoints -- different endpoints have different cost profiles. Authentication endpoints, search endpoints, and mutation endpoints should have separate, appropriately sized limits
- [ ] **Rate limit without identification**: flag rate limiters that only use IP address without also considering authenticated user identity -- IP-only limits are bypassed by distributed attacks and unfairly penalize users behind shared NATs
- [ ] **No 429 response**: flag rate limiting that silently drops requests or returns 503 instead of 429 Too Many Requests with Retry-After header -- clients need 429 to implement proper backoff

### Aggregation Resilience
<!-- activation: keywords=["aggregate", "compose", "parallel", "Promise.all", "Promise.allSettled", "concurrent", "timeout", "circuit", "breaker", "fallback", "retry", "downstream"] -->

- [ ] **No aggregation timeout**: flag gateway calls to backend services with no timeout -- a slow or unresponsive backend blocks the entire aggregated response. Set per-service timeouts appropriate for the SLA
- [ ] **No circuit breaker**: flag gateway aggregation with no circuit breaker on backend calls -- when a backend is down, the gateway should fail fast instead of waiting for timeouts on every request. See `principle-fail-fast`
- [ ] **Sequential when parallel is possible**: flag gateway aggregation that calls backend services sequentially when the calls are independent -- parallel calls reduce total latency to the maximum single call duration instead of the sum
- [ ] **All-or-nothing aggregation**: flag gateway composition using `Promise.all` or equivalent that fails the entire response when a single backend fails -- use `Promise.allSettled` or partial response patterns to return available data and signal degraded backends
- [ ] **Retry on non-idempotent calls**: flag gateway retry logic that retries POST/mutation calls to backends without verifying idempotency -- retrying a non-idempotent operation can cause duplicate processing

### Authentication and Authorization Delegation
<!-- activation: keywords=["auth", "token", "jwt", "session", "header", "forward", "propagate", "delegate", "verify", "authorize", "permission", "role", "identity"] -->

- [ ] **Gateway doing fine-grained authorization**: flag gateway code performing role-based or resource-level authorization checks -- the gateway should verify authentication (is this a valid token/session?) and delegate authorization (does this user have access to this resource?) to backend services that own the domain context
- [ ] **Stripping auth headers**: flag gateway configurations that strip Authorization or authentication headers before forwarding to backend services -- backends need the identity context for authorization decisions
- [ ] **No identity propagation**: flag gateways that authenticate the user but do not forward user identity (JWT, user ID header, mutual TLS client cert) to backend services -- backends cannot make authorization decisions without knowing the caller
- [ ] **Token validation without clock skew tolerance**: flag JWT validation in the gateway with no clock skew tolerance -- distributed systems have clock drift; allow a small window (30-60 seconds) for token expiration checks

### BFF Design
<!-- activation: keywords=["bff", "BFF", "frontend", "mobile", "web", "client", "platform", "device", "experience", "composition"] -->

- [ ] **Universal BFF**: flag a single BFF serving multiple distinct frontend platforms (web app, mobile app, TV app) -- each platform has different data needs, payload size constraints, and UX requirements. Create separate BFFs per platform (or per team) as the pattern intends
- [ ] **BFF without ownership**: flag BFFs maintained by a backend team rather than the frontend team that consumes them -- the BFF should be owned by the frontend team so they can evolve it without cross-team coordination
- [ ] **BFF calling other BFFs**: flag BFFs that call other BFFs instead of backend services -- this creates a chain of composition layers with compounding latency and failure modes

### Observability
<!-- activation: keywords=["log", "trace", "metric", "monitor", "correlation", "request-id", "X-Request-ID", "latency", "status", "error", "observe"] -->

- [ ] **No request correlation**: flag gateways that do not generate or propagate a correlation ID (X-Request-ID, X-Correlation-ID) through all backend calls -- without correlation, tracing a user request through the system requires manual log matching
- [ ] **No gateway logging**: flag gateways with no access logging (method, path, status code, latency) -- the gateway is the first point of contact for all requests; its logs are essential for debugging, alerting, and SLA tracking

## Common False Positives

- **Gateway as configuration-only (Kong, Apigee, AWS API Gateway)**: managed gateways handle rate limiting, auth, and routing through configuration rather than code. Verify the configuration exists rather than flagging missing code-level implementation.
- **GraphQL gateway / federation router**: Apollo Router, Cosmo Router, and similar tools are specialized gateways with built-in composition. Apply `api-federation-apollo` rules, not generic gateway rules.
- **Service mesh sidecar**: Istio, Linkerd, and service mesh sidecars handle many gateway concerns (mTLS, rate limiting, retries) transparently. Verify the mesh configuration rather than flagging missing application-level patterns.
- **Simple reverse proxy**: a gateway that purely proxies requests (nginx reverse proxy with no aggregation) does not need aggregation resilience patterns. Apply only routing, rate limiting, and auth concerns.

## Severity Guidance

| Finding | Severity |
|---|---|
| Gateway containing domain business logic (validation, rules, calculations) | Critical |
| No rate limiting at gateway level on public-facing API | Critical |
| Gateway stripping auth headers, preventing backend authorization | Critical |
| Aggregation call to backend with no timeout | Important |
| No circuit breaker on backend calls from gateway | Important |
| Sequential aggregation where parallel is possible | Important |
| No request correlation ID propagation | Important |
| Gateway performing fine-grained authorization instead of delegating | Important |
| BFF serving multiple unrelated frontend platforms | Minor |
| Gateway retry on non-idempotent operations | Minor |
| No gateway access logging | Minor |

## See Also

- `sec-rate-limit-and-dos` -- rate limiting is a primary gateway responsibility
- `sec-owasp-a01-broken-access-control` -- authentication at gateway and authorization delegation to services
- `principle-solid` -- Single Responsibility: the gateway handles cross-cutting concerns, not business logic
- `principle-coupling-cohesion` -- BFFs should be cohesive to their frontend platform, not coupled to all platforms
- `principle-fail-fast` -- circuit breakers and timeouts in the gateway enable fast failure
- `arch-microservices` -- gateways and BFFs are key patterns in microservices architecture
- `api-federation-apollo` -- GraphQL federation gateway is a specialized case of API composition

## Authoritative References

- [Sam Newman, *Building Microservices* (2nd ed., 2021) -- Chapter 8: "Build a Deployment Pipeline", BFF Pattern](https://www.oreilly.com/library/view/building-microservices-2nd/9781492034018/)
- [Phil Calçado, "The Backend for Frontend Pattern (BFF)" (2015)](https://philcalcado.com/2015/09/18/the_back_end_for_front_end_pattern_bff.html)
- [Chris Richardson, "Pattern: API Gateway / Backends for Frontends"](https://microservices.io/patterns/apigateway.html)
- [Microsoft -- Gateway Aggregation Pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/gateway-aggregation)
- [Kong API Gateway Documentation](https://docs.konghq.com/)
