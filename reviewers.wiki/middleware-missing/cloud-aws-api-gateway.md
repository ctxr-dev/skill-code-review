---
id: cloud-aws-api-gateway
type: primary
depth_role: leaf
focus: Detect API Gateway misconfigurations including missing authorizers, absent WAF integration, permissive CORS, missing throttling, and request validation gaps
parents:
  - index.md
covers:
  - Missing authorizer on API routes
  - Missing WAF association
  - Missing usage plan and throttling configuration
  - Missing request validation on methods
  - CORS wildcard origin with credentials
  - Stage variables containing secrets
  - Missing access logging on stage
  - Binary media types misconfigured
  - Missing API caching
  - HTTP API vs REST API wrong choice for requirements
tags:
  - aws
  - api-gateway
  - rest-api
  - http-api
  - authorizer
  - waf
  - cors
  - throttling
  - caching
  - validation
activation:
  file_globs:
    - "**/*.tf"
    - "**/*.json"
    - "**/*.yaml"
    - "**/*.yml"
    - "**/cdk.*"
  keyword_matches:
    - ApiGateway
    - API Gateway
    - RestApi
    - HttpApi
    - WebSocket
    - Stage
    - Authorizer
    - UsagePlan
    - ThrottlingBurstLimit
    - WAF
  structural_signals:
    - api_gateway_route_no_auth
    - missing_waf
    - cors_wildcard_credentials
source:
  origin: file
  path: cloud-aws-api-gateway.md
  hash: "sha256:1af8df8da9d7e05e3354a2680edf533b61b5c49b760b61ca94154fac41afd765"
---
# AWS API Gateway

## When This Activates

Activates when diffs contain API Gateway REST API, HTTP API, or WebSocket API definitions in Terraform, CloudFormation, SAM, or CDK. API Gateway is the front door to backend services -- a missing authorizer exposes internal APIs to the internet, absent WAF leaves the API vulnerable to common web attacks, and missing throttling allows a single client to exhaust backend capacity. This reviewer catches the configuration gaps between "it works" and "it's production-ready."

## Audit Surface

- [ ] Route or method with `AuthorizationType: NONE` on a non-public endpoint
- [ ] REST API stage with no WAF WebACL association
- [ ] API with no usage plan or throttling configuration
- [ ] Method with no request validator or request model
- [ ] CORS with `AllowOrigins: "*"` and `AllowCredentials: true`
- [ ] Stage variables containing secret values
- [ ] Stage with no access log settings
- [ ] Binary media types missing for file upload endpoints
- [ ] Cache not enabled on frequently-called GET endpoints
- [ ] HTTP API used when WAF, validation, or caching is required
- [ ] Missing custom domain with TLS 1.2 minimum
- [ ] API key used as sole authentication mechanism
- [ ] Missing resource policy on private API
- [ ] Default gateway responses leaking internal error details

## Detailed Checks

### Authorization and Authentication
<!-- activation: keywords=["Authorizer", "AuthorizationType", "NONE", "COGNITO", "CUSTOM", "JWT", "IAM", "ApiKey", "api_key_required"] -->

- [ ] **Missing authorizer**: flag routes or methods with `AuthorizationType: NONE` that are not intentionally public (health checks, webhooks with signature validation) -- unauthenticated endpoints are the most common API Gateway misconfiguration
- [ ] **API key as sole auth**: flag APIs where API keys are the only authentication mechanism -- API keys are for throttling and metering, not security; they are easily leaked and provide no identity
- [ ] **Missing JWT audience/issuer validation**: flag JWT authorizers (HTTP API) without audience or issuer claims configured -- without these, any valid JWT from the identity provider is accepted regardless of intended audience
- [ ] **Cognito authorizer without scopes**: flag Cognito authorizers that do not specify required OAuth scopes on the method -- any authenticated user can access any route

### WAF and DDoS Protection
<!-- activation: keywords=["WAF", "WebACL", "waf", "web_acl", "firewall", "wafv2"] -->

- [ ] **No WAF on REST API**: flag REST API stages without an associated AWS WAF WebACL -- WAF provides protection against SQL injection, XSS, and rate-based rules at the edge; HTTP APIs do not support WAF, which influences API type selection
- [ ] **HTTP API chosen when WAF needed**: flag HTTP API usage for public-facing APIs that need WAF protection -- HTTP APIs do not support WAF; use REST API or place CloudFront with WAF in front

### Throttling and Usage Plans
<!-- activation: keywords=["UsagePlan", "Throttle", "ThrottlingBurstLimit", "ThrottlingRateLimit", "quota", "rate_limit", "usage_plan"] -->

- [ ] **No usage plan**: flag APIs without a usage plan -- without one, all consumers share the account-level default throttle (10,000 RPS), and a single client can starve others
- [ ] **No method-level throttling**: flag APIs with account-level throttling only but no method-level overrides on expensive endpoints (POST, PUT, batch operations) -- uniform throttling does not protect slow backends
- [ ] **Missing burst limit**: flag throttle configurations with a rate limit but no burst limit -- bursts can spike 2-5x above the rate limit and overwhelm backends

### Request Validation and CORS
<!-- activation: keywords=["RequestValidator", "RequestModel", "request_validator", "CORS", "cors", "AllowOrigins", "AllowCredentials", "Access-Control"] -->

- [ ] **No request validation**: flag methods with no request validator or request model -- malformed requests pass through to Lambda, wasting compute and complicating error handling; validate at the gateway
- [ ] **CORS wildcard with credentials**: flag CORS configuration with `AllowOrigins: "*"` combined with `AllowCredentials: true` -- browsers reject this combination, and it signals a misconfiguration that may lead to relaxing CORS further
- [ ] **Overly permissive CORS origins**: flag CORS configuration allowing origins that do not match the application's known domains -- attackers on allowed origins can make credentialed cross-origin requests

### Logging and Observability
<!-- activation: keywords=["AccessLogSettings", "access_log", "MethodSettings", "LoggingLevel", "CloudWatch", "stage", "Stage"] -->

- [ ] **No access logging**: flag stages without `AccessLogSettings` pointing to a CloudWatch Logs group or Firehose -- without access logs, you cannot investigate abuse, debug errors, or audit API usage
- [ ] **Missing execution logging**: flag REST API stages without `MethodSettings` enabling CloudWatch execution logging -- execution logs capture request/response details essential for debugging
- [ ] **Default gateway responses**: flag APIs with no custom `GatewayResponses` -- default responses can leak internal error messages, stack traces, or integration details to clients

### Caching and Performance
<!-- activation: keywords=["CachingEnabled", "CacheClusterEnabled", "CacheClusterSize", "cache", "ttl", "CacheTtlInSeconds"] -->

- [ ] **No caching on GET endpoints**: flag frequently-called GET endpoints with no cache configuration -- API Gateway caching reduces backend load and latency; even a 60-second TTL helps
- [ ] **Cache without invalidation strategy**: flag API caching enabled but no `Cache-Control` header handling or manual invalidation mechanism -- stale cache responses can serve outdated data
- [ ] **Cache key not including authorization**: flag caching enabled on authorized endpoints without including authorization header in the cache key -- responses for one user may be served to another

## Common False Positives

- **Health check endpoints**: `/health` or `/ping` endpoints intentionally have no authorizer. Verify they return no sensitive data.
- **Webhook receivers**: endpoints receiving webhooks from third parties (Stripe, GitHub) use signature validation in the Lambda, not API Gateway authorizers.
- **Internal APIs behind VPC Link**: APIs accessible only via VPC Link may not need WAF if the VPC has its own network security controls.

## Severity Guidance

| Finding | Severity |
|---|---|
| Missing authorizer on non-public route | Critical |
| CORS wildcard origin with credentials | Critical |
| Stage variables containing secrets | Critical |
| No WAF on public-facing REST API | Important |
| No usage plan or throttling | Important |
| No request validation | Important |
| No access logging on stage | Important |
| API key as sole authentication | Important |
| No caching on high-traffic GET endpoints | Minor |
| Default gateway responses not customized | Minor |

## See Also

- `sec-owasp-a01-broken-access-control` -- missing authorizers are broken access control
- `sec-owasp-a05-misconfiguration` -- API Gateway misconfiguration patterns
- `cloud-aws-lambda` -- Lambda is the most common API Gateway integration target
- `cloud-aws-iam-least-privilege` -- IAM authorizers use IAM policies for access control
- `sec-rate-limit-and-dos` -- throttling configuration prevents denial of service

## Authoritative References

- [AWS API Gateway Best Practices](https://docs.aws.amazon.com/apigateway/latest/developerguide/best-practices.html)
- [AWS API Gateway Security](https://docs.aws.amazon.com/apigateway/latest/developerguide/security.html)
- [AWS API Gateway REST vs HTTP API](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-vs-rest.html)
- [OWASP API Security Top 10](https://owasp.org/API-Security/)
