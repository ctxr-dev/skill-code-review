---
id: api-graphql
type: primary
depth_role: leaf
focus: "Detect N+1 resolver queries, unbounded query depth/complexity, overfetching in schema design, missing per-field authorization, and introspection enabled in production"
parents:
  - index.md
covers:
  - N+1 resolver queries -- each parent triggers a separate database call per child
  - Unbounded query depth allowing recursive type traversal
  - No query complexity or cost limit -- expensive queries consume unlimited resources
  - Schema overfetching -- types expose internal fields not needed by clients
  - Missing per-field or per-type authorization in resolvers
  - Introspection enabled in production exposing full schema to attackers
  - "Resolver performing blocking I/O on the event loop"
  - Missing DataLoader or batching for related entity resolution
  - Schema design exposing database structure rather than domain model
  - Mutation without input validation or error typing
tags:
  - graphql
  - api
  - resolver
  - n+1
  - dataloader
  - query-depth
  - query-complexity
  - authorization
  - introspection
  - schema-design
activation:
  file_globs:
    - "**/*.graphql"
    - "**/*.gql"
    - "**/*resolver*"
    - "**/*schema*"
    - "**/*typeDef*"
    - "**/*type-def*"
    - "**/*graphql*"
    - "**/*apollo*"
    - "**/*yoga*"
    - "**/*mercurius*"
  keyword_matches:
    - graphql
    - GraphQL
    - resolver
    - mutation
    - subscription
    - schema
    - typeDef
    - gql
    - apollo
    - DataLoader
    - introspection
    - query
    - field
  structural_signals:
    - GraphQL resolver function definition
    - GraphQL schema type definition
    - GraphQL server configuration
source:
  origin: file
  path: api-graphql.md
  hash: "sha256:6475e184f0ed274ecf1699a5a72b3b4310900ed60d9a16ae05b2499af941f820"
---
# GraphQL API Design

## When This Activates

Activates when diffs touch GraphQL schema definitions, resolvers, server configuration, or DataLoader setup. GraphQL's flexibility -- letting clients request exactly the data they need -- shifts complexity to the server. Without proper guards, a single query can trigger thousands of database calls (N+1), consume unbounded server resources (deep/complex queries), or leak data through fields lacking authorization. This reviewer detects these GraphQL-specific failure modes in diff-visible code.

## Audit Surface

- [ ] Resolver executing a database query per parent item (N+1 pattern)
- [ ] Schema with recursive types (User -> friends -> User) and no depth limit configured
- [ ] No query complexity analysis or cost budget configured on the server
- [ ] Type exposing internal fields (database IDs, internal timestamps, system flags)
- [ ] Resolver or field missing authorization check -- inherits no auth from parent
- [ ] Introspection query enabled in production environment configuration
- [ ] Resolver performing synchronous blocking I/O (file read, sync HTTP call)
- [ ] Related entity resolver without DataLoader batching
- [ ] GraphQL type mirroring a database table 1:1 instead of modeling domain concepts
- [ ] Mutation accepting untyped JSON or generic input instead of typed input object
- [ ] Error returned as a string field instead of using union types or error extensions
- [ ] Subscription without authentication or connection-level authorization
- [ ] Alias abuse not limited -- single query with hundreds of aliased fields
- [ ] Fragment spread depth not restricted

## Detailed Checks

### N+1 Query Prevention
<!-- activation: keywords=["resolver", "resolve", "parent", "source", "root", "context", "dataloader", "DataLoader", "loader", "batch", "findById", "findOne", "query", "select"] -->

- [ ] **N+1 in field resolver**: flag resolvers for relational fields (e.g., `User.posts`, `Order.items`) that execute a database query using the parent's ID without using a DataLoader or batch function -- for a list of 100 users, this executes 100 separate queries
- [ ] **Missing DataLoader**: flag projects with relational GraphQL types but no DataLoader (or equivalent batching library like `@nestjs/dataloader`, `graphene-django`'s `DjangoListField`, Strawberry's dataloaders) configured -- DataLoader is the standard N+1 solution for GraphQL
- [ ] **DataLoader not scoped per request**: flag DataLoader instances shared across requests -- DataLoader caches by key within a request; sharing across requests causes stale data and memory leaks. Create a new DataLoader per request in the context
- [ ] **Nested N+1**: flag resolvers where a child resolver also triggers its own N+1 -- `Users -> Posts -> Comments` without batching at each level compounds to N*M queries

### Query Depth and Complexity Limits
<!-- activation: keywords=["depth", "complexity", "cost", "limit", "validation", "rule", "maxDepth", "maxComplexity", "queryComplexity", "createComplexityRule"] -->

- [ ] **No depth limit**: flag GraphQL server configuration with no maximum query depth -- recursive types allow queries like `{ user { friends { friends { friends ... } } } }` that expand exponentially. Use graphql-depth-limit, envelop depth plugin, or framework equivalent
- [ ] **No complexity limit**: flag servers with no query cost analysis -- even shallow queries requesting many fields on many list items can be expensive. Assign cost weights per field and reject queries exceeding the budget
- [ ] **No alias limit**: flag servers that allow unlimited aliases in a single query -- an attacker can alias the same expensive field 10,000 times in one request, bypassing per-request rate limiting. See `sec-rate-limit-and-dos`
- [ ] **No persisted queries in production**: flag production deployments that accept arbitrary query strings when persisted/approved query lists would restrict execution to known queries -- this is the strongest defense against query abuse

### Schema Design Quality
<!-- activation: keywords=["type", "input", "interface", "union", "enum", "extend", "schema", "field", "nullable", "ID", "String", "Int", "Float", "Boolean"] -->

- [ ] **Database-shaped types**: flag GraphQL types that mirror database tables 1:1 with columns exposed as fields -- the schema should model the domain, not the storage. Internal columns (`created_by_system_id`, `_version`) should not be in the client-facing schema
- [ ] **Untyped input**: flag mutations accepting `JSON`, `String`, or `Any` as input instead of typed input objects -- untyped input bypasses GraphQL's type safety and prevents schema-level validation
- [ ] **Missing error typing**: flag mutations returning only a success payload with no error type -- use union types (`type CreateUserResult = User | ValidationError | NotFoundError`) or error extensions so clients can handle specific error cases
- [ ] **Overly permissive nullability**: flag schemas where every field is nullable by default -- nullable fields push null-checking burden to all clients. Make fields non-null by default and nullable only when the domain requires it

### Authorization Per Field
<!-- activation: keywords=["auth", "authorize", "permission", "role", "guard", "directive", "middleware", "shield", "rule"] -->

- [ ] **No per-field authorization**: flag resolvers that inherit authorization only from the query root -- a user authorized to read their own profile should not see admin-only fields on the same type. Use field-level directives (`@auth`, `@hasRole`) or graphql-shield rules
- [ ] **Authorization in resolver body only**: flag authorization logic embedded deep inside resolver business logic instead of declarative directives or middleware -- scattered auth checks are easy to forget on new fields
- [ ] **Subscription without auth**: flag subscription resolvers with no authentication on the WebSocket connection or no authorization check per subscription event -- subscriptions are long-lived and bypass per-request auth middleware
- [ ] **Introspection in production**: flag server configuration where introspection is enabled outside development -- introspection reveals the full schema, making it trivial for attackers to discover sensitive fields and craft expensive queries. See `sec-owasp-a01-broken-access-control`

## Common False Positives

- **Internal/admin GraphQL APIs**: internal tools or admin dashboards may legitimately enable introspection and relax complexity limits when the audience is trusted. Verify the API is not publicly accessible.
- **Code-generated resolvers**: ORMs like Prisma, Hasura, or PostGraphile auto-generate resolvers with built-in batching. Flag only if the generated layer is misconfigured, not for the pattern itself.
- **DataLoader in framework internals**: some frameworks (Relay, Strawberry, NestJS GraphQL) implement batching internally. Verify batching is actually configured before flagging missing DataLoader.
- **Small datasets**: N+1 on a type with at most 10 items and no recursive nesting is low-impact. Prioritize N+1 on unbounded lists and recursive types.
- **Development-only introspection**: introspection gated by environment variable or feature flag to development/staging only is the intended pattern, not a vulnerability.

## Severity Guidance

| Finding | Severity |
|---|---|
| N+1 resolver on unbounded list with no DataLoader | Critical |
| No query depth limit on schema with recursive types | Critical |
| Introspection enabled in production on public API | Critical |
| Mutation or field missing authorization check exposing sensitive data | Critical |
| No query complexity or cost limit configured | Important |
| Subscription without connection-level authentication | Important |
| Database-shaped types exposing internal columns to clients | Important |
| DataLoader shared across requests (not scoped per request) | Important |
| Mutations returning untyped errors as strings | Minor |
| No persisted query allowlist in production | Minor |
| Overly nullable schema where most fields should be non-null | Minor |

## See Also

- `sec-rate-limit-and-dos` -- query depth limits, complexity limits, and alias restrictions are DoS prevention for GraphQL
- `sec-owasp-a01-broken-access-control` -- per-field authorization and introspection control prevent unauthorized data access
- `principle-solid` -- schema types should follow Interface Segregation; clients should not fetch fields they do not use
- `principle-coupling-cohesion` -- schema should model domain cohesion, not database coupling
- `api-federation-apollo` -- federated GraphQL introduces additional composition and authorization concerns
- `api-rest` -- compare trade-offs between REST and GraphQL for the use case

## Authoritative References

- [GraphQL Specification (June 2018)](https://spec.graphql.org/June2018/)
- [Apollo GraphQL -- Security Best Practices](https://www.apollographql.com/docs/apollo-server/security/authentication/)
- [graphql-depth-limit](https://github.com/stems/graphql-depth-limit)
- [graphql-query-complexity](https://github.com/slicknode/graphql-query-complexity)
- [DataLoader (GitHub)](https://github.com/graphql/dataloader)
- [OWASP GraphQL Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/GraphQL_Cheat_Sheet.html)
