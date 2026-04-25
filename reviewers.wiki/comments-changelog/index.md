---
id: comments-changelog
type: index
depth_role: subcategory
depth: 1
focus: "API spec drift from implementation (documentation perspective); Activity diagrams that no longer match the workflow in code; AsyncAPI spec not covering all published event types; Breaking change marker (!) without a BREAKING CHANGE footer"
parents:
  - "../index.md"
shared_covers: []
entries:
  - id: antipattern-lava-flow
    file: antipattern-lava-flow.md
    type: primary
    focus: Detect dead or hardened code from previous iterations that persists because nobody understands it well enough to safely remove it
    tags:
      - lava-flow
      - dead-code
      - legacy
      - fossilized
      - hardened
      - dispensable
      - architecture
      - readability
      - anti-pattern
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
  - id: glue-release-readiness
    file: glue-release-readiness.md
    type: primary
    focus: Aggregator gate that cross-references specialist reviewer verdicts and prerequisite signals to determine whether a change is safe to merge and release
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
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Comments Changelog

**Focus:** API spec drift from implementation (documentation perspective); Activity diagrams that no longer match the workflow in code; AsyncAPI spec not covering all published event types; Breaking change marker (!) without a BREAKING CHANGE footer

## Children

| File | Type | Focus |
|------|------|-------|
| [antipattern-lava-flow.md](antipattern-lava-flow.md) | 📄 primary | Detect dead or hardened code from previous iterations that persists because nobody understands it well enough to safely remove it |
| [conventional-commits-discipline.md](conventional-commits-discipline.md) | 📄 primary | Enforce Conventional Commits message structure, subject line discipline, and commit hygiene to keep the changelog machine-readable and the history navigable |
| [doc-c4-and-structurizr.md](doc-c4-and-structurizr.md) | 📄 primary | Detect C4 model diagrams that have drifted from the codebase and Structurizr DSL definitions that no longer reflect actual architecture |
| [doc-changelog-keep-a-changelog.md](doc-changelog-keep-a-changelog.md) | 📄 primary | Detect missing, malformed, or stale changelogs that fail to communicate changes to consumers and maintainers |
| [doc-jsdoc-tsdoc-godoc-rustdoc-javadoc.md](doc-jsdoc-tsdoc-godoc-rustdoc-javadoc.md) | 📄 primary | Detect missing, redundant, or stale API doc comments across language ecosystems, ensuring public interfaces are documented with meaningful content |
| [doc-openapi-asyncapi.md](doc-openapi-asyncapi.md) | 📄 primary | Detect OpenAPI and AsyncAPI documentation-level issues including missing examples, absent descriptions, no versioning strategy, and lack of CI validation |
| [doc-runbook-oncall.md](doc-runbook-oncall.md) | 📄 primary | Detect missing, incomplete, or stale runbooks for services, ensuring on-call engineers have actionable operational documentation |
| [glue-release-readiness.md](glue-release-readiness.md) | 📄 primary | Aggregator gate that cross-references specialist reviewer verdicts and prerequisite signals to determine whether a change is safe to merge and release |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
