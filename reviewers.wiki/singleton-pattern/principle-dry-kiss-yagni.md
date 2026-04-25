---
id: principle-dry-kiss-yagni
type: primary
depth_role: leaf
focus: Flag duplication, unnecessary complexity, and speculative features that hurt maintainability
parents:
  - index.md
covers:
  - Copy-pasted logic blocks with minor variations
  - Parallel data structures that drift out of sync
  - Overly clever one-liners that sacrifice readability for brevity
  - Deep nesting where early returns or extraction would simplify
  - Speculative parameters, flags, or extension points with no current caller
  - Premature abstraction creating indirection without reuse
  - God functions doing unrelated things in sequence
  - Configuration surfaces wider than any consumer needs
  - Magic numbers or strings repeated across files
  - Wrapper classes that add no behavior over the wrapped type
tags:
  - dry
  - kiss
  - yagni
  - simplicity
  - duplication
  - over-engineering
activation:
  file_globs:
    - "**/*"
  keyword_matches: []
  structural_signals:
    - Any code diff
source:
  origin: file
  path: principle-dry-kiss-yagni.md
  hash: "sha256:18b474a6839f096a8090df07d424cf4d0ce10ab3a58d976296537713385777c3"
---
# Pragmatic Simplicity: DRY, KISS, YAGNI

## When This Activates

Always loaded. These three principles are the most frequently violated in everyday diffs and apply to every language and paradigm. The reviewer checks whether the diff introduces duplication, unnecessary complexity, or speculative code.

## Audit Surface

- [ ] Identical or near-identical code blocks in same file or sibling files
- [ ] Parallel if/switch branches with shared structure but different field names
- [ ] Functions longer than 40 lines doing multiple unrelated things
- [ ] Nested ternaries or boolean expressions exceeding two operators
- [ ] Type hierarchies deeper than two levels with no polymorphic dispatch
- [ ] Unused function parameters carried forward from an old signature
- [ ] Generic/template parameters only ever instantiated with one type
- [ ] Feature flags or strategy patterns with exactly one implementation
- [ ] Builder or factory patterns for objects with fewer than four fields
- [ ] String literals duplicated more than twice without a named constant
- [ ] Comments explaining what code does rather than why (complexity smell)
- [ ] Abstractions introduced in the same PR as their only consumer

## Detailed Checks

### DRY: Duplication Detection
<!-- activation: keywords=["copy", "duplicate", "same", "similar", "repeat"] -->

- [ ] Two or more code blocks share the same logical structure with only names or literals varying -- extract a parameterized helper
- [ ] Parallel data structures (e.g., two enums, two maps, two switch statements) that must be kept in sync manually -- unify into a single source of truth
- [ ] Test setup code duplicated across test cases instead of using shared fixtures or helpers
- [ ] Error messages or user-facing strings repeated verbatim -- centralize in a constants module or i18n layer
- [ ] Configuration values scattered across files rather than defined in one place and referenced
- [ ] DTO/model definitions duplicated between layers (API, service, persistence) where mapping or shared types would suffice

### KISS: Complexity Detection
<!-- activation: keywords=["complex", "nested", "clever", "refactor", "simplify"] -->

- [ ] Nested callbacks, promise chains, or control flow deeper than three levels -- flatten with early returns, async/await, or extraction
- [ ] Clever bitwise tricks, regex one-liners, or reduce-chains where a simple loop would be clearer
- [ ] Overuse of metaprogramming (reflection, macros, decorators) for problems solvable with plain functions
- [ ] State machines with implicit transitions -- make states and transitions explicit
- [ ] Multi-step data transformations that could be a simple pipeline but are tangled into a single block
- [ ] Boolean parameters that fork function behavior -- split into two named functions instead

### YAGNI: Speculative Feature Detection
<!-- activation: keywords=["future", "TODO", "might", "maybe", "extensible", "generic", "abstract"] -->

- [ ] Abstract base classes or interfaces with exactly one implementation and no stated extension plan
- [ ] Plugin or hook systems with zero third-party consumers
- [ ] Parameters accepted but never read, or read only to pass through unchanged
- [ ] Public API surface wider than any current caller needs (methods, fields, exports)
- [ ] TODO comments describing features that have been deferred for more than one release cycle
- [ ] Generic type parameters that could be concrete without loss of current functionality

### The Extraction Judgment Call
<!-- activation: keywords=["extract", "helper", "util", "shared", "common"] -->

- [ ] Extraction creates a helper used exactly once -- premature; inline it until a second caller exists
- [ ] Extraction moves code to a different module/package, creating a cross-module dependency for marginal reuse
- [ ] Shared utility named too generically (e.g., `utils.process`, `helpers.handle`) -- unclear ownership
- [ ] Extraction hides important logic behind an indirection layer, making the call site harder to understand

## Common False Positives

- **Intentional denormalization**: Sometimes duplicating a value (e.g., caching a computed result) is a deliberate performance optimization. Look for a comment explaining why.
- **Test readability**: Tests sometimes repeat setup for clarity. Extracting shared fixtures can make individual tests harder to understand. Prefer duplication in tests if the repeated block is under 5 lines.
- **Protocol compliance**: Interface implementations may look like boilerplate duplication but are required by the type system or framework contract.
- **Two is not a pattern**: Two similar blocks are a coincidence; three are a pattern. Do not flag the first repetition unless the blocks are substantial (>10 lines).

## Severity Guidance

| Finding | Severity |
|---|---|
| Duplicated security-sensitive logic (auth, validation) diverging between copies | Critical |
| Large (>20 line) copy-paste blocks with only variable-name differences | Important |
| Unused abstraction layer adding indirection with no second consumer | Important |
| Speculative generic parameters or extension points | Minor |
| Moderate duplication in test setup (<10 lines) | Minor |
| Single-use helper that slightly reduces line count of caller | Minor |

## See Also

- `principle-naming-and-intent` -- poor names often mask duplication and complexity
- `principle-command-query-separation` -- complexity frequently hides in functions that mix queries and commands
- `principle-least-astonishment` -- over-clever code violates reader expectations

## Authoritative References

- [The Pragmatic Programmer - DRY Principle](https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition/)
- [Martin Fowler - Refactoring: Rule of Three](https://refactoring.com/)
- [KISS Principle - USAF Systems Engineering](https://en.wikipedia.org/wiki/KISS_principle)
- [Ron Jeffries - YAGNI](https://ronjeffries.com/xprog/articles/practices/pracnotneed/)
