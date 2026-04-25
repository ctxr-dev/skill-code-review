---
id: edge-runtimes-deno-bun-node
type: primary
depth_role: leaf
focus: "Detect runtime-incompatible APIs, overbroad permissions, cold-start blindspots, and unpinned deps across Deno, Bun, and Node.js (including edge/isolate deployments)"
parents:
  - index.md
covers:
  - "Node-only APIs used in Deno or browser/edge isolate runtimes"
  - "Deno permission flags granted too broadly (--allow-all, --allow-net with no host list)"
  - "Bun API divergence from Node (not all fs/child_process/crypto work identically)"
  - "Cold start cost ignored when deploying to edge isolates (Workers, Deno Deploy, Netlify Edge)"
  - "Missing per-request timeout / abort handling in long-running or fetch paths"
  - "Edge isolate memory/CPU limits exceeded by unbounded in-memory state"
  - "Third-party deps imported from git or raw URL without a pinned ref/integrity hash"
  - Deno.env access without an explicit --allow-env allowlist in production
  - "Bun.serve performance assumptions (fetch-per-request semantics, streaming body)"
  - "Shared globals / module state in a runtime that reuses isolates across requests"
tags:
  - deno
  - bun
  - node
  - edge-runtime
  - isolate
  - v8
  - workers
  - deno-deploy
  - cold-start
  - permissions
activation:
  file_globs:
    - "**/*.ts"
    - "**/*.tsx"
    - "**/*.js"
    - "**/*.mjs"
    - "**/*.cjs"
    - "**/deno.json"
    - "**/deno.jsonc"
    - "**/import_map.json"
    - "**/bunfig.toml"
    - "**/package.json"
    - "**/wrangler.toml"
    - "**/netlify.toml"
  keyword_matches:
    - Deno
    - deno.land
    - Bun
    - bun
    - Node.js
    - node
    - edge runtime
    - isolate
    - V8
    - Worker
    - Deno Deploy
    - bunx
    - Deno.serve
    - Bun.serve
    - Deno.env
    - process.env
    - wrangler
    - EdgeRuntime
    - export const runtime
  structural_signals:
    - deno_permission_flags
    - bun_specific_api_usage
    - edge_runtime_export
    - import_map_declaration
    - node_builtin_import
source:
  origin: file
  path: edge-runtimes-deno-bun-node.md
  hash: "sha256:80840aaec072090fc9db3335c2e4305c144eb5a932d43df0d9464d32e76f40f0"
---
# Edge Runtimes: Deno, Bun, Node.js

## When This Activates

Activates on diffs in JavaScript/TypeScript codebases that target Deno, Bun, or edge/isolate deployments (Cloudflare Workers, Deno Deploy, Vercel/Netlify Edge, AWS Lambda@Edge). The three runtimes are *mostly* compatible, but differ in permissions model (Deno), API surface (Bun claims Node compat but has gaps), cold-start cost (edge isolates), and state lifetime (isolate reuse vs fresh process). This reviewer catches the portability and deployment-model mistakes that don't surface until production.

## Audit Surface

- [ ] Code uses Node-only APIs (`fs`, `child_process`, `cluster`, `net`, `tls`, `dgram`, `worker_threads`) in an edge-runtime entrypoint
- [ ] Deno task/deploy runs with `--allow-all` or `--allow-net` without host narrowing
- [ ] `Deno.env.get` called without a documented `--allow-env` list
- [ ] Bun-specific API (`Bun.serve`, `Bun.file`, `Bun.spawn`, `bun:sqlite`) used with Node fallback assumption
- [ ] Import specifier points at raw GitHub/jsdelivr URL without pinned commit/tag
- [ ] `import_map.json` or `deno.json` references mutable tags (`main`, `latest`)
- [ ] Edge handler keeps per-request state in module scope
- [ ] Top-level await performs network/disk I/O -- runs every cold start
- [ ] Request handler lacks `AbortSignal` propagation to downstream fetch / DB
- [ ] No timeout on outbound fetch in an isolate with a CPU quota
- [ ] Edge deploy uses Node built-ins (`Buffer`, `process.env`, `setImmediate`) without polyfill check
- [ ] Bundle size for edge deploy not checked
- [ ] Crypto uses Node `crypto` instead of Web Crypto in edge
- [ ] Streaming response built with Node `Readable` instead of `ReadableStream` in edge
- [ ] `Deno.serve` / `Bun.serve` hostname defaults to `0.0.0.0` in dev configs
- [ ] Runtime feature-detected at import time without fallback
- [ ] `process.exit` / `Deno.exit` used inside request path
- [ ] Edge platform secrets accessed via `process.env` when runtime exposes a scoped API

## Detailed Checks

### Runtime API Compatibility
<!-- activation: keywords=["import 'fs'", "require('fs')", "child_process", "worker_threads", "cluster", "dgram", "net.Socket", "tls.Socket", "Buffer", "process.", "__dirname", "__filename"] -->

- [ ] **Node built-ins in edge handler**: flag `import 'fs'`, `import 'child_process'`, `import 'net'`, `import 'tls'`, `worker_threads`, `cluster`, `dgram` inside files declared as edge runtime (`export const runtime = 'edge'`, Cloudflare Workers, Deno Deploy) -- these APIs do not exist in V8 isolates. Use Web APIs (`fetch`, `Request`, `Response`, `ReadableStream`) or platform-specific bindings.
- [ ] **Node `crypto` in edge**: flag `createHash`, `createHmac`, `randomBytes`, `pbkdf2Sync` in edge code -- use `globalThis.crypto.subtle` and `crypto.getRandomValues`. Node's `crypto` module is not available in Workers or Deno Deploy without a polyfill.
- [ ] **Node `Buffer` in edge**: flag `Buffer.from`, `Buffer.alloc` in edge -- use `Uint8Array` and `TextEncoder`/`TextDecoder`. Some edge runtimes polyfill `Buffer` partially; relying on it is non-portable.
- [ ] **`process.env` in Deno/edge**: flag `process.env.X` in Deno code -- use `Deno.env.get("X")`. In Cloudflare Workers, use the bound `env` argument; in Deno Deploy, `Deno.env.get` (requires `--allow-env`).
- [ ] **`__dirname` / `__filename` in ESM or edge**: flag these CJS globals in ESM or edge entrypoints -- use `import.meta.url` and `new URL(...)` resolution.

### Bun Compatibility Claims
<!-- activation: keywords=["Bun.serve", "Bun.file", "Bun.spawn", "Bun.write", "Bun.env", "bun:sqlite", "bun:test", "bunfig", "bun install"] -->

- [ ] **Assuming full Node compat**: flag code using Node APIs in a Bun-first file without verifying Bun compatibility -- Bun targets Node compat but has known gaps (`vm` module, some `fs.promises` edge cases, `http2`, `tls` options). Verify with the Bun compat tracker for each Node API in hot paths.
- [ ] **Bun-specific APIs with Node fallback assumption**: flag `Bun.serve`, `Bun.file`, `Bun.spawn` used in code that may also be run with Node (e.g. tests via `node`) without runtime guards -- wrap in `typeof Bun !== 'undefined'` checks or keep Bun/Node-specific files separate.
- [ ] **Bun.serve() semantics**: flag Bun.serve handlers relying on Node-style `(req, res)` -- Bun.serve uses Web `fetch(req: Request) => Response`. Also flag assumptions that `req.body` is a Node `Readable`; it is a Web `ReadableStream`.
- [ ] **bun:sqlite drift from better-sqlite3**: flag `bun:sqlite` used where `better-sqlite3` semantics are assumed -- the APIs are similar but transactions, prepared statement caching, and errors differ.

### Deno Permissions Model
<!-- activation: keywords=["--allow-all", "--allow-net", "--allow-read", "--allow-write", "--allow-env", "--allow-run", "--allow-sys", "--allow-ffi", "Deno.permissions", "deno run", "deno task"] -->

- [ ] **--allow-all in production**: flag any `deno run --allow-all` or `"permissions": "all"` in deno.json for production tasks -- defeats Deno's capability model. List required permissions narrowly.
- [ ] **--allow-net without host list**: flag `--allow-net` with no argument -- grant `--allow-net=api.example.com,db.internal:5432` scoped to needed hosts.
- [ ] **--allow-read broader than needed**: flag `--allow-read` (no path) -- scope to specific directories. Equivalent for `--allow-write`.
- [ ] **--allow-env with no list**: flag `--allow-env` without arguments -- list the env vars the program needs. Otherwise any leaked env entry (CI secrets, cloud metadata env) is accessible.
- [ ] **`Deno.permissions.request` at runtime**: flag runtime permission prompts in non-interactive deploys -- fail closed; grant at startup via flags.

### Edge Isolate Lifecycle and State
<!-- activation: keywords=["export const runtime = 'edge'", "export const config", "caches.default", "globalThis", "let ", "const ", "new Map", "new Set", "top-level", "isolate"] -->

- [ ] **Per-request state in module scope**: flag mutable module-scope `Map`/`Set`/arrays used as caches in edge code -- isolates are reused across requests and between tenants on some platforms; cross-request leakage is a correctness and security bug. Put state in the request-scoped context or use platform KV/Durable Objects.
- [ ] **Top-level await doing I/O**: flag `await fetch(...)` or `await db.connect()` at module top level in edge code -- this runs on every cold start, multiplying latency. Lazy-initialize inside the handler.
- [ ] **Singletons assuming process-lifetime init**: flag singleton patterns that initialize once and reuse forever -- isolate recycling breaks the assumption. Use `globalThis` caching with explicit re-init tolerance.
- [ ] **Large bundles**: flag imports that pull in Node polyfills or large libs (moment, lodash full) in edge code -- cold start latency grows with bundle bytes. Enforce a bundle-size budget in CI.

### Cold Start and Timeouts
<!-- activation: keywords=["AbortController", "AbortSignal", "signal:", "setTimeout", "fetch(", "context.waitUntil", "waitUntil", "executionCtx"] -->

- [ ] **Outbound fetch without AbortSignal**: flag `fetch(url)` inside request handlers without an `AbortSignal` connected to the request lifecycle -- a slow downstream burns your CPU quota and can hang the isolate.
- [ ] **No wall-clock timeout on outbound I/O**: flag absent `AbortSignal.timeout(ms)` on outbound fetch in edge handlers -- most edge runtimes enforce a CPU or wall-clock cap; a 30 s downstream delay blows the budget.
- [ ] **Request AbortSignal not propagated**: flag handlers that call downstream services without forwarding `request.signal` -- when the client disconnects, downstream work continues.
- [ ] **`waitUntil` abuse**: flag background work enqueued via `ctx.waitUntil` without a bounded duration -- platforms cap `waitUntil` duration and will kill the task.

### Dependency Pinning and Import Hygiene
<!-- activation: keywords=["https://deno.land", "https://esm.sh", "https://cdn.jsdelivr", "npm:", "jsr:", "import_map", "deno.json", "importMap", "bundle"] -->

- [ ] **Unpinned URL imports**: flag `https://deno.land/x/foo/mod.ts` without a version -- supply chain risk and non-reproducible builds. Use `@version` or an import map with pinned URLs.
- [ ] **npm:/jsr: without version**: flag `npm:react` or `jsr:@std/fs` without a version specifier -- pin to a semver range or exact version.
- [ ] **Git-based deps without commit ref**: flag `package.json` entries like `"foo": "github:org/repo"` without `#commitsha` -- any push to the branch changes your build.
- [ ] **import_map pointing at mutable tags**: flag entries resolving to `main`, `latest`, or a branch name -- treat as an unpinned import.

### Web-Standards-First APIs
<!-- activation: keywords=["ReadableStream", "WritableStream", "TransformStream", "Response", "Request", "Headers", "FormData", "URL", "URLSearchParams"] -->

- [ ] **Node streams in edge response**: flag returning a Node `Readable` where a Web `ReadableStream` is expected (Deno.serve, Bun.serve, Next.js edge, Workers) -- construct a `ReadableStream` or convert explicitly.
- [ ] **FormData / multipart via Node libraries**: flag `busboy` / `formidable` in edge code -- use `request.formData()`.
- [ ] **URL parsing inconsistencies**: flag reliance on Node-specific URL parsing quirks (deprecated `url.parse`) -- use `new URL(...)`. Web standard across runtimes.

## Common False Positives

- **Node-only server code**: if the file is clearly Node-only (e.g. `server/index.ts` with `import 'express'` and deployed to a Node runtime), `fs`/`child_process` usage is fine. Flag only when the file is edge-deployable.
- **Polyfill packages**: some edge platforms ship `Buffer`/`process` polyfills (Vercel edge, Next.js). If the project explicitly enables these polyfills, the finding is informational.
- **Monorepos with shared code**: a shared utility file used by both Node and edge must stay within the intersection, but a Node-only file can use Node APIs freely. Check target via `export const runtime` or file path conventions.
- **Pinned via lockfile**: if the project uses a lockfile (`deno.lock`, `bun.lockb`, `package-lock.json`), URL imports without versions are still pinned at install time. Flag if the lockfile is missing or gitignored.
- **Dev-only `--allow-all`**: Deno tasks that run only in local dev (`deno task dev`) can grant broad permissions -- scope to production tasks.

## Severity Guidance

| Finding | Severity |
|---|---|
| Node `fs` / `child_process` / `net` in edge runtime entrypoint | Critical |
| `--allow-all` in production deploy task | Critical |
| Per-request state in module scope leaking across tenants on isolate reuse | Critical |
| Outbound fetch without AbortSignal in edge handler | Critical |
| Unpinned URL import or git dep without commit ref | Important |
| Node `crypto` / `Buffer` in edge code without polyfill declared | Important |
| Top-level await performing I/O at module init | Important |
| Bun-specific API in code intended to run on Node | Important |
| `--allow-net` / `--allow-read` / `--allow-env` without host/path/var list | Important |
| `process.exit` / `Deno.exit` inside a request handler | Important |
| AbortSignal not propagated to downstream | Important |
| Large bundle inflates cold-start latency | Minor |
| `Deno.serve` / `Bun.serve` binding `0.0.0.0` in dev config | Minor |
| Node `Readable` in response where `ReadableStream` is canonical | Minor |
| Runtime feature detection without fallback path (but single target) | Minor |

## See Also

- `sec-owasp-a05-misconfiguration` -- permissions and bundle hygiene are misconfiguration
- `sec-owasp-a10-ssrf` -- fetch-in-handler without allowlisting is an SSRF vector
- `sec-secrets-management-and-rotation` -- `process.env` vs runtime-scoped secrets API
- `perf-network-io` -- outbound I/O budget in isolates
- `reliability-backpressure` -- isolate reuse and queue depth interact
- `api-async-event` -- AbortSignal propagation patterns

## Authoritative References

- [Deno Permissions](https://docs.deno.com/runtime/fundamentals/security/)
- [Deno Deploy Limits](https://docs.deno.com/deploy/manual/pricing-and-limits)
- [Bun Node Compatibility](https://bun.sh/docs/runtime/nodejs-apis)
- [Bun.serve API](https://bun.sh/docs/api/http)
- [Cloudflare Workers Runtime APIs](https://developers.cloudflare.com/workers/runtime-apis/)
- [Vercel Edge Runtime](https://vercel.com/docs/functions/runtimes/edge)
- [Web Crypto API](https://developer.mozilla.org/docs/Web/API/Web_Crypto_API)
- [AbortSignal.timeout](https://developer.mozilla.org/docs/Web/API/AbortSignal/timeout_static)
