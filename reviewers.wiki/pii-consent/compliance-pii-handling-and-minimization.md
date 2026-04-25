---
id: compliance-pii-handling-and-minimization
type: primary
depth_role: leaf
focus: Detect PII handling violations including collecting more data than needed, PII in logs and caches, PII not pseudonymized when possible, PII stored without purpose limitation, and PII shared with third parties without controls
parents:
  - index.md
covers:
  - Collecting more PII than necessary for the stated purpose
  - PII appearing in log output, debug statements, or error messages
  - PII stored in caches or search indices without access controls
  - PII not pseudonymized or anonymized when full identity is unnecessary
  - PII stored without purpose limitation or retention boundary
  - PII shared with third parties without documented controls
  - PII in temporary files, message queues, or intermediate storage
  - PII concatenated into URLs, filenames, or directory paths
  - Email addresses used as primary keys exposing PII in references
  - PII in analytics events or telemetry payloads
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
activation:
  file_globs:
    - "**/*user*"
    - "**/*profile*"
    - "**/*account*"
    - "**/*customer*"
    - "**/*person*"
    - "**/*contact*"
    - "**/*log*"
    - "**/*cache*"
    - "**/*search*"
    - "**/*analytics*"
    - "**/*email*"
  keyword_matches:
    - email
    - phone
    - address
    - ssn
    - social_security
    - date_of_birth
    - dateOfBirth
    - first_name
    - last_name
    - full_name
    - pii
    - PII
    - personal_data
    - personally_identifiable
    - pseudonymize
    - anonymize
    - redact
    - mask
    - sensitive
    - gdpr
    - privacy
  structural_signals:
    - User or customer data model definition
    - Logging statement with user data interpolation
    - Cache write operation with user data
    - Analytics event emission with user properties
source:
  origin: file
  path: compliance-pii-handling-and-minimization.md
  hash: "sha256:1b025d0076de9b7854fe519e5c0d52949ef47570f7dcfae0d62177623527c940"
---
# PII Handling and Minimization

## When This Activates

Activates when diffs touch user data models, logging, caching, search indexing, analytics integration, or third-party data sharing. Data minimization is a foundational principle across privacy regulations (GDPR Art. 5(1)(c), CCPA, HIPAA). Collecting, storing, or processing more PII than necessary increases breach impact, complicates compliance with deletion and portability requests, and expands the attack surface. PII that leaks into logs, caches, search indices, or analytics systems is particularly dangerous because these secondary stores often lack the access controls of the primary data store.

**Primary CWEs**: CWE-532 (Insertion of Sensitive Information into Log File), CWE-359 (Exposure of Private Personal Information).

## Audit Surface

- [ ] Data collection form or API accepting more PII fields than purpose requires
- [ ] PII field (email, name, phone, SSN, DOB, address) in log statement
- [ ] PII in exception message or error response body
- [ ] PII stored in Redis, Memcached, or Elasticsearch without access controls
- [ ] PII in full-text search index without access restriction
- [ ] PII field stored without pseudonymization where aggregation suffices
- [ ] PII column with no retention period or TTL
- [ ] PII sent to third-party API without data processing agreement reference
- [ ] PII in analytics event payload (Mixpanel, Amplitude, Google Analytics)
- [ ] PII in temporary file path or filename
- [ ] PII in message queue payload without encryption
- [ ] Email address used as database primary key or foreign key
- [ ] PII in URL path or query parameter
- [ ] PII displayed in UI without masking when partial display suffices
- [ ] PII in code comments, TODO notes, or documentation examples
- [ ] PII not encrypted in transit between internal services

## Detailed Checks

### Data Minimization at Collection (Purpose Limitation)
<!-- activation: keywords=["form", "input", "field", "collect", "required", "optional", "register", "signup", "onboard", "create_user"] -->

- [ ] **Excessive data collection**: flag registration, onboarding, or profile creation forms that collect PII fields not clearly required for the stated purpose. For example, collecting date of birth for a service that does not require age verification, or collecting phone number when email communication suffices
- [ ] **No purpose annotation on PII fields**: flag PII storage without documentation of why each field is collected and for which processing purpose. Purpose limitation requires each PII element to have a defined justification
- [ ] **Optional PII stored without consent**: flag optional PII fields that are stored regardless of whether the user provided them, creating empty but structured records that suggest an intent to collect later

### PII in Logs, Errors, and Debug Output (CWE-532)
<!-- activation: keywords=["log", "logger", "print", "console", "debug", "error", "exception", "trace", "warn", "info"] -->

- [ ] **PII in log statements**: flag log calls that interpolate email addresses, names, phone numbers, SSNs, dates of birth, or physical addresses. Object serialization that includes PII fields (logging a full user object) is equally problematic
- [ ] **PII in error responses**: flag API error responses or exception messages that include PII. Error messages should reference opaque identifiers, not personal data
- [ ] **PII in stack traces**: flag exception handling that includes PII in stack trace variable captures sent to error tracking services (Sentry, Datadog, Bugsnag). Configure PII scrubbing in error tracking integrations. Cross-reference with `sec-owasp-a09-logging-monitoring-failures`

### PII in Caches and Search Indices
<!-- activation: keywords=["cache", "redis", "memcached", "elasticsearch", "solr", "search", "index", "store", "ttl"] -->

- [ ] **PII in application cache without controls**: flag cache writes (Redis, Memcached) that store PII fields without access controls or encryption. Caches often have weaker security posture than primary databases
- [ ] **PII in search indices**: flag Elasticsearch, Solr, or other search index mappings that include PII fields without field-level access controls. Full-text search indices are frequently accessible to broader audiences than the primary data store
- [ ] **PII in cache without TTL**: flag PII cached without time-to-live settings. Cached PII without TTL persists indefinitely, violating retention minimization principles
- [ ] **PII in temporary storage**: flag PII written to temporary files, /tmp directories, or intermediate processing storage without cleanup mechanisms

### Pseudonymization and Anonymization
<!-- activation: keywords=["pseudonymize", "anonymize", "hash", "token", "mask", "redact", "aggregate", "de_identify", "obfuscate"] -->

- [ ] **PII used directly where pseudonym suffices**: flag code that passes raw PII (email, name) through processing pipelines where a pseudonymous identifier (hashed email, user ID) would serve the same purpose. Analytics, A/B testing, and internal reporting rarely need raw PII
- [ ] **No masking for partial display**: flag UI rendering or API responses that display full PII where partial display suffices (full SSN instead of last 4, full email instead of masked). Cross-reference with `principle-encapsulation`
- [ ] **Email as primary key**: flag database schemas using email addresses as primary keys or foreign keys. This spreads PII into every referencing table, complicates pseudonymization, and makes email changes cascade across the schema

### PII Shared with Third Parties
<!-- activation: keywords=["analytics", "tracking", "mixpanel", "amplitude", "segment", "google_analytics", "api", "webhook", "third_party", "vendor", "send"] -->

- [ ] **PII in analytics payloads**: flag analytics event tracking (Mixpanel, Amplitude, Segment, Google Analytics) that includes PII fields. Analytics should use anonymized or pseudonymized identifiers
- [ ] **PII sent to third parties without DPA**: flag API calls or webhook payloads sending PII to external services without a data processing agreement reference in configuration or comments. Cross-reference with `compliance-gdpr-data-subject-rights`
- [ ] **PII in URLs or query params for third-party calls**: flag PII included in URLs when calling external services. URLs are logged at multiple layers (load balancers, CDNs, third-party access logs)

### PII Retention and Disposal
<!-- activation: keywords=["retention", "ttl", "expire", "purge", "dispose", "delete", "archive", "age_off"] -->

- [ ] **PII without retention boundary**: flag PII columns or documents without retention periods, TTLs, or archival policies. Purpose limitation requires data not be kept longer than necessary
- [ ] **No automated retention enforcement**: flag retention policies documented in comments but not enforced by code (no cron job, no TTL, no automated purge). Cross-reference with `compliance-consent-tracking-and-retention`
- [ ] **PII in long-lived archives**: flag PII included in archives, data warehouse imports, or backup systems without retention limits or anonymization at archival time

## Common False Positives

- **Internal opaque identifiers**: UUIDs, auto-increment IDs, and system-generated tokens that do not constitute PII.
- **Business contact data in B2B contexts**: business email addresses and work phone numbers in CRM systems may have different minimization thresholds.
- **PII in test fixtures**: synthetic or obviously fake PII (jane.doe@example.com, 123-45-6789) in test directories.
- **PII processing services**: services whose explicit purpose is PII management (identity verification, KYC) necessarily handle PII but should still minimize and protect it.

## Severity Guidance

| Finding | Severity |
|---|---|
| PII (SSN, DOB) in log output | Critical |
| PII in analytics payloads sent to third parties | Critical |
| Email or phone number in log statements | Important |
| PII in cache without access controls or TTL | Important |
| PII in search index without access restriction | Important |
| PII sent to third party without DPA reference | Important |
| Excessive PII collection beyond stated purpose | Important |
| Email used as database primary key | Minor |
| PII without retention period | Minor |
| PII in code comments or documentation examples | Minor |

## See Also

- `sec-owasp-a09-logging-monitoring-failures` -- PII in logs is a logging monitoring failure
- `compliance-gdpr-data-subject-rights` -- GDPR data minimization and purpose limitation requirements
- `compliance-hipaa-phi` -- PHI is a regulated subset of PII with additional protections
- `compliance-ccpa-cpra` -- CCPA data inventory and minimization requirements
- `compliance-consent-tracking-and-retention` -- consent and retention overlap with PII handling
- `principle-encapsulation` -- PII access should be encapsulated behind dedicated service boundaries

## Authoritative References

- [CWE-532: Insertion of Sensitive Information into Log File](https://cwe.mitre.org/data/definitions/532.html)
- [CWE-359: Exposure of Private Personal Information](https://cwe.mitre.org/data/definitions/359.html)
- [OWASP Logging Cheat Sheet - PII](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [NIST SP 800-122 - Guide to Protecting the Confidentiality of PII](https://csrc.nist.gov/publications/detail/sp/800-122/final)
- [GDPR Art. 5(1)(c) - Data Minimization Principle](https://gdpr-info.eu/art-5-gdpr/)
