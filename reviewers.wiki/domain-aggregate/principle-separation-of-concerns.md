---
id: principle-separation-of-concerns
type: primary
depth_role: leaf
focus: Ensure distinct concerns live in distinct modules with no cross-contamination
parents:
  - index.md
covers:
  - "Business logic entangled with I/O, networking, or database access"
  - Parsing, validation, and transformation mixed in a single function
  - "Presentation/rendering logic embedded in domain models"
  - "Cross-cutting concerns (logging, auth, metrics) inlined in business methods"
  - Configuration loading mixed with application logic
  - Error handling policy mixed with error detection
  - Orchestration mixed with computation
  - Serialization format details leaking into domain types
  - "Infrastructure details (SQL, HTTP, file paths) in core domain code"
  - Multiple reasons to change in a single class or function
tags:
  - separation-of-concerns
  - architecture
  - layering
  - modularity
  - single-responsibility
  - clean-architecture
activation:
  file_globs:
    - "**/*"
  structural_signals:
    - Any code change
source:
  origin: file
  path: principle-separation-of-concerns.md
  hash: "sha256:dacbb5b2daff0258f7521d6bfbe1316ffe402863739d7ff25aa87c0164a48748"
---
# Separation of Concerns Reviewer

## When This Activates

Always active on every diff. Every code change has the potential to blend responsibilities. This reviewer ensures that distinct concerns remain in distinct places and that modules have exactly one reason to change.

## Audit Surface

- [ ] Function that performs I/O and also computes business results
- [ ] Domain model with serialization annotations or database column mappings
- [ ] Controller/handler containing business rules instead of delegating
- [ ] Logging statements inside pure computation functions
- [ ] Authentication/authorization checks embedded in domain logic
- [ ] SQL queries or HTTP calls inside domain service methods
- [ ] Validation logic duplicated across multiple layers
- [ ] Error formatting (user-facing messages) inside low-level library code
- [ ] File path construction or environment variable reads in business logic
- [ ] Single function that parses input, processes it, and writes output
- [ ] Test setup that must configure I/O infrastructure to test a business rule
- [ ] Module importing both domain types and infrastructure libraries

## Detailed Checks

### Business Logic Mixed with I/O
<!-- activation: keywords=["open(", "read(", "write(", "fetch(", "request", "query(", "execute(", "SELECT", "INSERT", "http", "socket", "File", "Path"] -->

- [ ] Flag functions that both compute a business result and perform a side effect (database read/write, HTTP call, file I/O) -- split into pure computation + I/O orchestration
- [ ] Check whether domain service methods directly call repository implementations instead of depending on abstractions
- [ ] Identify business logic buried inside database query callbacks, HTTP response handlers, or file-read completions
- [ ] Verify that retry logic, timeout configuration, and circuit-breaking live in the infrastructure layer, not sprinkled through business methods
- [ ] Look for transaction management (begin/commit/rollback) inside domain logic rather than at the service/use-case boundary

### Presentation Leaking into Domain
<!-- activation: keywords=["render", "template", "html", "json", "xml", "toString", "format", "response", "view", "dto", "serialize"] -->

- [ ] Flag domain models that contain `toJson()`, `toXml()`, or `render()` methods -- serialization is a separate concern
- [ ] Check for domain types annotated with framework-specific decorators (`@JsonProperty`, `@Column`, `@SerializedName`) -- these couple the domain to infrastructure
- [ ] Identify controllers/handlers that format domain objects directly into HTTP responses instead of mapping through a DTO or view model
- [ ] Verify that error messages returned to users are constructed in the presentation layer, not inside domain exceptions
- [ ] Look for string formatting of domain data (currency, dates, numbers) inside domain methods rather than in a presentation/formatter layer

### Cross-Cutting Concern Discipline
<!-- activation: keywords=["log", "logger", "metric", "trace", "audit", "auth", "permission", "cache", "retry", "rate_limit"] -->

- [ ] Flag logging calls inside pure functions or core algorithms -- prefer structured logging at orchestration boundaries
- [ ] Check that authentication and authorization are enforced at the entry point (middleware, decorator, interceptor) rather than checked ad-hoc inside business methods
- [ ] Verify that caching is applied via a decorator, proxy, or aspect rather than manually checking and populating cache inside business logic
- [ ] Identify metrics instrumentation embedded deep inside domain methods instead of at service boundaries
- [ ] Look for retry logic copy-pasted across multiple call sites instead of abstracted into a policy or decorator

### Parse, Don't Validate -- Concern Layering
<!-- activation: keywords=["parse", "validate", "check", "assert", "if ", "guard", "require", "throw", "raise", "error"] -->

- [ ] Verify that input parsing/validation produces a typed result, so downstream code does not need to re-validate
- [ ] Flag business logic that defensively checks data integrity that should have been enforced at the boundary (double-validation smell)
- [ ] Check for raw strings or untyped dicts flowing deep into the system instead of being parsed into domain types at the edge
- [ ] Identify validation rules split across multiple layers with no single source of truth -- risks inconsistency
- [ ] Verify that error detection (finding the problem) is separate from error policy (deciding what to do about it) -- low-level code should report, callers should decide

## Common False Positives

- **Composition roots / wiring code**: DI containers, main() functions, and app bootstraps naturally touch many concerns to wire them together -- this is their job.
- **Frameworks requiring annotations**: Some frameworks require domain classes to carry annotations (e.g., JPA entities, Django models) -- flag only when the concern could be separated (e.g., separate mapping files, repository pattern).
- **Small scripts or CLI tools**: A 50-line script that reads a file, processes it, and writes output may not need full layered architecture -- apply proportionally.
- **Logging at function entry/exit**: Structured logging at service method boundaries is standard practice and not a violation.
- **DTOs that mirror domain models**: Having a separate DTO that looks like the domain model is not duplication -- it is intentional decoupling.

## Severity Guidance

| Finding | Severity |
|---|---|
| SQL/HTTP calls inside domain/core business logic | Important |
| Business rules in a controller or request handler | Important |
| Domain model with infrastructure-specific annotations and no separation path | Minor |
| Auth checks inlined in business methods instead of at boundary | Important |
| Pure function with logging side effects | Minor |
| Single function that parses + validates + processes + writes | Important |
| Cross-cutting concern (cache, retry) manually inlined in 3+ places | Important |
| Validation rules duplicated across layers with inconsistencies | Important |
| Error messages formatted for users inside library/domain code | Minor |

## See Also

- `principle-coupling-cohesion` -- SoC violations are the leading cause of high coupling and low cohesion
- `principle-law-of-demeter` -- Navigation chains often indicate that one concern is reaching into another's internals

## Authoritative References

- [Edsger Dijkstra - "On the Role of Scientific Thought" (1974, coined the term)](https://www.cs.utexas.edu/~EWD/transcriptions/EWD04xx/EWD447.html)
- [Robert C. Martin - "Clean Architecture"](https://www.oreilly.com/library/view/clean-architecture/9780134494272/)
- [Alistair Cockburn - "Hexagonal Architecture"](https://alistair.cockburn.us/hexagonal-architecture/)
- [Mark Seemann - "Dependency Injection in .NET" (composition root pattern)](https://www.manning.com/books/dependency-injection-principles-practices-patterns)
- [Alexis King - "Parse, Don't Validate"](https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/)
