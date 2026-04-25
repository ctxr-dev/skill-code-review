---
id: build-cargo
type: primary
depth_role: leaf
focus: Detect Cargo misconfigurations including missing Cargo.lock in binary crates, wildcard dependencies, unsafe build scripts, missing edition declaration, and undocumented features
parents:
  - index.md
covers:
  - Missing Cargo.lock in binary crate repositories
  - Wildcard dependency versions in Cargo.toml
  - build.rs with network access or arbitrary filesystem writes
  - Missing edition field defaulting to Rust 2015
  - Feature flags not documented or tested
  - "Missing MSRV (minimum supported Rust version) declaration"
  - Unsafe code in dependencies not audited
  - Yanked crate versions in Cargo.lock
  - Path dependencies in published crates
  - Missing license or license-file field
tags:
  - cargo
  - rust
  - crate
  - lockfile
  - build-rs
  - edition
  - msrv
  - features
  - unsafe
  - dependencies
activation:
  file_globs:
    - Cargo.toml
    - Cargo.lock
    - build.rs
    - ".cargo/config.toml"
    - rust-toolchain.toml
    - deny.toml
  keyword_matches:
    - dependencies
    - edition
    - rust-version
    - features
    - build
    - unsafe
    - cargo
    - crate
  structural_signals:
    - dependency_manifest_change
    - lock_file_change
    - build_script_change
source:
  origin: file
  path: build-cargo.md
  hash: "sha256:faa9c3f8a5ba4027ae9294eb7c58736ac7d6d3b25eb834cff537bc9b28d8bd29"
---
# Cargo (Rust Package Manager)

## When This Activates

Activates when diffs touch Cargo.toml, Cargo.lock, build.rs, .cargo/config.toml, rust-toolchain.toml, or deny.toml. This reviewer detects Rust-specific packaging risks: missing Cargo.lock in binary crates leading to non-deterministic builds, wildcard dependency versions, build scripts (build.rs) that access the network or filesystem unsafely, missing edition declarations that default to legacy Rust 2015, undocumented feature flags, and the absence of minimum supported Rust version (MSRV) declarations.

## Audit Surface

- [ ] Cargo.lock missing from binary crate repository
- [ ] Cargo.toml dependency using * or >= without upper bound
- [ ] build.rs present with network access (reqwest, ureq, hyper, curl)
- [ ] build.rs writing outside of OUT_DIR
- [ ] Missing edition field in Cargo.toml
- [ ] Missing rust-version (MSRV) field in Cargo.toml
- [ ] Feature flag defined but not documented in README or Cargo.toml metadata
- [ ] Crate with unsafe code and no #![deny(unsafe_code)] or safety justification
- [ ] Path dependency (path = ...) in a crate intended for crates.io publication
- [ ] Cargo.lock containing yanked crate version
- [ ] Missing cargo-audit or cargo-deny in CI pipeline
- [ ] Workspace member without explicit edition
- [ ] Git dependency without rev or tag pin
- [ ] Patch section overriding crate with local or git source

## Detailed Checks

### Lockfile and Version Pinning
<!-- activation: file_globs=["Cargo.toml", "Cargo.lock", ".gitignore"], keywords=["dependencies", "version", "*", ">=", "lock", "pin"] -->

- [ ] **Missing Cargo.lock for binary crate**: flag binary crate repositories (those with `[[bin]]` or no `[lib]` section) without a committed Cargo.lock -- Cargo resolves dependencies fresh on each build without a lockfile, causing non-deterministic builds
- [ ] **Cargo.lock in .gitignore for binary**: flag .gitignore excluding Cargo.lock when the project produces a binary -- libraries may omit Cargo.lock but applications and binaries must commit it
- [ ] **Wildcard dependency**: flag `dependency = "*"` in Cargo.toml -- accepts any version, including those with known advisories
- [ ] **Open-ended version range**: flag `>=1.0` without upper bound -- allows major version jumps that may introduce breaking API changes
- [ ] **Yanked crate in Cargo.lock**: flag Cargo.lock entries for crate versions that have been yanked on crates.io -- yanked versions typically have critical bugs or security issues

### Build Script Safety
<!-- activation: file_globs=["build.rs", "Cargo.toml"], keywords=["build", "build.rs", "cc", "pkg-config", "bindgen", "OUT_DIR", "cargo:rerun-if"] -->

- [ ] **Network access in build.rs**: flag build.rs files that import HTTP clients (reqwest, ureq, hyper, curl) or use std::net -- build scripts with network access are non-reproducible and can exfiltrate data or download malicious code
- [ ] **Filesystem writes outside OUT_DIR**: flag build.rs writing to paths other than `std::env::var("OUT_DIR")` -- build scripts should only write to the designated output directory
- [ ] **Missing cargo:rerun-if directives**: flag build.rs files without `println!("cargo:rerun-if-changed=...")` or `cargo:rerun-if-env-changed` -- Cargo reruns the build script on every build, wasting compilation time
- [ ] **Arbitrary command execution**: flag build.rs using `std::process::Command` for operations beyond standard build tooling (cc, pkg-config, bindgen) -- build scripts that shell out to arbitrary commands are difficult to audit

### Edition and MSRV
<!-- activation: keywords=["edition", "rust-version", "msrv", "rust-toolchain", "2015", "2018", "2021", "2024"] -->

- [ ] **Missing edition**: flag Cargo.toml without an `edition` field -- defaults to Rust 2015, missing modern language features and idioms
- [ ] **Workspace member without edition**: flag workspace members that rely on workspace-level edition inheritance without verifying it is set -- each crate should have a clear edition
- [ ] **Missing MSRV**: flag Cargo.toml without `rust-version` -- consumers cannot determine the minimum Rust version required, leading to confusing build failures
- [ ] **Toolchain file out of date**: flag rust-toolchain.toml pinning a Rust version more than two releases behind stable -- may miss important compiler fixes and optimizations

### Features and Unsafe Code
<!-- activation: keywords=["features", "default", "unsafe", "allow(unsafe_code)", "deny(unsafe_code)", "forbid(unsafe_code)"] -->

- [ ] **Undocumented features**: flag `[features]` entries in Cargo.toml without corresponding documentation in README, doc comments, or Cargo.toml `[package.metadata.docs.rs]` -- consumers cannot discover available feature flags
- [ ] **Default features not reviewed**: flag changes to the `default` feature list -- adding a feature to defaults can increase binary size and attack surface for all consumers
- [ ] **Unsafe code without justification**: flag crates using `unsafe` blocks without `#![deny(unsafe_code)]` at the crate root or without SAFETY comments on each unsafe block -- undocumented unsafe code is a maintenance and security risk
- [ ] **Missing cargo-deny or cargo-vet in CI**: flag CI pipelines building Rust without `cargo deny check` or `cargo vet` -- these tools catch known advisories, license violations, and unaudited dependencies

### Publication and Source Hygiene
<!-- activation: keywords=["publish", "path =", "git =", "patch", "replace", "crates.io", "license"] -->

- [ ] **Path dependency in published crate**: flag `path = "../local-crate"` in a crate with `publish = true` or no `publish = false` -- path dependencies are not resolved on crates.io and cause build failures for consumers
- [ ] **Git dependency without rev**: flag `git = "https://..."` without `rev = "SHA"` or `tag = "v1.0.0"` -- branch references are mutable and produce non-reproducible builds
- [ ] **Patch overriding with local source**: flag `[patch.crates-io]` entries pointing to local paths or git sources -- patches should be temporary and documented with an issue tracking their removal

## Common False Positives

- **Library crates omitting Cargo.lock**: Rust convention is that library crates do not commit Cargo.lock, allowing consumers to resolve compatible versions. Flag only for binary crates and applications.
- **build.rs using cc crate**: the `cc` crate is the standard way to compile C/C++ code in build scripts. Its use of `Command` is expected and safe.
- **Workspace-inherited edition**: workspace members using `edition.workspace = true` correctly inherit the workspace edition. Verify the workspace root defines it.
- **Intentional unsafe for FFI**: crates wrapping C libraries necessarily use unsafe code. Verify SAFETY comments exist rather than flagging the use of unsafe itself.

## Severity Guidance

| Finding | Severity |
|---|---|
| build.rs with network access or filesystem writes outside OUT_DIR | Critical |
| Wildcard (*) dependency in Cargo.toml | Critical |
| Missing Cargo.lock for binary crate | Important |
| Path dependency in crate intended for publication | Important |
| Git dependency without rev or tag pin | Important |
| Missing cargo-audit or cargo-deny in CI | Important |
| Missing edition field in Cargo.toml | Minor |
| Missing MSRV (rust-version) declaration | Minor |
| Undocumented feature flags | Minor |
| Yanked crate version in Cargo.lock | Important |

## See Also

- `build-lockfile-hygiene` -- lockfile-specific checks applicable across all package managers
- `sec-owasp-a06-vulnerable-components` -- known CVEs in Rust crate dependencies
- `sec-supply-chain-sbom-slsa-sigstore` -- provenance and signing for published crates
- `build-reproducibility-slsa-sigstore` -- reproducible build requirements for Rust binaries

## Authoritative References

- [Cargo Book: Cargo.lock](https://doc.rust-lang.org/cargo/guide/cargo-toml-vs-cargo-lock.html)
- [Cargo Book: Build Scripts](https://doc.rust-lang.org/cargo/reference/build-scripts.html)
- [Cargo Book: Features](https://doc.rust-lang.org/cargo/reference/features.html)
- [RustSec Advisory Database](https://rustsec.org/)
- [cargo-deny Documentation](https://embarkstudios.github.io/cargo-deny/)
- [cargo-vet Documentation](https://mozilla.github.io/cargo-vet/)
