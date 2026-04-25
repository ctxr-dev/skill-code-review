---
id: fe-css-unocss-stylex-panda
type: primary
depth_role: leaf
focus: Detect atomic CSS pitfalls in UnoCSS, StyleX, and Panda CSS around extraction failures, runtime overhead, preset misconfiguration, and design token drift.
parents:
  - index.md
covers:
  - Atomic CSS extraction failures causing missing styles in production
  - Missing preset or plugin configuration in UnoCSS
  - Runtime CSS-in-JS overhead from StyleX misconfiguration
  - Panda CSS extraction issues with dynamic styles
  - Design token inconsistency across atomic CSS frameworks
  - UnoCSS safelist missing dynamically generated class names
  - StyleX compiler plugin not configured for production builds
  - Panda CSS recipes not used for variant-heavy components
  - Mixing atomic CSS with traditional CSS causing specificity conflicts
  - Missing TypeScript integration for design token autocomplete
tags:
  - unocss
  - stylex
  - panda-css
  - atomic-css
  - css-in-js
  - design-tokens
  - frontend
activation:
  file_globs:
    - "**/uno.config.*"
    - "**/unocss.config.*"
    - "**/panda.config.*"
    - "**/styled-system/**"
  keyword_matches:
    - unocss
    - stylex
    - panda
    - "@pandacss"
    - stylex.create
    - defineConfig
    - "css("
  structural_signals:
    - atomic CSS extraction failure
    - runtime CSS overhead
    - design token inconsistency
source:
  origin: file
  path: fe-css-unocss-stylex-panda.md
  hash: "sha256:7d5b14ec17c5f809ab4980443798b47142b1b09fbdf4a3cc2b30ed1ccd33d83f"
---
# UnoCSS, StyleX, and Panda CSS Pitfalls

## When This Activates

Activates when diffs touch UnoCSS, StyleX, or Panda CSS configuration files, or code using their styling APIs. These atomic CSS frameworks optimize production CSS by extracting only used styles at build time -- but extraction is brittle. Dynamic class construction, missing compiler plugins, and misaligned design tokens cause styles to silently disappear in production while working perfectly in development. This reviewer catches the extraction and configuration gaps across these frameworks.

## Audit Surface

- [ ] UnoCSS config without required presets for the project's utility needs
- [ ] Dynamic class names constructed at runtime without safelist in UnoCSS
- [ ] StyleX used without the Babel or compiler plugin in the build pipeline
- [ ] StyleX stylex.create() called conditionally or inside loops
- [ ] Panda CSS config with missing token definitions referenced in code
- [ ] Panda CSS dynamic styling using runtime css() where static extraction would work
- [ ] Atomic CSS utilities mixed with global CSS using the same property (specificity conflict)
- [ ] Design tokens defined in multiple places (theme config and raw CSS variables)
- [ ] UnoCSS extractors not configured for non-standard template formats
- [ ] StyleX runtime mode enabled in production (should use compile-time extraction)
- [ ] Panda CSS patterns or recipes not leveraged for component variants
- [ ] Missing postcss or build plugin integration for the chosen atomic CSS framework

## Detailed Checks

### Extraction and Build Integration
<!-- activation: keywords=["extract", "safelist", "plugin", "babel", "compiler", "build", "postcss"] -->

- [ ] **Missing build plugin**: flag projects using StyleX without the Babel plugin (@stylexjs/babel-plugin) or Panda CSS without the PostCSS/build plugin -- styles are not extracted at build time and either fail or fall back to expensive runtime injection
- [ ] **Runtime mode in production**: flag StyleX configured to run in runtime mode (non-compiled) in production -- runtime style injection adds JS overhead and flash of unstyled content; the compiler plugin must be in the production build chain
- [ ] **Dynamic class extraction failure**: flag UnoCSS or Panda CSS code that constructs class names dynamically (template literals, string concatenation) -- static extraction cannot detect these; add to safelist or use the framework's variant API instead; see `fe-css-tailwind` for the same pattern
- [ ] **Missing extractors**: flag UnoCSS projects using non-standard template formats (.mdx, .astro, .svelte) without custom extractors configured -- the default extractor only scans standard file types

### Design Token Consistency
<!-- activation: keywords=["theme", "tokens", "colors", "spacing", "semantic", "defineTokens", "vars"] -->

- [ ] **Token duplication**: flag projects where design tokens are defined both in the atomic CSS framework config (e.g., panda.config tokens) and in raw CSS custom properties -- dual sources of truth drift apart over time
- [ ] **Hardcoded values bypassing tokens**: flag styled-system or css() calls using hardcoded pixel values or hex colors when equivalent tokens exist in the config -- this defeats the purpose of a design system
- [ ] **Missing token TypeScript types**: flag Panda CSS or UnoCSS setups without TypeScript integration (generated types) -- developers lose autocomplete and accidentally use non-existent tokens that silently produce no output

### UnoCSS-Specific Patterns
<!-- activation: keywords=["unocss", "uno.config", "presetUno", "presetWind", "presetAttributify", "rules", "shortcuts"] -->

- [ ] **Missing presets**: flag UnoCSS config that imports no presets or is missing presetUno/presetWind for Tailwind-compatible utilities -- without presets, most utility classes generate nothing
- [ ] **Shortcut overuse**: flag UnoCSS shortcuts that replicate what should be component composition -- shortcuts are for repeated utility patterns, not component abstraction
- [ ] **Attributify mode without safeguards**: flag presetAttributify enabled without configuring the prefix option -- attributify mode adds utility-named HTML attributes that may conflict with existing attributes or frameworks

### StyleX-Specific Patterns
<!-- activation: keywords=["stylex", "stylex.create", "stylex.props", "stylex.firstThatWorks"] -->

- [ ] **Conditional stylex.create**: flag stylex.create() called inside conditionals, loops, or component render functions -- stylex.create must be called at module level for the compiler to statically extract styles
- [ ] **Unused style keys**: flag stylex.create() objects with keys that are never referenced by stylex.props() -- these styles are dead code that the compiler may still extract
- [ ] **Missing stylex.props spread**: flag components that pass stylex styles via custom props without using stylex.props() for merging -- manual style merging breaks StyleX's deterministic resolution order

### Panda CSS-Specific Patterns
<!-- activation: keywords=["panda", "css(", "cva(", "recipe", "pattern", "styled-system", "defineRecipe"] -->

- [ ] **Runtime css() overuse**: flag Panda CSS code using the runtime css() function for styles that could be statically extracted via recipes or patterns -- runtime generation adds JS bundle size and execution overhead
- [ ] **Missing recipes for variants**: flag components with multiple conditional style objects instead of using cva() or defineRecipe() -- recipes provide type-safe variant APIs and better extraction
- [ ] **Config out of sync with codegen**: flag panda.config changes without running the codegen step (panda codegen) -- stale generated files cause type errors and missing utilities

## Common False Positives

- **Dynamic styling for animation**: runtime css() or computed styles for animations and transitions that cannot be statically extracted are legitimate.
- **One-off hardcoded values**: a single unique value (e.g., a brand-specific measurement) that does not warrant a design token is acceptable.
- **StyleX in development mode**: runtime mode during development for hot reloading is expected; only flag production builds.
- **UnoCSS without presets in library code**: libraries may define only custom rules without standard presets.

## Severity Guidance

| Finding | Severity |
|---|---|
| Missing build/compiler plugin causing no extraction in production | Critical |
| Dynamic class names without safelist causing missing styles | Critical |
| StyleX runtime mode in production | Important |
| Design tokens duplicated across config and raw CSS | Important |
| Missing TypeScript types for token autocomplete | Minor |
| Panda CSS runtime css() where static extraction would work | Minor |
| UnoCSS shortcuts replacing component composition | Minor |

## See Also

- `fe-css-tailwind` -- Tailwind shares purge/content configuration and utility class readability concerns
- `fe-bundle-analysis-tree-shaking` -- atomic CSS extraction interacts with overall CSS bundle size
- `fw-react` -- React component patterns affect how atomic CSS styles are applied and composed
- `fe-build-vite` -- Vite plugin configuration required for UnoCSS and Panda CSS integration

## Authoritative References

- [UnoCSS Documentation -- "Guide"](https://unocss.dev/guide/)
- [StyleX Documentation -- "Getting Started"](https://stylexjs.com/docs/learn/)
- [Panda CSS Documentation -- "Overview"](https://panda-css.com/docs/overview/getting-started)
- [Meta Engineering -- "Rethinking CSS"](https://stylexjs.com/blog/introducing-stylex)
