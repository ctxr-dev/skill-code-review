# TypeORM — Review Overlay

Load this overlay for the **Security**, **Data Layer**, and **Architecture** specialists when TypeORM usage is detected.

## Security — Query Safety

- [ ] `QueryBuilder` never interpolates user input directly into `.where("column = '" + val + "'")` strings; named parameters (`:param`) with `.setParameter()` must be used
- [ ] `repository.query(rawSql, params)` uses the positional/named parameter array for all external values — no string concatenation inside `rawSql`
- [ ] `getRepository(Entity).createQueryBuilder()` chains do not include unescaped user-controlled table or column identifiers
- [ ] `findOne({ where: { [userKey]: val } })` patterns are absent; the key must be a static string, not a user-supplied property name

## Data Layer — Migrations

- [ ] `synchronize: true` is set to `false` in any non-local-development environment; it drops and recreates columns without warning in production
- [ ] `dropSchema: true` is absent from production `DataSource` configuration
- [ ] Migration files are generated via `typeorm migration:generate` and committed; `migration:run` is the only production deployment mechanism
- [ ] Destructive migrations (column removal, type changes) are staged across multiple deploys with backward-compatible interim states
- [ ] `migration:revert` has been tested for every migration that targets production

## Data Layer — Relation Loading

- [ ] `eager: true` on entity relations is intentional and scoped — unintended eager loading on large graphs causes massive over-fetching
- [ ] `relations: ["child"]` in `find()` options is used only where the relation is needed; absent elsewhere to avoid N+1 promotion to a join
- [ ] `leftJoinAndSelect` / `innerJoinAndSelect` chains are bounded; deep nested joins on large tables have explicit `.take()` limits
- [ ] Lazy relations (returning `Promise<T>`) are `await`-ed at every call site; a missing `await` silently returns a Promise, not the entity

## Architecture — DataSource and Subscribers

- [ ] A single `DataSource` instance is initialized once at application startup and reused; no per-request `new DataSource()` calls
- [ ] `DataSource.initialize()` result is awaited and errors are handled before accepting traffic
- [ ] Entity subscribers (`EntitySubscriberInterface`) do not perform heavy I/O in `beforeInsert` / `beforeUpdate` hooks synchronously; async work is queued
- [ ] Subscribers that mutate entities in hooks document the side effects clearly; unintended recursive triggers are avoided
- [ ] Repository injection (NestJS `@InjectRepository`) is scoped correctly; `REQUEST` scope repositories are used only when per-request isolation is needed and the performance cost is accepted
