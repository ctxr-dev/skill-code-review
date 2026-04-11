---
tools:
  - name: eslint-plugin-react-hooks
    command: "npx eslint --rule 'react-hooks/rules-of-hooks: error'"
    purpose: "React hooks rules enforcement"
---

# React — Review Overlay

Load this overlay for the **security**, **performance**, **language-quality**, and **test-quality** specialists when `react` or `react-dom` is detected in project dependencies.

---

## Security

- [ ] `dangerouslySetInnerHTML` is never set from untrusted user input; if used, verify the value is sanitized (e.g., DOMPurify) before assignment
- [ ] URL props (`href`, `src`, `action`) are never constructed from unvalidated user input; check for `javascript:` injection via user-controlled values
- [ ] `eval`, `new Function`, or dynamic script injection are absent from component code or custom hooks
- [ ] Third-party components that accept `ref` or render children are not given unconstrained access to sensitive state

## Performance

- [ ] `useEffect` dependency arrays are complete and accurate — missing deps cause stale closures, extra deps cause unnecessary re-runs; verify with exhaustive-deps lint rule
- [ ] Expensive computations inside render are wrapped in `useMemo`; the cost justifies the memoization overhead (avoid premature optimization)
- [ ] Callback props passed to child components are wrapped in `useCallback` only when the child is wrapped in `React.memo` (otherwise no-op)
- [ ] `React.memo` is applied only at proven re-render hot-spots, not speculatively on every component
- [ ] List items have stable, unique `key` props derived from data identity, not array index (unless the list is static and never reordered)
- [ ] Context value objects and arrays are memoized so that all consumers do not re-render on every provider render
- [ ] Large component trees that are not immediately needed are code-split with `React.lazy` + `Suspense`
- [ ] `useRef` is used for values that must persist across renders without triggering re-renders (timers, DOM nodes, previous values)

## Architecture / Correctness

- [ ] Custom hooks are named with the `use` prefix and only called at the top level of a function component or another custom hook (Rules of Hooks)
- [ ] `useEffect` cleanup functions correctly cancel async operations, timers, or subscriptions to prevent state updates on unmounted components
- [ ] State updates that depend on previous state use the functional form (`setState(prev => ...)`) rather than closing over stale state
- [ ] Derived state is computed during render rather than mirrored into `useState`, which creates synchronization bugs
- [ ] `forwardRef` is used when a component needs to expose a DOM ref to its parent; the ref type is correctly typed
- [ ] Controlled vs uncontrolled input mode is consistent — never switch between the two for the same input
- [ ] `Suspense` boundaries are placed at meaningful loading boundaries; `ErrorBoundary` components wrap async or third-party subtrees

## State Management

- [ ] Global state slices are scoped to the minimum subtree that needs them; context is split by concern to avoid over-rendering
- [ ] Async state transitions (loading / error / success) are modeled explicitly rather than with multiple independent boolean flags
- [ ] External store subscriptions use `useSyncExternalStore` rather than `useEffect` + `useState` to avoid tearing on concurrent renders

## Test Quality

- [ ] Tests query elements by accessible role, label, or text (Testing Library) rather than by CSS class, test ID overuse, or implementation detail selectors
- [ ] `userEvent` is used instead of `fireEvent` for simulating real user interactions (click, type, keyboard)
- [ ] Component tests assert observable behavior (rendered text, ARIA state, calls to mock handlers) rather than internal state or instance methods
- [ ] Async interactions are awaited with `waitFor` or `findBy*` queries rather than arbitrary `setTimeout` hacks
- [ ] `act()` is not called manually in tests that use Testing Library — the library wraps interactions in `act` automatically
