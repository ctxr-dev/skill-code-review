---
id: tool-prettier-black-gofmt-rustfmt
type: primary
depth_role: leaf
focus: Detect formatter integration issues -- formatter not in CI, conflicting formatter configs, partial formatting creating inconsistency, missing .editorconfig alignment, and pre-commit hooks not installed
parents:
  - index.md
covers:
  - Formatter configured but not enforced in CI
  - "Conflicting formatter configs (prettier vs biome, black vs ruff format, multiple formatters for one language)"
  - "Partial formatting (only changed files formatted) creating inconsistency with untouched files"
  - Missing .editorconfig alignment with formatter config
  - Pre-commit hook for formatter not installed or not running
  - "Formatter version not pinned (different developers get different output)"
  - Formatter config changed without reformatting the codebase
  - "prettier-ignore/fmt: off/rustfmt::skip used without justification"
  - Go files not gofmt-canonical
  - Generated files accidentally formatted
  - "Presence of formatter/linter config files (.editorconfig, .eslintrc, .prettierrc, ruff.toml, rustfmt.toml, etc.)"
  - "Code that violates the project's configured style rules"
  - "Review comments that argue style points already settled by the configured formatter/linter"
  - Inconsistent formatting that the configured tool would auto-fix
  - "Missing formatter/linter configuration for languages present in the codebase"
  - "Overridden or disabled rules without justification (eslint-disable, noqa, allow clippy)"
  - Style config files modified without team discussion or justification in the PR
  - "Conflicting style configs (prettier vs eslint formatting rules, multiple formatters for same language)"
  - "Editor-specific formatting (tabs vs spaces) that contradicts .editorconfig"
  - Import ordering that violates the configured sort order
tags:
  - prettier
  - black
  - gofmt
  - goimports
  - rustfmt
  - formatter
  - editorconfig
  - pre-commit
  - biome
  - ruff-format
  - consistency
  - style
  - formatting
  - linter
  - eslint
  - ruff
aliases:
  - style-guide-supremacy
activation:
  file_globs:
    - "**/.prettierrc*"
    - "**/prettier.config.*"
    - "**/.prettierignore"
    - "**/biome.json"
    - "**/biome.jsonc"
    - "**/pyproject.toml"
    - "**/rustfmt.toml"
    - "**/.rustfmt.toml"
    - "**/.editorconfig"
    - "**/.pre-commit-config.yaml"
    - "**/deno.json"
  keyword_matches:
    - prettier-ignore
    - "fmt: off"
    - "fmt: on"
    - "rustfmt::skip"
    - "yapf: disable"
    - gofmt
    - goimports
    - black
    - ruff format
    - biome format
  structural_signals:
    - formatter config file present
    - inline formatter suppression
    - pre-commit config present
source:
  origin: file
  path: tool-prettier-black-gofmt-rustfmt.md
  hash: "sha256:a3b62c7dba3f58201e9d6cfedfa0e1d6e03f498c415f2c428ae05a8309d366cd"
---
# Formatter CI Integration and Consistency (Prettier, Black, gofmt, rustfmt)

## When This Activates

Activates when the repository contains formatter configuration files, when inline formatter suppression annotations appear in the diff (prettier-ignore, fmt: off, rustfmt::skip), or when .editorconfig or pre-commit configuration is present. Focuses on whether the formatter is enforced consistently across the development workflow -- not on individual formatting violations, but on the integration infrastructure.

## Audit Surface

- [ ] Formatter config exists but no CI step runs the formatter
- [ ] Multiple formatters configured for the same language
- [ ] Changed files would produce a diff if the formatter ran
- [ ] .editorconfig indent_size/indent_style conflicts with formatter config
- [ ] Pre-commit config missing the formatter hook
- [ ] Formatter version not pinned
- [ ] Formatter config changed but codebase not reformatted
- [ ] prettier-ignore or fmt: off without justification
- [ ] rustfmt::skip without justification
- [ ] Go files contain non-canonical formatting
- [ ] Generated files included in formatter scope
- [ ] .prettierignore or equivalent missing entries for generated files
- [ ] Formatter runs only on staged files but CI checks all files
- [ ] Tab/space mismatch between .editorconfig and formatter output

## Detailed Checks

### CI Enforcement
<!-- activation: file_globs=["**/.github/workflows/*", "**/.gitlab-ci.yml", "**/Makefile", "**/Justfile", "**/.pre-commit-config.yaml"] -->

- [ ] Verify the formatter runs in CI as a check (not just locally) -- without CI enforcement, unformatted code reaches main when developers forget or skip pre-commit
- [ ] Verify CI runs the formatter on all files, not just changed files -- partial checks allow inconsistency to accumulate
- [ ] If the project uses lint-staged (format only staged files locally), verify CI runs the full check as a backstop
- [ ] Verify the CI formatter step fails the build (exit code check) rather than just warning
- [ ] Check that the CI formatter version matches the version pinned in the project config -- version drift causes spurious CI failures

### Conflicting Formatters
<!-- activation: file_globs=["**/.prettierrc*", "**/biome.json", "**/pyproject.toml", "**/eslint.config.*"] -->

- [ ] Flag projects with both Prettier and Biome configured for the same file types -- their output may differ on edge cases
- [ ] Flag projects with both Black and ruff format configured -- only one should own Python formatting
- [ ] Flag ESLint configs that include formatting rules (indent, semi, quotes) when Prettier is also configured -- ESLint should defer formatting to Prettier via eslint-config-prettier
- [ ] Flag projects with both isort and ruff's I (import sorting) -- choose one to avoid conflicting import order
- [ ] For Go projects, verify goimports is used instead of or in addition to gofmt when import grouping conventions exist -- gofmt does not sort imports into groups

### Formatter Suppression Discipline
<!-- activation: keywords=["prettier-ignore", "fmt: off", "fmt: on", "rustfmt::skip", "yapf: disable", "# noreorder"] -->

- [ ] Flag `// prettier-ignore` or `/* prettier-ignore */` without a comment explaining why formatting must be preserved (e.g., matrix alignment, ASCII art, readability of a specific construct)
- [ ] Flag `# fmt: off` / `# fmt: on` blocks in Python without justification
- [ ] Flag `#[rustfmt::skip]` without a justification comment
- [ ] Flag large fmt: off blocks (more than 20 lines) -- these suggest the code structure should change rather than the formatter being suppressed
- [ ] Verify formatter suppression is not used to preserve manual alignment that the formatter would not produce -- this creates maintenance burden

### EditorConfig and Version Pinning
<!-- activation: file_globs=["**/.editorconfig", "**/package.json", "**/pyproject.toml", "**/.pre-commit-config.yaml"] -->

- [ ] If .editorconfig exists, verify indent_style and indent_size match the formatter's output -- a mismatch means editors and formatter disagree
- [ ] If .editorconfig specifies end_of_line, verify it matches the formatter's line ending output
- [ ] Verify the formatter version is pinned (exact version in package.json, rev in pre-commit config, version constraint in pyproject.toml) -- unpinned versions cause different developers to produce different output
- [ ] If the formatter config was changed in this PR, verify the entire codebase was reformatted in the same commit or a preceding commit -- partial reformatting creates a messy blame history

### Generated and Excluded Files
<!-- activation: keywords=["ignore", "prettierignore", "generated", ".pb.", "_generated"] -->

- [ ] Verify .prettierignore (or equivalent) excludes generated files (.pb.ts, _generated.go, codegen output)
- [ ] Verify vendor/ and node_modules/ are excluded from formatting scope
- [ ] If the project uses code generation, verify the generation step runs before formatting in CI -- otherwise the formatter may run on stale generated code
- [ ] Check that lock files (package-lock.json, yarn.lock, Cargo.lock) are excluded from formatting

## Common False Positives

- **Intentional formatting preservation**: Matrix literals, truth tables, ASCII art, and alignment-heavy code legitimately use prettier-ignore or fmt: off. Verify the justification is reasonable.
- **Monorepo with different formatters per package**: Different packages in a monorepo may legitimately use different formatters or configurations. Cross-package consistency is not always required.
- **Language without opinionated formatter**: Some languages (C, C++, Perl) lack a single dominant formatter. Absence of a formatter is expected, not a gap.
- **IDE-specific formatting**: Some projects rely on IDE formatting (e.g., IntelliJ for Java) rather than a CLI formatter. This is a team choice, not an error, though CLI enforcement is stronger.
- **Markdown and prose files**: Formatter output for Markdown may conflict with documentation style. Some projects exclude .md files from formatting intentionally.

## Severity Guidance

| Finding | Severity |
|---|---|
| Formatter config exists but no CI enforcement | Important |
| Multiple conflicting formatters for the same language | Important |
| Formatter config changed without reformatting codebase | Important |
| .editorconfig conflicts with formatter output | Important |
| Changed files not formatted (formatter not run) | Minor |
| Formatter version not pinned | Minor |
| prettier-ignore or fmt: off without justification | Minor |
| Generated files not excluded from formatter | Minor |
| Pre-commit hook missing formatter | Minor |

## See Also

- `style-guide-supremacy` -- this reviewer checks formatter infrastructure; style-guide-supremacy treats the formatter as the ultimate style authority
- `author-self-review-hygiene` -- running the formatter before pushing is a basic self-review step
- `tool-eslint` -- ESLint formatting rules should defer to Prettier via eslint-config-prettier
- `tool-ruff-pylint` -- ruff format vs Black conflicts are detected here
- `tool-golangci-lint` -- gofmt is the Go formatter; golangci-lint handles linting beyond formatting

## Authoritative References

- [Prettier: Why Prettier](https://prettier.io/docs/en/why-prettier.html)
- [Black: The Uncompromising Code Formatter](https://black.readthedocs.io/en/stable/)
- [Go: gofmt](https://pkg.go.dev/cmd/gofmt)
- [rustfmt: Configuring Rustfmt](https://rust-lang.github.io/rustfmt/)
- [EditorConfig](https://editorconfig.org/)
- [Biome: Formatter](https://biomejs.dev/formatter/)
