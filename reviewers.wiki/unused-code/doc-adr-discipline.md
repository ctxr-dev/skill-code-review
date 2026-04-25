---
id: doc-adr-discipline
type: primary
depth_role: leaf
focus: Detect missing, malformed, or stale Architecture Decision Records that leave architectural choices undocumented
parents:
  - index.md
covers:
  - Architectural decisions introduced without a corresponding ADR
  - "ADR missing required sections (status, context, decision, consequences)"
  - ADR numbering gaps suggesting deleted or lost records
  - Superseded ADRs not linked to their replacement
  - ADR not referenced from the code it governs
  - "Inconsistent ADR format within the same repository (mixed MADR and Nygard)"
  - "ADR with status 'proposed' merged to main without being accepted or rejected"
  - ADR consequences section missing trade-off analysis
tags:
  - adr
  - architecture-decision-record
  - documentation
  - architecture
  - decision-log
  - madr
  - nygard
activation:
  file_globs:
    - "**/adr/**"
    - "**/ADR/**"
    - "**/decisions/**"
    - "**/docs/architecture/**"
    - "**/doc/adr/**"
    - "**/architecture-decisions/**"
  keyword_matches:
    - ADR
    - architecture decision
    - decision record
    - MADR
    - superseded
    - "## Status"
    - "## Context"
    - "## Decision"
    - "## Consequences"
  structural_signals:
    - New technology or framework introduced in dependencies
    - "Major structural refactor (new module, new service, new database)"
source:
  origin: file
  path: doc-adr-discipline.md
  hash: "sha256:23e7d73cfe83e5ec9c61153c20992a795229572d608ae058625bca77475ef826"
---
# ADR Discipline

## When This Activates

Activates when diffs touch ADR directories, introduce significant architectural changes (new dependencies, new services, protocol switches, database migrations), or modify code that references ADR numbers. Architecture decisions made without ADRs become tribal knowledge -- recoverable only by archaeology through git blame and Slack threads. This reviewer ensures decisions are recorded, well-formed, and maintained.

## Audit Surface

- [ ] Diff introduces a new framework, database, protocol, or messaging system with no ADR
- [ ] ADR file missing Status section
- [ ] ADR file missing Context section explaining the problem
- [ ] ADR file missing Decision section stating the choice
- [ ] ADR file missing Consequences section listing trade-offs
- [ ] ADR numbered out of sequence (gap in numbering suggests deleted record)
- [ ] Superseded ADR lacks a link to the replacement ADR
- [ ] Replacement ADR does not reference the ADR it supersedes
- [ ] ADR status is "proposed" on the default branch -- should be accepted, rejected, deprecated, or superseded
- [ ] Code comment references an ADR number that does not exist in the docs/adr directory
- [ ] ADR format differs from the repository's established template (MADR vs Nygard vs custom)
- [ ] ADR consequences list only benefits without acknowledging downsides or risks

## Detailed Checks

### ADR Existence for Architectural Changes
<!-- activation: keywords=["dependency", "framework", "database", "queue", "kafka", "redis", "postgres", "mongo", "grpc", "graphql", "migration"] -->

- [ ] New runtime dependency on a framework, database driver, or messaging system has a corresponding ADR explaining why this technology was chosen over alternatives
- [ ] Significant structural changes (splitting a monolith, introducing a new service, adopting a new pattern like CQRS or event sourcing) have an ADR capturing the rationale
- [ ] Changes to authentication/authorization strategy, API versioning approach, or deployment topology are recorded in ADRs
- [ ] If the team does not use ADRs yet, the first architectural decision in a PR is an opportunity to recommend starting -- flag gently, not as a blocker

### Required Sections and Format Compliance
<!-- activation: file_globs=["**/adr/**", "**/decisions/**"], keywords=["Status", "Context", "Decision", "Consequences"] -->

- [ ] **Status** is present and uses a recognized value: proposed, accepted, rejected, deprecated, superseded -- not freeform text
- [ ] **Context** explains the problem or force that motivates the decision -- not just "we need to choose a database" but why the current approach is insufficient
- [ ] **Decision** states the choice clearly and unambiguously -- "We will use PostgreSQL for the order service" not "We decided to improve our data layer"
- [ ] **Consequences** lists both positive and negative outcomes -- an ADR that only lists benefits is marketing, not an engineering record
- [ ] If the repository uses MADR format: verify Considered Options, Pros/Cons of each option, and Decision Outcome sections exist
- [ ] If the repository uses Nygard format: verify the four core sections (Title, Status, Context, Decision, Consequences) are present
- [ ] Format is consistent across all ADRs in the repository -- mixing MADR and Nygard in the same decision log creates confusion

### Numbering and Lifecycle
<!-- activation: file_globs=["**/adr/**", "**/decisions/**"], keywords=["supersede", "deprecated", "replaced", "ADR-"] -->

- [ ] ADR files follow sequential numbering (0001, 0002, ...) with no unexplained gaps -- a gap suggests a deleted ADR whose context is now lost
- [ ] Superseded ADRs have their status updated to "Superseded by ADR-NNNN" with a link to the replacement
- [ ] New ADRs that supersede an older one include "Supersedes ADR-NNNN" with a link back
- [ ] Rejected ADRs are kept in the log with status "Rejected" and a note explaining why -- deleting rejected ADRs loses the "we considered X and rejected it because Y" knowledge
- [ ] ADR dates are present and reflect when the decision was made, not when the file was committed

### Code-to-ADR Traceability
<!-- activation: keywords=["ADR", "adr", "decision", "architecture decision"] -->

- [ ] Code comments referencing ADR numbers (e.g., `// See ADR-0012`) point to ADRs that actually exist in the decision log
- [ ] Non-obvious architectural constraints enforced in code link back to the ADR that established the constraint
- [ ] When an ADR is superseded, code references to the old ADR number are updated or annotated to point to the new one

## Common False Positives

- **Small dependency additions**: Adding a utility library (lodash, guava) does not warrant an ADR. ADRs are for decisions with significant architectural impact, not every `npm install`.
- **Team-agreed exceptions**: Some teams intentionally skip ADRs for reversible decisions or experiments behind feature flags. Respect documented team norms.
- **Early-stage projects**: Greenfield projects in their first week may not yet have an ADR process. Flag as a suggestion, not a blocker.
- **ADR-adjacent documents**: Some teams use RFCs, design docs, or Confluence pages instead of ADRs. If a linked design doc covers the same ground, the ADR is redundant.

## Severity Guidance

| Finding | Severity |
|---|---|
| Major architectural change (new database, new service) with no ADR or design doc | Important |
| ADR missing Decision or Consequences section (record is incomplete) | Important |
| Superseded ADR not linked to replacement (broken decision chain) | Important |
| Code references non-existent ADR number | Important |
| ADR status is "proposed" on the default branch | Minor |
| ADR numbering gap without explanation | Minor |
| Consequences section lists only benefits | Minor |
| Format inconsistency between ADRs in the same repository | Minor |

## See Also

- `doc-readme-root` -- the README should link to the ADR directory so new contributors discover the decision log
- `smell-comments-as-deodorant` -- code comments explaining "why we chose X" often belong in an ADR instead
- `principle-naming-and-intent` -- ADR titles should clearly name the decision, not use vague language
- `pr-description-quality` -- PR descriptions for architectural changes should reference the relevant ADR

## Authoritative References

- [Michael Nygard, "Documenting Architecture Decisions" (2011)](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
- [MADR -- Markdown Any Decision Records](https://adr.github.io/madr/)
- [ADR GitHub Organization](https://adr.github.io/)
- [Joel Parker Henderson, Architecture Decision Record Collection](https://github.com/joelparkerhenderson/architecture-decision-record)
- [ThoughtWorks Technology Radar: Lightweight Architecture Decision Records](https://www.thoughtworks.com/radar/techniques/lightweight-architecture-decision-records)
