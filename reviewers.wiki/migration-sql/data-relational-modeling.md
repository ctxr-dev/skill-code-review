---
id: data-relational-modeling
type: primary
depth_role: leaf
focus: Detect normalization gaps, missing constraints, wrong data types, unjustified denormalization, and missing indexes on foreign keys in relational database schemas
parents:
  - index.md
covers:
  - Table missing a primary key or using a non-deterministic surrogate
  - "Column storing multiple values in a single field (CSV, JSON array) in a relational table"
  - "Repeated column groups indicating an unnormalized table (phone1, phone2, phone3)"
  - Foreign key column with no index causing slow joins and cascading deletes
  - VARCHAR used for dates, booleans, currency, or other typed data
  - Missing NOT NULL constraint on a column that should never be null
  - Missing UNIQUE constraint on a natural key or business identifier
  - Denormalized columns duplicating data from another table without documented justification
  - Missing foreign key constraint leaving orphan rows possible
  - Overly wide VARCHAR or TEXT column used where a bounded type suffices
  - Missing CHECK constraint on columns with a known value domain
  - "FLOAT/DOUBLE used for monetary or precision-sensitive values"
tags:
  - relational
  - normalization
  - constraints
  - data-types
  - indexes
  - foreign-key
  - schema-design
  - data-architecture
activation:
  file_globs:
    - "**/*.sql"
    - "**/*migration*"
    - "**/*schema*"
    - "**/models/**"
    - "**/*model*"
    - "**/*entity*"
    - "**/db/**"
    - "**/database/**"
    - "**/*table*"
    - "**/prisma/schema.prisma"
    - "**/knexfile*"
    - "**/alembic/**"
    - "**/flyway/**"
  keyword_matches:
    - CREATE TABLE
    - ALTER TABLE
    - PRIMARY KEY
    - FOREIGN KEY
    - NOT NULL
    - VARCHAR
    - INTEGER
    - FLOAT
    - DOUBLE
    - INDEX
    - UNIQUE
    - CHECK
    - REFERENCES
    - migration
    - schema
    - column
    - constraint
  structural_signals:
    - table_definition
    - column_definition
    - constraint_definition
    - migration_file
source:
  origin: file
  path: data-relational-modeling.md
  hash: "sha256:3ab663fdaac63a2c92e77e2d59369d0b2ff7134600643989b308c25679c97391"
---
# Relational Modeling

## When This Activates

Activates on diffs involving SQL DDL statements, ORM model definitions, migration files, or schema configuration for relational databases (PostgreSQL, MySQL, SQL Server, SQLite, Oracle). Relational modeling errors compound over time: a missing constraint today becomes a data integrity incident tomorrow; a missing foreign key index becomes a production outage under load. This reviewer detects schema-level mistakes that violate relational modeling fundamentals -- normalization to at least 3NF unless denormalization is explicitly justified, constraints that enforce data integrity at the database level, appropriate data types for every column, and indexes that support declared relationships.

## Audit Surface

- [ ] CREATE TABLE with no PRIMARY KEY clause
- [ ] Column defined as VARCHAR containing comma-separated or JSON-encoded lists
- [ ] Table with numbered column variants (address1, address2, address3)
- [ ] Foreign key column with no corresponding CREATE INDEX
- [ ] DATE or TIMESTAMP stored as VARCHAR or INTEGER
- [ ] Boolean stored as VARCHAR or unbound INTEGER instead of BOOLEAN or TINYINT(1)
- [ ] Currency or financial amount stored as FLOAT or DOUBLE
- [ ] Column missing NOT NULL that participates in a business rule requiring a value
- [ ] Natural key or business identifier column with no UNIQUE constraint
- [ ] Column duplicating another table's data without a materialized view or documented denormalization reason
- [ ] Foreign key relationship enforced only in application code, not in the schema
- [ ] Missing CHECK or ENUM constraint on a column with a small finite domain
- [ ] Table with no indexes beyond the primary key despite appearing in JOIN or WHERE clauses
- [ ] Composite primary key including nullable columns
- [ ] Table with more than 50 columns suggesting missing normalization

## Detailed Checks

### Normalization Violations
<!-- activation: keywords=["CREATE TABLE", "ALTER TABLE", "column", "table", "field", "migration", "schema"] -->

- [ ] **Multi-valued column**: flag columns storing comma-separated values, pipe-delimited lists, or JSON arrays in a relational table -- this violates 1NF; extract to a separate table with a foreign key relationship
- [ ] **Repeating column groups**: flag tables with numbered column variants (phone1/phone2/phone3, address_line_1/address_line_2) -- this violates 1NF; normalize into a child table with a type discriminator
- [ ] **Partial key dependency**: flag non-key columns in a composite-key table that depend on only part of the key -- this violates 2NF; split into separate tables
- [ ] **Transitive dependency**: flag columns that depend on another non-key column rather than the primary key (e.g., zip_code determining city in an orders table) -- this violates 3NF; extract to a lookup table
- [ ] **Wide table smell**: flag tables with more than 50 columns -- this often indicates missing normalization or multiple concerns collapsed into a single table

### Constraint Discipline
<!-- activation: keywords=["NOT NULL", "UNIQUE", "CHECK", "CONSTRAINT", "DEFAULT", "FOREIGN KEY", "REFERENCES", "PRIMARY KEY", "ENUM"] -->

- [ ] **Missing NOT NULL**: flag columns that participate in required business rules (order total, user email, created_at) but lack NOT NULL constraints -- the database should enforce non-nullability, not just the application
- [ ] **Missing UNIQUE on natural key**: flag business identifier columns (email, SKU, invoice_number, SSN) with no UNIQUE constraint -- duplicates will inevitably occur without database-level enforcement
- [ ] **Missing foreign key constraint**: flag columns named *_id or*_fk that reference another table but have no FOREIGN KEY constraint -- application-only enforcement allows orphan rows on any code path that bypasses the ORM
- [ ] **Missing CHECK constraint**: flag columns with a known finite domain (status, priority, rating 1-5) that have no CHECK or ENUM constraint -- invalid values will accumulate
- [ ] **Nullable column in composite PK**: flag composite primary keys that include nullable columns -- NULL in a primary key violates relational theory and causes ambiguous row identity

### Data Type Selection
<!-- activation: keywords=["VARCHAR", "TEXT", "INTEGER", "FLOAT", "DOUBLE", "DECIMAL", "NUMERIC", "BOOLEAN", "DATE", "TIMESTAMP", "BIGINT", "CHAR", "MONEY", "REAL"] -->

- [ ] **FLOAT for money**: flag FLOAT or DOUBLE used for monetary values, prices, or financial calculations -- use DECIMAL/NUMERIC with explicit precision and scale to avoid rounding errors
- [ ] **VARCHAR for temporal data**: flag dates or timestamps stored as VARCHAR or plain INTEGER (unix epoch without documentation) -- use DATE, TIMESTAMP, or TIMESTAMPTZ for type-safe temporal operations
- [ ] **VARCHAR for boolean**: flag boolean-intent columns stored as VARCHAR ('Y'/'N', 'true'/'false') or unbound INTEGER -- use the native BOOLEAN type or TINYINT(1) on MySQL
- [ ] **Unbounded VARCHAR**: flag VARCHAR(MAX), TEXT, or VARCHAR(4000) used for columns with a known maximum length (country codes, currency codes, phone numbers) -- bounded types document intent and prevent data quality issues
- [ ] **Wrong integer width**: flag INTEGER used where BIGINT is needed (auto-increment PKs on high-volume tables) or BIGINT used where SMALLINT suffices -- match the type to the value domain

### Index Coverage
<!-- activation: keywords=["INDEX", "CREATE INDEX", "FOREIGN KEY", "JOIN", "WHERE", "ORDER BY", "GROUP BY", "REFERENCES", "ON DELETE", "ON UPDATE"] -->

- [ ] **Unindexed foreign key**: flag foreign key columns with no index -- JOINs on the FK and cascading DELETE/UPDATE operations will trigger full table scans on the child table
- [ ] **Missing covering index for frequent query**: flag WHERE or ORDER BY columns in queries that have no supporting index -- full table scans degrade linearly with row count
- [ ] **Redundant overlapping indexes**: flag multiple indexes with the same leading columns -- the leftmost prefix of a composite index already covers queries on those columns alone
- [ ] **Index on low-cardinality column alone**: flag standalone indexes on boolean or enum columns with very few distinct values -- the optimizer will prefer a full scan

### Denormalization Governance
<!-- activation: keywords=["denormalize", "cache", "duplicate", "redundant", "materialized", "summary", "computed", "derived", "total", "count", "precompute"] -->

- [ ] **Undocumented denormalization**: flag columns that duplicate data from another table (customer_name on an orders table, product_price snapshot) with no code comment or migration note explaining the performance or consistency rationale
- [ ] **Missing sync mechanism**: flag denormalized columns with no trigger, materialized view, or application-level sync to keep the duplicate data consistent with the source of truth
- [ ] **Premature denormalization**: flag denormalized columns in a schema with no evidence of the query performance problem they solve -- denormalize only when measured read performance requires it

## Common False Positives

- **Intentional JSON columns in relational tables**: PostgreSQL JSONB columns for semi-structured metadata alongside relational columns are legitimate when the JSON data has no relational query requirements. Flag only when the JSON contains data that should be normalized.
- **Data warehouse star schemas**: dimensional modeling intentionally denormalizes (wide fact tables, denormalized dimensions). Flag only OLTP schemas, not analytical schemas clearly labeled as warehouse or reporting.
- **Legacy migration intermediate state**: a migration adding a denormalized column as part of a multi-step expand-and-contract migration is not a violation. Flag only when the intermediate state becomes permanent.
- **ORM-generated indexes**: some ORMs automatically create indexes on foreign keys. Do not flag missing FK indexes when the ORM demonstrably creates them.

## Severity Guidance

| Finding | Severity |
|---|---|
| FLOAT or DOUBLE used for monetary values | Critical |
| Missing primary key on a table | Critical |
| Foreign key relationship enforced only in application code on a high-integrity table | Critical |
| Multi-valued column (CSV in VARCHAR) violating 1NF | Important |
| Foreign key column with no index | Important |
| Missing NOT NULL on required business column | Important |
| Missing UNIQUE on natural key / business identifier | Important |
| VARCHAR used for date or timestamp storage | Important |
| Undocumented denormalization with no sync mechanism | Important |
| Wide table (50+ columns) with no normalization justification | Minor |
| Missing CHECK constraint on bounded domain column | Minor |
| Unbounded VARCHAR on a column with known max length | Minor |

## See Also

- `principle-fail-fast` -- database constraints are the ultimate fail-fast mechanism; they reject invalid data before it propagates
- `principle-separation-of-concerns` -- each table should represent one concern; wide multi-concern tables violate SoC
- `data-schema-migrations` -- safe migration practices for evolving relational schemas
- `data-n-plus-1-and-query-perf` -- missing indexes and normalization decisions directly impact query performance
- `data-sharding-partitioning` -- partitioning strategies depend on correct relational modeling foundations

## Authoritative References

- [C.J. Date, *An Introduction to Database Systems* (8th ed., 2003) -- the definitive reference on relational theory and normalization](https://www.oreilly.com/library/view/an-introduction-to/9780321197849/)
- [Joe Celko, *SQL for Smarties* (5th ed., 2014) -- practical SQL constraint and type discipline](https://www.elsevier.com/books/joe-celkos-sql-for-smarties/celko/978-0-12-800761-7)
- [Markus Winand, *SQL Performance Explained* (2012) -- index design and query optimization fundamentals](https://use-the-index-luke.com/)
- [PostgreSQL Documentation, "Data Types" and "Constraints"](https://www.postgresql.org/docs/current/datatype.html)
