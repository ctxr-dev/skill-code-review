---
id: functions-named
type: index
depth_role: subcategory
depth: 1
focus: "APIs that require reading implementation to use correctly; Abbreviations and acronyms not universally understood by the team; Adding a new API field propagating through DTOs, mappers, validators, and tests; Adding a new enum value requiring updates in multiple switch/match statements"
parents:
  - "../index.md"
shared_covers: []
entries:
  - id: antipattern-magic-numbers-strings
    file: antipattern-magic-numbers-strings.md
    type: primary
    focus: Detect unexplained literal values embedded in logic with no named constant, enum, or documentation
    tags:
      - magic-number
      - magic-string
      - literal
      - constant
      - readability
      - correctness
      - naming
      - anti-pattern
  - id: antipattern-spaghetti-code
    file: antipattern-spaghetti-code.md
    type: primary
    focus: Detect tangled control flow with no discernible structure, where logic paths interweave and cannot be followed linearly
    tags:
      - spaghetti-code
      - control-flow
      - nesting
      - complexity
      - readability
      - callback-hell
      - temporal-coupling
      - anti-pattern
      - long-method
      - bloater
      - extract-method
      - clean-code
  - id: principle-least-astonishment
    file: principle-least-astonishment.md
    type: primary
    focus: Flag code that behaves differently from what a careful reader of the signature, name, or type would expect
    tags:
      - surprise
      - side-effects
      - consistency
      - mutation
      - convention
      - api-design
  - id: principle-naming-and-intent
    file: principle-naming-and-intent.md
    type: primary
    focus: Ensure names reveal intent, maintain consistent vocabulary, and eliminate the need for explanatory comments
    tags:
      - naming
      - readability
      - intent
      - vocabulary
      - domain-language
      - clean-code
  - id: smell-data-clumps
    file: smell-data-clumps.md
    type: primary
    focus: Detect groups of data items that repeatedly appear together across function signatures, class fields, and data structures
    tags:
      - data-clumps
      - bloater
      - parameter-object
      - value-object
      - readability
      - architecture
      - clean-code
  - id: smell-shotgun-surgery
    file: smell-shotgun-surgery.md
    type: primary
    focus: Detect single logical changes that require coordinated parallel edits across many files or modules
    tags:
      - shotgun-surgery
      - code-smell
      - change-preventer
      - refactoring
      - coupling
      - scattered-logic
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Functions Named

**Focus:** APIs that require reading implementation to use correctly; Abbreviations and acronyms not universally understood by the team; Adding a new API field propagating through DTOs, mappers, validators, and tests; Adding a new enum value requiring updates in multiple switch/match statements

## Children

| File | Type | Focus |
|------|------|-------|
| [antipattern-magic-numbers-strings.md](antipattern-magic-numbers-strings.md) | 📄 primary | Detect unexplained literal values embedded in logic with no named constant, enum, or documentation |
| [antipattern-spaghetti-code.md](antipattern-spaghetti-code.md) | 📄 primary | Detect tangled control flow with no discernible structure, where logic paths interweave and cannot be followed linearly |
| [principle-least-astonishment.md](principle-least-astonishment.md) | 📄 primary | Flag code that behaves differently from what a careful reader of the signature, name, or type would expect |
| [principle-naming-and-intent.md](principle-naming-and-intent.md) | 📄 primary | Ensure names reveal intent, maintain consistent vocabulary, and eliminate the need for explanatory comments |
| [smell-data-clumps.md](smell-data-clumps.md) | 📄 primary | Detect groups of data items that repeatedly appear together across function signatures, class fields, and data structures |
| [smell-shotgun-surgery.md](smell-shotgun-surgery.md) | 📄 primary | Detect single logical changes that require coordinated parallel edits across many files or modules |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
