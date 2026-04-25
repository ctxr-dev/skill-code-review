---
id: compliance-nis2-dora-eu
type: primary
depth_role: leaf
focus: Detect NIS2 Directive and DORA compliance gaps including missing incident reporting hooks, absent supply chain risk assessment signals, business continuity gaps, ICT risk management gaps, and missing resilience testing
parents:
  - index.md
covers:
  - Missing incident detection and reporting hooks
  - No supply chain risk assessment signals for third-party dependencies
  - Business continuity gaps in service architecture
  - ICT risk management not reflected in code or configuration
  - "Missing resilience testing (chaos engineering, failover tests)"
  - No threat-led penetration testing signals
  - Incident classification and escalation absent
  - Critical infrastructure service without redundancy
  - Missing ICT third-party risk monitoring
  - No digital operational resilience strategy signals
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
activation:
  file_globs:
    - "**/*incident*"
    - "**/*resilience*"
    - "**/*failover*"
    - "**/*circuit_breaker*"
    - "**/*chaos*"
    - "**/*continuity*"
    - "**/*disaster*"
    - "**/*recovery*"
    - "**/*supply_chain*"
    - "**/*vendor*"
    - "**/*nis2*"
    - "**/*dora*"
  keyword_matches:
    - nis2
    - NIS2
    - dora
    - DORA
    - incident_report
    - incident_response
    - csirt
    - CSIRT
    - supply_chain
    - resilience
    - business_continuity
    - failover
    - circuit_breaker
    - chaos
    - disaster_recovery
    - ict_risk
    - third_party_risk
    - operational_resilience
    - threat_led
    - penetration_test
  structural_signals:
    - Incident detection or reporting integration
    - Circuit breaker or resilience pattern implementation
    - Failover or disaster recovery configuration
    - Third-party vendor integration or dependency management
source:
  origin: file
  path: compliance-nis2-dora-eu.md
  hash: "sha256:2ea7f2bfa32a56d7be9617d5e9603f9a08580d11e0f483193644a12eefc45145"
---
# NIS2 / DORA EU Compliance

## When This Activates

Activates when diffs touch incident handling, resilience patterns, third-party integrations, failover configuration, business continuity logic, or supply chain dependency management. The NIS2 Directive (EU 2022/2555) imposes cybersecurity obligations on essential and important entities across the EU. DORA (EU 2022/2554) mandates digital operational resilience for the financial sector. Both require incident reporting within tight timelines (24h initial, 72h full for NIS2), supply chain risk management, business continuity, and resilience testing. Code that lacks incident hooks, has no resilience patterns, or introduces unassessed third-party dependencies creates compliance exposure.

**Framework**: NIS2 Directive (EU 2022/2555), DORA Regulation (EU 2022/2554).

## Audit Surface

- [ ] No incident detection hook in error handlers or security event paths
- [ ] No incident reporting API integration (CSIRT notification)
- [ ] No incident classification or severity tagging mechanism
- [ ] Third-party dependency added without supply chain risk comment
- [ ] Critical service with no redundancy or failover configuration
- [ ] No circuit breaker or bulkhead pattern in external service calls
- [ ] No retry with backoff on transient failures
- [ ] No chaos testing or resilience test configuration
- [ ] No failover test or disaster recovery drill reference
- [ ] No ICT risk register reference for new technology introduction
- [ ] Single point of failure in data path or service architecture
- [ ] No incident response playbook reference in alerting config
- [ ] Third-party ICT provider without monitoring or SLA reference
- [ ] Missing business impact analysis for service dependencies
- [ ] No threat intelligence feed integration or reference

## Detailed Checks

### Incident Detection and Reporting (NIS2 Art. 23, DORA Art. 19)
<!-- activation: keywords=["incident", "alert", "detect", "report", "csirt", "notification", "escalate", "classify", "severity", "breach"] -->

- [ ] **No incident detection hooks**: flag error handlers, security event paths, and anomaly detection code that do not emit signals to an incident management system. NIS2 requires entities to detect and report significant incidents within 24 hours (initial notification) and 72 hours (full report)
- [ ] **No incident reporting integration**: flag incident management or alerting configurations without integration to competent authority notification (CSIRT reporting API or equivalent). DORA requires financial entities to report major ICT-related incidents to their competent authority
- [ ] **No incident classification mechanism**: flag incident handling code without severity classification or tagging. Both NIS2 and DORA require incidents classified by impact to determine reporting obligations
- [ ] **No escalation path for critical incidents**: flag alerting configurations that treat all incidents uniformly without escalation for critical security incidents. Cross-reference with `sec-owasp-a09-logging-monitoring-failures`

### Supply Chain Risk Assessment (NIS2 Art. 21(2)(d), DORA Art. 28)
<!-- activation: keywords=["dependency", "vendor", "third_party", "supplier", "package", "npm", "pip", "maven", "supply_chain", "sbom"] -->

- [ ] **New dependency without risk assessment signal**: flag newly added third-party libraries, packages, or service integrations without a comment or reference to supply chain risk assessment. NIS2 requires supply chain security measures including assessment of suppliers
- [ ] **No software bill of materials (SBOM)**: flag projects without SBOM generation in their build pipeline. DORA expects entities to maintain registers of ICT third-party dependencies
- [ ] **Third-party ICT provider without SLA reference**: flag integrations with external ICT service providers without reference to contractual arrangements covering availability, security, and incident notification. DORA Art. 28 mandates specific contractual provisions
- [ ] **No dependency vulnerability monitoring**: flag dependency configurations without automated vulnerability scanning or update monitoring. Cross-reference with `sec-secrets-management-and-rotation`

### Business Continuity and Resilience (NIS2 Art. 21(2)(c), DORA Art. 11)
<!-- activation: keywords=["continuity", "failover", "redundancy", "backup", "recovery", "rpo", "rto", "disaster", "availability", "replica"] -->

- [ ] **Critical service without redundancy**: flag service deployments in critical paths with single-instance configurations, no replica sets, and no failover targets. NIS2 requires business continuity and crisis management measures
- [ ] **Single point of failure**: flag data paths or service architectures where a single component failure would cause complete service unavailability. DORA requires entities to identify and mitigate single points of failure
- [ ] **No recovery objectives defined**: flag service configurations without documented RPO (Recovery Point Objective) and RTO (Recovery Time Objective) targets. DORA Art. 11 requires recovery time and point objectives for critical functions
- [ ] **No circuit breaker pattern**: flag external service calls without circuit breaker, bulkhead, or timeout patterns. Cascading failures from third-party dependencies undermine operational resilience. Cross-reference with `principle-fail-fast`

### Resilience Testing (DORA Art. 24-27)
<!-- activation: keywords=["chaos", "test", "resilience", "failover_test", "drill", "penetration", "threat_led", "tlpt", "gameday"] -->

- [ ] **No resilience testing configuration**: flag production services without chaos testing, gameday exercises, or resilience test configurations. DORA Art. 24 requires a digital operational resilience testing programme
- [ ] **No failover testing**: flag failover configurations without references to periodic testing or drill schedules. Untested failover mechanisms may not work when needed
- [ ] **No threat-led penetration testing signal**: flag critical financial services without reference to threat-led penetration testing (TLPT). DORA Art. 26 requires TLPT at least every three years for significant entities
- [ ] **No disaster recovery drill reference**: flag disaster recovery configurations without references to periodic drill execution or results

### ICT Risk Management (NIS2 Art. 21, DORA Art. 5-16)
<!-- activation: keywords=["risk", "ict", "assessment", "register", "threat", "vulnerability", "classify", "impact", "mitigation"] -->

- [ ] **No ICT risk reference for new technology**: flag introduction of new technology stacks, frameworks, or infrastructure components without reference to ICT risk assessment. DORA Art. 8 requires ICT risk management framework covering identification, protection, detection, response, and recovery
- [ ] **No threat intelligence integration**: flag security monitoring configurations without reference to threat intelligence feeds or indicators of compromise. NIS2 encourages threat intelligence sharing and consumption
- [ ] **Missing business impact analysis**: flag new service dependencies without business impact analysis reference. Understanding the impact of dependency failure is fundamental to ICT risk management

## Common False Positives

- **Non-EU deployments**: NIS2 and DORA apply to EU entities and ICT services provided to them. Purely non-EU deployments may not be in scope.
- **Non-essential services**: NIS2 distinguishes essential and important entities. Internal tools for non-critical functions may have lighter requirements.
- **Non-financial sector**: DORA-specific requirements (TLPT, ICT third-party registers) apply specifically to financial entities.
- **Resilience patterns in libraries**: frameworks that include built-in circuit breakers (Resilience4j, Polly, Hystrix) satisfy the pattern without explicit code.

## Severity Guidance

| Finding | Severity |
|---|---|
| No incident detection or reporting hooks for critical paths | Critical |
| Critical service with no redundancy or failover | Critical |
| Single point of failure in essential service data path | Important |
| No circuit breaker on external service calls | Important |
| New third-party dependency without supply chain risk signal | Important |
| No resilience testing configuration | Important |
| No incident classification mechanism | Minor |
| No SBOM generation in build pipeline | Minor |
| No threat intelligence feed reference | Minor |

## See Also

- `sec-owasp-a09-logging-monitoring-failures` -- incident detection requires comprehensive logging
- `compliance-soc2` -- availability monitoring and incident response overlap with SOC 2 A1 and CC7
- `compliance-iso27001` -- ISO 27001 Annex A controls align with NIS2 cybersecurity measures
- `principle-fail-fast` -- resilience patterns should fail fast to prevent cascading failures
- `sec-secrets-management-and-rotation` -- supply chain security includes dependency credential management

## Authoritative References

- [NIS2 Directive - EU 2022/2555](https://eur-lex.europa.eu/eli/dir/2022/2555)
- [DORA Regulation - EU 2022/2554](https://eur-lex.europa.eu/eli/reg/2022/2554)
- [ENISA NIS2 Guidance](https://www.enisa.europa.eu/topics/nis-directive)
- [ESAs Joint Technical Standards under DORA](https://www.eba.europa.eu/regulation-and-policy/digital-operational-resilience-act-dora)
