---
id: build-vendored-toolchain
type: primary
depth_role: leaf
focus: Detect vendored dependency and toolchain issues including stale vendored code, unpinned toolchain versions, missing checksums for vendored binaries, and unattributed vendored source
parents:
  - index.md
covers:
  - Vendored dependencies not updated alongside upstream releases
  - Toolchain version not pinned in CI or build configuration
  - Missing checksums for vendored binaries
  - Vendored source code not attributed to upstream project
  - Vendored code with known CVEs not patched
  - Toolchain downloaded without integrity verification
  - Vendored binaries for wrong platform committed
  - Vendor directory not tracked for update freshness
  - Local patches to vendored code not documented
tags:
  - vendor
  - vendored
  - toolchain
  - pinning
  - checksum
  - attribution
  - third-party
  - binary
  - dependencies
activation:
  file_globs:
    - "vendor/**"
    - "third_party/**"
    - "3rdparty/**"
    - "extern/**"
    - "lib/vendor/**"
    - .tool-versions
    - mise.toml
    - .mise.toml
    - rust-toolchain.toml
    - .go-version
    - .node-version
    - .ruby-version
    - .python-version
  keyword_matches:
    - vendor
    - third_party
    - toolchain
    - protoc
    - terraform
    - kubectl
    - checksum
    - sha256
    - tool-versions
  structural_signals:
    - vendor_directory_change
    - toolchain_config_change
    - third_party_code_change
source:
  origin: file
  path: build-vendored-toolchain.md
  hash: "sha256:2e10a3a19c94267bdd6db41ee7d85280096e7dafdd064347dee75ee555647280"
---
# Vendored Dependencies and Toolchain Pinning

## When This Activates

Activates when diffs touch vendor/, third_party/, extern/ directories, toolchain version files (.tool-versions, mise.toml, rust-toolchain.toml, .go-version, .node-version, .ruby-version, .python-version), or when vendored code is added or modified. This reviewer detects two related classes of issues: vendored dependencies that are stale, unattributed, or carry known vulnerabilities; and toolchain versions that are unpinned or downloaded without integrity verification. Both vectors allow compromised or outdated code to enter the build without going through normal dependency management controls.

## Audit Surface

- [ ] vendor/ or third_party/ directory with files older than 12 months
- [ ] Vendored binary without accompanying checksum file
- [ ] Vendored source without LICENSE or NOTICE attribution
- [ ] Vendored code with local modifications not documented in a patch file
- [ ] Toolchain binary (protoc, terraform, kubectl) without version pin in CI
- [ ] Toolchain downloaded in CI without SHA-256 checksum verification
- [ ] Vendored library with known CVE in advisory databases
- [ ] Multiple versions of same vendored library in tree
- [ ] Vendor manifest (vendor.json, vendor/modules.txt) out of sync
- [ ] Vendored binary compiled for different OS/architecture than deploy target
- [ ] Missing .tool-versions, mise.toml, or asdf configuration
- [ ] Toolchain version specified differently across CI and local config
- [ ] Vendored code copied without preserving upstream version reference

## Detailed Checks

### Vendored Dependency Freshness
<!-- activation: file_globs=["vendor/**", "third_party/**", "3rdparty/**", "extern/**"], keywords=["vendor", "third_party", "update", "upgrade", "version"] -->

- [ ] **Stale vendored code**: flag vendor/ or third_party/ directories where the most recent file modification is older than 12 months -- vendored code that is not regularly updated may contain known vulnerabilities that have been patched upstream
- [ ] **Missing version reference**: flag vendored code directories without a file indicating the upstream version (VERSION, UPSTREAM_VERSION, vendor.json entry, README noting version) -- without a version reference, it is impossible to determine if the vendored code is current
- [ ] **Multiple versions of same library**: flag the same library appearing at different versions in different vendor subdirectories -- version conflicts in vendored code cause unpredictable behavior
- [ ] **Vendor manifest out of sync**: flag vendor/modules.txt (Go), vendor.json, or equivalent manifest files that do not match the actual contents of the vendor directory -- indicates partial updates or manual modifications
- [ ] **Known CVE in vendored code**: flag vendored libraries that match entries in OSV, NVD, or ecosystem-specific advisory databases -- vendored code bypasses normal dependency audit tools; it must be scanned separately

### Vendored Binary Integrity
<!-- activation: keywords=["binary", "bin/", "checksum", "sha256", "sha512", ".exe", ".so", ".dylib", ".dll", "platform", "architecture"] -->

- [ ] **Binary without checksum**: flag vendored binary files (.exe, .so, .dylib, .dll, .wasm) without an accompanying checksum file or documented hash -- binary integrity cannot be verified without a checksum
- [ ] **Wrong platform binary**: flag vendored binaries compiled for a different OS/architecture than the deployment target -- e.g., a Linux x86_64 binary vendored in a project deployed to ARM containers
- [ ] **Binary without provenance**: flag vendored binaries without documentation of where they were obtained (download URL, build instructions, GPG signature) -- unprovenanced binaries could contain malicious code
- [ ] **Large binary committed**: flag binary files larger than 50MB committed to the repository without LFS -- large binaries bloat the repository and slow clones

### Vendored Code Attribution
<!-- activation: keywords=["LICENSE", "NOTICE", "COPYRIGHT", "attribution", "license", "copyright", "author"] -->

- [ ] **Missing LICENSE**: flag vendored source code directories without a LICENSE, COPYING, or NOTICE file -- using code without license attribution violates most open-source licenses and creates legal risk
- [ ] **Missing NOTICE for Apache-licensed code**: flag Apache-2.0-licensed vendored code without a NOTICE file preserved from upstream -- Apache 2.0 requires NOTICE file preservation
- [ ] **Undocumented local patches**: flag vendored code with local modifications (git diff against upstream shows changes) without a corresponding patch file or CHANGES document -- undocumented patches are lost when the vendored code is updated

### Toolchain Version Pinning
<!-- activation: file_globs=[".tool-versions", "mise.toml", ".mise.toml", "rust-toolchain.toml", ".go-version", ".node-version", ".ruby-version", ".python-version"], keywords=["toolchain", "version", "protoc", "terraform", "kubectl", "helm", "install", "download"] -->

- [ ] **Missing toolchain version file**: flag repositories without .tool-versions, mise.toml, or language-specific version files (.node-version, .ruby-version, .python-version, .go-version) -- developers and CI may use different toolchain versions, causing inconsistent builds
- [ ] **Inconsistent toolchain versions**: flag toolchain versions specified differently in CI configuration vs. local version files (e.g., CI uses Node 20 but .node-version says 18) -- version mismatches cause "works on CI but not locally" or vice versa
- [ ] **Toolchain download without checksum**: flag CI scripts that download toolchain binaries (protoc, terraform, kubectl, helm) without verifying a SHA-256 checksum -- a compromised CDN can substitute malicious toolchain binaries
- [ ] **Toolchain installed with latest/channel**: flag `asdf install latest` or tool installation commands that resolve to the latest version instead of a specific pinned version -- the installed version changes over time

### Go and Rust Vendor Specifics
<!-- activation: file_globs=["vendor/modules.txt", "vendor/vendor.json", ".cargo/config.toml"], keywords=["go mod vendor", "cargo vendor", "vendor-dir"] -->

- [ ] **Go vendor without go mod verify**: flag Go projects using vendor/ without `go mod verify` in CI -- vendor directories can be manually modified; verify ensures they match go.sum
- [ ] **Go vendor out of sync with go.mod**: flag vendor/modules.txt entries that do not match go.mod requirements -- run `go mod vendor` after dependency changes
- [ ] **Cargo vendor without config**: flag Cargo vendor directories without `.cargo/config.toml` pointing to the vendor directory -- Cargo will not use vendored crates without the configuration

## Common False Positives

- **Go vendor by policy**: some organizations require vendoring all Go dependencies for air-gapped builds. The vendor directory is expected and maintained; flag only when it is stale or out of sync.
- **Vendored test fixtures**: test data or fixtures in a third_party directory are not upstream dependencies and do not need version tracking or CVE scanning.
- **Toolchain version files for optional tools**: .tool-versions entries for optional development tools (linters, formatters) carry less risk than entries for compilers and runtimes.
- **Single-file vendored utility**: a single vendored utility file (e.g., a hash function) with clear attribution and no CVE may not warrant the full vendoring process.

## Severity Guidance

| Finding | Severity |
|---|---|
| Vendored library with known critical CVE | Critical |
| Vendored binary without checksum or provenance | Critical |
| Toolchain downloaded in CI without checksum verification | Critical |
| Vendored source without LICENSE or attribution | Important |
| Stale vendored code (12+ months without update) | Important |
| Undocumented local patches to vendored code | Important |
| Inconsistent toolchain versions between CI and local | Important |
| Missing toolchain version file in repository | Minor |
| Vendor manifest out of sync | Minor |
| Large binary committed without LFS | Minor |
| Multiple versions of same vendored library | Minor |

## See Also

- `build-lockfile-hygiene` -- lockfile management for non-vendored dependencies
- `build-go-modules` -- Go-specific vendor/ directory and go.sum checks
- `build-cargo` -- Cargo-specific vendor and .cargo/config.toml checks
- `build-bazel-buck-pants` -- hermetic build systems with external dependency pinning
- `sec-owasp-a06-vulnerable-components` -- CVE detection in vendored and non-vendored dependencies
- `sec-supply-chain-sbom-slsa-sigstore` -- provenance and integrity for all dependency sources
- `build-reproducibility-slsa-sigstore` -- toolchain pinning as a prerequisite for reproducible builds

## Authoritative References

- [Go Documentation: Vendoring](https://go.dev/ref/mod#vendoring)
- [Cargo Documentation: cargo vendor](https://doc.rust-lang.org/cargo/commands/cargo-vendor.html)
- [mise Documentation](https://mise.jdx.dev/)
- [asdf Documentation](https://asdf-vm.com/)
- [OpenSSF Scorecard: Pinned-Dependencies](https://securityscorecards.dev/)
- [REUSE Software: License Compliance](https://reuse.software/)
