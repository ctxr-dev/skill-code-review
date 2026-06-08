---
id: footgun-destructive-query-scope
type: primary
depth_role: leaf
focus: "Detect destructive data operations (DELETE, UPDATE, bulk write via ORM or raw SQL) whose predicate is missing or too broad, so the mutation affects unintended rows"
parents:
  - index.md
covers:
  - "deleteMany/updateMany/destroy/removeAll filter omitting a required discriminator (type, method, tenant, owner, status)"
  - OR clause in a delete or update predicate that widens scope beyond the intended subset
  - UPDATE or DELETE statement with no WHERE clause at all
  - "Raw SQL \"DELETE FROM t\" or \"UPDATE t SET ...\" with no WHERE"
  - Cascade onDelete that removes more related rows than the author expects
  - "Soft-delete intended (set deletedAt/isDeleted) but a hard delete is used instead"
  - where filter built from unvalidated user input that can match every row
  - Transaction that deletes then reinserts, losing rows on partial failure
  - "Filter object that ends up empty or {} at runtime, matching all rows"
  - Discriminator column compared with the wrong value or dropped from a multi-condition predicate
  - Bulk update writing a column that should have been scoped to one subtype
  - Negation or NOT clause that inverts the intended subset and hits everything else
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
activation:
  file_globs:
    - "**/*.{py,pyi,ts,tsx,js,jsx,mjs,cjs,go,rs,java,kt,rb,swift,cs,php,cpp,cc,c,h,hpp,scala,ex,exs,erl,clj,dart,lua,r,m,sh,sql}"
  keyword_matches:
    - deleteMany
    - updateMany
    - delete
    - destroy
    - removeAll
    - truncate
    - DELETE
    - UPDATE
    - where
    - filter
    - OR
    - "in:"
  structural_signals:
    - Bulk delete or update call whose filter omits a discriminator the function name or surrounding context implies
    - Mutation predicate combined with OR or NOT that can widen the matched set
    - "DELETE or UPDATE statement (raw or ORM) with no WHERE or an empty/dynamic filter"
    - A read path filters by a column that the matching write path drops
    - Hard delete where sibling code or the schema uses a soft-delete flag
source:
  origin: file
  path: footgun-destructive-query-scope.md
  hash: "sha256:3fb7d882dd94c80cbf0718b5d543b71471354fc206fe7d09212be95872fde7b3"
dimensions:
  - correctness
  - security
audit_surface:
  - "deleteMany/updateMany/destroy/removeAll called with a filter that lacks the subtype/method/tenant column the function name implies"
  - "A delete or update predicate joined by OR where one branch (e.g. retryCount > N) matches rows outside the intended subset"
  - UPDATE statement with SET but no WHERE clause
  - DELETE FROM statement with no WHERE clause
  - Raw SQL string built by concatenation where the WHERE fragment can be empty or user-controlled
  - "where/filter argument that is an empty object {} or null, deleting or updating every row"
  - "A function scoped by its name (deleteSmsReminders) whose query body omits the method = 'SMS' condition"
  - "onDelete: Cascade or ON DELETE CASCADE on a relation whose parent delete reaches far more children than intended"
  - "Hard delete (delete/deleteMany/DELETE FROM) where the schema or sibling code uses a deletedAt/isActive soft-delete flag"
  - "A discriminator condition present in a SELECT/read path but absent from the matching DELETE/UPDATE path"
  - Predicate built from request params spread directly into where without an allowlist or required base filter
  - Transaction that removes rows then re-inserts, with no rollback guard if the reinsert step fails
  - "in: [...] or NOT IN clause whose set can be empty, inverting to match-everything"
  - Bulk mutation inside a loop or batch that re-applies a broad predicate each iteration
  - "A WHERE with only a non-selective condition (status, timestamp) and no owner/tenant/type anchor"
  - "Default/fallback branch that runs the destructive query without the guard the happy path enforces"
languages:
  - py
  - ts
  - js
  - go
  - rs
  - java
  - kt
  - rb
  - swift
  - cs
  - php
  - cpp
  - scala
  - ex
  - sql
---

# Destructive Query Scope Footguns

## When This Activates

Activates when a diff performs a destructive data operation, a `DELETE`, an `UPDATE`, a bulk write, or an ORM equivalent such as `deleteMany`, `updateMany`, `destroy`, `removeAll`, or `truncate`, and the predicate that selects rows is either missing, empty, or broader than the operation's intent. The defining risk is scope: the statement runs successfully and silently mutates rows the author never meant to touch, producing irreversible data loss or corruption. Engage whenever the function's name, type, or surrounding context implies a subset (one tenant, one owner, one method, one status, one subtype) but the query body does not pin that subset.

Defer to siblings when the bug is not about query scope: `footgun-null-and-missing-state` owns null/undefined and missing-state handling, and `footgun-unintended-recursion` owns runaway recursion and re-entrancy. If a query is correctly scoped but slow, that is a performance reviewer's concern, not this one. If raw SQL is unscoped specifically because user input is concatenated into the statement, flag the scope loss here and cross-reference injection.

## Audit Surface

- [ ] deleteMany/updateMany/destroy/removeAll called with a filter that lacks the subtype/method/tenant column the function name implies
- [ ] A delete or update predicate joined by OR where one branch (e.g. retryCount > N) matches rows outside the intended subset
- [ ] UPDATE statement with SET but no WHERE clause
- [ ] DELETE FROM statement with no WHERE clause
- [ ] Raw SQL string built by concatenation where the WHERE fragment can be empty or user-controlled
- [ ] where/filter argument that is an empty object {} or null, deleting or updating every row
- [ ] A function scoped by its name (deleteSmsReminders) whose query body omits the method = 'SMS' condition
- [ ] onDelete: Cascade or ON DELETE CASCADE on a relation whose parent delete reaches far more children than intended
- [ ] Hard delete where the schema or sibling code uses a deletedAt/isActive soft-delete flag
- [ ] A discriminator condition present in a SELECT/read path but absent from the matching DELETE/UPDATE path
- [ ] Predicate built from request params spread directly into where without an allowlist or required base filter
- [ ] Transaction that removes rows then re-inserts, with no rollback guard if the reinsert step fails
- [ ] in: [...] or NOT IN clause whose set can be empty, inverting to match-everything
- [ ] A WHERE with only a non-selective condition (status, timestamp) and no owner/tenant/type anchor
- [ ] Default/fallback branch that runs the destructive query without the guard the happy path enforces

## Detailed Checks

### Missing Discriminator in Bulk Mutations (CWE-1284)
<!-- activation: keywords=["deleteMany", "updateMany", "destroy", "removeAll", "where", "filter", "method", "type", "tenantId", "ownerId", "status"] -->

Trace the function's stated scope to the predicate that enforces it. Read the function name, its parameters, and its doc comment to learn which subset it is supposed to touch (one method, one tenant, one owner, one subtype, one status), then read the `where`/`filter` passed to the destructive call and confirm that subset column appears. The bug: the scoping column is implied by the name but absent from the query, so the mutation spills onto sibling rows.

- [ ] **Name implies a subset the query drops**: a function called `deleteSmsReminders`, `purgeTenantData`, or `clearOwnerCart` whose `deleteMany({ where: ... })` does not include `method: 'SMS'`, `tenantId`, or `ownerId`. The query compiles and runs against every row of the matching shape. Add the discriminator to the predicate.

  Before:
  ```
  // deletes Email and WhatsApp reminders too
  prisma.reminder.deleteMany({ where: { OR: [{ sent: true }, { retryCount: { gte: 3 } }] } })
  ```
  After:
  ```
  prisma.reminder.deleteMany({ where: { method: 'SMS', OR: [{ sent: true }, { retryCount: { gte: 3 } }] } })
  ```

- [ ] **Discriminator present on read, missing on write**: the SELECT/`findMany` that gathers candidates filters by `method`/`tenantId`, but the paired `deleteMany`/`updateMany` rebuilds the predicate and omits it. Compare the two predicates side by side; they must carry the same anchor.
- [ ] **Multi-tenant guard dropped**: any bulk mutation in a multi-tenant table missing the `tenantId`/`orgId`/`accountId` equality. Cross-tenant deletes are both data loss and an isolation breach.

### OR / NOT Clauses That Widen Scope (CWE-840)
<!-- activation: keywords=["OR", "NOT", "in:", "notIn", "OR(", "or(", "where", "any", "some"] -->

An `OR` in a destructive predicate is a scope amplifier: the row matches if ANY branch is true, so a single broad branch defeats the narrow ones. Trace each OR branch and ask "what is the widest set this branch alone matches?" If any branch lacks the subset anchor, the whole predicate lacks it.

- [ ] **OR branch escapes the subset**: `{ OR: [ { method: 'SMS', sent: true }, { retryCount: { gte: 3 } } ] }`. The second branch has no `method`, so it matches Email and WhatsApp rows with high retry counts. Hoist the shared discriminator OUT of the OR into a top-level AND so every branch is constrained: `{ method: 'SMS', OR: [ { sent: true }, { retryCount: { gte: 3 } } ] }`.
- [ ] **NOT inverts the target**: `where NOT (status = 'archived')` on a delete that was meant to remove archived rows hits everything else instead. Re-read the intent and confirm the polarity.
- [ ] **Empty IN / NOT IN flips to all**: `WHERE id IN (:ids)` where `:ids` can be empty deletes nothing (often fine), but `WHERE id NOT IN (:ids)` with an empty set matches every row. Guard the empty case explicitly before issuing the statement.

### No WHERE at All (CWE-89-adjacent, raw SQL)
<!-- activation: keywords=["DELETE", "UPDATE", "DELETE FROM", "UPDATE", "SET", "WHERE", "truncate", "execute", "raw", "$executeRaw", "query"] -->

Read the full statement string, including anything appended at runtime, and confirm a `WHERE` survives to execution. A raw `DELETE FROM t` or `UPDATE t SET ...` with no `WHERE` rewrites the whole table.

- [ ] **Literal unscoped statement**: flag `DELETE FROM reminders` or `UPDATE reminders SET sent = true` with no `WHERE`. If a full-table wipe is genuinely intended, it should use `TRUNCATE` with a comment, not an accidental `DELETE`.
- [ ] **WHERE fragment can vanish**: a statement assembled by concatenation where the `WHERE` piece is appended conditionally. If the condition is false, the statement ships without a `WHERE`. Build the predicate so the base scope is non-optional.

  Before:
  ```
  let sql = "DELETE FROM reminders";
  if (filters.method) sql += " WHERE method = '" + filters.method + "'";
  db.execute(sql); // runs table-wide when filters.method is absent
  ```
  After:
  ```
  db.execute("DELETE FROM reminders WHERE method = ?", [requireMethod(filters)]);
  ```
- [ ] **User input as the whole filter (CWE-89)**: a `where` spread directly from request params, or a WHERE fragment interpolated from user input, can be shaped to match every row (or injects SQL). Require an allowlist of filterable columns plus a mandatory server-side base scope.

### Empty / Dynamic Filter Resolving to Match-All (CWE-1284)
<!-- activation: keywords=["where", "filter", "{}", "Object.keys", "buildWhere", "criteria", "params", "spread"] -->

Trace the filter object back to where it is constructed. The failure: it is built conditionally and, on some path, ends up `{}`, `null`, or `undefined`, which most ORMs interpret as "all rows".

- [ ] **`{}` means all rows**: `repo.delete({})`, `Model.destroy({ where: {} })`, `deleteMany({})`. Confirm the filter is non-empty at the call site; reject empty objects with a guard.
- [ ] **Optional keys all stripped**: a `buildWhere(params)` that omits keys when params are missing can return `{}` when every param is absent. Assert at least the base discriminator is present before issuing the mutation.
- [ ] **Falsy filter passed through**: `deleteMany(filter)` where `filter` may be `undefined`. Fail closed: throw rather than delete when the scope is empty.

### Hard Delete vs Soft Delete, and Cascade Reach
<!-- activation: keywords=["delete", "deleteMany", "destroy", "deletedAt", "isDeleted", "isActive", "softDelete", "onDelete", "Cascade", "CASCADE"] -->

- [ ] **Hard delete where soft-delete is the norm**: if the schema has `deletedAt`, `isDeleted`, or `isActive`, or sibling code marks rows inactive, a raw `delete`/`DELETE FROM` removes audit history the rest of the system expects to keep. Use the soft-delete update unless a hard delete is explicitly intended.
- [ ] **Cascade removes more than expected**: trace `onDelete: Cascade` / `ON DELETE CASCADE` from the parent down. Deleting one parent row can cascade through children, grandchildren, and join rows. Confirm the blast radius matches intent; prefer `RESTRICT`/`SET NULL` where the cascade is not wanted.
- [ ] **Delete-then-reinsert without rollback**: a transaction that deletes rows and re-inserts replacements loses the originals if the reinsert throws and the surrounding code swallows the error or commits partially. Wrap both steps in one atomic transaction, or use upsert/merge instead of delete-then-insert.

## Common False Positives

- **Genuinely table-wide maintenance**: a migration, a test-database reset, or a documented purge job that truly intends to clear the whole table. If the full-table scope is intentional and commented (or uses `TRUNCATE`), do not flag it.
- **Single-row deletes by primary key**: `delete({ where: { id } })` is already scoped to one row; an absent discriminator is fine because the id is the discriminator.
- **OR within an already-anchored predicate**: if the shared discriminator is hoisted to a top-level AND and the OR only varies secondary conditions, the OR does not widen scope. Do not flag.
- **Filter proven non-empty upstream**: if a guard or type system guarantees the filter contains the required key before the call (e.g. a required field, a validated DTO, a branded type), the empty-filter concern does not apply.
- **Soft-delete cleanup jobs**: a background job that hard-deletes rows already soft-deleted (`deletedAt < now - retention`) is the correct use of a hard delete, not a soft-delete-skipped bug.
- **Intentional cascade**: a cascade designed to remove dependent rows (deleting an order removes its line items) is correct domain behavior; flag only when the reach exceeds the documented intent.

## Severity Guidance

| Finding | Severity |
|---|---|
| DELETE/UPDATE with no WHERE on a production table (raw or empty `{}` filter) | Critical |
| Bulk mutation missing a tenant/owner discriminator (cross-tenant data loss) | Critical |
| OR/NOT branch that widens a destructive predicate beyond the intended subset | Critical |
| Function-name scope (e.g. method = SMS) absent from its destructive query | Critical |
| User input spread directly into a delete/update WHERE (match-all or injection) | Critical |
| Hard delete where the schema uses a soft-delete flag | Important |
| Cascade onDelete reaching more children than the author intended | Important |
| Delete-then-reinsert transaction without a rollback guard | Important |
| Empty NOT IN set that inverts to match-everything | Important |
| Non-selective WHERE (status/timestamp only) with no owner/type anchor | Minor |
| Conditionally appended WHERE fragment with a safe default scope | Minor |

## See Also

- `footgun-null-and-missing-state` -- a null or undefined filter that resolves to match-all is a missing-state bug feeding this scope bug; that leaf owns the null handling, this one owns the destructive consequence
- `footgun-unintended-recursion` -- runaway recursion or re-entrant cascade triggers can amplify a destructive query; that leaf owns the recursion, this one owns the row scope
- `footgun-toctou-race` -- read-check-then-destructive-write races can delete rows that changed between check and act
- `orm-prisma` -- Prisma-specific deleteMany/updateMany and onDelete cascade shapes
- `orm-typeorm` -- TypeORM remove/delete/softDelete and cascade configuration
- `orm-sqlalchemy` -- SQLAlchemy bulk delete()/update() with synchronize_session pitfalls
- `sec-owasp-a03-injection` -- raw SQL whose WHERE is built from user input is both a scope and an injection vector

## Authoritative References

- [CWE-1284: Improper Validation of Specified Quantity in Input](https://cwe.mitre.org/data/definitions/1284.html)
- [CWE-840: Business Logic Errors](https://cwe.mitre.org/data/definitions/840.html)
- [CWE-89: Improper Neutralization of Special Elements used in an SQL Command (SQL Injection)](https://cwe.mitre.org/data/definitions/89.html)
- [PostgreSQL Documentation: DELETE](https://www.postgresql.org/docs/current/sql-delete.html)
- [PostgreSQL Documentation: UPDATE](https://www.postgresql.org/docs/current/sql-update.html)
- [OWASP: SQL Injection](https://owasp.org/www-community/attacks/SQL_Injection)
