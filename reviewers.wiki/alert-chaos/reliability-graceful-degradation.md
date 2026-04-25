---
id: reliability-graceful-degradation
type: primary
depth_role: leaf
focus: Detect all-or-nothing responses, missing fallbacks, untested degraded modes, and absent feature flags for degradation control
parents:
  - index.md
covers:
  - "All-or-nothing response -- entire page/API fails when one optional component is down"
  - No feature flag or kill switch to disable non-critical features under pressure
  - Degraded mode exists but is never tested in CI or production
  - Missing fallback content when a dependency returns an error
  - No distinction between critical and non-critical dependencies in error handling
  - User receives raw 500 error instead of a partial or cached response
  - Timeout on non-critical dependency blocks the critical response path
  - Degraded response indistinguishable from healthy response -- no indicator for clients
  - Feature flag for degradation exists but cannot be toggled without deployment
tags:
  - graceful-degradation
  - fallback
  - feature-flag
  - resilience
  - partial-response
  - degraded-mode
  - kill-switch
activation:
  file_globs:
    - "**/*.{java,kt,scala,cs,ts,js,py,rb,go,rs,ex,exs,jsx,tsx,vue}"
  keyword_matches:
    - fallback
    - degrade
    - degradation
    - graceful
    - feature flag
    - featureFlag
    - feature_flag
    - kill switch
    - killSwitch
    - partial
    - optional
    - non-critical
    - circuit
    - breaker
    - default
    - cached
  structural_signals:
    - error_propagation_from_optional_dependency
    - all_or_nothing_response
    - feature_flag_for_degradation
source:
  origin: file
  path: reliability-graceful-degradation.md
  hash: "sha256:512445be260f3e3a01ab2cb063643b7076ed989a799170e2e27ee6e250671dfd"
---
# Graceful Degradation

## When This Activates

Activates when diffs introduce dependencies on optional or enrichment services, add feature flags, modify error handling in user-facing endpoints, or configure circuit breaker fallbacks. A resilient system degrades gracefully -- when a non-critical component fails, the system continues operating with reduced functionality rather than failing entirely. Without graceful degradation, a single optional dependency outage takes down the entire user experience.

## Audit Surface

- [ ] API response fails entirely when a non-critical dependency is unavailable
- [ ] No feature flag to disable optional features under load or failure
- [ ] Degraded code path has no test coverage
- [ ] No fallback value when optional dependency fails
- [ ] All dependencies treated as equally critical
- [ ] User sees raw 500 instead of degraded response
- [ ] Non-critical timeout blocks response past SLA
- [ ] Degraded response has no indicator for clients
- [ ] Feature flag requires redeployment to toggle
- [ ] Circuit breaker fallback returns empty/null with no explanation
- [ ] No runbook for enabling degradation modes
- [ ] Static fallback content is stale

## Detailed Checks

### All-or-Nothing Response Detection
<!-- activation: keywords=["error", "throw", "raise", "fail", "500", "exception", "propagate", "response", "render", "return"] -->

- [ ] **Single failure kills entire response**: API handler calls 5 services to compose a response; if any one fails, the entire response returns 500 -- non-critical components (recommendations, ads, recently viewed) should fail independently
- [ ] **Error propagation from optional dependency**: a non-critical service call (analytics, personalization, A/B test) throws an exception that propagates up and aborts the handler -- catch and substitute a fallback
- [ ] **UI component failure crashes the page**: a frontend component for a non-critical feature throws during render and crashes the entire page -- use error boundaries (React ErrorBoundary, Vue errorCaptured) to isolate
- [ ] **No tiered error handling**: all catch blocks treat every dependency failure the same way (log + rethrow) -- classify dependencies as critical (abort) vs optional (fallback) and handle accordingly

### Fallback Strategies
<!-- activation: keywords=["fallback", "default", "cache", "stale", "cached", "static", "empty", "placeholder", "alternative"] -->

- [ ] **No fallback when optional dependency fails**: recommendation service is down and the response omits the section entirely or returns an error -- return cached recommendations, popular items, or an empty section with an explanation
- [ ] **Fallback returns null/empty silently**: circuit breaker or catch block returns null, and the caller renders a blank section with no user-facing indication -- provide a meaningful default or "currently unavailable" message
- [ ] **Stale cached fallback**: fallback serves cached data that was populated once at deployment and never refreshed -- cache should be periodically updated; stale data may be worse than no data
- [ ] **Fallback with side effects**: the degraded path triggers different side effects (e.g., still writes to the analytics service that is down, or retries in the background consuming resources) -- fallback should be lightweight

### Feature Flags and Kill Switches
<!-- activation: keywords=["feature", "flag", "toggle", "config", "switch", "kill", "disable", "enable", "rollout", "canary"] -->

- [ ] **No kill switch for non-critical features**: a non-critical feature cannot be disabled at runtime -- when it causes issues, the only option is a code change and redeploy
- [ ] **Feature flag requires deployment**: flags are stored in code or config files that need redeployment to change -- use a runtime flag service (LaunchDarkly, Unleash, ConfigCat, or database-backed flags)
- [ ] **No pre-tested degraded configuration**: the combination of flags needed for degraded mode has never been tested together -- when activated in production, interactions between disabled features cause unexpected behavior
- [ ] **Kill switch does not shed load**: disabling a feature via flag still accepts the request and does work before checking the flag -- the flag should short-circuit as early as possible

### Testing Degraded Modes
<!-- activation: keywords=["test", "chaos", "fault", "inject", "simulate", "mock", "stub", "failure", "resilience"] -->

- [ ] **No test for degraded path**: the fallback code path has zero test coverage -- when triggered in production for the first time, it may itself fail
- [ ] **No chaos testing**: the system has never been tested with actual dependency failures (network partition, latency injection, error injection) -- unit tests with mocked failures are insufficient
- [ ] **Degraded mode returns wrong HTTP status**: fallback returns HTTP 200 when it should return 206 (Partial Content) or include a degradation header -- clients cannot distinguish healthy from degraded

## Common False Positives

- **Critical dependencies that must fail the request**: authentication, authorization, and core data retrieval are critical -- the request should fail if these are unavailable. Do not flag as "missing fallback" for genuinely critical operations.
- **Microservices with dedicated SLAs**: if a service has its own SLA and monitoring, failing fast and returning an error to the caller (who has its own fallback) is valid. Graceful degradation should happen at the edge, not necessarily at every layer.
- **Backend-only batch processing**: batch jobs that process data can legitimately fail and retry later. Graceful degradation is primarily a concern for user-facing, real-time paths.
- **Feature flags for gradual rollout**: feature flags used for A/B testing or gradual rollout are not degradation flags. Do not flag these unless they lack a kill-switch capability.

## Severity Guidance

| Finding | Severity |
|---|---|
| User-facing endpoint returns 500 when optional dependency is down | Critical |
| No way to disable a non-critical feature at runtime (no kill switch) | Important |
| Degraded code path has zero test coverage | Important |
| Non-critical dependency timeout blocks response past SLA | Important |
| Fallback returns null/empty with no user indication | Minor |
| Degraded response indistinguishable from healthy (no header/flag) | Minor |
| Static fallback content never refreshed since deployment | Minor |
| No runbook for degradation procedures | Minor |

## See Also

- `reliability-circuit-breaker` -- circuit breaker provides the mechanism; graceful degradation provides the fallback logic
- `reliability-load-shedding` -- load shedding rejects entire requests; graceful degradation serves partial responses
- `reliability-health-checks` -- health checks should distinguish between critical and non-critical dependency failures
- `principle-fail-fast` -- fail fast on critical dependencies, degrade gracefully on optional ones
- `principle-feature-flags-and-config` -- feature flags enable runtime degradation control
- `antipattern-distributed-monolith` -- all-or-nothing failure is a distributed monolith symptom

## Authoritative References

- [Michael Nygard, *Release It!* (2nd ed., 2018), Chapter 5: "Fail Fast" and "Shed Load"](https://pragprog.com/titles/mnee2/release-it-second-edition/)
- [Netflix, "Keeping Netflix Reliable Using Prioritized Load Shedding" (2023)](https://netflixtechblog.com/keeping-netflix-reliable-using-prioritized-load-shedding-6cc827b02f94)
- [Microsoft, Cloud Design Patterns: Throttling and Priority Queue](https://learn.microsoft.com/en-us/azure/architecture/patterns/)
- [Google SRE Book, Chapter 22: "Addressing Cascading Failures"](https://sre.google/sre-book/addressing-cascading-failures/)
