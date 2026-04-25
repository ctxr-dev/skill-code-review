---
id: key-missing
type: index
depth_role: subcategory
depth: 1
focus: ACLs used instead of bucket policy for access control; ARM template without $schema validation; AWS-managed key used where customer-managed CMK is required; Asymmetric private keys committed to version control
parents:
  - "../index.md"
shared_covers: []
entries:
  - id: cloud-aws-kms-crypto
    file: cloud-aws-kms-crypto.md
    type: primary
    focus: Detect KMS key misconfigurations including missing rotation, overly broad key policies, absent encryption context, and inefficient data key usage patterns
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
  - id: cloud-aws-rds-aurora
    file: cloud-aws-rds-aurora.md
    type: primary
    focus: Detect RDS and Aurora misconfigurations including missing Multi-AZ, public accessibility, absent encryption, missing connection pooling, and inadequate backup and monitoring settings
    tags:
      - aws
      - rds
      - aurora
      - multi-az
      - encryption
      - backup
      - proxy
      - monitoring
      - read-replica
      - deletion-protection
  - id: cloud-aws-s3
    file: cloud-aws-s3.md
    type: primary
    focus: Detect S3 bucket misconfigurations including public access exposure, missing encryption, permissive bucket policies, absent versioning, and overly broad CORS rules
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
  - id: cloud-azure-functions-cosmos-db
    file: cloud-azure-functions-cosmos-db.md
    type: primary
    focus: Detect Azure Functions missing managed identity, Cosmos DB partition key and RU misconfigurations, cold start issues, and consistency level mismatches
    tags:
      - azure
      - functions
      - cosmos-db
      - serverless
      - partition-key
      - consistency
      - cold-start
  - id: iac-ansible
    file: iac-ansible.md
    type: primary
    focus: Detect Ansible misconfigurations including plaintext passwords in variables, missing privilege escalation controls, unnotified handlers, roles without tests, hardcoded hosts, missing vault encryption, and idempotency violations
    tags:
      - ansible
      - iac
      - vault
      - secrets
      - idempotency
      - handlers
      - molecule
      - roles
      - privilege-escalation
  - id: iac-bicep-arm
    file: iac-bicep-arm.md
    type: primary
    focus: Detect Bicep and ARM template misconfigurations including hardcoded secrets, missing parameter defaults and validation, unversioned Bicep modules, missing resource locks, and deployment mode risks
    tags:
      - azure
      - bicep
      - arm
      - iac
      - secrets
      - resource-locks
      - deployment-mode
      - tags
      - modules
  - id: iac-cloudformation-sam-cdk
    file: iac-cloudformation-sam-cdk.md
    type: primary
    focus: Detect CloudFormation, SAM, and CDK misconfigurations including hardcoded secrets in templates, missing DeletionPolicy on stateful resources, absent drift detection, CDK L1 overuse, missing stack tags, and no rollback triggers
    tags:
      - aws
      - cloudformation
      - sam
      - cdk
      - iac
      - deletion-policy
      - drift
      - secrets
      - stack
      - template
  - id: iac-drift-detection
    file: iac-drift-detection.md
    type: primary
    focus: Detect missing or misconfigured infrastructure drift detection including absent drift checks, non-actionable alerts, missing automated remediation, unreconciled manual changes, unscheduled state refresh, and missing drift reports in CI
    tags:
      - drift
      - detection
      - reconciliation
      - iac
      - state
      - remediation
      - monitoring
      - compliance
      - security
  - id: iac-pulumi
    file: iac-pulumi.md
    type: primary
    focus: Detect Pulumi misconfigurations including plaintext secrets in config, unencrypted state backends, missing ComponentResource grouping, unpinned provider versions, and leaking stack outputs
    tags:
      - pulumi
      - iac
      - secrets
      - state
      - componentresource
      - tags
      - providers
      - crossguard
  - id: cloud-account
    file: "cloud-account/index.md"
    type: index
    focus: "Cloud Function Gen1 used instead of Gen2 without justification; Cloud Run CPU always-allocated without justification; ClusterRole with wildcard verbs (*) granting all operations; ClusterRoleBinding to default service account -- every pod in the namespace inherits permissions"
children:
  - "cloud-account/index.md"
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Key Missing

**Focus:** ACLs used instead of bucket policy for access control; ARM template without $schema validation; AWS-managed key used where customer-managed CMK is required; Asymmetric private keys committed to version control

## Children

| File | Type | Focus |
|------|------|-------|
| [cloud-aws-kms-crypto.md](cloud-aws-kms-crypto.md) | 📄 primary | Detect KMS key misconfigurations including missing rotation, overly broad key policies, absent encryption context, and inefficient data key usage patterns |
| [cloud-aws-rds-aurora.md](cloud-aws-rds-aurora.md) | 📄 primary | Detect RDS and Aurora misconfigurations including missing Multi-AZ, public accessibility, absent encryption, missing connection pooling, and inadequate backup and monitoring settings |
| [cloud-aws-s3.md](cloud-aws-s3.md) | 📄 primary | Detect S3 bucket misconfigurations including public access exposure, missing encryption, permissive bucket policies, absent versioning, and overly broad CORS rules |
| [cloud-azure-functions-cosmos-db.md](cloud-azure-functions-cosmos-db.md) | 📄 primary | Detect Azure Functions missing managed identity, Cosmos DB partition key and RU misconfigurations, cold start issues, and consistency level mismatches |
| [iac-ansible.md](iac-ansible.md) | 📄 primary | Detect Ansible misconfigurations including plaintext passwords in variables, missing privilege escalation controls, unnotified handlers, roles without tests, hardcoded hosts, missing vault encryption, and idempotency violations |
| [iac-bicep-arm.md](iac-bicep-arm.md) | 📄 primary | Detect Bicep and ARM template misconfigurations including hardcoded secrets, missing parameter defaults and validation, unversioned Bicep modules, missing resource locks, and deployment mode risks |
| [iac-cloudformation-sam-cdk.md](iac-cloudformation-sam-cdk.md) | 📄 primary | Detect CloudFormation, SAM, and CDK misconfigurations including hardcoded secrets in templates, missing DeletionPolicy on stateful resources, absent drift detection, CDK L1 overuse, missing stack tags, and no rollback triggers |
| [iac-drift-detection.md](iac-drift-detection.md) | 📄 primary | Detect missing or misconfigured infrastructure drift detection including absent drift checks, non-actionable alerts, missing automated remediation, unreconciled manual changes, unscheduled state refresh, and missing drift reports in CI |
| [iac-pulumi.md](iac-pulumi.md) | 📄 primary | Detect Pulumi misconfigurations including plaintext secrets in config, unencrypted state backends, missing ComponentResource grouping, unpinned provider versions, and leaking stack outputs |
| [cloud-account/index.md](cloud-account/index.md) | 📁 index | Cloud Function Gen1 used instead of Gen2 without justification; Cloud Run CPU always-allocated without justification; ClusterRole with wildcard verbs (*) granting all operations; ClusterRoleBinding to default service account -- every pod in the namespace inherits permissions |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
