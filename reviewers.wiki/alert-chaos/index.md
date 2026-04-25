---
id: alert-chaos
type: index
depth_role: subcategory
depth: 1
focus: "Action items without owner or deadline; Alert definition without a runbook link; Alert on cause (high CPU) instead of symptom (elevated latency); Alert rules not configured for new or regressing errors"
parents:
  - "../index.md"
shared_covers: []
entries:
  - id: compliance-soc2
    file: compliance-soc2.md
    type: primary
    focus: Detect SOC 2 Trust Service Criteria gaps including missing access reviews, absent change management process, missing availability monitoring, no incident response hooks, missing encryption, and vendor risk signals
    tags:
      - soc2
      - trust-service-criteria
      - access-control
      - change-management
      - availability
      - incident-response
      - compliance
      - AICPA
  - id: data-backup-restore-dr-rpo-rto
    file: data-backup-restore-dr-rpo-rto.md
    type: primary
    focus: "Detect missing backup strategies, untested restore procedures, undefined RPO/RTO, missing point-in-time recovery, and absent cross-region replication for disaster recovery"
    tags:
      - backup
      - restore
      - disaster-recovery
      - RPO
      - RTO
      - PITR
      - cross-region
      - resilience
      - data-architecture
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
  - id: reliability-graceful-degradation
    file: reliability-graceful-degradation.md
    type: primary
    focus: Detect all-or-nothing responses, missing fallbacks, untested degraded modes, and absent feature flags for degradation control
    tags:
      - graceful-degradation
      - fallback
      - feature-flag
      - resilience
      - partial-response
      - degraded-mode
      - kill-switch
  - id: test-chaos-engineering
    file: test-chaos-engineering.md
    type: primary
    focus: Detect missing failure injection for critical dependencies, absent steady-state hypotheses, uncontrolled blast radius, and missing rollback plans
    tags:
      - chaos-engineering
      - failure-injection
      - resilience
      - game-day
      - steady-state
      - blast-radius
      - circuit-breaker
      - fault-tolerance
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Alert Chaos

**Focus:** Action items without owner or deadline; Alert definition without a runbook link; Alert on cause (high CPU) instead of symptom (elevated latency); Alert rules not configured for new or regressing errors

## Children

| File | Type | Focus |
|------|------|-------|
| [compliance-soc2.md](compliance-soc2.md) | 📄 primary | Detect SOC 2 Trust Service Criteria gaps including missing access reviews, absent change management process, missing availability monitoring, no incident response hooks, missing encryption, and vendor risk signals |
| [data-backup-restore-dr-rpo-rto.md](data-backup-restore-dr-rpo-rto.md) | 📄 primary | Detect missing backup strategies, untested restore procedures, undefined RPO/RTO, missing point-in-time recovery, and absent cross-region replication for disaster recovery |
| [incident-response-postmortem-chaos-drill.md](incident-response-postmortem-chaos-drill.md) | 📄 primary | Detect gaps in incident response, postmortem discipline, chaos engineering, and DR drills -- absent templates, blameful language, unowned action items, untested game-days, and repeated incidents without systemic fixes |
| [obs-alerting-discipline.md](obs-alerting-discipline.md) | 📄 primary | Detect alerts without runbooks, symptom-vs-cause confusion, alert fatigue patterns, missing severity classification, missing auto-resolve, non-actionable paging, and thresholds not derived from SLOs |
| [obs-error-tracking-sentry-rollbar-bugsnag.md](obs-error-tracking-sentry-rollbar-bugsnag.md) | 📄 primary | Detect error tracking misconfiguration including missing initialization, PII in error payloads, missing source maps, broken alert rules, and poor error grouping |
| [obs-metrics-red-use-golden-signals.md](obs-metrics-red-use-golden-signals.md) | 📄 primary | Detect missing RED/USE/golden-signal metrics, cardinality explosions, incorrect histogram boundaries, missing units, and unlabeled metrics |
| [reliability-graceful-degradation.md](reliability-graceful-degradation.md) | 📄 primary | Detect all-or-nothing responses, missing fallbacks, untested degraded modes, and absent feature flags for degradation control |
| [test-chaos-engineering.md](test-chaos-engineering.md) | 📄 primary | Detect missing failure injection for critical dependencies, absent steady-state hypotheses, uncontrolled blast radius, and missing rollback plans |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
