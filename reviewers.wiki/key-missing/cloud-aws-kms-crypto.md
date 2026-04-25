---
id: cloud-aws-kms-crypto
type: primary
depth_role: leaf
focus: Detect KMS key misconfigurations including missing rotation, overly broad key policies, absent encryption context, and inefficient data key usage patterns
parents:
  - index.md
covers:
  - AWS-managed key used where customer-managed CMK is required
  - Missing automatic key rotation on symmetric CMK
  - "Overly broad KMS key policy granting kms:* or wide principal access"
  - "Missing encryption context on Encrypt/Decrypt calls"
  - Data key not cached causing excessive KMS API calls
  - "Missing key deletion protection (short deletion window)"
  - Cross-region key not replicated for disaster recovery
  - Key policy granting Decrypt without condition constraints
  - "Symmetric key used where asymmetric is needed (or vice versa)"
  - No key alias for human-readable identification
  - Encryption keys hardcoded in source code or configuration files
  - Keys stored in plaintext in configuration, environment defaults, or version control
  - Keys generated from predictable seeds or non-cryptographic PRNGs
  - Missing key rotation mechanism or rotation schedule
  - "Keys shared across environments (dev, staging, production)"
  - Symmetric keys transmitted in plaintext over the network
  - Asymmetric private keys committed to version control
  - Missing key destruction or zeroization on revocation
  - "Keys derived without proper KDF (HKDF, PBKDF2, argon2)"
  - Raw key material held in memory without zeroization after use
  - Missing envelope encryption pattern for data-at-rest keys
  - Key material logged, serialized, or exposed in error messages
tags:
  - aws
  - kms
  - encryption
  - cmk
  - data-key
  - key-rotation
  - envelope-encryption
  - encryption-context
  - cryptography
  - key-management
  - KMS
  - HSM
  - Vault
  - secrets
  - rotation
  - CWE-321
  - CWE-798
  - CWE-320
aliases:
  - crypto-key-management-kms-hsm-vault
activation:
  file_globs:
    - "**/*.tf"
    - "**/*.json"
    - "**/*.yaml"
    - "**/*.yml"
    - "**/cdk.*"
    - "**/*.py"
    - "**/*.ts"
    - "**/*.js"
    - "**/*.java"
    - "**/*.go"
  keyword_matches:
    - KMS
    - kms
    - CMK
    - key
    - encrypt
    - decrypt
    - GenerateDataKey
    - "aws:kms"
    - SSE-KMS
    - envelope
  structural_signals:
    - kms_key_policy
    - encryption_context_missing
    - data_key_not_cached
source:
  origin: file
  path: cloud-aws-kms-crypto.md
  hash: "sha256:0a0f1e2e7acb71ef1dc621b67578366ac385bc373a3c23da9ef5ee39e8c7534b"
---
# AWS KMS and Envelope Encryption

## When This Activates

Activates when diffs contain KMS key definitions, key policies, encryption/decryption API calls, or server-side encryption configuration referencing KMS. KMS is the foundation of encryption at rest and in transit across AWS services -- a misconfigured key policy can expose all encrypted data, missing rotation violates compliance requirements, and per-record GenerateDataKey calls can hit KMS throttling limits at scale.

## Audit Surface

- [ ] S3, EBS, RDS, or SQS encryption using `aws/service` managed key instead of CMK
- [ ] KMS key with `EnableKeyRotation` absent or false
- [ ] Key policy granting `Principal: "*"` or `kms:*` actions
- [ ] Encrypt/Decrypt call without `EncryptionContext` parameter
- [ ] GenerateDataKey called per-record without caching the data key
- [ ] ScheduleKeyDeletion with PendingWindowInDays below 14
- [ ] Multi-region workload using single-region KMS key
- [ ] Key policy granting `kms:Decrypt` without condition constraints
- [ ] KMS key without a key alias
- [ ] Grant created with no retiring principal
- [ ] Key policy missing re-encrypt permissions for key migration
- [ ] Symmetric key used where asymmetric key is appropriate

## Detailed Checks

### CMK vs AWS-Managed Key Selection
<!-- activation: keywords=["aws/s3", "aws/ebs", "aws/rds", "aws/sqs", "SSE-S3", "SSE-KMS", "ServerSideEncryption", "kms_key_id"] -->

- [ ] **AWS-managed key where CMK needed**: flag use of default `aws/service` keys (e.g., `aws/s3`, `aws/ebs`) for workloads requiring key policy control, cross-account access, or compliance audit trails -- AWS-managed keys cannot have custom policies or be rotated on demand
- [ ] **No encryption specified**: flag resources that support encryption at rest (S3 buckets, EBS volumes, RDS instances, SQS queues) with no encryption configuration at all
- [ ] **Wrong key type**: flag symmetric CMK used for digital signatures or asymmetric key used for envelope encryption -- symmetric keys cannot sign, and asymmetric keys cannot GenerateDataKey

### Key Rotation and Lifecycle
<!-- activation: keywords=["EnableKeyRotation", "rotation", "ScheduleKeyDeletion", "PendingWindowInDays", "DisableKey", "key_rotation"] -->

- [ ] **Missing rotation**: flag symmetric CMKs with `EnableKeyRotation` not set to true -- annual automatic rotation is a baseline compliance requirement (PCI DSS, HIPAA)
- [ ] **Short deletion window**: flag `ScheduleKeyDeletion` with `PendingWindowInDays` less than 14 days -- shorter windows increase risk of accidental permanent data loss; prefer 30 days
- [ ] **No deletion protection signal**: flag keys protecting critical data (RDS, S3) that could be deleted without safeguards -- consider tagging keys to prevent accidental deletion

### Key Policy and Access Control
<!-- activation: keywords=["KeyPolicy", "key_policy", "Principal", "kms:*", "kms:Decrypt", "kms:Encrypt", "Grant", "kms:CreateGrant"] -->

- [ ] **Overly broad key policy**: flag key policies granting `kms:*` to any principal -- separate encrypt and decrypt permissions to different roles
- [ ] **Principal: "*" on key policy**: flag key policies with wildcard principal -- this makes the key accessible to any IAM entity in the account (and potentially cross-account if conditions are missing)
- [ ] **Decrypt without conditions**: flag key policies granting `kms:Decrypt` without `kms:ViaService`, `aws:SourceArn`, or `kms:EncryptionContext` conditions -- an attacker with the IAM role can decrypt anything
- [ ] **Unrestricted grant creation**: flag grants created with no `RetiringPrincipal` or `Constraints` -- grants are hard to audit and can persist after the original need is gone

### Encryption Context and Envelope Encryption
<!-- activation: keywords=["EncryptionContext", "encryption_context", "GenerateDataKey", "envelope", "data_key", "Plaintext", "CiphertextBlob"] -->

- [ ] **Missing encryption context**: flag Encrypt, Decrypt, and GenerateDataKey calls without an `EncryptionContext` parameter -- encryption context provides authenticated additional data (AAD) and is essential for audit trails in CloudTrail
- [ ] **Data key not cached**: flag code that calls `GenerateDataKey` inside a loop or per-record -- KMS has a request-per-second quota (default 5,500-30,000 depending on region); cache the data key and reuse it for multiple encryptions
- [ ] **Plaintext data key not wiped**: flag code that stores the plaintext data key in a variable without clearing it after use -- the plaintext key should be used briefly and then zeroed out

### Cross-Region and Multi-Region Keys
<!-- activation: keywords=["multi-region", "MultiRegion", "ReplicaKey", "region", "cross-region", "disaster-recovery"] -->

- [ ] **Single-region key for multi-region workload**: flag workloads deployed across multiple regions that reference a KMS key in only one region -- if that region goes down, decryption fails; use multi-region keys or replicate keys
- [ ] **No replica key for DR**: flag disaster recovery configurations that do not include KMS key replication to the DR region

## Common False Positives

- **Non-sensitive data encryption**: AWS-managed keys are acceptable for non-sensitive workloads where custom key policy control is unnecessary (e.g., CloudWatch Logs default encryption).
- **Client-side encryption libraries**: applications using their own envelope encryption (e.g., AWS Encryption SDK with data key caching already configured) may call GenerateDataKey in patterns that look uncached but are handled by the SDK cache.
- **Asymmetric keys for JWT signing**: asymmetric KMS keys used for token signing legitimately do not need rotation if the signing algorithm supports key versioning at the application level.

## Severity Guidance

| Finding | Severity |
|---|---|
| Key policy with Principal: "*" and kms:* | Critical |
| Key policy granting kms:Decrypt without conditions | Critical |
| No encryption at rest on S3/RDS/EBS resource | Critical |
| Missing key rotation on symmetric CMK | Important |
| GenerateDataKey per-record without caching | Important |
| Missing encryption context on API calls | Important |
| Deletion window shorter than 14 days | Important |
| AWS-managed key where CMK is needed for compliance | Important |
| KMS key without alias | Minor |
| Single-region key for multi-region workload | Minor |

## See Also

- `crypto-key-management-kms-hsm-vault` -- broader key management patterns including HSM and Vault
- `sec-owasp-a02-crypto-failures` -- cryptographic failure patterns at the application level
- `sec-secrets-management-and-rotation` -- secrets rotation patterns that interact with KMS
- `cloud-aws-iam-least-privilege` -- IAM policies control who can use KMS keys
- `cloud-aws-s3` -- S3 encryption configuration depends on KMS

## Authoritative References

- [AWS KMS Best Practices](https://docs.aws.amazon.com/kms/latest/developerguide/best-practices.html)
- [AWS KMS Encryption Context](https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#encrypt_context)
- [AWS Encryption SDK -- Data Key Caching](https://docs.aws.amazon.com/encryption-sdk/latest/developer-guide/data-key-caching.html)
- [AWS Well-Architected Framework -- Data Protection](https://docs.aws.amazon.com/wellarchitected/latest/security-pillar/data-protection.html)
