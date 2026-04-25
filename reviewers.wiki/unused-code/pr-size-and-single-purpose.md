---
id: pr-size-and-single-purpose
type: primary
depth_role: leaf
focus: Detect pull requests that are too large to review effectively or that mix unrelated concerns, reducing review quality and increasing merge risk
parents:
  - index.md
covers:
  - "PRs exceeding 500 lines changed (warning threshold) or 1000 lines (strong warning)"
  - PRs touching 10+ files across unrelated directory subtrees
  - PRs mixing feature code with formatting or refactoring changes
  - PRs containing both a database migration and feature code
  - PRs with significant code changes but no corresponding test changes
  - PRs whose commit messages span multiple unrelated topics
  - "PRs that modify both infrastructure/config and application logic"
  - "PRs that bundle a rename/move refactor with behavioral changes"
tags:
  - pr-size
  - single-responsibility
  - review-quality
  - code-review
  - process
  - architecture
activation:
  file_globs:
    - "*"
  keyword_matches:
    - migration
    - refactor
    - rename
    - format
    - lint
    - move
  structural_signals:
    - large_diff
    - multi_directory_change
    - mixed_concerns
source:
  origin: file
  path: pr-size-and-single-purpose.md
  hash: "sha256:3af56d816dbf41488409e54685ec77104447951636249be8a0d6dcc114ec40a7"
---
# PR Size and Single Purpose

## When This Activates

Activates on every pull request as an orchestrator-level gate. Research consistently shows that review quality degrades as PR size increases -- reviewers miss more defects in large diffs because cognitive load overwhelms attention. A 200-line PR receives thorough scrutiny; a 1000-line PR gets skimmed. This reviewer flags PRs that are too large for effective review or that bundle unrelated changes, making it impossible for a reviewer to hold the full context in working memory. The remedy is always the same: split the PR.

## Audit Surface

- [ ] Total lines changed (additions + deletions) exceeds 500 (warning) or 1000 (strong warning)
- [ ] PR touches files in 4+ unrelated top-level directories or packages
- [ ] PR includes formatting-only or whitespace-only file changes alongside logic changes
- [ ] PR contains a database migration file AND feature/application code changes
- [ ] PR modifies production code but adds or modifies zero test files
- [ ] Commit messages within the PR describe unrelated changes
- [ ] PR modifies CI/CD configuration alongside application logic
- [ ] PR renames or moves files while also changing their content
- [ ] PR touches both frontend and backend code without clear justification
- [ ] PR includes vendored or generated file changes inflating the diff size
- [ ] PR description does not explain why these changes belong together

## Detailed Checks

### Diff Size Thresholds
<!-- activation: keywords=["diff", "stat", "lines", "changed", "additions", "deletions"] -->

- [ ] Count total lines changed (additions + deletions excluding generated files, lock files, and vendored dependencies) -- warn at 500+, strongly warn at 1000+
- [ ] Identify generated or auto-formatted files that inflate the diff: lock files (package-lock.json, yarn.lock, Cargo.lock, go.sum), generated protobuf stubs, OpenAPI clients, migration snapshots -- exclude these from the effective line count but note their presence
- [ ] Check the ratio of test lines to production lines -- a 400-line PR with 200 lines of tests is healthier than a 200-line PR with zero tests
- [ ] Flag PRs where a single file accounts for more than 50% of the total diff -- this often indicates a generated file or a file that should be split
- [ ] When the PR exceeds thresholds, suggest a split strategy: separate refactoring from feature work, extract migration into its own PR, split by domain boundary

### Mixed Concern Detection
<!-- activation: keywords=["migration", "refactor", "rename", "format", "lint", "style", "move", "config", "infra", "ci", "docker", "terraform"] -->

- [ ] Flag PRs that include both a database migration file (e.g., files matching `**/migrations/**`, `**/migrate/**`, `*.sql` with DDL statements) and application logic changes -- migrations should be reviewed and deployed independently
- [ ] Flag PRs that contain formatting-only hunks (whitespace, import sorting, trailing comma additions) mixed with logic changes -- formatting should be a separate commit or PR to keep the logic diff clean
- [ ] Flag PRs that rename or move files while also modifying their content -- split into a rename-only PR (easy to verify) followed by a content-change PR (needs careful review)
- [ ] Flag PRs that modify both CI/CD pipeline configuration (Jenkinsfile, .github/workflows, Dockerfile, Terraform, Helm charts) and application code -- infrastructure changes have different reviewers and rollback strategies
- [ ] Flag PRs that touch both frontend (components, styles, templates) and backend (API handlers, services, models) in a full-stack repo without a clear full-stack justification (e.g., a new API endpoint + its UI consumer is acceptable; a backend refactor + unrelated CSS fix is not)
- [ ] Flag PRs that bundle dependency upgrades with feature work -- dependency bumps should be isolated so regressions are attributable

### Commit Coherence Analysis
<!-- activation: keywords=["commit", "message", "log", "history", "squash"] -->

- [ ] Read commit messages on the branch and flag when they describe unrelated changes: e.g., one commit says "add user authentication" and another says "fix pagination bug in reports" -- these belong in separate PRs
- [ ] Flag PRs where more than 3 commits touch entirely disjoint sets of files with no shared directory -- this suggests multiple logical changes bundled together
- [ ] Identify "drive-by fixes" -- small unrelated corrections (typo fixes, import cleanup, comment updates) included alongside the main change; suggest extracting them into a separate trivial PR
- [ ] Flag PRs with a single "mega-commit" containing 500+ lines -- even if the PR is single-purpose, a single giant commit makes `git bisect` and rollback harder

### Missing Test Coverage Signal
<!-- activation: keywords=["test", "spec", "_test", ".test.", ".spec.", "Test", "IT"] -->

- [ ] Flag PRs that add or modify production code (non-test, non-config, non-docs files) but include zero changes to test files -- this does not prove tests are missing, but it is a strong signal worth investigating
- [ ] Exclude from this check: documentation-only PRs, configuration changes, build script updates, and trivial one-line fixes where existing tests already cover the path
- [ ] Flag PRs that delete test files without deleting the corresponding production code -- this suggests tests were removed to make a change pass rather than fixing the underlying issue
- [ ] Note when a PR modifies a test file only to disable or skip tests -- this is a red flag covered in detail by `author-self-review-hygiene`

## Common False Positives

- **Generated code and lock files**: Large diffs from auto-generated files (protobuf stubs, GraphQL types, OpenAPI clients, lock files) inflate line counts without adding review burden. Exclude them from effective size calculations.
- **Initial project scaffolding**: The first PR in a new project or module legitimately touches many files across many directories. Size thresholds apply to incremental changes, not bootstrap commits.
- **Coordinated API changes**: Renaming a widely-used type or function necessarily touches many files. If all changes are mechanical (find-and-replace), the PR is large but single-purpose. Flag for awareness, not as a defect.
- **Monorepo cross-cutting changes**: Changes to shared libraries in a monorepo may touch consumers across many packages. These are inherently cross-directory but may be single-purpose.
- **Full-stack feature with tight coupling**: A new API endpoint and its corresponding UI form may legitimately belong in one PR if they are meaningless without each other. Accept if the PR description justifies the coupling.
- **Migration + minimal seed data**: A migration PR that includes a small seed script or data fixture directly tied to the schema change is acceptable as a single unit.

## Severity Guidance

| Finding | Severity |
|---|---|
| PR exceeds 1000 lines changed (excluding generated files) | Important |
| PR mixes database migration with feature code | Important |
| PR modifies production code with zero test file changes | Important |
| Commit messages describe multiple unrelated changes | Important |
| PR exceeds 500 lines changed (excluding generated files) | Minor |
| PR includes formatting changes mixed with logic changes | Minor |
| PR renames files while also changing their content | Minor |
| PR touches both CI/CD config and application code | Minor |
| PR includes vendored/generated files inflating the diff | Minor |
| Drive-by fixes included alongside the main change | Minor |

## See Also

- `principle-separation-of-concerns` -- a PR should embody a single concern just as a class or module should
- `principle-dry-kiss-yagni` -- KISS applies to PR scope; the simplest reviewable unit is one concern per PR
- `antipattern-boat-anchor` -- large PRs accumulate boat-anchor code that slips past overwhelmed reviewers

## Authoritative References

- [Google Engineering Practices: Small CLs](https://google.github.io/eng-practices/review/developer/small-cls.html)
- [Cisco Study: "Modern Code Review" -- review effectiveness drops beyond 200-400 LOC](https://smartbear.com/learn/code-review/best-practices-for-peer-code-review/)
- [Microsoft Research: "Code Reviewing in the Trenches" (2013)](https://www.microsoft.com/en-us/research/publication/code-reviewing-in-the-trenches-understanding-challenges-best-practices-and-tool-needs/)
- [Palantir Engineering: "Code Review Best Practices"](https://blog.palantir.com/code-review-best-practices-19e02780015f)
