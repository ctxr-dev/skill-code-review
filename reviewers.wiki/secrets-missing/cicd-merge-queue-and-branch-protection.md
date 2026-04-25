---
id: cicd-merge-queue-and-branch-protection
type: primary
depth_role: leaf
focus: Detect branch protection and merge queue issues including unprotected main branches, missing required reviews, missing status checks, allowed force push, absent merge queue for high-traffic repos, and missing signed commits
parents:
  - index.md
covers:
  - "Main/default branch not protected"
  - Missing required pull request reviews before merge
  - "Missing required status checks (CI must pass)"
  - Force push allowed on protected branches
  - Merge queue not configured for high-traffic repositories
  - Missing signed commits requirement
  - Code owners file missing or incomplete
  - Branch protection bypassable by admins
  - Stale review dismissal not enabled
  - "Linear history not enforced (merge commits obscure changes)"
tags:
  - branch-protection
  - merge-queue
  - code-review
  - ci-cd
  - git
  - governance
  - signed-commits
activation:
  file_globs:
    - "**/.github/**"
    - "**/CODEOWNERS"
    - "**/.gitlab/**"
    - "**/branch-protection*"
  keyword_matches:
    - branch protection
    - merge queue
    - required review
    - status check
    - CODEOWNERS
    - force push
    - signed commit
    - auto-merge
    - merge_group
    - squash
    - rebase
  structural_signals:
    - Branch protection or repository settings change
    - CODEOWNERS file change
    - Merge queue or auto-merge configuration change
    - CI workflow adding or removing status checks
source:
  origin: file
  path: cicd-merge-queue-and-branch-protection.md
  hash: "sha256:d608580e829cef1d7cb6ea69697094e5637c7aed1bc3f298114c5422925fb1d0"
---
# Merge Queue and Branch Protection

## When This Activates

Activates when diffs touch repository configuration files (CODEOWNERS, branch protection settings), CI workflow files that define status checks, or merge queue configuration. Branch protection rules are the primary governance mechanism preventing unreviewed, untested, or unauthorized code from reaching the default branch. Missing protection allows direct pushes that bypass CI and review, force pushes that rewrite history to hide malicious changes, and merges of code that fails tests. Merge queues prevent the "semantic conflict" problem where two individually passing PRs create a broken main branch when merged sequentially. This reviewer detects gaps in branch protection and merge governance that weaken code quality gates.

## Audit Surface

- [ ] Default branch without branch protection rule
- [ ] Branch protection without required reviewers
- [ ] Branch protection without required status checks
- [ ] Force push enabled on main/default branch
- [ ] High-traffic repo without merge queue
- [ ] Missing commit signing requirement
- [ ] Missing or incomplete CODEOWNERS file
- [ ] Admin bypass enabled on branch protection
- [ ] Stale review approval not dismissed on new push
- [ ] No linear history requirement
- [ ] Status checks not strict (base branch not required up to date)
- [ ] Deploy branch without protection
- [ ] Release/tag creation not restricted

## Detailed Checks

### Branch Protection Rules
<!-- activation: keywords=["branch protection", "protected", "main", "master", "default", "restrict", "require"] -->

- [ ] **Unprotected default branch**: flag repositories where the main/master/default branch has no branch protection rule -- anyone with write access can push directly, bypassing code review and CI. Enable branch protection on the default branch at minimum
- [ ] **Missing required reviews**: flag branch protection rules that do not require pull request reviews before merge -- without review requirements, a developer can merge their own code without peer review. Require at least 1 reviewer (2 for security-sensitive repositories)
- [ ] **Missing required status checks**: flag branch protection that does not require CI status checks to pass before merge -- code that fails tests, linting, or security scanning can be merged. Add all critical CI jobs as required status checks
- [ ] **Force push allowed**: flag branch protection rules that allow force pushes to the default branch -- force push enables history rewriting, which can remove evidence of malicious commits, break dependent branches, and corrupt the audit trail. Disable force push on all protected branches
- [ ] **Admin bypass enabled**: flag branch protection with "allow administrators to bypass" or equivalent -- admin bypass creates a privileged path that circumvents all protection rules. Disable admin bypass; admins should use the same merge process as everyone else

### Merge Queue Configuration
<!-- activation: keywords=["merge queue", "merge_group", "auto-merge", "merge train", "batch", "queue"] -->

- [ ] **High-traffic repo without merge queue**: flag repositories with frequent concurrent PRs (multiple merges per day) that do not use a merge queue (GitHub merge queue, GitLab merge train, Mergify) -- without a merge queue, PRs are tested against a stale base branch; two individually passing PRs can create a broken main when merged. The merge queue tests PRs against the expected post-merge state
- [ ] **Status checks not strict**: flag "Require branches to be up to date before merging" not enabled alongside required status checks -- without strict checks, a PR tested against an older base branch can merge even though the latest base branch would cause failures. Merge queue is the scalable alternative to strict checks
- [ ] **Merge queue without required checks**: flag merge queue configuration that does not run the same status checks as branch protection -- the merge queue must re-validate PRs in the merged state, not just fast-track previously passing checks

### Code Review Governance
<!-- activation: keywords=["CODEOWNERS", "review", "approval", "dismiss", "stale", "require_code_owner"] -->

- [ ] **Missing CODEOWNERS file**: flag repositories without a CODEOWNERS file -- CODEOWNERS automatically assigns reviewers based on file paths, ensuring domain experts review changes in their area. Without it, review assignment is manual and error-prone
- [ ] **Incomplete CODEOWNERS coverage**: flag CODEOWNERS files that do not cover critical paths (infrastructure/, deploy/, security/, .github/workflows/) -- uncovered paths do not trigger automatic review assignment, and changes may be merged without domain expert review
- [ ] **Stale approvals not dismissed**: flag branch protection that does not dismiss stale pull request approvals when new commits are pushed -- a reviewer approves, the author pushes new (potentially malicious) code, and the stale approval allows merge without re-review
- [ ] **Missing code owner requirement**: flag branch protection rules without "Require review from code owners" -- even with CODEOWNERS defined, reviews from code owners are only enforced if the branch protection rule requires it

### Commit Integrity and History
<!-- activation: keywords=["signed", "signing", "gpg", "ssh", "verified", "linear", "squash", "rebase", "merge commit"] -->

- [ ] **Missing signed commits requirement**: flag branch protection without commit signature verification -- unsigned commits can be attributed to any author via `git config user.email`. Requiring signed commits (GPG or SSH) provides cryptographic proof of author identity
- [ ] **No linear history enforcement**: flag repositories that allow merge commits without squash or rebase -- merge commits obscure the change set, make bisecting harder, and can hide unexpected code in merge resolution. Enforce squash merge or rebase for clean history
- [ ] **Release tag creation unrestricted**: flag repositories where any contributor can create tags -- tags trigger release workflows and may have special CI behavior. Restrict tag creation to maintainers or release automation

## Common False Positives

- **New/personal repositories**: small, single-developer repositories may legitimately skip branch protection and code review requirements.
- **Bot auto-merge**: dependabot, renovate, and similar bots may auto-merge with reduced review requirements. This is acceptable when the bot's PR is limited to dependency updates with passing CI.
- **Merge commits for release branches**: some teams prefer merge commits on release branches for explicit merge points. Linear history enforcement may not apply to non-default branches.
- **Admin bypass for emergency fixes**: some organizations allow admin bypass for critical hotfixes with a post-hoc review requirement. This should be documented in the security policy.

## Severity Guidance

| Finding | Severity |
|---|---|
| Default branch without branch protection | Critical |
| Force push allowed on default branch | Critical |
| No required status checks on branch protection | Important |
| No required reviews on branch protection | Important |
| Stale approvals not dismissed on new push | Important |
| Admin bypass enabled on branch protection | Important |
| High-traffic repo without merge queue (broken main risk) | Important |
| Missing CODEOWNERS file | Minor |
| Missing signed commits requirement | Minor |
| No linear history enforcement | Minor |
| CODEOWNERS not covering critical paths | Minor |
| Release tag creation unrestricted | Minor |

## See Also

- `cicd-github-actions` -- GitHub Actions status checks and workflow triggers
- `cicd-test-parallelization-and-flaky-quarantine` -- flaky tests undermining required status checks
- `sec-supply-chain-sbom-slsa-sigstore` -- signed commits as supply chain integrity control
- `cicd-deploy-strategies` -- deploy gates and approval mechanisms
- `sec-owasp-a05-misconfiguration` -- repository misconfiguration as security risk

## Authoritative References

- [GitHub Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-a-branch-protection-rule)
- [GitHub Merge Queue](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue)
- [GitLab Merge Trains](https://docs.gitlab.com/ee/ci/pipelines/merge_trains.html)
- [GitHub CODEOWNERS](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
- [OpenSSF Scorecard: Branch Protection](https://github.com/ossf/scorecard/blob/main/docs/checks.md#branch-protection)
- [OWASP CI/CD Security Top 10](https://owasp.org/www-project-top-10-ci-cd-security-risks/)
