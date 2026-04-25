---
id: obs-sampling-strategies
type: primary
depth_role: leaf
focus: Detect trace sampling misconfigurations that lose critical signal, over-sample routine traffic, or produce inconsistent sampling decisions across services
parents:
  - index.md
covers:
  - Head sampling dropping error traces and high-latency outliers
  - Tail sampling configuration missing or not propagated to all services
  - Missing always-sample rule for error spans and 5xx responses
  - Sampling rate too aggressive losing meaningful signal
  - No sampling configured at all causing cost explosion at scale
  - Inconsistent sampling decisions between upstream and downstream services
  - Parent-based sampler with root service not sampling correctly
  - Sampling decision not propagated via W3C TraceContext headers
  - "Debug/force-sample flag not supported for on-demand investigation"
  - Sampling rate not adjustable without redeployment
tags:
  - sampling
  - tracing
  - head-sampling
  - tail-sampling
  - cost
  - observability
  - opentelemetry
  - probabilistic
  - rate
  - traces
activation:
  file_globs:
    - "**/*sampl*"
    - "**/*tracing*"
    - "**/*otel*"
    - "**/*opentelemetry*"
    - "**/*collector*"
    - "**/*telemetry*"
  keyword_matches:
    - sampler
    - Sampler
    - sampling
    - sample_rate
    - TraceIdRatioBased
    - ParentBased
    - AlwaysOn
    - AlwaysOff
    - tail_sampling
    - probabilistic
    - head_sampling
    - OTEL_TRACES_SAMPLER
    - sample
    - trace_id_ratio
  structural_signals:
    - sampler_configuration
    - sampling_policy
    - collector_pipeline
    - trace_exporter_config
source:
  origin: file
  path: obs-sampling-strategies.md
  hash: "sha256:1eac5146903c8d6e44484e0efc3153fc4965ace0fdab90c030e1a04937c52d6c"
---
# Sampling Strategies

## When This Activates

Activates when the diff configures trace sampling, modifies sampler settings, sets up an OTel Collector tail-sampling pipeline, or changes trace export behavior. Also activates on keywords like `sampler`, `sampling`, `TraceIdRatioBased`, `ParentBased`, `tail_sampling`, `OTEL_TRACES_SAMPLER`. Sampling is the mechanism that balances observability fidelity against cost. The wrong strategy either loses the traces you need most (errors, outliers) or exports every trace at unsustainable cost. This reviewer ensures sampling preserves signal for errors and SLO-violating requests while controlling volume.

## Audit Surface

- [ ] Head sampler dropping all error traces at configured rate
- [ ] No always-sample rule for spans with error status or 5xx HTTP code
- [ ] No always-sample rule for latency outliers exceeding SLO threshold
- [ ] Sampling rate below 1% without demonstrated cost justification
- [ ] No sampling configured on high-throughput service (every trace exported)
- [ ] Tail sampling collector not deployed or not receiving 100% of spans
- [ ] Tail sampling policy missing error or latency-based rules
- [ ] Service A samples at 10% while downstream service B samples at 1% (broken traces)
- [ ] Parent-based sampler used but root service has no sampler configured
- [ ] Sampling decision not encoded in traceparent header flags
- [ ] No mechanism to force-sample specific trace IDs for debugging
- [ ] Sampling rate hardcoded -- requires redeployment to adjust
- [ ] Probabilistic sampler using non-deterministic seed (inconsistent across replicas)

## Detailed Checks

### Head Sampling Blind Spots
<!-- activation: keywords=["TraceIdRatioBased", "probabilistic", "head_sampling", "sample_rate", "ratio", "AlwaysOn", "AlwaysOff", "percentage"] -->

- [ ] **Errors dropped by probabilistic sampler**: flag `TraceIdRatioBased` or equivalent probabilistic head sampler without a composite rule that always samples errors -- a 10% head sampler drops 90% of error traces; errors are the highest-value signals and should always be sampled
- [ ] **Latency outliers dropped**: flag head-only sampling without any mechanism to capture high-latency traces -- head sampling decides before the request completes, so it cannot know if the request will be slow; combine with tail sampling or accept the blind spot and document it
- [ ] **AlwaysOff in production**: flag `AlwaysOff` sampler or `OTEL_TRACES_SAMPLER=always_off` in production configuration -- this disables all tracing; if cost is the concern, use a low ratio instead of zero
- [ ] **Rate too aggressive**: flag sampling rates below 1% (ratio < 0.01) on services that handle fewer than 10,000 requests per second -- at low volume, aggressive sampling loses meaningful signal; at 100 RPS with 0.1% sampling, you get ~9 traces per minute, which is insufficient for pattern detection

### Tail Sampling Configuration
<!-- activation: keywords=["tail_sampling", "tail", "collector", "pipeline", "policy", "decision", "latency_threshold", "error", "status_code", "composite", "probabilistic_sampling"] -->

- [ ] **Tail sampler without error policy**: flag tail sampling processor configuration that lacks an explicit policy to always sample traces with error status -- the primary value of tail sampling is keeping 100% of errors while dropping routine successes
- [ ] **Tail sampler without latency policy**: flag tail sampling without a latency-based policy that keeps traces exceeding an SLO threshold -- tail sampling can see completed trace duration and should keep outliers
- [ ] **Collector not receiving all spans**: flag tail sampling deployed on a collector that receives pre-sampled (head-sampled) spans -- tail sampling requires 100% of spans to make informed decisions; head sampling before the collector defeats the purpose
- [ ] **Missing wait period configuration**: flag tail sampling `decision_wait` set below 10 seconds without justification -- traces that span multiple services need time for all spans to arrive before the sampling decision; too-short wait causes incomplete trace evaluation

### Cross-Service Consistency
<!-- activation: keywords=["ParentBased", "parent", "propagat", "traceparent", "W3C", "header", "upstream", "downstream", "service", "root"] -->

- [ ] **Inconsistent rates across services**: flag services in the same request path with different sampling rates when not using parent-based sampling -- service A at 10% and service B at 1% means 90% of sampled traces from A are incomplete because B dropped its part
- [ ] **Parent-based sampler without root configuration**: flag `ParentBased` sampler used as the only sampler with `root` set to `AlwaysOff` or not configured -- parent-based delegates to the root sampler when there is no incoming trace context; if the root sampler is off, the service never initiates sampled traces
- [ ] **Sampling flag not propagated**: flag services that make sampling decisions but do not encode the decision in outgoing `traceparent` headers (sampled flag) -- downstream services using parent-based sampling will not respect the upstream decision
- [ ] **Non-deterministic sampler across replicas**: flag probabilistic samplers that use instance-specific random seeds instead of trace-ID-based hashing -- two replicas of the same service may make different sampling decisions for the same trace ID, producing partial traces

### Operational Controls
<!-- activation: keywords=["config", "env", "dynamic", "runtime", "adjust", "override", "debug", "force", "flag", "feature"] -->

- [ ] **Hardcoded sampling rate**: flag sampling rate defined as a constant in application code rather than configuration, environment variable, or feature flag -- during incidents, you need to increase sampling to 100% without redeploying; make the rate adjustable at runtime
- [ ] **No force-sample mechanism**: flag tracing setup without support for a debug/force-sample header or trace ID override -- operators need to force-sample specific requests for debugging without changing the global rate
- [ ] **No cost monitoring**: flag sampling configuration without corresponding metrics or dashboards tracking spans-per-second exported -- without monitoring export volume, sampling rate changes can silently cause cost spikes

## Common False Positives

- **Development and staging environments**: `AlwaysOn` sampling is correct for development and low-traffic staging environments. Flag only in production configurations or when the environment is ambiguous.
- **Event-driven systems with low throughput**: services processing fewer than 10 RPS may legitimately sample at 100% because the cost is negligible. The concern is high-throughput services.
- **Tail sampling at collector layer**: when a dedicated OTel Collector handles tail sampling, individual services should typically use `AlwaysOn` (to send all spans to the collector). This is correct architecture, not a missing-sampling issue.
- **Separate error tracking system**: if errors are captured by Sentry/Bugsnag/Rollbar in addition to traces, the always-sample-errors rule is less critical for the tracing pipeline specifically (though still recommended).

## Severity Guidance

| Finding | Severity |
|---|---|
| AlwaysOff sampler in production (zero traces) | Critical |
| Head sampling dropping error traces with no tail sampling backup | Critical |
| Inconsistent sampling rates across services in same request path | Critical |
| Tail sampling without error-based always-sample policy | Important |
| Tail sampling receiving pre-sampled spans (defeated purpose) | Important |
| Parent-based sampler with root set to AlwaysOff | Important |
| Sampling rate below 1% on low-to-moderate throughput service | Important |
| Hardcoded sampling rate requiring redeployment to change | Minor |
| No force-sample mechanism for debugging | Minor |
| Missing cost monitoring for trace export volume | Minor |

## See Also

- `obs-opentelemetry-sdk-discipline` -- sampler is configured on the TracerProvider; SDK misconfiguration can override sampling settings
- `obs-distributed-tracing` -- sampling affects trace completeness, which that reviewer validates end-to-end
- `obs-cardinality-budgeting` -- sampling controls trace volume but does not affect metric cardinality (metrics are never sampled)
- `obs-metrics-red-use-golden-signals` -- metrics provide the aggregate signal that sampling sacrifices at the trace level
- `principle-fail-fast` -- zero-sampling should fail visibly, not silently produce empty dashboards

## Authoritative References

- [OpenTelemetry Specification -- Sampling](https://opentelemetry.io/docs/specs/otel/trace/sdk/#sampling)
- [OpenTelemetry Collector -- Tail Sampling Processor](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/tailsamplingprocessor)
- [OpenTelemetry Documentation -- Sampling Concepts](https://opentelemetry.io/docs/concepts/sampling/)
- [W3C Trace Context -- sampled flag](https://www.w3.org/TR/trace-context/#sampled-flag)
- [Honeycomb -- Dynamic Sampling Guide](https://docs.honeycomb.io/manage-data-volume/sampling/)
- [Jaeger Documentation -- Sampling](https://www.jaegertracing.io/docs/latest/sampling/)
