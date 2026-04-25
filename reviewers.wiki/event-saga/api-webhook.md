---
id: api-webhook
type: primary
depth_role: leaf
focus: Detect webhook implementation gaps including missing signature verification, no retry with backoff, absent idempotency handling, unconfigured timeouts, and no secret rotation
parents:
  - index.md
covers:
  - Incoming webhook without signature verification -- any caller can forge events
  - Outgoing webhook with no retry and exponential backoff on failure
  - Webhook handler not idempotent -- redelivered events cause duplicate processing
  - Webhook sender with no timeout -- hung receiver blocks the sender
  - Webhook secret hardcoded or never rotated
  - Webhook payload lacking event type discriminator
  - No dead letter or failure tracking for undeliverable webhooks
  - Webhook endpoint exposed without rate limiting
  - Missing webhook event logging for audit and debugging
  - Outgoing webhook with no payload size limit
tags:
  - webhook
  - api
  - signature
  - hmac
  - retry
  - idempotency
  - timeout
  - secret-rotation
  - callback
activation:
  file_globs:
    - "**/*webhook*"
    - "**/*hook*"
    - "**/*callback*"
    - "**/*notify*"
    - "**/*dispatch*"
    - "**/*deliver*"
  keyword_matches:
    - webhook
    - hook
    - callback
    - signature
    - hmac
    - HMAC
    - verify
    - secret
    - payload
    - deliver
    - notify
    - retry
    - backoff
    - endpoint
  structural_signals:
    - Webhook handler endpoint definition
    - HMAC signature computation or verification
    - HTTP POST to user-registered callback URL
source:
  origin: file
  path: api-webhook.md
  hash: "sha256:c42695c71a2d9850a161c779a829096342b3b1120bd3db25dc1d524ba78889fb"
---
# Webhook API Design

## When This Activates

Activates when diffs touch webhook receiver endpoints, webhook sender/delivery logic, signature verification code, or webhook configuration. Webhooks are HTTP callbacks that push events to registered URLs. Both the sending and receiving sides have distinct security and reliability requirements. Receivers must verify that incoming requests are authentic (not forged), and senders must handle delivery failures gracefully. Without these controls, webhooks become vectors for injection attacks (forged events), data loss (unretried failures), and resource exhaustion (synchronous processing, no timeouts).

## Audit Surface

- [ ] Webhook receiver endpoint without HMAC signature verification on request body
- [ ] Webhook sender with no retry logic on HTTP failure responses
- [ ] Webhook handler performing non-idempotent operations without deduplication
- [ ] HTTP client sending webhook with no connect/read timeout configured
- [ ] Webhook signing secret stored in plaintext, hardcoded, or never rotated
- [ ] Webhook payload without event type field or version identifier
- [ ] Failed webhook deliveries not tracked, logged, or moved to a retry queue
- [ ] Webhook receiver endpoint without rate limiting
- [ ] Webhook receiver not returning 2xx quickly -- processing synchronously in the request
- [ ] Outgoing webhook payload containing sensitive data (PII, secrets, tokens)
- [ ] Webhook URL registered by user without validation or allowlisting
- [ ] No webhook delivery status dashboard or alerting
- [ ] Timestamp not included in signature to prevent replay attacks

## Detailed Checks

### Signature Verification (Receiving)
<!-- activation: keywords=["signature", "hmac", "HMAC", "verify", "hash", "sha256", "sha1", "digest", "sign", "X-Hub-Signature", "X-Signature", "Stripe-Signature", "secret"] -->

- [ ] **No signature verification**: flag webhook receiver endpoints that process the request body without verifying an HMAC signature or equivalent authentication -- any HTTP client can forge webhook events, triggering unintended actions (payments, account changes, data mutations). See `sec-owasp-a01-broken-access-control`
- [ ] **Timing-unsafe comparison**: flag signature verification that uses `==` or `equals()` for comparing the computed HMAC with the received signature -- use constant-time comparison (`hmac.compare_digest`, `crypto.timingSafeEqual`, `MessageDigest.isEqual`) to prevent timing attacks
- [ ] **No timestamp validation**: flag signature verification that does not check a timestamp in the signed payload -- without timestamp validation, an attacker can replay captured webhook requests indefinitely. Reject events older than 5 minutes
- [ ] **Weak hash algorithm**: flag webhook signature verification using MD5 or SHA-1 -- use SHA-256 or stronger. If the upstream provider mandates SHA-1 (e.g., legacy GitHub), note the limitation but do not block

### Retry and Delivery (Sending)
<!-- activation: keywords=["retry", "backoff", "exponential", "deliver", "send", "dispatch", "post", "http", "timeout", "status", "response", "queue", "failed"] -->

- [ ] **No retry on failure**: flag outgoing webhook delivery that does not retry on HTTP 4xx/5xx responses or network errors -- a single transient failure permanently loses the event. Implement retry with exponential backoff
- [ ] **No backoff**: flag retry logic with fixed intervals or immediate retries -- aggressive retries amplify load on a struggling receiver. Use exponential backoff with jitter (e.g., 1s, 2s, 4s, 8s, up to max)
- [ ] **No max retry limit**: flag retry configurations without a maximum attempt count -- after exhausting retries, move the event to a failed-deliveries store for manual retry or investigation
- [ ] **No timeout on delivery**: flag HTTP clients sending webhooks with no connect or read timeout -- a hung or slow receiver blocks the sender's delivery thread indefinitely
- [ ] **Synchronous delivery in request path**: flag webhook dispatching that happens synchronously within the original API request handler -- webhook delivery should be asynchronous (background job, queue) to avoid blocking the user's request

### Idempotency (Receiving)
<!-- activation: keywords=["idempotent", "idempotency", "dedup", "deduplicate", "duplicate", "eventId", "deliveryId", "messageId", "processed"] -->

- [ ] **Non-idempotent handler**: flag webhook handlers that perform state-changing operations (database writes, payment charges, inventory adjustments) without checking a delivery ID or event ID for deduplication -- webhook senders retry, so handlers will receive duplicates
- [ ] **No delivery ID in payload**: flag outgoing webhook payloads without a unique delivery or event ID -- receivers cannot deduplicate without a stable identifier
- [ ] **Synchronous processing before 2xx**: flag webhook receivers that perform full processing before returning a success response -- return 2xx immediately (acknowledging receipt), then process asynchronously. Long processing times cause senders to timeout and retry, creating duplicates

### Secret Management
<!-- activation: keywords=["secret", "key", "signing", "rotate", "rotation", "env", "config", "credential", "token"] -->

- [ ] **Hardcoded signing secret**: flag webhook signing secrets embedded in source code -- use environment variables or a secrets manager. See `sec-secrets-management-and-rotation`
- [ ] **No rotation mechanism**: flag webhook implementations with no support for secret rotation -- when a secret is compromised, both sender and receiver must transition to a new secret without downtime. Support dual-secret verification during rotation windows
- [ ] **Secret in URL**: flag webhook registration that embeds a secret token in the callback URL path or query parameter -- URL tokens appear in server logs, browser history, and proxy logs. Use header-based authentication

### Payload Design
<!-- activation: keywords=["payload", "body", "event", "type", "data", "schema", "json", "format", "size"] -->

- [ ] **Missing event type**: flag webhook payloads without an event type field or discriminator -- receivers need to route events to the correct handler without parsing the full body
- [ ] **Sensitive data in payload**: flag webhook payloads containing PII, credentials, or tokens -- webhook URLs are registered by external parties who may not be trusted. Send references (IDs, URLs) and let receivers fetch sensitive data via authenticated API calls
- [ ] **No payload size limit**: flag outgoing webhooks with no maximum payload size -- oversized payloads may exceed receiver capacity or violate platform limits

## Common False Positives

- **Internal webhooks on private network**: webhooks between internal services on a private network may rely on network-level security instead of HMAC. Valid only when the network boundary is enforced -- flag if reachable from outside.
- **Third-party webhook libraries**: libraries like `svix`, `standardwebhooks`, or `stripe-webhook` handle signature verification, retry, and idempotency internally. Verify the library is correctly configured rather than flagging missing manual implementation.
- **Webhook receiver as thin proxy**: a receiver that only enqueues the raw payload for later processing is intentionally simple. The idempotency and processing checks apply to the downstream consumer, not the receiver.
- **Development/testing endpoints**: webhook receivers in test fixtures or development environments may skip signature verification for convenience. Verify these are not deployed to production.

## Severity Guidance

| Finding | Severity |
|---|---|
| Webhook receiver with no signature verification on production endpoint | Critical |
| Hardcoded webhook signing secret in source code | Critical |
| Webhook handler processes payments/mutations without idempotency check | Critical |
| Signature comparison using timing-unsafe equality | Important |
| Outgoing webhook with no retry on failure | Important |
| No timeout configured on outgoing webhook HTTP calls | Important |
| No dead letter / failed delivery tracking for webhooks | Important |
| Webhook payload containing PII or secrets | Important |
| Missing timestamp validation in signature verification | Minor |
| Webhook payload without event type discriminator | Minor |
| No secret rotation mechanism | Minor |

## See Also

- `sec-owasp-a01-broken-access-control` -- missing webhook signature verification is an access control failure
- `sec-rate-limit-and-dos` -- webhook receiver endpoints need rate limiting to prevent abuse
- `sec-secrets-management-and-rotation` -- webhook signing secrets must be managed and rotated
- `principle-fail-fast` -- webhook receivers should acknowledge quickly and process asynchronously
- `api-async-event` -- webhooks are a form of async event delivery; schema evolution and idempotency rules apply
- `principle-coupling-cohesion` -- webhook payload design should be a stable public contract, not tightly coupled to internal models

## Authoritative References

- [Standard Webhooks Specification](https://www.standardwebhooks.com/)
- [Stripe Webhook Best Practices](https://stripe.com/docs/webhooks/best-practices)
- [GitHub Webhook Security](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries)
- [Svix -- Webhook Service and Best Practices](https://www.svix.com/resources/faq/webhook-best-practices/)
- [OWASP Webhook Security](https://cheatsheetseries.owasp.org/cheatsheets/Webhook_Security_Cheat_Sheet.html)
