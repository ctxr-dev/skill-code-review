---
id: micro-css
type: index
depth_role: subcategory
depth: 1
focus: "!important overuse via Tailwind's important config or manual !important; Alias misconfiguration causing duplicate module instances in the bundle; Arbitrary values used instead of extending the theme; Barrel file re-exports defeating tree shaking in bundlers"
parents:
  - "../index.md"
shared_covers: []
entries:
  - id: arch-micro-frontends-module-federation
    file: arch-micro-frontends-module-federation.md
    type: primary
    focus: Detect shared state between micro-frontends, version conflicts, CSS leaking across boundaries, and performance overhead from multiple bundles
    tags:
      - micro-frontends
      - module-federation
      - CSS-isolation
      - shared-state
      - performance
      - architecture
  - id: fe-build-esbuild-turbopack
    file: fe-build-esbuild-turbopack.md
    type: primary
    focus: "Detect esbuild and Turbopack configuration gaps around minification, target mismatch, missing polyfills, and dev/prod parity issues."
    tags:
      - esbuild
      - turbopack
      - build
      - bundler
      - transpilation
      - frontend
  - id: fe-build-vite
    file: fe-build-vite.md
    type: primary
    focus: Detect Vite build misconfigurations that leak dev-only code into production, bloat bundles, expose environment variables, or degrade load performance.
    tags:
      - vite
      - build
      - bundler
      - rollup
      - frontend
      - env-variables
  - id: fe-build-webpack
    file: fe-build-webpack.md
    type: primary
    focus: Detect webpack misconfigurations that ship dev-mode bundles to production, miss code splitting opportunities, or produce undebuggable builds.
    tags:
      - webpack
      - build
      - bundler
      - code-splitting
      - tree-shaking
      - frontend
  - id: fe-bundle-analysis-tree-shaking
    file: fe-bundle-analysis-tree-shaking.md
    type: primary
    focus: Detect patterns that defeat tree shaking, bloat bundles, and prevent effective code elimination including barrel file re-exports, side-effect-ful modules, and dynamic import misuse.
    tags:
      - tree-shaking
      - bundle-size
      - dead-code
      - barrel-files
      - code-splitting
      - performance
      - frontend
  - id: fe-css-tailwind
    file: fe-css-tailwind.md
    type: primary
    focus: Detect Tailwind CSS misconfigurations that bloat production CSS, break design consistency, or create maintainability issues from utility class misuse.
    tags:
      - tailwind
      - css
      - utility-css
      - purge
      - design-tokens
      - frontend
  - id: fe-image-font-optimization
    file: fe-image-font-optimization.md
    type: primary
    focus: "Detect unoptimized images, missing lazy loading, font loading issues (FOIT/FOUT), excessive font weights, and missing preload for critical assets that degrade LCP and CLS."
    tags:
      - images
      - fonts
      - optimization
      - lazy-loading
      - webp
      - avif
      - preload
      - performance
      - frontend
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Micro Css

**Focus:** !important overuse via Tailwind's important config or manual !important; Alias misconfiguration causing duplicate module instances in the bundle; Arbitrary values used instead of extending the theme; Barrel file re-exports defeating tree shaking in bundlers

## Children

| File | Type | Focus |
|------|------|-------|
| [arch-micro-frontends-module-federation.md](arch-micro-frontends-module-federation.md) | 📄 primary | Detect shared state between micro-frontends, version conflicts, CSS leaking across boundaries, and performance overhead from multiple bundles |
| [fe-build-esbuild-turbopack.md](fe-build-esbuild-turbopack.md) | 📄 primary | Detect esbuild and Turbopack configuration gaps around minification, target mismatch, missing polyfills, and dev/prod parity issues. |
| [fe-build-vite.md](fe-build-vite.md) | 📄 primary | Detect Vite build misconfigurations that leak dev-only code into production, bloat bundles, expose environment variables, or degrade load performance. |
| [fe-build-webpack.md](fe-build-webpack.md) | 📄 primary | Detect webpack misconfigurations that ship dev-mode bundles to production, miss code splitting opportunities, or produce undebuggable builds. |
| [fe-bundle-analysis-tree-shaking.md](fe-bundle-analysis-tree-shaking.md) | 📄 primary | Detect patterns that defeat tree shaking, bloat bundles, and prevent effective code elimination including barrel file re-exports, side-effect-ful modules, and dynamic import misuse. |
| [fe-css-tailwind.md](fe-css-tailwind.md) | 📄 primary | Detect Tailwind CSS misconfigurations that bloat production CSS, break design consistency, or create maintainability issues from utility class misuse. |
| [fe-image-font-optimization.md](fe-image-font-optimization.md) | 📄 primary | Detect unoptimized images, missing lazy loading, font loading issues (FOIT/FOUT), excessive font weights, and missing preload for critical assets that degrade LCP and CLS. |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
