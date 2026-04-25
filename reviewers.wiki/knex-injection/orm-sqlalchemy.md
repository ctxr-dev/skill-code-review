---
id: orm-sqlalchemy
type: primary
depth_role: leaf
focus: "Detect SQLAlchemy pitfalls including session mismanagement, lazy loading N+1, detached instance access, connection pool misconfiguration, raw text() injection, and expire_on_commit confusion"
parents:
  - index.md
covers:
  - Session not closed or scoped properly causing connection leaks
  - "Lazy loading N+1 when iterating relationships without joinedload/subqueryload"
  - Accessing attributes on detached instances after session close
  - Connection pool exhaustion from unbounded pool or missing pool_recycle
  - "SQL injection via text() with string formatting instead of bound parameters"
  - expire_on_commit=True causing unexpected re-queries after commit
  - "Missing flush/commit ordering causing stale reads"
  - "Async session misuse -- blocking I/O inside async session context"
  - Implicit autoflush triggering queries at unexpected points
tags:
  - sqlalchemy
  - orm
  - python
  - session
  - lazy-loading
  - connection-pool
  - injection
  - n-plus-1
  - data-architecture
activation:
  file_globs:
    - "**/*.py"
  keyword_matches:
    - sqlalchemy
    - SQLAlchemy
    - create_engine
    - Session
    - sessionmaker
    - scoped_session
    - relationship
    - joinedload
    - subqueryload
    - "text("
    - Column
    - Base
    - declarative_base
    - mapped_column
source:
  origin: file
  path: orm-sqlalchemy.md
  hash: "sha256:550650f8a5574fb0d42c4e5b7e2648cd5575b525ad1472a72d4716d8ad4a33b7"
---
# SQLAlchemy ORM

## When This Activates

Activates on Python diffs importing SQLAlchemy, defining models with `declarative_base` or `mapped_column`, or using `Session`, `create_engine`, or query APIs. SQLAlchemy is powerful but has a notoriously complex session lifecycle: lazy loading triggers N+1 silently, detached instances raise confusing errors, and `text()` with string formatting opens injection holes. This reviewer targets the most common SQLAlchemy-specific traps.

## Audit Surface

- [ ] Session created without scoped_session or context manager
- [ ] Relationship accessed inside loop without eager loading strategy
- [ ] Object attribute accessed after session.close() or outside with block
- [ ] create_engine() without pool_size, max_overflow, or pool_recycle settings
- [ ] text() called with f-string, .format(), or % formatting instead of bindparams
- [ ] expire_on_commit=True (default) on sessions where objects are used post-commit
- [ ] session.execute() with string SQL instead of text() or select()
- [ ] Async session running synchronous ORM operations
- [ ] Missing session.rollback() in exception handler
- [ ] autoflush=True causing implicit queries inside validation logic
- [ ] Bulk operations using add_all() in a loop instead of bulk_insert_mappings()
- [ ] Missing relationship back_populates causing stale bidirectional references

## Detailed Checks

### Session Lifecycle
<!-- activation: keywords=["Session", "session", "scoped_session", "sessionmaker", "close", "commit", "rollback", "with", "context", "begin", "expire_on_commit"] -->

- [ ] **Session leak**: flag `Session()` or `sessionmaker()()` calls without a corresponding `close()` or `with` block -- unclosed sessions hold database connections indefinitely; use `with Session() as session:` or scoped_session
- [ ] **Missing rollback on error**: flag try/except blocks around session operations with no `session.rollback()` in the except path -- without rollback the session enters an inconsistent state and subsequent operations fail
- [ ] **expire_on_commit confusion**: flag code that accesses object attributes after `session.commit()` with the default `expire_on_commit=True` and expects the pre-commit values -- commit expires all attributes; set `expire_on_commit=False` or refresh explicitly
- [ ] **Autoflush side effects**: flag `autoflush=True` sessions where query operations inside validation or computation logic trigger unexpected flushes -- set `autoflush=False` for read-heavy paths or use `session.no_autoflush` context manager

### Lazy Loading N+1
<!-- activation: keywords=["relationship", "lazy", "joinedload", "subqueryload", "selectinload", "raiseload", "lazyload", "for", "loop", "iterate"] -->

- [ ] **Lazy load in loop**: flag relationship attribute access (e.g., `user.orders`) inside a loop iterating over a query result -- each access issues a SELECT; use `joinedload()`, `subqueryload()`, or `selectinload()` on the original query
- [ ] **Default lazy='select'**: flag relationship definitions with no explicit `lazy` parameter on models used in list/collection contexts -- the default `lazy='select'` triggers N+1; set `lazy='selectin'` or apply eager loading at query time
- [ ] **Missing raiseload**: flag high-performance code paths that do not use `raiseload('*')` to detect accidental lazy loads -- raiseload raises an exception instead of silently issuing queries

### Detached Instance Access
<!-- activation: keywords=["detach", "expunge", "close", "merge", "LazyLoad", "DetachedInstanceError", "make_transient"] -->

- [ ] **Access after close**: flag object attribute access after `session.close()` or outside a `with Session()` block -- accessing unloaded attributes on a detached instance raises `DetachedInstanceError`; load needed attributes before closing or use `expire_on_commit=False`
- [ ] **Returning ORM objects from session scope**: flag functions that return ORM model instances from inside a session context to callers outside it -- the objects become detached; return DTOs or load all needed attributes first
- [ ] **Missing merge**: flag `session.add()` on an object that was loaded in a different session without calling `session.merge()` first -- this causes duplicate key errors or identity map conflicts

### Connection Pool Configuration
<!-- activation: keywords=["create_engine", "pool_size", "max_overflow", "pool_recycle", "pool_pre_ping", "QueuePool", "NullPool", "connection"] -->

- [ ] **Default pool settings**: flag `create_engine()` calls without `pool_size`, `max_overflow`, or `pool_recycle` -- defaults (pool_size=5, max_overflow=10) are insufficient for production; tune based on expected concurrency
- [ ] **Missing pool_pre_ping**: flag production `create_engine()` without `pool_pre_ping=True` -- without pre-ping, stale connections from database restarts cause errors on first use
- [ ] **Missing pool_recycle for MySQL**: flag MySQL connections without `pool_recycle` set below MySQL's `wait_timeout` (default 8h) -- MySQL silently closes idle connections; pool_recycle=3600 prevents stale connection errors

### Raw SQL Injection
<!-- activation: keywords=["text(", "text(\"", "f\"", ".format(", "execute(", "raw", "%s", "bindparam"] -->

- [ ] **text() with f-string**: flag `text(f"SELECT ... WHERE id = {user_id}")` -- this injects the variable directly into SQL; use `text("SELECT ... WHERE id = :id").bindparams(id=user_id)`
- [ ] **text() with .format()**: flag `text("SELECT ... WHERE name = '{}'".format(name))` -- identical injection risk; use named bind parameters
- [ ] **session.execute(string)**: flag `session.execute("SELECT ...")` with a plain string instead of `text()` or a `select()` construct -- plain strings bypass SQLAlchemy's parameterization; always use `text()` with bind params or the expression API

### Async Session Pitfalls
<!-- activation: keywords=["AsyncSession", "async_session", "async_scoped_session", "run_sync", "AsyncEngine", "create_async_engine"] -->

- [ ] **Sync operations in async session**: flag synchronous ORM patterns (lazy loading, implicit IO) used inside `AsyncSession` -- async SQLAlchemy requires explicit eager loading; lazy loads raise `MissingGreenlet` errors
- [ ] **Missing run_sync for DDL**: flag DDL operations (`Base.metadata.create_all()`) called directly on an `AsyncEngine` without `run_sync` -- use `async with engine.begin() as conn: await conn.run_sync(Base.metadata.create_all)`

## Common False Positives

- **Lazy load on single object**: accessing a relationship on a single fetched object (not in a loop) is a single query, not N+1.
- **Script/test sessions**: sessions in test fixtures or one-shot scripts without full lifecycle management are acceptable.
- **NullPool in serverless**: `NullPool` (no pooling) is intentional in serverless environments; do not flag as misconfigured.
- **expire_on_commit=True with refresh**: if code explicitly calls `session.refresh(obj)` after commit, expire_on_commit is handled.

## Severity Guidance

| Finding | Severity |
|---|---|
| text() with f-string or .format() containing user input | Critical |
| session.execute() with string concatenation and user input | Critical |
| Lazy loading inside loop on unbounded collection | Critical |
| Session leak -- no close() or context manager | Critical |
| Detached instance access after session close | Important |
| Missing pool_pre_ping in production | Important |
| expire_on_commit confusion causing stale data | Important |
| Default pool settings in high-concurrency production | Important |
| Missing rollback in exception handler | Minor |
| Autoflush side effects in validation logic | Minor |
| Missing back_populates on bidirectional relationship | Minor |

## See Also

- `data-n-plus-1-and-query-perf` -- SQLAlchemy lazy loading is the most common source of N+1 in Python applications
- `sec-owasp-a03-injection` -- text() injection is a specific case of the general SQL injection pattern
- `data-schema-migrations` -- Alembic (SQLAlchemy's migration tool) safety patterns
- `migration-alembic` -- Alembic-specific migration pitfalls for SQLAlchemy projects

## Authoritative References

- [SQLAlchemy Documentation, "Session Basics"](https://docs.sqlalchemy.org/en/20/orm/session_basics.html)
- [SQLAlchemy Documentation, "Relationship Loading Techniques"](https://docs.sqlalchemy.org/en/20/orm/queryguide/relationships.html)
- [SQLAlchemy Documentation, "Connection Pooling"](https://docs.sqlalchemy.org/en/20/core/pooling.html)
- [SQLAlchemy Documentation, "Working with Engines and Connections"](https://docs.sqlalchemy.org/en/20/core/connections.html)
