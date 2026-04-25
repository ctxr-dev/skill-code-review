---
id: fw-qwik
type: primary
depth_role: leaf
focus: "Detect Qwik-specific pitfalls around resumability, serialization boundaries, lazy-loading closures, and server/client context mismatches."
parents:
  - index.md
covers:
  - useVisibleTask$ used for work that should run on the server via useTask$
  - Non-serializable values stored in useStore or useSignal breaking resumability
  - "Inline closures without $() wrapper preventing lazy loading"
  - "Large initial bundle defeating Qwik's resumability advantage"
  - routeLoader$ containing client-side-only logic
  - Missing error boundaries around components that may fail
  - "DOM access in server-side context (useTask$ without track)"
  - Form actions without server-side validation
  - QRL references crossing serialization boundary incorrectly
  - Eager component loading where lazy loading should apply
  - useResource$ without proper loading and error state handling
tags:
  - qwik
  - resumability
  - serialization
  - lazy-loading
  - qrl
  - frontend
  - ssr
  - qwikcity
activation:
  file_globs:
    - "**/*.tsx"
    - "**/qwik.config.*"
  keyword_matches:
    - component$
    - useSignal
    - useStore
    - useTask$
    - useVisibleTask$
    - useResource$
    - "$()"
    - routeLoader$
    - routeAction$
    - Qwik
    - QwikCity
    - resumability
  structural_signals:
    - "@builder.io/qwik import"
    - QRL dollar-sign function syntax
    - Qwik City route loader or action
source:
  origin: file
  path: fw-qwik.md
  hash: "sha256:d1592db80ba83aeb6e1ca499a78d0032a1a882872669ce0b6de7bd8aa973cbb0"
---
# Qwik Framework Reviewer

## When This Activates

Activates when diffs contain Qwik imports (`@builder.io/qwik`, `@builder.io/qwik-city`) or Qwik-specific patterns (`component$`, `useSignal`, `useTask$`, `routeLoader$`). Qwik's resumability model fundamentally differs from hydration-based frameworks -- JavaScript is not re-executed on the client unless needed, and closures must be serializable to cross the server/client boundary. Violations silently break interactivity or defeat the performance model. This reviewer targets the unique detection heuristics arising from Qwik's lazy-loading and serialization architecture.

## Audit Surface

- [ ] useVisibleTask$ performing data fetching or computation that could run in useTask$
- [ ] useStore or useSignal holding functions, class instances, Maps, Sets, or Dates without serialization
- [ ] Inline arrow function passed to event handler without $() wrapper
- [ ] Top-level import of large library that should be dynamically imported behind $()
- [ ] routeLoader$ accessing window, document, localStorage, or other browser-only APIs
- [ ] Component tree without ErrorBoundary wrapping fallible async operations
- [ ] useTask$ callback accessing document or window without isServer guard
- [ ] routeAction$ or form handler missing zod/valibot validation on server
- [ ] Component closing over large scope captured into QRL serialization
- [ ] Synchronous heavy computation in component body blocking resumability
- [ ] useResource$ consumer rendering without checking resource.loading or resource.error
- [ ] Event handler referencing component-scoped variable not declared with useSignal/useStore
- [ ] Qwik City layout loading data that should be fetched in child route loaders
- [ ] Missing server$ boundary for code that must not ship to the client

## Detailed Checks

### Resumability and Lazy Loading
<!-- activation: keywords=["component$", "$()", "import(", "useVisibleTask$", "useTask$", "QRL", "qrl", "lazy"] -->

- [ ] **useVisibleTask$ overuse**: flag `useVisibleTask$` used for data fetching, state initialization, or computation that does not depend on DOM visibility -- `useVisibleTask$` forces eager JavaScript download and execution on the client; use `useTask$` (runs on server during SSR) or `routeLoader$` (runs before render) instead
- [ ] **Missing $() on closures**: flag inline functions passed to component props, event handlers, or callbacks that are not wrapped in `$()` -- without the dollar-sign suffix, the closure and its entire scope are bundled into the parent chunk, defeating lazy loading; e.g., `onClick={() => handleClick()}` should be `onClick$={() => handleClick()}`
- [ ] **Large top-level imports**: flag top-level `import { heavyLib } from 'heavy-lib'` in component files -- Qwik cannot lazy-load these; move heavy dependencies behind `$()` closures or `import()` so they load only when the code path executes
- [ ] **Eager component patterns**: flag component bodies with significant synchronous computation (sorting large arrays, complex object construction) -- this code runs during resumability; defer heavy work to `useTask$` or `useVisibleTask$` with explicit triggers

### Serialization Boundary
<!-- activation: keywords=["useStore", "useSignal", "noSerialize", "serialize", "QRL", "JSON", "mutable"] -->

- [ ] **Non-serializable store values**: flag `useStore` or `useSignal` initialized with functions, class instances, `Map`, `Set`, `Date`, `RegExp`, DOM nodes, or `Promise` -- these cannot survive serialization across the server/client boundary; use `noSerialize()` to exclude them or restructure to use serializable primitives
- [ ] **Closure scope capture**: flag `$()` closures that reference large objects, arrays, or deeply nested state from the enclosing scope -- everything referenced is serialized into the HTML; capture only the minimal data needed
- [ ] **Missing noSerialize**: flag cases where non-serializable values (third-party library instances, event emitters, WebSocket connections) are stored in reactive state without `noSerialize()` wrapper -- this causes runtime serialization errors or silent data loss
- [ ] **QRL referencing mutable outer scope**: flag `$()` functions that read and write variables declared with `let` or `var` in the component body -- these variables are not serialized; after resumability, the closure sees the initial value, not the mutated one; use `useSignal` or `useStore` instead

### Server/Client Context
<!-- activation: keywords=["routeLoader$", "routeAction$", "server$", "isServer", "isBrowser", "window", "document", "localStorage", "sessionStorage"] -->

- [ ] **Browser API in server context**: flag `routeLoader$`, `routeAction$`, `server$`, or `useTask$` (without `{ isServer: false }`) callbacks that access `window`, `document`, `localStorage`, `sessionStorage`, or other browser-only APIs -- these run on the server during SSR and will throw
- [ ] **Server-only code leaking to client**: flag sensitive logic (API keys, database queries, internal URLs) in component bodies or `$()` closures instead of `server$` functions -- component code ships to the client; use `server$` to keep logic server-side
- [ ] **routeLoader$ with client-side effects**: flag `routeLoader$` that sets cookies via document.cookie, manipulates DOM, or triggers client-side navigation -- route loaders run on the server; use `useVisibleTask$` or event handlers for client-side effects
- [ ] **Missing isServer guard in useTask$**: flag `useTask$` callbacks that perform environment-specific work without checking `isServer`/`isBrowser` -- `useTask$` runs on both server (during SSR) and client (on re-render); guard environment-specific code

### Form Actions and Validation
<!-- activation: keywords=["routeAction$", "Form", "formData", "zod", "valibot", "z.object", "action", "globalAction$"] -->

- [ ] **Unvalidated form actions**: flag `routeAction$` handlers that access `formData` fields without schema validation (zod, valibot, or equivalent) -- trusting raw form data enables injection and type confusion attacks; always validate server-side
- [ ] **Client-only validation**: flag forms that validate only in the browser (HTML5 attributes, JavaScript validation) without corresponding `routeAction$` validation -- client validation is bypassable; the server must validate independently
- [ ] **Missing action error handling**: flag `routeAction$` that does not return error state on validation failure or does not check `action.value?.failed` in the component -- users see no feedback on server rejection
- [ ] **globalAction$ without CSRF consideration**: flag `globalAction$` used for state-mutating operations without verifying that Qwik City's built-in CSRF protection is active -- ensure the form submits via Qwik's `<Form>` component, which includes the token

### Error Handling and Boundaries
<!-- activation: keywords=["ErrorBoundary", "useResource$", "error", "catch", "fallback", "try"] -->

- [ ] **Missing ErrorBoundary**: flag component subtrees containing `useResource$`, `routeLoader$` data access, or dynamic imports without an `<ErrorBoundary>` ancestor -- unhandled errors crash the entire application instead of isolating the failure
- [ ] **useResource$ without loading/error state**: flag components that render `resource.value` without checking `resource.loading` or `resource.error` -- during loading, value is undefined; on error, the component renders stale or broken data
- [ ] **Silent catch in server functions**: flag `server$` or `routeAction$` with `try/catch` that swallows errors without returning failure state -- the client receives undefined success instead of actionable error information

## Common False Positives

- **useVisibleTask$ for DOM measurement**: `useVisibleTask$` is the correct choice when the task genuinely needs DOM access (measuring element dimensions, initializing a canvas, attaching a third-party DOM library). Do not flag these.
- **noSerialize for intentional client-only state**: using `noSerialize()` for WebSocket connections, animation frames, or third-party SDK instances is the designed pattern. Flag only when serializable alternatives exist and the value is expected to survive SSR.
- **Small closures without $()**: Qwik's optimizer automatically wraps some inline handlers. The ESLint plugin is the authoritative source for whether `$()` is needed. Do not flag if the optimizer handles it.
- **Component body with light computation**: simple variable declarations, destructuring of props, or short conditional logic in the component body is fine. Flag only heavy synchronous computation.

## Severity Guidance

| Finding | Severity |
|---|---|
| Sensitive data (API keys, DB credentials) in component body instead of server$ | Critical |
| routeAction$ processing form data without server-side validation | Critical |
| Non-serializable value in useStore without noSerialize (runtime crash on resume) | Critical |
| useVisibleTask$ for data fetching that should be routeLoader$ or useTask$ | Important |
| Missing $() on event handler closure (breaks lazy loading) | Important |
| Browser API access in routeLoader$ or server context | Important |
| Large library imported at top level defeating lazy loading | Important |
| useResource$ rendered without loading or error state | Important |
| Missing ErrorBoundary around async component subtree | Minor |
| Component body with moderate synchronous computation | Minor |
| Closure capturing more scope than necessary into QRL | Minor |

## See Also

- `fw-react` -- React's hydration model is the baseline Qwik's resumability replaces; understanding hydration cost motivates Qwik's constraints
- `fw-astro` -- Astro's island architecture shares Qwik's goal of minimal client JS; compare client:* directives with Qwik's automatic lazy loading
- `fw-solidjs` -- SolidJS and Qwik both avoid virtual DOM re-rendering; SolidJS has fine-grained reactivity without serialization constraints
- `sec-xss-dom` -- server$ boundaries and routeAction$ validation prevent injection; innerHTML in Qwik templates has the same risks as other frameworks
- `perf-startup-cold-start` -- Qwik's resumability eliminates hydration cost, but non-serializable state and useVisibleTask$ overuse reintroduce it

## Authoritative References

- [Qwik Documentation -- Reactivity](https://qwik.dev/docs/components/state/)
- [Qwik Documentation -- Serialization](https://qwik.dev/docs/concepts/resumable/#serialization)
- [Qwik Documentation -- Dollar Sign ($)](https://qwik.dev/docs/advanced/dollar/)
- [Qwik City Documentation -- Route Loaders and Actions](https://qwik.dev/docs/route-loader/)
- [Misko Hevery -- "Resumability vs Hydration" (Qwik blog)](https://www.builder.io/blog/resumability-vs-hydration)
- [eslint-plugin-qwik -- Rules Reference](https://github.com/QwikDev/qwik/tree/main/packages/eslint-plugin-qwik)
