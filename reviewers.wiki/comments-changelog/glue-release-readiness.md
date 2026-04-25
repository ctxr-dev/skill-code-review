---
id: glue-release-readiness
type: primary
depth_role: leaf
focus: Aggregator gate that cross-references specialist reviewer verdicts and prerequisite signals to determine whether a change is safe to merge and release
parents:
  - index.md
covers:
  - Failing CI checks not resolved before merge request
  - Missing changelog entry for user-facing change
  - Missing version bump for published package or API
  - Unclosed security findings from specialist reviewers
  - Missing migration plan for breaking changes
  - Missing rollback plan for high-risk deployment
  - Missing load test for performance-sensitive changes
  - Missing documentation update for API changes
  - Feature flags not configured for gradual rollout
  - Specialist reviewer findings at Important or Critical not addressed
tags:
  - release
  - gate
  - aggregator
  - readiness
  - merge
  - changelog
  - version
  - rollback
  - migration
  - feature-flag
activation:
  file_globs:
    - "**/*"
  keyword_matches: []
  structural_signals:
    - Any code diff
source:
  origin: file
  path: glue-release-readiness.md
  hash: "sha256:86be920ddd897bc040e8fcc5a0f8620ad7f960bc2e50a1abe02e1de188393c9d"
---
# Release Readiness Gate

## When This Activates

Always loaded as the final aggregator gate. This reviewer does not find code issues itself -- it cross-references verdicts from specialist reviewers and checks prerequisite signals that must be green before a change is safe to merge and release. It answers one question: "Is this PR ready to ship?" A PR that passes all specialist checks but lacks a changelog entry, version bump, migration plan, or rollback strategy is not ready, regardless of code quality.

## Audit Surface

- [ ] CI pipeline has unresolved failures (cross-ref: `ci-green-precondition`)
- [ ] User-facing change has no CHANGELOG entry
- [ ] Published package or API version not bumped
- [ ] Security reviewer flagged Critical or Important finding not addressed
- [ ] Breaking change has no migration guide or deprecation notice
- [ ] High-risk deploy has no rollback plan documented
- [ ] Performance-sensitive path changed with no load test evidence
- [ ] Public API signature changed with no documentation update
- [ ] New feature deployed without feature flag for gradual rollout
- [ ] Author self-review hygiene issues not resolved (cross-ref: `author-self-review-hygiene`)
- [ ] Lock file out of sync with manifest (cross-ref: `build-lockfile-hygiene`)

## Detailed Checks

### Prerequisite Gate Aggregation
<!-- activation: structural_signals=["Any code diff"] -->

- [ ] **CI green**: verify `ci-green-precondition` reports PASS or WARN -- if it reports BLOCK, this reviewer inherits the block and adds no further findings. Do not review release readiness of code that does not compile or pass tests
- [ ] **Author hygiene resolved**: verify `author-self-review-hygiene` reports no Critical or Important findings -- merge conflict markers, hardcoded credentials, and debugger statements must be resolved before assessing release readiness
- [ ] **Dependency gate clear**: verify `glue-dependency-supply-chain` reports no Critical findings -- a dependency with a critical CVE or incompatible license blocks release regardless of code quality
- [ ] **Lock file in sync**: verify `build-lockfile-hygiene` reports no Critical findings -- a lockfile with merge conflict markers or missing integrity hashes is not releasable
- [ ] **Security findings addressed**: if any security-dimension reviewer (`sec-owasp-*`, `sec-secrets-management-and-rotation`, `sec-supply-chain-sbom-slsa-sigstore`) flagged Critical or Important findings, verify they have been addressed or explicitly accepted with documented risk rationale

### Changelog and Versioning
<!-- activation: keywords=["changelog", "CHANGELOG", "version", "bump", "release", "semver", "breaking", "deprecate", "major", "minor", "patch"] -->

- [ ] **Missing changelog entry**: flag user-facing changes (new features, bug fixes, breaking changes, deprecations) that do not add an entry to CHANGELOG.md or equivalent -- consumers need to know what changed before upgrading. Internal refactors and test-only changes are exempt
- [ ] **Missing version bump**: flag changes to published packages (npm, PyPI, crates.io, Maven) or public APIs that do not bump the version in the manifest (package.json `version`, Cargo.toml `version`, pyproject.toml `version`) -- publishing without a version bump overwrites the previous release or is rejected by the registry
- [ ] **Breaking change without major version bump**: flag changes that remove or rename public API endpoints, change response shapes, remove exported functions, or alter CLI flags without bumping the major version (or adding a deprecation period for pre-1.0 packages)
- [ ] **Changelog format drift**: flag CHANGELOG.md entries that do not follow the project's established format (Keep a Changelog, Conventional Changelog, custom) -- inconsistent format makes automation and consumption harder

### Migration and Rollback Planning
<!-- activation: keywords=["migration", "migrate", "breaking", "rollback", "revert", "backward", "backward-compatible", "deploy", "release", "schema", "ALTER", "DROP", "rename", "remove"] -->

- [ ] **Breaking change without migration guide**: flag breaking API changes, database schema changes (column drops, renames, type changes), or configuration format changes that do not include a migration guide in the PR description or linked documentation -- consumers need a clear upgrade path
- [ ] **Missing rollback plan**: flag high-risk changes (data migrations, infrastructure changes, auth flow changes, payment flow changes) that do not document how to rollback if the deploy fails -- "revert the commit" is not a rollback plan if the change includes a destructive migration
- [ ] **Irreversible migration without safety net**: flag database migrations that DROP columns, DROP tables, or change column types without a preceding release that stops reading the affected columns -- deploy-then-migrate ordering prevents data loss if rollback is needed
- [ ] **No feature flag for gradual rollout**: flag new user-facing features deployed without a feature flag or percentage-based rollout mechanism -- full rollout on merge prevents controlled testing in production and makes rollback slower than flag flip

### Documentation and Load Test Evidence
<!-- activation: keywords=["doc", "docs", "documentation", "README", "API", "swagger", "openapi", "load", "perf", "benchmark", "latency", "throughput", "k6", "locust", "gatling"] -->

- [ ] **API change without documentation update**: flag changes to public API endpoints (new endpoints, changed parameters, changed response shapes, removed endpoints) that do not update OpenAPI/Swagger specs, API docs, or README -- undocumented API changes break consumers silently
- [ ] **Performance-sensitive change without load test**: flag changes to hot paths, database query patterns, caching strategies, or serialization formats that do not include load test results or benchmark comparisons -- performance regressions caught in production are expensive to diagnose and fix
- [ ] **New external integration without runbook update**: flag new third-party service integrations that do not update the on-call runbook with troubleshooting steps, escalation contacts, and degradation behavior -- on-call engineers need context when the integration fails at 3 AM

## Common False Positives

- **Internal refactors**: changes that do not affect public API, user-facing behavior, or deployment risk do not need changelog entries, version bumps, or rollback plans. Verify the change is truly internal.
- **Draft PRs and work-in-progress**: draft PRs are not ready for release by definition. Do not flag missing changelog or version bump on drafts.
- **Monorepo scope**: in monorepos, only the affected package needs a version bump and changelog entry, not every package. Verify scope before flagging.
- **Pre-release versions**: packages on 0.x.y or with pre-release tags (alpha, beta, rc) have relaxed versioning expectations. Breaking changes in 0.x are expected per semver.
- **Documentation-only or test-only PRs**: changes that only modify docs or tests do not require version bumps, changelog entries, or rollback plans.

## Severity Guidance

| Finding | Severity |
|---|---|
| Specialist reviewer Critical finding not addressed before merge | Critical |
| Breaking change with no migration guide and no deprecation period | Critical |
| Irreversible data migration with no rollback plan | Critical |
| CI failures unresolved (inherited from ci-green-precondition) | Critical |
| Published package version not bumped before release | Important |
| User-facing change with no changelog entry | Important |
| New feature without feature flag for gradual rollout | Important |
| API change without documentation update | Important |
| Performance-sensitive change without load test evidence | Minor |
| Changelog entry does not follow project format conventions | Minor |
| New integration without runbook update | Minor |

## See Also

- `ci-green-precondition` -- prerequisite gate: CI must be green before release readiness is assessed
- `author-self-review-hygiene` -- prerequisite gate: hygiene issues must be resolved first
- `glue-dependency-supply-chain` -- prerequisite gate: dependency risks must be addressed
- `build-lockfile-hygiene` -- prerequisite gate: lock file integrity must be verified
- `principle-fail-fast` -- release gates enforce fail-fast at the process level
- `principle-feature-flags-and-config` -- gradual rollout via feature flags reduces release risk
- `doc-changelog-keep-a-changelog` -- detailed changelog format and discipline checks
- `sec-owasp-a06-vulnerable-components` -- security findings that block release readiness

## Authoritative References

- [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
- [Semantic Versioning 2.0.0](https://semver.org/)
- [Google Engineering Practices: The Standard of Code Review](https://google.github.io/eng-practices/review/reviewer/standard.html)
- [Atlassian: Feature Flags for Safer Releases](https://www.atlassian.com/continuous-delivery/principles/feature-flags)
- [Martin Fowler: Blue Green Deployment](https://martinfowler.com/bliki/BlueGreenDeployment.html)
- [Michael Nygard, *Release It!* (2nd ed., 2018)](https://pragprog.com/titles/mnee2/release-it-second-edition/)
