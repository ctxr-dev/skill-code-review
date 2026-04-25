---
id: doc-readme-root
type: primary
depth_role: leaf
focus: Detect missing, skeletal, or stale root README files that fail to onboard contributors or explain the project
parents:
  - index.md
covers:
  - Repository has no README.md at root
  - README contains only the project name or a single heading with no content
  - Missing setup or install instructions
  - Missing usage examples or quick-start section
  - Missing contributing guidelines or link to CONTRIBUTING.md
  - "Stale CI/CD badges showing outdated or broken status"
  - Missing license declaration or link to LICENSE file
  - Missing architecture overview for non-trivial multi-module projects
  - README references removed features, deprecated commands, or old API endpoints
  - No prerequisites section listing required runtimes, tools, or OS constraints
tags:
  - readme
  - documentation
  - onboarding
  - contributing
  - license
  - badges
  - architecture
activation:
  file_globs:
    - "**/README.md"
    - "**/README.rst"
    - "**/README.txt"
    - "**/README"
    - "**/CONTRIBUTING.md"
    - "**/LICENSE*"
  keyword_matches:
    - README
    - readme
    - "# Installation"
    - "# Setup"
    - "# Usage"
    - "# Contributing"
    - badge
  structural_signals:
    - New repository initialization
    - Root-level documentation change
source:
  origin: file
  path: doc-readme-root.md
  hash: "sha256:34ce8ba444ab90de4abd4d18f6d58f2a926404ae321b958ff153a7fb3c56ed1c"
---
# Root README Quality

## When This Activates

Activates when a diff touches README files, when a new repository is initialized without a README, or when significant feature changes land without corresponding README updates. The root README is the front door of every project -- it determines whether a new contributor can get started in minutes or gives up in frustration. A missing or skeletal README is a documentation debt that compounds as the team grows.

## Audit Surface

- [ ] No README.md file at repository root
- [ ] README is under 10 lines or contains only a heading and auto-generated boilerplate
- [ ] No install/setup section explaining how to get the project running locally
- [ ] No usage examples or quick-start snippet
- [ ] No contributing section or link to CONTRIBUTING.md
- [ ] Badge URLs return 404 or reference a CI provider no longer in use
- [ ] No license mentioned anywhere in README or root directory
- [ ] No architecture or project-structure section in a multi-package or multi-service repo
- [ ] README references commands, flags, or endpoints that no longer exist in the codebase
- [ ] No prerequisites listing required language runtimes, system dependencies, or minimum versions
- [ ] README lacks a table of contents for documents exceeding 200 lines
- [ ] Links in README point to dead URLs or deleted files in the repo

## Detailed Checks

### Existence and Minimum Viability
<!-- activation: file_globs=["**/README*"], structural_signals=["New repository initialization"] -->

- [ ] Repository root contains a README.md (or README.rst) -- absence means every new contributor starts with zero context
- [ ] README contains more than just a project name heading -- a single `# MyProject` with no body is effectively absent
- [ ] README includes at minimum: one-sentence description of what the project does, install steps, and a basic usage example
- [ ] For monorepos: each sub-package or service has its own README linking back to the root README for shared concerns
- [ ] README format renders correctly on the hosting platform (GitHub, GitLab) -- raw HTML, broken markdown tables, or unclosed code fences indicate the README was never previewed

### Setup and Usage Instructions
<!-- activation: keywords=["install", "setup", "getting started", "quickstart", "usage", "npm", "pip", "cargo", "docker", "make"] -->

- [ ] Install section lists exact commands to run, not vague prose like "install dependencies" -- a newcomer should be able to copy-paste and succeed
- [ ] Prerequisites section lists required runtime versions, system packages, and environment variables before the install steps
- [ ] Usage section shows a realistic example with expected output -- not just the CLI help text
- [ ] Environment variable requirements are documented with descriptions, not just names -- distinguish required from optional, provide defaults
- [ ] Docker or container-based setup is documented if the project uses containers for local development

### Staleness Detection
<!-- activation: keywords=["badge", "deprecated", "removed", "renamed", "moved", "obsolete"] -->

- [ ] Badges in the README reflect the current CI system -- Travis CI badges on a project that migrated to GitHub Actions are misleading
- [ ] Commands documented in README actually work when run against the current codebase -- flag when the diff renames a CLI command or removes a feature without updating the README
- [ ] Links to internal files (docs, examples, config templates) still resolve -- flag broken relative links
- [ ] Screenshots or diagrams depict the current UI or architecture, not a previous version
- [ ] Version numbers mentioned in the README match the current release

### License and Contributing
<!-- activation: file_globs=["**/LICENSE*", "**/CONTRIBUTING*"], keywords=["license", "contributing", "contributor", "code of conduct"] -->

- [ ] Repository has a LICENSE file at root, and the README mentions the license by name or links to the file -- open-source projects without a license are legally ambiguous
- [ ] Contributing guidelines exist as a section in README or as a separate CONTRIBUTING.md -- PRs from external contributors need ground rules
- [ ] If a CODE_OF_CONDUCT.md exists, the README links to it

## Common False Positives

- **Private internal tools**: Internal repositories with a small, stable team may intentionally keep minimal READMEs. Flag only when team size exceeds 5 or onboarding is a stated concern.
- **Generated project scaffolds**: Framework generators (create-react-app, cargo init) produce boilerplate READMEs. These are acceptable as starting points for new projects, not for mature ones.
- **Monorepo sub-packages**: Not every sub-package needs a full README if the root README covers the overall structure. Flag only when a sub-package is independently published or deployed.
- **Archived repositories**: Repositories marked as archived may have intentionally minimal documentation as they are no longer maintained.

## Severity Guidance

| Finding | Severity |
|---|---|
| No README at all in an active repository | Important |
| README references commands or APIs that no longer exist (actively misleads) | Important |
| No install/setup instructions in a project with non-trivial setup | Important |
| No license file or license mention in an open-source repository | Important |
| Missing usage examples or quick-start section | Minor |
| Stale badges pointing to defunct CI provider | Minor |
| Missing architecture overview in a multi-service repo | Minor |
| Missing table of contents in a long README | Minor |
| No contributing guidelines | Minor |

## See Also

- `principle-naming-and-intent` -- README is the project-level equivalent of a good name; it should communicate intent without requiring source reading
- `pr-description-quality` -- PR descriptions and READMEs serve the same goal: reduce the reader's time-to-understanding
- `doc-changelog-keep-a-changelog` -- the README should link to the CHANGELOG for version history rather than duplicating it
- `doc-runbook-oncall` -- operational README content often belongs in runbooks instead

## Authoritative References

- [Make a README](https://www.makeareadme.com/)
- [GitHub Docs: About READMEs](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes)
- [Standard Readme Specification](https://github.com/RichardLitt/standard-readme)
- [Choose a License](https://choosealicense.com/)
