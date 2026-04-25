---
id: fe-data-react-query-swr-apollo-relay-urql
type: primary
depth_role: leaf
focus: Detect data-fetching pitfalls across React Query, SWR, Apollo Client, Relay, and urql including cache invalidation bugs, missing error states, and overfetching.
parents:
  - index.md
covers:
  - Missing error and loading state handling in data-fetching hooks
  - Stale-while-revalidate misunderstanding causing stale data served as fresh
  - Cache invalidation bugs leaving outdated data after mutations
  - Overfetching via unscoped GraphQL queries or broad REST endpoints
  - Missing optimistic updates causing laggy UI on mutations
  - Query key collisions in React Query or SWR
  - Apollo Client cache not updated after mutations
  - Relay fragment over-specification pulling unnecessary fields
  - Missing retry and refetch configuration
  - Waterfall fetching from sequential dependent queries
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
activation:
  file_globs:
    - "**/*.jsx"
    - "**/*.tsx"
    - "**/*.graphql"
    - "**/*.gql"
  keyword_matches:
    - useQuery
    - useMutation
    - useSWR
    - useInfiniteQuery
    - queryClient
    - ApolloClient
    - gql
    - useFragment
    - urql
    - invalidateQueries
  structural_signals:
    - missing error state handling
    - cache invalidation gap
    - sequential dependent queries
source:
  origin: file
  path: fe-data-react-query-swr-apollo-relay-urql.md
  hash: "sha256:5d834203c43fd812de8774315f717ac580f6999ec696d4b1ab4df4eb6bb86bae"
---
# Data Fetching Library Pitfalls

## When This Activates

Activates when diffs touch data-fetching hooks (React Query, SWR, Apollo, Relay, urql), GraphQL queries, or cache configuration. These libraries abstract away fetch boilerplate but introduce a new class of bugs -- cache entries that outlive their validity, error states that crash the UI because they were not handled, and overfetching that wastes bandwidth. This reviewer catches the gaps between what the library defaults provide and what production applications require.

## Audit Surface

- [ ] useQuery or useSWR hook with no error handling (missing isError, error callback, or onError)
- [ ] Data rendered directly from query without checking loading or error state
- [ ] staleTime or dedupingInterval set to Infinity without understanding implications
- [ ] Mutation without invalidateQueries, mutate cache update, or refetchQueries
- [ ] GraphQL query selecting all fields or 20+ fields when component uses 3-5
- [ ] React Query queryKey that is a plain string instead of an array with parameters
- [ ] Apollo Client useMutation without update or refetchQueries option
- [ ] Relay useFragment pulling fields not rendered by the component
- [ ] Multiple sequential useQuery hooks where parallel fetching is possible
- [ ] Missing retry configuration for transient network failures
- [ ] SWR or React Query cache key containing unstable references (new object per render)
- [ ] Optimistic update without rollback on mutation failure

## Detailed Checks

### Error and Loading State Handling
<!-- activation: keywords=["isLoading", "isError", "error", "loading", "fallback", "skeleton", "Suspense"] -->

- [ ] **Missing error state**: flag useQuery, useSWR, or Apollo useQuery results where `error` or `isError` is never checked and no ErrorBoundary wraps the component -- network failures render undefined data causing runtime crashes; see `fw-react` for error boundary patterns
- [ ] **Missing loading state**: flag components that render `data.field` without guarding on `isLoading` or `isPending` -- the initial render before data arrives throws a TypeError on undefined
- [ ] **No loading UI**: flag queries that check isLoading but render nothing (return null) instead of a skeleton or spinner -- users see a blank screen with no indication of progress

### Cache Invalidation
<!-- activation: keywords=["invalidate", "refetch", "mutate", "update", "staleTime", "cacheTime", "gcTime", "dedupingInterval"] -->

- [ ] **Mutation without cache update**: flag useMutation calls (React Query, Apollo, urql) that do not call invalidateQueries, update the cache directly, or pass refetchQueries -- the list/detail views show stale data after create/update/delete operations
- [ ] **Infinite staleTime**: flag `staleTime: Infinity` or `dedupingInterval: Infinity` without a manual invalidation strategy -- data never refetches automatically, serving arbitrarily old data to users
- [ ] **Cache key collision**: flag React Query queryKey values that are identical for different queries (e.g., `['users']` used for both user list and user count) -- cache collisions return wrong data types

### Overfetching and Query Design
<!-- activation: keywords=["gql", "query", "fragment", "useFragment", "select", "fields", "overfetch"] -->

- [ ] **GraphQL overfetching**: flag GraphQL queries selecting 20+ fields when the consuming component renders 5 or fewer -- wasted bandwidth and server processing; split into focused fragments; see Relay's fragment colocation model
- [ ] **Relay fragment drift**: flag Relay useFragment declarations that include fields not referenced in the component's render output -- Relay fragments should mirror exactly what the component renders
- [ ] **Missing field-level selection**: flag REST endpoints returning full entities when the component needs only 2-3 fields and the API supports field selection (e.g., `?fields=id,name`) -- reduce payload size

### Query Patterns and Waterfalls
<!-- activation: keywords=["useQuery", "useSWR", "enabled", "dependent", "parallel", "suspense", "prefetch"] -->

- [ ] **Waterfall fetching**: flag sequential useQuery hooks where query B depends on query A's result but both could be fetched in parallel with a combined endpoint or batched request -- sequential fetches multiply latency
- [ ] **Missing prefetch**: flag navigation-triggered queries that could be prefetched on hover or route prefetch -- users wait for the full fetch duration after clicking; use queryClient.prefetchQuery or SWR preload
- [ ] **Unstable query key**: flag queryKey or SWR key containing a new object reference on every render (e.g., `useQuery({ queryKey: ['users', { filters }] })` where filters is recreated each render) -- this causes infinite refetching; memoize the key parameters

### Optimistic Updates
<!-- activation: keywords=["optimistic", "onMutate", "onError", "rollback", "onSettled", "previousData"] -->

- [ ] **Missing optimistic update on frequent action**: flag mutation for actions users perform frequently (toggle, like, reorder) that waits for server response before updating the UI -- adds perceived latency; implement optimistic update with rollback
- [ ] **Optimistic without rollback**: flag onMutate that updates the cache optimistically but the onError callback does not restore the previous value -- failed mutations leave the cache in an inconsistent state
- [ ] **Missing onSettled refetch**: flag optimistic updates without an onSettled invalidation -- even after successful mutation, the server's canonical response should reconcile the optimistic data

## Common False Positives

- **Suspense mode**: components using React Query or SWR in Suspense mode do not need manual isLoading/isError checks -- Suspense and ErrorBoundary handle those states.
- **staleTime: Infinity for static data**: configuration data, feature flags, or lookup tables that change only on deploy can legitimately use infinite staleTime with manual invalidation.
- **GraphQL fragments with shared fields**: fragments may include fields used by child components via fragment composition; the parent fragment appears to overfetch but the fields are consumed downstream.
- **Waterfall from genuine dependency**: query B genuinely depends on query A's result (e.g., fetch user ID first, then fetch user's orders) -- this is unavoidable unless the API supports compound queries.

## Severity Guidance

| Finding | Severity |
|---|---|
| Missing error state causing runtime crash on network failure | Critical |
| Mutation without cache invalidation serving stale data | Critical |
| Cache key collision returning wrong data type | Important |
| Unstable query key causing infinite refetching | Important |
| Waterfall fetching adding 500ms+ latency | Important |
| Missing loading state causing TypeError on undefined | Important |
| Optimistic update without rollback | Minor |
| GraphQL overfetching (20+ unused fields) | Minor |
| Missing prefetch on navigation | Minor |

## See Also

- `fe-state-redux-zustand-mobx-jotai-recoil-pinia` -- server state should not be duplicated in client stores
- `fw-react` -- error boundaries and Suspense interact with data-fetching loading/error states
- `fw-nextjs` -- Next.js server components can fetch data without client-side libraries
- `fe-core-web-vitals-lighthouse` -- data fetching waterfalls directly impact LCP and INP

## Authoritative References

- [TanStack Query Documentation -- "Query Keys"](https://tanstack.com/query/latest/docs/react/guides/query-keys)
- [TanStack Query Documentation -- "Optimistic Updates"](https://tanstack.com/query/latest/docs/react/guides/optimistic-updates)
- [SWR Documentation -- "Getting Started"](https://swr.vercel.app/docs/getting-started)
- [Apollo Client Documentation -- "Caching"](https://www.apollographql.com/docs/react/caching/overview)
- [Relay Documentation -- "Thinking in Relay"](https://relay.dev/docs/principles-and-architecture/thinking-in-relay/)
