---
id: principle-solid
type: primary
depth_role: leaf
focus: "Enforce Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, and Dependency Inversion principles in every diff."
parents:
  - index.md
covers:
  - "Single Responsibility: each class/module/function has one reason to change"
  - "Open/Closed: extension without modification of existing code"
  - "Liskov Substitution: subtypes are fully substitutable for their base types"
  - "Interface Segregation: no client forced to depend on methods it does not use"
  - "Dependency Inversion: high-level modules depend on abstractions, not concretions"
  - God-class and god-function detection
  - "Shotgun surgery indicators (one change touches many files)"
  - Rigid coupling between unrelated concerns
  - Fragile base-class modifications
  - Fat interface detection
tags:
  - solid
  - srp
  - ocp
  - lsp
  - isp
  - dip
  - design-principles
  - architecture
activation:
  file_globs:
    - "*"
  keyword_matches:
    - class
    - interface
    - extends
    - implements
    - abstract
    - override
    - super
  structural_signals:
    - new_class_definition
    - inheritance_hierarchy
    - interface_declaration
source:
  origin: file
  path: principle-solid.md
  hash: "sha256:7b60c422f5f075f81eb388196a5fdd7f27b97067702192cd7163796c2655da82"
---
# SOLID Principles

## When This Activates

Always active. SOLID violations are the most common structural defects in object-oriented and module-based codebases. Every diff that introduces or modifies classes, functions, modules, or interfaces is subject to this reviewer.

## Audit Surface

- [ ] Each class/module has a single, well-defined reason to change
- [ ] New behavior is added via extension (new classes, decorators, strategies) rather than editing existing conditionals
- [ ] Every subtype honors the full behavioral contract of its parent -- no exceptions thrown for "unsupported" inherited methods
- [ ] Interfaces are narrow and role-specific; no implementor is forced to stub out irrelevant methods
- [ ] High-level policy modules depend on abstractions, never on infrastructure concretions
- [ ] Constructor/init parameter count stays proportional to the single responsibility
- [ ] No file mixes orchestration logic with low-level implementation detail
- [ ] Changed class does not require parallel changes in unrelated modules (shotgun surgery)
- [ ] No "god method" that handles branching for multiple unrelated use cases
- [ ] Abstract classes do not force subclasses to provide empty/no-op implementations
- [ ] Utility/helper classes are not growing into dumping grounds
- [ ] Domain logic is free of direct I/O, framework, or transport concerns

## Detailed Checks

### Single Responsibility Principle (SRP)
<!-- activation: keywords=["class", "module", "service", "manager", "handler", "utils", "helper"] -->

- [ ] **Name congruence**: the class/module name accurately describes everything it does -- if "and" is needed in the description, SRP is likely violated
- [ ] **Reason-to-change test**: can you identify exactly one stakeholder or business reason that would require changing this unit?
- [ ] **Import coherence**: all imports are related to the single responsibility; unrelated imports (e.g., HTTP client + PDF generator in one class) signal mixed concerns
- [ ] **Method clustering**: methods naturally group into a single cohesive cluster, not two or more disjoint clusters that never call each other
- [ ] **Change frequency alignment**: all parts of the class change together and for the same reason; if some methods are stable while others churn, consider splitting
- [ ] **Constructor dependency count**: more than 4-5 injected dependencies strongly suggests multiple responsibilities bundled together
- [ ] **Test description coherence**: if unit tests for this class require wildly different setup fixtures, the class likely has multiple responsibilities

### Open/Closed Principle (OCP)
<!-- activation: keywords=["switch", "if", "else", "case", "typeof", "instanceof", "type ==", "kind =="] -->

- [ ] **Conditional accretion**: new feature added by inserting another branch into an existing switch/if-else chain instead of introducing a new strategy, handler, or subclass
- [ ] **Modification scope**: does the diff modify existing, tested code paths to add new behavior? Prefer adding new code that extends existing abstractions
- [ ] **Plugin/strategy points**: where variation is expected, are there explicit extension points (strategy pattern, plugin registry, event hooks) rather than hardcoded branches?
- [ ] **Enum/type exhaustiveness**: if a new enum value is added, does it require edits in multiple switch statements scattered across the codebase?
- [ ] **Configuration-driven behavior**: behavior that varies by deployment, tenant, or feature flag should be injectable, not baked into conditionals

### Liskov Substitution Principle (LSP)
<!-- activation: keywords=["extends", "implements", "override", "super", "base", "abstract", "virtual"] -->

- [ ] **Contract fidelity**: overridden methods honor the same preconditions (or weaker) and postconditions (or stronger) as the parent
- [ ] **No surprise exceptions**: subtype does not throw exceptions that the base type's contract does not declare (especially `NotImplementedError`, `UnsupportedOperationException`)
- [ ] **No silent behavioral changes**: override does not silently ignore or skip logic that callers of the base type rely on
- [ ] **Return type covariance**: returned values from overrides are compatible with what consumers of the base type expect
- [ ] **State invariant preservation**: subtype maintains all invariants established by the base type's constructor and methods
- [ ] **Substitution test**: mentally replace every usage of the base type with this subtype -- does the program still behave correctly?

### Interface Segregation Principle (ISP)
<!-- activation: keywords=["interface", "protocol", "trait", "abstract class", "implements", "mixin"] -->

- [ ] **Fat interface detection**: interface has more than 6-8 methods; consider splitting into role-specific interfaces
- [ ] **Forced empty implementations**: any implementor provides no-op or stub implementations for some interface methods
- [ ] **Client-specific interfaces**: each consumer depends only on the slice of behavior it actually uses
- [ ] **Marker methods**: interface methods that exist only "for completeness" or "future use" but no current implementor meaningfully uses them
- [ ] **Partial mock smell**: in tests, if mocking an interface requires stubbing many methods the test does not care about, the interface is too wide

## Common False Positives

- **Framework-mandated interfaces**: some frameworks require implementing wide interfaces (e.g., Java Servlet API). Flagging these is noise unless the class itself adds further bloat.
- **DTOs / data classes**: simple data carriers with many fields are not SRP violations -- they represent a single data shape.
- **Orchestration / coordinator classes**: a class whose single responsibility is to coordinate other services may legitimately depend on several collaborators. Judge by whether it contains business logic or purely delegates.
- **Small switch statements on closed enums**: a 3-case switch on a well-known, stable enum is not necessarily an OCP violation if the enum is unlikely to grow.
- **Language idioms**: some languages (Go interfaces, Rust traits) encourage patterns that look different from classical OOP SOLID but achieve the same goals.

## Severity Guidance

| Finding | Severity |
|---|---|
| God class with 10+ unrelated methods or 500+ lines | high |
| New feature added by modifying existing switch with 5+ cases | high |
| Subtype throws NotImplementedError for inherited method | high |
| Interface with >8 methods forcing no-op implementations | medium |
| High-level module directly instantiating infrastructure class | medium |
| Constructor with 6+ dependencies | medium |
| Utility class accumulating unrelated methods | low |
| Minor SRP stretch in a small private helper | low |

## See Also

- `principle-grasp` -- complementary responsibility-assignment patterns
- `principle-encapsulation` -- information hiding reinforces SRP boundaries
- `principle-composition-over-inheritance` -- alternative to deep hierarchies that often violate LSP
- `principle-tell-dont-ask` -- behavioral co-location reinforces SRP

## Authoritative References

- [Robert C. Martin, "Design Principles and Design Patterns" (2000)](https://web.archive.org/web/20150906155800/http://www.objectmentor.com/resources/articles/Principles_and_Patterns.pdf)
- [Robert C. Martin, *Clean Architecture* (2017), Part III: Design Principles](https://www.oreilly.com/library/view/clean-architecture-a/9780134494272/)
- [Martin Fowler, "Refactoring: Improving the Design of Existing Code" (2018), Chapter 3: Bad Smells](https://martinfowler.com/books/refactoring.html)
