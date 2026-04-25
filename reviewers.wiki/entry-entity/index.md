---
id: entry-entity
type: index
depth_role: subcategory
depth: 1
focus: "-0.0 == 0.0 but 1/-0.0 == -Infinity, breaking downstream math; Accumulation error: summing many small floats diverges from expected total; Balance derived from SUM query instead of maintained incrementally; Boolean parameters that control branching inside the called function"
parents:
  - "../index.md"
shared_covers: []
entries:
  - id: ddd-tactical-entities
    file: ddd-tactical-entities.md
    type: primary
    focus: "Detect entities without identity, entity equality by value instead of ID, entities exposing state without behavior, and entities managing other entities' lifecycle."
    tags:
      - entity
      - ddd
      - tactical-design
      - identity
      - equality
      - lifecycle
      - domain-driven-design
  - id: domain-fintech-ledger-double-entry
    file: domain-fintech-ledger-double-entry.md
    type: primary
    focus: Detect single-entry bookkeeping, non-idempotent payment processing, floating-point monetary math, missing audit trails, and broken ledger invariants in double-entry accounting systems
    tags:
      - ledger
      - double-entry
      - accounting
      - payment
      - fintech
      - reconciliation
      - money
      - idempotency
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
  - id: smell-primitive-obsession
    file: smell-primitive-obsession.md
    type: primary
    focus: Detect domain concepts represented as raw primitive types instead of expressive value objects or domain types
    tags:
      - primitive-obsession
      - bloater
      - value-object
      - domain-modeling
      - type-safety
      - clean-code
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Entry Entity

**Focus:** -0.0 == 0.0 but 1/-0.0 == -Infinity, breaking downstream math; Accumulation error: summing many small floats diverges from expected total; Balance derived from SUM query instead of maintained incrementally; Boolean parameters that control branching inside the called function

## Children

| File | Type | Focus |
|------|------|-------|
| [ddd-tactical-entities.md](ddd-tactical-entities.md) | 📄 primary | Detect entities without identity, entity equality by value instead of ID, entities exposing state without behavior, and entities managing other entities' lifecycle. |
| [domain-fintech-ledger-double-entry.md](domain-fintech-ledger-double-entry.md) | 📄 primary | Detect single-entry bookkeeping, non-idempotent payment processing, floating-point monetary math, missing audit trails, and broken ledger invariants in double-entry accounting systems |
| [footgun-floating-point-comparison.md](footgun-floating-point-comparison.md) | 📄 primary | Detect equality comparison of floats, accumulation error in loops, NaN propagation, negative zero semantics, and catastrophic cancellation |
| [footgun-time-dates-timezones.md](footgun-time-dates-timezones.md) | 📄 primary | Detect temporal logic bugs -- storing local time without timezone, unsafe cross-timezone comparisons, DST transition gaps, and wrong date arithmetic |
| [smell-primitive-obsession.md](smell-primitive-obsession.md) | 📄 primary | Detect domain concepts represented as raw primitive types instead of expressive value objects or domain types |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
