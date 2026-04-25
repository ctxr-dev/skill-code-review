---
id: email-deliverability-spf-dkim-dmarc
type: primary
depth_role: leaf
focus: "Detect email-sending misconfiguration that harms deliverability, reputation, and compliance -- SPF, DKIM, DMARC, bounce/complaint handling, unsubscribe, and IP warming"
parents:
  - index.md
covers:
  - Missing SPF record or SPF not aligned with sending domain
  - DKIM signing not enabled or key rotation absent
  - "DMARC policy p=none in production (no enforcement)"
  - Bounce handling missing -- hard and soft bounces not tracked
  - "Complaint / feedback-loop (FBL) processing missing"
  - Missing List-Unsubscribe header
  - "Missing one-click unsubscribe (RFC 8058)"
  - "Sending from unverified / unauthenticated domain"
  - "List hygiene absent -- bounced/complaint addresses not suppressed"
  - IP warming skipped or ramp too aggressive
  - "DMARC RUA/RUF reporting not configured"
  - "Transactional and marketing mail sent from same IP pool / domain"
tags:
  - email
  - smtp
  - spf
  - dkim
  - dmarc
  - deliverability
  - bounce
  - complaint
  - unsubscribe
  - ses
  - sendgrid
  - mailgun
  - postmark
activation:
  file_globs:
    - "**/*.{py,rb,ts,js,go,java,kt,cs,tf,yaml,yml,json}"
    - "**/email/**"
    - "**/mailer*"
    - "**/*mail*.{py,rb,ts,js,go,java,kt,cs}"
  keyword_matches:
    - SMTP
    - email
    - SPF
    - DKIM
    - DMARC
    - bounce
    - complaint
    - unsubscribe
    - List-Unsubscribe
    - MIME
    - sendmail
    - Postfix
    - SES
    - SendGrid
    - Mailgun
    - Postmark
    - feedback-loop
    - RUA
    - RUF
    - message-id
  structural_signals:
    - email_send_without_unsubscribe
    - no_bounce_handler
    - dmarc_p_none
source:
  origin: file
  path: email-deliverability-spf-dkim-dmarc.md
  hash: "sha256:32dddb9f8255b6f6303ee046f432102932d5ab9b7d72d79186258b501d2a9fce"
---
# Email Deliverability (SPF, DKIM, DMARC)

## When This Activates

Activates when diffs add or modify email-sending code (SES, SendGrid, Mailgun, Postmark, raw SMTP, Postfix), touch DNS records for email (SPF, DKIM, DMARC, MX), or change transactional/marketing email templates. Email is unforgiving: a weekend's worth of misconfigured sends can tank sender reputation for months, and post-2024 Gmail/Yahoo bulk-sender rules make DMARC + one-click unsubscribe table stakes.

## Audit Surface

- [ ] No SPF TXT record or SPF missing provider includes for the sending domain
- [ ] DKIM signing not configured, or key never rotated
- [ ] DMARC policy p=none in production (no enforcement)
- [ ] No bounce webhook / SNS handler wired up
- [ ] Hard bounces not suppression-listed
- [ ] Soft bounces not tracked for escalation
- [ ] Complaint / FBL feedback not processed
- [ ] Missing List-Unsubscribe header on bulk mail
- [ ] Missing RFC 8058 one-click unsubscribe
- [ ] From address domain not aligned with SPF/DKIM
- [ ] Sending to purchased / scraped lists
- [ ] New IP used at full volume without warming ramp
- [ ] DMARC RUA/RUF reporting not configured
- [ ] Transactional and marketing sharing the same IP/domain reputation
- [ ] Unsubscribe requires login or multiple steps
- [ ] Reply-to points to an unmonitored inbox

## Detailed Checks

### Authentication: SPF, DKIM, DMARC
<!-- activation: keywords=["SPF", "DKIM", "DMARC", "_dmarc", "DNS", "TXT record", "selector"] -->

- [ ] **SPF missing or misaligned**: no `v=spf1 ... -all` TXT on the envelope-from domain, or provider `include:` missing -- messages fail SPF and land in spam. The envelope-from and DKIM d= should align with the visible From per DMARC alignment rules.
- [ ] **DKIM not signing**: provider supports DKIM but the DNS selector is not published, or signing is disabled -- DMARC cannot validate. Use 2048-bit RSA keys and rotate at least annually.
- [ ] **DMARC p=none in production**: policy is observe-only -- spoofing attempts still deliver. After monitoring, ratchet to `p=quarantine` then `p=reject` with `pct=` rollout.
- [ ] **DMARC alignment mode too strict/loose for setup**: `aspf=s`/`adkim=s` (strict) with subdomain sends breaks alignment; relaxed when you have subdomain takeover risk is also wrong -- match alignment to your sending topology.
- [ ] **SPF uses +all or has 10+ DNS lookups**: `+all` permits anyone to send as you; SPF exceeds RFC 7208 ten-lookup limit causing permerror and delivery failure. Use SPF flattening or reduce includes.

### Bounce and Complaint Handling
<!-- activation: keywords=["bounce", "complaint", "SNS", "webhook", "feedback-loop", "FBL", "suppression"] -->

- [ ] **No bounce handler**: SES SNS topic, SendGrid event webhook, or Mailgun route not implemented -- you keep sending to addresses that permanently rejected you. AWS and others will auto-pause your account for high bounce rates.
- [ ] **Hard bounce not suppressed**: a 5xx SMTP response means "never again" -- must be persisted to a suppression list and checked before every send.
- [ ] **Soft bounces not escalated**: transient 4xx responses ignored entirely -- repeated soft bounces (e.g., 7 in a row) should escalate to suppression. Conversely, a single soft bounce should not trigger immediate suppression.
- [ ] **Complaints (this-is-spam) not processed**: ISP feedback loops report recipients hitting "Spam" -- those must be suppressed immediately; complaint rate >0.3% tanks reputation.
- [ ] **Suppression list not consulted before send**: worker dispatches to every list member without intersecting the suppression list first.

### Unsubscribe and List Hygiene
<!-- activation: keywords=["List-Unsubscribe", "unsubscribe", "opt-out", "suppression", "hygiene", "List-Unsubscribe-Post"] -->

- [ ] **Missing List-Unsubscribe header**: bulk/marketing mail without the header -- violates Gmail/Yahoo 2024 bulk-sender rules and user agents cannot offer a one-click unsubscribe.
- [ ] **Missing RFC 8058 one-click unsubscribe**: `List-Unsubscribe-Post: List-Unsubscribe=One-Click` not set, or the linked URL requires login/CAPTCHA/multiple steps -- bulk senders now require single-click with no friction.
- [ ] **Unsubscribe link behind auth**: clicking unsubscribe prompts a login -- violates CAN-SPAM/CASL expectations. Use a signed, time-limited token.
- [ ] **Unsubscribe delay >10 business days**: CAN-SPAM requires honoring within 10 business days; internal propagation should be near-immediate.
- [ ] **Purchased / unverified lists**: code imports addresses that never confirmed opt-in -- complaint rates will spike and reputation will sink.
- [ ] **No double opt-in for marketing**: subscribing adds the address with no confirmation email -- allows third parties to sign up someone else.

### IP Warming and Reputation
<!-- activation: keywords=["warming", "ramp", "new IP", "dedicated IP", "reputation", "throughput"] -->

- [ ] **No warming ramp on new IP**: code fires full production volume on a fresh dedicated IP -- ISPs see a spike from an unknown sender and spam-fold it. Use a documented ramp (e.g., day 1: 50, day 2: 100, doubling) over ~30 days.
- [ ] **Transactional and marketing on same IP pool**: a marketing blast triggering complaints then degrades transactional (password reset, receipts) deliverability -- segment pools and ideally subdomains.
- [ ] **Single IP for high volume**: no redundancy; one reputation incident cuts you off entirely. Use a pool.
- [ ] **Shared IP for high-volume senders**: on shared IPs you inherit other tenants' reputation -- consider dedicated at scale.

### DMARC Reporting and Observability
<!-- activation: keywords=["RUA", "RUF", "dmarc report", "aggregate", "forensic"] -->

- [ ] **RUA not configured**: no `rua=mailto:...` -- you cannot see who is sending as your domain. Pipe reports to a DMARC-parser (self-hosted or SaaS).
- [ ] **RUF not configured when available**: forensic reports show failing messages; useful during enforcement rollout even though many ISPs no longer emit them.
- [ ] **DMARC reports not reviewed**: reports arrive at an unchecked inbox -- monitor and alert on unexpected sources and pass-rate drops.
- [ ] **No bounce/complaint/open metrics dashboard**: operators cannot see deliverability health at a glance.

### Content and Headers
<!-- activation: keywords=["From", "Reply-To", "Message-ID", "MIME", "template", "List-Id"] -->

- [ ] **From address on unverified domain**: sending as `@yourcompany.com` without verifying the domain in the ESP -- DKIM not applied and DMARC fails.
- [ ] **Reply-To unmonitored**: auto-replies and human replies vanish into a void -- set a real inbox or use a ticketing address.
- [ ] **Missing Message-ID**: messages without a unique `Message-ID` are downgraded by some ISPs; ESPs usually set this but direct SMTP code may not.
- [ ] **HTML-only mail**: no plaintext alternative -- reduces deliverability and accessibility; always include a text/plain part.
- [ ] **Spam-trigger content**: link shorteners, all-caps subjects, excessive exclamation, hidden text -- automated filters score you down. Subject-line review if templates land in the diff.
- [ ] **Tracking pixel over HTTP**: open-tracking pixel on http:// -- mixed-content warning and privacy regression.

## Common False Positives

- **Internal-only relay**: a Postfix instance sending only intra-company mail via internal relay does not need public DMARC enforcement -- flag only if the domain is also used for external mail.
- **Dev/staging with sandbox keys**: ESP sandbox modes often skip full DKIM/DMARC; flag only for production configuration.
- **Transactional-only setup**: strict one-click unsubscribe is not required for purely transactional mail (receipts, password resets) though List-Unsubscribe is still recommended.
- **Provider-managed SPF/DKIM**: when the ESP manages DNS via CNAME (SendGrid "Sender Authentication"), the repo config may not show records -- check provider setup rather than flagging absence.

## Severity Guidance

| Finding | Severity |
|---|---|
| DMARC policy p=none in production after months of monitoring | Critical |
| No bounce/complaint handling wired up (account pause risk) | Critical |
| No SPF or no DKIM on production sending domain | Critical |
| Unsubscribe requires login, CAPTCHA, or multiple steps | Critical |
| Missing List-Unsubscribe / one-click unsubscribe on bulk mail | Important |
| Transactional and marketing sharing IP pool (reputation coupling) | Important |
| New IP ramped without warming | Important |
| Sending to purchased / unverified lists | Important |
| Hard bounces not added to suppression list | Important |
| DMARC RUA reporting not configured | Important |
| DKIM key never rotated | Important |
| SPF exceeds 10 DNS lookups (permerror) | Important |
| Reply-To unmonitored | Minor |
| HTML-only email (no text/plain part) | Minor |

## See Also

- `sec-secrets-management-and-rotation` -- DKIM private keys and ESP API credentials require rotation
- `reliability-retry-with-backoff` -- SMTP transient failures need backoff before retry
- `reliability-idempotency` -- message-id as idempotency key prevents duplicate sends on retry
- `compliance-gdpr-data-subject-rights` -- unsubscribe and erasure must propagate to suppression lists
- `sec-owasp-a05-misconfiguration` -- DMARC misconfiguration is a top misconfiguration vector

## Authoritative References

- [RFC 7208, "SPF"](https://www.rfc-editor.org/rfc/rfc7208.html)
- [RFC 6376, "DKIM Signatures"](https://www.rfc-editor.org/rfc/rfc6376.html)
- [RFC 7489, "DMARC"](https://www.rfc-editor.org/rfc/rfc7489.html)
- [RFC 8058, "Signaling One-Click Functionality for List Email Headers"](https://www.rfc-editor.org/rfc/rfc8058.html)
- [Google, "Email sender guidelines" (2024 bulk-sender rules)](https://support.google.com/mail/answer/81126)
- [M3AAWG, "Sender Best Common Practices"](https://www.m3aawg.org/sites/default/files/m3aawg_senders_bcp_ver3-2015-02.pdf)
