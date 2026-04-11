# Drizzle ORM — Review Overlay

Load this overlay for the **Security**, **Data Layer**, and **Type Safety** specialists when Drizzle ORM usage is detected.

## Security — SQL Safety

- [ ] No raw SQL strings passed to `sql` template tag without proper parameterization — values must be interpolated via `sql.placeholder()` or as tagged template expressions, never via string concatenation
- [ ] Dynamic column or table names are not constructed from user input without an explicit allowlist; the `sql` tag escapes values but not identifiers
- [ ] Prepared statements (`db.prepare()`) are used for any query that runs frequently or accepts external input
- [ ] `.where()` conditions using `sql` raw fragments do not embed unvalidated strings

## Data Layer — Schema and Migrations

- [ ] `drizzle-kit push` is never used against a production database; `drizzle-kit generate` + `migrate` is the correct production path
- [ ] Generated migration files are committed and reviewed before applying; auto-generated SQL is readable and reversible
- [ ] Destructive schema changes (column drops, type changes) include a corresponding down migration or are gated behind a feature flag
- [ ] Column `.notNull()` / `.default()` consistency matches application-layer expectations — a notNull column without a default will fail on insert if omitted
- [ ] Enum types changed in schema are reflected in migration; adding enum values is generally safe, removing is not
- [ ] `onDelete` / `onUpdate` cascade rules are explicitly set on foreign keys; implicit behavior varies by database driver

## Data Layer — Query Patterns

- [ ] Relation queries use the `with` / `query` API (relational query builder) rather than manual multi-join `sql` blocks when traversing defined relations
- [ ] `db.query.<table>.findMany()` includes a `limit` when the result set is unbounded — no uncapped full-table reads
- [ ] Transactions use `db.transaction(async (tx) => { … })` and all writes inside the callback use the `tx` handle, not the outer `db`
- [ ] Nested transactions use savepoints correctly; Drizzle wraps nested `db.transaction()` calls in savepoints automatically, but explicit rollback logic must target the right scope
- [ ] Batch inserts use `db.insert(table).values([…])` rather than individual inserts in a loop

## Type Safety — Schema and Inference

- [ ] Column types are inferred via `typeof schema.$inferSelect` and `typeof schema.$inferInsert` rather than hand-written interfaces that can drift
- [ ] `.$type<T>()` overrides on JSON columns are validated at the application boundary (zod / valibot parse), not relied upon purely for type safety
- [ ] Drizzle schema file is the single source of truth; no parallel type definitions that duplicate column shapes
- [ ] `drizzle-zod` or equivalent schema-to-validator bridge is used so validation and schema stay in sync
