---
id: modern-expand-contract
type: primary
depth_role: leaf
focus: "Detect expand-contract (parallel change) violations where the contract is broken during migration, old consumers are not migrated, new fields lack backfill, the expand phase ships without population, or old fields are removed prematurely"
parents:
  - index.md
covers:
  - Contract broken by skipping the expand phase -- old field removed or renamed directly
  - "Old consumers not migrated to new contract before the contract (remove) phase"
  - New field added in expand phase but never backfilled for existing data
  - Expand phase deployed without code to populate the new field for new writes
  - Old field removed while consumers still read it
  - Expand and contract executed in the same deployment or PR
  - No verification step between expand and contract phases
  - API version deprecated without migration path for consumers
  - Message schema changed without backward-compatible transition period
  - Missing expand-contract pattern for column rename or type change
  - "Blue/green schema deployment without backward compatibility"
  - Dual-write phase missing or incorrectly ordered in multi-step migration
  - Backfill step missing between schema expansion and contraction
  - pt-online-schema-change or gh-ost not used for large MySQL table ALTER
  - CREATE INDEX without CONCURRENTLY on large PostgreSQL table
  - Zero-downtime DDL violated by locking ALTER on busy table
  - Contract phase executed before all application instances updated
  - Missing data verification between expand and contract phases
tags:
  - expand-contract
  - parallel-change
  - migration
  - schema-evolution
  - backward-compatibility
  - contract
  - api-versioning
  - online-ddl
  - zero-downtime
  - gh-ost
  - pt-osc
  - blue-green
  - dual-write
  - backfill
  - migration-safety
  - data-architecture
aliases:
  - migration-safe-online-patterns
activation:
  file_globs:
    - "**/*migration*"
    - "**/*.sql"
    - "**/schema*"
    - "**/api*"
    - "**/proto*"
    - "**/avro*"
    - "**/event*"
    - "**/contract*"
  keyword_matches:
    - expand
    - contract
    - rename
    - drop
    - remove
    - deprecate
    - backfill
    - migrate
    - backward
    - compatible
    - schema
    - field
    - column
    - attribute
    - breaking change
  structural_signals:
    - field_rename
    - field_removal
    - schema_change
    - api_version_change
source:
  origin: file
  path: modern-expand-contract.md
  hash: "sha256:54b124db9138c91fd8dd645fd067635cc3ae8015556dba76b6299f65965e332e"
---
# Expand-Contract (Parallel Change)

## When This Activates

Activates when diffs modify database schemas, API contracts, message/event schemas, or protocol buffer definitions in ways that add, rename, remove, or change fields. Expand-contract (also called parallel change) is the pattern of evolving a contract in three phases: (1) expand -- add the new field alongside the old one, (2) migrate -- update all consumers to use the new field, (3) contract -- remove the old field. This reviewer flags violations where phases are skipped, combined, or executed out of order, which breaks backward compatibility and causes data loss or consumer failures.

## Audit Surface

- [ ] Field renamed or removed in a single step without an expand phase
- [ ] Database column dropped while application code still references it
- [ ] New field added to schema but not populated by write paths
- [ ] Backfill migration missing for existing rows after adding a new field
- [ ] Expand and contract changes in the same PR or deployment
- [ ] API response field removed without deprecation notice to consumers
- [ ] Message or event schema field removed without consumer migration
- [ ] No data verification between expand and contract phases
- [ ] Old field marked NOT NULL or required after new field introduced
- [ ] Consumer code updated to read new field before all producers populate it
- [ ] Contract phase merged while expand phase is still rolling out
- [ ] No monitoring on new field population rate during expand phase

## Detailed Checks

### Expand Phase Discipline
<!-- activation: keywords=["add", "new", "column", "field", "attribute", "expand", "alongside", "nullable", "optional", "default"] -->

- [ ] **Missing expand phase**: flag diffs that rename or remove a field, column, or API attribute in a single step -- the correct approach is to first add the new field alongside the old one (expand), keeping the old field intact
- [ ] **New field not populated on writes**: flag expand-phase diffs that add a new field to a schema but do not update write paths (INSERT, UPDATE, API request handlers) to populate it -- new writes must populate both old and new fields during the expand phase
- [ ] **New field not nullable or defaulted**: flag new columns or fields added without a default value or nullable constraint -- existing rows and in-flight messages will lack the field, causing constraint violations
- [ ] **Expand and contract in same PR**: flag PRs that both add a new field and remove the old one -- these must be separate deployments to ensure all running application instances can handle both field versions during rolling deploys

### Backfill and Data Population
<!-- activation: keywords=["backfill", "populate", "migrate", "update", "existing", "batch", "null", "empty", "default", "data migration"] -->

- [ ] **Missing backfill**: flag expand-phase changes where a new field is added but no backfill migration exists to populate it for existing data -- consumers reading the new field will get nulls or defaults for historical records
- [ ] **Backfill before write-path update**: flag backfill migrations that run before the write path populates the new field -- new writes during and after the backfill will still have empty new fields; update write paths first, then backfill
- [ ] **No population rate monitoring**: flag expand phases without a metric or query to track what percentage of rows/records have the new field populated -- this metric determines when it is safe to proceed to the contract phase
- [ ] **Backfill not idempotent**: flag backfill operations that cannot be safely re-run -- network failures, timeouts, and partial completions mean backfills must be idempotent

### Consumer Migration Verification
<!-- activation: keywords=["consumer", "client", "reader", "subscriber", "read", "depend", "reference", "use", "call", "import"] -->

- [ ] **Old field removed before consumer migration**: flag contract-phase changes (DROP COLUMN, field removal from API response) while consumer code in the same or dependent repositories still references the old field -- all consumers must be migrated first
- [ ] **Consumer reads new field before producers populate it**: flag consumer code that reads the new field before all producers (write paths and backfill) guarantee it is populated -- consumers will receive null or default values for un-migrated records
- [ ] **No consumer inventory**: flag contract-phase PRs without evidence that all consumers have been identified and migrated -- for shared APIs, databases, or event schemas, the consumer list may span multiple services
- [ ] **Cross-service timing**: flag contract changes deployed to the schema-owning service before dependent services have deployed their consumer migration -- in distributed systems, deployment order matters

### Contract Phase Safety
<!-- activation: keywords=["drop", "remove", "delete", "contract", "deprecate", "cleanup", "breaking", "required", "NOT NULL"] -->

- [ ] **Premature contract**: flag removal of the old field while the population rate of the new field is below 100% -- removing the old field before all data is migrated causes data loss for un-migrated records
- [ ] **Contract without verification**: flag contract-phase changes without a preceding verification step (row count comparison, null check on new field, consumer traffic analysis) -- proceeding to contract without verification risks data integrity
- [ ] **Old field made required before contract**: flag changes that add a NOT NULL or required constraint to the old field during the expand phase -- this blocks writes that only populate the new field, which may be needed for gradual migration
- [ ] **No rollback plan for contract phase**: flag irreversible contract changes (DROP COLUMN) without a documented rollback strategy -- once the old field is gone, recovery requires a restore from backup if something went wrong

### API and Event Schema Evolution
<!-- activation: keywords=["api", "proto", "protobuf", "avro", "json", "schema", "version", "endpoint", "response", "event", "message", "deprecate"] -->

- [ ] **API field removed without deprecation**: flag API response fields removed without a prior deprecation notice (e.g., deprecation header, documentation, sunset date) to consumers -- external consumers need time to migrate
- [ ] **Breaking event schema change**: flag event or message schema changes that remove or rename fields without a backward-compatible transition period -- downstream consumers processing old events will fail
- [ ] **Required field added to request schema**: flag new required fields added to an API request schema without a transition period where the field is optional -- existing clients will fail until they add the field
- [ ] **Version bump missing**: flag breaking contract changes without an API version bump or schema version increment -- consumers need a signal that the contract has changed

## Common False Positives

- **New tables or endpoints**: brand-new tables, fields, or API endpoints with no existing consumers do not need expand-contract. The pattern applies only when existing consumers must be migrated.
- **Internal-only schemas**: schemas consumed only by the same deployment unit (monolith internal models) can sometimes be changed atomically. Flag only when the schema crosses deployment boundaries.
- **Additive-only changes**: adding a new optional field to an API response without removing anything is the expand phase itself, not a violation.
- **Test and development databases**: non-production schemas can be changed freely. Flag only production-path migrations.

## Severity Guidance

| Finding | Severity |
|---|---|
| Field removed while consumers still reference it | Critical |
| Expand and contract in same deployment | Critical |
| Old column dropped without prior consumer migration | Critical |
| New field added without backfill for existing data | Important |
| Write paths not updated to populate new field during expand | Important |
| Contract phase without data verification | Important |
| API field removed without deprecation notice | Important |
| Required field added to request schema without transition period | Important |
| Consumer reads new field before all producers populate it | Important |
| No monitoring on new field population rate | Minor |
| Backfill not idempotent | Minor |
| No documented rollback plan for contract phase | Minor |

## See Also

- `migration-safe-online-patterns` -- expand-contract for database schemas specifically, with DDL-level detail
- `api-versioning-deprecation` -- API-level expand-contract with versioning and sunset practices
- `principle-solid` -- Open-Closed Principle aligns with expand-contract: open for extension (expand), closed for breaking modification
- `antipattern-lava-flow` -- old fields left behind after a stalled expand phase harden into lava flow

## Authoritative References

- [Martin Fowler, "ParallelChange" (2014)](https://martinfowler.com/bliki/ParallelChange.html)
- [Sam Newman, "Building Microservices" (2nd ed., 2021), Chapter 4: Schema Evolution](https://www.oreilly.com/library/view/building-microservices-2nd/9781492034018/)
- [Stripe Engineering, "Online Migrations at Scale"](https://stripe.com/blog/online-migrations)
- [Confluent, "Schema Evolution and Compatibility"](https://docs.confluent.io/platform/current/schema-registry/fundamentals/avro.html)
