---
id: smell-parallel-inheritance-hierarchies
type: primary
depth_role: leaf
focus: Detect mirrored class hierarchies where adding a subclass in one tree forces adding a corresponding subclass in another
parents:
  - index.md
covers:
  - "Two class hierarchies that mirror each other one-to-one (every subclass in A has a counterpart in B)"
  - Adding a class in one hierarchy forces adding a class in the other hierarchy
  - Factory classes mirroring domain hierarchies one-to-one
  - Serializer or deserializer hierarchies duplicating domain class trees
  - Validator hierarchies that parallel entity hierarchies
  - Test fixture classes mirroring production hierarchies instead of using composition
  - Handler or processor hierarchies paralleling command or event hierarchies
  - Mapper hierarchies that duplicate source and target type trees
  - Builder hierarchies that mirror the objects they construct
  - "Naming patterns that reveal parallel trees (e.g., XxxHandler for every XxxCommand)"
tags:
  - parallel-inheritance
  - code-smell
  - change-preventer
  - inheritance
  - hierarchy
  - refactoring
activation:
  file_globs:
    - "**/*.{java,kt,scala,cs,ts,js,py,rb,go,rs,swift,cpp,h,hpp}"
  keyword_matches:
    - extends
    - inherits
    - class
    - Factory
    - Serializer
    - Validator
    - Handler
    - Mapper
    - Builder
    - abstract
    - hierarchy
  structural_signals:
    - class_inheritance
    - new_class_definition
    - factory_pattern
source:
  origin: file
  path: smell-parallel-inheritance-hierarchies.md
  hash: "sha256:4f913b2b010330eb42ae7dbd6ac9863c619a3132cc25f6aa18e7ca15d0499571"
---
# Parallel Inheritance Hierarchies Reviewer

## When This Activates

Activates when diffs introduce new classes that participate in inheritance hierarchies, especially when a new subclass in one tree is accompanied by a new class in another tree. Parallel inheritance hierarchies are a special case of shotgun surgery: every time you add a subclass to one hierarchy, you must add a corresponding class to one or more parallel hierarchies. This reviewer detects the structural pattern of mirrored trees that force coupled additions.

## Audit Surface

- [ ] New subclass added in this diff with a corresponding new class in a parallel hierarchy
- [ ] Two abstract base classes whose concrete subclasses have matching names or suffixes
- [ ] Factory class hierarchy mirroring a product class hierarchy one-to-one
- [ ] Serializer/deserializer class for every domain entity following the same inheritance structure
- [ ] Validator class for every model class, both sharing the same inheritance tree shape
- [ ] Test fixture hierarchy mirroring production class hierarchy instead of composing test helpers
- [ ] Handler/processor per command/event type, both organized in parallel inheritance trees
- [ ] Mapper class per entity pair, structured as a parallel hierarchy to the entities
- [ ] Builder class for every domain object, inheriting from a base builder that mirrors the domain base
- [ ] Naming convention that mechanically derives one class name from another (e.g., Xxx -> XxxFactory, XxxSerializer, XxxValidator)
- [ ] Diff adding files in two directories with matching names or numeric parity
- [ ] Abstract method in base class A that returns a type from hierarchy B, enforcing the parallel structure

## Detailed Checks

### Mirrored Hierarchy Detection
<!-- activation: keywords=["extends", "inherits", "abstract", "class", "interface", "sealed", "open class"] -->

- [ ] Scan the diff for two or more new classes that follow a naming pattern suggesting parallel trees (e.g., `CircleRenderer` added alongside `Circle`, `SquareRenderer` alongside `Square`)
- [ ] Check whether the codebase already has a hierarchy A with N subclasses and a hierarchy B with the same N subclasses, where each A-subclass has a naming counterpart in B
- [ ] Flag abstract base classes that declare a method returning or accepting a type from another abstract base class -- this structurally couples the two hierarchies
- [ ] Identify "create pair" patterns: if project conventions or documentation instruct developers to create a class in B whenever they create one in A, the hierarchies are parallel by design
- [ ] Look for generic type parameters that bind two hierarchies together (e.g., `Processor<T extends Command>` where every `Command` subclass has a `Processor` subclass)

### Factory and Creator Hierarchies
<!-- activation: keywords=["Factory", "Creator", "Provider", "Builder", "create", "build", "make", "new"] -->

- [ ] Flag factory class hierarchies that mirror product class hierarchies one-to-one -- if `CircleFactory extends ShapeFactory` only to return `new Circle()`, the factory hierarchy is unnecessary
- [ ] Check whether the Abstract Factory pattern is justified by genuine family-of-products requirements, or whether a simple factory method or registry would eliminate the parallel tree
- [ ] Identify builder hierarchies that mirror domain objects -- a generic builder or fluent API often eliminates the need for parallel builder subclasses
- [ ] Look for provider/creator classes that differ only in which concrete type they instantiate -- a class-to-factory map or DI container registration can replace the parallel hierarchy
- [ ] Verify that factory methods are not simply forwarding constructor calls with no additional logic -- this is boilerplate that forces parallel growth

### Serializer, Validator, and Mapper Hierarchies
<!-- activation: keywords=["Serializer", "Deserializer", "Validator", "Mapper", "Converter", "Transformer", "Adapter", "Formatter"] -->

- [ ] Flag serializer hierarchies where each subclass handles exactly one domain type and shares no logic with siblings -- a generic serializer with type-specific configuration is usually simpler
- [ ] Check for validator class trees that parallel entity trees -- validation rules can often be expressed as data (annotations, schemas, rule objects) rather than parallel class hierarchies
- [ ] Identify mapper/converter hierarchies where each mapper converts one source type to one target type -- generic mapping frameworks (AutoMapper, MapStruct) or convention-based approaches can eliminate these
- [ ] Look for adapter hierarchies that wrap each domain type in a corresponding adapter subclass -- consider whether a single generic adapter with strategy injection would suffice
- [ ] Verify whether the parallel hierarchy provides genuine polymorphic behavior or merely dispatches to type-specific logic that could be collocated with the domain type itself

### Handler and Processor Hierarchies
<!-- activation: keywords=["Handler", "Processor", "Listener", "Observer", "Visitor", "Executor", "Worker", "Consumer"] -->

- [ ] Flag command/handler pairs organized as parallel inheritance trees -- if `CreateOrderHandler extends CommandHandler` exists only to handle `CreateOrderCommand extends Command`, consider a command dispatcher with registered handlers instead
- [ ] Check for event/listener pairs where adding a new event type forces adding a new listener subclass -- an event bus with lambda or functional handlers can break this coupling
- [ ] Identify visitor implementations where the visitor hierarchy mirrors the element hierarchy -- this is an inherent limitation of the Visitor pattern; consider alternatives (pattern matching, polymorphic dispatch) when the element hierarchy changes frequently
- [ ] Look for processor hierarchies where each processor subclass handles one message type -- a routing table or type-based dispatch map can replace the parallel tree
- [ ] Verify that handler base classes provide genuine shared behavior (transaction management, error handling) rather than serving only as a marker type

### Test Fixture Mirroring
<!-- activation: keywords=["Test", "Spec", "Fixture", "Mock", "Stub", "Fake", "test", "spec"] -->

- [ ] Flag test fixture class hierarchies that mirror production hierarchies (e.g., `CircleTest extends ShapeTest` paralleling `Circle extends Shape`) -- prefer composed test helpers over inherited test fixtures
- [ ] Check for test data builders that form a parallel hierarchy to domain objects -- a single generic builder or factory function with overrides is more maintainable
- [ ] Identify mock/stub hierarchies that duplicate production type trees -- mock frameworks or generic test doubles can eliminate these
- [ ] Look for test base classes that accumulate setup logic for a growing production hierarchy -- each new production subclass forces a new test subclass, compounding the parallel growth

## Common False Positives

- **Visitor pattern by design**: the Visitor pattern inherently creates parallel structures (elements and visitors). This is an accepted trade-off when the element hierarchy is stable and new operations are frequent. Flag only when the element hierarchy is volatile.
- **Type-safe Abstract Factory**: when genuine product families exist (e.g., cross-platform UI widgets), parallel factory and product hierarchies are the correct pattern. Flag only when the "families" are artificial.
- **Code generation**: generated serializers, mappers, or protocol handlers (protobuf, GraphQL codegen, OpenAPI) create parallel structures by design. The solution is to improve the generator, not to restructure generated code.
- **Language limitations**: in languages without generics, sum types, or first-class functions (older Java, C), parallel hierarchies may be the only available dispatch mechanism.
- **Small, stable hierarchies**: two parallel trees with 2-3 leaves each that have not grown in years are a low-severity concern -- the cost of refactoring may exceed the maintenance burden.
- **Sealed/exhaustive type handling**: in languages with sealed types (Kotlin, Rust, Scala), the compiler enforces that every match handles all variants. Having a handler per variant is intentional exhaustiveness, not a parallel hierarchy smell.

## Severity Guidance

| Finding | Severity |
|---|---|
| Two growing hierarchies with 5+ parallel subclasses each | Important |
| Adding one subclass in this diff forces adding a corresponding class in another hierarchy | Important |
| Factory hierarchy that mirrors domain hierarchy with no additional factory logic | Important |
| Serializer/validator hierarchy paralleling domain types where a generic approach is feasible | Important |
| Handler hierarchy paralleling command types with no shared handler logic | Minor |
| Test fixture hierarchy mirroring production hierarchy (2-3 levels) | Minor |
| Two parallel trees with only 2 leaves each, stable for 6+ months | Minor |
| Generated parallel code (protobuf, codegen) | Minor |
| Visitor pattern with stable element hierarchy (fewer than 5 elements) | Minor |

## See Also

- `smell-shotgun-surgery` -- parallel inheritance hierarchies are a structural cause of shotgun surgery: adding a variant forces edits in multiple hierarchies
- `smell-divergent-change` -- the mirrored hierarchies may individually suffer from divergent change if they also bundle unrelated concerns
- `principle-composition-over-inheritance` -- replacing parallel inheritance with composition (strategy, delegation, registry) is the primary remediation
- `principle-solid` -- the Open-Closed Principle is violated when adding a new variant requires modifying existing hierarchies; Interface Segregation guides right-sizing the parallel interfaces
- `principle-coupling-cohesion` -- parallel hierarchies create tight structural coupling between the two trees

## Authoritative References

- [Martin Fowler, *Refactoring* (2nd ed., 2018), "Parallel Inheritance Hierarchies"](https://refactoring.com/catalog/)
- [Gang of Four, *Design Patterns* (1994), Abstract Factory and Visitor -- patterns that intentionally create parallel structures](https://www.oreilly.com/library/view/design-patterns-elements/0201633612/)
- [Joshua Kerievsky, *Refactoring to Patterns* (2004), "Replace Conditional Dispatcher with Command" -- eliminating parallel handler trees](https://www.oreilly.com/library/view/refactoring-to-patterns/0321213351/)
- [Robert C. Martin, *Agile Software Development* (2003), "The Open-Closed Principle" -- designing for extension without parallel modification](https://www.oreilly.com/library/view/agile-software-development/0135974445/)
- [Sandi Metz, *Practical Object-Oriented Design* (2nd ed., 2018), Chapter 6: Acquiring Behavior Through Inheritance -- when hierarchy is appropriate vs. harmful](https://www.poodr.com/)
