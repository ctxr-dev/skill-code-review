---
id: obs-metrics-red-use-golden-signals
type: primary
depth_role: leaf
focus: "Detect missing RED/USE/golden-signal metrics, cardinality explosions, incorrect histogram boundaries, missing units, and unlabeled metrics"
parents:
  - index.md
covers:
  - "Service endpoint missing Rate, Error, or Duration (RED) metrics"
  - "Resource missing Utilization, Saturation, or Error (USE) metrics"
  - Custom metric defined without unit suffix or documentation
  - Histogram bucket boundaries misaligned with expected latency distribution
  - Counter reset not handled causing negative rate spikes in dashboards
  - "Metric label with unbounded cardinality (user_id, request_path, full URL)"
  - Missing labels for tenant, service, or endpoint on shared metrics
  - Gauge used where counter is appropriate or vice versa
  - "Metric name not following naming conventions (snake_case, unit suffix)"
  - "Timer/histogram not recording error responses separately"
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
activation:
  file_globs:
    - "**/*metric*"
    - "**/*counter*"
    - "**/*histogram*"
    - "**/*gauge*"
    - "**/*prometheus*"
    - "**/*statsd*"
    - "**/*datadog*"
    - "**/*micrometer*"
    - "**/*opentelemetry*"
    - "**/*otel*"
    - "**/middleware/**"
    - "**/interceptor/**"
  keyword_matches:
    - counter
    - histogram
    - gauge
    - summary
    - metric
    - prometheus
    - statsd
    - micrometer
    - opentelemetry
    - meter
    - observe
    - increment
    - record
    - latency
    - duration
    - request_total
    - error_total
  structural_signals:
    - Metric registration or initialization
    - HTTP handler or RPC method definition without instrumentation
    - Connection pool or thread pool configuration
    - Middleware or interceptor with timing logic
source:
  origin: file
  path: obs-metrics-red-use-golden-signals.md
  hash: "sha256:c1b2d7d1dda80e87e333fbd06a61cfcb98b789ac4712b58ba1683d95be7e1f60"
---
# Metrics -- RED, USE, and Golden Signals

## When This Activates

Activates when diffs contain metric definitions, instrumentation middleware, counter/histogram/gauge usage, or keywords like `metric`, `counter`, `histogram`, `prometheus`, `opentelemetry`, `latency`, `duration`. Every service must emit the RED metrics (Rate, Errors, Duration) for its endpoints and USE metrics (Utilization, Saturation, Errors) for its resources. This reviewer enforces metric completeness, correct types, appropriate cardinality, and proper naming.

## Audit Surface

- [ ] HTTP handler or RPC method without request_duration_seconds histogram
- [ ] Service endpoint without request_total counter
- [ ] Service endpoint without error_total counter or error label on request counter
- [ ] Database connection pool without utilization and saturation gauges
- [ ] Thread pool or worker pool without active/queued/rejected metrics
- [ ] Custom metric missing unit suffix (_seconds,_bytes, _total)
- [ ] Histogram with default buckets instead of service-appropriate boundaries
- [ ] Metric label sourced from user input or unbounded enum
- [ ] Counter metric without _total suffix
- [ ] Gauge metric tracking a monotonically increasing value (should be counter)
- [ ] Metric registered but never observed (dead metric)
- [ ] Rate/error/duration recorded only on success path, not on error path
- [ ] Timer that excludes queue wait time, measuring only processing time
- [ ] Metric missing service or endpoint label in multi-service deployment

## Detailed Checks

### RED Metrics Completeness (Rate, Errors, Duration)
<!-- activation: keywords=["handler", "endpoint", "route", "controller", "rpc", "grpc", "request", "response", "status", "http", "api"] -->

- [ ] **Missing request rate counter**: flag HTTP handlers, RPC methods, or message consumers that do not increment a request_total counter -- rate is the primary signal for traffic anomalies and capacity planning
- [ ] **Missing error counter or label**: flag endpoints that record request_total but not error_total, or that lack a status/error label on the request counter -- error rate (errors/requests) is the most important SLI for most services. Cross-reference with `obs-sli-slo-error-budgets`
- [ ] **Missing duration histogram**: flag request handlers without a request_duration_seconds histogram observation -- duration percentiles (p50, p95, p99) are critical for latency SLOs and anomaly detection
- [ ] **Duration recorded only on success**: flag instrumentation that records latency only when the request succeeds -- error latency must also be captured to detect timeout-related failures
- [ ] **Duration excludes queue wait**: flag timers that start at processing begin rather than at request receipt -- queue wait time is part of the user-perceived latency

### USE Metrics for Resources
<!-- activation: keywords=["pool", "connection", "thread", "worker", "queue", "buffer", "cache", "memory", "cpu", "disk", "semaphore", "capacity"] -->

- [ ] **Connection pool without utilization gauge**: flag database, HTTP client, or Redis connection pools without a gauge reporting active/total ratio -- pool exhaustion is a common cause of cascading failures
- [ ] **Pool without saturation metric**: flag resource pools without a queued/waiting/pending gauge -- saturation (demand exceeding capacity) predicts imminent failure before it happens
- [ ] **Thread pool without rejection counter**: flag executor services or worker pools without a counter for rejected or dropped tasks -- silent task rejection causes data loss
- [ ] **Cache without hit/miss counters**: flag cache implementations without hit_total and miss_total counters -- cache hit ratio is essential for performance tuning and capacity planning

### Metric Type and Naming Correctness
<!-- activation: keywords=["counter", "gauge", "histogram", "summary", "register", "create", "new_counter", "new_histogram", "Counter(", "Gauge(", "Histogram("] -->

- [ ] **Gauge for monotonically increasing value**: flag gauge metrics that only increase (e.g., total_requests_processed as a gauge) -- use a counter so rate() calculations work correctly after process restarts
- [ ] **Counter for value that can decrease**: flag counter metrics for values that legitimately decrease (e.g., active_connections, queue_depth) -- counters only go up; use a gauge for current-state values
- [ ] **Missing unit suffix**: flag metric names without standard unit suffixes (_seconds,_bytes, _total,_ratio, _info) -- units in metric names prevent misinterpretation and are required by OpenMetrics. Cross-reference with `principle-naming-and-intent` if present
- [ ] **Counter without _total suffix**: flag Prometheus-style counter names that omit the _total suffix -- this is required by OpenMetrics and conventional in Prometheus
- [ ] **Non-snake_case metric name**: flag metric names using camelCase, PascalCase, or kebab-case -- Prometheus and OpenTelemetry conventions require snake_case

### Histogram Bucket Configuration
<!-- activation: keywords=["bucket", "histogram", "latency", "duration", "percentile", "quantile", "le", "boundary"] -->

- [ ] **Default buckets on latency histogram**: flag latency histograms using library default buckets (e.g., Prometheus defaults: 0.005 to 10s) without customization -- default buckets rarely match actual latency distribution, yielding useless percentile estimates
- [ ] **Buckets too coarse for SLO threshold**: flag histograms where no bucket boundary falls near the SLO target (e.g., SLO at 200ms but nearest buckets are 100ms and 500ms) -- percentile estimation error is largest between bucket boundaries. Cross-reference with `obs-sli-slo-error-budgets`
- [ ] **Too many buckets**: flag histograms with more than 20-30 buckets -- excessive buckets multiply time series by bucket count, increasing storage cost and query latency without proportional accuracy gain
- [ ] **Bucket boundaries not covering tail latency**: flag latency histograms without buckets above 1s or 5s -- tail latency (p99, p99.9) is invisible if the highest bucket is below the actual tail

### Cardinality Control
<!-- activation: keywords=["label", "tag", "dimension", "user_id", "customer_id", "path", "url", "query", "ip", "email", "uuid", "id"] -->

- [ ] **Unbounded label from user input**: flag metric labels sourced from request paths, query parameters, user IDs, email addresses, or IP addresses -- each unique value creates a new time series; 1M users = 1M series per metric (cardinality explosion)
- [ ] **URL path as metric label without normalization**: flag metrics using raw HTTP path (e.g., `/users/12345/orders`) as a label instead of the route template (`/users/{id}/orders`) -- path parameters create unbounded cardinality
- [ ] **Error message as label value**: flag metrics using error messages or exception strings as label values -- unique error messages proliferate unboundedly; use error codes or error categories
- [ ] **Missing key labels**: flag metrics in multi-tenant or multi-service systems that lack service, endpoint, or tenant labels -- these are essential for filtering and aggregation in shared dashboards

## Common False Positives

- **Internal process metrics**: runtime metrics (GC, memory, goroutine count) provided by language runtimes do not need RED treatment. They follow USE patterns inherently.
- **Batch jobs vs request-driven services**: batch jobs may not have meaningful "request rate" but should still track duration, error count, and items processed.
- **Client-side metrics with library defaults**: HTTP client libraries often emit metrics with their own bucket defaults. Flag only if the library defaults are demonstrably wrong for the use case.
- **Feature-flag-gated metrics**: metrics behind feature flags may appear dead but are intentionally conditional.

## Severity Guidance

| Finding | Severity |
|---|---|
| Service endpoint with no RED metrics at all | Critical |
| Metric label with unbounded cardinality (user_id, raw path) | Critical |
| Missing error rate metric on customer-facing endpoint | Important |
| Duration histogram with default buckets mismatched to SLO | Important |
| Connection pool without utilization or saturation gauge | Important |
| Gauge used for monotonically increasing value | Important |
| Custom metric missing unit suffix | Minor |
| Counter missing _total suffix | Minor |
| Non-snake_case metric name | Minor |
| Dead metric registered but never observed | Minor |

## See Also

- `obs-sli-slo-error-budgets` -- RED metrics are the foundation of SLIs; histogram bucket alignment affects SLO accuracy
- `obs-distributed-tracing` -- traces provide per-request detail where metrics provide aggregated signals
- `obs-alerting-discipline` -- alerts should be based on RED/USE metrics with SLO-derived thresholds
- `obs-structured-logging` -- logs complement metrics with event-level detail for incident investigation
- `principle-fail-fast` -- missing metrics mean failures go undetected until users report them

## Authoritative References

- [Tom Wilkie - RED Method](https://www.weave.works/blog/the-red-method-key-metrics-for-microservices-architecture/)
- [Brendan Gregg - USE Method](https://www.brendangregg.com/usemethod.html)
- [Google SRE Book - Chapter 6: Monitoring Distributed Systems (Four Golden Signals)](https://sre.google/sre-book/monitoring-distributed-systems/)
- [Prometheus Naming Best Practices](https://prometheus.io/docs/practices/naming/)
- [OpenTelemetry Metrics Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/general/metrics/)
- [Prometheus Histograms and Summaries](https://prometheus.io/docs/practices/histograms/)
