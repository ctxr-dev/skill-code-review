---
id: obs-cardinality-budgeting
type: primary
depth_role: leaf
focus: Detect unbounded metric labels, high-cardinality trace attributes, and log fields that cause storage cost explosion and backend instability
parents:
  - index.md
covers:
  - Metric label with unbounded values such as user_id, request_path, or query_string
  - Trace attribute containing unique-per-request values causing attribute explosion
  - Log field with per-request unique identifiers indexed as facets
  - Missing cardinality caps or allow-lists on label values
  - High-cardinality dimensions causing TSDB series explosion and cost blowup
  - Histogram buckets crossed with high-cardinality labels creating combinatorial explosion
  - URL path used as metric label without normalization to route template
  - "Error message string used as metric label (unique per stack trace)"
  - "HTTP status code used at full granularity (421, 422, 429) instead of class (4xx)"
tags:
  - cardinality
  - metrics
  - labels
  - dimensions
  - TSDB
  - cost
  - explosion
  - observability
  - prometheus
  - datadog
  - high-cardinality
activation:
  file_globs:
    - "**/*metric*"
    - "**/*counter*"
    - "**/*gauge*"
    - "**/*histogram*"
    - "**/*prometheus*"
    - "**/*statsd*"
    - "**/*datadog*"
    - "**/*telemetry*"
    - "**/*otel*"
  keyword_matches:
    - labels
    - label_values
    - tag
    - WithLabelValues
    - "Inc("
    - "Observe("
    - counter
    - gauge
    - histogram
    - summary
    - set_attribute
    - record_metric
    - metric_name
    - user_id
    - request_path
    - cardinality
  structural_signals:
    - metric_registration
    - label_assignment
    - counter_increment
    - histogram_observation
source:
  origin: file
  path: obs-cardinality-budgeting.md
  hash: "sha256:e4afeb9384f5747765b2d385ddf6fe99bdd4a52baa0a6c56339d960f560b0e23"
---
# Cardinality Budgeting

## When This Activates

Activates when the diff adds or modifies metric definitions, counter/gauge/histogram registrations, label assignments, or span attributes. Also activates on keywords like `labels`, `WithLabelValues`, `histogram`, `counter`, `gauge`, `set_attribute`. Cardinality -- the number of unique time series a metric produces -- is the primary cost driver in observability backends. A single metric with an unbounded label (user_id, URL path, error message) can create millions of time series, causing TSDB ingestion failures, query timeouts, and storage cost that scales with user count instead of service count. This reviewer enforces that every label dimension has a known, bounded value space.

## Audit Surface

- [ ] Metric label containing user ID, email, session ID, or account ID
- [ ] Metric label containing raw URL path, query string, or request body hash
- [ ] Metric label containing error message or exception string
- [ ] Metric label containing IP address or user-agent string
- [ ] Metric label populated from unbounded enum or free-text input
- [ ] Histogram metric with more than 4 label dimensions
- [ ] Counter or gauge with a label whose distinct value count is not bounded
- [ ] Trace attribute set from user-controlled input without value normalization
- [ ] Span attribute containing full SQL query text or request payload
- [ ] Log field used as indexed facet containing unique-per-request data
- [ ] No allow-list or cardinality cap on dynamic label values
- [ ] Metric registered in a loop or per-request code path with dynamic label names
- [ ] Time-series cardinality not estimated before adding new metric
- [ ] Label value using raw HTTP path instead of route template (e.g., /users/123 vs /users/:id)

## Detailed Checks

### Unbounded Metric Labels
<!-- activation: keywords=["label", "tag", "WithLabelValues", "Labels", "ConstLabels", "label_values", "metric_tags", "dimension", "user_id", "email", "account", "session", "ip_address", "user_agent", "path", "url", "query", "error_message"] -->

- [ ] **User identity as label**: flag metric labels named `user_id`, `account_id`, `email`, `customer_id`, `session_id`, or `tenant_id` -- these grow linearly with user count; a service with 1M users produces 1M time series per metric; use these as trace attributes (sampled) or log fields (indexed selectively), not metric labels
- [ ] **Raw URL path as label**: flag metric labels populated from `request.url`, `request.path`, `req.originalUrl`, or equivalent without normalization to the route template -- `/users/123` and `/users/456` are distinct label values; use the route pattern `/users/:id` instead
- [ ] **Error message as label**: flag metric labels containing exception messages, error strings, or stack trace fragments -- error messages are effectively unique per bug; use error type/class as the label and put the message in a log or span attribute
- [ ] **Query string or request body in label**: flag metric labels containing query parameters, request body hashes, or SQL query text -- these are unique per request and produce unbounded cardinality
- [ ] **IP address or user-agent as label**: flag metrics tagged with client IP or user-agent string -- both are high-cardinality; aggregate into subnets or agent families if needed

### Combinatorial Explosion
<!-- activation: keywords=["histogram", "summary", "bucket", "quantile", "le", "percentile", "dimension", "label"] -->

- [ ] **Too many label dimensions on histograms**: flag histogram metrics with more than 4 label dimensions -- histograms already multiply cardinality by the bucket count (default 10-20); 4 labels with 10 values each on a 10-bucket histogram = 100,000 series from one metric
- [ ] **Cardinality not estimated**: flag new metric registrations without a comment or documentation estimating the expected series count (product of distinct values per label) -- every metric should have a cardinality budget before deployment
- [ ] **Dynamic metric names**: flag code that constructs metric names from variables or user input (e.g., `counter(f"request_{endpoint}_total")`) -- this creates unbounded metric names, each treated as a separate metric family by the TSDB

### Cardinality Caps and Allow-lists
<!-- activation: keywords=["allow", "allowlist", "whitelist", "cap", "limit", "max", "bound", "overflow", "other", "default", "fallback", "normalize"] -->

- [ ] **No cardinality cap on dynamic values**: flag label values sourced from external input (API responses, database lookups, configuration) without an allow-list or overflow bucket -- unknown values should map to an "other" bucket to cap cardinality
- [ ] **Missing normalization**: flag HTTP method labels that accept arbitrary methods (WebDAV, custom methods) or status code labels at full granularity (distinguishing 429 from 422) when the class (4xx) suffices -- normalize to a bounded set
- [ ] **Per-request metric registration**: flag metric `Register()` or `NewCounter()` calls inside request handlers or loops -- metrics should be registered once at startup; per-request registration creates new series and leaks memory in most client libraries

### Trace and Log Cardinality
<!-- activation: keywords=["attribute", "set_attribute", "setAttribute", "span", "tag", "field", "facet", "index", "log"] -->

- [ ] **Full SQL in span attribute**: flag span attributes containing complete SQL query text -- use parameterized query templates and put the full query in span events or logs; backends index attribute values, and unique queries create attribute explosion
- [ ] **Request/response body in span**: flag span attributes containing serialized request or response bodies -- these are unique per request and should be attached as span events (not indexed) or linked to a separate log entry
- [ ] **Log field as indexed facet**: flag log fields marked for indexing or faceting that contain unique-per-request data (request_id, trace_id, full URL) -- indexed log fields multiply index size; index only fields you will aggregate on (service, level, error_class), not fields you search by exact match

## Common False Positives

- **Trace attributes vs metric labels**: trace attributes with high cardinality are acceptable because traces are sampled. The concern applies only to metric labels (every data point stored) and indexed log fields. A `user_id` span attribute is fine; a `user_id` metric label is not.
- **Low-traffic internal services**: a metric with `endpoint` as a label is safe if the service has 5 endpoints. The concern is unbounded growth, not a fixed set of 50 values. Verify the value space is truly fixed.
- **Cardinality-aware backends**: some backends (InfluxDB IOx, Clickhouse-based) handle high cardinality better than Prometheus. The cost concern still applies but the failure mode is cost, not ingestion failure.
- **Exemplars instead of labels**: OTel exemplars attach a single trace_id to a metric data point without creating a new series. Using exemplars for request-level correlation is the correct pattern and should not be flagged.

## Severity Guidance

| Finding | Severity |
|---|---|
| user_id, email, or session_id used as metric label | Critical |
| Raw URL path used as metric label without route normalization | Critical |
| Error message or stack trace used as metric label | Critical |
| Dynamic metric name constructed from variable input | Critical |
| Histogram with more than 4 high-cardinality label dimensions | Important |
| No cardinality cap or allow-list on externally-sourced label value | Important |
| Metric registered per-request instead of at startup | Important |
| Full SQL query stored as indexed span attribute | Important |
| IP address or user-agent used as metric label | Important |
| Missing cardinality estimate for new metric | Minor |
| HTTP status code at full granularity instead of class | Minor |
| Log field with per-request unique data marked for faceting | Minor |

## See Also

- `obs-metrics-red-use-golden-signals` -- RED/USE metrics are the highest-value metrics; this reviewer ensures their labels are bounded
- `obs-opentelemetry-sdk-discipline` -- span attributes set via OTel SDK are subject to cardinality review for indexed backends
- `obs-structured-logging` -- log fields used as facets have the same cardinality concerns as metric labels
- `obs-sampling-strategies` -- sampling reduces trace storage but does not help with metric cardinality (metrics are not sampled)
- `sec-owasp-a09-logging-monitoring-failures` -- cardinality explosion can cause monitoring backend failure, which is itself a monitoring failure

## Authoritative References

- [Prometheus Best Practices -- Labels](https://prometheus.io/docs/practices/naming/#labels)
- [Prometheus Best Practices -- Instrumentation](https://prometheus.io/docs/practices/instrumentation/#do-not-overuse-labels)
- [Grafana Labs -- How label cardinality affects Prometheus performance](https://grafana.com/blog/2022/02/15/what-are-cardinality-spikes-and-why-do-they-matter/)
- [OpenTelemetry Specification -- Metrics Data Model](https://opentelemetry.io/docs/specs/otel/metrics/data-model/)
- [Datadog -- Metrics without Limits (cardinality management)](https://docs.datadoghq.com/metrics/metrics-without-limits/)
- [Honeycomb -- High-Cardinality Observability](https://www.honeycomb.io/blog/so-you-want-to-build-an-observability-tool)
