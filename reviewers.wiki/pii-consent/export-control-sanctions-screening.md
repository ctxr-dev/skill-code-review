---
id: export-control-sanctions-screening
type: primary
depth_role: leaf
focus: Detect export-control and sanctions screening gaps including missing sanctioned-country blocking, unclassified encryption export, missing denied-party screening, cloud region serving embargoed jurisdictions, absent TSU notification for open-source crypto, stale sanctions lists, and deemed-export access controls
parents:
  - index.md
covers:
  - "Signup or checkout flow with no sanctioned-country block (OFAC embargoed list)"
  - Encryption libraries used and exported without ECCN classification awareness
  - No denied-party screening on new customer or vendor onboarding
  - Cloud regions or CDN PoPs serving users in restricted jurisdictions
  - "Open-source release using crypto without TSU / 5D002 notification to BIS (EAR 742.15(b))"
  - High-risk dual-use products shipped without end-user or end-use verification
  - "Sanctions / denied-party lists not refreshed on a regular automated cadence"
  - Deemed-export rules ignored when non-US developer accesses controlled tech
  - Geo-IP and address-based checks bypassed by VPN or self-declared country
  - "Export classification (ECCN, EAR99) not recorded for shipped binaries / SDKs"
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
activation:
  file_globs:
    - "**/*sanction*"
    - "**/*ofac*"
    - "**/*embargo*"
    - "**/*geoip*"
    - "**/*geo_ip*"
    - "**/*country*"
    - "**/*denied_party*"
    - "**/*export*"
    - "**/*signup*"
    - "**/*checkout*"
    - "**/*onboarding*"
    - "**/*kyc*"
  keyword_matches:
    - export
    - sanctions
    - OFAC
    - EAR
    - ITAR
    - embargo
    - denied party
    - denied_party
    - screening
    - dual-use
    - encryption
    - ECCN
    - EAR99
    - restricted countries
    - deemed export
    - ITAR-controlled
    - 5D002
    - TSU
    - SDN
    - CAATSA
  structural_signals:
    - "Signup / onboarding / checkout flow touching country or identity fields"
    - Cloud region or CDN configuration change
    - Cryptography library addition or configuration
    - "Vendor / customer list ingestion or sync"
source:
  origin: file
  path: export-control-sanctions-screening.md
  hash: "sha256:715877d9dd4b1ef60c036ae1004f143c6d93f72e3cbea72c8a3dc90d53c72f3f"
---
# Export Control and Sanctions Screening

## When This Activates

Activates when diffs touch signup, checkout, or onboarding flows that collect country or identity fields; cloud region or CDN configuration; cryptography library usage in redistributable products; sanctions/denied-party list integration; or release/distribution metadata. Export-control and sanctions rules are strict-liability regimes in the US (OFAC, EAR, ITAR) and similar in the EU, UK, and UN: enforcement actions carry eight- and nine-figure penalties, and personal criminal exposure for officers. Software is export-controlled the moment it is transmitted across a border (including to a non-US developer accessing source -- the "deemed export" rule). Reviewers should treat a missing country block or an unclassified crypto library as a compliance P0.

**Key Requirements**: OFAC 31 CFR 500-599 (sanctions), EAR 15 CFR 730-774 (dual-use), EAR 742.15 (encryption / TSU), ITAR 22 CFR 120-130 (defense articles), EU Regulation 821/2021 (dual-use), UK Export Control Order 2008.

## Audit Surface

- [ ] Signup, checkout, or account-creation flow with no country-of-residence block
- [ ] IP geolocation check missing for restricted countries
- [ ] Use of AES / RSA / TLS crypto in a redistributed product with no ECCN note
- [ ] Open-source repository with crypto and no 5D002 TSU email to crypt@bis.doc.gov
- [ ] Customer onboarding service with no OFAC SDN / EU / UK / UN list check
- [ ] Vendor / supplier onboarding with no denied-party screening integration
- [ ] Cloud region config including regions serving embargoed jurisdictions
- [ ] Payment or subscription flow routing funds from sanctioned countries
- [ ] Sanctions list integration with static file / no refresh job / > 30 days stale
- [ ] Non-US contractor granted access to repositories tagged export-controlled
- [ ] Export classification (ECCN, EAR99, ITAR category) absent from release metadata
- [ ] License agreement lacking end-use / end-user representations
- [ ] Download link for a controlled product with no click-through export statement
- [ ] Mobile app store or extension store distribution with no country restrictions
- [ ] Crypto library hard-coded without review of license-exception eligibility

## Detailed Checks

### Sanctioned-Country Blocking at Signup and Checkout
<!-- activation: keywords=["signup", "checkout", "country", "registration", "billing_country", "shipping_country", "geoip"] -->

- [ ] **No country-of-residence block in signup**: flag signup or account-creation flows that accept a country field without rejecting OFAC-embargoed jurisdictions (currently Cuba, Iran, North Korea, Syria, the Crimea / DNR / LNR regions of Ukraine, and evolving Russia/Belarus restrictions under CAATSA and EO 14071). Country lists change -- hard-coded lists must be externalized
- [ ] **Checkout routing funds from sanctioned country**: flag payment or subscription flows that do not screen billing country, shipping country, and BIN country against the current sanctions list
- [ ] **IP geolocation check missing or bypassable**: flag geolocation-based blocks that rely only on self-declared country (trivially bypassable). A defense-in-depth posture uses IP geolocation, payment-country, and address-country together
- [ ] **Restricted-region cloud routing**: flag CDN, edge, or regional cloud configurations that serve content from PoPs inside embargoed regions (e.g., a Crimea PoP, a Tehran PoP). Cross-reference with `compliance-gdpr-data-subject-rights`

### Encryption Classification and EAR 742.15 Notification
<!-- activation: keywords=["encrypt", "aes", "rsa", "tls", "crypto", "openssl", "libsodium", "wolfssl", "5D002", "TSU"] -->

- [ ] **Crypto used without ECCN classification**: flag products that ship encryption functionality (AES, RSA, TLS, signature, KEM) without a recorded ECCN (typically 5D002 for software, 5A002 for hardware) or an EAR99 determination. Classification is prerequisite to every downstream export decision
- [ ] **Open-source crypto release without TSU notification**: flag open-source repositories publishing crypto (5D002) without the one-time BIS email notification required by EAR 742.15(b) to `crypt@bis.doc.gov` and `enc@nsa.gov`. The exemption is self-executing only after notification
- [ ] **Mass-market crypto without License Exception ENC review**: flag commercial crypto products distributed widely without verifying License Exception ENC (EAR 740.17) eligibility, including the semi-annual sales report requirement for some categories
- [ ] **ITAR-controlled crypto**: flag products containing cryptography intended for military applications (USML Category XI/XIII) -- these fall under ITAR, not EAR, with much stricter rules. Escalate to legal immediately

### Denied-Party Screening
<!-- activation: keywords=["SDN", "denied_party", "restricted_party", "screening", "kyc", "vendor_onboarding", "customer_onboarding"] -->

- [ ] **No denied-party screening at onboarding**: flag customer or vendor onboarding services that do not screen names and entities against OFAC SDN, EU Consolidated List, UK OFSI list, UN Consolidated List, BIS Entity List, and BIS Denied Persons List
- [ ] **Screening only at onboarding, not ongoing**: flag integrations that screen once at signup and never re-screen. Sanctions lists are updated daily; continuous re-screening is required to catch additions to the SDN list
- [ ] **Stale sanctions list**: flag integrations where the local copy of the SDN or consolidated list is refreshed less often than daily, or where no refresh job exists. A 30-day-old list is not a defensible control
- [ ] **No audit trail of screening decisions**: flag screening services that block or allow without persisting the screening result (list version, match score, reviewer) for later audit. Cross-reference with `compliance-consent-tracking-and-retention`

### Deemed Export and Controlled-Tech Access
<!-- activation: keywords=["deemed_export", "foreign_national", "contractor", "offshore", "repository_access", "source_access"] -->

- [ ] **Non-US developer granted access to controlled source**: flag repository access grants, SSO group memberships, or VPN credentials given to foreign-national employees or contractors for repositories containing export-controlled technology, without a deemed-export license or authorized license exception
- [ ] **Controlled tech transmitted via cloud region abroad**: flag CI/CD pipelines, source mirrors, or backup jobs that copy controlled tech to cloud regions outside the US without export authorization
- [ ] **No export classification on release artifacts**: flag released binaries, SDKs, and container images without ECCN / EAR99 / ITAR metadata recorded in release notes, SBOM, or internal registry. Cross-reference with `sec-supply-chain-sbom-slsa-sigstore`

### End-Use and End-User Verification
<!-- activation: keywords=["end_use", "end_user", "dual_use", "high_risk", "red_flag", "military", "WMD"] -->

- [ ] **No end-use / end-user screen for dual-use products**: flag sales flows for dual-use or high-risk products (surveillance, advanced compute, cyber tools) that do not capture customer representations of end use and end user. EAR Part 744 red flags apply
- [ ] **No click-through export statement on downloads**: flag public download links for controlled products without a click-through acknowledgment that the user is not in a restricted country and not on a denied-party list
- [ ] **License agreement missing export clause**: flag EULAs or SaaS terms without an export-compliance clause requiring the customer to comply with all applicable export laws and not re-export to restricted destinations

### Distribution Channels (Stores, CDNs, Package Registries)
<!-- activation: keywords=["app_store", "play_store", "extension", "npm", "pypi", "container_registry", "distribution"] -->

- [ ] **No country restrictions configured in app store**: flag mobile app / browser extension submissions that use the default "available in all countries" setting when the app ships crypto or high-risk functionality
- [ ] **Package published to public registry without classification**: flag npm / PyPI / crates.io publishing flows that do not record ECCN or EAR99 for released packages. Public registries are distributions

## Common False Positives

- **Pure EAR99 / no-license-required software**: products with no crypto, no encryption item, and no ITAR content are typically EAR99 and need only baseline denied-party and sanctioned-country screening.
- **Consumer web services with no software download**: SaaS access to foreign users may be permitted depending on Service and destination (but still subject to OFAC sanctions -- access itself can be "export of a service").
- **Internal-only tools**: tools not distributed externally and not accessed by foreign nationals do not trigger redistribution-based export controls, though deemed-export still applies.
- **Standards-compliant crypto in publicly available form**: TLS client libraries that are already publicly available may qualify for public-availability decontrol under EAR 734.3(b)(3), but this is fact-specific -- do not self-certify without legal review.
- **Correspondent-of-service activities**: some payment rails and messaging providers have OFAC general licenses; do not flag if a specific general license authorization is cited.

## Severity Guidance

| Finding | Severity |
|---|---|
| Signup / checkout with no sanctioned-country block | Critical |
| No denied-party screening on customer onboarding | Critical |
| Open-source crypto released with no TSU notification | Critical |
| Controlled tech transmitted to foreign national without authorization | Critical |
| Cloud region serving an embargoed jurisdiction | Critical |
| Crypto shipped without ECCN classification | Important |
| Sanctions list stale (> 30 days) or no refresh job | Important |
| No ongoing re-screening after onboarding | Important |
| ECCN / EAR99 metadata absent from release artifacts | Important |
| EULA / download missing export representations | Minor |
| App store distribution without country restrictions | Minor |

## See Also

- `sec-supply-chain-sbom-slsa-sigstore` -- SBOM should carry ECCN / EAR99 metadata per release artifact
- `licensing-compliance-copyleft-dual-license-cla` -- crypto licensing and export classification are frequently co-reviewed
- `compliance-gdpr-data-subject-rights` -- geo-blocking decisions interact with data-subject rights in GDPR jurisdictions
- `compliance-consent-tracking-and-retention` -- screening decisions require audit-log retention
- `compliance-ccpa-cpra` -- state residence screening is orthogonal to country-level export control but often shares plumbing

## Authoritative References

- [US Treasury OFAC - Sanctions Programs](https://ofac.treasury.gov/sanctions-programs-and-country-information)
- [OFAC SDN List (downloads)](https://ofac.treasury.gov/specially-designated-nationals-and-blocked-persons-list-sdn-human-readable-lists)
- [BIS EAR - Commerce Control List](https://www.bis.doc.gov/index.php/regulations/commerce-control-list-ccl)
- [EAR 742.15 - Encryption (TSU)](https://www.ecfr.gov/current/title-15/subtitle-B/chapter-VII/subchapter-C/part-742/section-742.15)
- [BIS Encryption FAQs - How to Notify](https://www.bis.doc.gov/index.php/policy-guidance/encryption/1-encryption-items-not-subject-to-the-ear)
- [BIS Entity List](https://www.bis.doc.gov/index.php/policy-guidance/lists-of-parties-of-concern/entity-list)
- [EU Consolidated List of Sanctions](https://data.europa.eu/data/datasets/consolidated-list-of-persons-groups-and-entities-subject-to-eu-financial-sanctions)
- [US DDTC - ITAR](https://www.pmddtc.state.gov/ddtc_public/ddtc_public?id=ddtc_kb_article_page&sys_id=24d528fddbfc930044f9ff621f961987)
