---
id: a11y-wcag-2-2-aa
type: primary
depth_role: leaf
focus: Detect WCAG 2.2 Level AA violations including missing alt text, insufficient color contrast, missing form labels, absent landmarks, broken focus management, and undersized touch targets.
parents:
  - index.md
covers:
  - Image element without alt attribute or with empty alt on informative image
  - "Text color contrast ratio below 4.5:1 for normal text or 3:1 for large text"
  - Form input without associated label element or aria-label
  - "Page missing landmark regions (main, nav, banner, contentinfo)"
  - Focus not managed after route change or modal open in SPA
  - "Interactive target size smaller than 24x24 CSS pixels (WCAG 2.5.8)"
  - "Heading hierarchy skipping levels (h1 to h3 without h2)"
  - Auto-playing media without pause mechanism
  - Time-based content without extension or disable mechanism
  - Error messages not programmatically associated with their form fields
  - "Link text that is generic (click here, read more) without accessible context"
  - Table missing headers or scope attributes for data cells
tags:
  - wcag
  - accessibility
  - a11y
  - contrast
  - alt-text
  - focus
  - landmarks
  - form-labels
  - target-size
  - wcag-2-2
activation:
  file_globs:
    - "**/*.html"
    - "**/*.htm"
    - "**/*.jsx"
    - "**/*.tsx"
    - "**/*.vue"
    - "**/*.svelte"
    - "**/*.astro"
    - "**/*.erb"
    - "**/*.hbs"
    - "**/*.css"
    - "**/*.scss"
  keyword_matches:
    - <img
    - alt=
    - aria-
    - role=
    - <form
    - <input
    - <label
    - <nav
    - <main
    - <header
    - <footer
    - "outline: none"
    - "outline:none"
    - "color:"
    - "background-color:"
    - font-size
    - focus
    - tabindex
  structural_signals:
    - img_without_alt
    - form_input_without_label
    - heading_skip
    - missing_landmark
source:
  origin: file
  path: a11y-wcag-2-2-aa.md
  hash: "sha256:2922a00afb98564fbd7abe1fd48fe7cc12f5f7c40d801e3ab246c25ff05c51c9"
---
# WCAG 2.2 Level AA Compliance

## When This Activates

Activates on diffs that modify HTML templates, JSX/TSX components, Vue/Svelte templates, CSS stylesheets, or any markup that renders user-facing content. WCAG 2.2 Level AA is the legal baseline in most jurisdictions (ADA, EAA, EN 301 549). Violations block users who rely on assistive technology, keyboard navigation, or visual accommodations from using the product. This reviewer catches the most common and highest-impact AA violations that appear in code diffs.

## Audit Surface

- [ ] img element without alt attribute
- [ ] Informative image with empty alt=""
- [ ] Hardcoded color values with contrast ratio below 4.5:1 (normal) or 3:1 (large)
- [ ] Form input without corresponding label, aria-label, or aria-labelledby
- [ ] Missing landmark elements (main, nav, header, footer) in page layout
- [ ] No focus management after SPA route transition or dynamic content insertion
- [ ] Interactive element (button, link, input) with rendered size below 24x24px
- [ ] Heading levels that skip (h1 directly to h3)
- [ ] autoplay attribute on video or audio without controls or muted
- [ ] Error message rendered as plain text without aria-describedby linking to the input
- [ ] Link with generic text (click here, learn more, read more) and no aria-label
- [ ] Data table without th elements or scope attributes
- [ ] CSS :focus style removed (outline: none) without replacement indicator
- [ ] Timeout or session expiry without user notification and extension option
- [ ] Content reflow breaking below 320px viewport width (1.4.10)

## Detailed Checks

### Missing and Incorrect Alt Text (1.1.1)
<!-- activation: keywords=["img", "alt", "image", "icon", "svg", "figure", "figcaption", "picture", "srcset"] -->

- [ ] **No alt attribute**: flag any `<img>` without an `alt` attribute entirely -- screen readers announce the file path, which is meaningless
- [ ] **Empty alt on informative image**: flag `alt=""` on images that convey information (product photos, charts, diagrams) -- empty alt marks the image as decorative, hiding its content
- [ ] **Decorative image without alt=""**: flag decorative images (spacers, backgrounds, flourishes) that have non-empty alt text -- screen readers announce irrelevant content
- [ ] **SVG without accessible name**: flag inline `<svg>` elements used as informative images without `role="img"` and `aria-label` or `<title>` element
- [ ] **Image of text**: flag images that contain readable text without the same text available as real text -- fails 1.4.5 unless it is a logo

### Color Contrast (1.4.3, 1.4.6, 1.4.11)
<!-- activation: keywords=["color", "background", "contrast", "opacity", "rgba", "hsla", "theme", "palette", "#", "rgb("] -->

- [ ] **Text contrast below threshold**: flag hardcoded color pairs where foreground/background contrast ratio is below 4.5:1 for text under 18pt (or 14pt bold), or below 3:1 for large text -- note that computed values may differ at runtime
- [ ] **Non-text contrast below 3:1**: flag UI components (borders, icons, focus indicators) and graphical objects with contrast below 3:1 against adjacent colors (1.4.11)
- [ ] **Contrast lost in dark mode**: flag color variables or theme tokens that may drop below threshold when dark mode class or media query is applied
- [ ] **Opacity reducing contrast**: flag `opacity` values applied to text elements that reduce the effective contrast below the required ratio

### Form Labels and Error Handling (1.3.1, 3.3.1, 3.3.2)
<!-- activation: keywords=["input", "label", "form", "select", "textarea", "placeholder", "error", "validation", "required", "aria-describedby", "aria-invalid"] -->

- [ ] **Input without label**: flag `<input>`, `<select>`, `<textarea>` without an associated `<label for="">`, `aria-label`, or `aria-labelledby` -- placeholder is not a substitute for a label
- [ ] **Placeholder as sole label**: flag inputs using only `placeholder` for labeling -- placeholder disappears on input, leaving the user without context
- [ ] **Error not associated with field**: flag validation error messages not linked to their input via `aria-describedby` or `aria-errormessage` -- screen reader users cannot determine which field has the error
- [ ] **Missing aria-invalid**: flag inputs that display error styling without setting `aria-invalid="true"` -- the error state is visual only

### Landmarks and Page Structure (1.3.1, 2.4.1, 2.4.6)
<!-- activation: keywords=["main", "nav", "header", "footer", "aside", "section", "role", "landmark", "region", "heading", "h1", "h2", "h3", "skip"] -->

- [ ] **No main landmark**: flag pages or root layouts that lack a `<main>` element or `role="main"` -- screen reader users cannot jump to the primary content
- [ ] **Missing skip navigation**: flag pages without a skip link as the first focusable element -- keyboard users must tab through the entire nav to reach content
- [ ] **Heading hierarchy broken**: flag heading levels that skip (h1 to h3, h2 to h4) -- screen reader users navigate by heading level and expect a logical hierarchy

### Focus Management and Keyboard Access (2.4.3, 2.4.7, 2.4.11)
<!-- activation: keywords=["focus", "tabindex", "outline", "modal", "dialog", "route", "navigate", "trap", "keyboard", ":focus-visible", "onKeyDown"] -->

- [ ] **Focus indicator removed**: flag `outline: none` or `outline: 0` on focusable elements without a custom visible focus indicator -- keyboard users lose track of their position
- [ ] **No focus management on route change**: flag SPA navigation that does not move focus to the new content or announce the route change -- screen reader users are stranded at the old position
- [ ] **Modal without focus trap**: flag dialog/modal implementations that do not trap focus within the modal and return focus to the trigger on close
- [ ] **Positive tabindex**: flag `tabindex` values greater than 0 -- they break the natural tab order and create maintenance nightmares

### Target Size (2.5.8)
<!-- activation: keywords=["button", "link", "click", "tap", "touch", "target", "padding", "width", "height", "min-width", "min-height", "24px", "44px"] -->

- [ ] **Small interactive target**: flag buttons, links, and custom interactive elements with explicit dimensions below 24x24 CSS pixels -- WCAG 2.2 AA minimum (2.5.8)
- [ ] **Inline link crowding**: flag inline links in dense text where the spacing between adjacent targets is less than 24px -- sufficient spacing can compensate for small size
- [ ] **Icon-only button too small**: flag icon buttons without padding that renders the clickable area below 24x24px

## Common False Positives

- **Decorative images with alt=""**: empty alt on purely decorative images is correct WCAG technique. Do not flag unless the image clearly conveys information.
- **Contrast in design tokens**: static analysis of CSS variables may not resolve runtime theme values. Flag only when the literal values are visible in the diff.
- **Third-party widgets**: embedded iframes or third-party components may have their own accessibility. Do not flag code that merely embeds them.
- **Programmatic labels on custom components**: framework components (Material UI, Chakra) may apply labels internally. Verify before flagging.

## Severity Guidance

| Finding | Severity |
|---|---|
| Image without alt attribute on informative content | Critical |
| Form input without any label mechanism | Critical |
| Focus indicator removed with no replacement | Critical |
| Text contrast below 4.5:1 for body text | Important |
| Missing main landmark in page layout | Important |
| Heading hierarchy skips levels | Important |
| Error message not programmatically associated with input | Important |
| Interactive target below 24x24px | Important |
| Missing skip navigation link | Minor |
| Positive tabindex value | Minor |

## See Also

- `a11y-aria-and-live-regions` -- ARIA attributes complement native semantics checked here
- `a11y-keyboard-navigation` -- keyboard access is a subset of WCAG covered in depth there
- `a11y-screen-reader-affordances` -- heading hierarchy and table headers overlap; that reviewer goes deeper
- `test-accessibility-axe-lighthouse` -- automated testing tools that verify WCAG conformance at runtime
- `sec-xss-dom` -- innerHTML without sanitization is both an XSS and an accessibility risk

## Authoritative References

- [W3C, "Web Content Accessibility Guidelines (WCAG) 2.2" -- the normative specification](https://www.w3.org/TR/WCAG22/)
- [W3C, "Understanding WCAG 2.2" -- success criterion explanations and examples](https://www.w3.org/WAI/WCAG22/Understanding/)
- [W3C, "Techniques for WCAG 2.2" -- sufficient and advisory techniques](https://www.w3.org/WAI/WCAG22/Techniques/)
- [Deque, "axe Rules" -- axe-core rule descriptions mapped to WCAG criteria](https://dequeuniversity.com/rules/axe/)
