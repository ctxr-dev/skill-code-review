---
id: cloud-aws-rds-aurora
type: primary
depth_role: leaf
focus: Detect RDS and Aurora misconfigurations including missing Multi-AZ, public accessibility, absent encryption, missing connection pooling, and inadequate backup and monitoring settings
parents:
  - index.md
covers:
  - Missing Multi-AZ deployment for production databases
  - Missing encryption at rest
  - Public accessibility enabled on database instance
  - Missing automated backups or insufficient retention
  - Parameter group not customized from defaults
  - Missing connection pooling via RDS Proxy
  - Missing enhanced monitoring
  - Storage autoscaling not enabled
  - Missing deletion protection
  - Read replica not used for read-heavy workload
tags:
  - aws
  - rds
  - aurora
  - multi-az
  - encryption
  - backup
  - proxy
  - monitoring
  - read-replica
  - deletion-protection
activation:
  file_globs:
    - "**/*.tf"
    - "**/*.json"
    - "**/*.yaml"
    - "**/*.yml"
    - "**/cdk.*"
  keyword_matches:
    - RDS
    - rds
    - Aurora
    - aurora
    - DBInstance
    - DBCluster
    - MultiAZ
    - ReadReplica
    - ParameterGroup
    - Snapshot
    - Proxy
  structural_signals:
    - rds_public_access
    - missing_multi_az
    - missing_encryption
source:
  origin: file
  path: cloud-aws-rds-aurora.md
  hash: "sha256:aff32e686001b8a04853957605772c6791738f1b37aa7c06538fa0870fa90205"
---
# AWS RDS and Aurora

## When This Activates

Activates when diffs contain RDS instance definitions, Aurora cluster configurations, RDS Proxy resources, or parameter group customizations. RDS hosts the most critical data in most applications -- a publicly accessible database is an immediate breach vector, missing Multi-AZ means a single AZ failure takes down the application, and absent encryption at rest violates every compliance framework. This reviewer enforces production-readiness for managed relational databases.

## Audit Surface

- [ ] RDS instance or Aurora cluster with MultiAZ false or absent
- [ ] RDS instance with StorageEncrypted absent or false
- [ ] RDS instance with PubliclyAccessible set to true
- [ ] BackupRetentionPeriod absent, zero, or below 7 days
- [ ] Using default parameter group instead of custom
- [ ] Application with many DB connections and no RDS Proxy
- [ ] Enhanced monitoring absent or interval set to 0
- [ ] MaxAllocatedStorage absent (no storage autoscaling)
- [ ] DeletionProtection absent or false on production database
- [ ] Read-heavy workload with no read replica
- [ ] Security group allowing 0.0.0.0/0 on database port
- [ ] Master password hardcoded in template
- [ ] Performance Insights not enabled
- [ ] Aurora cluster without global database for DR

## Detailed Checks

### High Availability and Multi-AZ
<!-- activation: keywords=["MultiAZ", "multi_az", "AvailabilityZone", "DBCluster", "Failover", "ReaderEndpoint", "read_replica"] -->

- [ ] **Missing Multi-AZ**: flag production RDS instances with `MultiAZDeployment` set to false or absent -- a single-AZ instance means an AZ failure causes downtime; Multi-AZ provides automatic failover with minimal data loss
- [ ] **No read replica for read-heavy workload**: flag applications with query patterns dominated by reads (SELECT-heavy) that connect only to the primary instance -- read replicas offload read traffic and improve response times
- [ ] **Aurora single-instance cluster**: flag Aurora clusters with only one instance -- Aurora clusters should have at least two instances (one writer, one reader) for automatic failover within the cluster
- [ ] **No global database for cross-region DR**: flag Aurora clusters serving critical workloads with no cross-region replica or global database -- a regional outage loses the database

### Encryption and Network Security
<!-- activation: keywords=["StorageEncrypted", "KmsKeyId", "PubliclyAccessible", "publicly_accessible", "SecurityGroup", "ingress", "VPCSecurityGroups"] -->

- [ ] **Missing encryption at rest**: flag RDS instances with `StorageEncrypted` absent or false -- encryption at rest is a baseline requirement; once created without encryption, the instance must be recreated (encryption cannot be added retroactively)
- [ ] **Public accessibility enabled**: flag RDS instances with `PubliclyAccessible: true` -- databases should never be directly accessible from the internet; use a bastion host, VPN, or AWS Session Manager for administrative access
- [ ] **Security group 0.0.0.0/0 on DB port**: flag security groups attached to RDS that allow ingress from `0.0.0.0/0` on the database port (3306, 5432, 1433, etc.) -- even with PubliclyAccessible false, this is defense-in-depth failure
- [ ] **Hardcoded master password**: flag `MasterUserPassword` set to a literal string in templates -- use `ManageMasterUserPassword: true` (RDS-managed) or reference Secrets Manager

### Backup and Recovery
<!-- activation: keywords=["BackupRetentionPeriod", "backup_retention_period", "Snapshot", "snapshot", "DeletionProtection", "deletion_protection", "FinalSnapshotIdentifier"] -->

- [ ] **Insufficient backup retention**: flag `BackupRetentionPeriod` set to 0 (disabled) or below 7 days -- automated backups enable point-in-time recovery; 7 days is a minimum, 14-35 days is recommended for production
- [ ] **Missing deletion protection**: flag production database instances with `DeletionProtection` absent or false -- accidental CloudFormation stack deletion or Terraform destroy can permanently delete the database
- [ ] **No final snapshot**: flag `SkipFinalSnapshot: true` or missing `FinalSnapshotIdentifier` on production instances -- if deletion occurs, the final snapshot is the last line of defense
- [ ] **Snapshot not encrypted**: flag manual or automated snapshot configurations that do not inherit or specify encryption

### Connection Management and Proxy
<!-- activation: keywords=["Proxy", "RDSProxy", "rds_proxy", "connection_pool", "max_connections", "pool_size", "ConnectionPoolConfigurationInfo"] -->

- [ ] **No RDS Proxy for Lambda**: flag Lambda functions connecting directly to RDS without RDS Proxy -- Lambda's concurrent execution model opens a new connection per invocation, rapidly exhausting the database connection limit
- [ ] **No connection pooling**: flag applications with high concurrency (microservices, serverless) connecting to RDS without any connection pooling mechanism (RDS Proxy, PgBouncer, ProxySQL) -- connection storms during traffic spikes crash the database
- [ ] **RDS Proxy without IAM auth**: flag RDS Proxy configurations using password-based authentication instead of IAM database authentication -- IAM auth eliminates the need to manage and rotate database credentials

### Parameter Groups and Monitoring
<!-- activation: keywords=["ParameterGroup", "DBParameterGroup", "parameter_group", "PerformanceInsights", "EnhancedMonitoring", "MonitoringInterval", "MonitoringRoleArn"] -->

- [ ] **Default parameter group**: flag instances using the default parameter group (e.g., `default.postgres15`) -- default parameter groups cannot be modified; critical settings like `log_statement`, `shared_buffers`, `max_connections`, and `ssl` require a custom parameter group
- [ ] **Missing enhanced monitoring**: flag `MonitoringInterval` set to 0 or absent -- enhanced monitoring provides OS-level metrics (CPU, memory, I/O) that CloudWatch basic monitoring does not; 60-second granularity is recommended at minimum
- [ ] **Missing Performance Insights**: flag `EnablePerformanceInsights` absent or false -- Performance Insights identifies slow queries, lock waits, and resource bottlenecks with no performance overhead
- [ ] **Storage autoscaling not enabled**: flag `MaxAllocatedStorage` absent -- without it, the database runs out of storage and goes into a read-only state; autoscaling prevents this

## Common False Positives

- **Development/test databases**: non-production instances do not need Multi-AZ, deletion protection, or read replicas. Verify the environment context before flagging.
- **Aurora Serverless v2**: Aurora Serverless manages scaling automatically and may not need explicit read replicas for moderate workloads.
- **Short-lived databases**: databases for CI/CD test runs that are created and destroyed per pipeline do not need backup retention or deletion protection.

## Severity Guidance

| Finding | Severity |
|---|---|
| PubliclyAccessible true on production database | Critical |
| Security group 0.0.0.0/0 on database port | Critical |
| Hardcoded master password in template | Critical |
| Missing encryption at rest | Critical |
| Missing Multi-AZ on production database | Important |
| BackupRetentionPeriod 0 or below 7 | Important |
| Missing deletion protection on production | Important |
| No connection pooling for serverless workload | Important |
| Default parameter group | Important |
| Missing enhanced monitoring | Minor |
| Missing Performance Insights | Minor |
| Storage autoscaling not enabled | Minor |

## See Also

- `sec-owasp-a05-misconfiguration` -- public RDS is a classic misconfiguration
- `sec-secrets-management-and-rotation` -- database credentials should use Secrets Manager with rotation
- `cloud-aws-lambda` -- Lambda-to-RDS connection pooling is critical
- `cloud-aws-iam-least-privilege` -- IAM database authentication replaces password-based auth
- `cloud-aws-kms-crypto` -- RDS encryption at rest uses KMS keys

## Authoritative References

- [AWS RDS Best Practices](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_BestPractices.html)
- [AWS Aurora Best Practices](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.BestPractices.html)
- [AWS RDS Proxy Documentation](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy.html)
- [AWS Well-Architected Framework -- Reliability Pillar, Database](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/)
