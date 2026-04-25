---
id: tool-golangci-lint
type: primary
depth_role: leaf
focus: Detect misconfigured or under-utilized golangci-lint setups -- unjustified nolint directives, disabled linters that should be enabled, overly permissive configs, and missing critical analyzers
parents:
  - index.md
covers:
  - nolint directives without a linter name
  - nolint directives without a justification comment
  - "Disabled linters that should be enabled (staticcheck, govet, errcheck, gosec)"
  - .golangci.yml exclusion patterns that are too broad
  - Missing go vet in the enabled linters list
  - Missing staticcheck or its SA-class checks
  - Missing errcheck -- unchecked errors are a top Go bug class
  - Missing gosec for security-sensitive projects
  - Exclusion rules that match too many files or functions
  - nolint applied to an entire file instead of specific lines
  - Severity or max-issues-per-linter set to suppress real findings
  - "Deprecated linter still enabled (interfacer, maligned, scopelint)"
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
activation:
  file_globs:
    - "**/.golangci.yml"
    - "**/.golangci.yaml"
    - "**/.golangci.toml"
    - "**/.golangci.json"
    - "**/go.mod"
  keyword_matches:
    - nolint
    - golangci
    - staticcheck
    - errcheck
    - govet
    - gosec
  structural_signals:
    - golangci-lint config file present
    - inline nolint directive
source:
  origin: file
  path: tool-golangci-lint.md
  hash: "sha256:046e38db693b51519cc77a430ba57faccf300a3966fde69f95639a1b9320fe36"
---
# golangci-lint Configuration and Suppression Hygiene

## When This Activates

Activates when the repository contains a golangci-lint configuration file (.golangci.yml/yaml/toml/json), when nolint directives appear in the diff, or when go.mod is present. Focuses on whether the linter aggregator is configured to catch the bugs that matter most in Go code and whether suppressions are justified.

## Audit Surface

- [ ] nolint directive without a linter name (blanket suppression)
- [ ] nolint directive without a justification comment after //
- [ ] nolint applied to an entire file via build tag or top-of-file comment
- [ ] errcheck not in the enabled linters list
- [ ] staticcheck not in the enabled linters list
- [ ] govet (go vet) not in the enabled linters list
- [ ] gosec not enabled in a project handling user input or network I/O
- [ ] Exclusion rule matches a broad pattern
- [ ] max-issues-per-linter or max-same-issues set to suppress real findings
- [ ] Deprecated linter still in the enabled list
- [ ] issues.exclude-rules uses text matching that is too generic
- [ ] linters-settings overrides defaults to be more permissive without justification
- [ ] run.skip-dirs or run.skip-files excludes production code
- [ ] New nolint directives added in this PR exceed 3 without discussion

## Detailed Checks

### Nolint Directive Discipline
<!-- activation: keywords=["nolint"] -->

- [ ] Flag `//nolint` or `// nolint` without a linter name -- this suppresses all linters on the line and is almost never appropriate
- [ ] Flag `//nolint:errcheck` or any nolint with a linter name but no justification after `//` -- the format should be `//nolint:errcheck // closing file in defer, error is non-fatal`
- [ ] Flag nolint directives at the package level or applied to an entire file -- these should be extremely rare and require architectural justification
- [ ] Count new nolint directives in the PR -- more than 3 suggests the code should be restructured or the linter config adjusted
- [ ] Flag nolint on error-return lines where the error should be checked -- `//nolint:errcheck` on `resp.Body.Close()` in a defer is justified, but on a network call it is not

### Essential Linters and Missing Coverage
<!-- activation: file_globs=["**/.golangci.yml", "**/.golangci.yaml", "**/.golangci.toml"] -->

- [ ] Verify errcheck is enabled -- unchecked errors are the most common source of silent failures in Go
- [ ] Verify staticcheck (or the SA class) is enabled -- it catches real bugs that go vet misses (SA1019 deprecated API, SA4006 unused values, SA5000 nil dereference patterns)
- [ ] Verify govet is enabled -- it is the baseline Go correctness checker
- [ ] For projects that handle user input, HTTP, or crypto: verify gosec is enabled
- [ ] Check for deprecated linters still listed: interfacer, maligned, scopelint, golint (replaced by revive), deadcode, structcheck, varcheck -- these should be removed
- [ ] If the project uses Go 1.22+, verify that loop variable capture linters are updated (the old exportloopref is no longer needed)

### Exclusion and Severity Configuration
<!-- activation: file_globs=["**/.golangci.yml", "**/.golangci.yaml"] -->

- [ ] Flag issues.exclude patterns that match common strings like "error" or "return" -- these suppress too many findings
- [ ] Flag issues.exclude-rules with a text match broader than the specific false positive it targets
- [ ] Flag max-issues-per-linter set below 10 -- low limits hide real findings by silently dropping them
- [ ] Flag max-same-issues set below 5 -- repeated violations of the same rule often indicate a systemic issue
- [ ] Flag run.skip-dirs that exclude non-vendor, non-generated production code directories
- [ ] Verify severity configuration does not downgrade critical findings to warnings that CI ignores

### Linter Settings and Tuning
<!-- activation: file_globs=["**/.golangci.yml", "**/.golangci.yaml"] -->

- [ ] Check that errcheck.check-blank is not disabled -- assigning to `_` to silence errcheck defeats the purpose
- [ ] Check that govet shadow analysis is considered (govet.enable=shadow) -- shadowed variables are a common Go bug
- [ ] Verify revive rules (if enabled) do not conflict with staticcheck -- overlapping rules cause duplicate findings
- [ ] Check that cyclop/gocyclo/gocognit thresholds are not set absurdly high (e.g., cyclomatic > 30) -- this effectively disables them

## Common False Positives

- **Deferred close calls**: `//nolint:errcheck` on `defer resp.Body.Close()` or `defer file.Close()` is standard Go practice -- the error from closing in a defer is almost always non-actionable.
- **Test helper functions**: Test files may legitimately suppress certain linters (e.g., errcheck in test setup code, funlen for table-driven tests).
- **Generated code**: Code generated by protoc, go-swagger, or ent should be excluded via run.skip-dirs or build tags, not per-line nolint.
- **Interface compliance checks**: `var _ Interface = (*Type)(nil)` lines may trigger unused-variable linters -- this is an idiomatic Go pattern.
- **CGo files**: Files using CGo have unique constraints that may require nolint for rules that assume pure Go.

## Severity Guidance

| Finding | Severity |
|---|---|
| Blanket nolint without linter name | Important |
| errcheck disabled or missing from enabled linters | Important |
| Exclusion rules suppress findings in production code broadly | Important |
| max-issues-per-linter set low enough to hide real findings | Important |
| nolint with linter name but no justification comment | Minor |
| staticcheck not enabled | Minor |
| gosec not enabled in security-sensitive project | Minor |
| Deprecated linter still in config | Minor |
| govet shadow analysis not enabled | Minor |

## See Also

- `style-guide-supremacy` -- golangci-lint is the style authority for Go; this reviewer checks its configuration health
- `author-self-review-hygiene` -- bare nolint without justification is a hygiene issue
- `principle-fail-fast` -- suppressing errcheck defers failure detection; the error should be handled at the call site
- `tool-prettier-black-gofmt-rustfmt` -- gofmt handles formatting; golangci-lint handles correctness and style rules beyond formatting
- `principle-naming-and-intent` -- revive's naming rules enforce Go naming conventions

## Authoritative References

- [golangci-lint: Configuration](https://golangci-lint.run/usage/configuration/)
- [golangci-lint: Linters](https://golangci-lint.run/usage/linters/)
- [Go: Effective Go](https://go.dev/doc/effective_go)
- [staticcheck: Checks](https://staticcheck.dev/docs/checks/)
