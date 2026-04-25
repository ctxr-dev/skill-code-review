---
id: compliance-pci-dss
type: primary
depth_role: leaf
focus: Detect PCI DSS v4.0 violations including cardholder data exposure in code and logs, missing encryption at rest and in transit, insecure key management, absent audit logging for card operations, and prohibited data storage
parents:
  - index.md
covers:
  - "Primary Account Number (PAN) logged or written to debug output"
  - CVV, CVV2, or PIN block stored after authorization
  - Full magnetic stripe data retained in any storage
  - Cardholder data transmitted without TLS 1.2+
  - PAN stored without encryption or truncation or tokenization
  - Encryption keys for cardholder data stored alongside the data
  - Test card numbers embedded in production code paths
  - Missing audit logging for cardholder data access or modification
  - Cardholder data written to caches, temp files, or search indices
  - PAN displayed in full without masking in UI or API responses
  - Insecure key management lacking split knowledge or dual control
  - Missing network segmentation signals in service configuration
tags:
  - pci-dss
  - payment
  - cardholder-data
  - credit-card
  - encryption
  - compliance
  - CWE-311
  - CWE-312
  - CWE-319
activation:
  file_globs:
    - "**/*payment*"
    - "**/*card*"
    - "**/*checkout*"
    - "**/*billing*"
    - "**/*stripe*"
    - "**/*braintree*"
    - "**/*adyen*"
    - "**/*transaction*"
    - "**/*merchant*"
    - "**/*pan*"
    - "**/*cvv*"
  keyword_matches:
    - card_number
    - cardNumber
    - pan
    - cvv
    - cvv2
    - cvc
    - credit_card
    - cardholder
    - card_holder
    - payment
    - stripe
    - braintree
    - adyen
    - "4111111111111111"
    - "5500000000000004"
    - track_data
    - magnetic_stripe
    - pin_block
    - encryption_key
    - tokenize
  structural_signals:
    - Payment processing function or handler
    - Database schema with card number or payment columns
    - API endpoint handling checkout or billing
    - Encryption or decryption of card data
source:
  origin: file
  path: compliance-pci-dss.md
  hash: "sha256:62d1f10fc8d2bf600d0524c251b85c14ae2d0c993e65c4c73a246eb2706cef6f"
---
# PCI DSS v4.0 Compliance

## When This Activates

Activates when diffs touch payment processing, card handling, billing, checkout, or transaction logic. PCI DSS v4.0 mandates strict controls over cardholder data (CHD) throughout its lifecycle. Code-level violations -- storing prohibited data, logging PANs, transmitting CHD without encryption, or missing audit trails -- create compliance gaps that can result in fines, breach liability, and loss of card processing privileges.

**Primary CWEs**: CWE-311 (Missing Encryption of Sensitive Data), CWE-312 (Cleartext Storage of Sensitive Information), CWE-319 (Cleartext Transmission of Sensitive Information).

## Audit Surface

- [ ] PAN (13-19 digit card number) present in log statements
- [ ] CVV, CVV2, CVC, or CID value stored in database column or file
- [ ] PIN or encrypted PIN block persisted after transaction authorization
- [ ] Full magnetic stripe or track data retained in any form
- [ ] Cardholder data sent over HTTP instead of HTTPS
- [ ] TLS version below 1.2 configured for cardholder data channels
- [ ] PAN stored in database without column-level encryption or tokenization
- [ ] Encryption key for card data in same database or config file as encrypted data
- [ ] Hardcoded test card numbers (4111111111111111 etc.) in non-test source
- [ ] Cardholder data access or modification with no audit log call
- [ ] PAN written to application cache (Redis, Memcached) without encryption
- [ ] PAN in URL query parameters or GET request strings
- [ ] API response returning full unmasked PAN
- [ ] Missing key rotation mechanism for data-encrypting keys
- [ ] Cardholder data environment mixed with general-purpose services
- [ ] Error message or exception output containing card numbers

## Detailed Checks

### Prohibited Data Storage (Req 3.3, 3.4)
<!-- activation: keywords=["cvv", "cvv2", "cvc", "cid", "pin_block", "track_data", "magnetic_stripe", "track1", "track2"] -->

- [ ] **CVV/CVC stored after authorization**: flag any database column, file write, or cache operation that persists CVV, CVV2, CVC, or CID values after the authorization response is received. PCI DSS absolutely prohibits post-authorization storage of card verification codes regardless of encryption
- [ ] **PIN or PIN block persisted**: flag storage of PIN values or encrypted PIN blocks after transaction completion. PINs must exist in memory only during the authorization request lifecycle
- [ ] **Full track data retained**: flag any code that writes magnetic stripe track 1 or track 2 data to storage. Full track data must never be stored after authorization even if encrypted
- [ ] **Sensitive auth data in backups or replicas**: flag cardholder data tables replicated or backed up without verifying that prohibited fields (CVV, PIN) are excluded from the backup scope

### PAN Exposure in Logs and Errors (Req 3.4, 10.3)
<!-- activation: keywords=["log", "logger", "print", "console", "debug", "error", "exception", "card_number", "cardNumber", "pan"] -->

- [ ] **PAN in log output**: flag log statements that interpolate card numbers, either directly or through object serialization that includes PAN fields. Search for patterns like `log.*card`, `logger.*pan`, `console.*number` in payment contexts
- [ ] **PAN in error messages**: flag exception handlers or error response builders that include card number values. Stack traces and error payloads must mask or exclude PANs
- [ ] **PAN in URLs**: flag any code that places card numbers in URL paths, query parameters, or fragment identifiers. URLs are logged by web servers, proxies, and browsers. Cross-reference with `sec-owasp-a09-logging-monitoring-failures`
- [ ] **Full PAN in API responses**: flag API responses that return complete unmasked PANs. Display the first six and last four digits at most (BIN + last four). Apply masking at the serialization layer

### Encryption at Rest and in Transit (Req 3.5, 4.2)
<!-- activation: keywords=["encrypt", "decrypt", "AES", "TLS", "SSL", "http://", "storage", "database", "column"] -->

- [ ] **PAN stored without encryption**: flag database schemas or ORM models where card number columns lack encryption, tokenization, or truncation. PCI DSS requires rendering PAN unreadable anywhere it is stored
- [ ] **TLS below 1.2**: flag TLS configuration allowing versions below 1.2 on channels carrying cardholder data. SSLv3, TLS 1.0, and TLS 1.1 are explicitly prohibited by PCI DSS v4.0
- [ ] **HTTP for cardholder data**: flag any endpoint transmitting cardholder data over plain HTTP. All CHD must transit encrypted channels. Cross-reference with `sec-secrets-management-and-rotation`

### Key Management (Req 3.6, 3.7)
<!-- activation: keywords=["key", "encryption_key", "dek", "kek", "rotate", "key_management", "split_knowledge", "dual_control"] -->

- [ ] **Key stored with encrypted data**: flag encryption keys for cardholder data stored in the same database, configuration file, or deployment artifact as the encrypted data. Keys must be managed separately, ideally in an HSM or KMS
- [ ] **No key rotation mechanism**: flag encryption key usage without evidence of rotation logic or key versioning. PCI DSS requires cryptoperiod limits and documented rotation procedures
- [ ] **Missing split knowledge**: flag key management code where a single administrator or process has access to the complete key. Req 3.6.1.2 requires split knowledge and dual control for manual key operations

### Audit Logging for Card Operations (Req 10.2)
<!-- activation: keywords=["audit", "log", "access", "modify", "create", "delete", "transaction", "payment"] -->

- [ ] **No audit trail for CHD access**: flag functions that read or decrypt cardholder data without emitting an audit log entry including who accessed the data, when, and from where
- [ ] **No audit trail for CHD modification**: flag create, update, or delete operations on cardholder data without corresponding audit events. Cross-reference with `sec-owasp-a09-logging-monitoring-failures`
- [ ] **Audit log tampering risk**: flag audit log implementations where the application writing CHD can also modify or delete its own audit entries

### Test Data in Production Code (Req 6.5)
<!-- activation: keywords=["4111111111111111", "5500000000000004", "378282246310005", "test_card", "test_pan", "sandbox"] -->

- [ ] **Test card numbers in production paths**: flag well-known test PANs (4111111111111111, 5500000000000004, 378282246310005, 6011111111111117) in code that is not gated behind test/sandbox configuration. Test data in production creates both compliance and functional risk
- [ ] **Sandbox credentials in production config**: flag payment gateway sandbox API keys or test merchant IDs in production configuration files

## Common False Positives

- **Tokenized references**: variables named `card_token` or `payment_token` that hold tokenized references (not raw PANs) from payment processors like Stripe or Braintree.
- **Last-four display**: code displaying only the last four digits of a card number for user identification is compliant and expected.
- **Payment gateway SDK calls**: calls to PCI-compliant payment SDKs that handle card data server-side without the application touching raw PANs.
- **Test files**: test card numbers in test directories or files gated by test environment checks are acceptable.
- **PAN-like numbers**: 13-19 digit numbers that are not card numbers (order IDs, timestamps, phone numbers).

## Severity Guidance

| Finding | Severity |
|---|---|
| CVV, PIN, or track data stored after authorization | Critical |
| PAN stored without encryption, truncation, or tokenization | Critical |
| PAN in log output or error messages | Critical |
| Cardholder data transmitted over HTTP or TLS < 1.2 | Critical |
| Encryption key stored alongside encrypted cardholder data | Important |
| No audit logging for cardholder data access | Important |
| Test card numbers in production code paths | Important |
| Full PAN returned in API response | Important |
| Missing key rotation mechanism | Minor |
| Cardholder data environment not segmented | Minor |

## See Also

- `sec-secrets-management-and-rotation` -- payment gateway keys and merchant credentials management
- `sec-owasp-a09-logging-monitoring-failures` -- general sensitive data in logs including card data
- `crypto-password-hashing-argon2-scrypt-bcrypt` -- related credential storage controls
- `compliance-pii-handling-and-minimization` -- cardholder data is a subset of PII
- `compliance-soc2` -- SOC 2 trust service criteria overlap with PCI DSS controls
- `principle-encapsulation` -- cardholder data should be encapsulated in dedicated modules

## Authoritative References

- [PCI DSS v4.0 Standard](https://www.pcisecuritystandards.org/document_library/)
- [PCI DSS Quick Reference Guide v4.0](https://www.pcisecuritystandards.org/pdfs/pci_ssc_quick_guide.pdf)
- [CWE-311: Missing Encryption of Sensitive Data](https://cwe.mitre.org/data/definitions/311.html)
- [CWE-312: Cleartext Storage of Sensitive Information](https://cwe.mitre.org/data/definitions/312.html)
- [CWE-319: Cleartext Transmission of Sensitive Information](https://cwe.mitre.org/data/definitions/319.html)
- [OWASP Payment Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Payment_Gateway_Security_Cheat_Sheet.html)
