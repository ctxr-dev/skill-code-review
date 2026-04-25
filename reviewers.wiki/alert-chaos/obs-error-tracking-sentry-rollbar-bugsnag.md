---
id: obs-error-tracking-sentry-rollbar-bugsnag
type: primary
depth_role: leaf
focus: Detect error tracking misconfiguration including missing initialization, PII in error payloads, missing source maps, broken alert rules, and poor error grouping
parents:
  - index.md
covers:
  - Error tracking SDK not initialized or initialized too late
  - Sensitive data in error payloads including PII, secrets, and tokens
  - Missing source maps causing unreadable frontend stack traces
  - Alert rules not configured for new or regressing errors
  - "Error grouping too coarse (distinct bugs merged) or too fine (same bug split)"
  - Missing breadcrumbs and context making errors unreproducible
  - Release tracking not configured preventing regression detection
  - Environment tag missing causing prod and staging errors to mix
  - Error volume quota exhausted silently dropping errors
  - Unhandled promise rejections and uncaught exceptions not captured
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
activation:
  file_globs:
    - "**/*sentry*"
    - "**/*rollbar*"
    - "**/*bugsnag*"
    - "**/*error-tracking*"
    - "**/*error_tracking*"
    - "**/*errorHandler*"
    - "**/*error_handler*"
    - "**/sentry.*.config.*"
  keyword_matches:
    - Sentry
    - Rollbar
    - Bugsnag
    - sentry_sdk
    - Sentry.init
    - Sentry.captureException
    - Rollbar.init
    - Bugsnag.start
    - dsn
    - captureException
    - captureMessage
    - beforeSend
    - scrubFields
    - fingerprint
    - release
    - source_map
    - sourcemap
  structural_signals:
    - error_tracking_init
    - error_handler_middleware
    - source_map_upload
    - error_boundary
source:
  origin: file
  path: obs-error-tracking-sentry-rollbar-bugsnag.md
  hash: "sha256:5cff2f27541b519a6479a0335df65c78d9d6825f62a9eaa22b863778a6cbb866"
---
# Error Tracking (Sentry / Rollbar / Bugsnag)

## When This Activates

Activates when the diff initializes or configures an error tracking SDK, adds error capture calls, modifies error handling middleware, or uploads source maps. Also activates on keywords like `Sentry`, `Rollbar`, `Bugsnag`, `captureException`, `beforeSend`, `fingerprint`, `release`, `sourcemap`. Error tracking complements logging and tracing by providing automatic grouping, deduplication, and alerting for exceptions. Misconfiguration causes silent data loss (SDK not initialized), privacy violations (PII in payloads), or alert fatigue (poor grouping). This reviewer ensures the error tracking pipeline captures errors completely, scrubs sensitive data, and produces actionable alerts.

## Audit Surface

- [ ] Error tracking SDK not initialized in application entry point
- [ ] SDK initialized after first possible error point (early errors lost)
- [ ] Password, token, API key, or secret in error context or breadcrumbs
- [ ] PII (email, phone, SSN, IP) in error tags or extra data without scrubbing
- [ ] Request body or headers sent to error tracker without field filtering
- [ ] Source maps not uploaded for minified frontend JavaScript
- [ ] Source maps uploaded but not version-matched to deployed release
- [ ] No alert rule for new error types or error rate spikes
- [ ] Custom fingerprint too broad (merges unrelated errors into one issue)
- [ ] Custom fingerprint too narrow (splits one bug into hundreds of issues)
- [ ] Error context missing user ID, request ID, or feature flag state
- [ ] Release version not set (cannot correlate errors to deployments)
- [ ] Environment tag missing or defaulting to production
- [ ] Error quota or rate limit hit without monitoring or alerting
- [ ] Unhandled rejection handler not registered (Node.js, browser)
- [ ] Global exception handler not registered (Python, Java, .NET)

## Detailed Checks

### SDK Initialization and Coverage
<!-- activation: keywords=["init", "Sentry.init", "Rollbar.init", "Bugsnag.start", "dsn", "access_token", "api_key", "configure", "setup", "bootstrap", "main", "entry"] -->

- [ ] **SDK not initialized**: flag application entry points (main, index, app module) that import an error tracking SDK but do not call `init()` / `start()` / `configure()` -- the SDK is loaded but inactive; all `captureException` calls become no-ops
- [ ] **Late initialization**: flag SDK initialization that occurs after middleware registration, route setup, or the first possible error path -- errors thrown during startup before SDK init are permanently lost; initialize the SDK as the very first operation
- [ ] **Missing unhandled exception handler**: flag Node.js applications without `unhandledRejection` and `uncaughtException` handlers wired to the error tracker, or Python without `sys.excepthook` integration -- unhandled errors bypass explicit capture calls
- [ ] **Missing error boundary (React)**: flag React applications using Sentry without `Sentry.ErrorBoundary` or a custom error boundary that calls `captureException` -- rendering errors in React unmount the component tree silently without error boundaries

### Sensitive Data Scrubbing
<!-- activation: keywords=["beforeSend", "before_send", "scrub", "filter", "redact", "strip", "sanitize", "denyList", "scrubFields", "pii", "password", "token", "secret", "credit_card", "ssn", "email", "authorization"] -->

- [ ] **No beforeSend/before_send hook**: flag error tracking initialization without a `beforeSend` (Sentry), `transform` (Rollbar), or `onError` (Bugsnag) callback -- without a scrubbing hook, all error context including request bodies, headers, and local variables is sent to the error tracking service unfiltered
- [ ] **Secrets in error context**: flag code that sets error context, tags, or extra data containing variables named `password`, `token`, `secret`, `api_key`, `authorization`, or `credential` -- these values are stored in the error tracking service, often with weaker access controls than a secrets manager
- [ ] **PII in error tags**: flag error tags or user context containing unredacted email addresses, phone numbers, SSNs, or IP addresses without explicit user consent -- error tracking payloads may be retained for months and accessible to the entire engineering team
- [ ] **Request body sent unfiltered**: flag middleware that attaches `request.body` to error context without field-level filtering -- request bodies commonly contain passwords, payment details, and personal information
- [ ] **Authorization headers in breadcrumbs**: flag breadcrumb configuration that includes HTTP request headers without excluding `Authorization`, `Cookie`, and `X-API-Key` -- these are captured automatically by many SDKs and must be explicitly excluded

### Source Maps and Stack Traces
<!-- activation: keywords=["sourcemap", "source_map", "source-map", "minified", "minify", "uglify", "webpack", "vite", "esbuild", "rollup", "bundle", "upload", "sentry-cli", "release", "dist"] -->

- [ ] **Source maps not uploaded**: flag frontend JavaScript projects using minification (webpack, Vite, esbuild, Rollup) with Sentry/Rollbar/Bugsnag configured but no source map upload step in the CI/CD pipeline -- minified stack traces show `a.js:1:42398` instead of `UserService.ts:127`, making errors impossible to diagnose
- [ ] **Version mismatch**: flag source map upload that does not use the same release/version identifier as the SDK `release` configuration -- mismatched versions cause the error tracker to display raw minified frames because it cannot find matching source maps
- [ ] **Source maps deployed to production**: flag source map files (`.map`) served to end users alongside bundled JavaScript -- source maps expose original source code; upload them to the error tracking service and exclude them from the production web server

### Error Grouping and Alerting
<!-- activation: keywords=["fingerprint", "grouping", "group", "merge", "issue", "alert", "rule", "notification", "threshold", "spike", "regression", "new"] -->

- [ ] **Fingerprint too broad**: flag custom `fingerprint` arrays that use only the error type without the message or stack trace location -- this merges distinct bugs (e.g., all `TypeError` instances) into a single issue, hiding new bugs behind an existing noisy one
- [ ] **Fingerprint too narrow**: flag custom fingerprints that include request-specific data (URL path with IDs, timestamp, request ID) -- this splits one bug into hundreds of issues, each with a single occurrence, defeating deduplication and trend detection
- [ ] **No alert on new issues**: flag error tracking projects without alert rules that notify on new (first-seen) error types -- new errors after deployment are the primary regression signal; without alerts, they accumulate unnoticed
- [ ] **No alert on error rate spike**: flag error tracking without a rate-based alert rule (e.g., "alert if error count exceeds 2x the rolling 24h average") -- gradual error increases from configuration drift or dependency degradation need rate-based detection

### Release and Context
<!-- activation: keywords=["release", "version", "deploy", "environment", "env", "breadcrumb", "context", "user", "tag", "setUser", "setTag", "configureScope"] -->

- [ ] **Release not set**: flag error tracking initialization without a `release` parameter set to the deployment version (Git SHA, semantic version, or build number) -- without release tracking, you cannot determine which deployment introduced an error or use the "resolved in next release" workflow
- [ ] **Environment not set**: flag initialization without `environment` parameter -- without it, staging errors mix with production errors in dashboards and alert rules, causing noise and missed production issues
- [ ] **Missing request context**: flag error capture without attaching request ID, trace ID, or correlation ID -- when investigating an error, the first action is correlating it with request logs and traces; without IDs, this requires timestamp-based guessing

## Common False Positives

- **CLI tools and batch jobs**: command-line tools may legitimately use simpler error reporting (stderr, exit codes) without a full error tracking SDK. Flag only for long-running services and user-facing applications.
- **beforeSend dropping expected errors**: some applications use `beforeSend` to filter known, unactionable errors (e.g., network timeouts from client disconnects). This is intentional noise reduction, not data loss, provided the filter is specific.
- **Server-side rendering without source maps**: SSR code running in Node.js does not require source map uploads if the server runs unminified source. Flag only for minified client-side bundles.
- **Self-hosted error tracking**: self-hosted Sentry instances may have different PII concerns if the data never leaves the organization's infrastructure. The security concern is reduced but not eliminated (access control still matters).

## Severity Guidance

| Finding | Severity |
|---|---|
| Passwords, tokens, or API keys in error payloads | Critical |
| Error tracking SDK not initialized (all errors lost) | Critical |
| PII (email, SSN, phone) sent to error tracker without scrubbing | Important |
| Source maps not uploaded for minified frontend code | Important |
| No alert rule for new error types | Important |
| Unhandled exception/rejection handler not registered | Important |
| Release version not set (cannot correlate errors to deploys) | Important |
| Request body sent unfiltered to error tracker | Important |
| Custom fingerprint merging unrelated errors | Minor |
| Environment tag not set | Minor |
| Missing breadcrumb context (request ID, trace ID) | Minor |
| Source maps served to production users (source exposure) | Minor |

## See Also

- `sec-owasp-a09-logging-monitoring-failures` -- error tracking is a critical component of monitoring; missing initialization is a monitoring failure
- `obs-structured-logging` -- errors should be logged with structured context in addition to error tracking for correlation
- `obs-distributed-tracing` -- trace_id in error context enables one-click navigation from error to distributed trace
- `obs-opentelemetry-sdk-discipline` -- OTel SDK errors should also flow to the error tracker for correlation
- `sec-owasp-a09-logging-monitoring-failures` -- sensitive data in error payloads is a logging/monitoring security failure
- `principle-fail-fast` -- uninitialized error tracking violates fail-fast; errors should be visibly captured, not silently lost

## Authoritative References

- [Sentry Documentation -- Best Practices](https://docs.sentry.io/platforms/)
- [Sentry Documentation -- Data Scrubbing](https://docs.sentry.io/security-legal-pii/scrubbing/)
- [Sentry Documentation -- Source Maps](https://docs.sentry.io/platforms/javascript/sourcemaps/)
- [Rollbar Documentation -- Configuration](https://docs.rollbar.com/)
- [Bugsnag Documentation -- Configuration](https://docs.bugsnag.com/)
- [OWASP -- Error Handling Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html)
