---
id: compliance-soc2
type: primary
depth_role: leaf
focus: Detect SOC 2 Trust Service Criteria gaps including missing access reviews, absent change management process, missing availability monitoring, no incident response hooks, missing encryption, and vendor risk signals
parents:
  - index.md
covers:
  - Missing access control review or recertification mechanism
  - No change management or approval process for deployments
  - Missing availability monitoring or health check endpoints
  - No incident response hooks or alerting integration
  - Sensitive data stored or transmitted without encryption
  - No vendor risk assessment signals for third-party integrations
  - Missing audit logging for system and data access
  - No separation of duties in deployment pipeline
  - Missing data backup or recovery mechanism
  - No vulnerability management or dependency scanning signals
tags:
  - soc2
  - trust-service-criteria
  - access-control
  - change-management
  - availability
  - incident-response
  - compliance
  - AICPA
activation:
  file_globs:
    - "**/*deploy*"
    - "**/*pipeline*"
    - "**/*ci*"
    - "**/*cd*"
    - "**/*health*"
    - "**/*monitor*"
    - "**/*alert*"
    - "**/*incident*"
    - "**/*access*"
    - "**/*role*"
    - "**/*permission*"
    - "**/Dockerfile"
    - "**/.github/workflows/*"
  keyword_matches:
    - soc2
    - SOC2
    - trust_service
    - access_review
    - change_management
    - approval
    - health_check
    - liveness
    - readiness
    - incident_response
    - pagerduty
    - opsgenie
    - alerting
    - monitoring
    - deploy
    - pipeline
    - separation_of_duties
    - vendor_risk
    - backup
    - recovery
  structural_signals:
    - "CI/CD pipeline configuration file"
    - Deployment or release workflow
    - Role or permission management logic
    - Health check or monitoring endpoint
source:
  origin: file
  path: compliance-soc2.md
  hash: "sha256:e2a1f4d7b101f35eb453ace06f2c35f23c76ec68bbbf9265d77db18bb698af94"
---
# SOC 2 Trust Service Criteria

## When This Activates

Activates when diffs touch deployment pipelines, access control logic, monitoring configuration, incident response handlers, or third-party integrations. SOC 2 audits evaluate controls across five Trust Service Criteria -- Security, Availability, Processing Integrity, Confidentiality, and Privacy. Code-level signals reveal whether these controls are structurally embedded or absent. Missing health checks, unreviewed access, ungated deployments, and absent audit trails are common findings that delay or fail SOC 2 Type II examinations.

**Framework**: AICPA Trust Service Criteria (TSC) 2017, updated 2022.

## Audit Surface

- [ ] User or role management without periodic access review mechanism
- [ ] Deployment pipeline with no approval gate or review step
- [ ] Service with no health check or liveness endpoint
- [ ] Service with no readiness probe or availability monitoring
- [ ] No alerting integration (PagerDuty, OpsGenie, etc.) in error handlers
- [ ] No incident response runbook reference in on-call configuration
- [ ] Sensitive data field without encryption at rest
- [ ] Internal service communication without TLS
- [ ] Third-party SDK or API integrated without vendor assessment reference
- [ ] System access event not logged (login, permission change, data access)
- [ ] Same role can deploy and approve deployments (no separation)
- [ ] No backup configuration or recovery point objective defined
- [ ] No dependency vulnerability scanning in CI pipeline
- [ ] No data retention or disposal policy enforced in code
- [ ] Error responses exposing internal system details

## Detailed Checks

### Access Control and Logical Security (CC6)
<!-- activation: keywords=["role", "permission", "access", "rbac", "authorize", "grant", "revoke", "user_management", "admin", "privilege"] -->

- [ ] **No access review mechanism**: flag role or permission management code that has no periodic review, recertification, or expiry mechanism. SOC 2 CC6.1 requires regular access reviews to ensure users retain only needed access
- [ ] **No least-privilege enforcement**: flag role definitions that grant broad permissions (admin, superuser) as defaults for new users or service accounts. Access must follow least-privilege principles
- [ ] **No access revocation on offboarding**: flag user management code with no deactivation or access revocation path triggered by account status changes. Cross-reference with `sec-secrets-management-and-rotation`
- [ ] **Missing MFA signals**: flag authentication flows for privileged operations that do not enforce or check for multi-factor authentication. CC6.1 expects MFA for administrative and sensitive access

### Change Management (CC8)
<!-- activation: keywords=["deploy", "release", "pipeline", "approval", "review", "merge", "ci", "cd", "workflow", "gate"] -->

- [ ] **No approval gate in deployment pipeline**: flag CI/CD workflows that deploy to production without a review or approval step. SOC 2 CC8.1 requires authorized change management with documented approval
- [ ] **No separation of duties**: flag deployment configurations where the same role or person can both write code and approve/execute production deployments
- [ ] **No rollback mechanism**: flag deployment workflows with no rollback, revert, or canary deployment capability. Change management requires the ability to reverse failed changes
- [ ] **Missing change documentation**: flag deployment scripts that do not reference change tickets, pull request IDs, or release notes. Auditors expect traceability from change to deployment

### Availability Monitoring (A1)
<!-- activation: keywords=["health", "liveness", "readiness", "uptime", "availability", "monitor", "probe", "status", "heartbeat"] -->

- [ ] **No health check endpoint**: flag services deployed without a `/health`, `/healthz`, or liveness probe endpoint. SOC 2 A1.1 requires monitoring of system availability
- [ ] **No readiness probe**: flag services lacking readiness probes in Kubernetes manifests or equivalent load balancer health checks. Services must signal when they are ready to accept traffic
- [ ] **No availability alerting**: flag services with health endpoints but no alerting integration to notify on-call teams of availability degradation

### Incident Response (CC7)
<!-- activation: keywords=["incident", "alert", "pagerduty", "opsgenie", "on_call", "escalation", "runbook", "notify", "critical", "emergency"] -->

- [ ] **No alerting integration**: flag error handlers, critical failure paths, and security event detectors that do not integrate with an alerting system (PagerDuty, OpsGenie, Slack alerts). CC7.3 requires communication of incidents
- [ ] **No incident response reference**: flag on-call or alerting configurations with no reference to incident response runbooks or playbooks. CC7.4 requires documented response procedures
- [ ] **No security event escalation**: flag security-relevant errors (auth failures, access denials, integrity violations) logged without escalation or alerting. Cross-reference with `sec-owasp-a09-logging-monitoring-failures`

### Confidentiality and Encryption (C1, CC6.7)
<!-- activation: keywords=["encrypt", "TLS", "SSL", "secret", "confidential", "sensitive", "http://", "grpc", "internal"] -->

- [ ] **Sensitive data unencrypted at rest**: flag database columns, file storage, or configuration containing sensitive data without encryption. CC6.1 and C1.1 require protection of confidential information
- [ ] **Internal service communication without TLS**: flag service-to-service calls using plain HTTP or unencrypted gRPC. SOC 2 expects encryption in transit for all sensitive data channels, including internal networks
- [ ] **Secrets in source code**: flag hardcoded credentials, API keys, or encryption keys in source. Cross-reference with `sec-secrets-management-and-rotation`

### Vendor and Third-Party Risk (CC9)
<!-- activation: keywords=["vendor", "third_party", "sdk", "integration", "external", "api", "service_provider", "saas"] -->

- [ ] **Third-party integration without risk signal**: flag new third-party SDK or API integrations that have no comment or configuration reference to vendor risk assessment. CC9.2 requires assessment of risks from third-party relationships
- [ ] **No vendor data handling controls**: flag data sent to third-party services without evidence of data handling requirements (encryption, retention limits, access controls) in the integration configuration

## Common False Positives

- **Development environment pipelines**: CI/CD configurations for development or staging environments may legitimately lack production-level approval gates.
- **Internal tooling**: internal developer tools may have simpler access controls appropriate to their risk level.
- **Health check libraries**: frameworks that auto-register health endpoints (Spring Boot Actuator, ASP.NET Health Checks) satisfy the requirement without explicit code.
- **Managed service encryption**: cloud services with default encryption at rest (AWS RDS, GCP Cloud SQL) may not require application-level encryption code.

## Severity Guidance

| Finding | Severity |
|---|---|
| Sensitive data stored or transmitted without encryption | Critical |
| No audit logging for system access events | Critical |
| Deployment pipeline with no approval gate | Important |
| No health check or availability monitoring | Important |
| No incident response alerting integration | Important |
| Same role deploys and approves (no separation) | Important |
| Third-party integration without vendor risk reference | Minor |
| No rollback mechanism in deployment | Minor |
| Missing access review or recertification mechanism | Minor |

## See Also

- `sec-owasp-a09-logging-monitoring-failures` -- audit logging and monitoring overlap with SOC 2 CC7
- `sec-secrets-management-and-rotation` -- credential management aligns with SOC 2 CC6
- `compliance-iso27001` -- ISO 27001 Annex A controls overlap significantly with SOC 2 TSC
- `compliance-pci-dss` -- PCI DSS requirements overlap with SOC 2 for payment-handling organizations
- `principle-fail-fast` -- systems should fail fast and alert rather than silently degrade

## Authoritative References

- [AICPA Trust Service Criteria (2017, updated 2022)](https://www.aicpa.org/resources/deferred-deep-link/trust-services-criteria)
- [SOC 2 Reporting on an Examination of Controls](https://www.aicpa.org/interestareas/frc/assuranceadvisoryservices/sorhome)
- [AICPA Guide: SOC 2 Reporting on Controls at a Service Organization](https://www.aicpa.org/cpe-learning/publication/soc-2-reporting-on-an-examination-of-controls-at-a-service-organization)
