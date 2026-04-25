---
id: conc-stm
type: primary
depth_role: leaf
focus: Detect transaction retry storms, oversized transactions, side effects inside transactions, and read-set inflation in software transactional memory.
parents:
  - index.md
covers:
  - Transaction retry storm from high contention on frequently-written transactional variables
  - "Large transaction scope encompassing more reads/writes than necessary"
  - "Side effects (I/O, logging, network) inside a transaction that are repeated on retry"
  - Read-set too large, causing spurious conflicts and unnecessary retries
  - Starvation from long transactions repeatedly aborted by short transactions
  - Nested transactions with incorrect isolation or composition semantics
  - Transactional variable accessed outside a transaction, breaking consistency
  - "Retry/orElse misuse causing livelock or unbounded waiting"
  - Write skew anomaly from read-only checks not included in the conflict set
  - Performance regression from STM overhead on low-contention workloads
tags:
  - stm
  - software-transactional-memory
  - transaction
  - retry
  - atomically
  - TVar
  - Ref
  - concurrency
  - composability
activation:
  file_globs:
    - "**/*.{hs,clj,cljs,scala,java,kt,rs,py,rb,cs}"
  keyword_matches:
    - STM
    - stm
    - atomically
    - TVar
    - TRef
    - Ref
    - transaction
    - retry
    - orElse
    - dosync
    - ref-set
    - alter
    - commute
    - deref
    - "swap!"
    - atom
    - transactional
    - MVarT
  structural_signals:
    - atomically_block
    - tvar_read_write
    - dosync_with_refs
source:
  origin: file
  path: conc-stm.md
  hash: "sha256:a6bfe87a4ccef0bcc88141526f43fc51537116a4adaf67dd53707e9b4aec0b4a"
---
# Software Transactional Memory (STM)

## When This Activates

Activates when diffs use Haskell STM (`atomically`, `TVar`, `retry`, `orElse`), Clojure refs (`dosync`, `ref-set`, `alter`, `commute`), Scala STM libraries (`ScalaSTM`, `Ref`), or other STM implementations. STM provides composable atomic transactions over shared memory, eliminating deadlocks by design, but production failures come from retry storms under contention, side effects repeated on transaction retry, and transaction scopes that are too large, causing thrashing.

## Audit Surface

- [ ] Transaction scope is as small as possible -- only the variables needing atomic update
- [ ] No I/O, logging, network, or other side effects inside the transaction
- [ ] Read-set includes only variables needed for the transaction's logic
- [ ] High-contention variables are identified and contention is reduced by design
- [ ] Long transactions are avoided or have anti-starvation mechanisms
- [ ] Nested transaction semantics are understood and used correctly
- [ ] Transactional variables are accessed only within a transaction context
- [ ] `retry` is used for blocking on condition changes, not for polling
- [ ] `orElse` chains are bounded and finite
- [ ] Write skew is prevented by proper read/write set management
- [ ] STM overhead is justified by measurement, not assumed to be free
- [ ] Transaction conflict/retry rate is observable via metrics

## Detailed Checks

### Transaction Retry Storms
<!-- activation: keywords=["retry", "contention", "conflict", "abort", "restart", "storm", "thrash", "repeated", "spin", "high", "hot", "frequent"] -->

- [ ] **Hot variable contention**: multiple threads frequently write to the same `TVar`/`Ref`, causing most transactions to conflict and retry -- the retry rate exceeds the commit rate, wasting CPU and making no progress
- [ ] **Retry without backoff**: on conflict, the transaction is immediately retried at full speed -- under sustained contention, this creates a retry storm where threads spend 99% of time aborting transactions
- [ ] **Read-modify-write on hot counter**: a shared counter is incremented inside a transaction; under contention, nearly every transaction conflicts -- use `commute` (Clojure) or restructure to avoid hot variables
- [ ] **Starvation of long transactions**: a long transaction reads many variables and is repeatedly aborted by short transactions that write to any of them -- the long transaction never commits
- [ ] **No contention monitoring**: transaction retry count is not logged or metered -- operators cannot detect retry storms before they degrade the system

### Large Transaction Scope
<!-- activation: keywords=["scope", "large", "broad", "wide", "many", "variables", "read", "write", "minimize", "reduce", "split", "decompose"] -->

- [ ] **Transaction encompasses unnecessary reads**: the transaction reads variables it does not need for its decision logic -- each extra read increases the chance of a spurious conflict
- [ ] **Computation inside transaction**: expensive pure computation (sorting, serialization, parsing) is performed inside the transaction, holding the read-set open longer -- compute outside, then transact the result
- [ ] **Multiple independent updates in one transaction**: variables A and B are updated atomically but are logically independent -- splitting into two transactions reduces the conflict surface
- [ ] **Read-set includes stable data**: the transaction reads a configuration value or constant that rarely changes -- the read is unnecessary inside the transaction and can be done before entering it

### Side Effects Inside Transactions
<!-- activation: keywords=["I/O", "effect", "side", "log", "print", "write", "send", "http", "file", "database", "network", "console", "email", "notify"] -->

- [ ] **I/O inside atomically**: logging, HTTP calls, file writes, or database operations inside an `atomically` block are repeated every time the transaction retries -- this produces duplicate logs, duplicate requests, and corrupted files
- [ ] **Haskell STM I/O**: Haskell's type system prevents `IO` inside `STM`, but `unsafePerformIO` or `unsafeIOToSTM` bypasses this -- the side effect is repeated on retry with no rollback
- [ ] **Clojure agent/atom inside dosync**: sending to an `agent` or swapping an `atom` inside `dosync` -- Clojure only dispatches agent sends after the transaction commits (safe), but `atom` swaps are not transaction-aware and execute on every retry
- [ ] **Mutable state outside transaction**: the transaction modifies a non-transactional mutable variable as a "side channel" -- the mutation is not rolled back on retry, leaving the variable in an inconsistent state

### Write Skew and Isolation
<!-- activation: keywords=["write", "skew", "phantom", "isolation", "validate", "check", "read", "only", "constraint", "invariant"] -->

- [ ] **Write skew**: two transactions each read a shared constraint (e.g., total balance >= 0), decide independently that their write is safe, and both commit -- the constraint is violated because neither transaction's read conflicted with the other's write
- [ ] **Read-only variable not validated**: a variable read for a decision (but not written) is not included in the transaction's validation set -- another transaction can change it between read and commit, violating the decision's premise
- [ ] **Phantom read**: a transaction iterates over a collection of `TVar`s, but a new `TVar` is added to the collection between the read and commit -- the transaction does not see the new entry (phantom)

### retry and orElse Discipline
<!-- activation: keywords=["retry", "orElse", "block", "wait", "condition", "alternative", "choice", "compose", "guard"] -->

- [ ] **retry without condition change**: `retry` blocks until any read variable changes, but no other thread ever modifies those variables -- the thread hangs forever
- [ ] **Busy-poll with retry**: code reads a `TVar`, checks a condition, and retries in a loop instead of using STM's native `retry` which blocks until a read variable changes -- wasted CPU
- [ ] **orElse chain too long**: `orElse` composes alternative transactions, but a long chain of alternatives is tried sequentially -- the last alternative runs only after all previous ones fail and retry, adding latency
- [ ] **Nested retry semantics misunderstood**: `retry` inside `orElse` retries the current alternative and falls through to the next -- `retry` outside `orElse` blocks the entire composition until a variable changes

## Common False Positives

- **Clojure atoms for independent state**: Clojure `atom` with `swap!` is not STM and does not create transactions. Do not flag atoms as "outside transaction" -- they are a separate concurrency primitive.
- **Database transactions**: SQL transactions provide ACID properties at the database level. Do not conflate in-memory STM concerns with database transaction isolation.
- **Haskell type system enforcement**: Haskell's `STM` monad prevents I/O inside transactions at compile time. Do not flag "possible side effects" in Haskell STM unless `unsafePerformIO` is used.
- **Low-contention workloads**: STM with rarely-conflicting transactions has near-zero retry rates. Do not flag "retry storm risk" if the workload is demonstrably low-contention.
- **Reference implementations and tutorials**: educational STM code may intentionally demonstrate anti-patterns. Do not flag pedagogical code.

## Severity Guidance

| Finding | Severity |
|---|---|
| I/O or network call inside a transaction (repeated on retry) | critical |
| Retry storm from hot variable contention with no backoff | high |
| Write skew vulnerability -- constraint violated by concurrent commits | high |
| Transactional variable accessed outside any transaction context | high |
| Long transaction repeatedly starved by short transactions | medium |
| Transaction scope includes unnecessary reads, inflating conflict surface | medium |
| Expensive computation inside transaction holding read-set open | medium |
| retry on variables no other thread modifies (permanent hang) | medium |
| No transaction conflict/retry monitoring in production | medium |
| Non-transactional mutable state modified inside transaction (not rolled back) | high |
| orElse chain excessively long, adding serial retry latency | low |
| STM used on low-contention workload where locks would be simpler | low |

## See Also

- `conc-lock-discipline-deadlock` -- STM eliminates deadlocks but introduces retry storms; compare trade-offs
- `conc-race-conditions-data-races` -- STM prevents data races within transactions but not on non-transactional variables
- `conc-lock-free-atomics` -- atomics handle single-variable updates without transactions; use for simple counters
- `conc-memory-model-ordering` -- STM abstracts memory ordering; verify the STM implementation handles it correctly
- `principle-immutability-by-default` -- immutable data needs no transactional protection; minimize transactional surface
- `principle-encapsulation` -- transactional variables should be encapsulated; exposing TVars to arbitrary code makes contention analysis impossible

## Authoritative References

- [Tim Harris, Simon Marlow, Simon Peyton Jones, and Maurice Herlihy, "Composable Memory Transactions" (2005)](https://doi.org/10.1145/1065944.1065952)
- [Nir Shavit and Dan Touitou, "Software Transactional Memory" (1995)](https://doi.org/10.1145/224964.224987)
- [Clojure Documentation: Refs and Transactions](https://clojure.org/reference/refs)
- [GHC Documentation: Software Transactional Memory](https://hackage.haskell.org/package/stm)
- [Maurice Herlihy and Nir Shavit, *The Art of Multiprocessor Programming* (2nd ed., 2020), Chapter 18: Transactional Memory](https://www.elsevier.com/books/the-art-of-multiprocessor-programming/herlihy/978-0-12-415950-1)
