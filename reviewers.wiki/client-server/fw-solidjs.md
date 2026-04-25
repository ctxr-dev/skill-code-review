---
id: fw-solidjs
type: primary
depth_role: leaf
focus: Detect SolidJS reactivity pitfalls including broken signal tracking from destructuring, misuse of reactive primitives, and rendering anti-patterns.
parents:
  - index.md
covers:
  - Destructuring props breaking SolidJS fine-grained reactivity
  - "Accessing signal value outside reactive context (reads once, never updates)"
  - createEffect without explicit dependency tracking or missing cleanup
  - Nested signal updates causing cascading re-computations
  - createResource without error handling or Suspense boundary
  - "Using array .map() instead of <For> component for list rendering"
  - "Index-based iteration via <Index> where keyed <For> is needed"
  - Large monolithic components without extraction
  - Missing ErrorBoundary around components that can throw
  - createMemo with side effects instead of createEffect
  - Signal setter called during render causing infinite loops
tags:
  - solidjs
  - reactivity
  - fine-grained
  - signals
  - jsx
  - frontend
  - spa
activation:
  file_globs:
    - "**/*.jsx"
    - "**/*.tsx"
  keyword_matches:
    - createSignal
    - createEffect
    - createMemo
    - createResource
    - Suspense
    - Show
    - For
    - Switch
    - Match
    - solid-js
    - solid-start
  structural_signals:
    - solid-js import statement
    - SolidJS control flow components in JSX
    - Signal primitive creation patterns
source:
  origin: file
  path: fw-solidjs.md
  hash: "sha256:43876ae4d49a8151086226d8317e664820b8e7571d57420b3f0c418f6492b76f"
---
# SolidJS Framework Reviewer

## When This Activates

Activates when diffs contain SolidJS imports (`solid-js`, `solid-start`) or SolidJS-specific primitives (`createSignal`, `createEffect`, `createMemo`, `createResource`). SolidJS uses fine-grained reactivity where signals are tracked at the call site -- destructuring props, reading signals outside tracked scopes, or using the wrong iteration component silently breaks reactivity. These bugs produce no errors; the UI simply stops updating. This reviewer targets the detection heuristics unique to SolidJS's compilation and reactivity model.

## Audit Surface

- [ ] Props destructured in function parameter instead of accessed as `props.name`
- [ ] Signal getter called outside of JSX, createEffect, createMemo, or other tracking scope
- [ ] createEffect with no explicit dependencies and no onCleanup for side effects
- [ ] createResource used without wrapping consumer in Suspense or checking .loading/.error
- [ ] Array .map() in JSX instead of `<For each={...}>` for dynamic lists
- [ ] `<Index>` used for lists where items are added/removed (should be `<For>`)
- [ ] Signal setter invoked synchronously during component body execution
- [ ] createMemo callback performing side effects (network calls, DOM manipulation)
- [ ] Component exceeding 150 lines without extracting sub-components
- [ ] Missing ErrorBoundary around Suspense or components using createResource
- [ ] Derived state recomputed in multiple places instead of consolidated in createMemo
- [ ] Store mutation via direct property assignment instead of produce or reconcile
- [ ] Event handler creating new closure on every render instead of using stable reference

## Detailed Checks

### Reactivity-Breaking Patterns
<!-- activation: keywords=["createSignal", "props", "mergeProps", "splitProps", "children(", "batch", "untrack"] -->

- [ ] **Destructured props**: flag component functions that destructure props in the parameter list (e.g., `function Comp({ name, onClick })`) -- this reads each prop value once at call time, breaking reactivity; use `props.name` or `splitProps`/`mergeProps` for default values
- [ ] **Signal read outside tracking scope**: flag signal getter calls (e.g., `const val = count()`) in the component body outside of JSX return, `createEffect`, `createMemo`, or `createComputed` -- the value is captured once and never updates; move the read into a tracked context
- [ ] **Early signal extraction**: flag patterns like `const data = resource()` at the top of a component body followed by use of `data` in JSX -- the JSX will render the initial value and never update; use `resource()` directly in JSX or inside a reactive context
- [ ] **Conditional signal access**: flag ternary expressions in JSX that short-circuit signal reads (e.g., `show && count()`) where `show` is not itself a signal -- if `show` is evaluated once as false, `count` is never tracked; use `<Show when={show()}>` for conditional rendering

### Effect and Memo Discipline
<!-- activation: keywords=["createEffect", "createMemo", "createComputed", "createRenderEffect", "onCleanup", "on(", "batch"] -->

- [ ] **createEffect without cleanup**: flag `createEffect` that sets up timers (`setInterval`, `setTimeout`), event listeners (`addEventListener`), or subscriptions without calling `onCleanup` to tear them down -- SolidJS does not auto-cleanup non-reactive side effects
- [ ] **createMemo with side effects**: flag `createMemo` callbacks that perform network calls, DOM manipulation, console logging, or state mutations -- `createMemo` is for pure derived computation; use `createEffect` for side effects
- [ ] **Signal setter in createMemo**: flag `createMemo` that calls a signal setter -- this can create circular dependencies and infinite re-computations; derive values purely instead
- [ ] **Missing on() for explicit tracking**: flag `createEffect` that reads many signals but should only react to a specific one -- use the `on()` helper to explicitly declare which signal triggers the effect
- [ ] **Cascading signal updates**: flag effects that set signals which trigger other effects in a chain -- batch updates with `batch()` or restructure to use derived computations via `createMemo`

### List Rendering
<!-- activation: keywords=["<For", "<Index", "each=", ".map("] -->

- [ ] **Array .map() instead of For**: flag `{items().map(item => ...)}` in JSX -- SolidJS does not diff virtual DOM; `.map()` recreates all DOM nodes when the array reference changes; use `<For each={items()}>` which keys by reference and updates only changed items
- [ ] **Index vs For confusion**: flag `<Index>` used for lists where items are added, removed, or reordered -- `<Index>` is optimized for fixed-length lists where items mutate in place (it keys by index); `<For>` is correct when list membership changes (it keys by value reference)
- [ ] **Missing key identity**: flag `<For>` iterating over primitive arrays (strings, numbers) where items may not be unique -- `<For>` keys by reference identity, which fails for duplicate primitives; consider wrapping in objects or using `<Index>`

### Resource and Async Patterns
<!-- activation: keywords=["createResource", "Suspense", "ErrorBoundary", "fetchData", "fetch(", "async"] -->

- [ ] **createResource without Suspense**: flag components using `createResource` where no ancestor `<Suspense>` boundary exists -- without Suspense, the component renders with `undefined` data and no loading state
- [ ] **Missing error handling**: flag `createResource` usage where neither an `<ErrorBoundary>` wraps the consumer nor the component checks `resource.error` -- unhandled resource errors silently break the UI
- [ ] **createResource in deeply nested component**: flag resources created deep in the component tree without a nearby Suspense boundary -- the Suspense will bubble up to the nearest ancestor, potentially blanking a large section of the UI during loading
- [ ] **Refetch without user feedback**: flag `resource.refetch()` calls that do not show a loading indicator -- the Suspense fallback does not re-trigger on refetch by default; use `resource.loading` for subsequent load states

### Component Architecture
<!-- activation: keywords=["component$", "lazy", "children", "Portal", "Dynamic", "Show", "Switch", "Match"] -->

- [ ] **Oversized components**: flag components exceeding 150 lines -- SolidJS components run once (not on every render like React), but large components still hurt readability and reuse; extract logical sections
- [ ] **Unnecessary nesting of Show/Switch**: flag deeply nested conditional rendering (3+ levels of `<Show>`/`<Switch>`) -- extract into named sub-components for clarity
- [ ] **Dynamic component without fallback**: flag `<Dynamic component={comp()}>` where `comp()` could be undefined without a fallback -- renders nothing silently; add a fallback or guard with `<Show>`

## Common False Positives

- **Props destructured after splitProps/mergeProps**: `const [local, rest] = splitProps(props, ['class']); const { class: cls } = local;` -- the destructuring here is on the already-split reactive proxy and is safe in SolidJS.
- **Signal read in event handlers**: `onClick={() => console.log(count())}` reads the signal inside an event handler, not a tracking scope -- this is correct behavior; the handler reads the current value at click time. No tracking is needed here.
- **One-time initialization in component body**: reading a signal once to initialize a non-reactive third-party library (e.g., a map or chart constructor) is intentional. Flag only when the developer expects updates.
- **createEffect on mount pattern**: `createEffect(() => { /* runs once if no signals read */ })` with no reactive dependencies is effectively an onMount equivalent. This is intentional in many codebases.

## Severity Guidance

| Finding | Severity |
|---|---|
| Props destructured in function parameter (breaks all prop reactivity) | Critical |
| Signal read outside tracking scope used in JSX binding | Critical |
| createEffect setting up subscriptions without onCleanup (memory leak) | Critical |
| createResource without Suspense or error handling | Important |
| Array .map() instead of For for dynamic lists | Important |
| createMemo performing side effects | Important |
| Signal setter called during component body execution | Important |
| Index used where For is needed (incorrect keying) | Minor |
| Component exceeding 150 lines without extraction | Minor |
| Cascading signal updates without batch() | Minor |

## See Also

- `fw-react` -- React's useEffect cleanup parallels SolidJS onCleanup, but React re-renders the full component while SolidJS runs it once; review patterns differ fundamentally
- `fw-qwik` -- Qwik's resumability model shares the "code runs once" philosophy but with different serialization constraints
- `sec-xss-dom` -- SolidJS JSX auto-escapes text, but innerHTML prop and Dynamic component with user HTML bypass this
- `perf-startup-cold-start` -- SolidJS's small runtime helps cold start, but large component trees without lazy loading can still bloat bundles
- `principle-separation-of-concerns` -- components creating resources directly couple UI to data fetching; extract into resource hooks

## Authoritative References

- [SolidJS Documentation -- Reactivity](https://www.solidjs.com/guides/reactivity)
- [SolidJS Documentation -- Control Flow](https://www.solidjs.com/docs/latest/api#control-flow)
- [SolidJS Tutorial -- Fine-Grained Reactivity](https://www.solidjs.com/tutorial/introduction_signals)
- [Ryan Carniato -- "SolidJS: Reactivity to Rendering" (JSConf 2021)](https://www.youtube.com/watch?v=2iK9zzhSKo4)
- [eslint-plugin-solid -- Rules Reference](https://github.com/solidjs-community/eslint-plugin-solid)
