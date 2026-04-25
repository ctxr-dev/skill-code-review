---
id: cicd-deploy-strategies
type: primary
depth_role: leaf
focus: Detect deployment strategy issues including big-bang deploys without progressive rollout, canary without metrics comparison, missing rollback triggers, stale feature flags, deploys without smoke tests, and missing deploy freeze mechanisms
parents:
  - index.md
covers:
  - Big-bang deployment without canary, blue-green, or rolling strategy
  - Canary deployment without metrics comparison or error rate threshold
  - Missing automatic rollback trigger on error rate or latency spike
  - Feature flags not cleaned up after full rollout
  - Deployment without post-deploy smoke test or health check
  - Missing deploy freeze mechanism for incidents or change windows
  - Blue-green without traffic switching validation
  - Rolling deploy without readiness probe gating
  - Canary percentage too large for initial rollout
  - No deployment notification to team channels
  - "Missing health check endpoints (liveness, readiness, startup)"
  - "Missing graceful shutdown handling (SIGTERM, in-flight request draining)"
  - Configuration changes requiring code change and full redeployment
  - Missing feature flags for gradual rollout of risky changes
  - Database migrations tightly coupled with application code deploy
  - Missing rollback capability — no backward-compatible schema or config
  - Missing canary or progressive deployment support
  - Deployment depending on manual steps not codified in pipeline
  - Breaking API changes deployed without version negotiation
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
aliases:
  - qa-deployability
activation:
  file_globs:
    - "**/.github/workflows/*"
    - "**/.gitlab-ci*"
    - "**/Jenkinsfile*"
    - "**/deploy*"
    - "**/k8s/**"
    - "**/kubernetes/**"
    - "**/helm/**"
    - "**/argocd/**"
    - "**/flux/**"
  keyword_matches:
    - deploy
    - deployment
    - rollout
    - canary
    - blue-green
    - rolling
    - rollback
    - feature flag
    - feature toggle
    - smoke test
    - health check
    - freeze
    - release
    - promote
  structural_signals:
    - Deployment pipeline or script change
    - Kubernetes deployment manifest change
    - Helm chart or Kustomize change
    - Feature flag configuration change
source:
  origin: file
  path: cicd-deploy-strategies.md
  hash: "sha256:8b7391c12e173f86a4effd0c4826ed21db9c9796104af36df597680b188a1a1e"
---
# Deployment Strategies and Safety

## When This Activates

Activates when diffs touch deployment pipelines, Kubernetes manifests, Helm charts, feature flag configurations, or deployment scripts. How code reaches production determines the blast radius of bugs and the speed of recovery. Big-bang deployments expose all users simultaneously, missing rollback mechanisms extend incident duration, canary deployments without metrics gates provide false confidence, and stale feature flags accumulate technical debt. This reviewer detects deployment patterns that increase incident risk, slow recovery, or leave dead code in the codebase.

## Audit Surface

- [ ] Deployment with no progressive rollout strategy
- [ ] Canary config without metrics gate or error threshold
- [ ] Missing rollback step or automatic rollback trigger
- [ ] Feature flag older than 30 days still in codebase
- [ ] Deploy pipeline without post-deploy smoke test
- [ ] No deploy freeze or maintenance window mechanism
- [ ] Blue-green deploy without traffic validation step
- [ ] Rolling deploy without readiness probe or health check
- [ ] Canary starting at >10% of traffic
- [ ] Deploy without notification step
- [ ] Missing deployment approval for production
- [ ] No deployment tracking or audit log
- [ ] Rollback procedure not documented or tested

## Detailed Checks

### Progressive Rollout Strategy
<!-- activation: keywords=["deploy", "rollout", "canary", "blue-green", "rolling", "strategy", "replicas", "traffic", "weight"] -->

- [ ] **Big-bang deploy without progressive rollout**: flag deployment configurations that replace all instances simultaneously without canary, blue-green, or rolling strategy -- a bug in the new version affects 100% of users immediately with no graceful fallback. Use progressive rollout appropriate to the service's risk profile
- [ ] **Canary percentage too high**: flag canary deployments starting at more than 10% of traffic -- the purpose of canary is to limit blast radius. Start at 1-5% for critical services, observe metrics, then promote. Starting at 25% or 50% provides minimal protection
- [ ] **Blue-green without traffic validation**: flag blue-green deployments that switch traffic without a validation step between the blue and green environments -- after deploying to the inactive environment, run smoke tests against it before switching traffic. A blue-green switch without validation is just a big-bang deploy with extra infrastructure
- [ ] **Rolling deploy without readiness gating**: flag Kubernetes rolling deployments without `readinessProbe` or `minReadySeconds` -- without readiness gating, Kubernetes considers pods ready immediately, potentially routing traffic to instances that have not completed initialization

### Metrics-Based Gates and Rollback
<!-- activation: keywords=["rollback", "metrics", "error rate", "latency", "threshold", "alert", "revert", "undo", "promote", "analysis"] -->

- [ ] **Canary without metrics comparison**: flag canary deployments without automated metrics comparison between canary and baseline -- manual observation is slow, subjective, and misses subtle regressions. Use automated canary analysis (Argo Rollouts analysis, Flagger metrics, Spinnaker canary judge) comparing error rate, latency, and saturation
- [ ] **Missing automatic rollback trigger**: flag production deployments without automated rollback on error rate or latency threshold breach -- manual rollback depends on an engineer noticing the problem and acting quickly. Configure automatic rollback when error rate exceeds baseline by a configured threshold (e.g., 5x the normal error rate)
- [ ] **No rollback mechanism at all**: flag deployment pipelines with no rollback step, script, or procedure -- every deployment must have a tested rollback path. For Kubernetes, this is `kubectl rollout undo`; for CI-driven deploys, it is redeploying the previous artifact version
- [ ] **Rollback not tested**: flag rollback procedures that exist in documentation but are not exercised in CI or staging -- untested rollback procedures fail under pressure during real incidents. Run rollback as part of staging deployment validation

### Post-Deploy Validation
<!-- activation: keywords=["smoke", "health", "check", "verify", "validate", "post-deploy", "readiness", "liveness", "probe"] -->

- [ ] **Deploy without smoke test**: flag production deployment pipelines with no post-deploy smoke test or synthetic check -- a smoke test verifies that the deployed version starts, connects to dependencies, and serves basic requests. Without it, a broken deploy is discovered by users, not by the pipeline
- [ ] **Smoke test too shallow**: flag post-deploy checks that only verify HTTP 200 on the root path -- a meaningful smoke test should exercise critical user journeys (authentication, core CRUD, payment flow) to catch configuration and integration issues
- [ ] **Missing deploy notification**: flag production deployments without a notification step to team channels (Slack, Teams, PagerDuty) -- deployment notifications create awareness and help incident responders correlate deploy timing with issue onset
- [ ] **No deployment tracking**: flag deployments without a record of what version was deployed, when, and by whom -- deployment tracking is essential for incident investigation and audit compliance. Use deployment markers in monitoring tools (Datadog, Grafana annotations) or a deployment log

### Feature Flag Lifecycle
<!-- activation: keywords=["feature flag", "feature toggle", "flag", "toggle", "LaunchDarkly", "Unleash", "Flagsmith", "split", "flipper", "experiment"] -->

- [ ] **Stale feature flag**: flag feature flags that have been fully rolled out (100% enabled) for more than 30 days but remain in the codebase -- completed feature flags are dead code that adds branching complexity, confuses new developers, and accumulates tech debt. Remove the flag and the old code path after confirming the rollout is stable
- [ ] **Feature flag without expiration**: flag new feature flags added without an expiration date, cleanup ticket, or TTL -- without lifecycle tracking, flags accumulate indefinitely. Set an expiration date at creation time and create a cleanup task
- [ ] **Feature flag controlling infrastructure changes**: flag feature flags used to gate database migrations, schema changes, or infrastructure modifications -- infrastructure changes are not easily toggled off. Use deploy-time configuration or migration scripts instead of runtime flags
- [ ] **Missing feature flag default**: flag feature flags without a documented default value for when the flag service is unavailable -- flag service outages should degrade gracefully, typically to the old code path

### Deploy Freeze and Change Management
<!-- activation: keywords=["freeze", "maintenance", "window", "blackout", "change management", "approval", "gate"] -->

- [ ] **Missing deploy freeze mechanism**: flag production deployment pipelines without a mechanism to pause deployments during incidents, holidays, or change freeze periods -- without a freeze mechanism, automated deployments continue during critical incidents, compounding the problem
- [ ] **Missing deployment approval**: flag production deployment pipelines without a manual approval gate or automated policy check -- every production deployment should require explicit approval (manual or automated based on change risk assessment)
- [ ] **No pre-deploy environment validation**: flag production deployments without a staging or pre-production validation step -- deploying directly from CI to production without intermediate environment testing relies entirely on unit/integration tests, missing environment-specific issues

## Common False Positives

- **Internal tools and admin services**: low-traffic internal tools may legitimately use simple deployment strategies without canary or blue-green.
- **Database migrations**: database schema changes often cannot use canary deployment. Flag only application code deployments, not migration-only deploys.
- **Feature flags in experimentation**: A/B testing and experimentation flags have different lifecycle expectations than release flags. Experimentation flags may run for months.
- **Deploy freeze via external tooling**: deploy freezes may be managed by an external change management system (ServiceNow, PagerDuty) rather than in the CI pipeline. If you cannot verify, note the recommendation but reduce confidence.

## Severity Guidance

| Finding | Severity |
|---|---|
| Production deploy without any rollback mechanism | Critical |
| Big-bang deploy of critical service without progressive rollout | Important |
| Canary without metrics comparison (false confidence) | Important |
| Deploy to production without smoke test | Important |
| Missing deploy freeze mechanism (deploys continue during incidents) | Important |
| Missing deployment approval gate for production | Important |
| Stale feature flag (fully rolled out, not cleaned up) | Minor |
| Canary starting at >10% traffic | Minor |
| Missing deployment notification | Minor |
| Rollback procedure not tested | Minor |
| Feature flag without expiration or cleanup ticket | Minor |
| Deploy without tracking/audit record | Minor |

## See Also

- `cicd-github-actions` -- GitHub Actions deployment environment protection
- `cicd-gitlab-ci` -- GitLab CI environment protection and deploy freezes
- `cicd-merge-queue-and-branch-protection` -- branch protection and approval gates
- `cicd-pipeline-secrets-discipline` -- secrets in deployment pipelines
- `sec-owasp-a05-misconfiguration` -- deployment misconfiguration as security risk
- `container-image-hardening` -- image quality feeding into deployment safety

## Authoritative References

- [Argo Rollouts - Progressive Delivery](https://argoproj.github.io/argo-rollouts/)
- [Flagger - Progressive Delivery for Kubernetes](https://flagger.app/)
- [Google SRE Book: Release Engineering](https://sre.google/sre-book/release-engineering/)
- [Martin Fowler: Feature Toggles](https://martinfowler.com/articles/feature-toggles.html)
- [Kubernetes Deployment Strategies](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#strategy)
- [DORA: Accelerate State of DevOps](https://dora.dev/)
