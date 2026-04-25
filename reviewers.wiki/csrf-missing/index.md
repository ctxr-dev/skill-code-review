---
id: csrf-missing
type: index
depth_role: subcategory
depth: 1
focus: SECRET_KEY hardcoded or committed to version control; .env file committed to version control; AJAX requests without anti-CSRF headers or tokens; API endpoints that bypass UI-only access restrictions
parents:
  - "../index.md"
shared_covers: []
entries:
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
  - id: fw-trpc
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
    file: "../middleware-missing/fw-trpc.md"
  - id: fw-vapor-swift
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
    file: "../middleware-missing/fw-vapor-swift.md"
  - id: sec-csrf
    file: sec-csrf.md
    type: primary
    focus: Detect Cross-Site Request Forgery vulnerabilities where state-changing requests lack proper anti-CSRF protections.
    tags:
      - csrf
      - cross-site-request-forgery
      - session-security
      - cookies
      - authentication
      - CWE-352
  - id: sec-idor-and-mass-assignment
    file: sec-idor-and-mass-assignment.md
    type: primary
    focus: Detect Insecure Direct Object Reference and Mass Assignment vulnerabilities where user-supplied identifiers access resources without ownership checks or request bodies bind directly to data models without field allowlists.
    tags:
      - idor
      - bola
      - mass-assignment
      - access-control
      - authorization
      - CWE-639
      - CWE-915
      - CWE-284
  - id: sec-owasp-a01-broken-access-control
    file: sec-owasp-a01-broken-access-control.md
    type: primary
    focus: Detect missing or bypassable authorization checks that allow users to act outside their intended permissions
    tags:
      - owasp
      - access-control
      - authorization
      - IDOR
      - CORS
      - path-traversal
      - privilege-escalation
      - RBAC
      - ABAC
      - JWT
      - CWE-284
      - CWE-285
      - CWE-639
      - CWE-22
      - CWE-862
      - CWE-863
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Csrf Missing

**Focus:** SECRET_KEY hardcoded or committed to version control; .env file committed to version control; AJAX requests without anti-CSRF headers or tokens; API endpoints that bypass UI-only access restrictions

## Children

| File | Type | Focus |
|------|------|-------|
| [fw-aspnetcore-blazor.md](fw-aspnetcore-blazor.md) | 📄 primary | Detect ASP.NET Core and Blazor pitfalls including missing authorization attributes, input validation gaps, Blazor Server circuit state leaks, IJSRuntime XSS, anti-forgery token omissions, CORS misconfiguration, connection string exposure, and missing exception handling middleware that cause vulnerabilities or production failures. |
| [fw-django.md](fw-django.md) | 📄 primary | Detect Django framework-level pitfalls in security settings, middleware configuration, admin exposure, view permissions, file upload handling, and production hardening that cause vulnerabilities or deployment failures beyond ORM-specific issues. |
| [fw-fastapi-starlette-litestar.md](fw-fastapi-starlette-litestar.md) | 📄 primary | Detect pitfalls in FastAPI, Starlette, and Litestar applications including missing Pydantic validation, dependency injection side effects, async misuse, CORS misconfiguration, and OpenAPI schema exposure that cause vulnerabilities or production failures. |
| [fw-flask-quart.md](fw-flask-quart.md) | 📄 primary | Detect Flask and Quart pitfalls in template injection, secret management, session security, CSRF protection, input validation, and async/sync boundary misuse that cause security vulnerabilities or production failures. |
| [fw-ktor.md](fw-ktor.md) | 📄 primary | Detect Ktor-specific pitfalls including missing plugins for content negotiation, error handling, and authentication, coroutine scope misuse, blocking calls without dispatcher switch, and unvalidated request input that cause silent failures or security holes. |
| [fw-laravel-symfony.md](fw-laravel-symfony.md) | 📄 primary | Detect Laravel and Symfony pitfalls including Blade/Twig XSS via unescaped output, mass assignment without fillable/guarded, missing CSRF tokens, raw SQL injection, missing middleware, debug mode exposure, Eloquent N+1 queries, and missing authorization that cause vulnerabilities or production failures. |
| [fw-phoenix-elixir.md](fw-phoenix-elixir.md) | 📄 primary | Detect Phoenix/Elixir pitfalls in CSRF protection, HEEx template escaping, LiveView input validation, authorization plugs, Ecto raw SQL injection, channel authentication, PubSub authorization, and GenServer error handling that cause security vulnerabilities or runtime failures. |
| [fw-rails.md](fw-rails.md) | 📄 primary | Detect Ruby on Rails pitfalls in mass assignment, CSRF bypass, controller authorization, SQL injection via string interpolation, open redirects, path traversal, callback coupling, and N+1 queries that cause vulnerabilities or production failures. |
| [fw-remix.md](fw-remix.md) | 📄 primary | Detect Remix-specific pitfalls in loader/action design, data flow, error boundaries, and form handling that cause data leaks, mutation bugs, or degraded UX. |
| [fw-sinatra-hanami.md](fw-sinatra-hanami.md) | 📄 primary | Detect Sinatra and Hanami pitfalls including missing CSRF protection, unescaped template rendering, hardcoded session secrets, missing security headers, monolith growth in Sinatra, and bypassed validation in Hanami that cause vulnerabilities or architectural decay. |
| [sec-csrf.md](sec-csrf.md) | 📄 primary | Detect Cross-Site Request Forgery vulnerabilities where state-changing requests lack proper anti-CSRF protections. |
| [sec-idor-and-mass-assignment.md](sec-idor-and-mass-assignment.md) | 📄 primary | Detect Insecure Direct Object Reference and Mass Assignment vulnerabilities where user-supplied identifiers access resources without ownership checks or request bodies bind directly to data models without field allowlists. |
| [sec-owasp-a01-broken-access-control.md](sec-owasp-a01-broken-access-control.md) | 📄 primary | Detect missing or bypassable authorization checks that allow users to act outside their intended permissions |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
