---
id: pii-consent
type: index
depth_role: subcategory
depth: 1
focus: "AML/sanctions screening not integrated into onboarding or transaction flow; API responses returning more fields than the consumer needs; Analytics collecting more granular user data than needed for insights; Analytics events with granular user data beyond aggregate need"
parents:
  - "../index.md"
shared_covers: []
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
  - id: domain-fintech-fraud-kyc-aml
    file: domain-fintech-fraud-kyc-aml.md
    type: primary
    focus: Detect fraud checks ordered after transactions, hardcoded risk thresholds, missing velocity checks, KYC gaps before high-risk operations, excessive PII retention, and absent AML screening
    tags:
      - fraud
      - kyc
      - aml
      - risk
      - sanctions
      - pep
      - velocity
      - identity-verification
      - fintech
      - compliance
  - id: export-control-sanctions-screening
    file: export-control-sanctions-screening.md
    type: primary
    focus: Detect export-control and sanctions screening gaps including missing sanctioned-country blocking, unclassified encryption export, missing denied-party screening, cloud region serving embargoed jurisdictions, absent TSU notification for open-source crypto, stale sanctions lists, and deemed-export access controls
    tags:
      - export-control
      - sanctions
      - ofac
      - ear
      - itar
      - embargo
      - denied-party
      - encryption
      - compliance
      - deemed-export
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Pii Consent

**Focus:** AML/sanctions screening not integrated into onboarding or transaction flow; API responses returning more fields than the consumer needs; Analytics collecting more granular user data than needed for insights; Analytics events with granular user data beyond aggregate need

## Children

| File | Type | Focus |
|------|------|-------|
| [compliance-consent-tracking-and-retention.md](compliance-consent-tracking-and-retention.md) | 📄 primary | Detect consent lifecycle and data retention gaps including no consent record before processing, non-granular consent, no re-consent on purpose change, data retained beyond stated period, no automated retention enforcement, and missing consent withdrawal |
| [compliance-fedramp-nist-800-53.md](compliance-fedramp-nist-800-53.md) | 📄 primary | Detect FedRAMP and NIST 800-53 compliance gaps including non-FIPS 140-2 cryptography, missing continuous monitoring, boundary protection gaps, absent audit record generation, and MFA not enforced |
| [compliance-pii-handling-and-minimization.md](compliance-pii-handling-and-minimization.md) | 📄 primary | Detect PII handling violations including collecting more data than needed, PII in logs and caches, PII not pseudonymized when possible, PII stored without purpose limitation, and PII shared with third parties without controls |
| [domain-fintech-fraud-kyc-aml.md](domain-fintech-fraud-kyc-aml.md) | 📄 primary | Detect fraud checks ordered after transactions, hardcoded risk thresholds, missing velocity checks, KYC gaps before high-risk operations, excessive PII retention, and absent AML screening |
| [export-control-sanctions-screening.md](export-control-sanctions-screening.md) | 📄 primary | Detect export-control and sanctions screening gaps including missing sanctioned-country blocking, unclassified encryption export, missing denied-party screening, cloud region serving embargoed jurisdictions, absent TSU notification for open-source crypto, stale sanctions lists, and deemed-export access controls |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
