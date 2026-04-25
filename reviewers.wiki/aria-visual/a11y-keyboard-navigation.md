---
id: a11y-keyboard-navigation
type: primary
depth_role: leaf
focus: Detect missing focus indicators, broken tab order, keyboard traps, custom interactive elements without keyboard handlers, and missing skip navigation.
parents:
  - index.md
covers:
  - "Focus indicator removed via CSS (outline: none) without visible replacement"
  - "Tab order broken by positive tabindex values or mismatched DOM/visual order"
  - Keyboard trap in modal, dropdown, or custom widget with no escape
  - "Custom interactive element (div, span) missing keyboard event handlers"
  - Skip navigation link missing from page layout
  - Focus not returned to trigger after modal or popover close
  - "Roving tabindex not implemented in composite widgets (tabs, menus, toolbars)"
  - Scrollable region not keyboard-accessible
  - Drag-and-drop without keyboard alternative
  - Disclosure widget not togglable with Enter or Space
  - Focus visible only on mouse click, not on keyboard navigation
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
activation:
  file_globs:
    - "**/*.html"
    - "**/*.jsx"
    - "**/*.tsx"
    - "**/*.vue"
    - "**/*.svelte"
    - "**/*.css"
    - "**/*.scss"
    - "**/*.less"
  keyword_matches:
    - tabindex
    - onKeyDown
    - onKeyUp
    - onKeyPress
    - keydown
    - keyup
    - outline
    - focus
    - ":focus"
    - ":focus-visible"
    - ":focus-within"
    - autofocus
    - dialog
    - modal
    - trap
    - skip
    - roving
  structural_signals:
    - outline_none_without_replacement
    - click_without_keyboard
    - positive_tabindex
    - modal_without_focus_trap
source:
  origin: file
  path: a11y-keyboard-navigation.md
  hash: "sha256:89f2b4587af3fe54c803529ce7a2d93fb77d6bc580ef98d5902e3ac05710cb15"
---
# Keyboard Navigation

## When This Activates

Activates on diffs that modify interactive elements, CSS focus styles, tab order, modal/dialog components, or custom widgets. Keyboard accessibility is foundational -- it is the mechanism that powers screen readers, switch devices, voice control, and is the only input method for many users. A single keyboard trap can make an entire page unusable. This reviewer detects patterns where keyboard users are blocked, confused, or invisible.

## Audit Surface

- [ ] CSS rule setting outline: none or outline: 0 on :focus without :focus-visible replacement
- [ ] tabindex value greater than 0
- [ ] Modal or dialog without focus trap (focus escapes to background)
- [ ] Modal close that does not return focus to the opening trigger
- [ ] div or span with onClick but no onKeyDown/onKeyUp and no tabindex
- [ ] Page layout without skip navigation link
- [ ] Tab/menu/toolbar widget not implementing roving tabindex or aria-activedescendant
- [ ] Scrollable container without tabindex=0 (not keyboard-reachable)
- [ ] Drag-and-drop interaction without keyboard-operable alternative
- [ ] Custom toggle/disclosure that ignores Enter and Space key events
- [ ] CSS order or flex order creating visual/DOM order mismatch
- [ ] Focus style using :focus instead of :focus-visible (shows on click)
- [ ] Autofocus attribute used outside initial page load context

## Detailed Checks

### Focus Indicator Visibility (2.4.7, 2.4.11, 2.4.12)
<!-- activation: keywords=["outline", "focus", ":focus", ":focus-visible", ":focus-within", "box-shadow", "border", "ring", "indicator", "visible"] -->

- [ ] **Focus indicator removed**: flag CSS rules that set `outline: none`, `outline: 0`, or `outline-color: transparent` on `:focus` without providing a visible alternative (box-shadow, border, background change) on `:focus-visible`
- [ ] **Low-contrast focus indicator**: flag focus styles where the indicator color has less than 3:1 contrast against the background and less than 3:1 contrast against the unfocused state (2.4.11)
- [ ] **:focus instead of :focus-visible**: flag focus styles on `:focus` that create visual noise on mouse click -- prefer `:focus-visible` which activates only on keyboard navigation
- [ ] **Focus indicator clipped**: flag `overflow: hidden` on containers that clip the outline or box-shadow of focused children -- the indicator is technically present but invisible

### Tab Order and DOM/Visual Mismatch
<!-- activation: keywords=["tabindex", "tab-index", "order", "flex-direction", "grid", "position: absolute", "float", "reorder", "reverse"] -->

- [ ] **Positive tabindex**: flag `tabindex` values greater than 0 -- they override the DOM order, creating a confusing and brittle tab sequence
- [ ] **Visual order mismatch**: flag CSS `order`, `flex-direction: row-reverse`, or `grid` area placement that creates significant mismatch between the visual layout and DOM order -- keyboard tab order follows the DOM, not the visual order
- [ ] **tabindex=-1 without programmatic focus**: flag `tabindex="-1"` on elements that are never focused programmatically -- the element is removed from tab order with no alternate way to reach it
- [ ] **Autofocus misuse**: flag `autofocus` on elements inside modals that open on user action (acceptable) vs. on page load where it skips content (problematic for screen reader users)

### Keyboard Traps (2.1.2)
<!-- activation: keywords=["modal", "dialog", "dropdown", "popover", "menu", "overlay", "focus-trap", "FocusTrap", "inert", "Escape", "close", "dismiss"] -->

- [ ] **Modal without focus trap**: flag modal/dialog implementations that allow Tab to escape to the background content -- users interact with elements they cannot see
- [ ] **Focus trap without escape**: flag focus traps that do not release focus on Escape key or close button -- the user is locked inside the widget with no way out (2.1.2 violation)
- [ ] **Focus not restored on close**: flag modal/dialog close handlers that do not return focus to the element that triggered the modal -- the user's focus position is lost
- [ ] **Non-modal dialog trapping focus**: flag non-modal overlays (popovers, tooltips) that trap focus -- only true modal dialogs should trap focus

### Custom Interactive Elements
<!-- activation: keywords=["onClick", "onclick", "onKeyDown", "onkeydown", "onKeyUp", "addEventListener", "click", "div", "span", "role=", "button", "link", "interactive"] -->

- [ ] **Click without keyboard**: flag div/span elements with `onClick` (or equivalent) but no `onKeyDown`/`onKeyUp` handler and no `tabindex` -- the element is mouse-only
- [ ] **Missing Enter/Space handling**: flag custom button-role elements that handle `onClick` but do not respond to Enter and Space key events -- keyboard users cannot activate the element
- [ ] **Scrollable region not focusable**: flag scrollable containers (`overflow: auto/scroll`) that have no `tabindex="0"` -- keyboard users cannot scroll them
- [ ] **Drag without keyboard alternative**: flag drag-and-drop interactions without a keyboard-operable alternative (button-based reorder, select-and-place) -- WCAG 2.1.1 requires all functionality to be operable via keyboard

### Composite Widget Keyboard Patterns
<!-- activation: keywords=["tab", "tablist", "menu", "menubar", "toolbar", "listbox", "tree", "grid", "roving", "activedescendant", "arrow", "ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Home", "End"] -->

- [ ] **Missing roving tabindex**: flag tablist, menu, toolbar, or listbox that places every item in the tab order -- composite widgets should have one tab stop with arrow keys for internal navigation
- [ ] **Arrow keys not handled**: flag composite widgets that do not implement ArrowUp/ArrowDown (vertical) or ArrowLeft/ArrowRight (horizontal) for moving between items
- [ ] **Missing Home/End support**: flag composite widgets with many items that do not support Home and End keys to jump to the first and last items

## Common False Positives

- **Framework dialog components**: libraries like Headless UI, Radix, and Material UI manage focus trapping internally. Verify the rendered behavior before flagging.
- **Intentional tabindex=-1**: elements that receive focus programmatically (e.g., skip link targets, error summaries) correctly use tabindex=-1.
- **CSS frameworks with focus-visible**: Tailwind and similar frameworks provide focus-visible utilities. The outline-none class may have a ring-* companion.
- **Mobile-only interactions**: drag-and-drop on mobile touch interfaces may not need keyboard alternatives if the feature is mobile-only. Verify the target platform.

## Severity Guidance

| Finding | Severity |
|---|---|
| Keyboard trap with no escape mechanism | Critical |
| Focus indicator completely removed with no replacement | Critical |
| Custom interactive element with no keyboard handler and no tabindex | Critical |
| Modal not returning focus to trigger on close | Important |
| Composite widget without roving tabindex or arrow key navigation | Important |
| Scrollable region not keyboard-accessible | Important |
| Missing skip navigation link on content-heavy page | Important |
| Positive tabindex disrupting tab order | Minor |
| :focus used where :focus-visible is more appropriate | Minor |
| Visual/DOM order mismatch from CSS ordering | Minor |

## See Also

- `a11y-wcag-2-2-aa` -- WCAG criteria that mandate keyboard accessibility (2.1.1, 2.4.7)
- `a11y-aria-and-live-regions` -- ARIA roles require corresponding keyboard patterns (APG)
- `a11y-screen-reader-affordances` -- screen readers rely on keyboard focus position for navigation
- `fw-react` -- React-specific keyboard event handling patterns

## Authoritative References

- [W3C, "ARIA Authoring Practices Guide -- Keyboard Interaction" -- keyboard patterns for every widget type](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)
- [W3C, "Understanding SC 2.1.1 Keyboard" -- all functionality operable via keyboard](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html)
- [W3C, "Understanding SC 2.1.2 No Keyboard Trap"](https://www.w3.org/WAI/WCAG22/Understanding/no-keyboard-trap.html)
- [W3C, "Understanding SC 2.4.7 Focus Visible"](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html)
