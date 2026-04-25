---
id: cookie-consent-tracking-pixel-compliance
type: primary
depth_role: leaf
focus: Detect cookie consent and tracking-pixel compliance gaps including tracking scripts loading before consent, missing or asymmetric consent banner, uncategorized consent, ad-tech pixels firing pre-consent, missing IAB TCF v2.2 integration, consent not persisted across loads, and dark-pattern UI
parents:
  - index.md
covers:
  - "Analytics / ads / tracking scripts loading before the user grants consent"
  - "No consent banner shown to EU / UK / Canadian / California traffic"
  - Banner with Accept-All prominent but no equal-weight Reject-All option
  - "Consent captured as a single flag without category granularity (necessary, analytics, marketing)"
  - "GA / Meta Pixel / TikTok / LinkedIn tag firing before analytics consent"
  - Ad-tech integration without IAB TCF v2.2 consent string propagation
  - Consent decision not persisted across pages, sessions, or subdomains
  - "Cookies written with no Max-Age / Expires, or excessive lifetime"
  - "Consent UI using pre-ticked boxes, forced-action, or hidden reject path (dark patterns)"
  - "Google Consent Mode v2 not configured (ads_data_redaction, url_passthrough)"
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
activation:
  file_globs:
    - "**/*cookie*"
    - "**/*consent*"
    - "**/*banner*"
    - "**/*tracking*"
    - "**/*pixel*"
    - "**/*analytics*"
    - "**/gtag*"
    - "**/gtm*"
    - "**/tcf*"
    - "**/*index.html"
    - "**/*layout.*"
    - "**/*_document.*"
    - "**/*_app.*"
  keyword_matches:
    - cookie
    - consent
    - GDPR
    - CCPA
    - tracking pixel
    - gtag
    - fbq
    - pixel
    - _ga
    - _gid
    - consent banner
    - CMP
    - OneTrust
    - Cookiebot
    - TCF
    - IAB
    - consent string
    - opt-in
    - opt-out
    - consent_mode
    - ad_user_data
    - ad_personalization
    - GPP
  structural_signals:
    - "Script tag for analytics / ads / tracking vendor"
    - Consent banner component or modal
    - "GTM / Tealium / Segment / Tag Manager config"
    - document.cookie writes or Set-Cookie headers
source:
  origin: file
  path: cookie-consent-tracking-pixel-compliance.md
  hash: "sha256:ee49e0906bd3450a64cc76785d0dbb452364df1c70462377121e9fce4f9601b9"
---
# Cookie Consent and Tracking Pixel Compliance

## When This Activates

Activates when diffs touch third-party analytics or ads tags (Google, Meta, TikTok, LinkedIn, Twitter/X), tag managers, consent banners or Consent Management Platforms (CMPs), cookie-writing code, or HTML layouts that include tracking scripts. Consent rules vary by jurisdiction but converge on a common pattern: no non-essential cookie, local-storage entry, or tracking request before the user has granted category-specific, informed, freely-given consent; rejection must be as easy as acceptance; and the consent decision must be recorded, respected across the site, and re-solicited when vendors or purposes change. Ad-tech interop additionally requires passing a valid IAB TCF v2.2 consent string (EU) or GPP string (US state privacy). Enforcement is aggressive: French CNIL, Italian Garante, UK ICO, and state AGs have all levied fines in the multi-millions for banner failures.

**Key Requirements**: ePrivacy Directive Art. 5(3), GDPR Art. 6-7, EDPB 03/2022 (deceptive design), CPRA (CCPA) Sec. 1798.135, IAB TCF v2.2, IAB GPP, Google Consent Mode v2.

## Audit Surface

- [ ] Third-party script tag (gtag, fbq, ttq, lintrk, _ga) loading unconditionally
- [ ] Tag manager (GTM) container firing tags without consent triggers
- [ ] Consent banner missing on site serving EU / UK / CA / Québec / California users
- [ ] Accept-All button styled primary; Reject-All hidden, greyed, or two-click
- [ ] Consent stored as a single boolean rather than per-category
- [ ] Facebook / Google / TikTok / LinkedIn pixel firing on page load
- [ ] Ad-tech request without TCF v2.2 TC string or GPP string attached
- [ ] Consent state missing from localStorage / cookie across page transitions
- [ ] Cookie set without Max-Age, Expires, SameSite, or Secure attributes
- [ ] Consent UI using pre-checked category checkboxes
- [ ] No consent log / receipt recording the user's choices and banner version
- [ ] No reject-all on first layer; reject hidden in a 'Manage' sub-panel
- [ ] Google Consent Mode v2 absent; no ad_user_data / ad_personalization signals
- [ ] Cookies categorized incorrectly (marketing cookie labelled 'necessary')
- [ ] Consent not re-solicited after material policy or vendor list change

## Detailed Checks

### Pre-Consent Tracking and Script Loading
<!-- activation: keywords=["gtag", "fbq", "ttq", "lintrk", "_ga", "_gid", "pixel", "script_src", "script_tag"] -->

- [ ] **Analytics / pixel loading before consent**: flag script tags for Google Analytics, gtag, Meta fbq, TikTok ttq, LinkedIn Insight, or similar trackers that load unconditionally at page load. These must be gated behind the consent decision, typically by loading only in the consent-granted callback
- [ ] **GTM container firing tags on All Pages without consent trigger**: flag Google Tag Manager containers where analytics / ads tags fire on an "All Pages" trigger without a consent-state variable gate
- [ ] **Pre-consent `document.cookie` writes**: flag writes to `document.cookie` or `Set-Cookie` for anything other than strictly necessary cookies (session id, CSRF, cart, auth) before consent is granted
- [ ] **Client-side fingerprinting before consent**: flag canvas / audio / WebGL / font-probing fingerprinting SDKs (FingerprintJS, ThreatMetrix) loaded without consent when used for analytics rather than fraud

### Banner Presence, Symmetry, and Dark Patterns
<!-- activation: keywords=["banner", "modal", "consent_ui", "accept_all", "reject_all", "manage", "cookiebot", "onetrust"] -->

- [ ] **No consent banner served to EU / UK / CA traffic**: flag sites with no consent banner component (CMP) while tracking vendors are present. Geo-gating a banner only to detected EU IPs is insufficient -- EU users behind VPNs are still protected
- [ ] **Asymmetric Accept vs Reject**: flag banner UIs where Accept-All is a primary-styled button on the first layer while Reject-All is hidden, greyed, text-only, or reached only through "Manage preferences". EDPB 03/2022 and CNIL guidance require equal prominence
- [ ] **Pre-checked category boxes**: flag "Manage preferences" sub-panels where analytics / marketing / personalization categories are pre-ticked. Consent must be active and opt-in
- [ ] **Continuing-to-browse implies consent**: flag banners that present "By continuing to use this site, you accept cookies" without explicit action -- this is not consent under GDPR
- [ ] **Forced-action or nagging dark patterns**: flag banners blocking the entire site with no way to reject, or re-prompting on every page after rejection (nagging). Cross-reference with `a11y-wcag-2-2-aa`

### Consent Granularity and Categorization
<!-- activation: keywords=["category", "necessary", "functional", "analytics", "marketing", "personalization", "purpose"] -->

- [ ] **Single-boolean consent**: flag consent stored as one flag (`cookies_accepted = true`) rather than per-category (strictly necessary, functional, analytics, advertising, personalization). Cross-reference with `compliance-consent-tracking-and-retention`
- [ ] **Cookies miscategorized as 'strictly necessary'**: flag vendor cookies classified as strictly necessary when they are analytics or marketing (e.g., classifying `_ga` or `_fbp` as necessary). "Necessary" means required to deliver a service the user explicitly requested
- [ ] **No per-vendor disclosure**: flag CMPs that present categories but do not disclose the specific third-party vendors, their purposes, and lifetime per cookie -- ePrivacy transparency requires specificity

### IAB TCF v2.2 and Ad-Tech Interop
<!-- activation: keywords=["TCF", "IAB", "TC_string", "TCString", "__tcfapi", "gdprApplies", "GPP", "__gppapi", "usp"] -->

- [ ] **Ad-tech without TCF v2.2 integration**: flag ad-tech vendors (DSPs, SSPs, exchanges) called without a valid TCF v2.2 TC string propagated via `__tcfapi` or query string. Non-TCF ad-tech calls after May 2024 are non-compliant for EU audiences
- [ ] **TCF consent purposes not mapped correctly**: flag vendor calls that fire on `purpose=1 (storage)` when the vendor also needs `purpose=3,4,7` (ad selection, measurement). Purposes must match each vendor's declared needs
- [ ] **No GPP string for US state privacy**: flag ad-tech requests targeting California / Colorado / Connecticut / Utah / Virginia users without an IAB GPP string encoding opt-out signals (including Global Privacy Control / Sec-GPC header)
- [ ] **Google Consent Mode v2 missing**: flag Google Ads / Analytics integrations without `ad_user_data` and `ad_personalization` consent signals (Consent Mode v2 required since March 2024 for EEA conversions)

### Consent Persistence and Cookie Hygiene
<!-- activation: keywords=["persist", "storage", "localStorage", "max_age", "expires", "samesite", "secure"] -->

- [ ] **Consent not persisted across page loads**: flag CMP integrations that collect consent but do not write it to a cookie or localStorage with an appropriate lifetime, forcing re-prompt on every navigation
- [ ] **Cookies without Max-Age / Expires**: flag `Set-Cookie` headers missing Max-Age or Expires (becoming session cookies unintentionally) or with excessive lifetimes (> 13 months, which exceeds ePrivacy guidance in several jurisdictions)
- [ ] **Missing SameSite / Secure on tracking cookies**: flag tracking cookies without `Secure` or `SameSite=Lax/Strict` -- cross-reference with `sec-owasp-a05-security-misconfiguration`
- [ ] **Consent not respected across subdomains**: flag consent written on `www.example.com` not honored on `app.example.com` (cookie domain scoping bug)
- [ ] **No re-consent on material change**: flag vendor list or category changes without a re-consent flow. The CMP version must be stored with the consent record so material changes can invalidate old consent

### Consent Log, Receipt, and Audit
<!-- activation: keywords=["consent_log", "consent_receipt", "audit", "cmp_version", "tc_version"] -->

- [ ] **No consent receipt / log**: flag CMP integrations that do not persist a consent log entry (user id / device id, timestamp, categories granted, CMP version, banner version, TC string). Without the log, the controller cannot demonstrate consent. Cross-reference with `compliance-gdpr-data-subject-rights`
- [ ] **No CMP version in consent record**: flag consent records that do not capture which banner / vendor list version was shown to the user. Material changes to the vendor list require new consent -- versioning is the only way to know

## Common False Positives

- **Strictly necessary cookies**: session, CSRF, cart, auth, load balancing, and security cookies may load without consent under ePrivacy Art. 5(3) exemption.
- **Server-side analytics without cookies**: first-party server-side analytics that does not set a device identifier may not require consent (jurisdiction-dependent).
- **Legitimate interest for analytics**: UK ICO briefly permitted; largely withdrawn. Most EU DPAs now require consent for analytics -- do not rely on legitimate interest without legal sign-off.
- **B2B sites with geolocation-gated banner**: a banner that shows only to EEA / UK / CA IPs is common and acceptable if the site has strong geo-blocking for those jurisdictions; still fragile against VPN users.
- **CMP managed entirely via tag manager**: a correctly-configured CMP inside GTM can be compliant; do not flag simply because the consent logic lives in GTM.

## Severity Guidance

| Finding | Severity |
|---|---|
| Analytics / pixel loads before consent on EU / UK traffic | Critical |
| No consent banner on site serving EU / UK / CA | Critical |
| Reject-All hidden or unequal to Accept-All | Critical |
| Pre-checked analytics / marketing categories | Critical |
| Single-boolean consent without category granularity | Important |
| TCF v2.2 string missing on ad-tech calls | Important |
| Google Consent Mode v2 not configured | Important |
| Consent not persisted across loads or subdomains | Important |
| No consent log / receipt recording the decision | Important |
| Cookie without Max-Age / Expires / SameSite / Secure | Minor |
| No re-consent on material change (old CMP version) | Minor |

## See Also

- `compliance-consent-tracking-and-retention` -- the cross-cutting rules for consent records, versioning, withdrawal, and retention
- `compliance-gdpr-data-subject-rights` -- data-subject rights (access, erasure) must cover tracking identifiers set by pixels
- `compliance-ccpa-cpra` -- CPRA opt-out signals (Global Privacy Control / Sec-GPC) and CCPA-specific disclosures
- `analytics-event-schema-discipline` -- once consent is granted, downstream event-schema rules apply to what is tracked
- `a11y-wcag-2-2-aa` -- consent banners must be keyboard-accessible, screen-reader-accessible, and not block content unfairly
- `sec-owasp-a05-security-misconfiguration` -- cookie attribute hygiene

## Authoritative References

- [ePrivacy Directive Article 5(3)](https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX%3A32002L0058)
- [EDPB Guidelines 03/2022 on Deceptive Design in Social Media](https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-032022-deceptive-design-patterns-social-media_en)
- [CNIL - Cookies and other trackers](https://www.cnil.fr/en/cookies-and-other-trackers)
- [ICO - Guidance on the use of cookies](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/cookies-and-similar-technologies/)
- [IAB Europe TCF v2.2](https://iabeurope.eu/tcf-2-2/)
- [IAB Global Privacy Platform (GPP)](https://iabtechlab.com/gpp/)
- [Google Consent Mode v2](https://support.google.com/analytics/answer/9976101)
- [W3C Global Privacy Control (Sec-GPC)](https://globalprivacycontrol.org/)
