---
id: smell-switch-statements
type: primary
depth_role: leaf
focus: "Detect switch/if-else chains that dispatch on type tags and should be replaced with polymorphism."
parents:
  - index.md
covers:
  - Switch or if-else chain dispatching on a type tag, discriminator, or enum to select behavior
  - Same type-based dispatch duplicated across multiple methods or classes
  - "Switch that must be extended every time a new variant is added (OCP violation)"
  - Switch mixing unrelated concerns in different case branches
  - "If-else chain testing instanceof/typeof/is to determine behavior"
  - Enum-based dispatch where polymorphism would eliminate the branching
  - Pattern match or when expression used as a type dispatcher rather than data destructuring
  - "Default/else branch that throws or returns error for unrecognized type (fragile extensibility)"
  - Switch on string literals representing types instead of using typed constants or enums
  - Deeply nested conditional chains that combine type dispatch with business logic
tags:
  - switch-statements
  - code-smell
  - oo-abusers
  - polymorphism
  - conditional
  - dispatch
  - refactoring
activation:
  file_globs:
    - "**/*.{java,kt,scala,cs,ts,js,py,rb,go,rs,swift,cpp,h,hpp,php}"
  keyword_matches:
    - switch
    - case
    - if
    - else if
    - elif
    - when
    - match
    - typeof
    - instanceof
    - is
    - type
    - kind
    - discriminator
  structural_signals:
    - switch_statement_on_type_field
    - if_else_chain_with_instanceof
    - enum_dispatch_across_methods
source:
  origin: file
  path: smell-switch-statements.md
  hash: "sha256:dfa7c85ddf84e64a563cf08752316cf884cb80ae92ad02254cd009c59c6ed5ac"
---
# Switch Statements Smell

## When This Activates

Activates when diffs introduce or extend switch statements, if-else chains, or pattern matches that dispatch on a type tag, discriminator field, enum, or runtime type check (instanceof, typeof, is). The smell is not about switches per se -- it targets switches that act as manual virtual dispatch tables, selecting behavior based on the kind of object rather than letting polymorphism handle it. The core signal is: would adding a new variant force you to edit existing switch/if-else blocks in multiple places?

## Audit Surface

- [ ] Switch/if-else dispatches on a type tag, kind field, discriminator, or enum to choose behavior
- [ ] The same type-based switch does not appear in multiple methods or classes (no duplicated dispatch)
- [ ] Adding a new variant does not require editing existing switch/if-else blocks in multiple locations
- [ ] Each case branch is short and focused; branches with 10+ lines of business logic are extracted
- [ ] Default/else branch handles unknown types gracefully, not just throwing on unrecognized values
- [ ] Runtime type checks (instanceof, typeof, is) are not used to select behavior that could be polymorphic
- [ ] Enum values that map 1:1 to behavior branches have been considered for replacement with polymorphism
- [ ] String literals or magic constants are not used as type discriminators
- [ ] Case branches handle related concerns; branches mixing I/O, computation, and validation are decomposed
- [ ] When a new case is added, all other switches dispatching on the same type are updated consistently
- [ ] Pattern matches test data structure, not class identity
- [ ] Conditional chains with 5+ branches are justified (not just growing organically)
- [ ] Type tag is not threaded through multiple layers solely to reach a dispatch point
- [ ] Method that consists entirely of a switch on a type field is a candidate for Replace Conditional with Polymorphism

## Detailed Checks

### Duplicated Type Dispatch
<!-- activation: keywords=["switch", "case", "if", "else", "type", "kind", "discriminator", "enum"] -->

- [ ] **Same dispatch in multiple methods**: the same set of type/enum values appears in switch blocks in 2+ methods -- when a new variant is added, every switch must be found and updated
- [ ] **Same dispatch across classes**: two or more classes contain switch/if-else on the same discriminator -- this is the strongest signal that polymorphism should replace the switches
- [ ] **Partial duplication**: some methods switch on a subset of the same type values -- inconsistent handling where some variants are missing in some locations
- [ ] **Dispatch in both caller and callee**: a method dispatches on type, then calls another method that dispatches on the same type -- redundant branching that polymorphism would eliminate
- [ ] **Growing case count across PRs**: the switch has been extended in recent commits, suggesting the variant set is actively growing and the switch will keep expanding

### Type Checks as Dispatch
<!-- activation: keywords=["instanceof", "typeof", "is", "as", "type_of", "isinstance", "isInstance", "dynamic_cast", "kind_of"] -->

- [ ] **instanceof/typeof chain**: sequential `if (x instanceof A) ... else if (x instanceof B)` is manual virtual dispatch -- the object already knows its type; let it dispatch via a method override
- [ ] **Downcast after type check**: code checks type then casts (`if (x is Foo) { ((Foo)x).doFoo() }`) -- this is a polymorphism opportunity where a common interface method would eliminate the cast
- [ ] **Type check in generic code**: a method accepting a base type or interface immediately checks the concrete type -- this defeats the purpose of the abstraction
- [ ] **Type check guarding feature**: `if (x instanceof PremiumUser)` to enable a feature -- use polymorphism or a capability interface instead of coupling to concrete types
- [ ] **Negated type check**: `if (!(x instanceof A))` used to exclude a variant -- fragile when new subtypes are added

### Switch Mixing Concerns
<!-- activation: keywords=["case", "switch", "if", "return", "throw", "log", "save", "send", "format", "render"] -->

- [ ] **Heterogeneous branch bodies**: one case branch does database access, another does HTTP calls, another does string formatting -- each branch should be a cohesive unit, not a grab-bag
- [ ] **Branch length asymmetry**: one case has 2 lines, another has 50 -- the large branch is likely doing too much and should be extracted into its own method or class
- [ ] **Side effects in some branches**: some case branches mutate state or perform I/O while others are pure calculations -- mixing effectful and pure logic in a single switch is hard to test
- [ ] **Fallthrough with logic**: languages allowing fallthrough (C, C++, Go) where a case falls through into another with non-trivial logic -- fragile and hard to reason about

### Switch on Enum Where Polymorphism Fits
<!-- activation: keywords=["enum", "Enum", "type", "status", "kind", "category", "variant", "sealed"] -->

- [ ] **Enum-to-behavior mapping**: every enum value maps to a distinct behavior in the switch -- the enum is acting as a type hierarchy; consider enum with methods (Java), sealed classes (Kotlin/Scala), or strategy objects
- [ ] **Enum switch in domain model**: domain entity uses an enum field to drive behavior in multiple methods -- the entity conflates data and dispatch; extract variant behavior into subclasses or strategies
- [ ] **Exhaustive match that grows**: language enforces exhaustive matching (Rust, Kotlin when) and every new enum variant forces changes in many match sites -- sealed hierarchy with polymorphic methods would localize changes
- [ ] **Enum with associated data**: switch extracts different fields from a context object depending on the enum value -- this is a discriminated union trying to be a class hierarchy

### Default Branch Fragility
<!-- activation: keywords=["default", "else", "throw", "error", "unreachable", "unknown", "unsupported", "IllegalArgument", "ValueError"] -->

- [ ] **Throwing default**: `default: throw new IllegalArgumentException("Unknown type")` means adding a new variant is a runtime error waiting to happen -- the compiler cannot help
- [ ] **Silent default**: `default: break` or `default: return null` silently ignores unknown types -- data loss or incorrect behavior when a new variant is added
- [ ] **Missing default**: switch with no default clause in a language that does not enforce exhaustiveness -- new enum values fall through silently
- [ ] **Default does actual work**: the default branch handles a real case instead of being a safety net -- if the handled case gets its own branch later, default behavior silently changes

## Common False Positives

- **Data mapping switches**: a switch that maps an enum to a string label, icon, or configuration value (no behavior branching) is data, not dispatch. Do not flag pure lookup tables.
- **Lexer/parser token dispatch**: compilers, interpreters, and parsers legitimately switch on token types. This is the textbook valid use of switch.
- **Event handling in UI frameworks**: switch on event type in a Redux reducer, Elm update function, or SwiftUI view builder is idiomatic to the architecture.
- **Serialization/deserialization**: switches mapping wire format tags to types during deserialization (protobuf, JSON discriminators) are infrastructure, not business logic dispatch.
- **Exhaustive pattern matching on ADTs**: Rust `match`, Scala/Kotlin `when` on sealed hierarchies where the compiler enforces exhaustiveness is the idiomatic approach. Flag only if the same match is duplicated across many sites.
- **Factory/registry construction**: a single switch that creates instances by type (factory) is acceptable if it is the only dispatch point for that type -- the smell is duplication, not the switch itself.
- **Command dispatch in CLI tools**: switching on a command name to invoke the right handler is standard CLI architecture.

## Severity Guidance

| Finding | Severity |
|---|---|
| Same type dispatch duplicated in 4+ locations across the codebase | high |
| instanceof/typeof chain on a base type that has a clear polymorphic interface | high |
| Adding a new variant requires editing 3+ switch blocks in different files | high |
| Switch mixing I/O, computation, and state mutation in different branches | medium |
| Single switch on enum with 6+ branches and growing, but not yet duplicated | medium |
| Default branch throws on unknown type with no compile-time exhaustiveness | medium |
| Enum used as manual vtable in 2 methods of the same class | medium |
| Type tag threaded through layers solely for dispatch at the end | medium |
| Single switch in a factory method (only dispatch point for that type) | low |
| Switch with 3-4 stable branches that have not changed in months | low |
| Pattern match on sealed type with compiler-enforced exhaustiveness | low |

## See Also

- `principle-solid` -- OCP is violated when every new variant requires editing existing switches; LSP may be violated when type checks bypass polymorphism
- `pattern-strategy` -- strategy pattern is the primary replacement for type-dispatching switches; inject behavior instead of branching on type
- `pattern-state` -- state pattern replaces switches on state/status fields with polymorphic state objects
- `principle-composition-over-inheritance` -- polymorphic dispatch via composition (strategy/state) is often preferable to inheritance hierarchies
- `smell-primitive-obsession` -- type tags encoded as strings or integers are primitive obsession enabling the switch smell

## Authoritative References

- [Martin Fowler, *Refactoring* (2nd ed., 2018), Replace Conditional with Polymorphism](https://refactoring.com/catalog/replaceConditionalWithPolymorphism.html)
- [Martin Fowler, *Refactoring* (2nd ed., 2018), Replace Type Code with Subclasses](https://refactoring.com/catalog/replaceTypeCodeWithSubclasses.html)
- [Robert C. Martin, *Clean Code* (2008), Chapter 3: Functions -- switch statements](https://www.oreilly.com/library/view/clean-code/9780136083238/)
- [Joshua Kerievsky, *Refactoring to Patterns* (2004), Replace Conditional Logic with Strategy](https://www.oreilly.com/library/view/refactoring-to-patterns/0321213351/)
- [Martin Fowler, *Refactoring* (1st ed., 1999), Switch Statements smell](https://refactoring.com/)
