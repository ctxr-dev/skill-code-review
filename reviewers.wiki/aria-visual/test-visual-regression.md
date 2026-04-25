---
id: test-visual-regression
type: primary
depth_role: leaf
focus: Detect missing visual regression snapshots for UI changes, flaky visual diffs from animation or timing, and unreviewed snapshot approvals
parents:
  - index.md
covers:
  - UI component change without corresponding visual regression snapshot
  - Flaky visual diffs caused by animations, font rendering, or timing differences
  - "Visual snapshot approved without meaningful review (rubber-stamped)"
  - Visual regression tool not integrated into PR workflow
  - Snapshot baseline captured at wrong viewport size or device emulation
  - "Dynamic content (dates, user data, ads) causing non-deterministic visual diffs"
  - CSS-only change not covered by visual regression
  - Visual regression tests not covering responsive breakpoints
  - Threshold for pixel-diff sensitivity set too loose or too strict
  - Missing dark mode or high-contrast theme visual regression coverage
tags:
  - visual-regression
  - percy
  - chromatic
  - playwright-visual
  - screenshot-testing
  - ui-testing
  - pixel-diff
  - design-system
activation:
  file_globs:
    - "**/*.tsx"
    - "**/*.jsx"
    - "**/*.vue"
    - "**/*.svelte"
    - "**/*.css"
    - "**/*.scss"
    - "**/*.less"
    - "**/*visual*"
    - "**/*screenshot*"
    - "**/.percy*"
    - "**/.chromatic*"
    - "**/storybook*"
    - "**/*.stories.*"
  keyword_matches:
    - percy
    - Percy
    - chromatic
    - Chromatic
    - toMatchScreenshot
    - toHaveScreenshot
    - matchImageSnapshot
    - visual regression
    - screenshot
    - pixel
    - snapshot
    - baseline
    - storybook
    - stories
  structural_signals:
    - visual_test_file
    - screenshot_assertion
    - storybook_story
    - percy_config
source:
  origin: file
  path: test-visual-regression.md
  hash: "sha256:77260856025f11c58963da98299b2fad314a6c8bf171d1174a5c867e2bb9eff8"
---
# Visual Regression Testing

## When This Activates

Activates when the diff modifies UI components (React, Vue, Svelte, Angular), CSS/SCSS stylesheets, Storybook stories, or visual regression configuration. Also activates when UI changes are made without corresponding visual regression updates. Visual regression tests catch unintended visual changes (layout shifts, color changes, spacing breaks) that functional tests cannot detect.

## Audit Surface

- [ ] UI component or page modified without a visual regression snapshot in the PR
- [ ] Visual diff shows changes caused by animation timing, not actual UI changes
- [ ] Snapshot approved in Percy/Chromatic/Playwright without a review comment explaining the change
- [ ] Visual regression not configured in CI: snapshots are only captured locally
- [ ] Baseline snapshot captured at a single viewport size when the component is responsive
- [ ] Visual snapshot contains dynamic content (clock, user avatar, ad banner) causing diff noise
- [ ] CSS file changed but no visual regression test covers the affected components
- [ ] Pixel-diff threshold set to >5%, allowing significant unnoticed visual changes
- [ ] Pixel-diff threshold set to 0%, causing false failures on sub-pixel rendering differences
- [ ] Dark mode, RTL layout, or high-contrast theme not included in visual regression suite
- [ ] Visual regression suite runs but results are not required for PR merge
- [ ] Stale baseline snapshots from a previous design system version
- [ ] Font loading race: visual diff fails when web fonts load slowly in CI

## Detailed Checks

### Missing Visual Coverage
<!-- activation: keywords=["component", "page", "layout", "css", "style", "theme", "design", "ui", "visual", "render", "display"] -->

- [ ] **UI change without snapshot**: diff modifies a UI component's template, JSX, or styles but no visual regression snapshot is added or updated -- add visual coverage for the changed component
- [ ] **CSS-only change uncovered**: diff modifies CSS/SCSS files affecting layout or appearance but no visual test captures the impact -- CSS changes are the most common source of unintended visual regressions
- [ ] **No responsive coverage**: visual snapshot captured at a single viewport (e.g., 1280px) but the component has responsive breakpoints -- capture snapshots at mobile (375px), tablet (768px), and desktop (1280px) at minimum
- [ ] **Missing theme variants**: component supports dark mode, high-contrast, or RTL layouts but visual snapshots only cover the default theme -- add snapshots for each theme/layout variant
- [ ] **New page without visual test**: a new page or route is added without any visual regression coverage -- add at least one full-page screenshot

### Flaky Visual Diffs
<!-- activation: keywords=["animation", "transition", "flaky", "timing", "font", "render", "load", "async", "dynamic", "random", "clock", "date"] -->

- [ ] **Animation in snapshot**: visual diff changes because a CSS animation or transition is captured mid-frame -- disable animations in test mode (`prefers-reduced-motion`, `* { animation: none !important }`) or wait for animation completion
- [ ] **Font loading race**: visual diff shows different font rendering because web fonts load inconsistently in CI -- ensure fonts are preloaded or use `document.fonts.ready` before capturing
- [ ] **Dynamic content**: snapshot includes dates, times, user names, avatars, or ad banners that vary between runs -- mock dynamic content with deterministic test data or mask dynamic regions
- [ ] **Anti-aliasing differences**: sub-pixel rendering differences between CI and local environments cause false diffs -- use a non-zero tolerance threshold (0.1-1%) and consistent browser/OS versions
- [ ] **Lazy-loaded content**: visual snapshot captured before lazy-loaded images or components finish loading -- wait for network idle or explicit load events before capturing

### Snapshot Approval Discipline
<!-- activation: keywords=["approve", "accept", "review", "baseline", "update", "merge", "pr", "pull request", "comment"] -->

- [ ] **Rubber-stamped approval**: visual diff is approved in Percy/Chromatic without a PR comment explaining why the visual change is intentional -- require a brief justification for every approved visual change
- [ ] **Bulk baseline update**: many visual snapshots are updated in a single commit with no explanation -- each visual change should be traceable to a specific UI change
- [ ] **Stale baseline**: baseline snapshots were captured against an old version of the design system or component library -- refresh baselines after major dependency updates
- [ ] **Approval not gated**: visual regression results are informational only and do not block PR merge -- make visual approval a required check

### Configuration and Thresholds
<!-- activation: keywords=["threshold", "tolerance", "pixel", "diff", "config", "viewport", "device", "browser", "width", "height", "maxDiffPixels", "maxDiffPixelRatio"] -->

- [ ] **Threshold too loose**: pixel-diff threshold is >5%, allowing significant layout shifts to pass unnoticed -- set threshold to 0.1-1% for most components
- [ ] **Threshold too strict**: threshold is 0%, causing false failures from sub-pixel rendering, font hinting, and OS-specific anti-aliasing -- allow a small tolerance
- [ ] **Inconsistent browser**: CI captures snapshots in a different browser version than the baseline, causing false diffs -- pin browser version in CI configuration
- [ ] **Missing viewport configuration**: visual tests run at the CI runner's default viewport size, which varies -- explicitly set viewport dimensions in test configuration

## Common False Positives

- **Intentional design changes**: when a designer intentionally updates colors, spacing, or typography, the visual diff is expected. The reviewer should verify the change matches the design spec, not flag the diff.
- **Third-party widget changes**: embedded widgets (maps, payment forms, chat widgets) may change appearance outside the team's control. Mask these regions or accept controlled variance.
- **OS-specific rendering**: font rendering and anti-aliasing differ between macOS, Linux, and Windows. Use Docker containers with a consistent OS for CI snapshot capture.
- **Storybook decorator changes**: changes to Storybook decorators (padding, theme providers) affect all stories. This is a global change, not a per-component regression.

## Severity Guidance

| Finding | Severity |
|---|---|
| User-facing page or critical component changed with no visual regression coverage | Important |
| Visual regression suite not integrated into CI or not blocking PRs | Important |
| Flaky visual diff from animation or font loading causing CI noise | Important |
| Visual snapshot approved without review justification | Important |
| Responsive breakpoints not covered in visual regression suite | Minor |
| Dark mode or RTL layout not included in visual snapshots | Minor |
| Pixel-diff threshold too loose (>5%) or too strict (0%) | Minor |
| Dynamic content causing non-deterministic visual diffs | Minor |

## See Also

- `test-e2e-strategy` -- E2E tests verify functionality; visual regression tests verify appearance; they complement each other
- `test-snapshot-and-golden-file` -- visual snapshots are a specialized form of snapshot testing with image comparison
- `test-accessibility-axe-lighthouse` -- visual regression should be paired with accessibility testing for complete UI coverage
- `antipattern-flaky-non-deterministic-tests` -- animation timing and font loading are visual-test-specific flakiness sources

## Authoritative References

- [Percy -- visual testing and review platform](https://percy.io/)
- [Chromatic -- visual regression testing for Storybook](https://www.chromatic.com/)
- [Playwright Visual Comparisons -- toHaveScreenshot API](https://playwright.dev/docs/test-snapshots)
- [Storybook Visual Testing -- component-level visual regression](https://storybook.js.org/docs/writing-tests/visual-testing)
- [CSS-Tricks, "Visual Regression Testing" (2021)](https://css-tricks.com/visual-regression-testing/)
