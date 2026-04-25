---
id: compliance-consent-tracking-and-retention
type: primary
depth_role: leaf
focus: Detect consent lifecycle and data retention gaps including no consent record before processing, non-granular consent, no re-consent on purpose change, data retained beyond stated period, no automated retention enforcement, and missing consent withdrawal
parents:
  - index.md
  - "../phi-consent/index.md"
covers:
  - Data processing proceeds without checking consent record
  - Consent stored as single boolean without per-purpose granularity
  - No re-consent mechanism when processing purpose changes
  - Data retained beyond the stated or legally required period
  - No automated enforcement of retention policies
  - Missing consent withdrawal mechanism
  - Consent timestamp and version not recorded
  - "Pre-checked consent boxes or bundled consent (dark patterns)"
  - No consent audit trail for compliance evidence
  - "Minor's consent handled without age-appropriate verification"
  - No data deletion or erasure capability for personal data
  - Personal data processed without recorded consent or legal basis
  - Missing data portability export in machine-readable format
  - Cross-border data transfer without adequacy decision or safeguards
  - Right to rectification not supported in data models
  - Data processing without DPIA when processing high-risk data
  - No mechanism to restrict processing upon data subject request
  - Personal data retained without defined retention period
  - Privacy by design not reflected in data model architecture
  - "Data subject access request (DSAR) not implementable from code"
  - Personal data collected without documented purpose or legal basis
  - PII not pseudonymized where pseudonymous identifiers would suffice
  - Data retained beyond the period necessary for the stated purpose
  - Missing audit trail for access to personal data
  - Third-party data sharing without user consent or DPA
  - Analytics collecting more granular user data than needed for insights
  - No data classification applied to new data stores or fields
  - Privacy controls absent from design phase — bolted on after implementation
  - Missing privacy impact assessment for new data processing
  - No opt-out mechanism for sale or sharing of personal information
  - Personal information sold or shared without disclosure
  - No Do Not Sell My Personal Information link or API support
  - Sensitive personal information processed without explicit consent
  - Missing data inventory for personal information categories
  - Service providers processing data beyond contractual purpose
  - No consumer right-to-know or access endpoint
  - No consumer right-to-delete implementation
  - Financial incentive for data sharing without opt-in notice
  - "Minor's data (under 16) processed without affirmative authorization"
  - Data store with no TTL, expiry, or retention policy configured
  - PII or personal data retained indefinitely with no documented retention period
  - "No technical capability to delete a specific user's data across all stores"
  - "Audit trail or log retention not configured (kept forever or purged too early)"
  - Soft-delete without eventual hard delete leaving PII in database indefinitely
  - Backups containing PII with no expiry aligned to retention policy
  - PII propagated to analytics, caches, or search indexes without deletion path
  - Missing data classification on columns or fields containing personal data
  - "Derived data (embeddings, aggregates) from PII with no deletion consideration"
  - Collecting data fields not needed for the stated purpose
  - Storing full objects or documents when only identifiers are needed
  - Logs containing unnecessary PII or sensitive data
  - Cache keys containing personal data that could use opaque identifiers
  - Analytics events with granular user data beyond aggregate need
  - Backup or archive retention exceeding regulatory or business requirement
  - API responses returning more fields than the consumer needs
  - Database columns collecting optional data with no documented use
  - Session storage or cookies containing unnecessary personal data
  - Message queue payloads carrying full user objects instead of references
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
aliases:
  - compliance-gdpr-data-subject-rights
  - qa-privacy-by-design
  - compliance-ccpa-cpra
  - data-retention-and-gdpr
  - qa-data-minimization
activation:
  file_globs:
    - "**/*consent*"
    - "**/*retention*"
    - "**/*ttl*"
    - "**/*purge*"
    - "**/*expire*"
    - "**/*privacy*"
    - "**/*preference*"
    - "**/*opt_in*"
    - "**/*optin*"
    - "**/*terms*"
    - "**/*gdpr*"
  keyword_matches:
    - consent
    - retention
    - purge
    - expire
    - ttl
    - opt_in
    - optIn
    - opt_out
    - optOut
    - withdraw
    - revoke
    - agree
    - accept
    - terms
    - privacy_policy
    - purpose
    - data_retention
    - retention_period
    - retention_policy
    - consent_version
    - re_consent
  structural_signals:
    - Consent model or preference storage
    - Data retention or purge job configuration
    - Privacy preference management endpoint
    - Terms acceptance or opt-in flow
source:
  origin: file
  path: compliance-consent-tracking-and-retention.md
  hash: "sha256:83a8d2414d9422d800053656c410ce39e74cff04525dd4962b045b0ec1a82ada"
---
# Consent Tracking and Retention

## When This Activates

Activates when diffs touch consent management, privacy preferences, data retention configuration, purge jobs, opt-in/opt-out flows, or terms acceptance logic. Valid consent is the gateway to lawful data processing under GDPR (Art. 6-7), and retention limits are required by multiple frameworks (GDPR Art. 5(1)(e), CCPA, HIPAA). Consent that is not granular, versioned, and withdrawable is legally defective. Retention policies documented but not enforced in code are audit failures. These gaps affect every compliance framework simultaneously -- fixing them is high-leverage work.

**Key Requirements**: GDPR Art. 6-7 (Consent), Art. 5(1)(e) (Storage Limitation), Art. 21 (Right to Object), ePrivacy Directive Art. 5(3).

## Audit Surface

- [ ] Data processing function with no consent status check
- [ ] Consent model as single boolean field (agreed_to_terms)
- [ ] No consent version or timestamp recorded with consent grant
- [ ] Processing purpose change with no re-consent trigger
- [ ] Data table with no retention TTL, expiry column, or purge job
- [ ] No automated data deletion job or retention enforcement cron
- [ ] No consent withdrawal endpoint or revocation method
- [ ] Pre-checked consent checkbox in UI code
- [ ] Consent bundled with terms of service (no separate opt-in)
- [ ] No consent audit log recording grant, withdrawal, and changes
- [ ] Consent not checked per purpose (marketing, analytics, sharing)
- [ ] Minor's data collected without age verification gate
- [ ] Retention policy documented in comments but not enforced in code
- [ ] Data archive or warehouse without retention boundary
- [ ] Consent preference not propagated to downstream processors

## Detailed Checks

### Consent Before Processing (GDPR Art. 6-7)
<!-- activation: keywords=["consent", "check", "process", "collect", "store", "analyze", "share", "marketing", "analytics", "track"] -->

- [ ] **Processing without consent check**: flag data processing functions (storage, analysis, sharing, marketing) that proceed without verifying the data subject's consent status. Every processing operation that relies on consent as its legal basis must gate on a consent check
- [ ] **No consent record linked to data**: flag personal data storage without a foreign key or reference to a consent record. Consent must be demonstrable -- the controller must prove consent was given for the specific processing
- [ ] **Consent assumed from inaction**: flag consent logic that treats lack of explicit refusal as consent. GDPR requires affirmative action -- silence, pre-ticked boxes, or inactivity do not constitute consent
- [ ] **Pre-checked consent boxes**: flag UI code with consent checkboxes defaulting to checked state. This is a dark pattern that invalidates consent under GDPR Art. 7 and CPRA

### Granular and Purpose-Specific Consent (GDPR Art. 6(1)(a))
<!-- activation: keywords=["purpose", "granular", "marketing", "analytics", "sharing", "profiling", "newsletter", "third_party", "boolean", "agreed"] -->

- [ ] **Single boolean consent**: flag consent stored as a single `agreed_to_terms` or `consented` boolean without per-purpose breakdown. Consent must be granular -- separate for marketing, analytics, third-party sharing, profiling, and other distinct purposes. Cross-reference with `compliance-gdpr-data-subject-rights`
- [ ] **Consent bundled with ToS**: flag consent for data processing bundled into terms of service acceptance without separate, specific consent for each processing purpose. GDPR Art. 7(2) requires consent requests distinguishable from other matters
- [ ] **No purpose recorded with consent**: flag consent grants that do not record which specific processing purposes the consent covers. Without purpose linkage, consent cannot be verified against specific processing activities

### Consent Versioning and Re-consent (GDPR Art. 7)
<!-- activation: keywords=["version", "timestamp", "update", "change", "re_consent", "reconsent", "policy_change", "privacy_update"] -->

- [ ] **No consent timestamp**: flag consent records without timestamps recording when consent was given. Consent must be provable at a specific point in time
- [ ] **No consent version tracking**: flag consent grants without reference to the version of the privacy policy or processing description the data subject agreed to. When purposes change, old consent may not cover new processing
- [ ] **No re-consent on purpose change**: flag privacy policy or processing purpose changes that do not trigger re-consent for affected data subjects. Material changes to processing require new consent

### Consent Withdrawal (GDPR Art. 7(3))
<!-- activation: keywords=["withdraw", "revoke", "unsubscribe", "opt_out", "cancel", "remove_consent", "delete_consent"] -->

- [ ] **No withdrawal mechanism**: flag consent collection without a corresponding withdrawal endpoint, button, or API method. Art. 7(3) requires withdrawal to be as easy as giving consent
- [ ] **Withdrawal not stopping processing**: flag consent withdrawal handlers that update the consent record but do not halt ongoing processing activities that depend on that consent
- [ ] **No withdrawal propagation**: flag consent withdrawal that updates the local system but does not propagate to downstream processors, third parties, or integrated services that received data under the now-withdrawn consent. Cross-reference with `compliance-ccpa-cpra`

### Automated Retention Enforcement (GDPR Art. 5(1)(e))
<!-- activation: keywords=["retention", "ttl", "expire", "purge", "delete", "archive", "cron", "scheduler", "cleanup", "age_off"] -->

- [ ] **No retention boundary on data**: flag personal data tables or document stores without retention periods, TTL fields, expiry columns, or references to purge schedules. Storage limitation requires data not kept longer than necessary
- [ ] **Retention policy without enforcement code**: flag retention periods documented in comments, READMEs, or configuration files without corresponding automated enforcement (cron jobs, TTL mechanisms, scheduled purge tasks). Documented intent without implementation fails audits
- [ ] **No retention on archives**: flag data warehouses, analytics stores, or backup archives receiving personal data without retention boundaries. Archives are often forgotten in retention planning. Cross-reference with `compliance-pii-handling-and-minimization`
- [ ] **Inconsistent retention across stores**: flag personal data replicated across multiple stores (primary DB, cache, search index, warehouse) with different or absent retention policies for each

### Consent Audit Trail
<!-- activation: keywords=["audit", "log", "trail", "record", "evidence", "compliance", "demonstrate", "prove"] -->

- [ ] **No consent change logging**: flag consent management code that does not emit audit log entries for consent grants, withdrawals, and modifications. Controllers must be able to demonstrate consent at any point
- [ ] **No consent evidence for regulators**: flag consent systems without the ability to produce a report showing: who consented, when, to what purposes, via what version of the notice, and when (if ever) they withdrew. Cross-reference with `sec-owasp-a09-logging-monitoring-failures`

## Common False Positives

- **Legitimate interest processing**: not all processing requires consent. Processing under legitimate interest (GDPR Art. 6(1)(f)) needs a balancing test but not a consent record.
- **Contractual necessity**: processing necessary for contract performance (Art. 6(1)(b)) does not require separate consent.
- **Cookie consent platforms**: third-party consent management platforms (OneTrust, CookieBot) may handle granularity externally.
- **Legal holds**: data under legal hold may legitimately exceed normal retention periods.
- **Regulatory retention**: financial records, tax data, and healthcare records have mandatory minimum retention periods that override standard retention policies.

## Severity Guidance

| Finding | Severity |
|---|---|
| Data processing without consent check | Critical |
| Pre-checked consent boxes (dark pattern) | Critical |
| No consent withdrawal mechanism | Critical |
| Consent as single boolean without granularity | Important |
| No automated retention enforcement | Important |
| No consent timestamp or version tracking | Important |
| No re-consent on purpose change | Important |
| Retention policy documented but not enforced | Important |
| No consent audit trail | Minor |
| Consent not propagated to downstream processors | Minor |

## See Also

- `compliance-gdpr-data-subject-rights` -- consent is a legal basis for processing under GDPR
- `compliance-ccpa-cpra` -- CCPA opt-out and consent requirements
- `compliance-pii-handling-and-minimization` -- retention and minimization are complementary controls
- `compliance-hipaa-phi` -- HIPAA authorization is analogous to consent for health data
- `sec-owasp-a09-logging-monitoring-failures` -- consent audit trails require robust logging
- `principle-fail-fast` -- processing should fail fast on missing consent rather than proceeding

## Authoritative References

- [GDPR Art. 6 - Lawfulness of Processing](https://gdpr-info.eu/art-6-gdpr/)
- [GDPR Art. 7 - Conditions for Consent](https://gdpr-info.eu/art-7-gdpr/)
- [GDPR Art. 5(1)(e) - Storage Limitation](https://gdpr-info.eu/art-5-gdpr/)
- [EDPB Guidelines 05/2020 on Consent](https://edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-052020-consent-under-regulation-2016679_en)
- [ICO Guide to Lawful Basis for Processing - Consent](https://ico.org.uk/for-organisations/guide-to-data-protection/guide-to-the-general-data-protection-regulation-gdpr/lawful-basis-for-processing/consent/)
- [ePrivacy Directive Art. 5(3)](https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX%3A32002L0058)
