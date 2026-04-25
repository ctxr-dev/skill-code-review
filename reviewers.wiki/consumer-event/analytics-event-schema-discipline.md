---
id: analytics-event-schema-discipline
type: primary
depth_role: leaf
focus: Detect analytics event-schema gaps including inconsistent naming conventions, no event registry, PII in event properties, high-cardinality dimensions, unversioned payload changes, duplicated events, missing identify-on-auth anonymous stitching, and third-party sends without contract review
parents:
  - index.md
covers:
  - Event names mixing camelCase, snake_case, Title Case, or spaces inconsistently
  - "No central event schema registry / taxonomy document"
  - "PII (email, full name, precise geolocation, phone) sent as event properties"
  - "High-cardinality values (user id, request id, URL) used as event dimensions"
  - Event payload shape changed without a version or new event name
  - Duplicate events emitted for the same user action from multiple call sites
  - "Missing identify() on auth, so anonymous and authenticated events cannot be stitched"
  - "track() called in a context with no user or anonymous identifier"
  - Sensitive business events sent to third-party destinations without contract review
  - No event documentation, ownership, or deprecation policy
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
activation:
  file_globs:
    - "**/*analytics*"
    - "**/*tracking*"
    - "**/*telemetry*"
    - "**/*events*"
    - "**/*event_*"
    - "**/*tracking_plan*"
    - "**/*schema*"
    - "**/mixpanel*"
    - "**/amplitude*"
    - "**/segment*"
    - "**/rudderstack*"
    - "**/posthog*"
    - "**/plausible*"
  keyword_matches:
    - analytics
    - event
    - track
    - identify
    - page
    - screen
    - mixpanel
    - amplitude
    - segment
    - rudderstack
    - posthog
    - plausible
    - event_schema
    - property
    - payload
    - trait
    - anonymousId
    - distinct_id
    - tracking_plan
  structural_signals:
    - "Call to .track / .identify / .page / .screen / .logEvent / .capture"
    - "Event schema / tracking-plan file change"
    - Analytics SDK initialization or destination configuration
    - Event payload type definition
source:
  origin: file
  path: analytics-event-schema-discipline.md
  hash: "sha256:45c421d004c1a1e6c434b859e39610fcd65548ed92e45a9c9e1bc63908395c7e"
---
# Analytics Event Schema Discipline

## When This Activates

Activates when diffs touch analytics call sites (`track`, `identify`, `page`, `screen`, `logEvent`, `capture`), event schema or tracking-plan files, or analytics SDK configuration for Mixpanel / Amplitude / Segment / RudderStack / PostHog / Plausible / Heap. Analytics data is a long-lived dataset: once a million rows of `button_clicked` vs `ButtonClicked` are in the warehouse, the cost of cleaning them up is extreme. Schema discipline also intersects with privacy -- an `email` property silently flowing into five third-party destinations is a GDPR disclosure, a HIPAA breach, or a CPRA "sale of data" violation depending on the context. Reviewers should treat analytics events as a production schema with versioning, ownership, and contract boundaries rather than as "free-form debug data".

**Key Requirements**: consistent naming convention, centralized tracking-plan, PII kept out of properties, bounded cardinality, versioned payload evolution, identify() called on authentication, consent + contract review for each third-party destination.

## Audit Surface

- [ ] analytics.track / amplitude.logEvent / mixpanel.track / posthog.capture call site
- [ ] Event name containing whitespace, hyphen-mix, or inconsistent casing
- [ ] Event property named email, phone, ssn, address, dob, full_name, ip_address, lat/lng
- [ ] Event property set to a unique id (order_id, request_id, session_id as a dimension)
- [ ] Event payload shape change in a diff without bumping event name or version
- [ ] Same event fired from multiple call sites with drifting property schemas
- [ ] Authenticated session emitting events with only anonymousId (no identify call)
- [ ] identify() called without traits, or called with unverified user_id
- [ ] New event sent to Segment / RudderStack destination without a DPA review note
- [ ] Event sent to a third-party tool in a non-consented category
- [ ] No schema validation (Ajv / Zod / protobuf) on the event payload
- [ ] No registry file (tracking-plan.json, schema.yaml) updated with the new event
- [ ] Property types inconsistent across events (price as string here, number there)
- [ ] Event names referencing implementation detail (ButtonClickv2Retry) instead of user intent
- [ ] No event deprecation record for removed or renamed events

## Detailed Checks

### Naming Convention and Tracking-Plan Registry
<!-- activation: keywords=["event_name", "track", "logEvent", "capture", "tracking_plan", "schema", "registry"] -->

- [ ] **Inconsistent naming convention**: flag event names that mix casing (`button_clicked` next to `ButtonClicked` next to `button clicked`). Pick one convention per project (typically `Object Action` with Title Case for Segment/Amplitude, or `object_action` snake_case for PostHog) and enforce it via lint
- [ ] **No tracking-plan registry**: flag new events added without a corresponding entry in the tracking-plan file (tracking-plan.json, schema.yaml, or a tool-managed plan in Segment Protocols / Avo / Amplitude Data). Unregistered events drift
- [ ] **Implementation-detail names**: flag event names that leak implementation details (`ButtonClickv2Retry`, `api_failed_retry_3`) rather than naming user intent (`Checkout Started`, `Payment Failed`). Names should survive refactors
- [ ] **Event name referencing UI element only**: flag names like `clicked_blue_button` with no semantic meaning. Colors, positions, and pixel labels change; intent is stable

### PII and Sensitive Data in Properties
<!-- activation: keywords=["email", "phone", "ssn", "address", "dob", "full_name", "ip_address", "lat", "lng", "location"] -->

- [ ] **PII in event properties**: flag properties named `email`, `phone`, `ssn`, `full_name`, `address`, `dob`, `national_id`, `credit_card`, `passport`, or similar direct identifiers. These should never be on event payloads sent to third-party analytics. Cross-reference with `compliance-pii-handling-and-minimization`
- [ ] **Precise geolocation as property**: flag `lat` / `lng` / `precise_location` properties with more than ~2-decimal precision (town-level, not building-level). Precise location is special-category in GDPR/CPRA
- [ ] **Auth tokens or secrets in properties**: flag properties containing `token`, `api_key`, `session_token`, `jwt`, `password` -- these leak into every downstream destination
- [ ] **Free-form text fields forwarded wholesale**: flag properties that forward user-entered text (search queries, form inputs, chat messages) into analytics without a PII scrub. These are common exfiltration vectors
- [ ] **Health, financial, or minors' data**: flag events in healthcare / fintech / kids apps that send disease codes, diagnoses, balances, or age-indicative properties to third-party analytics. Cross-reference with `compliance-hipaa-phi` and `compliance-pci-dss`

### Cardinality and Payload Stability
<!-- activation: keywords=["cardinality", "dimension", "property", "unique", "id", "url"] -->

- [ ] **High-cardinality property used as dimension**: flag properties set to unique ids (order_id, request_id, trace_id, full URL including query string) used as dimensions. These explode cost and kill query performance in Mixpanel / Amplitude / PostHog
- [ ] **URL sent without sanitization**: flag properties sending `window.location.href` or full request URLs without stripping query strings, fragments, and PII-bearing path segments (`/users/<email>/...`)
- [ ] **Property-type drift**: flag the same property (e.g., `price`) sent as `number` from one call site and `string` from another. Downstream SQL breaks on type coercion
- [ ] **Payload shape change without version**: flag renamed or removed properties on an existing event without either a new event name (`Checkout Started v2`) or a `schema_version` property. Silent shape changes corrupt historical dashboards

### Duplicate Events and Multiple Call Sites
<!-- activation: keywords=["duplicate", "fired", "emit", "call_site", "wrapper"] -->

- [ ] **Duplicate events for the same action**: flag the same user action firing multiple differently-named events (`Checkout Completed` from the success screen and `Order Placed` from the API middleware) without a clear primary. Product analytics should have exactly one canonical event per action
- [ ] **Same event, drifting properties**: flag call sites for the same event name with different property sets. Centralize into a typed helper function (`trackCheckoutCompleted(args: CheckoutCompletedEvent)`)
- [ ] **No typed wrapper / schema validation**: flag raw `track("event_name", {...})` calls when the project has a typed wrapper or tracking-plan codegen available

### Identify, Anonymous Stitching, and User Context
<!-- activation: keywords=["identify", "anonymousId", "distinct_id", "user_id", "alias", "reset"] -->

- [ ] **No identify() on auth**: flag authentication / login flows that do not call `analytics.identify(user_id, traits)` on success. Without identify, pre-auth anonymous events cannot be stitched to the authenticated user
- [ ] **identify() without traits**: flag identify calls with only a user id and no traits (email, plan, cohort). This is still useful but misses the standard pattern of upserting user traits on each session
- [ ] **No alias / merge on signup**: flag signup flows that call identify without aliasing or merging the pre-signup anonymous profile. Mixpanel requires `alias()`; Amplitude and PostHog have similar merge primitives
- [ ] **No reset() on logout**: flag logout handlers that do not call `analytics.reset()` (or equivalent). Without reset, the next user on the same device inherits the prior user's distinct_id
- [ ] **track() with no user/anonymous context**: flag server-side `track()` calls with neither `user_id` nor `anonymous_id` attached -- these become orphan events

### Third-Party Destinations, Consent, and Contracts
<!-- activation: keywords=["destination", "integration", "segment", "rudderstack", "mparticle", "warehouse", "dpa"] -->

- [ ] **New destination without DPA / contract review**: flag new downstream destinations enabled in Segment / RudderStack / mParticle (Facebook CAPI, Google Ads API, a new SaaS vendor) without a recorded DPA review. Every destination is a new data processor
- [ ] **Sensitive event fanned out without allowlist**: flag events tagged sensitive (healthcare, financial, minors) being forwarded to all destinations by default rather than an explicit allowlist
- [ ] **Events sent pre-consent**: flag client-side analytics SDKs initialized and sending events before consent state is known. Cross-reference with `cookie-consent-tracking-pixel-compliance`
- [ ] **Server-side events bypassing consent**: flag server-side event pipelines that do not check the user's consent state before forwarding to third-party analytics -- consent applies to the data, not the transport

### Event Documentation, Ownership, and Lifecycle
<!-- activation: keywords=["documentation", "owner", "deprecate", "sunset", "governance"] -->

- [ ] **No owner / description for new event**: flag new events added without a description and an owning team / channel in the tracking-plan
- [ ] **No deprecation record for removed events**: flag events deleted or renamed without a deprecation note explaining when historical data becomes invalid and what the replacement is
- [ ] **No schema validation in CI**: flag projects that have a tracking-plan but do not fail CI when a call site emits an event or property not in the plan

## Common False Positives

- **Internal observability metrics**: application metrics (Prometheus counters, log lines) are not product analytics and are not subject to PII / consent rules in the same way.
- **First-party, server-side, no-cookie analytics**: Plausible, Fathom, and similar first-party analytics that do not set a device identifier and do not forward to third parties have lighter requirements.
- **Debug / development events**: events emitted in non-production environments or gated by a `__DEBUG__` flag may legitimately carry richer data.
- **Aggregate metrics (counts, averages)**: dashboards of aggregates computed from events are not events themselves and do not need schema versioning.
- **Legacy events under a documented migration**: existing inconsistent events may be tolerated if a dated deprecation plan exists in the tracking-plan.

## Severity Guidance

| Finding | Severity |
|---|---|
| PII (email, phone, SSN, precise location) in event properties | Critical |
| Auth tokens or secrets in event properties | Critical |
| Sensitive event sent to third-party without contract / DPA review | Critical |
| Events sent pre-consent on EU / UK / CA traffic | Critical |
| No identify() on authentication (anonymous events not stitched) | Important |
| High-cardinality property used as dimension | Important |
| Event payload shape changed without version or new name | Important |
| No central tracking-plan / schema registry entry for new event | Important |
| Inconsistent naming convention across events | Minor |
| Duplicate events for the same user action | Minor |
| No owner / description / deprecation record on events | Minor |

## See Also

- `compliance-pii-handling-and-minimization` -- PII in analytics properties is the most common leak vector
- `compliance-gdpr-data-subject-rights` -- DSR erasure must reach analytics destinations (Mixpanel / Amplitude deletion APIs)
- `compliance-ccpa-cpra` -- "sale" and "share" definitions apply to sending events to advertising destinations
- `cookie-consent-tracking-pixel-compliance` -- client-side analytics must respect consent before initializing
- `compliance-consent-tracking-and-retention` -- consent state must be checked by the analytics layer and retained with the events
- `experimentation-ab-testing-discipline` -- experiment readouts depend on clean, versioned event schemas
- `ai-llm-cost-token-spend-monitoring` -- LLM usage events are a common new event family that benefits from the same discipline

## Authoritative References

- [Segment - Analytics Spec](https://segment.com/docs/connections/spec/)
- [Amplitude - Data Taxonomy Playbook](https://amplitude.com/blog/data-taxonomy-playbook)
- [Mixpanel - Tracking Plan](https://docs.mixpanel.com/docs/tracking-best-practices/how-to-write-a-tracking-plan)
- [PostHog - Event Naming Conventions](https://posthog.com/docs/data/events)
- [RudderStack - Event Spec](https://www.rudderstack.com/docs/event-spec/standard-events/)
- [Avo - Analytics Governance](https://www.avo.app/docs)
- [ICO - Personal Data in Analytics](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/cookies-and-similar-technologies/)
