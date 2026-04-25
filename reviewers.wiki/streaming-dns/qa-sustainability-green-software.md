---
id: qa-sustainability-green-software
type: primary
depth_role: leaf
focus: Detect unnecessary computation, oversized assets, missing caching for repeated expensive work, unnecessary network round-trips, idle resource consumption, and missing auto-scaling down
parents:
  - index.md
covers:
  - Polling instead of event-driven notification
  - Oversized images, fonts, or assets served without optimization
  - Missing caching for repeated expensive computation or data fetches
  - "Unnecessary network round-trips (chatty APIs, N+1 calls)"
  - Idle resource consumption — always-on services with no traffic
  - Missing scale-to-zero or auto-scaling down during low demand
  - Redundant recomputation of values that could be memoized
  - Uncompressed payloads transferred over network
  - Unnecessary full-page reloads or re-renders
  - Background jobs running more frequently than business need requires
tags:
  - sustainability
  - green-software
  - energy
  - efficiency
  - caching
  - polling
  - assets
  - optimization
  - scale-to-zero
activation:
  file_globs:
    - "**/*"
    - "**/Dockerfile"
    - "**/*.yaml"
    - "**/*.yml"
  keyword_matches:
    - setInterval
    - setTimeout
    - poll
    - cron
    - schedule
    - cache
    - memoize
    - fetch
    - request
    - image
    - asset
    - compress
    - gzip
    - brotli
    - lazy
    - autoscaling
    - scale
    - idle
  structural_signals:
    - Timer-based polling loop
    - Repeated expensive computation without caching
    - Always-on resource configuration
source:
  origin: file
  path: qa-sustainability-green-software.md
  hash: "sha256:acc4ae15c8bae842bee93195e3708fd4deae50416f47c7d25b3d60b46ed94be7"
---
# Sustainability and Green Software

## When This Activates

Activates when diffs introduce polling loops, asset serving, caching decisions, network call patterns, scheduling configuration, or auto-scaling settings. Green software engineering applies efficiency as a first-class design constraint. Every unnecessary CPU cycle, network byte, and idle server-hour translates to energy consumption and carbon emissions. This reviewer detects patterns where equivalent functionality could be achieved with fewer resources. Beyond environmental impact, these patterns also reduce infrastructure cost and improve user-perceived performance.

## Audit Surface

- [ ] Timer-based polling loop where webhook, SSE, or pub/sub is available
- [ ] Image served without compression, resizing, or modern format (WebP, AVIF)
- [ ] Expensive computation repeated per-request without caching or memoization
- [ ] API design requiring N+1 calls where a batch or compound endpoint would suffice
- [ ] Always-on service or container with no scale-to-zero configuration
- [ ] Cron job or scheduled task running more frequently than data changes
- [ ] HTTP response without compression (gzip, brotli) for text-based content
- [ ] Full-page reload or full-component re-render for partial data update
- [ ] Unused dependencies increasing build size and startup energy cost
- [ ] Data pipeline reprocessing unchanged data without incremental mode
- [ ] Video or large media auto-loaded without lazy loading or user interaction
- [ ] Redundant DNS lookups or TLS handshakes from connection not being reused

## Detailed Checks

### Polling vs Event-Driven
<!-- activation: keywords=["setInterval", "setTimeout", "poll", "polling", "timer", "tick", "cron", "schedule", "sleep", "loop", "while true", "every"] -->

- [ ] **Timer-based polling**: flag `setInterval`, `setTimeout` loops, or `while (true) { sleep; check; }` patterns that poll for state changes -- replace with webhooks, server-sent events (SSE), WebSockets, or pub/sub where the data source supports push notification
- [ ] **Over-frequent cron jobs**: flag scheduled tasks that run more often than the underlying data changes -- if data updates hourly, a per-minute cron wastes 59 out of 60 runs; align schedule frequency with data change frequency
- [ ] **Polling without exponential backoff**: flag polling loops that check at fixed intervals regardless of whether the target changes -- use exponential backoff or adaptive polling to reduce idle checks

### Asset Optimization
<!-- activation: keywords=["image", "img", "src", "asset", "font", "video", "media", "bundle", "chunk", "size", "compress", "optimize", "WebP", "AVIF", "lazy"] -->

- [ ] **Unoptimized images**: flag images served without compression, without responsive sizing (`srcset`), or in legacy formats (PNG/JPEG) where WebP or AVIF is viable -- modern formats reduce transfer size by 25-50%
- [ ] **Missing lazy loading**: flag below-the-fold images, videos, or iframes loaded eagerly on page load -- use `loading="lazy"` or Intersection Observer to defer offscreen content
- [ ] **Unused bundle dependencies**: flag JavaScript or CSS bundles including unused libraries -- tree-shake, code-split, or remove unused dependencies to reduce transfer and parse cost

### Caching and Memoization
<!-- activation: keywords=["cache", "Cache", "memoize", "memo", "useMemo", "lru", "ttl", "redis", "memcached", "compute", "calculate", "transform", "parse"] -->

- [ ] **Repeated expensive computation**: flag functions performing expensive computation (parsing, transformation, aggregation) called multiple times with the same inputs without caching -- memoize pure functions or cache results with appropriate TTL
- [ ] **Missing HTTP caching headers**: flag API responses or static assets served without `Cache-Control`, `ETag`, or `Last-Modified` headers -- proper HTTP caching eliminates redundant transfers
- [ ] **Cache-aside without TTL**: flag cached values with no expiration -- stale caches waste memory and risk correctness; set TTLs aligned with data freshness requirements

### Network Efficiency
<!-- activation: keywords=["fetch", "request", "http", "api", "call", "round-trip", "batch", "graphql", "rest", "connection", "keep-alive", "pool"] -->

- [ ] **Chatty API calls**: flag code making multiple sequential HTTP calls where a single batch endpoint, GraphQL query, or compound request would suffice -- each round-trip adds latency and network energy cost
- [ ] **Uncompressed responses**: flag HTTP responses serving text-based content (JSON, HTML, CSS, JS) without compression (gzip, brotli) -- compression reduces transfer size by 60-80% for text
- [ ] **Connection not reused**: flag HTTP clients creating new connections per request instead of using connection pools or keep-alive -- TLS handshakes and TCP setup are expensive for both client and server

### Idle Resource Consumption
<!-- activation: keywords=["autoscaling", "scale", "min_capacity", "min_size", "min_replicas", "always-on", "reserved", "provisioned", "idle", "schedule"] -->

- [ ] **No scale-to-zero**: flag services or containers configured with a minimum instance count that keeps resources running during zero-traffic periods -- configure scale-to-zero for non-latency-critical services or use scheduled scaling for predictable traffic patterns
- [ ] **Always-on dev/staging environments**: flag non-production environments running 24/7 -- schedule shutdown during nights and weekends or use on-demand provisioning
- [ ] **Full reprocessing pipelines**: flag data pipelines that reprocess entire datasets on each run instead of processing only new or changed data -- use incremental processing, change-data-capture, or watermark-based processing

## Common False Positives

- **Latency-critical polling**: some real-time systems (trading, monitoring) intentionally poll at high frequency because the latency of event-based alternatives is unacceptable.
- **Cache coherence complexity**: not every repeated computation benefits from caching -- if cache invalidation is harder than recomputation, the tradeoff may favor recomputation.
- **Compliance-driven retention**: some always-on resources exist for regulatory compliance (audit logs, security monitoring) and cannot be scaled to zero.
- **Small-scale applications**: for applications with minimal traffic and a single server, the overhead of event-driven architecture may exceed the savings from eliminating polling.

## Severity Guidance

| Finding | Severity |
|---|---|
| Polling loop where push notification is available and proven | Important |
| Expensive computation repeated per-request without caching | Important |
| Always-on production service with no scale-down during zero traffic | Important |
| Data pipeline reprocessing unchanged data on every run | Important |
| Unoptimized images adding 500KB+ to page load | Minor |
| Missing compression on HTTP responses | Minor |
| Cron job running 10x more frequently than data changes | Minor |
| Dev environment running 24/7 without schedule | Minor |

## See Also

- `perf-startup-cold-start` -- scale-to-zero requires fast cold starts to be practical
- `principle-dry-kiss-yagni` -- unnecessary code is unnecessary computation

## Authoritative References

- [Green Software Foundation, "Software Carbon Intensity (SCI) Specification"](https://sci.greensoftware.foundation/)
- [Green Software Foundation, "Green Software Patterns" -- catalog of efficiency patterns](https://patterns.greensoftware.foundation/)
- [Principles of Green Software Engineering](https://principles.green/)
- [Google, "Carbon-Aware Computing" (2022)](https://cloud.google.com/blog/topics/sustainability/how-google-cloud-is-helping-with-carbon-aware-computing)
