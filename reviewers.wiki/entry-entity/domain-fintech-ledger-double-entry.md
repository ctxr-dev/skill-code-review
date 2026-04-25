---
id: domain-fintech-ledger-double-entry
type: primary
depth_role: leaf
focus: Detect single-entry bookkeeping, non-idempotent payment processing, floating-point monetary math, missing audit trails, and broken ledger invariants in double-entry accounting systems
parents:
  - index.md
covers:
  - "Debit posted without matching credit (single-entry bookkeeping)"
  - Float or double type used for monetary amounts
  - Balance derived from SUM query instead of maintained incrementally
  - Payment endpoint missing idempotency key
  - Financial transaction with no audit trail entry
  - Currency mismatch in multi-currency journal entry
  - Settlement timing window not accounted for
  - Missing reconciliation between internal ledger and external provider
  - "Ledger entry mutable after posting (retroactive edit)"
  - Journal entry not atomic across debit and credit legs
tags:
  - ledger
  - double-entry
  - accounting
  - payment
  - fintech
  - reconciliation
  - money
  - idempotency
activation:
  file_globs:
    - "**/*ledger*"
    - "**/*journal*"
    - "**/*account*"
    - "**/*transaction*"
    - "**/*payment*"
    - "**/*settlement*"
    - "**/*reconcil*"
    - "**/*balance*"
  keyword_matches:
    - ledger
    - transaction
    - debit
    - credit
    - journal
    - account
    - balance
    - payment
    - settlement
    - reconciliation
    - double-entry
    - idempotency_key
    - posting
    - chart_of_accounts
    - general_ledger
  structural_signals:
    - Database table with debit and credit columns
    - Function transferring value between two accounts
    - Journal entry creation handler
source:
  origin: file
  path: domain-fintech-ledger-double-entry.md
  hash: "sha256:bdf9d36e2949686a5c232e4af6bf3cef8fa2278c176dcfbafd6ea548d29dd431"
---
# Double-Entry Ledger and Financial Transactions

## When This Activates

Activates when diffs touch ledger logic, journal entries, account balances, payment processing, settlement workflows, or reconciliation jobs. Double-entry bookkeeping requires every financial transaction to have balanced debit and credit legs. Violations of this invariant -- single-entry writes, floating-point money, mutable posted entries, or missing audit trails -- corrupt financial records, cause regulatory failures, and make reconciliation impossible.

## Audit Surface

- [ ] Journal entry creates debit without corresponding credit of equal amount
- [ ] Monetary field declared as float, double, or real instead of decimal or integer-cents
- [ ] Balance computed via SUM(amount) query on every read instead of stored running total
- [ ] Payment or transfer endpoint accepts no idempotency key
- [ ] Financial mutation with no audit log or event emitted
- [ ] Multi-currency entry without explicit exchange rate and conversion timestamp
- [ ] Settlement assumed instant -- no pending or in-transit state modeled
- [ ] No reconciliation job or checksum between ledger and payment provider
- [ ] Ledger row allows UPDATE or DELETE after posting
- [ ] Debit and credit legs written in separate transactions (partial post risk)
- [ ] Account balance allowed to go negative without explicit overdraft policy
- [ ] Rounding mode unspecified in currency conversion or interest calculation
- [ ] Missing trial balance assertion (sum of debits != sum of credits)
- [ ] Journal entry lacks a unique posting reference or transaction ID

## Detailed Checks

### Double-Entry Invariant
<!-- activation: keywords=["debit", "credit", "journal", "entry", "posting", "leg", "double-entry", "balanced"] -->

- [ ] **Single-entry write**: code creates a debit entry but never creates the matching credit in the same operation -- this breaks the fundamental accounting equation (Assets = Liabilities + Equity) and makes the ledger unbalanceable
- [ ] **Non-atomic debit-credit pair**: debit and credit legs are written in separate database transactions -- a crash between them leaves the ledger unbalanced with no automatic recovery
- [ ] **Missing trial balance check**: no periodic or post-commit assertion that total debits equal total credits across all accounts -- ledger drift goes undetected until external audit
- [ ] **Mutable posted entries**: ledger rows can be UPDATEd or DELETEd after posting -- financial records must be append-only; corrections use reversing entries, not mutations

### Monetary Type Safety
<!-- activation: keywords=["float", "double", "decimal", "money", "amount", "currency", "BigDecimal", "Decimal", "cents", "precision"] -->

- [ ] **Float/double for money**: monetary amounts stored or computed using IEEE 754 binary floating-point -- 0.1 + 0.2 != 0.3 causes cumulative rounding errors that corrupt balances. Use decimal types or integer-cents. Cross-reference with `footgun-money-decimals-precision`
- [ ] **Rounding mode absent**: currency conversion, interest calculation, or fee splitting performed without explicit rounding mode (HALF_UP, HALF_EVEN) -- different platforms default to different modes, causing penny discrepancies
- [ ] **Currency mismatch in entry**: debit leg in USD and credit leg in EUR within the same journal entry without an explicit exchange rate record and conversion timestamp
- [ ] **Mixed-precision arithmetic**: amounts with different decimal scales (2 vs 8) combined without normalizing -- truncation silently loses value

### Balance Integrity
<!-- activation: keywords=["balance", "sum", "running_total", "aggregate", "query", "snapshot"] -->

- [ ] **Balance as live SUM**: account balance computed by `SELECT SUM(amount) FROM entries WHERE account_id = ?` on every read -- this is O(n) on the entry count, creates lock contention, and is vulnerable to concurrent write skew
- [ ] **No negative balance guard**: account balance can go negative without an explicit overdraft policy or check constraint -- accidental overdrafts cause cascading settlement failures
- [ ] **Stale balance cache**: running balance cached but not updated atomically with new entries -- reads return stale balance, enabling double-spend

### Idempotency and Payment Processing
<!-- activation: keywords=["idempotency", "idempotent", "retry", "duplicate", "payment", "charge", "transfer", "key"] -->

- [ ] **No idempotency key on payment endpoint**: POST endpoint that creates payments or transfers accepts no idempotency key -- client retries after timeout create duplicate financial entries. Cross-reference with `reliability-idempotency`
- [ ] **Idempotency key not checked before ledger write**: handler reads the key but does not verify it against previous executions before posting to the ledger -- the key is decorative
- [ ] **Duplicate detection only by amount and timestamp**: deduplication logic matches on amount + time window instead of a unique idempotency key -- legitimate same-amount transactions are incorrectly rejected

### Settlement and Reconciliation
<!-- activation: keywords=["settlement", "reconciliation", "reconcile", "pending", "in-transit", "clearing", "provider", "external"] -->

- [ ] **Settlement modeled as instant**: code treats payment as settled the moment it is initiated -- real settlement involves pending, clearing, and settled states with multi-day windows
- [ ] **No reconciliation with external provider**: internal ledger has no job or process to compare its records against the payment provider's settlement reports -- discrepancies accumulate silently
- [ ] **Missing reconciliation tolerance**: reconciliation compares exact amounts without accounting for provider fees, FX differences, or rounding -- every run flags false discrepancies

### Audit Trail
<!-- activation: keywords=["audit", "log", "trail", "history", "event", "compliance", "regulatory"] -->

- [ ] **Financial mutation without audit event**: ledger write has no corresponding audit log entry or domain event recording who, when, what, and why -- regulatory and forensic requirements are unmet
- [ ] **Audit log mutable**: the service that writes financial records can also delete or modify its audit entries -- audit integrity requires write-once storage or a separate service
- [ ] **Missing before/after state in audit**: audit entry records the action but not the prior and resulting state -- investigation of discrepancies requires replaying the entire ledger

## Common False Positives

- **DTO or view model with float**: a presentation-layer DTO may use float for display formatting after the authoritative decimal calculation is complete. Flag only if the float value feeds back into ledger writes.
- **Analytics aggregation with SUM**: reporting queries that SUM over entries for dashboards are not the same as a live balance query. Flag only if the SUM result is used as an authoritative account balance for business logic.
- **Event sourcing replay**: event-sourced ledgers rebuild balance from events by design. This is acceptable if the event store is immutable and projections are validated against checksums.
- **Test fixtures**: test files using float amounts or single-entry writes for unit test setup are acceptable if production code uses proper types.

## Severity Guidance

| Finding | Severity |
|---|---|
| Debit posted without matching credit (single-entry) | Critical |
| Float/double used for monetary storage or ledger arithmetic | Critical |
| Debit and credit in separate transactions (partial post risk) | Critical |
| Payment endpoint with no idempotency key | Critical |
| Ledger entries mutable after posting (UPDATE/DELETE allowed) | Important |
| Balance computed via live SUM instead of maintained total | Important |
| No reconciliation between internal ledger and external provider | Important |
| Financial mutation with no audit trail | Important |
| Currency mismatch in multi-currency journal entry | Important |
| Rounding mode unspecified in currency conversion | Minor |
| Missing trial balance assertion | Minor |
| Settlement modeled as instant without pending state | Minor |

## See Also

- `footgun-money-decimals-precision` -- foundational rules for monetary type selection and rounding
- `reliability-idempotency` -- idempotency key handling for all mutating endpoints
- `reliability-saga-distributed-tx` -- multi-step financial operations requiring saga coordination
- `principle-fail-fast` -- ledger imbalances should fail fast rather than propagate silently
- `compliance-pci-dss` -- payment card data handling within ledger systems
- `principle-separation-of-concerns` -- ledger write logic should be separated from payment gateway integration

## Authoritative References

- [Martin Fowler, "Accounting Patterns"](https://martinfowler.com/eaaDev/AccountingNarrative.html)
- [Pat Helland, "Immutability Changes Everything" (ACM Queue, 2015)](https://queue.acm.org/detail.cfm?id=2884038)
- [Stripe Engineering, "Designing Robust and Predictable APIs with Idempotency"](https://stripe.com/blog/idempotency)
- [GAAP / IFRS Double-Entry Accounting Principles](https://www.ifrs.org/)
- [Square Engineering, "Books: An Immutable Double-Entry Accounting Database"](https://developer.squareup.com/blog/books-an-immutable-double-entry-accounting-database-service)
