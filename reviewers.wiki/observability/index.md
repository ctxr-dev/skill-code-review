---
id: observability
type: index
depth_role: subcategory
depth: 1
focus: "observability: Detect analytics event-schema gaps including inconsistent naming conventions, no event registry, PII in event properties, high-cardinality dimensions, unversioned payload changes, duplicated events, missing identify-on-aut..."
parents:
  - "../index.md"
shared_covers: []
tags:
  - a09
  - ab-testing
  - alert-fatigue
  - alerting
  - amplitude
  - analytics
  - audit
  - audit-log
  - audit-trail
  - availability
  - batch-processor
  - blameless
  - bpf
  - bugsnag
  - burn-rate
  - cardinality
  - chaos-engineering
  - compliance
  - config
  - configuration
generator: "skill-llm-wiki/v1"
entries:
  - id: analytics-event-schema-discipline
    file: analytics-event-schema-discipline.md
    type: primary
    focus: Detect analytics event-schema gaps including inconsistent naming conventions, no event registry, PII in event properties, high-cardinality dimensions, unversioned payload changes, duplicated events, missing identify-on-auth anonymous stitching, and third-party sends without contract review
    tags:
      - analytics
      - event-schema
      - tracking-plan
      - product-analytics
      - governance
      - data-quality
      - mixpanel
      - amplitude
      - segment
      - rudderstack
      - posthog
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
  - id: incident-response-postmortem-chaos-drill
    file: incident-response-postmortem-chaos-drill.md
    type: primary
    focus: Detect gaps in incident response, postmortem discipline, chaos engineering, and DR drills -- absent templates, blameful language, unowned action items, untested game-days, and repeated incidents without systemic fixes
    tags:
      - incident-response
      - postmortem
      - chaos-engineering
      - gameday
      - dr-drill
      - mttr
      - mtta
      - sev
      - runbook
      - blameless
  - id: obs-alerting-discipline
    file: obs-alerting-discipline.md
    type: primary
    focus: Detect alerts without runbooks, symptom-vs-cause confusion, alert fatigue patterns, missing severity classification, missing auto-resolve, non-actionable paging, and thresholds not derived from SLOs
    tags:
      - alerting
      - runbook
      - alert-fatigue
      - severity
      - paging
      - on-call
      - deduplication
      - SLO
      - burn-rate
      - observability
  - id: obs-audit-trail
    file: obs-audit-trail.md
    type: primary
    focus: "Detect missing audit logs for data modifications, non-tamper-evident audit storage, incomplete who/what/when/where fields, co-mingled audit and application logs, and retention violations"
    tags:
      - audit-trail
      - audit-log
      - compliance
      - tamper-evident
      - immutable
      - SOC2
      - GDPR
      - HIPAA
      - PCI-DSS
      - data-modification
      - observability
      - owasp
      - a09
      - logging
      - monitoring
      - audit
      - log-injection
      - PII
      - sensitive-data
      - alerting
      - SIEM
      - security
      - structured-logging
      - log-format
      - correlation-id
      - trace-id
      - CWE-117
      - CWE-532
      - pii
      - log-levels
  - id: obs-cardinality-budgeting
    file: obs-cardinality-budgeting.md
    type: primary
    focus: Detect unbounded metric labels, high-cardinality trace attributes, and log fields that cause storage cost explosion and backend instability
    tags:
      - cardinality
      - metrics
      - labels
      - dimensions
      - TSDB
      - cost
      - explosion
      - observability
      - prometheus
      - datadog
      - high-cardinality
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
  - id: obs-ebpf-discipline
    file: obs-ebpf-discipline.md
    type: primary
    focus: Detect eBPF program safety violations including missing bounds checks, verifier non-compliance, kernel compatibility issues, map size limits, and unsafe memory access
    tags:
      - ebpf
      - bpf
      - kernel
      - verifier
      - safety
      - probe
      - tracepoint
      - kprobe
      - map
      - observability
      - performance
      - linux
  - id: obs-error-tracking-sentry-rollbar-bugsnag
    file: obs-error-tracking-sentry-rollbar-bugsnag.md
    type: primary
    focus: Detect error tracking misconfiguration including missing initialization, PII in error payloads, missing source maps, broken alert rules, and poor error grouping
    tags:
      - error-tracking
      - sentry
      - rollbar
      - bugsnag
      - errors
      - exceptions
      - source-maps
      - PII
      - alerting
      - observability
      - release
  - id: obs-metrics-red-use-golden-signals
    file: obs-metrics-red-use-golden-signals.md
    type: primary
    focus: "Detect missing RED/USE/golden-signal metrics, cardinality explosions, incorrect histogram boundaries, missing units, and unlabeled metrics"
    tags:
      - metrics
      - RED
      - USE
      - golden-signals
      - prometheus
      - histogram
      - counter
      - gauge
      - cardinality
      - SLI
      - observability
  - id: obs-opentelemetry-sdk-discipline
    file: obs-opentelemetry-sdk-discipline.md
    type: primary
    focus: Detect OTel SDK misconfiguration including missing exporters, NOOP providers in production, broken context propagation, and missing resource attributes
    tags:
      - opentelemetry
      - otel
      - tracing
      - metrics
      - sdk
      - exporter
      - propagation
      - resource
      - batch-processor
      - observability
  - id: obs-sampling-strategies
    file: obs-sampling-strategies.md
    type: primary
    focus: Detect trace sampling misconfigurations that lose critical signal, over-sample routine traffic, or produce inconsistent sampling decisions across services
    tags:
      - sampling
      - tracing
      - head-sampling
      - tail-sampling
      - cost
      - observability
      - opentelemetry
      - probabilistic
      - rate
      - traces
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
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Observability

**Focus:** observability: Detect analytics event-schema gaps including inconsistent naming conventions, no event registry, PII in event properties, high-cardinality dimensions, unversioned payload changes, duplicated events, missing identify-on-aut...

## Children

| File | Type | Focus |
|------|------|-------|
| [analytics-event-schema-discipline.md](analytics-event-schema-discipline.md) | 📄 primary | Detect analytics event-schema gaps including inconsistent naming conventions, no event registry, PII in event properties, high-cardinality dimensions, unversioned payload changes, duplicated events, missing identify-on-auth anonymous stitching, and third-party sends without contract review |
| [experimentation-ab-testing-discipline.md](experimentation-ab-testing-discipline.md) | 📄 primary | Detect A/B test and experimentation gaps including missing primary metric, peeking before sample size reached, multiple-comparisons without correction, unmonitored SRM, broken stratified assignment, missing guardrail metrics, no power analysis, and no post-rollout holdout validation |
| [feature-flag-platforms-launchdarkly-unleash-growthbook-openfeature.md](feature-flag-platforms-launchdarkly-unleash-growthbook-openfeature.md) | 📄 primary | Detect misuse of feature-flag platforms (LaunchDarkly, Unleash, GrowthBook, OpenFeature) -- evaluation context, default variations, expiry, hot-path evaluation, PII leakage, and cleanup |
| [incident-response-postmortem-chaos-drill.md](incident-response-postmortem-chaos-drill.md) | 📄 primary | Detect gaps in incident response, postmortem discipline, chaos engineering, and DR drills -- absent templates, blameful language, unowned action items, untested game-days, and repeated incidents without systemic fixes |
| [obs-alerting-discipline.md](obs-alerting-discipline.md) | 📄 primary | Detect alerts without runbooks, symptom-vs-cause confusion, alert fatigue patterns, missing severity classification, missing auto-resolve, non-actionable paging, and thresholds not derived from SLOs |
| [obs-audit-trail.md](obs-audit-trail.md) | 📄 primary | Detect missing audit logs for data modifications, non-tamper-evident audit storage, incomplete who/what/when/where fields, co-mingled audit and application logs, and retention violations |
| [obs-cardinality-budgeting.md](obs-cardinality-budgeting.md) | 📄 primary | Detect unbounded metric labels, high-cardinality trace attributes, and log fields that cause storage cost explosion and backend instability |
| [obs-distributed-tracing.md](obs-distributed-tracing.md) | 📄 primary | Detect missing span creation for external calls, broken trace context propagation, incorrect span granularity, missing error recording, and incomplete span attributes |
| [obs-ebpf-discipline.md](obs-ebpf-discipline.md) | 📄 primary | Detect eBPF program safety violations including missing bounds checks, verifier non-compliance, kernel compatibility issues, map size limits, and unsafe memory access |
| [obs-error-tracking-sentry-rollbar-bugsnag.md](obs-error-tracking-sentry-rollbar-bugsnag.md) | 📄 primary | Detect error tracking misconfiguration including missing initialization, PII in error payloads, missing source maps, broken alert rules, and poor error grouping |
| [obs-metrics-red-use-golden-signals.md](obs-metrics-red-use-golden-signals.md) | 📄 primary | Detect missing RED/USE/golden-signal metrics, cardinality explosions, incorrect histogram boundaries, missing units, and unlabeled metrics |
| [obs-opentelemetry-sdk-discipline.md](obs-opentelemetry-sdk-discipline.md) | 📄 primary | Detect OTel SDK misconfiguration including missing exporters, NOOP providers in production, broken context propagation, and missing resource attributes |
| [obs-sampling-strategies.md](obs-sampling-strategies.md) | 📄 primary | Detect trace sampling misconfigurations that lose critical signal, over-sample routine traffic, or produce inconsistent sampling decisions across services |
| [obs-sli-slo-error-budgets.md](obs-sli-slo-error-budgets.md) | 📄 primary | Detect missing SLI definitions, uncodified SLO thresholds, untracked error budgets, incorrect SLO metric choices, and missing burn-rate alerting |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
