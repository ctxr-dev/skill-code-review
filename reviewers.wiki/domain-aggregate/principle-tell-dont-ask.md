---
id: principle-tell-dont-ask
type: primary
depth_role: leaf
focus: Ensure behavior lives with the data it operates on, eliminating feature envy, getter-chain decision-making, and anemic domain models.
parents:
  - index.md
covers:
  - "Feature envy: method uses another object's data more than its own"
  - "Anemic domain model: data classes with no behavior, logic external in services"
  - "Getter-chain conditionals: if(obj.getX().getY().isZ()) decision-making"
  - "Law of Demeter violations: reaching through object graphs"
  - "Behavioral co-location: computation lives in the class that owns the data"
  - "Command-style APIs: tell objects what to do, don't ask for state and decide externally"
  - State interrogation patterns that should be domain methods
  - Train-wreck expressions chaining accessors across object boundaries
  - "Primitive obsession as a Tell-Don't-Ask symptom"
  - "Domain logic scattered in service/controller layers instead of entity methods"
tags:
  - tell-dont-ask
  - feature-envy
  - anemic-domain
  - law-of-demeter
  - encapsulation
  - behavior-colocation
activation:
  file_globs:
    - "**/*.{java,kt,scala,cs,ts,js,py,rb,go,rs,swift}"
  keyword_matches:
    - get
    - getter
    - state
    - status
    - is_
    - has_
    - can_
    - ".get("
    - getattr
    - "if.*get"
    - domain
    - entity
    - model
    - anemic
  structural_signals:
    - getter_chain
    - conditional_on_foreign_state
    - data_class_without_behavior
source:
  origin: file
  path: principle-tell-dont-ask.md
  hash: "sha256:a198450b77a807f37be33851a0b2b0f3c0962f39f45fbfa50f5f20ab050cdf16"
---
# Tell, Don't Ask

## When This Activates

Activates when diffs introduce getter usage patterns, conditionals based on another object's state, domain model classes, or service methods operating on entity data. The Tell-Don't-Ask principle states: instead of asking an object for data and acting on it, tell the object what to do. Violations produce fragile, scattered logic that is hard to test and easy to get wrong.

## Audit Surface

- [ ] No method reaches into another object with 3+ getter calls to make a decision that the other object should make itself
- [ ] Conditionals on another object's state are replaced with a meaningful query method on that object
- [ ] No accessor chain crosses 2+ object boundaries (Law of Demeter / train-wreck expression)
- [ ] Domain entities carry behavior, not just data -- each entity has methods reflecting its domain responsibilities
- [ ] Service classes delegate domain decisions to entities rather than extracting data and deciding externally
- [ ] Boolean/status checks are expressed as intention-revealing methods on the object that owns the state
- [ ] Null/empty checks on retrieved values are encapsulated within the owning object
- [ ] Type/status-based dispatch uses polymorphism on the object, not external switch/if
- [ ] Formatter/calculator/validator classes operating on foreign fields are candidates for moving logic to the data owner
- [ ] Primitive values (string, int, boolean) that carry domain meaning are wrapped in value objects with embedded behavior
- [ ] No repeated get-compute-set sequences that should be a single tell-style method
- [ ] Controller/service code does not assemble domain objects piecemeal from raw data -- use factory methods on the entity
- [ ] Internal state is not exposed solely to enable external conditional logic
- [ ] Domain validation lives on the entity, not in a separate service inspecting entity fields

## Detailed Checks

### Feature Envy Detection
<!-- activation: keywords=["get", "getter", "getattr", "property", "field", "attribute", "member"] -->

- [ ] **Foreign data ratio**: method uses more data from another class than from its own class -- this method likely belongs on the other class
- [ ] **Getter cluster**: method calls 3+ getters on the same external object in sequence -- the computation should be a method on that object
- [ ] **Repeated access pattern**: same sequence of getters called in multiple places across the codebase -- extract a method on the source object
- [ ] **Data clump as parameter**: method receives 3+ fields that all come from the same object -- pass the object and let it perform the computation
- [ ] **Helper method envy**: utility/helper method whose only inputs are fields of a single class -- move it to that class as an instance method
- [ ] **Cross-service envy**: service A extracts data from entity X to do what entity X should do itself, then calls service B with the result

### Anemic Domain Model
<!-- activation: keywords=["entity", "model", "domain", "class", "data", "dto", "record", "struct", "pojo", "pojo", "bean"] -->

- [ ] **Behavior audit**: does the domain entity have methods beyond getters/setters? If it only carries data, the domain logic is misplaced elsewhere
- [ ] **Service bloat correlation**: if a service class has grown large, check whether its logic operates on a single entity's fields -- that logic belongs on the entity
- [ ] **Invariant enforcement**: domain rules (e.g., "order total must match line items," "account balance cannot go negative") are enforced by the entity, not by external services
- [ ] **State transition ownership**: entity state transitions (e.g., `order.ship()`, `account.freeze()`) are methods on the entity, not logic in a service that sets fields
- [ ] **Rich behavior smell test**: can you describe what the entity *does* (verbs), or only what it *holds* (nouns)? Domain objects should have verbs
- [ ] **DTO vs. entity confusion**: DTOs crossing boundaries are appropriately anemic; entities in the domain layer should not be

### Law of Demeter / Train-Wreck Expressions
<!-- activation: keywords=[".", "->", "getA().getB()", "chain", "navigation", "path", "drill", "nested"] -->

- [ ] **Dot counting**: expression chains like `order.getCustomer().getAddress().getCity()` cross 3 object boundaries -- the caller knows too much about the object graph
- [ ] **Refactor to delegation**: `order.getCustomer().getAddress().getCity()` becomes `order.getShippingCity()` -- the order delegates internally, hiding the structure
- [ ] **Null-safety chain risk**: long chains are null-reference accidents waiting to happen; each dot is a potential NPE/undefined
- [ ] **Structural coupling**: caller is coupled to the internal structure of the object graph; if `Customer` stops having an `Address` field, all callers break
- [ ] **Collection element access**: `manager.getTeam().getMembers().get(0).getName()` -- deeply reaching into collection internals; provide a query method instead
- [ ] **Fluent API exception**: method-chaining on the *same* object (builder pattern, fluent API) is not a Law of Demeter violation -- the key is crossing object boundaries

### Command-Style Refactoring Opportunities
<!-- activation: keywords=["if", "switch", "check", "validate", "calculate", "compute", "determine", "process"] -->

- [ ] **Ask-then-act pattern**: `if (account.getBalance() > amount) { account.setBalance(account.getBalance() - amount); }` should be `account.withdraw(amount)` which encapsulates the check and mutation
- [ ] **External validation**: service validates entity state (`if entity.getField() == null`) before proceeding -- the entity should expose `entity.isReady()` or enforce the invariant at construction
- [ ] **Compute-and-set**: extracting data, computing, then writing back (`x.setTotal(x.getPrice() * x.getQuantity())`) should be `x.recalculateTotal()`
- [ ] **Status-based routing**: `if (order.getStatus() == SHIPPED) { ... } else if (order.getStatus() == PENDING) { ... }` should be polymorphic behavior on the order or a state pattern
- [ ] **Primitive decision**: `if (user.getRole() == "admin")` -- role-based decisions should be methods on the user or role object: `user.canPerform(action)`
- [ ] **Map lookup replacing method**: `pricingRules.get(product.getCategory())` to determine pricing -- the product or a pricing strategy object should encapsulate this

## Common False Positives

- **Data Transfer Objects and view models**: DTOs, view models, and API response objects are intentionally data-only. They exist to carry data across boundaries, not to hold behavior.
- **Functional pipelines**: functional programming transforms data through pure functions. `items.filter(_.isActive).map(_.price).sum` is idiomatic functional style, not a Tell-Don't-Ask violation.
- **Serialization and mapping code**: code that maps between representations (entity-to-DTO, protobuf-to-domain) necessarily reads fields from one object to populate another.
- **Query/read-model code**: CQRS read sides intentionally project data for display. Reading fields for presentation is expected.
- **Logging and metrics**: extracting object state for logging or metric emission is observation, not decision-making. This is acceptable ask-style access.
- **Test assertions**: tests legitimately inspect object state with getters to verify behavior. The principle applies to production code, not test verification.
- **Configuration reading**: reading configuration values to set up behavior is not a violation; config objects are data sources by design.

## Severity Guidance

| Finding | Severity |
|---|---|
| Domain entity with zero behavior methods but services operate on its 10+ fields | high |
| Critical business rule (money, auth, state transition) decided externally using getters | high |
| Getter-chain crossing 3+ object boundaries in business logic | high |
| Repeated get-compute-set pattern on same object across multiple call sites | medium |
| Service method that extracts data from entity to compute what entity should compute | medium |
| Conditional on foreign object's status field instead of a domain method | medium |
| Primitive value (string role, int status) where a value object would embed decisions | medium |
| Single getter-based conditional in a controller for routing | low |
| Minor feature envy in a small utility method | low |
| Train-wreck in test assertion code | low |

## See Also

- `principle-encapsulation` -- Tell-Don't-Ask is the behavioral consequence of proper encapsulation; if data is hidden, callers must tell rather than ask
- `principle-solid` -- SRP ensures behavior and data are co-located; OCP ensures new behavior is added without interrogating existing state
- `principle-grasp` -- Information Expert directly mandates that behavior lives with the data it needs
- `principle-composition-over-inheritance` -- composition with delegation naturally supports tell-style interactions

## Authoritative References

- [Martin Fowler, "Tell-Don't-Ask"](https://martinfowler.com/bliki/TellDontAsk.html)
- [Andy Hunt and Dave Thomas, "The Pragmatic Programmer" (2019), Chapter 5: Decoupling](https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition/)
- [Martin Fowler, "Feature Envy" in *Refactoring* (2018)](https://refactoring.com/catalog/moveFunction.html)
- [Eric Evans, *Domain-Driven Design* (2003), Chapter 5: A Model Expressed in Software](https://www.domainlanguage.com/ddd/)
- [Craig Larman, "Information Expert" in *Applying UML and Patterns* (2004)](https://www.pearson.com/en-us/subject-catalog/p/applying-uml-and-patterns-an-introduction-to-object-oriented-analysis-and-design-and-iterative-development/P200000009490)
