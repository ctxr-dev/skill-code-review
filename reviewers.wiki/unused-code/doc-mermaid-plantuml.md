---
id: doc-mermaid-plantuml
type: primary
depth_role: leaf
focus: Detect Mermaid and PlantUML diagram issues including syntax errors, rendering failures, and diagrams that contradict the code they document
parents:
  - index.md
covers:
  - Mermaid or PlantUML syntax errors preventing rendering
  - Diagrams not rendered or validated in CI
  - Diagram content contradicting the code it documents
  - Diagrams in README or docs not updated when features change
  - Mermaid blocks in markdown not using correct fenced code block syntax
  - PlantUML include paths broken after file moves
  - Diagrams with unreadable layout due to excessive complexity
  - Mixed diagramming tools without team convention
tags:
  - mermaid
  - plantuml
  - diagrams
  - documentation
  - rendering
  - markdown
  - ci-validation
activation:
  file_globs:
    - "**/*.puml"
    - "**/*.plantuml"
    - "**/*.wsd"
    - "**/*.mmd"
    - "**/*.mermaid"
    - "**/README.md"
    - "**/docs/**/*.md"
  keyword_matches:
    - "```mermaid"
    - "@startuml"
    - "@enduml"
    - "@startmindmap"
    - "@startgantt"
    - graph TD
    - graph LR
    - sequenceDiagram
    - classDiagram
    - stateDiagram
    - flowchart
    - erDiagram
    - pie
    - gantt
  structural_signals:
    - Markdown file with fenced code blocks containing diagram syntax
    - PlantUML files in the repository
source:
  origin: file
  path: doc-mermaid-plantuml.md
  hash: "sha256:b71f467265295a04ad4ec7ce01485462d5f0062f2e310ad5c363eab9ce8520c8"
---
# Mermaid and PlantUML Diagram Quality

## When This Activates

Activates when diffs add or modify Mermaid code blocks in markdown files, PlantUML source files, or code that is documented by existing diagrams. Mermaid and PlantUML are text-based diagramming tools that live alongside code -- they can be diffed, reviewed, and versioned. But their value collapses when they contain syntax errors that prevent rendering, or when they depict an architecture that no longer exists. This reviewer catches broken diagrams before they reach readers.

## Audit Surface

- [ ] Mermaid code block in markdown has syntax errors that prevent rendering
- [ ] PlantUML file has syntax errors (missing @startuml/@enduml, undefined macros)
- [ ] Diagram references entities (classes, services, states) not present in the codebase
- [ ] Diagram omits entities that the code defines and that are relevant to the diagram's scope
- [ ] Mermaid diagram in README not updated after the feature it documents was changed
- [ ] PlantUML !include directive points to a moved or deleted file
- [ ] Diagram has more than 20 nodes without subgraph/grouping, making it unreadable
- [ ] No CI step validates diagram syntax (Mermaid CLI, PlantUML compilation)
- [ ] Mermaid fenced code block uses wrong language identifier (```mermaid vs ```text)
- [ ] PlantUML theme or style references a non-existent theme file
- [ ] Diagram duplicates information already expressed in another diagram without adding a new perspective
- [ ] Diagram has no title or caption explaining what it shows

## Detailed Checks

### Syntax Validation
<!-- activation: keywords=["```mermaid", "@startuml", "graph", "sequenceDiagram", "classDiagram", "flowchart"] -->

- [ ] Mermaid code blocks parse without errors -- common mistakes include missing arrow syntax (`-->` vs `->` in different diagram types), unclosed subgraphs, and duplicate node IDs
- [ ] PlantUML files have matching `@startuml`/`@enduml` delimiters and no undefined macros or participants
- [ ] Mermaid fenced code blocks use the correct language identifier: ` ```mermaid ` not ` ```text ` or ` ```plantuml `
- [ ] PlantUML `!include` and `!includesub` directives resolve to existing files relative to the project root
- [ ] Diagram syntax is compatible with the rendering environment (GitHub Mermaid renderer, GitLab PlantUML integration, or the project's chosen tool)

### Diagram-Code Consistency
<!-- activation: keywords=["class", "service", "state", "entity", "table", "component", "module", "-->", "->"] -->

- [ ] Entity names in diagrams match current class, service, or module names in code -- flag references to renamed or deleted entities
- [ ] Relationship directions and labels in diagrams match actual data flow or dependencies in code
- [ ] State transitions shown in stateDiagram blocks match the state machine implemented in code
- [ ] ER diagrams match current database schema -- flag tables, columns, or relationships that differ from migrations
- [ ] When the diff modifies a feature's behavior, any diagram in the same feature's documentation is updated in the same PR

### Readability and Layout
<!-- activation: keywords=["subgraph", "group", "note", "title", "direction", "style", "class"] -->

- [ ] Diagrams with more than 15-20 nodes use subgraphs or grouping to maintain readability -- a flat graph with 30 nodes is a visual wall
- [ ] Every diagram has a title (Mermaid `---\ntitle:` or PlantUML `title`) or a markdown heading immediately above it explaining its purpose
- [ ] Node labels are descriptive enough to understand without cross-referencing code -- `OrderService` not `svc1`
- [ ] Consistent direction (TD/LR) is used across diagrams of the same type in the repository
- [ ] Color and styling, if used, follow a consistent scheme and are not purely decorative

### CI Integration
<!-- activation: keywords=["ci", "pipeline", "build", "validate", "render", "check", "lint"] -->

- [ ] Projects with Mermaid diagrams in documentation have a CI step that validates diagram syntax (e.g., `mmdc --quiet` or Mermaid linting in a markdown linter)
- [ ] Projects with PlantUML files have a CI step that runs `plantuml -checkonly` or renders diagrams as part of the docs build
- [ ] Rendered diagram outputs (SVGs, PNGs) committed to the repo are regenerated by CI, not manually committed -- manual commits cause staleness

## Common False Positives

- **Draft diagrams in PR descriptions**: Mermaid diagrams used in PR descriptions or comments for ad-hoc communication do not need CI validation or perfect accuracy.
- **Conceptual sketches**: Diagrams explicitly labeled as conceptual or aspirational ("target architecture") intentionally differ from current code.
- **GitHub rendering limitations**: GitHub's Mermaid renderer supports a subset of Mermaid features. Diagrams that render correctly in Mermaid Live Editor but fail on GitHub may need simplification, not fixing.
- **Generated diagrams**: Diagrams auto-generated from code (e.g., TypeDoc class diagrams, database schema visualizers) stay in sync by construction.

## Severity Guidance

| Finding | Severity |
|---|---|
| Diagram has syntax errors and does not render at all | Important |
| Diagram shows architecture that contradicts current code (misleads readers) | Important |
| PlantUML !include points to deleted file (build break) | Important |
| Mermaid block uses wrong language identifier, rendering as plain text | Minor |
| Diagram missing title or caption | Minor |
| No CI validation of diagram syntax | Minor |
| Diagram exceeds 20 nodes without grouping | Minor |
| Diagram duplicates another diagram's content without new perspective | Minor |

## See Also

- `doc-uml` -- semantic accuracy of UML diagrams is covered there; this reviewer focuses on Mermaid/PlantUML tooling and syntax
- `doc-c4-and-structurizr` -- C4 diagrams rendered via C4-PlantUML or Mermaid C4 extension share syntax concerns covered here
- `doc-readme-root` -- diagrams embedded in the README must remain accurate and renderable
- `smell-comments-as-deodorant` -- a diagram that requires extensive surrounding prose to explain may be too complex or poorly labeled

## Authoritative References

- [Mermaid Official Documentation](https://mermaid.js.org/intro/)
- [PlantUML Language Reference Guide](https://plantuml.com/guide)
- [GitHub Docs: Creating Mermaid Diagrams](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/creating-diagrams)
- [Mermaid Live Editor](https://mermaid.live/)
