---
id: domain-fintech-fraud-kyc-aml
type: primary
depth_role: leaf
focus: Detect fraud checks ordered after transactions, hardcoded risk thresholds, missing velocity checks, KYC gaps before high-risk operations, excessive PII retention, and absent AML screening
parents:
  - index.md
covers:
  - Fraud check executed after transaction is committed instead of before
  - Risk threshold hardcoded instead of externally configurable
  - Missing velocity check for repeated actions in short time window
  - KYC status not verified before high-risk operation
  - PII stored beyond KYC verification requirements
  - No SAR filing hook when suspicious activity detected
  - "AML/sanctions screening not integrated into onboarding or transaction flow"
  - Missing audit trail for risk decisions
  - Fraud score consumed but fallback on scoring service failure not defined
  - Identity verification result cached without expiration
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
activation:
  file_globs:
    - "**/*fraud*"
    - "**/*kyc*"
    - "**/*aml*"
    - "**/*risk*"
    - "**/*sanction*"
    - "**/*watchlist*"
    - "**/*verification*"
    - "**/*identity*"
    - "**/*velocity*"
    - "**/*suspicious*"
  keyword_matches:
    - fraud
    - KYC
    - AML
    - risk
    - score
    - verification
    - identity
    - sanctions
    - PEP
    - watchlist
    - suspicious
    - threshold
    - velocity
    - SAR
    - risk_score
    - fraud_check
    - onboarding
  structural_signals:
    - Fraud scoring function or risk evaluation handler
    - KYC verification workflow or status check
    - AML screening or watchlist lookup
source:
  origin: file
  path: domain-fintech-fraud-kyc-aml.md
  hash: "sha256:8eb55a210aab4fea4042fe475399b633ec3e2bedeac1deb60c4ce901255a1c58"
---
# Fraud Detection, KYC, and AML Compliance

## When This Activates

Activates when diffs touch fraud scoring, risk evaluation, KYC verification, AML screening, identity checks, sanctions lookups, or velocity limiting in financial applications. Incorrect ordering of fraud checks, hardcoded thresholds, and missing screening steps create regulatory liability, enable financial crime, and expose the organization to enforcement actions.

## Audit Surface

- [ ] Transaction committed to database before fraud scoring completes
- [ ] Risk score threshold hardcoded as magic number in source
- [ ] No velocity check on login, transfer, or account creation
- [ ] High-risk operation proceeds without verifying KYC status
- [ ] PII fields (SSN, passport, DOB) retained after KYC decision is final
- [ ] Suspicious activity detection has no SAR filing trigger or alert
- [ ] AML watchlist or sanctions check absent from onboarding flow
- [ ] Risk decision made with no audit log entry
- [ ] Fraud scoring service failure causes transaction to auto-approve
- [ ] Identity verification result cached indefinitely without re-check
- [ ] PEP screening missing from KYC flow
- [ ] Watchlist matching uses exact string match only (no fuzzy/phonetic)
- [ ] Risk model output not explained or logged for regulatory review
- [ ] Device fingerprint or IP geolocation not collected for risk assessment

## Detailed Checks

### Fraud Check Ordering
<!-- activation: keywords=["fraud", "score", "check", "transaction", "commit", "authorize", "pre-auth", "before", "after", "order"] -->

- [ ] **Fraud check after commit**: transaction is persisted or funds transferred before the fraud scoring service returns a decision -- reversing a committed fraudulent transaction is expensive and may be impossible with external providers
- [ ] **Auto-approve on scorer failure**: when the fraud scoring service is unreachable or times out, the code defaults to approving the transaction -- this should default-deny or queue for manual review. Cross-reference with `principle-fail-fast`
- [ ] **Fraud check result ignored**: the scoring service is called but the response is logged without gating the transaction on the result -- the check is decorative
- [ ] **No async fraud re-evaluation**: transactions approved in real-time are never re-evaluated asynchronously with additional signals -- post-transaction fraud detection is a critical second layer

### Risk Thresholds and Configuration
<!-- activation: keywords=["threshold", "score", "limit", "config", "hardcoded", "magic", "constant", "tunable"] -->

- [ ] **Hardcoded risk threshold**: risk score comparison uses a magic number (`if score > 75`) instead of an externally configurable value -- tuning requires a code deploy, which is too slow for fraud response
- [ ] **Single threshold without tiers**: risk evaluation uses a single approve/deny cutoff instead of tiered actions (approve, step-up verification, manual review, deny) -- this misses the middle ground of suspicious-but-not-blocked
- [ ] **Threshold not environment-specific**: same risk threshold used in test and production -- test values leak to production or production values block all test transactions
- [ ] **No A/B or shadow scoring**: new risk model deployed without shadow mode or A/B comparison against the existing model -- regression in fraud detection goes unnoticed until losses mount

### Velocity and Behavioral Checks
<!-- activation: keywords=["velocity", "rate", "limit", "frequency", "window", "count", "burst", "repeated", "pattern"] -->

- [ ] **No velocity limiting**: repeated actions (transfers, login attempts, account creation) in a short time window have no rate or velocity check -- bots and fraudsters exploit the absence
- [ ] **Velocity check client-side only**: rate limiting enforced in the frontend but not on the server -- attackers bypass it by calling the API directly
- [ ] **Velocity window too large or too small**: a 24-hour window misses burst attacks; a 1-second window misses distributed slow attacks -- multiple window sizes (1min, 1hr, 24hr) should be evaluated
- [ ] **Velocity per-account but not per-device/IP**: velocity check scoped only to user account -- a fraudster using many stolen accounts from the same device or IP evades detection

### KYC Status Enforcement
<!-- activation: keywords=["KYC", "kyc", "verify", "verified", "identity", "onboarding", "status", "tier", "level", "enhanced"] -->

- [ ] **High-risk operation without KYC check**: large transfers, withdrawals, or international payments proceed without verifying the user's KYC status is approved -- regulatory violation and fraud risk
- [ ] **KYC status cached indefinitely**: identity verification result is cached without a re-verification trigger for changed circumstances or regulatory refresh requirements
- [ ] **KYC tier not matched to operation risk**: all users treated equally regardless of verification tier -- enhanced due diligence (EDD) should be required for high-value or high-risk operations
- [ ] **PII retained beyond need**: SSN, passport images, or government ID stored permanently after KYC decision -- data minimization requires deletion or anonymization after the verification purpose is fulfilled. Cross-reference with `compliance-hipaa-phi`

### AML Screening and Sanctions
<!-- activation: keywords=["AML", "aml", "sanctions", "watchlist", "PEP", "pep", "OFAC", "screening", "match", "fuzzy"] -->

- [ ] **No AML screening at onboarding**: user account created without screening against sanctions lists (OFAC SDN, EU sanctions, UN) or PEP databases -- regulatory violation
- [ ] **Exact-match-only watchlist check**: sanctions screening compares exact name strings -- fails to catch transliteration variants, aliases, partial matches, or phonetic similarities (e.g., Muhammad vs. Mohammed)
- [ ] **Screening not repeated on transaction**: AML check performed only at onboarding but not on subsequent high-risk transactions -- sanctions lists are updated frequently
- [ ] **No SAR filing hook**: code detects suspicious activity patterns but has no mechanism to trigger a Suspicious Activity Report (SAR) filing workflow -- regulatory requirement in most jurisdictions

### Audit Trail for Risk Decisions
<!-- activation: keywords=["audit", "log", "trail", "decision", "reason", "explain", "regulatory", "compliance"] -->

- [ ] **Risk decision without audit entry**: fraud score evaluation, KYC decision, or AML screening result not logged with decision rationale, input signals, and timestamp -- regulators require full decision traceability
- [ ] **Model version not recorded**: risk decision logged but without the model version or rule set version that produced it -- post-incident analysis cannot determine which logic was active
- [ ] **No explainability for model decisions**: ML-based risk scoring provides a numeric score with no feature attribution or explanation -- regulatory frameworks increasingly require explainable AI in financial decisions

## Common False Positives

- **Analytics and reporting queries**: code that reads fraud scores or risk decisions for dashboards is not a transaction-gating path. Flag only if the read result feeds into an approve/deny decision.
- **Test/sandbox fraud scoring**: test environments using stubbed fraud services with hardcoded responses are acceptable if clearly gated by environment configuration.
- **Internal admin tools**: admin interfaces displaying KYC status for manual review have different security requirements than automated transaction flows.
- **Configurable thresholds in config files**: thresholds in environment variables, feature flags, or configuration services are not hardcoded even if they appear as constants in the config layer.

## Severity Guidance

| Finding | Severity |
|---|---|
| Transaction committed before fraud check completes | Critical |
| High-risk operation proceeds without KYC verification | Critical |
| AML/sanctions screening absent from onboarding | Critical |
| Auto-approve on fraud scoring service failure | Critical |
| No audit trail for risk decisions | Important |
| Risk threshold hardcoded as magic number | Important |
| No velocity check on repeated financial actions | Important |
| PII retained beyond KYC verification need | Important |
| No SAR filing hook for suspicious activity | Important |
| Watchlist uses exact match only (no fuzzy) | Minor |
| KYC result cached without re-verification trigger | Minor |
| Risk model version not logged with decision | Minor |

## See Also

- `principle-fail-fast` -- fraud scoring failures should fail-deny, not fail-open
- `compliance-pci-dss` -- payment card handling in fraud-checked transaction flows
- `sec-owasp-a01-broken-access-control` -- KYC status as an access control gate
- `reliability-idempotency` -- fraud check must be idempotent under retry
- `compliance-hipaa-phi` -- PII minimization parallels PHI handling requirements
- `principle-separation-of-concerns` -- fraud, KYC, and AML should be separate bounded contexts

## Authoritative References

- [FATF Recommendations on AML/CFT](https://www.fatf-gafi.org/recommendations.html)
- [FinCEN SAR Filing Requirements](https://www.fincen.gov/resources/filing-information)
- [OFAC Sanctions List Search](https://sanctionssearch.ofac.treas.gov/)
- [EU Anti-Money Laundering Directives (AMLD)](https://ec.europa.eu/info/business-economy-euro/banking-and-finance/financial-supervision-and-risk-management/anti-money-laundering-and-countering-financing-terrorism_en)
- [NIST SP 800-63-3: Digital Identity Guidelines](https://pages.nist.gov/800-63-3/)
