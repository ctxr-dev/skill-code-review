---
id: fw-svelte-sveltekit
type: primary
depth_role: leaf
focus: "Detect Svelte 5 and SvelteKit pitfalls in reactivity, lifecycle, form handling, and server/client boundaries that cause bugs, XSS, or incorrect rendering."
parents:
  - index.md
covers:
  - $effect without cleanup causing stacked side effects or memory leaks
  - "Reactive statements ($derived, $effect) with unintended side effects"
  - Store subscriptions missing auto-unsubscribe via $ prefix in legacy Svelte 4 code
  - "{@html} directive rendering user-controlled input enabling XSS"
  - Missing +error.svelte boundary pages for crash recovery
  - SvelteKit load functions containing client-only logic that fails during SSR
  - Missing form actions for mutations relying on client-side fetch instead
  - Large component files exceeding 300 lines mixing concerns
  - "bind: on inputs without validation allowing malformed data propagation"
  - Missing preload and prefetch hints on navigational links
  - Server-only code leaking into the client bundle
  - Missing +page.server.ts for sensitive data fetching
tags:
  - svelte
  - sveltekit
  - runes
  - reactivity
  - ssr
  - form-actions
  - load-functions
  - frontend
activation:
  file_globs:
    - "**/*.svelte"
    - "**/svelte.config.*"
    - "**/*.svelte.ts"
  keyword_matches:
    - $state
    - $derived
    - $effect
    - $props
    - $bindable
    - onMount
    - onDestroy
    - load
    - +page
    - +layout
    - +server
    - +error
    - SvelteKit
  structural_signals:
    - $effect without cleanup
    - "{@html} with user data"
    - Missing +error.svelte
    - Server code in client bundle
source:
  origin: file
  path: fw-svelte-sveltekit.md
  hash: "sha256:346a788dcb23a18614b409b871af54bc1551e1afcbfbeeac74d9f94f5f490b39"
---
# Svelte 5 / SvelteKit Reactivity and Routing Pitfalls

## When This Activates

Activates when diffs touch Svelte components, SvelteKit route files (+page, +layout, +server, +error), or Svelte configuration. Svelte 5's runes ($state, $derived, $effect) replace Svelte 4's reactive declarations with explicit primitives that have their own correctness rules -- $effect requires manual cleanup, $derived must be pure, and $state has different mutation semantics for objects vs primitives. SvelteKit adds load functions, form actions, and a server/client boundary that mirrors but differs from Next.js. This reviewer catches patterns specific to the Svelte compilation model and SvelteKit's file-based routing.

## Audit Surface

- [ ] $effect() callback that registers addEventListener, setInterval, or external subscription without returning a cleanup function
- [ ] $derived() expression with side effects (API calls, DOM mutations, logging)
- [ ] Svelte 4 store imported and used without $ auto-subscription prefix, requiring manual unsubscribe
- [ ] {@html variable} where variable traces to user input, API response, URL parameter, or any external source
- [ ] Route directory missing +error.svelte for error recovery UI
- [ ] SvelteKit load function in +page.ts accessing window, document, or localStorage without browser check
- [ ] Form submission handled via client-side fetch() instead of SvelteKit form actions
- [ ] Single .svelte file exceeding 300 lines of script + markup + style
- [ ] bind:value on input without validation in the bound variable's consumer
- [ ] Navigation links without data-sveltekit-preload-data or data-sveltekit-preload-code
- [ ] Import from $lib/server or +server.ts file referenced in client-side code
- [ ] +page.ts load function fetching sensitive data that should be in +page.server.ts
- [ ] $state object mutated in place where reassignment is needed for reactivity on primitives
- [ ] onMount callback without corresponding onDestroy for cleanup
- [ ] $effect.pre() used where $derived would express the same computation purely
- [ ] Missing PageData type import causing untyped load function return

## Detailed Checks

### Runes Reactivity Correctness (Svelte 5)
<!-- activation: keywords=["$state", "$derived", "$effect", "$props", "$bindable", "$inspect", "$effect.pre", "runes"] -->

- [ ] **$effect without cleanup**: flag `$effect(() => { element.addEventListener(...) })` or `$effect(() => { const id = setInterval(...) })` that does not return a cleanup function -- $effect re-runs on dependency changes and on component destruction; without cleanup, registrations stack; see `perf-memory-gc`
- [ ] **$derived with side effects**: flag `$derived()` expressions that call fetch(), mutate other $state variables, write to localStorage, or perform DOM manipulation -- $derived must be a pure computation; the compiler may re-evaluate it multiple times or skip evaluation; side effects belong in $effect
- [ ] **$state primitive reassignment**: flag `let count = $state(0); count = count + 1` patterns that may confuse developers expecting `count` to remain the same reference -- this is correct in Svelte 5, but verify the component is not passing `count` as a prop to a child expecting reactivity (use $bindable or callbacks instead)
- [ ] **$effect.pre where $derived suffices**: flag `$effect.pre(() => { derivedValue = compute(source) })` -- if the effect only computes a value from reactive sources without side effects, use `$derived()` for clearer intent and compiler optimization
- [ ] **Missing $effect dependency awareness**: unlike React's dependency arrays, Svelte 5 $effect auto-tracks dependencies -- but flag $effect callbacks that read from non-reactive sources (plain variables, module-level state) expecting them to trigger re-runs

### Legacy Store Patterns (Svelte 4)
<!-- activation: keywords=["writable", "readable", "derived", "subscribe", "unsubscribe", "$:", "store", "get("] -->

- [ ] **Manual subscribe without unsubscribe**: flag `store.subscribe(callback)` without storing and calling the unsubscribe function in onDestroy -- in Svelte components, use the `$store` auto-subscription syntax which automatically unsubscribes on component destruction
- [ ] **Missing $ prefix**: flag `store.set(value)` or `get(store)` in component script when `$store = value` or reading `$store` would auto-manage the subscription lifecycle
- [ ] **Reactive statement side effects (Svelte 4)**: flag `$: { fetch(url) }` or `$: { document.title = value }` -- reactive statements ($:) should derive values; side effects should use afterUpdate or explicit event handlers

### Template Security: {@html} and XSS
<!-- activation: keywords=["{@html", "innerHTML", "sanitize", "DOMPurify", "xss", "marked", "markdown"] -->

- [ ] **{@html} with user data**: flag `{@html variable}` where the variable traces to user input, form data, API response, URL parameter, or any external source without DOMPurify or equivalent sanitization -- {@html} inserts raw HTML with no built-in sanitization; see `sec-xss-dom` for comprehensive sink analysis
- [ ] **{@html} with markdown**: flag markdown-to-HTML libraries (marked, markdown-it, unified/rehype) piped into {@html} without a sanitization step -- crafted markdown can produce executable HTML
- [ ] **Anchor href with user data**: flag `<a href={userInput}>` without validating the URL scheme -- `javascript:` URLs execute code on click; validate against http(s) allowlist

### SvelteKit Load Functions and Server Boundary
<!-- activation: keywords=["load", "+page.ts", "+page.server.ts", "+layout.ts", "+layout.server.ts", "PageLoad", "PageServerLoad", "LayoutLoad", "LayoutServerLoad", "depends", "invalidate", "fetch"] -->

- [ ] **Client-only code in universal load**: flag +page.ts or +layout.ts load functions that access window, document, localStorage, or other browser-only APIs -- universal load functions run during SSR; use +page.server.ts for server-only logic or guard with `if (browser)` from `$app/environment`
- [ ] **Sensitive data in universal load**: flag +page.ts load functions that access secrets, database connections, or internal services -- universal load runs on both server and client; sensitive data fetching belongs in +page.server.ts which never ships to the client
- [ ] **Server module imported client-side**: flag imports from `$lib/server/` or direct imports of +server.ts endpoints in client-side code -- SvelteKit's module system enforces this boundary but incorrect dynamic imports or barrel exports can bypass it
- [ ] **Missing typed return**: flag load functions without TypeScript return type annotation or PageData type usage -- untyped load functions make it easy to return the wrong shape and cause runtime errors in the consuming page component

### Form Actions and Mutations
<!-- activation: keywords=["form", "action", "enhance", "use:enhance", "+page.server.ts", "fail", "redirect", "superforms"] -->

- [ ] **Client-side fetch for mutations**: flag form submissions handled via `on:submit|preventDefault` + `fetch()` instead of SvelteKit form actions -- form actions provide progressive enhancement (work without JavaScript), built-in CSRF protection, and structured error handling via `fail()`
- [ ] **Form action without validation**: flag form actions in +page.server.ts that use `request.formData()` values without validation (Zod, Valibot, or manual checks) -- form data is user-controlled; treat all inputs as untrusted
- [ ] **Missing use:enhance**: flag `<form method="POST">` without `use:enhance` -- without enhance, form submissions cause full-page navigation; use:enhance provides SPA-like behavior with progressive enhancement

### Route Boundaries and Error Handling
<!-- activation: keywords=["+error", "+layout", "+page", "error", "notFound", "handleError", "hooks.server"] -->

- [ ] **Missing +error.svelte**: flag route directories that contain +page.svelte but no +error.svelte at any ancestor level -- unhandled errors in load functions or components will show SvelteKit's default error page instead of a branded recovery UI
- [ ] **Missing +layout.svelte error isolation**: flag layouts that render dynamic child content without an error boundary -- an error in a child page crashes the entire layout; consider +error.svelte at the layout level
- [ ] **handleError not implemented**: flag hooks.server.ts without a handleError export -- unhandled errors in server load functions return a generic 500; handleError allows logging and custom error shaping

### Component Structure and Binding
<!-- activation: keywords=["bind:", "<script", "<style", "export let", "$props", "component", "snippet", "render"] -->

- [ ] **bind: without validation**: flag `bind:value={variable}` on input elements where the bound variable flows into security-sensitive operations (SQL queries, shell commands, API parameters) without validation -- bind propagates any user input directly into the reactive variable
- [ ] **Large component file**: flag .svelte files exceeding 300 lines across script + markup + style -- extract logic into .svelte.ts modules, child components, or utility functions; see `principle-separation-of-concerns`
- [ ] **Missing prefetch on navigation**: flag internal `<a href="/path">` links without `data-sveltekit-preload-data` or `data-sveltekit-preload-code` attributes in performance-critical navigation paths -- prefetching starts the load function on hover, reducing perceived latency; see `perf-startup-cold-start` for cold navigation patterns

## Common False Positives

- **{@html} with static content**: `{@html '<br />'}` with a compile-time constant string literal is safe; no user data flows into the sink.
- **$effect for browser API setup**: `$effect(() => { const observer = new IntersectionObserver(...); return () => observer.disconnect() })` with proper cleanup is correct usage; do not flag effects that return cleanup functions.
- **bind:value on controlled forms**: `bind:value` on form inputs validated before submission is standard Svelte practice; only flag when the bound value is consumed without any validation.
- **+page.ts for public data**: universal load functions fetching public API data (not secrets) that benefits from client-side caching are a legitimate use of +page.ts over +page.server.ts.
- **Missing +error.svelte with root-level handler**: if a +error.svelte exists at the root layout level, nested routes inherit it; do not flag every route individually.
- **Manual subscribe in non-component code**: `.subscribe()` in a .ts utility file (not a .svelte component) requires manual unsubscribe since $ prefix is component-only syntax.

## Severity Guidance

| Finding | Severity |
|---|---|
| {@html} with unsanitized user input or API data | Critical |
| Sensitive data (secrets, DB access) in universal +page.ts load function | Critical |
| Server-only module imported in client-side code | Critical |
| Form action processing user input without validation | Critical |
| $effect without cleanup for subscriptions/timers (memory leak) | Important |
| $derived with side effects (unpredictable re-evaluation) | Important |
| Client-only API (window, document) in universal load function (SSR crash) | Important |
| Store subscription without unsubscribe in Svelte 4 code | Important |
| Missing +error.svelte at any route hierarchy level | Important |
| bind:value flowing into security-sensitive operation without validation | Important |
| Client-side fetch for mutations instead of form actions | Minor |
| Large component exceeding 300 lines | Minor |
| Missing data-sveltekit-preload-data on navigation links | Minor |
| Missing use:enhance on form element | Minor |

## See Also

- `sec-xss-dom` -- {@html} is a DOM XSS sink; see full source-to-sink taint analysis
- `perf-memory-gc` -- $effect and onMount cleanup failures are the Svelte manifestation of event listener and timer leaks
- `perf-startup-cold-start` -- SvelteKit preloading and code splitting interact with navigation cold-start latency
- `principle-separation-of-concerns` -- large Svelte components mixing data fetching, business logic, and rendering violate SoC
- `fw-react` -- React's useEffect cleanup parallels Svelte's $effect cleanup; similar leak patterns apply
- `fw-nextjs` -- SvelteKit's load functions and server/client boundary mirror Next.js patterns; cross-reference for shared SSR pitfalls

## Authoritative References

- [Svelte Documentation -- "Runes"](https://svelte.dev/docs/svelte/$state)
- [Svelte Documentation -- "$effect"](https://svelte.dev/docs/svelte/$effect)
- [SvelteKit Documentation -- "Loading Data"](https://svelte.dev/docs/kit/load)
- [SvelteKit Documentation -- "Form Actions"](https://svelte.dev/docs/kit/form-actions)
- [SvelteKit Documentation -- "Hooks"](https://svelte.dev/docs/kit/hooks)
- [Svelte Documentation -- "Security (XSS via {@html})"](https://svelte.dev/docs/svelte/special-tags#html)
