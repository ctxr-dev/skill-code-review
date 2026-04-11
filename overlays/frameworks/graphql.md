# GraphQL — Review Overlay

Load this overlay for the **security**, **api-design**, **performance**, and **architecture-design** specialists when a GraphQL library (`graphql`, `apollo-server`, `strawberry-graphql`, `graphene`, `gqlgen`, etc.) is detected in project dependencies.

---

> **Canonical reference:** <https://spec.graphql.org/> — fetch for latest spec when reviewing.

## Security

- [ ] Query depth limiting is enforced (e.g., `graphql-depth-limit`, `depthLimit` directive, or equivalent) — deeply nested queries can exhaust server memory and CPU without it; the configured maximum depth is reviewed for appropriateness against the schema's actual nesting needs
- [ ] Query complexity scoring is enabled and a maximum complexity budget is set per request — complexity limits prevent abusive queries that are shallow enough to bypass depth limits but still fan out exponentially (e.g., querying a list field whose items each query another list field)
- [ ] Authorization is enforced at the field resolver level, not only at the query/mutation entry point — a user who can access a `node(id:)` query should not automatically be able to traverse to fields they are not permitted to see through that entry point
- [ ] Introspection is disabled in production for APIs that are not intended to be publicly browsed; if introspection must remain enabled, it is gated behind authentication to prevent schema enumeration by unauthenticated clients
- [ ] Subscription connections verify authentication at connection establishment (the `onConnect` / `context` function in the WebSocket handshake) — per-subscription authorization at the field level is also enforced, as the connection-level check alone does not protect against subscribing to another user's data after establishing a valid connection
- [ ] Batched query requests (array of operations in a single HTTP request) are subject to per-batch limits (max operations per batch) to prevent using batching as a rate-limit bypass
- [ ] Persisted queries are preferred over ad-hoc query strings in production for public-facing APIs; if persisted queries are enforced, arbitrary query strings are rejected to eliminate injection and complexity-abuse vectors

## N+1 and DataLoader

- [ ] Every resolver that fetches a related entity inside a list resolver uses a DataLoader (or equivalent batch-loading mechanism) — resolvers that call the database or an external service individually per parent item in a list are flagged regardless of the current dataset size
- [ ] DataLoaders are instantiated per request (not shared globally or across requests) to prevent cross-request data leakage and stale cache hits from a previous request's data
- [ ] DataLoader cache keys correctly represent the full identity of the fetched resource including any tenant or user scope — a global DataLoader that does not key on tenant ID will serve one tenant's data to another

## Schema Design

- [ ] Nullable fields in the schema are intentional — fields that can never be null in practice are typed as non-null (`!`) to communicate clear contracts to clients and avoid unnecessary null checks
- [ ] Input types for mutations are dedicated types (e.g., `CreateUserInput`) rather than reusing output types, which often include server-managed fields (IDs, timestamps) that should not be writable by clients
- [ ] Mutations follow a consistent pattern: they return the mutated entity or a result union (success/error variants) rather than a raw scalar — returning `Boolean` from a mutation discards useful error context and makes optimistic UI updates harder
- [ ] Pagination uses a standardized approach (Relay cursor-based connections or offset/limit with a consistent envelope) applied uniformly across all list fields — mixing approaches in the same schema causes inconsistent client code

## Error Handling

- [ ] Application errors that should be communicated to clients (validation failures, permission denied) are surfaced as typed error payloads within the response (e.g., union result types or `extensions.code` on GraphQL errors) rather than as HTTP-level 4xx/5xx responses, which are harder for GraphQL clients to handle uniformly
- [ ] Internal error details (database messages, stack traces, service names, internal IDs) are masked before reaching the GraphQL error response in production — the error formatter or `formatError` hook strips or replaces the `message` and `extensions` of unexpected errors
- [ ] Partial success responses (where some fields succeed and others error) are handled explicitly — resolvers that can partially fail return `null` on the erroring field and add to `errors`, so clients can distinguish a field being absent-by-design from a field that failed

## Federation and Schema Stitching

- [ ] Federated subgraph schemas correctly mark entity types with `@key` directives and implement the `_entities` resolver — missing or incorrect `@key` fields cause silent type identity failures when the gateway stitches results
- [ ] Cross-subgraph references do not leak internal implementation details (e.g., internal database IDs used as federation keys are acceptable; internal join-table IDs exposed as external-facing fields are not)
- [ ] Schema changes that remove or rename fields follow a deprecation cycle (`@deprecated(reason: "...")`) before removal; breaking schema changes are not deployed without coordinating with all consumers
