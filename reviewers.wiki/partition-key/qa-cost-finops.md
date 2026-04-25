---
id: qa-cost-finops
type: primary
depth_role: leaf
focus: Detect unbounded cloud resource scaling, missing cost alerts, expensive queries without optimization, unused provisioned resources, excessive logging verbosity, and missing cost-allocation tags
parents:
  - index.md
covers:
  - Unbounded auto-scaling without max-instance or budget cap
  - Missing cost alerts or budget alarms on cloud accounts or projects
  - Expensive database queries without pagination, indexing, or caching
  - Missing reserved capacity or savings plans for stable workloads
  - "Provisioned resources (instances, clusters, endpoints) not referenced in code"
  - "Logging verbosity at DEBUG/TRACE in production causing storage cost"
  - "Missing cost-allocation tags on cloud resources (IaC templates)"
  - Oversized compute instances for the workload
  - Data transfer across regions or availability zones without justification
  - Storage without lifecycle policies accumulating cost indefinitely
  - No token usage tracking per request
  - Missing budget alerts or spend caps
  - Prompt caching not used when available and beneficial
  - "Unnecessarily large context (full documents when summaries suffice)"
  - "Model selection not cost-optimized (large model for simple tasks)"
  - No per-request token logging for cost attribution
  - No cost estimation before expensive operations
tags:
  - cost
  - finops
  - cloud
  - scaling
  - budget
  - logging
  - tags
  - optimization
  - reserved-capacity
  - lifecycle
  - tokens
  - monitoring
  - caching
  - model-selection
  - batch
  - spend
aliases:
  - ai-llm-cost-token-spend-monitoring
activation:
  file_globs:
    - "**/*.tf"
    - "**/*.tfvars"
    - "**/*.yaml"
    - "**/*.yml"
    - "**/cloudformation*"
    - "**/serverless*"
    - "**/docker-compose*"
    - "**/*config*"
    - "**/*query*"
    - "**/*sql*"
    - "**/*log*"
  keyword_matches:
    - auto_scaling
    - autoscaling
    - max_capacity
    - min_capacity
    - instance_type
    - machine_type
    - sku
    - budget
    - cost
    - tags
    - lifecycle
    - retention
    - SELECT
    - FROM
    - log_level
    - LOG_LEVEL
    - DEBUG
    - TRACE
    - provisioned
    - reserved
  structural_signals:
    - IaC resource definition without tags
    - Auto-scaling configuration without upper bound
    - Database query without pagination
source:
  origin: file
  path: qa-cost-finops.md
  hash: "sha256:d233a3633e9d8644bfb2ee7fcce8dc669872f77582fd14b5fa0ce0043a263e36"
---
# Cost and FinOps

## When This Activates

Activates when diffs modify infrastructure-as-code, cloud resource configuration, database queries, logging configuration, or auto-scaling settings. Cloud cost overruns are the most common unplanned budget impact in software organizations. Most cost incidents stem from a small set of patterns: unbounded scaling, missing lifecycle policies, oversized resources, expensive queries, and verbose logging. This reviewer detects these patterns at code-review time, before they generate a bill.

## Audit Surface

- [ ] Auto-scaling group or serverless function with no max-instance limit
- [ ] Cloud resource provisioned in IaC without cost-allocation tags
- [ ] Database query without LIMIT, pagination, or result-size cap
- [ ] Full table scan on large table without index usage comment or optimization
- [ ] Log level set to DEBUG or TRACE in production configuration
- [ ] Log statement inside hot loop emitting per-iteration entries
- [ ] S3 bucket, GCS bucket, or blob storage without lifecycle policy
- [ ] Provisioned cloud resource (RDS, Elasticache, EKS node group) with no code reference
- [ ] Cross-region data transfer in API calls or replication without cost note
- [ ] Instance type larger than workload requires (oversized by 2x+ CPU or memory)
- [ ] Missing budget alarm or cost anomaly detection in cloud account setup
- [ ] Spot/preemptible instances not considered for fault-tolerant batch workloads
- [ ] NAT gateway or data-transfer-heavy architecture without cost estimate

## Detailed Checks

### Unbounded Scaling
<!-- activation: keywords=["autoscaling", "auto_scaling", "scaling", "max_capacity", "max_size", "max_count", "concurrency", "reserved_concurrent", "max_instances", "replicas"] -->

- [ ] **No max-instance cap**: flag auto-scaling groups, Lambda reserved concurrency, or Kubernetes HPA configurations with no maximum limit -- a traffic spike or retry storm can scale to thousands of instances before anyone notices
- [ ] **Scale-to-zero not configured**: flag always-on minimum instances for workloads with predictable idle periods -- configure scale-to-zero during off-hours or use scheduled scaling
- [ ] **Missing scaling cooldown**: flag auto-scaling policies without cooldown periods -- rapid scale-up/down oscillation wastes resources and may incur per-launch costs

### Missing Cost-Allocation Tags
<!-- activation: keywords=["tags", "Tags", "labels", "Labels", "resource", "aws_", "azurerm_", "google_"] -->

- [ ] **Untagged IaC resources**: flag Terraform resources, CloudFormation resources, or Pulumi resources without cost-allocation tags (team, service, environment, cost-center) -- untagged resources cannot be attributed in cost reports
- [ ] **Inconsistent tag schema**: flag resources using different tag key names for the same concept (Team vs team vs owner vs Team-Name) -- standardize tag keys across the organization
- [ ] **Missing environment tag**: flag resources without an environment tag (dev, staging, production) -- environment tags enable cost comparison and non-production teardown automation

### Expensive Queries and Data Access
<!-- activation: keywords=["SELECT", "FROM", "WHERE", "JOIN", "query", "find", "scan", "list", "get_all", "fetch_all"] -->

- [ ] **Unbounded result sets**: flag SELECT queries without LIMIT or pagination, and API calls that return all records -- unbounded results consume memory, network bandwidth, and database IOPS proportional to data growth
- [ ] **Missing index usage**: flag queries on large tables that filter by non-indexed columns -- full table scans grow linearly with data volume; add an index or document why a scan is acceptable
- [ ] **N+1 query patterns**: flag loops that execute a query per iteration instead of batch fetching -- N+1 queries multiply both latency and database cost
- [ ] **Expensive aggregations without caching**: flag repeated expensive aggregations (COUNT, SUM, GROUP BY on large tables) that could be cached or pre-computed -- schedule aggregations and cache results

### Logging and Storage Cost
<!-- activation: keywords=["log", "logger", "logging", "LOG_LEVEL", "log_level", "debug", "trace", "retention", "lifecycle", "expiration", "storage_class"] -->

- [ ] **Verbose logging in production**: flag production configurations with log level set to DEBUG or TRACE -- debug logs in production can generate 10-100x the volume of INFO logs, driving storage and ingestion cost
- [ ] **Hot-loop logging**: flag log statements inside tight loops that emit per-item entries -- aggregate or sample instead of logging every iteration
- [ ] **Missing storage lifecycle**: flag S3 buckets, GCS buckets, or blob containers without lifecycle policies (transition to cold storage, expiration) -- storage without lifecycle accumulates indefinitely
- [ ] **Missing log retention limits**: flag logging configurations (CloudWatch, Datadog, Elasticsearch) without retention period -- log retention without limits is a growing cost liability

### Resource Sizing and Efficiency
<!-- activation: keywords=["instance_type", "machine_type", "sku", "size", "cpu", "memory", "spot", "preemptible", "reserved", "savings_plan", "on_demand"] -->

- [ ] **Oversized instances**: flag compute instances where the workload uses less than 50% of provisioned CPU or memory based on available metrics or documentation -- right-size or use burstable instance types
- [ ] **Missing spot/preemptible usage**: flag fault-tolerant batch workloads (data pipelines, CI, ML training) running on on-demand instances -- spot/preemptible instances offer 60-90% savings for interruptible workloads
- [ ] **No reserved capacity for stable workloads**: flag production workloads running 24/7 on on-demand pricing without reserved instances or savings plans -- stable baseline workloads benefit from 30-60% savings via commitments

## Common False Positives

- **Development and test environments**: lower cost discipline is acceptable for short-lived dev/test environments that are torn down regularly.
- **Cost-tagged at a higher level**: resources within a tagged resource group, VPC, or account may inherit tags from the parent -- verify before flagging individual resources.
- **Intentional full scans**: analytics queries, data migrations, and batch jobs may intentionally scan full tables -- flag only if the query runs frequently or on a user-facing path.
- **Startup-phase sizing**: early-stage projects with low traffic may intentionally use minimal infrastructure without reserved capacity commitments.

## Severity Guidance

| Finding | Severity |
|---|---|
| Auto-scaling with no max-instance limit | Critical |
| Unbounded query on user-facing path against growing table | Critical |
| DEBUG/TRACE log level in production configuration | Important |
| Cloud resource without cost-allocation tags | Important |
| Storage bucket without lifecycle policy | Important |
| Hot-loop logging emitting per-iteration entries | Important |
| Missing spot/preemptible for batch workloads | Minor |
| Oversized instance without right-sizing analysis | Minor |
| Missing budget alarm (if org has FinOps process) | Minor |

## See Also

- `perf-startup-cold-start` -- cold-start latency often correlates with cost from over-provisioning to avoid it
- `obs-metrics-red-use-golden-signals` -- resource utilization metrics (USE) drive right-sizing decisions

## Authoritative References

- [FinOps Foundation, "FinOps Framework" -- principles, capabilities, and maturity model for cloud cost management](https://www.finops.org/framework/)
- [AWS Well-Architected Framework, "Cost Optimization Pillar"](https://docs.aws.amazon.com/wellarchitected/latest/cost-optimization-pillar/welcome.html)
- [Google Cloud Architecture Framework, "Cost Optimization"](https://cloud.google.com/architecture/framework/cost-optimization)
- [Infracost Documentation -- CI/CD cost estimation for Terraform](https://www.infracost.io/docs/)
