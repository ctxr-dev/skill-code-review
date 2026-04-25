---
id: phpstan-ruff
type: index
depth_role: subcategory
depth: 1
focus: "$FlowFixMe without a justification or ticket; .golangci.yml exclusion patterns that are too broad; @phpstan-ignore or @phpstan-ignore-next-line without justification; @psalm-suppress without justification"
parents:
  - "../index.md"
shared_covers: []
entries:
  - id: ci-green-precondition
    file: ci-green-precondition.md
    type: primary
    focus: "Gate reviewer that refuses to dispatch expensive reviewers when automated CI checks (lint, type, test, SAST, build) are red"
    tags:
      - ci
      - gate
      - lint
      - tests
      - sast
      - build
      - pre-dispatch
      - automation
  - id: tool-golangci-lint
    file: tool-golangci-lint.md
    type: primary
    focus: Detect misconfigured or under-utilized golangci-lint setups -- unjustified nolint directives, disabled linters that should be enabled, overly permissive configs, and missing critical analyzers
    tags:
      - golangci-lint
      - go
      - linter
      - nolint
      - staticcheck
      - govet
      - errcheck
      - gosec
      - code-quality
  - id: tool-phpstan-psalm-phan
    file: tool-phpstan-psalm-phan.md
    type: primary
    focus: "Detect misconfigured or under-utilized PHP static analysis -- unjustified @phpstan-ignore annotations, growing baselines without review, missing strict mode progression, and unresolved mixed types"
    tags:
      - phpstan
      - psalm
      - phan
      - php
      - static-analysis
      - type-checking
      - baseline
      - strict-mode
      - composer
      - psr
      - laravel
      - symfony
      - strict-types
  - id: tool-ruff-pylint
    file: tool-ruff-pylint.md
    type: primary
    focus: Detect misconfigured or under-utilized Ruff and Pylint setups -- overly broad per-file-ignores, unjustified noqa annotations, conflicting formatter configs, and missing rule categories
    tags:
      - ruff
      - pylint
      - python
      - linter
      - noqa
      - formatting
      - isort
      - black
      - code-quality
  - id: tool-tsc-flow
    file: tool-tsc-flow.md
    type: primary
    focus: "Detect misconfigured or under-utilized TypeScript/Flow type checking -- unjustified ts-ignore/ts-expect-error, strict mode disabled, any casts without justification, skipLibCheck hiding errors, and missing test tsconfig"
    tags:
      - typescript
      - tsc
      - flow
      - type-checking
      - tsconfig
      - strict-mode
      - any
      - ts-ignore
      - declarations
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Phpstan Ruff

**Focus:** $FlowFixMe without a justification or ticket; .golangci.yml exclusion patterns that are too broad; @phpstan-ignore or @phpstan-ignore-next-line without justification; @psalm-suppress without justification

## Children

| File | Type | Focus |
|------|------|-------|
| [ci-green-precondition.md](ci-green-precondition.md) | 📄 primary | Gate reviewer that refuses to dispatch expensive reviewers when automated CI checks (lint, type, test, SAST, build) are red |
| [tool-golangci-lint.md](tool-golangci-lint.md) | 📄 primary | Detect misconfigured or under-utilized golangci-lint setups -- unjustified nolint directives, disabled linters that should be enabled, overly permissive configs, and missing critical analyzers |
| [tool-phpstan-psalm-phan.md](tool-phpstan-psalm-phan.md) | 📄 primary | Detect misconfigured or under-utilized PHP static analysis -- unjustified @phpstan-ignore annotations, growing baselines without review, missing strict mode progression, and unresolved mixed types |
| [tool-ruff-pylint.md](tool-ruff-pylint.md) | 📄 primary | Detect misconfigured or under-utilized Ruff and Pylint setups -- overly broad per-file-ignores, unjustified noqa annotations, conflicting formatter configs, and missing rule categories |
| [tool-tsc-flow.md](tool-tsc-flow.md) | 📄 primary | Detect misconfigured or under-utilized TypeScript/Flow type checking -- unjustified ts-ignore/ts-expect-error, strict mode disabled, any casts without justification, skipLibCheck hiding errors, and missing test tsconfig |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
