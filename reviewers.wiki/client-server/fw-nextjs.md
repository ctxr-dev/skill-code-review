---
id: fw-nextjs
type: primary
depth_role: leaf
focus: "Detect Next.js-specific pitfalls in server/client component boundaries, data fetching, caching, middleware, and security that cause bundle bloat, data leaks, or misconfigured rendering strategies."
parents:
  - index.md
covers:
  - use client directive on components that could remain server components
  - Data fetching in client components that should be server components
  - Missing revalidate or cache configuration on server-side fetch calls
  - Secrets or environment variables exposed in client-side bundles
  - Middleware performing heavy computation or data fetching
  - "ISR/SSG misconfiguration causing stale or always-dynamic pages"
  - Missing loading.tsx or error.tsx route boundaries
  - API routes without authentication or authorization checks
  - Server actions without input validation
  - Dynamic imports without loading states
  - Missing metadata and SEO configuration
  - "next/image optimization bypassed with unoptimized or raw img tags"
  - Server component importing client-only library pulling it into server bundle
  - "Wrong rendering strategy for the use case (SSR for static content, CSR for SEO pages)"
  - SSR without response caching causing redundant server renders
  - CSR for content that needs search engine indexing
  - ISR stale content served beyond acceptable freshness window
  - Islands architecture with too much client-side JavaScript
  - SSG pages with dynamic data that should use ISR or SSR
  - Missing fallback for ISR pages on first request
  - Full-page hydration when partial hydration or islands would suffice
  - Server-rendered HTML discarded by client-side re-render
  - Streaming SSR without progressive loading boundaries
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
aliases:
  - fe-ssr-csr-ssg-isr-islands
activation:
  file_globs:
    - "**/next.config.*"
    - "**/app/**"
    - "**/pages/**"
  keyword_matches:
    - getServerSideProps
    - getStaticProps
    - generateStaticParams
    - generateMetadata
    - useRouter
    - NextResponse
    - middleware
    - Server Component
    - Client Component
    - use client
    - use server
  structural_signals:
    - use client on data-only component
    - Secret in client bundle
    - Missing route boundary files
source:
  origin: file
  path: fw-nextjs.md
  hash: "sha256:c6fafd4e6940cd80bf1ac630faecfd494db31a0522e62b16ac0a4b94eb1dee64"
---
# Next.js Server/Client Boundary and Routing Pitfalls

## When This Activates

Activates when diffs touch Next.js configuration, app router files, pages router files, middleware, API routes, or server actions. Next.js blurs the server/client boundary -- a single file can run on the server, the client, or both depending on directives and imports. This creates a unique class of bugs where secrets leak to browsers, server-only logic runs client-side, caching behaves unexpectedly, and route segments lack proper error/loading boundaries. This reviewer detects patterns specific to the Next.js rendering model that general React reviewers miss.

## Audit Surface

- [ ] "use client" directive at the top of a file that performs no client-side interactivity (no hooks, no browser APIs, no event handlers)
- [ ] useState, useEffect, or onClick in a component that only renders data fetched from an API
- [ ] fetch() in a client component where the same data could be fetched in a server component or via generateStaticParams
- [ ] fetch() call without `{ next: { revalidate: N } }` or `{ cache: 'no-store' }` -- default caching behavior is implicit and error-prone
- [ ] Environment variable prefixed NEXT_PUBLIC_ containing a secret (API key, database URL, auth token)
- [ ] process.env.SECRET_KEY referenced in a file with "use client" directive or imported by a client component
- [ ] middleware.ts performing database queries, heavy computation, or calling external APIs
- [ ] generateStaticParams returning empty array or missing for dynamic route segments with known paths
- [ ] Route segment missing loading.tsx for async data fetching (user sees blank during load)
- [ ] Route segment missing error.tsx (unhandled errors crash the layout)
- [ ] API route handler (route.ts) with no authentication check before processing the request
- [ ] Server action ("use server" function) that does not validate or sanitize its arguments
- [ ] Dynamic import via next/dynamic without a loading component
- [ ] Missing generateMetadata or metadata export on page routes
- [ ] Raw `<img>` tag instead of next/image, or next/image with unoptimized={true} without justification
- [ ] Large client component tree that could be split into server components with client islands

## Detailed Checks

### Server/Client Boundary
<!-- activation: keywords=["use client", "use server", "Server Component", "Client Component", "import", "useState", "useEffect", "onClick", "onChange", "onSubmit"] -->

- [ ] **Unnecessary "use client"**: flag files with `"use client"` that contain no hooks (useState, useEffect, useRef, etc.), no browser API usage (window, document, localStorage), and no event handlers -- removing the directive keeps the component on the server, reducing client bundle size; see `perf-startup-cold-start` for bundle impact
- [ ] **Data fetching in client component**: flag client components that fetch data via useEffect + fetch or SWR/React Query when the data is not user-specific or interactive -- server components can fetch data directly without shipping the fetch logic to the client
- [ ] **Client library imported in server component**: flag server components importing browser-only libraries (e.g., chart libraries, animation libraries) that will fail at build time -- either add "use client" or use next/dynamic with `{ ssr: false }`
- [ ] **Shared module leaking server code**: flag modules imported by both server and client components that contain server-only code (database clients, file system access) -- the client bundler will attempt to include it; use `server-only` package to enforce the boundary

### Data Fetching and Caching
<!-- activation: keywords=["fetch", "revalidate", "cache", "getServerSideProps", "getStaticProps", "generateStaticParams", "unstable_cache", "revalidatePath", "revalidateTag"] -->

- [ ] **Missing cache directive**: flag `fetch()` calls in server components without explicit `{ cache: 'force-cache' }`, `{ cache: 'no-store' }`, or `{ next: { revalidate: N } }` -- the default caching behavior changed across Next.js versions and is a common source of stale data bugs
- [ ] **ISR without revalidate**: flag pages using `generateStaticParams` but not setting a `revalidate` export or per-fetch revalidation -- the page will be static forever, serving stale data after the underlying data changes
- [ ] **getServerSideProps for static data**: flag `getServerSideProps` fetching data that rarely changes -- use `getStaticProps` with revalidation for better performance; in app router, use server components with ISR
- [ ] **Waterfall data fetching**: flag sequential `await fetch()` calls in a single server component where the fetches are independent -- use `Promise.all()` to parallelize

### Middleware Discipline
<!-- activation: keywords=["middleware", "NextResponse", "NextRequest", "matcher", "config"] -->

- [ ] **Heavy middleware**: flag middleware.ts performing database queries, external API calls, or computation beyond simple header/cookie/redirect logic -- middleware runs on every matched request at the edge; heavy work belongs in API routes or server components
- [ ] **Missing matcher config**: flag middleware.ts without a `config.matcher` export -- the middleware runs on every route including static assets, API routes, and _next paths, wasting compute
- [ ] **Middleware modifying response body**: flag middleware returning a full response body instead of using NextResponse.next(), redirect(), or rewrite() -- middleware is designed for routing decisions, not rendering

### API Routes and Server Actions Security
<!-- activation: keywords=["route.ts", "route.js", "GET", "POST", "PUT", "DELETE", "PATCH", "use server", "server action", "NextRequest", "NextResponse", "formData", "zod", "validate"] -->

- [ ] **Unauthenticated API route**: flag API route handlers (GET, POST, PUT, DELETE in route.ts) that process requests without verifying authentication (session, token, API key) -- unauthenticated endpoints are exposed to the internet; see `sec-owasp-a01-broken-access-control`
- [ ] **Unvalidated server action**: flag server actions (functions with "use server") that use their arguments without validation (Zod, yup, or manual checks) -- server actions are callable by anyone who can craft a POST request; treat inputs as untrusted
- [ ] **Server action without CSRF protection**: verify server actions are invoked via Next.js form submissions or `useFormState` which include built-in CSRF tokens -- direct fetch calls to server action endpoints bypass this
- [ ] **Secrets in API response**: flag API routes returning environment variables, internal IDs, or stack traces in response bodies -- sanitize responses to expose only the intended data

### Route Boundaries and UX
<!-- activation: keywords=["loading", "error", "not-found", "layout", "template", "page", "Suspense", "generateMetadata", "metadata"] -->

- [ ] **Missing loading.tsx**: flag app router route segments that perform async data fetching in page.tsx but have no loading.tsx or Suspense boundary -- the user sees a blank screen during data loading
- [ ] **Missing error.tsx**: flag route segments with no error.tsx -- an unhandled error in the page or its children crashes the nearest layout instead of showing a recovery UI
- [ ] **Missing not-found handling**: flag dynamic routes (`[slug]`, `[id]`) that do not call `notFound()` when the resource is missing -- the user sees a cryptic error instead of a 404 page
- [ ] **Missing metadata**: flag page routes with no `generateMetadata` function or static `metadata` export -- pages without metadata have no title, description, or Open Graph tags, harming SEO and shareability

### Image and Asset Optimization
<!-- activation: keywords=["img", "Image", "next/image", "unoptimized", "src", "width", "height", "priority", "loading"] -->

- [ ] **Raw img tag**: flag `<img>` tags in Next.js projects where `next/image` should be used -- next/image provides automatic WebP/AVIF conversion, responsive sizing, and lazy loading
- [ ] **unoptimized without justification**: flag `<Image unoptimized />` -- this bypasses all image optimization; only appropriate for SVGs or images already optimized by a CDN
- [ ] **Missing priority on LCP image**: flag above-the-fold hero images using next/image without `priority={true}` -- the image is lazy-loaded by default, hurting Largest Contentful Paint

## Common False Positives

- **"use client" for interactive islands**: components with click handlers, form inputs, or animation hooks legitimately need "use client" even if they also display server-fetched data.
- **Intentional no-cache**: `{ cache: 'no-store' }` on a fetch for real-time data (stock prices, live feeds) is correct; do not flag as missing revalidation.
- **Middleware for auth redirects**: lightweight cookie/header checks and redirects are the intended middleware use case; do not flag as "heavy middleware."
- **API routes for webhooks**: webhook endpoints from external services may not have traditional auth headers; verify they validate webhook signatures instead.
- **Pages router coexisting with app router**: during migration, both directories may exist legitimately.

## Severity Guidance

| Finding | Severity |
|---|---|
| Secret or API key exposed via NEXT_PUBLIC_ or in client component | Critical |
| API route with no authentication check | Critical |
| Server action without input validation | Critical |
| process.env.SECRET accessed in client-bundled code | Critical |
| "use client" on data-only component (bundle bloat) | Important |
| Missing error.tsx on route with async data fetching | Important |
| fetch() without explicit cache/revalidate configuration | Important |
| Middleware performing database queries or heavy computation | Important |
| Missing loading.tsx for async page (blank screen) | Minor |
| Raw img tag instead of next/image | Minor |
| Missing generateMetadata on page route | Minor |
| Dynamic import without loading component | Minor |

## See Also

- `fw-react` -- React hook and component pitfalls apply within Next.js client components
- `sec-xss-dom` -- dangerouslySetInnerHTML in Next.js client components is a DOM XSS sink
- `sec-owasp-a01-broken-access-control` -- unauthenticated API routes are broken access control
- `perf-startup-cold-start` -- unnecessary "use client" directives inflate client bundle and cold-start time
- `principle-separation-of-concerns` -- server/client boundary is a separation-of-concerns discipline

## Authoritative References

- [Next.js Documentation -- "Server and Client Components"](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [Next.js Documentation -- "Data Fetching, Caching, and Revalidating"](https://nextjs.org/docs/app/building-your-application/data-fetching/fetching-caching-and-revalidating)
- [Next.js Documentation -- "Middleware"](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Next.js Documentation -- "Server Actions and Mutations"](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [Vercel -- "Next.js Security Best Practices"](https://nextjs.org/docs/app/building-your-application/configuring/security)
- [Lee Robinson -- "Understanding Next.js Caching"](https://nextjs.org/docs/app/building-your-application/caching)
