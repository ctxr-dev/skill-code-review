---
id: smell-primitive-obsession
type: primary
depth_role: leaf
focus: Detect domain concepts represented as raw primitive types instead of expressive value objects or domain types
parents:
  - index.md
covers:
  - "Domain concepts (email, money, URL, phone, status) represented as raw strings or ints"
  - "Monetary values stored as float/double without currency or precision control"
  - Status codes and enumerations represented as raw integers or magic strings
  - Boolean parameters that control branching inside the called function
  - Stringly-typed APIs where string values carry implicit structure or validation rules
  - Parallel arrays of primitives instead of arrays of structured objects
  - Raw tuples or arrays returned from functions instead of named types
  - "Date/time values passed as strings or epoch integers without timezone context"
  - "IDs of different entity types all typed as plain string or int (interchangeable by accident)"
  - Validation logic for a primitive scattered across multiple call sites instead of centralized in a type
tags:
  - primitive-obsession
  - bloater
  - value-object
  - domain-modeling
  - type-safety
  - clean-code
activation:
  file_globs:
    - "*"
  keyword_matches:
    - string
    - int
    - float
    - boolean
    - bool
    - number
    - str
    - any
    - Object
    - double
    - long
    - String
  structural_signals:
    - primitive_type_annotation
    - parameter_declaration
    - return_type_declaration
source:
  origin: file
  path: smell-primitive-obsession.md
  hash: "sha256:822d6ac82f855ad9cca1b80cf204be4a64e052f6ec195d223a557dc433bc6bd8"
---
# Primitive Obsession

## When This Activates

Activates when a diff introduces or modifies function signatures, variable declarations, or data structures that use primitive types (string, int, float, boolean) to represent domain concepts. Primitive Obsession is the Bloater smell that erodes type safety -- every domain concept encoded as a raw primitive is a validation gap and a bug waiting to happen.

## Audit Surface

- [ ] Parameter typed as string/int that represents a domain concept (email, currency code, URL, phone number, postal code)
- [ ] Float or double used for monetary calculation without decimal/money type
- [ ] Integer used as status code or enum value without a named enum or sealed type
- [ ] Boolean parameter that causes the function to branch into fundamentally different behavior
- [ ] String parameter parsed or validated with regex at multiple call sites
- [ ] Function returning a raw tuple or list of primitives instead of a named record/struct
- [ ] Parallel arrays (names[], ages[], emails[]) instead of array of Person objects
- [ ] Variable named with a unit suffix (priceInCents, durationMs, distanceKm) compensating for the type's lack of unit information
- [ ] String comparison used to check domain status instead of enum equality
- [ ] Different entity IDs (userId, orderId, productId) all typed as string or int with no type distinction
- [ ] Date or timestamp passed as string or long between function boundaries
- [ ] Map/dictionary with string keys acting as a poor-man's object

## Detailed Checks

### Domain Concepts as Strings
<!-- activation: keywords=["string", "str", "String", "email", "url", "phone", "address", "currency", "country", "postal", "zip"] -->

- [ ] Identify string parameters or fields whose names imply a constrained domain concept -- `email`, `url`, `phoneNumber`, `currencyCode`, `countryCode`, `postalCode` -- these should be value objects or at minimum branded/opaque types
- [ ] Check whether the same string validation (regex, length check, format assertion) appears at multiple call sites rather than being encapsulated in a single type constructor
- [ ] Flag functions that accept `string` and immediately parse it into components (splitting a "host:port" string, parsing "amount currency" pairs) -- the parsed structure should be the parameter type
- [ ] Identify string constants used as enum alternatives (`"active"`, `"pending"`, `"deleted"`) -- these should be a named enum or union type to get exhaustiveness checking
- [ ] Flag API boundaries where structured data is flattened into a single string (CSV in a field, JSON in a string column) instead of using a proper typed structure

### Numeric Primitives Carrying Semantics
<!-- activation: keywords=["int", "float", "double", "long", "number", "decimal", "price", "amount", "quantity", "duration", "distance", "weight"] -->

- [ ] Flag float/double used for money -- IEEE 754 floating point cannot precisely represent decimal fractions (0.1 + 0.2 != 0.3), leading to rounding bugs in financial calculations
- [ ] Identify integer status codes or magic numbers (`0 = success, 1 = error, 2 = pending`) that should be a named enum
- [ ] Check for numeric variables whose names include unit suffixes (`durationMs`, `distanceMiles`, `weightKg`) -- the unit should be encoded in the type, not the name, to prevent unit-mismatch bugs
- [ ] Flag integer IDs that are interchangeable by accident: `processOrder(userId: int, orderId: int)` -- swapping arguments compiles but is a bug. Distinct ID types prevent this.
- [ ] Identify arithmetic on raw integers that represents domain logic (adding days to a date stored as epoch seconds) -- use the language's date/time library instead

### Boolean Parameters and Flags
<!-- activation: keywords=["boolean", "bool", "flag", "true", "false", "Boolean"] -->

- [ ] Flag functions with a boolean parameter that causes fundamentally different behavior in each branch -- the two branches are two different functions and should be named separately
- [ ] Identify call sites where `true`/`false` literals are passed and the meaning is opaque without reading the function signature: `createUser(name, email, true, false)` -- what do those booleans mean?
- [ ] Check for functions accumulating multiple boolean parameters -- each combination is a different behavior mode, and the function is effectively a dispatcher hiding behind flags
- [ ] Flag boolean return values that carry more information than yes/no -- if callers need to know *why* something failed, return a result type or enum

### Tuples, Parallel Arrays, and Unstructured Returns
<!-- activation: keywords=["tuple", "Tuple", "Pair", "pair", "array", "list", "[]", "Dict", "dict", "Map", "map", "HashMap", "Record"] -->

- [ ] Flag functions returning tuples or pairs of primitives where positional access is the only way to identify which element is which -- `(string, int, bool)` return types are cryptic at call sites
- [ ] Identify parallel arrays (`names: string[], ages: int[], emails: string[]`) where index alignment is the only structural relationship -- replace with an array of structured objects
- [ ] Check for dictionaries with string keys used as ad-hoc objects (`config["host"]`, `config["port"]`, `config["protocol"]`) -- define a typed struct instead
- [ ] Flag functions that return more than two values as a tuple -- this is a strong signal that a named return type is needed
- [ ] Identify destructuring patterns that use positional indices (`result[0]`, `result[1]`) to access semantically distinct values from a collection return

### Scattered Validation
<!-- activation: keywords=["validate", "check", "parse", "regex", "match", "format", "isValid", "assert"] -->

- [ ] Check whether the same validation logic for a primitive appears in 2+ locations (e.g., email regex in both the API handler and the service layer) -- centralize in a value object constructor
- [ ] Flag defensive checks at function entry that parse or constrain a primitive parameter -- the parsed/constrained form should be the parameter type so callers cannot bypass validation
- [ ] Identify assertion-style guards (`if not is_valid_email(email): raise`) that would be unnecessary if the type system enforced validity at construction time
- [ ] Check for normalization logic (lowercasing, trimming, stripping) applied to primitives at multiple sites -- a value object constructor should normalize once

## Common False Positives

- **Language limitations**: Some languages (Go, C) lack lightweight value types or newtype idioms. Wrapping every string in a struct adds ceremony disproportionate to the benefit in small codebases. Flag only when the domain concept crosses module boundaries.
- **Standard library types**: Using `string` for a person's name or `int` for a loop counter is appropriate -- not every string is a domain concept. Flag only when the value has validation rules, formatting constraints, or distinct identity.
- **Performance-critical inner loops**: In hot paths, boxing primitives into value objects may have measurable overhead. Primitive use in tight numerical computation is acceptable.
- **Simple CRUD with external schema**: If the schema is defined externally (database, protobuf, OpenAPI) and types are generated, primitive fields in generated code are not actionable here -- review the schema definition instead.
- **Idiomatic patterns**: `bool` return for simple predicate functions (`isEmpty`, `contains`) is correct, not Primitive Obsession. Flag booleans only when they carry domain state or control branching.

## Severity Guidance

| Finding | Severity |
|---|---|
| Float/double used for monetary calculations | Critical |
| Different entity IDs (userId, orderId) interchangeable as plain int/string | Important |
| Domain concept (email, URL, status) as raw string crossing 3+ module boundaries without validation | Important |
| Boolean parameter causing fundamentally different behavior in each branch | Important |
| Parallel arrays used instead of array of structured objects | Important |
| String constants used as enum alternatives without exhaustiveness checking | Minor |
| Unit-suffixed variable name compensating for untyped numeric value in local scope | Minor |
| Tuple return from a private helper used in one call site | Minor |

## See Also

- `principle-encapsulation` -- value objects encapsulate validation and behavior with the data they protect
- `principle-solid` -- Primitive Obsession at API boundaries violates the Open/Closed Principle by forcing callers to know validation rules
- `smell-long-parameter-list` -- replacing primitives with value objects often consolidates multiple parameters into one
- `smell-data-clumps` -- groups of primitives that travel together are both a Data Clump and Primitive Obsession simultaneously

## Authoritative References

- [Martin Fowler, "Refactoring" (2018), Primitive Obsession smell](https://refactoring.com/catalog/)
- [Eric Evans, "Domain-Driven Design" (2003), Value Objects](https://www.domainlanguage.com/ddd/)
- [Martin Fowler, "When to Make a Type" (bliki)](https://martinfowler.com/bliki/ValueObject.html)
- [J.B. Rainsberger, "Primitive Obsession" (blog)](https://blog.thecodewhisperer.com/permalink/primitive-obsession)
