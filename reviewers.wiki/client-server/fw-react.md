---
id: fw-react
type: primary
depth_role: leaf
focus: Detect React-specific pitfalls in hooks, rendering, memoization, and component design that cause bugs, memory leaks, or unnecessary re-renders.
parents:
  - index.md
covers:
  - Missing or incomplete dependency arrays in useEffect, useMemo, useCallback
  - Stale closures in event handlers and callbacks capturing outdated state
  - Unnecessary re-renders from missing React.memo, useMemo, or useCallback
  - State updates during render causing infinite render loops
  - useEffect used as a lifecycle method instead of deriving state
  - Prop drilling through many layers where context or composition would help
  - dangerouslySetInnerHTML with unsanitized user-controlled content
  - Index used as key prop in dynamic or reorderable lists
  - Memory leaks from uncleared subscriptions or timers in useEffect
  - Large component files exceeding 300 lines mixing concerns
  - Missing error boundaries for subtree crash isolation
  - React.lazy without Suspense fallback causing uncaught promise rejection
  - Excessive context providers causing broad re-render cascades
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
activation:
  file_globs:
    - "**/*.jsx"
    - "**/*.tsx"
  keyword_matches:
    - React
    - useState
    - useEffect
    - useCallback
    - useMemo
    - useRef
    - useContext
    - createContext
    - forwardRef
    - memo
    - Suspense
    - lazy
  structural_signals:
    - Hook dependency array mismatch
    - State update in render path
    - Missing cleanup in useEffect
source:
  origin: file
  path: fw-react.md
  hash: "sha256:fd907b1caeee4d5df8537a432eb9d93a3a0f162027b15c2b1d84e4f15ccaa7b6"
---
# React Hooks and Component Pitfalls

## When This Activates

Activates when diffs touch JSX or TSX files using React hooks, component definitions, or React-specific APIs. React's declarative model and hook rules create a unique class of bugs -- stale closures, dependency array mismatches, and render-phase side effects -- that are invisible to general-purpose linters. This reviewer catches patterns that cause incorrect behavior, degraded performance, or security vulnerabilities specific to the React programming model.

## Audit Surface

- [ ] useEffect with no dependency array or a dependency array that omits referenced variables
- [ ] useEffect that only transforms props/state into derived state (should be useMemo or inline computation)
- [ ] useCallback or useMemo with an empty dependency array that references outer scope variables
- [ ] Event handler defined inline in JSX of a memoized child (defeats React.memo)
- [ ] setState called unconditionally during render (outside useEffect or event handler)
- [ ] Component receiving 5+ props that are passed through to a single child unchanged
- [ ] dangerouslySetInnerHTML prop on any element where the __html value traces to user input, API response, or URL
- [ ] key={index} on list items that can be reordered, filtered, or have local state
- [ ] useEffect registering addEventListener, setInterval, or subscribe with no cleanup return
- [ ] Single component file exceeding 300 lines or containing multiple exported components
- [ ] Subtree with async data loading but no ErrorBoundary wrapping
- [ ] React.lazy() call with no enclosing Suspense providing a fallback
- [ ] Context provider wrapping large subtree where only a few consumers need the value
- [ ] useRef used to store mutable state that should trigger re-renders (stale UI)
- [ ] Multiple useState calls that always update together (should be useReducer or single object)
- [ ] Async function passed directly to useEffect (returns implicit Promise, not cleanup)

## Detailed Checks

### Hook Dependency Correctness
<!-- activation: keywords=["useEffect", "useMemo", "useCallback", "useLayoutEffect", "useInsertionEffect"] -->

- [ ] **Missing dependencies**: flag useEffect, useMemo, or useCallback where the callback references state variables, props, or derived values that are not listed in the dependency array -- this causes stale closure bugs where the callback sees outdated values
- [ ] **Over-specified dependencies**: flag dependency arrays containing unstable references (objects or arrays created during render) that cause the effect to fire on every render -- wrap the dependency in useMemo or move it inside the effect
- [ ] **Empty array with external references**: flag `useEffect(() => { ... someState ... }, [])` where the callback references state or props but uses `[]` to run "once" -- this is a stale closure that silently reads the initial value forever
- [ ] **Async useEffect**: flag `useEffect(async () => { ... })` -- async functions return a Promise, not a cleanup function; wrap the async call inside a non-async effect body using an inner async IIFE or separate function
- [ ] **useEffect for derived state**: flag `useEffect(() => { setDerived(transform(prop)) }, [prop])` -- this causes an unnecessary extra render; compute derived state inline or via useMemo

### Stale Closures and Memoization
<!-- activation: keywords=["useCallback", "useMemo", "React.memo", "memo(", "useRef", "forwardRef"] -->

- [ ] **Stale callback in child**: flag useCallback with a dependency array that omits a state variable used inside the callback -- the child receives a function that reads stale state
- [ ] **Inline handler defeating memo**: flag `<MemoizedChild onClick={() => doSomething(id)} />` where MemoizedChild is wrapped in React.memo -- the arrow function creates a new reference on every render, defeating memoization; use useCallback
- [ ] **useMemo without benefit**: flag useMemo wrapping a trivial computation (string concatenation, boolean check) -- memoization has overhead and is only beneficial for expensive computations or referential stability
- [ ] **useRef for render-visible state**: flag `const count = useRef(0)` where `count.current` is displayed in JSX -- ref mutations do not trigger re-renders, causing stale UI

### Render-Phase Side Effects
<!-- activation: keywords=["setState", "useState", "dispatch", "useReducer", "render", "return ("] -->

- [ ] **setState in render body**: flag `setState()` or `dispatch()` called unconditionally in the component body outside of useEffect, event handlers, or the `if (prevState !== newState)` pattern -- this causes infinite render loops
- [ ] **Side effects in render**: flag `fetch()`, `console.log()`, `localStorage.setItem()`, or DOM mutations in the component body -- the render function should be pure; side effects belong in useEffect or event handlers
- [ ] **Conditional hook calls**: flag useState, useEffect, or any hook called inside an if-block, loop, or early return -- hooks must be called in the same order on every render per the Rules of Hooks

### Component Structure and Prop Drilling
<!-- activation: keywords=["props", "createContext", "useContext", "Provider", "children", "component", "export"] -->

- [ ] **Prop drilling**: flag components that accept props only to pass them unchanged to children through 3+ levels -- use React context, component composition (children/render props), or state management
- [ ] **Large component**: flag component files exceeding 300 lines -- extract sub-components, custom hooks, or utility functions to improve readability and testability
- [ ] **Multiple components in one file**: flag files exporting multiple React components -- each component should live in its own file for discoverability and code splitting
- [ ] **Context re-render cascade**: flag a context provider whose value is a new object/array on every render (`value={{ user, settings }}`) -- all consumers re-render when the provider re-renders; memoize the value

### Error Handling and Suspense
<!-- activation: keywords=["ErrorBoundary", "error", "Suspense", "lazy", "fallback", "componentDidCatch", "getDerivedStateFromError"] -->

- [ ] **Missing error boundary**: flag component subtrees performing async operations, data fetching, or rendering user-generated content with no ErrorBoundary ancestor -- an unhandled error crashes the entire app
- [ ] **Lazy without Suspense**: flag `React.lazy(() => import('./Component'))` usage where the lazy component is not wrapped in a `<Suspense fallback={...}>` -- the lazy component throws a Promise during loading that must be caught by Suspense; see `perf-startup-cold-start` for lazy-loading patterns
- [ ] **Error boundary without recovery**: flag error boundaries that render a blank screen or generic message with no retry mechanism -- provide a "try again" action or fallback UI

### Security: dangerouslySetInnerHTML and XSS
<!-- activation: keywords=["dangerouslySetInnerHTML", "__html", "innerHTML", "sanitize", "DOMPurify", "xss"] -->

- [ ] **Unsanitized dangerouslySetInnerHTML**: flag `dangerouslySetInnerHTML={{ __html: variable }}` where the variable traces to user input, API response, URL parameter, or any external source without DOMPurify or equivalent sanitization -- this is a DOM XSS vector; see `sec-xss-dom` for full taint analysis
- [ ] **Sanitizer bypass**: flag custom sanitization functions (regex-based HTML stripping) used instead of DOMPurify -- regex sanitizers are bypassable via mutation XSS
- [ ] **href with user data**: flag `<a href={userInput}>` without validating the URL scheme -- `javascript:` URLs execute code on click; block non-http(s) schemes

### Memory Leaks in Effects
<!-- activation: keywords=["useEffect", "addEventListener", "setInterval", "setTimeout", "subscribe", "WebSocket", "EventSource", "IntersectionObserver", "MutationObserver", "ResizeObserver"] -->

- [ ] **No cleanup return**: flag useEffect hooks that call addEventListener, setInterval, setTimeout, subscribe, or instantiate observers (IntersectionObserver, MutationObserver, ResizeObserver) without returning a cleanup function -- the registration stacks on every re-render; see `perf-memory-gc` for general leak patterns
- [ ] **AbortController missing for fetch**: flag useEffect with a fetch call that does not use AbortController to cancel in-flight requests on unmount -- the response handler may call setState on an unmounted component
- [ ] **WebSocket/EventSource not closed**: flag WebSocket or EventSource connections opened in useEffect without `ws.close()` or `es.close()` in the cleanup return

## Common False Positives

- **Intentionally empty dependency array**: `useEffect(() => { analytics.pageView() }, [])` that should run exactly once on mount is correct; do not flag if the callback uses no component state or props.
- **Stable references from hooks**: values from `useRef`, `useDispatch` (Redux), or `useNavigate` (React Router) are stable across renders and can be safely omitted from dependency arrays.
- **Index as key on static lists**: `key={index}` on a list that never reorders, filters, or has item-level state is safe; flag only dynamic lists.
- **Large file with co-located tests**: a component file that includes its test suite in the same file may exceed 300 lines legitimately.
- **dangerouslySetInnerHTML with compile-time constants**: `dangerouslySetInnerHTML={{ __html: '<br />' }}` with a string literal is safe.

## Severity Guidance

| Finding | Severity |
|---|---|
| dangerouslySetInnerHTML with unsanitized user input | Critical |
| setState called unconditionally in render body (infinite loop) | Critical |
| useEffect with missing cleanup for subscription/timer causing memory leak | Critical |
| useEffect with missing dependency causing stale closure in data-critical path | Important |
| React.lazy without Suspense fallback | Important |
| Missing error boundary around async subtree | Important |
| Async function passed directly to useEffect | Important |
| key={index} on reorderable or filterable list | Important |
| Inline handler defeating React.memo on hot path | Minor |
| useMemo wrapping trivial computation | Minor |
| Prop drilling through 3+ levels (readability concern) | Minor |
| Context provider with unstable value object | Minor |

## See Also

- `sec-xss-dom` -- dangerouslySetInnerHTML is a DOM XSS sink; see full source-to-sink taint analysis
- `perf-memory-gc` -- useEffect cleanup failures are the React manifestation of event listener and timer leaks
- `perf-startup-cold-start` -- React.lazy and code splitting interact with cold-start and bundle size
- `principle-separation-of-concerns` -- large components mixing data fetching, business logic, and rendering violate SoC
- `fw-nextjs` -- Next.js builds on React; server/client component boundaries introduce additional React pitfalls

## Authoritative References

- [React Documentation -- "Rules of Hooks"](https://react.dev/reference/rules/rules-of-hooks)
- [React Documentation -- "You Might Not Need an Effect"](https://react.dev/learn/you-might-not-need-an-effect)
- [React Documentation -- "Synchronizing with Effects"](https://react.dev/learn/synchronizing-with-effects)
- [Dan Abramov -- "A Complete Guide to useEffect"](https://overreacted.io/a-complete-guide-to-useeffect/)
- [React Documentation -- "Keeping Components Pure"](https://react.dev/learn/keeping-components-pure)
- [Kent C. Dodds -- "Don't Sync State. Derive It."](https://kentcdodds.com/blog/dont-sync-state-derive-it)
