---
id: principle-naming-and-intent
type: primary
depth_role: leaf
focus: Ensure names reveal intent, maintain consistent vocabulary, and eliminate the need for explanatory comments
parents:
  - index.md
covers:
  - Vague or generic names that require reading the implementation to understand
  - Abbreviations and acronyms not universally understood by the team
  - Inconsistent vocabulary for the same concept across the codebase
  - Boolean variables and functions missing predicate-style naming
  - Functions named as nouns or types named as verbs
  - Names that lie -- describing what the code used to do, not what it does now
  - Single-letter variables outside trivial loop iterators
  - Domain terms used inconsistently or different from the ubiquitous language
  - Negated boolean names that force double-negative reasoning
  - "Names carrying encoding of type or scope (Hungarian notation) in modern languages"
tags:
  - naming
  - readability
  - intent
  - vocabulary
  - domain-language
  - clean-code
activation:
  file_globs:
    - "**/*"
  keyword_matches: []
  structural_signals:
    - Any code diff
source:
  origin: file
  path: principle-naming-and-intent.md
  hash: "sha256:3ec11ebde01d20e018d7fc71e01d3d8805f025413f6655651d508a3b7b6309ab"
---
# Naming and Intent Clarity

## When This Activates

Always loaded. Naming is the most impactful readability decision in every diff. Poor names are the number-one reason code requires comments, causes misuse, and resists refactoring. This reviewer checks every introduced or changed identifier.

## Audit Surface

- [ ] Variables named data, info, temp, result, val, item, obj, thing, stuff without qualifier
- [ ] Functions named handle, process, manage, do, run, execute without object noun
- [ ] Boolean variables/parameters missing is/has/should/can/will prefix
- [ ] Abbreviations (mgr, ctx, cnt, btn, arr, str, num, idx, cfg) not universally obvious
- [ ] Function name does not contain a verb (nouny function names)
- [ ] Class/type name contains a verb instead of a noun or noun phrase
- [ ] Name length mismatched to scope -- single-letter name in wide scope or 40-char name in 3-line lambda
- [ ] Renamed concept -- same entity called different names in different layers
- [ ] Negated boolean (notReady, isNotValid, disableFeature) forcing double-negative logic
- [ ] Comment explaining what a variable holds -- the name should have said it
- [ ] Magic number or string with no named constant or explanatory variable
- [ ] Plural name for single item, or singular name for collection

## Detailed Checks

### Intent-Revealing Names
<!-- activation: keywords=["name", "variable", "rename", "identifier", "label"] -->

- [ ] Every new variable name answers "what does this hold?" without reading the assignment -- `userEmailsByDepartment` over `data` or `map`
- [ ] Every new function name answers "what does this do?" without reading the body -- `calculateMonthlyRevenue` over `process` or `handle`
- [ ] Intermediate variables in complex expressions are named to explain the sub-result they hold, not named `temp` or `x`
- [ ] Renamed identifiers in the diff actually reflect the current semantics -- not leftover from a previous iteration's meaning
- [ ] Explanatory comments next to assignments are a signal the variable name should absorb the comment content
- [ ] Names do not encode type information that the type system already provides (no `strName`, `arrItems`, `iCount` in statically typed languages)

### Grammatical Conventions
<!-- activation: keywords=["boolean", "bool", "flag", "predicate", "getter", "setter", "is", "has", "should"] -->

- [ ] Booleans read as predicates: `isEnabled`, `hasPermission`, `shouldRetry`, `canProceed` -- not `enabled` (ambiguous: "set enabled" vs "is enabled?") and never `flag` or `status`
- [ ] Functions start with a verb: `fetchUser`, `validateInput`, `formatDate` -- nouns are for types and variables
- [ ] Classes and types are noun phrases: `PaymentProcessor`, `UserRepository`, `HttpClient` -- not `ProcessPayment` or `HandleRequest`
- [ ] Event handlers follow `on<Event>` or `handle<Event>` convention consistently throughout the codebase
- [ ] Conversion functions use `toX` or `fromX` pattern: `toJson`, `fromDto`, `asReadOnly`
- [ ] Factory methods use `create`, `of`, `from`, or `build` prefix consistently -- do not mix within the same codebase

### Vocabulary Consistency
<!-- activation: keywords=["user", "customer", "client", "account", "fetch", "get", "retrieve", "load", "find"] -->

- [ ] The same domain concept uses the same word everywhere -- if the domain says "customer" do not use "user", "client", "account", and "buyer" interchangeably across modules
- [ ] Synonymous actions pick one verb and use it consistently: either `get` or `fetch` or `retrieve` for the same operation type -- not all three in different services
- [ ] The diff does not introduce a new synonym for a concept that already has an established name in the codebase
- [ ] Acronyms used in names match the project glossary or domain model -- no ad-hoc abbreviations that differ from established ones
- [ ] External API or library naming conventions are adapted to the project's vocabulary at the boundary, not leaked into the domain layer

### Scope-Appropriate Length
<!-- activation: keywords=["i", "j", "x", "tmp", "temp", "result", "res", "ret", "value", "val"] -->

- [ ] Single-letter variables are limited to: loop counters (`i`, `j`, `k`), lambda parameters in trivial one-line expressions, and conventional mathematical notation in algorithm code
- [ ] Variables with wide scope (class fields, module-level, parameters passed through multiple layers) have descriptive multi-word names
- [ ] Very long names (>30 characters) are justified by a proportionally wide scope or complex domain -- not used for a 3-line utility function's local variable
- [ ] Shadowed variable names (same name in nested scope) are renamed to disambiguate, especially if the outer variable is still reachable

## Common False Positives

- **Language idioms**: Some languages have strong conventions for short names: `err` in Go, `_` for unused bindings, `self`/`this`, `ctx` in middleware chains. Respect ecosystem norms.
- **Mathematical code**: Algorithm implementations legitimately use single-letter names matching the paper or formula (`x`, `y`, `n`, `k`, `alpha`). Flag only when the reader audience is not expected to know the formula.
- **Generated code**: Auto-generated files (protobuf, GraphQL codegen, ORM models) may have names dictated by the schema. Focus on the schema definition, not the generated output.
- **Standard abbreviations**: `id`, `url`, `http`, `io`, `db`, `api`, `ui`, `os`, `fs` are universally understood and do not need expansion.
- **Callback parameters**: In event-driven code, `e`, `evt`, `req`, `res` are well-established conventions within their frameworks.

## Severity Guidance

| Finding | Severity |
|---|---|
| Name that actively misleads (describes old behavior, opposite of actual semantics) | Important |
| Public API function/method with opaque name requiring implementation reading | Important |
| Domain concept using inconsistent vocabulary across a module boundary | Important |
| Boolean without predicate prefix in a public interface | Minor |
| Generic name (data, result) in a local scope under 10 lines | Minor |
| Abbreviation that is standard within the project's established convention | Minor |
| Comment-as-name-supplement for a complex intermediate variable | Minor |

## See Also

- `principle-dry-kiss-yagni` -- generic names enable hidden duplication; specific names make duplication obvious
- `principle-least-astonishment` -- misleading names are the primary source of reader surprise
- `principle-command-query-separation` -- naming conventions (get vs create vs update) signal whether a function is a query or command

## Authoritative References

- [Clean Code, Ch. 2: Meaningful Names - Robert C. Martin](https://www.oreilly.com/library/view/clean-code-a/9780136083238/)
- [Domain-Driven Design, Ch. 2: Ubiquitous Language - Eric Evans](https://www.domainlanguage.com/ddd/)
- [Code Complete, Ch. 11: The Power of Variable Names - Steve McConnell](https://www.microsoftpressstore.com/store/code-complete-9780735619678)
- [A Philosophy of Software Design, Ch. 14: Choosing Names - John Ousterhout](https://web.stanford.edu/~ouster/cgi-bin/book.php)
