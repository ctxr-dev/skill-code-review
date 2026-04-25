---
id: reliability-health-checks
type: primary
depth_role: leaf
focus: "Detect shallow health checks, missing dependency probes, health endpoints that overload dependencies, and absent readiness/liveness distinction"
parents:
  - index.md
covers:
  - Health check always returns 200 regardless of actual service state
  - No dependency checks -- health endpoint does not verify database, cache, or downstream connectivity
  - Health check queries database on every call with no caching or rate limiting
  - No distinction between readiness and liveness probes
  - Health check includes non-critical dependencies -- optional service down makes the instance unhealthy
  - Health check endpoint not authenticated but exposes internal topology
  - Liveness check depends on external state -- kills the pod when a dependency is slow
  - Health check timeout longer than orchestrator probe timeout
  - No health check endpoint defined -- orchestrator cannot detect unhealthy instances
tags:
  - health-check
  - readiness
  - liveness
  - probe
  - kubernetes
  - dependency
  - monitoring
  - observability
activation:
  file_globs:
    - "**/*.{java,kt,scala,cs,ts,js,py,rb,go,rs,ex,exs,yaml,yml}"
    - "**/Dockerfile*"
    - "**/docker-compose*"
    - "**/*health*"
    - "**/*probe*"
    - "**/*ready*"
    - "**/*live*"
  keyword_matches:
    - health
    - healthz
    - healthcheck
    - health_check
    - readiness
    - readyz
    - liveness
    - livez
    - probe
    - startup
    - startupProbe
    - livenessProbe
    - readinessProbe
    - "/health"
    - "/ready"
    - "/live"
    - "/status"
  structural_signals:
    - health_endpoint_returning_hardcoded_200
    - kubernetes_probe_configuration
    - health_check_with_dependency_call
source:
  origin: file
  path: reliability-health-checks.md
  hash: "sha256:bfe71350282cf4c9cdad3294b3600017178784ce9fb8e967485b26f2bad14cd8"
---
# Health Checks

## When This Activates

Activates when diffs add or modify health check endpoints, configure Kubernetes probes (liveness, readiness, startup), define Docker HEALTHCHECK instructions, or add monitoring endpoints. Health checks are the orchestrator's eyes into service state. A shallow health check hides real failures; an expensive health check becomes a self-inflicted DoS; a missing readiness/liveness distinction causes premature pod kills or traffic to unready instances.

## Audit Surface

- [ ] Health endpoint returns hardcoded 200 with no actual checks
- [ ] No dependency connectivity check in readiness probe
- [ ] Health check executes full database query on every call
- [ ] No readiness vs liveness separation
- [ ] Non-critical dependency failure causes health check to fail
- [ ] Liveness probe calls external services
- [ ] Health check exposes internals with no authentication
- [ ] Health check timeout exceeds orchestrator probe timeout
- [ ] No health check endpoint defined
- [ ] Health check returns 200 during startup before service is ready
- [ ] Readiness check passes before caches are loaded
- [ ] Health check reports only aggregate pass/fail -- no per-dependency detail

## Detailed Checks

### Shallow Health Checks
<!-- activation: keywords=["health", "healthz", "status", "ping", "200", "ok", "UP", "alive"] -->

- [ ] **Always-200 health check**: handler returns `{ "status": "ok" }` unconditionally -- it does not verify that the service can actually process requests (database reachable, queues connected, config loaded)
- [ ] **Ping-only check**: health check verifies the HTTP server is listening but not that the application layer is functional -- a service can serve 200 on /health while its database connection pool is exhausted
- [ ] **No deep check available**: only a shallow ping endpoint exists; no endpoint verifies critical dependency connectivity -- orchestrators and load balancers route traffic to a broken instance
- [ ] **Health check succeeds during startup**: the service responds 200 on /health before it has finished initialization (cache warming, migration, config loading) -- premature traffic causes errors

### Readiness vs Liveness Distinction
<!-- activation: keywords=["readiness", "liveness", "ready", "live", "startup", "probe", "kubernetes", "k8s", "pod", "container"] -->

- [ ] **Single health endpoint for both probes**: one /health endpoint is used for both Kubernetes readiness and liveness -- a slow dependency causes the readiness check to fail and the liveness check to kill the pod, when it should only stop routing traffic
- [ ] **Liveness depends on external state**: liveness probe checks database or downstream service -- if the dependency is slow, the orchestrator kills and restarts the pod, creating a crash loop that worsens the outage
- [ ] **No startup probe**: a slow-starting service (JVM warmup, large cache load) fails liveness checks during startup -- Kubernetes kills it before it finishes initializing; use a startupProbe with a longer timeout
- [ ] **Readiness check too strict**: readiness probe checks all dependencies including optional ones -- a non-critical dependency outage removes the instance from the load balancer unnecessarily

### Dependency Check Efficiency
<!-- activation: keywords=["database", "query", "SELECT", "ping", "connection", "redis", "cache", "pool", "check", "verify"] -->

- [ ] **Full query on every health check**: health endpoint runs `SELECT * FROM ...` or a complex query -- with frequent probe intervals (5-10s), this creates sustained load on the database
- [ ] **No caching of dependency status**: each health check re-verifies all dependencies from scratch -- cache the result for 5-10 seconds to avoid hammering dependencies under high probe frequency
- [ ] **Connection pool exhaustion from health checks**: health check acquires a connection from the pool and does not release it quickly -- under high probe frequency, health checks consume pool capacity meant for real traffic
- [ ] **Health check timeout mismatch**: the health check's internal timeout for dependency verification is 30 seconds, but the orchestrator's probe timeout is 5 seconds -- the health check is still running when the probe declares failure

### Information Exposure and Security
<!-- activation: keywords=["version", "config", "environment", "internal", "topology", "auth", "secure", "expose", "info"] -->

- [ ] **Internals exposed without auth**: health check response includes server version, dependency versions, internal hostnames, IP addresses, or configuration details -- attackers can map the infrastructure
- [ ] **Health check on public path**: /health is accessible without authentication on a public-facing service -- it should be restricted to internal/management networks or require a header token
- [ ] **Detailed errors in health response**: health check failure response includes stack traces or connection strings -- sanitize error details in the response body

## Common False Positives

- **Intentionally shallow liveness check**: a liveness probe that only verifies the process is alive (not stuck, not OOM) is correct by design -- it should not check external dependencies. The readiness probe is where dependency checks belong.
- **Service mesh health management**: Istio, Linkerd, and similar meshes inject their own health checks and circuit breaking. The application health check may intentionally be simple if the mesh handles dependency routing.
- **Serverless functions**: Lambda, Cloud Functions, and similar platforms manage health checks at the platform level. Application-level health endpoints are unnecessary unless the function has its own initialization requirements.
- **Health check frameworks with built-in caching**: Spring Boot Actuator, ASP.NET HealthChecks, and similar frameworks cache dependency status by default. Verify framework behavior before flagging.

## Severity Guidance

| Finding | Severity |
|---|---|
| No health check endpoint -- orchestrator cannot detect failures | Critical |
| Liveness probe depends on external service (crash loop risk) | Critical |
| Health check always returns 200 regardless of state | Important |
| No readiness vs liveness distinction | Important |
| Health check succeeds during startup before service is ready | Important |
| Non-critical dependency failure causes health check failure | Important |
| Health check runs full DB query on every call with no caching | Minor |
| Health response exposes internal topology without auth | Minor |
| Health check timeout exceeds probe timeout | Minor |

## See Also

- `reliability-graceful-degradation` -- health checks should distinguish critical vs non-critical dependencies, matching degradation tiers
- `reliability-circuit-breaker` -- circuit breaker state can inform health check status (open circuit = dependency unhealthy)
- `reliability-timeout-deadline-propagation` -- health check internal timeout must be shorter than probe timeout
- `antipattern-distributed-monolith` -- health check cascading (checking downstream health) is a distributed monolith signal
- `principle-fail-fast` -- shallow health checks that hide failures violate fail-fast

## Authoritative References

- [Kubernetes Documentation: Configure Liveness, Readiness and Startup Probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [Microsoft, Health Endpoint Monitoring Pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/health-endpoint-monitoring)
- [Google SRE Book, Chapter 20: "Load Balancing in the Datacenter"](https://sre.google/sre-book/load-balancing-datacenter/)
- [Michael Nygard, *Release It!* (2nd ed., 2018), Chapter 17: "Transparency"](https://pragprog.com/titles/mnee2/release-it-second-edition/)
