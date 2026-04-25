---
id: fe-build-vite
type: primary
depth_role: leaf
focus: Detect Vite build misconfigurations that leak dev-only code into production, bloat bundles, expose environment variables, or degrade load performance.
parents:
  - index.md
covers:
  - Missing manual chunk splitting causing a single monolithic vendor bundle
  - "Dev-only plugins (e.g., vite-plugin-inspect) included in production build"
  - Alias misconfiguration causing duplicate module instances in the bundle
  - VITE_ prefixed env variables leaking secrets to the client
  - Missing build.target causing modern-only output without polyfills
  - Rollup options not configured for optimal chunk granularity
  - Missing build.sourcemap configuration for debugging production issues
  - CSS code-split disabled causing large blocking stylesheets
  - SSR externals not configured causing server bundle bloat
  - Pre-bundling misconfiguration slowing dev server cold starts
tags:
  - vite
  - build
  - bundler
  - rollup
  - frontend
  - env-variables
activation:
  file_globs:
    - "**/vite.config.*"
    - "**/vitest.config.*"
    - "**/.env*"
  keyword_matches:
    - import.meta.env
    - defineConfig
    - vite
    - rollupOptions
    - manualChunks
    - VITE_
  structural_signals:
    - vite config without chunk splitting
    - dev plugin in production
    - env variable exposure
source:
  origin: file
  path: fe-build-vite.md
  hash: "sha256:756b77eefc0549968c824363cd90939aa3cd73506c15d54572ea90331d90725e"
---
# Vite Build Configuration Pitfalls

## When This Activates

Activates when diffs touch Vite configuration files, environment variable files, or code using `import.meta.env`. Vite's zero-config defaults work well for small projects but silently produce suboptimal builds at scale -- a single vendor chunk exceeding 500 KB, dev plugins leaking into production, or VITE_ prefixed secrets embedded in client bundles. This reviewer catches build configuration gaps before they reach production.

## Audit Surface

- [ ] vite.config with no build.rollupOptions.output.manualChunks defined
- [ ] Plugin array containing dev-only plugins without conditional loading guarded by mode or command
- [ ] resolve.alias pointing two paths to the same package causing duplicate instances
- [ ] import.meta.env.VITE_ variable containing API keys, tokens, or database URLs
- [ ] build.target set to 'esnext' without confirming browser support matrix
- [ ] build.sourcemap set to false in production with no external source-map upload
- [ ] build.cssCodeSplit set to false without justification
- [ ] ssr.external and ssr.noExternal not configured for SSR builds
- [ ] optimizeDeps.include or .exclude misconfigured causing CJS/ESM interop failures
- [ ] define config leaking process.env values that contain secrets
- [ ] Missing build.assetsInlineLimit tuning for small asset inlining
- [ ] Large static assets in public/ directory not served via CDN

## Detailed Checks

### Chunk Splitting and Bundle Size
<!-- activation: keywords=["manualChunks", "rollupOptions", "output", "vendor", "chunk"] -->

- [ ] **No manual chunks**: flag vite.config where build.rollupOptions.output.manualChunks is absent and the project imports 3+ large dependencies (react, lodash, moment, etc.) -- Vite bundles all vendor code into a single chunk by default, defeating parallel loading and caching
- [ ] **Overly aggressive splitting**: flag manualChunks that creates 20+ tiny chunks under 10 KB -- HTTP/2 multiplexing helps but each chunk still has overhead; group related small modules
- [ ] **Dynamic import without chunk name**: flag `import('./heavy.js')` without `/* webpackChunkName */` or Rollup naming -- unnamed chunks produce hashed filenames that are hard to audit in bundle analysis

### Dev-Only Plugins in Production
<!-- activation: keywords=["plugin", "vite-plugin", "mode", "command", "serve", "build"] -->

- [ ] **Unconditional dev plugin**: flag plugin arrays that include dev-only plugins (vite-plugin-inspect, vite-plugin-checker in non-build mode, vite-plugin-react-swc with fastRefresh) without `mode === 'development'` or `command === 'serve'` guards -- these add overhead to production builds
- [ ] **Missing conditional loading pattern**: flag `defineConfig({})` that does not use the `({ mode, command })` function form when dev-only plugins are present -- the object form cannot conditionally exclude plugins

### Environment Variable Security
<!-- activation: keywords=["VITE_", "import.meta.env", "define", "process.env", ".env"] -->

- [ ] **Secret in VITE_ variable**: flag `.env` or `.env.production` files where VITE_prefixed variables contain values that look like secrets (API keys, tokens, passwords, connection strings) -- VITE_ variables are embedded in the client bundle and visible to anyone; see `sec-xss-dom` for client-side data exposure
- [ ] **process.env leak via define**: flag `define: { 'process.env': ... }` that serializes the entire process.env object into the client bundle -- use explicit allowlisted keys instead
- [ ] **Missing .env.example**: flag projects with .env files but no .env.example documenting which variables are required -- new developers may miss required VITE_ variables

### Alias and Module Resolution
<!-- activation: keywords=["resolve.alias", "alias", "dedupe", "optimizeDeps"] -->

- [ ] **Duplicate module from alias**: flag resolve.alias entries that create a second resolution path for a package already in node_modules -- this causes two copies of the module in the bundle (e.g., two React instances breaking hooks)
- [ ] **Missing resolve.dedupe**: flag projects using monorepos or workspaces without resolve.dedupe for shared dependencies -- hoisting inconsistencies cause duplicate packages
- [ ] **optimizeDeps misconfiguration**: flag optimizeDeps.exclude for packages that use CJS internally -- excluded CJS packages fail ESM import at runtime in the browser

### Build Target and Polyfills
<!-- activation: keywords=["target", "build.target", "browserslist", "esbuild", "polyfill"] -->

- [ ] **esnext without support verification**: flag build.target set to 'esnext' on user-facing applications without a documented browser support matrix -- esnext output uses the latest syntax which may fail on older browsers
- [ ] **Missing @vitejs/plugin-legacy**: flag applications that must support browsers older than 2 years without @vitejs/plugin-legacy -- Vite's esbuild transpilation does not inject polyfills for missing APIs
- [ ] **Conflicting targets**: flag build.target and esbuild.target set to different values -- these control different stages and mismatches produce unexpected output

## Common False Positives

- **Small projects without manualChunks**: projects with a single-page app under 200 KB total do not benefit from chunk splitting; do not flag if total bundle is small.
- **Internal tools with known browser targets**: build.target set to 'esnext' is acceptable for Electron apps or internal tools with controlled environments.
- **VITE_PUBLIC_ variables**: variables intentionally public (e.g., VITE_PUBLIC_APP_NAME, VITE_PUBLIC_API_BASE_URL pointing to a public API) are not secrets.
- **Plugin-inspect in CI**: vite-plugin-inspect enabled only in CI for build analysis is acceptable.

## Severity Guidance

| Finding | Severity |
|---|---|
| Secret API key or token in VITE_ environment variable | Critical |
| process.env serialized into client bundle via define | Critical |
| Dev-only plugin included in production build | Important |
| No manual chunk splitting with vendor bundle > 500 KB | Important |
| Duplicate module instances from alias misconfiguration | Important |
| build.target 'esnext' on public-facing app without legacy plugin | Important |
| Missing source maps for production debugging | Minor |
| CSS code split disabled without justification | Minor |
| Missing .env.example file | Minor |

## See Also

- `fe-bundle-analysis-tree-shaking` -- chunk splitting interacts with tree shaking and barrel file re-exports
- `fe-build-esbuild-turbopack` -- Vite uses esbuild internally; esbuild target constraints apply
- `sec-xss-dom` -- client-side env variable exposure creates data leak vectors
- `perf-startup-cold-start` -- chunk splitting directly affects cold-start loading performance
- `fw-react` -- React-specific Vite plugins (vite-plugin-react) have configuration pitfalls

## Authoritative References

- [Vite Documentation -- "Building for Production"](https://vitejs.dev/guide/build.html)
- [Vite Documentation -- "Env Variables and Modes"](https://vitejs.dev/guide/env-and-mode.html)
- [Rollup Documentation -- "Output Options"](https://rollupjs.org/configuration-options/#output-manualchunks)
- [Vite Documentation -- "Server-Side Rendering"](https://vitejs.dev/guide/ssr.html)
