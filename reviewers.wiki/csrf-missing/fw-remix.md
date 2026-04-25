---
id: fw-remix
type: primary
depth_role: leaf
focus: "Detect Remix-specific pitfalls in loader/action design, data flow, error boundaries, and form handling that cause data leaks, mutation bugs, or degraded UX."
parents:
  - index.md
covers:
  - "Loader performing mutations (loaders must be GET-safe and idempotent)"
  - Action without input validation or sanitization
  - "useLoaderData without type safety (untyped casts hiding runtime errors)"
  - Missing ErrorBoundary or CatchBoundary on route modules
  - Data overfetching in loaders returning entire DB rows to the client
  - Secrets or internal fields leaking through loader data serialized to the client
  - Missing optimistic UI patterns on user-facing mutations
  - Nested route loader waterfalls from sequential parent-child data dependencies
  - "defer() without matching Suspense/Await fallback in the component"
  - Missing CSRF protection on form submissions
  - fetcher.submit without error handling or pending state
  - Redirect in loader without proper status code
tags:
  - remix
  - loader
  - action
  - form
  - data-fetching
  - error-boundary
  - optimistic-ui
  - nested-routing
  - fullstack
  - frontend
activation:
  file_globs:
    - "**/remix.config.*"
    - "**/app/routes/**"
  keyword_matches:
    - loader
    - action
    - useLoaderData
    - useActionData
    - useFetcher
    - useNavigation
    - defer
    - Await
    - redirect
    - json
    - Form
    - remix
  structural_signals:
    - Loader performing write operations
    - Missing route error boundary
    - Untyped loader data
source:
  origin: file
  path: fw-remix.md
  hash: "sha256:ece5bda87de9857c2a7d53a87f11e48c46143f9dd86c1ae57f8e41538ab6357b"
---
# Remix Loader/Action and Data Flow Pitfalls

## When This Activates

Activates when diffs touch Remix configuration, route modules, loaders, actions, or forms. Remix enforces a strict loader (GET reads) / action (POST writes) split aligned with HTTP semantics. Violating this boundary causes mutations on prefetch, data leaks through serialized loader responses, and broken back-button behavior. Nested routing introduces loader waterfalls and error boundary gaps that general React reviewers do not catch. This reviewer targets patterns specific to the Remix data-flow model.

## Audit Surface

- [ ] Loader function containing a database write, POST/PUT/DELETE fetch, or any state-mutating call
- [ ] Action function that uses formData values directly without validation (Zod, yup, or manual checks)
- [ ] useLoaderData() call without a generic type parameter or typed loader inference
- [ ] Route module exporting a loader or action but no ErrorBoundary export
- [ ] Loader returning a full ORM model or database row instead of a DTO with only the fields the UI needs
- [ ] Loader response containing API keys, internal IDs, password hashes, or internal-prefixed fields
- [ ] Form submission that mutates data but shows no pending/submitting indicator via useNavigation
- [ ] Parent route loader fetching data that a child loader re-fetches or depends on sequentially
- [ ] defer() call in a loader with no corresponding Await component wrapped in Suspense
- [ ] Remix Form or fetcher.Form with method=post but no CSRF token or session-based protection
- [ ] fetcher.submit() call with no check of fetcher.state or fetcher.data for error responses
- [ ] redirect() using default 302 when 303 (See Other) is semantically correct after POST
- [ ] json() response in loader without Cache-Control headers for cacheable public data
- [ ] useActionData() used without null check (undefined on first render)
- [ ] Route module with loader and action each exceeding 50 lines (logic belongs in a service layer)

## Detailed Checks

### Loader Purity and GET Safety
<!-- activation: keywords=["loader", "export const loader", "export async function loader", "db.", "prisma.", "fetch(", "POST", "PUT", "DELETE", "insert", "update", "create"] -->

- [ ] **Mutation in loader**: flag loader functions that call database write methods (insert, update, delete, create), send POST/PUT/DELETE requests, or trigger side effects (email, queue push) -- loaders run on GET requests including prefetch; mutations here cause duplicate writes and break browser expectations
- [ ] **Loader without error handling**: flag loaders that call external services or database queries with no try/catch or Response-based error handling -- an unhandled throw returns a 500 with a stack trace; use `json({ error }, { status })` or throw a Response
- [ ] **Loader returning sensitive fields**: flag loaders returning full database records or objects containing password, hash, secret, token, apiKey, or underscore-prefixed internal fields -- everything in the loader return is serialized to the client as JSON visible in the network tab
- [ ] **Missing cache headers**: flag loaders returning public, non-personalized data via `json()` without a `Cache-Control` header -- Remix does not cache loader responses by default; CDN-cacheable responses need explicit headers

### Action Validation and Security
<!-- activation: keywords=["action", "export const action", "export async function action", "formData", "request.formData", "Form", "fetcher.submit", "csrf", "zod", "validate"] -->

- [ ] **Unvalidated action input**: flag actions that read `formData.get()` values and pass them directly to database queries or business logic without schema validation -- actions are public POST endpoints callable by anyone with the URL; see `sec-owasp-a03-injection`
- [ ] **Missing CSRF protection**: flag forms using method=post without CSRF token generation/validation via a session or a Remix CSRF library -- Remix forms do not include automatic CSRF protection; see `sec-owasp-a05-misconfiguration`
- [ ] **Action without redirect**: flag actions that return data via `json()` after a successful mutation instead of using `redirect()` -- without redirect, a page refresh resubmits the form (POST-redirect-GET pattern)
- [ ] **Incorrect redirect status**: flag `redirect()` calls after a POST action using the default 302 status -- use 303 (See Other) to ensure the browser switches to GET on the redirected URL

### Type Safety and Data Contracts
<!-- activation: keywords=["useLoaderData", "useActionData", "LoaderFunctionArgs", "ActionFunctionArgs", "TypedResponse", "SerializeFrom", "loader", "action"] -->

- [ ] **Untyped useLoaderData**: flag `useLoaderData()` calls without type inference from the loader function or explicit generic parameter -- untyped loader data hides shape mismatches between what the loader returns and what the component expects
- [ ] **useActionData without null check**: flag `useActionData()` usage that immediately accesses properties without checking for undefined/null -- actionData is undefined on initial render before any form submission
- [ ] **Loader/action logic in route module**: flag route modules where the loader or action function exceeds 50 lines of business logic -- extract to a service/model layer; route modules should be thin controllers; see `principle-separation-of-concerns`

### Error and Loading Boundaries
<!-- activation: keywords=["ErrorBoundary", "CatchBoundary", "isRouteErrorResponse", "useRouteError", "loading", "Suspense", "Await", "defer"] -->

- [ ] **Missing ErrorBoundary**: flag route modules that export a loader or action but do not export an ErrorBoundary -- an unhandled error bubbles up to the nearest parent boundary, potentially crashing the entire layout
- [ ] **defer without Await/Suspense**: flag loaders using `defer()` where the route component does not render the deferred data inside an `<Await>` component wrapped in `<Suspense>` with a fallback -- the deferred promise resolves but never renders, or the user sees no loading indicator
- [ ] **CatchBoundary without isRouteErrorResponse**: flag ErrorBoundary implementations that do not distinguish between thrown Response errors and unexpected errors via `isRouteErrorResponse()` -- different error types need different UI treatment (404 vs 500)

### Fetcher and Navigation Patterns
<!-- activation: keywords=["useFetcher", "fetcher.submit", "fetcher.Form", "fetcher.load", "fetcher.state", "useNavigation", "navigation.state", "optimistic"] -->

- [ ] **fetcher.submit without error handling**: flag `fetcher.submit()` calls that never check `fetcher.state` or `fetcher.data` for error responses -- the mutation may fail silently with no user feedback
- [ ] **Missing optimistic UI**: flag form-based mutations on interactive lists (todo, cart, comments) that wait for the server response before updating the UI -- use `useNavigation` or `useFetcher` state to show optimistic updates and revert on error
- [ ] **Nested loader waterfall**: flag parent loaders that fetch data a child loader also needs, or child loaders that cannot start until parent data resolves -- restructure with `defer()` or flatten the route hierarchy to parallelize data loading

## Common False Positives

- **Loader with analytics call**: non-mutating, fire-and-forget analytics or logging in a loader is acceptable if it does not alter application state or fail the request.
- **Action returning validation errors**: returning `json({ errors })` without redirect is correct when the form needs to display validation errors to the user.
- **Intentionally broad loader data**: admin dashboards or debugging routes may legitimately return full records; verify the route is access-controlled.
- **No optimistic UI on destructive actions**: delete operations may intentionally wait for server confirmation before updating UI to avoid showing deleted state prematurely.
- **v1 vs v2 route conventions**: Remix v1 uses CatchBoundary separately; v2 merged it into ErrorBoundary with isRouteErrorResponse. Both patterns are valid for their respective versions.

## Severity Guidance

| Finding | Severity |
|---|---|
| Secrets or internal fields leaked in loader response to client | Critical |
| Action without input validation (injection risk) | Critical |
| Loader performing database writes or mutations | Critical |
| Missing CSRF protection on POST forms | Important |
| Missing ErrorBoundary on route with loader/action | Important |
| Untyped useLoaderData hiding data shape mismatches | Important |
| defer() without Suspense/Await fallback | Important |
| Action without redirect after successful mutation | Important |
| Missing optimistic UI on interactive mutations | Minor |
| useActionData accessed without null check | Minor |
| Loader returning full DB row (overfetching) | Minor |
| Missing Cache-Control on public loader data | Minor |

## See Also

- `fw-react` -- React hook and component pitfalls apply within Remix route components
- `sec-owasp-a03-injection` -- unvalidated action inputs are injection vectors
- `sec-owasp-a01-broken-access-control` -- loaders and actions without auth checks expose data
- `sec-owasp-a05-misconfiguration` -- missing CSRF is a security misconfiguration
- `principle-separation-of-concerns` -- route modules should delegate to service layers
- `fw-nextjs` -- compare Next.js server actions with Remix actions for migration reviews

## Authoritative References

- [Remix Documentation -- "Loaders"](https://remix.run/docs/en/main/route/loader)
- [Remix Documentation -- "Actions"](https://remix.run/docs/en/main/route/action)
- [Remix Documentation -- "Error Handling"](https://remix.run/docs/en/main/guides/errors)
- [Remix Documentation -- "Streaming with defer"](https://remix.run/docs/en/main/guides/streaming)
- [Remix Documentation -- "Form vs fetcher"](https://remix.run/docs/en/main/discussion/form-vs-fetcher)
- [Kent C. Dodds -- "Full Stack Components"](https://www.epicweb.dev/full-stack-components)
