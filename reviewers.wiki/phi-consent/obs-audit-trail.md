---
id: obs-audit-trail
type: primary
depth_role: leaf
focus: "Detect missing audit logs for data modifications, non-tamper-evident audit storage, incomplete who/what/when/where fields, co-mingled audit and application logs, and retention violations"
parents:
  - index.md
covers:
  - Data creation, update, or deletion without an audit log entry
  - Audit log storage that is mutable or deletable by the application
  - "Audit entries missing who (actor), what (action), when (timestamp), or where (resource)"
  - Audit logs written to the same stream as application logs
  - Audit log retention not aligned with compliance requirements
  - Audit log not indexed or searchable for incident investigation
  - Bulk operations without per-record audit trail
  - Audit bypass in admin or system-level code paths
  - "Before/after values not captured for update operations"
  - Audit log entries without immutable event IDs
  - Sensitive data logged including passwords, tokens, PII, and credit card numbers
  - "Authentication events (login success, failure, lockout) not logged"
  - Authorization failures not logged for security monitoring
  - Missing audit trail for data modifications and administrative actions
  - Log injection via unsanitized user input in log messages
  - Logs missing timestamps, correlation IDs, or source identification
  - "Security events logged at inappropriate levels (DEBUG for auth failures)"
  - Missing alerting for brute-force patterns and anomalous activity
  - Log files with excessive permissions or insecure storage
  - Logging framework misconfiguration suppressing security events
  - "log.info() with string concatenation instead of structured key-value pairs"
  - PII or secrets interpolated into log messages
  - "Missing correlation IDs (request_id, trace_id) in log statements"
  - "Inconsistent log levels (DEBUG in production paths, ERROR for informational events)"
  - "Log output not machine-parseable (no JSON, no structured format)"
  - "Missing context fields (service, user_id, endpoint, status_code)"
  - Excessive logging in hot paths degrading throughput
  - Printf-style format strings instead of structured logging API
  - Mixed logging frameworks in the same service
tags:
  - audit-trail
  - audit-log
  - compliance
  - tamper-evident
  - immutable
  - SOC2
  - GDPR
  - HIPAA
  - PCI-DSS
  - data-modification
  - observability
  - owasp
  - a09
  - logging
  - monitoring
  - audit
  - log-injection
  - PII
  - sensitive-data
  - alerting
  - SIEM
  - security
  - structured-logging
  - log-format
  - correlation-id
  - trace-id
  - CWE-117
  - CWE-532
  - pii
  - log-levels
aliases:
  - sec-owasp-a09-logging-monitoring-failures
  - obs-structured-logging
activation:
  file_globs:
    - "**/*audit*"
    - "**/*trail*"
    - "**/admin/**"
    - "**/*repository*"
    - "**/*dao*"
    - "**/*service*"
    - "**/*mutation*"
    - "**/*command*"
  keyword_matches:
    - audit
    - audit_log
    - audit_trail
    - event_log
    - activity_log
    - changelog
    - history
    - track_change
    - record_event
    - delete
    - update
    - create
    - modify
    - mutation
    - admin
  structural_signals:
    - "Database write operation (INSERT, UPDATE, DELETE)"
    - Repository or DAO method with mutation
    - Admin or privileged endpoint handler
    - Bulk operation or batch mutation
source:
  origin: file
  path: obs-audit-trail.md
  hash: "sha256:01fba43b690062364373b67d6559cf476ef7adfc533bd471838dcf9ca1346337"
---
# Audit Trail

## When This Activates

Activates when diffs contain data mutation operations, audit log implementations, admin endpoints, repository/DAO methods, or keywords like `audit`, `audit_log`, `changelog`, `delete`, `update`, `admin`, `mutation`. A complete audit trail answers four questions for every data change: who performed it, what changed, when it happened, and where the request originated. This reviewer ensures audit completeness, tamper-evidence, separation from application logs, and compliance-aligned retention.

## Audit Surface

- [ ] CREATE/UPDATE/DELETE operation on sensitive entity without audit log call
- [ ] Audit log stored in same database table or log stream as application data
- [ ] Audit entry missing actor identity (user_id, service_account, API key)
- [ ] Audit entry missing timestamp or using non-UTC time
- [ ] Audit entry missing resource identifier (entity type, entity ID)
- [ ] Audit entry missing action type (create, read, update, delete)
- [ ] Update operation audit entry without before/after field values
- [ ] Audit log table with UPDATE or DELETE permissions granted to application role
- [ ] Bulk delete or bulk update without per-record audit entries
- [ ] Admin endpoint bypassing audit logging middleware
- [ ] Audit log retention period not configured or shorter than compliance requirement
- [ ] Audit log without index on actor, timestamp, or resource fields
- [ ] Audit entry missing source IP or request origin for external-facing APIs
- [ ] Audit log entries without unique immutable event ID

## Detailed Checks

### Audit Coverage for Data Mutations
<!-- activation: keywords=["create", "insert", "save", "update", "modify", "patch", "delete", "remove", "destroy", "bulk", "batch", "import", "migrate"] -->

- [ ] **Missing audit for data modification**: flag CREATE, UPDATE, and DELETE operations on sensitive entities (users, roles, permissions, financial records, configuration, PII) that do not produce an audit log entry -- unaudited data changes make incident investigation and compliance reporting impossible. Cross-reference with `sec-owasp-a09-logging-monitoring-failures`
- [ ] **Bulk operation without per-record audit**: flag batch deletes, bulk updates, or data imports that produce only a single summary audit entry instead of per-record entries -- a summary entry ("deleted 500 records") does not support investigation of which specific records were affected
- [ ] **Soft-delete without audit**: flag soft-delete implementations (setting is_deleted=true or deleted_at) that do not create an audit entry -- soft deletes are still data modifications and must be audited
- [ ] **Admin bypass of audit**: flag admin endpoints, system migration scripts, or superuser code paths that skip audit logging -- privileged operations are the highest-value audit events because they carry the most risk. Cross-reference with `principle-separation-of-concerns` for audit as a cross-cutting concern

### Audit Entry Completeness (Who/What/When/Where)
<!-- activation: keywords=["audit", "event", "log_entry", "record", "actor", "user_id", "action", "timestamp", "resource", "entity", "ip", "origin"] -->

- [ ] **Missing actor identity**: flag audit entries that do not record who performed the action (user_id, service_account, API key identifier) -- "the record was deleted" is useless without knowing who deleted it
- [ ] **Missing resource identifier**: flag audit entries without entity type and entity ID -- "user 42 performed a delete" is incomplete without knowing which resource was deleted
- [ ] **Missing action type**: flag audit entries that record the resource but not the operation (create, read, update, delete) -- the action type is essential for access pattern analysis and anomaly detection
- [ ] **Missing timestamp or non-UTC timestamp**: flag audit entries without an ISO 8601 UTC timestamp -- local timestamps complicate cross-timezone investigation and cannot be reliably ordered
- [ ] **Missing before/after values for updates**: flag update operation audit entries that record only "field X was changed" without the old and new values -- before/after values are required for rollback analysis and compliance review
- [ ] **Missing source IP or origin**: flag audit entries for external-facing API calls that do not record the source IP address or request origin -- source information is critical for investigating unauthorized access. Cross-reference with `compliance-pii-handling-and-minimization` for IP address as potential PII

### Tamper-Evidence and Immutability
<!-- activation: keywords=["immutable", "append_only", "tamper", "integrity", "hash", "chain", "write_once", "permission", "grant", "role", "DELETE", "UPDATE", "truncate"] -->

- [ ] **Audit log mutable by application**: flag audit log storage where the application's database role has UPDATE or DELETE permissions on the audit table -- the same application that writes audit entries should not be able to modify or delete them
- [ ] **Audit log in application database without write protection**: flag audit tables co-located in the application database without row-level security, append-only constraints, or separate write-only roles -- a compromised application can erase its own tracks
- [ ] **Missing immutable event IDs**: flag audit entries without a unique, immutable identifier (UUID, sequence number) -- without event IDs, individual audit entries cannot be referenced, and gaps in the sequence cannot be detected
- [ ] **No integrity verification**: flag audit log systems without any tamper-detection mechanism (hash chains, WORM storage, cryptographic signing) -- in high-compliance environments (SOC2, PCI-DSS), audit logs must be provably unmodified

### Separation from Application Logs
<!-- activation: keywords=["logger", "log.info", "console", "stdout", "print", "stream", "appender", "handler", "sink", "transport"] -->

- [ ] **Audit entries in application log stream**: flag audit events written via the application logger (log.info("User deleted record")) instead of a dedicated audit subsystem -- application logs are filtered by level, rotated aggressively, and may be discarded during incidents when they are most needed. Cross-reference with `principle-separation-of-concerns`
- [ ] **Audit entries on stdout only**: flag audit events written only to stdout/console without a durable storage backend -- container restarts, log rotation, and stdout buffer limits can silently lose audit data
- [ ] **Mixed audit and debug logs**: flag audit events interleaved with debug/trace output in the same log stream without structured type fields to distinguish them -- audit entries must be reliably extractable for compliance reporting

### Retention and Searchability
<!-- activation: keywords=["retention", "ttl", "expire", "archive", "purge", "index", "search", "query", "compliance", "regulation", "SOC2", "GDPR", "HIPAA", "PCI"] -->

- [ ] **No retention period configured**: flag audit log storage without a defined retention period or TTL -- compliance requirements mandate specific retention periods (SOC2: 1 year, HIPAA: 6 years, PCI-DSS: 1 year). Cross-reference with `compliance-pii-handling-and-minimization` for PII in audit logs requiring purpose limitation
- [ ] **Retention shorter than compliance requirement**: flag audit log retention configured below the applicable compliance minimum -- under-retention fails audits; verify against the strictest applicable regulation
- [ ] **Audit log not indexed for investigation**: flag audit tables or log stores without indexes on actor, timestamp, resource_type, and resource_id -- during an incident, searching unindexed audit logs across months of data is effectively impossible
- [ ] **No archival strategy**: flag audit logs without a plan for archiving older entries to cheaper storage while maintaining searchability -- unbounded growth in the primary audit store degrades query performance and increases cost

## Common False Positives

- **Read-only operations**: not all read operations require audit logging. Flag only when regulatory requirements mandate access logging (e.g., HIPAA requires logging access to PHI, PCI-DSS requires logging access to cardholder data).
- **Idempotent operations**: retried creates or upserts may produce duplicate audit entries. This is preferable to missing entries; deduplication can happen at query time.
- **Event-sourced systems**: systems using event sourcing have an inherent audit trail in their event store. Verify the event store provides who/what/when/where and tamper-evidence, then do not flag separately.
- **Database-level triggers**: some teams implement audit logging via database triggers rather than application code. This is valid if the triggers capture the actor identity (which requires passing it through session variables or audit context columns).

## Severity Guidance

| Finding | Severity |
|---|---|
| Data deletion without any audit trail | Critical |
| Audit log mutable or deletable by the application | Critical |
| Admin endpoint bypassing audit logging | Critical |
| Audit entry missing actor identity (who) | Important |
| Audit entry missing resource identifier (what) | Important |
| Update audit entry without before/after values | Important |
| Audit log co-mingled with application logs without separation | Important |
| Bulk operation with only summary audit (no per-record entries) | Important |
| Audit log retention shorter than compliance requirement | Important |
| Audit entry missing source IP for external API | Minor |
| Audit log not indexed on key fields | Minor |
| Missing immutable event ID on audit entries | Minor |

## See Also

- `sec-owasp-a09-logging-monitoring-failures` -- security event logging overlaps with audit trail requirements
- `compliance-pii-handling-and-minimization` -- audit logs containing PII must comply with data minimization
- `obs-structured-logging` -- audit entries should follow structured logging formats for parseability
- `obs-alerting-discipline` -- anomalous audit patterns (mass deletions, privilege escalation) should trigger alerts
- `principle-separation-of-concerns` -- audit logging is a cross-cutting concern that should not be inlined in business logic
- `principle-fail-fast` -- audit log write failures should fail the operation, not silently drop the audit entry

## Authoritative References

- [OWASP Logging Cheat Sheet - Audit Trails](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [NIST SP 800-92: Guide to Computer Security Log Management](https://csrc.nist.gov/publications/detail/sp/800-92/final)
- [SOC 2 - CC7.2: Monitoring of System Components](https://www.aicpa-cima.com/topic/audit-assurance/audit-and-assurance-greater-than-soc-2)
- [PCI DSS Requirement 10: Log and Monitor All Access](https://www.pcisecuritystandards.org/)
- [HIPAA 45 CFR 164.312(b): Audit Controls](https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html)
