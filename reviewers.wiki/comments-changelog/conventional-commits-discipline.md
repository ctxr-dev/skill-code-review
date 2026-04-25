---
id: conventional-commits-discipline
type: primary
depth_role: leaf
focus: Enforce Conventional Commits message structure, subject line discipline, and commit hygiene to keep the changelog machine-readable and the history navigable
parents:
  - index.md
covers:
  - "Commit messages without a valid type prefix (feat, fix, chore, refactor, docs, style, test, ci, build, perf)"
  - Subject lines exceeding 72 characters
  - Missing blank line between subject and body
  - Commit body that repeats the diff instead of explaining the motivation
  - WIP, temp, or fixup commits that should have been squashed before merge
  - Missing scope when the project convention requires scoped commits
  - "Breaking change marker (!) without a BREAKING CHANGE footer"
  - Type prefix that does not match the actual change content
  - "Capitalized first word after the colon (Conventional Commits uses lowercase)"
  - Subject line ending with a period
  - Multiple unrelated changes collapsed into a single commit message
tags:
  - conventional-commits
  - commit-messages
  - changelog
  - semver
  - git-hygiene
  - documentation
  - readability
activation:
  file_globs:
    - "*"
  keyword_matches:
    - commit
    - message
    - feat
    - fix
    - chore
    - refactor
    - docs
    - style
    - test
    - ci
    - build
    - perf
    - BREAKING CHANGE
    - BREAKING-CHANGE
  structural_signals:
    - commit_message
    - git_log
    - merge_commit
source:
  origin: file
  path: conventional-commits-discipline.md
  hash: "sha256:59a50817ce701aed4b586f546f333c686ffb7b1273e1acc4cdd867cd62bd0e82"
---
# Conventional Commits Discipline

## When This Activates

Activates when commit messages are in scope for review -- typically on pull request review where the branch commit history is visible, or when a project's contribution guidelines reference Conventional Commits. This reviewer enforces the Conventional Commits specification (v1.0.0) and common extensions. Well-structured commit messages enable automated changelogs, semantic versioning, and meaningful `git log` output. Poorly structured messages make `git bisect` useless and changelogs unreadable.

## Audit Surface

- [ ] Commit subject lacks a Conventional Commits type prefix (feat:, fix:, chore:, refactor:, docs:, style:, test:, ci:, build:, perf:)
- [ ] Commit subject line exceeds 72 characters
- [ ] No blank line separates the subject from the body
- [ ] Commit body restates the diff (lists file names or code changes) instead of explaining *why* the change was made
- [ ] WIP, wip, temp, fixup!, or squash! commit exists in the PR branch and was not squashed
- [ ] Scope is missing from the type prefix when the project's commit history consistently uses scoped commits
- [ ] Breaking change indicator (!) is present in the type/scope but no BREAKING CHANGE: footer exists in the commit body
- [ ] Type prefix does not match the change: e.g., fix: used for a new feature, or feat: used for a formatting change
- [ ] First word after the colon is capitalized (should be lowercase per Conventional Commits)
- [ ] Subject line ends with a period
- [ ] Single commit message describes multiple unrelated changes (should be separate commits)
- [ ] Commit references a ticket or issue number in the subject line instead of in the body or footer
- [ ] Merge commit message overrides the default merge message format without justification
- [ ] Commit body is missing when the subject alone does not explain a non-trivial change
- [ ] Footer uses incorrect format (e.g., BREAKING-CHANGE instead of BREAKING CHANGE, or missing colon separator)

## Detailed Checks

### Type Prefix Validation
<!-- activation: keywords=["feat", "fix", "chore", "refactor", "docs", "style", "test", "ci", "build", "perf", "revert"] -->

- [ ] Verify the subject starts with a valid type: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, or `revert` -- reject freeform prefixes like `update:`, `change:`, `misc:`
- [ ] Check that the type accurately describes the change content -- `feat:` should introduce new user-facing functionality; `fix:` should correct a bug; `refactor:` should change structure without altering behavior; `style:` should be formatting only; `chore:` should be tooling or maintenance with no production code change
- [ ] Flag commits where `fix:` is used for a new feature (should be `feat:`) or `feat:` is used for a formatting change (should be `style:`) -- type mismatch corrupts changelogs
- [ ] Verify `revert:` commits reference the commit hash being reverted in the body
- [ ] Check for custom type prefixes (e.g., `wip:`, `temp:`, `hotfix:`) that are not part of the Conventional Commits spec or the project's documented extensions

### Subject Line Formatting
<!-- activation: keywords=["commit", "message", "subject", "title"] -->

- [ ] Measure subject line length -- warn at 50+ characters, flag at 72+ characters (72 is the hard limit for `git log --oneline` readability)
- [ ] Check for a period at the end of the subject line -- the subject is a headline, not a sentence; trailing periods waste a character and look wrong in changelogs
- [ ] Verify the first word after `type(scope):` is lowercase -- Conventional Commits mandates lowercase descriptions: `feat: add user auth`, not `feat: Add user auth`
- [ ] Check for scope presence when the project's recent commit history (last 50 commits) uses scopes in more than 70% of commits -- missing scope is likely an oversight, not a deliberate choice
- [ ] Flag subjects that start with a verb in past tense ("added", "fixed", "removed") -- use imperative mood ("add", "fix", "remove") to match `git revert` and `git merge` defaults
- [ ] Flag subjects that are vague: "update code", "fix bug", "changes", "misc" -- the subject should identify what was changed and at minimum hint at why

### Commit Body and Footer Discipline
<!-- activation: keywords=["BREAKING CHANGE", "BREAKING-CHANGE", "Refs:", "Closes", "Fixes", "Reviewed-by", "Co-authored-by"] -->

- [ ] Check for a blank line between the subject and body -- git treats the first paragraph as the subject; a missing blank line merges subject and body into one long subject
- [ ] Flag commit bodies that enumerate file names or paste diff content -- the body should explain *why* the change was made, not *what* files were touched (the diff shows that)
- [ ] Verify that `!` in the type/scope (e.g., `feat(api)!:`) is accompanied by a `BREAKING CHANGE:` footer in the body -- the footer provides details about the breaking change for changelog generators
- [ ] Check footer format: each footer must use the pattern `token: value` or `token #value` -- common errors include `BREAKING-CHANGE` (hyphen instead of space), missing colon, or free-text footers without a token
- [ ] Flag bodies that repeat the subject line verbatim -- if the body adds no new information, omit it
- [ ] Verify issue/ticket references appear in the footer (`Refs: JIRA-1234`, `Closes #456`) rather than cluttering the subject line

### WIP and Squash Hygiene
<!-- activation: keywords=["WIP", "wip", "fixup", "squash", "temp", "TODO", "checkpoint"] -->

- [ ] Flag commits with subjects starting with `WIP`, `wip`, `temp`, `checkpoint`, or `TODO` -- these are development markers that must be squashed before merge
- [ ] Flag `fixup!` and `squash!` prefix commits that were not consumed by an interactive rebase -- their presence means the author forgot to squash
- [ ] Identify sequences of small commits by the same author with near-identical messages ("fix", "fix again", "really fix") -- these should be squashed into a single coherent commit
- [ ] Flag commits with empty or whitespace-only messages -- every commit must have a meaningful subject
- [ ] Check for commits that contain only a ticket number as the subject (e.g., "JIRA-1234") -- the subject must describe what changed, with the ticket in the footer
- [ ] Identify commits where the subject says "address review comments" or "PR feedback" -- these should be squashed into the commit they fix before merge

### Type-to-Content Consistency
<!-- activation: keywords=["feat", "fix", "refactor", "style", "test", "docs", "perf"] -->

- [ ] Cross-check `feat:` commits -- the diff should introduce new behavior (new endpoint, new UI element, new CLI flag), not just refactor existing code
- [ ] Cross-check `fix:` commits -- the diff should correct a defect; if it adds net-new functionality, `feat:` is more appropriate
- [ ] Cross-check `refactor:` commits -- the diff should not change observable behavior; if tests are updated to expect different outputs, this is not a pure refactor
- [ ] Cross-check `style:` commits -- the diff should contain only whitespace, formatting, or linting changes; any logic change disqualifies `style:`
- [ ] Cross-check `test:` commits -- the diff should only add or modify test files; production code changes paired with test changes belong under `feat:` or `fix:`
- [ ] Cross-check `docs:` commits -- the diff should only touch documentation files (README, CHANGELOG, man pages, docstrings); code changes disqualify `docs:`
- [ ] Cross-check `perf:` commits -- the diff should contain a performance improvement; verify the commit message or body references a benchmark or measurement

### Breaking Change Protocol
<!-- activation: keywords=["BREAKING CHANGE", "BREAKING", "!", "major", "deprecat"] -->

- [ ] Verify every `!` marker in the type/scope has a corresponding `BREAKING CHANGE:` footer with a description of what breaks and the migration path
- [ ] Flag commits that remove a public API function, rename a public type, change a function signature, or alter default behavior without a `BREAKING CHANGE:` footer -- these are undocumented breaking changes
- [ ] Check that the `BREAKING CHANGE:` footer describes the impact on consumers and suggests a migration path
- [ ] Flag multiple breaking changes in a single commit -- each breaking change should ideally be a separate commit for clean changelog entries

## Common False Positives

- **Merge commits**: Merge commits generated by git or the hosting platform (e.g., "Merge branch 'main' into feature/x") follow their own format and should not be held to Conventional Commits standards.
- **Squash-merge PRs**: Some workflows squash all PR commits into one on merge, generating the final message from the PR title. Individual branch commits may be informal during development if the team squashes on merge.
- **Initial commits and version tags**: "Initial commit" or "v1.0.0" are conventional in their own right and need not follow the type prefix format.
- **Revert commits**: Auto-generated revert messages from `git revert` follow a standard format that may not match Conventional Commits exactly. Accept them if they reference the reverted commit.
- **Projects not using Conventional Commits**: If the project's contribution guide and recent history do not follow Conventional Commits, do not enforce this reviewer's rules. Check for `.commitlintrc`, `commitlint.config.js`, or explicit mention in CONTRIBUTING.md.
- **Monorepo scope conventions**: Some monorepos use package names as scopes (e.g., `fix(core):`, `feat(web):`) which are valid extensions of the spec.

## Severity Guidance

| Finding | Severity |
|---|---|
| Breaking change (!) without BREAKING CHANGE: footer | Important |
| WIP/fixup!/squash! commit present in a PR marked ready for review | Important |
| Type prefix does not match the actual change content (feat: for a bug fix) | Important |
| Commit subject lacks any type prefix | Important |
| Subject line exceeds 72 characters | Minor |
| First word after colon is capitalized instead of lowercase | Minor |
| Subject line ends with a period | Minor |
| Commit body restates the diff instead of explaining motivation | Minor |
| Ticket reference in subject line instead of footer | Minor |
| Missing scope when project convention uses scopes | Minor |

## See Also

- `principle-naming-and-intent` -- commit messages are names for changes; they should convey intent just as function names do
- `principle-dry-kiss-yagni` -- commit messages should be as simple as possible (KISS) while conveying essential context

## Authoritative References

- [Conventional Commits Specification v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/)
- [Angular Commit Message Guidelines](https://github.com/angular/angular/blob/main/CONTRIBUTING.md#-commit-message-format)
- [commitlint: Lint commit messages](https://commitlint.js.org/)
- [Chris Beams, "How to Write a Git Commit Message"](https://cbcodetips.blogspot.com/2023/09/writing-good-commit-messages.html)
- [Tim Pope, "A Note About Git Commit Messages"](https://tbaggery.com/2008/04/19/a-note-about-git-commit-messages.html)
