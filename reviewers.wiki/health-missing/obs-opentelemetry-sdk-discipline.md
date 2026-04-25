---
id: obs-opentelemetry-sdk-discipline
type: primary
depth_role: leaf
focus: Detect OTel SDK misconfiguration including missing exporters, NOOP providers in production, broken context propagation, and missing resource attributes
parents:
  - index.md
covers:
  - Default NOOP TracerProvider or MeterProvider active in production
  - Exporter not configured or exporter endpoint unreachable
  - Resource attributes missing service.name or service.version
  - Batch processor not configured leading to per-span exports
  - SDK initialization order wrong causing lost early spans
  - Context propagation broken across async boundaries
  - W3C TraceContext propagator not set causing broken distributed traces
  - Span processor unbounded queue risking OOM
  - SDK shutdown hook missing causing data loss on process exit
  - Manual span creation without proper parent context
tags:
  - opentelemetry
  - otel
  - tracing
  - metrics
  - sdk
  - exporter
  - propagation
  - resource
  - batch-processor
  - observability
activation:
  file_globs:
    - "**/*otel*"
    - "**/*opentelemetry*"
    - "**/*tracing*"
    - "**/*telemetry*"
    - "**/instrumentation/**"
    - "**/*tracer*"
    - "**/*meter*"
  keyword_matches:
    - opentelemetry
    - TracerProvider
    - MeterProvider
    - LoggerProvider
    - BatchSpanProcessor
    - SpanExporter
    - OtlpGrpc
    - OtlpHttp
    - W3CTraceContext
    - trace.get_tracer
    - otel
    - OTEL_
    - propagator
    - span.set_attribute
    - start_as_current_span
    - WithSpan
  structural_signals:
    - sdk_initialization
    - exporter_configuration
    - tracer_provider_setup
    - context_propagation
source:
  origin: file
  path: obs-opentelemetry-sdk-discipline.md
  hash: "sha256:966444e249ae666c9919d31bf2c1cf1da07017ed79cf369d4f1adc7a456cc1cd"
---
# OpenTelemetry SDK Discipline

## When This Activates

Activates when the diff contains OTel SDK initialization, exporter configuration, tracer/meter provider setup, context propagation code, or span/metric creation. Also activates on keywords like `TracerProvider`, `MeterProvider`, `BatchSpanProcessor`, `OTEL_`, `propagator`. The OTel SDK has a critical property: it defaults to a NOOP implementation that silently discards all telemetry. A single misconfiguration -- wrong initialization order, missing exporter, broken propagation -- can cause complete observability blindness in production with zero error signals.

## Audit Surface

- [ ] TracerProvider or MeterProvider not replaced from global NOOP default
- [ ] No exporter configured for traces, metrics, or logs pipeline
- [ ] Exporter endpoint hardcoded or missing environment-based override
- [ ] Resource missing service.name attribute
- [ ] Resource missing service.version or deployment.environment attribute
- [ ] BatchSpanProcessor not configured -- using SimpleSpanProcessor in production
- [ ] Batch processor queue size left at default without capacity planning
- [ ] SDK initialized after first span creation (lost telemetry)
- [ ] Context not propagated across thread pool, goroutine, or async/await boundary
- [ ] W3C TraceContext or Baggage propagator not registered
- [ ] Span created without linking to parent context from incoming request
- [ ] SDK shutdown not called on SIGTERM or process exit
- [ ] Multiple TracerProviders instantiated causing split telemetry
- [ ] Sampler set to AlwaysOff or ParentBased with broken parent context
- [ ] OTLP exporter using HTTP when gRPC is available (higher overhead)

## Detailed Checks

### Provider and Exporter Configuration
<!-- activation: keywords=["TracerProvider", "MeterProvider", "LoggerProvider", "set_tracer_provider", "SetTracerProvider", "exporter", "OtlpGrpc", "OtlpHttp", "ConsoleExporter", "JaegerExporter", "ZipkinExporter", "OTEL_EXPORTER"] -->

- [ ] **NOOP provider in production**: flag code that calls `trace.get_tracer()` or `metrics.get_meter()` without a prior `set_tracer_provider()` / `SetTracerProvider()` call -- the global default is a NOOP that silently discards all telemetry; this is the single most common OTel misconfiguration
- [ ] **Console exporter in production**: flag `ConsoleSpanExporter` or `ConsoleMetricExporter` used outside test/development environments -- console exporters produce unstructured stdout output, not routable telemetry
- [ ] **Missing exporter entirely**: flag TracerProvider or MeterProvider configured without any exporter added to the pipeline -- the provider will accept spans/metrics but drop them silently
- [ ] **Hardcoded exporter endpoint**: flag OTLP exporter with hardcoded `localhost:4317` or similar -- use `OTEL_EXPORTER_OTLP_ENDPOINT` environment variable for environment portability
- [ ] **Multiple providers registered**: flag code that creates and sets the global TracerProvider more than once -- the second call replaces the first, orphaning spans already in flight on the old provider

### Resource Attributes
<!-- activation: keywords=["Resource", "service.name", "service.version", "deployment.environment", "resource_attributes", "OTEL_RESOURCE_ATTRIBUTES", "ResourceDetector"] -->

- [ ] **Missing service.name**: flag Resource creation without `service.name` attribute -- without it, all telemetry from this service appears as "unknown_service" in backends, making it impossible to filter or route
- [ ] **Missing service.version**: flag Resource without `service.version` -- version correlation is essential for regression detection; when latency spikes, the first question is "what version deployed?"
- [ ] **Missing deployment.environment**: flag Resource without `deployment.environment` -- without it, staging and production telemetry mix in the same backend, contaminating production dashboards
- [ ] **Resource attributes from hardcoded strings**: flag service.name or service.version set from string literals instead of build metadata or environment variables -- hardcoded values drift from reality after the first refactor

### Batch Processor and Memory
<!-- activation: keywords=["BatchSpanProcessor", "SimpleSpanProcessor", "batch", "queue", "maxQueueSize", "maxExportBatchSize", "scheduledDelayMillis", "exportTimeoutMillis"] -->

- [ ] **SimpleSpanProcessor in production**: flag `SimpleSpanProcessor` in non-test code -- it exports spans synchronously on the calling thread, adding exporter latency to every request; use `BatchSpanProcessor` for production
- [ ] **Unbounded batch queue**: flag `BatchSpanProcessor` with default or very large `maxQueueSize` without memory capacity analysis -- under load, the queue grows unbounded in memory if the exporter cannot keep up, leading to OOM
- [ ] **Batch export timeout too short**: flag `exportTimeoutMillis` set below 5 seconds for network exporters -- transient network delays will cause batch drops, creating gaps in telemetry during the exact moments you need it most (incidents)
- [ ] **No back-pressure handling**: flag batch processor configuration without monitoring the dropped-spans counter -- when the queue fills, spans are silently dropped; alert on `otel.bsp.spans.dropped`

### SDK Initialization Order
<!-- activation: keywords=["init", "setup", "bootstrap", "main", "app.module", "startup", "configure", "register"] -->

- [ ] **Late initialization**: flag SDK setup that occurs after HTTP server starts or after the first request handler runs -- spans created before the provider is set go to the NOOP and are permanently lost; initialize the SDK as the very first step in application bootstrap
- [ ] **Missing shutdown hook**: flag SDK initialization without a corresponding `shutdown()` call on SIGTERM, `atexit`, or equivalent -- without shutdown, the batch processor's in-memory queue is lost on process exit, dropping the final minutes of telemetry
- [ ] **Shutdown timeout too short**: flag `tracerProvider.shutdown(timeout)` with timeout under 5 seconds -- large batch queues need time to flush; a short timeout drops pending spans

### Context Propagation
<!-- activation: keywords=["propagat", "context", "W3CTraceContext", "TraceContext", "inject", "extract", "Baggage", "traceparent", "tracestate", "carrier", "TextMapPropagator", "async", "await", "goroutine", "thread", "executor", "CompletableFuture"] -->

- [ ] **Propagator not registered**: flag OTel setup without explicitly setting `W3CTraceContextPropagator` (or `CompositePropagator` including it) -- without a propagator, incoming `traceparent` headers are ignored and outgoing requests carry no trace context, breaking distributed traces at this service boundary
- [ ] **Context lost across async boundary**: flag code that spawns threads, goroutines, async tasks, or uses executor pools without explicitly passing `Context.current()` -- the trace context is thread-local and does not automatically transfer to new execution contexts
- [ ] **Manual HTTP client without inject**: flag HTTP client calls (RestTemplate, HttpClient, fetch, requests) that do not inject trace context into outgoing request headers -- downstream services will start new root traces instead of continuing the existing one
- [ ] **Baggage propagation disabled**: flag systems using `W3CTraceContextPropagator` alone when baggage (tenant ID, feature flags) needs cross-service propagation -- add `W3CBaggagePropagator` to the composite propagator

## Common False Positives

- **Test and development setup**: test configurations legitimately use `SimpleSpanProcessor`, `InMemoryExporter`, or `ConsoleExporter`. Flag only when these appear in production code paths or production configuration files.
- **Auto-instrumentation agents**: when using OTel auto-instrumentation (Java agent, Python `opentelemetry-instrument`), the agent handles provider setup, exporter configuration, and propagation. Manual SDK setup is not needed alongside an auto-instrumentation agent.
- **Collector sidecar handles export**: if an OTel Collector sidecar is deployed, the application exporter pointing to `localhost:4317` is correct -- the Collector handles routing, retry, and batching. The hardcoded endpoint concern does not apply.
- **Library instrumentation vs application SDK**: library authors should use the OTel API (not SDK) and should NOT create their own TracerProvider -- they rely on the application to configure the SDK. Missing provider setup in library code is correct.

## Severity Guidance

| Finding | Severity |
|---|---|
| NOOP provider active in production (all telemetry silently lost) | Critical |
| No exporter configured (telemetry accepted but discarded) | Critical |
| Context propagation broken (distributed traces severed) | Critical |
| Missing service.name (telemetry unattributable) | Important |
| SimpleSpanProcessor in production (synchronous export on hot path) | Important |
| SDK initialized after first request (early spans lost) | Important |
| Missing shutdown hook (final telemetry batch lost on deploy) | Important |
| Propagator not registered (incoming trace context ignored) | Important |
| Missing service.version or deployment.environment | Minor |
| Batch queue at default size without capacity analysis | Minor |
| OTLP HTTP used when gRPC available | Minor |
| Hardcoded exporter endpoint | Minor |

## See Also

- `obs-distributed-tracing` -- context propagation issues detected here break the distributed traces that reviewer validates end-to-end
- `obs-structured-logging` -- trace context (trace_id, span_id) should be injected into structured logs for correlation
- `obs-metrics-red-use-golden-signals` -- OTel MeterProvider misconfiguration causes missing RED/USE metrics
- `obs-cardinality-budgeting` -- unbounded span attributes create the same cardinality explosion as unbounded metric labels
- `obs-sampling-strategies` -- sampler configuration on the TracerProvider directly affects trace completeness
- `sec-owasp-a09-logging-monitoring-failures` -- missing telemetry is a monitoring failure from a security perspective
- `principle-fail-fast` -- silent NOOP behavior violates fail-fast; telemetry loss should be detectable

## Authoritative References

- [OpenTelemetry Specification -- SDK Configuration](https://opentelemetry.io/docs/specs/otel/configuration/)
- [OpenTelemetry Specification -- Resource Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/resource/)
- [OpenTelemetry Specification -- Context Propagation](https://opentelemetry.io/docs/specs/otel/context/api-propagators/)
- [OpenTelemetry Specification -- BatchSpanProcessor](https://opentelemetry.io/docs/specs/otel/trace/sdk/#batching-processor)
- [OpenTelemetry Documentation -- Getting Started Guides](https://opentelemetry.io/docs/getting-started/)
- [W3C Trace Context Specification](https://www.w3.org/TR/trace-context/)
