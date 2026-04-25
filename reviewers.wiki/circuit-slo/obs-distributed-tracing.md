---
id: obs-distributed-tracing
type: primary
depth_role: leaf
focus: Detect missing span creation for external calls, broken trace context propagation, incorrect span granularity, missing error recording, and incomplete span attributes
parents:
  - index.md
covers:
  - "External HTTP/RPC/database call without a child span"
  - Trace context not propagated across service boundaries
  - "Spans too coarse (entire request as one span) hiding bottlenecks"
  - "Spans too fine (every function call) creating trace noise and overhead"
  - Error status and exception details not recorded on spans
  - Trace context not forwarded to async workers, queues, or background jobs
  - "Span attributes missing key dimensions (http.method, db.system, rpc.service)"
  - "Span names using variable data (URLs with IDs) causing high cardinality"
  - Manual context propagation instead of using framework instrumentation
  - "Sampling configuration not tuned (100% sampling in production or 0% on errors)"
tags:
  - distributed-tracing
  - opentelemetry
  - spans
  - trace-context
  - propagation
  - W3C-traceparent
  - observability
  - sampling
  - instrumentation
activation:
  file_globs:
    - "**/*trac*"
    - "**/*span*"
    - "**/*otel*"
    - "**/*opentelemetry*"
    - "**/*jaeger*"
    - "**/*zipkin*"
    - "**/*middleware/**"
    - "**/*interceptor/**"
    - "**/*instrumentation*"
  keyword_matches:
    - span
    - trace
    - tracer
    - tracing
    - opentelemetry
    - traceparent
    - tracestate
    - propagator
    - context
    - start_span
    - startSpan
    - with_span
    - jaeger
    - zipkin
    - W3CTraceContextPropagator
    - inject
    - extract
  structural_signals:
    - HTTP client call without surrounding span
    - Database query without tracing instrumentation
    - Message queue producer or consumer
    - Async task dispatch or background job handler
source:
  origin: file
  path: obs-distributed-tracing.md
  hash: "sha256:9b6edc67336b6355cd554c13eea8bb2fd3def4a7a34f68f02170385d0cc641ea"
---
# Distributed Tracing

## When This Activates

Activates when diffs contain span creation, tracer configuration, context propagation, instrumentation setup, or keywords like `span`, `trace`, `opentelemetry`, `traceparent`, `propagator`, `jaeger`, `zipkin`. Also activates on HTTP client calls, database queries, RPC invocations, and message queue operations that may lack tracing instrumentation. This reviewer ensures traces provide end-to-end visibility across service boundaries with appropriate granularity and complete error recording.

## Audit Surface

- [ ] HTTP client call without wrapping span or auto-instrumentation
- [ ] Database query executed without a db span
- [ ] gRPC/RPC call without span creation or context propagation
- [ ] Message published to queue without injecting trace context into headers
- [ ] Async worker or background job not extracting trace context from message
- [ ] Span covering entire request handler with no child spans for I/O calls
- [ ] Span created for every function call in a synchronous call chain
- [ ] Catch block that does not call span.recordException() or span.setStatus(ERROR)
- [ ] Span name containing variable path segments or query parameters
- [ ] Span missing http.method, http.status_code, or url.path attribute
- [ ] Span missing db.system, db.statement (sanitized), or db.name attribute
- [ ] Outbound HTTP request missing traceparent/tracestate header injection
- [ ] Sampling rate set to 100% in production with high-throughput traffic
- [ ] Error spans not force-sampled (errors dropped by probabilistic sampler)

## Detailed Checks

### Span Creation for External Calls
<!-- activation: keywords=["http", "fetch", "request", "axios", "HttpClient", "RestTemplate", "query", "execute", "sql", "SELECT", "INSERT", "grpc", "rpc", "call", "invoke", "send", "publish"] -->

- [ ] **HTTP client call without span**: flag outbound HTTP requests (fetch, axios, HttpClient, RestTemplate, requests.get) that are not wrapped in a client span or covered by auto-instrumentation -- invisible HTTP calls create gaps in the trace waterfall and hide latency sources
- [ ] **Database query without span**: flag database queries (SQL, MongoDB, Redis commands) executed without a db span -- database calls are frequently the largest latency contributor and must be visible in traces
- [ ] **RPC call without span**: flag gRPC, Thrift, or custom RPC invocations without client span creation and context propagation -- RPC calls cross process boundaries and require explicit span linking
- [ ] **Third-party API call without span**: flag calls to external services (payment gateways, email providers, cloud APIs) without a dedicated span -- third-party latency and errors must be attributable in traces

### Trace Context Propagation
<!-- activation: keywords=["propagat", "inject", "extract", "traceparent", "tracestate", "header", "metadata", "context", "carrier", "W3C", "b3"] -->

- [ ] **Missing context injection on outbound calls**: flag HTTP client requests that do not inject traceparent/tracestate headers (W3C) or B3 headers -- without injection, the downstream service starts a new root trace, breaking the distributed call chain
- [ ] **Missing context extraction on inbound requests**: flag HTTP server handlers or message consumers that do not extract trace context from incoming headers -- the server span becomes a disconnected root instead of a child of the caller's span
- [ ] **Queue/message producer without context in headers**: flag message publishers (Kafka, RabbitMQ, SQS, Pub/Sub) that do not inject trace context into message headers -- async processing becomes invisible in the originating trace. Cross-reference with `principle-separation-of-concerns` for propagation as cross-cutting concern
- [ ] **Async worker not extracting context**: flag background job handlers, queue consumers, or scheduled task runners that do not extract and restore trace context from the job payload -- these operations appear as orphaned traces with no connection to the triggering request

### Span Granularity
<!-- activation: keywords=["span", "start_span", "startSpan", "with_span", "tracer", "in_span", "trace_method", "instrument"] -->

- [ ] **Single span for entire request**: flag request handlers that create only a root span with no child spans for I/O operations -- a single monolithic span hides which external call contributed to latency and makes debugging impossible
- [ ] **Span per function in synchronous chain**: flag code that creates a span for every function call in a pure computation chain (e.g., validate -> transform -> format) -- excessive spans add overhead and create trace noise; prefer spans at I/O boundaries, not computation boundaries
- [ ] **Missing span for retry/circuit-breaker logic**: flag retry wrappers that do not create a span per attempt -- without per-attempt spans, it is impossible to see how many retries occurred and which attempt succeeded

### Error Recording on Spans
<!-- activation: keywords=["error", "exception", "catch", "except", "rescue", "status", "setStatus", "recordException", "set_attribute", "StatusCode"] -->

- [ ] **Catch block without span error recording**: flag catch/except blocks that handle errors but do not call `span.recordException()` and `span.setStatus(StatusCode.ERROR)` -- the trace shows a successful span for a failed operation, hiding the failure from trace-based alerting. Cross-reference with `principle-fail-fast`
- [ ] **HTTP error response without span status**: flag request handlers that return 4xx/5xx responses without setting the span status to ERROR -- trace visualization tools rely on span status to highlight failed operations
- [ ] **Exception recorded but span status not set**: flag code that calls `span.recordException(e)` without also calling `span.setStatus(StatusCode.ERROR)` -- the exception event is logged but the span appears successful in trace overviews

### Span Naming and Attributes
<!-- activation: keywords=["name", "attribute", "setName", "set_attribute", "http.method", "http.status_code", "db.system", "rpc.service", "span_name", "operation"] -->

- [ ] **Variable data in span name**: flag span names containing request IDs, user IDs, database primary keys, or full URLs with path parameters (e.g., `GET /users/12345`) -- span names should use route templates (`GET /users/{id}`) to keep cardinality bounded. Cross-reference with `obs-metrics-red-use-golden-signals`
- [ ] **Missing semantic convention attributes**: flag HTTP spans without `http.method`, `http.status_code`, `url.path`; database spans without `db.system`, `db.name`; RPC spans without `rpc.system`, `rpc.service` -- these attributes are defined by OpenTelemetry semantic conventions and are required for standardized dashboards
- [ ] **Sensitive data in span attributes**: flag span attributes containing passwords, tokens, full SQL with parameter values, or PII -- span attributes are stored in tracing backends and are subject to the same data protection requirements as logs. Cross-reference with `compliance-pii-handling-and-minimization`

## Common False Positives

- **Auto-instrumentation coverage**: many frameworks (Spring Boot + Micrometer, Express + @opentelemetry/auto-instrumentations-node) auto-create spans for HTTP and DB calls. Verify auto-instrumentation is configured before flagging missing manual spans.
- **Internal function tracing for profiling**: some teams intentionally create fine-grained spans during performance investigations. Flag only when this is committed to production code paths.
- **Sampling drops traces**: if probabilistic sampling is configured, not every request will have a complete trace. This is by design, not a propagation failure.
- **Health check endpoints**: liveness and readiness probes often omit tracing to reduce noise. This is acceptable.

## Severity Guidance

| Finding | Severity |
|---|---|
| Trace context not propagated to downstream service (broken trace) | Critical |
| External call (HTTP, DB, RPC) with no span at all | Important |
| Queue producer not injecting trace context into message headers | Important |
| Catch block not recording error on span | Important |
| Span name with unbounded cardinality (variable path segments) | Important |
| Sensitive data (PII, credentials) in span attributes | Important |
| Single monolithic span for entire request with multiple I/O calls | Minor |
| Missing semantic convention attributes on spans | Minor |
| 100% sampling rate in high-throughput production service | Minor |
| Span created for pure computation function | Minor |

## See Also

- `obs-structured-logging` -- correlation IDs in logs connect log lines to trace spans
- `obs-metrics-red-use-golden-signals` -- metrics provide aggregated signals; traces provide per-request detail
- `obs-sli-slo-error-budgets` -- trace-based error detection feeds SLI measurements
- `obs-alerting-discipline` -- trace-derived metrics (error rate, latency percentiles) feed alerts
- `sec-owasp-a09-logging-monitoring-failures` -- trace context is part of comprehensive monitoring
- `compliance-pii-handling-and-minimization` -- PII in span attributes has the same risks as PII in logs
- `principle-separation-of-concerns` -- tracing instrumentation should be a cross-cutting concern, not embedded in business logic

## Authoritative References

- [OpenTelemetry Tracing Specification](https://opentelemetry.io/docs/specs/otel/trace/)
- [OpenTelemetry Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/)
- [W3C Trace Context Specification](https://www.w3.org/TR/trace-context/)
- [Google Dapper Paper - Distributed Tracing](https://research.google/pubs/dapper-a-large-scale-distributed-systems-tracing-infrastructure/)
- [Distributed Tracing in Practice (O'Reilly)](https://www.oreilly.com/library/view/distributed-tracing-in/9781492056621/)
