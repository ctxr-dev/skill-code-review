---
id: feature-flag-platforms-launchdarkly-unleash-growthbook-openfeature
type: primary
depth_role: leaf
focus: "Detect misuse of feature-flag platforms (LaunchDarkly, Unleash, GrowthBook, OpenFeature) -- evaluation context, default variations, expiry, hot-path evaluation, PII leakage, and cleanup"
parents:
  - index.md
covers:
  - "Flag evaluated without user context (all anonymous users get same variant)"
  - No default variation on SDK init failure or evaluation error
  - "Flags without owner or expiry metadata (permanent 'temporary' flags)"
  - "Kill-switch flags without documented trip criteria / runbook"
  - "Synchronous SDK evaluation on request hot path (latency + dependency)"
  - No bootstrap values causing UI flicker on page load
  - Test or internal-only flags shipped to production
  - OpenFeature provider call not wrapped in error handler
  - "Flag targeting leaks PII (raw email, phone, IP) to the platform"
  - "Missing cleanup after rollout (dead flag paths)"
  - Evaluation events not tagged for experiment analysis
  - Flag overrides in prod via admin UI without audit trail review
  - Hardcoded magic values that should be externalized to configuration
  - Stale feature flags that have been fully rolled out but never removed
  - "Feature flag sprawl: too many flags with unclear ownership and lifecycle"
  - "Configuration-as-code hygiene: typed config, validation, defaults"
  - Environment-specific values leaking into application code
  - "Secret/credential values in config files checked into version control"
  - Flag evaluation in hot paths without caching or short-circuit
  - "Boolean flag explosion vs. strategy/enum-based configuration"
  - Inconsistent flag naming conventions across the codebase
  - "Missing flag documentation: owner, purpose, expected lifetime, rollback plan"
  - "Default flag values that fail unsafe (feature on by default in production)"
  - Environment variable access scattered throughout the codebase
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
aliases:
  - principle-feature-flags-and-config
activation:
  file_globs:
    - "**/*.{ts,js,py,rb,go,java,kt,cs,swift,scala}"
    - "**/flags/**"
    - "**/feature-flags/**"
    - "**/experiments/**"
  keyword_matches:
    - LaunchDarkly
    - Unleash
    - GrowthBook
    - OpenFeature
    - feature flag
    - featureflag
    - variation
    - variationDetail
    - targeting
    - segment
    - rollout
    - kill switch
    - kill-switch
    - flag_key
    - getBooleanValue
    - getFlag
    - isEnabled
    - evaluate
    - onFlagChange
    - ldClient
    - evaluation
  structural_signals:
    - flag_eval_without_context
    - missing_default_variation
    - flag_in_hot_loop
    - pii_in_targeting
source:
  origin: file
  path: feature-flag-platforms-launchdarkly-unleash-growthbook-openfeature.md
  hash: "sha256:21ad7cc9e93271472850bae0b430cdced2dc0828e47b5b7d30425dd3f3a8c800"
---
# Feature Flag Platforms (LaunchDarkly, Unleash, GrowthBook, OpenFeature)

## When This Activates

Activates when diffs import or call LaunchDarkly, Unleash, GrowthBook, Optimizely, Flagsmith, Statsig, or OpenFeature SDKs, add targeting rules, create kill-switch logic, or change feature-flag evaluation code. Flags are the fastest way to ship risk; they are also the fastest way to ship traffic-shifting bugs, PII leaks, and forever-temporary tech debt. These checks focus on evaluation correctness, resilience, privacy, and lifecycle.

## Audit Surface

- [ ] Flag evaluated without user / evaluation context
- [ ] No default variation on SDK init failure or evaluation error
- [ ] Flag lacks owner / expiry / lifecycle metadata
- [ ] Kill-switch without documented trip criteria / runbook
- [ ] SDK evaluated synchronously with I/O on request hot path
- [ ] Server-rendered page flag evaluated client-side without bootstrap
- [ ] Test/internal flags shipped to production bundle
- [ ] OpenFeature / provider call not wrapped in error handler
- [ ] Targeting rules carry raw PII (email, phone, IP) to the platform
- [ ] Flag cleanup missing after rollout completes
- [ ] Flag evaluated repeatedly in a hot loop without caching
- [ ] Mobile / SPA ships SDK key without origin restrictions
- [ ] Code-side default drifts from platform default
- [ ] Long-lived flag acting as config (belongs in config system)
- [ ] No alert on prod flag change / percentage rollout
- [ ] Experiment flag missing exposure / impression event
- [ ] Flag value cached without TTL / stale after rollout toggle
- [ ] Evaluation returns undefined or exception rather than safe fallback
- [ ] Anonymous user key regenerates per request (breaks sticky bucketing)
- [ ] Streaming updates not enabled where real-time flip is required

## Detailed Checks

### Evaluation Context and Bucketing
<!-- activation: keywords=["context", "user", "targeting_key", "anonymous", "segment", "identify"] -->

- [ ] **Flag evaluated without context**: `client.variation("flag", fallback)` with no user/context -- every caller lands in the same bucket and percentage rollouts degenerate to 0% or 100% for everyone. Pass a stable `targetingKey`/`user.key`.
- [ ] **Anonymous key regenerated per request**: a fresh UUID per call causes the same user to see different variants on different requests -- persist an anonymous id (cookie/localStorage) and reuse.
- [ ] **Inconsistent key across client and server**: client SDK uses email hash, server uses numeric id -- users experience split-brain. Use a single canonical key.
- [ ] **Multi-context required but flat context passed**: plans/orgs/devices need separate contexts (LD v7 multi-context, OpenFeature evaluation context) -- flat user context cannot express org-level targeting.

### Default Variations and Failure Modes
<!-- activation: keywords=["default", "fallback", "variationDetail", "getFlag", "offline", "init"] -->

- [ ] **Missing default/fallback argument**: evaluation without a default returns undefined/null on error -- downstream code crashes. Always pass an explicit default that represents the safe state.
- [ ] **Default in code differs from platform default**: the SDK's in-code default is `true` but the platform default is `false` -- init failure yields behavior contradicting configured intent.
- [ ] **Unsafe default**: the default enables a risky feature -- an SDK outage flips the feature on for all traffic. Default should be the fail-closed choice for risky flags.
- [ ] **No init-timeout guard**: SDK init blocks for seconds then falls back to default silently -- instrument init latency and alert on repeated init failures.
- [ ] **Bootstrap missing on SSR/SPA**: client re-evaluates post-hydration -- UI flickers between default and targeted variant. Serialize bootstrap values with SSR.

### Hot-Path Evaluation and Caching
<!-- activation: keywords=["loop", "for", "map", "hot path", "synchronous", "await", "evaluate"] -->

- [ ] **Synchronous remote eval on hot path**: some SDKs (or misconfigured ones) hit the network per evaluation -- use local-evaluation / streaming updates so evaluation is a local dictionary lookup.
- [ ] **Flag in tight loop**: `for (const row of rows) if (client.isEnabled("x", user)) ...` -- evaluate once per user per request and reuse.
- [ ] **Per-request re-identify**: calling `identify()` every request resyncs full context -- cache by user.
- [ ] **Over-aggressive caching**: app caches a flag value for hours locally -- users do not see kill-switch flips. Align TTL with flag semantics and use streaming where available.

### Metadata, Ownership, and Lifecycle
<!-- activation: keywords=["expiry", "owner", "lifecycle", "cleanup", "temporary", "permanent"] -->

- [ ] **Flag created without owner**: no team / on-call tag on the flag -- production surprises have no clear escalation.
- [ ] **Flag created without expiry / lifecycle**: "temporary" flags live forever. Every temp flag gets a review date.
- [ ] **Flag rollout complete, code branches remain**: `if (enabled) newCode() else legacyCode()` with the flag at 100% for months -- remove the legacy branch and retire the flag.
- [ ] **Long-lived operational flag**: a permanent toggle treated as a flag belongs in the config system (see principle-feature-flags-and-config) where it gets change review, not in an experimentation platform.

### Kill-Switch and High-Risk Flags
<!-- activation: keywords=["kill switch", "kill-switch", "circuit", "panic", "failsafe", "disable"] -->

- [ ] **Kill-switch without criteria**: flag labeled "kill_feature_x" but no documented threshold (error rate, p99 latency) for flipping it -- operator hesitates in the moment.
- [ ] **Kill-switch not alert-wired**: flipping the kill switch does not fire an alert or log an audit event -- on-call is unaware it engaged.
- [ ] **Kill-switch requires re-deploy to take effect**: SDK caching or local config snapshot means flipping does not stop traffic -- verify real-time propagation path.
- [ ] **Too many kill switches**: every feature has one, exercised never -- undocumented and eventually divergent from code. Consolidate.

### Privacy and PII in Targeting
<!-- activation: keywords=["email", "phone", "PII", "attribute", "custom", "ip", "location"] -->

- [ ] **Raw PII in targeting attributes**: sending `email: "user@example.com"`, `phone`, or `ip` to the flag platform -- those values now live in an external vendor's audit logs and analytics.
- [ ] **Email used as targeting key**: email is mutable and identifiable -- hash it or use internal id.
- [ ] **Sensitive attributes unmarked**: LaunchDarkly `privateAttributes`, Unleash custom-context privacy not configured -- attributes flow upstream unredacted.
- [ ] **GDPR erasure path missing**: user requests deletion but their key persists in the flag platform's event stream indefinitely -- integrate with the erasure workflow.

### SDK Keys, Environments, and Drift
<!-- activation: keywords=["sdk_key", "client_id", "environment", "secret", "offline", "proxy"] -->

- [ ] **Server SDK key in client bundle**: LD/Unleash/GrowthBook server-side key embedded in a browser/mobile app -- exposes all flag definitions. Use client-side / mobile-specific keys.
- [ ] **Mobile SDK key without origin/bundle restriction**: stolen key grants read of all flag definitions and live-updates. Restrict per environment.
- [ ] **Env confusion**: prod SDK key used in staging or vice versa -- experiments corrupt each other.
- [ ] **No streaming for prod kill-switches**: polling interval of 60s means kill-switch takes up to a minute to propagate -- prefer streaming.

### OpenFeature Provider and Error Handling
<!-- activation: keywords=["OpenFeature", "provider", "setProvider", "hook", "evaluationContext"] -->

- [ ] **Provider set without error hook**: no `client.addHooks({error: ...})` -- evaluation errors are invisible.
- [ ] **Evaluation outside a try/catch boundary**: provider raising throws up through business logic instead of yielding the declared default.
- [ ] **Multiple providers without clear ordering**: hooks and provider stack not deterministic -- evaluations yield surprising values.
- [ ] **Provider init blocking request**: setProvider awaited inline in request handler -- move to app startup.

## Common False Positives

- **Tests**: unit tests that stub the SDK to always return a fixed variant do not need context, defaults, or cleanup scrutiny.
- **Config-like long-lived flags with owners**: some orgs use the flag platform as a config system intentionally; the "no expiry" finding should be downgraded if the flag has owners and documented semantics.
- **Server-only platforms without browser key concerns**: flagging "client-side key in bundle" does not apply to exclusively-server setups.
- **Experimentation platforms with platform-managed PII controls**: platforms that hash attributes server-side do not need separate hashing, but verify configuration rather than assume.

## Severity Guidance

| Finding | Severity |
|---|---|
| Server SDK key embedded in client / mobile bundle | Critical |
| Raw PII (email, phone, IP) sent as targeting attributes | Critical |
| Kill-switch flag has no documented trip criteria or alert wiring | Critical |
| Missing default variation (evaluation failure crashes request) | Critical |
| Flag evaluated without user context (bucketing broken) | Important |
| Anonymous targeting key regenerated per request | Important |
| Test/internal flag reaches production bundle | Important |
| Synchronous remote evaluation on hot request path | Important |
| Flag rollout complete but code branches remain (>30 days) | Important |
| Flag without owner or expiry metadata | Important |
| SSR/SPA flag evaluated without bootstrap (UI flicker) | Important |
| OpenFeature evaluation not wrapped in error handler | Important |
| Kill-switch propagation requires redeploy | Important |
| Code-side default drifts from platform default | Important |
| Flag evaluated in tight loop without caching | Minor |
| No audit alert on production flag change | Minor |
| Experiment flag missing exposure event | Minor |

## See Also

- `principle-feature-flags-and-config` -- long-lived operational toggles should graduate to the config system with review
- `sec-secrets-management-and-rotation` -- SDK keys are secrets subject to rotation
- `compliance-gdpr-data-subject-rights` -- targeting attributes flowing to vendors must honor erasure
- `reliability-graceful-degradation` -- safe defaults on SDK failure are a degradation surface
- `sec-owasp-a05-misconfiguration` -- misconfigured flag platforms are a recurring misconfiguration class

## Authoritative References

- [LaunchDarkly, "Best practices for feature flags"](https://docs.launchdarkly.com/guides/flags/best-practices)
- [Unleash, "Feature flag best practices"](https://docs.getunleash.io/topics/feature-flags/feature-flag-best-practices)
- [GrowthBook, "Feature flag best practices"](https://docs.growthbook.io/features/basics)
- [OpenFeature, "Specification"](https://openfeature.dev/specification/)
- [Pete Hodgson, "Feature Toggles (aka Feature Flags)" (martinfowler.com)](https://martinfowler.com/articles/feature-toggles.html)
