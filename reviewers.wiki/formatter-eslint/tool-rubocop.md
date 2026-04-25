---
id: tool-rubocop
type: primary
depth_role: leaf
focus: "Detect misconfigured or under-utilized RuboCop setups -- unjustified rubocop:disable comments, outdated configs with new cops not enabled, missing performance and Rails extensions, and custom cops without specs"
parents:
  - index.md
covers:
  - "rubocop:disable without a justification comment"
  - "rubocop:disable for an entire file without architectural rationale"
  - Outdated .rubocop.yml that has not enabled newly added cops
  - Missing rubocop-performance gem when performance matters
  - Missing rubocop-rails gem in a Rails project
  - "Missing rubocop-rspec/rubocop-minitest for test files"
  - Custom cops without corresponding spec files
  - "AllCops: DisabledByDefault: true without a curated enable list"
  - Exclude patterns that cover production code directories
  - "TargetRubyVersion mismatch with the project's actual Ruby version"
  - "NewCops: disable preventing adoption of newly added cops"
tags:
  - rubocop
  - ruby
  - linter
  - rails
  - rspec
  - code-quality
  - cops
activation:
  file_globs:
    - "**/.rubocop.yml"
    - "**/.rubocop_todo.yml"
    - "**/Gemfile"
    - "**/*.rb"
  keyword_matches:
    - "rubocop:disable"
    - "rubocop:enable"
    - "rubocop:todo"
    - rubocop
    - NewCops
    - DisabledByDefault
  structural_signals:
    - rubocop config file present
    - inline rubocop suppression
source:
  origin: file
  path: tool-rubocop.md
  hash: "sha256:2136505c8258537d1a8254c71853a1148d34e2a0608257be3f989de8dd5b5903"
---
# RuboCop Configuration and Suppression Hygiene

## When This Activates

Activates when the repository contains RuboCop configuration (.rubocop.yml, .rubocop_todo.yml), when rubocop:disable annotations appear in the diff, or when Ruby source files are present with rubocop in the Gemfile. Focuses on whether RuboCop is configured to be effective and whether suppressions are justified.

## Audit Surface

- [ ] rubocop:disable without a cop name (blanket suppression)
- [ ] rubocop:disable with a cop name but no adjacent justification comment
- [ ] rubocop:disable block spanning more than 10 lines
- [ ] AllCops.NewCops set to disable -- new cops are never adopted
- [ ] AllCops.DisabledByDefault set to true without a curated enable list
- [ ] TargetRubyVersion does not match .ruby-version or Gemfile ruby constraint
- [ ] rubocop-performance not in Gemfile for a project with performance concerns
- [ ] rubocop-rails not in Gemfile for a Rails project
- [ ] rubocop-rspec or rubocop-minitest not in Gemfile for a project with tests
- [ ] Custom cop class defined without a corresponding spec file
- [ ] Exclude pattern covers a production source directory
- [ ] Severity overrides that downgrade important cops
- [ ] Inherit_from uses a remote URL without version pinning
- [ ] More than 3 new rubocop:disable annotations added in this PR

## Detailed Checks

### Suppression Discipline
<!-- activation: keywords=["rubocop:disable", "rubocop:enable", "rubocop:todo"] -->

- [ ] Flag `# rubocop:disable` without a cop name -- this blanket suppression disables all cops on the block and is never appropriate
- [ ] Flag `# rubocop:disable CopName` without a justification comment on the same or preceding line
- [ ] Flag rubocop:disable/enable blocks spanning more than 10 lines -- long blocks suggest the code needs restructuring or the cop should be configured differently
- [ ] Flag `# rubocop:todo` annotations that have been present for more than one release cycle -- these are meant to be temporary
- [ ] Count new rubocop:disable annotations in the PR -- more than 3 warrants discussion about whether the code or config should change instead
- [ ] Flag rubocop:disable on security-related cops (Security/*) without strong justification

### Config Freshness and NewCops
<!-- activation: file_globs=["**/.rubocop.yml", "**/.rubocop_todo.yml"] -->

- [ ] If AllCops.NewCops is set to `disable`, flag it -- this prevents the project from ever adopting newly added cops without explicit intervention
- [ ] If AllCops.NewCops is absent, note that RuboCop defaults to pending (warning) -- setting it to `enable` forces evaluation of new cops on upgrade
- [ ] Check that TargetRubyVersion matches the project's actual Ruby version (.ruby-version, Gemfile, or CI config) -- mismatches cause cops to check for the wrong Ruby features
- [ ] If .rubocop_todo.yml exists and is growing, verify that the team periodically reviews and resolves entries -- an ever-growing todo file means tech debt is accumulating
- [ ] Check that inherit_from ordering is correct -- later files override earlier ones, and .rubocop_todo.yml should come last

### Extension Gems
<!-- activation: file_globs=["**/Gemfile", "**/.rubocop.yml"] -->

- [ ] If the project is a Rails application (has config/application.rb or Gemfile includes rails), verify rubocop-rails is in the Gemfile and required in .rubocop.yml
- [ ] If the project has RSpec tests (spec/ directory), verify rubocop-rspec is present
- [ ] If the project has Minitest tests (test/ directory), verify rubocop-minitest is present
- [ ] For production applications with performance requirements, verify rubocop-performance is present
- [ ] If rubocop-sorbet is needed (Sorbet types in the project), verify it is present

### Custom Cops and Exclusions
<!-- activation: keywords=["Custom", "cop", "Exclude", "inherit_from"] -->

- [ ] If the project defines custom cops (classes inheriting from RuboCop::Cop::Base), verify each has a spec testing both offense detection and auto-correction
- [ ] Flag Exclude patterns in .rubocop.yml that cover production source directories (app/, lib/) for non-generated code
- [ ] Flag AllCops.DisabledByDefault: true without a corresponding curated set of enabled cops -- this inverts RuboCop's safety model
- [ ] If inherit_from references a remote URL (e.g., a shared company config), verify it includes a version pin or SHA
- [ ] Check that severity overrides in .rubocop.yml do not downgrade cops from error to warning for cops that the project considers important

## Common False Positives

- **Generated code**: Files produced by Rails generators, Binstubs, or schema.rb are typically excluded in .rubocop.yml and should not be flagged.
- **Gemspec files**: Gemspec files have specific conventions that may trigger Layout cops -- these are often in the todo file legitimately.
- **Rake tasks**: Rake tasks may have longer methods or different naming conventions that trigger Metrics cops.
- **Database migrations**: Rails migrations have a specific structure that may trigger cops about method length or class naming.
- **rubocop_todo.yml as migration strategy**: A growing .rubocop_todo.yml during a cop adoption phase is expected -- only flag if no entries are being resolved over time.

## Severity Guidance

| Finding | Severity |
|---|---|
| Blanket rubocop:disable without cop name | Important |
| AllCops.DisabledByDefault: true without curated enable list | Important |
| rubocop:disable on Security/* cop without justification | Important |
| rubocop-rails missing in a Rails project | Important |
| rubocop:disable with cop name but no justification | Minor |
| AllCops.NewCops set to disable | Minor |
| TargetRubyVersion mismatch | Minor |
| rubocop-performance missing | Minor |
| Custom cop without spec | Minor |

## See Also

- `style-guide-supremacy` -- RuboCop is the Ruby style authority; this reviewer checks its configuration health
- `author-self-review-hygiene` -- bare rubocop:disable without justification is a hygiene issue
- `principle-fail-fast` -- disabling cops defers error detection
- `principle-naming-and-intent` -- RuboCop Naming/* cops enforce Ruby naming conventions
- `tool-prettier-black-gofmt-rustfmt` -- RuboCop handles both formatting and linting in Ruby; formatter conflicts are less common

## Authoritative References

- [RuboCop: Configuration](https://docs.rubocop.org/rubocop/configuration.html)
- [RuboCop: NewCops](https://docs.rubocop.org/rubocop/versioning.html)
- [rubocop-rails](https://docs.rubocop.org/rubocop-rails/)
- [rubocop-performance](https://docs.rubocop.org/rubocop-performance/)
- [Ruby Style Guide](https://rubystyle.guide/)
