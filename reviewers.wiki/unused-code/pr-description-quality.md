---
id: pr-description-quality
type: primary
depth_role: leaf
focus: Enforce that PR descriptions are present, non-trivial, and helpful for reviewers by explaining what changed, why, and how to verify
parents:
  - index.md
covers:
  - Empty or missing PR description body
  - Single-line descriptions that provide no context for reviewers
  - Descriptions that parrot commit messages without adding narrative context
  - "Missing explanation of *why* the change was made (only describes *what*)"
  - No test plan or verification steps for reviewers to follow
  - Missing link to issue, ticket, or design doc when one should exist
  - "PR title that is generic or meaningless (fix bug, update code, WIP, misc)"
  - Description that omits scope of impact or affected components
  - No mention of breaking changes when the diff modifies public APIs or schemas
  - Description written entirely in technical shorthand incomprehensible to teammates
  - "Template placeholders left unfilled (e.g., <!-- describe changes here -->)"
  - Description that contradicts what the diff actually does
tags:
  - pr-description
  - documentation
  - process
  - review-hygiene
  - pull-request
  - author-discipline
activation:
  file_globs: []
  keyword_matches: []
  structural_signals:
    - PR context available
    - pull_request metadata present
    - merge request description field
source:
  origin: file
  path: pr-description-quality.md
  hash: "sha256:2c02dcca34d39c9f958f3af423eef079b241708d49cb16c3011756df14ff4198"
---
# PR Description Quality

## When This Activates

Activates when PR metadata (title, body, linked issues) is available for inspection. This reviewer does not examine the code diff itself -- it focuses entirely on the quality of the PR description as a communication artifact. A good PR description saves reviewer time, preserves institutional knowledge, and makes future git-archaeology possible. This reviewer gates on the *description*, not the *code*.

## Audit Surface

- [ ] PR body is empty, whitespace-only, or contains only template boilerplate
- [ ] PR body is a single sentence that restates the title
- [ ] Description lists files changed without explaining why they changed
- [ ] No "why" explanation -- description only says what was done, not the motivation
- [ ] Commit messages are the sole content of the description (copy-pasted or auto-generated)
- [ ] No test plan, QA steps, or verification section for a non-trivial change
- [ ] No issue/ticket link when the project uses a tracker (Jira, Linear, GitHub Issues)
- [ ] PR title is generic: "fix", "update", "WIP", "changes", "misc", "stuff", "temp"
- [ ] PR title exceeds 72 characters or uses sentence case inconsistently with project convention
- [ ] Breaking changes present in the diff but not called out in the description
- [ ] Template sections left with placeholder text (<!-- ... -->, TODO, TBD, N/A for required fields)
- [ ] Description references a different ticket or feature than what the diff implements
- [ ] No mention of rollback plan or feature flag for a risky change
- [ ] Screenshots or visual evidence missing when the change affects UI
- [ ] Description does not mention which services, packages, or modules are affected

## Detailed Checks

### Title Quality
<!-- activation: structural_signals=["PR context available"] -->

- [ ] Title is specific enough that a teammate scanning the PR list can understand the change without opening it -- "Fix null pointer in UserService.getProfile when account is deactivated" not "Fix bug"
- [ ] Title follows the project's naming convention (conventional commits prefix, ticket number prefix, imperative mood, etc.)
- [ ] Title does not duplicate the branch name verbatim -- branch names are for machines, titles are for humans
- [ ] Title avoids WIP, DO NOT MERGE, or draft indicators on a PR marked ready for review -- use GitHub's draft PR feature instead
- [ ] Title length is under 72 characters so it renders fully in PR list views and notification emails
- [ ] Title does not contain implementation details that belong in the body ("Fix bug by adding null check in line 42")

### Body Completeness
<!-- activation: structural_signals=["PR context available"] -->

- [ ] Description opens with a 1-3 sentence summary of *what* changed and *why* -- context that a reviewer needs before reading the diff
- [ ] For bug fixes: description includes what was broken, root cause, and how this change fixes it -- not just "fixed the bug"
- [ ] For features: description explains the user-facing behavior, design decisions, and any alternatives considered
- [ ] For refactors: description justifies why the refactor is needed now and confirms no behavioral changes
- [ ] Description mentions which components, services, or packages are affected so reviewers can assess blast radius
- [ ] If the change modifies public APIs, schemas, database migrations, or config formats, the description explicitly calls out the breaking change and migration path
- [ ] Description does not merely enumerate commits -- it synthesizes them into a coherent narrative

### Test Plan and Verification
<!-- activation: structural_signals=["PR context available"] -->

- [ ] Non-trivial changes include a test plan section explaining how the change was verified (manual steps, new tests, existing test coverage)
- [ ] Test plan is specific enough that another developer could reproduce the verification -- "tested locally" is insufficient
- [ ] For UI changes: screenshots, GIFs, or screen recordings of before/after state are included
- [ ] For API changes: example request/response pairs or curl commands are provided
- [ ] For performance changes: benchmark results or profiling data are referenced
- [ ] If no tests were added, the description explains why (e.g., "covered by existing integration test X")

### Issue Linkage and Traceability
<!-- activation: keywords=["JIRA", "LINEAR", "ISSUE", "TICKET", "fixes", "closes", "resolves", "ref", "relates"] -->

- [ ] PR links to the originating issue/ticket using the platform's linking syntax (Fixes #123, JIRA-456, LINEAR-789)
- [ ] The linked issue actually matches the work done in the PR -- not a stale or unrelated reference
- [ ] For projects using issue trackers: absence of any ticket link is flagged unless the change is trivial (typo fix, dependency bump)
- [ ] Closing keywords (Fixes, Closes, Resolves) are used correctly -- they auto-close the issue on merge, so they should only appear when the PR fully resolves the issue
- [ ] Epic or parent ticket is referenced when the PR is part of a larger initiative, giving reviewers strategic context

### Template Compliance
<!-- activation: structural_signals=["PR template detected"] -->

- [ ] If the repository has a PR template (.github/PULL_REQUEST_TEMPLATE.md or similar), all required sections are filled in
- [ ] Placeholder text from the template is replaced with actual content -- HTML comments like <!-- describe changes --> should not appear verbatim in the rendered description
- [ ] Optional template sections that do not apply are marked N/A or removed, not left blank with placeholder text
- [ ] Checkbox items in the template (e.g., "I have added tests") are checked or unchecked accurately, not left in their default state

## Common False Positives

- **Trivial changes**: Single-line typo fixes, dependency version bumps, and auto-generated code updates reasonably have minimal descriptions. A one-line description for a one-line change is proportional, not lazy.
- **Bot-generated PRs**: Dependabot, Renovate, and similar tools generate PRs with formulaic descriptions. These are machine-to-human communication with different norms than human-authored PRs.
- **Draft PRs**: Work-in-progress PRs may have incomplete descriptions intentionally. Flag only if the PR is marked ready for review.
- **Monorepo batch PRs**: Some workflows batch unrelated small changes into a single PR with a summary list rather than a narrative. This is a team convention, not a quality failure.
- **Internal team shorthand**: Teams with strong shared context may use abbreviated descriptions that outsiders find cryptic. If the project consistently uses this style and the team is small, the description may be adequate for its audience.

## Severity Guidance

| Finding | Severity |
|---|---|
| PR body is completely empty on a non-trivial change | Important |
| Breaking change in the diff with no mention in description | Important |
| Description contradicts what the diff actually does | Important |
| No test plan or verification steps for a feature or bug fix | Important |
| No issue/ticket link when the project uses a tracker | Minor |
| PR title is generic ("fix bug", "update", "WIP") on a ready-for-review PR | Minor |
| Template placeholder text left unfilled | Minor |
| Description restates commit messages without adding context | Minor |
| Missing screenshots for a UI change | Minor |
| Title exceeds 72 characters | Minor |

## See Also

- `author-self-review-hygiene` -- self-review includes verifying the description is complete before requesting review
- `conventional-commits-discipline` -- PR titles often follow commit conventions; inconsistency between title and commit style confuses tooling
- `pr-size-and-single-purpose` -- large multi-purpose PRs are harder to describe well; if the description is struggling to be coherent, the PR may need splitting
- `principle-naming-and-intent` -- the same clarity principles that apply to code names apply to PR titles and descriptions

## Authoritative References

- [GitHub Docs: Creating a pull request](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request)
- [Google Engineering Practices: Writing good CL descriptions](https://google.github.io/eng-practices/review/developer/cl-descriptions.html)
- [Conventional Comments](https://conventionalcomments.org/)
- [How to Write a Git Commit Message (Chris Beams)](https://cbea.ms/git-commit/) -- title conventions apply equally to PR titles
- [Atlassian: Writing the Perfect Pull Request](https://www.atlassian.com/blog/git/written-unwritten-guide-pull-requests)
