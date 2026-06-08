---
id: documentation
type: index
depth_role: subcategory
depth: 1
focus: "documentation: Catch hygiene issues the author should have resolved before requesting review -- debug artifacts, untracked TODOs, suppressed lints, and leftover scaffolding; Enforce Conventional Commits message structure, subject line di..."
parents:
  - "../index.md"
shared_covers: []
tags:
  - activity-diagram
  - adr
  - api-documentation
  - api-reference
  - api-spec
  - architecture
  - architecture-decision-record
  - architecture-diagram
  - asyncapi
  - badges
  - c4-model
  - changelog
  - ci-validation
  - class-diagram
  - clean-code
  - comments
  - commit-messages
  - container-diagram
  - contract
  - contributing
generator: "skill-llm-wiki/v1"
entries:
  - id: author-self-review-hygiene
    file: author-self-review-hygiene.md
    type: primary
    focus: Catch hygiene issues the author should have resolved before requesting review -- debug artifacts, untracked TODOs, suppressed lints, and leftover scaffolding
    tags:
      - hygiene
      - self-review
      - pre-review-gate
      - debug
      - todo
      - lint-suppression
      - readability
      - clean-code
  - id: conventional-commits-discipline
    file: conventional-commits-discipline.md
    type: primary
    focus: Enforce Conventional Commits message structure, subject line discipline, and commit hygiene to keep the changelog machine-readable and the history navigable
    tags:
      - conventional-commits
      - commit-messages
      - changelog
      - semver
      - git-hygiene
      - documentation
      - readability
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
  - id: doc-c4-and-structurizr
    file: doc-c4-and-structurizr.md
    type: primary
    focus: Detect C4 model diagrams that have drifted from the codebase and Structurizr DSL definitions that no longer reflect actual architecture
    tags:
      - c4-model
      - structurizr
      - architecture-diagram
      - documentation
      - architecture
      - drift
      - system-context
      - container-diagram
      - uml
      - class-diagram
      - sequence-diagram
      - state-diagram
      - activity-diagram
  - id: doc-changelog-keep-a-changelog
    file: doc-changelog-keep-a-changelog.md
    type: primary
    focus: Detect missing, malformed, or stale changelogs that fail to communicate changes to consumers and maintainers
    tags:
      - changelog
      - keep-a-changelog
      - versioning
      - release-notes
      - documentation
      - semver
  - id: doc-jsdoc-tsdoc-godoc-rustdoc-javadoc
    file: doc-jsdoc-tsdoc-godoc-rustdoc-javadoc.md
    type: primary
    focus: Detect missing, redundant, or stale API doc comments across language ecosystems, ensuring public interfaces are documented with meaningful content
    tags:
      - jsdoc
      - tsdoc
      - godoc
      - rustdoc
      - javadoc
      - kdoc
      - pydoc
      - doc-comments
      - api-documentation
      - public-api
      - comments
      - deodorant
      - readability
      - naming
      - dead-code
      - clean-code
      - dispensable
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
  - id: doc-openapi-asyncapi
    file: doc-openapi-asyncapi.md
    type: primary
    focus: Detect OpenAPI and AsyncAPI documentation-level issues including missing examples, absent descriptions, no versioning strategy, and lack of CI validation
    tags:
      - openapi
      - asyncapi
      - api-documentation
      - examples
      - descriptions
      - versioning
      - ci-validation
      - spectral
      - schema
      - swagger
      - api-spec
      - documentation
      - drift
      - validation
      - contract
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
  - id: doc-runbook-oncall
    file: doc-runbook-oncall.md
    type: primary
    focus: Detect missing, incomplete, or stale runbooks for services, ensuring on-call engineers have actionable operational documentation
    tags:
      - runbook
      - oncall
      - operations
      - incident-response
      - documentation
      - sre
      - reliability
      - rollback
      - monitoring
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
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Documentation

**Focus:** documentation: Catch hygiene issues the author should have resolved before requesting review -- debug artifacts, untracked TODOs, suppressed lints, and leftover scaffolding; Enforce Conventional Commits message structure, subject line di...

## Children

| File | Type | Focus |
|------|------|-------|
| [author-self-review-hygiene.md](author-self-review-hygiene.md) | 📄 primary | Catch hygiene issues the author should have resolved before requesting review -- debug artifacts, untracked TODOs, suppressed lints, and leftover scaffolding |
| [conventional-commits-discipline.md](conventional-commits-discipline.md) | 📄 primary | Enforce Conventional Commits message structure, subject line discipline, and commit hygiene to keep the changelog machine-readable and the history navigable |
| [doc-adr-discipline.md](doc-adr-discipline.md) | 📄 primary | Detect missing, malformed, or stale Architecture Decision Records that leave architectural choices undocumented |
| [doc-c4-and-structurizr.md](doc-c4-and-structurizr.md) | 📄 primary | Detect C4 model diagrams that have drifted from the codebase and Structurizr DSL definitions that no longer reflect actual architecture |
| [doc-changelog-keep-a-changelog.md](doc-changelog-keep-a-changelog.md) | 📄 primary | Detect missing, malformed, or stale changelogs that fail to communicate changes to consumers and maintainers |
| [doc-jsdoc-tsdoc-godoc-rustdoc-javadoc.md](doc-jsdoc-tsdoc-godoc-rustdoc-javadoc.md) | 📄 primary | Detect missing, redundant, or stale API doc comments across language ecosystems, ensuring public interfaces are documented with meaningful content |
| [doc-mermaid-plantuml.md](doc-mermaid-plantuml.md) | 📄 primary | Detect Mermaid and PlantUML diagram issues including syntax errors, rendering failures, and diagrams that contradict the code they document |
| [doc-openapi-asyncapi.md](doc-openapi-asyncapi.md) | 📄 primary | Detect OpenAPI and AsyncAPI documentation-level issues including missing examples, absent descriptions, no versioning strategy, and lack of CI validation |
| [doc-readme-root.md](doc-readme-root.md) | 📄 primary | Detect missing, skeletal, or stale root README files that fail to onboard contributors or explain the project |
| [doc-runbook-oncall.md](doc-runbook-oncall.md) | 📄 primary | Detect missing, incomplete, or stale runbooks for services, ensuring on-call engineers have actionable operational documentation |
| [doc-site-generators.md](doc-site-generators.md) | 📄 primary | Detect documentation site issues including broken builds, stale content, missing search, unversioned docs, and absent API reference auto-generation |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
