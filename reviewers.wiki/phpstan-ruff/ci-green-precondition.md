---
id: ci-green-precondition
type: primary
depth_role: leaf
focus: "Gate reviewer that refuses to dispatch expensive reviewers when automated CI checks (lint, type, test, SAST, build) are red"
parents:
  - index.md
covers:
  - "Failing linter checks (eslint, ruff, clippy, pylint, rubocop, golangci-lint)"
  - "Type checker errors (tsc, mypy, pyright, flow, sorbet)"
  - Failing unit or integration tests
  - "SAST findings (semgrep, snyk code, CodeQL, bandit, brakeman)"
  - "SCA vulnerabilities in dependencies (snyk, npm audit, cargo audit, pip-audit)"
  - "Build failures (compile errors, asset pipeline, Docker build)"
  - "Formatting violations that would fail CI (prettier, black, gofmt, rustfmt)"
  - Pre-commit hook failures not resolved before pushing
tags:
  - ci
  - gate
  - lint
  - tests
  - sast
  - build
  - pre-dispatch
  - automation
activation:
  file_globs:
    - "**/*"
  keyword_matches: []
  structural_signals:
    - Any code diff
    - CI status available
    - PR check results present
source:
  origin: file
  path: ci-green-precondition.md
  hash: "sha256:7e568e96824bc3b001cea1e8ac8c406c58404dbe58fedd7b4e3b995149a8302e"
---
# CI Green Precondition

## When This Activates

Always loaded as a pre-dispatch gate. This reviewer runs before all other reviewers and determines whether it is worth proceeding with expensive human or AI review. If automated tooling has already found problems, those must be fixed first -- reviewer time should not be spent finding issues that machines catch for free. This reviewer does not find code issues itself; it checks that the automated safety net has passed.

## Audit Surface

- [ ] CI pipeline has one or more failing jobs
- [ ] Lint job is red -- code style or static analysis violations present
- [ ] Type-check job is red -- type errors exist in changed files
- [ ] Test job is red -- one or more test suites failing
- [ ] SAST job reports new findings introduced by this change
- [ ] SCA/dependency audit job reports new vulnerabilities
- [ ] Build job fails -- code does not compile or bundle
- [ ] Formatting check fails -- auto-formatter would produce a diff
- [ ] CI has not run yet -- pipeline pending or not triggered
- [ ] Required CI checks are missing from the PR status (misconfigured branch protection)
- [ ] CI passes on an old commit but the PR has newer commits without CI results
- [ ] Flaky test failure that the author dismissed without investigation

## Detailed Checks

### CI Status Verification
<!-- activation: structural_signals=["CI status available", "PR check results present"] -->

- [ ] All required status checks show a green/passing conclusion -- any red check blocks dispatch of downstream reviewers
- [ ] CI ran against the latest commit on the PR branch, not a stale earlier commit -- force-pushes and new commits invalidate prior results
- [ ] If CI is still pending or queued, defer review dispatch until results are available rather than reviewing blind
- [ ] No required checks are missing from the status list -- a missing check (as opposed to a failing one) indicates misconfigured branch protection or a pipeline that did not trigger
- [ ] If the repository has no CI configured at all, note this as a process gap but do not block review -- the absence of CI is a project-level issue, not a PR-level one

### Failure Triage
<!-- activation: structural_signals=["CI status available"], keywords=["fail", "error", "red", "broken"] -->

- [ ] For each failing check, identify whether the failure is in code the PR author changed or in pre-existing code -- new failures introduced by this PR are blocking, pre-existing failures may not be
- [ ] Distinguish between deterministic failures (lint errors, type errors, compile failures) and potentially flaky failures (timeout, network-dependent integration tests)
- [ ] If the author has dismissed a failing check with a comment like "flaky, re-running" -- verify the test is actually known-flaky, not a real regression being waved through
- [ ] Check whether failing tests are in the set of files modified by the PR -- a test failing in an unrelated module may be a pre-existing issue
- [ ] SAST findings: determine whether the finding is newly introduced by the diff or a pre-existing baseline suppression that was already accepted

### Gate Decision Logic
<!-- activation: structural_signals=["Any code diff"] -->

- [ ] **BLOCK** dispatch if: any lint, type-check, build, or formatting job is red and the failure is in code touched by the PR
- [ ] **BLOCK** dispatch if: any SAST job reports a new finding at severity medium or above
- [ ] **BLOCK** dispatch if: any test job is red and the failing test covers code modified in the PR
- [ ] **WARN but proceed** if: CI has not run yet (pending/queued) -- note that results are unavailable, flag risk, but allow review to begin
- [ ] **WARN but proceed** if: a test failure is in code unrelated to the PR and the failure is present on the base branch as well
- [ ] **WARN but proceed** if: the repository has no CI configured -- note the gap for the team to address
- [ ] **PASS** if: all required checks are green on the latest commit

### Automation Coverage Gaps
<!-- activation: structural_signals=["Any code diff"] -->

- [ ] If the PR introduces code in a language that has no corresponding lint/type-check CI job, flag the coverage gap (e.g., Python files added but no ruff or mypy in CI)
- [ ] If the PR modifies security-sensitive paths (auth, crypto, input parsing) and there is no SAST job, flag the missing safety net
- [ ] If the PR modifies dependencies (package.json, Cargo.toml, requirements.txt, go.mod) and there is no SCA/audit job, flag the gap
- [ ] If the project has a formatter configured (.prettierrc, pyproject.toml with black, rustfmt.toml) but no CI job enforces it, note that local formatting is not guaranteed

## Common False Positives

- **Intentionally skipped checks**: Some PRs (documentation-only, CI config changes) legitimately skip certain checks. If the CI config intentionally excludes paths, do not flag the missing check.
- **Known flaky tests**: Tests with a documented history of flakiness that the team has decided to tolerate temporarily. Verify the flakiness is tracked in an issue before accepting the dismissal.
- **Base branch failures**: If the base branch (main/develop) itself has failing CI, a PR cannot be expected to fix pre-existing failures outside its scope. Compare against base branch status.
- **Draft PRs**: Authors may push early to get CI feedback. Failing CI on a draft PR is expected workflow, not a gate violation.
- **External service outages**: CI failures caused by third-party service downtime (package registry, Docker Hub rate limits) are not code quality issues.

## Severity Guidance

| Finding | Severity |
|---|---|
| SAST finding at critical/high severity in code touched by the PR | Critical |
| Build failure -- code does not compile | Critical |
| Type-check errors in files modified by the PR | Important |
| Test failures in tests covering code modified by the PR | Important |
| Lint errors in files modified by the PR | Important |
| CI has not run on the latest commit (stale results) | Important |
| Formatting violations in files modified by the PR | Minor |
| CI not configured for a language present in the repo | Minor |
| SCA finding for a transitive dependency not introduced by this PR | Minor |

## See Also

- `author-self-review-hygiene` -- authors should run lint and tests locally before pushing, catching most CI failures before they reach the pipeline
- `conventional-commits-discipline` -- some CI pipelines validate commit message format; failures here are commit hygiene issues
- `style-guide-supremacy` -- formatting violations caught by CI are the formatter's domain, not a style debate

## Authoritative References

- [GitHub Docs: About required status checks](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches#require-status-checks-before-merging)
- [Google Engineering Practices: The Standard of Code Review](https://google.github.io/eng-practices/review/reviewer/standard.html)
- [Continuous Integration (Martin Fowler)](https://martinfowler.com/articles/continuousIntegration.html)
- [OWASP: SAST Tools](https://owasp.org/www-community/Source_Code_Analysis_Tools)
