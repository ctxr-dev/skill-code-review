---
id: orm-hibernate-jpa
type: primary
depth_role: leaf
focus: "Detect Hibernate/JPA pitfalls including LazyInitializationException, N+1 with fetch joins, second-level cache staleness, flush mode confusion, JPQL injection, and entity lifecycle misuse"
parents:
  - index.md
covers:
  - "LazyInitializationException from accessing lazy associations outside transaction/session"
  - "N+1 queries from missing JOIN FETCH or @EntityGraph in collection traversal"
  - Second-level cache serving stale data after direct SQL updates
  - FlushMode.AUTO causing unexpected writes during read queries
  - "JPQL/HQL injection via string concatenation instead of parameter binding"
  - Entity lifecycle misuse -- detached entities persisted without merge
  - Open Session in View anti-pattern masking N+1 in controllers
  - "FetchType.EAGER on @OneToMany or @ManyToMany causing cartesian product"
  - "Missing @Version for optimistic locking on concurrently updated entities"
tags:
  - hibernate
  - jpa
  - java
  - kotlin
  - lazy-loading
  - n-plus-1
  - cache
  - jpql
  - entity-lifecycle
  - spring
  - data-architecture
activation:
  file_globs:
    - "**/*.java"
    - "**/*.kt"
    - "**/persistence.xml"
    - "**/application.yml"
    - "**/application.properties"
  keyword_matches:
    - "@Entity"
    - "@Table"
    - "@ManyToOne"
    - "@OneToMany"
    - "@ManyToMany"
    - EntityManager
    - Session
    - JPQL
    - HQL
    - createQuery
    - CriteriaBuilder
    - FetchType
    - JOIN FETCH
    - Hibernate
    - JPA
    - spring.jpa
source:
  origin: file
  path: orm-hibernate-jpa.md
  hash: "sha256:208ab4c550c52e33a5f3892201d505dc9531e5a6ce30a129bf5a62f479c41c5f"
---
# Hibernate / JPA

## When This Activates

Activates on diffs involving JPA entity annotations (`@Entity`, `@Table`, `@ManyToOne`), Hibernate session usage, `EntityManager` calls, JPQL/HQL queries, or `persistence.xml`/Spring JPA configuration. Hibernate's proxy-based lazy loading is the most common source of `LazyInitializationException` and N+1 queries in Java/Kotlin applications. This reviewer targets the persistence-layer pitfalls that cause production performance degradation and runtime errors.

## Audit Surface

- [ ] Lazy collection accessed outside @Transactional boundary or open session
- [ ] JPQL/HQL query with string concatenation instead of :named or ?positional parameters
- [ ] FetchType.EAGER on @OneToMany or @ManyToMany relation
- [ ] @EntityGraph or JOIN FETCH missing on query fetching entity with accessed collections
- [ ] Second-level cache enabled without eviction strategy for externally modified data
- [ ] FlushMode.AUTO on session used for read-only operations
- [ ] Detached entity passed to persist() instead of merge()
- [ ] Open Session in View (OSIV) enabled in production Spring Boot configuration
- [ ] Missing @Version on entity updated concurrently by multiple threads/requests
- [ ] Batch size not configured for bulk insert/update operations
- [ ] N+1 SELECT in Hibernate query log for collection traversal
- [ ] CascadeType.ALL on non-owning side causing unexpected deletions

## Detailed Checks

### LazyInitializationException and N+1
<!-- activation: keywords=["lazy", "LAZY", "LazyInitializationException", "fetch", "FETCH", "JOIN FETCH", "EntityGraph", "n+1", "proxy", "collection", "initialize", "Hibernate.initialize"] -->

- [ ] **Lazy access outside session**: flag lazy collection access (e.g., `user.getOrders()`) in code paths without an active `@Transactional` or Hibernate Session -- this throws `LazyInitializationException`; ensure the access is within a transaction or use JOIN FETCH
- [ ] **N+1 in loop**: flag loop iteration over a parent collection followed by access to a lazy-loaded child relation -- each access fires a SELECT; add `JOIN FETCH` to the parent query or use `@EntityGraph`
- [ ] **Open Session in View masking N+1**: flag `spring.jpa.open-in-view=true` (Spring Boot default) -- OSIV keeps the session open through the HTTP response, masking N+1 queries in controllers/serializers; disable and fix with explicit fetch strategies
- [ ] **Missing @BatchSize**: flag entities with lazy collections that are accessed in list operations without `@BatchSize` annotation -- without batching, each collection access is a separate query; set `@BatchSize(size=25)` as a safety net

### Eager Loading Explosion
<!-- activation: keywords=["EAGER", "FetchType.EAGER", "ManyToMany", "OneToMany", "cartesian", "MultipleBagFetchException"] -->

- [ ] **Eager on collection**: flag `FetchType.EAGER` on `@OneToMany` or `@ManyToMany` -- every query loading the parent entity also loads the entire collection, even when not needed; use `FetchType.LAZY` and fetch explicitly
- [ ] **Multiple eager bags**: flag entities with two or more `@OneToMany(fetch = EAGER)` collections -- Hibernate cannot fetch multiple bags eagerly and either throws `MultipleBagFetchException` or creates a cartesian product; use `Set` instead of `List` or make lazy
- [ ] **CascadeType.ALL overuse**: flag `CascadeType.ALL` on non-owning side of a relation -- ALL includes REMOVE, meaning deleting the non-owning entity cascades deletion to the owning side; use only specific cascades needed

### JPQL/HQL Injection
<!-- activation: keywords=["createQuery", "createNativeQuery", "JPQL", "HQL", "query", "nativeQuery", "setParameter", "concatenat"] -->

- [ ] **String concatenation in JPQL**: flag `em.createQuery("SELECT u FROM User u WHERE u.name = '" + name + "'")` -- use named parameters: `"WHERE u.name = :name"` with `.setParameter("name", name)`
- [ ] **Native query with interpolation**: flag `createNativeQuery("SELECT * FROM users WHERE id = " + id)` -- use positional parameters: `"WHERE id = ?1"` with `.setParameter(1, id)`
- [ ] **Criteria API with literal**: flag `cb.literal(userInput)` in CriteriaBuilder for dynamic values from user input -- use `cb.parameter()` with `.setParameter()` for values originating from external input

### Second-Level Cache
<!-- activation: keywords=["@Cacheable", "cache", "second-level", "ehcache", "infinispan", "hazelcast", "evict", "region", "CacheMode"] -->

- [ ] **Cache without eviction**: flag second-level cache (`@Cacheable`, `@Cache`) enabled on entities that are also modified by direct SQL, batch jobs, or other services -- cached data becomes stale; configure TTL or event-based eviction
- [ ] **Query cache on volatile data**: flag Hibernate query cache enabled for queries on frequently changing data -- query cache invalidation is per-region and can cause worse performance than no cache
- [ ] **Missing cache concurrency strategy**: flag `@Cache` without explicit `usage` (e.g., `READ_WRITE`, `NONSTRICT_READ_WRITE`) -- the default may not match the concurrency requirements

### Entity Lifecycle and Flush Mode
<!-- activation: keywords=["persist", "merge", "detach", "flush", "FlushMode", "clear", "evict", "refresh", "@Transactional", "readOnly"] -->

- [ ] **Persist on detached entity**: flag `em.persist(entity)` on an entity that was loaded in a different persistence context -- use `em.merge(entity)` for detached instances
- [ ] **FlushMode.AUTO on read path**: flag read-only queries running with `FlushMode.AUTO` -- AUTO triggers a flush before queries to ensure consistency, adding unnecessary overhead on read-only paths; use `FlushMode.COMMIT` or `@Transactional(readOnly = true)`
- [ ] **Missing @Transactional(readOnly=true)**: flag read-only service methods without `readOnly = true` -- read-only transactions skip dirty checking and flush, improving performance
- [ ] **Bulk update without clear**: flag `em.createQuery("UPDATE ...")` or `em.createQuery("DELETE ...")` without `em.clear()` afterward -- the persistence context is now stale; clear it or use `@Modifying(clearAutomatically = true)`

## Common False Positives

- **DTO projection**: queries using `SELECT new DTO(...)` do not return managed entities; eager/lazy concerns do not apply.
- **OSIV in admin panels**: Open Session in View is acceptable in low-traffic admin/back-office applications where N+1 overhead is negligible.
- **@BatchSize as intentional strategy**: projects that consistently use `@BatchSize` instead of JOIN FETCH are following a valid alternative loading strategy.
- **Cache on reference data**: second-level cache on rarely changing reference tables (countries, currencies) without eviction is acceptable.

## Severity Guidance

| Finding | Severity |
|---|---|
| JPQL/HQL string concatenation with user input | Critical |
| Native query with string interpolation | Critical |
| N+1 from lazy collection in unbounded loop | Critical |
| FetchType.EAGER on @OneToMany/@ManyToMany | Important |
| LazyInitializationException risk outside transaction | Important |
| OSIV enabled in high-traffic production application | Important |
| Second-level cache without eviction on externally modified data | Important |
| CascadeType.ALL on non-owning side | Important |
| Missing @Version on concurrently updated entity | Minor |
| FlushMode.AUTO on read-only path | Minor |
| Missing readOnly=true on read-only @Transactional | Minor |

## See Also

- `data-n-plus-1-and-query-perf` -- Hibernate lazy loading is the canonical example of ORM-caused N+1
- `sec-owasp-a03-injection` -- JPQL injection is a specific case of the general injection pattern
- `data-schema-migrations` -- Hibernate hbm2ddl and Flyway/Liquibase migration safety
- `migration-flyway-liquibase` -- migration tools commonly paired with Hibernate/JPA projects

## Authoritative References

- [Hibernate User Guide, "Fetching Strategies"](https://docs.jboss.org/hibernate/orm/current/userguide/html_single/Hibernate_User_Guide.html#fetching)
- [Hibernate User Guide, "Caching"](https://docs.jboss.org/hibernate/orm/current/userguide/html_single/Hibernate_User_Guide.html#caching)
- [Vlad Mihalcea, "The Open Session in View Anti-Pattern"](https://vladmihalcea.com/the-open-session-in-view-anti-pattern/)
- [Vlad Mihalcea, "The Best Way to Map a @OneToMany"](https://vladmihalcea.com/the-best-way-to-map-a-onetomany-association-with-jpa-and-hibernate/)
