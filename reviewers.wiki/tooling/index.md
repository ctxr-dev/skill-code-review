---
id: tooling
type: index
depth_role: subcategory
depth: 1
focus: "tooling: Detect schema-evolution hazards in binary serialization formats -- reused field numbers, missing reserved markers, enum reordering, required fields added, and schema-registry integration gaps; Detect CLI/TUI ergonomics failures ..."
parents:
  - "../index.md"
shared_covers: []
tags:
  - a06
  - abstraction
  - adapter
  - aggregator
  - agpl
  - allow
  - anti-pattern
  - any
  - any-type
  - api
  - api-surface
  - api-versioning
  - attribution
  - avro
  - backfill
  - backward-compatibility
  - baseline
  - biome
  - black
  - blue-green
generator: "skill-llm-wiki/v1"
entries:
  - id: binary-serialization-protobuf-avro-flatbuffers-msgpack-thrift
    file: binary-serialization-protobuf-avro-flatbuffers-msgpack-thrift.md
    type: primary
    focus: Detect schema-evolution hazards in binary serialization formats -- reused field numbers, missing reserved markers, enum reordering, required fields added, and schema-registry integration gaps
    tags:
      - protobuf
      - thrift
      - avro
      - flatbuffers
      - capnproto
      - msgpack
      - serialization
      - schema-evolution
      - schema-registry
      - reserved
  - id: cli-tui-ux-design
    file: cli-tui-ux-design.md
    type: primary
    focus: "Detect CLI/TUI ergonomics failures -- missing --help/--version, inconsistent flag naming, broken piping, interactive prompts without non-interactive fallback, missing signal handling, and disregard for NO_COLOR and tty detection"
    tags:
      - cli
      - tui
      - ux
      - flags
      - exit-codes
      - signals
      - tty
      - no-color
      - completion
      - piping
  - id: export-control-sanctions-screening
    file: export-control-sanctions-screening.md
    type: primary
    focus: Detect export-control and sanctions screening gaps including missing sanctioned-country blocking, unclassified encryption export, missing denied-party screening, cloud region serving embargoed jurisdictions, absent TSU notification for open-source crypto, stale sanctions lists, and deemed-export access controls
    tags:
      - export-control
      - sanctions
      - ofac
      - ear
      - itar
      - embargo
      - denied-party
      - encryption
      - compliance
      - deemed-export
  - id: glue-dependency-supply-chain
    file: glue-dependency-supply-chain.md
    type: primary
    focus: Lightweight gate that flags new or changed dependencies for justification, known CVEs, maintenance status, license risk, version hygiene, and unnecessary bulk
    tags:
      - dependencies
      - supply-chain
      - CVE
      - license
      - lockfile
      - pinning
      - maintenance
      - justification
      - gate
      - owasp
      - a06
      - vulnerable-components
      - SCA
      - security
  - id: glue-initialization-hygiene
    file: glue-initialization-hygiene.md
    type: primary
    focus: Detect configuration and dependency validation deferred past startup, missing fail-fast on required environment variables, and initialization sequences that hide broken dependencies until first request
    tags:
      - initialization
      - startup
      - fail-fast
      - config-validation
      - boot
      - health-check
      - dependency-verification
      - env-vars
  - id: glue-release-readiness
    file: glue-release-readiness.md
    type: primary
    focus: Aggregator gate that cross-references specialist reviewer verdicts and prerequisite signals to determine whether a change is safe to merge and release
    tags:
      - release
      - gate
      - aggregator
      - readiness
      - merge
      - changelog
      - version
      - rollback
      - migration
      - feature-flag
  - id: jupyter-notebook-reproducibility
    file: jupyter-notebook-reproducibility.md
    type: primary
    focus: Detect Jupyter notebook reproducibility hazards -- out-of-order execution, missing kernel spec, unset seeds, hardcoded paths, committed outputs, leaked secrets, and absent environment pinning
    tags:
      - jupyter
      - notebook
      - ipynb
      - reproducibility
      - data-science
      - papermill
      - nbdev
      - mlops
  - id: licensing-compliance-copyleft-dual-license-cla
    file: licensing-compliance-copyleft-dual-license-cla.md
    type: primary
    focus: "Detect software licensing compliance gaps including missing LICENSE file, copyleft (GPL/AGPL) dependencies in proprietary products, license incompatibility between dependencies, missing attribution, absent CLA/DCO enforcement, SPDX mismatches, and missing third-party notices in distributions"
    tags:
      - licensing
      - open-source
      - copyleft
      - gpl
      - agpl
      - attribution
      - cla
      - dco
      - spdx
      - compliance
      - supply-chain
  - id: modern-branch-by-abstraction
    file: modern-branch-by-abstraction.md
    type: primary
    focus: Detect branch-by-abstraction failures where the abstraction layer is missing before an implementation swap, old implementations linger after stabilization, abstractions leak details, or feature toggles are absent for switching
    tags:
      - branch-by-abstraction
      - abstraction
      - refactoring
      - implementation-swap
      - feature-toggle
      - interface
      - dependency-inversion
      - bridge
      - structural-pattern
      - design-patterns
      - implementation
      - separation
      - platform
  - id: modern-dead-code-removal-discipline
    file: modern-dead-code-removal-discipline.md
    type: primary
    focus: Detect dead code removal discipline failures where identified dead code is not removed promptly, removal is mixed with feature changes, feature flags are not cleaned up, dead dependencies linger, unused database artifacts remain, or commented-out code is preserved
    tags:
      - dead-code
      - removal
      - cleanup
      - discipline
      - feature-flags
      - dependencies
      - hygiene
      - refactoring
      - boat-anchor
      - dead-weight
      - unused
      - dispensable
      - yagni
      - maintenance-burden
      - anti-pattern
      - clean-code
      - unreachable
      - readability
      - performance
  - id: modern-expand-contract
    file: modern-expand-contract.md
    type: primary
    focus: "Detect expand-contract (parallel change) violations where the contract is broken during migration, old consumers are not migrated, new fields lack backfill, the expand phase ships without population, or old fields are removed prematurely"
    tags:
      - expand-contract
      - parallel-change
      - migration
      - schema-evolution
      - backward-compatibility
      - contract
      - api-versioning
      - online-ddl
      - zero-downtime
      - gh-ost
      - pt-osc
      - blue-green
      - dual-write
      - backfill
      - migration-safety
      - data-architecture
  - id: modern-legacy-wrap-and-replace
    file: modern-legacy-wrap-and-replace.md
    type: primary
    focus: Detect wrap-and-replace failures where the wrapper adds behavior beyond pure delegation, does not match the original interface, is tested in isolation from the original, the replacement diverges functionally, or integration tests at the seam are missing
    tags:
      - wrap-and-replace
      - wrapper
      - delegation
      - legacy
      - seam
      - refactoring
      - adapter
      - facade
      - equivalence
  - id: modern-parallel-run
    file: modern-parallel-run.md
    type: primary
    focus: "Detect parallel run (shadow traffic) failures where execution lacks result comparison, comparison is incomplete, divergence has no alerting, the parallel path outlives its validation period, or performance impact is unmeasured"
    tags:
      - parallel-run
      - shadow-traffic
      - dark-launch
      - comparison
      - divergence
      - migration
      - verification
  - id: modern-strangler-fig
    file: modern-strangler-fig.md
    type: primary
    focus: Detect strangler fig migration failures where new functionality bypasses the new system, old system is not gradually replaced, feature parity is unchecked, dual-running lacks comparison, rollback is absent, or traffic shifting has no metrics
    tags:
      - strangler-fig
      - migration
      - incremental
      - legacy
      - routing
      - facade
      - traffic-shifting
      - feature-parity
      - rollback
  - id: modern-versioning-semver-compat-matrix
    file: modern-versioning-semver-compat-matrix.md
    type: primary
    focus: Detect semver and compatibility matrix violations including breaking changes without major bumps, new public API without minor bumps, missing compatibility matrices for multi-consumer libraries, pre-1.0 stability assumptions, absent deprecation notices, and missing migration guides
    tags:
      - semver
      - versioning
      - compatibility
      - breaking-change
      - deprecation
      - migration-guide
      - api-surface
      - major-minor-patch
      - changelog
      - dependency
      - upgrade
      - major-version
      - migration
      - transitive
      - deprecated-api
      - api
      - backward-compatibility
      - sunset
      - sdk
      - library
      - client
      - error-handling
      - documentation
      - dependencies
      - public-api
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

# Tooling

**Focus:** tooling: Detect schema-evolution hazards in binary serialization formats -- reused field numbers, missing reserved markers, enum reordering, required fields added, and schema-registry integration gaps; Detect CLI/TUI ergonomics failures ...

## Children

| File | Type | Focus |
|------|------|-------|
| [binary-serialization-protobuf-avro-flatbuffers-msgpack-thrift.md](binary-serialization-protobuf-avro-flatbuffers-msgpack-thrift.md) | 📄 primary | Detect schema-evolution hazards in binary serialization formats -- reused field numbers, missing reserved markers, enum reordering, required fields added, and schema-registry integration gaps |
| [cli-tui-ux-design.md](cli-tui-ux-design.md) | 📄 primary | Detect CLI/TUI ergonomics failures -- missing --help/--version, inconsistent flag naming, broken piping, interactive prompts without non-interactive fallback, missing signal handling, and disregard for NO_COLOR and tty detection |
| [export-control-sanctions-screening.md](export-control-sanctions-screening.md) | 📄 primary | Detect export-control and sanctions screening gaps including missing sanctioned-country blocking, unclassified encryption export, missing denied-party screening, cloud region serving embargoed jurisdictions, absent TSU notification for open-source crypto, stale sanctions lists, and deemed-export access controls |
| [glue-dependency-supply-chain.md](glue-dependency-supply-chain.md) | 📄 primary | Lightweight gate that flags new or changed dependencies for justification, known CVEs, maintenance status, license risk, version hygiene, and unnecessary bulk |
| [glue-initialization-hygiene.md](glue-initialization-hygiene.md) | 📄 primary | Detect configuration and dependency validation deferred past startup, missing fail-fast on required environment variables, and initialization sequences that hide broken dependencies until first request |
| [glue-release-readiness.md](glue-release-readiness.md) | 📄 primary | Aggregator gate that cross-references specialist reviewer verdicts and prerequisite signals to determine whether a change is safe to merge and release |
| [jupyter-notebook-reproducibility.md](jupyter-notebook-reproducibility.md) | 📄 primary | Detect Jupyter notebook reproducibility hazards -- out-of-order execution, missing kernel spec, unset seeds, hardcoded paths, committed outputs, leaked secrets, and absent environment pinning |
| [licensing-compliance-copyleft-dual-license-cla.md](licensing-compliance-copyleft-dual-license-cla.md) | 📄 primary | Detect software licensing compliance gaps including missing LICENSE file, copyleft (GPL/AGPL) dependencies in proprietary products, license incompatibility between dependencies, missing attribution, absent CLA/DCO enforcement, SPDX mismatches, and missing third-party notices in distributions |
| [modern-branch-by-abstraction.md](modern-branch-by-abstraction.md) | 📄 primary | Detect branch-by-abstraction failures where the abstraction layer is missing before an implementation swap, old implementations linger after stabilization, abstractions leak details, or feature toggles are absent for switching |
| [modern-dead-code-removal-discipline.md](modern-dead-code-removal-discipline.md) | 📄 primary | Detect dead code removal discipline failures where identified dead code is not removed promptly, removal is mixed with feature changes, feature flags are not cleaned up, dead dependencies linger, unused database artifacts remain, or commented-out code is preserved |
| [modern-expand-contract.md](modern-expand-contract.md) | 📄 primary | Detect expand-contract (parallel change) violations where the contract is broken during migration, old consumers are not migrated, new fields lack backfill, the expand phase ships without population, or old fields are removed prematurely |
| [modern-legacy-wrap-and-replace.md](modern-legacy-wrap-and-replace.md) | 📄 primary | Detect wrap-and-replace failures where the wrapper adds behavior beyond pure delegation, does not match the original interface, is tested in isolation from the original, the replacement diverges functionally, or integration tests at the seam are missing |
| [modern-parallel-run.md](modern-parallel-run.md) | 📄 primary | Detect parallel run (shadow traffic) failures where execution lacks result comparison, comparison is incomplete, divergence has no alerting, the parallel path outlives its validation period, or performance impact is unmeasured |
| [modern-strangler-fig.md](modern-strangler-fig.md) | 📄 primary | Detect strangler fig migration failures where new functionality bypasses the new system, old system is not gradually replaced, feature parity is unchecked, dual-running lacks comparison, rollback is absent, or traffic shifting has no metrics |
| [modern-versioning-semver-compat-matrix.md](modern-versioning-semver-compat-matrix.md) | 📄 primary | Detect semver and compatibility matrix violations including breaking changes without major bumps, new public API without minor bumps, missing compatibility matrices for multi-consumer libraries, pre-1.0 stability assumptions, absent deprecation notices, and missing migration guides |
| [tool-clippy.md](tool-clippy.md) | 📄 primary | Detect misconfigured or under-utilized Clippy setups -- unjustified allow attributes, missing CI integration, unreviewed pedantic lints, and incomplete target coverage |
| [tool-eslint.md](tool-eslint.md) | 📄 primary | Detect misconfigured, suppressed, or under-utilized ESLint setups -- unjustified disables, missing recommended presets, flat config migration issues, and conflicting rule definitions |
| [tool-golangci-lint.md](tool-golangci-lint.md) | 📄 primary | Detect misconfigured or under-utilized golangci-lint setups -- unjustified nolint directives, disabled linters that should be enabled, overly permissive configs, and missing critical analyzers |
| [tool-mypy-pyright-pyre.md](tool-mypy-pyright-pyre.md) | 📄 primary | Detect misconfigured or under-utilized Python type checkers -- type:ignore without error codes, missing strict mode, Any leaking into public APIs, missing py.typed markers, and outdated stubs |
| [tool-phpstan-psalm-phan.md](tool-phpstan-psalm-phan.md) | 📄 primary | Detect misconfigured or under-utilized PHP static analysis -- unjustified @phpstan-ignore annotations, growing baselines without review, missing strict mode progression, and unresolved mixed types |
| [tool-prettier-black-gofmt-rustfmt.md](tool-prettier-black-gofmt-rustfmt.md) | 📄 primary | Detect formatter integration issues -- formatter not in CI, conflicting formatter configs, partial formatting creating inconsistency, missing .editorconfig alignment, and pre-commit hooks not installed |
| [tool-rubocop.md](tool-rubocop.md) | 📄 primary | Detect misconfigured or under-utilized RuboCop setups -- unjustified rubocop:disable comments, outdated configs with new cops not enabled, missing performance and Rails extensions, and custom cops without specs |
| [tool-ruff-pylint.md](tool-ruff-pylint.md) | 📄 primary | Detect misconfigured or under-utilized Ruff and Pylint setups -- overly broad per-file-ignores, unjustified noqa annotations, conflicting formatter configs, and missing rule categories |
| [tool-sonarqube-semgrep-codeql.md](tool-sonarqube-semgrep-codeql.md) | 📄 primary | Detect misconfigured or under-utilized SAST tools -- SonarQube quality gates bypassed, Semgrep rules not in CI, CodeQL queries missing for critical paths, untriaged false positives, and custom rules without tests |
| [tool-tsc-flow.md](tool-tsc-flow.md) | 📄 primary | Detect misconfigured or under-utilized TypeScript/Flow type checking -- unjustified ts-ignore/ts-expect-error, strict mode disabled, any casts without justification, skipLibCheck hiding errors, and missing test tsconfig |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
