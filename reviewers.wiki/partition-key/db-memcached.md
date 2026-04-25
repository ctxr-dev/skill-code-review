---
id: db-memcached
type: primary
depth_role: leaf
focus: Detect Memcached pitfalls around cache stampede, key length limits, expiry strategy, lack of persistence, serialization overhead, and connection pooling
parents:
  - index.md
covers:
  - "Cache stampede (thundering herd) on popular key expiration"
  - Key length exceeding 250-byte limit causing silent truncation or errors
  - "Expiry time misuse (>30 days interpreted as Unix timestamp)"
  - No persistence -- data lost on restart without fallback strategy
  - Serialization overhead from storing large or complex objects
  - Connection pooling misconfiguration causing connection churn
  - Slab allocation causing memory waste with mixed value sizes
  - No compression on large values exceeding 1 MB limit
tags:
  - memcached
  - cache
  - stampede
  - thundering-herd
  - expiry
  - serialization
  - connection-pool
  - slab
  - consistent-hashing
activation:
  file_globs:
    - "**/*memcache*"
    - "**/*cache*"
    - "**/*session*"
  keyword_matches:
    - memcached
    - memcache
    - Memcached
    - pylibmc
    - php-memcached
    - Dalli
    - spymemcached
    - ElastiCache
    - cache.get
    - cache.set
    - mc.get
    - mc.set
    - "add "
    - "replace "
    - "cas "
    - "gets "
    - "incr "
    - "decr "
source:
  origin: file
  path: db-memcached.md
  hash: "sha256:368cd5bbec3d13ee917001b368e1d43a9de9150f2891ab6af6a8d74a040a29fc"
---
# Memcached Pitfalls

## When This Activates

Activates on diffs involving Memcached client usage, cache patterns, or ElastiCache configuration. Memcached is a simple, high-performance, distributed memory cache with no persistence, no data structures beyond key-value, and strict limits on key length (250 bytes) and value size (1 MB). Its simplicity is its strength, but it creates pitfalls: cache stampedes on popular key expiration, silent key truncation, expiry semantics that flip between relative and absolute after 30 days, and complete data loss on restart. This reviewer targets detection heuristics for Memcached-specific operational and correctness pitfalls.

## Audit Surface

- [ ] Cache read without stampede protection (lock, probabilistic early recompute)
- [ ] Key constructed without length validation (>250 bytes)
- [ ] Key containing spaces, newlines, or control characters
- [ ] Expiry time >2592000 (30 days) passed as relative seconds instead of absolute timestamp
- [ ] Application depends on cached data being present (no fallback to source)
- [ ] Serialized object >1 MB stored without compression
- [ ] JSON or pickle serialization of complex objects on every cache hit
- [ ] New TCP connection created per request instead of using connection pool
- [ ] No consistent hashing in client configuration (rehashing on node addition/removal)
- [ ] Memcached instance without SASL or network-level access control
- [ ] Cache warming strategy absent for cold-start scenarios
- [ ] DELETE followed by SET race condition (stale data reinserted)
- [ ] No monitoring of eviction rate or hit ratio
- [ ] Multi-get with >100 keys in a single call causing latency spikes

## Detailed Checks

### Cache Stampede Prevention
<!-- activation: keywords=["cache miss", "stampede", "thundering herd", "lock", "mutex", "early recompute", "stale-while-revalidate", "dogpile", "cache.get", "cache.set", "expire"] -->

- [ ] **No stampede protection on hot keys**: flag cache-aside patterns where a popular key's expiration triggers simultaneous expensive recomputation by multiple request threads -- use a cache lock (add-based mutex), probabilistic early recompute, or stale-while-revalidate to let one thread refresh while others serve stale data
- [ ] **Delete-then-set race**: flag patterns that DELETE a cache key then SET a new value in separate operations -- between the DELETE and SET, concurrent readers experience a cache miss and may recompute and SET stale data that overwrites the fresh value. Use CAS (check-and-set) for atomic updates
- [ ] **No fallback on cache miss**: flag application code that returns an error or empty result when cache data is missing instead of falling back to the source of truth -- Memcached provides no durability guarantees; every cache read must handle a miss

### Key Constraints
<!-- activation: keywords=["key", "cache_key", "make_key", "key_prefix", "namespace", "hash", "md5", "sha", "250"] -->

- [ ] **Key exceeding 250 bytes**: flag dynamically constructed keys that could exceed 250 bytes (e.g., concatenating user IDs, query parameters, or URLs) -- Memcached rejects keys >250 bytes; some clients silently hash them, changing key semantics
- [ ] **Invalid characters in keys**: flag keys containing spaces, newlines, or control characters -- the Memcached ASCII protocol uses spaces and newlines as delimiters; these characters corrupt the protocol
- [ ] **No key namespacing**: flag keys without a service or version prefix -- shared Memcached clusters need namespaced keys to prevent collision; version prefixes enable cache invalidation on deployment

### Expiry and Eviction
<!-- activation: keywords=["expire", "ttl", "TTL", "expiry", "timeout", "evict", "eviction", "LRU", "slab", "flush_all"] -->

- [ ] **Expiry >30 days as relative seconds**: flag expiry values >2592000 passed as relative seconds -- Memcached interprets values >2592000 as absolute Unix timestamps, not relative seconds; passing a relative value like 5184000 (60 days) is interpreted as a timestamp in 1970, causing immediate expiration
- [ ] **No TTL on cache entries**: flag SET commands without an expiry value -- entries without TTL persist until evicted by LRU pressure or server restart, potentially serving stale data indefinitely
- [ ] **Slab waste from mixed sizes**: flag Memcached instances storing values with highly varied sizes (bytes to megabytes) -- Memcached's slab allocator wastes memory when small and large values compete for the same slab classes

### Serialization and Value Size
<!-- activation: keywords=["serialize", "deserialize", "JSON", "json", "pickle", "msgpack", "protobuf", "marshal", "compress", "gzip", "snappy", "1MB", "value_size"] -->

- [ ] **Value exceeding 1 MB**: flag storage of objects that could exceed 1 MB without compression -- Memcached's default value size limit is 1 MB; larger values are silently rejected
- [ ] **Expensive serialization on hot path**: flag JSON serialization/deserialization of large objects on every cache hit -- consider binary formats (MessagePack, Protocol Buffers) for frequently accessed cache entries
- [ ] **No compression for large values**: flag values >100 KB stored without compression (gzip, snappy, lz4) -- compression reduces memory usage and network transfer time

### Connection and Client Configuration
<!-- activation: keywords=["connection", "pool", "connect", "client", "consistent hash", "ketama", "node", "server", "ElastiCache", "autodiscovery"] -->

- [ ] **Connection per request**: flag Memcached client instantiation inside request handlers instead of connection pool reuse -- TCP connection setup per request adds latency and risks exhausting file descriptors
- [ ] **No consistent hashing**: flag client configurations using modulo-based key distribution instead of consistent hashing (ketama) -- adding or removing a Memcached node invalidates nearly all keys with modulo distribution, causing a cache stampede
- [ ] **No authentication on network-exposed instance**: flag Memcached instances accessible over the network without SASL authentication or VPC/firewall restrictions -- Memcached has no built-in access control; unauthenticated access enables data exfiltration and cache poisoning

## Common False Positives

- **Cache warming scripts**: scripts that pre-populate cache on deployment or startup may use patterns that look like stampede-prone code. These are intentional warm-up, not stampede-vulnerable.
- **Short TTL on frequently updated data**: very short TTLs (seconds) naturally limit stampede window. Flag stampede protection only for keys with TTL >30 seconds on high-traffic paths.
- **Internal service Memcached**: Memcached on localhost or within a private VPC with security groups may not need SASL. Flag only when network-accessible without network-level controls.
- **Small key-value cache**: applications caching small, simple values (strings, integers) do not suffer from serialization overhead. Flag only for complex object serialization.

## Severity Guidance

| Finding | Severity |
|---|---|
| No fallback to data source on cache miss for critical data | Critical |
| Application depends on Memcached as primary data store (no persistence) | Critical |
| Cache stampede on high-traffic key without protection | Important |
| Expiry >30 days passed as relative seconds (immediate expiration) | Important |
| No consistent hashing in multi-node client config | Important |
| No authentication on network-accessible instance | Important |
| Key exceeding 250 bytes without hashing/truncation | Minor |
| Expensive serialization on every cache hit | Minor |
| Values >100 KB stored without compression | Minor |
| Multi-get with >100 keys in single call | Minor |

## See Also

- `db-redis` -- Redis as an alternative with persistence, data structures, and pub/sub capabilities
- `db-connection-pooling` -- Memcached connection pooling and client configuration for multi-threaded applications
- `data-n-plus-1-and-query-perf` -- N+1 cache lookups should use multi-get for batch retrieval

## Authoritative References

- [Memcached Wiki: Programming](https://github.com/memcached/memcached/wiki/Programming)
- [Memcached Protocol Specification](https://github.com/memcached/memcached/blob/master/doc/protocol.txt)
- [Facebook Engineering: Scaling Memcache at Facebook](https://research.facebook.com/publications/scaling-memcache-at-facebook/)
- [AWS ElastiCache Documentation: Memcached Best Practices](https://docs.aws.amazon.com/AmazonElastiCache/latest/mem-ug/BestPractices.html)
