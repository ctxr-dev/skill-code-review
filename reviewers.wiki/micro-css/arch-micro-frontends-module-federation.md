---
id: arch-micro-frontends-module-federation
type: primary
depth_role: leaf
focus: Detect shared state between micro-frontends, version conflicts, CSS leaking across boundaries, and performance overhead from multiple bundles
parents:
  - index.md
covers:
  - "Shared mutable state between micro-frontends (global store, window object, shared Redux)"
  - Version conflicts from multiple micro-frontends loading different versions of shared libraries
  - "CSS leaking across micro-frontend boundaries (unscopied global styles)"
  - Performance overhead from multiple bundles loading duplicate dependencies
  - "Micro-frontend directly importing another micro-frontend's internal modules"
  - "Shared runtime dependency without version negotiation (Module Federation shared scope)"
  - Cross-micro-frontend communication through DOM manipulation
  - No lazy loading or code splitting for micro-frontend bundles
  - Micro-frontend with no independent deployment capability
  - Tight coupling through shared backend API contracts
tags:
  - micro-frontends
  - module-federation
  - CSS-isolation
  - shared-state
  - performance
  - architecture
activation:
  file_globs:
    - "**/*micro-frontend*"
    - "**/module-federation*"
    - "**/ModuleFederationPlugin*"
    - "**/*remote*"
    - "**/*shell*"
    - "**/*host*"
    - "**/single-spa*"
    - "**/*federation*"
  keyword_matches:
    - micro-frontend
    - module federation
    - ModuleFederationPlugin
    - single-spa
    - remote
    - shell
    - host
    - exposed
    - shared
    - federated
  structural_signals:
    - module_federation_config
    - micro_frontend_registration
    - remote_entry
source:
  origin: file
  path: arch-micro-frontends-module-federation.md
  hash: "sha256:e9e62e8ed33303c85c10c8ddb904c4d4d826b74a830727aeb0d03aeacd6156eb"
---
# Micro-Frontends & Module Federation

## When This Activates

Activates on diffs involving micro-frontend configuration, Module Federation setup, cross-micro-frontend communication, or CSS scoping in micro-frontend architectures. Micro-frontends decompose a frontend monolith into independently deployable UI fragments, each owned by a team. Module Federation (Webpack 5+) enables runtime sharing of JavaScript modules between separately built applications. Violations occur when micro-frontends share mutable state (recreating a frontend monolith), load conflicting dependency versions, leak CSS across boundaries, or impose excessive bundle overhead. This reviewer detects these micro-frontend-specific issues.

## Audit Surface

- [ ] Global state (window.*, global store) written by one micro-frontend and read by another
- [ ] Two micro-frontends bundle different versions of React, Angular, or Vue
- [ ] CSS class names from one micro-frontend affect another's rendering
- [ ] Same library bundled in 3+ micro-frontend bundles (no shared scope)
- [ ] Micro-frontend imports from another micro-frontend's internal path
- [ ] Module Federation shared config missing version range or singleton constraint
- [ ] Cross-micro-frontend communication via direct DOM queries (querySelector)
- [ ] All micro-frontends loaded eagerly on initial page load
- [ ] Micro-frontend deployment requires redeploying the shell or other micro-frontends
- [ ] Micro-frontends sharing a backend API schema with no versioning
- [ ] Global CSS stylesheet without scoping (no CSS modules, Shadow DOM, or BEM)
- [ ] No fallback UI when a remote micro-frontend fails to load

## Detailed Checks

### Shared State Isolation
<!-- activation: keywords=["state", "store", "redux", "global", "window", "context", "shared", "event", "bus", "publish", "subscribe"] -->

- [ ] **Shared mutable global state**: flag micro-frontends reading or writing to shared global state (window.*, document.*, global Redux store, shared Context) -- each micro-frontend must own its own state; cross-MFE communication should use events or a well-defined API
- [ ] **Direct DOM manipulation across boundaries**: flag micro-frontends using querySelector, getElementById, or other DOM APIs to read or modify another micro-frontend's DOM -- use custom events or a pub-sub bus
- [ ] **Shared state store**: flag a single Redux, MobX, or Zustand store shared between independently deployed micro-frontends -- state coupling defeats independent deployability
- [ ] **Tight event coupling**: flag micro-frontend communication through events where the consumer depends on the internal data shape of the producer -- use a published event contract

### Version Conflict Management
<!-- activation: keywords=["version", "react", "angular", "vue", "shared", "singleton", "eager", "requiredVersion", "import", "duplicate"] -->

- [ ] **Conflicting framework versions**: flag micro-frontends that load different major versions of the same framework (React 17 + React 18) -- framework version conflicts cause runtime errors or subtle bugs
- [ ] **Missing singleton constraint**: flag Module Federation shared configuration where framework libraries (React, ReactDOM, Angular) are not marked as singleton -- multiple instances of a framework cause context and hook failures
- [ ] **Missing version range**: flag Module Federation shared dependencies without requiredVersion or version range -- incompatible versions may be loaded at runtime
- [ ] **Duplicate dependency bundling**: flag the same library bundled in 3+ micro-frontend packages when it could be shared through Module Federation or an external CDN -- duplicate bundles waste bandwidth

### CSS Isolation
<!-- activation: keywords=["css", "style", "class", "global", "scope", "shadow", "module", "BEM", "prefix", "encapsulat"] -->

- [ ] **Unscoped global CSS**: flag global CSS stylesheets (no CSS Modules, no Shadow DOM, no BEM namespace) in a micro-frontend -- global class names will collide with other micro-frontends
- [ ] **CSS class name collision**: flag generic class names (`.container`, `.header`, `.button`, `.active`) without micro-frontend-specific prefix or scoping mechanism
- [ ] **Global style override**: flag micro-frontend CSS that uses `!important`, `*` selectors, or resets (normalize.css applied per MFE) that affect the global document
- [ ] **Missing Shadow DOM or scoping**: flag micro-frontends rendered into the main document without any CSS isolation strategy -- styles will leak bidirectionally

### Performance and Loading
<!-- activation: keywords=["bundle", "load", "lazy", "eager", "split", "chunk", "size", "performance", "preload", "prefetch", "remote"] -->

- [ ] **Eager loading all MFEs**: flag shell/host applications that load all micro-frontend bundles on initial page load instead of lazy-loading on navigation -- initial payload size degrades first-load performance
- [ ] **No code splitting**: flag micro-frontend bundles with no code splitting -- large monolithic bundles negate the benefit of micro-frontend architecture
- [ ] **No fallback on remote load failure**: flag remote micro-frontend loading with no error boundary or fallback UI -- if the remote fails to load, the entire page breaks
- [ ] **Duplicate polyfills**: flag multiple micro-frontends each bundling their own polyfills -- polyfills should be loaded once by the shell

### Deployment Independence
<!-- activation: keywords=["deploy", "build", "release", "shell", "host", "remote", "version", "coupling", "pipeline"] -->

- [ ] **Shell redeployment required**: flag micro-frontend changes that require redeploying the shell/host application -- micro-frontends must be independently deployable
- [ ] **Shared build pipeline**: flag micro-frontends that share a single build pipeline and cannot be built or deployed independently
- [ ] **Internal import across MFEs**: flag one micro-frontend importing from another's internal module path (not its exposed public API) -- this creates build-time coupling
- [ ] **Shared API schema without versioning**: flag micro-frontends consuming the same backend API with no versioning strategy -- backend changes break multiple MFEs simultaneously

## Common False Positives

- **Shell/host application**: the shell legitimately imports and orchestrates all micro-frontends. Its dependency on remote entry points is by design, not a coupling violation.
- **Design system / UI library**: a shared design system (component library, theme, tokens) used by all micro-frontends is an intentional shared dependency, not a state-sharing violation.
- **Module Federation shared scope**: libraries correctly configured as `shared: { singleton: true }` in Module Federation are intentionally shared. This is the mechanism for preventing version duplication, not a violation.
- **Monorepo with separate builds**: micro-frontends in a monorepo that have independent build and deploy pipelines are not coupled by the repository structure.

## Severity Guidance

| Finding | Severity |
|---|---|
| Shared mutable global state between micro-frontends | Critical |
| Conflicting framework major versions (React 17 + 18) | Critical |
| Micro-frontend importing another MFE's internal module | Critical |
| Unscoped global CSS leaking across micro-frontend boundaries | Important |
| No fallback UI when remote micro-frontend fails to load | Important |
| All micro-frontends loaded eagerly on initial page | Important |
| Micro-frontend deployment requires shell redeployment | Important |
| Same dependency bundled in 3+ MFE packages | Minor |
| Generic CSS class names without MFE prefix | Minor |
| Missing singleton constraint in Module Federation shared config | Minor |

## See Also

- `arch-modular-monolith` -- micro-frontends are the frontend equivalent of a modular monolith; module boundaries must be enforced
- `principle-encapsulation` -- each micro-frontend must encapsulate its state, styles, and implementation details
- `principle-coupling-cohesion` -- micro-frontends must be loosely coupled; shared state creates tight coupling
- `principle-separation-of-concerns` -- each micro-frontend owns a distinct UI capability or business domain
- `arch-bff-backend-for-frontend` -- each micro-frontend may have its own BFF for backend communication

## Authoritative References

- [Cam Jackson, "Micro Frontends" -- Martin Fowler (2019)](https://martinfowler.com/articles/micro-frontends.html)
- [Zack Jackson, "Module Federation" (Webpack 5 Documentation)](https://webpack.js.org/concepts/module-federation/)
- [Luca Mezzalira, *Building Micro-Frontends* (2021, O'Reilly)](https://www.oreilly.com/library/view/building-micro-frontends/9781492082989/)
- [Michael Geers, *Micro Frontends in Action* (2020, Manning)](https://www.manning.com/books/micro-frontends-in-action)
- [single-spa Documentation](https://single-spa.js.org/docs/getting-started-overview)
