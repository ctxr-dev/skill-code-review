---
id: perf-startup-cold-start
type: primary
depth_role: leaf
focus: Detect heavy initialization at startup, lazy init deferred to first request, and cold-start penalties in serverless and containerized environments
parents:
  - index.md
covers:
  - "Heavy computation or I/O during application startup blocking readiness"
  - Lazy initialization triggered on first user request causing latency spike
  - Cold start in AWS Lambda, Cloud Functions, or Azure Functions due to initialization weight
  - Large dependency tree increasing class loading and initialization time
  - Database connection pool initialized eagerly before health check passes
  - "Synchronous remote calls during startup (config fetch, service discovery)"
  - Static initializer or class-level block performing expensive work
  - Container image size inflating pull time on cold scheduling
  - JVM class loading overhead from large classpath on first request
  - Missing readiness vs liveness probe distinction causing premature traffic
tags:
  - startup
  - cold-start
  - serverless
  - lambda
  - container
  - initialization
  - latency
  - readiness
  - performance
activation:
  file_globs:
    - "**/*main*"
    - "**/*app*"
    - "**/*bootstrap*"
    - "**/*startup*"
    - "**/*init*"
    - "**/*lambda*"
    - "**/*handler*"
    - "**/Dockerfile"
    - "**/*serverless*"
    - "**/docker-compose*"
  keyword_matches:
    - "main("
    - "init("
    - __init__
    - module.exports
    - "static {"
    - static let
    - lazy
    - Lazy
    - once_cell
    - OnceCell
    - lateinit
    - serverless
    - Lambda
    - Function
    - handler
    - readiness
    - liveness
    - startup
  structural_signals:
    - heavy_init_in_main
    - lazy_init_in_handler
    - static_initializer_io
    - large_container_image
source:
  origin: file
  path: perf-startup-cold-start.md
  hash: "sha256:70560df2ec30557da5864a19e7a4506a3cbf485d11760df1b2cab852f3fc1af9"
---
# Startup and Cold-Start Performance

## When This Activates

Activates on diffs modifying application entry points, initialization code, serverless handlers, Dockerfiles, or health check configuration. Startup time directly impacts deployment speed, auto-scaling responsiveness, and user-facing latency for the first request after a scale-up event. In serverless environments, cold start latency is added to every invocation after idle timeout. In containers, a slow startup delays rolling deployments and causes failed readiness checks. This reviewer detects initialization patterns that unnecessarily inflate startup time or shift initialization cost to the first user request.

## Audit Surface

- [ ] Heavy I/O (file reads, remote calls, DB queries) in main(), init(), or module top-level scope
- [ ] Lazy singleton or lazy val first accessed in request-handling code
- [ ] Lambda handler with imports or initialization outside the handler function
- [ ] Static initializer block performing network calls, file I/O, or heavy computation
- [ ] Connection pool eagerly created but health check not gated on pool readiness
- [ ] Large container image (>500MB) without multi-stage build or layer optimization
- [ ] Synchronous HTTP call to config service or secrets manager in startup path
- [ ] Class loading or reflection scanning over large classpath at startup
- [ ] No readiness probe distinct from liveness probe (traffic arrives before init completes)
- [ ] Serverless function with large deployment package (>50MB unzipped)
- [ ] ORM schema validation or migration running at startup in production
- [ ] Eager initialization of all beans/services when only a subset is needed per request

## Detailed Checks

### Heavy Startup Initialization
<!-- activation: keywords=["main(", "init(", "__init__", "bootstrap", "startup", "configure", "setup", "onStart", "Application", "module", "static {", "clinit"] -->

- [ ] **I/O in startup path**: flag file reads, HTTP calls, database queries, or remote config fetches that block the startup path synchronously -- these add directly to time-to-ready; load asynchronously or defer to background tasks
- [ ] **Static initializer with side effects**: flag static blocks or class-level initializers that perform network calls, file I/O, or heavy computation -- they run during class loading with no timeout control and delay first use
- [ ] **Eager bean initialization**: flag Spring `@Component`/@`Bean`, Guice modules, or DI containers that eagerly instantiate all services at startup when only a subset is needed per request type -- use lazy initialization for heavy beans

### Lazy Initialization in Request Path
<!-- activation: keywords=["lazy", "Lazy", "lazy_static", "once_cell", "OnceCell", "lateinit", "synchronized", "Double-checked", "getInstance", "singleton"] -->

- [ ] **Lazy init on first request**: flag lazy singletons (`lazy val`, `Lazy<T>`, `once_cell`, `Double-checked locking`) first triggered by a user request -- the first user pays the initialization cost; consider warm-up during startup or a readiness check that triggers initialization
- [ ] **Synchronized lazy init blocking requests**: flag lazy initialization protected by a synchronized block or mutex -- if multiple requests hit the uninitialized path simultaneously, all but one block

### Serverless and Container Optimization
<!-- activation: keywords=["Lambda", "lambda", "serverless", "Function", "handler", "Dockerfile", "docker", "container", "image", "layer", "cold start", "warm", "provisioned", "concurrency"] -->

- [ ] **Lambda initialization outside handler**: flag AWS Lambda / Cloud Functions with heavy initialization (SDK clients, connection pools, model loading) inside the handler function instead of at module level -- module-level init runs once per container lifecycle; handler-level init runs per invocation
- [ ] **Large deployment package**: flag serverless deployment packages >50MB unzipped or container images >500MB -- large artifacts increase cold start time due to download and extraction; strip unused dependencies, use multi-stage builds, or use Lambda layers
- [ ] **No provisioned concurrency for latency-sensitive Lambda**: flag Lambda functions on latency-sensitive paths (API Gateway, synchronous invocation) with no provisioned concurrency configured -- provisioned instances eliminate cold start

### Health Check and Readiness
<!-- activation: keywords=["readiness", "liveness", "health", "probe", "ready", "started", "check", "ping", "warmup", "warm-up"] -->

- [ ] **No readiness probe**: flag Kubernetes deployments or container orchestration with no readiness probe distinct from liveness -- without a readiness probe, the load balancer sends traffic before the application is fully initialized
- [ ] **Readiness before full init**: flag readiness probes that return healthy before connection pools, caches, or critical dependencies are initialized -- premature readiness causes errors or latency on early requests

## Common False Positives

- **One-time startup for long-running services**: heavy initialization in a service that starts once and runs for days is acceptable if it does not block health checks. Flag only when startup frequency is high (frequent deployments, auto-scaling, serverless).
- **Development-only startup code**: ORM schema validation, test data seeding, or debug configuration loading that only runs in development mode is fine. Flag only production startup paths.
- **Intentional lazy init for optional features**: lazy initialization of features used by a small percentage of requests is a valid optimization. Flag only when the lazy path is hit by the majority of requests.

## Severity Guidance

| Finding | Severity |
|---|---|
| No readiness probe (traffic hits uninitialized service) | Critical |
| Lazy init triggered by first user request with multi-second cost | Critical |
| Blocking synchronous remote call in startup path | Important |
| Lambda initialization inside handler (runs per invocation) | Important |
| Large container image without multi-stage build | Important |
| Static initializer performing network I/O | Important |
| Eager initialization of all beans when subset suffices | Minor |
| Serverless package >50MB without optimization attempt | Minor |
| ORM schema validation running at startup in production | Minor |

## See Also

- `perf-jit-warmup` -- JIT warmup is a related cold-path performance concern for JVM and V8
- `perf-aot-graalvm-mojo` -- AOT compilation eliminates JVM cold start; review AOT-specific pitfalls
- `perf-network-io` -- connection pool initialization impacts startup and first-request latency
- `principle-fail-fast` -- startup should fail fast on misconfiguration rather than deferring failures to request time
- `antipattern-chatty-coupling` -- chatty config fetches at startup multiply cold-start time

## Authoritative References

- [AWS, "Optimizing Lambda Performance" -- cold start mitigation, provisioned concurrency, and deployment package optimization](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [Kubernetes Documentation, "Configure Liveness, Readiness and Startup Probes"](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [Google Cloud, "Cloud Functions Performance Tips" -- module-level initialization and minimizing cold starts](https://cloud.google.com/functions/docs/bestpractices/tips)
- [Brendan Gregg, *Systems Performance*, 2nd ed. (2020) -- application startup profiling](https://www.brendangregg.com/systems-performance-2nd-edition-book.html)
