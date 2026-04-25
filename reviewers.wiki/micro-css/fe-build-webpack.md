---
id: fe-build-webpack
type: primary
depth_role: leaf
focus: Detect webpack misconfigurations that ship dev-mode bundles to production, miss code splitting opportunities, or produce undebuggable builds.
parents:
  - index.md
covers:
  - "Missing code splitting via dynamic import() or SplitChunksPlugin"
  - Large bundle without tree shaking due to sideEffects misconfiguration
  - Development mode or devtool in production builds
  - Missing or misconfigured source maps for production debugging
  - Loader misconfiguration causing unnecessary transpilation or missed files
  - DefinePlugin leaking secrets into client bundles
  - Missing TerserPlugin or minification in production
  - Duplicate modules from inconsistent resolve.alias or symlinks
  - Missing contenthash in output filenames breaking long-term caching
  - Bundle analyzer not integrated in CI
tags:
  - webpack
  - build
  - bundler
  - code-splitting
  - tree-shaking
  - frontend
activation:
  file_globs:
    - "**/webpack.config.*"
    - "**/webpack.*.js"
    - "**/webpack.*.ts"
    - "**/.babelrc"
    - "**/babel.config.*"
  keyword_matches:
    - webpack
    - splitChunks
    - DefinePlugin
    - TerserPlugin
    - HtmlWebpackPlugin
    - module.exports
    - loader
  structural_signals:
    - webpack config without code splitting
    - dev mode in production config
    - missing contenthash
source:
  origin: file
  path: fe-build-webpack.md
  hash: "sha256:f7859e473189b75fd19c979103b609f257f447f34db3867a6e505a28e2bf21cf"
---
# Webpack Build Configuration Pitfalls

## When This Activates

Activates when diffs touch webpack configuration files, babel configuration, or loader setup. Webpack's rich configuration surface means small mistakes -- a missing mode flag, an absent splitChunks config, or an overly broad loader rule -- silently ship megabytes of unminified, unsplit JavaScript to users. This reviewer catches the configuration gaps that produce slow, bloated, or insecure production builds.

## Audit Surface

- [ ] mode set to 'development' or mode not explicitly set in production webpack config
- [ ] devtool set to 'eval' or 'eval-source-map' in production config
- [ ] No splitChunks configuration and no dynamic import() in codebase exceeding 300 KB
- [ ] sideEffects not set in package.json or set to true on a tree-shakeable library
- [ ] DefinePlugin or EnvironmentPlugin injecting process.env without allowlisting keys
- [ ] Output filename without [contenthash] for JS or CSS assets
- [ ] Babel-loader processing node_modules without include/exclude filters
- [ ] Missing TerserPlugin or optimization.minimize set to false in production
- [ ] resolve.alias creating duplicate instances of the same package
- [ ] Large uncompressed assets (>250 KB) without CompressionPlugin
- [ ] Missing BundleAnalyzerPlugin in CI for bundle size regression detection
- [ ] css-loader with modules enabled globally instead of per-file convention

## Detailed Checks

### Production Mode and Devtool
<!-- activation: keywords=["mode", "devtool", "production", "development", "eval", "source-map"] -->

- [ ] **Dev mode in production**: flag webpack configs used for production builds where `mode` is 'development' or not set -- development mode disables minification, tree shaking, and scope hoisting, producing bundles 3-10x larger
- [ ] **Eval devtool in production**: flag `devtool: 'eval'` or `devtool: 'eval-source-map'` in production -- eval wraps every module in eval() which is slower, larger, and blocked by CSP; use 'source-map' or 'hidden-source-map' for production; see `fe-csp-sri` for CSP implications
- [ ] **Missing devtool entirely**: flag production configs with `devtool: false` and no external source-map upload -- production errors become impossible to debug without source maps

### Code Splitting and Chunk Strategy
<!-- activation: keywords=["splitChunks", "import(", "chunks", "cacheGroups", "optimization", "lazy"] -->

- [ ] **No code splitting**: flag projects where total JS exceeds 300 KB with no dynamic `import()` calls and no splitChunks configuration -- the user downloads the entire app upfront; see `perf-startup-cold-start`
- [ ] **SplitChunks defaults only**: flag `optimization.splitChunks: { chunks: 'async' }` (the default) on projects with shared vendor code -- change to `chunks: 'all'` to split vendor code used across entry points
- [ ] **Missing contenthash**: flag output.filename or output.chunkFilename without `[contenthash]` -- browsers cache files by name; without content hashing, users receive stale code after deployments

### Tree Shaking and Side Effects
<!-- activation: keywords=["sideEffects", "tree-shaking", "usedExports", "providedExports", "barrel"] -->

- [ ] **sideEffects missing or true**: flag package.json without a `sideEffects` field or with `sideEffects: true` on libraries that are tree-shakeable -- webpack cannot eliminate unused exports without this hint; see `fe-bundle-analysis-tree-shaking`
- [ ] **Barrel re-exports defeating tree shaking**: flag index.ts files that re-export from 10+ modules -- webpack may include all re-exported modules even if only one export is used; see `fe-bundle-analysis-tree-shaking` for detailed barrel file analysis

### Loader Configuration
<!-- activation: keywords=["loader", "babel-loader", "ts-loader", "css-loader", "include", "exclude", "test"] -->

- [ ] **Overly broad loader**: flag babel-loader or ts-loader rules without `include` or `exclude` that process all of node_modules -- this dramatically slows builds and may re-transpile already-compiled libraries
- [ ] **Missing loader for file type**: flag imports of .svg, .wasm, or .graphql files without corresponding loader rules -- webpack produces cryptic errors or silently bundles raw text
- [ ] **css-loader modules globally**: flag `css-loader` with `modules: true` applied to all CSS files including third-party styles -- class name hashing breaks external library styles

### Secret Exposure via DefinePlugin
<!-- activation: keywords=["DefinePlugin", "EnvironmentPlugin", "process.env", "dotenv"] -->

- [ ] **Full process.env injected**: flag `new webpack.DefinePlugin({ 'process.env': JSON.stringify(process.env) })` -- this serializes ALL environment variables (including secrets) into the client bundle; allowlist specific variables instead
- [ ] **EnvironmentPlugin with defaults**: flag `new webpack.EnvironmentPlugin(['SECRET_KEY'])` where SECRET_KEY should not be client-visible -- EnvironmentPlugin embeds the value at build time; see `sec-xss-dom`

## Common False Positives

- **Development-only configs**: webpack.dev.js with `mode: 'development'` is correct for local development; only flag if the same config is used for production builds.
- **Library authors with sideEffects: true**: some packages genuinely have side effects (CSS imports, polyfills); do not flag sideEffects: true if the package relies on import side effects.
- **node_modules in loader include**: some projects intentionally transpile specific node_modules packages that ship untranspiled ESNext; flag only when the entire node_modules is included.
- **Small apps without splitChunks**: single-page apps under 200 KB total bundle size do not benefit from splitting.

## Severity Guidance

| Finding | Severity |
|---|---|
| Full process.env serialized into client bundle | Critical |
| Development mode used in production build | Critical |
| No code splitting with bundle > 500 KB | Important |
| sideEffects missing on tree-shakeable library | Important |
| Missing contenthash in output filenames | Important |
| eval devtool in production | Important |
| Babel-loader processing all of node_modules | Minor |
| Missing bundle analyzer in CI | Minor |
| css-loader modules enabled globally | Minor |

## See Also

- `fe-bundle-analysis-tree-shaking` -- barrel files and sideEffects interact with webpack's tree shaking
- `fe-build-vite` -- migration from webpack to Vite requires understanding both configurations
- `fe-csp-sri` -- eval-based devtools conflict with Content-Security-Policy
- `perf-startup-cold-start` -- code splitting directly affects initial load performance
- `sec-xss-dom` -- DefinePlugin secret exposure is a data leak vector

## Authoritative References

- [Webpack Documentation -- "Production"](https://webpack.js.org/guides/production/)
- [Webpack Documentation -- "Code Splitting"](https://webpack.js.org/guides/code-splitting/)
- [Webpack Documentation -- "Tree Shaking"](https://webpack.js.org/guides/tree-shaking/)
- [Webpack Documentation -- "SplitChunksPlugin"](https://webpack.js.org/plugins/split-chunks-plugin/)
- [Webpack Documentation -- "Caching"](https://webpack.js.org/guides/caching/)
