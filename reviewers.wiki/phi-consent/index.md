---
id: phi-consent
type: index
depth_role: subcategory
depth: 1
focus: "Ad-tech integration without IAB TCF v2.2 consent string propagation; Analytics / ads / tracking scripts loading before the user grants consent; Audit bypass in admin or system-level code paths; Audit entries missing who (actor), what (action), when (timestamp), or where (resource)"
parents:
  - "../index.md"
shared_covers: []
entries:
  - id: ai-llm-bias-and-privacy-leakage
    file: ai-llm-bias-and-privacy-leakage.md
    type: primary
    focus: Detect PII in training data or prompts, model output containing PII from context, missing content filtering, bias in prompt design, and absent fairness evaluation
    tags:
      - privacy
      - PII
      - bias
      - fairness
      - content-filtering
      - GDPR
      - data-protection
      - ethics
  - id: compliance-consent-tracking-and-retention
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
    file: "../pii-consent/compliance-consent-tracking-and-retention.md"
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
  - id: cookie-consent-tracking-pixel-compliance
    file: cookie-consent-tracking-pixel-compliance.md
    type: primary
    focus: Detect cookie consent and tracking-pixel compliance gaps including tracking scripts loading before consent, missing or asymmetric consent banner, uncategorized consent, ad-tech pixels firing pre-consent, missing IAB TCF v2.2 integration, consent not persisted across loads, and dark-pattern UI
    tags:
      - cookie
      - consent
      - tracking
      - pixel
      - gdpr
      - ccpa
      - cpra
      - eprivacy
      - iab-tcf
      - dark-patterns
      - adtech
  - id: obs-audit-trail
    file: obs-audit-trail.md
    type: primary
    focus: "Detect missing audit logs for data modifications, non-tamper-evident audit storage, incomplete who/what/when/where fields, co-mingled audit and application logs, and retention violations"
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
  - id: sec-threat-modeling-stride-dread-linddun
    file: sec-threat-modeling-stride-dread-linddun.md
    type: primary
    focus: Systematic threat analysis of trust boundary changes, new attack surfaces, and data flow modifications using STRIDE, DREAD, and LINDDUN frameworks
    tags:
      - threat-modeling
      - stride
      - dread
      - linddun
      - trust-boundary
      - attack-surface
      - data-flow
      - privacy
      - escalation-reviewer
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Phi Consent

**Focus:** Ad-tech integration without IAB TCF v2.2 consent string propagation; Analytics / ads / tracking scripts loading before the user grants consent; Audit bypass in admin or system-level code paths; Audit entries missing who (actor), what (action), when (timestamp), or where (resource)

## Children

| File | Type | Focus |
|------|------|-------|
| [ai-llm-bias-and-privacy-leakage.md](ai-llm-bias-and-privacy-leakage.md) | 📄 primary | Detect PII in training data or prompts, model output containing PII from context, missing content filtering, bias in prompt design, and absent fairness evaluation |
| [compliance-hipaa-phi.md](compliance-hipaa-phi.md) | 📄 primary | Detect HIPAA violations including PHI in logs and error output, missing encryption for PHI at rest and in transit, absent access controls for PHI endpoints, PHI in URLs, missing audit trails, and BAA gaps for external services |
| [compliance-iso27001.md](compliance-iso27001.md) | 📄 primary | Detect ISO 27001 Annex A control gaps including missing asset classification, absent access control policy enforcement, missing backup verification, no secure development lifecycle signals, and information leakage channels |
| [compliance-nis2-dora-eu.md](compliance-nis2-dora-eu.md) | 📄 primary | Detect NIS2 Directive and DORA compliance gaps including missing incident reporting hooks, absent supply chain risk assessment signals, business continuity gaps, ICT risk management gaps, and missing resilience testing |
| [compliance-pci-dss.md](compliance-pci-dss.md) | 📄 primary | Detect PCI DSS v4.0 violations including cardholder data exposure in code and logs, missing encryption at rest and in transit, insecure key management, absent audit logging for card operations, and prohibited data storage |
| [cookie-consent-tracking-pixel-compliance.md](cookie-consent-tracking-pixel-compliance.md) | 📄 primary | Detect cookie consent and tracking-pixel compliance gaps including tracking scripts loading before consent, missing or asymmetric consent banner, uncategorized consent, ad-tech pixels firing pre-consent, missing IAB TCF v2.2 integration, consent not persisted across loads, and dark-pattern UI |
| [obs-audit-trail.md](obs-audit-trail.md) | 📄 primary | Detect missing audit logs for data modifications, non-tamper-evident audit storage, incomplete who/what/when/where fields, co-mingled audit and application logs, and retention violations |
| [sec-threat-modeling-stride-dread-linddun.md](sec-threat-modeling-stride-dread-linddun.md) | 📄 primary | Systematic threat analysis of trust boundary changes, new attack surfaces, and data flow modifications using STRIDE, DREAD, and LINDDUN frameworks |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
