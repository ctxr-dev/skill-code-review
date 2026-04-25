---
id: pattern-builder
type: primary
depth_role: leaf
focus: Detect misuse, over-application, and absence of the Builder pattern in step-by-step object construction.
parents:
  - index.md
covers:
  - "Builders for trivially simple objects with fewer than 4 fields (overkill)"
  - "Builder missing validation in build() allowing invalid objects"
  - Mutable builder escaping its scope and being reused unsafely
  - Builder that does not enforce required fields at compile time or runtime
  - Telescoping constructor anti-pattern that should use a Builder
  - Fluent API method chain with inconsistent return types
  - Builder producing mutable objects that should be immutable
  - Builder with no clear separation between optional and required parameters
  - "Builder reuse after build() producing shared mutable state between products"
  - Director class overhead when a simple builder with defaults suffices
  - Builder duplicating validation logic already present in the product constructor
tags:
  - builder
  - creational-pattern
  - design-patterns
  - fluent-api
  - object-construction
  - immutability
activation:
  file_globs:
    - "**/*.{java,kt,scala,cs,ts,js,py,rb,go,rs,swift,cpp,h,hpp,php}"
  keyword_matches:
    - Builder
    - build
    - builder
    - fluent
    - chain
    - with
    - set
    - add
    - step
    - toBuilder
  structural_signals:
    - method_returning_this
    - inner_class_named_builder
    - method_chaining
source:
  origin: file
  path: pattern-builder.md
  hash: "sha256:490358240ce12cca7fdba05d57b2d620ecfe91ec5f694fad5b1faf64e8f0973d"
---
# Builder Pattern

## When This Activates

Activates when diffs introduce or modify Builder classes, add fluent method chains (methods returning `this`/`self`), contain constructors with 4+ parameters, or add `build()` / `toBuilder()` methods. The Builder pattern is both frequently over-applied (wrapping trivial objects in builder ceremony) and under-applied (telescoping constructors that make call sites unreadable and error-prone).

## Audit Surface

- [ ] Builder is justified: the product has 4+ fields, or requires complex assembly, or has many optional parameters
- [ ] `build()` validates all invariants before returning the product -- no invalid objects escape
- [ ] Required fields are enforced: `build()` fails fast if mandatory parameters are unset
- [ ] Builder instances are local and short-lived -- not stored in fields, collections, or passed across threads
- [ ] Fluent methods consistently return the builder type for unbroken chaining
- [ ] Product created by the builder is immutable (or mutability is explicitly justified)
- [ ] Builder is not reused after `build()` without explicit reset; no shared mutable state between products
- [ ] No telescoping constructors exist where a builder would improve readability and safety
- [ ] Optional vs. required parameters are clearly distinguished in the builder's API
- [ ] Cross-field validation catches invalid combinations (e.g., start date after end date)
- [ ] Builder does not silently apply defaults for fields that should be explicitly set
- [ ] Method call order is either enforced (step builder) or irrelevant (standard builder)
- [ ] `build()` does not catch and swallow exceptions -- construction failures must be visible
- [ ] Builder is co-located with or has appropriate access to the product (not reaching into private state from another package)
- [ ] Director class, if present, is justified by multiple build sequences -- not just wrapping a single build flow

## Detailed Checks

### Over-Applied Builder (Patternitis)
<!-- activation: keywords=["Builder", "builder", "build", "class"] -->

- [ ] **Trivial object wrapping**: builder exists for a class with 1-3 fields that has no optional parameters and no invariants -- a constructor or static factory method is simpler and clearer
- [ ] **Isomorphic builder**: every builder setter corresponds 1:1 to a constructor parameter with no defaults, no validation, no optionality -- the builder adds indirection without value
- [ ] **Single call site**: builder is used in exactly one place -- inline construction would be clearer and the builder class is dead weight
- [ ] **Language features ignored**: the language already provides named/default parameters (Kotlin, Python, Scala, C#) or record builders (Java records with Lombok), making a manual builder redundant
- [ ] **Director class overhead**: a Director class encapsulates a single `build()` sequence that could be a static factory method
- [ ] **Builder for a builder**: nested builder pattern where the outer builder configures another builder -- flattening would simplify the API

### Missing Validation in build()
<!-- activation: keywords=["build", "create", "construct", "validate", "require", "check", "assert", "null"] -->

- [ ] **No null/empty checks**: `build()` returns the product without verifying that required fields are non-null or non-empty
- [ ] **Cross-field invariants unchecked**: fields that must be consistent (min < max, start < end, port in valid range) are not validated before construction
- [ ] **Deferred validation**: validation happens in the product's business methods instead of at construction time -- invalid objects can exist and propagate before the error surfaces
- [ ] **Silent defaults for required fields**: `build()` applies a default value for a field that the caller must explicitly set, masking configuration errors
- [ ] **Exception swallowing**: `build()` wraps validation exceptions in a try/catch and returns null or a default object -- fail fast instead
- [ ] **Partial object escape**: builder can produce a product where some required fields are set and others are not, because validation only checks individual fields, not completeness

### Builder Scope and Reuse Issues
<!-- activation: keywords=["builder", "reuse", "shared", "field", "member", "static", "thread", "concurrent"] -->

- [ ] **Builder stored in field**: builder assigned to an instance or static field, allowing it to be accessed from multiple methods or threads -- builders should be local variables with short lifetimes
- [ ] **Post-build reuse**: builder used to call `build()` and then continued to be modified and built again -- the two products may share mutable state if the builder does not copy
- [ ] **Thread-unsafe builder**: builder passed between threads without synchronization; mutable builder state is not thread-safe by design
- [ ] **Builder as configuration object**: builder stored and passed around as a "settings" holder without ever calling build() -- misuses the pattern as a mutable DTO
- [ ] **Leaked partial state**: builder passed to a method that sets some fields, then returned to the caller who sets more -- the intermediate state may be inconsistent

### Telescoping Constructor Detection
<!-- activation: keywords=["constructor", "new", "init", "this(", "super(", "def __init__"] -->

- [ ] **Same-type parameter adjacency**: constructor has 3+ parameters of the same type (e.g., `String, String, String`) making call-site argument ordering error-prone
- [ ] **Constructor overload chain**: class has 3+ constructors that delegate to each other, adding one parameter at a time -- classic telescoping pattern
- [ ] **Boolean parameter proliferation**: constructor accepts 2+ boolean parameters whose meaning is invisible at the call site
- [ ] **Null placeholders**: callers pass `null` for optional parameters to reach the required ones -- `new Service(config, null, null, true)` is a readability hazard
- [ ] **Parameter count threshold**: constructor with 5+ parameters where at least 2 are optional -- strong candidate for builder

### Fluent API Consistency
<!-- activation: keywords=["return this", "return self", "with", "set", "add", "chain", "fluent"] -->

- [ ] **Broken chain**: fluent method returns `void` instead of the builder, forcing callers to break the chain with intermediate variables
- [ ] **Incorrect return type**: method in a builder subclass returns the parent builder type, losing access to subclass-specific methods (covariant return issue)
- [ ] **Mixed mutability semantics**: some methods mutate the builder in place while others return a new builder instance -- inconsistent API contract
- [ ] **Terminal method ambiguity**: multiple methods could be interpreted as terminal (finish the build) -- only `build()` should be terminal; other methods should return the builder
- [ ] **Generic type erasure**: generic builder `Builder<T>` loses type information in chained calls, requiring casts or `@SuppressWarnings`

### Required vs. Optional Field Enforcement
<!-- activation: keywords=["required", "optional", "mandatory", "default", "nullable", "step", "stage"] -->

- [ ] **All-optional illusion**: every field has a default, but some fields semantically require explicit values (e.g., an ID generator that defaults to random but should be configured per environment)
- [ ] **Step builder explosion**: type-safe step builder (staged builder) creates one interface per required field, producing 10+ interfaces for a complex object -- consider runtime validation instead
- [ ] **Required field in setter**: required field set via `withX()` instead of being a constructor parameter of the builder itself
- [ ] **Missing `toBuilder()`**: immutable product has no way to create a modified copy; callers manually extract fields and rebuild, violating DRY and risking missed fields
- [ ] **Overloaded defaults**: default values are set in the builder and also in the product constructor, with different values -- which one wins?

## Common False Positives

- **Language-idiomatic builders**: Kotlin `apply {}` blocks, Dart cascades (`..`), Rust builder crates (`derive_builder`), and Lombok `@Builder` are language-blessed patterns. Do not flag them for "missing validation" unless the product genuinely has invariants to enforce.
- **Test data builders**: builders in test code (Object Mother, Test Data Builder) prioritize convenience over strictness. Missing validation in a test builder is rarely a problem.
- **Protobuf / generated builders**: auto-generated builders (Protocol Buffers, Thrift, FlatBuffers) follow their own conventions. Do not flag generated code.
- **Configuration DSLs**: Gradle, Terraform, or framework-specific DSLs that look like builders are domain-specific constructs, not Builder pattern instances.
- **Small builders in early iteration**: during rapid prototyping, a builder for a 3-field object may be acceptable if the object is expected to grow.

## Severity Guidance

| Finding | Severity |
|---|---|
| build() performs no validation and product has invariants | high |
| Builder reused after build() producing shared mutable state | high |
| Required field missing and build() silently applies wrong default | high |
| Telescoping constructor with 5+ same-type parameters | medium |
| Builder for trivially simple 2-field object | medium |
| Fluent method breaks chain by returning void | medium |
| Builder stored in instance field and shared across methods | medium |
| Missing toBuilder() on a frequently-modified immutable object | low |
| Director class wrapping a single build sequence | low |
| Minor builder naming inconsistency (with vs. set prefix) | low |

## See Also

- `pattern-factory-method` -- when the construction decision is about which type to create (not how), Factory Method is more appropriate
- `principle-immutability-by-default` -- builders should produce immutable products; mutable products from builders undermine the pattern's value

## Authoritative References

- [Erich Gamma et al., *Design Patterns: Elements of Reusable Object-Oriented Software* (1994), Builder](https://www.oreilly.com/library/view/design-patterns-elements/0201633612/)
- [Joshua Bloch, *Effective Java* (3rd ed., 2018), Item 2: Consider a builder when faced with many constructor parameters](https://www.oreilly.com/library/view/effective-java/9780134686097/)
- [Nat Pryce, "Test Data Builders: an alternative to the Object Mother pattern" (2007)](http://www.natpryce.com/articles/000714.html)
