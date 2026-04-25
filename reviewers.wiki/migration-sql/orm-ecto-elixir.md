---
id: orm-ecto-elixir
type: primary
depth_role: leaf
focus: "Detect Ecto/Elixir pitfalls including preload vs join confusion, Repo transaction misuse, changeset validation gaps, raw fragment injection, migration lock timeout, and sandbox leaks"
parents:
  - index.md
covers:
  - N+1 from accessing associations without preload or join
  - "Repo.transaction holding connections too long with external I/O"
  - Changeset validation bypassed by direct Repo.insert_all or Repo.update_all
  - "SQL injection via fragment() with string interpolation"
  - Migration lock_timeout not set causing long DDL waits
  - Sandbox mode leaking into production or shared test state
  - Missing Ecto.Multi for multi-step operations needing atomicity
  - Preload on large association without limit or custom query
tags:
  - ecto
  - elixir
  - preload
  - fragment
  - changeset
  - transaction
  - migration
  - sandbox
  - n-plus-1
  - data-architecture
activation:
  file_globs:
    - "**/*.ex"
    - "**/*.exs"
    - "**/migrations/**"
    - "**/priv/repo/**"
  keyword_matches:
    - Ecto
    - Repo
    - schema
    - changeset
    - preload
    - assoc
    - fragment
    - Ecto.Multi
    - Ecto.Migration
    - Ecto.Query
    - from
    - join
    - has_many
    - belongs_to
source:
  origin: file
  path: orm-ecto-elixir.md
  hash: "sha256:b7d0b4b2af01d598f34585e18a17079352465621f21a2644fa064b304bfa8862"
---
# Ecto (Elixir)

## When This Activates

Activates on Elixir diffs involving Ecto schemas, Repo operations, changesets, queries, or migration files under `priv/repo/migrations/`. Ecto's explicit data loading model avoids some ORM traps by making queries visible, but developers still hit N+1 when they forget `preload`, inject SQL through `fragment()`, or misuse transactions. This reviewer catches Ecto-specific pitfalls.

## Audit Surface

- [ ] Association field accessed on struct without prior preload or join
- [ ] fragment() called with string interpolation instead of ? placeholders
- [ ] Repo.transaction callback performing HTTP calls or GenServer calls
- [ ] Repo.insert_all or Repo.update_all bypassing changeset validations
- [ ] Migration without lock_timeout for large table DDL
- [ ] Ecto.Adapters.SQL.Sandbox set to :shared mode leaking across tests
- [ ] Missing Ecto.Multi for operations requiring atomic multi-step writes
- [ ] Preload(:association) on parent with thousands of children without query limit
- [ ] Missing unique_constraint or check_constraint in changeset
- [ ] Dynamic query built from user map without field whitelist

## Detailed Checks

### Preload vs Join
<!-- activation: keywords=["preload", "assoc", "join", "has_many", "belongs_to", "has_one", "association", "Ecto.assoc", "from", "Enum.map"] -->

- [ ] **Access without preload**: flag `struct.association` access where the association was not preloaded -- Ecto raises `Ecto.Association.NotLoaded`; add `Repo.preload(struct, :association)` or use `join` + `preload` in the query
- [ ] **Preload in loop**: flag `Enum.map(list, fn item -> Repo.preload(item, :assoc) end)` -- this fires a query per item; preload the entire list at once: `Repo.preload(list, :assoc)`
- [ ] **Unbounded preload**: flag `preload(:children)` on a parent that can have thousands of children without a custom query limiting results -- use `preload([children: query])` with a `limit` or `where` clause
- [ ] **Join without preload**: flag `join` used to filter by association but result struct still has `NotLoaded` associations -- add `preload: [assoc: a]` to the query to populate the struct

### Fragment Injection
<!-- activation: keywords=["fragment", "raw", "sql", "execute", "Ecto.Adapters.SQL.query", "interpolat"] -->

- [ ] **fragment() with interpolation**: flag `fragment("... #{variable} ...")` -- use `fragment("... ? ...", ^variable)` with positional placeholders; Ecto parameterizes `?` but not string interpolation
- [ ] **Ecto.Adapters.SQL.query with concatenation**: flag `Ecto.Adapters.SQL.query(Repo, "SELECT ... " <> user_input)` -- use `Ecto.Adapters.SQL.query(Repo, "SELECT ... WHERE id = $1", [user_input])`
- [ ] **Dynamic field from user input**: flag `from(u in User, where: field(u, ^field_name) == ^value)` where `field_name` comes from user input without whitelist -- users can query any field; validate `field_name` against schema fields

### Transaction and Multi
<!-- activation: keywords=["Repo.transaction", "Ecto.Multi", "Multi.new", "transaction", "rollback", "commit"] -->

- [ ] **External I/O in transaction**: flag `Repo.transaction(fn -> ... HTTPoison.post(...) ... end)` -- HTTP calls inside transactions hold the database connection; move external calls outside or use Ecto.Multi with a final step that triggers async work
- [ ] **Missing Multi for multi-step writes**: flag multiple `Repo.insert`/`Repo.update` calls that should be atomic but are not wrapped in `Ecto.Multi` or `Repo.transaction` -- a failure in the second operation leaves partial data
- [ ] **Swallowed rollback**: flag `Repo.transaction` that pattern-matches only `{:ok, result}` without handling `{:error, reason}` -- unhandled transaction errors cause silent failures

### Changeset Discipline
<!-- activation: keywords=["changeset", "cast", "validate", "insert_all", "update_all", "constraint", "unique_constraint", "check_constraint"] -->

- [ ] **Bypassed validations**: flag `Repo.insert_all` or `Repo.update_all` on data that should go through changeset validations -- these functions skip changeset logic; ensure business rules are validated elsewhere or use Repo.insert with changesets in a Multi
- [ ] **Missing constraint**: flag changeset missing `unique_constraint` for fields with unique database indexes -- without it, unique violations raise raw database errors instead of changeset errors
- [ ] **Cast without validation**: flag `cast(attrs, [:field])` without corresponding `validate_required` or `validate_format` -- casting allows the field but does not enforce it

### Migration Safety
<!-- activation: keywords=["migration", "create", "alter", "add", "remove", "rename", "index", "lock_timeout", "execute"] -->

- [ ] **Missing lock_timeout**: flag migrations on large tables without `execute "SET lock_timeout = '5s'"` -- DDL without a lock timeout can block indefinitely on a busy table; set a timeout and retry
- [ ] **Index without concurrently**: flag `create index` on large tables without `@disable_ddl_transaction true` and `create index(:table, ..., concurrently: true)` -- standard index creation locks the table
- [ ] **Remove column without safety**: flag `remove :column` without deploying code that stops reading the column first -- Ecto structs will error on the missing column during rolling deploys

### Sandbox and Test Isolation
<!-- activation: keywords=["Sandbox", "sandbox", ":shared", ":manual", ":auto", "checkout", "allow"] -->

- [ ] **Shared sandbox in CI**: flag `Ecto.Adapters.SQL.Sandbox.mode(Repo, :shared)` used broadly -- shared mode lets all processes see the same connection, causing test pollution; use `:manual` with explicit `checkout` and `allow`
- [ ] **Missing sandbox checkout**: flag test processes that interact with the database without `Ecto.Adapters.SQL.Sandbox.checkout(Repo)` -- queries will timeout waiting for a connection

## Common False Positives

- **Preload on known-small associations**: preloading associations with bounded small cardinality (e.g., user roles) without a custom query is acceptable.
- **insert_all for bulk imports**: using `insert_all` for performance-critical bulk imports where validations are handled upstream is valid.
- **Shared sandbox in specific tests**: browser/integration tests may require `:shared` mode for async processes; flag only when set globally.

## Severity Guidance

| Finding | Severity |
|---|---|
| fragment() with string interpolation containing user input | Critical |
| SQL.query with string concatenation and user input | Critical |
| Dynamic field from user input without whitelist | Critical |
| N+1 from preload in loop instead of batch preload | Important |
| External I/O inside Repo.transaction | Important |
| Missing Ecto.Multi for multi-step atomic operations | Important |
| Migration without lock_timeout on large table | Important |
| Repo.insert_all bypassing critical validations | Important |
| Missing unique_constraint in changeset | Minor |
| Unbounded preload on large association | Minor |
| Shared sandbox mode in test suite | Minor |

## See Also

- `data-n-plus-1-and-query-perf` -- Ecto preload patterns are an explicit form of eager loading to avoid N+1
- `sec-owasp-a03-injection` -- fragment() injection is a specific SQL injection vector
- `data-schema-migrations` -- Ecto migration safety follows general DDL patterns
- `orm-sqlalchemy` -- Python ORM with similar explicit session/transaction model

## Authoritative References

- [Ecto Documentation, "Associations and Embeds"](https://hexdocs.pm/ecto/associations.html)
- [Ecto Documentation, "Ecto.Query"](https://hexdocs.pm/ecto/Ecto.Query.html)
- [Ecto Documentation, "Ecto.Multi"](https://hexdocs.pm/ecto/Ecto.Multi.html)
- [Ecto Documentation, "Ecto.Migration"](https://hexdocs.pm/ecto_sql/Ecto.Migration.html)
