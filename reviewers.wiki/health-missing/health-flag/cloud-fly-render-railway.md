---
id: cloud-fly-render-railway
type: primary
depth_role: leaf
focus: Detect missing health checks, absent autoscaling, ephemeral storage misuse, secrets in config files, and single-region deployments on Fly.io, Render, and Railway
parents:
  - index.md
covers:
  - Missing health check configuration causing undetected failures
  - "Autoscaling not configured leading to over/under-provisioning"
  - Missing volume for persistent data on ephemeral filesystem
  - Secrets committed in fly.toml, render.yaml, or railway.toml
  - Missing TLS configuration for custom domains
  - Deployment without rollback strategy
  - Missing resource limits causing OOM kills or runaway CPU
  - Single region deployment without multi-region failover
  - "Missing graceful shutdown handling (SIGTERM)"
  - Build cache not configured increasing deploy times
tags:
  - fly
  - render
  - railway
  - paas
  - health-check
  - autoscaling
  - graceful-shutdown
  - deployment
activation:
  file_globs:
    - "**/fly.toml"
    - "**/render.yaml"
    - "**/railway.toml"
    - "**/railway.json"
    - "**/Procfile"
    - "**/Dockerfile"
    - "**/*.toml"
    - "**/*.yaml"
  keyword_matches:
    - fly
    - Fly
    - flyctl
    - fly.toml
    - render
    - Render
    - render.yaml
    - railway
    - Railway
    - railway.toml
    - Procfile
  structural_signals:
    - fly_toml_config
    - render_yaml_config
    - railway_toml_config
source:
  origin: file
  path: cloud-fly-render-railway.md
  hash: "sha256:17046724ecb12f5bfd80090ee6815c6d601b7cbcfee6e131319643d10b817f38"
---
# Fly.io, Render, and Railway Deployment

## When This Activates

Activates on diffs involving Fly.io (fly.toml), Render (render.yaml), or Railway (railway.toml) configuration files, Procfiles, Dockerfiles, or application code handling deployment lifecycle. These platforms simplify container deployment but abstract infrastructure decisions that still need explicit configuration: health checks determine when traffic is routed, autoscaling prevents cost overruns and downtime, ephemeral filesystems lose data on redeploy, and graceful shutdown prevents in-flight request drops. This reviewer detects diff-visible signals of deployment and operational misconfigurations across these PaaS platforms.

## Audit Surface

- [ ] Platform config without health check definition
- [ ] Service without autoscaling or min/max instance configuration
- [ ] Application writing to local filesystem for persistent state
- [ ] Secret or database URL in platform config file
- [ ] Custom domain without TLS certificate configuration
- [ ] Deployment without rollback or canary strategy
- [ ] Service without memory or CPU limits
- [ ] Single-region deployment for production service
- [ ] Application not handling SIGTERM for graceful shutdown
- [ ] Dockerfile without layer caching optimization
- [ ] Missing readiness check distinct from health check
- [ ] Database connection without pooling configuration

## Detailed Checks

### Health Check Configuration
<!-- activation: keywords=["health", "healthcheck", "health_check", "check", "tcp_checks", "http_checks", "healthCheckPath"] -->

- [ ] **Missing health check**: flag fly.toml without [[services.tcp_checks]] or [[services.http_checks]], render.yaml without healthCheckPath, or railway.toml without health check configuration -- without health checks, the platform cannot detect crashed or hung instances and continues routing traffic to them
- [ ] **Health check on wrong endpoint**: flag health checks pointing to the root path (/) when the application has a dedicated /health or /healthz endpoint -- root paths may return 200 even when dependencies (database, cache) are down
- [ ] **Missing readiness distinction**: flag health check configurations that do not separate liveness (process is alive) from readiness (process can serve traffic) -- during startup, an app may be alive but not ready to accept requests
- [ ] **Health check interval too long**: flag health check intervals exceeding 30 seconds -- long intervals delay detection of failures, causing prolonged downtime

### Autoscaling and Resource Limits
<!-- activation: keywords=["scale", "autoscale", "min_machines", "max_machines", "minInstances", "maxInstances", "auto_stop", "auto_start", "memory", "cpu"] -->

- [ ] **No autoscaling configured**: flag production services without min/max instance configuration -- fixed instance count leads to over-provisioning (cost) or under-provisioning (downtime during traffic spikes)
- [ ] **Missing resource limits**: flag services without explicit memory limits (Fly: vm.size or [vm] section, Render: plan selection, Railway: resource limits) -- unbounded memory causes OOM kills and noisy-neighbor issues
- [ ] **Auto-stop without auto-start on Fly**: flag Fly.io machines with auto_stop_machines enabled but auto_start_machines disabled -- stopped machines will not restart on incoming requests
- [ ] **Min instances zero for production**: flag production services with minimum instances set to 0 -- cold starts from zero instances cause seconds of downtime for the first request

### Persistent Storage
<!-- activation: keywords=["volume", "mount", "disk", "storage", "filesystem", "write", "upload", "persist", "sqlite"] -->

- [ ] **Local filesystem for persistent data**: flag applications writing uploads, SQLite databases, or state files to the local filesystem without a mounted volume -- platform filesystems are ephemeral and wiped on every deploy
- [ ] **Volume not configured**: flag fly.toml without [mounts] section when the application uses SQLite, file-based sessions, or local uploads -- data is lost on redeploy without a persistent volume
- [ ] **Volume without backup**: flag persistent volumes without evidence of backup strategy (snapshot, pg_dump cron, S3 sync) -- volumes are durable but not replicated across regions or backed up automatically
- [ ] **Volume in multi-instance deployment**: flag applications with both mounted volumes and multiple instances -- volumes on Fly are per-machine; multi-instance deployments need shared storage (S3, object storage) or a coordination strategy

### Secrets and Configuration
<!-- activation: keywords=["secret", "env", "DATABASE_URL", "API_KEY", "TOKEN", "PASSWORD", "fly.toml", "render.yaml", "railway.toml"] -->

- [ ] **Secret in config file**: flag database URLs, API keys, tokens, or passwords in fly.toml [env] section, render.yaml envVars, or railway.toml [variables] -- use platform secret management (flyctl secrets set, Render environment variables, Railway variables) which encrypts at rest
- [ ] **Procfile exposing secrets**: flag Procfile commands containing inline environment variables with secret values -- Procfiles are committed to source control
- [ ] **Missing environment separation**: flag identical secrets used across production and staging environments -- use platform environment groups or per-environment overrides

### Deployment and Shutdown
<!-- activation: keywords=["deploy", "rollback", "canary", "blue-green", "strategy", "SIGTERM", "signal", "shutdown", "graceful", "drain"] -->

- [ ] **No rollback strategy**: flag deployment configurations without immediate rollback capability -- Fly supports `fly deploy --strategy rolling`, Render supports instant rollback, Railway supports deploy rollback
- [ ] **Missing SIGTERM handler**: flag application entry points without a SIGTERM signal handler -- platforms send SIGTERM before killing processes; without handling it, in-flight requests are dropped and resources (DB connections, file handles) leak
- [ ] **Insufficient shutdown grace period**: flag applications with long-running request processing but default shutdown timeout (typically 5-10s) -- set kill_timeout in fly.toml or similar platform config to allow in-flight requests to complete
- [ ] **Missing build cache**: flag Dockerfiles without multi-stage builds or layer caching optimization -- Fly, Render, and Railway rebuild from scratch without proper caching, adding minutes to deploy time

### Multi-Region and TLS
<!-- activation: keywords=["region", "primary_region", "regions", "tls", "ssl", "certificate", "domain", "custom_domain"] -->

- [ ] **Single region for production**: flag production services deployed to a single region without geographic redundancy -- a regional outage takes down the entire service
- [ ] **Missing TLS for custom domain**: flag custom domain configuration without TLS certificate provisioning -- platforms auto-provision TLS for their default domains but custom domains may need explicit configuration
- [ ] **No connection pooling for multi-region**: flag multi-region deployments connecting to a single-region database without a connection pooler or read replica strategy -- cross-region database queries add 50-200ms latency

## Common False Positives

- **Development/staging single region**: non-production environments legitimately run in a single region to reduce cost.
- **Fly machines with intentional auto-stop**: background workers or cron-triggered machines may intentionally stop between invocations.
- **Static sites without health checks**: static sites on Render or Netlify do not need health check configuration.
- **SQLite with Litestream**: applications using Litestream for SQLite replication legitimately write to the local filesystem with real-time backup to S3.

## Severity Guidance

| Finding | Severity |
|---|---|
| Secret or database URL committed in platform config file | Critical |
| Missing health check on production service | Critical |
| Persistent data written to ephemeral filesystem without volume | Important |
| Missing SIGTERM handler dropping in-flight requests | Important |
| No autoscaling on production service | Important |
| Single region for production with no failover | Important |
| Missing resource limits (memory/CPU) | Important |
| Min instances zero on production | Minor |
| Dockerfile without layer caching | Minor |
| Missing build cache optimization | Minor |

## See Also

- `arch-serverless` -- serverless patterns applicable to PaaS scaling
- `sec-secrets-management-and-rotation` -- secret management across platforms
- `sec-owasp-a05-misconfiguration` -- general misconfiguration patterns
- `reliability-timeout-deadline-propagation` -- graceful shutdown and timeout propagation

## Authoritative References

- [Fly.io, "fly.toml Configuration"](https://fly.io/docs/reference/configuration/)
- [Fly.io, "Health Checks"](https://fly.io/docs/reference/configuration/#services-http_checks)
- [Render, "Environment Configuration"](https://docs.render.com/configure-environment-variables)
- [Railway, "Configuration"](https://docs.railway.app/reference/config-as-code)
- [Docker, "Best Practices for Writing Dockerfiles"](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)
