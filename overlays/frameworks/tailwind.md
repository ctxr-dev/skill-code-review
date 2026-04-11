# Tailwind CSS — Review Overlay

Load this overlay for the **Frontend**, **Accessibility**, and **Maintainability** specialists when Tailwind CSS usage is detected.

## Configuration — Purge and Content

- [ ] `content` (Tailwind v3) or `purge` (v2) globs cover every file that renders Tailwind class names, including JS/TS files that build class strings dynamically
- [ ] Dynamically constructed class names (e.g., `"bg-" + color`) are not used; Tailwind cannot statically analyze partial strings — use full class names with a safelisted pattern or a lookup object instead
- [ ] `safelist` entries are limited and justified; over-safelisting defeats tree-shaking and inflates bundle size
- [ ] The `tailwind.config` file is the single source of truth for design tokens; no parallel CSS custom property definitions that can drift out of sync

## Design System — Theme Consistency

- [ ] Custom colors, spacing, and typography are defined in `theme.extend` rather than replacing defaults wholesale, unless a full design token override is intentional
- [ ] `theme.extend` values reference existing scale values (e.g., `spacing['4']`) or design token variables rather than arbitrary pixel values
- [ ] Font families, font sizes, and line heights are defined in the theme and applied via semantic class names, not hardcoded arbitrary values throughout components
- [ ] Dark mode strategy (`media` vs `class`) is set once in config and applied consistently; mixed usage of both patterns causes theming bugs
- [ ] Dark mode class variants are applied alongside light variants on every element that changes appearance (`bg-white dark:bg-gray-900`), not added ad hoc

## Authoring — Class Usage

- [ ] `@apply` is used sparingly and only in shared base layer styles (e.g., `.btn`, `.form-input`); component-level `@apply` blocks should be refactored to component abstractions or utility composition
- [ ] Responsive variants (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`) follow a mobile-first progression; desktop-only styles override mobile base, not the reverse
- [ ] Arbitrary value escape hatches (`w-[347px]`, `text-[#a3e635]`) are flagged for design review; repeated arbitrary values indicate a missing theme token
- [ ] `!important` modifier (`!`) is used only as a last resort and documented with a comment explaining why specificity cannot be resolved another way
- [ ] Class ordering follows a consistent convention (layout → box model → typography → color → effects) — enforced by Prettier Tailwind plugin if available

## Plugin Authoring

- [ ] Custom plugins added via `plugin()` follow the layering convention: `addBase` for reset/root styles, `addComponents` for reusable patterns, `addUtilities` for single-purpose classes
- [ ] Plugin utilities that expose variants are tested in the purge/content pipeline to ensure they are not stripped
- [ ] Third-party Tailwind plugins are pinned to a specific version; breaking changes in plugins can silently alter visual output
