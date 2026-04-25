---
id: data-backup-restore-dr-rpo-rto
type: primary
depth_role: leaf
focus: "Detect missing backup strategies, untested restore procedures, undefined RPO/RTO, missing point-in-time recovery, and absent cross-region replication for disaster recovery"
parents:
  - index.md
covers:
  - Database or data store with no backup strategy configured
  - Backup exists but restore has never been tested
  - "RPO (Recovery Point Objective) not defined for a data store"
  - "RTO (Recovery Time Objective) not defined or exceeds SLA"
  - Point-in-time recovery not enabled on a database that supports it
  - Single-region deployment with no cross-region backup or replication
  - Backup stored in same failure domain as the primary data
  - Backup not encrypted or not access-controlled
  - "Backup monitoring not configured (silent backup failures)"
  - Application-critical data not included in backup scope
tags:
  - backup
  - restore
  - disaster-recovery
  - RPO
  - RTO
  - PITR
  - cross-region
  - resilience
  - data-architecture
activation:
  file_globs:
    - "**/*backup*"
    - "**/*restore*"
    - "**/*disaster*"
    - "**/*recovery*"
    - "**/*snapshot*"
    - "**/*terraform*"
    - "**/*cloudformation*"
    - "**/*helm*"
    - "**/*infra*"
    - "**/*database*"
    - "**/*rds*"
    - "**/*aurora*"
    - "**/*cloudsql*"
  keyword_matches:
    - backup
    - restore
    - snapshot
    - recovery
    - RPO
    - RTO
    - disaster
    - DR
    - PITR
    - point-in-time
    - WAL
    - binlog
    - archive
    - cross-region
    - replica
    - failover
    - retention
    - encrypt
    - automated_backup
    - backup_window
  structural_signals:
    - backup_configuration
    - restore_procedure
    - disaster_recovery_config
    - infrastructure_database_resource
source:
  origin: file
  path: data-backup-restore-dr-rpo-rto.md
  hash: "sha256:ef650042f6c8d0f982cc1e1f9e1ef9df97e62cc9297fd1e332415778dbcd3947"
---
# Backup, Restore, and DR (RPO/RTO)

## When This Activates

Activates on diffs involving database provisioning (Terraform, CloudFormation, Pulumi, Helm), backup configuration, restore scripts, disaster recovery documentation, or infrastructure definitions for data stores. Every data store needs a backup strategy, a tested restore procedure, and defined recovery objectives -- yet these are the most commonly deferred concerns in software projects. The cost of deferral is existential: without tested backups, a single infrastructure failure, human error, or ransomware attack can permanently destroy business data. This reviewer detects missing or inadequate backup, restore, and disaster recovery configurations.

## Audit Surface

- [ ] Database provisioning with no automated backup or snapshot configuration
- [ ] Infrastructure-as-code with no backup resource for a database
- [ ] No documented or automated restore test procedure
- [ ] No RPO defined for a data store containing business-critical data
- [ ] No RTO defined or RTO exceeds the application's SLA
- [ ] WAL archiving or PITR not enabled on PostgreSQL, MySQL binlog not retained
- [ ] All backups stored in the same region and availability zone as primary
- [ ] Backup stored unencrypted or with overly broad IAM/access permissions
- [ ] No monitoring or alerting on backup job success/failure
- [ ] Application data stored outside the database (local files, object storage) not included in backup
- [ ] Backup retention period not aligned with business or compliance requirements
- [ ] Disaster recovery plan references manual steps with no runbook
- [ ] Cross-region replication not configured for a globally available service

## Detailed Checks

### Backup Strategy Existence
<!-- activation: keywords=["backup", "snapshot", "dump", "export", "pg_dump", "mysqldump", "mongodump", "automated", "schedule", "cron", "backup_window", "backup_retention"] -->

- [ ] **No backup configured**: flag database resources in infrastructure-as-code (Terraform aws_db_instance, CloudFormation RDS, Helm chart values) with no backup configuration (backup_retention_period=0, automated backup disabled) -- every production database must have automated backups
- [ ] **Backup scope incomplete**: flag backup strategies that cover the database but not application data stored outside it (S3 objects, local file uploads, configuration data, secrets) -- the backup scope must cover all data required to restore the application
- [ ] **No backup schedule**: flag databases relying on manual backup triggers with no automated schedule -- manual backups are forgotten; automated daily (or more frequent) backups are the minimum
- [ ] **Backup retention too short**: flag backup retention periods shorter than business or compliance requirements -- a 1-day retention window means yesterday's backup is already gone when a corruption is discovered a week later

### Restore Testing
<!-- activation: keywords=["restore", "recovery", "test", "drill", "verify", "validate", "runbook", "procedure", "RTO", "time to recover"] -->

- [ ] **Untested restore procedure**: flag backup configurations with no evidence of restore testing (no restore script, no automated restore test, no documented restore drill) -- a backup that has never been restored is not a backup; it is a hope
- [ ] **Manual restore steps**: flag disaster recovery plans that depend on undocumented manual steps (SSH into server, run commands from memory) -- restore procedures must be scripted and version-controlled
- [ ] **No restore time measurement**: flag restore procedures with no measured or estimated restore duration -- the RTO cannot be validated without measuring actual restore time
- [ ] **Restore to different environment not tested**: flag restore procedures tested only on the same infrastructure -- test restore to a different environment (different account, different region) to verify portability

### RPO and RTO Definition
<!-- activation: keywords=["RPO", "RTO", "recovery point", "recovery time", "SLA", "objective", "data loss", "downtime", "acceptable", "target"] -->

- [ ] **No RPO defined**: flag data stores containing business-critical data with no documented RPO (Recovery Point Objective -- maximum acceptable data loss measured in time) -- without an RPO, the backup frequency is arbitrary
- [ ] **No RTO defined**: flag production systems with no documented RTO (Recovery Time Objective -- maximum acceptable downtime) -- without an RTO, there is no target for restore procedure speed
- [ ] **Backup frequency exceeds RPO**: flag backup schedules where the interval between backups exceeds the stated RPO -- daily backups with a 1-hour RPO means up to 24 hours of data loss on failure
- [ ] **RTO exceeds SLA**: flag restore procedures whose measured or estimated duration exceeds the application's SLA uptime commitment -- if the SLA promises 99.9% uptime (8.7 hours/year), an RTO of 12 hours violates it on a single incident

### Point-in-Time Recovery
<!-- activation: keywords=["PITR", "point-in-time", "WAL", "binlog", "oplog", "archive", "continuous", "transaction log", "redo log", "journal"] -->

- [ ] **PITR not enabled**: flag databases that support point-in-time recovery (PostgreSQL WAL archiving, MySQL binlog retention, MongoDB oplog, RDS PITR) but do not have it enabled -- PITR is the difference between losing 24 hours of data (last backup) and losing 5 minutes of data (last WAL segment)
- [ ] **WAL/binlog retention too short**: flag transaction log retention periods shorter than the maximum time between corruption detection and recovery initiation -- if corruption is discovered 3 days later but binlog retention is 1 day, PITR cannot help
- [ ] **No WAL archival to durable storage**: flag PostgreSQL WAL archiving configured to local disk only (not S3, GCS, or equivalent durable storage) -- local WAL is lost with the server; archive to object storage for durability
- [ ] **PITR not tested**: flag PITR configurations that have never been exercised -- restore to a specific timestamp to verify PITR actually works

### Cross-Region and Failure Domain
<!-- activation: keywords=["region", "cross-region", "multi-region", "availability zone", "AZ", "failure domain", "geographic", "DR site", "secondary", "standby", "geo-replication"] -->

- [ ] **Backup in same failure domain**: flag backups stored in the same region and availability zone as the primary data -- a regional outage destroys both the primary and the backup; store backups in a different region
- [ ] **No cross-region replication for global service**: flag globally available services with all data and backups in a single region -- cross-region replication or backup replication is required for regional disaster recovery
- [ ] **Backup not encrypted**: flag backup storage (S3 buckets, storage accounts, snapshot copies) without encryption at rest -- backups contain the same sensitive data as the primary and must meet the same encryption standards
- [ ] **Overly broad backup access**: flag backup storage with permissive IAM policies or public access -- backup access should be restricted to the restore pipeline and authorized operators

### Backup Monitoring
<!-- activation: keywords=["monitor", "alert", "notify", "failure", "success", "status", "health", "check", "verify", "notification"] -->

- [ ] **No backup monitoring**: flag backup jobs or automated snapshots with no monitoring of success/failure status -- a silently failing backup job means no backups exist when needed
- [ ] **No backup success alerting**: flag backup monitoring that reports failures but does not confirm successes -- alert on missing success signals (dead man's switch) to catch backup jobs that stop running entirely
- [ ] **Backup size not monitored**: flag backup processes with no monitoring of backup size trends -- a suddenly smaller backup may indicate data loss; a suddenly larger backup may indicate runaway growth

## Common False Positives

- **Ephemeral data stores**: caches (Redis, Memcached) used purely as caches with the source of truth elsewhere do not need backup. Flag only when the cache contains primary data.
- **Development and staging environments**: non-production environments may intentionally skip backup configuration. Flag only production or production-equivalent environments.
- **Managed service defaults**: some managed services (AWS RDS, Google Cloud SQL) enable automated backups by default. Verify the defaults before flagging.
- **Stateless services**: services with no persistent data (pure API gateways, load balancers) do not need data backup. Flag only data-bearing services.

## Severity Guidance

| Finding | Severity |
|---|---|
| Production database with no backup configured | Critical |
| Backup exists but restore has never been tested | Critical |
| All backups in same failure domain as primary data | Critical |
| No RPO defined for business-critical data store | Important |
| PITR not enabled on database that supports it | Important |
| Backup frequency exceeds stated RPO | Important |
| No backup monitoring or alerting | Important |
| Backup stored unencrypted or with overly broad access | Important |
| No cross-region backup for globally available service | Important |
| Backup retention shorter than compliance requirement | Minor |
| No RTO defined or RTO not validated against SLA | Minor |
| Disaster recovery plan relies on undocumented manual steps | Minor |

## See Also

- `data-replication-consistency` -- replication provides high availability but is not a substitute for backup; both are needed
- `data-retention-and-gdpr` -- backup retention must align with data retention policies; backups can reintroduce deleted PII
- `data-schema-migrations` -- test restore after migration to verify backup compatibility with the new schema
- `principle-fail-fast` -- backup failures must alert immediately, not fail silently

## Authoritative References

- [AWS Well-Architected Framework, "Reliability Pillar" -- backup and recovery best practices](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/welcome.html)
- [Google Cloud, "Disaster Recovery Planning Guide"](https://cloud.google.com/architecture/dr-scenarios-planning-guide)
- [PostgreSQL Documentation, "Continuous Archiving and Point-in-Time Recovery"](https://www.postgresql.org/docs/current/continuous-archiving.html)
- [Charity Majors, "Backups? We Don't Need No Stinking Backups" (2017) -- untested backups are not backups](https://charity.wtf/2019/10/18/build-good-alerts-for-your-backup-pipeline/)
- [NIST SP 800-34, "Contingency Planning Guide for Federal Information Systems"](https://csrc.nist.gov/publications/detail/sp/800-34/rev-1/final)
