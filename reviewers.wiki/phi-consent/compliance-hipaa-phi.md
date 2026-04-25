---
id: compliance-hipaa-phi
type: primary
depth_role: leaf
focus: Detect HIPAA violations including PHI in logs and error output, missing encryption for PHI at rest and in transit, absent access controls for PHI endpoints, PHI in URLs, missing audit trails, and BAA gaps for external services
parents:
  - index.md
covers:
  - "Protected Health Information (PHI) logged or written to debug output"
  - "PHI transmitted without encryption (TLS 1.2+)"
  - PHI stored without encryption at rest
  - PHI included in URL query parameters or path segments
  - Missing access controls on endpoints serving PHI
  - Missing audit trail for PHI access, creation, modification, or deletion
  - PHI in error messages or exception output
  - External service integrations processing PHI without BAA reference
  - "PHI in client-side storage (localStorage, cookies without Secure flag)"
  - De-identification not applied when full PHI is unnecessary
  - PHI shared across microservice boundaries without access verification
  - PHI present in log statements, error messages, or URLs
  - FHIR resource accepted without schema or profile validation
  - HL7v2 message parsed without segment or field validation
  - PHI accessed without patient consent verification
  - FHIR search endpoint not scoped by authorization context
  - Missing audit trail for PHI access or modification
  - DICOM metadata leaking patient identifiers
  - Third-party integration missing BAA reference
  - "Clinical code (ICD, SNOMED, LOINC) not validated against terminology server"
  - Patient identifier used as URL path parameter without access check
tags:
  - hipaa
  - phi
  - healthcare
  - protected-health-information
  - encryption
  - audit-trail
  - access-control
  - compliance
  - CWE-312
  - CWE-532
  - fhir
  - hl7
  - healthtech
  - patient
  - clinical
  - dicom
  - ehr
  - audit
  - consent
aliases:
  - domain-healthtech-hl7-fhir-phi
activation:
  file_globs:
    - "**/*patient*"
    - "**/*health*"
    - "**/*medical*"
    - "**/*clinical*"
    - "**/*diagnosis*"
    - "**/*prescription*"
    - "**/*ehr*"
    - "**/*emr*"
    - "**/*hipaa*"
    - "**/*phi*"
    - "**/*fhir*"
    - "**/*hl7*"
  keyword_matches:
    - patient
    - diagnosis
    - prescription
    - medical_record
    - medicalRecord
    - health_record
    - PHI
    - phi
    - hipaa
    - HIPAA
    - protected_health
    - patient_id
    - patientId
    - mrn
    - medical_record_number
    - date_of_birth
    - ssn
    - social_security
    - FHIR
    - HL7
    - ehr
    - emr
  structural_signals:
    - Patient data model or entity definition
    - Healthcare API endpoint or controller
    - FHIR or HL7 message handler
    - Medical record access or query function
source:
  origin: file
  path: compliance-hipaa-phi.md
  hash: "sha256:1a390f4268a8111c6b6851949dcfd4e02fb361468be2e9e33b1dd0a85c396ef6"
---
# HIPAA Protected Health Information

## When This Activates

Activates when diffs touch patient records, healthcare data, medical systems, EHR/EMR integrations, or FHIR/HL7 message handling. HIPAA's Security Rule requires administrative, physical, and technical safeguards for electronic PHI (ePHI). The Privacy Rule limits PHI use and disclosure to the minimum necessary. Code-level violations -- logging PHI, transmitting it unencrypted, exposing it without access controls, or failing to maintain audit trails -- constitute HIPAA non-compliance carrying civil penalties up to $2.1M per violation category per year and potential criminal penalties.

**Primary CWEs**: CWE-312 (Cleartext Storage of Sensitive Information), CWE-532 (Insertion of Sensitive Information into Log File), CWE-862 (Missing Authorization).

## Audit Surface

- [ ] PHI field (name, DOB, SSN, MRN, diagnosis) in log statement
- [ ] PHI transmitted over HTTP instead of HTTPS
- [ ] PHI column in database without encryption at rest
- [ ] PHI value in URL query parameter or path segment
- [ ] API endpoint returning PHI without authentication check
- [ ] API endpoint returning PHI without authorization or role check
- [ ] PHI access with no audit log entry emitted
- [ ] PHI modification or deletion with no audit trail
- [ ] PHI in exception message or error response body
- [ ] Third-party API call sending PHI without BAA comment or reference
- [ ] PHI stored in browser localStorage, sessionStorage, or unencrypted cookie
- [ ] PHI in cache layer (Redis, Memcached) without access controls
- [ ] PHI included in analytics or telemetry payloads
- [ ] Patient identifier in message queue without encryption
- [ ] Bulk PHI export endpoint without additional authorization gate
- [ ] PHI retained beyond minimum necessary period

## Detailed Checks

### PHI in Logs, Errors, and Debug Output (45 CFR 164.312(a))
<!-- activation: keywords=["log", "logger", "print", "console", "debug", "error", "exception", "patient", "diagnosis", "mrn"] -->

- [ ] **PHI in log statements**: flag log calls that interpolate patient names, dates of birth, SSNs, medical record numbers, diagnoses, or any of the 18 HIPAA identifiers. Object serialization of patient models into log output is equally prohibited
- [ ] **PHI in error responses**: flag exception handlers or API error builders that include PHI fields in returned messages. Stack traces referencing patient data must be sanitized before logging or returning
- [ ] **PHI in analytics and telemetry**: flag analytics event payloads or telemetry calls that include PHI fields. User behavior tracking must use de-identified or pseudonymized identifiers. Cross-reference with `sec-owasp-a09-logging-monitoring-failures`

### Encryption at Rest and in Transit (45 CFR 164.312(a)(2)(iv), 164.312(e))
<!-- activation: keywords=["encrypt", "decrypt", "TLS", "SSL", "http://", "storage", "database", "column", "AES"] -->

- [ ] **PHI transmitted without TLS**: flag any endpoint or service call that sends PHI over plain HTTP or uses TLS below 1.2. All ePHI in transit must be encrypted
- [ ] **PHI stored without encryption at rest**: flag database columns or file storage containing PHI without encryption. HIPAA treats encryption at rest as an addressable safeguard -- but failing to implement it requires documented justification of equivalent protection
- [ ] **PHI in client-side storage**: flag code writing PHI to browser localStorage, sessionStorage, or cookies without the Secure and HttpOnly flags. Client-side PHI storage is inherently risky and must be minimized

### Access Controls for PHI Endpoints (45 CFR 164.312(a)(1))
<!-- activation: keywords=["endpoint", "route", "controller", "handler", "patient", "health", "medical", "authorize", "role", "permission"] -->

- [ ] **Missing authentication on PHI endpoints**: flag API routes or controllers that serve PHI data without verifying caller authentication. Every PHI access must validate the requestor's identity
- [ ] **Missing authorization on PHI endpoints**: flag PHI-serving endpoints that check authentication but not role-based or attribute-based authorization. The minimum necessary standard requires verifying the requestor has a legitimate need for the specific PHI requested
- [ ] **Bulk PHI export without extra gate**: flag endpoints that return bulk patient data without additional authorization beyond standard API auth. Bulk exports must require elevated permissions and generate audit events. Cross-reference with `principle-encapsulation`

### PHI in URLs and Query Parameters (45 CFR 164.312(e))
<!-- activation: keywords=["url", "query", "param", "path", "redirect", "href", "GET", "request"] -->

- [ ] **PHI in URL query parameters**: flag patient identifiers, names, SSNs, or diagnosis codes passed as URL query parameters. URLs are logged in web server access logs, browser history, and proxy logs
- [ ] **PHI in URL path segments**: flag URL patterns like `/patients/{ssn}` or `/records/{name}` that embed PHI in the path. Use opaque, non-PHI identifiers for URL routing

### Audit Trail for PHI Access (45 CFR 164.312(b))
<!-- activation: keywords=["audit", "log", "access", "read", "write", "modify", "delete", "patient", "record"] -->

- [ ] **No audit log for PHI reads**: flag functions that retrieve PHI from storage without emitting an audit entry recording who accessed what data, when, and from where. HIPAA requires audit controls for all ePHI access
- [ ] **No audit log for PHI writes**: flag create, update, or delete operations on PHI without audit trail entries. Cross-reference with `sec-owasp-a09-logging-monitoring-failures`
- [ ] **Audit logs containing PHI**: flag audit log entries that include the actual PHI values accessed rather than record identifiers. Audit logs must record access metadata, not duplicate the sensitive data

### External Service Integrations and BAA (45 CFR 164.308(b), 164.314)
<!-- activation: keywords=["api", "service", "third_party", "vendor", "cloud", "aws", "azure", "gcp", "send", "transmit", "integrate"] -->

- [ ] **PHI sent to external service without BAA reference**: flag code that sends PHI to third-party APIs, cloud services, or external processors without a comment or configuration reference indicating a Business Associate Agreement is in place. Every entity receiving PHI must be covered by a BAA
- [ ] **PHI in non-BAA-covered services**: flag PHI routed through services explicitly not covered by BAA (general-purpose analytics, non-HIPAA email providers, consumer cloud storage)

## Common False Positives

- **De-identified data**: data stripped of all 18 HIPAA identifiers per Safe Harbor method is not PHI. Variables named `patient_count` or `diagnosis_code_stats` holding aggregated data are typically de-identified.
- **Internal record IDs**: opaque patient IDs (UUIDs, auto-increment integers) that are not themselves PHI identifiers are acceptable in logs and URLs.
- **FHIR resource type references**: code referencing FHIR resource types (Patient, Observation) as strings for routing does not constitute PHI handling.
- **Test fixtures**: synthetic patient data in test directories with clearly fake values.

## Severity Guidance

| Finding | Severity |
|---|---|
| PHI logged or included in error messages | Critical |
| PHI transmitted without encryption | Critical |
| PHI endpoint missing authentication | Critical |
| PHI stored without encryption at rest | Important |
| PHI in URL query parameters | Important |
| PHI endpoint missing authorization check | Important |
| No audit trail for PHI access or modification | Important |
| PHI sent to external service without BAA reference | Important |
| PHI in client-side storage | Important |
| PHI in analytics or telemetry payloads | Minor |
| Audit log containing actual PHI values | Minor |

## See Also

- `sec-owasp-a09-logging-monitoring-failures` -- sensitive data in logs including PHI
- `sec-secrets-management-and-rotation` -- credentials for healthcare systems
- `compliance-pii-handling-and-minimization` -- PHI is a strict subset of PII with additional protections
- `compliance-gdpr-data-subject-rights` -- overlapping data protection requirements for EU patients
- `principle-encapsulation` -- PHI access should be encapsulated behind dedicated service boundaries
- `principle-fail-fast` -- PHI access should fail fast on missing authorization rather than proceeding

## Authoritative References

- [HIPAA Security Rule - 45 CFR Part 164 Subpart C](https://www.hhs.gov/hipaa/for-professionals/security/)
- [HIPAA Privacy Rule - 45 CFR Part 164 Subpart E](https://www.hhs.gov/hipaa/for-professionals/privacy/)
- [HHS Guidance on HIPAA & Cloud Computing](https://www.hhs.gov/hipaa/for-professionals/special-topics/cloud-computing/)
- [CWE-312: Cleartext Storage of Sensitive Information](https://cwe.mitre.org/data/definitions/312.html)
- [CWE-532: Insertion of Sensitive Information into Log File](https://cwe.mitre.org/data/definitions/532.html)
- [NIST SP 800-66 Rev2 - Implementing the HIPAA Security Rule](https://csrc.nist.gov/publications/detail/sp/800-66/rev-2/final)
