---
id: orm-typeorm
type: primary
depth_role: leaf
focus: Detect TypeORM pitfalls including eager loading explosion, query builder injection, migration synchronize misuse, subscriber side effects, connection pool exhaustion, and active record vs data mapper confusion
parents:
  - index.md
covers:
  - "Eager loading explosion via eager: true on both sides of a bidirectional relation"
  - "SQL injection in query builder .where() with string interpolation"
  - "synchronize: true in production causing data loss"
  - Entity subscriber performing heavy side effects blocking persistence
  - Connection pool exhaustion from misconfigured or missing pool settings
  - Active record pattern mixed with data mapper causing confusion
  - Missing cascade options causing orphaned records
  - Lazy relations requiring --experimentalDecorators or proxies
  - N+1 from accessing relations without query builder joins
tags:
  - typeorm
  - orm
  - typescript
  - nodejs
  - eager-loading
  - query-builder
  - migration
  - injection
  - n-plus-1
  - data-architecture
activation:
  file_globs:
    - "**/*.ts"
    - "**/*.js"
    - "**/ormconfig*"
    - "**/data-source*"
  keyword_matches:
    - typeorm
    - TypeORM
    - DataSource
    - Entity
    - Column
    - ManyToOne
    - OneToMany
    - Repository
    - getRepository
    - createQueryBuilder
    - EntityManager
    - synchronize
    - ManyToMany
source:
  origin: file
  path: orm-typeorm.md
  hash: "sha256:cc20b26038e9f6af9cab0da09c34ff234254b6bdf3c4a82fe562305420da212d"
---
# TypeORM

## When This Activates

Activates on diffs touching TypeORM entity decorators (`@Entity`, `@Column`, `@ManyToOne`), DataSource configuration, repository usage, or migration files. TypeORM's decorator-based API can hide critical issues: `eager: true` causes cascading data explosion, `synchronize: true` silently drops columns in production, and string interpolation in `.where()` opens injection vectors. This reviewer detects these TypeORM-specific traps.

## Audit Surface

- [ ] eager: true on relation that can grow unbounded
- [ ] .where() called with template literal or string concatenation containing variables
- [ ] synchronize: true in production DataSource configuration
- [ ] EntitySubscriber with HTTP calls or heavy computation
- [ ] DataSource created per request instead of shared singleton
- [ ] find() or findOne() inside a loop without QueryBuilder batch
- [ ] Missing cascade on parent-child relation causing orphaned rows
- [ ] Active record .save() mixed with repository.save() in same project
- [ ] createQueryBuilder() with .setParameter() missing for dynamic values
- [ ] Migration generated but SQL not reviewed for destructive operations
- [ ] Lazy relation used without understanding proxy limitations
- [ ] Missing transaction wrapper for multi-entity writes

## Detailed Checks

### Eager Loading Explosion
<!-- activation: keywords=["eager", "relations", "ManyToMany", "OneToMany", "ManyToOne", "find", "findOne", "leftJoinAndSelect", "loading"] -->

- [ ] **Bidirectional eager**: flag `eager: true` on both sides of a bidirectional relation -- loading one entity triggers loading the other side which triggers loading back, creating infinite recursion or massive data fetch
- [ ] **Unbounded eager relation**: flag `eager: true` on `@OneToMany` or `@ManyToMany` relations where the collection size is unbounded -- every query on the parent entity loads the entire child collection; use explicit `relations` option or query builder
- [ ] **N+1 via lazy access**: flag relation property access inside a loop on results from `find()` without specifying `relations` -- each access triggers a separate query; specify `relations: ['children']` or use QueryBuilder with `.leftJoinAndSelect()`

### Query Builder Injection
<!-- activation: keywords=["where", "createQueryBuilder", "setParameter", "andWhere", "orWhere", "raw", "query", "execute"] -->

- [ ] **String interpolation in .where()**: flag `.where(\`user.name = '${name}'\`)` or `.where("user.name = '" + name + "'")` -- use `.where("user.name = :name", { name })` with named parameters
- [ ] **Missing setParameter**: flag `.createQueryBuilder()` chains using `.where()` with hardcoded values from variables without `.setParameter()` -- all dynamic values must use parameter binding
- [ ] **Raw query with concatenation**: flag `manager.query("SELECT ... " + variable)` -- use parameterized form `manager.query("SELECT ... WHERE id = $1", [id])`

### Migration and Synchronize
<!-- activation: keywords=["synchronize", "migration", "generate", "run", "revert", "DataSource", "ormconfig", "production"] -->

- [ ] **synchronize: true in production**: flag `synchronize: true` in DataSource configuration for production -- synchronize auto-alters tables and can drop columns with data; use migrations exclusively in production
- [ ] **Unreviewed generated migration**: flag TypeORM-generated migration SQL containing `DROP`, `ALTER TYPE`, or column removal that was auto-generated and merged without review -- always inspect the up() and down() methods
- [ ] **Missing down() method**: flag migrations with an up() implementation but an empty or no-op down() -- every migration should be reversible for rollback safety

### Subscriber Side Effects
<!-- activation: keywords=["EventSubscriber", "EntitySubscriberInterface", "afterInsert", "afterUpdate", "beforeInsert", "beforeUpdate", "listener"] -->

- [ ] **Heavy subscriber**: flag `@EventSubscriber` implementations that perform HTTP calls, send emails, publish to message queues, or do expensive computation -- subscribers run synchronously in the persistence pipeline; move heavy work to async event handlers
- [ ] **Error swallowing in subscriber**: flag subscribers that catch and suppress errors -- subscriber failures should propagate to prevent silent data inconsistency
- [ ] **Subscriber query cascade**: flag subscribers that execute additional database queries that trigger other subscribers -- this can create infinite loops or unpredictable ordering

### Connection Pool and Lifecycle
<!-- activation: keywords=["DataSource", "createConnection", "connection", "pool", "extra", "max", "initialize", "destroy"] -->

- [ ] **DataSource per request**: flag `new DataSource()` or `.initialize()` inside a request handler -- each creates a new connection pool; initialize once at application startup
- [ ] **Missing pool configuration**: flag production DataSource without `extra: { max: N }` or equivalent pool settings -- default pool sizes are often insufficient for production load
- [ ] **Missing destroy on shutdown**: flag applications that never call `dataSource.destroy()` on graceful shutdown -- connections remain open and may prevent clean process exit

### Active Record vs Data Mapper
<!-- activation: keywords=["BaseEntity", "save", "remove", "Repository", "getRepository", "EntityManager", "pattern"] -->

- [ ] **Mixed patterns**: flag projects using both `extends BaseEntity` (active record) and `Repository<Entity>` (data mapper) for the same entity type -- pick one pattern and use it consistently to avoid confusion about which save path is authoritative
- [ ] **Active record in service layer**: flag `entity.save()` calls in service/business logic instead of through a repository -- active record couples domain models to persistence; prefer data mapper with repository for testability

## Common False Positives

- **eager: true on small bounded relations**: eager loading on relations with guaranteed small cardinality (e.g., user has at most 5 roles) is acceptable.
- **synchronize: true in tests**: test environments intentionally use synchronize for convenience; flag only production configs.
- **Active record in simple CRUD**: small projects using only active record pattern consistently is a valid architectural choice.

## Severity Guidance

| Finding | Severity |
|---|---|
| synchronize: true in production configuration | Critical |
| String interpolation in .where() or raw query | Critical |
| Bidirectional eager: true causing loading explosion | Critical |
| N+1 from lazy relation access in unbounded loop | Critical |
| DataSource created per request | Important |
| Subscriber performing external I/O | Important |
| Missing down() in destructive migration | Important |
| Missing transaction for multi-entity write | Important |
| Mixed active record and data mapper patterns | Minor |
| Missing pool configuration for production | Minor |
| Missing cascade on parent-child relation | Minor |

## See Also

- `data-n-plus-1-and-query-perf` -- TypeORM eager/lazy loading is a major source of N+1 patterns
- `data-schema-migrations` -- TypeORM migration safety applies the general migration rules
- `sec-owasp-a03-injection` -- query builder injection is a specific SQL injection vector
- `orm-prisma` -- alternative TypeScript ORM with different migration and type safety model

## Authoritative References

- [TypeORM Documentation, "Relations"](https://typeorm.io/relations)
- [TypeORM Documentation, "Connection Pooling"](https://typeorm.io/data-source-options)
- [TypeORM Documentation, "Migrations"](https://typeorm.io/migrations)
- [TypeORM Documentation, "Entity Subscribers"](https://typeorm.io/listeners-and-subscribers)
