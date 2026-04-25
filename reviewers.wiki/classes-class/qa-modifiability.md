---
id: qa-modifiability
type: primary
depth_role: leaf
focus: Detect change amplification, rigid dependencies, missing extension points, hardcoded policy, and insufficient interface segregation that make the codebase resistant to modification
parents:
  - index.md
covers:
  - Change amplification — one logical change requires edits in many files
  - Rigid dependencies — concrete classes depend on other concrete classes with no abstraction layer
  - Missing extension points — new behavior requires modifying existing code instead of adding new code
  - Hardcoded policy — business rules, feature flags, or thresholds embedded in logic instead of configuration
  - No interface segregation — consumers depend on wide interfaces they only partially use
  - Shotgun surgery — a single concern scattered across many modules
  - Divergent change — one module changed for many unrelated reasons
  - Connascence of algorithm — multiple modules must agree on encoding, format, or ordering
tags:
  - modifiability
  - change-amplification
  - rigidity
  - extension-points
  - hardcoded-policy
  - interface-segregation
  - shotgun-surgery
  - connascence
activation:
  file_globs:
    - "**/*"
  keyword_matches:
    - switch
    - case
    - if
    - else
    - instanceof
    - typeof
    - interface
    - abstract
    - config
    - factory
    - strategy
    - plugin
  structural_signals:
    - Multi-file change for single feature
    - New enum value requiring edits in multiple files
    - Hardcoded string or numeric policy in business logic
source:
  origin: file
  path: qa-modifiability.md
  hash: "sha256:80c56586518fbb07a693d85b612cfade2a3f0827e17c99b43813cb65c573fe76"
---
# Modifiability

## When This Activates

Activates when diffs span multiple files for a single logical change, introduce new behavior by editing existing code paths, or add hardcoded policy values. Modifiability measures how easily a codebase accommodates change. Poor modifiability manifests as change amplification (touching many files for one feature), rigid dependencies (unable to swap implementations), and missing extension points (forced to edit existing code instead of adding new code). These problems compound over time as each workaround adds another point of rigidity.

## Audit Surface

- [ ] Single logical change (feature, fix) touching 5+ files
- [ ] Concrete class directly instantiated in multiple consumer files
- [ ] New behavior added by editing existing if/else or switch chain
- [ ] Business threshold, timeout, or policy value hardcoded in logic
- [ ] Consumer depending on interface with 8+ methods but using only 2-3
- [ ] Data format (JSON keys, CSV columns, wire format) duplicated across producer and consumer
- [ ] Feature flag evaluated inline in business logic instead of injected as behavior
- [ ] Enum or type discriminator requiring edits in 3+ switch/match sites when extended
- [ ] Configuration requiring code change and redeployment to modify
- [ ] Module with imports spanning 3+ architectural layers
- [ ] Copy-pasted logic blocks differing only in a policy value
- [ ] Sealed/final class or module preventing extension by downstream consumers

## Detailed Checks

### Change Amplification
<!-- activation: keywords=["import", "require", "include", "using", "from", "extends", "implements"] -->

- [ ] **Shotgun surgery**: a single logical change (feature, bug fix, configuration change) requires coordinated edits in 5+ files -- extract the scattered concern into a single module or introduce a mediator
- [ ] **Divergent change**: a single file is modified for 3+ unrelated reasons in recent history -- the file bundles multiple responsibilities; split by reason-to-change
- [ ] **Format coupling**: data format (JSON field names, CSV column order, wire protocol structure) duplicated in producer and consumer without a shared schema -- introduce a shared schema definition or contract

### Rigid Dependencies
<!-- activation: keywords=["new ", "new(", "create", "getInstance", "make", "build", "factory", "inject", "autowire", "resolve"] -->

- [ ] **Concrete instantiation**: consumer classes directly instantiate dependencies with `new ConcreteClass()` instead of accepting an abstraction -- inject via constructor or factory to enable substitution
- [ ] **Service locator anti-pattern**: module resolves dependencies by name from a global registry at call time -- this hides dependencies and prevents compile-time checking; prefer explicit constructor injection
- [ ] **Transitive dependency exposure**: module A depends on module B, and B leaks types from its own dependency C into its public API, forcing A to transitively depend on C -- encapsulate C behind B's interface

### Missing Extension Points
<!-- activation: keywords=["switch", "case", "if", "else", "instanceof", "typeof", "type ==", "kind ==", "enum", "match"] -->

- [ ] **Conditional accretion**: new behavior added by inserting a branch into an existing switch/if-else chain -- introduce a strategy registry, plugin system, or visitor pattern so new behavior is added by adding code, not editing it
- [ ] **Enum-driven dispatch without registration**: adding a new enum value requires updating switch statements in 3+ locations -- use a dispatch map or strategy pattern keyed by enum value
- [ ] **Sealed hierarchy blocking extension**: a class or module marked sealed/final that downstream consumers need to extend -- evaluate whether the sealing is intentional (safety) or accidental (forgot to design for extension)

### Hardcoded Policy and Configuration
<!-- activation: keywords=["config", "env", "settings", "threshold", "timeout", "retry", "limit", "max", "feature", "flag", "toggle"] -->

- [ ] **Business rules in code**: threshold values, eligibility rules, or tier boundaries embedded in if-statements -- extract to configuration, rules engine, or policy objects that can be modified without redeployment
- [ ] **Feature flags as inline conditionals**: feature toggle evaluated directly in business logic (`if (featureEnabled("x"))`) scattered across many files -- centralize feature flag evaluation behind a feature-gate abstraction that returns the correct behavior, not a boolean
- [ ] **Environment-specific behavior in logic**: code that branches on environment name (`if env == "production"`) -- use environment-specific configuration injection instead

### Interface Segregation for Modifiability
<!-- activation: keywords=["interface", "protocol", "trait", "abstract", "implements", "extends", "mixin"] -->

- [ ] **Fat interface forcing unnecessary coupling**: consumer depends on an interface with 8+ methods but only calls 2-3 -- split the interface into role-specific slices so consumers depend only on what they use
- [ ] **Marker methods in interfaces**: interface methods that exist for completeness but no implementor meaningfully uses -- remove dead interface surface; it prevents modification by creating false coupling
- [ ] **Concrete base class as extension point**: abstract base class used where an interface would provide more flexibility -- prefer interface + composition over abstract class + inheritance for extension points

## Common False Positives

- **Orchestration layers**: controller or coordinator files naturally touch multiple modules to wire together a flow -- this is expected at composition roots, not change amplification.
- **Cross-cutting concerns**: logging, tracing, and authorization changes may legitimately touch many files -- evaluate whether an AOP or middleware approach would be more appropriate before flagging.
- **Domain-intrinsic coupling**: in some domains (financial calculations, regulatory workflows), the business logic is inherently coupled to specific rules that cannot be meaningfully abstracted.
- **Small enums with stable values**: a 3-value enum with switch statements in 2 places is not a modifiability concern if the enum is unlikely to grow.

## Severity Guidance

| Finding | Severity |
|---|---|
| Single feature requiring coordinated edits in 8+ files | Critical |
| Business rule hardcoded with no extraction path | Important |
| Enum addition requiring 4+ switch-site updates | Important |
| Concrete instantiation preventing test substitution | Important |
| Fat interface (8+ methods) with partial usage | Minor |
| Feature flag inline in 2-3 locations | Minor |
| Configuration requiring redeployment for non-sensitive values | Minor |

## See Also

- `principle-solid` -- Open/Closed and Interface Segregation directly impact modifiability
- `principle-coupling-cohesion` -- high coupling is the primary driver of change amplification
- `principle-separation-of-concerns` -- mixed concerns cause divergent change
- `principle-encapsulation` -- poor encapsulation leaks implementation details, creating rigidity
- `principle-dry-kiss-yagni` -- duplication amplifies the cost of change

## Authoritative References

- [John Ousterhout, *A Philosophy of Software Design* (2018) -- change amplification, deep vs. shallow modules](https://web.stanford.edu/~ouster/cgi-bin/book.php)
- [Robert C. Martin, *Clean Architecture* (2017) -- component coupling principles (SDP, SAP, ADP)](https://www.oreilly.com/library/view/clean-architecture/9780134494272/)
- [Martin Fowler, "Refactoring" (2018) -- Shotgun Surgery and Divergent Change smells](https://refactoring.com/)
- [Meilir Page-Jones, "What Every Programmer Should Know About Object-Oriented Design" (1995) -- connascence taxonomy](https://www.amazon.com/dp/0932633315)
