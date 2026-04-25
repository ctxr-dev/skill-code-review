---
id: test-chaos-engineering
type: primary
depth_role: leaf
focus: Detect missing failure injection for critical dependencies, absent steady-state hypotheses, uncontrolled blast radius, and missing rollback plans
parents:
  - index.md
covers:
  - "Critical dependency without failure injection experiments (database, cache, message broker, third-party API)"
  - Chaos experiment without a defined steady-state hypothesis
  - "Blast radius not controlled: experiment affects production users without guardrails"
  - No rollback plan or automated halt mechanism for chaos experiments
  - Chaos experiment running in production without prior staging validation
  - "Missing observability: chaos experiment runs but metrics/logs are not monitored"
  - Failure injection targeting only single-node failures, not correlated or cascading failures
  - No game day schedule or regular chaos experiment cadence
  - Chaos experiment hardcoded to specific infrastructure, not portable across environments
  - Chaos tooling configuration not version-controlled
tags:
  - chaos-engineering
  - failure-injection
  - resilience
  - game-day
  - steady-state
  - blast-radius
  - circuit-breaker
  - fault-tolerance
activation:
  file_globs:
    - "**/*chaos*"
    - "**/*Chaos*"
    - "**/*litmus*"
    - "**/*gremlin*"
    - "**/*toxiproxy*"
    - "**/*failure*inject*"
    - "**/experiments/**"
    - "**/*resilience*"
    - "**/*fault*"
  keyword_matches:
    - chaos
    - Chaos
    - ChaosMonkey
    - litmus
    - gremlin
    - toxiproxy
    - chaos-mesh
    - chaosblade
    - experiment
    - failure injection
    - fault injection
    - steady state
    - blast radius
    - game day
    - circuit breaker
    - retry
    - fallback
    - resilience
  structural_signals:
    - chaos_experiment_definition
    - failure_injection_config
    - steady_state_hypothesis
source:
  origin: file
  path: test-chaos-engineering.md
  hash: "sha256:23946b58a0349db1ca9bf1d5ac87e8f019d19cfb737035b81bbc807f91ef0a6c"
---
# Chaos Engineering

## When This Activates

Activates when the diff modifies chaos experiment definitions, resilience-related code (circuit breakers, retries, fallbacks, bulkheads), or when production code adds new critical dependencies without corresponding chaos experiments. Chaos engineering validates that the system behaves correctly under failure conditions; without it, resilience patterns are untested assumptions.

## Audit Surface

- [ ] Service with >3 external dependencies and no chaos experiment definitions
- [ ] Chaos experiment YAML/config file without a steady-state hypothesis section
- [ ] Chaos experiment with no abort conditions or automatic halt triggers
- [ ] Chaos experiment targeting production with no staging dry-run evidence
- [ ] Failure injection for network latency but not for complete network partition
- [ ] Chaos experiment without monitoring dashboard or alert integration
- [ ] No rollback procedure documented for the chaos experiment
- [ ] Chaos experiment that injects failure permanently instead of for a bounded duration
- [ ] Missing chaos experiment for: CPU saturation, memory pressure, disk full, DNS failure
- [ ] Chaos configuration not in version control
- [ ] Service circuit breaker or retry logic not validated by any chaos experiment
- [ ] No evidence of past game days or chaos experiment results

## Detailed Checks

### Missing Failure Injection
<!-- activation: keywords=["dependency", "database", "cache", "redis", "queue", "kafka", "api", "http", "grpc", "circuit", "retry", "fallback", "timeout", "connection"] -->

- [ ] **Untested dependency failure**: service depends on a database, cache, message broker, or third-party API but no chaos experiment simulates that dependency being unavailable -- each critical dependency should have at least a network-partition and latency-injection experiment
- [ ] **Circuit breaker untested**: code includes a circuit breaker pattern but no experiment verifies it opens, transitions to half-open, and recovers correctly under real failure conditions
- [ ] **Retry logic untested**: retry configuration (count, backoff, jitter) exists but no experiment verifies the retry behavior under sustained failure -- retries without backoff can cause cascading overload
- [ ] **Fallback path untested**: code has a fallback (cached response, default value, degraded mode) for dependency failure, but no experiment verifies the fallback activates correctly and provides acceptable service quality
- [ ] **Single-point failure only**: experiments test single-dependency failure but not correlated failures (database AND cache down, two services failing simultaneously) -- production outages are often multi-failure scenarios

### Steady-State Hypothesis
<!-- activation: keywords=["hypothesis", "steady state", "steady-state", "metric", "baseline", "expected", "normal", "slo", "sla", "availability", "error rate", "latency"] -->

- [ ] **No hypothesis defined**: chaos experiment injects failure but does not define what "success" looks like -- every experiment must state the expected steady-state behavior (e.g., "error rate stays below 1%, p99 latency stays below 500ms")
- [ ] **Hypothesis too vague**: hypothesis says "system remains available" without quantifiable metrics -- define specific, measurable criteria tied to SLOs
- [ ] **No pre-experiment baseline**: experiment does not measure steady-state metrics before injecting failure -- without a baseline, it is impossible to determine if the system degraded
- [ ] **Hypothesis not monitored**: the steady-state metrics exist but are not actively monitored during the experiment -- manual observation is unreliable; integrate with alerting

### Blast Radius Control
<!-- activation: keywords=["blast radius", "scope", "production", "staging", "canary", "percentage", "users", "traffic", "rollback", "halt", "abort", "safeguard"] -->

- [ ] **Uncontrolled production experiment**: chaos experiment targets all production instances or all users without traffic limiting -- start with a canary (1-5% of traffic) and expand gradually
- [ ] **No abort mechanism**: experiment has no automatic halt condition (e.g., "abort if error rate exceeds 5%") -- runaway experiments can cause real outages
- [ ] **No rollback plan**: experiment documentation does not describe how to restore normal operation if the experiment causes unexpected damage -- document manual and automated rollback steps
- [ ] **No staging validation**: experiment is defined directly for production with no evidence of a prior staging or pre-production dry run -- validate experiment safety in non-production environments first
- [ ] **Permanent failure injection**: experiment injects failure without a time bound or automatic recovery -- all failure injections should have a maximum duration after which normal conditions are restored

### Observability and Documentation
<!-- activation: keywords=["monitor", "dashboard", "grafana", "alert", "log", "trace", "metric", "report", "game day", "runbook", "document", "result"] -->

- [ ] **No monitoring during experiment**: chaos experiment runs but no one is watching dashboards, alerts, or logs -- experiments without real-time observability cannot detect unexpected cascading failures
- [ ] **No experiment results documented**: past experiments have no recorded results, findings, or action items -- document what was learned and what was fixed
- [ ] **No game day schedule**: chaos experiments are ad-hoc with no regular cadence -- schedule quarterly or monthly game days to continuously validate resilience
- [ ] **Configuration not versioned**: chaos experiment definitions are stored only in a GUI or ephemeral configuration -- version-control experiment definitions alongside the code they validate

## Common False Positives

- **New services in early development**: services that are not yet in production or are behind a feature flag do not need chaos experiments immediately. Flag only for production-deployed services.
- **Stateless proxy or gateway services**: thin proxy services with no business logic and a single upstream dependency may not need full chaos experiments if the upstream service has its own resilience validation.
- **Teams with established game day practices**: teams that run regular game days may not have experiment definitions in code. Verify that game days are documented and recurring before flagging.
- **Development/testing environments**: chaos experiments in dev/test environments do not need the same blast radius controls as production experiments.

## Severity Guidance

| Finding | Severity |
|---|---|
| Production chaos experiment with no abort conditions or automatic halt | Critical |
| Chaos experiment targeting 100% of production traffic without canary phase | Critical |
| Critical dependency (database, auth, payment) with no failure injection experiment | Important |
| Chaos experiment without a defined steady-state hypothesis | Important |
| Circuit breaker or retry logic not validated by any chaos experiment | Important |
| No monitoring during chaos experiment execution | Important |
| Chaos configuration not version-controlled | Minor |
| No regular game day schedule | Minor |
| Missing experiment results documentation from past runs | Minor |

## See Also

- `test-integration` -- integration tests verify happy-path interactions; chaos experiments verify failure-path behavior
- `test-load-k6-locust-gatling-jmeter` -- load tests verify performance under normal load; chaos tests verify behavior under failure
- `principle-fail-fast` -- circuit breakers and fallbacks must fail fast and visibly, which chaos experiments validate
- `principle-separation-of-concerns` -- resilience logic (retries, circuit breakers) should be separated from business logic for testability

## Authoritative References

- [Casey Rosenthal & Nora Jones, *Chaos Engineering* (O'Reilly, 2020)](https://www.oreilly.com/library/view/chaos-engineering/9781492043866/)
- [Principles of Chaos Engineering -- principlesofchaos.org](https://principlesofchaos.org/)
- [Netflix, "Chaos Monkey" -- original chaos engineering tool](https://netflix.github.io/chaosmonkey/)
- [Chaos Mesh -- Kubernetes-native chaos engineering](https://chaos-mesh.org/)
- [LitmusChaos -- cloud-native chaos engineering framework](https://litmuschaos.io/)
- [Google SRE Book, Chapter 17: "Testing for Reliability"](https://sre.google/sre-book/testing-reliability/)
