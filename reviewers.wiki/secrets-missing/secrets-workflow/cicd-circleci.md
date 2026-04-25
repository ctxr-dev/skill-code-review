---
id: cicd-circleci
type: primary
depth_role: leaf
focus: Detect CircleCI security and reliability issues including unpinned orbs, secrets in config, missing context restrictions, improper parallelism, wrong resource classes, and missing workspace persistence
parents:
  - index.md
covers:
  - Orbs referenced by mutable tag instead of pinned version or SHA
  - "Secrets hardcoded in .circleci/config.yml"
  - Contexts without security group restrictions
  - "Parallelism without proper test splitting (circleci tests split)"
  - Resource class oversized or undersized for job workload
  - Missing workspace persistence between jobs in a workflow
  - Unconstrained context access on fork PRs
  - Missing pipeline parameter validation
  - Jobs without resource_class specification
  - Workflow without branch filtering for deploy jobs
tags:
  - circleci
  - ci-cd
  - orbs
  - pipeline
  - secrets
  - parallelism
  - CWE-829
  - CWE-798
activation:
  file_globs:
    - "**/.circleci/config.yml"
    - "**/.circleci/**"
  keyword_matches:
    - circleci
    - "orbs:"
    - "workflows:"
    - "executors:"
    - resource_class
    - parallelism
    - "context:"
    - persist_to_workspace
    - attach_workspace
    - store_test_results
  structural_signals:
    - CircleCI configuration file change
    - Orb reference added or changed
source:
  origin: file
  path: cicd-circleci.md
  hash: "sha256:c5486f38e7145c9167eea6ce56861d8f0c997e7dd56c597410a78282a9f6aeda"
---
# CircleCI Security and Reliability

## When This Activates

Activates when diffs touch `.circleci/config.yml` or related configuration. CircleCI pipelines access organization secrets through contexts, run with cloud credentials, and orchestrate deployments. Unpinned orbs introduce third-party code that executes with full job privileges, unrestricted contexts leak secrets to fork PRs, and mismatched resource classes waste compute budget or starve build performance. This reviewer detects CircleCI-specific patterns that compromise pipeline security, waste resources, or reduce CI reliability.

## Audit Surface

- [ ] Orb reference using dev: tag or volatile version
- [ ] Hardcoded credential or token in config.yml
- [ ] Context used without restricted security group
- [ ] parallelism: N without circleci tests split in run step
- [ ] resource_class too large or too small for job workload
- [ ] Missing persist_to_workspace / attach_workspace between dependent jobs
- [ ] Deploy job without branch filter or approval step
- [ ] Pipeline parameter used in run: without validation
- [ ] Fork PR workflow with access to org contexts
- [ ] No store_test_results step (timing data lost)
- [ ] Cache restore key too broad (stale dependencies)
- [ ] Missing timeout on long-running jobs

## Detailed Checks

### Orb Pinning and Supply Chain
<!-- activation: keywords=["orbs:", "circleci/", "dev:", "volatile", "@"] -->

- [ ] **Orb with mutable version**: flag orb references using `volatile` tag, `dev:` prefix, or unpinned major version (e.g., `circleci/node@1`) -- orb versions can be updated by the publisher at any time. Pin to exact version (`circleci/node@5.2.0`) or use organization-level orb security settings to restrict to curated orbs
- [ ] **Third-party orb from untrusted publisher**: flag orbs from unknown publishers that execute privileged steps (deployment, registry push, cloud auth). Prefer CircleCI-maintained orbs (`circleci/` namespace) or audit and fork third-party orbs
- [ ] **Orb inline command injection**: flag orbs that accept string parameters interpolated into shell commands without quoting -- a malicious or careless orb parameter can inject arbitrary shell commands

### Secrets and Context Security
<!-- activation: keywords=["context:", "CIRCLE_TOKEN", "secret", "password", "token", "key", "credential", "environment:"] -->

- [ ] **Secrets in config.yml**: flag `.circleci/config.yml` containing hardcoded passwords, tokens, or API keys in `environment:` blocks -- config files are committed to version control. Use CircleCI contexts or project-level environment variables
- [ ] **Unrestricted context**: flag workflows using contexts without security group restrictions -- any project member can trigger a pipeline that accesses context secrets. Restrict contexts to specific security groups and require approval for production contexts
- [ ] **Context available to fork PRs**: flag workflows triggered by fork PRs that have access to organization contexts -- fork PR authors are untrusted and can exfiltrate secrets. Use `forked_pull_requests` settings to block context access on forks
- [ ] **Pipeline parameter in shell without validation**: flag `<< pipeline.parameters.* >>` values used directly in `run:` commands without sanitization -- user-supplied pipeline parameters can inject shell commands

### Parallelism and Test Splitting
<!-- activation: keywords=["parallelism:", "circleci tests split", "store_test_results", "timing", "split-by"] -->

- [ ] **Parallelism without test splitting**: flag jobs with `parallelism: N` where N > 1 but no `circleci tests split` command in the run steps -- without test splitting, each parallel container runs the full test suite, multiplying runtime instead of dividing it
- [ ] **Missing store_test_results**: flag test jobs that do not use `store_test_results` -- without test results, CircleCI cannot provide timing data for intelligent test splitting, and test insights are unavailable
- [ ] **Split without timing data**: flag `circleci tests split --split-by=timings` in a project that has no stored test results history -- the first run with timing-based splitting will have no data and will fall back to uneven distribution. Bootstrap with `--split-by=filesize` initially

### Resource Classes and Efficiency
<!-- activation: keywords=["resource_class:", "small", "medium", "large", "xlarge", "2xlarge", "docker", "machine"] -->

- [ ] **Oversized resource class**: flag lint, formatting, or lightweight jobs using `large`, `xlarge`, or `2xlarge` resource classes -- these waste compute credits. Use `small` or `medium` for jobs that do not compile code or run heavy test suites
- [ ] **Undersized resource class**: flag build, compile, or heavy test jobs without an explicit `resource_class` (defaults to `medium`) -- resource-intensive jobs on undersized instances run slowly and may OOM. Match resource class to workload
- [ ] **Missing resource_class specification**: flag jobs without `resource_class` -- relying on defaults obscures cost and performance characteristics. Be explicit about resource requirements

### Workspace and Workflow Orchestration
<!-- activation: keywords=["persist_to_workspace", "attach_workspace", "requires:", "approval", "filters:", "branches:"] -->

- [ ] **Missing workspace persistence**: flag workflows where a build job produces artifacts needed by downstream test or deploy jobs but does not use `persist_to_workspace` -- downstream jobs re-execute the build or fail from missing files
- [ ] **Deploy without branch filter**: flag deploy jobs that lack `filters: branches: only: [main]` or equivalent -- without branch filtering, deploy jobs can be triggered from feature branches
- [ ] **Missing approval job**: flag production deploy workflows without a manual `type: approval` gate -- any push to the deploy branch triggers production deployment without human review
- [ ] **No timeout on jobs**: flag jobs without `no_output_timeout` or resource-level timeout -- stuck jobs consume credits for 10 minutes (default no_output_timeout) or longer before failing

## Common False Positives

- **Development orbs**: `dev:` orb versions in a development branch config being actively iterated are expected. Flag only on the default/main branch or in production workflow contexts.
- **Parallelism 1**: `parallelism: 1` is equivalent to no parallelism and does not require test splitting.
- **Approval jobs on non-production workflows**: manual approval gates are unnecessary for staging or preview environments in some teams.
- **Context restrictions managed externally**: context security groups may be configured in CircleCI's UI rather than in config.yml. If you cannot verify, note the recommendation but reduce confidence.

## Severity Guidance

| Finding | Severity |
|---|---|
| Hardcoded secret in .circleci/config.yml | Critical |
| Context accessible to fork PRs with secrets | Critical |
| Orb from untrusted publisher executing privileged steps | Important |
| Deploy job without branch filter or approval gate | Important |
| Unrestricted context (no security group) | Important |
| Pipeline parameter used unsanitized in shell | Important |
| Parallelism without test splitting (wasted compute) | Minor |
| Missing store_test_results (no timing data) | Minor |
| Oversized resource class for lightweight job | Minor |
| Missing workspace persistence between dependent jobs | Minor |

## See Also

- `sec-supply-chain-sbom-slsa-sigstore` -- orb pinning as supply chain control
- `sec-secrets-management-and-rotation` -- secrets in CI/CD and credential rotation
- `cicd-pipeline-secrets-discipline` -- cross-platform secrets hygiene
- `cicd-caching-strategy` -- cache key design and invalidation
- `cicd-test-parallelization-and-flaky-quarantine` -- test splitting and flaky test management

## Authoritative References

- [CircleCI Security Best Practices](https://circleci.com/docs/security-recommendations/)
- [CircleCI Orb Security](https://circleci.com/docs/orbs-faq/#orb-security)
- [CircleCI Contexts](https://circleci.com/docs/contexts/)
- [CircleCI Test Splitting](https://circleci.com/docs/parallelism-faster-jobs/)
- [OWASP CI/CD Security Top 10](https://owasp.org/www-project-top-10-ci-cd-security-risks/)
