---
id: arch-cell-based
type: primary
depth_role: leaf
focus: Detect cell boundary violations, missing cell-level isolation, uncontained blast radius, and missing cell routing
parents:
  - index.md
covers:
  - Request or data crossing cell boundaries without explicit routing
  - "Shared infrastructure (database, cache, queue) between cells"
  - Failure in one cell affecting services in another cell
  - Missing cell-level routing -- no mechanism to direct traffic to correct cell
  - Cell-to-cell synchronous dependency
  - Missing cell-level health monitoring and failover
  - Data migration between cells not handled
  - Cell not independently deployable
  - Cross-cell transaction or distributed state
  - No cell capacity planning or overflow strategy
tags:
  - cell-based
  - cell
  - isolation
  - blast-radius
  - routing
  - architecture
  - resilience
activation:
  file_globs:
    - "**/*cell*"
    - "**/*shard*"
    - "**/*partition*"
    - "**/*routing*"
    - "**/*swim-lane*"
    - "**/*swimlane*"
    - "**/*bulkhead*"
  keyword_matches:
    - cell
    - shard
    - partition
    - swim lane
    - swimlane
    - bulkhead
    - blast radius
    - routing
    - isolation
    - affinity
  structural_signals:
    - cell_routing_config
    - cell_boundary_definition
    - cell_isolation
source:
  origin: file
  path: arch-cell-based.md
  hash: "sha256:ad4d59851d945b4f0a08b8332064db95049c02321c419a22080518f649032e89"
---
# Cell-Based Architecture

## When This Activates

Activates on diffs involving cell routing, cell assignment, infrastructure isolation, or deployment configurations in cell-based architectures. Cell-based architecture partitions a system into independent, self-contained units (cells) where each cell serves a subset of users or tenants with its own dedicated infrastructure. The primary goal is blast radius containment: a failure in one cell affects only that cell's users. Violations occur when cells share infrastructure, depend on each other synchronously, lack routing mechanisms, or cannot be deployed independently. This reviewer detects these boundary violations.

## Audit Surface

- [ ] Request handler accesses resources belonging to a different cell
- [ ] Two cells share the same database instance, cache cluster, or message broker
- [ ] Service in cell A makes synchronous call to service in cell B
- [ ] No routing layer to direct traffic to the correct cell
- [ ] Cell failure causes cascading impact in other cells
- [ ] Cell has no independent health check or monitoring
- [ ] Data rebalancing or cell migration not implemented
- [ ] Cell deployment requires coordinating with other cells
- [ ] Transaction spans resources in multiple cells
- [ ] No capacity limit or overflow routing per cell
- [ ] Cell routing table or mapping not externalized from application code
- [ ] Cell assignment logic scattered across multiple services

## Detailed Checks

### Cell Boundary Isolation
<!-- activation: keywords=["cell", "shard", "partition", "boundary", "isolation", "infrastructure", "database", "cache", "queue", "share"] -->

- [ ] **Shared infrastructure between cells**: flag database instances, cache clusters, message brokers, or other stateful infrastructure shared between cells -- each cell must have its own dedicated infrastructure to contain blast radius
- [ ] **Cross-cell resource access**: flag code that accesses resources (database tables, queues, storage) belonging to a different cell -- cell resources must be strictly isolated
- [ ] **Cross-cell synchronous dependency**: flag synchronous calls between services in different cells -- cells must be independently operable; cross-cell communication should be async and non-critical
- [ ] **Cross-cell transaction**: flag transactions that span resources in multiple cells -- cross-cell consistency must be eventual, not transactional

### Cell Routing
<!-- activation: keywords=["routing", "route", "cell", "assign", "map", "lookup", "resolve", "direct", "affinity", "placement"] -->

- [ ] **Missing routing layer**: flag systems with no centralized mechanism (routing service, DNS, load balancer rule) to direct traffic to the correct cell -- without routing, requests may hit the wrong cell
- [ ] **Hardcoded cell assignment**: flag cell routing logic embedded in application code rather than externalized in a routing table, configuration service, or DNS -- hardcoded routing prevents cell rebalancing
- [ ] **Scattered assignment logic**: flag cell assignment or routing logic duplicated across multiple services instead of centralized -- inconsistent routing causes data to land in wrong cells
- [ ] **No overflow routing**: flag cells with no mechanism to redirect traffic when capacity is exceeded -- cell saturation with no overflow degrades the entire cell's user base

### Blast Radius Containment
<!-- activation: keywords=["blast", "radius", "failure", "cascade", "impact", "health", "monitor", "failover", "degrade"] -->

- [ ] **Cascading cell failure**: flag architectural patterns where a failure in one cell (resource exhaustion, bug, bad deploy) impacts services or users in other cells -- this defeats the cell architecture's purpose
- [ ] **Shared control plane without isolation**: flag control plane components (management APIs, config services) shared across all cells with no isolation -- control plane failure affects all cells
- [ ] **Missing cell-level health monitoring**: flag cells with no independent health checks, dashboards, or alerting -- operators cannot identify which cell is degraded
- [ ] **No cell-level failover**: flag cells with no failover strategy (drain and redirect to another cell, spin up replacement) -- a permanently degraded cell has no recovery path

### Cell Deployment Independence
<!-- activation: keywords=["deploy", "release", "version", "rollback", "canary", "blue-green", "pipeline"] -->

- [ ] **Coordinated cell deployment**: flag deployment pipelines that deploy to all cells simultaneously -- cells should be deployable independently for canary and blast-radius-limited rollout
- [ ] **Missing per-cell versioning**: flag systems where all cells must run the same version -- independent versioning enables gradual rollout and per-cell rollback
- [ ] **Cell coupling through shared config**: flag configuration that is shared across cells and requires simultaneous updates -- per-cell configuration enables independent operation

### Data Placement and Migration
<!-- activation: keywords=["migrate", "rebalance", "move", "transfer", "data", "placement", "assign", "split", "merge"] -->

- [ ] **No data migration path**: flag cell architectures with no mechanism to move users or data between cells -- cells that reach capacity or experience persistent issues need a rebalancing path
- [ ] **Cell split not supported**: flag systems that cannot split an overloaded cell into two -- organic growth will eventually exceed single-cell capacity
- [ ] **Data consistency during migration**: flag cell migration procedures with no mechanism to handle in-flight requests during user transfer -- migration must be seamless or clearly coordinated

## Common False Positives

- **Shared authentication service**: a shared authentication/identity service is an accepted cross-cell dependency if it is highly available and does not carry cell-specific data. Flag only if auth failure takes down all cells.
- **Cross-cell analytics**: analytics pipelines that read from all cells' data stores are a legitimate cross-cell concern. Flag only if the analytics pipeline can impact cell operation.
- **Single-cell development environment**: development or staging environments may run a single cell for simplicity. Apply cell isolation rules only to production configurations.
- **Cell-aware load balancer**: a global load balancer that routes to cells is a shared component by design. Flag only if load balancer failure has no failover.

## Severity Guidance

| Finding | Severity |
|---|---|
| Two cells sharing the same database instance | Critical |
| Failure in one cell cascading to other cells | Critical |
| Cross-cell synchronous dependency | Critical |
| No routing layer to direct traffic to correct cell | Important |
| Cell deployment requires coordinating with other cells | Important |
| No cell-level health monitoring or alerting | Important |
| Transaction spanning resources in multiple cells | Important |
| No data migration path between cells | Minor |
| Cell routing logic hardcoded in application code | Minor |
| No overflow routing when cell reaches capacity | Minor |

## See Also

- `arch-multi-tenant-saas` -- cell-based architecture is often used for tenant isolation in SaaS; each cell may serve one or more tenants
- `antipattern-distributed-monolith` -- cells that share infrastructure or require coordinated deployment are a distributed monolith
- `arch-microservices` -- cells contain microservices; cell boundaries are the outermost isolation boundary
- `principle-coupling-cohesion` -- cells must be loosely coupled to each other for blast radius containment

## Authoritative References

- [AWS, "Cell-Based Architecture" (Well-Architected Framework)](https://docs.aws.amazon.com/wellarchitected/latest/reducing-scope-of-impact-with-cell-based-architecture/what-is-a-cell-based-architecture.html)
- [Adrian Cockcroft, "Cell Architectures" (2023, QCon)](https://www.infoq.com/presentations/cell-architectures/)
- [Microsoft, "Deployment Stamps Pattern" (Azure Architecture Center)](https://learn.microsoft.com/en-us/azure/architecture/patterns/deployment-stamp)
- [Werner Vogels, "Cell-Based Architecture at AWS" -- Amazon Builder's Library](https://aws.amazon.com/builders-library/)
- [Slack Engineering, "Slack's Migration to a Cellular Architecture" (2023)](https://slack.engineering/)
