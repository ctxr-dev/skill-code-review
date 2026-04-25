---
id: cloud-aws-s3
type: primary
depth_role: leaf
focus: Detect S3 bucket misconfigurations including public access exposure, missing encryption, permissive bucket policies, absent versioning, and overly broad CORS rules
parents:
  - index.md
covers:
  - Public access block not enabled on bucket
  - "Bucket policy allowing Principal:* without conditions"
  - "Missing encryption at rest (SSE-S3 or SSE-KMS)"
  - ACLs used instead of bucket policy for access control
  - Missing versioning on critical data buckets
  - Missing lifecycle rules causing unbounded storage cost
  - CORS configuration too permissive
  - Pre-signed URL with excessively long expiry
  - Missing access logging
  - Predictable bucket name enabling enumeration
tags:
  - aws
  - s3
  - bucket
  - encryption
  - public-access
  - versioning
  - lifecycle
  - cors
  - pre-signed-url
  - acl
activation:
  file_globs:
    - "**/*.tf"
    - "**/*.json"
    - "**/*.yaml"
    - "**/*.yml"
    - "**/cdk.*"
  keyword_matches:
    - S3
    - s3
    - Bucket
    - BucketPolicy
    - PublicAccessBlock
    - Encryption
    - Versioning
    - Lifecycle
    - CORS
    - ACL
  structural_signals:
    - s3_bucket_public
    - bucket_policy_wildcard
    - missing_encryption
source:
  origin: file
  path: cloud-aws-s3.md
  hash: "sha256:49216ad7b9dbffe1f7f7798744ee3b5a0a4bdc2a7b0c77532f0ccf320c5ccf3a"
---
# AWS S3

## When This Activates

Activates when diffs contain S3 bucket definitions, bucket policies, CORS configurations, or S3 client code generating pre-signed URLs. S3 is the most commonly misconfigured AWS service -- public bucket incidents have caused some of the largest data breaches in history. A single missing PublicAccessBlock setting or a permissive bucket policy can expose sensitive data to the internet. This reviewer enforces defense-in-depth for S3 storage.

## Audit Surface

- [ ] Bucket with PublicAccessBlock not configured or any setting false
- [ ] Bucket policy with `Principal: "*"` and no restricting Condition
- [ ] Bucket with no `ServerSideEncryptionConfiguration`
- [ ] Bucket using ACLs (`ACL` not set to `private`) instead of bucket policy
- [ ] Critical data bucket with Versioning not enabled
- [ ] Bucket with no lifecycle rules
- [ ] CORS with `AllowedOrigins: "*"` and AllowedMethods including PUT/DELETE
- [ ] Pre-signed URL with expiry exceeding 1 hour
- [ ] Bucket with no access logging or CloudTrail data events
- [ ] Predictable bucket name (contains account ID, env name)
- [ ] Bucket policy missing `aws:SecureTransport` condition
- [ ] Object Lock not configured on compliance-critical buckets
- [ ] MFA Delete not enabled on sensitive versioned buckets
- [ ] Static website hosting enabled without CloudFront

## Detailed Checks

### Public Access and Bucket Policy
<!-- activation: keywords=["PublicAccessBlock", "BlockPublicAcls", "BlockPublicPolicy", "RestrictPublicBuckets", "IgnorePublicAcls", "BucketPolicy", "Principal"] -->

- [ ] **PublicAccessBlock not enabled**: flag buckets without a `PublicAccessBlockConfiguration` with all four settings (`BlockPublicAcls`, `IgnorePublicAcls`, `BlockPublicPolicy`, `RestrictPublicBuckets`) set to true -- this is the most important S3 security control and should be enabled at both account and bucket level
- [ ] **Bucket policy with Principal:***: flag bucket policies that grant access to `Principal: "*"` without a `Condition` block restricting by source VPC, IP, or organization -- this makes the bucket publicly accessible
- [ ] **Missing SecureTransport condition**: flag bucket policies that do not deny requests where `aws:SecureTransport` is false -- without this, data can be transmitted over unencrypted HTTP

### Encryption at Rest
<!-- activation: keywords=["ServerSideEncryptionConfiguration", "SSEAlgorithm", "SSE-S3", "SSE-KMS", "aws:kms", "AES256", "KmsMasterKeyID", "BucketEncryption"] -->

- [ ] **No encryption at rest**: flag buckets with no `ServerSideEncryptionConfiguration` -- all S3 buckets should enforce encryption; SSE-S3 (AES256) is the baseline, SSE-KMS for regulated data
- [ ] **SSE-S3 where SSE-KMS needed**: flag buckets storing PII, financial, or health data using SSE-S3 instead of SSE-KMS -- SSE-KMS provides audit trails via CloudTrail and key policy controls; SSE-S3 does not
- [ ] **Bucket policy not enforcing encryption**: flag bucket policies missing a `Deny` statement for `s3:PutObject` when `s3:x-amz-server-side-encryption` is absent -- without this, objects can be uploaded unencrypted

### ACLs and Access Control
<!-- activation: keywords=["ACL", "acl", "CannedACL", "ObjectOwnership", "BucketOwnerEnforced", "public-read", "authenticated-read"] -->

- [ ] **ACLs instead of bucket policy**: flag buckets using ACLs (especially `public-read`, `public-read-write`, `authenticated-read`) -- ACLs are a legacy access control mechanism that is harder to audit; use bucket policies with `ObjectOwnership: BucketOwnerEnforced` to disable ACLs entirely
- [ ] **Object ownership not enforced**: flag buckets without `ObjectOwnership: BucketOwnerEnforced` -- without this, objects uploaded by other accounts retain the uploader's ownership, and the bucket owner cannot control access via bucket policy

### Versioning and Lifecycle
<!-- activation: keywords=["Versioning", "VersioningConfiguration", "Lifecycle", "LifecycleConfiguration", "Transition", "Expiration", "NoncurrentVersionExpiration"] -->

- [ ] **Missing versioning on critical buckets**: flag buckets storing application data, backups, or logs without versioning enabled -- versioning protects against accidental deletion and overwrites
- [ ] **No lifecycle rules**: flag buckets with no lifecycle configuration -- objects accumulate indefinitely, causing unbounded storage costs; at minimum, transition old versions to Glacier and expire noncurrent versions
- [ ] **Missing noncurrent version expiration**: flag versioned buckets without `NoncurrentVersionExpiration` -- old versions accumulate silently and can exceed the cost of current data

### CORS and Pre-Signed URLs
<!-- activation: keywords=["CORS", "CORSConfiguration", "AllowedOrigins", "AllowedMethods", "pre-signed", "presigned", "generate_presigned_url", "getSignedUrl"] -->

- [ ] **Overly permissive CORS**: flag CORS rules with `AllowedOrigins: "*"` combined with `AllowedMethods` including PUT or DELETE -- this allows any website to upload to or delete from the bucket
- [ ] **Pre-signed URL long expiry**: flag pre-signed URL generation with expiry exceeding 3600 seconds (1 hour) -- long-lived pre-signed URLs increase the window for URL leakage; use the shortest practical expiry
- [ ] **Pre-signed URL for sensitive operations**: flag pre-signed URLs for DELETE operations or for uploading to buckets containing sensitive data without additional server-side validation

### Logging and Monitoring
<!-- activation: keywords=["LoggingConfiguration", "TargetBucket", "logging", "CloudTrail", "DataEvent", "EventSelectors", "access_log"] -->

- [ ] **No access logging**: flag buckets with no `LoggingConfiguration` and no CloudTrail S3 data event logging -- without logs, unauthorized access is undetectable
- [ ] **Logging to same bucket**: flag buckets configured to send access logs to themselves -- this creates an infinite logging loop

## Common False Positives

- **Static website hosting buckets**: buckets serving public static assets (CSS, JS, images) behind CloudFront intentionally have public read access. Verify CloudFront OAI/OAC is configured.
- **Public dataset buckets**: some buckets intentionally serve open data. Verify the bucket contains no sensitive data and public access is by design.
- **Short-lived temporary buckets**: buckets used for build artifacts or CI/CD may not need versioning or lifecycle rules if they are cleaned up programmatically.

## Severity Guidance

| Finding | Severity |
|---|---|
| PublicAccessBlock not enabled on data bucket | Critical |
| Bucket policy with Principal:* and no conditions | Critical |
| No encryption at rest | Critical |
| ACL set to public-read or public-read-write | Critical |
| Missing versioning on critical data bucket | Important |
| Missing SecureTransport condition in bucket policy | Important |
| Pre-signed URL with expiry over 1 hour | Important |
| No access logging | Important |
| No lifecycle rules | Minor |
| Predictable bucket name | Minor |
| CORS AllowedOrigins:* on non-public bucket | Important |

## See Also

- `sec-owasp-a05-misconfiguration` -- S3 public access is the canonical cloud misconfiguration
- `sec-owasp-a01-broken-access-control` -- bucket policies are access control
- `cloud-aws-kms-crypto` -- SSE-KMS encryption depends on KMS key configuration
- `cloud-aws-iam-least-privilege` -- IAM policies control who can access S3
- `sec-secrets-management-and-rotation` -- secrets must not be stored in S3 without encryption

## Authoritative References

- [AWS S3 Security Best Practices](https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html)
- [AWS S3 Block Public Access](https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html)
- [AWS S3 Server-Side Encryption](https://docs.aws.amazon.com/AmazonS3/latest/userguide/serv-side-encryption.html)
- [AWS Well-Architected Framework -- S3 Lens](https://docs.aws.amazon.com/wellarchitected/latest/s3-lens/)
