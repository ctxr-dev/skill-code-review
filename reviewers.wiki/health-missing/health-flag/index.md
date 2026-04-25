---
id: health-flag
type: index
depth_role: subcategory
depth: 2
focus: "Autoscaling not configured leading to over/under-provisioning; Big-bang deployment without canary, blue-green, or rolling strategy; Blue-green without traffic switching validation; Boolean flag explosion vs. strategy/enum-based configuration"
parents:
  - "../index.md"
shared_covers: []
entries:
  - id: cicd-deploy-strategies
    file: cicd-deploy-strategies.md
    type: primary
    focus: Detect deployment strategy issues including big-bang deploys without progressive rollout, canary without metrics comparison, missing rollback triggers, stale feature flags, deploys without smoke tests, and missing deploy freeze mechanisms
    tags:
      - deployment
      - ci-cd
      - canary
      - blue-green
      - rolling
      - rollback
      - feature-flags
      - smoke-test
      - deployability
      - health-check
      - graceful-shutdown
      - migration
      - progressive-delivery
      - configuration
  - id: cloud-fly-render-railway
    file: cloud-fly-render-railway.md
    type: primary
    focus: Detect missing health checks, absent autoscaling, ephemeral storage misuse, secrets in config files, and single-region deployments on Fly.io, Render, and Railway
    tags:
      - fly
      - render
      - railway
      - paas
      - health-check
      - autoscaling
      - graceful-shutdown
      - deployment
  - id: feature-flag-platforms-launchdarkly-unleash-growthbook-openfeature
    file: feature-flag-platforms-launchdarkly-unleash-growthbook-openfeature.md
    type: primary
    focus: "Detect misuse of feature-flag platforms (LaunchDarkly, Unleash, GrowthBook, OpenFeature) -- evaluation context, default variations, expiry, hot-path evaluation, PII leakage, and cleanup"
    tags:
      - feature-flags
      - launchdarkly
      - unleash
      - growthbook
      - openfeature
      - rollout
      - experimentation
      - kill-switch
      - config
      - configuration
      - environment
      - flags
      - hardcoded
      - secrets
      - env-vars
  - id: perf-startup-cold-start
    file: perf-startup-cold-start.md
    type: primary
    focus: Detect heavy initialization at startup, lazy init deferred to first request, and cold-start penalties in serverless and containerized environments
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
  - id: reliability-health-checks
    file: reliability-health-checks.md
    type: primary
    focus: "Detect shallow health checks, missing dependency probes, health endpoints that overload dependencies, and absent readiness/liveness distinction"
    tags:
      - health-check
      - readiness
      - liveness
      - probe
      - kubernetes
      - dependency
      - monitoring
      - observability
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Health Flag

**Focus:** Autoscaling not configured leading to over/under-provisioning; Big-bang deployment without canary, blue-green, or rolling strategy; Blue-green without traffic switching validation; Boolean flag explosion vs. strategy/enum-based configuration

## Children

| File | Type | Focus |
|------|------|-------|
| [cicd-deploy-strategies.md](cicd-deploy-strategies.md) | 📄 primary | Detect deployment strategy issues including big-bang deploys without progressive rollout, canary without metrics comparison, missing rollback triggers, stale feature flags, deploys without smoke tests, and missing deploy freeze mechanisms |
| [cloud-fly-render-railway.md](cloud-fly-render-railway.md) | 📄 primary | Detect missing health checks, absent autoscaling, ephemeral storage misuse, secrets in config files, and single-region deployments on Fly.io, Render, and Railway |
| [feature-flag-platforms-launchdarkly-unleash-growthbook-openfeature.md](feature-flag-platforms-launchdarkly-unleash-growthbook-openfeature.md) | 📄 primary | Detect misuse of feature-flag platforms (LaunchDarkly, Unleash, GrowthBook, OpenFeature) -- evaluation context, default variations, expiry, hot-path evaluation, PII leakage, and cleanup |
| [perf-startup-cold-start.md](perf-startup-cold-start.md) | 📄 primary | Detect heavy initialization at startup, lazy init deferred to first request, and cold-start penalties in serverless and containerized environments |
| [reliability-health-checks.md](reliability-health-checks.md) | 📄 primary | Detect shallow health checks, missing dependency probes, health endpoints that overload dependencies, and absent readiness/liveness distinction |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
