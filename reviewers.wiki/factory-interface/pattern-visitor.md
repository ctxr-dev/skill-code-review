---
id: pattern-visitor
type: primary
depth_role: leaf
focus: Detect misuse, over-application, and absence of the Visitor pattern in element-type-dispatch code.
parents:
  - index.md
covers:
  - "Visitor that must change whenever a new element type is added (fragile visitor)"
  - "Element's accept() method that performs work beyond dispatching to the visitor"
  - Visitor with accumulated mutable state not reset between traversals
  - "Missing visitor where instanceof/type-switch chains handle element-type-specific logic"
  - Visitor applied to unstable element hierarchies where new types are added frequently
  - Visitor with missing visit methods for element subtypes, causing silent default handling
  - "Double dispatch broken by incorrect accept() delegation in composite hierarchies"
  - Visitor return values forced through side effects because the interface uses void
  - Visitor coupled to element internals, requiring element to expose state via getters
  - Over-applied visitor where polymorphic methods on the elements would suffice
tags:
  - visitor
  - behavioural-pattern
  - design-patterns
  - double-dispatch
  - traversal
  - ast
  - expression
  - element
activation:
  file_globs:
    - "**/*.{java,kt,scala,cs,ts,js,py,rb,go,rs,swift,cpp,h,hpp,php}"
  keyword_matches:
    - Visitor
    - visitor
    - accept
    - visit
    - visitX
    - double dispatch
    - traverse
    - walk
    - element
    - AST
    - node
    - expression
  structural_signals:
    - accept_method_calling_visitor_visit
    - visitor_interface_with_multiple_visit_methods
    - instanceof_chain_on_element_types
source:
  origin: file
  path: pattern-visitor.md
  hash: "sha256:32bbcad16175d018ff195798ab0da98da228c2f1375624c67130dd13f0065338"
---
# Visitor Pattern

## When This Activates

Activates when diffs introduce visitor interfaces with `visit(ElementType)` methods, add `accept(Visitor)` methods to element hierarchies, implement double-dispatch patterns, or add type-switch/instanceof chains that dispatch behavior based on element type. The Visitor pattern separates algorithms from the object structure they operate on, but it creates tight coupling between the visitor interface and the element hierarchy -- adding a new element type forces changes to every visitor. This makes the pattern a poor fit for unstable hierarchies and a strong fit only when the element types are stable but operations change frequently.

## Audit Surface

- [ ] Element hierarchy is stable (types rarely added) -- the visitor pattern is appropriate
- [ ] Adding a new element type does not require modifying 10+ concrete visitor implementations
- [ ] Element.accept() contains only `visitor.visit(this)` -- no computation, filtering, or conditional logic
- [ ] Visitor mutable state (accumulators, builders) is reset or re-created between traversals
- [ ] Type-switch/instanceof chains on element types are refactored to visitor dispatch
- [ ] Every element subtype has a corresponding visitX() method in the visitor interface
- [ ] Composite elements propagate accept() to children for correct deep traversal
- [ ] Visitor return values are handled cleanly (generic return type, not side-effect fields)
- [ ] Visitor does not depend on element internals beyond the element's public interface
- [ ] Visitor pattern is not used where a simple polymorphic method on the elements would suffice
- [ ] Traversal order is documented and tested when operations depend on visit sequence
- [ ] Default visit methods fail loudly or are explicitly documented for unrecognized element types
- [ ] Composite and visitor depth semantics are consistent and documented
- [ ] Visitor interface size is manageable (under 15 visitX methods)
- [ ] Concrete visitors implement all visitX methods or delegate to a well-defined default

## Detailed Checks

### Fragile Visitor (Hierarchy Instability)
<!-- activation: keywords=["Visitor", "visitor", "visit", "accept", "add", "new", "type", "element", "extend", "interface"] -->

- [ ] **Forced modification cascade**: adding a new element subclass requires adding a visitX() method to the visitor interface and implementing it in every concrete visitor -- if there are 10+ visitors, the maintenance cost is prohibitive
- [ ] **Unstable element hierarchy**: the element hierarchy changes frequently (new node types added monthly or more) -- visitor is the wrong pattern; polymorphic methods on the elements or pattern matching would be more maintainable
- [ ] **Sealed hierarchy check**: if the language supports sealed classes/interfaces (Kotlin sealed, Java sealed, TypeScript discriminated unions), the visitor can be made exhaustive at compile time -- verify that this is enforced
- [ ] **Missing visitX methods**: a new element type was added but some visitors were not updated -- they fall through to a default handler or throw at runtime instead of failing at compile time
- [ ] **Visitor interface explosion**: visitor interface has 15+ methods, one per element type -- consider grouping related elements or splitting the hierarchy
- [ ] **Workaround via instanceof in visitor**: a visitX method uses instanceof to further distinguish element subtypes -- this defeats the purpose of double dispatch

### Broken accept() Method
<!-- activation: keywords=["accept", "visit", "dispatch", "this", "call", "delegate", "override"] -->

- [ ] **Logic in accept()**: accept() contains computation, filtering, logging, or conditional logic beyond `visitor.visit(this)` -- this violates the pattern; accept() should only dispatch
- [ ] **Missing accept() override**: a subclass inherits accept() from a parent class, causing `visitor.visit(this)` to dispatch to the parent type's visitX method instead of the subclass's -- double dispatch is broken
- [ ] **Composite accept() does not traverse children**: a composite element's accept() calls `visitor.visit(this)` but does not iterate over children, preventing deep traversal -- decide whether traversal is the element's or the visitor's responsibility and be consistent
- [ ] **accept() returns void when visitor needs a result**: accept() is void but the visitor computes a result that must be threaded through mutable state -- consider a generic `accept<T>(Visitor<T>)` or parameterized visitor
- [ ] **Conditional dispatch in accept()**: accept() checks a flag or element property to decide which visitor method to call -- this replaces double dispatch with manual dispatch, defeating the pattern

### Visitor Mutable State
<!-- activation: keywords=["state", "result", "accumulator", "builder", "collect", "aggregate", "field", "mutable", "reset", "clear"] -->

- [ ] **State carried between traversals**: visitor accumulates results (list of errors, sum of values, built string) in instance fields that are not reset between traversal calls -- reusing the visitor produces incorrect results
- [ ] **Thread-unsafe accumulator**: visitor's mutable state is accessed from multiple threads during concurrent traversal -- use thread-local state or create a new visitor per traversal
- [ ] **Result via side effect**: visitor interface uses void visit methods, forcing concrete visitors to store results in mutable fields -- consider a generic return type or a separate result holder
- [ ] **Partial result on exception**: if the visitor throws mid-traversal, accumulated state is partial and invalid -- callers may inadvertently use the partial result
- [ ] **Visitor as singleton**: a single visitor instance is shared across the application, accumulating state from all traversals -- create a new visitor per traversal or reset state explicitly

### Missing Visitor (Type-Switch Chains)
<!-- activation: keywords=["instanceof", "is", "typeof", "switch", "case", "type", "cast", "as", "when", "match"] -->

- [ ] **instanceof chain**: code uses `if (node instanceof TypeA) ... else if (node instanceof TypeB) ...` to dispatch behavior -- a visitor would make this dispatch extensible and type-safe
- [ ] **Switch on type discriminator**: code switches on an enum or string type tag to select behavior per element type -- a visitor with double dispatch replaces this with polymorphism
- [ ] **Duplicated type dispatch**: the same instanceof/switch-on-type pattern appears in multiple locations with different operations -- multiple visitors would eliminate the duplication
- [ ] **Missed type in dispatch**: instanceof chain or switch does not handle all element types -- a visitor interface with a visitX per type ensures compile-time completeness (in statically typed languages)
- [ ] **Downcast-heavy code**: code frequently casts elements to concrete types to access type-specific methods -- a visitor visit(ConcreteElement) receives the concrete type directly, eliminating casts

### Wrong-Fit Visitor
<!-- activation: keywords=["Visitor", "visitor", "simple", "one", "single", "polymorphic", "method", "virtual", "override"] -->

- [ ] **Single operation on stable hierarchy**: there is only one operation that varies across element types -- a polymorphic method on the element interface is simpler and does not require the visitor machinery
- [ ] **Operations change rarely**: operations on the hierarchy are added infrequently -- the benefit of separating operations from elements (the visitor's key advantage) does not justify the coupling cost
- [ ] **Dynamic element types**: elements are loaded from plugins, user configuration, or runtime code generation -- new types cannot be anticipated by the visitor interface, making the pattern unworkable
- [ ] **Functional pattern matching**: the language has built-in pattern matching (Scala match, Kotlin when, Rust match) that provides exhaustive type dispatch without visitor boilerplate -- prefer language features over the pattern
- [ ] **Visitor adds no new operations**: only one concrete visitor exists and no others are planned -- the indirection of accept/visit adds complexity without the extensibility payoff

### Double Dispatch Correctness
<!-- activation: keywords=["dispatch", "overload", "override", "polymorphic", "dynamic", "static", "resolve", "call", "bind"] -->

- [ ] **Single dispatch masquerading as double**: visitor uses method overloading (same method name, different parameter types) but the language resolves overloads statically -- the correct element-type visitX method is not called at runtime; use distinctly named methods (`visitAdd`, `visitMultiply`)
- [ ] **Missing override in element subclass**: element subclass does not override accept(), inheriting the parent's version -- `visitor.visit(this)` dispatches to the parent type's overload, visiting the wrong type
- [ ] **Generic visitor with type erasure**: in Java, `Visitor<T>` methods using generics lose type information at runtime -- the correct visitX method may not be selected

## Common False Positives

- **AST visitor in compiler/parser frameworks**: ANTLR, Roslyn, Babel, and similar tools generate visitor interfaces for their ASTs. These are canonical visitor usage -- do not flag the framework-generated visitors. Flag only if user-written visitors on these ASTs have state management or traversal issues.
- **Pattern matching in functional languages**: Scala `match`, Haskell case, Rust `match`, and Kotlin `when` on sealed hierarchies achieve exhaustive type dispatch natively. These are not "missing visitors" -- they are the language-idiomatic alternative.
- **Serialization visitors (Jackson, Gson, serde)**: serialization frameworks visit object graphs to produce output. These are infrastructure visitors, not application-level pattern misuse.
- **DOM/XML/JSON traversal**: SAX handlers, DOM tree walkers, and JSON stream processors use visitor-like patterns. These are framework conventions, not custom visitor pattern instances.
- **Expression evaluators in scripting engines**: evaluators that dispatch on expression node type are textbook visitor usage. Flag only structural issues, not the pattern choice.

## Severity Guidance

| Finding | Severity |
|---|---|
| accept() override missing in subclass, breaking double dispatch | high |
| Visitor mutable state not reset between traversals, producing incorrect results | high |
| instanceof chain on element types duplicated in 3+ locations without a visitor | high |
| New element type added but visitor interface and concrete visitors not updated | medium |
| accept() contains computation beyond visitor.visit(this) | medium |
| Visitor applied to unstable hierarchy where types change frequently | medium |
| Composite accept() does not propagate to children, breaking deep traversal | medium |
| Default visit method silently does nothing for unrecognized types | medium |
| Single operation on stable hierarchy using full visitor machinery | low |
| Visitor forces void return, requiring mutable result fields | low |
| Visitor interface has 15+ methods (consider grouping or splitting) | low |

## See Also

- `pattern-composite` -- visitor is often combined with composite for tree traversal; ensure composite accept() propagates to children consistently
- `pattern-strategy` -- strategies vary a single algorithm; visitors vary multiple operations across a type hierarchy. If the "visitor" handles only one operation, it may be a strategy.
- `principle-solid` -- fragile visitors violate OCP (every new type forces visitor changes); fat visitor interfaces violate ISP
- `principle-separation-of-concerns` -- visitor separates operations from element structure; logic in accept() violates this separation
- `principle-encapsulation` -- visitor that accesses element internals through getters weakens encapsulation

## Authoritative References

- [Erich Gamma et al., *Design Patterns: Elements of Reusable Object-Oriented Software* (1994), Visitor](https://www.oreilly.com/library/view/design-patterns-elements/0201633612/)
- [Robert C. Martin, *Agile Software Development* (2002), Chapter 35: Visitor](https://www.oreilly.com/library/view/agile-software-development/0135974445/)
- [Eric Freeman et al., *Head First Design Patterns* (2nd ed., 2020), Visitor Pattern](https://www.oreilly.com/library/view/head-first-design/9781492077992/)
- [Martin Fowler, "Replace Conditional with Polymorphism" refactoring](https://refactoring.com/catalog/replaceConditionalWithPolymorphism.html)
