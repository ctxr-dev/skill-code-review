---
id: unused-code
type: index
depth_role: subcategory
depth: 1
focus: "ADR consequences section missing trade-off analysis; ADR missing required sections (status, context, decision, consequences); ADR not referenced from the code it governs; ADR numbering gaps suggesting deleted or lost records"
parents:
  - "../index.md"
shared_covers: []
entries:
  - id: doc-adr-discipline
    file: doc-adr-discipline.md
    type: primary
    focus: Detect missing, malformed, or stale Architecture Decision Records that leave architectural choices undocumented
    tags:
      - adr
      - architecture-decision-record
      - documentation
      - architecture
      - decision-log
      - madr
      - nygard
  - id: doc-mermaid-plantuml
    file: doc-mermaid-plantuml.md
    type: primary
    focus: Detect Mermaid and PlantUML diagram issues including syntax errors, rendering failures, and diagrams that contradict the code they document
    tags:
      - mermaid
      - plantuml
      - diagrams
      - documentation
      - rendering
      - markdown
      - ci-validation
  - id: doc-readme-root
    file: doc-readme-root.md
    type: primary
    focus: Detect missing, skeletal, or stale root README files that fail to onboard contributors or explain the project
    tags:
      - readme
      - documentation
      - onboarding
      - contributing
      - license
      - badges
      - architecture
  - id: doc-site-generators
    file: doc-site-generators.md
    type: primary
    focus: Detect documentation site issues including broken builds, stale content, missing search, unversioned docs, and absent API reference auto-generation
    tags:
      - documentation-site
      - docusaurus
      - mkdocs
      - sphinx
      - vitepress
      - hugo
      - jekyll
      - starlight
      - api-reference
      - search
      - versioning
  - id: modern-dead-code-removal-discipline
    file: modern-dead-code-removal-discipline.md
    type: primary
    focus: Detect dead code removal discipline failures where identified dead code is not removed promptly, removal is mixed with feature changes, feature flags are not cleaned up, dead dependencies linger, unused database artifacts remain, or commented-out code is preserved
    tags:
      - dead-code
      - removal
      - cleanup
      - discipline
      - feature-flags
      - dependencies
      - hygiene
      - refactoring
      - boat-anchor
      - dead-weight
      - unused
      - dispensable
      - yagni
      - maintenance-burden
      - anti-pattern
      - clean-code
      - unreachable
      - readability
      - performance
  - id: modern-versioning-semver-compat-matrix
    file: modern-versioning-semver-compat-matrix.md
    type: primary
    focus: Detect semver and compatibility matrix violations including breaking changes without major bumps, new public API without minor bumps, missing compatibility matrices for multi-consumer libraries, pre-1.0 stability assumptions, absent deprecation notices, and missing migration guides
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
  - id: pr-description-quality
    file: pr-description-quality.md
    type: primary
    focus: Enforce that PR descriptions are present, non-trivial, and helpful for reviewers by explaining what changed, why, and how to verify
    tags:
      - pr-description
      - documentation
      - process
      - review-hygiene
      - pull-request
      - author-discipline
  - id: pr-size-and-single-purpose
    file: pr-size-and-single-purpose.md
    type: primary
    focus: Detect pull requests that are too large to review effectively or that mix unrelated concerns, reducing review quality and increasing merge risk
    tags:
      - pr-size
      - single-responsibility
      - review-quality
      - code-review
      - process
      - architecture
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Unused Code

**Focus:** ADR consequences section missing trade-off analysis; ADR missing required sections (status, context, decision, consequences); ADR not referenced from the code it governs; ADR numbering gaps suggesting deleted or lost records

## Children

| File | Type | Focus |
|------|------|-------|
| [doc-adr-discipline.md](doc-adr-discipline.md) | 📄 primary | Detect missing, malformed, or stale Architecture Decision Records that leave architectural choices undocumented |
| [doc-mermaid-plantuml.md](doc-mermaid-plantuml.md) | 📄 primary | Detect Mermaid and PlantUML diagram issues including syntax errors, rendering failures, and diagrams that contradict the code they document |
| [doc-readme-root.md](doc-readme-root.md) | 📄 primary | Detect missing, skeletal, or stale root README files that fail to onboard contributors or explain the project |
| [doc-site-generators.md](doc-site-generators.md) | 📄 primary | Detect documentation site issues including broken builds, stale content, missing search, unversioned docs, and absent API reference auto-generation |
| [modern-dead-code-removal-discipline.md](modern-dead-code-removal-discipline.md) | 📄 primary | Detect dead code removal discipline failures where identified dead code is not removed promptly, removal is mixed with feature changes, feature flags are not cleaned up, dead dependencies linger, unused database artifacts remain, or commented-out code is preserved |
| [modern-versioning-semver-compat-matrix.md](modern-versioning-semver-compat-matrix.md) | 📄 primary | Detect semver and compatibility matrix violations including breaking changes without major bumps, new public API without minor bumps, missing compatibility matrices for multi-consumer libraries, pre-1.0 stability assumptions, absent deprecation notices, and missing migration guides |
| [pr-description-quality.md](pr-description-quality.md) | 📄 primary | Enforce that PR descriptions are present, non-trivial, and helpful for reviewers by explaining what changed, why, and how to verify |
| [pr-size-and-single-purpose.md](pr-size-and-single-purpose.md) | 📄 primary | Detect pull requests that are too large to review effectively or that mix unrelated concerns, reducing review quality and increasing merge risk |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
