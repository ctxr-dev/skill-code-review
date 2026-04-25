---
id: smell-shotgun-surgery
type: primary
depth_role: leaf
focus: Detect single logical changes that require coordinated parallel edits across many files or modules
parents:
  - index.md
covers:
  - Single feature addition requiring edits in 5+ files across different packages
  - "Adding a new enum value requiring updates in multiple switch/match statements"
  - Renaming a domain concept requiring find-and-replace across the entire codebase
  - Configuration changes requiring coordinated edits in code, config, tests, and docs
  - New entity type requiring parallel additions in model, repository, service, controller, and serializer
  - Cross-cutting concern implemented via copy-paste in every module instead of an abstraction
  - Feature flag addition requiring edits in multiple unrelated files
  - Adding a new API field propagating through DTOs, mappers, validators, and tests
  - Type hierarchy where adding a variant forces edits in every visitor or handler
  - Scattered hardcoded strings or magic numbers requiring synchronized updates
tags:
  - shotgun-surgery
  - code-smell
  - change-preventer
  - refactoring
  - coupling
  - scattered-logic
activation:
  file_globs:
    - "**/*"
  structural_signals:
    - Any code change
source:
  origin: file
  path: smell-shotgun-surgery.md
  hash: "sha256:093f34b7dc5f9b4455b976f859bfbf489df80ab2c1d58f13b104a470883de563"
---
# Shotgun Surgery Reviewer

## When This Activates

Always active on every diff. Shotgun surgery is the smell where a single logical change -- adding a field, introducing a new variant, renaming a concept -- forces parallel edits across many files or modules. It is the inverse of divergent change: instead of many concerns changing one file, one concern is scattered across many files. This reviewer flags diffs where the breadth of modified files suggests that a concept or responsibility lacks a single authoritative home.

## Audit Surface

- [ ] Diff touching 5+ files across different packages for a single logical change
- [ ] New enum value added with corresponding edits in 3+ switch/match/if-else blocks in other files
- [ ] Same semantic change (e.g., adding a field) repeated in model, DTO, mapper, validator, and test
- [ ] Rename or string literal change applied identically in 4+ files
- [ ] New constant or configuration key added in one file with references scattered across 3+ others
- [ ] Diff adding a parallel set of files (new model + new repository + new service + new controller)
- [ ] Feature flag check added in 3+ unrelated modules
- [ ] New event type requiring handler registration in multiple dispatchers or routers
- [ ] Error code or status enum extended with coordinated changes across layers
- [ ] Test files modified to mirror structural changes in 3+ production files
- [ ] Logging format or metric name changed identically in 4+ files
- [ ] Shared interface change forcing updates in every implementation across the codebase
- [ ] New validation rule added in both client-side and server-side code in separate files
- [ ] Permission or role added requiring edits in auth config, middleware, UI, and tests

## Detailed Checks

### Scattered Enum/Variant Handling
<!-- activation: keywords=["enum", "case ", "switch", "match ", "when ", "if.*==", "type", "kind", "status", "variant"] -->

- [ ] Check whether a new enum value or variant is added in this diff -- then verify how many switch/match/if-else blocks in other files must be updated to handle it
- [ ] Flag enum types where adding a value requires edits in 3+ separate files containing exhaustive handling logic
- [ ] Identify missing centralization: if every switch on an enum duplicates similar logic, a polymorphic dispatch, visitor pattern, or registry could consolidate it
- [ ] Look for "default" or "else" branches that silently swallow new variants instead of forcing explicit handling -- this hides shotgun surgery rather than fixing it
- [ ] Check whether the enum and its handlers could be collocated using a strategy map, command pattern, or plugin registry

### Field/Property Propagation Across Layers
<!-- activation: keywords=["field", "column", "property", "attribute", "param", "dto", "model", "schema", "mapper", "serializer"] -->

- [ ] Count how many files must be modified when a single field is added to a domain entity (model, DTO, mapper, validator, migration, API schema, test fixture)
- [ ] Flag data pipelines where adding one field requires touching 4+ transformation stages in separate files
- [ ] Identify missing mapping abstractions: if field additions always require parallel edits in model + DTO + mapper, the mapping layer may need automation (e.g., AutoMapper, MapStruct, serialization conventions)
- [ ] Check for manual serialization/deserialization code duplicated across files instead of using a single schema definition
- [ ] Look for test fixtures that must be updated in lockstep with production models -- consider builder patterns or factory functions to centralize test data construction

### Cross-Cutting Concern Scatter
<!-- activation: keywords=["log", "logger", "metric", "trace", "auth", "permission", "feature_flag", "toggle", "config", "retry", "cache"] -->

- [ ] Flag feature flag checks added in 3+ files for the same flag -- the flag evaluation should be centralized at a single decision point
- [ ] Identify logging format changes requiring identical edits across many files -- structured logging with a shared formatter would centralize the format
- [ ] Check for authorization/permission checks copy-pasted into multiple handlers instead of enforced by middleware or a decorator
- [ ] Look for retry/timeout/circuit-breaker logic duplicated across service call sites instead of being abstracted into a client wrapper
- [ ] Flag configuration values read from environment in 3+ files instead of a single configuration module

### Naming and String Literal Scatter
<!-- activation: keywords=["rename", "name", "label", "key", "string", "constant", "message", "error", "url", "path", "endpoint"] -->

- [ ] Detect hardcoded string literals (API paths, error messages, metric names, queue names) duplicated across 3+ files -- these should be constants in a single source of truth
- [ ] Flag renames that require find-and-replace across many files -- this indicates the name has no single defining location
- [ ] Check whether domain concept names appear as string literals in configuration, routing, serialization, and documentation separately
- [ ] Identify magic numbers or threshold values duplicated across files instead of being defined once and referenced
- [ ] Look for URL or endpoint path fragments scattered across client and server code -- consider a shared route definition

### Parallel File Creation Patterns
<!-- activation: keywords=["class ", "interface ", "struct ", "service", "repository", "controller", "handler", "factory", "test"] -->

- [ ] Flag diffs that add a coordinated set of new files following a template (e.g., `NewEntityModel`, `NewEntityRepository`, `NewEntityService`, `NewEntityController`) -- this suggests the architecture forces boilerplate for each new concept
- [ ] Check whether code generation, scaffolding, or a framework convention could reduce the number of files that must be created manually for each new entity
- [ ] Identify interface changes that force every implementation in separate files to be updated -- consider whether the interface is too wide or the implementations too numerous
- [ ] Look for test file additions that mechanically mirror production file additions -- test helpers or parameterized tests could reduce this coupling

## Common False Positives

- **Intentional layered architecture**: adding a new entity that requires model, repository, service, and controller files is expected in layered architectures. Flag only when the per-entity boilerplate is excessive (6+ files) or could be reduced by conventions or generation.
- **Coordinated rename via automated tooling**: if an IDE or refactoring tool performs a rename across many files in one atomic operation, the breadth is a tool artifact, not a design problem.
- **Database migration + model update**: a migration file plus a model change is a natural pair. Flag only when the same schema change must also propagate manually through DTOs, serializers, validators, and test fixtures.
- **Monorepo cross-package updates**: updating a shared library version across multiple `package.json` or `build.gradle` files is dependency management, not shotgun surgery.
- **Exhaustive pattern matching by design**: languages with sealed types (Kotlin, Rust, Scala) intentionally force compiler errors when a new variant is added, ensuring all match sites are updated. This is a feature, not a smell -- flag only when the number of match sites is excessive (5+).

## Severity Guidance

| Finding | Severity |
|---|---|
| Single field addition requiring edits in 6+ files across layers | Important |
| New enum value requiring updates in 5+ switch/match blocks in different files | Important |
| Feature flag check copy-pasted into 4+ unrelated modules | Important |
| Hardcoded string or magic number duplicated in 4+ files | Important |
| Cross-cutting concern (auth, logging) inlined in 5+ call sites | Important |
| New entity requiring 4 boilerplate files following a rigid template | Minor |
| Rename applied across 3-4 files via automated refactoring | Minor |
| Test fixtures updated to match production model changes in 2-3 files | Minor |
| Configuration key referenced in 3 files (definition, code, test) | Minor |

## See Also

- `smell-divergent-change` -- the inverse smell: shotgun surgery scatters one concern across many files; divergent change bundles many concerns in one file
- `principle-coupling-cohesion` -- shotgun surgery is a direct symptom of high coupling between modules and low cohesion of the scattered concern
- `principle-dry-kiss-yagni` -- DRY violations are the root cause of many shotgun surgery instances; duplicated logic forces parallel edits
- `principle-separation-of-concerns` -- when a concern lacks a single home, it scatters across modules, creating shotgun surgery

## Authoritative References

- [Martin Fowler, *Refactoring* (2nd ed., 2018), "Shotgun Surgery"](https://refactoring.com/catalog/)
- [Robert C. Martin, *Clean Code* (2008), Chapter 10: Classes -- the relationship between SRP and change coupling](https://www.oreilly.com/library/view/clean-code/9780136083238/)
- [Adam Tornhill, *Your Code as a Crime Scene* (2015), "Detect Change Coupling" -- identifying files that always change together](https://pragprog.com/titles/atcrime/your-code-as-a-crime-scene/)
- [Michael Feathers, *Working Effectively with Legacy Code* (2004), Chapter 17: "My Application Has No Structure"](https://www.oreilly.com/library/view/working-effectively-with/0131177052/)
- [Kent Beck, *Tidy First?* (2023), "Coupling" -- structural vs. temporal coupling](https://www.oreilly.com/library/view/tidy-first/9781098151232/)
