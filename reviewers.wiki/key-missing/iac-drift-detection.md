---
id: iac-drift-detection
type: primary
depth_role: leaf
focus: Detect missing or misconfigured infrastructure drift detection including absent drift checks, non-actionable alerts, missing automated remediation, unreconciled manual changes, unscheduled state refresh, and missing drift reports in CI
parents:
  - index.md
covers:
  - No drift detection configured for managed infrastructure
  - Drift alerts that fire but are not actionable
  - Drift remediation not automated -- manual reconciliation required
  - Manual changes to infrastructure not reconciled back to code
  - State refresh not scheduled -- stale state masks drift
  - Missing drift report in CI pipeline
  - Drift detection not covering all managed resources
  - No drift baseline established
  - Drift alerts without severity classification
  - Missing drift detection for security-sensitive resources
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
activation:
  file_globs:
    - "**/*.tf"
    - "**/Pulumi.yaml"
    - "**/template.yaml"
    - "**/cdk.json"
    - "**/*.bicep"
    - "**/flux-system/**"
    - "**/argocd/**"
  keyword_matches:
    - drift
    - detect-drift
    - plan
    - preview
    - diff
    - refresh
    - reconcile
    - state
    - desired-state
    - actual-state
    - out-of-sync
    - remediation
  structural_signals:
    - terraform_plan_in_ci
    - cloudformation_drift_detection
    - gitops_reconciliation_check
    - scheduled_state_refresh
source:
  origin: file
  path: iac-drift-detection.md
  hash: "sha256:13a899ad0937b343d9b3557a4651b543cecc892c187d2734019e92b7d82a0879"
---
# Infrastructure Drift Detection

## When This Activates

Activates when diffs touch IaC configurations (Terraform, Pulumi, CloudFormation, Bicep, Crossplane) or GitOps controllers (Argo CD, Flux CD) where drift detection should be configured. Infrastructure drift occurs when the actual state of cloud resources diverges from the declared state in code -- manual console changes, out-of-band automation, and cloud provider auto-scaling all create drift. Undetected drift causes IaC applies to fail, overwrite manual fixes, or create security regressions. This reviewer flags missing or misconfigured drift detection that leaves infrastructure in an unknown state.

## Audit Surface

- [ ] No scheduled drift check for Terraform/Pulumi state
- [ ] CloudFormation stacks without drift detection schedule
- [ ] Drift alerts routed to unmonitored channel
- [ ] No automated remediation workflow
- [ ] Manual infrastructure changes not reconciled to code
- [ ] State not refreshed before plan in CI
- [ ] Drift check covering only subset of resources
- [ ] No drift baseline or exclusion list
- [ ] Drift alerts without severity classification
- [ ] Security resources without drift monitoring
- [ ] GitOps reconciliation errors not surfaced
- [ ] No drift report artifact in CI

## Detailed Checks

### Drift Detection Configuration
<!-- activation: keywords=["drift", "plan", "preview", "diff", "detect-drift", "driftctl", "schedule", "cron", "periodic"] -->

- [ ] **No drift detection configured**: flag IaC repositories (Terraform, Pulumi, CloudFormation, Bicep) with no evidence of scheduled drift detection -- without periodic drift checks, manual changes accumulate undetected until the next apply fails or overwrites critical manual fixes
- [ ] **Drift check not covering all resources**: flag drift detection that scans only a subset of managed resources (e.g., only one Terraform workspace out of many, or only production stacks) -- partial coverage creates blind spots where drift in unchecked resources goes unnoticed
- [ ] **State not refreshed before plan**: flag CI pipelines that run `terraform plan` without `terraform refresh` or with `-refresh=false` -- stale state masks drift by comparing against outdated resource attributes, showing no changes when the infrastructure has actually diverged
- [ ] **Missing drift report artifact**: flag CI pipelines without a saved drift report (plan output, diff file, or structured JSON) -- without artifacts, drift detection results are ephemeral and cannot be audited or tracked over time

### Drift Alerting and Severity
<!-- activation: keywords=["alert", "notification", "slack", "pagerduty", "email", "severity", "priority", "ticket", "jira", "opsgenie"] -->

- [ ] **Alerts routed to unmonitored channel**: flag drift alerts sent to channels, email lists, or Slack channels that are not actively monitored -- drift alerts that nobody reads are equivalent to no detection at all; route to on-call channels or create tickets
- [ ] **Missing severity classification**: flag drift detection that reports all drift equally without severity -- IAM policy drift and security group changes are critical (potential security breach), while tag drift is informational; classify to enable appropriate response
- [ ] **No alert for security-sensitive resources**: flag drift detection that does not specifically monitor security resources (IAM policies, security groups, encryption settings, network ACLs, Vault policies) -- security drift is the highest-priority category and should trigger immediate response

### Drift Remediation
<!-- activation: keywords=["remediate", "remediation", "apply", "reconcile", "re-apply", "auto-remediate", "rollback", "fix", "converge"] -->

- [ ] **No remediation workflow**: flag drift detection without a corresponding remediation process (automated re-apply, ticket creation for manual review, or documented runbook) -- detection without remediation means drift accumulates indefinitely
- [ ] **Manual changes not reconciled**: flag infrastructure with evidence of manual changes (console modifications, CLI one-offs, support ticket changes) that are not reconciled back to IaC code -- manual changes create permanent drift that IaC applies will overwrite or conflict with
- [ ] **Auto-remediation without approval**: flag drift remediation that automatically applies changes without review or approval for production environments -- auto-remediation can overwrite intentional manual changes made during incidents; require approval for production, auto-remediate for non-production
- [ ] **No rollback on failed remediation**: flag remediation workflows without rollback capability -- a failed remediation apply can leave infrastructure in a partially-modified state worse than the original drift

### GitOps Drift Detection
<!-- activation: keywords=["reconcile", "out-of-sync", "sync", "ArgoCD", "Flux", "selfHeal", "prune", "status", "health"] -->

- [ ] **Reconciliation errors not surfaced**: flag GitOps controllers (Argo CD, Flux) where reconciliation errors and out-of-sync status are not routed to monitoring -- GitOps controllers detect drift continuously but the alerts must reach humans; check for Notification Providers, Alerts, and dashboard integration
- [ ] **Self-heal disabled on production**: flag Argo CD Applications or Flux Kustomizations managing production resources without self-heal or continuous reconciliation -- without self-heal, manual kubectl changes persist as drift until the next Git commit
- [ ] **Sync status not in CI**: flag GitOps workflows where the sync and health status of Applications/Kustomizations is not checked as a CI gate -- a deployment pipeline that does not verify sync status may proceed while the cluster is in a degraded state

### Drift Baseline and Exclusions
<!-- activation: keywords=["baseline", "exclude", "ignore", "known", "expected", "whitelist", "allowlist", "exception"] -->

- [ ] **No drift baseline**: flag drift detection without an established baseline of known acceptable drift -- some drift is expected (auto-scaling group sizes, dynamic tags set by cloud providers); without a baseline, every detection run produces noise that causes alert fatigue
- [ ] **Overly broad exclusions**: flag drift exclusion lists that suppress entire resource types or broad resource patterns -- exclusions should be specific and documented with justification; broad exclusions create blind spots
- [ ] **Exclusion without review cadence**: flag drift exclusions that are never reviewed or have no expiration -- excluded drift should be reviewed periodically to determine if it should be reconciled or if the exclusion is still valid

## Common False Positives

- **Auto-scaling group instance count**: auto-scaling group desired/current count changes constantly and is not meaningful drift. Exclude from detection.
- **Cloud provider managed tags**: some cloud providers add tags automatically (aws:cloudformation:stack-id). These are expected drift.
- **GitOps controller reconciliation lag**: brief out-of-sync periods during deployments are normal. Only alert on sustained out-of-sync status.
- **Terraform data source refresh**: data sources changing between plans is informational, not drift in managed resources.

## Severity Guidance

| Finding | Severity |
|---|---|
| No drift detection on security resources (IAM, SG, encryption) | Critical |
| Manual infrastructure changes not reconciled to code | Critical |
| No drift detection configured for production infrastructure | Important |
| Drift alerts routed to unmonitored channel | Important |
| State not refreshed before plan in CI | Important |
| No remediation workflow for detected drift | Important |
| GitOps reconciliation errors not surfaced to monitoring | Important |
| Missing drift report artifact in CI | Minor |
| No drift baseline established | Minor |
| Drift exclusions without review cadence | Minor |
| Missing severity classification on drift alerts | Minor |

## See Also

- `iac-terraform` -- Terraform-specific state and plan-based drift detection
- `iac-pulumi` -- Pulumi preview-based drift detection
- `iac-cloudformation-sam-cdk` -- CloudFormation drift detection API integration
- `iac-argocd` -- Argo CD self-heal and sync status as drift detection
- `iac-fluxcd` -- Flux reconciliation as continuous drift detection
- `sec-owasp-a05-misconfiguration` -- undetected drift in security resources is a misconfiguration risk
- `k8s-manifest-correctness` -- Kubernetes resource drift affects manifest correctness

## Authoritative References

- [driftctl Documentation](https://docs.driftctl.com/)
- [Terraform Plan Documentation](https://developer.hashicorp.com/terraform/cli/commands/plan)
- [AWS CloudFormation Drift Detection](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-stack-drift.html)
- [Argo CD Sync and Health](https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/)
- [Flux Reconciliation Documentation](https://fluxcd.io/flux/concepts/#reconciliation)
