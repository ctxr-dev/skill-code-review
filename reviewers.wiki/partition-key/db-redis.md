---
id: db-redis
type: primary
depth_role: leaf
focus: "Detect Redis pitfalls around memory limits, eviction policy, persistence gaps, pub/sub reliability, Lua script safety, cluster mode key distribution, and key naming conventions"
parents:
  - index.md
covers:
  - Memory limit not configured or eviction policy not appropriate for workload
  - "Persistence (RDB/AOF) not configured or misconfigured for durability requirements"
  - "Pub/sub used for reliable messaging (messages lost if no subscriber connected)"
  - Lua scripts blocking Redis for extended periods
  - Cluster mode with multi-key operations spanning different hash slots
  - Key naming without namespace prefixes causing collisions across services
  - "KEYS command used in production (blocks the event loop)"
  - "Large keys (big lists, sets, hashes) causing memory and latency spikes"
tags:
  - redis
  - cache
  - eviction
  - persistence
  - rdb
  - aof
  - pubsub
  - lua
  - cluster
  - memory
  - key-naming
  - big-key
activation:
  file_globs:
    - "**/*redis*"
    - "**/redis.conf"
    - "**/*cache*"
    - "**/*session*"
    - "**/*queue*"
    - "**/*pubsub*"
  keyword_matches:
    - redis
    - Redis
    - ioredis
    - redis-py
    - jedis
    - lettuce
    - StackExchange.Redis
    - "SET "
    - "GET "
    - HSET
    - HGET
    - LPUSH
    - RPUSH
    - ZADD
    - PUBLISH
    - SUBSCRIBE
    - EVAL
    - EVALSHA
    - maxmemory
    - eviction
    - AOF
    - RDB
    - EXPIRE
    - TTL
    - KEYS
    - SCAN
    - cluster
    - hash slot
    - BLPOP
source:
  origin: file
  path: db-redis.md
  hash: "sha256:21caa45ec371eac892ad099fc11ca2ca7afeb82806e2c98318192589cd4157bd"
---
# Redis Pitfalls

## When This Activates

Activates on diffs involving Redis commands, configuration, client library usage, or caching logic. Redis is an in-memory data structure store commonly used as a cache, session store, queue, or pub/sub broker. Its single-threaded event loop model means any slow command blocks all other clients. Unconfigured memory limits cause the server to OOM-kill. Pub/sub silently drops messages when no subscriber is connected. Cluster mode breaks multi-key operations that span hash slots. This reviewer targets detection heuristics for Redis-specific operational and reliability pitfalls.

## Audit Surface

- [ ] maxmemory not set or set without maxmemory-policy
- [ ] Eviction policy noeviction on a cache workload (causes OOM errors)
- [ ] RDB-only persistence on data that must survive restart without loss
- [ ] AOF with appendfsync=no on critical data
- [ ] SUBSCRIBE/PUBLISH used for work queues or reliable event delivery
- [ ] Lua script with unbounded loop or expensive computation
- [ ] Multi-key command (MGET, SUNION, transaction) on keys in different hash slots in cluster mode
- [ ] Key names without service or namespace prefix
- [ ] KEYS * or KEYS pattern used in production code
- [ ] Single key holding >1 MB of data (big key)
- [ ] EXPIRE not set on cache keys (unbounded growth)
- [ ] Redis used as primary data store without persistence configured
- [ ] Blocking commands (BLPOP, BRPOP) with long timeout on shared connection
- [ ] Password/ACL not configured on network-accessible Redis instance

## Detailed Checks

### Memory and Eviction
<!-- activation: keywords=["maxmemory", "eviction", "noeviction", "allkeys-lru", "volatile-lru", "allkeys-lfu", "volatile-ttl", "OOM", "used_memory", "memory"] -->

- [ ] **No maxmemory limit**: flag Redis instances without `maxmemory` configured -- without a limit, Redis grows until the OS OOM-killer terminates the process, causing data loss and cascading failures
- [ ] **noeviction on cache workload**: flag `maxmemory-policy noeviction` when Redis is used as a cache -- once maxmemory is reached, all write commands return errors instead of evicting old keys
- [ ] **Wrong eviction policy**: flag `allkeys-random` when LRU/LFU would be appropriate, or `volatile-*` policies when most keys lack TTL -- volatile policies only evict keys with an expiry set; keys without TTL accumulate until OOM
- [ ] **Cache keys without TTL**: flag SET/HSET operations on cache data without EXPIRE or EX/PX options -- keys without expiry persist indefinitely, eventually filling memory

### Persistence Configuration
<!-- activation: keywords=["RDB", "AOF", "save", "appendonly", "appendfsync", "bgsave", "bgrewriteaof", "persistence", "snapshot", "dump.rdb", "appendonly.aof"] -->

- [ ] **No persistence on durable data**: flag Redis used as a primary data store (sessions, queues, state) without either RDB or AOF enabled -- a restart loses all data
- [ ] **RDB-only for zero-data-loss requirement**: flag RDB snapshots as the only persistence when the application cannot tolerate losing data since the last snapshot -- RDB snapshots are periodic; data written between snapshots is lost on crash
- [ ] **AOF appendfsync=no**: flag `appendfsync no` on data requiring durability -- this delegates fsync to the OS (every 30 seconds), risking data loss on crash
- [ ] **Missing AOF rewrite configuration**: flag AOF without `auto-aof-rewrite-percentage` configured -- the AOF file grows without bound until disk is full

### Pub/Sub Reliability
<!-- activation: keywords=["PUBLISH", "SUBSCRIBE", "PSUBSCRIBE", "pub/sub", "pubsub", "channel", "message", "event", "notification"] -->

- [ ] **Pub/sub for reliable messaging**: flag PUBLISH/SUBSCRIBE used as a work queue or event bus where message loss is unacceptable -- Redis pub/sub is fire-and-forget; if no subscriber is connected when a message is published, the message is permanently lost
- [ ] **Slow subscriber blocking publisher**: flag pub/sub patterns where a slow subscriber causes the output buffer to grow -- Redis disconnects slow subscribers when the output buffer exceeds limits, losing all buffered messages
- [ ] **No reconnection logic for subscribers**: flag SUBSCRIBE without connection drop detection and automatic resubscription -- network interruptions cause missed messages with no notification

### Lua Scripts and Blocking
<!-- activation: keywords=["EVAL", "EVALSHA", "SCRIPT", "Lua", "lua", "redis.call", "BLPOP", "BRPOP", "BRPOPLPUSH", "BLMOVE", "WAIT", "KEYS", "SCAN"] -->

- [ ] **KEYS command in production**: flag `KEYS *` or `KEYS pattern` in application code -- KEYS iterates all keys in a single-threaded operation, blocking all other commands for seconds on large databases. Use SCAN with COUNT for iterative key discovery
- [ ] **Unbounded Lua script**: flag EVAL scripts with loops that iterate over user-controlled collections or perform external calls -- Lua scripts run atomically and block the entire Redis server for their duration
- [ ] **Blocking command on shared connection**: flag BLPOP, BRPOP, or BLMOVE with long timeouts on a connection shared with non-blocking operations -- the blocking command monopolizes the connection, starving other operations

### Cluster Mode and Key Design
<!-- activation: keywords=["cluster", "hash slot", "hash tag", "{}", "MGET", "MSET", "MULTI", "EXEC", "WATCH", "CROSSSLOT", "moved", "ask", "redis-cluster"] -->

- [ ] **Cross-slot multi-key operations**: flag MGET, MSET, SUNION, SDIFF, or transactions (MULTI/EXEC) on keys in different hash slots in cluster mode -- Redis Cluster returns CROSSSLOT errors for multi-key operations spanning slots
- [ ] **Missing hash tags for related keys**: flag related keys that must be co-located (e.g., `user:123` and `user:123:sessions`) without hash tags (`{user:123}`) in cluster mode -- without hash tags, related keys may land on different shards
- [ ] **No namespace prefix on keys**: flag key names without a service or module prefix -- shared Redis instances without key namespacing cause silent key collisions between services

## Common False Positives

- **KEYS in CLI scripts or admin tools**: KEYS used in one-off admin scripts or migration tools running during maintenance is acceptable. Flag only in application code paths.
- **Pub/sub for best-effort notifications**: cache invalidation notifications or UI refresh hints that tolerate message loss are valid pub/sub use cases.
- **No persistence on ephemeral cache**: a pure cache layer (backed by a durable database) with no persistence configured is correct architecture. Flag only when Redis holds the only copy of the data.
- **noeviction on data store**: when Redis is used as a primary data store (not a cache), noeviction is correct to prevent silent data loss. Flag only on cache workloads.

## Severity Guidance

| Finding | Severity |
|---|---|
| No maxmemory limit set on production Redis | Critical |
| Redis as primary data store without persistence | Critical |
| KEYS * in application production code path | Critical |
| No password/ACL on network-accessible instance | Critical |
| Pub/sub used for reliable messaging where loss is unacceptable | Important |
| noeviction policy on a cache workload | Important |
| Cross-slot multi-key operation in cluster mode | Important |
| Cache keys without TTL causing unbounded growth | Important |
| Big key (>1 MB single key) causing latency spikes | Minor |
| Missing namespace prefix on key names | Minor |
| Blocking command with long timeout on shared connection | Minor |

## See Also

- `db-memcached` -- Memcached comparison for pure caching use cases; Redis adds persistence and data structures
- `db-connection-pooling` -- Redis connection pool sizing and multiplexing affect throughput under concurrency
- `data-n-plus-1-and-query-perf` -- N+1 cache lookups should use MGET or pipeline for batch retrieval
- `sec-owasp-a03-injection` -- Lua script injection via unsanitized user input in EVAL strings

## Authoritative References

- [Redis Documentation: Memory Optimization](https://redis.io/docs/management/optimization/memory-optimization/)
- [Redis Documentation: Persistence](https://redis.io/docs/management/persistence/)
- [Redis Documentation: Pub/Sub](https://redis.io/docs/interact/pubsub/)
- [Redis Documentation: Cluster Specification](https://redis.io/docs/reference/cluster-spec/)
- [Redis Documentation: Lua Scripting](https://redis.io/docs/interact/programmability/lua-api/)
