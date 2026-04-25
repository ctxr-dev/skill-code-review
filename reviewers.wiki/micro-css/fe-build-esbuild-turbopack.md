---
id: fe-build-esbuild-turbopack
type: primary
depth_role: leaf
focus: "Detect esbuild and Turbopack configuration gaps around minification, target mismatch, missing polyfills, and dev/prod parity issues."
parents:
  - index.md
covers:
  - Missing minification in esbuild production builds
  - Target mismatch causing syntax errors in older browsers
  - "Missing polyfills for APIs esbuild does not polyfill (e.g., Promise.allSettled, Array.at)"
  - "esbuild used for type checking (it does not perform type checking)"
  - "Turbopack dev/prod parity gaps causing build-only failures"
  - esbuild bundle without external marking for server-side packages
  - Missing source maps in esbuild production output
  - Turbopack-specific loader configuration not matching webpack equivalents
  - esbuild define replacing expressions incorrectly
  - Missing platform setting causing Node built-ins in browser bundles
tags:
  - esbuild
  - turbopack
  - build
  - bundler
  - transpilation
  - frontend
activation:
  file_globs:
    - "**/esbuild.*"
    - "**/build.mjs"
    - "**/build.js"
    - "**/next.config.*"
    - "**/tsconfig.json"
  keyword_matches:
    - esbuild
    - turbopack
    - turbo
    - "require('esbuild')"
    - "from 'esbuild'"
    - "--turbo"
    - buildSync
    - "build("
  structural_signals:
    - esbuild without minification
    - target mismatch with browser support
    - missing tsc type checking step
source:
  origin: file
  path: fe-build-esbuild-turbopack.md
  hash: "sha256:5fdde8d4de765bcc4c48555aa11d217fad84a01f4fd54e1e25640e34a78df2f0"
---
# esbuild and Turbopack Configuration Pitfalls

## When This Activates

Activates when diffs touch esbuild build scripts, Turbopack configuration in Next.js, or build pipelines that use esbuild as a transpiler or bundler. esbuild's speed comes from intentional limitations -- no type checking, no polyfill injection, limited CSS module support -- that become production bugs when not accounted for. Turbopack's webpack-compatible design has parity gaps that surface only in production. This reviewer catches the configuration assumptions that these tools leave to the developer.

## Audit Surface

- [ ] esbuild build() call without minify: true for production output
- [ ] esbuild target set to 'esnext' for browser-facing application
- [ ] Application using APIs not in esbuild's target without runtime polyfills
- [ ] Build pipeline relying on esbuild for type checking (no separate tsc --noEmit step)
- [ ] next dev --turbo used in development but production build uses webpack
- [ ] esbuild bundle without external array for Node.js built-ins in server builds
- [ ] esbuild build without sourcemap option for production debugging
- [ ] Turbopack custom loader config that diverges from webpack config in next.config.js
- [ ] esbuild define with values not wrapped in JSON.stringify
- [ ] esbuild platform not set or set incorrectly (browser vs node)
- [ ] esbuild splitting enabled without format: 'esm' (splitting requires ESM)
- [ ] Turbopack resolveAlias not matching webpack resolve.alias

## Detailed Checks

### Minification and Production Readiness
<!-- activation: keywords=["minify", "build(", "buildSync", "bundle", "outdir", "outfile"] -->

- [ ] **Missing minification**: flag esbuild build() or buildSync() calls used for production output where `minify: true` (or individual minifyWhitespace, minifySyntax, minifyIdentifiers) is not set -- esbuild does not minify by default, unlike webpack in production mode
- [ ] **Missing source maps**: flag production esbuild builds without `sourcemap: true` or `sourcemap: 'external'` -- errors in minified code become impossible to trace
- [ ] **Missing legal comments handling**: flag production builds without `legalComments: 'none'` or `legalComments: 'external'` -- license comments bloat minified output

### Target and Polyfills
<!-- activation: keywords=["target", "esnext", "es2020", "chrome", "firefox", "safari", "polyfill", "core-js"] -->

- [ ] **esnext target on browser app**: flag esbuild target set to 'esnext' or not set (defaults to esnext) for code delivered to browsers -- esnext emits the latest syntax which fails on browsers more than 1-2 years old
- [ ] **Missing polyfills**: flag application code using APIs like `Promise.allSettled`, `Array.at`, `Object.hasOwn`, `structuredClone`, or `AbortSignal.timeout` without a polyfill when targeting browsers older than the API's introduction -- esbuild only transpiles syntax, never polyfills runtime APIs
- [ ] **Target mismatch between tools**: flag projects where esbuild target, tsconfig target, and browserslist specify different minimum environments -- downstream tools may re-transpile or miss necessary transforms

### Type Checking Gap
<!-- activation: keywords=["tsc", "typescript", "type-check", "noEmit", "tsconfig", ".ts", ".tsx"] -->

- [ ] **No type checking in pipeline**: flag TypeScript projects using esbuild for compilation where the CI pipeline has no `tsc --noEmit` step -- esbuild strips type annotations without checking them; type errors ship silently
- [ ] **tsconfig not aligned**: flag esbuild builds where tsconfig.json strict settings differ from what esbuild assumes -- esbuild ignores most tsconfig options; mismatches between tsc and esbuild output cause subtle bugs

### Turbopack Dev/Prod Parity
<!-- activation: keywords=["turbopack", "--turbo", "next dev", "next build", "experimental.turbo"] -->

- [ ] **Dev-only Turbopack**: flag Next.js projects using `next dev --turbo` but `next build` uses webpack -- features that work in Turbopack dev may break in webpack production builds; test with both; see `fw-nextjs`
- [ ] **Turbopack loader mismatch**: flag next.config.js with experimental.turbo.rules that define loaders differently from the webpack config -- this causes different transformation results between dev and prod
- [ ] **Unsupported Turbopack features**: flag Turbopack configs relying on webpack plugins not yet supported (ModuleFederationPlugin, specific CSS modules features) -- these silently fall back or error in the Turbopack pipeline

### Platform and External Configuration
<!-- activation: keywords=["platform", "external", "node", "browser", "format", "splitting"] -->

- [ ] **Wrong platform**: flag esbuild builds for server-side code without `platform: 'node'` -- browser platform (default) does not polyfill Node built-ins and may bundle them incorrectly
- [ ] **Missing externals for server**: flag esbuild server bundles that do not mark node_modules as external -- bundling server dependencies increases build time and may break native addons
- [ ] **Splitting without ESM**: flag `splitting: true` without `format: 'esm'` -- esbuild code splitting only works with ESM output format; CJS and IIFE formats silently ignore the splitting flag

## Common False Positives

- **esbuild for dev tooling only**: projects using esbuild only for dev server transpilation (not production bundles) do not need minification or polyfill configuration.
- **Known browser target**: target 'esnext' is acceptable for Electron apps, browser extensions with minimum version requirements, or internal tools.
- **Type checking in IDE only**: small projects or prototypes may rely on IDE type checking; flag only for CI pipelines.
- **Turbopack in experimental projects**: early-stage projects knowingly accepting Turbopack instability need not fix all parity gaps.

## Severity Guidance

| Finding | Severity |
|---|---|
| No type checking in CI for TypeScript project | Critical |
| Target 'esnext' on public-facing browser app | Important |
| Missing minification in production esbuild build | Important |
| Missing polyfills for APIs outside target range | Important |
| Turbopack dev/webpack prod parity gap | Important |
| Missing source maps for production | Minor |
| Splitting enabled without ESM format | Minor |
| Missing legal comments handling | Minor |

## See Also

- `fe-build-vite` -- Vite uses esbuild internally for dev transpilation; esbuild target constraints propagate
- `fe-build-webpack` -- Turbopack aims for webpack compatibility; webpack configuration patterns apply
- `fw-nextjs` -- Turbopack is the Next.js dev bundler; Next.js-specific build pitfalls compound
- `fe-bundle-analysis-tree-shaking` -- esbuild tree shaking has different characteristics than webpack/Rollup
- `perf-startup-cold-start` -- missing minification and code splitting directly affect load time

## Authoritative References

- [esbuild Documentation -- "API Reference"](https://esbuild.github.io/api/)
- [esbuild Documentation -- "Content Types"](https://esbuild.github.io/content-types/)
- [Next.js Documentation -- "Turbopack"](https://nextjs.org/docs/architecture/turbopack)
- [TypeScript Documentation -- "Compiler Options"](https://www.typescriptlang.org/tsconfig)
