---
id: api-federation-apollo
type: primary
depth_role: leaf
focus: Detect GraphQL Federation issues including subgraph boundary violations, entity resolution failures, shared type conflicts, and composition errors
parents:
  - index.md
covers:
  - "Subgraph extending a type it does not own without @external declarations"
  - Entity __resolveReference missing or returning wrong data
  - Shared value type with conflicting definitions across subgraphs
  - Subgraph query bypassing the gateway directly
  - "Missing @key directive on federated entity types"
  - N+1 queries in __resolveReference implementations
  - Subgraph exposing internal types that should not cross subgraph boundaries
  - Composition errors detectable only at gateway build time
  - Entity reference returning full object instead of minimal representation
tags:
  - graphql
  - federation
  - apollo
  - subgraph
  - supergraph
  - gateway
  - entity
  - composition
  - resolveReference
  - schema
activation:
  file_globs:
    - "**/*subgraph*"
    - "**/*supergraph*"
    - "**/*federation*"
    - "**/*gateway*"
    - "**/*apollo*"
    - "**/*.graphql"
    - "**/*.gql"
    - "**/*resolver*"
    - "**/*schema*"
  keyword_matches:
    - federation
    - subgraph
    - supergraph
    - "@key"
    - "@external"
    - "@requires"
    - "@provides"
    - "@shareable"
    - "@override"
    - __resolveReference
    - buildSubgraphSchema
    - ApolloGateway
    - IntrospectAndCompose
    - rover
    - supergraph
  structural_signals:
    - "Federation directive usage (@key, @external, @requires, @provides)"
    - __resolveReference resolver function
    - Gateway or router configuration
source:
  origin: file
  path: api-federation-apollo.md
  hash: "sha256:8a01bbe036cf1f3cbc5a8ca80493d98942ca0c71fffedadfbbd141f931a9fdad"
---
# GraphQL Federation (Apollo)

## When This Activates

Activates when diffs touch federated GraphQL subgraph schemas, entity resolvers (__resolveReference), gateway/router configuration, or federation directives (@key, @external, @requires, @provides). GraphQL Federation composes multiple subgraph schemas into a single supergraph. Each subgraph owns specific types and can extend types from other subgraphs. This distribution introduces failure modes absent in monolithic GraphQL: entity resolution failures, type conflicts across subgraphs, composition errors, and N+1 queries during reference resolution. This reviewer detects federation-specific issues visible in the diff.

## Audit Surface

- [ ] Type extended across subgraphs without proper @external and @requires annotations
- [ ] __resolveReference implementation missing, throwing, or returning null
- [ ] Same value type defined differently in two subgraphs (field mismatch)
- [ ] Client or service calling subgraph endpoint directly instead of through gateway
- [ ] Entity type missing @key directive for federation identity
- [ ] __resolveReference executing individual database query per reference (N+1)
- [ ] Subgraph type leaking internal implementation fields across federation boundary
- [ ] Schema composition not validated in CI before deployment
- [ ] Gateway supergraph schema stale -- not rebuilt after subgraph change
- [ ] Subgraph returning overly large entity representation for reference resolution
- [ ] Circular entity references between subgraphs without depth control
- [ ] Missing @provides hint causing unnecessary subgraph calls
- [ ] Enum value added in one subgraph but missing in shared enum definition

## Detailed Checks

### Entity Definition and @key
<!-- activation: keywords=["@key", "key", "entity", "type", "extend", "ID", "id", "resolvable", "fields"] -->

- [ ] **Missing @key**: flag types that are referenced across subgraphs but lack a `@key` directive -- without @key, the gateway cannot identify and resolve the entity across subgraph boundaries
- [ ] **Non-unique @key fields**: flag @key directives referencing fields that are not unique identifiers -- the gateway uses @key fields to look up entities; non-unique keys cause ambiguous resolution
- [ ] **Composite key without all fields resolvable**: flag composite @key directives where not all key fields are available in the resolving subgraph -- the __resolveReference will receive incomplete key data
- [ ] **Missing resolvable: false**: flag subgraphs that define an entity stub (for extending only) without `@key(fields: "id", resolvable: false)` -- without this hint, the gateway may try to resolve the entity in a subgraph that cannot actually look it up

### __resolveReference Implementation
<!-- activation: keywords=["__resolveReference", "resolveReference", "reference", "representation", "loader", "batch", "dataloader", "lookup"] -->

- [ ] **Missing __resolveReference**: flag entity types with @key that have no __resolveReference resolver -- the gateway will fail at runtime when trying to resolve the entity across subgraphs
- [ ] **N+1 in __resolveReference**: flag __resolveReference implementations that execute a database query per reference -- when the gateway resolves 100 entities, this becomes 100 queries. Use DataLoader or batch loading to resolve all references in a single query
- [ ] **__resolveReference returning null without error**: flag implementations that return null when the entity is not found without throwing an error -- null references cause confusing partial responses. Throw a clear error or return a guaranteed non-null representation
- [ ] **Over-fetching in __resolveReference**: flag implementations that load the full entity with all fields when the gateway only needs a subset -- __resolveReference should load only what is needed or rely on field-level resolvers for additional data

### Type Ownership and Extensions
<!-- activation: keywords=["@external", "@requires", "@provides", "@shareable", "@override", "extend", "type", "field", "subgraph", "own"] -->

- [ ] **Missing @external**: flag subgraphs that reference fields from another subgraph's type without marking them `@external` -- the composition will fail or behave unexpectedly
- [ ] **Missing @requires**: flag resolvers that need fields from another subgraph to compute their value but do not declare `@requires(fields: "...")` -- the gateway will not fetch the required fields before calling the resolver
- [ ] **Missing @provides**: flag resolvers that return additional entity fields not declared with `@provides` -- without the hint, the gateway makes an extra subgraph call to resolve those fields, degrading performance
- [ ] **Conflicting shared types**: flag the same value type (non-entity type like an enum or input) defined with different fields or values in different subgraphs -- the composition will either fail or produce undefined behavior. Mark shared types with `@shareable` and ensure definitions match

### Composition and Deployment
<!-- activation: keywords=["compose", "composition", "supergraph", "gateway", "rover", "schema", "registry", "deploy", "build", "check", "CI", "pipeline"] -->

- [ ] **No composition check in CI**: flag subgraph changes deployed without running `rover subgraph check` or equivalent composition validation -- composition errors are only discovered when the gateway rebuilds the supergraph, causing runtime failures
- [ ] **Stale supergraph**: flag gateway deployments using a hardcoded supergraph schema file that is not rebuilt when subgraphs change -- the gateway operates on an outdated schema, causing query failures for new fields
- [ ] **Direct subgraph access**: flag client code or service code that calls a subgraph's GraphQL endpoint directly instead of through the gateway -- direct access bypasses federation composition, authorization policies, and query planning
- [ ] **Missing schema registry**: flag federation setups with no schema registry (Apollo Studio, GraphOS, Hive) -- without a registry, there is no single source of truth for the composed supergraph and no change tracking

### Cross-Subgraph Performance
<!-- activation: keywords=["performance", "query", "plan", "waterfall", "call", "hop", "latency", "batch", "parallel"] -->

- [ ] **Unnecessary subgraph hops**: flag queries that require the gateway to call 3+ subgraphs sequentially (waterfall) when the data could be co-located -- consider moving related fields to the same subgraph or using @provides hints
- [ ] **Circular entity resolution**: flag entity definitions where subgraph A extends a type from B, and B extends a type from A, with queries that traverse the cycle -- circular references can cause infinite resolution loops without depth limits
- [ ] **Large entity representations**: flag __resolveReference responses returning entire entity payloads when only key fields plus requested fields are needed -- large representations waste bandwidth between gateway and subgraph

## Common False Positives

- **Federation v1 vs v2 directives**: @shareable, @override, and resolvable are Federation v2 features. Do not flag their absence in Federation v1 projects.
- **Single subgraph (migration in progress)**: projects migrating from monolithic GraphQL to federation may have a single subgraph initially. Type ownership and composition issues do not apply yet.
- **Schema-first vs code-first**: code-first federation libraries (NestJS, Pothos) handle some directives differently. Verify against the library's conventions.
- **Managed federation (Apollo GraphOS)**: teams using managed federation automatically compose and validate schemas. The composition check is handled by the platform, not CI.
- **Entity stubs**: subgraphs that define entity stubs solely to extend them do not need __resolveReference if they set `resolvable: false`.

## Severity Guidance

| Finding | Severity |
|---|---|
| Missing __resolveReference on entity type with @key | Critical |
| Schema composition not validated before subgraph deployment | Critical |
| N+1 queries in __resolveReference implementation | Critical |
| Conflicting shared type definitions across subgraphs | Important |
| Missing @external on referenced fields from other subgraphs | Important |
| Client calling subgraph directly, bypassing gateway | Important |
| Entity type missing @key directive | Important |
| Stale supergraph schema not rebuilt after subgraph change | Important |
| Missing @provides hint causing extra subgraph calls | Minor |
| Over-fetching in __resolveReference (loading all fields) | Minor |
| Missing schema registry for federation | Minor |

## See Also

- `api-graphql` -- base GraphQL concerns (N+1, depth limits, auth per field) apply within each subgraph
- `principle-solid` -- Single Responsibility maps to subgraph domain ownership; each subgraph owns its types
- `principle-coupling-cohesion` -- subgraph boundaries should align with domain boundaries for loose coupling
- `sec-owasp-a01-broken-access-control` -- authorization policies at the gateway must be enforced consistently across subgraphs
- `sec-rate-limit-and-dos` -- query complexity and depth limits apply to the composed supergraph
- `api-gateway-and-bff-composition` -- the federation gateway is a specialized API gateway with composition responsibilities

## Authoritative References

- [Apollo Federation Specification](https://www.apollographql.com/docs/federation/)
- [Apollo Federation Subgraph Specification](https://www.apollographql.com/docs/federation/subgraph-spec/)
- [Apollo Rover CLI -- Schema Checks](https://www.apollographql.com/docs/rover/commands/subgraphs)
- [Apollo Federation -- Entity Resolution](https://www.apollographql.com/docs/federation/entities/)
- [The Guild -- GraphQL Hive (Schema Registry)](https://the-guild.dev/graphql/hive)
