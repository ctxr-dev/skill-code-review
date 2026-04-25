---
id: notification-delivery-apns-fcm-webpush
type: primary
depth_role: leaf
focus: Detect push-notification pitfalls across APNs, FCM, and WebPush -- token handling, batching, silent-push abuse, payload privacy, and unsubscribe discipline
parents:
  - index.md
covers:
  - Device tokens stored without encryption at rest
  - "Tokens not rotated/invalidated on app uninstall or reinstall"
  - "Per-device API calls instead of multicast/batched send"
  - Silent push used for polling, draining battery and burning quotas
  - Missing collapse-key causing duplicate user-visible notifications
  - "No retry on transient delivery failure (5xx, throttling)"
  - VAPID private keys or APNs certificates committed to source
  - APNs certificate or p8 auth key expiry not monitored
  - No deduplication when multiple channels fire the same event
  - "No opt-out / unsubscribe plumbing tied to provider token state"
  - PII or sensitive content in notification payload visible on lock screen
tags:
  - push
  - notifications
  - apns
  - fcm
  - firebase
  - webpush
  - vapid
  - mobile
  - privacy
  - device-token
activation:
  file_globs:
    - "**/*.{swift,kt,java,ts,js,py,rb,go,cs}"
    - "**/push/**"
    - "**/notifications/**"
    - "**/notification*.{ts,js,py,go,java,kt,swift,rb,cs}"
  keyword_matches:
    - APNs
    - APNS
    - FCM
    - Firebase Cloud Messaging
    - WebPush
    - VAPID
    - notification
    - push
    - device_token
    - registration_token
    - silent push
    - content-available
    - sendMulticast
    - apns_topic
    - apns-push-type
    - apns-collapse-id
    - collapse_key
    - p8
    - "messaging().send"
  structural_signals:
    - per_device_send_loop
    - token_in_plaintext
    - missing_unsubscribe_handler
    - silent_push_polling
source:
  origin: file
  path: notification-delivery-apns-fcm-webpush.md
  hash: "sha256:7fa509cc52b0e0404b9e8ed2287e5043e2a0e7d13cbb4343bb65e272eb742e74"
---
# Notification Delivery (APNs, FCM, WebPush)

## When This Activates

Activates when diffs touch push-notification code paths -- device-token registration, APNs / FCM / WebPush client setup, VAPID key handling, silent push, collapse keys, or any outbound notification pipeline. Push is a shared, audited channel on every user's lock screen: getting it wrong leaks data, drains batteries, costs money in quota overages, and erodes the ability to deliver future messages when providers throttle you.

## Audit Surface

- [ ] Device tokens stored in plaintext instead of encrypted at rest
- [ ] No token invalidation flow on uninstall, logout, or reinstall
- [ ] Code sends per-device in a loop instead of using multicast / batched send
- [ ] Silent push used for frequent polling (battery + quota drain)
- [ ] Missing collapse_key / apns-collapse-id for coalescable notifications
- [ ] No retry with backoff on transient FCM/APNs errors
- [ ] VAPID keys or APNs credentials committed to the repository
- [ ] APNs certificate / p8 key expiry not monitored
- [ ] No notification deduplication across channels (push + email + SMS)
- [ ] Opt-out / unsubscribe does not remove or mark the token
- [ ] Sensitive data (2FA codes, PII) in notification payload visible on lock screen
- [ ] Token upload endpoint unauthenticated or unvalidated
- [ ] Delivery-feedback codes (Unregistered, InvalidToken) not processed
- [ ] Topic subscription lacks server-side authorization check
- [ ] Scheduling ignores user timezone / quiet hours
- [ ] No rate limit per user on notification send (harassment vector)

## Detailed Checks

### Device Token Lifecycle
<!-- activation: keywords=["device_token", "registration_token", "fcm_token", "apns_token", "unregister", "InvalidRegistration", "Unregistered", "NotRegistered"] -->

- [ ] **Tokens stored plaintext**: device tokens sitting unencrypted in a database -- a dump leaks a population-level push channel. Encrypt at rest (column encryption or KMS envelope).
- [ ] **No token invalidation on logout/uninstall**: old tokens never expire in your store -- you keep trying to push to users who can no longer receive, wasting quota and degrading delivery reputation.
- [ ] **Feedback codes ignored**: FCM returns `NotRegistered`, APNs returns `Unregistered` / 410 -- code does not mark those tokens invalid. Tokens must be removed on these codes or on APNs feedback service responses.
- [ ] **Duplicate tokens per user not deduplicated**: users with multiple devices accumulate stale tokens -- dedupe by (user_id, token) and age out unused tokens (e.g., 270 days for FCM).
- [ ] **Token-upload endpoint unauthenticated**: any client can POST an arbitrary token into your store -- attacker seeds your push list and either floods themselves or causes misdelivery.

### Batch and Multicast Sending
<!-- activation: keywords=["sendMulticast", "sendAll", "topic", "loop", "for each", "per device"] -->

- [ ] **Per-device send loop**: `for token in tokens: messaging.send(...)` -- each call is a separate HTTP round-trip. Use `sendMulticast` / `sendEach` (FCM, 500/call) or persistent HTTP/2 connection with APNs; batches reduce latency and avoid throttling.
- [ ] **Topic fan-out without authorization**: clients subscribe to arbitrary topics (`news_<user_id>`) without server verifying the subscription corresponds to the authenticated user -- topic hijack allows eavesdropping on others' notifications.
- [ ] **Sequential awaits blocking the event loop**: one slow provider response serialized per token -- parallelize with bounded concurrency (e.g., 50 at a time) when multicast is not available.

### Silent Push and Background Abuse
<!-- activation: keywords=["silent push", "content-available", "background fetch", "apns-push-type", "priority", "high-priority"] -->

- [ ] **Silent push used for polling**: frequent `content-available:1` messages to drive background fetch -- drains battery, triggers user complaints, and both APNs and Play policies restrict it. Use server push for real events only; for polling use a scheduled background task.
- [ ] **Silent push without `apns-push-type: background`**: APNs rejects or deprioritizes silent sends missing the explicit push type header on the modern HTTP/2 API.
- [ ] **High priority on non-user-visible pushes**: all pushes sent at priority 10 -- degrades delivery reputation. Priority 5 for opportunistic, 10 only for immediate user-visible alerts.
- [ ] **Silent-push rate not capped**: APNs budgets silent pushes per device per day; exceeding the budget causes silent drops. Track and throttle.

### Collapse Keys and Deduplication
<!-- activation: keywords=["collapse_key", "apns-collapse-id", "dedupe", "idempotency", "notification_id"] -->

- [ ] **Missing collapse key on coalescable messages**: when a device reconnects, every queued notification delivers -- for example 40 "new message" alerts. Use `collapse_key` (FCM) / `apns-collapse-id` (APNs) so only the latest of a logical group is delivered.
- [ ] **No cross-channel dedupe**: an event triggers push + email + SMS with no dedupe id -- user gets triple-notified, and idempotent retries multiply the count.
- [ ] **Retry without idempotency key**: transient failure retry re-sends the same notification without a logical key -- the client may surface it twice if the first eventually delivered.

### Credential and Key Hygiene
<!-- activation: keywords=["VAPID", "p8", "apns_key", "service-account", "firebase-adminsdk", "private_key"] -->

- [ ] **VAPID private keys in repo**: `applicationServerKey` private half or generated keypair files committed to source -- rotate and move to a secret manager.
- [ ] **APNs p8 auth key or p12 certificate in source**: the signing material for Apple push embedded in the codebase or Docker image -- stolen key allows any party to push to your users. Store in a secret manager and inject at runtime.
- [ ] **Firebase service-account JSON in repo**: `firebase-adminsdk-*.json` checked in -- this grants broad admin on the project, not just messaging.
- [ ] **Certificate/key expiry not monitored**: APNs certificates expire yearly, p8 keys can be rotated but must be tracked -- add an alert 30 days before expiry.
- [ ] **Keys not rotated on employee offboarding**: same service-account key reused for years across staff turnover -- rotate on personnel change per sec-secrets-management-and-rotation.

### Retry, Throttling, and Transient Failure
<!-- activation: keywords=["retry", "backoff", "429", "503", "Unavailable", "quota", "throttle"] -->

- [ ] **No retry on 429/5xx**: transient FCM/APNs errors surface as permanent failures -- add retry with exponential backoff and honor `Retry-After` when provided.
- [ ] **Retry without backoff**: immediate retry on throttling compounds the problem -- see reliability-retry-with-backoff.
- [ ] **No dead-letter for permanent failures**: non-retryable errors (invalid token, quota exceeded) silently dropped instead of surfaced to operators.
- [ ] **Quota limits not tracked**: FCM/APNs per-project quotas hit in production without warning -- instrument send-rate and errors per minute.

### Payload Privacy and Content
<!-- activation: keywords=["title", "body", "alert", "subtitle", "data", "payload", "mutable-content", "notification"] -->

- [ ] **Sensitive content in visible fields**: 2FA codes, medical conditions, balance details, or full names in `title`/`body` -- shown on lock screen and in notification shades. Use opaque "New message" and require app unlock to view.
- [ ] **PII in data payload without transport assurance**: notification data fields routed through Google/Apple servers -- providers see plaintext. Encrypt user-specific data in payload or send only an id that the app uses to fetch over TLS.
- [ ] **Unencrypted WebPush payload**: WebPush spec supports encryption; sending plaintext through unknown relay services exposes content.
- [ ] **Notification content not localized**: body strings hardcoded in English -- violates user language preferences.

### Unsubscribe, Opt-Out, and User Controls
<!-- activation: keywords=["unsubscribe", "opt-out", "preferences", "quiet hours", "do not disturb"] -->

- [ ] **Opt-out not propagated to provider**: user toggles off in-app, but token is still used -- either delete the token or gate sends on a server-side preference.
- [ ] **No per-category preferences**: single on/off switch for all notification types -- user cannot opt out of marketing while keeping transactional.
- [ ] **Quiet hours / timezone ignored**: scheduled campaign sent at 3am in the user's local time -- respect per-user timezone and quiet hours.
- [ ] **Transactional pushes disguised as marketing**: consent collected only for marketing but code also gates transactional -- a required password-reset push is blocked by a marketing opt-out.

## Common False Positives

- **Test/dev environments**: fixtures with sample tokens and mock keys are expected; flag only production paths or committed real credentials.
- **FCM admin SDK with Application Default Credentials**: when ADC is configured via environment (not committed JSON), hardcoded key warnings do not apply.
- **Enterprise MDM push channels**: some fleet-management tools intentionally use silent push for heartbeat; flag only when battery/quota impact is plausible at user scale.
- **One-off administrative pushes**: sending to a handful of internal test tokens in a loop is not a batching violation.

## Severity Guidance

| Finding | Severity |
|---|---|
| VAPID/p8/service-account credentials committed to source | Critical |
| Sensitive PII (2FA code, medical, financial) in notification payload | Critical |
| Token-upload endpoint unauthenticated (spam vector) | Critical |
| Opt-out / unsubscribe not enforced before send | Critical |
| Device tokens stored in plaintext | Important |
| Per-device send loop instead of multicast (quota + latency) | Important |
| Silent push used for polling (battery drain, policy risk) | Important |
| Missing collapse_key / apns-collapse-id on coalescable sends | Important |
| No retry with backoff on transient provider errors | Important |
| Feedback codes (Unregistered) not processed -- stale tokens persist | Important |
| APNs certificate / p8 key expiry not monitored | Important |
| No cross-channel dedupe key | Important |
| Quiet hours / timezone ignored for scheduled sends | Minor |
| No per-category preferences | Minor |

## See Also

- `sec-secrets-management-and-rotation` -- VAPID, p8, and FCM service-account keys fall under the same rotation rules
- `reliability-retry-with-backoff` -- push providers require backoff and Retry-After respect
- `reliability-idempotency` -- cross-channel dedupe keys are an idempotency application
- `compliance-gdpr-data-subject-rights` -- notification opt-out and erasure must remove tokens
- `principle-feature-flags-and-config` -- per-category preferences and quiet hours are config surfaces

## Authoritative References

- [Apple, "Sending notification requests to APNs" (2024)](https://developer.apple.com/documentation/usernotifications/sending_notification_requests_to_apns)
- [Firebase, "Cloud Messaging server concepts"](https://firebase.google.com/docs/cloud-messaging/concept-options)
- [RFC 8030, "Generic Event Delivery Using HTTP Push" (WebPush)](https://www.rfc-editor.org/rfc/rfc8030.html)
- [RFC 8291, "Message Encryption for Web Push"](https://www.rfc-editor.org/rfc/rfc8291.html)
- [Mozilla, "Sending VAPID identified push messages"](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
