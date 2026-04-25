---
id: antipattern-copy-paste
type: primary
depth_role: leaf
focus: Detect copy-pasted code blocks that introduce duplication, divergence risk, and latent bugs from imperfect adaptation
parents:
  - index.md
covers:
  - "Identical code blocks (5+ lines) repeated within the same file"
  - Near-identical blocks across sibling files differing only in variable names or literals
  - Copy-paste with incomplete adaptation — variable names from the source left in the copy
  - "Parallel switch/if-else branches with identical structure but different field names"
  - Test cases duplicated verbatim with only the input data changed
  - Error handling blocks copy-pasted with wrong error messages or codes
  - Configuration blocks duplicated across environments with subtle drift
  - API endpoint handlers with identical structure differing only in the entity name
  - SQL queries duplicated with minor WHERE clause variations
  - Copy-pasted validation logic that diverges over time between copies
  - Identical code blocks of 3+ lines appearing in multiple locations
  - Near-identical blocks differing only in variable names, literals, or types
  - "Parallel switch/if-else branches with the same structural pattern but different data"
  - "Duplicated logic across test cases (identical arrange or assert blocks)"
  - Duplicated validation or transformation pipelines across endpoints or handlers
  - Copy-paste code with subtle bugs from imperfect adaptation
  - Same algorithm implemented independently in sibling files or modules
  - "Duplicated error handling patterns (identical try-catch blocks across methods)"
  - Same SQL query or API call constructed at multiple call sites
  - Structural duplication across subclasses performing the same steps in the same order with minor variations
tags:
  - copy-paste
  - duplication
  - dry
  - clone
  - divergence
  - bug
  - duplicate-code
  - dispensable
  - readability
  - architecture
  - correctness
  - clean-code
aliases:
  - smell-duplicate-code
activation:
  file_globs:
    - "**/*"
  structural_signals:
    - Any code diff
source:
  origin: file
  path: antipattern-copy-paste.md
  hash: "sha256:3ef5b8ce0c181e1ddb2353290c5b7be0da272cf56c6463a7926e8faed87dc880"
---
# Copy-Paste Anti-Pattern

## When This Activates

Always active. Copy-paste is the most common source of latent bugs in production code. The danger is not the initial duplication — it is the divergence that follows: one copy gets fixed, the other does not. This reviewer focuses on detecting both exact clones and near-clones with incomplete adaptation, where the adaptation bugs are often more severe than the duplication itself.

## Audit Surface

- [ ] Two code blocks in the same file with 5+ lines of identical or near-identical structure
- [ ] Sibling files with 70%+ structural similarity (same directory, same purpose, different entity)
- [ ] Variable name from a different context left in the pasted code (stale name — the highest-severity copy-paste bug)
- [ ] Error message or log string referencing the wrong function, entity, or operation
- [ ] Parallel if/switch branches with the same shape but different field accesses
- [ ] Test methods with identical bodies except for input literals
- [ ] Duplicated SQL/query strings with only table or column names changed
- [ ] Endpoint handlers following an identical pattern across 3+ routes
- [ ] Validation rules duplicated between client and server with no shared source of truth
- [ ] Configuration blocks repeated across environment files with inconsistent values
- [ ] Exception handling blocks identical across 3+ catch sites
- [ ] Copy-pasted comments describing the wrong code
- [ ] Duplicated utility function in two modules instead of a shared import
- [ ] Changelog or ticket reference in a comment belonging to the source, not the copy

## Detailed Checks

### Stale-Name Bugs (Incomplete Adaptation)
<!-- activation: keywords=["copy", "paste", "duplicate", "similar", "same", "like"] -->

- [ ] Variable, function, or class name from the original context appears in the copied block — the author renamed most references but missed one or more
- [ ] Error message says "Failed to create user" in a block that handles order creation — string not updated after paste
- [ ] Log statement references the wrong method name or module name — leftover from the source
- [ ] Comment describes behavior of the original code, not the adapted copy
- [ ] Test assertion checks the wrong field because the assertion was copied from a test for a different entity
- [ ] Copied SQL query references the original table name in a WHERE clause but the correct table in the FROM clause

### Structural Clones Within a File
<!-- activation: keywords=["if", "else", "switch", "case", "match", "try", "catch", "for", "function", "def", "fn"] -->

- [ ] Two or more if/else or switch branches with identical structure but different field names — extract a parameterized helper
- [ ] Sequential try/catch blocks with identical catch handling — extract the error handling into a shared function
- [ ] Multiple methods with the same body structure differing only in which field they access — generalize with a parameter or accessor function
- [ ] Repeated setup-execute-teardown sequences within the same file — extract into a template method or higher-order function

### Cross-File Clones
<!-- activation: keywords=["import", "require", "class", "handler", "controller", "service", "repository"] -->

- [ ] Sibling files for different entities (UserService/OrderService/ProductService) with 70%+ identical structure — extract a generic base or factory
- [ ] Endpoint handlers across route files with identical middleware, validation, error handling differing only in entity type — extract a route factory or generic handler
- [ ] Migration files with duplicated boilerplate — extract shared migration helpers
- [ ] Configuration files for different environments with copy-pasted blocks that have drifted — use templating or overlays with environment-specific overrides only

### Test Duplication
<!-- activation: keywords=["test", "it(", "describe", "spec", "expect", "assert", "should"] -->

- [ ] Test cases with identical bodies differing only in input data — convert to parameterized/table-driven tests
- [ ] Test setup (beforeEach, setUp) duplicated across test files — extract into shared fixtures or factories
- [ ] Assertion blocks copy-pasted with the wrong expected value (the most dangerous test duplication bug — the test passes but checks the wrong thing)
- [ ] Mock configurations duplicated across test files — extract into a mock factory or fixture module

### Query and Data-Access Duplication
<!-- activation: keywords=["SELECT", "INSERT", "UPDATE", "DELETE", "query", "sql", "find", "where", "FROM"] -->

- [ ] SQL query strings duplicated with only table/column names changed — extract a parameterized query builder or use an ORM
- [ ] Repository methods with identical query patterns for different entities — consider a generic repository
- [ ] Duplicated filter/sort/pagination logic across different data-access methods — extract into a query specification pattern
- [ ] API request construction duplicated across service methods — extract an HTTP client wrapper with shared configuration

## Common False Positives

- **Intentional denormalization**: some architectures deliberately duplicate data or logic across bounded contexts for decoupling. Verify the duplication is a conscious architectural decision, not accidental copy-paste.
- **Two is coincidence, three is a pattern**: two similar blocks may evolve independently. Flag duplication starting at 3 occurrences or when blocks are 10+ lines, not at the first pair of 3-line similarities.
- **Boilerplate required by the language/framework**: Go error handling, Java checked exceptions, React component scaffolding — some structural repetition is idiomatic. Flag only when the non-boilerplate logic within the structure is also duplicated.
- **Generated code**: protobuf stubs, ORM migrations, codegen output — duplication in generated files is expected. Flag only if hand-written code duplicates generated patterns instead of using the generated API.
- **Test readability**: some duplication in tests aids readability by keeping each test self-contained. Flag only when the duplication is 10+ lines or introduces adaptation bugs.

## Severity Guidance

| Finding | Severity |
|---|---|
| Stale variable name from source context left in copied code (wrong-entity bug) | Critical |
| Error message or log referencing wrong operation after copy-paste | Critical |
| Security-sensitive logic (auth, validation, sanitization) duplicated and diverging | Critical |
| Test assertion checking wrong field due to incomplete adaptation | Important |
| 10+ line structural clone within the same file | Important |
| Sibling files with 70%+ identical structure and no shared abstraction | Important |
| SQL queries duplicated with only table name differences | Minor |
| Test cases with identical bodies differing only in input (parameterize candidate) | Minor |
| Configuration duplication across environment files | Minor |
| 5-line structural similarity with no adaptation bugs | Minor |

## See Also

- `principle-dry-kiss-yagni` — DRY principle is the direct antidote; but premature abstraction is also a risk
- `smell-duplicate-code` — the Fowler code smell focused on structural duplication detection
- `smell-shotgun-surgery` — duplicated logic often causes shotgun surgery when one copy needs updating
- `smell-divergent-change` — copies that diverge over time create files changed for unrelated reasons
- `antipattern-lava-flow` — old copies that nobody dares remove become lava flow

## Authoritative References

- [Martin Fowler — "Refactoring" (2018), Duplicated Code smell](https://martinfowler.com/books/refactoring.html)
- [The Pragmatic Programmer — DRY Principle](https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition/)
- [CK Metrics — Copy-Paste Detection in Software](https://ieeexplore.ieee.org/document/738528)
- [jscpd — Copy/Paste Detector](https://github.com/kucherenko/jscpd)
