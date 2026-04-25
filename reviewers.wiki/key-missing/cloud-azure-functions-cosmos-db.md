---
id: cloud-azure-functions-cosmos-db
type: primary
depth_role: leaf
focus: Detect Azure Functions missing managed identity, Cosmos DB partition key and RU misconfigurations, cold start issues, and consistency level mismatches
parents:
  - index.md
covers:
  - Azure Functions without managed identity for Key Vault access
  - Missing consumption vs premium plan choice justification
  - "Cosmos DB RU provisioning mismatch (too high for dev, too low for prod)"
  - Missing Cosmos DB indexing policy customization
  - Partition key causing hot partitions
  - Missing TTL on ephemeral data collections
  - Cosmos DB consistency level too strong or too weak for use case
  - Functions cold start without premium plan warm-up
  - Connection string in application settings instead of Key Vault reference
  - Cosmos DB cross-partition queries in hot path
tags:
  - azure
  - functions
  - cosmos-db
  - serverless
  - partition-key
  - consistency
  - cold-start
activation:
  file_globs:
    - "**/*.cs"
    - "**/*.ts"
    - "**/*.js"
    - "**/*.py"
    - "**/*.tf"
    - "**/*.bicep"
    - "**/host.json"
    - "**/function.json"
    - "**/local.settings.json"
  keyword_matches:
    - AzureFunction
    - azure-functions
    - FunctionApp
    - CosmosDB
    - cosmos
    - DocumentClient
    - CosmosClient
    - host.json
    - function.json
  structural_signals:
    - azurerm_cosmosdb_account
    - azurerm_function_app
    - FunctionName_attribute
source:
  origin: file
  path: cloud-azure-functions-cosmos-db.md
  hash: "sha256:2b869e40354d8b437dc539b1dbc05dc3bb6bab85c2e13c8e89c87ff9dbe5bae7"
---
# Azure Functions and Cosmos DB

## When This Activates

Activates on diffs involving Azure Functions definitions (host.json, function.json, function code), Cosmos DB client usage, or Terraform/Bicep resources for function apps and Cosmos DB accounts. Azure Functions on Consumption plan cold-start in 1-10 seconds, and Cosmos DB charges per Request Unit with strict partition-level throughput limits. Misconfigured partition keys create hot partitions that throttle under load, wrong consistency levels cause stale reads or unnecessary latency, and connection strings in app settings bypass Key Vault audit trails. This reviewer detects diff-visible signals of Azure serverless and Cosmos DB misconfigurations.

## Audit Surface

- [ ] Azure Function accessing Key Vault without managed identity
- [ ] Consumption plan function on latency-sensitive path without warm-up
- [ ] Cosmos DB container with RU provisioned above 10000 without autoscale
- [ ] Cosmos DB container using default indexing policy
- [ ] Partition key with low cardinality (boolean, enum, status)
- [ ] Cosmos DB container storing ephemeral data without TTL
- [ ] Strong consistency for workload tolerating eventual
- [ ] Eventual consistency for workload requiring session or stronger
- [ ] Connection string hardcoded in settings instead of Key Vault reference
- [ ] Cross-partition query in request handler hot path
- [ ] Missing maxConcurrentRequests in host.json
- [ ] Missing retry policy for Cosmos DB transient failures

## Detailed Checks

### Azure Functions Identity and Secrets
<!-- activation: keywords=["ManagedIdentity", "KeyVault", "connection_string", "ConnectionString", "local.settings", "app_setting", "SecretClient"] -->

- [ ] **Connection string in app settings**: flag Cosmos DB or other connection strings stored as plain text in application settings or local.settings.json -- use Key Vault references (@Microsoft.KeyVault(SecretUri=...)) to centralize secret management
- [ ] **Missing managed identity for Key Vault**: flag Azure Functions accessing Key Vault with ClientSecretCredential or connection string containing access key -- use system-assigned or user-assigned managed identity
- [ ] **Secrets in local.settings.json committed**: flag local.settings.json checked into source control -- this file contains local development secrets and should be in .gitignore

### Azure Functions Cold Start and Scaling
<!-- activation: keywords=["consumption", "premium", "warm-up", "cold", "FUNCTIONS_WORKER_RUNTIME", "host.json", "maxConcurrentRequests", "minInstances"] -->

- [ ] **Consumption plan for latency-sensitive**: flag functions on Consumption plan that serve user-facing HTTP requests without a warm-up mechanism -- cold starts add 1-10 seconds; use Premium plan with always-ready instances
- [ ] **Missing host.json concurrency limits**: flag host.json without maxConcurrentRequests or functionTimeout configured -- unbounded concurrency exhausts downstream resources; missing timeout defaults to 5 minutes on Consumption
- [ ] **No warm-up trigger**: flag Premium plan functions without a warmup trigger (Microsoft.Azure.WebJobs.Extensions.Warmup) -- warm-up triggers pre-initialize dependencies before traffic arrives
- [ ] **Missing WEBSITE_MAX_DYNAMIC_APPLICATION_SCALE_OUT**: flag Consumption plan functions handling bursty traffic without scale-out limits -- unbounded scaling can overwhelm downstream databases

### Cosmos DB Partition Key Design
<!-- activation: keywords=["partitionKey", "partition_key", "PartitionKey", "/id", "container", "collection"] -->

- [ ] **Low-cardinality partition key**: flag partition keys on boolean, status, or enum fields with fewer than 100 distinct values -- these create hot partitions where all traffic concentrates on a few logical partitions
- [ ] **Partition key /id**: flag partition key set to /id when the access pattern queries by other fields -- this maximizes write distribution but makes every read a cross-partition query
- [ ] **Cross-partition query in hot path**: flag Cosmos DB queries in request handlers that do not include the partition key in the WHERE clause -- cross-partition queries fan out to all physical partitions and are 10-100x slower

### Cosmos DB RU and Indexing
<!-- activation: keywords=["throughput", "RU", "requestUnit", "autoscale", "indexingPolicy", "index", "includedPath", "excludedPath"] -->

- [ ] **Fixed RU without autoscale**: flag containers provisioned with fixed RU above 10000 without autoscale -- autoscale prevents over-provisioning during low traffic and handles spikes up to 10x
- [ ] **Default indexing policy**: flag containers using the default policy that indexes every property -- for write-heavy workloads, exclude unused paths to reduce RU cost per write
- [ ] **Missing composite index**: flag queries with ORDER BY on multiple properties without a composite index defined -- these queries fail or consume excessive RU without the index

### Cosmos DB Consistency and TTL
<!-- activation: keywords=["consistency", "ConsistencyLevel", "Strong", "Session", "Eventual", "BoundedStaleness", "TTL", "timeToLive", "DefaultTimeToLive"] -->

- [ ] **Strong consistency for global reads**: flag Strong consistency on multi-region Cosmos DB accounts -- Strong consistency doubles latency and halves throughput for cross-region reads; use Session consistency unless strict linearizability is required
- [ ] **Eventual consistency for user-facing reads**: flag Eventual consistency on workloads where a user writes then immediately reads their own data -- Session consistency (default) guarantees read-your-writes within a session
- [ ] **Missing TTL on ephemeral data**: flag containers storing session data, cache entries, or temporary records without DefaultTimeToLive set -- without TTL, ephemeral data accumulates indefinitely and increases storage costs

## Common False Positives

- **local.settings.json with placeholder values**: local.settings.json with clearly placeholder connection strings (UseDevelopmentStorage=true) is safe.
- **Fixed RU on small dev containers**: containers provisioned with 400 RU (minimum) in development do not need autoscale.
- **Partition key /id for event logs**: append-only collections where reads are always by ID legitimately use /id as partition key.
- **Strong consistency for financial data**: financial transactions and inventory systems may legitimately require Strong consistency despite the performance cost.

## Severity Guidance

| Finding | Severity |
|---|---|
| Connection string or secret committed to source control | Critical |
| Key Vault accessed with ClientSecretCredential instead of managed identity | Critical |
| Low-cardinality partition key on high-traffic container | Important |
| Cross-partition query in request handler hot path | Important |
| Consumption plan for latency-sensitive user-facing function | Important |
| Missing TTL on ephemeral data container | Important |
| Consistency level mismatch for workload pattern | Important |
| Default indexing policy on write-heavy container | Minor |
| Fixed RU without autoscale above 10000 | Minor |
| Missing host.json concurrency configuration | Minor |

## See Also

- `cloud-azure-managed-identity-aks` -- Azure managed identity patterns and AKS security
- `arch-serverless` -- general serverless architecture anti-patterns
- `sec-secrets-management-and-rotation` -- secret storage and rotation best practices
- `reliability-timeout-deadline-propagation` -- timeout propagation for function chains

## Authoritative References

- [Microsoft, "Azure Functions Best Practices"](https://learn.microsoft.com/en-us/azure/azure-functions/functions-best-practices)
- [Microsoft, "Cosmos DB Partitioning"](https://learn.microsoft.com/en-us/azure/cosmos-db/partitioning-overview)
- [Microsoft, "Cosmos DB Consistency Levels"](https://learn.microsoft.com/en-us/azure/cosmos-db/consistency-levels)
- [Microsoft, "Cosmos DB Indexing Policies"](https://learn.microsoft.com/en-us/azure/cosmos-db/index-policy)
- [Microsoft, "Key Vault References for Azure Functions"](https://learn.microsoft.com/en-us/azure/app-service/app-service-key-vault-references)
