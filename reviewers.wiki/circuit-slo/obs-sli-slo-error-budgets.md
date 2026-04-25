---
id: obs-sli-slo-error-budgets
type: primary
depth_role: leaf
focus: Detect missing SLI definitions, uncodified SLO thresholds, untracked error budgets, incorrect SLO metric choices, and missing burn-rate alerting
parents:
  - index.md
covers:
  - Critical user journeys without defined SLIs
  - SLO thresholds not codified in configuration or infrastructure-as-code
  - Error budget not tracked or not connected to release decisions
  - "SLO defined on wrong metric (uptime instead of latency percentile)"
  - Missing multi-window burn-rate alerting on SLOs
  - SLO not reviewed or recalibrated periodically
  - SLI measurement point not aligned with user experience
  - "SLO without clear consequence (no policy for budget exhaustion)"
  - Availability SLO counting only server errors, ignoring client-perceived failures
  - Latency SLO using mean instead of percentile
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
activation:
  file_globs:
    - "**/*sli*"
    - "**/*slo*"
    - "**/*error_budget*"
    - "**/*burn_rate*"
    - "**/*reliability*"
    - "**/*alert*"
    - "**/*monitor*"
    - "**/prometheus*rules*"
    - "**/sloth*"
    - "**/pyrra*"
  keyword_matches:
    - SLI
    - SLO
    - error_budget
    - error budget
    - burn_rate
    - burn rate
    - availability
    - latency_percentile
    - success_ratio
    - objective
    - reliability
    - nine
    - "99.9"
    - "99.99"
  structural_signals:
    - SLO configuration or definition file
    - Prometheus recording or alerting rule for SLI
    - Error budget calculation or dashboard definition
    - Deployment gate referencing error budget
source:
  origin: file
  path: obs-sli-slo-error-budgets.md
  hash: "sha256:3fcabb0b6c910a20fda355725639408a91f039b0b0a3fffe1f5b2847dae6cc59"
---
# SLI, SLO, and Error Budgets

## When This Activates

Activates when diffs contain SLI/SLO definitions, error budget calculations, burn-rate alert rules, reliability configuration, or keywords like `SLI`, `SLO`, `error_budget`, `burn_rate`, `availability`, `99.9`. Also activates on Prometheus recording rules, alerting rules, and deployment gate configurations that reference reliability targets. This reviewer ensures SLIs measure what users actually experience, SLOs are codified and actionable, and error budgets drive engineering decisions.

## Audit Surface

- [ ] Service or endpoint handling user-facing traffic without an SLI definition
- [ ] SLO threshold in documentation only, not in monitoring configuration
- [ ] Error budget burn rate not calculated or dashboarded
- [ ] SLO on uptime (binary up/down) instead of request success ratio
- [ ] Latency SLO using average instead of p95/p99 percentile
- [ ] SLI measured at server side only, ignoring load balancer or CDN errors
- [ ] No burn-rate alert for SLO (only threshold-based static alerts)
- [ ] SLO without defined consequence for budget exhaustion
- [ ] Error budget not gating deployments or change velocity
- [ ] SLO not reviewed in past 6 months (stale threshold)
- [ ] SLI query using wrong time window (instantaneous instead of rolling)
- [ ] Multiple SLOs with conflicting or redundant thresholds on same service

## Detailed Checks

### SLI Definition and Measurement
<!-- activation: keywords=["SLI", "indicator", "success", "error", "latency", "availability", "ratio", "good_events", "total_events", "valid_events"] -->

- [ ] **Critical user journey without SLI**: flag services or endpoints that handle user-facing traffic (login, checkout, search, API gateway) without a defined SLI -- if you cannot measure it, you cannot set an objective or detect degradation. Cross-reference with `obs-metrics-red-use-golden-signals` for the underlying RED metrics
- [ ] **SLI measured at wrong point**: flag SLIs measured at the application server when a load balancer, CDN, or API gateway sits in front -- user-perceived availability includes infrastructure failures that the application never sees
- [ ] **SLI counting only 5xx errors**: flag availability SLIs that count only server errors (5xx) as bad events, ignoring timeouts, connection resets, and client-perceived failures -- the SLI must reflect what the user experiences, not just what the server detects
- [ ] **Latency SLI using mean**: flag latency SLIs defined as average response time instead of a percentile (p95, p99) -- the mean hides tail latency that affects a significant fraction of users. Cross-reference with `obs-metrics-red-use-golden-signals` for histogram bucket alignment

### SLO Threshold Codification
<!-- activation: keywords=["SLO", "objective", "target", "threshold", "99", "99.9", "99.99", "percent", "nines"] -->

- [ ] **SLO in documentation only**: flag SLO targets that appear in wikis, READMEs, or design documents but are not codified in monitoring configuration (Prometheus rules, Datadog monitors, Sloth/Pyrra definitions) -- uncodified SLOs are not enforced and drift silently
- [ ] **SLO on wrong metric (uptime vs success ratio)**: flag SLOs defined as "99.9% uptime" (binary up/down over time) instead of "99.9% of requests succeed within 200ms" -- uptime SLOs hide partial degradation where the service is technically "up" but failing a significant fraction of requests
- [ ] **SLO threshold not evidence-based**: flag SLO targets chosen as round numbers (99.9%) without historical data showing the service can achieve them -- an SLO that is already violated is not an objective, it is a wish
- [ ] **Conflicting SLOs on same service**: flag multiple SLOs with overlapping scope but different thresholds that create ambiguity about which objective governs alerting and error budget decisions

### Error Budget Tracking
<!-- activation: keywords=["error_budget", "budget", "burn", "remaining", "consumed", "exhausted", "allowance", "margin", "deploy", "freeze"] -->

- [ ] **Error budget not calculated**: flag services with SLOs but no error budget dashboard or calculation -- without tracking remaining budget, teams cannot make informed decisions about risk vs velocity
- [ ] **Error budget not gating deployments**: flag CI/CD pipelines for SLO-covered services that do not check error budget before deploying -- deploys during budget exhaustion compound reliability problems. Cross-reference with `principle-fail-fast` for failing early on budget exhaustion
- [ ] **No consequence for budget exhaustion**: flag SLO definitions without a documented policy for what happens when the error budget is fully consumed (e.g., deploy freeze, mandatory reliability sprint, incident review) -- an SLO without consequences is not an objective
- [ ] **Budget calculated over wrong window**: flag error budget tracking using a calendar month when the SLO is defined over a rolling 30-day window, or vice versa -- window mismatch causes budget resets that obscure ongoing reliability problems

### Burn-Rate Alerting
<!-- activation: keywords=["burn_rate", "alert", "burn", "window", "multiwindow", "multi_burn", "page", "ticket", "fast_burn", "slow_burn"] -->

- [ ] **No burn-rate alert**: flag SLOs with only static threshold alerts (e.g., "alert if error rate > 1%") instead of multi-window burn-rate alerts -- static thresholds either page too late (budget already exhausted) or too often (brief spikes that self-resolve). Cross-reference with `obs-alerting-discipline`
- [ ] **Single-window burn rate**: flag burn-rate alerts using only one time window (e.g., 1-hour burn rate) without a short-window confirmation -- single-window alerts either miss slow burns (long window) or page on transient spikes (short window)
- [ ] **Missing slow-burn alert**: flag SLO alerting that only detects fast burns (budget consumed in hours) but not slow burns (budget consumed over days) -- slow burns are harder to detect but equally exhaust the budget
- [ ] **Alert severity not tiered by burn rate**: flag burn-rate alerts that page at the same severity regardless of burn speed -- a 14x burn rate (budget exhausted in ~1 hour) warrants an immediate page; a 2x burn rate (budget exhausted in ~15 days) warrants a ticket

### SLO Review and Maintenance
<!-- activation: keywords=["review", "recalibrate", "adjust", "update", "stale", "revision", "quarterly", "annual"] -->

- [ ] **SLO not reviewed periodically**: flag SLO definitions without a `last_reviewed` date or with a review date older than 6 months -- traffic patterns, user expectations, and system capabilities change; stale SLOs either under-protect (too lenient) or over-alert (too strict)
- [ ] **SLO tighter than dependency SLOs**: flag a service with a 99.99% SLO that depends on services with only 99.9% SLOs -- the service cannot be more reliable than its least reliable hard dependency without redundancy

## Common False Positives

- **Internal/infrastructure services**: not every internal microservice needs a user-facing SLO. Internal services should have SLOs but may express them as internal agreements rather than customer-facing commitments.
- **SLO-exempt endpoints**: health checks, metrics endpoints, and internal debugging APIs typically do not need SLOs.
- **SLO in external tooling**: some teams define SLOs in dedicated SLO platforms (Nobl9, Sloth, Pyrra) rather than in application code. Verify the SLO exists in the platform before flagging it as missing.
- **New services in ramp-up**: newly launched services may intentionally defer SLO definition until baseline performance data is collected.

## Severity Guidance

| Finding | Severity |
|---|---|
| Customer-facing service with no SLI or SLO defined | Critical |
| SLO defined but no burn-rate alerting configured | Important |
| SLI measured at wrong point (server-side only, missing infra failures) | Important |
| Latency SLO using mean instead of percentile | Important |
| Error budget not tracked or not gating deployments | Important |
| SLO in documentation only, not codified in monitoring | Important |
| SLO tighter than dependency SLOs without redundancy | Minor |
| SLO not reviewed in past 6 months | Minor |
| Error budget window mismatch (calendar vs rolling) | Minor |

## See Also

- `obs-metrics-red-use-golden-signals` -- RED metrics are the raw signals that SLIs are built from
- `obs-alerting-discipline` -- burn-rate alerts are the primary SLO enforcement mechanism
- `obs-distributed-tracing` -- traces help diagnose which component is consuming the error budget
- `obs-structured-logging` -- logs provide event-level detail for SLO violation investigation
- `principle-fail-fast` -- error budget exhaustion should trigger fast failure of risky changes

## Authoritative References

- [Google SRE Book - Chapter 4: Service Level Objectives](https://sre.google/sre-book/service-level-objectives/)
- [Google SRE Workbook - Chapter 2: Implementing SLOs](https://sre.google/workbook/implementing-slos/)
- [Sloth - SLO Generation Framework](https://sloth.dev/)
- [Google - Alerting on SLOs (multi-window, multi-burn-rate)](https://sre.google/workbook/alerting-on-slos/)
- [Alex Hidalgo - Implementing Service Level Objectives (O'Reilly)](https://www.oreilly.com/library/view/implementing-service-level/9781492076803/)
