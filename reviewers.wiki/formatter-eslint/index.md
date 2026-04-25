---
id: formatter-eslint
type: index
depth_role: subcategory
depth: 1
focus: "#[allow(clippy::*)] at module or crate level suppressing too broadly; #[allow(clippy::*)] without a justification comment; #[allow(unused)] hiding real dead code; @SuppressWarnings for SAST findings without justification"
parents:
  - "../index.md"
shared_covers: []
entries:
  - id: author-self-review-hygiene
    file: author-self-review-hygiene.md
    type: primary
    focus: Catch hygiene issues the author should have resolved before requesting review -- debug artifacts, untracked TODOs, suppressed lints, and leftover scaffolding
    tags:
      - hygiene
      - self-review
      - pre-review-gate
      - debug
      - todo
      - lint-suppression
      - readability
      - clean-code
  - id: lang-typescript
    file: lang-typescript.md
    type: primary
    focus: Catch TypeScript type-system misuse, unsound patterns, and any-leaks in diffs
    tags:
      - typescript
      - types
      - generics
      - strict-mode
      - narrowing
      - discriminated-unions
  - id: tool-clippy
    file: tool-clippy.md
    type: primary
    focus: Detect misconfigured or under-utilized Clippy setups -- unjustified allow attributes, missing CI integration, unreviewed pedantic lints, and incomplete target coverage
    tags:
      - clippy
      - rust
      - linter
      - allow
      - cargo
      - code-quality
      - unsafe
  - id: tool-eslint
    file: tool-eslint.md
    type: primary
    focus: Detect misconfigured, suppressed, or under-utilized ESLint setups -- unjustified disables, missing recommended presets, flat config migration issues, and conflicting rule definitions
    tags:
      - eslint
      - linter
      - javascript
      - typescript
      - lint-suppression
      - flat-config
      - code-quality
  - id: tool-mypy-pyright-pyre
    file: tool-mypy-pyright-pyre.md
    type: primary
    focus: "Detect misconfigured or under-utilized Python type checkers -- type:ignore without error codes, missing strict mode, Any leaking into public APIs, missing py.typed markers, and outdated stubs"
    tags:
      - mypy
      - pyright
      - pyre
      - python
      - type-checking
      - typing
      - strict-mode
      - stubs
      - any-type
  - id: tool-prettier-black-gofmt-rustfmt
    file: tool-prettier-black-gofmt-rustfmt.md
    type: primary
    focus: Detect formatter integration issues -- formatter not in CI, conflicting formatter configs, partial formatting creating inconsistency, missing .editorconfig alignment, and pre-commit hooks not installed
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
  - id: tool-rubocop
    file: tool-rubocop.md
    type: primary
    focus: "Detect misconfigured or under-utilized RuboCop setups -- unjustified rubocop:disable comments, outdated configs with new cops not enabled, missing performance and Rails extensions, and custom cops without specs"
    tags:
      - rubocop
      - ruby
      - linter
      - rails
      - rspec
      - code-quality
      - cops
  - id: tool-sonarqube-semgrep-codeql
    file: tool-sonarqube-semgrep-codeql.md
    type: primary
    focus: Detect misconfigured or under-utilized SAST tools -- SonarQube quality gates bypassed, Semgrep rules not in CI, CodeQL queries missing for critical paths, untriaged false positives, and custom rules without tests
    tags:
      - sonarqube
      - semgrep
      - codeql
      - sast
      - security
      - quality-gate
      - static-analysis
      - custom-rules
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Formatter Eslint

**Focus:** #[allow(clippy::*)] at module or crate level suppressing too broadly; #[allow(clippy::*)] without a justification comment; #[allow(unused)] hiding real dead code; @SuppressWarnings for SAST findings without justification

## Children

| File | Type | Focus |
|------|------|-------|
| [author-self-review-hygiene.md](author-self-review-hygiene.md) | 📄 primary | Catch hygiene issues the author should have resolved before requesting review -- debug artifacts, untracked TODOs, suppressed lints, and leftover scaffolding |
| [lang-typescript.md](lang-typescript.md) | 📄 primary | Catch TypeScript type-system misuse, unsound patterns, and any-leaks in diffs |
| [tool-clippy.md](tool-clippy.md) | 📄 primary | Detect misconfigured or under-utilized Clippy setups -- unjustified allow attributes, missing CI integration, unreviewed pedantic lints, and incomplete target coverage |
| [tool-eslint.md](tool-eslint.md) | 📄 primary | Detect misconfigured, suppressed, or under-utilized ESLint setups -- unjustified disables, missing recommended presets, flat config migration issues, and conflicting rule definitions |
| [tool-mypy-pyright-pyre.md](tool-mypy-pyright-pyre.md) | 📄 primary | Detect misconfigured or under-utilized Python type checkers -- type:ignore without error codes, missing strict mode, Any leaking into public APIs, missing py.typed markers, and outdated stubs |
| [tool-prettier-black-gofmt-rustfmt.md](tool-prettier-black-gofmt-rustfmt.md) | 📄 primary | Detect formatter integration issues -- formatter not in CI, conflicting formatter configs, partial formatting creating inconsistency, missing .editorconfig alignment, and pre-commit hooks not installed |
| [tool-rubocop.md](tool-rubocop.md) | 📄 primary | Detect misconfigured or under-utilized RuboCop setups -- unjustified rubocop:disable comments, outdated configs with new cops not enabled, missing performance and Rails extensions, and custom cops without specs |
| [tool-sonarqube-semgrep-codeql.md](tool-sonarqube-semgrep-codeql.md) | 📄 primary | Detect misconfigured or under-utilized SAST tools -- SonarQube quality gates bypassed, Semgrep rules not in CI, CodeQL queries missing for critical paths, untriaged false positives, and custom rules without tests |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
