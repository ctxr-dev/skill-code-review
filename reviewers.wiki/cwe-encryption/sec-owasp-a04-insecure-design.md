---
id: sec-owasp-a04-insecure-design
type: primary
depth_role: leaf
focus: Detect missing security controls that stem from flawed design -- absent rate limiting, business logic flaws, missing trust boundaries, and insufficient resource constraints
parents:
  - index.md
covers:
  - Missing rate limiting on authentication, password reset, and OTP verification endpoints
  - No account lockout or exponential backoff after repeated failed login attempts
  - Business logic flaws allowing negative quantities, zero-cost purchases, or race conditions in financial operations
  - Missing trust boundary enforcement between application tiers or microservices
  - "No input validation at trust boundaries (API gateway to service, service to service)"
  - "Unlimited resource allocation: file upload size, query result count, batch operation size"
  - Credential recovery flows that reveal whether an account exists
  - "Missing re-authentication for sensitive operations (password change, email change, fund transfer)"
  - "Race conditions in check-then-act patterns (TOCTOU) for authorization or inventory"
  - Insufficient anti-automation controls on user registration and form submission
tags:
  - owasp
  - insecure-design
  - rate-limiting
  - business-logic
  - race-condition
  - trust-boundary
  - resource-limits
  - TOCTOU
  - CWE-799
  - CWE-770
  - CWE-307
  - CWE-362
  - CWE-840
activation:
  file_globs:
    - "**/*auth*"
    - "**/*login*"
    - "**/*password*"
    - "**/*reset*"
    - "**/*register*"
    - "**/*signup*"
    - "**/*payment*"
    - "**/*transfer*"
    - "**/*checkout*"
    - "**/*order*"
    - "**/*upload*"
    - "**/*rate*limit*"
    - "**/*throttle*"
    - "**/*config*"
  keyword_matches:
    - rate
    - limit
    - throttle
    - lockout
    - attempt
    - retry
    - login
    - password
    - reset
    - upload
    - size
    - quantity
    - price
    - amount
    - balance
    - transfer
    - boundary
    - trust
    - idempotent
    - captcha
    - otp
    - verification
    - brute
    - cooldown
    - backoff
  structural_signals:
    - Authentication handler without rate-limiting middleware
    - Numeric input from user without bounds checking
    - Read-check-write without atomic operation
    - File upload handler without size constraint
    - Endpoint returning all results without pagination
source:
  origin: file
  path: sec-owasp-a04-insecure-design.md
  hash: "sha256:1b03476f5150625d3fffe16699f8a715eeeac2f249ad32ceabb0f8fb04c2a2e3"
---
# Insecure Design (OWASP A04:2021)

## When This Activates

Activates when diffs touch authentication flows, password reset, registration, payment/financial operations, file uploads, API pagination, or any code at a trust boundary. Insecure design is a category new to OWASP 2021 that focuses on flaws in the design itself -- not implementation bugs, but missing controls. The difference between insecure design and insecure implementation: a perfectly implemented login form is still insecure if the design omitted rate limiting. These issues cannot be fixed with better code alone; they require adding missing security controls.

**Primary CWEs**: CWE-799 (Improper Control of Interaction Frequency), CWE-770 (Allocation of Resources Without Limits), CWE-307 (Improper Restriction of Excessive Authentication Attempts), CWE-362 (Race Condition), CWE-840 (Business Logic Errors).

## Audit Surface

- [ ] Authentication endpoint without rate limiting middleware or configuration
- [ ] Login handler with no failed-attempt counter, lockout, or delay mechanism
- [ ] Password reset or OTP endpoint allowing unlimited guessing attempts
- [ ] Numeric input (quantity, price, amount) accepted without range validation
- [ ] Financial operation (transfer, purchase, refund) without idempotency or double-submit guard
- [ ] Race condition: read-check-write without atomic operation or lock
- [ ] File upload endpoint with no size limit or file count limit
- [ ] API endpoint returning unbounded result sets (no pagination, no max limit)
- [ ] Trust boundary crossing (external to internal) without input re-validation
- [ ] Sensitive operation (password change, delete account, transfer) without re-authentication
- [ ] Account enumeration via distinct error messages for valid vs. invalid usernames
- [ ] Registration or contact form with no CAPTCHA or anti-bot mechanism
- [ ] Batch or bulk API with no limit on items per request
- [ ] Coupon or discount code endpoint without single-use or rate enforcement
- [ ] Webhook or callback registration with no verification of ownership
- [ ] Missing idempotency key on payment or state-mutation endpoints
- [ ] Feature accessible without step-up authentication when risk level changes
- [ ] API that trusts client-side computed totals, prices, or permissions

## Detailed Checks

### Rate Limiting and Brute-Force Protection (CWE-307, CWE-799)
<!-- activation: keywords=["login", "authenticate", "sign_in", "password", "otp", "verify", "token", "reset", "rate", "limit", "throttle", "attempt", "lockout", "cooldown", "backoff", "brute"] -->

- [ ] **Login endpoint rate limiting**: verify that the login endpoint has rate limiting applied -- either middleware (express-rate-limit, Django Ratelimit, rack-attack, Spring rate limiter) or an external layer (API gateway, WAF, Cloudflare). The absence of any rate limiting on login is always a finding
- [ ] **Account lockout or progressive delay**: after N failed attempts (typically 5-10), the account should be temporarily locked, subject to increasing delay, or require CAPTCHA. Flag login handlers that compare passwords but have no failed-attempt tracking
- [ ] **OTP/verification code brute-force**: OTP endpoints (SMS verification, email verification, 2FA) must be rate-limited and the code must expire quickly (5-10 minutes). A 6-digit OTP with no rate limit can be brute-forced in minutes
- [ ] **Password reset rate limiting**: password reset request endpoints must be rate-limited per IP and per account to prevent abuse (email bombing, enumeration). The reset token must be single-use and time-limited
- [ ] **API key or token endpoint**: endpoints that issue tokens, API keys, or sessions must be rate-limited to prevent credential stuffing and brute-force attacks

### Business Logic Validation (CWE-840)
<!-- activation: keywords=["quantity", "price", "amount", "total", "balance", "transfer", "refund", "discount", "coupon", "credit", "debit", "purchase", "checkout", "order", "cart", "payment"] -->

- [ ] **Negative and zero values**: flag financial operations that accept quantity, price, or amount from user input without enforcing positive-value constraints. A negative quantity in an order can produce a negative total, effectively crediting the attacker's account
- [ ] **Client-side price trust**: flag server-side code that uses a price, total, or discount amount sent from the client without re-computing it server-side from the product catalog. The server must be the source of truth for all monetary values
- [ ] **Coupon and discount abuse**: flag coupon redemption endpoints without single-use enforcement (per-coupon or per-user), stacking prevention (multiple coupons producing >100% discount), or rate limiting (automated code guessing)
- [ ] **Refund and reversal logic**: flag refund operations that do not verify the original transaction status, amount, and ownership -- refunding more than was paid, refunding an already-refunded transaction, or refunding to a different account are business logic vulnerabilities
- [ ] **Inventory and balance race conditions**: flag check-then-act patterns on shared quantities (inventory stock, account balance) without atomic operations (database transactions with SELECT FOR UPDATE, compare-and-swap, optimistic locking). Two concurrent requests can each pass the availability check and overdraw

### Race Conditions and TOCTOU (CWE-362)
<!-- activation: keywords=["lock", "mutex", "synchronized", "atomic", "transaction", "SELECT FOR UPDATE", "compare", "swap", "CAS", "optimistic", "pessimistic", "concurrent", "parallel", "thread", "async", "await"] -->

- [ ] **Check-then-act without atomicity**: flag patterns where a value is read, a condition is checked, and then an action is taken in separate non-atomic steps -- e.g., `if balance >= amount: balance -= amount` without a transaction or lock. Two concurrent requests can both pass the check
- [ ] **File-based TOCTOU**: flag code that checks file existence or permissions and then operates on the file in a separate call -- between the check and the operation, the file can be replaced (symlink race)
- [ ] **Double-submit without idempotency**: flag state-mutation endpoints (payment, order placement, account creation) without idempotency keys or double-submit protection. Network retries and user double-clicks can cause duplicate processing
- [ ] **Optimistic locking not enforced**: flag update operations on entities where concurrent modification is possible but no version column or ETag check is present -- last-write-wins silently overwrites concurrent changes

### Resource Exhaustion Controls (CWE-770)
<!-- activation: keywords=["upload", "file", "size", "limit", "max", "page", "offset", "batch", "bulk", "stream", "buffer", "timeout", "memory", "allocation", "queue"] -->

- [ ] **Unbounded file upload**: flag file upload endpoints without server-enforced size limits (not just client-side validation). Missing limits enable denial of service through disk exhaustion. Check for both individual file size and total upload size
- [ ] **Unbounded query results**: flag database queries or API endpoints that return all matching results without pagination (LIMIT/OFFSET, cursor-based) or a maximum result count. An attacker can request millions of records, exhausting memory and bandwidth
- [ ] **Unbounded batch operations**: flag bulk/batch API endpoints that accept unlimited items per request -- a single request with 1 million items can consume all server resources. Enforce a max batch size (typically 100-1000)
- [ ] **Missing request timeouts**: flag HTTP clients or database queries without explicit timeouts -- a slow or unresponsive dependency can hold connections indefinitely, leading to resource exhaustion
- [ ] **Recursive or deeply nested input**: flag JSON/XML parsers that accept arbitrary nesting depth from user input -- deeply nested structures cause stack overflow or excessive memory allocation (billion laughs, zip bomb equivalent)

### Trust Boundary Enforcement
<!-- activation: keywords=["gateway", "proxy", "internal", "external", "microservice", "service", "boundary", "validate", "sanitize", "schema", "contract", "API", "gRPC", "message", "event", "queue", "consumer"] -->

- [ ] **Missing re-validation at service boundary**: flag microservice endpoints that trust input from other services without validation. Even internal services can be compromised or send malformed data due to bugs. Validate at every trust boundary
- [ ] **API gateway bypass**: flag internal service endpoints that are accessible on the public network without going through the API gateway -- if the gateway enforces rate limiting, auth, and validation, bypassing it removes all controls
- [ ] **Message queue consumer without validation**: flag event/message consumers that deserialize and process messages without schema validation -- a compromised or buggy producer can send malformed or malicious payloads
- [ ] **Client-provided identity trusted**: flag code that uses a user ID, tenant ID, or role from the request body instead of extracting it from the verified session or token -- the client-provided identity is attacker-controlled

### Authentication Flow Weaknesses
<!-- activation: keywords=["register", "signup", "forgot", "reset", "recover", "verify", "confirm", "email", "phone", "sms", "otp", "2fa", "mfa", "re-auth", "step-up", "session", "remember"] -->

- [ ] **Account enumeration**: flag login, registration, and password reset endpoints that return different messages for "user exists" vs. "user does not exist." Use generic messages: "If an account exists, a reset email has been sent"
- [ ] **Missing re-authentication**: flag sensitive operations (change password, change email, delete account, large financial transfers) that do not require the user to re-enter their current password or complete a 2FA challenge
- [ ] **Weak password reset tokens**: flag password reset flows where the token is short (< 32 bytes), predictable (sequential, timestamp-based), or does not expire within a reasonable window (15-60 minutes)
- [ ] **Session fixation**: flag authentication flows that do not regenerate the session ID after successful login -- an attacker who sets a session cookie before login can hijack the authenticated session
- [ ] **Remember-me without controls**: flag persistent login tokens that do not expire, are not bound to the device, or are not revoked on password change

## Common False Positives

- **Rate limiting at infrastructure layer**: rate limiting may be enforced by an API gateway, WAF, load balancer, or CDN rather than in application code. Verify the infrastructure configuration exists and covers the endpoint in question.
- **Atomic operations in the database**: some databases handle atomicity implicitly (e.g., single-row UPDATE in PostgreSQL is atomic). A `UPDATE accounts SET balance = balance - amount WHERE balance >= amount` is atomic and safe without an explicit transaction. Flag only when the atomicity depends on multiple statements.
- **Intentionally public enumeration**: some systems intentionally allow username/email checking (e.g., social media "is this username taken?"). Valid when the system is designed for public profiles, not for services where account existence is sensitive.
- **Internal admin tools with network-level controls**: internal tools behind VPN/bastion host may legitimately skip rate limiting and CAPTCHA. Valid only when network access control is enforced and documented.
- **Event sourcing / CQRS**: in event-sourced systems, the "check-then-act" may be handled by event ordering guarantees in the event store. Verify the event store provides the concurrency control claimed.

## Severity Guidance

| Finding | Severity |
|---|---|
| Login endpoint with no rate limiting or lockout mechanism | Critical |
| Financial operation without idempotency or atomic balance check | Critical |
| OTP/verification endpoint allowing unlimited guessing attempts | Critical |
| Race condition in check-then-act on account balance or inventory | Critical |
| Server-side code trusting client-computed price or total | Critical |
| Password reset token that does not expire or is predictable | Important |
| File upload endpoint with no server-enforced size limit | Important |
| API returning unbounded result sets without pagination | Important |
| Account enumeration via distinct error messages on login/reset | Important |
| Missing re-authentication for password change or email change | Important |
| Sensitive operation without step-up authentication | Important |
| Bulk API endpoint with no max items-per-request limit | Important |
| Missing request timeout on external HTTP or database call | Minor |
| Registration form without CAPTCHA (low-value target) | Minor |
| Optimistic locking absent on non-critical entity updates | Minor |

## See Also

- `principle-fail-fast` -- failing fast on invalid input at trust boundaries prevents business logic exploitation
- `principle-separation-of-concerns` -- rate limiting, idempotency, and validation are cross-cutting concerns that should be handled by middleware, not scattered through business logic
- `principle-solid` -- the Single Responsibility Principle helps ensure each component enforces its own invariants
- `sec-owasp-a01-broken-access-control` -- insecure design often manifests as missing access controls
- `sec-owasp-a03-injection` -- missing input validation at trust boundaries enables injection

## Authoritative References

- [OWASP Top 10:2021 - A04 Insecure Design](https://owasp.org/Top10/A04_2021-Insecure_Design/)
- [OWASP Application Security Verification Standard (ASVS) v4.0](https://owasp.org/www-project-application-security-verification-standard/)
- [OWASP Threat Modeling Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html)
- [CWE-307: Improper Restriction of Excessive Authentication Attempts](https://cwe.mitre.org/data/definitions/307.html)
- [CWE-362: Concurrent Execution Using Shared Resource with Improper Synchronization](https://cwe.mitre.org/data/definitions/362.html)
- [CWE-770: Allocation of Resources Without Limits or Throttling](https://cwe.mitre.org/data/definitions/770.html)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)
