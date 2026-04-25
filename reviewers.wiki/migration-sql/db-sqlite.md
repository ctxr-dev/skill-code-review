---
id: db-sqlite
type: primary
depth_role: leaf
focus: Detect SQLite-specific pitfalls around WAL mode, busy timeouts, concurrent write contention, file locking, FTS5 configuration, and production misuse
parents:
  - index.md
covers:
  - "WAL mode not enabled for concurrent read/write workloads"
  - Missing busy_timeout causing immediate SQLITE_BUSY errors
  - Concurrent write contention from multiple processes or threads
  - FTS5 misconfiguration or missing tokenizer specification
  - Journal mode mismatch across connections to the same database
  - "File-level locking failures on network filesystems (NFS, SMB)"
  - Database file permissions allowing unauthorized access
  - VACUUM blocking all operations on large databases
tags:
  - sqlite
  - wal
  - busy-timeout
  - concurrent-writes
  - fts5
  - json1
  - journal-mode
  - file-locking
  - embedded-database
activation:
  file_globs:
    - "**/*.db"
    - "**/*.sqlite"
    - "**/*.sqlite3"
    - "**/sqlite*"
    - "**/*repository*"
    - "**/*dao*"
    - "**/*database*"
  keyword_matches:
    - sqlite
    - sqlite3
    - PRAGMA
    - WAL
    - busy_timeout
    - journal_mode
    - FTS5
    - JSON1
    - json_extract
    - ATTACH DATABASE
    - foreign_keys
    - synchronous
    - SQLITE_BUSY
    - better-sqlite3
    - rusqlite
    - "diesel::sqlite"
source:
  origin: file
  path: db-sqlite.md
  hash: "sha256:cdf3734b4c0fb2b4bb778c987ae962a92fd799cbc194b93b46879020128a4b6b"
---
# SQLite Pitfalls

## When This Activates

Activates on diffs involving SQLite database operations, PRAGMA configuration, or ORM code targeting SQLite. SQLite is an embedded database with fundamentally different concurrency and locking semantics than client-server databases. It uses file-level locking, supports only one writer at a time, and has critical PRAGMAs (WAL mode, busy_timeout, foreign_keys) that default to suboptimal values. Misuse of SQLite in server applications without understanding these constraints causes SQLITE_BUSY errors under load, silent data integrity gaps from disabled foreign keys, and corruption on network filesystems.

## Audit Surface

- [ ] SQLite database used in server application without WAL mode
- [ ] Connection opened without PRAGMA busy_timeout set
- [ ] Multiple processes writing to same SQLite file concurrently
- [ ] SQLite database file on NFS, SMB, or network-mounted filesystem
- [ ] FTS5 table without explicit tokenizer or missing rebuild after schema change
- [ ] Journal mode set to DELETE or TRUNCATE in concurrent-access scenario
- [ ] VACUUM run on production database during serving hours
- [ ] JSON1 functions used without checking compile-time availability
- [ ] ATTACH DATABASE used with user-controlled file path
- [ ] SQLite used as primary database for high-concurrency web server
- [ ] Missing PRAGMA foreign_keys = ON (off by default)
- [ ] Large BLOB stored inline instead of using external file references
- [ ] Transaction not explicitly started, relying on autocommit for multi-statement operations
- [ ] PRAGMA synchronous set to OFF in production

## Detailed Checks

### WAL Mode and Journal Configuration
<!-- activation: keywords=["PRAGMA journal_mode", "WAL", "DELETE", "TRUNCATE", "PERSIST", "MEMORY", "OFF", "wal_checkpoint", "journal_mode"] -->

- [ ] **Missing WAL mode**: flag SQLite databases opened without `PRAGMA journal_mode=WAL` in applications with concurrent readers and writers -- WAL mode allows readers and a single writer to operate concurrently; the default rollback journal blocks readers during writes
- [ ] **Journal mode mismatch**: flag connections to the same database file setting different journal modes -- the first connection's journal mode wins; subsequent connections silently inherit it, causing confusion
- [ ] **PRAGMA synchronous=OFF**: flag `PRAGMA synchronous=OFF` in any non-ephemeral context -- this risks database corruption on power loss or OS crash; use NORMAL with WAL mode for the best safety/performance balance

### Busy Timeout and Concurrency
<!-- activation: keywords=["busy_timeout", "SQLITE_BUSY", "locked", "concurrent", "threading", "multiprocessing", "BEGIN IMMEDIATE", "BEGIN EXCLUSIVE"] -->

- [ ] **Missing busy_timeout**: flag connections opened without `PRAGMA busy_timeout` -- without a busy timeout, any write attempt that encounters a lock returns SQLITE_BUSY immediately instead of retrying, causing spurious failures under even light concurrency
- [ ] **Multi-process writes without coordination**: flag architectures where multiple server processes write to the same SQLite file without a write queue or mutex -- SQLite supports only one writer at a time, and contention causes SQLITE_BUSY even with busy_timeout
- [ ] **BEGIN DEFERRED for write transactions**: flag write transactions using `BEGIN` (deferred) instead of `BEGIN IMMEDIATE` -- deferred transactions acquire a write lock only at the first write statement, which can cause deadlocks when two transactions both start deferred and both try to upgrade to write

### File System and Platform Risks
<!-- activation: keywords=["NFS", "SMB", "CIFS", "network", "mount", "tmpfs", "docker", "volume", "permission", "chmod", "file path"] -->

- [ ] **SQLite on network filesystem**: flag SQLite databases on NFS, SMB/CIFS, or any network-mounted filesystem -- SQLite's file locking relies on POSIX fcntl locks, which are unreliable on network filesystems and lead to silent corruption
- [ ] **Database file in /tmp or ephemeral volume**: flag SQLite databases in temporary directories or Docker volumes without persistence -- data loss occurs on container restart or cleanup
- [ ] **Overly permissive file permissions**: flag SQLite database files (and their -wal and -shm companions) with world-readable or world-writable permissions -- the database is a plain file; filesystem permissions are the access control layer

### FTS5 and JSON1 Extensions
<!-- activation: keywords=["FTS5", "fts5", "MATCH", "rank", "bm25", "json_extract", "json_each", "json_tree", "JSON1", "json_valid", "tokenizer"] -->

- [ ] **FTS5 without explicit tokenizer**: flag FTS5 virtual tables created without specifying a tokenizer -- the default `unicode61` tokenizer may not suit all languages; CJK text requires `trigram` or a custom tokenizer
- [ ] **JSON1 functions assumed available**: flag use of `json_extract()`, `json_each()`, or other JSON1 functions without runtime availability check -- JSON1 is a compile-time extension not present in all SQLite builds
- [ ] **FTS5 index not rebuilt after schema change**: flag ALTER TABLE or data migration on FTS5 content tables without `INSERT INTO fts_table(fts_table) VALUES('rebuild')` -- the FTS index becomes stale

### Production Misuse
<!-- activation: keywords=["server", "web", "api", "concurrent", "production", "VACUUM", "ATTACH", "foreign_keys", "autocommit", "BLOB"] -->

- [ ] **SQLite as high-concurrency web backend**: flag SQLite as the primary database for web servers expecting >50 concurrent write requests -- SQLite's single-writer model becomes a bottleneck; consider PostgreSQL or MySQL
- [ ] **Foreign keys disabled**: flag SQLite connections without `PRAGMA foreign_keys = ON` -- SQLite disables foreign key enforcement by default, silently allowing referential integrity violations
- [ ] **ATTACH DATABASE with user input**: flag ATTACH DATABASE where the file path includes user-controlled input -- this is a path traversal and information disclosure vector

## Common False Positives

- **SQLite for testing**: using SQLite as a test database instead of the production database engine is common and acceptable. Flag only when SQLite-specific behavior (locking, type affinity) differs from production and could mask bugs.
- **Single-process CLI tools**: command-line applications with a single process writing to SQLite do not need WAL mode or busy_timeout. Flag only multi-process or server contexts.
- **In-memory SQLite**: `:memory:` databases used for caching or ephemeral state have no file locking concerns. Flag only file-backed databases.
- **Embedded/mobile applications**: SQLite is the intended database for mobile (Android, iOS) and embedded use cases. Do not flag SQLite choice in these contexts.

## Severity Guidance

| Finding | Severity |
|---|---|
| SQLite on NFS or network filesystem in production | Critical |
| PRAGMA synchronous=OFF on persistent production data | Critical |
| PRAGMA foreign_keys not enabled with FK constraints defined | Important |
| Missing busy_timeout in multi-connection application | Important |
| Missing WAL mode in server application with concurrent access | Important |
| ATTACH DATABASE with user-controlled file path | Important |
| Multi-process writes without coordination layer | Important |
| FTS5 index not rebuilt after content table migration | Minor |
| JSON1 functions used without runtime availability check | Minor |
| VACUUM during serving hours on large database | Minor |

## See Also

- `data-n-plus-1-and-query-perf` -- N+1 queries in SQLite are amplified by single-writer lock contention
- `data-schema-migrations` -- SQLite ALTER TABLE is severely limited; many migrations require table recreation
- `sec-owasp-a03-injection` -- SQL injection applies to all SQLite query construction
- `db-connection-pooling` -- SQLite connections are per-file handles; pooling semantics differ from client-server databases

## Authoritative References

- [SQLite Documentation: Write-Ahead Logging](https://www.sqlite.org/wal.html)
- [SQLite Documentation: File Locking and Concurrency](https://www.sqlite.org/lockingv3.html)
- [SQLite Documentation: The Virtual Table Mechanism (FTS5)](https://www.sqlite.org/fts5.html)
- [SQLite Documentation: Appropriate Uses for SQLite](https://www.sqlite.org/whentouse.html)
- [Litestream: SQLite Replication Considerations](https://litestream.io/tips/)
