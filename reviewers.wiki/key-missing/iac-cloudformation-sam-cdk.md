---
id: iac-cloudformation-sam-cdk
type: primary
depth_role: leaf
focus: Detect CloudFormation, SAM, and CDK misconfigurations including hardcoded secrets in templates, missing DeletionPolicy on stateful resources, absent drift detection, CDK L1 overuse, missing stack tags, and no rollback triggers
parents:
  - index.md
covers:
  - Hardcoded secrets in CloudFormation or SAM templates
  - Missing DeletionPolicy on stateful resources
  - No drift detection strategy in CI or schedule
  - "CDK using L1 (Cfn*) constructs where L2/L3 exists"
  - Missing stack tags for cost allocation and ownership
  - No rollback triggers on production stacks
  - Parameter without NoEcho for secret values
  - Stack output exposing sensitive data
  - Nested stacks without domain boundaries
  - Missing UpdateReplacePolicy on replace-triggering resources
  - Hardcoded secrets in templates
  - No stack drift detection strategy
  - "CDK construct not using L2/L3 abstractions"
  - Missing outputs for cross-stack references
  - SAM local vs deployed environment parity issues
  - Missing stack tags
  - Nested stacks without clear boundaries
  - Missing rollback triggers
  - Template parameters without constraints
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
aliases:
  - cloud-aws-cloudformation-sam-cdk
activation:
  file_globs:
    - "**/template.yaml"
    - "**/template.json"
    - "**/cdk.*"
    - "**/cdk.json"
    - "**/*.template"
    - "**/samconfig.toml"
  keyword_matches:
    - CloudFormation
    - SAM
    - CDK
    - "AWS::Serverless"
    - Stack
    - Resource
    - DeletionPolicy
    - Construct
    - CfnResource
  structural_signals:
    - hardcoded_secret_in_template
    - missing_deletion_policy
    - cfn_resource_in_cdk
    - missing_rollback_config
source:
  origin: file
  path: iac-cloudformation-sam-cdk.md
  hash: "sha256:3db5d4a029a854c5239aa43c578f7d26c4df947003a75f50ad6e2ecee7a06d78"
---
# CloudFormation, SAM, and CDK

## When This Activates

Activates when diffs contain CloudFormation templates, SAM templates, CDK construct code, or CDK configuration files. These tools define the lifecycle of AWS resources -- a missing DeletionPolicy on an RDS instance means a stack delete permanently destroys the database, hardcoded secrets in templates are committed to version control forever, and raw L1 constructs in CDK bypass the safety guardrails that L2/L3 abstractions enforce. This reviewer catches IaC-level mistakes that cause data loss, secret exposure, and production incidents.

## Audit Surface

- [ ] Literal secret, password, or token in template
- [ ] Stateful resource with no DeletionPolicy
- [ ] No drift detection schedule or CI check
- [ ] CDK code using CfnResource (L1) where L2/L3 exists
- [ ] Stack with no Tags property
- [ ] Stack with no RollbackConfiguration
- [ ] Parameter accepting secret without NoEcho
- [ ] Output exposing sensitive value
- [ ] More than 5 nested stacks without domain separation
- [ ] UpdateReplacePolicy missing on stateful resources
- [ ] Mappings used where SSM Parameter Store is better
- [ ] Circular dependency between resources
- [ ] SAM Globals diverging from deployed config
- [ ] Transform version not pinned

## Detailed Checks

### Secrets in Templates
<!-- activation: keywords=["Password", "Secret", "Key", "Token", "MasterUserPassword", "ApiKey", "NoEcho", "resolve:secretsmanager", "resolve:ssm-secure"] -->

- [ ] **Hardcoded secrets**: flag literal values for properties named Password, Secret, ApiKey, Token, or Credentials in CloudFormation/SAM templates -- use `{{resolve:secretsmanager:...}}` or `{{resolve:ssm-secure:...}}` dynamic references
- [ ] **Parameter without NoEcho**: flag Parameters of type String that accept secrets without `NoEcho: true` -- without it, the value is visible in the CloudFormation console and API responses
- [ ] **CDK secrets in code**: flag CDK code passing literal secret strings to construct properties -- use `Secret.fromSecretNameV2()` or `SecretValue.secretsManager()`
- [ ] **Output exposing secrets**: flag Outputs that reference secret values without conditional protection

### Deletion Policy and Data Protection
<!-- activation: keywords=["DeletionPolicy", "Retain", "Snapshot", "UpdateReplacePolicy", "RemovalPolicy", "RETAIN", "SNAPSHOT"] -->

- [ ] **Missing DeletionPolicy**: flag RDS instances, DynamoDB tables, S3 buckets, EFS file systems, Cognito user pools, and OpenSearch domains with no `DeletionPolicy` -- the default is Delete, permanently destroying data on stack delete
- [ ] **Missing UpdateReplacePolicy**: flag stateful resources where property changes trigger replacement without `UpdateReplacePolicy: Retain`
- [ ] **CDK RemovalPolicy not set**: flag CDK constructs for stateful resources without explicit `removalPolicy: RemovalPolicy.RETAIN` or `SNAPSHOT`

### CDK Construct Level
<!-- activation: keywords=["CfnResource", "Cfn", "L1", "L2", "Construct", "cfnOptions", "overrideLogicalId", "addPropertyOverride"] -->

- [ ] **L1 where L2 exists**: flag CDK code using `Cfn*` constructs (CfnBucket, CfnFunction, CfnTable) when L2 constructs (Bucket, Function, Table) are available -- L2 constructs enforce encryption, logging, and permission defaults
- [ ] **Escape hatch overuse**: flag frequent use of `node.defaultChild`, `cfnOptions`, or `addPropertyOverride` -- fighting the L2 API signals the wrong abstraction level
- [ ] **No construct composition**: flag CDK stacks with all resources flat in a single construct -- group into custom L3 constructs for reuse and testability

### Stack Hygiene and Operations
<!-- activation: keywords=["Tags", "RollbackConfiguration", "DriftDetection", "drift", "StackPolicy", "MonitoringTimeInMinutes"] -->

- [ ] **Missing stack tags**: flag stacks without Tags for environment, service, team, and cost center
- [ ] **Missing rollback triggers**: flag production stacks without `RollbackConfiguration` with monitoring alarms
- [ ] **No drift detection**: flag production stacks with no scheduled drift detection or CI check
- [ ] **Missing stack policy**: flag production stacks without a stack policy to prevent accidental critical resource updates

### SAM and Template Validation
<!-- activation: keywords=["SAM", "AWS::Serverless", "Transform", "Globals", "sam local", "template.yaml", "samconfig"] -->

- [ ] **SAM local/deployed parity**: flag SAM templates where Globals differ significantly between local and deployed configurations
- [ ] **Parameters without constraints**: flag Parameters without AllowedValues, AllowedPattern, or constraint descriptions
- [ ] **Transform version not specified**: flag templates using AWS::Serverless transform without version pinning

## Common False Positives

- **L1 constructs for new/preview services**: some AWS services lack L2 CDK constructs. L1 usage is acceptable when no L2 alternative exists.
- **Single-stack simple applications**: small applications with 5-10 resources do not need nested stacks or custom constructs.
- **DeletionPolicy Delete on stateless resources**: Lambda functions, CloudWatch alarms, and API Gateway stages are stateless and do not need Retain/Snapshot.

## Severity Guidance

| Finding | Severity |
|---|---|
| Hardcoded secret in template | Critical |
| Output exposing secret value | Critical |
| Missing DeletionPolicy on RDS or DynamoDB | Critical |
| Missing DeletionPolicy on S3 with data | Important |
| CDK RemovalPolicy not set on stateful resource | Important |
| L1 construct where L2 exists | Important |
| Parameters without constraints | Important |
| Missing stack tags | Minor |
| No rollback configuration | Minor |
| No drift detection strategy | Minor |

## See Also

- `sec-secrets-management-and-rotation` -- secrets must not be hardcoded in IaC templates
- `sec-owasp-a05-misconfiguration` -- IaC misconfiguration is a top security risk
- `cloud-aws-cloudformation-sam-cdk` -- the cloud-specific AWS reviewer with deeper resource coverage
- `iac-terraform` -- alternative IaC tool with analogous versioning and state concerns
- `iac-drift-detection` -- drift detection strategies applicable to CloudFormation stacks
- `k8s-manifest-correctness` -- Kubernetes manifests often deployed alongside CloudFormation stacks

## Authoritative References

- [AWS CloudFormation Best Practices](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/best-practices.html)
- [AWS CDK Best Practices](https://docs.aws.amazon.com/cdk/v2/guide/best-practices.html)
- [AWS SAM Developer Guide](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/)
- [cfn-lint Rules Reference](https://github.com/aws-cloudformation/cfn-lint)
- [cdk-nag Rules](https://github.com/cdklabs/cdk-nag)
