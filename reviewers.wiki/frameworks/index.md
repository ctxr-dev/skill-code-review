---
id: frameworks
type: index
depth_role: subcategory
depth: 1
focus: "frameworks: Detect Angular-specific pitfalls in change detection, RxJS subscription management, template security, and module architecture.; Detect ASP.NET Core and Blazor pitfalls including missing authorization attributes, input valida..."
parents:
  - "../index.md"
shared_covers: []
tags:
  - action
  - activerecord
  - actix-web
  - actuator
  - admin
  - akka-http
  - angular
  - anti-forgery
  - api
  - app-router
  - architecture
  - aspnetcore
  - astro
  - async
  - authentication
  - authorization
  - axum
  - backend
  - backpressure
  - blade
generator: "skill-llm-wiki/v1"
entries:
  - id: fw-angular
    file: fw-angular.md
    type: primary
    focus: Detect Angular-specific pitfalls in change detection, RxJS subscription management, template security, and module architecture.
    tags:
      - angular
      - rxjs
      - change-detection
      - zonejs
      - typescript
      - frontend
      - spa
      - memory-leak
  - id: fw-aspnetcore-blazor
    file: fw-aspnetcore-blazor.md
    type: primary
    focus: Detect ASP.NET Core and Blazor pitfalls including missing authorization attributes, input validation gaps, Blazor Server circuit state leaks, IJSRuntime XSS, anti-forgery token omissions, CORS misconfiguration, connection string exposure, and missing exception handling middleware that cause vulnerabilities or production failures.
    tags:
      - aspnetcore
      - blazor
      - csharp
      - dotnet
      - security
      - authorization
      - validation
      - cors
      - middleware
      - xss
      - anti-forgery
      - kestrel
  - id: fw-astro
    file: fw-astro.md
    type: primary
    focus: "Detect Astro-specific pitfalls in island hydration directives, static/dynamic rendering mismatches, content collection misuse, and unnecessary client-side JavaScript."
    tags:
      - astro
      - islands
      - ssg
      - ssr
      - hydration
      - content-collections
      - performance
      - frontend
      - mpa
  - id: fw-django
    file: fw-django.md
    type: primary
    focus: Detect Django framework-level pitfalls in security settings, middleware configuration, admin exposure, view permissions, file upload handling, and production hardening that cause vulnerabilities or deployment failures beyond ORM-specific issues.
    tags:
      - django
      - python
      - security
      - middleware
      - admin
      - settings
      - csrf
      - permissions
      - file-upload
      - production-hardening
  - id: fw-fastapi-starlette-litestar
    file: fw-fastapi-starlette-litestar.md
    type: primary
    focus: Detect pitfalls in FastAPI, Starlette, and Litestar applications including missing Pydantic validation, dependency injection side effects, async misuse, CORS misconfiguration, and OpenAPI schema exposure that cause vulnerabilities or production failures.
    tags:
      - fastapi
      - starlette
      - litestar
      - python
      - async
      - pydantic
      - security
      - validation
      - openapi
      - middleware
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
  - id: fw-flask-quart
    file: fw-flask-quart.md
    type: primary
    focus: "Detect Flask and Quart pitfalls in template injection, secret management, session security, CSRF protection, input validation, and async/sync boundary misuse that cause security vulnerabilities or production failures."
    tags:
      - flask
      - quart
      - python
      - ssti
      - jinja2
      - session
      - csrf
      - async
      - blueprint
      - web-framework
      - security
  - id: fw-htmx
    file: fw-htmx.md
    type: primary
    focus: Detect htmx-specific pitfalls in user-controlled URLs, HTML fragment XSS, missing CSRF tokens, unsafe swap modes, missing confirmation on destructive actions, URL manipulation via hx-push-url, server endpoint design, and polling without rate limits.
    tags:
      - htmx
      - hypermedia
      - html
      - xss
      - csrf
      - ssrf
      - progressive-enhancement
      - polling
      - fragments
      - server-rendering
      - web-framework
  - id: fw-ktor
    file: fw-ktor.md
    type: primary
    focus: Detect Ktor-specific pitfalls including missing plugins for content negotiation, error handling, and authentication, coroutine scope misuse, blocking calls without dispatcher switch, and unvalidated request input that cause silent failures or security holes.
    tags:
      - ktor
      - kotlin
      - coroutines
      - web-framework
      - backend
      - plugins
      - security
      - async
  - id: fw-laravel-symfony
    file: fw-laravel-symfony.md
    type: primary
    focus: "Detect Laravel and Symfony pitfalls including Blade/Twig XSS via unescaped output, mass assignment without fillable/guarded, missing CSRF tokens, raw SQL injection, missing middleware, debug mode exposure, Eloquent N+1 queries, and missing authorization that cause vulnerabilities or production failures."
    tags:
      - laravel
      - symfony
      - php
      - blade
      - twig
      - eloquent
      - doctrine
      - security
      - xss
      - mass-assignment
      - csrf
      - sql-injection
      - middleware
      - authorization
  - id: fw-nestjs
    file: fw-nestjs.md
    type: primary
    focus: Detect NestJS-specific pitfalls in dependency injection, validation pipes, guards, interceptors, module architecture, and decorator usage that cause security gaps, circular dependencies, or architectural violations.
    tags:
      - nestjs
      - dependency-injection
      - validation
      - guards
      - interceptors
      - modules
      - decorators
      - typescript
      - backend
      - enterprise
  - id: fw-nextjs
    file: fw-nextjs.md
    type: primary
    focus: "Detect Next.js-specific pitfalls in server/client component boundaries, data fetching, caching, middleware, and security that cause bundle bloat, data leaks, or misconfigured rendering strategies."
    tags:
      - nextjs
      - server-components
      - client-components
      - app-router
      - pages-router
      - ssr
      - ssg
      - isr
      - middleware
      - server-actions
      - frontend
      - csr
      - islands
      - rendering-strategy
      - hydration
      - seo
  - id: fw-phoenix-elixir
    file: fw-phoenix-elixir.md
    type: primary
    focus: "Detect Phoenix/Elixir pitfalls in CSRF protection, HEEx template escaping, LiveView input validation, authorization plugs, Ecto raw SQL injection, channel authentication, PubSub authorization, and GenServer error handling that cause security vulnerabilities or runtime failures."
    tags:
      - phoenix
      - elixir
      - liveview
      - ecto
      - plug
      - csrf
      - channels
      - pubsub
      - genserver
      - security
      - web-framework
  - id: fw-quarkus-micronaut
    file: fw-quarkus-micronaut.md
    type: primary
    focus: Detect Quarkus and Micronaut pitfalls including GraalVM native-image reflection breakage, CDI scope misuse, event-loop blocking, missing health checks, and serialization failures that cause build-time or runtime errors invisible during JVM development.
    tags:
      - quarkus
      - micronaut
      - graalvm
      - native-image
      - cdi
      - jakarta-ee
      - reactive
      - vert-x
      - kubernetes
      - java
      - kotlin
  - id: fw-qwik
    file: fw-qwik.md
    type: primary
    focus: "Detect Qwik-specific pitfalls around resumability, serialization boundaries, lazy-loading closures, and server/client context mismatches."
    tags:
      - qwik
      - resumability
      - serialization
      - lazy-loading
      - qrl
      - frontend
      - ssr
      - qwikcity
  - id: fw-rails
    file: fw-rails.md
    type: primary
    focus: Detect Ruby on Rails pitfalls in mass assignment, CSRF bypass, controller authorization, SQL injection via string interpolation, open redirects, path traversal, callback coupling, and N+1 queries that cause vulnerabilities or production failures.
    tags:
      - rails
      - ruby
      - security
      - mass-assignment
      - csrf
      - sql-injection
      - authorization
      - n-plus-one
      - callbacks
      - strong-parameters
      - activerecord
      - n-plus-1
      - includes
      - migration
      - strong-migrations
      - data-architecture
  - id: fw-react
    file: fw-react.md
    type: primary
    focus: Detect React-specific pitfalls in hooks, rendering, memoization, and component design that cause bugs, memory leaks, or unnecessary re-renders.
    tags:
      - react
      - hooks
      - jsx
      - tsx
      - re-render
      - memoization
      - error-boundary
      - suspense
      - frontend
  - id: fw-remix
    file: fw-remix.md
    type: primary
    focus: "Detect Remix-specific pitfalls in loader/action design, data flow, error boundaries, and form handling that cause data leaks, mutation bugs, or degraded UX."
    tags:
      - remix
      - loader
      - action
      - form
      - data-fetching
      - error-boundary
      - optimistic-ui
      - nested-routing
      - fullstack
      - frontend
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
  - id: fw-sinatra-hanami
    file: fw-sinatra-hanami.md
    type: primary
    focus: Detect Sinatra and Hanami pitfalls including missing CSRF protection, unescaped template rendering, hardcoded session secrets, missing security headers, monolith growth in Sinatra, and bypassed validation in Hanami that cause vulnerabilities or architectural decay.
    tags:
      - sinatra
      - hanami
      - ruby
      - security
      - csrf
      - xss
      - validation
      - session
      - microframework
      - architecture
  - id: fw-solidjs
    file: fw-solidjs.md
    type: primary
    focus: Detect SolidJS reactivity pitfalls including broken signal tracking from destructuring, misuse of reactive primitives, and rendering anti-patterns.
    tags:
      - solidjs
      - reactivity
      - fine-grained
      - signals
      - jsx
      - frontend
      - spa
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
  - id: fw-svelte-sveltekit
    file: fw-svelte-sveltekit.md
    type: primary
    focus: "Detect Svelte 5 and SvelteKit pitfalls in reactivity, lifecycle, form handling, and server/client boundaries that cause bugs, XSS, or incorrect rendering."
    tags:
      - svelte
      - sveltekit
      - runes
      - reactivity
      - ssr
      - form-actions
      - load-functions
      - frontend
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
  - id: fw-vue-nuxt
    file: fw-vue-nuxt.md
    type: primary
    focus: Detect Vue 3 and Nuxt 3 pitfalls in reactivity, component design, composables, and server-side rendering that cause subtle bugs, XSS, or performance degradation.
    tags:
      - vue
      - nuxt
      - composition-api
      - reactivity
      - pinia
      - single-file-component
      - ssr
      - composables
      - frontend
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Frameworks

**Focus:** frameworks: Detect Angular-specific pitfalls in change detection, RxJS subscription management, template security, and module architecture.; Detect ASP.NET Core and Blazor pitfalls including missing authorization attributes, input valida...

## Children

| File | Type | Focus |
|------|------|-------|
| [fw-angular.md](fw-angular.md) | 📄 primary | Detect Angular-specific pitfalls in change detection, RxJS subscription management, template security, and module architecture. |
| [fw-aspnetcore-blazor.md](fw-aspnetcore-blazor.md) | 📄 primary | Detect ASP.NET Core and Blazor pitfalls including missing authorization attributes, input validation gaps, Blazor Server circuit state leaks, IJSRuntime XSS, anti-forgery token omissions, CORS misconfiguration, connection string exposure, and missing exception handling middleware that cause vulnerabilities or production failures. |
| [fw-astro.md](fw-astro.md) | 📄 primary | Detect Astro-specific pitfalls in island hydration directives, static/dynamic rendering mismatches, content collection misuse, and unnecessary client-side JavaScript. |
| [fw-django.md](fw-django.md) | 📄 primary | Detect Django framework-level pitfalls in security settings, middleware configuration, admin exposure, view permissions, file upload handling, and production hardening that cause vulnerabilities or deployment failures beyond ORM-specific issues. |
| [fw-fastapi-starlette-litestar.md](fw-fastapi-starlette-litestar.md) | 📄 primary | Detect pitfalls in FastAPI, Starlette, and Litestar applications including missing Pydantic validation, dependency injection side effects, async misuse, CORS misconfiguration, and OpenAPI schema exposure that cause vulnerabilities or production failures. |
| [fw-fastify.md](fw-fastify.md) | 📄 primary | Detect Fastify-specific pitfalls in schema validation, plugin encapsulation, lifecycle hooks, error handling, and performance patterns that cause validation bypasses, scope leaks, or unhandled errors. |
| [fw-flask-quart.md](fw-flask-quart.md) | 📄 primary | Detect Flask and Quart pitfalls in template injection, secret management, session security, CSRF protection, input validation, and async/sync boundary misuse that cause security vulnerabilities or production failures. |
| [fw-htmx.md](fw-htmx.md) | 📄 primary | Detect htmx-specific pitfalls in user-controlled URLs, HTML fragment XSS, missing CSRF tokens, unsafe swap modes, missing confirmation on destructive actions, URL manipulation via hx-push-url, server endpoint design, and polling without rate limits. |
| [fw-ktor.md](fw-ktor.md) | 📄 primary | Detect Ktor-specific pitfalls including missing plugins for content negotiation, error handling, and authentication, coroutine scope misuse, blocking calls without dispatcher switch, and unvalidated request input that cause silent failures or security holes. |
| [fw-laravel-symfony.md](fw-laravel-symfony.md) | 📄 primary | Detect Laravel and Symfony pitfalls including Blade/Twig XSS via unescaped output, mass assignment without fillable/guarded, missing CSRF tokens, raw SQL injection, missing middleware, debug mode exposure, Eloquent N+1 queries, and missing authorization that cause vulnerabilities or production failures. |
| [fw-nestjs.md](fw-nestjs.md) | 📄 primary | Detect NestJS-specific pitfalls in dependency injection, validation pipes, guards, interceptors, module architecture, and decorator usage that cause security gaps, circular dependencies, or architectural violations. |
| [fw-nextjs.md](fw-nextjs.md) | 📄 primary | Detect Next.js-specific pitfalls in server/client component boundaries, data fetching, caching, middleware, and security that cause bundle bloat, data leaks, or misconfigured rendering strategies. |
| [fw-phoenix-elixir.md](fw-phoenix-elixir.md) | 📄 primary | Detect Phoenix/Elixir pitfalls in CSRF protection, HEEx template escaping, LiveView input validation, authorization plugs, Ecto raw SQL injection, channel authentication, PubSub authorization, and GenServer error handling that cause security vulnerabilities or runtime failures. |
| [fw-quarkus-micronaut.md](fw-quarkus-micronaut.md) | 📄 primary | Detect Quarkus and Micronaut pitfalls including GraalVM native-image reflection breakage, CDI scope misuse, event-loop blocking, missing health checks, and serialization failures that cause build-time or runtime errors invisible during JVM development. |
| [fw-qwik.md](fw-qwik.md) | 📄 primary | Detect Qwik-specific pitfalls around resumability, serialization boundaries, lazy-loading closures, and server/client context mismatches. |
| [fw-rails.md](fw-rails.md) | 📄 primary | Detect Ruby on Rails pitfalls in mass assignment, CSRF bypass, controller authorization, SQL injection via string interpolation, open redirects, path traversal, callback coupling, and N+1 queries that cause vulnerabilities or production failures. |
| [fw-react.md](fw-react.md) | 📄 primary | Detect React-specific pitfalls in hooks, rendering, memoization, and component design that cause bugs, memory leaks, or unnecessary re-renders. |
| [fw-remix.md](fw-remix.md) | 📄 primary | Detect Remix-specific pitfalls in loader/action design, data flow, error boundaries, and form handling that cause data leaks, mutation bugs, or degraded UX. |
| [fw-rust-web-frameworks.md](fw-rust-web-frameworks.md) | 📄 primary | Detect pitfalls specific to Rust web frameworks (Axum, Actix-web, Rocket) including silent extractor failures, blocking on async runtime, shared state races, missing middleware, and panic-induced worker crashes. |
| [fw-scala-web.md](fw-scala-web.md) | 📄 primary | Detect pitfalls in Play Framework, Akka HTTP, and http4s including XSS via raw HTML, missing rejection/error handlers, auth middleware gaps, blocking on wrong execution contexts, CSRF misconfig, stream backpressure, resource leaks, and excessive implicit resolution. |
| [fw-sinatra-hanami.md](fw-sinatra-hanami.md) | 📄 primary | Detect Sinatra and Hanami pitfalls including missing CSRF protection, unescaped template rendering, hardcoded session secrets, missing security headers, monolith growth in Sinatra, and bypassed validation in Hanami that cause vulnerabilities or architectural decay. |
| [fw-solidjs.md](fw-solidjs.md) | 📄 primary | Detect SolidJS reactivity pitfalls including broken signal tracking from destructuring, misuse of reactive primitives, and rendering anti-patterns. |
| [fw-spring.md](fw-spring.md) | 📄 primary | Detect Spring Boot and Spring Framework pitfalls including dependency injection anti-patterns, security misconfigurations, WebFlux blocking violations, transaction proxy failures, and actuator exposure that cause vulnerabilities or silent misbehavior. |
| [fw-svelte-sveltekit.md](fw-svelte-sveltekit.md) | 📄 primary | Detect Svelte 5 and SvelteKit pitfalls in reactivity, lifecycle, form handling, and server/client boundaries that cause bugs, XSS, or incorrect rendering. |
| [fw-trpc.md](fw-trpc.md) | 📄 primary | Detect tRPC security and runtime pitfalls including publicProcedure on protected endpoints, missing input validation, inconsistent middleware application, subscription resource leaks, unbounded response payloads, error detail leakage, and missing rate limiting. |
| [fw-vapor-swift.md](fw-vapor-swift.md) | 📄 primary | Detect Vapor (Swift) pitfalls in Content validation, Fluent authorization, middleware configuration, async blocking, CSRF protection, secrets management, response data leakage, and error handling that cause security vulnerabilities or runtime failures. |
| [fw-vue-nuxt.md](fw-vue-nuxt.md) | 📄 primary | Detect Vue 3 and Nuxt 3 pitfalls in reactivity, component design, composables, and server-side rendering that cause subtle bugs, XSS, or performance degradation. |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
