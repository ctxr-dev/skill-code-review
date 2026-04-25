---
id: cloud-aws-iam-least-privilege
type: primary
depth_role: leaf
focus: Detect overly permissive IAM policies, wildcard actions and resources, missing condition keys, and unsafe trust relationships in AWS IAM configurations
parents:
  - index.md
covers:
  - "Wildcard Action (*) in IAM policy statement"
  - "Wildcard Resource (*) in IAM policy statement"
  - AdministratorAccess managed policy attached to role or user
  - Missing condition keys on sensitive actions
  - Overly broad AssumeRole trust policy allowing any principal
  - Inline policies instead of managed policies
  - Missing permission boundary on IAM role
  - Cross-account access without external ID condition
  - IAM user with long-lived access keys instead of role assumption
  - Missing MFA condition on privilege-escalation actions
tags:
  - aws
  - iam
  - least-privilege
  - policy
  - role
  - trust
  - permission-boundary
  - condition-key
activation:
  file_globs:
    - "**/*.tf"
    - "**/*.json"
    - "**/*.yaml"
    - "**/*.yml"
    - "**/cdk.*"
  keyword_matches:
    - IAM
    - iam
    - Policy
    - Statement
    - Effect
    - Action
    - Resource
    - Principal
    - AssumeRole
    - sts
    - Role
    - ManagedPolicy
    - AdministratorAccess
  structural_signals:
    - wildcard_action
    - wildcard_resource
    - administrator_access
source:
  origin: file
  path: cloud-aws-iam-least-privilege.md
  hash: "sha256:100aca523823eb163d020a866ef2f99ef395da172213667cfb751fec99d043b5"
---
# AWS IAM Least Privilege

## When This Activates

Activates when diffs contain IAM policy definitions, role trust policies, managed policy attachments, or STS assume-role configurations in Terraform, CloudFormation, CDK, or raw JSON/YAML policy documents. IAM misconfigurations are the most common root cause of AWS security incidents -- a single `Action: "*"` can grant an attacker full control of the account. This reviewer enforces the principle of least privilege at the policy statement level.

## Audit Surface

- [ ] Policy statement with `Effect: Allow` and `Action: "*"` or `Action: "service:*"`
- [ ] Policy statement with `Effect: Allow` and `Resource: "*"`
- [ ] AdministratorAccess or PowerUserAccess managed policy attachment
- [ ] AssumeRole trust policy with `Principal: "*"` or overly wide account scope
- [ ] Missing `aws:SourceArn`, `aws:SourceAccount`, or `aws:PrincipalOrgID` condition
- [ ] Inline policy defined directly on user, group, or role
- [ ] IAM role missing PermissionsBoundary
- [ ] Cross-account AssumeRole missing `sts:ExternalId` condition
- [ ] IAM user with AccessKey resource instead of role assumption
- [ ] PassRole action without resource restriction
- [ ] Policy allowing `iam:*` or `sts:*` actions
- [ ] NotAction or NotResource used without careful scoping
- [ ] Wildcard in Principal field of resource-based policy
- [ ] Policy with no Sid field

## Detailed Checks

### Wildcard Actions and Resources
<!-- activation: keywords=["Action", "Resource", "*", "Effect", "Allow", "Statement"] -->

- [ ] **Action: "*"**: flag any policy statement that grants `"*"` as the action -- this gives the principal every possible API call across every service; always scope to specific actions like `s3:GetObject`
- [ ] **Service-level wildcards**: flag `"service:*"` (e.g., `"s3:*"`, `"ec2:*"`) unless the role genuinely needs every action in that service, which is rare outside of service-linked roles
- [ ] **Resource: "*"**: flag any `Allow` statement with `Resource: "*"` -- even narrow actions become dangerous when applied to all resources; scope to specific ARNs or ARN patterns
- [ ] **Combined wildcard**: flag statements where both Action and Resource are `"*"` as Critical -- this is effectively AdministratorAccess

### Managed Policy and Admin Access
<!-- activation: keywords=["AdministratorAccess", "PowerUserAccess", "ManagedPolicy", "PolicyArn", "aws_iam_policy_attachment"] -->

- [ ] **AdministratorAccess attachment**: flag any attachment of `arn:aws:iam::aws:policy/AdministratorAccess` to a role, user, or group -- use a scoped custom policy instead
- [ ] **PowerUserAccess attachment**: flag PowerUserAccess which grants all actions except IAM -- still far too broad for any production workload
- [ ] **Inline policies**: flag inline policies defined directly on roles/users via `policy` blocks or `AWS::IAM::Policy` embedded in role definitions -- use managed policies for reusability and auditability

### Trust Policy and AssumeRole
<!-- activation: keywords=["AssumeRole", "Principal", "Trust", "sts", "AssumeRolePolicy", "assume_role_policy"] -->

- [ ] **Overly broad Principal**: flag trust policies with `Principal: {"AWS": "*"}` or `Principal: "*"` -- any AWS account can assume this role
- [ ] **Missing external ID for cross-account**: flag cross-account AssumeRole trust policies that do not include `sts:ExternalId` in the Condition block -- without it, a confused deputy attack is possible
- [ ] **Service principal too broad**: flag trust policies that allow a service principal without constraining via `aws:SourceArn` or `aws:SourceAccount` -- any resource in any account using that service can assume the role

### Condition Keys and MFA
<!-- activation: keywords=["Condition", "MFA", "MultiFactorAuth", "SourceArn", "SourceAccount", "PrincipalOrgID", "ExternalId"] -->

- [ ] **Missing condition keys on sensitive actions**: flag policies granting `iam:*`, `sts:AssumeRole`, `kms:Decrypt`, or `s3:DeleteBucket` without condition keys to restrict scope
- [ ] **No MFA for privilege escalation**: flag policies allowing `iam:CreateUser`, `iam:AttachRolePolicy`, `iam:PutRolePolicy`, or `iam:CreateAccessKey` without `aws:MultiFactorAuthPresent` condition
- [ ] **Missing aws:PrincipalOrgID**: flag cross-account policies in organizations that do not restrict to the organization ID -- any external account could match

### Permission Boundaries and PassRole
<!-- activation: keywords=["PermissionsBoundary", "PassRole", "iam:PassRole", "permission_boundary"] -->

- [ ] **Missing permission boundary**: flag IAM roles created for applications or Lambda functions without a PermissionsBoundary -- boundaries prevent privilege escalation even if the role policy is too broad
- [ ] **Unrestricted PassRole**: flag policies granting `iam:PassRole` with `Resource: "*"` -- this lets the principal assign any role to any service, which is an escalation path to admin

## Common False Positives

- **CI/CD deployment roles**: deployment pipelines may legitimately need broad permissions during infrastructure provisioning. Verify that these roles are short-lived and scoped to deployment accounts only.
- **AWS service-linked roles**: some AWS services require specific broad permissions via service-linked roles. These are AWS-managed and are acceptable.
- **Break-glass roles**: emergency access roles intentionally have broad permissions. Verify they require MFA and are monitored via CloudTrail.

## Severity Guidance

| Finding | Severity |
|---|---|
| Action: "*" with Resource: "*" | Critical |
| AdministratorAccess attached to production role | Critical |
| Principal: "*" in trust policy | Critical |
| Action: "service:*" without justification | Important |
| Resource: "*" on narrow action set | Important |
| Cross-account AssumeRole without external ID | Important |
| Missing permission boundary on application role | Important |
| Unrestricted iam:PassRole | Important |
| Inline policy instead of managed policy | Minor |
| Policy missing Sid field | Minor |

## See Also

- `sec-owasp-a01-broken-access-control` -- IAM is the primary access control mechanism in AWS
- `sec-owasp-a05-misconfiguration` -- overly permissive IAM is the most common AWS misconfiguration
- `sec-secrets-management-and-rotation` -- access keys should be replaced with role assumption
- `crypto-key-management-kms-hsm-vault` -- KMS key policies are a subset of IAM policy patterns
- `cloud-aws-kms-crypto` -- KMS key policies interact closely with IAM policies

## Authoritative References

- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [AWS IAM Policy Evaluation Logic](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html)
- [AWS Well-Architected Framework -- Security Pillar](https://docs.aws.amazon.com/wellarchitected/latest/security-pillar/)
- [Rhino Security Labs, "AWS IAM Privilege Escalation Methods"](https://rhinosecuritylabs.com/aws/aws-privilege-escalation-methods-mitigation/)
