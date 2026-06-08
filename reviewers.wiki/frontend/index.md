---
id: frontend
type: index
depth_role: subcategory
depth: 1
focus: "frontend: Detect incorrect ARIA roles, misuse of aria-hidden on focusable elements, missing aria-live for dynamic content, redundant ARIA on native elements, and aria-label without visible label.; Detect missing focus indicators, broken ..."
parents:
  - "../index.md"
shared_covers: []
tags:
  - a11y
  - accept-language
  - accessibility
  - accessibilitylabel
  - alt-text
  - android
  - animation
  - antd
  - apollo
  - ar
  - arcore
  - aria
  - aria-live
  - arkit
  - assistive-technology
  - atomic-css
  - avif
  - axe
  - background-sync
  - barrel-files
generator: "skill-llm-wiki/v1"
entries:
  - id: a11y-aria-and-live-regions
    file: a11y-aria-and-live-regions.md
    type: primary
    focus: Detect incorrect ARIA roles, misuse of aria-hidden on focusable elements, missing aria-live for dynamic content, redundant ARIA on native elements, and aria-label without visible label.
    tags:
      - aria
      - accessibility
      - a11y
      - live-regions
      - roles
      - screen-reader
      - assistive-technology
      - wcag
      - axe
      - lighthouse
      - keyboard-navigation
      - color-contrast
      - headings
      - tables
      - alt-text
      - aria-live
      - semantics
      - voiceover
      - nvda
      - jaws
  - id: a11y-keyboard-navigation
    file: a11y-keyboard-navigation.md
    type: primary
    focus: Detect missing focus indicators, broken tab order, keyboard traps, custom interactive elements without keyboard handlers, and missing skip navigation.
    tags:
      - keyboard
      - focus
      - tab-order
      - focus-trap
      - skip-nav
      - a11y
      - accessibility
      - navigation
      - roving-tabindex
  - id: a11y-native-platform-ios-android
    file: a11y-native-platform-ios-android.md
    type: primary
    focus: "Detect missing accessibilityLabel (iOS), missing contentDescription (Android), custom views without accessibility traits, undersized touch targets, unsupported Dynamic Type, and untested VoiceOver/TalkBack paths."
    tags:
      - accessibility
      - a11y
      - ios
      - android
      - voiceover
      - talkback
      - dynamic-type
      - accessibilityLabel
      - contentDescription
      - touch-target
      - native
  - id: a11y-reduced-motion-and-prefers-color-scheme
    file: a11y-reduced-motion-and-prefers-color-scheme.md
    type: primary
    focus: Detect animations without prefers-reduced-motion check, missing forced colors support, dark mode contrast failures, and transition durations not respecting user preference.
    tags:
      - reduced-motion
      - prefers-color-scheme
      - dark-mode
      - high-contrast
      - forced-colors
      - a11y
      - accessibility
      - animation
      - vestibular
      - media-query
  - id: a11y-wcag-2-2-aa
    file: a11y-wcag-2-2-aa.md
    type: primary
    focus: Detect WCAG 2.2 Level AA violations including missing alt text, insufficient color contrast, missing form labels, absent landmarks, broken focus management, and undersized touch targets.
    tags:
      - wcag
      - accessibility
      - a11y
      - contrast
      - alt-text
      - focus
      - landmarks
      - form-labels
      - target-size
      - wcag-2-2
  - id: browser-extensions-mv3
    file: browser-extensions-mv3.md
    type: primary
    focus: Detect browser-extension pitfalls in Manifest V3 -- MV2 leftovers, over-broad host permissions, unsafe CSP, service-worker lifecycle assumptions, deprecated executeScript APIs, and missing declarativeNetRequest validation
    tags:
      - browser-extension
      - manifest-v3
      - chrome
      - firefox
      - edge
      - service-worker
      - csp
      - declarativeNetRequest
      - host-permissions
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
  - id: fe-components-shadcn-radix-mui-antd-chakra
    file: fe-components-shadcn-radix-mui-antd-chakra.md
    type: primary
    focus: "Detect accessibility regressions, theme inconsistencies, bundle bloat, and API misuse when customizing component libraries like shadcn/ui, Radix, MUI, Ant Design, and Chakra UI."
    tags:
      - component-library
      - shadcn
      - radix
      - mui
      - antd
      - chakra
      - accessibility
      - a11y
      - frontend
  - id: fe-core-web-vitals-lighthouse
    file: fe-core-web-vitals-lighthouse.md
    type: primary
    focus: "Detect code patterns that degrade Core Web Vitals (LCP, CLS, INP) and Lighthouse scores, including render-blocking resources, layout shifts, and long tasks."
    tags:
      - web-vitals
      - lcp
      - cls
      - inp
      - lighthouse
      - performance
      - rum
      - frontend
  - id: fe-csp-sri
    file: fe-csp-sri.md
    type: primary
    focus: Detect missing or misconfigured Content-Security-Policy headers and missing Subresource Integrity hashes that leave applications vulnerable to XSS, script injection, and CDN compromise.
    tags:
      - csp
      - sri
      - content-security-policy
      - subresource-integrity
      - xss-prevention
      - security
      - frontend
      - clickjacking
      - security-headers
      - hsts
      - x-frame-options
      - CWE-1021
      - CWE-693
      - CWE-16
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
  - id: fe-css-unocss-stylex-panda
    file: fe-css-unocss-stylex-panda.md
    type: primary
    focus: Detect atomic CSS pitfalls in UnoCSS, StyleX, and Panda CSS around extraction failures, runtime overhead, preset misconfiguration, and design token drift.
    tags:
      - unocss
      - stylex
      - panda-css
      - atomic-css
      - css-in-js
      - design-tokens
      - frontend
  - id: fe-data-react-query-swr-apollo-relay-urql
    file: fe-data-react-query-swr-apollo-relay-urql.md
    type: primary
    focus: Detect data-fetching pitfalls across React Query, SWR, Apollo Client, Relay, and urql including cache invalidation bugs, missing error states, and overfetching.
    tags:
      - data-fetching
      - react-query
      - tanstack-query
      - swr
      - apollo
      - relay
      - urql
      - graphql
      - cache
      - frontend
  - id: fe-hydration-mismatch
    file: fe-hydration-mismatch.md
    type: primary
    focus: "Detect server/client HTML mismatches that cause hydration errors, including date/time locale differences, random ID generation, browser-only API usage during SSR, and missing Suspense boundaries."
    tags:
      - hydration
      - ssr
      - mismatch
      - server-components
      - suspense
      - correctness
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
  - id: fe-service-worker-pwa
    file: fe-service-worker-pwa.md
    type: primary
    focus: Detect service worker and PWA pitfalls including stale caches, missing update prompts, offline fallback gaps, and background sync without retry limits.
    tags:
      - service-worker
      - pwa
      - cache
      - offline
      - push-notifications
      - background-sync
      - frontend
  - id: fe-state-redux-zustand-mobx-jotai-recoil-pinia
    file: fe-state-redux-zustand-mobx-jotai-recoil-pinia.md
    type: primary
    focus: Detect state management anti-patterns across Redux, Zustand, MobX, Jotai, Recoil, and Pinia that cause unnecessary re-renders, stale data, or unmaintainable state shapes.
    tags:
      - state-management
      - redux
      - zustand
      - mobx
      - jotai
      - recoil
      - pinia
      - re-render
      - frontend
  - id: game-engines-unity-unreal-godot
    file: game-engines-unity-unreal-godot.md
    type: primary
    focus: Detect per-frame allocations, hot-path engine API misuse, coroutine leaks, and missing pooling in Unity, Unreal, and Godot game code
    tags:
      - gamedev
      - unity
      - unreal
      - godot
      - game-engine
      - performance
      - gc
      - hot-path
      - coroutines
  - id: graphics-shaders-webgl-webgpu
    file: graphics-shaders-webgl-webgpu.md
    type: primary
    focus: Detect GPU hazards in shaders and graphics pipelines -- warp divergence, CPU-GPU sync stalls, missing precision, unfiltered textures, and undiagnosed errors in WebGL and WebGPU code
    tags:
      - graphics
      - shaders
      - webgl
      - webgpu
      - glsl
      - wgsl
      - hlsl
      - gpu
      - rendering
  - id: i18n-l10n-architecture
    file: i18n-l10n-architecture.md
    type: primary
    focus: "Detect i18n/l10n architecture gaps -- hardcoded strings, concatenated messages, missing ICU plural rules, absent fallback chains, RTL/locale oversights, and unsynchronised translation catalogues"
    tags:
      - i18n
      - l10n
      - gettext
      - icu
      - messageformat
      - plural
      - rtl
      - locale
      - fallback
      - translation
      - accept-language
      - pluralization
      - CLDR
      - ICU
      - MessageFormat
      - plural-rules
  - id: xr-arkit-arcore-webxr-openxr
    file: xr-arkit-arcore-webxr-openxr.md
    type: primary
    focus: "Detect XR hazards -- missing user gesture for session, absent device fallback, anchor leaks, untracked-quality placement, and comfort / privacy omissions in ARKit, ARCore, WebXR, and OpenXR code"
    tags:
      - xr
      - ar
      - vr
      - mr
      - arkit
      - arcore
      - webxr
      - openxr
      - realitykit
      - scenekit
      - spatial-computing
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Frontend

**Focus:** frontend: Detect incorrect ARIA roles, misuse of aria-hidden on focusable elements, missing aria-live for dynamic content, redundant ARIA on native elements, and aria-label without visible label.; Detect missing focus indicators, broken ...

## Children

| File | Type | Focus |
|------|------|-------|
| [a11y-aria-and-live-regions.md](a11y-aria-and-live-regions.md) | 📄 primary | Detect incorrect ARIA roles, misuse of aria-hidden on focusable elements, missing aria-live for dynamic content, redundant ARIA on native elements, and aria-label without visible label. |
| [a11y-keyboard-navigation.md](a11y-keyboard-navigation.md) | 📄 primary | Detect missing focus indicators, broken tab order, keyboard traps, custom interactive elements without keyboard handlers, and missing skip navigation. |
| [a11y-native-platform-ios-android.md](a11y-native-platform-ios-android.md) | 📄 primary | Detect missing accessibilityLabel (iOS), missing contentDescription (Android), custom views without accessibility traits, undersized touch targets, unsupported Dynamic Type, and untested VoiceOver/TalkBack paths. |
| [a11y-reduced-motion-and-prefers-color-scheme.md](a11y-reduced-motion-and-prefers-color-scheme.md) | 📄 primary | Detect animations without prefers-reduced-motion check, missing forced colors support, dark mode contrast failures, and transition durations not respecting user preference. |
| [a11y-wcag-2-2-aa.md](a11y-wcag-2-2-aa.md) | 📄 primary | Detect WCAG 2.2 Level AA violations including missing alt text, insufficient color contrast, missing form labels, absent landmarks, broken focus management, and undersized touch targets. |
| [browser-extensions-mv3.md](browser-extensions-mv3.md) | 📄 primary | Detect browser-extension pitfalls in Manifest V3 -- MV2 leftovers, over-broad host permissions, unsafe CSP, service-worker lifecycle assumptions, deprecated executeScript APIs, and missing declarativeNetRequest validation |
| [fe-build-esbuild-turbopack.md](fe-build-esbuild-turbopack.md) | 📄 primary | Detect esbuild and Turbopack configuration gaps around minification, target mismatch, missing polyfills, and dev/prod parity issues. |
| [fe-build-vite.md](fe-build-vite.md) | 📄 primary | Detect Vite build misconfigurations that leak dev-only code into production, bloat bundles, expose environment variables, or degrade load performance. |
| [fe-build-webpack.md](fe-build-webpack.md) | 📄 primary | Detect webpack misconfigurations that ship dev-mode bundles to production, miss code splitting opportunities, or produce undebuggable builds. |
| [fe-bundle-analysis-tree-shaking.md](fe-bundle-analysis-tree-shaking.md) | 📄 primary | Detect patterns that defeat tree shaking, bloat bundles, and prevent effective code elimination including barrel file re-exports, side-effect-ful modules, and dynamic import misuse. |
| [fe-components-shadcn-radix-mui-antd-chakra.md](fe-components-shadcn-radix-mui-antd-chakra.md) | 📄 primary | Detect accessibility regressions, theme inconsistencies, bundle bloat, and API misuse when customizing component libraries like shadcn/ui, Radix, MUI, Ant Design, and Chakra UI. |
| [fe-core-web-vitals-lighthouse.md](fe-core-web-vitals-lighthouse.md) | 📄 primary | Detect code patterns that degrade Core Web Vitals (LCP, CLS, INP) and Lighthouse scores, including render-blocking resources, layout shifts, and long tasks. |
| [fe-csp-sri.md](fe-csp-sri.md) | 📄 primary | Detect missing or misconfigured Content-Security-Policy headers and missing Subresource Integrity hashes that leave applications vulnerable to XSS, script injection, and CDN compromise. |
| [fe-css-tailwind.md](fe-css-tailwind.md) | 📄 primary | Detect Tailwind CSS misconfigurations that bloat production CSS, break design consistency, or create maintainability issues from utility class misuse. |
| [fe-css-unocss-stylex-panda.md](fe-css-unocss-stylex-panda.md) | 📄 primary | Detect atomic CSS pitfalls in UnoCSS, StyleX, and Panda CSS around extraction failures, runtime overhead, preset misconfiguration, and design token drift. |
| [fe-data-react-query-swr-apollo-relay-urql.md](fe-data-react-query-swr-apollo-relay-urql.md) | 📄 primary | Detect data-fetching pitfalls across React Query, SWR, Apollo Client, Relay, and urql including cache invalidation bugs, missing error states, and overfetching. |
| [fe-hydration-mismatch.md](fe-hydration-mismatch.md) | 📄 primary | Detect server/client HTML mismatches that cause hydration errors, including date/time locale differences, random ID generation, browser-only API usage during SSR, and missing Suspense boundaries. |
| [fe-image-font-optimization.md](fe-image-font-optimization.md) | 📄 primary | Detect unoptimized images, missing lazy loading, font loading issues (FOIT/FOUT), excessive font weights, and missing preload for critical assets that degrade LCP and CLS. |
| [fe-service-worker-pwa.md](fe-service-worker-pwa.md) | 📄 primary | Detect service worker and PWA pitfalls including stale caches, missing update prompts, offline fallback gaps, and background sync without retry limits. |
| [fe-state-redux-zustand-mobx-jotai-recoil-pinia.md](fe-state-redux-zustand-mobx-jotai-recoil-pinia.md) | 📄 primary | Detect state management anti-patterns across Redux, Zustand, MobX, Jotai, Recoil, and Pinia that cause unnecessary re-renders, stale data, or unmaintainable state shapes. |
| [game-engines-unity-unreal-godot.md](game-engines-unity-unreal-godot.md) | 📄 primary | Detect per-frame allocations, hot-path engine API misuse, coroutine leaks, and missing pooling in Unity, Unreal, and Godot game code |
| [graphics-shaders-webgl-webgpu.md](graphics-shaders-webgl-webgpu.md) | 📄 primary | Detect GPU hazards in shaders and graphics pipelines -- warp divergence, CPU-GPU sync stalls, missing precision, unfiltered textures, and undiagnosed errors in WebGL and WebGPU code |
| [i18n-l10n-architecture.md](i18n-l10n-architecture.md) | 📄 primary | Detect i18n/l10n architecture gaps -- hardcoded strings, concatenated messages, missing ICU plural rules, absent fallback chains, RTL/locale oversights, and unsynchronised translation catalogues |
| [xr-arkit-arcore-webxr-openxr.md](xr-arkit-arcore-webxr-openxr.md) | 📄 primary | Detect XR hazards -- missing user gesture for session, absent device fallback, anchor leaks, untracked-quality placement, and comfort / privacy omissions in ARKit, ARCore, WebXR, and OpenXR code |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
