---
id: antipattern-god-object
type: primary
depth_role: leaf
focus: Detect classes or modules that centralize too many responsibilities, becoming universal coupling magnets that everything depends on
parents:
  - index.md
  - "../factory-interface/index.md"
covers:
  - Classes or modules exceeding 500 lines of logic with 15+ public methods
  - Files with 20+ imports from unrelated domains or packages
  - Classes changed in nearly every PR due to universal coupling
  - Classes holding direct references to most other components in the system
  - "Classes whose name includes Manager/Handler/Processor/Service without a specific domain noun"
  - "Classes with disjoint method clusters sharing no internal state (low LCOM)"
  - Constructors or initializers accepting 8+ injected dependencies
  - Classes that serve as a pass-through hub routing calls between unrelated subsystems
  - Single class providing both read and write paths for unrelated data
  - Classes accumulating static utility methods from unrelated domains
  - Modules where every new feature results in adding another method to the same class
  - Classes whose test file exceeds 1000 lines or requires 5+ distinct mock configurations
  - Classes exceeding ~300 lines of logic
  - Classes with 10+ public or total methods
  - Classes with 8+ instance fields or properties
  - Classes with method clusters that do not interact with each other
  - Classes importing from many unrelated domains or layers
  - "Classes that are hard to name without 'and' or generic suffixes like Manager/Handler/Service"
  - Modules or files that accumulate unrelated free functions
  - Classes where different groups of fields are used by different groups of methods
  - Classes that require multiple, unrelated test fixtures
  - Classes growing via accretion -- each feature adds another method without refactoring
  - "Class/module with method clusters that change independently for different features"
  - Single file appearing in many unrelated PRs or feature branches
  - Module where different sections are modified by different teams or stories
  - High-churn files that accumulate changes from multiple business domains
  - God class growing new methods for each new feature rather than delegating
  - Service class with multiple groups of dependencies, each serving a different concern
  - File where recent commits touch non-overlapping regions for unrelated reasons
  - Module mixing persistence logic, business rules, and notification triggers
  - Class with methods that cluster into independent groups sharing no state
  - Configuration file that changes for both infrastructure and business reasons
  - "Class where 50%+ of methods are one-line delegations to a single wrapped object"
  - Wrapper class that passes every call through unchanged to an inner dependency
  - Facade class with zero logic beyond forwarding calls to a single subsystem class
  - Manager or coordinator class that owns no decisions and merely relays calls
  - "Service class that wraps a single dependency 1:1, adding no behavior"
  - Proxy class that neither adds access control, caching, logging, nor lazy initialization
  - Thin adapter that maps method names but performs no argument or result transformation
  - Class introduced as an abstraction layer but providing no actual abstraction
  - "Delegator where every method has the pattern: return this.delegate.sameMethod(args)"
  - Interface implementation that forwards all calls to a concrete class without selection or enrichment
  - Interface with a single implementation and no stated reason for the abstraction
  - "4+ layers between a request and the actual work (controller-service-manager-handler-repository-adapter)"
  - Wrapper classes that add no behavior and purely delegate to another class
  - Factory that creates only one type
  - Abstract base class with a single concrete subclass
  - "Architecture astronaut patterns -- full DDD/hexagonal/clean architecture for a CRUD endpoint"
  - Dependency injection configured for classes never substituted in tests or production
  - Indirection that requires reading 4+ files to understand one operation
  - "Generic abstractions (BaseService, AbstractHandler) that provide no shared behavior"
  - Adapter or wrapper around a third-party library that adds no additional API surface
  - Service class that delegates every method to a repository with no added logic
  - Configuration objects, registries, or providers for components with no runtime variation
  - Classes with only 1-2 trivial methods that merely delegate to another object
  - Wrapper classes that add no behavior, validation, or invariant enforcement beyond the wrapped type
  - Classes that exist solely because a framework convention requires them but hold no logic
  - Interfaces with a single trivial implementation that will never have a second
  - Classes whose entire body could be inlined into the sole caller without loss of clarity
  - Thin adapter classes that pass every call through unchanged
  - Classes created speculatively for future extension that has not materialized
  - Struct or record types used in exactly one place that could be a local tuple or inline fields
  - Classes that merely re-export or alias another type with no additional semantics
  - Intermediate classes in a chain that add no transformation, validation, or error handling
tags:
  - god-object
  - god-class
  - blob
  - universal-coupling
  - srp
  - architecture
  - clean-code
  - anti-pattern
  - large-class
  - bloater
  - readability
  - divergent-change
  - code-smell
  - single-responsibility
  - change-preventer
  - refactoring
  - middle-man
  - coupler
  - delegation
  - wrapper
  - proxy
  - facade
  - over-abstraction
  - over-engineering
  - indirection
  - premature-abstraction
  - architecture-astronaut
  - lazy-class
  - dispensable
aliases:
  - smell-large-class
  - smell-divergent-change
  - smell-middle-man
  - antipattern-over-abstraction
  - smell-lazy-class
activation:
  file_globs:
    - "*"
  keyword_matches:
    - "class "
    - "struct "
    - "object "
    - "module "
    - "trait "
    - "interface "
    - Manager
    - Handler
    - Processor
    - Service
    - Engine
    - Controller
    - Core
  structural_signals:
    - class_definition
    - module_definition
    - struct_definition
    - large_import_block
source:
  origin: file
  path: antipattern-god-object.md
  hash: "sha256:9cc4d792c6f32789fb0154273de7a21d1b0d607c06fda6640badf42d9e49b499"
---
# God Object

## When This Activates

Activates on any diff that introduces or modifies a class, struct, module, or object definition. The God Object is a class that has grown to centralize control over most of the system -- it knows too much, does too much, and everything depends on it. Unlike the Large Class smell (which flags general size bloat), the God Object specifically detects the **coupling magnet** pattern: a class that is the gravitational center of the codebase, where all roads lead and all changes touch. God Objects are the single largest source of merge conflicts, test fragility, and inability to modify one part of the system without breaking another.

## Audit Surface

- [ ] Class or module exceeds 500 non-blank lines of logic
- [ ] Class declares 15+ public methods or functions
- [ ] Constructor or initializer accepts 8+ injected dependencies
- [ ] File imports from 20+ distinct packages or modules
- [ ] Imports span 4+ unrelated architectural domains (HTTP, DB, email, queue, PDF, auth)
- [ ] Class name uses generic suffix (Manager, Handler, Processor, Service, Engine, Core) without narrow domain qualifier
- [ ] Class has 3+ disjoint method clusters that share no instance fields
- [ ] Class holds direct references to 6+ collaborator types
- [ ] Class implements 4+ unrelated interfaces or protocols
- [ ] Diff modifies a class that was also changed in the last 3+ PRs
- [ ] Class has methods spanning both infrastructure (HTTP, SQL) and domain logic
- [ ] Class requires 5+ distinct mock/stub configurations in its test file
- [ ] Class has 10+ instance fields spanning unrelated concerns
- [ ] Adding a new feature to the system defaults to adding a method to this class
- [ ] Class is imported by 15+ other files across unrelated packages

## Detailed Checks

### Size and Public Surface Area
<!-- activation: keywords=["class ", "struct ", "object ", "module ", "def ", "func ", "function ", "fn ", "public ", "export "] -->

- [ ] Count non-blank, non-comment lines in the class body -- flag at 500+ lines as God Object territory (vs. 300 for general Large Class)
- [ ] Count public methods -- 15+ public methods indicates the class is serving too many consumers with too many capabilities
- [ ] Count total methods (public + private) -- 25+ total methods is a strong God Object signal regardless of visibility
- [ ] Check whether the diff adds a new public method to a class already above 500 lines -- this is the accretion vector that creates God Objects
- [ ] Flag classes where the ratio of public to private methods exceeds 2:1 -- God Objects tend to expose everything because many unrelated consumers need different capabilities

### Dependency Fan-In and Fan-Out
<!-- activation: keywords=["import ", "require", "use ", "using ", "include ", "from ", "inject", "constructor", "init", "@Autowired", "@Inject"] -->

- [ ] **Constructor injection count**: flag constructors accepting 8+ dependencies -- each dependency is a responsibility axis the class must coordinate
- [ ] **Import sprawl**: count distinct packages imported -- 20+ imports from unrelated domains (e.g., HTTP + database + email + PDF + caching + queuing + auth + logging) is a definitive God Object signal
- [ ] **Cross-layer imports**: flag classes that import from 3+ architectural layers simultaneously (e.g., controller-level routing, service-level business logic, and repository-level data access)
- [ ] **Afferent coupling (who depends on this class)**: if the class is imported by 15+ other files across unrelated packages, it is a coupling magnet -- changes to it cascade everywhere
- [ ] **Efferent coupling (what this class depends on)**: if the class depends on 10+ other concrete classes, it is too aware of the system's internals
- [ ] **Diff adds a new dependency to an already dependency-heavy constructor** -- each new injection makes the God Object harder to split later

### Cohesion and Method Cluster Analysis
<!-- activation: keywords=["self.", "this.", "def ", "func ", "function ", "method", "field", "property", "private "] -->

- [ ] **Disjoint clusters (LCOM)**: identify groups of methods that access completely different subsets of instance fields -- 3+ disjoint clusters means the class contains 3+ unrelated classes fused together
- [ ] **Pass-through methods**: flag methods that simply delegate to an injected dependency without adding logic -- the class is acting as a meaningless intermediary
- [ ] **Methods with no self/this access**: methods that use none of the class's fields and operate only on parameters are misplaced utility functions
- [ ] **Heterogeneous method purposes**: methods in the same class that serve fundamentally different actors (e.g., one group serves the API layer, another serves batch jobs, another serves admin tools)
- [ ] **State fragmentation**: 10+ instance fields where different methods use different field subsets -- each subset is a separate aggregate waiting to be extracted

### Naming and Identity Signals
<!-- activation: keywords=["Manager", "Handler", "Processor", "Service", "Engine", "Controller", "Core", "App", "Main", "System", "Global", "Central", "Master", "God"] -->

- [ ] **Generic naming**: flag class names with suffixes like Manager, Handler, Processor, Service, Engine, or Controller that lack a specific domain noun -- `OrderService` is bounded; `DataManager` or `AppService` is a God Object
- [ ] **System-level naming**: flag classes named after the entire system or application (`ApplicationManager`, `CoreEngine`, `MainController`, `SystemService`) -- these names admit unbounded scope
- [ ] **"And" test**: if the class's responsibility requires the word "and" to describe (`UserAuthenticationAndProfileAndNotificationService`), it is multiple classes
- [ ] **Namespace/package collision**: flag classes whose name matches or closely mirrors their containing package name (`services.ServiceManager`) -- this is a sign the class *is* the entire package
- [ ] **Accumulation of "Helper" inner classes**: God Objects often spawn nested helper classes because the outer class is too large to navigate -- the helpers should be top-level collaborators

### Change Frequency and Coupling Magnet Detection
<!-- activation: keywords=["git", "commit", "change", "modify", "update", "add", "fix"] -->

- [ ] **PR frequency**: if git history shows this class was modified in 5+ of the last 10 PRs, it is a coupling magnet that attracts all changes
- [ ] **Multi-concern diffs**: if diffs to this class frequently include unrelated changes (e.g., fixing a billing bug and adding a notification feature in the same class in the same PR), the class owns too many concerns
- [ ] **Merge conflict hotspot**: classes that regularly cause merge conflicts are God Objects by behavioral definition, regardless of their static metrics
- [ ] **Change coupling**: if this class is always modified alongside files from 3+ different packages, it is a central coordinator that should be decomposed

### Test Complexity as a God Object Indicator
<!-- activation: keywords=["test", "spec", "mock", "stub", "fixture", "setup", "before", "arrange", "given"] -->

- [ ] **Test file size**: flag test files exceeding 1000 lines for a single production class -- a God Object requires god-level test infrastructure
- [ ] **Mock explosion**: flag test setups requiring 5+ distinct mock/stub configurations to test different method groups -- each mock cluster represents a separate responsibility
- [ ] **Unrelated test fixtures**: flag test classes that define multiple unrelated setup methods or fixture groups for the same production class
- [ ] **Integration test masquerading as unit test**: if testing one method of the class requires wiring up 8+ real or mock dependencies, the class has too many responsibilities to be unit-tested

## Common False Positives

- **Application composition roots**: the class that wires dependency injection (e.g., Spring `@Configuration`, .NET `Startup`, Dagger `@Module`) legitimately references many components. It is a wiring manifest, not a God Object. Flag only if it also contains business logic.
- **Facade over a bounded context**: a facade class that provides a unified API for a cohesive subsystem may have many methods, but they all serve one bounded context. Check whether the methods share a coherent domain, not just whether the count is high.
- **Framework-mandated controllers**: some frameworks (Rails, Django, ASP.NET) encourage fat controllers or activities by convention. Flag only when custom business logic exceeds the framework scaffold -- not the scaffold itself.
- **Aggregate roots in DDD**: domain aggregates may legitimately coordinate multiple child entities and enforce many invariants. Check whether all methods protect a single consistency boundary before flagging.
- **Generated code**: ORM entities, protobuf service stubs, and API client classes generated from schemas may be large by design. Review the schema or generator configuration, not the output.
- **Orchestration services in microservices**: saga orchestrators or workflow engines legitimately coordinate many services. Flag only if the orchestrator also contains business logic that belongs in the coordinated services.

## Severity Guidance

| Finding | Severity |
|---|---|
| Class exceeding 500 lines with 15+ public methods and 3+ disjoint method clusters | Critical |
| Constructor with 8+ injected dependencies spanning unrelated domains | Critical |
| Class importing from 20+ packages across 4+ architectural domains | Critical |
| Class modified in 5+ of the last 10 PRs with unrelated changes | Critical |
| Class with 10+ fields where different methods use different field subsets | Important |
| Diff adds a new public method to a class already above 500 lines | Important |
| Class with generic name (Manager, Handler) exceeding 400 lines | Important |
| Class implementing 4+ unrelated interfaces | Important |
| Test file for a single class exceeding 1000 lines with 5+ mock configurations | Important |
| Class with 12-14 public methods and moderate import sprawl | Minor |
| Facade class with many methods but coherent domain scope | Minor |
| Framework-mandated controller with moderate business logic | Minor |

## See Also

- `smell-large-class` -- God Object is the extreme case of Large Class; Large Class flags size, God Object flags centralized control and universal coupling
- `principle-solid` -- God Object violates SRP (multiple responsibilities), OCP (must change for every new feature), and ISP (consumers depend on methods they do not use)
- `principle-coupling-cohesion` -- God Objects exhibit maximal afferent coupling and minimal internal cohesion (low LCOM)
- `principle-separation-of-concerns` -- a God Object is the anti-thesis of separation: all concerns converge in one class
- `smell-divergent-change` -- God Objects are the primary site of divergent change, modified for every unrelated reason
- `smell-shotgun-surgery` -- decomposing a God Object often requires shotgun surgery; the solution is to split proactively before coupling deepens
- `smell-feature-envy` -- methods in other classes that heavily access the God Object's fields are a sign the God Object hoards data that should be distributed
- `principle-encapsulation` -- God Objects break encapsulation by exposing too many capabilities and becoming the system's shared state repository

## Authoritative References

- [Robert C. Martin, *Clean Code* (2008), Chapter 10: Classes -- the Single Responsibility Principle](https://www.oreilly.com/library/view/clean-code-a/9780136083238/)
- [Martin Fowler, *Refactoring* (2nd ed., 2018), "Large Class" and "Divergent Change"](https://refactoring.com/catalog/)
- [Arthur Riel, *Object-Oriented Design Heuristics* (1996), Heuristic 3.2: "Beware of classes that have many accessor methods in their public interface"](https://www.pearson.com/en-us/subject-catalog/p/object-oriented-design-heuristics/P200000009506)
- [Hitz & Montazeri (1995), LCOM metric for measuring class cohesion](https://www.aivosto.com/project/help/pm-oo-cohesion.html)
- [Adam Tornhill, *Your Code as a Crime Scene* (2015), "Detect Change Coupling" -- identifying coupling magnets via commit history](https://pragprog.com/titles/atcrime/your-code-as-a-crime-scene/)
- [Michael Feathers, *Working Effectively with Legacy Code* (2004), Chapter 20: "This Class Is Too Big and I Don't Want It to Get Any Bigger"](https://www.oreilly.com/library/view/working-effectively-with/0131177052/)
