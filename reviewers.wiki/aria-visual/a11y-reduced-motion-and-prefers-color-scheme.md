---
id: a11y-reduced-motion-and-prefers-color-scheme
type: primary
depth_role: leaf
focus: Detect animations without prefers-reduced-motion check, missing forced colors support, dark mode contrast failures, and transition durations not respecting user preference.
parents:
  - index.md
covers:
  - CSS animation or transition defined without prefers-reduced-motion media query
  - "JavaScript animation (requestAnimationFrame, GSAP, Framer Motion) ignoring motion preference"
  - "Forced colors mode (Windows High Contrast) not supported or breaking layout"
  - "Dark mode (prefers-color-scheme: dark) introducing contrast violations"
  - Transition duration not reduced or removed for reduced-motion users
  - Auto-playing animation or video without respecting motion preferences
  - Parallax or scroll-triggered animation without motion preference check
  - "Color-only information (status, severity) lost in forced colors or dark mode"
  - Focus indicators invisible in dark mode or high contrast mode
tags:
  - reduced-motion
  - prefers-color-scheme
  - dark-mode
  - high-contrast
  - forced-colors
  - a11y
  - accessibility
  - animation
  - vestibular
  - media-query
activation:
  file_globs:
    - "**/*.css"
    - "**/*.scss"
    - "**/*.less"
    - "**/*.styled.*"
    - "**/*.jsx"
    - "**/*.tsx"
    - "**/*.vue"
    - "**/*.svelte"
  keyword_matches:
    - animation
    - "@keyframes"
    - transition
    - prefers-reduced-motion
    - prefers-color-scheme
    - forced-colors
    - requestAnimationFrame
    - gsap
    - framer-motion
    - motion.
    - animate
    - parallax
    - scroll-trigger
    - dark
    - high-contrast
  structural_signals:
    - animation_without_motion_query
    - dark_mode_contrast_issue
    - no_forced_colors_support
source:
  origin: file
  path: a11y-reduced-motion-and-prefers-color-scheme.md
  hash: "sha256:77d0f004ce9e167f32f31e97880a2cf7845f92e550e6bcfaed0d84f754e6c384"
---
# Reduced Motion and Color Scheme Preferences

## When This Activates

Activates on diffs that introduce CSS animations, transitions, keyframes, JavaScript-driven animations, dark mode styles, or color theme changes. Motion sensitivity affects an estimated 35% of adults, and vestibular disorders can be triggered by parallax, auto-play, and rapid animations. Color scheme preferences (dark mode, high contrast, forced colors) are accessibility features, not cosmetic choices. This reviewer ensures that user preferences are respected and that visual information is not lost across color modes.

## Audit Surface

- [ ] CSS @keyframes or transition without corresponding prefers-reduced-motion query
- [ ] JavaScript animation library used without checking matchMedia(prefers-reduced-motion)
- [ ] requestAnimationFrame loop for visual animation without motion preference gate
- [ ] Parallax effect or scroll-driven animation without reduced-motion alternative
- [ ] prefers-color-scheme: dark styles with text/background contrast below 4.5:1
- [ ] Dark mode inverting colors without checking contrast of all text pairs
- [ ] Forced colors (forced-colors: active) not tested -- custom colors may disappear
- [ ] Color-only status indicator (red/green) without text, icon, or pattern fallback
- [ ] Focus indicator using color that becomes invisible in dark mode
- [ ] transition-duration not set to 0s inside prefers-reduced-motion: reduce
- [ ] Auto-playing hero animation or carousel without pause mechanism
- [ ] Animated loading spinner as only progress indicator (no text)

## Detailed Checks

### CSS Animations and prefers-reduced-motion (2.3.3)
<!-- activation: keywords=["animation", "@keyframes", "transition", "transform", "prefers-reduced-motion", "motion-safe", "motion-reduce", "animation-duration", "animation-play-state", "infinite"] -->

- [ ] **Animation without motion query**: flag CSS `animation` or `@keyframes` declarations that have no corresponding `@media (prefers-reduced-motion: reduce)` override -- users who set reduced motion still see the animation
- [ ] **Transition without motion query**: flag `transition` properties on transforms, opacity, or position changes without a reduced-motion override -- subtle transitions are usually fine, but sliding, bouncing, or scaling transitions should be reduced
- [ ] **Motion query only pauses, does not remove**: flag `@media (prefers-reduced-motion: reduce)` that sets `animation-play-state: paused` but does not set `animation: none` or `animation-duration: 0s` -- paused animations can resume unexpectedly
- [ ] **Infinite animation**: flag `animation-iteration-count: infinite` without reduced-motion override -- continuous motion is particularly triggering for vestibular disorders
- [ ] **Global motion reset missing**: flag large projects with many animations but no global `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }` baseline

### JavaScript and Library Animations
<!-- activation: keywords=["requestAnimationFrame", "gsap", "anime", "framer-motion", "motion.", "useSpring", "useAnimation", "animate(", "Lottie", "rive", "setTimeout", "setInterval", "IntersectionObserver", "scroll"] -->

- [ ] **JS animation ignoring preference**: flag `requestAnimationFrame` loops, GSAP timelines, Framer Motion animate calls, or Lottie renderers that do not check `window.matchMedia('(prefers-reduced-motion: reduce)')` before starting
- [ ] **Scroll-triggered animation**: flag IntersectionObserver or scroll event handlers that trigger animations without checking the motion preference -- parallax and scroll-reveal effects are common triggers
- [ ] **Framer Motion without reduce prop**: flag Framer Motion components without `<MotionConfig reducedMotion="user">` or per-component `whileInView` / `animate` that does not respect the system setting
- [ ] **Auto-playing carousel or slider**: flag carousels that auto-advance without a pause button and without disabling auto-play when reduced-motion is active

### Dark Mode Contrast (1.4.3, 1.4.11)
<!-- activation: keywords=["prefers-color-scheme", "dark", "dark-mode", "theme", "color-scheme", "data-theme", "class=dark", "--color", "--bg", "background", "foreground"] -->

- [ ] **Dark mode contrast failure**: flag `prefers-color-scheme: dark` or `.dark` theme styles where the text/background color pair drops below 4.5:1 for normal text or 3:1 for large text
- [ ] **Focus indicator invisible in dark mode**: flag focus indicators that use a color visible in light mode but indistinguishable from the dark mode background
- [ ] **Border/divider invisible in dark mode**: flag borders or dividers that rely on a light-mode color and become invisible against a dark background
- [ ] **Hardcoded colors overriding theme tokens**: flag hardcoded hex/rgb values inside dark-mode styles instead of using CSS custom properties -- hardcoded colors resist theme changes and are easy to miscalculate

### Forced Colors Mode (Windows High Contrast)
<!-- activation: keywords=["forced-colors", "high-contrast", "-ms-high-contrast", "CanvasText", "Canvas", "LinkText", "ButtonText", "Highlight", "system-colors"] -->

- [ ] **Custom colors lost in forced colors**: flag UI that relies on custom background colors for meaning (colored badges, status dots) without `@media (forced-colors: active)` fallback -- forced colors mode replaces custom colors with system colors
- [ ] **SVG icons invisible**: flag SVG icons that use `fill: currentColor` without testing that they remain visible when the system overrides the color -- or SVGs that use hardcoded fills that are overridden to transparent
- [ ] **Missing forced-colors meta**: flag absence of testing or support for `@media (forced-colors: active)` in component libraries that use extensive custom theming

### Color-Only Information (1.4.1)
<!-- activation: keywords=["color", "red", "green", "yellow", "status", "error", "warning", "success", "badge", "indicator", "severity", "active", "disabled", "selected"] -->

- [ ] **Status conveyed by color alone**: flag status indicators (green for success, red for error) that lack a text label, icon, or pattern to convey the same information -- colorblind users and forced-colors-mode users cannot distinguish them
- [ ] **Disabled state is color-only**: flag disabled elements distinguished only by a lighter color without text, opacity change, or visual indicator -- screen readers announce disabled state, but sighted users with color vision deficiency may miss it

## Common False Positives

- **Micro-interactions**: very short transitions (under 100ms) on opacity or color are generally safe for vestibular sensitivity. Flag only significant motion (transform, position, scale, parallax).
- **CSS framework utilities**: Tailwind's `motion-safe:` and `motion-reduce:` utilities handle the media query. Do not flag if the motion-reduce variant is applied.
- **User-triggered animations**: animations that play only in direct response to a user action (click, hover) are less likely to trigger vestibular reactions. Still flag if they involve large movement.
- **Print stylesheets**: animations in print media queries are irrelevant. Do not flag.

## Severity Guidance

| Finding | Severity |
|---|---|
| Infinite animation without prefers-reduced-motion override | Critical |
| Auto-playing carousel or parallax without motion preference check | Critical |
| Dark mode text contrast below 4.5:1 | Important |
| Status conveyed by color alone without text or icon | Important |
| JavaScript animation ignoring matchMedia motion preference | Important |
| Focus indicator invisible in dark mode | Important |
| Transition without reduced-motion override (non-essential motion) | Minor |
| Missing forced-colors support in custom-themed components | Minor |
| Animated loading spinner without text fallback | Minor |

## See Also

- `a11y-wcag-2-2-aa` -- contrast requirements (1.4.3, 1.4.11) referenced here
- `a11y-keyboard-navigation` -- focus indicator visibility across color modes
- `fw-react` -- React-specific animation libraries (Framer Motion, React Spring)
- `sec-xss-dom` -- CSS injection can override motion preferences

## Authoritative References

- [W3C, "Understanding SC 2.3.3 Animation from Interactions" -- motion preference guidance](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)
- [MDN, "prefers-reduced-motion" -- media query reference and usage examples](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
- [MDN, "forced-colors" -- media query for Windows High Contrast mode](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors)
- [W3C, "Understanding SC 1.4.1 Use of Color"](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)
