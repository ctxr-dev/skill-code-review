---
id: doc-c4-and-structurizr
type: primary
depth_role: leaf
focus: Detect C4 model diagrams that have drifted from the codebase and Structurizr DSL definitions that no longer reflect actual architecture
parents:
  - index.md
covers:
  - C4 diagrams not updated after architecture changes
  - Missing context-level diagram for the system
  - Missing container-level diagram for a multi-service system
  - Missing component-level diagram for complex services
  - Structurizr DSL workspace out of sync with deployed containers or components
  - Diagrams without descriptions on relationships or elements
  - C4 elements referencing removed services or databases
  - Technology labels on containers that do not match the actual stack
  - UML class diagrams missing relationships present in code
  - UML sequence diagrams with incorrect message order or missing participants
  - UML diagrams stored only as raster images without editable source
  - Class diagrams showing inheritance or composition that code does not implement
  - Sequence diagrams referencing renamed or deleted methods
  - Activity diagrams that no longer match the workflow in code
  - State machine diagrams missing states or transitions present in code
  - UML diagrams with no legend, title, or explanatory notes
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
aliases:
  - doc-uml
activation:
  file_globs:
    - "**/workspace.dsl"
    - "**/structurizr/**"
    - "**/c4/**"
    - "**/c4-model/**"
    - "**/*.puml"
    - "**/architecture/**"
    - "**/diagrams/**"
  keyword_matches:
    - structurizr
    - Structurizr
    - c4_context
    - c4_container
    - c4_component
    - workspace
    - softwareSystem
    - container
    - component
    - relationship
    - C4-PlantUML
  structural_signals:
    - New service or deployment unit added
    - Infrastructure or dependency change
source:
  origin: file
  path: doc-c4-and-structurizr.md
  hash: "sha256:1c7d6f6fac4ab6615280093f54d29e1d6bc39edceca8821e358c725e05f78b9c"
---
# C4 Model and Structurizr Discipline

## When This Activates

Activates when diffs modify Structurizr DSL files, C4-PlantUML diagrams, or introduce architectural changes that should be reflected in C4 models (new services, removed containers, changed integrations, technology stack changes). The C4 model provides a shared vocabulary for discussing architecture at different zoom levels. When the model drifts from reality, architecture discussions reference a fictional system, and onboarding materials mislead new engineers.

## Audit Surface

- [ ] New service or container added in code with no corresponding C4 element
- [ ] Removed service or database still present in C4 diagrams
- [ ] C4 context diagram missing for the repository
- [ ] C4 container diagram missing for a multi-service repository
- [ ] Structurizr workspace.dsl references a container not present in deployment
- [ ] C4 relationship arrow has no description label
- [ ] C4 element has no technology tag or the technology tag is wrong
- [ ] C4 container's technology label does not match the actual framework or runtime
- [ ] C4 diagram has no description paragraph explaining its scope
- [ ] Structurizr DSL uses hardcoded URLs or hostnames instead of deployment-environment variables
- [ ] Component diagram references classes or modules that have been renamed or deleted
- [ ] C4 model defines external systems that are no longer integrated

## Detailed Checks

### Diagram Level Coverage
<!-- activation: keywords=["softwareSystem", "container", "component", "systemContext", "c4_context", "c4_container"] -->

- [ ] **Context diagram exists**: every non-trivial system should have a Level 1 (System Context) diagram showing the system, its users, and external dependencies -- this is the starting point for any architecture conversation
- [ ] **Container diagram exists**: multi-service systems, systems with separate frontends and backends, or systems with multiple data stores need a Level 2 (Container) diagram showing major deployable units
- [ ] **Component diagrams are scoped**: Level 3 (Component) diagrams exist for complex containers where internal structure matters -- but not for trivial CRUD services where the container diagram suffices
- [ ] **Deployment diagrams present**: if the system runs across multiple environments (dev, staging, prod) with different topologies, deployment views capture environment-specific differences

### Model-to-Code Drift
<!-- activation: keywords=["workspace", "container", "softwareSystem", "technology", "uses", "->"] -->

- [ ] New services added in the diff (new Dockerfile, new deployment manifest, new service directory) have corresponding container elements in the Structurizr workspace or C4 diagram
- [ ] Services or databases removed in the diff are also removed from the C4 model -- ghost elements in diagrams mislead readers
- [ ] Technology tags on containers match reality: if the code migrated from Express to Fastify, or from MySQL to PostgreSQL, the C4 technology labels must follow
- [ ] Relationships between containers match actual communication patterns -- if service A no longer calls service B, the arrow must be removed
- [ ] External system integrations added or removed in code are reflected in the system context diagram

### Element and Relationship Quality
<!-- activation: file_globs=["**/workspace.dsl", "**/*.puml"], keywords=["description", "technology", "tags", "relationship"] -->

- [ ] Every element (person, software system, container, component) has a non-empty description explaining its purpose -- unnamed boxes on a diagram are not documentation
- [ ] Every relationship arrow has a description label explaining what flows between elements ("sends order events via Kafka", not just an unlabeled arrow)
- [ ] Technology tags are specific: "Spring Boot 3.2 / Java 21" not just "Java"; "PostgreSQL 16" not just "Database"
- [ ] Diagram scope descriptions (the text block explaining what the diagram shows) are present and accurate

### Structurizr DSL Hygiene
<!-- activation: file_globs=["**/workspace.dsl"], keywords=["workspace", "model", "views", "styles", "theme"] -->

- [ ] Workspace compiles without errors -- run `structurizr-cli validate` or equivalent
- [ ] Identifiers in the DSL follow a consistent naming convention (camelCase or snake_case, not mixed)
- [ ] Views reference elements that exist in the model -- orphaned view references cause rendering failures
- [ ] Styles and themes are applied consistently -- elements of the same type should have the same visual treatment
- [ ] DSL does not contain commented-out elements that represent removed architecture (same principle as commented-out code)

## Common False Positives

- **Early-stage projects**: New projects with a single service and no external dependencies may not need formal C4 diagrams yet. A whiteboard sketch in the README may suffice until complexity warrants structured modeling.
- **Infrastructure-as-code changes**: Not every Terraform or Kubernetes change requires a C4 update. C4 models abstract above individual infrastructure resources; flag only when the change alters the logical architecture.
- **Auto-generated diagrams**: Projects using tools that generate C4 from code (e.g., jMolecules, Spring Modulith) keep diagrams in sync by construction. Flag only if the generation pipeline is broken.
- **Spike or prototype branches**: Experimental work that may be discarded does not need C4 updates until the architecture is committed.

## Severity Guidance

| Finding | Severity |
|---|---|
| New service deployed to production with no C4 element (diagram is wrong) | Important |
| Removed service still shown in C4 diagram (diagram misleads) | Important |
| Container technology label contradicts actual stack | Important |
| Relationship arrow describes communication that no longer occurs | Important |
| No context diagram for a system with 3+ external integrations | Minor |
| Element missing description | Minor |
| Relationship arrow missing label | Minor |
| Structurizr DSL contains commented-out elements | Minor |

## See Also

- `doc-uml` -- C4 models complement UML; C4 handles high-level architecture while UML details class and sequence interactions
- `doc-mermaid-plantuml` -- C4 diagrams are often rendered via PlantUML (C4-PlantUML) or Mermaid; syntax issues are covered there
- `doc-adr-discipline` -- ADRs should reference C4 diagrams when decisions change the architecture
- `doc-readme-root` -- the root README should link to or embed the system context diagram

## Authoritative References

- [Simon Brown, "The C4 Model for Visualising Software Architecture"](https://c4model.com/)
- [Structurizr DSL Language Reference](https://docs.structurizr.com/dsl/language)
- [C4-PlantUML](https://github.com/plantuml-stdlib/C4-PlantUML)
- [Simon Brown, "Software Architecture for Developers" (2022)](https://softwarearchitecturefordevelopers.com/)
