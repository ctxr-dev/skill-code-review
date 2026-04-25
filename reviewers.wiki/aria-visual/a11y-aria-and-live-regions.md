---
id: a11y-aria-and-live-regions
type: primary
depth_role: leaf
focus: Detect incorrect ARIA roles, misuse of aria-hidden on focusable elements, missing aria-live for dynamic content, redundant ARIA on native elements, and aria-label without visible label.
parents:
  - index.md
covers:
  - "ARIA role that does not match the element's behavior (role=button on a div without keyboard handling)"
  - aria-hidden=true on element or ancestor of focusable elements
  - Dynamic content update without aria-live region announcement
  - "Redundant ARIA (role=button on button, role=link on a)"
  - aria-label on element without visible text creating screen-reader-only label
  - "Invalid ARIA attribute value (aria-expanded on non-expandable element)"
  - "Missing required ARIA children or parent roles (tab without tablist)"
  - aria-labelledby or aria-describedby referencing non-existent id
  - aria-live=assertive used for non-urgent content
  - Multiple aria-live regions competing for announcements
  - role=presentation or role=none removing semantics from interactive elements
  - UI change without axe-core or Lighthouse accessibility check
  - "ARIA attributes used incorrectly (role mismatch, missing required ARIA properties)"
  - "Color contrast below WCAG AA threshold (4.5:1 for normal text, 3:1 for large text)"
  - "Interactive elements not keyboard-accessible (no focus management, no tab order)"
  - Missing alt text on images, missing labels on form inputs
  - "Screen reader compatibility not tested (heading hierarchy, live regions, announcements)"
  - Focus trap in modals or dialogs not implemented
  - Custom component missing required ARIA roles and states
  - Dynamic content updates not announced to assistive technologies
  - Accessibility tests not integrated into CI pipeline
  - "Touch target size below recommended minimum (44x44px)"
  - Heading hierarchy skipping levels or using headings for visual styling
  - "Decorative image missing alt='' (announced as filename by screen readers)"
  - Data table without th elements, scope, or caption
  - "Off-screen text (visually hidden) not accessible via sr-only/clip pattern"
  - "Status message (success, error, progress) not announced via aria-live or role=status"
  - "List markup not used for visual lists (using divs instead of ul/ol)"
  - "Button or link with no accessible name (empty text, icon-only without label)"
  - "Abbreviated text without expansion (title or abbr element)"
  - Language change within page not marked with lang attribute
  - "CSS-generated content (::before/::after) conveying meaningful information"
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
aliases:
  - test-accessibility-axe-lighthouse
  - a11y-screen-reader-affordances
activation:
  file_globs:
    - "**/*.html"
    - "**/*.jsx"
    - "**/*.tsx"
    - "**/*.vue"
    - "**/*.svelte"
    - "**/*.astro"
    - "**/*.erb"
    - "**/*.hbs"
  keyword_matches:
    - aria-
    - role=
    - aria-live
    - aria-hidden
    - aria-label
    - aria-labelledby
    - aria-describedby
    - aria-expanded
    - aria-pressed
    - aria-checked
    - aria-selected
    - tablist
    - combobox
    - alertdialog
  structural_signals:
    - aria_hidden_on_focusable
    - role_without_keyboard
    - aria_ref_missing_id
    - redundant_aria
source:
  origin: file
  path: a11y-aria-and-live-regions.md
  hash: "sha256:42cc4a28e11be0688d19a6ca39b245bf5e104701e1bec475fde6bb14e636c306"
---
# ARIA and Live Regions

## When This Activates

Activates on diffs that add or modify ARIA attributes, roles, or live regions in HTML, JSX, Vue, or Svelte templates. ARIA is the primary mechanism for communicating widget semantics to assistive technology, but incorrect ARIA is worse than no ARIA -- it actively lies to the screen reader about the element's purpose. The first rule of ARIA is "don't use ARIA" when a native HTML element provides the semantics. This reviewer ensures that when ARIA is used, it is used correctly.

## Audit Surface

- [ ] div or span with role=button but no keyboard handler (Enter/Space)
- [ ] aria-hidden=true on parent containing focusable children (links, buttons, inputs)
- [ ] Toast, notification, or inline error appearing without aria-live region
- [ ] role=button on a native button element (redundant)
- [ ] role=link on a native anchor element (redundant)
- [ ] aria-label that duplicates visible text exactly (redundant)
- [ ] aria-label on element with no visible text (label mismatch with 2.5.3)
- [ ] aria-expanded, aria-pressed, or aria-checked on element that does not toggle
- [ ] tab role without parent tablist or tabpanel association
- [ ] aria-labelledby pointing to id that does not exist in the DOM
- [ ] aria-live=assertive on non-urgent status message
- [ ] Multiple aria-live=polite regions updating simultaneously
- [ ] role=presentation on focusable element stripping its semantics
- [ ] Custom widget missing required ARIA states (combobox without aria-expanded)

## Detailed Checks

### Incorrect and Redundant Roles
<!-- activation: keywords=["role=", "button", "link", "tab", "tablist", "tabpanel", "combobox", "dialog", "alertdialog", "menu", "menuitem", "tree", "treeitem", "grid", "listbox", "option"] -->

- [ ] **Role without behavior**: flag `role="button"` on a div/span without `tabindex="0"` and `onKeyDown` handling Enter and Space -- the element is announced as a button but does not behave as one
- [ ] **Redundant role on native element**: flag `role="button"` on `<button>`, `role="link"` on `<a href>`, `role="heading"` on `<h1>`-`<h6>` -- the native semantics already provide the role; adding it is noise
- [ ] **role=presentation on interactive element**: flag `role="presentation"` or `role="none"` on elements that are focusable or interactive -- this strips their semantics from the accessibility tree while they remain operable
- [ ] **Missing required children/parent**: flag `role="tab"` without a `role="tablist"` parent, `role="option"` without `role="listbox"` parent, `role="menuitem"` without `role="menu"` parent -- the ARIA spec requires these relationships

### aria-hidden Conflicts
<!-- activation: keywords=["aria-hidden", "hidden", "focusable", "tabindex", "visibility", "display: none", "inert"] -->

- [ ] **aria-hidden on focusable element**: flag `aria-hidden="true"` on an element that is itself focusable (button, link, input) -- the element is hidden from screen readers but reachable by keyboard, creating a ghost element
- [ ] **aria-hidden on ancestor of focusable children**: flag `aria-hidden="true"` on a container that has focusable descendants -- all children inherit aria-hidden, but their focus behavior is unaffected
- [ ] **aria-hidden instead of inert**: flag aria-hidden used to hide off-screen or background content that should also be inert (not focusable) -- prefer the `inert` attribute which handles both

### Live Regions for Dynamic Content
<!-- activation: keywords=["aria-live", "polite", "assertive", "alert", "status", "log", "timer", "toast", "notification", "snackbar", "error", "loading", "spinner"] -->

- [ ] **Dynamic content without live region**: flag toasts, notifications, inline errors, loading indicators, or status messages that appear dynamically without an `aria-live` region wrapping them -- screen reader users are not informed of the update
- [ ] **aria-live=assertive for non-urgent content**: flag `aria-live="assertive"` on status updates, progress bars, or non-critical notifications -- assertive interrupts the user mid-sentence; use `polite` for non-urgent updates
- [ ] **Live region added dynamically**: flag patterns that add both the `aria-live` attribute and content simultaneously -- the live region must exist in the DOM before content is injected for the announcement to fire
- [ ] **Multiple competing live regions**: flag multiple `aria-live` regions updating within a short time window -- only the last update is typically announced, and earlier updates are lost

### aria-label and aria-labelledby Misuse
<!-- activation: keywords=["aria-label", "aria-labelledby", "aria-describedby", "aria-errormessage", "for=", "label", "id="] -->

- [ ] **aria-labelledby referencing missing id**: flag `aria-labelledby` or `aria-describedby` values that do not match any element's id in the template -- the reference resolves to nothing, leaving the element unlabeled
- [ ] **aria-label without visible text (2.5.3)**: flag interactive elements with `aria-label` that has no corresponding visible text -- voice control users cannot activate the element by speaking its visible label
- [ ] **aria-label on non-interactive non-landmark element**: flag `aria-label` on a `<div>` or `<span>` without a role -- aria-label is only reliably supported on interactive elements, landmarks, and elements with widget roles
- [ ] **aria-label duplicating visible text**: flag `aria-label` that exactly matches the element's visible text content -- the attribute is redundant and increases maintenance burden

### Widget State Attributes
<!-- activation: keywords=["aria-expanded", "aria-pressed", "aria-checked", "aria-selected", "aria-current", "aria-disabled", "aria-invalid", "aria-required", "toggle", "dropdown", "accordion", "checkbox"] -->

- [ ] **State attribute not toggled**: flag `aria-expanded` on elements that never update the attribute between "true" and "false" -- the state is announced once and never changes, misleading the user
- [ ] **Missing required state**: flag custom combobox without `aria-expanded`, custom checkbox without `aria-checked`, disclosure widget without `aria-expanded` -- assistive technology cannot convey the current state
- [ ] **aria-disabled without preventing action**: flag `aria-disabled="true"` on elements that still respond to click or keyboard events -- the element announces as disabled but functions as enabled

## Common False Positives

- **Framework component libraries**: UI libraries (Material UI, Headless UI, Radix) manage ARIA internally. Do not flag role usage on library wrapper components without verifying the rendered output.
- **Server-rendered id references**: aria-labelledby referencing ids generated server-side may not be visible in the template diff. Verify before flagging.
- **Intentional aria-hidden for icons**: decorative icons inside labeled buttons are correctly hidden with aria-hidden. Do not flag if the button has visible text or aria-label.
- **Portal/teleport patterns**: live regions or dialogs rendered via portals may define their aria attributes in a different file. Check the portal target.

## Severity Guidance

| Finding | Severity |
|---|---|
| aria-hidden=true on parent with focusable children | Critical |
| role=button without keyboard handling (Enter/Space) | Critical |
| role=presentation on interactive focusable element | Critical |
| Dynamic content (toast, error) without aria-live region | Important |
| aria-labelledby referencing non-existent id | Important |
| Missing required ARIA children or parent roles | Important |
| Custom widget missing required state attribute | Important |
| Redundant role on native element | Minor |
| aria-label duplicating visible text | Minor |
| aria-live=assertive on non-urgent notification | Minor |

## See Also

- `a11y-wcag-2-2-aa` -- WCAG criteria context for ARIA usage; landmarks and labels overlap
- `a11y-keyboard-navigation` -- keyboard handling required for custom ARIA widgets
- `a11y-screen-reader-affordances` -- screen reader behavior depends on correct ARIA
- `fw-react` -- React JSX ARIA patterns including eslint-plugin-jsx-a11y integration
- `sec-xss-dom` -- dangerouslySetInnerHTML can inject ARIA attributes that corrupt the accessibility tree

## Authoritative References

- [W3C, "WAI-ARIA 1.2 Specification" -- normative roles, states, and properties](https://www.w3.org/TR/wai-aria-1.2/)
- [W3C, "ARIA Authoring Practices Guide (APG)" -- design patterns for widgets with correct ARIA](https://www.w3.org/WAI/ARIA/apg/)
- [W3C, "Using ARIA" -- practical rules for ARIA usage including the first rule of ARIA](https://www.w3.org/TR/using-aria/)
- [Deque, "axe-core ARIA Rules" -- automated checks for ARIA validity](https://dequeuniversity.com/rules/axe/)
