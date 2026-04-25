---
id: fe-components-shadcn-radix-mui-antd-chakra
type: primary
depth_role: leaf
focus: "Detect accessibility regressions, theme inconsistencies, bundle bloat, and API misuse when customizing component libraries like shadcn/ui, Radix, MUI, Ant Design, and Chakra UI."
parents:
  - index.md
covers:
  - Accessibility gaps introduced when customizing headless or styled components
  - Theme token override inconsistency breaking visual coherence
  - Bundle size bloat from full library imports instead of tree-shakeable paths
  - Deprecated component APIs still used in new code
  - Missing aria attributes after wrapping or extending library components
  - "Z-index conflicts between library modals/popovers and custom layers"
  - Uncontrolled-to-controlled component pattern mixing
  - Missing forwardRef when wrapping library components
  - Style override specificity battles with library CSS
  - Missing keyboard navigation after custom component composition
tags:
  - component-library
  - shadcn
  - radix
  - mui
  - antd
  - chakra
  - accessibility
  - a11y
  - frontend
activation:
  file_globs:
    - "**/*.jsx"
    - "**/*.tsx"
    - "**/components/**"
    - "**/ui/**"
  keyword_matches:
    - "@radix-ui"
    - shadcn
    - "@mui"
    - antd
    - "@chakra-ui"
    - ThemeProvider
    - createTheme
    - Dialog
    - Popover
    - Modal
  structural_signals:
    - component library import
    - theme override
    - aria attribute modification
source:
  origin: file
  path: fe-components-shadcn-radix-mui-antd-chakra.md
  hash: "sha256:589aa6d445c8581504b067b8510b1bce9e9a30035d346697b5dc5cf42b52fc6d"
---
# Component Library Customization Pitfalls

## When This Activates

Activates when diffs import or customize components from shadcn/ui, Radix UI, MUI, Ant Design, or Chakra UI. These libraries provide accessible, themed components out of the box -- but customization frequently breaks accessibility (missing aria attributes, broken keyboard navigation), introduces theme inconsistency (hardcoded values overriding tokens), or bloats bundles (full library imports). This reviewer catches the regressions introduced during component library customization.

## Audit Surface

- [ ] Radix or shadcn/ui primitive customized without preserving aria-* and role attributes
- [ ] MUI component with sx prop overriding theme tokens using hardcoded values
- [ ] Ant Design component imported from top-level 'antd' instead of 'antd/es/ComponentName'
- [ ] Chakra UI component with style props that contradict the theme (e.g., hardcoded colors)
- [ ] Library component wrapped in a custom component without React.forwardRef
- [ ] Deprecated API usage flagged in library changelog but still present in code
- [ ] Dialog, Popover, or Tooltip component without proper focus management
- [ ] Custom dropdown or select built from scratch instead of using library's accessible primitive
- [ ] Z-index set to arbitrary high values (999, 9999) conflicting with library's z-index scale
- [ ] MUI ThemeProvider or Chakra ChakraProvider missing in component tree above themed components
- [ ] Full barrel import pulling entire library instead of tree-shakeable subpath
- [ ] Component switching between controlled and uncontrolled modes across renders

## Detailed Checks

### Accessibility Preservation
<!-- activation: keywords=["aria-", "role=", "tabIndex", "onKeyDown", "focus", "a11y", "keyboard"] -->

- [ ] **Stripped aria attributes**: flag custom wrappers around Radix or shadcn/ui primitives that do not spread remaining props (`...props`) to the underlying element -- this silently drops aria-labelledby, aria-describedby, role, and other accessibility attributes
- [ ] **Missing keyboard navigation**: flag custom composites (dropdown menu, combobox, tabs) that handle onClick but not onKeyDown for Enter, Space, Escape, and Arrow keys -- keyboard-only users cannot interact; use the library's built-in keyboard handling
- [ ] **Focus trap missing in modals**: flag Dialog or Modal components (MUI, Radix, Chakra) where focus is not trapped inside the overlay -- screen reader users can tab behind the modal to invisible content; see `sec-clickjacking-and-headers` for iframe overlay concerns
- [ ] **Custom interactive without role**: flag divs or spans with onClick handlers that lack `role="button"`, `tabIndex={0}`, and keyboard event handlers -- these are invisible to assistive technology; use the library's Button or Pressable primitive

### Theme and Token Consistency
<!-- activation: keywords=["theme", "sx", "createTheme", "extendTheme", "tokens", "ThemeProvider", "useTheme", "colorScheme"] -->

- [ ] **Hardcoded overrides**: flag MUI `sx` or Chakra style props using hardcoded hex colors, pixel values, or font sizes when the theme defines equivalent tokens -- this bypasses the design system and breaks when themes change
- [ ] **Missing ThemeProvider**: flag component trees rendering themed components without a ThemeProvider (MUI) or ChakraProvider (Chakra) ancestor -- components fall back to default theme, causing visual inconsistency
- [ ] **Z-index conflicts**: flag arbitrary z-index values (999, 9999) that conflict with the library's internal z-index scale -- MUI uses a documented z-index system (1000-1500); custom layers must respect it

### Bundle Size from Imports
<!-- activation: keywords=["import", "from 'antd'", "from '@mui", "from '@chakra", "require("] -->

- [ ] **Full library import**: flag `import { X } from 'antd'` without babel-plugin-import or the modular import path `antd/es/X` -- the top-level import pulls the entire library including all component CSS and JS; see `fe-bundle-analysis-tree-shaking`
- [ ] **Unused MUI components**: flag MUI imports where the imported component is not used in the file -- MUI components are individually tree-shakeable but only if unused imports are removed
- [ ] **Icon library bloat**: flag `import * from '@mui/icons-material'` or similar wildcard icon imports -- import individual icons by path to avoid bundling thousands of icon components

### Deprecated APIs and Pattern Mixing
<!-- activation: keywords=["deprecated", "legacy", "controlled", "uncontrolled", "defaultValue", "value", "onChange", "ref"] -->

- [ ] **Deprecated component API**: flag usage of deprecated props or components documented in the library's migration guide (e.g., MUI v4 makeStyles in a v5 project, Ant Design v4 Form.create) -- deprecated APIs are removed in future versions and may have correctness issues
- [ ] **Controlled/uncontrolled mixing**: flag components that receive both `value` and `defaultValue`, or switch between providing and not providing `value` across renders -- this causes React warnings and unpredictable behavior
- [ ] **Missing forwardRef on wrapper**: flag custom components that wrap a library component and accept a `ref` prop without using React.forwardRef -- the ref is lost, preventing parent components from accessing the underlying DOM element; see `fw-react`

## Common False Positives

- **Intentional style overrides**: one-off design variations (e.g., a hero section with unique styling) legitimately override theme tokens.
- **shadcn/ui copied components**: shadcn/ui components are meant to be copied and modified; changes to copied code are expected, but accessibility attributes should still be preserved.
- **Server components without ThemeProvider**: Next.js server components cannot use context providers; ThemeProvider wraps the client boundary.
- **Barrel imports with tree shaking**: MUI v5+ and modern Ant Design support tree shaking from barrel imports with proper bundler configuration.

## Severity Guidance

| Finding | Severity |
|---|---|
| Dialog/Modal without focus trap | Critical |
| Custom interactive element missing role and keyboard handling | Critical |
| Stripped aria attributes on Radix/shadcn primitive wrapper | Important |
| Full library import bloating bundle by 200+ KB | Important |
| Deprecated API usage in new code | Important |
| Controlled/uncontrolled mode switching | Important |
| Hardcoded style overrides bypassing theme tokens | Minor |
| Z-index conflict with library scale | Minor |
| Missing forwardRef on component wrapper | Minor |

## See Also

- `fw-react` -- React component patterns (memo, forwardRef, hooks) interact with library component wrappers
- `fe-bundle-analysis-tree-shaking` -- barrel imports and tree shaking determine actual bundle impact
- `sec-clickjacking-and-headers` -- modal focus trapping relates to overlay security concerns
- `fe-css-tailwind` -- shadcn/ui uses Tailwind; Tailwind configuration pitfalls compound

## Authoritative References

- [Radix UI Documentation -- "Accessibility"](https://www.radix-ui.com/primitives/docs/overview/accessibility)
- [MUI Documentation -- "Customization"](https://mui.com/material-ui/customization/how-to-customize/)
- [Ant Design Documentation -- "FAQ / Bundle Size"](https://ant.design/docs/react/getting-started)
- [Chakra UI Documentation -- "Style Props"](https://chakra-ui.com/docs/styled-system/style-props)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
