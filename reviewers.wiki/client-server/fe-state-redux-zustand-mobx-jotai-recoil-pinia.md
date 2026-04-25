---
id: fe-state-redux-zustand-mobx-jotai-recoil-pinia
type: primary
depth_role: leaf
focus: Detect state management anti-patterns across Redux, Zustand, MobX, Jotai, Recoil, and Pinia that cause unnecessary re-renders, stale data, or unmaintainable state shapes.
parents:
  - index.md
covers:
  - Unnecessary global state for data that should be local or server state
  - Missing selectors causing entire-store re-renders
  - Store mutations outside designated actions or reducers
  - "State shape too flat (missing normalization) or too deeply nested"
  - Missing persistence configuration for state that should survive page reloads
  - State duplication between client store and server cache
  - Redux dispatch in render path causing infinite loops
  - MobX observable not tracked due to destructuring
  - "Jotai/Recoil atom keys colliding across modules"
  - Zustand store without shallow equality selector
  - Pinia store with reactive state leaked outside setup
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
activation:
  file_globs:
    - "**/store/**"
    - "**/stores/**"
    - "**/slices/**"
    - "**/atoms/**"
  keyword_matches:
    - createSlice
    - useSelector
    - useDispatch
    - "create("
    - zustand
    - observable
    - makeAutoObservable
    - "atom("
    - useAtom
    - useRecoilState
    - defineStore
    - pinia
  structural_signals:
    - global state for local concern
    - missing selector
    - state mutation outside action
source:
  origin: file
  path: fe-state-redux-zustand-mobx-jotai-recoil-pinia.md
  hash: "sha256:171ca7a1e06a9153ffb4daf2acc1ec2148c43cc2be3f8c30ac4035e0d3881fda"
---
# State Management Anti-Patterns

## When This Activates

Activates when diffs touch state management stores, reducers, actions, atoms, or selectors across Redux, Zustand, MobX, Jotai, Recoil, or Pinia. State management libraries solve specific problems -- shared state across distant components, derived computations, time-travel debugging -- but become liabilities when overused. Storing everything globally causes re-render cascades, duplicating server data causes staleness, and missing selectors defeat the performance guarantees these libraries provide. This reviewer catches the patterns that turn state management from a solution into the problem.

## Audit Surface

- [ ] Global store containing UI state (modal open, form input) that affects only one component
- [ ] Redux useSelector returning the entire store slice instead of a specific field
- [ ] Zustand store consumed via useStore() without a selector function
- [ ] Direct state mutation outside a Redux reducer, MobX action, or Pinia action
- [ ] Deeply nested state (4+ levels) updated via spread operator chains
- [ ] Normalized entity stored in multiple slices (duplication)
- [ ] Server-fetched data stored in Redux/Zustand when React Query or SWR manages the same data
- [ ] Missing persist middleware for auth tokens or user preferences stored in Zustand/Pinia
- [ ] MobX computed value accessing observable via destructured local variable
- [ ] Jotai atom or Recoil atom with a key string identical to another atom
- [ ] Redux dispatch called unconditionally in component body (outside useEffect or handler)
- [ ] Pinia store using ref() or reactive() outside defineStore setup

## Detailed Checks

### Unnecessary Global State
<!-- activation: keywords=["createSlice", "create(", "defineStore", "atom(", "makeAutoObservable", "global", "store"] -->

- [ ] **Local concern in global store**: flag state that is read and written by a single component or a parent-child pair -- modal visibility, form input values, accordion expansion state belong in useState or useReducer, not in a global store
- [ ] **Server state duplication**: flag Redux or Zustand stores that cache API response data when the project also uses React Query, SWR, or Apollo Client -- maintaining two caches causes staleness bugs; let the data-fetching library own server state; see `fe-data-react-query-swr-apollo-relay-urql`
- [ ] **Overloaded store**: flag a single store or slice managing 10+ unrelated concerns (user data, UI state, feature flags, form state) -- split into focused stores/slices to reduce coupling

### Missing Selectors and Re-Renders
<!-- activation: keywords=["useSelector", "useStore", "subscribe", "selector", "shallow", "computed"] -->

- [ ] **Whole-slice selector**: flag `useSelector(state => state.users)` that returns an entire slice object -- any change to any field in the slice triggers a re-render; select only the specific fields needed
- [ ] **Zustand without selector**: flag `const state = useStore()` without a selector -- every store update re-renders the component; use `useStore(state => state.specificField)` with shallow equality for object selections
- [ ] **MobX destructuring breaking tracking**: flag `const { name, age } = observableUser` followed by rendering name and age -- destructuring extracts plain values, breaking MobX's tracking; access properties directly on the observable
- [ ] **Missing memoized selector**: flag Redux selectors that compute derived data on every call without createSelector (reselect) -- expensive derivations recompute on every dispatch; see `fw-react` for React.memo interaction

### Mutation Discipline
<!-- activation: keywords=["dispatch", "action", "reducer", "mutate", "set(", "produce", "immer"] -->

- [ ] **Mutation outside action**: flag direct property assignment on Redux state outside a reducer, MobX state outside an action, or Pinia state outside an action or $patch -- bypassing the designated mutation path breaks devtools, middleware, and undo/redo
- [ ] **Dispatch in render**: flag Redux dispatch or Zustand set called unconditionally in the component body (not inside useEffect, event handlers, or callbacks) -- this causes infinite render loops; see `fw-react` for render-phase side effects
- [ ] **Missing Immer for nested updates**: flag deeply nested state updates using manual spread (`{ ...state, nested: { ...state.nested, deep: newValue } }`) in Redux Toolkit (which includes Immer by default) -- use the direct mutation syntax Immer provides

### State Shape and Persistence
<!-- activation: keywords=["normalize", "entities", "persist", "localStorage", "sessionStorage", "hydrate", "rehydrate"] -->

- [ ] **Over-nested state**: flag state shapes 4+ levels deep that require multi-level spread or Immer path expressions to update -- normalize entities using an ID map (`{ byId: {}, allIds: [] }`) pattern
- [ ] **Entity duplication**: flag the same entity (user, product) stored in multiple slices with different shapes -- use a single normalized slice and reference by ID elsewhere
- [ ] **Missing persistence**: flag Zustand or Pinia stores holding auth tokens, user preferences, or session data without persist middleware -- page reload loses the data, forcing re-authentication or lost settings

### Atomic State Collisions (Jotai/Recoil)
<!-- activation: keywords=["atom(", "useAtom", "useRecoilState", "useRecoilValue", "selector(", "atomFamily", "key:"] -->

- [ ] **Duplicate atom keys**: flag Jotai atoms with identical debugLabel or Recoil atoms with identical key strings across different modules -- key collisions cause silent state sharing bugs where two features unintentionally read/write the same atom
- [ ] **Atom too large**: flag a single Jotai atom or Recoil atom storing a large object with many fields -- subscribers re-render on any field change; split into focused atoms for granular updates

## Common False Positives

- **Global state for cross-cutting concerns**: auth state, theme preference, and locale are legitimately global even if consumed by few components.
- **Redux Toolkit mutation syntax**: RTK uses Immer internally, so `state.value = newValue` inside createSlice reducers is safe -- it looks like mutation but produces an immutable update.
- **Whole-slice selector for derived data**: if the component needs most fields of a slice to compute a derived value, selecting the whole slice is acceptable.
- **Jotai atoms without keys**: Jotai atoms are identified by reference, not string keys; debugLabel collisions do not cause bugs (only Recoil keys do).

## Severity Guidance

| Finding | Severity |
|---|---|
| Dispatch in render path causing infinite loop | Critical |
| Direct state mutation outside reducer/action | Critical |
| Whole-slice selector causing re-render cascade on hot path | Important |
| Server state duplicated in client store alongside React Query/SWR | Important |
| Recoil atom key collision | Important |
| MobX observable tracking broken by destructuring | Important |
| Missing persistence for auth tokens | Minor |
| Deeply nested state shape without normalization | Minor |
| Local UI state in global store | Minor |

## See Also

- `fe-data-react-query-swr-apollo-relay-urql` -- server state should live in data-fetching libraries, not client stores
- `fw-react` -- React re-render behavior interacts with selector granularity and dispatch timing
- `fw-nextjs` -- Next.js server/client component boundary affects where state stores can be used
- `perf-startup-cold-start` -- large persisted stores rehydrated at startup affect initial load time

## Authoritative References

- [Redux Documentation -- "Style Guide"](https://redux.js.org/style-guide/)
- [Zustand Documentation -- "Recipes"](https://docs.pmnd.rs/zustand/recipes/recipes)
- [MobX Documentation -- "Understanding Reactivity"](https://mobx.js.org/understanding-reactivity.html)
- [Jotai Documentation -- "Core"](https://jotai.org/docs/core/atom)
- [Recoil Documentation -- "Core Concepts"](https://recoiljs.org/docs/introduction/core-concepts)
- [Pinia Documentation -- "Core Concepts"](https://pinia.vuejs.org/core-concepts/)
