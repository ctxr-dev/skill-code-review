---
id: ddd-tactical-entities
type: primary
depth_role: leaf
focus: "Detect entities without identity, entity equality by value instead of ID, entities exposing state without behavior, and entities managing other entities' lifecycle."
parents:
  - index.md
covers:
  - Entity class without a clear identity field
  - Entity equality implemented by value comparison instead of identity comparison
  - Entity exposing all state via getters with no business behavior methods
  - "Entity managing the lifecycle (creation, deletion) of other entities it should not own"
  - "Entity without equals/hashCode based on identity"
  - Entity identity that can change after construction
  - "Entity confused with value object (no meaningful identity needed)"
  - Entity with public constructor allowing creation in invalid state
tags:
  - entity
  - ddd
  - tactical-design
  - identity
  - equality
  - lifecycle
  - domain-driven-design
activation:
  file_globs:
    - "**/*entity*"
    - "**/*domain*"
    - "**/*model*"
    - "**/*aggregate*"
  keyword_matches:
    - entity
    - id
    - Id
    - ID
    - identity
    - uuid
    - equals
    - hashCode
    - lifecycle
    - domain
  structural_signals:
    - entity_class
    - identity_field
    - equals_override
source:
  origin: file
  path: ddd-tactical-entities.md
  hash: "sha256:bd7286a5b1d73cd17709aec060f0272a91e87249cef37bbfae5ff72cdc1a85f9"
---
# Tactical Entities

## When This Activates

Activates on diffs involving entity or domain model classes where identity, equality, or lifecycle management is defined or modified. An entity is a domain object defined by its identity -- not by its attributes. Two customers with the same name and address are still different customers if they have different IDs. The key entity discipline is: identity is immutable and assigned at creation, equality compares identity only, and the entity encapsulates behavior that protects its invariants. The most common violations are entities without clear identity, entities with value-based equality (confusing them with value objects), and entities that are pure data bags with all behavior externalized.

## Audit Surface

- [ ] Class in entity/domain package with no ID field or identity mechanism
- [ ] Entity equals/hashCode comparing all fields instead of identity field only
- [ ] Entity class with only getters, setters, and no domain behavior methods
- [ ] Entity creating or deleting instances of other entity types it does not own
- [ ] Entity ID field with a public setter allowing identity mutation after construction
- [ ] Entity without equals/hashCode override (uses reference equality by default)
- [ ] Class modeled as entity that has no meaningful identity -- should be a value object
- [ ] Entity with public no-arg constructor that can produce an invalid instance
- [ ] Entity referencing and managing lifecycle of entities from another aggregate
- [ ] Entity equality check that includes mutable state fields alongside or instead of identity
- [ ] Entity identity generated outside the entity (assigned by caller) with no validation
- [ ] Diff changes entity equality semantics from identity-based to value-based or vice versa

## Detailed Checks

### Identity Discipline
<!-- activation: keywords=["id", "Id", "ID", "uuid", "identity", "key", "primary", "unique", "identifier"] -->

- [ ] **Missing identity field**: flag entity classes in domain packages with no explicit ID, UUID, or identity field -- every entity must have a clear, permanent identity
- [ ] **Mutable identity**: flag entity ID fields with public setters or reassignment after construction -- identity must be immutable once assigned
- [ ] **Caller-assigned identity without validation**: flag entities that accept any value as ID without checking uniqueness constraints or format validity
- [ ] **Identity type confusion**: flag entities using raw `String` or `long` as ID type where a typed ID value object (`OrderId`, `CustomerId`) would prevent accidental mixing of different entity IDs

### Equality Semantics
<!-- activation: keywords=["equals", "hashCode", "hash_code", "__eq__", "__hash__", "==", "equal", "compare", "same"] -->

- [ ] **Value-based equality on entity**: flag entity equals methods that compare all fields (name, address, amount) instead of identity only -- two entities with the same attributes but different IDs are different entities
- [ ] **Missing equals/hashCode**: flag entity classes that rely on default reference equality -- entities must implement identity-based equality for correct behavior in collections and caches
- [ ] **Inconsistent equals/hashCode**: flag entities where equals compares the ID but hashCode includes other fields, or vice versa -- equals and hashCode must be consistent
- [ ] **Mutable fields in hashCode**: flag entity hashCode implementations that include mutable state -- hashCode should depend only on the immutable identity

### Behavior Encapsulation
<!-- activation: keywords=["get", "set", "setter", "getter", "method", "void", "return", "public", "behavior", "action"] -->

- [ ] **Data-only entity**: flag entity classes with only getters and setters and no methods expressing domain behavior -- this is the anemic domain model antipattern applied to entities
- [ ] **State exposure without behavior**: flag entities where every field has a public getter but no method uses those fields to implement a business rule -- the entity is a data bag
- [ ] **Setter-driven state changes**: flag entities whose state changes are driven entirely by external setters (`order.setStatus(APPROVED)`) instead of intent-revealing methods (`order.approve()`)
- [ ] **Business logic in service, not entity**: flag service methods performing calculations or decisions using entity fields that should be entity methods

### Lifecycle Responsibility
<!-- activation: keywords=["create", "new", "delete", "remove", "factory", "build", "construct", "lifecycle", "manage", "own"] -->

- [ ] **Cross-aggregate lifecycle management**: flag an entity in one aggregate creating, deleting, or managing the lifecycle of entities in another aggregate -- lifecycle management should stay within aggregate boundaries
- [ ] **Entity as factory for unrelated entities**: flag entities with factory methods that create instances of unrelated entity types -- use a dedicated factory or the aggregate root
- [ ] **No-arg constructor allowing invalid state**: flag public default constructors on entities that allow creating instances without required fields -- entities should be valid at construction
- [ ] **Entity without factory or constructor validation**: flag entity construction paths that skip invariant checks, allowing invalid instances to exist

## Common False Positives

- **ORM-required default constructors**: many ORMs (Hibernate, EF Core) require a no-arg constructor for proxying. A `protected` or `private` no-arg constructor for ORM use is not a violation -- only flag if it is `public` and used in domain code.
- **Event-sourced entity reconstruction**: event-sourced entities may rebuild state by replaying events, temporarily appearing to have mutable fields. The important thing is that the public API is immutable-identity and behavior-rich.
- **Test builders**: test code may use setters or builders to construct entities in specific states for testing. Flag only production code violations.
- **Value object masquerading as entity**: some objects genuinely do not need identity (an Address that is not independently tracked). Recommending removal of identity is correct, not a false positive.
- **Active Record pattern**: Rails/Django models combine identity with persistence methods. The entity still needs domain behavior mixed in via modules or methods.

## Severity Guidance

| Finding | Severity |
|---|---|
| Entity equality compares all fields instead of identity only | Critical |
| Entity ID field with public setter allowing identity mutation | Critical |
| Entity in domain package with no identity field or mechanism | Critical |
| Entity with only getters/setters and zero business behavior methods | Important |
| Entity managing lifecycle of entities from another aggregate | Important |
| Public no-arg constructor allowing creation of invalid entity instances | Important |
| Entity hashCode includes mutable state fields | Important |
| Missing equals/hashCode override on entity (relying on reference equality) | Important |
| Entity using raw String for ID instead of typed ID value object | Minor |
| Protected no-arg constructor for ORM use | Minor |

## See Also

- `ddd-tactical-value-objects` -- value objects are defined by attributes, entities by identity; confusing the two leads to incorrect equality and lifecycle
- `ddd-tactical-aggregates` -- entities live within aggregates; the aggregate root controls their lifecycle
- `antipattern-anemic-domain-model` -- entities without behavior are the core symptom of the anemic domain model
- `smell-data-class` -- an entity with only accessors is a data class; entities should encapsulate behavior
- `principle-encapsulation` -- entities must encapsulate their state and expose behavior, not raw data
- `principle-tell-dont-ask` -- callers should tell entities to perform actions, not ask for fields and decide externally

## Authoritative References

- [Eric Evans, *Domain-Driven Design* (2003), Chapter 5: "A Model Expressed in Software" -- Entities](https://www.oreilly.com/library/view/domain-driven-design-tackling/0321125215/)
- [Vaughn Vernon, *Implementing Domain-Driven Design* (2013), Chapter 5: "Entities"](https://www.oreilly.com/library/view/implementing-domain-driven-design/9780133039900/)
- [Martin Fowler, "EvansClassification" (2003)](https://www.martinfowler.com/bliki/EvansClassification.html)
- [Robert C. Martin, *Clean Code* (2008), Chapter 6: "Objects and Data Structures"](https://www.oreilly.com/library/view/clean-code-a/9780136083238/)
