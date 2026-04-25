---
id: middleware-missing
type: index
depth_role: subcategory
depth: 1
focus: "@Async method called from same class bypassing proxy; @Transactional on private methods silently not proxied; API response missing hypermedia links for navigation and discoverability; Actix-web mutable App data causing data races"
parents:
  - "../index.md"
shared_covers: []
entries:
  - id: api-hateoas-jsonapi-jsonld
    file: api-hateoas-jsonapi-jsonld.md
    type: primary
    focus: "Detect hypermedia API issues including missing links in responses, hardcoded URLs in clients, non-standard media types, missing self links, and incorrect JSON:API or JSON-LD structure"
    tags:
      - hateoas
      - hypermedia
      - json-api
      - jsonapi
      - json-ld
      - hal
      - links
      - rest
      - media-type
      - self-link
  - id: browser-extensions-mv3
    file: browser-extensions-mv3.md
    type: primary
    focus: Detect browser-extension pitfalls in Manifest V3 -- MV2 leftovers, over-broad host permissions, unsafe CSP, service-worker lifecycle assumptions, deprecated executeScript APIs, and missing declarativeNetRequest validation
    tags:
      - browser-extension
      - manifest-v3
      - chrome
      - firefox
      - edge
      - service-worker
      - csp
      - declarativeNetRequest
      - host-permissions
  - id: cloud-aws-api-gateway
    file: cloud-aws-api-gateway.md
    type: primary
    focus: Detect API Gateway misconfigurations including missing authorizers, absent WAF integration, permissive CORS, missing throttling, and request validation gaps
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
  - id: fw-fastify
    file: fw-fastify.md
    type: primary
    focus: Detect Fastify-specific pitfalls in schema validation, plugin encapsulation, lifecycle hooks, error handling, and performance patterns that cause validation bypasses, scope leaks, or unhandled errors.
    tags:
      - fastify
      - nodejs
      - schema-validation
      - plugin
      - hooks
      - backend
      - rest-api
      - performance
      - encapsulation
  - id: fw-rust-web-frameworks
    file: fw-rust-web-frameworks.md
    type: primary
    focus: "Detect pitfalls specific to Rust web frameworks (Axum, Actix-web, Rocket) including silent extractor failures, blocking on async runtime, shared state races, missing middleware, and panic-induced worker crashes."
    tags:
      - rust
      - axum
      - actix-web
      - rocket
      - tower
      - tokio
      - web-framework
      - backend
      - async
      - security
  - id: fw-scala-web
    file: fw-scala-web.md
    type: primary
    focus: "Detect pitfalls in Play Framework, Akka HTTP, and http4s including XSS via raw HTML, missing rejection/error handlers, auth middleware gaps, blocking on wrong execution contexts, CSRF misconfig, stream backpressure, resource leaks, and excessive implicit resolution."
    tags:
      - play
      - akka-http
      - http4s
      - scala
      - security
      - csrf
      - streams
      - backpressure
      - resource-safety
      - execution-context
      - web-framework
  - id: fw-spring
    file: fw-spring.md
    type: primary
    focus: Detect Spring Boot and Spring Framework pitfalls including dependency injection anti-patterns, security misconfigurations, WebFlux blocking violations, transaction proxy failures, and actuator exposure that cause vulnerabilities or silent misbehavior.
    tags:
      - spring
      - spring-boot
      - java
      - kotlin
      - dependency-injection
      - security
      - webflux
      - reactive
      - transactions
      - actuator
  - id: fw-trpc
    file: fw-trpc.md
    type: primary
    focus: Detect tRPC security and runtime pitfalls including publicProcedure on protected endpoints, missing input validation, inconsistent middleware application, subscription resource leaks, unbounded response payloads, error detail leakage, and missing rate limiting.
    tags:
      - trpc
      - typescript
      - security
      - authentication
      - validation
      - rate-limiting
      - subscriptions
      - pagination
      - error-handling
      - middleware
      - web-framework
      - type-safety
      - router
      - procedure
      - rpc
      - api
      - zod
      - hono
      - edge
      - workers
      - cloudflare
      - deno
      - bun
      - serverless
      - vercel
      - netlify
      - isr
      - jamstack
      - security-headers
      - express
      - nodejs
      - rest-api
      - backend
      - http
      - go
      - gin
      - echo
      - fiber
      - chi
      - net-http
      - goroutine
  - id: fw-vapor-swift
    file: fw-vapor-swift.md
    type: primary
    focus: "Detect Vapor (Swift) pitfalls in Content validation, Fluent authorization, middleware configuration, async blocking, CSRF protection, secrets management, response data leakage, and error handling that cause security vulnerabilities or runtime failures."
    tags:
      - vapor
      - swift
      - server-side-swift
      - fluent
      - middleware
      - validation
      - authentication
      - async
      - eventloop
      - web-framework
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Middleware Missing

**Focus:** @Async method called from same class bypassing proxy; @Transactional on private methods silently not proxied; API response missing hypermedia links for navigation and discoverability; Actix-web mutable App data causing data races

## Children

| File | Type | Focus |
|------|------|-------|
| [api-hateoas-jsonapi-jsonld.md](api-hateoas-jsonapi-jsonld.md) | 📄 primary | Detect hypermedia API issues including missing links in responses, hardcoded URLs in clients, non-standard media types, missing self links, and incorrect JSON:API or JSON-LD structure |
| [browser-extensions-mv3.md](browser-extensions-mv3.md) | 📄 primary | Detect browser-extension pitfalls in Manifest V3 -- MV2 leftovers, over-broad host permissions, unsafe CSP, service-worker lifecycle assumptions, deprecated executeScript APIs, and missing declarativeNetRequest validation |
| [cloud-aws-api-gateway.md](cloud-aws-api-gateway.md) | 📄 primary | Detect API Gateway misconfigurations including missing authorizers, absent WAF integration, permissive CORS, missing throttling, and request validation gaps |
| [fw-fastify.md](fw-fastify.md) | 📄 primary | Detect Fastify-specific pitfalls in schema validation, plugin encapsulation, lifecycle hooks, error handling, and performance patterns that cause validation bypasses, scope leaks, or unhandled errors. |
| [fw-rust-web-frameworks.md](fw-rust-web-frameworks.md) | 📄 primary | Detect pitfalls specific to Rust web frameworks (Axum, Actix-web, Rocket) including silent extractor failures, blocking on async runtime, shared state races, missing middleware, and panic-induced worker crashes. |
| [fw-scala-web.md](fw-scala-web.md) | 📄 primary | Detect pitfalls in Play Framework, Akka HTTP, and http4s including XSS via raw HTML, missing rejection/error handlers, auth middleware gaps, blocking on wrong execution contexts, CSRF misconfig, stream backpressure, resource leaks, and excessive implicit resolution. |
| [fw-spring.md](fw-spring.md) | 📄 primary | Detect Spring Boot and Spring Framework pitfalls including dependency injection anti-patterns, security misconfigurations, WebFlux blocking violations, transaction proxy failures, and actuator exposure that cause vulnerabilities or silent misbehavior. |
| [fw-trpc.md](fw-trpc.md) | 📄 primary | Detect tRPC security and runtime pitfalls including publicProcedure on protected endpoints, missing input validation, inconsistent middleware application, subscription resource leaks, unbounded response payloads, error detail leakage, and missing rate limiting. |
| [fw-vapor-swift.md](fw-vapor-swift.md) | 📄 primary | Detect Vapor (Swift) pitfalls in Content validation, Fluent authorization, middleware configuration, async blocking, CSRF protection, secrets management, response data leakage, and error handling that cause security vulnerabilities or runtime failures. |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
