---
id: db-mysql-mariadb
type: primary
depth_role: leaf
focus: Detect MySQL and MariaDB pitfalls around storage engine selection, replication lag, deadlocks, gap locks, character set mismatches, and missing slow query analysis
parents:
  - index.md
covers:
  - MyISAM tables in contexts requiring transactions or crash safety
  - Replication lag causing stale reads after writes
  - Deadlocks from inconsistent lock ordering or gap locks
  - Character set mismatch between client, connection, and table causing mojibake or index bypass
  - Query cache invalidation overhead on write-heavy workloads
  - Slow query log not enabled or not monitored
  - Implicit type conversions defeating index usage
  - Large transactions on replicated setups causing replica delay
tags:
  - mysql
  - mariadb
  - innodb
  - myisam
  - replication
  - deadlock
  - gap-lock
  - character-set
  - collation
  - slow-query
  - query-cache
activation:
  file_globs:
    - "**/*.sql"
    - "**/mysql*"
    - "**/mariadb*"
    - "**/my.cnf"
    - "**/my.ini"
    - "**/*migration*"
    - "**/*schema*"
    - "**/*repository*"
    - "**/*dao*"
  keyword_matches:
    - mysql
    - mariadb
    - innodb
    - myisam
    - ENGINE=
    - CHARSET
    - COLLATE
    - utf8mb4
    - replication
    - slave
    - replica
    - binlog
    - slow_query
    - gap lock
    - ON DUPLICATE KEY
    - sql_mode
    - STRICT_TRANS_TABLES
    - auto_increment
source:
  origin: file
  path: db-mysql-mariadb.md
  hash: "sha256:231b993d565e5f67271e1647943a33f8beeea91204ffa81196d755e640882f44"
---
# MySQL / MariaDB Pitfalls

## When This Activates

Activates on diffs involving MySQL or MariaDB queries, migrations, configuration, or ORM code targeting these engines. MySQL's storage engine architecture, replication model, and InnoDB gap lock behavior create pitfalls absent in other databases. MyISAM tables silently lose data on crash. Replication lag causes reads to return stale data seconds after a write. Gap locks under REPEATABLE READ produce deadlocks on INSERT-heavy workloads. Character set mismatches cause silent data corruption and defeated indexes. This reviewer targets detection heuristics for these MySQL/MariaDB-specific failure modes.

## Audit Surface

- [ ] Table created with ENGINE=MyISAM in a transactional application
- [ ] Read-after-write pattern without routing to the primary in a replicated setup
- [ ] Deadlock retry logic missing in transaction code
- [ ] Gap lock contention from range queries under REPEATABLE READ
- [ ] Character set or collation mismatch between table, column, and connection
- [ ] Query cache enabled (query_cache_type=ON) on MySQL 5.7 or write-heavy workloads
- [ ] slow_query_log disabled or long_query_time set above 1 second
- [ ] WHERE clause comparing string column to integer without explicit CAST
- [ ] GROUP BY without ORDER BY relying on implicit sort (removed in MySQL 8.0)
- [ ] Large BLOB or TEXT columns in primary table instead of separate table
- [ ] INSERT ... ON DUPLICATE KEY UPDATE causing auto-increment gaps
- [ ] Foreign key across different storage engines
- [ ] OPTIMIZE TABLE run during peak traffic hours
- [ ] sql_mode not including STRICT_TRANS_TABLES

## Detailed Checks

### Storage Engine Selection
<!-- activation: keywords=["ENGINE=", "MyISAM", "InnoDB", "MEMORY", "ARCHIVE", "CREATE TABLE", "ALTER TABLE", "SHOW TABLE STATUS"] -->

- [ ] **MyISAM in transactional context**: flag tables using ENGINE=MyISAM in applications that use BEGIN/COMMIT/ROLLBACK -- MyISAM does not support transactions; a crash mid-operation leaves the table in an inconsistent state
- [ ] **Foreign key across engines**: flag foreign key constraints referencing a table with a different storage engine -- InnoDB enforces foreign keys; MyISAM ignores them silently, so cross-engine FK is not enforced
- [ ] **Missing explicit ENGINE clause**: flag CREATE TABLE without explicit ENGINE specification -- the default engine depends on server config and may differ between environments

### Replication Lag
<!-- activation: keywords=["replica", "slave", "replication", "read_replica", "primary", "master", "binlog", "SHOW SLAVE STATUS", "Seconds_Behind_Master", "gtid"] -->

- [ ] **Read-after-write to replica**: flag patterns where application writes to primary then immediately reads from a replica -- replication lag means the replica may not yet have the written data, causing inconsistent user experience
- [ ] **Large transaction blocking replication**: flag transactions that modify thousands of rows in a single statement on replicated setups -- single-threaded replication applies the entire transaction as one unit, blocking all other replication during that time
- [ ] **No lag monitoring**: flag replicated deployments without monitoring of `Seconds_Behind_Master` or GTID position -- replication can silently fall hours behind

### Deadlocks and Gap Locks
<!-- activation: keywords=["deadlock", "gap lock", "REPEATABLE READ", "FOR UPDATE", "LOCK IN SHARE MODE", "INSERT", "innodb_lock_wait_timeout", "SHOW ENGINE INNODB STATUS"] -->

- [ ] **No deadlock retry**: flag transaction code without retry logic for MySQL error 1213 (deadlock detected) -- InnoDB resolves deadlocks by aborting one transaction, and the application must retry
- [ ] **Gap lock contention on INSERT**: flag INSERT-heavy workloads under REPEATABLE READ isolation -- gap locks on secondary indexes can cause deadlocks between concurrent inserts even when they target different rows
- [ ] **Inconsistent lock ordering**: flag transactions that lock rows in different orders across code paths -- acquiring locks in table A then B in one path and B then A in another guarantees deadlocks under contention

### Character Set and Collation
<!-- activation: keywords=["CHARSET", "CHARACTER SET", "COLLATE", "utf8", "utf8mb4", "latin1", "SET NAMES", "character_set_connection", "collation_connection", "encoding"] -->

- [ ] **utf8 instead of utf8mb4**: flag tables or columns using MySQL's `utf8` charset -- MySQL's `utf8` is a 3-byte encoding that cannot store 4-byte Unicode (emoji, some CJK). Use `utf8mb4` for true UTF-8
- [ ] **Collation mismatch in JOIN**: flag JOINs or WHERE comparisons between columns with different collations -- MySQL must convert on the fly, which prevents index usage and causes full scans
- [ ] **Missing SET NAMES in connection**: flag application connections that do not set the client character set to match the table encoding -- mismatched connection charset causes silent mojibake on write and read

### Implicit Conversions and Query Pitfalls
<!-- activation: keywords=["WHERE", "EXPLAIN", "slow_query", "long_query_time", "query_cache", "GROUP BY", "ORDER BY", "CAST", "CONVERT", "type conversion", "sql_mode"] -->

- [ ] **Implicit type conversion defeating index**: flag WHERE clauses comparing a VARCHAR column to an integer literal (`WHERE phone = 12345`) -- MySQL casts every row's column value to a number, preventing index usage
- [ ] **GROUP BY implicit sort removed**: flag queries relying on GROUP BY to produce sorted results without an explicit ORDER BY -- MySQL 8.0 removed the implicit sort guarantee; results may arrive in any order
- [ ] **sql_mode missing STRICT_TRANS_TABLES**: flag MySQL configurations without STRICT_TRANS_TABLES -- non-strict mode silently truncates data and inserts defaults for invalid values instead of raising errors

## Common False Positives

- **MyISAM for full-text search on MySQL < 5.6**: before MySQL 5.6, only MyISAM supported FULLTEXT indexes. This is a legacy constraint, not a mistake. Flag only on MySQL >= 5.6 where InnoDB supports FULLTEXT.
- **Read-after-write with causal consistency**: some proxy layers (ProxySQL, Vitess) support causal reads that wait for replica to catch up. Verify the proxy config before flagging.
- **Gap locks under READ COMMITTED**: switching to READ COMMITTED isolation eliminates gap locks by design. Flag gap lock contention only under REPEATABLE READ.
- **Query cache on read-heavy workloads**: on MySQL 5.7 with >95% reads, query cache may be beneficial. Note that MySQL 8.0 removed query cache entirely.

## Severity Guidance

| Finding | Severity |
|---|---|
| MyISAM table in application using transactions | Critical |
| Read-after-write pattern hitting replica with no lag-awareness | Critical |
| utf8 charset used instead of utf8mb4 on user-facing text columns | Important |
| Missing deadlock retry logic in transaction code | Important |
| Implicit type conversion in WHERE clause defeating index | Important |
| sql_mode missing STRICT_TRANS_TABLES | Important |
| Large transaction blocking single-threaded replication | Important |
| GROUP BY without ORDER BY relying on deprecated implicit sort | Minor |
| slow_query_log disabled in production | Minor |
| OPTIMIZE TABLE without maintenance window | Minor |

## See Also

- `data-n-plus-1-and-query-perf` -- N+1 patterns amplified by MySQL's gap lock behavior under concurrent inserts
- `data-schema-migrations` -- MySQL DDL is not transactional; failed migrations leave partial schema changes
- `db-connection-pooling` -- MySQL max_connections and thread-per-connection model require external pooling
- `sec-owasp-a03-injection` -- SQL injection applies to all MySQL query patterns

## Authoritative References

- [MySQL Documentation: InnoDB Locking](https://dev.mysql.com/doc/refman/8.0/en/innodb-locking.html)
- [MySQL Documentation: Replication](https://dev.mysql.com/doc/refman/8.0/en/replication.html)
- [MySQL Documentation: Character Sets and Collations](https://dev.mysql.com/doc/refman/8.0/en/charset.html)
- [Percona Blog: InnoDB Gap Locks](https://www.percona.com/blog/innodb-gap-locks/)
- [MariaDB Knowledge Base: Differences from MySQL](https://mariadb.com/kb/en/mariadb-vs-mysql-compatibility/)
