---
id: k8s-admission-opa-kyverno-gatekeeper
type: primary
depth_role: leaf
focus: Detect misconfigured Kubernetes admission policies including audit-mode-only enforcement, missing critical controls, overly broad exclusions, and untested policy logic
parents:
  - index.md
covers:
  - Policy in audit mode that should be enforce -- violations logged but not blocked
  - "Missing policy for critical controls (image allowlist, resource limits, labels)"
  - Overly broad exclude rules bypassing policies for too many namespaces
  - Rego or CEL policy without corresponding unit tests
  - Mutating webhook without idempotency -- repeated application changes resources
  - Policy not covering all namespaces -- gaps in enforcement
  - Missing policy exception process -- no structured way to grant exemptions
  - Gatekeeper Constraint without matching ConstraintTemplate
  - Kyverno policy without match clause -- applies too broadly
  - Policy engine webhook failure mode set to Ignore -- fails open
tags:
  - kubernetes
  - admission
  - opa
  - gatekeeper
  - kyverno
  - rego
  - cel
  - policy
  - webhook
  - governance
activation:
  file_globs:
    - "**/*.yaml"
    - "**/*.yml"
    - "**/*.rego"
    - "**/k8s/**"
    - "**/kubernetes/**"
    - "**/policies/**"
    - "**/constraints/**"
  keyword_matches:
    - ConstraintTemplate
    - Constraint
    - ClusterPolicy
    - Policy
    - kyverno
    - gatekeeper
    - OPA
    - rego
    - validate
    - mutate
    - generate
    - audit
    - enforce
    - match
    - exclude
  structural_signals:
    - "kind: ConstraintTemplate"
    - "kind: Constraint"
    - "kind: ClusterPolicy"
    - "apiVersion: kyverno.io"
    - "apiVersion: templates.gatekeeper.sh"
source:
  origin: file
  path: k8s-admission-opa-kyverno-gatekeeper.md
  hash: "sha256:7373b4ad1f67e1203259ec5e5281d9185b2b1cbace65c30fc3fdd01f76911cdf"
---
# Kubernetes Admission Policies (OPA / Kyverno / Gatekeeper)

## When This Activates

Activates on diffs touching admission policy resources (Gatekeeper ConstraintTemplates and Constraints, Kyverno ClusterPolicies and Policies, OPA Rego modules), mutating or validating webhook configurations, or policy test files. Admission controllers are the last enforcement point before resources are persisted to etcd -- a policy in audit mode logs violations but allows them through, an overly broad exclude rule silently bypasses controls, and a mutating webhook without idempotency corrupts resources on reapplication. This reviewer detects gaps between intended policy enforcement and actual configuration.

## Audit Surface

- [ ] Gatekeeper Constraint with enforcementAction: dryrun or warn
- [ ] Kyverno ClusterPolicy with validationFailureAction: audit
- [ ] No policy enforcing allowed container registries
- [ ] No policy requiring resource requests and limits
- [ ] No policy requiring standard labels on workloads
- [ ] Exclude block matching multiple namespaces with wildcard patterns
- [ ] Rego policy module without _test.rego companion file
- [ ] CEL expression in policy without test coverage
- [ ] MutatingWebhookConfiguration without idempotency guarantee
- [ ] Policy match clause missing namespace coverage
- [ ] No PolicyException or exemption CRD for exception workflow
- [ ] Constraint resource without matching ConstraintTemplate
- [ ] Webhook failurePolicy: Ignore -- fails open
- [ ] Policy engine not monitored for webhook health

## Detailed Checks

### Enforcement Mode
<!-- activation: keywords=["enforcementAction", "validationFailureAction", "dryrun", "audit", "enforce", "deny", "warn"] -->

- [ ] **Gatekeeper in dryrun mode**: flag Constraints with `enforcementAction: dryrun` that enforce critical security controls (image allowlist, privileged containers, resource limits) -- dryrun logs violations in the Constraint status but does not block them; transition to `deny` after validation
- [ ] **Kyverno in audit mode**: flag ClusterPolicies with `validationFailureAction: audit` for critical controls -- audit mode reports violations in PolicyReport resources but allows non-compliant resources to be created; set to `enforce` for production namespaces
- [ ] **Mixed enforcement across constraints**: flag Gatekeeper deployments where some constraints are `deny` and others covering the same control are `dryrun` -- inconsistent enforcement creates confusion about what is actually blocked
- [ ] **No timeline for audit-to-enforce promotion**: flag policies that have been in audit mode for extended periods (check commit history) without a plan to move to enforce -- permanent audit mode is effectively no enforcement

### Critical Policy Coverage
<!-- activation: keywords=["image", "registry", "resources", "limits", "labels", "annotations", "required", "allowedRegistries", "requiredLabels"] -->

- [ ] **Missing image registry allowlist**: flag absence of a policy restricting container images to approved registries -- without this, workloads can pull images from Docker Hub, personal registries, or compromised sources
- [ ] **Missing resource requirements policy**: flag absence of a policy requiring resource requests and limits on all containers -- without enforcement, developers omit resource specs, leading to noisy-neighbor issues
- [ ] **Missing required labels policy**: flag absence of a policy requiring standard labels (app, team, environment) on workloads -- labels are essential for cost allocation, observability, and NetworkPolicy targeting
- [ ] **Missing privileged container block**: flag absence of a policy preventing `securityContext.privileged: true` -- without policy enforcement, a single manifest error grants full host access
- [ ] **Missing host namespace restriction**: flag absence of policies blocking hostNetwork, hostPID, and hostIPC -- admission policy is the most reliable place to prevent host namespace access

### Exclusion and Scope
<!-- activation: keywords=["exclude", "match", "namespaceSelector", "objectSelector", "kinds", "scope", "exception", "exemption"] -->

- [ ] **Overly broad exclude rules**: flag exclude blocks with wildcard namespace patterns (e.g., `*-system`, `*`) or that exempt more than 3-4 specific namespaces -- broad exclusions create unmonitored gaps in policy enforcement
- [ ] **Policy not covering all target namespaces**: flag policies with match clauses that use namespaceSelector with labels that do not exist on all application namespaces -- new namespaces may not inherit the required label, bypassing policies
- [ ] **Missing exception workflow**: flag policy deployments that rely on namespace-level exclusions instead of structured exception resources (Kyverno PolicyException, Gatekeeper exemption config) -- ad-hoc exclusions are difficult to audit and track
- [ ] **kube-system not excluded for legitimate system workloads**: flag policies that do not exclude kube-system when they would block system components -- this causes cluster instability; verify system namespaces are properly excluded

### Policy Testing
<!-- activation: keywords=["test", "_test.rego", "kyverno test", "gator", "verify", "fixture", "assert"] -->

- [ ] **Rego policy without tests**: flag .rego files without corresponding _test.rego files -- Rego policies are code and require unit tests; untested policies may have logic errors that either fail to block violations or block legitimate resources
- [ ] **Kyverno policy without test resources**: flag ClusterPolicies without accompanying test fixtures (pass and fail examples) in a tests/ directory -- Kyverno CLI can run `kyverno test` against fixtures to verify policy behavior
- [ ] **CEL expression without validation**: flag ValidatingAdmissionPolicy resources with CEL expressions that have no corresponding test -- CEL expressions are concise but error-prone; test with both compliant and non-compliant resources
- [ ] **No negative test cases**: flag policy test suites that only include passing cases -- test that the policy correctly blocks violating resources, not just that it allows compliant ones

### Webhook Configuration
<!-- activation: keywords=["webhook", "failurePolicy", "Ignore", "Fail", "MutatingWebhookConfiguration", "ValidatingWebhookConfiguration", "reinvocationPolicy", "sideEffects"] -->

- [ ] **failurePolicy: Ignore**: flag webhook configurations with `failurePolicy: Ignore` -- if the admission controller is unavailable, all requests pass through without policy checks; use `Fail` for security-critical policies and ensure the webhook is highly available
- [ ] **Mutating webhook without idempotency**: flag MutatingWebhookConfiguration without `reinvocationPolicy: IfNeeded` when the mutation depends on other webhooks -- non-idempotent mutations produce different results when reapplied, breaking GitOps reconciliation
- [ ] **sideEffects not None**: flag webhooks with `sideEffects` set to anything other than `None` -- webhooks with side effects cannot be safely retried and may cause inconsistent state
- [ ] **Missing webhook monitoring**: flag policy engine deployments without liveness probes, PodDisruptionBudgets, or alerting on webhook failure rates -- an unmonitored webhook failure silently disables all policy enforcement

## Common False Positives

- **Intentional audit-mode rollout**: new policies are often deployed in audit/dryrun mode first to assess impact before enforcing. This is a valid strategy -- flag only if the audit period appears indefinite.
- **Development clusters**: non-production clusters may intentionally have relaxed enforcement. Note environment context before flagging.
- **Kyverno generate rules**: generate rules create resources (e.g., default NetworkPolicy per namespace) and do not use enforce/audit semantics the same way validation rules do.
- **OPA Gatekeeper audit controller**: Gatekeeper's audit controller periodically evaluates existing resources against constraints. The `audit` enforcementAction on a Constraint is for pre-existing resources, not new submissions -- `deny` controls admission.

## Severity Guidance

| Finding | Severity |
|---|---|
| No image registry allowlist policy in production | Critical |
| failurePolicy: Ignore on security-critical webhook | Critical |
| Critical security policy stuck in audit/dryrun mode | Important |
| No policy blocking privileged containers | Important |
| Overly broad exclude rules bypassing policies | Important |
| Rego/CEL policy without unit tests | Important |
| Missing resource requirements enforcement policy | Important |
| Gatekeeper Constraint without matching ConstraintTemplate | Important |
| Mutating webhook without idempotency guarantee | Minor |
| Missing structured policy exception workflow | Minor |
| No negative test cases in policy test suite | Minor |
| Missing required labels enforcement policy | Minor |

## See Also

- `k8s-pod-security-standards` -- PSA is a built-in alternative to external policy engines for pod security
- `k8s-manifest-correctness` -- admission policies enforce the same controls checked by manifest linting
- `k8s-rbac` -- RBAC controls who can bypass admission policies via impersonation
- `sec-owasp-a05-misconfiguration` -- policy misconfiguration is a form of security misconfiguration

## Authoritative References

- [Kubernetes Documentation: Dynamic Admission Control](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/)
- [OPA Gatekeeper Documentation](https://open-policy-agent.github.io/gatekeeper/website/docs/)
- [Kyverno Documentation](https://kyverno.io/docs/)
- [Kubernetes Documentation: ValidatingAdmissionPolicy (CEL)](https://kubernetes.io/docs/reference/access-authn-authz/validating-admission-policy/)
- [OPA Documentation: Policy Testing](https://www.openpolicyagent.org/docs/latest/policy-testing/)
