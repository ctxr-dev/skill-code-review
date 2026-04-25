---
id: aria-visual
type: index
depth_role: subcategory
depth: 1
focus: "ARIA attributes used incorrectly (role mismatch, missing required ARIA properties); ARIA role that does not match the element's behavior (role=button on a div without keyboard handling); Abbreviated text without expansion (title or abbr element); Accessibility announcements not posted for dynamic content changes"
parents:
  - "../index.md"
shared_covers: []
entries:
  - id: a11y-aria-and-live-regions
    file: a11y-aria-and-live-regions.md
    type: primary
    focus: Detect incorrect ARIA roles, misuse of aria-hidden on focusable elements, missing aria-live for dynamic content, redundant ARIA on native elements, and aria-label without visible label.
    tags:
      - aria
      - accessibility
      - a11y
      - live-regions
      - roles
      - screen-reader
      - assistive-technology
      - wcag
      - axe
      - lighthouse
      - keyboard-navigation
      - color-contrast
      - headings
      - tables
      - alt-text
      - aria-live
      - semantics
      - voiceover
      - nvda
      - jaws
  - id: a11y-keyboard-navigation
    file: a11y-keyboard-navigation.md
    type: primary
    focus: Detect missing focus indicators, broken tab order, keyboard traps, custom interactive elements without keyboard handlers, and missing skip navigation.
    tags:
      - keyboard
      - focus
      - tab-order
      - focus-trap
      - skip-nav
      - a11y
      - accessibility
      - navigation
      - roving-tabindex
  - id: a11y-native-platform-ios-android
    file: a11y-native-platform-ios-android.md
    type: primary
    focus: "Detect missing accessibilityLabel (iOS), missing contentDescription (Android), custom views without accessibility traits, undersized touch targets, unsupported Dynamic Type, and untested VoiceOver/TalkBack paths."
    tags:
      - accessibility
      - a11y
      - ios
      - android
      - voiceover
      - talkback
      - dynamic-type
      - accessibilityLabel
      - contentDescription
      - touch-target
      - native
  - id: a11y-reduced-motion-and-prefers-color-scheme
    file: a11y-reduced-motion-and-prefers-color-scheme.md
    type: primary
    focus: Detect animations without prefers-reduced-motion check, missing forced colors support, dark mode contrast failures, and transition durations not respecting user preference.
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
  - id: fe-core-web-vitals-lighthouse
    file: fe-core-web-vitals-lighthouse.md
    type: primary
    focus: "Detect code patterns that degrade Core Web Vitals (LCP, CLS, INP) and Lighthouse scores, including render-blocking resources, layout shifts, and long tasks."
    tags:
      - web-vitals
      - lcp
      - cls
      - inp
      - lighthouse
      - performance
      - rum
      - frontend
  - id: fe-css-unocss-stylex-panda
    file: fe-css-unocss-stylex-panda.md
    type: primary
    focus: Detect atomic CSS pitfalls in UnoCSS, StyleX, and Panda CSS around extraction failures, runtime overhead, preset misconfiguration, and design token drift.
    tags:
      - unocss
      - stylex
      - panda-css
      - atomic-css
      - css-in-js
      - design-tokens
      - frontend
  - id: test-visual-regression
    file: test-visual-regression.md
    type: primary
    focus: Detect missing visual regression snapshots for UI changes, flaky visual diffs from animation or timing, and unreviewed snapshot approvals
    tags:
      - visual-regression
      - percy
      - chromatic
      - playwright-visual
      - screenshot-testing
      - ui-testing
      - pixel-diff
      - design-system
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Aria Visual

**Focus:** ARIA attributes used incorrectly (role mismatch, missing required ARIA properties); ARIA role that does not match the element's behavior (role=button on a div without keyboard handling); Abbreviated text without expansion (title or abbr element); Accessibility announcements not posted for dynamic content changes

## Children

| File | Type | Focus |
|------|------|-------|
| [a11y-aria-and-live-regions.md](a11y-aria-and-live-regions.md) | 📄 primary | Detect incorrect ARIA roles, misuse of aria-hidden on focusable elements, missing aria-live for dynamic content, redundant ARIA on native elements, and aria-label without visible label. |
| [a11y-keyboard-navigation.md](a11y-keyboard-navigation.md) | 📄 primary | Detect missing focus indicators, broken tab order, keyboard traps, custom interactive elements without keyboard handlers, and missing skip navigation. |
| [a11y-native-platform-ios-android.md](a11y-native-platform-ios-android.md) | 📄 primary | Detect missing accessibilityLabel (iOS), missing contentDescription (Android), custom views without accessibility traits, undersized touch targets, unsupported Dynamic Type, and untested VoiceOver/TalkBack paths. |
| [a11y-reduced-motion-and-prefers-color-scheme.md](a11y-reduced-motion-and-prefers-color-scheme.md) | 📄 primary | Detect animations without prefers-reduced-motion check, missing forced colors support, dark mode contrast failures, and transition durations not respecting user preference. |
| [fe-core-web-vitals-lighthouse.md](fe-core-web-vitals-lighthouse.md) | 📄 primary | Detect code patterns that degrade Core Web Vitals (LCP, CLS, INP) and Lighthouse scores, including render-blocking resources, layout shifts, and long tasks. |
| [fe-css-unocss-stylex-panda.md](fe-css-unocss-stylex-panda.md) | 📄 primary | Detect atomic CSS pitfalls in UnoCSS, StyleX, and Panda CSS around extraction failures, runtime overhead, preset misconfiguration, and design token drift. |
| [test-visual-regression.md](test-visual-regression.md) | 📄 primary | Detect missing visual regression snapshots for UI changes, flaky visual diffs from animation or timing, and unreviewed snapshot approvals |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
