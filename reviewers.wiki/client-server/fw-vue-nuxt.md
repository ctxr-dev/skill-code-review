---
id: fw-vue-nuxt
type: primary
depth_role: leaf
focus: Detect Vue 3 and Nuxt 3 pitfalls in reactivity, component design, composables, and server-side rendering that cause subtle bugs, XSS, or performance degradation.
parents:
  - index.md
covers:
  - "reactive() applied to primitive values where ref() is required"
  - Direct mutation of props instead of emitting events to the parent
  - Missing cleanup for watchers and listeners registered in onMounted
  - "Computed properties with side effects (mutations, API calls, DOM manipulation)"
  - v-html directive bound to user-controlled data enabling XSS
  - "v-for without :key or with non-unique keys causing reconciliation bugs"
  - Excessive watchers where computed properties would suffice
  - Options API mixed with Composition API inconsistently in the same project
  - Pinia store state mutated outside of actions bypassing devtools tracking
  - Nuxt auto-imports creating implicit dependencies that break when extracted
  - Missing useFetch or useAsyncData for server-side data fetching in Nuxt
  - Large single-file components exceeding 300 lines mixing concerns
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
activation:
  file_globs:
    - "**/*.vue"
    - "**/nuxt.config.*"
  keyword_matches:
    - ref
    - reactive
    - computed
    - watch
    - watchEffect
    - onMounted
    - defineComponent
    - defineProps
    - defineEmits
    - composable
    - useAsyncData
    - useFetch
    - Pinia
    - Vuex
  structural_signals:
    - reactive on primitive
    - Prop mutation
    - v-html with user data
    - Missing watcher cleanup
source:
  origin: file
  path: fw-vue-nuxt.md
  hash: "sha256:7dca021e4f21e93ea2bc7004922708f8b7cd7658a1ac39e622afd6ab787a40e4"
---
# Vue 3 / Nuxt 3 Reactivity and Component Pitfalls

## When This Activates

Activates when diffs touch Vue single-file components, Nuxt configuration, or files using Vue's Composition API. Vue's reactivity system uses JavaScript Proxy objects with specific rules -- reactive() cannot wrap primitives, destructuring breaks reactivity, and ref values require .value access in script context. Nuxt adds SSR complexity with auto-imports, server-side data fetching, and hydration. This reviewer detects patterns that silently break reactivity, introduce XSS vulnerabilities, or misuse Nuxt's rendering model.

## Audit Surface

- [ ] reactive() called with a string, number, boolean, or null argument
- [ ] Assignment to a prop (props.name = value) or mutation of a prop object (props.list.push(item))
- [ ] onMounted callback registering addEventListener, setInterval, or external subscriptions with no onUnmounted cleanup
- [ ] computed() callback containing fetch(), emit(), state mutation, or DOM manipulation
- [ ] v-html directive bound to any reactive variable sourced from user input, API response, or URL parameter
- [ ] v-for rendering a list without :key attribute or with :key set to the loop index on a dynamic list
- [ ] watch() or watchEffect() used where a computed property would express the same derivation without side effects
- [ ] Single .vue file using both Options API (data, methods, computed) and Composition API (setup, ref, computed)
- [ ] Pinia store state property modified via direct assignment outside an action method
- [ ] Component using a Nuxt auto-imported composable without explicit import
- [ ] Nuxt page or component fetching data via onMounted + fetch instead of useFetch or useAsyncData
- [ ] Single-file component exceeding 300 lines of script + template + style
- [ ] ref() value accessed without .value in script (template auto-unwraps, script does not)
- [ ] Destructuring reactive object losing reactivity
- [ ] toRefs() or toRef() not used when spreading reactive state into a composable return

## Detailed Checks

### Reactivity System Correctness
<!-- activation: keywords=["ref", "reactive", "computed", "toRefs", "toRef", "shallowRef", "shallowReactive", "triggerRef", "unref", "isRef", "isReactive"] -->

- [ ] **reactive() on primitive**: flag `reactive('string')`, `reactive(42)`, `reactive(true)`, or `reactive(null)` -- reactive() only works with objects, arrays, Maps, and Sets; primitives require ref(); the call silently returns a non-reactive value
- [ ] **Destructuring reactive**: flag `const { x, y } = reactive({ x: 1, y: 2 })` -- destructuring extracts plain values, breaking the Proxy-based reactivity; use `toRefs()` to destructure while preserving reactivity
- [ ] **Missing .value in script**: flag `ref()` values read or written in `<script setup>` without `.value` -- templates auto-unwrap refs, but script context does not; the assignment `myRef = newValue` silently replaces the ref itself, not its value
- [ ] **Composable returning reactive without toRefs**: flag composables returning a reactive object where callers destructure the result -- the caller loses reactivity; return `toRefs(state)` or individual `ref()` values instead
- [ ] **shallowRef with nested mutation**: flag `shallowRef({ nested: { value: 1 } })` where `state.value.nested.value = 2` is used -- shallow refs do not track nested changes; use triggerRef() after mutation or use ref() for deep reactivity

### Prop Discipline
<!-- activation: keywords=["defineProps", "props", "emit", "defineEmits", "v-model", "modelValue", "update:"] -->

- [ ] **Prop mutation**: flag direct assignment to a prop (`props.name = x`) or in-place mutation of a prop object/array (`props.items.push()`, `props.config.key = val`) -- props are one-way data flow; mutate via `emit('update:modelValue', newVal)` or maintain local state with watch
- [ ] **Missing prop validation**: flag defineProps using only type annotation without runtime validation where the prop value flows into security-sensitive operations (v-html, href binding, API call parameter)
- [ ] **Untyped emit**: flag `defineEmits(['submit'])` without TypeScript payload types -- untyped emits make parent components unable to verify the event contract at compile time

### Watcher and Lifecycle Cleanup
<!-- activation: keywords=["watch", "watchEffect", "onMounted", "onUnmounted", "onBeforeUnmount", "addEventListener", "setInterval", "subscribe"] -->

- [ ] **Watch without cleanup**: flag `watch()` or `watchEffect()` that register side effects (event listeners, timers, subscriptions) without using the `onCleanup` parameter or a corresponding `onUnmounted` cleanup -- each watch execution stacks registrations; see `perf-memory-gc` for general leak patterns
- [ ] **onMounted without onUnmounted**: flag `onMounted()` registering addEventListener, setInterval, WebSocket connections, or third-party library initialization without a paired `onUnmounted()` or `onBeforeUnmount()` that cleans up
- [ ] **Computed with side effects**: flag `computed()` callbacks that call `emit()`, mutate ref values, trigger fetch requests, or manipulate the DOM -- computed properties should be pure derivations; side effects belong in watch() or event handlers
- [ ] **watchEffect running server-side**: flag `watchEffect()` in Nuxt components that accesses browser-only APIs (window, document) without a client-side guard -- watchEffect runs during SSR

### Template Security: v-html and XSS
<!-- activation: keywords=["v-html", "innerHTML", "sanitize", "DOMPurify", "xss", "marked", "markdown"] -->

- [ ] **v-html with user data**: flag `v-html="variable"` where the bound variable traces to user input, API response, URL parameter, or any external data source without DOMPurify or equivalent sanitization -- v-html renders raw HTML and is a direct XSS vector; see `sec-xss-dom` for comprehensive sink analysis
- [ ] **v-html with markdown output**: flag markdown-to-HTML conversion (marked, markdown-it) piped into v-html without sanitization -- markdown parsers can produce executable HTML from crafted input
- [ ] **Template interpolation in href**: flag `:href="userInput"` without validating the URL scheme -- `javascript:` URLs execute code on click; block non-http(s) schemes

### Nuxt SSR and Data Fetching
<!-- activation: keywords=["useFetch", "useAsyncData", "useLazyFetch", "useLazyAsyncData", "useRequestHeaders", "useNuxtApp", "defineNuxtPlugin", "defineNuxtRouteMiddleware", "server", "client", "ssr"] -->

- [ ] **Client-side fetch instead of useFetch**: flag Nuxt pages or components using `onMounted(() => { fetch(url) })` for data that should be server-rendered -- use `useFetch()` or `useAsyncData()` to fetch during SSR, avoiding hydration mismatch and improving initial load performance
- [ ] **Auto-import implicit dependency**: flag components relying on Nuxt auto-imported composables (useRoute, useState, useFetch, useRuntimeConfig) without explicit imports -- the component silently breaks when extracted to a non-Nuxt package or tested in isolation; add explicit imports for portability
- [ ] **useRuntimeConfig exposing secrets**: flag `useRuntimeConfig().public` containing values that should be server-only -- public runtime config is sent to the client; secrets belong in `useRuntimeConfig()` accessed only in server-side code
- [ ] **Missing useFetch key**: flag multiple `useFetch()` calls to the same URL with different parameters but no explicit `key` option -- without a unique key, responses can overwrite each other

### Pinia Store Discipline
<!-- activation: keywords=["Pinia", "defineStore", "storeToRefs", "Vuex", "store", "$patch", "action", "getter"] -->

- [ ] **State mutation outside action**: flag direct assignment to Pinia store state properties from components (`store.count = 5`) instead of calling an action -- direct mutations bypass devtools tracking, plugins, and middleware; use `store.$patch()` or define actions
- [ ] **Destructuring store losing reactivity**: flag `const { count } = store` from a Pinia store without `storeToRefs()` -- plain destructuring extracts non-reactive snapshots; use `const { count } = storeToRefs(store)`
- [ ] **Async logic in getters**: flag Pinia getters that perform async operations -- getters must be synchronous derived state; async logic belongs in actions

### Component Structure
<!-- activation: keywords=["<script", "<template", "<style", "defineComponent", "export default", "setup"] -->

- [ ] **Large SFC**: flag single-file components exceeding 300 lines across script + template + style combined -- extract composables for logic, child components for template segments, or utility modules for shared code; see `principle-separation-of-concerns`
- [ ] **Mixed API styles**: flag a codebase where some components use Options API and others use Composition API with no migration plan -- inconsistency increases cognitive load; standardize on one approach (Composition API for new code)
- [ ] **v-for without :key**: flag `v-for` directives with no `:key` attribute or with `:key="index"` on lists that can be reordered, filtered, or have component state -- missing or index-based keys cause incorrect DOM reuse and state preservation bugs

## Common False Positives

- **reactive() with object literal**: `reactive({ count: 0 })` is correct usage; only flag when the argument is a primitive.
- **Index key on static display lists**: `:key="index"` on a list that never reorders, filters, or maintains per-item state is acceptable.
- **v-html with static content**: `v-html="'<br>'"` with a compile-time constant string literal is safe.
- **Options API in legacy codebase**: existing components using Options API do not need immediate migration; flag only when new Composition API components are added alongside Options API without a stated migration strategy.
- **Direct store mutation in Pinia with $patch**: `store.$patch({ count: 5 })` is a supported mutation method with devtools tracking; do not flag as "mutation outside action."
- **Nuxt auto-imports in Nuxt-only code**: components that will only ever live in the Nuxt app directory do not need explicit imports for standard composables.

## Severity Guidance

| Finding | Severity |
|---|---|
| v-html with unsanitized user input or API data | Critical |
| Prop mutation causing silent data corruption in parent | Critical |
| reactive() on primitive (silently non-reactive) | Important |
| Destructuring reactive object losing reactivity | Important |
| Missing onUnmounted cleanup for listeners/timers registered in onMounted | Important |
| Computed with side effects (emit, fetch, state mutation) | Important |
| Client-side fetch in Nuxt where useFetch should be used (SSR mismatch) | Important |
| Pinia store state mutated outside actions | Minor |
| Missing .value access on ref in script context | Important |
| v-for without :key on dynamic list | Important |
| Large SFC exceeding 300 lines | Minor |
| Mixed Options/Composition API without migration plan | Minor |

## See Also

- `sec-xss-dom` -- v-html is a DOM XSS sink; see full source-to-sink taint analysis
- `perf-memory-gc` -- missing onUnmounted cleanup in Vue components is a framework-specific memory leak pattern
- `principle-separation-of-concerns` -- large SFCs mixing data fetching, business logic, and presentation violate SoC
- `fw-react` -- React's useEffect cleanup parallels Vue's onUnmounted; similar leak patterns apply
- `fw-nextjs` -- Nuxt's SSR model mirrors Next.js server/client boundaries; cross-reference for shared SSR pitfalls

## Authoritative References

- [Vue.js Documentation -- "Reactivity Fundamentals"](https://vuejs.org/guide/essentials/reactivity-fundamentals.html)
- [Vue.js Documentation -- "Composables"](https://vuejs.org/guide/reusability/composables.html)
- [Vue.js Documentation -- "Security"](https://vuejs.org/guide/best-practices/security.html)
- [Nuxt Documentation -- "Data Fetching"](https://nuxt.com/docs/getting-started/data-fetching)
- [Pinia Documentation -- "Defining a Store"](https://pinia.vuejs.org/core-concepts/)
- [Anthony Fu -- "Vue Reactivity Transform"](https://vuejs.org/guide/extras/reactivity-transform.html)
