---
id: db-mongodb
type: primary
depth_role: leaf
focus: Detect MongoDB pitfalls around schema validation gaps, index strategy, aggregation pipeline misuse, sharding key selection, ObjectId assumptions, and WiredTiger cache pressure
parents:
  - index.md
covers:
  - Missing schema validation allowing inconsistent document shapes
  - Missing indexes on query filter and sort fields
  - Aggregation pipeline stages in wrong order causing full collection scans
  - Shard key selection leading to hot spots or jumbo chunks
  - ObjectId used as a timestamp proxy without understanding monotonic ordering
  - WiredTiger cache pressure from oversized documents or working set
  - Oplog window too short for replica set recovery
  - Unbounded array growth in documents exceeding 16 MB limit
tags:
  - mongodb
  - mongo
  - schema-validation
  - index
  - aggregation
  - sharding
  - wiredtiger
  - oplog
  - objectid
  - replica-set
activation:
  file_globs:
    - "**/*mongo*"
    - "**/*mongoose*"
    - "**/*collection*"
    - "**/*schema*"
    - "**/*model*"
    - "**/*repository*"
    - "**/*dao*"
  keyword_matches:
    - mongodb
    - mongo
    - mongoose
    - MongoClient
    - collection
    - aggregate
    - "find("
    - findOne
    - insertOne
    - updateOne
    - deleteOne
    - bulkWrite
    - $match
    - $lookup
    - $unwind
    - $group
    - $project
    - ObjectId
    - shard
    - replicaSet
    - writeConcern
    - readPreference
source:
  origin: file
  path: db-mongodb.md
  hash: "sha256:b6700f9a92e0435b01d8a83fd410278f5c44ead5847b49e2540f1965d31babb2"
---
# MongoDB Pitfalls

## When This Activates

Activates on diffs involving MongoDB queries, schema definitions, Mongoose models, aggregation pipelines, or connection configuration. MongoDB's flexible document model creates unique failure modes absent in relational databases. Missing schema validation allows silent data corruption from inconsistent document shapes. Wrong aggregation pipeline stage ordering causes full collection scans. Monotonic shard keys create hot partitions. Unbounded array growth silently approaches the 16 MB document limit. This reviewer targets detection heuristics for MongoDB-specific architectural and operational pitfalls.

## Audit Surface

- [ ] Collection without JSON Schema validation or validator rules
- [ ] Query filtering on a field with no index (collection scan on >10k docs)
- [ ] Aggregation pipeline with $match after $lookup or $unwind instead of before
- [ ] Shard key with low cardinality or monotonically increasing values
- [ ] ObjectId._getTimestamp() used for business logic time comparisons
- [ ] Documents with arrays that grow unboundedly (push without size limit)
- [ ] Read preference set to secondary without tolerance for stale data
- [ ] Write concern w:0 or w:1 without journal (j:false) in production
- [ ] Connection string missing retryWrites=true and retryReads=true
- [ ] $lookup (join) across sharded collections
- [ ] Text index used where Atlas Search or dedicated search engine is needed
- [ ] bulkWrite without ordered:false when order is not required
- [ ] Change stream resume token not persisted for crash recovery
- [ ] TTL index on a field that is not a Date type

## Detailed Checks

### Schema Validation
<!-- activation: keywords=["schema", "validator", "validation", "mongoose.Schema", "jsonSchema", "$jsonSchema", "required", "bsonType", "shape", "type:"] -->

- [ ] **No schema validation**: flag collections created without `$jsonSchema` validator or Mongoose schema with strict mode -- without validation, any document shape can be inserted, causing runtime errors in application code that assumes a structure
- [ ] **Mongoose strict mode disabled**: flag `new Schema({...}, { strict: false })` -- this allows fields not defined in the schema to be saved to MongoDB, defeating the purpose of the schema
- [ ] **Missing required fields in validator**: flag schemas where business-critical fields lack `required: true` -- optional fields that are always expected cause null reference errors downstream

### Index Strategy
<!-- activation: keywords=["createIndex", "ensureIndex", "index:", "compound index", "text index", "TTL", "sparse", "unique", "explain", "COLLSCAN", "IXSCAN", "covered query"] -->

- [ ] **Missing index on query pattern**: flag queries with filter or sort fields that have no supporting index -- MongoDB performs a COLLSCAN (full collection scan) when no index covers the query
- [ ] **Compound index field order mismatch**: flag compound indexes where the field order does not follow the ESR rule (Equality, Sort, Range) -- wrong field order means the index cannot fully satisfy the query
- [ ] **TTL index on non-Date field**: flag TTL indexes on fields that are not Date types -- MongoDB silently ignores TTL deletion for non-Date values, and documents never expire
- [ ] **Too many indexes**: flag collections with >10 indexes -- each index adds write overhead and memory consumption; prune unused indexes via `$indexStats`

### Aggregation Pipeline
<!-- activation: keywords=["aggregate", "$match", "$lookup", "$unwind", "$group", "$project", "$sort", "$limit", "$skip", "$facet", "pipeline"] -->

- [ ] **$match not first stage**: flag aggregation pipelines where $match is not the first (or early) stage -- $match at the start uses indexes and reduces the document set for subsequent stages; later $match operates on in-memory documents
- [ ] **$lookup on sharded collection**: flag $lookup stages that join to a sharded collection -- this requires broadcasting the lookup to all shards, which is expensive and may timeout
- [ ] **$unwind without preserveNullAndEmptyArrays**: flag $unwind on optional array fields without `preserveNullAndEmptyArrays: true` -- documents where the array is missing or empty are silently dropped from results
- [ ] **Large $group without $limit**: flag $group that produces unbounded result sets without a preceding or following $limit -- this loads all groups into memory

### Sharding and Distribution
<!-- activation: keywords=["shard", "shardCollection", "shardKey", "balancer", "chunk", "jumbo", "mongos", "zone", "hashed", "ranged"] -->

- [ ] **Monotonic shard key**: flag shard keys using ObjectId, timestamps, or auto-incrementing values with range-based sharding -- all new writes go to the same shard (hot partition). Use a hashed shard key or prepend a high-cardinality prefix
- [ ] **Low-cardinality shard key**: flag shard keys with few distinct values (e.g., country code, status) -- chunks cannot be split below the shard key granularity, creating jumbo chunks that cannot be migrated
- [ ] **Shard key not in query filter**: flag frequent queries that do not include the shard key in the filter -- mongos must broadcast these to all shards (scatter-gather), which defeats the purpose of sharding

### Document Model
<!-- activation: keywords=["$push", "$addToSet", "array", "embed", "subdocument", "16MB", "document size", "ObjectId", "timestamp", "_id"] -->

- [ ] **Unbounded array growth**: flag `$push` or `$addToSet` on arrays without a corresponding `$slice` or application-level size check -- arrays that grow without bound approach MongoDB's 16 MB document size limit, causing write failures
- [ ] **ObjectId as timestamp substitute**: flag code that extracts timestamps from ObjectId for business logic ordering or filtering -- ObjectId timestamps have only second-level granularity and are monotonic only within a single process, not globally ordered
- [ ] **Deeply nested documents**: flag documents with >3 levels of nesting -- deep nesting makes queries complex, updates with positional operators fragile, and indexing impossible beyond the first array level

## Common False Positives

- **Schema-less by design**: some analytics or event-logging collections intentionally accept variable document shapes. Flag only when the application code assumes a fixed structure.
- **$lookup in migration scripts**: one-time migration or ETL pipelines using $lookup across sharded collections are acceptable if not in the hot path. Flag only in application-level query code.
- **Hashed shard key on ObjectId**: hashed sharding on _id (ObjectId) distributes writes evenly. Flag monotonic keys only with range-based sharding.
- **Small collections without indexes**: collections with <1000 documents perform adequately with COLLSCAN. Flag missing indexes only on collections expected to grow.

## Severity Guidance

| Finding | Severity |
|---|---|
| Write concern w:0 or j:false on production data that must not be lost | Critical |
| Unbounded array growth approaching 16 MB document limit | Critical |
| Monotonic shard key causing hot partition on write-heavy collection | Critical |
| Missing index on high-traffic query pattern (COLLSCAN on >10k docs) | Important |
| $match not in first stage of aggregation pipeline | Important |
| Missing schema validation on collection with strict application assumptions | Important |
| retryWrites/retryReads not enabled in connection string | Important |
| $lookup across sharded collections in application hot path | Important |
| TTL index on non-Date field (documents never expire) | Minor |
| Change stream resume token not persisted | Minor |
| ObjectId timestamp used for business logic ordering | Minor |

## See Also

- `data-n-plus-1-and-query-perf` -- N+1 patterns in MongoDB arise from missing $lookup or client-side joins iterating cursor results
- `data-sharding-partitioning` -- shard key selection is the most consequential partitioning decision in MongoDB
- `sec-owasp-a03-injection` -- NoSQL injection via operator injection ($gt, $ne, $where) in MongoDB query objects

## Authoritative References

- [MongoDB Documentation: Schema Validation](https://www.mongodb.com/docs/manual/core/schema-validation/)
- [MongoDB Documentation: Indexing Strategies](https://www.mongodb.com/docs/manual/applications/indexes/)
- [MongoDB Documentation: Aggregation Pipeline Optimization](https://www.mongodb.com/docs/manual/core/aggregation-pipeline-optimization/)
- [MongoDB Documentation: Shard Key Selection](https://www.mongodb.com/docs/manual/core/sharding-choose-a-shard-key/)
- [MongoDB University: M201 MongoDB Performance](https://university.mongodb.com/)
