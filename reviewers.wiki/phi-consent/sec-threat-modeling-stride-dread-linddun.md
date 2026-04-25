---
id: sec-threat-modeling-stride-dread-linddun
type: primary
depth_role: leaf
focus: Systematic threat analysis of trust boundary changes, new attack surfaces, and data flow modifications using STRIDE, DREAD, and LINDDUN frameworks
parents:
  - index.md
covers:
  - New trust boundaries introduced by new API endpoints or service-to-service communication
  - Changes to authentication or authorization boundaries
  - New data flows crossing network boundaries
  - New user-facing input surfaces
  - "Changes to data classification (PII handling, payment processing)"
  - New third-party integrations introducing external trust dependencies
  - Infrastructure changes that alter the threat surface
  - "STRIDE analysis: spoofing, tampering, repudiation, information disclosure, denial of service, elevation of privilege"
  - "DREAD scoring: damage, reproducibility, exploitability, affected users, discoverability"
  - "LINDDUN analysis: linkability, identifiability, non-repudiation, detectability, disclosure, unawareness, non-compliance"
  - Threat model documentation gaps for security-critical changes
  - Missing security controls at newly introduced trust boundaries
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
activation:
  escalation_from:
    - sec-owasp-a01-broken-access-control
    - sec-owasp-a04-insecure-design
    - sec-owasp-a05-misconfiguration
  keyword_matches:
    - trust
    - boundary
    - threat
    - risk
    - STRIDE
    - DREAD
    - spoofing
    - tampering
    - repudiation
    - disclosure
    - denial
    - elevation
    - privacy
    - LINDDUN
    - threat model
    - attack surface
    - data flow
    - PII
    - sensitive
  structural_signals:
    - New API endpoint or route definition
    - New service client or integration class
    - Authentication or authorization middleware change
    - Data model change adding PII or sensitive fields
    - Infrastructure or deployment topology change
    - New external dependency introducing trust relationship
source:
  origin: file
  path: sec-threat-modeling-stride-dread-linddun.md
  hash: "sha256:413fc6a3190232d8a206c46bff78b44602d511ea8c8ec45b380c147220bc7d7f"
---
# Threat Modeling: STRIDE, DREAD, and LINDDUN

## When This Activates

This is a **tier 3 escalation-only reviewer** -- it activates when other security reviewers (`sec-owasp-a01-broken-access-control`, `sec-owasp-a04-insecure-design`, `sec-owasp-a05-misconfiguration`) detect changes that introduce or modify trust boundaries. It provides systematic threat analysis rather than checking for specific vulnerability patterns. When a diff introduces a new API endpoint, changes authentication flows, adds external integrations, or modifies data flows carrying sensitive information, this reviewer applies STRIDE, DREAD, and LINDDUN frameworks to ensure all threat categories have been considered and mitigated.

This reviewer does not map to specific CWEs because it operates at the design and architecture level. Its purpose is to ensure that threat analysis was performed, not to detect specific implementation flaws.

## Audit Surface

- [ ] New API endpoint exposing functionality not previously accessible over the network
- [ ] New service-to-service communication channel (REST, gRPC, message queue, event bus)
- [ ] New external integration (third-party API, OAuth provider, payment gateway, webhook)
- [ ] Authentication boundary change (new auth method, SSO integration, API key scheme)
- [ ] Authorization model change (new roles, permissions, access control rules)
- [ ] New data flow carrying PII, credentials, financial data, or health records
- [ ] New user input surface (form, file upload, API parameter, webhook receiver)
- [ ] Data classification change (field newly storing PII, payment card, or health data)
- [ ] Network boundary change (new public endpoint, VPN bypass, DMZ modification)
- [ ] New administrative or management interface
- [ ] Infrastructure change (new cloud service, database, storage bucket, queue)
- [ ] New cryptographic operation (signing, encryption, token generation)
- [ ] Removal of security control (rate limit, validation, auth check)
- [ ] Cross-origin or cross-tenant data access pattern
- [ ] New background job or scheduled task with elevated privileges
- [ ] Data retention or deletion logic change
- [ ] New logging or audit trail for sensitive operations
- [ ] Multi-tenancy boundary change or new shared resource

## Detailed Checks

### Trust Boundary Identification
<!-- activation: keywords=["endpoint", "route", "controller", "handler", "service", "client", "integration", "gateway", "proxy", "boundary", "external", "internal", "public", "private", "DMZ", "network"] -->

- [ ] **New trust boundary**: identify every new trust boundary in the diff. A trust boundary exists wherever data crosses between different trust levels -- user to server, server to database, service to service, internal to external, tenant A to tenant B. Each boundary requires authentication, authorization, input validation, and output encoding appropriate to the trust delta
- [ ] **Trust boundary classification**: for each identified boundary, classify the trust relationship: (1) untrusted external to trusted internal (highest risk -- internet-facing), (2) trusted internal to trusted internal with different privilege levels (medium risk -- lateral movement), (3) trusted internal to external third-party (medium risk -- data exfiltration, credential exposure), (4) same trust level (lowest risk -- but verify)
- [ ] **Missing boundary controls**: for each trust boundary, verify that all four boundary controls are present: authentication (who is calling?), authorization (are they allowed?), input validation (is the data well-formed and within bounds?), and output filtering (does the response leak internal details?). A boundary missing any control is a finding
- [ ] **Removed or weakened boundary**: flag changes that remove authentication checks, bypass authorization, disable input validation, or merge previously separated trust zones. Removing a boundary control is higher risk than adding a new boundary because it affects existing functionality

### STRIDE Analysis
<!-- activation: keywords=["spoof", "tamper", "repudiat", "disclose", "denial", "elevat", "impersonat", "forge", "inject", "escalat", "privilege", "audit", "log", "trace", "integrity", "confidential", "available"] -->

For each new trust boundary or modified data flow, systematically evaluate all six STRIDE threat categories:

- [ ] **Spoofing (Authentication)**: can an attacker impersonate a legitimate user, service, or component at this boundary? Check for: missing authentication, weak authentication (API key without rotation, basic auth over HTTP), no mutual TLS for service-to-service, spoofable identifiers (IP address, user-agent, client-provided tenant ID). Mitigation: strong authentication (OAuth 2.0, mTLS, signed tokens) at every trust boundary
- [ ] **Tampering (Integrity)**: can an attacker modify data in transit or at rest at this boundary? Check for: unencrypted channels (HTTP, unencrypted message queues), missing message signing (HMAC, digital signature), no integrity checks on uploaded files, mutable references (git tags, Docker tags). Mitigation: TLS for transit, signatures for messages, checksums for files, immutable references
- [ ] **Repudiation (Audit)**: can an actor deny performing an action at this boundary? Check for: missing audit logging for state-changing operations, logs that do not capture actor identity (who), action (what), target (on what), timestamp (when), and outcome (success/failure). Mitigation: comprehensive audit logging at trust boundaries, tamper-evident log storage, non-repudiation via digital signatures for critical operations
- [ ] **Information Disclosure (Confidentiality)**: can an attacker learn information they should not at this boundary? Check for: verbose error messages revealing internals, API responses including fields the caller should not see (other tenants' data, internal IDs), logging sensitive data, unencrypted storage of sensitive fields. Mitigation: field-level access control, response filtering, encryption at rest, log redaction
- [ ] **Denial of Service (Availability)**: can an attacker exhaust resources at this boundary? Check for: missing rate limiting, unbounded queries, no circuit breaker on external dependencies, no timeout on synchronous calls, amplification vectors (one request triggers N downstream requests). Mitigation: rate limiting, pagination, timeouts, circuit breakers, backpressure
- [ ] **Elevation of Privilege (Authorization)**: can an attacker gain higher privileges than intended at this boundary? Check for: missing authorization checks (endpoint accessible to any authenticated user), horizontal privilege escalation (user A accessing user B's data), vertical privilege escalation (regular user accessing admin functions), privilege confusion in multi-tenant systems. Mitigation: RBAC/ABAC at every endpoint, tenant isolation, principle of least privilege

### DREAD Risk Scoring
<!-- activation: keywords=["risk", "score", "severity", "impact", "likelihood", "damage", "reproduce", "exploit", "affect", "discover", "assess", "prioritize", "triage"] -->

For each identified threat, assign a DREAD score (1-10 for each dimension) to prioritize remediation:

- [ ] **Damage Potential**: what is the worst-case impact if this threat is realized? Score 10 for: full system compromise, all customer data exfiltrated, financial fraud. Score 5 for: single user's data exposed, limited service disruption. Score 1 for: minimal impact, cosmetic issue
- [ ] **Reproducibility**: how reliably can an attacker exploit this? Score 10 for: every time, no special conditions needed. Score 5 for: requires specific timing or race condition. Score 1 for: requires physical access or extremely unlikely conditions
- [ ] **Exploitability**: what skill and tools are needed? Score 10 for: trivial, can be done with a browser or curl. Score 5 for: requires custom tooling or moderate expertise. Score 1 for: requires deep expertise, zero-day, or insider access
- [ ] **Affected Users**: how many users are impacted? Score 10 for: all users. Score 5 for: subset of users (one tenant, one region). Score 1 for: single user under specific conditions
- [ ] **Discoverability**: how easy is it for an attacker to find this vulnerability? Score 10 for: publicly accessible, obvious from API docs or source code. Score 5 for: requires authenticated access or probing. Score 1 for: requires insider knowledge or source code access

### LINDDUN Privacy Analysis
<!-- activation: keywords=["privacy", "PII", "personal", "GDPR", "CCPA", "consent", "data subject", "anonymize", "pseudonymize", "retain", "delete", "right to", "data protection", "linkab", "identif", "detect", "unawar", "comply", "non-compliance"] -->

For data flows involving personal information, apply LINDDUN privacy threat categories:

- [ ] **Linkability**: can an attacker link records across datasets to build a profile? Check for: correlation keys (email, phone, IP) shared across services without pseudonymization, analytics events linkable to user identity, access logs with user-identifiable information
- [ ] **Identifiability**: can an attacker identify a specific individual from the data? Check for: PII stored without pseudonymization, insufficient anonymization (k-anonymity < 5), quasi-identifiers (zip code + birth date + gender) that enable re-identification
- [ ] **Non-repudiation (privacy threat)**: can the system prove a user performed an action against their interest? Check for: overly detailed activity logging that creates surveillance risk, inability for users to contest automated decisions, no mechanism for users to dispute actions attributed to them
- [ ] **Detectability**: can an attacker detect whether a record exists? Check for: timing side channels revealing record existence, different error messages for existing vs. non-existing users, API responses that confirm data presence (even without revealing content)
- [ ] **Disclosure of Information**: can personal data be exposed to unauthorized parties? Check for: API responses leaking other users' PII, logs containing personal data shipped to third-party analytics, backups stored without encryption, personal data in error tracking systems (Sentry, Bugsnag)
- [ ] **Unawareness**: are data subjects unaware of data collection or processing? Check for: missing privacy notice for new data collection, no consent mechanism for new processing purpose, personal data collected without user knowledge (tracking pixels, fingerprinting, hidden fields)
- [ ] **Non-compliance**: does the processing violate privacy regulations? Check for: missing data processing agreement with new third-party processors, personal data transferred across jurisdictions without adequacy decision or SCCs, no data retention policy for new data store, missing data subject access request (DSAR) support for new data

### Data Flow Analysis
<!-- activation: keywords=["flow", "data", "transfer", "send", "receive", "store", "persist", "cache", "queue", "event", "message", "stream", "pipe", "forward", "proxy", "route"] -->

- [ ] **New sensitive data flow mapping**: for each new data flow identified in the diff, document: source (where data originates), destination (where it goes), classification (PII, financial, health, credential), transport (HTTPS, gRPC, message queue), and protection (encryption, access control). A data flow carrying sensitive data without documented protections is a finding
- [ ] **Data flow crossing jurisdictions**: flag data flows that transfer personal data across geographic jurisdictions (EU to US, China to external). Cross-jurisdiction transfers require legal basis (adequacy decision, Standard Contractual Clauses, Binding Corporate Rules) and may require data localization
- [ ] **New data at rest**: flag new data stores (database tables, cache entries, files, object storage) containing sensitive data without documented encryption-at-rest, access controls, retention policy, and backup protection
- [ ] **Data flow to third parties**: flag new data flows to third-party services (analytics, monitoring, error tracking, payment processors). Each third party increases the attack surface and requires a data processing agreement if personal data is involved
- [ ] **Sensitive data in derived stores**: flag sensitive data replicated into search indexes, caches, analytics warehouses, or log aggregators without the same access controls as the source. Derived stores often have broader access and weaker protection than the primary store

### Architecture-Level Threat Surface
<!-- activation: keywords=["architecture", "design", "service", "microservice", "monolith", "module", "component", "deploy", "infrastructure", "cloud", "network", "topology", "multi-tenant", "shared"] -->

- [ ] **New external dependency**: flag new third-party service integrations (payment gateways, identity providers, CDNs, SaaS APIs). Each external dependency introduces a trust relationship: the third party can be compromised, can be unavailable, and can change behavior. Document the trust assumptions, failure modes, and blast radius
- [ ] **Multi-tenancy boundary change**: flag changes that affect tenant isolation -- shared databases without row-level security, shared caches without tenant-scoped keys, shared queues without tenant-scoped subscriptions. A multi-tenancy breach affects all tenants simultaneously
- [ ] **Privilege escalation path**: flag new code paths where a lower-privileged component can invoke a higher-privileged operation. Map the privilege hierarchy and verify that each transition requires explicit authorization. Background jobs and scheduled tasks running with elevated privileges are common escalation vectors
- [ ] **Single point of failure for security**: flag security controls (authentication, authorization, encryption) implemented in a single location without redundancy. If the single control is bypassed (misconfigured reverse proxy, alternative code path, direct database access), all protection is lost. Defense in depth requires multiple layers
- [ ] **Blast radius of compromise**: assess what an attacker gains if this specific component is compromised. Can they pivot to other services? Do they gain access to all tenants? Can they access the secrets manager? Design for minimal blast radius: scoped credentials, network segmentation, principle of least privilege

## Common False Positives

- **Internal refactoring without boundary change**: moving code between files or renaming modules does not create new trust boundaries if the data flow and access pattern remain identical. Verify the refactoring does not expose previously internal interfaces.
- **Read-only endpoints for public data**: new endpoints that serve already-public data (product catalog, documentation, status page) have a different threat profile than endpoints handling sensitive data. STRIDE analysis is still valuable but findings will be lower severity.
- **Infrastructure-as-Code dry runs**: changes to Terraform, CloudFormation, or Kubernetes manifests that have not been applied do not yet alter the threat surface. However, review them before application since they will alter it.
- **Test environment changes**: changes scoped to test/development environments with synthetic data have lower threat impact. Flag only if the test environment mirrors production topology and could be confused with production.
- **Documentation-only threat model updates**: updates to threat model documents, ADRs, or security design docs are positive signals, not findings. They indicate threat modeling is being practiced.

## Severity Guidance

| Finding | Severity |
|---|---|
| New internet-facing endpoint with no authentication or authorization | Critical |
| Multi-tenancy boundary breach (tenant A can access tenant B data) | Critical |
| Removal of authentication or authorization check on existing endpoint | Critical |
| New data flow sending unencrypted PII to third-party service | Critical |
| New trust boundary missing two or more boundary controls (auth, authz, validation, filtering) | Critical |
| STRIDE: Elevation of Privilege path from regular user to admin | Critical |
| New external integration storing credentials without encryption | Important |
| New data flow crossing jurisdictions without documented legal basis | Important |
| STRIDE: Information Disclosure via verbose error messages at new boundary | Important |
| STRIDE: Denial of Service vector at new endpoint without rate limiting | Important |
| New sensitive data store without encryption-at-rest | Important |
| LINDDUN: Personal data collected without privacy notice or consent | Important |
| Audit logging absent for state-changing operations at new boundary | Important |
| New trust boundary missing one boundary control | Important |
| STRIDE: Repudiation risk from insufficient audit logging | Minor |
| LINDDUN: Linkability risk from shared identifiers across services | Minor |
| DREAD score below 15/50 for identified threat | Minor |
| Missing threat model documentation for low-risk change | Minor |

## See Also

- `sec-owasp-a01-broken-access-control` -- broken access control findings often trigger escalation to this threat modeling reviewer
- `sec-owasp-a04-insecure-design` -- insecure design is the category most closely aligned with threat modeling gaps
- `sec-owasp-a05-misconfiguration` -- misconfiguration at trust boundaries is a common finding from STRIDE analysis
- `principle-encapsulation` -- proper encapsulation of trust boundaries reduces the threat surface
- `principle-fail-fast` -- security controls at trust boundaries should fail closed, not open

## Authoritative References

- [OWASP Threat Modeling Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html)
- [Microsoft STRIDE Threat Model](https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats)
- [DREAD Risk Assessment Model](https://learn.microsoft.com/en-us/archive/blogs/david_leblanc/dreadful)
- [LINDDUN Privacy Threat Modeling Framework](https://linddun.org/)
- [OWASP Threat Modeling Process](https://owasp.org/www-community/Threat_Modeling_Process)
- [NIST SP 800-154: Guide to Data-Centric System Threat Modeling](https://csrc.nist.gov/publications/detail/sp/800-154/draft)
- [Threat Modeling: Designing for Security (Adam Shostack)](https://shostack.org/books/threat-modeling-book)
- [OWASP Application Security Verification Standard (ASVS)](https://owasp.org/www-project-application-security-verification-standard/)
