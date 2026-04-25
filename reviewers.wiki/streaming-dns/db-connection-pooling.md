---
id: db-connection-pooling
type: primary
depth_role: leaf
focus: Detect database connection pooling pitfalls around pool sizing, leak detection, idle timeout, PgBouncer mode selection, HikariCP configuration, and connection-per-request anti-patterns
parents:
  - index.md
covers:
  - "Pool size too large (thread contention) or too small (request queueing)"
  - "Connection leaks from missing close/release in error paths"
  - Idle timeout misconfigured causing stale connections or excessive churn
  - PgBouncer transaction mode breaking session-level features
  - "HikariCP configuration anti-patterns (oversized pool, missing leak detection)"
  - Connection-per-request pattern exhausting database connections
  - "Missing health checks on pooled connections (stale/broken connections)"
  - Pool configuration not accounting for CPU-bound vs IO-bound workloads
tags:
  - connection-pool
  - pgbouncer
  - hikaricp
  - pool-sizing
  - leak-detection
  - idle-timeout
  - database-connection
  - c3p0
  - dbcp
  - sqlalchemy-pool
  - knex-pool
activation:
  file_globs:
    - "**/*pool*"
    - "**/*connection*"
    - "**/*datasource*"
    - "**/*database*"
    - "**/pgbouncer*"
    - "**/hikari*"
    - "**/*config*"
    - "**/application.yml"
    - "**/application.properties"
    - "**/.env*"
    - "**/knexfile*"
    - "**/ormconfig*"
  keyword_matches:
    - pool
    - Pool
    - connection pool
    - maxPoolSize
    - maximumPoolSize
    - minIdle
    - max_connections
    - pool_size
    - connectionTimeout
    - idleTimeout
    - leakDetectionThreshold
    - pgbouncer
    - PgBouncer
    - HikariCP
    - hikari
    - c3p0
    - DBCP
    - pooling
    - getConnection
    - createPool
    - pool.query
    - SQLAlchemy
    - pool_recycle
    - knex
    - pool.min
    - pool.max
source:
  origin: file
  path: db-connection-pooling.md
  hash: "sha256:a42b5c71e7aa3b3417502890709362b68d7ade66cc3261757ea253ff52e60ca1"
---
# Connection Pooling Pitfalls

## When This Activates

Activates on diffs involving database connection configuration, pool settings, ORM datasource setup, or PgBouncer/proxy configuration. Connection pooling is the critical layer between application servers and databases. Pool too large and the database drowns in context switches. Pool too small and requests queue. Leaked connections exhaust the pool under load. PgBouncer in transaction mode silently breaks session-level features. Stale connections cause intermittent errors. This reviewer targets detection heuristics for connection pooling pitfalls that cause production outages across all database technologies.

## Audit Surface

- [ ] Pool maximum size > (2 * CPU cores) + effective_spindle_count for CPU-bound workloads
- [ ] Pool maximum size > 50 for a single application instance
- [ ] Connection acquired without close/release in finally/defer/ensure/using block
- [ ] Idle connection timeout < server-side timeout causing broken pipe errors
- [ ] PgBouncer in transaction mode with prepared statements or SET commands
- [ ] HikariCP leakDetectionThreshold not configured
- [ ] HikariCP connectionTimeout set to 0 (infinite wait)
- [ ] New connection created per HTTP request instead of pool checkout
- [ ] Pool minimum idle connections set equal to maximum (no elasticity)
- [ ] No connection validation query or validation timeout configured
- [ ] Multiple pools targeting the same database without coordinated sizing
- [ ] ORM session/context held across async/await boundaries
- [ ] Connection pool configured without matching database max_connections
- [ ] SSL/TLS not enforced on pooled connections

## Detailed Checks

### Pool Sizing
<!-- activation: keywords=["pool", "Pool", "max", "min", "size", "maximumPoolSize", "maxPoolSize", "pool_size", "pool.max", "pool.min", "minIdle", "maxTotal", "connection_limit", "worker", "thread"] -->

- [ ] **Pool too large**: flag pool maximum size > 50 per application instance or > (2 *CPU_cores + 1) for CPU-bound workloads -- HikariCP's formula (pool_size = CPU_cores* 2 + effective_spindle_count) is a proven baseline; larger pools cause database context switching, lock contention, and memory waste. A single PostgreSQL instance performs optimally with 50-100 total connections across all application instances
- [ ] **Pool too small**: flag pool maximum size < number of concurrent request-handling threads -- if the pool is smaller than the thread count, threads block waiting for connections, adding latency and risking deadlocks in transaction-heavy code
- [ ] **Total pool exceeds database max_connections**: flag when (pool_max * number_of_application_instances) > database max_connections -- each instance's pool competes for the database's connection limit; exceeding it causes connection refused errors under load
- [ ] **No elasticity**: flag pool configurations where minimum idle = maximum size -- the pool cannot shrink during low-traffic periods, wasting database connections. Allow the pool to shrink to a minimum idle count

### Leak Detection
<!-- activation: keywords=["leak", "close", "release", "finally", "defer", "ensure", "using", "dispose", "with", "context manager", "try-with-resources", "leakDetectionThreshold", "removeAbandoned", "timeout"] -->

- [ ] **Missing close in error path**: flag connection acquisition (getConnection, pool.checkout, session.begin) without close/release in a finally (Java), defer (Go), ensure (Ruby), using (C#), or with (Python) block -- if an exception occurs before close, the connection is leaked and never returned to the pool
- [ ] **No leak detection enabled**: flag HikariCP without `leakDetectionThreshold`, c3p0 without `unreturnedConnectionTimeout`, or SQLAlchemy without `pool_timeout` -- without leak detection, leaked connections silently accumulate until the pool is exhausted
- [ ] **Connection held across async boundary**: flag ORM sessions or connections held across async/await boundaries -- in async frameworks, the continuation may run on a different thread, causing thread-safety violations or indefinite connection hold times

### Idle and Validation
<!-- activation: keywords=["idle", "idleTimeout", "maxLifetime", "maxIdleTime", "pool_recycle", "validation", "testOnBorrow", "testWhileIdle", "validationQuery", "validationTimeout", "keepalive", "tcp_keepalive"] -->

- [ ] **Idle timeout mismatch**: flag pool idle timeout longer than the database server's connection timeout or firewall TCP timeout -- the pool holds a connection it believes is alive, but the server or firewall has closed it; the next query on that connection fails with a broken pipe or connection reset error
- [ ] **No connection validation**: flag pool configurations without validation (testOnBorrow, validationQuery, or keepalive) -- without validation, broken connections are handed to application code, causing intermittent query failures
- [ ] **maxLifetime not set**: flag HikariCP or similar pools without `maxLifetime` -- connections held forever accumulate server-side resources and may fail if the database restarts or the connection hits a server-side limit

### PgBouncer and Proxy Modes
<!-- activation: keywords=["pgbouncer", "PgBouncer", "pgcat", "odyssey", "ProxySQL", "session", "transaction", "statement", "pool_mode", "prepared", "SET ", "LISTEN", "NOTIFY", "temp table", "advisory lock", "server_reset_query"] -->

- [ ] **Transaction mode with session features**: flag PgBouncer in `pool_mode=transaction` when the application uses prepared statements, SET commands, LISTEN/NOTIFY, temporary tables, or advisory locks -- in transaction mode, PgBouncer reassigns server connections between transactions; session-level state is lost
- [ ] **Statement mode with multi-statement transactions**: flag PgBouncer in `pool_mode=statement` when the application uses explicit transactions (BEGIN/COMMIT) -- statement mode reassigns connections between individual statements, breaking transaction semantics
- [ ] **Missing server_reset_query**: flag PgBouncer without `server_reset_query = DISCARD ALL` in transaction mode -- without reset, session state from one client leaks to the next client that gets the same server connection

### Connection-Per-Request Anti-Pattern
<!-- activation: keywords=["connect", "createConnection", "new Connection", "DriverManager.getConnection", "psycopg2.connect", "mysql.createConnection", "sql.Open", "MongoClient("] -->

- [ ] **Connection per request**: flag `DriverManager.getConnection()` (Java), `psycopg2.connect()` (Python), `mysql.createConnection()` (Node.js), or similar connection-creation calls inside request handlers -- creating a new TCP connection per request adds 5-50ms latency and exhausts database connections under load. Use a connection pool
- [ ] **MongoClient per request**: flag `new MongoClient()` created per request or function invocation -- MongoDB drivers include built-in connection pooling; creating a new client per request bypasses the pool and exhausts server connections
- [ ] **No connection reuse in serverless**: flag serverless functions (Lambda, Cloud Functions) that create a connection pool inside the handler function instead of at module scope -- each invocation creates a new pool; connections from previous invocations are leaked

## Common False Positives

- **Large pool for high-concurrency async frameworks**: async frameworks (Node.js, asyncio, Vert.x) with non-blocking I/O can efficiently use fewer connections than the concurrency level. The pool size formula applies to thread-per-request models.
- **PgBouncer session mode by design**: some applications intentionally use session mode for full PostgreSQL feature compatibility, accepting the higher connection count. Flag only transaction mode + session feature conflicts.
- **Single-instance development setup**: development environments with one application instance and one database do not need coordinated pool sizing. Flag only production-targeted configurations.
- **Connection per script for batch jobs**: CLI scripts and batch jobs that run once and exit may create a single connection without pooling. Flag only in long-running server processes.

## Severity Guidance

| Finding | Severity |
|---|---|
| Connection acquired without close/release in finally/defer/ensure block | Critical |
| Total pool size across instances exceeds database max_connections | Critical |
| Connection created per request instead of pool checkout in server code | Critical |
| PgBouncer transaction mode with prepared statements or SET commands | Important |
| No connection leak detection enabled | Important |
| Idle timeout longer than server-side connection timeout (broken pipes) | Important |
| Pool maximum > 50 per instance without justification | Important |
| No connection validation (stale connection risk) | Minor |
| maxLifetime not set on connection pool | Minor |
| Pool min idle = max size (no elasticity) | Minor |

## See Also

- `db-postgres` -- PostgreSQL max_connections and idle_in_transaction_session_timeout interact directly with pool configuration
- `db-mysql-mariadb` -- MySQL thread-per-connection model makes pool sizing critical
- `db-cockroachdb-spanner-tidb` -- distributed SQL connection pooling must account for multi-node routing
- `data-n-plus-1-and-query-perf` -- N+1 queries amplify connection checkout/release cycles

## Authoritative References

- [HikariCP: About Pool Sizing](https://github.com/brettwooldridge/HikariCP/wiki/About-Pool-Sizing)
- [PgBouncer Documentation: FAQ and Pool Modes](https://www.pgbouncer.org/faq.html)
- [PostgreSQL Wiki: Number of Database Connections](https://wiki.postgresql.org/wiki/Number_Of_Database_Connections)
- [Vlad Mihalcea: The Best Way to Configure Database Connection Pooling](https://vladmihalcea.com/database-connection-pooling/)
- [Django Documentation: Connection Pooling](https://docs.djangoproject.com/en/stable/ref/databases/#connection-pooling)
