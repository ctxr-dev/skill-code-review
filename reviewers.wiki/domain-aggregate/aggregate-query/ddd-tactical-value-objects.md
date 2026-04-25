---
id: ddd-tactical-value-objects
type: primary
depth_role: leaf
focus: Detect value objects with accidental identity, mutable value objects, equality not based on attributes, value objects with setters, and primitives used where value objects should exist.
parents:
  - index.md
covers:
  - "Value object with an ID field (accidental identity)"
  - Mutable value object -- value objects must be immutable
  - Value object equality based on reference or ID instead of attribute comparison
  - Value objects with setter methods allowing post-construction mutation
  - Primitive obsession -- raw strings, ints, or floats used where a value object should enforce constraints
  - Value object with side effects in methods
  - "Missing value object for a domain concept with validation rules (email, money, date range)"
  - "Value object with lifecycle (creation timestamp, version) suggesting it should be an entity"
tags:
  - value-object
  - ddd
  - tactical-design
  - immutability
  - primitive-obsession
  - equality
  - domain-driven-design
activation:
  file_globs:
    - "**/*value*"
    - "**/*vo*"
    - "**/*money*"
    - "**/*amount*"
    - "**/*email*"
    - "**/*address*"
    - "**/*domain*"
    - "**/*model*"
    - "**/*entity*"
  keyword_matches:
    - value
    - immutable
    - final
    - readonly
    - const
    - frozen
    - dataclass
    - record
    - equals
    - hashCode
    - money
    - amount
    - email
    - address
    - currency
  structural_signals:
    - value_object_class
    - immutable_class
    - primitive_type_for_domain_concept
source:
  origin: file
  path: ddd-tactical-value-objects.md
  hash: "sha256:1441ffdd6acdcb63819f879530a0e8b3a325a4a812b11f19b6151a865e7a91a9"
---
# Tactical Value Objects

## When This Activates

Activates on diffs involving value object classes, domain model types, or code using primitives for domain concepts like money, email, addresses, or measurements. Value objects are defined by their attributes, not by identity -- two Money objects with the same currency and amount are equal regardless of which instance you hold. They must be immutable: operations return new instances rather than mutating state. The most pervasive violation is primitive obsession -- using raw strings, ints, and floats to represent domain concepts that have constraints, validation rules, and behavior. The second most common violation is value objects that accidentally gain identity or mutability.

## Audit Surface

- [ ] Class described as value object but containing an ID or surrogate key field
- [ ] Value object class with setter methods or mutable fields
- [ ] equals/hashCode implementation on a value object that compares by reference or ID instead of all attributes
- [ ] Domain code using raw String for email, phone, currency code, or similar constrained concept
- [ ] Domain code using raw int/float for money, quantity, percentage, or measurement
- [ ] Value object method that modifies internal state instead of returning a new instance
- [ ] Value object constructed without validation (accepts any input without checking constraints)
- [ ] Two value objects representing the same concept with different field sets
- [ ] Value object with a timestamp, version, or audit field suggesting entity lifecycle
- [ ] Method accepting multiple primitives that together represent a single domain concept
- [ ] Comparison of domain concepts using primitive equality (string == string) instead of value object equality

## Detailed Checks

### Identity Contamination
<!-- activation: keywords=["id", "Id", "ID", "uuid", "key", "surrogate", "identity", "primary"] -->

- [ ] **ID field on value object**: flag value object classes that contain an `id`, `uuid`, or surrogate key field -- if it needs identity, it is an entity, not a value object
- [ ] **Database-assigned ID for value object**: flag ORM mappings that assign a primary key to a value object table -- value objects should be embedded or stored as components, not as independent rows with IDs
- [ ] **Lifecycle fields**: flag value objects with `createdAt`, `updatedAt`, or `version` fields -- these indicate entity lifecycle, not value semantics

### Immutability Violations
<!-- activation: keywords=["set", "setter", "mut", "mutable", "var ", "let ", "assign", "modify", "change", "update"] -->

- [ ] **Setter methods**: flag setter methods (`setAmount`, `setCurrency`, `setStreet`) on value object classes -- value objects must be immutable after construction
- [ ] **Mutable fields**: flag non-final, non-readonly, non-const fields in value objects -- all fields should be immutable
- [ ] **Mutating methods**: flag methods that modify `this` state instead of returning a new instance -- `money.add(other)` should return a new `Money`, not modify the existing one
- [ ] **Mutable collection field**: flag value objects containing mutable `List`, `Map`, or `Set` without defensive copying or immutable wrappers

### Equality and Comparison
<!-- activation: keywords=["equals", "hashCode", "hash_code", "__eq__", "__hash__", "comparable", "compare", "==", "equal"] -->

- [ ] **Reference equality**: flag value objects using default reference equality (Java `==`, Python `is`) instead of attribute-based equality
- [ ] **Partial attribute comparison**: flag value object equals methods that compare only some attributes -- value object equality must compare all constituent attributes
- [ ] **Missing hashCode**: flag value objects that override equals but not hashCode (or vice versa) -- both must be consistent for correct behavior in collections
- [ ] **ID-based equality on value object**: flag value objects whose equals method compares an ID field instead of all value attributes

### Primitive Obsession Detection
<!-- activation: keywords=["String ", "string ", "int ", "float ", "double ", "Integer", "Long", "BigDecimal", "number", "amount", "price", "email", "phone", "address", "currency", "url", "percentage"] -->

- [ ] **Raw money types**: flag `BigDecimal amount` or `double price` without a `Money` value object -- currency and amount must travel together with rounding rules
- [ ] **String email/phone**: flag `String email` or `String phoneNumber` without a value object that validates format and normalizes
- [ ] **Primitive pairs for concepts**: flag method signatures like `transfer(BigDecimal amount, String currency)` -- this should be `transfer(Money money)`
- [ ] **Unconstrained domain values**: flag domain fields using raw types where business constraints exist (percentage must be 0-100, quantity must be positive, status must be from a fixed set)
- [ ] **String-typed identifiers**: flag `String orderId` where a typed `OrderId` value object would prevent mixing up different kinds of IDs

## Common False Positives

- **DTOs and API contracts**: DTOs at API boundaries legitimately use primitives -- they are serialization structures, not domain objects. Flag only primitives in domain layer code.
- **Configuration values**: application configuration (port numbers, timeout durations, feature flags) does not need domain value objects.
- **Database mapping pragmatism**: some ORMs require mutable fields or surrogate IDs for value objects stored in separate tables. If the domain model treats them as value objects and the mutability is confined to the persistence layer, this is acceptable.
- **Language constraints**: some languages (e.g., Go structs) make truly immutable value objects impractical. Apply the spirit: no mutation after construction, equality by attributes.
- **Primitive in trivial context**: a `String name` field in a simple internal tool does not warrant a value object -- apply primitive obsession detection proportionally to domain complexity.

## Severity Guidance

| Finding | Severity |
|---|---|
| Value object with setter methods allowing mutation of domain-critical fields (Money, Address) | Critical |
| Raw `double`/`float` used for monetary amounts with no value object | Critical |
| Value object equals method compares by ID instead of attributes | Critical |
| Value object method mutates internal state instead of returning new instance | Important |
| Raw `String` for validated domain concept (email, phone, currency code) | Important |
| Method signature with 3+ primitives that together form a domain concept | Important |
| Value object containing an ID or surrogate key field | Important |
| Missing hashCode when equals is overridden on a value object | Important |
| Value object with mutable collection field but otherwise correct design | Minor |
| Simple `String` field in low-complexity domain context | Minor |

## See Also

- `smell-primitive-obsession` -- primitive obsession is the code smell; value objects are the DDD remedy
- `ddd-tactical-entities` -- entities have identity and lifecycle; value objects do not -- confusing the two leads to design errors
- `ddd-tactical-aggregates` -- value objects within aggregates reduce complexity compared to entities
- `principle-immutability-by-default` -- value objects are the domain-level application of immutability
- `principle-encapsulation` -- value objects encapsulate validation and constraints that raw primitives cannot enforce
- `antipattern-anemic-domain-model` -- value objects should carry behavior (Money.add, EmailAddress.domain), not just data

## Authoritative References

- [Eric Evans, *Domain-Driven Design* (2003), Chapter 5: "A Model Expressed in Software" -- Value Objects](https://www.oreilly.com/library/view/domain-driven-design-tackling/0321125215/)
- [Vaughn Vernon, *Implementing Domain-Driven Design* (2013), Chapter 6: "Value Objects"](https://www.oreilly.com/library/view/implementing-domain-driven-design/9780133039900/)
- [Martin Fowler, "ValueObject" (2016)](https://www.martinfowler.com/bliki/ValueObject.html)
- [Ward Cunningham, "Whole Value Pattern" (1994)](http://wiki.c2.com/?WholeValue)
