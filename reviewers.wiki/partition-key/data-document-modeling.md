---
id: data-document-modeling
type: primary
depth_role: leaf
focus: Detect unbounded arrays, deep nesting, missing schema validation, poor reference-vs-embed decisions, and document size risks in document databases
parents:
  - index.md
covers:
  - Unbounded array field that grows without limit inside a document
  - Deeply nested subdocument structure exceeding three levels
  - "Missing schema validation on a collection (schemaless by default is not schema-free by intent)"
  - "Reference used where embedding is correct (frequent co-access, owned lifecycle)"
  - "Embedding used where reference is correct (shared entity, independent lifecycle, large payload)"
  - Document approaching or exceeding 16 MB BSON limit
  - Indexed field buried inside nested subdocument reducing index effectiveness
  - Missing index on fields used in query filters or sort operations
  - Polymorphic collection with no discriminator field or type indicator
  - Write amplification from large embedded arrays updated frequently
tags:
  - document-db
  - mongodb
  - nosql
  - embedding
  - referencing
  - schema-validation
  - arrays
  - nesting
  - data-architecture
activation:
  file_globs:
    - "**/*schema*"
    - "**/*model*"
    - "**/*collection*"
    - "**/*mongo*"
    - "**/*dynamo*"
    - "**/*couch*"
    - "**/*firestore*"
    - "**/*.json"
    - "**/models/**"
    - "**/*document*"
    - "**/*nosql*"
  keyword_matches:
    - collection
    - document
    - MongoDB
    - mongoose
    - DynamoDB
    - Firestore
    - CouchDB
    - Couchbase
    - embed
    - subdocument
    - ObjectId
    - DBRef
    - $push
    - $addToSet
    - schema
    - validator
    - BSON
    - nested
    - array
  structural_signals:
    - document_schema_definition
    - collection_configuration
    - mongoose_model
    - dynamo_table_definition
source:
  origin: file
  path: data-document-modeling.md
  hash: "sha256:1b5a87898ffa2c414496e2270ce159c621f3b1b17a41674414548d4bf98db8e9"
---
# Document Modeling

## When This Activates

Activates on diffs involving document database schemas, model definitions (Mongoose, Morphia, Spring Data MongoDB), collection configurations, or aggregation pipelines for document stores (MongoDB, DynamoDB, Firestore, CouchDB, Couchbase). Document databases trade normalized structure for read-optimized documents, but this flexibility creates distinct failure modes: unbounded arrays that grow until the document exceeds storage limits, deep nesting that defeats indexing, missing validation that lets corrupt data persist silently, and reference-vs-embed decisions that create unnecessary network round trips or data inconsistency. This reviewer detects these document-specific modeling errors.

## Audit Surface

- [ ] Array field in a document schema with no explicit size bound or cap
- [ ] Subdocument nesting deeper than three levels in schema definition or sample document
- [ ] Collection created with no JSON Schema validator or equivalent validation rule
- [ ] Reference (ObjectId, DBRef) to a child entity that is always fetched alongside the parent
- [ ] Embedded subdocument for an entity shared across multiple parent documents
- [ ] Document structure where a single document could exceed 16 MB under realistic data growth
- [ ] Compound index on fields at different nesting depths
- [ ] Query filter or sort on a field with no supporting index
- [ ] Collection storing multiple entity types with no type discriminator field
- [ ] Array field receiving frequent push operations without periodic cleanup or archival
- [ ] Lookup/join aggregation used to reassemble data that should be embedded
- [ ] Embedded array used as a queue or log accumulator

## Detailed Checks

### Unbounded Arrays and Document Growth
<!-- activation: keywords=["array", "push", "$push", "$addToSet", "embed", "subdocument", "list", "items", "comments", "logs", "events", "history", "entries"] -->

- [ ] **Unbounded array**: flag array fields with no application-enforced size limit, $slice operator, or capped design -- an array that grows with user activity (comments, log entries, order history) will eventually hit the 16 MB document limit
- [ ] **Push without slice**: flag $push operations on arrays that do not include $slice to cap the array size -- each push grows the document permanently
- [ ] **Array as queue or log**: flag array fields used as message queues, activity logs, or event accumulators -- these are unbounded by nature; use a separate collection with TTL index instead
- [ ] **Write amplification**: flag large embedded arrays (100+ elements) that are updated frequently -- MongoDB rewrites the entire document on every update, and large documents amplify write I/O
- [ ] **Document size projection**: flag document structures where a single document could exceed 16 MB under realistic growth (e.g., a user document embedding all orders) -- model the maximum realistic size and verify it stays well below the limit

### Nesting Depth and Structure
<!-- activation: keywords=["nested", "subdocument", "embed", "level", "depth", "child", "parent", "object", "deep", "hierarchy"] -->

- [ ] **Deep nesting**: flag subdocument structures exceeding three nesting levels -- deep nesting makes queries harder to write, indexes less effective, and partial updates more complex
- [ ] **Indexed field at depth**: flag indexes on fields buried three or more levels deep (e.g., `a.b.c.d`) -- deeply nested indexed fields are harder to maintain and may indicate a modeling issue
- [ ] **Nested array of arrays**: flag arrays containing arrays as elements -- multi-dimensional arrays defeat most query and index strategies in document databases
- [ ] **Polymorphic nesting without discriminator**: flag subdocuments that take different shapes depending on context with no type field to distinguish variants -- consumers cannot reliably parse the structure

### Schema Validation
<!-- activation: keywords=["schema", "validator", "validation", "JSON Schema", "jsonSchema", "required", "type", "bsonType", "mongoose", "Joi", "Zod", "yup", "ajv"] -->

- [ ] **No collection-level validation**: flag collections created without a JSON Schema validator (MongoDB), attribute definitions (DynamoDB), or equivalent server-side validation -- application-level validation alone allows any code path to insert malformed documents
- [ ] **Missing required fields**: flag document schemas where essential business fields (created_at, status, owner) are not marked as required in the validator -- optional-by-default means silent data gaps
- [ ] **No type enforcement**: flag schema definitions where fields have no type constraint -- storing a string where a number is expected causes silent query mismatches
- [ ] **Validation not enforced on update**: flag collection validation configured only for insert but not update (`validationAction: warn` or bypass on updates) -- documents can degrade over time through unvalidated updates

### Reference vs. Embed Decisions
<!-- activation: keywords=["ObjectId", "DBRef", "ref", "populate", "lookup", "$lookup", "reference", "embed", "denormalize", "join", "foreign", "related", "belongs", "has_many", "hasMany"] -->

- [ ] **Reference for always-co-accessed data**: flag referenced (separate collection) entities that are always fetched together with the parent -- if the parent is never read without the child, embedding avoids the extra query
- [ ] **Embed for shared entity**: flag embedding of entities that are referenced by multiple parent documents (e.g., embedding a full user profile in every order) -- shared entities should be referenced to avoid update anomalies
- [ ] **Embed for large independent entity**: flag embedding of entities that are large (>1 KB), have independent lifecycles, or are accessed independently -- these should be referenced to avoid document bloat
- [ ] **$lookup in hot path**: flag $lookup (join) aggregations in latency-sensitive query paths -- frequent $lookups signal that the data should be embedded or the schema restructured for the access pattern

### Index Strategy
<!-- activation: keywords=["index", "createIndex", "ensureIndex", "compound", "sparse", "unique", "TTL", "text", "wildcard", "hint", "explain", "collscan", "COLLSCAN", "sort"] -->

- [ ] **Missing query index**: flag fields used in find filters, sort operations, or aggregation match stages that have no supporting index -- collection scans grow linearly with document count
- [ ] **Missing unique index on business key**: flag business identifier fields (email, orderId, SKU) with no unique index -- the database should enforce uniqueness, not just the application
- [ ] **Wildcard index as default strategy**: flag wildcard indexes (`$**`) used as the primary indexing strategy -- wildcard indexes are a stopgap, not a substitute for purpose-built indexes on known query patterns

## Common False Positives

- **Small bounded arrays**: arrays with a known small upper bound (tags, roles, a fixed set of addresses) are safe to embed. Flag only arrays that grow with user activity or time.
- **Schema-on-read by design**: some analytics or data lake collections intentionally store heterogeneous documents. Flag missing validation only on operational collections.
- **DynamoDB single-table design**: DynamoDB's single-table pattern intentionally stores multiple entity types in one table with a type discriminator in the sort key. This is not a polymorphic collection violation if the access patterns are well defined.
- **Embedded snapshots**: embedding a point-in-time snapshot of a referenced entity (product price at order time) is intentional denormalization for historical accuracy.

## Severity Guidance

| Finding | Severity |
|---|---|
| Unbounded array that grows with user activity and no size cap | Critical |
| Document structure that can exceed 16 MB under realistic growth | Critical |
| No schema validation on an operational collection | Important |
| Embedded entity shared across multiple parent documents (update anomaly risk) | Important |
| $lookup join in a latency-sensitive hot path | Important |
| Array used as queue or log accumulator in a document | Important |
| Reference for data always co-accessed with parent (unnecessary round trip) | Important |
| Deep nesting (4+ levels) in document structure | Minor |
| Missing index on query filter or sort field | Minor |
| Collection with multiple entity types and no discriminator field | Minor |

## See Also

- `data-relational-modeling` -- relational normalization principles provide the counterpoint; document modeling intentionally denormalizes but must do so with discipline
- `data-n-plus-1-and-query-perf` -- wrong reference-vs-embed decisions directly cause N+1 query patterns in document databases
- `principle-fail-fast` -- collection-level schema validation is the document database equivalent of fail-fast constraints
- `data-schema-migrations` -- schema evolution in document databases requires versioning and migration strategies
- `data-retention-and-gdpr` -- unbounded arrays and embedded PII create GDPR deletion challenges

## Authoritative References

- [MongoDB Documentation, "Data Modeling Introduction" and "Schema Validation"](https://www.mongodb.com/docs/manual/core/data-modeling-introduction/)
- [Rick Copeland, *MongoDB Applied Design Patterns* (2013) -- embedding vs. referencing decision framework](https://www.oreilly.com/library/view/mongodb-applied-design/9781449340056/)
- [Alex DeBrie, *The DynamoDB Book* (2020) -- single-table design and access pattern modeling](https://www.dynamodbbook.com/)
- [MongoDB University, "M320: Data Modeling" -- official schema design patterns and anti-patterns](https://university.mongodb.com/)
