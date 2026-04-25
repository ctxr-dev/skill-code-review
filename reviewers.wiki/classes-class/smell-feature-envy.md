---
id: smell-feature-envy
type: primary
depth_role: leaf
focus: Detect methods that use more fields and methods of another class than their own, indicating misplaced logic.
parents:
  - index.md
covers:
  - Method accessing 3+ getters or fields of a single foreign object to make a decision
  - Function that accepts an object and immediately destructures or picks apart most of its fields
  - Service method extracting multiple properties from a domain object to compute a result the domain object should own
  - "Helper or utility method operating entirely on another class's data with no reference to its own state"
  - Business logic living in a controller, handler, or orchestrator that belongs on the domain model
  - Method whose body could be moved to the foreign class wholesale and become simpler
  - "Free function that takes a single object parameter and calls only that object's methods"
  - Conditional logic branching on several properties of a foreign object instead of asking the object itself
  - "Method accessing nested getters (order.getCustomer().getAddress().getCity()) to gather data for a local computation"
  - Repeated access patterns where multiple methods in the same class all reach into the same foreign object
tags:
  - feature-envy
  - coupler
  - misplaced-logic
  - move-method
  - tell-dont-ask
  - clean-code
activation:
  file_globs:
    - "**/*.{java,kt,scala,cs,ts,js,py,rb,go,rs,swift,cpp,h,hpp,php}"
  keyword_matches:
    - get
    - getter
    - field
    - property
    - extract
    - this
    - self
    - other
    - service
    - helper
    - util
  structural_signals:
    - method_accessing_foreign_fields
    - getter_chain_on_single_object
    - function_operating_on_parameter_only
source:
  origin: file
  path: smell-feature-envy.md
  hash: "sha256:a250ce5ab40e032756346546be48a0aebab9556b793f8c15d032a6472a6472b2"
---
# Feature Envy

## When This Activates

Activates when diffs introduce or modify methods that spend most of their time reaching into another object's fields or calling another object's getters rather than working with their own class's state. Feature Envy means the logic lives in the wrong place -- the method "envies" the data of a foreign class and should be moved closer to that data. The core question is: if you count member accesses, does this method talk to another object more than to `this`/`self`?

## Audit Surface

- [ ] Method reads 3+ fields or calls 3+ getters on a single foreign object
- [ ] Method references another object's members more often than its own class's members
- [ ] Function accepts one object parameter and uses only that object's data, never its own state
- [ ] Service/helper method extracts multiple properties from a domain object to compute a derived value
- [ ] Conditional branches based on 2+ properties of a foreign object rather than delegating to that object
- [ ] Method could be moved to the foreign class with fewer parameters and simpler implementation
- [ ] Utility function operates entirely on fields of a type it does not own
- [ ] Controller or handler contains business logic that should live on the domain model
- [ ] Multiple methods in the same class all reach into the same foreign object for different computations
- [ ] Method chains getters on a foreign object to gather scattered data for a local decision
- [ ] Diff adds a new method that follows an existing pattern of envying the same foreign class
- [ ] Method extracts data from a foreign object, transforms it, and never feeds results back to that object

## Detailed Checks

### Getter-Heavy Methods
<!-- activation: keywords=["get", "getter", ".", "field", "property", "attribute"] -->

- [ ] **Foreign getter count**: method calls 3+ getters or accesses 3+ fields on the same foreign object -- count the distinct members accessed and compare to own-class member accesses
- [ ] **Getter-to-decision pipeline**: method extracts multiple values from a foreign object, combines them in a local computation, and returns the result -- the computation belongs on the foreign object
- [ ] **Chained getter extraction**: method calls `a.getX()`, `a.getY()`, `a.getZ()` in sequence to gather inputs for a formula or conditional -- the formula is a method on `a`'s class
- [ ] **Parallel getter patterns**: two or more methods in the same class extract overlapping sets of fields from the same foreign object -- each is independently envious and the pattern will spread
- [ ] **Diff adds more getters**: the diff introduces additional getter calls on an already-envied object, deepening the dependency

### Data Extraction in Services and Helpers
<!-- activation: keywords=["service", "helper", "util", "manager", "handler", "processor", "calculator"] -->

- [ ] **Anemic domain model**: service class extracts fields from a domain object, performs business logic, and returns a result -- the domain object is reduced to a data carrier while the service does the thinking
- [ ] **Validation outside the domain**: service method pulls multiple properties from an entity to validate a business rule -- the entity should enforce its own invariants
- [ ] **Derived value computation**: helper computes a value (e.g., total price, eligibility status) by reading several properties of a domain object -- the derived value is a method on the domain object
- [ ] **Formatting/display logic**: utility extracts fields from a model to format a string representation -- the model should own its display logic or a dedicated formatter should receive minimal data
- [ ] **Cross-cutting envied class**: multiple service classes all envy the same domain object, each extracting different field subsets -- the domain object is too passive

### Destructuring and Field Picking
<!-- activation: keywords=["destructure", "extract", "pick", "const {", "let {", "val (", "val ", "var "] -->

- [ ] **Full destructure at call site**: function receives an object and immediately destructures all or most fields into local variables, then never references the original object -- the function should be a method on the object
- [ ] **Selective destructure repeated**: the same subset of fields is destructured from the same type in multiple functions across the codebase -- this is a cross-cutting envy pattern
- [ ] **Destructure-then-reassemble**: function destructures an object, computes new values, and builds a new object of the same type -- the transformation belongs on the original type
- [ ] **Parameter spreading**: function spreads an object's fields into another function call, acting as a manual adapter -- the inner function should accept the object directly

### Tell-Don't-Ask Violations
<!-- activation: keywords=["if", "switch", "match", "case", "when", "check", "is", "has", "can", "should"] -->

- [ ] **Ask-then-decide**: method reads a foreign object's state with getters and then branches on the result -- the object should make the decision itself (Tell, Don't Ask)
- [ ] **Status/type interrogation**: method checks `obj.getStatus()` or `obj.getType()` and switches behavior accordingly -- the object should dispatch behavior polymorphically
- [ ] **Permission/capability check**: method asks `user.getRole()`, `user.getPermissions()` and decides access -- the user object should answer `user.canPerform(action)`
- [ ] **Threshold comparison**: method reads `account.getBalance()` and compares against a limit -- the account should answer `account.hasSufficientFunds(amount)`
- [ ] **Multi-property predicate**: method combines 2+ properties from a foreign object in a boolean expression -- the predicate belongs as a method on the foreign object

### Misplaced Logic in Controllers and Handlers
<!-- activation: keywords=["controller", "handler", "endpoint", "route", "action", "command", "resolver"] -->

- [ ] **Business logic in controller**: controller method reads request data and domain object fields, performs calculations, and returns a response -- extract the logic to the domain layer
- [ ] **Handler building domain response**: event/message handler reaches into multiple domain objects to assemble a result -- delegate to a domain service or the aggregate
- [ ] **GraphQL resolver with business logic**: resolver fetches an entity and computes derived fields inline rather than delegating to the entity or a domain service

## Common False Positives

- **Data transfer and mapping**: methods that map one DTO to another or serialize domain objects to API responses naturally access many fields of the source object. This is a structural necessity at architectural boundaries, not feature envy.
- **Comparators and equality checks**: comparator functions or `equals`/`compareTo` implementations access multiple fields of both objects by design. Flag only if the comparison logic is complex enough to be a method on the compared type.
- **Builder and factory methods**: factories and builders access many properties of a configuration or template object to construct a new instance. This is the builder's responsibility.
- **Cross-aggregate coordination**: application services that coordinate between multiple aggregates necessarily access fields of each. Feature envy applies when a service focuses on a single foreign object, not when it orchestrates multiple.
- **Test assertions**: test methods naturally access many fields of a result object to verify behavior. Do not flag assertion blocks.
- **Logging and telemetry**: methods that extract fields for structured logging or metrics emission are cross-cutting concerns, not misplaced domain logic.

## Severity Guidance

| Finding | Severity |
|---|---|
| Service method accessing 5+ fields of a domain object to enforce business rules the domain should own | Critical |
| Multiple methods in the same class all envy the same foreign class, forming a systemic pattern | Critical |
| Method accessing 3+ foreign getters to branch on conditions the foreign object should decide | Important |
| Controller/handler containing business logic that should live in the domain layer | Important |
| Utility function operating entirely on a single parameter object's fields | Important |
| Single method reading 3 foreign fields for a straightforward computation | Minor |
| DTO mapping or serialization method accessing many source fields at an architectural boundary | Minor |
| Test assertion block reading multiple result properties for verification | Minor |

## See Also

- `principle-tell-dont-ask` -- Feature Envy is the primary symptom of violating Tell, Don't Ask; the fix is to move the logic to the data owner
- `principle-encapsulation` -- envious methods bypass encapsulation by extracting internal state for external decision-making
- `principle-coupling-cohesion` -- Feature Envy creates high coupling to the envied class and low cohesion in the hosting class
- `smell-data-class` -- a class whose fields are envied by external methods is likely an anemic Data Class
- `smell-message-chains` -- getter chains used to reach distant data for an envious computation overlap with Message Chains
- `principle-law-of-demeter` -- accessing a.getB().getC() to envy C's data is simultaneously a Demeter violation

## Authoritative References

- [Martin Fowler, *Refactoring* (2nd ed., 2018), Feature Envy smell](https://refactoring.com/catalog/)
- [Martin Fowler, *Refactoring* (2nd ed., 2018), Move Function](https://refactoring.com/catalog/moveFunction.html)
- [Robert C. Martin, *Clean Code* (2008), Chapter 6: Objects and Data Structures](https://www.oreilly.com/library/view/clean-code-a/9780136083238/)
- [Martin Fowler, "TellDontAsk" (2013)](https://martinfowler.com/bliki/TellDontAsk.html)
- [Alec Sharp, "Pragmatic Programmer" principle: Tell, Don't Ask](https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition/)
