---
id: tool-clippy
type: primary
depth_role: leaf
focus: Detect misconfigured or under-utilized Clippy setups -- unjustified allow attributes, missing CI integration, unreviewed pedantic lints, and incomplete target coverage
parents:
  - index.md
covers:
  - "#[allow(clippy::*)] without a justification comment"
  - "#[allow(clippy::*)] at module or crate level suppressing too broadly"
  - Clippy not running in CI pipeline
  - "clippy::pedantic not reviewed for adoption"
  - Nursery or restriction lints ignored without evaluation
  - "Missing cargo clippy --all-targets (tests, benches, examples not checked)"
  - "Conflicting clippy.toml and Cargo.toml [lints.clippy] settings"
  - "#[allow(unused)] hiding real dead code"
  - "Missing clippy::unwrap_used in production code"
  - "deny(warnings) in library code preventing downstream compilation"
tags:
  - clippy
  - rust
  - linter
  - allow
  - cargo
  - code-quality
  - unsafe
activation:
  file_globs:
    - "**/clippy.toml"
    - "**/.clippy.toml"
    - "**/Cargo.toml"
    - "**/*.rs"
  keyword_matches:
    - "allow(clippy"
    - "warn(clippy"
    - "deny(clippy"
    - "clippy::"
    - cargo clippy
    - "#![allow("
    - "#![deny("
  structural_signals:
    - clippy config file present
    - inline clippy allow attribute
    - Rust source files present
source:
  origin: file
  path: tool-clippy.md
  hash: "sha256:379acacd24f1a140d5df9e8f55091564f5407b838409c9dd242e6d6c9c9ed20f"
---
# Clippy Configuration and Suppression Hygiene

## When This Activates

Activates when the repository contains Rust source files, Clippy configuration (clippy.toml, Cargo.toml with [lints.clippy]), or when #[allow(clippy::*)] attributes appear in the diff. Focuses on whether Clippy is configured to catch bugs effectively and whether suppressions are justified -- not on individual lint violations.

## Audit Surface

- [ ] #[allow(clippy::*)] without an adjacent justification comment
- [ ] #[allow(clippy::*)] at crate or module level -- verify the scope is necessary
- [ ] Clippy not present in CI configuration
- [ ] CI runs clippy without --all-targets -- tests and examples are not checked
- [ ] clippy.toml or Cargo.toml [lints.clippy] relaxes default warnings
- [ ] clippy::unwrap_used not denied or warned in production code
- [ ] clippy::pedantic lints not evaluated for the project
- [ ] #[allow(dead_code)] or #[allow(unused)] on non-FFI, non-trait items
- [ ] #[deny(warnings)] in a library crate -- this breaks downstream builds
- [ ] New #[allow(...)] attributes added in this PR exceed 3 without discussion
- [ ] Clippy lint group (clippy::all) allowed instead of specific lints
- [ ] Missing #![warn(clippy::cargo)] for published crates
- [ ] unsafe block with #[allow(clippy::*)] -- extra scrutiny needed

## Detailed Checks

### Allow Attribute Discipline
<!-- activation: keywords=["allow(clippy", "allow(unused", "allow(dead_code"] -->

- [ ] Flag `#[allow(clippy::*)]` without a comment on the preceding or same line explaining why the lint does not apply -- bare allows accumulate and rot
- [ ] Flag `#![allow(clippy::*)]` at crate level (in lib.rs or main.rs) -- crate-level suppression affects all code and should be rare and well-documented
- [ ] Flag `#[allow(clippy::all)]` or `#[allow(warnings)]` -- group-level suppression disables too many checks
- [ ] Flag `#[allow(dead_code)]` or `#[allow(unused)]` on items that are not FFI bindings, trait implementations, or conditionally compiled -- these often hide real dead code
- [ ] Count new #[allow(...)] attributes in the PR -- more than 3 suggests the code needs restructuring rather than annotation
- [ ] Flag #[allow(clippy::*)] adjacent to unsafe blocks -- suppressed lints near unsafe code deserve heightened scrutiny

### CI Integration and Target Coverage
<!-- activation: file_globs=["**/.github/workflows/*", "**/.gitlab-ci.yml", "**/Makefile", "**/Justfile"] -->

- [ ] Verify cargo clippy runs in CI -- absence means lint violations reach main without detection
- [ ] Verify CI runs clippy with `--all-targets` -- without it, test code, benchmarks, and examples are not linted
- [ ] Verify CI uses `-D warnings` or `-- -D warnings` to fail on warnings -- Clippy defaults to warning, not error
- [ ] Check that CI clippy runs on the same Rust toolchain version as development -- nightly vs stable Clippy produces different lints
- [ ] If the project uses a rust-toolchain.toml, verify CI respects it rather than using a different Rust version

### Pedantic and Restriction Lint Adoption
<!-- activation: file_globs=["**/clippy.toml", "**/Cargo.toml", "**/*.rs"] -->

- [ ] Check whether the project has evaluated clippy::pedantic -- not all pedantic lints are appropriate, but blanket ignoring the group misses valuable checks like `clippy::needless_pass_by_value` and `clippy::doc_markdown`
- [ ] For production code: verify clippy::unwrap_used is at least warned -- unwrap panics are a common source of crashes
- [ ] For published crates: verify clippy::cargo is warned -- it catches Cargo.toml issues like missing descriptions and incorrect categories
- [ ] Check restriction lints for security-sensitive code: `clippy::expect_used`, `clippy::indexing_slicing`, `clippy::panic` should be evaluated
- [ ] Verify that the project has not enabled pedantic at crate level and then added dozens of module-level allows to work around it -- this suggests pedantic was adopted without curation

### Configuration File Consistency
<!-- activation: file_globs=["**/clippy.toml", "**/.clippy.toml", "**/Cargo.toml"] -->

- [ ] If both clippy.toml and Cargo.toml [lints.clippy] exist, verify they do not conflict -- Cargo.toml lints are the newer mechanism
- [ ] Check that clippy.toml thresholds (e.g., cognitive-complexity-threshold, too-many-arguments-threshold) are not set absurdly high to silence findings
- [ ] Verify that #[deny(warnings)] is not used in library crates -- a new Clippy version adding a warning will break all downstream consumers
- [ ] For workspace projects, verify Clippy configuration is consistent across workspace members or uses workspace-level [workspace.lints.clippy]

## Common False Positives

- **FFI bindings**: Generated FFI code (bindgen output, sys crates) legitimately uses #[allow(unused)] and #[allow(non_camel_case_types)] -- these should be in a dedicated module.
- **Trait implementations**: Implementing a trait may require unused parameters (e.g., `&self` in a stateless implementation). `#[allow(unused_variables)]` is acceptable.
- **Conditional compilation**: Items behind `#[cfg(...)]` may appear dead to Clippy when the cfg is not active in the current build.
- **Macro-generated code**: Macros may produce code that triggers Clippy lints. Suppressing at the macro invocation site is acceptable with a comment.
- **Prototyping in examples**: Example files may use .unwrap() and simpler patterns intentionally for readability.

## Severity Guidance

| Finding | Severity |
|---|---|
| Clippy not running in CI | Important |
| #[allow(clippy::all)] or #[allow(warnings)] at crate level | Important |
| #[deny(warnings)] in a published library crate | Important |
| #[allow(clippy::*)] near unsafe block without justification | Important |
| #[allow(clippy::*)] without justification comment | Minor |
| CI missing --all-targets flag | Minor |
| clippy::unwrap_used not warned in production code | Minor |
| Pedantic lints not evaluated for the project | Minor |
| clippy.toml thresholds set very high | Minor |

## See Also

- `style-guide-supremacy` -- Clippy is the Rust style authority; this reviewer checks its configuration health
- `author-self-review-hygiene` -- bare #[allow(...)] without justification is a hygiene issue
- `principle-fail-fast` -- allowing clippy lints defers error detection; unwrap_used is the canonical fail-fast example
- `tool-prettier-black-gofmt-rustfmt` -- rustfmt handles formatting; Clippy handles correctness and idiomatic usage
- `principle-naming-and-intent` -- Clippy naming lints enforce Rust naming conventions

## Authoritative References

- [Clippy: Configuring Clippy](https://doc.rust-lang.org/clippy/configuration.html)
- [Clippy: Lint Levels](https://doc.rust-lang.org/clippy/lint_configuration.html)
- [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/)
- [Cargo: Lints](https://doc.rust-lang.org/cargo/reference/manifest.html#the-lints-section)
