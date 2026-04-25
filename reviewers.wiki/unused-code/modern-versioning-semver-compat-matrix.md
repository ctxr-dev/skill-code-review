---
id: modern-versioning-semver-compat-matrix
type: primary
depth_role: leaf
focus: Detect semver and compatibility matrix violations including breaking changes without major bumps, new public API without minor bumps, missing compatibility matrices for multi-consumer libraries, pre-1.0 stability assumptions, absent deprecation notices, and missing migration guides
parents:
  - index.md
covers:
  - Breaking change to public API without a major version bump
  - New public API surface added without a minor version bump
  - Multi-consumer library missing a compatibility matrix
  - Pre-1.0 version treated as stable with backward compatibility guarantees
  - Missing deprecation notice before removal of public API
  - Breaking change without a migration guide for consumers
  - Version string not updated in manifest or code after API change
  - Changelog entry missing for version bump
  - Incompatible changes in patch release
  - Major version upgrade without evidence of changelog or migration guide review
  - Breaking changes listed in changelog but not addressed in the upgrade PR
  - Dependency upgrade PR mixed with unrelated feature changes or bug fixes
  - Missing test run after upgrade to verify nothing broke
  - Transitive dependency conflicts or duplicate versions not resolved
  - Deprecated API usage introduced or retained after upgrading to a version that deprecated it
  - Upgrade skips multiple major versions without incremental migration
  - Lock file not regenerated after manifest version bump
  - Peer dependency warnings or resolution overrides not documented
  - Breaking change to API response shape or behavior without version increment
  - Deprecated endpoint with no Sunset header or deprecation timeline
  - Removed endpoint with no migration path documented for consumers
  - "Multiple versioning strategies mixed in the same API (URL, header, query)"
  - New API version with no backward compatibility period
  - Version-specific logic scattered through business logic instead of isolated
  - API changelog not updated for breaking or behavioral changes
  - Client code pinned to deprecated API version with no upgrade plan
  - Breaking change in public SDK method signature without major version bump
  - SDK pinned to exact server API version with no forward compatibility
  - Inconsistent error handling -- some methods throw, others return error codes
  - "Missing JSDoc/docstrings on public SDK methods and types"
  - SDK pulling in heavy transitive dependencies for minor features
  - SDK exposing internal implementation types in public API surface
  - No retry or timeout configuration exposed to SDK consumers
  - SDK silently swallowing errors instead of propagating to caller
  - Missing SDK changelog or migration guide for version upgrades
  - "SDK constructor requiring too many parameters without builder/options pattern"
tags:
  - semver
  - versioning
  - compatibility
  - breaking-change
  - deprecation
  - migration-guide
  - api-surface
  - major-minor-patch
  - changelog
  - dependency
  - upgrade
  - major-version
  - migration
  - transitive
  - deprecated-api
  - api
  - backward-compatibility
  - sunset
  - sdk
  - library
  - client
  - error-handling
  - documentation
  - dependencies
  - public-api
aliases:
  - modern-dependency-upgrade-discipline
  - api-versioning-deprecation
  - api-sdk
activation:
  file_globs:
    - package.json
    - Cargo.toml
    - setup.py
    - setup.cfg
    - pyproject.toml
    - "*.gemspec"
    - "*.csproj"
    - pom.xml
    - "build.gradle*"
    - VERSION
    - version.go
    - version.py
    - version.rb
    - version.ts
    - "CHANGELOG*"
    - "CHANGES*"
    - "HISTORY*"
    - "*.podspec"
    - Package.swift
  keyword_matches:
    - version
    - semver
    - breaking
    - deprecated
    - deprecation
    - removed
    - renamed
    - BREAKING CHANGE
    - major
    - minor
    - patch
    - compatibility
    - compat
    - migration guide
    - public API
    - export
  structural_signals:
    - version_bump
    - api_surface_change
    - public_export_change
    - breaking_change
source:
  origin: file
  path: modern-versioning-semver-compat-matrix.md
  hash: "sha256:0b2ffb988ee716995cf6d2d6677c97a9221c2e374913108a0b7a6bf0b9bc2d96"
---
# Versioning, SemVer, and Compatibility Matrix

## When This Activates

Activates when diffs modify version numbers in manifests, change public API surfaces (exports, function signatures, type definitions), add or remove public endpoints, update changelogs, or touch compatibility documentation. This reviewer enforces semantic versioning discipline: breaking changes require major bumps, new features require minor bumps, and consumers need deprecation notices and migration guides before breaking changes land. For libraries consumed by multiple services or clients, it also checks for a compatibility matrix documenting which versions of consumers work with which versions of the library.

## Audit Surface

- [ ] Public function, method, class, or type removed or renamed without major version bump
- [ ] Public function signature changed (parameters added/removed/retyped) without major bump
- [ ] Default behavior changed in a way that breaks existing consumers without major bump
- [ ] New public export or endpoint added without minor version bump
- [ ] Library at v0.x making implicit stability promises to consumers
- [ ] Public API removed without prior deprecation in a previous release
- [ ] Breaking change PR without a migration guide section in changelog
- [ ] Version in manifest does not match version in code constants or tags
- [ ] Compatibility matrix not updated after adding support for a new runtime or consumer
- [ ] Patch release containing behavioral changes beyond bug fixes
- [ ] API marked deprecated without specifying replacement or removal version
- [ ] CHANGELOG.md not updated alongside version bump

## Detailed Checks

### Breaking Changes and Major Version Discipline
<!-- activation: keywords=["breaking", "remove", "rename", "delete", "change", "signature", "parameter", "return", "type", "export", "public", "major"] -->

- [ ] **Public API removal without major bump**: flag diffs that remove or rename a public function, method, class, type, constant, or export without incrementing the major version -- removal of public API is by definition a breaking change requiring a major bump
- [ ] **Signature change without major bump**: flag changes to public function signatures (added required parameters, changed parameter types, changed return types) without a major version bump -- signature changes break existing callers
- [ ] **Default behavior change without major bump**: flag changes to default values, sort orders, encoding formats, or error handling in public APIs without a major version bump -- callers depending on the previous default behavior will break silently
- [ ] **Breaking change in patch release**: flag patch version bumps (x.y.Z) that contain behavioral changes beyond bug fixes -- patch releases must be safe to adopt automatically by consumers using `~` or `.x` version ranges
- [ ] **Implicit breaking changes**: flag changes to transitive behavior (a public method now calls a different internal method with different side effects) that alter observable behavior without touching the public signature -- these are still breaking changes

### Minor Version and Feature Addition
<!-- activation: keywords=["new", "add", "feature", "export", "endpoint", "public", "minor", "api"] -->

- [ ] **New API without minor bump**: flag diffs that add new public functions, methods, exports, or endpoints without incrementing the minor version -- new functionality signals a minor release so consumers know new features are available
- [ ] **New required dependency without minor bump**: flag additions of new runtime dependencies that change the library's installation footprint without a minor version bump -- new dependencies can cause conflicts in consumer environments
- [ ] **Feature in patch release**: flag patch version bumps that include new features or new public API surface -- features belong in minor releases

### Deprecation Lifecycle
<!-- activation: keywords=["deprecated", "deprecation", "obsolete", "sunset", "removed", "removal", "replaced", "alternative", "warning", "@deprecated", "#[deprecated"] -->

- [ ] **Removal without prior deprecation**: flag public API removals where the API was not marked as deprecated in a previous release -- consumers need at least one release cycle to migrate before removal
- [ ] **Deprecation without replacement**: flag deprecation notices that do not specify the replacement API or alternative approach -- "deprecated" without guidance leaves consumers stranded
- [ ] **Deprecation without removal version**: flag deprecation annotations or documentation that do not state in which future version the API will be removed -- open-ended deprecation creates uncertainty about migration urgency
- [ ] **Deprecated API removed too quickly**: flag API removals in the immediately following major version after deprecation without at least one minor release in between -- consumers need time to discover and act on deprecation notices

### Compatibility Matrix for Multi-Consumer Libraries
<!-- activation: keywords=["compatibility", "compat", "matrix", "support", "runtime", "version", "consumer", "client", "SDK", "platform", "tested"] -->

- [ ] **Missing compatibility matrix**: flag libraries consumed by multiple services, platforms, or client SDKs that lack a documented compatibility matrix specifying which library version works with which consumer version -- without a matrix, consumers cannot determine safe upgrade paths
- [ ] **Matrix not updated**: flag diffs that add support for a new runtime version, platform, or consumer but do not update the compatibility matrix -- the matrix must reflect the tested combinations
- [ ] **Untested combinations**: flag compatibility matrix entries not backed by CI jobs or test configurations -- a matrix that claims compatibility without testing it is misleading
- [ ] **Pre-1.0 stability assumptions**: flag consumers that depend on a v0.x library with a pinned version or stability expectation -- semver explicitly states that v0.x has no stability guarantees; any minor bump can be breaking

### Changelog and Version Sync
<!-- activation: keywords=["changelog", "CHANGELOG", "version", "tag", "release", "bump", "history", "CHANGES", "unreleased"] -->

- [ ] **Version bump without changelog entry**: flag version increments in manifests without a corresponding entry in CHANGELOG.md or equivalent -- every version bump must document what changed
- [ ] **Changelog entry without version bump**: flag changelog additions under "Unreleased" that describe breaking changes or features but no version bump in the manifest -- the code change and version bump should land together or in a coordinated release flow
- [ ] **Version mismatch between manifest and code**: flag cases where the version in the package manifest (package.json, Cargo.toml, pyproject.toml) differs from the version constant in source code or the git tag -- version sources must agree
- [ ] **Missing breaking change marker**: flag changelog entries for breaking changes that do not use a "BREAKING CHANGE" prefix, "!" in conventional commit format, or equivalent markup -- breaking changes must be visually prominent in the changelog

## Common False Positives

- **Internal-only packages**: packages consumed only within a monorepo by the same team may use a simplified versioning scheme. Accept if the package is clearly internal and not published.
- **Pre-1.0 development**: semver explicitly allows breaking changes in v0.x minor releases. Do not flag v0.x minor bumps with breaking changes as missing a major bump. Do flag consumers treating v0.x as stable.
- **Release automation**: some projects use tools (semantic-release, changesets, cargo-release) that automate version bumps and changelog generation. The automation may run after the code PR, so the PR itself may not contain the version bump. Accept if the project uses documented release automation.
- **Private API changes**: changes to unexported functions, internal modules, or underscored/prefixed-private APIs do not require version bumps. Verify the changed API is actually public before flagging.

## Severity Guidance

| Finding | Severity |
|---|---|
| Public API removed without major version bump | Critical |
| Breaking signature change without major version bump | Critical |
| Public API removed without prior deprecation notice | Critical |
| Breaking behavioral change in a patch release | Critical |
| New public API without minor version bump | Important |
| Deprecation notice without replacement or removal version | Important |
| Multi-consumer library missing compatibility matrix | Important |
| Version mismatch between manifest and code/tag | Important |
| Version bump without changelog entry | Minor |
| Pre-1.0 library treated as stable by consumers | Minor |
| Compatibility matrix not updated after new platform support | Minor |
| Changelog entry without breaking change marker | Minor |

## See Also

- `api-versioning-deprecation` -- API-level versioning and sunset lifecycle
- `modern-expand-contract` -- expand-contract is the implementation pattern for non-breaking schema evolution
- `modern-dependency-upgrade-discipline` -- consumers upgrading dependencies must check for breaking changes flagged by this reviewer
- `doc-changelog-keep-a-changelog` -- changelog formatting and structure

## Authoritative References

- [Semantic Versioning 2.0.0 (semver.org)](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Rust RFC 1105: API Evolution](https://rust-lang.github.io/rfcs/1105-api-evolution.html)
- [Go Module Version Numbering](https://go.dev/doc/modules/version-numbers)
- [Rich Hickey, "Spec-ulation Keynote" (2016) -- on breaking changes and versioning](https://www.youtube.com/watch?v=oyLBGkS5ICk)
