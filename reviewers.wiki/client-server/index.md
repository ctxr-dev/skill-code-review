---
id: client-server
type: index
depth_role: subcategory
depth: 1
focus: "Large component files exceeding 300 lines mixing concerns; $effect without cleanup causing stacked side effects or memory leaks; API routes without authentication or authorization checks; Accessing signal value outside reactive context (reads once, never updates)"
parents:
  - "../index.md"
shared_covers: []
entries:
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
  - id: fw-angular
    file: fw-angular.md
    type: primary
    focus: Detect Angular-specific pitfalls in change detection, RxJS subscription management, template security, and module architecture.
    tags:
      - angular
      - rxjs
      - change-detection
      - zonejs
      - typescript
      - frontend
      - spa
      - memory-leak
  - id: fw-astro
    file: fw-astro.md
    type: primary
    focus: "Detect Astro-specific pitfalls in island hydration directives, static/dynamic rendering mismatches, content collection misuse, and unnecessary client-side JavaScript."
    tags:
      - astro
      - islands
      - ssg
      - ssr
      - hydration
      - content-collections
      - performance
      - frontend
      - mpa
  - id: fw-nestjs
    file: fw-nestjs.md
    type: primary
    focus: Detect NestJS-specific pitfalls in dependency injection, validation pipes, guards, interceptors, module architecture, and decorator usage that cause security gaps, circular dependencies, or architectural violations.
    tags:
      - nestjs
      - dependency-injection
      - validation
      - guards
      - interceptors
      - modules
      - decorators
      - typescript
      - backend
      - enterprise
  - id: fw-nextjs
    file: fw-nextjs.md
    type: primary
    focus: "Detect Next.js-specific pitfalls in server/client component boundaries, data fetching, caching, middleware, and security that cause bundle bloat, data leaks, or misconfigured rendering strategies."
    tags:
      - nextjs
      - server-components
      - client-components
      - app-router
      - pages-router
      - ssr
      - ssg
      - isr
      - middleware
      - server-actions
      - frontend
      - csr
      - islands
      - rendering-strategy
      - hydration
      - seo
  - id: fw-qwik
    file: fw-qwik.md
    type: primary
    focus: "Detect Qwik-specific pitfalls around resumability, serialization boundaries, lazy-loading closures, and server/client context mismatches."
    tags:
      - qwik
      - resumability
      - serialization
      - lazy-loading
      - qrl
      - frontend
      - ssr
      - qwikcity
  - id: fw-react
    file: fw-react.md
    type: primary
    focus: Detect React-specific pitfalls in hooks, rendering, memoization, and component design that cause bugs, memory leaks, or unnecessary re-renders.
    tags:
      - react
      - hooks
      - jsx
      - tsx
      - re-render
      - memoization
      - error-boundary
      - suspense
      - frontend
  - id: fw-solidjs
    file: fw-solidjs.md
    type: primary
    focus: Detect SolidJS reactivity pitfalls including broken signal tracking from destructuring, misuse of reactive primitives, and rendering anti-patterns.
    tags:
      - solidjs
      - reactivity
      - fine-grained
      - signals
      - jsx
      - frontend
      - spa
  - id: fw-svelte-sveltekit
    file: fw-svelte-sveltekit.md
    type: primary
    focus: "Detect Svelte 5 and SvelteKit pitfalls in reactivity, lifecycle, form handling, and server/client boundaries that cause bugs, XSS, or incorrect rendering."
    tags:
      - svelte
      - sveltekit
      - runes
      - reactivity
      - ssr
      - form-actions
      - load-functions
      - frontend
  - id: fw-vue-nuxt
    file: fw-vue-nuxt.md
    type: primary
    focus: Detect Vue 3 and Nuxt 3 pitfalls in reactivity, component design, composables, and server-side rendering that cause subtle bugs, XSS, or performance degradation.
    tags:
      - vue
      - nuxt
      - composition-api
      - reactivity
      - pinia
      - single-file-component
      - ssr
      - composables
      - frontend
  - id: mob-react-native
    file: mob-react-native.md
    type: primary
    focus: Detect bridge overhead from frequent native calls, large state serialization on the JS thread, missing native module error handling, missing Hermes optimization, and navigation memory leaks in React Native.
    tags:
      - react-native
      - mobile
      - bridge
      - hermes
      - navigation
      - flatlist
      - performance
      - native-module
      - cross-platform
      - javascript
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Client Server

**Focus:** Large component files exceeding 300 lines mixing concerns; $effect without cleanup causing stacked side effects or memory leaks; API routes without authentication or authorization checks; Accessing signal value outside reactive context (reads once, never updates)

## Children

| File | Type | Focus |
|------|------|-------|
| [fe-data-react-query-swr-apollo-relay-urql.md](fe-data-react-query-swr-apollo-relay-urql.md) | 📄 primary | Detect data-fetching pitfalls across React Query, SWR, Apollo Client, Relay, and urql including cache invalidation bugs, missing error states, and overfetching. |
| [fe-hydration-mismatch.md](fe-hydration-mismatch.md) | 📄 primary | Detect server/client HTML mismatches that cause hydration errors, including date/time locale differences, random ID generation, browser-only API usage during SSR, and missing Suspense boundaries. |
| [fe-state-redux-zustand-mobx-jotai-recoil-pinia.md](fe-state-redux-zustand-mobx-jotai-recoil-pinia.md) | 📄 primary | Detect state management anti-patterns across Redux, Zustand, MobX, Jotai, Recoil, and Pinia that cause unnecessary re-renders, stale data, or unmaintainable state shapes. |
| [fw-angular.md](fw-angular.md) | 📄 primary | Detect Angular-specific pitfalls in change detection, RxJS subscription management, template security, and module architecture. |
| [fw-astro.md](fw-astro.md) | 📄 primary | Detect Astro-specific pitfalls in island hydration directives, static/dynamic rendering mismatches, content collection misuse, and unnecessary client-side JavaScript. |
| [fw-nestjs.md](fw-nestjs.md) | 📄 primary | Detect NestJS-specific pitfalls in dependency injection, validation pipes, guards, interceptors, module architecture, and decorator usage that cause security gaps, circular dependencies, or architectural violations. |
| [fw-nextjs.md](fw-nextjs.md) | 📄 primary | Detect Next.js-specific pitfalls in server/client component boundaries, data fetching, caching, middleware, and security that cause bundle bloat, data leaks, or misconfigured rendering strategies. |
| [fw-qwik.md](fw-qwik.md) | 📄 primary | Detect Qwik-specific pitfalls around resumability, serialization boundaries, lazy-loading closures, and server/client context mismatches. |
| [fw-react.md](fw-react.md) | 📄 primary | Detect React-specific pitfalls in hooks, rendering, memoization, and component design that cause bugs, memory leaks, or unnecessary re-renders. |
| [fw-solidjs.md](fw-solidjs.md) | 📄 primary | Detect SolidJS reactivity pitfalls including broken signal tracking from destructuring, misuse of reactive primitives, and rendering anti-patterns. |
| [fw-svelte-sveltekit.md](fw-svelte-sveltekit.md) | 📄 primary | Detect Svelte 5 and SvelteKit pitfalls in reactivity, lifecycle, form handling, and server/client boundaries that cause bugs, XSS, or incorrect rendering. |
| [fw-vue-nuxt.md](fw-vue-nuxt.md) | 📄 primary | Detect Vue 3 and Nuxt 3 pitfalls in reactivity, component design, composables, and server-side rendering that cause subtle bugs, XSS, or performance degradation. |
| [mob-react-native.md](mob-react-native.md) | 📄 primary | Detect bridge overhead from frequent native calls, large state serialization on the JS thread, missing native module error handling, missing Hermes optimization, and navigation memory leaks in React Native. |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
