---
id: compliance-privacy
type: index
depth_role: subcategory
depth: 1
focus: "compliance-privacy: Detect consent lifecycle and data retention gaps including no consent record before processing, non-granular consent, no re-consent on purpose change, data retained beyond stated period, no automated retention enforce..."
parents:
  - "../index.md"
shared_covers: []
tags:
  - access-control
  - aicpa
  - analytics
  - annex-a
  - asset-classification
  - audit
  - audit-records
  - audit-trail
  - availability
  - boundary-protection
  - business-continuity
  - caching
  - california-privacy
  - cardholder-data
  - ccpa
  - change-management
  - clinical
  - compliance
  - consent
  - consumer-rights
generator: "skill-llm-wiki/v1"
entries:
  - id: compliance-consent-tracking-and-retention
    file: compliance-consent-tracking-and-retention.md
    type: primary
    focus: Detect consent lifecycle and data retention gaps including no consent record before processing, non-granular consent, no re-consent on purpose change, data retained beyond stated period, no automated retention enforcement, and missing consent withdrawal
    tags:
      - consent
      - retention
      - data-lifecycle
      - privacy
      - gdpr
      - ccpa
      - dark-patterns
      - purpose-limitation
      - right-to-withdraw
      - compliance
      - data-subject-rights
      - right-to-erasure
      - right-to-portability
      - dpia
      - data-protection
      - privacy-by-design
      - pseudonymization
      - audit-trail
      - analytics
      - data-classification
      - cpra
      - california-privacy
      - do-not-sell
      - opt-out
      - sensitive-personal-info
      - consumer-rights
      - TTL
      - GDPR
      - PII
      - data-architecture
      - data-minimization
      - pii
      - overcollection
      - logs
      - caching
  - id: compliance-fedramp-nist-800-53
    file: compliance-fedramp-nist-800-53.md
    type: primary
    focus: Detect FedRAMP and NIST 800-53 compliance gaps including non-FIPS 140-2 cryptography, missing continuous monitoring, boundary protection gaps, absent audit record generation, and MFA not enforced
    tags:
      - fedramp
      - nist-800-53
      - fips-140-2
      - continuous-monitoring
      - boundary-protection
      - audit-records
      - mfa
      - compliance
      - federal
  - id: compliance-hipaa-phi
    file: compliance-hipaa-phi.md
    type: primary
    focus: Detect HIPAA violations including PHI in logs and error output, missing encryption for PHI at rest and in transit, absent access controls for PHI endpoints, PHI in URLs, missing audit trails, and BAA gaps for external services
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
  - id: compliance-iso27001
    file: compliance-iso27001.md
    type: primary
    focus: Detect ISO 27001 Annex A control gaps including missing asset classification, absent access control policy enforcement, missing backup verification, no secure development lifecycle signals, and information leakage channels
    tags:
      - iso27001
      - annex-a
      - isms
      - asset-classification
      - access-control
      - secure-development
      - information-leakage
      - compliance
  - id: compliance-nis2-dora-eu
    file: compliance-nis2-dora-eu.md
    type: primary
    focus: Detect NIS2 Directive and DORA compliance gaps including missing incident reporting hooks, absent supply chain risk assessment signals, business continuity gaps, ICT risk management gaps, and missing resilience testing
    tags:
      - nis2
      - dora
      - eu-regulation
      - incident-reporting
      - supply-chain
      - resilience
      - business-continuity
      - ict-risk
      - compliance
  - id: compliance-pci-dss
    file: compliance-pci-dss.md
    type: primary
    focus: Detect PCI DSS v4.0 violations including cardholder data exposure in code and logs, missing encryption at rest and in transit, insecure key management, absent audit logging for card operations, and prohibited data storage
    tags:
      - pci-dss
      - payment
      - cardholder-data
      - credit-card
      - encryption
      - compliance
      - CWE-311
      - CWE-312
      - CWE-319
  - id: compliance-pii-handling-and-minimization
    file: compliance-pii-handling-and-minimization.md
    type: primary
    focus: Detect PII handling violations including collecting more data than needed, PII in logs and caches, PII not pseudonymized when possible, PII stored without purpose limitation, and PII shared with third parties without controls
    tags:
      - pii
      - data-minimization
      - pseudonymization
      - privacy
      - personal-data
      - logs
      - caching
      - purpose-limitation
      - CWE-532
      - CWE-359
  - id: compliance-soc2
    file: compliance-soc2.md
    type: primary
    focus: Detect SOC 2 Trust Service Criteria gaps including missing access reviews, absent change management process, missing availability monitoring, no incident response hooks, missing encryption, and vendor risk signals
    tags:
      - soc2
      - trust-service-criteria
      - access-control
      - change-management
      - availability
      - incident-response
      - compliance
      - AICPA
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Compliance Privacy

**Focus:** compliance-privacy: Detect consent lifecycle and data retention gaps including no consent record before processing, non-granular consent, no re-consent on purpose change, data retained beyond stated period, no automated retention enforce...

## Children

| File | Type | Focus |
|------|------|-------|
| [compliance-consent-tracking-and-retention.md](compliance-consent-tracking-and-retention.md) | 📄 primary | Detect consent lifecycle and data retention gaps including no consent record before processing, non-granular consent, no re-consent on purpose change, data retained beyond stated period, no automated retention enforcement, and missing consent withdrawal |
| [compliance-fedramp-nist-800-53.md](compliance-fedramp-nist-800-53.md) | 📄 primary | Detect FedRAMP and NIST 800-53 compliance gaps including non-FIPS 140-2 cryptography, missing continuous monitoring, boundary protection gaps, absent audit record generation, and MFA not enforced |
| [compliance-hipaa-phi.md](compliance-hipaa-phi.md) | 📄 primary | Detect HIPAA violations including PHI in logs and error output, missing encryption for PHI at rest and in transit, absent access controls for PHI endpoints, PHI in URLs, missing audit trails, and BAA gaps for external services |
| [compliance-iso27001.md](compliance-iso27001.md) | 📄 primary | Detect ISO 27001 Annex A control gaps including missing asset classification, absent access control policy enforcement, missing backup verification, no secure development lifecycle signals, and information leakage channels |
| [compliance-nis2-dora-eu.md](compliance-nis2-dora-eu.md) | 📄 primary | Detect NIS2 Directive and DORA compliance gaps including missing incident reporting hooks, absent supply chain risk assessment signals, business continuity gaps, ICT risk management gaps, and missing resilience testing |
| [compliance-pci-dss.md](compliance-pci-dss.md) | 📄 primary | Detect PCI DSS v4.0 violations including cardholder data exposure in code and logs, missing encryption at rest and in transit, insecure key management, absent audit logging for card operations, and prohibited data storage |
| [compliance-pii-handling-and-minimization.md](compliance-pii-handling-and-minimization.md) | 📄 primary | Detect PII handling violations including collecting more data than needed, PII in logs and caches, PII not pseudonymized when possible, PII stored without purpose limitation, and PII shared with third parties without controls |
| [compliance-soc2.md](compliance-soc2.md) | 📄 primary | Detect SOC 2 Trust Service Criteria gaps including missing access reviews, absent change management process, missing availability monitoring, no incident response hooks, missing encryption, and vendor risk signals |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
