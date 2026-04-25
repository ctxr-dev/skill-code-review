---
id: modern-parallel-run
type: primary
depth_role: leaf
focus: "Detect parallel run (shadow traffic) failures where execution lacks result comparison, comparison is incomplete, divergence has no alerting, the parallel path outlives its validation period, or performance impact is unmeasured"
parents:
  - index.md
covers:
  - Parallel execution of old and new code paths without comparing results
  - Comparison logic that checks only status codes or top-level fields, missing nested data
  - No alerting or metric emission when old and new results diverge
  - Parallel path left enabled in production after the validation period ends
  - Performance overhead of running both paths not measured or bounded
  - Side effects executed by both paths causing double-writes or duplicate events
  - "Parallel run not isolated -- failure in new path affects old path's response"
  - Comparison ignores non-deterministic fields without documenting exclusions
tags:
  - parallel-run
  - shadow-traffic
  - dark-launch
  - comparison
  - divergence
  - migration
  - verification
activation:
  file_globs:
    - "**/parallel*"
    - "**/shadow*"
    - "**/mirror*"
    - "**/compare*"
    - "**/dual*"
    - "**/experiment*"
  keyword_matches:
    - parallel
    - shadow
    - mirror
    - compare
    - diverge
    - dark launch
    - dual run
    - side-by-side
    - experiment
    - candidate
    - control
    - scientist
  structural_signals:
    - parallel_execution
    - result_comparison
    - shadow_traffic
    - dual_path
source:
  origin: file
  path: modern-parallel-run.md
  hash: "sha256:799bec709fdaef4d8d53793e51fbeb962f79db7dbce9c9e109fd51a063368a00"
---
# Parallel Run (Shadow Traffic)

## When This Activates

Activates when diffs introduce parallel execution of old and new code paths, shadow traffic routing, result comparison logic, or experiment/scientist-style wrappers. A parallel run executes both the old (control) and new (candidate) implementations for the same input, compares their outputs, and uses only the control's result while building confidence in the candidate. This reviewer flags runs without comparison, incomplete comparison logic, missing alerting on divergence, runs that outlive their purpose, and runs that cause side-effect duplication or performance degradation.

## Audit Surface

- [ ] Both old and new implementations called but only one result used without comparison
- [ ] Comparison checks response status but ignores response body or side effects
- [ ] Divergence detected but only logged at debug level with no alert
- [ ] Parallel run has no expiration date, feature flag, or kill switch
- [ ] New path's latency not measured independently from old path
- [ ] Both paths write to the same database, queue, or external system
- [ ] Exception in new path propagates and breaks old path's response
- [ ] Non-deterministic fields (timestamps, UUIDs) not excluded from comparison
- [ ] Comparison result not persisted for later analysis
- [ ] No timeout on the new path to prevent it from slowing the old path
- [ ] Parallel run enabled for 100% of traffic instead of a configurable sample
- [ ] Memory overhead of holding both results not bounded

## Detailed Checks

### Result Comparison Completeness
<!-- activation: keywords=["compare", "diff", "equal", "match", "assert", "diverge", "mismatch", "result", "response", "output"] -->

- [ ] **No comparison at all**: flag parallel execution where the candidate result is discarded without any comparison to the control -- the parallel run provides zero validation value without comparison
- [ ] **Shallow comparison**: flag comparison logic that checks only status codes, return types, or top-level fields while ignoring nested objects, array ordering, or body content -- shallow comparison misses the most common divergence categories
- [ ] **Missing field coverage**: flag comparison that hardcodes a subset of fields instead of comparing the full response structure -- newly added fields in the candidate will silently diverge without detection
- [ ] **Non-deterministic fields not excluded**: flag comparison failures caused by timestamps, UUIDs, random values, or ordering differences that are expected to differ -- these should be explicitly excluded with documentation explaining why
- [ ] **Comparison results not persisted**: flag parallel runs where divergence is detected in-memory but not stored for offline analysis -- persisted results enable trend analysis and root-cause investigation

### Divergence Alerting and Observability
<!-- activation: keywords=["alert", "metric", "log", "monitor", "diverge", "mismatch", "threshold", "rate", "dashboard"] -->

- [ ] **No alerting on divergence**: flag parallel runs that compare results but have no alerting mechanism when divergence exceeds a threshold -- silent divergence defeats the purpose of the parallel run
- [ ] **Debug-level logging only**: flag divergence events logged at debug or trace level instead of warn/error with structured fields -- debug logs are typically not monitored and may be filtered out
- [ ] **No divergence rate metric**: flag parallel runs without a metric tracking the divergence rate over time -- a metric enables dashboards, alerts, and trend analysis
- [ ] **Missing threshold for acceptable divergence**: flag setups that alert on every single divergence instead of a configurable threshold -- noisy alerts lead to alert fatigue and ignored divergence

### Side-Effect Isolation
<!-- activation: keywords=["write", "insert", "update", "delete", "publish", "emit", "send", "queue", "event", "database", "side effect"] -->

- [ ] **Duplicate side effects**: flag parallel runs where both control and candidate write to the same database, publish to the same queue, or call the same external service -- this causes double-writes, duplicate events, or double-charges
- [ ] **Candidate path not read-only**: flag candidate implementations that perform writes or mutations during a parallel run -- the candidate path should be read-only or write to a shadow/staging destination
- [ ] **Side-effect comparison instead of isolation**: flag attempts to compare side effects (e.g., checking that both paths wrote the same row) instead of making the candidate path side-effect-free -- comparison of side effects is fragile and risks data corruption

### Failure Isolation and Performance Bounds
<!-- activation: keywords=["timeout", "catch", "error", "exception", "latency", "async", "thread", "performance", "overhead", "circuit"] -->

- [ ] **Candidate failure breaks control**: flag parallel execution where an exception or panic in the candidate path propagates to the control path, affecting the returned result -- the candidate must be fully isolated; wrap it in a try/catch or run it asynchronously
- [ ] **No timeout on candidate**: flag candidate execution without a timeout -- a slow or hung candidate should not delay the control path's response or consume resources indefinitely
- [ ] **Synchronous blocking**: flag parallel runs where the control path blocks waiting for the candidate to complete before returning -- run the candidate asynchronously unless comparison must happen inline
- [ ] **No performance measurement**: flag parallel runs without independent latency metrics for the candidate path -- measuring the candidate's performance is a key goal of the parallel run
- [ ] **Resource overhead unmeasured**: flag parallel runs without monitoring of CPU, memory, or thread pool usage -- running both paths doubles resource consumption, which must be measured and bounded

### Lifecycle and Expiration
<!-- activation: keywords=["flag", "toggle", "expire", "disable", "remove", "cleanup", "sample", "percentage", "duration", "temporary"] -->

- [ ] **No kill switch**: flag parallel runs with no feature flag or configuration to disable the candidate path -- an emergency kill switch is essential when the candidate causes unexpected load or errors
- [ ] **No expiration plan**: flag parallel runs without a documented end date or success criteria for promotion -- parallel runs are temporary; without an end condition they become permanent overhead
- [ ] **100% traffic without ramp**: flag parallel runs enabled for all traffic from the start instead of a configurable sample percentage -- start at 1-5% and ramp up as confidence grows
- [ ] **Parallel run outlived validation**: flag parallel runs that have been active in production for more than the planned validation period (typically 2-4 weeks) without a decision to promote or remove the candidate

## Common False Positives

- **A/B testing frameworks**: permanent A/B test infrastructure that routes traffic to different experiences by design is not a parallel run. Flag only when both paths serve the same logical function and one is intended to replace the other.
- **Retry with fallback**: calling a new service and falling back to the old one on failure is a resilience pattern, not a parallel run. The paths execute sequentially, not in parallel.
- **Read replicas**: reading from both a primary and a replica to verify consistency is an operational check, not a migration parallel run.
- **Idempotent operations**: for truly idempotent reads, duplicate execution causes no side effects and may be acceptable without strict isolation.

## Severity Guidance

| Finding | Severity |
|---|---|
| Both paths write to the same database or queue (duplicate side effects) | Critical |
| Candidate failure propagates and breaks control path response | Critical |
| Parallel execution with no result comparison at all | Critical |
| No alerting on divergence exceeding threshold | Important |
| No timeout on candidate path | Important |
| Parallel run active beyond planned validation period | Important |
| No kill switch or feature flag to disable candidate | Important |
| Comparison ignores response body, only checks status | Important |
| Parallel run at 100% traffic without ramp-up | Minor |
| Non-deterministic fields causing noisy comparison failures | Minor |
| Comparison results not persisted for analysis | Minor |
| Candidate latency not measured independently | Minor |

## See Also

- `modern-strangler-fig` -- parallel runs are often used within a strangler fig migration to validate the new system
- `principle-feature-flags-and-config` -- feature flags control parallel run sampling and kill switches
- `principle-separation-of-concerns` -- the candidate path must be isolated from the control path
- `antipattern-lava-flow` -- parallel run code left after validation becomes lava flow

## Authoritative References

- [GitHub Engineering, "Scientist: Measure Twice, Cut Over Once"](https://github.blog/engineering/engineering-principles/scientist/)
- [Martin Fowler, "ParallelChange" (2014)](https://martinfowler.com/bliki/ParallelChange.html)
- [Sam Newman, "Building Microservices" (2nd ed., 2021), Chapter 3: Parallel Run](https://www.oreilly.com/library/view/building-microservices-2nd/9781492034018/)
- [Danilo Sato, "Dark Launching and Shadow Traffic"](https://www.thoughtworks.com/insights/articles/dark-launching-shadow-traffic)
