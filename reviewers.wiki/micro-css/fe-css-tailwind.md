---
id: fe-css-tailwind
type: primary
depth_role: leaf
focus: Detect Tailwind CSS misconfigurations that bloat production CSS, break design consistency, or create maintainability issues from utility class misuse.
parents:
  - index.md
covers:
  - Utility class explosion making templates unreadable
  - "Missing or misconfigured content/purge paths shipping unused CSS"
  - Custom CSS bypassing Tailwind design tokens breaking consistency
  - "!important overuse via Tailwind's important config or manual !important"
  - Responsive breakpoint inconsistency across components
  - Missing darkMode configuration causing flash or broken dark mode
  - Arbitrary values used instead of extending the theme
  - Conflicting utility classes on the same element
  - "Missing @apply extraction for repeated utility patterns"
  - Tailwind CDN script used in production
tags:
  - tailwind
  - css
  - utility-css
  - purge
  - design-tokens
  - frontend
activation:
  file_globs:
    - "**/tailwind.config.*"
    - "**/postcss.config.*"
    - "**/*.css"
  keyword_matches:
    - tailwindcss
    - tailwind
    - "@tailwind"
    - "@apply"
    - "theme("
    - className=
  structural_signals:
    - long utility class strings
    - missing content config
    - custom CSS bypassing tokens
source:
  origin: file
  path: fe-css-tailwind.md
  hash: "sha256:67e0680548b1a72a95e5cf592c42e3fa17b401fa5802214aa555d8e9e605fabc"
---
# Tailwind CSS Configuration and Usage Pitfalls

## When This Activates

Activates when diffs touch Tailwind configuration files, PostCSS configuration, CSS files with @tailwind directives, or templates heavy with utility classes. Tailwind's utility-first approach shifts styling complexity from CSS files to templates -- but misconfigured purging ships megabytes of unused CSS, repeated arbitrary values break design token consistency, and class explosion makes components unreadable. This reviewer catches the patterns that erode Tailwind's benefits.

## Audit Surface

- [ ] tailwind.config with content/purge array missing directories containing templates
- [ ] HTML or JSX element with 15+ utility classes on a single element
- [ ] Custom CSS file using raw values (px, hex colors) instead of theme() or @apply with Tailwind tokens
- [ ] important: true in tailwind.config or frequent !important in utility classes
- [ ] Responsive prefixes (sm:, md:, lg:) applied inconsistently across related components
- [ ] darkMode not configured but dark: prefixed utilities used in templates
- [ ] Arbitrary value brackets (e.g., text-[13px], bg-[#1a1a1a]) used repeatedly for the same value
- [ ] Conflicting utilities on one element (e.g., flex and block, or hidden and flex)
- [ ] Same utility pattern of 5+ classes repeated across 3+ components without @apply extraction
- [ ] Tailwind Play CDN script tag present in production HTML
- [ ] PostCSS config missing tailwindcss plugin
- [ ] Missing tailwind.config content glob for dynamic class generation

## Detailed Checks

### Content/Purge Configuration
<!-- activation: keywords=["content", "purge", "tailwind.config", "safelist", "blocklist"] -->

- [ ] **Missing content paths**: flag tailwind.config where the content array does not include all directories containing template files (components, pages, layouts) -- Tailwind only scans listed paths for class usage; missing paths means those classes are purged from production CSS
- [ ] **Dynamic class construction**: flag template code that builds class names dynamically (e.g., `` `text-${color}-500` ``) without adding the classes to safelist -- Tailwind's static extraction cannot detect dynamically constructed class names
- [ ] **CDN in production**: flag `<script src="https://cdn.tailwindcss.com">` in production HTML -- the CDN version ships the entire Tailwind CSS library (~3 MB) and is intended only for prototyping

### Utility Class Readability
<!-- activation: keywords=["className", "class=", "@apply", "clsx", "classnames", "cn(", "twMerge"] -->

- [ ] **Class explosion**: flag elements with 15+ utility classes -- extract into a component or use @apply in a CSS file for readability; consider if the element is doing too much
- [ ] **Repeated patterns**: flag the same combination of 5+ utility classes appearing in 3+ places -- extract into a shared component or @apply directive to maintain DRY
- [ ] **Conflicting classes**: flag elements with contradictory utilities (e.g., `hidden flex`, `block inline`, `static absolute`) -- only the last one wins in CSS specificity order, making the intent unclear; use tailwind-merge in dynamic class scenarios

### Design Token Consistency
<!-- activation: keywords=["theme", "extend", "colors", "spacing", "fontSize", "arbitrary", "["] -->

- [ ] **Repeated arbitrary values**: flag arbitrary value syntax (e.g., `text-[14px]`, `bg-[#2d2d2d]`) used 3+ times for the same value -- extend the Tailwind theme config instead to maintain a consistent design system
- [ ] **Raw CSS bypassing tokens**: flag custom CSS files that use hardcoded pixel values, hex colors, or font sizes instead of `theme()` function or Tailwind utility classes -- this breaks design token consistency; see `fe-css-unocss-stylex-panda` for atomic CSS token patterns
- [ ] **!important overuse**: flag `important: true` in tailwind.config (makes ALL utilities !important) or frequent `!` prefix in utilities -- this indicates specificity wars that should be solved by restructuring CSS order or component hierarchy

### Responsive and Dark Mode
<!-- activation: keywords=["sm:", "md:", "lg:", "xl:", "dark:", "darkMode", "responsive", "breakpoint"] -->

- [ ] **Inconsistent breakpoints**: flag related components (e.g., card header and card body) using different responsive breakpoints for layout changes -- users see inconsistent reflow at different screen sizes
- [ ] **Dark mode misconfigured**: flag templates using `dark:` prefixed utilities but tailwind.config missing `darkMode: 'class'` or `darkMode: 'media'` -- dark utilities have no effect without configuration, causing flash of wrong theme
- [ ] **Missing mobile-first**: flag components using `max-*` utilities or desktop-first responsive design when the rest of the app uses mobile-first (sm: up) -- inconsistent responsive strategy causes maintenance confusion

## Common False Positives

- **Complex layout elements**: a grid container or complex flex layout may legitimately need 15+ utility classes; check if the element can be decomposed first.
- **One-off arbitrary values**: a single arbitrary value for a unique design requirement (e.g., a specific brand color) is acceptable.
- **Responsive inconsistency across unrelated components**: only flag inconsistency within a component group or layout section, not across the entire app.
- **@apply avoided intentionally**: some teams prefer inline utilities over @apply for colocation; respect the project convention.

## Severity Guidance

| Finding | Severity |
|---|---|
| Tailwind CDN script in production | Critical |
| Content/purge paths missing template directories | Critical |
| Dynamic class construction without safelist | Important |
| important: true in tailwind.config | Important |
| Repeated arbitrary values for same value (3+ times) | Minor |
| Utility class explosion (15+ classes) | Minor |
| Conflicting utility classes on same element | Minor |
| Missing dark mode configuration | Minor |

## See Also

- `fe-css-unocss-stylex-panda` -- alternative atomic CSS frameworks share purge and token consistency pitfalls
- `fe-bundle-analysis-tree-shaking` -- unused CSS from missing purge interacts with overall bundle size
- `fw-react` -- JSX className patterns interact with Tailwind utility usage
- `fw-nextjs` -- Next.js has built-in PostCSS support with Tailwind integration points

## Authoritative References

- [Tailwind CSS Documentation -- "Content Configuration"](https://tailwindcss.com/docs/content-configuration)
- [Tailwind CSS Documentation -- "Reusing Styles"](https://tailwindcss.com/docs/reusing-styles)
- [Tailwind CSS Documentation -- "Dark Mode"](https://tailwindcss.com/docs/dark-mode)
- [Tailwind CSS Documentation -- "Optimizing for Production"](https://tailwindcss.com/docs/optimizing-for-production)
