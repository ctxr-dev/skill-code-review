---
id: pattern-template-method
type: primary
depth_role: leaf
focus: Detect misuse, over-application, and absence of the Template Method pattern in skeleton-algorithm code.
parents:
  - index.md
covers:
  - Template methods with too many hook points making the algorithm skeleton unreadable
  - Hook methods with unclear contracts -- when they are called, what preconditions hold, what the return value means
  - Subclasses overriding non-hook methods, breaking the template algorithm
  - Template method used where strategy composition would be more flexible
  - Template methods calling abstract methods in constructors, operating on half-initialized subclass objects
  - Deep inheritance hierarchies stacking template methods across multiple levels
  - Hook methods with surprising default behavior that subclasses must know to override
  - "Template method in a sealed/final class that cannot be extended"
  - Subclasses duplicating code across hook implementations that should be in the template
  - Missing template method where copy-paste algorithms differ in only one or two steps
tags:
  - template-method
  - behavioral-pattern
  - design-patterns
  - inheritance
  - hook
  - skeleton
  - algorithm
  - base-class
activation:
  file_globs:
    - "**/*.{java,kt,scala,cs,ts,js,py,rb,go,rs,swift,cpp,h,hpp,php}"
  keyword_matches:
    - Template
    - template
    - abstract
    - hook
    - step
    - algorithm
    - skeleton
    - base
    - override
    - doX
    - onX
    - beforeX
    - afterX
  structural_signals:
    - abstract_class_with_final_method_calling_abstract_methods
    - base_class_method_calling_overridable_methods
    - multiple_subclasses_overriding_same_set_of_methods
source:
  origin: file
  path: pattern-template-method.md
  hash: "sha256:eaac72947549d91e8a2c64785ab576e86284bccd595143282fcb55bc6290d08a"
---
# Template Method Pattern

## When This Activates

Activates when diffs introduce abstract base classes with methods that call abstract or overridable hooks, add subclasses that override specific steps of an algorithm defined in a parent class, define methods named `doProcess`, `onBeforeX`, `afterX`, `handleStep`, or use `final`/`sealed` methods that call abstract methods. The Template Method pattern defines an algorithm's skeleton in a base class and defers specific steps to subclasses, but it becomes fragile when the skeleton is too complex, hook contracts are unclear, or subclasses violate the algorithm's invariants.

## Audit Surface

- [ ] Template method has a reasonable number of hook points (5 or fewer) and the algorithm flow is readable top-to-bottom
- [ ] Every hook and abstract method has documentation specifying when it is called, what preconditions hold, and what is expected
- [ ] Subclasses override only designated hook/abstract methods, not concrete steps of the template algorithm
- [ ] Varying steps genuinely share context/data through the template -- if they do not, strategy composition is more flexible
- [ ] No abstract or overridable methods are called from base class constructors
- [ ] Inheritance hierarchy is shallow (2 levels is typical; 3 is a warning sign)
- [ ] Hook default implementations are safe no-ops, not silent error swallowers or misleading values
- [ ] Base class is open for extension -- not final/sealed if it contains template methods
- [ ] Common hook implementations shared by multiple subclasses are lifted into the template or an intermediate class
- [ ] Near-identical algorithm copies across classes are consolidated into a template method base class
- [ ] Hook execution order does not create implicit data dependencies that subclasses must understand to implement hooks correctly
- [ ] Subclass hook implementations do not break the template's invariants by skipping steps or altering control flow
- [ ] Template method is testable: hooks can be tested in isolation and the template flow can be verified with a test subclass
- [ ] Template method separates orchestration (the skeleton) from implementation (the hooks) clearly

## Detailed Checks

### Excessive Hook Proliferation
<!-- activation: keywords=["hook", "abstract", "step", "beforeX", "afterX", "doX", "onX", "prepare", "validate", "execute", "finalize", "cleanup"] -->

- [ ] **Too many hooks**: template method calls 6+ abstract/hook methods, making the algorithm skeleton a dispatch table rather than a readable procedure -- consider grouping related hooks into a single step or extracting a strategy
- [ ] **Hook ordering dependencies**: hook B depends on state set by hook A, but this dependency is not documented -- subclass author must read the base class source to implement correctly
- [ ] **Before/after hook explosion**: a single step has `beforeStep()`, `doStep()`, `afterStep()`, `onStepError()`, `onStepComplete()` -- the framework of hooks is more complex than the algorithm itself
- [ ] **Hooks that are always overridden identically**: every subclass implements `validate()` the same way -- the implementation should be in the template, not a hook
- [ ] **Hooks that are never overridden**: a hook method has a default implementation that no subclass overrides -- the hook is unnecessary; inline it into the template

### Unclear Hook Contracts
<!-- activation: keywords=["hook", "abstract", "override", "contract", "documentation", "javadoc", "docstring", "return", "precondition", "postcondition"] -->

- [ ] **Undocumented call timing**: hook method has no documentation on when it is invoked relative to other hooks -- subclass author cannot implement it correctly without reading the base class source
- [ ] **Ambiguous return value**: hook returns a boolean or generic value, but the template uses it for control flow (skip next step? retry? fail?) without documenting the semantics
- [ ] **Hidden preconditions**: hook is called after the template has partially modified state, but the subclass does not know what state is available -- accessing uninitialized fields is possible
- [ ] **Exception contract missing**: hook documentation does not specify what happens if it throws -- does the template catch and continue, abort, or retry?
- [ ] **Mutability contract missing**: hook receives a mutable parameter but it is unclear whether it may modify it -- some hooks should treat parameters as read-only

### Subclass Overriding Non-Hook Methods
<!-- activation: keywords=["override", "super", "extends", "inherits", "final", "protected", "virtual", "open", "sealed"] -->

- [ ] **Non-hook override**: subclass overrides a concrete method in the base class that is part of the template skeleton, not a designated hook -- the algorithm invariant is broken
- [ ] **Missing final/sealed on template**: the template method itself is not marked `final`/`sealed`/non-virtual, allowing subclasses to override the entire skeleton -- the skeleton should be closed to modification
- [ ] **Super call skipped**: subclass overrides a hook but does not call `super.hook()` when the base class's default implementation includes required bookkeeping -- the template's invariant depends on super being called
- [ ] **Accidental override**: subclass defines a method with the same name as a private helper in the base class; in languages without `final`, this may shadow the base method -- use `@Override` annotation or equivalent
- [ ] **Override changes control flow**: subclass hook returns early, throws, or sets a flag that causes the template to skip subsequent steps -- the template's guaranteed execution sequence is violated

### Template Method vs. Strategy
<!-- activation: keywords=["Strategy", "strategy", "composition", "inject", "delegate", "interface", "runtime", "swap", "replace", "flexible"] -->

- [ ] **No shared context between steps**: the template method passes no data between hook calls -- the hooks are independent and could be strategies injected at runtime, which is more flexible
- [ ] **Runtime variation needed**: the algorithm's varying steps need to change at runtime (e.g., based on configuration or user input), but template method binds the variation at compile time via inheritance -- use strategy composition instead
- [ ] **Combinatorial subclass explosion**: the template has two independent variation points, creating NxM subclasses (e.g., `JsonFileProcessor`, `XmlFileProcessor`, `JsonDbProcessor`, `XmlDbProcessor`) -- extracting each variation into a strategy eliminates the explosion
- [ ] **Single method template**: the template method is a single method that delegates to one abstract method -- this is a strategy in disguise with unnecessary inheritance overhead
- [ ] **Inheritance depth for variation**: adding a new variant requires creating a new subclass -- if variants are numerous or dynamic, strategy composition scales better

### Constructor Calls to Abstract Methods
<!-- activation: keywords=["constructor", "init", "__init__", "initialize", "super", "new", "create", "abstract", "virtual"] -->

- [ ] **Abstract method in constructor**: base class constructor calls an abstract method that the subclass overrides -- at the time of the call, the subclass constructor has not yet run, so subclass fields are uninitialized (null/zero/default)
- [ ] **Virtual dispatch in init**: base class `init()` or `initialize()` method (called from constructor) invokes virtual methods -- in Java, C#, and C++, this dispatches to the subclass implementation before subclass construction completes
- [ ] **Factory method in constructor**: base class constructor calls `createComponent()` (abstract factory method), but the subclass's factory depends on constructor parameters that are not yet set -- the created component is misconfigured
- [ ] **Workaround: two-phase init**: base class requires callers to call `init()` after construction to trigger the template -- this is fragile and easy to forget; consider a factory that creates and initializes atomically

### Missing Template Method (Copy-Paste Algorithms)
<!-- activation: keywords=["duplicate", "copy", "similar", "same", "algorithm", "process", "procedure", "steps", "repeated"] -->

- [ ] **Near-identical algorithms**: 3+ classes implement the same algorithm with 1-2 steps varying -- extract the common skeleton into a base class template method with hooks for the varying steps
- [ ] **Copy-paste with divergence risk**: duplicated algorithm code has already diverged slightly between copies (bug fixed in one but not another) -- a template method would enforce a single skeleton
- [ ] **Inline variation with if/else**: a single method uses if/else to vary one step of an otherwise fixed algorithm based on a type parameter -- extract the varying step as a hook method

## Common False Positives

- **Framework lifecycle hooks**: Android `Activity.onCreate()`, React lifecycle methods, ASP.NET `Controller` action pipeline, and JUnit `@Before`/`@After` are framework-defined template methods. Do not flag as "excessive hooks" unless the project adds additional layers of custom hooks on top.
- **Testing base classes**: `BaseTest` or `AbstractTestCase` classes with setup/teardown template methods are standard testing practice. Flag only if the hook count is excessive or contracts are unclear.
- **ORM/persistence base classes**: Hibernate `Interceptor`, Django model `save()` with `pre_save`/`post_save`, and similar are framework-native template methods. Flag only if custom overrides break the persistence contract.
- **Builder pattern with steps**: builder classes with chained step methods may resemble template methods but are a different pattern. Do not conflate.
- **Functional pipeline composition**: functional code using `pipe(step1, step2, step3)` achieves similar goals to template method without inheritance. Do not flag as "missing template method."

## Severity Guidance

| Finding | Severity |
|---|---|
| Abstract method called from constructor, operating on uninitialized subclass state | high |
| Subclass overrides non-hook concrete method, breaking the algorithm's invariant | high |
| Hook return value controls template flow (skip/retry/abort) with no documentation | high |
| Template method not marked final, allowing subclass to replace entire skeleton | medium |
| 6+ hooks making the algorithm skeleton unreadable | medium |
| Near-identical algorithms in 3+ classes without shared template | medium |
| NxM subclass explosion where strategy composition would eliminate it | medium |
| Hook method has default that silently swallows errors | medium |
| 3+ inheritance levels stacking template methods | medium |
| Template method for algorithm with one varying step (strategy is simpler) | low |
| Hook that no subclass overrides (unnecessary extension point) | low |
| Missing `@Override` annotation on hook override | low |

## See Also

- `pattern-strategy` -- strategy and template method are alternatives for varying an algorithm; template method uses inheritance (compile-time), strategy uses composition (runtime). Choose based on whether variation is static or dynamic.
- `principle-solid` -- template method supports OCP (extend via subclass hooks without modifying the base); subclasses overriding non-hooks violates LSP
- `principle-composition-over-inheritance` -- when template method creates deep inheritance or combinatorial subclasses, composition via strategy is often better
- `pattern-factory-method` -- factory method is often a hook in a template method; if the factory is called from the constructor, the half-initialization risk applies

## Authoritative References

- [Erich Gamma et al., *Design Patterns: Elements of Reusable Object-Oriented Software* (1994), Template Method](https://www.oreilly.com/library/view/design-patterns-elements/0201633612/)
- [Robert C. Martin, *Agile Software Development* (2002), Chapter 22: Strategy and Template Method](https://www.oreilly.com/library/view/agile-software-development/0135974445/)
- [Joshua Bloch, *Effective Java* (3rd ed., 2018), Item 19: Design and document for inheritance or else prohibit it](https://www.oreilly.com/library/view/effective-java/9780134686097/)
- [Martin Fowler, *Refactoring* (2nd ed., 2018), Form Template Method](https://refactoring.com/catalog/formTemplateMethod.html)
