# SQLAlchemy — Review Overlay

Load this overlay for the **Security**, **Data Layer**, and **Performance** specialists when SQLAlchemy usage is detected.

## Security — SQL Injection

- [ ] Raw SQL is never passed directly to `session.execute()` as a plain string; it must be wrapped in `text()` with bound parameters (`text("SELECT * FROM t WHERE id = :id")`, `{"id": val}`)
- [ ] `text()` fragments inside ORM queries do not embed f-string or `%`-formatted user values; only named bind parameters are acceptable
- [ ] No use of `connection.execute(string)` with unparameterized queries in any code path reachable from external input
- [ ] `literal_column()` and `column()` with user-supplied strings are absent; use mapped column references instead

## Data Layer — Session Lifecycle

- [ ] `scoped_session` is used in multithreaded/WSGI contexts; a plain `Session` is not shared across threads or requests
- [ ] Session is created and closed within a well-defined scope (request, task, or context manager); no session leaked across request boundaries
- [ ] `session.commit()` / `session.rollback()` are always called inside a `try/except/finally` or via `with session.begin()` to prevent stale transactions
- [ ] `session.expire_on_commit` behavior is understood; accessing attributes after commit without a subsequent query will trigger implicit lazy loads
- [ ] Unit-of-work pattern is respected — objects are added to the session before flush; explicit `session.flush()` is used when SQL must be emitted before commit

## Performance — Loading Strategies

- [ ] N+1 query patterns are eliminated: relationships that are always accessed together use `joinedload()` or `selectinload()` rather than implicit lazy loading
- [ ] `lazy="dynamic"` on relationships is avoided in SQLAlchemy 2.x (deprecated); use `select` or `write_only` loading with explicit queries
- [ ] `selectinload` is preferred over `joinedload` for collections to avoid row multiplication
- [ ] Queries on large tables include `.limit()` and `.offset()` or keyset pagination; no uncapped `.all()` calls on unbounded result sets
- [ ] Connection pool settings (`pool_size`, `max_overflow`, `pool_timeout`) are explicitly configured for the deployment environment, not left at library defaults

## Data Layer — Alembic Migrations

- [ ] `alembic revision --autogenerate` output is reviewed manually before committing; autogenerate misses some changes (server defaults, check constraints)
- [ ] Destructive operations (column drops, type changes) are staged across two migrations: first make the column nullable/add new column, then remove old in a follow-up deploy
- [ ] `op.execute()` in migrations uses parameterized queries or static SQL only — no dynamic string construction
- [ ] `alembic downgrade` paths are tested for all migrations that will be applied to production

## Advanced Patterns

- [ ] `hybrid_property` expressions are tested for both Python-side (`instance.prop`) and SQL-side (`.filter(Model.prop == val)`) correctness
- [ ] Engine `.dispose()` is called after forking (e.g., in Celery `worker_process_init`) to prevent connection sharing across processes
