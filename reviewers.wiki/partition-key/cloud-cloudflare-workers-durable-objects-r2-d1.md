---
id: cloud-cloudflare-workers-durable-objects-r2-d1
type: primary
depth_role: leaf
focus: "Detect Workers KV consistency misunderstanding, Durable Objects misuse, R2/D1 pitfalls, secrets in wrangler.toml, and CPU/subrequest limit violations"
parents:
  - index.md
covers:
  - Workers KV eventual consistency misunderstood as strong consistency
  - "Durable Objects not using alarm() API for scheduled work"
  - R2 uploads without presigned URLs exposing Worker to large payloads
  - "D1 SQLite limitations ignored (no joins on large datasets, row size)"
  - Secrets committed in wrangler.toml instead of using wrangler secret
  - Missing rate limiting on Worker endpoints
  - "Workers exceeding CPU time limits (10ms free, 50ms paid)"
  - "Missing error handling for subrequest limits (50 free, 1000 paid)"
  - KV key naming without namespace prefix causing collisions
  - Durable Objects state not persisted via storage API
tags:
  - cloudflare
  - workers
  - durable-objects
  - r2
  - d1
  - kv
  - edge
  - serverless
activation:
  file_globs:
    - "**/wrangler.toml"
    - "**/wrangler.jsonc"
    - "**/*.ts"
    - "**/*.js"
    - "**/*.mjs"
    - "**/worker.*"
  keyword_matches:
    - Cloudflare
    - cloudflare
    - Worker
    - worker
    - wrangler
    - miniflare
    - DurableObject
    - R2
    - D1
    - KV
    - env.
  structural_signals:
    - export_default_fetch_handler
    - wrangler_toml_config
    - durable_object_class
source:
  origin: file
  path: cloud-cloudflare-workers-durable-objects-r2-d1.md
  hash: "sha256:0da2c9b3cd4898b6bd80b9195b062c28a34b4a5ec4eaae712a92189b1c7530c6"
---
# Cloudflare Workers, Durable Objects, R2, and D1

## When This Activates

Activates on diffs involving Cloudflare Worker handlers, wrangler.toml configuration, Durable Object classes, or code using KV, R2, or D1 bindings. Workers run at the edge with strict CPU time limits (10ms on free plan, 50ms on paid), a subrequest cap, and no persistent filesystem. KV is eventually consistent (reads may return stale data for up to 60 seconds), Durable Objects provide strong consistency but require the alarm() API for scheduling, R2 is S3-compatible but lacks some features, and D1 is SQLite with inherent limitations. This reviewer detects diff-visible signals of edge computing pitfalls specific to the Cloudflare platform.

## Audit Surface

- [ ] KV get() followed by conditional put() assuming strong consistency
- [ ] Durable Object using setTimeout instead of alarm() for scheduling
- [ ] R2 put() piping full request body through Worker
- [ ] D1 query with JOIN on tables expected to exceed 10K rows
- [ ] Secret or API key in wrangler.toml vars section
- [ ] Worker endpoint without rate limiting
- [ ] Worker with CPU-intensive synchronous operation
- [ ] Worker making excessive subrequests without batching
- [ ] KV keys without namespace or prefix convention
- [ ] Durable Object state in class fields without storage API
- [ ] Missing error handling for KV/R2/D1 operations
- [ ] Worker throwing errors without proper HTTP error responses

## Detailed Checks

### KV Consistency Model
<!-- activation: keywords=["KV", "kv", "get", "put", "getWithMetadata", "list", "delete", "namespace"] -->

- [ ] **Read-after-write assumption**: flag patterns where KV.get() immediately after KV.put() assumes the new value is returned -- KV is eventually consistent with up to 60-second propagation; use Durable Objects if strong consistency is required
- [ ] **Compare-and-swap with KV**: flag get-then-conditionally-put patterns used for counters, locks, or deduplication -- KV does not support atomic compare-and-swap; use Durable Objects for coordinated state
- [ ] **Missing key naming convention**: flag KV keys without a namespace prefix or structured naming pattern -- flat key spaces cause collisions across features and make debugging difficult
- [ ] **KV for high-write workloads**: flag use of KV for data written more than once per second per key -- KV is optimized for read-heavy workloads; writes may be lost under contention

### Durable Objects Patterns
<!-- activation: keywords=["DurableObject", "DurableObjectState", "alarm", "storage", "state", "blockConcurrencyWhile"] -->

- [ ] **State in class fields only**: flag Durable Objects storing state in instance variables without persisting to this.state.storage -- class fields are lost when the object is evicted from memory
- [ ] **setTimeout for scheduling**: flag Durable Objects using setTimeout or setInterval -- these are unreliable in Workers; use this.state.storage.setAlarm() for durable scheduling
- [ ] **Missing blockConcurrencyWhile**: flag Durable Object constructor or alarm handler not using blockConcurrencyWhile() for initialization -- without it, concurrent requests may see uninitialized state
- [ ] **Unbounded storage growth**: flag Durable Objects that write to storage without evidence of cleanup or TTL logic -- storage is billed per GB and objects persist indefinitely

### R2 and D1 Limitations
<!-- activation: keywords=["R2", "r2", "D1", "d1", "put", "get", "presigned", "SQL", "SELECT", "JOIN", "INSERT"] -->

- [ ] **Large uploads through Worker**: flag R2.put() where the entire request body flows through the Worker -- for uploads larger than a few MB, use presigned URLs to upload directly to R2 from the client
- [ ] **D1 large JOIN queries**: flag D1 queries with JOIN on tables expected to grow beyond 10K rows -- D1 is SQLite-based without query optimizer hints; large JOINs cause full table scans and CPU limit exceedance
- [ ] **D1 without WAL mode awareness**: flag D1 usage assuming concurrent write support -- D1 has single-writer semantics; concurrent writes queue and may timeout
- [ ] **Missing R2 multipart for large objects**: flag single-part R2 uploads for objects larger than 100MB -- use multipart upload API for reliability and resumability

### CPU and Subrequest Limits
<!-- activation: keywords=["cpu", "time", "subrequest", "fetch", "limit", "crypto", "JSON.parse", "JSON.stringify"] -->

- [ ] **CPU-intensive synchronous code**: flag Workers performing heavy JSON parsing, cryptographic operations, or string manipulation in a synchronous loop -- Workers have strict CPU time limits; offload to Durable Objects or use streaming
- [ ] **Excessive subrequests**: flag Workers making more than 50 fetch() calls (free) or approaching 1000 (paid) without batching or early termination -- exceeding the limit causes runtime errors
- [ ] **Missing subrequest error handling**: flag fetch() calls without try/catch or response status checking -- subrequests can fail due to limits, network errors, or upstream issues
- [ ] **Large response construction**: flag Workers constructing large response bodies (>100MB) in memory -- stream responses using TransformStream or ReadableStream

### Secrets and Configuration
<!-- activation: keywords=["wrangler.toml", "vars", "secret", "API_KEY", "TOKEN", "PASSWORD", "env."] -->

- [ ] **Secret in wrangler.toml**: flag API keys, tokens, or passwords in the [vars] section of wrangler.toml -- use `wrangler secret put` to store secrets encrypted, not in plaintext config
- [ ] **Missing .dev.vars in .gitignore**: flag .dev.vars file (local development secrets) not in .gitignore -- this file contains local secrets and should never be committed
- [ ] **Env binding without type safety**: flag direct access to env.BINDING_NAME without type checking -- bindings may be undefined if not configured; add TypeScript types and runtime checks

## Common False Positives

- **KV for configuration/feature flags**: KV eventual consistency is acceptable for configuration data and feature flags that tolerate seconds of staleness.
- **Small D1 tables with JOINs**: JOINs on D1 tables with fewer than 10K rows perform well within SQLite's capabilities.
- **R2 put for small objects**: piping small objects (<1MB) through the Worker to R2 is normal and efficient.
- **Workers using crypto.subtle for auth**: short cryptographic operations (JWT verification, HMAC) fit within CPU limits; flag only when used in loops or on large payloads.

## Severity Guidance

| Finding | Severity |
|---|---|
| Secret or API key committed in wrangler.toml | Critical |
| KV used for compare-and-swap or distributed locking | Critical |
| Durable Object state only in class fields (no storage API) | Important |
| CPU-intensive synchronous operation exceeding time limit | Important |
| R2 large upload piped through Worker without presigned URL | Important |
| D1 JOIN on tables exceeding 10K rows | Important |
| KV read-after-write assuming strong consistency | Important |
| Missing subrequest error handling | Minor |
| KV keys without naming convention | Minor |
| Worker throwing instead of returning error response | Minor |

## See Also

- `arch-serverless` -- general serverless patterns applicable to edge functions
- `sec-secrets-management-and-rotation` -- secret management best practices
- `sec-owasp-a05-misconfiguration` -- misconfiguration patterns including exposed secrets

## Authoritative References

- [Cloudflare, "Workers KV"](https://developers.cloudflare.com/kv/)
- [Cloudflare, "Durable Objects"](https://developers.cloudflare.com/durable-objects/)
- [Cloudflare, "R2"](https://developers.cloudflare.com/r2/)
- [Cloudflare, "D1"](https://developers.cloudflare.com/d1/)
- [Cloudflare, "Workers Limits"](https://developers.cloudflare.com/workers/platform/limits/)
