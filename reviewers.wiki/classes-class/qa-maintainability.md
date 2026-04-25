---
id: qa-maintainability
type: primary
depth_role: leaf
focus: Detect aggregated maintainability-index signals including high cyclomatic complexity, low cohesion, high coupling, missing tests for changed code, magic numbers, long methods, and deep nesting
parents:
  - index.md
covers:
  - Functions or methods with cyclomatic complexity exceeding 10
  - Classes with low cohesion — methods operate on disjoint subsets of fields
  - High efferent coupling — module imports from 8+ distinct packages
  - Changed production code with no corresponding test additions or updates
  - Magic numbers and strings used instead of named constants
  - "Methods exceeding 40 lines of logic (excluding blank lines and comments)"
  - Nesting depth exceeding 3 levels of control flow
  - Deeply nested callbacks or promise chains without extraction
  - Boolean parameters controlling branching inside a function
  - Comment-to-code ratio indicating compensatory commenting for unclear code
tags:
  - maintainability
  - complexity
  - cyclomatic
  - cohesion
  - coupling
  - magic-numbers
  - nesting
  - long-method
  - test-coverage
activation:
  file_globs:
    - "**/*"
  keyword_matches:
    - if
    - else
    - switch
    - case
    - for
    - while
    - try
    - catch
    - TODO
    - FIXME
    - HACK
  structural_signals:
    - Long method body
    - Deep nesting in control flow
    - Multiple branching statements in single function
source:
  origin: file
  path: qa-maintainability.md
  hash: "sha256:6df85bb4466720bc6e72d24ee3b032e57ea5be3811ee60dce7fc5fc748a14763"
---
# Maintainability Index Signals

## When This Activates

Activates on any diff that adds or modifies logic-bearing code. Maintainability is an aggregate quality attribute composed of complexity, cohesion, coupling, test coverage of changed code, and code clarity. A single metric in isolation can mislead; this reviewer looks for convergence of multiple signals. When several maintainability indicators degrade in the same file or function, the combined effect on future change cost is multiplicative, not additive.

## Audit Surface

- [ ] Function with more than 4 branching statements (if, else, case, &&, ||, ternary)
- [ ] Class where methods cluster into 2+ disjoint groups that never call each other
- [ ] Module importing from 8+ distinct packages
- [ ] Changed production file with no corresponding test file change in the diff
- [ ] Numeric literal used in logic or comparison without named constant
- [ ] String literal used as key, status, or type discriminator without constant
- [ ] Method body exceeding 40 lines of logic
- [ ] Code indented 4+ levels deep (nested if/for/while/try)
- [ ] Callback nested 3+ levels without extraction into named functions
- [ ] Boolean parameter used to select between two code paths inside a function
- [ ] Function with 5+ parameters
- [ ] Commented-out code left in production files
- [ ] TODO/FIXME/HACK comments without tracking references

## Detailed Checks

### Cyclomatic and Cognitive Complexity
<!-- activation: keywords=["if", "else", "switch", "case", "for", "while", "try", "catch", "&&", "||", "?", "match", "when"] -->

- [ ] **Branching density**: count branching statements (if, else if, case, &&, ||, ternary) per function -- more than 10 indicates high cyclomatic complexity; consider extracting branches into strategy or table-driven approaches
- [ ] **Cognitive complexity**: nested branches and loops compound cognitive load beyond what cyclomatic complexity captures -- a 3-deep nested if-for-if is harder to reason about than 3 sequential ifs; flag nesting depth > 3
- [ ] **Early return neglect**: functions that use nested if-else chains where guard-clause early returns would flatten the structure -- refactor to fail-fast returns
- [ ] **Boolean parameter branching**: function accepts a boolean that selects between two entirely different code paths -- split into two named functions

### Magic Numbers and Unnamed Constants
<!-- activation: keywords=["==", "!=", ">", "<", ">=", "<=", "timeout", "retry", "limit", "max", "min", "threshold", "size", "count", "port"] -->

- [ ] **Numeric literals in comparisons**: flag raw numbers in conditions (e.g., `if count > 50`, `retry 3 times`) -- extract to named constants that explain the business meaning
- [ ] **String literals as discriminators**: flag strings used as type tags, status values, or dictionary keys repeated across files (e.g., `status == "pending"`) -- define as constants or enums
- [ ] **Timeout and retry values**: flag hardcoded timeout durations, retry counts, or buffer sizes -- extract to configuration or named constants with documentation of how the value was chosen

### Long Methods and Deep Nesting
<!-- activation: keywords=["def ", "func ", "function ", "fn ", "method", "=>", "->"] -->

- [ ] **Method length**: flag methods exceeding 40 lines of logic -- long methods are harder to name, test, and reuse; extract cohesive blocks into well-named helper functions
- [ ] **Deep nesting**: flag code indented 4+ levels -- each level of nesting adds a precondition the reader must hold in working memory; extract inner blocks or invert conditions with early returns
- [ ] **Callback nesting**: flag callback chains or nested `.then()` / `.subscribe()` calls 3+ levels deep -- refactor to async/await, named functions, or reactive composition operators

### Missing Tests for Changed Code
<!-- activation: keywords=["class ", "def ", "func ", "function ", "fn ", "pub ", "export", "module"] -->

- [ ] **Production change without test change**: flag production files modified in the diff with no corresponding test file change -- new logic needs new tests; modified logic needs updated tests
- [ ] **New public API without test**: flag new public functions, methods, or exported symbols that have no corresponding test in the diff -- untested public surface is a maintenance liability
- [ ] **Complex logic without edge-case tests**: flag functions with cyclomatic complexity > 5 whose test file (if present) adds fewer test cases than branches -- each branch needs at least one test

### Code Hygiene Signals
<!-- activation: keywords=["TODO", "FIXME", "HACK", "XXX", "TEMP", "WORKAROUND", "//", "#", "/*"] -->

- [ ] **Commented-out code**: flag blocks of commented-out code in production files -- commented-out code decays quickly; use version control instead
- [ ] **Untracked TODOs**: flag TODO, FIXME, or HACK comments without a ticket reference or issue link -- orphaned TODOs accumulate indefinitely; attach a tracking reference or resolve them
- [ ] **Compensatory comments**: flag inline comments that explain what the code does (as opposed to why) -- the code itself should be readable; if a comment is needed to explain logic, the logic should be simplified or renamed

## Common False Positives

- **Generated code**: protobuf stubs, ORM models, and serialization code may have high complexity metrics by nature -- skip generated files.
- **Configuration files**: large config files with many entries are not "long methods" -- they are data, not logic.
- **Math-heavy algorithms**: numerical computing, physics simulations, and cryptographic code may have inherently high complexity that cannot be simplified without sacrificing correctness.
- **Test files**: test files often have long setup blocks and many literal values; apply maintainability checks to production code, not test fixtures.
- **Domain constants**: numeric values with universally understood meaning (HTTP 200, port 443, 100 percent) may not need named constants.

## Severity Guidance

| Finding | Severity |
|---|---|
| Function with cyclomatic complexity > 15 | Critical |
| Production logic change with zero test coverage | Critical |
| Nesting depth > 4 levels in logic-bearing code | Important |
| Method exceeding 60 lines of logic | Important |
| Magic number in business rule without named constant | Important |
| Boolean parameter controlling two distinct code paths | Minor |
| TODO without ticket reference | Minor |
| Commented-out code block (< 5 lines) | Minor |

## See Also

- `principle-coupling-cohesion` -- coupling and cohesion are core maintainability drivers
- `principle-dry-kiss-yagni` -- duplication and over-engineering degrade maintainability
- `principle-separation-of-concerns` -- mixed concerns inflate complexity
- `test-unit-discipline` -- test quality determines whether tests actually catch regressions in maintained code
- `principle-encapsulation` -- poor encapsulation forces callers to understand internals, reducing maintainability

## Authoritative References

- [Thomas J. McCabe, "A Complexity Measure" (1976) -- cyclomatic complexity definition](https://ieeexplore.ieee.org/document/1702388)
- [SonarSource, "Cognitive Complexity" (2017) -- cognitive complexity as a maintainability metric](https://www.sonarsource.com/resources/cognitive-complexity/)
- [Robert C. Martin, *Clean Code* (2008), Chapters 3-4 -- function length, naming, and comments](https://www.oreilly.com/library/view/clean-code-a/9780136083238/)
- [ISO/IEC 25010:2023 -- Systems and software quality models (maintainability sub-characteristics)](https://www.iso.org/standard/78176.html)
