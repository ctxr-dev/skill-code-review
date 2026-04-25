---
id: reliability-idempotency
type: primary
depth_role: leaf
focus: Detect non-idempotent operations exposed to retry or redelivery, missing idempotency keys, and partial completion without rollback
parents:
  - index.md
covers:
  - Non-idempotent operation exposed to retry or at-least-once delivery
  - Missing idempotency key on mutating API endpoint
  - Idempotency key accepted but not stored or checked on subsequent calls
  - Partial completion of a multi-step operation without rollback or resumption
  - "Idempotency key checked and stored in separate transactions (race condition)"
  - Idempotency key scoped too broadly or too narrowly
  - Duplicate message processing in event consumer without deduplication
  - Database INSERT without upsert semantics in a retriable context
  - "Side effect (email, webhook, charge) executed before idempotency check"
  - Idempotency record has no TTL -- storage grows unbounded
tags:
  - idempotency
  - idempotent
  - deduplication
  - retry
  - at-least-once
  - exactly-once
  - upsert
  - side-effect
activation:
  file_globs:
    - "**/*.{java,kt,scala,cs,ts,js,py,rb,go,rs,ex,exs}"
  keyword_matches:
    - idempotent
    - idempotency
    - idempotencyKey
    - idempotency_key
    - Idempotent-Key
    - dedup
    - deduplication
    - upsert
    - ON CONFLICT
    - INSERT OR
    - MERGE
    - retry
    - redelivery
    - at-least-once
    - exactly-once
    - duplicate
  structural_signals:
    - post_endpoint_without_idempotency_key
    - insert_without_upsert
    - event_consumer_without_dedup
source:
  origin: file
  path: reliability-idempotency.md
  hash: "sha256:45692bc1bf1bbf3ff244ee1a4dc90a101c5db3b7506a6a5727207dad40ae8e1f"
---
# Idempotency

## When This Activates

Activates when diffs introduce mutating API endpoints, event consumers, webhook handlers, retry logic, or database writes in contexts subject to at-least-once delivery. An idempotent operation produces the same result whether executed once or multiple times. Without idempotency, retries and redeliveries cause duplicate charges, duplicate records, duplicate emails, and inconsistent state.

## Audit Surface

- [ ] Mutating API endpoint accepts no idempotency key header or parameter
- [ ] Idempotency key accepted but handler does not check for previous execution
- [ ] Idempotency check and business write are in separate transactions
- [ ] Event consumer processes messages without deduplication
- [ ] Database INSERT in a retriable context without upsert semantics
- [ ] Side effect fires before idempotency gate
- [ ] Multi-step operation partially completes with no rollback or resumption
- [ ] Idempotency key stored in memory only
- [ ] Idempotency key has no TTL -- deduplication table grows forever
- [ ] Same idempotency key used across different operation types
- [ ] Retry policy configured for endpoint with no idempotency guarantee
- [ ] Webhook handler processes same event multiple times with side effects

## Detailed Checks

### Idempotency Key Handling
<!-- activation: keywords=["idempotent", "idempotency", "key", "header", "token", "request_id", "correlation", "dedup", "duplicate"] -->

- [ ] **No idempotency key on mutating endpoint**: POST endpoint creates a resource but accepts no idempotency key -- clients retrying after a timeout may create duplicate resources
- [ ] **Key accepted but not checked**: the endpoint reads an `Idempotency-Key` header but does not look up whether that key was already processed -- the key is decorative
- [ ] **Key scoped too broadly**: the same idempotency key is reused across different API operations (e.g., create-order and cancel-order) -- the second operation is incorrectly treated as a duplicate of the first
- [ ] **Key scoped too narrowly**: idempotency key is per-user but not per-operation -- concurrent requests from the same user with different intents collide
- [ ] **Key not included in response**: on duplicate request, the handler returns a generic success instead of the original response -- the client cannot distinguish a fresh result from a cached one

### Atomic Idempotency Check
<!-- activation: keywords=["transaction", "atomic", "race", "check", "insert", "upsert", "lock", "conflict", "concurrent"] -->

- [ ] **Check-then-act race**: handler queries the idempotency store, finds no record, then processes the request and writes the record -- a concurrent duplicate request passes the check before either writes, causing double processing
- [ ] **Idempotency record in different database**: the deduplication record is stored in Redis while the business write goes to PostgreSQL -- a crash between the two leaves either a processed-but-unrecorded or recorded-but-unprocessed state
- [ ] **No atomic upsert**: database INSERT does not use `INSERT ... ON CONFLICT DO NOTHING` or equivalent -- concurrent inserts of the same idempotency key both succeed
- [ ] **Lock held too long**: a distributed lock is acquired for the idempotency check and held during the entire operation -- high contention on hot keys causes timeout cascades

### Side Effects and Ordering
<!-- activation: keywords=["email", "notification", "webhook", "publish", "event", "charge", "payment", "send", "SMS", "push", "side effect"] -->

- [ ] **Side effect before idempotency gate**: email, SMS, or payment charge is executed before the idempotency check determines this is a duplicate -- the side effect is irreversibly duplicated
- [ ] **Event published outside idempotency scope**: a domain event is published after the idempotency check but before the idempotency record is committed -- a crash causes the event to be published again on retry
- [ ] **Non-reversible side effect with no idempotency**: sending email or charging a card has no deduplication mechanism -- framework retry or user retry triggers duplicate charges/emails
- [ ] **Webhook handler with no event ID tracking**: incoming webhook does not record the event ID -- the webhook provider's retry delivers the same event multiple times with side effects

### Partial Completion and Recovery
<!-- activation: keywords=["partial", "rollback", "resume", "recovery", "step", "multi-step", "transaction", "compensate", "incomplete"] -->

- [ ] **Multi-step operation with no atomicity**: handler performs steps A, B, C in sequence; step B fails -- step A is committed with no rollback, and retrying starts from step A again (duplicating it)
- [ ] **No resumption from last successful step**: operation tracks no checkpoint -- on retry, all steps re-execute from the beginning instead of resuming from the failure point
- [ ] **Partial write visible to readers**: half-written state is visible to concurrent readers or downstream consumers -- use a transaction or status flag to make the write atomic
- [ ] **Compensation not triggered on partial failure**: steps A and B succeed, step C fails, but no compensation runs for A and B -- the system is left in an inconsistent state

## Common False Positives

- **GET and DELETE are naturally idempotent**: GET has no side effects; DELETE of a specific resource ID is idempotent by definition (deleting an already-deleted resource is a no-op). Do not flag these unless they have hidden side effects (audit logging that triggers actions, cascading deletes with notifications).
- **PUT with full replacement semantics**: PUT that replaces the entire resource is idempotent by HTTP specification. Flag only if the implementation has side effects beyond the replacement (event emission, counter increment).
- **Database upsert in place**: `INSERT ... ON CONFLICT DO UPDATE` is idempotent by construction. Do not flag the lack of a separate idempotency key if the natural key (e.g., unique constraint) provides deduplication.
- **Message broker deduplication**: some brokers (Kafka with exactly-once, SQS with deduplication ID) provide deduplication at the infrastructure level. Verify broker configuration before flagging the consumer.

## Severity Guidance

| Finding | Severity |
|---|---|
| Payment or financial operation retried without idempotency key | Critical |
| Side effect (email, charge) fires before idempotency check | Critical |
| Idempotency check and business write in separate transactions (race) | Critical |
| Mutating endpoint with retry policy but no idempotency mechanism | Important |
| Event consumer with no deduplication in at-least-once delivery system | Important |
| INSERT without upsert in a retriable context | Important |
| Multi-step operation partially completes with no rollback | Important |
| Idempotency key stored in memory only | Important |
| Idempotency records have no TTL (unbounded growth) | Minor |
| Key scope mismatch (too broad or too narrow) | Minor |

## See Also

- `reliability-retry-with-backoff` -- retried operations must be idempotent; retry logic and idempotency are inseparable concerns
- `reliability-saga-distributed-tx` -- saga steps must be idempotent because they are subject to at-least-once delivery
- `reliability-exactly-once-semantics` -- idempotent consumers are a prerequisite for achieving effectively-exactly-once processing
- `pattern-outbox` -- transactional outbox ensures events are published exactly once alongside the business write
- `principle-fail-fast` -- partial completion without rollback violates fail-fast; the system should detect and surface the inconsistency immediately
- `pattern-saga` -- saga compensation handles partial multi-step failures that idempotency alone cannot solve

## Authoritative References

- [Stripe, "Designing Robust and Predictable APIs with Idempotency" (2017)](https://stripe.com/blog/idempotency)
- [Pat Helland, "Idempotence Is Not a Medical Condition" (ACM Queue, 2012)](https://queue.acm.org/detail.cfm?id=2187821)
- [Martin Kleppmann, *Designing Data-Intensive Applications* (2017), Chapter 11: "Idempotence"](https://dataintensive.net/)
- [IETF RFC Draft: The Idempotency-Key HTTP Header Field](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/)
