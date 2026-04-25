---
id: circuit-slo
type: index
depth_role: subcategory
depth: 1
focus: Assignment not consistent across sessions or devices, breaking stratification; Availability SLO counting only server errors, ignoring client-perceived failures; Bucketing hash skewed or collides with other concurrent experiments; Circuit breaker absorbing failures silently with no alerting or logging
parents:
  - "../index.md"
shared_covers: []
entries:
  - id: experimentation-ab-testing-discipline
    file: experimentation-ab-testing-discipline.md
    type: primary
    focus: "Detect A/B test and experimentation gaps including missing primary metric, peeking before sample size reached, multiple-comparisons without correction, unmonitored SRM, broken stratified assignment, missing guardrail metrics, no power analysis, and no post-rollout holdout validation"
    tags:
      - experimentation
      - ab-testing
      - statistics
      - growth
      - product-analytics
      - feature-flags
      - statsig
      - optimizely
      - growthbook
      - split-io
  - id: obs-distributed-tracing
    file: obs-distributed-tracing.md
    type: primary
    focus: Detect missing span creation for external calls, broken trace context propagation, incorrect span granularity, missing error recording, and incomplete span attributes
    tags:
      - distributed-tracing
      - opentelemetry
      - spans
      - trace-context
      - propagation
      - W3C-traceparent
      - observability
      - sampling
      - instrumentation
  - id: obs-sli-slo-error-budgets
    file: obs-sli-slo-error-budgets.md
    type: primary
    focus: Detect missing SLI definitions, uncodified SLO thresholds, untracked error budgets, incorrect SLO metric choices, and missing burn-rate alerting
    tags:
      - SLI
      - SLO
      - error-budget
      - burn-rate
      - reliability
      - observability
      - golden-signals
      - availability
      - latency
      - site-reliability
  - id: reliability-circuit-breaker
    file: reliability-circuit-breaker.md
    type: primary
    focus: Detect missing circuit breakers on external calls, misconfigured thresholds, absent half-open recovery, hidden failures, and missing fallbacks
    tags:
      - circuit-breaker
      - resilience
      - fault-tolerance
      - fallback
      - cascading-failure
      - half-open
      - threshold
      - retry
      - backoff
      - jitter
      - transient-error
      - idempotency
      - thundering-herd
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Circuit Slo

**Focus:** Assignment not consistent across sessions or devices, breaking stratification; Availability SLO counting only server errors, ignoring client-perceived failures; Bucketing hash skewed or collides with other concurrent experiments; Circuit breaker absorbing failures silently with no alerting or logging

## Children

| File | Type | Focus |
|------|------|-------|
| [experimentation-ab-testing-discipline.md](experimentation-ab-testing-discipline.md) | 📄 primary | Detect A/B test and experimentation gaps including missing primary metric, peeking before sample size reached, multiple-comparisons without correction, unmonitored SRM, broken stratified assignment, missing guardrail metrics, no power analysis, and no post-rollout holdout validation |
| [obs-distributed-tracing.md](obs-distributed-tracing.md) | 📄 primary | Detect missing span creation for external calls, broken trace context propagation, incorrect span granularity, missing error recording, and incomplete span attributes |
| [obs-sli-slo-error-budgets.md](obs-sli-slo-error-budgets.md) | 📄 primary | Detect missing SLI definitions, uncodified SLO thresholds, untracked error budgets, incorrect SLO metric choices, and missing burn-rate alerting |
| [reliability-circuit-breaker.md](reliability-circuit-breaker.md) | 📄 primary | Detect missing circuit breakers on external calls, misconfigured thresholds, absent half-open recovery, hidden failures, and missing fallbacks |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
