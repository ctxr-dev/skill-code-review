---
id: fe-image-font-optimization
type: primary
depth_role: leaf
focus: "Detect unoptimized images, missing lazy loading, font loading issues (FOIT/FOUT), excessive font weights, and missing preload for critical assets that degrade LCP and CLS."
parents:
  - index.md
covers:
  - Unoptimized images served without WebP or AVIF format
  - Missing lazy loading on below-fold images
  - "Font flash from invisible text (FOIT) or unstyled text (FOUT)"
  - Too many font weights or families loaded
  - Missing preload for critical above-fold fonts
  - Large SVG files inlined in HTML or JSX
  - Missing responsive image srcset and sizes attributes
  - Images without explicit width and height causing CLS
  - Icon fonts used instead of SVG icons
  - "Missing next/image or equivalent image optimization component"
tags:
  - images
  - fonts
  - optimization
  - lazy-loading
  - webp
  - avif
  - preload
  - performance
  - frontend
activation:
  file_globs:
    - "**/*.html"
    - "**/*.jsx"
    - "**/*.tsx"
    - "**/*.css"
    - "**/*.vue"
    - "**/*.svelte"
  keyword_matches:
    - <img
    - srcset
    - loading=
    - "@font-face"
    - font-display
    - preload
    - "next/image"
    - Image
    - svg
  structural_signals:
    - image without optimization
    - font without display strategy
    - missing lazy loading
source:
  origin: file
  path: fe-image-font-optimization.md
  hash: "sha256:cfa6d07614fcd91f6afbf604346deffb3fd3c0c98fed6c63e1e35eed905094b1"
---
# Image and Font Optimization Pitfalls

## When This Activates

Activates when diffs touch image elements, font loading configuration, or asset references in HTML, JSX, or CSS. Images and fonts are typically the heaviest assets on a page -- an unoptimized hero image can exceed 1 MB, and loading 6 font weights adds 300+ KB. Missing lazy loading wastes bandwidth on invisible content, missing font-display causes layout shifts, and missing dimensions cause CLS. This reviewer catches the optimization gaps that directly degrade Core Web Vitals.

## Audit Surface

- [ ] img tag with .png or .jpg src without WebP/AVIF alternative or picture element
- [ ] img tag below the fold without loading='lazy' or equivalent framework directive
- [ ] img tag without explicit width and height attributes or CSS aspect-ratio
- [ ] @font-face rule without font-display property
- [ ] Google Fonts link without &display=swap parameter
- [ ] More than 4 font weights loaded from the same family
- [ ] More than 3 font families loaded on a single page
- [ ] Missing link rel='preload' for fonts used in above-fold content
- [ ] SVG inlined in JSX exceeding 5 KB (minified)
- [ ] img tag without srcset for responsive images on varying viewport sizes
- [ ] Icon font loaded for fewer than 10 icons
- [ ] Raw img tag used in Next.js instead of next/image component
- [ ] Image served without CDN or image optimization service

## Detailed Checks

### Image Format and Optimization
<!-- activation: keywords=["<img", "src=", ".png", ".jpg", ".jpeg", ".gif", "webp", "avif", "picture", "source"] -->

- [ ] **No modern format**: flag img elements serving .png or .jpg without a `<picture>` element providing WebP or AVIF alternatives -- WebP is 25-35% smaller than JPEG at equivalent quality; AVIF is 50% smaller; both are supported by all modern browsers
- [ ] **Missing image optimization pipeline**: flag projects serving user-uploaded or static images directly without an image optimization service (Cloudinary, imgix, Vercel Image Optimization, sharp) -- unoptimized images are the single largest contributor to slow page loads
- [ ] **Missing responsive images**: flag img elements on responsive layouts without `srcset` and `sizes` attributes -- mobile users download desktop-sized images wasting bandwidth; use srcset to serve appropriately sized images per viewport
- [ ] **Raw img in Next.js**: flag `<img>` tags in Next.js projects instead of `next/image` -- next/image provides automatic WebP/AVIF conversion, lazy loading, and responsive sizing; see `fw-nextjs`

### Lazy Loading
<!-- activation: keywords=["loading=", "lazy", "intersection", "IntersectionObserver", "above-fold", "below-fold"] -->

- [ ] **Missing lazy loading below fold**: flag img elements that appear below the fold (based on placement in component tree, e.g., in a list item, footer, or secondary section) without `loading="lazy"` -- the browser downloads all images eagerly by default, delaying the critical rendering path
- [ ] **Lazy loading on LCP image**: flag `loading="lazy"` on the LCP candidate image (hero image, above-fold primary image) -- lazy loading defers the download, directly increasing LCP; the LCP image should load eagerly with `fetchpriority="high"`
- [ ] **Missing native lazy**: flag custom IntersectionObserver-based lazy loading when `loading="lazy"` (native browser API) would suffice -- native lazy loading is simpler and more reliable

### Font Loading Strategy
<!-- activation: keywords=["@font-face", "font-display", "Google Fonts", "preload", "woff2", "font-family", "swap", "optional"] -->

- [ ] **Missing font-display**: flag @font-face rules without `font-display: swap` or `font-display: optional` -- without this, the browser hides text until the font loads (FOIT), causing both invisible content and layout shift when the font arrives; see `fe-core-web-vitals-lighthouse`
- [ ] **Too many font weights**: flag font loading configuration that includes more than 4 weights of the same family -- each weight is a separate file (~20-50 KB each); use variable fonts or limit to the weights actually used
- [ ] **Too many families**: flag pages loading more than 3 font families -- each family adds HTTP requests and font files; excessive families indicate a design system inconsistency
- [ ] **Missing font preload**: flag fonts used in above-fold text that are not preloaded via `<link rel="preload" as="font" type="font/woff2" crossorigin>` -- without preload, the browser discovers the font only after parsing CSS, adding a full round-trip to text rendering
- [ ] **Icon font for few icons**: flag icon font libraries (Font Awesome, Material Icons) loaded for fewer than 10 distinct icons -- the full icon font file is 100+ KB; use individual SVG icons or a tree-shakeable icon library instead

### SVG Optimization
<!-- activation: keywords=["svg", "<svg", "viewBox", "path", "inline", "sprite"] -->

- [ ] **Large inline SVG**: flag SVG elements inlined in HTML or JSX exceeding 5 KB minified -- large SVGs block HTML parsing and increase document size; externalize as image files and reference via img tag or use SVG sprites
- [ ] **Unoptimized SVG**: flag SVG files containing editor metadata (Illustrator/Sketch comments, xmlns:xlink, unnecessary group elements) -- run through SVGO to remove 30-60% of file size
- [ ] **Missing viewBox**: flag SVG elements without a `viewBox` attribute -- without viewBox, SVGs do not scale responsively and may render at incorrect sizes

## Common False Positives

- **Above-fold images without lazy loading**: hero images and LCP candidates should NOT be lazy loaded; do not flag eagerly loaded above-fold images.
- **Variable fonts**: a variable font file covering all weights is a single download and does not need weight count limits.
- **SVG icons under 2 KB**: small SVG icons inlined for instant rendering are acceptable; only flag inlined SVGs exceeding 5 KB.
- **Art direction with picture element**: using picture element with different crops per breakpoint (not just format alternatives) is a valid use case for multiple sources.
- **Internal tools**: image optimization may be deprioritized for internal admin tools with few users.

## Severity Guidance

| Finding | Severity |
|---|---|
| LCP image lazy loaded (directly increases LCP) | Critical |
| Missing font-display causing FOIT on above-fold text | Important |
| Unoptimized images (.png/.jpg) without modern format alternatives | Important |
| Images without width/height causing CLS | Important |
| Missing lazy loading on below-fold images | Minor |
| More than 4 font weights loaded | Minor |
| Large inline SVG (>5 KB) | Minor |
| Missing font preload for above-fold text | Minor |

## See Also

- `fe-core-web-vitals-lighthouse` -- image and font optimization directly affect LCP and CLS metrics
- `fw-nextjs` -- next/image and next/font provide built-in optimization for Next.js projects
- `fe-ssr-csr-ssg-isr-islands` -- rendering strategy affects when images and fonts are discovered
- `fe-css-tailwind` -- Tailwind's @apply and utility classes interact with font loading

## Authoritative References

- [web.dev -- "Use WebP Images"](https://web.dev/articles/serve-images-webp)
- [web.dev -- "Browser-Level Image Lazy Loading"](https://web.dev/articles/browser-level-image-lazy-loading)
- [web.dev -- "Best Practices for Fonts"](https://web.dev/articles/font-best-practices)
- [web.dev -- "Optimize Cumulative Layout Shift"](https://web.dev/articles/optimize-cls)
- [MDN -- "Responsive Images"](https://developer.mozilla.org/en-US/docs/Learn/HTML/Multimedia_and_embedding/Responsive_images)
