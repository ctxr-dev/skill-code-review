---
id: ddd-ubiquitous-language
type: primary
depth_role: leaf
focus: Detect code names that diverge from domain terminology, inconsistent naming across bounded contexts, technical jargon where domain language belongs, and glossary drift between code and domain experts.
parents:
  - index.md
covers:
  - Class, method, or variable names that use technical jargon instead of domain terms
  - Same domain concept named differently across modules or bounded contexts
  - Abbreviations or acronyms that obscure domain meaning
  - "Generic names (data, info, item, record, manager, processor) replacing precise domain terms"
  - Code terms that contradict established domain glossary or documentation
  - "Boolean fields named with technical prefixes (isFlag, hasData) instead of domain predicates"
  - Method names describing implementation rather than business intent
  - Domain terms misspelled or used with wrong meaning
  - Comments explaining domain meaning that the code name should already convey
  - Translation layers that rename domain concepts without justification
tags:
  - ubiquitous-language
  - ddd
  - naming
  - domain-driven-design
  - bounded-context
  - glossary
  - readability
activation:
  file_globs:
    - "**/*domain*"
    - "**/*model*"
    - "**/*entity*"
    - "**/*service*"
    - "**/*aggregate*"
    - "**/*event*"
    - "**/*command*"
    - "**/*query*"
    - "**/*repository*"
  keyword_matches:
    - domain
    - model
    - entity
    - aggregate
    - service
    - event
    - command
    - query
    - context
    - bounded
  structural_signals:
    - new_class_definition
    - renamed_identifier
    - new_module
source:
  origin: file
  path: ddd-ubiquitous-language.md
  hash: "sha256:ff233c2ed7ddcc494dfae4e5fae2de754f11279de29e4345ff4108a11114478c"
---
# Ubiquitous Language

## When This Activates

Activates on diffs touching domain, model, entity, service, aggregate, or event files -- anywhere domain concepts are named or renamed. Ubiquitous language is DDD's foundational practice: the code must use the exact same terms that domain experts use, with no translation or technical substitution. When code names diverge from domain language, developers and domain experts talk past each other, requirements get misunderstood, and the model erodes. Every class, method, and variable in the domain layer is an opportunity to reinforce or undermine shared understanding.

## Audit Surface

- [ ] Class or interface name uses generic or technical term instead of domain vocabulary
- [ ] Same business concept has different names in two or more modules
- [ ] Method name describes how (processData, handleEvent) instead of what domain action occurs
- [ ] Variable name uses abbreviation that is not universally understood in the domain
- [ ] Boolean named with technical prefix rather than domain predicate (isActive vs. enrolled)
- [ ] Comment explains business meaning that the identifier should already express
- [ ] Enum values use technical codes instead of domain terms
- [ ] New code introduces a synonym for an existing domain term already in the codebase
- [ ] DTO or API field name diverges from the domain model name without an anti-corruption layer
- [ ] Module or package name does not correspond to a recognized bounded context or subdomain
- [ ] Domain term used in code does not match documentation, user stories, or acceptance criteria
- [ ] Renamed concept in diff breaks naming consistency with unchanged surrounding code

## Detailed Checks

### Generic and Technical Name Detection
<!-- activation: keywords=["class ", "interface ", "def ", "function ", "fun ", "fn ", "struct ", "enum "] -->

- [ ] **Generic names in domain layer**: flag classes named `DataProcessor`, `ItemHandler`, `RecordManager`, `InfoService` in domain packages -- these convey zero domain meaning
- [ ] **Implementation-describing methods**: flag method names like `processOrder`, `handlePayment`, `executeTransaction` where domain verbs exist (`placeOrder`, `settlePayment`, `bookTransaction`)
- [ ] **Technical jargon for domain concepts**: flag names like `blob`, `payload`, `record`, `row`, `node` used for domain entities -- use the domain term (Policy, Claim, Shipment)
- [ ] **CRUD verbs replacing domain verbs**: flag `createOrder`, `updateAccount`, `deleteSubscription` when domain-specific verbs exist (`placeOrder`, `adjustAccount`, `cancelSubscription`)

### Naming Inconsistency Across Contexts
<!-- activation: keywords=["import", "from", "require", "module", "package", "namespace"] -->

- [ ] **Synonym drift**: flag when the same concept is called `Customer` in one module, `Client` in another, and `User` in a third without explicit context mapping
- [ ] **Inconsistent field names**: flag when the same domain attribute is `amount` in one aggregate, `total` in another, and `sum` in a third
- [ ] **Import-time renaming**: flag aliases on domain imports that silently rename concepts (`from orders import Shipment as Delivery`) without anti-corruption layer justification
- [ ] **Cross-context name collision**: flag when two bounded contexts use the same term for different concepts without disambiguation

### Domain Predicate and State Naming
<!-- activation: keywords=["bool", "boolean", "Boolean", "flag", "is_", "has_", "should_", "can_", "status", "state"] -->

- [ ] **Technical boolean names**: flag `isFlag`, `hasData`, `isProcessed` when domain predicates exist (`overdue`, `funded`, `settled`, `eligible`)
- [ ] **Status enums with technical values**: flag `STATUS_1`, `ACTIVE`, `INACTIVE` when domain states exist (`Draft`, `UnderReview`, `Approved`, `Rejected`)
- [ ] **Negated names hiding domain meaning**: flag `notExpired`, `isNotBlocked` when affirmative domain terms exist (`valid`, `cleared`)

### Glossary Drift Detection
<!-- activation: keywords=["rename", "refactor", "alias", "name", "term", "glossary", "ubiquitous"] -->

- [ ] **Unexplained renaming**: flag diffs that rename a domain term without updating all references -- partial rename creates synonym drift
- [ ] **Comment-as-glossary**: flag comments like `// this is the customer's preferred shipping address` on a field named `addr2` -- the field name should say what the comment explains
- [ ] **New term without justification**: flag introduction of a new domain term that appears to mean the same thing as an existing term in the codebase

## Common False Positives

- **Infrastructure layer names**: technical names (`HttpClient`, `DatabaseConnection`, `MessageBroker`) are correct in infrastructure code -- only flag them if they appear in domain layer code.
- **Standard library types**: using `List`, `Map`, `Optional` is not a ubiquitous language violation -- these are type-system primitives, not domain concepts.
- **Cross-context intentional divergence**: in DDD, the same real-world concept legitimately has different names in different bounded contexts (e.g., `Product` in Catalog vs. `LineItem` in Ordering). Flag only when no context mapping exists.
- **Legacy code migration**: a diff may intentionally introduce new domain terms to replace legacy names. If the diff is systematically renaming, this is improvement, not drift.
- **Third-party API field names**: field names in external API responses may not match domain terms -- the anti-corruption layer handles translation. Flag only if the external name leaks into the domain model.

## Severity Guidance

| Finding | Severity |
|---|---|
| Domain entity class named with pure technical jargon (DataRecord, InfoBlob) in a domain package | Critical |
| Same domain concept named differently in 3+ places with no context mapping | Critical |
| Method name describes implementation (processData) where a clear domain verb exists | Important |
| New synonym introduced for an existing domain term without justification | Important |
| Boolean field uses technical prefix instead of domain predicate | Important |
| Comment explains domain meaning that the code name should already convey | Minor |
| Abbreviation used that is well-known within the team but not self-documenting | Minor |
| Enum value uses technical code alongside properly named values | Minor |

## See Also

- `principle-naming-and-intent` -- general naming discipline; ubiquitous language is the DDD-specific application of naming intent
- `ddd-strategic-bounded-contexts` -- naming consistency is enforced within a context; cross-context divergence requires explicit mapping
- `ddd-context-mapping` -- anti-corruption layers are where name translation is legitimate
- `antipattern-anemic-domain-model` -- anemic models often have generic names because the domain behavior that would demand precise names is missing
- `smell-feature-envy` -- methods envying another class often reveal naming misalignment between where logic lives and what it is called

## Authoritative References

- [Eric Evans, *Domain-Driven Design* (2003), Chapter 2: "Communication and the Use of Language"](https://www.oreilly.com/library/view/domain-driven-design-tackling/0321125215/)
- [Vaughn Vernon, *Implementing Domain-Driven Design* (2013), Chapter 1: "Getting Started with DDD" -- Ubiquitous Language](https://www.oreilly.com/library/view/implementing-domain-driven-design/9780133039900/)
- [Martin Fowler, "UbiquitousLanguage" (2006)](https://www.martinfowler.com/bliki/UbiquitousLanguage.html)
- [Alberto Brandolini, *Introducing EventStorming* (2021) -- collaborative domain discovery for shared language](https://www.eventstorming.com/)
