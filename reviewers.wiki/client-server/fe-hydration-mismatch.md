---
id: fe-hydration-mismatch
type: primary
depth_role: leaf
focus: "Detect server/client HTML mismatches that cause hydration errors, including date/time locale differences, random ID generation, browser-only API usage during SSR, and missing Suspense boundaries."
parents:
  - index.md
covers:
  - "Server/client HTML mismatch causing React or Vue hydration errors"
  - Date and time formatting with locale differences between server and client
  - Random IDs or UUIDs generated differently on server and client
  - "Browser-only APIs (window, document, localStorage) called during SSR"
  - Missing Suspense boundaries for client-only content
  - Conditional rendering based on typeof window check
  - Third-party scripts injecting DOM during hydration window
  - CSS-in-JS generating different class names on server and client
  - "Environment-dependent content (user agent, screen size) rendered on server"
  - Extension-injected DOM nodes causing hydration warnings
tags:
  - hydration
  - ssr
  - mismatch
  - server-components
  - suspense
  - correctness
  - frontend
activation:
  file_globs:
    - "**/*.jsx"
    - "**/*.tsx"
    - "**/*.vue"
    - "**/*.svelte"
    - "**/pages/**"
    - "**/app/**"
  keyword_matches:
    - hydrat
    - useEffect
    - onMounted
    - typeof window
    - window.
    - document.
    - navigator.
    - localStorage
    - Suspense
    - suppressHydrationWarning
    - useId
  structural_signals:
    - browser API in render path
    - "date/time in server component"
    - random ID generation in render
source:
  origin: file
  path: fe-hydration-mismatch.md
  hash: "sha256:c5d488a970b12859caac8aa176b37aabb4c95e0182d513a1a54f7ff96361ee1f"
---
# Hydration Mismatch Pitfalls

## When This Activates

Activates when diffs touch server-rendered components that also hydrate on the client, or code that accesses browser-only APIs. Hydration expects the server-rendered HTML to exactly match what the client would render -- any mismatch causes React to discard the server HTML and re-render from scratch (destroying performance) or produce visual glitches. Common causes are invisible: a Date() formatted differently due to timezone, a random ID generated with a different seed, or a window check that changes the render tree. This reviewer catches the patterns that cause hydration failures.

## Audit Surface

- [ ] Component rendering Date.now(), new Date().toLocaleString(), or time-dependent content
- [ ] Component using Math.random(), crypto.randomUUID(), or nanoid() for IDs during render
- [ ] Direct access to window, document, navigator, or localStorage outside useEffect or onMounted
- [ ] Conditional rendering using typeof window !== 'undefined' in the render path
- [ ] CSS-in-JS library without SSR configuration
- [ ] Missing Suspense boundary around client-only component
- [ ] Component rendering user agent or screen-size dependent content on server
- [ ] Third-party script tag that modifies DOM before hydration completes
- [ ] Server component importing a module that accesses browser globals at import time
- [ ] Timezone-dependent rendering without consistent timezone normalization
- [ ] Dynamic className or style that differs between server and client
- [ ] Mismatch between server-rendered HTML attributes and client-side React props

## Detailed Checks

### Date, Time, and Locale Mismatches
<!-- activation: keywords=["Date", "toLocaleString", "toLocaleDateString", "Intl", "timezone", "locale", "format"] -->

- [ ] **Date formatting mismatch**: flag components that render `new Date().toLocaleString()`, `Intl.DateTimeFormat`, or similar locale-dependent formatters during the render pass -- the server locale (often en-US, UTC) differs from the client locale, producing different strings that fail hydration
- [ ] **Timezone-dependent content**: flag components rendering time-dependent content (e.g., "Good morning", countdown timers, "3 minutes ago") during initial render -- the server and client may be in different timezones; defer to useEffect or use `suppressHydrationWarning` with a fallback
- [ ] **Relative time on server**: flag libraries like `timeago.js` or `date-fns formatDistanceToNow` called during server render -- the time between server render and client hydration means the relative time has already changed

### Random IDs and Non-Deterministic Values
<!-- activation: keywords=["Math.random", "crypto.random", "uuid", "nanoid", "useId", "uniqueId", "id="] -->

- [ ] **Random ID in render**: flag `Math.random()`, `crypto.randomUUID()`, `nanoid()`, or `_.uniqueId()` called during the component render to generate element IDs, keys, or aria attributes -- the server and client generate different values; use React's `useId()` hook (React 18+) for deterministic IDs
- [ ] **Missing useId**: flag components generating IDs for aria-labelledby, htmlFor, or id attributes without using `useId()` in React 18+ projects -- useId produces the same ID on server and client
- [ ] **Non-deterministic key prop**: flag list rendering where the key is generated from Math.random() or Date.now() -- keys must be stable across renders; use data-derived keys

### Browser-Only APIs During SSR
<!-- activation: keywords=["window", "document", "navigator", "localStorage", "sessionStorage", "matchMedia", "screen", "innerWidth"] -->

- [ ] **Window access in render**: flag direct access to `window`, `document`, `navigator`, `localStorage`, `sessionStorage`, or `matchMedia` in the component render path (outside useEffect, event handlers, or lazy initialization) -- these APIs do not exist on the server and cause either a crash or a conditional branch that changes the render output
- [ ] **typeof window guard in render**: flag `typeof window !== 'undefined'` used to conditionally render different content on server vs client -- this intentionally produces a hydration mismatch; wrap the client-only content in a Suspense boundary or use a `useIsClient()` pattern that renders a consistent fallback on first render
- [ ] **Module-level browser access**: flag imports that execute browser globals at module evaluation time (e.g., a module that does `const width = window.innerWidth` at the top level) -- the server import crashes; guard with dynamic import or lazy initialization; see `fw-nextjs` for Next.js dynamic import patterns

### CSS-in-JS SSR Configuration
<!-- activation: keywords=["styled-components", "emotion", "ServerStyleSheet", "extractCritical", "createCache", "css-in-js"] -->

- [ ] **Missing SSR style extraction**: flag styled-components without `ServerStyleSheet` or emotion without `extractCritical`/`createEmotionServer` in the SSR pipeline -- CSS-in-JS libraries generate styles at runtime; without SSR extraction, the server HTML has no styles and the client adds them, causing a flash of unstyled content and potential hydration mismatch
- [ ] **Class name mismatch**: flag CSS-in-JS setups where server and client generate different class name hashes -- this typically happens when the server and client bundles have different module evaluation orders; ensure consistent babel/SWC plugin configuration

### Suspense Boundaries and Client-Only Content
<!-- activation: keywords=["Suspense", "lazy", "fallback", "client-only", "ClientOnly", "suppressHydrationWarning"] -->

- [ ] **Missing Suspense for client-only**: flag client-only content (browser API dependent, user-specific, locale-dependent) rendered without a Suspense boundary or `suppressHydrationWarning` -- wrap in `<Suspense fallback={<Skeleton />}>` with a client component that renders the dynamic content
- [ ] **suppressHydrationWarning overuse**: flag `suppressHydrationWarning` used broadly on container elements -- this suppresses legitimate mismatch errors; use it only on the specific element with an expected mismatch (e.g., a timestamp)
- [ ] **Third-party DOM modification**: flag third-party scripts (analytics, A/B testing, chat widgets) loaded before hydration that inject DOM nodes into the React root -- these injected nodes cause hydration mismatches; load third-party scripts after hydration via useEffect or script strategy

## Common False Positives

- **suppressHydrationWarning on timestamps**: intentional use of suppressHydrationWarning on a single time display element is the correct pattern for live timestamps.
- **Client-only components with proper Suspense**: components wrapped in Suspense with a fallback that matches the server-rendered HTML are handling the mismatch correctly.
- **useEffect for client-only state**: reading window.innerWidth inside useEffect and updating state is the correct pattern -- the initial render matches the server, and the effect updates after hydration.
- **Next.js dynamic with ssr: false**: `dynamic(() => import('./Component'), { ssr: false })` is the correct Next.js pattern for client-only components.

## Severity Guidance

| Finding | Severity |
|---|---|
| Browser API crash during SSR (window is not defined) | Critical |
| Hydration mismatch causing full client re-render (discards SSR HTML) | Critical |
| Date/time locale mismatch in user-visible content | Important |
| Random ID generation without useId | Important |
| CSS-in-JS without SSR style extraction | Important |
| typeof window conditional in render path | Minor |
| Third-party script modifying DOM before hydration | Minor |
| suppressHydrationWarning on broad container | Minor |

## See Also

- `fe-ssr-csr-ssg-isr-islands` -- rendering strategy choice determines where hydration mismatches occur
- `fw-react` -- React hooks (useEffect, useId) are the primary tools for avoiding hydration mismatches
- `fw-nextjs` -- Next.js server/client component boundary is the most common source of hydration issues
- `fe-core-web-vitals-lighthouse` -- hydration mismatch causing full re-render degrades LCP and CLS

## Authoritative References

- [React Documentation -- "Hydration"](https://react.dev/reference/react-dom/client/hydrateRoot)
- [React Documentation -- "useId"](https://react.dev/reference/react/useId)
- [Next.js Documentation -- "Client Components"](https://nextjs.org/docs/app/building-your-application/rendering/client-components)
- [Josh Comeau -- "The Perils of Rehydration"](https://www.joshwcomeau.com/react/the-perils-of-rehydration/)
- [Vue Documentation -- "SSR Hydration Mismatch"](https://vuejs.org/guide/scaling-up/ssr.html#hydration-mismatch)
