---
id: correctness-footguns
type: index
depth_role: subcategory
depth: 1
focus: "correctness-footguns: Detect bidirectional text rendering hazards, locale-dependent sorting and case-folding bugs, and collation-unaware uniqueness constraints; Detect destructive data operations (DELETE, UPDATE, bulk write via ORM or ra..."
parents:
  - "../index.md"
shared_covers: []
tags:
  - addresses
  - argon2
  - atomicity
  - authentication
  - backtracking
  - base-case
  - bcrypt
  - bidi
  - bom
  - boundary
  - buffer-overflow
  - bulk-mutation
  - byte-order
  - c
  - caching
  - case-folding
  - check-then-act
  - collation
  - collision-resistance
  - comparison
generator: "skill-llm-wiki/v1"
entries:
  - id: footgun-bidi-rtl-locale-collation
    file: footgun-bidi-rtl-locale-collation.md
    type: primary
    focus: Detect bidirectional text rendering hazards, locale-dependent sorting and case-folding bugs, and collation-unaware uniqueness constraints
    tags:
      - bidi
      - RTL
      - locale
      - collation
      - i18n
      - l10n
      - case-folding
      - Turkish-I
      - CWE-838
  - id: footgun-destructive-query-scope
    file: footgun-destructive-query-scope.md
    type: primary
    focus: "Detect destructive data operations (DELETE, UPDATE, bulk write via ORM or raw SQL) whose predicate is missing or too broad, so the mutation affects unintended rows"
    tags:
      - destructive-query
      - data-loss
      - unscoped-delete
      - missing-filter
      - bulk-mutation
      - orm
      - sql
      - CWE-89
      - CWE-1284
      - CWE-840
  - id: footgun-encoding-unicode-normalization
    file: footgun-encoding-unicode-normalization.md
    type: primary
    focus: Detect string comparison without Unicode normalization, mixed encoding assumptions, BOM handling issues, surrogate pair breakage, and homoglyph attack surfaces
    tags:
      - unicode
      - encoding
      - normalization
      - UTF-8
      - homoglyph
      - surrogate
      - BOM
      - CWE-176
      - CWE-838
  - id: footgun-endianness-wire-format
    file: footgun-endianness-wire-format.md
    type: primary
    focus: "Detect host byte order in network protocols, missing htonl/ntohl, struct packing assumptions, and serialization without endianness specification"
    tags:
      - endianness
      - byte-order
      - wire-format
      - serialization
      - network
      - CWE-188
      - CWE-198
  - id: footgun-file-path-cross-platform
    file: footgun-file-path-cross-platform.md
    type: primary
    focus: Detect hardcoded path separators, case sensitivity assumptions, path length limits, symlink traversal, and null bytes in file paths
    tags:
      - file-path
      - cross-platform
      - symlink
      - path-traversal
      - null-byte
      - CWE-22
      - CWE-426
      - CWE-61
  - id: footgun-floating-point-comparison
    file: footgun-floating-point-comparison.md
    type: primary
    focus: Detect equality comparison of floats, accumulation error in loops, NaN propagation, negative zero semantics, and catastrophic cancellation
    tags:
      - floating-point
      - IEEE-754
      - NaN
      - epsilon
      - precision
      - comparison
      - CWE-682
  - id: footgun-hash-selection-and-salting
    file: footgun-hash-selection-and-salting.md
    type: primary
    focus: Detect weak hash functions for security purposes, unsalted or improperly salted hashes, hash truncation, and password hashing without KDF
    tags:
      - hash
      - salt
      - HMAC
      - MD5
      - SHA1
      - password
      - KDF
      - CWE-328
      - CWE-759
      - CWE-916
      - cryptography
      - password-hashing
      - bcrypt
      - argon2
      - scrypt
      - PBKDF2
      - authentication
      - CWE-261
      - hash-collision
      - HashDoS
      - denial-of-service
      - hash-table
      - CWE-407
      - CWE-400
      - hashing
      - integrity
      - collision-resistance
      - CWE-760
  - id: footgun-integer-overflow-sign-extension
    file: footgun-integer-overflow-sign-extension.md
    type: primary
    focus: "Detect unchecked arithmetic overflow, signed/unsigned confusion, narrowing casts, and integer promotion hazards"
    tags:
      - integer-overflow
      - signed-unsigned
      - narrowing
      - type-safety
      - CWE-190
      - CWE-191
      - CWE-681
      - CWE-195
      - c
      - memory-safety
      - undefined-behaviour
      - buffer-overflow
      - pointers
      - security
  - id: footgun-money-decimals-precision
    file: footgun-money-decimals-precision.md
    type: primary
    focus: Detect use of binary floating-point for monetary values, currency precision mismatches, unspecified rounding modes, and unit confusion in financial arithmetic
    tags:
      - money
      - currency
      - precision
      - floating-point
      - decimal
      - rounding
      - financial
      - CWE-682
  - id: footgun-name-address-phone-format-assumptions
    file: footgun-name-address-phone-format-assumptions.md
    type: primary
    focus: Detect overly strict validation of personal names, addresses, and phone numbers that rejects valid real-world data
    tags:
      - validation
      - i18n
      - names
      - addresses
      - phone
      - email
      - format-assumptions
      - inclusivity
  - id: footgun-null-and-missing-state
    file: footgun-null-and-missing-state.md
    type: primary
    focus: "Detect a possibly-unset value (from session, cache, optional config, a prior pipeline step, a map key, or env) read and then dereferenced, indexed, compared, or passed on without a null/None/nil/undefined or presence guard"
    tags:
      - null-safety
      - none
      - missing-state
      - npe
      - keyerror
      - optional
      - guard-clause
      - CWE-476
      - CWE-252
  - id: footgun-off-by-one
    file: footgun-off-by-one.md
    type: primary
    focus: "Detect fencepost errors, inclusive/exclusive range confusion, 0-based vs 1-based indexing mistakes, and boundary condition bugs"
    tags:
      - off-by-one
      - fencepost
      - boundary
      - indexing
      - range
      - CWE-193
      - CWE-131
  - id: footgun-regex-redos
    file: footgun-regex-redos.md
    type: primary
    focus: Detect catastrophic backtracking in regex patterns, user-controlled regex input, and missing regex execution timeouts
    tags:
      - regex
      - ReDoS
      - backtracking
      - denial-of-service
      - performance
      - CWE-1333
      - CWE-400
  - id: footgun-resource-exhaustion-via-input
    file: footgun-resource-exhaustion-via-input.md
    type: primary
    focus: Detect unbounded allocation from user input -- array sizes, string lengths, zip bombs, XML bombs, deeply nested JSON, and large file uploads without limits
    tags:
      - resource-exhaustion
      - denial-of-service
      - zip-bomb
      - xml-bomb
      - memory
      - CWE-400
      - CWE-770
      - CWE-776
      - rate-limiting
      - dos
      - redos
      - pagination
      - throttling
      - timeout
      - graphql
      - CWE-1333
  - id: footgun-rng-csprng
    file: footgun-rng-csprng.md
    type: primary
    focus: Detect use of insecure PRNGs for security tokens, predictable seeds, insufficient entropy, UUID misuse, and random value truncation
    tags:
      - randomness
      - PRNG
      - CSPRNG
      - entropy
      - token
      - CWE-330
      - CWE-338
      - cryptography
      - token-generation
      - key-generation
  - id: footgun-time-dates-timezones
    file: footgun-time-dates-timezones.md
    type: primary
    focus: Detect temporal logic bugs -- storing local time without timezone, unsafe cross-timezone comparisons, DST transition gaps, and wrong date arithmetic
    tags:
      - datetime
      - timezone
      - DST
      - temporal
      - date-arithmetic
      - CWE-682
      - CWE-187
  - id: footgun-toctou-race
    file: footgun-toctou-race.md
    type: primary
    focus: Detect check-then-act patterns without atomicity -- file existence checks before open, permission checks before access, balance checks before debit
    tags:
      - toctou
      - race-condition
      - atomicity
      - check-then-act
      - CWE-367
      - CWE-377
      - CWE-362
  - id: footgun-unintended-recursion
    file: footgun-unintended-recursion.md
    type: primary
    focus: "Detect unintended or unbounded recursion and re-entrancy where a function, wrapper, getter, or cache calls its own entry point (self/this/super/public API) instead of the inner delegate, or recurses with no progress toward a base case"
    tags:
      - recursion
      - recursive
      - re-entrancy
      - infinite-loop
      - stack-overflow
      - delegate
      - base-case
      - caching
      - CWE-674
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Correctness Footguns

**Focus:** correctness-footguns: Detect bidirectional text rendering hazards, locale-dependent sorting and case-folding bugs, and collation-unaware uniqueness constraints; Detect destructive data operations (DELETE, UPDATE, bulk write via ORM or ra...

## Children

| File | Type | Focus |
|------|------|-------|
| [footgun-bidi-rtl-locale-collation.md](footgun-bidi-rtl-locale-collation.md) | 📄 primary | Detect bidirectional text rendering hazards, locale-dependent sorting and case-folding bugs, and collation-unaware uniqueness constraints |
| [footgun-destructive-query-scope.md](footgun-destructive-query-scope.md) | 📄 primary | Detect destructive data operations (DELETE, UPDATE, bulk write via ORM or raw SQL) whose predicate is missing or too broad, so the mutation affects unintended rows |
| [footgun-encoding-unicode-normalization.md](footgun-encoding-unicode-normalization.md) | 📄 primary | Detect string comparison without Unicode normalization, mixed encoding assumptions, BOM handling issues, surrogate pair breakage, and homoglyph attack surfaces |
| [footgun-endianness-wire-format.md](footgun-endianness-wire-format.md) | 📄 primary | Detect host byte order in network protocols, missing htonl/ntohl, struct packing assumptions, and serialization without endianness specification |
| [footgun-file-path-cross-platform.md](footgun-file-path-cross-platform.md) | 📄 primary | Detect hardcoded path separators, case sensitivity assumptions, path length limits, symlink traversal, and null bytes in file paths |
| [footgun-floating-point-comparison.md](footgun-floating-point-comparison.md) | 📄 primary | Detect equality comparison of floats, accumulation error in loops, NaN propagation, negative zero semantics, and catastrophic cancellation |
| [footgun-hash-selection-and-salting.md](footgun-hash-selection-and-salting.md) | 📄 primary | Detect weak hash functions for security purposes, unsalted or improperly salted hashes, hash truncation, and password hashing without KDF |
| [footgun-integer-overflow-sign-extension.md](footgun-integer-overflow-sign-extension.md) | 📄 primary | Detect unchecked arithmetic overflow, signed/unsigned confusion, narrowing casts, and integer promotion hazards |
| [footgun-money-decimals-precision.md](footgun-money-decimals-precision.md) | 📄 primary | Detect use of binary floating-point for monetary values, currency precision mismatches, unspecified rounding modes, and unit confusion in financial arithmetic |
| [footgun-name-address-phone-format-assumptions.md](footgun-name-address-phone-format-assumptions.md) | 📄 primary | Detect overly strict validation of personal names, addresses, and phone numbers that rejects valid real-world data |
| [footgun-null-and-missing-state.md](footgun-null-and-missing-state.md) | 📄 primary | Detect a possibly-unset value (from session, cache, optional config, a prior pipeline step, a map key, or env) read and then dereferenced, indexed, compared, or passed on without a null/None/nil/undefined or presence guard |
| [footgun-off-by-one.md](footgun-off-by-one.md) | 📄 primary | Detect fencepost errors, inclusive/exclusive range confusion, 0-based vs 1-based indexing mistakes, and boundary condition bugs |
| [footgun-regex-redos.md](footgun-regex-redos.md) | 📄 primary | Detect catastrophic backtracking in regex patterns, user-controlled regex input, and missing regex execution timeouts |
| [footgun-resource-exhaustion-via-input.md](footgun-resource-exhaustion-via-input.md) | 📄 primary | Detect unbounded allocation from user input -- array sizes, string lengths, zip bombs, XML bombs, deeply nested JSON, and large file uploads without limits |
| [footgun-rng-csprng.md](footgun-rng-csprng.md) | 📄 primary | Detect use of insecure PRNGs for security tokens, predictable seeds, insufficient entropy, UUID misuse, and random value truncation |
| [footgun-time-dates-timezones.md](footgun-time-dates-timezones.md) | 📄 primary | Detect temporal logic bugs -- storing local time without timezone, unsafe cross-timezone comparisons, DST transition gaps, and wrong date arithmetic |
| [footgun-toctou-race.md](footgun-toctou-race.md) | 📄 primary | Detect check-then-act patterns without atomicity -- file existence checks before open, permission checks before access, balance checks before debit |
| [footgun-unintended-recursion.md](footgun-unintended-recursion.md) | 📄 primary | Detect unintended or unbounded recursion and re-entrancy where a function, wrapper, getter, or cache calls its own entry point (self/this/super/public API) instead of the inner delegate, or recurses with no progress toward a base case |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
