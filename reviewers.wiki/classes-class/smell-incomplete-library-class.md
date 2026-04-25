---
id: smell-incomplete-library-class
type: primary
depth_role: leaf
focus: Detect scattered workarounds, extensions, and patches that compensate for library or framework limitations.
parents:
  - index.md
covers:
  - "Utility functions scattered across the codebase that extend a library class's behavior"
  - Monkey-patching or runtime extension of library classes instead of contributing upstream or wrapping cleanly
  - Wrapper classes built solely to work around a single library limitation
  - Duplicated workaround code for the same library bug or missing feature in multiple files
  - Version-pinning workarounds that persist long after the library has released a fix
  - Extension methods or category methods that should be upstreamed or consolidated
  - "Polyfills and shims kept past their browser/runtime support deadline"
  - Compatibility layers that compensate for API differences across library versions
  - Copy-pasted library source code modified locally to fix a bug or add a feature
  - Multiple utility modules each adding a few methods to the same library type
tags:
  - incomplete-library-class
  - coupler
  - workaround
  - extension
  - polyfill
  - utility
  - clean-code
activation:
  file_globs:
    - "**/*.{java,kt,scala,cs,ts,js,py,rb,go,rs,swift,cpp,h,hpp,php}"
  keyword_matches:
    - util
    - helper
    - extension
    - extend
    - patch
    - monkey
    - workaround
    - compat
    - shim
    - polyfill
    - hack
    - wrapper
    - backport
  structural_signals:
    - utility_functions_for_library_types
    - monkey_patch_on_library_class
    - duplicated_workaround_code
source:
  origin: file
  path: smell-incomplete-library-class.md
  hash: "sha256:94b7aed4ddb919d90136f94c3e7e465e8f5d184c95495fe9c2eb0a248ae4524d"
---
# Incomplete Library Class

## When This Activates

Activates when diffs introduce or modify utility functions, extension methods, monkey-patches, wrappers, polyfills, or workaround code that compensates for perceived shortcomings in a library or framework. The Incomplete Library Class smell arises when the codebase accumulates scattered patches for the same library limitation rather than consolidating them, contributing upstream, or finding an alternative library. The core question is: is this code working around a library gap, and if so, is the workaround consolidated, necessary, and up to date?

## Audit Surface

- [ ] Utility functions extending library types are consolidated in one module, not scattered across the codebase
- [ ] Monkey-patches or prototype extensions on library classes are documented and minimally scoped
- [ ] Wrapper classes around library types add genuine value, not just one missing method
- [ ] Same workaround does not appear in 2+ files independently
- [ ] Version-pinning comments reference currently unfixed issues, not bugs fixed in newer releases
- [ ] Extension methods on library types are gathered in one file per library type
- [ ] Polyfills and shims target runtimes that genuinely lack the feature
- [ ] Compatibility layers are necessary for the library versions actually in use
- [ ] No vendored/copy-pasted library code has been locally modified
- [ ] Utility modules in different directories do not independently extend the same library type
- [ ] New workaround added in diff does not duplicate an existing workaround elsewhere
- [ ] Comments containing 'workaround', 'hack', or 'TODO: remove when' reference current limitations, not resolved ones

## Detailed Checks

### Scattered Utility Functions
<!-- activation: keywords=["util", "helper", "Utils", "Helper", "Extensions", "Ext", "tools", "extras"] -->

- [ ] **Multiple utility modules for one type**: `StringUtils` in package A, `StringHelper` in package B, and `StringExtensions` in package C all add methods to the same library type -- consolidate into one module
- [ ] **Utility function duplicates library capability**: utility function reimplements behavior that the library already provides (possibly added in a newer version) -- check current library docs before keeping the utility
- [ ] **Utility file growing unbounded**: a single `utils.py` or `helpers.ts` accumulates extensions for many unrelated library types -- split by library type or domain
- [ ] **Cross-team utility duplication**: different teams maintain separate utility functions for the same library gap -- consolidate into a shared internal library
- [ ] **Utility function with library-specific name**: function named `safeJsonParse` or `betterDateFormat` signals the library's version is inadequate -- verify if the library has since added the feature

### Monkey-Patching and Runtime Extensions
<!-- activation: keywords=["prototype", "monkey", "patch", "extend", "mixin", "reopen", "category", "swizzle"] -->

- [ ] **Prototype pollution**: JavaScript code adds methods to `Array.prototype`, `String.prototype`, or other built-in types -- global mutation risks naming collisions with future standards or other libraries
- [ ] **Ruby monkey-patch**: Ruby code reopens a library class to add methods -- use refinements (Ruby 2.1+) to limit the scope, or consolidate patches in one clearly-named file
- [ ] **Python monkey-patch**: code replaces a library method at runtime (`library.Class.method = custom_impl`) -- fragile across library upgrades and invisible at import time
- [ ] **Objective-C category on library class**: category adds methods to a framework class -- use a distinctive prefix to avoid selector collisions
- [ ] **Swift extension on library type**: multiple Swift files extend the same library type -- consolidate into one `LibraryType+Extensions.swift` file
- [ ] **Patch applied conditionally**: monkey-patch is applied only for a specific version (`if version < '2.0': patch()`) -- verify the patched version is still in use

### Workaround Duplication
<!-- activation: keywords=["workaround", "hack", "fixme", "todo", "remove when", "bug", "issue", "upstream"] -->

- [ ] **Same workaround in multiple files**: identical or near-identical code working around the same library bug appears in 2+ locations -- extract into a single module
- [ ] **Copy-paste workaround**: a workaround was copied from one file to another with minor modifications -- the second author was unaware of the first, signaling poor discoverability
- [ ] **Workaround without issue reference**: code comment says "workaround" or "hack" but does not link to a library issue or bug tracker -- add a reference so the workaround can be removed when fixed
- [ ] **Stale workaround comment**: comment references a library issue that has been closed/fixed -- the workaround may be removable
- [ ] **Workaround masks real bug**: code works around a library behavior that is actually correct; the real bug is in the application code -- verify the assumption before accepting the workaround

### Stale Polyfills, Shims, and Version Workarounds
<!-- activation: keywords=["polyfill", "shim", "compat", "backport", "fallback", "legacy", "version", "pin", "minimum"] -->

- [ ] **Polyfill for universally supported feature**: polyfill for `Promise`, `Array.from`, `Object.assign`, or similar features that all supported runtimes now provide natively -- remove the polyfill
- [ ] **Shim past its expiry**: shim targets a browser or runtime version that is no longer in the support matrix -- check the project's minimum supported versions
- [ ] **Version pin with resolved issue**: `package.json`, `requirements.txt`, or `Gemfile` pins a library to an old version with a comment referencing a bug -- check if the bug is fixed in newer versions
- [ ] **Compatibility layer for one version**: adapter layer compensates for API differences between library v1 and v2, but the project no longer supports v1 -- remove the compatibility layer
- [ ] **Backport of upstream feature**: code reimplements a feature from a newer library version -- if the project can upgrade, remove the backport
- [ ] **Feature detection for obsolete runtimes**: `if (typeof Symbol === 'undefined')` or similar checks for features available in all target environments -- remove the dead branch

### Vendored and Forked Library Code
<!-- activation: keywords=["vendor", "vendored", "fork", "forked", "copied", "copy", "patch", "modified", "local"] -->

- [ ] **Locally modified vendored code**: library source code is copied into the project and modified -- changes become invisible to library upgrades and diverge over time
- [ ] **Fork without upstream contribution**: project forks a library to fix a bug or add a feature without submitting the change upstream -- the fork accumulates maintenance burden
- [ ] **Vendored dependency with available package**: library source is vendored manually when a package manager version is available -- use the package manager for automatic updates
- [ ] **Stale vendored copy**: vendored code is several versions behind the latest release -- security patches and bug fixes are missed
- [ ] **Partial copy of library internals**: code copies specific internal functions from a library rather than using its public API -- the internals may change without notice in library updates

## Common False Positives

- **Domain-specific utilities**: a `DateRangeUtils` class that encodes business rules (fiscal quarters, trading holidays) is domain logic, not a library workaround. Flag only utilities that extend a library type's general capabilities.
- **Intentional abstractions over libraries**: a `HttpClient` wrapper that provides retry, circuit-breaking, and metrics is a deliberate abstraction layer, not an incomplete-library workaround.
- **Language extension libraries**: projects like Lodash, Apache Commons, or Guava are intentional supplements to standard libraries. Using them is not a smell; duplicating their functions locally is.
- **Polyfills in library code**: if the project itself is a library targeting multiple runtimes, polyfills are the product, not a smell.
- **Standard extension patterns**: C# extension methods, Kotlin extension functions, and Swift extensions are idiomatic language features. Flag only when they are scattered or duplicated, not when consolidated in one location per type.
- **Test utilities**: test helper functions that extend assertion libraries or mock frameworks are expected tooling, not incomplete library workarounds.

## Severity Guidance

| Finding | Severity |
|---|---|
| Locally modified vendored library code with no upstream contribution and no tracking of divergence | Critical |
| Same workaround for a library bug duplicated in 3+ files independently | Critical |
| Monkey-patch on a global prototype or built-in type in production code | Important |
| Polyfill or shim for a feature supported by all target runtimes | Important |
| Version pin workaround for a bug that has been fixed upstream | Important |
| Utility functions for the same library type scattered across 3+ modules | Important |
| Extension methods on a library type in 2 files instead of 1 (minor scatter) | Minor |
| Workaround with proper issue reference and TODO for removal | Minor |
| Single utility function supplementing a library type in one consolidated module | Minor |
| Fork of a library with active upstream contribution and merge tracking | Minor |

## See Also

- `principle-dry-kiss-yagni` -- duplicated workarounds violate DRY; polyfills past their expiry violate YAGNI
- `principle-separation-of-concerns` -- library workarounds should be isolated in one module per concern, not scattered through business logic
- `principle-coupling-cohesion` -- scattered workarounds create low cohesion (each module partially extends the library) and high coupling (each is fragile to library upgrades)
- `smell-primitive-obsession` -- utility functions on primitive types (StringUtils, NumberHelper) often signal both Primitive Obsession and Incomplete Library Class
- `smell-large-class` -- a monolithic Utils class that grows to cover many library gaps is simultaneously a Large Class

## Authoritative References

- [Martin Fowler, *Refactoring* (2nd ed., 2018), Incomplete Library Class smell](https://refactoring.com/catalog/)
- [Martin Fowler, *Refactoring* (2nd ed., 2018), Introduce Foreign Method / Introduce Local Extension](https://refactoring.com/catalog/)
- [Robert C. Martin, *Clean Code* (2008), Chapter 8: Boundaries](https://www.oreilly.com/library/view/clean-code-a/9780136083238/)
- [Michael Feathers, *Working Effectively with Legacy Code* (2004), Chapter 15: Dealing with API Calls](https://www.oreilly.com/library/view/working-effectively-with/0131177052/)
- [Martin Fowler, "LibraryClass" refactoring patterns](https://refactoring.com/catalog/)
