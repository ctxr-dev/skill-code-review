---
id: smell-inappropriate-intimacy
type: primary
depth_role: leaf
focus: "Detect classes that access each other's private or internal details, creating tight bidirectional coupling."
parents:
  - index.md
covers:
  - "Class accessing another class's private or internal fields via reflection, friend access, or package-private visibility"
  - Bidirectional dependency where class A imports class B and class B imports class A
  - "Class reaching into another's internal data structures (private collections, internal maps) by reference"
  - Two classes that always change together in commits because they share internal knowledge
  - Friend class or InternalsVisibleTo used to bypass encapsulation for convenience
  - "Class reading or writing another class's fields directly instead of going through public API"
  - Protected field access by a class in a different package or module, not a true subclass
  - Shared mutable state between two classes without a mediating abstraction
  - "Class depending on another class's internal representation (field names, internal enums, private constants)"
  - Test class accessing production class internals via reflection or friend access instead of public behavior
tags:
  - inappropriate-intimacy
  - coupler
  - encapsulation
  - coupling
  - bidirectional-dependency
  - clean-code
activation:
  file_globs:
    - "**/*.{java,kt,scala,cs,ts,js,py,rb,go,rs,swift,cpp,h,hpp,php}"
  keyword_matches:
    - private
    - internal
    - friend
    - package-private
    - protected
    - access
    - field
    - _private
    - __private
    - reflect
    - Reflection
  structural_signals:
    - direct_field_access_across_classes
    - bidirectional_import
    - reflection_accessing_private_members
source:
  origin: file
  path: smell-inappropriate-intimacy.md
  hash: "sha256:82f4c9abefbd401d4e8d9fca93af31b7679788a15cffa775bbf45e227d9b258d"
---
# Inappropriate Intimacy

## When This Activates

Activates when diffs introduce or modify code where two classes reach into each other's private or internal details, creating coupling that goes beyond their public contracts. Inappropriate Intimacy means two classes know too much about each other's implementation -- they share internal fields, bypass encapsulation with reflection or friend access, or depend bidirectionally. The core question is: if one class's internal representation changes, will the other class break even though only private details changed?

## Audit Surface

- [ ] No class uses reflection to access private fields or methods of another class
- [ ] No two classes import each other (no bidirectional/circular dependencies)
- [ ] No class accesses another class's field directly, bypassing the public API
- [ ] Friend declarations or InternalsVisibleTo are justified and minimally scoped
- [ ] No class holds a mutable reference to another class's internal collection
- [ ] Two classes sharing mutable state do so through a mediating abstraction, not direct reference
- [ ] Protected fields are accessed only by genuine subclasses, not unrelated classes in the same package
- [ ] No class depends on another's private constants, internal enums, or implementation-detail types
- [ ] Classes that frequently change together have an explicit shared interface, not implicit internal knowledge
- [ ] No code accesses Python-style private members (_method, __method) from outside the owning class
- [ ] Tests verify behavior through public API, not by reaching into production internals
- [ ] Diff does not introduce new direct field access that bypasses an existing public API

## Detailed Checks

### Reflection and Runtime Access to Internals
<!-- activation: keywords=["reflect", "Reflection", "getDeclaredField", "setAccessible", "getattr", "send", "method_missing", "invoke", "Field", "BindingFlags"] -->

- [ ] **Reflection to read private fields**: code uses `getDeclaredField().setAccessible(true)` (Java), `GetType().GetField(BindingFlags.NonPublic)` (.NET), or `getattr(obj, '_ClassName__field')` (Python) to read another class's private state -- this couples to the exact internal field name and type
- [ ] **Reflection to call private methods**: code invokes a private method via reflection because the public API does not expose the needed behavior -- the public API should be extended instead
- [ ] **Dynamic dispatch to internals**: Ruby `send(:private_method)` or Python `getattr` used to call methods the author knows are private -- naming conventions exist to be respected
- [ ] **Test-only reflection**: test code accesses internals via reflection instead of testing through public behavior -- fragile tests that break on internal refactoring
- [ ] **Serialization bypassing encapsulation**: custom serializer reads private fields directly via reflection instead of using a public serialization contract

### Bidirectional and Circular Dependencies
<!-- activation: keywords=["import", "require", "include", "using", "from", "circular", "cycle"] -->

- [ ] **Mutual imports**: class A imports class B and class B imports class A -- extract a shared interface or mediator to break the cycle
- [ ] **Circular module dependencies**: module X depends on module Y which depends on module X -- restructure into a dependency tree with a common abstraction
- [ ] **Callback-induced bidirectional coupling**: class A passes itself to class B which calls back methods on A -- use an interface or event to decouple
- [ ] **Hidden circular through transitive path**: A imports B, B imports C, C imports A -- check transitive dependency chains for cycles
- [ ] **Diff introduces the second direction**: file already depends on another file; the diff adds a reverse dependency, completing a cycle

### Direct Field Access Across Class Boundaries
<!-- activation: keywords=["field", ".", "->", "public", "internal", "package", "default", "access"] -->

- [ ] **Public field on a class with behavior**: a class exposes fields as public and another class reads/writes them directly -- use methods to preserve encapsulation and invariants
- [ ] **Package-private/internal field access**: two classes in the same package or assembly share fields via package-private or internal visibility for convenience -- this couples their internals
- [ ] **Struct field access in Go**: Go struct fields are exported (capitalized) and another package reads/writes them directly, bypassing any validation -- consider unexported fields with accessor methods
- [ ] **Python convention violation**: code outside a class accesses `_private` or `__mangled` attributes -- respect the underscore convention as an encapsulation boundary
- [ ] **Direct collection mutation**: class A gets a reference to class B's internal list/map and adds or removes elements, mutating B's state without B's knowledge -- return defensive copies or unmodifiable views

### Shared Mutable State Without Mediation
<!-- activation: keywords=["shared", "mutable", "reference", "list", "map", "dict", "array", "set", "collection", "state"] -->

- [ ] **Shared collection by reference**: two classes hold references to the same mutable collection and both read and write it -- changes by one are invisible side effects to the other
- [ ] **Global or singleton as coupling bridge**: two classes communicate by reading and writing fields on a shared singleton or global object -- the singleton is acting as a hidden message bus
- [ ] **Config object mutated by multiple owners**: a configuration object is passed to multiple classes, each of which modifies it -- one class's changes silently affect the other
- [ ] **Thread-unsafe shared state**: two classes share mutable state without synchronization -- race conditions in addition to intimacy
- [ ] **Event emitter coupling**: two classes communicate by emitting and listening to events on a shared emitter, relying on specific event payload structures that are not formalized in a type

### Friend and Visibility Bypass Declarations
<!-- activation: keywords=["friend", "InternalsVisibleTo", "@VisibleForTesting", "package-private", "protected", "sealed"] -->

- [ ] **C++ friend class**: `friend class Foo` grants full access to all private members -- verify the friend relationship is genuinely necessary and minimally scoped
- [ ] **InternalsVisibleTo in .NET**: assembly exposes internals to another assembly -- flag if the consuming assembly is not a test project
- [ ] **@VisibleForTesting annotations**: production code's visibility is widened solely for test access -- the test should use public API or the design should change
- [ ] **Package-private access exploited**: Java classes placed in the same package specifically to access package-private members of another class -- the package structure is driven by access needs rather than domain cohesion
- [ ] **Kotlin internal modifier abused**: internal visibility used to share implementation details across classes within a module when public API would be more appropriate

### Temporal Coupling and Co-Change Patterns
<!-- activation: keywords=["change", "update", "modify", "refactor", "fix", "together", "both"] -->

- [ ] **Always-together changes**: two classes appear in the same commit in 80%+ of their modifications -- they share knowledge that should be extracted into a shared abstraction
- [ ] **Parallel field additions**: adding a field to class A requires adding a corresponding field or update logic to class B -- the classes are coupled at the structural level
- [ ] **Synchronized enum/constant updates**: adding a value to an enum or constant set in one class requires updating a switch or map in another class -- centralize the mapping

## Common False Positives

- **Test helpers and fixtures**: test utility classes may legitimately access wider APIs of the system under test. Flag only when they use reflection or access genuinely private members.
- **Serialization/ORM frameworks**: frameworks like Jackson, Gson, or Hibernate use reflection to populate private fields by design. Do not flag framework-internal reflection. Flag only application code that mimics this pattern.
- **Inner/nested classes**: inner classes in Java/Kotlin/C# have legitimate access to the enclosing class's private members. This is a language feature, not inappropriate intimacy.
- **Module-internal types**: types within the same module that share internal visibility by design (e.g., Rust `pub(crate)`) are not inappropriate intimacy when the module boundary is the encapsulation unit.
- **Builder accessing the constructed class**: a builder that lives alongside its target class and accesses package-private constructors or fields is a standard pattern.
- **Companion objects**: Kotlin/Scala companion objects accessing private members of their associated class is a language-level feature, not a smell.

## Severity Guidance

| Finding | Severity |
|---|---|
| Reflection used in production code to access private fields of another class | Critical |
| Bidirectional dependency between two modules or packages creating a circular dependency | Critical |
| Class mutates another class's internal collection by reference without that class's knowledge | Critical |
| Two classes share mutable state without synchronization in a concurrent context | Critical |
| Direct access to package-private/internal fields for convenience (not genuine design need) | Important |
| Friend or InternalsVisibleTo declaration granting broad access to non-test consumers | Important |
| Two classes consistently co-change due to shared internal knowledge | Important |
| Python code accessing _private members from outside the owning class | Important |
| Test code using reflection to access production internals instead of public API | Minor |
| Inner/nested class accessing enclosing class private members (language feature) | Minor |
| @VisibleForTesting on a single method with clear test-only usage | Minor |

## See Also

- `principle-encapsulation` -- Inappropriate Intimacy is a direct violation of encapsulation; the fix is to restore information hiding between the coupled classes
- `principle-coupling-cohesion` -- intimate classes have maximum coupling and damaged cohesion; the knowledge should be consolidated or mediated
- `principle-law-of-demeter` -- reaching into another class's internals violates the Law of Demeter; interact only through immediate collaborators' public interfaces
- `smell-feature-envy` -- when intimacy flows in one direction (A knows B's internals but B does not know A), it is Feature Envy; bidirectional intimacy is worse
- `principle-separation-of-concerns` -- two intimate classes have merged concerns; extract the shared knowledge into its own type

## Authoritative References

- [Martin Fowler, *Refactoring* (2nd ed., 2018), Inappropriate Intimacy smell](https://refactoring.com/catalog/)
- [Martin Fowler, *Refactoring* (2nd ed., 2018), Move Function / Move Field](https://refactoring.com/catalog/moveFunction.html)
- [Robert C. Martin, *Clean Code* (2008), Chapter 6: Objects and Data Structures -- Law of Demeter](https://www.oreilly.com/library/view/clean-code-a/9780136083238/)
- [Robert C. Martin, *Agile Software Development* (2002), Chapter 8: Open-Closed Principle / Dependency Management](https://www.oreilly.com/library/view/agile-software-development/0135974445/)
- [Martin Fowler, *Refactoring* (2nd ed., 2018), Replace Subclass with Delegate](https://refactoring.com/catalog/replaceSubclassWithDelegate.html)
