---
id: qa-usability-beyond-a11y
type: primary
depth_role: leaf
focus: Detect usability anti-patterns beyond accessibility — unhelpful error messages, missing progress indicators, destructive actions without confirmation, inconsistent UI patterns, missing undo capability, and poor defaults
parents:
  - index.md
covers:
  - Error messages without actionable guidance for the user
  - Missing loading or progress indicators for long-running operations
  - "Destructive actions (delete, overwrite, reset) without confirmation"
  - Inconsistent UI patterns across similar workflows
  - Missing undo or recovery capability for significant user actions
  - Poor default values requiring users to always override
  - Silent failures — operation fails with no visible feedback
  - "Ambiguous button labels (OK, Submit, Yes/No without context)"
  - Missing empty states — blank screens when no data exists
  - Form submission losing user input on validation failure
tags:
  - usability
  - ux
  - error-messages
  - confirmation
  - undo
  - defaults
  - feedback
  - empty-state
  - progress
activation:
  file_globs:
    - "**/*component*"
    - "**/*page*"
    - "**/*view*"
    - "**/*dialog*"
    - "**/*modal*"
    - "**/*form*"
    - "**/*error*"
    - "**/*toast*"
    - "**/*notification*"
    - "**/*.tsx"
    - "**/*.jsx"
    - "**/*.vue"
    - "**/*.svelte"
  keyword_matches:
    - error
    - Error
    - message
    - toast
    - alert
    - confirm
    - dialog
    - modal
    - loading
    - spinner
    - progress
    - delete
    - remove
    - destroy
    - undo
    - default
    - empty
    - placeholder
  structural_signals:
    - Error handling in UI component
    - Delete or destructive action handler
    - Form submission handler
source:
  origin: file
  path: qa-usability-beyond-a11y.md
  hash: "sha256:739b6ec1d3ad9a61a1eb2b4920ae4202d586464a16cc163d3c0582814e67ca51"
---
# Usability Beyond Accessibility

## When This Activates

Activates when diffs modify UI components, error handling paths, form logic, delete/destructive actions, or user-facing messages. This reviewer covers usability concerns that are not accessibility-specific (see `a11y-*` reviewers for accessibility). Good usability means users can accomplish tasks efficiently, recover from errors, and understand system state at all times. Usability failures silently drive users away and generate support tickets that cost more than fixing the code.

## Audit Surface

- [ ] Error message showing raw exception, stack trace, or error code without user-facing explanation
- [ ] API error response returning generic 500 or opaque error without guidance
- [ ] Long-running operation (API call, file upload, computation) with no loading indicator
- [ ] Delete, remove, or overwrite action with no confirmation dialog or undo
- [ ] Similar workflows using different interaction patterns (modal vs inline, left vs right placement)
- [ ] No undo for actions like bulk delete, send, or publish
- [ ] Default values set to empty, zero, or null when a sensible default exists
- [ ] Operation that silently fails -- no error toast, no console warning, no state change
- [ ] Button labeled 'OK', 'Submit', or 'Yes' without describing the action
- [ ] List or table view with no empty state -- shows blank area when no data exists
- [ ] Form that clears all fields on server-side validation failure
- [ ] Multi-step workflow with no progress stepper or breadcrumb
- [ ] Timeout error without retry suggestion or timeout duration

## Detailed Checks

### Error Messages and Feedback
<!-- activation: keywords=["error", "Error", "catch", "except", "message", "toast", "alert", "notification", "snackbar", "flash", "500", "404", "fail"] -->

- [ ] **Raw exception exposure**: flag error handlers that display stack traces, exception class names, or internal error codes to users -- show a human-readable message with guidance on what to do next
- [ ] **Generic error messages**: flag catch-all messages like "Something went wrong" or "An error occurred" without specificity -- tell the user what failed and suggest a recovery action (retry, contact support, check input)
- [ ] **Silent failures**: flag catch blocks or error handlers that swallow errors without any user-visible feedback -- at minimum show a toast, banner, or inline message
- [ ] **Missing error states in UI**: flag components that handle success rendering but have no error state -- API calls, form submissions, and data fetches can fail; design for it

### Loading and Progress Indicators
<!-- activation: keywords=["loading", "spinner", "progress", "async", "await", "fetch", "upload", "download", "submit", "pending", "isLoading"] -->

- [ ] **Missing loading state**: flag async operations (API calls, file uploads, computations) that do not show a loading indicator -- users cannot distinguish "loading" from "broken" without feedback
- [ ] **Indeterminate progress for deterministic operations**: flag file uploads, batch processing, or multi-step operations showing only a spinner when a progress bar with percentage would be informative
- [ ] **No timeout feedback**: flag operations that can hang indefinitely without informing the user -- show elapsed time or a timeout warning after a reasonable period

### Destructive Actions and Undo
<!-- activation: keywords=["delete", "remove", "destroy", "drop", "purge", "clear", "reset", "overwrite", "replace", "bulk", "undo", "confirm"] -->

- [ ] **No confirmation for destructive actions**: flag delete, remove, overwrite, or reset handlers that execute immediately without confirmation -- use a confirmation dialog stating what will be lost and whether it is reversible
- [ ] **Missing undo capability**: flag significant user actions (delete, send, publish, bulk operations) that cannot be undone -- implement soft-delete, undo-toast with timer, or draft/archive instead of hard delete
- [ ] **Confirmation dialog without specificity**: flag confirmation dialogs that say "Are you sure?" without naming the object or describing the consequence -- include the item name and state what happens if confirmed

### Consistency and Defaults
<!-- activation: keywords=["default", "placeholder", "initial", "empty", "null", "undefined", "form", "input", "select", "option"] -->

- [ ] **Poor defaults**: flag forms, configuration, or settings with empty or zero defaults when a sensible default exists -- good defaults reduce friction and errors; analyze the most common user choice
- [ ] **Inconsistent patterns**: flag similar workflows (e.g., two different edit flows) using different interaction patterns (modal vs. inline, different button placement, different confirmation styles) -- consistency reduces cognitive load
- [ ] **Missing empty states**: flag list views, tables, dashboards, or search results that render a blank area when no data exists -- provide an empty state message explaining why there is no data and how to add some
- [ ] **Form data loss on validation failure**: flag forms that clear user input on server-side validation errors -- preserve all user input and highlight only the invalid fields

### Labels and Affordances
<!-- activation: keywords=["button", "btn", "submit", "label", "title", "text", "action", "click", "tap", "href", "link"] -->

- [ ] **Ambiguous button labels**: flag buttons labeled "OK", "Yes", "No", "Submit", or "Continue" without context -- use verb-noun labels describing the action (e.g., "Delete Account", "Save Draft", "Send Invitation")
- [ ] **Unclear destructive affordances**: flag destructive buttons styled identically to safe actions -- destructive actions should use warning colors and distinct styling
- [ ] **Hidden actions**: flag important actions (save, export, settings) buried in overflow menus or requiring multiple clicks to reach -- primary actions should be directly visible

## Common False Positives

- **Admin/developer tools**: internal admin panels and developer dashboards may intentionally show technical error details and skip confirmation dialogs for power-user efficiency.
- **CLI applications**: command-line tools communicate via stderr/stdout and may not need loading spinners or confirmation dialogs if they follow CLI conventions (--force, --yes flags).
- **API-only services**: backend services without a UI do not need empty states or loading indicators, but their error responses should still include actionable messages.
- **Intentionally minimal UI**: design-system components in early development may not yet have error, loading, and empty states -- flag only in production-ready code.

## Severity Guidance

| Finding | Severity |
|---|---|
| Destructive action with no confirmation and no undo | Critical |
| Raw stack trace or internal error exposed to end user | Critical |
| Silent failure -- operation fails with no feedback | Important |
| Form clears all input on validation failure | Important |
| Missing loading state for async operation | Important |
| Generic error message without actionable guidance | Minor |
| Missing empty state on data-driven view | Minor |
| Ambiguous button label in non-critical flow | Minor |

## See Also

- `principle-fail-fast` -- failing fast with clear feedback is a usability requirement
- `principle-least-astonishment` -- usability violations often surprise users
- `principle-encapsulation` -- internal errors should not leak to the user layer

## Authoritative References

- [Jakob Nielsen, "10 Usability Heuristics for User Interface Design" (1994, updated 2024)](https://www.nngroup.com/articles/ten-usability-heuristics/)
- [Steve Krug, *Don't Make Me Think, Revisited* (2014)](https://sensible.com/dont-make-me-think/)
- [Google Material Design -- Communication and Feedback Patterns](https://m3.material.io/)
- [Apple Human Interface Guidelines -- Feedback and Error Handling](https://developer.apple.com/design/human-interface-guidelines/)
