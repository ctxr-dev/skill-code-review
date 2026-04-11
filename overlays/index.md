# Overlay Index

This index lists all framework, language, and infrastructure overlays available for code review specialists. The orchestrator reads this index to decide which overlays to load based on the Project Profile — only relevant overlays are loaded into specialist prompts, saving tokens.

## How Overlays Work

1. The orchestrator detects frameworks/languages/infra from the Project Profile
2. It reads this index to find matching overlays
3. It loads ONLY the matching overlay files
4. Each overlay is appended to the relevant specialist's prompt as additional framework-specific checks
5. Specialists apply both their base checks AND the overlay checks

## Framework Overlays

| File | Trigger | Specialists | Summary |
|------|---------|-------------|---------|
| [react.md](frameworks/react.md) | `react`, `react-dom` in deps | security, performance, language-quality, test-quality | Hook rules, memo boundaries, XSS via dangerouslySetInnerHTML, re-render prevention, testing-library patterns |
| [nextjs.md](frameworks/nextjs.md) | `next` in deps | security, performance, api-design, architecture-design | Server Actions auth, SSR data exposure, RSC boundaries, App Router patterns, middleware security, ISR/SSG caching |
| [express.md](frameworks/express.md) | `express` in deps | security, api-design, observability, performance | Middleware ordering, helmet, CORS, body parser limits, rate limiting, error middleware, request logging |
| [fastify.md](frameworks/fastify.md) | `fastify` in deps | security, api-design, observability, performance | Schema validation, plugin encapsulation, decorator safety, lifecycle hooks, serialization |
| [django.md](frameworks/django.md) | `django` in deps | security, api-design, performance, data-validation | CSRF middleware, ORM raw queries, template autoescape, N+1 via select_related/prefetch_related, settings.py secrets |
| [flask.md](frameworks/flask.md) | `flask` in deps | security, api-design, performance | CSRF protection, Jinja2 autoescape, blueprint structure, request context safety, app factory pattern |
| [nestjs.md](frameworks/nestjs.md) | `@nestjs/core` in deps | architecture-design, security, api-design, data-validation | Module boundaries, guard/pipe/interceptor ordering, DTO validation, circular dependency, provider scope |
| [spring.md](frameworks/spring.md) | `spring-boot` in deps | security, api-design, architecture-design, performance | Bean lifecycle, @Transactional propagation, Spring Security config, CORS, actuator exposure, JPA N+1 |
| [prisma.md](frameworks/prisma.md) | `prisma`, `@prisma/client` in deps | security, data-validation, performance, test-quality | Raw query injection ($queryRaw), schema drift, migration safety, relation loading, connection pooling, mock patterns |
| [drizzle.md](frameworks/drizzle.md) | `drizzle-orm` in deps | security, data-validation, performance | SQL template safety, schema push vs migrate, prepared statements, relation queries, type inference |
| [sqlalchemy.md](frameworks/sqlalchemy.md) | `sqlalchemy` in deps | security, data-validation, performance | Session lifecycle, text() injection, eager/lazy loading, alembic migrations, connection pool, hybrid properties |
| [typeorm.md](frameworks/typeorm.md) | `typeorm` in deps | security, data-validation, performance | QueryBuilder injection, migration sync, relation loading strategy, subscriber patterns, connection management |
| [zod.md](frameworks/zod.md) | `zod` in deps | data-validation, api-design, test-quality | Schema completeness, transform safety, refinement error messages, infer types sync, coercion explicit, discriminated unions |
| [pydantic.md](frameworks/pydantic.md) | `pydantic` in deps | data-validation, api-design, test-quality | Model validators, field constraints, JSON schema export, discriminated unions, computed fields, serialization modes |
| [graphql.md](frameworks/graphql.md) | `graphql`, `@apollo/server`, `type-graphql` in deps | api-design, security, performance | Depth/complexity limits, N+1 DataLoader, authorization per field, input validation, subscription security, schema design |
| [grpc.md](frameworks/grpc.md) | `@grpc/grpc-js`, `grpcio`, `tonic` in deps | api-design, security, performance | Protobuf field numbering, deadline propagation, interceptor chains, streaming backpressure, service reflection |
| [tailwind.md](frameworks/tailwind.md) | `tailwindcss` in deps | performance, documentation-quality | Purge config, custom theme consistency, @apply overuse, responsive breakpoint discipline, dark mode strategy |

## Language Overlays

| File | Trigger | Specialists | Summary |
|------|---------|-------------|---------|
| [typescript.md](languages/typescript.md) | `.ts`, `.tsx` files | language-quality, all | Strict mode, zero any, discriminated unions, const assertions, Node.js patterns, import hygiene, enum patterns |
| [python.md](languages/python.md) | `.py` files | language-quality, all | Type hints, context managers, dataclasses, pathlib, generators, no mutable defaults, f-strings, __all__ |
| [go.md](languages/go.md) | `.go` files | language-quality, all | Error returns checked, context.Context first arg, goroutine lifetime, channels closed by sender, interfaces at consumer |
| [rust.md](languages/rust.md) | `.rs` files | language-quality, all | No unwrap in prod, ownership correct, minimal unsafe, error types implement Error, iterators over loops |
| [java-kotlin.md](languages/java-kotlin.md) | `.java`, `.kt` files | language-quality, all | Nullability annotations, try-with-resources/use, streams/sequences, sealed classes, structured concurrency |

## Infrastructure Overlays

| File | Trigger | Specialists | Summary |
|------|---------|-------------|---------|
| [docker.md](infra/docker.md) | `Dockerfile*`, `docker-compose*` | security, performance, initialization-hygiene | Multi-stage builds, non-root user, .dockerignore, layer caching, health checks, secrets not in image, compose security |
| [github-actions.md](infra/github-actions.md) | `.github/workflows/*.yml` | security, filesystem-safety | Pinned action versions, secrets not in logs, untrusted input in run, permissions least-privilege, OIDC over long-lived secrets |
| [terraform.md](infra/terraform.md) | `*.tf` files | security, architecture-design | IAM least privilege, no public exposure defaults, encryption at rest, state backend security, module boundaries |
| [kubernetes.md](infra/kubernetes.md) | `k8s/`, `kubernetes/`, `helm/` | security, performance, observability | SecurityContext, resource limits, NetworkPolicy, readiness/liveness probes, RBAC, secret management |
