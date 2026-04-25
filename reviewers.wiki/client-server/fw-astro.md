---
id: fw-astro
type: primary
depth_role: leaf
focus: "Detect Astro-specific pitfalls in island hydration directives, static/dynamic rendering mismatches, content collection misuse, and unnecessary client-side JavaScript."
parents:
  - index.md
covers:
  - "client:load on components that could use client:idle or client:visible"
  - "Interactive component missing client: directive rendering as static HTML"
  - Large JS library imported in frontmatter when server-only usage is intended
  - Mixing multiple framework islands without architectural justification
  - Missing getStaticPaths for dynamic routes in static output mode
  - Content collection schema not validated with zod defineCollection
  - Missing image optimization via Astro Image component
  - "Excessive client:only usage defeating static site generation purpose"
  - Frontmatter fetch without error handling
  - Island component receiving non-serializable props
  - "Astro.glob() used where content collections provide type safety"
tags:
  - astro
  - islands
  - ssg
  - ssr
  - hydration
  - content-collections
  - performance
  - frontend
  - mpa
activation:
  file_globs:
    - "**/*.astro"
    - "**/astro.config.*"
  keyword_matches:
    - Astro
    - frontmatter
    - "client:load"
    - "client:idle"
    - "client:visible"
    - "client:only"
    - "client:media"
    - getStaticPaths
    - Content Collections
    - defineCollection
  structural_signals:
    - "Astro frontmatter code fence (---)"
    - Island hydration directive on framework component
    - Content collection configuration
source:
  origin: file
  path: fw-astro.md
  hash: "sha256:150270dcc3480abea818c46c92aeb6ffbabd81839c34c2c91e0d97af99f582e8"
---
# Astro Framework Reviewer

## When This Activates

Activates when diffs touch `.astro` files, Astro configuration, or content collection definitions. Astro's island architecture ships zero JavaScript by default and selectively hydrates interactive components -- the wrong hydration directive silently ships unnecessary JS or silently renders a dead interactive component. Content collections provide type-safe content but only when schemas are defined. This reviewer targets detection heuristics for hydration directive misuse, static/dynamic rendering mismatches, and content pipeline pitfalls unique to Astro's multi-page architecture.

## Audit Surface

- [ ] Component with client:load that has no immediate interactivity need (should be client:idle or client:visible)
- [ ] Framework component in .astro template without any client: directive
- [ ] Large npm package imported in frontmatter code fence for server-side use (verify intent)
- [ ] Multiple framework islands (React + Vue + Svelte) on single page without shared state justification
- [ ] Dynamic route in output:static project missing getStaticPaths export
- [ ] Content collection defined without zod schema in config.ts
- [ ] img element used instead of Astro Image or Picture component for local assets
- [ ] client:only used on components that could render server-side with client:load
- [ ] Frontmatter fetch() call without try/catch or error boundary
- [ ] Island prop passing function, Date, Map, Set, or class instance (not serializable)
- [ ] Astro.glob() used for content that should be a typed content collection
- [ ] Middleware performing heavy computation on every request
- [ ] API endpoint returning sensitive data without authentication check
- [ ] ViewTransitions enabled without fallback for unsupported browsers
- [ ] output:server config when most pages are static (should use hybrid)

## Detailed Checks

### Hydration Directive Selection
<!-- activation: keywords=["client:load", "client:idle", "client:visible", "client:only", "client:media"] -->

- [ ] **client:load overuse**: flag `client:load` on components below the fold, in modals, in tabs, or in sections the user may never scroll to -- `client:load` hydrates immediately on page load, adding to Time to Interactive; use `client:visible` for below-fold content and `client:idle` for non-critical interactivity
- [ ] **Missing client: directive**: flag React, Vue, Svelte, Solid, or Preact components used in `.astro` templates without any `client:` directive -- Astro renders these as static HTML with no JavaScript; if the component has event handlers, state, or effects, they will not work; add the appropriate `client:` directive
- [ ] **client:only overuse**: flag `client:only` (skips SSR entirely) on components that could render meaningful HTML server-side -- `client:only` defeats SSG/SSR benefits: no HTML until JS loads, no SEO content, no progressive enhancement; use `client:load` or `client:visible` unless the component genuinely cannot render server-side (e.g., depends on canvas, WebGL, or browser-only API at render time)
- [ ] **client:media specificity**: flag `client:media` with overly broad media queries (e.g., `client:media="(min-width: 0px)"` which is always true) -- this is equivalent to `client:load` with extra overhead; use `client:load` or a meaningful breakpoint
- [ ] **Hydration directive on Astro component**: flag `client:*` directives on `.astro` components -- Astro components are server-only by design and do not support hydration; the directive is silently ignored

### Island Architecture Discipline
<!-- activation: keywords=["React", "Vue", "Svelte", "Solid", "Preact", "import", "island", "framework"] -->

- [ ] **Multi-framework islands**: flag pages importing components from more than two UI frameworks (e.g., React + Vue + Svelte) -- each framework adds its own runtime to the page bundle; consolidate on one framework per project or justify the mix (e.g., migrating from one to another)
- [ ] **Non-serializable island props**: flag framework components receiving props that cannot be serialized across the island boundary -- functions, class instances, Symbols, Maps, Sets, and Dates do not survive Astro's HTML serialization; pass only JSON-serializable primitives, arrays, and plain objects
- [ ] **Shared state across islands**: flag multiple islands on the same page that need to share state but use separate framework runtimes (React island + Svelte island) -- state cannot be shared via framework context; use nanostores, custom events, or URL state instead
- [ ] **Island granularity**: flag entire page sections wrapped in a single framework island when only a small interactive widget is needed -- extract the interactive part into its own island and keep the surrounding content as static Astro HTML

### Static Site Generation and Routing
<!-- activation: keywords=["getStaticPaths", "output", "static", "hybrid", "server", "params", "slug", "...path", "prerender"] -->

- [ ] **Missing getStaticPaths**: flag files matching `[param].astro` or `[...rest].astro` in projects with `output: 'static'` that do not export a `getStaticPaths` function -- Astro cannot generate static pages for dynamic routes without knowing all possible parameter values; the build will fail
- [ ] **getStaticPaths returning unbounded results**: flag `getStaticPaths` that fetches from an API without pagination limits -- generating thousands of static pages slows builds and may exhaust memory; paginate with `paginate()` helper or limit scope
- [ ] **output:server when hybrid suffices**: flag projects configured with `output: 'server'` where most pages do not use server-side features (cookies, headers, redirects) -- `output: 'hybrid'` pre-renders static pages and only server-renders pages that opt in with `export const prerender = false`, reducing hosting cost and improving performance
- [ ] **Missing prerender export**: flag pages in hybrid mode that should be static but lack `export const prerender = true` -- they default to server-rendered, adding unnecessary server load

### Content Collections
<!-- activation: keywords=["defineCollection", "getCollection", "getEntry", "z.object", "schema", "content", "data", "slug", "render"] -->

- [ ] **Missing schema validation**: flag content collections defined in `src/content/config.ts` without a zod schema -- unvalidated collections silently accept malformed frontmatter, causing runtime errors when templates access missing fields
- [ ] **Astro.glob() for content**: flag `Astro.glob('src/content/**/*.md')` used to load content that should use `getCollection()` -- glob provides no type safety, no schema validation, and no build-time error reporting; migrate to content collections
- [ ] **Direct file reads for content**: flag `fs.readFileSync` or `import.meta.glob` used to read markdown/MDX in `src/content/` -- these bypass Astro's content layer and lose frontmatter validation, slug generation, and rendering integration
- [ ] **Collection schema drift**: flag content collection schemas that do not match the fields actually used in templates -- a `z.string()` field accessed as an array or a required field that is optional in practice causes build failures or runtime errors

### Performance and Asset Optimization
<!-- activation: keywords=["<img", "Image", "Picture", "getImage", "assets", "public/", "fetch(", "import("] -->

- [ ] **Unoptimized images**: flag `<img>` elements referencing local assets in `src/assets/` or `public/` instead of using Astro's `<Image>` or `<Picture>` components -- Astro auto-optimizes images (format conversion, resizing, lazy loading); raw `<img>` bypasses this
- [ ] **Images in public/ directory**: flag images placed in `public/` that could be in `src/assets/` -- images in `public/` are served as-is without optimization; only place images in `public/` when they must have a stable URL (favicons, Open Graph images linked from external services)
- [ ] **Frontmatter fetch without error handling**: flag `fetch()` calls in Astro frontmatter (the `---` code fence) without try/catch -- errors in frontmatter crash the entire page build; wrap in try/catch and provide fallback content or a meaningful build error
- [ ] **Heavy middleware**: flag Astro middleware (`src/middleware.ts`) that performs database queries, external API calls, or heavy computation on every request without caching -- middleware runs on every route; cache results or limit scope to specific paths

## Common False Positives

- **client:load on above-the-fold interactive components**: a navigation menu, hero CTA, or authentication widget that must be interactive immediately on load correctly uses `client:load`. Do not flag these.
- **client:only for canvas/WebGL**: components that render exclusively via canvas, WebGL, or browser-specific APIs (Web Audio, Web Bluetooth) cannot produce meaningful server-side HTML. `client:only` is correct here.
- **Large library in frontmatter for build-time processing**: importing a library like `sharp`, `unified`, or `shiki` in frontmatter for build-time image/content processing is server-only code and does not affect client bundle size. Verify it is not accidentally included in a client-hydrated path.
- **Single framework per project**: if the project uses only React (no Vue/Svelte/Solid), one framework runtime in the bundle is expected and not a multi-framework concern.
- **Astro.glob for non-content files**: `Astro.glob` is appropriate for importing utility scripts, data files, or component collections that are not markdown content.

## Severity Guidance

| Finding | Severity |
|---|---|
| API endpoint returning sensitive data without authentication | Critical |
| Missing getStaticPaths for dynamic route in static mode (build failure) | Critical |
| Framework component with event handlers but no client: directive (dead interactivity) | Important |
| client:load on below-fold component that should be client:visible | Important |
| Content collection without zod schema validation | Important |
| client:only on component that can render server-side HTML | Important |
| Non-serializable props passed to island component | Important |
| Frontmatter fetch without error handling | Important |
| Multiple UI framework runtimes on single page without justification | Minor |
| img element instead of Astro Image for local assets | Minor |
| output:server when hybrid mode would suffice | Minor |
| Astro.glob used where content collections provide better type safety | Minor |

## See Also

- `fw-react` -- React components used as Astro islands must follow React best practices; hydration bugs compound with island serialization issues
- `fw-solidjs` -- SolidJS islands in Astro benefit from SolidJS's small runtime; same reactivity pitfalls apply within the island boundary
- `fw-qwik` -- Qwik's resumability and Astro's islands both minimize client JS; compare the approaches for partial hydration
- `sec-xss-dom` -- Astro's `set:html` directive and framework island innerHTML patterns are DOM XSS vectors
- `perf-startup-cold-start` -- Astro's zero-JS default minimizes cold start; client:load and client:only re-introduce it per island
- `principle-separation-of-concerns` -- mixing data fetching, rendering, and interactivity in a single .astro file is common but should be bounded

## Authoritative References

- [Astro Documentation -- Client Directives](https://docs.astro.build/en/reference/directives-reference/#client-directives)
- [Astro Documentation -- Content Collections](https://docs.astro.build/en/guides/content-collections/)
- [Astro Documentation -- Image Optimization](https://docs.astro.build/en/guides/images/)
- [Astro Documentation -- Server-Side Rendering](https://docs.astro.build/en/guides/server-side-rendering/)
- [Jason Miller -- "Islands Architecture" (patterns.dev)](https://www.patterns.dev/posts/islands-architecture)
- [Astro Blog -- "Astro Islands: A Component Architecture for the Web"](https://astro.build/blog/astro-islands/)
