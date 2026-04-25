---
id: principle-coupling-cohesion
type: primary
depth_role: leaf
focus: Evaluate module dependency structure for excessive coupling and insufficient cohesion
parents:
  - index.md
covers:
  - "Afferent coupling (Ca): how many modules depend on this one"
  - "Efferent coupling (Ce): how many modules this one depends on"
  - "Instability metric I = Ce / (Ca + Ce) and its implications for change risk"
  - Circular dependency detection across modules and packages
  - "Cohesion: co-change frequency -- things that change together should live together"
  - "God class / god module detection via fan-out metrics"
  - "Shotgun surgery: a single logical change touching many modules"
  - "Divergent change: one module changed for many unrelated reasons"
  - Inappropriate intimacy between classes or modules
  - "Stable Dependency Principle: depend in the direction of stability"
tags:
  - coupling
  - cohesion
  - dependencies
  - architecture
  - modularity
  - solid
activation:
  file_globs:
    - "**/*"
  structural_signals:
    - Any code change
source:
  origin: file
  path: principle-coupling-cohesion.md
  hash: "sha256:4317fc374ed927d30a66eac813bbdcdae5e7b83faf2fe0a2b50b185c7ec143d6"
---
# Coupling and Cohesion Reviewer

## When This Activates

Always active on every diff. Coupling and cohesion are universal structural properties. Every code change either tightens or loosens the dependency web and either improves or degrades module focus.

## Audit Surface

- [ ] Module/class with imports from 8+ distinct packages
- [ ] Circular import or dependency cycle across 2+ modules
- [ ] Single file importing from every layer (controller, service, repository, model)
- [ ] Class with 10+ constructor parameters or injected dependencies
- [ ] Package/module that re-exports symbols from many unrelated domains
- [ ] Utility/helper module that everything depends on (high Ca, low cohesion)
- [ ] Change to one file requiring coordinated changes in 5+ other files
- [ ] Interface/trait with 8+ methods (wide interface, low cohesion)
- [ ] Module mixing I/O, business logic, and presentation in a single file
- [ ] Bidirectional dependency between two packages
- [ ] Shared mutable state accessed from multiple unrelated modules
- [ ] Abstract module depending on concrete implementation details

## Detailed Checks

### Efferent Coupling (Fan-Out)
<!-- activation: keywords=["import", "require", "use", "using", "include", "from"] -->

- [ ] Count distinct modules/packages imported -- more than 8 in a single file warrants scrutiny
- [ ] Check whether imports span multiple architectural layers (e.g., a service importing both a controller type and a database driver)
- [ ] Flag files that import from both the domain/core layer and infrastructure/adapter layer -- this inverts the dependency rule
- [ ] Identify "magnet" parameters: functions that accept large configuration objects or context bags, creating hidden coupling to everything the bag contains
- [ ] Look for imports used by only one method in a large class -- the class may need splitting

### Afferent Coupling and Stability
<!-- activation: keywords=["export", "public", "module.exports", "__all__", "pub ", "open "] -->

- [ ] Identify modules with very high afferent coupling (many dependents) -- changes here are high-risk and should be stable
- [ ] Verify that high-Ca modules are also high in abstraction (interfaces, traits, protocols) -- concrete high-Ca modules violate the Stable Abstractions Principle
- [ ] Flag breaking changes to widely-imported interfaces without a deprecation path
- [ ] Check that volatile modules (frequently changed) are not heavily depended upon -- instability metric I should be high for volatile modules

### Circular Dependencies
<!-- activation: keywords=["import", "require", "from", "use"] -->

- [ ] Detect direct circular imports: A imports B, B imports A
- [ ] Detect indirect cycles: A -> B -> C -> A, even across package boundaries
- [ ] In languages with lazy/deferred imports (Python, TypeScript), check whether deferred imports are masking a design cycle rather than solving it
- [ ] Verify that dependency injection or event-based patterns are used to break unavoidable cycles rather than import-time hacks
- [ ] Check for package-level cycles even when file-level imports appear acyclic

### Cohesion Analysis
<!-- activation: keywords=["class ", "struct ", "module ", "object ", "def ", "fn ", "func "] -->

- [ ] Flag classes where methods cluster into groups that never call each other -- the class likely bundles unrelated responsibilities
- [ ] Identify data classes with fields used by different, non-overlapping sets of consumers -- split by consumer concern
- [ ] Check for "coincidental cohesion": things grouped in a file/class only because they were written at the same time, not because they belong together
- [ ] Verify that a module's public surface area is thematically unified -- a module exporting both `parseCsv` and `sendEmail` lacks cohesion
- [ ] Flag god classes/modules with more than 500 lines or 15+ public methods as likely low-cohesion

## Common False Positives

- **Framework entry points**: Controllers, routers, and DI composition roots naturally have high fan-out because they wire things together -- this is expected at the boundary.
- **Facade modules**: An intentional facade re-exporting related symbols from sub-modules is a design choice, not low cohesion.
- **Generated code**: Protobuf, GraphQL codegen, or ORM model files may have high coupling by design.
- **Standard library imports**: Importing many stdlib modules (os, sys, json, etc.) does not indicate coupling problems -- they are stable dependencies.
- **Test files**: Test modules often import broadly to set up fixtures -- coupling metrics are less meaningful here.

## Severity Guidance

| Finding | Severity |
|---|---|
| Circular dependency between two packages | Critical |
| Module depending on both domain and infrastructure layers | Important |
| Class with 10+ injected dependencies | Important |
| Breaking change to a high-Ca interface without deprecation | Critical |
| God class with 20+ public methods and 500+ lines | Important |
| Single file importing from 8+ packages | Minor |
| Utility module with high Ca but reasonable cohesion | Minor |
| Wide interface (8+ methods) in a non-public API | Minor |

## See Also

- `principle-separation-of-concerns` -- SoC violations are the root cause of many coupling issues
- `principle-law-of-demeter` -- LoD violations are a symptom of excessive structural coupling

## Authoritative References

- [Robert C. Martin - "Clean Architecture"](https://www.oreilly.com/library/view/clean-architecture/9780134494272/)
- [Robert C. Martin - "Stable Dependencies Principle"](https://wiki.c2.com/?StableDependenciesPrinciple)
- [Martin Fowler - "Refactoring" (Shotgun Surgery, Divergent Change)](https://refactoring.com/)
- [Structured Design - Larry Constantine & Ed Yourdon (Coupling/Cohesion taxonomy)](https://www.win.tue.nl/~wstomv/quotes/structured-design.html)
- [Dependency Cruiser documentation](https://github.com/sverweij/dependency-cruiser)
