---
id: modern-strangler-fig
type: primary
depth_role: leaf
focus: Detect strangler fig migration failures where new functionality bypasses the new system, old system is not gradually replaced, feature parity is unchecked, dual-running lacks comparison, rollback is absent, or traffic shifting has no metrics
parents:
  - index.md
covers:
  - New feature implemented in the legacy system instead of the new system
  - Old system not shrinking over time -- no routes or modules migrated to the new system
  - Missing feature parity checklist between old and new system for migrated functionality
  - Both old and new systems called in parallel without result comparison or divergence detection
  - No rollback path to route traffic back to the old system if the new system fails
  - Traffic shifting performed without metrics to validate success at each percentage increment
  - Proxy or facade layer missing between callers and the migrating subsystem
  - Migration leaves orphaned code in the old system after functionality moves to the new system
  - Strangler boundary not enforced -- new system directly calls old system internals
  - Migration has stalled with no progress for 30+ days
tags:
  - strangler-fig
  - migration
  - incremental
  - legacy
  - routing
  - facade
  - traffic-shifting
  - feature-parity
  - rollback
activation:
  file_globs:
    - "**/proxy*"
    - "**/facade*"
    - "**/gateway*"
    - "**/router*"
    - "**/migration*"
    - "**/legacy*"
    - "**/adapter*"
  keyword_matches:
    - strangler
    - legacy
    - migrate
    - migration
    - traffic
    - routing
    - proxy
    - facade
    - old_system
    - new_system
    - feature_parity
    - cutover
    - rollback
    - canary
    - percentage
    - weight
  structural_signals:
    - parallel_execution_paths
    - routing_layer
    - facade_pattern
    - traffic_split
source:
  origin: file
  path: modern-strangler-fig.md
  hash: "sha256:263199a608a22c7a3919b5755c26993c1564963924a1273da16387c891378dea"
---
# Strangler Fig Migration

## When This Activates

Activates when diffs introduce, modify, or touch code involved in incremental system replacement -- proxy or facade layers, traffic routing between old and new implementations, parallel execution paths, migration scripts, or modules with legacy/new naming conventions. The strangler fig pattern replaces a legacy system incrementally by routing new functionality through a new system while gradually migrating existing functionality, until the old system can be decommissioned. This reviewer flags common failures: new features that bypass the new system entirely, old system code that is never retired, parallel runs without comparison, missing rollback paths, and traffic shifts without observability.

## Audit Surface

- [ ] New feature added to legacy module instead of the replacement system
- [ ] No proxy, facade, or routing layer between callers and the system being strangled
- [ ] Route or endpoint migrated to new system without redirecting existing callers
- [ ] Parallel execution of old and new paths without output comparison
- [ ] Traffic percentage hardcoded instead of controlled by config or feature flag
- [ ] No rollback mechanism to redirect traffic back to old system
- [ ] Missing metrics or logging on traffic split ratios
- [ ] Feature parity not verified before decommissioning old code path
- [ ] New system directly imports or calls old system internals bypassing the seam
- [ ] Old system code not removed after migration of a module is complete
- [ ] Strangler boundary leaks domain types from the legacy system
- [ ] No integration tests covering the facade routing layer

## Detailed Checks

### Facade and Routing Layer Integrity
<!-- activation: keywords=["proxy", "facade", "gateway", "router", "route", "dispatch", "forward", "delegate", "intercept"] -->

- [ ] **Missing facade layer**: flag callers that directly invoke both old and new system implementations without an intermediary routing layer -- the strangler pattern requires a facade or proxy that encapsulates the routing decision so callers are unaware of the migration
- [ ] **Facade leaks implementation details**: flag routing layers that expose whether the request went to the old or new system in their return types, exceptions, or headers -- the facade must present a unified interface regardless of which backend serves the request
- [ ] **Hardcoded routing decisions**: flag routing layers where the old-vs-new decision is a hardcoded `if/else` rather than a configurable flag, percentage, or rule -- hardcoded routing cannot be adjusted without a deployment
- [ ] **Facade bypassed**: flag code paths where callers skip the facade and call the old or new system directly -- every bypass undermines the migration boundary and creates orphaned coupling
- [ ] **No integration tests for the routing layer**: flag facade or proxy modules without tests verifying that they correctly route to old and new systems under different configurations

### New Features Routed to the Correct System
<!-- activation: keywords=["new", "feature", "add", "implement", "create", "endpoint", "handler", "service", "controller"] -->

- [ ] **New feature in legacy system**: flag new endpoints, handlers, or service methods added to modules marked as legacy or scheduled for migration -- new functionality must be built in the new system to avoid expanding the legacy surface area
- [ ] **Legacy module growing**: flag diffs that add lines to modules identified as part of the old system while a strangler migration is in progress -- the old system should be shrinking, not growing
- [ ] **Missing redirect for migrated route**: flag endpoints migrated to the new system where the old system still serves the route without a redirect or proxy pass -- callers using the old URL will get stale behavior

### Feature Parity Verification
<!-- activation: keywords=["parity", "equivalent", "same", "match", "verify", "compare", "acceptance", "migration test", "compatibility"] -->

- [ ] **No parity checklist**: flag migration of a module from old to new system without a documented or tested feature parity checklist -- subtle behavioral differences cause silent regressions after cutover
- [ ] **Partial migration without parity tests**: flag PRs that migrate a subset of functionality without integration tests verifying the migrated subset produces identical results to the old system
- [ ] **Edge cases not covered**: flag parity tests that only check happy paths -- error handling, boundary conditions, and concurrency behavior must also match between old and new systems

### Parallel Run and Divergence Detection
<!-- activation: keywords=["parallel", "shadow", "mirror", "compare", "diverge", "diff", "dual", "both", "side-by-side"] -->

- [ ] **Parallel run without comparison**: flag code that executes both old and new paths but discards one result without comparing -- parallel runs are pointless without divergence detection
- [ ] **Comparison logic incomplete**: flag parallel-run comparison that checks only the top-level response status but ignores body fields, side effects, or timing differences -- incomplete comparison misses subtle divergence
- [ ] **No alerting on divergence**: flag parallel-run setups with comparison logic but no alert, metric, or log when results diverge -- divergence must be visible to operators
- [ ] **Parallel run left enabled after validation**: flag parallel execution paths that remain active after the migration is declared complete -- the extra execution wastes resources and complicates debugging

### Rollback Path and Traffic Shifting Metrics
<!-- activation: keywords=["rollback", "revert", "fallback", "traffic", "percentage", "weight", "canary", "shift", "ramp", "metric", "monitor"] -->

- [ ] **No rollback mechanism**: flag traffic shifts to the new system without a documented or coded mechanism to redirect 100% of traffic back to the old system -- production incidents during migration require instant rollback
- [ ] **Traffic shifting without metrics**: flag percentage-based traffic shifts that do not emit metrics for error rate, latency, and correctness at each increment -- blind ramp-up risks undetected degradation
- [ ] **Big-bang cutover**: flag migrations that jump from 0% to 100% traffic on the new system without intermediate increments -- gradual ramp (1%, 5%, 25%, 50%, 100%) limits blast radius
- [ ] **Rollback path untested**: flag rollback mechanisms that have never been exercised in a test or staging environment -- untested rollback is not a rollback
- [ ] **Old system decommissioned prematurely**: flag removal of old system code or infrastructure while the new system is still receiving less than 100% of traffic -- the old system must remain operational until cutover is complete and stable

## Common False Positives

- **Greenfield services**: new services that do not replace an existing system are not strangler fig migrations. Flag only when a legacy counterpart exists.
- **Intentional dual implementations**: some architectures maintain multiple implementations permanently (e.g., payment processors, cloud providers). Flag only when one is clearly marked for decommission.
- **Library migrations**: replacing one library with another within the same service is not a strangler fig -- it is a dependency swap. This reviewer targets system-level or module-level replacements.
- **Parallel testing in CI**: running both old and new implementations in test suites to verify equivalence is a healthy migration practice, not a problem.

## Severity Guidance

| Finding | Severity |
|---|---|
| New feature built in legacy system during active strangler migration | Critical |
| No rollback mechanism for traffic shift to new system | Critical |
| Traffic shifted to 100% without graduated ramp-up | Critical |
| Parallel run without divergence comparison | Important |
| Missing facade or routing layer between callers and migrating system | Important |
| Traffic shifting without metrics on error rate or latency | Important |
| Old system code not removed after module fully migrated | Important |
| Feature parity not verified before cutover | Important |
| New system directly calls old system internals | Important |
| Parallel run still active after migration declared complete | Minor |
| Facade routing hardcoded instead of config-driven | Minor |
| Missing integration tests for routing layer | Minor |

## See Also

- `principle-separation-of-concerns` -- the strangler facade enforces a clean separation between old and new systems
- `antipattern-big-ball-of-mud` -- failed strangler migrations that blend old and new systems create a big ball of mud
- `antipattern-lava-flow` -- old system code left behind after migration hardens into lava flow
- `principle-solid` -- the facade should follow the Interface Segregation and Dependency Inversion principles

## Authoritative References

- [Martin Fowler, "StranglerFigApplication" (2004)](https://martinfowler.com/bliki/StranglerFigApplication.html)
- [Sam Newman, "Building Microservices" (2nd ed., 2021), Chapter 3: Splitting the Monolith -- Strangler Fig Pattern](https://www.oreilly.com/library/view/building-microservices-2nd/9781492034018/)
- [Michael Feathers, "Working Effectively with Legacy Code" (2004)](https://www.oreilly.com/library/view/working-effectively-with/0131177052/)
- [Strangler Fig Pattern -- Azure Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/patterns/strangler-fig)
