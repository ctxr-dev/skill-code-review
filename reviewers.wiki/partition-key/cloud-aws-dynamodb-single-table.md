---
id: cloud-aws-dynamodb-single-table
type: primary
depth_role: leaf
focus: Detect DynamoDB design pitfalls including hot partition keys, missing GSIs for access patterns, scan-over-query usage, absent TTL on ephemeral data, and capacity mode mismatches
parents:
  - index.md
covers:
  - Hot partition key causing throttling
  - Missing GSI for known access pattern
  - Scan used instead of query
  - Missing TTL on ephemeral or time-bounded data
  - On-demand vs provisioned wrong choice for workload
  - Missing point-in-time recovery
  - GSI projection too wide increasing cost
  - Missing DynamoDB Streams for change data capture
  - Item size approaching 400KB limit
  - Missing error handling for conditional check failures
  - Single-table design with poor access pattern coverage
  - GSI projections missing required attributes causing extra reads
  - "LSI defined after table creation (impossible) or exceeding 5 limit"
  - Hot partition from uneven partition key distribution
  - Provisioned capacity too low causing throttling or too high wasting cost
  - Scan used where Query with proper key design would suffice
  - "TTL attribute not a Number (epoch seconds) type"
  - DynamoDB Streams not consumed causing stream record expiration
tags:
  - aws
  - dynamodb
  - single-table
  - partition-key
  - gsi
  - scan
  - query
  - ttl
  - capacity
  - streams
  - lsi
  - hot-partition
  - rcu
  - wcu
  - throttling
aliases:
  - db-dynamodb-single-table
activation:
  file_globs:
    - "**/*.tf"
    - "**/*.json"
    - "**/*.yaml"
    - "**/*.yml"
    - "**/cdk.*"
    - "**/*.py"
    - "**/*.ts"
    - "**/*.js"
    - "**/*.java"
    - "**/*.go"
  keyword_matches:
    - DynamoDB
    - dynamodb
    - Table
    - KeySchema
    - GSI
    - LSI
    - ProvisionedThroughput
    - OnDemand
    - StreamSpecification
    - TTL
  structural_signals:
    - dynamodb_scan
    - hot_partition_key
    - missing_gsi
source:
  origin: file
  path: cloud-aws-dynamodb-single-table.md
  hash: "sha256:cbc8bac46f8ca74089c9eb33f9493aaafe47584df94122d4aaeb0fba2318a9c2"
---
# AWS DynamoDB

## When This Activates

Activates when diffs contain DynamoDB table definitions, GSI/LSI configurations, or application code performing DynamoDB operations (query, scan, put, batch). DynamoDB's performance is entirely dependent on key design and access patterns -- a hot partition key can throttle an entire table even with spare capacity, a scan on a large table can consume all provisioned throughput in seconds, and missing TTL on ephemeral data silently accumulates cost. This reviewer catches data modeling and operational mistakes.

## Audit Surface

- [ ] Partition key with low cardinality (status, type, boolean)
- [ ] Table with no GSI despite multiple access patterns
- [ ] Scan operation used where Query with key condition works
- [ ] Ephemeral data with no TTL attribute
- [ ] Provisioned capacity on bursty workload
- [ ] On-demand billing on steady high-throughput workload
- [ ] Table with PointInTimeRecovery absent or disabled
- [ ] GSI with ProjectionType ALL when few attributes needed
- [ ] Changes not captured via Streams for downstream processing
- [ ] Item construction that could exceed 400KB
- [ ] Missing retry for ProvisionedThroughputExceededException
- [ ] BatchWriteItem without UnprocessedItems handling
- [ ] TransactWriteItems without idempotency token
- [ ] FilterExpression used as primary query mechanism

## Detailed Checks

### Partition Key Design
<!-- activation: keywords=["KeySchema", "HASH", "RANGE", "partition", "pk", "sk", "KeyType", "AttributeDefinitions"] -->

- [ ] **Low-cardinality partition key**: flag partition keys that use status values (ACTIVE/INACTIVE), boolean flags, types (USER/ADMIN), or date-only values -- these create hot partitions because most items land on the same partition; use a high-cardinality attribute like user ID, order ID, or a composite key
- [ ] **Missing sort key**: flag tables with only a partition key (no sort key) that store multiple item types or need range queries -- single-table design requires a sort key to differentiate entity types and enable efficient range queries
- [ ] **Timestamp as partition key**: flag tables using a timestamp as the partition key -- recent timestamps create a hot partition since most writes target the latest time; use timestamp as the sort key instead

### GSI Design and Access Patterns
<!-- activation: keywords=["GSI", "GlobalSecondaryIndex", "LSI", "LocalSecondaryIndex", "Projection", "ProjectionType", "NonKeyAttributes"] -->

- [ ] **Missing GSI for access pattern**: flag code that queries DynamoDB with filter expressions on non-key attributes when the same access pattern could be served by a GSI -- filter expressions still read all matching items from the partition and discard, consuming full read capacity
- [ ] **GSI projection too wide**: flag GSIs with `ProjectionType: ALL` when the queries using that index only need a subset of attributes -- ALL projects every attribute to the GSI, doubling storage and write costs; use KEYS_ONLY or INCLUDE with specific attributes
- [ ] **Too many GSIs**: flag tables with more than 5 GSIs -- each GSI adds write amplification and storage cost; reconsider the key design or use a single overloaded GSI pattern

### Scan vs Query
<!-- activation: keywords=["Scan", "scan", "Query", "query", "FilterExpression", "filter_expression", "KeyConditionExpression"] -->

- [ ] **Scan instead of query**: flag `Scan` operations in application code when the access pattern could be satisfied by a `Query` with a key condition expression -- scans read every item in the table and are O(n) in cost and latency
- [ ] **FilterExpression as primary filter**: flag queries that rely on `FilterExpression` to narrow results rather than `KeyConditionExpression` -- FilterExpression is applied after reading from the partition, so read capacity is consumed for all items matching the key condition, not just the filtered results
- [ ] **Unbounded scan without pagination**: flag scan operations without `Limit` or `ExclusiveStartKey` pagination -- a full table scan on a large table can timeout and consume the entire provisioned throughput

### TTL and Lifecycle
<!-- activation: keywords=["TTL", "TimeToLive", "ttl", "expiry", "expires", "session", "token", "cache", "temporary"] -->

- [ ] **Missing TTL on ephemeral data**: flag tables storing sessions, tokens, caches, temporary locks, or event records with no `TimeToLiveSpecification` enabled -- without TTL, ephemeral data accumulates indefinitely, increasing storage cost and scan times
- [ ] **TTL attribute not set on items**: flag application code that puts items to a TTL-enabled table without setting the TTL attribute value -- enabling TTL on the table does nothing if items do not have the TTL attribute populated

### Capacity and Recovery
<!-- activation: keywords=["ProvisionedThroughput", "OnDemand", "PAY_PER_REQUEST", "BillingMode", "ReadCapacityUnits", "WriteCapacityUnits", "PointInTimeRecovery", "PITR"] -->

- [ ] **Provisioned on bursty workload**: flag provisioned capacity mode on tables with unpredictable traffic patterns (event-driven, user-facing with variable load) -- on-demand mode handles bursts without throttling and requires no capacity planning
- [ ] **On-demand on steady workload**: flag on-demand mode on tables with consistent, predictable throughput -- provisioned mode with auto-scaling is significantly cheaper (up to 6x) for steady workloads
- [ ] **Missing point-in-time recovery**: flag tables with `PointInTimeRecoveryEnabled` absent or false -- PITR provides continuous backups and is essential for recovering from accidental deletes or application bugs

### Error Handling and Transactions
<!-- activation: keywords=["BatchWriteItem", "UnprocessedItems", "TransactWriteItems", "ConditionalCheckFailedException", "ProvisionedThroughputExceededException", "batch_write", "transact_write"] -->

- [ ] **BatchWriteItem without UnprocessedItems check**: flag batch write operations that do not check and retry `UnprocessedItems` in the response -- DynamoDB may not process all items in a batch due to throttling, and unprocessed items are silently lost
- [ ] **Missing conditional check failure handling**: flag transactional or conditional writes without catching `ConditionalCheckFailedException` -- this exception is expected in optimistic concurrency patterns and must be handled
- [ ] **TransactWriteItems without idempotency token**: flag transactional writes without a `ClientRequestToken` -- without an idempotency token, retries on network errors can cause duplicate transactions

## Common False Positives

- **Analytics tables**: tables designed specifically for analytics may legitimately use scans as the primary access pattern when data is processed in bulk.
- **Small reference tables**: tables with fewer than 1,000 items where scan is faster and simpler than maintaining a GSI for each access pattern.
- **Migration code**: one-time migration scripts may use scans to process all items; this is acceptable for non-production batch operations.

## Severity Guidance

| Finding | Severity |
|---|---|
| Scan on production table with >100K items | Critical |
| Hot partition key (low cardinality) | Critical |
| BatchWriteItem without UnprocessedItems handling | Important |
| Missing point-in-time recovery | Important |
| Missing TTL on ephemeral data | Important |
| FilterExpression used as primary query mechanism | Important |
| GSI with ProjectionType ALL unnecessarily | Minor |
| On-demand mode on steady workload | Minor |
| Missing DynamoDB Streams for CDC | Minor |
| Table with more than 5 GSIs | Minor |

## See Also

- `cloud-aws-lambda` -- Lambda is the most common compute layer for DynamoDB access
- `reliability-timeout-deadline-propagation` -- DynamoDB operations need timeouts in the call chain
- `cloud-aws-eventbridge-sqs-sns-kinesis-step-functions` -- DynamoDB Streams feed event-driven architectures
- `sec-owasp-a01-broken-access-control` -- DynamoDB fine-grained access control via IAM conditions

## Authoritative References

- [AWS DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [Alex DeBrie, "The DynamoDB Book"](https://www.dynamodbbook.com/)
- [AWS DynamoDB Partitions and Key Design](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-design.html)
- [AWS re:Invent, "Amazon DynamoDB Advanced Design Patterns"](https://www.youtube.com/watch?v=HaEPXoXVf2k)
