# Next.js — Review Overlay

Load this overlay for the **security**, **performance**, **api-design**, and **architecture-design** specialists when `next` is detected in project dependencies.

---

## Security

- [ ] Server Actions verify authentication and authorization before executing — `auth()` or session checks must be the first operation, not an afterthought after business logic
- [ ] Server Actions that mutate data revalidate via `revalidatePath`/`revalidateTag` after the mutation, not before, to avoid serving stale data
- [ ] `getServerSideProps` / `generateStaticParams` do not serialize sensitive server-only values (tokens, private keys, internal IDs) into the props object passed to the client
- [ ] Environment variables prefixed with `NEXT_PUBLIC_` are intentionally public; secrets are never given this prefix
- [ ] Middleware does not perform expensive operations (DB calls, full auth checks) on every request without short-circuit caching — use edge-compatible lightweight checks
- [ ] API routes (`/api/*` or Route Handlers) authenticate every request independently; they cannot rely on middleware alone for protection
- [ ] `next/headers` cookies and headers are read server-side only; sensitive header values are never forwarded or logged
- [ ] Dynamic route segments (`[param]`) are validated and sanitized before being used in database queries or file-system paths

## RSC / App Router Architecture

- [ ] The `"use client"` boundary is placed as deep in the tree as possible — Server Components should own data fetching; Client Components own interactivity
- [ ] Server Components do not import Client-only modules (browser APIs, `useState`, `useEffect`) directly — check for accidental coupling
- [ ] Data fetching in Server Components uses `fetch` with explicit `cache` and `next.revalidate` options rather than relying on default behavior
- [ ] `loading.tsx` files are placed at the correct route segment level to scope the loading UI to the correct subtree
- [ ] `error.tsx` files are Client Components (they must use `"use client"`) and handle both recoverable errors and unexpected throws
- [ ] Parallel routes (`@slot`) and intercepting routes are not used without a clear architectural reason — they add significant complexity

## Performance / Caching

- [ ] ISR pages set `revalidate` to the minimum acceptable staleness, not an arbitrary large number; `revalidate = 0` means no caching (equivalent to SSR)
- [ ] Static pages (`generateStaticParams`) do not make per-request external API calls that would defeat the build-time generation
- [ ] `next/image` is used for all user-facing images; `width`, `height`, and `priority` are set correctly for above-the-fold images
- [ ] Font loading uses `next/font` with `display: 'swap'` or `display: 'optional'` and is imported once at the layout level
- [ ] Route Handler responses include appropriate `Cache-Control` headers; JSON APIs that are truly dynamic set `no-store`

## Edge Runtime

- [ ] Code targeting the Edge runtime does not import Node.js-only APIs (`fs`, `crypto`, `path`, `Buffer`) — use Web APIs equivalents
- [ ] Middleware file size is kept minimal; large dependency imports in middleware are flagged as they inflate cold-start time

## Configuration

- [ ] `next.config.js` does not disable security headers (`headers()`) that were previously set — verify no accidental removal of CSP, HSTS, or X-Frame-Options
- [ ] `rewrites` and `redirects` do not create open redirect vulnerabilities by forwarding user-controlled destination paths without validation
