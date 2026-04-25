---
id: principle-law-of-demeter
type: primary
depth_role: leaf
focus: Minimize structural coupling by ensuring objects talk only to their immediate collaborators
parents:
  - index.md
covers:
  - "Train wreck expressions (a.b.c.d) that expose internal structure"
  - Methods reaching through intermediate objects to access distant collaborators
  - Getter chains that leak implementation details across module boundaries
  - Navigation code that hard-wires knowledge of object graphs
  - Wrapper methods that exist solely to forward calls through layers
  - "Feature envy: a method that uses more of another class than its own"
  - Fluent API vs. train wreck disambiguation
  - Facade and mediator patterns as LoD-compliant alternatives
  - DTOs and value objects as boundary-safe data carriers
  - Test doubles that mirror deep structural chains
tags:
  - law-of-demeter
  - coupling
  - encapsulation
  - train-wreck
  - method-chains
  - structural-coupling
activation:
  file_globs:
    - "**/*.py"
    - "**/*.java"
    - "**/*.kt"
    - "**/*.scala"
    - "**/*.ts"
    - "**/*.js"
    - "**/*.rb"
    - "**/*.go"
    - "**/*.cs"
    - "**/*.rs"
    - "**/*.swift"
  keyword_matches:
    - getAddress
    - getCity
    - getName
    - getConfig
    - ".get("
    - "->get"
    - ".unwrap()"
    - ".value()"
    - Optional.get
  structural_signals:
    - Method chains with 3+ dots on a single expression
    - Repeated navigation paths across multiple methods
    - Mock setup with chained return values
source:
  origin: file
  path: principle-law-of-demeter.md
  hash: "sha256:72f9a992d74f40bf67bb2e33ccbcf5459984823ec0970ae35ec52a8eaa7100ee"
---
# Law of Demeter Reviewer

## When This Activates

Activates when a diff contains method chains, getter sequences, or navigation expressions that suggest objects are reaching through their collaborators to access distant dependencies. Fires on any language when dot-chain depth or structural navigation patterns exceed typical thresholds.

## Audit Surface

- [ ] Method chains deeper than two dots that traverse distinct owner boundaries
- [ ] Getter sequences like `user.getAddress().getCity().getZipCode()`
- [ ] Direct field access into nested structures (`order.customer.billing.card`)
- [ ] Functions that accept an object only to extract a deeply nested property
- [ ] Mocks/stubs that set up multi-level return chains (`when(a.b()).thenReturn(c)`)
- [ ] Controller or handler methods that navigate the domain model to assemble responses
- [ ] Utility methods that take a wide object and drill into specific sub-fields
- [ ] Map/dict chains like `config['db']['primary']['host']` repeated across files
- [ ] Optional/nullable chains that mix navigation with null-safety operators
- [ ] Import of types used only as intermediaries in a navigation chain
- [ ] Lambda/closure bodies that reach through captured objects
- [ ] DSL or builder chains confused with structural coupling chains
- [ ] Tests asserting on deeply nested return values instead of behavioral outcomes
- [ ] Service classes that hold references to repositories they never query directly

## Detailed Checks

### Train Wreck Detection
<!-- activation: keywords=[".", "->", "?.", "!!.", "unwrap", "get("] -->

- [ ] Count distinct ownership boundaries crossed in a single expression -- `order.getCustomer().getAddress().getCity()` crosses three boundaries (Order -> Customer -> Address -> City)
- [ ] Distinguish **train wrecks** (navigating through different owners) from **fluent APIs** (returning `this`/`self` for chaining on the same object) -- `builder.withName("x").withAge(3).build()` is fine
- [ ] Distinguish from **stream/pipeline chains** -- `list.stream().filter(x).map(y).collect()` operates on the same conceptual sequence, not different owners
- [ ] Flag nullable navigation chains (`user?.profile?.settings?.theme`) that reveal deep structural knowledge even when null-safe
- [ ] Check for repeated identical chains across multiple call sites -- identical navigation in 3+ places is a strong signal of missing encapsulation
- [ ] Watch for chains that mix query and command operations -- `account.getLedger().getEntries().add(entry)` both navigates and mutates

### Feature Envy and Misplaced Behavior
<!-- activation: keywords=["this.", "self.", "@", "private"] -->

- [ ] Identify methods that call more methods on another object than on their own class -- behavior likely belongs on the other object
- [ ] Flag data classes/structs whose fields are accessed via getters from multiple distant consumers rather than exposing behavior
- [ ] Check whether a method could move to the class it queries most, reducing coupling
- [ ] Look for "tell, don't ask" violations: code that gets data, makes a decision, then calls back to set state -- the decision should live with the data
- [ ] Detect "middleman" classes that delegate every call to an inner object without adding value -- consider removing the indirection

### Facade and Encapsulation Remediation
<!-- activation: keywords=["facade", "wrapper", "delegate", "service", "manager", "helper"] -->

- [ ] When flagging a train wreck, suggest the specific encapsulation fix: add a domain method that hides the chain (e.g., `order.shippingZipCode()`)
- [ ] For repeated config navigation, suggest a typed config object or accessor that centralizes the path
- [ ] For cross-layer navigation (controller reaching into repository internals), suggest a service method that encapsulates the query
- [ ] Verify that proposed wrapper methods are not "pass-through only" -- they should add semantic meaning, not just hide dots
- [ ] Check whether introducing a DTO or view model at a boundary would eliminate navigation chains in the consumer

### Test Double Chain Smells
<!-- activation: keywords=["mock", "stub", "when(", "given(", "expect(", "spy", "fake"] -->

- [ ] Flag mock setups that chain `.thenReturn()` through multiple levels -- indicates the production code violates LoD and the test mirrors it
- [ ] If a test must build a deep object graph just to call one method, the method under test is coupled to too much structure
- [ ] Suggest injecting the leaf value directly rather than constructing the entire navigation path in test setup
- [ ] Check for test helpers that exist solely to build deeply nested fixture objects -- structural coupling has leaked into the test infrastructure
- [ ] Verify that refactoring the production code to obey LoD would simplify the corresponding test setup

### Configuration and Data Access Chains
<!-- activation: keywords=["config", "settings", "env", "props", "properties", "options", "[\"", "['"] -->

- [ ] Flag repeated dictionary/map drilling like `config["database"]["replicas"][0]["host"]` -- extract into a typed config class
- [ ] Check for environment variable access buried deep in business logic rather than injected at the boundary
- [ ] Verify that JSON/YAML deserialization produces typed objects rather than raw nested dicts navigated ad-hoc throughout the codebase
- [ ] Look for string-keyed access paths that would break silently if the config schema changed

## Common False Positives

- **Fluent/builder APIs**: `StringBuilder.append("a").append("b").toString()` chains on the same receiver -- not a violation.
- **Stream/pipeline operations**: `stream.filter().map().collect()` is a data-flow pipeline, not structural navigation.
- **Monad chains**: `Optional.map().flatMap().orElse()` or `Result.and_then().map_err()` are functional composition, not ownership traversal.
- **Path/URI builders**: `Paths.get("a").resolve("b").toAbsolutePath()` operates on a single value type.
- **Test assertion chains**: `assertThat(x).isNotNull().hasSize(3)` is a fluent assertion API.
- **ORM query builders**: `query.where().orderBy().limit()` builds a query object, not navigating domain structure.
- **Protobuf/generated code**: Auto-generated accessor chains like `proto.getField().getSubField()` may be unavoidable -- flag only if wrapping is practical.

## Severity Guidance

| Finding | Severity |
|---|---|
| 4+ boundary crossings in a single expression | Important |
| Same 3+ dot chain duplicated across multiple files | Important |
| Mock setup requiring 3+ levels of chained stubs | Important |
| Controller directly navigating domain model internals | Important |
| 3-dot chain appearing once in non-critical code | Minor |
| Getter chain on a DTO within the same layer | Minor |
| Feature envy method using another class more than its own | Important |
| Config dict drilling repeated in 3+ locations | Important |
| Single nullable navigation chain with null-safe operators | Minor |

## See Also

- `principle-coupling-cohesion` -- broader coupling and cohesion metrics that LoD violations feed into
- `principle-separation-of-concerns` -- LoD violations often indicate concern leakage across layers

## Authoritative References

- [The Pragmatic Programmer - "Train Wrecks"](https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition/)
- [Clean Code, Chapter 6 - "Objects and Data Structures"](https://www.oreilly.com/library/view/clean-code/9780136083238/)
- [Martin Fowler - "Feature Envy" Code Smell](https://refactoring.guru/smells/feature-envy)
- [Karl Lieberherr - Original Law of Demeter Paper](https://www.ccs.neu.edu/home/lieber/LoD.html)
- [Demeter Project at Northeastern University](https://www.ccs.neu.edu/home/lieber/demeter.html)
