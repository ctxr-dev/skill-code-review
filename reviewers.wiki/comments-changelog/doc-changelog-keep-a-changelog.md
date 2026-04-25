---
id: doc-changelog-keep-a-changelog
type: primary
depth_role: leaf
focus: Detect missing, malformed, or stale changelogs that fail to communicate changes to consumers and maintainers
parents:
  - index.md
covers:
  - Repository has no CHANGELOG.md
  - Changelog not following Keep a Changelog format
  - Unreleased section not maintained for pending changes
  - Changelog not updated in PR with user-facing changes
  - Version in changelog not matching package.json, Cargo.toml, or equivalent manifest
  - "Changelog entries missing categorization (Added, Changed, Fixed, etc.)"
  - Changelog entries that are too vague to be useful
  - Release dates missing or inconsistent in format
tags:
  - changelog
  - keep-a-changelog
  - versioning
  - release-notes
  - documentation
  - semver
activation:
  file_globs:
    - "**/CHANGELOG*"
    - "**/HISTORY*"
    - "**/CHANGES*"
    - "**/RELEASE_NOTES*"
    - "**/package.json"
    - "**/Cargo.toml"
    - "**/pyproject.toml"
    - "**/build.gradle*"
    - "**/pom.xml"
    - "**/version.rb"
    - "**/*.gemspec"
  keyword_matches:
    - changelog
    - CHANGELOG
    - "## [Unreleased]"
    - "### Added"
    - "### Changed"
    - "### Fixed"
    - "### Removed"
    - "### Deprecated"
    - "### Security"
    - Keep a Changelog
  structural_signals:
    - Version bump in manifest file
    - User-facing feature or fix in the diff
source:
  origin: file
  path: doc-changelog-keep-a-changelog.md
  hash: "sha256:f7516c57a2a584338f34af2c6d430b8e9b92ccb48b55d4c19a34300e714c8c98"
---
# Changelog and Keep a Changelog Discipline

## When This Activates

Activates when diffs touch changelog files, bump version numbers in manifest files, or introduce user-facing changes (features, fixes, breaking changes, deprecations) without a corresponding changelog entry. A changelog is the human-readable record of what changed between versions. Without it, consumers must read commit logs or release notes to understand what upgrading entails. This reviewer ensures the changelog exists, follows a consistent format, and stays in sync with the code.

## Audit Surface

- [ ] No CHANGELOG.md or HISTORY.md at repository root
- [ ] Changelog does not follow Keep a Changelog format (missing categories, wrong heading structure)
- [ ] No [Unreleased] section at top of changelog
- [ ] PR adds user-facing feature, fix, or breaking change but changelog is not updated
- [ ] Latest version in changelog does not match version in package.json, Cargo.toml, pyproject.toml, or build.gradle
- [ ] Changelog entry is too vague: "fixed bug", "updated dependencies", "improvements"
- [ ] Changelog entry missing link to PR or issue for context
- [ ] Release heading missing date or date format inconsistent across entries
- [ ] Breaking changes not listed under a dedicated section or clearly marked
- [ ] Changelog contains duplicate entries for the same change
- [ ] Yanked or retracted release not marked in changelog
- [ ] Changelog entries use past tense inconsistently (mixed "Added X" and "Adds X")

## Detailed Checks

### Changelog Existence and Format
<!-- activation: file_globs=["**/CHANGELOG*", "**/HISTORY*"], structural_signals=["Version bump in manifest file"] -->

- [ ] Repository has a CHANGELOG.md (or CHANGELOG.rst, HISTORY.md) at root -- absence means consumers have no structured record of changes
- [ ] Changelog follows Keep a Changelog heading structure: `# Changelog` at top, `## [Unreleased]` section, `## [version] - YYYY-MM-DD` for released versions
- [ ] Change entries are categorized under standard headings: Added, Changed, Deprecated, Removed, Fixed, Security -- not ad-hoc categories or uncategorized bullet lists
- [ ] The `[Unreleased]` section exists and accumulates changes that will be included in the next release
- [ ] Version comparison links are maintained at the bottom of the file: `[Unreleased]: https://github.com/owner/repo/compare/v1.0.0...HEAD`

### Version Consistency
<!-- activation: keywords=["version", "package.json", "Cargo.toml", "pyproject.toml", "build.gradle", "pom.xml", "gemspec"] -->

- [ ] The latest released version heading in the changelog matches the version in the project manifest (package.json version, Cargo.toml version, pyproject.toml version, etc.)
- [ ] When the diff bumps the version in a manifest file, a corresponding release heading is added to the changelog with the same version number
- [ ] Semantic versioning is followed: breaking changes trigger major bumps, new features trigger minor bumps, bug fixes trigger patch bumps -- and the changelog categories reflect this
- [ ] Pre-release versions (alpha, beta, rc) are documented in the changelog when they are published to a registry

### Entry Quality
<!-- activation: keywords=["Added", "Changed", "Fixed", "Removed", "Deprecated", "Security", "breaking", "feature", "fix", "bug"] -->

- [ ] Each entry describes the change from the consumer's perspective, not the developer's: "Added pagination support to /users endpoint" not "Refactored UserController to use cursor-based queries"
- [ ] Entries are specific enough to be actionable: "Fixed timeout in payment processing when bank API is slow" not "Fixed bug"
- [ ] Breaking changes are explicitly called out: either in a "BREAKING" prefix, a dedicated "Breaking Changes" subsection, or with a clear migration note
- [ ] Entries link to the PR or issue for readers who want more context: `Added dark mode support (#234)`
- [ ] Dependencies-only updates (Dependabot, Renovate) are either grouped under a single entry or excluded from the changelog if they have no user-facing impact
- [ ] Tense is consistent throughout: Keep a Changelog recommends imperative/past tense ("Added", "Fixed", "Removed"), not present tense ("Adds", "Fixes")

### Changelog Maintenance in PRs
<!-- activation: structural_signals=["User-facing feature or fix in the diff"] -->

- [ ] PRs that add features, fix bugs, introduce deprecations, or make breaking changes include a changelog entry in the [Unreleased] section
- [ ] The changelog entry is added in the same PR as the code change, not deferred to a later "update changelog" PR -- deferred updates get forgotten
- [ ] Changelog entries are not overly coupled to implementation details that may change before release -- describe the user-facing outcome
- [ ] For automated changelog generation (standard-version, release-please): commit messages follow the configured convention (Conventional Commits) so entries are generated correctly

## Common False Positives

- **Internal tools and services**: Internal services that are not versioned or consumed by external teams may not need a formal changelog. A git log may suffice. Flag only for libraries, APIs, and published packages.
- **Automated changelog generation**: Projects using release-please, standard-version, or similar tools generate changelogs from commits. Manual changelog entries would conflict with the automation. Verify the automation runs, do not demand manual entries.
- **Monorepo per-package changelogs**: In monorepos, changelogs may live in each package directory rather than at the root. Do not flag a missing root changelog if per-package changelogs exist.
- **Pre-1.0 projects**: Projects before their first stable release may choose to defer changelog discipline until they stabilize. Flag as a suggestion, not a blocker.

## Severity Guidance

| Finding | Severity |
|---|---|
| Published library or API with no changelog at all | Important |
| Version in changelog does not match manifest (consumers see wrong version) | Important |
| Breaking change merged without changelog entry (consumers upgrade unaware) | Important |
| Changelog entry describes a change that did not actually ship in that version | Important |
| PR with user-facing changes missing a changelog entry | Minor |
| Changelog entries are vague ("fixed bug", "improvements") | Minor |
| Missing [Unreleased] section | Minor |
| Inconsistent date format across release headings | Minor |
| Missing PR/issue links in entries | Minor |

## See Also

- `doc-readme-root` -- the README should link to the CHANGELOG for version history
- `pr-description-quality` -- the PR description explains the change for reviewers; the changelog entry explains it for consumers
- `doc-openapi-asyncapi` -- API changelogs complement project changelogs by documenting spec-level changes
- `principle-naming-and-intent` -- changelog entries benefit from the same clarity principles as naming: say what changed and why, not how

## Authoritative References

- [Keep a Changelog](https://keepachangelog.com/)
- [Semantic Versioning 2.0.0](https://semver.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [release-please](https://github.com/googleapis/release-please)
- [standard-version](https://github.com/conventional-changelog/standard-version)
