---
id: obs-alerting-discipline
type: primary
depth_role: leaf
focus: Detect alerts without runbooks, symptom-vs-cause confusion, alert fatigue patterns, missing severity classification, missing auto-resolve, non-actionable paging, and thresholds not derived from SLOs
parents:
  - index.md
covers:
  - Alert definition without a runbook link
  - "Alert on cause (high CPU) instead of symptom (elevated latency)"
  - Too many low-value alerts causing alert fatigue
  - "Alert without severity classification (critical, warning, info)"
  - Alert without auto-resolve or expiration condition
  - "Paging on non-actionable metric (disk usage on auto-scaling volume)"
  - Missing alert deduplication or grouping
  - Alert threshold not derived from SLO or error budget burn rate
  - "Alert without clear ownership (team, service, escalation path)"
  - Static threshold alert on a metric with seasonal or trending baseline
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
activation:
  file_globs:
    - "**/*alert*"
    - "**/*alarm*"
    - "**/*rule*"
    - "**/*monitor*"
    - "**/*pagerduty*"
    - "**/*opsgenie*"
    - "**/prometheus*rules*"
    - "**/*notification*"
    - "**/*oncall*"
    - "**/*runbook*"
  keyword_matches:
    - alert
    - alarm
    - threshold
    - pagerduty
    - opsgenie
    - page
    - oncall
    - runbook
    - severity
    - critical
    - warning
    - notify
    - escalat
    - firing
    - pending
    - "for:"
  structural_signals:
    - Prometheus or Alertmanager rule definition
    - Datadog or CloudWatch alarm configuration
    - PagerDuty or OpsGenie integration setup
    - Alert routing or notification configuration
source:
  origin: file
  path: obs-alerting-discipline.md
  hash: "sha256:ed15868ecfff066ceaa7fd0fe5d169b173c9f8d37b592086e7e0caeab2d997ce"
---
# Alerting Discipline

## When This Activates

Activates when diffs contain alert definitions, alarm configurations, notification routing, runbook references, or keywords like `alert`, `alarm`, `pagerduty`, `opsgenie`, `runbook`, `severity`, `threshold`. Good alerting pages humans only for conditions that are urgent, user-impacting, and require human judgment. This reviewer enforces alert quality, actionability, appropriate severity, SLO-derived thresholds, and operational hygiene to prevent alert fatigue.

## Audit Surface

- [ ] Alert rule without annotations.runbook_url or equivalent
- [ ] Alert on CPU, memory, or disk without corresponding user-impact alert
- [ ] Service with more than 10 alerting rules suggesting over-alerting
- [ ] Alert without severity or priority label
- [ ] Alert rule missing for condition or resolve_when clause
- [ ] PagerDuty/OpsGenie page on warning-level alert
- [ ] Multiple alerts firing for the same root cause without grouping
- [ ] Alert threshold hardcoded as magic number without SLO reference
- [ ] Alert without owner label (team, service, component)
- [ ] Alert on absolute value where rate-of-change would be more meaningful
- [ ] Alert with pending/for duration of 0 (fires on single scrape)
- [ ] Alert that has not fired in 6+ months (possibly stale)
- [ ] Alert description that does not explain impact or next steps
- [ ] Critical alert routed to email instead of paging channel

## Detailed Checks

### Runbook and Context Requirements
<!-- activation: keywords=["runbook", "playbook", "annotation", "description", "summary", "message", "documentation", "link", "url", "wiki"] -->

- [ ] **Alert without runbook link**: flag alert definitions that lack a `runbook_url` annotation or equivalent documentation link -- an on-call engineer at 3 AM should not have to reverse-engineer the alert; every alert must link to a runbook describing impact, diagnosis steps, and remediation
- [ ] **Alert description missing impact statement**: flag alert annotations/descriptions that explain the technical condition but not the user or business impact -- "disk usage above 90%" is a condition; "order processing will fail when disk is full" is actionable context
- [ ] **Alert without ownership**: flag alerts missing a team, service, or component label -- unowned alerts have no clear escalation path and degrade on-call effectiveness

### Symptom-Based Alerting
<!-- activation: keywords=["cpu", "memory", "disk", "network", "load", "utilization", "saturation", "latency", "error_rate", "availability", "throughput", "queue"] -->

- [ ] **Alert on cause instead of symptom**: flag alerts on infrastructure causes (high CPU, high memory, disk filling) without a corresponding symptom-based alert (elevated latency, error rate, reduced throughput) -- cause-based alerts page for conditions that may not affect users (e.g., high CPU during a batch job that completes successfully). Cross-reference with `obs-metrics-red-use-golden-signals`
- [ ] **Alert on absolute value instead of rate-of-change**: flag alerts using static thresholds on metrics with known seasonal or trending baselines (e.g., "alert if requests > 10000/min") -- rate-of-change or anomaly detection catches sudden drops/spikes regardless of absolute traffic level
- [ ] **Infrastructure alert without user-impact correlation**: flag standalone infrastructure alerts (node CPU > 80%) that do not reference or co-fire with a user-impact alert -- infrastructure degradation that does not impact users should be a ticket, not a page

### Alert Fatigue Prevention
<!-- activation: keywords=["alert", "fire", "page", "noise", "flap", "false_positive", "suppress", "silence", "inhibit", "group", "deduplicate", "throttle"] -->

- [ ] **Too many alerts per service**: flag services with more than 8-10 distinct alerting rules -- each alert must justify its existence; excessive alerts dilute attention and cause on-call engineers to ignore pages
- [ ] **Alert with zero pending duration**: flag alert rules with `for: 0` or no pending duration -- these fire on a single scrape/evaluation, catching transient spikes that self-resolve in seconds
- [ ] **Missing alert grouping**: flag Alertmanager or equivalent routing that does not group related alerts by service or alert name -- an outage causing 5 symptoms should produce 1 notification with 5 grouped alerts, not 5 separate pages
- [ ] **Missing inhibition rules**: flag alert configurations without inhibition rules that suppress downstream alerts when a root-cause alert fires -- if the database is down, suppress all database-dependent service alerts
- [ ] **Flapping alert**: flag alerts that fire and resolve repeatedly (historical pattern) without hysteresis or evaluation window adjustment -- flapping alerts train on-call to ignore them

### Severity and Routing
<!-- activation: keywords=["severity", "critical", "warning", "info", "priority", "page", "ticket", "email", "slack", "route", "receiver", "channel", "escalat"] -->

- [ ] **Alert without severity classification**: flag alert rules without a severity or priority label -- severity drives routing; without it, all alerts are treated equally, either all pages or all ignored
- [ ] **Warning-level alert routed to paging channel**: flag alert routing that sends warning or informational alerts to PagerDuty, OpsGenie, or phone-based paging -- warnings should create tickets or Slack messages, not wake people up. Cross-reference with `obs-sli-slo-error-budgets` for severity derivation from burn rate
- [ ] **Critical alert routed to email only**: flag critical alerts sent only to email or low-urgency channels -- critical means "requires immediate human intervention" and must route to a paging system
- [ ] **Missing escalation path**: flag paging alerts without escalation policy (secondary on-call, manager escalation after timeout) -- if the primary on-call does not acknowledge, the alert must escalate

### SLO-Derived Thresholds
<!-- activation: keywords=["threshold", "SLO", "SLI", "burn_rate", "error_budget", "target", "objective", "99", "percent", "ratio", "baseline"] -->

- [ ] **Threshold not derived from SLO**: flag alert thresholds set as arbitrary magic numbers (e.g., "error rate > 5%") without documented connection to an SLO target -- thresholds should be mathematically derived from the SLO so that alerts fire at the right time relative to budget consumption. Cross-reference with `obs-sli-slo-error-budgets`
- [ ] **Static threshold on SLO metric instead of burn rate**: flag alerts using static thresholds on the SLI metric (e.g., "error rate > 0.1%") instead of multi-window burn-rate alerts -- static thresholds either page too late (after budget is exhausted) or too early (on brief spikes)
- [ ] **Missing auto-resolve condition**: flag alert definitions without a resolve condition -- alerts that never auto-resolve accumulate as "permanently firing" noise, requiring manual intervention to clear even after the condition recovers

## Common False Positives

- **Infrastructure alerts required by compliance**: some compliance frameworks (SOC2, PCI-DSS) require infrastructure-level alerts (disk, CPU) regardless of symptom-based alerting. These should still have runbooks and severity classification.
- **New service without baseline data**: newly deployed services may use temporary static thresholds until enough data exists for SLO derivation. Flag only if the service has been in production for more than 30 days.
- **Alert definitions in monitoring-as-code templates**: Terraform modules or Helm charts may define alert templates with placeholder thresholds. Verify whether the deployed values are customized.
- **Intentionally noisy dev/staging alerts**: development environments may have lower thresholds for early detection. Flag only production alert configurations.

## Severity Guidance

| Finding | Severity |
|---|---|
| Critical alert routed to email or low-urgency channel | Critical |
| Alert without any runbook or documentation link | Important |
| Warning alert routed to paging channel (alert fatigue risk) | Important |
| Alert threshold not derived from SLO or burn rate | Important |
| Alert without severity classification | Important |
| Missing alert grouping causing notification storms | Important |
| Alert on cause without corresponding symptom-based alert | Minor |
| Alert without auto-resolve condition | Minor |
| Alert with zero pending/for duration | Minor |
| Service with 10+ alerting rules (over-alerting risk) | Minor |

## See Also

- `obs-sli-slo-error-budgets` -- SLOs define the thresholds and burn rates that drive alert configuration
- `obs-metrics-red-use-golden-signals` -- symptom-based alerts should be built on RED/USE metrics
- `obs-structured-logging` -- alert investigation requires searchable structured logs
- `obs-distributed-tracing` -- traces diagnose the root cause after an alert fires
- `sec-owasp-a09-logging-monitoring-failures` -- security events require their own alerting discipline
- `principle-fail-fast` -- alerts should fire fast enough to prevent cascading failures

## Authoritative References

- [Google SRE Workbook - Chapter 5: Alerting on SLOs](https://sre.google/workbook/alerting-on-slos/)
- [Rob Ewaschuk - My Philosophy on Alerting](https://docs.google.com/document/d/199PqyG3UsyXlwieHaqbGiWVa8eMWi8zzAn0YfcApr8Q/edit)
- [Prometheus Alerting Best Practices](https://prometheus.io/docs/practices/alerting/)
- [PagerDuty Incident Response Documentation](https://response.pagerduty.com/)
- [Google SRE Book - Chapter 11: Being On-Call](https://sre.google/sre-book/being-on-call/)
