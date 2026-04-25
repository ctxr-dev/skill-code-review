---
id: arch-multi-tenant-saas
type: primary
depth_role: leaf
focus: Detect tenant data isolation failures, missing tenant context propagation, cross-tenant query leaks, and tenant-unaware caching
parents:
  - index.md
covers:
  - Database query missing tenant filter -- cross-tenant data leak
  - "Tenant context not propagated across async boundaries (queues, events, background jobs)"
  - "Cache key missing tenant identifier -- one tenant sees another's cached data"
  - Missing tenant isolation in shared database schema
  - File storage or blob path missing tenant namespace
  - API endpoint accessible without tenant context validation
  - Tenant-specific configuration leaking to other tenants
  - Background job or scheduled task running without tenant context
  - Search index not partitioned by tenant
  - Logging or error reporting leaking tenant data to wrong tenant context
tags:
  - multi-tenant
  - SaaS
  - tenant-isolation
  - data-leak
  - security
  - caching
  - architecture
activation:
  file_globs:
    - "**/*tenant*"
    - "**/*organization*"
    - "**/*org_id*"
    - "**/*account*"
    - "**/*workspace*"
    - "**/*company*"
    - "**/*multi*"
  keyword_matches:
    - tenant
    - tenant_id
    - org_id
    - organization
    - workspace
    - account_id
    - multi-tenant
    - isolation
    - scoped
    - partition
  structural_signals:
    - tenant_context_propagation
    - tenant_scoped_query
    - multi_tenant_config
source:
  origin: file
  path: arch-multi-tenant-saas.md
  hash: "sha256:8cf3c5165b8d8fe6c485edc0381122f3376632fa9fb31cb5f79efb1e8f6ae7c0"
---
# Multi-Tenant SaaS Architecture

## When This Activates

Activates on diffs in multi-tenant applications involving database queries, caching, async processing, API handlers, or storage operations. Multi-tenant SaaS applications serve multiple customers (tenants) from a single deployment. The cardinal sin is cross-tenant data leakage: one tenant seeing, modifying, or being affected by another tenant's data. This occurs when queries lack tenant filters, caches omit tenant keys, async boundaries drop tenant context, or storage paths lack tenant namespacing. This reviewer detects diff-visible signals of tenant isolation gaps.

## Audit Surface

- [ ] Database query has no WHERE clause filtering by tenant_id or tenant scope
- [ ] Tenant context not set or propagated in async handler, queue consumer, or event handler
- [ ] Cache key does not include tenant identifier
- [ ] Shared database table has no tenant_id column or row-level security
- [ ] File or blob storage path contains no tenant namespace or prefix
- [ ] API endpoint handler does not validate or extract tenant context
- [ ] Feature flag or configuration lookup not scoped to tenant
- [ ] Background job executes without tenant context in thread/request scope
- [ ] Search query (Elasticsearch, Algolia) has no tenant filter
- [ ] Log entry or error report includes data from a different tenant context
- [ ] Rate limiting or quota enforcement not scoped per tenant
- [ ] Webhook or callback URL not validated against tenant ownership

## Detailed Checks

### Query-Level Tenant Isolation
<!-- activation: keywords=["query", "SELECT", "WHERE", "find", "get", "list", "search", "filter", "tenant_id", "org_id", "scope"] -->

- [ ] **Missing tenant filter**: flag database queries (SQL, ORM, query builder) that access tenant-scoped tables without a tenant_id / org_id filter in the WHERE clause -- this is the most common cross-tenant data leak vector
- [ ] **Global query without justification**: flag queries that scan all tenants' data (SELECT without tenant filter) in application code rather than admin-only tooling -- application-level queries must always be tenant-scoped
- [ ] **Row-level security bypass**: flag queries that use a superuser connection or bypass row-level security policies -- RLS is a defense-in-depth layer that should not be circumvented in application code
- [ ] **Missing tenant column**: flag new tables in shared-database multi-tenancy that have no tenant_id column -- every tenant-scoped table must have a tenant discriminator
- [ ] **JOIN without tenant propagation**: flag JOINs where the joined table is not also filtered by tenant_id -- the join may pull in rows from other tenants

### Tenant Context Propagation
<!-- activation: keywords=["context", "tenant", "scope", "propagate", "async", "background", "job", "worker", "queue", "event", "handler", "middleware"] -->

- [ ] **Missing context in async boundary**: flag queue consumers, event handlers, or background jobs that do not extract or set tenant context before processing -- async boundaries are the most common place tenant context is dropped
- [ ] **Missing context in middleware**: flag API middleware or request pipeline that does not extract and set tenant context from the request (header, subdomain, JWT claim) -- all downstream code depends on this
- [ ] **Thread-local context lost**: flag async operations (coroutines, thread pool submissions) where the tenant context stored in thread-local / request-scoped storage is not propagated to the new execution context
- [ ] **Scheduled job without tenant iteration**: flag cron or scheduled jobs that process data without iterating over tenants or setting tenant context per batch -- the job may process all data in a single unscoped context

### Cache Tenant Isolation
<!-- activation: keywords=["cache", "redis", "memcached", "key", "get", "set", "invalidate", "TTL", "lookup"] -->

- [ ] **Cache key missing tenant**: flag cache get/set operations where the cache key does not include a tenant identifier -- tenant A may see tenant B's cached data
- [ ] **Shared cache namespace**: flag cache configurations where multiple tenants share the same key namespace without tenant prefixing -- cache collisions cause cross-tenant data exposure
- [ ] **Cache invalidation not tenant-scoped**: flag cache invalidation that clears all tenants' data when only one tenant's data changed -- this degrades performance for unaffected tenants
- [ ] **Session cache without tenant binding**: flag session data or authentication tokens stored in cache without tenant association -- session hijacking across tenants becomes possible

### Storage and Search Isolation
<!-- activation: keywords=["file", "blob", "storage", "S3", "bucket", "path", "upload", "download", "search", "index", "elasticsearch", "algolia"] -->

- [ ] **Storage path without tenant namespace**: flag file uploads, blob storage writes, or path construction that does not include a tenant identifier in the path -- tenants may overwrite each other's files
- [ ] **Search index without tenant filter**: flag search queries (Elasticsearch, Algolia, Solr) that do not include a tenant filter -- search results will include other tenants' data
- [ ] **Shared bucket without prefix isolation**: flag object storage configurations where all tenants write to the same bucket prefix -- use tenant-prefixed paths or separate containers

### Rate Limiting and Noisy Neighbor
<!-- activation: keywords=["rate", "limit", "throttle", "quota", "concurrency", "resource", "fair", "noisy"] -->

- [ ] **Global rate limit**: flag rate limiting that applies globally rather than per-tenant -- one high-traffic tenant can exhaust the rate limit for all tenants
- [ ] **No per-tenant resource quota**: flag shared resources (connection pools, worker threads, queue depth) with no per-tenant limits -- one tenant's workload can starve others
- [ ] **Unbounded tenant operation**: flag operations (bulk imports, report generation, data exports) with no per-tenant concurrency or size limits

## Common False Positives

- **Admin/platform endpoints**: administrative endpoints that intentionally query across all tenants (usage reporting, billing aggregation) are not isolation violations. Flag only when application-level user-facing endpoints lack tenant scoping.
- **Database-per-tenant**: in database-per-tenant architectures, the connection itself provides isolation. Query-level tenant filters are defense-in-depth, not strictly required.
- **Schema-per-tenant**: similar to database-per-tenant, schema-level isolation provides tenant separation without row-level tenant_id filters.
- **Public/shared data**: data intentionally shared across tenants (system configuration, public content, shared templates) does not need tenant filtering.
- **Single-tenant deployment**: applications deployed as dedicated instances per tenant do not need tenant filtering in application code.

## Severity Guidance

| Finding | Severity |
|---|---|
| Database query missing tenant filter on tenant-scoped table | Critical |
| Cache key missing tenant identifier | Critical |
| Cross-tenant data visible in search results | Critical |
| Storage path without tenant namespace | Critical |
| Tenant context not propagated across async boundary | Important |
| API handler not extracting or validating tenant context | Important |
| JOIN without tenant propagation on joined table | Important |
| Background job executing without tenant context | Important |
| Rate limiting not scoped per tenant | Minor |
| Log entry including cross-tenant data | Minor |
| Feature flag lookup not tenant-scoped | Minor |

## See Also

- `principle-separation-of-concerns` -- tenant isolation is a cross-cutting concern that must be enforced at every layer
- `arch-modular-monolith` -- in a modular monolith, each module must independently enforce tenant isolation
- `arch-edge-computing` -- edge caching must account for tenant context in cache keys
- `principle-encapsulation` -- tenant boundaries are an encapsulation concern; internal data must not leak across boundaries
- `antipattern-distributed-monolith` -- multi-tenant microservices must propagate tenant context across service boundaries

## Authoritative References

- [Microsoft, "Multi-tenant SaaS Patterns" (Azure Architecture Center)](https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/overview)
- [AWS, "SaaS Tenant Isolation Strategies"](https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/tenant-isolation.html)
- [Tod Golding, *Building Multi-Tenant SaaS Architectures* (2024, O'Reilly)](https://www.oreilly.com/library/view/building-multi-tenant-saas/9781098140632/)
- [OWASP, "Multi-Tenancy Security"](https://owasp.org/www-community/attacks/Multi-Tenancy_Security)
- [PostgreSQL Row-Level Security Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
