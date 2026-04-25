---
id: fe-core-web-vitals-lighthouse
type: primary
depth_role: leaf
focus: "Detect code patterns that degrade Core Web Vitals (LCP, CLS, INP) and Lighthouse scores, including render-blocking resources, layout shifts, and long tasks."
parents:
  - index.md
covers:
  - LCP blocked by render-blocking CSS or synchronous scripts in head
  - CLS caused by images without dimensions, dynamic content injection, or font loading
  - INP degraded by long JavaScript tasks on the main thread
  - Missing performance budget enforcement in CI
  - "No Real User Monitoring (RUM) alongside synthetic Lighthouse"
  - Third-party scripts blocking first paint
  - "Missing resource hints (preload, preconnect, prefetch)"
  - Unoptimized critical rendering path
  - JavaScript execution blocking interactivity
  - Missing web-vitals library for field data collection
tags:
  - web-vitals
  - lcp
  - cls
  - inp
  - lighthouse
  - performance
  - rum
  - frontend
activation:
  file_globs:
    - "**/*.html"
    - "**/index.html"
    - "**/layout.*"
    - "**/app.*"
    - "**/_document.*"
    - "**/_app.*"
  keyword_matches:
    - web-vitals
    - lighthouse
    - LCP
    - CLS
    - INP
    - FCP
    - performance
    - preload
    - preconnect
    - font-display
  structural_signals:
    - render-blocking resource in head
    - image without dimensions
    - long task in event handler
source:
  origin: file
  path: fe-core-web-vitals-lighthouse.md
  hash: "sha256:2c328759438352358253d7a4fba7bc814bb2a02342995d77ad40703d9206876d"
---
# Core Web Vitals and Lighthouse Pitfalls

## When This Activates

Activates when diffs touch HTML document structure, layout files, script loading patterns, font configuration, or image elements. Core Web Vitals (LCP, CLS, INP) directly affect search ranking and user experience -- but they are caused by code-level patterns that are invisible without measurement. A synchronous script in the head blocks LCP by seconds, an image without dimensions causes CLS on every page load, and a long event handler degrades INP. This reviewer catches the code patterns that degrade these metrics before they reach production.

## Audit Surface

- [ ] Synchronous script tag in head without async or defer attribute
- [ ] Render-blocking CSS loaded via link without media query scoping or critical CSS extraction
- [ ] Image element without explicit width and height attributes (CLS source)
- [ ] Dynamic content inserted above the fold without reserved space (CLS source)
- [ ] Font loaded without font-display: swap or optional (CLS from FOIT)
- [ ] Event handler with synchronous computation exceeding 50ms (long task, INP source)
- [ ] No performance budget file in the repository
- [ ] Third-party script tag loaded synchronously
- [ ] Missing link rel='preconnect' for critical third-party origins
- [ ] Missing link rel='preload' for LCP image or critical font
- [ ] No web-vitals library integration for field performance data
- [ ] Lighthouse CI not configured in the CI pipeline

## Detailed Checks

### Largest Contentful Paint (LCP)
<!-- activation: keywords=["<script", "<link", "preload", "preconnect", "critical", "above-the-fold", "hero", "LCP"] -->

- [ ] **Render-blocking scripts**: flag `<script src="...">` in `<head>` without `async` or `defer` -- the browser halts HTML parsing until the script downloads and executes, delaying LCP by the script's load time
- [ ] **Render-blocking CSS**: flag `<link rel="stylesheet">` for non-critical CSS without `media` attribute scoping or critical CSS extraction -- the browser blocks rendering until all CSS is downloaded; inline critical CSS or use media queries to defer non-critical styles
- [ ] **Missing LCP preload**: flag pages where the LCP element is an image loaded via CSS background or lazy-loaded by JavaScript without `<link rel="preload" as="image">` -- the browser discovers the image late, adding a full round-trip to LCP
- [ ] **Third-party blocking first paint**: flag third-party script tags (analytics, chat widgets, A/B testing) loaded synchronously in the head -- defer or load these after the page is interactive; see `perf-startup-cold-start`

### Cumulative Layout Shift (CLS)
<!-- activation: keywords=["width", "height", "aspect-ratio", "font-display", "skeleton", "placeholder", "CLS"] -->

- [ ] **Image without dimensions**: flag `<img>` elements (or framework equivalents) without explicit `width` and `height` attributes or CSS `aspect-ratio` -- the browser cannot reserve space before the image loads, causing layout shift; see `fe-image-font-optimization`
- [ ] **Dynamic above-fold injection**: flag JavaScript that inserts banners, ads, cookie consent, or notification bars above existing content without reserving space (min-height, skeleton) -- content below shifts down causing CLS
- [ ] **Font-display missing**: flag @font-face rules or Google Fonts links without `font-display: swap` or `font-display: optional` -- invisible text during font loading (FOIT) followed by reflow causes CLS; see `fe-image-font-optimization`
- [ ] **Late-loading above-fold content**: flag components above the fold that load data client-side and render after the initial paint -- use SSR, ISR, or a skeleton placeholder to reserve the space; see `fe-ssr-csr-ssg-isr-islands`

### Interaction to Next Paint (INP)
<!-- activation: keywords=["onClick", "onInput", "onChange", "onKeyDown", "addEventListener", "requestAnimationFrame", "setTimeout", "INP"] -->

- [ ] **Long synchronous handler**: flag event handlers (onClick, onInput, onChange, onKeyDown) that perform synchronous computation likely exceeding 50ms -- sorting large arrays, complex DOM manipulation, or heavy parsing blocks the main thread; yield to the browser via requestAnimationFrame, scheduler.yield, or setTimeout(0)
- [ ] **No task splitting**: flag loops processing 1000+ items synchronously in an event handler -- split into chunks using requestIdleCallback or scheduler.yield to keep individual tasks under 50ms
- [ ] **Heavy render on interaction**: flag state updates that trigger re-rendering of 100+ components on a single user interaction -- this blocks the main thread during the render phase; see `fw-react` for memoization strategies

### Performance Budgets and Monitoring
<!-- activation: keywords=["budget", "lighthouse", "web-vitals", "rum", "monitoring", "CI", "performance"] -->

- [ ] **No performance budget**: flag repositories without a performance budget file (lighthouse budget.json, bundlesize config, or equivalent) -- without a budget, bundle size and metric regressions go undetected until users report slowness
- [ ] **No Lighthouse in CI**: flag CI pipelines without Lighthouse CI or equivalent synthetic performance testing -- performance regressions introduced in PRs are caught only after production deployment
- [ ] **No RUM data collection**: flag applications without web-vitals library or equivalent RUM integration -- Lighthouse measures lab performance; real user metrics from diverse devices and networks are essential for accurate performance assessment

## Common False Positives

- **Script with type="module"**: module scripts are deferred by default and do not block parsing; do not flag them.
- **Preloaded CSS**: CSS loaded via `<link rel="preload" as="style">` with an onload handler is not render-blocking.
- **Images below the fold**: images below the fold do not need width/height for CLS purposes (they shift off-screen content).
- **SSR/SSG with hydration**: server-rendered pages that hydrate client-side may have acceptable INP if the hydration is deferred.
- **Intentional synchronous script**: analytics or error-tracking scripts that must execute before any other code may legitimately be synchronous.

## Severity Guidance

| Finding | Severity |
|---|---|
| Synchronous third-party script blocking LCP by 1s+ | Critical |
| Above-fold image without dimensions causing CLS > 0.1 | Critical |
| Event handler with long task degrading INP > 200ms | Important |
| Missing font-display causing FOIT and CLS | Important |
| No performance budget in CI | Important |
| Missing preload for LCP image | Minor |
| No RUM data collection | Minor |
| Missing preconnect for third-party origins | Minor |

## See Also

- `fe-image-font-optimization` -- image dimensions, font loading, and preload strategies affect LCP and CLS
- `fe-ssr-csr-ssg-isr-islands` -- rendering strategy directly affects LCP and CLS
- `fe-bundle-analysis-tree-shaking` -- bundle size affects script loading time and LCP
- `perf-startup-cold-start` -- script execution during startup affects time to interactive
- `fw-react` -- React re-render cost affects INP
- `fw-nextjs` -- Next.js provides built-in image and font optimization

## Authoritative References

- [web.dev -- "Core Web Vitals"](https://web.dev/articles/vitals)
- [web.dev -- "Largest Contentful Paint"](https://web.dev/articles/lcp)
- [web.dev -- "Cumulative Layout Shift"](https://web.dev/articles/cls)
- [web.dev -- "Interaction to Next Paint"](https://web.dev/articles/inp)
- [Google -- "Lighthouse Performance Scoring"](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring)
