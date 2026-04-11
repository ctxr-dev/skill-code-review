# Prisma — Review Overlay

Load this overlay for the **security**, **data-validation**, **performance**, and **test-quality** specialists when `prisma` or `@prisma/client` is detected in project dependencies.

---

## Security

- [ ] `$queryRaw` and `$executeRaw` always use tagged template literals (`Prisma.sql\`...\``) or `Prisma.raw` with parameterized placeholders — never string concatenation or template interpolation with user input
- [ ] Raw query results are treated as untyped and validated against an expected schema before use; Prisma does not type-check raw results at runtime
- [ ] `findFirst` / `findUnique` results are checked for `null` before access — missing null checks are a frequent source of runtime crashes and potential data leaks through error messages

## Schema and Migrations

- [ ] Migration files do not silently drop or rename columns without a corresponding data migration step — check for `DROP COLUMN` or `ALTER TABLE ... RENAME` in generated SQL
- [ ] `@default` values on new required columns allow the migration to run against an existing populated table without data loss
- [ ] The Prisma schema is the source of truth; application-level TypeScript types are derived from `Prisma.<Model>` generated types rather than hand-written parallel interfaces
- [ ] `prisma migrate deploy` (not `prisma migrate dev` or `prisma db push`) is used in CI/CD and production environments

## Performance

- [ ] Relations are loaded with `select` (projecting only needed fields) rather than `include` (which fetches entire related records), especially in list endpoints
- [ ] N+1 patterns are absent — related data accessed in loops is batched via a single query with `include`/`select` or a manual batch query, not fetched per-iteration
- [ ] `findMany` on large tables always has a `take` limit and cursor-based or offset pagination; unbounded `findMany` calls are flagged
- [ ] Connection pooling is configured correctly for the deployment target: PgBouncer in transaction mode requires `pgbouncer=true` in the connection string and `directUrl` for migrations
- [ ] Prisma Client is instantiated as a singleton (module-level or via a shared module) — a new `PrismaClient()` per request exhausts the connection pool

## Transactions

- [ ] Operations that must be atomic use `prisma.$transaction([...])` (sequential) or the interactive transaction callback (`prisma.$transaction(async (tx) => {...})`) — not two separate awaited calls
- [ ] Long-running interactive transactions are avoided; they hold database connections and locks for their entire duration

## Middleware and Logging

- [ ] `prisma.$use()` query middleware that logs queries does not log parameter values in production (PII/secret leakage risk)
- [ ] Soft-delete patterns implemented via Prisma middleware correctly exclude soft-deleted records from all query types (`findMany`, `findFirst`, `findUnique`, `count`), not just `findMany`

## Test Quality

- [ ] Unit tests mock Prisma using a singleton pattern (e.g., `jest-mock-extended` or a manual `__mocks__/@prisma/client.ts`) rather than calling a real database, so tests are deterministic and fast
- [ ] Integration tests that use a real database run against an isolated test database and reset state between tests via `prisma.$transaction` rollback or `prisma.modelName.deleteMany()`
- [ ] Tests do not import `PrismaClient` directly from the application module; they inject the client or use the mock, so they can control query results
