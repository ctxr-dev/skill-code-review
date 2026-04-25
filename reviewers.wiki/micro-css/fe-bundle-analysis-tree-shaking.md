---
id: fe-bundle-analysis-tree-shaking
type: primary
depth_role: leaf
focus: Detect patterns that defeat tree shaking, bloat bundles, and prevent effective code elimination including barrel file re-exports, side-effect-ful modules, and dynamic import misuse.
parents:
  - index.md
covers:
  - Barrel file re-exports defeating tree shaking in bundlers
  - Modules with side effects not marked in package.json sideEffects field
  - "Dynamic import() misuse preventing static analysis"
  - Large vendor chunks from importing entire libraries
  - Missing bundle analyzer in CI for size regression detection
  - Named re-exports pulling in entire dependency trees
  - CommonJS modules preventing tree shaking
  - Lodash full import instead of per-function import
  - Moment.js locale bundling
  - CSS-in-JS runtime bundled when static extraction is available
tags:
  - tree-shaking
  - bundle-size
  - dead-code
  - barrel-files
  - code-splitting
  - performance
  - frontend
activation:
  file_globs:
    - "**/index.ts"
    - "**/index.js"
    - "**/package.json"
    - "**/webpack.config.*"
    - "**/vite.config.*"
    - "**/rollup.config.*"
  keyword_matches:
    - "export *"
    - "export {"
    - sideEffects
    - "import("
    - "require("
    - lodash
    - moment
    - bundle
    - chunk
  structural_signals:
    - barrel file with many re-exports
    - full library import
    - CJS in ESM codebase
source:
  origin: file
  path: fe-bundle-analysis-tree-shaking.md
  hash: "sha256:2e724f48b358f16e6a81d359725a46430f177d5d02b007d5de9e184fd99ae972"
---
# Bundle Analysis and Tree Shaking Pitfalls

## When This Activates

Activates when diffs touch barrel index files, package.json sideEffects configuration, dynamic imports, or introduce imports from large libraries. Tree shaking is the bundler's ability to eliminate unused code -- but it is easily defeated by barrel files that force evaluation of entire module trees, CJS modules that cannot be statically analyzed, and missing sideEffects hints that prevent the bundler from dropping unused modules. This reviewer catches the patterns that inflate production bundles with dead code.

## Audit Surface

- [ ] index.ts barrel file re-exporting from 10+ modules
- [ ] Import from barrel file using only 1-2 exports from a large module set
- [ ] package.json missing sideEffects field or set to true on tree-shakeable code
- [ ] Module with top-level side effects not listed in sideEffects array
- [ ] Dynamic import() with variable expression preventing static chunk creation
- [ ] import lodash or import _ from 'lodash' instead of per-function import
- [ ] import moment from 'moment' bundling all locales (~300 KB)
- [ ] require() call in ESM codebase preventing tree shaking
- [ ] Vendor chunk exceeding 250 KB without investigation
- [ ] Missing webpack-bundle-analyzer, rollup-plugin-visualizer, or equivalent in CI
- [ ] Re-export of CJS module through ESM barrel defeating dead code elimination
- [ ] CSS-in-JS library runtime included when build-time extraction exists

## Detailed Checks

### Barrel File Re-Exports
<!-- activation: keywords=["export *", "export {", "index.ts", "index.js", "re-export", "barrel"] -->

- [ ] **Large barrel file**: flag index.ts or index.js files that re-export from 10+ modules using `export * from` or named re-exports -- importing one symbol from this barrel forces the bundler to evaluate all re-exported modules to resolve the export, often pulling in the entire dependency subtree
- [ ] **Selective import from barrel**: flag `import { Button } from '@/components'` where @/components/index.ts re-exports 50+ components -- the bundler may include all 50 components depending on the module graph; import directly from `@/components/Button` instead
- [ ] **CJS re-exported through ESM barrel**: flag barrel files that re-export from CommonJS modules -- CJS modules cannot be tree-shaken; the entire CJS module is included even if only one export is used

### sideEffects Configuration
<!-- activation: keywords=["sideEffects", "package.json", "pure", "PURE", "tree-shak"] -->

- [ ] **Missing sideEffects field**: flag package.json without a `sideEffects` field on a library or app that exports tree-shakeable code -- bundlers (webpack, Rollup) treat modules without sideEffects declaration as potentially side-effectful and cannot safely drop them; see `fe-build-webpack`
- [ ] **Side-effectful module not listed**: flag modules with top-level side effects (CSS imports, polyfills, global assignments) that are not included in the sideEffects array -- the bundler may drop them during tree shaking, breaking the application
- [ ] **sideEffects: true on tree-shakeable library**: flag libraries with `sideEffects: true` that contain pure, tree-shakeable exports -- this prevents bundlers from eliminating unused exports

### Large Library Imports
<!-- activation: keywords=["lodash", "moment", "date-fns", "rxjs", "ramda", "antd", "import", "from"] -->

- [ ] **Full lodash import**: flag `import _ from 'lodash'` or `import { debounce } from 'lodash'` (full bundle) instead of `import debounce from 'lodash/debounce'` or `lodash-es` -- the full lodash bundle is ~70 KB minified; per-function imports reduce this to 1-5 KB
- [ ] **Moment.js with all locales**: flag `import moment from 'moment'` without webpack IgnorePlugin or ContextReplacementPlugin for locales -- moment bundles all locales by default (~300 KB); use date-fns or dayjs as lighter alternatives
- [ ] **Full icon library import**: flag `import { Icon } from '@mui/icons-material'` or `import * as Icons from 'lucide-react'` -- import individual icons by path to avoid bundling hundreds of icon components; see `fe-components-shadcn-radix-mui-antd-chakra`

### Dynamic Import Patterns
<!-- activation: keywords=["import(", "lazy", "dynamic", "chunk", "webpackChunkName", "React.lazy"] -->

- [ ] **Variable in import()**: flag `import(variablePath)` where the import specifier is a variable -- the bundler cannot statically determine the module, creating either a catch-all chunk containing every possible match or failing to split at all
- [ ] **Missing chunk naming**: flag dynamic imports without naming hints (webpackChunkName magic comment for webpack, manual naming for Rollup) -- unnamed chunks produce opaque hashed filenames making bundle analysis difficult
- [ ] **Eager dynamic import**: flag `import('./module').then(m => m.default)` executed at module top level -- this negates code splitting since the import resolves immediately; use import() inside event handlers, route handlers, or React.lazy

### Bundle Monitoring in CI
<!-- activation: keywords=["bundle", "analyzer", "ci", "size", "budget", "limit", "regression"] -->

- [ ] **No bundle analyzer**: flag projects without webpack-bundle-analyzer, rollup-plugin-visualizer, or equivalent configured to run in CI -- bundle size regressions go unnoticed until users experience slow loads
- [ ] **No size budget**: flag projects without bundle size limits in CI (bundlesize, size-limit, or Lighthouse performance budget) -- without automated thresholds, large dependencies are added without accountability; see `fe-core-web-vitals-lighthouse`
- [ ] **Large vendor chunk uninvestigated**: flag vendor chunks exceeding 250 KB without documented justification -- investigate with bundle analyzer to identify candidates for dynamic import or replacement with lighter alternatives

## Common False Positives

- **Barrel files in small libraries**: a barrel re-exporting 5 modules where most consumers use all exports is acceptable -- tree shaking overhead is minimal.
- **sideEffects: true for CSS-heavy packages**: packages that rely on CSS imports as side effects correctly set sideEffects to true or list CSS files.
- **Full lodash with babel-plugin-lodash**: projects using babel-plugin-lodash or lodash-webpack-plugin automatically transform full imports to cherry-picked imports.
- **Variable import() in test files**: dynamic imports with variable paths in test utilities (e.g., loading test fixtures) do not affect production bundles.

## Severity Guidance

| Finding | Severity |
|---|---|
| Barrel file pulling 500+ KB of unused code into production | Critical |
| Full moment.js import adding 300 KB to bundle | Important |
| Missing sideEffects field causing failed tree shaking | Important |
| require() in ESM codebase preventing tree shaking | Important |
| No bundle size monitoring in CI | Important |
| Variable in import() preventing static splitting | Minor |
| Missing chunk names in dynamic imports | Minor |
| CSS-in-JS runtime included when extraction exists | Minor |

## See Also

- `fe-build-vite` -- Vite uses Rollup for production; Rollup tree shaking configuration applies
- `fe-build-webpack` -- webpack sideEffects and splitChunks interact with tree shaking
- `fe-build-esbuild-turbopack` -- esbuild tree shaking has different heuristics than webpack/Rollup
- `fe-components-shadcn-radix-mui-antd-chakra` -- component library import patterns affect tree shaking
- `fe-core-web-vitals-lighthouse` -- bundle size directly impacts LCP and performance scores

## Authoritative References

- [Webpack Documentation -- "Tree Shaking"](https://webpack.js.org/guides/tree-shaking/)
- [Rollup Documentation -- "Tree Shaking"](https://rollupjs.org/introduction/#tree-shaking)
- [web.dev -- "Reduce JavaScript Payloads with Tree Shaking"](https://web.dev/articles/reduce-javascript-payloads-with-tree-shaking)
- [Bundlephobia](https://bundlephobia.com/)
- [SemVer Explained -- "sideEffects"](https://webpack.js.org/guides/tree-shaking/#mark-the-file-as-side-effect-free)
